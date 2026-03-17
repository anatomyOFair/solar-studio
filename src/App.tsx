import { useEffect } from 'react'
import VisibilityMap from './components/map/VisibilityMap'
import SolarSystemScene from './components/scene/SolarSystemScene'
import InfoPanel from './components/scene/InfoPanel'
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
import { useStore } from './store/store'
import { colors } from './constants'

function App() {
  const isAuthModalOpen = useStore((state) => state.isAuthModalOpen)
  const closeAuthModal = useStore((state) => state.closeAuthModal)
  const setSession = useStore((state) => state.setSession)
  const viewMode = useStore((state) => state.viewMode)
  const activeTour = useStore((state) => state.activeTour)
  const fetchObjects = useStore((state) => state.fetchObjects)
  const setDataReady = useStore((state) => state.setDataReady)

  // Prefetch data + auth on mount
  useEffect(() => {
    fetchObjects().finally(() => setDataReady(true))

    import('./lib/supabase').then(({ supabase }) => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    })
  }, [setSession, fetchObjects, setDataReady])

  return (
    <div className="text-white" style={{ backgroundColor: colors.background.darker, width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
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
        {viewMode === '3d' && (
          <>
            <SolarSystemScene />
            {!activeTour && <InfoPanel />}
          </>
        )}
      <LoadingScreen />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <ReportModal />
      <ObservationModal />
    </div>
  )
}

export default App
