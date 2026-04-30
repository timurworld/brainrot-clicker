-- ============================================================================
-- Brainrot Clicker — Phase 5: proper admin role on the players table.
--
-- Previous state:
--   • assert_admin_auth() (03_wave_drops.sql) hardcoded
--     LOWER(p_admin_username) <> 'tmoney' → forbidden
--   • inventory_grant_admin() (01_inventory.sql) had its own inline copy of
--     the same hardcoded check
--   Result: only tmoney could perform V2 admin actions; adding a second admin
--   required code changes + a new migration.
--
-- Fix:
--   1. Add is_admin BOOLEAN column to players (default false)
--   2. Flip tmoney + emoney to is_admin=true
--   3. Replace assert_admin_auth() to gate on is_admin instead of username
--   4. Refactor inventory_grant_admin() to delegate to assert_admin_auth()
--      so there's a single source of truth for the admin guard
--
-- Adding future admins: UPDATE players SET is_admin = true WHERE username = X
-- — no code change, no migration needed.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ---------- 1. Schema: is_admin column ----------
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_players_is_admin
  ON public.players (is_admin) WHERE is_admin = true;

-- ---------- 2. Seed initial admins (tmoney + emoney) ----------
UPDATE public.players
   SET is_admin = true
 WHERE LOWER(username) IN ('tmoney', 'emoney');

-- ---------- 3. Replace assert_admin_auth: check is_admin, not username ----------
-- Same signature so existing callers keep working unchanged. Returns the
-- admin's player id so callers can use it for audit/log columns.
CREATE OR REPLACE FUNCTION public.assert_admin_auth(p_admin_username text, p_admin_pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
BEGIN
  SELECT id, is_admin INTO v_admin_id, v_is_admin
    FROM public.players
   WHERE LOWER(username) = LOWER(p_admin_username) AND pin = p_admin_pin;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN v_admin_id;
END;
$$;

-- ---------- 4. inventory_grant_admin: delegate to assert_admin_auth ----------
-- Removes the inline duplicate of the auth check. Behaviour preserved:
-- still validates admin credentials before granting, raises 'unauthorized'
-- on bad creds, 'forbidden' if the player isn't an admin.
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
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);
  RETURN public.inventory_grant(p_target_player_id, p_skin_id, p_method, NULL);
END;
$$;
