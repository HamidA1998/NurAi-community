-- Private, same-audience direct-message images. The bytes are never exposed in
-- list responses: clients retrieve them through an authenticated conversation
-- route after the same connection, block and audience checks used for text.
--
-- Release note:
-- Adds bounded, private image storage for accepted same-audience direct
-- conversations. No existing messages or member data are changed.

BEGIN;
CREATE TABLE IF NOT EXISTS community_direct_message_media (
  id serial PRIMARY KEY,
  message_id integer NOT NULL REFERENCES community_direct_messages(id) ON DELETE CASCADE,
  owner_profile_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  mime_type text NOT NULL,
  byte_size integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  alt_text text NOT NULL DEFAULT 'Shared image',
  sha256 text NOT NULL,
  base64_data text NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_direct_message_media_mime_check CHECK (mime_type = 'image/jpeg'),
  CONSTRAINT community_direct_message_media_size_check CHECK (byte_size > 0 AND byte_size <= 786432),
  CONSTRAINT community_direct_message_media_dimensions_check CHECK (
    width BETWEEN 1 AND 2048 AND height BETWEEN 1 AND 2048
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS community_direct_message_media_message_idx
  ON community_direct_message_media (message_id);
CREATE INDEX IF NOT EXISTS community_direct_message_media_owner_idx
  ON community_direct_message_media (owner_profile_id);

COMMIT;
