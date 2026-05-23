import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { creditTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getOrCreateUser } from "./user";

const router = Router();

router.get("/payments/history", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const user = await getOrCreateUser(clerkId);
    const transactions = await db
      .select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.userId, user.id))
      .orderBy(desc(creditTransactionsTable.createdAt))
      .limit(100);
    res.json(transactions);
  } catch (err) {
    console.error("[payments] error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

export default router;
