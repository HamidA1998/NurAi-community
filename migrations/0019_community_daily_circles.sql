-- Daily Circles: small same-audience groups for a daily shared check-in.
--
-- Release note:
-- A circle is capped, invite-code joined, and locked to its creator's
-- audience the same way posts/connections/DMs already are. Members post at
-- most one check-in per circle per day; the circle's streak is derived from
-- that history, not from any client-local state.

BEGIN;

CREATE TABLE IF NOT EXISTS community_circles (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  audience text NOT NULL,
  created_by_profile_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  invite_code text NOT NULL,
  member_cap integer NOT NULL DEFAULT 8,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_circles_audience_check
    CHECK (audience IN ('male', 'female')),
  CONSTRAINT community_circles_name_check
    CHECK (char_length(name) BETWEEN 2 AND 60),
  CONSTRAINT community_circles_member_cap_check
    CHECK (member_cap BETWEEN 2 AND 12),
  CONSTRAINT community_circles_invite_code_check
    CHECK (invite_code ~ '^[A-Z0-9]{6,10}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS community_circles_invite_code_idx
  ON community_circles (invite_code);

CREATE TABLE IF NOT EXISTS community_circle_members (
  id serial PRIMARY KEY,
  circle_id integer NOT NULL REFERENCES community_circles(id) ON DELETE CASCADE,
  profile_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_circle_members_role_check
    CHECK (role IN ('owner', 'member')),
  UNIQUE (circle_id, profile_id)
);

CREATE INDEX IF NOT EXISTS community_circle_members_profile_idx
  ON community_circle_members (profile_id);
CREATE INDEX IF NOT EXISTS community_circle_members_circle_idx
  ON community_circle_members (circle_id);

CREATE TABLE IF NOT EXISTS community_circle_checkins (
  id serial PRIMARY KEY,
  circle_id integer NOT NULL REFERENCES community_circles(id) ON DELETE CASCADE,
  profile_id integer NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_circle_checkins_content_check
    CHECK (char_length(content) <= 280),
  UNIQUE (circle_id, profile_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS community_circle_checkins_circle_date_idx
  ON community_circle_checkins (circle_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS community_circle_checkins_profile_idx
  ON community_circle_checkins (profile_id, checkin_date DESC);

-- A circle's own audience never moves once created (same immutability
-- pattern as community_profiles.gender).
CREATE OR REPLACE FUNCTION prevent_circle_audience_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.audience IS DISTINCT FROM NEW.audience THEN
    RAISE EXCEPTION 'community circle audience is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_circles_audience_immutable
  ON community_circles;
CREATE TRIGGER community_circles_audience_immutable
  BEFORE UPDATE OF audience ON community_circles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circle_audience_change();

-- A member can only join a circle whose audience matches their own —
-- enforced here, not just filtered in the client.
CREATE OR REPLACE FUNCTION enforce_circle_member_audience()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  member_audience text;
  circle_audience text;
BEGIN
  SELECT gender INTO member_audience
  FROM community_profiles
  WHERE id = NEW.profile_id;

  SELECT audience INTO circle_audience
  FROM community_circles
  WHERE id = NEW.circle_id;

  IF member_audience IS NULL OR circle_audience IS NULL
     OR member_audience IS DISTINCT FROM circle_audience THEN
    RAISE EXCEPTION 'community circle membership requires a matching audience';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_circle_members_same_audience
  ON community_circle_members;
CREATE TRIGGER community_circle_members_same_audience
  BEFORE INSERT OR UPDATE ON community_circle_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_circle_member_audience();

-- A check-in can only be posted by a current member of that circle.
CREATE OR REPLACE FUNCTION enforce_circle_checkin_membership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM community_circle_members
    WHERE circle_id = NEW.circle_id AND profile_id = NEW.profile_id
  ) THEN
    RAISE EXCEPTION 'only circle members may post a check-in';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_circle_checkins_membership_guard
  ON community_circle_checkins;
CREATE TRIGGER community_circle_checkins_membership_guard
  BEFORE INSERT ON community_circle_checkins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_circle_checkin_membership();

COMMIT;
