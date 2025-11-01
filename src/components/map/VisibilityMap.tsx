import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect } from 'react'
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

// Component to configure map instance for reapeating
function MapConfigurator() {
  const map = useMap()

  useEffect(() => {
    map.options.worldCopyJump = false

    // Force refresh to apply settings
    map.invalidateSize()
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
    <div className={`w-full h-full ${className}`}>
      <MapContainer
        center={[0, 0]} // Center on equator, prime meridian
        zoom={2}
        minZoom={1}
        maxZoom={10}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
        boxZoom={false}
        keyboard={true}
        worldCopyJump={false}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={false}
          maxZoom={10}
          minZoom={1}
        />
        <MapConfigurator />
        <VisibilityOverlay />
      </MapContainer>
    </div>
  )
}

