import { supabase } from '@/lib/supabase'

export interface CompanyOwner {
  company_id: string
  user_id: string
  full_name: string
  email: string
}

export async function enforceOwnerUniqueness(companyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('role', 'owner')
    .maybeSingle()

  if (error) throw error
  return data !== null
}

export async function getCompanyOwner(companyId: string): Promise<CompanyOwner | null> {
  const { data, error } = await supabase
    .from('company_members')
    .select(`
      company_id,
      user_id,
      user:users!company_members_user_id_fkey(full_name, email)
    `)
    .eq('company_id', companyId)
    .eq('role', 'owner')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const user = Array.isArray(data.user) ? data.user[0] : data.user as { full_name: string; email: string } | null
  return {
    company_id: data.company_id,
    user_id: data.user_id,
    full_name: user?.full_name ?? '',
    email: user?.email ?? '',
  }
}

export async function transferOwnership(
  companyId: string,
  currentOwnerId: string,
  newOwnerId: string,
): Promise<void> {
  const hasOwner = await enforceOwnerUniqueness(companyId)
  if (!hasOwner) {
    throw new Error('No current owner found')
  }

  const { data: currentOwner } = await supabase
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', currentOwnerId)
    .eq('role', 'owner')
    .maybeSingle()

  if (!currentOwner) {
    throw new Error('Current user is not the owner')
  }

  const { data: newOwnerMember } = await supabase
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', newOwnerId)
    .maybeSingle()

  if (!newOwnerMember) {
    throw new Error('New owner must be a company member first')
  }

  const { error: demoteError } = await supabase
    .from('company_members')
    .update({ role: 'admin' })
    .eq('id', currentOwner.id)

  if (demoteError) throw demoteError

  const { error: promoteError } = await supabase
    .from('company_members')
    .update({ role: 'owner' })
    .eq('id', newOwnerMember.id)

  if (promoteError) throw promoteError
}
