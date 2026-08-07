import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiLogin, apiRegister, setToken } from './api'
import type { AuthUser } from './api'

type Mode = 'login' | 'register'

interface Props {
  onAuthed: (user: AuthUser) => void
}

export default function AuthScreen({ onAuthed }: Props) {
  const [mode, setMode] = useState<Mode>('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setBusy(true)
    try {
      const res =
        mode === 'register'
          ? await apiRegister(name.trim(), email.trim(), password)
          : await apiLogin(email.trim(), password)
      setToken(res.token)
      onAuthed(res.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="kicker">
          EPOCH <span aria-hidden="true">·</span> self-training log
        </p>
        <h1>{isRegister ? 'Start your log' : 'Welcome back'}</h1>
        <p className="subline">
          {isRegister
            ? 'Create an account to begin tracking your days.'
            : 'Log in to continue your training streak.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="field">
              <label className="field-label" htmlFor="auth-name">
                Name <span className="optional">(optional)</span>
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How should we call you?"
                autoComplete="name"
                maxLength={60}
              />
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {isRegister && (
            <div className="field">
              <label className="field-label" htmlFor="auth-confirm">
                Confirm password
              </label>
              <input
                id="auth-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="add-btn auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to EPOCH?'}{' '}
          <button type="button" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
            {isRegister ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  )
}
