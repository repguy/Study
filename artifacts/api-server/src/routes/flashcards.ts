import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { flashcardsTable, studyPacksTable, usersTable } from "@workspace/db";
import { ListFlashcardsParams, RateFlashcardConfidenceParams, RateFlashcardConfidenceBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { getOrCreateUser } from "./user";

const router = Router();

router.get("/study-packs/:id/flashcards", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = ListFlashcardsParams.safeParse({ id: Number(req.params.id) });
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
  const flashcards = await db
    .select()
    .from(flashcardsTable)
    .where(eq(flashcardsTable.studyPackId, pack.id));
  res.json(flashcards);
});

router.patch("/study-packs/:id/flashcards/:cardId/confidence", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = RateFlashcardConfidenceParams.safeParse({
    id: Number(req.params.id),
    cardId: Number(req.params.cardId),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const body = RateFlashcardConfidenceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const user = await getOrCreateUser(clerkId);
  const pack = await db.query.studyPacksTable.findFirst({
    where: and(eq(studyPacksTable.id, params.data.id), eq(studyPacksTable.userId, user.id)),
  });
  if (!pack) {
    res.status(404).json({ error: "Pack not found" });
    return;
  }
  const card = await db.query.flashcardsTable.findFirst({
    where: and(eq(flashcardsTable.id, params.data.cardId), eq(flashcardsTable.studyPackId, pack.id)),
  });
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  const daysUntilReview = body.data.confidence <= 2 ? 1 : body.data.confidence === 3 ? 3 : body.data.confidence === 4 ? 7 : 14;
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + daysUntilReview);

  const [updated] = await db
    .update(flashcardsTable)
    .set({
      confidenceLevel: body.data.confidence,
      nextReviewAt: nextReview,
      timesStudied: card.timesStudied + 1,
    })
    .where(eq(flashcardsTable.id, card.id))
    .returning();

  await db
    .update(usersTable)
    .set({
      totalFlashcardsStudied: user.totalFlashcardsStudied + 1,
      xp: user.xp + 2,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, user.id));

  res.json(updated);
});

export default router;
