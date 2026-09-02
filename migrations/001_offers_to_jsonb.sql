-- =============================================================================
-- Migration: Convert offer1/offer2/offer3 columns to offers JSONB array
-- =============================================================================
-- This migration:
--   1. Adds a new `offers` JSONB column to the `offer` table
--   2. Migrates existing offer1/offer2/offer3 data into the JSONB array
--   3. Adds a GIN index for efficient JSON queries
--   4. Adds a generated `latest_offer_date` column for efficient sorting
--   5. Preserves the old columns until backward compatibility is confirmed
--
-- SAFE: Old columns remain untouched until Step 6 (DROP COLUMN) is uncommented.
-- =============================================================================

-- ─── Step 1: Add the new `offers` JSONB column ────────────────────────────────
ALTER TABLE offer
ADD COLUMN IF NOT EXISTS offers JSONB DEFAULT '[]'::jsonb;

-- ─── Step 2: Migrate existing data into the `offers` JSONB column ──────────────
-- Builds a JSON array per claim from the existing offer1/offer2/offer3 columns.
-- Only includes offers that have an amount (IS NOT NULL).
-- Preserves chronological order: offer1 → offer2 → offer3.

UPDATE offer AS target
SET offers = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'amount', v.amount,
        'date',   TO_CHAR(v.offer_date::date, 'YYYY-MM-DD'),
        'status', v.offer_status
      )
      ORDER BY v.num
    )
    FROM (
      SELECT 1 AS num, t.offer1       AS amount, t.offer1_date   AS offer_date, t.offer1_status AS offer_status
      FROM offer AS t WHERE t.claim_id = target.claim_id AND t.offer1 IS NOT NULL
      UNION ALL
      SELECT 2,       t.offer2,              t.offer2_date,              t.offer2_status
      FROM offer AS t WHERE t.claim_id = target.claim_id AND t.offer2 IS NOT NULL
      UNION ALL
      SELECT 3,       t.offer3,              t.offer3_date,              t.offer3_status
      FROM offer AS t WHERE t.claim_id = target.claim_id AND t.offer3 IS NOT NULL
    ) AS v
  ),
  '[]'::jsonb
);

-- ─── Step 3: Ensure no NULL offers remain ──────────────────────────────────────
UPDATE offer SET offers = '[]'::jsonb WHERE offers IS NULL;

-- ─── Step 4: Add a GIN index for efficient JSON queries ────────────────────────
CREATE INDEX IF NOT EXISTS idx_offer_offers_gin ON offer USING GIN (offers);

-- ─── Step 5: Add a generated column for the latest offer date ──────────────────
-- Extracts the date of the most recent offer (last element in array) for
-- efficient sorting and filtering without scanning the full JSON array.
-- First drop the column if it already exists (idempotent re-run support).
ALTER TABLE offer DROP COLUMN IF EXISTS latest_offer_date;

ALTER TABLE offer
ADD COLUMN latest_offer_date DATE
  GENERATED ALWAYS AS (
    CASE
      WHEN jsonb_array_length(offers) > 0
      THEN (offers->-1->>'date')::date
      ELSE NULL
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_offer_latest_date ON offer (latest_offer_date);

-- ─── Step 6: Verify migration (run manually before proceeding) ─────────────────
-- SELECT
--   claim_id,
--   offers,
--   latest_offer_date,
--   jsonb_array_length(offers) AS num_offers,
--   offers->-1 AS latest_offer
-- FROM offer
-- ORDER BY claim_id
-- LIMIT 20;

-- Expected result: each row has a JSON array with 0-3 offer objects,
-- and latest_offer_date matches the date of the last offer in the array.

-- ─── Step 7: AFTER confirming everything works, drop old columns ───────────────
-- Uncomment the following ONLY after all backend + frontend code has been
-- fully updated to use the new `offers` column:
--
-- ALTER TABLE offer DROP COLUMN IF EXISTS offer1;
-- ALTER TABLE offer DROP COLUMN IF EXISTS offer1_date;
-- ALTER TABLE offer DROP COLUMN IF EXISTS offer1_status;
-- ALTER TABLE offer DROP COLUMN IF EXISTS offer2;
-- ALTER TABLE offer DROP COLUMN IF EXISTS offer2_date;
-- ALTER TABLE offer DROP COLUMN IF EXISTS offer2_status;
-- ALTER TABLE offer DROP COLUMN IF EXISTS offer3;
-- ALTER TABLE offer DROP COLUMN IF EXISTS offer3_date;
-- ALTER TABLE offer DROP COLUMN IF EXISTS offer3_status;

-- =============================================================================
-- EXPECTED FINAL SCHEMA:
--   offer.claim_id           TEXT / VARCHAR  (primary key or unique)
--   offer.offers             JSONB           -- array of {amount, date, status}
--   offer.status             TEXT            -- overall offer status (preserved)
--   offer.seen               BOOLEAN         -- seen flag (preserved)
--   offer.latest_offer_date  DATE            -- generated, for efficient sorting
--
-- JSONB array element format:
--   { "amount": 10500.00, "date": "2026-07-15", "status": "paid" }
-- =============================================================================
