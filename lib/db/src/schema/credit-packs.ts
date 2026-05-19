import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creditPacksTable = pgTable("credit_packs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  credits: integer("credits").notNull(),
  priceUsd: integer("price_usd").notNull(),
  discountPercent: integer("discount_percent").notNull().default(0),
  badge: text("badge"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCreditPackSchema = createInsertSchema(creditPacksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCreditPack = z.infer<typeof insertCreditPackSchema>;
export type CreditPack = typeof creditPacksTable.$inferSelect;
