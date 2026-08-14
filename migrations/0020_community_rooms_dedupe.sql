-- Community boards (community_rooms) were seeded twice in production, leaving
-- every board duplicated (Quran, Salah, Duas & Adhkar, … each appeared twice
-- in the Boards list). There is no code path that inserts rooms, so this is a
-- one-off data repair plus a guard so a future re-seed cannot duplicate again.
--
-- Release note:
-- Repoints posts before removing only duplicate room rows, then makes room
-- names unique so the same production repair is safe and cannot recur.

BEGIN;

-- 1. Repoint any posts on a duplicate board to the canonical (lowest-id) board
--    of the same name, so the subsequent delete never cascade-drops a post.
UPDATE community_posts p
SET room_id = canon.min_id
FROM community_rooms r
JOIN (
  SELECT name, MIN(id) AS min_id FROM community_rooms GROUP BY name
) canon ON canon.name = r.name
WHERE p.room_id = r.id
  AND r.id <> canon.min_id;

-- 2. Delete the duplicate boards, keeping the lowest id per name.
DELETE FROM community_rooms r
USING (
  SELECT name, MIN(id) AS min_id FROM community_rooms GROUP BY name
) canon
WHERE r.name = canon.name
  AND r.id <> canon.min_id;

-- 3. Prevent recurrence — a board name is unique. Guarded so re-runs are safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_rooms_name_unique'
  ) THEN
    ALTER TABLE community_rooms
      ADD CONSTRAINT community_rooms_name_unique UNIQUE (name);
  END IF;
END $$;

COMMIT;
