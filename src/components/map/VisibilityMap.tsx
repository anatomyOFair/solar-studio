import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useStore } from '../../store/store'
import VisibilityTooltip from './VisibilityTooltip'
import HexGridLayer from './layers/HexGridLayer'
import CrescentVisibilityLayer from './layers/CrescentVisibilityLayer'
import VectorLayer from './layers/VectorLayer'
import ConstellationLinesLayer from './layers/ConstellationLinesLayer'

// Inject pulse keyframes + cursor overrides once
const PULSE_STYLE_ID = 'user-loc-pulse'
if (typeof document !== 'undefined' && !document.getElementById(PULSE_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = PULSE_STYLE_ID
  style.textContent = `
    @keyframes loc-pulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2.8); opacity: 0; }
    }
    .leaflet-container { cursor: crosshair !important; }
    .leaflet-dragging .leaflet-container { cursor: grabbing !important; }
  `
  document.head.appendChild(style)
}

function UserLocationMarker() {
  const map = useMap()
  const userLocation = useStore((state) => state.userLocation)
  const markerRef = useRef<L.Marker | null>(null)
  const lastLocKey = useRef<string | null>(null)

  useEffect(() => {
    if (!userLocation) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
        lastLocKey.current = null
      }
      return
    }

    const locKey = `${userLocation.lat},${userLocation.lon}`
    const pinColor = '#3b82f6'
    const icon = L.divIcon({
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
      html: `
        <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:20px;height:20px;border-radius:50%;background:${pinColor};opacity:0.5;animation:loc-pulse 2s ease-out infinite;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:${pinColor};border:2.5px solid white;box-shadow:0 0 8px rgba(0,0,0,0.5);position:relative;z-index:1;"></div>
        </div>
      `,
    })

    if (markerRef.current) {
      markerRef.current.setLatLng([userLocation.lat, userLocation.lon])
      markerRef.current.setIcon(icon)
    } else {
      markerRef.current = L.marker([userLocation.lat, userLocation.lon], { icon, zIndexOffset: 1000 })
        .addTo(map)
    }

    markerRef.current.bindPopup(userLocation.label, {
      className: 'user-loc-popup',
      closeButton: false,
      offset: [0, -2],
    })

    // Fly to location only when it changes
    if (locKey !== lastLocKey.current) {
      lastLocKey.current = locKey
      map.flyTo([userLocation.lat, userLocation.lon], 8, { duration: 1.5 })
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
    }
  }, [userLocation, map])

  return null
}

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

interface VisibilityMapProps {
  className?: string
}

export default function VisibilityMap({ className = '' }: VisibilityMapProps) {
  const visualizationMode = useStore((state) => state.visualizationMode)
  const showCrescentZones = useStore((state) => state.showCrescentZones)
  const showConstellationLines = useStore((state) => state.showConstellationLines)

  return (
    <div className={`w-full h-full ${className}`} data-hint="map" style={{ margin: 0, padding: 0, zIndex: 0, position: 'relative' }}>
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
        <UserLocationMarker />
        <VectorLayer />
        {showConstellationLines && <ConstellationLinesLayer />}

        {visualizationMode === 'hex' && !showCrescentZones && <HexGridLayer />}
        {showCrescentZones && <CrescentVisibilityLayer />}

        <VisibilityTooltip />
      </MapContainer>
    </div>
  )
}
