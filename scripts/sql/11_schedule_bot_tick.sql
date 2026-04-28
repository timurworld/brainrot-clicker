-- ============================================================================
-- Brainrot Clicker — Phase 6 final: schedule the bot leaderboard ticker.
--
-- Requires the pg_cron extension. On Supabase: enable it once via
--   Dashboard → Database → Extensions → pg_cron → toggle on
-- (or just run the CREATE EXTENSION line below; Supabase will grant it).
--
-- Cadence: every 15 minutes. Each tick walks all bots, applies a small
-- tier-throttled random gain, and clamps each bot at 95 % of the top real
-- player's lifetime_points. With 36 bots × ~2% avg gain × tier multipliers,
-- the leaderboard tail moves visibly between any two visits to the page,
-- but the top 3 spots are tied to real-player activity.
--
-- Idempotent. Re-running unschedules + reschedules.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop any existing schedule with the same name so this file can re-run.
DO $$
BEGIN
  PERFORM cron.unschedule('bot-leaderboard-tick');
EXCEPTION WHEN OTHERS THEN
  -- No existing job — fine.
END$$;

SELECT cron.schedule(
  'bot-leaderboard-tick',
  '*/15 * * * *',                                -- every 15 minutes
  $$SELECT public.bot_leaderboard_tick();$$
);

-- Quick checks (paste separately to verify):
--   SELECT * FROM cron.job WHERE jobname = 'bot-leaderboard-tick';
--   SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname='bot-leaderboard-tick') ORDER BY start_time DESC LIMIT 5;
--
-- Pause without dropping the schedule:
--   UPDATE public.admin_config SET value = 'false'::jsonb WHERE key = 'bot_growth_enabled';
-- Resume:
--   UPDATE public.admin_config SET value = 'true'::jsonb WHERE key = 'bot_growth_enabled';
