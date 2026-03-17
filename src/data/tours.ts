export interface TourStop {
  objectId: string
  narration: string
}

export interface TourDef {
  id: string
  title: string
  description?: string
  stops: TourStop[]
}
