#!/usr/bin/env node
/**
 * Lemon Squeezy webhook test script
 * Tests the /api/webhooks/lemonsqueezy endpoint locally with a real HMAC signature.
 *
 * Usage:
 *   node scripts/test-ls-webhook.mjs <clerk_id> [package]
 *
 * Examples:
 *   node scripts/test-ls-webhook.mjs user_2abc123def pro
 *   node scripts/test-ls-webhook.mjs user_2abc123def starter
 */

import { createHmac } from "crypto";

const API_BASE = process.env.API_URL ?? "http://localhost:80";
const SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
const clerkId = process.argv[2];
const pkg = process.argv[3] ?? "pro";

if (!clerkId) {
  console.error("Usage: node scripts/test-ls-webhook.mjs <clerk_id> [package]");
  console.error("  package: starter (50 credits), pro (200 credits), power (500 credits)");
  process.exit(1);
}

if (!SECRET) {
  console.log("⚠  LEMONSQUEEZY_WEBHOOK_SECRET is not set.");
  console.log("   The endpoint will return 503 until the secret is configured.");
  console.log("\n   To test the flow without a real LS account, set a temporary secret:");
  console.log("   LEMONSQUEEZY_WEBHOOK_SECRET=testsecret node scripts/test-ls-webhook.mjs <clerk_id>\n");
  process.exit(1);
}

const CREDITS = { starter: 50, pro: 200, power: 500 };
const credits = CREDITS[pkg] ?? 50;

const payload = {
  meta: {
    event_name: "order_created",
    custom_data: {
      clerk_id: clerkId,
      package: pkg,
    },
  },
  data: {
    id: "test-order-" + Date.now(),
    attributes: {
      status: "paid",
      user_email: "test@example.com",
      total: pkg === "starter" ? 499 : pkg === "pro" ? 1499 : 2999,
    },
  },
};

const body = JSON.stringify(payload);
const hash = createHmac("sha256", SECRET).update(body).digest("hex");
const sig = `sha256=${hash}`;

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🍋 Lemon Squeezy Webhook Test");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`Endpoint : ${API_BASE}/api/webhooks/lemonsqueezy`);
console.log(`Event    : order_created`);
console.log(`Clerk ID : ${clerkId}`);
console.log(`Package  : ${pkg} → ${credits} credits`);
console.log(`Sig      : ${sig.slice(0, 30)}...`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

try {
  const res = await fetch(`${API_BASE}/api/webhooks/lemonsqueezy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": sig,
    },
    body,
  });

  const json = await res.json().catch(() => ({}));

  if (res.ok && json.ok) {
    console.log("✅ Webhook accepted!");
    console.log(`   ${credits} credits should now be added to user ${clerkId}`);
    console.log("\n   To verify, check the user in your database:");
    console.log(`   SELECT credits FROM users WHERE clerk_id = '${clerkId}';`);
  } else {
    console.log(`❌ Webhook failed (HTTP ${res.status})`);
    console.log("   Response:", JSON.stringify(json, null, 2));

    if (res.status === 401) {
      console.log("\n   → Signature mismatch. Make sure LEMONSQUEEZY_WEBHOOK_SECRET matches");
      console.log("     the signing secret in your Lemon Squeezy dashboard.");
    }
    if (res.status === 503) {
      console.log("\n   → LEMONSQUEEZY_WEBHOOK_SECRET is not configured on the server.");
    }
    if (json.reason === "missing clerk_id") {
      console.log("\n   → The payload didn't include a clerk_id. This is a test script bug.");
    }
  }
} catch (e) {
  console.log("❌ Request failed:", e.message);
  console.log("   Is the API server running? (http://localhost:80)");
}
