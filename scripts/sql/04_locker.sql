-- ============================================================================
-- Brainrot Clicker V2 — Phase 4: Locker (admin-spawnable fusion crafting)
-- Run AFTER 03_wave_drops.sql. Idempotent.
-- ============================================================================

-- ---------- 1. Lockers table ----------
CREATE TABLE IF NOT EXISTS public.lockers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  recipe jsonb NOT NULL,                          -- [{skin_id, qty}, ...]
  output_skin_id int NOT NULL,
  total_stock int NOT NULL,
  remaining_stock int NOT NULL,
  next_serial int NOT NULL DEFAULT 1,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',          -- active | sold_out | expired | taken_offline
  admin_only boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lockers_status_idx ON public.lockers(status);
CREATE INDEX IF NOT EXISTS lockers_active_idx ON public.lockers(status, expires_at);

ALTER TABLE public.lockers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lockers_select_all ON public.lockers;
CREATE POLICY lockers_select_all ON public.lockers FOR SELECT USING (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='lockers') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.lockers';
  END IF;
END$$;

-- ---------- 2. Fusion ticker (broadcast feed) ----------
CREATE TABLE IF NOT EXISTS public.fusion_ticker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locker_id uuid,
  player_username text NOT NULL,
  output_skin_id int NOT NULL,
  serial_number int NOT NULL,
  fused_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fusion_ticker_recent_idx ON public.fusion_ticker(fused_at DESC);

ALTER TABLE public.fusion_ticker ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fusion_ticker_select_all ON public.fusion_ticker;
CREATE POLICY fusion_ticker_select_all ON public.fusion_ticker FOR SELECT USING (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='fusion_ticker') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.fusion_ticker';
  END IF;
END$$;

-- ---------- 3. locker_spawn (admin) ----------
CREATE OR REPLACE FUNCTION public.locker_spawn(
  p_admin_username text,
  p_admin_pin text,
  p_name text,
  p_recipe jsonb,                               -- [{"skin_id": 20, "qty": 1}, ...]
  p_output_skin_id int,
  p_total_stock int,
  p_duration_hours int DEFAULT 2,
  p_admin_only boolean DEFAULT true
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_locker_id uuid;
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);
  IF p_total_stock < 1 THEN RAISE EXCEPTION 'BAD_STOCK'; END IF;
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

-- ---------- 4. locker_take_offline (admin) ----------
CREATE OR REPLACE FUNCTION public.locker_take_offline(
  p_admin_username text, p_admin_pin text, p_locker_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);
  UPDATE public.lockers SET status = 'taken_offline'
   WHERE id = p_locker_id AND status = 'active';
END;
$$;

-- ---------- 5. locker_make_public (admin: flip admin_only off) ----------
CREATE OR REPLACE FUNCTION public.locker_make_public(
  p_admin_username text, p_admin_pin text, p_locker_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);
  UPDATE public.lockers SET admin_only = false WHERE id = p_locker_id;
END;
$$;

-- ---------- 6. locker_fuse (player) ----------
-- Atomic fusion: validate ingredients, decrement them, decrement locker stock
-- with FOR UPDATE lock, assign next serial, insert inventory row (with 24h
-- trade lock via inventory_grant method='fusion'), insert fusion_ticker.
--
-- Returns { granted_skin_id, serial_number, inventory_id } on success.
-- Errors: unauthorized, NOT_FOUND, NOT_ACTIVE, EXPIRED, SOLD_OUT,
--         MISSING_INGREDIENTS, RACE_LOST.

CREATE OR REPLACE FUNCTION public.locker_fuse(
  p_player_id uuid,
  p_pin text,
  p_locker_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_locker record;
  v_recipe_item jsonb;
  v_skin_id int;
  v_qty int;
  v_inv record;
  v_serial int;
  v_inv_id uuid;
  v_username text;
BEGIN
  PERFORM public.assert_player_auth(p_player_id, p_pin);

  -- Lock locker row first to serialize concurrent fusions.
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

  -- Validate ingredient ownership: for each recipe item, lock the player's
  -- stack-row and ensure quantity >= required.
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

  -- Assign serial = total - remaining + 1 (so first fuser gets #1, last gets #total).
  v_serial := v_locker.total_stock - v_locker.remaining_stock + 1;

  -- Decrement stock; flip status if this is the last one.
  UPDATE public.lockers
     SET remaining_stock = remaining_stock - 1,
         next_serial = next_serial + 1,
         status = CASE WHEN remaining_stock - 1 <= 0 THEN 'sold_out' ELSE status END
   WHERE id = p_locker_id;

  -- Grant output (limited skin → uses serial, sets 24h trade lock).
  v_inv_id := public.inventory_grant(p_player_id, v_locker.output_skin_id, 'fusion', v_serial);

  -- Insert fusion ticker row (broadcasts via realtime).
  SELECT username INTO v_username FROM public.players WHERE id = p_player_id;
  INSERT INTO public.fusion_ticker (locker_id, player_username, output_skin_id, serial_number)
  VALUES (p_locker_id, v_username, v_locker.output_skin_id, v_serial);

  RETURN jsonb_build_object(
    'granted_skin_id', v_locker.output_skin_id,
    'serial_number', v_serial,
    'inventory_id', v_inv_id
  );
END;
$$;
