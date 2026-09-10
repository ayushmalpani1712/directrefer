import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, MapPin, MessageSquare, Search, SlidersHorizontal, Target, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { Chip, EmptyState, GAvatar, SectionHeader } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { getMessagesPath, profileUrl } from '@/data/constants'

function computeSkillOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a.map((s) => s.toLowerCase()))
  const setB = new Set(b.map((s) => s.toLowerCase()))
  let overlap = 0
  for (const s of setA) { if (setB.has(s)) overlap++ }
  return Math.round((overlap / Math.max(setA.size, setB.size)) * 100)
}

function matchColor(pct: number): string {
  if (pct >= 70) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
  if (pct >= 40) return 'bg-amber-500/10 text-amber-600 border-amber-500/25'
  return 'bg-muted text-muted-foreground border-border'
}

type SortKey = 'match' | 'experience' | 'name'

export default function TalentSearch() {
  const loading = usePageLoading(400)
  const { candidates, savedCandidates, toggleCandidate, startConversation, role, refreshCandidates, student, professionals } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [source, setSource] = useState('all')
  const [minMatch, setMinMatch] = useState('0')
  const [sortBy, setSortBy] = useState<SortKey>('match')

  useEffect(() => { refreshCandidates() }, [refreshCandidates])

  const mySkills = useMemo(() => {
    if (role === 'professional') {
      const me = professionals.find((p) => p.id === user?.id)
      return me?.skills ?? []
    }
    return student?.skills ?? []
  }, [role, professionals, user?.id, student?.skills])

  const scored = useMemo(() => candidates.map((c) => ({
    ...c,
    matchScore: computeSkillOverlap(mySkills, c.skills),
  })), [candidates, mySkills])

  const results = useMemo(() => {
    const filtered = scored.filter((c) => {
      if (role === 'professional' && c.profileRole !== 'job-seeker') return false
      if (q && ![c.name, c.role, c.location, ...c.skills].join(' ').toLowerCase().includes(q.toLowerCase())) return false
      if (source !== 'all' && c.source !== source) return false
      if (c.matchScore < Number(minMatch)) return false
      return true
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'match': return b.matchScore - a.matchScore
        case 'experience': return b.exp - a.exp
        case 'name': return a.name.localeCompare(b.name)
        default: return 0
      }
    })

    return filtered
  }, [scored, q, source, minMatch, sortBy, role])

  return (
    <div className="space-y-6">
      <SectionHeader title={role === 'professional' ? 'Find job seekers' : 'Discover talent'} subtitle={role === 'professional' ? 'Open-to-work candidates ranked by skill match' : 'Open-to-work candidates and referral-warmed talent — ranked by fit'} />

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
            {role !== 'professional' && <SelectItem value="Open for referrals">Open for referrals</SelectItem>}
          </SelectContent>
        </Select>
        <Select value={minMatch} onValueChange={setMinMatch}>
          <SelectTrigger className="h-12 sm:w-44"><SelectValue placeholder="Min match" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any match</SelectItem>
            <SelectItem value="20">20%+</SelectItem>
            <SelectItem value="40">40%+</SelectItem>
            <SelectItem value="60">60%+</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="h-12 sm:w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="match"><SlidersHorizontal className="mr-1.5 inline h-3.5 w-3.5" />Match score</SelectItem>
            <SelectItem value="experience"><SlidersHorizontal className="mr-1.5 inline h-3.5 w-3.5" />Experience</SelectItem>
            <SelectItem value="name"><SlidersHorizontal className="mr-1.5 inline h-3.5 w-3.5" />Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mySkills.length === 0 && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          Add skills to your profile to see match scores for each candidate.
        </div>
      )}

      {loading ? (
        <SkeletonGrid count={6} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates match"
          description="Try broadening your search or lowering the match filter."
          action={
            (q || source !== 'all' || minMatch !== '0') ? (
              <Button variant="ghost" size="sm" onClick={() => { setQ(''); setSource('all'); setMinMatch('0') }}>Clear filters</Button>
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
                  <Card className="h-full cursor-pointer transition-all duration-200 hover:border-border/80" onClick={() => navigate(profileUrl(c.profileRole || 'job-seeker', c.id, c.slug))}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <GAvatar name={c.name} color={c.gradient} className="h-11 w-11 text-sm" />
                          <div>
                            <div className="text-sm font-semibold">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.role} · {c.exp}y exp</div>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleCandidate(c.id); toast(saved ? 'Removed from saved' : 'Candidate saved') }} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary">
                          {saved ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {c.location}</span>
                        {mySkills.length > 0 && (
                          <Badge variant="outline" className={`gap-1 text-[10px] font-semibold ${matchColor(c.matchScore)}`}>
                            <Target className="h-3 w-3" /> {c.matchScore}% match
                          </Badge>
                        )}
                        <Chip tone={c.source === 'Referral' ? 'primary' : 'default'}>{c.source}</Chip>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">{c.skills.map((s) => <Chip key={s} tone={mySkills.some((ms) => ms.toLowerCase() === s.toLowerCase()) ? 'primary' : 'default'}>{s}</Chip>)}</div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" className="flex-1 rounded-lg bg-primary" disabled={c.id === user?.id} onClick={async (e) => {
                          e.stopPropagation()
                          const convId = await startConversation(c.id)
                          if (convId) navigate(`${getMessagesPath(role)}?conversation=${convId}`)
                        }}>
                          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> {c.id === user?.id ? 'You' : 'Invite'}
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg" disabled={c.id === user?.id} onClick={async (e) => { e.stopPropagation(); const convId = await startConversation(c.id); if (convId) navigate(`${getMessagesPath(role)}?conversation=${convId}`) }}>
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
