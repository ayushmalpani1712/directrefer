import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getImpersonationState, stopImpersonation, type ImpersonationState } from '@/lib/impersonation'

interface ImpersonationBannerProps {
  onStop: () => void
}

export function ImpersonationBanner({ onStop }: ImpersonationBannerProps) {
  const [state, setState] = useState<ImpersonationState | null>(null)

  useEffect(() => {
    const s = getImpersonationState()
    setState(s)
  }, [])

  const handleStop = async () => {
    await stopImpersonation()
    setState(null)
    onStop()
    window.location.reload()
  }

  if (!state) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-lg dark:bg-amber-600 dark:text-amber-50">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Viewing as <strong>{state.targetUserName}</strong> ({state.targetUserEmail})
      </span>
      <Button
        variant="outline"
        size="sm"
        className="ml-2 h-6 border-amber-700/30 bg-white/20 px-2 py-0 text-xs text-amber-950 hover:bg-white/30 dark:border-amber-300/30 dark:text-amber-50"
        onClick={handleStop}
      >
        <X className="mr-1 h-3 w-3" />
        Stop Impersonation
      </Button>
    </div>
  )
}
