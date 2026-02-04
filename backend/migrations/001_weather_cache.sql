-- Weather cache table for storing OpenWeatherMap data
-- Coordinates are rounded to nearest 5 degrees for grid-based caching

CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lat_grid DECIMAL(5,1) NOT NULL,  -- Rounded latitude (-90 to 90)
  lon_grid DECIMAL(5,1) NOT NULL,  -- Rounded longitude (-180 to 180)
  cloud_cover DECIMAL(3,2) NOT NULL,  -- 0.0 to 1.0
  precipitation DECIMAL(5,2) NOT NULL,  -- mm/hr
  fog DECIMAL(3,2) NOT NULL,  -- 0.0 to 1.0 (estimated from visibility)
  visibility_km DECIMAL(6,2),  -- Raw visibility in km
  temperature_c DECIMAL(5,2),  -- Temperature in Celsius
  humidity DECIMAL(3,2),  -- 0.0 to 1.0
  raw_data JSONB,  -- Full API response for debugging
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(lat_grid, lon_grid)
);

-- Index for fast lookups by grid coordinates
CREATE INDEX IF NOT EXISTS idx_weather_cache_grid ON weather_cache(lat_grid, lon_grid);

-- Index for finding stale entries
CREATE INDEX IF NOT EXISTS idx_weather_cache_updated ON weather_cache(updated_at);

-- Enable Row Level Security (public read, service role write)
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read weather cache
CREATE POLICY "Weather cache is publicly readable"
  ON weather_cache FOR SELECT
  USING (true);

-- Only service role can insert/update (backend job)
CREATE POLICY "Service role can manage weather cache"
  ON weather_cache FOR ALL
  USING (auth.role() = 'service_role');
