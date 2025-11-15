import VisibilityMap from './components/map/VisibilityMap'
import TopNav from './components/nav/TopNav'
import SideNav from './components/nav/SideNav'
import ObjectTracker from './components/ui/ObjectTracker'
import UserReportsPanel from './components/ui/UserReportsPanel'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="h-screen w-full"> 
        <TopNav />
        <SideNav />
        <VisibilityMap />
        <ObjectTracker />
        <UserReportsPanel />
      </div>
    </div>
  )
}

export default App
