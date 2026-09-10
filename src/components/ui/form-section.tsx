import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

interface FormSectionProps {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  actions?: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}

function FormSection({
  title,
  description,
  icon: Icon,
  actions,
  collapsible = false,
  defaultOpen = true,
  required = false,
  error,
  children,
  className,
}: FormSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        )}
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-1.5 text-base">
            {title}
            {required && (
              <span className="text-destructive text-sm">*</span>
            )}
          </CardTitle>
          {description && (
            <CardDescription className="mt-0.5">{description}</CardDescription>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <Card className={cn(error && "border-destructive/50", className)}>
      <CardHeader>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-full text-left"
          >
            {header}
          </button>
        ) : (
          header
        )}
      </CardHeader>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <CardContent>
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function FormSectionGroup({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {title && (
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

export { FormSection, FormSectionGroup, type FormSectionProps }
