import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Database, Clock, AlertTriangle, RefreshCw, CheckCircle2, XCircle,
  Server, Users, Briefcase, FileText, MessageSquare, Shield, Wifi, HardDrive,
  Radio, AlertOctagon, TrendingUp, TrendingDown, Timer, Zap, Eye,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchSystemHealth, type SystemHealth, type ServiceStatus } from '@/lib/db'
import { toast } from 'sonner'

const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30000 },
  { label: '1m', value: 60000 },
  { label: '5m', value: 300000 },
]

function StatusDot({ status }: { status: ServiceStatus['status'] }) {
  const color = status === 'operational' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : status === 'down' ? 'bg-red-500' : 'bg-muted-foreground'
  return <span className={`h-2.5 w-2.5 rounded-full ${color} ${status === 'operational' ? 'animate-pulse' : ''}`} />
}

function LatencyBar({ ms, max = 3000 }: { ms: number; max?: number }) {
  const pct = Math.min((ms / max) * 100, 100)
  const color = ms < 200 ? 'bg-emerald-500' : ms < 500 ? 'bg-blue-500' : ms < 1000 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(0)
  const [showErrors, setShowErrors] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadHealth = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchSystemHealth()
      setHealth(data)
      setLastChecked(new Date())
    } catch {
      toast.error('Failed to load system health')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHealth() }, [loadHealth])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(loadHealth, refreshInterval)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [refreshInterval, loadHealth])

  const statusConfig = {
    operational: { label: 'Operational', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25', icon: CheckCircle2 },
    degraded: { label: 'Degraded', color: 'bg-amber-500/10 text-amber-600 border-amber-500/25', icon: AlertTriangle },
    down: { label: 'Down', color: 'bg-red-500/10 text-red-600 border-red-500/25', icon: XCircle },
  }

  const currentStatus = health ? statusConfig[health.status] : statusConfig.operational
  const StatusIcon = currentStatus.icon

  const serviceIcon = (name: string) => {
    switch (name) {
      case 'Database': return Database
      case 'Authentication': return Shield
      case 'API Server': return Server
      case 'Storage': return HardDrive
      case 'Realtime': return Radio
      default: return Server
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">System Health</h1>
          <p className="text-sm text-muted-foreground">Real-time platform monitoring and diagnostics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 p-1">
            {REFRESH_INTERVALS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setRefreshInterval(value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  refreshInterval === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {lastChecked && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={loadHealth} disabled={loading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ═══ Overall Status Banner ═══ */}
      <Card className={`shadow-soft ${health?.status === 'degraded' ? 'border-amber-500/30 bg-amber-500/[0.02]' : health?.status === 'down' ? 'border-red-500/30 bg-red-500/[0.02]' : 'border-emerald-500/20 bg-emerald-500/[0.02]'}`}>
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${health?.status === 'down' ? 'bg-red-500/15' : health?.status === 'degraded' ? 'bg-amber-500/15' : 'bg-emerald-500/15'}`}>
            <StatusIcon className={`h-7 w-7 ${health?.status === 'down' ? 'text-red-500' : health?.status === 'degraded' ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Overall System Status</h2>
              <Badge className={currentStatus.color}>
                <StatusDot status={health?.status ?? 'operational'} />
                <span className="ml-1.5">{currentStatus.label}</span>
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {health?.status === 'operational'
                ? 'All systems are functioning normally'
                : health?.status === 'degraded'
                  ? 'Some systems are experiencing elevated latency'
                  : 'Critical systems are currently offline'}
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-2xl font-bold">{health?.uptimePercentage ?? '—'}%</div>
            <div className="text-xs text-muted-foreground">Uptime (24h)</div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Top Metric Cards ═══ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Database className="h-3.5 w-3.5" /> DB Ping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold">{health ? `${health.dbPingMs}ms` : '—'}</div>
              {health && (
                <span className={`flex items-center gap-0.5 text-xs ${health.dbPingMs < 100 ? 'text-emerald-500' : health.dbPingMs < 500 ? 'text-blue-500' : 'text-amber-500'}`}>
                  {health.dbPingMs < 100 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                  {health.dbPingMs < 100 ? 'Excellent' : health.dbPingMs < 500 ? 'Good' : 'High'}
                </span>
              )}
            </div>
            <div className="mt-2"><LatencyBar ms={health?.dbPingMs ?? 0} max={2000} /></div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Zap className="h-3.5 w-3.5" /> Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold">{health ? `${health.successRate}%` : '—'}</div>
              {health && (
                <span className={`flex items-center gap-0.5 text-xs ${health.successRate >= 99 ? 'text-emerald-500' : health.successRate >= 95 ? 'text-amber-500' : 'text-red-500'}`}>
                  {health.successRate >= 99 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {health.successRate >= 99 ? 'Healthy' : health.successRate >= 95 ? 'Warning' : 'Critical'}
                </span>
              )}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">Referral success rate (24h)</div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <AlertOctagon className="h-3.5 w-3.5" /> Errors (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold">{health?.errors24h ?? '—'}</div>
              {health && health.errors24h > 0 && (
                <span className="text-xs text-muted-foreground">{health.criticalErrors24h} critical, {health.warnings24h} warnings</span>
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Logged errors in last 24h</div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Timer className="h-3.5 w-3.5" /> Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold">{health?.uptimePercentage ?? '—'}%</div>
              {health && (
                <span className={`text-xs ${health.status === 'operational' ? 'text-emerald-500' : health.status === 'degraded' ? 'text-amber-500' : 'text-red-500'}`}>
                  {health.status === 'operational' ? 'Operational' : health.status === 'degraded' ? 'Degraded' : 'Down'}
                </span>
              )}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">Based on error rate (24h)</div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Error & Failed Requests ═══ */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Errors 24h */}
        <Card className={`shadow-soft ${health && health.errors24h > 10 ? 'border-amber-500/30' : health && health.errors24h > 50 ? 'border-red-500/30' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-primary" />
                Errors (24h)
              </span>
              {health && (
                <Badge className={health.errors24h === 0 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' : health.errors24h <= 10 ? 'bg-amber-500/10 text-amber-600 border-amber-500/25' : 'bg-red-500/10 text-red-600 border-red-500/25'}>
                  {health.errors24h}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <AlertOctagon className="h-4 w-4 text-red-500" />
                </div>
                <span className="text-sm font-medium">Critical Errors</span>
              </div>
              <span className="text-sm font-semibold">{health?.criticalErrors24h ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-sm font-medium">Warnings</span>
              </div>
              <span className="text-sm font-semibold">{health?.warnings24h ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-sm font-medium">Success Rate</span>
              </div>
              <span className="text-sm font-semibold">{health?.successRate ?? 100}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors Log */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Recent Activity
              </span>
              <button onClick={() => setShowErrors(!showErrors)} className="text-muted-foreground hover:text-foreground" aria-label={showErrors ? 'Collapse recent activity' : 'Expand recent activity'}>
                {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CardTitle>
          </CardHeader>
          {showErrors && (
            <CardContent className="space-y-2">
              {health && health.recentErrors.length > 0 ? (
                health.recentErrors.slice(0, 5).map((err, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      err.severity === 'error' ? 'bg-red-500/10 text-red-500' :
                      err.severity === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {err.severity === 'error' ? <XCircle className="h-3.5 w-3.5" /> :
                       err.severity === 'warning' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                       <Zap className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{err.message}</div>
                      <div className="text-xs text-muted-foreground">{new Date(err.time).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500/50" />
                  <p className="text-sm text-muted-foreground">No recent errors detected</p>
                  <p className="text-xs text-muted-foreground/60">All systems operating normally</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* ═══ Services Status ═══ */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4 text-primary" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {health?.services.map((svc) => {
              const Icon = serviceIcon(svc.name)
              return (
                <div key={svc.name} className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-muted/30">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    svc.status === 'operational' ? 'bg-emerald-500/10' :
                    svc.status === 'degraded' ? 'bg-amber-500/10' :
                    svc.status === 'down' ? 'bg-red-500/10' : 'bg-muted'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      svc.status === 'operational' ? 'text-emerald-500' :
                      svc.status === 'degraded' ? 'text-amber-500' :
                      svc.status === 'down' ? 'text-red-500' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{svc.name}</span>
                      <Badge className={`text-[10px] ${
                        svc.status === 'operational' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' :
                        svc.status === 'degraded' ? 'bg-amber-500/10 text-amber-600 border-amber-500/25' :
                        svc.status === 'down' ? 'bg-red-500/10 text-red-600 border-red-500/25' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        <StatusDot status={svc.status} />
                        <span className="ml-1">{svc.status === 'operational' ? 'Operational' : svc.status === 'degraded' ? 'Degraded' : svc.status === 'down' ? 'Down' : 'Unknown'}</span>
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{svc.description}</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    {svc.latencyMs > 0 && (
                      <div className="text-sm font-semibold">{svc.latencyMs}ms</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(svc.lastChecked).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Database & Platform Metrics ═══ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Connection</span>
              </div>
              <Badge className={health?.status === 'down' ? 'bg-red-500/10 text-red-600 border-red-500/25' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'}>
                {health?.status === 'down' ? 'Disconnected' : 'Connected'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Ping</span>
              </div>
              <span className="text-sm font-semibold">{health?.dbPingMs ?? 0}ms</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Size</span>
              </div>
              <span className="text-sm font-semibold">{health?.dbSize ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Active Connections</span>
              </div>
              <span className="text-sm font-semibold">{health?.activeConnections ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Platform Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Total Users</span>
              </div>
              <span className="text-sm font-semibold">{health?.totalUsers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Active Jobs</span>
              </div>
              <span className="text-sm font-semibold">{health?.totalJobs ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">Referrals</span>
              </div>
              <span className="text-sm font-semibold">{health?.totalReferrals ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Messages</span>
              </div>
              <span className="text-sm font-semibold">{health?.totalMessages ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Infrastructure Info ═══ */}
      <Card className="shadow-soft">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Last deployed: {health?.lastDeployment ?? '—'}</span>
            <span className="flex items-center gap-1.5"><Server className="h-3.5 w-3.5" /> DB: Supabase PostgreSQL</span>
            <span className="flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5" /> Host: Vercel (iad1)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>SSL/TLS Active</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
