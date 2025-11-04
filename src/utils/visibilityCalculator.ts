import type { Position, WeatherConditions } from '../types'

const EARTH_RADIUS_KM = 6371
const REFRACTION_COEFFICIENT = 4 / 3

/**
 * Calculate the great circle distance between two points on Earth's surface using Haversine formula
 * @param pos1 First position
 * @param pos2 Second position
 * @returns Distance in kilometers
 */
export function haversineDistance(pos1: Position, pos2: Position): number {
  const lat1 = pos1.lat * (Math.PI / 180)
  const lat2 = pos2.lat * (Math.PI / 180)
  const deltaLat = (pos2.lat - pos1.lat) * (Math.PI / 180)
  const deltaLon = (pos2.lon - pos1.lon) * (Math.PI / 180)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = EARTH_RADIUS_KM * c

  return distance
}

/**
 * Calculate the distance to the horizon from a given altitude
 * Formula: d = 3.57 × √(K × h)
 * @param altitude Height in kilometers
 * @returns Horizon distance in kilometers
 */
export function calculateHorizonDistance(altitude: number): number {
  const altitudeMeters = altitude * 1000
  return 3.57 * Math.sqrt(REFRACTION_COEFFICIENT * altitudeMeters)
}

/**
 * Calculate maximum line-of-sight distance between two points with different altitudes
 * Formula: D_max = 3.57 × (√h₁ + √h₂)
 * @param altitude1 First altitude in kilometers
 * @param altitude2 Second altitude in kilometers
 * @returns Maximum LOS distance in kilometers
 */
export function calculateMaxLOSDistance(altitude1: number, altitude2: number): number {
  const h1 = altitude1 * 1000 // Convert to meters
  const h2 = altitude2 * 1000
  return 3.57 * (Math.sqrt(REFRACTION_COEFFICIENT * h1) + Math.sqrt(REFRACTION_COEFFICIENT * h2))
}

/**
 * Calculate atmospheric extinction coefficient from weather conditions
 * Simplified model: β = β_base + (cloudCover × 0.5) + (precipitation × 0.1) + (fog × 20)
 * @param weather Weather conditions
 * @returns Extinction coefficient
 */
export function calculateExtinctionCoefficient(weather: WeatherConditions): number {
  const betaBase = 0.05 // Clear air baseline
  const betaCloud = weather.cloudCover * 0.5
  const betaPrecipitation = weather.precipitation * 0.1
  const betaFog = weather.fog * 20

  return betaBase + betaCloud + betaPrecipitation + betaFog
}

/**
 * Calculate Koschmieder's law visibility distance
 * Formula: V = 3.912 / β
 * @param extinctionCoeff Extinction coefficient
 * @returns Visibility distance in kilometers
 */
export function calculateKoschmiederVisibility(extinctionCoeff: number): number {
  return 3.912 / extinctionCoeff
}

/**
 * Calculate time of day factor based on solar position
 * Returns a factor between 0 and 1 representing visibility quality
 * @param position Observer position (not currently used, but kept for future solar calculations)
 * @param currentTime Current time
 * @returns Time factor (0-1)
 */
export function getTimeOfDayFactor(_position: Position, currentTime: Date): number {
  const hour = currentTime.getHours()

  // Simplified model:
  // 6 AM - 8 PM: Full daylight (1.0)
  // 5-6 AM, 8-9 PM: Dawn/Dusk (0.7)
  // 4-5 AM, 9-10 PM: Twilight (0.5)
  // 10 PM - 4 AM: Night (0.3)

  if (hour >= 6 && hour < 20) {
    return 1.0
  } else if ((hour >= 5 && hour < 6) || (hour >= 20 && hour < 21)) {
    return 0.7
  } else if ((hour >= 4 && hour < 5) || (hour >= 21 && hour < 22)) {
    return 0.5
  } else {
    return 0.3
  }
}

/**
 * Convert time factor to 1-10 rating
 * @param timeFactor Time factor (0-1)
 * @returns Time rating (1-10)
 */
export function timeFactorToRating(timeFactor: number): number {
  return Math.round(timeFactor * 9 + 1)
}

/**
 * Calculate weather impact rating based on extinction coefficient
 * @param extinctionCoeff Extinction coefficient
 * @returns Weather rating (1-10, where 10 is best conditions)
 */
export function getWeatherRating(extinctionCoeff: number): number {
  // Map extinction coefficient to 1-10 rating
  // Lower extinction = better visibility = higher rating
  if (extinctionCoeff <= 0.05) return 10
  if (extinctionCoeff <= 0.1) return 9
  if (extinctionCoeff <= 0.2) return 8
  if (extinctionCoeff <= 0.5) return 7
  if (extinctionCoeff <= 1.0) return 6
  if (extinctionCoeff <= 2.0) return 5
  if (extinctionCoeff <= 5.0) return 4
  if (extinctionCoeff <= 10.0) return 3
  if (extinctionCoeff <= 20.0) return 2
  return 1
}

/**
 * Calculate overall visibility score combining all factors
 * @param observerPos Observer position
 * @param targetPos Target position
 * @param weather Weather conditions
 * @param currentTime Current time
 * @returns Visibility score (0-1)
 */
export function calculateVisibilityScore(
  observerPos: Position,
  targetPos: Position,
  weather: WeatherConditions,
  currentTime: Date
): number {
  // 1. Calculate great circle distance
  const distance = haversineDistance(observerPos, targetPos)

  // 2. Check geometric visibility (with refraction)
  const observerHorizon = calculateHorizonDistance(observerPos.altitude)
  const targetHorizon = calculateHorizonDistance(targetPos.altitude)
  const maxLOS = observerHorizon + targetHorizon

  // 3. Calculate weather-based visibility limit
  const extinctionCoeff = calculateExtinctionCoefficient(weather)
  const weatherLimit = calculateKoschmiederVisibility(extinctionCoeff)

  // 4. Effective visibility is minimum of geometric and weather limits
  const effectiveLimit = Math.min(maxLOS, weatherLimit)

  // 5. Check if target is within LOS
  if (distance > effectiveLimit) {
    return 0
  }

  // 6. Apply Koschmieder contrast reduction
  const contrast = Math.exp(-extinctionCoeff * distance)

  // 7. Apply time-of-day factor
  const timeFactor = getTimeOfDayFactor(observerPos, currentTime)

  return Math.max(0, Math.min(1, contrast * timeFactor))
}

/**
 * Calculate visibility percentage from visibility score
 * @param visibilityScore Visibility score (0-1)
 * @returns Visibility percentage (0-100)
 */
export function visibilityScoreToPercentage(visibilityScore: number): number {
  return Math.round(visibilityScore * 100)
}

