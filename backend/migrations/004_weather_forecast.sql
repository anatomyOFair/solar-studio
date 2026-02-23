-- Weather forecast table for storing Open-Meteo hourly forecast data
-- Populated by refresh_forecast.py, run every 12 hours

CREATE TABLE IF NOT EXISTS weather_forecast (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lat_grid DECIMAL(5,1) NOT NULL,
  lon_grid DECIMAL(5,1) NOT NULL,
  forecast_time TIMESTAMPTZ NOT NULL,
  cloud_cover DECIMAL(5,2),       -- 0-100 (percentage)
  precipitation DECIMAL(5,2),     -- mm
  visibility_km DECIMAL(6,2),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(lat_grid, lon_grid, forecast_time)
);

CREATE INDEX IF NOT EXISTS idx_forecast_time ON weather_forecast(forecast_time);
CREATE INDEX IF NOT EXISTS idx_forecast_coords ON weather_forecast(lat_grid, lon_grid);

-- Enable Row Level Security (public read, service role write)
ALTER TABLE weather_forecast ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weather forecast is publicly readable"
  ON weather_forecast FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage weather forecast"
  ON weather_forecast FOR ALL
  USING (auth.role() = 'service_role');
