import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, Clock, Eye, Loader2, BadgeCheck, Shield, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GAvatar } from '@/components/ui-kit'
import { GRADIENTS } from '@/data/mock'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { ListSkeleton } from '@/components/ui/skeleton'
import { logAdminAction } from '@/lib/db'

interface VerificationRequest {
  id: string
  user_id: string
  request_type: 'email_otp' | 'id_card'
  work_email: string | null
  id_card_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  full_name: string
  email: string
  avatar_url: string | null
}

export default function AdminApprovals() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const { data: vrData, error: vrError } = await supabase
        .from('verification_requests')
        .select('id, user_id, request_type, work_email, id_card_url, status, created_at, reviewed_at')
        .order('created_at', { ascending: false })

      if (vrError || !vrData) {
        toast.error('Failed to load verification requests')
        setRequests([])
        setLoading(false)
        return
      }

      const userIds = [...new Set(vrData.map(r => r.user_id))]
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds)

      const userMap = new Map<string, { full_name: string; email: string; avatar_url: string | null }>()
      for (const u of users ?? []) {
        userMap.set(u.id, { full_name: u.full_name, email: u.email, avatar_url: u.avatar_url })
      }

      const mapped: VerificationRequest[] = vrData.map(r => {
        const user = userMap.get(r.user_id)
        return {
          ...r,
          full_name: user?.full_name ?? 'Unknown',
          email: user?.email ?? '',
          avatar_url: user?.avatar_url ?? null,
        }
      })

      const pending = mapped.filter(r => r.status === 'pending')
      const reviewed = mapped.filter(r => r.status !== 'pending')
      setRequests([...pending, ...reviewed])
    } catch {
      toast.error('Failed to load verification requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRequests() }, [loadRequests])

  const handleReview = async (requestId: string, approve: boolean) => {
    setProcessingId(requestId)
    try {
      const { error } = await supabase.rpc('review_verification_request', {
        p_request_id: requestId,
        p_approve: approve,
      })

      if (error) {
        toast.error(`Failed to ${approve ? 'approve' : 'reject'} request`)
        return
      }

      setRequests(prev => prev.map(r =>
        r.id === requestId
          ? { ...r, status: approve ? 'approved' as const : 'rejected' as const, reviewed_at: new Date().toISOString() }
          : r
      ))

      toast.success(approve ? 'Request approved' : 'Request rejected')
      logAdminAction(approve ? 'approved_verification' : 'rejected_verification', requestId)
    } catch {
      toast.error('Operation failed')
    } finally {
      setProcessingId(null)
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const reviewedCount = requests.filter(r => r.status !== 'pending').length

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Verification Approvals</h2>
          <p className="mt-0.5 text-[14px] text-muted-foreground">Review and manage user verification requests</p>
        </div>
        <ListSkeleton count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Verification Approvals</h2>
          <p className="mt-0.5 text-[14px] text-muted-foreground">
            {pendingCount} pending, {reviewedCount} reviewed
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadRequests}>
          <Loader2 className="mr-1 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <BadgeCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Requests</h3>
              <p className="mt-2 text-sm text-muted-foreground">No verification requests to review.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <Card key={r.id} className={`shadow-soft ${r.status === 'pending' ? 'border-amber-500/20' : ''}`}>
              <CardContent className="flex items-center gap-4 p-4">
                <GAvatar
                  name={r.full_name}
                  gradient={GRADIENTS[Math.abs(r.user_id.charCodeAt(0)) % GRADIENTS.length]}
                  className="h-10 w-10 shrink-0 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{r.full_name}</span>
                    <Badge
                      variant="outline"
                      className={
                        r.request_type === 'email_otp'
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/25'
                          : 'bg-violet-500/10 text-violet-600 border-violet-500/25'
                      }
                    >
                      {r.request_type === 'email_otp' ? (
                        <><BadgeCheck className="mr-1 h-3 w-3" />Email OTP</>
                      ) : (
                        <><Shield className="mr-1 h-3 w-3" />ID Card</>
                      )}
                    </Badge>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {r.work_email && (
                      <span className="flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3" />
                        Work: {r.work_email}
                      </span>
                    )}
                    {r.request_type === 'id_card' && r.id_card_url && (
                      <a
                        href={r.id_card_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View ID Card
                      </a>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(r.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.status === 'pending' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                        disabled={processingId === r.id}
                        onClick={() => handleReview(r.id, true)}
                      >
                        {processingId === r.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                        disabled={processingId === r.id}
                        onClick={() => handleReview(r.id, false)}
                      >
                        {processingId === r.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                        )}
                        Reject
                      </Button>
                    </>
                  ) : (
                    <Badge
                      variant="outline"
                      className={
                        r.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/25'
                      }
                    >
                      {r.status === 'approved' ? (
                        <><CheckCircle2 className="mr-1 h-3 w-3" />Approved</>
                      ) : (
                        <><XCircle className="mr-1 h-3 w-3" />Rejected</>
                      )}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
