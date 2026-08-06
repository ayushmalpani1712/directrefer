import { useApp } from '@/context/AppContext'

/** Returns the real data-loading state from AppContext. */
export function usePageLoading(_ms?: number) {
  const { loading } = useApp()
  return loading
}
