import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { EmptyState, GAvatar } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { type Professional, profileUrl } from '@/data/mock'
import { usePageLoading } from '@/hooks/usePageLoading'
import { cn } from '@/lib/utils'

type SortKey = 'recommended' | 'top_rated' | 'fastest' | 'recent' | 'most_referrals'

interface Filters {
  q: string
  companies: string[]
  skills: string[]
  locations: string[]
}

const EMPTY_FILTERS: Filters = { q: '', companies: [], skills: [], locations: [] }

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function ProfessionalCard({ p, index }: { p: Professional; index: number }) {
  const { bookmarks, toggleBookmark } = useApp()
  const saved = bookmarks.includes(p.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
    >
      <Link to={profileUrl('professional', p.id, p.slug)} className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md hover:border-primary/20">
        {/* Top row: Avatar + Bookmark */}
        <div className="flex items-start justify-between">
          <GAvatar name={p.name} gradient={p.gradient} className="h-12 w-12 text-sm" />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(p.id); toast(saved ? 'Removed' : 'Saved', { duration: 1500 }) }}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {saved ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
          </button>
        </div>

        {/* Name + Designation */}
        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold">{p.name}</span>
            {p.verified && (
              <svg className="h-4 w-4 shrink-0 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">{p.designation} · {p.company}</div>
        </div>

        {/* Tags: Professional + Available */}
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Professional</span>
          {p.openForReferrals && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Available
            </span>
          )}
        </div>

        {/* Bio */}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">{p.bio}</p>

        {/* Skills */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.skills.slice(0, 4).map((s) => (
            <span key={s} className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{s}</span>
          ))}
          {p.skills.length > 4 && (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">+{p.skills.length - 4}</span>
          )}
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* View profile button */}
        <span className="mt-5 flex h-10 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium">View profile</span>
      </Link>
    </motion.div>
  )
}

function FilterSection({ title, count, children, defaultOpen = true }: { title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
        <span className="flex items-center gap-2">
          {title}
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">{count}</Badge>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="pt-1 pb-2">{children}</div>}
    </div>
  )
}

function FilterSheet({ f, setF, companies, allSkills, allLocations }: { f: Filters; setF: (fn: (p: Filters) => Filters) => void; companies: string[]; allSkills: string[]; allLocations: string[] }) {
  const [companySearch, setCompanySearch] = useState('')
  const [skillSearch, setSkillSearch] = useState('')
  const [showAllSkills, setShowAllSkills] = useState(false)

  const filteredCompanies = useMemo(() =>
    companySearch ? companies.filter(c => c.toLowerCase().includes(companySearch.toLowerCase())) : companies
  , [companies, companySearch])

  const filteredSkills = useMemo(() => {
    const base = skillSearch ? allSkills.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase())) : allSkills
    return showAllSkills ? base : base.slice(0, 12)
  }, [allSkills, skillSearch, showAllSkills])

  const totalSkills = useMemo(() =>
    skillSearch ? allSkills.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase())).length : allSkills.length
  , [allSkills, skillSearch])

  const hasActiveFilters = f.companies.length > 0 || f.skills.length > 0 || f.locations.length > 0

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-1">
          {/* Company */}
          <FilterSection title="Company" count={f.companies.length}>
            {companies.length > 5 && (
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Search companies…"
                  className="h-8 pl-8 text-xs rounded-lg"
                />
              </div>
            )}
            {filteredCompanies.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No companies found</p>
            ) : (
              <div className="space-y-0.5">
                {filteredCompanies.map((c) => (
                  <label
                    key={c}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/50',
                      f.companies.includes(c) && 'bg-primary/5 text-foreground'
                    )}
                  >
                    <Checkbox
                      checked={f.companies.includes(c)}
                      onCheckedChange={() => setF((p) => ({ ...p, companies: toggle(p.companies, c) }))}
                    />
                    <span className="truncate">{c}</span>
                  </label>
                ))}
              </div>
            )}
          </FilterSection>

          <Separator className="my-1" />

          {/* Location */}
          <FilterSection title="Location" count={f.locations.length}>
            {allLocations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No locations available</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allLocations.slice(0, 10).map((loc) => {
                  const active = f.locations.includes(loc)
                  return (
                    <button
                      key={loc}
                      onClick={() => setF((p) => ({ ...p, locations: toggle(p.locations, loc) }))}
                      className={cn(
                        'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                        active
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground'
                      )}
                    >
                      {loc}
                    </button>
                  )
                })}
              </div>
            )}
          </FilterSection>

          <Separator className="my-1" />

          {/* Skills */}
          <FilterSection title="Skills" count={f.skills.length}>
            {allSkills.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No skills available</p>
            ) : (
              <>
                {allSkills.length > 6 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder="Search skills…"
                      className="h-8 pl-8 text-xs rounded-lg"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {filteredSkills.map((s) => {
                    const active = f.skills.includes(s)
                    return (
                      <button
                        key={s}
                        onClick={() => setF((p) => ({ ...p, skills: toggle(p.skills, s) }))}
                        className={cn(
                          'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                          active
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground'
                        )}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
                {totalSkills > 12 && !skillSearch && (
                  <button
                    onClick={() => setShowAllSkills(!showAllSkills)}
                    className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {showAllSkills ? 'Show less' : `Show all ${totalSkills} skills`}
                  </button>
                )}
              </>
            )}
          </FilterSection>

        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t">
        <Button
          variant={hasActiveFilters ? 'default' : 'ghost'}
          size="sm"
          className={cn('w-full', hasActiveFilters ? 'rounded-xl' : 'text-primary')}
          onClick={() => setF(() => EMPTY_FILTERS)}
          disabled={!hasActiveFilters}
        >
          {hasActiveFilters ? `Clear all (${f.companies.length + f.skills.length + f.locations.length})` : 'No active filters'}
        </Button>
      </div>
    </div>
  )
}

export default function FindProfessionals() {
  const { visibleProfessionals: professionals } = useApp()
  const ALL_SKILLS = useMemo(() => [...new Set(professionals.flatMap(p => p.skills))], [professionals])
  const COMPANIES = useMemo(() => [...new Set(professionals.map(p => p.company))], [professionals])
  const ALL_LOCATIONS = useMemo(() => [...new Set(professionals.map(p => p.location).filter(Boolean))], [professionals])
  const loading = usePageLoading(300)
  const [f, setF] = useState<Filters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortKey>('recommended')

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'recommended', label: 'Recommended' },
    { key: 'top_rated', label: 'Top Rated' },
    { key: 'fastest', label: 'Fastest Reply' },
    { key: 'most_referrals', label: 'Most Referrals' },
    { key: 'recent', label: 'Recently Joined' },
  ]

  const results = useMemo(() => {
    const list = professionals.filter((p) => {
      if (f.q) {
        const q = f.q.toLowerCase()
        const hay = [p.name, p.designation, p.company, p.location, ...p.skills].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (f.companies.length && !f.companies.includes(p.company)) return false
      if (f.skills.length && !f.skills.some((s) => p.skills.includes(s))) return false
      if (f.locations.length && !f.locations.includes(p.location)) return false
      if (!p.openForReferrals) return false
      return true
    })
    const by: Record<SortKey, (a: Professional, b: Professional) => number> = {
      recommended: (a, b) => b.responseRate * b.successRate - a.responseRate * a.successRate,
      top_rated: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      fastest: (a, b) => a.avgReplyHours - b.avgReplyHours,
      most_referrals: (a, b) => b.referralsCompleted - a.referralsCompleted,
      recent: (a, b) => b.joinedDaysAgo - a.joinedDaysAgo,
    }
    return list.sort(by[sort])
  }, [f, sort, professionals])

  const activeCount = f.companies.length + f.skills.length + f.locations.length

  return (
    <div className="space-y-6">
      {/* Search row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            value={f.q}
            onChange={(e) => setF((p) => ({ ...p, q: e.target.value }))}
            placeholder="Search by name or role…"
            className="h-11 rounded-xl pl-10 text-sm"
          />
          {f.q && (
            <button onClick={() => setF((p) => ({ ...p, q: '' }))} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground">
              <span className="hidden sm:inline">{SORT_OPTIONS.find((o) => o.key === sort)?.label}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={cn(
                  'flex w-full items-center rounded-md px-2.5 py-2 text-sm hover:bg-muted',
                  sort === opt.key && 'bg-muted font-medium text-primary'
                )}
              >
                {opt.label}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 rounded-xl px-4 text-sm">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{activeCount}</span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 flex flex-col gap-0 p-0">
            <SheetHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">{activeCount}</Badge>
                  )}
                </SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-hidden px-6 py-4">
              <FilterSheet f={f} setF={setF} companies={COMPANIES} allSkills={ALL_SKILLS} allLocations={ALL_LOCATIONS} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results */}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No professionals found"
          description="Try a different search or clear your filters."
          action={<Button variant="ghost" size="sm" onClick={() => setF(EMPTY_FILTERS)}>Clear filters</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {results.map((p, i) => <ProfessionalCard key={p.id} p={p} index={i} />)}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
