import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faXmark, faPlay, faPause } from '@fortawesome/free-solid-svg-icons'

const AUTO_ADVANCE_MS = 8000

export default function TourOverlay() {
  const activeTour = useStore((state) => state.activeTour)
  const tourStep = useStore((state) => state.tourStep)
  const nextTourStep = useStore((state) => state.nextTourStep)
  const prevTourStep = useStore((state) => state.prevTourStep)
  const endTour = useStore((state) => state.endTour)

  const [autoPlay, setAutoPlay] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number>(0)
  const [timerProgress, setTimerProgress] = useState(0)

  // Auto-advance timer + progress bar
  useEffect(() => {
    setTimerProgress(0)
    if (!activeTour || !autoPlay) return
    // Double rAF: first ensures the 0% state is painted, second kicks off the transition
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setTimerProgress(100))
      rafRef.current = raf2
    })
    timerRef.current = setTimeout(nextTourStep, AUTO_ADVANCE_MS)
    return () => {
      cancelAnimationFrame(raf1)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [activeTour, tourStep, autoPlay, nextTourStep])

  // Escape key exits tour
  useEffect(() => {
    if (!activeTour) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour()
      else if (e.key === 'ArrowRight') nextTourStep()
      else if (e.key === 'ArrowLeft') prevTourStep()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTour, endTour, nextTourStep, prevTourStep])

  if (!activeTour) return null

  const stop = activeTour.stops[tourStep]
  const total = activeTour.stops.length
  const isFirst = tourStep === 0
  const isLast = tourStep === total - 1

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(620px, 90vw)',
        background: 'rgba(10, 15, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: '16px 20px',
        zIndex: 1060,
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header row: title + step counter + close */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          {activeTour.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {tourStep + 1} / {total}
          </span>
          <button
            className="btn-press"
            onClick={endTour}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 6,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          >
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 12 }} />
          </button>
        </div>
      </div>

      {/* Auto-advance timer bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, marginBottom: 12 }}>
        <div style={{
          height: '100%',
          width: `${timerProgress}%`,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 1,
          transition: timerProgress === 0 ? 'none' : `width ${AUTO_ADVANCE_MS}ms linear`,
        }} />
      </div>

      {/* Narration */}
      <p style={{
        margin: '0 0 14px',
        fontSize: 14,
        lineHeight: 1.6,
        color: 'rgba(255,255,255,0.8)',
      }}>
        {stop.narration}
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          className="btn-press"
          onClick={() => setAutoPlay(!autoPlay)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '4px 10px',
            cursor: 'pointer',
            color: autoPlay ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <FontAwesomeIcon icon={autoPlay ? faPause : faPlay} style={{ fontSize: 10 }} />
          {autoPlay ? 'Auto' : 'Paused'}
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-press"
            onClick={prevTourStep}
            disabled={isFirst}
            style={{
              background: isFirst ? 'transparent' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: isFirst ? 'default' : 'pointer',
              color: isFirst ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 10 }} />
            Prev
          </button>
          <button
            className="btn-press"
            onClick={nextTourStep}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.9)',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isLast ? 'Finish' : 'Next'}
            {!isLast && <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 10 }} />}
          </button>
        </div>
      </div>
    </div>
  )
}
