-- Server-owned subscription entitlement cache.
--
-- Release note:
-- RevenueCat remains the external purchase provider, but NurAI stores the last
-- verified server-side entitlement decision so temporary provider outages do
-- not immediately remove access for previously verified paid users.

BEGIN;

CREATE TABLE IF NOT EXISTS subscription_entitlements (
  user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free',
  source text NOT NULL DEFAULT 'revenuecat',
  entitlement_expires_at timestamp,
  cache_expires_at timestamp NOT NULL,
  stale_until_at timestamp NOT NULL,
  checked_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE subscription_entitlements
  ADD COLUMN IF NOT EXISTS entitlement_expires_at timestamp,
  ADD COLUMN IF NOT EXISTS cache_expires_at timestamp,
  ADD COLUMN IF NOT EXISTS stale_until_at timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_entitlements_user_idx
  ON subscription_entitlements (user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscription_entitlements'
      AND column_name = 'expires_at'
  ) THEN
    UPDATE subscription_entitlements
    SET entitlement_expires_at = COALESCE(entitlement_expires_at, expires_at)
    WHERE entitlement_expires_at IS NULL;
  END IF;
END $$;

UPDATE subscription_entitlements
SET cache_expires_at = COALESCE(
    cache_expires_at,
    checked_at + INTERVAL '5 minutes',
    CURRENT_TIMESTAMP + INTERVAL '5 minutes'
  );

UPDATE subscription_entitlements
SET stale_until_at = COALESCE(
    stale_until_at,
    CASE
      WHEN tier IN ('premium', 'scholar') THEN LEAST(
        COALESCE(entitlement_expires_at, checked_at + INTERVAL '24 hours'),
        checked_at + INTERVAL '24 hours'
      )
      ELSE cache_expires_at
    END,
    CURRENT_TIMESTAMP + INTERVAL '5 minutes'
  );

ALTER TABLE subscription_entitlements
  ALTER COLUMN cache_expires_at SET NOT NULL,
  ALTER COLUMN stale_until_at SET NOT NULL;

COMMIT;
