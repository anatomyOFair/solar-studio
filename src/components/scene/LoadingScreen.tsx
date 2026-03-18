import { useState, useEffect, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import { useStore } from '../../store/store'
import { colors, sizes } from '../../constants'

export default function LoadingScreen() {
  const dataReady = useStore((state) => state.dataReady)
  const sceneReady = useStore((state) => state.sceneReady)
  const viewMode = useStore((state) => state.viewMode)
  const { progress: threeProgress, active: threeActive } = useProgress()
  const [visible, setVisible] = useState(true)
  const prevViewMode = useRef(viewMode)

  const isReady = viewMode === '3d' ? dataReady && sceneReady : dataReady

  // Re-show when switching to 3D only if scene isn't ready yet
  useEffect(() => {
    if (viewMode === '3d' && prevViewMode.current !== '3d' && !isReady) {
      setVisible(true)
    }
    prevViewMode.current = viewMode
  }, [viewMode, isReady])

  // Fade out then unmount
  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => setVisible(false), 600)
      return () => clearTimeout(timer)
    }
  }, [isReady])

  if (!visible) return null

  // Calculate actual progress:
  // - Data loading: 0-30% (or immediate if cached)
  // - 3D textures: 30-90% (tracked by drei useProgress)
  // - Scene render: 90-100% (sceneReady flag)
  let percent: number
  if (!dataReady) {
    // Animate a slow crawl while data loads
    percent = 15
  } else if (viewMode === '3d') {
    if (!threeActive && threeProgress === 0 && !sceneReady) {
      // Three.js hasn't started loading yet
      percent = 30
    } else if (threeActive) {
      // Actively loading textures
      percent = 30 + (threeProgress * 0.6)
    } else if (!sceneReady) {
      // Textures done, waiting for GPU render
      percent = 92
    } else {
      percent = 100
    }
  } else {
    percent = 100
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 30% 40%, #0a0e1a 0%, #050810 40%, #020408 100%)',
        zIndex: sizes.zIndex.fixed + 5,
        opacity: isReady ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: isReady ? 'none' : 'auto',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: colors.text.primary, fontSize: '18px', fontWeight: 500, marginBottom: '24px' }}>
          solarStudio
        </div>

        <div
          style={{
            width: '200px',
            height: '3px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              backgroundColor: colors.accent,
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={{ color: colors.text.muted, fontSize: '11px', marginTop: '10px' }}>
          {!dataReady
            ? 'Loading data...'
            : viewMode === '3d' && threeActive
              ? `Loading textures... ${Math.round(threeProgress)}%`
              : viewMode === '3d' && !sceneReady
                ? 'Preparing scene...'
                : 'Ready'}
        </div>
      </div>
    </div>
  )
}
