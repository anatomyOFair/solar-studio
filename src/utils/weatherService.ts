import type { WeatherConditions } from '../types'

/**
 * Mock weather service for generating simulated weather conditions
 * Structure allows easy swapping with real API data later
 */

/**
 * Get mock weather conditions for a given region
 * Currently generates random but realistic weather data
 * @param lat Latitude
 * @param lon Longitude
 * @returns Weather conditions
 */
export async function getWeatherConditions(
  lat: number,
  lon: number
): Promise<WeatherConditions> {
  // TODO: Replace with real API call
  // Example: OpenWeatherMap, Tomorrow.io, etc.
  // For now, generate realistic mock data
  
  return generateMockWeather(lat, lon)
}

/**
 * Generate mock weather data based on location
 * Creates region-based variations for more realistic simulation
 * @param lat Latitude
 * @param lon Longitude
 * @returns Weather conditions
 */
function generateMockWeather(lat: number, lon: number): WeatherConditions {
  // Create deterministic pseudo-random based on location
  // This ensures same location always gets similar weather
  const seed = Math.floor(lat * 1000) + Math.floor(lon * 1000)
  const random = seededRandom(seed)

  // Regional weather patterns
  // Tropical regions: more clouds and precipitation
  // Deserts: clear skies
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

  // Ensure values are within bounds
  cloudCover = Math.min(1, cloudCover)
  precipitation = Math.min(25, precipitation)
  fog = Math.min(1, fog)

  const extinctionCoeff = calculateExtinctionCoefficient({
    cloudCover,
    precipitation,
    fog,
  })

  return {
    cloudCover,
    precipitation,
    fog,
    extinctionCoeff,
  }
}

/**
 * Simplified extinction coefficient calculation
 * Uses the formula from visibilityCalculator
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
 * Seeded random number generator for consistent pseudo-randomness
 * @param seed Seed value
 * @returns Random number between 0 and 1
 */
function seededRandom(seed: number): () => number {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

/**
 * Get weather conditions for a grid of locations
 * Useful for batch processing multiple points
 * @param positions Array of positions
 * @returns Array of weather conditions
 */
export async function getWeatherConditionsForGrid(
  positions: Array<{ lat: number; lon: number }>
): Promise<WeatherConditions[]> {
  const weatherPromises = positions.map((pos) => getWeatherConditions(pos.lat, pos.lon))
  return Promise.all(weatherPromises)
}

/**
 * Future API integration placeholder
 * Uncomment and implement when ready to use real weather API
 */

/*
export async function getWeatherConditionsFromAPI(
  lat: number,
  lon: number
): Promise<WeatherConditions> {
  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY
  
  // Example with OpenWeatherMap
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`
  )
  
  const data = await response.json()
  
  // Extract relevant data from API response
  const cloudCover = data.clouds.all / 100
  const precipitation = data.rain?.['1h'] || data.snow?.['1h'] || 0
  const visibility = data.visibility / 1000 // Convert from meters to kilometers
  
  // Estimate fog from visibility
  const fog = visibility < 1 ? 1 - visibility : 0
  
  const extinctionCoeff = visibility > 0 ? 3.912 / visibility : 10
  
  return {
    cloudCover,
    precipitation,
    fog,
    extinctionCoeff,
  }
}
*/

