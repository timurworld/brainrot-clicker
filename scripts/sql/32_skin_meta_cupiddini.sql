-- ============================================================================
-- Brainrot Clicker — skin_meta for the Cupiddini hockey pair (ids 47-48).
--
--   #47 Cupiddini Cyberini   Mythic  700M   28x   neon, crystal wings
--   #48 Cupiddini Divinini   Divine    3B   45x   gold, crowned
--
-- Both are points unlocks, so neither is serial-tracked. Divinini is the
-- first permanent Divine -- the tier was Halloween-only until now -- and is
-- gated out of drop pools in migration 33 below for the same reason the
-- other Divines are: it must be earned at its threshold, not handed out.
--
-- Without these rows the skin_gifts -> inventory trigger silently discards
-- any admin gift of them.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

INSERT INTO public.skin_meta (skin_id, name, tag, obtain, is_limited)
VALUES
  (47, 'Cupiddini Cyberini', 'Sportini', 'points', false),
  (48, 'Cupiddini Divinini', 'Sportini', 'points', false)
ON CONFLICT (skin_id) DO UPDATE
  SET name       = EXCLUDED.name,
      tag        = EXCLUDED.tag,
      obtain     = EXCLUDED.obtain,
      is_limited = EXCLUDED.is_limited;

-- Add 48 to the drop-pool gate. Base is migration 31; only the array changes.
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
  LIMITED_SKIN_IDS constant int[] := ARRAY[22, 27, 31, 40, 45, 46, 48];
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_pool) LOOP
    v_skin_id := (v_item->>'skin_id')::int;
    IF v_skin_id = ANY(LIMITED_SKIN_IDS) THEN
      RAISE EXCEPTION 'LIMITED_NOT_DROPPABLE: skin_id % is a Limited or Divine tier skin and cannot go in a drop pool.', v_skin_id
        USING HINT = 'Gated: 22, 27, 31, 40 (Limited fusions) and 45, 46, 48 (Divine).';
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

-- Verify: expect 45.
SELECT count(*) AS skin_meta_rows FROM public.skin_meta;
