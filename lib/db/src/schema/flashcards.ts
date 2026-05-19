import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flashcardsTable = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  studyPackId: integer("study_pack_id").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  confidenceLevel: integer("confidence_level").notNull().default(1),
  nextReviewAt: timestamp("next_review_at"),
  timesStudied: integer("times_studied").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({ id: true, createdAt: true });
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcardsTable.$inferSelect;
