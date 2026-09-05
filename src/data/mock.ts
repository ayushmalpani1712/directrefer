// ─────────────────────────────────────────────────────────────
// Direct Refer — types, constants & helpers
// All data now lives in Supabase. This file only exports
// TypeScript types, shared constants (GRADIENTS, ROLE_META),
// and small utility functions.
// ─────────────────────────────────────────────────────────────

export type Role = 'student' | 'professional' | 'recruiter' | 'admin'

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

export type ReferralStatus = 'pending' | 'accepted' | 'rejected' | 'hired'

export type PipelineStage = 'request_sent' | 'under_review' | 'accepted' | 'submitted' | 'hired'

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

export const PIPELINE_STAGES: { key: PipelineStage; label: string; description: string }[] = [
  { key: 'request_sent', label: 'Request Sent', description: 'Your referral request has been sent' },
  { key: 'under_review', label: 'Under Review', description: 'The professional is reviewing your profile' },
  { key: 'accepted', label: 'Accepted', description: 'Your request has been accepted' },
  { key: 'submitted', label: 'Submitted', description: 'Your profile has been submitted internally' },
  { key: 'hired', label: 'Hired', description: 'Congratulations! You got the offer' },
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

export type NotificationType = 'accepted' | 'rejected' | 'message' | 'view' | 'reminder' | 'system'

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


