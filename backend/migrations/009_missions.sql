-- Space missions with trajectory waypoints
CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  agency TEXT,
  launch_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  color TEXT NOT NULL DEFAULT '#ffffff',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE mission_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  waypoint_order INTEGER NOT NULL,
  label TEXT,
  object_id TEXT REFERENCES celestial_objects(id),
  epoch DATE NOT NULL,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  z DOUBLE PRECISION NOT NULL,
  UNIQUE(mission_id, waypoint_order)
);

CREATE INDEX idx_mission_waypoints_mission ON mission_waypoints(mission_id);
CREATE INDEX idx_mission_waypoints_object ON mission_waypoints(object_id);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_waypoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Missions are viewable by everyone" ON missions FOR SELECT USING (true);
CREATE POLICY "Mission waypoints are viewable by everyone" ON mission_waypoints FOR SELECT USING (true);
