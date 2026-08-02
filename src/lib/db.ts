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

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / 86_400_000)
}

function formatRelativeTime(iso: string): string {
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
  dbStatus: 'pending' | 'accepted' | 'rejected' | 'expired'
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

export async function fetchProfessionals(): Promise<Professional[]> {
  try {
    const [usersRes, profilesRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, full_name, email, mobile, city, state, country, verified, created_at, linkedin')
        .eq('role', 'professional')
        .eq('status', 'active'),
      supabase
        .from('profiles_professional')
        .select('*'),
    ])

    if (usersRes.error || !usersRes.data) return []
    if (profilesRes.error || !profilesRes.data) return []

    const profileMap = new Map<string, typeof profilesRes.data[number]>()
    for (const p of profilesRes.data) {
      profileMap.set(p.user_id, p)
    }

    return usersRes.data.map((row, index): Professional => {
      const profile = profileMap.get(row.id) as {
        company_name: string
        job_title: string
        department: string | null
        years_experience: number
        open_for_referrals: boolean
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
      const openPositions: string[] = typeof openPositionsRaw === 'string'
        ? JSON.parse(openPositionsRaw)
        : Array.isArray(openPositionsRaw)
          ? openPositionsRaw
          : []

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
  } catch {
    return []
  }
}

// ── Referrals ───────────────────────────────────────────────────

export async function fetchReferrals(userId: string): Promise<ReferralRequest[]> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        requester:users!referrals_requester_id_fkey(full_name),
        professional:users!referrals_professional_id_fkey(full_name)
      `)
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
      const requester = row.requester as { full_name: string } | null
      return {
        id: row.id,
        student: requester?.full_name ?? '',
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
  } catch {
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
      .select(`
        *,
        requester:users!referrals_requester_id_fkey(full_name)
      `)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      student: (data.requester as { full_name: string })?.full_name ?? '',
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
  } catch {
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
  } catch {
    return false
  }
}

// ── Conversations & Messages ────────────────────────────────────

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  try {
    const { data: convRows, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        user_a_id,
        user_b_id,
        updated_at,
        user_a:users!conversations_user_a_id_fkey(id, full_name, avatar_url),
        user_b:users!conversations_user_b_id_fkey(id, full_name, avatar_url)
      `)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('updated_at', { ascending: false })

    if (convError || !convRows) return []

    // Batch-fetch all messages for all conversations (avoids N+1)
    const convIds = convRows.map(c => c.id)
    const { data: allMsgRows } = await supabase
      .from('messages')
      .select('*')
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
      const userA = Array.isArray(conv.user_a) ? conv.user_a[0] : conv.user_a as { id: string; full_name: string; avatar_url: string | null } | null
      const userB = Array.isArray(conv.user_b) ? conv.user_b[0] : conv.user_b as { id: string; full_name: string; avatar_url: string | null } | null

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
      const unreadCount = messages.filter(
        (m) => m.from === 'them' && !m.read
      ).length

      conversations.push({
        id: conv.id,
        name: otherUser.full_name,
        subtitle: '',
        lastMessage: lastMsg?.text ?? '',
        time: lastMsg?.time ?? formatRelativeTime(conv.updated_at),
        unread: unreadCount,
        pinned: unreadCount > 0,
        online: false,
        gradient: GRADIENTS[conversations.length % GRADIENTS.length],
        messages,
      })
    }

    return conversations
  } catch {
    return []
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        kind: 'text',
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
  } catch {
    return null
  }
}

// ── Jobs ────────────────────────────────────────────────────────

export async function fetchJobs(recruiterId?: string): Promise<Job[]> {
  try {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        job_pipeline ( stage, count )
      `)
      .order('posted_at', { ascending: false })

    if (recruiterId) {
      query = query.eq('recruiter_id', recruiterId)
    }

    const { data, error } = await query

    if (error || !data) return []

    return data.map((row) => ({
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
      pipeline: (row.job_pipeline as { stage: string; count: number }[] ?? []).map(
        (p) => ({ stage: p.stage, count: p.count })
      ),
      recruiterId: row.recruiter_id,
    }))
  } catch {
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
  } catch {
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
  } catch {
    return []
  }
}

// ── Notifications ───────────────────────────────────────────────

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
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
  } catch {
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

export async function fetchCandidates(): Promise<
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
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('id, status, job_title, requester_id, professional_id')
      .order('created_at', { ascending: false })

    if (refError || !referrals) return []

    const requesterIds = [...new Set(referrals.map(r => r.requester_id).filter(Boolean))]
    const professionalIds = [...new Set(referrals.map(r => r.professional_id).filter(Boolean))]

    const [usersRes, seekerProfilesRes, profProfilesRes] = await Promise.all([
      supabase.from('users').select('id, full_name, city, state, country').in('id', [...requesterIds, ...professionalIds]),
      supabase.from('profiles_job_seeker').select('user_id, skills, experience_years, preferred_role').in('user_id', requesterIds),
      supabase.from('profiles_professional').select('user_id, company_name').in('user_id', professionalIds),
    ])

    const userMap = new Map<string, { id: string; full_name: string; city: string | null; state: string | null; country: string | null }>()
    for (const u of usersRes.data ?? []) userMap.set(u.id, u)

    const seekerMap = new Map<string, { user_id: string; skills: string[]; experience_years: number; preferred_role: string | null }>()
    for (const sp of seekerProfilesRes.data ?? []) seekerMap.set(sp.user_id, sp)

    const profMap = new Map<string, { user_id: string; company_name: string }>()
    for (const pp of profProfilesRes.data ?? []) profMap.set(pp.user_id, pp)

    return referrals.map((row, index) => {
      const requester = userMap.get(row.requester_id)
      const seekerProfile = seekerMap.get(row.requester_id)
      const profCompany = profMap.get(row.professional_id)

      const statusMap: Record<string, string> = {
        pending: 'Applied',
        accepted: 'Screened',
        rejected: 'Applied',
        expired: 'Applied',
      }

      return {
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
      }
    })
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
    open_to_work?: boolean
    certifications?: string
    achievements?: string
    projects?: string
    preferred_companies?: string[]
    [key: string]: unknown
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles_job_seeker')
      .update(updates)
      .eq('user_id', userId)

    return !error
  } catch {
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
      if (error) console.error('Update professional profile error:', error)
      return !error
    } else {
      const { error } = await supabase
        .from('profiles_professional')
        .insert({ user_id: userId, ...updates })
      if (error) console.error('Insert professional profile error:', error)
      return !error
    }
  } catch {
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
      .update(updates)
      .eq('user_id', userId)

    return !error
  } catch {
    return false
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

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) return null

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)

    await supabase
      .from('users')
      .update({ avatar_url: data.publicUrl })
      .eq('id', userId)

    return data.publicUrl
  } catch {
    return null
  }
}

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
      await supabase.storage.from('resumes').remove(paths).catch(() => {})
    }

    await supabase
      .from('profiles_job_seeker')
      .update({
        resume_url: null,
        resume_name: null,
        resume_size_bytes: null,
        resume_uploaded_at: null,
      })
      .eq('user_id', userId)

    return true
  } catch {
    return false
  }
}

// ── Admin: User Management ────────────────────────────────────

export interface AdminUser {
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

export async function fetchAllUsers(): Promise<AdminUser[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, created_at, city, state')
      .order('created_at', { ascending: false })

    if (error || !users) return []

    return users.map((u, i) => {
      const lastLogin = u.created_at || new Date().toISOString()
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
        company: null,
        lastActive: lastLogin,
        daysInactive,
        lastActivity: daysInactive < 1 ? 'Today' : `${daysInactive}d ago`,
        gradient: GRADIENTS[i % GRADIENTS.length],
        banned: false,
      }
    })
  } catch {
    return []
  }
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

// ── Reviews ───────────────────────────────────────────────────

export interface Review {
  id: string
  user_id: string
  reviewer_name: string
  company: string | null
  text: string
  rating: number
  created_at: string
}

export async function fetchReviews(userId: string): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .or(`reviewer_id.eq.${userId},professional_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data as Review[]
  } catch {
    return []
  }
}

// ── Reports (Admin) ─────────────────────────────────────────

export interface Report {
  id: string
  reporter_id: string
  target_id: string
  reason: string
  description?: string
  status: string
  created_at: string
  resolved_at?: string
}

export async function fetchReports(): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data as Report[]
  } catch {
    return []
  }
}

export async function createReport(targetId: string, reason: string, description: string = ''): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('create_report', {
      p_target_id: targetId,
      p_reason: reason,
      p_description: description,
    })
    return !error
  } catch {
    return false
  }
}

export async function updateReportStatus(reportId: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('update_report_status', {
      p_report_id: reportId,
      p_status: status,
    })
    return !error
  } catch {
    return false
  }
}

// ── Notification Preferences ─────────────────────────────────

export interface NotificationPreferences {
  referral_updates: boolean
  new_messages: boolean
  profile_views: boolean
  completion_reminders: boolean
  product_announcements: boolean
  weekly_digest: boolean
  email_opt_out: boolean
}

const DEFAULT_PREFS: NotificationPreferences = {
  referral_updates: true,
  new_messages: true,
  profile_views: true,
  completion_reminders: true,
  product_announcements: false,
  weekly_digest: false,
  email_opt_out: false,
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return DEFAULT_PREFS

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !data) return DEFAULT_PREFS
    return {
      referral_updates: data.referral_updates ?? true,
      new_messages: data.new_messages ?? true,
      profile_views: data.profile_views ?? true,
      completion_reminders: data.completion_reminders ?? true,
      product_announcements: data.product_announcements ?? false,
      weekly_digest: data.weekly_digest ?? false,
      email_opt_out: data.email_opt_out ?? false,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export async function updateNotificationPreferences(prefs: Partial<NotificationPreferences>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...prefs,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    return !error
  } catch {
    return false
  }
}
