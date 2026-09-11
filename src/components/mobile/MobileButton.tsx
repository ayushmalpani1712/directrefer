import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost'

interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground font-semibold shadow-sm active:bg-primary/90',
  secondary: 'border border-border bg-card text-foreground font-medium active:bg-muted/50',
  ghost: 'text-primary font-medium active:bg-primary/5',
}

export function MobileButton({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: MobileButtonProps) {
  return (
    <button
      className={cn(
        'flex h-12 items-center justify-center rounded-xl px-6 text-sm transition-all duration-100',
        'active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        variantStyles[variant],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
