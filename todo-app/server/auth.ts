import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export interface TokenPayload {
  sub: string
  email: string
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET ?? '', { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as TokenPayload
    return typeof payload.sub === 'string' ? payload : null
  } catch {
    return null
  }
}
