-- A negative signal is private: it tunes the member's own feed and never
-- creates a public dislike count or a pile-on mechanic.
--
-- Release note:
-- Adds a private show-less preference. Existing posts and public engagement
-- counts remain unchanged.

BEGIN;
CREATE TABLE IF NOT EXISTS community_post_feedback (
  id serial PRIMARY KEY,
  post_id integer NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  profile_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'not_for_me',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_post_feedback_kind_check CHECK (kind = 'not_for_me')
);

CREATE UNIQUE INDEX IF NOT EXISTS community_post_feedback_post_profile_idx
  ON community_post_feedback (post_id, profile_id);

COMMIT;
