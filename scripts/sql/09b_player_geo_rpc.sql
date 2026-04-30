-- ============================================================================
-- Brainrot Clicker — Phase 5b: SECURITY DEFINER RPC for player geo writes.
--
-- 09_player_geo.sql added the columns. The client tries to UPDATE the row
-- directly, but RLS on public.players blocks anon-role writes (intentionally
-- — we don't want anonymous users editing arbitrary fields). The right
-- pattern in this codebase is a SECURITY DEFINER function that bypasses
-- RLS for this one specific use case.
--
-- Geo is best-effort, low-sensitivity data. The function accepts a
-- player_id and ipapi-shaped fields, scoped to ONLY the geo columns (not
-- pin / username / is_admin / etc.).
--
-- Idempotent. Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.player_update_geo(
  p_player_id   uuid,
  p_country     text,
  p_country_code text,
  p_region      text,
  p_city        text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.players
     SET country        = p_country,
         country_code   = p_country_code,
         region         = p_region,
         city           = p_city,
         geo_updated_at = NOW()
   WHERE id = p_player_id;
END;
$$;
