import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router'
import { ShieldCheck, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import AdminNotifications from '@/components/AdminNotifications'
import { ADMIN_GROUPS, adminGroupForPath, type AdminNavGroup } from '@/data/admin-nav'
import { useMobile } from '@/hooks/use-mobile'

function GroupCards({ onOpen }: { onOpen: (g: AdminNavGroup) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ADMIN_GROUPS.filter((g) => g.id !== 'overview').map((group) => {
        const Icon = group.icon
        return (
          <button
            key={group.id}
            onClick={() => onOpen(group)}
            className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 text-left transition-all duration-200 hover:border-primary/40 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-foreground">{group.label}</div>
              <div className="mt-0.5 truncate text-[13px] text-muted-foreground">{group.description}</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          </button>
        )
      })}
    </div>
  )
}

function GroupDrawer({ group, onClose }: { group: AdminNavGroup; onClose: () => void }) {
  const { pathname } = useLocation()
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-background pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <group.icon className="h-4 w-4 text-primary" />
            <span className="text-base font-semibold">{group.label}</span>
          </div>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg active:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-1 p-3">
          {group.items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={cn(
                  'flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors active:bg-muted',
                  active ? 'bg-primary/10 text-primary' : 'text-foreground'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function AdminShell() {
  const { role } = useApp()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isMobile = useMobile()
  const [openGroup, setOpenGroup] = useState<AdminNavGroup | null>(null)
  const currentGroup = adminGroupForPath(pathname)
  const isOverview = pathname === '/admin/overview' || pathname === '/admin'

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

  if (isMobile) {
    return (
      <div className="space-y-4">
        <AdminNotifications />
        {!isOverview && currentGroup && (
          <div className="-mx-1 flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => navigate('/admin/overview')}
              className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-muted/50 px-2.5 text-[13px] font-medium text-muted-foreground active:bg-muted"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Groups
            </button>
            {currentGroup.items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + '/')
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground active:bg-muted'
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
        {isOverview && <GroupCards onOpen={setOpenGroup} />}
        <Outlet />
        {openGroup && <GroupDrawer group={openGroup} onClose={() => setOpenGroup(null)} />}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AdminNotifications />
      <Outlet />
    </div>
  )
}
