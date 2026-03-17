-- Celestial Events Cache Table
-- Stores upcoming astronomical events fetched from external APIs (USNO, NOAA)
-- plus computed events (meteor showers, conjunctions, lunar phases).
-- Client checks staleness of fetched_at and refreshes when stale (>24h).

CREATE TABLE IF NOT EXISTS celestial_events (
  id TEXT PRIMARY KEY,                -- deterministic id e.g. 'eclipse-2026-08-12'
  name TEXT NOT NULL,
  type TEXT NOT NULL,                 -- 'eclipse' | 'meteor_shower' | 'aurora' | 'lunar_phase' | 'conjunction' | 'special'
  event_date DATE NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'computed',  -- 'usno' | 'noaa' | 'computed' | 'manual'
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_celestial_events_date ON celestial_events(event_date);
CREATE INDEX IF NOT EXISTS idx_celestial_events_type ON celestial_events(type);

-- RLS: public read, no public write (writes go through service role or authenticated refresh)
ALTER TABLE celestial_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Celestial events are viewable by everyone"
  ON celestial_events FOR SELECT
  USING (true);

-- Allow authenticated users to upsert (for client-side refresh)
CREATE POLICY "Authenticated users can insert events"
  ON celestial_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update events"
  ON celestial_events FOR UPDATE
  USING (auth.role() = 'authenticated');
