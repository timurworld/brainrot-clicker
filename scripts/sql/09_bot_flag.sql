-- ============================================================================
-- Brainrot Clicker — Phase 6 prep: explicit `is_bot` flag on players.
--
-- Bots are currently identified by a hardcoded username list in testbots.js.
-- For server-side bot leaderboard cron we want a clean DB query like
-- "WHERE is_bot = true" instead of a 36-name IN-list.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS players_is_bot_idx ON public.players(is_bot) WHERE is_bot;

-- Mark the existing 36-bot roster from scripts/testbots.js
UPDATE public.players SET is_bot = true
WHERE LOWER(username) IN (
  'fanumtax','hawktuahking','bombardiroboss','skibidimax69','rizzlerlord',
  'ohiofanum','sigmatuah','rizzbomber','skibidichad','noobslayer420',
  'ohiolvl99','brainrotpilot','tuahmonster','ratioking','ceoofrizz',
  'toiletskibidi','maxfanumtax','gyattlord420','brainblast99','sigmarizzler',
  'brainrotking77','skibidiohio99','hawktuahmaster','rizzgodking','ohiomaxlvl',
  'sigmabossx','tuahlordepic','brainpilot77','fanumproboss','gyattchampion',
  'brainrotkaiser','skibidiqueen','tuahdragon','ohiopharaoh','rizzninja','sigmawarlord'
);
