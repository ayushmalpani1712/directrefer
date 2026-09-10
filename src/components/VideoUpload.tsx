import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Upload, Video, X, Camera, StopCircle,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface VideoUploadProps {
  userId: string
  jobId?: string
  attemptId?: string
  onUploadComplete: (videoUrl: string, durationSeconds: number) => void
  onCancel: () => void
}

interface UploadedVideo {
  url: string
  duration: number
  name: string
}

const MAX_SIZE_MB = 100
const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const ACCEPTED_EXTENSIONS = '.mp4,.webm,.mov'

export function VideoUpload({
  userId,
  attemptId,
  onUploadComplete,
  onCancel,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploaded, setUploaded] = useState<UploadedVideo | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedDuration, setRecordedDuration] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [])

  const validateFile = (file: File): boolean => {
    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload .mp4, .webm, or .mov files.')
      return false
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`)
      return false
    }
    return true
  }

  const uploadToSupabase = async (file: File | Blob, fileName: string) => {
    setUploading(true)
    setUploadProgress(0)

    const filePath = `${userId}/${attemptId || 'general'}/${fileName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('video-interviews')
        .upload(filePath, file, {
          upsert: true,
          contentType: file instanceof File ? file.type : 'video/webm',
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('video-interviews')
        .getPublicUrl(filePath)

      setUploadProgress(100)

      const videoEl = document.createElement('video')
      videoEl.src = urlData.publicUrl
      const duration = await new Promise<number>((resolve) => {
        videoEl.onloadedmetadata = () => resolve(videoEl.duration)
        videoEl.onerror = () => resolve(0)
      })

      const uploadedVideo: UploadedVideo = {
        url: urlData.publicUrl,
        duration: Math.round(duration),
        name: fileName,
      }

      setUploaded(uploadedVideo)
      toast.success('Video uploaded successfully!')

      if (attemptId) {
        await supabase
          .from('screening_attempts')
          .update({
            evidence: {
              video_url: urlData.publicUrl,
              video_duration_seconds: Math.round(duration),
            },
          })
          .eq('id', attemptId)
      }

      onUploadComplete(urlData.publicUrl, Math.round(duration))
    } catch (err) {
      console.error('Upload failed:', err)
      setError('Upload failed. Please try again.')
      toast.error('Video upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (file: File) => {
    if (!validateFile(file)) return
    await uploadToSupabase(file, `${Date.now()}-${file.name}`)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      })
      streamRef.current = stream
      chunksRef.current = []

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setRecordedBlob(blob)
        setRecordedDuration(recordingTime)
        stream.getTracks().forEach(t => t.stop())
        if (videoRef.current) videoRef.current.srcObject = null
      }

      mediaRecorder.start(1000)
      setRecording(true)
      setRecordingTime(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Camera access denied:', err)
      toast.error('Camera access is required for recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setRecording(false)
  }

  const uploadRecording = async () => {
    if (!recordedBlob) return
    const fileName = `recording-${Date.now()}.webm`
    await uploadToSupabase(recordedBlob, fileName)
  }

  const discardRecording = () => {
    setRecordedBlob(null)
    setRecordedDuration(0)
    setRecordingTime(0)
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (uploaded) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <h3 className="text-sm font-semibold">Video Uploaded</h3>
                <p className="text-xs text-muted-foreground">{uploaded.name} — {formatTime(uploaded.duration)}</p>
              </div>
            </div>
            <video
              src={uploaded.url}
              controls
              className="w-full rounded-lg bg-black/50"
              style={{ maxHeight: 300 }}
            />
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="gap-1.5">
            <X className="h-4 w-4" /> Close
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/5 p-3 text-sm text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {recording && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-sm font-medium">Recording</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">{formatTime(recordingTime)}</span>
            </div>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-lg bg-black/50"
              style={{ maxHeight: 300 }}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={stopRecording}
                className="gap-1.5"
              >
                <StopCircle className="h-4 w-4" /> Stop Recording
              </Button>
              <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {recordedBlob && !uploading && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Recording Preview ({formatTime(recordedDuration)})</span>
            </div>
            <video
              src={URL.createObjectURL(recordedBlob)}
              controls
              className="w-full rounded-lg bg-black/50"
              style={{ maxHeight: 300 }}
            />
            <div className="flex gap-2">
              <Button onClick={uploadRecording} className="bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 gap-1.5">
                <Upload className="h-4 w-4" /> Upload Recording
              </Button>
              <Button variant="outline" onClick={discardRecording} className="gap-1.5">
                <X className="h-4 w-4" /> Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!recording && !recordedBlob && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30',
            )}
          >
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              dragOver ? 'bg-primary/10' : 'bg-muted',
            )}>
              <Upload className={cn('h-5 w-5', dragOver ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div>
              <p className="text-sm font-medium">Drag & drop your video here</p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse — .mp4, .webm, .mov (max {MAX_SIZE_MB}MB)
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
              e.target.value = ''
            }}
            className="hidden"
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={startRecording}
            className="w-full gap-2 h-11"
          >
            <Camera className="h-4 w-4" /> Record with Webcam
          </Button>
        </>
      )}

      {uploading && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium">Uploading...</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
