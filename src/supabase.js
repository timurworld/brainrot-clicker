import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eztmcfghqeheiamhyner.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dG1jZmdocWVoZWlhbWh5bmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU2MzksImV4cCI6MjA5MTYyMTYzOX0.pVfomYODplqr_AI2hNYqyVp0oYx_2EHdutzxAj15XHg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Best-effort IP geolocation. Fire-and-forget — never blocks login. Failures
// (network, rate limit, DNS, ad-blocker) are silent. Updates the players
// row with country/region/city for "where are my players?" analytics.
// Schema columns added in scripts/sql/09_player_geo.sql.
async function captureGeo(playerId) {
  if (!playerId) return;
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return;
    const d = await res.json();
    if (!d || d.error) return;
    await supabase.from('players').update({
      country:      d.country_name || null,
      country_code: d.country_code || null,
      region:       d.region || null,
      city:         d.city || null,
      geo_updated_at: new Date().toISOString(),
    }).eq('id', playerId);
  } catch { /* never block auth on geo */ }
}

// Register a new player
export async function registerPlayer(username, pin) {
  const { data, error } = await supabase
    .from('players')
    .insert({ username: username.toLowerCase().trim(), pin })
    .select()
    .single();
  if (error) return { error: error.message.includes('duplicate') ? 'Username taken!' : error.message };
  // Create leaderboard entry
  await supabase.from('leaderboard').insert({ player_id: data.id, username: data.username });
  // Fire-and-forget geo capture so analytics has city/country from day one.
  captureGeo(data.id);
  return { player: data };
}

// Login
export async function loginPlayer(username, pin) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('username', username.toLowerCase().trim())
    .eq('pin', pin)
    .single();
  if (error || !data) return { error: 'Wrong username or PIN!' };
  // Refresh geo on login so the dataset stays current as players move.
  captureGeo(data.id);
  return { player: data };
}

// Save game to cloud
export async function saveGameCloud(playerId, gameState) {
  // Defensive: refuse to save if the game state's username doesn't match this
  // player's actual username. Prevents cross-account contamination when a
  // session switches user (logout + register) and the in-memory ref hasn't
  // caught up yet — without this guard, the OLD player's points get written
  // to the NEW player's cloud row.
  if (!gameState?.username) return { error: 'no username in state' };
  const { data: pl } = await supabase.from('players')
    .select('username').eq('id', playerId).single();
  if (!pl || pl.username.toLowerCase() !== String(gameState.username).toLowerCase()) {
    return { error: 'username mismatch' };
  }

  // Get current cloud save to compare
  const { data: currentSave } = await supabase
    .from('game_saves')
    .select('save_data')
    .eq('player_id', playerId)
    .single();

  // Only save if new score is higher (or no save exists yet)
  const cloudPoints = currentSave?.save_data?.lifetimePoints || 0;
  const localPoints = gameState.lifetimePoints || 0;

  if (localPoints >= cloudPoints) {
    await supabase
      .from('game_saves')
      .upsert({
        player_id: playerId,
        save_data: gameState,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'player_id' });
  }

  // Leaderboard: only update if score is higher
  const { data: currentBoard } = await supabase
    .from('leaderboard')
    .select('lifetime_points')
    .eq('player_id', playerId)
    .single();

  const boardPoints = currentBoard?.lifetime_points || 0;
  const newPoints = Math.floor(localPoints);

  if (newPoints > boardPoints) {
    await supabase
      .from('leaderboard')
      .upsert({
        player_id: playerId,
        username: gameState.username || 'Player',
        lifetime_points: newPoints,
        prestige_count: gameState.prestigeCount || 0,
        equipped_skin: gameState.equippedSkin || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'player_id' });
  }

  return { error };
}

// Load game from cloud
export async function loadGameCloud(playerId) {
  const { data, error } = await supabase
    .from('game_saves')
    .select('save_data')
    .eq('player_id', playerId)
    .single();
  if (error || !data) return { save: null };
  return { save: data.save_data };
}

// Usernames hidden from the public leaderboard (admin/owner accounts).
// Stored lowercased — comparison ignores case. Keep the actual rows in the DB.
const HIDDEN_FROM_LEADERBOARD = new Set(['tmoney']);

// Hide leftover dev/test accounts that match these patterns.
function isHiddenUsername(name) {
  const lower = (name || '').toLowerCase();
  if (HIDDEN_FROM_LEADERBOARD.has(lower)) return true;
  if (lower.startsWith('testplayer')) return true;
  return false;
}

// Get leaderboard (top 20 visible)
export async function getLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('lifetime_points', { ascending: false })
    .limit(30); // fetch extras to compensate for filtered rows
  if (error) return [];
  return (data || [])
    .filter(r => !isHiddenUsername(r.username))
    .slice(0, 20);
}
