-- ============================================================================
-- Brainrot Clicker — Phase 7: Los Hockeys ingredient drop event.
--
-- Pre-locker drop event so players can accumulate the 3-skin recipe before
-- the Los Hockeys fusion locker opens.
--
-- Pool (100 each):
--   • Stick Stick (#20)
--   • No My Pucks (#21)
--   • Cupideini Hockini (#26)  — Mythic, originally 10-stock Maple Cup. This
--     deliberately relaxes that cap so there's enough supply to feed the
--     Los Hockeys fusion (locker is 25 stock; needs ≥25 of each ingredient
--     in circulation). Confirmed creative call by emoney.
--
-- Cadence: 1-in-500 baseline rate, wave every 10 min, 60s wave duration,
-- 10× wave multiplier. Duration 24h. Public to all players immediately.
--
-- Re-running this file = "drop the old event, spawn fresh." Ends any active
-- drop_events first via the canonical RPC, then spawns the new one.
-- ============================================================================

-- 1. End every currently active drop event (replace, not stack).
DO $$
DECLARE v_id uuid;
BEGIN
  FOR v_id IN SELECT id FROM public.drop_events WHERE status = 'active' LOOP
    PERFORM public.drop_event_end('tmoney', '0746', v_id);
  END LOOP;
END$$;

-- 2. Spawn the Los Hockeys ingredient drop event.
SELECT public.drop_event_spawn(
  p_admin_username     := 'tmoney',
  p_admin_pin          := '0746',
  p_name               := 'Los Hockeys Recipe Drop',
  p_pool               := '[
                             {"skin_id": 20, "total": 100},
                             {"skin_id": 21, "total": 100},
                             {"skin_id": 26, "total": 100}
                           ]'::jsonb,
  p_baseline_rate_inv  := 500,
  p_wave_frequency_min := 10,
  p_wave_duration_sec  := 60,
  p_wave_multiplier    := 10,
  p_duration_hours     := 24,
  p_admin_only         := false
);
