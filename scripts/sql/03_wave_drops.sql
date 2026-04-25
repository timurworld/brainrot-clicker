-- ============================================================================
-- Brainrot Clicker V2 — Phase 3: Wave Drops
-- Run AFTER 02_trade_board.sql. Idempotent.
-- ============================================================================

-- ---------- 1. drop_events table ----------
-- One row per active or past drop event. drop_pool is a jsonb array:
--   [{"skin_id": 20, "total": 300, "remaining": 247}, ...]
-- Stock decrements live inside drop_pool (atomic UPDATE per roll).

CREATE TABLE IF NOT EXISTS public.drop_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  drop_pool jsonb NOT NULL,
  baseline_rate_inv int NOT NULL DEFAULT 500,        -- 1 in N taps
  wave_frequency_min int NOT NULL DEFAULT 10,        -- info-only; admin triggers waves manually
  wave_duration_sec int NOT NULL DEFAULT 60,
  wave_multiplier int NOT NULL DEFAULT 10,
  current_wave_skin_id int,                          -- null = no wave active
  current_wave_ends_at timestamptz,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,                            -- null = no auto-expire
  status text NOT NULL DEFAULT 'active',             -- active | sold_out | ended
  admin_only boolean NOT NULL DEFAULT true,          -- dry-run flag
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drop_events_status_idx ON public.drop_events(status);
CREATE INDEX IF NOT EXISTS drop_events_active_idx ON public.drop_events(status, expires_at);

ALTER TABLE public.drop_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS drop_events_select_all ON public.drop_events;
CREATE POLICY drop_events_select_all ON public.drop_events FOR SELECT USING (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='drop_events') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.drop_events';
  END IF;
END$$;

-- ---------- 2. Admin auth helper (mirrors Phase 1's pattern) ----------
CREATE OR REPLACE FUNCTION public.assert_admin_auth(p_admin_username text, p_admin_pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM public.players
   WHERE LOWER(username) = LOWER(p_admin_username) AND pin = p_admin_pin;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF LOWER(p_admin_username) <> 'tmoney' THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN v_admin_id;
END;
$$;

-- ---------- 3. drop_event_spawn (admin) ----------
-- p_pool is a jsonb array of {skin_id, total} — the function fills in remaining.
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
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);

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

-- ---------- 4. drop_event_end (admin) ----------
CREATE OR REPLACE FUNCTION public.drop_event_end(
  p_admin_username text, p_admin_pin text, p_event_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);
  UPDATE public.drop_events SET status = 'ended', current_wave_skin_id = NULL,
         current_wave_ends_at = NULL WHERE id = p_event_id AND status = 'active';
END;
$$;

-- ---------- 5. drop_event_make_public (admin: flip admin_only off) ----------
CREATE OR REPLACE FUNCTION public.drop_event_make_public(
  p_admin_username text, p_admin_pin text, p_event_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);
  UPDATE public.drop_events SET admin_only = false WHERE id = p_event_id;
END;
$$;

-- ---------- 6. wave_trigger (admin) ----------
-- Sets a wave for the given skin_id. Wave runs for wave_duration_sec.
CREATE OR REPLACE FUNCTION public.wave_trigger(
  p_admin_username text, p_admin_pin text,
  p_event_id uuid, p_skin_id int
) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dur_sec int;
  v_ends_at timestamptz;
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);
  SELECT wave_duration_sec INTO v_dur_sec FROM public.drop_events WHERE id = p_event_id;
  IF v_dur_sec IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  v_ends_at := now() + (v_dur_sec || ' seconds')::interval;
  UPDATE public.drop_events
     SET current_wave_skin_id = p_skin_id, current_wave_ends_at = v_ends_at
   WHERE id = p_event_id AND status = 'active';
  RETURN v_ends_at;
END;
$$;

-- ---------- 7. drop_roll (player; called on tap) ----------
-- Server-authoritative roll. If the player wins, picks a skin from the pool
-- (weighted by remaining stock, with wave multiplier), decrements stock atomically,
-- grants the inventory row, and returns the granted skin_id. Otherwise null.
--
-- Client must call this NO MORE than ~once per second (rate-limited by tap UX).
-- Server does its own per-(player,event) cooldown via a small in-row check.

CREATE TABLE IF NOT EXISTS public.drop_cooldowns (
  player_id uuid NOT NULL,
  event_id uuid NOT NULL,
  last_roll_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, event_id)
);
ALTER TABLE public.drop_cooldowns ENABLE ROW LEVEL SECURITY;
-- No policies = no client reads/writes; only RPCs touch this.

CREATE OR REPLACE FUNCTION public.drop_roll(
  p_player_id uuid,
  p_pin text,
  p_event_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event record;
  v_baseline numeric;
  v_total_weight numeric := 0;
  v_pool jsonb;
  v_item jsonb;
  v_skin_id int;
  v_remaining int;
  v_weight numeric;
  v_pick numeric;
  v_acc numeric := 0;
  v_picked_skin int := NULL;
  v_new_pool jsonb := '[]'::jsonb;
  v_pool_remaining int := 0;
  v_inv_id uuid;
  v_last_roll timestamptz;
BEGIN
  PERFORM public.assert_player_auth(p_player_id, p_pin);

  -- Per-player cooldown (250ms minimum between rolls, server-enforced).
  SELECT last_roll_at INTO v_last_roll FROM public.drop_cooldowns
   WHERE player_id = p_player_id AND event_id = p_event_id FOR UPDATE;
  IF v_last_roll IS NOT NULL AND v_last_roll > now() - interval '250 milliseconds' THEN
    RETURN jsonb_build_object('granted', null, 'cooldown', true);
  END IF;
  INSERT INTO public.drop_cooldowns (player_id, event_id, last_roll_at)
  VALUES (p_player_id, p_event_id, now())
  ON CONFLICT (player_id, event_id) DO UPDATE SET last_roll_at = now();

  -- Lock event row so concurrent rolls serialize for stock updates.
  SELECT * INTO v_event FROM public.drop_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status <> 'active' THEN
    RETURN jsonb_build_object('granted', null);
  END IF;
  IF v_event.expires_at IS NOT NULL AND v_event.expires_at < now() THEN
    UPDATE public.drop_events SET status = 'ended' WHERE id = p_event_id;
    RETURN jsonb_build_object('granted', null);
  END IF;

  v_baseline := 1.0 / GREATEST(v_event.baseline_rate_inv, 1);
  v_pool := v_event.drop_pool;

  -- Compute total weight: sum(per-skin baseline * remaining? no — per-skin baseline,
  -- with wave multiplier on the active wave skin).
  -- Each non-empty skin contributes baseline; wave skin contributes baseline * multiplier.
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_pool) LOOP
    v_skin_id := (v_item->>'skin_id')::int;
    v_remaining := (v_item->>'remaining')::int;
    IF v_remaining <= 0 THEN CONTINUE; END IF;
    v_weight := v_baseline;
    IF v_event.current_wave_skin_id = v_skin_id
       AND v_event.current_wave_ends_at IS NOT NULL
       AND v_event.current_wave_ends_at > now() THEN
      v_weight := v_baseline * v_event.wave_multiplier;
    END IF;
    v_total_weight := v_total_weight + v_weight;
  END LOOP;

  -- Single random roll against total_weight; if win, weighted-pick.
  IF v_total_weight <= 0 THEN
    RETURN jsonb_build_object('granted', null);
  END IF;

  v_pick := random();
  IF v_pick >= v_total_weight THEN
    RETURN jsonb_build_object('granted', null);
  END IF;

  -- Win — pick a skin proportional to its weight.
  v_acc := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_pool) LOOP
    v_skin_id := (v_item->>'skin_id')::int;
    v_remaining := (v_item->>'remaining')::int;
    IF v_remaining <= 0 THEN CONTINUE; END IF;
    v_weight := v_baseline;
    IF v_event.current_wave_skin_id = v_skin_id
       AND v_event.current_wave_ends_at IS NOT NULL
       AND v_event.current_wave_ends_at > now() THEN
      v_weight := v_baseline * v_event.wave_multiplier;
    END IF;
    v_acc := v_acc + v_weight;
    IF v_pick < v_acc THEN
      v_picked_skin := v_skin_id;
      EXIT;
    END IF;
  END LOOP;

  IF v_picked_skin IS NULL THEN
    RETURN jsonb_build_object('granted', null);
  END IF;

  -- Decrement remaining for the picked skin; rebuild pool jsonb.
  v_pool_remaining := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_pool) LOOP
    v_skin_id := (v_item->>'skin_id')::int;
    v_remaining := (v_item->>'remaining')::int;
    IF v_skin_id = v_picked_skin THEN
      v_remaining := v_remaining - 1;
    END IF;
    v_new_pool := v_new_pool || jsonb_build_array(jsonb_build_object(
      'skin_id', v_skin_id,
      'total', (v_item->>'total')::int,
      'remaining', v_remaining
    ));
    IF v_remaining > 0 THEN v_pool_remaining := v_pool_remaining + 1; END IF;
  END LOOP;

  UPDATE public.drop_events
     SET drop_pool = v_new_pool,
         status = CASE WHEN v_pool_remaining = 0 THEN 'sold_out' ELSE status END
   WHERE id = p_event_id;

  -- Grant the skin.
  v_inv_id := public.inventory_grant(p_player_id, v_picked_skin, 'drop', NULL);

  RETURN jsonb_build_object('granted', v_picked_skin, 'inventory_id', v_inv_id);
END;
$$;
