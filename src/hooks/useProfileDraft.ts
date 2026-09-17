import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const AUTOSAVE_DELAY = 2000

export function useProfileDraft(userId: string | undefined, formData: Record<string, unknown>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedRef = useRef(false)

  const saveDraft = useCallback(async (data: Record<string, unknown>) => {
    if (!userId) return
    try {
      const nonEmpty = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false))
      if (Object.keys(nonEmpty).length === 0) return
      const { error } = await supabase
        .from('profile_drafts')
        .upsert({ user_id: userId, form_data: nonEmpty }, { onConflict: 'user_id' })
      if (error) console.error('Failed to save draft:', error.message)
    } catch (err) {
      console.error('Unexpected error saving draft:', err)
    }
  }, [userId])

  const clearDraft = useCallback(async () => {
    if (!userId) return
    try {
      const { error } = await supabase.from('profile_drafts').delete().eq('user_id', userId)
      if (error) console.error('Failed to clear draft:', error.message)
    } catch (err) {
      console.error('Unexpected error clearing draft:', err)
    }
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
    try {
      const { data, error } = await supabase
        .from('profile_drafts')
        .select('form_data')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) {
        console.error('Failed to load draft:', error.message)
        return null
      }
      return data?.form_data ?? null
    } catch (err) {
      console.error('Unexpected error loading draft:', err)
      return null
    }
  }, [userId])

  const markSaved = useCallback(() => {
    savedRef.current = true
    clearDraft()
  }, [clearDraft])

  return { loadDraft, clearDraft, markSaved }
}
