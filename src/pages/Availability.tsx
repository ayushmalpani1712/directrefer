import { useState, useEffect, useRef } from 'react'
import { Calendar as CalendarIcon, Clock, Coffee, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { SectionHeader } from '@/components/ui-kit'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Availability() {
  const loading = usePageLoading(350)
  const { user } = useAuth()
  const { role } = useApp()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [days, setDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu'])
  const [hours, setHours] = useState([18])
  const [vacation, setVacation] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dbId, setDbId] = useState<string | null>(null)
  const [dbLoading, setDbLoading] = useState(true)

  const dbLoadedRef = useRef(false)
  const initialVacationRef = useRef<boolean | null>(null)
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
        initialVacationRef.current = data.vacation_mode ?? false
      } else {
        initialVacationRef.current = false
      }
      dbLoadedRef.current = true
      setDbLoading(false)
    }
    loadAvailability()
  }, [user])

  useEffect(() => {
    if (!dbLoadedRef.current) return
    if (initialVacationRef.current === vacation) return
    if (user && role === 'professional') {
      const prevVacation = initialVacationRef.current ?? vacation
      supabase.from('profiles_professional').update({
        open_for_referrals: !vacation
      }).eq('user_id', user.id).then(() => {
        initialVacationRef.current = vacation
      }, (err) => {
        console.error('Failed to update vacation mode:', err)
        setVacation(prevVacation)
        initialVacationRef.current = prevVacation
        toast.error('Failed to update vacation mode')
      })
    }
  }, [vacation, user, role])

  if (loading || dbLoading) {
    return <div className="flex items-center justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
  }

  const busyDates: Date[] = []

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
            <CardHeader className=""><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-primary" /> Availability settings</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 pt-2">
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
