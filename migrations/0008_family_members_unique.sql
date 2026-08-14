-- Prevent duplicate family memberships under concurrent invite acceptance.
--
-- Release note:
-- Route logic already checks membership before insert. This unique index makes
-- the same invariant durable at the database layer so races cannot create
-- duplicate group members.

BEGIN;

DELETE FROM family_members
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY group_id, user_id
        ORDER BY joined_at ASC, id ASC
      ) AS duplicate_rank
    FROM family_members
  ) ranked
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS family_members_group_user_idx
  ON family_members (group_id, user_id);

COMMIT;
