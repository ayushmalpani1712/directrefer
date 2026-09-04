import { lazy, Suspense } from 'react'

const LazyCommandPaletteInner = lazy(() => import('./CommandPaletteInner'))

export function LazyCommandPalette() {
  return (
    <Suspense fallback={null}>
      <LazyCommandPaletteInner />
    </Suspense>
  )
}
