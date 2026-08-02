import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type DatePreset = '7d' | '30d' | '3m' | '6m' | '12m' | 'ytd' | 'all' | 'custom'

export interface DateRange {
  preset: DatePreset
  from: Date
  to: Date
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '3m', label: 'Last 3 Months' },
  { key: '6m', label: 'Last 6 Months' },
  { key: '12m', label: 'Last 12 Months' },
  { key: 'ytd', label: 'Year to Date' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom Range' },
]

export function getPresetRange(preset: DatePreset): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()
  switch (preset) {
    case '7d':
      from.setDate(to.getDate() - 7)
      break
    case '30d':
      from.setDate(to.getDate() - 30)
      break
    case '3m':
      from.setMonth(to.getMonth() - 3)
      break
    case '6m':
      from.setMonth(to.getMonth() - 6)
      break
    case '12m':
      from.setFullYear(to.getFullYear() - 1)
      break
    case 'ytd':
      from.setMonth(0, 1)
      break
    case 'all':
      from.setFullYear(2024, 0, 1)
      break
    case 'custom':
      from.setDate(to.getDate() - 30)
      break
  }
  return { from, to }
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DateRangeSelector({ value, onChange, className }: { value: DateRange; onChange: (r: DateRange) => void; className?: string }) {
  const [customOpen, setCustomOpen] = useState(false)

  const handlePreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      const { from, to } = getPresetRange('custom')
      onChange({ preset: 'custom', from, to })
      setCustomOpen(true)
      return
    }
    setCustomOpen(false)
    const { from, to } = getPresetRange(preset)
    onChange({ preset, from, to })
  }

  const label = PRESETS.find((p) => p.key === value.preset)?.label || 'Custom'

  return (
    <div className={cn('relative flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 overflow-hidden rounded-lg whitespace-nowrap">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {label}
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {PRESETS.map((p) => (
            <DropdownMenuItem
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={cn('text-xs', value.preset === p.key && 'bg-primary/10 text-primary font-medium')}
            >
              {p.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {value.preset === 'custom' && (
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-transparent px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted',
                customOpen && 'bg-muted text-foreground'
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(value.from)} — {formatDate(value.to)}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={value.from.toISOString().split('T')[0]}
                  onChange={(e) => onChange({ ...value, from: new Date(e.target.value) })}
                  className="h-8 w-[150px] rounded-lg text-xs"
                />
              </div>
              <span className="mt-4 text-xs text-muted-foreground">to</span>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={value.to.toISOString().split('T')[0]}
                  onChange={(e) => onChange({ ...value, to: new Date(e.target.value) })}
                  className="h-8 w-[150px] rounded-lg text-xs"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
