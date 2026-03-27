import pg from "pg";
import { logger } from "./logger";

const { Pool } = pg;

const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL;
if (!SUPABASE_URL) throw new Error("SUPABASE_DATABASE_URL environment variable is required.");

export const pool = new Pool({
  connectionString: SUPABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function initDB() {
  logger.info("Initializing Supabase PostgreSQL schema…");

  await query(`
    CREATE TABLE IF NOT EXISTS images (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      url         TEXT NOT NULL,
      title       TEXT,
      category    TEXT NOT NULL DEFAULT 'Nature',
      destination TEXT NOT NULL DEFAULT 'landing'
                  CHECK (destination IN ('landing','dashboard','both')),
      type        TEXT NOT NULL DEFAULT 'wallpaper'
                  CHECK (type IN ('wallpaper','meme','tiktok')),
      tiktok_url  TEXT,
      thumbnail   TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           TEXT NOT NULL,
      email          TEXT NOT NULL UNIQUE,
      password       TEXT NOT NULL,
      suspended      BOOLEAN NOT NULL DEFAULT FALSE,
      tiktok_expiry  TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value JSONB
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
      email              TEXT,
      phone              TEXT,
      amount             NUMERIC(10,2) NOT NULL,
      currency           TEXT NOT NULL DEFAULT 'KES',
      description        TEXT NOT NULL DEFAULT '',
      order_tracking_id  TEXT,
      merchant_ref       TEXT,
      status             TEXT NOT NULL DEFAULT 'initiated'
                         CHECK (status IN ('initiated','completed','failed')),
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS social_links (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform   TEXT NOT NULL,
      url        TEXT NOT NULL,
      username   TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, platform)
    )
  `);

  logger.info("Schema ready.");
}
