import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "./user";
import { encrypt, decrypt } from "../lib/encryption";

const router = Router();

const SUPPORTED_PROVIDERS = ["gemini", "openai", "openrouter"] as const;
type Provider = typeof SUPPORTED_PROVIDERS[number];

function providerKeyField(provider: Provider): "byokGeminiKey" | "byokOpenaiKey" | "byokOpenrouterKey" {
  if (provider === "gemini") return "byokGeminiKey";
  if (provider === "openai") return "byokOpenaiKey";
  return "byokOpenrouterKey";
}

router.get("/user/byok", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  res.json({
    hasGeminiKey: !!user.byokGeminiKey,
    hasOpenaiKey: !!user.byokOpenaiKey,
    hasOpenrouterKey: !!user.byokOpenrouterKey,
  });
});

router.post("/user/byok", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { provider, key } = req.body as { provider?: string; key?: string };

  if (!provider || !SUPPORTED_PROVIDERS.includes(provider as Provider)) {
    res.status(400).json({ error: "provider must be 'gemini', 'openai', or 'openrouter'" });
    return;
  }
  if (!key || typeof key !== "string" || key.trim().length < 10) {
    res.status(400).json({ error: "key is required and must be at least 10 characters" });
    return;
  }

  const p = provider as Provider;
  const user = await getOrCreateUser(clerkId);
  const encrypted = encrypt(key.trim());
  const field = providerKeyField(p);

  await db
    .update(usersTable)
    .set({ [field]: encrypted, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  res.json({ success: true, provider: p });
});

router.delete("/user/byok/:provider", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const provider = req.params.provider;
  if (!SUPPORTED_PROVIDERS.includes(provider as Provider)) {
    res.status(400).json({ error: "provider must be 'gemini', 'openai', or 'openrouter'" });
    return;
  }

  const p = provider as Provider;
  const user = await getOrCreateUser(clerkId);
  const field = providerKeyField(p);

  await db
    .update(usersTable)
    .set({ [field]: null, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  res.json({ success: true, provider: p });
});

export default router;
