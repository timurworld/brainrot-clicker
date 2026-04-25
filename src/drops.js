// Wave Drops module — subscribes to active drop events and exposes a
// throttled `tryRoll` for the tap handler. The server is authoritative; the
// client just calls drop_roll RPC at most once per second.

import { supabase } from './supabase.js';

// --- READS ------------------------------------------------------------------

// Fetch the single active drop event (V1 assumption: at most one at a time).
// Filters out admin_only events for non-admin players.
export async function fetchActiveDropEvent({ isAdmin = false } = {}) {
  let q = supabase
    .from('drop_events')
    .select('*')
    .eq('status', 'active')
    .order('starts_at', { ascending: false })
    .limit(1);
  if (!isAdmin) q = q.eq('admin_only', false);
  const { data, error } = await q;
  if (error) {
    console.warn('[drops] fetchActiveDropEvent failed', error);
    return null;
  }
  return data?.[0] || null;
}

// Subscribe to all drop_events changes. Refetches the active event on any
// change (insert/update/delete). Caller passes a setter; we never expose the
// raw payload.
export function subscribeDropEvents(onChange) {
  const channel = supabase.channel('drops-' + Math.random())
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'drop_events' },
        () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// --- WRITES (RPCs) ----------------------------------------------------------

// Roll on the current event. Server-side cooldown is 250ms; client adds another
// 1000ms throttle to avoid wasted round trips on rapid taps.
//
// Returns { granted, inventoryId } when the player won, or { granted: null }.
//   error codes: unauthorized, NOT_FOUND
export async function dropRoll({ playerId, pin, eventId }) {
  const { data, error } = await supabase.rpc('drop_roll', {
    p_player_id: playerId,
    p_pin: pin,
    p_event_id: eventId,
  });
  if (error) return { error: error.message };
  return {
    granted: data?.granted ?? null,
    inventoryId: data?.inventory_id ?? null,
    cooldown: !!data?.cooldown,
  };
}

// --- HELPERS ----------------------------------------------------------------

// Returns true if a wave is currently active for the given event.
export function isWaveActive(event) {
  if (!event?.current_wave_skin_id || !event.current_wave_ends_at) return false;
  return new Date(event.current_wave_ends_at).getTime() > Date.now();
}

// Returns "47" (seconds remaining) or "" if no wave.
export function waveSecondsLeft(event) {
  if (!isWaveActive(event)) return 0;
  const ms = new Date(event.current_wave_ends_at).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}

// Total stock remaining across all skins in the event pool.
export function totalRemaining(event) {
  if (!event?.drop_pool) return 0;
  return event.drop_pool.reduce((acc, p) => acc + (p.remaining || 0), 0);
}

// Tiny client-side throttle (one outstanding RPC call per `intervalMs`).
// Returns a function that dispatches at most once per interval; ignores
// invocations during the cooldown window.
export function makeRollThrottle(intervalMs = 1000) {
  let lastCall = 0;
  let inFlight = false;
  return async function throttledRoll(invokeFn) {
    const now = Date.now();
    if (inFlight) return null;
    if (now - lastCall < intervalMs) return null;
    lastCall = now;
    inFlight = true;
    try {
      return await invokeFn();
    } finally {
      inFlight = false;
    }
  };
}
