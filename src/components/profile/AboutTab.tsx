import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Chip } from '@/components/ui-kit'
import { User } from 'lucide-react'
import type { StudentProfile } from '@/context/AppContext'

interface AboutTabProps {
  student: StudentProfile
  onEdit?: () => void
}

export function AboutTab({ student: s, onEdit }: AboutTabProps) {
  return (
    <div className="space-y-6">
      <Card className="w-full overflow-hidden">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">About</h3>
          {s.headline ? (
            <p className="text-sm leading-relaxed text-foreground">{s.headline}</p>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <User className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">No bio added yet.</p>
              <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs text-primary" onClick={onEdit}>
                Add Bio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {s.skills.length > 0 && (
        <Card className="w-full overflow-hidden">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {s.skills.map((sk) => (
                <Chip key={sk} tone="primary">{sk}</Chip>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
