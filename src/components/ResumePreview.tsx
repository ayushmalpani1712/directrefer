import { useEffect, useState, useCallback, useRef } from 'react'
import { Download, ExternalLink, FileText, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

interface ResumePreviewProps {
  url: string
  fileName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/storage\/v\d+\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/)
  if (match) return { bucket: match[1], path: match[2] }
  return null
}

async function resolveUrl(url: string): Promise<string> {
  const parsed = parseSupabaseStorageUrl(url)
  if (parsed) {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 3600)
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to get signed URL')
    return data.signedUrl
  }
  return url
}

async function fetchBlobUrl(url: string): Promise<string> {
  const signedUrl = await resolveUrl(url)
  const res = await fetch(signedUrl)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export default function ResumePreview({ url, fileName, open, onOpenChange }: ResumePreviewProps) {
  const [blobUrl, setBlobUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const blobUrlRef = useRef('')

  useEffect(() => {
    if (!open || !url) {
      setBlobUrl('')
      setIsLoading(true)
      setHasError(false)
      return
    }

    let cancelled = false

    setIsLoading(true)
    setHasError(false)
    setBlobUrl('')

    fetchBlobUrl(url)
      .then((bUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(bUrl)
          return
        }
        blobUrlRef.current = bUrl
        setBlobUrl(bUrl)
      })
      .catch((err) => {
        console.error('PDF load failed:', err)
        if (!cancelled) {
          setHasError(true)
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = ''
      }
    }
  }, [open, url])

  const getSignedUrl = useCallback(async (): Promise<string> => {
    return resolveUrl(url)
  }, [url])

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
              onClick={async () => {
                const u = await getSignedUrl()
                window.open(u, '_blank', 'noopener,noreferrer')
              }}
            >
              <ExternalLink className="h-3 w-3" /> Open
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={async () => {
                const u = await getSignedUrl()
                const a = document.createElement('a')
                a.href = u
                a.download = fileName || 'resume.pdf'
                a.target = '_blank'
                a.rel = 'noopener noreferrer'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              }}
            >
              <Download className="h-3 w-3" /> Download
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onOpenChange(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 overflow-hidden bg-muted">
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
                <p className="mt-3 text-sm text-muted-foreground">Loading preview...</p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-destructive/40" />
                <p className="mt-3 text-sm font-medium text-foreground">Unable to preview file</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">Could not load the document for preview.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={async () => {
                  const u = await getSignedUrl()
                  window.open(u, '_blank', 'noopener,noreferrer')
                }}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open in new tab
                </Button>
              </div>
            </div>
          )}

          {blobUrl && !hasError && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              style={{ minHeight: '100%' }}
              title={fileName || 'PDF Preview'}
              onLoad={() => setIsLoading(false)}
              onError={() => setHasError(true)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
