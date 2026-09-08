// ============================================================================
// DirectRefer V2.0 — Shared Domain Types
// ============================================================================
// Mirrors backend OpenAPI spec. Single source of truth for frontend types.
// ============================================================================

// ── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'job_seeker' | 'professional' | 'recruiter' | 'admin'

export type ReferralStatus =
  | 'requested' | 'under_review' | 'accepted' | 'declined'
  | 'referral_submitted' | 'application_submitted' | 'closed' | 'expired'

export type TrustTier = 'verified' | 'provisional' | 'unverified'

export type ScreeningStatus =
  | 'not_started' | 'in_progress' | 'pending_review'
  | 'ready' | 'not_ready' | 'expired' | 'disqualified'

export type ApplicationStatus =
  | 'submitted' | 'screening' | 'shortlisted' | 'interview'
  | 'offered' | 'accepted' | 'rejected' | 'withdrawn'

export type MatchSource = 'algorithm' | 'manual' | 'self_request'

export type JobStatus = 'draft' | 'active' | 'paused' | 'closed'

export type CareerTrack = 'internship' | 'early_career' | 'experienced' | 'leadership'

// ── Embedded Types ───────────────────────────────────────────────────────────

export interface ExperienceEntry {
  title?: string
  company?: string
  duration?: string
  description?: string
}

export interface EducationEntry {
  degree?: string
  school?: string
  year?: number
  gpa?: string
}

// ── Core Entities ────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  slug?: string
  email_verified: boolean
  verified: boolean
  professional_verified: boolean
  recruiter_verified: boolean
  work_email_verified: boolean
  mobile?: string
  city?: string
  state?: string
  country?: string
  linkedin?: string
  avatar_url?: string
  banner_gradient?: string
  banner_theme?: string
  status: 'active' | 'suspended' | 'deactivated'
  terms_accepted_at?: string
  privacy_accepted_at?: string
  marketing_consent: boolean
  deleted_at?: string
  created_at: string
  updated_at: string
  last_login_at?: string
}

export interface ProfessionalProfile {
  user_id: string
  company_name?: string
  job_title?: string
  department?: string
  years_experience?: number
  bio?: string
  college?: string
  referral_capacity: number
  referrals_used: number
  capacity_reset_at: string
  referral_policy?: string
  open_for_referrals: boolean
  is_open_to_work: boolean
  show_on_find: boolean
  response_rate: number
  avg_reply_hours: number
  success_rate: number
  rating: number
  review_count: number
  github_url?: string
  work_email?: string
  avatar_color?: string
  profile_completeness: number
  deleted_at?: string
  created_at: string
  updated_at: string
  skills?: string[]
}

export interface JobSeekerProfile {
  user_id: string
  headline?: string
  bio?: string
  qualification?: string
  college?: string
  graduation_year?: number
  resume_url?: string
  resume_name?: string
  resume_text?: string
  experience_years?: number
  experience?: ExperienceEntry[]
  education?: EducationEntry[]
  preferred_role?: string
  preferred_location?: string
  preferred_companies?: string[]
  preferred_track: CareerTrack
  is_open_to_work: boolean
  screening_status: ScreeningStatus
  screening_score: number
  quality_tier?: string
  avatar_color?: string
  profile_completeness: number
  deleted_at?: string
  created_at: string
  updated_at: string
  skills?: string[]
}

export interface RecruiterProfile {
  user_id: string
  company_id?: string
  job_title?: string
  hiring_department?: string
  work_email?: string
  company_name?: string
  company_size?: string
  company_website?: string
  company_description?: string
  benefits?: string[]
  office_locations?: string[]
  deleted_at?: string
  created_at: string
  updated_at: string
}

// ── Trust & Matching ─────────────────────────────────────────────────────────

export interface TrustScore {
  user_id: string
  score: number
  tier: TrustTier
  response_reliability: number
  acceptance_rate: number
  referral_quality: number
  profile_quality: number
  calculated_at: string
  version: number
}

export interface Match {
  id: string
  candidate_id: string
  professional_id?: string
  job_id?: string
  score: number
  confidence?: string
  source: MatchSource
  explanation: Record<string, unknown>
  created_at: string
}

// ── Screening ────────────────────────────────────────────────────────────────

export interface ScreeningCriteria {
  id: string
  job_id?: string
  professional_id?: string
  criterion_type: string
  criterion_key: string
  criterion_value: Record<string, unknown>
  weight: number
  is_active: boolean
}

export interface ScreeningAttempt {
  id: string
  candidate_id: string
  job_id?: string
  criteria_id?: string
  status: ScreeningStatus
  score?: number
  result?: Record<string, unknown>
  evaluated_at?: string
  expires_at?: string
}

// ── Applications ─────────────────────────────────────────────────────────────

export interface Application {
  id: string
  candidate_id: string
  job_id: string
  match_id?: string
  status: ApplicationStatus
  resume_snapshot?: string
  cover_letter?: string
  answers?: Record<string, string>
  submitted_at: string
  updated_at: string
}

// ── Skills ───────────────────────────────────────────────────────────────────

export interface Skill {
  id: string
  name: string
  category: string
  slug: string
  popularity: number
}

export interface ProfileSkill {
  profile_type: 'professional' | 'job_seeker'
  profile_id: string
  skill_id: string
  proficiency?: string
  years_used?: number
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  user_id: string
  referral_updates: boolean
  new_messages: boolean
  profile_views: boolean
  completion_reminders: boolean
  marketing: boolean
}

// ── State History ────────────────────────────────────────────────────────────

export interface StateHistoryEntry {
  id: string
  entity_type: string
  entity_id: string
  from_state: string | null
  to_state: string
  triggered_by?: string
  metadata: Record<string, unknown>
  created_at: string
}
