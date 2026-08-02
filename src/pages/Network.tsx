import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  Activity as ActivityIcon, Bell, Bookmark as BookmarkIcon, BookmarkCheck, CheckCheck,
  Filter, Mail, MessageSquare, Search, Send, Settings2, Sparkles, User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, SectionHeader } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ProfessionalCard } from '@/pages/FindProfessionals'

const ICONS: Record<string, { icon: typeof Bell; cls: string }> = {
  accepted: { icon: CheckCheck, cls: 'bg-emerald-500/10 text-emerald-500' },
  rejected: { icon: Mail, cls: 'bg-rose-500/10 text-rose-500' },
  message: { icon: MessageSquare, cls: 'bg-sky-500/10 text-sky-500' },
  view: { icon: Search, cls: 'bg-[#3B5FE5]/10 text-[#3B5FE5]' },
  reminder: { icon: Bell, cls: 'bg-amber-500/10 text-amber-500' },
  system: { icon: Sparkles, cls: 'bg-[#8B8FD4]/10 text-[#8B8FD4]' },
}

export function NotificationsPage() {
  const loading = usePageLoading(350)
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp()
  const [filter, setFilter] = useState('all')
  const shown = filter === 'all' ? notifications : filter === 'unread' ? notifications.filter((n) => !n.read) : notifications.filter((n) => n.type === filter)

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <SectionHeader title="Notifications" subtitle={`${notifications.filter((n) => !n.read).length} unread`} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markAllNotificationsRead()}><CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read</Button>
          <Button variant="ghost" size="icon" asChild><Link to="/settings"><Settings2 className="h-4.5 w-4.5" /></Link></Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="h-auto flex-wrap">
          {['all', 'unread', 'accepted', 'message', 'system'].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {shown.length === 0 ? (
        <EmptyState icon={Bell} title="All caught up" description="No notifications in this category right now." />
      ) : (
        <div className="space-y-2.5">
          {shown.map((n, i) => {
            const cfg = ICONS[n.type]
            return (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => markNotificationRead(n.id)}
                className={cn('flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all hover:border-primary/30', n.read ? 'border-border bg-card' : 'border-primary/25 bg-primary/[0.03]')}
              >
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cfg.cls)}><cfg.icon className="h-4.5 w-4.5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.description}</p>
                  <span className="mt-1 block text-xs text-muted-foreground/70">{n.time}</span>
                </div>
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function BookmarksPage() {
  const loading = usePageLoading(350)
  const { visibleProfessionals: professionals, bookmarks } = useApp()
  const saved = professionals.filter((p) => bookmarks.includes(p.id))

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>

  return (
    <div className="space-y-6">
      <SectionHeader title="Bookmarks" subtitle="Professionals you've saved for later" />
      {saved.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="No bookmarks yet"
          description="Save professionals while browsing and they'll show up here."
          action={<Button asChild><Link to="/professionals">Browse professionals</Link></Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((p, i) => <ProfessionalCard key={p.id} p={p} index={i} />)}
        </div>
      )}
    </div>
  )
}

const ACT_ICON: Record<string, { icon: typeof Bell; cls: string }> = {
  referral: { icon: Send, cls: 'bg-primary/10 text-primary' },
  profile: { icon: User, cls: 'bg-emerald-500/10 text-emerald-500' },
  bookmark: { icon: BookmarkCheck, cls: 'bg-amber-500/10 text-amber-500' },
  message: { icon: MessageSquare, cls: 'bg-sky-500/10 text-sky-500' },
}

export function ActivityPage() {
  const loading = usePageLoading(350)
  const { activity } = useApp()
  if (loading) return <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionHeader title="Activity feed" subtitle="A timeline of everything happening on your account" />
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="relative space-y-6 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-px before:bg-border">
            {activity.map((a, i) => {
              const cfg = ACT_ICON[a.kind] ?? ACT_ICON.profile
              return (
                <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative flex gap-4">
                  <div className={cn('z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-card', cfg.cls)}>
                    <cfg.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 pt-1.5">
                    <p className="text-sm leading-snug">{a.text}</p>
                    <span className="text-xs text-muted-foreground">{a.time}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ActivityIcon className="h-3.5 w-3.5" /> Activity is retained for 90 days · <Filter className="h-3 w-3" /> Export available in Settings
      </div>
    </div>
  )
}
