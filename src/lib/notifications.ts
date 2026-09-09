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

export async function notifyScreeningUpdate(
  candidateName: string,
  jobTitle: string,
  result: string,
) {
  const { supabase } = await import('@/lib/supabase')
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'screening_update',
      title: `Screening ${result === 'pass' ? 'Passed' : 'Failed'}`,
      description: `${candidateName}'s screening for ${jobTitle} has been ${result}.`,
    })
  }

  showNotification(`Screening ${result === 'pass' ? 'Passed' : 'Failed'}`, {
    body: `${candidateName}'s screening for ${jobTitle} has been ${result}.`,
    tag: 'screening-update',
  })
}

export async function notifyNewMatch(
  candidateName: string,
  jobTitle: string,
  score: number,
) {
  const { supabase } = await import('@/lib/supabase')
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'match_found',
      title: 'New Match Found',
      description: `${candidateName} matched with ${jobTitle} (score: ${score}).`,
    })
  }

  showNotification('New Match Found', {
    body: `${candidateName} matched with ${jobTitle} (score: ${score}).`,
    tag: 'new-match',
  })
}


