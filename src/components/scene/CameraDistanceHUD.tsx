import { useStore } from '../../store/store'

const formatAu = (au: number) => {
  if (au < 0.01) return `${(au * 149_597_870.7).toLocaleString(undefined, { maximumFractionDigits: 0 })} km`
  return `${au.toFixed(2)} AU`
}

export default function CameraDistanceHUD() {
  const cameraDistAu = useStore((state) => state.cameraDistAu)
  const activeTour = useStore((state) => state.activeTour)

  if (activeTour) return null
  if (cameraDistAu === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      background: 'rgba(10, 15, 26, 0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 8,
      padding: '8px 14px',
      zIndex: 50,
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 11,
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 9, marginBottom: 4 }}>
        Camera
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>From Sun</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAu(cameraDistAu)}</span>
      </div>
    </div>
  )
}
