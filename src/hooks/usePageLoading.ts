import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

/** Simulates a brief data fetch so pages can show premium skeleton loading. */
export function usePageLoading(ms = 550) {
  const { pathname } = useLocation()
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
  }, [pathname, ms])
  return loading
}
