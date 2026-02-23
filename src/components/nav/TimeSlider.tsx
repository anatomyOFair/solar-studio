import { useRef, useCallback } from 'react'
import { useStore } from '../../store/store'
import { colors, spacing, sizes } from '../../constants'

const FORECAST_HOURS = 5 * 24 // 5 days ahead

export default function TimeSlider() {
  const simulatedTime = useStore((state) => state.simulatedTime)
  const setSimulatedTime = useStore((state) => state.setSimulatedTime)
  const nowRef = useRef(Date.now())

  if (!simulatedTime) {
    nowRef.current = Date.now()
  }

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hoursOffset = parseFloat(e.target.value)
      if (hoursOffset === 0) {
        setSimulatedTime(null)
      } else {
        setSimulatedTime(new Date(nowRef.current + hoursOffset * 3600_000))
      }
    },
    [setSimulatedTime]
  )

  const handleReset = useCallback(() => {
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
        minWidth: '280px',
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
