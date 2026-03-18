export interface MissionWaypoint {
  waypointOrder: number
  label: string | null
  objectId: string | null
  epoch: string
  x: number
  y: number
  z: number
}

export interface MissionDef {
  id: string
  name: string
  description: string | null
  agency: string | null
  launchDate: string
  endDate: string | null
  status: 'active' | 'completed'
  color: string
  waypoints: MissionWaypoint[]
}
