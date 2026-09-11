import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; direction: "up" | "down"; label?: string }
  emptyState?: { message: string; action?: { label: string; onClick: () => void } }
  className?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  emptyState,
  className,
}: StatCardProps) {
  const isEmpty = (value === 0 || value === "0") && emptyState

  if (isEmpty) {
    return (
      <Card className={cn("transition-all duration-200", className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-sm text-muted-foreground italic">
                {emptyState.message}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-2.5 text-muted-foreground">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          {emptyState.action && (
            <div className="mt-3">
              <button
                onClick={emptyState.action.onClick}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {emptyState.action.label}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

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
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trend.direction === "up"
                    ? "text-emerald-500"
                    : "text-red-500"
                )}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
                {trend.label && (
                  <span className="text-muted-foreground font-normal ml-1">
                    {trend.label}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
