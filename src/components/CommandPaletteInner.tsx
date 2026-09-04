import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, Plus, Sun, CircleHelp } from 'lucide-react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command'
import { useApp } from '@/context/AppContext'

// Re-declare navFor here to avoid circular imports — it's a pure function of role
// Actually, we import it from layout which is already loaded
// We need to avoid importing the whole layout module, so let's inline the nav items
import { ROLE_ROUTE, getMessagesPath, profileUrl, type Role } from '@/data/mock'

interface NavItem { label: string; icon: typeof Search; href: string }
interface NavGroup { group: string; items: NavItem[] }

// Minimal nav definition matching layout.tsx's navFor
function navFor(role: Role): NavGroup[] {
  const base = ROLE_ROUTE[role]
  const items: NavItem[] = []
  if (role === 'student') {
    items.push(
      { label: 'Dashboard', icon: Search, href: `${base}/dashboard` },
      { label: 'Find Professionals', icon: Search, href: `${base}/professionals` },
      { label: 'My Referrals', icon: Search, href: `${base}/referrals` },
      { label: 'Messages', icon: Search, href: getMessagesPath(role) },
      { label: 'Profile', icon: Search, href: `${base}/profile` },
    )
  } else if (role === 'professional') {
    items.push(
      { label: 'Dashboard', icon: Search, href: `${base}/dashboard` },
      { label: 'Referral Requests', icon: Search, href: `${base}/referrals` },
      { label: 'Find Job Seekers', icon: Search, href: `${base}/talent` },
      { label: 'Messages', icon: Search, href: getMessagesPath(role) },
      { label: 'Profile', icon: Search, href: `${base}/profile` },
    )
  } else if (role === 'recruiter') {
    items.push(
      { label: 'Dashboard', icon: Search, href: `${base}/dashboard` },
      { label: 'Jobs', icon: Search, href: `${base}/jobs` },
      { label: 'Talent Search', icon: Search, href: `${base}/talent` },
      { label: 'Messages', icon: Search, href: getMessagesPath(role) },
      { label: 'Profile', icon: Search, href: `${base}/profile` },
    )
  } else {
    items.push(
      { label: 'Admin Dashboard', icon: Search, href: '/admin/dashboard' },
      { label: 'Workspaces', icon: Search, href: '/admin/users' },
      { label: 'Messages', icon: Search, href: getMessagesPath(role) },
      { label: 'Settings', icon: Search, href: '/admin/settings' },
    )
  }
  return [{ group: 'Pages', items }]
}

export default function CommandPaletteInner() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { role, visibleProfessionals } = useApp()
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const go = (href: string) => { setOpen(false); navigate(href) }
  const groups = navFor(role)

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search people, pages, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g.group}>
            {g.items.map((i) => (
              <CommandItem key={i.href} onSelect={() => go(i.href)}>
                <i.icon className="mr-2 h-4 w-4" /> {i.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup>
          {visibleProfessionals.slice(0, 6).map((p) => (
            <CommandItem key={p.id} onSelect={() => go(profileUrl('professional', p.id, p.slug))}>
              <Search className="mr-2 h-4 w-4" /> {p.name} <span className="ml-2 text-xs text-muted-foreground">{p.designation} · {p.company}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <CommandItem onSelect={() => go('/job-seeker/request-referral')}><Plus className="mr-2 h-4 w-4" /> Request a referral</CommandItem>
          <CommandItem onSelect={() => go('/settings')}><Sun className="mr-2 h-4 w-4" /> Change theme</CommandItem>
          <CommandItem onSelect={() => go('/help')}><CircleHelp className="mr-2 h-4 w-4" /> Get help</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
