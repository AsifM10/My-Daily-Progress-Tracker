export interface AuthUser {
  id: string
  email: string
  name: string | null
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

const TOKEN_KEY = 'epoch.token.v1'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(path: string, init: RequestInit = {}): Promise<any> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, { ...init, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((body && body.error) || 'Request failed')
  }
  return body
}

export function apiRegister(name: string, email: string, password: string): Promise<AuthResponse> {
  return request('/api/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function apiMe(): Promise<{ user: AuthUser }> {
  return request('/api/me')
}

export interface DayPayload {
  date: string
  plan: unknown[]
  did: unknown[]
  note: string
}

export function apiGetDays(): Promise<{ days: Record<string, DayPayload> }> {
  return request('/api/days')
}

export function apiPutDay(day: DayPayload): Promise<{ ok: boolean }> {
  return request('/api/days', {
    method: 'PUT',
    body: JSON.stringify(day),
  })
}

export function apiDeleteDays(): Promise<{ ok: boolean }> {
  return request('/api/days', { method: 'DELETE' })
}

export function apiUpdateProfile(input: {
  name?: string
  currentPassword?: string
  newPassword?: string
}): Promise<{ user: AuthUser }> {
  return request('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
