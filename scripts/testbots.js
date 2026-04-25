// Spin up fake "live" players for admin demos.
// Bots come online ONLY while "Admin Abuse" event is active (admin_events.active).
// While live, each bot:
//   - appears in presence
//   - ticks up lifetime_points modestly
//   - auto-votes yes on any new poll
// When the event goes offline, all bots disappear and stop earning.
// Run with: node scripts/testbots.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eztmcfghqeheiamhyner.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dG1jZmdocWVoZWlhbWh5bmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU2MzksImV4cCI6MjA5MTYyMTYzOX0.pVfomYODplqr_AI2hNYqyVp0oYx_2EHdutzxAj15XHg';
const GAME_ID = 'brainrot';

// 30-bot roster. Registered players with leaderboard rows —
// distinctly bot-flavored names that do not imitate real players.
const ALL_BOTS = [
  'FanumTax', 'HawkTuahKing', 'BombardiroBoss', 'SkibidiMax69', 'RizzlerLord',
  'OhioFanum', 'SigmaTuah', 'RizzBomber', 'SkibidiChad', 'NoobSlayer420',
  'OhioLvl99', 'BrainRotPilot', 'TuahMonster', 'RatioKing', 'CEOofRizz',
  'ToiletSkibidi', 'MaxFanumTax', 'GyattLord420', 'BrainBlast99', 'SigmaRizzler',
  'BrainRotKing77', 'SkibidiOhio99', 'HawkTuahMaster', 'RizzGodKing', 'OhioMaxLvl',
  'SigmaBossX', 'TuahLordEpic', 'BrainPilot77', 'FanumProBoss', 'GyattChampion',
];

// Per-bot jitter inside a wave — so arrivals trickle in over 30s–5min instead
// of all appearing together (harder for Timur to spot the pattern).
// BOT_FAST=1 collapses jitter to ~5s so the bots come up almost immediately
// (useful for previewing in the admin Hub before the actual event).
const ARRIVAL_JITTER_MS = process.env.BOT_FAST === '1' ? 5_000 : 300_000;
// Cap how many bots can come up. BOT_LIMIT=3 → only first 3 will spawn.
// 0 (default) = no cap, full roster fires per the WAVES schedule.
const BOT_LIMIT = parseInt(process.env.BOT_LIMIT || '0', 10);

// Deterministic shuffle seeded by day-of-year — the roster order rotates daily
// so Sat shows a different cast than Sun without us doing anything manual.
function daySeed() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86_400_000);
}
function seededShuffle(arr, seed) {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const todaysRoster = seededShuffle(ALL_BOTS, daySeed());

// 30-bot rollout — fills the room in ~10 min total.
//   Wave 1: 10 bots at minute 0  (jitter 0–5 min → arrive 0–5min)
//   Wave 2: 10 bots at minute 3  (arrive 3–8min)
//   Wave 3: 10 bots at minute 6  (arrive 6–11min)
// Net: room climbs 0 → ~10 → ~20 → 30 across the first 10 minutes.
const WAVES = [
  { delayMs: 0 * 60 * 1000, names: todaysRoster.slice(0, 10) },
  { delayMs: 3 * 60 * 1000, names: todaysRoster.slice(10, 20) },
  { delayMs: 6 * 60 * 1000, names: todaysRoster.slice(20, 30) },
];
const BOTS = ALL_BOTS;
const YES_BIAS = 0.8; // mostly yes — still positive but with some noes for realism
const TICK_MS = 6000;          // how often each bot earns points
const TICK_MIN = 80;           // min points per tick
const TICK_MAX = 450;          // max points per tick
const EMOTES = ['🔥', '❤️', '😂', '💀', '🎉', '🧠'];
// Reactive emotes — triggered by admin events, not on a timer.
const EMOTE_REACT_CHANCE = 0.55;   // probability a given bot reacts to an event
const EMOTE_MIN_DELAY = 400;       // min ms before bot reacts
const EMOTE_MAX_DELAY = 3500;      // max ms — spreads reactions naturally

class Bot {
  constructor(name) {
    this.name = name;
    this.key = name.toLowerCase();
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.presence = null;
    this.presenceKeepalive = null;
    this.tickTimer = null;
    this.emoteChannel = null;
    this.isLive = false;
    this.voteChannel = null;
  }

  // Fire a single emote reaction after a small randomized delay.
  // Pool filters the emote set by situation (fire/party/think/etc).
  reactWith(pool) {
    if (!this.isLive) return;
    if (Math.random() > EMOTE_REACT_CHANCE) return; // this bot sits out
    const delay = EMOTE_MIN_DELAY + Math.random() * (EMOTE_MAX_DELAY - EMOTE_MIN_DELAY);
    setTimeout(async () => {
      if (!this.isLive) return;
      const emote = pool[Math.floor(Math.random() * pool.length)];
      try {
        await this.emoteChannel?.send({
          type: 'broadcast', event: 'emote',
          payload: { username: this.name, emote },
        });
      } catch {}
    }, delay);
  }

  async goLive() {
    if (this.isLive) return;
    this.isLive = true;

    this.presence = this.client.channel('brainrot:presence', { config: { presence: { key: this.key } } });
    this.presence.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.presence.track({ username: this.key, online_at: new Date().toISOString() });
      }
    });
    this.presenceKeepalive = setInterval(() => {
      this.presence?.track({ username: this.key, online_at: new Date().toISOString() }).catch(() => {});
    }, 30_000);

    this.tickTimer = setInterval(async () => {
      const { data: row } = await this.client.from('leaderboard')
        .select('player_id, lifetime_points')
        .ilike('username', this.name).maybeSingle();
      if (!row) return;
      const gain = TICK_MIN + Math.floor(Math.random() * (TICK_MAX - TICK_MIN));
      await this.client.from('leaderboard')
        .update({ lifetime_points: (row.lifetime_points || 0) + gain })
        .eq('player_id', row.player_id);
    }, TICK_MS + Math.random() * 2000);

    // Emote broadcast channel (bot sends via .reactWith — no timer)
    this.emoteChannel = this.client.channel('brainrot:emotes');
    this.emoteChannel.subscribe();

    console.log(`[${this.name}] online`);
  }

  async goOffline() {
    if (!this.isLive) return;
    this.isLive = false;
    clearInterval(this.presenceKeepalive); this.presenceKeepalive = null;
    clearInterval(this.tickTimer); this.tickTimer = null;
    if (this.emoteChannel) {
      await this.client.removeChannel(this.emoteChannel).catch(() => {});
      this.emoteChannel = null;
    }
    if (this.presence) {
      await this.presence.untrack().catch(() => {});
      await this.client.removeChannel(this.presence).catch(() => {});
      this.presence = null;
    }
    console.log(`[${this.name}] offline`);
  }

  // Vote listener runs always — only acts if event is live
  subscribeVotes(getIsLive) {
    this.voteChannel = this.client.channel('bot-votes-' + this.key)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'active_votes' }, async (payload) => {
        if (!getIsLive()) return;
        const row = payload.new;
        if (!row?.active) return;
        const choice = Math.random() < YES_BIAS ? 'yes_count' : 'no_count';
        const delay = 1000 + Math.random() * 4000;
        setTimeout(async () => {
          const { data: cur } = await this.client.from('active_votes').select(choice).eq('id', row.id).single();
          if (!cur) return;
          await this.client.from('active_votes').update({ [choice]: (cur[choice] || 0) + 1 }).eq('id', row.id);
          console.log(`[${this.name}] voted ${choice === 'yes_count' ? 'YES' : 'NO'} on "${row.question}"`);
        }, delay);
      });
    this.voteChannel.subscribe();
  }
}

const bots = BOTS.map(n => new Bot(n));
bots.forEach(b => b.subscribeVotes(() => adminIsLive));

let adminIsLive = false;
let waveTimers = [];

function cancelPendingWaves() {
  for (const t of waveTimers) clearTimeout(t);
  waveTimers = [];
}

async function applyAdminState(active) {
  if (active === adminIsLive) return;
  adminIsLive = active;
  console.log(`\n=== admin abuse ${active ? 'LIVE — staggered bot arrivals starting' : 'OFFLINE — bots going dark'} ===\n`);
  cancelPendingWaves();
  let spawnedSoFar = 0;
  if (active) {
    for (const wave of WAVES) {
      const fire = async () => {
        if (!adminIsLive) return; // event may have ended before timeout fires
        let waveBots = bots.filter(b => wave.names.includes(b.name));
        // Apply global BOT_LIMIT cap if set.
        if (BOT_LIMIT > 0) {
          const remaining = Math.max(0, BOT_LIMIT - spawnedSoFar);
          if (remaining === 0) return;
          waveBots = waveBots.slice(0, remaining);
        }
        spawnedSoFar += waveBots.length;
        console.log(`-- wave +${Math.round(wave.delayMs / 60000)}min (staggered): ${waveBots.map(b => b.name).join(', ')}`);
        // Trickle each bot online with an individual random delay so the
        // arrivals don't all hit the same second.
        for (const b of waveBots) {
          const jitter = Math.random() * ARRIVAL_JITTER_MS;
          const t = setTimeout(() => { if (adminIsLive) b.goLive(); }, jitter);
          waveTimers.push(t);
        }
      };
      if (wave.delayMs === 0) fire();
      else waveTimers.push(setTimeout(fire, wave.delayMs));
    }
  } else {
    await Promise.all(bots.map(b => b.goOffline()));
  }
}

// Shared watcher for admin_events
const watcher = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// FORCE_LIVE=1 brings bots up immediately regardless of admin event state
// (still honors the OFFLINE transition so stopping the event still kicks them).
const FORCE_LIVE = process.env.FORCE_LIVE === '1';

// Initial state
(async () => {
  if (FORCE_LIVE) {
    console.log('FORCE_LIVE set — bringing bots up regardless of admin event state');
    await applyAdminState(true);
    return;
  }
  const { data } = await watcher.from('admin_events').select('active').eq('game_id', GAME_ID).maybeSingle();
  await applyAdminState(!!data?.active);
})();

// Live changes
watcher.channel('bot-admin-watch')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_events' }, (payload) => {
    const row = payload.new;
    if (row && typeof row.active === 'boolean') applyAdminState(row.active);
  })
  .subscribe();

// Reactive emote triggers — bots emote in response to what admin is doing.
// Each bot independently rolls a chance + random delay so reactions look organic.
const fireEach = (pool) => {
  if (!adminIsLive) return;
  for (const bot of bots) bot.reactWith(pool);
};

watcher.channel('bot-reactions')
  // Global broadcast message → 😂 🧠 🔥 (laugh / think / hype)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_messages' }, () => {
    fireEach(['😂', '🧠', '🔥', '❤️']);
  })
  // New poll → 🧠 💀 🤔-ish (reading/thinking)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'active_votes' }, () => {
    fireEach(['🧠', '🔥', '💀']);
  })
  // DJ / admin effect toggling on → 🎉 🔥 (hype reaction)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'active_effects' }, (payload) => {
    const row = payload.new;
    if (row?.active) fireEach(['🎉', '🔥', '❤️', '💀']);
  })
  // Coin gifts landing → ❤️ 🎉 (thank / celebrate)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coin_gifts' }, () => {
    fireEach(['❤️', '🎉', '🔥']);
  })
  // Skin gifts landing → 🎉 ❤️
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'skin_gifts' }, () => {
    fireEach(['🎉', '❤️', '🔥']);
  })
  .subscribe();

console.log(`🤖 ${BOTS.length} test bots standing by. Waves: ${WAVES.map(w => `${w.names.length}@+${Math.round(w.delayMs/60000)}min`).join(', ')}`);

process.on('SIGINT', async () => {
  console.log('\nShutting down bots…');
  cancelPendingWaves();
  await Promise.all(bots.map(b => b.goOffline()));
  process.exit(0);
});
