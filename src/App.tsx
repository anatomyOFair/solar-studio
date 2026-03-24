import { useEffect, useState } from 'react'
import VisibilityMap from './components/map/VisibilityMap'
import SolarSystemScene from './components/scene/SolarSystemScene'
import ScenePanel from './components/scene/ScenePanel'
import TopNav from './components/nav/TopNav'
import TimeSlider from './components/nav/TimeSlider'
import MapPanel from './components/map/MapPanel'
import LoadingScreen from './components/scene/LoadingScreen'
import AuthModal from './components/auth/AuthModal'
import ReportModal from './components/reports/ReportModal'
import ObservationModal from './components/logbook/ObservationModal'
import AccountModal from './components/account/AccountModal'
import PrivacyPolicyModal from './components/account/PrivacyPolicyModal'
import HintOverlay from './components/ui/HintOverlay'
import { useStore } from './store/store'
import { initLogging, setUserId } from './services/interactionLogger'
import { colors } from './constants'

const MIN_WIDTH = 1280
const MIN_HEIGHT = 720

function App() {
  const isAuthModalOpen = useStore((state) => state.isAuthModalOpen)
  const closeAuthModal = useStore((state) => state.closeAuthModal)
  const setSession = useStore((state) => state.setSession)
  const viewMode = useStore((state) => state.viewMode)
  const activeTour = useStore((state) => state.activeTour)
  const fetchObjects = useStore((state) => state.fetchObjects)
  const setDataReady = useStore((state) => state.setDataReady)
  const nightVision = useStore((state) => state.nightVision)
  const [ever3D, setEver3D] = useState(false)
  const [tooSmall, setTooSmall] = useState(window.innerWidth < MIN_WIDTH || window.innerHeight < MIN_HEIGHT)
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth)

  useEffect(() => {
    const check = () => {
      setTooSmall(window.innerWidth < MIN_WIDTH || window.innerHeight < MIN_HEIGHT)
      setIsPortrait(window.innerHeight > window.innerWidth)
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Keep 3D scene alive once mounted to avoid shader recompilation stalls
  useEffect(() => {
    if (viewMode === '3d') setEver3D(true)
  }, [viewMode])

  // Prefetch data + auth on mount
  useEffect(() => {
    initLogging()
    fetchObjects().finally(() => setDataReady(true))

    let subscription: { unsubscribe: () => void } | null = null

    import('./lib/supabase').then(({ supabase }) => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUserId(session?.user?.id ?? null)
        })

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUserId(session?.user?.id ?? null)
        })
        subscription = data.subscription
    })

    return () => { subscription?.unsubscribe() }
  }, [setSession, fetchObjects, setDataReady])

  if (tooSmall || isPortrait) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        background: 'radial-gradient(ellipse at 30% 40%, #0a0e1a 0%, #050810 40%, #020408 100%)',
        padding: '32px',
      }}>
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="14" fill="#f59e0b" />
          <g stroke="#f59e0b" strokeWidth="3" strokeLinecap="round">
            <line x1="32" y1="4" x2="32" y2="14" />
            <line x1="32" y1="50" x2="32" y2="60" />
            <line x1="4" y1="32" x2="14" y2="32" />
            <line x1="50" y1="32" x2="60" y2="32" />
            <line x1="12.2" y1="12.2" x2="19.3" y2="19.3" />
            <line x1="44.7" y1="44.7" x2="51.8" y2="51.8" />
            <line x1="12.2" y1="51.8" x2="19.3" y2="44.7" />
            <line x1="44.7" y1="19.3" x2="51.8" y2="12.2" />
          </g>
        </svg>
        <h1 style={{ color: colors.text.primary, fontSize: '18px', fontWeight: 600, margin: '16px 0 8px' }}>
          {isPortrait ? 'Rotate Your Device' : 'Unsupported Screen Size'}
        </h1>
        <p style={{ color: colors.text.muted, fontSize: '14px', lineHeight: 1.5, maxWidth: '300px' }}>
          {isPortrait
            ? 'Solar Studio is designed for landscape orientation. Please rotate your device.'
            : 'Solar Studio is not supported on small screens. Please use a desktop or laptop.'}
        </p>
      </div>
    )
  }

  return (
    <div className={`text-white${nightVision && viewMode !== '3d' ? ' night-vision' : ''}`} style={{ backgroundColor: colors.background.darker, width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', ...(nightVision && viewMode !== '3d' ? { filter: 'url(#night-vision-filter)' } : {}) }}>
        <TopNav />
        {!activeTour && <TimeSlider />}
        {viewMode === '2d' && (
          <>
            <VisibilityMap />
            <MapPanel />
          </>
        )}
        {ever3D && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            visibility: viewMode === '3d' ? 'visible' : 'hidden',
            pointerEvents: viewMode === '3d' ? 'auto' : 'none',
          }}>
            <SolarSystemScene />
          </div>
        )}
        {viewMode === '3d' && <ScenePanel />}
      <LoadingScreen />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <ReportModal />
      <ObservationModal />
      <AccountModal />
      <PrivacyPolicyModal />
      <HintOverlay />
      {/* SVG filter for night-vision mode - maps all RGB to red channel */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="night-vision-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}

export default App
