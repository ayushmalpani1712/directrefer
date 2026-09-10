import { useState, useRef, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, CheckCircle2, XCircle, ExternalLink, Clock, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Link } from 'react-router'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/db'


interface TimestampNote {
  time: number
  note: string
}

interface AdminVideoReviewProps {
  attemptId: string
  candidateId: string
  candidateName: string
  videoUrl?: string
  screeningAnswers: Record<string, unknown>
  onClose: () => void
  onReviewed: () => void
}

export function AdminVideoReview({
  attemptId,
  candidateId,
  candidateName,
  videoUrl,
  screeningAnswers,
  onClose,
  onReviewed,
}: AdminVideoReviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [notes, setNotes] = useState('')
  const [timestampNotes, setTimestampNotes] = useState<TimestampNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [processingAction, setProcessingAction] = useState<'pass' | 'fail' | null>(null)

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) videoRef.current.pause()
    else videoRef.current.play()
    setPlaying(!playing)
  }

  const seek = (delta: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta))
  }

  const addTimestampNote = () => {
    if (!newNote.trim()) return
    setTimestampNotes(prev => [...prev, { time: currentTime, note: newNote.trim() }])
    setNewNote('')
  }

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = Math.floor(s % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const saveReview = useCallback(async (passed: boolean) => {
    setSaving(true)
    setProcessingAction(passed ? 'pass' : 'fail')
    try {
      const allNotes = [
        notes,
        ...timestampNotes.map(n => `[${formatTime(n.time)}] ${n.note}`),
      ].filter(Boolean).join('\n')

      await supabase
        .from('screening_attempts')
        .update({
          passed,
          score: passed ? 100 : 0,
          reviewed_at: new Date().toISOString(),
          evidence: {
            ...screeningAnswers,
            admin_notes: allNotes || null,
            video_timestamp_notes: timestampNotes,
          },
        })
        .eq('id', attemptId)

      logAdminAction(passed ? 'video_review_approved' : 'video_review_rejected', attemptId, {
        notes: allNotes || undefined,
        timestampNotes: timestampNotes.length,
      })

      toast.success(`Candidate ${passed ? 'approved' : 'rejected'}`)
      onReviewed()
    } catch {
      toast.error('Failed to save review')
    } finally {
      setSaving(false)
      setProcessingAction(null)
    }
  }, [attemptId, notes, timestampNotes, screeningAnswers, onReviewed])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Video Review</CardTitle>
            <p className="text-sm text-muted-foreground">{candidateName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/job-seekers/${candidateId}`}>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3.5 w-3.5" /> Profile
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {videoUrl ? (
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full max-h-[400px]"
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
                onEnded={() => setPlaying(false)}
                muted={muted}
              />
              <div className="flex items-center gap-2 bg-muted/80 px-3 py-2">
                <Button variant="ghost" size="sm" onClick={() => seek(-10)}><SkipBack className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={togglePlay}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                <Button variant="ghost" size="sm" onClick={() => seek(10)}><SkipForward className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setMuted(!muted)}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
                <span className="text-xs text-muted-foreground ml-2">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="flex-1 mx-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No video available for this screening</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Timestamp Notes</h4>
              <div className="flex gap-2">
                <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{formatTime(currentTime)}</Badge>
                <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add note at current timestamp..." className="flex-1" onKeyDown={e => { if (e.key === 'Enter') addTimestampNote() }} />
                <Button variant="outline" size="sm" onClick={addTimestampNote}>Add</Button>
              </div>
              <div className="max-h-[150px] overflow-y-auto space-y-1">
                {timestampNotes.map((n, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge variant="secondary" className="shrink-0 text-[10px]">{formatTime(n.time)}</Badge>
                    <span className="text-muted-foreground">{n.note}</span>
                  </div>
                ))}
                {timestampNotes.length === 0 && (
                  <p className="text-xs text-muted-foreground/50">No timestamp notes yet</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">General Notes</h4>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add review notes..." className="min-h-[120px]" />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Screening Answers</h4>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
              {Object.entries(screeningAnswers).filter(([k]) => !['admin_notes', 'video_url', 'video_timestamp_notes'].includes(k)).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span>{' '}
                  <span className="text-muted-foreground">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400" disabled={saving} onClick={() => saveReview(true)}>
              {processingAction === 'pass' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve
            </Button>
            <Button variant="outline" className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400" disabled={saving} onClick={() => saveReview(false)}>
              {processingAction === 'fail' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <XCircle className="h-3.5 w-3.5" />}
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
