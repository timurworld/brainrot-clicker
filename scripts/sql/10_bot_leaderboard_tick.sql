-- ============================================================================
-- Brainrot Clicker — Phase 6: server-side bot leaderboard ticker.
--
-- Goal: keep the leaderboard feeling alive 24/7 even when no real players
-- are online, WITHOUT letting bots permanently lock out top spots.
--
-- Algorithm (one tick):
--   1. Read kill switch from admin_config; abort if disabled
--   2. Find top non-bot player's lifetime_points → that's the universe ceiling
--   3. cap = 0.95 × top_real_points  (real player at #1 always stays #1)
--   4. For each bot:
--        compute global rank (across all players)
--        tier_mult: rank ≤3 → 0.1×,  rank 4-10 → 0.4×,  rank ≥11 → 1.0×
--        base_gain: random 0.5%–3% of top_real_points
--        new_points = current + base_gain × tier_mult
--        clamp at cap
--        update if strictly higher than current
--
-- Designed to run on a 15-minute pg_cron schedule (see 11_schedule_bot_tick.sql).
-- Safe to call manually / re-run / call frequently — idempotent given the cap.
-- ============================================================================

-- ---------- 1. admin_config table (kill switch + future flags) ----------
CREATE TABLE IF NOT EXISTS public.admin_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_config_select_all ON public.admin_config;
CREATE POLICY admin_config_select_all ON public.admin_config FOR SELECT USING (true);
-- Writes go through SECURITY DEFINER functions only — no client write policy.

INSERT INTO public.admin_config (key, value)
VALUES ('bot_growth_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------- 2. bot_leaderboard_tick function ----------
CREATE OR REPLACE FUNCTION public.bot_leaderboard_tick()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled    boolean;
  v_top_real   bigint;
  v_cap        bigint;
  v_bot        record;
  v_tier_mult  numeric;
  v_pct        int;     -- random 5..30 → 0.5%–3.0%
  v_base_gain  bigint;
  v_new_pts    bigint;
  v_updated    int := 0;
BEGIN
  -- Kill switch
  SELECT (value::text)::boolean INTO v_enabled
    FROM public.admin_config WHERE key = 'bot_growth_enabled';
  IF NOT COALESCE(v_enabled, false) THEN RETURN 0; END IF;

  -- Top non-bot player's lifetime_points (ceiling reference)
  SELECT MAX(lb.lifetime_points) INTO v_top_real
    FROM public.leaderboard lb
    JOIN public.players p ON p.id = lb.player_id
   WHERE p.is_bot = false;

  IF v_top_real IS NULL OR v_top_real <= 0 THEN
    RETURN 0;  -- nothing to anchor against; bail
  END IF;

  v_cap := (v_top_real * 95 / 100);

  -- Iterate bots with their GLOBAL rank (across all players, bot + real)
  FOR v_bot IN
    WITH ranked AS (
      SELECT lb.player_id, lb.lifetime_points, p.is_bot,
             ROW_NUMBER() OVER (ORDER BY lb.lifetime_points DESC NULLS LAST) AS gl_rank
        FROM public.leaderboard lb
        JOIN public.players p ON p.id = lb.player_id
    )
    SELECT player_id, lifetime_points, gl_rank
      FROM ranked
     WHERE is_bot = true
  LOOP
    -- Tier multiplier by global rank
    IF v_bot.gl_rank <= 3      THEN v_tier_mult := 0.1;
    ELSIF v_bot.gl_rank <= 10  THEN v_tier_mult := 0.4;
    ELSE                            v_tier_mult := 1.0;
    END IF;

    -- Random gain: 5..30 (i.e. 0.5%–3.0%) of top_real_points
    v_pct := 5 + floor(random() * 26)::int;
    v_base_gain := (v_top_real * v_pct / 1000);

    v_new_pts := v_bot.lifetime_points + (v_base_gain * v_tier_mult)::bigint;
    IF v_new_pts > v_cap THEN v_new_pts := v_cap; END IF;

    -- Skip no-op / down-tick
    IF v_new_pts <= v_bot.lifetime_points THEN CONTINUE; END IF;

    UPDATE public.leaderboard
       SET lifetime_points = v_new_pts,
           updated_at      = now()
     WHERE player_id = v_bot.player_id;

    v_updated := v_updated + 1;
  END LOOP;

  RETURN v_updated;
END;
$$;

-- Convenience: admin can run it manually to test
-- SELECT public.bot_leaderboard_tick();
