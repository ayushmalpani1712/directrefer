import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Ban, Pencil, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateCapacity } from "@/lib/v2/matching"

interface CapacityMeterProps {
  professionalId?: string
  used?: number
  total?: number
  variant?: "circular" | "linear"
  label?: string
  size?: "sm" | "md" | "lg"
  showWarning?: boolean
  className?: string
}

function getCapacityColor(ratio: number): { stroke: string; text: string; bg: string } {
  if (ratio >= 1) return { stroke: "stroke-destructive", text: "text-destructive", bg: "bg-destructive/10" }
  if (ratio >= 0.8) return { stroke: "stroke-destructive", text: "text-destructive", bg: "bg-destructive/10" }
  if (ratio >= 0.6) return { stroke: "stroke-amber-500", text: "text-amber-500", bg: "bg-amber-500/10" }
  return { stroke: "stroke-emerald-500", text: "text-emerald-500", bg: "bg-emerald-500/10" }
}

const CIRCULAR_SIZES = {
  sm: { size: 64, stroke: 4, fontSize: "text-xs" },
  md: { size: 96, stroke: 6, fontSize: "text-sm" },
  lg: { size: 128, stroke: 8, fontSize: "text-base" },
} as const

function CircularCapacityMeter({
  used = 0,
  total = 1,
  size = "md",
  label,
  className,
}: Omit<CapacityMeterProps, "variant" | "professionalId">) {
  const [mounted, setMounted] = useState(false)
  const ratio = total > 0 ? Math.min(used / total, 1) : 0
  const percentage = Math.round(ratio * 100)
  const colors = getCapacityColor(ratio)
  const config = CIRCULAR_SIZES[size]
  const radius = (config.size - config.stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - (mounted ? ratio : 0))

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const isFull = ratio >= 1
  const isWarning = ratio >= 0.8 && ratio < 1

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: config.size, height: config.size }}>
        <svg
          width={config.size}
          height={config.size}
          viewBox={`0 0 ${config.size} ${config.size}`}
          className="-rotate-90"
        >
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-muted/30"
          />
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            className={cn(colors.stroke, "transition-all duration-1000 ease-out")}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-semibold tabular-nums", config.fontSize, colors.text)}>
            {percentage}%
          </span>
        </div>
      </div>

      <div className="text-center">
        <div className="text-xs font-medium text-foreground">
          {used} / {total}
        </div>
        {label && (
          <div className="text-[10px] text-muted-foreground">{label}</div>
        )}
      </div>

      {isFull && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive"
        >
          <Ban className="size-3" />
          <span>Referrals at full capacity</span>
        </motion.div>
      )}

      {isWarning && !isFull && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-500"
        >
          <AlertTriangle className="size-3" />
          <span>Near capacity</span>
        </motion.div>
      )}
    </div>
  )
}

function LinearCapacityMeter({
  used = 0,
  total = 1,
  label,
  className,
}: Omit<CapacityMeterProps, "variant" | "size" | "professionalId">) {
  const [mounted, setMounted] = useState(false)
  const ratio = total > 0 ? Math.min(used / total, 1) : 0
  const percentage = Math.round(ratio * 100)
  const colors = getCapacityColor(ratio)
  const isFull = ratio >= 1
  const isWarning = ratio >= 0.8 && ratio < 1

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={cn("space-y-2", className)}>
      {(label || total > 0) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs font-medium text-foreground">{label}</span>}
          <span className="text-xs text-muted-foreground tabular-nums">
            {used} / {total}
          </span>
        </div>
      )}

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/30">
        <motion.div
          className={cn("h-full rounded-full", colors.bg.replace("/10", ""), colors.stroke.replace("stroke-", "bg-"))}
          initial={{ width: "0%" }}
          animate={{ width: mounted ? `${percentage}%` : "0%" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium tabular-nums", colors.text)}>
          {percentage}%
        </span>
        {isFull && (
          <span className="flex items-center gap-1 text-[11px] text-destructive">
            <Ban className="size-3" />
            Full
          </span>
        )}
        {isWarning && !isFull && (
          <span className="flex items-center gap-1 text-[11px] text-amber-500">
            <AlertTriangle className="size-3" />
            Near limit
          </span>
        )}
      </div>
    </div>
  )
}

function CapacityMeter({
  variant = "linear",
  professionalId,
  used: usedProp,
  total: totalProp,
  ...props
}: CapacityMeterProps) {
  const { user } = useAuth()
  const [dbUsed, setDbUsed] = useState<number | null>(null)
  const [dbMax, setDbMax] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [editUsed, setEditUsed] = useState('')
  const [editMax, setEditMax] = useState('')
  const [saving, setSaving] = useState(false)

  const isOwner = !!user && !!professionalId && user.id === professionalId

  useEffect(() => {
    if (!professionalId) return
    let cancelled = false
    ;(async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase
        .from('professional_capacities')
        .select('used, max_capacity')
        .eq('user_id', professionalId)
        .lte('period_start', today)
        .gte('period_end', today)
        .single()
      if (!cancelled && data) {
        setDbUsed(data.used)
        setDbMax(data.max_capacity)
      }
    })()
    return () => { cancelled = true }
  }, [professionalId])

  const used = dbUsed !== null ? dbUsed : (usedProp ?? 0)
  const total = dbMax !== null ? dbMax : (totalProp ?? 1)

  const handleStartEdit = () => {
    setEditUsed(String(used))
    setEditMax(String(total))
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    const newUsed = parseInt(editUsed, 10)
    const newMax = parseInt(editMax, 10)
    if (isNaN(newUsed) || isNaN(newMax) || newMax <= 0) return
    setSaving(true)
    try {
      await updateCapacity(professionalId!, { used: newUsed, max_capacity: newMax })
      setDbUsed(newUsed)
      setDbMax(newMax)
      setEditing(false)
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const inner = variant === "circular" ? (
    <CircularCapacityMeter used={used} total={total} {...props} />
  ) : (
    <LinearCapacityMeter used={used} total={total} {...props} />
  )

  if (!isOwner) return inner

  return (
    <div className="relative group">
      {inner}
      {editing ? (
        <div className="mt-2 flex items-center gap-1.5">
          <Input
            type="number"
            value={editUsed}
            onChange={(e) => setEditUsed(e.target.value)}
            className="h-7 w-16 text-xs px-2"
            placeholder="Used"
            min={0}
          />
          <span className="text-xs text-muted-foreground">/</span>
          <Input
            type="number"
            value={editMax}
            onChange={(e) => setEditMax(e.target.value)}
            className="h-7 w-16 text-xs px-2"
            placeholder="Max"
            min={1}
          />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit} disabled={saving}>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(false)}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        <button
          onClick={handleStartEdit}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
        >
          <Pencil className="size-3" />
          Edit capacity
        </button>
      )}
    </div>
  )
}

export { CapacityMeter, type CapacityMeterProps }
