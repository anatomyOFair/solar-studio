import { useEffect } from 'react'
import VisibilityMap from './components/map/VisibilityMap'
import SolarSystemScene from './components/scene/SolarSystemScene'
import InfoPanel from './components/scene/InfoPanel'
import TopNav from './components/nav/TopNav'
import SideNav from './components/nav/SideNav'
import ObjectTracker from './components/ui/ObjectTracker'
import UserReportsPanel from './components/ui/UserReportsPanel'
import AuthModal from './components/auth/AuthModal'
import ReportModal from './components/reports/ReportModal'
import { useStore } from './store/store'

function App() {
  const isAuthModalOpen = useStore((state) => state.isAuthModalOpen)
  const closeAuthModal = useStore((state) => state.closeAuthModal)
  const setSession = useStore((state) => state.setSession)
  const viewMode = useStore((state) => state.viewMode)

  useEffect(() => {
    // Dynamic import to avoid circular dependencies if any, though standard import is fine too.
    // Putting it inside effect to ensure client exists.
    import('./lib/supabase').then(({ supabase }) => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    })
  }, [setSession])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="h-screen w-full"> 
        <TopNav />
        <SideNav />
        {viewMode === '2d' ? (
          <>
            <VisibilityMap />
            <ObjectTracker />
            <UserReportsPanel />
          </>
        ) : (
          <>
            <SolarSystemScene />
            <InfoPanel />
          </>
        )}
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <ReportModal />
    </div>
  )
}

export default App
