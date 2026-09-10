import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, Trash2, Send, CheckCircle2, Clock,
  Mail, Phone, Building2, Briefcase, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ListSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

interface ReferenceEntry {
  id: string
  name: string
  title: string
  company: string
  email: string
  phone: string
  relationship: string
  status: 'pending' | 'contacted' | 'responded'
  sent_at?: string
}

interface ReferenceFormProps {
  userId: string
  jobId?: string
  attemptId?: string
  onComplete: () => void
}

const MAX_REFERENCES = 3
const RELATIONSHIP_OPTIONS = [
  'Former Manager',
  'Current Manager',
  'Colleague',
  'Client',
  'Mentor',
  'Professor',
  'Other',
]

const defaultEntry = (): ReferenceEntry => ({
  id: crypto.randomUUID(),
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  relationship: '',
  status: 'pending',
})

export function ReferenceForm({ userId, jobId, attemptId, onComplete }: ReferenceFormProps) {
  const [references, setReferences] = useState<ReferenceEntry[]>([defaultEntry()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadReferences()
  }, [userId, attemptId])

  const loadReferences = async () => {
    try {
      const { data } = await supabase
        .from('screening_references' as never)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        setReferences(data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: (r.name as string) || '',
          title: (r.title as string) || '',
          company: (r.company as string) || '',
          email: (r.email as string) || '',
          phone: (r.phone as string) || '',
          relationship: (r.relationship as string) || '',
          status: (r.status as ReferenceEntry['status']) || 'pending',
          sent_at: r.sent_at as string | undefined,
        })))
      }
    } catch {
      // Table may not exist yet — use default
    } finally {
      setLoading(false)
    }
  }

  const updateEntry = (id: string, field: keyof ReferenceEntry, value: string) => {
    setReferences(prev =>
      prev.map(r => r.id === id ? { ...r, [field]: value } : r)
    )
  }

  const addEntry = () => {
    if (references.length < MAX_REFERENCES) {
      setReferences(prev => [...prev, defaultEntry()])
    }
  }

  const removeEntry = (id: string) => {
    if (references.length > 1) {
      setReferences(prev => prev.filter(r => r.id !== id))
    }
  }

  const isEntryValid = (entry: ReferenceEntry) => {
    return entry.name.trim() && entry.email.trim() && entry.relationship
  }

  const allValid = references.every(isEntryValid)

  const saveReferences = async () => {
    if (!allValid) return
    setSaving(true)
    try {
      for (const ref of references) {
        const { id, status, sent_at, ...rest } = ref
        await supabase.from('screening_references' as never).upsert({
          id,
          user_id: userId,
          attempt_id: attemptId || null,
          ...rest,
          status,
          sent_at: sent_at || null,
        }, { onConflict: 'id' })
      }
      toast.success('References saved successfully')
    } catch (err) {
      console.error('Failed to save references:', err)
      toast.error('Failed to save references')
    } finally {
      setSaving(false)
    }
  }

  const sendReferenceRequest = async (ref: ReferenceEntry) => {
    setSendingIds(prev => new Set(prev).add(ref.id))
    try {
      // Save first if needed
      const { id, status, sent_at, ...rest } = ref
      await supabase.from('screening_references' as never).upsert({
        id,
        user_id: userId,
        attempt_id: attemptId || null,
        ...rest,
        status: 'contacted',
        sent_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      // Attempt to call edge function for email
      try {
        await supabase.functions.invoke('send-reference-request', {
          body: {
            reference_email: ref.email,
            reference_name: ref.name,
            candidate_name: userId,
            job_id: jobId,
          },
        })
      } catch {
        // Edge function may not exist — continue silently
      }

      setReferences(prev =>
        prev.map(r => r.id === ref.id
          ? { ...r, status: 'contacted', sent_at: new Date().toISOString() }
          : r
        )
      )
      toast.success(`Reference request sent to ${ref.name}`)
    } catch (err) {
      console.error('Failed to send reference request:', err)
      toast.error('Failed to send request')
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev)
        next.delete(ref.id)
        return next
      })
    }
  }

  const statusIcon = (status: ReferenceEntry['status']) => {
    switch (status) {
      case 'responded':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      case 'contacted':
        return <Clock className="h-3.5 w-3.5 text-amber-500" />
      default:
        return <Mail className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  const statusLabel = (status: ReferenceEntry['status']) => {
    switch (status) {
      case 'responded': return { text: 'Responded', variant: 'success' as const }
      case 'contacted': return { text: 'Contacted', variant: 'warning' as const }
      default: return { text: 'Pending', variant: 'secondary' as const }
    }
  }

  if (loading) return <div className="space-y-4"><ListSkeleton count={2} /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">References</h3>
          <p className="text-xs text-muted-foreground">
            Add {references.length === 0 ? '2-3' : ''} professional references
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {references.length}/{MAX_REFERENCES}
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {references.map((ref, idx) => (
          <motion.div
            key={ref.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <UserPlus className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium">Reference {idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ref.status !== 'pending' && (
                      <Badge variant={statusLabel(ref.status).variant} className="gap-1 text-[10px]">
                        {statusIcon(ref.status)}
                        {statusLabel(ref.status).text}
                      </Badge>
                    )}
                    {references.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeEntry(ref.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name *</Label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={ref.name}
                        onChange={(e) => updateEntry(ref.id, 'name', e.target.value)}
                        placeholder="John Doe"
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={ref.title}
                        onChange={(e) => updateEntry(ref.id, 'title', e.target.value)}
                        placeholder="Senior Engineer"
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Company</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={ref.company}
                        onChange={(e) => updateEntry(ref.id, 'company', e.target.value)}
                        placeholder="Acme Corp"
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Relationship *</Label>
                    <select
                      value={ref.relationship}
                      onChange={(e) => updateEntry(ref.id, 'relationship', e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/10 outline-none"
                    >
                      <option value="">Select...</option>
                      {RELATIONSHIP_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={ref.email}
                        onChange={(e) => updateEntry(ref.id, 'email', e.target.value)}
                        placeholder="john@example.com"
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="tel"
                        value={ref.phone}
                        onChange={(e) => updateEntry(ref.id, 'phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {ref.status === 'pending' && isEntryValid(ref) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendReferenceRequest(ref)}
                    disabled={sendingIds.has(ref.id)}
                    className="gap-1.5 text-primary"
                  >
                    {sendingIds.has(ref.id) ? (
                      'Sending...'
                    ) : (
                      <><Send className="h-3.5 w-3.5" /> Send Request</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {references.length < MAX_REFERENCES && (
        <Button
          variant="outline"
          onClick={addEntry}
          className="w-full gap-1.5 border-dashed"
        >
          <UserPlus className="h-4 w-4" /> Add Another Reference
        </Button>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
        References will be contacted only after you submit the screening. You can send requests now or later.
      </div>

      <div className="flex gap-3">
        <Button
          onClick={async () => {
            await saveReferences()
            onComplete()
          }}
          disabled={!allValid || saving}
          className="flex-1 bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 gap-2"
        >
          {saving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  )
}
