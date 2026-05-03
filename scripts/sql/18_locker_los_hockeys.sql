-- ============================================================================
-- Brainrot Clicker — Phase 7: spawn the Los Hockeys fusion locker.
--
-- 3-skin recipe (first non-2-input fusion in the game):
--   1× Stick Stick (#20)  +  1× No My Pucks (#21)  +  1× Cupideini Hockini (#26)
--   →  1× Los Hockeys (#27, Limited, 30×)
--
-- Stock: 25 (more generous than Maple Cup's 10 — Limited tier, not Mythic).
-- Duration: 48 hours (gives players 2 days to assemble the recipe).
--
-- The locker_fuse RPC walks v_locker.recipe via jsonb_array_elements, so
-- a 3-element recipe just iterates 3 times. No code changes required.
--
-- NOT idempotent — running twice spawns two lockers. Re-run only after
-- taking the previous one offline (locker_take_offline) or letting it expire.
-- ============================================================================

-- Replace with the actual admin credentials when running in Supabase
-- (assert_admin_auth gates on players.is_admin = true).
SELECT public.locker_spawn(
  p_admin_username  := 'tmoney',
  p_admin_pin       := '0746',
  p_name            := 'Los Hockeys',
  p_recipe          := '[
                          {"skin_id": 20, "qty": 1},
                          {"skin_id": 21, "qty": 1},
                          {"skin_id": 26, "qty": 1}
                        ]'::jsonb,
  p_output_skin_id  := 27,
  p_total_stock     := 25,
  p_duration_hours  := 48,
  p_admin_only      := false
);
