import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCheck, FileText, MoreVertical, Paperclip, Pin, Search, Send, Smile,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState, GAvatar } from '@/components/ui-kit'
import { MessageIllustration } from '@/components/illustrations'
import { toast } from 'sonner'
import { useApp } from '@/context/AppContext'
import { checkRateLimit, checkServerRateLimit } from '@/lib/rateLimit'
import { usePageLoading } from '@/hooks/usePageLoading'
import { cn } from '@/lib/utils'

export default function Messages() {
  const loading = usePageLoading(400)
  const { conversations, sendMessage, markConversationRead } = useApp()
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const active = conversations.find((c) => c.id === activeId)
  const sorted = [...conversations]
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages.length, activeId])

  useEffect(() => {
    if (activeId) markConversationRead(activeId)
  }, [activeId, markConversationRead])

  if (conversations.length === 0 && !loading) {
    return (
      <div className="flex h-[calc(100vh-13rem)] min-h-[480px] items-center justify-center rounded-2xl border border-border bg-card">
        <EmptyState
          illustration={<MessageIllustration />}
          title="Start a conversation"
          description="No messages yet. Once you send or receive a referral request, you'll be able to chat directly with professionals and recruiters here."
          primaryCtaLabel="Browse professionals"
          primaryCtaHref="/job-seeker/professionals"
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
    )
  }

  const send = async (kind: 'text' | 'file' = 'text', text?: string) => {
    if (!activeId) return
    if (!checkRateLimit('message-send', 30, 60_000)) {
      toast.error('Slow down! You can send up to 30 messages per minute.')
      return
    }
    if (!await checkServerRateLimit('message', 30, 300)) {
      toast.error('Message rate limit exceeded. Please wait before sending more.')
      return
    }
    const body = kind === 'file' ? (text ?? 'Resume.pdf') : draft.trim()
    if (!body) return
    try {
      sendMessage(activeId, body)
      setDraft('')
    } catch (err) {
      console.error('Failed to send message:', err)
      toast.error('Failed to send message')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    send('file', file.name)
    e.target.value = ''
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[480px] overflow-hidden rounded-2xl border border-border bg-card">
      {/* Conversation list */}
      <aside className={cn('w-full flex-col border-r border-border sm:flex sm:w-80', activeId && 'hidden sm:flex')}>
        <div className="border-b border-border p-4">
          <h2 className="font-display text-lg font-bold">Messages</h2>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations…" className="h-9 rounded-full pl-9" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {sorted.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn('flex w-full items-center gap-3 border-b border-border/60 px-4 py-3.5 text-left transition-colors hover:bg-muted/50', activeId === c.id && 'bg-primary/[0.06]')}
            >
              <div className="relative shrink-0">
                <GAvatar name={c.name} gradient={c.gradient} className="h-11 w-11 text-xs" />
                {c.online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {c.pinned && <Pin className="h-3 w-3 rotate-45 text-muted-foreground" />}{c.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{c.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                  {c.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{c.unread}</span>}
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </aside>

      {/* Chat pane */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {conversations.length === 0 ? 'No conversations yet' : 'Select a conversation'}
          </div>
        ) : (<>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button className="text-muted-foreground sm:hidden" onClick={() => setActiveId('')}>←</button>
          <GAvatar name={active.name} gradient={active.gradient} className="h-9 w-9 text-xs" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{active.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {active.online ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online · {active.subtitle}</> : `Away · ${active.subtitle}`}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => { try { await navigator.clipboard.writeText(active.messages.map(m => `${m.from === 'me' ? 'You' : active.name}: ${m.text}`).join('\n')); toast.success('Chat copied to clipboard') } catch { toast.error('Failed to copy') } }}><MoreVertical className="h-4 w-4" /></Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {active.messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn('flex max-w-[75%] items-end gap-2', m.from === 'me' && 'flex-row-reverse')}>
                    {m.from === 'them' && <GAvatar name={active.name} gradient={active.gradient} className="h-7 w-7 text-[9px]" />}
                    <div>
                      {m.kind === 'file' ? (
                        <div className={cn('flex items-center gap-3 rounded-2xl border p-3.5', m.from === 'me' ? 'border-primary/30 bg-primary/10' : 'border-border bg-muted/60')}>
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary"><FileText className="h-5 w-5" /></div>
                          <div>
                            <div className="text-sm font-medium">{m.text}</div>
                            <div className="text-[11px] text-muted-foreground">{m.text || 'Shared file'}</div>
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                          m.from === 'me' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted',
                        )}>
                          {m.text}
                        </div>
                      )}
                      <div className={cn('mt-1 flex items-center gap-1 text-[10px] text-muted-foreground', m.from === 'me' && 'justify-end')}>
                        {m.time} {m.from === 'me' && <CheckCheck className="h-3 w-3 text-sky-500" />}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="border-t border-border p-3.5">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="*/*" />
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4.5 w-4.5" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => send('file')} title="Share resume">
              <FileText className="h-4.5 w-4.5 text-primary" />
            </Button>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={`Message ${active.name.split(' ')[0]}…`}
              className="h-10 rounded-full"
            />
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setDraft((prev) => prev + '👍')}><Smile className="h-4.5 w-4.5" /></Button>
            <Button size="icon" className="h-10 w-10 shrink-0 rounded-full bg-primary shadow-glow" onClick={() => send()} disabled={!draft.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </>)}
      </div>
    </div>
  )
}
