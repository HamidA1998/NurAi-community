-- Add server-backed Family Circle collaboration state.
--
-- Release note:
-- Family messages and shared progress are private to authenticated premium
-- family-group members, rate-limited in the API, and indexed by group/time for
-- safe retrieval without exposing activity outside the family circle.

BEGIN;

CREATE TABLE IF NOT EXISTS family_messages (
  id serial PRIMARY KEY,
  group_id integer NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  sender_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'message',
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS family_messages_group_created_idx
  ON family_messages (group_id, created_at);

CREATE INDEX IF NOT EXISTS family_messages_sender_created_idx
  ON family_messages (sender_id, created_at);

CREATE TABLE IF NOT EXISTS family_progress_events (
  id serial PRIMARY KEY,
  group_id integer NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  value integer NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'action',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS family_progress_events_group_created_idx
  ON family_progress_events (group_id, created_at);

CREATE INDEX IF NOT EXISTS family_progress_events_user_created_idx
  ON family_progress_events (user_id, created_at);

CREATE INDEX IF NOT EXISTS family_progress_events_group_category_idx
  ON family_progress_events (group_id, category);

COMMIT;
