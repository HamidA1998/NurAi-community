-- Enforce per-user ownership for community profiles.
--
-- Release note:
-- Older builds stored the authenticated user id in device_id. This migration
-- preserves device_id for client compatibility, backfills the explicit user_id
-- owner column, and deletes orphaned community profiles that cannot be tied to
-- a real account.

BEGIN;

ALTER TABLE community_profiles
  ADD COLUMN IF NOT EXISTS user_id varchar;

DELETE FROM community_profiles
WHERE (user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = community_profiles.user_id
  ))
   OR (user_id IS NULL AND (
    device_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = community_profiles.device_id
    )
  ));

UPDATE community_profiles
SET user_id = device_id
WHERE user_id IS NULL;

DELETE FROM community_profiles
WHERE user_id IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM users
     WHERE users.id = community_profiles.user_id
   );

ALTER TABLE community_profiles
  ALTER COLUMN user_id SET NOT NULL;

DO $$
DECLARE
  existing_user_fk text;
BEGIN
  SELECT conname
  INTO existing_user_fk
  FROM pg_constraint
  WHERE contype = 'f'
    AND conrelid = 'community_profiles'::regclass
    AND confrelid = 'users'::regclass
    AND pg_get_constraintdef(oid) LIKE 'FOREIGN KEY (user_id) REFERENCES users(id)%'
  ORDER BY conname
  LIMIT 1;

  IF existing_user_fk IS NOT NULL
    AND existing_user_fk <> 'community_profiles_user_id_users_id_fk'
  THEN
    EXECUTE format(
      'ALTER TABLE community_profiles RENAME CONSTRAINT %I TO community_profiles_user_id_users_id_fk',
      existing_user_fk
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_profiles_user_id_users_id_fk'
  ) THEN
    ALTER TABLE community_profiles
      ADD CONSTRAINT community_profiles_user_id_users_id_fk
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS community_profiles_user_id_idx
  ON community_profiles (user_id);

COMMIT;
