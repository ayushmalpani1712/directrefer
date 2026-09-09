// ============================================================================
// Direct Refer — Browser Push Notifications
// ============================================================================
// Requests notification permission, registers a Service Worker for push,
// and shows browser notifications for new messages and referral updates.
// ============================================================================

const PUSH_SUBSCRIPTION_KEY = 'dr_push_subscription'

let swRegistration: ServiceWorkerRegistration | null = null

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    return swRegistration
  } catch {
    return null
  }
}

async function getPushSubscription(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  try {
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing

    if (!('pushManager' in registration)) return null

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: undefined,
    })

    localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription))
    return subscription
  } catch {
    return null
  }
}

function storeSubscriptionLocally(subscription: PushSubscription | null) {
  if (subscription) {
    localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription))
  } else {
    localStorage.removeItem(PUSH_SUBSCRIPTION_KEY)
  }
}

export function getStoredSubscription(): PushSubscription | null {
  try {
    const raw = localStorage.getItem(PUSH_SUBSCRIPTION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function initializePushNotifications(): Promise<boolean> {
  const granted = await requestNotificationPermission()
  if (!granted) return false

  const registration = await registerServiceWorker()
  if (!registration) return true

  const subscription = await getPushSubscription(registration)
  storeSubscriptionLocally(subscription)
  return true
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  if (swRegistration?.active) {
    swRegistration.active.postMessage({ type: 'SHOW_NOTIFICATION', title, options })
    return
  }

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

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (!('AudioContext' in window || 'webkitAudioContext' in window)) return null
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

export function playNotificationSound() {
  const enabled = localStorage.getItem('dr_notif_prefs')
  if (enabled) {
    try {
      const prefs = JSON.parse(enabled)
      if (prefs.notification_sound === false) return
    } catch { /* play by default */ }
  }

  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(880, now)
  gain1.gain.setValueAtTime(0.15, now)
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + 0.15)

  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(1108, now + 0.1)
  gain2.gain.setValueAtTime(0, now)
  gain2.gain.setValueAtTime(0.12, now + 0.1)
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now + 0.1)
  osc2.stop(now + 0.3)
}

export function notifyNewMessage(senderName: string, text: string) {
  playNotificationSound()
  showNotification(`New message from ${senderName}`, {
    body: text.length > 100 ? text.slice(0, 100) + '\u2026' : text,
    tag: 'new-message',
  })
}

export function notifyReferralUpdate(studentName: string, status: string, jobTitle: string) {
  playNotificationSound()
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

  playNotificationSound()
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

  playNotificationSound()
  showNotification('New Match Found', {
    body: `${candidateName} matched with ${jobTitle} (score: ${score}).`,
    tag: 'new-match',
  })
}

export async function notifyJobDeadlineApproaching(jobTitle: string, daysLeft: number) {
  const { supabase } = await import('@/lib/supabase')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const title = `Job deadline in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
  const description = `The application deadline for "${jobTitle}" is approaching. Apply now before it closes!`

  await supabase.from('notifications').insert({
    user_id: user.id,
    type: 'reminder',
    title,
    description,
  })

  playNotificationSound()
  showNotification(title, {
    body: description,
    tag: `job-deadline-${jobTitle}`,
  })
}
