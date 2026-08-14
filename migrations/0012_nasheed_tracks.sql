-- Server-backed owned/licensed nasheed catalogue.
--
-- Release note:
-- The app reads active nasheed tracks from this table, so NurAI can add,
-- reorder, feature, or remove owned/licensed audio without shipping a new
-- mobile build.

BEGIN;

CREATE TABLE IF NOT EXISTS nasheed_tracks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  artist text NOT NULL DEFAULT 'NurAI Originals',
  duration text NOT NULL DEFAULT '--:--',
  category text NOT NULL,
  audio_url text NOT NULL,
  fallback_url text,
  cover_url text,
  source_type text NOT NULL DEFAULT 'owned',
  license_label text NOT NULL DEFAULT 'NurAI owned/licensed audio',
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS nasheed_tracks_slug_idx
  ON nasheed_tracks (slug);

CREATE INDEX IF NOT EXISTS nasheed_tracks_active_sort_idx
  ON nasheed_tracks (is_active, sort_order, title);

CREATE INDEX IF NOT EXISTS nasheed_tracks_category_idx
  ON nasheed_tracks (category);

COMMIT;
