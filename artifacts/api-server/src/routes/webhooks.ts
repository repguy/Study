import { Router, type Request } from "express";
import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

async function addCreditsToUser(email: string, credits: number, clerkId?: string) {
  let user = clerkId
    ? await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) })
    : null;

  if (!user && email) {
    user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, email),
    });
  }

  if (!user) return null;

  const [updated] = await db
    .update(usersTable)
    .set({ credits: user.credits + credits, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();
  return updated;
}

function verifyHmac(secret: string, body: string, sig: string, algo = "sha256"): boolean {
  try {
    const hash = createHmac(algo, secret).update(body).digest("hex");
    return `${algo}=${hash}` === sig || hash === sig;
  } catch {
    return false;
  }
}

router.post("/webhooks/lemonsqueezy", async (req, res) => {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const sig = req.headers["x-signature"] as string;
  const rawBody = JSON.stringify(req.body);

  if (secret && sig && !verifyHmac(secret, rawBody, sig)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const { meta, data } = req.body as {
    meta: { event_name: string; custom_data?: Record<string, unknown> };
    data: { attributes: { user_email: string; status: string } };
  };

  if (meta?.event_name === "order_created" || meta?.event_name === "subscription_payment_success") {
    const email = data?.attributes?.user_email;
    const clerkId = meta?.custom_data?.clerk_id as string | undefined;
    const credits = getCreditsFromMeta(meta?.custom_data ?? {});
    await addCreditsToUser(email, credits, clerkId);
  }

  res.json({ ok: true });
});

router.post("/webhooks/polar", async (req, res) => {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  const sig = req.headers["polar-signature"] as string ?? req.headers["webhook-signature"] as string;
  const rawBody = JSON.stringify(req.body);

  if (secret && sig && !verifyHmac(secret, rawBody, sig)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const { type, data } = req.body as {
    type: string;
    data: { customer?: { email: string }; metadata?: Record<string, unknown> };
  };

  if (type === "order.created" || type === "subscription.active") {
    const email = data?.customer?.email ?? "";
    const clerkId = data?.metadata?.clerk_id as string | undefined;
    const credits = getCreditsFromMeta(data?.metadata ?? {});
    await addCreditsToUser(email, credits, clerkId);
  }

  res.json({ ok: true });
});

router.post("/webhooks/whop", async (req, res) => {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  const sig = req.headers["x-whop-signature"] as string;
  const rawBody = JSON.stringify(req.body);

  if (secret && sig && !verifyHmac(secret, rawBody, sig)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const { action, data } = req.body as {
    action: string;
    data: { user?: { email: string }; metadata?: Record<string, unknown> };
  };

  if (action === "payment.succeeded" || action === "membership.went_valid") {
    const email = data?.user?.email ?? "";
    const clerkId = data?.metadata?.clerk_id as string | undefined;
    const credits = getCreditsFromMeta(data?.metadata ?? {});
    await addCreditsToUser(email, credits, clerkId);
  }

  res.json({ ok: true });
});

router.post("/webhooks/gumroad", async (req, res) => {
  const { email, custom_fields } = req.body as {
    email: string;
    custom_fields?: Record<string, string>;
  };

  const clerkId = custom_fields?.clerk_id;
  const credits = getCreditsFromMeta(custom_fields ?? {});
  await addCreditsToUser(email, credits, clerkId);
  res.json({ ok: true });
});

export default router;
