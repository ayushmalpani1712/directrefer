import { supabase } from '@/lib/supabase'

export type TeamRole = 'owner' | 'admin' | 'recruiter' | 'viewer'

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: TeamRole
  status: 'active' | 'invited' | 'removed'
  invited_by: string | null
  invited_at: string | null
  joined_at: string | null
  created_at: string
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string | null
  }
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const { data, error } = await supabase
    .from('company_members')
    .select(`
      *,
      user:users!company_members_user_id_fkey(id, full_name, email, avatar_url)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as CompanyMember[]
}

export async function inviteMember(
  companyId: string,
  email: string,
  role: TeamRole,
  invitedBy: string,
): Promise<CompanyMember | null> {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (!user) {
    throw new Error('No user found with that email address')
  }

  const { data: existing } = await supabase
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    throw new Error('User is already a member of this company')
  }

  const { data, error } = await supabase
    .from('company_members')
    .insert({
      company_id: companyId,
      user_id: user.id,
      role,
      status: 'invited',
      invited_by: invitedBy,
      invited_at: new Date().toISOString(),
    })
    .select(`
      *,
      user:users!company_members_user_id_fkey(id, full_name, email, avatar_url)
    `)
    .single()

  if (error) throw error
  return data as CompanyMember
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .update({ status: 'removed' })
    .eq('id', memberId)

  if (error) throw error
}

export async function updateMemberRole(memberId: string, role: TeamRole): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .update({ role })
    .eq('id', memberId)

  if (error) throw error
}

export async function acceptInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .update({
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    .eq('id', inviteId)

  if (error) throw error
}
