import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  accept?: string
  maxSize?: number
  onUpload: (file: File) => Promise<void> | void
  label?: string
  className?: string
}

export function FileUpload({ accept = '*/*', maxSize = 10 * 1024 * 1024, onUpload, label = 'Upload file', className }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (f: File) => {
    setError(null)
    if (f.size > maxSize) {
      setError(`File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }
    setFile(f)
    setUploading(true)
    setProgress(0)
    try {
      const interval = setInterval(() => setProgress(p => Math.min(p + 20, 90)), 100)
      await onUpload(f)
      clearInterval(interval)
      setProgress(100)
    } catch {
      setError('Upload failed. Please try again.')
      setFile(null)
    } finally {
      setUploading(false)
    }
  }, [maxSize, onUpload])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  const removeFile = () => {
    setFile(null)
    setProgress(0)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={className}>
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
          <FileIcon className="h-8 w-8 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            {uploading && <Progress value={progress} className="mt-2 h-1.5" />}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={removeFile}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors cursor-pointer',
            dragging ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40 hover:bg-muted/30',
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground/70">Drag & drop or click to browse</p>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
