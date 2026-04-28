-- ============================================================================
-- Brainrot Clicker — Phase 6 patch: de-pump the two trillionaire bots.
--
-- RizzGodKing + SigmaBossX were manually pumped to 31.6 Q / 28.1 Q earlier
-- as a one-off demo to fill leaderboard slots #2/#3. With the rest of the
-- bot population sitting at 20-50 M, those two stick out as obviously
-- seeded. Drop them to a believable few-billion range so the leaderboard
-- top reads as: real players → quadrillions, bots → billions/millions.
--
-- Updates BOTH the leaderboard row AND game_saves.save_data so the values
-- stay consistent if the bot ever logs in / their save round-trips.
--
-- Idempotent. Safe to re-run (numbers will rejitter).
-- ============================================================================

DO $$
DECLARE
  v_rizz_id  uuid;
  v_sigma_id uuid;
  v_rizz_pts  bigint := 5000000000 + floor(random() * 1500000000)::bigint;  -- 5.0–6.5B
  v_sigma_pts bigint := 3000000000 + floor(random() * 1200000000)::bigint;  -- 3.0–4.2B
BEGIN
  SELECT id INTO v_rizz_id  FROM public.players WHERE LOWER(username) = 'rizzgodking';
  SELECT id INTO v_sigma_id FROM public.players WHERE LOWER(username) = 'sigmabossx';

  IF v_rizz_id IS NOT NULL THEN
    UPDATE public.leaderboard SET lifetime_points = v_rizz_pts WHERE player_id = v_rizz_id;
    UPDATE public.game_saves
       SET save_data = jsonb_set(
                          jsonb_set(COALESCE(save_data, '{}'::jsonb), '{lifetimePoints}', to_jsonb(v_rizz_pts)),
                          '{points}', to_jsonb(v_rizz_pts)),
           updated_at = now()
     WHERE player_id = v_rizz_id;
  END IF;

  IF v_sigma_id IS NOT NULL THEN
    UPDATE public.leaderboard SET lifetime_points = v_sigma_pts WHERE player_id = v_sigma_id;
    UPDATE public.game_saves
       SET save_data = jsonb_set(
                          jsonb_set(COALESCE(save_data, '{}'::jsonb), '{lifetimePoints}', to_jsonb(v_sigma_pts)),
                          '{points}', to_jsonb(v_sigma_pts)),
           updated_at = now()
     WHERE player_id = v_sigma_id;
  END IF;
END$$;
