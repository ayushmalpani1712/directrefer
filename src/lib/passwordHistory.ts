import { supabase } from '@/lib/supabase'

const MAX_HISTORY = 5

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function checkPasswordHistory(
  userId: string,
  newPassword: string
): Promise<{ isReused: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('password_history')
      .select('password_hash')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY)

    if (error) {
      return { isReused: false, error: error.message }
    }

    const newHash = await sha256(newPassword)
    const isReused = (data ?? []).some((entry) => entry.password_hash === newHash)

    return { isReused }
  } catch (err) {
    return {
      isReused: false,
      error: err instanceof Error ? err.message : 'Failed to check password history',
    }
  }
}

export async function recordPassword(
  userId: string,
  passwordHash: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('password_history')
      .insert({
        user_id: userId,
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
      })

    if (error) {
      return { success: false, error: error.message }
    }

    const { error: trimError } = await supabase.rpc('trim_password_history', {
      p_user_id: userId,
      p_max_count: MAX_HISTORY,
    })

    if (trimError) {
      console.warn('Failed to trim password history:', trimError.message)
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to record password',
    }
  }
}

export async function hashAndRecordPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const hash = await sha256(newPassword)
  return recordPassword(userId, hash)
}
