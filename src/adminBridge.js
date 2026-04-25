// Real-time bridge to admin hub — subscribes to admin events & effects
import { supabase } from './supabase.js';

const GAME_ID = 'brainrot';

export function subscribeToAdmin(callbacks) {
  const {
    onEventStateChange, // (active: bool, eventName: string)
    onEffectChange,     // (effectId: string, active: bool)
    onGlobalMessage,    // (message: string)
    onSkinGift,         // (skinName: string)  — only fires for current player
    onCoinGift,         // (amount: number)    — only fires for current player
    onVoteStart,        // (vote: { id, question, ends_at })
    onScheduled,        // (event: { event_name, scheduled_for })
    currentUsername,    // for filtering gifts
  } = callbacks;

  // Initial fetch of current state
  (async () => {
    const { data: ev } = await supabase.from('admin_events').select('*').eq('game_id', GAME_ID).maybeSingle();
    if (ev && onEventStateChange) onEventStateChange(ev.active, ev.event_name);

    const { data: fx } = await supabase.from('active_effects').select('*').eq('game_id', GAME_ID);
    if (fx && onEffectChange) fx.forEach(r => onEffectChange(r.effect_id, r.active));

    const { data: sc } = await supabase.from('scheduled_events')
      .select('*').eq('game_id', GAME_ID)
      .gt('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true }).limit(1).maybeSingle();
    if (sc && onScheduled) onScheduled(sc);

    const { data: vote } = await supabase.from('active_votes')
      .select('*').eq('game_id', GAME_ID).eq('active', true)
      .order('started_at', { ascending: false }).limit(1).maybeSingle();
    if (vote && onVoteStart) onVoteStart(vote);
  })();

  const channel = supabase.channel('admin-bridge-' + Math.random())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_events' }, (payload) => {
      const r = payload.new;
      if (r && onEventStateChange) onEventStateChange(r.active, r.event_name);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'active_effects' }, (payload) => {
      const r = payload.new;
      if (r?.effect_id && onEffectChange) onEffectChange(r.effect_id, r.active);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_messages' }, (payload) => {
      const r = payload.new;
      if (r?.message && onGlobalMessage) onGlobalMessage(r.message);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'skin_gifts' }, (payload) => {
      const r = payload.new;
      if (r?.player_name && onSkinGift &&
          r.player_name.toLowerCase() === (currentUsername || '').toLowerCase()) {
        onSkinGift(r.skin_name);
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coin_gifts' }, (payload) => {
      const r = payload.new;
      if (r?.player_name && onCoinGift &&
          r.player_name.toLowerCase() === (currentUsername || '').toLowerCase()) {
        onCoinGift(r.amount);
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'active_votes' }, (payload) => {
      const r = payload.new;
      if (r?.active && onVoteStart) onVoteStart(r);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scheduled_events' }, (payload) => {
      const r = payload.new;
      if (r && onScheduled) onScheduled(r);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export async function submitVote(voteId, choice) {
  const col = choice === 'yes' ? 'yes_count' : 'no_count';
  const { data: cur } = await supabase.from('active_votes').select(col).eq('id', voteId).single();
  if (!cur) return;
  await supabase.from('active_votes').update({ [col]: (cur[col] || 0) + 1 }).eq('id', voteId);
}

// Announce this player's presence so the admin hub + other players can see
// who's live. Optional onOnlineChange callback receives a lowercased Set of
// online usernames whenever the presence state syncs. Returns an unsubscribe.
export function announcePresence(username, onOnlineChange) {
  if (!username) return () => {};
  const key = username.toLowerCase();
  const channel = supabase.channel('brainrot:presence', {
    config: { presence: { key } },
  });
  channel.on('presence', { event: 'sync' }, () => {
    if (!onOnlineChange) return;
    const state = channel.presenceState();
    onOnlineChange(new Set(Object.keys(state)));
  });
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ username: key, online_at: new Date().toISOString() });
    }
  });
  return () => { supabase.removeChannel(channel); };
}
