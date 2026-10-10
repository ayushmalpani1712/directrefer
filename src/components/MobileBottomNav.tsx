import { useLocation, useNavigate } from 'react-router'
import {
  Home, Search, Send, Briefcase, User,
  Users, LayoutDashboard, Shield, BarChart3, Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { ROLE_ROUTE, getRoleFromPath, type Role } from '@/data/constants'

type IconType = typeof Home

interface NavSlot {
  key: string
  label: string
  icon: IconType
  href: string
  badge?: number
  center?: boolean
}

function slotsFor(role: Role, pendingCount: number): NavSlot[] {
  const prefix = ROLE_ROUTE[role]

  switch (role) {
    case 'student':
      return [
        { key: 'dashboard', label: 'Dashboard', icon: Home, href: `${prefix}/dashboard` },
        { key: 'jobs', label: 'Jobs', icon: Search, href: '/job-seeker/browse-jobs' },
        { key: 'referrals', label: 'Referrals', icon: Send, href: '/job-seeker/applications', badge: pendingCount || undefined, center: true },
        { key: 'professionals', label: 'Pros', icon: Users, href: '/job-seeker/professionals' },
        { key: 'profile', label: 'Profile', icon: User, href: `${prefix}/profile` },
      ]
    case 'professional':
      return [
        { key: 'dashboard', label: 'Dashboard', icon: Home, href: `${prefix}/dashboard` },
        { key: 'requests', label: 'Requests', icon: Inbox, href: '/professional/referrals', badge: pendingCount || undefined },
        { key: 'talent', label: 'Talent', icon: Users, href: '/professional/talent', center: true },
        { key: 'earnings', label: 'Earnings', icon: BarChart3, href: '/professional/analytics' },
        { key: 'profile', label: 'Profile', icon: User, href: `${prefix}/profile` },
      ]
    case 'recruiter':
      return [
        { key: 'dashboard', label: 'Dashboard', icon: Home, href: `${prefix}/dashboard` },
        { key: 'jobs', label: 'Jobs', icon: Briefcase, href: '/recruiter/jobs' },
        { key: 'candidates', label: 'Candidates', icon: Users, href: '/recruiter/talent', center: true },
        { key: 'referrals', label: 'Pipeline', icon: Send, href: '/recruiter/screening' },
        { key: 'profile', label: 'Profile', icon: User, href: `${prefix}/profile` },
      ]
    case 'admin':
      return [
        { key: 'users', label: 'People', icon: Users, href: '/admin/users' },
        { key: 'referrals', label: 'Referrals', icon: Send, href: '/admin/referrals' },
        { key: 'admin', label: 'Admin', icon: Shield, href: '/admin/overview', center: true },
        { key: 'screening', label: 'Trust', icon: LayoutDashboard, href: '/admin/screening' },
        { key: 'analytics', label: 'Growth', icon: BarChart3, href: '/admin/analytics' },
        { key: 'profile', label: 'Profile', icon: User, href: '/admin/profile' },
      ]
    default:
      return []
  }
}

export function MobileBottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { role, requests } = useApp()
  const { user } = useAuth()

  if (!user) return null

  const urlRole = getRoleFromPath(pathname) || role
  if (urlRole === 'admin' && !pathname.startsWith('/admin')) return null

  const pendingCount = requests.filter(
    (r) => r.status === 'requested' || r.status === 'under_review'
  ).length
  const slots = slotsFor(urlRole, pendingCount)

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
