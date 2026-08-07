import { useMemo, useState } from 'react'
import { useTracker } from '../tracker'
import { fullDateLabel } from '../date'
import type { DayRecord } from '../types'

interface Match {
  kind: 'planned' | 'did' | 'note'
  text: string
}

interface Result {
  key: string
  day: DayRecord
  matches: Match[]
}

export default function SearchView() {
  const { days, openDay } = useTracker()
  const [q, setQ] = useState('')

  const results = useMemo<Result[]>(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    const out: Result[] = []
    for (const key of Object.keys(days).sort().reverse()) {
      const day = days[key]
      if (!day) continue
      const matches: Match[] = []
      for (const p of day.plan) if (p.text.toLowerCase().includes(needle)) matches.push({ kind: 'planned', text: p.text })
      for (const d of day.did) if (d.text.toLowerCase().includes(needle)) matches.push({ kind: 'did', text: d.text })
      if (day.note.toLowerCase().includes(needle)) matches.push({ kind: 'note', text: day.note })
      if (matches.length) out.push({ key, day, matches })
    }
    return out.slice(0, 60)
  }, [days, q])

  const totalHits = results.reduce((n, r) => n + r.matches.length, 0)

  return (
    <>
      <header className="masthead">
        <div>
          <p className="kicker">
            EPOCH <span aria-hidden="true">·</span> search
          </p>
          <h1>
            Find <em>anything</em>.
          </h1>
          <p className="subline">Every plan, every log, every note you’ve ever written.</p>
        </div>
      </header>

      <form
        className="add-form search-form"
        onSubmit={(e) => e.preventDefault()}
        role="search"
      >
        <label className="sr-only" htmlFor="search-input">
          Search your log
        </label>
        <input
          id="search-input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search plans, logs, and notes…"
          autoComplete="off"
          autoFocus
        />
      </form>

      {q.trim() && results.length === 0 && (
        <div className="empty small">
          <p className="empty-title">Nothing found.</p>
          <p className="empty-sub">Try a different word, or a #tag like “#code”.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          <p className="search-count mono">{results.length} days · {totalHits} matches</p>
          <ul className="search-list">
            {results.map((r) => (
              <li key={r.key}>
                <button type="button" className="search-item" onClick={() => openDay(r.key)}>
                  <span className="search-day">{fullDateLabel(r.key)}</span>
                  <span className="search-matches">
                    {r.matches.map((m, i) => (
                      <span className={`search-match kind-${m.kind}`} key={i}>
                        <b>{m.kind}</b>
                        {m.text}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!q.trim() && (
        <div className="empty small">
          <p className="empty-title">Type to search your log.</p>
          <p className="empty-sub">Search finds tasks, “did” entries, and evening notes.</p>
        </div>
      )}
    </>
  )
}
