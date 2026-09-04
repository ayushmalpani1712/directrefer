import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const WORKSPACE_COOKIE = 'dr_active_workspace'
const COOKIE_DAYS = 30

export function setWorkspaceCookie(role: string) {
  try {
    const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString()
    document.cookie = `${WORKSPACE_COOKIE}=${role}; path=/; expires=${expires}; SameSite=Lax`
  } catch { /* ignore */ }
}

export function getWorkspaceCookie(): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${WORKSPACE_COOKIE}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : null
  } catch { return null }
}

export function clearWorkspaceCookie() {
  try {
    document.cookie = `${WORKSPACE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  } catch { /* ignore */ }
}

export interface ProfileTheme {
  key: string
  label: string
  color: string
  avatar: string
}

export const PROFILE_THEMES: ProfileTheme[] = [
  { key: 'obsidian', label: 'Obsidian Slate', color: '#2A303C', avatar: '#475569' },
  { key: 'indigo',   label: 'Royal Indigo',   color: '#4338CA', avatar: '#6366F1' },
  { key: 'teal',     label: 'Midnight Teal',  color: '#0D9488', avatar: '#14B8A6' },
  { key: 'emerald',  label: 'Deep Emerald',   color: '#059669', avatar: '#10B981' },
  { key: 'burgundy', label: 'Warm Burgundy',  color: '#9F1239', avatar: '#F43F5E' },
  { key: 'copper',   label: 'Burnt Copper',   color: '#C2410C', avatar: '#EA580C' },
]

export function getProfileTheme(key?: string | null): ProfileTheme {
  return PROFILE_THEMES.find((t) => t.key === key) || PROFILE_THEMES[1]
}

export function getBannerStyle(_userId?: string | null, themeKey?: string | null): { className: string; style?: React.CSSProperties } {
  const theme = getProfileTheme(themeKey)
  return { className: '', style: { backgroundColor: theme.color } }
}
