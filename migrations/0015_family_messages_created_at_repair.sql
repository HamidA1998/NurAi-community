-- Repair older Family Circle message tables missing timestamps.
--
-- Some production databases may already have family_messages from an earlier
-- rollout but without created_at. The message API sorts by created_at and the
-- client displays message timing, so this repeat-safe migration completes the
-- table contract without deleting any family data.
--
-- Release note:
-- This prevents Family Circle message send/fetch failures on older production
-- databases by adding the missing created_at timestamp used by the API.

BEGIN;

ALTER TABLE family_messages
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS family_messages_group_created_idx
  ON family_messages (group_id, created_at);

CREATE INDEX IF NOT EXISTS family_messages_sender_created_idx
  ON family_messages (sender_id, created_at);

COMMIT;
