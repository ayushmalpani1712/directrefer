import { Link } from "react-router"
import { motion } from "framer-motion"
import { ShieldX, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/context/AppContext"
import { ROLE_ROUTE } from "@/data/constants"

export default function Forbidden() {
  const { role } = useApp()
  const base = ROLE_ROUTE[role]

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
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex size-20 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldX className="size-10 text-destructive" />
          </div>
          <motion.div
            className="absolute -inset-2 rounded-3xl border-2 border-destructive/20"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          />
        </motion.div>

        <div className="font-display text-[72px] font-extrabold leading-none text-destructive/20">
          403
        </div>

        <h1 className="font-display mt-2 text-2xl font-bold">Access Denied</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          You don't have permission to view this page. If you believe this is a
          mistake, contact your administrator.
        </p>

        <Button className="mt-6 rounded-full" asChild>
          <Link to={base}>
            <Home className="mr-1.5 size-4" />
            Go to Dashboard
          </Link>
        </Button>
      </motion.div>
    </div>
  )
}
