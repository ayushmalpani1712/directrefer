import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  /** Whether to show entrance animation (default: true) */
  animate?: boolean
}

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.06,
    },
  },
}

const childVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
}

export function PageWrapper({ children, className, animate = true }: PageWrapperProps) {
  if (!animate) {
    return <div className={cn('page-enter', className)}>{children}</div>
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={childVariants} className={className}>
      {children}
    </motion.div>
  )
}
