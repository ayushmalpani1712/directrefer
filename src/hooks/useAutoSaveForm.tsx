import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'restored' | 'error'

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
  /** Human-readable status message for the indicator. */
  statusMessage: string
}

const STORAGE_PREFIX = 'draft'
const MAX_SERVER_RETRIES = 3
const SERVER_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

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
 * draft restoration, and background server sync with circuit breaker.
 *
 * Storage key schema: `draft:{userId}:{formId}`
 * Stored value: `{ values: Record<string, unknown>, savedAt: number }`
 *
 * Status machine:
 *   idle → saving (on change) → saved (after server ack) → idle (after 3s)
 *   idle → error (on server failure, retries up to MAX_SERVER_RETRIES then goes idle)
 *
 * Circuit breaker:
 *   After MAX_SERVER_RETRIES consecutive failures, server sync is paused for
 *   SERVER_COOLDOWN_MS. localStorage still works. After cooldown, one retry
 *   is attempted; if it fails again, cooldown restarts.
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
  const [statusMessage, setStatusMessage] = useState('')

  const initialValuesRef = useRef<Record<string, unknown> | null>(null)
  const latestValuesRef = useRef(values)
  const restoredRef = useRef(false)
  const capturedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSyncedAtRef = useRef<Record<string, unknown> | null>(null)
  const isSavingRef = useRef(false)
  const consecutiveFailuresRef = useRef(0)
  const serverCooldownUntilRef = useRef(0)

  latestValuesRef.current = values

  // Capture initial values via useEffect (defers to after sync effects run)
  useEffect(() => {
    if (initialValuesRef.current === null && enabled && !capturedRef.current) {
      initialValuesRef.current = { ...values }
      capturedRef.current = true
    }
  }, [enabled, values])

  // Compute hasUnsavedChanges (no dependency on status to avoid re-render loops)
  useEffect(() => {
    if (!enabled || !initialValuesRef.current) return
    const changed = !shallowEqual(initialValuesRef.current, values)
    setHasUnsavedChanges(changed)
  }, [values, enabled])

  // Auto-clear "saved" status after 3 seconds (but not "restored" — that stays until restoreDraft() is called)
  useEffect(() => {
    if (status === 'saved') {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => {
        setStatus('idle')
        setStatusMessage('')
      }, 3000)
    }
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [status])

  // ── Check if server is available (circuit breaker) ──────────
  const isServerAvailable = useCallback(() => {
    if (consecutiveFailuresRef.current >= MAX_SERVER_RETRIES) {
      // In cooldown — don't retry yet
      if (Date.now() < serverCooldownUntilRef.current) return false
      // Cooldown expired — allow one retry
      return true
    }
    return true
  }, [])

  const onServerFailure = useCallback(() => {
    consecutiveFailuresRef.current += 1
    if (consecutiveFailuresRef.current >= MAX_SERVER_RETRIES) {
      serverCooldownUntilRef.current = Date.now() + SERVER_COOLDOWN_MS
    }
  }, [])

  const onServerSuccess = useCallback(() => {
    consecutiveFailuresRef.current = 0
    serverCooldownUntilRef.current = 0
  }, [])

  // ── Debounced localStorage save + server sync ──────────────
  useEffect(() => {
    if (!enabled || !userId) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      try {
        // 1. Write to localStorage immediately (always works)
        const entry = { values: latestValuesRef.current, savedAt: Date.now() }
        localStorage.setItem(getStorageKey(userId, formId), JSON.stringify(entry))
        setLastSavedAt(entry.savedAt)

        // 2. If server is in cooldown, skip — just show "Saved locally"
        if (!isServerAvailable()) {
          setStatus('saved')
          setStatusMessage('Saved locally')
          isSavingRef.current = false
          return
        }

        // 3. Set saving state (unless server sync is already in progress)
        if (!isSavingRef.current) {
          setStatus('saving')
          setStatusMessage('Saving...')
        }

        // 4. Sync to server in background
        syncToServer(userId, formId, latestValuesRef.current)
      } catch (err) {
        console.error('[AutoSave] localStorage write failed:', err)
      }
    }, localStorageDelay)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [values, userId, formId, enabled, localStorageDelay, isServerAvailable])

  // ── Server sync function ─────────────────────────────────
  const syncToServer = useCallback(async (_uid: string, fid: string, vals: Record<string, unknown>) => {
    if (isSavingRef.current) return
    isSavingRef.current = true

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        isSavingRef.current = false
        setStatus('idle')
        setStatusMessage('')
        return
      }

      const res = await fetch('/api/profile-draft', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ formId: fid, values: vals }),
      })

      if (!res.ok) {
        // 501 = feature not available (table doesn't exist) — circuit-break immediately
        if (res.status === 501) {
          consecutiveFailuresRef.current = MAX_SERVER_RETRIES
          serverCooldownUntilRef.current = Date.now() + SERVER_COOLDOWN_MS
          setStatus('saved')
          setStatusMessage('Saved locally')
          isSavingRef.current = false
          return
        }

        const errorText = await res.text().catch(() => 'unknown')
        if (consecutiveFailuresRef.current === 0) {
          console.warn(`[AutoSave] Server sync failed (${res.status}):`, errorText)
        }
        onServerFailure()
        setStatus('saved')
        setStatusMessage('Saved locally')
        isSavingRef.current = false
        return
      }

      const result = await res.json()
      if (!result.success) {
        if (consecutiveFailuresRef.current === 0) {
          console.warn('[AutoSave] Server returned error:', result.error || result)
        }
        onServerFailure()
        setStatus('saved')
        setStatusMessage('Saved locally')
        isSavingRef.current = false
        return
      }

      onServerSuccess()
      lastSyncedAtRef.current = vals
      setStatus('saved')
      setStatusMessage('Draft saved')
    } catch (err) {
      if (consecutiveFailuresRef.current === 0) {
        console.warn('[AutoSave] Server sync exception:', err)
      }
      onServerFailure()
      setStatus('saved')
      setStatusMessage('Saved locally')
    } finally {
      isSavingRef.current = false
    }
  }, [onServerFailure, onServerSuccess])

  // ── Background server sync (periodic retry) ──────────────
  useEffect(() => {
    if (!enabled || !userId || serverSyncInterval <= 0) return

    syncTimerRef.current = setInterval(async () => {
      // Circuit breaker: skip if server is in cooldown
      if (!isServerAvailable()) return

      const currentValues = latestValuesRef.current
      // Don't sync if values haven't changed since last sync
      if (lastSyncedAtRef.current && shallowEqual(currentValues, lastSyncedAtRef.current as unknown as Record<string, unknown>)) {
        return
      }
      // Don't sync if already saving
      if (isSavingRef.current) return

      await syncToServer(userId, formId, currentValues)
    }, serverSyncInterval)

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current)
    }
  }, [userId, formId, enabled, serverSyncInterval, syncToServer, isServerAvailable])

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
        setStatusMessage('Draft restored from earlier session')
        setLastSavedAt(entry.savedAt)
      }
    } catch {
      // Corrupted data — clear it
      localStorage.removeItem(getStorageKey(userId, formId))
    }
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, formId, enabled])

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
        if (!res.ok) {
          // 501 = table doesn't exist — circuit-break immediately
          if (res.status === 501) {
            consecutiveFailuresRef.current = MAX_SERVER_RETRIES
            serverCooldownUntilRef.current = Date.now() + SERVER_COOLDOWN_MS
          }
          return
        }

        const result = await res.json()
        if (!result.success || !result.data?.values) return

        onServerSuccess()
        const serverValues = result.data.values
        const serverSavedAt = new Date(result.data.updated_at).getTime()

        // Only use server draft if it's newer than local and different from current
        const localRaw = localStorage.getItem(getStorageKey(userId, formId))
        const localSavedAt = localRaw ? (JSON.parse(localRaw).savedAt ?? 0) : 0

        if (serverSavedAt > localSavedAt && !shallowEqual(serverValues, latestValuesRef.current)) {
          const entry = { values: serverValues, savedAt: serverSavedAt }
          localStorage.setItem(getStorageKey(userId, formId), JSON.stringify(entry))
        }
      } catch {
        // Silently skip server draft fetch failures
      }
    }

    fetchServerDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, formId, enabled])

  // ── Public methods ───────────────────────────────────────
  const restoreDraft = useCallback((restoredValues: Record<string, unknown>) => {
    initialValuesRef.current = { ...restoredValues }
    setHasUnsavedChanges(false)
    setStatus('idle')
    setStatusMessage('')
  }, [])

  const clearDraft = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    try {
      localStorage.removeItem(getStorageKey(userId, formId))
    } catch { /* ignore */ }
    setStatus('idle')
    setStatusMessage('')
    setLastSavedAt(null)
    setHasUnsavedChanges(false)
    initialValuesRef.current = { ...latestValuesRef.current }
  }, [userId, formId])

  const onFormSaved = useCallback(() => {
    const currentValues = latestValuesRef.current
    clearDraft()
    initialValuesRef.current = { ...currentValues }
  }, [clearDraft])

  // ── Cleanup ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (syncTimerRef.current) clearInterval(syncTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  return { status, lastSavedAt, restoreDraft, clearDraft, onFormSaved, hasUnsavedChanges, statusMessage }
}

// ── Draft Status Indicator component ───────────────────────

interface DraftStatusIndicatorProps {
  status: AutoSaveStatus
  lastSavedAt: number | null
  statusMessage: string
  className?: string
  /** Whether to show the discard button. */
  showDiscard?: boolean
  onDiscard?: () => void
}

export function DraftStatusIndicator({ status, lastSavedAt, statusMessage, className, showDiscard, onDiscard }: DraftStatusIndicatorProps) {
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Always render the container to reserve space and prevent layout shift
  if (status === 'idle' && !statusMessage) {
    return <div className={cn('min-h-[36px] transition-opacity duration-300 opacity-0', className)} />
  }

  return (
    <div className={cn(
      'flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground transition-all duration-300 opacity-100',
      className
    )}>
      <span className="flex items-center gap-2">
        {status === 'saving' && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            Saving...
          </>
        )}
        {status === 'saved' && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {statusMessage || 'Draft saved'}
            {lastSavedAt && (
              <span className="text-muted-foreground/60">({formatTime(lastSavedAt)})</span>
            )}
          </>
        )}
        {status === 'restored' && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            {statusMessage || 'Draft restored'}
            {lastSavedAt && (
              <span className="text-muted-foreground/60">({formatTime(lastSavedAt)})</span>
            )}
          </>
        )}
        {status === 'error' && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>
            {statusMessage || 'Save failed'}
          </>
        )}
      </span>
      {showDiscard && (
        <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={onDiscard}>
          Discard draft
        </Button>
      )}
    </div>
  )
}
