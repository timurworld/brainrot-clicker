-- ============================================================================
-- Brainrot Clicker — Phase 7 hotfix: locker_fuse must accept serial-numbered
-- inventory rows as ingredients, not only stackable rows.
--
-- Bug surfaced by Los Hockeys (#27): the recipe includes Cupideini Hockini
-- (#26), which has skin_meta.is_limited = true. inventory_grant always mints
-- a serial-numbered row for limited skins, so the existing locker_fuse —
-- which filtered ingredient lookup with `serial_number IS NULL` — could
-- never find them. Result: every player with the recipe got
-- 'MISSING_INGREDIENTS', and the FUSE NOW button stayed greyed (the client's
-- checkRecipe applied the same filter).
--
-- Fix: drain stackable rows first, then consume serial-numbered rows
-- highest-serial-first (so the rarest low-serials are preserved as
-- keepsakes when a player owns more than one). Validation counts both
-- pools toward the recipe quantity.
--
-- Trade-off: fusing now consumes a Mythic-tier serial item for any limited
-- ingredient. Confirmed creative call — Cupideini Hockini → Los Hockeys is
-- a tap-power upgrade (25× → 30×) so the lossy mint is the intentional
-- "spend the rare to get the rarer-still" loop.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.locker_fuse(
  p_player_id uuid, p_pin text, p_locker_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_locker        record;
  v_recipe_item   jsonb;
  v_skin_id       int;
  v_qty           int;
  v_serial        int;
  v_inv_id        uuid;
  v_username      text;
  v_output_meta   record;
  v_prior_count   int;
  v_have_stack    int;
  v_have_serial   int;
  v_from_stack    int;
  v_remaining     int;
BEGIN
  PERFORM public.assert_player_auth(p_player_id, p_pin);
  SELECT username INTO v_username FROM public.players WHERE id = p_player_id;

  SELECT * INTO v_locker FROM public.lockers WHERE id = p_locker_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_locker.status <> 'active' THEN RAISE EXCEPTION 'NOT_ACTIVE'; END IF;
  IF v_locker.expires_at IS NOT NULL AND v_locker.expires_at < now() THEN
    UPDATE public.lockers SET status = 'expired' WHERE id = p_locker_id;
    RAISE EXCEPTION 'EXPIRED';
  END IF;
  IF v_locker.remaining_stock <= 0 THEN
    UPDATE public.lockers SET status = 'sold_out' WHERE id = p_locker_id AND status = 'active';
    RAISE EXCEPTION 'SOLD_OUT';
  END IF;

  -- Per-player fusion cap on limited outputs (1 fusion per skin per player).
  SELECT * INTO v_output_meta FROM public.skin_meta WHERE skin_id = v_locker.output_skin_id;
  IF FOUND AND v_output_meta.is_limited THEN
    SELECT COUNT(*) INTO v_prior_count FROM public.fusion_ticker
     WHERE LOWER(player_username) = LOWER(v_username)
       AND output_skin_id = v_locker.output_skin_id;
    IF v_prior_count > 0 THEN RAISE EXCEPTION 'ALREADY_FUSED'; END IF;
  END IF;

  -- Validate: stackable + serial pools combined must cover recipe qty.
  FOR v_recipe_item IN SELECT * FROM jsonb_array_elements(v_locker.recipe) LOOP
    v_skin_id := (v_recipe_item->>'skin_id')::int;
    v_qty     := (v_recipe_item->>'qty')::int;
    SELECT COALESCE(SUM(quantity), 0) INTO v_have_stack
      FROM public.inventory
     WHERE player_id = p_player_id AND skin_id = v_skin_id AND serial_number IS NULL;
    SELECT COUNT(*) INTO v_have_serial
      FROM public.inventory
     WHERE player_id = p_player_id AND skin_id = v_skin_id AND serial_number IS NOT NULL;
    IF v_have_stack + v_have_serial < v_qty THEN
      RAISE EXCEPTION 'MISSING_INGREDIENTS';
    END IF;
  END LOOP;

  -- Consume: drain stackable first, then burn serial-numbered rows from
  -- highest serial down (preserves the rarer low-serials).
  FOR v_recipe_item IN SELECT * FROM jsonb_array_elements(v_locker.recipe) LOOP
    v_skin_id := (v_recipe_item->>'skin_id')::int;
    v_qty     := (v_recipe_item->>'qty')::int;

    SELECT COALESCE(SUM(quantity), 0) INTO v_have_stack
      FROM public.inventory
     WHERE player_id = p_player_id AND skin_id = v_skin_id AND serial_number IS NULL;

    v_from_stack := LEAST(v_have_stack, v_qty);
    IF v_from_stack > 0 THEN
      UPDATE public.inventory
         SET quantity = quantity - v_from_stack
       WHERE player_id = p_player_id AND skin_id = v_skin_id AND serial_number IS NULL;
      DELETE FROM public.inventory
       WHERE player_id = p_player_id AND skin_id = v_skin_id
         AND serial_number IS NULL AND quantity <= 0;
    END IF;

    v_remaining := v_qty - v_from_stack;
    IF v_remaining > 0 THEN
      DELETE FROM public.inventory
       WHERE id IN (
         SELECT id FROM public.inventory
          WHERE player_id = p_player_id
            AND skin_id   = v_skin_id
            AND serial_number IS NOT NULL
          ORDER BY serial_number DESC
          LIMIT v_remaining
       );
    END IF;
  END LOOP;

  -- Compute next serial GLOBALLY for this skin (not just from locker stock).
  PERFORM 1 FROM public.skin_meta WHERE skin_id = v_locker.output_skin_id FOR UPDATE;
  SELECT COALESCE(MAX(serial_number), 0) + 1 INTO v_serial
  FROM public.inventory WHERE skin_id = v_locker.output_skin_id;

  UPDATE public.lockers
     SET remaining_stock = remaining_stock - 1,
         next_serial     = next_serial + 1,
         status          = CASE WHEN remaining_stock - 1 <= 0 THEN 'sold_out' ELSE status END
   WHERE id = p_locker_id;

  v_inv_id := public.inventory_grant(p_player_id, v_locker.output_skin_id, 'fusion', v_serial);
  INSERT INTO public.fusion_ticker (locker_id, player_username, output_skin_id, serial_number)
  VALUES (p_locker_id, v_username, v_locker.output_skin_id, v_serial);
  RETURN jsonb_build_object(
    'granted_skin_id', v_locker.output_skin_id,
    'serial_number',   v_serial,
    'inventory_id',    v_inv_id
  );
END;
$$;
