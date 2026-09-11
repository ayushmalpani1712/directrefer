import { useLocation, useNavigate } from 'react-router'
import { ChevronLeft, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'

const ROOT_PATHS = ['/', '/login', '/signup', '/auth']

export function MobileHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { unreadNotificationCount } = useApp()
  const isRoot = ROOT_PATHS.some((p) => pathname === p)
  const isSubPage = !isRoot && pathname.split('/').filter(Boolean).length > 2

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-30 flex h-12 items-center justify-between px-3',
        'border-b border-border/50 bg-background/95 backdrop-blur-lg'
      )}
    >
      <div className="flex items-center gap-2">
        {isSubPage ? (
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors active:bg-muted"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="text-base font-semibold tracking-tight text-foreground">DirectRefer</span>
        )}
      </div>

      <button
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors active:bg-muted"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadNotificationCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </button>
    </header>
  )
}
