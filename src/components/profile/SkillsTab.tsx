import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { X, Zap, CheckCircle2 } from 'lucide-react'

interface SkillsTabProps {
  skills: string[]
  onAdd: (skill: string) => void
  onRemove: (skill: string) => void
}

export function SkillsTab({ skills, onAdd, onRemove }: SkillsTabProps) {
  const [showInput, setShowInput] = useState(false)
  const [skillName, setSkillName] = useState('')

  function handleAdd() {
    if (!skillName.trim()) return
    onAdd(skillName.trim())
    setSkillName('')
    setShowInput(false)
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Skills</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-primary"
            onClick={() => setShowInput(!showInput)}
          >
            <Zap className="h-3.5 w-3.5" />
          </Button>
        </div>

        {showInput && (
          <div className="mb-4 flex gap-2">
            <input
              className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              placeholder="Skill name"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button size="sm" onClick={handleAdd}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowInput(false); setSkillName('') }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {skills.length === 0 && !showInput && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Zap className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No skills added yet.</p>
            <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs text-primary" onClick={() => setShowInput(true)}>
              Add Skill
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {skills.map((sk) => (
            <div key={sk} className="group relative inline-flex">
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                sk.includes('verified') || sk.includes('Verified')
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border'
              )}>
                {sk.includes('verified') || sk.includes('Verified') ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : null}
                {sk}
                <button
                  className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-current/60 opacity-0 transition-opacity hover:bg-current/20 group-hover:opacity-100"
                  onClick={() => { onRemove(sk) }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
