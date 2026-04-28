-- ============================================================================
-- Brainrot Clicker — Phase 6 polish: rename bots to a diverse roster.
--
-- The original 36-bot roster was 100% Skibidi/Sigma/Rizz/Tuah/Ohio/Brainrot
-- mash-ups — together they read as obviously generated. New roster mixes:
--   • ~20% on-brand brainrot names (so the theme still shows up)
--   • ~80% gamer tags / animal+adjective / random word combos that look
--     like real Roblox-style kid usernames
--
-- Player UUIDs DON'T change — only the username text — so existing
-- inventory, fusion history, trade rows, and game_saves stay linked.
--
-- Three tables touched per rename:
--   1. players.username           (canonical, lowercase)
--   2. leaderboard.username       (denormalized display copy, mixed-case)
--   3. game_saves.save_data.username (denormalized inside JSON)
--
-- Idempotent. If you re-run after the rename has already happened,
-- the WHERE LOWER(...) = old_username matches nothing and no rows
-- update — safe.
-- ============================================================================

WITH renames(old_lower, new_display) AS (VALUES
  ('fanumtax',         'FanumKid'),
  ('hawktuahking',     'TuahKing'),
  ('bombardiroboss',   'ProGamer42'),
  ('skibidimax69',     'zombiekid77'),
  ('rizzlerlord',      'RizzMaster'),
  ('ohiofanum',        'OhioMain'),
  ('sigmatuah',        'SigmaBoy'),
  ('rizzbomber',       'RoboBlast'),
  ('noobslayer420',    'NoobSlay3r'),
  ('ohiolvl99',        'PixelKnight'),
  ('brainrotpilot',    'BrainBoss'),
  ('tuahmonster',      'CrispyBacon'),
  ('ratioking',        'ToastedKing'),
  ('ceoofrizz',        'MrCheese'),
  ('toiletskibidi',    'BlueRocket'),
  ('maxfanumtax',      'SnipeKid44'),
  ('gyattlord420',     'Waves07'),
  ('brainblast99',     'CoolBeans99'),
  ('sigmarizzler',     'BananaPhone'),
  ('brainrotking77',   'JellyMonster'),
  ('skibidiohio99',    'NinjaPanda'),
  ('hawktuahmaster',   'PixelSquid'),
  ('rizzgodking',      'Starboy_15'),
  ('ohiomaxlvl',       'CloudHopper9'),
  ('sigmabossx',       'PuddingDragon'),
  ('tuahlordepic',     'MintyFresh'),
  ('brainpilot77',     'PinkDragon'),
  ('fanumproboss',     'SneakyKitty'),
  ('gyattchampion',    'SunnyKid23'),
  ('brainrotkaiser',   'ToadKnight7'),
  ('skibidiqueen',     'BlocxyKing'),
  ('tuahdragon',       'SpicyTurtle'),
  ('ohiopharaoh',      'xX_Sn1per_Xx'),
  ('rizzninja',        'PeachStorm'),
  ('sigmawarlord',     'LemonSlice99')
  -- (skibidichad keeps its name; intentionally not in the map)
),
players_update AS (
  UPDATE public.players p
     SET username = LOWER(r.new_display)
    FROM renames r
   WHERE LOWER(p.username) = r.old_lower
   RETURNING p.id
),
leaderboard_update AS (
  UPDATE public.leaderboard lb
     SET username = r.new_display
    FROM renames r
   WHERE LOWER(lb.username) = r.old_lower
   RETURNING lb.player_id
),
saves_update AS (
  UPDATE public.game_saves gs
     SET save_data = jsonb_set(gs.save_data, '{username}', to_jsonb(LOWER(r.new_display))),
         updated_at = now()
    FROM renames r
   WHERE LOWER(gs.save_data->>'username') = r.old_lower
   RETURNING gs.player_id
)
SELECT
  (SELECT count(*) FROM players_update)     AS players_renamed,
  (SELECT count(*) FROM leaderboard_update) AS leaderboard_renamed,
  (SELECT count(*) FROM saves_update)       AS saves_renamed;
