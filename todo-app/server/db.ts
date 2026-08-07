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
}

export interface UserRow {
  id: string
  email: string
  name: string | null
  password_hash: string
  created_at: string
}
