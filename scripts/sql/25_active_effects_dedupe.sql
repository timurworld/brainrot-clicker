-- ============================================================================
-- Brainrot Clicker — dedupe + lock down active_effects.
--
-- Bug: the admin DJ toggle does select-then-insert/update keyed by row id.
-- The select uses .maybeSingle(), which errors out when multiple rows exist
-- for the same (game_id, effect_id) and the JS code didn't catch the error,
-- so it fell through to INSERT. Every click added a new row instead of
-- updating, and the original stale row could never be turned off via the UI.
-- 339 rows had accumulated, including a disco row that stayed active=true
-- through dozens of toggles, leaving the floor stuck on for everyone.
--
-- This migration:
--   1. Collapses duplicates — keeps the most-recently-touched row per
--      (game_id, effect_id), deletes the rest.
--   2. Forces all surviving rows to active=false so we start from a clean
--      state. (The kill from the JS one-shot already did this for brainrot,
--      but the constraint is safe to apply globally.)
--   3. Adds a UNIQUE constraint on (game_id, effect_id) so the toggle can
--      use UPSERT and a duplicate row is rejected at the DB level.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ---------- 1. Dedupe ----------
-- For each (game_id, effect_id), keep the row with the latest started_at
-- (falling back to id for stable ordering when started_at ties or is null).
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY game_id, effect_id
           ORDER BY started_at DESC NULLS LAST, id DESC
         ) AS rn
    FROM public.active_effects
)
DELETE FROM public.active_effects ae
 USING ranked
 WHERE ae.id = ranked.id AND ranked.rn > 1;

-- ---------- 2. Force-clear surviving rows ----------
UPDATE public.active_effects SET active = false WHERE active = true;

-- ---------- 3. Unique constraint on (game_id, effect_id) ----------
-- Now that dupes are gone we can enforce this. Future inserts that collide
-- will hit ON CONFLICT and either raise or upsert depending on the caller.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'active_effects_game_effect_unique'
       AND conrelid = 'public.active_effects'::regclass
  ) THEN
    ALTER TABLE public.active_effects
      ADD CONSTRAINT active_effects_game_effect_unique
      UNIQUE (game_id, effect_id);
  END IF;
END $$;
