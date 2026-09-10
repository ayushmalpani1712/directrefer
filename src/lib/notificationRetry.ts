// ============================================================================
// DirectRefer V2.0 — Failed Notification Retry Logic
// ============================================================================
// Client-side retry mechanism for notifications that failed delivery.
// Uses exponential backoff: 1min, 5min, 30min.
// ============================================================================

import { supabase } from '@/lib/supabase'

const MAX_RETRIES = 3
const BACKOFF_DELAYS_MS = [60_000, 300_000_000, 1_800_000_000] // 1min, 5min, 30min
const RETRY_INTERVAL_MS = 5 * 60_000 // Check every 5 minutes

let retryTimer: ReturnType<typeof setInterval> | null = null

// ── Core Operations ────────────────────────────────────────────────────────

/**
 * Mark a notification as failed with error details.
 */
export async function markNotificationFailed(
  notificationId: string,
  error: string
): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({
        metadata: { delivery_status: 'failed', error, retry_count: 0 },
      })
      .eq('id', notificationId)
  } catch (err) {
    console.error('Failed to mark notification as failed:', err)
  }
}

/**
 * Retry a single failed notification with exponential backoff.
 */
export async function retryNotification(
  notificationId: string,
  retryCount: number
): Promise<boolean> {
  if (retryCount >= MAX_RETRIES) {
    await markNotificationFinalFailed(notificationId)
    return false
  }

  const delay = BACKOFF_DELAYS_MS[retryCount] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1]

  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const { data: notification, error: fetchError } = await supabase
          .from('notifications')
          .select('*')
          .eq('id', notificationId)
          .single()

        if (fetchError || !notification) {
          resolve(false)
          return
        }

        // Re-send the notification (update read status triggers delivery)
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ metadata: { delivery_status: 'retrying', retry_count: retryCount + 1 } })
          .eq('id', notificationId)

        if (updateError) {
          await supabase
            .from('notifications')
            .update({
              metadata: { delivery_status: 'failed', error: updateError.message, retry_count: retryCount + 1 },
            })
            .eq('id', notificationId)
          resolve(false)
          return
        }

        // Mark as delivered on success
        await supabase
          .from('notifications')
          .update({ metadata: { delivery_status: 'delivered', retry_count: retryCount + 1 } })
          .eq('id', notificationId)

        resolve(true)
      } catch {
        resolve(false)
      }
    }, delay)
  })
}

/**
 * Mark a notification as permanently failed after max retries.
 */
async function markNotificationFinalFailed(notificationId: string): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({
        metadata: { delivery_status: 'permanently_failed' },
      })
      .eq('id', notificationId)
  } catch (err) {
    console.error('Failed to mark notification as permanently failed:', err)
  }
}

/**
 * Query and retry all failed notifications.
 */
export async function retryFailedNotifications(): Promise<{ retried: number; failed: number }> {
  let retried = 0
  let failed = 0

  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, metadata')
      .eq('metadata->>delivery_status', 'failed')

    if (error || !notifications) return { retried: 0, failed: 0 }

    for (const n of notifications) {
      const meta = (n.metadata ?? {}) as { retry_count?: number; delivery_status?: string }
      if (meta.delivery_status === 'permanently_failed') continue

      const retryCount = meta.retry_count ?? 0
      const success = await retryNotification(n.id, retryCount)
      if (success) retried++
      else failed++
    }
  } catch (err) {
    console.error('Failed to retry notifications:', err)
  }

  return { retried, failed }
}

// ── Stats ──────────────────────────────────────────────────────────────────

export interface RetryStats {
  pending: number
  retried: number
  failed: number
  permanently_failed: number
}

/**
 * Get count of notifications by retry status.
 */
export async function getRetryStats(): Promise<RetryStats> {
  const stats: RetryStats = { pending: 0, retried: 0, failed: 0, permanently_failed: 0 }

  try {
    const { data } = await supabase
      .from('notifications')
      .select('metadata')

    for (const row of data ?? []) {
      const meta = (row.metadata ?? {}) as { delivery_status?: string }
      const status = meta.delivery_status
      if (status === 'failed') stats.failed++
      else if (status === 'retrying') stats.retried++
      else if (status === 'permanently_failed') stats.permanently_failed++
      else stats.pending++
    }
  } catch {
    // Return empty stats on error
  }

  return stats
}

// ── Scheduled Retries ──────────────────────────────────────────────────────

/**
 * Schedule a retry for a specific notification after a delay.
 */
export function scheduleRetry(notificationId: string, delayMs: number): void {
  setTimeout(async () => {
    try {
      const { data: notification } = await supabase
        .from('notifications')
        .select('metadata')
        .eq('id', notificationId)
        .single()

      if (!notification) return
      const meta = (notification.metadata ?? {}) as { retry_count?: number }
      await retryNotification(notificationId, meta.retry_count ?? 0)
    } catch (err) {
      console.error('Scheduled retry failed:', err)
    }
  }, delayMs)
}

/**
 * Start periodic retry checking (on page load + every 5 minutes).
 */
export function startRetryScheduler(): void {
  // Run immediately on page load
  retryFailedNotifications().catch(() => {})

  // Then every 5 minutes
  if (retryTimer) clearInterval(retryTimer)
  retryTimer = setInterval(() => {
    retryFailedNotifications().catch(() => {})
  }, RETRY_INTERVAL_MS)
}

/**
 * Stop the periodic retry scheduler.
 */
export function stopRetryScheduler(): void {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
}
