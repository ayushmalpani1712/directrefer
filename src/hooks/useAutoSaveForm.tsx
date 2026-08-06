import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type AutoSaveStatus = 'idle' | 'saved' | 'restored' | 'syncing'

interface UseAutoSaveFormOptions {
  userId: string
  formId: string
  /** Current snapshot of all editable field values. */
  values: Record<string, unknown>
  /** Whether the form is loaded and ready for restoration. */
  enabled?: boolean
  /** Debounce delay for localStorage writes in ms. Default: 500 */
  localStorageDelay?: number
  /** Interval for server sync in ms. Default: 10000 */
  serverSyncInterval?: number
}

interface UseAutoSaveFormReturn {
  status: AutoSaveStatus
  lastSavedAt: number | null
  /** Call after applying restored draft values to acknowledge them as the new baseline. */
  restoreDraft: (restoredValues: Record<string, unknown>) => void
  clearDraft: () => void
  /** Call after successful form submission to clear draft. */
  onFormSaved: () => void
  /** Whether there are unsaved local changes different from the initial values. */
  hasUnsavedChanges: boolean
}

const STORAGE_PREFIX = 'draft'

function getStorageKey(userId: string, formId: string): string {
  return `${STORAGE_PREFIX}:${userId}:${formId}`
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (a[key] !== b[key]) return false
  }
  return true
}

/**
 * Auto-save form hook with localStorage persistence, debounced writes,
 * draft restoration, and background server sync.
 *
 * Storage key schema: `draft:{userId}:{formId}`
 * Stored value: `{ values: Record<string, unknown>, savedAt: number }`
 */
export function useAutoSaveForm({
  userId,
  formId,
  values,
  enabled = true,
  localStorageDelay = 500,
  serverSyncInterval = 10000,
}: UseAutoSaveFormOptions): UseAutoSaveFormReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const initialValuesRef = useRef<Record<string, unknown> | null>(null)
  const latestValuesRef = useRef(values)
  const restoredRef = useRef(false)
  const capturedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSyncedAtRef = useRef<Record<string, unknown> | null>(null)

  latestValuesRef.current = values

  // Capture initial values via useEffect (defers to after sync effects run)
  useEffect(() => {
    if (initialValuesRef.current === null && enabled && !capturedRef.current) {
      initialValuesRef.current = { ...values }
      capturedRef.current = true
    }
  }, [enabled, values])

  // Compute hasUnsavedChanges
  useEffect(() => {
    if (!enabled || !initialValuesRef.current) return
    const changed = !shallowEqual(initialValuesRef.current, values)
    setHasUnsavedChanges(changed)
  }, [values, enabled, status])

  // ── Debounced localStorage save ──────────────────────────
  useEffect(() => {
    if (!enabled || !userId) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      try {
        const entry = { values: latestValuesRef.current, savedAt: Date.now() }
        localStorage.setItem(getStorageKey(userId, formId), JSON.stringify(entry))
        setStatus('saved')
        setLastSavedAt(entry.savedAt)
      } catch {
        // localStorage full or unavailable — fail silently
      }
    }, localStorageDelay)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [values, userId, formId, enabled, localStorageDelay])

  // ── Restore draft on mount ───────────────────────────────
  useEffect(() => {
    if (!enabled || !userId || restoredRef.current) return
    restoredRef.current = true

    try {
      const raw = localStorage.getItem(getStorageKey(userId, formId))
      if (!raw) return

      const entry: { values: Record<string, unknown>; savedAt: number } = JSON.parse(raw)
      if (!entry?.values || typeof entry.savedAt !== 'number') return

      // Only restore if draft is meaningfully different from current values
      if (!shallowEqual(entry.values, latestValuesRef.current)) {
        setStatus('restored')
        setLastSavedAt(entry.savedAt)
        // Signal that draft was restored — the parent should call restoreDraft()
      }
    } catch {
      // Corrupted data — clear it
      localStorage.removeItem(getStorageKey(userId, formId))
    }
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, formId, enabled])

  // ── Background server sync ───────────────────────────────
  useEffect(() => {
    if (!enabled || !userId || serverSyncInterval <= 0) return

    syncTimerRef.current = setInterval(async () => {
      const currentValues = latestValuesRef.current
      // Don't sync if values haven't changed since last sync
      if (lastSyncedAtRef.current && shallowEqual(currentValues, lastSyncedAtRef.current as unknown as Record<string, unknown>)) {
        return
      }

      try {
        setStatus('syncing')
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setStatus('idle')
          return
        }

        await fetch('/api/profile-draft', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ formId, values: currentValues }),
        }).then((res) => {
          if (!res.ok) throw new Error(`Server returned ${res.status}`)
        })

        lastSyncedAtRef.current = currentValues
        setStatus('saved')
      } catch {
        // Network error — will retry on next interval
        setStatus('idle')
      }
    }, serverSyncInterval)

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current)
    }
  }, [userId, formId, enabled, serverSyncInterval])

  // ── Fetch server draft on mount (for cross-device restore) ──
  useEffect(() => {
    if (!enabled || !userId) return

    const fetchServerDraft = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const res = await fetch(`/api/profile-draft?formId=${encodeURIComponent(formId)}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        if (!res.ok) return

        const result = await res.json()
        if (!result.success || !result.data?.values) return

        const serverValues = result.data.values
        const serverSavedAt = new Date(result.data.updated_at).getTime()

        // Only use server draft if it's newer than local and different from current
        const localRaw = localStorage.getItem(getStorageKey(userId, formId))
        const localSavedAt = localRaw ? (JSON.parse(localRaw).savedAt ?? 0) : 0

        if (serverSavedAt > localSavedAt && !shallowEqual(serverValues, latestValuesRef.current)) {
          // Save server draft to local storage
          const entry = { values: serverValues, savedAt: serverSavedAt }
          localStorage.setItem(getStorageKey(userId, formId), JSON.stringify(entry))
          // Don't auto-restore — just update local cache. Status will show 'restored'.
        }
      } catch {
        // Silently fail
      }
    }

    fetchServerDraft()
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, formId, enabled])

  // ── Public methods ───────────────────────────────────────
  const restoreDraft = useCallback((restoredValues: Record<string, unknown>) => {
    initialValuesRef.current = { ...restoredValues }
    setHasUnsavedChanges(false)
    setStatus('idle')
  }, [])

  const clearDraft = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    try {
      localStorage.removeItem(getStorageKey(userId, formId))
    } catch { /* ignore */ }
    setStatus('idle')
    setLastSavedAt(null)
    setHasUnsavedChanges(false)
    initialValuesRef.current = { ...latestValuesRef.current }
  }, [userId, formId])

  const onFormSaved = useCallback(() => {
    // Capture current values at call time before clearDraft runs
    // (latestValuesRef may be stale due to React batching)
    const currentValues = latestValuesRef.current
    clearDraft()
    // Reset initial values to current (post-save) state
    initialValuesRef.current = { ...currentValues }
  }, [clearDraft])

  // ── Cleanup ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (syncTimerRef.current) clearInterval(syncTimerRef.current)
    }
  }, [])

  return { status, lastSavedAt, restoreDraft, clearDraft, onFormSaved, hasUnsavedChanges }
}

// ── Draft Status Indicator component ───────────────────────

interface DraftStatusIndicatorProps {
  status: AutoSaveStatus
  lastSavedAt: number | null
  className?: string
}

export function DraftStatusIndicator({ status, lastSavedAt, className }: DraftStatusIndicatorProps) {
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (status === 'restored') {
    return (
      <span className={className}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
        Draft restored from {lastSavedAt ? formatTime(lastSavedAt) : 'earlier session'}
      </span>
    )
  }

  if (status === 'syncing') {
    return (
      <span className={className}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
        Syncing to cloud...
      </span>
    )
  }

  if (status === 'saved') {
    return (
      <span className={className}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
        Draft saved {lastSavedAt ? formatTime(lastSavedAt) : ''}
      </span>
    )
  }

  return null
}
