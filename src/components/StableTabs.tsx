import { createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

const Ctx = createContext<{ value: string }>({ value: '' })

export function StableTabs({ value, children, className }: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Ctx.Provider value={{ value }}>
      <div className={cn('stable-tabs-grid', className)}>
        {children}
      </div>
    </Ctx.Provider>
  )
}

export function StableTabPanel({ value, children, className }: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { value: active } = useContext(Ctx)
  return (
    <div className={cn('stable-tab-panel', active !== value && 'stable-tab-hidden', className)}>
      {children}
    </div>
  )
}
