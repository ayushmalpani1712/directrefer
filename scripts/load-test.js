#!/usr/bin/env node
// ============================================================================
// DirectRefer — Load Testing Script
// ============================================================================
// Simple load testing using Node.js built-in http/https modules.
// Usage: node scripts/load-test.js --url https://www.directrefer.in --concurrent 50 --duration 60
// ============================================================================

import { get, request } from 'http'
import { get as gets } from 'https'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── CLI Argument Parsing ────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    url: 'https://www.directrefer.in',
    concurrent: 10,
    duration: 30,
    rampUp: 5,
    method: 'GET',
    timeout: 10000,
    output: join(__dirname, '..', 'test-results', `load-test-${Date.now()}.json`),
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url': case '-u':
        config.url = args[++i]
        break
      case '--concurrent': case '-c':
        config.concurrent = parseInt(args[++i], 10)
        break
      case '--duration': case '-d':
        config.duration = parseInt(args[++i], 10)
        break
      case '--ramp-up': case '-r':
        config.rampUp = parseInt(args[++i], 10)
        break
      case '--method': case '-m':
        config.method = args[++i].toUpperCase()
        break
      case '--timeout': case '-t':
        config.timeout = parseInt(args[++i], 10)
        break
      case '--output': case '-o':
        config.output = args[++i]
        break
      case '--help': case '-h':
        console.log(`
DirectRefer Load Tester

Usage: node scripts/load-test.js [options]

Options:
  -u, --url <url>          Target URL (default: https://www.directrefer.in)
  -c, --concurrent <n>     Concurrent requests (default: 10)
  -d, --duration <secs>    Test duration in seconds (default: 30)
  -r, --ramp-up <secs>     Ramp-up period in seconds (default: 5)
  -m, --method <method>    HTTP method (default: GET)
  -t, --timeout <ms>       Request timeout in ms (default: 10000)
  -o, --output <path>      JSON output path
  -h, --help               Show this help
`)
        process.exit(0)
    }
  }
  return config
}

// ── Results Collector ───────────────────────────────────────────

class Results {
  constructor() {
    this.latencies = []
    this.errors = 0
    this.timeouts = 0
    this.statusCodes = {}
    this.startTime = 0
    this.endTime = 0
  }

  record(statusCode, latency) {
    this.latencies.push(latency)
    this.statusCodes[statusCode] = (this.statusCodes[statusCode] || 0) + 1
  }

  recordError(type) {
    if (type === 'timeout') this.timeouts++
    else this.errors++
  }

  get totalRequests() {
    return this.latencies.length
  }

  get totalErrors() {
    return this.errors + this.timeouts
  }

  get errorRate() {
    return this.totalRequests === 0 ? 0 : this.totalErrors / this.totalRequests
  }

  get elapsed() {
    return (this.endTime - this.startTime) / 1000
  }

  get requestsPerSec() {
    return this.elapsed === 0 ? 0 : this.totalRequests / this.elapsed
  }

  get avgLatency() {
    if (this.latencies.length === 0) return 0
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
  }

  get medianLatency() {
    if (this.latencies.length === 0) return 0
    const sorted = [...this.latencies].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2
  }

  get p95Latency() {
    if (this.latencies.length === 0) return 0
    const sorted = [...this.latencies].sort((a, b) => a - b)
    const idx = Math.ceil(sorted.length * 0.95) - 1
    return sorted[Math.max(0, idx)]
  }

  get p99Latency() {
    if (this.latencies.length === 0) return 0
    const sorted = [...this.latencies].sort((a, b) => a - b)
    const idx = Math.ceil(sorted.length * 0.99) - 1
    return sorted[Math.max(0, idx)]
  }

  get minLatency() {
    return this.latencies.length === 0 ? 0 : Math.min(...this.latencies)
  }

  get maxLatency() {
    return this.latencies.length === 0 ? 0 : Math.max(...this.latencies)
  }

  toJSON() {
    return {
      config: this.config,
      summary: {
        totalRequests: this.totalRequests,
        totalErrors: this.totalErrors,
        errorRate: `${(this.errorRate * 100).toFixed(2)}%`,
        requestsPerSec: this.requestsPerSec.toFixed(2),
        duration: `${this.elapsed.toFixed(1)}s`,
        avgLatency: `${this.avgLatency.toFixed(1)}ms`,
        medianLatency: `${this.medianLatency.toFixed(1)}ms`,
        p95Latency: `${this.p95Latency.toFixed(1)}ms`,
        p99Latency: `${this.p99Latency.toFixed(1)}ms`,
        minLatency: `${this.minLatency.toFixed(1)}ms`,
        maxLatency: `${this.maxLatency.toFixed(1)}ms`,
      },
      statusCodeBreakdown: this.statusCodes,
      timestamp: new Date().toISOString(),
    }
  }
}

// ── HTTP Request Function ───────────────────────────────────────

function makeRequest(url, method, timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const client = url.startsWith('https') ? gets : get

    const req = client(url, { method, timeout }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        const latency = Date.now() - startTime
        resolve({ statusCode: res.statusCode, latency, body })
      })
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })

    req.on('error', (err) => {
      reject(err)
    })
  })
}

// ── Progress Bar ────────────────────────────────────────────────

function progressBar(current, total, width = 40) {
  const pct = Math.min(current / total, 1)
  const filled = Math.round(pct * width)
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  process.stdout.write(`\r  [${bar}] ${(pct * 100).toFixed(0)}%`)
}

// ── Main Test Runner ────────────────────────────────────────────

async function runLoadTest(config) {
  const results = new Results()
  results.config = config

  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║     DirectRefer Load Tester              ║')
  console.log('╚══════════════════════════════════════════╝\n')
  console.log(`  Target:    ${config.url}`)
  console.log(`  Concurrent: ${config.concurrent} requests`)
  console.log(`  Duration:  ${config.duration}s`)
  console.log(`  Ramp-up:   ${config.rampUp}s`)
  console.log(`  Method:    ${config.method}`)
  console.log()

  // Warm-up request
  console.log('  Warm-up request...')
  try {
    await makeRequest(config.url, config.method, config.timeout)
    console.log('  Warm-up complete.\n')
  } catch {
    console.warn('  Warm-up failed — continuing anyway.\n')
  }

  results.startTime = Date.now()
  const endTime = Date.now() + config.duration * 1000
  const activeRequests = new Set()
  let completedCount = 0

  // Create request workers
  async function worker() {
    while (Date.now() < endTime) {
      try {
        const res = await makeRequest(config.url, config.method, config.timeout)
        results.record(res.statusCode, res.latency)
      } catch (err) {
        results.recordError(err.message === 'timeout' ? 'timeout' : 'network')
      }
      completedCount++
    }
  }

  // Ramp up concurrency gradually
  const rampInterval = config.rampUp > 0
    ? (config.rampUp * 1000) / config.concurrent
    : 0

  console.log('  Starting load test...\n')
  results.startTime = Date.now()

  for (let i = 0; i < config.concurrent; i++) {
    const promise = worker().then(() => activeRequests.delete(promise))
    activeRequests.add(promise)
    if (rampInterval > 0) {
      await new Promise((r) => setTimeout(r, rampInterval))
    }
  }

  // Progress reporting
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - results.startTime) / 1000
    const remaining = Math.max(0, config.duration - elapsed)
    progressBar(elapsed, config.duration)

    // Print partial stats
    if (results.totalRequests > 0) {
      process.stdout.write(
        `  | ${results.totalRequests} reqs | ${results.requestsPerSec.toFixed(1)} req/s | ` +
        `avg ${results.avgLatency.toFixed(0)}ms | p95 ${results.p95Latency.toFixed(0)}ms | ` +
        `err ${(results.errorRate * 100).toFixed(1)}%`
      )
    }
  }, 500)

  // Wait for all in-flight requests to complete
  await Promise.all(activeRequests)
  results.endTime = Date.now()

  clearInterval(progressInterval)
  progressBar(config.duration, config.duration)
  console.log('\n')

  // ── Results ─────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════╗')
  console.log('║           RESULTS SUMMARY                ║')
  console.log('╠══════════════════════════════════════════╣')
  console.log(`║  Total Requests:  ${String(results.totalRequests).padStart(8)}            ║`)
  console.log(`║  Total Errors:    ${String(results.totalErrors).padStart(8)}            ║`)
  console.log(`║  Error Rate:      ${(results.errorRate * 100).toFixed(2).padStart(7)}%            ║`)
  console.log(`║  Requests/sec:    ${results.requestsPerSec.toFixed(2).padStart(8)}            ║`)
  console.log(`║  Duration:        ${results.elapsed.toFixed(1).padStart(7)}s            ║`)
  console.log('╠══════════════════════════════════════════╣')
  console.log(`║  Avg Latency:     ${results.avgLatency.toFixed(1).padStart(7)}ms            ║`)
  console.log(`║  Median Latency:  ${results.medianLatency.toFixed(1).padStart(7)}ms            ║`)
  console.log(`║  P95 Latency:     ${results.p95Latency.toFixed(1).padStart(7)}ms            ║`)
  console.log(`║  P99 Latency:     ${results.p99Latency.toFixed(1).padStart(7)}ms            ║`)
  console.log(`║  Min Latency:     ${results.minLatency.toFixed(1).padStart(7)}ms            ║`)
  console.log(`║  Max Latency:     ${results.maxLatency.toFixed(1).padStart(7)}ms            ║`)
  console.log('╠══════════════════════════════════════════╣')
  console.log('║  Status Code Breakdown:                  ║')
  for (const [code, count] of Object.entries(results.statusCodes).sort()) {
    console.log(`║    ${code}: ${String(count).padStart(8)}                          ║`)
  }
  console.log('╚══════════════════════════════════════════╝\n')

  // Save JSON results
  const outputDir = dirname(config.output)
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(config.output, JSON.stringify(results.toJSON(), null, 2))
  console.log(`  Results saved to: ${config.output}\n`)

  // Exit with non-zero if error rate > 5%
  if (results.errorRate > 0.05) {
    console.warn(`  ⚠ Error rate ${(results.errorRate * 100).toFixed(1)}% exceeds 5% threshold.`)
    process.exit(1)
  }
}

// ── Entry Point ─────────────────────────────────────────────────

const config = parseArgs()
runLoadTest(config).catch((err) => {
  console.error('Load test failed:', err.message)
  process.exit(1)
})
