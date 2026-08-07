import type { SeriesPoint, HeatCell } from '../stats'
import { useTracker } from '../tracker'
import { shortDateLabel, fullDateLabel } from '../date'

function intensity(pct: number): number {
  if (pct === 0) return 0
  if (pct < 34) return 1
  if (pct < 67) return 2
  if (pct < 100) return 3
  return 4
}

export function CurveChart({ series, height = 120 }: { series: SeriesPoint[]; height?: number }) {
  const W = 100
  const H = 100
  const pad = 4
  if (series.length === 0) return null
  const n = series.length
  const pts = series.map((p, i) => {
    const x = pad + (i / (n - 1)) * (W - pad * 2)
    const y = H - pad - (p.pct / 100) * (H - pad * 2)
    return { x, y }
  })
  const line = pts.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `M${pts[0].x},${H} L${pts.map(({ x, y }) => `${x},${y}`).join(' L')} L${pts[n - 1].x},${H} Z`
  const last = pts[n - 1]

  return (
    <div className="curve-wrap">
      <svg
        className="curve"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height }}
        role="img"
        aria-label="Daily plan completion over recent days"
      >
        <line className="curve-baseline" x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} />
        <path className="curve-area" d={area} />
        <polyline className="curve-line" points={line} />
        <circle className="curve-dot" cx={last.x} cy={last.y} r="1.4" />
      </svg>
      <div className="curve-axis">
        <span>{shortDateLabel(series[0].key)}</span>
        <span>{shortDateLabel(series[n - 1].key)}</span>
      </div>
    </div>
  )
}

export function HeatmapGrid({ cols }: { cols: HeatCell[][] }) {
  const { openDay } = useTracker()
  return (
    <div className="heatmap" role="group" aria-label="Completion heatmap">
      <div className="heatmap-cols">
        {cols.map((col, wi) => (
          <div className="heat-col" key={wi}>
            {col.map((cell) => (
              <button
                key={cell.key}
                type="button"
                className={`heat-cell${cell.future ? ' is-future' : ''} lvl-${intensity(cell.pct)}`}
                onClick={() => openDay(cell.key)}
                aria-label={`${fullDateLabel(cell.key)} — ${cell.pct}% done`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heat-legend" aria-hidden="true">
        <span>less</span>
        <span className="heat-cell lvl-0" />
        <span className="heat-cell lvl-1" />
        <span className="heat-cell lvl-2" />
        <span className="heat-cell lvl-3" />
        <span className="heat-cell lvl-4" />
        <span>more</span>
      </div>
    </div>
  )
}

export function WeekdayBars({ items }: { items: { label: string; pct: number; days: number }[] }) {
  return (
    <div className="weekday-bars">
      {items.map((it) => (
        <div className="wd-row" key={it.label}>
          <span className="wd-label">{it.label}</span>
          <span className="wd-track">
            <span className="wd-fill" style={{ width: `${it.pct}%` }} />
          </span>
          <span className="wd-value">{it.days > 0 ? `${it.pct}%` : '–'}</span>
        </div>
      ))}
    </div>
  )
}

export function TagList({ items }: { items: { tag: string; done: number; total: number }[] }) {
  if (items.length === 0) {
    return (
      <p className="empty-sub tag-empty">
        No tagged tasks yet. Start a task with a #tag, like “#code finish login”.
      </p>
    )
  }
  return (
    <div className="tag-list">
      {items.map((it) => (
        <div className="tag-row" key={it.tag}>
          <span className="tag-chip">#{it.tag}</span>
          <span className="wd-track">
            <span className="wd-fill tag-fill" style={{ width: `${it.total ? Math.round((it.done / it.total) * 100) : 0}%` }} />
          </span>
          <span className="wd-value">
            {it.done}/{it.total}
          </span>
        </div>
      ))}
    </div>
  )
}
