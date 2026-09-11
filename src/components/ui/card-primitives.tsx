import * as React from "react"
import { Link } from "react-router"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

function TrendIcon({ direction }: { direction: "up" | "down" }) {
  return direction === "up" ? (
    <TrendingUp className="h-3 w-3" />
  ) : (
    <TrendingDown className="h-3 w-3" />
  )
}

interface DataCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: { value: number; direction: "up" | "down" }
  icon?: React.ReactNode
  className?: string
}

export function DataCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  className,
}: DataCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trend.direction === "up"
                    ? "text-emerald-500"
                    : "text-red-500"
                )}
              >
                <TrendIcon direction={trend.direction} />
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          {icon && (
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ActionCardProps {
  title: string
  description: string
  action: { label: string; onClick?: () => void; href?: string }
  icon?: React.ReactNode
  variant?: "default" | "gradient"
  className?: string
}

export function ActionCard({
  title,
  description,
  action,
  icon,
  variant = "default",
  className,
}: ActionCardProps) {
  const content = (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group",
        variant === "gradient" &&
          "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0 transition-colors group-hover:bg-primary/20">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        {action.label && (
          <div className="mt-4">
            {action.href ? (
              <Link
                to={action.href}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {action.label}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return content
}

interface ProfileCardProps {
  avatar?: React.ReactNode
  title: string
  subtitle?: string
  badges?: React.ReactNode
  skills?: string[]
  actions?: React.ReactNode
  trustBadge?: React.ReactNode
  className?: string
}

export function ProfileCard({
  avatar,
  title,
  subtitle,
  badges,
  skills,
  actions,
  trustBadge,
  className,
}: ProfileCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {avatar && (
            <div className="shrink-0 rounded-full bg-muted overflow-hidden h-12 w-12 flex items-center justify-center">
              {avatar}
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {title}
              </h3>
              {trustBadge}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
            {badges && <div className="flex flex-wrap gap-1.5 mt-1">{badges}</div>}
          </div>
        </div>
        {skills && skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
        {actions && <div className="mt-4 pt-3 border-t border-border">{actions}</div>}
      </CardContent>
    </Card>
  )
}
