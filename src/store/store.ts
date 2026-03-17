import { create } from 'zustand'
import type { Map } from 'leaflet'
import type { CelestialObject, UserReport, ObservationLogEntry } from '../types'
import type { TourDef } from '../data/tours'

interface StoreState {
  map: Map | null
  setMap: (map: Map | null) => void
  selectedObject: CelestialObject | null
  setSelectedObject: (object: CelestialObject | null) => void

  // Data Slice
  objects: CelestialObject[]
  objectsUpdatedAt: Date
  fetchObjects: () => Promise<void>
  visualizationMode: 'none' | 'hex'
  setVisualizationMode: (mode: 'none' | 'hex') => void
  reports: UserReport[]
  fetchReports: (objectId: string) => Promise<void>

  // Auth Slice
  user: any | null // Using any for now to be compatible with Supabase User
  session: any | null // Using any for now to be compatible with Supabase Sesssion
  setUser: (user: any | null) => void
  setSession: (session: any | null) => void
  logout: () => Promise<void>

  // UI Slice
  viewMode: 'home' | '2d' | '3d'
  setViewMode: (mode: 'home' | '2d' | '3d') => void
  isLocalTime: boolean
  toggleLocalTime: () => void
  isAuthModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  isReportModalOpen: boolean
  openReportModal: () => void
  closeReportModal: () => void
  showCrescentZones: boolean
  setShowCrescentZones: (show: boolean) => void
  simulatedTime: Date | null
  setSimulatedTime: (time: Date | null) => void
  // Loading
  dataReady: boolean
  setDataReady: (ready: boolean) => void
  sceneReady: boolean
  setSceneReady: (ready: boolean) => void
  // Camera HUD
  cameraDistAu: number
  setCameraDistAu: (v: number) => void
  // Tour
  tours: TourDef[]
  fetchTours: () => Promise<void>
  activeTour: TourDef | null
  tourStep: number
  startTour: (tour: TourDef) => void
  endTour: () => void
  nextTourStep: () => void
  prevTourStep: () => void
  // Location
  userLocation: { lat: number; lon: number; label: string } | null
  setUserLocation: (loc: { lat: number; lon: number; label: string } | null) => void
  fetchUserLocation: () => Promise<void>
  // Observation Log
  observationLogEntries: ObservationLogEntry[]
  fetchObservationLog: () => Promise<void>
  addObservationLogEntry: (entry: Omit<ObservationLogEntry, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  deleteObservationLogEntry: (id: string) => Promise<void>
  isObservationModalOpen: boolean
  openObservationModal: () => void
  closeObservationModal: () => void
}

export const useStore = create<StoreState>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
  selectedObject: null,
  setSelectedObject: (object) => set({ selectedObject: object }),

  // Data Slice
  objects: [],
  objectsUpdatedAt: new Date(),
  fetchObjects: async () => {
    const { supabase } = await import('../lib/supabase')
    const { calculateMoonPosition } = await import('../utils/celestialCalculations')

    try {
      // Fetch celestial objects from Supabase
      const { data, error } = await supabase
        .from('celestial_objects')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching celestial objects:', error)
        throw error
      }

      if (data && data.length > 0) {
        // Map database records to CelestialObject type
        const objects: CelestialObject[] = data.map((record) => ({
          id: record.id,
          name: record.name,
          type: record.type as CelestialObject['type'],
          position: {
            lat: record.dec ?? 0,  // Use declination for lat
            lon: record.ra ?? 0,   // Use RA for lon
            altitude: record.distance_km ?? 0,
          },
          x: record.x,
          y: record.y,
          z: record.z,
          vx: record.vx,
          vy: record.vy,
          vz: record.vz,
          ra: record.ra,
          dec: record.dec,
          distance_au: record.distance_au,
          distance_km: record.distance_km,
          magnitude: record.magnitude,
          radius_km: record.radius_km,
          parent_body: record.parent_body,
          jpl_horizons_id: record.jpl_horizons_id,
          description: record.description,
        }))

        const updatedAt = data[0]?.updated_at
          ? new Date(data[0].updated_at)
          : new Date()

        set({ objects, objectsUpdatedAt: updatedAt })
        return
      }
    } catch (err) {
      console.warn('Falling back to calculated Moon position')
    }

    // Fallback: Use calculated Moon position if table is empty or errors
    const now = new Date()
    const position = calculateMoonPosition(now)
    const moonObject: CelestialObject = {
      id: 'moon',
      name: 'Moon',
      type: 'moon',
      position: {
        lat: position.lat,
        lon: position.lon,
        altitude: position.altitude,
      },
    }

    set({ objects: [moonObject] })
  },

  reports: [],
  visualizationMode: 'none',
  setVisualizationMode: (mode) => set({ visualizationMode: mode, ...(mode === 'hex' ? { showCrescentZones: false } : {}) }),
  fetchReports: async (objectId: string) => {
    const { supabase } = await import('../lib/supabase')
    const { data, error } = await supabase
      .from('user_reports')
      .select('*')
      .eq('object_id', objectId)
      .order('created_at', { ascending: false })
      .limit(50) // Limit for now

    if (error) {
      console.error('Error fetching reports:', error)
    }

    if (data) {
      set({ reports: data as UserReport[] })
    }
  },

  // Auth Slice (Supabase)
  user: null, // This will now hold the Supabase User object
  session: null,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  logout: async () => {
    const { supabase } = await import('../lib/supabase')
    await supabase.auth.signOut()
    set({ session: null, user: null })
  },

  // UI Slice
  viewMode: 'home',
  setViewMode: (mode) => set({ viewMode: mode }),
  isLocalTime: false,
  toggleLocalTime: () => set((state) => ({ isLocalTime: !state.isLocalTime })),
  isAuthModalOpen: false,
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  isReportModalOpen: false,
  openReportModal: () => set({ isReportModalOpen: true }),
  closeReportModal: () => set({ isReportModalOpen: false }),
  showCrescentZones: false,
  setShowCrescentZones: (show) => set({ showCrescentZones: show, ...(show ? { visualizationMode: 'none' } : {}) }),
  simulatedTime: null,
  setSimulatedTime: (time) => set({ simulatedTime: time }),
  // Loading
  dataReady: false,
  setDataReady: (ready) => set({ dataReady: ready }),
  sceneReady: false,
  setSceneReady: (ready) => set({ sceneReady: ready }),
  // Camera HUD
  cameraDistAu: 0,
  setCameraDistAu: (v) => set({ cameraDistAu: v }),
  // Tour
  tours: [],
  fetchTours: async () => {
    const { supabase } = await import('../lib/supabase')
    try {
      const { data: toursData, error: toursErr } = await supabase
        .from('tours')
        .select('*')
        .order('sort_order')
      if (toursErr || !toursData?.length) return

      const { data: stopsData, error: stopsErr } = await supabase
        .from('tour_stops')
        .select('*')
        .order('step_order')
      if (stopsErr) return

      const tours: TourDef[] = toursData.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        stops: (stopsData ?? [])
          .filter((s: any) => s.tour_id === t.id)
          .map((s: any) => ({ objectId: s.object_id, narration: s.narration })),
      }))
      set({ tours })
    } catch {
      // DB unavailable — tours panel stays hidden
    }
  },
  activeTour: null,
  tourStep: 0,
  startTour: (tour) => set((state) => {
    const obj = state.objects.find((o) => o.id === tour.stops[0]?.objectId) ?? null
    return { activeTour: tour, tourStep: 0, selectedObject: obj, viewMode: '3d' }
  }),
  endTour: () => set({ activeTour: null, tourStep: 0, selectedObject: null }),
  nextTourStep: () => set((state) => {
    if (!state.activeTour) return {}
    const next = state.tourStep + 1
    if (next >= state.activeTour.stops.length) return { activeTour: null, tourStep: 0, selectedObject: null }
    const obj = state.objects.find((o) => o.id === state.activeTour!.stops[next].objectId) ?? null
    return { tourStep: next, selectedObject: obj }
  }),
  prevTourStep: () => set((state) => {
    if (!state.activeTour) return {}
    const prev = Math.max(0, state.tourStep - 1)
    const obj = state.objects.find((o) => o.id === state.activeTour!.stops[prev].objectId) ?? null
    return { tourStep: prev, selectedObject: obj }
  }),
  // Location
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  fetchUserLocation: async () => {
    if (!navigator.geolocation) {
      set({ userLocation: { lat: 40.7, lon: -74.0, label: 'New York' } })
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        let label = `${latitude.toFixed(1)}°, ${longitude.toFixed(1)}°`
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          const data = await res.json()
          if (data?.address) {
            label = data.address.city || data.address.town || data.address.village || data.address.county || label
          }
        } catch { /* use coordinate fallback */ }
        set({ userLocation: { lat: latitude, lon: longitude, label } })
      },
      () => {
        set({ userLocation: { lat: 40.7, lon: -74.0, label: 'New York' } })
      }
    )
  },
  // Observation Log
  observationLogEntries: [],
  fetchObservationLog: async () => {
    const user = useStore.getState().user
    if (!user) return
    try {
      const { supabase } = await import('../lib/supabase')
      const { data, error } = await supabase
        .from('observation_log')
        .select('*')
        .eq('user_id', user.id)
        .order('observed_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching observation log:', error)
      }
      if (data) {
        set({ observationLogEntries: data as ObservationLogEntry[] })
      }
    } catch (err) {
      console.error('Error fetching observation log:', err)
    }
  },
  addObservationLogEntry: async (entry) => {
    const user = useStore.getState().user
    if (!user) return
    const { supabase } = await import('../lib/supabase')
    const { error } = await supabase
      .from('observation_log')
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        ...entry,
      })

    if (error) throw error
    useStore.getState().fetchObservationLog()
  },
  deleteObservationLogEntry: async (id: string) => {
    const { supabase } = await import('../lib/supabase')
    const { error } = await supabase
      .from('observation_log')
      .delete()
      .eq('id', id)

    if (error) throw error
    useStore.getState().fetchObservationLog()
  },
  isObservationModalOpen: false,
  openObservationModal: () => set({ isObservationModalOpen: true }),
  closeObservationModal: () => set({ isObservationModalOpen: false }),
}))

export function getEffectiveTime(): Date {
  return useStore.getState().simulatedTime ?? new Date()
}

