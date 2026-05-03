-- ============================================================================
-- Brainrot Clicker — drop_event_spawn: hard server-side gate on Limited skins.
--
-- The admin hub UI already filters Limited skins out of the picker
-- (Timur Admin Hub/app/brainrot/components/SpawnDropEvent.tsx) but the SQL
-- function still trusted the caller — anyone with admin creds calling the
-- RPC directly could spawn a drop event with a Limited skin in the pool,
-- bypassing the UI gate. This migration adds an EXCEPTION raise in the
-- function body so the gate holds at the database level too.
--
-- Limited skins are tracked by id in a hardcoded list inside the function
-- because the existing skin_meta table doesn't store rarity (is_limited is
-- about minting serial numbers, not about Limited rarity tier — Mythic
-- Cupideini Hockini also has is_limited=true). Update LIMITED_SKIN_IDS
-- whenever a new Limited tier skin ships.
--
-- Currently gated: 22 Hockey Bros, 27 Los Hockeys.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.drop_event_spawn(
  p_admin_username text,
  p_admin_pin text,
  p_name text,
  p_pool jsonb,                            -- [{"skin_id": 20, "total": 300}, ...]
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
  -- Limited rarity tier skin ids — update this list when new Limited skins
  -- are added to src/App.jsx CHARACTERS. Mirrors the gate in
  -- SpawnDropEvent.tsx ALL_SKINS comment.
  LIMITED_SKIN_IDS constant int[] := ARRAY[22, 27];
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);

  -- Reject Limited skins in the pool. Limited stays exclusive to fusion
  -- lockers (locker_spawn) — drops would dilute scarcity.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_pool) LOOP
    v_skin_id := (v_item->>'skin_id')::int;
    IF v_skin_id = ANY(LIMITED_SKIN_IDS) THEN
      RAISE EXCEPTION 'LIMITED_NOT_DROPPABLE: skin_id % is a Limited tier skin and cannot go in a drop pool. Use locker_spawn for Limited skins.', v_skin_id
        USING HINT = 'Currently gated: 22 (Hockey Bros), 27 (Los Hockeys). Update the LIMITED_SKIN_IDS array in this function when new Limited skins ship.';
    END IF;
  END LOOP;

  -- Normalize pool entries: total → remaining starts equal.
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
