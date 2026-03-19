import SunCalc from 'suncalc'
import type { CelestialObject } from '../types'

// ── Types ──────────────────────────────────────────────────────────────

export interface CelestialEvent {
  id: string
  name: string
  type: 'meteor_shower' | 'lunar_phase' | 'conjunction' | 'eclipse' | 'aurora' | 'special'
  date: Date
  description: string
}

// ── Conjunctions (computed live from store positions) ───────────────────

function angularSeparation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const RAD = Math.PI / 180
  const cos_d =
    Math.sin(dec1 * RAD) * Math.sin(dec2 * RAD) +
    Math.cos(dec1 * RAD) * Math.cos(dec2 * RAD) * Math.cos((ra1 - ra2) * RAD)
  return Math.acos(Math.min(1, Math.max(-1, cos_d))) / RAD
}

const CONJUNCTION_IDS = new Set([
  'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon',
])

function computeConjunctions(objects: CelestialObject[]): CelestialEvent[] {
  const events: CelestialEvent[] = []
  const THRESHOLD_DEG = 2

  const bodies = objects.filter(
    (o) => CONJUNCTION_IDS.has(o.id) && o.ra != null && o.dec != null,
  )

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j]
      const sep = angularSeparation(a.ra!, a.dec!, b.ra!, b.dec!)
      if (sep < THRESHOLD_DEG) {
        events.push({
          id: `conjunction-${a.id}-${b.id}`,
          name: `${a.name}–${b.name} Conjunction`,
          type: 'conjunction',
          date: new Date(),
          description: `${sep.toFixed(1)}° apart in the sky`,
        })
      }
    }
  }

  return events
}

// ── Fallback: locally computed events (used when DB is empty) ──────────

const PHASE_DEFS = [
  { target: 0,    name: 'New Moon',      desc: 'Moon between Earth and Sun - invisible' },
  { target: 0.25, name: 'First Quarter', desc: 'Half-lit, waxing - visible in evening sky' },
  { target: 0.5,  name: 'Full Moon',     desc: 'Fully illuminated - visible all night' },
  { target: 0.75, name: 'Last Quarter',  desc: 'Half-lit, waning - visible in morning sky' },
]

function computeLunarPhases(from: Date, days: number): CelestialEvent[] {
  const events: CelestialEvent[] = []
  let prevPhase = SunCalc.getMoonIllumination(from).phase

  for (let h = 6; h <= days * 24; h += 6) {
    const t = new Date(from.getTime() + h * 3600000)
    const cur = SunCalc.getMoonIllumination(t).phase

    for (const p of PHASE_DEFS) {
      const crossed =
        (p.target === 0 && prevPhase > 0.9 && cur < 0.1) ||
        (p.target > 0 && prevPhase < p.target && cur >= p.target)

      if (crossed) {
        events.push({
          id: `lunar-${p.name.toLowerCase().replace(/\s/g, '-')}-${t.toISOString().slice(0, 10)}`,
          name: p.name,
          type: 'lunar_phase',
          date: t,
          description: p.desc,
        })
      }
    }
    prevPhase = cur
  }

  return events
}

// ── Fetch cached events from Supabase ──────────────────────────────────

async function fetchCachedEvents(from: Date): Promise<CelestialEvent[]> {
  try {
    const { supabase } = await import('../lib/supabase')
    const until = new Date(from.getTime() + 180 * 86400000) // ~6 months

    const { data, error } = await supabase
      .from('celestial_events')
      .select('*')
      .gte('event_date', from.toISOString().slice(0, 10))
      .lte('event_date', until.toISOString().slice(0, 10))
      .order('event_date')

    if (error || !data?.length) return []

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type as CelestialEvent['type'],
      date: new Date(row.event_date + 'T00:00:00'),
      description: row.description ?? '',
    }))
  } catch {
    return []
  }
}

// ── Public API ──────────────────────────────────────────────────────────

export async function getUpcomingEvents(
  objects: CelestialObject[],
  from?: Date,
): Promise<CelestialEvent[]> {
  const now = from ?? new Date()

  const [cached, conjunctions] = await Promise.all([
    fetchCachedEvents(now),
    Promise.resolve(computeConjunctions(objects)),
  ])

  let events: CelestialEvent[]

  if (cached.length > 0) {
    // DB has data - use it + add live conjunctions
    const seen = new Set(cached.map((e) => e.id))
    events = [...cached, ...conjunctions.filter((e) => !seen.has(e.id))]
  } else {
    // DB empty or table doesn't exist - fall back to local computation
    events = [
      ...conjunctions,
      ...computeLunarPhases(now, 180),
    ]
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime())
  return events
}

// ── Helpers for grouping ───────────────────────────────────────────────

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export interface EventDay {
  dateKey: string
  date: Date
  label: string
  events: CelestialEvent[]
}

export function groupEventsByDay(events: CelestialEvent[], now: Date): EventDay[] {
  const groups = new Map<string, CelestialEvent[]>()

  for (const e of events) {
    const key = toDateKey(e.date)
    const list = groups.get(key)
    if (list) list.push(e)
    else groups.set(key, [e])
  }

  const todayKey = toDateKey(now)
  const tomorrowKey = toDateKey(new Date(now.getTime() + 86400000))

  const days: EventDay[] = []
  for (const [key, evts] of groups) {
    const d = new Date(key + 'T00:00:00')
    let label: string
    if (key === todayKey) label = 'Today'
    else if (key === tomorrowKey) label = 'Tomorrow'
    else label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

    days.push({ dateKey: key, date: d, label, events: evts })
  }

  days.sort((a, b) => a.date.getTime() - b.date.getTime())
  return days
}
