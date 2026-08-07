import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { DayRecord, LoggedItem, PlannedItem } from '../types'
import { useTracker } from '../tracker'
import { addDays, dateFromKey, fullDateLabel, keyOf, relativeLabel, todayKey } from '../date'

const HISTORY_WINDOW = 14

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function parseTag(text: string): { text: string; tag: string | null } {
  const m = text.match(/^#(\S+)\s+([\s\S]+)$/)
  if (m && m[2].trim()) return { text: m[2].trim(), tag: m[1].toLowerCase() }
  return { text, tag: null }
}

function emptyDay(date: string): DayRecord {
  return { date, plan: [], did: [], note: '' }
}

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

interface Props {
  dateKey: string
  setDateKey: (key: string) => void
}

export default function TodayView({ dateKey, setDateKey }: Props) {
  const { days, mutateDay, stats } = useTracker()
  const [planText, setPlanText] = useState('')
  const [didText, setDidText] = useState('')
  const flashTimer = useRef<number | undefined>(undefined)
  const [flash, setFlash] = useState<string | null>(null)

  const current = days[dateKey] ?? emptyDay(dateKey)
  const isToday = dateKey === todayKey()

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  /* ---------- recurring task auto-seed ---------- */
  useEffect(() => {
    if (!isToday) return
    const day = days[dateKey]
    if (!day || day.plan.length > 0) return
    const recurring: PlannedItem[] = []
    const seen = new Set<string>()
    const now = new Date()
    for (let back = 1; back <= 14; back++) {
      const k = keyOf(addDays(now, -back))
      const d = days[k]
      if (!d) continue
      for (const p of d.plan) {
        if (!p.recur || seen.has(p.text.toLowerCase())) continue
        if (p.recur === 'weekly' && dateFromKey(k).getDay() !== now.getDay()) continue
        seen.add(p.text.toLowerCase())
        recurring.push({ ...p, id: genId(), done: false, recur: p.recur })
      }
    }
    if (recurring.length > 0) {
      mutateDay(dateKey, (d) => ({ ...d, plan: [...recurring, ...d.plan] }))
    }
  }, [dateKey, days, isToday, mutateDay])

  const planDone = current.plan.filter((p) => p.done).length
  const planTotal = current.plan.length
  const ratio = planTotal ? planDone / planTotal : 0

  const history = useMemo(() => {
    const histStart = addDays(new Date(), -(HISTORY_WINDOW - 1))
    const cells: { key: string; pct: number; logged: boolean }[] = []
    for (let i = 0; i < HISTORY_WINDOW; i++) {
      const key = keyOf(addDays(histStart, i))
      const day = days[key]
      const pct = day && day.plan.length > 0
        ? Math.round((day.plan.filter((p) => p.done).length / day.plan.length) * 100)
        : 0
      cells.push({ key, pct, logged: !!day && (day.plan.length > 0 || day.did.length > 0 || day.note.trim().length > 0) })
    }
    return cells
  }, [days])

  function flashId(id: string) {
    setFlash(id)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 1100)
  }

  function addPlan(e: FormEvent) {
    e.preventDefault()
    const { text, tag } = parseTag(planText)
    if (!text) return
    const item: PlannedItem = { id: genId(), text, done: false, recur: null, tag }
    mutateDay(dateKey, (d) => ({ ...d, plan: [item, ...d.plan] }))
    setPlanText('')
    flashId(item.id)
  }

  function addDid(e: FormEvent) {
    e.preventDefault()
    const { text, tag } = parseTag(didText)
    if (!text) return
    const item: LoggedItem = { id: genId(), text, tag }
    mutateDay(dateKey, (d) => ({ ...d, did: [item, ...d.did] }))
    setDidText('')
    flashId(item.id)
  }

  function togglePlan(id: string) {
    mutateDay(dateKey, (d) => ({
      ...d,
      plan: d.plan.map((p) => (p.id === id ? { ...p, done: !p.done } : p)),
    }))
  }

  function cycleRecur(id: string) {
    mutateDay(dateKey, (d) => ({
      ...d,
      plan: d.plan.map((p) =>
        p.id === id ? { ...p, recur: p.recur === null ? 'daily' : p.recur === 'daily' ? 'weekly' : null } : p,
      ),
    }))
  }

  function removePlan(id: string) {
    mutateDay(dateKey, (d) => ({ ...d, plan: d.plan.filter((p) => p.id !== id) }))
  }

  function removeDid(id: string) {
    mutateDay(dateKey, (d) => ({ ...d, did: d.did.filter((i) => i.id !== id) }))
  }

  function setNote(value: string) {
    mutateDay(dateKey, (d) => ({ ...d, note: value }))
  }

  const planLabel = isToday ? 'What I\u2019ll do today' : 'What I planned'
  const didLabel = isToday ? 'What I did' : 'What happened'

  return (
    <>
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
              placeholder={isToday ? 'Write today\u2019s task… (#tag optional)' : 'Add a task for this day…'}
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
                <span className={`dayline-bead${planTotal > 0 && ratio === 1 ? ' is-full' : ''}`} />
              </div>
            </div>

            {current.plan.length === 0 ? (
              <div className="empty small">
                <p className="empty-title">No plan yet.</p>
                <p className="empty-sub">
                  {isToday
                    ? 'Write your first task — Day 1 starts now. Recurring tasks appear here each morning.'
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
                    <div className="row-main">
                      <p className="row-text">{item.text}</p>
                      {item.tag && <span className="tag-chip">#{item.tag}</span>}
                    </div>
                    <button
                      type="button"
                      className={`recur-btn${item.recur ? ' is-on' : ''}`}
                      onClick={() => cycleRecur(item.id)}
                      title={
                        item.recur === 'daily'
                          ? 'Repeats every day'
                          : item.recur === 'weekly'
                            ? `Repeats every ${dateFromKey(dateKey).toLocaleDateString([], { weekday: 'long' })}`
                            : 'Does not repeat — tap to repeat daily'
                      }
                      aria-label={
                        item.recur === 'daily'
                          ? 'Repeats daily'
                          : item.recur === 'weekly'
                            ? 'Repeats weekly'
                            : 'No repeat'
                      }
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.6M13 2v3h-3" /></svg>
                    </button>
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
                <li key={item.id} className={`row did-row${flash === item.id ? ' is-new' : ''}`}>
                  <span className="did-node" aria-hidden="true">
                    <CheckIcon />
                  </span>
                  <div className="row-main">
                    <p className="row-text">{item.text}</p>
                    {item.tag && <span className="tag-chip">#{item.tag}</span>}
                  </div>
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
    </>
  )
}
