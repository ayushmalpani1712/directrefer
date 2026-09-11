import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil, Trash2, Building2, Plus } from 'lucide-react'

interface Experience {
  title: string
  org: string
  period: string
  desc: string
}

interface ExperienceTabProps {
  experience: Experience[]
  onAdd: (exp: Experience) => void
  onEdit: (index: number, exp: Experience) => void
  onDelete: (index: number) => void
}

export function ExperienceTab({ experience, onAdd, onEdit, onDelete }: ExperienceTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [org, setOrg] = useState('')
  const [period, setPeriod] = useState('')
  const [desc, setDesc] = useState('')
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  function handleAdd() {
    if (!title.trim() || !org.trim()) return
    onAdd({ title: title.trim(), org: org.trim(), period: period.trim() || 'Present', desc: desc.trim() })
    setTitle(''); setOrg(''); setPeriod(''); setDesc('')
    setShowForm(false)
  }

  function handleSaveEdit() {
    if (editIndex === null || !title.trim() || !org.trim()) return
    onEdit(editIndex, { title: title.trim(), org: org.trim(), period: period.trim() || 'Present', desc: desc.trim() })
    setEditIndex(null)
    setTitle(''); setOrg(''); setPeriod(''); setDesc('')
  }

  function handleConfirmDelete() {
    if (deleteIndex !== null) {
      onDelete(deleteIndex)
      setDeleteIndex(null)
    }
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Experience</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-primary"
            onClick={() => {
              setShowForm(!showForm)
              setEditIndex(null)
              setTitle(''); setOrg(''); setPeriod(''); setDesc('')
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {showForm && editIndex === null && (
          <div className="mb-5 rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Job title *" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Organization *" value={org} onChange={(e) => setOrg(e.target.value)} />
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Period (e.g. Jan 2024 - Present)" value={period} onChange={(e) => setPeriod(e.target.value)} />
            <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none" rows={2} placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {experience.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No experience added yet.</p>
            <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs text-primary" onClick={() => setShowForm(true)}>
              Add Experience
            </Button>
          </div>
        )}

        <div className="relative">
          {experience.length > 0 && (
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
          )}

          <div className="space-y-0">
            {experience.map((e, i) => (
              <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted border-2 border-card">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  {editIndex === i ? (
                    <div className="rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Job title *" value={title} onChange={(e) => setTitle(e.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Organization *" value={org} onChange={(e) => setOrg(e.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Period (e.g. Jan 2024 - Present)" value={period} onChange={(e) => setPeriod(e.target.value)} />
                      <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none" rows={2} placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditIndex(null); setTitle(''); setOrg(''); setPeriod(''); setDesc('') }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold min-w-0 truncate">{e.title}</div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                            setEditIndex(i)
                            setTitle(e.title); setOrg(e.org); setPeriod(e.period); setDesc(e.desc)
                            setShowForm(false)
                          }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => setDeleteIndex(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{e.org} &middot; {e.period}</div>
                      {e.desc && <p className="mt-2 text-sm leading-relaxed text-muted-foreground break-words">{e.desc}</p>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {deleteIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-xl bg-card border border-border p-6 max-w-sm w-full mx-4 space-y-4">
              <h4 className="text-sm font-semibold">Delete experience?</h4>
              <p className="text-sm text-muted-foreground">This will permanently remove this experience entry.</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setDeleteIndex(null)}>Cancel</Button>
                <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white" onClick={handleConfirmDelete}>Delete</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
