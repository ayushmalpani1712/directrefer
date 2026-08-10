import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { fetchAuditLogs, type AuditLogEntry } from '@/lib/db'

export default function AdminAuditLog() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  const loadAuditLogs = useCallback(async () => {
    setLoading(true)
    try {
      const logs = await fetchAuditLogs(100)
      setAuditLogs(logs)
    } catch {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAuditLogs() }, [loadAuditLogs])

  const getActionBadgeColor = (action: string) => {
    if (action.includes('deleted') || action.includes('suspended') || action.includes('banned')) return 'bg-rose-500/10 text-rose-600 border-rose-500/25'
    if (action.includes('updated') || action.includes('created') || action.includes('reactivated')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
    if (action.includes('dismissed')) return 'bg-amber-500/10 text-amber-600 border-amber-500/25'
    return 'bg-blue-500/10 text-blue-600 border-blue-500/25'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recent admin actions</h3>
        <Button variant="ghost" size="sm" onClick={loadAuditLogs} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {auditLogs.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{loading ? 'Loading audit logs...' : 'No audit logs yet'}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-soft">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-4">Admin</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Target</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-4 font-medium">{log.admin_name}</td>
                      <td className="p-4">
                        <Badge variant="outline" className={`text-xs ${getActionBadgeColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{log.target_name || '—'}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
