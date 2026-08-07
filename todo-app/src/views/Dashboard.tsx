import { useMemo } from 'react'
import { useTracker } from '../tracker'
import { completionSeries, hasContent, weekdayPerformance } from '../stats'
import { addDays, dateFromKey, keyOf, todayKey } from '../date'
import { CurveChart, WeekdayBars } from '../components/Charts'

export default function Dashboard() {
  const { days, stats, user, navigate, openDay } = useTracker()

  const hasAny = useMemo(() => Object.values(days).some(hasContent), [days])

  const series = useMemo(() => completionSeries(days, 30), [days])
  const weekday = useMemo(() => weekdayPerformance(days), [days])

  const tKey = todayKey()
  const today = days[tKey]
  const openTasks = (today?.plan ?? []).filter((p) => !p.done)
  const todayDone = (today?.plan ?? []).filter((p) => p.done).length
  const todayTotal = (today?.plan ?? []).length

  const weekLogged = useMemo(() => {
    const now = new Date()
    const monday = addDays(now, -(now.getDay() === 0 ? 6 : now.getDay() - 1))
    let count = 0
    for (let i = 0; i < 7; i++) {
      if (hasContent(days[keyOf(addDays(monday, i))])) count += 1
    }
    return count
  }, [days])

  if (!hasAny) {
    return (
      <div className="onboard">
        <p className="kicker">
          EPOCH <span aria-hidden="true">·</span> self-training log
        </p>
        <h1 className="onboard-title">
          Every day is one <em>epoch</em>.
        </h1>
        <p className="onboard-sub">
          Plan what you’ll do. Log what you actually did. Watch the curve rise.
          Your log is saved to the cloud, so it follows you on any device.
        </p>
        <div className="onboard-actions">
          <button type="button" className="add-btn" onClick={() => navigate('today')}>
            Start day 1
          </button>
          <button type="button" className="nav-btn" onClick={() => navigate('analytics')}>
            How it works
          </button>
        </div>
        <p className="onboard-hint mono">
          logged in as {user.email}
        </p>
      </div>
    )
  }

  return (
    <>
      <header className="masthead dash-head">
        <div>
          <p className="kicker">
            EPOCH <span aria-hidden="true">·</span> overview
          </p>
          <h1>
            {user.name ? `Hey, ${user.name.split(' ')[0]}` : 'Hey there'}
            <em>.</em>
          </h1>
          <p className="subline">
            Day {stats.dayNumber} — your {stats.streak}-day streak is alive.
          </p>
        </div>
        <div className="dash-arc">
          <b>{todayDone}/{todayTotal}</b>
          <i>today</i>
        </div>
      </header>

      <div className="stat-strip">
        <span className="chip">
          streak <b className="ember">{stats.streak}</b>
        </span>
        <span className="chip">{stats.daysLogged} days logged</span>
        <span className="chip">{weekLogged}/7 days this week</span>
        <span className="chip">{stats.allTimeDone} done all-time</span>
      </div>

      <section className="block">
        <header className="block-head">
          <h2>The curve — last 30 days</h2>
          <span className="count hint">daily plan completion</span>
        </header>
        <CurveChart series={series} />
      </section>

      <div className="dash-grid">
        <section className="block">
          <header className="block-head">
            <h2>Today</h2>
            <span className="count hint">{todayTotal} planned</span>
          </header>
          {openTasks.length === 0 && todayTotal === 0 ? (
            <div className="empty small">
              <p className="empty-title">No plan for today yet.</p>
              <p className="empty-sub">
                Recurring tasks will appear here each morning.
              </p>
            </div>
          ) : openTasks.length === 0 ? (
            <div className="empty small">
              <p className="empty-title">All planned tasks done.</p>
              <p className="empty-sub">Solid work. Log what you got done.</p>
            </div>
          ) : (
            <ul className="rows mini-rows">
              {openTasks.map((t) => (
                <li className="row mini-row" key={t.id}>
                  <span className="mini-node" aria-hidden="true" />
                  <p className="row-text">{t.text}</p>
                  {t.tag && <span className="tag-chip">#{t.tag}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="dash-actions">
            <button type="button" className="add-btn ghost small" onClick={() => openDay(tKey)}>
              Open today
            </button>
          </div>
        </section>

        <section className="block">
          <header className="block-head">
            <h2>Best days</h2>
            <span className="count hint">avg completion</span>
          </header>
          <WeekdayBars items={weekday} />
        </section>
      </div>

      <footer className="foot mono">
        <span>epoch {stats.dayNumber}</span>
        <span aria-hidden="true">·</span>
        <span>{dateFromKey(tKey).toLocaleDateString([], { weekday: 'long' })}</span>
      </footer>
    </>
  )
}
