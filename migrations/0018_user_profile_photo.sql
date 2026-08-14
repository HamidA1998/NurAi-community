-- Add the optional private account portrait used by Profile and More.
--
-- Release note:
-- Adds a nullable profile-photo field without changing existing accounts. The
-- application validates and size-limits raster data before it reaches storage.

BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "profile_photo" text;

COMMIT;
