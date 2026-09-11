import { type ReactNode } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileHeader } from './MobileHeader'

export function MobileShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  if (!isMobile) return <>{children}</>
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <MobileHeader />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
      >
        {children}
      </main>
      <MobileBottomNav />
    </div>
  )
}
