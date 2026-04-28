-- ============================================================================
-- Brainrot Clicker — Phase 7 prep: skin_meta entry for Cupideini Hockini.
--
-- New Mythic tier skin (#26). Adds skin_meta row so:
--   • The skin_gifts→inventory trigger resolves "Cupideini Hockini" by name
--     when admin gifts it (otherwise the gift is silently dropped — same
--     bug Auraberry hit before migration 07).
--   • is_limited = true ensures inventory_grant assigns a serial number.
--
-- Idempotent.
-- ============================================================================

INSERT INTO public.skin_meta (skin_id, name, tag, obtain, is_limited)
VALUES (26, 'Cupideini Hockini', 'Sportini', 'fusion', true)
ON CONFLICT (skin_id) DO UPDATE
  SET name       = EXCLUDED.name,
      tag        = EXCLUDED.tag,
      obtain     = EXCLUDED.obtain,
      is_limited = EXCLUDED.is_limited;
