import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { useStore } from '../../store/store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons'
import { colors, spacing, sizes } from '../../constants'

const FORECAST_HOURS = 5 * 24 // 5 days ahead
const SPEEDS = [1, 6, 24] // hours of sim time per second of real time
const SPEED_LABELS = ['1h/s', '6h/s', '24h/s']

const MISSION_SPEEDS = [30 * 24, 365 * 24, 365 * 24 * 5] // 1 month/s, 1 year/s, 5 years/s
const MISSION_SPEED_LABELS = ['1mo/s', '1yr/s', '5yr/s']

export default function TimeSlider() {
  const simulatedTime = useStore((state) => state.simulatedTime)
  const setSimulatedTime = useStore((state) => state.setSimulatedTime)
  const missionTime = useStore((state) => state.missionTime)
  const setMissionTime = useStore((state) => state.setMissionTime)
  const activeMission = useStore((state) => state.activeMission)
  const nowRef = useRef(Date.now())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(0)
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  // Mission epoch range
  const missionRange = useMemo(() => {
    if (!activeMission || activeMission.waypoints.length < 2) return null
    const epochs = activeMission.waypoints.map((w) => new Date(w.epoch).getTime())
    return { start: Math.min(...epochs), end: Math.max(...epochs) }
  }, [activeMission])

  const isMissionMode = !!missionRange

  // Reset speed index when switching modes
  useEffect(() => {
    setSpeedIndex(0)
    setIsPlaying(false)
  }, [isMissionMode])

  // Jump to mission start when mission is activated
  useEffect(() => {
    if (missionRange) {
      setMissionTime(new Date(missionRange.start))
    }
  }, [missionRange, setMissionTime])

  if (!simulatedTime && !isMissionMode) {
    nowRef.current = Date.now()
  }

  const speeds = isMissionMode ? MISSION_SPEEDS : SPEEDS
  const speedLabels = isMissionMode ? MISSION_SPEED_LABELS : SPEED_LABELS

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
      const advanceMs = deltaMs * speeds[speedIndex] * 3600_000 / 1000

      if (missionRange) {
        const current = store.missionTime?.getTime() ?? missionRange.start
        const next = current + advanceMs
        if (next >= missionRange.end) {
          store.setMissionTime(new Date(missionRange.end))
          setIsPlaying(false)
          return
        }
        store.setMissionTime(new Date(next))
      } else {
        const current = store.simulatedTime?.getTime() ?? nowRef.current
        const next = current + advanceMs
        const maxTime = nowRef.current + FORECAST_HOURS * 3600_000
        if (next >= maxTime) {
          store.setSimulatedTime(new Date(maxTime))
          setIsPlaying(false)
          return
        }
        store.setSimulatedTime(new Date(next))
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    lastFrameRef.current = 0
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      lastFrameRef.current = 0
    }
  }, [isPlaying, speedIndex, speeds, missionRange])

  const handlePlayPause = useCallback(() => {
    if (!isPlaying) {
      const store = useStore.getState()
      if (missionRange) {
        if (store.missionTime && store.missionTime.getTime() >= missionRange.end) {
          store.setMissionTime(new Date(missionRange.start))
        } else if (!store.missionTime) {
          store.setMissionTime(new Date(missionRange.start))
        }
      } else {
        if (!store.simulatedTime) {
          store.setSimulatedTime(new Date(nowRef.current + 1000))
        }
      }
    }
    setIsPlaying((prev) => !prev)
  }, [isPlaying, missionRange])

  const handleSpeedCycle = useCallback(() => {
    setSpeedIndex((prev) => (prev + 1) % speeds.length)
  }, [speeds.length])

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value)
      setIsPlaying(false)
      if (missionRange) {
        const t = value / 1000
        const time = missionRange.start + t * (missionRange.end - missionRange.start)
        setMissionTime(new Date(time))
      } else {
        if (value === 0) {
          setSimulatedTime(null)
        } else {
          setSimulatedTime(new Date(nowRef.current + value * 3600_000))
        }
      }
    },
    [setSimulatedTime, setMissionTime, missionRange]
  )

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    if (missionRange) {
      setMissionTime(new Date(missionRange.start))
    } else {
      setSimulatedTime(null)
    }
  }, [setSimulatedTime, setMissionTime, missionRange])

  // Slider value
  let sliderValue: number
  let sliderMin: number
  let sliderMax: number
  let sliderStep: number

  if (missionRange) {
    const currentMs = missionTime?.getTime() ?? missionRange.start
    const t = (currentMs - missionRange.start) / (missionRange.end - missionRange.start)
    sliderValue = Math.max(0, Math.min(1000, t * 1000))
    sliderMin = 0
    sliderMax = 1000
    sliderStep = 1
  } else {
    sliderValue = simulatedTime
      ? (simulatedTime.getTime() - nowRef.current) / 3600_000
      : 0
    sliderMin = 0
    sliderMax = FORECAST_HOURS
    sliderStep = 1
  }

  const isActive = missionRange ? true : sliderValue > 0

  // Format date label for mission mode
  const dateLabel = missionRange && missionTime
    ? missionTime.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  const startLabel = missionRange
    ? new Date(missionRange.start).getFullYear().toString()
    : null
  const endLabel = missionRange
    ? new Date(missionRange.end).getFullYear().toString()
    : null

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
        border: `1px solid ${isMissionMode ? activeMission!.color + '44' : colors.navbar.border}`,
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
          color: isActive ? (isMissionMode ? activeMission!.color : colors.accent) : colors.text.muted,
          whiteSpace: 'nowrap',
          cursor: isActive ? 'pointer' : 'default',
          userSelect: 'none',
          fontWeight: 500,
        }}
      >
        {isMissionMode ? startLabel : 'Now'}
      </span>

      <button
        onClick={handlePlayPause}
        style={{
          background: 'none',
          border: 'none',
          color: isPlaying ? (isMissionMode ? activeMission!.color : colors.accent) : colors.text.muted,
          cursor: 'pointer',
          padding: '2px 4px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
        }}
        title={isPlaying ? 'Pause' : 'Play time-lapse'}
        data-hint="time-slider"
      >
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
      </button>

      <span
        onClick={handleSpeedCycle}
        style={{
          fontSize: '10px',
          color: isPlaying ? (isMissionMode ? activeMission!.color : colors.accent) : colors.text.muted,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          userSelect: 'none',
          fontWeight: 500,
          minWidth: '28px',
        }}
        title="Click to change speed"
      >
        {speedLabels[speedIndex]}
      </span>

      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderValue}
        onChange={handleSliderChange}
        style={{
          flex: 1,
          accentColor: isMissionMode ? activeMission!.color : colors.accent,
          cursor: 'pointer',
        }}
      />

      <span
        style={{
          fontSize: '11px',
          color: isMissionMode ? colors.text.secondary : colors.text.muted,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          minWidth: isMissionMode ? '60px' : undefined,
          textAlign: 'right',
        }}
      >
        {isMissionMode ? (dateLabel ?? endLabel) : '+5d'}
      </span>
    </div>
  )
}
