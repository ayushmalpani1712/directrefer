import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  X,
  SlidersHorizontal,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

/* ─── Filter Types ───────────────────────────────────────────────────── */

type FilterType = "checkbox" | "range" | "date" | "search" | "select"

interface FilterOption {
  label: string
  value: string
  count?: number
}

interface FilterField {
  id: string
  label: string
  type: FilterType
  placeholder?: string
  options?: FilterOption[]
  min?: number
  max?: number
  step?: number
}

interface FilterGroupProps {
  id: string
  label: string
  fields: FilterField[]
  defaultOpen?: boolean
}

interface FilterPanelProps {
  groups: FilterGroupProps[]
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
  onClearAll?: () => void
  className?: string
  activeCount?: number
}

interface ActiveFilters {
  count: number
  hasFilters: boolean
}

/* ─── useFilters hook ──────────────────────────────────────────────── */

function useFilters(initialValues: Record<string, unknown> = {}) {
  const [values, setValues] = React.useState<Record<string, unknown>>(initialValues)

  const setValue = React.useCallback((id: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }, [])

  const clearValue = React.useCallback((id: string) => {
    setValues((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const clearAll = React.useCallback(() => {
    setValues({})
  }, [])

  const activeCount = React.useMemo(() => {
    return Object.values(values).filter((v) => {
      if (v === null || v === undefined) return false
      if (typeof v === "string") return v.length > 0
      if (Array.isArray(v)) return v.length > 0
      return true
    }).length
  }, [values])

  return {
    values,
    setValue,
    clearValue,
    clearAll,
    activeCount,
    hasFilters: activeCount > 0,
  } as ActiveFilters & {
    values: Record<string, unknown>
    setValue: (id: string, value: unknown) => void
    clearValue: (id: string) => void
    clearAll: () => void
    activeCount: number
  }
}

/* ─── FilterField Renderer ─────────────────────────────────────────── */

function FilterFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FilterField
  value: unknown
  onChange: (value: unknown) => void
}) {
  switch (field.type) {
    case "search":
      return (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={field.placeholder ?? "Search..."}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      )

    case "checkbox":
      return (
        <div className="space-y-1.5">
          {field.options?.map((option) => {
            const selected = Array.isArray(value) ? (value as string[]).includes(option.value) : false
            return (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => {
                    const current = (Array.isArray(value) ? value : []) as string[]
                    if (checked) {
                      onChange([...current, option.value])
                    } else {
                      onChange(current.filter((v) => v !== option.value))
                    }
                  }}
                />
                <span className="flex-1 text-xs text-foreground">{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {option.count}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      )

    case "select":
      return (
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder={field.placeholder ?? "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "range": {
      const numValue = (value as number) ?? field.min ?? 0
      return (
        <div className="space-y-2">
          <input
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={numValue}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{field.min ?? 0}</span>
            <span className="font-medium text-foreground">{numValue}</span>
            <span>{field.max ?? 100}</span>
          </div>
        </div>
      )
    }

    case "date":
      return (
        <Input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs"
        />
      )

    default:
      return null
  }
}

/* ─── Collapsible FilterGroup ──────────────────────────────────────── */

function FilterGroup({
  group,
  values,
  onChange,
}: {
  group: FilterGroupProps
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
}) {
  const [open, setOpen] = React.useState(group.defaultOpen ?? true)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        {group.label}
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-3">
              {group.fields.map((field) => (
                <div key={field.id}>
                  <Label className="mb-1.5 text-xs text-muted-foreground">
                    {field.label}
                  </Label>
                  <FilterFieldRenderer
                    field={field}
                    value={values[field.id]}
                    onChange={(v) => onChange(field.id, v)}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Active Filter Badges ─────────────────────────────────────────── */

function ActiveFilterBadges({
  values,
  groups,
  onRemove,
}: {
  values: Record<string, unknown>
  groups: FilterGroupProps[]
  onRemove: (fieldId: string) => void
}) {
  const allFields = React.useMemo(
    () => groups.flatMap((g) => g.fields),
    [groups]
  )

  const active = React.useMemo(() => {
    const result: { fieldId: string; label: string; display: string }[] = []
    for (const [fieldId, value] of Object.entries(values)) {
      if (value === null || value === undefined || value === "") continue
      if (Array.isArray(value) && value.length === 0) continue

      const field = allFields.find((f) => f.id === fieldId)
      if (!field) continue

      if (Array.isArray(value)) {
        for (const v of value) {
          const opt = field.options?.find((o) => o.value === v)
          result.push({
            fieldId,
            label: field.label,
            display: opt?.label ?? String(v),
          })
        }
      } else if (field.type === "select") {
        const opt = field.options?.find((o) => o.value === value)
        result.push({
          fieldId,
          label: field.label,
          display: opt?.label ?? String(value),
        })
      } else {
        result.push({
          fieldId,
          label: field.label,
          display: String(value),
        })
      }
    }
    return result
  }, [values, allFields])

  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map((item, i) => (
        <Badge
          key={`${item.fieldId}-${item.display}-${i}`}
          variant="secondary"
          className="gap-1 text-xs"
        >
          {item.display}
          <button
            type="button"
            onClick={() => onRemove(item.fieldId)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
    </div>
  )
}

/* ─── FilterPanel (desktop sidebar / mobile sheet) ─────────────────── */

function FilterPanelContent({
  groups,
  values,
  onChange,
  activeCount = 0,
  onClearAll,
}: Omit<FilterPanelProps, "className">) {
  return (
    <div className="space-y-0">
      {activeCount > 0 && (
        <div className="flex items-center justify-between border-b border-border pb-3">
          <span className="text-xs text-muted-foreground">
            {activeCount} filter{activeCount !== 1 ? "s" : ""} active
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
          >
            <X className="size-3" />
            Clear all
          </Button>
        </div>
      )}
      {groups.map((group) => (
        <FilterGroup
          key={group.id}
          group={group}
          values={values}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

function FilterPanel({
  groups,
  values,
  onChange,
  onClearAll,
  className,
}: FilterPanelProps) {
  const isMobile = useIsMobile()
  const activeCount = Object.values(values).filter((v) => {
    if (v === null || v === undefined) return false
    if (typeof v === "string") return v.length > 0
    if (Array.isArray(v)) return v.length > 0
    return true
  }).length

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 lg:hidden">
            <SlidersHorizontal className="size-4" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-sm">Filters</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <FilterPanelContent
              groups={groups}
              values={values}
              onChange={onChange}
              activeCount={activeCount}
              onClearAll={onClearAll}
            />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className={cn("w-64 shrink-0", className)}>
      <div className="sticky top-20">
        <div className="mb-3 flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <FilterPanelContent
          groups={groups}
          values={values}
          onChange={onChange}
          activeCount={activeCount}
          onClearAll={onClearAll}
        />
      </div>
    </div>
  )
}

export {
  FilterPanel,
  FilterGroup,
  FilterFieldRenderer,
  ActiveFilterBadges,
  useFilters,
  type FilterField,
  type FilterGroupProps,
  type FilterPanelProps,
  type FilterType,
  type FilterOption,
}
