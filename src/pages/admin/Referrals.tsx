import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AdminReferral {
  id: string
  job_title: string
  status: string
  created_at: string
  requester_name: string
  professional_name: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/25',
  accepted: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25',
  rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/25',
  expired: 'bg-muted text-muted-foreground border-border',
  hired: 'bg-blue-500/10 text-blue-600 border-blue-500/25',
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<AdminReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('referrals')
        .select('id, job_title, status, created_at, requester_id, professional_id')
        .order('created_at', { ascending: false })

      if (error || !data || data.length === 0) {
        setReferrals([])
        setLoading(false)
        return
      }

      const allIds = [...new Set([
        ...data.map(r => r.requester_id).filter(Boolean),
        ...data.map(r => r.professional_id).filter(Boolean),
      ])]

      const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', allIds)

      const userMap = new Map<string, string>()
      for (const u of users ?? []) userMap.set(u.id, u.full_name ?? 'Unknown')

      setReferrals(data.map(r => ({
        id: r.id,
        job_title: r.job_title ?? '',
        status: r.status ?? 'pending',
        created_at: r.created_at,
        requester_name: userMap.get(r.requester_id) ?? 'Unknown',
        professional_name: userMap.get(r.professional_id) ?? 'Unknown',
      })))
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = referrals.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return [r.requester_name, r.professional_name, r.job_title].join(' ').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">All Referrals</h2>
          <p className="text-xs text-muted-foreground">{referrals.length} total &middot; {referrals.filter(r => r.status === 'pending').length} pending</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">From</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">To</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No referrals found</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 font-medium whitespace-nowrap">{r.requester_name}</td>
                <td className="px-4 py-2.5 font-medium whitespace-nowrap">{r.professional_name}</td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{r.job_title || '—'}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_STYLES[r.status] ?? ''}`}>{r.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
