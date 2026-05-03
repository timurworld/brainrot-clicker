-- ============================================================================
-- Brainrot Clicker — Phase 7: skin_meta entry for Los Hockeys (#27).
--
-- New Limited tier Sportini skin. Top of the Limited tier at 30×.
-- Output of the 3-skin fusion: Stick Stick (#20) + No My Pucks (#21) +
-- Cupideini Hockini (#26) → Los Hockeys (#27).
--
-- Without this row the skin_gifts→inventory trigger silently drops admin
-- gifts (same bug Auraberry hit before migration 07, and Cupideini Hockini
-- before migration 16). is_limited = true so inventory_grant assigns a
-- serial number on each mint.
--
-- Idempotent.
-- ============================================================================

INSERT INTO public.skin_meta (skin_id, name, tag, obtain, is_limited)
VALUES (27, 'Los Hockeys', 'Sportini', 'fusion', true)
ON CONFLICT (skin_id) DO UPDATE
  SET name       = EXCLUDED.name,
      tag        = EXCLUDED.tag,
      obtain     = EXCLUDED.obtain,
      is_limited = EXCLUDED.is_limited;
