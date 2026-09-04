import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

interface ImpersonationData {
  adminAccessToken: string
  adminRefreshToken: string
  targetName: string
  targetRole: string
}

export function ImpersonationBanner() {
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const data = sessionStorage.getItem('impersonation')
    if (data) {
      setImpersonation(JSON.parse(data))
    }

    const handler = (e: StorageEvent) => {
      if (e.key === 'impersonation') {
        if (e.newValue) {
          setImpersonation(JSON.parse(e.newValue))
        } else {
          setImpersonation(null)
        }
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const exitImpersonation = async () => {
    if (!impersonation) return

    // Sign out impersonated user
    await supabase.auth.signOut()

    // Restore admin session
    const { error } = await supabase.auth.setSession({
      access_token: impersonation.adminAccessToken,
      refresh_token: impersonation.adminRefreshToken,
    })

    // Clear impersonation data
    sessionStorage.removeItem('impersonation')
    setImpersonation(null)

    if (error) {
      console.error('Failed to restore admin session:', error)
      navigate('/login', { replace: true })
    } else {
      navigate('/admin/overview', { replace: true })
    }
  }

  if (!impersonation) return null

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-300">
          Impersonating
        </Badge>
        <span className="text-sm font-medium">
          {impersonation.targetName}
        </span>
        <span className="text-xs text-muted-foreground">
          ({impersonation.targetRole})
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={exitImpersonation}
        className="border-amber-500/30 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
      >
        Exit Impersonation
      </Button>
    </div>
  )
}
