
let retryTimer: ReturnType<typeof setInterval> | null = null

export async function markNotificationFailed(
  _notificationId: string,
  _error: string
): Promise<void> {
  // no-op: notifications.metadata column does not exist in V2
}

export async function retryNotification(
  _notificationId: string,
  _retryCount: number
): Promise<boolean> {
  return true
}

export async function retryFailedNotifications(): Promise<{ retried: number; failed: number }> {
  return { retried: 0, failed: 0 }
}

export interface RetryStats {
  pending: number
  retried: number
  failed: number
  permanently_failed: number
}

export async function getRetryStats(): Promise<RetryStats> {
  return { pending: 0, retried: 0, failed: 0, permanently_failed: 0 }
}

export function scheduleRetry(_notificationId: string, _delayMs: number): void {
  // no-op
}

export function startRetryScheduler(): void {
  if (retryTimer) clearInterval(retryTimer)
}

export function stopRetryScheduler(): void {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
}
