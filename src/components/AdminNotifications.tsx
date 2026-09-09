import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, UserPlus, Flag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface AdminNotification {
  id: string
  type: string
  title: string
  description: string | null
  read: boolean
  created_at: string
  entity_type: string | null
  entity_id: string | null
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  report: Flag,
  system_alert: AlertTriangle,
  user_registration: UserPlus,
  new_user: UserPlus,
}

const TYPE_COLORS: Record<string, string> = {
  report: 'text-orange-500',
  system_alert: 'text-red-500',
  user_registration: 'text-blue-500',
  new_user: 'text-blue-500',
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function fetchAdminNotifications() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['report', 'system_alert', 'user_registration', 'new_user', 'new_report', 'system_notification'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) setNotifications(data)
      setLoading(false)
    }

    fetchAdminNotifications()

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new as AdminNotification
          if (['report', 'system_alert', 'user_registration', 'new_user', 'new_report', 'system_notification'].includes(notif.type)) {
            setNotifications((prev) => [notif, ...prev].slice(0, 20))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  if (loading || notifications.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Admin Alerts
        </span>
        {unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {expanded && (
        <div className="max-h-64 overflow-y-auto border-t border-border">
          {notifications.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] || Bell
            const colorClass = TYPE_COLORS[notif.type] || 'text-muted-foreground'
            return (
              <div
                key={notif.id}
                className={cn(
                  'flex gap-3 border-b border-border p-3 last:border-0',
                  !notif.read && 'bg-muted/50'
                )}
              >
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', colorClass)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{notif.title}</p>
                  {notif.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {notif.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
