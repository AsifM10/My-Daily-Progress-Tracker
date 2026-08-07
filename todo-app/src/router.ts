import { useEffect, useState } from 'react'

export type RoutePath = 'today' | 'dashboard' | 'analytics' | 'calendar' | 'search' | 'settings'

export interface Route {
  path: RoutePath
  param?: string
  navigate: (path: RoutePath, param?: string) => void
}

function parseHash(): Pick<Route, 'path' | 'param'> {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path, param] = raw.split('/')
  const known: RoutePath[] = ['today', 'dashboard', 'analytics', 'calendar', 'search', 'settings']
  return {
    path: known.includes(path as RoutePath) ? (path as RoutePath) : 'today',
    param,
  }
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  function navigate(path: RoutePath, param?: string) {
    window.location.hash = `/${path}${param ? `/${param}` : ''}`
  }

  return { ...route, navigate }
}
