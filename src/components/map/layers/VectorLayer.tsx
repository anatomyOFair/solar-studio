import { Circle } from 'react-leaflet'
import { useStore } from '../../../store/store'
import { calculateHorizonDistance } from '../../../utils/visibilityCalculator'

export default function VectorLayer() {
  const selectedObject = useStore((state) => state.selectedObject)

  if (!selectedObject) return null

  const horizonDistanceKm = calculateHorizonDistance(selectedObject.position.altitude)
  const horizonRadiusMeters = horizonDistanceKm * 1000

  // Aviation style: bright green/cyan line for horizon
  const horizonOptions = {
    color: '#4ADE80', // bright green
    weight: 2,
    fillColor: '#4ADE80',
    fillOpacity: 0.1,
    dashArray: '5, 10', // dashed line for "aviation" look
  }

  // TODO: Add Terminator line (day/night boundary) if possible
  
  return (
    <>
      <Circle 
        center={[selectedObject.position.lat, selectedObject.position.lon]}
        radius={horizonRadiusMeters}
        pathOptions={horizonOptions}
      />
      {/* Center crosshair */}
      <Circle
        center={[selectedObject.position.lat, selectedObject.position.lon]}
        radius={50000} // 50km center marker
        pathOptions={{
           color: '#4ADE80',
           weight: 1,
           fillColor: '#4ADE80',
           fillOpacity: 0.5
        }}
      />
    </>
  )
}
