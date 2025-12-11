import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { useStore } from '../../store/store'
import { calculateVisibilityScore } from '../../utils/visibilityCalculator'
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

// Component placeholder for future canvas overlay
function VisibilityOverlay() {
  const map = useMap()
  const selectedObject = useStore((s) => s.selectedObject)

  const layerRef = useRef<L.GridLayer | null>(null)

  // Time bucket (5 minutes) to refresh tiles periodically
  const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000))

  useEffect(() => {
    if (!map) return

    // Remove any previous layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }

    if (!selectedObject) return

    // Create GridLayer with custom createTile
    const HeatmapLayer = (L.GridLayer as any).extend({
      createTile: function (this: L.GridLayer, coords: L.Coords) {
        const tile = L.DomUtil.create('canvas', 'leaflet-tile') as HTMLCanvasElement
        const sizePt = this.getTileSize() as L.Point
        const width = sizePt.x
        const height = sizePt.y
        const dpr = (window as any).devicePixelRatio || 1
        tile.width = Math.round(width * dpr)
        tile.height = Math.round(height * dpr)
        tile.style.width = `${width}px`
        tile.style.height = `${height}px`
        tile.style.imageRendering = 'pixelated'
        const ctx = tile.getContext('2d') as CanvasRenderingContext2D
        ctx.imageSmoothingEnabled = false
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        // Early return transparent tile if missing object
        if (!selectedObject) {
          ctx.clearRect(0, 0, width, height)
          return tile
        }

        // Compute lat/lon bounds for the tile
        const nwPoint = L.point(coords.x * width, coords.y * height)
        const sePoint = L.point((coords.x + 1) * width, (coords.y + 1) * height)
        const nw = (map as any).unproject(nwPoint, coords.z) as L.LatLng
        const se = (map as any).unproject(sePoint, coords.z) as L.LatLng

        // Sampling density with simple LOD
        const z = coords.z
        const samples = z <= 3 ? 64 : z >= 7 ? 128 : 96
        const dx = (se.lng - nw.lng) / samples
        const dy = (se.lat - nw.lat) / samples

        // Lightweight per-tile weather cache and generator (mirrors weatherService logic)
        const weatherCache = new Map<string, { cloudCover: number; precipitation: number; fog: number }>()
        const getWeather = (lat: number, lon: number) => {
          const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
          const hit = weatherCache.get(key)
          if (hit) return hit
          const seed = Math.floor(lat * 1000) + Math.floor(lon * 1000)
          let value = seed
          const rnd = () => {
            value = (value * 9301 + 49297) % 233280
            return value / 233280
          }
          const isTropical = Math.abs(lat) < 23.5
          const isDesert = Math.abs(lat) > 15 && Math.abs(lat) < 35 && Math.abs(lon) > 0 && Math.abs(lon) < 60
          let cloudCover = rnd() * 0.8
          let precipitation = rnd() * 10
          let fog = rnd() * 0.3
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
          const w = { cloudCover, precipitation, fog }
          weatherCache.set(key, w)
          return w
        }

        // Precompute red -> green gradient (no yellow); alpha set per-cell later
        const ramp = new Uint8ClampedArray(256 * 4)
        for (let i = 0; i < 256; i++) {
          const t = i / 255
          const r = Math.round(255 * (1 - t))
          const g = Math.round(255 * t)
          const b = 0
          const o = i * 4
          ramp[o] = r
          ramp[o + 1] = g
          ramp[o + 2] = b
          ramp[o + 3] = 255
        }

        // Paint coarse samples into the canvas by scaling blocks
        const target = selectedObject.position
        const now = new Date()

        for (let iy = 0; iy < samples; iy++) {
          for (let ix = 0; ix < samples; ix++) {
            const lat = nw.lat + dy * (iy + 0.5)
            const lon = nw.lng + dx * (ix + 0.5)
            const localWeather = getWeather(lat, lon) as any
            const score = calculateVisibilityScore(
              { lat, lon, altitude: 0 },
              { lat: target.lat, lon: target.lon, altitude: target.altitude },
              localWeather,
              now
            )
            // Gamma boost to make higher visibility more pronounced (more greens)
            const boosted = Math.pow(Math.max(0, Math.min(1, score)), 0.5)
            const idx = Math.max(0, Math.min(255, Math.round(boosted * 255))) * 4
            const r = ramp[idx]
            const g = ramp[idx + 1]
            const b = ramp[idx + 2]
            const a = Math.round(ramp[idx + 3] * Math.max(0.4, boosted))

            const x0 = Math.round((ix / samples) * width)
            const y0 = Math.round((iy / samples) * height)
            const x1 = Math.round(((ix + 1) / samples) * width)
            const y1 = Math.round(((iy + 1) / samples) * height)
            const w = Math.max(1, x1 - x0)
            const h = Math.max(1, y1 - y0)

            ctx.fillStyle = `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`
            ctx.fillRect(x0, y0, w, h)
          }
        }
        return tile
      },
    })

    const layer: L.GridLayer = new HeatmapLayer({ opacity: 0.6 })
    layer.addTo(map)
    layerRef.current = layer

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map, selectedObject, timeBucket])

  return null
}

interface VisibilityMapProps {
  className?: string
}

export default function VisibilityMap({ className = '' }: VisibilityMapProps) {
  return (
    <div className={`w-full h-full ${className}`} style={{ margin: 0, padding: 0, zIndex: 0, position: 'relative' }}>
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
        {/* <VisibilityOverlay /> */}
        <VisibilityTooltip />
      </MapContainer>
    </div>
  )
}


