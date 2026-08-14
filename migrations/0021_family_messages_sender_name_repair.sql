-- Family Circle messages were stuck "Waiting to send" forever: the legacy
-- family_messages.sender_name column survived earlier repairs (0014/0015) as
-- NOT NULL with no default, but the current insert path never writes it
-- (sender identity is derived from the users table at read time). Every insert
-- therefore violated the not-null constraint, the endpoint returned 500, and
-- the client kept the message queued. Relax the legacy sender columns so
-- inserts succeed. Guarded + idempotent.
--
-- Release note:
-- Restores Family Circle message delivery without deleting message history;
-- sender identity continues to come from the authenticated users table.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'family_messages'
      AND column_name = 'sender_name'
  ) THEN
    EXECUTE 'ALTER TABLE family_messages ALTER COLUMN sender_name DROP NOT NULL';
    EXECUTE 'ALTER TABLE family_messages ALTER COLUMN sender_name SET DEFAULT ''''';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'family_messages'
      AND column_name = 'sender_username'
  ) THEN
    EXECUTE 'ALTER TABLE family_messages ALTER COLUMN sender_username DROP NOT NULL';
    EXECUTE 'ALTER TABLE family_messages ALTER COLUMN sender_username SET DEFAULT ''''';
  END IF;
END $$;

COMMIT;
