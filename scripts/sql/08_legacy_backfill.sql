-- ============================================================================
-- Brainrot Clicker — Phase 5 patch: legacy inventory backfill + prestige
-- serial repair.
--
-- Two related bugs that surfaced after the single-inventory model (Option A)
-- shipped:
--
--   1. Players who unlocked points-skins under the OLD achievement-flag
--      model have entries in save_data.unlockedSkins[] but no matching
--      inventory rows. After Option A those skins all show as LOCKED.
--      seed_inventory_for_player() RPC was supposed to backfill on login
--      but silently swallows errors via EXCEPTION WHEN OTHERS — 0 rows
--      inserted in practice.
--
--   2. Prestige skins (23 Sushiro, 24 Kingurini, 25 Auraberry) had
--      `is_limited` set to TRUE only in migration 07. Inventory rows
--      created BEFORE that migration went through inventory_grant's
--      stackable branch (one row, qty=N, serial=NULL). Rows created
--      AFTER got proper serial numbers. Result: same skin shows ×N
--      (blue stackable badge) on one card and #N (gold serial badge)
--      on another — visually inconsistent.
--
-- Fix for #1: iterate every player's unlockedSkins[] indices, map them
-- to the canonical skin_id via a hardcoded CHARACTERS-order array, and
-- mint inventory rows for points-only skins that don't already exist.
--
-- Fix for #2: for every stackable (serial=NULL) row on a prestige
-- skin_id, expand into qty separate serial-numbered rows, then delete
-- the old stackable row.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ---------- 1. Backfill points-skin inventory from unlockedSkins[] ----------
DO $$
DECLARE
  v_player record;
  v_idx int;
  v_skin_id int;
  v_meta record;
  v_existing int;
  v_inserted_total int := 0;
  -- CHARACTERS-array order. Index → skin_id mapping. MUST match App.jsx.
  --   idx  0..12 → ids 1..13
  --   idx 13     → id 15  (id 14 was removed)
  --   idx 14     → id 18  (ids 16, 17 were removed)
  --   idx 15     → id 19
  --   idx 16..21 → ids 20..25
  v_charids int[] := ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,15,18,19,20,21,22,23,24,25];
BEGIN
  FOR v_player IN
    SELECT player_id, save_data FROM public.game_saves
    WHERE save_data ? 'unlockedSkins'
  LOOP
    FOR v_idx IN
      SELECT (jsonb_array_elements_text(v_player.save_data->'unlockedSkins'))::int
    LOOP
      -- Bounds check
      IF v_idx < 0 OR v_idx >= array_length(v_charids, 1) THEN CONTINUE; END IF;
      v_skin_id := v_charids[v_idx + 1];   -- plpgsql arrays are 1-indexed

      -- Skip non-points skins. drop/fusion/prestige must be earned through
      -- their proper mechanic; never auto-minted from a legacy flag.
      SELECT * INTO v_meta FROM public.skin_meta WHERE skin_id = v_skin_id;
      IF NOT FOUND OR v_meta.obtain <> 'points' THEN CONTINUE; END IF;

      -- Already minted?
      SELECT COUNT(*) INTO v_existing
      FROM public.inventory
      WHERE player_id = v_player.player_id
        AND skin_id = v_skin_id
        AND serial_number IS NULL;
      IF v_existing > 0 THEN CONTINUE; END IF;

      INSERT INTO public.inventory (player_id, skin_id, quantity, acquired_method)
      VALUES (v_player.player_id, v_skin_id, 1, 'legacy');
      v_inserted_total := v_inserted_total + 1;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Backfilled % inventory rows from unlockedSkins[]', v_inserted_total;
END$$;

-- ---------- 2. Convert prestige stackable rows to serial-numbered ----------
-- Limited skins should ALWAYS have a serial. Stackable prestige rows are
-- legacy data drift from before is_limited=true was set on these skins.
DO $$
DECLARE
  v_row record;
  v_qty int;
  v_serial int;
  v_i int;
  v_converted int := 0;
BEGIN
  -- Snapshot the rows up front so we don't iterate over our own inserts.
  FOR v_row IN
    SELECT * FROM public.inventory
    WHERE skin_id IN (23, 24, 25)
      AND serial_number IS NULL
  LOOP
    v_qty := GREATEST(COALESCE(v_row.quantity, 1), 1);
    -- Mint v_qty new serial-numbered rows.
    FOR v_i IN 1..v_qty LOOP
      PERFORM 1 FROM public.skin_meta WHERE skin_id = v_row.skin_id FOR UPDATE;
      SELECT COALESCE(MAX(serial_number), 0) + 1 INTO v_serial
      FROM public.inventory WHERE skin_id = v_row.skin_id;

      INSERT INTO public.inventory
        (player_id, skin_id, quantity, serial_number,
         acquired_method, acquired_at, trade_lock_until)
      VALUES
        (v_row.player_id, v_row.skin_id, 1, v_serial,
         COALESCE(v_row.acquired_method, 'legacy'),
         COALESCE(v_row.acquired_at, now()),
         v_row.trade_lock_until);
      v_converted := v_converted + 1;
    END LOOP;
    -- Drop the old stackable row.
    DELETE FROM public.inventory WHERE id = v_row.id;
  END LOOP;
  RAISE NOTICE 'Converted % stackable prestige rows into serial-numbered rows', v_converted;
END$$;
