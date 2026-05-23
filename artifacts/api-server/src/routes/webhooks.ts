import { Router, type Request } from "express";
import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { usersTable, creditTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const CREDIT_PACKAGES: Record<string, number> = {
  starter: 50,
  pro: 200,
  power: 500,
  "50": 50,
  "200": 200,
  "500": 500,
};

function getCreditsFromMeta(meta: Record<string, unknown>): number {
  const custom = meta?.custom as Record<string, unknown> | undefined;
  const customData = meta?.custom_data as Record<string, unknown> | undefined;
  const credits = meta?.credits ?? custom?.credits ?? customData?.credits;
  if (credits) return Number(credits);
  const pkg = String(meta?.package ?? meta?.variant ?? "").toLowerCase();
  return CREDIT_PACKAGES[pkg] ?? 50;
}

async function addCreditsByClerkId(clerkId: string, credits: number): Promise<boolean> {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    logger.warn({ clerkId }, "Webhook: no user found for clerk_id — credits not granted");
    return false;
  }
  await db
    .update(usersTable)
    .set({ credits: user.credits + credits, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));
  // Log the credit purchase transaction
  try {
    await db.insert(creditTransactionsTable).values({
      userId: user.id,
      type: "purchase",
      credits,
      description: `Credit purchase: ${credits} credits`,
    });
  } catch { /* non-fatal */ }
  logger.info({ clerkId, credits, newTotal: user.credits + credits }, "Webhook: credits granted");
  return true;
}

function verifyHmac(secret: string, body: Buffer | string, sig: string, algo = "sha256"): boolean {
  try {
    const hash = createHmac(algo, secret).update(body).digest("hex");
    return `${algo}=${hash}` === sig || hash === sig;
  } catch {
    return false;
  }
}

function getRawBody(req: Request): Buffer {
  return Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
}

router.post("/webhooks/lemonsqueezy", async (req, res) => {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("LEMONSQUEEZY_WEBHOOK_SECRET is not set — webhook endpoint disabled");
    res.status(503).json({ error: "Webhook not configured" });
    return;
  }
  const sig = req.headers["x-signature"] as string | undefined;
  if (!sig) {
    res.status(401).json({ error: "Missing signature" });
    return;
  }
  const rawBody = getRawBody(req);
  if (!verifyHmac(secret, rawBody, sig)) {
    logger.warn({ sig, bodyLen: rawBody.length }, "Webhook: HMAC mismatch");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const payload = JSON.parse(rawBody.toString()) as {
    meta: { event_name: string; custom_data?: Record<string, unknown> };
    data: { attributes: { user_email: string; status: string } };
  };
  const { meta, data } = payload;

  if (meta?.event_name === "order_created" || meta?.event_name === "subscription_payment_success") {
    const clerkId = meta?.custom_data?.clerk_id as string | undefined;
    if (!clerkId) {
      logger.warn({ event: meta?.event_name }, "Webhook: missing clerk_id in custom_data — skipping credit grant");
      res.json({ ok: true, credited: false, reason: "missing clerk_id" });
      return;
    }
    const credits = getCreditsFromMeta(meta?.custom_data ?? {});
    await addCreditsByClerkId(clerkId, credits);
  }

  res.json({ ok: true });
});

router.post("/webhooks/polar", async (req, res) => {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("POLAR_WEBHOOK_SECRET is not set — webhook endpoint disabled");
    res.status(503).json({ error: "Webhook not configured" });
    return;
  }
  const sig = req.headers["polar-signature"] as string ?? req.headers["webhook-signature"] as string;
  if (!sig) {
    res.status(401).json({ error: "Missing signature" });
    return;
  }
  const rawBody = getRawBody(req);
  if (!verifyHmac(secret, rawBody, sig)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const { type, data } = JSON.parse(rawBody.toString()) as {
    type: string;
    data: { metadata?: Record<string, unknown> };
  };

  if (type === "order.created" || type === "subscription.active") {
    const clerkId = data?.metadata?.clerk_id as string | undefined;
    if (!clerkId) {
      logger.warn({ event: type }, "Webhook: missing clerk_id in metadata — skipping credit grant");
      res.json({ ok: true, credited: false, reason: "missing clerk_id" });
      return;
    }
    const credits = getCreditsFromMeta(data?.metadata ?? {});
    await addCreditsByClerkId(clerkId, credits);
  }

  res.json({ ok: true });
});

router.post("/webhooks/whop", async (req, res) => {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("WHOP_WEBHOOK_SECRET is not set — webhook endpoint disabled");
    res.status(503).json({ error: "Webhook not configured" });
    return;
  }
  const sig = req.headers["x-whop-signature"] as string | undefined;
  if (!sig) {
    res.status(401).json({ error: "Missing signature" });
    return;
  }
  const rawBody = getRawBody(req);
  if (!verifyHmac(secret, rawBody, sig)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const { action, data } = JSON.parse(rawBody.toString()) as {
    action: string;
    data: { metadata?: Record<string, unknown> };
  };

  if (action === "payment.succeeded" || action === "membership.went_valid") {
    const clerkId = data?.metadata?.clerk_id as string | undefined;
    if (!clerkId) {
      logger.warn({ event: action }, "Webhook: missing clerk_id in metadata — skipping credit grant");
      res.json({ ok: true, credited: false, reason: "missing clerk_id" });
      return;
    }
    const credits = getCreditsFromMeta(data?.metadata ?? {});
    await addCreditsByClerkId(clerkId, credits);
  }

  res.json({ ok: true });
});

export default router;
