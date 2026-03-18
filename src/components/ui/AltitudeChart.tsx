import { useMemo, useState } from 'react'
import { useStore } from '../../store/store'
import { getCurrentAltitude, getNightWindow } from '../../utils/tonightSky'
import { colors } from '../../constants'

const PAD = { top: 12, right: 16, bottom: 24, left: 36 }
const STEP_MS = 10 * 60 * 1000 // 10-minute intervals

function formatTimeShort(date: Date, isLocalTime: boolean): string {
  if (isLocalTime) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
}

interface AltitudeChartProps {
  location: { lat: number; lon: number }
  objectId: string
}

export default function AltitudeChart({ location, objectId }: AltitudeChartProps) {
  const objects = useStore((state) => state.objects)
  const simulatedTime = useStore((state) => state.simulatedTime)
  const isLocalTime = useStore((state) => state.isLocalTime)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const chartObject = objects.find((o) => o.id === objectId) ?? null
  const effectiveTime = simulatedTime ?? new Date()

  const { points, minAlt, maxAlt } = useMemo(() => {
    if (!chartObject) return { points: [], nightWindow: null, minAlt: -20, maxAlt: 90 }

    const nw = getNightWindow(location.lat, location.lon, effectiveTime)
    if (!nw.isValidNight && !nw.isPolarNight) return { points: [], nightWindow: nw, minAlt: -20, maxAlt: 90 }

    const startMs = nw.isPolarNight
      ? new Date(effectiveTime).setHours(12, 0, 0, 0) // noon today
      : nw.sunset!.getTime()
    const endMs = nw.isPolarNight
      ? startMs + 24 * 60 * 60 * 1000 // 24 hours
      : nw.sunrise!.getTime()

    const pts: { time: Date; alt: number }[] = []
    for (let t = startMs; t <= endMs; t += STEP_MS) {
      const time = new Date(t)
      pts.push({ time, alt: getCurrentAltitude(chartObject, location.lat, location.lon, time) })
    }

    let lo = 0
    let hi = 0
    for (const p of pts) {
      if (p.alt < lo) lo = p.alt
      if (p.alt > hi) hi = p.alt
    }
    // Clamp range: at least -10 to +30, expand to fit data with padding
    const minA = Math.min(-10, Math.floor(lo / 10) * 10)
    const maxA = Math.max(30, Math.ceil(hi / 10) * 10 + 5)

    return { points: pts, nightWindow: nw, minAlt: minA, maxAlt: maxA }
  }, [chartObject, location.lat, location.lon, effectiveTime])

  if (!chartObject || points.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.text.muted,
          fontSize: '12px',
        }}
      >
        {!chartObject ? 'Select an object' : 'No night window available'}
      </div>
    )
  }

  // SVG dimensions (use viewBox for responsiveness)
  const W = 400
  const H = 200
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const startMs = points[0].time.getTime()
  const endMs = points[points.length - 1].time.getTime()
  const timeSpan = endMs - startMs

  const toX = (t: number) => PAD.left + ((t - startMs) / timeSpan) * chartW
  const toY = (alt: number) => PAD.top + ((maxAlt - alt) / (maxAlt - minAlt)) * chartH

  // Build path
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.time.getTime()).toFixed(1)},${toY(p.alt).toFixed(1)}`)
    .join(' ')

  // Area fill under curve (clipped to above horizon)
  const horizonY = toY(0)
  const areaD =
    pathD +
    ` L${toX(endMs).toFixed(1)},${horizonY.toFixed(1)}` +
    ` L${toX(startMs).toFixed(1)},${horizonY.toFixed(1)} Z`

  // "Now" marker
  const nowMs = effectiveTime.getTime()
  const nowInRange = nowMs >= startMs && nowMs <= endMs
  const nowX = nowInRange ? toX(nowMs) : null

  // Y-axis grid lines
  const yTicks: number[] = []
  for (let d = Math.ceil(minAlt / 30) * 30; d <= maxAlt; d += 30) {
    yTicks.push(d)
  }
  // Always include 0°
  if (!yTicks.includes(0)) yTicks.push(0)
  yTicks.sort((a, b) => a - b)

  // X-axis labels: start, midpoint, end
  const xLabels = [
    { t: startMs, label: formatTimeShort(points[0].time, isLocalTime) },
    { t: (startMs + endMs) / 2, label: formatTimeShort(new Date((startMs + endMs) / 2), isLocalTime) },
    { t: endMs, label: formatTimeShort(points[points.length - 1].time, isLocalTime) },
  ]

  // Hover logic
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    const mouseTime = startMs + ((mouseX - PAD.left) / chartW) * timeSpan
    // Find nearest point
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].time.getTime() - mouseTime)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    }
    setHoverIdx(best)
  }

  const hoverPoint = hoverIdx != null ? points[hoverIdx] : null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="xMidYMid meet"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* Below-horizon background */}
      <rect
        x={PAD.left}
        y={horizonY}
        width={chartW}
        height={PAD.top + chartH - horizonY}
        fill="rgba(239, 68, 68, 0.04)"
      />

      {/* Y-axis grid lines + labels */}
      {yTicks.map((d) => {
        const y = toY(d)
        const isHorizon = d === 0
        return (
          <g key={d}>
            <line
              x1={PAD.left}
              y1={y}
              x2={PAD.left + chartW}
              y2={y}
              stroke={isHorizon ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}
              strokeWidth={isHorizon ? 1 : 0.5}
              strokeDasharray={isHorizon ? '4 3' : undefined}
            />
            <text
              x={PAD.left - 4}
              y={y + 3}
              textAnchor="end"
              fill={colors.text.muted}
              fontSize="9"
              fontFamily="inherit"
            >
              {d}°
            </text>
          </g>
        )
      })}

      {/* Area fill above horizon */}
      <defs>
        <clipPath id="above-horizon">
          <rect x={PAD.left} y={PAD.top} width={chartW} height={horizonY - PAD.top} />
        </clipPath>
      </defs>
      <path d={areaD} fill="rgba(56, 189, 248, 0.08)" clipPath="url(#above-horizon)" />

      {/* Altitude curve */}
      <path d={pathD} fill="none" stroke={colors.accent} strokeWidth="1.5" strokeLinejoin="round" />

      {/* "Now" marker */}
      {nowX != null && (
        <line
          x1={nowX}
          y1={PAD.top}
          x2={nowX}
          y2={PAD.top + chartH}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}

      {/* X-axis labels */}
      {xLabels.map((xl, i) => (
        <text
          key={i}
          x={toX(xl.t)}
          y={H - 4}
          textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
          fill={colors.text.muted}
          fontSize="9"
          fontFamily="inherit"
        >
          {xl.label}
        </text>
      ))}

      {/* Hover crosshair + tooltip */}
      {hoverPoint && hoverIdx != null && (
        <>
          <line
            x1={toX(hoverPoint.time.getTime())}
            y1={PAD.top}
            x2={toX(hoverPoint.time.getTime())}
            y2={PAD.top + chartH}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.5"
          />
          <circle
            cx={toX(hoverPoint.time.getTime())}
            cy={toY(hoverPoint.alt)}
            r="3"
            fill={colors.accent}
            stroke={colors.accent}
            strokeWidth="1"
          />
          {/* Tooltip background + text */}
          {(() => {
            const tx = toX(hoverPoint.time.getTime())
            const ty = toY(hoverPoint.alt)
            const label = `${formatTimeShort(hoverPoint.time, isLocalTime)}  ${hoverPoint.alt.toFixed(1)}°`
            const boxW = label.length * 5.5 + 12
            const boxH = 18
            // Flip tooltip if near right edge
            const flipX = tx + boxW + 8 > W
            const bx = flipX ? tx - boxW - 8 : tx + 8
            const by = Math.max(PAD.top, Math.min(ty - boxH / 2, H - PAD.bottom - boxH))
            return (
              <g>
                <rect
                  x={bx}
                  y={by}
                  width={boxW}
                  height={boxH}
                  rx="4"
                  fill={colors.navbar.base}
                  stroke={colors.navbar.border}
                  strokeWidth="0.5"
                />
                <text
                  x={bx + 6}
                  y={by + 12.5}
                  fill={colors.text.primary}
                  fontSize="9"
                  fontFamily="inherit"
                >
                  {label}
                </text>
              </g>
            )
          })()}
        </>
      )}

      {/* Object name label */}
      <text
        x={PAD.left + 4}
        y={PAD.top + 10}
        fill={colors.accent}
        fontSize="10"
        fontWeight="500"
        fontFamily="inherit"
      >
        {chartObject.name}
      </text>
    </svg>
  )
}
