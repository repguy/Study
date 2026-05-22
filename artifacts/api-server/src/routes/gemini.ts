import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import {
  CreateGeminiConversationBody,
  GetGeminiConversationParams,
  DeleteGeminiConversationParams,
  ListGeminiMessagesParams,
  SendGeminiMessageParams,
  SendGeminiMessageBody,
  GenerateGeminiImageBody,
} from "@workspace/api-zod";
import { eq, asc, and } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
import { generateImage } from "@workspace/integrations-gemini-ai/image";

const router = Router();

router.get("/gemini/conversations", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.clerkId, clerkId))
    .orderBy(conversations.createdAt);
  res.json(convs);
});

router.post("/gemini/conversations", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = CreateGeminiConversationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [conv] = await db
    .insert(conversations)
    .values({ clerkId, title: parsed.data.title })
    .returning();
  res.status(201).json(conv);
});

router.get("/gemini/conversations/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = GetGeminiConversationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, params.data.id), eq(conversations.clerkId, clerkId)),
  });
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

router.delete("/gemini/conversations/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = DeleteGeminiConversationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, params.data.id), eq(conversations.clerkId, clerkId)),
  });
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(messages).where(eq(messages.conversationId, conv.id));
  await db.delete(conversations).where(and(eq(conversations.id, conv.id), eq(conversations.clerkId, clerkId)));
  res.status(204).send();
});

router.get("/gemini/conversations/:id/messages", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = ListGeminiMessagesParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, params.data.id), eq(conversations.clerkId, clerkId)),
  });
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/gemini/conversations/:id/messages", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = SendGeminiMessageParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = SendGeminiMessageBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, params.data.id), eq(conversations.clerkId, clerkId)),
  });
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }

  await db.insert(messages).values({
    conversationId: conv.id,
    role: "user",
    content: body.data.content,
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(asc(messages.createdAt));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: { maxOutputTokens: 8192 },
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    }
  }

  await db.insert(messages).values({
    conversationId: conv.id,
    role: "assistant",
    content: fullResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/gemini/generate-image", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = GenerateGeminiImageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const result = await generateImage(parsed.data.prompt);
  res.json(result);
});

export default router;
