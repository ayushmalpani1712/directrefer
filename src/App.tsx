import { lazy, Suspense, useEffect, useState } from 'react'
import { Route, Routes, Navigate } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AppProvider, useApp } from '@/context/AppContext'
import AppShell from '@/components/layout'
import { ErrorBoundary, LazyErrorFallback } from '@/components/ErrorBoundary'
import { HeadManager } from '@/components/HeadManager'
import { OnboardingOverlay } from '@/components/OnboardingOverlay'

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
const RequestReferral = lazy(() => import('@/pages/RequestReferral'))
const MyReferrals = lazy(() => import('@/pages/MyReferrals'))
const ReferralInbox = lazy(() => import('@/pages/ReferralInbox'))

const RecruiterJobs = lazy(() => import('@/pages/RecruiterJobs'))
const TalentSearch = lazy(() => import('@/pages/TalentSearch'))
const Messages = lazy(() => import('@/pages/Messages'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Settings = lazy(() => import('@/pages/Settings'))
const Help = lazy(() => import('@/pages/Help'))
const Admin = lazy(() => import('@/pages/Admin'))
const NotificationsPage = lazy(() => import('@/pages/Network').then((m) => ({ default: m.NotificationsPage })))
const BookmarksPage = lazy(() => import('@/pages/Network').then((m) => ({ default: m.BookmarksPage })))
const ActivityPage = lazy(() => import('@/pages/Network').then((m) => ({ default: m.ActivityPage })))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))

function LazyErrorBoundary({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState(0)
  return (
    <ErrorBoundary key={key} fallback={<LazyErrorFallback error={new Error('Page failed to load')} resetErrorBoundary={() => setKey(k => k + 1)} />}>
      <Suspense fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      }>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

function Dashboard() {
  const { role } = useApp()
  if (role === 'professional' || role === 'admin') return <ProfessionalDashboard />
  if (role === 'recruiter') return <RecruiterDashboard />
  return <StudentDashboard />
}

function Profile() {
  const { role } = useApp()
  if (role === 'professional' || role === 'admin') return <ProfessionalProfile />
  if (role === 'recruiter') return <RecruiterProfile />
  return <StudentProfile />
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, emailVerified } = useAuth()
  const { authed } = useApp()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user && !authed) return <Navigate to="/login" replace />
  if (!emailVerified) return <Navigate to="/verify-email" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { role } = useApp()
  const { user } = useAuth()
  if (role !== 'admin' && user?.email !== 'ayushmalpani479@gmail.com') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function CatchAllRedirect() {
  const { user, loading } = useAuth()
  const { authed } = useApp()

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user || authed) return <Navigate to="/dashboard" replace />
  return <Navigate to="/login" replace />
}

function RecoveryHandler() {
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setIsRecovery(true)
    }
  }, [])

  if (isRecovery) {
    return <ResetPassword />
  }
  return null
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <AppProvider>
            <ErrorBoundary>
            <LazyErrorBoundary>
              <HeadManager />
              <OnboardingOverlay />
              <RecoveryHandler />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/professionals" element={<FindProfessionals />} />
                  <Route path="/professionals/:id" element={<ProfessionalPublic />} />
                  <Route path="/company/:id" element={<RecruiterPublic />} />
                  <Route path="/request-referral" element={<RequestReferral />} />
                  <Route path="/request-referral/:id" element={<RequestReferral />} />
                  <Route path="/applications" element={<MyReferrals />} />
                  <Route path="/requests" element={<ReferralInbox />} />
                  <Route path="/jobs" element={<RecruiterJobs />} />
                  <Route path="/talent" element={<TalentSearch />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/bookmarks" element={<BookmarksPage />} />
                  <Route path="/activity" element={<ActivityPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
                  <Route path="/help" element={<Help />} />
                  <Route path="*" element={<CatchAllRedirect />} />
                </Route>
              </Routes>
            </LazyErrorBoundary>
            </ErrorBoundary>
            <Toaster richColors position="bottom-right" />
          </AppProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
