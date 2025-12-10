import { create } from 'zustand'
import type { Map } from 'leaflet'
import type { CelestialObject } from '../types'

interface StoreState {
  map: Map | null
  setMap: (map: Map | null) => void
  selectedObject: CelestialObject | null
  setSelectedObject: (object: CelestialObject | null) => void

  // Auth Slice
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
}

export const useStore = create<StoreState>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
  selectedObject: null,
  setSelectedObject: (object) => set({ selectedObject: object }),

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

