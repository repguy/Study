import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const quizResultsTable = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  studyPackId: integer("study_pack_id").notNull(),
  userId: integer("user_id").notNull(),
  score: integer("score").notNull(),
  correctCount: integer("correct_count").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  timeTakenSeconds: integer("time_taken_seconds"),
  xpEarned: integer("xp_earned").notNull().default(0),
  weakAreas: text("weak_areas"),
  recommendations: text("recommendations"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuizResultSchema = createInsertSchema(quizResultsTable).omit({ id: true, createdAt: true });
export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type QuizResult = typeof quizResultsTable.$inferSelect;
