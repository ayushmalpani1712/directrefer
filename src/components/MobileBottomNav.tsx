import { useLocation, useNavigate } from 'react-router'
import { LayoutDashboard, Users, FileText, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { ROLE_ROUTE, getRoleFromPath, type Role } from '@/data/constants'

interface BottomNavItem {
  label: string
  icon: typeof LayoutDashboard
  href: string
  getBadge?: (pendingCount: number, unreadMessages: number) => string | undefined
}

function itemsFor(role: Role, prefix: string): BottomNavItem[] {
  return [
    { label: 'Dashboard', icon: LayoutDashboard, href: `${prefix}/dashboard` },
    { label: 'Search', icon: Users, href: role === 'student' ? '/job-seeker/browse-jobs' : '/professional/browse-jobs' },
    { label: 'Referrals', icon: FileText, href: `${prefix}/referrals`, getBadge: (pending) => pending > 0 ? String(pending) : undefined },
    { label: 'Profile', icon: User, href: `${prefix}/profile` },
  ]
}

export function MobileBottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { role, requests, conversations } = useApp()
  const { user } = useAuth()

  if (!user) return null

  const urlRole = getRoleFromPath(pathname) || role
  const prefix = ROLE_ROUTE[urlRole]
  const items = itemsFor(urlRole, prefix)
  const pendingCount = requests.filter((r) => r.status === 'requested' || r.status === 'under_review').length
  const unreadMessages = conversations.reduce((a, c) => a + c.unread, 0)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/') || pathname.startsWith(href + '?')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-lg md:hidden safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-1 py-1">
        {items.map((item) => {
          const active = isActive(item.href)
          const badge = item.getBadge?.(pendingCount, unreadMessages)
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 min-w-[64px] min-h-[56px] transition-colors duration-200',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground',
              )}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <item.icon className={cn('h-5 w-5 transition-transform duration-200', active && 'scale-110')} />
                {badge && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {badge}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>{item.label}</span>
              {active && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
