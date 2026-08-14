-- Durable Library Source QA review events.
--
-- Release note:
-- Scholar-plan source approvals need a server-side audit trail so source
-- review evidence is tied to authenticated users rather than local device
-- state.

BEGIN;

CREATE TABLE IF NOT EXISTS "library_source_review_events" (
  "id" serial PRIMARY KEY,
  "book_id" text NOT NULL,
  "chapter_id" text NOT NULL,
  "decision" text NOT NULL,
  "reviewer_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "reviewer_plan" text NOT NULL,
  "reviewer_label" text NOT NULL,
  "note" text,
  "source_fingerprint" text NOT NULL,
  "source_issue_count" integer NOT NULL DEFAULT 0,
  "source_count" integer NOT NULL DEFAULT 0,
  "verified_source_count" integer NOT NULL DEFAULT 0,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "library_source_review_events_chapter_created_idx"
  ON "library_source_review_events" ("book_id", "chapter_id", "created_at");

CREATE INDEX IF NOT EXISTS "library_source_review_events_reviewer_created_idx"
  ON "library_source_review_events" ("reviewer_id", "created_at");

CREATE INDEX IF NOT EXISTS "library_source_review_events_fingerprint_idx"
  ON "library_source_review_events" ("source_fingerprint");

COMMIT;
