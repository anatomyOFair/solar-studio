/**
 * API Response Time Benchmark
 *
 * Hits each external API Solar Studio depends on, runs multiple
 * iterations, and reports avg / min / max latency.
 *
 * Usage:
 *   npx tsx scripts/benchmark-apis.ts
 *
 * Reads Supabase credentials from backend/.env
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse .env manually (avoids dotenv dependency in frontend project)
const envPath = resolve(__dirname, '../backend/.env')
const envLines = readFileSync(envPath, 'utf-8').split('\n')
const env: Record<string, string> = {}
for (const line of envLines) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match) env[match[1]] = match[2].trim()
}

const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in backend/.env')
  process.exit(1)
}

const ITERATIONS = 10

interface Endpoint {
  name: string
  url: string
  headers?: Record<string, string>
}

const ENDPOINTS: Endpoint[] = [
  {
    name: 'Supabase – celestial_objects',
    url: `${SUPABASE_URL}/rest/v1/celestial_objects?select=id,name,type&limit=10`,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  },
  {
    name: 'Supabase – tours',
    url: `${SUPABASE_URL}/rest/v1/tours?select=id,title&limit=5`,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  },
  {
    name: 'Open-Meteo – weather forecast',
    url: 'https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.12&current=cloud_cover,precipitation,temperature_2m&hourly=visibility&forecast_days=1&timezone=UTC',
  },
  {
    name: 'Nominatim – reverse geocode',
    url: 'https://nominatim.openstreetmap.org/reverse?format=json&lat=51.5074&lon=-0.1278',
    headers: { 'User-Agent': 'SolarStudio-Benchmark/1.0' },
  },
  {
    name: 'Backend (Heroku) – health',
    url: 'https://solar-studio-api-3922c439107d.herokuapp.com/health',
  },
  {
    name: 'Backend (Heroku) – weather',
    url: 'https://solar-studio-api-3922c439107d.herokuapp.com/api/weather?lat=51.5&lon=-0.12',
  },
  {
    name: 'USNO – moon phases',
    url: `https://aa.usno.navy.mil/api/moon/phases/year?year=${new Date().getFullYear()}`,
  },
  {
    name: 'NOAA SWPC – Kp index forecast',
    url: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',
  },
]

async function timeRequest(endpoint: Endpoint): Promise<{ ms: number; status: number }> {
  const start = performance.now()
  const res = await fetch(endpoint.url, {
    headers: endpoint.headers,
    signal: AbortSignal.timeout(15_000),
  })
  const ms = performance.now() - start
  // consume body so connection is freed
  await res.text()
  return { ms, status: res.status }
}

async function benchmark(endpoint: Endpoint): Promise<{
  name: string
  avg: number
  min: number
  max: number
  p95: number
  status: number
  errors: number
}> {
  const times: number[] = []
  let lastStatus = 0
  let errors = 0

  for (let i = 0; i < ITERATIONS; i++) {
    try {
      const { ms, status } = await timeRequest(endpoint)
      times.push(ms)
      lastStatus = status
    } catch {
      errors++
      times.push(-1)
    }
    // small delay between requests to be polite
    await new Promise(r => setTimeout(r, 200))
  }

  const valid = times.filter(t => t >= 0)
  if (valid.length === 0) {
    return { name: endpoint.name, avg: -1, min: -1, max: -1, p95: -1, status: 0, errors }
  }

  valid.sort((a, b) => a - b)
  const avg = valid.reduce((s, t) => s + t, 0) / valid.length
  const p95idx = Math.min(Math.ceil(valid.length * 0.95) - 1, valid.length - 1)

  return {
    name: endpoint.name,
    avg: Math.round(avg),
    min: Math.round(valid[0]),
    max: Math.round(valid[valid.length - 1]),
    p95: Math.round(valid[p95idx]),
    status: lastStatus,
    errors,
  }
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

async function main() {
  console.log(`API Response Time Benchmark — ${ITERATIONS} iterations per endpoint\n`)

  const results = []

  for (const ep of ENDPOINTS) {
    process.stdout.write(`  Testing ${ep.name}...`)
    const result = await benchmark(ep)
    results.push(result)
    if (result.avg < 0) {
      console.log(' FAILED')
    } else {
      console.log(` ${result.avg}ms avg`)
    }
  }

  // Print table
  const nameW = 38
  console.log(`\n${'─'.repeat(nameW + 50)}`)
  console.log(
    `${pad('Endpoint', nameW)} ${pad('Avg', 8)} ${pad('Min', 8)} ${pad('Max', 8)} ${pad('P95', 8)} ${pad('Status', 8)} Errors`
  )
  console.log(`${'─'.repeat(nameW + 50)}`)

  for (const r of results) {
    if (r.avg < 0) {
      console.log(`${pad(r.name, nameW)} ${'FAILED'.padStart(8)}${' '.repeat(32)} ${r.errors}`)
    } else {
      console.log(
        `${pad(r.name, nameW)} ${(r.avg + 'ms').padStart(8)} ${(r.min + 'ms').padStart(8)} ${(r.max + 'ms').padStart(8)} ${(r.p95 + 'ms').padStart(8)} ${String(r.status).padStart(8)} ${r.errors}`
      )
    }
  }

  console.log(`${'─'.repeat(nameW + 50)}\n`)
}

main().catch(console.error)
