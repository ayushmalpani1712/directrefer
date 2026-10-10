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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl md:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center">
        {slots.map((slot) => {
          const active = isActive(slot.href)
          const Icon = slot.icon

          if (slot.center) {
            return (
              <div key={slot.key} className="flex flex-1 flex-col items-center justify-center">
                <button
                  onClick={() => navigate(slot.href)}
                  className={cn(
                    'relative -mt-5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl shadow-lg shadow-primary/30 transition-transform duration-200 active:scale-95',
                    'bg-gradient-to-br from-indigo-500 via-primary to-violet-500',
                    active && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background'
                  )}
                  aria-label={slot.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-6 w-6 text-white" strokeWidth={2.25} />
                  {slot.badge && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {slot.badge}
                    </span>
                  )}
                </button>
                <span className={cn('mt-1 text-[10px] font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
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
                'relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-200',
                active ? 'text-primary' : 'text-muted-foreground active:text-foreground'
              )}
              aria-label={slot.label}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn('h-6 w-6 transition-all duration-200', active && 'scale-105')}
                  strokeWidth={active ? 2.5 : 2}
                />
                {slot.badge && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {slot.badge}
                  </span>
                )}
              </div>
              <span className={cn('text-[11px] font-medium', active && 'font-semibold')}>{slot.label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
