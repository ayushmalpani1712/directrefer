import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/db'

const IMPERSONATION_KEY = 'dr_impersonation'
const IMPERSONATION_USER_KEY = 'dr_impersonation_user'

export interface ImpersonationState {
  adminId: string
  targetUserId: string
  targetUserName: string
  targetUserEmail: string
  startedAt: string
}

export function isImpersonating(): boolean {
  try {
    const stored = localStorage.getItem(IMPERSONATION_KEY)
    return stored === 'true'
  } catch {
    return false
  }
}

export function getImpersonationState(): ImpersonationState | null {
  try {
    const stored = localStorage.getItem(IMPERSONATION_USER_KEY)
    if (!stored) return null
    return JSON.parse(stored) as ImpersonationState
  } catch {
    return null
  }
}

export async function startImpersonation(
  adminId: string,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', targetUserId)
      .single()

    if (fetchError || !targetUser) {
      return { success: false, error: 'Target user not found' }
    }

    const state: ImpersonationState = {
      adminId,
      targetUserId,
      targetUserName: targetUser.full_name,
      targetUserEmail: targetUser.email,
      startedAt: new Date().toISOString(),
    }

    localStorage.setItem(IMPERSONATION_KEY, 'true')
    localStorage.setItem(IMPERSONATION_USER_KEY, JSON.stringify(state))

    await logAdminAction('started_impersonation', targetUserId, {
      targetName: targetUser.full_name,
      targetEmail: targetUser.email,
    })

    return { success: true }
  } catch (err) {
    console.error('Failed to start impersonation:', err)
    return { success: false, error: 'Failed to start impersonation' }
  }
}

export async function stopImpersonation(): Promise<void> {
  const state = getImpersonationState()
  if (state) {
    await logAdminAction('stopped_impersonation', state.targetUserId, {
      durationMs: Date.now() - new Date(state.startedAt).getTime(),
    }).catch(() => {})
  }

  try {
    localStorage.removeItem(IMPERSONATION_KEY)
    localStorage.removeItem(IMPERSONATION_USER_KEY)
  } catch {
    /* ignore */
  }
}
