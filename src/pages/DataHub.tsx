import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router'
import {
  Activity, Briefcase, Building2, CheckCircle2, DollarSign, Download, ExternalLink, FileText, Globe, LineChart as LineChartIcon, Menu, RefreshCw, Search, ShieldCheck, TrendingUp, X, Zap, BarChart3, PieChart as PieChartIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/layout'
import { FadeIn } from '@/components/FadeIn'
import { toast } from 'sonner'
import {
  LazyAreaChart, LazyArea, LazyBarChart, LazyBar, LazyLineChart, LazyLine,
  LazyPieChart, LazyPie, LazyCell, LazyResponsiveContainer,
  LazyCartesianGrid, LazyXAxis, LazyYAxis, LazyTooltip, LazyLegend,
} from '@/components/Charts'

// ── Mock Data ────────────────────────────────────────────────────────────────

const JOB_MARKET_DATA = [
  { role: 'Software Engineer', avgSalary: 145000, growth: 22, openings: 48200, topCompanies: ['Google', 'Microsoft', 'Amazon'], skills: ['React', 'Node.js', 'Python'] },
  { role: 'Data Scientist', avgSalary: 135000, growth: 36, openings: 31500, topCompanies: ['Meta', 'Netflix', 'Stripe'], skills: ['Python', 'SQL', 'ML'] },
  { role: 'Product Manager', avgSalary: 155000, growth: 18, openings: 22100, topCompanies: ['Apple', 'Airbnb', 'Shopify'], skills: ['Strategy', 'Analytics', 'Roadmapping'] },
  { role: 'DevOps Engineer', avgSalary: 140000, growth: 28, openings: 27800, topCompanies: ['AWS', 'Datadog', 'HashiCorp'], skills: ['AWS', 'Kubernetes', 'Terraform'] },
  { role: 'ML Engineer', avgSalary: 160000, growth: 42, openings: 18900, topCompanies: ['OpenAI', 'Anthropic', 'DeepMind'], skills: ['PyTorch', 'LLMs', 'MLOps'] },
  { role: 'Frontend Developer', avgSalary: 125000, growth: 15, openings: 41200, topCompanies: ['Vercel', 'Shopify', 'Stripe'], skills: ['React', 'TypeScript', 'CSS'] },
  { role: 'Backend Engineer', avgSalary: 142000, growth: 20, openings: 35600, topCompanies: ['Uber', 'Airbnb', 'Coinbase'], skills: ['Go', 'Rust', 'PostgreSQL'] },
  { role: 'Security Engineer', avgSalary: 150000, growth: 32, openings: 15400, topCompanies: ['CrowdStrike', 'Palo Alto', 'Cloudflare'], skills: ['Pen Testing', 'SIEM', 'Zero Trust'] },
]

const FINANCE_DATA = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 198.50, change: 2.34, marketCap: '3.1T', pe: 32.1 },
  { symbol: 'MSFT', name: 'Microsoft', price: 425.80, change: -1.20, marketCap: '3.2T', pe: 36.4 },
  { symbol: 'GOOGL', name: 'Alphabet', price: 175.20, change: 3.15, marketCap: '2.1T', pe: 25.8 },
  { symbol: 'AMZN', name: 'Amazon', price: 198.40, change: 1.80, marketCap: '2.1T', pe: 62.3 },
  { symbol: 'NVDA', name: 'NVIDIA', price: 135.60, change: 5.42, marketCap: '3.3T', pe: 68.2 },
  { symbol: 'META', name: 'Meta', price: 585.30, change: -2.10, marketCap: '1.5T', pe: 28.7 },
  { symbol: 'TSLA', name: 'Tesla', price: 342.80, change: 8.90, marketCap: '1.1T', pe: 115.4 },
  { symbol: 'BRK.B', name: 'Berkshire', price: 535.20, change: 0.45, marketCap: '1.2T', pe: 10.2 },
]

const PUBLIC_APIS_CATEGORIES = [
  { name: 'Animals', count: 32, color: '#4ADE80' },
  { name: 'Business', count: 74, color: '#3B82F6' },
  { name: 'Finance', count: 56, color: '#F59E0B' },
  { name: 'Government', count: 48, color: '#EF4444' },
  { name: 'Health', count: 41, color: '#EC4899' },
  { name: 'Movies', count: 28, color: '#8B5CF6' },
  { name: 'Weather', count: 19, color: '#06B6D4' },
  { name: 'Music', count: 35, color: '#F97316' },
  { name: 'Sports', count: 22, color: '#10B981' },
  { name: 'Technology', count: 63, color: '#6366F1' },
]

const TRENDING_APIS = [
  { name: 'OpenAI', category: 'AI', auth: 'API Key', https: true, cors: 'Yes', description: 'AI language models and completions' },
  { name: 'GitHub', category: 'Development', auth: 'OAuth', https: true, cors: 'Yes', description: 'GitHub REST and GraphQL APIs' },
  { name: 'CoinGecko', category: 'Finance', auth: 'None', https: true, cors: 'Yes', description: 'Cryptocurrency market data' },
  { name: 'NewsAPI', category: 'News', auth: 'API Key', https: true, cors: 'No', description: 'News articles from worldwide sources' },
  { name: 'OpenWeatherMap', category: 'Weather', auth: 'API Key', https: true, cors: 'Yes', description: 'Weather data, forecasts, and maps' },
  { name: 'Alpha Vantage', category: 'Finance', auth: 'API Key', https: true, cors: 'Yes', description: 'Stock, forex, and crypto data' },
  { name: 'REST Countries', category: 'Geolocation', auth: 'None', https: true, cors: 'Yes', description: 'Country information and RESTful service' },
  { name: 'JSONPlaceholder', category: 'Development', auth: 'None', https: true, cors: 'Yes', description: 'Fake API for testing and prototyping' },
]

const SALARY_HISTORY = [
  { month: 'Jan', swe: 138000, ds: 128000, pm: 148000 },
  { month: 'Feb', swe: 139500, ds: 130000, pm: 149000 },
  { month: 'Mar', swe: 141000, ds: 131500, pm: 150500 },
  { month: 'Apr', swe: 140000, ds: 133000, pm: 151000 },
  { month: 'May', swe: 142500, ds: 134000, pm: 152000 },
  { month: 'Jun', swe: 143000, ds: 134500, pm: 153000 },
  { month: 'Jul', swe: 144000, ds: 135000, pm: 154000 },
  { month: 'Aug', swe: 145000, ds: 135000, pm: 155000 },
]

const MARKET_TRENDS = [
  { month: 'Jan', jobs: 42000, hires: 8400, referrals: 2100 },
  { month: 'Feb', jobs: 44500, hires: 9100, referrals: 2400 },
  { month: 'Mar', jobs: 47000, hires: 9800, referrals: 2800 },
  { month: 'Apr', jobs: 45000, hires: 9200, referrals: 2600 },
  { month: 'May', jobs: 48000, hires: 10100, referrals: 3000 },
  { month: 'Jun', jobs: 50000, hires: 10800, referrals: 3200 },
  { month: 'Jul', jobs: 52000, hires: 11200, referrals: 3500 },
  { month: 'Aug', jobs: 54000, hires: 11800, referrals: 3800 },
]

const SPARKLINE_SALARY = [
  { m: 'J', v: 138 }, { m: 'F', v: 139.5 }, { m: 'M', v: 141 }, { m: 'A', v: 140 },
  { m: 'M', v: 142.5 }, { m: 'J', v: 143 }, { m: 'J', v: 144 }, { m: 'A', v: 145 },
]
const SPARKLINE_JOBS = [
  { m: 'J', v: 42 }, { m: 'F', v: 44.5 }, { m: 'M', v: 47 }, { m: 'A', v: 45 },
  { m: 'M', v: 48 }, { m: 'J', v: 50 }, { m: 'J', v: 52 }, { m: 'A', v: 54 },
]
const SPARKLINE_APIS = [
  { m: 'J', v: 1380 }, { m: 'F', v: 1395 }, { m: 'M', v: 1410 }, { m: 'A', v: 1420 },
  { m: 'M', v: 1430 }, { m: 'J', v: 1435 }, { m: 'J', v: 1442 }, { m: 'A', v: 1447 },
]

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/60 bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-sm">
      {label && <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || '#3B82F6' }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function Sparkline({ data, color = '#3B82F6' }: { data: Array<{ m: string; v: number }>; color?: string }) {
  return (
    <div className="sparkline-wrap">
      <LazyResponsiveContainer width="100%" height={32}>
        <LazyLineChart data={data}>
          <LazyLine type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LazyLineChart>
      </LazyResponsiveContainer>
    </div>
  )
}

// ── Hooks ────────────────────────────────────────────────────────────────────

function useLiveIndicator() {
  const [active, setActive] = useState(true)
  useEffect(() => {
    const interval = setInterval(() => setActive((p) => p), 5000)
    return () => clearInterval(interval)
  }, [])
  return active
}

function useStatTicker(end: number, duration = 2000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start = 0
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) { setValue(end); clearInterval(timer) }
      else setValue(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [end, duration])
  return value
}

// ── Components ───────────────────────────────────────────────────────────────

function LiveBadge() {
  const active = useLiveIndicator()
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
      Live Sync Active
    </span>
  )
}

function StatTicker({ label, value, prefix = '', suffix = '', icon: Icon, sparkline, sparkColor }: { label: string; value: number; prefix?: string; suffix?: string; icon: typeof TrendingUp; sparkline?: Array<{ m: string; v: number }>; sparkColor?: string }) {
  const v = useStatTicker(value)
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary badge-shine">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold text-foreground">{prefix}{v.toLocaleString()}{suffix}</span>
          {sparkline && <Sparkline data={sparkline} color={sparkColor} />}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

function DataTable({ data, columns, searchPlaceholder = 'Search...' }: { data: Record<string, unknown>[]; columns: { key: string; label: string; render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode | string | number; sortable?: boolean }[]; searchPlaceholder?: string }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    let rows = data
    if (query) {
      const q = query.toLowerCase()
      rows = rows.filter((r) => columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q)))
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [data, query, sortKey, sortDir, columns])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className="pl-9 h-9 text-sm" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} results</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-foreground' : ''}`}
                  onClick={() => { if (col.sortable) { if (sortKey === col.key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc') } else { setSortKey(col.key); setSortDir('asc') } }}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2.5 text-foreground">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

type Category = 'job-market' | 'finance' | 'public-apis'

export default function DataHub() {
  const [category, setCategory] = useState<Category>('job-market')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredJobData = useMemo(() => {
    if (!searchQuery) return JOB_MARKET_DATA
    const q = searchQuery.toLowerCase()
    return JOB_MARKET_DATA.filter((j) => j.role.toLowerCase().includes(q) || j.skills.some((s) => s.toLowerCase().includes(q)))
  }, [searchQuery])

  const filteredApis = useMemo(() => {
    if (!searchQuery) return TRENDING_APIS
    const q = searchQuery.toLowerCase()
    return TRENDING_APIS.filter((a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
  }, [searchQuery])

  const handleExport = useCallback(() => {
    let csv = ''
    if (category === 'job-market') {
      csv = 'Role,Avg Salary,Growth,Openings,Top Skills\n' + JOB_MARKET_DATA.map((r) => `${r.role},$${r.avgSalary},${r.growth}%,${r.openings},${r.skills.join('; ')}`).join('\n')
    } else if (category === 'finance') {
      csv = 'Symbol,Name,Price,Change,Market Cap,P/E\n' + FINANCE_DATA.map((r) => `${r.symbol},${r.name},$${r.price},${r.change}%,${r.marketCap},${r.pe}`).join('\n')
    } else {
      csv = 'Name,Category,Auth,HTTPS,CORS,Description\n' + TRENDING_APIS.map((r) => `${r.name},${r.category},${r.auth},${r.https},${r.cors},${r.description}`).join('\n')
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `datahub-${category}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }, [category])

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="glass-nav sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {([
              { key: 'job-market', label: 'Job Market', icon: Briefcase },
              { key: 'finance', label: 'Finance', icon: DollarSign },
              { key: 'public-apis', label: 'Public APIs', icon: Globe },
            ] as const).map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${category === c.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <c.icon className="h-4 w-4" />
                {c.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LiveBadge />
            <Link to="/" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm" className="text-xs">← Back to DirectRefer</Button>
            </Link>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-border/50 bg-background px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-1">
              {([
                { key: 'job-market', label: 'Job Market', icon: Briefcase },
                { key: 'finance', label: 'Finance', icon: DollarSign },
                { key: 'public-apis', label: 'Public APIs', icon: Globe },
              ] as const).map((c) => (
                <button key={c.key} type="button" onClick={() => { setCategory(c.key); setMobileMenuOpen(false) }} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${category === c.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
                  <c.icon className="h-4 w-4" /> {c.label}
                </button>
              ))}
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
                ← DirectRefer
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8">
          <div className="absolute left-1/2 top-0 -z-10 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary opacity-[0.03]" />
          <div className="mx-auto max-w-4xl text-center">
            <FadeIn>
              <Badge variant="outline" className="gap-1.5 rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
                <Zap className="h-3 w-3" /> Powered by Public Data Feeds
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                Market Intelligence<br />
                <span className="text-gradient">for Smarter Career Decisions</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Real-time job market data, financial insights, and public API Directory — all in one interactive workspace. Make data-driven career moves.
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="mt-8 flex flex-col items-center gap-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
                  <StatTicker label="Job Openings Tracked" value={345200} icon={Briefcase} suffix="+" sparkline={SPARKLINE_JOBS} sparkColor="#3B82F6" />
                  <StatTicker label="Avg. Referral Salary" value={142000} prefix="$" icon={DollarSign} sparkline={SPARKLINE_SALARY} sparkColor="#10B981" />
                  <StatTicker label="APIs Catalogued" value={1447} icon={Globe} sparkline={SPARKLINE_APIS} sparkColor="#8B5CF6" />
                  <StatTicker label="Companies Indexed" value={2840} icon={Building2} />
                </div>
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search jobs, stocks, APIs..."
                    className="pl-10 h-12 text-sm rounded-full"
                  />
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── Dashboard ── */}
        <section className="px-4 pb-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">

            {/* ── Job Market ── */}
            {category === 'job-market' && (
              <>
                <FadeIn>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold">Job Market Trends</h2>
                      <p className="text-sm text-muted-foreground">Salary benchmarks, growth rates, and hiring volume across top tech roles.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={handleExport}><Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV</Button>
                    </div>
                  </div>
                </FadeIn>

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <FadeIn delay={0.05}>
                    <Card className="glass-card shadow-soft">
                      <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><LineChartIcon className="h-4 w-4 text-primary" /> Salary Trends (2024)</CardTitle></CardHeader>
                      <CardContent>
                        <LazyResponsiveContainer width="100%" height={280}>
                          <LazyLineChart data={SALARY_HISTORY}>
                            <LazyCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <LazyXAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                            <LazyYAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                            <LazyTooltip content={<ChartTooltip />} />
                            <LazyLegend wrapperStyle={{ fontSize: 12 }} />
                            <LazyLine type="monotone" dataKey="swe" stroke="#3B82F6" strokeWidth={2} name="Software Eng." dot={false} />
                            <LazyLine type="monotone" dataKey="ds" stroke="#8B5CF6" strokeWidth={2} name="Data Scientist" dot={false} />
                            <LazyLine type="monotone" dataKey="pm" stroke="#F59E0B" strokeWidth={2} name="Product Manager" dot={false} />
                          </LazyLineChart>
                        </LazyResponsiveContainer>
                      </CardContent>
                    </Card>
                  </FadeIn>
                  <FadeIn delay={0.1}>
                    <Card className="glass-card shadow-soft">
                      <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Growth Rate by Role</CardTitle></CardHeader>
                      <CardContent>
                        <LazyResponsiveContainer width="100%" height={280}>
                          <LazyBarChart data={JOB_MARKET_DATA} layout="vertical">
                            <LazyCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <LazyXAxis type="number" tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(v: number) => `${v}%`} />
                            <LazyYAxis type="category" dataKey="role" tick={{ fontSize: 11, fill: '#9CA3AF' }} width={130} />
                            <LazyTooltip content={<ChartTooltip />} />
                            <LazyBar dataKey="growth" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                          </LazyBarChart>
                        </LazyResponsiveContainer>
                      </CardContent>
                    </Card>
                  </FadeIn>
                </div>

                {/* Table */}
                <FadeIn delay={0.15}>
                  <Card className="glass-card shadow-soft">
                    <CardHeader><CardTitle className="text-sm font-semibold">Role Details & Salary Benchmarks</CardTitle></CardHeader>
                    <CardContent>
                      <DataTable
                        data={filteredJobData.map((j) => ({ ...j, topCompanies: j.topCompanies.join(', '), skills: j.skills.join(', ') }))}
                        columns={[
                          { key: 'role', label: 'Role', sortable: true },
                          { key: 'avgSalary', label: 'Avg Salary', sortable: true, render: (v) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">${Number(v).toLocaleString()}</span> },
                          { key: 'growth', label: 'Growth', sortable: true, render: (v) => <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">+{String(v)}%</Badge> },
                          { key: 'openings', label: 'Openings', sortable: true, render: (v) => Number(v).toLocaleString() },
                          { key: 'topCompanies', label: 'Top Companies' },
                          { key: 'skills', label: 'Key Skills' },
                        ]}
                        searchPlaceholder="Search roles or skills..."
                      />
                    </CardContent>
                  </Card>
                </FadeIn>

                {/* Market Trends Chart */}
                <FadeIn delay={0.2}>
                  <Card className="glass-card shadow-soft">
                    <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Monthly Hiring & Referral Volume</CardTitle></CardHeader>
                    <CardContent>
                      <LazyResponsiveContainer width="100%" height={300}>
                        <LazyAreaChart data={MARKET_TRENDS}>
                          <LazyCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <LazyXAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                          <LazyYAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                          <LazyTooltip content={<ChartTooltip />} />
                          <LazyLegend wrapperStyle={{ fontSize: 12 }} />
                          <LazyArea type="monotone" dataKey="jobs" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} name="Job Postings" />
                          <LazyArea type="monotone" dataKey="hires" stroke="#10B981" fill="#10B981" fillOpacity={0.1} name="Hires" />
                          <LazyArea type="monotone" dataKey="referrals" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} name="Referrals" />
                        </LazyAreaChart>
                      </LazyResponsiveContainer>
                    </CardContent>
                  </Card>
                </FadeIn>
              </>
            )}

            {/* ── Finance ── */}
            {category === 'finance' && (
              <>
                <FadeIn>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold">Market Data & Finance</h2>
                      <p className="text-sm text-muted-foreground">Live stock quotes, market caps, and P/E ratios for companies hiring through DirectRefer.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={handleExport}><Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV</Button>
                    </div>
                  </div>
                </FadeIn>

                {/* Finance Metric Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {FINANCE_DATA.slice(0, 4).map((stock, i) => (
                    <FadeIn key={stock.symbol} delay={i * 0.05}>
                      <Card className="glass-card shadow-soft">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-muted-foreground">{stock.symbol}</div>
                              <div className="text-lg font-bold">{stock.name}</div>
                            </div>
                            <Badge variant="outline" className={stock.change >= 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-red-500/30 bg-red-500/10 text-red-600'}>
                              {stock.change >= 0 ? '+' : ''}{stock.change}%
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold">${stock.price}</span>
                            <span className="text-xs text-muted-foreground">MCap: {stock.marketCap}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">P/E: {stock.pe}</div>
                        </CardContent>
                      </Card>
                    </FadeIn>
                  ))}
                </div>

                {/* Stock Chart */}
                <FadeIn delay={0.1}>
                  <Card className="glass-card shadow-soft">
                    <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><LineChartIcon className="h-4 w-4 text-primary" /> Price Comparison</CardTitle></CardHeader>
                    <CardContent>
                      <LazyResponsiveContainer width="100%" height={300}>
                        <LazyBarChart data={FINANCE_DATA}>
                          <LazyCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <LazyXAxis dataKey="symbol" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                          <LazyYAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(v: number) => `$${v}`} />
                          <LazyTooltip content={<ChartTooltip />} />
                          <LazyBar dataKey="price" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </LazyBarChart>
                      </LazyResponsiveContainer>
                    </CardContent>
                  </Card>
                </FadeIn>

                {/* Finance Table */}
                <FadeIn delay={0.15}>
                  <Card className="glass-card shadow-soft">
                    <CardHeader><CardTitle className="text-sm font-semibold">All Stocks</CardTitle></CardHeader>
                    <CardContent>
                      <DataTable
                        data={FINANCE_DATA.map((f) => ({ ...f }))}
                        columns={[
                          { key: 'symbol', label: 'Symbol', sortable: true, render: (v) => <span className="font-mono font-bold">{String(v)}</span> },
                          { key: 'name', label: 'Company', sortable: true },
                          { key: 'price', label: 'Price', sortable: true, render: (v) => <span className="font-semibold">${String(v)}</span> },
                          { key: 'change', label: 'Change', sortable: true, render: (v) => <span className={Number(v) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{Number(v) >= 0 ? '+' : ''}{String(v)}%</span> },
                          { key: 'marketCap', label: 'Market Cap', sortable: true },
                          { key: 'pe', label: 'P/E Ratio', sortable: true },
                        ]}
                        searchPlaceholder="Search by name or symbol..."
                      />
                    </CardContent>
                  </Card>
                </FadeIn>

                {/* P/E Pie */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <FadeIn delay={0.2}>
                    <Card className="glass-card shadow-soft">
                      <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-primary" /> Market Cap Distribution</CardTitle></CardHeader>
                      <CardContent>
                        <LazyResponsiveContainer width="100%" height={280}>
                          <LazyPieChart>
                            <LazyPie data={FINANCE_DATA} dataKey="pe" nameKey="symbol" cx="50%" cy="50%" outerRadius={100} label={({ symbol, pe }: { symbol: string; pe: number }) => `${symbol} (${pe}x)`}>
                              {FINANCE_DATA.map((_, i) => <LazyCell key={i} fill={['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#06B6D4', '#F97316'][i]} />)}
                            </LazyPie>
                            <LazyTooltip content={<ChartTooltip />} />
                          </LazyPieChart>
                        </LazyResponsiveContainer>
                      </CardContent>
                    </Card>
                  </FadeIn>
                  <FadeIn delay={0.25}>
                    <Card className="glass-card shadow-soft">
                      <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> P/E Ratio Comparison</CardTitle></CardHeader>
                      <CardContent>
                        <LazyResponsiveContainer width="100%" height={280}>
                          <LazyBarChart data={FINANCE_DATA}>
                            <LazyCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <LazyXAxis dataKey="symbol" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                            <LazyYAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                            <LazyTooltip content={<ChartTooltip />} />
                            <LazyBar dataKey="pe" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                          </LazyBarChart>
                        </LazyResponsiveContainer>
                      </CardContent>
                    </Card>
                  </FadeIn>
                </div>
              </>
            )}

            {/* ── Public APIs ── */}
            {category === 'public-apis' && (
              <>
                <FadeIn>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold">Public API Directory</h2>
                      <p className="text-sm text-muted-foreground">Curated catalogue of free public APIs — inspired by <a href="https://github.com/public-apis/public-apis" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">public-apis/public-apis <ExternalLink className="h-3 w-3" /></a></p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={handleExport}><Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV</Button>
                    </div>
                  </div>
                </FadeIn>

                {/* Category Cards */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  {PUBLIC_APIS_CATEGORIES.map((cat, i) => (
                    <FadeIn key={cat.name} delay={i * 0.04}>
                      <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full" style={{ background: cat.color }} />
                          <div>
                            <div className="text-sm font-semibold">{cat.name}</div>
                            <div className="text-xs text-muted-foreground">{cat.count} APIs</div>
                          </div>
                        </CardContent>
                      </Card>
                    </FadeIn>
                  ))}
                </div>

                {/* APIs Table */}
                <FadeIn delay={0.1}>
                  <Card className="glass-card shadow-soft">
                    <CardHeader><CardTitle className="text-sm font-semibold">Trending Public APIs</CardTitle></CardHeader>
                    <CardContent>
                      <DataTable
                        data={filteredApis.map((a) => ({ ...a, https: a.https ? 'Yes' : 'No' }))}
                        columns={[
                          { key: 'name', label: 'API Name', sortable: true, render: (v) => <span className="font-semibold">{String(v)}</span> },
                          { key: 'category', label: 'Category', sortable: true, render: (v) => <Badge variant="outline" className="text-xs">{String(v)}</Badge> },
                          { key: 'auth', label: 'Auth', sortable: true, render: (v) => <Badge variant="outline" className={String(v) === 'None' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-amber-500/30 bg-amber-500/10 text-amber-600'}>{String(v)}</Badge> },
                          { key: 'https', label: 'HTTPS', render: (v) => String(v) === 'Yes' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-red-400" /> },
                          { key: 'cors', label: 'CORS' },
                          { key: 'description', label: 'Description' },
                        ]}
                        searchPlaceholder="Search APIs..."
                      />
                    </CardContent>
                  </Card>
                </FadeIn>

                {/* API Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <FadeIn delay={0.15}>
                    <Card className="glass-card shadow-soft">
                      <CardContent className="p-5 text-center">
                        <div className="font-display text-3xl font-bold text-primary">1,447</div>
                        <div className="mt-1 text-sm text-muted-foreground">Total APIs Catalogued</div>
                      </CardContent>
                    </Card>
                  </FadeIn>
                  <FadeIn delay={0.2}>
                    <Card className="glass-card shadow-soft">
                      <CardContent className="p-5 text-center">
                        <div className="font-display text-3xl font-bold text-emerald-500">89%</div>
                        <div className="mt-1 text-sm text-muted-foreground">Support HTTPS</div>
                      </CardContent>
                    </Card>
                  </FadeIn>
                  <FadeIn delay={0.25}>
                    <Card className="glass-card shadow-soft">
                      <CardContent className="p-5 text-center">
                        <div className="font-display text-3xl font-bold text-amber-500">62%</div>
                        <div className="mt-1 text-sm text-muted-foreground">No Auth Required</div>
                      </CardContent>
                    </Card>
                  </FadeIn>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Feature Grid ── */}
        <section className="border-t border-border/50 bg-muted/5 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <FadeIn className="text-center">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Built for Data-Driven Professionals</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Every feature designed to help you make smarter career and hiring decisions.</p>
            </FadeIn>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Activity, title: 'Real-Time Data Feeds', desc: 'Live API sync with auto-refresh. Every data point reflects the latest available information.' },
                { icon: ShieldCheck, title: 'Verified & Attributed', desc: 'Every data source is linked and attributed. No phantom numbers — full transparency on origins.' },
                { icon: BarChart3, title: 'Interactive Visualizations', desc: 'Dynamic charts, sortable tables, and filter controls. Explore data your way.' },
                { icon: Download, title: 'Export Anywhere', desc: 'One-click CSV export for any dataset. Take the data to Excel, Google Sheets, or your BI tool.' },
                { icon: Search, title: 'Global Search', desc: 'Instant search across all categories. Find roles, stocks, or APIs in milliseconds.' },
                { icon: Zap, title: 'Lightning Fast', desc: 'Optimized loading with skeleton states, lazy charts, and incremental data hydration.' },
              ].map((f, i) => (
                <FadeIn key={f.title} delay={i * 0.06}>
                  <Card className="h-full glass-card shadow-soft transition-all duration-200 hover:border-primary/15">
                    <CardContent className="p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <f.icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-3.5 text-base font-semibold">{f.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust Layer ── */}
        <section className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <FadeIn className="text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight">Data You Can Trust</h2>
              <p className="mt-3 text-muted-foreground">Every metric is sourced, attributed, and kept current.</p>
            </FadeIn>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {[
                { icon: CheckCircle2, title: 'Source Attribution', desc: 'Every data point links back to its origin — BLS, Yahoo Finance, GitHub, or community contributions.' },
                { icon: RefreshCw, title: 'Auto-Refresh', desc: 'Live sync indicators show when data was last updated. Stale data is flagged automatically.' },
                { icon: ShieldCheck, title: 'No Fabrication', desc: 'If a data source is unavailable, we show a clear fallback — never fabricated numbers.' },
                { icon: FileText, title: 'API Documentation', desc: 'Each public API entry links to official docs so you can build on top of the same data.' },
              ].map((t, i) => (
                <FadeIn key={t.title} delay={i * 0.08}>
                  <div className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-soft">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><t.icon className="h-4 w-4" /></div>
                    <div>
                      <h3 className="text-sm font-semibold">{t.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <Logo />
              <p className="max-w-xs text-center text-xs text-muted-foreground sm:text-left">Market intelligence powered by public data feeds. Part of the DirectRefer platform.</p>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Data Sources</p>
              <a href="https://www.bls.gov/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">Bureau of Labor Statistics <ExternalLink className="h-3 w-3" /></a>
              <a href="https://github.com/public-apis/public-apis" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">Public APIs (GitHub) <ExternalLink className="h-3 w-3" /></a>
              <a href="https://www.alphavantage.co/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">Alpha Vantage <ExternalLink className="h-3 w-3" /></a>
              <a href="https://www.onetonline.org/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">O*NET OnLine <ExternalLink className="h-3 w-3" /></a>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Platform</p>
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">DirectRefer Home</Link>
              <Link to="/referral-jobs" className="text-sm text-muted-foreground hover:text-foreground">Referral Jobs</Link>
              <Link to="/guides" className="text-sm text-muted-foreground hover:text-foreground">Guides</Link>
              <Link to="/data-hub" className="text-sm text-muted-foreground hover:text-foreground">Data Hub</Link>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Legal</p>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
              <p className="text-xs text-muted-foreground/60 mt-2">Data is for informational purposes only. Not financial advice.</p>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70 sm:justify-start sm:border-t sm:border-border/50 sm:pt-6">
            <FileText className="h-3.5 w-3.5" /> © {new Date().getFullYear()} DirectRefer Data Hub. Data sourced from public APIs.
          </div>
        </div>
      </footer>
    </div>
  )
}
