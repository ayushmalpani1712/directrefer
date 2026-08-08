import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'

/** Returns loading state with a minimum display duration so skeletons are visible. */
export function usePageLoading(ms = 400) {
  const { loading } = useApp()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setReady(true), ms)
      return () => clearTimeout(t)
    }
    setReady(false)
  }, [loading, ms])

  return !ready
}
