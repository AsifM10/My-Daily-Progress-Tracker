import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql, ensureSchema } from '../server/db.js'
import { verifyToken } from '../server/auth.js'
import { bearerToken, send } from '../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = bearerToken(req)
  const payload = token ? verifyToken(token) : null
  if (!payload) {
    send(res, 401, { error: 'Not authenticated' })
    return
  }

  try {
    await ensureSchema()
    const rows = await sql`SELECT id, email, name FROM users WHERE id = ${payload.sub}`
    const user = rows[0]
    if (!user) {
      send(res, 401, { error: 'Account no longer exists' })
      return
    }
    send(res, 200, { user })
  } catch (err) {
    console.error('me error:', err)
    send(res, 500, { error: 'Something went wrong. Please try again.' })
  }
}
