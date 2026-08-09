import { lazy, Suspense, useEffect, useState } from 'react'
import { Route, Routes, Navigate, useNavigate, useLocation } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AppProvider, useApp } from '@/context/AppContext'
import AppShell from '@/components/layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { HeadManager } from '@/components/HeadManager'
import { OnboardingOverlay } from '@/components/OnboardingOverlay'
import { NPSSurveyModal } from '@/components/NPSSurveyModal'
import { ROLE_ROUTE, ROLE_MESSAGES_ROUTE, type Role } from '@/data/mock'

const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const StudentDashboard = lazy(() => import('@/pages/StudentDashboard'))
const ProfessionalDashboard = lazy(() => import('@/pages/ProfessionalDashboard'))
const RecruiterDashboard = lazy(() => import('@/pages/RecruiterDashboard'))
const StudentProfile = lazy(() => import('@/pages/StudentProfile'))
const ProfessionalProfile = lazy(() => import('@/pages/ProfessionalProfile'))
const RecruiterProfile = lazy(() => import('@/pages/RecruiterProfile'))
const FindProfessionals = lazy(() => import('@/pages/FindProfessionals'))
const ProfessionalPublic = lazy(() => import('@/pages/ProfessionalPublic'))
const RecruiterPublic = lazy(() => import('@/pages/RecruiterPublic'))
const JobSeekerPublic = lazy(() => import('@/pages/JobSeekerPublic'))
const RequestReferral = lazy(() => import('@/pages/RequestReferral'))
const MyReferrals = lazy(() => import('@/pages/MyReferrals'))
const ReferralInbox = lazy(() => import('@/pages/ReferralInbox'))

const RecruiterJobs = lazy(() => import('@/pages/RecruiterJobs'))
const BrowseJobs = lazy(() => import('@/pages/RecruiterJobs').then((m) => ({ default: m.BrowseJobsView })))
const TalentSearch = lazy(() => import('@/pages/TalentSearch'))
const Messages = lazy(() => import('@/pages/Messages'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Settings = lazy(() => import('@/pages/Settings'))
const Help = lazy(() => import('@/pages/Help'))
const Admin = lazy(() => import('@/pages/Admin'))
const NotificationsPage = lazy(() => import('@/pages/Network').then((m) => ({ default: m.NotificationsPage })))
const BookmarksPage = lazy(() => import('@/pages/Network').then((m) => ({ default: m.BookmarksPage })))
const ActivityPage = lazy(() => import('@/pages/Network').then((m) => ({ default: m.ActivityPage })))
const NotFound = lazy(() => import('@/pages/NotFound'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))

function LazyErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

function DashboardRedirect() {
  const { role } = useApp()
  return <Navigate to={ROLE_ROUTE[role]} replace />
}

function MessagesRedirect() {
  const { role } = useApp()
  return <Navigate to={ROLE_MESSAGES_ROUTE[role]} replace />
}

function Profile() {
  const { role } = useApp()
  if (role === 'professional' || role === 'admin') return <ProfessionalProfile />
  if (role === 'recruiter') return <RecruiterProfile />
  return <StudentProfile />
}

const PUBLIC_PATHS = new Set(['/', '/login', '/forgot-password', '/reset-password'])
const POST_AUTH_PATHS = new Set(['/verify-email', '/auth/callback'])

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { authed, role } = useApp()
  const { pathname } = useLocation()

  if (loading) {
    return null
  }

  if (user && authed && (PUBLIC_PATHS.has(pathname) || POST_AUTH_PATHS.has(pathname))) {
    return <Navigate to={ROLE_ROUTE[role]} replace />
  }

  return <>{children}</>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, emailVerified } = useAuth()
  const { authed } = useApp()

  if (loading) {
    return null
  }

  if (!user) return <Navigate to="/login" replace />
  if (!authed) {
    return null
  }
  if (!emailVerified) return <Navigate to="/verify-email" replace />
  return <>{children}</>
}

function RequireRole({ allowed, children }: { allowed: Role[]; children: React.ReactNode }) {
  const { role } = useApp()
  if (role === 'admin') {
    // Admin bypass — but redirect away from student/professional/recruiter workspace routes
    const { pathname } = useLocation()
    const isNonAdminWorkspace = pathname.startsWith('/job-seeker') || pathname.startsWith('/professional') || pathname.startsWith('/recruiter')
    if (isNonAdminWorkspace) return <Navigate to="/admin" replace />
    return <>{children}</>
  }
  if (!allowed.includes(role)) return <Navigate to={ROLE_ROUTE[role]} replace />
  return <>{children}</>
}

function RecoveryHandler() {
  const [isRecovery, setIsRecovery] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setIsRecovery(true)
    }
  }, [])

  useEffect(() => {
    if (isRecovery) {
      navigate('/reset-password', { replace: true })
    }
  }, [isRecovery, navigate])

  return null
}

function NPSModal() {
  const { npsOpen, setNpsOpen } = useApp()
  const { user } = useAuth()
  return <NPSSurveyModal open={npsOpen} onOpenChange={setNpsOpen} userId={user?.id} />
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <AppProvider>
            <ErrorBoundary>
              <HeadManager />
              <OnboardingOverlay />
              <RecoveryHandler />
              <LazyErrorBoundary>
              <Routes>
                {/* ── Public routes (redirect authenticated users to dashboard) ── */}
                <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
                <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
                <Route path="/auth/callback" element={<PublicRoute><AuthCallback /></PublicRoute>} />
                <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />

                {/* ── Public profile pages (accessible by anyone) ── */}
                <Route path="/job-seekers/:id" element={<JobSeekerPublic />} />
                <Route path="/professionals/:id" element={<ProfessionalPublic />} />
                <Route path="/company/:id" element={<RecruiterPublic />} />

                {/* ── Protected routes (auth + layout) ── */}
                <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                  <Route path="/dashboard" element={<DashboardRedirect />} />

                  {/* ── Job Seeker routes ── */}
                  <Route path="/job-seeker" element={<Navigate to="/job-seeker/dashboard" replace />} />
                  <Route path="/job-seeker/dashboard" element={<RequireRole allowed={['student', 'admin']}><StudentDashboard /></RequireRole>} />
                  <Route path="/job-seeker/profile" element={<RequireRole allowed={['student', 'admin']}><Profile /></RequireRole>} />
                  <Route path="/job-seeker/applications" element={<RequireRole allowed={['student', 'admin']}><MyReferrals /></RequireRole>} />
                  <Route path="/job-seeker/professionals" element={<RequireRole allowed={['student', 'admin']}><FindProfessionals /></RequireRole>} />
                  <Route path="/job-seeker/browse-jobs" element={<RequireRole allowed={['student', 'admin']}><BrowseJobs /></RequireRole>} />
                  <Route path="/job-seeker/request-referral" element={<RequireRole allowed={['student', 'admin']}><RequestReferral /></RequireRole>} />
                  <Route path="/job-seeker/request-referral/:id" element={<RequireRole allowed={['student', 'admin']}><RequestReferral /></RequireRole>} />

                  {/* ── Professional routes ── */}
                  <Route path="/professional" element={<Navigate to="/professional/dashboard" replace />} />
                  <Route path="/professional/dashboard" element={<RequireRole allowed={['professional', 'admin']}><ProfessionalDashboard /></RequireRole>} />
                  <Route path="/professional/profile" element={<RequireRole allowed={['professional', 'admin']}><Profile /></RequireRole>} />
                  <Route path="/professional/referrals" element={<RequireRole allowed={['professional', 'admin']}><ReferralInbox /></RequireRole>} />
                  <Route path="/professional/talent" element={<RequireRole allowed={['professional', 'admin']}><TalentSearch /></RequireRole>} />
                  <Route path="/professional/professionals" element={<RequireRole allowed={['professional', 'admin']}><FindProfessionals /></RequireRole>} />
                  <Route path="/professional/browse-jobs" element={<RequireRole allowed={['professional', 'admin']}><BrowseJobs /></RequireRole>} />

                  {/* ── Recruiter routes ── */}
                  <Route path="/recruiter" element={<Navigate to="/recruiter/dashboard" replace />} />
                  <Route path="/recruiter/dashboard" element={<RequireRole allowed={['recruiter', 'admin']}><RecruiterDashboard /></RequireRole>} />
                  <Route path="/recruiter/profile" element={<RequireRole allowed={['recruiter', 'admin']}><Profile /></RequireRole>} />
                  <Route path="/recruiter/jobs" element={<RequireRole allowed={['recruiter', 'admin']}><RecruiterJobs /></RequireRole>} />
                  <Route path="/recruiter/talent" element={<RequireRole allowed={['recruiter', 'admin']}><TalentSearch /></RequireRole>} />

                  {/* ── Admin routes (tab-driven) ── */}
                  <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
                  <Route path="/admin/:tab" element={<RequireRole allowed={['admin']}><Admin /></RequireRole>} />
                  <Route path="/admin/messages" element={<RequireRole allowed={['admin']}><Messages /></RequireRole>} />

                  {/* ── Shared routes (all authenticated roles) ── */}
                  <Route path="/messages" element={<MessagesRedirect />} />
                  <Route path="/job-seeker/messages" element={<Messages />} />
                  <Route path="/professional/messages" element={<Messages />} />
                  <Route path="/recruiter/messages" element={<Messages />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/bookmarks" element={<RequireRole allowed={['student']}><BookmarksPage /></RequireRole>} />
                  <Route path="/activity" element={<RequireRole allowed={['student', 'professional']}><ActivityPage /></RequireRole>} />
                  <Route path="/analytics" element={<RequireRole allowed={['student', 'professional']}><Analytics /></RequireRole>} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/help" element={<Help />} />

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
              </LazyErrorBoundary>
            </ErrorBoundary>
            <Toaster richColors position="bottom-right" />
            <NPSModal />
          </AppProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
