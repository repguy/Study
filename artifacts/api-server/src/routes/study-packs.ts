import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { studyPacksTable, flashcardsTable, quizQuestionsTable, quizResultsTable, usersTable } from "@workspace/db";
import { CreateStudyPackBody, GetStudyPackParams, DeleteStudyPackParams, GenerateStudyPackContentParams } from "@workspace/api-zod";
import { eq, desc, and } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { getOrCreateUser } from "./user";
import { randomUUID } from "crypto";

const router = Router();

const FREE_MODEL = "gemini-2.0-flash";
const PRO_MODEL = "gemini-2.5-flash";

const CREDIT_COST = { summary: 1, flashcards: 5, quiz: 3, total: 9 };

const GENERATION_PROMPT = (title: string, content: string) => `You are an expert study assistant. Analyze the following content and generate structured study material.

Content Title: ${title}
Content: ${content.slice(0, 8000)}

Return a JSON object with this exact structure:
{
  "summary": "A concise 3-5 sentence summary of the main ideas",
  "keyConcepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
  "examPredictions": ["likely exam question 1", "likely exam question 2", "likely exam question 3", "likely exam question 4", "likely exam question 5"],
  "flashcards": [
    {"front": "Question or concept?", "back": "Answer or explanation"}
  ],
  "quizQuestions": [
    {
      "question": "Multiple choice question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct"
    }
  ]
}

Generate at least 10 flashcards and 5 quiz questions. Make them educational and test key concepts.
Return ONLY valid JSON, no markdown or code blocks.`;

function resolveModel(user: { isPro: boolean; aiModel: string; customAiModel: string | null }) {
  const pref = user.aiModel ?? "auto";
  if (pref === "openrouter" && user.customAiModel) return { type: "openrouter" as const, model: user.customAiModel };
  if (pref === "custom" && user.customAiModel) return { type: "openrouter" as const, model: user.customAiModel };
  // auto or gemini: pro users get 2.5-flash, free users get 2.0-flash
  return user.isPro
    ? { type: "gemini" as const, model: PRO_MODEL }
    : { type: "gemini" as const, model: FREE_MODEL };
}

function extractJson(text: string): unknown {
  // Strip markdown code fences
  let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  // Try direct parse first
  try { return JSON.parse(cleaned); } catch { /* try harder */ }
  // Find the first { ... } block
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fall through */ }
  }
  throw new Error(`Could not parse JSON from model response. Raw: ${cleaned.slice(0, 300)}`);
}

async function callGemini(title: string, content: string, model = PRO_MODEL): Promise<{ result: unknown; modelUsed: string }> {
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: GENERATION_PROMPT(title, content) }] }],
    config: { maxOutputTokens: 8192 },
  });
  const text = response.text ?? "";
  return { result: extractJson(text), modelUsed: model };
}

async function callOpenRouter(title: string, content: string, model: string): Promise<{ result: unknown; modelUsed: string }> {
  const completion = await openrouter.chat.completions.create({
    model,
    max_tokens: 8192,
    messages: [{ role: "user", content: GENERATION_PROMPT(title, content) }],
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return { result: extractJson(text), modelUsed: model };
}

async function generateWithModel(content: string, title: string, user: { isPro: boolean; aiModel: string; customAiModel: string | null }): Promise<{ result: unknown; modelUsed: string }> {
  const resolved = resolveModel(user);

  try {
    if (resolved.type === "gemini") {
      return await callGemini(title, content, resolved.model);
    } else {
      return await callOpenRouter(title, content, resolved.model);
    }
  } catch (primaryErr) {
    console.error(`[study-packs] primary model (${resolved.model}) failed:`, primaryErr);
    // Fallback: if primary model failed, try the other Gemini model
    const fallbackModel = resolved.model === PRO_MODEL ? FREE_MODEL : PRO_MODEL;
    console.info(`[study-packs] falling back to ${fallbackModel}...`);
    return await callGemini(title, content, fallbackModel);
  }
}

async function fetchUrlContent(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Cluvi/1.0)" } });
  const html = await response.text();
  // strip HTML tags for plain text extraction
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

function packWithCounts(pack: typeof studyPacksTable.$inferSelect, flashcardCount: number, quizCount: number) {
  return {
    ...pack,
    flashcardCount,
    quizCount,
    examPredictionCount: pack.examPredictions ? JSON.parse(pack.examPredictions).length : 0,
  };
}

router.get("/study-packs/dashboard", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  const packs = await db
    .select()
    .from(studyPacksTable)
    .where(eq(studyPacksTable.userId, user.id))
    .orderBy(desc(studyPacksTable.updatedAt))
    .limit(5);

  const allResults = await db
    .select()
    .from(quizResultsTable)
    .where(eq(quizResultsTable.userId, user.id));

  const avgScore = allResults.length > 0
    ? allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length
    : 0;

  const studyStrength = Math.min(100, Math.floor((user.totalFlashcardsStudied / 10) + (user.totalQuizzesTaken * 5)));
  const examReadiness = Math.min(100, Math.floor(studyStrength * 0.8 + (user.streak * 2)));

  const formattedPacks = packs.map((p) => packWithCounts(p, 0, 0));

  res.json({
    totalPacks: packs.length,
    recentPacks: formattedPacks,
    xp: user.xp,
    level: user.level,
    streak: user.streak,
    studyStrength,
    examReadiness,
    averageQuizScore: avgScore,
    weakTopics: [],
    totalFlashcardsStudied: user.totalFlashcardsStudied,
    totalQuizzesTaken: user.totalQuizzesTaken,
  });
});

router.get("/study-packs", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  const packs = await db
    .select()
    .from(studyPacksTable)
    .where(eq(studyPacksTable.userId, user.id))
    .orderBy(desc(studyPacksTable.createdAt));

  const packsWithCounts = await Promise.all(
    packs.map(async (pack) => {
      const [cards, questions] = await Promise.all([
        db.select().from(flashcardsTable).where(eq(flashcardsTable.studyPackId, pack.id)),
        db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.studyPackId, pack.id)),
      ]);
      return packWithCounts(pack, cards.length, questions.length);
    })
  );
  res.json(packsWithCounts);
});

router.post("/study-packs", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = CreateStudyPackBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = await getOrCreateUser(clerkId);

  if (user.credits < CREDIT_COST.total) {
    res.status(402).json({ error: `Not enough credits. Need ${CREDIT_COST.total}, have ${user.credits}.` });
    return;
  }

  // Deduct credits upfront
  await db
    .update(usersTable)
    .set({ credits: user.credits - CREDIT_COST.total, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  let content = parsed.data.content;
  if (parsed.data.sourceType === "url") {
    try {
      content = await fetchUrlContent(parsed.data.content);
    } catch {
      content = parsed.data.content; // fallback to raw if fetch fails
    }
  }

  const [pack] = await db
    .insert(studyPacksTable)
    .values({
      userId: user.id,
      title: parsed.data.title,
      sourceType: parsed.data.sourceType,
      sourceContent: content,
      status: "processing",
      isPro: user.isPro,
    })
    .returning();

  res.status(201).json(packWithCounts(pack, 0, 0));

  try {
    const { result: generated, modelUsed } = await generateWithModel(content, parsed.data.title, user) as {
      result: {
        flashcards?: { front: string; back: string }[];
        quizQuestions?: { question: string; options: string[]; correctAnswer: number; explanation?: string }[];
        summary?: string;
        keyConcepts?: string[];
        examPredictions?: string[];
      };
      modelUsed: string;
    };

    const flashcardData = (generated.flashcards ?? []).slice(0, user.isPro ? 100 : 20);
    const quizData = (generated.quizQuestions ?? []).slice(0, user.isPro ? 100 : 10);

    if (flashcardData.length > 0) {
      await db.insert(flashcardsTable).values(
        flashcardData.map((f) => ({ studyPackId: pack.id, front: f.front, back: f.back }))
      );
    }
    if (quizData.length > 0) {
      await db.insert(quizQuestionsTable).values(
        quizData.map((q) => ({
          studyPackId: pack.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? null,
        }))
      );
    }
    await db
      .update(studyPacksTable)
      .set({
        status: "ready",
        summary: generated.summary ?? null,
        keyConcepts: JSON.stringify(generated.keyConcepts ?? []),
        examPredictions: JSON.stringify(generated.examPredictions ?? []),
        aiModelUsed: modelUsed,
        updatedAt: new Date(),
      })
      .where(eq(studyPacksTable.id, pack.id));
  } catch (err) {
    console.error("[study-packs] generation failed for pack", pack.id, err);
    await db
      .update(studyPacksTable)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(studyPacksTable.id, pack.id));
    // refund credits on error (re-fetch current value to avoid stale state)
    const freshUser = await db.query.usersTable.findFirst({ where: eq(usersTable.id, user.id) });
    await db
      .update(usersTable)
      .set({ credits: (freshUser?.credits ?? 0) + CREDIT_COST.total, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));
  }
});

router.get("/study-packs/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = GetStudyPackParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const user = await getOrCreateUser(clerkId);
  const pack = await db.query.studyPacksTable.findFirst({
    where: and(eq(studyPacksTable.id, params.data.id), eq(studyPacksTable.userId, user.id)),
  });
  if (!pack) { res.status(404).json({ error: "Not found" }); return; }

  const [flashcards, quizQuestions] = await Promise.all([
    db.select().from(flashcardsTable).where(eq(flashcardsTable.studyPackId, pack.id)),
    db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.studyPackId, pack.id)),
  ]);

  res.json({
    ...pack,
    keyConcepts: pack.keyConcepts ? JSON.parse(pack.keyConcepts) : [],
    examPredictions: pack.examPredictions ? JSON.parse(pack.examPredictions) : [],
    flashcardCount: flashcards.length,
    quizCount: quizQuestions.length,
    examPredictionCount: pack.examPredictions ? JSON.parse(pack.examPredictions).length : 0,
    flashcards,
    quizQuestions: quizQuestions.map((q) => ({ ...q, options: JSON.parse(q.options) })),
  });
});

router.delete("/study-packs/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = DeleteStudyPackParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const user = await getOrCreateUser(clerkId);
  const pack = await db.query.studyPacksTable.findFirst({
    where: and(eq(studyPacksTable.id, params.data.id), eq(studyPacksTable.userId, user.id)),
  });
  if (!pack) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(flashcardsTable).where(eq(flashcardsTable.studyPackId, pack.id));
  await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.studyPackId, pack.id));
  await db.delete(studyPacksTable).where(eq(studyPacksTable.id, pack.id));
  res.status(204).send();
});

router.post("/study-packs/:id/generate", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = GenerateStudyPackContentParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const user = await getOrCreateUser(clerkId);
  const pack = await db.query.studyPacksTable.findFirst({
    where: and(eq(studyPacksTable.id, params.data.id), eq(studyPacksTable.userId, user.id)),
  });
  if (!pack) { res.status(404).json({ error: "Not found" }); return; }

  if (user.credits < CREDIT_COST.total) {
    res.status(402).json({ error: `Not enough credits. Need ${CREDIT_COST.total}, have ${user.credits}.` });
    return;
  }
  await db
    .update(usersTable)
    .set({ credits: user.credits - CREDIT_COST.total, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  await db
    .update(studyPacksTable)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(studyPacksTable.id, pack.id));

  try {
    const { result: generated, modelUsed } = await generateWithModel(pack.sourceContent ?? pack.title, pack.title, user) as {
      result: {
        flashcards?: { front: string; back: string }[];
        quizQuestions?: { question: string; options: string[]; correctAnswer: number; explanation?: string }[];
        summary?: string;
        keyConcepts?: string[];
        examPredictions?: string[];
      };
      modelUsed: string;
    };

    await Promise.all([
      db.delete(flashcardsTable).where(eq(flashcardsTable.studyPackId, pack.id)),
      db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.studyPackId, pack.id)),
    ]);

    if (generated.flashcards?.length) {
      await db.insert(flashcardsTable).values(
        generated.flashcards.map((f) => ({ studyPackId: pack.id, front: f.front, back: f.back }))
      );
    }
    if (generated.quizQuestions?.length) {
      await db.insert(quizQuestionsTable).values(
        generated.quizQuestions.map((q) => ({
          studyPackId: pack.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? null,
        }))
      );
    }
    await db
      .update(studyPacksTable)
      .set({
        status: "ready",
        summary: generated.summary ?? null,
        keyConcepts: JSON.stringify(generated.keyConcepts ?? []),
        examPredictions: JSON.stringify(generated.examPredictions ?? []),
        aiModelUsed: modelUsed,
        updatedAt: new Date(),
      })
      .where(eq(studyPacksTable.id, pack.id));
  } catch {
    await db
      .update(studyPacksTable)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(studyPacksTable.id, pack.id));
  }

  const updatedPack = await db.query.studyPacksTable.findFirst({ where: eq(studyPacksTable.id, pack.id) });
  const [flashcards, quizQuestions] = await Promise.all([
    db.select().from(flashcardsTable).where(eq(flashcardsTable.studyPackId, pack.id)),
    db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.studyPackId, pack.id)),
  ]);
  res.json({
    ...updatedPack!,
    keyConcepts: updatedPack!.keyConcepts ? JSON.parse(updatedPack!.keyConcepts) : [],
    examPredictions: updatedPack!.examPredictions ? JSON.parse(updatedPack!.examPredictions) : [],
    flashcardCount: flashcards.length,
    quizCount: quizQuestions.length,
    examPredictionCount: updatedPack!.examPredictions ? JSON.parse(updatedPack!.examPredictions).length : 0,
    flashcards,
    quizQuestions: quizQuestions.map((q) => ({ ...q, options: JSON.parse(q.options) })),
  });
});

// POST /study-packs/:id/share — generate or return existing share token
router.post("/study-packs/:id/share", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  const user = await getOrCreateUser(clerkId);
  const pack = await db.query.studyPacksTable.findFirst({
    where: and(eq(studyPacksTable.id, id), eq(studyPacksTable.userId, user.id)),
  });
  if (!pack) { res.status(404).json({ error: "Not found" }); return; }

  let token = pack.shareToken;
  if (!token) {
    token = randomUUID();
    await db
      .update(studyPacksTable)
      .set({ shareToken: token, updatedAt: new Date() })
      .where(eq(studyPacksTable.id, id));
  }
  res.json({ shareToken: token, shareUrl: `/shared/${token}` });
});

// GET /study-packs/shared/:token — public view (no auth)
router.get("/study-packs/shared/:token", async (req, res) => {
  const pack = await db.query.studyPacksTable.findFirst({
    where: eq(studyPacksTable.shareToken, req.params.token),
  });
  if (!pack) { res.status(404).json({ error: "Not found" }); return; }
  const [flashcards, quizQuestions] = await Promise.all([
    db.select().from(flashcardsTable).where(eq(flashcardsTable.studyPackId, pack.id)),
    db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.studyPackId, pack.id)),
  ]);
  res.json({
    ...pack,
    sourceContent: undefined,
    keyConcepts: pack.keyConcepts ? JSON.parse(pack.keyConcepts) : [],
    examPredictions: pack.examPredictions ? JSON.parse(pack.examPredictions) : [],
    flashcardCount: flashcards.length,
    quizCount: quizQuestions.length,
    examPredictionCount: pack.examPredictions ? JSON.parse(pack.examPredictions).length : 0,
    flashcards,
    quizQuestions: quizQuestions.map((q) => ({ ...q, options: JSON.parse(q.options) })),
  });
});

export default router;
