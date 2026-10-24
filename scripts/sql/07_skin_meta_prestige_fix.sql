-- ============================================================================
-- Brainrot Clicker — Phase 5 patch: skin_meta correctness for prestige skins.
--
-- Bug: Admin Hub's "Give Skin" inserts into public.skin_gifts, which fires
-- the skin_gifts_to_inventory() trigger. That trigger looks up the skin by
-- name in public.skin_meta to find a skin_id, then mints an inventory row
-- via inventory_grant. If the lookup misses (skin_meta missing the row, or
-- the stored name doesn't match), the trigger RETURNs silently — no
-- inventory row, gift effectively lost.
--
-- skin_meta state at the time of writing:
--   skin_id=23 → name='Sushiro & Soyaro'   ✓
--   skin_id=24 → name='Kinguru Orange'     ✗ (CHARACTERS calls it 'Kingurini Orangini')
--   skin_id=25 → MISSING                   ✗
--
-- Fix:
--   1. UPSERT correct rows for skins 23/24/25
--   2. Retro-grant Auraberry to emoney (the player who hit the bug)
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ---------- 1. Patch skin_meta ----------
INSERT INTO public.skin_meta (skin_id, name, tag, obtain, is_limited) VALUES
  (23, 'Sushiro & Soyaro',   'Sushini',   'prestige', true),
  (24, 'Kingurini Orangini', 'Kingurini', 'prestige', true),
  (25, 'Auraberry',          'Auraberry', 'prestige', true)
ON CONFLICT (skin_id) DO UPDATE
  SET name       = EXCLUDED.name,
      tag        = EXCLUDED.tag,
      obtain     = EXCLUDED.obtain,
      is_limited = EXCLUDED.is_limited;

-- ---------- 2. Retro-grant the missing Auraberry to emoney ----------
-- inventory_grant is SECURITY DEFINER and idempotent on the (player, skin)
-- key for stackable skins, but Auraberry is_limited=true so it will mint a
-- new serial-numbered row. Skip if the player already has any Auraberry.
DO $$
DECLARE
  v_pid uuid;
  v_existing int;
BEGIN
  SELECT id INTO v_pid FROM public.players WHERE LOWER(username) = 'emoney' LIMIT 1;
  IF v_pid IS NULL THEN RETURN; END IF;
  SELECT COUNT(*) INTO v_existing FROM public.inventory WHERE player_id = v_pid AND skin_id = 25;
  IF v_existing = 0 THEN
    PERFORM public.inventory_grant(v_pid, 25, 'gift', NULL);
  END IF;
END$$;
