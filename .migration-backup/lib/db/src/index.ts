import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString =
  process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set.",
  );
}

const isSupabase =
  connectionString.includes("supabase.com") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("pgbouncer");

export const pool = new Pool({
  connectionString,
  ssl: isSupabase || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
