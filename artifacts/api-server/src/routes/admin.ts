import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, studyPacksTable, quizResultsTable, flashcardsTable } from "@workspace/db";
import { eq, count, sql, desc } from "drizzle-orm";

const router = Router();

const ADMIN_CLERK_IDS = (process.env.ADMIN_CLERK_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function isAdmin(clerkId: string): boolean {
  if (ADMIN_CLERK_IDS.length === 0) return false;
  return ADMIN_CLERK_IDS.includes(clerkId);
}

router.get("/admin/stats", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId || !isAdmin(clerkId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [proUsersRow] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.isPro, true));
  const [totalPacksRow] = await db.select({ count: count() }).from(studyPacksTable);
  const [totalQuizzesRow] = await db.select({ count: count() }).from(quizResultsTable);
  const [totalFlashcardsRow] = await db.select({ count: count() }).from(flashcardsTable);

  const recentUsers = await db
    .select({
      id: usersTable.id,
      clerkId: usersTable.clerkId,
      displayName: usersTable.displayName,
      isPro: usersTable.isPro,
      xp: usersTable.xp,
      streak: usersTable.streak,
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
      u.xp,
      u.streak,
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

router.patch("/admin/users/:clerkId/pro", async (req, res) => {
  const { userId: adminClerkId } = getAuth(req);
  if (!adminClerkId || !isAdmin(adminClerkId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { clerkId } = req.params;
  const { isPro } = req.body as { isPro: boolean };

  const [updated] = await db
    .update(usersTable)
    .set({ isPro: Boolean(isPro), updatedAt: new Date() })
    .where(eq(usersTable.clerkId, clerkId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(updated);
});

export default router;
