import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Target, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

interface AcquisitionMetrics {
  totalUsers: number
  activatedCandidates: number
  verifiedReferrers: number
  referralRequests: number
  acceptedRequests: number
  completedReferrals: number
  referrerRepeatRate: number
  organicTrafficPages: number
  weeklySignups: Array<{ week: string; count: number }>
  sourceBreakdown: Array<{ source: string; count: number }>
  diagnostics: DiagnosticRule[]
}

interface DiagnosticRule {
  id: string
  label: string
  status: 'healthy' | 'warning' | 'critical'
  message: string
}

function DiagnosticBadge({ status }: { status: DiagnosticRule['status'] }) {
  if (status === 'healthy') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/25"><CheckCircle2 className="mr-1 h-3 w-3" /> Healthy</Badge>
  if (status === 'warning') return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/25"><AlertTriangle className="mr-1 h-3 w-3" /> Warning</Badge>
  return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/25"><XCircle className="mr-1 h-3 w-3" /> Critical</Badge>
}

export default function AcquisitionDashboard() {
  const [metrics, setMetrics] = useState<AcquisitionMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, referralsRes, jobsRes] = await Promise.all([
        supabase.from('users').select('id, role, created_at, verified'),
        supabase.from('referrals').select('id, status, requester_id, professional_id, created_at, pipeline_stage'),
        supabase.from('jobs').select('id'),
      ])

      const users = usersRes.data || []
      const referrals = referralsRes.data || []
      const jobs = jobsRes.data || []

      const totalUsers = users.length
      const activatedCandidates = users.filter(u => {
        const isStudent = u.role === 'job_seeker' || u.role === 'student'
        const hasReferral = referrals.some(r => r.requester_id === u.id)
        return isStudent && hasReferral
      }).length
      const verifiedReferrers = users.filter(u => {
        const isProfessional = u.role === 'professional'
        const isVerified = u.verified === true
        return isProfessional && isVerified
      }).length

      const referralRequests = referrals.length
      const acceptedRequests = referrals.filter(r => r.status === 'accepted').length
      const completedReferrals = referrals.filter(r => r.status === 'accepted' || r.pipeline_stage === 'submitted' || r.pipeline_stage === 'hired').length

      const professionalIds = [...new Set(referrals.map(r => r.professional_id).filter(Boolean))]
      const repeatReferrers = professionalIds.filter(pid => referrals.filter(r => r.professional_id === pid).length > 1).length
      const referrerRepeatRate = professionalIds.length > 0 ? Math.round((repeatReferrers / professionalIds.length) * 100) : 0

      const weekMap = new Map<string, number>()
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i * 7)
        const key = `${d.getMonth() + 1}/${d.getDate()}`
        weekMap.set(key, 0)
      }
      users.forEach(u => {
        const d = new Date(u.created_at)
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays < 84) {
          const weekIndex = Math.floor(diffDays / 7)
          const weekDate = new Date(now)
          weekDate.setDate(weekDate.getDate() - weekIndex * 7)
          const key = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`
          weekMap.set(key, (weekMap.get(key) || 0) + 1)
        }
      })
      const weeklySignups = [...weekMap.entries()].map(([week, count]) => ({ week, count })).reverse()

      const sourceBreakdown: Array<{ source: string; count: number }> = []

      const diagnostics: DiagnosticRule[] = []
      if (activatedCandidates < referralRequests * 0.3) {
        diagnostics.push({ id: 'supply', label: 'Supply-Demand Balance', status: 'warning', message: 'Many candidates but few referrers. Focus on supply recruitment.' })
      } else if (referralRequests < activatedCandidates * 0.5) {
        diagnostics.push({ id: 'demand', label: 'Supply-Demand Balance', status: 'warning', message: 'Many referrers but few candidates. Focus on SEO, communities and candidate onboarding.' })
      } else {
        diagnostics.push({ id: 'balance', label: 'Supply-Demand Balance', status: 'healthy', message: 'Good balance between candidates and referrers.' })
      }

      if (acceptedRequests < referralRequests * 0.2) {
        diagnostics.push({ id: 'accept', label: 'Acceptance Rate', status: 'critical', message: 'Many requests but few accepts. Improve candidate quality and matching.' })
      } else {
        diagnostics.push({ id: 'accept', label: 'Acceptance Rate', status: 'healthy', message: 'Acceptance rate is healthy.' })
      }

      if (completedReferrals < acceptedRequests * 0.5) {
        diagnostics.push({ id: 'completion', label: 'Completion Rate', status: 'warning', message: 'Many accepts but few completed referrals. Simplify the handoff/status process.' })
      } else {
        diagnostics.push({ id: 'completion', label: 'Completion Rate', status: 'healthy', message: 'Completion rate is healthy.' })
      }

      if (referrerRepeatRate < 10) {
        diagnostics.push({ id: 'repeat', label: 'Referrer Retention', status: 'warning', message: 'Low repeat activity. Improve referrer value and experience.' })
      } else {
        diagnostics.push({ id: 'repeat', label: 'Referrer Retention', status: 'healthy', message: 'Good referrer retention.' })
      }

      setMetrics({
        totalUsers,
        activatedCandidates,
        verifiedReferrers,
        referralRequests,
        acceptedRequests,
        completedReferrals,
        referrerRepeatRate,
        organicTrafficPages: jobs.length,
        weeklySignups,
        sourceBreakdown,
        diagnostics,
      })
    } catch {
      toast.error('Failed to load acquisition metrics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMetrics() }, [loadMetrics])

  if (loading || !metrics) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="shadow-soft"><CardContent className="p-6"><div className="h-4 w-24 animate-pulse rounded bg-muted" /><div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Acquisition Dashboard</h2>
        <p className="text-sm text-muted-foreground">Phase 6 — Validation & Optimization metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div {...fadeUp} transition={{ delay: 0 }}>
          <Link to="/admin/users">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{metrics.totalUsers}</div>
                  <div className="text-xs text-muted-foreground">Registered Users</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
          <Link to="/admin/users">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Target className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{metrics.activatedCandidates}</div>
                  <div className="text-xs text-muted-foreground">Activated Candidates</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <Link to="/admin/users">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                  <Users className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{metrics.verifiedReferrers}</div>
                  <div className="text-xs text-muted-foreground">Verified Referrers</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <Link to="/admin/referrals">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{metrics.referralRequests}</div>
                  <div className="text-xs text-muted-foreground">Referral Requests</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <Link to="/admin/referrals">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{metrics.acceptedRequests}</div>
                  <div className="text-xs text-muted-foreground">Accepted Requests</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
          <Link to="/admin/referrals">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div>
                  <div className="text-2xl font-bold text-primary">{metrics.completedReferrals}</div>
                  <div className="text-xs text-muted-foreground">Completed Referrals</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <Card className="shadow-soft cursor-default">
            <CardContent className="flex items-center gap-4 p-4">
              <div>
                <div className="text-2xl font-bold">{metrics.referrerRepeatRate}%</div>
                <div className="text-xs text-muted-foreground">Referrer Repeat Rate</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
          <Card className="shadow-soft cursor-default">
            <CardContent className="flex items-center gap-4 p-4">
              <div>
                <div className="text-2xl font-bold">{metrics.organicTrafficPages}</div>
                <div className="text-xs text-muted-foreground">SEO Pages (Jobs)</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Weekly Signups Chart */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Weekly Signups</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.weeklySignups.every(w => w.count === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">No signup data yet</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="flex items-end gap-1 h-40" style={{ minWidth: 0 }}>
                {metrics.weeklySignups.map((w) => {
                  const maxCount = Math.max(...metrics.weeklySignups.map(x => x.count), 1)
                  const height = Math.max((w.count / maxCount) * 100, w.count > 0 ? 6 : 2)
                  return (
                    <div key={w.week} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <span className="text-[10px] font-medium text-muted-foreground">{w.count > 0 ? w.count : ''}</span>
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-primary/70 to-primary"
                        style={{ height: `${height}%` }}
                        title={`${w.week}: ${w.count}`}
                      />
                      <span className="text-[9px] text-muted-foreground truncate w-full text-center">{w.week}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Acquisition Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.sourceBreakdown.length > 0 ? (
              <div className="space-y-3">
                {metrics.sourceBreakdown.map(s => {
                  const pct = metrics.totalUsers > 0 ? Math.round((s.count / metrics.totalUsers) * 100) : 0
                  return (
                    <div key={s.source}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{s.source}</span>
                        <span className="text-muted-foreground">{s.count} ({pct}%)</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Not yet tracked</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Acquisition source tracking requires UTM parameters or a signup survey to be implemented.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funnel */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: 'Registered', value: metrics.totalUsers, color: 'bg-blue-500' },
                { label: 'Activated (sent request)', value: metrics.activatedCandidates, color: 'bg-emerald-500' },
                { label: 'Requests accepted', value: metrics.acceptedRequests, color: 'bg-violet-500' },
                { label: 'Completed', value: metrics.completedReferrals, color: 'bg-primary' },
              ].map((step, _i, arr) => {
                const maxVal = arr[0].value || 1
                const width = Math.max((step.value / maxVal) * 100, 8)
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{step.label}</span>
                      <span className="text-muted-foreground">{step.value}</span>
                    </div>
                    <div className="mt-1 h-2 rounded bg-muted">
                      <div className={`h-full rounded ${step.color}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnostic Rules */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Diagnostic Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.diagnostics.map(d => (
              <div key={d.id} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
                <DiagnosticBadge status={d.status} />
                <div>
                  <div className="text-sm font-medium">{d.label}</div>
                  <div className="text-xs text-muted-foreground">{d.message}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
