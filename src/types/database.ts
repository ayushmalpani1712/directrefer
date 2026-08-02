// ============================================================================
// Direct Refer — Database Types (generated from schema.sql)
// ============================================================================
// Use with Supabase client: supabase.from('users').select('*')
// ============================================================================

export type UserRole = 'job_seeker' | 'professional' | 'recruiter' | 'admin'
export type AccountStatus = 'active' | 'suspended' | 'deactivated' | 'pending_deletion'
export type ReferralStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export type JobStage = 'active' | 'paused' | 'draft' | 'closed'
export type NotificationType =
  | 'referral_request'
  | 'referral_accepted'
  | 'referral_rejected'
  | 'message'
  | 'job_match'
  | 'system'
  | 'reminder'
export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed'
export type RecruiterType = 'internal' | 'agency' | 'freelance'

// ── Core Tables ────────────────────────────────────────────────

export interface DbUser {
  id: string
  full_name: string
  email: string
  mobile: string | null
  role: UserRole
  avatar_url: string | null
  city: string | null
  state: string | null
  country: string | null
  linkedin: string | null
  status: AccountStatus
  verified: boolean
  email_verified: boolean
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface DbProfileJobSeeker {
  user_id: string
  resume_url: string | null
  resume_name: string | null
  resume_size_bytes: number | null
  resume_uploaded_at: string | null
  qualification: string | null
  college: string | null
  graduation_year: number | null
  preferred_role: string | null
  preferred_location: string | null
  skills: string[]
  experience_years: number
  portfolio_url: string | null
  github_url: string | null
  website: string | null
  headline: string | null
  open_to_work: boolean
  certifications: string[]
  achievements: string[]
  projects: string[]
  preferred_companies: string[]
}

export interface DbProfileProfessional {
  user_id: string
  company_name: string
  job_title: string
  department: string | null
  work_email: string | null
  years_experience: number
  open_for_referrals: boolean
  open_positions: string[]
  referral_capacity: number
  referrals_used: number
  referral_policy: string | null
  bio: string | null
  skills: string[]
  response_rate: number
  avg_reply_hours: number
  success_rate: number
  rating: number
  review_count: number
  github_url: string | null
}

export interface DbProfileRecruiter {
  user_id: string
  company_name: string
  job_title: string
  hiring_department: string | null
  work_email: string | null
  recruiter_type: RecruiterType
  hiring_status: string
  company_size: string | null
  company_website: string | null
  company_description: string | null
}

export interface DbReferral {
  id: string
  requester_id: string
  professional_id: string
  job_title: string
  status: ReferralStatus
  note: string | null
  pipeline_stage: string
  progress: number
  created_at: string
  updated_at: string
}

export interface DbJob {
  id: string
  recruiter_id: string
  title: string
  department: string | null
  location: string | null
  type: string
  salary_range: string | null
  experience_level: string | null
  description: string | null
  applicants: number
  referrals: number
  stage: JobStage
  posted_at: string
  updated_at: string
}

export interface DbJobPipeline {
  id: string
  job_id: string
  stage: string
  count: number
}

export interface DbNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  description: string | null
  read: boolean
  created_at: string
}

export interface DbBookmark {
  user_id: string
  professional_id: string
  created_at: string
}

export interface DbConversation {
  id: string
  user_a_id: string
  user_b_id: string
  created_at: string
  updated_at: string
}

export interface DbMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  kind: 'text' | 'file'
  read: boolean
  created_at: string
}

export interface DbReport {
  id: string
  reporter_id: string
  target_id: string
  reason: string
  description: string | null
  status: ReportStatus
  created_at: string
  resolved_at: string | null
}

export interface DbReview {
  id: string
  reviewer_id: string
  professional_id: string
  rating: number
  text: string | null
  created_at: string
}

// ── Additional Tables ────────────────────────────────────────

export interface DbEmailVerificationToken {
  id: string
  user_id: string
  token: string
  expires_at: string
}

export interface DbNotificationPreference {
  id: string
  user_id: string
  referral_updates: boolean
  new_messages: boolean
  profile_views: boolean
  completion_reminders: boolean
  product_announcements: boolean
  weekly_digest: boolean
  email_opt_out: boolean
  updated_at: string
}

export interface DbUserPresence {
  user_id: string
  online: boolean
  last_seen: string
}

export interface DbActivityLog {
  id: string
  user_id: string
  actor_id: string
  action: string
  entity_type: string
  entity_id: string | undefined
  metadata: Record<string, unknown>
  created_at: string
}

export interface DbSavedCandidate {
  id: string
  recruiter_id: string
  candidate_id: string
}

export interface DbAvailability {
  id: string
  user_id: string
  available_days: string[]
  start_hour: number
  end_hour: number
  vacation_mode: boolean
}

export interface DbCandidatePipeline {
  id: string
  job_id: string
  candidate_id: string
  stage: string
}

// ── Lifecycle Tables ──────────────────────────────────────────

export interface DbLifecycleRetention {
  table_name: string
  category: 'permanent' | 'temporary' | 'analytics'
  retention_days: number | null
  description: string | null
  enabled: boolean
  updated_at: string
}

export interface DbLifecycleJob {
  id: string
  job_type: 'cleanup' | 'aggregate_daily' | 'aggregate_weekly' | 'aggregate_monthly' | 'archive'
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at: string | null
  rows_affected: number
  error_message: string | null
  details: Record<string, unknown> | null
}

export interface DbLifecycleSnapshot {
  id: string
  snapshot_date: string
  total_users: number
  total_referrals: number
  total_messages: number
  total_notifications: number
  total_jobs: number
  computed_at: string
}

// ── Joined Types (for queries) ─────────────────────────────────

export type DbUserWithJobSeeker = DbUser & {
  profiles_job_seeker: DbProfileJobSeeker | null
}

export type DbUserWithProfessional = DbUser & {
  profiles_professional: DbProfileProfessional | null
}

export type DbUserWithRecruiter = DbUser & {
  profiles_recruiter: DbProfileRecruiter | null
}

export type DbReferralWithUsers = DbReferral & {
  requester: Pick<DbUser, 'id' | 'full_name' | 'avatar_url'>
  professional: Pick<DbUser, 'id' | 'full_name' | 'avatar_url'> & {
    profiles_professional: Pick<DbProfileProfessional, 'company_name' | 'job_title'> | null
  }
}

export type DbJobWithRecruiter = DbJob & {
  recruiter: Pick<DbUser, 'id' | 'full_name'> & {
    profiles_recruiter: Pick<DbProfileRecruiter, 'company_name'> | null
  }
  job_pipeline: DbJobPipeline[]
}

export type DbConversationWithUsers = DbConversation & {
  user_a: Pick<DbUser, 'id' | 'full_name' | 'avatar_url'>
  user_b: Pick<DbUser, 'id' | 'full_name' | 'avatar_url'>
  last_message?: DbMessage
  unread_count?: number
}

// ── Supabase Database Type (for typed client) ──────────────────

export interface Database {
  public: {
    Tables: {
      users: { Row: DbUser; Insert: Omit<DbUser, 'created_at' | 'updated_at'>; Update: Partial<Omit<DbUser, 'id'>> }
      profiles_job_seeker: { Row: DbProfileJobSeeker; Insert: Omit<DbProfileJobSeeker, never>; Update: Partial<DbProfileJobSeeker> }
      profiles_professional: { Row: DbProfileProfessional; Insert: Omit<DbProfileProfessional, never>; Update: Partial<DbProfileProfessional> }
      profiles_recruiter: { Row: DbProfileRecruiter; Insert: Omit<DbProfileRecruiter, never>; Update: Partial<DbProfileRecruiter> }
      referrals: { Row: DbReferral; Insert: Omit<DbReferral, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbReferral, 'id'>> }
      jobs: { Row: DbJob; Insert: Omit<DbJob, 'id' | 'posted_at' | 'updated_at'>; Update: Partial<Omit<DbJob, 'id'>> }
      job_pipeline: { Row: DbJobPipeline; Insert: Omit<DbJobPipeline, 'id'>; Update: Partial<Omit<DbJobPipeline, 'id'>> }
      notifications: { Row: DbNotification; Insert: Omit<DbNotification, 'id' | 'created_at'>; Update: Partial<Omit<DbNotification, 'id'>> }
      bookmarks: { Row: DbBookmark; Insert: DbBookmark; Update: never }
      conversations: { Row: DbConversation; Insert: Omit<DbConversation, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbConversation, 'id'>> }
      messages: { Row: DbMessage; Insert: Omit<DbMessage, 'id' | 'created_at'>; Update: Partial<Omit<DbMessage, 'id'>> }
      reports: { Row: DbReport; Insert: Omit<DbReport, 'id' | 'created_at'>; Update: Partial<Omit<DbReport, 'id'>> }
      reviews: { Row: DbReview; Insert: Omit<DbReview, 'id' | 'created_at'>; Update: never }
      lifecycle_retention: { Row: DbLifecycleRetention; Insert: Omit<DbLifecycleRetention, 'updated_at'>; Update: Partial<DbLifecycleRetention> }
      lifecycle_jobs: { Row: DbLifecycleJob; Insert: Omit<DbLifecycleJob, 'id' | 'started_at'>; Update: Partial<DbLifecycleJob> }
      lifecycle_snapshots: { Row: DbLifecycleSnapshot; Insert: Omit<DbLifecycleSnapshot, 'id' | 'computed_at'>; Update: Partial<DbLifecycleSnapshot> }
      email_verification_tokens: { Row: DbEmailVerificationToken; Insert: Omit<DbEmailVerificationToken, 'id'>; Update: Partial<DbEmailVerificationToken> }
      notification_preferences: { Row: DbNotificationPreference; Insert: Omit<DbNotificationPreference, 'id'>; Update: Partial<DbNotificationPreference> }
      user_presence: { Row: DbUserPresence; Insert: DbUserPresence; Update: Partial<DbUserPresence> }
      activity_logs: { Row: DbActivityLog; Insert: Omit<DbActivityLog, 'id' | 'created_at'>; Update: Partial<DbActivityLog> }
      saved_candidates: { Row: DbSavedCandidate; Insert: Omit<DbSavedCandidate, 'id'>; Update: Partial<DbSavedCandidate> }
      availability: { Row: DbAvailability; Insert: Omit<DbAvailability, 'id'>; Update: Partial<DbAvailability> }
      candidate_pipelines: { Row: DbCandidatePipeline; Insert: Omit<DbCandidatePipeline, 'id'>; Update: Partial<DbCandidatePipeline> }
    }
    Views: Record<string, never>
    Functions: {
      create_report: {
        Args: { p_target_id: string; p_reason: string; p_description?: string }
        Returns: string
      }
      update_report_status: {
        Args: { p_report_id: string; p_status: string }
        Returns: void
      }
      lifecycle_run_pipeline: {
        Args: Record<string, never>
        Returns: Array<{ step: string; status: string; detail: string }>
      }
      lifecycle_cleanup_expired: {
        Args: Record<string, never>
        Returns: Array<{ table_name: string; rows_deleted: number }>
      }
    }
    Enums: {
      user_role: UserRole
      account_status: AccountStatus
      referral_status: ReferralStatus
      job_stage: JobStage
      notification_type: NotificationType
      report_status: ReportStatus
      recruiter_type: RecruiterType
    }
  }
}
