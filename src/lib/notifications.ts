// ============================================================================
// Direct Refer — Browser Push Notifications
// ============================================================================
// Requests notification permission and shows browser notifications
// for new messages and referral updates.
// ============================================================================

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    })
  } catch {
    // Service workers not available — silent fail
  }
}

export function notifyNewMessage(senderName: string, text: string) {
  showNotification(`New message from ${senderName}`, {
    body: text.length > 100 ? text.slice(0, 100) + '…' : text,
    tag: 'new-message',
  })
}

export function notifyReferralUpdate(studentName: string, status: string, jobTitle: string) {
  showNotification(`Referral ${status}`, {
    body: `${studentName}'s referral for ${jobTitle} has been ${status}.`,
    tag: 'referral-update',
  })
}

export function notifyNewReferralRequest(studentName: string, jobTitle: string) {
  showNotification('New referral request', {
    body: `${studentName} requested a referral for ${jobTitle}.`,
    tag: 'new-referral',
  })
}
