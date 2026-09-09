// ============================================================================
// DirectRefer — Core Web Vitals Monitoring
// ============================================================================

import { logClientError } from '@/lib/db'

interface WebVital {
  name: string
  value: number
  delta: number
  id: string
  rating?: 'good' | 'needs-improvement' | 'poor'
  navigationType?: string
}

const RATING_THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
  INP: [200, 500],
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const [good, poor] = RATING_THRESHOLDS[name] ?? [0, Infinity]
  if (value <= good) return 'good'
  if (value <= poor) return 'needs-improvement'
  return 'poor'
}

function storeMetric(metric: WebVital) {
  try {
    const stored = JSON.parse(localStorage.getItem('dr_web_vitals') || '[]')
    stored.push({
      name: metric.name,
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      rating: metric.rating,
      timestamp: Date.now(),
    })
    // Keep last 100 entries
    if (stored.length > 100) stored.splice(0, stored.length - 100)
    localStorage.setItem('dr_web_vitals', JSON.stringify(stored))
  } catch {
    // localStorage quota or private browsing — silently fail
  }
}

function handleVitalsEntry(entry: PerformanceEntry) {
  const name = entry.name
  const value = entry.startTime || entry.duration || 0
  const delta = value
  const id = `${name}-${entry.startTime}-${Math.random().toString(36).slice(2, 8)}`
  const rating = getRating(name, value)

  const metric: WebVital = { name, value, delta, id, rating }
  storeMetric(metric)

  if (rating === 'poor') {
    logClientError(`Poor Web Vital: ${name}=${Math.round(value)}ms`, 'performance', 'warning')
  }
}

function observePerformanceEntry(type: string) {
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        handleVitalsEntry(entry)
      }
    }).observe({ type, buffered: true })
  } catch {
    // PerformanceObserver not supported for this type
  }
}

function observeLCP() {
  observePerformanceEntry('largest-contentful-paint')
}

function observeFID() {
  observePerformanceEntry('first-input')
}

function observeCLS() {
  try {
    let clsValue = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
          clsValue += (entry as PerformanceEntry & { value?: number }).value ?? 0
          storeMetric({
            name: 'CLS',
            value: clsValue,
            delta: (entry as PerformanceEntry & { value?: number }).value ?? 0,
            id: `cls-${entry.startTime}`,
            rating: getRating('CLS', clsValue),
          })
        }
      }
    }).observe({ type: 'layout-shift', buffered: true })
  } catch {
    // Not supported
  }
}

function observeTTFB() {
  observePerformanceEntry('navigation')
}

function observeINP() {
  observePerformanceEntry('event')
}

export function reportWebVitals() {
  observeLCP()
  observeFID()
  observeCLS()
  observeTTFB()
  observeINP()
}
