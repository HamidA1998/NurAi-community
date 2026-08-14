-- Record production release migration hashes.
--
-- Release note:
-- The production migration runner writes every applied migration file hash into
-- this table so release checks can prove the live database matches the reviewed
-- SQL files.

BEGIN;

CREATE TABLE IF NOT EXISTS "nurai_migration_audit" (
  "migration_id" text PRIMARY KEY,
  "file_path" text NOT NULL,
  "file_sha256" text NOT NULL,
  "file_bytes" integer NOT NULL,
  "script_version" text NOT NULL,
  "applied_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "nurai_migration_audit_applied_at_idx"
  ON "nurai_migration_audit" ("applied_at");

COMMIT;
