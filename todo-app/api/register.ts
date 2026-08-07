import { randomUUID } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql, ensureSchema } from '../server/db.js'
import { hashPassword, signToken } from '../server/auth.js'
import { onlyPost, readBody, send } from '../server/http.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!onlyPost(req, res)) return

  const body = readBody(req)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : ''

  if (!email || !EMAIL_RE.test(email)) {
    send(res, 400, { error: 'Please enter a valid email address' })
    return
  }
  if (password.length < 8) {
    send(res, 400, { error: 'Password must be at least 8 characters' })
    return
  }

  try {
    await ensureSchema()

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      send(res, 409, { error: 'An account with this email already exists' })
      return
    }

    const passwordHash = await hashPassword(password)
    const id = randomUUID()
    await sql`
      INSERT INTO users (id, email, name, password_hash)
      VALUES (${id}, ${email}, ${name || null}, ${passwordHash})
    `

    const token = signToken({ sub: id, email })
    send(res, 201, { token, user: { id, email, name: name || null } })
  } catch (err) {
    console.error('register error:', err)
    send(res, 500, { error: 'Something went wrong. Please try again.' })
  }
}
