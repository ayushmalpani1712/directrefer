import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendEmail, sendVerificationEmail, sendReferralStatusEmail, sendReminderEmail } from '@/lib/email'

describe('sendEmail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('calls the API endpoint with correct params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
    vi.stubGlobal('fetch', mockFetch)

    const result = await sendEmail('test@example.com', 'Subject', '<p>Hello</p>')

    expect(mockFetch).toHaveBeenCalledWith('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'test@example.com', subject: 'Subject', html: '<p>Hello</p>' }),
    })
    expect(result).toBe(true)
  })

  it('returns false on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: () => 'Error' }))

    const result = await sendEmail('test@example.com', 'Sub', 'body')
    expect(result).toBe(false)
  })

  it('returns false on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')))

    const result = await sendEmail('test@example.com', 'Sub', 'body')
    expect(result).toBe(false)
  })
})

describe('sendVerificationEmail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sends verification email with correct content', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    await sendVerificationEmail('test@example.com', 'https://verify.url')

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.to).toBe('test@example.com')
    expect(body.subject).toContain('Verify')
    expect(body.html).toContain('https://verify.url')
  })
})

describe('sendReferralStatusEmail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sends accepted email', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    await sendReferralStatusEmail('test@example.com', 'Alex', 'Google', 'SWE', 'accepted')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.to).toBe('test@example.com')
    expect(body.subject).toContain('accepted')
  })

  it('sends rejected email', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    await sendReferralStatusEmail('test@example.com', 'Alex', 'Google', 'SWE', 'rejected')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.subject).toContain('rejected')
  })
})

describe('sendReminderEmail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sends reminder with correct params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    await sendReminderEmail('test@example.com', 'David', 'Alex', 'SWE', 5)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.to).toBe('test@example.com')
    expect(body.subject).toContain('Reminder')
    expect(body.html).toContain('Alex')
    expect(body.html).toContain('5 days ago')
  })
})
