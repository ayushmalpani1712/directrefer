import { createHash } from 'node:crypto';

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';

export async function isPwnedPassword(password) {
  const hashHex = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return false;

    const body = await res.text();
    return body.split('\r\n').some((line) => line.split(':')[0] === suffix);
  } catch {
    return false;
  }
}
