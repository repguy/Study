import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { UpdateUserProfileBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

async function getOrCreateUser(clerkId: string) {
  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    const [created] = await db
      .insert(usersTable)
      .values({ clerkId })
      .returning();
    user = created;
  }
  return user;
}

router.get("/user/profile", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await getOrCreateUser(clerkId);
  const packCount = await db.query.studyPacksTable
    ? 0
    : 0;
  res.json({
    ...user,
    totalPacks: 0,
  });
});

router.put("/user/profile", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = UpdateUserProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = await getOrCreateUser(clerkId);
  const [updated] = await db
    .update(usersTable)
    .set({ displayName: parsed.data.displayName, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json({ ...updated, totalPacks: 0 });
});

router.get("/user/stats", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await getOrCreateUser(clerkId);
  const xpToNextLevel = (user.level * 100) - (user.xp % (user.level * 100));
  const studyStrength = Math.min(100, Math.floor((user.totalFlashcardsStudied / 10) + (user.totalQuizzesTaken * 5)));
  const examReadiness = Math.min(100, Math.floor(studyStrength * 0.8 + (user.streak * 2)));

  res.json({
    xp: user.xp,
    level: user.level,
    streak: user.streak,
    studyStrength,
    examReadiness,
    totalPacks: 0,
    totalFlashcardsStudied: user.totalFlashcardsStudied,
    totalQuizzesTaken: user.totalQuizzesTaken,
    averageQuizScore: 0,
    weeklyXP: Math.min(user.xp, 500),
    xpToNextLevel,
  });
});

export { getOrCreateUser };
export default router;
