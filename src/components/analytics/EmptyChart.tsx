import { BarChart3 } from 'lucide-react'

export function EmptyChart({ message = 'No data available for the selected period' }: { message?: string }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
