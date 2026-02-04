import type { WeatherConditions } from '../types'
import { supabase } from '../lib/supabase'

const GRID_RESOLUTION = 10

// Backend API URL (Heroku)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://solar-studio-api-8a039d099d67.herokuapp.com'

// In-memory cache for overlay data (from Supabase)
const overlayCache = new Map<string, { data: WeatherConditions; timestamp: number }>()
const OVERLAY_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// In-memory cache for user-specific data (from backend)
const userCache = new Map<string, { data: WeatherConditions; timestamp: number }>()
const USER_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Get weather for OVERLAY rendering (reads from Supabase pre-populated data)
 * Falls back to mock if not found
 */
export async function getWeatherConditions(
  lat: number,
  lon: number
): Promise<WeatherConditions> {
  const latGrid = Math.round(lat / GRID_RESOLUTION) * GRID_RESOLUTION
  const lonGrid = Math.round(lon / GRID_RESOLUTION) * GRID_RESOLUTION
  const cacheKey = `${latGrid},${lonGrid}`

  // Check memory cache
  const cached = overlayCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < OVERLAY_CACHE_TTL_MS) {
    return cached.data
  }

  try {
    // Try Supabase
    const weather = await getWeatherFromSupabase(latGrid, lonGrid)
    if (weather) {
      overlayCache.set(cacheKey, { data: weather, timestamp: Date.now() })
      return weather
    }
  } catch (error) {
    console.warn('Supabase weather fetch failed:', error)
  }

  // Fallback to mock
  return generateMockWeather(lat, lon)
}

/**
 * Get weather for USER-SPECIFIC location (calls backend API with neighbor caching)
 * Used for tooltip/hover and user's actual location
 */
export async function getWeatherForUserLocation(
  lat: number,
  lon: number
): Promise<WeatherConditions> {
  // Round to 0.1 for cache key
  const cacheKey = `${lat.toFixed(1)},${lon.toFixed(1)}`

  // Check memory cache
  const cached = userCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL_MS) {
    return cached.data
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/weather?lat=${lat}&lon=${lon}`)
    if (response.ok) {
      const data = await response.json()
      const weather: WeatherConditions = {
        cloudCover: data.cloudCover,
        precipitation: data.precipitation,
        fog: data.fog,
        extinctionCoeff: calculateExtinctionCoefficient({
          cloudCover: data.cloudCover,
          precipitation: data.precipitation,
          fog: data.fog,
        }),
      }
      userCache.set(cacheKey, { data: weather, timestamp: Date.now() })
      return weather
    }
  } catch (error) {
    console.warn('Backend weather fetch failed:', error)
  }

  // Fallback to overlay data or mock
  return getWeatherConditions(lat, lon)
}

/**
 * Get weather from Supabase cache (for overlay)
 */
async function getWeatherFromSupabase(
  latGrid: number,
  lonGrid: number
): Promise<WeatherConditions | null> {
  const { data, error } = await supabase
    .from('weather_cache')
    .select('cloud_cover, precipitation, fog, updated_at')
    .eq('lat_grid', latGrid)
    .eq('lon_grid', lonGrid)
    .single()

  if (error || !data) {
    return null
  }

  // Check if stale (> 3 hours)
  const updatedAt = new Date(data.updated_at).getTime()
  if (Date.now() - updatedAt > 3 * 60 * 60 * 1000) {
    return null
  }

  return {
    cloudCover: data.cloud_cover,
    precipitation: data.precipitation,
    fog: data.fog,
    extinctionCoeff: calculateExtinctionCoefficient({
      cloudCover: data.cloud_cover,
      precipitation: data.precipitation,
      fog: data.fog,
    }),
  }
}

/**
 * Generate mock weather data (fallback)
 */
function generateMockWeather(lat: number, lon: number): WeatherConditions {
  const seed = Math.floor(lat * 1000) + Math.floor(lon * 1000)
  const random = seededRandom(seed)

  const isTropical = Math.abs(lat) < 23.5
  const isDesert = Math.abs(lat) > 15 && Math.abs(lat) < 35 && Math.abs(lon) > 0 && Math.abs(lon) < 60

  let cloudCover = random() * 0.8
  let precipitation = random() * 10
  let fog = random() * 0.3

  if (isTropical) {
    cloudCover *= 1.2
    precipitation *= 1.5
    fog *= 0.5
  } else if (isDesert) {
    cloudCover *= 0.3
    precipitation *= 0.2
    fog *= 0.1
  }

  cloudCover = Math.min(1, cloudCover)
  precipitation = Math.min(25, precipitation)
  fog = Math.min(1, fog)

  return {
    cloudCover,
    precipitation,
    fog,
    extinctionCoeff: calculateExtinctionCoefficient({ cloudCover, precipitation, fog }),
  }
}

/**
 * Calculate extinction coefficient from weather data
 */
function calculateExtinctionCoefficient(weather: {
  cloudCover: number
  precipitation: number
  fog: number
}): number {
  const betaBase = 0.05
  const betaCloud = weather.cloudCover * 0.5
  const betaPrecipitation = weather.precipitation * 0.1
  const betaFog = weather.fog * 20

  return betaBase + betaCloud + betaPrecipitation + betaFog
}

/**
 * Seeded random for consistent mock data
 */
function seededRandom(seed: number): () => number {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

/**
 * Batch get weather for overlay (used by HexGridLayer)
 */
export async function getWeatherConditionsForGrid(
  positions: Array<{ lat: number; lon: number }>
): Promise<WeatherConditions[]> {
  return Promise.all(positions.map((pos) => getWeatherConditions(pos.lat, pos.lon)))
}
