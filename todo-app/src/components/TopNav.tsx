import type { RoutePath } from '../router'

const ITEMS: { path: RoutePath; label: string }[] = [
  { path: 'dashboard', label: 'Dashboard' },
  { path: 'today', label: 'Today' },
  { path: 'calendar', label: 'Calendar' },
  { path: 'analytics', label: 'Analytics' },
  { path: 'search', label: 'Search' },
  { path: 'settings', label: 'Settings' },
]

interface Props {
  current: RoutePath
  navigate: (path: RoutePath, param?: string) => void
}

export default function TopNav({ current, navigate }: Props) {
  return (
    <nav className="topnav" aria-label="Main">
      {ITEMS.map((it) => (
        <button
          key={it.path}
          type="button"
          className={`topnav-item${current === it.path ? ' is-active' : ''}`}
          onClick={() => navigate(it.path)}
        >
          {it.label}
        </button>
      ))}
    </nav>
  )
}
