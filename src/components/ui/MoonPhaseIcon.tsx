import { useEffect, useState } from 'react'
import SunCalc from 'suncalc'
import { useStore } from '../../store/store'
import { colors } from '../../constants'

function getPhaseName(phase: number, fraction: number): string {
  // fraction = illuminated portion (0-1), phase = cycle position (0-1)
  const pct = Math.round(fraction * 100)

  if (pct <= 2) return 'New Moon'
  if (pct >= 98) return 'Full Moon'

  // Waxing (phase 0-0.5) vs Waning (phase 0.5-1)
  const waxing = phase < 0.5

  if (pct < 25) return waxing ? 'Waxing Crescent' : 'Waning Crescent'
  if (pct < 40) return waxing ? 'Waxing Crescent' : 'Waning Crescent'
  if (pct <= 60) return waxing ? 'First Quarter' : 'Third Quarter'
  if (pct < 75) return waxing ? 'Waxing Gibbous' : 'Waning Gibbous'
  return waxing ? 'Waxing Gibbous' : 'Waning Gibbous'
}

/**
 * SVG moon phase using two overlapping semicircles.
 * phase: 0→1 cycle. fraction: 0→1 illuminated portion.
 */
function MoonPhaseSVG({ phase, fraction, size = 32 }: { phase: number; fraction: number; size?: number }) {
  const r = size / 2
  const cx = r
  const cy = r

  // Waxing: right side lit first. Waning: left side lit.
  const waxing = phase <= 0.5

  // Map fraction to terminator position:
  // fraction 0 = fully dark, 0.5 = half lit, 1 = fully lit
  // The terminator x-radius of an ellipse that splits the disc
  // When fraction=0.5, terminator is a straight line (rx=0)
  // When fraction>0.5, terminator curves toward the dark side (gibbous)
  // When fraction<0.5, terminator curves toward the lit side (crescent)
  const terminatorRx = Math.abs(fraction - 0.5) * 2 * r
  const curveRight = fraction > 0.5

  // Build illuminated region path:
  // Start at top of disc, arc along the lit outer edge to bottom,
  // then arc back along the terminator to top.
  const top = `${cx} ${cy - r}`
  const bottom = `${cx} ${cy + r}`

  // Outer arc: semicircle on the lit side
  // sweep=1 for CW (right side), sweep=0 for CCW (left side)
  const outerSweep = waxing ? 1 : 0

  // Inner arc: the terminator ellipse
  // If crescent (fraction<0.5): terminator curves same direction as outer (eating into lit side)
  // If gibbous (fraction>0.5): terminator curves opposite to outer (expanding lit side)
  let innerSweep: number
  if (waxing) {
    innerSweep = curveRight ? 1 : 0
  } else {
    innerSweep = curveRight ? 0 : 1
  }

  const path = [
    `M ${top}`,
    `A ${r} ${r} 0 0 ${outerSweep} ${bottom}`,
    `A ${terminatorRx} ${r} 0 0 ${innerSweep} ${top}`,
    'Z',
  ].join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="#1a1a2e" />
      <circle cx={cx} cy={cy} r={r - 0.5} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      {fraction > 0.01 && <path d={path} fill="#e8e8f0" />}
    </svg>
  )
}

export default function MoonPhaseIcon() {
  const simulatedTime = useStore((state) => state.simulatedTime)
  const [illumination, setIllumination] = useState(() => SunCalc.getMoonIllumination(new Date()))

  useEffect(() => {
    const effectiveTime = simulatedTime ?? new Date()
    setIllumination(SunCalc.getMoonIllumination(effectiveTime))

    if (simulatedTime) return // Don't auto-tick when simulating
    const interval = setInterval(() => {
      setIllumination(SunCalc.getMoonIllumination(new Date()))
    }, 60_000)
    return () => clearInterval(interval)
  }, [simulatedTime])

  const phaseName = getPhaseName(illumination.phase, illumination.fraction)
  const illuminationPct = Math.round(illumination.fraction * 100)

  return (
    <div style={{ marginTop: '6px' }}>
      <div className="flex items-center" style={{ gap: '10px' }}>
        <MoonPhaseSVG phase={illumination.phase} fraction={illumination.fraction} size={28} />
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: colors.text.primary }}>
            {phaseName}
          </div>
          <div style={{ fontSize: '11px', color: colors.text.muted }}>
            {illuminationPct}% illuminated
          </div>
        </div>
      </div>
    </div>
  )
}
