import {
  LayoutDashboard, Users, Send, Coins, ClipboardList, Star, BadgeCheck,
  Flag, LineChart, TrendingUp, Settings, History,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavItem {
  to: string
  label: string
  icon: LucideIcon
}

export interface AdminNavGroup {
  id: string
  label: string
  description: string
  icon: LucideIcon
  items: AdminNavItem[]
}

export const ADMIN_GROUPS: AdminNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Platform health and urgent actions',
    icon: LayoutDashboard,
    items: [{ to: '/admin/overview', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'people',
    label: 'People',
    description: 'Users, referrals and incentives',
    icon: Users,
    items: [
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/referrals', label: 'Referrals', icon: Send },
      { to: '/admin/incentives', label: 'Incentives', icon: Coins },
    ],
  },
  {
    id: 'trust',
    label: 'Trust & Safety',
    description: 'Screening, scoring, approvals, moderation',
    icon: BadgeCheck,
    items: [
      { to: '/admin/screening', label: 'Screening', icon: ClipboardList },
      { to: '/admin/scoring', label: 'Scoring', icon: Star },
      { to: '/admin/approvals', label: 'Approvals', icon: BadgeCheck },
      { to: '/admin/moderation', label: 'Moderation', icon: Flag },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    description: 'Analytics and acquisition',
    icon: TrendingUp,
    items: [
      { to: '/admin/analytics', label: 'Analytics', icon: LineChart },
      { to: '/admin/acquisition', label: 'Acquisition', icon: TrendingUp },
    ],
  },
  {
    id: 'system',
    label: 'System',
    description: 'Settings and audit log',
    icon: Settings,
    items: [
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      { to: '/admin/audit-log', label: 'Audit Log', icon: History },
    ],
  },
]

export function adminGroupForPath(pathname: string): AdminNavGroup | undefined {
  return ADMIN_GROUPS.find((g) => g.items.some((i) => pathname === i.to || pathname.startsWith(i.to + '/')))
}
