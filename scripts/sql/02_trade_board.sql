-- ============================================================================
-- Brainrot Clicker V2 — Phase 2: Trade Board
-- Run this in the Supabase SQL editor AFTER 01_inventory.sql.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------- 1. Trade listings ----------
CREATE TABLE IF NOT EXISTS public.trade_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  seller_username text NOT NULL,                  -- denormalized for display
  seller_inventory_id uuid NOT NULL,              -- the reserved instance/stack-row
  offer_skin_id int NOT NULL,
  offer_quantity int NOT NULL DEFAULT 1,
  offer_serial_number int,                        -- if a specific serialed instance
  want_skin_id int NOT NULL,
  want_quantity int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',          -- active | accepted | cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_by_player_id uuid,
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS trade_listings_status_idx ON public.trade_listings(status);
CREATE INDEX IF NOT EXISTS trade_listings_seller_idx ON public.trade_listings(seller_player_id);
CREATE INDEX IF NOT EXISTS trade_listings_want_idx   ON public.trade_listings(want_skin_id);
CREATE INDEX IF NOT EXISTS trade_listings_offer_idx  ON public.trade_listings(offer_skin_id);

-- ---------- 2. Trade history ----------
CREATE TABLE IF NOT EXISTS public.trade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid,
  seller_player_id uuid NOT NULL,
  seller_username text NOT NULL,
  buyer_player_id uuid NOT NULL,
  buyer_username text NOT NULL,
  seller_gave jsonb NOT NULL,                     -- {skin_id, quantity, serial_number?}
  seller_got jsonb NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trade_history_seller_idx ON public.trade_history(seller_player_id);
CREATE INDEX IF NOT EXISTS trade_history_buyer_idx  ON public.trade_history(buyer_player_id);

-- ---------- 3. RLS ----------
ALTER TABLE public.trade_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_history  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trade_listings_select_all ON public.trade_listings;
DROP POLICY IF EXISTS trade_history_select_all  ON public.trade_history;

CREATE POLICY trade_listings_select_all ON public.trade_listings FOR SELECT USING (true);
CREATE POLICY trade_history_select_all  ON public.trade_history  FOR SELECT USING (true);
-- All writes go through SECURITY DEFINER RPCs.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='trade_listings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_listings';
  END IF;
END$$;

-- ---------- 4. Auth helper ----------
-- Validates (player_id, pin). Used by all player-initiated RPCs.
CREATE OR REPLACE FUNCTION public.assert_player_auth(p_player_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM public.players WHERE id = p_player_id AND pin = p_pin;
  IF NOT FOUND THEN RAISE EXCEPTION 'unauthorized'; END IF;
END;
$$;

-- ---------- 5. trade_list RPC ----------
-- Player creates a listing. Validates: ownership, no trade lock, not already
-- reserved, max 5 active listings. Marks the inventory row reserved. Returns
-- the new listing id.

CREATE OR REPLACE FUNCTION public.trade_list(
  p_player_id uuid,
  p_pin text,
  p_inventory_id uuid,
  p_want_skin_id int,
  p_want_quantity int DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_listing_id uuid;
  v_active_count int;
  v_username text;
BEGIN
  PERFORM public.assert_player_auth(p_player_id, p_pin);

  -- Lock the inventory row so concurrent listing attempts serialize.
  SELECT * INTO v_inv FROM public.inventory
   WHERE id = p_inventory_id AND player_id = p_player_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_inv.reserved_by_listing IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_LISTED'; END IF;
  IF v_inv.trade_lock_until IS NOT NULL AND v_inv.trade_lock_until > now() THEN
    RAISE EXCEPTION 'TRADE_LOCKED';
  END IF;
  IF v_inv.quantity < 1 THEN RAISE EXCEPTION 'EMPTY_STACK'; END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM public.trade_listings
  WHERE seller_player_id = p_player_id AND status = 'active';
  IF v_active_count >= 5 THEN RAISE EXCEPTION 'TOO_MANY_LISTINGS'; END IF;

  IF p_want_quantity < 1 THEN RAISE EXCEPTION 'BAD_QUANTITY'; END IF;
  -- Don't let people list a trade for the same skin they're offering.
  IF p_want_skin_id = v_inv.skin_id THEN RAISE EXCEPTION 'SAME_SKIN'; END IF;

  SELECT username INTO v_username FROM public.players WHERE id = p_player_id;

  INSERT INTO public.trade_listings
    (seller_player_id, seller_username, seller_inventory_id,
     offer_skin_id, offer_quantity, offer_serial_number,
     want_skin_id, want_quantity)
  VALUES
    (p_player_id, v_username, p_inventory_id,
     v_inv.skin_id, 1, v_inv.serial_number,
     p_want_skin_id, p_want_quantity)
  RETURNING id INTO v_listing_id;

  -- Reserve the offered row. For stackables we lock the whole row even though
  -- only 1 unit transfers — V1 simplification (one trade per stack at a time).
  UPDATE public.inventory
     SET reserved_by_listing = v_listing_id
   WHERE id = p_inventory_id;

  RETURN v_listing_id;
END;
$$;

-- ---------- 6. trade_cancel RPC ----------
CREATE OR REPLACE FUNCTION public.trade_cancel(
  p_player_id uuid,
  p_pin text,
  p_listing_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing record;
BEGIN
  PERFORM public.assert_player_auth(p_player_id, p_pin);

  SELECT * INTO v_listing FROM public.trade_listings
   WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_listing.seller_player_id <> p_player_id THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_listing.status <> 'active' THEN RAISE EXCEPTION 'NOT_ACTIVE'; END IF;

  UPDATE public.trade_listings SET status = 'cancelled' WHERE id = p_listing_id;
  UPDATE public.inventory
     SET reserved_by_listing = NULL
   WHERE id = v_listing.seller_inventory_id;
END;
$$;

-- ---------- 7. trade_accept RPC ----------
-- Atomic 1-for-N swap. Buyer gives `want_quantity` of `want_skin_id` to seller,
-- receives the offered row (1 unit) from seller. For limited (serialed) want
-- skins, picks the buyer's oldest matching instance.

CREATE OR REPLACE FUNCTION public.trade_accept(
  p_player_id uuid,            -- buyer
  p_pin text,
  p_listing_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing record;
  v_offer_inv record;
  v_buyer_inv record;
  v_seller_username text;
  v_buyer_username text;
  v_want_meta record;
  v_offer_meta record;
  v_taken int;
  v_new_buyer_row uuid;
  v_new_seller_row uuid;
BEGIN
  PERFORM public.assert_player_auth(p_player_id, p_pin);

  SELECT * INTO v_listing FROM public.trade_listings
   WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_listing.status <> 'active' THEN RAISE EXCEPTION 'ALREADY_GONE'; END IF;
  IF v_listing.seller_player_id = p_player_id THEN RAISE EXCEPTION 'SELF_TRADE'; END IF;

  -- Lock seller's offered row.
  SELECT * INTO v_offer_inv FROM public.inventory
   WHERE id = v_listing.seller_inventory_id FOR UPDATE;
  IF NOT FOUND OR v_offer_inv.player_id <> v_listing.seller_player_id THEN
    RAISE EXCEPTION 'OFFER_GONE';
  END IF;
  IF v_offer_inv.quantity < 1 THEN RAISE EXCEPTION 'OFFER_EMPTY'; END IF;

  -- Look up skin meta (default is_limited=false for unknown skins).
  SELECT * INTO v_want_meta  FROM public.skin_meta WHERE skin_id = v_listing.want_skin_id;
  IF NOT FOUND THEN v_want_meta.is_limited := false; END IF;

  SELECT * INTO v_offer_meta FROM public.skin_meta WHERE skin_id = v_listing.offer_skin_id;
  IF NOT FOUND THEN v_offer_meta.is_limited := false; END IF;

  -- ---- Take buyer's want items ----
  IF v_want_meta.is_limited THEN
    -- Limited want: must transfer exactly want_quantity instances. For V1 we
    -- only allow want_quantity = 1 on limiteds.
    IF v_listing.want_quantity <> 1 THEN RAISE EXCEPTION 'BAD_QUANTITY'; END IF;
    SELECT * INTO v_buyer_inv FROM public.inventory
     WHERE player_id = p_player_id
       AND skin_id = v_listing.want_skin_id
       AND serial_number IS NOT NULL
       AND reserved_by_listing IS NULL
       AND (trade_lock_until IS NULL OR trade_lock_until <= now())
     ORDER BY serial_number ASC
     LIMIT 1
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'BUYER_MISSING'; END IF;
    -- Move limited instance: just rewrite player_id.
    UPDATE public.inventory
       SET player_id = v_listing.seller_player_id,
           acquired_at = now(),
           acquired_method = 'trade'
     WHERE id = v_buyer_inv.id;
  ELSE
    -- Stackable want: subtract from buyer's stack-row.
    SELECT * INTO v_buyer_inv FROM public.inventory
     WHERE player_id = p_player_id
       AND skin_id = v_listing.want_skin_id
       AND serial_number IS NULL
     FOR UPDATE;
    IF NOT FOUND OR v_buyer_inv.quantity < v_listing.want_quantity THEN
      RAISE EXCEPTION 'BUYER_MISSING';
    END IF;
    IF v_buyer_inv.quantity = v_listing.want_quantity THEN
      DELETE FROM public.inventory WHERE id = v_buyer_inv.id;
    ELSE
      UPDATE public.inventory
         SET quantity = quantity - v_listing.want_quantity
       WHERE id = v_buyer_inv.id;
    END IF;
    -- Add to seller's stack via inventory_grant (handles upsert).
    FOR v_taken IN 1..v_listing.want_quantity LOOP
      v_new_seller_row := public.inventory_grant(v_listing.seller_player_id, v_listing.want_skin_id, 'trade', NULL);
    END LOOP;
  END IF;

  -- ---- Move seller's offered row to buyer ----
  IF v_offer_meta.is_limited THEN
    -- Move the limited instance to buyer.
    UPDATE public.inventory
       SET player_id = p_player_id,
           reserved_by_listing = NULL,
           acquired_at = now(),
           acquired_method = 'trade'
     WHERE id = v_offer_inv.id;
    v_new_buyer_row := v_offer_inv.id;
  ELSE
    -- Stackable: subtract 1 from seller stack and grant 1 to buyer.
    IF v_offer_inv.quantity = 1 THEN
      DELETE FROM public.inventory WHERE id = v_offer_inv.id;
    ELSE
      UPDATE public.inventory
         SET quantity = quantity - 1,
             reserved_by_listing = NULL
       WHERE id = v_offer_inv.id;
    END IF;
    v_new_buyer_row := public.inventory_grant(p_player_id, v_listing.offer_skin_id, 'trade', NULL);
  END IF;

  -- Mark listing accepted.
  UPDATE public.trade_listings
     SET status = 'accepted',
         accepted_by_player_id = p_player_id,
         accepted_at = now()
   WHERE id = p_listing_id;

  SELECT username INTO v_seller_username FROM public.players WHERE id = v_listing.seller_player_id;
  SELECT username INTO v_buyer_username  FROM public.players WHERE id = p_player_id;

  INSERT INTO public.trade_history
    (listing_id, seller_player_id, seller_username, buyer_player_id, buyer_username,
     seller_gave, seller_got)
  VALUES
    (p_listing_id, v_listing.seller_player_id, v_seller_username, p_player_id, v_buyer_username,
     jsonb_build_object('skin_id', v_listing.offer_skin_id, 'quantity', 1, 'serial_number', v_listing.offer_serial_number),
     jsonb_build_object('skin_id', v_listing.want_skin_id, 'quantity', v_listing.want_quantity));

  RETURN jsonb_build_object('status', 'accepted', 'inventory_id', v_new_buyer_row);
END;
$$;

-- ---------- 8. Auto-cleanup on RLS-permitted SELECT ----------
-- Nothing to add: status='cancelled'/'accepted' rows stay in the table forever
-- so that history/audit is preserved. Clients filter by status='active' for the
-- Browse tab.
