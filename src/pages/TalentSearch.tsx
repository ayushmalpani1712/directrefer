import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, MapPin, MessageSquare, Search, Star, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Chip, EmptyState, GAvatar, SectionHeader } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'

export default function TalentSearch() {
  const loading = usePageLoading(400)
  const { candidates, savedCandidates, toggleCandidate, addRequest, visibleProfessionals: professionals } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [source, setSource] = useState('all')
  const [minRating, setMinRating] = useState('0')

  const results = useMemo(() => candidates.filter((c) => {
    if (c.id === user?.id) return false
    if (q && ![c.name, c.role, c.location, ...c.skills].join(' ').toLowerCase().includes(q.toLowerCase())) return false
    if (source !== 'all' && c.source !== source) return false
    if (c.rating < Number(minRating)) return false
    return true
  }), [q, source, minRating, candidates, user?.id])

  return (
    <div className="space-y-6">
      <SectionHeader title="Discover job seekers" subtitle="Open-to-work candidates and referral-warmed talent — sorted by fit" />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, role, skill or location…" className="h-12 rounded-xl pl-11 text-[15px] " />
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="h-12 sm:w-44"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="Referral">Referral</SelectItem>
            <SelectItem value="Open to work">Open to work</SelectItem>
          </SelectContent>
        </Select>
        <Select value={minRating} onValueChange={setMinRating}>
          <SelectTrigger className="h-12 sm:w-44"><SelectValue placeholder="Min rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any rating</SelectItem>
            <SelectItem value="4">4.0+</SelectItem>
            <SelectItem value="4.5">4.5+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates match"
          description="Try broadening your search or lowering the rating filter."
          action={
            (q || source !== 'all' || minRating !== '0') ? (
              <Button variant="ghost" size="sm" onClick={() => { setQ(''); setSource('all'); setMinRating('0') }}>Clear filters</Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {results.map((c, i) => {
              const saved = savedCandidates.includes(c.id)
              return (
                <motion.div key={c.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                  <Card className="shadow-soft h-full cursor-pointer transition-all duration-200 hover:border-primary/15" onClick={() => navigate(`/job-seekers/${c.id}`)}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <GAvatar name={c.name} gradient={c.gradient} className="h-11 w-11 text-sm" />
                          <div>
                            <div className="text-sm font-semibold">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.role} · {c.exp}y exp</div>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleCandidate(c.id); toast(saved ? 'Removed from saved' : 'Candidate saved') }} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-primary">
                          {saved ? <BookmarkCheck className="h-4.5 w-4.5 text-primary" /> : <Bookmark className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {c.location}</span>
                        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> <b className="text-foreground">{c.rating}</b></span>
                        <Chip tone={c.source === 'Referral' ? 'primary' : 'default'}>{c.source}</Chip>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">{c.skills.map((s) => <Chip key={s}>{s}</Chip>)}</div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" className="flex-1 rounded-lg bg-primary" onClick={(e) => {
                          e.stopPropagation()
                          const pro = professionals.find((p) => p.id === user?.id)
                          if (!pro) { toast.error('No professional profile found. Complete your profile first.'); return }
                          addRequest({
                            id: `r${Date.now()}`,
                            student: c.name,
                            studentEmail: user?.email,
                            professionalId: pro.id,
                            role: c.role,
                            status: 'pending',
                            pipelineStage: 'request_sent',
                            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            note: `Referral request for ${c.name} — ${c.role}`,
                            progress: 15,
                          })
                          toast.success(`Referral request sent for ${c.name}`)
                        }}>
                          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={(e) => { e.stopPropagation(); navigate('/messages') }}>
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
