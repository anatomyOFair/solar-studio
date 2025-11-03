import { create } from 'zustand'
import type { Map } from 'leaflet'

interface StoreState {
  map: Map | null
  setMap: (map: Map | null) => void
}

export const useStore = create<StoreState>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
}))

