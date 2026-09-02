// ── WhatsApp Cloud API (client-side) ──────────────────────
// Sends via /api/whatsapp-send — the backend handles the 24h window check,
// opt-in verification, and actual Cloud API call.

interface WhatsAppSendResult {
  success: boolean
  reason?: string
  error?: string
}

async function sendWhatsAppNotification(userId: string, template: string, params: Record<string, unknown>): Promise<WhatsAppSendResult> {
  try {
    const res = await fetch('/api/whatsapp-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, template, params }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { success: false, error: data?.error || 'Failed to send' }
    return { success: data.success, reason: data.reason }
  } catch {
    return { success: false, error: 'Network error' }
  }
}

export async function sendWhatsAppReferralRequest(userId: string, p: { professionalName: string; studentName: string; jobTitle: string; url: string }): Promise<WhatsAppSendResult> {
  return sendWhatsAppNotification(userId, 'referral_request', p)
}

export async function sendWhatsAppReferralUpdate(userId: string, p: { studentName: string; jobTitle: string; status: string; url: string }): Promise<WhatsAppSendResult> {
  return sendWhatsAppNotification(userId, 'referral_update', p)
}

export async function sendWhatsAppNewMessage(userId: string, p: { recipientName: string; senderName: string; preview: string; url: string }): Promise<WhatsAppSendResult> {
  return sendWhatsAppNotification(userId, 'new_message', p)
}

export async function sendWhatsAppReminder(userId: string, p: { professionalName: string; studentName: string; jobTitle: string; url: string }): Promise<WhatsAppSendResult> {
  return sendWhatsAppNotification(userId, 'reminder', p)
}

export function getWhatsAppClickToChatLink(): string {
  // Replace with your actual WhatsApp Business number
  const number = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER || '1XXXXXXXXXX'
  return `https://wa.me/${number}?text=START`
}
