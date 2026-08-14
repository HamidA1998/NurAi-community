-- Add durable audit records for family group and invitation mutations.
--
-- Release note:
-- Family email delivery remains intentionally disabled until a verified email
-- provider exists. This table provides the server-side audit trail required
-- before any future invite delivery channel can be enabled.

BEGIN;

CREATE TABLE IF NOT EXISTS family_audit_events (
  id serial PRIMARY KEY,
  action text NOT NULL,
  actor_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id integer REFERENCES family_groups(id) ON DELETE SET NULL,
  invitation_id integer REFERENCES family_invitations(id) ON DELETE SET NULL,
  target_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS family_audit_events_group_created_idx
  ON family_audit_events (group_id, created_at);

CREATE INDEX IF NOT EXISTS family_audit_events_actor_created_idx
  ON family_audit_events (actor_id, created_at);

CREATE INDEX IF NOT EXISTS family_audit_events_invitation_idx
  ON family_audit_events (invitation_id);

COMMIT;
