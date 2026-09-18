import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'dashed-add'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/20 active:brightness-90',
  secondary:
    'bg-zinc-800 text-zinc-100 font-medium shadow-sm active:bg-zinc-700',
  ghost:
    'bg-transparent text-indigo-400 font-medium active:bg-indigo-500/10',
  destructive:
    'bg-red-600 text-white font-semibold shadow-sm active:bg-red-700',
  outline:
    'border border-zinc-700 bg-transparent text-zinc-200 font-medium active:bg-zinc-800',
  'dashed-add':
    'border-2 border-dashed border-zinc-700 bg-transparent text-zinc-400 font-medium active:bg-zinc-800/50',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-10 px-4 text-xs rounded-lg gap-2',
  md: 'h-12 px-6 text-sm rounded-xl gap-2',
  lg: 'h-[52px] px-6 text-sm rounded-xl gap-2',
  icon: 'h-12 w-12 rounded-xl p-0 justify-center',
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  (
    {
      variant = 'primary',
      size = 'lg',
      fullWidth = false,
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex min-h-[44px] items-center justify-center',
          'transition-all duration-150',
          'active:scale-[0.98] active:brightness-90',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
          'disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

MobileButton.displayName = 'MobileButton'
