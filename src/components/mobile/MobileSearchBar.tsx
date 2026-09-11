import { useState, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileSearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  className?: string
}

export function MobileSearchBar({
  placeholder = 'Search...',
  value: controlledValue,
  onChange,
  onSearch,
  className,
}: MobileSearchBarProps) {
  const [internalValue, setInternalValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const value = controlledValue ?? internalValue

  const handleChange = (v: string) => {
    setInternalValue(v)
    onChange?.(v)
  }

  const handleClear = () => {
    handleChange('')
    onChange?.('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch?.(value)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'flex h-12 w-full rounded-xl border border-border bg-card pl-11 pr-10 text-sm',
          'text-foreground placeholder:text-muted-foreground',
          'transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
        )}
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors active:bg-muted/80"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
