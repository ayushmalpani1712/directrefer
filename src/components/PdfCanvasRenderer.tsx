import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface PdfCanvasRendererProps {
  url: string
  onError?: () => void
  onLoaded?: () => void
}

export default function PdfCanvasRenderer({ url, onError, onLoaded }: PdfCanvasRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const renderedRef = useRef(false)

  useEffect(() => {
    if (!url || renderedRef.current) return
    let cancelled = false

    async function renderPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist')

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

        const res = await fetch(url)
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
        const data = await res.arrayBuffer()
        if (cancelled) return

        const pdf = await pdfjsLib.getDocument({ data }).promise
        if (cancelled) return

        const container = containerRef.current
        if (!container) return
        container.innerHTML = ''

        const baseWidth = container.clientWidth || 600
        const maxWidth = 900
        const renderWidth = Math.min(baseWidth, maxWidth)

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return
          const page = await pdf.getPage(i)
          const unscaledViewport = page.getViewport({ scale: 1 })
          const scale = renderWidth / unscaledViewport.width
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          const dpr = window.devicePixelRatio || 1
          canvas.width = viewport.width * dpr
          canvas.height = viewport.height * dpr
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          canvas.style.display = 'block'
          canvas.style.margin = '0 auto'
          canvas.className = 'pdf-page-canvas'

          const ctx = canvas.getContext('2d')
          if (!ctx) continue

          await page.render({ canvasContext: ctx, viewport, canvas } as never).promise
          container.appendChild(canvas)

          if (i < pdf.numPages) {
            const spacer = document.createElement('div')
            spacer.style.height = '2px'
            spacer.style.background = 'hsl(var(--border))'
            spacer.style.margin = '4px auto'
            spacer.style.maxWidth = '90%'
            container.appendChild(spacer)
          }
        }

        if (!cancelled) {
          renderedRef.current = true
          setStatus('ready')
          onLoaded?.()
        }
      } catch (err) {
        console.error('PDF.js render error:', err)
        if (!cancelled) {
          setStatus('error')
          onError?.()
        }
      }
    }

    renderPdf()

    return () => { cancelled = true }
  }, [url, onError, onLoaded])

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
          <p className="mt-3 text-sm text-muted-foreground">Rendering PDF...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto bg-white"
      style={{ WebkitOverflowScrolling: 'touch' }}
    />
  )
}
