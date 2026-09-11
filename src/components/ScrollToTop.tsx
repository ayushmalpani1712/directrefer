import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <Button
      size="icon"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-4 z-50 h-10 w-10 rounded-full bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 md:bottom-8"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  )
}
