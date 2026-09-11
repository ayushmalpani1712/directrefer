import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface FilterChip {
  key: string
  label: string
}

interface MobileFilterChipsProps {
  chips: FilterChip[]
  activeKeys: string[]
  onChange: (keys: string[]) => void
  onClearAll?: () => void
  className?: string
}

export function MobileFilterChips({
  chips,
  activeKeys,
  onChange,
  onClearAll,
  className,
}: MobileFilterChipsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('[data-active="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [activeKeys])

  const toggle = (key: string) => {
    if (activeKeys.includes(key)) {
      onChange(activeKeys.filter((k) => k !== key))
    } else {
      onChange([...activeKeys, key])
    }
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        className="scrollbar-none flex items-center gap-2 overflow-x-auto px-4 py-2"
      >
        {chips.map((chip) => {
          const active = activeKeys.includes(chip.key)
          return (
            <button
              key={chip.key}
              data-active={active}
              onClick={() => toggle(chip.key)}
              className={cn(
                'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-muted text-muted-foreground active:bg-muted/80'
              )}
            >
              {chip.label}
            </button>
          )
        })}
        {activeKeys.length > 0 && onClearAll && (
          <button
            onClick={onClearAll}
            className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-primary transition-colors active:bg-primary/5"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
