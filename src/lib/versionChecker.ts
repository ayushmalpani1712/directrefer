import { toast } from 'sonner'

/**
 * Polls the server periodically to detect if a newer deployment exists.
 * When a new version is found, shows a toast prompting the user to refresh.
 *
 * The version file is generated at build time by the Vite versionJsonPlugin.
 * On each new deployment the file's content (the build timestamp) changes,
 * so a simple content comparison is enough.
 */

const CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const VERSION_FILE = '/version.json'

let currentVersion: string | null = null
let toastShown = false

async function checkForUpdate(): Promise<void> {
  try {
    const res = await fetch(VERSION_FILE, { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    const serverVersion: string = data.version

    if (!currentVersion) {
      currentVersion = serverVersion
      return
    }

    if (serverVersion !== currentVersion && !toastShown) {
      toastShown = true
      toast.info('A new version of DirectRefer is available.', {
        description: 'Refresh to get the latest features and fixes.',
        duration: Infinity,
        action: {
          label: 'Refresh now',
          onClick: () => window.location.reload(),
        },
      })
    }
  } catch {
    // Network or parse error — silently ignore, will retry next interval
  }
}

/**
 * Must be called once after React mounts (e.g. inside App).
 * Sets up a periodic version check.
 */
export function initVersionChecker(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentVersion = (globalThis as any).__BUILD_VERSION__ || null
  } catch {
    currentVersion = null
  }

  // Initial check after 30 seconds (let the page settle)
  setTimeout(checkForUpdate, 30_000)
  // Then periodically
  setInterval(checkForUpdate, CHECK_INTERVAL_MS)
}
