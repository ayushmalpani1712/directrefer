import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"

interface Step {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (index: number) => void
  className?: string
  orientation?: "horizontal" | "vertical"
}

function Stepper({
  steps,
  currentStep,
  onStepClick,
  className,
  orientation,
}: StepperProps) {
  const isMobile = useIsMobile()
  const effectiveOrientation = orientation ?? (isMobile ? "vertical" : "horizontal")

  return (
    <nav
      aria-label="Progress"
      className={cn(
        effectiveOrientation === "vertical" ? "flex flex-col gap-0" : "flex items-center",
        className
      )}
    >
      {steps.map((step, index) => {
        const status =
          index < currentStep ? "completed" : index === currentStep ? "active" : "upcoming"
        const StepIcon = step.icon

        return (
          <React.Fragment key={step.id}>
            {effectiveOrientation === "horizontal" && index > 0 && (
              <div
                className={cn(
                  "h-px flex-1 transition-colors duration-300",
                  index <= currentStep ? "bg-primary" : "bg-border"
                )}
              />
            )}
            {effectiveOrientation === "vertical" && index > 0 && (
              <div className="ml-4 flex w-0.5 items-start self-stretch py-0.5">
                <div
                  className={cn(
                    "w-full transition-colors duration-300",
                    index <= currentStep ? "bg-primary" : "bg-border"
                  )}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick}
              className={cn(
                "group flex items-center gap-3 transition-colors",
                effectiveOrientation === "horizontal" ? "relative shrink-0" : "w-full",
                onStepClick && "cursor-pointer",
                !onStepClick && "cursor-default"
              )}
            >
              <div
                className={cn(
                  "relative flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                  status === "completed" &&
                    "border-primary bg-primary text-primary-foreground",
                  status === "active" &&
                    "border-primary bg-primary/10 text-primary ring-4 ring-primary/10",
                  status === "upcoming" &&
                    "border-border bg-background text-muted-foreground",
                  onStepClick &&
                    "group-hover:border-primary/70 group-hover:bg-primary/5"
                )}
              >
                <AnimatePresence mode="wait">
                  {status === "completed" ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check className="size-4" />
                    </motion.div>
                  ) : StepIcon && status === "active" ? (
                    <motion.div
                      key="icon"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <StepIcon className="size-4" />
                    </motion.div>
                  ) : (
                    <motion.span
                      key="number"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {index + 1}
                    </motion.span>
                  )}
                </AnimatePresence>

                {status === "active" && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.3, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
              </div>

              <div
                className={cn(
                  "min-w-0 text-left",
                  effectiveOrientation === "horizontal" && "hidden lg:block"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-medium leading-tight",
                    status === "active"
                      ? "text-foreground"
                      : status === "completed"
                        ? "text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {step.description}
                  </div>
                )}
              </div>
            </button>
          </React.Fragment>
        )
      })}
    </nav>
  )
}

function StepperContent({
  children,
  currentStep,
  className,
}: {
  children: React.ReactNode
  currentStep: number
  className?: string
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={cn("min-h-0 flex-1", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function StepperActions({
  onBack,
  onNext,
  onSubmit,
  isFirstStep,
  isLastStep,
  nextLabel = "Continue",
  backLabel = "Back",
  submitLabel = "Submit",
  isSubmitting = false,
  className,
}: {
  onBack: () => void
  onNext: () => void
  onSubmit?: () => void
  isFirstStep: boolean
  isLastStep: boolean
  nextLabel?: string
  backLabel?: string
  submitLabel?: string
  isSubmitting?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-border pt-4",
        className
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep}
        className={cn("gap-1.5", isFirstStep && "invisible")}
      >
        <ChevronLeft className="size-4" />
        {backLabel}
      </Button>

      {isLastStep ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="gap-1.5"
        >
          {isSubmitting && (
            <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          )}
          {submitLabel}
        </Button>
      ) : (
        <Button type="button" onClick={onNext} className="gap-1.5">
          {nextLabel}
          <ChevronRight className="size-4" />
        </Button>
      )}
    </div>
  )
}

export { Stepper, StepperContent, StepperActions, type Step, type StepperProps }
