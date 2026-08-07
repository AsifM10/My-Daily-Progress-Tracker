import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql, ensureSchema } from '../server/db.js'
import { verifyToken } from '../server/auth.js'
import { bearerToken, readBody, send } from '../server/http.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

interface DayPayload {
  date: string
  plan: unknown[]
  did: unknown[]
  note: string
}

function isDay(v: unknown): v is DayPayload {
  if (!v || typeof v !== 'object') return false
  const d = v as Record<string, unknown>
  return (
    typeof d.date === 'string' &&
    DATE_RE.test(d.date) &&
    Array.isArray(d.plan) &&
    Array.isArray(d.did) &&
    typeof d.note === 'string'
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = bearerToken(req)
  const payload = token ? verifyToken(token) : null
  if (!payload) {
    send(res, 401, { error: 'Not authenticated' })
    return
  }

  try {
    await ensureSchema()

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT date, plan, did, note FROM day_records WHERE user_id = ${payload.sub}
      `
      const days: Record<string, unknown> = {}
      for (const row of rows) {
        days[row.date] = { date: row.date, plan: row.plan, did: row.did, note: row.note }
      }
      send(res, 200, { days })
      return
    }

    if (req.method === 'PUT') {
      const body = readBody(req)
      if (!isDay(body)) {
        send(res, 400, { error: 'Invalid day payload' })
        return
      }
      await sql`
        INSERT INTO day_records (user_id, date, plan, did, note)
        VALUES (
          ${payload.sub},
          ${body.date},
          ${JSON.stringify(body.plan)}::jsonb,
          ${JSON.stringify(body.did)}::jsonb,
          ${body.note}
        )
        ON CONFLICT (user_id, date) DO UPDATE SET
          plan = EXCLUDED.plan,
          did = EXCLUDED.did,
          note = EXCLUDED.note,
          updated_at = now()
      `
      send(res, 200, { ok: true })
      return
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM day_records WHERE user_id = ${payload.sub}`
      send(res, 200, { ok: true })
      return
    }

    send(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('days error:', err)
    send(res, 500, { error: 'Something went wrong. Please try again.' })
  }
}
