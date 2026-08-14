-- Server-side push token registry and paid Smart NurAI notification events.
--
-- Release note:
-- This enables the app to register Expo push tokens, then lets a protected
-- backend job send one paid, personalized NurAI reminder with idempotent
-- per-user/per-day logging.

BEGIN;

CREATE TABLE IF NOT EXISTS notification_push_tokens (
  id serial PRIMARY KEY,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  device_id text,
  platform text NOT NULL DEFAULT 'unknown',
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_push_tokens_user_token_idx
  ON notification_push_tokens (user_id, expo_push_token);

CREATE INDEX IF NOT EXISTS notification_push_tokens_user_enabled_idx
  ON notification_push_tokens (user_id, enabled);

CREATE INDEX IF NOT EXISTS notification_push_tokens_seen_idx
  ON notification_push_tokens (last_seen_at);

CREATE TABLE IF NOT EXISTS smart_notification_events (
  id serial PRIMARY KEY,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id integer REFERENCES notification_push_tokens(id) ON DELETE SET NULL,
  kind text NOT NULL,
  date_key text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  route text NOT NULL DEFAULT 'Home',
  status text NOT NULL DEFAULT 'pending',
  provider_message_id text,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamp,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS smart_notification_events_user_kind_date_idx
  ON smart_notification_events (user_id, kind, date_key);

CREATE INDEX IF NOT EXISTS smart_notification_events_user_created_idx
  ON smart_notification_events (user_id, created_at);

CREATE INDEX IF NOT EXISTS smart_notification_events_status_created_idx
  ON smart_notification_events (status, created_at);

COMMIT;
