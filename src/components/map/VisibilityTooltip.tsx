import { useEffect, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useStore } from '../../store/store'
import { getCelestialVisibilityBreakdown } from '../../utils/visibilityCalculator'
import { getAllWeatherFromCache, getWeatherFromBulkCache } from '../../utils/weatherService'
import type { WeatherConditions } from '../../types'

// Inject probe marker pulse animation once
const PROBE_STYLE_ID = 'probe-marker-pulse'
if (typeof document !== 'undefined' && !document.getElementById(PROBE_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = PROBE_STYLE_ID
  style.textContent = `
    @keyframes probe-pulse {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(2.5); opacity: 0; }
    }
  `
  document.head.appendChild(style)
}

export default function VisibilityTooltip() {
  const map = useMap()
  const simulatedTime = useStore((state) => state.simulatedTime)
  const setProbedLocation = useStore((state) => state.setProbedLocation)

  const weatherCacheRef = useRef<Map<string, WeatherConditions>>(new Map())
  const markerRef = useRef<L.Marker | null>(null)

  // Load weather cache and refresh every 5 minutes (matching HexGridLayer)
  useEffect(() => {
    const loadCache = () => {
      getAllWeatherFromCache().then((cache) => {
        weatherCacheRef.current = cache
      })
    }
    loadCache()
    const interval = setInterval(loadCache, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [simulatedTime])

  // Place or move the probe marker
  const updateMarker = useCallback(
    (lat: number, lon: number) => {
      const icon = L.divIcon({
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: `
          <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:14px;height:14px;border-radius:50%;background:#c9a55c;opacity:0.4;animation:probe-pulse 2s ease-out infinite;"></div>
            <div style="width:8px;height:8px;border-radius:50%;background:#c9a55c;border:2px solid white;box-shadow:0 0 6px rgba(0,0,0,0.5);position:relative;z-index:1;"></div>
          </div>
        `,
      })

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon])
        markerRef.current.setIcon(icon)
      } else {
        markerRef.current = L.marker([lat, lon], { icon, interactive: false, zIndexOffset: 900 }).addTo(map)
      }
    },
    [map]
  )

  const removeMarker = useCallback(() => {
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
  }, [])

  // Handle left-click on map
  const handleClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      const { lat, lng: lon } = e.latlng
      const selectedObj = useStore.getState().selectedObject
      const simTime = useStore.getState().simulatedTime

      // Always drop pin
      updateMarker(lat, lon)

      // Compute visibility only if an object is selected
      if (selectedObj) {
        const weather = getWeatherFromBulkCache(lat, lon, weatherCacheRef.current)
        if (weather) {
          const effectiveTime = simTime ?? new Date()
          const breakdown = getCelestialVisibilityBreakdown(lat, lon, effectiveTime, weather, selectedObj)
          setProbedLocation({
            lat,
            lon,
            percentage: Math.round(breakdown.score * 100),
            weatherRating: breakdown.weatherRating,
            timeRating: breakdown.timeRating,
            objectAltitude: breakdown.objectAltitude,
            illumination: breakdown.illumination,
            isAboveHorizon: breakdown.isAboveHorizon,
          })
          return
        }
        // Object selected but no weather data for this point
        setProbedLocation({ lat, lon, noWeather: true })
        return
      }

      // No object selected — just store coordinates
      setProbedLocation({ lat, lon })
    },
    [setProbedLocation, updateMarker]
  )

  // Attach click listener (always active)
  useEffect(() => {
    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [map, handleClick])

  // Clean up marker on unmount
  useEffect(() => {
    return () => {
      removeMarker()
    }
  }, [removeMarker])

  return null
}
