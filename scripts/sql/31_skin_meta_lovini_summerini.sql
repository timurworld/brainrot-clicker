-- ============================================================================
-- Brainrot Clicker — skin_meta for the Lovini / Summerini batch (ids 34-41).
--
-- These eight shipped on the site in August but were never added to the game,
-- so they had no roster entry and no skin_meta row. Adding both now.
--
-- Without these rows the skin_gifts -> inventory trigger silently discards
-- admin gifts, the same failure the Fidgetini batch hit (see migration 30).
--
--   #34 Bobini Lovini        Secret     250M  11x
--   #35 Cappy Family         Rare        60M  8x
--   #36 Chillen Lemonade     Secret     400M  15x
--   #37 Cupcakini Sweetini   Secret     200M  10.5x
--   #38 Cuppini Triondini    Legendary  120M  9x
--   #39 Lemon Lemon Sahur    Rare        35M  7.5x
--   #40 Lovini Vibini        Limited   fusion 28x   (serial-tracked)
--   #41 Toastini Butterini   Rare        30M  7.5x
--
-- Idempotent. Safe to re-run.
-- ============================================================================

INSERT INTO public.skin_meta (skin_id, name, tag, obtain, is_limited)
VALUES
  (34, 'Bobini Lovini',      'Lovini',    'points', false),
  (35, 'Cappy Family',       'Lovini',    'points', false),
  (36, 'Chillen Lemonade',   'Summerini', 'points', false),
  (37, 'Cupcakini Sweetini', 'Lovini',    'points', false),
  (38, 'Cuppini Triondini',  'Summerini', 'points', false),
  (39, 'Lemon Lemon Sahur',  'Summerini', 'points', false),
  (40, 'Lovini Vibini',      'Lovini',    'fusion', true),
  (41, 'Toastini Butterini', 'Lovini',    'points', false)
ON CONFLICT (skin_id) DO UPDATE
  SET name       = EXCLUDED.name,
      tag        = EXCLUDED.tag,
      obtain     = EXCLUDED.obtain,
      is_limited = EXCLUDED.is_limited;

-- Verify: expect 43 rows.
SELECT count(*) AS skin_meta_rows FROM public.skin_meta;
