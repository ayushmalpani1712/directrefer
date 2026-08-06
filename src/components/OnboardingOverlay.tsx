import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle, Search, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { ROLE_ROUTE } from '@/data/mock'
import type { Role } from '@/data/mock'

const ONBOARDING_DISMISSED_KEY = 'onboarding_dismissed'

function getSteps(role: Role) {
  const base = ROLE_ROUTE[role]
  const findProfessionalsPath = role === 'recruiter' ? `${base}/talent` : `${base}/professionals`
  return [
    {
      icon: CheckCircle,
      title: 'Complete your profile',
      description: 'Add your headline, bio, skills, and experience so professionals know who you are.',
      action: 'Go to Profile',
      to: `${base}/profile`,
      gradient: 'from-[#3B5FE5] to-[#8B8FD4]',
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
      title: role === 'recruiter' ? 'Find talent' : 'Find professionals',
      description: role === 'recruiter'
        ? 'Search referral-warmed talent and build your hiring pipeline.'
        : 'Browse verified professionals from top companies and request referrals that advance your career.',
      action: role === 'recruiter' ? 'Find Talent' : 'Find Professionals',
      to: findProfessionalsPath,
      gradient: 'from-emerald-500 to-teal-400',
    },
  ]
}

export function OnboardingOverlay() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  const role: Role = (user?.user_metadata?.role as Role) || 'student'
  const steps = getSteps(role)

  useEffect(() => {
    if (!user) return
    if (localStorage.getItem(ONBOARDING_DISMISSED_KEY)) return

    const profile = user.user_metadata
    const needsOnboarding =
      profile?.openToWork === false || !profile?.headline || profile.headline === ''
    if (needsOnboarding) setShow(true)
  }, [user])

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
    setShow(false)
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
    <AnimatePresence>
      <motion.div
        key="onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
          aria-label="Onboarding"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.3 }}
          >
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
          </motion.div>
        </motion.div>
    </AnimatePresence>
  )
}
