import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import {
  GRADIENTS,
  type Professional,
  type ReferralRequest,
  type Role,
  type Conversation,
  type Message,
  type AppNotification,
  type Job,
  PIPELINE_STAGES,
} from '@/data/mock'
import { supabase, advanceReferralPipeline as dbAdvancePipeline } from '@/lib/supabase'
import { sendReferralStatusEmail, sendReminderEmail } from '@/lib/email'
import { notifyNewMessage, notifyReferralUpdate, requestNotificationPermission } from '@/lib/notifications'
import {
  fetchProfessionals,
  fetchReferrals,
  createReferral as dbCreateReferral,
  updateReferralStatus as dbUpdateReferralStatus,
  fetchConversations,
  sendMessage as dbSendMessage,
  fetchJobs as dbFetchJobs,
  fetchBookmarks as dbFetchBookmarks,
  fetchNotifications as dbFetchNotifications,
  markNotificationRead as dbMarkRead,
  markAllNotificationsRead as dbMarkAllRead,
  updateUserProfile as dbUpdateUserProfile,
  updateJobSeekerProfile as dbUpdateJobSeekerProfile,
  updateProfessionalProfile as dbUpdateProProf,
  updateRecruiterProfile as dbUpdateRecruiterProf,
  toggleBookmark as dbToggleBookmark,
  updateJob as dbUpdateJob,
  fetchCandidates as dbFetchCandidates,
  formatRelativeTime,
} from '@/lib/db'

const RATE_LIMIT = 3
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000

function mapNotificationType(dbType: string): AppNotification['type'] {
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

export interface StudentProfile {
  name: string
  headline: string
  location: string
  email: string
  openToWork: boolean
  profileCompletion: number
  verified: boolean
  gradient: string
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
}

export interface Candidate {
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
}

interface AppState {
  role: Role
  setRole: (r: Role) => void
  isAdmin: boolean
  authed: boolean
  loading: boolean
  login: (r: Role) => void
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
  setRequestStatus: (id: string, status: ReferralRequest['status']) => void
  advancePipelineStage: (id: string) => void
  referralsSentToday: number
  canSendReferral: boolean
  nextReferralReset: string

  conversations: Conversation[]
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>
  sendMessage: (conversationId: string, text: string) => void
  markConversationRead: (id: string) => void

  notifications: AppNotification[]
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  unreadNotificationCount: number

  activity: { id: string; kind: string; text: string; time: string }[]

  jobs: Job[]
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>
  updateJob: (id: string, patch: Partial<Job>) => void

  candidates: { id: string; name: string; role: string; company: string; stage: string; rating: number; source: string; gradient: string; skills: string[]; location: string; exp: number }[]
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

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [role, setRole] = useState<Role>('student')
  const [isAdmin, setIsAdmin] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)
  const [npsOpen, setNpsOpen] = useState(false)
  const initialRoleLoaded = useRef(false)

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
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [savedCandidates, setSavedCandidates] = useState<string[]>([])
  const [requests, setRequests] = useState<ReferralRequest[]>([])
  const [requestTimestamps, setRequestTimestamps] = useState<number[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<{ id: string; name: string; role: string; company: string; stage: string; rating: number; source: string; gradient: string; skills: string[]; location: string; exp: number }[]>([])

  const refreshCandidates = useCallback(async () => {
    if (!user) return
    try {
      const cands = await dbFetchCandidates(user.id)
      setCandidates(cands)
    } catch { /* ignore */ }
  }, [user])

  // ── Load real data from Supabase when user is authenticated ──
  useEffect(() => {
    if (!user) return
    const currentUser = user

    async function loadRealData() {
      const userId = currentUser.id
      const meta = currentUser.user_metadata

      // Read role and profile data from the users table (source of truth)
      let userRole = 'job_seeker'
      const { data: userRow } = await supabase
        .from('users')
        .select('role, full_name, city, state, country')
        .eq('id', userId)
        .single()
      if (userRow?.role) {
        userRole = userRow.role
      } else {
        userRole = (meta?.role as string) || 'job_seeker'
      }
      const mappedRole: Role = userRole === 'job_seeker' ? 'student' : (userRole as Role)
      if (!initialRoleLoaded.current) {
        setRole(mappedRole)
        setIsAdmin(userRole === 'admin')
        initialRoleLoaded.current = true
      }
      setAuthed(true)

      // Load in parallel
      const [profs, refs, convs, bms, notifs, jbs, cands] = await Promise.allSettled([
        fetchProfessionals(),
        fetchReferrals(userId),
        fetchConversations(userId),
        dbFetchBookmarks(userId),
        dbFetchNotifications(userId),
        dbFetchJobs(),
        dbFetchCandidates(userId),
      ])

      if (profs.status === 'fulfilled' && profs.value.length > 0) setProfessionals(profs.value)
      if (refs.status === 'fulfilled') setRequests(refs.value)
      if (convs.status === 'fulfilled' && convs.value.length > 0) setConversations(convs.value)
      if (bms.status === 'fulfilled') setBookmarks(bms.value)
      if (notifs.status === 'fulfilled' && notifs.value.length > 0) setNotifications(notifs.value)
      if (jbs.status === 'fulfilled' && jbs.value.length > 0) setJobs(jbs.value)
      if (cands.status === 'fulfilled' && cands.value.length > 0) setCandidates(cands.value)

      // Read name and location from users table (source of truth, not auth metadata)
      const rawName = userRow?.full_name || meta?.full_name || meta?.name || currentUser.email?.split('@')[0] || 'User'
      const displayName = rawName.trim() || currentUser.email?.split('@')[0] || 'User'
      const locationParts = [userRow?.city, userRow?.state].filter(Boolean).join(', ')

      // Always populate student name so it's available in any workspace
      setStudent((prev) => ({
        ...prev,
        name: displayName,
        email: currentUser.email || prev.email,
        location: locationParts || prev.location,
      }))

      if (mappedRole === 'student') {

        // Hydrate full student profile from DB
        const { data: profileData } = await supabase
          .from('profiles_job_seeker')
          .select('*')
          .eq('user_id', userId)
          .single()
        if (profileData) {
          setStudent((prev) => ({
            ...prev,
            headline: profileData.headline ?? prev.headline,
            openToWork: profileData.is_open_to_work ?? prev.openToWork,
            certifications: typeof profileData.certifications === 'string' ? (() => { try { return JSON.parse(profileData.certifications) } catch { return prev.certifications } })() : (profileData.certifications ?? prev.certifications),
            achievements: typeof profileData.achievements === 'string' ? (() => { try { return JSON.parse(profileData.achievements) } catch { return prev.achievements } })() : (profileData.achievements ?? prev.achievements),
            projects: typeof profileData.projects === 'string' ? (() => { try { return JSON.parse(profileData.projects) } catch { return prev.projects } })() : (profileData.projects ?? prev.projects),
            preferredCompanies: profileData.preferred_companies ?? prev.preferredCompanies,
            preferredRoles: profileData.preferred_role ? profileData.preferred_role.split(',').map((s: string) => s.trim()).filter(Boolean) : prev.preferredRoles,
            skills: profileData.skills ?? prev.skills,
            links: {
              linkedin: profileData.portfolio_url ?? prev.links.linkedin,
              github: profileData.github_url ?? prev.links.github,
              website: profileData.website ?? prev.links.website,
            },
            ...(profileData.experience ? { experience: typeof profileData.experience === 'string' ? (() => { try { return JSON.parse(profileData.experience) } catch { return prev.experience } })() : profileData.experience } : {}),
            ...(profileData.education ? { education: typeof profileData.education === 'string' ? (() => { try { return JSON.parse(profileData.education) } catch { return prev.education } })() : profileData.education } : {}),
            ...(profileData.languages ? { languages: typeof profileData.languages === 'string' ? (() => { try { return JSON.parse(profileData.languages) } catch { return prev.languages } })() : profileData.languages } : {}),
            ...(profileData.resume_url ? {
              resumeFile: {
                name: profileData.resume_name || 'Resume',
                size: profileData.resume_size_bytes
                  ? profileData.resume_size_bytes > 1048576
                    ? `${(profileData.resume_size_bytes / 1048576).toFixed(1)} MB`
                    : `${Math.round(profileData.resume_size_bytes / 1024)} KB`
                  : 'Unknown',
                date: profileData.resume_uploaded_at
                  ? new Date(profileData.resume_uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '',
                url: profileData.resume_url,
              },
            } : { resumeFile: undefined }),
          }))
        }
      }
    }

    loadRealData()
      .catch((err) => { console.error('loadRealData failed:', err); toast.error('Failed to load some data. Please refresh the page.') })
      .finally(() => setLoading(false))
    // Request browser notification permission (non-blocking)
    requestNotificationPermission()

    // ── Real-time: notifications ──
    const notifChannel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
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
        (payload) => {
          const msg = payload.new as { id: string; conversation_id?: string; sender_id?: string; content?: string; created_at: string; kind?: string }
          if (!msg.conversation_id || !msg.sender_id) return

          const newMessage: Message = {
            id: msg.id,
            from: 'them',
            text: msg.content ?? '',
            time: formatRelativeTime(msg.created_at),
            read: false,
            kind: (msg.kind === 'file' ? 'file' : 'text') as 'text' | 'file',
          }

          setConversations((prev) =>
            prev.map((c) =>
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
          )

          if (msg.content) {
            notifyNewMessage('Someone', msg.content)
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
        (payload) => {
          const ref = payload.new as { status?: string; requester_id?: string; job_title?: string }
          fetchReferrals(currentUser.id).then((refs) => setRequests(refs)).catch((err) => { console.error('Failed to refresh referrals:', err) })
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
  }, [user])

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

  const updateProfessional = useCallback((id: string, patch: Partial<Professional>) => {
    setProfessionals((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx >= 0) {
        return prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      }
      return [...prev, {
        id,
        name: patch.name ?? '',
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
        gradient: 'from-[#4F7CFF] to-[#7C5CFF]',
        phone: '',
        whatsapp: '',
        email: user?.email ?? '',
        hiringTimeline: [],
        referralDuration: '',
        linkedinUrl: patch.linkedinUrl ?? '',
        githubUrl: patch.githubUrl ?? '',
      }]
    })
    if (user) {
      const userPatch: Record<string, unknown> = {}
      if (patch.name) userPatch.full_name = patch.name
      if (patch.name) {
        setProfessionals((prev) => prev.map((p) => (p.id === user.id ? { ...p, name: patch.name! } : p)))
      }
      if (patch.location) {
        const parts = patch.location.split(',').map((s: string) => s.trim())
        if (parts.length >= 2) { userPatch.city = parts[0]; userPatch.state = parts[1] }
      }
      if (patch.linkedinUrl !== undefined) userPatch.linkedin = patch.linkedinUrl
      if (Object.keys(userPatch).length > 0) dbUpdateUserProfile(id, userPatch).catch((err) => {
        console.error('Failed to update user profile:', err)
        toast.error('Something went wrong. Please try again.')
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
      if (Object.keys(profilePatch).length > 0) {
        dbUpdateProProf(id, profilePatch).catch((err) => {
          console.error('Failed to update professional profile:', err)
          toast.error('Something went wrong. Please try again.')
        })
      }
    }
  }, [user])

  const updateRecruiter = useCallback((patch: Record<string, unknown>) => {
    if (user) {
      dbUpdateRecruiterProf(user.id, patch).catch((err) => {
        console.error('Failed to update recruiter profile:', err)
        toast.error('Something went wrong. Please try again.')
      })
    }
  }, [user])

  const updateStudent = useCallback((patch: Partial<StudentProfile>) => {
    setStudent((prev) => ({ ...prev, ...patch }))
    if (user) {
      const userPatch: Record<string, unknown> = {}
      if (patch.name !== undefined) userPatch.full_name = patch.name
      // email changes are handled through Supabase Auth, not the users table
      if (patch.location !== undefined) {
        const parts = patch.location.split(',').map((s: string) => s.trim())
        if (parts.length >= 2) { userPatch.city = parts[0]; userPatch.state = parts[1] }
        else if (parts.length === 1) { userPatch.city = parts[0] }
      }
      if (Object.keys(userPatch).length > 0) dbUpdateUserProfile(user.id, userPatch).catch((err) => {
        console.error('Failed to update student profile:', err)
        toast.error('Something went wrong. Please try again.')
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
      if (Object.keys(profilePatch).length > 0) dbUpdateJobSeekerProfile(user.id, profilePatch).catch((err) => {
        console.error('Failed to update job seeker profile:', err)
        toast.error('Something went wrong. Please try again.')
      })
    }
  }, [user])

  const addStudentCertification = useCallback((cert: string) => {
    setStudent((prev) => {
      const next = [...prev.certifications, cert]
      if (user) dbUpdateJobSeekerProfile(user.id, { certifications: JSON.stringify(next) }).catch((err) => { console.error('Failed to save certification:', err) })
      return { ...prev, certifications: next }
    })
  }, [user])

  const addStudentAchievement = useCallback((ach: string) => {
    setStudent((prev) => {
      const next = [...prev.achievements, ach]
      if (user) dbUpdateJobSeekerProfile(user.id, { achievements: JSON.stringify(next) }).catch((err) => { console.error('Failed to save achievement:', err) })
      return { ...prev, achievements: next }
    })
  }, [user])

  const addStudentProject = useCallback((proj: { name: string; desc: string; tags: string[] }) => {
    setStudent((prev) => {
      const next = [...prev.projects, proj]
      if (user) dbUpdateJobSeekerProfile(user.id, { projects: JSON.stringify(next) }).catch((err) => { console.error('Failed to save project:', err) })
      return { ...prev, projects: next }
    })
  }, [user])

  const addStudentSkill = useCallback((skill: string) => {
    setStudent((prev) => {
      const next = [...prev.skills, skill]
      if (user) dbUpdateJobSeekerProfile(user.id, { skills: next }).catch((err) => { console.error('Failed to save skill:', err) })
      return { ...prev, skills: next }
    })
  }, [user])

  const removeStudentSkill = useCallback((skill: string) => {
    setStudent((prev) => {
      const next = prev.skills.filter((s) => s !== skill)
      if (user) dbUpdateJobSeekerProfile(user.id, { skills: next }).catch((err) => { console.error('Failed to remove skill:', err) })
      return { ...prev, skills: next }
    })
  }, [user])

  const removeStudentCertification = useCallback((cert: string) => {
    setStudent((prev) => {
      const next = prev.certifications.filter((c) => c !== cert)
      if (user) dbUpdateJobSeekerProfile(user.id, { certifications: JSON.stringify(next) }).catch((err) => { console.error('Failed to remove certification:', err) })
      return { ...prev, certifications: next }
    })
  }, [user])

  const removeStudentAchievement = useCallback((ach: string) => {
    setStudent((prev) => {
      const next = prev.achievements.filter((a) => a !== ach)
      if (user) dbUpdateJobSeekerProfile(user.id, { achievements: JSON.stringify(next) }).catch((err) => { console.error('Failed to remove achievement:', err) })
      return { ...prev, achievements: next }
    })
  }, [user])

  const removeStudentProject = useCallback((name: string) => {
    setStudent((prev) => {
      const next = prev.projects.filter((p) => p.name !== name)
      if (user) dbUpdateJobSeekerProfile(user.id, { projects: JSON.stringify(next) }).catch((err) => { console.error('Failed to remove project:', err) })
      return { ...prev, projects: next }
    })
  }, [user])

  const addStudentExperience = useCallback((exp: { title: string; org: string; period: string; desc: string }) => {
    setStudent((prev) => {
      const next = [...prev.experience, exp]
      if (user) dbUpdateJobSeekerProfile(user.id, { experience_years: next.length, experience: JSON.stringify(next) }).catch((err) => { console.error('Failed to save experience:', err) })
      return { ...prev, experience: next }
    })
  }, [user])

  const removeStudentExperience = useCallback((index: number) => {
    setStudent((prev) => {
      const next = prev.experience.filter((_, i) => i !== index)
      if (user) dbUpdateJobSeekerProfile(user.id, { experience_years: next.length, experience: JSON.stringify(next) }).catch((err) => { console.error('Failed to save experience:', err) })
      return { ...prev, experience: next }
    })
  }, [user])

  const addStudentEducation = useCallback((edu: { school: string; degree: string; period: string; detail: string }) => {
    setStudent((prev) => {
      const next = [...prev.education, edu]
      if (user) dbUpdateJobSeekerProfile(user.id, { education: JSON.stringify(next), college: next[0]?.school || edu.school, qualification: next[0]?.degree || edu.degree }).catch((err) => { console.error('Failed to save education:', err) })
      return { ...prev, education: next }
    })
  }, [user])

  const removeStudentEducation = useCallback((index: number) => {
    setStudent((prev) => {
      const next = prev.education.filter((_, i) => i !== index)
      if (user) dbUpdateJobSeekerProfile(user.id, { education: JSON.stringify(next), college: next[0]?.school || undefined, qualification: next[0]?.degree || undefined }).catch((err) => { console.error('Failed to save education:', err) })
      return { ...prev, education: next }
    })
  }, [user])

  const removeStudentResume = useCallback(() => {
    setStudent((prev) => {
      const { resumeFile: _, ...rest } = prev
      return rest
    })
    if (user) {
      const resumePatch: Record<string, unknown> = { resume_url: undefined, resume_name: undefined, resume_size_bytes: undefined, resume_uploaded_at: undefined }
      dbUpdateJobSeekerProfile(user.id, resumePatch).catch((err) => {
        console.error('Failed to remove resume from DB:', err)
      })
    }
  }, [user])

  const setStudentResume = useCallback((file: { name: string; size: string; date: string; url?: string }) => {
    setStudent((prev) => ({ ...prev, resumeFile: file }))
  }, [])

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]))
    if (user) dbToggleBookmark(user.id, id).catch((err) => {
      console.error('Failed to toggle bookmark:', err)
      toast.error('Something went wrong. Please try again.')
    })
  }, [user])

  const toggleCandidate = useCallback((candidateId: string) => {
    setSavedCandidates((prev) => {
      return prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    })
  }, [])

  const addRequest = useCallback((r: ReferralRequest) => {
    setRequests((prev) => [r, ...prev])
    setRequestTimestamps((prev) => [...prev, Date.now()])
    if (user && r.professionalId) {
      dbCreateReferral({
        requester_id: user.id,
        professional_id: r.professionalId,
        job_title: r.role,
        note: r.note,
      }).then((newRequest) => {
        // Replace local optimistic request with server-returned one (has real UUID)
        if (newRequest) {
          setRequests((prev) => prev.map((req) => req.id === r.id ? { ...req, id: newRequest.id } : req))
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
          })
        }
      }).catch((err) => {
        console.error('Failed to create referral:', err)
        // Roll back optimistic update
        setRequests((prev) => prev.filter((req) => req.id !== r.id))
        toast.error('Failed to save referral — please try again')
      })
    }
  }, [user, student.name])

  const setRequestStatus = useCallback((id: string, status: ReferralRequest['status']) => {
    // Read the current request BEFORE updating state (avoids fragile side-effect pattern)
    const req = requests.find((r) => r.id === id)
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const updated = { ...r, status }
      if (status === 'accepted') {
        updated.pipelineStage = 'accepted'
        updated.progress = 75
      }
      return updated
    }))
    if (req && (status === 'accepted' || status === 'rejected')) {
      dbUpdateReferralStatus(id, status as 'accepted' | 'rejected').catch((err) => {
        console.error('Failed to update referral status:', err)
        toast.error('Something went wrong. Please try again.')
      })
      if (user) {
        supabase.from('notifications').insert({
          user_id: req.requesterId || req.professionalId,
          type: `referral_${status}`,
          title: `Referral ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          description: `Your referral request for ${req.role} has been ${status}`,
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
        sendReferralStatusEmail(req.studentEmail, req.student, proName, req.role, status as 'accepted' | 'rejected')
          .catch((err) => { console.error('Failed to send referral status email:', err) })
      }
    }
  }, [requests, professionals, user, setNpsOpen])

  // Auto-reminder: send reminder emails for pending referrals older than 3 days (once per session)
  const reminderSentRef = useRef(false)
  useEffect(() => {
    if (!user || requests.length === 0 || reminderSentRef.current) return
    reminderSentRef.current = true
    const now = Date.now()
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
    requests
      .filter((r) => r.status === 'pending')
      .forEach((r) => {
        const requestDate = new Date(r.date).getTime()
        if (now - requestDate >= THREE_DAYS_MS) {
          const pro = professionals.find((p) => p.id === r.professionalId)
          if (pro?.email) {
            const daysPending = Math.floor((now - requestDate) / (24 * 60 * 60 * 1000))
            sendReminderEmail(pro.email, pro.name, r.student, r.role, daysPending).catch((err) => { console.error('Failed to send reminder email:', err) })
          }
        }
      })
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
      })
    }
  }, [requests])

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const newMsg: Message = {
      id: `mm-${Date.now()}`,
      from: 'me',
      text,
      time: 'Just now',
      read: true,
      kind: 'text',
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, newMsg], lastMessage: text, time: 'Just now' }
          : c
      )
    )
    // Persist to Supabase
    if (user) {
      dbSendMessage(conversationId, user.id, text).then(() => {
        // Message sent successfully
      }).catch((err) => {
        console.error('Failed to send message:', err)
        // Rollback: remove phantom message
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, messages: c.messages.filter((m) => m.id !== newMsg.id), lastMessage: c.messages.length > 1 ? c.messages[c.messages.length - 2].text : '' }
              : c
          )
        )
        toast.error('Message failed to send')
      })
    }
  }, [user])

  const markConversationRead = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    )
    // Persist to DB - update messages read status
    if (user) {
      supabase.from('messages')
        .update({ read: true })
        .eq('conversation_id', id)
        .neq('sender_id', user.id)
        .eq('read', false)
        .then(() => {}, (err) => {
          console.error('Failed to mark conversation read:', err)
          toast.error('Something went wrong. Please try again.')
        })
    }
  }, [user])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    dbMarkRead(id).catch((err) => {
      console.error('Failed to mark notification read:', err)
      toast.error('Something went wrong. Please try again.')
    })
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (user) dbMarkAllRead(user.id).catch((err) => {
      console.error('Failed to mark all notifications read:', err)
      toast.error('Something went wrong. Please try again.')
    })
  }, [user])

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
    const dbPatch: Record<string, unknown> = {}
    if (patch.title) dbPatch.title = patch.title
    if (patch.department !== undefined) dbPatch.department = patch.department
    if (patch.location !== undefined) dbPatch.location = patch.location
    if (patch.stage) {
      const stageMap: Record<string, string> = { Active: 'active', Paused: 'paused', Draft: 'draft' }
      dbPatch.stage = stageMap[patch.stage] ?? patch.stage
    }
    if (Object.keys(dbPatch).length > 0) dbUpdateJob(id, dbPatch).catch((err) => {
      console.error('Failed to update job:', err)
      toast.error('Something went wrong. Please try again.')
    })
  }, [])

  const myRequests = useMemo(() => {
    return requests.filter((r) => r.requesterId === user?.id)
  }, [requests, user])
  const myReferralCount = myRequests.length
  const myAcceptedCount = useMemo(() => myRequests.filter((r) => r.status === 'accepted').length, [myRequests])
  const myPendingCount = useMemo(() => myRequests.filter((r) => r.status === 'pending').length, [myRequests])
  const myRejectedCount = useMemo(() => myRequests.filter((r) => r.status === 'rejected').length, [myRequests])

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
    ]
    return Math.round((checks.filter(Boolean).length / 6) * 100)
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
            : r.status === 'rejected'
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

  const login = useCallback((r: Role) => { setRole(r); setAuthed(true) }, [])

  const logout = useCallback(() => {
    setAuthed(false)
    setIsAdmin(false)
    setDemoMode(false)
    initialRoleLoaded.current = false
    reminderSentRef.current = false
    setProfessionals([])
    setRequests([])
    setRequestTimestamps([])
    setConversations([])
    setBookmarks([])
    setNotifications([])
    setJobs([])
    setCandidates([])
    setSavedCandidates([])
    setStudent((prev) => ({ ...prev, name: '', email: '' }))
  }, [])

  const value = useMemo<AppState>(() => ({
    role,
    setRole,
    isAdmin,
    authed,
    loading,
    login,
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
    referralsSentToday,
    canSendReferral,
    nextReferralReset,

    conversations,
    setConversations,
    sendMessage,
    markConversationRead,

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
    visibleProfessionals: demoMode ? professionals : professionals.filter((p) => !p.email?.endsWith('@demo.com')),
    getUserOnlineStatus,
    npsOpen,
    setNpsOpen,
  }), [
    role, authed, loading, login, logout, professionals, updateProfessional, updateRecruiter,
    student, updateStudent, addStudentCertification, removeStudentCertification, addStudentAchievement, removeStudentAchievement, addStudentProject, removeStudentProject, addStudentSkill, removeStudentSkill, addStudentExperience, removeStudentExperience, addStudentEducation, removeStudentEducation, setStudentResume, removeStudentResume,
    bookmarks, toggleBookmark, savedCandidates, toggleCandidate,
    requests, addRequest, setRequestStatus, advancePipelineStage, referralsSentToday, canSendReferral, nextReferralReset,
    conversations, setConversations, sendMessage, markConversationRead,
    notifications, markNotificationRead, markAllNotificationsRead, unreadNotificationCount,
    jobs, setJobs, updateJob, candidates, refreshCandidates,
    myReferralCount, myAcceptedCount, myPendingCount, myRejectedCount,
    demoMode, toggleDemoMode, activity, getUserOnlineStatus,
    npsOpen, setNpsOpen,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
