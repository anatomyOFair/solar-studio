import { useStore } from '../../store/store'

export default function ZoomButtons() {
  const map = useStore((state) => state.map)

  const handleZoomIn = () => {
    if (map) {
      map.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (map) {
      map.zoomOut()
    }
  }

  return (
    <div className="flex flex-col gap-1 pb-2">
      <button
        onClick={handleZoomIn}
        className="w-8 h-8 flex items-center justify-center text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        style={{ fontSize: '18px' }}
      >
        +
      </button>
      <button
        onClick={handleZoomOut}
        className="w-8 h-8 flex items-center justify-center text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        style={{ fontSize: '18px' }}
      >
        −
      </button>
    </div>
  )
}

