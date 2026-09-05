import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, CheckCircle, Search, Upload, X, Briefcase, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { ROLE_ROUTE, RECRUITER_VISIBLE } from '@/data/mock'
import type { Role } from '@/data/mock'

const ONBOARDING_DISMISSED_KEY = 'onboarding_dismissed'

function getSteps(role: Role) {
  const base = ROLE_ROUTE[role]

  if (role === 'professional') {
    return [
      {
        icon: Building2,
        title: 'Set up your referrer profile',
        description: 'Add your company, role, and the positions you can refer for so candidates can find you.',
        action: 'Set up profile',
        to: `${base}/profile`,
        gradient: 'from-[#6366F1] to-[#8B5CF6]',
      },
      {
        icon: Briefcase,
        title: 'Set your referral availability',
        description: 'Choose how many referrals you can handle per month and write your referral policy.',
        action: 'Configure availability',
        to: `${base}/profile`,
        gradient: 'from-sky-500 to-cyan-400',
      },
      {
        icon: CheckCircle,
        title: 'Review your first request',
        description: 'When candidates send referral requests, they appear in your inbox. Accept, pass, or ask for more info.',
        action: 'Go to Inbox',
        to: `${base}/referrals`,
        gradient: 'from-emerald-500 to-teal-400',
      },
    ]
  }

  if (role === 'recruiter' && RECRUITER_VISIBLE) {
    return [
      {
        icon: Building2,
        title: 'Complete your company profile',
        description: 'Add your company details, open positions, and benefits so candidates understand your offerings.',
        action: 'Set up profile',
        to: `${base}/profile`,
        gradient: 'from-[#6366F1] to-[#8B5CF6]',
      },
      {
        icon: Search,
        title: 'Find referral-warmed talent',
        description: 'Browse candidates who have been referred by verified insiders — they are more engaged and qualified.',
        action: 'Find Talent',
        to: `${base}/talent`,
        gradient: 'from-emerald-500 to-teal-400',
      },
      {
        icon: CheckCircle,
        title: 'Post a referral-friendly job',
        description: 'Create job listings that encourage employee referrals and track referral-driven hires.',
        action: 'Post a Job',
        to: `${base}/jobs`,
        gradient: 'from-sky-500 to-cyan-400',
      },
    ]
  }

  // Default: student / job seeker
  return [
    {
      icon: CheckCircle,
      title: 'Complete your profile',
      description: 'Add your headline, experience, skills, and education so professionals know who you are.',
      action: 'Go to Profile',
      to: `${base}/profile`,
      gradient: 'from-[#6366F1] to-[#8B5CF6]',
    },
    {
      icon: Upload,
      title: 'Upload your resume',
      description: 'Attach your resume so professionals can review your background before accepting referral requests.',
      action: 'Upload Resume',
      to: `${base}/profile`,
      gradient: 'from-sky-500 to-cyan-400',
    },
    {
      icon: Search,
      title: 'Find professionals',
      description: 'Browse verified professionals from top companies and request referrals that advance your career.',
      action: 'Find Professionals',
      to: `${base}/professionals`,
      gradient: 'from-emerald-500 to-teal-400',
    },
  ]
}

export function OnboardingOverlay() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  const role: Role = (user?.user_metadata?.role as Role) || 'student'
  const steps = getSteps(role)

  useEffect(() => {
    if (!user) return
    if (localStorage.getItem(ONBOARDING_DISMISSED_KEY)) return

    // Check if profile is incomplete based on role
    const meta = user.user_metadata
    const needsOnboarding =
      meta?.openToWork === false || !meta?.headline || meta.headline === ''
    if (needsOnboarding) {
      setShow(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }
  }, [user])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => setShow(false), 300)
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      handleDismiss()
    }
  }

  const handleStepAction = (to: string) => {
    handleDismiss()
    navigate(to)
  }

  if (!show) return null

  const current = steps[step]

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding"
    >
      <div className={`transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-[0.97]'}`}>
        <Card className="w-full max-w-md shadow-2xl shadow-soft">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">
                Step {step + 1} of {steps.length}
              </div>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss onboarding">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 flex flex-col items-center text-center">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${current.gradient} text-white shadow-lg`}>
                <current.icon className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{current.title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{current.description}</p>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-border'}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  Skip
                </Button>
                {step < steps.length - 1 ? (
                  <Button size="sm" onClick={handleNext} className="rounded-full bg-primary">
                    Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleStepAction(current.to)} className="rounded-full bg-primary">
                    {current.action} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
