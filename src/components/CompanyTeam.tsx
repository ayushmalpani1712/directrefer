import { useState, useEffect, useCallback } from 'react'
import { Crown, Shield, UserPlus, Trash2, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  getCompanyMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  type CompanyMember,
  type TeamRole,
} from '@/lib/team'
import { transferOwnership } from '@/lib/companyOwnership'

const ROLE_CONFIG: Record<TeamRole, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning'; icon?: typeof Crown }> = {
  owner: { label: 'Owner', variant: 'success', icon: Crown },
  admin: { label: 'Admin', variant: 'default', icon: Shield },
  recruiter: { label: 'Recruiter', variant: 'secondary' },
  viewer: { label: 'Viewer', variant: 'outline' },
}

interface CompanyTeamProps {
  companyId: string
  currentUserId: string
}

export function CompanyTeam({ companyId, currentUserId }: CompanyTeamProps) {
  const [members, setMembers] = useState<CompanyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeMemberTarget, setRemoveMemberTarget] = useState<CompanyMember | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('viewer')
  const [inviting, setInviting] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getCompanyMembers(companyId)
      setMembers(data)
    } catch {
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    try {
      setInviting(true)
      await inviteMember(companyId, inviteEmail.trim(), inviteRole, currentUserId)
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('viewer')
      await fetchMembers()
    } catch (e) {
      toast.error((e as Error).message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (member: CompanyMember) => {
    if (member.role === 'owner') {
      toast.error('Cannot remove the owner')
      return
    }

    try {
      await removeMember(member.id)
      toast.success(`${member.user?.full_name ?? 'Member'} removed`)
      setRemoveMemberTarget(null)
      await fetchMembers()
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const handleRoleChange = async (memberId: string, newRole: TeamRole, member: CompanyMember) => {
    if (member.role === 'owner') {
      toast.error('Cannot change the owner role directly. Transfer ownership first.')
      return
    }

    if (newRole === 'owner') {
      try {
        await transferOwnership(companyId, currentUserId, member.user_id)
        toast.success('Ownership transferred')
        await fetchMembers()
      } catch (e) {
        toast.error((e as Error).message || 'Failed to transfer ownership')
      }
      return
    }

    try {
      await updateMemberRole(memberId, newRole)
      toast.success(`Role updated to ${ROLE_CONFIG[newRole].label}`)
      await fetchMembers()
    } catch {
      toast.error('Failed to update role')
    }
  }

  const isOwner = members.some(m => m.user_id === currentUserId && m.role === 'owner')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Team Members</h2>
          <Badge variant="secondary" className="ml-1">
            {members.filter(m => m.status === 'active').length}
          </Badge>
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No team members yet</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invited</th>
                {isOwner && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
                const roleConfig = ROLE_CONFIG[member.role]
                const RoleIcon = roleConfig.icon
                const isMemberOwner = member.role === 'owner'
                const isSelf = member.user_id === currentUserId

                return (
                  <tr key={member.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                          {member.user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.user?.full_name ?? 'Unknown'}
                            {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={roleConfig.variant} className="gap-1">
                        {RoleIcon && <RoleIcon className="h-3 w-3" />}
                        {roleConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={member.status === 'active' ? 'success' : member.status === 'invited' ? 'warning' : 'outline'}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {member.invited_at
                        ? new Date(member.invited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3 text-right">
                        {!isMemberOwner && !isSelf && (
                          <div className="flex items-center justify-end gap-1">
                            <Select
                              value={member.role}
                              onValueChange={(v) => handleRoleChange(member.id, v as TeamRole, member)}
                            >
                              <SelectTrigger className="h-8 w-auto text-xs" size="sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="recruiter">Recruiter</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setRemoveMemberTarget(member)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your company team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="invite-email">Email address</label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as TeamRole)}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full access except ownership</SelectItem>
                  <SelectItem value="recruiter">Recruiter — Manage jobs and referrals</SelectItem>
                  <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeMemberTarget}
        onOpenChange={open => !open && setRemoveMemberTarget(null)}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${removeMemberTarget?.user?.full_name ?? 'this member'} from the team?`}
        confirmLabel="Remove"
        onConfirm={() => removeMemberTarget && handleRemove(removeMemberTarget)}
      />
    </div>
  )
}
