import { create } from 'zustand'
import type { Map } from 'leaflet'
import type { CelestialObject, UserReport } from '../types'

interface StoreState {
  map: Map | null
  setMap: (map: Map | null) => void
  selectedObject: CelestialObject | null
  setSelectedObject: (object: CelestialObject | null) => void

  // Data Slice
  objects: CelestialObject[]
  fetchObjects: () => Promise<void>
  reports: UserReport[]
  fetchReports: (objectId: string) => Promise<void>

  // Auth Slice
  user: any | null // Using any for now to be compatible with Supabase User
  session: any | null // Using any for now to be compatible with Supabase Sesssion
  setUser: (user: any | null) => void
  setSession: (session: any | null) => void
  logout: () => Promise<void>

  // UI Slice
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
    const { data, error } = await supabase.from('celestial_objects').select('*')
    if (error) {
      console.error('Error fetching objects:', error)
    }
    console.log('Fetched objects:', data)
    if (data) {
      set({ objects: data as CelestialObject[] })
    }
  },

  reports: [],
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
  isAuthModalOpen: false,
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  isReportModalOpen: false,
  openReportModal: () => set({ isReportModalOpen: true }),
  closeReportModal: () => set({ isReportModalOpen: false }),
}))

// Mock Moon data for testing
export const MOCK_MOON: CelestialObject = {
  id: 'moon',
  name: 'Moon',
  type: 'moon',
  position: {
    lat: 28.6139,
    lon: 77.2090,
    altitude: 384400,
  },
}

