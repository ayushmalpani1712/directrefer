// ============================================================================
// DirectRefer V2.0 — React Query Hooks
// ============================================================================
// Server state management via TanStack Query. Wraps Supabase queries.
// ============================================================================

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Professional } from '@/data/mock'

// ── Professionals ────────────────────────────────────────────────────────────

export function useProfessionals(enabled = true) {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: async (): Promise<Professional[]> => {
      const { data: refs, error: refsErr } = await supabase
        .from('profiles_professional')
        .select('user_id, company_name, job_title, skills, open_for_referrals, referral_capacity, referrals_used, bio, years_experience, github_url, work_email, avatar_color, referral_policy, response_rate, avg_reply_hours, success_rate, rating, department')
        .eq('show_on_find', true)
      if (refsErr || !refs) return []

      const userIds = refs.map((r: Record<string, unknown>) => r.user_id as string)
      if (userIds.length === 0) return []

      const { data: userRows } = await supabase
        .from('users')
        .select('id, full_name, slug, verified, professional_verified, work_email_verified, linkedin, avatar_url, city, state')
        .in('id', userIds)

      const userMap = new Map<string, Record<string, unknown>>()
      for (const u of (userRows ?? []) as Record<string, unknown>[]) userMap.set(u.id as string, u)

      return refs.map((r: Record<string, unknown>) => {
        const u = userMap.get(r.user_id as string) ?? {}
        return {
          id: r.user_id as string,
          slug: (u.slug as string) ?? undefined,
          name: (u.full_name as string) || 'Professional',
          designation: (r.job_title as string) || '',
          company: (r.company_name as string) || '',
          industry: (r.department as string) || '',
          location: [u.city, u.state].filter(Boolean).join(', ') || 'India',
          yearsExp: (r.years_experience as number) || 0,
          skills: (r.skills as string[]) || [],
          responseRate: (r.response_rate as number) || 0,
          avgReplyHours: (r.avg_reply_hours as number) || 12,
          referralsCompleted: (r.referrals_used as number) || 0,
          rating: (r.rating as number) || 0,
          reviews: 0,
          verified: (u.verified as boolean) || (u.professional_verified as boolean) || false,
          openForReferrals: (r.open_for_referrals as boolean) || false,
          isOpenToWork: false,
          maxPerMonth: (r.referral_capacity as number) || 5,
          usedThisMonth: (r.referrals_used as number) || 0,
          successRate: (r.success_rate as number) || 0,
          followers: 0,
          joinedDaysAgo: 0,
          activityScore: 0,
          referralPolicy: (r.referral_policy as string) || '',
          openPositions: [],
          bio: (r.bio as string) || '',
          badges: [],
          gradient: 'from-indigo-600 to-purple-600',
          phone: '',
          whatsapp: '',
          email: (r.work_email as string) || '',
          hiringTimeline: [],
          referralDuration: '24 hours',
          linkedinUrl: (u.linkedin as string) || '',
          githubUrl: (r.github_url as string) || '',
          college: undefined,
          trustScore: undefined,
          trustTier: undefined,
        } satisfies Professional
      })
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export interface Job {
  id: string
  title: string
  department: string
  location: string
  type: string
  description: string
  skills: string[]
  salary_range: string
  posted_at: string
  recruiter_id: string | null
  user_id: string
}

export function useJobs(enabled = true) {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('posted_at', { ascending: false })
      if (error || !data) return []
      return data as Job[]
    },
    enabled,
    staleTime: 3 * 60 * 1000,
  })
}

// ── Referrals ────────────────────────────────────────────────────────────────

export function useReferrals(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['referrals', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .or(`student.eq.${userId},professional.eq.${userId}`)
        .order('created_at', { ascending: false })
      if (error || !data) return []
      return data
    },
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000,
  })
}

// ── Notifications ────────────────────────────────────────────────────────────

export function useNotifications(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error || !data) return []
      return data
    },
    enabled: !!userId && enabled,
    staleTime: 1 * 60 * 1000,
  })
}

// ── Trust Score ──────────────────────────────────────────────────────────────

export function useTrustScoreQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['trust-score', userId],
    queryFn: async () => {
      if (!userId) return null
      try {
        const { fetchTrustScore } = await import('@/lib/v2/api')
        return await fetchTrustScore(userId)
      } catch {
        return null
      }
    },
    enabled: !!userId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })
}

// ── Profile Skills ───────────────────────────────────────────────────────────

export function useProfileSkills(profileType: string, profileId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['profile-skills', profileType, profileId],
    queryFn: async () => {
      if (!profileId) return []
      const { data, error } = await supabase
        .from('profile_skills')
        .select('skill_id, skills(name, category, slug)')
        .eq('profile_type', profileType)
        .eq('profile_id', profileId)
      if (error || !data) return []
      return data
    },
    enabled: !!profileId && enabled,
    staleTime: 30 * 60 * 1000,
  })
}

// ── Applications ─────────────────────────────────────────────────────────────

export function useApplications(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['applications', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('candidate_id', userId)
        .order('submitted_at', { ascending: false })
      if (error || !data) return []
      return data
    },
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000,
  })
}

// ── Matches ──────────────────────────────────────────────────────────────────

export function useMatches(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['matches', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`candidate_id.eq.${userId},professional_id.eq.${userId}`)
        .order('score', { ascending: false })
      if (error || !data) return []
      return data
    },
    enabled: !!userId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

// ── Screening Criteria ───────────────────────────────────────────────────────

export function useScreeningCriteria(professionalId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['screening-criteria', professionalId],
    queryFn: async () => {
      if (!professionalId) return []
      const { data, error } = await supabase
        .from('screening_criteria')
        .select('*')
        .eq('is_active', true)
      if (error || !data) return []
      return data
    },
    enabled: !!professionalId && enabled,
    staleTime: 10 * 60 * 1000,
  })
}

// ── Skills ───────────────────────────────────────────────────────────────────

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('popularity', { ascending: false })
      if (error || !data) return []
      return data
    },
    staleTime: 60 * 60 * 1000, // 1 hour — skills rarely change
  })
}

// ── Companies ────────────────────────────────────────────────────────────────

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')
      if (error || !data) return []
      return data
    },
    staleTime: 30 * 60 * 1000,
  })
}
