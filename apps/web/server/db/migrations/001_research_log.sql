-- Research log canonical state. Apply inside a transaction.
CREATE TABLE IF NOT EXISTS research_entries (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  code TEXT,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  thesis TEXT NOT NULL DEFAULT '',
  risk TEXT NOT NULL DEFAULT '',
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS research_entries_user_created_idx
  ON research_entries (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS action_state (
  user_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, action_id)
);

ALTER TABLE research_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE action_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_state FORCE ROW LEVEL SECURITY;

-- The application transaction must set app.user_id from verified auth claims.
-- Without it, the policies deny access rather than falling back to anonymous data.
DROP POLICY IF EXISTS research_entries_user_isolation ON research_entries;
CREATE POLICY research_entries_user_isolation ON research_entries
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS action_state_user_isolation ON action_state;
CREATE POLICY action_state_user_isolation ON action_state
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));
