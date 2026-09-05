// ─────────────────────────────────────────────────────────────
// Direct Refer — types, constants & helpers
// All data now lives in Supabase. This file only exports
// TypeScript types, shared constants (GRADIENTS, ROLE_META),
// and small utility functions.
// ─────────────────────────────────────────────────────────────

export type Role = 'student' | 'professional' | 'recruiter' | 'admin'

/** Master toggle — set to true to re-enable Recruiter everywhere. */
export const RECRUITER_VISIBLE = false

export const ROLE_META: Record<Role, { label: string; singular: string }> = {
  student: { label: 'Job Seeker', singular: 'Student' },
  professional: { label: 'Referrer', singular: 'Referrer' },
  recruiter: { label: 'Recruiter', singular: 'Recruiter' },
  admin: { label: 'Admin', singular: 'Admin' },
}

export const ROLE_ROUTE: Record<Role, string> = {
  student: '/job-seeker',
  professional: '/professional',
  recruiter: '/recruiter',
  admin: '/admin',
}

export const ROLE_MESSAGES_ROUTE: Record<Role, string> = {
  student: '/job-seeker/messages',
  professional: '/professional/messages',
  recruiter: '/recruiter/messages',
  admin: '/admin/messages',
}

export function getMessagesPath(role: Role): string {
  return ROLE_MESSAGES_ROUTE[role]
}

export function getRoleFromPath(pathname: string): Role {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/recruiter')) return 'recruiter'
  if (pathname.startsWith('/professional')) return 'professional'
  if (pathname.startsWith('/job-seeker')) return 'student'
  return 'student'
}

export interface Professional {
  id: string
  slug?: string
  name: string
  designation: string
  company: string
  industry: string
  location: string
  yearsExp: number
  skills: string[]
  responseRate: number
  avgReplyHours: number
  referralsCompleted: number
  rating: number
  reviews: number
  verified: boolean
  openForReferrals: boolean
  isOpenToWork: boolean
  maxPerMonth: number
  usedThisMonth: number
  successRate: number
  followers: number
  joinedDaysAgo: number
  activityScore: number
  referralPolicy: string
  openPositions: string[]
  bio: string
  badges: string[]
  gradient: string
  phone: string
  whatsapp: string
  email: string
  hiringTimeline: { stage: string; duration: string }[]
  referralDuration: string
  linkedinUrl: string
  githubUrl: string
  college?: string
}

export const GRADIENTS = [
  'from-[#6366F1] to-[#8B5CF6]',
  'from-sky-500 to-cyan-400',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-pink-400',
  'from-amber-500 to-orange-400',
  'from-[#5B6FE5] to-purple-400',
  'from-orange-500 to-rose-400',
  'from-cyan-600 to-sky-400',
  'from-pink-500 to-rose-400',
  'from-violet-500 to-indigo-400',
  'from-teal-500 to-emerald-400',
]

export type ReferralStatus = 'requested' | 'under_review' | 'accepted' | 'declined' | 'referral_submitted' | 'application_submitted' | 'closed'

export type PipelineStage = 'requested' | 'under_review' | 'accepted' | 'referral_submitted' | 'application_submitted' | 'closed'

export type RelationshipType = 'former_colleague' | 'current_colleague' | 'manager' | 'mentor' | 'alumni' | 'friend' | 'referral_chain' | 'stranger'

export const REFERRAL_RELATIONSHIPS: { value: RelationshipType; label: string; description: string }[] = [
  { value: 'former_colleague', label: 'Former colleague', description: 'Worked together at a previous company' },
  { value: 'current_colleague', label: 'Current colleague', description: 'Currently work at the same company' },
  { value: 'manager', label: 'Manager / Report', description: 'Direct reporting relationship' },
  { value: 'mentor', label: 'Mentor / Mentee', description: 'Guided each other professionally' },
  { value: 'alumni', label: 'Alumni', description: 'Attended the same college or university' },
  { value: 'friend', label: 'Friend', description: 'Personal acquaintance outside work' },
  { value: 'referral_chain', label: 'Referral chain', description: 'Connected through mutual contacts' },
  { value: 'stranger', label: 'No prior relationship', description: 'Found them on DirectRefer' },
]

export const POLICY_ACKNOWLEDGMENT = 'I understand this professional is not obligated to refer me and may decline for any reason. I will not pressure, spam, or misrepresent my qualifications. I respect their time and decision.'

// ─── Reputation Engine ──────────────────────────────────────

export interface ReputationBreakdown {
  responseReliability: number // 0-25
  acceptanceRate: number // 0-25
  referralQuality: number // 0-25
  profileQuality: number // 0-25
}

export const BADGE_DEFINITIONS: { id: string; label: string; description: string; icon: string; condition: (p: Professional) => boolean }[] = [
  { id: 'quick_responder', label: 'Quick Responder', description: 'Responds within 24 hours consistently', icon: '⚡', condition: (p) => p.responseRate >= 90 && p.avgReplyHours <= 24 },
  { id: 'trusted_referrer', label: 'Trusted Referrer', description: 'High acceptance rate with 10+ referrals', icon: '🛡️', condition: (p) => p.successRate >= 70 && p.referralsCompleted >= 10 },
  { id: 'verified_pro', label: 'Verified', description: 'Identity and employment verified', icon: '✓', condition: (p) => p.verified },
  { id: 'top_referrer', label: 'Top Referrer', description: '25+ successful referrals', icon: '🏆', condition: (p) => p.referralsCompleted >= 25 },
  { id: 'consistent_performer', label: 'Consistent', description: 'High response rate, 30+ days active', icon: '📈', condition: (p) => p.responseRate >= 80 && p.joinedDaysAgo >= 30 },
  { id: 'company_champion', label: 'Champion', description: 'Active referrer at their company', icon: '🏢', condition: (p) => p.referralsCompleted >= 5 && p.openForReferrals },
  { id: 'open_book', label: 'Transparent', description: 'Complete profile with policy and bio', icon: '📖', condition: (p) => p.bio.length > 100 && p.referralPolicy.length > 20 && p.skills.length >= 3 },
  { id: 'fast_track', label: 'Fast Track', description: 'Average reply under 4 hours', icon: '🚀', condition: (p) => p.avgReplyHours <= 4 },
]

/** Calculate reputation score (0-100) based on genuine activity — not volume alone */
export function calculateReputationScore(professional: Professional): { score: number; breakdown: ReputationBreakdown; badges: string[] } {
  // Response reliability (0-25): responseRate weighted by speed
  const responseBase = (professional.responseRate / 100) * 20
  const speedBonus = professional.avgReplyHours <= 4 ? 5 : professional.avgReplyHours <= 12 ? 3 : professional.avgReplyHours <= 24 ? 1 : 0
  const responseReliability = Math.min(25, Math.round(responseBase + speedBonus))

  // Acceptance rate (0-25): successRate with volume confidence ramp
  const volumeConfidence = Math.min(1, professional.referralsCompleted / 10)
  const acceptanceRaw = (professional.successRate / 100) * 20 * volumeConfidence + (professional.referralsCompleted > 0 ? 5 : 0)
  const cappedAcceptance = Math.min(25, Math.round(acceptanceRaw))

  // Referral quality (0-25): completion + consistency, NOT volume
  const completionScore = professional.referralsCompleted > 0 ? Math.min(15, professional.referralsCompleted * 1.5) : 0
  const consistencyBonus = professional.joinedDaysAgo >= 60 ? 5 : professional.joinedDaysAgo >= 30 ? 3 : 0
  const capacityUtil = professional.maxPerMonth > 0 ? professional.usedThisMonth / professional.maxPerMonth : 0
  const activeBonus = capacityUtil > 0 && capacityUtil < 1 ? 5 : 0
  const referralQuality = Math.min(25, Math.round(completionScore + consistencyBonus + activeBonus))

  // Profile quality (0-25): completeness + verification
  const hasBio = professional.bio.length > 50 ? 5 : 0
  const hasPolicy = professional.referralPolicy.length > 10 ? 3 : 0
  const hasSkills = Math.min(5, professional.skills.length)
  const hasPositions = professional.openPositions.length > 0 ? 4 : 0
  const verifiedBonus = professional.verified ? 5 : 0
  const profileQuality = Math.min(25, hasBio + hasPolicy + hasSkills + hasPositions + verifiedBonus)

  const score = Math.min(100, responseReliability + cappedAcceptance + referralQuality + profileQuality)
  const badges = BADGE_DEFINITIONS.filter((b) => b.condition(professional)).map((b) => b.id)

  return { score, breakdown: { responseReliability, acceptanceRate: cappedAcceptance, referralQuality, profileQuality }, badges }
}

/** Calculate match score between a candidate and a professional referrer (0-100) */
export function calculateMatchScore(
  candidate: ReferralRequest['candidate'],
  professional: Professional,
  targetRole?: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  // Skills overlap (0-25 pts)
  if (candidate?.skills?.length && professional.skills.length) {
    const overlap = candidate.skills.filter((s) =>
      professional.skills.some((ps) => ps.toLowerCase() === s.toLowerCase())
    )
    const skillScore = Math.min(25, Math.round((overlap.length / Math.max(candidate.skills.length, 1)) * 25))
    score += skillScore
    if (overlap.length > 0) reasons.push(`${overlap.length} skill${overlap.length > 1 ? 's' : ''} match`)
  }

  // Role/title match (0-20 pts)
  if (targetRole && professional.openPositions.length) {
    const roleLower = targetRole.toLowerCase()
    const matchPos = professional.openPositions.find((p) => {
      const pLower = p.toLowerCase()
      return pLower.includes(roleLower) || roleLower.includes(pLower) ||
        pLower.split(/\s+/).some((w) => w.length > 3 && roleLower.includes(w))
    })
    if (matchPos) {
      score += 20
      reasons.push(`Open role: ${matchPos}`)
    }
  }

  // Company match (0-15 pts)
  if (candidate?.headline?.toLowerCase().includes(professional.company.toLowerCase()) ||
      candidate?.whyFit?.toLowerCase().includes(professional.company.toLowerCase())) {
    score += 15
    reasons.push(`Targets ${professional.company}`)
  }

  // Location match (0-10 pts)
  if (candidate?.location && professional.location) {
    const candLoc = candidate.location.toLowerCase()
    const proLoc = professional.location.toLowerCase()
    if (candLoc === proLoc || candLoc.split(',')[0] === proLoc.split(',')[0]) {
      score += 10
      reasons.push('Same location')
    } else if (candLoc.split(',').pop()?.trim() === proLoc.split(',').pop()?.trim()) {
      score += 5
      reasons.push('Same region')
    }
  }

  // Reputation score (0-30 pts)
  const reputation = calculateReputationScore(professional)
  const repScore = Math.round((reputation.score / 100) * 30)
  score += repScore
  if (reputation.score >= 70) reasons.push('High reputation')
  if (reputation.badges.length >= 3) reasons.push(`${reputation.badges.length} trust badges`)

  // Availability bonus (0-5 pts)
  if (professional.openForReferrals && professional.usedThisMonth < professional.maxPerMonth) {
    score += 5
  }

  return { score: Math.min(100, score), reasons }
}

export const PIPELINE_STAGES: { key: PipelineStage; label: string; description: string }[] = [
  { key: 'requested', label: 'Requested', description: 'Your referral request has been sent' },
  { key: 'under_review', label: 'Under Review', description: 'The professional is reviewing your profile' },
  { key: 'accepted', label: 'Accepted', description: 'Your request has been accepted' },
  { key: 'referral_submitted', label: 'Referral Submitted', description: 'The professional has submitted your referral' },
  { key: 'application_submitted', label: 'Application Submitted', description: 'You have applied for the position' },
  { key: 'closed', label: 'Closed', description: 'The referral process is complete' },
]

export const STATUS_META: Record<ReferralStatus, { label: string; color: string; icon: string; description: string }> = {
  requested: { label: 'Requested', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: 'Send', description: 'Waiting for the professional to review' },
  under_review: { label: 'Under Review', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: 'Clock', description: 'The professional is reviewing your request' },
  accepted: { label: 'Accepted', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: 'CheckCircle2', description: 'The professional has agreed to refer you' },
  declined: { label: 'Declined', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: 'XCircle', description: 'The professional declined your request' },
  referral_submitted: { label: 'Referral Submitted', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: 'FileCheck', description: 'The referral has been submitted to the company' },
  application_submitted: { label: 'Application Submitted', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: 'Send', description: 'You have applied for the position' },
  closed: { label: 'Closed', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: 'CheckCircle2', description: 'This referral process is complete' },
}

export const DECLINE_REASONS = [
  { value: 'not_fit', label: 'Not a fit for the role' },
  { value: 'overqualified', label: 'Overqualified' },
  { value: 'underqualified', label: 'Underqualified' },
  { value: 'capacity', label: 'At capacity — cannot take more referrals' },
  { value: 'no_response', label: 'No response needed' },
  { value: 'other', label: 'Other reason' },
]

export interface ReferralRequest {
  id: string
  student: string
  requesterId?: string
  studentEmail?: string
  studentResumeUrl?: string
  professionalId: string
  role: string
  status: ReferralStatus
  pipelineStage: PipelineStage
  date: string
  note: string
  progress: number
  createdAt?: string
  relationshipType?: RelationshipType
  relationshipNote?: string
  policyAcknowledged?: boolean
  candidate?: {
    headline?: string
    location?: string
    skills?: string[]
    experience?: { title: string; org: string; period: string; desc: string }[]
    education?: { school: string; degree: string; period: string; detail: string }[]
    noticePeriod?: string
    workPreference?: string
    whyFit?: string
    college?: string
  }
}

export interface Job {
  id: string
  title: string
  department: string
  location: string
  type: string
  salary: string
  applicants: number
  referrals: number
  stage: 'Active' | 'Paused' | 'Draft' | 'Closed'
  postedDaysAgo: number
  pipeline: { stage: string; count: number }[]
  recruiterId?: string
  recruiterSlug?: string
}

export interface Message { id: string; from: 'me' | 'them'; text: string; time: string; is_read: boolean; read_at?: string; kind?: 'text' | 'file' }
export interface Conversation {
  id: string; name: string; subtitle: string; lastMessage: string; time: string
  unread: number; pinned: boolean; online: boolean; gradient: string; messages: Message[]
  otherUserId?: string
  otherUserRole?: string
  otherUserSlug?: string
}

export type NotificationType = 'accepted' | 'rejected' | 'declined' | 'referral_submitted' | 'application_submitted' | 'closed' | 'message' | 'view' | 'reminder' | 'system'

export interface AppNotification {
  id: string; type: NotificationType; title: string; description: string; time: string; read: boolean
}

// ─── helpers ────────────────────────────────────────────────

export function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function sanitizeSlug(slug: string): string {
  if (/^https?:\/\//.test(slug) || slug.includes('linkedin.com') || slug.includes('/') || slug.includes('.')) {
    const match = slug.match(/\/in\/([^/]+)/)
    if (match) return match[1]
    return slug.split('/').pop()?.replace(/\.[^.]+$/, '') || slug
  }
  return slug
}

export function profileUrl(role: string, id: string, slug?: string): string {
  const identifier = slug ? sanitizeSlug(slug) : id
  if (role === 'professional') return `/professionals/${identifier}`
  if (role === 'recruiter') return `/company/${identifier}`
  return `/job-seekers/${identifier}`
}


