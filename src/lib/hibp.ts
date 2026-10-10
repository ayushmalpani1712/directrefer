const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/'

export async function isPwnedPassword(password: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()

  const prefix = hashHex.slice(0, 5)
  const suffix = hashHex.slice(5)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return false

    const body = await res.text()
    return body.split('\r\n').some((line) => line.split(':')[0] === suffix)
  } catch {
    return false
  }
}
