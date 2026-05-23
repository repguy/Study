import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { studyPacksTable, flashcardsTable, quizQuestionsTable, quizResultsTable, usersTable, creditTransactionsTable } from "@workspace/db";
import { CreateStudyPackBody, GetStudyPackParams, DeleteStudyPackParams, GenerateStudyPackContentParams } from "@workspace/api-zod";
import { eq, desc, and } from "drizzle-orm";
import { ai, createGeminiClient, type GoogleGenAI } from "@workspace/integrations-gemini-ai";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { getOrCreateUser } from "./user";
import { decrypt } from "../lib/encryption"; // still needed for admin site_config key
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { siteConfigTable } from "@workspace/db";
import { sql as sqlTag } from "drizzle-orm";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

interface ResolvedAI {
  type: "gemini" | "openai" | "openrouter";
  model: string;
  geminiClient?: GoogleGenAI;
  openaiClient?: OpenAI;
  isByok: boolean;
}

async function resolveAI(_user: object): Promise<ResolvedAI> {
  // 1. Admin-configured default from site_config
  try {
    const rows = await db.select().from(siteConfigTable).where(
      sqlTag`key IN ('ai_provider', 'ai_model', 'ai_key')`
    );
    const cfg: Record<string, string | null> = {};
    for (const r of rows) cfg[r.key] = r.value;
    if (cfg.ai_provider && cfg.ai_model && cfg.ai_key) {
      const key = decrypt(cfg.ai_key);
      const model = cfg.ai_model;
      if (cfg.ai_provider === "gemini") {
        const client = createGeminiClient(key);
        return { type: "gemini", model, geminiClient: client, isByok: false };
      }
      if (cfg.ai_provider === "openai") {
        const client = new OpenAI({ apiKey: key });
        return { type: "openai", model, openaiClient: client, isByok: false };
      }
      if (cfg.ai_provider === "openrouter") {
        const client = new OpenAI({ apiKey: key, baseURL: "https://openrouter.ai/api/v1" });
        return { type: "openrouter", model, openaiClient: client, isByok: false };
      }
    }
  } catch { /* fall through to platform default */ }
  // 5. Platform default — Gemini
  return { type: "gemini", model: DEFAULT_GEMINI_MODEL, geminiClient: ai, isByok: false };
}

const router = Router();

const CREDIT_COST = { summary: 1, flashcards: 5, quiz: 3, total: 9 };

interface GenerateOptions {
  summary: boolean;
  flashcards: boolean;
  quiz: boolean;
  examPredictions: boolean;
}

const DEFAULT_GENERATE: GenerateOptions = { summary: true, flashcards: true, quiz: true, examPredictions: true };

function calcCreditCost(opts: GenerateOptions): number {
  let cost = 0;
  if (opts.summary) cost += 2;
  if (opts.flashcards) cost += 3;
  if (opts.quiz) cost += 3;
  if (opts.examPredictions && !opts.summary) cost += 1;
  return Math.max(2, cost);
}

function buildSelectivePrompt(title: string, content: string, opts: GenerateOptions): string {
  const fields: string[] = [];
  if (opts.summary) {
    fields.push(`  "summary": "A comprehensive 4-6 sentence summary covering the main ideas, key theories, and core concepts"`);
    fields.push(`  "keyConcepts": ["key concept 1", "key concept 2", "key concept 3"] // 6-10 essential concepts or terms`);
  }
  if (opts.examPredictions) {
    fields.push(`  "examPredictions": ["likely exam question 1", "likely exam question 2"] // 5-8 high-probability exam questions`);
  }
  if (opts.flashcards) {
    fields.push(`  "flashcards": [{"front": "question or term?", "back": "answer or definition"}] // 10-15 cards covering key points`);
  }
  if (opts.quiz) {
    fields.push(`  "quizQuestions": [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..."}] // 5-8 questions`);
  }
  return `You are an expert study assistant. Analyze the following content and generate structured study material.

Content Title: ${title}
${content ? `Content: ${content.slice(0, 8000)}` : ""}

Return a JSON object with ONLY these fields:
{
${fields.join(",\n")}
}

Make the content educational, accurate, and focused on key concepts students need to know.
Return ONLY valid JSON, no markdown or code blocks.`;
}

function buildSelectiveUrlPrompt(title: string, url: string, opts: GenerateOptions): string {
  const fields: string[] = [];
  if (opts.summary) {
    fields.push(`  "summary": "Comprehensive 4-6 sentence summary of the page's main ideas"`);
    fields.push(`  "keyConcepts": ["concept 1", "concept 2"] // 6-10 key concepts`);
  }
  if (opts.examPredictions) {
    fields.push(`  "examPredictions": ["likely question 1"] // 5-8 exam questions`);
  }
  if (opts.flashcards) {
    fields.push(`  "flashcards": [{"front": "...", "back": "..."}] // 10-15 cards`);
  }
  if (opts.quiz) {
    fields.push(`  "quizQuestions": [{"question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "..."}] // 5-8 questions`);
  }
  return `You are an expert study assistant. Fetch and analyze the page at the URL below, then generate structured study material.

URL: ${url}
Content Title: ${title}

Return a JSON object with ONLY these fields:
{
${fields.join(",\n")}
}

Return ONLY valid JSON, no markdown or code blocks.`;
}

function buildSelectiveImagePrompt(title: string, opts: GenerateOptions): string {
  const fields: string[] = [];
  if (opts.summary) {
    fields.push(`  "summary": "Comprehensive 4-6 sentence summary of what the image shows"`);
    fields.push(`  "keyConcepts": ["concept 1", "concept 2"] // 6-10 key concepts from the image`);
  }
  if (opts.examPredictions) {
    fields.push(`  "examPredictions": ["likely question 1"] // 5-8 exam questions`);
  }
  if (opts.flashcards) {
    fields.push(`  "flashcards": [{"front": "...", "back": "..."}] // 10-15 cards`);
  }
  if (opts.quiz) {
    fields.push(`  "quizQuestions": [{"question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "..."}] // 5-8 questions`);
  }
  return `You are an expert study assistant. Analyze this image (diagrams, text, formulas, charts, notes) and generate structured study material.

Content Title: ${title}

Return a JSON object with ONLY these fields:
{
${fields.join(",\n")}
}

Return ONLY valid JSON, no markdown or code blocks.`;
}

const GENERATION_PROMPT = (title: string, contentOrUrl?: string) => `You are an expert study assistant. Analyze the following content and generate structured study material.

Content Title: ${title}
${contentOrUrl ? `Content: ${contentOrUrl.slice(0, 8000)}` : ""}

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

const URL_GENERATION_PROMPT = (title: string, url: string) => `You are an expert study assistant. Visit the following URL and analyze its content to generate structured study material.

URL: ${url}
Content Title: ${title}

Fetch and read the page at the URL above, then return a JSON object with this exact structure:
{
  "summary": "A concise 3-5 sentence summary of the main ideas from the page",
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

const IMAGE_GENERATION_PROMPT = (title: string) => `You are an expert study assistant. Analyze the image provided and generate structured study material based on everything you can see in it (diagrams, text, formulas, notes, charts, etc).

Content Title: ${title}

Return a JSON object with this exact structure:
{
  "summary": "A concise 3-5 sentence summary of what the image contains and the main ideas",
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

async function callGeminiText(title: string, content: string, model: string, client: GoogleGenAI, customPrompt?: string): Promise<{ result: unknown; modelUsed: string }> {
  const prompt = customPrompt ?? GENERATION_PROMPT(title, content);
  const response = await client.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 8192 },
  });
  const text = response.text ?? "";
  return { result: extractJson(text), modelUsed: model };
}

async function callGeminiUrl(title: string, url: string, model: string, client: GoogleGenAI, customPrompt?: string): Promise<{ result: unknown; modelUsed: string }> {
  const prompt = customPrompt ?? URL_GENERATION_PROMPT(title, url);
  const response = await client.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: 8192,
      tools: [{ urlContext: {} }],
    },
  });
  const text = response.text ?? "";
  return { result: extractJson(text), modelUsed: model };
}

async function callGeminiImage(title: string, base64Data: string, mimeType: string, model: string, client: GoogleGenAI, customPrompt?: string): Promise<{ result: unknown; modelUsed: string }> {
  const prompt = customPrompt ?? IMAGE_GENERATION_PROMPT(title);
  const response = await client.models.generateContent({
    model,
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt },
      ],
    }],
    config: { maxOutputTokens: 8192 },
  });
  const text = response.text ?? "";
  return { result: extractJson(text), modelUsed: model };
}

async function callOpenAICompatible(title: string, content: string, model: string, client: OpenAI, customPrompt?: string): Promise<{ result: unknown; modelUsed: string }> {
  const prompt = customPrompt ?? GENERATION_PROMPT(title, content);
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return { result: extractJson(text), modelUsed: model };
}

async function generateWithModel(
  content: string,
  title: string,
  user: {
    byokGeminiKey?: string | null;
    byokOpenaiKey?: string | null;
    byokOpenrouterKey?: string | null;
  },
  sourceType: string,
  generateOpts?: GenerateOptions,
): Promise<{ result: unknown; modelUsed: string }> {
  const resolved = await resolveAI(user);
  const opts = generateOpts ?? DEFAULT_GENERATE;

  const textPrompt = buildSelectivePrompt(title, content, opts);
  const urlPrompt = buildSelectiveUrlPrompt(title, content, opts);
  const imagePrompt = buildSelectiveImagePrompt(title, opts);

  // OpenAI-compatible (openai or openrouter)
  if ((resolved.type === "openai" || resolved.type === "openrouter") && resolved.openaiClient) {
    return await callOpenAICompatible(title, content, resolved.model, resolved.openaiClient, textPrompt);
  }

  // Gemini
  const geminiClient = resolved.geminiClient ?? ai;
  if (sourceType === "image") {
    let mimeType = "image/jpeg";
    if (content.startsWith("iVBOR")) mimeType = "image/png";
    else if (content.startsWith("R0lGO")) mimeType = "image/gif";
    else if (content.startsWith("UklGR")) mimeType = "image/webp";
    return await callGeminiImage(title, content, mimeType, resolved.model, geminiClient, imagePrompt);
  }
  if (sourceType === "url") {
    return await callGeminiUrl(title, content, resolved.model, geminiClient, urlPrompt);
  }
  return await callGeminiText(title, content, resolved.model, geminiClient, textPrompt);
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

  const generateOpts: GenerateOptions = parsed.data.generate ?? DEFAULT_GENERATE;
  const creditCost = calcCreditCost(generateOpts);

  if (user.credits < creditCost) {
    res.status(402).json({ error: `Not enough credits. Need ${creditCost}, have ${user.credits}.` });
    return;
  }
  await db
    .update(usersTable)
    .set({ credits: user.credits - creditCost, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  let content = parsed.data.content;
  if (parsed.data.sourceType === "url") {
    try {
      content = await fetchUrlContent(parsed.data.content);
    } catch {
      content = parsed.data.content;
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

  // Log the credit spend transaction
  if (creditCost > 0) {
    try {
      await db.insert(creditTransactionsTable).values({
        userId: user.id,
        type: "spend",
        credits: -creditCost,
        description: `Study pack: ${parsed.data.title}`,
      });
    } catch { /* non-fatal */ }
  }

  try {
    const { result: generated, modelUsed } = await generateWithModel(content, parsed.data.title, user, parsed.data.sourceType, generateOpts) as {
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
    if (creditCost > 0) {
      // Refund credits on error
      const freshUser = await db.query.usersTable.findFirst({ where: eq(usersTable.id, user.id) });
      await db
        .update(usersTable)
        .set({ credits: (freshUser?.credits ?? 0) + creditCost, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
      try {
        await db.insert(creditTransactionsTable).values({
          userId: user.id,
          type: "refund",
          credits: creditCost,
          description: `Refund: generation failed for "${parsed.data.title}"`,
        });
      } catch { /* non-fatal */ }
    }
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
    const { result: generated, modelUsed } = await generateWithModel(pack.sourceContent ?? pack.title, pack.title, user, pack.sourceType ?? "text") as {
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
