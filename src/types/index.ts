// Celestial Object Types
export type CelestialObjectType = 'moon' | 'planet' | 'satellite' | 'star' | 'asteroid' | 'spacecraft'

export interface CelestialObject {
  id: string
  name: string
  type: CelestialObjectType
  position: {
    lat: number  // degrees
    lon: number  // degrees
    altitude: number  // kilometers above sea level
  }
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

