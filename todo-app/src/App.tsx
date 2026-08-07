import { useEffect, useMemo, useRef, useState } from 'react'
import type { DayRecord } from './types'
import AuthScreen from './AuthScreen'
import TopNav from './components/TopNav'
import TodayView from './views/TodayView'
import Dashboard from './views/Dashboard'
import Analytics from './views/Analytics'
import Calendar from './views/Calendar'
import SearchView from './views/SearchView'
import SettingsView from './views/SettingsView'
import { TrackerContext } from './tracker'
import type { TrackerStats } from './tracker'
import { apiDeleteDays, apiGetDays, apiMe, apiPutDay, getToken, setToken } from './api'
import type { AuthUser, DayPayload } from './api'
import { useHashRoute } from './router'
import { computeStreak, hasContent } from './stats'
import { dateFromKey, diffDays, todayKey } from './date'

const STORAGE_PREFIX = 'epoch.days.v1'

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}.${userId}`
}

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

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [days, setDays] = useState<Record<string, DayRecord>>({})
  const [dateKey, setDateKey] = useState<string>(todayKey())
  const route = useHashRoute()

  const daysRef = useRef<Record<string, DayRecord>>({})
  const dirtyRef = useRef<Set<string>>(new Set())
  const syncTimer = useRef<number | undefined>(undefined)
  const userRef = useRef<AuthUser | null>(null)
  const syncMounted = useRef(false)

  useEffect(() => {
    userRef.current = user
  }, [user])

  /* ---------- auth bootstrap ---------- */
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setAuthLoading(false)
      return
    }
    apiMe()
      .then(({ user }) => {
        setUser(user)
        setAuthLoading(false)
      })
      .catch(() => {
        setToken(null)
        setAuthLoading(false)
      })
  }, [])

  /* ---------- cloud sync ---------- */
  useEffect(() => {
    if (syncMounted.current) return
    syncMounted.current = true
    const flush = () => void flushDirty()
    window.addEventListener('online', flush)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flushDirty()
    })
    return () => {
      window.removeEventListener('online', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  async function loadFromServer(u: AuthUser) {
    let merged: Record<string, DayRecord> = {}
    try {
      const { days: serverDays } = await apiGetDays()
      const local = loadDays(storageKey(u.id))
      if (Object.keys(serverDays).length === 0 && Object.keys(local).length > 0) {
        merged = local
        for (const day of Object.values(local)) {
          try {
            await apiPutDay(day as DayPayload)
          } catch {
            /* will be retried by dirty sync */
          }
        }
      } else {
        merged = serverDays as Record<string, DayRecord>
      }
    } catch {
      merged = loadDays(storageKey(u.id))
    }
    daysRef.current = merged
    setDays(merged)
  }

  async function flushDirty() {
    const u = userRef.current
    if (!u || !navigator.onLine || dirtyRef.current.size === 0) return
    const pending = [...dirtyRef.current]
    for (const key of pending) {
      const day = daysRef.current[key]
      if (!day) {
        dirtyRef.current.delete(key)
        continue
      }
      try {
        await apiPutDay(day as DayPayload)
        dirtyRef.current.delete(key)
      } catch {
        /* keep dirty, retry on next flush */
      }
    }
  }

  function scheduleSync() {
    window.clearTimeout(syncTimer.current)
    syncTimer.current = window.setTimeout(() => void flushDirty(), 700)
  }

  function setAllDays(next: Record<string, DayRecord>) {
    daysRef.current = next
    setDays(next)
  }

  function mutateDay(key: string, fn: (d: DayRecord) => DayRecord) {
    const next = { ...daysRef.current, [key]: fn(daysRef.current[key] ?? emptyDay(key)) }
    setAllDays(next)
    dirtyRef.current.add(key)
    scheduleSync()
  }

  function replaceDays(next: Record<string, DayRecord>) {
    setAllDays(next)
    dirtyRef.current = new Set(Object.keys(next))
    scheduleSync()
  }

  async function clearAllDays() {
    setAllDays({})
    dirtyRef.current.clear()
    try {
      await apiDeleteDays()
    } catch {
      /* ignore */
    }
    if (userRef.current) localStorage.removeItem(storageKey(userRef.current.id))
  }

  /* ---------- local mirror (backup for offline) ---------- */
  useEffect(() => {
    if (user) localStorage.setItem(storageKey(user.id), JSON.stringify(days))
  }, [days, user])

  /* ---------- auth handlers ---------- */
  function handleAuthed(next: AuthUser) {
    setUser(next)
    setDateKey(todayKey())
    void loadFromServer(next)
  }

  function handleLogout() {
    void flushDirty()
    setToken(null)
    setUser(null)
    setAllDays({})
  }

  function handleUserUpdate(next: AuthUser) {
    setUser(next)
  }

  function openDay(key: string) {
    setDateKey(key)
    route.navigate('today', key)
  }

  /* ---------- stats ---------- */
  const stats = useMemo<TrackerStats>(() => {
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

  /* ---------- routing ---------- */
  useEffect(() => {
    if (route.path === 'today' && route.param) setDateKey(route.param)
  }, [route.path, route.param])

  const ctx = useMemo(
    () => ({
      user: user!,
      days,
      mutateDay,
      replaceDays,
      clearAllDays,
      stats,
      openDay,
      navigate: route.navigate,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, days, stats, route.navigate],
  )

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
        <div className="user-bar">
          <span className="user-name" title={user.email}>
            {user.name ? `${user.name} · ${user.email}` : user.email}
          </span>
          <button type="button" className="sign-out" onClick={handleLogout}>
            sign out
          </button>
        </div>

        <TopNav current={route.path} navigate={route.navigate} />

        <TrackerContext.Provider value={ctx}>
          <main className="view">
            {route.path === 'today' && <TodayView dateKey={dateKey} setDateKey={setDateKey} />}
            {route.path === 'dashboard' && <Dashboard />}
            {route.path === 'analytics' && <Analytics />}
            {route.path === 'calendar' && <Calendar />}
            {route.path === 'search' && <SearchView />}
            {route.path === 'settings' && <SettingsView onUserUpdate={handleUserUpdate} onLogout={handleLogout} />}
          </main>
        </TrackerContext.Provider>
      </div>
    </div>
  )
}
