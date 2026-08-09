import { useEffect, useState, useRef, useCallback } from 'react'
import { Download, ExternalLink, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface ResumePreviewProps {
  url: string
  fileName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewState = 'loading' | 'ready' | 'error'

export default function ResumePreview({ url, fileName, open, onOpenChange }: ResumePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [state, setState] = useState<PreviewState>('loading')
  const prevBlobRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open || !url) {
      setBlobUrl(null)
      setState('loading')
      return
    }
    let cancelled = false

    setState('loading')
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        if (cancelled) return
        if (blob.size < 100) {
          setState('error')
          return
        }
        const created = URL.createObjectURL(blob)
        if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current)
        prevBlobRef.current = created
        setBlobUrl(created)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [open, url])

  useEffect(() => {
    return () => {
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current)
    }
  }, [])

  const previewUrl = blobUrl || url

  const handleIframeError = useCallback(() => {
    setState('error')
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!rounded-xl overflow-hidden [&>button]:hidden"
        style={{ maxWidth: 'none', width: 'calc(100vw - 2rem)', height: 'calc(100vh - 2rem)', padding: 0, gap: 0, display: 'flex', flexDirection: 'column' }}
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{fileName || 'Resume'}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-3 w-3" /> Open
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                const a = document.createElement('a')
                a.href = url
                a.download = fileName || 'resume.pdf'
                a.click()
              }}
            >
              <Download className="h-3 w-3" /> Download
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onOpenChange(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="relative flex-1 min-h-0 bg-muted">
          {state === 'error' ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-destructive/40" />
                <p className="mt-3 text-sm font-medium text-foreground">Failed to load PDF document.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The file may be corrupt or too small to display.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open in new tab
                </Button>
              </div>
            </div>
          ) : state === 'loading' ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Loading preview...</p>
              </div>
            </div>
          ) : (
            <object
              data={previewUrl}
              type="application/pdf"
              className="h-full w-full"
              title={fileName || 'Resume preview'}
              onError={handleIframeError}
            >
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">PDF preview not available</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open in new tab
                  </Button>
                </div>
              </div>
            </object>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
