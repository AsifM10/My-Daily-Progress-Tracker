import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql, ensureSchema } from '../server/db'
import { signToken, verifyPassword } from '../server/auth'
import { onlyPost, readBody, send } from '../server/http'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!onlyPost(req, res)) return

  const body = readBody(req)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    send(res, 400, { error: 'Email and password are required' })
    return
  }

  try {
    await ensureSchema()

    const rows = await sql`SELECT * FROM users WHERE email = ${email}`
    const user = rows[0]
    if (!user) {
      send(res, 401, { error: 'Invalid email or password' })
      return
    }

    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) {
      send(res, 401, { error: 'Invalid email or password' })
      return
    }

    const token = signToken({ sub: user.id, email: user.email })
    send(res, 200, { token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    console.error('login error:', err)
    send(res, 500, { error: 'Something went wrong. Please try again.' })
  }
}
