import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GAvatar } from '@/components/ui-kit'
import { GRADIENTS } from '@/data/mock'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { fetchAdminReferrals, deleteReferralAdmin, logAdminAction, type AdminReferral } from '@/lib/db'
import { StableTabs, StableTabPanel } from '@/components/StableTabs'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  accepted: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-rose-500/10 text-rose-500',
  expired: 'bg-muted text-muted-foreground',
  hired: 'bg-sky-500/10 text-sky-500',
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<AdminReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminReferrals()
      setReferrals(data)
    } catch {
      toast.error('Failed to load referrals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: referrals.length }
    for (const r of referrals) counts[r.status] = (counts[r.status] || 0) + 1
    return counts
  }, [referrals])

  const handleDelete = async () => {
    if (!deleteId) return
    const ok = await deleteReferralAdmin(deleteId)
    if (ok) {
      setReferrals((prev) => prev.filter((r) => r.id !== deleteId))
      toast.success('Referral deleted')
      logAdminAction('deleted_referral', deleteId)
    } else {
      toast.error('Failed to delete referral')
    }
    setDeleteId(null)
  }

  const stats = useMemo(() => {
    const accepted = referrals.filter((r) => r.status === 'accepted').length
    const pending = referrals.filter((r) => r.status === 'pending').length
    const conversion = referrals.length > 0 ? Math.round((accepted / referrals.length) * 100) : 0
    return { total: referrals.length, accepted, pending, conversion }
  }, [referrals])

  const renderReferralTable = (status: string) => {
    const tabFiltered = referrals.filter((r) => {
      if (status !== 'all' && r.status !== status) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${r.requesterName} ${r.professionalName} ${r.jobTitle} ${r.status}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return (
      loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading referrals…</div>
      ) : tabFiltered.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No referrals found.</div>
      ) : (
        <>
          {/* Mobile: card view */}
          <div className="space-y-3 md:hidden">
            {tabFiltered.map((r, i) => (
              <Card key={r.id} className="shadow-soft">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-xs ${STATUS_STYLES[r.status] || ''}`}>
                      {r.status}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <GAvatar name={r.requesterName} gradient={GRADIENTS[i % GRADIENTS.length]} className="h-7 w-7 text-[10px] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">Requester</div>
                        <div className="text-sm font-medium truncate">{r.requesterName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <GAvatar name={r.professionalName} gradient={GRADIENTS[(i + 3) % GRADIENTS.length]} className="h-7 w-7 text-[10px] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">Professional</div>
                        <div className="text-sm font-medium truncate">{r.professionalName}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground min-w-0 truncate">{r.jobTitle || '—'}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 shrink-0"
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table view */}
          <Card className="shadow-soft hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Requester</th>
                      <th className="px-4 py-3 font-medium">Professional</th>
                      <th className="px-4 py-3 font-medium">Job Title</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabFiltered.map((r, i) => (
                      <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <GAvatar name={r.requesterName} gradient={GRADIENTS[i % GRADIENTS.length]} className="h-7 w-7 text-[10px]" />
                            <div>
                              <div className="font-medium">{r.requesterName}</div>
                              <div className="text-xs text-muted-foreground">{r.requesterId.slice(0, 8)}…</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <GAvatar name={r.professionalName} gradient={GRADIENTS[(i + 3) % GRADIENTS.length]} className="h-7 w-7 text-[10px]" />
                            <div>
                              <div className="font-medium">{r.professionalName}</div>
                              <div className="text-xs text-muted-foreground">{r.professionalId.slice(0, 8)}…</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.jobTitle || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={STATUS_STYLES[r.status] || ''}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                            onClick={() => setDeleteId(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Referrals</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-emerald-500">{stats.accepted}</div>
          <div className="text-xs text-muted-foreground">Accepted</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-primary">{stats.conversion}%</div>
          <div className="text-xs text-muted-foreground">Conversion Rate</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, job title, or status…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({statusCounts.all || 0})</SelectItem>
            <SelectItem value="pending">Pending ({statusCounts.pending || 0})</SelectItem>
            <SelectItem value="accepted">Accepted ({statusCounts.accepted || 0})</SelectItem>
            <SelectItem value="rejected">Rejected ({statusCounts.rejected || 0})</SelectItem>
            <SelectItem value="expired">Expired ({statusCounts.expired || 0})</SelectItem>
            <SelectItem value="hired">Hired ({statusCounts.hired || 0})</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <StableTabs value={statusFilter} className="mt-3">
        <StableTabPanel value="all">{renderReferralTable('all')}</StableTabPanel>
        <StableTabPanel value="pending">{renderReferralTable('pending')}</StableTabPanel>
        <StableTabPanel value="accepted">{renderReferralTable('accepted')}</StableTabPanel>
        <StableTabPanel value="rejected">{renderReferralTable('rejected')}</StableTabPanel>
        <StableTabPanel value="expired">{renderReferralTable('expired')}</StableTabPanel>
        <StableTabPanel value="hired">{renderReferralTable('hired')}</StableTabPanel>
      </StableTabs>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => { if (!o) setDeleteId(null) }}
        title="Delete referral"
        description="This will permanently remove this referral record. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  )
}
