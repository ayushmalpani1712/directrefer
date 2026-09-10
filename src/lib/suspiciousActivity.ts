import { supabase } from '@/lib/supabase'

export type SuspiciousActivityType =
  | 'mass_referral'
  | 'rapid_screening'
  | 'bulk_login'
  | 'data_scraper'

export interface SuspiciousActivity {
  id: string
  user_id: string
  activity_type: SuspiciousActivityType
  details: Record<string, unknown>
  ip_address: string | null
  detected_at: string
}

const THRESHOLDS: Record<SuspiciousActivityType, { count: number; windowMs: number }> = {
  mass_referral: { count: 10, windowMs: 3_600_000 },
  rapid_screening: { count: 5, windowMs: 3_600_000 },
  bulk_login: { count: 20, windowMs: 3_600_000 },
  data_scraper: { count: 50, windowMs: 3_600_000 },
}

export async function reportSuspiciousActivity(
  userId: string,
  type: SuspiciousActivityType,
  details: Record<string, unknown>,
  ip?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('suspicious_activity')
      .insert({
        user_id: userId,
        activity_type: type,
        details,
        ip_address: ip ?? null,
        detected_at: new Date().toISOString(),
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to report suspicious activity',
    }
  }
}

export async function checkSuspiciousActivity(
  userId: string,
  type?: SuspiciousActivityType
): Promise<{ isSuspicious: boolean; count: number; threshold?: number; error?: string }> {
  try {
    const typesToCheck: SuspiciousActivityType[] = type ? [type] : (Object.keys(THRESHOLDS) as SuspiciousActivityType[])
    let maxExceeded = false
    let maxCount = 0
    let maxThreshold = 0

    for (const activityType of typesToCheck) {
      const threshold = THRESHOLDS[activityType]
      const windowStart = new Date(Date.now() - threshold.windowMs).toISOString()

      const { count, error } = await supabase
        .from('suspicious_activity')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('activity_type', activityType)
        .gte('detected_at', windowStart)

      if (error) {
        return { isSuspicious: false, count: 0, error: error.message }
      }

      const currentCount = count ?? 0
      if (currentCount > threshold.count) {
        maxExceeded = true
        if (currentCount > maxCount) {
          maxCount = currentCount
          maxThreshold = threshold.count
        }
      }
    }

    return {
      isSuspicious: maxExceeded,
      count: maxCount,
      threshold: maxThreshold || undefined,
    }
  } catch (err) {
    return {
      isSuspicious: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Failed to check suspicious activity',
    }
  }
}

export async function getRecentSuspiciousActivity(
  userId: string,
  limit = 20
): Promise<{ activities: SuspiciousActivity[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('suspicious_activity')
      .select('id, user_id, activity_type, details, ip_address, detected_at')
      .eq('user_id', userId)
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { activities: [], error: error.message }
    }

    return {
      activities: (data ?? []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        activity_type: row.activity_type as SuspiciousActivityType,
        details: (row.details as Record<string, unknown>) ?? {},
        ip_address: row.ip_address,
        detected_at: row.detected_at,
      })),
    }
  } catch (err) {
    return {
      activities: [],
      error: err instanceof Error ? err.message : 'Failed to fetch suspicious activity',
    }
  }
}

export async function logAndCheckActivity(
  userId: string,
  type: SuspiciousActivityType,
  details: Record<string, unknown>,
  ip?: string
): Promise<{ blocked: boolean; error?: string }> {
  await reportSuspiciousActivity(userId, type, details, ip)
  const check = await checkSuspiciousActivity(userId, type)
  return { blocked: check.isSuspicious, error: check.error }
}
