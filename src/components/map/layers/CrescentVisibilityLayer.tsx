import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { calculateYallopQ, type YallopZone } from '../../../utils/yallopCriteria'

// Cache keyed by "lat,lon,dateDay" — zones only change day to day
const zoneCache = new Map<string, { zone: YallopZone; label: string }>()
const CACHE_MAX_SIZE = 5000

function getCacheKey(lat: number, lon: number, date: Date): string {
  const roundedLat = Math.round(lat * 10) / 10
  const roundedLon = Math.round(lon * 10) / 10
  const day = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  return `${roundedLat},${roundedLon},${day}`
}

const ZONE_COLORS: Record<YallopZone, string> = {
  A: '#22c55e',
  B: '#86efac',
  C: '#facc15',
  D: '#f97316',
  E: '#ef4444',
  F: '#6b7280',
}

const ZONE_OPACITY: Record<YallopZone, number> = {
  A: 0.35,
  B: 0.30,
  C: 0.30,
  D: 0.30,
  E: 0.25,
  F: 0.15,
}

const ZONE_LABELS: Record<YallopZone, string> = {
  A: 'Easily visible',
  B: 'Visible in perfect conditions',
  C: 'May need binoculars',
  D: 'Needs optical aid',
  E: 'Not visible with telescope',
  F: 'Not visible',
}

// --- L.GridLayer subclass ---

interface ICrescentGridLayer extends L.GridLayer {
  _date: Date
  setDate(date: Date): void
}

const CrescentGridLayer = L.GridLayer.extend({
  _date: new Date(),

  setDate(this: ICrescentGridLayer, date: Date) {
    this._date = date
  },

  createTile(this: ICrescentGridLayer & { _map: L.Map; getTileSize(): L.Point }, coords: L.Coords): HTMLCanvasElement {
    const tile = document.createElement('canvas')
    const size = this.getTileSize()
    tile.width = size.x
    tile.height = size.y

    const ctx = tile.getContext('2d')
    if (!ctx) return tile

    const map = this._map
    const zoom = coords.z
    const tileSize = size.x
    const date = this._date

    const nwPixel = L.point(coords.x * tileSize, coords.y * tileSize)
    const nw = map.unproject(nwPixel, zoom)
    const se = map.unproject(L.point((coords.x + 1) * tileSize, (coords.y + 1) * tileSize), zoom)

    // Coarser grid — ~5° cells, adapts slightly with zoom
    const baseSize = 5
    const cellSize = baseSize / Math.pow(2, Math.max(0, zoom - 4))

    const latStart = Math.floor(se.lat / cellSize) * cellSize
    const latEnd = Math.ceil(nw.lat / cellSize) * cellSize
    const lngStart = Math.floor(nw.lng / cellSize) * cellSize
    const lngEnd = Math.ceil(se.lng / cellSize) * cellSize

    for (let lat = latStart; lat < latEnd; lat += cellSize) {
      for (let lng = lngStart; lng < lngEnd; lng += cellSize) {
        const cellCenterLat = lat + cellSize / 2
        const cellCenterLng = lng + cellSize / 2

        if (cellCenterLat < -90 || cellCenterLat > 90) continue

        const cacheKey = getCacheKey(cellCenterLat, cellCenterLng, date)
        let result = zoneCache.get(cacheKey)

        if (!result) {
          const yallop = calculateYallopQ(cellCenterLat, cellCenterLng, date)
          result = { zone: yallop.zone, label: yallop.label }

          if (zoneCache.size >= CACHE_MAX_SIZE) {
            const firstKey = zoneCache.keys().next().value
            if (firstKey) zoneCache.delete(firstKey)
          }
          zoneCache.set(cacheKey, result)
        }

        const color = ZONE_COLORS[result.zone]
        const opacity = ZONE_OPACITY[result.zone]

        const cellNW = map.project(L.latLng(lat + cellSize, lng), zoom)
        const cellSE = map.project(L.latLng(lat, lng + cellSize), zoom)

        const x0 = cellNW.x - nwPixel.x
        const y0 = cellNW.y - nwPixel.y
        const x1 = cellSE.x - nwPixel.x
        const y1 = cellSE.y - nwPixel.y
        const w = x1 - x0
        const h = y1 - y0

        // Fill cell
        ctx.globalAlpha = opacity
        ctx.fillStyle = color
        ctx.fillRect(x0 - 0.5, y0 - 0.5, w + 1, h + 1)

        // Draw zone letter if cell is large enough
        if (w > 20 && h > 20) {
          ctx.globalAlpha = Math.min(0.7, opacity + 0.25)
          ctx.fillStyle = '#fff'
          ctx.font = `bold ${Math.min(14, Math.floor(Math.min(w, h) * 0.4))}px system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(result.zone, x0 + w / 2, y0 + h / 2)
        }
      }
    }

    ctx.globalAlpha = 1.0
    return tile
  },
}) as unknown as { new (options?: L.GridLayerOptions): ICrescentGridLayer }

// --- React component ---

export default function CrescentVisibilityLayer() {
  const map = useMap()
  const layerRef = useRef<ICrescentGridLayer | null>(null)

  useEffect(() => {
    if (!map) return

    let pane = map.getPane('crescentPane')
    if (!pane) {
      pane = map.createPane('crescentPane')
      pane.style.zIndex = '610'
      pane.style.pointerEvents = 'none'
      pane.style.cursor = 'default'
    }

    const gridLayer = new CrescentGridLayer({
      tileSize: 256,
      noWrap: true,
      pane: 'crescentPane',
      opacity: 1,
      updateWhenZooming: false,
      keepBuffer: 2,
    })

    zoneCache.clear()
    gridLayer.setDate(new Date())
    gridLayer.addTo(map)
    layerRef.current = gridLayer

    return () => {
      map.removeLayer(gridLayer)
      layerRef.current = null
    }
  }, [map])

  return null
}
