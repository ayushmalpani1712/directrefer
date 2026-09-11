import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil, Trash2, GraduationCap, Plus } from 'lucide-react'

interface Education {
  school: string
  degree: string
  period: string
  detail: string
}

interface EducationTabProps {
  education: Education[]
  onAdd: (edu: Education) => void
  onEdit: (index: number, edu: Education) => void
  onDelete: (index: number) => void
}

export function EducationTab({ education, onAdd, onEdit, onDelete }: EducationTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [school, setSchool] = useState('')
  const [degree, setDegree] = useState('')
  const [period, setPeriod] = useState('')
  const [detail, setDetail] = useState('')
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  function handleAdd() {
    if (!school.trim() || !degree.trim()) return
    onAdd({ school: school.trim(), degree: degree.trim(), period: period.trim() || 'Present', detail: detail.trim() })
    setSchool(''); setDegree(''); setPeriod(''); setDetail('')
    setShowForm(false)
  }

  function handleSaveEdit() {
    if (editIndex === null || !school.trim() || !degree.trim()) return
    onEdit(editIndex, { school: school.trim(), degree: degree.trim(), period: period.trim() || 'Present', detail: detail.trim() })
    setEditIndex(null)
    setSchool(''); setDegree(''); setPeriod(''); setDetail('')
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
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Education</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-primary"
            onClick={() => {
              setShowForm(!showForm)
              setEditIndex(null)
              setSchool(''); setDegree(''); setPeriod(''); setDetail('')
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {showForm && editIndex === null && (
          <div className="mb-5 rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="School *" value={school} onChange={(e) => setSchool(e.target.value)} />
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Degree *" value={degree} onChange={(e) => setDegree(e.target.value)} />
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Period (e.g. 2020 - 2024)" value={period} onChange={(e) => setPeriod(e.target.value)} />
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Detail (e.g. GPA, honors)" value={detail} onChange={(e) => setDetail(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {education.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <GraduationCap className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No education added yet.</p>
            <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs text-primary" onClick={() => setShowForm(true)}>
              Add Education
            </Button>
          </div>
        )}

        <div className="relative">
          {education.length > 0 && (
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
          )}

          <div className="space-y-0">
            {education.map((e, i) => (
              <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted border-2 border-card">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  {editIndex === i ? (
                    <div className="rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="School *" value={school} onChange={(e) => setSchool(e.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Degree *" value={degree} onChange={(e) => setDegree(e.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Period (e.g. 2020 - 2024)" value={period} onChange={(e) => setPeriod(e.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Detail (e.g. GPA, honors)" value={detail} onChange={(e) => setDetail(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditIndex(null); setSchool(''); setDegree(''); setPeriod(''); setDetail('') }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold min-w-0 truncate">{e.school}</div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                            setEditIndex(i)
                            setSchool(e.school); setDegree(e.degree); setPeriod(e.period); setDetail(e.detail)
                            setShowForm(false)
                          }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => setDeleteIndex(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{e.degree} &middot; {e.period}</div>
                      {e.detail && <div className="mt-1 text-xs text-muted-foreground break-words">{e.detail}</div>}
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
              <h4 className="text-sm font-semibold">Delete education?</h4>
              <p className="text-sm text-muted-foreground">This will permanently remove this education entry.</p>
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
