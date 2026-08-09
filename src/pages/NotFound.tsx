import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Compass, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/context/AppContext'
import { ROLE_ROUTE } from '@/data/mock'

export default function NotFound() {
  const { role } = useApp()
  const base = ROLE_ROUTE[role]

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <div className="font-display bg-gradient-to-br from-[#3B5FE5] to-[#8B8FD4] bg-clip-text text-[96px] font-extrabold leading-none text-transparent">
          404
        </div>
        <h1 className="font-display mt-4 text-2xl font-bold">This page took a wrong turn</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Button className="rounded-full bg-primary shadow-glow" asChild>
            <Link to="/dashboard"><Home className="mr-1.5 h-4 w-4" /> Back to dashboard</Link>
          </Button>
          <Button variant="outline" className="rounded-full" asChild>
            <Link to={role === 'recruiter' ? `${base}/talent` : `${base}/professionals`}><Search className="mr-1.5 h-4 w-4" /> {role === 'recruiter' ? 'Find talent' : 'Find professionals'}</Link>
          </Button>
        </div>
        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Compass className="h-3.5 w-3.5" /> If you believe this is a bug, <Link to="/help" className="text-primary hover:underline">let us know</Link>
        </div>
      </motion.div>
    </div>
  )
}
