import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

// Component to configure map instance - no repeat repeating
function MapConfigurator() {
  const map = useMap()
  const isAdjusting = useRef(false)
  const resizeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentBounds = useRef<L.LatLngBounds | null>(null)

  // Check if current zoom level would make width not fit
  const wouldWidthNotFit = (zoom: number) => {
    const containerWidth = map.getContainer().offsetWidth
    // Calculate degrees shown at this zoom level
    const degreesShown = (containerWidth * 360) / (256 * Math.pow(2, zoom))
    // Width doesn't fit if degrees shown > 360
    return degreesShown > 360
  }

  // Calculate the minimum zoom level where width fits
  const calculateMinZoomThatFits = () => {
    const containerWidth = map.getContainer().offsetWidth
    
    if (containerWidth <= 256) {
      return 2 // Base min zoom
    }
    
    // Calculate exact zoom where width fits
    const exactMinZoom = Math.log2(containerWidth / 256)
    
    // Test integer zoom levels to find the minimum that fits
    // Start from floor and work up
    const floorZoom = Math.max(2, Math.floor(exactMinZoom))
    
    // Check if floor zoom fits
    if (!wouldWidthNotFit(floorZoom)) {
      return floorZoom
    }
    
    // Floor doesn't fit, so minimum is floor + 1
    return floorZoom + 1
  }

  // Calculate and set maxBounds only when absolutely necessary
  // Only constrains when zoomed out enough that panning could show empty space
  const updateMaxBounds = () => {
    if (isAdjusting.current) return

    const zoom = map.getZoom()
    const containerWidth = map.getContainer().offsetWidth
    const containerHeight = map.getContainer().offsetHeight

    // Calculate visible spans at current zoom level
    const lonSpan = (containerWidth * 360) / (256 * Math.pow(2, zoom))
    const latSpan = (containerHeight * 180) / (256 * Math.pow(2, zoom))

    // Full tile range available: -85 to 85 lat, -180 to 180 lng
    const southBound = -85
    const northBound = 85
    const westBound = -180
    const eastBound = 180
    
    // Thresholds: only constrain when visible span is very large
    // This allows full panning range at normal zoom levels
    const LON_THRESHOLD = 300  // Only constrain when lonSpan > 300 degrees
    const LAT_THRESHOLD = 160   // Only constrain when latSpan > 160 degrees
    
    let adjustedSouthBound = southBound
    let adjustedNorthBound = northBound
    let adjustedWestBound = westBound
    let adjustedEastBound = eastBound
    
    // Only constrain when absolutely necessary - when zoomed out very far
    if (lonSpan > LON_THRESHOLD) {
      adjustedWestBound = Math.max(-180, -180 + lonSpan / 2)
      adjustedEastBound = Math.min(180, 180 - lonSpan / 2)
    }
    
    if (latSpan > LAT_THRESHOLD) {
      adjustedSouthBound = Math.max(-85, -85 + latSpan / 2)
      adjustedNorthBound = Math.min(85, 85 - latSpan / 2)
    }
    
    const bounds = L.latLngBounds(
      [adjustedSouthBound, adjustedWestBound],
      [adjustedNorthBound, adjustedEastBound]
    )
    
    // Only update if bounds have changed
    if (currentBounds.current === null || !currentBounds.current.equals(bounds)) {
      currentBounds.current = bounds
      map.setMaxBounds(bounds)
    }
  }

  useEffect(() => {
    // Wait for map to be ready
    setTimeout(() => {
      map.invalidateSize()
      // Don't set a restrictive minZoom - let user zoom out freely
      // We'll only correct if width doesn't fit
      map.setMinZoom(2)
      // Initialize maxBounds (will use full range at normal zoom)
      updateMaxBounds()
    }, 100)

    // Debounce resize handler to prevent rapid updates
    const handleResize = () => {
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current)
      }
      
      resizeTimeout.current = setTimeout(() => {
        map.invalidateSize()
        
        // Check if current zoom makes width not fit
        const currentZoom = map.getZoom()
        if (wouldWidthNotFit(currentZoom)) {
          // Find minimum zoom that fits and adjust
          const minZoomThatFits = calculateMinZoomThatFits()
          map.setZoom(minZoomThatFits)
        }
        
        // Update maxBounds after resize (only constrains if very zoomed out)
        updateMaxBounds()
        resizeTimeout.current = null
      }, 150) // 150ms debounce
    }

    window.addEventListener('resize', handleResize)

    // Handle zoom - only correct if width doesn't fit
    const handleZoom = () => {
      if (isAdjusting.current) return
      
      const currentZoom = map.getZoom()
      
      // Only correct if width doesn't fit - allow zooming out as much as possible
      if (wouldWidthNotFit(currentZoom)) {
        // Find the minimum zoom where width fits
        const minZoomThatFits = calculateMinZoomThatFits()
        isAdjusting.current = true
        map.setZoom(minZoomThatFits)
        isAdjusting.current = false
      }
      
      // Update maxBounds after zoom (only constrains if very zoomed out)
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

// Component placeholder for future canvas overlay
function VisibilityOverlay() {
  const map = useMap()

  useEffect(() => {
    console.log('Map ready for visibility overlay', map)
  }, [map])

  return null
}

interface VisibilityMapProps {
  className?: string
}

export default function VisibilityMap({ className = '' }: VisibilityMapProps) {
  return (
    <div className={`w-full h-full ${className}`} style={{ margin: 0, padding: 0 }}>
      <MapContainer
        center={[0, 0]} // Center on equator, prime meridian
        zoom={4}
        minZoom={2}
        maxZoom={10}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
        boxZoom={false}
        keyboard={true}
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
      </MapContainer>
    </div>
  )
}

