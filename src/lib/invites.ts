import { supabase } from '@/lib/supabase'

export interface InviteLink {
  id: string
  inviter_id: string
  code: string
  target_role: string | null
  uses: number
  max_uses: number | null
  created_at: string
}

export async function generateInviteCode(userId: string, targetRole?: string): Promise<string | null> {
  try {
    const code = `dr-${userId.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`
    const { error } = await supabase
      .from('invites')
      .insert({
        inviter_id: userId,
        code,
        target_role: targetRole ?? null,
        uses: 0,
        max_uses: null,
      })
    if (error) return null
    return code
  } catch (err) {
    console.error('generateInviteCode failed:', err)
    return null
  }
}

export async function validateInviteCode(code: string): Promise<{ valid: boolean; inviterId?: string; targetRole?: string }> {
  try {
    const { data, error } = await supabase
      .from('invites')
      .select('inviter_id, target_role, max_uses, uses')
      .eq('code', code)
      .single()
    if (error || !data) return { valid: false }
    if (data.max_uses && data.uses >= data.max_uses) return { valid: false }
    return { valid: true, inviterId: data.inviter_id, targetRole: data.target_role }
  } catch (err) {
    console.error('validateInviteCode failed:', err)
    return { valid: false }
  }
}

export async function recordInviteUse(code: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('increment_invite_uses' as never, { invite_code: code } as never)
    if (error) {
      const { data } = await supabase.from('invites').select('uses').eq('code', code).single()
      if (data) {
        await supabase.from('invites').update({ uses: data.uses + 1 }).eq('code', code)
      }
    }
    return true
  } catch (err) {
    console.error('recordInviteUse failed:', err)
    return false
  }
}

export async function fetchUserInviteStats(userId: string): Promise<{ totalInvites: number; successfulSignups: number }> {
  try {
    const { data } = await supabase
      .from('invites')
      .select('uses')
      .eq('inviter_id', userId)
    if (!data) return { totalInvites: 0, successfulSignups: 0 }
    return {
      totalInvites: data.length,
      successfulSignups: data.reduce((sum, i) => sum + (i.uses || 0), 0),
    }
  } catch (err) {
    console.error('fetchUserInviteStats failed:', err)
    return { totalInvites: 0, successfulSignups: 0 }
  }
}

export async function getInviteUrl(code: string): Promise<string> {
  return `${window.location.origin}/login?invite=${code}`
}
