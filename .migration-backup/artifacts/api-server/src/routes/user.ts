import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, studyPacksTable, creditPacksTable } from "@workspace/db";
import { UpdateUserProfileBody } from "@workspace/api-zod";
import { eq, count } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function generateReferralCode(): string {
  return randomUUID().slice(0, 8).toUpperCase();
}

export async function getOrCreateUser(clerkId: string) {
  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    const referralCode = generateReferralCode();
    const [created] = await db
      .insert(usersTable)
      .values({ clerkId, credits: 10, referralCode })
      .returning();
    user = created;
  } else if (!user.referralCode) {
    const [updated] = await db
      .update(usersTable)
      .set({ referralCode: generateReferralCode(), updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();
    user = updated;
  }
  return user;
}

router.get("/user/profile", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  if (user.isBanned) { res.status(403).json({ error: "Account banned" }); return; }
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
    referralCode: user.referralCode,
    referralCount: user.referralCount,
    badges: user.badges ? JSON.parse(user.badges) : [],
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

// GET /user/referral — get referral info
router.get("/user/referral", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  res.json({
    referralCode: user.referralCode,
    referralCount: user.referralCount,
    creditsEarned: (user.referralCount ?? 0) * 20,
  });
});

// POST /user/referral/use — apply a referral code at signup
router.post("/user/referral/use", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { code } = req.body as { code: string };
  if (!code) { res.status(400).json({ error: "code is required" }); return; }

  const user = await getOrCreateUser(clerkId);

  if (user.referredBy) {
    res.status(400).json({ error: "Referral code already applied" });
    return;
  }

  if (user.referralCode?.toUpperCase() === code.toUpperCase()) {
    res.status(400).json({ error: "Cannot use your own referral code" });
    return;
  }

  const referrer = await db.query.usersTable.findFirst({
    where: eq(usersTable.referralCode, code.toUpperCase()),
  });

  if (!referrer) {
    res.status(404).json({ error: "Referral code not found" });
    return;
  }

  // Give referred user +20 credits bonus
  await db
    .update(usersTable)
    .set({ referredBy: code.toUpperCase(), credits: user.credits + 20, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  // Give referrer +20 credits and increment referral count
  await db
    .update(usersTable)
    .set({
      credits: referrer.credits + 20,
      referralCount: (referrer.referralCount ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, referrer.id));

  res.json({ success: true, creditsAwarded: 20 });
});

// GET /user/credit-packs — get available credit packs for purchase
router.get("/user/credit-packs", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const packs = await db
    .select()
    .from(creditPacksTable)
    .where(eq(creditPacksTable.isActive, true))
    .orderBy(creditPacksTable.credits);
  res.json(packs);
});

export default router;
