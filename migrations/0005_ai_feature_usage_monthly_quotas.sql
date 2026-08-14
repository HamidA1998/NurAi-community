-- Monthly per-feature quotas for expensive paid AI routes.
--
-- Release note:
-- Daily quotas and short-window rate limits protect normal usage. This table
-- adds a separate monthly cap for paid Tafsir and image generation so those
-- higher-cost routes cannot consume unbounded provider spend across a month.

BEGIN;

CREATE TABLE IF NOT EXISTS ai_feature_usage (
  id serial PRIMARY KEY,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  period_key text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_feature_usage_user_feature_period_idx
  ON ai_feature_usage (user_id, feature_key, period_key);

CREATE INDEX IF NOT EXISTS ai_feature_usage_period_idx
  ON ai_feature_usage (period_key);

COMMIT;
