import { useState, useEffect, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import { useStore } from '../../store/store'
import {
  calculateVisibilityScore,
  visibilityScoreToPercentage,
  getWeatherRating,
  timeFactorToRating,
  getTimeOfDayFactor,
} from '../../utils/visibilityCalculator'
import { getWeatherConditions } from '../../utils/weatherService'
import { colors, spacing, sizes } from '../../constants'
import type { Position } from '../../types'

export default function VisibilityTooltip() {
  const map = useMap()
  const selectedObject = useStore((state) => state.selectedObject)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [visibilityData, setVisibilityData] = useState<{
    percentage: number
    weatherRating: number
    timeRating: number
  } | null>(null)

  const hoverStartTimeRef = useRef<number | null>(null)
  const currentPositionRef = useRef<{ lat: number; lon: number } | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const calculateVisibilityAtPoint = useCallback(
    async (lat: number, lon: number) => {
      if (!selectedObject) return null

      const weather = await getWeatherConditions(lat, lon)
      const observerPos: Position = { lat, lon, altitude: 0 }
      const targetPos: Position = {
        lat: selectedObject.position.lat,
        lon: selectedObject.position.lon,
        altitude: selectedObject.position.altitude,
      }

      const currentTime = new Date()
      const visibilityScore = calculateVisibilityScore(observerPos, targetPos, weather, currentTime)
      const visibilityPercentage = visibilityScoreToPercentage(visibilityScore)
      const weatherRating = getWeatherRating(weather.extinctionCoeff)
      const timeFactor = getTimeOfDayFactor(observerPos, currentTime)
      const timeRating = timeFactorToRating(timeFactor)

      return {
        percentage: visibilityPercentage,
        weatherRating,
        timeRating,
      }
    },
    [selectedObject]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!map || !selectedObject) return

      const latlng = map.containerPointToLatLng([e.clientX, e.clientY])
      const currentPos = { lat: latlng.lat, lon: latlng.lng }

      // Check if we've moved significantly
      if (
        currentPositionRef.current &&
        Math.abs(currentPositionRef.current.lat - currentPos.lat) < 0.01 &&
        Math.abs(currentPositionRef.current.lon - currentPos.lon) < 0.01
      ) {
        // Position hasn't changed significantly
        if (!hoverStartTimeRef.current) {
          hoverStartTimeRef.current = Date.now()
        }

        const hoverDuration = Date.now() - hoverStartTimeRef.current
        if (hoverDuration >= 3000 && !tooltipVisible) {
          // Show tooltip after 3 seconds
          setTooltipVisible(true)
          setTooltipPosition({ x: e.clientX, y: e.clientY })

          // Calculate visibility data
          calculateVisibilityAtPoint(currentPos.lat, currentPos.lon).then((data) => {
            if (data) {
              setVisibilityData(data)
            }
          })
        }
      } else {
        // Position has changed, reset hover timer
        hoverStartTimeRef.current = null
        currentPositionRef.current = currentPos

        if (tooltipVisible) {
          setTooltipVisible(false)
          setVisibilityData(null)
        }

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    },
    [map, selectedObject, tooltipVisible, calculateVisibilityAtPoint]
  )

  const handleMouseLeave = useCallback(() => {
    hoverStartTimeRef.current = null
    currentPositionRef.current = null

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setTooltipVisible(false)
    setVisibilityData(null)
  }, [])

  useEffect(() => {
    if (!selectedObject) {
      // Don't show tooltips when no object selected
      setTooltipVisible(false)
      setVisibilityData(null)
      return
    }

    const mapContainer = map.getContainer()
    mapContainer.addEventListener('mousemove', handleMouseMove)
    mapContainer.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      mapContainer.removeEventListener('mousemove', handleMouseMove)
      mapContainer.removeEventListener('mouseleave', handleMouseLeave)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [map, selectedObject, handleMouseMove, handleMouseLeave])

  if (!tooltipVisible || !visibilityData) return null

  // Position tooltip relative to mouse, adjusting if too close to edges
  const tooltipX = tooltipPosition.x + 20
  const tooltipY = tooltipPosition.y + 20

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: `${tooltipX}px`,
        top: `${tooltipY}px`,
        transform: 'translate(-50%, -100%)',
        backgroundColor: colors.navbar.background,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${colors.navbar.border}`,
        borderRadius: sizes.borderRadius.xl,
        padding: spacing.md,
        minWidth: '200px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, calc(-100% - 10px)); }
            to { opacity: 1; transform: translate(-50%, -100%); }
          }
        `}
      </style>

      <div className="mb-3">
        <div className="text-xs uppercase mb-1" style={{ color: colors.text.muted, fontWeight: 600 }}>
          Visibility Details
        </div>
        <div className="text-2xl font-bold" style={{ color: colors.text.primary }}>
          {visibilityData.percentage}%
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: colors.text.secondary }}>
            Weather Rating
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
              {visibilityData.weatherRating}/10
            </div>
            <div
              className="w-12 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: colors.navbar.border }}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${visibilityData.weatherRating * 10}%`,
                  backgroundColor: getWeatherColor(visibilityData.weatherRating),
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: colors.text.secondary }}>
            Time/Light Rating
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
              {visibilityData.timeRating}/10
            </div>
            <div
              className="w-12 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: colors.navbar.border }}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${visibilityData.timeRating * 10}%`,
                  backgroundColor: getTimeColor(visibilityData.timeRating),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to get weather color based on rating
function getWeatherColor(rating: number): string {
  if (rating >= 8) return colors.status.success
  if (rating >= 5) return colors.status.warning
  return colors.status.error
}

// Helper function to get time color based on rating
function getTimeColor(rating: number): string {
  if (rating >= 7) return colors.status.success
  if (rating >= 4) return colors.status.warning
  return colors.status.error
}

