import { useEffect, useState, useCallback, useRef } from 'react'
import { Download, ExternalLink, FileText, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

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

async function fetchPdfData(url: string): Promise<ArrayBuffer> {
  const signedUrl = await resolveUrl(url)
  const res = await fetch(signedUrl)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.arrayBuffer()
}

function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

async function renderPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  maxWidth: number,
) {
  const page = await pdf.getPage(pageNum)
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = Math.min(maxWidth / baseViewport.width, 3)
  const viewport = page.getViewport({ scale })

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`

  await page.render({ canvas, viewport }).promise
}

export default function ResumePreview({ url, fileName, open, onOpenChange }: ResumePreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
  const [renderWidth, setRenderWidth] = useState(800)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef(false)

  useEffect(() => {
    if (!open || !url) {
      setPdfData(null)
      setIsLoading(true)
      setHasError(false)
      return
    }

    abortRef.current = false
    setIsLoading(true)
    setHasError(false)
    setPdfData(null)

    fetchPdfData(url)
      .then((data) => {
        if (abortRef.current) return
        setPdfData(data)
      })
      .catch((err) => {
        console.error('PDF load failed:', err)
        if (!abortRef.current) {
          setHasError(true)
          setIsLoading(false)
        }
      })

    return () => { abortRef.current = true }
  }, [open, url])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) setRenderWidth(Math.floor(w) - 32)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!pdfData || !canvasContainerRef.current) return

    let cancelled = false

    const renderAll = async () => {
      const container = canvasContainerRef.current
      if (!container) return

      container.innerHTML = ''

      let pdf: PDFDocumentProxy | null = null
      try {
        pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise
      } catch {
        if (!cancelled) {
          setHasError(true)
          setIsLoading(false)
        }
        return
      }

      if (cancelled) return

      const totalPages = pdf.numPages
      const fragment = document.createDocumentFragment()

      for (let i = 1; i <= totalPages; i++) {
        if (cancelled) break
        const canvas = document.createElement('canvas')
        canvas.className = 'block mx-auto mb-2 shadow-md rounded'
        canvas.dataset.pageNum = String(i)
        fragment.appendChild(canvas)
        try {
          await renderPageToCanvas(pdf, i, canvas, renderWidth)
        } catch (err) {
          console.warn(`Page ${i} render failed:`, err)
        }
      }

      if (!cancelled) {
        container.appendChild(fragment)
        setIsLoading(false)
      }
    }

    renderAll()

    return () => {
      cancelled = true
      if (canvasContainerRef.current) canvasContainerRef.current.innerHTML = ''
    }
  }, [pdfData, renderWidth])

  const getSignedUrl = useCallback(async (): Promise<string> => {
    return resolveUrl(url)
  }, [url])

  const isMobile = detectMobile()

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

        <div ref={containerRef} className="relative flex-1 min-h-0 overflow-auto bg-muted">
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
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  {isMobile
                    ? 'Preview is not available on this device. Tap below to open or download the file.'
                    : 'Could not load the document for preview.'}
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={async () => {
                  const u = await getSignedUrl()
                  window.open(u, '_blank', 'noopener,noreferrer')
                }}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open in new tab
                </Button>
              </div>
            </div>
          )}

          {!hasError && (
            <div ref={canvasContainerRef} className="py-4" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
