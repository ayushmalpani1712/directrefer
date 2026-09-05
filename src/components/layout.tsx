import { lazy, Suspense, useMemo, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import {
  Bell, Bookmark, Briefcase, ChevronRight, CircleHelp, Command,
  FileText, Home, LayoutDashboard, MessageSquare,
  Search, Settings, Shield, ShieldCheck, User, Users, Zap, Inbox, LineChart, Activity,
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
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import {
  ROLE_META,
  ROLE_ROUTE,
  RECRUITER_VISIBLE,
  getRoleFromPath,
  getMessagesPath,
  type Role,
} from '@/data/mock'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

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
        <span className="font-display text-[21px] font-bold tracking-tight text-gradient">
          DirectRefer
        </span>
      )}
    </a>
  )
}

// ── Nav config ──────────────────────────────────────────────
interface NavItem { label: string; href: string; icon: LucideIcon; badge?: string }

function navFor(role: Role, pendingCount: number, prefix: string): { group: string; items: NavItem[] }[] {
  const common: { group: string; items: NavItem[] }[] = []
  if (role === 'admin') {
    common.push({
      group: 'Admin',
      items: [
        { label: 'Dashboard', href: '/admin/overview', icon: LayoutDashboard },
        { label: 'Workspaces', href: '/admin/users', icon: Users },
        { label: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    })
    common.push({
      group: 'Network',
      items: [
        { label: 'Activity', href: `${prefix}/activity`, icon: Activity },
        { label: 'Analytics', href: `${prefix}/analytics`, icon: LineChart },
      ],
    })
    return common
  }
  if (role === 'student') {
    common.push({
      group: 'Workspace',
      items: [
        { label: 'Dashboard', href: '/job-seeker/dashboard', icon: LayoutDashboard },
        { label: 'Find Professionals', href: '/job-seeker/professionals', icon: Users },
        { label: 'Browse Jobs', href: '/job-seeker/browse-jobs', icon: Briefcase },
        { label: 'My Referrals', href: '/job-seeker/applications', icon: FileText, badge: pendingCount > 0 ? String(pendingCount) : undefined },
        { label: 'My Profile', href: '/job-seeker/profile', icon: User },
      ],
    })
  } else if (role === 'professional') {
    common.push({
      group: 'Workspace',
      items: [
        { label: 'Dashboard', href: '/professional/dashboard', icon: LayoutDashboard },
        { label: 'Find Job Seekers', href: '/professional/talent', icon: Users },
        { label: 'Referral Requests', href: '/professional/referrals', icon: Inbox, badge: pendingCount > 0 ? String(pendingCount) : undefined },
        { label: 'Browse Jobs', href: '/professional/browse-jobs', icon: Briefcase },
        { label: 'My Profile', href: '/professional/profile', icon: User },
      ],
    })
  } else if (role === 'recruiter' && RECRUITER_VISIBLE) {
    common.push({
      group: 'Workspace',
      items: [
        { label: 'Dashboard', href: '/recruiter/dashboard', icon: LayoutDashboard },
        { label: 'Jobs & Pipeline', href: '/recruiter/jobs', icon: Briefcase },
        { label: 'Talent Search', href: '/recruiter/talent', icon: Users },
        { label: 'Company Profile', href: '/recruiter/profile', icon: Home },
      ],
    })
  }
  common.push({
    group: 'Network',
    items: [
      ...(role === 'student' ? [{ label: 'Bookmarks', href: `${prefix}/bookmarks`, icon: Bookmark }] : []),
      { label: 'Activity', href: `${prefix}/activity`, icon: Activity },
      { label: 'Analytics', href: `${prefix}/analytics`, icon: LineChart },
    ],
  })
  return common
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
  const pendingCount = requests.filter((r) => r.status === 'requested' || r.status === 'under_review').length
  const urlRole = getRoleFromPath(pathname) || role
  const prefix = ROLE_ROUTE[urlRole]
  const groups = navFor(urlRole, pendingCount, prefix)
  const user = student

  useEffect(() => { setOpenMobile(false) }, [setOpenMobile])

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="flex-none">
        <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4">
          {state === 'collapsed' ? (
            <Link to="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow" aria-label="Direct Refer — Go to homepage">
              <Zap className="h-4.5 w-4.5 fill-white text-white" />
            </Link>
          ) : (
            <Logo />
          )}
        </SidebarHeader>
      </div>
      <SidebarContent className="flex-1 overflow-y-auto px-2">
        {groups.map((g) => (
          <SidebarGroup key={g.group}>
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {g.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '?') || pathname.startsWith(item.href + '/')
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild tooltip={item.label}>
                        <Link
                          to={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-200 min-h-[44px] relative',
                            isActive
                              ? 'bg-primary/10 text-primary font-semibold shadow-[0_0_12px_-4px_var(--card-glow)] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-full before:bg-primary'
                              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:translate-x-[1px]',
                          )}
                        >
                          <item.icon className={cn('h-[18px] w-[18px] shrink-0 transition-transform duration-200', isActive && 'scale-110')} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge && (
                        <SidebarMenuBadge className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary badge-shine">
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
            <div className="mt-2 rounded-xl bg-gradient-to-br from-primary/5 via-muted/50 to-secondary/5 p-3 border border-border/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-secondary/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center gap-2.5">
                <GAvatar name={user.name} color={user.gradient} className="h-9 w-9 text-xs ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all" />
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

function Breadcrumbs() {
  const { pathname } = useLocation()
  const { visibleProfessionals } = useApp()
  const urlRole = getRoleFromPath(pathname) || 'student'
  const segs = pathname.split('/').filter(Boolean)
  if (segs.length === 0) return null
  return (
    <nav className="mb-4 flex items-center gap-1 overflow-x-auto text-sm text-muted-foreground [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
  )
}

// ── Topbar ──────────────────────────────────────────────────
function Topbar() {
  const { pathname } = useLocation()
  const urlRole = getRoleFromPath(pathname) || 'student'
  const { conversations, notifications } = useApp()
  const messagesPath = getMessagesPath(urlRole)
  const prefix = ROLE_ROUTE[urlRole]
  const unreadMessages = conversations.reduce((a, c) => a + c.unread, 0)
  const unreadNotifs = notifications.filter((n) => !n.read).length
  const navigate = useNavigate()
  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-1.5 border-b border-border/50 px-2 sm:px-4 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      <SidebarTrigger className="md:hidden h-11 w-11 shrink-0 touch-target" />
      <a href="/" onClick={(e) => { e.preventDefault(); window.location.assign('/') }} className="flex items-center shrink-0" aria-label="Direct Refer — Go to homepage">
        <svg viewBox="0 0 512 385" className="h-8 w-auto shrink-0" aria-hidden="true">
          <image href="/logo-emblem.png" width="512" height="385" />
        </svg>
      </a>
      <button
        onClick={() => {
          const e = new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true })
          Object.defineProperty(e, 'metaKey', { value: true })
          Object.defineProperty(e, 'ctrlKey', { value: true })
          document.dispatchEvent(e)
        }}
        className="hidden h-9 flex-1 items-center gap-2.5 rounded-xl border border-border/60 bg-muted/50 px-4 text-[14px] text-muted-foreground transition-[border-color,box-shadow] duration-300 hover:border-primary/30 hover:bg-muted/50 hover:shadow-[0_0_20px_-4px_var(--card-glow)] focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_20px_-4px_var(--card-glow-hover)] sm:flex sm:max-w-md dark:bg-white/[0.04] dark:border-white/[0.08] dark:hover:border-primary/30 dark:hover:bg-white/[0.06] dark:focus:border-primary/40"
        aria-label="Search (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search people, jobs, pages…</span>
        <kbd className="pointer-events-none inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/50 px-1.5 font-mono text-[10px] text-muted-foreground/70">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>
      <div className="flex-1 sm:hidden" />
      <div className="ml-auto flex items-center gap-0.5">
        <button
          onClick={() => {
            const e = new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true })
            Object.defineProperty(e, 'metaKey', { value: true })
            Object.defineProperty(e, 'ctrlKey', { value: true })
            document.dispatchEvent(e)
          }}
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
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
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
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {unreadNotifs}
            </span>
          )}
        </button>
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
  return (
    <SidebarProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <AppSidebar aria-label="Main navigation" />
      <SidebarInset className="bg-background flex flex-col min-w-0 min-h-0 overflow-y-auto overflow-x-hidden">
        <Topbar />
        <main id="main-content" className="mx-auto w-full min-w-0 max-w-7xl min-h-0 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden" role="main">
          <Breadcrumbs />
          <AnimatedOutlet />
        </main>
      </SidebarInset>
      <LazyCommandPalette />
    </SidebarProvider>
  )
}
