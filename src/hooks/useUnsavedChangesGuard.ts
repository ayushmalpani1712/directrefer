import { useCallback } from 'react'
import { useBeforeUnload } from 'react-router'

interface UseUnsavedChangesGuardOptions {
  enabled: boolean
  message?: string
}

interface UseUnsavedChangesGuardReturn {
  hasUnsavedChanges: boolean
}

/**
 * Guards against accidental navigation when the form has unsaved changes.
 * Uses `beforeunload` to block browser close/refresh.
 *
 * Note: In-app navigation blocking requires a data router (createBrowserRouter).
 * This app uses BrowserRouter, so we only guard against browser-level navigation.
 */
export function useUnsavedChangesGuard({
  enabled,
  message = 'You have unsaved changes. Are you sure you want to leave?',
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardReturn {
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (enabled) {
          event.preventDefault()
          event.returnValue = message
        }
      },
      [enabled, message]
    )
  )

  return { hasUnsavedChanges: enabled }
}
