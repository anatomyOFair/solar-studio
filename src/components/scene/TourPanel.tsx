import { useEffect, useState } from 'react'
import { useStore } from '../../store/store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRoute, faXmark } from '@fortawesome/free-solid-svg-icons'

export default function TourPanel() {
  const tours = useStore((state) => state.tours)
  const fetchTours = useStore((state) => state.fetchTours)
  const startTour = useStore((state) => state.startTour)
  const activeTour = useStore((state) => state.activeTour)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (tours.length === 0) fetchTours()
  }, [tours.length, fetchTours])

  // Hide picker when a tour is active
  if (activeTour) return null
  if (tours.length === 0) return null

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1055 }}>
      {/* Expanded panel */}
      <div
        style={{
          width: 340,
          background: 'rgba(10, 15, 26, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          padding: '14px 16px',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transformOrigin: 'bottom right',
          opacity: open ? 1 : 0,
          transform: open ? 'scale(1)' : 'scale(0.9)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          position: 'absolute',
          bottom: 0,
          right: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Guided Tours
          </span>
          <button
            onClick={() => setOpen(false)}
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

        {tours.map((tour) => (
          <button
            key={tour.id}
            onClick={() => { startTour(tour); setOpen(false) }}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 6,
              cursor: 'pointer',
              color: 'white',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          >
            <div style={{ fontSize: 14, fontWeight: 500 }}>{tour.title}</div>
            {tour.description && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3, lineHeight: 1.4 }}>
                {tour.description}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              {tour.stops.length} stops
            </div>
          </button>
        ))}
      </div>

      {/* Collapsed button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'rgba(10, 15, 26, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 10,
          padding: '10px 16px',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 13,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
          transition: 'opacity 0.2s ease, background 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(10, 15, 26, 0.9)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10, 15, 26, 0.75)' }}
      >
        <FontAwesomeIcon icon={faRoute} style={{ fontSize: 14 }} />
        Guided Tours
      </button>
    </div>
  )
}
