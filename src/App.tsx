import { useEffect, useState } from 'react'
import VisibilityMap from './components/map/VisibilityMap'
import SolarSystemScene from './components/scene/SolarSystemScene'
import ScenePanel from './components/scene/ScenePanel'
import TopNav from './components/nav/TopNav'
import TimeSlider from './components/nav/TimeSlider'
import SideNav from './components/nav/SideNav'
import ObjectTracker from './components/ui/ObjectTracker'
import UserReportsPanel from './components/ui/UserReportsPanel'
import HomeView from './components/ui/HomeView'
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

  return (
    <div className={`text-white${nightVision && viewMode !== '3d' ? ' night-vision' : ''}`} style={{ backgroundColor: colors.background.darker, width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', ...(nightVision && viewMode !== '3d' ? { filter: 'url(#night-vision-filter)' } : {}) }}>
        <TopNav />
        {viewMode !== 'home' && !activeTour && <TimeSlider />}
        <SideNav />
        {viewMode === 'home' && <HomeView />}
        {viewMode === '2d' && (
          <>
            <VisibilityMap />
            <ObjectTracker />
            <UserReportsPanel />
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
