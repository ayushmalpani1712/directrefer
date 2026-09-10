import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  User,
  Briefcase,
  Building2,
  Settings,
  FileText,
  Target,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Stepper, StepperContent, StepperActions } from "@/components/ui/stepper"
import { useAuth } from "@/context/AuthContext"
import type { Role } from "@/data/constants"

/* ─── Types ─────────────────────────────────────────────────────────── */

interface OnboardingStep {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
}

const ROLE_STEPS: Record<Role, OnboardingStep[]> = {
  student: [
    { id: "profile", label: "Profile", description: "Basic information", icon: User },
    { id: "skills", label: "Skills", description: "Your skill set", icon: Target },
    { id: "preferences", label: "Preferences", description: "Job preferences", icon: Settings },
    { id: "resume", label: "Resume", description: "Upload your resume", icon: FileText },
  ],
  professional: [
    { id: "profile", label: "Profile", description: "Basic information", icon: User },
    { id: "expertise", label: "Expertise", description: "Your expertise", icon: Briefcase },
    { id: "availability", label: "Availability", description: "When you can help", icon: Clock },
    { id: "preferences", label: "Preferences", description: "Referral preferences", icon: Settings },
  ],
  recruiter: [
    { id: "company", label: "Company", description: "Company details", icon: Building2 },
    { id: "team", label: "Team", description: "Team setup", icon: User },
    { id: "job-setup", label: "Job Setup", description: "First job posting", icon: Briefcase },
  ],
  admin: [
    { id: "profile", label: "Profile", description: "Basic information", icon: User },
  ],
}

const STORAGE_KEY = "dr_onboarding_progress"

interface OnboardingData {
  completedSteps: string[]
  skippedAt: string | null
  values: Record<string, unknown>
}

function loadProgress(userId: string): OnboardingData | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveProgress(userId: string, data: OnboardingData) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(data))
  } catch {
    // ignore
  }
}

/* ─── Step Forms ────────────────────────────────────────────────────── */

function ProfileStep({
  values,
  onChange,
}: {
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          placeholder="John Doe"
          value={(values.name as string) ?? ""}
          onChange={(e) => onChange("name", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          placeholder="Software Engineer at..."
          value={(values.headline as string) ?? ""}
          onChange={(e) => onChange("headline", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="San Francisco, CA"
          value={(values.location as string) ?? ""}
          onChange={(e) => onChange("location", e.target.value)}
        />
      </div>
    </div>
  )
}

function SkillsStep({
  values,
  onChange,
}: {
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}) {
  const skills = (values.skills as string[]) ?? []
  const options = ["React", "TypeScript", "Python", "Node.js", "Java", "Go", "AWS", "Docker", "SQL", "GraphQL"]

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Select your top skills:</p>
      <div className="flex flex-wrap gap-2">
        {options.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => {
              const next = skills.includes(skill)
                ? skills.filter((s) => s !== skill)
                : [...skills, skill]
              onChange("skills", next)
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              skills.includes(skill)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50"
            )}
          >
            {skill}
          </button>
        ))}
      </div>
    </div>
  )
}

function PreferencesStep({
  values,
  onChange,
}: {
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="role-type">Preferred Role Type</Label>
        <Input
          id="role-type"
          placeholder="Frontend Engineer"
          value={(values.preferredRole as string) ?? ""}
          onChange={(e) => onChange("preferredRole", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Target Company</Label>
        <Input
          id="company"
          placeholder="Google, Meta..."
          value={(values.preferredCompany as string) ?? ""}
          onChange={(e) => onChange("preferredCompany", e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2">
        <Checkbox
          checked={(values.openToWork as boolean) ?? false}
          onCheckedChange={(checked) => onChange("openToWork", !!checked)}
        />
        <span className="text-sm">Open to work</span>
      </label>
    </div>
  )
}

function ResumeStep({
  values,
  onChange,
}: {
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}) {
  const fileName = values.resumeName as string | undefined

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
        <FileText className="mx-auto size-10 text-muted-foreground/40" />
        {fileName ? (
          <p className="mt-2 text-sm text-foreground">{fileName}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Drag & drop your resume or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              PDF, DOC up to 5MB
            </p>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => onChange("resumeName", "resume.pdf")}
        >
          {fileName ? "Change File" : "Choose File"}
        </Button>
      </div>
    </div>
  )
}

function ExpertiseStep({
  values,
  onChange,
}: {
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="expertise">Area of Expertise</Label>
        <Input
          id="expertise"
          placeholder="e.g. Frontend Architecture"
          value={(values.expertise as string) ?? ""}
          onChange={(e) => onChange("expertise", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="years">Years of Experience</Label>
        <Input
          id="years"
          type="number"
          placeholder="5"
          value={(values.years as string) ?? ""}
          onChange={(e) => onChange("years", e.target.value)}
        />
      </div>
    </div>
  )
}

function AvailabilityStep({
  values,
  onChange,
}: {
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}) {
  const options = ["Weekdays", "Evenings", "Weekends", "Flexible"]

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">When are you available to help?</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2">
            <Checkbox
              checked={((values.availability as string[]) ?? []).includes(opt)}
              onCheckedChange={(checked) => {
                const current = (values.availability as string[]) ?? []
                const next = checked
                  ? [...current, opt]
                  : current.filter((a) => a !== opt)
                onChange("availability", next)
              }}
            />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function CompanyStep({
  values,
  onChange,
}: {
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="company-name">Company Name</Label>
        <Input
          id="company-name"
          placeholder="Acme Corp"
          value={(values.companyName as string) ?? ""}
          onChange={(e) => onChange("companyName", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company-domain">Company Domain</Label>
        <Input
          id="company-domain"
          placeholder="acme.com"
          value={(values.companyDomain as string) ?? ""}
          onChange={(e) => onChange("companyDomain", e.target.value)}
        />
      </div>
    </div>
  )
}

function TeamStep({
  values,
  onChange,
}: {
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="team-size">Team Size</Label>
        <Input
          id="team-size"
          type="number"
          placeholder="10"
          value={(values.teamSize as string) ?? ""}
          onChange={(e) => onChange("teamSize", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Input
          id="department"
          placeholder="Engineering"
          value={(values.department as string) ?? ""}
          onChange={(e) => onChange("department", e.target.value)}
        />
      </div>
    </div>
  )
}

function JobSetupStep({
  values,
  onChange,
}: {
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="job-title">First Job Title</Label>
        <Input
          id="job-title"
          placeholder="Senior Frontend Engineer"
          value={(values.jobTitle as string) ?? ""}
          onChange={(e) => onChange("jobTitle", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="job-location">Location</Label>
        <Input
          id="job-location"
          placeholder="Remote"
          value={(values.jobLocation as string) ?? ""}
          onChange={(e) => onChange("jobLocation", e.target.value)}
        />
      </div>
    </div>
  )
}

/* ─── Step Form Map ─────────────────────────────────────────────────── */

const STEP_FORMS: Record<string, React.ComponentType<{
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}>> = {
  profile: ProfileStep,
  skills: SkillsStep,
  preferences: PreferencesStep,
  resume: ResumeStep,
  expertise: ExpertiseStep,
  availability: AvailabilityStep,
  company: CompanyStep,
  team: TeamStep,
  "job-setup": JobSetupStep,
}

/* ─── Main Wizard ───────────────────────────────────────────────────── */

interface OnboardingWizardProps {
  role: Role
  onComplete?: () => void
  onSkip?: () => void
  className?: string
}

function OnboardingWizard({
  role,
  onComplete,
  onSkip,
  className,
}: OnboardingWizardProps) {
  const { user } = useAuth()
  const userId = user?.id ?? "anonymous"

  const steps = useMemo(() => ROLE_STEPS[role] ?? ROLE_STEPS.student, [role])

  const saved = useMemo(() => loadProgress(userId), [userId])

  const [currentStep, setCurrentStep] = useState(() => {
    if (saved) {
      const nextIdx = steps.findIndex((s) => !saved.completedSteps.includes(s.id))
      return nextIdx >= 0 ? nextIdx : steps.length
    }
    return 0
  })

  const [values, setValues] = useState<Record<string, unknown>>(
    saved?.values ?? {}
  )

  const [completedSteps, setCompletedSteps] = useState<string[]>(
    saved?.completedSteps ?? []
  )

  const handleChange = useCallback((id: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }, [])

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep >= steps.length - 1
  const currentStepData = steps[currentStep]

  const handleNext = useCallback(() => {
    if (currentStepData) {
      setCompletedSteps((prev) =>
        prev.includes(currentStepData.id)
          ? prev
          : [...prev, currentStepData.id]
      )
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length))
  }, [currentStepData, steps.length])

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }, [])

  const handleSubmit = useCallback(() => {
    if (currentStepData) {
      setCompletedSteps((prev) =>
        prev.includes(currentStepData.id)
          ? prev
          : [...prev, currentStepData.id]
      )
    }
    saveProgress(userId, {
      completedSteps: [...completedSteps, currentStepData?.id].filter(Boolean) as string[],
      skippedAt: null,
      values,
    })
    onComplete?.()
  }, [currentStepData, completedSteps, values, userId, onComplete])

  const handleSkip = useCallback(() => {
    saveProgress(userId, {
      completedSteps,
      skippedAt: new Date().toISOString(),
      values,
    })
    onSkip?.()
  }, [completedSteps, values, userId, onSkip])

  useEffect(() => {
    saveProgress(userId, {
      completedSteps,
      skippedAt: null,
      values,
    })
  }, [completedSteps, values, userId])

  const StepForm = currentStepData ? STEP_FORMS[currentStepData.id] : null
  const progress = steps.length > 0 ? Math.round((completedSteps.length / steps.length) * 100) : 0

  if (currentStep >= steps.length) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 className="size-16 text-primary" />
        </motion.div>
        <h2 className="font-display mt-4 text-xl font-bold">You're all set!</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Your profile is ready. You can always complete the remaining steps later from your settings.
        </p>
        <Button className="mt-6 rounded-full" onClick={onComplete}>
          Get Started
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Welcome! Let's set up your account</h2>
          <p className="text-sm text-muted-foreground">
            {progress}% complete
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSkip}>
          Skip for now
        </Button>
      </div>

      <div className="mb-8">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      <Stepper
        steps={steps}
        currentStep={currentStep}
        className="mb-8"
      />

      <Card>
        <CardContent className="pt-5">
          <StepperContent currentStep={currentStep}>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Step {currentStep + 1} of {steps.length}
              </h3>
              {StepForm && (
                <StepForm values={values} onChange={handleChange} />
              )}
            </div>
          </StepperContent>

          <StepperActions
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            submitLabel="Complete Setup"
          />
        </CardContent>
      </Card>
    </div>
  )
}

export { OnboardingWizard, ROLE_STEPS, type OnboardingWizardProps, type OnboardingStep }
