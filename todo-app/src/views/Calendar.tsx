import { useState } from 'react'
import { useTracker } from '../tracker'
import { dayPct, hasContent, monthCells } from '../stats'
import { dateFromKey, fullDateLabel, todayKey } from '../date'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function Calendar() {
  const { days, openDay } = useTracker()
  const now = new Date()
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const cells = monthCells(ym.year, ym.month)
  const today = todayKey()

  const active = cells.filter((k) => k && hasContent(days[k])).length
  const doneDays = cells.filter((k) => k && days[k] && days[k].plan.length > 0 && dayPct(days[k]) === 100).length
  const totalDays = cells.filter((k) => k && days[k] && days[k].plan.length > 0).length
  const avgPct = totalDays ? Math.round((doneDays / totalDays) * 100) : 0

  const monthLabel = new Date(ym.year, ym.month, 1).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  })

  function shift(delta: number) {
    const d = new Date(ym.year, ym.month + delta, 1)
    setYm({ year: d.getFullYear(), month: d.getMonth() })
  }

  return (
    <>
      <header className="masthead">
        <div>
          <p className="kicker">
            EPOCH <span aria-hidden="true">·</span> calendar
          </p>
          <h1>
            <em>{monthLabel}</em>
          </h1>
          <p className="subline">
            {active} days active · {doneDays}/{totalDays || 0} full days
            {totalDays > 0 && <> · {avgPct}% completion</>}
          </p>
        </div>
        <div className="cal-nav">
          <button type="button" className="nav-btn" onClick={() => shift(-1)} aria-label="Previous month">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
          </button>
          <button type="button" className="nav-btn" onClick={() => shift(1)} aria-label="Next month">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
          </button>
        </div>
      </header>

      <div className="calendar">
        <div className="cal-dow" aria-hidden="true">
          {DOW.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((key, i) =>
            key === null ? (
              <span key={`pad-${i}`} className="cal-pad" />
            ) : (
              <button
                key={key}
                type="button"
                className={`cal-cell${key === today ? ' is-today' : ''}${hasContent(days[key]) ? ' is-logged' : ''}`}
                onClick={() => openDay(key)}
                aria-label={`${fullDateLabel(key)} — ${dayPct(days[key])}% done`}
              >
                <span className="cal-fill" style={{ height: `${dayPct(days[key])}%` }} />
                <span className="cal-num">{dateFromKey(key).getDate()}</span>
              </button>
            ),
          )}
        </div>
      </div>

      <footer className="foot mono">
        <span>{monthLabel}</span>
        <span aria-hidden="true">·</span>
        <span>tap any day to open it</span>
      </footer>
    </>
  )
}
