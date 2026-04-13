import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eztmcfghqeheiamhyner.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dG1jZmdocWVoZWlhbWh5bmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU2MzksImV4cCI6MjA5MTYyMTYzOX0.pVfomYODplqr_AI2hNYqyVp0oYx_2EHdutzxAj15XHg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  return { player: data };
}

// Save game to cloud
export async function saveGameCloud(playerId, gameState) {
  const { error } = await supabase
    .from('game_saves')
    .upsert({
      player_id: playerId,
      save_data: gameState,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'player_id' });

  // Update leaderboard
  await supabase
    .from('leaderboard')
    .upsert({
      player_id: playerId,
      username: gameState.username || 'Player',
      lifetime_points: Math.floor(gameState.lifetimePoints || 0),
      prestige_count: gameState.prestigeCount || 0,
      equipped_skin: gameState.equippedSkin || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'player_id' });

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

// Get leaderboard (top 20)
export async function getLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('lifetime_points', { ascending: false })
    .limit(20);
  if (error) return [];
  return data || [];
}
