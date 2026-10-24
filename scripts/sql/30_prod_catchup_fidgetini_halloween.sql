-- ============================================================================
-- Brainrot Clicker — production catch-up: Fidgetini batch + Halloween 2026.
--
-- WHY THIS EXISTS
-- A read of the live project (eztmcfghqeheiamhyner) on 2026-10-23 found
-- skin_meta holding 24 rows covering skin_ids 1-27 only. Migrations 26, 27
-- and 28 — the Fidgetini batch, skin_ids 28-33 — were never applied there,
-- even though those skins have been shipping in the client. Any admin gift
-- of a Fidgetini skin has been silently dropped by the skin_gifts →
-- inventory trigger ever since (the same bug Auraberry hit before 07).
--
-- So this file supersedes 26, 27, 28 and 29: run THIS one and prod is fully
-- current. Running the others afterwards is harmless — every statement is
-- idempotent — but unnecessary.
--
-- Fidgetini (ids 28-33), from migrations 26 / 27 / 28:
--   #28 Popini Itini          · Secret  · 13× · drop
--   #29 Fidgetini Cubini      · Secret  · 15× · drop
--   #30 Dragini Sqishini      · Mythic  · 18× · drop   (serial-tracked)
--   #31 La Fidget Combination · Limited · 35× · fusion (serial-tracked)
--   #32 Spinirino             · Secret  · 16× · drop
--   #33 Stressini Ballini     · Secret  · 14× · drop
--
-- Halloween 2026 (ids 42-46) — limited seasonal collection. Points-unlocked;
-- they stop unlocking after Nov 2 2026 23:59 Pacific (HALLOWEEN_2026_END in
-- src/App.jsx). Already-unlocked skins stay owned forever, so nothing here
-- expires server side.
--   #42 Candini Bucketini     · Common    ·   5M · 8×
--   #43 Ghostini Mechini      · Epic      · 150M · 16×
--   #44 Frankenstini Squalini · Legendary · 500M · 22×
--   #45 Vampire Dragini       · Divine    ·   2B · 28×  (serial-tracked)
--   #46 Headlessini Pumpkini  · Divine    ·   5B · 32×  (serial-tracked,
--                                                        hardest in game)
--
-- is_limited = true gates serial-number minting on inventory_grant. Set on
-- the two Divine skins for the same reason the Mythic drop #30 has it: the
-- tier is meant to stay scarce even though it is points-obtainable.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

INSERT INTO public.skin_meta (skin_id, name, tag, obtain, is_limited)
VALUES
  -- Fidgetini — missing from prod, from migrations 26 / 27 / 28
  (28, 'Popini Itini',          'Fidgetini',      'drop',   false),
  (29, 'Fidgetini Cubini',      'Fidgetini',      'drop',   false),
  (30, 'Dragini Sqishini',      'Fidgetini',      'drop',   true),
  (31, 'La Fidget Combination', 'Fidgetini',      'fusion', true),
  (32, 'Spinirino',             'Fidgetini',      'drop',   false),
  (33, 'Stressini Ballini',     'Fidgetini',      'drop',   false),
  -- Halloween 2026
  (42, 'Candini Bucketini',     'Halloween 2026', 'points', false),
  (43, 'Ghostini Mechini',      'Halloween 2026', 'points', false),
  (44, 'Frankenstini Squalini', 'Halloween 2026', 'points', false),
  (45, 'Vampire Dragini',       'Halloween 2026', 'points', true),
  (46, 'Headlessini Pumpkini',  'Halloween 2026', 'points', true)
ON CONFLICT (skin_id) DO UPDATE
  SET name       = EXCLUDED.name,
      tag        = EXCLUDED.tag,
      obtain     = EXCLUDED.obtain,
      is_limited = EXCLUDED.is_limited;

-- Drop-pool gate. Limited skins are fusion-only (locker_spawn); Divine skins
-- are points-only. Neither may sit in a drop pool, which would let a player
-- bypass the fusion requirement or the 2B/5B lifetime-points requirement.
--
-- The live function is whichever of migration 22 or 26 last ran. Those two
-- bodies differ only in comments and the LIMITED_SKIN_IDS array, so replacing
-- wholesale regresses nothing. Final list: 22, 27, 31, 45, 46.
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
  -- Limited fusion outputs plus the Divine seasonal tier. Update when new
  -- Limited or Divine skins ship.
  LIMITED_SKIN_IDS constant int[] := ARRAY[22, 27, 31, 45, 46];
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_pool) LOOP
    v_skin_id := (v_item->>'skin_id')::int;
    IF v_skin_id = ANY(LIMITED_SKIN_IDS) THEN
      RAISE EXCEPTION 'LIMITED_NOT_DROPPABLE: skin_id % is a Limited or Divine tier skin and cannot go in a drop pool.', v_skin_id
        USING HINT = 'Currently gated: 22 (Hockey Bros), 27 (Los Hockeys), 31 (La Fidget Combination), 45 (Vampire Dragini), 46 (Headlessini Pumpkini). Limited skins use locker_spawn; Divine skins are points-unlocked only.';
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

-- Verify: expect 35 rows, with ids 28-33 and 42-46 present.
SELECT skin_id, name, tag, obtain, is_limited
FROM public.skin_meta
ORDER BY skin_id;
