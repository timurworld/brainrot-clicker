// Inventory module — queries the player's owned skin instances and keeps them
// in sync via Supabase realtime. Inventory rows have skin_id matching the `id`
// field on CHARACTERS (NOT the array index).

import { supabase } from './supabase.js';

// Fetch every inventory row for a player. Returns an array of:
//   { id, skin_id, quantity, serial_number, acquired_at, acquired_method,
//     trade_lock_until, reserved_by_listing }
// Sorted newest-first.
export async function fetchInventory(playerId) {
  if (!playerId) return [];
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('player_id', playerId)
    .order('acquired_at', { ascending: false });
  if (error) {
    console.warn('[inventory] fetch failed', error);
    return [];
  }
  return data || [];
}

// Subscribe to realtime changes on this player's inventory rows.
// Calls onChange() with the fresh full inventory whenever a row INSERT/UPDATE/DELETE
// fires. Returns an unsubscribe function.
export function subscribeInventory(playerId, onChange) {
  if (!playerId) return () => {};
  const channel = supabase.channel('inv-' + playerId)
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'inventory', filter: `player_id=eq.${playerId}` },
        async () => {
          const fresh = await fetchInventory(playerId);
          onChange(fresh);
        })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// Group inventory by rarity tier for display. Each entry includes the skin
// metadata (resolved against CHARACTERS by skin_id).
//   characters: the CHARACTERS array from App.jsx
//   inventory: array from fetchInventory
// Returns: [{ tier, items: [{ inv, skin }] }]
const TIER_ORDER = [
  'Mythic', 'Mythic Limited', 'Brainrot God', 'Secret', 'Legendary',
  'OG', 'Rare', 'Common',
];
export function groupByTier(inventory, characters) {
  const byTier = {};
  for (const inv of inventory) {
    const skin = characters.find(c => c.id === inv.skin_id);
    if (!skin) continue;
    const tier = skin.rarity || 'Common';
    if (!byTier[tier]) byTier[tier] = [];
    byTier[tier].push({ inv, skin });
  }
  // Within a tier, limited (serialed) first, then alphabetical.
  for (const tier of Object.keys(byTier)) {
    byTier[tier].sort((a, b) => {
      const aLimited = a.inv.serial_number != null;
      const bLimited = b.inv.serial_number != null;
      if (aLimited !== bLimited) return aLimited ? -1 : 1;
      return a.skin.name.localeCompare(b.skin.name);
    });
  }
  // Order tiers per TIER_ORDER, then anything unknown at the bottom.
  const ordered = [];
  for (const tier of TIER_ORDER) {
    if (byTier[tier]?.length) ordered.push({ tier, items: byTier[tier] });
  }
  for (const tier of Object.keys(byTier)) {
    if (!TIER_ORDER.includes(tier)) ordered.push({ tier, items: byTier[tier] });
  }
  return ordered;
}

// True if this inventory row is currently trade-locked (24h post-fusion).
export function isTradeLocked(invRow) {
  if (!invRow?.trade_lock_until) return false;
  return new Date(invRow.trade_lock_until).getTime() > Date.now();
}

// Human-readable countdown string for a trade-lock expiry (e.g., "23h 12m").
export function formatLockCountdown(lockUntil) {
  if (!lockUntil) return '';
  const ms = new Date(lockUntil).getTime() - Date.now();
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

// Find the CHARACTERS array index for a given skin_id (used to hand off to
// existing equip logic which sets game.equippedSkin to an array index).
export function indexOfSkinId(characters, skinId) {
  return characters.findIndex(c => c.id === skinId);
}

// One-time legacy migration: copy skins from `unlockedSkins[]` (indices into
// CHARACTERS) into the inventory table. Idempotent — skins already in inventory
// are skipped via ON CONFLICT. Safe to call on every login.
export async function migrateLegacyInventory(playerId, characters) {
  if (!playerId) return;
  const charIds = characters.map(c => c.id);
  try {
    await supabase.rpc('seed_inventory_for_player', {
      p_player_id: playerId,
      p_char_ids: charIds,
    });
  } catch (e) {
    console.warn('[inventory] legacy migrate failed', e);
  }
}
