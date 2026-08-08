import { useCallback, useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LinkedInShareButtonProps {
  /** The role/job title being referred for */
  role: string
  /** Company name to include in the share text */
  company?: string
  /** Name of the professional who referred (optional) */
  professionalName?: string
  /** Custom share text override */
  customText?: string
  /** Button variant */
  variant?: 'ghost' | 'outline' | 'default'
  /** Button size */
  size?: 'sm' | 'default' | 'lg'
  /** Show copy-to-clipboard alongside share */
  showCopy?: boolean
  className?: string
}

function buildShareText(role: string, company?: string, professionalName?: string): string {
  const companyPart = company ? ` at ${company}` : ''
  const viaPart = professionalName ? ` through ${professionalName}` : ''
  return `Just got referred to ${role}${companyPart}${viaPart} through DirectRefer! 🚀 https://www.directrefer.in`
}

function buildLinkedInUrl(shareText: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://www.directrefer.in')}&summary=${encodeURIComponent(shareText)}`
}

export function LinkedInShareButton({
  role,
  company,
  professionalName,
  customText,
  variant = 'ghost',
  size = 'sm',
  showCopy = true,
  className,
}: LinkedInShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const shareText = customText || buildShareText(role, company, professionalName)
  const linkedInUrl = buildLinkedInUrl(shareText)

  const handleShare = useCallback(() => {
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer,width=600,height=500')
  }, [linkedInUrl])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error('Failed to copy to clipboard')
    })
  }, [shareText])

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Button
        size={size}
        variant={variant}
        className="rounded-lg gap-1.5 text-xs text-[#0A66C2] hover:text-[#0A66C2]/80 hover:bg-[#0A66C2]/10"
        onClick={handleShare}
      >
        <Share2 className="h-3.5 w-3.5" /> Share on LinkedIn
      </Button>
      {showCopy && (
        <Button
          size={size}
          variant="ghost"
          className="rounded-lg gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      )}
    </div>
  )
}
