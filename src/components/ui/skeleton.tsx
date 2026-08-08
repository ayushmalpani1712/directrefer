import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-base rounded-md", className)}
      {...props}
    />
  )
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-2xl border border-border bg-card p-5 space-y-4 h-full", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex-1" />
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  )
}

function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Hero / Welcome card — matches real dashboard hero */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Stat cards — matches xl:grid-cols-3 (student/pro) or xl:grid-cols-4 (recruiter/admin) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Content grid — matches lg:grid-cols-3 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Hero card — matches real profile banner with responsive heights */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-24 sm:h-36 md:h-44 w-full" />
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 -mt-10 sm:-mt-12 md:-mt-16 relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 rounded-full border-4 border-card" />
              <div className="space-y-2 pb-1">
                <Skeleton className="h-6 sm:h-7 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Content grid — matches lg:grid-cols-3 with gap-6 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

function ListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  )
}

function MessagesSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-[calc(100vh-13rem)] min-h-[480px] overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <div className="w-80 border-r border-border p-4 space-y-4 hidden sm:block">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-full rounded-full" />
        <div className="space-y-1 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-11 w-11 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[60%] space-y-1", i % 2 === 0 ? "items-start" : "items-end")}>
                <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-48 rounded-bl-md" : "w-40 rounded-br-md")} />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3.5 flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        </div>
      </div>
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonGrid, DashboardSkeleton, ProfileSkeleton, ListSkeleton, MessagesSkeleton }
