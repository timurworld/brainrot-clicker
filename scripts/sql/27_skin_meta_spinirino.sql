-- ============================================================================
-- Brainrot Clicker — skin_meta entry for Spinirino (#32).
--
-- 4th Fidgetini drop. Red fidget spinner with face + legs. Sits between
-- Fidgetini Cubini (#29, 15×) and Dragini Sqishini (#30, 18×) on the
-- multiplier ladder at 16×.
--
-- Rarity Secret, obtain 'drop', not is_limited — same shape as the other
-- two Secret Fidgetini drops (#28 Popini Itini, #29 Fidgetini Cubini).
--
-- Without this row the skin_gifts → inventory trigger silently drops admin
-- gifts (same bug Auraberry hit before migration 07).
--
-- Idempotent.
-- ============================================================================

INSERT INTO public.skin_meta (skin_id, name, tag, obtain, is_limited)
VALUES (32, 'Spinirino', 'Fidgetini', 'drop', false)
ON CONFLICT (skin_id) DO UPDATE
  SET name       = EXCLUDED.name,
      tag        = EXCLUDED.tag,
      obtain     = EXCLUDED.obtain,
      is_limited = EXCLUDED.is_limited;
