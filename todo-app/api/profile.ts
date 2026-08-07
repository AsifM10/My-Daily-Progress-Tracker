import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql, ensureSchema } from '../server/db.js'
import { hashPassword, verifyPassword, verifyToken } from '../server/auth.js'
import { bearerToken, send } from '../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = bearerToken(req)
  const payload = token ? verifyToken(token) : null
  if (!payload) {
    send(res, 401, { error: 'Not authenticated' })
    return
  }
  if (req.method !== 'PATCH') {
    send(res, 405, { error: 'Method not allowed' })
    return
  }

  const body = req.body ?? {}

  try {
    await ensureSchema()

    if (typeof body.name === 'string') {
      const name = body.name.trim().slice(0, 60)
      await sql`UPDATE users SET name = ${name || null} WHERE id = ${payload.sub}`
    }

    if (typeof body.currentPassword === 'string' || typeof body.newPassword === 'string') {
      const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
      if (newPassword.length < 8) {
        send(res, 400, { error: 'New password must be at least 8 characters' })
        return
      }
      const rows = await sql`SELECT password_hash FROM users WHERE id = ${payload.sub}`
      const user = rows[0]
      if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
        send(res, 401, { error: 'Current password is incorrect' })
        return
      }
      const hash = await hashPassword(newPassword)
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${payload.sub}`
    }

    const me = await sql`SELECT id, email, name FROM users WHERE id = ${payload.sub}`
    const u = me[0]
    send(res, 200, { user: { id: u.id, email: u.email, name: u.name } })
  } catch (err) {
    console.error('profile error:', err)
    send(res, 500, { error: 'Something went wrong. Please try again.' })
  }
}
