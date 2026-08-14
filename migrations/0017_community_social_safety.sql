-- Lock Community audiences and add same-audience connections and direct messages.
--
-- Release note:
-- Community history is now stamped with its original brothers/sisters audience.
-- Connections and direct messages are constrained to a canonical profile pair,
-- with block, report, idempotency, and query indexes ready before UI exposure.

BEGIN;

ALTER TABLE community_profiles
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS discoverable_by_username boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS discoverable_by_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_connection_requests boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS audience_locked_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS audience text;

UPDATE community_posts AS post
SET audience = profile.gender
FROM community_profiles AS profile
WHERE post.profile_id = profile.id
  AND post.audience IS NULL;

DELETE FROM community_posts
WHERE audience IS NULL OR audience NOT IN ('male', 'female');

ALTER TABLE community_posts
  ALTER COLUMN audience SET NOT NULL;

ALTER TABLE community_replies
  ADD COLUMN IF NOT EXISTS audience text;

UPDATE community_replies AS reply
SET audience = post.audience
FROM community_posts AS post
WHERE reply.post_id = post.id
  AND reply.audience IS NULL;

DELETE FROM community_replies
WHERE audience IS NULL OR audience NOT IN ('male', 'female');

ALTER TABLE community_replies
  ALTER COLUMN audience SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_profiles_gender_check'
  ) THEN
    ALTER TABLE community_profiles
      ADD CONSTRAINT community_profiles_gender_check
      CHECK (gender IN ('male', 'female'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_posts_audience_check'
  ) THEN
    ALTER TABLE community_posts
      ADD CONSTRAINT community_posts_audience_check
      CHECK (audience IN ('male', 'female'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_replies_audience_check'
  ) THEN
    ALTER TABLE community_replies
      ADD CONSTRAINT community_replies_audience_check
      CHECK (audience IN ('male', 'female'));
  END IF;
END $$;

DELETE FROM community_likes older
USING community_likes newer
WHERE older.post_id = newer.post_id
  AND older.profile_id = newer.profile_id
  AND older.id < newer.id;

DELETE FROM community_reposts older
USING community_reposts newer
WHERE older.post_id = newer.post_id
  AND older.profile_id = newer.profile_id
  AND older.id < newer.id;

CREATE UNIQUE INDEX IF NOT EXISTS community_likes_post_profile_idx
  ON community_likes (post_id, profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS community_reposts_post_profile_idx
  ON community_reposts (post_id, profile_id);

-- An earlier, unrelated prototype created "community_connections" with a
-- different shape (requester_id/receiver_id/gender_space referencing
-- users directly, never wired to any shipped route or schema.ts model,
-- confirmed empty). CREATE TABLE IF NOT EXISTS would otherwise silently
-- skip creation and leave that incompatible table in place.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'community_connections'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_connections' AND column_name = 'profile_one_id'
  ) THEN
    DROP TABLE community_connections;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS community_connections (
  id serial PRIMARY KEY,
  profile_one_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  profile_two_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  requested_by_profile_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_connections_distinct_profiles_check
    CHECK (profile_one_id < profile_two_id),
  CONSTRAINT community_connections_requester_check
    CHECK (requested_by_profile_id IN (profile_one_id, profile_two_id)),
  CONSTRAINT community_connections_status_check
    CHECK (status IN ('pending', 'accepted')),
  UNIQUE (profile_one_id, profile_two_id)
);

CREATE INDEX IF NOT EXISTS community_connections_one_status_idx
  ON community_connections (profile_one_id, status);
CREATE INDEX IF NOT EXISTS community_connections_two_status_idx
  ON community_connections (profile_two_id, status);

CREATE TABLE IF NOT EXISTS community_blocks (
  id serial PRIMARY KEY,
  blocker_profile_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  blocked_profile_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_blocks_distinct_profiles_check
    CHECK (blocker_profile_id <> blocked_profile_id),
  UNIQUE (blocker_profile_id, blocked_profile_id)
);

CREATE INDEX IF NOT EXISTS community_blocks_blocked_idx
  ON community_blocks (blocked_profile_id);

CREATE TABLE IF NOT EXISTS community_conversations (
  id serial PRIMARY KEY,
  profile_one_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  profile_two_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  audience text NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_message_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_conversations_distinct_profiles_check
    CHECK (profile_one_id < profile_two_id),
  CONSTRAINT community_conversations_audience_check
    CHECK (audience IN ('male', 'female')),
  UNIQUE (profile_one_id, profile_two_id)
);

CREATE INDEX IF NOT EXISTS community_conversations_one_recent_idx
  ON community_conversations (profile_one_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS community_conversations_two_recent_idx
  ON community_conversations (profile_two_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS community_direct_messages (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL REFERENCES community_conversations(id) ON DELETE CASCADE,
  sender_profile_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  client_message_id text NOT NULL,
  content text NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at timestamp,
  CONSTRAINT community_direct_messages_client_id_check
    CHECK (
      char_length(client_message_id) BETWEEN 8 AND 80
      AND client_message_id ~ '^[A-Za-z0-9._:-]+$'
    ),
  CONSTRAINT community_direct_messages_content_check
    CHECK (char_length(btrim(content)) BETWEEN 1 AND 1200),
  UNIQUE (sender_profile_id, client_message_id)
);

CREATE INDEX IF NOT EXISTS community_direct_messages_conversation_created_idx
  ON community_direct_messages (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_reports (
  id serial PRIMARY KEY,
  reporter_profile_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  subject_profile_id integer REFERENCES community_profiles(id) ON DELETE SET NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  details text,
  target_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  moderated_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at timestamp,
  CONSTRAINT community_reports_target_type_check
    CHECK (target_type IN ('profile', 'post', 'reply', 'message')),
  CONSTRAINT community_reports_target_id_check
    CHECK (target_id ~ '^[1-9][0-9]*$'),
  CONSTRAINT community_reports_reason_check
    CHECK (
      reason IN (
        'harassment',
        'spam',
        'hate',
        'sexual_content',
        'dangerous_content',
        'impersonation',
        'other'
      )
    ),
  CONSTRAINT community_reports_details_check
    CHECK (details IS NULL OR char_length(details) <= 500),
  CONSTRAINT community_reports_status_check
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS community_reports_status_created_idx
  ON community_reports (status, created_at);
CREATE INDEX IF NOT EXISTS community_reports_reporter_created_idx
  ON community_reports (reporter_profile_id, created_at);

CREATE OR REPLACE FUNCTION prevent_community_audience_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.gender IS DISTINCT FROM NEW.gender THEN
    RAISE EXCEPTION 'community audience is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_profiles_audience_immutable
  ON community_profiles;
CREATE TRIGGER community_profiles_audience_immutable
  BEFORE UPDATE OF gender ON community_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_community_audience_change();

CREATE OR REPLACE FUNCTION enforce_community_post_audience()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  author_audience text;
BEGIN
  SELECT gender INTO author_audience
  FROM community_profiles
  WHERE id = NEW.profile_id;

  IF author_audience IS NULL OR NEW.audience IS DISTINCT FROM author_audience THEN
    RAISE EXCEPTION 'community post audience does not match its author';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_posts_same_audience
  ON community_posts;
CREATE TRIGGER community_posts_same_audience
  BEFORE INSERT OR UPDATE ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_community_post_audience();

CREATE OR REPLACE FUNCTION enforce_community_reply_audience()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  author_audience text;
  post_audience text;
BEGIN
  SELECT gender INTO author_audience
  FROM community_profiles
  WHERE id = NEW.profile_id;

  SELECT audience INTO post_audience
  FROM community_posts
  WHERE id = NEW.post_id;

  IF author_audience IS NULL
    OR post_audience IS NULL
    OR NEW.audience IS DISTINCT FROM author_audience
    OR NEW.audience IS DISTINCT FROM post_audience
  THEN
    RAISE EXCEPTION 'community reply crosses an audience boundary';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_replies_same_audience
  ON community_replies;
CREATE TRIGGER community_replies_same_audience
  BEFORE INSERT OR UPDATE ON community_replies
  FOR EACH ROW
  EXECUTE FUNCTION enforce_community_reply_audience();

CREATE OR REPLACE FUNCTION enforce_community_reaction_audience()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  member_audience text;
  post_audience text;
BEGIN
  SELECT gender INTO member_audience
  FROM community_profiles
  WHERE id = NEW.profile_id;

  SELECT audience INTO post_audience
  FROM community_posts
  WHERE id = NEW.post_id;

  IF member_audience IS NULL
    OR post_audience IS NULL
    OR member_audience IS DISTINCT FROM post_audience
  THEN
    RAISE EXCEPTION 'community reaction crosses an audience boundary';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_likes_same_audience
  ON community_likes;
CREATE TRIGGER community_likes_same_audience
  BEFORE INSERT OR UPDATE ON community_likes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_community_reaction_audience();

DROP TRIGGER IF EXISTS community_reposts_same_audience
  ON community_reposts;
CREATE TRIGGER community_reposts_same_audience
  BEFORE INSERT OR UPDATE ON community_reposts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_community_reaction_audience();

CREATE OR REPLACE FUNCTION enforce_community_connection_audience()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  first_audience text;
  second_audience text;
BEGIN
  SELECT gender INTO first_audience
  FROM community_profiles
  WHERE id = NEW.profile_one_id;

  SELECT gender INTO second_audience
  FROM community_profiles
  WHERE id = NEW.profile_two_id;

  IF first_audience IS NULL
    OR second_audience IS NULL
    OR first_audience IS DISTINCT FROM second_audience
  THEN
    RAISE EXCEPTION 'cross-audience community connection denied';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_connections_same_audience
  ON community_connections;
CREATE TRIGGER community_connections_same_audience
  BEFORE INSERT OR UPDATE ON community_connections
  FOR EACH ROW
  EXECUTE FUNCTION enforce_community_connection_audience();

CREATE OR REPLACE FUNCTION enforce_community_block_audience()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  blocker_audience text;
  blocked_audience text;
BEGIN
  SELECT gender INTO blocker_audience
  FROM community_profiles
  WHERE id = NEW.blocker_profile_id;

  SELECT gender INTO blocked_audience
  FROM community_profiles
  WHERE id = NEW.blocked_profile_id;

  IF blocker_audience IS NULL
    OR blocked_audience IS NULL
    OR blocker_audience IS DISTINCT FROM blocked_audience
  THEN
    RAISE EXCEPTION 'cross-audience community block denied';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_blocks_same_audience
  ON community_blocks;
CREATE TRIGGER community_blocks_same_audience
  BEFORE INSERT OR UPDATE ON community_blocks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_community_block_audience();

CREATE OR REPLACE FUNCTION enforce_community_conversation_audience()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  first_audience text;
  second_audience text;
BEGIN
  SELECT gender INTO first_audience
  FROM community_profiles
  WHERE id = NEW.profile_one_id;

  SELECT gender INTO second_audience
  FROM community_profiles
  WHERE id = NEW.profile_two_id;

  IF first_audience IS NULL
    OR second_audience IS NULL
    OR first_audience IS DISTINCT FROM second_audience
    OR NEW.audience IS DISTINCT FROM first_audience
    OR NOT EXISTS (
      SELECT 1
      FROM community_connections connection
      WHERE connection.profile_one_id = LEAST(NEW.profile_one_id, NEW.profile_two_id)
        AND connection.profile_two_id = GREATEST(NEW.profile_one_id, NEW.profile_two_id)
        AND connection.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1
      FROM community_blocks block
      WHERE (
        block.blocker_profile_id = NEW.profile_one_id
        AND block.blocked_profile_id = NEW.profile_two_id
      ) OR (
        block.blocker_profile_id = NEW.profile_two_id
        AND block.blocked_profile_id = NEW.profile_one_id
      )
    )
  THEN
    RAISE EXCEPTION 'cross-audience community conversation denied';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_conversations_same_audience
  ON community_conversations;
CREATE TRIGGER community_conversations_same_audience
  BEFORE INSERT OR UPDATE ON community_conversations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_community_conversation_audience();

CREATE OR REPLACE FUNCTION enforce_community_message_sender()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM community_conversations conversation
    INNER JOIN community_profiles sender
      ON sender.id = NEW.sender_profile_id
    WHERE conversation.id = NEW.conversation_id
      AND NEW.sender_profile_id IN (
        conversation.profile_one_id,
        conversation.profile_two_id
      )
      AND sender.gender = conversation.audience
  ) THEN
    RAISE EXCEPTION 'community message sender is not an eligible participant';
  END IF;

  IF TG_OP = 'INSERT' AND NOT EXISTS (
    SELECT 1
    FROM community_conversations conversation
    INNER JOIN community_connections connection
      ON connection.profile_one_id = conversation.profile_one_id
      AND connection.profile_two_id = conversation.profile_two_id
      AND connection.status = 'accepted'
    WHERE conversation.id = NEW.conversation_id
      AND NOT EXISTS (
        SELECT 1
        FROM community_blocks block
        WHERE (
          block.blocker_profile_id = conversation.profile_one_id
          AND block.blocked_profile_id = conversation.profile_two_id
        ) OR (
          block.blocker_profile_id = conversation.profile_two_id
          AND block.blocked_profile_id = conversation.profile_one_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'community message requires an active unblocked connection';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_direct_messages_sender_guard
  ON community_direct_messages;
CREATE TRIGGER community_direct_messages_sender_guard
  BEFORE INSERT OR UPDATE ON community_direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_community_message_sender();

COMMIT;
