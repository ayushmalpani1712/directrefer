import { lazy, Suspense, useEffect, useState } from 'react'
import { Route, Routes, Navigate, useNavigate, useLocation } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AppProvider, useApp } from '@/context/AppContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { HeadManager } from '@/components/HeadManager'
import { ROLE_ROUTE, ROLE_MESSAGES_ROUTE, getRoleFromPath, type Role } from '@/data/mock'

const AppShell = lazy(() => import('@/components/layout'))
const OnboardingOverlay = lazy(() => import('@/components/OnboardingOverlay').then(m => ({ default: m.OnboardingOverlay })))
const NPSSurveyModal = lazy(() => import('@/components/NPSSurveyModal').then(m => ({ default: m.NPSSurveyModal })))
const CookieConsentBanner = lazy(() => import('@/components/CookieConsentBanner').then(m => ({ default: m.CookieConsentBanner })))

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
const AdminShell = lazy(() => import('@/pages/admin/AdminShell'))
const AdminOverview = lazy(() => import('@/pages/admin/Overview'))
const AdminUsers = lazy(() => import('@/pages/admin/Users'))
const AdminApprovals = lazy(() => import('@/pages/admin/Approvals'))
const AdminModeration = lazy(() => import('@/pages/admin/Moderation'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/Settings'))
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/Analytics'))
const AdminAuditLog = lazy(() => import('@/pages/admin/AuditLog'))
const NotificationsPage = lazy(() => import('@/pages/Network').then((m) => ({ default: m.NotificationsPage })))
const BookmarksPage = lazy(() => import('@/pages/Network').then((m) => ({ default: m.BookmarksPage })))
const ActivityPage = lazy(() => import('@/pages/Network').then((m) => ({ default: m.ActivityPage })))
const NotFound = lazy(() => import('@/pages/NotFound'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('@/pages/TermsOfService'))
const CookiePolicy = lazy(() => import('@/pages/CookiePolicy'))
const About = lazy(() => import('@/pages/About'))
const Contact = lazy(() => import('@/pages/Contact'))
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const ReferralJobs = lazy(() => import('@/pages/ReferralJobs'))
const CompanyReferral = lazy(() => import('@/pages/CompanyReferral'))
const AudiencePage = lazy(() => import('@/pages/AudiencePage').then(m => ({ default: m.default })))
const GuidesPage = lazy(() => import('@/pages/GuidesPage'))
const DataHub = lazy(() => import('@/pages/DataHub'))
const SuccessStoriesPage = lazy(() => import('@/pages/SuccessStoriesPage'))
const AcquisitionDashboard = lazy(() => import('@/pages/admin/AcquisitionDashboard'))

function LazyErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

function DashboardRedirect() {
  const { role, roleLoaded } = useApp()
  if (!roleLoaded) return null
  return <Navigate to={ROLE_ROUTE[role]} replace />
}

function MessagesRedirect() {
  const { role, roleLoaded } = useApp()
  if (!roleLoaded) return null
  return <Navigate to={ROLE_MESSAGES_ROUTE[role]} replace />
}

function Profile() {
  const { pathname } = useLocation()
  const urlRole = getRoleFromPath(pathname)
  if (urlRole === 'professional') return <ProfessionalProfile />
  if (urlRole === 'recruiter') return <RecruiterProfile />
  return <StudentProfile />
}

const PUBLIC_PATHS = new Set(['/', '/login', '/forgot-password', '/reset-password'])
const POST_AUTH_PATHS = new Set(['/verify-email', '/auth/callback'])

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { authed, role } = useApp()
  const { pathname } = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user && authed) {
    if (PUBLIC_PATHS.has(pathname) || POST_AUTH_PATHS.has(pathname)) {
      return <Navigate to={ROLE_ROUTE[role]} replace />
    }
  }

  return <>{children}</>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, emailVerified } = useAuth()
  const { authed } = useApp()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!authed) {
    return null
  }
  if (!emailVerified) return <Navigate to="/verify-email" replace />
  return <>{children}</>
}

function RequireRole({ allowed, children }: { allowed: Role[]; children: React.ReactNode }) {
  const { role, roleLoaded } = useApp()
  const { pathname } = useLocation()
  const urlRole = getRoleFromPath(pathname)

  if (!roleLoaded) {
    if (urlRole && allowed.includes(urlRole)) {
      return <>{children}</>
    }
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (role === 'admin') {
    return <>{children}</>
  }
  if (urlRole && allowed.includes(urlRole)) {
    return <>{children}</>
  }
  if (!allowed.includes(role)) return <Navigate to={ROLE_ROUTE[role]} replace />
  return <>{children}</>
}

function RecoveryHandler() {
  const [handleType, setHandleType] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setHandleType('recovery')
    } else if (hash && hash.includes('type=magiclink')) {
      setHandleType('magiclink')
    }
  }, [])

  useEffect(() => {
    if (handleType === 'recovery') {
      navigate('/reset-password', { replace: true })
    } else if (handleType === 'magiclink') {
      // Magic link session is already set by Supabase JS client
      window.history.replaceState(null, '', window.location.pathname)
      // The session is already set, AppProvider will detect it and redirect
      navigate('/dashboard', { replace: true })
    }
  }, [handleType, navigate])

  return null
}

function NPSModal() {
  const { npsOpen, setNpsOpen } = useApp()
  const { user } = useAuth()
  return <Suspense fallback={null}><NPSSurveyModal open={npsOpen} onOpenChange={setNpsOpen} userId={user?.id} /></Suspense>
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <AppProvider>
            <ErrorBoundary>
              <HeadManager />
              <Suspense fallback={null}><OnboardingOverlay /></Suspense>
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

                {/* ── Legal & informational pages ── */}
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/cookies" element={<CookiePolicy />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/help" element={<Help />} />
                <Route path="/referral-jobs" element={<ReferralJobs />} />

                {/* ── Phase 5: Audience landing pages ── */}
                <Route path="/for/freshers" element={<AudiencePage audience="freshers" />} />
                <Route path="/for/mba-students" element={<AudiencePage audience="mba-students" />} />
                <Route path="/for/career-switchers" element={<AudiencePage audience="career-switchers" />} />
                <Route path="/for/experienced" element={<AudiencePage audience="experienced" />} />
                <Route path="/guides" element={<GuidesPage />} />
                <Route path="/guides/:topic" element={<GuidesPage />} />

                {/* ── Data Hub ── */}
                <Route path="/data-hub" element={<DataHub />} />
                <Route path="/success-stories" element={<SuccessStoriesPage />} />
                <Route path="/success-stories/:slug" element={<SuccessStoriesPage />} />

                {/* ── Public profile pages (accessible by anyone) ── */}
                <Route path="/job-seekers/:id" element={<JobSeekerPublic />} />
                <Route path="/professionals/:id" element={<ProfessionalPublic />} />
                <Route path="/company/:id" element={<RecruiterPublic />} />

                {/* ── Programmatic SEO referral pages ── */}
                <Route path="/referral" element={<CompanyReferral />} />
                <Route path="/referral/:company" element={<CompanyReferral />} />
                <Route path="/referral/:company/:role" element={<CompanyReferral />} />
                <Route path="/referral/:company/:role/:location" element={<CompanyReferral />} />

                {/* ── Protected routes (auth + layout) ── */}
                <Route element={<RequireAuth><Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}><AppShell /></Suspense></RequireAuth>}>
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

                  {/* ── Admin routes (modular) ── */}
                  <Route path="/admin" element={<RequireRole allowed={['admin']}><AdminShell /></RequireRole>}>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path="overview" element={<AdminOverview />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="approvals" element={<AdminApprovals />} />
                    <Route path="moderation" element={<AdminModeration />} />
                    <Route path="analytics" element={<AdminAnalyticsPage />} />
                    <Route path="acquisition" element={<AcquisitionDashboard />} />
                    <Route path="settings" element={<AdminSettingsPage />} />
                    <Route path="audit-log" element={<AdminAuditLog />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="activity" element={<ActivityPage />} />
                    <Route path="help" element={<Help />} />
                  </Route>

                  {/* ── Shared routes (all authenticated roles) ── */}
                  <Route path="/messages" element={<MessagesRedirect />} />
                  <Route path="/job-seeker/messages" element={<Messages />} />
                  <Route path="/professional/messages" element={<Messages />} />
                  <Route path="/recruiter/messages" element={<Messages />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/job-seeker/notifications" element={<NotificationsPage />} />
                  <Route path="/professional/notifications" element={<NotificationsPage />} />
                  <Route path="/recruiter/notifications" element={<NotificationsPage />} />
                  <Route path="/bookmarks" element={<RequireRole allowed={['student']}><BookmarksPage /></RequireRole>} />
                  <Route path="/job-seeker/bookmarks" element={<RequireRole allowed={['student']}><BookmarksPage /></RequireRole>} />
                  <Route path="/activity" element={<ActivityPage />} />
                  <Route path="/job-seeker/activity" element={<ActivityPage />} />
                  <Route path="/professional/activity" element={<ActivityPage />} />
                  <Route path="/recruiter/activity" element={<ActivityPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/job-seeker/analytics" element={<Analytics />} />
                  <Route path="/professional/analytics" element={<Analytics />} />
                  <Route path="/recruiter/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/job-seeker/settings" element={<Settings />} />
                  <Route path="/professional/settings" element={<Settings />} />
                  <Route path="/recruiter/settings" element={<Settings />} />
                  <Route path="/job-seeker/help" element={<Help />} />
                  <Route path="/professional/help" element={<Help />} />
                  <Route path="/recruiter/help" element={<Help />} />

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
              </LazyErrorBoundary>
            </ErrorBoundary>
            <Toaster richColors position="bottom-right" />
            <NPSModal />
            <Suspense fallback={null}><CookieConsentBanner /></Suspense>
          </AppProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
