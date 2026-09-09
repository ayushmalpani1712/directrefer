import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, Briefcase, MapPin, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHeader, EmptyState } from '@/components/ui-kit'

export interface JobAlert {
  id: string
  title: string
  location: string
  type: string
  createdAt: string
}

const STORAGE_KEY = 'dr_job_alerts'

function loadAlerts(): JobAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAlerts(alerts: JobAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
}

export default function JobAlerts() {
  const [alerts, setAlerts] = useState<JobAlert[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')

  useEffect(() => {
    setAlerts(loadAlerts())
  }, [])

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Please enter a job title')
      return
    }
    const alert: JobAlert = {
      id: crypto.randomUUID(),
      title: title.trim(),
      location: location.trim(),
      type: type.trim() || 'Any',
      createdAt: new Date().toISOString(),
    }
    const next = [alert, ...alerts]
    setAlerts(next)
    saveAlerts(next)
    setTitle('')
    setLocation('')
    setType('')
    setShowForm(false)
    toast.success('Job alert saved')
  }

  const handleDelete = (id: string) => {
    const next = alerts.filter((a) => a.id !== id)
    setAlerts(next)
    saveAlerts(next)
    toast.success('Alert deleted')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader title="Job Alerts" subtitle="Save searches to stay updated on new opportunities" />
        <Button className="rounded-full" onClick={() => setShowForm(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Create alert
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">New Job Alert</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setTitle(''); setLocation(''); setType('') }}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="alert-title">Job title or keyword</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="alert-title" placeholder="e.g. Software Engineer" value={title} onChange={(e) => setTitle(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alert-location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="alert-location" placeholder="e.g. Remote, New York" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alert-type">Job type</Label>
                  <Input id="alert-type" placeholder="e.g. Full-time" value={type} onChange={(e) => setType(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="rounded-full">
                  <Bell className="mr-1.5 h-4 w-4" /> Save Alert
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => { setShowForm(false); setTitle(''); setLocation(''); setType('') }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {alerts.length === 0 && !showForm ? (
        <EmptyState
          illustration={<BellOff className="h-12 w-12 text-muted-foreground/50" />}
          title="No job alerts yet"
          description="Create an alert to get notified when new jobs matching your criteria are posted."
          primaryCtaLabel="Create an alert"
          onPrimaryCtaClick={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <motion.div key={alert.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="transition-colors hover:border-primary/20">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{alert.title}</div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {alert.location && <span>{alert.location}</span>}
                      <span>{alert.type}</span>
                      <span>Created {new Date(alert.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => handleDelete(alert.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
