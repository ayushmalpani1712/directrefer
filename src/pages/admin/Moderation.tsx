import { useState, useEffect, useCallback } from 'react'
import { Flag, Ban, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GAvatar } from '@/components/ui-kit'
import { GRADIENTS } from '@/data/mock'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { fetchReportsWithUsers, updateReportStatus, dismissReportAndBanUser, logAdminAction, type ReportWithUsers } from '@/lib/db'

type FilterTab = 'all' | 'open' | 'resolved' | 'dismissed'

export default function AdminModeration() {
  const [reports, setReports] = useState<ReportWithUsers[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [confirmAction, setConfirmAction] = useState<{
    type: 'dismiss' | 'ban'
    report: ReportWithUsers
  } | null>(null)

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchReportsWithUsers()
      setReports(data)
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadReports() }, [loadReports])

  const filtered = activeTab === 'all'
    ? reports
    : reports.filter(r => r.status === activeTab)

  const countByStatus = (status: string) => reports.filter(r => r.status === status).length

  const handleDismiss = async () => {
    if (!confirmAction || confirmAction.type !== 'dismiss') return
    const report = confirmAction.report
    try {
      const ok = await updateReportStatus(report.id, 'dismissed')
      if (ok) {
        setReports(prev => prev.filter(r => r.id !== report.id))
        toast.success('Report dismissed')
        logAdminAction('dismissed_report', report.id)
      } else {
        toast.error('Failed to dismiss report')
      }
    } catch {
      toast.error('Failed to dismiss report')
    }
    setConfirmAction(null)
  }

  const handleBanAndDismiss = async () => {
    if (!confirmAction || confirmAction.type !== 'ban') return
    const report = confirmAction.report
    try {
      const ok = await dismissReportAndBanUser(report.id, report.target_id)
      if (ok) {
        setReports(prev => prev.filter(r => r.id !== report.id))
        toast.success('User banned and report resolved')
        logAdminAction('banned_user_from_report', report.target_id, { reportId: report.id })
      } else {
        toast.error('Failed to ban user')
      }
    } catch {
      toast.error('Failed to ban user')
    }
    setConfirmAction(null)
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Pending' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'dismissed', label: 'Dismissed' },
  ]

  const statusBadge = (status: string) => {
    switch (status) {
      case 'open':
      case 'under_review':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/25"><AlertTriangle className="mr-1 h-3 w-3" />Pending</Badge>
      case 'resolved':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/25"><CheckCircle2 className="mr-1 h-3 w-3" />Resolved</Badge>
      case 'dismissed':
        return <Badge className="bg-muted text-muted-foreground"><Ban className="mr-1 h-3 w-3" />Dismissed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight">Reported Content</h2>
        <p className="mt-0.5 text-[14px] text-muted-foreground">Review and moderate user reports</p>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            <Badge variant="outline" className="ml-1 text-xs">
              {t.key === 'all' ? reports.length : countByStatus(t.key)}
            </Badge>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="shadow-soft">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <Flag className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Reports</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {activeTab === 'all'
                  ? 'No reports have been submitted.'
                  : `No ${activeTab} reports found.`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <Card key={report.id} className="shadow-soft">
              <CardContent className="flex items-start gap-4 p-4">
                <GAvatar
                  name={report.reporter_name}
                  color={GRADIENTS[Math.abs(report.reporter_id.charCodeAt(0)) % GRADIENTS.length]}
                  className="h-10 w-10 shrink-0 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{report.reporter_name}</span>
                    <span className="text-xs text-muted-foreground">reported</span>
                    <span className="text-sm font-semibold">{report.target_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {report.target_role}
                    </Badge>
                    {statusBadge(report.status)}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-medium text-rose-500">{report.reason}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {report.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                  )}
                </div>
                {(report.status === 'open' || report.status === 'under_review') && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmAction({ type: 'dismiss', report })}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Dismiss
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                      onClick={() => setConfirmAction({ type: 'ban', report })}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" />
                      Ban & Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmAction?.type === 'dismiss'}
        onOpenChange={(open) => { if (!open) setConfirmAction(null) }}
        title="Dismiss Report"
        description={`Are you sure you want to dismiss this report against ${confirmAction?.type === 'dismiss' ? confirmAction.report.target_name : ''}?`}
        confirmLabel="Dismiss"
        onConfirm={handleDismiss}
      />

      <ConfirmDialog
        open={confirmAction?.type === 'ban'}
        onOpenChange={(open) => { if (!open) setConfirmAction(null) }}
        title="Ban User & Dismiss Report"
        description={`This will permanently ban ${confirmAction?.type === 'ban' ? confirmAction.report.target_name : ''} and dismiss the report. This action cannot be undone.`}
        confirmLabel="Ban User"
        variant="destructive"
        onConfirm={handleBanAndDismiss}
      />
    </div>
  )
}
