-- ============================================================================
-- Brainrot Clicker V2 — Phase 1: Inventory
-- Run this in the Supabase SQL editor for project `eztmcfghqeheiamhyner`.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------- 1. Inventory table ----------
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  skin_id int NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  serial_number int,                                  -- limited skins only
  acquired_at timestamptz NOT NULL DEFAULT now(),
  acquired_method text NOT NULL DEFAULT 'gift',       -- drop | fusion | trade | gift | legacy
  trade_lock_until timestamptz,                       -- 24h post-fusion
  reserved_by_listing uuid,                           -- non-null while listed
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_player_idx ON public.inventory(player_id);
CREATE INDEX IF NOT EXISTS inventory_skin_idx   ON public.inventory(skin_id);
CREATE UNIQUE INDEX IF NOT EXISTS inventory_serial_unique
  ON public.inventory(skin_id, serial_number)
  WHERE serial_number IS NOT NULL;

-- One stack-row per (player, skin) for stackable (non-limited) skins.
-- Limited skins (serial_number IS NOT NULL) are exempt — they get their own row each.
CREATE UNIQUE INDEX IF NOT EXISTS inventory_stack_unique
  ON public.inventory(player_id, skin_id)
  WHERE serial_number IS NULL;

-- ---------- 2. RLS ----------
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies so re-runs work cleanly.
DROP POLICY IF EXISTS inventory_select_all       ON public.inventory;
DROP POLICY IF EXISTS inventory_no_direct_writes ON public.inventory;

-- Anyone can read inventory rows (lets other players see what you own — needed
-- for trade board listings, future leaderboards). This is fine — inventory is
-- not sensitive.
CREATE POLICY inventory_select_all
  ON public.inventory FOR SELECT
  USING (true);

-- No direct INSERT/UPDATE/DELETE from clients. Only SECURITY DEFINER RPCs mutate.
-- (Absence of permissive policies = denied by default under RLS.)

-- Realtime publication so clients get live updates on inventory changes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventory'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory';
  END IF;
END$$;

-- ---------- 3. Skin metadata table (lets RPCs know which skins are limited) ----------
CREATE TABLE IF NOT EXISTS public.skin_meta (
  skin_id int PRIMARY KEY,
  name text NOT NULL,
  is_limited boolean NOT NULL DEFAULT false,         -- true = serial-tracked, no stacking
  obtain text NOT NULL DEFAULT 'points',             -- points | drop | fusion | gift_only
  tag text                                           -- 'Sportini', 'Lovini', etc.
);

ALTER TABLE public.skin_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skin_meta_select_all ON public.skin_meta;
CREATE POLICY skin_meta_select_all ON public.skin_meta FOR SELECT USING (true);

-- Seed legacy skins (so the skin_gifts trigger can map them) + Sportini drops.
INSERT INTO public.skin_meta (skin_id, name, is_limited, obtain, tag) VALUES
  ( 1, 'Noobini Lovini',        false, 'points', 'Lovini'),
  ( 2, 'Romantini Grandini',    false, 'points', 'Lovini'),
  ( 3, 'Lovini Lovini Lovini',  false, 'points', 'Lovini'),
  ( 4, 'Teddini & Robotini',    false, 'points', 'Lovini'),
  ( 5, 'Noobini Partini',       false, 'points', 'Partini'),
  ( 6, 'Cakini Presintini',     false, 'points', 'Partini'),
  ( 7, 'Lovini Rosetti',        false, 'points', 'Lovini'),
  ( 8, 'Heartini Smilekurro',   false, 'points', 'Lovini'),
  ( 9, 'Dragini Partini',       false, 'points', 'Partini'),
  (10, 'Cupidini Sahuroni',     false, 'points', 'Lovini'),
  (11, 'Rositti Tueletti',      false, 'points', 'Lovini'),
  (12, 'Birthdayini Cardini',   false, 'points', 'Partini'),
  (13, 'Cakini Elephantini',    false, 'points', 'Partini'),
  (15, 'Pizzini Partyini',      false, 'points', 'Partini'),
  (18, 'Noo Mio Heartini',      false, 'points', 'Lovini'),
  (19, 'Cupidini Hotspottini',  false, 'points', 'Lovini'),
  (20, 'Stick Stick',           false, 'drop',   'Sportini'),
  (21, 'No My Pucks',           false, 'drop',   'Sportini'),
  (22, 'Hockey Bros',           true,  'fusion', 'Sportini')
ON CONFLICT (skin_id) DO UPDATE
SET name = EXCLUDED.name,
    is_limited = EXCLUDED.is_limited,
    obtain = EXCLUDED.obtain,
    tag = EXCLUDED.tag;

-- ---------- 4. RPC: inventory_grant ----------
-- Add 1 copy of a skin to a player's inventory.
--   - For stackable (is_limited=false) skins: increments quantity on the existing stack row,
--     or creates a new stack row if none exists.
--   - For limited skins: creates a new instance row with the next available serial_number.
--     Caller may pass p_serial_number to override; otherwise we pick the next free number.
--   - Sets trade_lock_until based on p_method: 'fusion' → now()+24h; otherwise NULL.
--
-- Returns the inventory row id as text (or raises an error if the skin doesn't exist).
--
-- This RPC is internal — called by other RPCs (locker_fuse, drop_roll, trade_accept) and
-- from the Admin Hub. Player clients should NOT call this directly.

CREATE OR REPLACE FUNCTION public.inventory_grant(
  p_player_id uuid,
  p_skin_id int,
  p_method text DEFAULT 'gift',
  p_serial_number int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta record;
  v_inv_id uuid;
  v_serial int;
  v_lock_until timestamptz;
BEGIN
  SELECT * INTO v_meta FROM public.skin_meta WHERE skin_id = p_skin_id;
  IF NOT FOUND THEN
    -- Unknown skin: assume non-limited (covers legacy point-unlock skins from CHARACTERS).
    v_meta.is_limited := false;
  END IF;

  v_lock_until := CASE WHEN p_method = 'fusion' THEN now() + interval '24 hours' ELSE NULL END;

  IF v_meta.is_limited THEN
    -- Pick next serial atomically. Lock skin_meta row to serialize concurrent grants.
    PERFORM 1 FROM public.skin_meta WHERE skin_id = p_skin_id FOR UPDATE;
    IF p_serial_number IS NOT NULL THEN
      v_serial := p_serial_number;
    ELSE
      SELECT COALESCE(MAX(serial_number), 0) + 1 INTO v_serial
      FROM public.inventory WHERE skin_id = p_skin_id;
    END IF;
    INSERT INTO public.inventory
      (player_id, skin_id, quantity, serial_number, acquired_method, trade_lock_until)
    VALUES (p_player_id, p_skin_id, 1, v_serial, p_method, v_lock_until)
    RETURNING id INTO v_inv_id;
  ELSE
    -- Stackable: upsert into the single stack row for this (player, skin).
    INSERT INTO public.inventory
      (player_id, skin_id, quantity, acquired_method, trade_lock_until)
    VALUES (p_player_id, p_skin_id, 1, p_method, v_lock_until)
    ON CONFLICT (player_id, skin_id) WHERE serial_number IS NULL
    DO UPDATE SET quantity = public.inventory.quantity + 1,
                  acquired_at = now()
    RETURNING id INTO v_inv_id;
  END IF;

  RETURN v_inv_id;
END;
$$;

-- ---------- 5. Admin RPC: inventory_grant_admin (callable from Hub) ----------
-- Validates an admin PIN before granting. Hub passes Timur's username + pin from
-- its server-side env (NEVER from the browser — Hub login already auths the admin).
-- For now, hard-gate to username 'tmoney'.

CREATE OR REPLACE FUNCTION public.inventory_grant_admin(
  p_admin_username text,
  p_admin_pin text,
  p_target_player_id uuid,
  p_skin_id int,
  p_method text DEFAULT 'gift'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM public.players
  WHERE LOWER(username) = LOWER(p_admin_username) AND pin = p_admin_pin;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF LOWER(p_admin_username) <> 'tmoney' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN public.inventory_grant(p_target_player_id, p_skin_id, p_method, NULL);
END;
$$;

-- ---------- 6. Migration: seed legacy unlockedSkins from game_saves ----------
-- One-shot best-effort migration. Reads each player's last cloud save and inserts
-- inventory rows for any skins in `unlockedSkins[]` they don't already have.
-- Method = 'legacy'. Safe to re-run (ON CONFLICT DO NOTHING semantics via uniqueness).

CREATE OR REPLACE FUNCTION public.seed_inventory_from_saves()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  s int;
  inserted int := 0;
BEGIN
  FOR r IN SELECT player_id, save_data FROM public.game_saves LOOP
    IF r.save_data IS NULL OR r.save_data->'unlockedSkins' IS NULL THEN
      CONTINUE;
    END IF;
    FOR s IN SELECT (jsonb_array_elements_text(r.save_data->'unlockedSkins'))::int LOOP
      BEGIN
        INSERT INTO public.inventory (player_id, skin_id, quantity, acquired_method)
        VALUES (r.player_id, s, 1, 'legacy')
        ON CONFLICT DO NOTHING;
        IF FOUND THEN inserted := inserted + 1; END IF;
      EXCEPTION WHEN OTHERS THEN
        -- skip bad data
      END;
    END LOOP;
  END LOOP;
  RETURN inserted;
END;
$$;

-- To run the legacy migration once:
--   SELECT public.seed_inventory_from_saves();

-- ---------- 7. Per-player seed (called from client on login) ----------
-- Idempotent. The skin_id stored in `unlockedSkins[]` is the array INDEX into
-- CHARACTERS, not the canonical id. We map index → CHARACTERS[i].id via a lookup
-- table the client passes in (or, simpler: use INDEX as skin_id since the legacy
-- skins use ids 1..19 which align with their index in many cases). Since we
-- can't know the mapping inside Postgres, we pass it in as a jsonb array of ids.
--
-- Usage from client:
--   const charIds = CHARACTERS.map(c => c.id);
--   supabase.rpc('seed_inventory_for_player', { p_player_id: id, p_char_ids: charIds });

CREATE OR REPLACE FUNCTION public.seed_inventory_for_player(
  p_player_id uuid,
  p_char_ids jsonb     -- e.g. [1,2,3,...,19,20,21,22] — index-aligned to CHARACTERS
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_save jsonb;
  idx int;
  skin_id int;
  inserted int := 0;
BEGIN
  SELECT save_data INTO v_save FROM public.game_saves WHERE player_id = p_player_id;
  IF v_save IS NULL OR v_save->'unlockedSkins' IS NULL THEN
    RETURN 0;
  END IF;

  FOR idx IN SELECT (jsonb_array_elements_text(v_save->'unlockedSkins'))::int LOOP
    BEGIN
      skin_id := (p_char_ids->>idx)::int;
      IF skin_id IS NULL THEN CONTINUE; END IF;
      INSERT INTO public.inventory (player_id, skin_id, quantity, acquired_method)
      VALUES (p_player_id, skin_id, 1, 'legacy')
      ON CONFLICT DO NOTHING;
      IF FOUND THEN inserted := inserted + 1; END IF;
    EXCEPTION WHEN OTHERS THEN
      -- skip bad indices
    END;
  END LOOP;
  RETURN inserted;
END;
$$;

-- ---------- 8. Auto-mirror skin_gifts → inventory ----------
-- The Admin Hub's existing "Give Skin" flow inserts into public.skin_gifts.
-- This trigger keeps inventory in sync without Hub changes: every gift insert
-- creates a matching inventory row (method='gift'). Looks up the player by
-- username (case-insensitive) and the skin by name in skin_meta or CHARACTERS.

CREATE OR REPLACE FUNCTION public.skin_gifts_to_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_skin_id int;
BEGIN
  SELECT id INTO v_player_id
  FROM public.players
  WHERE LOWER(username) = LOWER(NEW.player_name)
  LIMIT 1;
  IF v_player_id IS NULL THEN RETURN NEW; END IF;

  SELECT skin_id INTO v_skin_id
  FROM public.skin_meta
  WHERE LOWER(name) = LOWER(NEW.skin_name)
  LIMIT 1;
  -- If the skin isn't in skin_meta yet, the legacy CHARACTERS array on the client
  -- handles equipping by name; we still want an inventory row, but we need an id.
  -- We don't have the legacy mapping in DB, so we skip silently — those skins
  -- will be picked up by `seed_inventory_for_player` on next login.
  IF v_skin_id IS NULL THEN RETURN NEW; END IF;

  PERFORM public.inventory_grant(v_player_id, v_skin_id, 'gift', NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS skin_gifts_to_inventory_trg ON public.skin_gifts;
CREATE TRIGGER skin_gifts_to_inventory_trg
  AFTER INSERT ON public.skin_gifts
  FOR EACH ROW EXECUTE FUNCTION public.skin_gifts_to_inventory();

-- All current CHARACTERS skins are seeded in skin_meta above, so the trigger
-- works for every gift the Admin Hub can send today. When new skins ship, add
-- them to both CHARACTERS (App.jsx) and skin_meta (SQL above).

