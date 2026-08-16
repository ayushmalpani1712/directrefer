import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useTheme } from 'next-themes'

import {
  Bell, Bookmark, Briefcase, CheckCheck, ChevronRight, CircleHelp, Command,
  FileText, FileUp, Home, LayoutDashboard, Mail, MessageSquare, Moon,
  Plus, Search, Settings, Shield, Sparkles, Sun, User, Users, Zap, Inbox, LineChart, Activity, BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarRail, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { GAvatar } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import { LazyCommandPalette } from '@/components/CommandPaletteWrapper'
import {
  ROLE_META,
  ROLE_ROUTE,
  getRoleFromPath,
  getMessagesPath,
  type Role,
} from '@/data/mock'
import { cn } from '@/lib/utils'

// ── Logo ────────────────────────────────────────────────────
export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Direct Refer — Go to homepage">
      <svg viewBox="0 0 512 512" width="32" height="32" className="h-8 w-auto" aria-hidden="true">
        <path fill="#3B5FE5" fillRule="evenodd" d="M 278 78 L 278 445 Q 278 478 242 478 L 222 478 Q 155 478 135 418 Q 115 355 115 280 Q 115 188 168 128 Q 210 78 278 78 Z M 198 228 C 168 228 145 255 145 285 C 145 318 168 342 198 342 C 228 342 252 318 252 285 C 252 255 228 228 198 228 Z"/>
        <path d="M 148 378 C 135 295 175 195 318 118" stroke="#8B8FD4" strokeWidth="54" strokeLinecap="round" fill="none"/>
        <path d="M 368 58 L 420 98 L 358 142 Z" fill="#8B8FD4"/>
      </svg>
      {!compact && (
        <span className="font-display text-[21px] font-bold tracking-tight text-gradient">
          DirectRefer
        </span>
      )}
    </Link>
  )
}

// ── Nav config ──────────────────────────────────────────────
interface NavItem { label: string; href: string; icon: LucideIcon; badge?: string }

function navFor(role: Role, unread: number, pendingCount: number, prefix: string): { group: string; items: NavItem[] }[] {
  const common: { group: string; items: NavItem[] }[] = []
  if (role === 'admin') {
    common.push({
      group: 'Admin',
      items: [
        { label: 'Dashboard', href: '/admin/overview', icon: LayoutDashboard },
        { label: 'Workspaces', href: '/admin/users', icon: Users },
        { label: 'Messages', href: getMessagesPath('admin'), icon: MessageSquare, badge: unread > 0 ? String(unread) : undefined },
        { label: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    })
    common.push({
      group: 'Network',
      items: [
        { label: 'Notifications', href: `${prefix}/notifications`, icon: Bell },
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
  } else {
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
      { label: 'Messages', href: getMessagesPath(role), icon: MessageSquare, badge: unread > 0 ? String(unread) : undefined },
      { label: 'Notifications', href: `${prefix}/notifications`, icon: Bell },
      ...(role === 'student' ? [{ label: 'Bookmarks', href: `${prefix}/bookmarks`, icon: Bookmark }] : []),
      { label: 'Activity', href: `${prefix}/activity`, icon: Activity },
      { label: 'Analytics', href: `${prefix}/analytics`, icon: LineChart },
    ],
  })
  return common
}

// ── Sidebar ─────────────────────────────────────────────────
function AppSidebar() {
  const { role, student, conversations, requests } = useApp()
  const { state, setOpenMobile } = useSidebar()
  const { pathname } = useLocation()
  const unread = conversations.reduce((a, c) => a + c.unread, 0)
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const urlRole = getRoleFromPath(pathname) || role
  const prefix = ROLE_ROUTE[urlRole]
  const groups = navFor(urlRole, unread, pendingCount, prefix)
  const user = student

  useEffect(() => { setOpenMobile(false) }, [setOpenMobile])

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4">
        {state === 'collapsed' ? (
          <Link to="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-label="Direct Refer — Go to homepage">
            <Zap className="h-4.5 w-4.5 fill-white text-white" />
          </Link>
        ) : (
          <Logo />
        )}
      </SidebarHeader>
      <SidebarContent className="px-2">
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
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-all duration-200',
                            isActive
                              ? 'bg-primary/10 text-foreground font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[2px] before:rounded-full before:bg-primary'
                              : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                          )}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge && (
                        <SidebarMenuBadge className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
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
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link to={`${prefix}/settings`} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all duration-200', (pathname === `${prefix}/settings` || pathname === '/settings') && 'bg-primary/10 text-primary')}>
                <Settings className="h-[18px] w-[18px]" /> <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {role === 'admin' && (
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Admin Panel">
              <Link to="/admin/overview" className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all duration-200', pathname.startsWith('/admin') && 'bg-primary/10 text-primary')}>
                <Shield className="h-[18px] w-[18px]" /> <span>Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Help & Support">
              <Link to={`${prefix}/help`} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all duration-200', (pathname === `${prefix}/help` || pathname === '/help') && 'bg-primary/10 text-primary')}>
                <CircleHelp className="h-[18px] w-[18px]" /> <span>Help & Support</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {state !== 'collapsed' && (
          <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-muted/50 p-2.5">
            <GAvatar name={user.name} gradient={user.gradient} className="h-8 w-8 text-xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{user.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{ROLE_META[urlRole].label}</div>
            </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

// ── Theme toggle ────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const dark = theme === 'dark'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" onClick={() => setTheme(dark ? 'light' : 'dark')}>
          {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{dark ? 'Light mode' : 'Dark mode'}</TooltipContent>
    </Tooltip>
  )
}

// ── Notifications menu ──────────────────────────────────────
const NOTIF_ICON: Record<string, { icon: LucideIcon; cls: string }> = {
  accepted: { icon: CheckCheck, cls: 'bg-emerald-500/10 text-emerald-500' },
  rejected: { icon: Mail, cls: 'bg-rose-500/10 text-rose-500' },
  message: { icon: MessageSquare, cls: 'bg-sky-500/10 text-sky-500' },
  view: { icon: Search, cls: 'bg-primary/10 text-primary' },
  reminder: { icon: Bell, cls: 'bg-amber-500/10 text-amber-500' },
  system: { icon: Sparkles, cls: 'bg-accent/10 text-accent' },
}

function NotificationsMenu() {
  const navigate = useNavigate()
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp()
  const { pathname } = useLocation()
  const prefix = ROLE_ROUTE[getRoleFromPath(pathname) || 'student']
  const [items, setItems] = useState(notifications)
  useEffect(() => { setItems(notifications) }, [notifications])
  const unread = items.filter((n) => !n.read).length
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-full">
          <Bell className="h-4.5 w-4.5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={0} className="w-[380px] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          <Button variant="ghost" size="sm" className="h-9 text-xs text-primary" onClick={() => { markAllNotificationsRead(); setItems(items.map((n) => ({ ...n, read: true }))) }}>
            Mark all read
          </Button>
        </div>
        <Separator />
        <ScrollArea className="h-[380px]">
          {items.slice(0, 6).map((n) => {
            const cfg = NOTIF_ICON[n.type]
            return (
              <DropdownMenuItem
                key={n.id}
                className="flex cursor-pointer items-start gap-3 px-4 py-3 focus:bg-muted/60"
                onClick={() => { markNotificationRead(n.id); setItems(items.map((x) => (x.id === n.id ? { ...x, read: true } : x))); navigate(`${prefix}/notifications`) }}
              >
                <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', cfg.cls)}>
                  <cfg.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.description}</p>
                  <span className="mt-1 block text-[11px] text-muted-foreground/70">{n.time}</span>
                </div>
              </DropdownMenuItem>
            )
          })}
        </ScrollArea>
        <Separator />
        <Button variant="ghost" className="w-full rounded-none text-sm text-primary" onClick={() => navigate(`${prefix}/notifications`)}>
          View all notifications
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Messages menu ───────────────────────────────────────────
function MessagesMenu() {
  const navigate = useNavigate()
  const { conversations } = useApp()
  const { pathname } = useLocation()
  const urlRole = getRoleFromPath(pathname) || 'student'
  const unread = conversations.reduce((a, c) => a + c.unread, 0)
  const messagesPath = getMessagesPath(urlRole)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-full">
          <MessageSquare className="h-4.5 w-4.5" />
          {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={0} className="w-[360px] max-w-[calc(100vw-2rem)] p-0">
        <div className="px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Messages</DropdownMenuLabel>
        </div>
        <Separator />
        {conversations.slice(0, 4).map((c) => (
          <DropdownMenuItem key={c.id} className="flex cursor-pointer items-center gap-3 px-4 py-3" onClick={() => navigate(`${messagesPath}?conversation=${c.id}`)}>
            <div className="relative">
              <GAvatar name={c.name} gradient={c.gradient} className="h-9 w-9 text-xs" />
              {c.online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-popover bg-emerald-500" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-medium">{c.name}</span>
                <span className="text-[11px] text-muted-foreground">{c.time}</span>
              </div>
              <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
            </div>
            {c.unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{c.unread}</span>
            )}
          </DropdownMenuItem>
        ))}
        <Separator />
        <Button variant="ghost" className="w-full rounded-none text-sm text-primary" onClick={() => navigate(messagesPath)}>
          Open messages
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
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
  flags: 'Feature Flags', audit: 'Audit Log', professional: 'Professional', recruiter: 'Recruiter',
  admin: 'Admin', 'browse-jobs': 'Browse Jobs', workspaces: 'Workspaces',
}

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

// ── Floating Action Button ──────────────────────────────────
function FAB() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const urlRole = getRoleFromPath(pathname)
  const actions = useMemo(() => {
    if (urlRole === 'student') {
      return [
        { icon: Plus, label: 'Request referral', run: () => navigate('/job-seeker/request-referral') },
        { icon: Users, label: 'Find professionals', run: () => navigate('/job-seeker/professionals') },
        { icon: FileUp, label: 'Upload resume', run: () => navigate('/job-seeker/profile') },
        { icon: Sparkles, label: 'View analytics', run: () => navigate('/job-seeker/analytics') },

      ]
    }
    if (urlRole === 'admin') {
      return [
        { icon: BarChart3, label: 'Dashboard', run: () => navigate('/admin/overview') },
        { icon: Users, label: 'Manage workspaces', run: () => navigate('/admin/users') },
        { icon: MessageSquare, label: 'Messages', run: () => navigate('/admin/messages') },
        { icon: Settings, label: 'Settings', run: () => navigate('/admin/settings') },
      ]
    }
    if (urlRole === 'professional') {
      return [
        { icon: CheckCheck, label: 'Review pending requests', run: () => navigate('/professional/referrals') },
        { icon: Briefcase, label: 'Find job seekers', run: () => navigate('/professional/talent') },
        { icon: Plus, label: 'Update profile', run: () => navigate('/professional/profile') },
        { icon: Sparkles, label: 'View analytics', run: () => navigate('/professional/analytics') },
      ]
    }
    return [
      { icon: Plus, label: 'Post a job', run: () => navigate('/recruiter/jobs') },
      { icon: Users, label: 'Search talent', run: () => navigate('/recruiter/talent') },
      { icon: Sparkles, label: 'View analytics', run: () => navigate('/recruiter/analytics') },
    ]
  }, [urlRole, navigate])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-gradient-to-br from-[#4F7CFF] to-[#7C5CFF] shadow-glow transition-all duration-200 hover:scale-105 hover:translate-y-[-2px]" aria-label="Quick actions">
          <Plus className="h-5 w-5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-60 p-1.5">
        <div className="px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</div>
        {actions.map((a) => (
          <button key={a.label} onClick={a.run} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-muted">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"><a.icon className="h-3.5 w-3.5" /></div>
            {a.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

// ── Topbar ──────────────────────────────────────────────────
function Topbar() {
  const { pathname } = useLocation()
  const urlRole = getRoleFromPath(pathname) || 'student'
  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="md:hidden h-11 w-11 shrink-0" />
      <button
        onClick={() => {
          const e = new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true })
          Object.defineProperty(e, 'metaKey', { value: true })
          Object.defineProperty(e, 'ctrlKey', { value: true })
          document.dispatchEvent(e)
        }}
        className="hidden h-9 flex-1 items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-4 text-[14px] text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-muted/60 focus:border-primary/50 focus:outline-none sm:flex sm:max-w-md"
        aria-label="Search (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search people, jobs, pages…</span>
        <kbd className="pointer-events-none inline-flex items-center gap-0.5 rounded-md border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>
      <Badge variant="outline" className="hidden border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary sm:inline-flex">
        {ROLE_META[urlRole].label}
      </Badge>
      <div className="flex-1 sm:hidden" />
      <div className="ml-auto flex items-center gap-0">
        <ThemeToggle />
        <MessagesMenu />
        <NotificationsMenu />
        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:mx-2 sm:block" />
        <WorkspaceSwitcher />
      </div>
    </header>
  )
}

// ── Shell ───────────────────────────────────────────────────
function AnimatedOutlet() {
  return <div className="flex flex-1 flex-col min-h-0"><Outlet /></div>
}

export default function AppShell() {
  return (
    <SidebarProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <AppSidebar aria-label="Main navigation" />
      <SidebarInset className="bg-background flex flex-col">
        <Topbar />
        <main id="main-content" className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-hidden" role="main">
          <Breadcrumbs />
          <AnimatedOutlet />
        </main>
        <footer className="border-t border-border min-w-0 shrink-0 px-4 py-5 text-[11px] leading-relaxed text-muted-foreground sm:text-xs" role="contentinfo" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} Direct Refer</span>
            <span className="hidden sm:inline">·</span>
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <span className="hidden sm:inline">·</span>
            <a href="https://linkedin.com/in/direct-refer" target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline underline-offset-2">LinkedIn</a>
          </div>
        </footer>
        <FAB />
      </SidebarInset>
      <LazyCommandPalette />
    </SidebarProvider>
  )
}
