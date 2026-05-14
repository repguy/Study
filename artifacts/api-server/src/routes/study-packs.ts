import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { studyPacksTable, flashcardsTable, quizQuestionsTable, quizResultsTable, usersTable } from "@workspace/db";
import { CreateStudyPackBody, GetStudyPackParams, DeleteStudyPackParams, GenerateStudyPackContentParams } from "@workspace/api-zod";
import { eq, desc, and, avg } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
import { getOrCreateUser } from "./user";

const router = Router();

async function generateContent(content: string, title: string) {
  const prompt = `You are an expert study assistant. Analyze the following content and generate structured study material.

Content Title: ${title}
Content: ${content.slice(0, 8000)}

Return a JSON object with this exact structure:
{
  "summary": "A concise 3-5 sentence summary of the main ideas",
  "keyConcepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
  "examPredictions": ["likely exam question 1", "likely exam question 2", "likely exam question 3", "likely exam question 4", "likely exam question 5"],
  "flashcards": [
    {"front": "Question or concept?", "back": "Answer or explanation"},
    {"front": "Question 2?", "back": "Answer 2"}
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

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 8192 },
  });

  const text = response.text ?? "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

router.get("/study-packs/dashboard", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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

  const avgScore =
    allResults.length > 0
      ? allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length
      : 0;

  const studyStrength = Math.min(100, Math.floor((user.totalFlashcardsStudied / 10) + (user.totalQuizzesTaken * 5)));
  const examReadiness = Math.min(100, Math.floor(studyStrength * 0.8 + (user.streak * 2)));

  const formattedPacks = packs.map((p) => ({
    ...p,
    flashcardCount: 0,
    quizCount: 0,
    examPredictionCount: p.examPredictions
      ? JSON.parse(p.examPredictions).length
      : 0,
  }));

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
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await getOrCreateUser(clerkId);
  const packs = await db
    .select()
    .from(studyPacksTable)
    .where(eq(studyPacksTable.userId, user.id))
    .orderBy(desc(studyPacksTable.createdAt));

  const packsWithCounts = await Promise.all(
    packs.map(async (pack) => {
      const cards = await db
        .select()
        .from(flashcardsTable)
        .where(eq(flashcardsTable.studyPackId, pack.id));
      const questions = await db
        .select()
        .from(quizQuestionsTable)
        .where(eq(quizQuestionsTable.studyPackId, pack.id));
      return {
        ...pack,
        flashcardCount: cards.length,
        quizCount: questions.length,
        examPredictionCount: pack.examPredictions
          ? JSON.parse(pack.examPredictions).length
          : 0,
      };
    })
  );

  res.json(packsWithCounts);
});

router.post("/study-packs", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateStudyPackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = await getOrCreateUser(clerkId);

  const [pack] = await db
    .insert(studyPacksTable)
    .values({
      userId: user.id,
      title: parsed.data.title,
      sourceType: parsed.data.sourceType,
      sourceContent: parsed.data.content,
      status: "processing",
      isPro: user.isPro,
    })
    .returning();

  res.status(201).json({
    ...pack,
    flashcardCount: 0,
    quizCount: 0,
    examPredictionCount: 0,
  });

  try {
    const generated = await generateContent(parsed.data.content, parsed.data.title);

    const flashcardData = (generated.flashcards ?? []).slice(0, user.isPro ? 100 : 5);
    const quizData = (generated.quizQuestions ?? []).slice(0, user.isPro ? 100 : 3);

    if (flashcardData.length > 0) {
      await db.insert(flashcardsTable).values(
        flashcardData.map((f: { front: string; back: string }) => ({
          studyPackId: pack.id,
          front: f.front,
          back: f.back,
        }))
      );
    }

    if (quizData.length > 0) {
      await db.insert(quizQuestionsTable).values(
        quizData.map((q: { question: string; options: string[]; correctAnswer: number; explanation?: string }) => ({
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
        updatedAt: new Date(),
      })
      .where(eq(studyPacksTable.id, pack.id));
  } catch {
    await db
      .update(studyPacksTable)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(studyPacksTable.id, pack.id));
  }
});

router.get("/study-packs/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetStudyPackParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const user = await getOrCreateUser(clerkId);
  const pack = await db.query.studyPacksTable.findFirst({
    where: and(
      eq(studyPacksTable.id, params.data.id),
      eq(studyPacksTable.userId, user.id)
    ),
  });
  if (!pack) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const flashcards = await db
    .select()
    .from(flashcardsTable)
    .where(eq(flashcardsTable.studyPackId, pack.id));

  const quizQuestions = await db
    .select()
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.studyPackId, pack.id));

  const parsedQuestions = quizQuestions.map((q) => ({
    ...q,
    options: JSON.parse(q.options),
  }));

  res.json({
    ...pack,
    keyConcepts: pack.keyConcepts ? JSON.parse(pack.keyConcepts) : [],
    examPredictions: pack.examPredictions ? JSON.parse(pack.examPredictions) : [],
    flashcardCount: flashcards.length,
    quizCount: parsedQuestions.length,
    examPredictionCount: pack.examPredictions ? JSON.parse(pack.examPredictions).length : 0,
    flashcards,
    quizQuestions: parsedQuestions,
  });
});

router.delete("/study-packs/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = DeleteStudyPackParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const user = await getOrCreateUser(clerkId);
  const pack = await db.query.studyPacksTable.findFirst({
    where: and(
      eq(studyPacksTable.id, params.data.id),
      eq(studyPacksTable.userId, user.id)
    ),
  });
  if (!pack) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(flashcardsTable).where(eq(flashcardsTable.studyPackId, pack.id));
  await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.studyPackId, pack.id));
  await db.delete(studyPacksTable).where(eq(studyPacksTable.id, pack.id));
  res.status(204).send();
});

router.post("/study-packs/:id/generate", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GenerateStudyPackContentParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const user = await getOrCreateUser(clerkId);
  const pack = await db.query.studyPacksTable.findFirst({
    where: and(
      eq(studyPacksTable.id, params.data.id),
      eq(studyPacksTable.userId, user.id)
    ),
  });
  if (!pack) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db
    .update(studyPacksTable)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(studyPacksTable.id, pack.id));

  try {
    const generated = await generateContent(pack.sourceContent ?? pack.title, pack.title);

    await db.delete(flashcardsTable).where(eq(flashcardsTable.studyPackId, pack.id));
    await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.studyPackId, pack.id));

    if (generated.flashcards?.length > 0) {
      await db.insert(flashcardsTable).values(
        generated.flashcards.map((f: { front: string; back: string }) => ({
          studyPackId: pack.id,
          front: f.front,
          back: f.back,
        }))
      );
    }

    if (generated.quizQuestions?.length > 0) {
      await db.insert(quizQuestionsTable).values(
        generated.quizQuestions.map((q: { question: string; options: string[]; correctAnswer: number; explanation?: string }) => ({
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
        updatedAt: new Date(),
      })
      .where(eq(studyPacksTable.id, pack.id));
  } catch {
    await db
      .update(studyPacksTable)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(studyPacksTable.id, pack.id));
  }

  const updatedPack = await db.query.studyPacksTable.findFirst({
    where: eq(studyPacksTable.id, pack.id),
  });
  const flashcards = await db.select().from(flashcardsTable).where(eq(flashcardsTable.studyPackId, pack.id));
  const quizQuestions = await db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.studyPackId, pack.id));

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

export default router;
