import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const AUTOSAVE_DELAY = 2000

let tableExists: boolean | null = null

async function checkTable(): Promise<boolean> {
  if (tableExists !== null) return tableExists
  try {
    const { error } = await supabase.from('profile_drafts').select('user_id').limit(1)
    tableExists = !error
  } catch {
    tableExists = false
  }
  return tableExists
}

export function useProfileDraft(userId: string | undefined, formData: Record<string, unknown>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedRef = useRef(false)

  const saveDraft = useCallback(async (data: Record<string, unknown>) => {
    if (!userId) return
    if (!(await checkTable())) return
    try {
      const nonEmpty = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false))
      if (Object.keys(nonEmpty).length === 0) return
      const { error } = await supabase
        .from('profile_drafts')
        .upsert({ user_id: userId, form_data: nonEmpty }, { onConflict: 'user_id' })
      if (error && error.code !== '42P01') console.error('Failed to save draft:', error.message)
    } catch {
      // table may not exist
    }
  }, [userId])

  const clearDraft = useCallback(async () => {
    if (!userId) return
    if (!(await checkTable())) return
    try {
      const { error } = await supabase.from('profile_drafts').delete().eq('user_id', userId)
      if (error && error.code !== '42P01') console.error('Failed to clear draft:', error.message)
    } catch {
      // table may not exist
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
    if (!(await checkTable())) return null
    try {
      const { data, error } = await supabase
        .from('profile_drafts')
        .select('form_data')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) {
        if (error.code !== '42P01') console.error('Failed to load draft:', error.message)
        return null
      }
      return data?.form_data ?? null
    } catch {
      return null
    }
  }, [userId])

  const markSaved = useCallback(() => {
    savedRef.current = true
    clearDraft()
  }, [clearDraft])

  return { loadDraft, clearDraft, markSaved }
}
