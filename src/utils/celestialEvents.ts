import SunCalc from 'suncalc'
import type { CelestialObject } from '../types'

// ── Types ──────────────────────────────────────────────────────────────

export interface CelestialEvent {
  id: string
  name: string
  type: 'meteor_shower' | 'lunar_phase' | 'conjunction' | 'eclipse' | 'special'
  date: Date
  description: string
}

// ── Meteor Showers (annual peaks) ──────────────────────────────────────

const METEOR_SHOWERS = [
  { name: 'Quadrantids',     month: 0,  day: 3,  zhr: 120, parent: '2003 EH1' },
  { name: 'Lyrids',          month: 3,  day: 22, zhr: 18,  parent: 'C/1861 G1 Thatcher' },
  { name: 'Eta Aquariids',   month: 4,  day: 6,  zhr: 50,  parent: '1P/Halley' },
  { name: 'Delta Aquariids', month: 6,  day: 30, zhr: 25,  parent: '96P/Machholz' },
  { name: 'Perseids',        month: 7,  day: 12, zhr: 100, parent: '109P/Swift-Tuttle' },
  { name: 'Draconids',       month: 9,  day: 8,  zhr: 10,  parent: '21P/Giacobini-Zinner' },
  { name: 'Orionids',        month: 9,  day: 21, zhr: 20,  parent: '1P/Halley' },
  { name: 'Leonids',         month: 10, day: 17, zhr: 15,  parent: '55P/Tempel-Tuttle' },
  { name: 'Geminids',        month: 11, day: 14, zhr: 150, parent: '3200 Phaethon' },
  { name: 'Ursids',          month: 11, day: 22, zhr: 10,  parent: '8P/Tuttle' },
]

// ── Known Eclipses (2025–2027) ─────────────────────────────────────────

const ECLIPSES = [
  { date: '2025-03-14', name: 'Total Lunar Eclipse',     desc: 'Visible from Americas, Europe, Africa' },
  { date: '2025-03-29', name: 'Partial Solar Eclipse',    desc: 'Visible from NW Africa, Europe, N Russia' },
  { date: '2025-09-07', name: 'Total Lunar Eclipse',     desc: 'Visible from Europe, Africa, Asia, Australia' },
  { date: '2025-09-21', name: 'Partial Solar Eclipse',    desc: 'Visible from S Pacific, New Zealand, Antarctica' },
  { date: '2026-02-17', name: 'Penumbral Lunar Eclipse', desc: 'Visible from Americas, Europe, Africa' },
  { date: '2026-03-03', name: 'Total Lunar Eclipse',     desc: 'Visible from E Asia, Australia, Pacific, Americas' },
  { date: '2026-08-12', name: 'Total Solar Eclipse',     desc: 'Visible from Arctic, Greenland, Iceland, Spain' },
  { date: '2026-08-28', name: 'Partial Lunar Eclipse',   desc: 'Visible from E Pacific, Americas, Europe, Africa' },
  { date: '2027-02-06', name: 'Penumbral Lunar Eclipse', desc: 'Visible from Americas, Europe, Africa, W Asia' },
  { date: '2027-02-20', name: 'Annular Solar Eclipse',   desc: 'Visible from S America, Atlantic, Africa' },
  { date: '2027-07-18', name: 'Penumbral Lunar Eclipse', desc: 'Visible from Americas, Europe, Africa' },
  { date: '2027-08-02', name: 'Total Solar Eclipse',     desc: 'Visible from N Africa, Mediterranean, Arabian Peninsula' },
]

// ── Lunar Phases ───────────────────────────────────────────────────────

const PHASE_DEFS = [
  { target: 0,    name: 'New Moon',      desc: 'Moon between Earth and Sun — invisible' },
  { target: 0.25, name: 'First Quarter', desc: 'Half-lit, waxing — visible in evening sky' },
  { target: 0.5,  name: 'Full Moon',     desc: 'Fully illuminated — visible all night' },
  { target: 0.75, name: 'Last Quarter',  desc: 'Half-lit, waning — visible in morning sky' },
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

// ── Meteor Showers ─────────────────────────────────────────────────────

function computeMeteorShowers(from: Date, days: number): CelestialEvent[] {
  const events: CelestialEvent[] = []
  const end = from.getTime() + days * 86400000
  const year = from.getFullYear()

  for (const s of METEOR_SHOWERS) {
    for (const y of [year, year + 1]) {
      const peak = new Date(y, s.month, s.day)
      if (peak.getTime() >= from.getTime() && peak.getTime() <= end) {
        events.push({
          id: `meteor-${s.name.toLowerCase().replace(/\s/g, '-')}-${y}`,
          name: `${s.name} Peak`,
          type: 'meteor_shower',
          date: peak,
          description: `~${s.zhr} meteors/hr at peak · Parent: ${s.parent}`,
        })
      }
    }
  }

  return events
}

// ── Eclipses ───────────────────────────────────────────────────────────

function computeEclipses(from: Date, days: number): CelestialEvent[] {
  const end = from.getTime() + days * 86400000

  return ECLIPSES
    .map((e) => ({
      id: `eclipse-${e.date}`,
      name: e.name,
      type: 'eclipse' as const,
      date: new Date(e.date + 'T00:00:00'),
      description: e.desc,
    }))
    .filter((e) => e.date.getTime() >= from.getTime() && e.date.getTime() <= end)
}

// ── Conjunctions ───────────────────────────────────────────────────────

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

// ── Public API ──────────────────────────────────────────────────────────

const WINDOW_DAYS = 14

export function getUpcomingEvents(
  objects: CelestialObject[],
  from?: Date,
): CelestialEvent[] {
  const now = from ?? new Date()

  const events = [
    ...computeConjunctions(objects),
    ...computeLunarPhases(now, WINDOW_DAYS),
    ...computeMeteorShowers(now, WINDOW_DAYS),
    ...computeEclipses(now, WINDOW_DAYS),
  ]

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
