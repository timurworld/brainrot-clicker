-- ============================================================================
-- Brainrot Clicker — Phase 4 patch: serial collision fix for locker_fuse.
--
-- Problem: locker_fuse computed serial as (total_stock - remaining + 1), which
-- assumed the locker is the ONLY source of the output skin. If the skin had
-- ever been granted via admin_grant (or any non-locker path), the unique
-- constraint inventory_serial_unique on (skin_id, serial_number) blew up
-- with code 23505 — every fusion attempt failed.
--
-- Fix: compute serial as global MAX(serial_number)+1 for that skin_id. Lock
-- skin_meta to serialize concurrent fusions/grants.
-- Idempotent. Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.locker_fuse(
  p_player_id uuid, p_pin text, p_locker_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_locker record; v_recipe_item jsonb; v_skin_id int; v_qty int;
  v_inv record; v_serial int; v_inv_id uuid; v_username text;
  v_output_meta record; v_prior_count int;
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

  -- Per-player fusion cap on limited skins (1 fusion per skin per player).
  SELECT * INTO v_output_meta FROM public.skin_meta WHERE skin_id = v_locker.output_skin_id;
  IF FOUND AND v_output_meta.is_limited THEN
    SELECT COUNT(*) INTO v_prior_count FROM public.fusion_ticker
     WHERE LOWER(player_username) = LOWER(v_username)
       AND output_skin_id = v_locker.output_skin_id;
    IF v_prior_count > 0 THEN RAISE EXCEPTION 'ALREADY_FUSED'; END IF;
  END IF;

  -- Validate ingredients.
  FOR v_recipe_item IN SELECT * FROM jsonb_array_elements(v_locker.recipe) LOOP
    v_skin_id := (v_recipe_item->>'skin_id')::int;
    v_qty := (v_recipe_item->>'qty')::int;
    SELECT * INTO v_inv FROM public.inventory
     WHERE player_id = p_player_id AND skin_id = v_skin_id AND serial_number IS NULL
     FOR UPDATE;
    IF NOT FOUND OR v_inv.quantity < v_qty THEN
      RAISE EXCEPTION 'MISSING_INGREDIENTS';
    END IF;
  END LOOP;

  -- Consume ingredients.
  FOR v_recipe_item IN SELECT * FROM jsonb_array_elements(v_locker.recipe) LOOP
    v_skin_id := (v_recipe_item->>'skin_id')::int;
    v_qty := (v_recipe_item->>'qty')::int;
    UPDATE public.inventory
       SET quantity = quantity - v_qty
     WHERE player_id = p_player_id AND skin_id = v_skin_id AND serial_number IS NULL;
    DELETE FROM public.inventory
     WHERE player_id = p_player_id AND skin_id = v_skin_id
       AND serial_number IS NULL AND quantity <= 0;
  END LOOP;

  -- Compute next serial GLOBALLY for this skin (not just from locker stock).
  -- Lock skin_meta row to serialize concurrent grants of this skin.
  PERFORM 1 FROM public.skin_meta WHERE skin_id = v_locker.output_skin_id FOR UPDATE;
  SELECT COALESCE(MAX(serial_number), 0) + 1 INTO v_serial
  FROM public.inventory WHERE skin_id = v_locker.output_skin_id;

  UPDATE public.lockers
     SET remaining_stock = remaining_stock - 1,
         next_serial = next_serial + 1,
         status = CASE WHEN remaining_stock - 1 <= 0 THEN 'sold_out' ELSE status END
   WHERE id = p_locker_id;

  -- Pass the chosen serial through; inventory_grant uses it as-is when non-null.
  v_inv_id := public.inventory_grant(p_player_id, v_locker.output_skin_id, 'fusion', v_serial);
  INSERT INTO public.fusion_ticker (locker_id, player_username, output_skin_id, serial_number)
  VALUES (p_locker_id, v_username, v_locker.output_skin_id, v_serial);
  RETURN jsonb_build_object('granted_skin_id', v_locker.output_skin_id, 'serial_number', v_serial, 'inventory_id', v_inv_id);
END;
$$;
