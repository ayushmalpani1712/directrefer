import { useLocation, useNavigate } from 'react-router'
import { LayoutDashboard, Search, FileText, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { ROLE_ROUTE, getRoleFromPath } from '@/data/constants'

const TABS = [
  { key: 'home', label: 'Home', icon: LayoutDashboard },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'referrals', label: 'Referrals', icon: FileText },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'profile', label: 'Profile', icon: User },
]

export function MobileBottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { role, requests, conversations } = useApp()
  const { user } = useAuth()
  if (!user) return null
  const urlRole = getRoleFromPath(pathname) || role
  const prefix = ROLE_ROUTE[urlRole]
  const pendingCount = requests.filter(
    (r) => r.status === 'requested' || r.status === 'under_review'
  ).length
  const unreadMessages = conversations.reduce((a, c) => a + c.unread, 0)

  const getHref = (key: string) => {
    switch (key) {
      case 'home':
        return `${prefix}/dashboard`
      case 'search':
        return urlRole === 'student'
          ? '/job-seeker/browse-jobs'
          : urlRole === 'professional'
            ? '/professional/browse-jobs'
            : '/recruiter/jobs'
      case 'referrals':
        return urlRole === 'student'
          ? '/job-seeker/applications'
          : `${prefix}/referrals`
      case 'messages':
        return `/messages`
      case 'profile':
        return `${prefix}/profile`
      default:
        return `${prefix}/dashboard`
    }
  }

  const isActive = (key: string) => {
    const href = getHref(key)
    return pathname === href || pathname.startsWith(href + '/')
  }

  const getBadge = (key: string) => {
    if (key === 'referrals' && pendingCount > 0) return pendingCount
    if (key === 'messages' && unreadMessages > 0)
      return unreadMessages > 9 ? '9+' : unreadMessages
    return null
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const active = isActive(tab.key)
          const badge = getBadge(tab.key)
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => navigate(getHref(tab.key))}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 h-full transition-colors duration-200',
                active ? 'text-primary' : 'text-muted-foreground active:text-foreground'
              )}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-all duration-200',
                    active && 'scale-105'
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {badge && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  active && 'font-semibold'
                )}
              >
                {tab.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
