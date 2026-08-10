import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, CheckCheck, Download, FileText, Image, MoreVertical, Paperclip, Pin, Search, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState, GAvatar } from '@/components/ui-kit'
import { MessageIllustration } from '@/components/illustrations'
import { toast } from 'sonner'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { checkRateLimit, checkServerRateLimit } from '@/lib/rateLimit'
import { usePageLoading } from '@/hooks/usePageLoading'
import { cn } from '@/lib/utils'
import { MessagesSkeleton } from '@/components/ui/skeleton'
import ResumePreview from '@/components/ResumePreview'
import { supabase } from '@/lib/supabase'
import { getRoleFromPath, profileUrl, type Role, type Conversation } from '@/data/mock'
import { fetchConversations } from '@/lib/db'

interface FileInfo {
  type: string
  name: string
  url: string
}

function parseFileContent(text: string): FileInfo | null {
  try {
    const parsed = JSON.parse(text)
    if (parsed.type === 'file' && parsed.name) return { type: 'file', name: parsed.name, url: parsed.url || '' }
  } catch { /* not JSON */ }
  return null
}

function getFileExtension(name: string): string {
  return (name.split('.').pop() || '').toLowerCase()
}

function isImageFile(name: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)
}

function isPdfFile(name: string): boolean {
  return /\.pdf$/i.test(name)
}

function getFileIcon(name: string) {
  if (isImageFile(name)) return Image
  if (isPdfFile(name)) return FileText
  if (/\.(csv|xlsx|xls)$/i.test(name)) return FileText
  if (/\.(doc|docx)$/i.test(name)) return FileText
  return FileText
}

function getFileColor(name: string): string {
  if (isPdfFile(name)) return 'text-red-500 bg-red-500/10'
  if (isImageFile(name)) return 'text-blue-500 bg-blue-500/10'
  if (/\.(csv|xlsx|xls)$/i.test(name)) return 'text-green-500 bg-green-500/10'
  if (/\.(doc|docx)$/i.test(name)) return 'text-blue-600 bg-blue-600/10'
  return 'text-primary bg-primary/10'
}

function getProfilePath(role?: string, userId?: string, slug?: string): string | null {
  if (!userId) return null
  return profileUrl(role ?? '', userId, slug)
}

function linkify(text: string): (string | React.JSX.Element)[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-90 hover:opacity-100">
          {part}
        </a>
      )
    }
    return part
  })
}

function FileAttachment({ fileInfo, isMe }: { fileInfo: FileInfo; isMe: boolean }) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const name = fileInfo.name
  const url = fileInfo.url
  const hasUrl = !!url

  const Icon = getFileIcon(name)
  const colorClass = getFileColor(name)

  const handlePreviewClick = useCallback(() => {
    if (!hasUrl) {
      toast.info('File was shared without an upload — no download available')
      return
    }
    if (isPdfFile(name)) {
      setPreviewOpen(true)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [hasUrl, name, url])

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!hasUrl) return
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [hasUrl, url, name])

  if (isImageFile(name) && hasUrl && !imgError) {
    return (
      <>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'block overflow-hidden rounded-2xl border transition-all hover:shadow-md max-w-[70vw] sm:max-w-[280px]',
            isMe ? 'border-primary/30' : 'border-border'
          )}
        >
          <img
            src={url}
            alt={name}
            className="w-full h-auto object-cover hover:opacity-90 transition-opacity"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <div className={cn(
            'flex items-center justify-between px-3 py-1.5 text-[11px]',
            isMe ? 'bg-primary/10 text-primary-foreground/80' : 'bg-muted text-muted-foreground'
          )}>
            <span className="truncate">{name}</span>
            <Download className="h-3 w-3 shrink-0 ml-2" />
          </div>
        </a>
        {isPdfFile(name) && (
          <ResumePreview url={url} fileName={name} open={previewOpen} onOpenChange={setPreviewOpen} />
        )}
      </>
    )
  }

  return (
    <>
      <button
        onClick={handlePreviewClick}
        className={cn(
          'flex items-center gap-3 rounded-2xl border p-3 text-left transition-all max-w-[85vw] sm:max-w-[300px]',
          hasUrl ? 'hover:scale-[1.01] hover:shadow-md cursor-pointer' : 'cursor-default opacity-80',
          isMe ? 'border-primary/30 bg-primary/10 hover:bg-primary/15' : 'border-border bg-muted/60 hover:bg-muted/80'
        )}
      >
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{name}</div>
          <div className="text-[11px] text-muted-foreground">
            {hasUrl ? (
              <span className="flex items-center gap-1">
                {isPdfFile(name) ? 'Click to preview' : 'Click to open'}
                <span className="text-muted-foreground/60">· {getFileExtension(name).toUpperCase()}</span>
              </span>
            ) : 'Shared without file data'}
          </div>
        </div>
        {hasUrl && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleDownload}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDownload(e as unknown as React.MouseEvent) }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-primary/15 transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </button>
      {isPdfFile(name) && hasUrl && (
        <ResumePreview url={url} fileName={name} open={previewOpen} onOpenChange={setPreviewOpen} />
      )}
    </>
  )
}

export default function Messages() {
  const loading = usePageLoading(400)
  const { sendMessage, markConversationRead, student } = useApp()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const urlRole: Role = getRoleFromPath(pathname)
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchConversations(user.id, urlRole).then((convs) => {
      if (!cancelled) setConversations(convs)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [user?.id, urlRole])

  const active = conversations.find((c) => c.id === activeId)
  const sorted = [...conversations]
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))

  useEffect(() => {
    const convId = searchParams.get('conversation')
    if (convId) {
      setActiveId(convId)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

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
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-border bg-card">
        <EmptyState
          illustration={<MessageIllustration />}
          title="Start a conversation"
          description="No messages yet. Once you send or receive a referral request, you'll be able to chat directly with professionals and recruiters here."
          primaryCtaLabel={urlRole === 'student' ? 'Browse professionals' : urlRole === 'professional' ? 'Discover talent' : 'Browse talent'}
          primaryCtaHref={urlRole === 'student' ? '/job-seeker/professionals' : urlRole === 'professional' ? '/professional/talent' : '/recruiter/talent'}
        />
      </div>
    )
  }

  if (loading) return <MessagesSkeleton />

  const send = async (kind: 'text' | 'file' = 'text', _text?: string, fileUrl?: string, fileName?: string) => {
    if (!activeId) return
    if (!checkRateLimit('message-send', 30, 60_000)) {
      toast.error('Slow down! You can send up to 30 messages per minute.')
      return
    }
    if (!await checkServerRateLimit('message', 30, 300)) {
      toast.error('Message rate limit exceeded. Please wait before sending more.')
      return
    }
    const body = kind === 'file' ? (fileName ?? 'File') : draft.trim()
    if (!body) return
    sendMessage(activeId, body, kind, fileUrl, fileName)
    setDraft('')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)

    try {
      const ext = file.name.split('.').pop() || 'bin'
      const path = `chat/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(path, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })

      if (error) {
        console.warn('Storage upload failed:', error.message)
        send('file', file.name, undefined, file.name)
        toast.error('File upload failed — please try again')
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(data.path)
      send('file', file.name, urlData.publicUrl, file.name)
    } catch (err) {
      console.error('File upload failed:', err)
      send('file', file.name, undefined, file.name)
      toast.error('File upload failed — please try again')
    } finally {
      setUploading(false)
    }
  }

  const profilePath = getProfilePath(active?.otherUserRole, active?.otherUserId, active?.otherUserSlug)

  return (
    <div className="flex h-full min-h-[400px] overflow-hidden rounded-2xl border border-border bg-card">
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
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {conversations.length === 0 ? 'No conversations yet' : 'Select a conversation'}
          </div>
        ) : (<>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:hidden" onClick={() => setActiveId('')} aria-label="Back to conversations">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {profilePath ? (
            <Link to={profilePath}>
              <GAvatar name={active.name} gradient={active.gradient} className="h-9 w-9 text-xs cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" />
            </Link>
          ) : (
            <GAvatar name={active.name} gradient={active.gradient} className="h-9 w-9 text-xs" />
          )}
          <div className="min-w-0 flex-1">
            {profilePath ? (
              <Link to={profilePath} className="truncate text-sm font-semibold hover:text-primary transition-colors">{active.name}</Link>
            ) : (
              <div className="truncate text-sm font-semibold">{active.name}</div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {active.online ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online · {active.subtitle}</> : `Away · ${active.subtitle}`}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={async () => { try { await navigator.clipboard.writeText(active.messages.map(m => {
            const fi = m.kind === 'file' ? parseFileContent(m.text) : null
            return `${m.from === 'me' ? 'You' : active.name}: ${fi ? `📎 ${fi.name}` : m.text}`
          }).join('\n')); toast.success('Chat copied to clipboard') } catch { toast.error('Failed to copy') } }}><MoreVertical className="h-4 w-4" /></Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {active.messages.map((m) => {
                const fileInfo = m.kind === 'file' ? parseFileContent(m.text) : null
                const displayText = fileInfo ? fileInfo.name : m.text

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn('flex max-w-[75%] items-end gap-2', m.from === 'me' && 'flex-row-reverse')}>
                      {m.from === 'them' && <GAvatar name={active.name} gradient={active.gradient} className="h-7 w-7 text-[9px]" />}
                      <div>
                        {fileInfo ? (
                          <FileAttachment fileInfo={fileInfo} isMe={m.from === 'me'} />
                        ) : (
                          <div className={cn(
                            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                            m.from === 'me' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted',
                          )}>
                            {linkify(displayText)}
                          </div>
                        )}
                        <div className={cn('mt-1 flex items-center gap-1 text-[10px] text-muted-foreground', m.from === 'me' && 'justify-end')}>
                          {m.time} {m.from === 'me' && <CheckCheck className="h-3 w-3 text-sky-500" />}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="shrink-0 border-t border-border p-3.5">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp" />
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Send file">
              {uploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              ) : (
                <Paperclip className="h-4.5 w-4.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              title={student?.resumeFile?.url ? 'Share your resume' : 'No resume attached'}
              disabled={!student?.resumeFile?.url || uploading}
              onClick={() => {
                if (student?.resumeFile?.url) {
                  send('file', student.resumeFile.name, student.resumeFile.url, student.resumeFile.name)
                  toast.success('Resume shared')
                } else {
                  toast.info('No resume attached. Upload one from your profile.')
                }
              }}
            >
              <FileText className={cn('h-4.5 w-4.5', student?.resumeFile?.url ? 'text-primary' : 'text-muted-foreground opacity-50')} />
            </Button>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={`Message ${active.name.split(' ')[0]}…`}
              className="h-10 rounded-full"
            />
            <Button size="icon" className="h-10 w-10 shrink-0 rounded-full bg-primary shadow-glow" onClick={() => send()} disabled={!draft.trim() || uploading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </>)}
      </div>
    </div>
  )
}
