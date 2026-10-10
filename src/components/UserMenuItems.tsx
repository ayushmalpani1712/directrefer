import { useNavigate, useLocation } from 'react-router'
import {
  User, Settings, Bell, ShieldCheck, Sun, Moon, LogOut, ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { GAvatar } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { ROLE_META, ROLE_ROUTE, RECRUITER_VISIBLE, getRoleFromPath, type Role } from '@/data/constants'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const ROLE_ICONS: Record<Role, LucideIcon> = {
  student: User,
  professional: ShieldCheck,
  recruiter: ShieldCheck,
  admin: ShieldCheck,
}

interface MenuItem {
  key: string
  label: string
  icon: LucideIcon
  onClick: () => void
  danger?: boolean
}

export function useWorkspaceRoles(): Role[] {
  const { isAdmin } = useApp()
  const roles: Role[] = isAdmin ? ['student', 'professional', 'admin'] : ['student', 'professional']
  if (RECRUITER_VISIBLE) roles.splice(isAdmin ? 3 : 2, 0, 'recruiter')
  return roles
}

export function useUserMenu() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { setRole, isAdmin, student, logout } = useApp()
  const { signOut, user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const urlRole = getRoleFromPath(pathname) || 'student'
  const prefix = ROLE_ROUTE[urlRole]

  useEffect(() => setMounted(true), [])

  const isDark = mounted && theme !== 'light'

  const handleSwitch = (r: Role) => {
    if (r === urlRole) return
    setRole(r)
    if (user) {
      supabase.from('users').update({ active_workspace: r }).eq('id', user.id).then(() => {}, () => {})
    }
    navigate(ROLE_ROUTE[r], { replace: true })
    toast.success(`Switched to ${ROLE_META[r].label}`)
  }

  const handleLogout = async () => {
    try {
      logout()
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Sign out failed:', err)
      toast.error('Sign out failed. Please try again.')
    }
  }

  const items: MenuItem[] = [
    {
      key: 'profile',
      label: 'My Profile',
      icon: User,
      onClick: () => navigate(`${prefix}/profile`),
    },
    {
      key: 'settings',
      label: 'Account Settings',
      icon: Settings,
      onClick: () => navigate(urlRole === 'admin' ? '/settings' : `${prefix}/settings`),
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      onClick: () => navigate(`${prefix}/notifications`),
    },
    {
      key: 'theme',
      label: mounted ? (isDark ? 'Light mode' : 'Dark mode') : 'Theme',
      icon: mounted && !isDark ? Moon : Sun,
      onClick: () => setTheme(isDark ? 'light' : 'dark'),
    },
  ]

  return { items, handleSwitch, handleLogout, urlRole, student, isAdmin }
}

export function UserMenuHeader() {
  const { student, urlRole } = useUserMenu()
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <GAvatar name={student?.name ?? 'U'} color={student?.gradient} className="h-10 w-10 text-sm" />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{student?.name ?? 'User'}</div>
        <div className="truncate text-xs text-muted-foreground">
          {student?.headline || ROLE_META[urlRole]?.label || 'User'}
        </div>
      </div>
    </div>
  )
}

export function UserMenuList({ onAction }: { onAction?: () => void }) {
  const { items, handleLogout } = useUserMenu()

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => { item.onClick(); onAction?.() }}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-foreground transition-colors active:bg-muted hover:bg-muted"
        >
          <item.icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          <span className="flex-1">{item.label}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </button>
      ))}
      <button
        onClick={() => { handleLogout(); onAction?.() }}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition-colors active:bg-muted hover:bg-muted"
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" />
        <span>Log out</span>
      </button>
    </div>
  )
}

export function WorkspaceSwitchList({ onAction }: { onAction?: () => void }) {
  const { handleSwitch, urlRole } = useUserMenu()
  const workspaceRoles = useWorkspaceRoles()

  return (
    <div className="space-y-0.5">
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Switch workspace
      </div>
      {workspaceRoles.map((r) => {
        const Icon = ROLE_ICONS[r] || User
        const isActive = urlRole === r
        return (
          <button
            key={r}
            onClick={() => { handleSwitch(r); onAction?.() }}
            className={cn(
              'flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors active:bg-muted hover:bg-muted',
              isActive && 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1">{ROLE_META[r]?.label || r}</span>
            {r === 'admin' && (
              <span className="rounded-full border border-violet-500/30 bg-violet-500/5 px-1.5 py-0.5 text-[10px] font-semibold text-violet-500">
                Admin
              </span>
            )}
            {isActive && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}
