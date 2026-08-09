// ============================================================================
// Direct Refer — Supabase Data Access Layer
// ============================================================================
// Maps Supabase DB rows to frontend types from mock.ts.
// All functions return empty arrays / null on error.
// ============================================================================

import { supabase } from '@/lib/supabase'
import {
  GRADIENTS,
  type Professional,
  type ReferralRequest,
  type ReferralStatus,
  type Conversation,
  type Message,
  type Job,
  type AppNotification,
  type NotificationType,
} from '@/data/mock'

// ── Helpers ─────────────────────────────────────────────────────

// Map frontend Role type to DB role_context values
const ROLE_TO_DB: Record<string, string> = {
  student: 'JOB_SEEKER',
  professional: 'PROFESSIONAL',
  recruiter: 'RECRUITER',
  admin: 'ADMIN',
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / 86_400_000)
}

export function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function mapReferralStatus(
  dbStatus: 'pending' | 'accepted' | 'rejected' | 'expired' | 'hired'
): ReferralStatus {
  if (dbStatus === 'expired') return 'rejected'
  return dbStatus
}

function mapNotificationType(
  dbType: string
): NotificationType {
  switch (dbType) {
    case 'referral_accepted': return 'accepted'
    case 'referral_rejected': return 'rejected'
    case 'referral_request': return 'reminder'
    case 'message': return 'message'
    case 'job_match': return 'system'
    case 'reminder': return 'reminder'
    case 'system': return 'system'
    default: return 'system'
  }
}

function buildLocation(
  city: string | null,
  state: string | null,
  country: string | null
): string {
  const parts = [city, state].filter(Boolean)
  if (parts.length === 0 && country) return country
  if (country && country !== 'US') parts.push(country)
  return parts.join(', ') || 'Remote'
}

// ── Professionals ───────────────────────────────────────────────

export async function fetchProfessionals(currentUserId?: string): Promise<Professional[]> {
  try {
    const [allProfilesRes, ] = await Promise.all([
      currentUserId
        ? supabase
            .from('profiles_professional')
            .select('user_id, company_name, job_title, department, years_experience, open_for_referrals, is_open_to_work, referral_capacity, referrals_used, referral_policy, bio, skills, open_positions, response_rate, avg_reply_hours, success_rate, rating, review_count, github_url')
            .or(`open_for_referrals.eq.true,is_open_to_work.eq.true,user_id.eq.${currentUserId}`)
        : supabase
            .from('profiles_professional')
            .select('user_id, company_name, job_title, department, years_experience, open_for_referrals, is_open_to_work, referral_capacity, referrals_used, referral_policy, bio, skills, open_positions, response_rate, avg_reply_hours, success_rate, rating, review_count, github_url')
            .or('open_for_referrals.eq.true,is_open_to_work.eq.true'),
    ])

    if (allProfilesRes.error || !allProfilesRes.data) return []

    const userIds = [...new Set(allProfilesRes.data.map((p) => p.user_id))]

    const usersRes = await supabase
      .from('users')
      .select('id, full_name, email, mobile, city, state, country, verified, created_at, linkedin')
      .in('id', userIds)

    if (usersRes.error || !usersRes.data) return []

    const profileMap = new Map<string, typeof allProfilesRes.data[number]>()
    for (const p of allProfilesRes.data) {
      profileMap.set(p.user_id, p)
    }

    return usersRes.data.map((row, index): Professional => {
      const profile = profileMap.get(row.id) as {
        company_name: string
        job_title: string
        department: string | null
        years_experience: number
        open_for_referrals: boolean
        is_open_to_work: boolean
        referral_capacity: number
        referrals_used: number
        referral_policy: string | null
        bio: string | null
        skills: string[]
        open_positions: string[] | string | null
        response_rate: number
        avg_reply_hours: number
        success_rate: number
        rating: number
        review_count: number
        github_url: string | null
      } | undefined

      const openPositionsRaw = profile?.open_positions
      let openPositions: string[] = []
      try {
        openPositions = typeof openPositionsRaw === 'string'
          ? JSON.parse(openPositionsRaw)
          : Array.isArray(openPositionsRaw)
            ? openPositionsRaw
            : []
      } catch { openPositions = [] }

      return {
        id: row.id,
        name: row.full_name,
        designation: profile?.job_title ?? '',
        company: profile?.company_name ?? '',
        industry: profile?.department ?? 'Technology',
        location: buildLocation(row.city, row.state, row.country),
        yearsExp: profile?.years_experience ?? 0,
        skills: profile?.skills ?? [],
        responseRate: Number(profile?.response_rate ?? 0),
        avgReplyHours: Number(profile?.avg_reply_hours ?? 24),
        referralsCompleted: profile?.referrals_used ?? 0,
        rating: Number(profile?.rating ?? 0),
        reviews: profile?.review_count ?? 0,
        verified: row.verified,
        openForReferrals: profile?.open_for_referrals ?? true,
        isOpenToWork: profile?.is_open_to_work ?? false,
        maxPerMonth: profile?.referral_capacity ?? 5,
        usedThisMonth: profile?.referrals_used ?? 0,
        successRate: Number(profile?.success_rate ?? 0),
        followers: 0,
        joinedDaysAgo: daysSince(row.created_at),
        activityScore: Math.round(Number(profile?.response_rate ?? 0)),
        referralPolicy: profile?.referral_policy ?? '',
        openPositions,
        bio: profile?.bio ?? '',
        badges: [],
        gradient: GRADIENTS[index % GRADIENTS.length],
        phone: row.mobile ?? '',
        whatsapp: row.mobile ?? '',
        email: row.email,
        hiringTimeline: [
          { stage: 'Referral request', duration: 'Within 24 hours' },
          { stage: 'Profile review', duration: '1–2 days' },
          { stage: 'Referral submitted', duration: '2–3 days' },
          { stage: 'Hiring manager review', duration: '1–2 weeks' },
        ],
        referralDuration: 'Active',
        linkedinUrl: row.linkedin ?? '',
        githubUrl: profile?.github_url ?? '',
      }
    })
  } catch (err) {
    console.error('fetchProfessionals failed:', err)
    return []
  }
}

// ── Referrals ───────────────────────────────────────────────────

export async function fetchReferrals(userId: string): Promise<ReferralRequest[]> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('id, requester_id, professional_id, job_title, status, pipeline_stage, created_at, note, progress, requester:users!referrals_requester_id_fkey(full_name), professional:users!referrals_professional_id_fkey(full_name)')
      .or(`requester_id.eq.${userId},professional_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error || !data) return []

    const requesterIds = [...new Set(data.map(r => r.requester_id).filter(Boolean))]
    const { data: seekerProfiles } = await supabase
      .from('profiles_job_seeker')
      .select('user_id, resume_url')
      .in('user_id', requesterIds)

    const resumeMap = new Map<string, string>()
    for (const sp of seekerProfiles ?? []) {
      if (sp.resume_url) resumeMap.set(sp.user_id, sp.resume_url)
    }

    return data.map((row) => {
      const requesterArr = row.requester as unknown as { full_name: string }[] | null
      const requester = requesterArr?.[0] ?? null
      return {
        id: row.id,
        student: requester?.full_name ?? '',
        requesterId: row.requester_id,
        studentResumeUrl: resumeMap.get(row.requester_id) ?? undefined,
        professionalId: row.professional_id,
        role: row.job_title,
        status: mapReferralStatus(row.status),
        pipelineStage: row.pipeline_stage ?? (row.status === 'accepted' ? 'accepted' : row.status === 'rejected' ? 'request_sent' : 'request_sent'),
        date: new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        note: row.note ?? '',
        progress: row.progress,
      }
    })
  } catch (err) {
    console.error('fetchReferrals failed:', err)
    return []
  }
}

export async function createReferral(params: {
  requester_id: string
  professional_id: string
  job_title: string
  note?: string
}): Promise<ReferralRequest | null> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        requester_id: params.requester_id,
        professional_id: params.professional_id,
        job_title: params.job_title,
        note: params.note ?? null,
        pipeline_stage: 'request_sent',
        progress: 15,
      })
      .select('id, professional_id, job_title, status, created_at, note, progress, requester:users!referrals_requester_id_fkey(full_name)')
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      student: ((data.requester as unknown as { full_name: string }[] | null)?.[0])?.full_name ?? '',
      professionalId: data.professional_id,
      role: data.job_title,
      status: mapReferralStatus(data.status),
      pipelineStage: 'request_sent',
      date: new Date(data.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      note: data.note ?? '',
      progress: data.progress,
    }
  } catch (err) {
    console.error('createReferral failed:', err)
    return null
  }
}

export async function updateReferralStatus(
  referralId: string,
  status: 'accepted' | 'rejected'
): Promise<boolean> {
  try {
    const update: Record<string, unknown> = { status }
    // Advance pipeline when accepted
    if (status === 'accepted') {
      update.pipeline_stage = 'accepted'
      update.progress = 75
    }
    const { error } = await supabase
      .from('referrals')
      .update(update)
      .eq('id', referralId)

    return !error
  } catch (err) {
    console.error('updateReferralStatus failed:', err)
    return false
  }
}

// ── Conversations & Messages ────────────────────────────────────

export async function fetchConversations(userId: string, roleContext?: string): Promise<Conversation[]> {
  try {
    const dbRole = roleContext ? (ROLE_TO_DB[roleContext] || roleContext) : undefined
    let query = supabase
      .from('conversations')
      .select(`
        id,
        user_a_id,
        user_b_id,
        role_context,
        updated_at,
        user_a:users!conversations_user_a_id_fkey(id, full_name, avatar_url, role),
        user_b:users!conversations_user_b_id_fkey(id, full_name, avatar_url, role)
      `)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('updated_at', { ascending: false })

    if (dbRole) {
      query = query.eq('role_context', dbRole)
    }

    const { data: convRows, error: convError } = await query

    if (convError || !convRows) return []

    // Batch-fetch all messages for all conversations (avoids N+1)
    const convIds = convRows.map(c => c.id)
    const { data: allMsgRows } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at, read, kind')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true })

    // Group messages by conversation_id
    const msgByConv = new Map<string, Array<Record<string, unknown>>>()
    for (const msg of (allMsgRows as Array<Record<string, unknown>>) ?? []) {
      const convId = msg.conversation_id as string
      const list = msgByConv.get(convId) ?? []
      list.push(msg)
      msgByConv.set(convId, list)
    }

    const conversations: Conversation[] = []

    for (const conv of convRows) {
      const userA = Array.isArray(conv.user_a) ? conv.user_a[0] : conv.user_a as { id: string; full_name: string; avatar_url: string | null; role: string } | null
      const userB = Array.isArray(conv.user_b) ? conv.user_b[0] : conv.user_b as { id: string; full_name: string; avatar_url: string | null; role: string } | null

      const otherUser = userA?.id === userId ? userB : userA
      if (!otherUser) continue

      const msgRows = msgByConv.get(conv.id) ?? []

      const messages: Message[] = msgRows.map((msg) => ({
        id: String(msg.id),
        from: msg.sender_id === userId ? 'me' : 'them',
        text: String(msg.content ?? ''),
        time: formatRelativeTime(String(msg.created_at)),
        read: Boolean(msg.read),
        kind: (msg.kind as 'text' | 'file') ?? 'text',
      }))

      const lastMsg = messages[messages.length - 1]

      // Parse lastMessage display text (handle file JSON content)
      let lastMessageDisplay = lastMsg?.text ?? ''
      if (lastMsg?.kind === 'file' && lastMsg.text) {
        try {
          const parsed = JSON.parse(lastMsg.text)
          if (parsed.type === 'file') lastMessageDisplay = `📎 ${parsed.name || 'File'}`
        } catch { /* keep raw text */ }
      }

      const unreadCount = messages.filter(
        (m) => m.from === 'them' && !m.read
      ).length

      conversations.push({
        id: conv.id,
        name: otherUser.full_name,
        subtitle: '',
        lastMessage: lastMessageDisplay,
        time: lastMsg?.time ?? formatRelativeTime(conv.updated_at),
        unread: unreadCount,
        pinned: false,
        online: false,
        gradient: GRADIENTS[conversations.length % GRADIENTS.length],
        messages,
        otherUserId: otherUser.id,
        otherUserRole: otherUser.role,
      })
    }

    return conversations
  } catch (err) {
    console.error('fetchConversations failed:', err)
    return []
  }
}

export async function findOrCreateConversation(userId1: string, userId2: string, roleContext: string = 'job_seeker'): Promise<string | null> {
  try {
    const dbRole = ROLE_TO_DB[roleContext] || roleContext
    // Check if conversation already exists for this role context (either direction)
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('role_context', dbRole)
      .or(`and(user_a_id.eq.${userId1},user_b_id.eq.${userId2}),and(user_a_id.eq.${userId2},user_b_id.eq.${userId1})`)
      .maybeSingle()

    if (existing) return existing.id

    // Create new conversation — user_a is the lower ID for consistency
    const [a, b] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1]
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_a_id: a, user_b_id: b, role_context: dbRole })
      .select('id')
      .single()

    if (error || !data) {
      // Race condition: another concurrent call may have inserted first.
      // Retry the lookup to catch the duplicate.
      const { data: retry } = await supabase
        .from('conversations')
        .select('id')
        .eq('role_context', dbRole)
        .or(`and(user_a_id.eq.${userId1},user_b_id.eq.${userId2}),and(user_a_id.eq.${userId2},user_b_id.eq.${userId1})`)
        .maybeSingle()
      if (retry) return retry.id
      console.error('Failed to create conversation:', error)
      return null
    }
    return data.id
  } catch (err) {
    console.error('findOrCreateConversation failed:', err)
    return null
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  kind: 'text' | 'file' = 'text',
  fileUrl?: string,
  fileName?: string
): Promise<Message | null> {
  try {
    const storedContent = kind === 'file' && fileUrl
      ? JSON.stringify({ type: 'file', name: fileName || 'File', url: fileUrl })
      : content

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: storedContent,
        kind,
      })
      .select()
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      from: 'me',
      text: data.content,
      time: formatRelativeTime(data.created_at),
      read: data.read,
      kind: data.kind as 'text' | 'file',
    }
  } catch (err) {
    console.error('sendMessage failed:', err)
    return null
  }
}

// ── Jobs ────────────────────────────────────────────────────────

export async function fetchJobs(recruiterId?: string): Promise<Job[]> {
  try {
    let query = supabase
      .from('jobs')
      .select('id, title, department, location, type, salary_range, applicants, referrals, stage, posted_at, recruiter_id, description')
      .order('posted_at', { ascending: false })

    if (recruiterId) {
      query = query.eq('recruiter_id', recruiterId)
    }

    const { data, error } = await query

    if (error || !data) return []

    // Fetch pipeline counts for all jobs
    const jobIds = data.map((r) => r.id)
    const { data: pipelineRows } = await supabase
      .from('job_pipeline')
      .select('job_id, stage')
      .in('job_id', jobIds)

    // Group pipeline by job_id and count by stage
    const pipelineByJob = new Map<string, Record<string, number>>()
    for (const row of (pipelineRows ?? []) as Array<{ job_id: string; stage: string }>) {
      const counts = pipelineByJob.get(row.job_id) ?? {}
      counts[row.stage] = (counts[row.stage] ?? 0) + 1
      pipelineByJob.set(row.job_id, counts)
    }

    return data.map((row) => {
      const counts = pipelineByJob.get(row.id) ?? {}
      return {
        id: row.id,
        title: row.title,
        department: row.department ?? '',
        location: row.location ?? '',
        type: row.type ?? 'Full-time',
        salary: row.salary_range ?? '',
        applicants: row.applicants,
        referrals: row.referrals,
        stage:
          row.stage === 'active'
            ? 'Active'
            : row.stage === 'paused'
              ? 'Paused'
              : 'Draft',
        postedDaysAgo: daysSince(row.posted_at),
        pipeline: Object.entries(counts).map(([stage, count]) => ({ stage, count })),
        recruiterId: row.recruiter_id,
      }
    })
  } catch (err) {
    console.error('fetchJobs failed:', err)
    return []
  }
}

export async function updateJob(
  jobId: string,
  updates: {
    title?: string
    department?: string
    location?: string
    type?: string
    salary_range?: string
    stage?: 'active' | 'paused' | 'draft' | 'closed'
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)

    return !error
  } catch (err) {
    console.error('updateJob failed:', err)
    return false
  }
}

// ── Bookmarks ───────────────────────────────────────────────────

export async function fetchBookmarks(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('professional_id')
      .eq('user_id', userId)

    if (error || !data) return []

    return data.map((row) => row.professional_id)
  } catch (err) {
    console.error('fetchBookmarks failed:', err)
    return []
  }
}

// ── Notifications ───────────────────────────────────────────────

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, description, created_at, read')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !data) return []

    return data.map((row) => ({
      id: row.id,
      type: mapNotificationType(row.type),
      title: row.title,
      description: row.description ?? '',
      time: formatRelativeTime(row.created_at),
      read: row.read,
    }))
  } catch (err) {
    console.error('fetchNotifications failed:', err)
    return []
  }
}

export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    return !error
  } catch {
    return false
  }
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    return !error
  } catch {
    return false
  }
}

// ── Candidates (Recruiter Talent Search) ────────────────────────
// Derives candidates from job seekers who have referrals linked to the
// recruiter's jobs, or from the profiles_job_seeker pool.

export async function fetchCandidates(_userId?: string): Promise<
  {
    id: string
    name: string
    role: string
    company: string
    stage: string
    rating: number
    source: string
    gradient: string
    skills: string[]
    location: string
    exp: number
  }[]
> {
  try {
    // Wave 1: fetch referral data + open-to-work profiles in parallel
    const [referralResult, openSeekersResult] = await Promise.all([
      supabase
        .from('referrals')
        .select('id, status, job_title, requester_id, professional_id')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles_job_seeker')
        .select('user_id, skills, experience_years, preferred_role, headline, is_open_to_work')
        .eq('is_open_to_work', true),
    ])

    const { data: referrals, error: refError } = referralResult
    const { data: openSeekers } = openSeekersResult

    const referralCandidates: {
      id: string; name: string; role: string; company: string; stage: string;
      rating: number; source: string; gradient: string; skills: string[];
      location: string; exp: number
    }[] = []

    // Collect all user IDs needed upfront
    const allUserIds = new Set<string>()
    const requesterIds = new Set<string>()
    const professionalIds = new Set<string>()

    if (!refError && referrals && referrals.length > 0) {
      for (const r of referrals) {
        if (r.requester_id) { requesterIds.add(r.requester_id); allUserIds.add(r.requester_id) }
        if (r.professional_id) { professionalIds.add(r.professional_id); allUserIds.add(r.professional_id) }
      }
    }

    // Open-to-work user IDs — add all, deduplication handled when building results
    const openToWorkUserIds = new Set<string>()
    if (openSeekers && openSeekers.length > 0) {
      for (const sp of openSeekers) {
        openToWorkUserIds.add(sp.user_id)
        allUserIds.add(sp.user_id)
      }
    }

    // Wave 2: all lookups in parallel (no dependency between them)
    const [usersRes, seekerProfilesRes, profProfilesRes] = await Promise.all([
      allUserIds.size > 0
        ? supabase.from('users').select('id, full_name, city, state, country').in('id', [...allUserIds])
        : Promise.resolve({ data: [] }),
      requesterIds.size > 0
        ? supabase.from('profiles_job_seeker').select('user_id, skills, experience_years, preferred_role').in('user_id', [...requesterIds])
        : Promise.resolve({ data: [] }),
      professionalIds.size > 0
        ? supabase.from('profiles_professional').select('user_id, company_name').in('user_id', [...professionalIds])
        : Promise.resolve({ data: [] }),
    ])

    const userMap = new Map<string, { id: string; full_name: string; city: string | null; state: string | null; country: string | null }>()
    for (const u of usersRes.data ?? []) userMap.set(u.id, u)

    const seekerMap = new Map<string, { user_id: string; skills: string[]; experience_years: number; preferred_role: string | null }>()
    for (const sp of seekerProfilesRes.data ?? []) seekerMap.set(sp.user_id, sp)

    const profMap = new Map<string, { user_id: string; company_name: string }>()
    for (const pp of profProfilesRes.data ?? []) profMap.set(pp.user_id, pp)

    const statusMap: Record<string, string> = {
      pending: 'Applied',
      accepted: 'Screened',
      rejected: 'Applied',
      expired: 'Applied',
    }

    if (!refError && referrals && referrals.length > 0) {
      for (const [index, row] of referrals.entries()) {
        const requester = userMap.get(row.requester_id)
        const seekerProfile = seekerMap.get(row.requester_id)
        const profCompany = profMap.get(row.professional_id)

        referralCandidates.push({
          id: row.id,
          name: requester?.full_name ?? '',
          role: seekerProfile?.preferred_role ?? row.job_title,
          company: profCompany?.company_name ?? '',
          stage: statusMap[row.status] ?? 'Applied',
          rating: 0,
          source: 'Referral',
          gradient: GRADIENTS[index % GRADIENTS.length],
          skills: seekerProfile?.skills ?? [],
          location: buildLocation(
            requester?.city ?? null,
            requester?.state ?? null,
            requester?.country ?? null
          ),
          exp: seekerProfile?.experience_years ?? 0,
        })
      }
    }

    // Open-to-work candidates — user data already fetched in Wave 2
    const openToWorkCandidates: typeof referralCandidates = []
    if (openSeekers && openSeekers.length > 0) {
      const referralUserIds = new Set(referralCandidates.map(c => c.id))
      let idx = 0
      for (const sp of openSeekers) {
        if (referralUserIds.has(sp.user_id)) continue
        const u = userMap.get(sp.user_id)
        if (!u || !u.full_name) continue
        openToWorkCandidates.push({
          id: sp.user_id,
          name: u.full_name ?? '',
          role: sp.preferred_role ?? sp.headline ?? 'Job Seeker',
          company: '',
          stage: 'Open',
          rating: 0,
          source: 'Open to work',
          gradient: GRADIENTS[(referralCandidates.length + idx) % GRADIENTS.length],
          skills: sp.skills ?? [],
          location: buildLocation(u.city, u.state, u.country),
          exp: sp.experience_years ?? 0,
        })
        idx++
      }
    }

    const all = [...referralCandidates, ...openToWorkCandidates]
    return all.filter((c) => c.name !== '')
  } catch {
    return []
  }
}

// ── User Profile ────────────────────────────────────────────────

export async function updateUserProfile(
  userId: string,
  updates: {
    full_name?: string
    mobile?: string
    city?: string
    state?: string
    country?: string
    linkedin?: string
    avatar_url?: string
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)

    return !error
  } catch {
    return false
  }
}

export async function updateJobSeekerProfile(
  userId: string,
  updates: {
    qualification?: string
    college?: string
    graduation_year?: number
    preferred_role?: string
    preferred_location?: string
    skills?: string[]
    experience_years?: number
    portfolio_url?: string
    github_url?: string
    resume_url?: string
    resume_name?: string
    resume_size_bytes?: number
    resume_uploaded_at?: string
    headline?: string
    is_open_to_work?: boolean
    certifications?: string
    achievements?: string
    projects?: string
    preferred_companies?: string[]
    [key: string]: unknown
  }
): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('profiles_job_seeker')
      .select('user_id')
      .eq('user_id', userId)
          .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('profiles_job_seeker')
        .update(updates)
        .eq('user_id', userId)
        .select()
      if (error) {
        console.error('Update job seeker profile error:', error)
        throw new Error(`Failed to update job seeker profile: ${error.message}`)
      }
      return true
    } else {
      const { error } = await supabase
        .from('profiles_job_seeker')
        .insert({ user_id: userId, ...updates })
        .select()
      if (error) {
        console.error('Insert job seeker profile error:', error)
        throw new Error(`Failed to create job seeker profile: ${error.message}`)
      }
      return true
    }
  } catch (err) {
    if (err instanceof Error) throw err
    return false
  }
}

export async function updateProfessionalProfile(
  userId: string,
  updates: {
    company_name?: string
    job_title?: string
    department?: string
    work_email?: string
    years_experience?: number
    open_for_referrals?: boolean
    referral_capacity?: number
    referral_policy?: string
    bio?: string
    skills?: string[]
    open_positions?: string
    [key: string]: unknown
  }
): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('profiles_professional')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('profiles_professional')
        .update(updates)
        .eq('user_id', userId)
      if (error) {
        console.error('Update professional profile error:', error)
        throw new Error(`Failed to update professional profile: ${error.message}`)
      }
      return true
    } else {
      const { error } = await supabase
        .from('profiles_professional')
        .insert({ user_id: userId, ...updates })
      if (error) {
        console.error('Insert professional profile error:', error)
        throw new Error(`Failed to create professional profile: ${error.message}`)
      }
      return true
    }
  } catch (err) {
    if (err instanceof Error) throw err
    return false
  }
}

export async function updateRecruiterProfile(
  userId: string,
  updates: {
    company_name?: string
    job_title?: string
    hiring_department?: string
    work_email?: string
    company_size?: string
    company_website?: string
    company_description?: string
    [key: string]: unknown
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles_recruiter')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })

    if (error) {
      console.error('Update recruiter profile error:', error)
      throw new Error(`Failed to update recruiter profile: ${error.message}`)
    }
    return true
  } catch (err) {
    if (err instanceof Error) throw err
    return false
  }
}

// ── Dedicated toggle upsert (bypasses RLS via SECURITY DEFINER) ───
export async function upsertProfessionalField(userId: string, field: string, value: unknown): Promise<void> {
  const { error: rpcError } = await supabase.rpc('upsert_professional_toggle', {
    p_user_id: userId,
    p_field: field,
    p_value: value,
  })
  if (!rpcError) return

  console.warn(`RPC failed for ${field}, falling back to direct update:`, rpcError.message)
  const { error: updateError } = await supabase
    .from('profiles_professional')
    .upsert({ user_id: userId, [field]: value }, { onConflict: 'user_id' })
  if (updateError) {
    console.error(`DIRECT UPDATE FAILED: profiles_professional.${field}`, updateError.message, updateError.details, updateError.hint)
    throw new Error(`Failed to save ${field}: ${updateError.message}`)
  }
}

// ── Bookmarks (toggle) ─────────────────────────────────────────

export async function toggleBookmark(
  userId: string,
  professionalId: string
): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('user_id')
      .eq('user_id', userId)
      .eq('professional_id', professionalId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('professional_id', professionalId)
      return !error
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: userId, professional_id: professionalId })
      return !error
    }
  } catch {
    return false
  }
}

// ── File Uploads ───────────────────────────────────────────────

export async function uploadResume(
  userId: string,
  file: File
): Promise<{ url: string; name: string; size: number } | null> {
  try {
    const ext = file.name.split('.').pop() ?? 'pdf'
    const path = `${userId}/resume.${ext}`
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      console.error('Resume upload: no auth token')
      return null
    }

    const formData = new FormData()
    formData.append('file', file)

    const uploadUrl = `${supabaseUrl}/storage/v1/object/resumes/${path}`
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'x-upsert': 'true',
      },
      body: formData,
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error('Resume upload HTTP error:', uploadRes.status, errText)
      return null
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/resumes/${path}`

    const now = new Date().toISOString()
    const { error: dbError } = await supabase
      .from('profiles_job_seeker')
      .update({
        resume_url: publicUrl,
        resume_name: file.name,
        resume_size_bytes: file.size,
        resume_uploaded_at: now,
      })
      .eq('user_id', userId)

    if (dbError) {
      console.error('Resume DB update error:', dbError)
      return null
    }

    return { url: publicUrl, name: file.name, size: file.size }
  } catch (err) {
    console.error('Resume upload exception:', err)
    return null
  }
}

export async function deleteResume(
  userId: string
): Promise<boolean> {
  try {
    // Try to delete any resume file (list and remove all in user's folder)
    const { data: files } = await supabase.storage.from('resumes').list(userId)
    if (files && files.length > 0) {
      const paths = files.map(f => `${userId}/${f.name}`)
      const { error: storageError } = await supabase.storage.from('resumes').remove(paths)
      if (storageError) console.error('Resume storage delete error:', storageError)
    }

    const { error: dbError } = await supabase
      .from('profiles_job_seeker')
      .update({
        resume_url: null,
        resume_name: null,
        resume_size_bytes: null,
        resume_uploaded_at: null,
      })
      .eq('user_id', userId)

    if (dbError) {
      console.error('Resume DB delete error:', dbError)
      return false
    }

    return true
  } catch {
    return false
  }
}

// ── Admin: User Management ────────────────────────────────────

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  company: string | null
  lastActive: string | null
  daysInactive: number
  lastActivity: string
  gradient: string
  banned: boolean
}

export async function banUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ status: 'suspended' })
      .eq('id', userId)
    return !error
  } catch {
    return false
  }
}

export async function updateUserRole(userId: string, newRole: string): Promise<boolean> {
  try {
    const roleMap: Record<string, string> = {
      student: 'job_seeker',
      professional: 'professional',
      recruiter: 'recruiter',
    }
    const { error } = await supabase
      .from('users')
      .update({ role: roleMap[newRole] || newRole })
      .eq('id', userId)
    return !error
  } catch {
    return false
  }
}

// ── Admin: Platform Analytics ─────────────────────────────────

export interface PlatformAnalytics {
  totalUsers: number
  totalReferrals: number
  totalMessages: number
  totalJobs: number
  activeUsersThisWeek: number
  referralsThisWeek: number
  conversionRate: number
  usersByRole: { role: string; count: number }[]
  weeklySignups: { week: string; count: number }[]
  referralStatusBreakdown: { status: string; count: number }[]
}

export async function fetchPlatformAnalytics(): Promise<PlatformAnalytics> {
  const fallback: PlatformAnalytics = {
    totalUsers: 0, totalReferrals: 0, totalMessages: 0, totalJobs: 0,
    activeUsersThisWeek: 0, referralsThisWeek: 0, conversionRate: 0,
    usersByRole: [], weeklySignups: [], referralStatusBreakdown: [],
  }

  try {
    const [usersCountRes, refsAllRes, msgsCountRes, jobsCountRes] = await Promise.all([
      supabase.from('users').select('id, role, created_at', { count: 'exact', head: false }),
      supabase.from('referrals').select('id, status, created_at', { count: 'exact', head: false }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
    ])

    const users = usersCountRes.data || []
    const refs = refsAllRes.data || []
    const totalMessages = msgsCountRes.count ?? 0
    const totalJobs = jobsCountRes.count ?? 0

    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const activeThisWeek = users.filter((u) => u.created_at && u.created_at >= weekAgo).length
    const refsThisWeek = refs.filter((r) => r.created_at >= weekAgo).length

    const accepted = refs.filter((r) => r.status === 'accepted').length
    const conversionRate = refs.length > 0 ? Math.round((accepted / refs.length) * 100) : 0

    const roleCounts: Record<string, number> = {}
    users.forEach((u) => {
      const role = u.role || 'unknown'
      roleCounts[role] = (roleCounts[role] || 0) + 1
    })
    const usersByRole = Object.entries(roleCounts).map(([role, count]) => ({ role, count }))

    const statusCounts: Record<string, number> = {}
    refs.forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
    })
    const referralStatusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

    return {
      totalUsers: users.length,
      totalReferrals: refs.length,
      totalMessages,
      totalJobs,
      activeUsersThisWeek: activeThisWeek,
      referralsThisWeek: refsThisWeek,
      conversionRate,
      usersByRole,
      weeklySignups: [],
      referralStatusBreakdown,
    }
  } catch {
    return fallback
  }
}

// ── Reports (Admin) ─────────────────────────────────────────

interface Report {
  id: string
  reporter_id: string
  target_id: string
  reason: string
  description?: string
  status: string
  created_at: string
  resolved_at?: string
}

export async function createReport(targetId: string, reason: string, description: string = ''): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase
      .from('reports')
      .insert({ reporter_id: user.id, target_id: targetId, reason, description })
    return !error
  } catch {
    return false
  }
}

export async function updateReportStatus(reportId: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reports')
      .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
      .eq('id', reportId)
    return !error
  } catch {
    return false
  }
}

// ── Notification Preferences ─────────────────────────────────

// ── Admin: Platform Settings ──────────────────────────────────

export async function fetchPlatformSettings(): Promise<Record<string, unknown>> {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value')
    if (error || !data) return {}
    const settings: Record<string, unknown> = {}
    data.forEach((s) => { settings[s.key] = s.value })
    return settings
  } catch {
    return {}
  }
}

export async function updatePlatformSetting(key: string, value: unknown): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        key,
        value: JSON.parse(JSON.stringify(value)),
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
    return !error
  } catch {
    return false
  }
}

// ── Admin: Announcements ──────────────────────────────────────

export interface Announcement {
  id: string
  title: string
  body: string
  type: string
  active: boolean
  created_by: string | null
  created_at: string
  expires_at: string | null
  target_role: string
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, type, active, created_by, created_at, expires_at, target_role')
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data as Announcement[]
  } catch {
    return []
  }
}

export async function createAnnouncement(title: string, body: string, type: string, expiresAt?: string, targetRole?: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('announcements')
      .insert({
        title,
        body,
        type,
        created_by: user?.id || null,
        expires_at: expiresAt || null,
        target_role: targetRole || 'all',
      })
    return !error
  } catch {
    return false
  }
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)
    return !error
  } catch {
    return false
  }
}

export async function toggleAnnouncement(id: string, active: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('announcements')
      .update({ active })
      .eq('id', id)
    return !error
  } catch {
    return false
  }
}

// ── Admin: Reports with User Names ────────────────────────────

export interface ReportWithUsers extends Report {
  target_name: string
  target_email: string
  target_role: string
  reporter_name: string
}

export async function fetchReportsWithUsers(): Promise<ReportWithUsers[]> {
  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('id, reporter_id, target_id, reason, description, status, created_at, resolved_at')
      .in('status', ['open', 'under_review'])
      .order('created_at', { ascending: false })
    if (error || !reports) return []

    const userIds = [...new Set([...reports.map((r) => r.target_id), ...reports.map((r) => r.reporter_id)])]
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .in('id', userIds)

    const userMap = new Map<string, { full_name: string; email: string; role: string }>()
    ;(users || []).forEach((u) => userMap.set(u.id, { full_name: u.full_name, email: u.email, role: u.role }))

    return reports.map((r) => ({
      ...r,
      target_name: userMap.get(r.target_id)?.full_name || 'Unknown User',
      target_email: userMap.get(r.target_id)?.email || '',
      target_role: userMap.get(r.target_id)?.role || 'unknown',
      reporter_name: userMap.get(r.reporter_id)?.full_name || 'Unknown',
    }))
  } catch {
    return []
  }
}

// ── Admin: Users with Profiles ────────────────────────────────

export interface AdminUserFull extends AdminUser {
  company_name: string | null
  job_title: string | null
  status: string
  created_at: string | null
}

export async function fetchAllUsersFull(): Promise<AdminUserFull[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, created_at, last_login_at, city, state, status')
      .order('created_at', { ascending: false })
    if (error || !users) return []

    const userIds = users.map((u) => u.id)

    const [proRes, recRes] = await Promise.all([
      supabase.from('profiles_professional').select('user_id, company_name, job_title').in('user_id', userIds),
      supabase.from('profiles_recruiter').select('user_id, company_name, job_title').in('user_id', userIds),
    ])

    const profileMap = new Map<string, { company_name: string; job_title: string }>()
    ;(proRes.data || []).forEach((p) => profileMap.set(p.user_id, { company_name: p.company_name, job_title: p.job_title }))
    ;(recRes.data || []).forEach((p) => profileMap.set(p.user_id, { company_name: p.company_name, job_title: p.job_title }))

    return users.map((u, i) => {
      const profile = profileMap.get(u.id)
      const lastLogin = u.last_login_at || u.created_at || new Date().toISOString()
      const daysInactive = Math.floor((Date.now() - new Date(lastLogin).getTime()) / 86_400_000)
      const roleMap: Record<string, string> = {
        job_seeker: 'student',
        professional: 'professional',
        recruiter: 'recruiter',
        admin: 'admin',
      }
      return {
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email || '',
        role: roleMap[u.role] || u.role,
        company: profile?.company_name || null,
        lastActive: lastLogin,
        daysInactive,
        lastActivity: daysInactive < 1 ? 'Today' : `${daysInactive}d ago`,
        gradient: GRADIENTS[i % GRADIENTS.length],
        banned: u.status === 'suspended',
        company_name: profile?.company_name || null,
        job_title: profile?.job_title || null,
        status: u.status || 'active',
        created_at: u.created_at,
      }
    })
  } catch {
    return []
  }
}

// ── Admin: Audit Log ──────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  admin_id: string
  admin_name: string
  action: string
  target_id: string | null
  target_name: string
  details: Record<string, unknown> | null
  created_at: string
}

export async function logAdminAction(action: string, targetId?: string, details?: Record<string, unknown>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action,
        target_id: targetId || null,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
      })
    return !error
  } catch {
    return false
  }
}

export async function fetchAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  try {
    const { data: logs, error } = await supabase
      .from('admin_logs')
      .select('id, admin_id, action, target_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error || !logs) return []

    const adminIds = [...new Set(logs.map((l) => l.admin_id))]
    const targetIds = [...new Set(logs.filter((l) => l.target_id).map((l) => l.target_id!))]
    const allIds = [...new Set([...adminIds, ...targetIds])]
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', allIds)

    const userMap = new Map<string, string>()
    for (const u of allUsers ?? []) userMap.set(u.id, u.full_name)

    return logs.map((l) => ({
      id: l.id,
      admin_id: l.admin_id,
      admin_name: userMap.get(l.admin_id) || 'Admin',
      action: l.action,
      target_id: l.target_id,
      target_name: l.target_id ? (userMap.get(l.target_id) || 'Unknown') : '',
      details: l.details,
      created_at: l.created_at,
    }))
  } catch {
    return []
  }
}

// ── Admin: Unban User ─────────────────────────────────────────

export async function unbanUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ status: 'active' })
      .eq('id', userId)
    return !error
  } catch {
    return false
  }
}

// ── Admin: Delete User ────────────────────────────────────────

export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
    return !error
  } catch {
    return false
  }
}

// ── Admin: God-Mode User Management ───────────────────────────

export interface AdminUserDetail {
  id: string
  full_name: string
  email: string
  role: string
  status: string
  verified: boolean
  city: string | null
  state: string | null
  country: string | null
  linkedin: string | null
  avatar_url: string | null
  created_at: string
  last_login_at: string | null
  bio?: string
  designation?: string
  company_name?: string
  industry?: string
  years_exp?: number
  skills?: string[]
  open_for_referrals?: boolean
  experience?: { title: string; org: string; period: string; desc: string }[]
  education?: { school: string; degree: string; period: string; detail: string }[]
}

export async function fetchUserDetail(userId: string): Promise<AdminUserDetail | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, city, state, country, status, last_login_at, created_at, verified, linkedin, avatar_url')
      .eq('id', userId)
      .single()
    if (error || !user) return null

    const roleMap: Record<string, string> = {
      job_seeker: 'student',
      professional: 'professional',
      recruiter: 'recruiter',
      admin: 'admin',
    }

    const base: AdminUserDetail = {
      id: user.id,
      full_name: user.full_name || '',
      email: user.email || '',
      role: roleMap[user.role] || user.role,
      status: user.status || 'active',
      verified: user.verified || false,
      city: user.city,
      state: user.state,
      country: user.country,
      linkedin: user.linkedin,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
    }

    // Fetch role-specific profile
    if (user.role === 'professional') {
      const { data: pro } = await supabase
        .from('profiles_professional')
        .select('bio, job_title, company_name, department, years_experience, skills, open_for_referrals')
        .eq('user_id', userId)
        .single()
      if (pro) {
        base.bio = pro.bio
        base.designation = pro.job_title
        base.company_name = pro.company_name
        base.industry = pro.department
        base.years_exp = pro.years_experience
        base.skills = pro.skills
        base.open_for_referrals = pro.open_for_referrals
      }
    } else if (user.role === 'job_seeker') {
      const { data: js } = await supabase
        .from('profiles_job_seeker')
        .select('headline, skills, experience, education')
        .eq('user_id', userId)
        .single()
      if (js) {
        base.bio = js.headline
        base.skills = js.skills
        base.experience = js.experience
        base.education = js.education
      }
    } else if (user.role === 'recruiter') {
      const { data: rec } = await supabase
        .from('profiles_recruiter')
        .select('company_description, company_name, job_title, hiring_department')
        .eq('user_id', userId)
        .single()
      if (rec) {
        base.bio = rec.company_description
        base.company_name = rec.company_name
        base.designation = rec.job_title
        base.industry = rec.hiring_department
      }
    }

    return base
  } catch {
    return null
  }
}

export async function updateUserProfileAdmin(
  userId: string,
  data: {
    full_name?: string
    role?: string
    verified?: boolean
    status?: string
    city?: string
    state?: string
    country?: string
    linkedin?: string
    bio?: string
    designation?: string
    company_name?: string
    industry?: string
  }
): Promise<boolean> {
  try {
    const roleMap: Record<string, string> = {
      student: 'job_seeker',
      professional: 'professional',
      recruiter: 'recruiter',
      admin: 'admin',
    }

    // Update core user fields
    const userFields: Record<string, unknown> = {}
    if (data.full_name !== undefined) userFields.full_name = data.full_name
    if (data.role !== undefined) userFields.role = roleMap[data.role] || data.role
    if (data.verified !== undefined) userFields.verified = data.verified
    if (data.status !== undefined) userFields.status = data.status
    if (data.city !== undefined) userFields.city = data.city
    if (data.state !== undefined) userFields.state = data.state
    if (data.country !== undefined) userFields.country = data.country
    if (data.linkedin !== undefined) userFields.linkedin = data.linkedin

    if (Object.keys(userFields).length > 0) {
      const { error } = await supabase.from('users').update(userFields).eq('id', userId)
      if (error) {
        console.error('Admin update users failed:', error.message, error.details, error.hint)
        return false
      }
    }

    // Get the user's role to update the right profile table
    const { data: userData } = await supabase.from('users').select('role').eq('id', userId).single()
    const actualRole = userData?.role || 'job_seeker'

    const profileFields: Record<string, unknown> = {}
    if (data.bio !== undefined) {
      if (actualRole === 'professional' || actualRole === 'recruiter') profileFields.bio = data.bio
      else profileFields.headline = data.bio
    }
    if (data.designation !== undefined) profileFields.job_title = data.designation
    if (data.company_name !== undefined) profileFields.company_name = data.company_name
    if (data.industry !== undefined) {
      if (actualRole === 'recruiter') profileFields.hiring_department = data.industry
      else if (actualRole === 'professional') profileFields.department = data.industry
    }

    if (Object.keys(profileFields).length > 0) {
      const table = actualRole === 'professional' ? 'profiles_professional'
        : actualRole === 'recruiter' ? 'profiles_recruiter'
        : 'profiles_job_seeker'
      const { error: profileError } = await supabase.from(table).update(profileFields).eq('user_id', userId)
      if (profileError) {
        console.error('Admin update profile failed:', table, profileError.message, profileError.details, profileError.hint)
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

// ── Admin: Referral Moderation ────────────────────────────────

export async function deleteReferralAdmin(referralId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('referrals').delete().eq('id', referralId)
    return !error
  } catch {
    return false
  }
}

export async function updateReferralStatusAdmin(referralId: string, status: string): Promise<boolean> {
  try {
    const validStatuses = ['pending', 'accepted', 'rejected', 'expired']
    if (!validStatuses.includes(status)) {
      console.error('Invalid referral status:', status)
      return false
    }
    const { error } = await supabase.from('referrals').update({ status }).eq('id', referralId)
    if (error) console.error('Failed to update referral status:', error.message)
    return !error
  } catch {
    return false
  }
}

// ── Admin: Flagged Content Actions ────────────────────────────

export async function dismissReportAndBanUser(reportId: string, targetUserId: string): Promise<boolean> {
  try {
    // Ban the user
    const { error: banError } = await supabase.from('users').update({ status: 'suspended' }).eq('id', targetUserId)
    if (banError) return false
    // Resolve the report
    const { error: reportError } = await supabase.from('reports').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', reportId)
    if (reportError) return false
    return true
  } catch {
    return false
  }
}

// ── Admin: System Health ──────────────────────────────────────

export interface SystemHealth {
  dbSize: string
  activeConnections: number
  uptime: string
  lastDeployment: string
  apiResponseTime: number
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const fallback: SystemHealth = {
    dbSize: '—',
    activeConnections: 0,
    uptime: '—',
    lastDeployment: new Date().toLocaleDateString(),
    apiResponseTime: 0,
  }
  try {
    const start = Date.now()
    const { error } = await supabase.from('users').select('id', { count: 'exact', head: true })
    const responseTime = Date.now() - start
    if (error) return fallback
    return {
      ...fallback,
      apiResponseTime: responseTime,
    }
  } catch {
    return fallback
  }
}
