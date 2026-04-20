import React, { useState, useEffect, useRef, useCallback } from 'react';
import { registerPlayer, loginPlayer, saveGameCloud, loadGameCloud, getLeaderboard, supabase } from './supabase.js';
import { subscribeToAdmin, submitVote, announcePresence } from './adminBridge.js';
import {
  registerServiceWorker, notify,
  shouldOfferOptIn, requestPermission, rememberOptInDismissed,
  notificationPermission,
} from './notifications.js';

// ============================================================
// CONSTANTS & CONFIG
// ============================================================
const CHARACTERS = [
  { id: 1, name: 'Noobini Lovini', file: '01_noobini_lovini.png', bgNum: '01', rarity: 'Common', unlock: 0, emoji: '💖', color: '#ff69b4', mult: 1,
    bg: 'linear-gradient(180deg, #6a11cb 0%, #bc4dff 50%, #6a11cb 100%)' },
  { id: 2, name: 'Romantini Grandini', file: '02_la_romantic_grande.png', bgNum: '02', rarity: 'Limited', unlock: 500, emoji: '🌹', color: '#e74c3c', mult: 1.5,
    bg: 'linear-gradient(180deg, #c0392b 0%, #ff6b6b 40%, #e74c3c 70%, #922b21 100%)' },
  { id: 3, name: 'Lovini Lovini Lovini', file: '03_lovini_lovini_lovini.png', bgNum: '03', rarity: 'Brainrot God', unlock: 2000, emoji: '💕', color: '#ff1493', mult: 2,
    bg: 'linear-gradient(180deg, #ff1493 0%, #ff69b4 35%, #ff1493 65%, #c71585 100%)' },
  { id: 4, name: 'Teddini & Robotini', file: '04_teddy_and_rosie.png', bgNum: '04', rarity: 'Legendary', unlock: 10000, emoji: '🧸', color: '#c8894f', mult: 2.5,
    bg: 'linear-gradient(180deg, #8B5E3C 0%, #D4A574 35%, #C08050 65%, #6B4226 100%)' },
  { id: 5, name: 'Noobini Partini', file: '05_noobini_partini.png', bgNum: '05', rarity: 'Brainrot God', unlock: 50000, emoji: '🎉', color: '#ff6347', mult: 3,
    bg: 'linear-gradient(180deg, #ff4500 0%, #ff8c42 30%, #ff6347 60%, #e63900 100%)' },
  { id: 6, name: 'Cakini Presintini', file: '06_cakini_and_presintini.png', bgNum: '06', rarity: 'Secret', unlock: 100000, emoji: '🎂', color: '#ff8c00', mult: 3.5,
    bg: 'linear-gradient(180deg, #ff8c00 0%, #ffb347 35%, #ffa500 65%, #cc7000 100%)' },
  { id: 7, name: 'Lovini Rosetti', file: '07_lovin_rose.png', bgNum: '07', rarity: 'Rare', unlock: 250000, emoji: '🌷', color: '#4db8db', mult: 4,
    bg: 'linear-gradient(180deg, #0d4f6b 0%, #1a8aad 35%, #127a9a 65%, #0a3d55 100%)' },
  { id: 8, name: 'Heartini Smilekurro', file: '08_heartini_smilekur.png', bgNum: '08', rarity: 'Common', unlock: 500000, emoji: '😊', color: '#40c4c4', mult: 4.5,
    bg: 'linear-gradient(180deg, #0a5a5a 0%, #1aadad 35%, #12888a 65%, #084848 100%)' },
  { id: 9, name: 'Dragini Partini', file: '09_dragon_partyini.png', bgNum: '06', rarity: 'OG', unlock: 1000000, emoji: '🐉', color: '#ffd700', mult: 5,
    bg: 'linear-gradient(180deg, #ff8c00 0%, #ffb347 35%, #ffa500 65%, #cc7000 100%)' },
  { id: 10, name: 'Cupidini Sahuroni', file: '10_cupid_cupid_sahur.png', bgNum: '10', rarity: 'Legendary', unlock: 2500000, emoji: '💘', color: '#ff1493', mult: 5.5,
    bg: 'linear-gradient(180deg, #8e24aa 0%, #e040fb 30%, #ab47bc 60%, #6a1b9a 100%)' },
  { id: 11, name: 'Rositti Tueletti', file: '11_rositti_tueletti.png', bgNum: '11', rarity: 'Rare', unlock: 5000000, emoji: '🌺', color: '#ba55d3', mult: 6,
    bg: 'linear-gradient(180deg, #4a148c 0%, #9c27b0 30%, #7b1fa2 60%, #38006b 100%)' },
  { id: 12, name: 'Birthdayini Cardini', file: '12_birthdayini_cardini.png', bgNum: '12', rarity: 'Brainrot God', unlock: 10000000, emoji: '🎈', color: '#ffd700', mult: 6.5,
    bg: 'linear-gradient(180deg, #f9a825 0%, #ffd54f 30%, #ffca28 60%, #f57f17 100%)' },
  // Characters 13, 14, 16, 17 removed — will be re-added with clean art
  { id: 15, name: 'Noobini Partyini', file: '15_noobini_partyini.png', bgNum: '15', rarity: 'Brainrot God', unlock: 25000000, emoji: '🎊', color: '#2ecc71', mult: 7,
    bg: 'linear-gradient(180deg, #0a5c2a 0%, #1fb85a 30%, #16a04c 60%, #084a22 100%)' },
  { id: 18, name: 'Noo Mio Heartini', file: '18_noo_my_heart.png', bgNum: '18', rarity: 'Rare', unlock: 50000000, emoji: '💔', color: '#8b0000', mult: 8,
    bg: 'linear-gradient(180deg, #1a237e 0%, #5c6bc0 30%, #3f51b5 60%, #0d1453 100%)' },
  { id: 19, name: 'Cupidini Hotspottini', file: '19_cupid_hotspot.png', bgNum: '19', rarity: 'Legendary', unlock: 100000000, emoji: '🔥', color: '#ff4500', mult: 9,
    bg: 'linear-gradient(180deg, #ff6d00 0%, #ffab00 25%, #ff8f00 50%, #ff6d00 75%, #e65100 100%)' }
];

const AUTO_CLICKERS = [
  { id: 'ac1', name: 'Mini Clicker', baseCost: 50, cps: 1 },
  { id: 'ac2', name: 'Turbo Tap', baseCost: 200, cps: 5 },
  { id: 'ac3', name: 'Mega Brain', baseCost: 1000, cps: 25 },
  { id: 'ac4', name: 'Sigma Mode', baseCost: 5000, cps: 100 },
  { id: 'ac5', name: 'Tmoney Special', baseCost: 25000, cps: 500 },
  { id: 'ac6', name: 'Brainrot Bot', baseCost: 100000, cps: 2000 },
  { id: 'ac7', name: 'Sigma Grindset', baseCost: 500000, cps: 10000 },
  { id: 'ac8', name: 'Rizz Machine', baseCost: 2500000, cps: 50000 },
  { id: 'ac9', name: 'Ohio Final Boss', baseCost: 10000000, cps: 250000 },
  { id: 'ac10', name: 'Skibidi God', baseCost: 50000000, cps: 1000000 },
];

const TAP_UPGRADES = [
  { id: 'tp1', name: 'Stronger Finger', baseCost: 100, power: 1 },
  { id: 'tp2', name: 'Double Tap', baseCost: 500, power: 2 },
  { id: 'tp3', name: 'Power Poke', baseCost: 2500, power: 5 },
  { id: 'tp4', name: 'Thunder Thumb', baseCost: 15000, power: 15 },
  { id: 'tp5', name: 'Sigma Slap', baseCost: 100000, power: 50 },
];

const EFFICIENCY_UPGRADES = [
  { id: 'eff1', name: 'Better Mini Clickers', cost: 500, target: 'ac1' },
  { id: 'eff2', name: 'Turbo Turbo', cost: 2000, target: 'ac2' },
  { id: 'eff3', name: 'Mega Mega Brain', cost: 10000, target: 'ac3' },
  { id: 'eff4', name: 'Ultra Sigma', cost: 50000, target: 'ac4' },
  { id: 'eff5', name: 'Tmoney Deluxe', cost: 250000, target: 'ac5' },
];

const CHEAT_CODES = {
  'tmoney': { type: 'points', value: 1000, msg: '+1,000 Points!' },
  'brainrot': { type: 'points', value: 5000, msg: '+5,000 Points!' },
  'hockey': { type: 'skin', value: 2, msg: 'Skin Unlocked!' },
  'sigma': { type: 'cps', value: 1, msg: '+1 Click/sec!' },
  'lego': { type: 'points', value: 10000, msg: '+10,000 Points!' },
  'tmoneyunlock': { type: 'unlockall', value: 0, msg: 'ALL CHARACTERS UNLOCKED!' },
};

const ACHIEVEMENTS = [
  { id: 'a1', name: 'First Tap', desc: '1 tap', icon: '👆', check: s => s.totalClicks >= 1 },
  { id: 'a2', name: 'Century', desc: '100 taps', icon: '💯', check: s => s.totalClicks >= 100 },
  { id: 'a3', name: 'Thousand', desc: '1,000 taps', icon: '🔥', check: s => s.totalClicks >= 1000 },
  { id: 'a4', name: 'Legend', desc: '10,000 taps', icon: '⭐', check: s => s.totalClicks >= 10000 },
  { id: 'a5', name: 'Baby Steps', desc: '100 pts', icon: '👶', check: s => s.lifetimePoints >= 100 },
  { id: 'a6', name: 'Getting Rich', desc: '10K pts', icon: '💰', check: s => s.lifetimePoints >= 10000 },
  { id: 'a7', name: 'Millionaire', desc: '1M pts', icon: '🤑', check: s => s.lifetimePoints >= 1000000 },
  { id: 'a8', name: 'Billionaire', desc: '1B pts', icon: '💎', check: s => s.lifetimePoints >= 1000000000 },
  { id: 'a9', name: 'First Purchase', desc: '1 upgrade', icon: '🛒', check: s => s.totalUpgrades >= 1 },
  { id: 'a10', name: 'Shopaholic', desc: '10 upgrades', icon: '🛍️', check: s => s.totalUpgrades >= 10 },
  { id: 'a11', name: 'Addict', desc: '50 upgrades', icon: '🤯', check: s => s.totalUpgrades >= 50 },
  { id: 'a12', name: 'Skin Collector', desc: '4 skins', icon: '🕴️', check: s => s.unlockedSkins.length >= 4 },
  { id: 'a13', name: 'Fashion Icon', desc: 'All skins', icon: '👑', check: s => s.unlockedSkins.length >= 19 },
  { id: 'a14', name: 'Code Breaker', desc: '1 code', icon: '🔓', check: s => s.usedCodes.length >= 1 },
  { id: 'a15', name: 'Hacker Man', desc: 'All codes', icon: '💻', check: s => s.usedCodes.length >= 5 },
  { id: 'a16', name: 'Speed Demon', desc: '100/sec', icon: '⚡', check: s => s.cps >= 100 },
  { id: 'a17', name: 'Idle Master', desc: '1000/sec', icon: '🧘', check: s => s.cps >= 1000 },
  { id: 'a18', name: 'First Rebirth', desc: 'Ascend 1x', icon: '🔄', check: s => s.prestigeCount >= 1 },
  { id: 'a19', name: 'Prestige Pro', desc: 'Ascend 5x', icon: '🧬', check: s => s.prestigeCount >= 5 },
  { id: 'a20', name: 'Weather Watcher', desc: 'Galaxy weather', icon: '🌌', check: s => s.lifetimePoints >= 2000000 },
];

const STORY_MILESTONES = [
  { threshold: 1000, text: 'The brainrot awakens...', emoji: '🧠' },
  { threshold: 10000, text: 'The Council of Brainrots recognizes you.', emoji: '👥' },
  { threshold: 100000, text: 'Promoted to Brainrot Commander.', emoji: '⚔️' },
  { threshold: 1000000, text: 'The Sigma Council grants honorary membership.', emoji: '🏛️' },
  { threshold: 10000000, text: 'Reality bends to your tapping power.', emoji: '🌀' },
  { threshold: 100000000, text: 'You have achieved MAXIMUM BRAINROT.', emoji: '💀' },
];

const EMOTES = ['🔥', '❤️', '😂', '💀', '🎉', '🧠'];

const NEWS_LOW = [
  "Local kid discovers tapping. Scientists baffled.",
  "Breaking: Suspicious fingerprints found on screen.",
  "Mom asks: Are you winning? Answer: always.",
  "Study shows tapping increases brainrot by 300%.",
  "New sport: competitive screen tapping goes viral.",
  "Italy declares brainrot a national treasure.",
  "Kid skips homework to tap. Gets A+ anyway.",
  "Noobini spotted at the grocery store buying pasta.",
  "Tapping declared official exercise by gym teachers.",
  "Phone screen files restraining order against thumb.",
  "Breaking: Your finger is now a registered weapon.",
  "Brainrot scientists discover new element: Tappium.",
  "Local dog learns to tap. Earns more than owner.",
  "Teacher catches student tapping under desk. Joins in.",
  "Pizza delivery guy refuses to leave until he finishes tapping.",
];
const NEWS_MID = [
  "Government concerned about rising brainrot levels.",
  "Doctors warn: tapping causes sigma syndrome.",
  "Schools ban Brainrot Clicker. Downloads triple overnight.",
  "NASA detects tapping vibrations from orbit.",
  "Economy crashes. Brainrot points now worth more than bitcoin.",
  "Elon Musk tweets: 'Brainrot Clicker is the future.'",
  "World record: 847 taps in 10 seconds. Thumb hospitalized.",
  "Scientists confirm: brainrot is contagious through WiFi.",
  "United Nations calls emergency meeting about brainrot crisis.",
  "New study: 9 out of 10 dentists recommend tapping.",
  "Breaking: Brainrot Clicker causes 40% increase in thumb size.",
  "Robots refuse to work. Too busy playing Brainrot Clicker.",
  "Stock market now measured in brainrot points per second.",
  "Moon landing faked to cover up secret tapping base.",
  "Archaeologists find ancient cave paintings of brainrot characters.",
];
const NEWS_HIGH = [
  "Reality cracks from too many taps. Everyone panics.",
  "We live in a tapper simulation. It was obvious.",
  "The brainrot achieved consciousness. It wants more taps.",
  "Alternate dimensions opened by tapping energy.",
  "The universe is a brainrot clicker game. Always has been.",
  "Time itself slows down between taps.",
  "Scientists discover tapping creates mini black holes.",
  "The sun is actually a giant golden brain. Nobody noticed.",
  "Gravity reversed. Only tappers stayed grounded.",
  "All world leaders replaced by brainrot characters.",
  "The meaning of life: 42 taps per second.",
  "Aliens land on Earth. First words: 'Nice CPS bro.'",
  "Matrix revealed. It runs on brainrot points.",
  "Final boss of reality is a giant Noobini. Tap to defeat.",
  "Congratulations. You ARE the brainrot now.",
];

const DAILY_REWARDS = [500, 1000, 2500, 5000, 10000, 25000, 50000];

// ============================================================
// SOUND ENGINE (Web Audio API)
// ============================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicVolume = 0.5;
    this.sfxVolume = 1.0;
    this.musicNodes = [];
    this.loops = {}; // effectId -> { interval, sustainNodes }
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // ---- White noise buffer helper ----
  makeNoiseBuffer(durationSec) {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * durationSec, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- Looping DJ effect sounds ----
  startEffect(effectId) {
    if (!this.enabled || !this.ctx || this.loops[effectId]) return;
    const tick = this._tickers[effectId];
    if (!tick) return;
    const sustain = [];
    tick.call(this, sustain);
    const interval = setInterval(() => {
      try { tick.call(this, sustain); } catch (e) { /* ignore */ }
    }, tick.intervalMs);
    this.loops[effectId] = { interval, sustain };
  }

  stopEffect(effectId) {
    const loop = this.loops[effectId];
    if (!loop) return;
    clearInterval(loop.interval);
    // Stop any sustained oscillators / sources
    for (const node of loop.sustain) {
      try { node.stop?.(); node.disconnect?.(); } catch (e) { /* ignore */ }
    }
    delete this.loops[effectId];
  }

  get _tickers() {
    if (this.__t) return this.__t;
    const v = () => this.sfxVolume * 0.3;
    const ctxOf = () => this.ctx;

    const tone = (freq, type, dur, peakGain, freqEnd = null) => {
      const ctx = ctxOf(); const now = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, now);
      if (freqEnd != null) o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + dur);
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(peakGain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.start(now); o.stop(now + dur + 0.02);
    };

    const noiseHit = (dur, peakGain, hpFreq = 0, lpFreq = 0) => {
      const ctx = ctxOf(); const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.makeNoiseBuffer(dur);
      const g = ctx.createGain();
      let chain = src;
      if (hpFreq) {
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = hpFreq;
        chain.connect(hp); chain = hp;
      }
      if (lpFreq) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = lpFreq;
        chain.connect(lp); chain = lp;
      }
      chain.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(peakGain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.start(now); src.stop(now + dur + 0.02);
    };

    const t = {};

    // DISCO — 10 rotating "tracks" so it sounds like a real DJ set
    const kick = (vol) => tone(120, 'sine', 0.18, vol * 0.6, 40);
    const subKick = (vol) => tone(80, 'sine', 0.25, vol * 0.7, 28);
    const snare = (vol) => { noiseHit(0.08, vol * 0.5, 1500, 5000); tone(220, 'triangle', 0.06, vol * 0.3, 180); };
    const clap = (vol) => { noiseHit(0.04, vol * 0.5, 1200); setTimeout(() => noiseHit(0.06, vol * 0.45, 1200), 18); };
    const hat = (vol) => noiseHit(0.04, vol * 0.35, 8000);
    const openHat = (vol) => noiseHit(0.18, vol * 0.3, 7000);
    const bass = (vol, freq) => tone(freq, 'sawtooth', 0.18, vol * 0.35);
    const lead = (vol, freq) => tone(freq, 'square', 0.15, vol * 0.25);
    const arp = (vol, freq) => tone(freq, 'triangle', 0.1, vol * 0.3);
    const zap = (vol) => tone(800, 'sawtooth', 0.12, vol * 0.4, 80);
    const cowbell = (vol) => { tone(800, 'square', 0.08, vol * 0.25); tone(540, 'square', 0.08, vol * 0.2); };

    // 16-step patterns. Each function takes (vol, step) where step is 0..15 (16th notes)
    const discoTracks = [
      // 0 — Classic house: 4-on-floor kick + offbeat hat
      (vol, s) => { if (s % 4 === 0) kick(vol); if (s % 4 === 2) hat(vol); if (s % 8 === 4) clap(vol); },
      // 1 — Disco bass walk
      (vol, s) => {
        if (s % 4 === 0) kick(vol);
        const walk = [55, 55, 65, 73];
        if (s % 2 === 0) bass(vol, walk[(s / 2) % 4]);
        if (s % 4 === 2) hat(vol);
      },
      // 2 — Techno pulse
      (vol, s) => {
        if (s % 4 === 0) subKick(vol);
        bass(vol * 0.6, 55); // constant pulse
        if (s % 2 === 1) hat(vol);
      },
      // 3 — Funk groove
      (vol, s) => {
        if (s === 0 || s === 6 || s === 8 || s === 14) kick(vol);
        if (s === 4 || s === 12) snare(vol);
        if (s % 2 === 1) hat(vol);
      },
      // 4 — Synthwave arp
      (vol, s) => {
        if (s % 4 === 0) kick(vol);
        const arpNotes = [261, 329, 392, 523, 392, 329];
        arp(vol, arpNotes[s % arpNotes.length]);
        if (s % 4 === 2) hat(vol);
      },
      // 5 — Hip-hop boom-bap
      (vol, s) => {
        if (s === 0 || s === 10) subKick(vol);
        if (s === 4 || s === 12) snare(vol);
        if (s % 2 === 1) hat(vol);
      },
      // 6 — Trance lead melody
      (vol, s) => {
        if (s % 4 === 0) kick(vol);
        const mel = [440, 0, 523, 0, 587, 0, 523, 0, 440, 0, 392, 0, 349, 0, 392, 0];
        if (mel[s]) lead(vol, mel[s]);
        if (s % 4 === 2) openHat(vol);
      },
      // 7 — Acid house with squelchy bass
      (vol, s) => {
        if (s % 4 === 0) kick(vol);
        const bassPat = [55, 55, 0, 110, 55, 0, 73, 0];
        if (bassPat[s % 8]) bass(vol, bassPat[s % 8]);
        if (s % 2 === 1) hat(vol);
      },
      // 8 — Drum & bass breakbeat
      (vol, s) => {
        if (s === 0 || s === 6 || s === 10) kick(vol);
        if (s === 4 || s === 12) snare(vol);
        hat(vol * 0.6);
      },
      // 9 — Electro / cowbell party
      (vol, s) => {
        if (s % 4 === 0) kick(vol);
        if (s % 2 === 0) cowbell(vol);
        if (s === 4 || s === 12) clap(vol);
        if (s === 8) zap(vol);
      },
    ];

    let discoStep = 0; let discoTrackIdx = 0;
    const BARS_PER_TRACK = 4; // 4 bars × 16 steps = 64 steps before rotating
    t.disco = function(sustain) {
      // Reset on first tick of fresh activation (sustain array starts empty)
      if (sustain.length === 0) { discoStep = 0; discoTrackIdx = Math.floor(Math.random() * discoTracks.length); sustain.push(true); }
      const trk = discoTracks[discoTrackIdx];
      try { trk(v(), discoStep % 16); } catch (e) { /* ignore */ }
      discoStep++;
      if (discoStep % (BARS_PER_TRACK * 16) === 0) {
        discoTrackIdx = (discoTrackIdx + 1) % discoTracks.length;
      }
    };
    t.disco.intervalMs = 125; // 16th notes @ 120 BPM

    // FIREWORKS — realistic: ascending whistle → SHARP CRACK → deep BOOM → crackling tail
    t.fireworks = function() {
      const vol = v();
      const ctx = ctxOf();
      // 1) Whistle ascending (the shell flying up)
      const now = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(300, now);
      o.frequency.exponentialRampToValueAtTime(1800, now + 0.7);
      // Add slight vibrato for whistling
      const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
      lfo.frequency.value = 6; lfoG.gain.value = 40;
      lfo.connect(lfoG); lfoG.connect(o.frequency);
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(vol * 0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      lfo.start(now); o.start(now);
      lfo.stop(now + 0.72); o.stop(now + 0.72);

      // 2) Sharp CRACK — high-frequency white noise burst (the explosion)
      setTimeout(() => {
        // Initial sharp transient — mid/high noise
        noiseHit(0.04, vol * 1.0, 2000);
        // Body of bang — full-spectrum boom
        noiseHit(0.25, vol * 0.85, 0, 4000);
      }, 720);

      // 3) Deep low BOOM — sub-bass thump
      setTimeout(() => {
        const ctx2 = ctxOf(); const now2 = ctx2.currentTime;
        const lo = ctx2.createOscillator(); const lg = ctx2.createGain();
        lo.type = 'sine';
        lo.frequency.setValueAtTime(140, now2);
        lo.frequency.exponentialRampToValueAtTime(35, now2 + 0.5);
        lo.connect(lg); lg.connect(ctx2.destination);
        lg.gain.setValueAtTime(vol * 0.7, now2);
        lg.gain.exponentialRampToValueAtTime(0.001, now2 + 0.6);
        lo.start(now2); lo.stop(now2 + 0.65);
      }, 740);

      // 4) Crackling sparks tail — random short noise pops
      for (let i = 0; i < 14; i++) {
        const delay = 900 + i * 90 + (Math.random() * 80);
        setTimeout(() => {
          if (Math.random() < 0.7) noiseHit(0.025, vol * 0.5, 5000);
        }, delay);
      }
    };
    t.fireworks.intervalMs = 2400;

    // POOP — wet farty bass blip + occasional SPLAT when one lands
    t.poop = function() {
      const ctx = ctxOf(); const now = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(180 + Math.random() * 100, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.18);
      // vibrato via LFO
      const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
      lfo.frequency.value = 25; lfoGain.gain.value = 30;
      lfo.connect(lfoGain); lfoGain.connect(o.frequency);
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(v() * 0.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      lfo.start(now); o.start(now);
      lfo.stop(now + 0.22); o.stop(now + 0.22);
      // Sploosh splat ~1.5-2s later (when poop hits the bottom of the screen)
      if (Math.random() < 0.4) {
        setTimeout(() => {
          noiseHit(0.18, v() * 0.4, 0, 800); // wet low-pass thud
          tone(80, 'sine', 0.12, v() * 0.3, 30);
        }, 1400 + Math.random() * 600);
      }
    };
    t.poop.intervalMs = 350;

    // ROCKET — sustained engine rumble + WHOOSH on each launch (every 0.4s = 5 staggered rockets)
    t.rocket = function(sustain) {
      const ctx = ctxOf(); const now = ctx.currentTime;
      // First tick: start sustained engine
      if (sustain.length === 0) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.makeNoiseBuffer(2);
        noise.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 600;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(v() * 0.5, now + 0.3);
        noise.connect(lp); lp.connect(g); g.connect(ctx.destination);
        noise.start(now);
        // Low rumble oscillator
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = 60;
        const og = ctx.createGain();
        og.gain.setValueAtTime(0, now);
        og.gain.linearRampToValueAtTime(v() * 0.3, now + 0.3);
        o.connect(og); og.connect(ctx.destination);
        o.start(now);
        sustain.push(noise, o);
      }
      // Every tick: WHOOSH for one rocket launch (high → low pitched sweep)
      const w = ctx.createOscillator(); const wg = ctx.createGain();
      w.type = 'sawtooth';
      w.frequency.setValueAtTime(900, now);
      w.frequency.exponentialRampToValueAtTime(80, now + 0.45);
      const wlp = ctx.createBiquadFilter();
      wlp.type = 'lowpass'; wlp.frequency.value = 1500;
      w.connect(wlp); wlp.connect(wg); wg.connect(ctx.destination);
      wg.gain.setValueAtTime(v() * 0.45, now);
      wg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      w.start(now); w.stop(now + 0.55);
      // Add noise burst for engine ignition
      noiseHit(0.18, v() * 0.5, 200, 2000);
    };
    t.rocket.intervalMs = 400; // each rocket launch (matches visual stagger)

    // CATS — random meow chirps
    t.cats = function() {
      const ctx = ctxOf(); const now = ctx.currentTime;
      const startF = 500 + Math.random() * 400;
      const peakF = startF * 1.5;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(startF, now);
      o.frequency.linearRampToValueAtTime(peakF, now + 0.1);
      o.frequency.linearRampToValueAtTime(startF * 0.7, now + 0.35);
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(v() * 0.35, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      o.start(now); o.stop(now + 0.42);
    };
    t.cats.intervalMs = 700;

    // TSUNAMI — sustained ocean rumble + occasional crash
    t.tsunami = function(sustain) {
      if (!sustain.length) {
        const ctx = ctxOf(); const now = ctx.currentTime;
        const noise = ctx.createBufferSource();
        noise.buffer = this.makeNoiseBuffer(2);
        noise.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 800;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(v() * 0.5, now + 0.4);
        noise.connect(lp); lp.connect(g); g.connect(ctx.destination);
        noise.start(now);
        sustain.push(noise);
      }
      // Occasional wave crash
      noiseHit(0.6, v() * 0.5, 200, 3000);
    };
    t.tsunami.intervalMs = 1400;

    // LIGHTNING — thunder roll
    t.lightning = function() {
      const vol = v();
      // Sharp crack
      noiseHit(0.08, vol * 0.7, 3000);
      // Long rumbling thunder
      setTimeout(() => noiseHit(1.2, vol * 0.6, 0, 400), 60);
    };
    t.lightning.intervalMs = 1800;

    // BOMB — deep boom every 2.4s (matches visual)
    t.bomb = function() {
      const ctx = ctxOf(); const now = ctx.currentTime;
      // Initial pop
      noiseHit(0.05, v() * 0.8);
      // Deep boom
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, now);
      o.frequency.exponentialRampToValueAtTime(20, now + 0.8);
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(v() * 0.9, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      o.start(now); o.stop(now + 0.95);
      // Rumble tail
      noiseHit(1.0, v() * 0.4, 0, 600);
    };
    t.bomb.intervalMs = 2400;

    // CROWD — continuous cheering crowd noise + sporadic whoops
    t.crowd = function(sustain) {
      if (!sustain.length) {
        const ctx = ctxOf(); const now = ctx.currentTime;
        const noise = ctx.createBufferSource();
        noise.buffer = this.makeNoiseBuffer(2);
        noise.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(v() * 0.4, now + 0.3);
        noise.connect(bp); bp.connect(g); g.connect(ctx.destination);
        noise.start(now);
        sustain.push(noise);
      }
      // Occasional "whoop" — quick rising tone
      const ctx = ctxOf(); const now = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(300 + Math.random() * 200, now);
      o.frequency.linearRampToValueAtTime(800 + Math.random() * 400, now + 0.25);
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(v() * 0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      o.start(now); o.stop(now + 0.32);
    };
    t.crowd.intervalMs = 600;

    this.__t = t;
    return t;
  }

  play(type) {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      gain.connect(this.ctx.destination);
      gain.gain.value = this.sfxVolume * 0.3;

      if (type === 'tap') {
        const freq = 500 + Math.random() * 500;
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.gain.setValueAtTime(this.sfxVolume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 1.5;
        const g2 = this.ctx.createGain();
        g2.connect(this.ctx.destination);
        g2.gain.setValueAtTime(this.sfxVolume * 0.08, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc2.connect(g2);
        osc2.start(now);
        osc2.stop(now + 0.04);
      } else if (type === 'purchase') {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
        osc.connect(gain);
        gain.gain.setValueAtTime(this.sfxVolume * 0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'unlock') {
        [523, 659, 784].forEach((f, i) => {
          const o = this.ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f;
          const g = this.ctx.createGain();
          g.connect(this.ctx.destination);
          g.gain.setValueAtTime(0, now + i * 0.12);
          g.gain.linearRampToValueAtTime(this.sfxVolume * 0.15, now + i * 0.12 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
          o.connect(g);
          o.start(now + i * 0.12);
          o.stop(now + i * 0.12 + 0.3);
        });
      } else if (type === 'golden') {
        [880, 1100, 1320, 1760].forEach((f, i) => {
          const o = this.ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f;
          const g = this.ctx.createGain();
          g.connect(this.ctx.destination);
          g.gain.setValueAtTime(0, now + i * 0.08);
          g.gain.linearRampToValueAtTime(this.sfxVolume * 0.1, now + i * 0.08 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
          o.connect(g);
          o.start(now + i * 0.08);
          o.stop(now + i * 0.08 + 0.4);
        });
      } else if (type === 'ascend') {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(200, now);
        o.frequency.exponentialRampToValueAtTime(30, now + 1.5);
        o.connect(gain);
        gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        o.start(now);
        o.stop(now + 1.5);
      } else if (type === 'combo') {
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = 660 + Math.random() * 440;
        o.connect(gain);
        gain.gain.setValueAtTime(this.sfxVolume * 0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        o.start(now);
        o.stop(now + 0.08);
      }
    } catch (e) { /* silent fail */ }
  }
}

const soundEngine = new SoundEngine();

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function formatNumber(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function getUpgradeCost(baseCost, owned) {
  return Math.floor(baseCost * Math.pow(1.15, owned));
}

function getWeather(lifetimePoints) {
  if (lifetimePoints >= 10000000) return 'rainbow';
  if (lifetimePoints >= 2000000) return 'galaxy';
  if (lifetimePoints >= 500000) return 'neon';
  if (lifetimePoints >= 100000) return 'stars';
  if (lifetimePoints >= 10000) return 'sunny';
  return 'normal';
}

function getWeatherName(w) {
  const names = { normal: 'Normal', sunny: 'Sunny', stars: 'Star Rain', neon: 'Neon Storm', galaxy: 'Galaxy', rainbow: 'Rainbow' };
  return names[w] || 'Normal';
}

function getWeatherBg(w) {
  const bgs = {
    normal: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    sunny: 'linear-gradient(135deg, #f12711, #f5af19)',
    stars: 'linear-gradient(135deg, #0f0c29, #1a1a4e, #24243e)',
    neon: 'linear-gradient(135deg, #6a0dad, #00bcd4)',
    galaxy: 'linear-gradient(135deg, #000428, #004e92)',
    rainbow: 'linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0000ff, #8b00ff)',
  };
  return bgs[w] || bgs.normal;
}

function getSeason() {
  const m = new Date().getMonth();
  if (m === 9) return 'spooky';
  if (m === 11) return 'frosty';
  if (m >= 5 && m <= 7) return 'beach';
  return null;
}

function getSeasonalBonus() {
  const s = getSeason();
  if (s === 'frosty' || s === 'beach') return 0.25;
  return 0;
}

function getSeasonName() {
  const s = getSeason();
  if (s === 'spooky') return 'Spooky Brainrot';
  if (s === 'frosty') return 'Frosty Brainrot';
  if (s === 'beach') return 'Beach Brainrot';
  return null;
}

// ============================================================
// DEFAULT GAME STATE
// ============================================================
function defaultState() {
  return {
    points: 0,
    lifetimePoints: 0,
    totalClicks: 0,
    equippedSkin: 0,
    unlockedSkins: [0],
    autoClickers: {},
    tapUpgrades: {},
    efficiencyUpgrades: [],
    usedCodes: [],
    bonusCps: 0,
    brainCells: 0,
    prestigeCount: 0,
    achievements: [],
    totalUpgrades: 0,
    highestCombo: 0,
    dailyDay: 0,
    dailyCycle: 1,
    lastDailyDate: null,
    lastSaveTime: Date.now(),
    storyShown: [],
    reflexMedals: { gold: 0, silver: 0, bronze: 0 },
    lastReflexTime: 0,
    username: 'Player' + Math.floor(1000 + Math.random() * 9000),
  };
}

function saveGame(state) {
  try {
    localStorage.setItem('brainrot_save', JSON.stringify({ ...state, lastSaveTime: Date.now() }));
  } catch (e) { /* silent */ }
}

function loadGame() {
  try {
    const data = JSON.parse(localStorage.getItem('brainrot_save'));
    if (data) return { ...defaultState(), ...data };
  } catch (e) { /* silent */ }
  return defaultState();
}

// ============================================================
// WORLD BACKGROUNDS — Immersive CSS scenes for each character
// ============================================================
function WorldBackground({ skinId }) {
  const s = { position: 'absolute', pointerEvents: 'none' };
  const ground = (color, height = '28%') => ({ ...s, bottom: '56px', left: 0, right: 0, height, background: color, zIndex: 1 });
  const hill = (w, h, color, left, bottom = '56px') => ({
    ...s, width: w, height: h, background: color, borderRadius: '50% 50% 0 0',
    left, bottom, zIndex: 1,
  });
  const cloud = (left, top, scale = 1) => ({
    ...s, left, top, width: 120 * scale, height: 40 * scale, background: 'rgba(255,255,255,0.25)',
    borderRadius: '50px', zIndex: 1, filter: 'blur(2px)',
  });
  const star = (left, top, size = 4) => ({
    ...s, left, top, width: size, height: size, background: '#fff',
    borderRadius: '50%', zIndex: 1, opacity: 0.7, animation: 'pulse 2s ease-in-out infinite',
  });
  const emoji = (e, left, top, size = 30, opacity = 0.6) => (
    <div key={e+left} style={{ ...s, left, top, fontSize: size, opacity, zIndex: 1 }}>{e}</div>
  );

  const worlds = {
    // 0: Noobini Lovini — Candy Dreamland
    0: () => (<>
      <div style={ground('linear-gradient(180deg, #d63384 0%, #e685b5 50%, #c44a8a 100%)')} />
      <div style={hill('40vw', '15vh', '#e685b5', '0%')} />
      <div style={hill('35vw', '12vh', '#d963a0', '55%')} />
      <div style={hill('25vw', '10vh', '#f0a0cc', '30%', 'calc(56px + 10vh)')} />
      {emoji('🍭', '8%', '25%', 40)}
      {emoji('🍬', '85%', '35%', 35)}
      {emoji('🦄', '75%', '15%', 45, 0.4)}
      {emoji('⭐', '15%', '12%', 25)}
      {emoji('🌟', '60%', '20%', 20)}
      <div style={cloud('10%', '8%')} />
      <div style={cloud('65%', '5%', 0.8)} />
    </>),
    // 1: Romantini Grandini — Medieval Castle
    1: () => (<>
      <div style={ground('linear-gradient(180deg, #4a2020 0%, #2d1515 100%)')} />
      {/* Castle silhouette */}
      <div style={{ ...s, bottom: 'calc(56px + 28%)', left: '10%', width: '25vw', height: '30vh', background: '#1a0a0a', zIndex: 1, clipPath: 'polygon(0% 100%, 5% 30%, 12% 30%, 12% 0%, 18% 0%, 18% 30%, 25% 30%, 30% 20%, 35% 30%, 42% 30%, 42% 0%, 48% 0%, 48% 30%, 55% 30%, 60% 100%)' }} />
      <div style={{ ...s, bottom: 'calc(56px + 28%)', right: '5%', width: '20vw', height: '25vh', background: '#1a0808', zIndex: 1, clipPath: 'polygon(0% 100%, 10% 40%, 20% 40%, 20% 0%, 30% 0%, 30% 40%, 50% 40%, 60% 30%, 70% 40%, 80% 40%, 80% 0%, 90% 0%, 90% 40%, 100% 100%)' }} />
      {emoji('🏰', '45%', '15%', 50, 0.3)}
      {emoji('🔥', '5%', '60%', 30)}
      {emoji('🔥', '90%', '58%', 25)}
      {emoji('⚔️', '80%', '20%', 30, 0.4)}
      {emoji('👑', '50%', '8%', 28, 0.5)}
      <div style={star('20%', '5%')} />
      <div style={star('70%', '10%')} />
      <div style={star('40%', '3%', 3)} />
    </>),
    // 2: Lovini Lovini Lovini — Heart Cloud Kingdom
    2: () => (<>
      <div style={ground('linear-gradient(180deg, #ff69b4 0%, #ffb6c1 50%, #ff69b4 100%)')} />
      <div style={hill('45vw', '14vh', '#ff85c8', '-5%')} />
      <div style={hill('40vw', '12vh', '#ff9dd6', '50%')} />
      <div style={cloud('5%', '10%', 1.2)} />
      <div style={cloud('55%', '6%', 1)} />
      <div style={cloud('30%', '18%', 0.7)} />
      {/* Rainbow */}
      <div style={{ ...s, top: '5%', left: '20%', width: '60vw', height: '30vh', borderRadius: '50% 50% 0 0', border: '8px solid transparent', borderTop: '8px solid rgba(255,0,0,0.2)', zIndex: 1, boxShadow: '0 -4px 0 rgba(255,165,0,0.2), 0 -8px 0 rgba(255,255,0,0.2), 0 -12px 0 rgba(0,255,0,0.15), 0 -16px 0 rgba(0,100,255,0.15), 0 -20px 0 rgba(128,0,255,0.15)' }} />
      {emoji('💕', '10%', '30%', 35)}
      {emoji('💗', '80%', '25%', 40)}
      {emoji('💝', '50%', '12%', 30, 0.5)}
      {emoji('🎀', '88%', '45%', 28)}
      {emoji('💓', '5%', '50%', 25)}
    </>),
    // 3: Teddini & Robotini — Toy Workshop
    3: () => (<>
      <div style={ground('linear-gradient(180deg, #8B6914 0%, #A07828 50%, #6B4E12 100%)')} />
      {/* Wooden shelf */}
      <div style={{ ...s, top: '10%', left: '2%', width: '20vw', height: '4px', background: '#5C3A1E', zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
      <div style={{ ...s, top: '10%', right: '3%', width: '18vw', height: '4px', background: '#5C3A1E', zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
      {/* Warm spotlight */}
      <div style={{ ...s, top: 0, left: '50%', transform: 'translateX(-50%)', width: '60vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(255,200,100,0.15) 0%, transparent 70%)', zIndex: 1 }} />
      {emoji('🧸', '5%', '12%', 35, 0.5)}
      {emoji('🤖', '82%', '12%', 30, 0.5)}
      {emoji('⚙️', '90%', '40%', 40, 0.3)}
      {emoji('🔧', '3%', '45%', 28, 0.4)}
      {emoji('🧩', '75%', '60%', 25, 0.4)}
      {emoji('🪀', '12%', '65%', 30, 0.35)}
    </>),
    // 4: Noobini Partini — Fireworks Night
    4: () => (<>
      <div style={ground('linear-gradient(180deg, #1a0530 0%, #2a1050 100%)')} />
      {/* Firework bursts */}
      <div style={{ ...s, top: '5%', left: '15%', width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,100,50,0.6) 0%, rgba(255,200,0,0.3) 40%, transparent 70%)', zIndex: 1 }} />
      <div style={{ ...s, top: '10%', right: '20%', width: 60, height: 60, borderRadius: '50%', background: 'radial-gradient(circle, rgba(50,200,255,0.5) 0%, rgba(100,50,255,0.3) 40%, transparent 70%)', zIndex: 1 }} />
      <div style={{ ...s, top: '20%', left: '50%', width: 50, height: 50, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,100,0.5) 0%, rgba(0,200,255,0.2) 40%, transparent 70%)', zIndex: 1 }} />
      {emoji('🎆', '10%', '8%', 45, 0.7)}
      {emoji('🎇', '75%', '5%', 40, 0.6)}
      {emoji('🎉', '5%', '50%', 30)}
      {emoji('🎊', '88%', '45%', 28)}
      {emoji('🎈', '92%', '15%', 35, 0.5)}
      <div style={star('30%', '3%', 3)} />
      <div style={star('60%', '8%', 2)} />
      <div style={star('80%', '3%', 4)} />
      <div style={star('45%', '15%', 2)} />
    </>),
    // 5: Cakini Presintini — Bakery Kitchen
    5: () => (<>
      {/* Checkered floor */}
      <div style={{ ...s, bottom: '56px', left: 0, right: 0, height: '25%', zIndex: 1, background: 'repeating-conic-gradient(#cc8800 0% 25%, #ffb347 0% 50%) 0 0 / 40px 40px', opacity: 0.4 }} />
      <div style={ground('linear-gradient(180deg, rgba(255,140,0,0.5) 0%, rgba(200,100,0,0.6) 100%)')} />
      {/* Oven glow */}
      <div style={{ ...s, bottom: 'calc(56px + 25%)', right: '5%', width: '15vw', height: '20vh', background: 'radial-gradient(ellipse, rgba(255,150,0,0.4) 0%, transparent 70%)', zIndex: 1 }} />
      {emoji('🎂', '5%', '20%', 45, 0.5)}
      {emoji('🧁', '85%', '25%', 35, 0.5)}
      {emoji('🍰', '80%', '55%', 30)}
      {emoji('🍩', '8%', '55%', 28)}
      {emoji('🍪', '15%', '35%', 25, 0.4)}
      {emoji('🍫', '90%', '40%', 22, 0.4)}
    </>),
    // 6: Lovini Rosetti — Rose Garden
    6: () => (<>
      <div style={ground('linear-gradient(180deg, #2d8c3c 0%, #1e6b2a 50%, #165020 100%)')} />
      <div style={hill('50vw', '10vh', '#3a9e4d', '-5%', 'calc(56px + 5vh)')} />
      <div style={hill('40vw', '8vh', '#2d8c3c', '55%', 'calc(56px + 3vh)')} />
      {/* Rose bushes */}
      {emoji('🌹', '5%', '55%', 40)}
      {emoji('🌹', '18%', '60%', 35)}
      {emoji('🌹', '85%', '52%', 38)}
      {emoji('🌹', '72%', '58%', 30)}
      {emoji('🌷', '40%', '65%', 28, 0.5)}
      {emoji('🦋', '20%', '25%', 30, 0.5)}
      {emoji('🦋', '70%', '18%', 25, 0.4)}
      {emoji('🌸', '60%', '10%', 20, 0.3)}
      <div style={cloud('10%', '5%', 1)} />
      <div style={cloud('60%', '3%', 0.8)} />
    </>),
    // 7: Heartini Smilekurro — Cloud Kingdom
    7: () => (<>
      <div style={ground('linear-gradient(180deg, #40c4c4 0%, #2da5a5 100%)', '15%')} />
      <div style={cloud('2%', '60%', 2)} />
      <div style={cloud('50%', '65%', 1.8)} />
      <div style={cloud('5%', '15%', 1.3)} />
      <div style={cloud('60%', '10%', 1)} />
      <div style={cloud('35%', '25%', 0.8)} />
      <div style={cloud('80%', '20%', 1.1)} />
      {/* Sun */}
      <div style={{ ...s, top: '5%', right: '10%', width: 60, height: 60, borderRadius: '50%', background: 'radial-gradient(circle, #fff700 30%, rgba(255,200,0,0.3) 70%, transparent)', zIndex: 1 }} />
      {/* Rainbow arc */}
      <div style={{ ...s, top: '30%', left: '10%', width: '80vw', height: '25vh', borderRadius: '50% 50% 0 0', border: '6px solid transparent', borderTop: '5px solid rgba(255,0,0,0.15)', zIndex: 1, boxShadow: '0 -3px 0 rgba(255,165,0,0.15), 0 -6px 0 rgba(255,255,0,0.15), 0 -9px 0 rgba(0,255,0,0.1), 0 -12px 0 rgba(0,100,255,0.1)' }} />
      {emoji('😊', '15%', '40%', 30, 0.4)}
      {emoji('⭐', '85%', '35%', 25, 0.5)}
      {emoji('🌈', '5%', '30%', 35, 0.3)}
    </>),
    // 8: Transformini Firini — Dark Battle Arena
    8: () => (<>
      <div style={ground('linear-gradient(180deg, #1a0a30 0%, #0d0520 100%)')} />
      {/* Stone platform */}
      <div style={{ ...s, bottom: 'calc(56px + 10%)', left: '20%', width: '60vw', height: '8vh', background: 'linear-gradient(180deg, #3a3050, #2a2040)', borderRadius: '8px 8px 0 0', zIndex: 1, boxShadow: '0 4px 20px rgba(100,0,255,0.3)' }} />
      {/* Fire pillars */}
      <div style={{ ...s, bottom: 'calc(56px + 18%)', left: '8%', width: 30, height: '15vh', background: 'linear-gradient(180deg, transparent, #ff440066, #ff660088)', zIndex: 1, borderRadius: '50% 50% 0 0' }} />
      <div style={{ ...s, bottom: 'calc(56px + 18%)', right: '8%', width: 30, height: '15vh', background: 'linear-gradient(180deg, transparent, #ff440066, #ff660088)', zIndex: 1, borderRadius: '50% 50% 0 0' }} />
      {emoji('🔥', '6%', '40%', 40, 0.7)}
      {emoji('🔥', '88%', '42%', 35, 0.7)}
      {emoji('⚡', '50%', '5%', 40, 0.4)}
      {emoji('💥', '20%', '15%', 30, 0.3)}
      {emoji('⚔️', '75%', '12%', 28, 0.4)}
      <div style={star('30%', '5%', 3)} />
      <div style={star('70%', '8%', 2)} />
    </>),
    // 9: Cupidini Sahuroni — Floating Temple
    9: () => (<>
      {/* Clouds below */}
      <div style={{ ...s, bottom: '56px', left: 0, right: 0, height: '20%', background: 'linear-gradient(180deg, rgba(200,150,255,0.4), rgba(255,255,255,0.3))', zIndex: 1, filter: 'blur(3px)' }} />
      <div style={cloud('0%', '70%', 2.5)} />
      <div style={cloud('40%', '72%', 2)} />
      <div style={cloud('70%', '68%', 1.8)} />
      {/* Pillars */}
      <div style={{ ...s, bottom: 'calc(56px + 20%)', left: '10%', width: 20, height: '30vh', background: 'linear-gradient(180deg, #d4b8ff44, #a080d066)', zIndex: 1, borderRadius: '4px' }} />
      <div style={{ ...s, bottom: 'calc(56px + 20%)', right: '10%', width: 20, height: '30vh', background: 'linear-gradient(180deg, #d4b8ff44, #a080d066)', zIndex: 1, borderRadius: '4px' }} />
      {/* Moon */}
      <div style={{ ...s, top: '8%', right: '15%', width: 50, height: 50, borderRadius: '50%', background: 'radial-gradient(circle, #ffe0ff 20%, rgba(200,150,255,0.3) 70%, transparent)', zIndex: 1, boxShadow: '0 0 30px rgba(200,150,255,0.4)' }} />
      {emoji('💘', '50%', '10%', 35, 0.5)}
      {emoji('👼', '15%', '20%', 30, 0.4)}
      {emoji('🏹', '80%', '25%', 28, 0.4)}
      {emoji('🔮', '5%', '35%', 25, 0.3)}
    </>),
    // 10: Rositti Tueletti — Enchanted Forest
    10: () => (<>
      <div style={ground('linear-gradient(180deg, #1a0040 0%, #2a1060 100%)')} />
      {/* Tree trunks */}
      <div style={{ ...s, bottom: 'calc(56px + 10%)', left: '5%', width: 20, height: '40vh', background: '#2d1a40', zIndex: 1, borderRadius: '4px' }} />
      <div style={{ ...s, bottom: 'calc(56px + 10%)', right: '8%', width: 16, height: '35vh', background: '#2d1a40', zIndex: 1, borderRadius: '4px' }} />
      {/* Tree canopy */}
      <div style={{ ...s, bottom: 'calc(56px + 10% + 35vh)', left: '-2%', width: '20vw', height: '15vh', background: 'radial-gradient(ellipse, rgba(80,20,120,0.6), transparent)', zIndex: 1, borderRadius: '50%' }} />
      <div style={{ ...s, bottom: 'calc(56px + 10% + 30vh)', right: '0%', width: '18vw', height: '12vh', background: 'radial-gradient(ellipse, rgba(80,20,120,0.5), transparent)', zIndex: 1, borderRadius: '50%' }} />
      {emoji('🍄', '12%', '62%', 35, 0.6)}
      {emoji('🍄', '80%', '58%', 28, 0.5)}
      {emoji('🌺', '25%', '50%', 25, 0.5)}
      {emoji('✨', '60%', '20%', 20, 0.6)}
      {emoji('✨', '30%', '30%', 15, 0.5)}
      {emoji('✨', '75%', '35%', 18, 0.4)}
      {emoji('🦄', '85%', '15%', 30, 0.3)}
    </>),
    // 11: Birthdayini Cardini — Birthday Party Room
    11: () => (<>
      <div style={ground('linear-gradient(180deg, #cc9900 0%, #aa7700 100%)')} />
      {/* Streamers */}
      <div style={{ ...s, top: 0, left: '10%', width: 3, height: '30vh', background: 'linear-gradient(180deg, #ff3366, #ff6600, #ffcc00)', zIndex: 1, transform: 'rotate(5deg)' }} />
      <div style={{ ...s, top: 0, right: '15%', width: 3, height: '25vh', background: 'linear-gradient(180deg, #33ccff, #6633ff, #ff33cc)', zIndex: 1, transform: 'rotate(-3deg)' }} />
      <div style={{ ...s, top: 0, left: '40%', width: 3, height: '20vh', background: 'linear-gradient(180deg, #33ff66, #ffcc00, #ff3333)', zIndex: 1, transform: 'rotate(2deg)' }} />
      {emoji('🎈', '5%', '15%', 45, 0.6)}
      {emoji('🎈', '90%', '10%', 40, 0.5)}
      {emoji('🎈', '70%', '18%', 35, 0.55)}
      {emoji('🎂', '85%', '55%', 40, 0.5)}
      {emoji('🎁', '8%', '58%', 35, 0.5)}
      {emoji('🎊', '50%', '5%', 30, 0.4)}
      {emoji('🥳', '20%', '25%', 25, 0.35)}
    </>),
    // 12: Cakini Elephantini — Circus Tent
    12: () => (<>
      <div style={ground('linear-gradient(180deg, #4a2080 0%, #2a1050 100%)')} />
      {/* Circus tent stripes */}
      <div style={{ ...s, top: 0, left: 0, right: 0, height: '40%', zIndex: 1, opacity: 0.15, background: 'repeating-linear-gradient(90deg, #ffd700 0px, #ffd700 40px, transparent 40px, transparent 80px)' }} />
      {/* Spotlights */}
      <div style={{ ...s, top: 0, left: '20%', width: '20vw', height: '60vh', background: 'linear-gradient(180deg, rgba(255,215,0,0.15), transparent)', zIndex: 1, clipPath: 'polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)' }} />
      <div style={{ ...s, top: 0, right: '20%', width: '20vw', height: '60vh', background: 'linear-gradient(180deg, rgba(255,215,0,0.1), transparent)', zIndex: 1, clipPath: 'polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)' }} />
      {emoji('🎪', '45%', '5%', 50, 0.4)}
      {emoji('🎠', '5%', '45%', 35, 0.4)}
      {emoji('🍭', '88%', '40%', 30, 0.5)}
      {emoji('⭐', '15%', '15%', 25, 0.5)}
      {emoji('✨', '80%', '20%', 20, 0.4)}
    </>),
    // 13: Yessini Innovarini — Inventor Lab
    13: () => (<>
      <div style={ground('linear-gradient(180deg, #0a2040 0%, #051525 100%)')} />
      {/* Screen glow */}
      <div style={{ ...s, top: '10%', left: '5%', width: '15vw', height: '12vh', background: 'rgba(0,150,255,0.15)', border: '2px solid rgba(0,150,255,0.3)', borderRadius: '4px', zIndex: 1 }} />
      <div style={{ ...s, top: '15%', right: '5%', width: '12vw', height: '10vh', background: 'rgba(0,255,100,0.1)', border: '2px solid rgba(0,255,100,0.2)', borderRadius: '4px', zIndex: 1 }} />
      {/* Sparks */}
      <div style={{ ...s, top: '30%', left: '10%', width: 4, height: 4, background: '#00ccff', borderRadius: '50%', zIndex: 1, boxShadow: '0 0 10px #00ccff', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ ...s, top: '25%', right: '15%', width: 3, height: 3, background: '#00ff88', borderRadius: '50%', zIndex: 1, boxShadow: '0 0 8px #00ff88', animation: 'pulse 2s ease-in-out infinite' }} />
      {emoji('💡', '50%', '5%', 35, 0.5)}
      {emoji('⚡', '85%', '35%', 30, 0.4)}
      {emoji('🔬', '8%', '30%', 28, 0.4)}
      {emoji('🚀', '80%', '55%', 30, 0.35)}
      {emoji('⚙️', '5%', '55%', 25, 0.3)}
    </>),
    // 14: Noobini Partyini — Jungle Party
    14: () => (<>
      <div style={ground('linear-gradient(180deg, #0a4a20 0%, #063015 100%)')} />
      {/* Canopy leaves */}
      <div style={{ ...s, top: 0, left: 0, width: '30vw', height: '20vh', background: 'radial-gradient(ellipse at bottom, rgba(0,100,30,0.5), transparent)', zIndex: 1 }} />
      <div style={{ ...s, top: 0, right: 0, width: '25vw', height: '18vh', background: 'radial-gradient(ellipse at bottom, rgba(0,100,30,0.4), transparent)', zIndex: 1 }} />
      {/* Vines */}
      <div style={{ ...s, top: 0, left: '15%', width: 4, height: '35vh', background: 'linear-gradient(180deg, #2d8c3c, #1a6b28)', zIndex: 1, borderRadius: '2px' }} />
      <div style={{ ...s, top: 0, right: '20%', width: 3, height: '28vh', background: 'linear-gradient(180deg, #2d8c3c, #1a6b28)', zIndex: 1, borderRadius: '2px' }} />
      {emoji('🌴', '3%', '20%', 45, 0.5)}
      {emoji('🌺', '85%', '30%', 30, 0.5)}
      {emoji('🎉', '90%', '50%', 28, 0.5)}
      {emoji('🦜', '10%', '15%', 30, 0.4)}
      {emoji('🌿', '75%', '10%', 25, 0.3)}
    </>),
    // 15: Lovini Lovini Sahur — Ocean Sunset
    15: () => (<>
      {/* Waves */}
      <div style={{ ...s, bottom: '56px', left: 0, right: 0, height: '30%', background: 'linear-gradient(180deg, #1565c0, #0d47a1, #0a3060)', zIndex: 1 }} />
      <div style={{ ...s, bottom: 'calc(56px + 28%)', left: 0, right: 0, height: 20, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.1))', zIndex: 1, borderRadius: '0 0 50% 50%' }} />
      {/* Sun/moon on horizon */}
      <div style={{ ...s, bottom: 'calc(56px + 28%)', left: '50%', transform: 'translate(-50%, 50%)', width: 70, height: 70, borderRadius: '50%', background: 'radial-gradient(circle, #ffd700 30%, rgba(255,150,0,0.4) 60%, transparent)', zIndex: 1 }} />
      {emoji('🌊', '10%', '62%', 30, 0.4)}
      {emoji('🌊', '70%', '65%', 25, 0.3)}
      {emoji('⭐', '15%', '10%', 20, 0.6)}
      {emoji('⭐', '80%', '8%', 15, 0.5)}
      {emoji('🌙', '85%', '5%', 30, 0.4)}
      {emoji('💫', '30%', '15%', 18, 0.4)}
      <div style={star('50%', '5%', 3)} />
      <div style={star('65%', '12%', 2)} />
    </>),
    // 16: Chiclitera Cupidini — Battle Arena
    16: () => (<>
      <div style={ground('linear-gradient(180deg, #5a1010 0%, #3a0808 100%)')} />
      {/* Broken columns */}
      <div style={{ ...s, bottom: 'calc(56px + 10%)', left: '8%', width: 25, height: '20vh', background: 'linear-gradient(180deg, #6a4040, #4a2020)', zIndex: 1, borderRadius: '4px', clipPath: 'polygon(0% 100%, 0% 0%, 60% 10%, 100% 0%, 100% 100%)' }} />
      <div style={{ ...s, bottom: 'calc(56px + 10%)', right: '10%', width: 20, height: '15vh', background: 'linear-gradient(180deg, #6a4040, #4a2020)', zIndex: 1, borderRadius: '4px' }} />
      {/* Fire on ground */}
      <div style={{ ...s, bottom: 'calc(56px + 8%)', left: '20%', width: 40, height: 50, background: 'radial-gradient(ellipse at bottom, rgba(255,100,0,0.5), transparent)', zIndex: 1 }} />
      <div style={{ ...s, bottom: 'calc(56px + 8%)', right: '25%', width: 35, height: 40, background: 'radial-gradient(ellipse at bottom, rgba(255,80,0,0.4), transparent)', zIndex: 1 }} />
      {emoji('🔥', '18%', '55%', 35, 0.6)}
      {emoji('🔥', '72%', '58%', 30, 0.5)}
      {emoji('⚔️', '50%', '8%', 40, 0.4)}
      {emoji('💀', '5%', '30%', 25, 0.3)}
      {emoji('🛡️', '88%', '35%', 28, 0.35)}
    </>),
    // 17: Noo Mio Heartini — Rainy Night
    17: () => (<>
      <div style={ground('linear-gradient(180deg, #1a2050 0%, #0d1030 100%)')} />
      {/* Rain streaks */}
      {Array.from({length: 20}).map((_, i) => (
        <div key={'rain'+i} style={{ ...s, left: (i * 5 + 2) + '%', top: 0, width: 1, height: '100%', background: 'linear-gradient(180deg, transparent, rgba(150,180,255,0.2), transparent)', zIndex: 1, animation: `float ${2 + i * 0.1}s linear infinite` }} />
      ))}
      {/* Puddle reflections */}
      <div style={{ ...s, bottom: 'calc(56px + 5%)', left: '15%', width: '20vw', height: 8, background: 'rgba(100,130,200,0.2)', borderRadius: '50%', zIndex: 1 }} />
      <div style={{ ...s, bottom: 'calc(56px + 3%)', right: '20%', width: '15vw', height: 6, background: 'rgba(100,130,200,0.15)', borderRadius: '50%', zIndex: 1 }} />
      {/* Sad clouds */}
      <div style={{ ...s, top: '5%', left: '5%', width: 150, height: 50, background: 'rgba(60,70,100,0.5)', borderRadius: '50px', zIndex: 1, filter: 'blur(3px)' }} />
      <div style={{ ...s, top: '8%', right: '10%', width: 120, height: 40, background: 'rgba(60,70,100,0.4)', borderRadius: '50px', zIndex: 1, filter: 'blur(3px)' }} />
      {emoji('💔', '50%', '10%', 30, 0.3)}
      {emoji('💧', '30%', '25%', 20, 0.4)}
      {emoji('🌧️', '70%', '5%', 35, 0.3)}
    </>),
    // 18: Cupidini Hotspottini — Volcano Throne
    18: () => (<>
      {/* Lava ground */}
      <div style={{ ...s, bottom: '56px', left: 0, right: 0, height: '25%', background: 'linear-gradient(180deg, #4a1500, #2a0a00)', zIndex: 1 }} />
      {/* Lava rivers */}
      <div style={{ ...s, bottom: 'calc(56px + 5%)', left: '10%', width: '30vw', height: 6, background: 'linear-gradient(90deg, rgba(255,100,0,0.7), rgba(255,200,0,0.5), rgba(255,100,0,0.7))', zIndex: 1, borderRadius: '3px', boxShadow: '0 0 15px rgba(255,100,0,0.4)' }} />
      <div style={{ ...s, bottom: 'calc(56px + 12%)', right: '15%', width: '25vw', height: 5, background: 'linear-gradient(90deg, rgba(255,80,0,0.6), rgba(255,180,0,0.4), rgba(255,80,0,0.6))', zIndex: 1, borderRadius: '3px', boxShadow: '0 0 12px rgba(255,80,0,0.3)' }} />
      {/* Volcanic rocks */}
      <div style={{ ...s, bottom: 'calc(56px + 20%)', left: '5%', width: 40, height: 30, background: '#3a1a00', borderRadius: '40% 40% 0 0', zIndex: 1 }} />
      <div style={{ ...s, bottom: 'calc(56px + 22%)', right: '8%', width: 35, height: 25, background: '#3a1a00', borderRadius: '40% 40% 0 0', zIndex: 1 }} />
      {/* Fire glow from below */}
      <div style={{ ...s, bottom: '56px', left: 0, right: 0, height: '15%', background: 'linear-gradient(180deg, transparent, rgba(255,100,0,0.15))', zIndex: 1 }} />
      {emoji('🔥', '5%', '45%', 40, 0.6)}
      {emoji('🔥', '90%', '50%', 35, 0.5)}
      {emoji('🌋', '15%', '15%', 40, 0.4)}
      {emoji('👑', '50%', '5%', 35, 0.5)}
      {emoji('💎', '80%', '20%', 25, 0.4)}
      {emoji('☀️', '85%', '5%', 30, 0.3)}
    </>),
  };

  const renderWorld = worlds[skinId] || worlds[0];
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>{renderWorld()}</div>;
}

// ============================================================
// MAIN APP
// ============================================================
// First-run tutorial — three quick steps for new players
// ============================================================
const TUTORIAL_STEPS = [
  {
    title: 'TAP THE CHARACTER',
    body: 'Every tap earns you coins. Tap fast for combo multipliers — up to 5×!',
    emoji: '👆',
    target: 'character',
  },
  {
    title: 'BUY UPGRADES IN THE SHOP',
    body: 'Auto-clickers earn coins for you even when you\'re not tapping. Open the SHOP tab.',
    emoji: '🛒',
    target: 'shop',
  },
  {
    title: 'SAVE YOUR PROGRESS',
    body: 'Create an account so you can come back later and play across devices.',
    emoji: '💾',
    target: 'logout',
  },
];

function TutorialOverlay({ step, onNext, onSkip }) {
  const s = TUTORIAL_STEPS[step];
  if (!s) return null;
  const isLast = step === TUTORIAL_STEPS.length - 1;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }} onClick={(e) => e.stopPropagation()}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(20,5,40,0.98), rgba(40,10,80,0.98))',
        border: '2px solid #a259ff', borderRadius: '20px', padding: '24px',
        boxShadow: '0 16px 60px rgba(162,89,255,0.5), 0 0 120px rgba(162,89,255,0.3)',
        maxWidth: '380px', width: '100%', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: '9px',
          color: '#a259ff', letterSpacing: '2px', marginBottom: '8px',
        }}>STEP {step + 1} OF {TUTORIAL_STEPS.length}</div>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>{s.emoji}</div>
        <div style={{
          fontFamily: "'Bungee Shade', cursive", fontSize: '22px',
          color: '#fff', letterSpacing: '1px', marginBottom: '10px',
          textShadow: '0 0 12px rgba(162,89,255,0.7)',
        }}>{s.title}</div>
        <div style={{
          fontFamily: "'Bangers', cursive", fontSize: '17px', color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.4, letterSpacing: '0.5px', marginBottom: '20px',
        }}>{s.body}</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onSkip} style={{
            padding: '10px 14px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,255,255,0.6)',
            fontFamily: "'Bangers', cursive", fontSize: '14px',
          }}>Skip</button>
          <button onClick={onNext} style={{
            flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #a259ff, #6a0dad)', color: '#fff',
            fontFamily: "'Bangers', cursive", fontSize: '17px', letterSpacing: '1px',
          }}>{isLast ? '🎮 LET\'S GO!' : 'NEXT →'}</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '14px' }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '24px' : '8px', height: '8px', borderRadius: '999px',
              background: i === step ? '#a259ff' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Small floating "← timur.world" link — shown on login + start screens
// so players can return to the marketing site without using browser back.
// ============================================================
function BackToSiteLink() {
  return (
    <a
      href="https://timur.world"
      style={{
        position: 'absolute', top: '14px', left: '14px', zIndex: 60,
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '999px',
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.18)',
        color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
        fontFamily: "'Press Start 2P', monospace", fontSize: '9px',
        letterSpacing: '1.5px',
      }}
    >
      ← TIMUR.WORLD
    </a>
  );
}

// ============================================================
// ADMIN EFFECT RENDERERS — triggered by admin hub
// ============================================================
function AdminCountdown({ schedule }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const i = setInterval(() => {
      const diff = new Date(schedule.scheduled_for).getTime() - Date.now();
      if (diff <= 0) { setText('STARTING NOW...'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(`${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`);
    }, 1000);
    return () => clearInterval(i);
  }, [schedule]);
  return (
    <div style={{
      position: 'absolute', top: '0', left: 0, right: 0, zIndex: 24,
      padding: '12px 20px',
      background: 'linear-gradient(135deg, rgba(162,89,255,0.95), rgba(106,13,173,0.95))',
      borderBottom: '2px solid rgba(255,255,255,0.18)',
      boxShadow: '0 4px 20px rgba(162,89,255,0.4)',
      color: '#fff', fontFamily: "'Bangers', cursive",
      fontSize: 'clamp(16px, 4vw, 22px)',
      letterSpacing: '1px', textAlign: 'center', lineHeight: 1.2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '10px', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '1.2em' }}>⚡</span>
      <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.55em', color: 'rgba(255,255,255,0.75)', letterSpacing: '2px' }}>
        ADMIN ABUSE IN
      </span>
      <span className="font-mono" style={{ fontWeight: 700, fontSize: '1.1em', color: '#fff' }}>
        {text}
      </span>
      {schedule.event_name && (
        <>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ opacity: 0.95 }}>{schedule.event_name}</span>
        </>
      )}
    </div>
  );
}

/* ==================================================================
 * DJ EFFECTS — each one a full-screen production
 * ================================================================== */

function AdminEffectDisco() {
  // Strobe color cycle, dance floor grid, multiple disco balls, beat banner
  return (<>
    {/* Strobe color wash */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, #ff00ff60, #00ffff60, #ffff0060, #ff00ff60)', backgroundSize: '400% 400%', animation: 'discoWash 1.2s linear infinite', zIndex: 15, pointerEvents: 'none', mixBlendMode: 'screen' }} />
    {/* Strobe flash */}
    <div style={{ position: 'absolute', inset: 0, background: '#fff', animation: 'discoStrobe 0.4s steps(2) infinite', zIndex: 16, pointerEvents: 'none' }} />
    {/* Dance floor squares */}
    {[...Array(20)].map((_, i) => (
      <div key={'sq'+i} style={{
        position: 'absolute', bottom: `${(i % 5) * 15}%`, left: `${(i % 4) * 25}%`,
        width: '25%', height: '15%', zIndex: 14,
        background: ['#ff00ff','#00ffff','#ffff00','#00ff00','#ff0066'][i % 5],
        opacity: 0.35, animation: `floorPulse 0.6s ease-in-out infinite`, animationDelay: `${i * 0.05}s`,
        mixBlendMode: 'overlay',
      }} />
    ))}
    {/* Multiple disco balls */}
    <div style={{ position: 'absolute', top: '5%', left: '20%', fontSize: '70px', zIndex: 17, animation: 'discoSwing 1.4s ease-in-out infinite' }}>🪩</div>
    <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', fontSize: '110px', zIndex: 17, animation: 'discoSpin 1.5s linear infinite, discoBob 2s ease-in-out infinite', filter: 'drop-shadow(0 0 30px #ff00ff)' }}>🪩</div>
    <div style={{ position: 'absolute', top: '5%', right: '20%', fontSize: '70px', zIndex: 17, animation: 'discoSwing 1.4s ease-in-out 0.3s infinite reverse' }}>🪩</div>
    {/* Banner */}
    <div style={{
      position: 'absolute', top: '14%', left: '50%', transform: 'translateX(-50%)', zIndex: 18,
      fontFamily: "'Bungee Shade', cursive", fontSize: 'clamp(22px, 6vw, 36px)', color: '#fff',
      textShadow: '0 0 18px #ff00ff, 0 0 36px #00ffff, 3px 3px 0 #000',
      letterSpacing: '3px', whiteSpace: 'nowrap',
      animation: 'discoBannerPulse 0.5s ease-in-out infinite',
    }}>🎧 DJ TIMUR ON THE DECKS 🎧</div>
    <style>{`
      @keyframes discoWash { 0% { background-position: 0% 0%; } 100% { background-position: 400% 400%; } }
      @keyframes discoStrobe { 0%, 100% { opacity: 0; } 50% { opacity: 0.18; } }
      @keyframes floorPulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.55; } }
      @keyframes discoSwing { 0%, 100% { transform: rotate(-25deg); } 50% { transform: rotate(25deg); } }
      @keyframes discoSpin { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(360deg); } }
      @keyframes discoBob { 0%, 100% { margin-top: 0; } 50% { margin-top: 20px; } }
      @keyframes discoBannerPulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.1); } }
    `}</style>
  </>);
}

function AdminEffectFireworks({ setGame }) {
  // Big shell bursts + catchable falling coin pickups (250 each)
  const colors = ['#ff3060','#ffd900','#00f0ff','#ff00ff','#33ff66','#ff7a00','#ffffff','#ff5599','#ffa500','#88ff00'];
  const [pickups, setPickups] = useState([]);
  const pickupIdRef = useRef(0);

  useEffect(() => {
    const spawn = () => {
      const newPickups = [...Array(3)].map(() => ({
        id: pickupIdRef.current++,
        x: 12 + Math.random() * 76,
        startTop: 25 + Math.random() * 30,
        born: Date.now(),
      }));
      setPickups(prev => [...prev.filter(p => Date.now() - p.born < 4500), ...newPickups]);
    };
    spawn();
    const i = setInterval(spawn, 2200);
    return () => clearInterval(i);
  }, []);

  const grab = (id) => {
    setGame(prev => ({ ...prev, points: prev.points + 250, lifetimePoints: prev.lifetimePoints + 250 }));
    setPickups(prev => prev.filter(p => p.id !== id));
  };
  // 8 burst sites — each gets a launching shell + bigger explosion
  const shells = [...Array(8)].map((_, i) => ({
    x: 10 + (i * 11) % 80,
    yEnd: 20 + (i % 4) * 15, // 20%, 35%, 50%, 65% from bottom
    color: colors[i % colors.length],
    altColor: colors[(i + 3) % colors.length],
    delay: (i * 0.5) % 4,
    big: i % 3 === 0, // every 3rd burst is a big shell
  }));
  return (<>
    {/* Night sky */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,40,0.6), rgba(0,0,20,0.3))', zIndex: 13, pointerEvents: 'none' }} />
    {/* Star twinkles in background */}
    {[...Array(40)].map((_, i) => (
      <div key={'st'+i} style={{
        position: 'absolute', top: `${(i * 7) % 80}%`, left: `${(i * 11) % 100}%`,
        width: 2, height: 2, borderRadius: '50%', background: '#fff',
        boxShadow: '0 0 4px #fff', zIndex: 13,
        animation: `starTwinkle ${2 + (i % 3)}s ease-in-out ${(i * 0.1) % 2}s infinite`,
      }} />
    ))}
    {/* Launching shells — bright trailing fireball */}
    {shells.map((s, i) => (
      <div key={'shell'+i} style={{
        position: 'absolute', bottom: 0, left: `${s.x}%`,
        width: s.big ? 28 : 22, height: s.big ? 28 : 22, borderRadius: '50%',
        background: `radial-gradient(circle, #fff 20%, ${s.color} 60%, transparent)`,
        boxShadow: `0 0 30px ${s.color}, 0 0 60px ${s.color}, 0 12px 40px ${s.color}`,
        zIndex: 16, transform: 'translateX(-50%)',
        animation: `fwLaunch 1.5s ease-out ${s.delay}s infinite`,
        ['--yEnd']: `${s.yEnd}%`,
      }} />
    ))}
    {/* Burst flash — huge bright disc when shell explodes */}
    {shells.map((s, i) => (
      <div key={'flash'+i} style={{
        position: 'absolute', bottom: `${s.yEnd}%`, left: `${s.x}%`,
        width: s.big ? 200 : 140, height: s.big ? 200 : 140, borderRadius: '50%',
        background: `radial-gradient(circle, #fff 0%, ${s.color}dd 30%, transparent 70%)`,
        zIndex: 17, opacity: 0, transform: 'translate(-50%, 50%)',
        animation: `fwFlash 0.6s ease-out ${s.delay + 1.5}s infinite`,
      }} />
    ))}
    {/* Burst sparks — large glowing particles flying outward */}
    {shells.flatMap((s, i) => {
      const numSparks = s.big ? 28 : 20;
      const dist = s.big ? 480 : 340;
      return [...Array(numSparks)].map((_, j) => {
        const ang = (j / numSparks) * 360 + (i * 7);
        const sparkColor = j % 3 === 0 ? s.altColor : s.color;
        const sz = s.big ? 30 + (j % 3) * 6 : 22 + (j % 3) * 4;
        return (
          <div key={`sp${i}-${j}`} style={{
            position: 'absolute', bottom: `${s.yEnd}%`, left: `${s.x}%`,
            width: sz, height: sz, borderRadius: '50%',
            background: `radial-gradient(circle, #fff 0%, ${sparkColor} 45%, transparent 80%)`,
            boxShadow: `0 0 24px ${sparkColor}, 0 0 48px ${sparkColor}, 0 0 80px ${sparkColor}66`,
            zIndex: 18, opacity: 0, transform: 'translate(-50%, 50%)',
            animation: `fwBurst 2s cubic-bezier(0.2, 0.8, 0.4, 1) ${s.delay + 1.5}s infinite`,
            ['--ang']: `${ang}deg`,
            ['--dist']: `${dist + (j % 4) * 80}px`,
          }} />
        );
      });
    })}
    {/* Trail sparkles — bigger falling embers after burst */}
    {shells.flatMap((s, i) => [...Array(10)].map((_, j) => (
      <div key={`tr${i}-${j}`} style={{
        position: 'absolute', bottom: `${s.yEnd}%`, left: `${s.x + (j - 5) * 5}%`,
        width: 10, height: 10, borderRadius: '50%',
        background: `radial-gradient(circle, #fff 0%, ${s.color} 60%, transparent)`,
        boxShadow: `0 0 16px ${s.color}, 0 0 32px ${s.color}`,
        zIndex: 17, opacity: 0,
        animation: `fwTrail 2.4s ease-in ${s.delay + 1.7}s infinite`,
      }} />
    )))}
    {/* Catchable coin pickups — drift down, tap to claim +250 */}
    {pickups.map(p => (
      <div key={p.id} onClick={() => grab(p.id)} style={{
        position: 'absolute', top: `${p.startTop}%`, left: `${p.x}%`,
        fontSize: 44, zIndex: 19,
        pointerEvents: 'auto', cursor: 'pointer',
        animation: 'pickupFall 4.5s ease-in forwards',
        filter: 'drop-shadow(0 0 18px #ffd700) drop-shadow(0 0 32px #ff9500)',
        transform: 'translate(-50%, 0)',
      }}>🪙</div>
    ))}
    {/* Banner */}
    <div style={{
      position: 'absolute', top: '11%', left: '50%', transform: 'translateX(-50%)', zIndex: 22,
      fontFamily: "'Bungee Shade', cursive", fontSize: 'clamp(26px, 6.5vw, 40px)', color: '#fff',
      textShadow: '0 0 18px #ffd900, 0 0 40px #ff3060, 0 0 60px #ff00ff, 4px 4px 0 #000',
      letterSpacing: '3px', whiteSpace: 'nowrap',
      animation: 'fwBannerPulse 1.6s ease-in-out infinite',
    }}>🎆 FIREWORKS SHOW 🎆</div>
    <style>{`
      @keyframes starTwinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      @keyframes fwLaunch {
        0% { bottom: 0; opacity: 1; transform: translateX(-50%) scale(1); }
        80% { bottom: var(--yEnd); opacity: 1; transform: translateX(-50%) scale(1.2); }
        82% { opacity: 0; transform: translateX(-50%) scale(2); }
        100% { opacity: 0; }
      }
      @keyframes fwFlash {
        0% { opacity: 1; transform: translate(-50%, 50%) scale(0.4); }
        100% { opacity: 0; transform: translate(-50%, 50%) scale(2); }
      }
      @keyframes fwBurst {
        0% { opacity: 1; transform: translate(-50%, 50%) rotate(var(--ang)) translateY(0) scale(1.4); }
        70% { opacity: 1; transform: translate(-50%, 50%) rotate(var(--ang)) translateY(calc(-1 * var(--dist))) scale(1); }
        100% { opacity: 0; transform: translate(-50%, 50%) rotate(var(--ang)) translateY(calc(-1 * var(--dist) - 40px)) scale(0.3); }
      }
      @keyframes fwTrail {
        0% { opacity: 1; transform: translate(-50%, 50%); }
        100% { opacity: 0; transform: translate(-50%, calc(50% + 220px)); }
      }
      @keyframes fwBannerPulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.08); } }
      @keyframes pickupFall {
        0% { opacity: 0; transform: translate(-50%, 0) scale(0.6) rotate(0deg); }
        15% { opacity: 1; transform: translate(-50%, 20px) scale(1) rotate(60deg); }
        90% { opacity: 1; transform: translate(-50%, 60vh) scale(1) rotate(720deg); }
        100% { opacity: 0; transform: translate(-50%, 70vh) scale(0.5) rotate(800deg); }
      }
    `}</style>
  </>);
}

function AdminEffectPoop() {
  // Heavy storm: 60 poops in 3 size tiers, brown haze, splat counter
  return (<>
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, rgba(80,45,15,0.45), transparent 60%)', zIndex: 13, pointerEvents: 'none' }} />
    {[...Array(60)].map((_, i) => {
      const tier = i % 3; // 0 small, 1 mid, 2 huge
      const size = tier === 2 ? 56 : tier === 1 ? 36 : 22;
      const dur = 1.4 + (i % 5) * 0.4;
      const rot = (i % 2 === 0 ? '+' : '-') + (90 + (i % 5) * 80);
      return (
        <div key={i} style={{
          position: 'absolute', top: -60, left: `${(i * 3.7) % 100}%`,
          fontSize: `${size}px`, zIndex: 15,
          animation: `poopFall${tier} ${dur}s linear ${(i * 0.1) % 3}s infinite`,
          ['--rot']: `${rot}deg`,
          filter: tier === 2 ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' : 'none',
        }}>💩</div>
      );
    })}
    <div style={{
      position: 'absolute', top: '13%', left: '50%', transform: 'translateX(-50%)', zIndex: 18,
      fontFamily: "'Bungee Shade', cursive", fontSize: 'clamp(22px, 5.5vw, 32px)', color: '#fff',
      textShadow: '0 0 18px #8b5a2b, 0 0 36px #5a3a18, 3px 3px 0 #000',
      letterSpacing: '2px', whiteSpace: 'nowrap',
    }}>💩 POOP STORM 💩</div>
    <style>{`
      @keyframes poopFall0 { 0% { top: -60px; transform: rotate(0deg); } 100% { top: 110%; transform: rotate(var(--rot)); } }
      @keyframes poopFall1 { 0% { top: -60px; transform: rotate(0deg) scale(1); } 100% { top: 110%; transform: rotate(var(--rot)) scale(1); } }
      @keyframes poopFall2 { 0% { top: -60px; transform: rotate(0deg) scale(1); } 100% { top: 110%; transform: rotate(var(--rot)) scale(1.05); } }
    `}</style>
  </>);
}

function AdminEffectRocket() {
  // 5 rockets launch from bottom of screen straight up using translateY
  return (<>
    {/* Screen shake wrapper */}
    <div style={{ position: 'absolute', inset: 0, animation: 'rocketShake 0.18s linear infinite', zIndex: 19, pointerEvents: 'none' }}>
      {/* Rockets — anchored at bottom: 0, translateY moves them upward */}
      {[...Array(5)].map((_, i) => (
        <div key={'r'+i} style={{
          position: 'absolute', bottom: 0, left: `${15 + i * 18}%`,
          fontSize: 'clamp(60px, 12vw, 100px)', zIndex: 20,
          animation: `rocketLiftOff 2.4s ease-in ${i * 0.4}s infinite`,
          filter: 'drop-shadow(0 0 16px #ff6a00)',
          transformOrigin: 'center bottom',
        }}>🚀</div>
      ))}
      {/* Smoke puffs — stay near launch pad, expand and fade */}
      {[...Array(20)].map((_, i) => {
        const lane = i % 5;
        return (
          <div key={'s'+i} style={{
            position: 'absolute', bottom: 0, left: `${17 + lane * 18}%`,
            fontSize: 32, zIndex: 18, opacity: 0,
            animation: `smokePoof 1.6s ease-out ${lane * 0.4 + (Math.floor(i / 5)) * 0.2}s infinite`,
          }}>💨</div>
        );
      })}
      {/* Exhaust flames trailing each rocket */}
      {[...Array(5)].map((_, i) => (
        <div key={'f'+i} style={{
          position: 'absolute', bottom: 0, left: `${15 + i * 18}%`,
          fontSize: 'clamp(40px, 8vw, 64px)', zIndex: 19,
          animation: `rocketFlame 2.4s ease-in ${i * 0.4}s infinite`,
        }}>🔥</div>
      ))}
    </div>
    {/* Banner */}
    <div style={{
      position: 'absolute', top: '13%', left: '50%', transform: 'translateX(-50%)', zIndex: 22,
      fontFamily: "'Bungee Shade', cursive", fontSize: 'clamp(22px, 5.5vw, 32px)', color: '#fff',
      textShadow: '0 0 18px #ff6a00, 0 0 36px #ffd900, 3px 3px 0 #000',
      letterSpacing: '2px', whiteSpace: 'nowrap',
      animation: 'rocketBannerShake 0.18s linear infinite',
    }}>🚀 LIFT OFF 🚀</div>
    <style>{`
      @keyframes rocketLiftOff {
        0% { transform: translateY(0); opacity: 1; }
        15% { transform: translateY(-30px); opacity: 1; }
        100% { transform: translateY(calc(-100vh - 200px)); opacity: 0.85; }
      }
      @keyframes rocketFlame {
        0% { transform: translateY(20px) scale(0.6); opacity: 0; }
        15% { transform: translateY(0) scale(1.1); opacity: 1; }
        100% { transform: translateY(calc(-100vh - 100px)) scale(0.4); opacity: 0; }
      }
      @keyframes smokePoof {
        0% { transform: translateY(0) scale(0.4); opacity: 0; }
        20% { transform: translateY(-10px) scale(1); opacity: 0.9; }
        100% { transform: translateY(-40px) scale(2.5); opacity: 0; }
      }
      @keyframes rocketShake {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(-2px, 1px); }
        50% { transform: translate(2px, -1px); }
        75% { transform: translate(-1px, 2px); }
      }
      @keyframes rocketBannerShake {
        0%, 100% { transform: translateX(-50%); }
        50% { transform: translateX(calc(-50% + 2px)) translateY(-1px); }
      }
    `}</style>
  </>);
}

function AdminEffectCats({ setGame }) {
  // Cats in waves, varying sizes, bouncing — TAP to catch for +500 coins
  const [caught, setCaught] = useState(new Set());
  const [popups, setPopups] = useState([]);
  const popupIdRef = useRef(0);

  const catchCat = (e, i) => {
    e.stopPropagation();
    if (caught.has(i)) return;
    setGame(prev => ({ ...prev, points: prev.points + 500, lifetimePoints: prev.lifetimePoints + 500 }));
    setCaught(s => new Set([...s, i]));
    // +500 popup at click point
    const pid = popupIdRef.current++;
    const r = e.currentTarget.getBoundingClientRect();
    setPopups(prev => [...prev, { id: pid, x: r.left + r.width / 2, y: r.top }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== pid)), 900);
    // Cat respawns after 1.5s so the rave keeps moving
    setTimeout(() => setCaught(s => { const n = new Set(s); n.delete(i); return n; }), 1500);
  };

  return (<>
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, rgba(255,105,180,0.2))', animation: 'discoWash 2s linear infinite', backgroundSize: '400% 400%', zIndex: 13, pointerEvents: 'none' }} />
    {[...Array(16)].map((_, i) => {
      if (caught.has(i)) return null;
      const tier = i % 3;
      const size = tier === 2 ? 80 : tier === 1 ? 56 : 38;
      const top = 6 + ((i * 7) % 80);
      const dir = i % 2; // 0 left→right, 1 right→left
      return (
        <div key={i} onClick={(e) => catchCat(e, i)} style={{
          position: 'absolute', top: `${top}%`, left: dir ? 'auto' : '-80px', right: dir ? '-80px' : 'auto',
          fontSize: `${size}px`, zIndex: 15,
          animation: `${dir ? 'catZoomR' : 'catZoomL'} ${2.5 + (i % 3) * 0.7}s linear ${i * 0.2}s infinite, catBounce 0.4s ease-in-out infinite`,
          filter: `hue-rotate(${i * 30}deg) drop-shadow(0 0 8px rgba(255,105,180,0.6))`,
          pointerEvents: 'auto', cursor: 'pointer',
        }}>🐱</div>
      );
    })}
    {/* +500 popups when cats are caught — fixed position so they appear wherever clicked */}
    {popups.map(p => (
      <div key={p.id} style={{
        position: 'fixed', top: p.y, left: p.x, zIndex: 30,
        fontFamily: "'Bungee Shade', cursive", fontSize: '24px', color: '#ffd700',
        textShadow: '0 0 12px #ff69b4, 2px 2px 0 #000', pointerEvents: 'none',
        animation: 'catCatchPop 0.9s ease-out forwards',
        transform: 'translate(-50%, -50%)',
      }}>+500</div>
    ))}
    {/* MEOW bubbles */}
    {[...Array(8)].map((_, i) => (
      <div key={'m'+i} style={{
        position: 'absolute', top: `${10 + (i * 11) % 70}%`, left: `${(i * 13) % 90}%`,
        fontFamily: "'Bangers', cursive", fontSize: '22px', color: '#fff',
        textShadow: '0 0 8px #ff69b4, 2px 2px 0 #000',
        zIndex: 16, opacity: 0,
        animation: `meowBubble 1.8s ease-out ${i * 0.4}s infinite`,
      }}>MEOW!</div>
    ))}
    <div style={{
      position: 'absolute', top: '13%', left: '50%', transform: 'translateX(-50%)', zIndex: 18,
      fontFamily: "'Bungee Shade', cursive", fontSize: 'clamp(22px, 5.5vw, 32px)', color: '#fff',
      textShadow: '0 0 18px #ff69b4, 0 0 36px #ff00ff, 3px 3px 0 #000',
      letterSpacing: '2px', whiteSpace: 'nowrap',
    }}>🐱 CAT RAVE 🐱</div>
    <style>{`
      @keyframes catZoomL { 0% { left: -80px; } 100% { left: calc(100% + 80px); } }
      @keyframes catZoomR { 0% { right: -80px; } 100% { right: calc(100% + 80px); } }
      @keyframes catBounce { 0%, 100% { margin-top: 0; } 50% { margin-top: -16px; } }
      @keyframes meowBubble { 0% { opacity: 0; transform: scale(0.5); } 30% { opacity: 1; transform: scale(1.2); } 70% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.8) translateY(-30px); } }
      @keyframes catCatchPop { 0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); } 30% { opacity: 1; transform: translate(-50%, -80%) scale(1.4); } 100% { opacity: 0; transform: translate(-50%, -160%) scale(1); } }
    `}</style>
  </>);
}

function AdminEffectTsunami({ setGame }) {
  useEffect(() => {
    const i = setInterval(() => setGame(prev => ({ ...prev, points: prev.points + 100, lifetimePoints: prev.lifetimePoints + 100 })), 300);
    return () => clearInterval(i);
  }, [setGame]);
  return (<>
    {/* Blue overlay */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,80,180,0.15), rgba(0,150,220,0.45))', zIndex: 13, pointerEvents: 'none' }} />
    {/* Wave layers */}
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', background: 'linear-gradient(180deg, transparent, #0066cc88, #003e7fdd)', animation: 'tsuWave1 2.5s ease-in-out infinite', zIndex: 14 }} />
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, transparent, #00b4ff66, #0080dd99)', animation: 'tsuWave2 2s ease-in-out infinite', zIndex: 14 }} />
    {/* Coin wave — 50 coins */}
    {[...Array(50)].map((_, i) => (
      <div key={i} style={{
        position: 'absolute', bottom: `-10%`, left: `${(i * 2.1) % 100}%`,
        fontSize: 16 + (i % 4) * 8, zIndex: 16,
        animation: `coinFloat ${1.2 + (i % 5) * 0.4}s ease-out ${(i * 0.06) % 2}s infinite`,
        filter: 'drop-shadow(0 0 8px #ffd700)',
      }}>🪙</div>
    ))}
    {/* +100 floaters */}
    {[...Array(8)].map((_, i) => (
      <div key={'p'+i} style={{
        position: 'absolute', bottom: '40%', left: `${10 + i * 11}%`,
        fontFamily: "'Bungee Shade', cursive", fontSize: 'clamp(16px, 4vw, 22px)', color: '#ffd700',
        textShadow: '0 0 10px #ff9500, 2px 2px 0 #000', zIndex: 17, opacity: 0,
        animation: `coinScore 1.5s ease-out ${i * 0.3}s infinite`,
      }}>+100</div>
    ))}
    <div style={{
      position: 'absolute', top: '13%', left: '50%', transform: 'translateX(-50%)', zIndex: 18,
      fontFamily: "'Bungee Shade', cursive", fontSize: 'clamp(22px, 5.5vw, 32px)', color: '#fff',
      textShadow: '0 0 18px #00d4ff, 0 0 36px #0066cc, 3px 3px 0 #000',
      letterSpacing: '2px', whiteSpace: 'nowrap',
    }}>🌊 COIN TSUNAMI 🌊</div>
    <style>{`
      @keyframes tsuWave1 { 0%, 100% { transform: translateY(20px) skewX(-2deg); } 50% { transform: translateY(-15px) skewX(2deg); } }
      @keyframes tsuWave2 { 0%, 100% { transform: translateY(-10px) skewX(2deg); } 50% { transform: translateY(15px) skewX(-2deg); } }
      @keyframes coinFloat {
        0% { bottom: -10%; opacity: 1; transform: scale(0.7) rotate(0deg); }
        100% { bottom: 110%; opacity: 0; transform: scale(1.2) rotate(720deg); }
      }
      @keyframes coinScore {
        0% { opacity: 0; transform: translateY(0) scale(0.5); }
        20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
        100% { opacity: 0; transform: translateY(-120px) scale(0.8); }
      }
    `}</style>
  </>);
}

function AdminEffectLightning() {
  // CSS bolts, flash cycle, "THUNDER" text, dark/bright extremes
  return (<>
    {/* Dark sky */}
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,30,0.55)', zIndex: 13, pointerEvents: 'none' }} />
    {/* Strobe flash */}
    <div style={{ position: 'absolute', inset: 0, background: '#ffffd9', zIndex: 14, pointerEvents: 'none', animation: 'thunderFlash 1.5s steps(2) infinite' }} />
    {/* CSS lightning bolts (zigzag lines) */}
    {[...Array(7)].map((_, i) => {
      const x = 5 + (i * 14) % 90;
      const delay = (i * 0.22) % 1.6;
      return (
        <div key={'b'+i} style={{
          position: 'absolute', top: 0, left: `${x}%`,
          width: 6, height: '100%',
          background: 'linear-gradient(180deg, transparent, #fff700 5%, #fff 30%, #fff700 60%, transparent)',
          filter: 'drop-shadow(0 0 12px #fff700) drop-shadow(0 0 24px #fff)',
          zIndex: 15, opacity: 0, transformOrigin: 'top',
          animation: `boltStrike 1.6s ease-in ${delay}s infinite`,
          clipPath: 'polygon(50% 0, 75% 30%, 30% 50%, 70% 65%, 25% 100%, 50% 70%, 80% 50%, 35% 35%)',
        }} />
      );
    })}
    {/* Extra lightning emojis */}
    {[...Array(5)].map((_, i) => (
      <div key={i} style={{
        position: 'absolute', top: `${5 + i * 18}%`, left: `${10 + (i * 20) % 80}%`,
        fontSize: 'clamp(50px, 10vw, 80px)', zIndex: 16,
        animation: `lightStrike 1s ease-out ${i * 0.3}s infinite`,
        filter: 'drop-shadow(0 0 20px #fff700)',
      }}>⚡</div>
    ))}
    <div style={{
      position: 'absolute', top: '13%', left: '50%', transform: 'translateX(-50%)', zIndex: 18,
      fontFamily: "'Bungee Shade', cursive", fontSize: 'clamp(22px, 5.5vw, 32px)', color: '#fff700',
      textShadow: '0 0 18px #fff700, 0 0 36px #fff, 3px 3px 0 #000',
      letterSpacing: '2px', whiteSpace: 'nowrap',
      animation: 'lightStrike 1s ease-out infinite',
    }}>⚡ THUNDER STRIKES ⚡</div>
    <style>{`
      @keyframes thunderFlash { 0%, 100% { opacity: 0; } 50% { opacity: 0.35; } }
      @keyframes boltStrike {
        0%, 100% { opacity: 0; transform: scaleY(0.5); }
        15% { opacity: 1; transform: scaleY(1); }
        25% { opacity: 0.4; }
        35% { opacity: 1; transform: scaleY(1); }
        45% { opacity: 0; }
      }
      @keyframes lightStrike { 0%, 100% { opacity: 0; transform: scale(0.6); } 50% { opacity: 1; transform: scale(1.4); } }
    `}</style>
  </>);
}

function AdminEffectBomb({ setGame }) {
  // Big explosion ring + character shrapnel + repeating — each boom gives +1000 coins
  useEffect(() => {
    const give = () => setGame(prev => ({ ...prev, points: prev.points + 1000, lifetimePoints: prev.lifetimePoints + 1000 }));
    give(); // first boom on activation
    const i = setInterval(give, 2400); // matches visual loop
    return () => clearInterval(i);
  }, [setGame]);
  const chars = ['01_noobini_lovini','02_la_romantic_grande','03_lovini_lovini_lovini','04_teddy_and_rosie','05_noobini_partini','06_cakini_and_presintini','07_lovin_rose','08_heartini_smilekur','09_dragon_partyini'];
  return (<>
    {/* Sky darken */}
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 13, pointerEvents: 'none', animation: 'bombFlash 2.4s ease-out infinite' }} />
    {/* Expanding ring */}
    <div style={{
      position: 'absolute', top: '45%', left: '50%', zIndex: 14,
      width: '20px', height: '20px', borderRadius: '50%',
      background: 'radial-gradient(circle, #fff 0%, #ffd700 30%, #ff4400 60%, transparent 80%)',
      animation: 'bombRing 2.4s ease-out infinite',
      transform: 'translate(-50%, -50%)',
    }} />
    {/* Shockwave ring 2 */}
    <div style={{
      position: 'absolute', top: '45%', left: '50%', zIndex: 14,
      width: '20px', height: '20px', borderRadius: '50%',
      border: '4px solid #fff', boxShadow: '0 0 30px #ffd700',
      animation: 'bombShock 2.4s ease-out infinite',
      transform: 'translate(-50%, -50%)',
    }} />
    {/* BOOM text */}
    <div style={{
      position: 'absolute', top: '40%', left: '50%', zIndex: 21,
      fontFamily: "'Bungee Shade', cursive", fontSize: 'clamp(60px, 18vw, 140px)',
      color: '#fff',
      textShadow: '0 0 20px #ff4400, 0 0 40px #ff0000, 0 0 60px #ffd700, 6px 6px 0 #000',
      letterSpacing: '4px', opacity: 0,
      animation: 'boomText 2.4s ease-out infinite',
      transform: 'translate(-50%, -50%)',
      whiteSpace: 'nowrap', pointerEvents: 'none',
    }}>BOOM!</div>
    {/* Character shrapnel */}
    {chars.map((c, i) => {
      const angle = (i / chars.length) * 360;
      return (
        <img key={c} src={`/characters/${c}.png`} alt="" style={{
          position: 'absolute', top: '45%', left: '50%', width: 80, height: 80, zIndex: 20,
          animation: `bombExplode 2.4s ease-out infinite`,
          ['--ang']: `${angle}deg`,
          filter: 'drop-shadow(0 0 12px #ff4400)',
        }} />
      );
    })}
    <style>{`
      @keyframes bombFlash { 0% { background: rgba(255,255,255,0.95); } 12% { background: rgba(255,200,50,0.6); } 30%, 100% { background: rgba(0,0,0,0.4); } }
      @keyframes bombRing { 0% { width: 20px; height: 20px; opacity: 1; } 100% { width: 200vmax; height: 200vmax; opacity: 0; } }
      @keyframes bombShock { 0% { width: 20px; height: 20px; opacity: 1; } 100% { width: 180vmax; height: 180vmax; opacity: 0; border-width: 1px; } }
      @keyframes boomText { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(-15deg); } 15% { opacity: 1; transform: translate(-50%, -50%) scale(1.3) rotate(0deg); } 60% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); } }
      @keyframes bombExplode {
        0% { transform: translate(-50%, -50%) rotate(var(--ang)) translateY(0) rotate(calc(-1 * var(--ang))); opacity: 1; }
        100% { transform: translate(-50%, -50%) rotate(var(--ang)) translateY(-700px) rotate(calc(-1 * var(--ang) + 1080deg)) scale(0.4); opacity: 0; }
      }
    `}</style>
  </>);
}

function AdminEffectCrowd() {
  // Stadium lights, marquee text, floating emojis going UP, roar
  const emojis = ['🎉','🥳','🎊','👏','🙌','🎤','🔥','🌟','💚'];
  return (<>
    {/* Green stadium glow */}
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, rgba(0,232,122,0.4), transparent 70%)', zIndex: 13, pointerEvents: 'none' }} />
    {/* Stadium lights — sweeping spotlights from the sides */}
    {[...Array(4)].map((_, i) => (
      <div key={'sl'+i} style={{
        position: 'absolute', top: '-10%', left: i < 2 ? `${i * 15}%` : 'auto', right: i >= 2 ? `${(i - 2) * 15}%` : 'auto',
        width: '4px', height: '140%', zIndex: 14,
        background: 'linear-gradient(180deg, rgba(255,255,200,0.9), transparent)',
        boxShadow: '0 0 60px rgba(255,255,150,0.6)',
        transformOrigin: 'top center',
        animation: `spotSweep ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite alternate`,
      }} />
    ))}
    {/* Floating crowd emojis going UP */}
    {[...Array(40)].map((_, i) => (
      <div key={i} style={{
        position: 'absolute', bottom: -60, left: `${(i * 2.6) % 100}%`,
        fontSize: `${28 + (i % 4) * 8}px`, zIndex: 15,
        animation: `crowdRise ${2.5 + (i % 4) * 0.7}s ease-out ${(i * 0.08) % 3}s infinite`,
      }}>{emojis[i % emojis.length]}</div>
    ))}
    {/* Hands raising */}
    {[...Array(8)].map((_, i) => (
      <div key={'h'+i} style={{
        position: 'absolute', bottom: '0%', left: `${5 + i * 11}%`,
        fontSize: '50px', zIndex: 16,
        animation: `handsUp ${0.6 + (i % 3) * 0.2}s ease-in-out ${i * 0.1}s infinite alternate`,
      }}>🙌</div>
    ))}
    {/* Pulsing main text */}
    <div style={{
      position: 'absolute', top: '20%', left: 0, right: 0, textAlign: 'center', zIndex: 20,
      fontSize: 'clamp(28px, 8vw, 56px)', fontWeight: 900, color: '#fff',
      textShadow: '0 0 25px #00e87a, 0 0 50px #00e87a, 4px 4px 0 #000',
      animation: 'crowdPulse 0.45s ease-in-out infinite',
      fontFamily: "'Bungee Shade', cursive", letterSpacing: '4px', lineHeight: 1.1,
    }}>THE CROWD<br/>GOES WILD</div>
    <style>{`
      @keyframes spotSweep { 0% { transform: rotate(-30deg); } 100% { transform: rotate(30deg); } }
      @keyframes crowdRise {
        0% { bottom: -60px; opacity: 0; transform: rotate(0deg); }
        15% { opacity: 1; }
        100% { bottom: 110%; opacity: 0; transform: rotate(360deg); }
      }
      @keyframes handsUp {
        0% { transform: translateY(20px); }
        100% { transform: translateY(-20px); }
      }
      @keyframes crowdPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
    `}</style>
  </>);
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('login'); // login, start, game, reflex
  const [game, setGame] = useState(loadGame);
  const [player, setPlayer] = useState(null); // { id, username }
  const [loginError, setLoginError] = useState('');
  const [loginMode, setLoginMode] = useState('login'); // login, register
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [cloudLeaderboard, setCloudLeaderboard] = useState([]);
  const [adminEvent, setAdminEvent] = useState({ active: false, name: '' });
  const [adminEffects, setAdminEffects] = useState({}); // { effectId: bool }
  const adminEffectsRef = useRef({});
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(null); // null | 0 | 1 | 2
  const [adminMessage, setAdminMessage] = useState(null); // { text, id }
  const [adminSchedule, setAdminSchedule] = useState(null); // { event_name, scheduled_for }
  const [adminVote, setAdminVote] = useState(null); // { id, question, ends_at }
  const [votedOn, setVotedOn] = useState({}); // { voteId: true }
  const [particles, setParticles] = useState([]);
  const [popups, setPopups] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [goldenBrain, setGoldenBrain] = useState(null);
  const [activeEffect, setActiveEffect] = useState(null);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(null);
  const [newsIdx, setNewsIdx] = useState(0);
  const [skinCelebration, setSkinCelebration] = useState(null);
  const [coinCelebration, setCoinCelebration] = useState(null);
  const [skinGiftCelebration, setSkinGiftCelebration] = useState(null);
  const [achievementToast, setAchievementToast] = useState(null);
  const [storyPopup, setStoryPopup] = useState(null);
  const [offlineReward, setOfflineReward] = useState(null);
  const [dailyReward, setDailyReward] = useState(null);
  const [codeResult, setCodeResult] = useState(null);
  const [ascendConfirm, setAscendConfirm] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopTab, setShopTab] = useState('auto');
  const [reflexGame, setReflexGame] = useState(null);
  const [weatherAnim, setWeatherAnim] = useState(0);
  const [lightningFlash, setLightningFlash] = useState(false);
  const [floatingEmotes, setFloatingEmotes] = useState([]);

  const gameRef = useRef(game);
  const comboRef = useRef(0);
  const lastTapRef = useRef(0);
  const tapsInWindowRef = useRef([]);
  const particleIdRef = useRef(0);
  const goldenTimerRef = useRef(null);
  const cpsIntervalRef = useRef(null);
  const lastEmoteAt = useRef(0);
  const emoteChannelRef = useRef(null);
  const emoteIdRef = useRef(0);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { comboRef.current = combo; }, [combo]);

  // Calculate derived values
  const calcCPS = useCallback((g) => {
    let cps = g.bonusCps || 0;
    AUTO_CLICKERS.forEach(ac => {
      const owned = g.autoClickers[ac.id] || 0;
      let rate = ac.cps * owned;
      if (g.efficiencyUpgrades.includes(ac.id)) rate *= 2;
      cps += rate;
    });
    // Synergies
    const hasMini5 = (g.autoClickers['ac1'] || 0) >= 5;
    const hasTurbo5 = (g.autoClickers['ac2'] || 0) >= 5;
    const hasMega3 = (g.autoClickers['ac3'] || 0) >= 3;
    const hasSigma3 = (g.autoClickers['ac4'] || 0) >= 3;
    const hasOneEach = AUTO_CLICKERS.every(ac => (g.autoClickers[ac.id] || 0) >= 1);
    const hasTapAndIdle = TAP_UPGRADES.some(t => (g.tapUpgrades[t.id] || 0) > 0) && AUTO_CLICKERS.some(a => (g.autoClickers[a.id] || 0) > 0);
    const has6Skins = g.unlockedSkins.length >= 6;

    let mult = 1;
    if (hasMini5 && hasTurbo5) mult += 0.2;
    if (hasMega3 && hasSigma3) mult += 0.5;
    if (hasOneEach) mult += 1.0;
    if (hasTapAndIdle) mult += 0.1;
    if (has6Skins) mult += 0.25;

    cps *= mult;
    // Brain cell bonus
    cps *= (1 + g.brainCells * 0.05);
    // Seasonal bonus
    cps *= (1 + getSeasonalBonus());
    // Skin multiplier
    const skin = CHARACTERS[g.equippedSkin] || CHARACTERS[0];
    cps *= skin.mult;
    // Admin DJ effect: rocket = 3× CPS while active
    if (adminEffectsRef.current?.rocket) cps *= 3;
    return cps;
  }, []);

  const calcTapPower = useCallback((g) => {
    let power = 1;
    TAP_UPGRADES.forEach(t => {
      power += t.power * (g.tapUpgrades[t.id] || 0);
    });
    power *= (1 + g.brainCells * 0.05);
    // Synergy: tap & idle
    const hasTapAndIdle = TAP_UPGRADES.some(t => (g.tapUpgrades[t.id] || 0) > 0) && AUTO_CLICKERS.some(a => (g.autoClickers[a.id] || 0) > 0);
    if (hasTapAndIdle) power *= 1.1;
    // Skin multiplier
    const skin = CHARACTERS[g.equippedSkin] || CHARACTERS[0];
    power *= skin.mult;
    return Math.floor(power);
  }, []);

  const cps = calcCPS(game);
  const tapPower = calcTapPower(game);
  const weather = getWeather(game.lifetimePoints);

  // Synergy status
  const synergies = [
    { name: 'Speed Duo', desc: '5 Mini + 5 Turbo = +20% CPS', hint: 'Buy Mini Clickers and Turbo Taps', active: (game.autoClickers['ac1'] || 0) >= 5 && (game.autoClickers['ac2'] || 0) >= 5 },
    { name: 'Brain Trust', desc: '3 Mega + 3 Sigma = +50% CPS', hint: 'Buy Mega Brains and Sigma Modes', active: (game.autoClickers['ac3'] || 0) >= 3 && (game.autoClickers['ac4'] || 0) >= 3 },
    { name: 'Money Moves', desc: '1 of everything = +100% CPS', hint: 'Own every auto-clicker type', active: AUTO_CLICKERS.every(ac => (game.autoClickers[ac.id] || 0) >= 1) },
    { name: 'Tap & Idle', desc: 'Tap + Auto = +10% both', hint: 'Buy a tap upgrade and an auto-clicker', active: TAP_UPGRADES.some(t => (game.tapUpgrades[t.id] || 0) > 0) && AUTO_CLICKERS.some(a => (game.autoClickers[a.id] || 0) > 0) },
    { name: 'Collector Bonus', desc: '6+ skins = +25% CPS', hint: 'Unlock 6 skins', active: game.unlockedSkins.length >= 6 },
  ];

  // Check for saved login on mount
  useEffect(() => {
    const saved = localStorage.getItem('brainrot_player');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setPlayer(p);
        setLoginUsername(p.username);
        loadGameCloud(p.id).then(res => {
          if (res.save) {
            // Use whichever has higher lifetime points — cloud or local
            const localGame = loadGame();
            const cloudPoints = res.save.lifetimePoints || 0;
            const localPoints = localGame.lifetimePoints || 0;
            const bestSave = cloudPoints >= localPoints ? res.save : localGame;
            setGame({ ...defaultState(), ...bestSave, username: p.username });
          }
        });
        setScreen('start');
      } catch { /* ignore bad data */ }
    }
  }, []);

  // Admin bridge subscription
  useEffect(() => {
    const unsub = subscribeToAdmin({
      currentUsername: game.username,
      onEventStateChange: (active, name) => {
        setAdminEvent({ active, name: name || '' });
        if (active && document.hidden) {
          notify('🔴 Admin Abuse is LIVE!', {
            body: name ? `${name} — jump in now to catch the chaos.` : 'Jump in now to catch the chaos.',
            tag: 'admin-event',
          });
        }
      },
      onEffectChange: (effectId, active) => setAdminEffects(prev => ({ ...prev, [effectId]: active })),
      onGlobalMessage: (text) => {
        setAdminMessage({ text, id: Date.now() });
        setTimeout(() => setAdminMessage(null), 8000);
        if (document.hidden) {
          notify('📢 Message from Timur', { body: text, tag: 'broadcast' });
        }
      },
      onSkinGift: (skinName) => {
        const idx = CHARACTERS.findIndex(c => c.name.toLowerCase() === skinName.toLowerCase());
        if (idx < 0) return;
        const ch = CHARACTERS[idx];
        soundEngine.play('unlock');
        if (document.hidden) {
          notify('🎁 New skin unlocked!', {
            body: `${ch.name} is yours — open the game to equip it.`,
            tag: 'skin-gift',
          });
        }
        setSkinGiftCelebration({ skin: ch, id: Date.now() });
        // Reveal the unlock in inventory after the box opens
        setTimeout(() => {
          setGame(prev => prev.unlockedSkins.includes(idx) ? prev : { ...prev, unlockedSkins: [...prev.unlockedSkins, idx] });
        }, 2400);
        setTimeout(() => setSkinGiftCelebration(null), 5000);
      },
      onCoinGift: (amount) => {
        soundEngine.play('purchase');
        if (document.hidden) {
          notify('🎁 Timur gifted you coins!', {
            body: `+${amount.toLocaleString()} coins waiting for you.`,
            tag: 'coin-gift',
          });
        }
        // Show celebration first — box flies in, opens, reveals amount
        setCoinCelebration({ amount, id: Date.now() });
        // Add coins to balance after the box opens and the amount is revealed (~2.4s in)
        setTimeout(() => {
          setGame(prev => ({
            ...prev,
            points: prev.points + amount,
            lifetimePoints: prev.lifetimePoints + amount,
          }));
        }, 2400);
        // Dismiss popup after full sequence
        setTimeout(() => setCoinCelebration(null), 5000);
      },
      onVoteStart: (v) => setAdminVote(v),
      onScheduled: (s) => setAdminSchedule(s),
    });
    return unsub;
  }, [game.username]);

  // Broadcast our presence so the admin hub knows we're live
  useEffect(() => {
    if (!game.username || screen !== 'game') return;
    return announcePresence(game.username);
  }, [game.username, screen]);

  // Live emote reactions — broadcast channel (ephemeral, no DB writes)
  const addFloatingEmote = useCallback((username, emote) => {
    const id = ++emoteIdRef.current;
    const x = 10 + Math.random() * 80; // 10–90% horizontal
    setFloatingEmotes(prev => [...prev, { id, username, emote, x }]);
    setTimeout(() => {
      setFloatingEmotes(prev => prev.filter(f => f.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    if (screen !== 'game') return;
    const channel = supabase.channel('brainrot:emotes')
      .on('broadcast', { event: 'emote' }, ({ payload }) => {
        if (!payload?.emote || !payload?.username) return;
        addFloatingEmote(payload.username, payload.emote);
      });
    channel.subscribe();
    emoteChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      emoteChannelRef.current = null;
    };
  }, [screen, addFloatingEmote]);

  // Admin force-reload channel — lets us push a new build to all players
  useEffect(() => {
    const ch = supabase.channel('brainrot:control')
      .on('broadcast', { event: 'reload' }, () => {
        try { window.location.reload(); } catch {}
      });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const sendEmote = useCallback((emote) => {
    const now = Date.now();
    if (now - lastEmoteAt.current < 600) return; // 600ms rate-limit
    lastEmoteAt.current = now;
    const username = game.username || 'Player';
    // Show locally immediately for instant feedback
    addFloatingEmote(username, emote);
    // Broadcast to everyone else
    emoteChannelRef.current?.send({
      type: 'broadcast', event: 'emote', payload: { username, emote },
    });
  }, [game.username, addFloatingEmote]);

  // Register service worker once on mount
  useEffect(() => { registerServiceWorker(); }, []);

  // Onboarding tutorial — fires once for fresh players when they enter the game
  useEffect(() => {
    if (screen !== 'game') return;
    if (localStorage.getItem('brainrot_tutorial_done') === '1') return;
    if ((game.totalClicks || 0) > 5) {
      // They already played a bit (returning local save) — skip tutorial
      localStorage.setItem('brainrot_tutorial_done', '1');
      return;
    }
    const t = setTimeout(() => setTutorialStep(0), 600);
    return () => clearTimeout(t);
  }, [screen, game.totalClicks]);

  // Notification opt-in — offer after the player is engaged (~5 minutes in or admin event happens)
  useEffect(() => {
    if (screen !== 'game') return;
    if (!shouldOfferOptIn()) return;
    // Trigger when an admin event becomes active (highest perceived value moment)
    if (adminEvent?.active) { setShowNotifPrompt(true); return; }
    // Or after 5 minutes of play
    const t = setTimeout(() => { if (shouldOfferOptIn()) setShowNotifPrompt(true); }, 5 * 60 * 1000);
    return () => clearTimeout(t);
  }, [screen, adminEvent?.active]);

  // DJ effect sounds — start/stop sound loop alongside each visual effect
  useEffect(() => {
    adminEffectsRef.current = adminEffects;
    const ids = ['disco', 'fireworks', 'poop', 'rocket', 'cats', 'tsunami', 'lightning', 'bomb', 'crowd'];
    soundEngine.init();
    for (const id of ids) {
      if (adminEffects[id]) soundEngine.startEffect(id);
      else soundEngine.stopEffect(id);
    }
    return () => { for (const id of ids) soundEngine.stopEffect(id); };
  }, [adminEffects]);

  // Loading screen
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  // Init sound on first interaction
  useEffect(() => {
    const handler = () => { soundEngine.init(); document.removeEventListener('click', handler); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Offline progress
  useEffect(() => {
    if (screen !== 'start') return;
    const g = gameRef.current;
    if (g.lastSaveTime && g.lifetimePoints > 0) {
      const secondsAway = Math.min((Date.now() - g.lastSaveTime) / 1000, 28800);
      if (secondsAway > 10) {
        const earned = Math.floor(calcCPS(g) * secondsAway * 0.5);
        if (earned > 0) {
          setOfflineReward({ seconds: Math.floor(secondsAway), earned });
        }
      }
    }
  }, [screen, calcCPS]);

  // Daily reward check
  useEffect(() => {
    if (screen !== 'game') return;
    const today = new Date().toDateString();
    const g = gameRef.current;
    if (g.lastDailyDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let day = g.dailyDay;
      let cycle = g.dailyCycle || 1;
      if (g.lastDailyDate === yesterday) {
        day = (day + 1) % 7;
      } else if (g.lastDailyDate) {
        day = 0;
        cycle = 1;
      }
      if (day === 0 && g.dailyDay === 6) cycle += 1;
      const reward = DAILY_REWARDS[day] * cycle;
      setDailyReward({ day, reward, cycle });
      setGame(prev => ({ ...prev, dailyDay: day, dailyCycle: cycle, lastDailyDate: today }));
    }
  }, [screen]);

  // Auto-save every 10 seconds (local) + every 30 seconds (cloud)
  useEffect(() => {
    const localInterval = setInterval(() => saveGame(gameRef.current), 10000);
    const cloudInterval = setInterval(() => {
      if (player?.id) saveGameCloud(player.id, gameRef.current);
    }, 30000);
    return () => { clearInterval(localInterval); clearInterval(cloudInterval); };
  }, [player]);

  // CPS interval - auto earn points
  useEffect(() => {
    if (screen !== 'game') return;
    cpsIntervalRef.current = setInterval(() => {
      setGame(prev => {
        const earned = calcCPS(prev) / 10;
        if (earned <= 0) return prev;
        let effectMult = 1;
        if (activeEffect?.type === 'frenzy') effectMult = 7;
        const pts = earned * effectMult;
        return { ...prev, points: prev.points + pts, lifetimePoints: prev.lifetimePoints + pts };
      });
    }, 100);
    return () => clearInterval(cpsIntervalRef.current);
  }, [screen, calcCPS, activeEffect]);

  // Golden Brain spawner
  useEffect(() => {
    if (screen !== 'game') return;
    const spawn = () => {
      const delay = (30 + Math.random() * 60) * 1000;
      let goldenMult = 1;
      if (getSeason() === 'spooky') goldenMult = 3;
      goldenTimerRef.current = setTimeout(() => {
        const x = 20 + Math.random() * 60;
        const y = 20 + Math.random() * 40;
        setGoldenBrain({ x, y, time: Date.now() });
        soundEngine.play('golden');
        setTimeout(() => {
          setGoldenBrain(prev => {
            if (prev && Date.now() - prev.time > 4500) return null;
            return prev;
          });
        }, 5000);
        spawn();
      }, delay / goldenMult);
    };
    spawn();
    return () => clearTimeout(goldenTimerRef.current);
  }, [screen]);

  // Active effect timer
  useEffect(() => {
    if (!activeEffect) return;
    const t = setTimeout(() => setActiveEffect(null), activeEffect.duration);
    return () => clearTimeout(t);
  }, [activeEffect]);

  // News ticker rotation
  useEffect(() => {
    if (screen !== 'game') return;
    const interval = setInterval(() => setNewsIdx(prev => prev + 1), 8000);
    return () => clearInterval(interval);
  }, [screen]);

  // Weather animation
  useEffect(() => {
    if (screen !== 'game') return;
    const interval = setInterval(() => setWeatherAnim(prev => prev + 1), 100);
    return () => clearInterval(interval);
  }, [screen]);

  // Lightning flash for neon storm
  useEffect(() => {
    if (weather !== 'neon' || screen !== 'game') return;
    const flash = () => {
      const delay = (30 + Math.random() * 30) * 1000;
      const t = setTimeout(() => {
        setLightningFlash(true);
        setTimeout(() => setLightningFlash(false), 150);
        flash();
      }, delay);
      return t;
    };
    const t = flash();
    return () => clearTimeout(t);
  }, [weather, screen]);

  // Achievement checker
  useEffect(() => {
    if (screen !== 'game') return;
    const checkState = { ...game, cps };
    ACHIEVEMENTS.forEach(a => {
      if (!game.achievements.includes(a.id) && a.check(checkState)) {
        setGame(prev => ({ ...prev, achievements: [...prev.achievements, a.id] }));
        setAchievementToast(a);
        soundEngine.play('unlock');
        setTimeout(() => setAchievementToast(null), 3000);
      }
    });
  }, [game.totalClicks, game.lifetimePoints, game.totalUpgrades, game.unlockedSkins.length, game.usedCodes.length, cps, game.prestigeCount, screen]);

  // Skin unlock checker
  useEffect(() => {
    CHARACTERS.forEach((ch, idx) => {
      if (!game.unlockedSkins.includes(idx) && game.lifetimePoints >= ch.unlock) {
        setGame(prev => ({ ...prev, unlockedSkins: [...prev.unlockedSkins, idx] }));
        setSkinCelebration(ch);
        soundEngine.play('unlock');
        setTimeout(() => setSkinCelebration(null), 3000);
      }
    });
  }, [game.lifetimePoints]);

  // Story milestone checker
  useEffect(() => {
    STORY_MILESTONES.forEach(m => {
      if (game.lifetimePoints >= m.threshold && !game.storyShown.includes(m.threshold)) {
        setGame(prev => ({ ...prev, storyShown: [...prev.storyShown, m.threshold] }));
        setStoryPopup(m);
        soundEngine.play('golden');
        setTimeout(() => setStoryPopup(null), 3500);
      }
    });
  }, [game.lifetimePoints]);

  // Particle cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.filter(p => Date.now() - p.born < 1000));
      setPopups(prev => prev.filter(p => Date.now() - p.born < 800));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // TAP HANDLER
  // ============================================================
  const handleTap = useCallback((e) => {
    e.preventDefault();
    soundEngine.init();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || rect.left + rect.width / 2) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY || rect.top + rect.height / 2) - rect.top;

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);

    // Combo system
    const now = Date.now();
    tapsInWindowRef.current = tapsInWindowRef.current.filter(t => now - t < 1000);
    tapsInWindowRef.current.push(now);
    const tps = tapsInWindowRef.current.length;

    let comboMult = 1;
    if (tps >= 16) comboMult = 5;
    else if (tps >= 12) comboMult = 4;
    else if (tps >= 8) comboMult = 3;
    else if (tps >= 5) comboMult = 2;

    const ae = adminEffectsRef.current || {};
    if (comboMult > 1) {
      setCombo(comboMult);
      soundEngine.play('combo');
      if (comboTimer) clearTimeout(comboTimer);
      // Crowd effect locks combo — no decay while active
      if (!ae.crowd) {
        setComboTimer(setTimeout(() => setCombo(0), 1200));
      }
    }

    lastTapRef.current = now;

    const tp = calcTapPower(gameRef.current);
    let effectMult = 1;
    if (activeEffect?.type === 'frenzy') effectMult = 7;
    if (activeEffect?.type === 'tapstorm') effectMult = 20;
    // Admin DJ effects: disco doubles tap, lightning crits 10×
    if (ae.disco) effectMult *= 2;
    if (ae.lightning) effectMult *= 10;
    const earned = tp * comboMult * effectMult;

    soundEngine.play('tap');

    // Screen shake
    setShaking(true);
    setTimeout(() => setShaking(false), 50);

    // +N popup
    const pid = particleIdRef.current++;
    setPopups(prev => [...prev.slice(-10), { id: pid, x, y, text: '+' + formatNumber(earned), born: now }]);

    // Coin particles (limit to 20 total)
    const newParticles = [];
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: -3 - Math.random() * 5,
        type: Math.random() > 0.5 ? 'coin' : 'spark',
        born: now,
      });
    }
    setParticles(prev => [...prev, ...newParticles].slice(-20));

    setGame(prev => {
      const newHighCombo = Math.max(prev.highestCombo, comboMult);
      return {
        ...prev,
        points: prev.points + earned,
        lifetimePoints: prev.lifetimePoints + earned,
        totalClicks: prev.totalClicks + 1,
        highestCombo: newHighCombo,
      };
    });
  }, [calcTapPower, activeEffect, comboTimer]);

  // ============================================================
  // GOLDEN BRAIN TAP
  // ============================================================
  const handleGoldenTap = useCallback(() => {
    if (!goldenBrain) return;
    setGoldenBrain(null);
    soundEngine.play('unlock');

    const roll = Math.random();
    if (roll < 0.33) {
      setActiveEffect({ type: 'frenzy', duration: 15000 });
    } else if (roll < 0.66) {
      const bonus = calcCPS(gameRef.current) * 600;
      setGame(prev => ({ ...prev, points: prev.points + bonus, lifetimePoints: prev.lifetimePoints + bonus }));
      setActiveEffect({ type: 'braindump', duration: 3000 });
    } else {
      setActiveEffect({ type: 'tapstorm', duration: 10000 });
    }
  }, [goldenBrain, calcCPS]);

  // ============================================================
  // SHOP ACTIONS
  // ============================================================
  const buyAutoClicker = (ac) => {
    let bought = false;
    setGame(prev => {
      const owned = prev.autoClickers[ac.id] || 0;
      const cost = getUpgradeCost(ac.baseCost, owned);
      if (prev.points < cost) return prev;
      bought = true;
      return {
        ...prev,
        points: prev.points - cost,
        autoClickers: { ...prev.autoClickers, [ac.id]: owned + 1 },
        totalUpgrades: prev.totalUpgrades + 1,
      };
    });
    if (bought) soundEngine.play('purchase');
  };

  const buyTapUpgrade = (t) => {
    let bought = false;
    setGame(prev => {
      const owned = prev.tapUpgrades[t.id] || 0;
      const cost = getUpgradeCost(t.baseCost, owned);
      if (prev.points < cost) return prev;
      bought = true;
      return {
        ...prev,
        points: prev.points - cost,
        tapUpgrades: { ...prev.tapUpgrades, [t.id]: owned + 1 },
        totalUpgrades: prev.totalUpgrades + 1,
      };
    });
    if (bought) soundEngine.play('purchase');
  };

  const buyEfficiency = (eff) => {
    let bought = false;
    setGame(prev => {
      if (prev.efficiencyUpgrades.includes(eff.target)) return prev;
      if (prev.points < eff.cost) return prev;
      bought = true;
      return {
        ...prev,
        points: prev.points - eff.cost,
        efficiencyUpgrades: [...prev.efficiencyUpgrades, eff.target],
        totalUpgrades: prev.totalUpgrades + 1,
      };
    });
    if (bought) soundEngine.play('purchase');
  };

  // ============================================================
  // CHEAT CODE
  // ============================================================
  const [codeInput, setCodeInput] = useState('');
  const submitCode = () => {
    const code = codeInput.trim().toLowerCase();
    if (game.usedCodes.includes(code)) {
      setCodeResult({ success: false, msg: 'Already used!' });
    } else if (CHEAT_CODES[code]) {
      const c = CHEAT_CODES[code];
      soundEngine.play('unlock');
      let updates = { usedCodes: [...game.usedCodes, code] };
      if (c.type === 'points') updates.points = game.points + c.value;
      if (c.type === 'points') updates.lifetimePoints = game.lifetimePoints + c.value;
      if (c.type === 'skin' && !game.unlockedSkins.includes(c.value)) {
        updates.unlockedSkins = [...game.unlockedSkins, c.value];
      }
      if (c.type === 'cps') updates.bonusCps = (game.bonusCps || 0) + c.value;
      if (c.type === 'unlockall') {
        updates.unlockedSkins = CHARACTERS.map((_, i) => i);
        updates.points = game.points + 10000000;
        updates.lifetimePoints = game.lifetimePoints + 10000000;
      }
      setGame(prev => ({ ...prev, ...updates }));
      setCodeResult({ success: true, msg: c.msg });
    } else {
      setCodeResult({ success: false, msg: 'Nice try...' });
    }
    setCodeInput('');
    setTimeout(() => setCodeResult(null), 2000);
  };

  // ============================================================
  // PRESTIGE
  // ============================================================
  const canAscend = game.lifetimePoints >= 1000000;
  const brainCellsToGain = Math.floor(Math.sqrt(game.lifetimePoints / 1000000));

  const doAscend = () => {
    soundEngine.play('ascend');
    const newBrainCells = game.brainCells + brainCellsToGain;
    const newPrestigeCount = game.prestigeCount + 1;
    const fresh = defaultState();
    setGame({
      ...fresh,
      brainCells: newBrainCells,
      prestigeCount: newPrestigeCount,
      achievements: game.achievements,
      storyShown: game.storyShown,
      username: game.username,
      highestCombo: game.highestCombo,
      reflexMedals: game.reflexMedals,
      lastDailyDate: game.lastDailyDate,
      dailyDay: game.dailyDay,
      dailyCycle: game.dailyCycle,
    });
    setAscendConfirm(false);
    setActivePanel(null);
    setScreen('start');
  };

  // ============================================================
  // REFLEX MINI-GAME
  // ============================================================
  const startReflex = () => {
    if (Date.now() - game.lastReflexTime < 20000) return; // 20 sec cooldown
    setScreen('reflex');
    setReflexGame({ score: 0, hits: 0, total: 0, timeLeft: 30, targets: [], active: true });
    setGame(prev => ({ ...prev, lastReflexTime: Date.now() }));
  };

  useEffect(() => {
    if (screen !== 'reflex' || !reflexGame?.active) return;
    const countdown = setInterval(() => {
      setReflexGame(prev => {
        if (!prev || prev.timeLeft <= 0.1) {
          clearInterval(countdown);
          return { ...prev, active: false, timeLeft: 0 };
        }
        // Spawn targets — stay for 3-5 seconds
        const now = Date.now();
        let newTargets = [...prev.targets.filter(t => now - t.born < t.lifetime)];
        if (Math.random() < 0.25 && newTargets.length < 8) {
          const sizeRoll = Math.random();
          const size = sizeRoll < 0.3 ? 30 : sizeRoll < 0.7 ? 50 : 70;
          const pts = size === 30 ? 30 : size === 50 ? 20 : 10;
          const lifetime = 3000 + Math.random() * 1000; // 3-4 seconds
          newTargets.push({
            id: now + Math.random(),
            x: 10 + Math.random() * 80,
            y: 10 + Math.random() * 70,
            size, pts, born: now, lifetime,
          });
        }
        const newTotal = prev.total + (Math.random() < 0.25 ? 1 : 0);
        return { ...prev, timeLeft: prev.timeLeft - 0.1, targets: newTargets, total: newTotal };
      });
    }, 100);
    return () => clearInterval(countdown);
  }, [screen, reflexGame?.active]);

  const hitReflexTarget = (target) => {
    soundEngine.play('tap');
    setReflexGame(prev => ({
      ...prev,
      score: prev.score + target.pts,
      hits: prev.hits + 1,
      targets: prev.targets.filter(t => t.id !== target.id),
    }));
  };

  const collectReflexReward = () => {
    if (!reflexGame) return;
    const bonus = reflexGame.score * tapPower * 10;
    const hitRate = reflexGame.total > 0 ? reflexGame.hits / Math.max(reflexGame.total, 1) : 0;
    let medal = null;
    if (hitRate >= 0.9) medal = 'gold';
    else if (hitRate >= 0.75) medal = 'silver';
    else if (hitRate >= 0.5) medal = 'bronze';

    setGame(prev => {
      const medals = { ...prev.reflexMedals };
      if (medal) medals[medal] = (medals[medal] || 0) + 1;
      return { ...prev, points: prev.points + bonus, lifetimePoints: prev.lifetimePoints + bonus, reflexMedals: medals };
    });
    soundEngine.play('purchase');
    setScreen('game');
    setReflexGame(null);
  };

  // ============================================================
  // NEWS TICKER
  // ============================================================
  const getNews = () => {
    const lp = game.lifetimePoints;
    const pool = lp >= 100000 ? NEWS_HIGH : lp >= 1000 ? NEWS_MID : NEWS_LOW;
    return pool[newsIdx % pool.length];
  };

  // ============================================================
  // LEADERBOARD
  // ============================================================
  // Load cloud leaderboard when board panel opens
  useEffect(() => {
    if (activePanel === 'board') {
      getLeaderboard().then(data => setCloudLeaderboard(data));
    }
  }, [activePanel]);

  const fullBoard = cloudLeaderboard.length > 0
    ? cloudLeaderboard.map(e => ({
        name: e.username,
        pts: e.lifetime_points,
        isPlayer: player?.id === e.player_id,
      }))
    : [{ name: game.username, pts: game.lifetimePoints, isPlayer: true }];

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const currentSkin = CHARACTERS[game.equippedSkin] || CHARACTERS[0];

  const weatherParticles = [];
  if (weather === 'stars' || weather === 'rainbow') {
    for (let i = 0; i < 20; i++) {
      const x = (i * 37 + weatherAnim * 0.5) % 100;
      const y = (i * 53 + weatherAnim * 2) % 100;
      weatherParticles.push(
        <div key={'wp' + i} style={{
          position: 'absolute', left: x + '%', top: y + '%',
          fontSize: weather === 'rainbow' ? '8px' : '6px',
          opacity: 0.6, pointerEvents: 'none',
          color: weather === 'rainbow' ? `hsl(${(i * 36 + weatherAnim * 5) % 360}, 100%, 70%)` : '#fff',
        }}>{weather === 'rainbow' ? '✦' : '⭐'}</div>
      );
    }
  }

  if (weather === 'neon') {
    for (let i = 0; i < 8; i++) {
      const x = (i * 47 + weatherAnim * 0.3) % 100;
      const y = (i * 31 + weatherAnim * 0.8) % 100;
      weatherParticles.push(
        <div key={'np' + i} style={{
          position: 'absolute', left: x + '%', top: y + '%',
          width: '4px', height: '4px', borderRadius: '50%',
          background: i % 2 === 0 ? '#00ffff' : '#ff00ff',
          boxShadow: `0 0 10px ${i % 2 === 0 ? '#00ffff' : '#ff00ff'}`,
          opacity: 0.5, pointerEvents: 'none',
        }} />
      );
    }
  }

  // Seasonal overlay
  const seasonalParticles = [];
  const season = getSeason();
  if (season === 'frosty') {
    for (let i = 0; i < 15; i++) {
      const x = (i * 41 + weatherAnim * 0.4) % 100;
      const y = (i * 29 + weatherAnim * 1.5) % 100;
      seasonalParticles.push(
        <div key={'snow' + i} style={{
          position: 'absolute', left: x + '%', top: y + '%',
          fontSize: '10px', opacity: 0.7, pointerEvents: 'none',
        }}>❄️</div>
      );
    }
  }
  if (season === 'spooky') {
    for (let i = 0; i < 8; i++) {
      const x = (i * 43 + weatherAnim * 0.2) % 100;
      const y = 10 + (i * 37 + Math.sin(weatherAnim * 0.05 + i) * 10) % 80;
      seasonalParticles.push(
        <div key={'ghost' + i} style={{
          position: 'absolute', left: x + '%', top: y + '%',
          fontSize: '16px', opacity: 0.3, pointerEvents: 'none',
        }}>👻</div>
      );
    }
  }

  // ============================================================
  // STYLES — Italian Brainrot Clicker Aesthetic
  // ============================================================
  const tapScale = shaking ? 'scale(0.92)' : 'scale(1)';
  const styles = {
    container: {
      width: '100vw', height: '100vh', fontFamily: "'Bangers', cursive",
      background: lightningFlash ? '#fff' : (currentSkin.bg || getWeatherBg(weather)),
      transition: 'background 2s ease', overflow: 'hidden', position: 'relative',
      userSelect: 'none', WebkitUserSelect: 'none',
    },
    hud: {
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px',
    },
    points: {
      fontSize: 'clamp(42px, 12vw, 72px)', color: '#fff', textAlign: 'center',
      fontFamily: "'Bungee Shade', cursive",
      textShadow: '0 0 30px rgba(255,215,0,0.9), 0 0 60px rgba(255,100,0,0.5), 3px 3px 0 #000',
      letterSpacing: '2px', lineHeight: 1,
    },
    subStats: {
      display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '15px',
      color: 'rgba(255,255,255,0.7)', fontFamily: "'Bangers', cursive",
    },
    ticker: {
      background: 'linear-gradient(90deg, rgba(60,10,100,0.95), rgba(15,0,30,0.95), rgba(60,10,100,0.95))',
      height: '36px', lineHeight: '36px', overflow: 'hidden',
      whiteSpace: 'nowrap',
      fontSize: 'clamp(16px, 1.4vw, 22px)',
      fontFamily: "'Bangers', cursive", letterSpacing: '1.2px',
      color: '#7afcff',
      textShadow: '0 0 10px rgba(0,255,255,0.6), 1px 1px 0 #000',
      borderTop: '1px solid rgba(0,255,255,0.4)', borderBottom: '1px solid rgba(0,255,255,0.4)',
      boxShadow: '0 -2px 14px rgba(0,255,255,0.15)',
    },
    character: {
      position: 'absolute', top: '46%', left: '50%',
      transform: `translate(-50%, -50%) ${tapScale}`,
      width: 'min(320px, 65vw)', height: 'min(360px, 70vh)',
      cursor: 'pointer',
      transition: 'transform 0.08s ease-out',
      zIndex: 5,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    characterImg: {
      maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
      filter: `drop-shadow(0 0 8px #000) drop-shadow(0 0 20px ${currentSkin.color}) drop-shadow(0 0 40px ${currentSkin.color}88)`,
    },
    // Animated glow ring around character
    glowRing: {
      position: 'absolute', top: '46%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(370px, 75vw)', height: 'min(370px, 75vw)',
      borderRadius: '50%', pointerEvents: 'none', zIndex: 4,
      border: `3px solid ${currentSkin.color}66`,
      boxShadow: `0 0 40px ${currentSkin.color}44, inset 0 0 40px ${currentSkin.color}22, 0 0 80px ${currentSkin.color}22`,
      animation: 'ringPulse 2s ease-in-out infinite',
    },
    glowRing2: {
      position: 'absolute', top: '46%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(420px, 85vw)', height: 'min(420px, 85vw)',
      borderRadius: '50%', pointerEvents: 'none', zIndex: 3,
      border: `2px solid ${currentSkin.color}33`,
      boxShadow: `0 0 60px ${currentSkin.color}22`,
      animation: 'ringPulse 3s ease-in-out infinite reverse',
    },
    skinLabel: {
      position: 'absolute', top: 'calc(46% + min(195px, 38vw))', left: '50%',
      transform: 'translateX(-50%)', color: '#fff', fontSize: '20px',
      textShadow: `0 0 15px ${currentSkin.color}, 0 0 30px ${currentSkin.color}88, 2px 2px 0 #000`,
      whiteSpace: 'nowrap', letterSpacing: '2px', zIndex: 6,
    },
    bottomNav: {
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
      height: '56px', boxSizing: 'border-box',
      display: 'flex', gap: '2px',
      padding: '2px 6px',
      background: 'linear-gradient(180deg, rgba(18,8,40,0.94), rgba(5,0,15,0.98))',
      borderTop: '1px solid rgba(162,89,255,0.35)',
      boxShadow: '0 -4px 20px rgba(106,13,173,0.25)',
      backdropFilter: 'blur(16px)',
    },
    navBtn: {
      flex: 1, padding: '4px 2px', textAlign: 'center', color: '#fff',
      cursor: 'pointer', border: 'none', background: 'none',
      fontFamily: "'Bangers', cursive", display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '2px',
      transition: 'all 0.18s ease',
      borderRadius: '10px', position: 'relative',
    },
    panel: {
      position: 'absolute', bottom: '56px', left: 0, right: 0, zIndex: 15,
      background: 'linear-gradient(180deg, rgba(15,5,35,0.97), rgba(5,0,15,0.99))',
      borderTop: '2px solid rgba(106,13,173,0.8)',
      maxHeight: '60vh', overflowY: 'auto', padding: '16px',
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -10px 40px rgba(106,13,173,0.3)',
      backdropFilter: 'blur(10px)',
    },
    panelTitle: {
      fontSize: '28px', color: '#fff', textAlign: 'center', marginBottom: '14px',
      textShadow: '0 0 20px #6a0dad, 0 0 40px rgba(106,13,173,0.5)',
      letterSpacing: '3px',
    },
    shopItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 14px', margin: '6px 0',
      background: 'linear-gradient(135deg, rgba(106,13,173,0.15), rgba(255,255,255,0.03))',
      borderRadius: '12px', border: '1px solid rgba(106,13,173,0.3)',
      transition: 'all 0.15s',
    },
    buyBtn: (canBuy) => ({
      padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: canBuy ? 'pointer' : 'default',
      background: canBuy ? 'linear-gradient(135deg, #ff3366, #ff6600)' : 'rgba(255,255,255,0.08)',
      color: '#fff', fontFamily: "'Bangers', cursive", fontSize: '15px',
      opacity: canBuy ? 1 : 0.4,
      boxShadow: canBuy ? '0 0 15px rgba(255,51,102,0.4), 0 4px 0 rgba(0,0,0,0.3)' : 'none',
      transition: 'all 0.1s',
      letterSpacing: '1px',
    }),
    overlay: {
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'radial-gradient(ellipse at center, rgba(20,0,40,0.9), rgba(0,0,0,0.95))',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      padding: '20px',
    },
    soundBtn: {
      position: 'absolute', top: '10px', right: '10px', zIndex: 30,
      background: 'rgba(106,13,173,0.4)', border: '1px solid rgba(106,13,173,0.6)', borderRadius: '50%',
      width: '40px', height: '40px', color: '#fff', fontSize: '18px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)', transition: 'all 0.15s',
    },
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================
  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: '48px', color: '#fff', fontFamily: "'Bungee Shade', cursive", textShadow: '0 0 30px #ff0, 3px 3px 0 #f00, -3px -3px 0 #0ff' }}>
          BRAINROT
        </div>
        <div style={{ fontSize: '24px', color: '#ff69b4', marginTop: '8px' }}>Loading...</div>
      </div>
    );
  }

  // ============================================================
  // LOGIN / REGISTER SCREEN
  // ============================================================
  if (screen === 'login') {
    const handleAuth = async () => {
      setLoginError('');
      if (!loginUsername.trim() || loginPin.length !== 4) {
        setLoginError('Enter a username and 4-digit PIN');
        return;
      }
      if (loginMode === 'register') {
        const res = await registerPlayer(loginUsername, loginPin);
        if (res.error) { setLoginError(res.error); return; }
        setPlayer(res.player);
        setGame(prev => ({ ...prev, username: res.player.username }));
        localStorage.setItem('brainrot_player', JSON.stringify(res.player));
        setScreen('start');
      } else {
        const res = await loginPlayer(loginUsername, loginPin);
        if (res.error) { setLoginError(res.error); return; }
        setPlayer(res.player);
        // Load cloud save
        const cloudSave = await loadGameCloud(res.player.id);
        if (cloudSave.save) {
          setGame({ ...defaultState(), ...cloudSave.save, username: res.player.username });
        } else {
          setGame(prev => ({ ...prev, username: res.player.username }));
        }
        localStorage.setItem('brainrot_player', JSON.stringify(res.player));
        setScreen('start');
      }
    };

    return (
      <div style={{ ...styles.container, background: 'linear-gradient(135deg, #0f0825, #1a0e3a, #0f0825)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '24px' }}>
        <BackToSiteLink />
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🧠</div>
        <div style={{
          fontSize: 'clamp(32px, 8vw, 52px)', fontFamily: "'Bungee Shade', cursive", color: '#fff',
          textShadow: '3px 3px 0 #f00, -2px -2px 0 #0ff, 0 0 30px #ff0',
          textAlign: 'center', lineHeight: 1.1, marginBottom: '16px',
        }}>
          BRAINROT<br/>CLICKER
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '24px',
          border: '1px solid rgba(106,13,173,0.3)', width: '100%', maxWidth: '320px',
        }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button onClick={() => setLoginMode('login')} style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: loginMode === 'login' ? 'linear-gradient(135deg, #00d4ff, #bf5af2)' : 'rgba(255,255,255,0.08)',
              color: '#fff', fontFamily: "'Bangers', cursive", fontSize: '16px',
            }}>Login</button>
            <button onClick={() => setLoginMode('register')} style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: loginMode === 'register' ? 'linear-gradient(135deg, #ff3366, #ff6600)' : 'rgba(255,255,255,0.08)',
              color: '#fff', fontFamily: "'Bangers', cursive", fontSize: '16px',
            }}>Register</button>
          </div>

          <input
            value={loginUsername}
            onChange={e => setLoginUsername(e.target.value)}
            placeholder="Username"
            maxLength={20}
            style={{
              width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid rgba(106,13,173,0.4)',
              background: 'rgba(0,0,0,0.3)', color: '#fff', fontFamily: "'Bangers', cursive",
              fontSize: '18px', marginBottom: '10px', outline: 'none', boxSizing: 'border-box',
            }}
          />

          <input
            value={loginPin}
            onChange={e => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4-digit PIN"
            type="password"
            maxLength={4}
            style={{
              width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid rgba(106,13,173,0.4)',
              background: 'rgba(0,0,0,0.3)', color: '#fff', fontFamily: "'Bangers', cursive",
              fontSize: '18px', marginBottom: '14px', outline: 'none', boxSizing: 'border-box',
              letterSpacing: '8px', textAlign: 'center',
            }}
          />

          {loginError && (
            <div style={{ color: '#ff4444', fontSize: '14px', textAlign: 'center', marginBottom: '10px' }}>
              {loginError}
            </div>
          )}

          <button onClick={handleAuth} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: loginMode === 'login' ? 'linear-gradient(135deg, #00d4ff, #bf5af2)' : 'linear-gradient(135deg, #ff3366, #ff6600)',
            color: '#fff', fontFamily: "'Bangers', cursive", fontSize: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          }}>
            {loginMode === 'login' ? '🎮 Play!' : '🚀 Create Account'}
          </button>

          <button onClick={() => { setPlayer(null); setScreen('start'); }} style={{
            width: '100%', padding: '10px', marginTop: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,255,255,0.4)', fontFamily: "'Bangers', cursive",
            fontSize: '14px',
          }}>
            Play without account →
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // START SCREEN
  // ============================================================
  if (screen === 'start') {
    const floatingEmoji = ['🧠', '💀', '🔥', '⭐', '💎', '🎮', '👾', '🚀', '💥', '🌈'];
    return (
      <div style={{ ...styles.container, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
        <BackToSiteLink />
        {floatingEmoji.map((e, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: (10 + i * 9) + '%',
            top: (15 + Math.sin(Date.now() / 1000 + i * 0.7) * 5 + i * 7) + '%',
            fontSize: '28px', opacity: 0.4, pointerEvents: 'none',
            animation: `bob ${2 + i * 0.3}s ease-in-out infinite alternate`,
          }}>{e}</div>
        ))}

        {getSeasonName() && (
          <div style={{ position: 'absolute', top: '20px', background: 'rgba(255,215,0,0.2)', padding: '6px 20px', borderRadius: '20px', color: '#ffd700', fontSize: '14px', border: '1px solid #ffd700' }}>
            {getSeasonName()}
          </div>
        )}

        <div style={{
          fontSize: 'clamp(36px, 10vw, 64px)', fontFamily: "'Bungee Shade', cursive", color: '#fff',
          textShadow: '4px 4px 0 #f00, -2px -2px 0 #0ff, 0 0 40px #ff0',
          textAlign: 'center', lineHeight: 1.1,
        }}>
          BRAINROT<br/>CLICKER
        </div>

        <div style={{
          width: 'min(200px, 45vw)', height: 'min(200px, 45vw)', overflow: 'hidden',
          filter: 'drop-shadow(0 0 25px rgba(255,200,0,0.6))', animation: 'pulse 2s ease-in-out infinite',
        }}>
          <img src="/characters/09_dragon_partyini.png" alt="Dragini Partini"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#aaa', letterSpacing: '2px' }}>
          tap tap tap tap tap
        </div>

        {player && (
          <div style={{ color: '#00d4ff', fontSize: '16px', marginBottom: '4px' }}>
            👤 {player.username}
          </div>
        )}

        {game.brainCells > 0 && (
          <div style={{ color: '#ff69b4', fontSize: '18px' }}>
            🧬 {game.brainCells} Brain Cells (+{game.brainCells * 5}% boost)
          </div>
        )}

        <button onClick={() => {
          soundEngine.init();
          setScreen('game');
        }} style={{
          padding: '18px 64px', fontSize: '32px', fontFamily: "'Bungee Shade', cursive",
          background: 'linear-gradient(135deg, #ff3366, #ff6600)', color: '#fff',
          border: 'none', borderRadius: '20px', cursor: 'pointer',
          boxShadow: '0 8px 0 rgba(150,0,50,0.8), 0 0 40px rgba(255,51,102,0.5), 0 0 80px rgba(255,51,102,0.2)',
          transform: 'translateY(0)', transition: 'all 0.1s',
          letterSpacing: '4px',
          animation: 'pulse 2s ease-in-out infinite',
        }}
          onMouseDown={e => e.target.style.transform = 'translateY(6px)'}
          onMouseUp={e => e.target.style.transform = 'translateY(0)'}
        >
          START
        </button>

        {/* Offline reward popup */}
        {offlineReward && (
          <div style={styles.overlay} onClick={() => {
            setGame(prev => ({
              ...prev,
              points: prev.points + offlineReward.earned,
              lifetimePoints: prev.lifetimePoints + offlineReward.earned,
            }));
            soundEngine.play('purchase');
            setOfflineReward(null);
          }}>
            <div style={{ fontSize: '28px', color: '#fff', marginBottom: '12px' }}>Welcome Back!</div>
            <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>
              You were away for {Math.floor(offlineReward.seconds / 60)}m {offlineReward.seconds % 60}s
            </div>
            <div style={{ fontSize: '36px', color: '#ffd700', textShadow: '0 0 20px rgba(255,215,0,0.8)' }}>
              +{formatNumber(offlineReward.earned)} pts
            </div>
            <div style={{ fontSize: '16px', color: '#aaa', marginTop: '16px' }}>Tap to collect</div>
          </div>
        )}

        <style>{`
          @keyframes bob { from { transform: translateY(-8px); } to { transform: translateY(8px); } }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        `}</style>
      </div>
    );
  }

  // ============================================================
  // REFLEX MINI-GAME SCREEN
  // ============================================================
  if (screen === 'reflex') {
    return (
      <div style={{ ...styles.container, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', textAlign: 'center', zIndex: 5 }}>
          <div style={{ fontSize: '24px', color: '#fff' }}>Brain Reflex</div>
          <div style={{ fontSize: '36px', color: '#ffd700' }}>
            {reflexGame?.active ? `${reflexGame.timeLeft.toFixed(1)}s` : 'DONE!'}
          </div>
          <div style={{ color: '#aaa', fontSize: '16px' }}>
            Score: {reflexGame?.score || 0} | Hits: {reflexGame?.hits || 0}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          {reflexGame?.active && reflexGame.targets.map(t => (
            <div key={t.id} onClick={() => hitReflexTarget(t)} style={{
              position: 'absolute', left: t.x + '%', top: t.y + '%',
              width: t.size + 'px', height: t.size + 'px', borderRadius: '50%',
              background: `hsl(${Math.random() * 360}, 80%, 60%)`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 'bold', fontSize: t.size < 40 ? '10px' : '14px',
              boxShadow: '0 0 15px rgba(255,255,255,0.5)',
              animation: 'popIn 0.2s ease-out',
            }}>
              +{t.pts}
            </div>
          ))}
        </div>

        {reflexGame && !reflexGame.active && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
              {reflexGame.hits >= reflexGame.total * 0.9 ? '🥇 GOLD!' :
               reflexGame.hits >= reflexGame.total * 0.75 ? '🥈 SILVER!' :
               reflexGame.hits >= reflexGame.total * 0.5 ? '🥉 BRONZE!' : 'Keep practicing!'}
            </div>
            <div style={{ color: '#ffd700', fontSize: '24px', marginBottom: '12px' }}>
              Bonus: +{formatNumber(reflexGame.score * tapPower * 10)} pts
            </div>
            <button onClick={collectReflexReward} style={{
              padding: '12px 32px', fontSize: '20px', fontFamily: "'Bangers', cursive",
              background: 'linear-gradient(135deg, #6a0dad, #9b59b6)', color: '#fff',
              border: 'none', borderRadius: '12px', cursor: 'pointer',
            }}>Collect</button>
          </div>
        )}

        <style>{`
          @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
        `}</style>
      </div>
    );
  }

  // ============================================================
  // MAIN GAME SCREEN
  // ============================================================
  return (
    <div style={styles.container} onClick={(e) => { if (activePanel && !e.target.closest('[data-nav]') && !e.target.closest('[data-panel]')) setActivePanel(null); }}>
      {/* World Background Image */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `url(/worlds/bg_${currentSkin.bgNum}.png)`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(3px) brightness(0.85)',
        transform: 'scale(1.02)',
      }} />

      {/* Weather particles */}
      {weatherParticles}
      {seasonalParticles}

      {/* Sound toggle — push down when admin countdown banner is overhead */}
      <button style={{
        ...styles.soundBtn,
        top: (adminSchedule && !adminEvent.active) ? 'clamp(80px, 11vh, 95px)' : '10px',
      }} onClick={(e) => {
        e.stopPropagation();
        soundEngine.enabled = !soundEngine.enabled;
        setSettingsOpen(false);
        setGame(prev => ({ ...prev })); // force re-render
      }}>
        {soundEngine.enabled ? '🔊' : '🔇'}
      </button>

      {/* Settings gear */}
      <button style={{
        ...styles.soundBtn,
        right: '50px',
        top: (adminSchedule && !adminEvent.active) ? 'clamp(80px, 11vh, 95px)' : '10px',
      }} onClick={(e) => {
        e.stopPropagation();
        setSettingsOpen(!settingsOpen);
        setActivePanel(null);
      }}>⚙️</button>

      {/* HUD — push down when admin countdown banner is overhead */}
      <div style={{
        ...styles.hud,
        paddingTop: (adminSchedule && !adminEvent.active)
          ? 'clamp(96px, 13vh, 110px)'
          : '12px',
      }}>
        <div style={styles.points}>{formatNumber(game.points)}</div>
        <div style={styles.subStats}>
          <span>⚡ {formatNumber(cps)}/s</span>
          <span>👆 {formatNumber(tapPower)}/tap</span>
          <span>🌤️ {getWeatherName(weather)}</span>
          <span style={{ color: currentSkin.mult >= 5 ? '#ffd700' : '#fff' }}>✖️ {currentSkin.mult}x</span>
          {game.brainCells > 0 && <span>🧬 {game.brainCells}</span>}
        </div>

        {/* Active effect banner */}
        {activeEffect && (
          <div style={{
            textAlign: 'center', padding: '8px 16px', borderRadius: '12px', fontSize: '20px', color: '#fff',
            fontFamily: "'Bungee Shade', cursive", letterSpacing: '2px',
            background: activeEffect.type === 'frenzy' ? 'linear-gradient(90deg, #f00, #ff6600, #ff0)' :
                       activeEffect.type === 'tapstorm' ? 'linear-gradient(90deg, #0ff, #6a0dad, #f0f)' :
                       'linear-gradient(90deg, #ffd700, #ff4500, #ff8c00)',
            animation: 'pulse 0.4s ease-in-out infinite',
            boxShadow: activeEffect.type === 'frenzy' ? '0 0 30px rgba(255,0,0,0.6)' :
                       activeEffect.type === 'tapstorm' ? '0 0 30px rgba(0,255,255,0.6)' :
                       '0 0 30px rgba(255,215,0,0.6)',
          }}>
            {activeEffect.type === 'frenzy' ? '🔥 7X FRENZY! 🔥' :
             activeEffect.type === 'tapstorm' ? '⚡ 20X TAP STORM! ⚡' :
             '💰 BRAIN DUMP! 💰'}
          </div>
        )}
      </div>

      {/* News ticker */}
      <div style={{ ...styles.ticker, position: 'absolute', bottom: '60px', left: 0, right: 0, zIndex: 10 }}>
        <div style={{ animation: 'scroll 15s linear infinite', display: 'inline-block', paddingLeft: '100%' }}>
          📰 {getNews()} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 📰 {getNews()}
        </div>
      </div>

      {/* Emote reaction bar */}
      <div style={{
        position: 'absolute', bottom: '108px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 12, display: 'flex', gap: '6px',
        padding: '6px 10px', borderRadius: '999px',
        background: 'linear-gradient(135deg, rgba(20,5,40,0.85), rgba(40,10,80,0.85))',
        border: '1px solid rgba(162,89,255,0.4)',
        boxShadow: '0 4px 18px rgba(106,13,173,0.35)',
        backdropFilter: 'blur(8px)',
      }} data-nav onClick={e => e.stopPropagation()}>
        {EMOTES.map(e => (
          <button key={e} onClick={() => sendEmote(e)} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            fontSize: '20px', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.12s, background 0.12s',
          }}
          onMouseDown={ev => { ev.currentTarget.style.transform = 'scale(0.85)'; }}
          onMouseUp={ev => { ev.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={ev => { ev.currentTarget.style.transform = 'scale(1)'; }}
          >{e}</button>
        ))}
      </div>

      {/* Floating emote reactions */}
      {floatingEmotes.map(f => (
        <div key={f.id} style={{
          position: 'absolute', left: f.x + '%', bottom: '150px',
          transform: 'translateX(-50%)',
          zIndex: 40, pointerEvents: 'none', textAlign: 'center',
          animation: 'emoteFloat 3s ease-out forwards',
        }}>
          <div style={{ fontSize: '46px', filter: 'drop-shadow(0 0 10px rgba(162,89,255,0.8))' }}>{f.emote}</div>
          <div style={{
            fontSize: '11px', color: '#fff',
            fontFamily: "'Bangers', cursive", letterSpacing: '1.2px',
            textShadow: '0 0 6px rgba(0,0,0,0.9), 1px 1px 0 #000',
            marginTop: '-4px',
          }}>{f.username}</div>
        </div>
      ))}

      {/* Combo display */}
      {combo > 1 && (
        <div style={{
          position: 'absolute', top: '28%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 'clamp(48px, 14vw, 80px)', color: '#fff',
          fontFamily: "'Bungee Shade', cursive",
          textShadow: `0 0 ${combo * 15}px ${combo >= 4 ? '#f00' : '#f90'}, 0 0 ${combo * 30}px ${combo >= 4 ? '#f00' : '#f90'}44, 3px 3px 0 #000`,
          zIndex: 8, pointerEvents: 'none',
          animation: 'pulse 0.3s ease-in-out infinite',
        }}>
          {combo}X {combo >= 5 ? '🔥🔥🔥' : combo >= 3 ? '🔥🔥' : '🔥'}
        </div>
      )}

      {/* Admin: Global message banner — sits above the character circle */}
      {adminMessage && (
        <div key={adminMessage.id} style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, padding: '24px 36px', borderRadius: '22px',
          background: 'linear-gradient(135deg, rgba(20,5,40,0.96), rgba(40,10,80,0.96))',
          border: '2px solid #a259ff',
          color: '#fff', fontFamily: "'Bangers', cursive",
          fontSize: 'clamp(26px, 6.5vw, 38px)', letterSpacing: '1.5px',
          textAlign: 'center', lineHeight: 1.15,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 12px 40px rgba(162,89,255,0.55), 0 0 80px rgba(162,89,255,0.45)',
          maxWidth: 'min(620px, 90vw)',
          animation: 'broadcastIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), broadcastGlow 2s ease-in-out 0.5s infinite',
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: '10px',
            color: '#a259ff', letterSpacing: '3px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <span style={{
              display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
              background: '#a259ff', boxShadow: '0 0 10px #a259ff',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
            BROADCAST FROM TIMUR
          </div>
          <div style={{ wordBreak: 'break-word' }}>📢 {adminMessage.text}</div>
        </div>
      )}

      {/* Admin: Scheduled event countdown */}
      {adminSchedule && !adminEvent.active && <AdminCountdown schedule={adminSchedule} />}

      {/* Admin: LIVE status badge — compact pill, top-left */}
      {adminEvent.active && (
        <div style={{
          position: 'absolute', top: '12px', left: '12px', zIndex: 25,
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 12px 6px 10px', borderRadius: '999px',
          background: 'linear-gradient(135deg, #ff0040, #d10030)',
          color: '#fff', fontFamily: "'Bangers', cursive", fontSize: '13px',
          letterSpacing: '1.5px', textTransform: 'uppercase',
          boxShadow: '0 2px 12px rgba(255,0,64,0.5), 0 0 0 1px rgba(255,255,255,0.15)',
          animation: 'liveBadgeIn 0.3s ease-out',
        }}>
          <span style={{
            display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
            background: '#fff', boxShadow: '0 0 6px #fff',
            animation: 'liveDot 1.2s ease-in-out infinite',
          }} />
          <span style={{ fontWeight: 700 }}>ADMIN ABUSE LIVE</span>
          {adminEvent.name && (
            <>
              <span style={{ opacity: 0.5, fontSize: '11px' }}>·</span>
              <span style={{ fontSize: '12px', opacity: 0.95, letterSpacing: '1px' }}>{adminEvent.name}</span>
            </>
          )}
        </div>
      )}

      {/* Admin: Vote popup — hidden while a bottom panel (shop/skins/etc) is open
          so the YES/NO buttons don't block shop buy buttons. */}
      {adminVote && !votedOn[adminVote.id] && !activePanel && (
        <div style={{
          position: 'absolute', top: '90px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 45, padding: '14px 18px', borderRadius: '16px',
          background: 'rgba(15,5,35,0.98)', border: '2px solid #a259ff',
          boxShadow: '0 0 40px rgba(162,89,255,0.5)', minWidth: '280px', maxWidth: '90vw',
        }}>
          <div style={{ fontSize: '15px', color: '#fff', marginBottom: '10px', textAlign: 'center' }}>
            🗳 {adminVote.question}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { submitVote(adminVote.id, 'yes'); setVotedOn(p => ({ ...p, [adminVote.id]: true })); }} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: '#00e87a', color: '#000', fontFamily: "'Bangers', cursive", fontSize: '16px',
            }}>YES</button>
            <button onClick={() => { submitVote(adminVote.id, 'no'); setVotedOn(p => ({ ...p, [adminVote.id]: true })); }} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: '#ff4a4a', color: '#fff', fontFamily: "'Bangers', cursive", fontSize: '16px',
            }}>NO</button>
          </div>
        </div>
      )}

      {/* Admin: Effect renderers */}
      {/* Wrapper makes all DJ effects non-interactive so clicks pass through to the character.
          Individual elements inside (catchable cats, coin pickups) re-enable pointer-events. */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {adminEffects.disco && <AdminEffectDisco />}
        {adminEffects.fireworks && <AdminEffectFireworks setGame={setGame} />}
        {adminEffects.poop && <AdminEffectPoop />}
        {adminEffects.rocket && <AdminEffectRocket />}
        {adminEffects.cats && <AdminEffectCats setGame={setGame} />}
        {adminEffects.tsunami && <AdminEffectTsunami setGame={setGame} />}
        {adminEffects.lightning && <AdminEffectLightning />}
        {adminEffects.bomb && <AdminEffectBomb setGame={setGame} />}
        {adminEffects.crowd && <AdminEffectCrowd />}
      </div>

      {/* Dark backdrop behind character */}
      <div style={{
        position: 'absolute', top: '46%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(380px, 80vw)', height: 'min(380px, 80vw)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 2,
        background: `radial-gradient(circle, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.15) 75%, transparent 100%)`,
        boxShadow: `0 0 60px 20px rgba(0,0,0,0.3)`,
      }} />
      {/* Glow rings around character */}
      <div style={styles.glowRing} />
      <div style={styles.glowRing2} />

      {/* Character (tappable) */}
      <div style={styles.character} onClick={handleTap} onTouchStart={(e) => { e.preventDefault(); handleTap(e); }}>
        <img src={`/characters/${currentSkin.file}`} alt={currentSkin.name} style={styles.characterImg}
          draggable={false} />
      </div>
      <div style={styles.skinLabel}>{currentSkin.name}</div>

      {/* Tap popups */}
      {popups.map(p => {
        const age = (Date.now() - p.born) / 800;
        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: `calc(50% + ${p.x - 100}px)`,
            top: `calc(50% + ${p.y - 100 - age * 60}px)`,
            color: '#fff', fontSize: '28px', fontWeight: 'bold',
            fontFamily: "'Bungee Shade', cursive",
            textShadow: '0 0 20px rgba(255,215,0,0.9), 0 0 40px rgba(255,100,0,0.6), 2px 2px 0 #000',
            opacity: 1 - age, pointerEvents: 'none', zIndex: 12,
          }}>{p.text}</div>
        );
      })}

      {/* Coin/spark particles */}
      {particles.map(p => {
        const age = (Date.now() - p.born) / 1000;
        const x = p.x + p.vx * age * 30;
        const y = p.y + (p.vy * age * 30) + (age * age * 200);
        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: `calc(50% + ${x - 100}px)`,
            top: `calc(50% + ${y - 100}px)`,
            fontSize: p.type === 'coin' ? '16px' : '10px',
            opacity: 1 - age, pointerEvents: 'none', zIndex: 11,
            color: p.type === 'spark' ? '#fff' : undefined,
          }}>
            {p.type === 'coin' ? '🪙' : '✦'}
          </div>
        );
      })}

      {/* Golden Brain */}
      {goldenBrain && (
        <div onClick={(e) => { e.stopPropagation(); handleGoldenTap(); }} style={{
          position: 'absolute', left: goldenBrain.x + '%', top: goldenBrain.y + '%',
          fontSize: '48px', cursor: 'pointer', zIndex: 25,
          filter: 'drop-shadow(0 0 20px gold)',
          animation: 'pulse 0.5s ease-in-out infinite',
        }}>🧠</div>
      )}

      {/* Bottom Navigation */}
      <div style={styles.bottomNav} data-nav onClick={e => e.stopPropagation()}>
        {[
          { id: 'shop', label: 'Shop', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> },
          { id: 'skins', label: 'Skins', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          { id: 'codes', label: 'Codes', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> },
          { id: 'board', label: 'Board', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15l-2 5l9-13h-5l2-5l-9 13h5z"/></svg> },
          { id: 'achieve', label: 'Awards', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
          { id: 'reflex', label: 'Reflex', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
          { id: 'ascend', label: 'Ascend', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/><polyline points="18 9 12 3 6 9"/><line x1="3" y1="21" x2="21" y2="21"/></svg> },
        ].map(tab => {
          const active = activePanel === tab.id;
          return (
            <button key={tab.id} style={{
              ...styles.navBtn,
              color: active ? '#ffd700' : 'rgba(230,220,255,0.78)',
              background: active
                ? 'linear-gradient(180deg, rgba(162,89,255,0.35), rgba(106,13,173,0.45))'
                : 'transparent',
              boxShadow: active
                ? 'inset 0 1px 0 rgba(255,215,0,0.5), 0 0 14px rgba(255,215,0,0.25)'
                : 'none',
              filter: active ? 'drop-shadow(0 0 6px rgba(255,215,0,0.6))' : 'none',
            }} onClick={() => {
              if (tab.id === 'reflex') { startReflex(); return; }
              setActivePanel(activePanel === tab.id ? null : tab.id);
            }}>
              {tab.svg}
              <span style={{
                fontSize: '9px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                textShadow: active ? '0 0 6px rgba(255,215,0,0.6)' : 'none',
              }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============ PANELS ============ */}

      {/* SHOP PANEL */}
      {activePanel === 'shop' && (
        <div style={styles.panel} data-panel onClick={e => e.stopPropagation()}>
          <div style={styles.panelTitle}>SHOP</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
            {['auto', 'tap', 'efficiency', 'synergy'].map(t => (
              <button key={t} onClick={() => setShopTab(t)} style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: shopTab === t ? '#6a0dad' : 'rgba(255,255,255,0.1)',
                color: '#fff', fontFamily: "'Bangers', cursive", fontSize: '13px',
              }}>{t === 'auto' ? 'Auto-Clickers' : t === 'tap' ? 'Tap Power' : t === 'efficiency' ? 'Efficiency' : 'Synergies'}</button>
            ))}
          </div>

          {shopTab === 'auto' && AUTO_CLICKERS.map(ac => {
            const owned = game.autoClickers[ac.id] || 0;
            const cost = getUpgradeCost(ac.baseCost, owned);
            const canBuy = game.points >= cost;
            const hasEff = game.efficiencyUpgrades.includes(ac.id);
            return (
              <div key={ac.id} style={styles.shopItem}>
                <div>
                  <div style={{ color: '#fff', fontSize: '15px' }}>
                    {ac.name} {hasEff && '⭐'} <span style={{ color: '#aaa', fontSize: '12px' }}>x{owned}</span>
                  </div>
                  <div style={{ color: '#aaa', fontSize: '11px' }}>+{formatNumber(ac.cps * (hasEff ? 2 : 1))}/sec</div>
                </div>
                <button style={styles.buyBtn(canBuy)} onClick={() => buyAutoClicker(ac)}>
                  {formatNumber(cost)}
                </button>
              </div>
            );
          })}

          {shopTab === 'tap' && TAP_UPGRADES.map(t => {
            const owned = game.tapUpgrades[t.id] || 0;
            const cost = getUpgradeCost(t.baseCost, owned);
            const canBuy = game.points >= cost;
            return (
              <div key={t.id} style={styles.shopItem}>
                <div>
                  <div style={{ color: '#fff', fontSize: '15px' }}>{t.name} <span style={{ color: '#aaa', fontSize: '12px' }}>x{owned}</span></div>
                  <div style={{ color: '#aaa', fontSize: '11px' }}>+{t.power}/tap</div>
                </div>
                <button style={styles.buyBtn(canBuy)} onClick={() => buyTapUpgrade(t)}>
                  {formatNumber(cost)}
                </button>
              </div>
            );
          })}

          {shopTab === 'efficiency' && EFFICIENCY_UPGRADES.map(eff => {
            const bought = game.efficiencyUpgrades.includes(eff.target);
            const canBuy = !bought && game.points >= eff.cost;
            return (
              <div key={eff.id} style={styles.shopItem}>
                <div>
                  <div style={{ color: '#fff', fontSize: '15px' }}>{eff.name}</div>
                  <div style={{ color: '#aaa', fontSize: '11px' }}>Doubles {AUTO_CLICKERS.find(a => a.id === eff.target)?.name} output</div>
                </div>
                <button style={styles.buyBtn(canBuy)} onClick={() => buyEfficiency(eff)}>
                  {bought ? '✅' : formatNumber(eff.cost)}
                </button>
              </div>
            );
          })}

          {shopTab === 'synergy' && synergies.map((syn, i) => (
            <div key={i} style={{ ...styles.shopItem, border: syn.active ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <div style={{ color: syn.active ? '#ffd700' : '#fff', fontSize: '15px' }}>
                  {syn.active ? syn.name : '???'}
                </div>
                <div style={{ color: '#aaa', fontSize: '11px' }}>{syn.active ? syn.desc : syn.hint}</div>
              </div>
              <div style={{ fontSize: '20px' }}>{syn.active ? '✨' : '🔒'}</div>
            </div>
          ))}
        </div>
      )}

      {/* SKINS PANEL */}
      {activePanel === 'skins' && (
        <div style={styles.panel} data-panel onClick={e => e.stopPropagation()}>
          <div style={styles.panelTitle}>SKINS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {CHARACTERS.map((ch, idx) => {
              const unlocked = game.unlockedSkins.includes(idx);
              const equipped = game.equippedSkin === idx;
              return (
                <div key={idx} onClick={() => unlocked && setGame(prev => ({ ...prev, equippedSkin: idx }))} style={{
                  padding: '8px', borderRadius: '12px', textAlign: 'center', cursor: unlocked ? 'pointer' : 'default',
                  background: equipped ? 'rgba(106,13,173,0.4)' : 'rgba(255,255,255,0.05)',
                  border: equipped ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.1)',
                  opacity: unlocked ? 1 : 0.5,
                }}>
                  <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {unlocked ? (
                      <img src={`/characters/${ch.file}`} alt={ch.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', fontSize: '28px' }}>🔒</div>
                    )}
                  </div>
                  <div style={{ color: '#fff', fontSize: '13px', lineHeight: 1.3, textShadow: '1px 1px 2px #000', fontWeight: 'bold' }}>{ch.name}</div>
                  <div style={{ color: ch.rarity === 'Legendary' ? '#ffd700' : ch.rarity === 'Brainrot God' ? '#ff00ff' : ch.rarity === 'OG' ? '#00ff00' : ch.rarity === 'Secret' ? '#ff4500' : '#aaa', fontSize: '10px', marginTop: '2px' }}>
                    {ch.rarity} | {ch.mult}x
                  </div>
                  {!unlocked && <div style={{ color: '#aaa', fontSize: '10px' }}>{formatNumber(ch.unlock)} pts</div>}
                  {equipped && <div style={{ color: '#ffd700', fontSize: '11px', fontWeight: 'bold' }}>EQUIPPED</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CODES PANEL */}
      {activePanel === 'codes' && (
        <div style={styles.panel} data-panel onClick={e => e.stopPropagation()}>
          <div style={styles.panelTitle}>CHEAT CODES</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input value={codeInput} onChange={e => setCodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitCode()}
              placeholder='Try something brainrot-related...'
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid #6a0dad',
                background: 'rgba(0,0,0,0.5)', color: '#fff', fontFamily: "'Bangers', cursive",
                fontSize: '16px', outline: 'none',
              }} />
            <button onClick={submitCode} style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6a0dad, #9b59b6)', color: '#fff',
              fontFamily: "'Bangers', cursive", fontSize: '16px',
            }}>GO</button>
          </div>
          {codeResult && (
            <div style={{
              textAlign: 'center', padding: '8px', borderRadius: '8px', fontSize: '18px',
              color: codeResult.success ? '#0f0' : '#f00',
              textShadow: codeResult.success ? '0 0 10px #0f0' : '0 0 10px #f00',
            }}>{codeResult.msg}</div>
          )}
          <div style={{ color: '#aaa', fontSize: '12px', textAlign: 'center' }}>
            Used: {game.usedCodes.length}/5
          </div>
        </div>
      )}

      {/* LEADERBOARD PANEL */}
      {activePanel === 'board' && (
        <div style={styles.panel} data-panel onClick={e => e.stopPropagation()}>
          <div style={styles.panelTitle}>LEADERBOARD</div>
          {fullBoard.map((entry, i) => (
            <div key={i} style={{
              ...styles.shopItem,
              border: entry.isPlayer ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.1)',
              background: entry.isPlayer ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: i < 3 ? '#ffd700' : '#aaa', fontSize: '18px', width: '30px' }}>#{i + 1}</span>
                <div>
                  <div style={{ color: entry.isPlayer ? '#ffd700' : '#fff', fontSize: '15px' }}>
                    {entry.name} {entry.isPlayer && '(You)'}
                  </div>
                </div>
              </div>
              <div style={{ color: '#ffd700', fontSize: '14px' }}>{formatNumber(entry.pts)}</div>
            </div>
          ))}
          <button onClick={() => {
            navigator.clipboard?.writeText(`I scored ${formatNumber(game.lifetimePoints)} in Brainrot Clicker! Can you beat me?`);
          }} style={{
            width: '100%', padding: '10px', marginTop: '12px', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, #6a0dad, #9b59b6)', color: '#fff',
            fontFamily: "'Bangers', cursive", fontSize: '16px', cursor: 'pointer',
          }}>📋 Share Score</button>
        </div>
      )}

      {/* ACHIEVEMENTS PANEL */}
      {activePanel === 'achieve' && (
        <div style={styles.panel} data-panel onClick={e => e.stopPropagation()}>
          <div style={styles.panelTitle}>ACHIEVEMENTS ({game.achievements.length}/20)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {ACHIEVEMENTS.map(a => {
              const unlocked = game.achievements.includes(a.id);
              return (
                <div key={a.id} style={{
                  padding: '8px 4px', borderRadius: '8px', textAlign: 'center',
                  background: unlocked ? 'rgba(106,13,173,0.3)' : 'rgba(255,255,255,0.05)',
                  border: unlocked ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: '20px' }}>{unlocked ? a.icon : '🔒'}</div>
                  <div style={{ color: unlocked ? '#fff' : '#666', fontSize: '9px' }}>{a.name}</div>
                  <div style={{ color: '#aaa', fontSize: '8px' }}>{a.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ASCEND PANEL */}
      {activePanel === 'ascend' && (
        <div style={styles.panel} data-panel onClick={e => e.stopPropagation()}>
          <div style={styles.panelTitle}>ASCENSION</div>
          <div style={{ textAlign: 'center', color: '#aaa', marginBottom: '12px' }}>
            <p>Prestige Count: {game.prestigeCount}</p>
            <p>Brain Cells: {game.brainCells} (+{game.brainCells * 5}% boost)</p>
            <p style={{ marginTop: '8px' }}>Need 1,000,000 lifetime pts to ascend</p>
            <p>Current: {formatNumber(game.lifetimePoints)}</p>
            {canAscend && <p style={{ color: '#ffd700', marginTop: '8px' }}>You will gain {brainCellsToGain} Brain Cells!</p>}
          </div>
          {canAscend ? (
            !ascendConfirm ? (
              <button onClick={() => setAscendConfirm(true)} style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #ffd700',
                background: 'linear-gradient(135deg, #6a0dad, #9b59b6)', color: '#fff',
                fontFamily: "'Bangers', cursive", fontSize: '22px', cursor: 'pointer',
                boxShadow: '0 0 20px rgba(106,13,173,0.5)',
              }}>🧬 ASCEND</button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#ff4444', fontSize: '16px', marginBottom: '12px' }}>
                  You will lose everything.<br/>Gain {brainCellsToGain} Brain Cells (+{brainCellsToGain * 5}% boost)
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={doAscend} style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: '#e74c3c', color: '#fff', fontFamily: "'Bangers', cursive", fontSize: '16px',
                  }}>CONFIRM</button>
                  <button onClick={() => setAscendConfirm(false)} style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: '#555', color: '#fff', fontFamily: "'Bangers', cursive", fontSize: '16px',
                  }}>CANCEL</button>
                </div>
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', color: '#555', fontSize: '16px' }}>
              Not enough lifetime points yet
            </div>
          )}
        </div>
      )}

      {/* ============ OVERLAYS ============ */}

      {/* Settings overlay */}
      {settingsOpen && (
        <div style={{ ...styles.overlay, zIndex: 40 }} onClick={() => setSettingsOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'rgba(20,20,40,0.95)', padding: '24px', borderRadius: '16px',
            border: '1px solid #6a0dad', minWidth: '280px',
          }}>
            <div style={{ fontSize: '24px', color: '#fff', textAlign: 'center', marginBottom: '16px' }}>Settings</div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#aaa', fontSize: '14px' }}>SFX Volume</label>
              <input type="range" min="0" max="100" value={soundEngine.sfxVolume * 100}
                onChange={e => { soundEngine.sfxVolume = e.target.value / 100; setGame(p => ({ ...p })); }}
                style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#aaa', fontSize: '14px' }}>Username</label>
              <input value={game.username} onChange={e => setGame(prev => ({ ...prev, username: e.target.value }))}
                style={{
                  width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #6a0dad',
                  background: 'rgba(0,0,0,0.5)', color: '#fff', fontFamily: "'Bangers', cursive",
                }} />
            </div>
            <button onClick={() => {
              if (confirm('Reset ALL game data? This cannot be undone!')) {
                localStorage.removeItem('brainrot_save');
                setGame(defaultState());
                setScreen('start');
                setSettingsOpen(false);
                setActivePanel(null);
              }
            }} style={{
              width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
              background: '#e74c3c', color: '#fff', fontFamily: "'Bangers', cursive",
              fontSize: '16px', cursor: 'pointer', marginTop: '8px',
            }}>Reset Game</button>
            <button onClick={() => {
              localStorage.removeItem('brainrot_player');
              setPlayer(null);
              setSettingsOpen(false);
              setActivePanel(null);
              setScreen('login');
            }} style={{
              width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: '#fff', fontFamily: "'Bangers', cursive",
              fontSize: '16px', cursor: 'pointer', marginTop: '8px',
            }}>Logout</button>
            <a href="https://timur.world" style={{
              display: 'block', width: '100%', padding: '10px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: 'rgba(255,255,255,0.7)',
              fontFamily: "'Bangers', cursive", fontSize: '14px',
              textAlign: 'center', textDecoration: 'none',
              marginTop: '8px', boxSizing: 'border-box',
            }}>← Back to timur.world</a>
          </div>
        </div>
      )}

      {/* Skin celebration */}
      {skinCelebration && (
        <div style={styles.overlay}>
          <div style={{ fontSize: '28px', color: '#ffd700', textShadow: '0 0 30px rgba(255,215,0,0.8)', marginBottom: '12px' }}>
            SKIN UNLOCKED!
          </div>
          <div style={{
            width: '120px', height: '120px', borderRadius: '16px', overflow: 'hidden',
            filter: `drop-shadow(0 0 30px ${skinCelebration.color})`,
            animation: 'bounceIn 0.5s ease-out',
          }}>
            <img src={`/characters/${skinCelebration.file}`} alt={skinCelebration.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: '20px', color: '#fff', marginTop: '8px' }}>{skinCelebration.name}</div>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              fontSize: '16px',
              animation: `confetti ${1 + Math.random()}s ease-out forwards`,
            }}>
              {['🎉', '✨', '⭐', '💫', '🎊'][i % 5]}
            </div>
          ))}
        </div>
      )}

      {/* Coin gift celebration — gift box flies in → wiggles → bursts open → reveals amount */}
      {coinCelebration && (
        <div key={coinCelebration.id} style={{
          position: 'absolute', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.2), rgba(0,0,0,0.78) 70%)',
          backdropFilter: 'blur(4px)', pointerEvents: 'none',
          animation: 'coinFlash 0.4s ease-out',
        }}>
          {/* "From Timur" header */}
          <div style={{
            position: 'absolute', top: '14%', left: '50%', transform: 'translateX(-50%)',
            fontFamily: "'Press Start 2P', monospace", fontSize: '11px',
            color: '#ffd700', letterSpacing: '3px',
            textShadow: '0 0 12px rgba(255,215,0,0.7)',
            animation: 'fadeInDown 0.5s ease-out 0.1s both',
            whiteSpace: 'nowrap',
          }}>
            🎁 A GIFT FROM TIMUR 🎁
          </div>

          {/* Stage container — holds box (phase 1) and reveal (phase 2) */}
          <div style={{
            position: 'relative',
            width: 'min(280px, 70vw)', height: 'min(280px, 70vw)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Gift box — flies in, wiggles, then explodes */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(110px, 28vw, 180px)',
              animation: 'giftFly 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both, giftShake 0.5s ease-in-out 0.9s 2, giftBurst 0.4s ease-out 1.95s both',
              filter: 'drop-shadow(0 12px 30px rgba(255,180,0,0.6)) drop-shadow(0 0 40px rgba(255,215,0,0.5))',
              transformOrigin: 'center',
            }}>
              🎁
            </div>

            {/* Burst rays — fire when box opens */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,235,100,0.9) 0%, rgba(255,180,0,0.5) 30%, transparent 70%)',
              opacity: 0,
              animation: 'burstRays 0.6s ease-out 2.0s both',
            }} />

            {/* Amount reveal — appears as box bursts */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: 0,
              animation: 'amountReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 2.15s both',
            }}>
              <div style={{
                fontFamily: "'Bungee Shade', cursive",
                fontSize: 'clamp(44px, 12vw, 84px)',
                color: '#fff', lineHeight: 1, textAlign: 'center',
                textShadow: '0 0 20px #ffd700, 0 0 40px #ff9500, 4px 4px 0 #6a0d0d',
              }}>
                +{coinCelebration.amount.toLocaleString()}
              </div>
              <div style={{
                fontFamily: "'Bangers', cursive", fontSize: 'clamp(20px, 4.5vw, 28px)',
                color: '#ffd700', letterSpacing: '2px', marginTop: '6px',
                textShadow: '0 0 12px rgba(255,215,0,0.8)',
              }}>
                🪙 COINS 🪙
              </div>
            </div>
          </div>

          {/* Falling coins — only after box opens */}
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: '40%', left: '50%',
              fontSize: 24 + (i % 4) * 6,
              opacity: 0,
              animation: `coinBurst ${1.6 + (i % 5) * 0.2}s ease-out 2.0s forwards`,
              ['--burst-angle']: `${(i / 24) * 360}deg`,
              ['--burst-dist']: `${120 + (i % 4) * 40}px`,
              filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.8))',
            }}>🪙</div>
          ))}
        </div>
      )}

      {/* Skin gift celebration — gift box flies in → opens → reveals new character */}
      {skinGiftCelebration && (
        <div key={skinGiftCelebration.id} style={{
          position: 'absolute', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(ellipse at center, ${skinGiftCelebration.skin.color}40, rgba(0,0,0,0.78) 70%)`,
          backdropFilter: 'blur(4px)', pointerEvents: 'none',
          animation: 'coinFlash 0.4s ease-out',
        }}>
          {/* Header */}
          <div style={{
            position: 'absolute', top: '14%', left: '50%', transform: 'translateX(-50%)',
            fontFamily: "'Press Start 2P', monospace", fontSize: '11px',
            color: skinGiftCelebration.skin.color, letterSpacing: '3px',
            textShadow: `0 0 12px ${skinGiftCelebration.skin.color}`,
            animation: 'fadeInDown 0.5s ease-out 0.1s both',
            whiteSpace: 'nowrap',
          }}>
            🎁 A GIFT FROM TIMUR 🎁
          </div>

          {/* Stage container */}
          <div style={{
            position: 'relative',
            width: 'min(280px, 70vw)', height: 'min(280px, 70vw)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Gift box — flies in, shakes, bursts */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(110px, 28vw, 180px)',
              animation: 'giftFly 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both, giftShake 0.5s ease-in-out 0.9s 2, giftBurst 0.4s ease-out 1.95s both',
              filter: `drop-shadow(0 12px 30px ${skinGiftCelebration.skin.color}99) drop-shadow(0 0 40px ${skinGiftCelebration.skin.color})`,
              transformOrigin: 'center',
            }}>
              🎁
            </div>

            {/* Burst rays */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${skinGiftCelebration.skin.color}E6 0%, ${skinGiftCelebration.skin.color}80 30%, transparent 70%)`,
              opacity: 0,
              animation: 'burstRays 0.6s ease-out 2.0s both',
            }} />

            {/* Character reveal — appears as box bursts */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: 0,
              animation: 'amountReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 2.15s both',
            }}>
              <div style={{
                width: 'min(180px, 50vw)', height: 'min(180px, 50vw)',
                filter: `drop-shadow(0 0 20px ${skinGiftCelebration.skin.color}) drop-shadow(0 0 40px ${skinGiftCelebration.skin.color}88)`,
                animation: 'skinSpin 3s ease-in-out 2.4s infinite',
              }}>
                <img src={`/characters/${skinGiftCelebration.skin.file}`} alt={skinGiftCelebration.skin.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{
                position: 'absolute', bottom: '-12%', left: '50%', transform: 'translateX(-50%)',
                fontFamily: "'Bungee Shade', cursive",
                fontSize: 'clamp(18px, 4.5vw, 28px)',
                color: '#fff', whiteSpace: 'nowrap',
                textShadow: `0 0 14px ${skinGiftCelebration.skin.color}, 0 0 28px ${skinGiftCelebration.skin.color}aa, 3px 3px 0 #000`,
              }}>
                {skinGiftCelebration.skin.name}
              </div>
            </div>
          </div>

          {/* Tagline below */}
          <div style={{
            position: 'absolute', bottom: '18%', left: '50%', transform: 'translateX(-50%)',
            fontFamily: "'Bangers', cursive", fontSize: 'clamp(16px, 4vw, 22px)',
            color: skinGiftCelebration.skin.color, letterSpacing: '2px',
            textShadow: `0 0 12px ${skinGiftCelebration.skin.color}`,
            opacity: 0,
            animation: 'fadeInDown 0.5s ease-out 2.6s both',
            whiteSpace: 'nowrap',
          }}>
            ✨ NEW SKIN UNLOCKED ✨
          </div>

          {/* Sparkle burst */}
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: '50%', left: '50%',
              fontSize: 16 + (i % 4) * 6,
              opacity: 0,
              animation: `coinBurst ${1.6 + (i % 5) * 0.2}s ease-out 2.0s forwards`,
              ['--burst-angle']: `${(i / 24) * 360}deg`,
              ['--burst-dist']: `${130 + (i % 4) * 40}px`,
              filter: `drop-shadow(0 0 8px ${skinGiftCelebration.skin.color})`,
            }}>{['✨', '⭐', '💫', '🌟'][i % 4]}</div>
          ))}
        </div>
      )}

      {/* Achievement toast */}
      {achievementToast && (
        <div style={{
          position: 'absolute', top: '120px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)', border: '2px solid #ffd700', borderRadius: '12px',
          padding: '10px 20px', zIndex: 45, display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'slideDown 0.3s ease-out',
        }}>
          <span style={{ fontSize: '24px' }}>{achievementToast.icon}</span>
          <div>
            <div style={{ color: '#ffd700', fontSize: '14px' }}>Achievement Unlocked!</div>
            <div style={{ color: '#fff', fontSize: '12px' }}>{achievementToast.name}</div>
          </div>
        </div>
      )}

      {/* Notification opt-in prompt */}
      {showNotifPrompt && (
        <div style={{
          position: 'absolute', bottom: 'calc(56px + 16px)', left: '50%', transform: 'translateX(-50%)',
          width: 'min(360px, 92vw)', zIndex: 60,
          background: 'linear-gradient(135deg, rgba(20,5,40,0.97), rgba(40,10,80,0.97))',
          border: '2px solid #a259ff', borderRadius: '16px', padding: '16px 18px',
          boxShadow: '0 12px 40px rgba(162,89,255,0.5), 0 0 80px rgba(162,89,255,0.3)',
          color: '#fff', animation: 'slideDown 0.35s ease-out',
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: '9px',
            color: '#a259ff', letterSpacing: '2px', marginBottom: '8px',
          }}>🔔 NEVER MISS A LIVE EVENT</div>
          <div style={{ fontFamily: "'Bangers', cursive", fontSize: '17px', lineHeight: 1.3, marginBottom: '12px' }}>
            Get a ping when Timur runs an Admin Abuse, gifts you coins, or sends a broadcast.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={async () => {
              await requestPermission();
              setShowNotifPrompt(false);
            }} style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #a259ff, #6a0dad)', color: '#fff',
              fontFamily: "'Bangers', cursive", fontSize: '15px', letterSpacing: '1px',
            }}>🔔 TURN ON</button>
            <button onClick={() => { rememberOptInDismissed(); setShowNotifPrompt(false); }} style={{
              padding: '10px 14px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
              background: 'transparent', color: 'rgba(255,255,255,0.7)',
              fontFamily: "'Bangers', cursive", fontSize: '14px',
            }}>Not now</button>
          </div>
        </div>
      )}

      {/* First-run onboarding tutorial — 3 steps */}
      {tutorialStep !== null && (
        <TutorialOverlay
          step={tutorialStep}
          onNext={() => setTutorialStep((s) => {
            if (s === 2) {
              localStorage.setItem('brainrot_tutorial_done', '1');
              return null;
            }
            return (s ?? 0) + 1;
          })}
          onSkip={() => { setTutorialStep(null); localStorage.setItem('brainrot_tutorial_done', '1'); }}
        />
      )}

      {/* Story popup */}
      {storyPopup && (
        <div style={styles.overlay}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>{storyPopup.emoji}</div>
          <div style={{
            fontSize: '28px', color: '#ffd700', textAlign: 'center',
            textShadow: '0 0 30px rgba(255,215,0,0.8)', maxWidth: '300px',
          }}>
            {storyPopup.text}
          </div>
        </div>
      )}

      {/* Daily reward */}
      {dailyReward && (
        <div style={styles.overlay} onClick={() => {
          setGame(prev => ({
            ...prev,
            points: prev.points + dailyReward.reward,
            lifetimePoints: prev.lifetimePoints + dailyReward.reward,
          }));
          soundEngine.play('unlock');
          setDailyReward(null);
        }}>
          <div style={{ fontSize: '24px', color: '#ff4500' }}>
            🔥 Day {dailyReward.day + 1} Streak! 🔥
          </div>
          <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
            {DAILY_REWARDS.map((_, i) => (
              <div key={i} style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: i <= dailyReward.day ? 'rgba(106,13,173,0.5)' : 'rgba(255,255,255,0.1)',
                border: i === dailyReward.day ? '2px solid #ffd700' : '1px solid #333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', color: i <= dailyReward.day ? '#0f0' : '#555',
              }}>{i < dailyReward.day ? '✅' : i === dailyReward.day ? '🎁' : '🔒'}</div>
            ))}
          </div>
          <div style={{ fontSize: '36px', color: '#ffd700', textShadow: '0 0 20px rgba(255,215,0,0.8)' }}>
            +{formatNumber(dailyReward.reward)} pts
          </div>
          {dailyReward.cycle > 1 && (
            <div style={{ color: '#ff69b4', fontSize: '14px' }}>Cycle {dailyReward.cycle} ({dailyReward.cycle}x rewards!)</div>
          )}
          <div style={{ color: '#aaa', fontSize: '14px', marginTop: '12px' }}>Tap to claim</div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes ringPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
        }
        @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes emoteFloat {
          0%   { transform: translateX(-50%) translateY(0)    scale(0.5); opacity: 0; }
          15%  { transform: translateX(-50%) translateY(-30px) scale(1.2); opacity: 1; }
          40%  { transform: translateX(-50%) translateY(-110px) scale(1); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-300px) scale(0.8); opacity: 0; }
        }
        @keyframes bounceIn { from { transform: scale(0) rotate(-10deg); } to { transform: scale(1) rotate(0); } }
        @keyframes confetti {
          from { transform: translateY(0) rotate(0); opacity: 1; }
          to { transform: translateY(100px) rotate(720deg); opacity: 0; }
        }
        @keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(5deg); }
          75% { transform: translateY(10px) rotate(-3deg); }
        }
        @keyframes bgGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes broadcastIn {
          0% { transform: translate(-50%, -40px) scale(0.85); opacity: 0; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
        @keyframes broadcastGlow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(162,89,255,0.5), 0 0 60px rgba(162,89,255,0.4); }
          50% { box-shadow: 0 0 0 1px rgba(255,255,255,0.12), 0 12px 40px rgba(162,89,255,0.7), 0 0 80px rgba(162,89,255,0.6); }
        }
        @keyframes liveBadgeIn {
          from { transform: translateY(-12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes coinFlash {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes giftFly {
          0% { transform: translate(-120vw, -60vh) rotate(-360deg) scale(0.4); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes giftShake {
          0%, 100% { transform: rotate(0deg) scale(1); }
          15% { transform: rotate(-12deg) scale(1.05); }
          30% { transform: rotate(10deg) scale(1.05); }
          45% { transform: rotate(-8deg) scale(1.05); }
          60% { transform: rotate(8deg) scale(1.05); }
          75% { transform: rotate(-4deg) scale(1.05); }
        }
        @keyframes giftBurst {
          0% { transform: scale(1); opacity: 1; }
          40% { transform: scale(1.6); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes burstRays {
          0% { opacity: 0; transform: scale(0.3); }
          40% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(2.4); }
        }
        @keyframes amountReveal {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          70% { transform: scale(1.15) rotate(0deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes coinBurst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--burst-angle)) translateY(0) rotate(calc(-1 * var(--burst-angle)));
          }
          15% { opacity: 1; }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--burst-angle)) translateY(calc(-1 * var(--burst-dist))) rotate(calc(-1 * var(--burst-angle) + 720deg));
          }
        }
        @keyframes skinSpin {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.08) rotate(5deg); }
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(106,13,173,0.6); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(106,13,173,0.9); }
      `}</style>
    </div>
  );
}
