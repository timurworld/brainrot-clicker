-- ============================================================================
-- Brainrot Clicker — Phase 6 v2: tier-band bot ticker + hourly cadence.
--
-- v1 problems:
--   • Gain scaled off top_real_points (often quadrillions) — a single tick
--     could shoot a tail bot from millions into trillions.
--   • Single global cap (95% of top_real) meant ALL bots eventually
--     converged near the cap, flattening the leaderboard distribution.
--
-- v2 design:
--   • Each bot has a persistent `bot_band_max` (its individual ceiling).
--   • Three bands:
--       TOP  = 50 B   (3 bots — fill the top of the bot pack)
--       MID  =  5 B   (7 bots — middle of the pack)
--       LOW  = 500 M  (rest — long tail)
--   • Each tick, a bot's points compound 0.5%–2% off its OWN current
--     value, capped at its band_max.
--   • Bots saturate at their band ceiling and stop growing.
--   • Result: a stable, realistic-looking distribution where real
--     players occupy the top of the leaderboard naturally.
--
-- Cadence: hourly (was every 15 min). Less write churn, still feels alive.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ---------- 1. Per-bot band ceiling ----------
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS bot_band_max bigint;

-- TOP band (50B): 3 marquee bots
UPDATE public.players SET bot_band_max = 50000000000
WHERE is_bot = true AND bot_band_max IS NULL
  AND LOWER(username) IN ('rizzgodking','sigmabossx','toiletskibidi');

-- MID band (5B): 7 named bots
UPDATE public.players SET bot_band_max = 5000000000
WHERE is_bot = true AND bot_band_max IS NULL
  AND LOWER(username) IN (
    'fanumtax','hawktuahking','bombardiroboss','skibidimax69',
    'rizzlerlord','sigmatuah','rizzbomber'
  );

-- LOW band (500M): everyone else with is_bot = true
UPDATE public.players SET bot_band_max = 500000000
WHERE is_bot = true AND bot_band_max IS NULL;

-- ---------- 2. Rewrite bot_leaderboard_tick ----------
CREATE OR REPLACE FUNCTION public.bot_leaderboard_tick()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled  boolean;
  v_bot      record;
  v_pct_bp   int;       -- basis points (1bp = 0.01%); range 50..200 = 0.5%–2.0%
  v_gain     bigint;
  v_new_pts  bigint;
  v_updated  int := 0;
BEGIN
  SELECT (value::text)::boolean INTO v_enabled
    FROM public.admin_config WHERE key = 'bot_growth_enabled';
  IF NOT COALESCE(v_enabled, false) THEN RETURN 0; END IF;

  FOR v_bot IN
    SELECT lb.player_id, lb.lifetime_points, p.bot_band_max
      FROM public.leaderboard lb
      JOIN public.players p ON p.id = lb.player_id
     WHERE p.is_bot = true AND p.bot_band_max IS NOT NULL
  LOOP
    -- Already saturated at this bot's band ceiling — skip
    IF v_bot.lifetime_points >= v_bot.bot_band_max THEN CONTINUE; END IF;

    -- Compound off bot's current points: random 0.5%–2.0% per tick
    v_pct_bp := 50 + floor(random() * 151)::int;
    v_gain := GREATEST(1, (v_bot.lifetime_points * v_pct_bp / 10000)::bigint);
    v_new_pts := v_bot.lifetime_points + v_gain;
    IF v_new_pts > v_bot.bot_band_max THEN v_new_pts := v_bot.bot_band_max; END IF;

    UPDATE public.leaderboard
       SET lifetime_points = v_new_pts,
           updated_at      = now()
     WHERE player_id = v_bot.player_id;
    v_updated := v_updated + 1;
  END LOOP;

  RETURN v_updated;
END;
$$;

-- ---------- 3. Reschedule the cron — hourly, not every 15 min ----------
-- Requires pg_cron extension (Dashboard → Database → Extensions → pg_cron).
DO $$
BEGIN
  PERFORM cron.unschedule('bot-leaderboard-tick');
EXCEPTION WHEN OTHERS THEN
  -- No prior schedule (or pg_cron not enabled yet) — silent OK.
END$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'bot-leaderboard-tick',
    '0 * * * *',                                  -- top of every hour
    $cron$SELECT public.bot_leaderboard_tick();$cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron.schedule unavailable — enable pg_cron extension first, then re-run this file.';
END$$;
