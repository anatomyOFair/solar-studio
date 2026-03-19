import type { StateCreator, StoreMutatorIdentifier } from 'zustand'
import { pushEvent, pushEventDebounced } from '../services/interactionLogger'

type LoggingMiddleware = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>
) => StateCreator<T, Mps, Mcs>

type LoggingImpl = <T>(f: StateCreator<T, [], []>) => StateCreator<T, [], []>

const loggingImpl: LoggingImpl = (f) => (set, get, api) => {
  const loggedSet: typeof set = (stateOrUpdater: any, replace?: any) => {
    const prev = get() as Record<string, unknown>
    ;(set as any)(stateOrUpdater, replace)
    const next = get() as Record<string, unknown>

    // View switching
    if (next.viewMode !== prev.viewMode) {
      pushEvent('view_switch', { from: prev.viewMode, to: next.viewMode })
    }

    // Object selection
    if (next.selectedObject !== prev.selectedObject) {
      const obj = next.selectedObject as { id: string; name: string; type: string } | null
      if (obj) {
        pushEvent('object_select', { objectId: obj.id, objectName: obj.name, objectType: obj.type })
      } else {
        pushEvent('object_deselect', {})
      }
    }

    // Time simulation (debounced)
    if (next.simulatedTime !== prev.simulatedTime) {
      if (next.simulatedTime === null) {
        pushEvent('time_reset', {})
      } else {
        pushEventDebounced('simulatedTime', 'time_simulate', {
          time: (next.simulatedTime as Date).toISOString(),
        })
      }
    }

    // Mission time (debounced)
    if (next.missionTime !== prev.missionTime && next.missionTime !== null) {
      pushEventDebounced('missionTime', 'mission_time', {
        time: (next.missionTime as Date).toISOString(),
      })
    }

    // Tour start/end
    if (next.activeTour !== prev.activeTour) {
      const tour = next.activeTour as { id: string; title: string; stops: unknown[] } | null
      const prevTour = prev.activeTour as { id: string; stops: unknown[] } | null
      if (tour && !prevTour) {
        pushEvent('tour_start', { tourId: tour.id, tourTitle: tour.title })
      } else if (!tour && prevTour) {
        pushEvent('tour_end', {
          tourId: prevTour.id,
          completed: (prev.tourStep as number) >= (prevTour.stops as unknown[]).length - 1,
          stepsReached: (prev.tourStep as number) + 1,
        })
      }
    }

    // Tour step navigation
    if (
      next.tourStep !== prev.tourStep &&
      next.activeTour !== null &&
      next.activeTour === prev.activeTour
    ) {
      const tour = next.activeTour as { id: string; stops: { objectId: string }[] }
      const step = next.tourStep as number
      pushEvent('tour_step', {
        tourId: tour.id,
        step,
        direction: step > (prev.tourStep as number) ? 'next' : 'prev',
        objectId: tour.stops[step]?.objectId,
      })
    }

    // Mission selection
    if (next.activeMission !== prev.activeMission) {
      const mission = next.activeMission as { id: string; name: string } | null
      if (mission) {
        pushEvent('mission_select', { missionId: mission.id, missionName: mission.name })
      } else {
        pushEvent('mission_deselect', {})
      }
    }

    // Settings toggles
    const settings = [
      'nightVision', 'showLabels', 'showMissionLabels', 'showOrbits',
      'showConstellationLines', 'showCrescentZones',
    ] as const
    for (const s of settings) {
      if (next[s] !== prev[s]) {
        pushEvent('setting_toggle', { setting: s, value: next[s] })
      }
    }

    // Modals
    const modals = [
      ['isAuthModalOpen', 'auth'],
      ['isReportModalOpen', 'report'],
      ['isObservationModalOpen', 'observation'],
    ] as const
    for (const [key, name] of modals) {
      if (next[key] !== prev[key]) {
        pushEvent(next[key] ? 'modal_open' : 'modal_close', { modal: name })
      }
    }
  }

  return f(loggedSet, get, api)
}

export const logging = loggingImpl as unknown as LoggingMiddleware
