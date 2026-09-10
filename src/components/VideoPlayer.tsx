import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Bookmark, MessageSquare,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
  src: string
  notes?: VideoNote[]
  onNoteAdd?: (note: VideoNote) => void
  onNoteRemove?: (noteId: string) => void
  className?: string
}

interface VideoNote {
  id: string
  timestamp: number
  text: string
  createdAt: string
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2]

export function VideoPlayer({
  src,
  notes = [],
  onNoteAdd,
  onNoteRemove,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onDurationChange = () => setDuration(video.duration)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolumeChange = () => {
      setMuted(video.muted)
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('volumechange', onVolumeChange)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('volumechange', onVolumeChange)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    if (playing) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [playing])

  useEffect(() => {
    resetControlsTimer()
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    }
  }, [playing, resetControlsTimer])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) videoRef.current.play()
    else videoRef.current.pause()
  }

  const seek = (seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds))
  }

  const seekTo = (time: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = time
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
  }

  const changeSpeed = () => {
    if (!videoRef.current) return
    const idx = SPEED_OPTIONS.indexOf(playbackSpeed)
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]
    videoRef.current.playbackRate = next
    setPlaybackSpeed(next)
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await containerRef.current.requestFullscreen()
    }
  }

  const addNote = () => {
    if (!noteText.trim() || !onNoteAdd) return
    onNoteAdd({
      id: crypto.randomUUID(),
      timestamp: Math.floor(currentTime),
      text: noteText.trim(),
      createdAt: new Date().toISOString(),
    })
    setNoteText('')
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    videoRef.current.currentTime = pct * duration
  }

  const handleMouseMove = () => resetControlsTimer()

  const sortedNotes = [...notes].sort((a, b) => a.timestamp - b.timestamp)

  return (
    <div
      ref={containerRef}
      className={cn('relative bg-black rounded-xl overflow-hidden group', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        onClick={togglePlay}
        className="w-full aspect-video cursor-pointer"
        playsInline
      />

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12"
          >
            {/* Note markers on progress bar */}
            <div
              ref={progressBarRef}
              onClick={handleProgressClick}
              className="relative h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/progress"
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              {sortedNotes.map(note => (
                <button
                  key={note.id}
                  onClick={(e) => { e.stopPropagation(); seekTo(note.timestamp) }}
                  className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-amber-400 border-2 border-black hover:scale-150 transition-transform"
                  style={{ left: `${duration > 0 ? (note.timestamp / duration) * 100 : 0}%` }}
                  title={note.text}
                />
              ))}
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary/0 group-hover/progress:bg-primary/10 transition-colors" />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => seek(-10)}
                  className="text-white hover:bg-white/20"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => seek(10)}
                  className="text-white hover:bg-white/20"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>

                <span className="text-xs text-white/70 font-mono ml-1">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {onNoteAdd && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowNotes(!showNotes)}
                    className={cn('text-white hover:bg-white/20', showNotes && 'bg-white/20')}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={changeSpeed}
                  className="text-white hover:bg-white/20 text-xs font-mono h-7 px-2"
                >
                  {playbackSpeed}x
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes sidebar */}
      <AnimatePresence>
        {showNotes && onNoteAdd && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 w-72 bg-card/95 backdrop-blur-sm border-l border-border/60 flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-border/60">
              <span className="text-xs font-semibold">Timestamp Notes</span>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowNotes(false)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sortedNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No notes yet. Add one at the current timestamp.
                </p>
              ) : (
                sortedNotes.map(note => (
                  <div key={note.id} className="group rounded-lg border border-border/60 p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => seekTo(note.timestamp)}
                        className="text-[10px] font-mono text-primary hover:underline"
                      >
                        {formatTime(note.timestamp)}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onNoteRemove?.(note.id)}
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">Remove</span>
                        <span className="text-xs text-muted-foreground hover:text-destructive">&times;</span>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{note.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Bookmark className="h-3 w-3" />
                <span>Add note at {formatTime(currentTime)}</span>
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Type a note..."
                  className="min-h-[60px] text-xs resize-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }}
                />
              </div>
              <Button
                size="sm"
                onClick={addNote}
                disabled={!noteText.trim()}
                className="w-full bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 text-xs"
              >
                Add Note
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
