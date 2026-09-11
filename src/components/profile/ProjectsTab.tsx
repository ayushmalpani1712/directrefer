import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Chip } from '@/components/ui-kit'
import { Pencil, Trash2, Sparkles, Plus } from 'lucide-react'

interface Project {
  name: string
  desc: string
  tags: string[]
}

interface ProjectsTabProps {
  projects: Project[]
  onAdd: (proj: Project) => void
  onEdit: (oldName: string, proj: Project) => void
  onDelete: (name: string) => void
}

export function ProjectsTab({ projects, onAdd, onEdit, onDelete }: ProjectsTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editName, setEditName] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [tags, setTags] = useState('')
  const [deleteName, setDeleteName] = useState<string | null>(null)

  function handleAdd() {
    if (!name.trim()) return
    onAdd({ name: name.trim(), desc: desc.trim(), tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
    setName(''); setDesc(''); setTags('')
    setShowForm(false)
  }

  function handleSaveEdit() {
    if (!editName || !name.trim()) return
    onEdit(editName, { name: name.trim(), desc: desc.trim(), tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
    setEditName(null)
    setName(''); setDesc(''); setTags('')
  }

  function handleConfirmDelete() {
    if (deleteName) {
      onDelete(deleteName)
      setDeleteName(null)
    }
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Projects</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-primary"
            onClick={() => {
              setShowForm(!showForm)
              setEditName(null)
              setName(''); setDesc(''); setTags('')
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {showForm && editName === null && (
          <div className="mb-5 rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Project name *" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {projects.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Sparkles className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No projects added yet.</p>
            <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs text-primary" onClick={() => setShowForm(true)}>
              Add Project
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <div key={p.name}>
              {editName === p.name ? (
                <div className="rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Project name *" value={name} onChange={(e) => setName(e.target.value)} />
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditName(null); setName(''); setDesc(''); setTags('') }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="group rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold min-w-0 truncate">{p.name}</div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                        setEditName(p.name)
                        setName(p.name); setDesc(p.desc); setTags(p.tags.join(', '))
                        setShowForm(false)
                      }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => setDeleteName(p.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground break-words line-clamp-2">{p.desc}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">{p.tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {deleteName && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-xl bg-card border border-border p-6 max-w-sm w-full mx-4 space-y-4">
              <h4 className="text-sm font-semibold">Delete project?</h4>
              <p className="text-sm text-muted-foreground">This will permanently remove "{deleteName}".</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setDeleteName(null)}>Cancel</Button>
                <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white" onClick={handleConfirmDelete}>Delete</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
