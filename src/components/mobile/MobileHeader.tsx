import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ChevronLeft, Bell, Briefcase, Users, User, ShieldCheck, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { GAvatar } from '@/components/ui-kit'
import { MobileSheet } from '@/components/mobile/MobileSheet'
import { ROLE_ROUTE, ROLE_META, getRoleFromPath, type Role } from '@/data/constants'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const ROOT_PATHS = ['/', '/login', '/signup', '/auth']

const ROLE_ICONS: Record<string, typeof User> = {
  student: User,
  professional: Briefcase,
  recruiter: Users,
  admin: ShieldCheck,
}

const ROUTE_TITLES: Record<string, string> = {
  '/job-seeker/applications': 'Applications',
  '/job-seeker/professionals': 'Find Professionals',
  '/job-seeker/browse-jobs': 'Browse Jobs',
  '/job-seeker/request-referral': 'Request Referral',
  '/job-seeker/job-alerts': 'Job Alerts',
  '/job-seeker/profile': 'Profile',
  '/job-seeker/messages': 'Messages',
  '/job-seeker/notifications': 'Notifications',
  '/job-seeker/bookmarks': 'Bookmarks',
  '/job-seeker/activity': 'Activity',
  '/job-seeker/analytics': 'Analytics',
  '/job-seeker/settings': 'Settings',
  '/job-seeker/help': 'Help',
  '/professional/referrals': 'Referrals',
  '/professional/talent': 'Talent Search',
  '/professional/professionals': 'Find Professionals',
  '/professional/browse-jobs': 'Browse Jobs',
  '/professional/profile': 'Profile',
  '/professional/messages': 'Messages',
  '/professional/notifications': 'Notifications',
  '/professional/activity': 'Activity',
  '/professional/analytics': 'Analytics',
  '/professional/settings': 'Settings',
  '/professional/help': 'Help',
  '/recruiter/jobs': 'Jobs',
  '/recruiter/talent': 'Talent Search',
  '/recruiter/profile': 'Profile',
  '/recruiter/messages': 'Messages',
  '/recruiter/notifications': 'Notifications',
  '/recruiter/activity': 'Activity',
  '/recruiter/analytics': 'Analytics',
  '/recruiter/settings': 'Settings',
  '/recruiter/help': 'Help',
  '/messages': 'Messages',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/activity': 'Activity',
  '/analytics': 'Analytics',
}

function titleFor(pathname: string): string {
  const exact = ROUTE_TITLES[pathname]
  if (exact) return exact
  if (pathname.startsWith('/recruiter/screening/analytics')) return 'Screening Analytics'
  if (pathname.startsWith('/recruiter/screening')) return 'Screening'
  if (pathname.startsWith('/job-seeker/screening-results')) return 'Screening Results'
  if (pathname.startsWith('/job-seeker/screening')) return 'Screening'
  if (pathname.startsWith('/job-seeker/request-referral')) return 'Request Referral'
  if (pathname.startsWith('/jobs/')) return 'Job Details'
  const seg = pathname.split('/').filter(Boolean).pop() || 'Home'
  return seg
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function MobileHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { unreadNotificationCount, role, setRole, isAdmin, student, logout } = useApp()
  const { signOut, user } = useAuth()
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const isRoot = ROOT_PATHS.some((p) => pathname === p)
  const isDashboard = pathname.endsWith('/dashboard')
  const isBranded = isRoot || isDashboard
  const urlRole = getRoleFromPath(pathname) || role

  const workspaceRoles: Role[] = (() => {
    const roles: Role[] = isAdmin ? ['student', 'professional', 'admin'] : ['student', 'professional']
    if (import.meta.env.VITE_RECRUITER_VISIBLE !== 'false') {
      roles.splice(isAdmin ? 3 : 2, 0, 'recruiter')
    }
    return roles
  })()

  const handleSwitch = (r: Role) => {
    if (r === urlRole) { setWorkspaceOpen(false); return }
    setRole(r)
    if (user) {
      supabase.from('users').update({ active_workspace: r }).eq('id', user.id).then(() => {}, () => {})
    }
    navigate(ROLE_ROUTE[r], { replace: true })
    setWorkspaceOpen(false)
    toast.success(`Switched to ${ROLE_META[r].label}`)
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 flex h-12 items-center justify-between px-3',
          'border-b border-border/50 bg-background/95 backdrop-blur-lg'
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {isBranded ? (
            <>
              <button
                onClick={() => setWorkspaceOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full active:scale-95 transition-transform"
                aria-label="Switch workspace"
              >
                <GAvatar name={student?.name ?? 'U'} color={student?.gradient} className="h-8 w-8 text-[10px]" />
              </button>
              <span className="text-base font-semibold tracking-tight text-foreground">DirectRefer</span>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(-1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors active:bg-muted"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                {titleFor(pathname)}
              </span>
            </>
          )}
        </div>

        <button
          onClick={() => navigate(`/${urlRole === 'student' ? 'job-seeker' : urlRole}/notifications`)}
          className="relative flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors active:bg-muted"
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

      <MobileSheet open={workspaceOpen} onClose={() => setWorkspaceOpen(false)}>
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-4">
            <GAvatar name={student?.name ?? 'U'} color={student?.gradient} className="h-12 w-12 text-sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{student?.name ?? 'User'}</div>
              <div className="truncate text-xs text-muted-foreground">
                {student?.headline || ROLE_META[urlRole]?.label || 'User'}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Switch Workspace
          </div>

          <div className="space-y-1">
            {workspaceRoles.map((r) => {
              const Icon = ROLE_ICONS[r] || User
              const isActive = urlRole === r
              return (
                <button
                  key={r}
                  onClick={() => handleSwitch(r)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors min-h-[44px]',
                    isActive ? 'bg-primary/10 text-primary' : 'active:bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-sm font-medium">{ROLE_META[r]?.label || r}</span>
                  {isActive && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </button>
              )
            })}
          </div>

          <div className="border-t border-border mt-4 pt-3">
            <button
              onClick={async () => {
                setWorkspaceOpen(false)
                logout()
                await signOut()
                navigate('/')
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-muted-foreground active:bg-muted min-h-[44px]"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="font-medium">Sign out</span>
            </button>
          </div>
        </div>
      </MobileSheet>
    </>
  )
}
