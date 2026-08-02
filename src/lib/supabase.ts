// ============================================================================
// Direct Refer — Supabase Client Helper
// ============================================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.PROD) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cannot start in production')
  }
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — running in mock mode')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

export async function advanceReferralPipeline(
  referralId: string,
  pipelineStage: string
) {
  const { error } = await supabase
    .from('referrals')
    .update({ pipeline_stage: pipelineStage })
    .eq('id', referralId)

  return { error: error?.message }
}

export async function setPresence(userId: string, online: boolean): Promise<void> {
  await supabase
    .from('user_presence')
    .upsert({ user_id: userId, online, last_seen: new Date().toISOString() }, { onConflict: 'user_id' })
}
