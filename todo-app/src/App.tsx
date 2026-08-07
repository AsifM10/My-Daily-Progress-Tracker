import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { DayRecord, LoggedItem, PlannedItem } from './types'
import AuthScreen from './AuthScreen'
import { apiMe, getToken, setToken } from './api'
import type { AuthUser } from './api'

const STORAGE_PREFIX = 'epoch.days.v1'
const HISTORY_WINDOW = 14

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}.${userId}`
}

/* ---------------- date helpers ---------------- */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

function todayKey(): string {
  return keyOf(new Date())
}

function fullDateLabel(key: string): string {
  return dateFromKey(key).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function relativeLabel(key: string): string {
  const diff = diffDays(dateFromKey(todayKey()), dateFromKey(key))
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  return `${diff} days ago`
}

/* ---------------- storage ---------------- */

function emptyDay(date: string): DayRecord {
  return { date, plan: [], did: [], note: '' }
}

function loadDays(key: string): Record<string, DayRecord> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, DayRecord>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function hasContent(d?: DayRecord): boolean {
  return (
    !!d &&
    (d.plan.length > 0 || d.did.length > 0 || d.note.trim().length > 0)
  )
}

function computeStreak(days: Record<string, DayRecord>): number {
  let cursor = new Date()
  if (!hasContent(days[keyOf(cursor)])) cursor = addDays(cursor, -1)
  let streak = 0
  while (hasContent(days[keyOf(cursor)])) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

/* ---------------- small components ---------------- */

function Arc({ ratio, done, total }: { ratio: number; done: number; total: number }) {
  const R = 22
  const C = 2 * Math.PI * R
  return (
    <div className="arc" role="img" aria-label={`${done} of ${total} planned tasks done today`}>
      <svg viewBox="0 0 56 56" aria-hidden="true">
        <circle className="arc-track" cx="28" cy="28" r={R} />
        <circle
          className="arc-fill"
          cx="28"
          cy="28"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ratio)}
        />
      </svg>
      <span className="arc-label">
        <b>{done}</b>
        <i>/ {total}</i>
      </span>
    </div>
  )
}

const CheckIcon = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 6.2 4.8 9 10 3" />
  </svg>
)

const PlusIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v12M2 8h12" />
  </svg>
)

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 5h10M6.5 5V3.5h3V5M4.5 5l.6 8h5.8l.6-8M6.8 7.2v3.6M9.2 7.2v3.6" />
  </svg>
)

/* ---------------- app ---------------- */

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [days, setDays] = useState<Record<string, DayRecord>>({})
  const [dateKey, setDateKey] = useState<string>(todayKey())
  const [planText, setPlanText] = useState('')
  const [didText, setDidText] = useState('')
  const flashTimer = useRef<number | undefined>(undefined)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setAuthLoading(false)
      return
    }
    apiMe()
      .then(({ user }) => {
        setUser(user)
        setDays(loadDays(storageKey(user.id)))
        setAuthLoading(false)
      })
      .catch(() => {
        setToken(null)
        setAuthLoading(false)
      })
  }, [])

  function handleAuthed(next: AuthUser) {
    setUser(next)
    setDateKey(todayKey())
    setDays(loadDays(storageKey(next.id)))
    setAuthLoading(false)
  }

  function handleLogout() {
    setToken(null)
    setUser(null)
    setDays({})
  }

  useEffect(() => {
    if (user) {
      localStorage.setItem(storageKey(user.id), JSON.stringify(days))
    }
  }, [days, user])

  const current = days[dateKey] ?? emptyDay(dateKey)
  const isToday = dateKey === todayKey()

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const planDone = current.plan.filter((p) => p.done).length
  const planTotal = current.plan.length
  const ratio = planTotal ? planDone / planTotal : 0

  const stats = useMemo(() => {
    const loggedKeys = Object.keys(days).filter((k) => hasContent(days[k]))
    const started =
      loggedKeys.length > 0
        ? Math.min(...loggedKeys.map((k) => dateFromKey(k).getTime()))
        : null
    const dayNumber = started ? diffDays(dateFromKey(dateKey), new Date(started)) + 1 : 1
    const allTimeDone = Object.values(days).reduce(
      (sum, d) => sum + d.plan.filter((p) => p.done).length,
      0,
    )
    return {
      dayNumber,
      daysLogged: loggedKeys.length,
      streak: computeStreak(days),
      allTimeDone,
    }
  }, [days, dateKey])

  function mutateDay(key: string, fn: (d: DayRecord) => DayRecord) {
    setDays((prev) => {
      const base = prev[key] ?? emptyDay(key)
      return { ...prev, [key]: fn(base) }
    })
  }

  function flashId(id: string) {
    setFlash(id)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 1100)
  }

  function addPlan(e: FormEvent) {
    e.preventDefault()
    const clean = planText.trim()
    if (!clean) return
    const item: PlannedItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: clean,
      done: false,
    }
    mutateDay(dateKey, (d) => ({ ...d, plan: [item, ...d.plan] }))
    setPlanText('')
    flashId(item.id)
  }

  function togglePlan(id: string) {
    mutateDay(dateKey, (d) => ({
      ...d,
      plan: d.plan.map((p) => (p.id === id ? { ...p, done: !p.done } : p)),
    }))
  }

  function removePlan(id: string) {
    mutateDay(dateKey, (d) => ({ ...d, plan: d.plan.filter((p) => p.id !== id) }))
  }

  function addDid(e: FormEvent) {
    e.preventDefault()
    const clean = didText.trim()
    if (!clean) return
    const item: LoggedItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: clean,
    }
    mutateDay(dateKey, (d) => ({ ...d, did: [item, ...d.did] }))
    setDidText('')
    flashId(item.id)
  }

  function removeDid(id: string) {
    mutateDay(dateKey, (d) => ({ ...d, did: d.did.filter((i) => i.id !== id) }))
  }

  function setNote(value: string) {
    mutateDay(dateKey, (d) => ({ ...d, note: value }))
  }

  const histStart = addDays(new Date(), -(HISTORY_WINDOW - 1))

  const history = useMemo(() => {
    const cells: { key: string; pct: number; logged: boolean }[] = []
    for (let i = 0; i < HISTORY_WINDOW; i++) {
      const key = keyOf(addDays(histStart, i))
      const day = days[key]
      const pct = day && day.plan.length > 0
        ? Math.round((day.plan.filter((p) => p.done).length / day.plan.length) * 100)
        : 0
      cells.push({ key, pct, logged: hasContent(day) })
    }
    return cells
  }, [days, histStart])

  const planLabel = isToday ? 'What I\u2019ll do today' : 'What I planned'
  const didLabel = isToday ? 'What I did' : 'What happened'

  if (authLoading) {
    return (
      <div className="app">
        <div className="auth-wrap">
          <div className="auth-card">
            <p className="kicker">
              EPOCH <span aria-hidden="true">·</span> self-training log
            </p>
            <h1>Loading…</h1>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app">
        <AuthScreen onAuthed={handleAuthed} />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="shell">
        <header className="masthead">
          <div>
            <p className="kicker">
              EPOCH <span aria-hidden="true">·</span> self-training log
            </p>
            <h1>
              Day <em>{stats.dayNumber}</em>
            </h1>
            <p className="subline">
              {fullDateLabel(dateKey)}
              {!isToday && (
                <>
                  {' '}
                  — <span className="rel">{relativeLabel(dateKey)}</span>
                </>
              )}
            </p>
          </div>
          <Arc ratio={ratio} done={planDone} total={planTotal} />
        </header>

        <div className="user-bar">
          <span className="user-name" title={user.email}>
            {user.name ? `${user.name} · ${user.email}` : user.email}
          </span>
          <button type="button" className="sign-out" onClick={handleLogout}>
            sign out
          </button>
        </div>

        <div className="stat-strip">
          <span className="chip">{stats.daysLogged} days logged</span>
          <span className="chip">
            streak <b className="ember">{stats.streak}</b>
          </span>
          <span className="chip">{stats.allTimeDone} done all-time</span>
        </div>

        <nav className="nav-day" aria-label="Change day">
          <button type="button" className="nav-btn" onClick={() => setDateKey(keyOf(addDays(dateFromKey(dateKey), -1)))}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
            Previous
          </button>
          {!isToday && (
            <button type="button" className="nav-btn is-today" onClick={() => setDateKey(todayKey())}>
              Back to today
            </button>
          )}
          <button
            type="button"
            className="nav-btn"
            disabled={isToday}
            onClick={() => setDateKey(keyOf(addDays(dateFromKey(dateKey), 1)))}
          >
            Next
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
          </button>
        </nav>

        <main className="blocks">
          <section className="block plan-block">
            <header className="block-head">
              <h2>{planLabel}</h2>
              {planTotal > 0 && (
                <span className="count">
                  {planDone}/{planTotal}
                </span>
              )}
            </header>

            <form className="add-form" onSubmit={addPlan}>
              <label className="sr-only" htmlFor="plan-input">
                {planLabel}
              </label>
              <input
                id="plan-input"
                type="text"
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                placeholder={isToday ? 'Write today\u2019s task…' : 'Add a task for this day…'}
                autoComplete="off"
                maxLength={160}
              />
              <button type="submit" className="add-btn" disabled={!planText.trim()}>
                <PlusIcon />
                Add
              </button>
            </form>

            <div className="rail-list">
              <div className="dayline" aria-hidden="true">
                <div className="dayline-track" />
                <div className="dayline-fill" style={{ height: `${ratio * 100}%` }}>
                  <span
                    className={`dayline-bead${planTotal > 0 && ratio === 1 ? ' is-full' : ''}`}
                  />
                </div>
              </div>

              {current.plan.length === 0 ? (
                <div className="empty small">
                  <p className="empty-title">No plan yet.</p>
                  <p className="empty-sub">
                    {isToday
                      ? 'Write your first task — Day 1 starts now.'
                      : 'You can still fill this day in.'}
                  </p>
                </div>
              ) : (
                <ul className="rows">
                  {current.plan.map((item) => (
                    <li
                      key={item.id}
                      className={`row${item.done ? ' is-done' : ''}${flash === item.id ? ' is-new' : ''}`}
                    >
                      <button
                        type="button"
                        className="node"
                        onClick={() => togglePlan(item.id)}
                        aria-pressed={item.done}
                        aria-label={item.done ? `Mark not done: ${item.text}` : `Mark done: ${item.text}`}
                      >
                        {item.done && <CheckIcon />}
                      </button>
                      <p className="row-text">{item.text}</p>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => removePlan(item.id)}
                        aria-label={`Delete ${item.text}`}
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="block">
            <header className="block-head">
              <h2>{didLabel}</h2>
              {current.did.length > 0 && <span className="count">{current.did.length}</span>}
            </header>

            <form className="add-form" onSubmit={addDid}>
              <label className="sr-only" htmlFor="did-input">
                {didLabel}
              </label>
              <input
                id="did-input"
                type="text"
                value={didText}
                onChange={(e) => setDidText(e.target.value)}
                placeholder="Log what you actually got done…"
                autoComplete="off"
                maxLength={160}
              />
              <button type="submit" className="add-btn ghost" disabled={!didText.trim()}>
                <PlusIcon />
                Log
              </button>
            </form>

            {current.did.length === 0 ? (
              <div className="empty small">
                <p className="empty-title">Nothing logged.</p>
                <p className="empty-sub">
                  {isToday
                    ? 'When the day is over, log what you actually got done.'
                    : 'Nothing recorded for this day.'}
                </p>
              </div>
            ) : (
              <ul className="rows did-rows">
                {current.did.map((item) => (
                  <li
                    key={item.id}
                    className={`row did-row${flash === item.id ? ' is-new' : ''}`}
                  >
                    <span className="did-node" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    <p className="row-text">{item.text}</p>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => removeDid(item.id)}
                      aria-label={`Delete ${item.text}`}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="block note-block">
            <header className="block-head">
              <h2>Evening note</h2>
              <span className="count hint">what did you learn?</span>
            </header>
            <textarea
              className="note-input"
              value={current.note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A line or two about what you learned, got stuck on, or want to revisit…"
              rows={3}
              maxLength={1000}
            />
          </section>
        </main>

        <section className="history">
          <header className="block-head">
            <h2>Last {HISTORY_WINDOW} days</h2>
            <span className="count hint">tap a day to open it</span>
          </header>
          <div className="hist-grid" role="group" aria-label="Day history">
            {history.map((cell) => (
              <button
                key={cell.key}
                type="button"
                className={`hist-cell${cell.key === dateKey ? ' is-active' : ''}${!cell.logged ? ' is-empty' : ''}`}
                onClick={() => setDateKey(cell.key)}
                aria-label={`${fullDateLabel(cell.key)} — ${cell.pct}% done`}
              >
                <span className="hist-bar-wrap">
                  <span className="hist-bar" style={{ height: `${cell.pct}%` }} />
                </span>
                <span className="hist-label">
                  {dateFromKey(cell.key).toLocaleDateString([], { weekday: 'narrow' })}
                </span>
              </button>
            ))}
          </div>
        </section>

        <footer className="foot mono">
          <span>epoch {stats.dayNumber}</span>
          <span aria-hidden="true">·</span>
          <span>{planDone}/{planTotal} today</span>
          <span aria-hidden="true">·</span>
          <span>{Math.round(ratio * 100)}%</span>
        </footer>
      </div>
    </div>
  )
}
