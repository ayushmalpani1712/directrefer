import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'

interface UseProfileToggleOptions {
  /** Initial value from database */
  initialValue: boolean
  /** Async callback to persist the change. Must throw on failure. */
  onSave: (value: boolean) => Promise<void>
  /** Optional callback to run after successful save (e.g., refresh other data). */
  onSuccess?: (value: boolean) => void
  /** Toast message on success. */
  successMessage?: string | ((value: boolean) => string)
}

interface UseProfileToggleReturn {
  value: boolean
  isSaving: boolean
  toggle: () => Promise<void>
  setValue: (v: boolean) => void
}

/**
 * Resilient profile toggle hook with optimistic updates and automatic rollback on failure.
 *
 * - Optimistically updates UI immediately
 * - Calls `onSave` to persist to database
 * - Rolls back on failure with error toast
 * - Disables toggle during save to prevent double-clicks
 */
export function useProfileToggle({
  initialValue,
  onSave,
  onSuccess,
  successMessage = 'Status updated',
}: UseProfileToggleOptions): UseProfileToggleReturn {
  const [value, setValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)
  const pendingRef = useRef(false)

  const toggle = useCallback(async () => {
    if (pendingRef.current) return

    const newValue = !value
    const prevValue = value

    // Optimistic update
    setValue(newValue)
    pendingRef.current = true
    setIsSaving(true)

    try {
      await onSave(newValue)
      const msg = typeof successMessage === 'function' ? successMessage(newValue) : successMessage
      toast.success(msg)
      onSuccess?.(newValue)
    } catch (err) {
      // Rollback
      setValue(prevValue)
      toast.error('Failed to update. Please try again.')
      console.error('Toggle save failed:', err)
    } finally {
      pendingRef.current = false
      setIsSaving(false)
    }
  }, [value, onSave, onSuccess, successMessage])

  return { value, isSaving, toggle, setValue }
}
