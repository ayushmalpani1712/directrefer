import { supabase } from '@/lib/supabase'

export interface SessionInvalidation {
  id: string
  user_id: string
  reason: string
  invalidated_at: string
  invalidated_by: string | null
}

export async function checkSessionInvalidation(
  userId: string
): Promise<{ isInvalidated: boolean; record?: SessionInvalidation; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('session_invalidations')
      .select('id, user_id, reason, invalidated_at, invalidated_by')
      .eq('user_id', userId)
      .order('invalidated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return { isInvalidated: false, error: error.message }
    }

    if (!data) {
      return { isInvalidated: false }
    }

    const userRes = await supabase
      .from('users')
      .select('last_login_at')
      .eq('id', userId)
      .maybeSingle()

    const lastLogin = userRes.data?.last_login_at
    if (!lastLogin) {
      return { isInvalidated: true, record: data }
    }

    const invalidationTime = new Date(data.invalidated_at).getTime()
    const loginTime = new Date(lastLogin).getTime()

    if (loginTime > invalidationTime) {
      return { isInvalidated: false }
    }

    return { isInvalidated: true, record: data }
  } catch (err) {
    return {
      isInvalidated: false,
      error: err instanceof Error ? err.message : 'Failed to check session invalidation',
    }
  }
}

export async function invalidateAllSessions(
  reason: string,
  adminUserId?: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const { data: activeUsers, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    if (!activeUsers || activeUsers.length === 0) {
      return { success: true, count: 0 }
    }

    const invalidations = activeUsers.map((u) => ({
      user_id: u.id,
      reason,
      invalidated_by: adminUserId ?? null,
      invalidated_at: new Date().toISOString(),
    }))

    const { error: insertError } = await supabase
      .from('session_invalidations')
      .insert(invalidations)

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    const { error: loginError } = await supabase
      .from('users')
      .update({ last_login_at: null })
      .in('id', activeUsers.map((u) => u.id))

    if (loginError) {
      console.warn('Failed to clear last_login_at:', loginError.message)
    }

    return { success: true, count: activeUsers.length }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to invalidate sessions',
    }
  }
}

export async function invalidateUserSession(
  userId: string,
  reason: string,
  adminUserId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('session_invalidations')
      .insert({
        user_id: userId,
        reason,
        invalidated_by: adminUserId ?? null,
        invalidated_at: new Date().toISOString(),
      })

    if (error) {
      return { success: false, error: error.message }
    }

    await supabase
      .from('users')
      .update({ last_login_at: null })
      .eq('id', userId)

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to invalidate session',
    }
  }
}
