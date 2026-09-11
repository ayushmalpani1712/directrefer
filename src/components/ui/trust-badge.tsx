import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle, Clock, AlertCircle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

type TrustStatus = "verified" | "provisional" | "unverified"

interface TrustBadgeProps {
  status: TrustStatus
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  className?: string
}

const trustConfig = {
  verified: {
    label: "Verified",
    icon: CheckCircle,
    className:
      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15",
    iconClassName: "text-emerald-500",
  },
  provisional: {
    label: "Provisional",
    icon: Clock,
    className:
      "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/15",
    iconClassName: "text-amber-500",
  },
  unverified: {
    label: "Unverified",
    icon: AlertCircle,
    className:
      "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15",
    iconClassName: "text-red-500",
  },
} as const

const sizeConfig = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-0.5",
  lg: "text-sm px-2.5 py-1",
} as const

export function TrustBadge({
  status,
  size = "md",
  showIcon = true,
  className,
}: TrustBadgeProps) {
  const config = trustConfig[status]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 font-medium border transition-colors",
        sizeConfig[size],
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4")} />}
      <span>{config.label}</span>
    </Badge>
  )
}

interface UnverifiedBannerProps {
  className?: string
  onVerify?: () => void
}

export function UnverifiedBanner({ className, onVerify }: UnverifiedBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0" />
        <p className="text-sm text-foreground">
          Complete verification to unlock referrals
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onVerify}
        className="shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
      >
        Verify Now
      </Button>
    </div>
  )
}
