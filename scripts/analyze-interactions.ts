/**
 * Interaction Log Analysis Script
 *
 * Pulls interaction_logs from Supabase and generates per-participant
 * metrics + aggregate summary for the FYP evaluation report.
 *
 * Usage:
 *   npx tsx scripts/analyze-interactions.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * (service role key bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../backend/.env') })

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

interface LogRow {
  id: string
  session_id: string
  participant_id: string | null
  user_id: string | null
  event_type: string
  event_data: Record<string, unknown>
  created_at: string
}

interface ParticipantMetrics {
  participantId: string
  sessionCount: number
  totalDurationMs: number
  totalEvents: number
  uniqueObjectsViewed: number
  objectsViewed: string[]
  viewTimeMs: Record<string, number>
  featuresUsed: string[]
  toursStarted: number
  toursCompleted: number
  settingsChanged: number
  searchSelects: number
  modalsOpened: number
}

async function main() {
  console.log('Fetching interaction logs...\n')

  const { data: rows, error } = await supabase
    .from('interaction_logs')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch error:', error.message)
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log('No interaction logs found.')
    return
  }

  const logs = rows as LogRow[]
  console.log(`Found ${logs.length} events across ${new Set(logs.map(l => l.participant_id)).size} participants\n`)

  // Group by participant
  const byParticipant = new Map<string, LogRow[]>()
  for (const log of logs) {
    const pid = log.participant_id || 'anonymous'
    if (!byParticipant.has(pid)) byParticipant.set(pid, [])
    byParticipant.get(pid)!.push(log)
  }

  const allMetrics: ParticipantMetrics[] = []

  for (const [pid, events] of byParticipant) {
    const metrics = analyzeParticipant(pid, events)
    allMetrics.push(metrics)
    printParticipant(metrics)
  }

  // Aggregate
  printAggregate(allMetrics, logs)

  // CSV export
  exportCSV(allMetrics)
}

function analyzeParticipant(pid: string, events: LogRow[]): ParticipantMetrics {
  const sessions = new Set(events.map(e => e.session_id))

  // Duration from session_end events
  let totalDurationMs = 0
  for (const e of events) {
    if (e.event_type === 'session_end' && e.event_data.duration_ms) {
      totalDurationMs += e.event_data.duration_ms as number
    }
  }

  // Objects viewed
  const objectsSet = new Set<string>()
  for (const e of events) {
    if (e.event_type === 'object_select' && e.event_data.objectName) {
      objectsSet.add(e.event_data.objectName as string)
    }
  }

  // View time calculation from view_switch events
  const viewTimeMs: Record<string, number> = { home: 0, '2d': 0, '3d': 0 }
  const viewSwitches = events.filter(e => e.event_type === 'view_switch')
  for (let i = 0; i < viewSwitches.length; i++) {
    const from = viewSwitches[i].event_data.from as string
    const startTime = new Date(viewSwitches[i].created_at).getTime()
    const prevTime = i > 0 ? new Date(viewSwitches[i - 1].created_at).getTime() : new Date(events[0].created_at).getTime()
    if (from in viewTimeMs) {
      viewTimeMs[from] += startTime - prevTime
    }
  }
  // Add time for last view until session end
  if (viewSwitches.length > 0) {
    const lastSwitch = viewSwitches[viewSwitches.length - 1]
    const lastView = lastSwitch.event_data.to as string
    const lastSwitchTime = new Date(lastSwitch.created_at).getTime()
    const sessionEndTime = new Date(events[events.length - 1].created_at).getTime()
    if (lastView in viewTimeMs) {
      viewTimeMs[lastView] += sessionEndTime - lastSwitchTime
    }
  }

  // Features used
  const featuresUsed = new Set<string>()
  for (const e of events) {
    if (e.event_type === 'tour_start') featuresUsed.add('tours')
    if (e.event_type === 'time_simulate') featuresUsed.add('time_slider')
    if (e.event_type === 'mission_select') featuresUsed.add('missions')
    if (e.event_type === 'search_select') featuresUsed.add('search')
    if (e.event_type === 'setting_toggle') {
      const setting = e.event_data.setting as string
      if (setting === 'nightVision') featuresUsed.add('night_vision')
      if (setting === 'showConstellationLines') featuresUsed.add('constellations')
      if (setting === 'showCrescentZones') featuresUsed.add('crescent_zones')
    }
    if (e.event_type === 'modal_open') {
      if (e.event_data.modal === 'report') featuresUsed.add('reports')
      if (e.event_data.modal === 'observation') featuresUsed.add('observations')
    }
  }

  const toursStarted = events.filter(e => e.event_type === 'tour_start').length
  const toursCompleted = events.filter(e => e.event_type === 'tour_end' && e.event_data.completed).length
  const settingsChanged = events.filter(e => e.event_type === 'setting_toggle').length
  const searchSelects = events.filter(e => e.event_type === 'search_select').length
  const modalsOpened = events.filter(e => e.event_type === 'modal_open').length

  return {
    participantId: pid,
    sessionCount: sessions.size,
    totalDurationMs,
    totalEvents: events.length,
    uniqueObjectsViewed: objectsSet.size,
    objectsViewed: [...objectsSet],
    viewTimeMs,
    featuresUsed: [...featuresUsed],
    toursStarted,
    toursCompleted,
    settingsChanged,
    searchSelects,
    modalsOpened,
  }
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

function printParticipant(m: ParticipantMetrics) {
  console.log(`━━━ ${m.participantId} ━━━`)
  console.log(`  Sessions: ${m.sessionCount}`)
  console.log(`  Duration: ${formatDuration(m.totalDurationMs)}`)
  console.log(`  Total events: ${m.totalEvents}`)
  console.log(`  Objects explored: ${m.uniqueObjectsViewed} (${m.objectsViewed.join(', ')})`)
  console.log(`  View time: Home ${formatDuration(m.viewTimeMs.home)} | Map ${formatDuration(m.viewTimeMs['2d'])} | 3D ${formatDuration(m.viewTimeMs['3d'])}`)
  console.log(`  Features used: ${m.featuresUsed.join(', ') || 'none'}`)
  console.log(`  Tours: ${m.toursStarted} started, ${m.toursCompleted} completed`)
  console.log(`  Settings changes: ${m.settingsChanged}`)
  console.log(`  Search selects: ${m.searchSelects}`)
  console.log(`  Modals opened: ${m.modalsOpened}`)
  console.log()
}

function printAggregate(all: ParticipantMetrics[], logs: LogRow[]) {
  console.log('━━━ AGGREGATE ━━━')
  console.log(`  Participants: ${all.length}`)
  console.log(`  Total events: ${logs.length}`)

  const avgDuration = all.reduce((s, m) => s + m.totalDurationMs, 0) / all.length
  console.log(`  Avg session duration: ${formatDuration(avgDuration)}`)

  const avgObjects = all.reduce((s, m) => s + m.uniqueObjectsViewed, 0) / all.length
  console.log(`  Avg objects explored: ${avgObjects.toFixed(1)}`)

  const avgEvents = all.reduce((s, m) => s + m.totalEvents, 0) / all.length
  console.log(`  Avg interaction depth: ${avgEvents.toFixed(1)} events`)

  // Feature adoption rates
  const features = ['tours', 'time_slider', 'missions', 'search', 'night_vision', 'constellations', 'crescent_zones', 'reports', 'observations']
  console.log('\n  Feature adoption:')
  for (const f of features) {
    const count = all.filter(m => m.featuresUsed.includes(f)).length
    const pct = ((count / all.length) * 100).toFixed(0)
    console.log(`    ${f}: ${count}/${all.length} (${pct}%)`)
  }

  // Most explored objects
  const objectCounts = new Map<string, number>()
  for (const log of logs) {
    if (log.event_type === 'object_select' && log.event_data.objectName) {
      const name = log.event_data.objectName as string
      objectCounts.set(name, (objectCounts.get(name) || 0) + 1)
    }
  }
  const sorted = [...objectCounts.entries()].sort((a, b) => b[1] - a[1])
  console.log('\n  Most explored objects:')
  for (const [name, count] of sorted.slice(0, 10)) {
    console.log(`    ${name}: ${count} selections`)
  }

  // Avg view distribution
  const totalViewTime = all.reduce((s, m) => s + m.viewTimeMs.home + m.viewTimeMs['2d'] + m.viewTimeMs['3d'], 0)
  if (totalViewTime > 0) {
    const homePct = ((all.reduce((s, m) => s + m.viewTimeMs.home, 0) / totalViewTime) * 100).toFixed(0)
    const mapPct = ((all.reduce((s, m) => s + m.viewTimeMs['2d'], 0) / totalViewTime) * 100).toFixed(0)
    const threeDPct = ((all.reduce((s, m) => s + m.viewTimeMs['3d'], 0) / totalViewTime) * 100).toFixed(0)
    console.log(`\n  View distribution: Home ${homePct}% | Map ${mapPct}% | 3D ${threeDPct}%`)
  }

  console.log()
}

function exportCSV(all: ParticipantMetrics[]) {
  const headers = [
    'participant_id', 'sessions', 'duration_ms', 'duration_readable',
    'total_events', 'unique_objects', 'objects_list',
    'home_time_ms', 'map_time_ms', '3d_time_ms',
    'features_used', 'tours_started', 'tours_completed',
    'settings_changed', 'search_selects', 'modals_opened',
  ]

  const rows = all.map(m => [
    m.participantId,
    m.sessionCount,
    m.totalDurationMs,
    formatDuration(m.totalDurationMs),
    m.totalEvents,
    m.uniqueObjectsViewed,
    `"${m.objectsViewed.join('; ')}"`,
    m.viewTimeMs.home,
    m.viewTimeMs['2d'],
    m.viewTimeMs['3d'],
    `"${m.featuresUsed.join('; ')}"`,
    m.toursStarted,
    m.toursCompleted,
    m.settingsChanged,
    m.searchSelects,
    m.modalsOpened,
  ].join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  const outPath = resolve(__dirname, 'interaction-report.csv')
  writeFileSync(outPath, csv)
  console.log(`CSV exported to: ${outPath}`)
}

main().catch(console.error)
