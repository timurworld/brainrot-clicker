-- ============================================================================
-- Brainrot Clicker — rename skin 44 to Frankenstini Sharkini.
--
-- Shipped as "Frankenstini Squalini" from the original brief, but the
-- artwork file is 46_Frankenstini_Sharkini.png and Sharkini is the intended
-- name.
--
-- This matters beyond cosmetics: the skin_gifts -> inventory trigger
-- resolves a gift by matching skin_name against skin_meta.name. With the
-- apps renamed and the row still reading Squalini, every gift of this
-- character would be silently discarded.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

UPDATE public.skin_meta
   SET name = 'Frankenstini Sharkini'
 WHERE skin_id = 44;

-- Any gift rows still queued under the old name would never resolve.
UPDATE public.skin_gifts
   SET skin_name = 'Frankenstini Sharkini'
 WHERE lower(skin_name) = 'frankenstini squalini';

-- Verify: expect Frankenstini Sharkini, and no rows left under the old name.
SELECT skin_id, name FROM public.skin_meta WHERE skin_id = 44;
SELECT count(*) AS stale_gift_rows FROM public.skin_gifts
 WHERE lower(skin_name) = 'frankenstini squalini';
