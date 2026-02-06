import { useState, useEffect, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import { useStore } from '../../store/store'
import { getCelestialVisibilityBreakdown } from '../../utils/visibilityCalculator'
import { getWeatherForUserLocation } from '../../utils/weatherService'
import { colors, spacing, sizes } from '../../constants'

export default function VisibilityTooltip() {
  const map = useMap()
  const selectedObject = useStore((state) => state.selectedObject)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [visibilityData, setVisibilityData] = useState<{
    percentage: number
    weatherRating: number
    timeRating: number
    moonAltitude: number
    moonIllumination: number
    isAboveHorizon: boolean
  } | null>(null)

  const currentPixelRef = useRef<{ x: number; y: number } | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipVisibleRef = useRef(false)

  const calculateVisibilityAtPoint = useCallback(
    async (lat: number, lon: number) => {
      if (!selectedObject) return null

      const weather = await getWeatherForUserLocation(lat, lon)
      const currentTime = new Date()

      // Use celestial-specific calculation
      const breakdown = getCelestialVisibilityBreakdown(lat, lon, currentTime, weather)

      return {
        percentage: Math.round(breakdown.score * 100),
        weatherRating: breakdown.weatherRating,
        timeRating: breakdown.timeRating,
        moonAltitude: breakdown.moonAltitude,
        moonIllumination: breakdown.moonIllumination,
        isAboveHorizon: breakdown.isAboveHorizon,
      }
    },
    [selectedObject]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!map || !selectedObject) return

      const currentPixel = { x: e.clientX, y: e.clientY }

      // Check if we've moved more than 15 pixels (much less sensitive)
      const hasMoved = !currentPixelRef.current ||
        Math.abs(currentPixelRef.current.x - currentPixel.x) >= 15 ||
        Math.abs(currentPixelRef.current.y - currentPixel.y) >= 15

      if (hasMoved) {
        // Position has changed, reset and start new timer
        currentPixelRef.current = currentPixel

        if (tooltipVisibleRef.current) {
          tooltipVisibleRef.current = false
          setTooltipVisible(false)
          setVisibilityData(null)
        }

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Start new timeout for 1.5 seconds
        timeoutRef.current = setTimeout(() => {
          const rect = map.getContainer().getBoundingClientRect()
          const x = currentPixel.x - rect.left
          const y = currentPixel.y - rect.top
          const latlng = map.containerPointToLatLng([x, y])

          tooltipVisibleRef.current = true
          setTooltipVisible(true)
          setTooltipPosition({ x: currentPixel.x, y: currentPixel.y })

          // Calculate visibility data
          calculateVisibilityAtPoint(latlng.lat, latlng.lng).then((data) => {
            if (data && tooltipVisibleRef.current) {
              setVisibilityData(data)
            }
          })
        }, 1500)
      }
    },
    [map, selectedObject, calculateVisibilityAtPoint]
  )

  const handleMouseLeave = useCallback(() => {
    currentPixelRef.current = null
    tooltipVisibleRef.current = false

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

  if (!tooltipVisible) return null

  // Position tooltip relative to mouse, adjusting if too close to edges
  const tooltipX = tooltipPosition.x + 20
  const tooltipY = tooltipPosition.y - 20

  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'fixed',
        left: `${tooltipX}px`,
        top: `${tooltipY}px`,
        zIndex: 9999,
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

      {!visibilityData ? (
        <div className="text-sm" style={{ color: colors.text.secondary }}>
          Loading...
        </div>
      ) : (
        <>
          <div className="mb-3">
            <div className="text-xs uppercase mb-1" style={{ color: colors.text.muted, fontWeight: 600 }}>
              Visibility Details
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text.primary }}>
              {visibilityData.percentage}%
            </div>
            {!visibilityData.isAboveHorizon && (
              <div className="text-xs mt-1" style={{ color: colors.status.error }}>
                Moon below horizon
              </div>
            )}
          </div>

          <div className="space-y-2 mb-3 pb-3" style={{ borderBottom: `1px solid ${colors.navbar.border}` }}>
            <div className="flex items-center justify-between">
              <div className="text-sm" style={{ color: colors.text.secondary }}>
                Moon Altitude
              </div>
              <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                {visibilityData.moonAltitude.toFixed(1)}°
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm" style={{ color: colors.text.secondary }}>
                Illumination
              </div>
              <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                {visibilityData.moonIllumination.toFixed(0)}%
              </div>
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
        </>
      )}
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

