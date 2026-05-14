import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { studyRoomsTable, roomMembershipsTable, roomMessagesTable, usersTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { getOrCreateUser } from "./user";
import { randomUUID } from "crypto";

const router = Router();

router.get("/rooms", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);

  const rooms = await db
    .select({
      id: studyRoomsTable.id,
      name: studyRoomsTable.name,
      topic: studyRoomsTable.topic,
      description: studyRoomsTable.description,
      isPublic: studyRoomsTable.isPublic,
      memberCount: studyRoomsTable.memberCount,
      creatorId: studyRoomsTable.creatorId,
      createdAt: studyRoomsTable.createdAt,
    })
    .from(studyRoomsTable)
    .where(eq(studyRoomsTable.isPublic, true))
    .orderBy(desc(studyRoomsTable.updatedAt))
    .limit(50);

  const memberOf = await db
    .select({ roomId: roomMembershipsTable.roomId })
    .from(roomMembershipsTable)
    .where(eq(roomMembershipsTable.userId, user.id));

  const memberRoomIds = new Set(memberOf.map((m) => m.roomId));

  res.json(rooms.map((r) => ({ ...r, isMember: memberRoomIds.has(r.id) })));
});

router.post("/rooms", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);

  const { name, topic, description, isPublic = true } = req.body as {
    name: string; topic: string; description?: string; isPublic?: boolean;
  };

  if (!name?.trim() || !topic?.trim()) {
    res.status(400).json({ error: "name and topic are required" });
    return;
  }

  const joinCode = isPublic ? undefined : randomUUID().slice(0, 8).toUpperCase();

  const [room] = await db
    .insert(studyRoomsTable)
    .values({
      name: name.trim(),
      topic: topic.trim(),
      description: description?.trim() ?? null,
      creatorId: user.id,
      isPublic,
      joinCode: joinCode ?? null,
      memberCount: 1,
    })
    .returning();

  await db.insert(roomMembershipsTable).values({ roomId: room.id, userId: user.id });

  res.status(201).json(room);
});

router.get("/rooms/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  const roomId = Number(req.params.id);

  const room = await db.query.studyRoomsTable.findFirst({ where: eq(studyRoomsTable.id, roomId) });
  if (!room) { res.status(404).json({ error: "Not found" }); return; }

  const membership = await db.query.roomMembershipsTable.findFirst({
    where: and(eq(roomMembershipsTable.roomId, roomId), eq(roomMembershipsTable.userId, user.id)),
  });

  const messages = await db.execute(sql`
    SELECT rm.id, rm.content, rm.created_at, u.display_name, u.clerk_id, u.xp, u.level
    FROM room_messages rm
    JOIN users u ON u.id = rm.user_id
    WHERE rm.room_id = ${roomId}
    ORDER BY rm.created_at ASC
    LIMIT 100
  `);

  res.json({
    ...room,
    isMember: !!membership,
    messages: messages.rows,
  });
});

router.post("/rooms/:id/join", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  const roomId = Number(req.params.id);
  const { joinCode } = req.body as { joinCode?: string };

  const room = await db.query.studyRoomsTable.findFirst({ where: eq(studyRoomsTable.id, roomId) });
  if (!room) { res.status(404).json({ error: "Not found" }); return; }

  if (!room.isPublic && room.joinCode !== joinCode) {
    res.status(403).json({ error: "Invalid join code" });
    return;
  }

  const existing = await db.query.roomMembershipsTable.findFirst({
    where: and(eq(roomMembershipsTable.roomId, roomId), eq(roomMembershipsTable.userId, user.id)),
  });

  if (!existing) {
    await db.insert(roomMembershipsTable).values({ roomId, userId: user.id });
    await db
      .update(studyRoomsTable)
      .set({ memberCount: room.memberCount + 1, updatedAt: new Date() })
      .where(eq(studyRoomsTable.id, roomId));
  }

  res.json({ joined: true });
});

router.post("/rooms/:id/leave", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  const roomId = Number(req.params.id);

  const room = await db.query.studyRoomsTable.findFirst({ where: eq(studyRoomsTable.id, roomId) });
  if (!room) { res.status(404).json({ error: "Not found" }); return; }

  await db
    .delete(roomMembershipsTable)
    .where(and(eq(roomMembershipsTable.roomId, roomId), eq(roomMembershipsTable.userId, user.id)));

  await db
    .update(studyRoomsTable)
    .set({ memberCount: Math.max(0, room.memberCount - 1), updatedAt: new Date() })
    .where(eq(studyRoomsTable.id, roomId));

  res.json({ left: true });
});

router.post("/rooms/:id/messages", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getOrCreateUser(clerkId);
  const roomId = Number(req.params.id);
  const { content } = req.body as { content: string };

  if (!content?.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const membership = await db.query.roomMembershipsTable.findFirst({
    where: and(eq(roomMembershipsTable.roomId, roomId), eq(roomMembershipsTable.userId, user.id)),
  });

  if (!membership) {
    res.status(403).json({ error: "You must join the room first" });
    return;
  }

  const [msg] = await db
    .insert(roomMessagesTable)
    .values({ roomId, userId: user.id, content: content.trim().slice(0, 2000) })
    .returning();

  await db
    .update(studyRoomsTable)
    .set({ updatedAt: new Date() })
    .where(eq(studyRoomsTable.id, roomId));

  res.status(201).json({
    ...msg,
    display_name: user.displayName,
    clerk_id: user.clerkId,
    xp: user.xp,
    level: user.level,
  });
});

export default router;
