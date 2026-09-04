import { Outlet, Link, useLocation } from 'react-router'
import { LayoutDashboard, Users, ShieldCheck, BarChart3, Settings, History, Flag, BadgeCheck, TrendingUp, Send } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin/overview', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/referrals', label: 'Referrals', icon: Send },
  { to: '/admin/approvals', label: 'Approvals', icon: BadgeCheck },
  { to: '/admin/moderation', label: 'Moderation', icon: Flag },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/acquisition', label: 'Acquisition', icon: TrendingUp },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/audit-log', label: 'Audit Log', icon: History },
]

export default function AdminShell() {
  const { role } = useApp()
  const { pathname } = useLocation()

  if (role !== 'admin') {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Access Denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + '/')
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          )
        })}
      </div>
      <Outlet />
    </div>
  )
}
