import { supabase } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────

interface LogEvent {
  session_id: string
  participant_id: string | null
  user_id: string | null
  event_type: string
  event_data: Record<string, unknown>
  created_at: string
}

// ── State ──────────────────────────────────────────────────────────────────

const SESSION_ID = crypto.randomUUID()
const FLUSH_INTERVAL_MS = 10_000
const DEBOUNCE_MS = 2000

let enabled = false
let userId: string | null = null
let buffer: LogEvent[] = []
let sessionStartTime = Date.now()
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

// ── Initialization ─────────────────────────────────────────────────────────

export function initLogging(): void {
  setInterval(flush, FLUSH_INTERVAL_MS)
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

function handleBeforeUnload(): void {
  pushEvent('session_end', { duration_ms: Date.now() - sessionStartTime })

  if (buffer.length === 0) return

  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/interaction_logs`
  const payload = JSON.stringify(buffer)
  buffer = []

  fetch(url, {
    method: 'POST',
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: payload,
    keepalive: true,
  }).catch(() => {})
}

// ── Public API ─────────────────────────────────────────────────────────────

export function setUserId(id: string | null): void {
  userId = id
  if (id && !enabled) {
    enabled = true
    sessionStartTime = Date.now()
    pushEvent('session_start', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    })
  } else if (!id) {
    enabled = false
  }
}

export function pushEvent(eventType: string, eventData: Record<string, unknown> = {}): void {
  if (!enabled) return

  buffer.push({
    session_id: SESSION_ID,
    participant_id: null,
    user_id: userId,
    event_type: eventType,
    event_data: eventData,
    created_at: new Date().toISOString(),
  })
}

export function pushEventDebounced(key: string, eventType: string, eventData: Record<string, unknown>): void {
  if (!enabled) return

  const existing = debounceTimers.get(key)
  if (existing) clearTimeout(existing)

  debounceTimers.set(key, setTimeout(() => {
    pushEvent(eventType, eventData)
    debounceTimers.delete(key)
  }, DEBOUNCE_MS))
}

// ── Flush ──────────────────────────────────────────────────────────────────

async function flush(): Promise<void> {
  if (buffer.length === 0) return

  const batch = buffer.splice(0)

  const { error } = await supabase
    .from('interaction_logs')
    .insert(batch)

  if (error) {
    buffer.unshift(...batch)
  }
}
