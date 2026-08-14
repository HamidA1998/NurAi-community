-- Persist source/review metadata for saved AI chat and voice answers.
-- Existing messages get an empty metadata object; new assistant messages can
-- retain verified citation cards, source coverage, warnings, and review status.
--
-- Release note:
-- This makes source cards and review metadata durable for saved AI answers so
-- later audits can inspect what the user actually saw.

BEGIN;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMIT;
