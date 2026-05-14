import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, studyPacksTable, quizResultsTable, flashcardsTable, creditPacksTable } from "@workspace/db";
import { eq, count, sql, desc, ilike, or } from "drizzle-orm";

const router = Router();

const ADMIN_CLERK_IDS = (process.env.ADMIN_CLERK_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function isAdmin(clerkId: string): boolean {
  if (ADMIN_CLERK_IDS.length === 0) return false;
  return ADMIN_CLERK_IDS.includes(clerkId);
}

function adminGuard(req: any, res: any): string | null {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId || !isAdmin(clerkId)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return clerkId;
}

router.get("/admin/stats", async (req, res) => {
  if (!adminGuard(req, res)) return;

  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [proUsersRow] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.isPro, true));
  const [bannedRow] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.isBanned, true));
  const [totalPacksRow] = await db.select({ count: count() }).from(studyPacksTable);
  const [totalQuizzesRow] = await db.select({ count: count() }).from(quizResultsTable);
  const [totalFlashcardsRow] = await db.select({ count: count() }).from(flashcardsTable);

  const recentUsers = await db
    .select({
      id: usersTable.id,
      clerkId: usersTable.clerkId,
      displayName: usersTable.displayName,
      isPro: usersTable.isPro,
      isBanned: usersTable.isBanned,
      credits: usersTable.credits,
      xp: usersTable.xp,
      streak: usersTable.streak,
      referralCount: usersTable.referralCount,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(10);

  const signupsByDay = await db.execute(sql`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as signups,
      SUM(CASE WHEN is_pro THEN 1 ELSE 0 END) as pro_signups
    FROM users
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  const packsByDay = await db.execute(sql`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as packs
    FROM study_packs
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  const topUsers = await db.execute(sql`
    SELECT 
      u.id,
      u.display_name,
      u.clerk_id,
      u.is_pro,
      u.is_banned,
      u.xp,
      u.streak,
      u.credits,
      u.referral_count,
      COUNT(sp.id) as pack_count
    FROM users u
    LEFT JOIN study_packs sp ON sp.user_id = u.id
    GROUP BY u.id
    ORDER BY u.xp DESC
    LIMIT 10
  `);

  res.json({
    overview: {
      totalUsers: Number(totalUsersRow.count),
      proUsers: Number(proUsersRow.count),
      freeUsers: Number(totalUsersRow.count) - Number(proUsersRow.count),
      bannedUsers: Number(bannedRow.count),
      conversionRate: totalUsersRow.count > 0
        ? ((Number(proUsersRow.count) / Number(totalUsersRow.count)) * 100).toFixed(1)
        : "0.0",
      totalPacks: Number(totalPacksRow.count),
      totalQuizzes: Number(totalQuizzesRow.count),
      totalFlashcards: Number(totalFlashcardsRow.count),
    },
    recentUsers,
    signupsByDay: signupsByDay.rows,
    packsByDay: packsByDay.rows,
    topUsers: topUsers.rows,
  });
});

router.get("/admin/users", async (req, res) => {
  if (!adminGuard(req, res)) return;

  const { search, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(100, Math.max(1, Number(limit)));
  const off = Math.max(0, Number(offset));

  let query = db
    .select({
      id: usersTable.id,
      clerkId: usersTable.clerkId,
      displayName: usersTable.displayName,
      isPro: usersTable.isPro,
      isBanned: usersTable.isBanned,
      credits: usersTable.credits,
      xp: usersTable.xp,
      level: usersTable.level,
      streak: usersTable.streak,
      referralCode: usersTable.referralCode,
      referralCount: usersTable.referralCount,
      badges: usersTable.badges,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(lim)
    .offset(off);

  if (search) {
    const users = await db
      .select({
        id: usersTable.id,
        clerkId: usersTable.clerkId,
        displayName: usersTable.displayName,
        isPro: usersTable.isPro,
        isBanned: usersTable.isBanned,
        credits: usersTable.credits,
        xp: usersTable.xp,
        level: usersTable.level,
        streak: usersTable.streak,
        referralCode: usersTable.referralCode,
        referralCount: usersTable.referralCount,
        badges: usersTable.badges,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(
        or(
          ilike(usersTable.displayName, `%${search}%`),
          ilike(usersTable.clerkId, `%${search}%`),
          ilike(usersTable.referralCode, `%${search}%`)
        )
      )
      .orderBy(desc(usersTable.createdAt))
      .limit(lim)
      .offset(off);
    res.json(users);
    return;
  }

  const users = await query;
  res.json(users);
});

router.patch("/admin/users/:clerkId/pro", async (req, res) => {
  if (!adminGuard(req, res)) return;
  const { clerkId } = req.params;
  const { isPro } = req.body as { isPro: boolean };

  const [updated] = await db
    .update(usersTable)
    .set({ isPro: Boolean(isPro), updatedAt: new Date() })
    .where(eq(usersTable.clerkId, clerkId))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

router.patch("/admin/users/:clerkId/credits", async (req, res) => {
  if (!adminGuard(req, res)) return;
  const { clerkId } = req.params;
  const { delta, set: setCredits } = req.body as { delta?: number; set?: number };

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const newCredits = setCredits !== undefined
    ? Math.max(0, setCredits)
    : Math.max(0, user.credits + (delta ?? 0));

  const [updated] = await db
    .update(usersTable)
    .set({ credits: newCredits, updatedAt: new Date() })
    .where(eq(usersTable.clerkId, clerkId))
    .returning();

  res.json(updated);
});

router.patch("/admin/users/:clerkId/ban", async (req, res) => {
  if (!adminGuard(req, res)) return;
  const { clerkId } = req.params;
  const { isBanned } = req.body as { isBanned: boolean };

  const [updated] = await db
    .update(usersTable)
    .set({ isBanned: Boolean(isBanned), updatedAt: new Date() })
    .where(eq(usersTable.clerkId, clerkId))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

router.delete("/admin/users/:clerkId", async (req, res) => {
  if (!adminGuard(req, res)) return;
  const { clerkId } = req.params;

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await db.delete(usersTable).where(eq(usersTable.clerkId, clerkId));
  res.status(204).send();
});

// ── Credit Packs ──────────────────────────────────────────────────────────────

router.get("/admin/credit-packs", async (req, res) => {
  if (!adminGuard(req, res)) return;
  const packs = await db.select().from(creditPacksTable).orderBy(creditPacksTable.credits);
  res.json(packs);
});

router.post("/admin/credit-packs", async (req, res) => {
  if (!adminGuard(req, res)) return;
  const { name, credits, priceUsd, discountPercent = 0, badge } = req.body as {
    name: string; credits: number; priceUsd: number; discountPercent?: number; badge?: string;
  };
  if (!name || !credits || !priceUsd) {
    res.status(400).json({ error: "name, credits, and priceUsd are required" });
    return;
  }
  const [pack] = await db
    .insert(creditPacksTable)
    .values({ name, credits, priceUsd, discountPercent, badge: badge ?? null })
    .returning();
  res.status(201).json(pack);
});

router.patch("/admin/credit-packs/:id", async (req, res) => {
  if (!adminGuard(req, res)) return;
  const id = Number(req.params.id);
  const { name, credits, priceUsd, discountPercent, badge, isActive } = req.body as {
    name?: string; credits?: number; priceUsd?: number; discountPercent?: number; badge?: string; isActive?: boolean;
  };
  const [updated] = await db
    .update(creditPacksTable)
    .set({
      ...(name !== undefined && { name }),
      ...(credits !== undefined && { credits }),
      ...(priceUsd !== undefined && { priceUsd }),
      ...(discountPercent !== undefined && { discountPercent }),
      ...(badge !== undefined && { badge }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    })
    .where(eq(creditPacksTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/admin/credit-packs/:id", async (req, res) => {
  if (!adminGuard(req, res)) return;
  const id = Number(req.params.id);
  await db.delete(creditPacksTable).where(eq(creditPacksTable.id, id));
  res.status(204).send();
});

export default router;
