-- ============================================================================
-- Brainrot Clicker — skin_meta entry for Stressini Ballini (#33).
--
-- 5th Fidgetini drop. Blue stress ball squishy with face + arms + legs.
-- Slots between Popini Itini (#28, 13×) and Fidgetini Cubini (#29, 15×)
-- at 14×.
--
-- Rarity Secret, obtain 'drop', not is_limited — same shape as the other
-- Secret Fidgetini drops (#28 Popini, #29 Cubini, #32 Spinirino).
--
-- Without this row the skin_gifts → inventory trigger silently drops admin
-- gifts (same bug Auraberry hit before migration 07).
--
-- Idempotent.
-- ============================================================================

INSERT INTO public.skin_meta (skin_id, name, tag, obtain, is_limited)
VALUES (33, 'Stressini Ballini', 'Fidgetini', 'drop', false)
ON CONFLICT (skin_id) DO UPDATE
  SET name       = EXCLUDED.name,
      tag        = EXCLUDED.tag,
      obtain     = EXCLUDED.obtain,
      is_limited = EXCLUDED.is_limited;
