import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import {
  GRADIENTS,
  type Professional,
  type ReferralRequest,
  type ReferralStatus,
  type PipelineStage,
  type Role,
  type Conversation,
  type Message,
  type AppNotification,
  type Job,
  PIPELINE_STAGES,
  getRoleFromPath,
} from '@/data/mock'
import { supabase, advanceReferralPipeline as dbAdvancePipeline } from '@/lib/supabase'
import { sendReferralStatusEmail, sendReminderEmail } from '@/lib/email'
import { notifyNewMessage, notifyReferralUpdate, requestNotificationPermission } from '@/lib/notifications'
import { setWorkspaceCookie, getWorkspaceCookie, clearWorkspaceCookie } from '@/lib/utils'
import { logClientError } from '@/lib/db'

async function loadDb() {
  return await import('@/lib/db')
}

const RATE_LIMIT = 5
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000

function mapNotificationType(dbType: string): AppNotification['type'] {
  switch (dbType) {
    case 'referral_accepted': return 'accepted'
    case 'referral_rejected': return 'rejected'
    case 'referral_declined': return 'declined'
    case 'referral_submitted': return 'referral_submitted'
    case 'application_submitted': return 'application_submitted'
    case 'referral_closed': return 'closed'
    case 'referral_request': return 'reminder'
    case 'message': return 'message'
    case 'job_match': return 'system'
    case 'reminder': return 'reminder'
    case 'system': return 'system'
    default: return 'system'
  }
}

export interface StudentProfile {
  name: string
  headline: string
  location: string
  email: string
  openToWork: boolean
  profileCompletion: number
  verified: boolean
  gradient: string
  bannerTheme?: string | null
  skills: string[]
  preferredRoles: string[]
  preferredCompanies: string[]
  expectedSalary: string
  careerInterests: string[]
  languages: string[]
  experience: { title: string; org: string; period: string; desc: string }[]
  education: { school: string; degree: string; period: string; detail: string }[]
  projects: { name: string; desc: string; tags: string[] }[]
  certifications: string[]
  achievements: string[]
  links: { linkedin: string; github: string; website: string }
  resumeFile?: { name: string; size: string; date: string; url?: string }
  noticePeriod?: string
  workPreference?: string
  whyFit?: string
}

export interface Candidate {
  id: string
  slug?: string
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
}

interface AppState {
  role: Role
  setRole: (r: Role) => void
  roleLoaded: boolean
  isAdmin: boolean
  authed: boolean
  loading: boolean
  logout: () => void

  professionals: Professional[]
  updateProfessional: (id: string, patch: Partial<Professional>) => void
  updateRecruiter: (patch: Record<string, unknown>) => void

  student: StudentProfile
  updateStudent: (patch: Partial<StudentProfile>) => void
  addStudentCertification: (cert: string) => void
  removeStudentCertification: (cert: string) => void
  addStudentAchievement: (ach: string) => void
  removeStudentAchievement: (ach: string) => void
  addStudentProject: (proj: { name: string; desc: string; tags: string[] }) => void
  removeStudentProject: (name: string) => void
  addStudentSkill: (skill: string) => void
  removeStudentSkill: (skill: string) => void
  addStudentExperience: (exp: { title: string; org: string; period: string; desc: string }) => void
  removeStudentExperience: (index: number) => void
  addStudentEducation: (edu: { school: string; degree: string; period: string; detail: string }) => void
  removeStudentEducation: (index: number) => void
  setStudentResume: (file: { name: string; size: string; date: string; url?: string }) => void
  removeStudentResume: () => void

  bookmarks: string[]
  toggleBookmark: (id: string) => void
  savedCandidates: string[]
  toggleCandidate: (id: string) => void

  requests: ReferralRequest[]
  addRequest: (r: ReferralRequest) => void
  setRequestStatus: (id: string, status: ReferralRequest['status'], passReason?: string) => void
  advancePipelineStage: (id: string) => void
  submitReferral: (id: string) => void
  cancelReferral: (id: string) => void
  updateApplicationStatus: (id: string, status: 'application_submitted' | 'closed') => void
  referralsSentToday: number
  canSendReferral: boolean
  nextReferralReset: string

  conversations: Conversation[]
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>
  sendMessage: (conversationId: string, text: string, kind?: 'text' | 'file', fileUrl?: string, fileName?: string) => void
  markConversationRead: (id: string) => void
  startConversation: (targetUserId: string) => Promise<string | null>
  toggleStudentOpenToWork: (value: boolean) => Promise<boolean>
  toggleProfessionalOpenForReferrals: (value: boolean) => Promise<boolean>
  toggleProfessionalOpenToWork: (value: boolean) => Promise<boolean>

  notifications: AppNotification[]
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  unreadNotificationCount: number

  activity: { id: string; kind: string; text: string; time: string }[]

  jobs: Job[]
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>
  updateJob: (id: string, patch: Partial<Job>) => void

  candidates: { id: string; slug?: string; name: string; role: string; company: string; stage: string; rating: number; source: string; gradient: string; skills: string[]; location: string; exp: number; profileRole: string }[]
  refreshCandidates: () => Promise<void>

  myReferralCount: number
  myAcceptedCount: number
  myPendingCount: number
  myRejectedCount: number

  demoMode: boolean
  toggleDemoMode: () => void
  visibleProfessionals: Professional[]
  getUserOnlineStatus: (userId: string) => boolean

  npsOpen: boolean
  setNpsOpen: (open: boolean) => void
}

const Ctx = createContext<AppState | null>(null)

function readPersistedRole(): Role | null {
  const VALID_ROLES: Role[] = ['student', 'professional', 'recruiter', 'admin']
  try {
    const cookie = getWorkspaceCookie()
    if (cookie && (VALID_ROLES as string[]).includes(cookie)) return cookie as Role
  } catch { /* ignore */ }
  try {
    const stored = localStorage.getItem('dr_active_role')
    if (stored && (VALID_ROLES as string[]).includes(stored)) {
      setWorkspaceCookie(stored)
      return stored as Role
    }
  } catch { /* ignore */ }
  return null
}

function persistRole(r: Role) {
  try { localStorage.setItem('dr_active_role', r) } catch { /* ignore */ }
  setWorkspaceCookie(r)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [role, setRole] = useState<Role>(() => readPersistedRole() || 'student')
  const [isAdmin, setIsAdmin] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)
  const [npsOpen, setNpsOpen] = useState(false)
  const [roleLoaded, setRoleLoaded] = useState(false)
  const roleRef = useRef<Role>(role)
  useEffect(() => { roleRef.current = role }, [role])

  // Persist active workspace role so page refreshes land on the correct workspace.
  // Only persist AFTER roleLoaded to avoid writing the default 'student' to cookie
  // before loadRealData has a chance to resolve the correct role from URL/DB.
  useEffect(() => { if (roleLoaded) persistRole(role) }, [role, roleLoaded])

  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [student, setStudent] = useState<StudentProfile>({
    name: '',
    headline: '',
    location: '',
    email: '',
    openToWork: false,
    profileCompletion: 0,
    verified: false,
    gradient: GRADIENTS[0],
    skills: [],
    preferredRoles: [],
    preferredCompanies: [],
    expectedSalary: '',
    careerInterests: [],
    languages: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    achievements: [],
    links: { linkedin: '', github: '', website: '' },
  })
  const studentSnapshotRef = useRef<StudentProfile>(student)
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [savedCandidates, setSavedCandidates] = useState<string[]>([])
  const [requests, setRequests] = useState<ReferralRequest[]>([])
  const [requestTimestamps, setRequestTimestamps] = useState<number[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<{ id: string; slug?: string; name: string; role: string; company: string; stage: string; rating: number; source: string; gradient: string; skills: string[]; location: string; exp: number; profileRole: string }[]>([])

  const refreshCandidates = useCallback(async () => {
    if (!user) return
    try {
      const { fetchCandidates } = await loadDb()
      const cands = await fetchCandidates(user.id)
      setCandidates(cands)
    } catch { /* ignore */ }
  }, [user])

  // ── Load real data from Supabase when user is authenticated ──
  useEffect(() => {
    if (!user) {
      // User signed out — clear all state to prevent stale data bleed
      setConversations([])
      setProfessionals([])
      setRequests([])
      setRequestTimestamps([])
      setBookmarks([])
      setNotifications([])
      setJobs([])
      setCandidates([])
      setSavedCandidates([])
      setRole('student')
      setIsAdmin(false)
      setAuthed(false)
      setRoleLoaded(false)
      return
    }
    const currentUser = user

    // Clear all mutable state immediately on user change to prevent
    // stale data from a previous account bleeding into the new session.
    setConversations([])
    setProfessionals([])
    setRequests([])
    setRequestTimestamps([])
    setBookmarks([])
    setNotifications([])
    setJobs([])
    setCandidates([])
    setSavedCandidates([])

    async function loadRealData() {
      const userId = currentUser.id
      const meta = currentUser.user_metadata
      const [dbModule, userRowResult] = await Promise.all([
        loadDb(),
        supabase
          .from('users')
          .select('role, full_name, city, state, country, active_workspace, banner_theme')
          .eq('id', userId)
          .single(),
      ])
      const { fetchProfessionals, fetchReferrals, fetchConversations, fetchCandidates, fetchBookmarks, fetchNotifications, fetchJobs } = dbModule

      // Read role from users table (single query, no redundant getUser — session already valid)
      let userRole = 'job_seeker'
      const { data: userRow } = userRowResult
      if (userRow?.role) {
        userRole = userRow.role
      } else {
        userRole = (meta?.role as string) || 'job_seeker'
      }
      const mappedRole: Role = userRole === 'job_seeker' ? 'student' : (userRole as Role)

      // Resolve active workspace role.
      // Priority: DB active_workspace (authoritative) > cookie/localStorage > URL path > DB registration role
      const DB_WORKSPACE_ROLES: Role[] = ['student', 'professional', 'recruiter', 'admin']
      const dbActiveWorkspace = (userRow?.active_workspace as string) || null
      const isValidDbWorkspace = dbActiveWorkspace && (DB_WORKSPACE_ROLES as string[]).includes(dbActiveWorkspace)

      if (!roleLoaded) {
        if (isValidDbWorkspace) {
          // DB has a valid active workspace — use it (authoritative, works across devices)
          const dbRole = dbActiveWorkspace as Role
          setRole(dbRole)
          persistRole(dbRole)
        } else {
          // No DB workspace yet — fall back to cookie/localStorage, then URL, then DB registration role
          const persisted = readPersistedRole()
          if (persisted) {
            setRole(persisted)
          } else {
            const urlRole = getRoleFromPath(window.location.pathname)
            if (urlRole !== 'student') {
              setRole(urlRole)
              persistRole(urlRole)
            } else {
              setRole(mappedRole)
              persistRole(mappedRole)
            }
          }
          // Write back to DB so other devices get the correct workspace
          const roleToWrite = readPersistedRole() || dbActiveWorkspace as Role || mappedRole
          supabase.from('users').update({ active_workspace: roleToWrite }).eq('id', userId).then(
            () => {},
            () => {}
          )
        }
        setIsAdmin(userRole === 'admin')
        setRoleLoaded(true)
      }
      setAuthed(true)

      // Read name and location (inlined to avoid blocking data fetch)
      const rawName = userRow?.full_name || meta?.full_name || meta?.name || currentUser.email?.split('@')[0] || 'User'
      const displayName = rawName.trim() || currentUser.email?.split('@')[0] || 'User'
      const locationParts = [userRow?.city, userRow?.state].filter(Boolean).join(', ')
      setStudent((prev) => ({
        ...prev,
        name: displayName,
        email: currentUser.email || prev.email,
        location: locationParts || prev.location,
        bannerTheme: userRow?.banner_theme ?? prev.bannerTheme,
      }))

      // All critical data in parallel — profile included based on role
      const profilePromise = (mappedRole === 'student' || mappedRole === 'admin')
        ? (async () => {
            await supabase
              .from('profiles_job_seeker')
              .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
            const { candidateFieldsSupported } = await loadDb()
            const baseSelect = 'headline, is_open_to_work, certifications, achievements, projects, preferred_companies, preferred_role, skills, portfolio_url, github_url, website, experience, education, languages, resume_url, resume_name, resume_size_bytes, resume_uploaded_at, avatar_color'
            const extraSelect = await candidateFieldsSupported()
              ? ', notice_period, work_preference, why_me'
              : ''
            const { data } = (await supabase
              .from('profiles_job_seeker')
              .select(baseSelect + extraSelect)
              .eq('user_id', userId)
              .single()) as { data: Record<string, unknown> | null; error: unknown }
            return data
          })()
        : mappedRole === 'professional'
          ? (async () => {
              await supabase
                .from('profiles_professional')
                .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
              return null
            })()
          : mappedRole === 'recruiter'
            ? (async () => {
                await supabase
                  .from('profiles_recruiter')
                  .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
                return null
              })()
            : Promise.resolve(null)

      const [profs, refs, convs, cands, profileData] = await Promise.allSettled([
        fetchProfessionals(userId),
        fetchReferrals(userId),
        fetchConversations(userId, mappedRole),
        fetchCandidates(userId),
        profilePromise,
      ])

      if (profs.status === 'fulfilled' && profs.value.length > 0) setProfessionals(profs.value)

      // Ensure the current professional user is always in the array.
      // fetchProfessionals runs in parallel with the profile upsert, so the user's
      // row may not exist yet when the query executes.
      if (mappedRole === 'professional') {
        setProfessionals((prev) => {
          if (prev.some((p) => p.id === userId)) return prev
          return [...prev, {
            id: userId,
            name: displayName,
            designation: '', company: '', industry: '', location: locationParts || '',
            yearsExp: 0, skills: [], responseRate: 0, avgReplyHours: 0,
            referralsCompleted: 0, rating: 0, reviews: 0, verified: false,
            openForReferrals: false, isOpenToWork: false, maxPerMonth: 5,
            usedThisMonth: 0, successRate: 0, followers: 0, joinedDaysAgo: 0,
            activityScore: 0, referralPolicy: '', openPositions: [], bio: '',
            badges: [], gradient: GRADIENTS[0], phone: '', whatsapp: '',
            email: currentUser.email ?? '', hiringTimeline: [],
            referralDuration: '', linkedinUrl: '', githubUrl: '',
          }]
        })
      }
      if (refs.status === 'fulfilled') {
        setRequests(refs.value)
        // Seed requestTimestamps from DB-loaded referrals so referralsSentToday
        // reflects real data across page refreshes (not just current session).
        const now = Date.now()
        setRequestTimestamps(
          refs.value
            .filter((r) => r.requesterId === currentUser.id && r.createdAt && now - new Date(r.createdAt).getTime() < RATE_WINDOW_MS)
            .map((r) => new Date(r.createdAt!).getTime())
        )
      }
      if (convs.status === 'fulfilled') setConversations(convs.value)
      if (cands.status === 'fulfilled' && cands.value.length > 0) setCandidates(cands.value)

      // Non-critical — load after first paint (deferred)
      Promise.allSettled([
        fetchBookmarks(userId),
        fetchNotifications(userId),
        fetchJobs(),
      ]).then(([bms, notifs, jbs]) => {
        if (bms.status === 'fulfilled') setBookmarks(bms.value)
        if (notifs.status === 'fulfilled' && notifs.value.length > 0) setNotifications(notifs.value)
        if (jbs.status === 'fulfilled' && jbs.value.length > 0) setJobs(jbs.value)
      })

      // Apply student profile data if available
      if (profileData.status === 'fulfilled' && profileData.value) {
        const pd = profileData.value as {
          headline?: string
          is_open_to_work?: boolean
          certifications?: unknown
          achievements?: unknown
          projects?: unknown
          preferred_companies?: string[]
          preferred_role?: string
          skills?: string[]
          portfolio_url?: string
          github_url?: string
          website?: string
          experience?: unknown
          education?: unknown
          languages?: unknown
          resume_url?: string
          resume_name?: string
          resume_size_bytes?: number
          resume_uploaded_at?: string
          notice_period?: string
          work_preference?: string
          why_me?: string
          avatar_color?: string
        }
        setStudent((prev) => ({
          ...prev,
          headline: pd.headline ?? prev.headline,
          openToWork: pd.is_open_to_work ?? prev.openToWork,
          gradient: pd.avatar_color || prev.gradient,
          certifications: typeof pd.certifications === 'string' ? (() => { try { return JSON.parse(pd.certifications) } catch { return prev.certifications } })() : (pd.certifications ?? prev.certifications),
          achievements: typeof pd.achievements === 'string' ? (() => { try { return JSON.parse(pd.achievements) } catch { return prev.achievements } })() : (pd.achievements ?? prev.achievements),
          projects: typeof pd.projects === 'string' ? (() => { try { return JSON.parse(pd.projects) } catch { return prev.projects } })() : (pd.projects ?? prev.projects),
          preferredCompanies: pd.preferred_companies ?? prev.preferredCompanies,
          preferredRoles: pd.preferred_role ? pd.preferred_role.split(',').map((s: string) => s.trim()).filter(Boolean) : prev.preferredRoles,
          skills: pd.skills ?? prev.skills,
          noticePeriod: pd.notice_period ?? prev.noticePeriod,
          workPreference: pd.work_preference ?? prev.workPreference,
          whyFit: pd.why_me ?? prev.whyFit,
          links: {
            linkedin: pd.portfolio_url ?? prev.links.linkedin,
            github: pd.github_url ?? prev.links.github,
            website: pd.website ?? prev.links.website,
          },
          ...(pd.experience ? { experience: typeof pd.experience === 'string' ? (() => { try { return JSON.parse(pd.experience) } catch { return prev.experience } })() : pd.experience } : {}),
          ...(pd.education ? { education: typeof pd.education === 'string' ? (() => { try { return JSON.parse(pd.education) } catch { return prev.education } })() : pd.education } : {}),
          ...(pd.languages ? { languages: typeof pd.languages === 'string' ? (() => { try { return JSON.parse(pd.languages) } catch { return prev.languages } })() : pd.languages } : {}),
          ...(pd.resume_url ? {
            resumeFile: {
              name: pd.resume_name || 'Resume',
              size: pd.resume_size_bytes
                ? pd.resume_size_bytes > 1048576
                  ? `${(pd.resume_size_bytes / 1048576).toFixed(1)} MB`
                  : `${Math.round(pd.resume_size_bytes / 1024)} KB`
                : 'Unknown',
              date: pd.resume_uploaded_at
                ? new Date(pd.resume_uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '',
              url: pd.resume_url,
            },
          } : { resumeFile: undefined }),
        }))
      }
    }

    loadRealData()
      .catch((err) => { console.error('loadRealData failed:', err); logClientError(`loadRealData failed: ${err}`, 'app-context', 'error'); toast.error('Failed to load some data. Please refresh the page.') })
      .finally(() => setLoading(false))
    // Request browser notification permission (non-blocking)
    requestNotificationPermission()

    // ── Real-time: notifications ──
    const notifChannel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        async (payload) => {
          const { formatRelativeTime } = await loadDb()
          const row = payload.new as { id: string; type: string; title: string; description: string | null; read: boolean; created_at: string }
          setNotifications((prev) => [
            {
              id: row.id,
              type: mapNotificationType(row.type),
              title: row.title,
              description: row.description ?? '',
              time: formatRelativeTime(row.created_at),
              read: row.read,
            },
            ...prev,
          ])
        }
      )
      .subscribe()

    // ── Real-time: new conversations / messages ──
    const msgChannel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=neq.${currentUser.id}` },
        async (payload) => {
          const { formatRelativeTime, fetchConversations } = await loadDb()
          const msg = payload.new as { id: string; conversation_id?: string; sender_id?: string; content?: string; created_at: string; kind?: string }
          if (!msg.conversation_id || !msg.sender_id) return

          const newMessage: Message = {
            id: msg.id,
            from: 'them',
            text: msg.content ?? '',
            time: formatRelativeTime(msg.created_at),
            is_read: false,
            kind: (msg.kind === 'file' ? 'file' : 'text') as 'text' | 'file',
          }

          setConversations((prev) => {
            const existing = prev.find((c) => c.id === msg.conversation_id)
            if (existing) {
              // Conversation exists — append message
              return prev.map((c) =>
                c.id === msg.conversation_id
                  ? {
                      ...c,
                      lastMessage: msg.content ?? c.lastMessage,
                      time: formatRelativeTime(msg.created_at),
                      unread: c.unread + 1,
                      messages: [...c.messages, newMessage],
                    }
                  : c
              )
            }
            // Conversation not in state yet — fetch it and prepend
            fetchConversations(currentUser.id, roleRef.current).then((convs) => setConversations(convs)).catch(() => {})
            return prev
          })

          if (msg.content) {
            // Resolve sender name from conversations state
            const convName = currentConvsRef.current.find((c) => c.id === msg.conversation_id)?.name
            notifyNewMessage(convName || 'Someone', msg.content)
          }
        }
      )
      .subscribe()

    // ── Real-time: referral status changes ──
    const refChannel = supabase
      .channel('realtime-referrals')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'referrals', filter: `requester_id=eq.${currentUser.id}` },
        async (payload) => {
          const { fetchReferrals } = await loadDb()
          const ref = payload.new as { status?: string; requester_id?: string; job_title?: string }
          fetchReferrals(currentUser.id).then((refs) => setRequests(refs)).catch((err) => { console.error('Failed to refresh referrals:', err); logClientError(`Real-time referral refresh failed: ${err}`, 'realtime', 'warning'); toast.error('Failed to refresh referrals') })
          // Show browser notification on status change
          if (ref.status && ref.status !== 'pending' && ref.job_title) {
            notifyReferralUpdate('A candidate', ref.status, ref.job_title)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(refChannel)
    }
  }, [user?.id])

  // Re-fetch conversations when workspace role changes
  useEffect(() => {
    if (!user || !roleLoaded) return
    ;(async () => {
      const { fetchConversations } = await loadDb()
      fetchConversations(user.id, role).then((convs) => setConversations(convs)).catch(() => {})
    })()
  }, [user, role, roleLoaded])

  const referralsSentToday = useMemo(() => {
    const now = Date.now()
    return requestTimestamps.filter((t) => now - t < RATE_WINDOW_MS).length
  }, [requestTimestamps])

  const canSendReferral = referralsSentToday < RATE_LIMIT

  const nextReferralReset = useMemo(() => {
    if (requestTimestamps.length === 0) return 'Now'
    const recent = requestTimestamps.filter((t) => Date.now() - t < RATE_WINDOW_MS)
    if (recent.length === 0) return 'Now'
    const oldest = Math.min(...recent)
    const resetAt = new Date(oldest + RATE_WINDOW_MS)
    const diff = resetAt.getTime() - Date.now()
    if (diff <= 0) return 'Now'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }, [requestTimestamps])

  const updateProfessional = useCallback(async (id: string, patch: Partial<Professional>) => {
    const { updateUserProfile, updateProfessionalProfile } = await loadDb()
    // Snapshot previous state for rollback
    const prevProfessionals = professionals
    setProfessionals((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx >= 0) {
        return prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      }
      return [...prev, {
        id,
        name: patch.name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '',
        designation: patch.designation ?? '',
        company: patch.company ?? '',
        industry: patch.industry ?? '',
        location: patch.location ?? '',
        yearsExp: patch.yearsExp ?? 0,
        skills: patch.skills ?? [],
        responseRate: 0,
        avgReplyHours: 0,
        referralsCompleted: 0,
        rating: 0,
        reviews: 0,
        verified: false,
        openForReferrals: patch.openForReferrals ?? false,
        isOpenToWork: patch.isOpenToWork ?? false,
        maxPerMonth: patch.maxPerMonth ?? 5,
        usedThisMonth: 0,
        successRate: 0,
        followers: 0,
        joinedDaysAgo: 0,
        activityScore: 0,
        referralPolicy: patch.referralPolicy ?? '',
        openPositions: patch.openPositions ?? [],
        bio: patch.bio ?? '',
        badges: [],
        gradient: 'from-[#6366F1] to-[#8B5CF6]',
        phone: '',
        whatsapp: '',
        email: user?.email ?? '',
        hiringTimeline: [],
        referralDuration: '',
        linkedinUrl: patch.linkedinUrl ?? '',
        githubUrl: patch.githubUrl ?? '',
        college: patch.college ?? undefined,
      }]
    })
    if (user) {
      const userPatch: Record<string, unknown> = {}
      if (patch.name) userPatch.full_name = patch.name
      if (patch.location) {
        const parts = patch.location.split(',').map((s: string) => s.trim())
        if (parts.length >= 2) { userPatch.city = parts[0]; userPatch.state = parts[1] }
      }
      if (patch.linkedinUrl !== undefined) userPatch.linkedin = patch.linkedinUrl
      if (Object.keys(userPatch).length > 0) updateUserProfile(id, userPatch).catch((err) => {
        console.error('Failed to update user profile:', err)
        setProfessionals(prevProfessionals) // Rollback
        toast.error('Failed to save changes. Please try again.')
      })

      const profilePatch: Record<string, unknown> = {}
      if (patch.company) profilePatch.company_name = patch.company
      if (patch.designation) profilePatch.job_title = patch.designation
      if (patch.industry) profilePatch.department = patch.industry
      if (patch.yearsExp !== undefined) profilePatch.years_experience = patch.yearsExp
      if (patch.openForReferrals !== undefined) profilePatch.open_for_referrals = patch.openForReferrals
      if (patch.isOpenToWork !== undefined) profilePatch.is_open_to_work = patch.isOpenToWork
      if (patch.maxPerMonth !== undefined) profilePatch.referral_capacity = patch.maxPerMonth
      if (patch.referralPolicy !== undefined) profilePatch.referral_policy = patch.referralPolicy
      if (patch.bio !== undefined) profilePatch.bio = patch.bio
      if (patch.skills) profilePatch.skills = patch.skills
      if (patch.openPositions) profilePatch.open_positions = JSON.stringify(patch.openPositions)
      if (patch.githubUrl !== undefined) profilePatch.github_url = patch.githubUrl
      if (patch.college !== undefined) profilePatch.college = patch.college
      if (patch.gradient !== undefined) profilePatch.avatar_color = patch.gradient
      if (Object.keys(profilePatch).length > 0) {
        updateProfessionalProfile(id, profilePatch).catch((err) => {
          console.error('Failed to update professional profile:', err)
          setProfessionals(prevProfessionals) // Rollback
          toast.error('Failed to save changes. Please try again.')
        })
      }
    }
  }, [user, professionals])

  const updateRecruiter = useCallback(async (patch: Record<string, unknown>) => {
    const { updateRecruiterProfile } = await loadDb()
    if (user) {
      try {
        await updateRecruiterProfile(user.id, patch)
      } catch (err) {
        console.error('Failed to update recruiter profile:', err)
        toast.error('Something went wrong. Please try again.')
        throw err
      }
    }
  }, [user])

  const updateStudent = useCallback(async (patch: Partial<StudentProfile>) => {
    const { updateUserProfile, updateJobSeekerProfile } = await loadDb()
    // Snapshot previous state for rollback
    const prev = studentSnapshotRef.current
    setStudent((s) => {
      const next = { ...s, ...patch }
      studentSnapshotRef.current = next
      return next
    })
    if (user) {
      const userPatch: Record<string, unknown> = {}
      if (patch.name !== undefined) userPatch.full_name = patch.name
      if (patch.bannerTheme !== undefined) userPatch.banner_theme = patch.bannerTheme
      if (patch.location !== undefined) {
        const parts = patch.location.split(',').map((s: string) => s.trim())
        if (parts.length >= 2) { userPatch.city = parts[0]; userPatch.state = parts[1] }
        else if (parts.length === 1) { userPatch.city = parts[0] }
      }
      if (Object.keys(userPatch).length > 0) updateUserProfile(user.id, userPatch).catch((err) => {
        console.error('Failed to update student profile:', err)
        setStudent(prev)
        studentSnapshotRef.current = prev
        toast.error('Failed to save changes. Please try again.')
      })

      const profilePatch: Record<string, unknown> = {}
      if (patch.skills !== undefined) profilePatch.skills = patch.skills
      if (patch.preferredRoles !== undefined) profilePatch.preferred_role = patch.preferredRoles.join(', ')
      if (patch.preferredCompanies !== undefined) profilePatch.preferred_companies = patch.preferredCompanies
      if (patch.experience !== undefined) {
        profilePatch.experience_years = patch.experience.length
        profilePatch.experience = JSON.stringify(patch.experience)
      }
      if (patch.education !== undefined) {
        profilePatch.education = JSON.stringify(patch.education)
        if (patch.education?.[0]?.school) profilePatch.college = patch.education[0].school
        if (patch.education?.[0]?.degree) profilePatch.qualification = patch.education[0].degree
        if (patch.education?.[0]?.period) {
          const year = parseInt(patch.education[0].period)
          if (!isNaN(year)) profilePatch.graduation_year = year
        }
      }
      if (patch.languages !== undefined) profilePatch.languages = JSON.stringify(patch.languages)
      if (patch.links?.linkedin) profilePatch.portfolio_url = patch.links.linkedin
      if (patch.links?.github) profilePatch.github_url = patch.links.github
      if (patch.headline !== undefined) profilePatch.headline = patch.headline
      if (patch.openToWork !== undefined) profilePatch.is_open_to_work = patch.openToWork
      if (patch.certifications !== undefined) profilePatch.certifications = JSON.stringify(patch.certifications)
      if (patch.achievements !== undefined) profilePatch.achievements = JSON.stringify(patch.achievements)
      if (patch.projects !== undefined) profilePatch.projects = JSON.stringify(patch.projects)
      if (patch.gradient !== undefined) profilePatch.avatar_color = patch.gradient
      const profilePatchBase = { ...profilePatch } as Record<string, unknown>
      if (Object.keys(profilePatch).length > 0) updateJobSeekerProfile(user.id, profilePatchBase).catch((err) => {
        console.error('Failed to update job seeker profile:', err)
        setStudent(prev)
        studentSnapshotRef.current = prev
        toast.error('Failed to save changes. Please try again.')
      })

      // Phase 2 candidate fields — best-effort so older DBs (migration not applied yet)
      // don't break the rest of the profile save.
      if (patch.noticePeriod !== undefined || patch.workPreference !== undefined || patch.whyFit !== undefined) {
        const { candidateFieldsSupported } = await loadDb()
        const supported = await candidateFieldsSupported()
        if (supported) {
          const extra: Record<string, unknown> = {}
          if (patch.noticePeriod !== undefined) extra.notice_period = patch.noticePeriod
          if (patch.workPreference !== undefined) extra.work_preference = patch.workPreference
          if (patch.whyFit !== undefined) extra.why_me = patch.whyFit
          updateJobSeekerProfile(user.id, extra).catch((err) => {
            console.error('Failed to save candidate fields:', err)
          })
        }
      }
    }
  }, [user, student])

  const addStudentCertification = useCallback(async (cert: string) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, certifications: [...p.certifications, cert] }
      studentSnapshotRef.current = next
      return next
    })
    if (user) updateJobSeekerProfile(user.id, { certifications: JSON.stringify([...student.certifications, cert]) }).catch((err) => { console.error('Failed to save certification:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
  }, [user, student.certifications])

  const addStudentAchievement = useCallback(async (ach: string) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, achievements: [...p.achievements, ach] }
      studentSnapshotRef.current = next
      return next
    })
    if (user) updateJobSeekerProfile(user.id, { achievements: JSON.stringify([...student.achievements, ach]) }).catch((err) => { console.error('Failed to save achievement:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
  }, [user, student.achievements])

  const addStudentProject = useCallback(async (proj: { name: string; desc: string; tags: string[] }) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, projects: [...p.projects, proj] }
      studentSnapshotRef.current = next
      return next
    })
    if (user) updateJobSeekerProfile(user.id, { projects: JSON.stringify([...student.projects, proj]) }).catch((err) => { console.error('Failed to save project:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
  }, [user, student.projects])

  const addStudentSkill = useCallback(async (skill: string) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, skills: [...p.skills, skill] }
      studentSnapshotRef.current = next
      return next
    })
    if (user) updateJobSeekerProfile(user.id, { skills: [...student.skills, skill] }).catch((err) => { console.error('Failed to save skill:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
  }, [user, student.skills])

  const removeStudentSkill = useCallback(async (skill: string) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, skills: p.skills.filter((s) => s !== skill) }
      studentSnapshotRef.current = next
      return next
    })
    if (user) updateJobSeekerProfile(user.id, { skills: student.skills.filter((s) => s !== skill) }).catch((err) => { console.error('Failed to remove skill:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
  }, [user, student.skills])

  const removeStudentCertification = useCallback(async (cert: string) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, certifications: p.certifications.filter((c) => c !== cert) }
      studentSnapshotRef.current = next
      return next
    })
    if (user) updateJobSeekerProfile(user.id, { certifications: JSON.stringify(student.certifications.filter((c) => c !== cert)) }).catch((err) => { console.error('Failed to remove certification:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
  }, [user, student.certifications])

  const removeStudentAchievement = useCallback(async (ach: string) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, achievements: p.achievements.filter((a) => a !== ach) }
      studentSnapshotRef.current = next
      return next
    })
    if (user) updateJobSeekerProfile(user.id, { achievements: JSON.stringify(student.achievements.filter((a) => a !== ach)) }).catch((err) => { console.error('Failed to remove achievement:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
  }, [user, student.achievements])

  const removeStudentProject = useCallback(async (name: string) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, projects: p.projects.filter((pr) => pr.name !== name) }
      studentSnapshotRef.current = next
      return next
    })
    if (user) updateJobSeekerProfile(user.id, { projects: JSON.stringify(student.projects.filter((p) => p.name !== name)) }).catch((err) => { console.error('Failed to remove project:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
  }, [user, student.projects])

  const addStudentExperience = useCallback(async (exp: { title: string; org: string; period: string; desc: string }) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, experience: [...p.experience, exp] }
      studentSnapshotRef.current = next
      return next
    })
    if (user) {
      const updatedExp = [...student.experience, exp]
      updateJobSeekerProfile(user.id, { experience_years: updatedExp.length, experience: JSON.stringify(updatedExp) }).catch((err) => { console.error('Failed to save experience:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
    }
  }, [user, student.experience])

  const removeStudentExperience = useCallback(async (index: number) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, experience: p.experience.filter((_, i) => i !== index) }
      studentSnapshotRef.current = next
      return next
    })
    if (user) {
      const updatedExp = student.experience.filter((_, i) => i !== index)
      updateJobSeekerProfile(user.id, { experience_years: updatedExp.length, experience: JSON.stringify(updatedExp) }).catch((err) => { console.error('Failed to save experience:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
    }
  }, [user, student.experience])

  const addStudentEducation = useCallback(async (edu: { school: string; degree: string; period: string; detail: string }) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, education: [...p.education, edu] }
      studentSnapshotRef.current = next
      return next
    })
    if (user) {
      const next = [...student.education, edu]
      updateJobSeekerProfile(user.id, { education: JSON.stringify(next), college: next[0]?.school || edu.school, qualification: next[0]?.degree || edu.degree }).catch((err) => { console.error('Failed to save education:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
    }
  }, [user, student.education])

  const removeStudentEducation = useCallback(async (index: number) => {
    const { updateJobSeekerProfile } = await loadDb()
    const prev = studentSnapshotRef.current
    setStudent((p) => {
      const next = { ...p, education: p.education.filter((_, i) => i !== index) }
      studentSnapshotRef.current = next
      return next
    })
    if (user) {
      const next = student.education.filter((_, i) => i !== index)
      updateJobSeekerProfile(user.id, { education: JSON.stringify(next), college: next[0]?.school || undefined, qualification: next[0]?.degree || undefined }).catch((err) => { console.error('Failed to save education:', err); setStudent(prev); studentSnapshotRef.current = prev; toast.error('Failed to save. Please try again.') })
    }
  }, [user, student.education])

  const removeStudentResume = useCallback(async () => {
    const { updateJobSeekerProfile } = await loadDb()
    setStudent((prev) => {
      const { resumeFile: _, ...rest } = prev
      return rest
    })
    if (user) {
      const resumePatch: Record<string, unknown> = { resume_url: undefined, resume_name: undefined, resume_size_bytes: undefined, resume_uploaded_at: undefined }
      updateJobSeekerProfile(user.id, resumePatch).catch((err) => {
        console.error('Failed to remove resume from DB:', err)
        toast.error('Failed to remove resume')
      })
    }
  }, [user])

  const setStudentResume = useCallback((file: { name: string; size: string; date: string; url?: string }) => {
    setStudent((prev) => ({ ...prev, resumeFile: file }))
  }, [])

  const toggleBookmark = useCallback(async (id: string) => {
    const { toggleBookmark: toggleBookmarkDb } = await loadDb()
    const wasBookmarked = bookmarks.includes(id)
    setBookmarks((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]))
    if (user) toggleBookmarkDb(user.id, id).catch((err) => {
      console.error('Failed to toggle bookmark:', err)
      toast.error('Something went wrong. Please try again.')
      setBookmarks((b) => (wasBookmarked ? [...b, id] : b.filter((x) => x !== id)))
    })
  }, [user, bookmarks])

  const toggleCandidate = useCallback((candidateId: string) => {
    setSavedCandidates((prev) => {
      return prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    })
  }, [])

  const toggleStudentOpenToWork = useCallback(async (value: boolean): Promise<boolean> => {
    if (!user) return false
    let prevValue = false
    setStudent((s) => { prevValue = s.openToWork; return { ...s, openToWork: value } })
    try {
      // Try RPC first (bypasses RLS like professional toggle does)
      const { error: rpcErr } = await supabase.rpc('upsert_jobseeker_toggle', {
        p_user_id: user.id,
        p_field: 'is_open_to_work',
        p_value: value,
      })
      if (rpcErr) {
        // Fallback: use upsert directly
        const { error: upsertErr } = await supabase
          .from('profiles_job_seeker')
          .upsert({ user_id: user.id, is_open_to_work: value }, { onConflict: 'user_id' })
        if (upsertErr) {
          throw new Error(upsertErr.message)
        }
      }
      const { data: verify } = await supabase
        .from('profiles_job_seeker')
        .select('is_open_to_work')
        .eq('user_id', user.id)
        .single()
      if (verify?.is_open_to_work !== value) {
        throw new Error('Toggle value did not persist in database')
      }
      return true
    } catch (err) {
      setStudent((s) => ({ ...s, openToWork: prevValue }))
      toast.error('Failed to update toggle. Please try again.')
      return false
    }
  }, [user])

  const toggleProfessionalOpenForReferrals = useCallback(async (value: boolean): Promise<boolean> => {
    if (!user) return false
    let prevValue = false
    setProfessionals((prev) => {
      const idx = prev.findIndex((p) => p.id === user.id)
      if (idx >= 0) { prevValue = prev[idx].openForReferrals; return prev.map((p) => p.id === user.id ? { ...p, openForReferrals: value } : p) }
      // User not yet in array — create a minimal entry so the toggle reflects immediately
      return [...prev, {
        id: user.id,
        name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
        designation: '', company: '', industry: '', location: '',
        yearsExp: 0, skills: [], responseRate: 0, avgReplyHours: 0,
        referralsCompleted: 0, rating: 0, reviews: 0, verified: false,
        openForReferrals: value, isOpenToWork: false, maxPerMonth: 5,
        usedThisMonth: 0, successRate: 0, followers: 0, joinedDaysAgo: 0,
        activityScore: 0, referralPolicy: '', openPositions: [], bio: '',
        badges: [], gradient: 'from-[#6366F1] to-[#8B5CF6]',
        phone: '', whatsapp: '', email: user.email ?? '',
        hiringTimeline: [], referralDuration: '', linkedinUrl: '', githubUrl: '',
      }]
    })
    try {
      const { upsertProfessionalField } = await loadDb()
      await upsertProfessionalField(user.id, 'open_for_referrals', value)
      const { data: verify } = await supabase
        .from('profiles_professional')
        .select('open_for_referrals')
        .eq('user_id', user.id)
        .single()
      if (verify?.open_for_referrals !== value) {
        throw new Error('Toggle value did not persist in database')
      }
      return true
    } catch (err) {
      console.error('TOGGLE PERSIST FAILED (open_for_referrals):', err)
      setProfessionals((prev) => prev.map((p) => p.id === user.id ? { ...p, openForReferrals: prevValue } : p))
      toast.error('Failed to update toggle. Please try again.')
      return false
    }
  }, [user])

  const toggleProfessionalOpenToWork = useCallback(async (value: boolean): Promise<boolean> => {
    if (!user) return false
    let prevValue = false
    setProfessionals((prev) => {
      const idx = prev.findIndex((p) => p.id === user.id)
      if (idx >= 0) {
        prevValue = prev[idx].isOpenToWork
        return prev.map((p) => p.id === user.id ? { ...p, isOpenToWork: value } : p)
      }
      return [...prev, {
        id: user.id,
        name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
        designation: '', company: '', industry: '', location: '',
        yearsExp: 0, skills: [], responseRate: 0, avgReplyHours: 0,
        referralsCompleted: 0, rating: 0, reviews: 0, verified: false,
        openForReferrals: true, isOpenToWork: value, maxPerMonth: 5,
        usedThisMonth: 0, successRate: 0, followers: 0, joinedDaysAgo: 0,
        activityScore: 0, referralPolicy: '', openPositions: [], bio: '',
        badges: [], gradient: 'from-[#6366F1] to-[#8B5CF6]',
        phone: '', whatsapp: '', email: user.email ?? '',
        hiringTimeline: [], referralDuration: '', linkedinUrl: '', githubUrl: '',
      }]
    })
    try {
      const { upsertProfessionalField } = await loadDb()
      await upsertProfessionalField(user.id, 'is_open_to_work', value)
      const { data: verify } = await supabase
        .from('profiles_professional')
        .select('is_open_to_work')
        .eq('user_id', user.id)
        .single()
      if (verify?.is_open_to_work !== value) {
        throw new Error('Toggle value did not persist in database')
      }
      return true
    } catch (err) {
      console.error('TOGGLE PERSIST FAILED (professional is_open_to_work):', err)
      setProfessionals((prev) => prev.map((p) => p.id === user.id ? { ...p, isOpenToWork: prevValue } : p))
      toast.error('Failed to update toggle. Please try again.')
      return false
    }
  }, [user])

  const addRequest = useCallback(async (r: ReferralRequest) => {
    const { createReferral, formatRelativeTime } = await loadDb()
    setRequests((prev) => [r, ...prev])
    setRequestTimestamps((prev) => [...prev, Date.now()])
    if (user && r.professionalId) {
      createReferral({
        requester_id: user.id,
        professional_id: r.professionalId,
        job_title: r.role,
        note: r.note,
        relationship_type: r.relationshipType,
        relationship_note: r.relationshipNote,
        policy_acknowledged: r.policyAcknowledged,
      }).then((newRequest) => {
        // Replace local optimistic request with server-returned one (has real UUID)
        if (newRequest) {
          setRequests((prev) => prev.map((req) => req.id === r.id ? { ...req, id: newRequest.id, status: newRequest.status, pipelineStage: newRequest.pipelineStage } : req))
          // Notification for the professional — only after successful referral creation
          supabase.from('notifications').insert({
            user_id: r.professionalId,
            type: 'referral_request',
            title: 'New Referral Request',
            description: `${student.name || 'A user'} has requested a referral from you`,
          }).select().single().then(({ data: notifData }) => {
            if (notifData) {
              setNotifications((prev) => [{
                id: notifData.id,
                type: mapNotificationType(notifData.type),
                title: notifData.title,
                description: notifData.description ?? '',
                time: formatRelativeTime(notifData.created_at),
                read: notifData.read ?? false,
              }, ...prev])
            }
          }, (err: unknown) => {
            console.error('Failed to create notification:', err)
            toast.error('Failed to send notification')
          })
        }
      }).catch((err) => {
        console.error('Failed to create referral:', err)
        // Roll back optimistic update
        setRequests((prev) => prev.filter((req) => req.id !== r.id))
        // Roll back rate limiter timestamp
        setRequestTimestamps((prev) => prev.slice(0, -1))
        logClientError(`Referral creation failed: ${err}`, 'referral', 'error')
        toast.error('Failed to save referral — please try again')
      })
    }
  }, [user, student.name])

  const setRequestStatus = useCallback(async (id: string, status: ReferralRequest['status'], passReason?: string) => {
    const { updateReferralStatus, formatRelativeTime } = await loadDb()
    // Read the current request BEFORE updating state (avoids fragile side-effect pattern)
    const req = requests.find((r) => r.id === id)
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const updated = { ...r, status }
      if (status === 'accepted') {
        updated.pipelineStage = 'accepted'
        updated.progress = 75
      } else if (status === 'declined') {
        updated.progress = r.progress
      } else if (status === 'under_review') {
        updated.pipelineStage = 'under_review'
        updated.progress = 35
      }
      return updated
    }))
    if (req) {
      const dbStatus = status === 'declined' ? 'rejected' : status === 'requested' ? 'pending' : status
      if (status === 'accepted' || status === 'declined' || status === 'under_review') {
        updateReferralStatus(id, dbStatus as 'accepted' | 'rejected' | 'under_review', passReason).catch((err) => {
          console.error('Failed to update referral status:', err)
          logClientError(`Referral status update failed: ${err}`, 'referral', 'error')
          toast.error('Something went wrong. Please try again.')
        })
      }
      if (user && req.requesterId) {
        supabase.from('notifications').insert({
          user_id: req.requesterId,
          type: `referral_${status}`,
          title: `Referral ${status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}`,
          description: `Your referral request for ${req.role} has been ${status.replace(/_/g, ' ')}`,
        }).select().single().then(({ data: notifData }) => {
          if (notifData) {
            setNotifications((prev) => [{
              id: notifData.id,
              type: mapNotificationType(notifData.type),
              title: notifData.title,
              description: notifData.description ?? '',
              time: formatRelativeTime(notifData.created_at),
              read: notifData.read ?? false,
            }, ...prev])
          }
        }, (err: unknown) => {
          console.error('Failed to create notification:', err)
        })
      }
      if (status === 'accepted') {
        setNpsOpen(true)
      }
      if (req.studentEmail) {
        const professional = professionals.find((p) => p.id === req.professionalId)
        const proName = professional?.name || 'the professional'
        sendReferralStatusEmail(req.studentEmail, req.student, proName, req.role, status === 'declined' ? 'rejected' : status as 'accepted' | 'rejected')
          .catch((err) => { console.error('Failed to send referral status email:', err); toast.error('Failed to send status email') })
      }
    }
  }, [requests, professionals, user, setNpsOpen])

  // Auto-reminder: send reminder emails for pending referrals older than 3 days (once per session)
  const reminderSentRef = useRef(false)
  const currentConvsRef = useRef<Conversation[]>([])
  currentConvsRef.current = conversations
  useEffect(() => {
    if (!user || requests.length === 0 || reminderSentRef.current) return
    reminderSentRef.current = true
    const now = Date.now()
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
    const remindedKey = `reminded_${user.id}`
    const reminded = new Set<string>(JSON.parse(localStorage.getItem(remindedKey) || '[]'))
    let changed = false
    requests
      .filter((r) => r.status === 'requested' || r.status === 'under_review')
      .forEach((r) => {
        if (reminded.has(r.id)) return
        const requestDate = new Date(r.date).getTime()
        if (now - requestDate >= THREE_DAYS_MS) {
          const pro = professionals.find((p) => p.id === r.professionalId)
          if (pro?.email) {
            const daysPending = Math.floor((now - requestDate) / (24 * 60 * 60 * 1000))
            sendReminderEmail(pro.email, pro.name, r.student, r.role, daysPending)
              .then(() => { reminded.add(r.id); changed = true })
              .catch((err) => { console.error('Failed to send reminder email:', err); toast.error('Failed to send reminder email') })
          }
        }
      })
    if (changed) localStorage.setItem(remindedKey, JSON.stringify([...reminded]))
  }, [requests, professionals, user])

  const advancePipelineStage = useCallback((id: string) => {
    const current = requests.find((r) => r.id === id)
    if (!current) return
    const stages = PIPELINE_STAGES.map((s) => s.key)
    const currentIdx = stages.indexOf(current.pipelineStage)
    if (currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1]
      setRequests((prev) => prev.map((r) => {
        if (r.id !== id) return r
        return { ...r, pipelineStage: nextStage, progress: Math.round(((currentIdx + 1) / (stages.length - 1)) * 100) }
      }))
      dbAdvancePipeline(id, nextStage).catch((err) => {
        console.error('Failed to advance pipeline:', err)
        toast.error('Something went wrong. Please try again.')
        setRequests((prev) => prev.map((r) => {
          if (r.id !== id) return r
          return { ...r, pipelineStage: current.pipelineStage, progress: current.progress }
        }))
      })
    }
  }, [requests])

  const submitReferral = useCallback(async (id: string) => {
    const { submitReferral: submitReferralDb, formatRelativeTime } = await loadDb()
    const req = requests.find((r) => r.id === id)
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r
      return { ...r, status: 'referral_submitted' as ReferralStatus, pipelineStage: 'referral_submitted' as PipelineStage, progress: 85 }
    }))
    submitReferralDb(id).catch((err) => {
      console.error('Failed to submit referral:', err)
      toast.error('Something went wrong. Please try again.')
      setRequests((prev) => prev.map((r) => {
        if (r.id !== id) return r
        return { ...r, status: 'accepted' as ReferralStatus, pipelineStage: 'accepted' as PipelineStage, progress: 75 }
      }))
    })
    if (req?.requesterId) {
      supabase.from('notifications').insert({
        user_id: req.requesterId,
        type: 'referral_submitted',
        title: 'Referral Submitted',
        description: `Your referral for ${req.role} has been submitted to the company`,
      }).select().single().then(({ data: notifData }) => {
        if (notifData) {
          setNotifications((prev) => [{
            id: notifData.id,
            type: mapNotificationType(notifData.type),
            title: notifData.title,
            description: notifData.description ?? '',
            time: formatRelativeTime(notifData.created_at),
            read: notifData.read ?? false,
          }, ...prev])
        }
      }, (err: unknown) => {
        console.error('Failed to create notification:', err)
      })
    }
  }, [requests])

  const cancelReferral = useCallback(async (id: string) => {
    const { cancelReferral: cancelReferralDb } = await loadDb()
    const req = requests.find((r) => r.id === id)
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r
      return { ...r, status: 'closed' as ReferralStatus, pipelineStage: 'closed' as PipelineStage, progress: 0 }
    }))
    cancelReferralDb(id).catch((err) => {
      console.error('Failed to cancel referral:', err)
      toast.error('Something went wrong. Please try again.')
      if (req) {
        setRequests((prev) => prev.map((r) => {
          if (r.id !== id) return r
          return { ...r, status: req.status, pipelineStage: req.pipelineStage, progress: req.progress }
        }))
      }
    })
  }, [requests])

  const updateApplicationStatus = useCallback(async (id: string, newStatus: 'application_submitted' | 'closed') => {
    const { updateApplicationStatus: updateAppStatusDb, formatRelativeTime } = await loadDb()
    const req = requests.find((r) => r.id === id)
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const progress = newStatus === 'application_submitted' ? 95 : 100
      return { ...r, status: newStatus as ReferralStatus, pipelineStage: newStatus as PipelineStage, progress }
    }))
    updateAppStatusDb(id, newStatus).catch((err) => {
      console.error('Failed to update application status:', err)
      toast.error('Something went wrong. Please try again.')
      if (req) {
        setRequests((prev) => prev.map((r) => {
          if (r.id !== id) return r
          return { ...r, status: req.status, pipelineStage: req.pipelineStage, progress: req.progress }
        }))
      }
    })
    if (req?.professionalId) {
      supabase.from('notifications').insert({
        user_id: req.professionalId,
        type: newStatus === 'application_submitted' ? 'application_submitted' : 'referral_closed',
        title: newStatus === 'application_submitted' ? 'Application Submitted' : 'Referral Closed',
        description: newStatus === 'application_submitted'
          ? `${req.student} has applied for ${req.role}`
          : `The referral process for ${req.role} has been closed`,
      }).select().single().then(({ data: notifData }) => {
        if (notifData) {
          setNotifications((prev) => [{
            id: notifData.id,
            type: mapNotificationType(notifData.type),
            title: notifData.title,
            description: notifData.description ?? '',
            time: formatRelativeTime(notifData.created_at),
            read: notifData.read ?? false,
          }, ...prev])
        }
      }, (err: unknown) => {
        console.error('Failed to create notification:', err)
      })
    }
  }, [requests])

  const sendMessage = useCallback(async (conversationId: string, text: string, kind: 'text' | 'file' = 'text', fileUrl?: string, fileName?: string) => {
    const { sendMessage: sendMessageDb } = await loadDb()
    const displayText = kind === 'file' && fileName ? `📎 ${fileName}` : text
    const storedContent = kind === 'file' && fileUrl
      ? JSON.stringify({ type: 'file', name: fileName || 'File', url: fileUrl })
      : text

    const newMsg: Message = {
      id: `mm-${Date.now()}`,
      from: 'me',
      text: storedContent,
      time: 'Just now',
      is_read: false,
      kind,
    }
    // Capture previous lastMessage for rollback
    let prevLastMessage = ''
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          prevLastMessage = c.lastMessage
          return { ...c, messages: [...c.messages, newMsg], lastMessage: displayText, time: 'Just now' }
        }
        return c
      })
    )
    // Persist to Supabase
    if (user) {
      sendMessageDb(conversationId, user.id, text, kind, fileUrl, fileName).then((realMsg) => {
        // Replace the temporary mm- ID with the real DB UUID so the message
        // survives page refreshes and matches realtime payloads.
        if (realMsg?.id) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? { ...c, messages: c.messages.map((m) => m.id === newMsg.id ? { ...m, id: realMsg.id } : m) }
                : c
            )
          )
        }
      }).catch((err) => {
        console.error('Failed to send message:', err)
        // Rollback: remove phantom message and restore previous lastMessage
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, messages: c.messages.filter((m) => m.id !== newMsg.id), lastMessage: prevLastMessage }
              : c
          )
        )
        toast.error('Message failed to send')
      })
    }
  }, [user])

  const markConversationRead = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0, messages: c.messages.map((m) => m.from === 'them' ? { ...m, is_read: true, read_at: new Date().toISOString() } : m) } : c))
    )
    // Persist to DB - update messages read status
    if (user) {
      supabase.from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', id)
        .neq('sender_id', user.id)
        .eq('is_read', false)
        .then(() => {}, (err) => {
          console.error('Failed to mark conversation read:', err)
          toast.error('Something went wrong. Please try again.')
        })
    }
  }, [user])

  const startConversation = useCallback(async (targetUserId: string): Promise<string | null> => {
    const { findOrCreateConversation, fetchConversations } = await loadDb()
    if (!user) return null
    const activeRole = roleRef.current
    const convId = await findOrCreateConversation(user.id, targetUserId, activeRole)
    if (!convId) {
      toast.error('Failed to start conversation')
      return null
    }
    // Refresh conversations list so the new conversation appears
    const updatedConvs = await fetchConversations(user.id, activeRole)
    setConversations(updatedConvs)
    return convId
  }, [user])

  const markNotificationRead = useCallback(async (id: string) => {
    const { markNotificationRead: markNotificationReadDb } = await loadDb()
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    markNotificationReadDb(id).catch((err) => {
      console.error('Failed to mark notification read:', err)
      toast.error('Something went wrong. Please try again.')
    })
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    const { markAllNotificationsRead: markAllNotificationsReadDb } = await loadDb()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (user) markAllNotificationsReadDb(user.id).catch((err) => {
      console.error('Failed to mark all notifications read:', err)
      toast.error('Something went wrong. Please try again.')
    })
  }, [user])

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const updateJob = useCallback(async (id: string, patch: Partial<Job>) => {
    const { updateJob: updateJobDb } = await loadDb()
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
    const dbPatch: Record<string, unknown> = {}
    if (patch.title) dbPatch.title = patch.title
    if (patch.department !== undefined) dbPatch.department = patch.department
    if (patch.location !== undefined) dbPatch.location = patch.location
    if (patch.stage) {
      const stageMap: Record<string, string> = { Active: 'active', Paused: 'paused', Draft: 'draft' }
      dbPatch.stage = stageMap[patch.stage] ?? patch.stage
    }
    if (Object.keys(dbPatch).length > 0) updateJobDb(id, dbPatch).catch((err) => {
      console.error('Failed to update job:', err)
      toast.error('Something went wrong. Please try again.')
    })
  }, [])

  const myRequests = useMemo(() => {
    return requests.filter((r) => r.requesterId === user?.id)
  }, [requests, user])
  const myReferralCount = myRequests.length
  const myAcceptedCount = useMemo(() => myRequests.filter((r) => r.status === 'accepted').length, [myRequests])
  const myPendingCount = useMemo(() => myRequests.filter((r) => r.status === 'requested' || r.status === 'under_review').length, [myRequests])
  const myRejectedCount = useMemo(() => myRequests.filter((r) => r.status === 'declined').length, [myRequests])

  const toggleDemoMode = useCallback(() => {
    setDemoMode((prev) => {
      const next = !prev
      toast.success(next ? 'Demo mode enabled — all demo accounts are now visible' : 'Demo mode disabled — all demo accounts are hidden')
      return next
    })
  }, [])

  const profileCompletion = useMemo(() => {
    const checks = [
      !!student.resumeFile?.name,
      !!student.gradient && !student.gradient.includes('linear-gradient'),
      !!student.links?.linkedin,
      (student.skills?.length ?? 0) > 0,
      !!student.headline,
      !!student.location,
      !!student.noticePeriod,
      !!student.whyFit,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [student])

  const activity = useMemo(() => {
    const items: { id: string; kind: string; text: string; time: string; sortTime: number }[] = []
    requests.forEach((r) => {
      const sortTime = r.date ? new Date(r.date).getTime() || 0 : 0
      items.push({
        id: `ref-${r.id}`,
        kind: 'referral',
          text: r.status === 'accepted'
            ? `Your referral for ${r.role} was accepted`
            : r.status === 'declined'
            ? `Your referral for ${r.role} was declined`
            : `Referral request sent for ${r.role}`,
        time: r.date,
        sortTime,
      })
    })
    conversations.forEach((c) => {
      if (c.lastMessage) {
        items.push({
          id: `conv-${c.id}`,
          kind: 'message',
          text: `Message with ${c.name}: ${c.lastMessage}`,
          time: c.time,
          sortTime: 0,
        })
      }
    })
    items.sort((a, b) => b.sortTime - a.sortTime)
    return items.slice(0, 20).map(({ sortTime: _, ...rest }) => rest)
  }, [requests, conversations])

  const getUserOnlineStatus = useCallback((_userId: string) => {
    const userConvs = conversations.filter((c) =>
      c.messages.length > 0 && c.messages[c.messages.length - 1].from === 'them'
    )
    const lastMsg = userConvs.length > 0 ? userConvs[userConvs.length - 1].messages[userConvs[userConvs.length - 1].messages.length - 1].time : null
    if (!lastMsg) return false
    if (lastMsg === 'Just now') return true
    const minMatch = lastMsg.match(/^(\d+)m/)
    if (minMatch) return parseInt(minMatch[1]) <= 5
    return false
  }, [conversations])

  const logout = useCallback(() => {
    setAuthed(false)
    setIsAdmin(false)
    setDemoMode(false)
    setRoleLoaded(false)
    setRole('student')
    reminderSentRef.current = false
    // Clear persisted workspace to prevent stale role leaking to next account
    clearWorkspaceCookie()
    try { localStorage.removeItem('dr_active_role') } catch { /* ignore */ }
    setProfessionals([])
    setRequests([])
    setRequestTimestamps([])
    setConversations([])
    setBookmarks([])
    setNotifications([])
    setJobs([])
    setCandidates([])
    setSavedCandidates([])
    setStudent((prev) => ({
      ...prev,
      name: '',
      email: '',
      headline: '',
      skills: [],
      preferredRoles: [],
      preferredCompanies: [],
      expectedSalary: '',
      careerInterests: [],
      languages: [],
      experience: [],
      education: [],
      certifications: [],
      achievements: [],
      projects: [],
      links: { linkedin: '', github: '', website: '' },
      openToWork: false,
      location: '',
      noticePeriod: undefined,
      workPreference: undefined,
      whyFit: undefined,
    }))
  }, [])

  const value = useMemo<AppState>(() => ({
    role,
    setRole,
    roleLoaded,
    isAdmin,
    authed,
    loading,
    logout,

    professionals,
    updateProfessional,
    updateRecruiter,

    student: { ...student, profileCompletion },
    updateStudent,
    addStudentCertification,
    removeStudentCertification,
    addStudentAchievement,
    removeStudentAchievement,
    addStudentProject,
    removeStudentProject,
    addStudentSkill,
    removeStudentSkill,
    addStudentExperience,
    removeStudentExperience,
    addStudentEducation,
    removeStudentEducation,
    setStudentResume,
    removeStudentResume,

    bookmarks,
    toggleBookmark,
    savedCandidates,
    toggleCandidate,

    requests,
    addRequest,
    setRequestStatus,
    advancePipelineStage,
    submitReferral,
    cancelReferral,
    updateApplicationStatus,
    referralsSentToday,
    canSendReferral,
    nextReferralReset,

    conversations,
    setConversations,
    sendMessage,
    markConversationRead,
    startConversation,
    toggleStudentOpenToWork,
    toggleProfessionalOpenForReferrals,
    toggleProfessionalOpenToWork,

    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    unreadNotificationCount,

    activity,

    jobs,
    setJobs,
    updateJob,

    candidates,
    refreshCandidates,

    myReferralCount,
    myAcceptedCount,
    myPendingCount,
    myRejectedCount,

    demoMode,
    toggleDemoMode,
    visibleProfessionals: professionals,
    getUserOnlineStatus,
    npsOpen,
    setNpsOpen,
  }), [
    role, roleLoaded, authed, loading, logout, isAdmin, professionals, updateProfessional, updateRecruiter,
    student, updateStudent, addStudentCertification, removeStudentCertification, addStudentAchievement, removeStudentAchievement, addStudentProject, removeStudentProject, addStudentSkill, removeStudentSkill, addStudentExperience, removeStudentExperience, addStudentEducation, removeStudentEducation, setStudentResume, removeStudentResume,
    bookmarks, toggleBookmark, savedCandidates, toggleCandidate,
    requests, addRequest, setRequestStatus, advancePipelineStage, submitReferral, cancelReferral, updateApplicationStatus, referralsSentToday, canSendReferral, nextReferralReset,
    conversations, setConversations, sendMessage, markConversationRead, startConversation,
    notifications, markNotificationRead, markAllNotificationsRead, unreadNotificationCount,
    jobs, setJobs, updateJob, candidates, refreshCandidates,
    myReferralCount, myAcceptedCount, myPendingCount, myRejectedCount,
    demoMode, toggleDemoMode, activity, getUserOnlineStatus,
    npsOpen, setNpsOpen, toggleStudentOpenToWork, toggleProfessionalOpenForReferrals, toggleProfessionalOpenToWork,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

/** Selector hook — components using this only re-render when the selected slice changes. */
export function useAppSelector<T>(selector: (state: AppState) => T): T {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppSelector must be used within AppProvider')
  const selected = selector(ctx)
  const ref = useRef(selected)
  if (!Object.is(ref.current, selected)) {
    ref.current = selected
  }
  return ref.current
}
