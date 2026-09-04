import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { type DateRange, getPresetRange } from '@/components/analytics/DateRangeSelector'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface WeeklyDataPoint { label: string; applications: number; responses: number; referrals: number }
export interface MonthlyDataPoint { label: string; referrals: number; accepted: number }
export interface DailyDataPoint { label: string; hours: number }
export interface WeeklyRecruitDataPoint { label: string; applications: number; hires: number }

function getRangeDates(range: DateRange): { from: Date; to: Date } {
  if (range.preset === 'all') return getPresetRange('all')
  return { from: range.from, to: range.to }
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function formatWeekLabel(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

function formatMonthLabel(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[d.getMonth()] + ' ' + String(d.getFullYear()).slice(-2)
}

function formatDayLabel(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[d.getDay()]
}

function generateWeekSlots(from: Date, to: Date): Date[] {
  const slots: Date[] = []
  const start = startOfWeek(from)
  const end = startOfWeek(to)
  const cur = new Date(start)
  while (cur <= end) {
    slots.push(new Date(cur))
    cur.setDate(cur.getDate() + 7)
  }
  return slots
}

function generateMonthSlots(from: Date, to: Date): Date[] {
  const slots: Date[] = []
  const start = startOfMonth(from)
  const end = startOfMonth(to)
  const cur = new Date(start)
  while (cur <= end) {
    slots.push(new Date(cur))
    cur.setMonth(cur.getMonth() + 1)
  }
  return slots
}

function generateDaySlots(from: Date, to: Date): Date[] {
  const slots: Date[] = []
  const cur = new Date(from)
  cur.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(23, 59, 59, 999)
  while (cur <= end) {
    slots.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return slots
}

function bucketToWeek(dateStr: string, slots: Date[]): number {
  const d = new Date(dateStr)
  for (let i = slots.length - 1; i >= 0; i--) {
    if (d >= slots[i]) return i
  }
  return 0
}

function bucketToMonth(dateStr: string, slots: Date[]): number {
  const d = new Date(dateStr)
  for (let i = slots.length - 1; i >= 0; i--) {
    if (d >= slots[i]) return i
  }
  return 0
}

function bucketToDay(dateStr: string, slots: Date[]): number {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  for (let i = slots.length - 1; i >= 0; i--) {
    const s = new Date(slots[i])
    s.setHours(0, 0, 0, 0)
    if (d >= s) return i
  }
  return 0
}

export function useFilteredStudentWeekly(range: DateRange): WeeklyDataPoint[] {
  const { user } = useAuth()
  const [data, setData] = useState<WeeklyDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const genRef = useRef(0)

  const fetchData = useCallback(async () => {
    const gen = ++genRef.current
    setLoading(true)
    const userId = user?.id ?? null
    const { from, to } = getRangeDates(range)

    if (!userId) {
      if (gen === genRef.current) { setData([]); setLoading(false) }
      return
    }

    try {
      const { data: rows } = await supabase
        .from('referrals')
        .select('created_at, status')
        .eq('requester_id', userId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true })

      if (gen !== genRef.current) return
      if (!rows) { setData([]); setLoading(false); return }

      const slots = generateWeekSlots(from, to)
      const result: WeeklyDataPoint[] = slots.map((s) => ({
        label: formatWeekLabel(s),
        applications: 0,
        responses: 0,
        referrals: 0,
      }))

      for (const row of rows) {
        const idx = bucketToWeek(row.created_at, slots)
        if (idx >= 0 && idx < result.length) {
          result[idx].applications++
          if (row.status === 'accepted' || row.status === 'offered') {
            result[idx].responses++
          }
          result[idx].referrals++
        }
      }

      setData(result)
    } catch {
      if (gen === genRef.current) setData([])
    } finally {
      if (gen === genRef.current) setLoading(false)
    }
  }, [range, user])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && data.length === 0) return []
  return data
}

export function useFilteredProMonthly(range: DateRange): MonthlyDataPoint[] {
  const { user } = useAuth()
  const [data, setData] = useState<MonthlyDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const genRef = useRef(0)

  const fetchData = useCallback(async () => {
    const gen = ++genRef.current
    setLoading(true)
    const userId = user?.id ?? null
    const { from, to } = getRangeDates(range)

    if (!userId) {
      if (gen === genRef.current) { setData([]); setLoading(false) }
      return
    }

    try {
      const { data: rows } = await supabase
        .from('referrals')
        .select('created_at, status')
        .eq('professional_id', userId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true })

      if (gen !== genRef.current) return
      if (!rows) { setData([]); setLoading(false); return }

      const slots = generateMonthSlots(from, to)
      const result: MonthlyDataPoint[] = slots.map((s) => ({
        label: formatMonthLabel(s),
        referrals: 0,
        accepted: 0,
      }))

      for (const row of rows) {
        const idx = bucketToMonth(row.created_at, slots)
        if (idx >= 0 && idx < result.length) {
          result[idx].referrals++
          if (row.status === 'accepted' || row.status === 'offered') {
            result[idx].accepted++
          }
        }
      }

      setData(result)
    } catch {
      if (gen === genRef.current) setData([])
    } finally {
      if (gen === genRef.current) setLoading(false)
    }
  }, [range, user])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && data.length === 0) return []
  return data
}

export function useFilteredProResponseTime(range: DateRange): DailyDataPoint[] {
  const { user } = useAuth()
  const [data, setData] = useState<DailyDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const genRef = useRef(0)

  const fetchData = useCallback(async () => {
    const gen = ++genRef.current
    setLoading(true)
    const userId = user?.id ?? null
    const { from, to } = getRangeDates(range)

    if (!userId) {
      if (gen === genRef.current) { setData([]); setLoading(false) }
      return
    }

    try {
      const { data: rows } = await supabase
        .from('messages')
        .select('conversation_id, sender_id, created_at')
        .eq('sender_id', userId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true })

      if (gen !== genRef.current) return

      const { data: sentConvs } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('sender_id', userId)

      if (gen !== genRef.current) return

      const convIds = sentConvs?.map((r) => r.conversation_id) ?? []

      const { data: receivedRows } = convIds.length > 0
        ? await supabase
          .from('messages')
          .select('conversation_id, sender_id, created_at')
          .neq('sender_id', userId)
          .in('conversation_id', convIds)
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString())
          .order('created_at', { ascending: true })
        : { data: [] }

      if (gen !== genRef.current) return
      if (!rows || !receivedRows) { setData([]); setLoading(false); return }

      const slots = generateDaySlots(from, to)
      const result: DailyDataPoint[] = slots.map((s) => ({
        label: formatDayLabel(s),
        hours: 0,
      }))

      const sentByConv = new Map<string, string[]>()
      for (const r of rows) {
        const list = sentByConv.get(r.conversation_id) || []
        list.push(r.created_at)
        sentByConv.set(r.conversation_id, list)
      }

      const countByDay = new Map<number, number>()
      for (const r of receivedRows) {
        const sentTimes = sentByConv.get(r.conversation_id) || []
        const nextReply = sentTimes.find((t) => new Date(t) > new Date(r.created_at))
        if (nextReply) {
          const hoursDiff = (new Date(nextReply).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)
          if (hoursDiff >= 0 && hoursDiff <= 168) {
            const dayIdx = bucketToDay(r.created_at, slots)
            if (dayIdx >= 0 && dayIdx < result.length) {
              const count = (countByDay.get(dayIdx) ?? 0) + 1
              countByDay.set(dayIdx, count)
              result[dayIdx].hours = Math.round((result[dayIdx].hours * (count - 1) + hoursDiff) / count * 10) / 10
            }
          }
        }
      }

      setData(result)
    } catch {
      if (gen === genRef.current) setData([])
    } finally {
      if (gen === genRef.current) setLoading(false)
    }
  }, [range, user])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && data.length === 0) return []
  return data
}

export function useFilteredRecruiterWeekly(range: DateRange): WeeklyRecruitDataPoint[] {
  const { user } = useAuth()
  const [data, setData] = useState<WeeklyRecruitDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const genRef = useRef(0)

  const fetchData = useCallback(async () => {
    const gen = ++genRef.current
    setLoading(true)
    const userId = user?.id ?? null
    const { from, to } = getRangeDates(range)

    if (!userId) {
      if (gen === genRef.current) { setData([]); setLoading(false) }
      return
    }

    try {
      const { data: jobRows } = await supabase
        .from('jobs')
        .select('id')
        .eq('recruiter_id', userId)

      if (gen !== genRef.current) return

      const jobIds = jobRows?.map((j) => j.id) ?? []

      if (jobIds.length === 0) {
        if (gen === genRef.current) { setData([]); setLoading(false) }
        return
      }

      const { data: nonRecruiters } = await supabase
        .from('users')
        .select('id')
        .neq('role', 'recruiter')

      if (gen !== genRef.current) return

      const proIds = nonRecruiters?.map((u) => u.id) ?? []

      const { data: rows } = proIds.length > 0
        ? await supabase
          .from('referrals')
          .select('created_at, status')
          .in('professional_id', proIds)
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString())
          .order('created_at', { ascending: true })
        : { data: [] }

      if (gen !== genRef.current) return

      const slots = generateWeekSlots(from, to)
      const result: WeeklyRecruitDataPoint[] = slots.map((s) => ({
        label: formatWeekLabel(s),
        applications: 0,
        hires: 0,
      }))

      if (rows) {
        for (const row of rows) {
          const idx = bucketToWeek(row.created_at, slots)
          if (idx >= 0 && idx < result.length) {
            result[idx].applications++
            if (row.status === 'accepted' || row.status === 'offered') {
              result[idx].hires++
            }
          }
        }
      }

      setData(result)
    } catch {
      if (gen === genRef.current) setData([])
    } finally {
      if (gen === genRef.current) setLoading(false)
    }
  }, [range, user])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && data.length === 0) return []
  return data
}

export function useFilteredStats(range: DateRange, base: { value: number; delta?: number }) {
  return useMemo(() => base, [range, base])
}

export function hasData<T>(data: T[]): boolean {
  return data.length > 0
}
