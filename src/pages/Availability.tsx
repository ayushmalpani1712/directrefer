import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, Coffee, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Chip, SectionHeader } from '@/components/ui-kit'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Availability() {
  const loading = usePageLoading(350)
  const { user } = useAuth()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [days, setDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu'])
  const [hours, setHours] = useState([18])
  const [vacation, setVacation] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dbId, setDbId] = useState<string | null>(null)

  useEffect(() => {
    const loadAvailability = async () => {
      if (!user) return
      const { data } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setDbId(data.id)
        setDays(data.available_days ?? ['Mon', 'Tue', 'Wed', 'Thu'])
        setHours([data.start_hour ?? 18])
        setVacation(data.vacation_mode ?? false)
      }
    }
    loadAvailability()
  }, [user])

  useEffect(() => {
    if (user && vacation !== undefined) {
      supabase.from('profiles_professional').update({
        open_for_referrals: !vacation
      }).eq('user_id', user.id).then(() => {}, () => {})
    }
  }, [vacation, user])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-md" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-5">
              <Skeleton className="h-5 w-40 rounded-md" />
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-36 rounded-md" />
                <div className="flex gap-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-12 rounded-lg" />
                  ))}
                </div>
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-2.5 w-full rounded-md" />
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
            <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-[#8B8FD4]/[0.05] p-5 space-y-3">
              <Skeleton className="h-5 w-44 rounded-md" />
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const today = new Date()
  const busyDates = [
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
  ]

  return (
    <div className="space-y-6">
      <SectionHeader title="Availability" subtitle="Control when candidates can reach you and when you're off" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader className=""><CardTitle className="flex items-center gap-2 text-base"><CalendarIcon className="h-4 w-4 text-primary" /> Calendar</CardTitle></CardHeader>
          <CardContent className="flex justify-center pt-2">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-xl border border-border"
              modifiers={{ busy: busyDates }}
              modifiersClassNames={{ busy: 'bg-rose-500/15 text-rose-500' }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader className=""><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4 text-primary" /> Weekly review hours</CardTitle></CardHeader>
            <CardContent className="space-y-5 pt-2">
              <div>
                <Label className="text-sm">Days you review requests</Label>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
                      className={cn(
                        'h-10 w-12 rounded-lg border text-sm font-medium transition-all',
                        days.includes(d) ? 'border-primary bg-primary/10 text-primary shadow-glow' : 'border-border text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <Label>Start reviewing after</Label>
                  <span className="font-semibold text-primary">{hours[0]}:00</span>
                </div>
                <Slider value={hours} min={6} max={23} step={1} onValueChange={setHours} className="mt-2.5" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500"><Coffee className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-semibold">Vacation mode</div>
                    <div className="text-xs text-muted-foreground">Pause all requests and hide from search</div>
                  </div>
                </div>
                <Switch checked={vacation} onCheckedChange={(v) => { setVacation(v); toast.success(v ? 'Vacation mode on — see you soon' : 'Welcome back — you\'re live again') }} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-primary/25 bg-gradient-to-br from-primary/[0.05] to-[#8B8FD4]/[0.05]">
            <CardHeader className=""><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-primary" /> Upcoming candidate calls</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 pt-2">
              {[
                { who: 'Jordan Lee', what: 'Referral intro call', when: 'Today · 5:30 PM' },
                { who: 'Sam Rivera', what: 'HM screen prep', when: 'Tomorrow · 6:00 PM' },
              ].map((c) => (
                <div key={c.who} className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5">
                  <div>
                    <div className="text-sm font-semibold">{c.who}</div>
                    <div className="text-xs text-muted-foreground">{c.what}</div>
                  </div>
                  <Chip tone="primary">{c.when}</Chip>
                </div>
              ))}
              <Button
                className="w-full rounded-lg shadow-glow"
                disabled={saving}
                onClick={async () => {
                  if (!user) return
                  setSaving(true)
                  try {
                    const payload = {
                      user_id: user.id,
                      available_days: days,
                      start_hour: hours[0],
                      end_hour: 23,
                      vacation_mode: vacation,
                    }
                    if (dbId) {
                      await supabase.from('availability').update(payload).eq('id', dbId)
                    } else {
                      const { data } = await supabase.from('availability').insert(payload).select().single()
                      if (data) setDbId(data.id)
                    }
                    toast.success('Availability saved')
                  } catch (err) {
                    console.error('Failed to save availability:', err)
                    toast.error('Failed to save availability')
                  } finally {
                    setSaving(false)
                  }
                }}
              >{saving ? 'Saving...' : 'Save availability'}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
