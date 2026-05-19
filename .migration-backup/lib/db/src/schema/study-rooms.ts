import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studyRoomsTable = pgTable("study_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  topic: text("topic").notNull(),
  description: text("description"),
  creatorId: integer("creator_id").notNull(),
  isPublic: boolean("is_public").notNull().default(true),
  joinCode: text("join_code").unique(),
  memberCount: integer("member_count").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const roomMembershipsTable = pgTable("room_memberships", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const roomMessagesTable = pgTable("room_messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudyRoomSchema = createInsertSchema(studyRoomsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudyRoom = z.infer<typeof insertStudyRoomSchema>;
export type StudyRoom = typeof studyRoomsTable.$inferSelect;

export const insertRoomMessageSchema = createInsertSchema(roomMessagesTable).omit({ id: true, createdAt: true });
export type InsertRoomMessage = z.infer<typeof insertRoomMessageSchema>;
export type RoomMessage = typeof roomMessagesTable.$inferSelect;
