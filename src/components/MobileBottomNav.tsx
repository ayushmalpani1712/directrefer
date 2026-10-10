import { useLocation, useNavigate } from 'react-router'
import { Home, Search, Send, HeartHandshake, Briefcase, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { ROLE_ROUTE, ROLE_MESSAGES_ROUTE, getRoleFromPath, type Role } from '@/data/constants'

type IconType = typeof Home

interface NavSlot {
  key: string
  label: string
  icon: IconType
  href: string
  badge?: number
  center?: boolean
}

function slotsFor(role: Role, pendingCount: number, unreadMessages: number): NavSlot[] {
  const prefix = ROLE_ROUTE[role]
  const messagesHref = ROLE_MESSAGES_ROUTE[role]
  const messagesBadge = unreadMessages > 0 ? (unreadMessages > 9 ? 9 : unreadMessages) : undefined

  switch (role) {
    case 'student':
      return [
        { key: 'home', label: 'Home', icon: Home, href: `${prefix}/dashboard` },
        { key: 'search', label: 'Search', icon: Search, href: '/job-seeker/browse-jobs' },
        { key: 'center', label: 'Apply', icon: Send, href: '/job-seeker/applications', badge: pendingCount || undefined, center: true },
        { key: 'messages', label: 'Messages', icon: MessageSquare, href: messagesHref, badge: messagesBadge },
        { key: 'profile', label: 'Profile', icon: User, href: `${prefix}/profile` },
      ]
    case 'professional':
      return [
        { key: 'home', label: 'Home', icon: Home, href: `${prefix}/dashboard` },
        { key: 'search', label: 'Search', icon: Search, href: '/professional/browse-jobs' },
        { key: 'center', label: 'Refer', icon: HeartHandshake, href: '/professional/referrals', badge: pendingCount || undefined, center: true },
        { key: 'messages', label: 'Messages', icon: MessageSquare, href: messagesHref, badge: messagesBadge },
        { key: 'profile', label: 'Profile', icon: User, href: `${prefix}/profile` },
      ]
    case 'recruiter':
      return [
        { key: 'home', label: 'Home', icon: Home, href: `${prefix}/dashboard` },
        { key: 'search', label: 'Talent', icon: Search, href: '/recruiter/talent' },
        { key: 'center', label: 'Jobs', icon: Briefcase, href: '/recruiter/jobs', center: true },
        { key: 'messages', label: 'Messages', icon: MessageSquare, href: messagesHref, badge: messagesBadge },
        { key: 'profile', label: 'Profile', icon: User, href: `${prefix}/profile` },
      ]
    default:
      return []
  }
}

export function MobileBottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { role, requests, conversations } = useApp()
  const { user } = useAuth()

  if (!user) return null

  const urlRole = getRoleFromPath(pathname) || role
  if (urlRole === 'admin') return null

  const pendingCount = requests.filter(
    (r) => r.status === 'requested' || r.status === 'under_review'
  ).length
  const unreadMessages = conversations.reduce((a, c) => a + c.unread, 0)
  const slots = slotsFor(urlRole, pendingCount, unreadMessages)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex h-[60px] items-center px-1">
        {slots.map((slot) => {
          const active = isActive(slot.href)
          const Icon = slot.icon

          if (slot.center) {
            return (
              <div key={slot.key} className="flex flex-1 flex-col items-center justify-center">
                <button
                  onClick={() => navigate(slot.href)}
                  className={cn(
                    'relative -mt-6 flex h-[50px] w-[50px] items-center justify-center rounded-[18px] shadow-lg shadow-primary/25 transition-all duration-200 active:scale-95',
                    'bg-gradient-to-b from-indigo-400 via-primary to-violet-600 ring-1 ring-white/15 ring-inset',
                    active && 'shadow-primary/40 brightness-110'
                  )}
                  aria-label={slot.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-[22px] w-[22px] text-white drop-shadow-sm" strokeWidth={2.25} />
                  {slot.badge && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
                      {slot.badge}
                    </span>
                  )}
                </button>
                <span className={cn('mt-1 text-[10px] font-medium tracking-tight transition-colors', active ? 'text-foreground' : 'text-muted-foreground')}>
                  {slot.label}
                </span>
              </div>
            )
          }

          return (
            <button
              key={slot.key}
              onClick={() => navigate(slot.href)}
              className={cn(
                'relative flex h-full flex-1 flex-col items-center justify-center gap-1',
                active ? 'text-primary' : 'text-muted-foreground active:text-foreground'
              )}
              aria-label={slot.label}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={cn(
                  'relative flex h-8 w-12 items-center justify-center rounded-xl transition-all duration-200',
                  active && 'bg-primary/10'
                )}
              >
                <Icon
                  className={cn('h-[22px] w-[22px] transition-all duration-200', active && 'scale-105')}
                  strokeWidth={active ? 2.4 : 1.9}
                />
                {slot.badge && (
                  <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                    {slot.badge}
                  </span>
                )}
              </span>
              <span className={cn('text-[10px] font-medium tracking-tight transition-colors', active && 'font-semibold')}>{slot.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
