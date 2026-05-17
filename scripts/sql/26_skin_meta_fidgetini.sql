-- ============================================================================
-- Brainrot Clicker — skin_meta entries for the 4 Fidgetini characters.
--
-- New Fidgetini class — fidget toys + squishies. Three Secret/Mythic drops
-- (#28 Popini Itini, #29 Fidgetini Cubini, #30 Dragini Sqishini) fuse into
-- the Limited #31 La Fidget Combination. Mirrors the Sportini pattern
-- (Stick Stick + No My Pucks + Cupideini Hockini → Los Hockeys).
--
-- Rarity / mult:
--   #28 Popini Itini          · Secret  · 13× · drop
--   #29 Fidgetini Cubini      · Secret  · 15× · drop
--   #30 Dragini Sqishini      · Mythic  · 18× · drop  (first drop-tier Mythic)
--   #31 La Fidget Combination · Limited · 35× · fusion (new top of ladder)
--
-- is_limited = true gates serial-number minting on inventory_grant. Set on
-- the Limited fusion output (#31) AND the Mythic drop (#30) so each #30 mint
-- gets a serial — protects the tier's scarcity narrative since Mythic stays
-- rare even though it's now drop-obtainable.
--
-- Without these rows the skin_gifts → inventory trigger silently drops
-- admin gifts (same bug Auraberry hit before migration 07).
--
-- Idempotent.
-- ============================================================================

INSERT INTO public.skin_meta (skin_id, name, tag, obtain, is_limited)
VALUES
  (28, 'Popini Itini',          'Fidgetini', 'drop',   false),
  (29, 'Fidgetini Cubini',      'Fidgetini', 'drop',   false),
  (30, 'Dragini Sqishini',      'Fidgetini', 'drop',   true),
  (31, 'La Fidget Combination', 'Fidgetini', 'fusion', true)
ON CONFLICT (skin_id) DO UPDATE
  SET name       = EXCLUDED.name,
      tag        = EXCLUDED.tag,
      obtain     = EXCLUDED.obtain,
      is_limited = EXCLUDED.is_limited;

-- Also update LIMITED_SKIN_IDS gate in drop_event_spawn to include #31.
-- Currently gates 22 + 27; #31 must be added so admin can't accidentally
-- put La Fidget Combination in a drop pool (it's fusion-only).
CREATE OR REPLACE FUNCTION public.drop_event_spawn(
  p_admin_username text,
  p_admin_pin text,
  p_name text,
  p_pool jsonb,
  p_baseline_rate_inv int DEFAULT 500,
  p_wave_frequency_min int DEFAULT 10,
  p_wave_duration_sec int DEFAULT 60,
  p_wave_multiplier int DEFAULT 10,
  p_duration_hours int DEFAULT 2,
  p_admin_only boolean DEFAULT true
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event_id uuid;
  v_pool jsonb := '[]'::jsonb;
  v_item jsonb;
  v_skin_id int;
  -- Limited rarity skins. Update when new Limited fusion outputs ship.
  LIMITED_SKIN_IDS constant int[] := ARRAY[22, 27, 31];
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_pool) LOOP
    v_skin_id := (v_item->>'skin_id')::int;
    IF v_skin_id = ANY(LIMITED_SKIN_IDS) THEN
      RAISE EXCEPTION 'LIMITED_NOT_DROPPABLE: skin_id % is a Limited tier skin and cannot go in a drop pool. Use locker_spawn for Limited skins.', v_skin_id
        USING HINT = 'Currently gated: 22 (Hockey Bros), 27 (Los Hockeys), 31 (La Fidget Combination). Update LIMITED_SKIN_IDS when new Limited skins ship.';
    END IF;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_pool) LOOP
    v_pool := v_pool || jsonb_build_array(jsonb_build_object(
      'skin_id', (v_item->>'skin_id')::int,
      'total', (v_item->>'total')::int,
      'remaining', (v_item->>'total')::int
    ));
  END LOOP;

  INSERT INTO public.drop_events
    (name, drop_pool, baseline_rate_inv, wave_frequency_min, wave_duration_sec,
     wave_multiplier, expires_at, admin_only)
  VALUES
    (p_name, v_pool, p_baseline_rate_inv, p_wave_frequency_min, p_wave_duration_sec,
     p_wave_multiplier, now() + (p_duration_hours || ' hours')::interval, p_admin_only)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;
