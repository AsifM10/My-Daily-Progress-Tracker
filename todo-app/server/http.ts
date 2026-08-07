import type { VercelRequest, VercelResponse } from '@vercel/node'

export function send(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body)
}

export function readBody(req: VercelRequest): Record<string, unknown> {
  try {
    if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>
  } catch {
    // invalid JSON body
  }
  return {}
}

export function bearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

export function onlyPost(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' })
    return false
  }
  return true
}
