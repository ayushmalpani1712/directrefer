import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'

import { toast } from 'sonner'
import { CheckCircle, XCircle, Clock, Coins, Trophy, CreditCard } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface IncentiveRecord {
  id: string
  user_id: string
  user_name?: string
  user_email?: string
  type: string
  points: number
  status: string
  reference_id: string | null
  created_at: string
}

interface IncentiveStats {
  total_points: number
  pending_count: number
  approved_count: number
  rejected_count: number
}

export default function IncentiveAdmin() {
  const { user } = useAuth()
  const [incentives, setIncentives] = useState<IncentiveRecord[]>([])
  const [stats, setStats] = useState<IncentiveStats>({
    total_points: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
  })
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchIncentives()
  }, [statusFilter])

  async function fetchIncentives() {
    setLoading(true)
    try {
      let query = supabase
        .from('incentives')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      const records = (data ?? []) as IncentiveRecord[]

      const userIds = [...new Set(records.map((r) => r.user_id))]
      let userMap: Record<string, { full_name?: string; email?: string }> = {}

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', userIds)

        if (users) {
          userMap = Object.fromEntries(users.map((u: Record<string, unknown>) => [u.id, u]))
        }
      }

      const enriched = records.map((r) => ({
        ...r,
        user_name: userMap[r.user_id]?.full_name || 'Unknown',
        user_email: userMap[r.user_id]?.email || '',
      }))

      setIncentives(enriched)

      const allRecords = enriched as IncentiveRecord[]
      setStats({
        total_points: allRecords.reduce((sum, r) => sum + (r.points || 0), 0),
        pending_count: allRecords.filter((r) => r.status === 'pending').length,
        approved_count: allRecords.filter((r) => r.status === 'approved').length,
        rejected_count: allRecords.filter((r) => r.status === 'rejected').length,
      })
    } catch (err) {
      console.error('Failed to fetch incentives:', err)
      toast.error('Failed to load incentives')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    if (!user) return
    setUpdatingId(id)
    try {
      const { error } = await supabase
        .from('incentives')
        .update({ status: 'approved' })
        .eq('id', id)

      if (error) throw error

      toast.success('Incentive approved')
      fetchIncentives()
    } catch (err) {
      console.error('Failed to approve:', err)
      toast.error('Failed to approve incentive')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleReject(id: string) {
    if (!user) return
    setUpdatingId(id)
    try {
      const { error } = await supabase
        .from('incentives')
        .update({ status: 'rejected' })
        .eq('id', id)

      if (error) throw error

      toast.success('Incentive rejected')
      fetchIncentives()
    } catch (err) {
      console.error('Failed to reject:', err)
      toast.error('Failed to reject incentive')
    } finally {
      setUpdatingId(null)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600"><Clock className="h-3 w-3" />Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600"><CheckCircle className="h-3 w-3" />Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="gap-1 border-rose-500/30 bg-rose-500/10 text-rose-600"><XCircle className="h-3 w-3" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'points':
        return <Coins className="h-4 w-4 text-amber-500" />
      case 'badge':
        return <Trophy className="h-4 w-4 text-violet-500" />
      case 'monetary':
        return <CreditCard className="h-4 w-4 text-emerald-500" />
      default:
        return <Coins className="h-4 w-4" />
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const columns = [
    {
      key: 'user_name',
      label: 'User',
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as IncentiveRecord
        return (
          <div>
            <div className="font-medium">{r.user_name}</div>
            <div className="text-xs text-muted-foreground">{r.user_email}</div>
          </div>
        )
      },
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as IncentiveRecord
        return (
          <div className="flex items-center gap-2">
            {getTypeIcon(r.type)}
            <span className="capitalize">{r.type}</span>
          </div>
        )
      },
    },
    {
      key: 'points',
      label: 'Points',
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as IncentiveRecord
        return <span className="font-semibold">{r.points}</span>
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as IncentiveRecord
        return getStatusBadge(r.status)
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as IncentiveRecord
        return <span className="text-sm text-muted-foreground">{formatDate(r.created_at)}</span>
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as IncentiveRecord
        if (r.status === 'pending') {
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => handleApprove(r.id)}
                disabled={updatingId === r.id}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => handleReject(r.id)}
                disabled={updatingId === r.id}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          )
        }
        return <span className="text-sm text-muted-foreground">-</span>
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Incentive Management</h1>
        <p className="text-muted-foreground">Review and manage user incentives</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" />
            Total Points
          </div>
          <div className="mt-2 text-3xl font-bold">{stats.total_points.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Pending
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-600">{stats.pending_count}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            Approved
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">{stats.approved_count}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4" />
            Rejected
          </div>
          <div className="mt-2 text-3xl font-bold text-rose-600">{stats.rejected_count}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchIncentives} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={incentives as unknown as Record<string, unknown>[]}
          pageSize={10}
          filterPlaceholder="Search by user name or email..."
        />
      )}
    </div>
  )
}