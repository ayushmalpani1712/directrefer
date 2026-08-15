import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Award, Building2, Star, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout'
import { supabase } from '@/lib/supabase'

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

interface ReferrerProfile {
  user_id: string
  full_name: string
  company_name: string
  job_title: string
  rating: number
  review_count: number
  response_rate: number
  avg_reply_hours: number
  success_rate: number
  referrals_used: number
  referrals_completed: number
  open_for_referrals: boolean
  slug?: string
}

function computeReputationScore(r: ReferrerProfile): number {
  const ratingScore = Math.min((r.rating / 5) * 30, 30)
  const reviewScore = Math.min((r.review_count / 10) * 15, 15)
  const responseScore = (r.response_rate / 100) * 20
  const speedScore = r.avg_reply_hours <= 24 ? 15 : r.avg_reply_hours <= 48 ? 10 : 5
  const successScore = (r.success_rate / 100) * 15
  const volumeScore = Math.min((r.referrals_used / 20) * 5, 5)
  return Math.round(ratingScore + reviewScore + responseScore + speedScore + successScore + volumeScore)
}

function getBadgeTier(score: number): { label: string; color: string; icon: string } {
  if (score >= 80) return { label: 'Platinum Referrer', color: 'bg-violet-500/10 text-violet-600 border-violet-500/25', icon: '💎' }
  if (score >= 60) return { label: 'Gold Referrer', color: 'bg-amber-500/10 text-amber-600 border-amber-500/25', icon: '🥇' }
  if (score >= 40) return { label: 'Silver Referrer', color: 'bg-gray-500/10 text-gray-600 border-gray-500/25', icon: '🥈' }
  return { label: 'Bronze Referrer', color: 'bg-orange-500/10 text-orange-600 border-orange-500/25', icon: '🥉' }
}

export default function ReferrerReputation() {
  const [referrers, setReferrers] = useState<ReferrerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'score' | 'rating' | 'referrals' | 'success'>('score')

  useEffect(() => {
    document.title = 'Top Referrers — DirectRefer'
    async function load() {
      try {
        const [profilesRes, usersRes] = await Promise.all([
          (supabase.from('profiles_professional').select('user_id, company_name, job_title, rating, review_count, response_rate, avg_reply_hours, success_rate, referrals_used, open_for_referrals') as unknown as Promise<{ data: Record<string, unknown>[] | null; error: unknown }>),
          supabase.from('users').select('id, full_name, slug'),
        ])
        const profiles = profilesRes.data || []
        const users = usersRes.data || []
        const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]))
        const merged: ReferrerProfile[] = profiles
          .filter(p => p.open_for_referrals && Number(p.referrals_used) > 0)
          .map(p => {
            const user = userMap.get(String(p.user_id))
            return {
              user_id: String(p.user_id),
              full_name: (user?.full_name as string) || 'Unknown',
              company_name: String(p.company_name || ''),
              job_title: String(p.job_title || ''),
              rating: Number(p.rating || 0),
              review_count: Number(p.review_count || 0),
              response_rate: Number(p.response_rate || 0),
              avg_reply_hours: Number(p.avg_reply_hours || 24),
              success_rate: Number(p.success_rate || 0),
              referrals_used: Number(p.referrals_used || 0),
              referrals_completed: Number(p.referrals_used || 0),
              open_for_referrals: Boolean(p.open_for_referrals),
              slug: user?.slug as string | undefined,
            }
          })
          .sort((a, b) => computeReputationScore(b) - computeReputationScore(a))
        setReferrers(merged)
      } catch { /* empty */ } finally { setLoading(false) }
    }
    load()
  }, [])

  const sorted = useMemo(() => {
    const withScore = referrers.map(r => ({ ...r, score: computeReputationScore(r) }))
    switch (sortBy) {
      case 'rating': return withScore.sort((a, b) => b.rating - a.rating)
      case 'referrals': return withScore.sort((a, b) => b.referrals_used - a.referrals_used)
      case 'success': return withScore.sort((a, b) => b.success_rate - a.success_rate)
      default: return withScore.sort((a, b) => b.score - a.score)
    }
  }, [referrers, sortBy])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2"><Logo /></Link>
          <Link to="/login" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Sign up</Link>
        </div>
      </header>

      <section className="px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <Award className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-3xl font-bold sm:text-5xl">Top Referrers</h1>
          <p className="mt-4 text-lg text-muted-foreground">Verified professionals with the highest reputation scores. Request a referral from the best.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {(['score', 'rating', 'referrals', 'success'] as const).map(s => (
            <Button key={s} size="sm" variant={sortBy === s ? 'default' : 'outline'} className="rounded-lg text-xs" onClick={() => setSortBy(s)}>
              {s === 'score' ? 'Reputation Score' : s === 'rating' ? 'Rating' : s === 'referrals' ? 'Referrals' : 'Success Rate'}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="shadow-soft"><CardContent className="p-6"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></CardContent></Card>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No referrers found yet. Check back soon.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((r, i) => {
              const tier = getBadgeTier(r.score)
              return (
                <motion.div key={r.user_id} {...fadeUp} transition={{ delay: i * 0.03 }}>
                  <Card className="shadow-soft hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {i < 3 && <span className="text-lg">{tier.icon}</span>}
                            <h3 className="font-semibold">
                              {r.slug ? <Link to={`/professionals/${r.slug}`} className="hover:text-primary transition-colors">{r.full_name}</Link> : r.full_name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" /> {r.job_title} at {r.company_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{r.score}</div>
                          <div className="text-[10px] text-muted-foreground">score</div>
                        </div>
                      </div>
                      <Badge variant="outline" className={`mt-3 text-xs ${tier.color}`}>{tier.label}</Badge>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Star className="h-3 w-3 text-amber-500" /> {r.rating.toFixed(1)} ({r.review_count})
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <TrendingUp className="h-3 w-3 text-emerald-500" /> {r.success_rate}% success
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3 text-blue-500" /> {r.referrals_used} referrals
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          ⏱️ {r.avg_reply_hours}h avg reply
                        </div>
                      </div>
                      {r.open_for_referrals && (
                        <Link to={`/job-seeker/request-referral?professional=${r.user_id}`} className="mt-3 block">
                          <Button size="sm" variant="outline" className="w-full rounded-lg text-xs">Request a referral</Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
