import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store/store'

export interface HintDef {
  id: string
  message: string
  position: 'top' | 'bottom' | 'left' | 'right'
  requiredView?: 'home' | '2d' | '3d'
  padding?: number
}

const HINTS: HintDef[] = [
  // ── Home ──
  {
    id: 'search',
    message: 'Search for planets, moons, and stars',
    position: 'bottom',
  },
  {
    id: 'view-toggle',
    message: 'Switch between Home, Map, and 3D views',
    position: 'bottom',
  },
  // ── 2D Map ──
  {
    id: 'map',
    message: 'Your sky map - click anywhere to set your observation location',
    position: 'bottom',
    requiredView: '2d',
    padding: 0,
  },
  {
    id: 'time-slider',
    message: 'Animate time forward, or drag to scrub through 5 days',
    position: 'top',
    requiredView: '2d',
  },
  {
    id: 'object-tracker',
    message: 'Pick an object to see when and where it\'s visible tonight',
    position: 'right',
    requiredView: '2d',
  },
  {
    id: 'night-vision',
    message: 'Adjust settings like night vision, labels, and location',
    position: 'bottom',
    requiredView: '2d',
  },
  // ── 3D ──
  {
    id: 'scene-3d',
    message: 'Drag to orbit, scroll to zoom, click any planet for details',
    position: 'bottom',
    requiredView: '3d',
    padding: 0,
  },
  {
    id: 'scene-panel',
    message: 'Explore object details, space missions, and guided tours',
    position: 'left',
    requiredView: '3d',
  },
]

const STORAGE_KEY = 'solar-studio:hints-state'

type HintsState = 'unseen' | 'accepted' | 'declined' | 'completed'

function getLocalState(): { state: HintsState; dismissed: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: 'unseen', dismissed: [] }
    return JSON.parse(raw)
  } catch {
    return { state: 'unseen', dismissed: [] }
  }
}

function saveLocalState(state: HintsState, dismissed: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, dismissed }))
}

async function markHintsCompletedForUser() {
  try {
    const { supabase } = await import('../lib/supabase')
    await supabase.auth.updateUser({ data: { hints_completed: true } })
  } catch { /* silent */ }
}

function hasUserCompletedHints(user: any): boolean {
  return user?.user_metadata?.hints_completed === true
}

export function useHints() {
  const viewMode = useStore((state) => state.viewMode)
  const setViewMode = useStore((state) => state.setViewMode)
  const dataReady = useStore((state) => state.dataReady)
  const user = useStore((state) => state.user)

  const [tourState, setTourState] = useState<HintsState>(() => {
    if (user && hasUserCompletedHints(user)) return 'completed'
    return getLocalState().state
  })
  const [dismissed, setDismissed] = useState<Set<string>>(
    () => new Set(getLocalState().dismissed),
  )
  const [ready, setReady] = useState(false)

  // Sync state when user logs in
  useEffect(() => {
    if (user && hasUserCompletedHints(user)) {
      setTourState('completed')
    }
  }, [user])

  // Delay before showing prompt
  useEffect(() => {
    if (!dataReady) return
    const timer = setTimeout(() => setReady(true), 800)
    return () => clearTimeout(timer)
  }, [dataReady])

  // Whether to show the "want a tour?" prompt
  const showPrompt = ready && tourState === 'unseen'

  // Find next undismissed hint
  const nextHint =
    ready && tourState === 'accepted'
      ? HINTS.find((h) => !dismissed.has(h.id)) ?? null
      : null

  // Auto-switch view if the next hint needs a different one
  useEffect(() => {
    if (!nextHint?.requiredView) return
    if (viewMode !== nextHint.requiredView) {
      setViewMode(nextHint.requiredView)
    }
  }, [nextHint, viewMode, setViewMode])

  // Only show the hint once we're on the right view
  const currentHint =
    nextHint && (!nextHint.requiredView || viewMode === nextHint.requiredView)
      ? nextHint
      : null

  // If accepted and all hints dismissed, mark completed
  useEffect(() => {
    if (tourState === 'accepted' && ready && !nextHint) {
      setTourState('completed')
      saveLocalState('completed', [...dismissed])
      if (user) markHintsCompletedForUser()
    }
  }, [tourState, ready, nextHint, dismissed, user])

  const acceptTour = useCallback(() => {
    setTourState('accepted')
    saveLocalState('accepted', [])
  }, [])

  const declineTour = useCallback(() => {
    setTourState('declined')
    saveLocalState('declined', [])
    if (user) markHintsCompletedForUser()
  }, [user])

  const dismiss = useCallback(() => {
    if (!currentHint) return
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(currentHint.id)
      saveLocalState('accepted', [...next])
      return next
    })
  }, [currentHint])

  const restartTour = useCallback(() => {
    setDismissed(new Set())
    setTourState('accepted')
    saveLocalState('accepted', [])
  }, [])

  return { showPrompt, currentHint, dismiss, acceptTour, declineTour, restartTour }
}
