// Trade Board module — fetches active listings, wraps the trade RPCs, and
// keeps the board live via Supabase realtime. All mutations go through SECURITY
// DEFINER RPCs that validate (player_id, pin) — the client never writes to
// trade_listings or inventory directly.

import { supabase } from './supabase.js';

// --- READS ------------------------------------------------------------------

// Fetch every active listing across all players, newest first.
export async function fetchActiveListings({ limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('trade_listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[trade] fetchActiveListings failed', error);
    return [];
  }
  return data || [];
}

// Fetch the player's own listings (any status).
export async function fetchMyListings(playerId) {
  if (!playerId) return [];
  const { data, error } = await supabase
    .from('trade_listings')
    .select('*')
    .eq('seller_player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.warn('[trade] fetchMyListings failed', error);
    return [];
  }
  return data || [];
}

// Fetch the player's trade history (rows where they were buyer or seller).
export async function fetchMyTradeHistory(playerId) {
  if (!playerId) return [];
  const { data, error } = await supabase
    .from('trade_history')
    .select('*')
    .or(`seller_player_id.eq.${playerId},buyer_player_id.eq.${playerId}`)
    .order('completed_at', { ascending: false })
    .limit(50);
  if (error) {
    console.warn('[trade] fetchMyTradeHistory failed', error);
    return [];
  }
  return data || [];
}

// Subscribe to all trade_listings changes — UI re-fetches on any signal.
export function subscribeListings(onChange) {
  const channel = supabase.channel('trade-board-' + Math.random())
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'trade_listings' },
        () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// --- WRITES (RPCs) ----------------------------------------------------------

// List one inventory row. Returns { listingId } or { error }.
//   error codes: NOT_FOUND, ALREADY_LISTED, TRADE_LOCKED, EMPTY_STACK,
//                TOO_MANY_LISTINGS, BAD_QUANTITY, SAME_SKIN, unauthorized
export async function tradeList({ playerId, pin, inventoryId, wantSkinId, wantQty = 1 }) {
  const { data, error } = await supabase.rpc('trade_list', {
    p_player_id: playerId,
    p_pin: pin,
    p_inventory_id: inventoryId,
    p_want_skin_id: wantSkinId,
    p_want_quantity: wantQty,
  });
  if (error) return { error: parseRpcError(error) };
  return { listingId: data };
}

// Cancel one of your own active listings.
export async function tradeCancel({ playerId, pin, listingId }) {
  const { error } = await supabase.rpc('trade_cancel', {
    p_player_id: playerId,
    p_pin: pin,
    p_listing_id: listingId,
  });
  if (error) return { error: parseRpcError(error) };
  return { ok: true };
}

// Accept someone else's active listing. Returns { inventoryId } (the new row
// added to your inventory) or { error }.
//   error codes: NOT_FOUND, ALREADY_GONE, SELF_TRADE, OFFER_GONE, OFFER_EMPTY,
//                BUYER_MISSING, BAD_QUANTITY, unauthorized
export async function tradeAccept({ playerId, pin, listingId }) {
  const { data, error } = await supabase.rpc('trade_accept', {
    p_player_id: playerId,
    p_pin: pin,
    p_listing_id: listingId,
  });
  if (error) return { error: parseRpcError(error) };
  return { inventoryId: data?.inventory_id, raw: data };
}

// --- ERROR PARSING ----------------------------------------------------------

// Extract the error code we raised from Postgres ("RAISE EXCEPTION 'CODE'").
// Supabase returns it in error.message, prefixed with the SQL line.
function parseRpcError(err) {
  const m = err?.message || '';
  // Known codes — surface raw, otherwise return the full message.
  for (const code of ['unauthorized', 'forbidden', 'NOT_FOUND', 'ALREADY_LISTED',
       'TRADE_LOCKED', 'EMPTY_STACK', 'TOO_MANY_LISTINGS', 'BAD_QUANTITY',
       'SAME_SKIN', 'ALREADY_GONE', 'SELF_TRADE', 'OFFER_GONE', 'OFFER_EMPTY',
       'BUYER_MISSING']) {
    if (m.includes(code)) return code;
  }
  return m || 'UNKNOWN';
}

// Convert an error code to a kid-friendly message.
export function tradeErrorMessage(code) {
  switch (code) {
    case 'unauthorized':      return 'Login expired — refresh and try again.';
    case 'NOT_FOUND':         return "That trade isn't here anymore.";
    case 'ALREADY_LISTED':    return "You've already listed that one.";
    case 'TRADE_LOCKED':      return 'This skin is locked for 24 hours after fusion.';
    case 'EMPTY_STACK':       return "You don't have any of that to trade.";
    case 'TOO_MANY_LISTINGS': return 'Cancel an existing listing first (max 5).';
    case 'BAD_QUANTITY':      return 'Pick a quantity of 1 or more.';
    case 'SAME_SKIN':         return "Can't trade a skin for itself.";
    case 'ALREADY_GONE':      return 'Someone got there first!';
    case 'SELF_TRADE':        return "That's your own listing.";
    case 'OFFER_GONE':        return 'The seller no longer has that item.';
    case 'OFFER_EMPTY':       return 'The seller no longer has that item.';
    case 'BUYER_MISSING':     return "You don't have what they want.";
    default:                  return 'Trade failed. Try again.';
  }
}
