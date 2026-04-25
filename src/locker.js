// Locker module — fetches the active locker (if any), wraps the fuse RPC,
// and subscribes to the fusion ticker for live "X just fused Hockey Bros #12"
// banners.

import { supabase } from './supabase.js';

// --- READS ------------------------------------------------------------------

// Returns the most recent active locker, or null. Filters out admin_only ones
// for non-admins (V1: client-side filter, since RLS allows SELECT on all).
export async function fetchActiveLocker({ isAdmin = false } = {}) {
  let q = supabase
    .from('lockers')
    .select('*')
    .in('status', ['active', 'sold_out'])      // sold_out lingers ~1h per spec
    .order('starts_at', { ascending: false })
    .limit(1);
  if (!isAdmin) q = q.eq('admin_only', false);
  const { data, error } = await q;
  if (error) {
    console.warn('[locker] fetchActiveLocker failed', error);
    return null;
  }
  return data?.[0] || null;
}

// Subscribe to all locker changes; caller refetches on any signal.
export function subscribeLockers(onChange) {
  const channel = supabase.channel('lockers-' + Math.random())
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'lockers' },
        () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// Subscribe to fusion ticker INSERTs (someone fused). Calls onTick(row).
export function subscribeFusionTicker(onTick) {
  const channel = supabase.channel('ticker-' + Math.random())
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fusion_ticker' },
        (payload) => onTick(payload.new))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// --- WRITES (RPCs) ----------------------------------------------------------

// Attempt fusion. Returns { granted, serial, inventoryId } on success, or
// { error: code }.
//   error codes: unauthorized, NOT_FOUND, NOT_ACTIVE, EXPIRED, SOLD_OUT,
//                MISSING_INGREDIENTS, RACE_LOST, ALREADY_FUSED
export async function lockerFuse({ playerId, pin, lockerId }) {
  const { data, error } = await supabase.rpc('locker_fuse', {
    p_player_id: playerId,
    p_pin: pin,
    p_locker_id: lockerId,
  });
  if (error) return { error: parseError(error) };
  return {
    granted: data?.granted_skin_id ?? null,
    serial: data?.serial_number ?? null,
    inventoryId: data?.inventory_id ?? null,
  };
}

function parseError(err) {
  const m = err?.message || '';
  for (const code of ['unauthorized', 'NOT_FOUND', 'NOT_ACTIVE', 'EXPIRED',
       'SOLD_OUT', 'MISSING_INGREDIENTS', 'RACE_LOST', 'OWN_CAP_REACHED',
       'ALREADY_FUSED']) {
    if (m.includes(code)) return code;
  }
  return m || 'UNKNOWN';
}

export function fuseErrorMessage(code) {
  switch (code) {
    case 'unauthorized':         return 'Login expired — refresh and try again.';
    case 'NOT_FOUND':            return 'Locker is gone.';
    case 'NOT_ACTIVE':           return 'Locker is no longer active.';
    case 'EXPIRED':              return 'Locker timer ended.';
    case 'SOLD_OUT':             return '🔥 Sold out! Keep your ingredients as collectors.';
    case 'MISSING_INGREDIENTS':  return "You don't have the ingredients yet.";
    case 'RACE_LOST':            return 'Someone got the last one!';
    case 'OWN_CAP_REACHED':      return 'You already own one — limit is 1 per player.';
    case 'ALREADY_FUSED':        return '👑 You already fused this one — limit is 1 per player. Trade for more!';
    default:                     return 'Fusion failed. Try again.';
  }
}

// Returns true if this player already owns the locker's output skin (limited).
// Used to grey out FUSE NOW pre-emptively, before they hit the server cap.
export function alreadyOwnsLimitedOutput(locker, inventory) {
  if (!locker || !inventory) return false;
  return inventory.some(inv =>
    inv.skin_id === locker.output_skin_id && inv.serial_number != null
  );
}

// --- HELPERS ----------------------------------------------------------------

// Given the locker.recipe array and the player's inventory, returns
//   { hasAll: bool, missing: [{skin_id, need, have}] }
export function checkRecipe(recipe, inventory) {
  const missing = [];
  for (const item of recipe || []) {
    const have = (inventory || []).reduce(
      (acc, inv) => inv.skin_id === item.skin_id && inv.serial_number == null
        ? acc + inv.quantity : acc,
      0
    );
    if (have < item.qty) missing.push({ skin_id: item.skin_id, need: item.qty, have });
  }
  return { hasAll: missing.length === 0, missing };
}

// "1h 23m" / "47s" countdown for an ISO expiry.
export function lockerCountdown(expiresAt) {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}
