import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  Briefcase, ShieldCheck, User, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GAvatar } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { ROLE_META, ROLE_ROUTE, getRoleFromPath, type Role } from '@/data/mock'
import { cn } from '@/lib/utils'

const ROLE_ICONS: Record<Role, typeof User> = {
  student: User,
  professional: Briefcase,
  recruiter: Users,
  admin: ShieldCheck,
}

export function WorkspaceSwitcher() {
  const { setRole, isAdmin, student, logout } = useApp()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const urlRole = getRoleFromPath(pathname)

  const workspaceRoles: Role[] = useMemo(() =>
    isAdmin ? ['student', 'professional', 'recruiter', 'admin'] : ['student', 'professional', 'recruiter'],
  [isAdmin])

  const handleSwitch = (r: Role) => {
    if (r === urlRole) return

    setRole(r)
    // replace: true drops ?conversation=... and prevents back-nav to stale workspace
    navigate(ROLE_ROUTE[r], { replace: true })
    toast.success(`Switched to ${ROLE_META[r].label} workspace`)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full p-1 pr-1.5 transition-colors hover:bg-muted">
            <GAvatar name={student?.name ?? 'U'} gradient={student?.gradient ?? 0} className="h-9 w-9 text-xs" ring />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={0} className="w-72">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <GAvatar name={student?.name ?? 'U'} gradient={student?.gradient ?? 0} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{student?.name ?? 'User'}</div>
              <div className="truncate text-xs text-muted-foreground">
                {student.headline || ROLE_META[urlRole].label}
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </DropdownMenuLabel>
          {workspaceRoles.map((r) => {
            const Icon = ROLE_ICONS[r]
            const isActive = urlRole === r
            const isSuperAdmin = r === 'admin'
            return (
              <DropdownMenuItem
                key={r}
                className={cn('flex items-center justify-between gap-2')}
                onSelect={() => handleSwitch(r)}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{ROLE_META[r].label}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {isSuperAdmin && (
                    <Badge variant="outline" className="gap-0.5 border-violet-500/30 bg-violet-500/5 text-[10px] text-violet-600 dark:text-violet-400">
                      <ShieldCheck className="h-2.5 w-2.5" /> Admin
                    </Badge>
                  )}
                  {isActive && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate(`${ROLE_ROUTE[urlRole]}/settings`)}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-500 focus:text-rose-500"
            onSelect={async () => {
              try {
                logout()
                await signOut()
                navigate('/login')
              } catch (err) {
                console.error('Sign out failed:', err)
                toast.error('Sign out failed. Please try again.')
              }
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
