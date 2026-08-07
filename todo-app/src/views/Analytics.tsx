import { useMemo } from 'react'
import { useTracker } from '../tracker'
import { hasContent, heatmap, longestStreak, tagBreakdown, weekdayPerformance } from '../stats'
import { HeatmapGrid, TagList, WeekdayBars } from '../components/Charts'

export default function Analytics() {
  const { days, stats } = useTracker()

  const heat = useMemo(() => heatmap(days, 26), [days])
  const weekday = useMemo(() => weekdayPerformance(days), [days])
  const tags = useMemo(() => tagBreakdown(days), [days])
  const best = useMemo(() => longestStreak(days), [days])

  const avgWeek = useMemo(() => {
    const weeks = Math.max(1, Math.ceil(stats.daysLogged / 7))
    return Math.round((stats.allTimeDone / weeks) * 10) / 10
  }, [stats])

  const today = days[Object.keys(days).filter((k) => hasContent(days[k])).sort().reverse()[0] ?? '']

  return (
    <>
      <header className="masthead">
        <div>
          <p className="kicker">
            EPOCH <span aria-hidden="true">·</span> analytics
          </p>
          <h1>
            The <em>data</em>.
          </h1>
          <p className="subline">Your training log, read back to you.</p>
        </div>
      </header>

      <div className="stat-strip">
        <span className="chip">
          best streak <b className="ember">{best}</b>
        </span>
        <span className="chip">{stats.daysLogged} days logged</span>
        <span className="chip">{stats.allTimeDone} tasks done</span>
        <span className="chip">{avgWeek} done / week</span>
      </div>

      <section className="block">
        <header className="block-head">
          <h2>Every day, logged</h2>
          <span className="count hint">last 6 months</span>
        </header>
        <HeatmapGrid cols={heat} />
      </section>

      <div className="dash-grid">
        <section className="block">
          <header className="block-head">
            <h2>By weekday</h2>
            <span className="count hint">avg completion</span>
          </header>
          <WeekdayBars items={weekday} />
        </section>

        <section className="block">
          <header className="block-head">
            <h2>By tag</h2>
            <span className="count hint">done / planned</span>
          </header>
          <TagList items={tags} />
        </section>
      </div>

      {today && (
        <section className="block">
          <header className="block-head">
            <h2>Latest entry</h2>
            <span className="count hint">{today.date}</span>
          </header>
          <p className="latest-note">{today.note.trim() || 'No evening note left on this day.'}</p>
        </section>
      )}

      <footer className="foot mono">
        <span>epoch {stats.dayNumber}</span>
        <span aria-hidden="true">·</span>
        <span>streak {stats.streak}</span>
      </footer>
    </>
  )
}
