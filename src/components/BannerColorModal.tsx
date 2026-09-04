import { Palette } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PROFILE_THEMES, getProfileTheme, cn } from '@/lib/utils'

interface BannerColorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string | null
  onChange: (themeKey: string | null) => void
}

export function BannerColorModal({ open, onOpenChange, value, onChange }: BannerColorModalProps) {
  const active = getProfileTheme(value)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Select Banner Color
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-2">
          {PROFILE_THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { onChange(t.key); onOpenChange(false) }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:scale-105',
                active.key === t.key
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div
                className="h-10 w-10 rounded-full shadow-inner"
                style={{ backgroundColor: t.color }}
              />
              <span className="text-xs font-medium text-foreground">{t.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => { onChange(null); onOpenChange(false) }}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:scale-105',
              value === null
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/40 bg-background flex items-center justify-center">
              <span className="text-[8px] font-bold text-muted-foreground">AUTO</span>
            </div>
            <span className="text-xs font-medium text-foreground">Default</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
