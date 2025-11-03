import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useRef, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { useStore } from '../../store/store'
import { calculateVisibilityScore } from '../../utils/visibilityCalculator'
import { getWeatherConditions } from '../../utils/weatherService'
import { colors } from '../../constants'
import type { Position } from '../../types'
import VisibilityTooltip from './VisibilityTooltip'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

function MapConfigurator() {
  const map = useMap()
  const setMap = useStore((state) => state.setMap)
  const isAdjusting = useRef(false)
  const resizeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentBounds = useRef<L.LatLngBounds | null>(null)

  useEffect(() => {
    setMap(map)
    return () => setMap(null)
  }, [map, setMap])

  const wouldWidthNotFit = (zoom: number) => {
    const containerWidth = map.getContainer().offsetWidth
    const degreesShown = (containerWidth * 360) / (256 * Math.pow(2, zoom))
    return degreesShown > 360
  }

  const calculateMinZoomThatFits = () => {
    const containerWidth = map.getContainer().offsetWidth
    
    if (containerWidth <= 256) {
      return 2
    }
    
    const exactMinZoom = Math.log2(containerWidth / 256)
    const floorZoom = Math.max(2, Math.floor(exactMinZoom))
    
    if (!wouldWidthNotFit(floorZoom)) {
      return floorZoom
    }
    
    return floorZoom + 1
  }

  const updateMaxBounds = () => {
    if (isAdjusting.current) return

    const zoom = map.getZoom()
    const containerWidth = map.getContainer().offsetWidth
    const containerHeight = map.getContainer().offsetHeight
    const lonSpan = (containerWidth * 360) / (256 * Math.pow(2, zoom))
    const latSpan = (containerHeight * 180) / (256 * Math.pow(2, zoom))

    const LON_THRESHOLD = 300
    const LAT_THRESHOLD = 160
    
    const southBound = latSpan > LAT_THRESHOLD ? Math.max(-85, -85 + latSpan / 2) : -85
    const northBound = latSpan > LAT_THRESHOLD ? Math.min(85, 85 - latSpan / 2) : 85
    const westBound = lonSpan > LON_THRESHOLD ? Math.max(-180, -180 + lonSpan / 2) : -180
    const eastBound = lonSpan > LON_THRESHOLD ? Math.min(180, 180 - lonSpan / 2) : 180
    
    const bounds = L.latLngBounds(
      [southBound, westBound],
      [northBound, eastBound]
    )
    
    if (currentBounds.current === null || !currentBounds.current.equals(bounds)) {
      currentBounds.current = bounds
      map.setMaxBounds(bounds)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
      map.setMinZoom(2)
      updateMaxBounds()
    }, 100)

    const handleResize = () => {
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current)
      }
      
      resizeTimeout.current = setTimeout(() => {
        map.invalidateSize()
        
        const currentZoom = map.getZoom()
        if (wouldWidthNotFit(currentZoom)) {
          map.setZoom(calculateMinZoomThatFits())
        }
        
        updateMaxBounds()
        resizeTimeout.current = null
      }, 150)
    }

    window.addEventListener('resize', handleResize)

    const handleZoom = () => {
      if (isAdjusting.current) return
      
      const currentZoom = map.getZoom()
      if (wouldWidthNotFit(currentZoom)) {
        isAdjusting.current = true
        map.setZoom(calculateMinZoomThatFits())
        isAdjusting.current = false
      }
      
      updateMaxBounds()
    }

    map.on('zoomend', handleZoom)

    return () => {
      window.removeEventListener('resize', handleResize)
      map.off('zoomend', handleZoom)
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current)
      }
    }
  }, [map])

  return null
}

// Component for visibility overlay
function VisibilityOverlay() {
  const map = useMap()
  const selectedObject = useStore((state) => state.selectedObject)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayDivRef = useRef<HTMLDivElement | null>(null)

  const getColorForVisibility = useCallback((visibility: number): string => {
    if (visibility === 0) return colors.visibility.poor

    // Interpolate between red (0%), orange (30%), yellow (60%), green (100%)
    if (visibility <= 0.3) {
      // Red to Orange
      const ratio = visibility / 0.3
      return interpolateColor(colors.visibility.poor, colors.visibility.moderate, ratio)
    } else if (visibility <= 0.7) {
      // Orange to moderate Yellow
      const ratio = (visibility - 0.3) / 0.4
      return interpolateColor(colors.visibility.moderate, '#eab308', ratio)
    } else {
      // Yellow to Green
      const ratio = (visibility - 0.7) / 0.3
      return interpolateColor('#eab308', colors.visibility.good, ratio)
    }
  }, [])

  const renderOverlay = useCallback(
    async (bounds: L.LatLngBounds, zoom: number) => {
      if (!selectedObject || !canvasRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Calculate grid resolution based on zoom
      const gridSize = Math.max(8, Math.min(32, Math.floor(512 / Math.pow(2, zoom))))

      // Calculate step size for grid
      const latStep = (bounds.getNorth() - bounds.getSouth()) / gridSize
      const lonStep = (bounds.getEast() - bounds.getWest()) / gridSize

      const pixelWidth = width / gridSize
      const pixelHeight = height / gridSize

      const currentTime = new Date()
      const targetPos: Position = {
        lat: selectedObject.position.lat,
        lon: selectedObject.position.lon,
        altitude: selectedObject.position.altitude,
      }

      // Render grid
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const lat = bounds.getSouth() + i * latStep
          const lon = bounds.getWest() + j * lonStep

          // Get weather for this location
          const weather = await getWeatherConditions(lat, lon)
          const observerPos: Position = { lat, lon, altitude: 0 } // Sea level

          // Calculate visibility
          const visibility = calculateVisibilityScore(observerPos, targetPos, weather, currentTime)

          // Draw pixel
          ctx.fillStyle = getColorForVisibility(visibility)
          ctx.globalAlpha = 0.5 // Make overlay semi-transparent
          ctx.fillRect(j * pixelWidth, i * pixelHeight, pixelWidth, pixelHeight)
          ctx.globalAlpha = 1.0
        }
      }
    },
    [selectedObject, getColorForVisibility]
  )

  useEffect(() => {
    if (!map) return

    // Create canvas and container
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '100%'
    container.style.height = '100%'
    container.style.pointerEvents = 'none'
    container.style.zIndex = '650'

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvasRef.current = canvas
    overlayDivRef.current = container
    container.appendChild(canvas)

    const mapPane = map.getPane('mapPane')
    if (mapPane) {
      mapPane.appendChild(container)
    }

    const handleMoveEnd = () => {
      const size = map.getSize()
      canvas.width = size.x
      canvas.height = size.y
      const bounds = map.getBounds()
      const zoom = map.getZoom()
      renderOverlay(bounds, zoom).catch((error) => {
        console.error('Error rendering visibility overlay:', error)
      })
    }

    // Initial render
    handleMoveEnd()

    map.on('moveend', handleMoveEnd)
    map.on('zoomend', handleMoveEnd)

    return () => {
      map.off('moveend', handleMoveEnd)
      map.off('zoomend', handleMoveEnd)
      if (container && mapPane) {
        mapPane.removeChild(container)
      }
    }
  }, [map, renderOverlay])

  // Re-render when selected object changes
  useEffect(() => {
    if (map && canvasRef.current) {
      const size = map.getSize()
      canvasRef.current.width = size.x
      canvasRef.current.height = size.y
      const bounds = map.getBounds()
      const zoom = map.getZoom()
      renderOverlay(bounds, zoom).catch((error) => {
        console.error('Error rendering visibility overlay:', error)
      })
    }
  }, [map, selectedObject, renderOverlay])

  return null
}

// Helper function to interpolate between two colors
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  if (!c1 || !c2) return color1

  const r = Math.round(c1.r + (c2.r - c1.r) * ratio)
  const g = Math.round(c1.g + (c2.g - c1.g) * ratio)
  const b = Math.round(c1.b + (c2.b - c1.b) * ratio)

  return `rgb(${r}, ${g}, ${b})`
}

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

interface VisibilityMapProps {
  className?: string
}

export default function VisibilityMap({ className = '' }: VisibilityMapProps) {
  return (
    <div className={`w-full h-full ${className}`} style={{ margin: 0, padding: 0 }}>
      <MapContainer
        center={[0, 0]}
        zoom={4}
        minZoom={2}
        maxZoom={10}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
        boxZoom={false}
        keyboard={true}
        zoomControl={false}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
          maxZoom={10}
          minZoom={2}
        />
        <MapConfigurator />
        <VisibilityOverlay />
        <VisibilityTooltip />
      </MapContainer>
    </div>
  )
}

