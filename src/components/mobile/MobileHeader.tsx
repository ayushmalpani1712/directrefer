import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ChevronLeft, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import { GAvatar } from '@/components/ui-kit'
import { MobileSheet } from '@/components/mobile/MobileSheet'
import { UserMenuHeader, UserMenuList, WorkspaceSwitchList } from '@/components/UserMenuItems'
import { getRoleFromPath } from '@/data/constants'

const ROOT_PATHS = ['/', '/login', '/signup', '/auth']

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
  '/admin/overview': 'Overview',
  '/admin/users': 'Users',
  '/admin/referrals': 'Referrals',
  '/admin/incentives': 'Incentives',
  '/admin/screening': 'Screening',
  '/admin/scoring': 'Scoring',
  '/admin/approvals': 'Approvals',
  '/admin/moderation': 'Moderation',
  '/admin/analytics': 'Analytics',
  '/admin/acquisition': 'Acquisition',
  '/admin/settings': 'Settings',
  '/admin/audit-log': 'Audit Log',
  '/admin/profile': 'Profile',
  '/admin/notifications': 'Notifications',
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
  const { unreadNotificationCount, role, student } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const isRoot = ROOT_PATHS.some((p) => pathname === p)
  const isDashboard = pathname.endsWith('/dashboard')
  const isBranded = isRoot || isDashboard
  const urlRole = getRoleFromPath(pathname) || role

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 flex h-12 items-center justify-between px-3',
          'border-b border-border/40 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75'
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {isBranded ? (
            <>
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

        <div className="flex items-center gap-0.5">
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
          <button
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg transition-transform active:scale-95"
            aria-label="Account menu"
          >
            <GAvatar name={student?.name ?? 'U'} color={student?.gradient} className="h-8 w-8 text-[10px]" ring />
          </button>
        </div>
      </header>

      <MobileSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Account">
        <div className="px-4 pb-4">
          <UserMenuHeader />
          <div className="my-2 border-t border-border/50" />
          <UserMenuList onAction={() => setMenuOpen(false)} />
          <div className="my-2 border-t border-border/50" />
          <WorkspaceSwitchList onAction={() => setMenuOpen(false)} />
        </div>
      </MobileSheet>
    </>
  )
}
