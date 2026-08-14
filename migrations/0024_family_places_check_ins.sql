-- Add consent-led Family Circle places and current check-ins.
--
-- Release note:
-- Places are family-defined labels. Check-ins are upserted to one current
-- record per member, so this migration does not create a location history.
-- Coordinates are nullable and are only accepted for an explicit,
-- time-limited location share from the member.

BEGIN;

CREATE TABLE IF NOT EXISTS family_places (
  id serial PRIMARY KEY,
  group_id integer NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  created_by varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'custom',
  address text,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS family_places_group_created_idx
  ON family_places (group_id, created_at);

CREATE INDEX IF NOT EXISTS family_places_creator_idx
  ON family_places (created_by);

CREATE TABLE IF NOT EXISTS family_check_ins (
  id serial PRIMARY KEY,
  group_id integer NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id integer REFERENCES family_places(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'safe',
  location_label text NOT NULL,
  latitude real,
  longitude real,
  accuracy_meters real,
  expires_at timestamp,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS family_check_ins_group_user_idx
  ON family_check_ins (group_id, user_id);

CREATE INDEX IF NOT EXISTS family_check_ins_group_updated_idx
  ON family_check_ins (group_id, updated_at);

CREATE INDEX IF NOT EXISTS family_check_ins_expires_idx
  ON family_check_ins (expires_at);

COMMIT;
