import { Link } from "react-router"
import { motion } from "framer-motion"
import { AlertTriangle, Home, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ServerError() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center"
      >
        <motion.div
          className="relative mb-6"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex size-20 items-center justify-center rounded-2xl bg-amber-500/10">
            <AlertTriangle className="size-10 text-amber-500" />
          </div>
          <motion.div
            className="absolute -inset-2 rounded-3xl border-2 border-amber-500/20"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          />
        </motion.div>

        <div className="font-display text-[72px] font-extrabold leading-none text-muted-foreground/20">
          500
        </div>

        <h1 className="font-display mt-2 text-2xl font-bold">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Our servers encountered an error. Please try again or contact support
          if the problem persists.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Button
            className="rounded-full"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="mr-1.5 size-4" />
            Try Again
          </Button>
          <Button variant="outline" className="rounded-full" asChild>
            <Link to="/">
              <Home className="mr-1.5 size-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
