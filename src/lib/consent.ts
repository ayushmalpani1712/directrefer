import { supabase } from '@/lib/supabase'

export type ConsentType = 'terms' | 'privacy'

export interface ConsentRecord {
  type: ConsentType
  version: string
  accepted_at: string
}

export async function recordConsent(
  userId: string,
  type: ConsentType,
  version: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const field = type === 'terms' ? 'terms_accepted_at' : 'privacy_accepted_at'
    const { error } = await supabase
      .from('users')
      .update({
        [field]: new Date().toISOString(),
        [`${type}_version`]: version,
      })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to record consent',
    }
  }
}

export async function needsConsentUpdate(
  userId: string,
  requiredVersion: string,
  type: ConsentType = 'terms'
): Promise<{ needsUpdate: boolean; currentVersion?: string; error?: string }> {
  try {
    const versionField = `${type}_version`
    const { data, error } = await supabase
      .from('users')
      .select(versionField)
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      return { needsUpdate: false, error: error.message }
    }

    if (!data) {
      return { needsUpdate: true }
    }

    const currentVersion = (data as unknown as Record<string, string>)[versionField]
    if (!currentVersion) {
      return { needsUpdate: true }
    }

    return {
      needsUpdate: compareVersions(currentVersion, requiredVersion) < 0,
      currentVersion,
    }
  } catch (err) {
    return {
      needsUpdate: false,
      error: err instanceof Error ? err.message : 'Failed to check consent',
    }
  }
}

export async function fetchConsentStatus(
  userId: string
): Promise<{ terms?: ConsentRecord; privacy?: ConsentRecord; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('terms_accepted_at, terms_version, privacy_accepted_at, privacy_version')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      return { error: error.message }
    }

    if (!data) {
      return {}
    }

    const result: { terms?: ConsentRecord; privacy?: ConsentRecord } = {}

    if (data.terms_accepted_at) {
      result.terms = {
        type: 'terms',
        version: data.terms_version ?? '0',
        accepted_at: data.terms_accepted_at,
      }
    }

    if (data.privacy_accepted_at) {
      result.privacy = {
        type: 'privacy',
        version: data.privacy_version ?? '0',
        accepted_at: data.privacy_accepted_at,
      }
    }

    return result
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch consent status',
    }
  }
}

function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number)
  const bParts = b.split('.').map(Number)
  const maxLen = Math.max(aParts.length, bParts.length)

  for (let i = 0; i < maxLen; i++) {
    const aVal = aParts[i] || 0
    const bVal = bParts[i] || 0
    if (aVal !== bVal) return aVal - bVal
  }
  return 0
}
