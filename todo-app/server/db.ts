import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.DATABASE_URL ?? '')

export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS day_records (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      plan JSONB NOT NULL DEFAULT '[]'::jsonb,
      did JSONB NOT NULL DEFAULT '[]'::jsonb,
      note TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, date)
    )
  `
}

export interface UserRow {
  id: string
  email: string
  name: string | null
  password_hash: string
  created_at: string
}
