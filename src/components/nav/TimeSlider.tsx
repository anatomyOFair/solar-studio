import { useRef, useCallback, useState, useEffect } from 'react'
import { useStore } from '../../store/store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons'
import { colors, spacing, sizes } from '../../constants'

const FORECAST_HOURS = 5 * 24 // 5 days ahead
const SPEEDS = [1, 6, 24] // hours of sim time per second of real time
const SPEED_LABELS = ['1h/s', '6h/s', '24h/s']

export default function TimeSlider() {
  const simulatedTime = useStore((state) => state.simulatedTime)
  const setSimulatedTime = useStore((state) => state.setSimulatedTime)
  const nowRef = useRef(Date.now())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(0)
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  if (!simulatedTime) {
    nowRef.current = Date.now()
  }

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return

    const tick = (timestamp: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const deltaMs = timestamp - lastFrameRef.current
      lastFrameRef.current = timestamp

      const store = useStore.getState()
      const now = nowRef.current
      const current = store.simulatedTime?.getTime() ?? now
      const advanceMs = deltaMs * SPEEDS[speedIndex] * 3600_000 / 1000
      const next = current + advanceMs
      const maxTime = now + FORECAST_HOURS * 3600_000

      if (next >= maxTime) {
        store.setSimulatedTime(new Date(maxTime))
        setIsPlaying(false)
        return
      }

      store.setSimulatedTime(new Date(next))
      rafRef.current = requestAnimationFrame(tick)
    }

    lastFrameRef.current = 0
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      lastFrameRef.current = 0
    }
  }, [isPlaying, speedIndex])

  const handlePlayPause = useCallback(() => {
    if (!isPlaying) {
      // If at the start, nudge time forward so slider is active
      const store = useStore.getState()
      if (!store.simulatedTime) {
        store.setSimulatedTime(new Date(nowRef.current + 1000))
      }
    }
    setIsPlaying((prev) => !prev)
  }, [isPlaying])

  const handleSpeedCycle = useCallback(() => {
    setSpeedIndex((prev) => (prev + 1) % SPEEDS.length)
  }, [])

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hoursOffset = parseFloat(e.target.value)
      setIsPlaying(false)
      if (hoursOffset === 0) {
        setSimulatedTime(null)
      } else {
        setSimulatedTime(new Date(nowRef.current + hoursOffset * 3600_000))
      }
    },
    [setSimulatedTime]
  )

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setSimulatedTime(null)
  }, [setSimulatedTime])

  const currentOffset = simulatedTime
    ? (simulatedTime.getTime() - nowRef.current) / 3600_000
    : 0

  const isActive = currentOffset > 0

  return (
    <div
      className="fixed"
      style={{
        bottom: spacing.md,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '35%',
        minWidth: '320px',
        maxWidth: '560px',
        zIndex: sizes.zIndex.fixed,
        backgroundColor: colors.navbar.background,
        backdropFilter: `blur(${sizes.blur.default})`,
        WebkitBackdropFilter: `blur(${sizes.blur.default})`,
        border: `1px solid ${colors.navbar.border}`,
        borderRadius: sizes.borderRadius.xl,
        padding: `${spacing.xs} ${spacing.sm}`,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span
        onClick={handleReset}
        style={{
          fontSize: '11px',
          color: isActive ? colors.primary[400] : colors.text.muted,
          whiteSpace: 'nowrap',
          cursor: isActive ? 'pointer' : 'default',
          userSelect: 'none',
          fontWeight: 500,
        }}
      >
        Now
      </span>

      <button
        onClick={handlePlayPause}
        style={{
          background: 'none',
          border: 'none',
          color: isPlaying ? colors.primary[400] : colors.text.muted,
          cursor: 'pointer',
          padding: '2px 4px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
        }}
        title={isPlaying ? 'Pause' : 'Play time-lapse'}
      >
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
      </button>

      <span
        onClick={handleSpeedCycle}
        style={{
          fontSize: '10px',
          color: isPlaying ? colors.primary[400] : colors.text.muted,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          userSelect: 'none',
          fontWeight: 500,
          minWidth: '28px',
        }}
        title="Click to change speed"
      >
        {SPEED_LABELS[speedIndex]}
      </span>

      <input
        type="range"
        min={0}
        max={FORECAST_HOURS}
        step={1}
        value={currentOffset}
        onChange={handleSliderChange}
        style={{
          flex: 1,
          accentColor: colors.primary[500],
          cursor: 'pointer',
        }}
      />

      <span
        style={{
          fontSize: '11px',
          color: colors.text.muted,
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        +5d
      </span>
    </div>
  )
}
