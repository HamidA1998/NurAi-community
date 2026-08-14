-- Repair older production Family Circle message tables.
--
-- Some production databases created family_messages before message kind and
-- metadata support existed. CREATE TABLE IF NOT EXISTS in the collaboration
-- migration does not add missing columns to existing tables, so this forward
-- migration safely brings the table up to the current server contract.
--
-- Release note:
-- This prevents Family Circle messages from failing on older production
-- databases by safely adding missing message columns and indexes without
-- deleting family data.

BEGIN;

ALTER TABLE family_messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'message';

ALTER TABLE family_messages
  ADD COLUMN IF NOT EXISTS content text;

ALTER TABLE family_messages
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE family_messages
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE family_messages
SET kind = 'message'
WHERE kind IS NULL OR btrim(kind) = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'family_messages'
      AND column_name = 'type'
  ) THEN
    UPDATE family_messages
    SET kind = type
    WHERE type IS NOT NULL AND btrim(type) <> '';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'family_messages'
      AND column_name = 'message'
  ) THEN
    UPDATE family_messages
    SET content = message
    WHERE content IS NULL AND message IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'family_messages'
      AND column_name = 'type'
  ) THEN
    EXECUTE 'ALTER TABLE family_messages ALTER COLUMN type DROP NOT NULL';
    EXECUTE 'ALTER TABLE family_messages ALTER COLUMN type SET DEFAULT ''message''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'family_messages'
      AND column_name = 'message'
  ) THEN
    EXECUTE 'ALTER TABLE family_messages ALTER COLUMN message DROP NOT NULL';
  END IF;
END $$;

UPDATE family_messages
SET content = ''
WHERE content IS NULL;

ALTER TABLE family_messages
  ALTER COLUMN content SET NOT NULL;

UPDATE family_messages
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

CREATE INDEX IF NOT EXISTS family_messages_group_created_idx
  ON family_messages (group_id, created_at);

CREATE INDEX IF NOT EXISTS family_messages_sender_created_idx
  ON family_messages (sender_id, created_at);

COMMIT;
