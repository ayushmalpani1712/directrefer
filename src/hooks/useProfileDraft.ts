import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const AUTOSAVE_DELAY = 2000

export function useProfileDraft(userId: string | undefined, formData: Record<string, unknown>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedRef = useRef(false)

  const saveDraft = useCallback(async (data: Record<string, unknown>) => {
    if (!userId) return
    const nonEmpty = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false))
    if (Object.keys(nonEmpty).length === 0) return
    await supabase
      .from('profile_drafts')
      .upsert({ user_id: userId, form_data: nonEmpty }, { onConflict: 'user_id' })
  }, [userId])

  const clearDraft = useCallback(async () => {
    if (!userId) return
    await supabase.from('profile_drafts').delete().eq('user_id', userId)
  }, [userId])

  useEffect(() => {
    if (savedRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveDraft(formData)
    }, AUTOSAVE_DELAY)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [formData, saveDraft])

  const loadDraft = useCallback(async (): Promise<Record<string, unknown> | null> => {
    if (!userId) return null
    const { data } = await supabase
      .from('profile_drafts')
      .select('form_data')
      .eq('user_id', userId)
      .maybeSingle()
    return data?.form_data ?? null
  }, [userId])

  const markSaved = useCallback(() => {
    savedRef.current = true
    clearDraft()
  }, [clearDraft])

  return { loadDraft, clearDraft, markSaved }
}
