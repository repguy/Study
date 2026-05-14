import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studyPacksTable = pgTable("study_packs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  sourceType: text("source_type").notNull().default("text"),
  sourceContent: text("source_content"),
  status: text("status").notNull().default("processing"),
  summary: text("summary"),
  keyConcepts: text("key_concepts"),
  examPredictions: text("exam_predictions"),
  studyStrength: integer("study_strength").notNull().default(0),
  isPro: boolean("is_pro").notNull().default(false),
  shareToken: text("share_token").unique(),
  aiModelUsed: text("ai_model_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStudyPackSchema = createInsertSchema(studyPacksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudyPack = z.infer<typeof insertStudyPackSchema>;
export type StudyPack = typeof studyPacksTable.$inferSelect;
