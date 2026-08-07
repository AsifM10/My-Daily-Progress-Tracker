import type { DayRecord } from './types'
import { addDays, dateFromKey, keyOf, todayKey } from './date'

export function hasContent(d?: DayRecord): boolean {
  return !!d && (d.plan.length > 0 || d.did.length > 0 || d.note.trim().length > 0)
}

export function longestStreak(days: Record<string, DayRecord>): number {
  const times = Object.keys(days)
    .filter((k) => hasContent(days[k]))
    .map((k) => dateFromKey(k).getTime())
    .sort((a, b) => a - b)
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const t of times) {
    run = prev === null || t - prev === 86_400_000 ? run + 1 : 1
    prev = t
    if (run > best) best = run
  }
  return best
}

export function computeStreak(days: Record<string, DayRecord>): number {
  let cursor = new Date()
  if (!hasContent(days[keyOf(cursor)])) cursor = addDays(cursor, -1)
  let streak = 0
  while (hasContent(days[keyOf(cursor)])) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function dayPct(d?: DayRecord): number {
  if (!d || d.plan.length === 0) return 0
  return Math.round((d.plan.filter((p) => p.done).length / d.plan.length) * 100)
}

export interface SeriesPoint {
  key: string
  pct: number
}

export function completionSeries(days: Record<string, DayRecord>, n: number): SeriesPoint[] {
  const out: SeriesPoint[] = []
  const start = addDays(new Date(), -(n - 1))
  for (let i = 0; i < n; i++) {
    const key = keyOf(addDays(start, i))
    out.push({ key, pct: dayPct(days[key]) })
  }
  return out
}

export interface WeekdayPerf {
  label: string
  pct: number
  days: number
}

export function weekdayPerformance(days: Record<string, DayRecord>): WeekdayPerf[] {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const sums = new Array(7).fill(0)
  const counts = new Array(7).fill(0)
  for (const day of Object.values(days)) {
    if (day.plan.length === 0) continue
    const dow = dateFromKey(day.date).getDay()
    sums[dow] += day.plan.filter((p) => p.done).length / day.plan.length
    counts[dow] += 1
  }
  return labels.map((label, i) => ({
    label,
    pct: counts[i] ? Math.round((sums[i] / counts[i]) * 100) : 0,
    days: counts[i],
  }))
}

export interface TagStat {
  tag: string
  done: number
  total: number
}

export function tagBreakdown(days: Record<string, DayRecord>): TagStat[] {
  const map = new Map<string, { done: number; total: number }>()
  for (const day of Object.values(days)) {
    for (const p of day.plan) {
      if (!p.tag) continue
      const cur = map.get(p.tag) ?? { done: 0, total: 0 }
      cur.total += 1
      if (p.done) cur.done += 1
      map.set(p.tag, cur)
    }
  }
  return [...map.entries()]
    .map(([tag, v]) => ({ tag, ...v }))
    .sort((a, b) => b.total - a.total)
}

export interface HeatCell {
  key: string
  pct: number
  logged: boolean
  future: boolean
}

/** GitHub-style grid. Outer array = weeks (columns), inner = 7 days starting Sunday. */
export function heatmap(days: Record<string, DayRecord>, weeks = 26): HeatCell[][] {
  const end = todayKey()
  const startKey = keyOf(addDays(dateFromKey(end), -(weeks * 7 - 1)))
  let cursor = dateFromKey(startKey)
  while (cursor.getDay() !== 0) cursor = addDays(cursor, -1)

  const cols: HeatCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = []
    for (let r = 0; r < 7; r++) {
      const key = keyOf(cursor)
      const day = days[key]
      col.push({
        key,
        pct: dayPct(day),
        logged: hasContent(day),
        future: key > end,
      })
      cursor = addDays(cursor, 1)
    }
    cols.push(col)
  }
  return cols
}

export function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const cells: (string | null)[] = []
  const lead = first.getDay()
  for (let i = 0; i < lead; i++) cells.push(null)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) cells.push(keyOf(new Date(year, month, d)))
  return cells
}
