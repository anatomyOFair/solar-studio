import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { CONSTELLATIONS } from '../../../data/constellations'

// RA (0–360°) → Leaflet longitude (-180 to +180)
const raToLon = (ra: number) => (ra > 180 ? ra - 360 : ra)

// Single-param createTile - critical for synchronous drawing (see memory.md)
const ConstellationGridLayer = L.GridLayer.extend({
  createTile(coords: L.Coords): HTMLCanvasElement {
    const tile = document.createElement('canvas')
    const size = this.getTileSize()
    tile.width = size.x
    tile.height = size.y

    const ctx = tile.getContext('2d')
    if (!ctx) return tile

    const map = this._map
    if (!map) return tile

    const zoom = coords.z
    const tileSize = size.x
    const nwPixel = L.point(coords.x * tileSize, coords.y * tileSize)

    // Buffer in pixels - skip lines far outside this tile
    const buffer = tileSize * 0.5

    ctx.strokeStyle = '#cc8a1e'
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'

    for (const constellation of CONSTELLATIONS) {
      for (const [star1, star2] of constellation.lines) {
        // RA → lon, adjusted so the line takes the short path across the antimeridian
        const lon1 = raToLon(star1.ra)
        let lon2 = raToLon(star2.ra)
        if (lon2 - lon1 > 180) lon2 -= 360
        else if (lon1 - lon2 > 180) lon2 += 360

        const p1 = map.project(L.latLng(star1.dec, lon1), zoom)
        const p2 = map.project(L.latLng(star2.dec, lon2), zoom)

        const x1 = p1.x - nwPixel.x
        const y1 = p1.y - nwPixel.y
        const x2 = p2.x - nwPixel.x
        const y2 = p2.y - nwPixel.y

        // Skip if both endpoints are far outside tile
        if (
          (x1 < -buffer && x2 < -buffer) ||
          (x1 > tileSize + buffer && x2 > tileSize + buffer) ||
          (y1 < -buffer && y2 < -buffer) ||
          (y1 > tileSize + buffer && y2 > tileSize + buffer)
        ) continue

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }

      // Draw constellation name at centroid
      if (constellation.lines.length > 0) {
        let sumLon = 0
        let sumDec = 0
        let count = 0
        const seen = new Set<string>()
        // Use first star's lon as reference to handle antimeridian wrapping
        const refLon = raToLon(constellation.lines[0][0].ra)
        for (const [s1, s2] of constellation.lines) {
          const k1 = `${s1.ra},${s1.dec}`
          const k2 = `${s2.ra},${s2.dec}`
          if (!seen.has(k1)) {
            let lon = raToLon(s1.ra)
            if (lon - refLon > 180) lon -= 360
            else if (refLon - lon > 180) lon += 360
            sumLon += lon; sumDec += s1.dec; count++; seen.add(k1)
          }
          if (!seen.has(k2)) {
            let lon = raToLon(s2.ra)
            if (lon - refLon > 180) lon -= 360
            else if (refLon - lon > 180) lon += 360
            sumLon += lon; sumDec += s2.dec; count++; seen.add(k2)
          }
        }
        let avgLon = sumLon / count
        if (avgLon > 180) avgLon -= 360
        else if (avgLon < -180) avgLon += 360
        const centroid = map.project(L.latLng(sumDec / count, avgLon), zoom)
        const cx = centroid.x - nwPixel.x
        const cy = centroid.y - nwPixel.y

        if (cx > -buffer && cx < tileSize + buffer && cy > -buffer && cy < tileSize + buffer) {
          ctx.font = '12px "Space Grotesk", sans-serif'
          ctx.fillStyle = '#000000'
          ctx.textAlign = 'center'
          ctx.fillText(constellation.name, cx, cy - 6)
        }
      }
    }

    return tile
  },
}) as unknown as { new (options?: L.GridLayerOptions): L.GridLayer }

export default function ConstellationLinesLayer() {
  const map = useMap()
  const layerRef = useRef<any>(null)

  useEffect(() => {
    if (!map) return

    let pane = map.getPane('constellationPane')
    if (!pane) {
      pane = map.createPane('constellationPane')
      pane.style.zIndex = '605'
      pane.style.pointerEvents = 'none'
      pane.style.cursor = 'default'
    }

    const layer = new ConstellationGridLayer({
      tileSize: 256,
      noWrap: true,
      pane: 'constellationPane',
      opacity: 1,
      updateWhenZooming: false,
      keepBuffer: 2,
    })

    layer.addTo(map)
    layerRef.current = layer

    return () => {
      map.removeLayer(layer)
      layerRef.current = null
    }
  }, [map])

  return null
}
