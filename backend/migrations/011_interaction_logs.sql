-- Interaction logging for FYP user study evaluation
-- Captures user behaviour during evaluation sessions
-- Activated via ?pid= URL parameter (study mode only)

CREATE TABLE IF NOT EXISTS interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  participant_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interaction_logs_participant ON interaction_logs(participant_id)
  WHERE participant_id IS NOT NULL;

CREATE INDEX idx_interaction_logs_session ON interaction_logs(session_id);

CREATE INDEX idx_interaction_logs_event_type ON interaction_logs(event_type);

CREATE INDEX idx_interaction_logs_participant_time ON interaction_logs(participant_id, created_at)
  WHERE participant_id IS NOT NULL;

-- RLS: insert-only from API, no reads (researchers use dashboard / service key)
ALTER TABLE interaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert interaction logs"
  ON interaction_logs FOR INSERT
  WITH CHECK (true);
