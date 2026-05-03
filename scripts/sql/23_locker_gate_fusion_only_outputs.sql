-- ============================================================================
-- Brainrot Clicker — locker_spawn: hard server-side gate on fusion-only outputs.
--
-- Companion to the admin-hub UI gate in SpawnLocker.tsx (commit cb4772a):
-- the locker output dropdown is now restricted to Limited + Mythic skins,
-- but the underlying RPC still trusts whatever p_output_skin_id is passed.
-- Anyone with admin creds calling locker_spawn directly (via supabase-js,
-- a one-off SQL paste, etc.) can still set the output to a Common skin or
-- a Prestige one, which would break the design rule that Limited + Mythic
-- are the ONLY tiers obtainable via fusion.
--
-- This migration rewrites locker_spawn to reject non-fusion-tier outputs
-- with 'OUTPUT_NOT_FUSION_TIER'. Allowed output ids are hardcoded in a
-- constant array — same approach as scripts/sql/22_drop_event_gate_limited.sql,
-- and same maintenance discipline: update the array when new Limited or
-- Mythic skins ship.
--
-- Currently allowed outputs: 22 Hockey Bros (Limited), 26 Cupideini Hockini
-- (Mythic), 27 Los Hockeys (Limited).
--
-- Idempotent. Safe to re-run.
-- ============================================================================

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
DECLARE
  v_locker_id uuid;
  -- Fusion-only tier skin ids (Limited + Mythic). The output of any
  -- locker fusion MUST be one of these. Update when new Limited/Mythic
  -- skins are added to src/App.jsx CHARACTERS. Mirrors the gate in
  -- SpawnLocker.tsx FUSION_OUTPUT_TIERS.
  FUSION_OUTPUT_SKIN_IDS constant int[] := ARRAY[22, 26, 27];
BEGIN
  PERFORM public.assert_admin_auth(p_admin_username, p_admin_pin);

  IF p_total_stock < 1 THEN RAISE EXCEPTION 'BAD_STOCK'; END IF;

  -- Output must be a fusion-tier skin (Limited or Mythic). Other tiers
  -- have their own acquisition path (drops, points unlock, ascend) and
  -- shouldn't be given out via locker fusion.
  IF NOT (p_output_skin_id = ANY(FUSION_OUTPUT_SKIN_IDS)) THEN
    RAISE EXCEPTION 'OUTPUT_NOT_FUSION_TIER: skin_id % is not a Limited or Mythic skin. Locker output must be one of: %', p_output_skin_id, FUSION_OUTPUT_SKIN_IDS
      USING HINT = 'Currently allowed: 22 (Hockey Bros), 26 (Cupideini Hockini), 27 (Los Hockeys). Update the FUSION_OUTPUT_SKIN_IDS array in this function when new Limited/Mythic skins ship.';
  END IF;

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
