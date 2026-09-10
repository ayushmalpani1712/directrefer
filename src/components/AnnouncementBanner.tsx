import { useState, useEffect } from 'react'
import { X, Info, AlertTriangle, Wrench } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Announcement } from '@/lib/db'

const typeStyles: Record<string, { bg: string; border: string; icon: typeof Info }> = {
  info: { bg: 'bg-primary/5', border: 'border-primary/20', icon: Info },
  warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: AlertTriangle },
  maintenance: { bg: 'bg-rose-500/5', border: 'border-rose-500/20', icon: Wrench },
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('dr_dismissed_announcements')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('id, title, content, type, is_active, created_at, expires_at, created_by')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (!data) return
      const now = new Date()
      const active = data.filter((a) => {
        if (dismissed.has(a.id)) return false
        if (a.expires_at && new Date(a.expires_at) < now) return false
        return true
      })
      setAnnouncements(active)
    }
    load()
  }, [dismissed])

  const dismiss = (id: string) => {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    localStorage.setItem('dr_dismissed_announcements', JSON.stringify([...next]))
  }

  if (announcements.length === 0) return null

  return (
    <div className="w-full">
      <AnimatePresence>
        {announcements.map((a) => {
          const style = typeStyles[a.type] || typeStyles.info
          const Icon = style.icon
          return (
            <motion.div
              key={a.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`border-b ${style.bg} ${style.border}`}
            >
              <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 text-sm">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">{a.title}</span>
                <span className="text-muted-foreground hidden sm:inline">{a.content}</span>
                <button
                  onClick={() => dismiss(a.id)}
                  className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
