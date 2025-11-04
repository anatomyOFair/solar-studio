import { create } from 'zustand'
import type { Map } from 'leaflet'
import type { CelestialObject } from '../types'

interface StoreState {
  map: Map | null
  setMap: (map: Map | null) => void
  selectedObject: CelestialObject | null
  setSelectedObject: (object: CelestialObject | null) => void
}

export const useStore = create<StoreState>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
  selectedObject: null,
  setSelectedObject: (object) => set({ selectedObject: object }),
}))

// Mock Moon data for testing
export const MOCK_MOON: CelestialObject = {
  id: 'moon',
  name: 'Moon',
  type: 'moon',
  position: {
    lat: 28.6139,  // Example position (Delhi, India) - will be updated with orbital mechanics
    lon: 77.2090,
    altitude: 384400,  // Average distance from Earth in km
  },
}

