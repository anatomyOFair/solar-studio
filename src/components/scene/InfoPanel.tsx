import { useStore } from '../../store/store'
import { DESCRIPTIONS } from '../../utils/descriptions'
import { PLANET_COLORS, DEFAULT_COLOR } from '../../utils/sceneScaling'

export default function InfoPanel() {
  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)

  if (!selectedObject) return null

  const color = PLANET_COLORS[selectedObject.id] ?? DEFAULT_COLOR
  const description = selectedObject.description || DESCRIPTIONS[selectedObject.id] || ''

  // Heliocentric distance from x,y,z (AU)
  const x = selectedObject.x ?? 0
  const y = selectedObject.y ?? 0
  const z = selectedObject.z ?? 0
  const sunDistAu = Math.sqrt(x * x + y * y + z * z)
  const sunDistKm = sunDistAu * 149_597_870.7

  const formatDistance = (km: number) => {
    if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(1)}M km`
    return `${Math.round(km).toLocaleString()} km`
  }

  const stats: { label: string; value: string }[] = [
    { label: 'Type', value: selectedObject.type.charAt(0).toUpperCase() + selectedObject.type.slice(1) },
    { label: 'Radius', value: selectedObject.radius_km ? `${selectedObject.radius_km.toLocaleString()} km` : '—' },
    { label: 'From Sun (AU)', value: sunDistAu > 0 ? `${sunDistAu.toFixed(4)} AU` : '—' },
    { label: 'From Sun', value: sunDistAu > 0 ? formatDistance(sunDistKm) : '—' },
    { label: 'Magnitude', value: selectedObject.magnitude != null ? selectedObject.magnitude.toFixed(1) : '—' },
  ]

  if (selectedObject.parent_body) {
    stats.splice(1, 0, { label: 'Parent', value: selectedObject.parent_body.charAt(0).toUpperCase() + selectedObject.parent_body.slice(1) })
  }

  return (
    <div style={{
      position: 'fixed',
      top: 64,
      right: 16,
      width: 320,
      maxHeight: 'calc(100vh - 96px)',
      overflowY: 'auto',
      background: 'rgba(10, 15, 26, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      padding: 0,
      zIndex: 50,
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 12px ${color}66`,
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>
            {selectedObject.name}
          </h2>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {selectedObject.type}
          </span>
        </div>
        <button
          onClick={() => setSelectedObject(null)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 6,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 16,
            lineHeight: 1,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
        >
          ×
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px 16px',
        }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      {description && (
        <div style={{ padding: '16px 20px' }}>
          <p style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.7)',
          }}>
            {description}
          </p>
        </div>
      )}
    </div>
  )
}
