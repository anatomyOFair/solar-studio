-- Celestial Objects Table
-- Stores position and metadata for planets, moons, and other bodies
-- Updated via JPL Horizons API

CREATE TABLE IF NOT EXISTS celestial_objects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'planet', 'moon', 'dwarf_planet', 'asteroid', 'comet', 'star'

  -- Heliocentric cartesian coordinates (AU) for 3D rendering
  x DECIMAL(20,10),
  y DECIMAL(20,10),
  z DECIMAL(20,10),

  -- Velocity (AU/day) for animation
  vx DECIMAL(20,15),
  vy DECIMAL(20,15),
  vz DECIMAL(20,15),

  -- Observer-centric data (for visibility calculations)
  ra DECIMAL(10,6),           -- Right Ascension (degrees)
  dec DECIMAL(10,6),          -- Declination (degrees)
  distance_au DECIMAL(15,10), -- Distance from Earth (AU)
  distance_km DECIMAL(20,2),  -- Distance from Earth (km)

  -- Physical properties
  magnitude DECIMAL(5,2),     -- Apparent magnitude
  radius_km DECIMAL(15,2),    -- Mean radius

  -- Metadata
  jpl_horizons_id TEXT,       -- JPL Horizons target ID
  parent_body TEXT,           -- For moons, the planet they orbit
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(name)
);

-- Index for type queries
CREATE INDEX IF NOT EXISTS idx_celestial_objects_type ON celestial_objects(type);

-- Index for parent body (moon queries)
CREATE INDEX IF NOT EXISTS idx_celestial_objects_parent ON celestial_objects(parent_body);
