-- ============================================================================
-- Brainrot Clicker — Phase 5: player geolocation columns.
--
-- Adds approximate IP-based location to public.players so we can answer
-- "where are my players?" questions without doing one-off log digs every
-- time. Captured client-side via ipapi.co on register + login (best-effort,
-- never blocks auth). City-level accuracy is ~70-90% from public IP geo.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS country        text,
  ADD COLUMN IF NOT EXISTS country_code   text,
  ADD COLUMN IF NOT EXISTS region         text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS geo_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_players_country ON public.players (country);
CREATE INDEX IF NOT EXISTS idx_players_city    ON public.players (city);
