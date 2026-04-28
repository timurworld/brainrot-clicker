-- ============================================================================
-- Brainrot Clicker — Phase 6 polish: rename bots to a diverse roster.
--
-- The original 36-bot roster was 100% Skibidi/Sigma/Rizz/Tuah/Ohio/Brainrot
-- mash-ups — together they read as obviously generated. New roster mixes:
--   • ~28% on-brand brainrot names (so the theme still shows up + the
--     three top-band marquee bots keep their identity so daily players
--     don't notice the top of the leaderboard "vanish")
--   • ~72% gamer tags / animal+adjective / random-word combos that look
--     like real Roblox-style kid usernames
--
-- KEPT (NOT renamed):
--   ToiletSkibidi, RizzGodKing, SigmaBossX  — top-band marquee bots,
--                                             usually visible top-7,
--                                             stable identity protects
--                                             against "where did they go"
--   SkibidiChad                              — already a fine name
--
-- Player UUIDs DON'T change — only the username text — so existing
-- inventory, fusion history, trade rows, and game_saves stay linked.
--
-- Idempotent. Re-running matches nothing the second time.
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
  ('maxfanumtax',      'SnipeKid44'),
  ('gyattlord420',     'Waves07'),
  ('brainblast99',     'CoolBeans99'),
  ('sigmarizzler',     'BananaPhone'),
  ('brainrotking77',   'JellyMonster'),
  ('skibidiohio99',    'NinjaPanda'),
  ('hawktuahmaster',   'PixelSquid'),
  ('ohiomaxlvl',       'CloudHopper9'),
  ('tuahlordepic',     'MintyFresh'),
  ('brainpilot77',     'PinkDragon'),
  ('fanumproboss',     'FrostyKnight'),
  ('gyattchampion',    'SunnyKid23'),
  ('brainrotkaiser',   'ToadKnight7'),
  ('skibidiqueen',     'BlocxyKing'),
  ('tuahdragon',       'SpicyTurtle'),
  ('ohiopharaoh',      'xX_Sn1per_Xx'),
  ('rizzninja',        'PeachStorm'),
  ('sigmawarlord',     'LemonSlice99')
  -- Intentionally NOT in the map:
  --   skibidichad      (already a fine name)
  --   toiletskibidi    (top-band marquee — kept for leaderboard stability)
  --   rizzgodking      (top-band marquee — kept for leaderboard stability)
  --   sigmabossx       (top-band marquee — kept for leaderboard stability)
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
