// ============================================================================
// DirectRefer — Database Query Monitor
// ============================================================================

const SLOW_QUERY_THRESHOLD_MS = 500

interface QueryMetrics {
  table: string
  operation: string
  duration: number
  timestamp: number
  rowCount?: number
}

const _queryLog: QueryMetrics[] = []

function logSlowQuery(metrics: QueryMetrics) {
  console.warn(
    `[QueryMonitor] Slow query detected: ${metrics.operation} on ${metrics.table} took ${metrics.duration}ms`,
    { rowCount: metrics.rowCount }
  )
}

function recordQuery(metrics: QueryMetrics) {
  _queryLog.push(metrics)
  if (_queryLog.length > 200) _queryLog.splice(0, _queryLog.length - 200)
  if (metrics.duration > SLOW_QUERY_THRESHOLD_MS) {
    logSlowQuery(metrics)
  }
}

export function monitoredQuery<T extends { data: unknown; error: unknown; count?: number }>(
  promise: Promise<T>,
  table: string,
  operation: string
): Promise<T> {
  const start = performance.now()
  const timestamp = Date.now()

  return promise.then((result) => {
    const duration = performance.now() - start
    const rowCount = Array.isArray(result.data) ? result.data.length : undefined
    recordQuery({ table, operation, duration, timestamp, rowCount })
    return result
  })
}

export function getQueryLog(): QueryMetrics[] {
  return [..._queryLog]
}

export function getSlowQueries(thresholdMs: number = SLOW_QUERY_THRESHOLD_MS): QueryMetrics[] {
  return _queryLog.filter((q) => q.duration > thresholdMs)
}

export function clearQueryLog() {
  _queryLog.length = 0
}
