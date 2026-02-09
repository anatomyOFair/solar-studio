import { create } from 'zustand'
import type { Map } from 'leaflet'
import type { CelestialObject, UserReport } from '../types'

interface StoreState {
  map: Map | null
  setMap: (map: Map | null) => void
  selectedObject: CelestialObject | null
  setSelectedObject: (object: CelestialObject | null) => void

  // Data Slice
  // Data Slice
  objects: CelestialObject[]
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
  isLocalTime: boolean
  toggleLocalTime: () => void
  isAuthModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  isReportModalOpen: boolean
  openReportModal: () => void
  closeReportModal: () => void
}

export const useStore = create<StoreState>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
  selectedObject: null,
  setSelectedObject: (object) => set({ selectedObject: object }),

  // Data Slice
  objects: [],
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
        }))

        set({ objects })
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
  setVisualizationMode: (mode) => set({ visualizationMode: mode }),
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
  isLocalTime: false,
  toggleLocalTime: () => set((state) => ({ isLocalTime: !state.isLocalTime })),
  isAuthModalOpen: false,
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  isReportModalOpen: false,
  openReportModal: () => set({ isReportModalOpen: true }),
  closeReportModal: () => set({ isReportModalOpen: false }),
}))

