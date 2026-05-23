import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { quizQuestionsTable, quizResultsTable, studyPacksTable, usersTable } from "@workspace/db";
import {
  GetQuizQuestionsParams,
  SubmitQuizResultParams,
  SubmitQuizResultBody,
  GetQuizHistoryParams,
} from "@workspace/api-zod";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreateUser } from "./user";

const router = Router();

router.get("/study-packs/:id/quiz", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetQuizQuestionsParams.safeParse({ id: Number(req.params.id) });
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
    res.status(404).json({ error: "Pack not found" });
    return;
  }
  const questions = await db
    .select()
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.studyPackId, pack.id));

  res.json(
    questions.map((q) => ({
      ...q,
      options: JSON.parse(q.options),
    }))
  );
});

router.post("/study-packs/:id/quiz/submit", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = SubmitQuizResultParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = SubmitQuizResultBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
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
    res.status(404).json({ error: "Pack not found" });
    return;
  }

  const questions = await db
    .select()
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.studyPackId, pack.id));

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  let correctCount = 0;
  const wrongQuestions: string[] = [];

  for (const answer of body.data.answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;
    if (answer.selectedAnswer === question.correctAnswer) {
      correctCount++;
    } else {
      wrongQuestions.push(question.question);
    }
  }

  const totalQuestions = body.data.answers.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const xpEarned = Math.round(score / 10) * 5;

  const [result] = await db
    .insert(quizResultsTable)
    .values({
      studyPackId: pack.id,
      userId: user.id,
      score,
      correctCount,
      totalQuestions,
      timeTakenSeconds: body.data.timeTakenSeconds ?? null,
      xpEarned,
      weakAreas: JSON.stringify(wrongQuestions.slice(0, 3)),
      recommendations: JSON.stringify(
        score < 70
          ? ["Review flashcards for this topic", "Re-read the summary section"]
          : ["Great work! Try a harder topic", "Review any missed questions"]
      ),
    })
    .returning();

  await db
    .update(usersTable)
    .set({
      xp: user.xp + xpEarned,
      totalQuizzesTaken: user.totalQuizzesTaken + 1,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, user.id));

  res.json({
    ...result,
    weakAreas: JSON.parse(result.weakAreas ?? "[]"),
    recommendations: JSON.parse(result.recommendations ?? "[]"),
  });
});

router.get("/study-packs/:id/quiz-history", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetQuizHistoryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const user = await getOrCreateUser(clerkId);
  const results = await db
    .select()
    .from(quizResultsTable)
    .where(
      and(
        eq(quizResultsTable.studyPackId, params.data.id),
        eq(quizResultsTable.userId, user.id)
      )
    )
    .orderBy(desc(quizResultsTable.createdAt));

  res.json(
    results.map((r) => ({
      ...r,
      weakAreas: JSON.parse(r.weakAreas ?? "[]"),
      recommendations: JSON.parse(r.recommendations ?? "[]"),
    }))
  );
});

export default router;
