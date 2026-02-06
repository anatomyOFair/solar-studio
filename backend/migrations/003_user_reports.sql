-- User Reports Table
-- Stores user visibility reports for celestial objects

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Unknown',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching reports by object
CREATE INDEX IF NOT EXISTS idx_user_reports_object_id ON user_reports(object_id);

-- Index for fetching reports by user
CREATE INDEX IF NOT EXISTS idx_user_reports_user_id ON user_reports(user_id);

-- Row Level Security
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reports
CREATE POLICY "Reports are viewable by everyone"
  ON user_reports FOR SELECT
  USING (true);

-- Users can only insert their own reports
CREATE POLICY "Users can insert own reports"
  ON user_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own reports
CREATE POLICY "Users can delete own reports"
  ON user_reports FOR DELETE
  USING (auth.uid() = user_id);
