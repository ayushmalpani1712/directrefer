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
import { maybeRunPipeline } from '@/lib/lifecycle'
import { supabase, setPresence, advanceReferralPipeline as dbAdvancePipeline } from '@/lib/supabase'
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
  return `${Math.floor(days / 7)}w ago`
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
  authed: boolean
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
  logActivity: (action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) => Promise<void>

  jobs: Job[]
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>
  updateJob: (id: string, patch: Partial<Job>) => void

  candidates: { id: string; name: string; role: string; company: string; stage: string; rating: number; source: string; gradient: string; skills: string[]; location: string; exp: number }[]

  myReferralCount: number
  myAcceptedCount: number
  myPendingCount: number
  myRejectedCount: number

  demoMode: boolean
  toggleDemoMode: () => void
  visibleProfessionals: Professional[]
  userPresenceMap: Record<string, boolean>
  getUserOnlineStatus: (userId: string) => boolean
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [role, setRole] = useState<Role>('student')
  const [authed, setAuthed] = useState(false)
  const [demoMode, setDemoMode] = useState(true)
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
  const [activity, setActivity] = useState<{ id: string; kind: string; text: string; time: string }[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<{ id: string; name: string; role: string; company: string; stage: string; rating: number; source: string; gradient: string; skills: string[]; location: string; exp: number }[]>([])
  const [userPresenceMap, setUserPresenceMap] = useState<Record<string, boolean>>({})

  // ── Load real data from Supabase when user is authenticated ──
  useEffect(() => {
    if (!user) return

    async function loadRealData() {
      const userId = user!.id
      const meta = user!.user_metadata

      // Read role from the users table (source of truth) instead of auth metadata
      let userRole = 'job_seeker'
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
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
        dbFetchCandidates(),
      ])

      if (profs.status === 'fulfilled' && profs.value.length > 0) setProfessionals(profs.value)
      if (refs.status === 'fulfilled') setRequests(refs.value)
      if (convs.status === 'fulfilled' && convs.value.length > 0) setConversations(convs.value)
      if (bms.status === 'fulfilled') setBookmarks(bms.value)
      if (notifs.status === 'fulfilled' && notifs.value.length > 0) setNotifications(notifs.value)
      if (jbs.status === 'fulfilled' && jbs.value.length > 0) setJobs(jbs.value)
      if (cands.status === 'fulfilled' && cands.value.length > 0) setCandidates(cands.value)

      // Set student profile from auth metadata
      const displayName = meta?.full_name || meta?.name || user!.email?.split('@')[0] || ''
      if (mappedRole === 'student') {
        setStudent((prev) => ({
          ...prev,
          name: displayName,
          email: user!.email || prev.email,
        }))

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
            openToWork: profileData.open_to_work ?? prev.openToWork,
            certifications: typeof profileData.certifications === 'string' ? JSON.parse(profileData.certifications) : (profileData.certifications ?? prev.certifications),
            achievements: typeof profileData.achievements === 'string' ? JSON.parse(profileData.achievements) : (profileData.achievements ?? prev.achievements),
            projects: typeof profileData.projects === 'string' ? JSON.parse(profileData.projects) : (profileData.projects ?? prev.projects),
            preferredCompanies: profileData.preferred_companies ?? prev.preferredCompanies,
            skills: profileData.skills ?? prev.skills,
            links: {
              linkedin: profileData.portfolio_url ?? prev.links.linkedin,
              github: profileData.github_url ?? prev.links.github,
              website: profileData.website ?? prev.links.website,
            },
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

// Load activity logs
      if (userId) {
        const { data: activityData } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
        if (activityData) {
          setActivity(activityData.map(a => ({
            id: a.id,
            kind: a.entity_type,
            text: a.action,
            time: new Date(a.created_at).toLocaleString()
          })))
        }
      }

      // Load saved candidates (recruiter)
      const { data: savedData } = await supabase
        .from('saved_candidates')
        .select('candidate_id')
        .eq('recruiter_id', userId)
      if (savedData) {
        setSavedCandidates(savedData.map(s => s.candidate_id))
      }
    }

    loadRealData()
    maybeRunPipeline()
    // Request browser notification permission (non-blocking)
    requestNotificationPermission()

    // ── Real-time: notifications ──
    const notifChannel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
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
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=neq.${user!.id}` },
        (payload) => {
          const msg = payload.new as { id: string; conversation_id?: string; sender_id?: string; content?: string; created_at: string }
          if (!msg.conversation_id || !msg.sender_id) return

          setConversations((prev) =>
            prev.map((c) =>
              c.id === msg.conversation_id
                ? {
                    ...c,
                    lastMessage: msg.content ?? c.lastMessage,
                    time: formatRelativeTime(msg.created_at),
                    unread: c.unread + 1,
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
        { event: 'UPDATE', schema: 'public', table: 'referrals' },
        (payload) => {
          const ref = payload.new as { status?: string; requester_id?: string; job_title?: string }
          fetchReferrals(user!.id).then((refs) => setRequests(refs))
          // Show browser notification on status change
          if (ref.status && ref.status !== 'pending' && ref.job_title) {
            notifyReferralUpdate('A candidate', ref.status, ref.job_title)
          }
        }
      )
      .subscribe()

    // ── Presence: set online + heartbeat ──
    setPresence(user!.id, true).catch(() => {
      // Presence is best-effort, don't show errors
    })
    const heartbeat = setInterval(() => {
      setPresence(user!.id, true).catch(() => {})
    }, 60_000)

    const presenceChannel2 = supabase.channel('presence-global')
    presenceChannel2.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_presence' },
      (payload) => {
        const row = payload.new as { user_id: string; online: boolean }
        setUserPresenceMap((prev) => ({ ...prev, [row.user_id]: row.online }))
      }
    ).subscribe()

    // Load initial presence for all professionals
    supabase.from('user_presence').select('user_id,online').then(({ data }) => {
      if (data) {
        const map: Record<string, boolean> = {}
        data.forEach((r: { user_id: string; online: boolean }) => { map[r.user_id] = r.online })
        setUserPresenceMap(map)
      }
    })

    return () => {
      clearInterval(heartbeat)
      const uid = user?.id
      if (uid) setPresence(uid, false).catch(() => {})
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(refChannel)
      supabase.removeChannel(presenceChannel2)
    }
  }, [user])

  const referralsSentToday = useMemo(() => {
    const now = Date.now()
    return requestTimestamps.filter((t) => now - t < RATE_WINDOW_MS).length
  }, [requestTimestamps])

  const canSendReferral = referralsSentToday < RATE_LIMIT

  const nextReferralReset = useMemo(() => {
    if (requestTimestamps.length === 0) return 'Now'
    const oldest = Math.min(...requestTimestamps.filter((t) => Date.now() - t < RATE_WINDOW_MS))
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
      const userPatch: Record<string, unknown> = {}
      if (patch.company_name) userPatch.full_name = patch.company_name
      if (Object.keys(userPatch).length > 0) dbUpdateUserProfile(user.id, userPatch).catch(() => {})

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
      if (patch.email !== undefined) userPatch.mobile = patch.email
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
      if (patch.experience !== undefined) profilePatch.experience_years = patch.experience.length
      if (patch.education?.[0]?.school) profilePatch.college = patch.education[0].school
      if (patch.education?.[0]?.degree) profilePatch.qualification = patch.education[0].degree
      if (patch.education?.[0]?.period) {
        const year = parseInt(patch.education[0].period)
        if (!isNaN(year)) profilePatch.graduation_year = year
      }
      if (patch.links?.linkedin) profilePatch.portfolio_url = patch.links.linkedin
      if (patch.links?.github) profilePatch.github_url = patch.links.github
      if (patch.headline !== undefined) profilePatch.headline = patch.headline
      if (patch.openToWork !== undefined) profilePatch.open_to_work = patch.openToWork
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
      if (user) dbUpdateJobSeekerProfile(user.id, { certifications: JSON.stringify(next) }).catch(() => {})
      return { ...prev, certifications: next }
    })
  }, [user])

  const addStudentAchievement = useCallback((ach: string) => {
    setStudent((prev) => {
      const next = [...prev.achievements, ach]
      if (user) dbUpdateJobSeekerProfile(user.id, { achievements: JSON.stringify(next) }).catch(() => {})
      return { ...prev, achievements: next }
    })
  }, [user])

  const addStudentProject = useCallback((proj: { name: string; desc: string; tags: string[] }) => {
    setStudent((prev) => {
      const next = [...prev.projects, proj]
      if (user) dbUpdateJobSeekerProfile(user.id, { projects: JSON.stringify(next) }).catch(() => {})
      return { ...prev, projects: next }
    })
  }, [user])

  const addStudentSkill = useCallback((skill: string) => {
    setStudent((prev) => {
      const next = [...prev.skills, skill]
      if (user) dbUpdateJobSeekerProfile(user.id, { skills: next }).catch(() => {})
      return { ...prev, skills: next }
    })
  }, [user])

  const removeStudentSkill = useCallback((skill: string) => {
    setStudent((prev) => {
      const next = prev.skills.filter((s) => s !== skill)
      if (user) dbUpdateJobSeekerProfile(user.id, { skills: next }).catch(() => {})
      return { ...prev, skills: next }
    })
  }, [user])

  const removeStudentCertification = useCallback((cert: string) => {
    setStudent((prev) => {
      const next = prev.certifications.filter((c) => c !== cert)
      if (user) dbUpdateJobSeekerProfile(user.id, { certifications: JSON.stringify(next) }).catch(() => {})
      return { ...prev, certifications: next }
    })
  }, [user])

  const removeStudentAchievement = useCallback((ach: string) => {
    setStudent((prev) => {
      const next = prev.achievements.filter((a) => a !== ach)
      if (user) dbUpdateJobSeekerProfile(user.id, { achievements: JSON.stringify(next) }).catch(() => {})
      return { ...prev, achievements: next }
    })
  }, [user])

  const removeStudentProject = useCallback((name: string) => {
    setStudent((prev) => {
      const next = prev.projects.filter((p) => p.name !== name)
      if (user) dbUpdateJobSeekerProfile(user.id, { projects: JSON.stringify(next) }).catch(() => {})
      return { ...prev, projects: next }
    })
  }, [user])

  const addStudentExperience = useCallback((exp: { title: string; org: string; period: string; desc: string }) => {
    setStudent((prev) => {
      const next = [...prev.experience, exp]
      if (user) dbUpdateJobSeekerProfile(user.id, { experience_years: next.length }).catch(() => {})
      return { ...prev, experience: next }
    })
  }, [user])

  const removeStudentExperience = useCallback((index: number) => {
    setStudent((prev) => {
      const next = prev.experience.filter((_, i) => i !== index)
      if (user) dbUpdateJobSeekerProfile(user.id, { experience_years: next.length }).catch(() => {})
      return { ...prev, experience: next }
    })
  }, [user])

  const addStudentEducation = useCallback((edu: { school: string; degree: string; period: string; detail: string }) => {
    setStudent((prev) => {
      const next = [...prev.education, edu]
      if (user) dbUpdateJobSeekerProfile(user.id, { college: edu.school, qualification: edu.degree }).catch(() => {})
      return { ...prev, education: next }
    })
  }, [user])

  const removeStudentEducation = useCallback((index: number) => {
    setStudent((prev) => {
      const next = prev.education.filter((_, i) => i !== index)
      if (user) dbUpdateJobSeekerProfile(user.id, { college: next[0]?.school || undefined, qualification: next[0]?.degree || undefined }).catch(() => {})
      return { ...prev, education: next }
    })
  }, [user])

  const removeStudentResume = useCallback(() => {
    setStudent((prev) => {
      const { resumeFile: _, ...rest } = prev
      return rest
    })
  }, [])

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
      const next = prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
      // Persist to DB
      if (user) {
        if (prev.includes(candidateId)) {
          supabase.from('saved_candidates').delete()
            .eq('recruiter_id', user.id)
            .eq('candidate_id', candidateId)
        } else {
          supabase.from('saved_candidates').insert({
            recruiter_id: user.id,
            candidate_id: candidateId
          })
        }
      }
      return next
    })
  }, [user])

  // Activity logging - must be defined before addRequest/setRequestStatus use it
  const logActivity = useCallback(async (action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) => {
    if (!user) return
    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        actor_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata: metadata ?? {}
      })
    } catch (err) {
      console.error('Failed to log activity:', err)
    }
  }, [user])

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
        if (newRequest) {
          logActivity('referral_requested', 'referral', newRequest.id, { professional: professionals.find(p => p.id === r.professionalId)?.name })
        }
      }).catch((err) => {
        console.error('Failed to create referral:', err)
        toast.error('Failed to save referral — please try again')
      })
    }
    // Insert notification into DB
    if (user && r.professionalId) {
      supabase.from('notifications').insert({
        user_id: r.professionalId,
        type: 'referral_request',
        title: 'New Referral Request',
        description: `${student.name} has requested a referral from you`,
      }).select().single().then(({ data: notifData }) => {
        if (notifData) {
          setNotifications((prev) => [notifData as AppNotification, ...prev])
        }
      }, (err: unknown) => {
        console.error('Failed to create notification:', err)
      })
    }
  }, [user, student.name, professionals, logActivity])

  const setRequestStatus = useCallback((id: string, status: ReferralRequest['status']) => {
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const updated = { ...r, status }
      if (status === 'accepted') {
        updated.pipelineStage = 'accepted'
        updated.progress = 75
      }
      return updated
    }))
    const req = requests.find((r) => r.id === id)
    if (req && (status === 'accepted' || status === 'rejected')) {
      // Persist to Supabase
      if (status === 'accepted' || status === 'rejected') {
        dbUpdateReferralStatus(id, status as 'accepted' | 'rejected').catch((err) => {
          console.error('Failed to update referral status:', err)
          toast.error('Something went wrong. Please try again.')
        })
      }
      const professional = professionals.find((p) => p.id === req.professionalId)
      logActivity(`referral_${status}`, 'referral', req.id, { professional: professional?.name })
      // Insert notification into DB
      if (user) {
        supabase.from('notifications').insert({
          user_id: req.professionalId,
          type: `referral_${status}`,
          title: `Referral ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          description: `Your referral request for ${req.role} has been ${status}`,
        }).select().single().then(({ data: notifData }) => {
          if (notifData) {
            setNotifications((prev) => [notifData as AppNotification, ...prev])
          }
        }, (err: unknown) => {
          console.error('Failed to create notification:', err)
        })
      }
      // Send email notification to student
      if (req.studentEmail) {
        const proName = professional?.name || 'the professional'
        sendReferralStatusEmail(req.studentEmail, req.student, proName, req.role, status as 'accepted' | 'rejected')
          .catch(() => {})
      }
    }
  }, [requests, professionals, user, logActivity])

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
            sendReminderEmail(pro.email, pro.name, r.student, r.role, daysPending).catch(() => {})
          }
        }
      })
  }, [requests, professionals, user])

  const advancePipelineStage = useCallback((id: string) => {
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const stages = PIPELINE_STAGES.map((s) => s.key)
      const currentIdx = stages.indexOf(r.pipelineStage)
      if (currentIdx < stages.length - 1) {
        const nextStage = stages[currentIdx + 1]
        dbAdvancePipeline(id, nextStage).catch((err) => { console.error('Failed to advance pipeline:', err); toast.error('Something went wrong. Please try again.') })
        return { ...r, pipelineStage: nextStage, progress: Math.round(((currentIdx + 1) / (stages.length - 1)) * 100) }
      }
      return r
    }))
  }, [])

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const newMsg: Message = {
      id: `mm-${Date.now()}`,
      from: 'me',
      text,
      time: 'Just now',
      read: true,
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
      const conv = conversations.find(c => c.id === conversationId)
      const participantName = conv?.name || 'unknown'
      dbSendMessage(conversationId, user.id, text).then(() => {
        logActivity('message_sent', 'message', conversationId, { to: participantName })
      }).catch((err) => {
        console.error('Failed to send message:', err)
        toast.error('Message failed to send')
      })
    }
  }, [user, conversations, logActivity])

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
    const name = student.name
    return requests.filter((r) => r.student === name)
  }, [requests, student.name])
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

  const visibleProfessionals = useMemo(
    () => demoMode ? professionals : [],
    [demoMode, professionals],
  )

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

  // Trigger lifecycle pipeline on app load (non-blocking, max once per 30 min)
  useEffect(() => {
    maybeRunPipeline()
  }, [])

  const value = useMemo<AppState>(() => ({
    role,
    setRole,
    authed,
    login: (r) => { setRole(r); setAuthed(true) },
    logout: () => setAuthed(false),

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
    logActivity,

    jobs,
    setJobs,
    updateJob,

    candidates,

    myReferralCount,
    myAcceptedCount,
    myPendingCount,
    myRejectedCount,

    demoMode,
    toggleDemoMode,
    visibleProfessionals,
    userPresenceMap,
    getUserOnlineStatus: (userId: string) => userPresenceMap[userId] ?? false,
  }), [
    role, authed, professionals, updateProfessional, updateRecruiter,
    student, updateStudent, addStudentCertification, removeStudentCertification, addStudentAchievement, removeStudentAchievement, addStudentProject, removeStudentProject, addStudentSkill, removeStudentSkill, addStudentExperience, removeStudentExperience, addStudentEducation, removeStudentEducation, setStudentResume, removeStudentResume,
    bookmarks, toggleBookmark, savedCandidates, toggleCandidate,
    requests, addRequest, setRequestStatus, advancePipelineStage, referralsSentToday, canSendReferral, nextReferralReset,
    conversations, setConversations, sendMessage, markConversationRead,
    notifications, markNotificationRead, markAllNotificationsRead, unreadNotificationCount,
    activity, logActivity, jobs, setJobs, updateJob, candidates,
    myReferralCount, myAcceptedCount, myPendingCount, myRejectedCount,
    demoMode, toggleDemoMode, visibleProfessionals, userPresenceMap,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
