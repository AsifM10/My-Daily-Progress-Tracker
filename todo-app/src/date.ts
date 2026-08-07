export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function keyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

export function todayKey(): string {
  return keyOf(new Date())
}

export function fullDateLabel(key: string): string {
  return dateFromKey(key).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function shortDateLabel(key: string): string {
  return dateFromKey(key).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

export function relativeLabel(key: string): string {
  const diff = diffDays(dateFromKey(todayKey()), dateFromKey(key))
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  return `${diff} days ago`
}
