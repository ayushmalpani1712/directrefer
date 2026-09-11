import { type ReactNode, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  key: string
  label: string
}

interface MobileTabsProps {
  tabs: Tab[]
  activeKey: string
  onChange: (key: string) => void
  className?: string
  renderExtra?: ReactNode
}

export function MobileTabs({ tabs, activeKey, onChange, className, renderExtra }: MobileTabsProps) {
  const activeRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current
      const el = activeRef.current
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
      container.scrollTo({ left, behavior: 'smooth' })
    }
  }, [activeKey])

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-2"
      >
        {tabs.map((tab) => {
          const active = tab.key === activeKey
          return (
            <button
              key={tab.key}
              ref={active ? activeRef : undefined}
              onClick={() => onChange(tab.key)}
              className={cn(
                'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground active:bg-muted/80'
              )}
            >
              {tab.label}
            </button>
          )
        })}
        {renderExtra}
      </div>
    </div>
  )
}
