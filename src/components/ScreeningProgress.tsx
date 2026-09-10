import { motion } from "framer-motion"
import {
  Check,
  X,
  Clock,
  ClipboardCheck,
  FileText,
  Target,
  Video,
  Users,
  PartyPopper,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ScreeningStep {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  timeEstimate: string
}

const DEFAULT_STEPS: ScreeningStep[] = [
  { id: "criteria", label: "Criteria Review", icon: ClipboardCheck, timeEstimate: "~1 min" },
  { id: "questionnaire", label: "Questionnaire", icon: FileText, timeEstimate: "~5 min" },
  { id: "skills", label: "Skills Assessment", icon: Target, timeEstimate: "~10 min" },
  { id: "video", label: "Video Interview", icon: Video, timeEstimate: "~15 min" },
  { id: "references", label: "References", icon: Users, timeEstimate: "~3 min" },
  { id: "complete", label: "Complete", icon: PartyPopper, timeEstimate: "" },
]

type StepStatus = "completed" | "active" | "failed" | "upcoming"

interface ScreeningProgressProps {
  steps?: ScreeningStep[]
  currentStepIndex: number
  failedSteps?: number[]
  variant?: "compact" | "full"
  className?: string
}

function ScreeningProgress({
  steps = DEFAULT_STEPS,
  currentStepIndex,
  failedSteps = [],
  variant = "full",
  className,
}: ScreeningProgressProps) {
  const getStepStatus = (index: number): StepStatus => {
    if (failedSteps.includes(index)) return "failed"
    if (index < currentStepIndex) return "completed"
    if (index === currentStepIndex) return "active"
    return "upcoming"
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {steps.map((step, index) => {
          const status = getStepStatus(index)
          const Icon = step.icon

          return (
            <div key={step.id} className="flex items-center gap-1">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-xs transition-all duration-300",
                  status === "completed" &&
                    "border-primary bg-primary text-primary-foreground",
                  status === "active" &&
                    "border-primary bg-primary/10 text-primary ring-2 ring-primary/20",
                  status === "failed" &&
                    "border-destructive bg-destructive/10 text-destructive",
                  status === "upcoming" &&
                    "border-border bg-background text-muted-foreground"
                )}
              >
                {status === "completed" ? (
                  <Check className="size-3.5" />
                ) : status === "failed" ? (
                  <X className="size-3.5" />
                ) : (
                  <Icon className="size-3.5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px w-4 transition-colors duration-300",
                    index < currentStepIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      {steps.map((step, index) => {
        const status = getStepStatus(index)
        const Icon = step.icon
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <motion.div
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                  status === "completed" &&
                    "border-primary bg-primary text-primary-foreground",
                  status === "active" &&
                    "border-primary bg-primary/10 text-primary",
                  status === "failed" &&
                    "border-destructive bg-destructive/10 text-destructive",
                  status === "upcoming" &&
                    "border-border bg-background text-muted-foreground"
                )}
                initial={false}
                animate={
                  status === "active"
                    ? { scale: [1, 1.05, 1] }
                    : { scale: 1 }
                }
                transition={
                  status === "active"
                    ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.2 }
                }
              >
                {status === "completed" ? (
                  <Check className="size-4" />
                ) : status === "failed" ? (
                  <X className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </motion.div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-6 transition-colors duration-300",
                    index < currentStepIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>

            <div className={cn("pt-1.5 pb-4", isLast && "pb-0")}>
              <div
                className={cn(
                  "text-sm font-medium",
                  status === "active"
                    ? "text-foreground"
                    : status === "completed"
                      ? "text-foreground"
                      : status === "failed"
                        ? "text-destructive"
                        : "text-muted-foreground"
                )}
              >
                {step.label}
                {status === "failed" && (
                  <span className="ml-2 text-xs text-destructive">(Failed)</span>
                )}
              </div>
              {step.timeEstimate && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {step.timeEstimate}
                </div>
              )}
              {status === "active" && (
                <motion.div
                  className="mt-1.5 h-1 w-16 rounded-full bg-primary/20 overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "60%" }}
                    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                  />
                </motion.div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { ScreeningProgress, DEFAULT_STEPS, type ScreeningStep, type ScreeningProgressProps }
