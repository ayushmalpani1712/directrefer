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
