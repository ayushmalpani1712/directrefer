import { useCallback, useState } from 'react'
import { Share2, Copy, Check, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SocialShareButtonsProps {
  title: string
  url?: string
  via?: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

function encodeShareUrl(url: string): string {
  return encodeURIComponent(url)
}

function buildShareText(title: string): string {
  return title
}

export function SocialShareButtons({
  title,
  url = 'https://www.directrefer.in',
  via = 'DirectRefer',
  className,
  size = 'sm',
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const shareText = buildShareText(title)

  const handleLinkedIn = useCallback(() => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeShareUrl(url)}&summary=${encodeShareUrl(shareText)}`
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer,width=600,height=500')
  }, [url, shareText])

  const handleWhatsApp = useCallback(() => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeShareUrl(shareText + ' ' + url)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }, [url, shareText])

  const handleTwitter = useCallback(() => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeShareUrl(shareText)}&url=${encodeShareUrl(url)}&via=${via}`
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400')
  }, [url, shareText, via])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error('Failed to copy to clipboard')
    })
  }, [url])

  return (
    <div className={cn('inline-flex items-center gap-1 flex-wrap', className)}>
      <Button
        size={size}
        variant="ghost"
        className="rounded-lg gap-1.5 text-xs text-[#0A66C2] hover:text-[#0A66C2]/80 hover:bg-[#0A66C2]/10"
        onClick={handleLinkedIn}
      >
        <Share2 className="h-3.5 w-3.5" /> LinkedIn
      </Button>
      <Button
        size={size}
        variant="ghost"
        className="rounded-lg gap-1.5 text-xs text-[#25D366] hover:text-[#25D366]/80 hover:bg-[#25D366]/10"
        onClick={handleWhatsApp}
      >
        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
      </Button>
      <Button
        size={size}
        variant="ghost"
        className="rounded-lg gap-1.5 text-xs text-[#1DA1F2] hover:text-[#1DA1F2]/80 hover:bg-[#1DA1F2]/10"
        onClick={handleTwitter}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      </Button>
      <Button
        size={size}
        variant="ghost"
        className="rounded-lg gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied!' : 'Copy link'}
      </Button>
    </div>
  )
}
