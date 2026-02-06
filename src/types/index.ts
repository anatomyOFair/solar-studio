// Celestial Object Types
export type CelestialObjectType = 'moon' | 'planet' | 'dwarf_planet' | 'star' | 'asteroid' | 'comet' | 'satellite' | 'spacecraft'

export interface CelestialObject {
  id: string
  name: string
  type: CelestialObjectType

  // Observer-centric position (for visibility calculations)
  position: {
    lat: number  // declination mapped to lat for visibility calc
    lon: number  // RA mapped to lon for visibility calc
    altitude: number  // distance in km
  }

  // Heliocentric cartesian coordinates (AU) for 3D rendering
  x?: number
  y?: number
  z?: number

  // Velocity (AU/day) for animation
  vx?: number
  vy?: number
  vz?: number

  // Observer data
  ra?: number           // Right Ascension (degrees)
  dec?: number          // Declination (degrees)
  distance_au?: number  // Distance from Earth (AU)
  distance_km?: number  // Distance from Earth (km)
  magnitude?: number    // Apparent magnitude

  // Physical properties
  radius_km?: number
  parent_body?: string  // For moons
  jpl_horizons_id?: string
}

// Weather Conditions
export interface WeatherConditions {
  cloudCover: number  // 0-1, percentage of sky covered
  precipitation: number  // mm/h
  fog: number  // 0-1 visibility reduction factor
  extinctionCoeff: number  // atmospheric extinction coefficient
}

// Visibility Data
export interface VisibilityData {
  percentage: number  // 0-100, overall visibility percentage
  weatherRating: number  // 1-10, weather impact rating
  timeRating: number  // 1-10, time/light rating (day/night)
}

// Position interface for calculations
export interface Position {
  lat: number
  lon: number
  altitude: number
}

// Visibility Calculation Types
export interface VisibilityCalculationRequest {
  observer_position: Position
  target_position: Position
  weather_conditions: WeatherConditions
  current_time?: string  // ISO date string
}

export interface VisibilityCalculationResponse {
  visibility_data: VisibilityData
  distance_km: number
  max_los_distance_km: number
  weather_limit_km: number
}


export interface UserReport {
  id: string
  user_id: string
  object_id: string
  country: string
  is_visible: boolean
  image_url?: string | null
  created_at: string
}
