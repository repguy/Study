import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { creditTransactionsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getOrCreateUser } from "./user";
import { logger } from "../lib/logger";

const router = Router();

const LS_BASE = "https://api.lemonsqueezy.com/v1";

const PACKAGES: Record<string, { variantEnvKey: string; credits: number; label: string }> = {
  starter: { variantEnvKey: "LS_VARIANT_STARTER", credits: 50,  label: "Starter"  },
  pro:     { variantEnvKey: "LS_VARIANT_PRO",     credits: 200, label: "Pro"      },
  power:   { variantEnvKey: "LS_VARIANT_POWER",   credits: 500, label: "Power"    },
};

async function createLSCheckout(opts: {
  variantId: string;
  clerkId: string;
  pkg: string;
  userEmail?: string;
  userName?: string;
  redirectUrl: string;
}): Promise<string> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) throw new Error("LEMONSQUEEZY_API_KEY not set");

  const storeId = process.env.LS_STORE_ID;
  if (!storeId) throw new Error("LS_STORE_ID not set");

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_options: {
          embed: false,
          media: false,
          button_color: "#7c3aed",
        },
        checkout_data: {
          email: opts.userEmail,
          name: opts.userName,
          custom: {
            clerk_id: opts.clerkId,
            package: opts.pkg,
          },
        },
        product_options: {
          redirect_url: opts.redirectUrl,
          receipt_button_text: "Back to Cluvi",
          receipt_link_url: opts.redirectUrl,
          receipt_thank_you_note: "Thanks for your purchase! Your credits have been added to your account.",
          enabled_variants: [opts.variantId],
        },
        expires_at: null,
      },
      relationships: {
        store: { data: { type: "stores", id: storeId } },
        variant: { data: { type: "variants", id: opts.variantId } },
      },
    },
  };

  const res = await fetch(`${LS_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json() as { data?: { attributes?: { url?: string } }; errors?: unknown[] };
  if (!res.ok) {
    logger.error({ status: res.status, errors: json.errors }, "LS checkout creation failed");
    throw new Error(`Lemon Squeezy error: ${JSON.stringify(json.errors)}`);
  }

  const checkoutUrl = json.data?.attributes?.url;
  if (!checkoutUrl) throw new Error("No checkout URL returned from Lemon Squeezy");
  return checkoutUrl;
}

router.post("/payments/checkout", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { pkg } = req.body as { pkg?: string };
  if (!pkg || !PACKAGES[pkg]) {
    res.status(400).json({ error: "Invalid package. Must be: starter, pro, or power" });
    return;
  }

  const pkgConfig = PACKAGES[pkg];
  const variantId = process.env[pkgConfig.variantEnvKey];
  if (!variantId) {
    res.status(503).json({ error: `Package "${pkg}" is not yet configured (missing ${pkgConfig.variantEnvKey})` });
    return;
  }

  try {
    const user = await getOrCreateUser(clerkId);

    const origin = req.headers.origin as string | undefined;
    const redirectUrl = origin ? `${origin}/upgrade/success` : "https://cluvi.co/upgrade/success";

    const checkoutUrl = await createLSCheckout({
      variantId,
      clerkId,
      pkg,
      userEmail: undefined,
      userName: user.displayName ?? undefined,
      redirectUrl,
    });

    logger.info({ clerkId, pkg, variantId }, "Checkout session created");
    res.json({ url: checkoutUrl });
  } catch (err) {
    logger.error({ err }, "Failed to create checkout session");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to create checkout" });
  }
});

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
    logger.error({ err }, "Error fetching payment history");
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

router.get("/payments/packages", async (_req, res) => {
  const result = Object.entries(PACKAGES).map(([key, pkg]) => ({
    key,
    label: pkg.label,
    credits: pkg.credits,
    available: !!process.env[pkg.variantEnvKey],
  }));
  res.json(result);
});

export default router;
