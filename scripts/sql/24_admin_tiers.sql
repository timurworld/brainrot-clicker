-- ============================================================================
-- Brainrot Clicker — admin role hierarchy: introduce admin_tier integer.
--
-- Previous state (08_admin_role.sql):
--   • players.is_admin BOOLEAN — flat true/false
--   • assert_admin_auth() gates on is_admin
--   • All admins are equal — tmoney and emoney both have is_admin=true
--
-- Why this changes: Timur wants a tier hierarchy that scales across all the
-- games we'll build later. EmoneyAdmin (god tier) sees TmoneyAdmin's tools
-- PLUS extra god-only tools (bot driver, future debug/dev tools, etc).
-- New tiers added later are just bigger numbers — no schema change needed.
--
-- Tier semantics:
--   0 = regular player (default)
--   1 = admin (TmoneyAdmin level — current admin tools)
--   2 = god admin (EmoneyAdmin level — admin tools + god-only tools)
--   3+ reserved for future expansion
--
-- The existing is_admin BOOLEAN is KEPT and synced from admin_tier so any
-- legacy code or RLS that reads is_admin keeps working unchanged. Going
-- forward, gate everything on admin_tier comparisons.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ---------- 1. Schema: admin_tier column ----------
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS admin_tier int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_players_admin_tier
  ON public.players (admin_tier) WHERE admin_tier > 0;

-- ---------- 2. Seed tiers from existing is_admin + named god admins ----------
-- All current admins start at tier 1 (TmoneyAdmin level).
UPDATE public.players SET admin_tier = 1
 WHERE is_admin = true AND admin_tier < 1;

-- emoney gets bumped to tier 2 (god admin).
UPDATE public.players SET admin_tier = 2
 WHERE LOWER(username) = 'emoney';

-- Keep is_admin in sync with the tier so any legacy code reading is_admin
-- still gets the right answer. Any tier >= 1 = is_admin.
UPDATE public.players SET is_admin = (admin_tier >= 1);

-- ---------- 3. Replace assert_admin_auth: check tier >= 1 ----------
-- Same signature as before. Returns the admin's player id. Now gates on
-- admin_tier instead of is_admin so future tier-based checks share a
-- single auth path.
CREATE OR REPLACE FUNCTION public.assert_admin_auth(p_admin_username text, p_admin_pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid;
  v_tier int;
BEGIN
  SELECT id, admin_tier INTO v_admin_id, v_tier
    FROM public.players
   WHERE LOWER(username) = LOWER(p_admin_username) AND pin = p_admin_pin;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF COALESCE(v_tier, 0) < 1 THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN v_admin_id;
END;
$$;

-- ---------- 4. New assert_god_admin_auth: gate god-tier-only RPCs ----------
-- Use this in any RPC that should be EmoneyAdmin-only (bot tools first;
-- future god-only tools next). Behaves identically to assert_admin_auth
-- but raises 'forbidden' for tier < 2.
CREATE OR REPLACE FUNCTION public.assert_god_admin_auth(p_admin_username text, p_admin_pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid;
  v_tier int;
BEGIN
  SELECT id, admin_tier INTO v_admin_id, v_tier
    FROM public.players
   WHERE LOWER(username) = LOWER(p_admin_username) AND pin = p_admin_pin;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF COALESCE(v_tier, 0) < 2 THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN v_admin_id;
END;
$$;

-- ---------- 5. Verify: read back current tiers ----------
-- Sanity output for the SQL editor — shows who's at what tier after migration.
SELECT username, admin_tier, is_admin
  FROM public.players
 WHERE admin_tier > 0
 ORDER BY admin_tier DESC, username;
