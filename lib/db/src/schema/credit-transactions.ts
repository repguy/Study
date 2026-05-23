import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const creditTransactionsTable = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<"purchase" | "spend" | "refund" | "bonus">(),
  credits: integer("credits").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
