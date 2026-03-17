-- Observation Log Table
-- Personal stargazing journal entries with equipment, notes, and ratings

CREATE TABLE IF NOT EXISTS observation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  notes TEXT,
  equipment TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location_label TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching entries by user (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_observation_log_user_id ON observation_log(user_id);

-- Index for fetching entries by object
CREATE INDEX IF NOT EXISTS idx_observation_log_object_id ON observation_log(object_id);

-- Row Level Security
ALTER TABLE observation_log ENABLE ROW LEVEL SECURITY;

-- Users can only read their own journal entries (private journal)
CREATE POLICY "Users can read own observations"
  ON observation_log FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own entries
CREATE POLICY "Users can insert own observations"
  ON observation_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update own observations"
  ON observation_log FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete own observations"
  ON observation_log FOR DELETE
  USING (auth.uid() = user_id);
