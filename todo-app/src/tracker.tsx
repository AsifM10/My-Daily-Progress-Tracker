import { createContext, useContext } from 'react'
import type { DayRecord } from './types'
import type { AuthUser } from './api'
import type { RoutePath } from './router'

export interface TrackerStats {
  dayNumber: number
  daysLogged: number
  streak: number
  allTimeDone: number
}

export interface TrackerCtx {
  user: AuthUser
  days: Record<string, DayRecord>
  mutateDay: (key: string, fn: (d: DayRecord) => DayRecord) => void
  replaceDays: (next: Record<string, DayRecord>) => void
  clearAllDays: () => Promise<void>
  stats: TrackerStats
  openDay: (key: string) => void
  navigate: (path: RoutePath, param?: string) => void
}

export const TrackerContext = createContext<TrackerCtx | null>(null)

export function useTracker(): TrackerCtx {
  const ctx = useContext(TrackerContext)
  if (!ctx) throw new Error('useTracker must be used within TrackerProvider')
  return ctx
}
