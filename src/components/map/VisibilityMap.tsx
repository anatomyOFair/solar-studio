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

function MapConfigurator() {
  const map = useMap()
  const isAdjusting = useRef(false)
  const resizeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentBounds = useRef<L.LatLngBounds | null>(null)

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

