-- Enable RLS on celestial_objects (was missing)
-- Public read-only access, no writes via API

ALTER TABLE celestial_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Celestial objects are viewable by everyone"
  ON celestial_objects FOR SELECT
  USING (true);
