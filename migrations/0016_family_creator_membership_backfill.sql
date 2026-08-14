-- Backfill missing Family Circle creator memberships.
--
-- Older or interrupted group-creation flows can leave a family_groups row where
-- the creator exists but the matching family_members row is missing. The API now
-- self-heals that state, and this migration repairs existing production data so
-- creators can fetch progress and send messages in their own family circle.
--
-- Release note:
-- Restores missing Family Circle creator memberships without deleting or changing
-- existing members, messages, goals, duas, or travel updates.

BEGIN;

INSERT INTO family_members (group_id, user_id, role)
SELECT
  family_groups.id,
  family_groups.creator_id,
  'creator'
FROM family_groups
WHERE NOT EXISTS (
  SELECT 1
  FROM family_members
  WHERE family_members.group_id = family_groups.id
    AND family_members.user_id = family_groups.creator_id
);

COMMIT;
