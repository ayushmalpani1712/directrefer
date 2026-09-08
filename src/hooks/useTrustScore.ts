// ============================================================================
// DirectRefer V2.0 — Trust Score Hook
// ============================================================================

import { useState, useEffect } from 'react'
import { fetchTrustScore, type TrustScore } from '@/lib/v2/api'

export function useTrustScore(userId: string | undefined) {
  const [score, setScore] = useState<TrustScore | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetchTrustScore(userId)
      .then(setScore)
      .catch(() => setScore(null))
      .finally(() => setLoading(false))
  }, [userId])

  return { score, loading }
}
