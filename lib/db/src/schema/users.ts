import { pgTable, serial, text, boolean, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  displayName: text("display_name"),
  isPro: boolean("is_pro").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  credits: integer("credits").notNull().default(10),
  aiModel: text("ai_model").notNull().default("auto"),
  customAiModel: text("custom_ai_model"),
  byokGeminiKey: text("byok_gemini_key"),
  byokOpenaiKey: text("byok_openai_key"),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streak: integer("streak").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  totalFlashcardsStudied: integer("total_flashcards_studied").notNull().default(0),
  totalQuizzesTaken: integer("total_quizzes_taken").notNull().default(0),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  referralCount: integer("referral_count").notNull().default(0),
  badges: text("badges"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
