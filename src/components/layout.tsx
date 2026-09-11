import { lazy, Suspense, useMemo, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import {
  Bell, Bookmark, Briefcase, ChevronDown, ChevronRight, CircleHelp,
  FileText, Home, LayoutDashboard, MessageSquare, MoreHorizontal,
  Settings, Shield, ShieldCheck, User, Users, Zap, Inbox, LineChart, Activity,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarRail, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar'
import { GAvatar } from '@/components/ui-kit'
import { AnnouncementBanner } from '@/components/AnnouncementBanner'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import {
  ROLE_META,
  ROLE_ROUTE,
  RECRUITER_VISIBLE,
  getRoleFromPath,
  getMessagesPath,
  type Role,
} from '@/data/constants'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { useMobile } from '@/hooks/use-mobile'
import { MobileHeader } from '@/components/mobile/MobileHeader'

// ── Logo ────────────────────────────────────────────────────
export function Logo({ compact }: { compact?: boolean }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    window.location.assign('/')
  }
  return (
    <a href="/" onClick={handleClick} className="flex items-center gap-3" aria-label="Direct Refer — Go to homepage">
      <svg viewBox="0 0 512 385" className="h-10 w-auto shrink-0" aria-hidden="true">
        <image href="/logo-emblem.png" width="512" height="385" />
      </svg>
      {!compact && (
        <span className="font-display text-[21px] font-bold tracking-tight text-primary">
          DirectRefer
        </span>
      )}
    </a>
  )
}

// ── Nav config ──────────────────────────────────────────────
interface NavItem { label: string; href: string; icon: LucideIcon; badge?: string }

function navFor(role: Role, pendingCount: number, prefix: string): { primary: NavItem[]; more: NavItem[] } {
  const primary: NavItem[] = []
  const more: NavItem[] = []

  if (role === 'admin') {
    primary.push(
      { label: 'Dashboard', href: '/admin/overview', icon: LayoutDashboard },
      { label: 'Workspaces', href: '/admin/users', icon: Users },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    )
    more.push(
      { label: 'Activity', href: `${prefix}/activity`, icon: Activity },
      { label: 'Analytics', href: `${prefix}/analytics`, icon: LineChart },
    )
  } else if (role === 'student') {
    primary.push(
      { label: 'Dashboard', href: '/job-seeker/dashboard', icon: LayoutDashboard },
      { label: 'Profile', href: '/job-seeker/profile', icon: User },
      { label: 'Browse Jobs', href: '/job-seeker/browse-jobs', icon: Briefcase },
    )
    more.push(
      { label: 'Applications', href: '/job-seeker/applications', icon: FileText, badge: pendingCount > 0 ? String(pendingCount) : undefined },
      { label: 'Referrals', href: '/job-seeker/professionals', icon: Users },
      { label: 'Job Alerts', href: '/job-seeker/job-alerts', icon: Bell },
      { label: 'Bookmarks', href: `${prefix}/bookmarks`, icon: Bookmark },
      { label: 'Activity', href: `${prefix}/activity`, icon: Activity },
      { label: 'Analytics', href: `${prefix}/analytics`, icon: LineChart },
    )
  } else if (role === 'professional') {
    primary.push(
      { label: 'Dashboard', href: '/professional/dashboard', icon: LayoutDashboard },
      { label: 'Profile', href: '/professional/profile', icon: User },
      { label: 'Find Candidates', href: '/professional/talent', icon: Users },
    )
    more.push(
      { label: 'Referrals', href: '/professional/referrals', icon: Inbox, badge: pendingCount > 0 ? String(pendingCount) : undefined },
      { label: 'Browse Jobs', href: '/professional/browse-jobs', icon: Briefcase },
      { label: 'Activity', href: `${prefix}/activity`, icon: Activity },
      { label: 'Analytics', href: `${prefix}/analytics`, icon: LineChart },
    )
  } else if (role === 'recruiter' && RECRUITER_VISIBLE) {
    primary.push(
      { label: 'Dashboard', href: '/recruiter/dashboard', icon: LayoutDashboard },
      { label: 'Profile', href: '/recruiter/profile', icon: Home },
      { label: 'Jobs', href: '/recruiter/jobs', icon: Briefcase },
    )
    more.push(
      { label: 'Talent', href: '/recruiter/talent', icon: Users },
      { label: 'Applications', href: `${prefix}/applications`, icon: FileText },
      { label: 'Activity', href: `${prefix}/activity`, icon: Activity },
      { label: 'Analytics', href: `${prefix}/analytics`, icon: LineChart },
    )
  }

  return { primary, more }
}

// ── Workspace switcher (inlined) ────────────────────────────
const ROLE_ICONS: Record<Role, typeof User> = {
  student: User,
  professional: Briefcase,
  recruiter: Users,
  admin: ShieldCheck,
}

function WorkspaceSwitcher() {
  const { setRole, isAdmin, student, logout } = useApp()
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const urlRole = getRoleFromPath(pathname)

  const workspaceRoles: Role[] = useMemo(() => {
    const roles: Role[] = isAdmin ? ['student', 'professional', 'admin'] : ['student', 'professional']
    if (RECRUITER_VISIBLE) roles.splice(isAdmin ? 3 : 2, 0, 'recruiter')
    return roles
  }, [isAdmin])

  const handleSwitch = (r: Role) => {
    if (r === urlRole) return

    setRole(r)
    if (user) {
      supabase.from('users').update({ active_workspace: r }).eq('id', user.id).then(
        () => {},
        () => {}
      )
    }
    navigate(ROLE_ROUTE[r], { replace: true })
    toast.success(`Switched to ${ROLE_META[r].label} workspace`)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-14 items-center transition-colors hover:bg-muted px-1.5">
            <GAvatar name={student?.name ?? 'U'} color={student?.gradient} className="h-9 w-9 text-xs" ring />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={0} className="w-72">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <GAvatar name={student?.name ?? 'U'} color={student?.gradient} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{student?.name ?? 'User'}</div>
              <div className="truncate text-xs text-muted-foreground">
                {student.headline || ROLE_META[urlRole].label}
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </DropdownMenuLabel>
          {workspaceRoles.map((r) => {
            const Icon = ROLE_ICONS[r]
            const isActive = urlRole === r
            const isSuperAdmin = r === 'admin'
            return (
              <DropdownMenuItem
                key={r}
                className={cn('flex items-center justify-between gap-2')}
                onSelect={() => handleSwitch(r)}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{ROLE_META[r].label}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {isSuperAdmin && (
                    <Badge variant="outline" className="gap-0.5 border-violet-500/30 bg-violet-500/5 text-[10px] text-violet-600 dark:text-violet-400">
                      <ShieldCheck className="h-2.5 w-2.5" /> Admin
                    </Badge>
                  )}
                  {isActive && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate(`${ROLE_ROUTE[urlRole]}/settings`)}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-500 focus:text-rose-500"
            onSelect={async () => {
              try {
                logout()
                await signOut()
                navigate('/login')
              } catch (err) {
                console.error('Sign out failed:', err)
                toast.error('Sign out failed. Please try again.')
              }
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

// ── Command palette (inlined lazy) ─────────────────────────
const LazyCommandPaletteInner = lazy(() => import('./CommandPaletteInner'))

function LazyCommandPalette() {
  return (
    <Suspense fallback={null}>
      <LazyCommandPaletteInner />
    </Suspense>
  )
}

// ── Sidebar ─────────────────────────────────────────────────
function AppSidebar() {
  const { role, student, requests } = useApp()
  const { state, setOpenMobile } = useSidebar()
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const pendingCount = requests.filter((r) => r.status === 'requested' || r.status === 'under_review').length
  const urlRole = getRoleFromPath(pathname) || role
  const prefix = ROLE_ROUTE[urlRole]
  const { primary, more } = navFor(urlRole, pendingCount, prefix)
  const user = student

  useEffect(() => { setOpenMobile(false) }, [setOpenMobile])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '?') || pathname.startsWith(href + '/')

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="flex-none">
        <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-4">
          {state === 'collapsed' ? (
            <Link to="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-label="Direct Refer — Go to homepage">
              <Zap className="h-4.5 w-4.5 fill-white text-white" />
            </Link>
          ) : (
            <Logo />
          )}
        </SidebarHeader>
      </div>
      <SidebarContent className="flex-1 overflow-y-auto px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map((item) => {
                const active = isActive(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200 min-h-[44px] relative active:scale-[0.98]',
                          active
                            ? 'bg-neutral-800/50 text-white font-semibold border-l-2 border-primary pl-[10px]'
                            : 'text-neutral-400 hover:bg-neutral-800/30 hover:text-white',
                        )}
                      >
                        <item.icon className={cn('h-[18px] w-[18px] shrink-0 transition-transform duration-200', active && 'scale-110')} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary" aria-label={`${item.badge} pending`}>
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {more.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <button
                    onClick={() => setMoreOpen(!moreOpen)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200 min-h-[44px]',
                      moreOpen
                        ? 'text-white bg-neutral-800/30'
                        : 'text-neutral-400 hover:bg-neutral-800/30 hover:text-white',
                    )}
                  >
                    <MoreHorizontal className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">More</span>
                    <ChevronDown className={cn('h-4 w-4 ml-auto transition-transform duration-200', moreOpen && 'rotate-180')} />
                  </button>
                </SidebarMenuItem>
                {moreOpen && more.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild tooltip={item.label}>
                        <Link
                          to={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 pl-9 text-[13px] font-medium transition-all duration-200 min-h-[40px] relative active:scale-[0.98]',
                            active
                              ? 'bg-neutral-800/50 text-white font-semibold border-l-2 border-primary'
                              : 'text-neutral-400 hover:bg-neutral-800/30 hover:text-white',
                          )}
                        >
                          <item.icon className={cn('h-[16px] w-[16px] shrink-0 transition-transform duration-200', active && 'scale-110')} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge && (
                        <SidebarMenuBadge className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary" aria-label={`${item.badge} pending`}>
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <div className="flex-none">
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <Link to={`${prefix}/settings`} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors duration-200', (pathname === `${prefix}/settings` || pathname === '/settings') && 'bg-primary/10 text-primary')}>
                  <Settings className="h-[18px] w-[18px]" /> <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {role === 'admin' && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Admin Panel">
                <Link to="/admin/overview" className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors duration-200', pathname.startsWith('/admin') && 'bg-primary/10 text-primary')}>
                  <Shield className="h-[18px] w-[18px]" /> <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Help & Support">
                <Link to={`${prefix}/help`} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors duration-200', (pathname === `${prefix}/help` || pathname === '/help') && 'bg-primary/10 text-primary')}>
                  <CircleHelp className="h-[18px] w-[18px]" /> <span>Help & Support</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {state !== 'collapsed' && (
            <div className="mt-2 rounded-xl bg-muted/50 p-3 border border-border/50">
              <div className="flex items-center gap-2.5">
                <GAvatar name={user.name} color={user.gradient} className="h-9 w-9 text-xs ring-2 ring-background" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{user.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{ROLE_META[urlRole].label}</div>
                </div>
              </div>
            </div>
          )}
        </SidebarFooter>
      </div>
      <SidebarRail />
    </Sidebar>
  )
}

// ── Breadcrumbs ─────────────────────────────────────────────
const CRUMB_LABELS: Record<string, string> = {
  'job-seeker': 'Job Seeker', dashboard: 'Dashboard', professionals: 'Find Professionals', applications: 'My Referrals',
  referrals: 'Referral Requests', profile: 'Profile', overview: 'Overview',
  jobs: 'Jobs', talent: 'Talent Search', messages: 'Messages', notifications: 'Notifications',
  bookmarks: 'Bookmarks', activity: 'Activity', analytics: 'Analytics', settings: 'Settings',
  help: 'Help & Support', 'request-referral': 'Request Referral', company: 'Company Profile',
  users: 'Users', flagged: 'Flagged', verification: 'Verification', announcements: 'Announcements',
  flags: 'Feature Flags', audit: 'Audit Log', professional: 'Professional',
  admin: 'Admin', 'browse-jobs': 'Browse Jobs', workspaces: 'Workspaces',
}
if (RECRUITER_VISIBLE) CRUMB_LABELS.recruiter = 'Recruiter'

interface BreadcrumbsProps {
  title?: string
  description?: string
}

function Breadcrumbs({ title, description }: BreadcrumbsProps) {
  const { pathname } = useLocation()
  const { visibleProfessionals } = useApp()
  const urlRole = getRoleFromPath(pathname) || 'student'
  const segs = pathname.split('/').filter(Boolean)

  const pageTitle = title ?? CRUMB_LABELS[segs[segs.length - 1]] ?? segs[segs.length - 1] ?? 'Page'
  const pageDescription = description ?? ''

  return (
    <div className="mb-6">
      <nav className="mb-3 flex items-center gap-1 overflow-x-auto text-sm text-muted-foreground [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link to={ROLE_ROUTE[urlRole]} className="shrink-0 hover:text-foreground"><Home className="h-3.5 w-3.5" /></Link>
        {segs.map((s, i) => {
          const href = '/' + segs.slice(0, i + 1).join('/')
          const label = CRUMB_LABELS[s] ?? visibleProfessionals.find((p) => p.id === s)?.name ?? s
          const last = i === segs.length - 1
          return (
            <span key={href} className="flex shrink-0 items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              {last ? (
                <span className="whitespace-nowrap font-medium text-foreground">{label}</span>
              ) : (
                <Link to={href} className="whitespace-nowrap hover:text-foreground">{label}</Link>
              )}
            </span>
          )
        })}
      </nav>
      {(pageTitle || pageDescription) && (
        <div className="border-b border-border/50 pb-4">
          {pageTitle && (
            <h1 className="text-xl md:text-[24px] font-semibold leading-tight text-white">{pageTitle}</h1>
          )}
          {pageDescription && (
            <p className="mt-1 text-[14px] leading-relaxed text-neutral-400">{pageDescription}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Topbar ──────────────────────────────────────────────────
function Topbar() {
  const { pathname } = useLocation()
  const urlRole = getRoleFromPath(pathname) || 'student'
  const { conversations, notifications, student } = useApp()
  const messagesPath = getMessagesPath(urlRole)
  const prefix = ROLE_ROUTE[urlRole]
  const unreadMessages = conversations.reduce((a, c) => a + c.unread, 0)
  const unreadNotifs = notifications.filter((n) => !n.read).length
  const navigate = useNavigate()
  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-1.5 border-b border-border/50 px-2 sm:px-4 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      <SidebarTrigger className="md:hidden h-11 w-11 shrink-0 touch-target" aria-label="Toggle navigation menu" />
      <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} className="flex items-center shrink-0 md:hidden" aria-label="Direct Refer — Go to homepage">
        <svg viewBox="0 0 512 385" className="h-8 w-auto shrink-0" aria-hidden="true">
          <image href="/logo-emblem.png" width="512" height="385" />
        </svg>
      </a>
      <input
        type="text"
        placeholder="Search jobs, professionals, companies..."
        onFocus={() => {
          const e = new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true })
          Object.defineProperty(e, 'metaKey', { value: true })
          Object.defineProperty(e, 'ctrlKey', { value: true })
          document.dispatchEvent(e)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const ke = new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true })
            Object.defineProperty(ke, 'metaKey', { value: true })
            Object.defineProperty(ke, 'ctrlKey', { value: true })
            document.dispatchEvent(ke)
          }
        }}
        className="hidden sm:flex h-9 flex-1 items-center gap-2.5 rounded-full border border-border/60 bg-muted/50 px-4 text-[14px] text-muted-foreground placeholder:text-muted-foreground/60 transition-[border-color] duration-300 hover:border-primary/30 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-md dark:bg-white/[0.04] dark:border-white/[0.08] dark:hover:border-primary/30 dark:focus:border-primary/40"
        aria-label="Search (Ctrl+K)"
      />
      <div className="flex-1 sm:hidden" />
      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('toggle-command-palette'))}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Quick actions"
        >
          <Zap className="h-[18px] w-[18px]" />
        </button>
        <button
          onClick={() => navigate(messagesPath)}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Messages${unreadMessages > 0 ? ` (${unreadMessages} unread)` : ''}`}
        >
          <MessageSquare className="h-[18px] w-[18px]" />
          {unreadMessages > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground badge-pulse" aria-hidden="true">
              {unreadMessages}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate(`${prefix}/notifications`)}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Notifications${unreadNotifs > 0 ? ` (${unreadNotifs} unread)` : ''}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadNotifs > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white badge-pulse" aria-hidden="true">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </button>
        <div className="hidden sm:flex items-center gap-1.5 ml-1">
          <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <GAvatar name={student?.name ?? 'U'} color={student?.gradient} className="h-4 w-4 text-[8px]" />
            <span>{ROLE_META[urlRole].label}</span>
          </div>
        </div>
        <WorkspaceSwitcher />
      </div>
    </header>
  )
}

// ── Animated Outlet ─────────────────────────────────────────
function AnimatedOutlet() {
  return <div className="flex flex-col min-w-0 min-h-0 overflow-x-hidden"><Outlet /></div>
}

// ── Shell ───────────────────────────────────────────────────
export default function AppShell() {
  const isMobile = useMobile()

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-dvh bg-background">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="px-4 py-4">
            <AnimatedOutlet />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <AppSidebar aria-label="Main navigation" />
      <SidebarInset className="bg-background flex flex-col min-w-0 min-h-0 overflow-y-auto overflow-x-hidden">
        <AnnouncementBanner />
        <Topbar />
        <main id="main-content" className="mx-auto w-full min-w-0 max-w-7xl min-h-0 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden pb-24 md:pb-6" role="main" style={{ paddingBottom: 'max(96px, calc(80px + env(safe-area-inset-bottom, 0px)))' }}>
          <Breadcrumbs />
          <AnimatedOutlet />
        </main>
      </SidebarInset>
      <MobileBottomNav />
      <LazyCommandPalette />
    </SidebarProvider>
  )
}
