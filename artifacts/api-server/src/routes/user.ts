import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, studyPacksTable } from "@workspace/db";
import { UpdateUserProfileBody } from "@workspace/api-zod";
import { eq, count } from "drizzle-orm";

const router = Router();

export async function getOrCreateUser(clerkId: string) {
  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    const [created] = await db
      .insert(usersTable)
      .values({ clerkId, credits: 10 })
      .returning();
    user = created;
  }
  return user;
}

router.get("/user/profile", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  const [{ count: totalPacks }] = await db.select({ count: count() }).from(studyPacksTable).where(eq(studyPacksTable.userId, user.id));
  res.json({ ...user, totalPacks: Number(totalPacks) });
});

router.put("/user/profile", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = UpdateUserProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = await getOrCreateUser(clerkId);
  const [updated] = await db
    .update(usersTable)
    .set({ displayName: parsed.data.displayName, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();
  const [{ count: totalPacks }] = await db.select({ count: count() }).from(studyPacksTable).where(eq(studyPacksTable.userId, user.id));
  res.json({ ...updated, totalPacks: Number(totalPacks) });
});

router.get("/user/stats", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  const [{ count: totalPacks }] = await db.select({ count: count() }).from(studyPacksTable).where(eq(studyPacksTable.userId, user.id));
  const xpToNextLevel = (user.level * 100) - (user.xp % (user.level * 100));
  const studyStrength = Math.min(100, Math.floor((user.totalFlashcardsStudied / 10) + (user.totalQuizzesTaken * 5)));
  const examReadiness = Math.min(100, Math.floor(studyStrength * 0.8 + (user.streak * 2)));
  res.json({
    xp: user.xp, level: user.level, streak: user.streak,
    studyStrength, examReadiness,
    totalPacks: Number(totalPacks),
    totalFlashcardsStudied: user.totalFlashcardsStudied,
    totalQuizzesTaken: user.totalQuizzesTaken,
    averageQuizScore: 0,
    weeklyXP: Math.min(user.xp, 500),
    xpToNextLevel,
    credits: user.credits,
  });
});

router.get("/user/ai-settings", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  res.json({ aiModel: user.aiModel, customAiModel: user.customAiModel });
});

router.patch("/user/ai-settings", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { aiModel, customAiModel } = req.body as { aiModel?: string; customAiModel?: string };
  const user = await getOrCreateUser(clerkId);
  const [updated] = await db
    .update(usersTable)
    .set({ aiModel: aiModel ?? user.aiModel, customAiModel: customAiModel ?? user.customAiModel, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json({ aiModel: updated.aiModel, customAiModel: updated.customAiModel });
});

export default router;
