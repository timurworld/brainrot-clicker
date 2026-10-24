-- ============================================================================
-- Brainrot Clicker — admin tooling catch-up for every shipped character.
--
-- Audit of the live DB against the roster found three gaps, each of which
-- fails silently rather than erroring:
--
--  1. skin_meta had 35 rows against a 43-character roster. Ids 34-41 (the
--     Lovini/Summerini batch) were missing, so the skin_gifts -> inventory
--     trigger discards any admin gift of them -- it looks the skin up by name
--     in skin_meta and returns early when it finds nothing.
--
--  2. drop_event_spawn gates Limited/Divine ids out of drop pools, but the
--     live list is [22, 27, 31, 45, 46]. It is missing 40 (Lovini Vibini),
--     the new Limited fusion, so an admin could put it in a drop pool and
--     bypass its fusion requirement.
--
--  3. locker_spawn only allows fusion outputs [22, 26, 27]. It is missing 31
--     (La Fidget Combination) and 40 (Lovini Vibini), so admins cannot build
--     a locker for either -- 31 has been unbuildable since the Fidgetini
--     batch shipped.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ---------- 1. Missing skin_meta rows (ids 34-41) ----------
INSERT INTO public.skin_meta (skin_id, name, tag, obtain, is_limited)
VALUES
  (34, 'Bobini Lovini',      'Lovini',    'points', false),
  (35, 'Cappy Family',       'Lovini',    'points', false),
  (36, 'Chillen Lemonade',   'Summerini', 'points', false),
  (37, 'Cupcakini Sweetini', 'Lovini',    'points', false),
  (38, 'Cuppini Triondini',  'Summerini', 'points', false),
  (39, 'Lemon Lemon Sahur',  'Summerini', 'points', false),
  (40, 'Lovini Vibini',      'Lovini',    'fusion', true),
  (41, 'Toastini Butterini', 'Lovini',    'points', false)
ON CONFLICT (skin_id) DO UPDATE
  SET name       = EXCLUDED.name,
      tag        = EXCLUDED.tag,
      obtain     = EXCLUDED.obtain,
      is_limited = EXCLUDED.is_limited;

-- ---------- 2. Drop-pool gate: add 40 ----------
-- Base is migration 30's definition; only LIMITED_SKIN_IDS changes.
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
  -- Limited fusion outputs plus the Divine seasonal tier.
  LIMITED_SKIN_IDS constant int[] := ARRAY[22, 27, 31, 40, 45, 46];
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_pool) LOOP
    v_skin_id := (v_item->>'skin_id')::int;
    IF v_skin_id = ANY(LIMITED_SKIN_IDS) THEN
      RAISE EXCEPTION 'LIMITED_NOT_DROPPABLE: skin_id % is a Limited or Divine tier skin and cannot go in a drop pool.', v_skin_id
        USING HINT = 'Gated: 22 Hockey Bros, 27 Los Hockeys, 31 La Fidget Combination, 40 Lovini Vibini, 45 Vampire Dragini, 46 Headlessini Pumpkini. Limited skins use locker_spawn; Divine skins are points-unlocked only.';
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

-- ---------- 3. Locker outputs: add 31 and 40 ----------
-- Base is migration 23's definition; only FUSION_OUTPUT_SKIN_IDS changes.
CREATE OR REPLACE FUNCTION public.locker_spawn(
  p_admin_username text,
  p_admin_pin text,
  p_name text,
  p_recipe jsonb,
  p_output_skin_id int,
  p_total_stock int,
  p_duration_hours int DEFAULT 2,
  p_admin_only boolean DEFAULT true
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_locker_id uuid;
  -- Fusion-only tier skin ids (Limited + the fusion Mythic). Update when new
  -- Limited/Mythic fusion outputs ship.
  FUSION_OUTPUT_SKIN_IDS constant int[] := ARRAY[22, 26, 27, 31, 40];
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);

  IF p_total_stock < 1 THEN RAISE EXCEPTION 'BAD_STOCK'; END IF;

  IF NOT (p_output_skin_id = ANY(FUSION_OUTPUT_SKIN_IDS)) THEN
    RAISE EXCEPTION 'OUTPUT_NOT_FUSION_TIER: skin_id % is not a fusion-tier skin. Locker output must be one of: %', p_output_skin_id, FUSION_OUTPUT_SKIN_IDS
      USING HINT = 'Allowed: 22 Hockey Bros, 26 Cupideini Hockini, 27 Los Hockeys, 31 La Fidget Combination, 40 Lovini Vibini.';
  END IF;

  INSERT INTO public.lockers
    (name, recipe, output_skin_id, total_stock, remaining_stock,
     expires_at, admin_only)
  VALUES
    (p_name, p_recipe, p_output_skin_id, p_total_stock, p_total_stock,
     now() + (p_duration_hours || ' hours')::interval, p_admin_only)
  RETURNING id INTO v_locker_id;

  RETURN v_locker_id;
END;
$$;

-- Verify: expect 43 rows, and no roster id missing.
SELECT count(*) AS skin_meta_rows FROM public.skin_meta;
