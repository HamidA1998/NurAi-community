-- Durable short-window AI rate-limit buckets.
--
-- Release note:
-- This backs the high-cost AI short-window limiter with Postgres so multiple
-- app instances share the same cost-control state.

BEGIN;

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id serial PRIMARY KEY,
  namespace text NOT NULL,
  subject_key text NOT NULL,
  subject_type text NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  reset_at timestamp NOT NULL,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_buckets_namespace_subject_idx
  ON rate_limit_buckets (namespace, subject_key);

CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset_at_idx
  ON rate_limit_buckets (reset_at);

COMMIT;
