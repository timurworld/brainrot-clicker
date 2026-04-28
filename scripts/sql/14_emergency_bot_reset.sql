-- ============================================================================
-- Brainrot Clicker — Phase 6 emergency: reset every bot to inside its band.
--
-- The v1 ticker ran on its 15-min schedule before v2 shipped and pumped
-- ALL 36 bots into the 1.6–2.1 quadrillion range. v2's per-bot caps are
-- correct, but the ticker only adds points (it never subtracts), so every
-- bot is already 4-million× above its `bot_band_max` and v2 silently
-- skips them.
--
-- This migration force-resets every bot's `leaderboard.lifetime_points`
-- AND `game_saves.save_data.lifetimePoints` to a random value INSIDE its
-- band, leaving room for the v2 ticker to take over the natural climb.
--
--   TOP band (50 B max)  → reset to 10–20 B   (3 marquee bots)
--   MID band  (5 B max)  → reset to  1–2  B   (7 mid bots)
--   LOW band (500 M max) → reset to 50–200 M  (rest)
--
-- Pauses the cron via the kill switch first so nothing runs during the
-- reset, then re-enables it at the end.
--
-- Idempotent. Re-running just rejitters the values.
-- ============================================================================

-- 1. Pause growth
UPDATE public.admin_config SET value = 'false'::jsonb, updated_at = now()
WHERE key = 'bot_growth_enabled';

-- 2. Reset every bot to a value inside its band
DO $$
DECLARE
  v_bot       record;
  v_target    bigint;
BEGIN
  FOR v_bot IN
    SELECT p.id AS player_id, p.username, p.bot_band_max
      FROM public.players p
     WHERE p.is_bot = true AND p.bot_band_max IS NOT NULL
  LOOP
    -- Pick a target inside the band, leaving 50–80% headroom so the
    -- ticker has somewhere to climb. Lower band fills more aggressively.
    IF v_bot.bot_band_max >= 50000000000 THEN          -- TOP: 50B band
      v_target := 10000000000 + floor(random() * 10000000000)::bigint;   -- 10–20 B
    ELSIF v_bot.bot_band_max >= 5000000000 THEN        -- MID: 5B band
      v_target := 1000000000 + floor(random() * 1000000000)::bigint;     -- 1–2 B
    ELSE                                                -- LOW: 500M band
      v_target := 50000000 + floor(random() * 150000000)::bigint;        -- 50–200 M
    END IF;

    UPDATE public.leaderboard
       SET lifetime_points = v_target,
           updated_at      = now()
     WHERE player_id = v_bot.player_id;

    UPDATE public.game_saves
       SET save_data = jsonb_set(
                          jsonb_set(COALESCE(save_data, '{}'::jsonb), '{lifetimePoints}', to_jsonb(v_target)),
                          '{points}', to_jsonb(v_target)),
           updated_at = now()
     WHERE player_id = v_bot.player_id;
  END LOOP;
END$$;

-- 3. Resume growth so the v2 hourly ticker takes over from here
UPDATE public.admin_config SET value = 'true'::jsonb, updated_at = now()
WHERE key = 'bot_growth_enabled';
