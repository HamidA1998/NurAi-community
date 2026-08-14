-- Enforce per-user ownership for AI chat conversations.
--
-- Release note:
-- Previous local/dev builds could create conversations with no owner. For
-- privacy, orphaned conversation rows are deleted instead of being reassigned.

BEGIN;

DELETE FROM messages
WHERE conversation_id IN (
  SELECT conversations.id
  FROM conversations
  LEFT JOIN users ON users.id = conversations.user_id
  WHERE conversations.user_id IS NULL OR users.id IS NULL
);

DELETE FROM conversations
WHERE id IN (
  SELECT conversations.id
  FROM conversations
  LEFT JOIN users ON users.id = conversations.user_id
  WHERE conversations.user_id IS NULL OR users.id IS NULL
);

ALTER TABLE conversations
  ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversations_user_id_users_id_fk'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_user_id_users_id_fk
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS conversations_user_id_created_at_idx
  ON conversations (user_id, created_at DESC);

COMMIT;
