import React, { useState, useEffect, useRef, useCallback } from 'react';
import { registerPlayer, loginPlayer, saveGameCloud, loadGameCloud, getLeaderboard } from './supabase.js';
import { subscribeToAdmin, submitVote } from './adminBridge.js';

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
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
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
      padding: '6px 16px', background: 'rgba(162,89,255,0.85)', color: '#fff',
      fontFamily: "'Bangers', cursive", fontSize: '14px', textAlign: 'center',
    }}>⚡ ADMIN ABUSE IN {text} — {schedule.event_name}</div>
  );
}

function AdminEffectDisco() {
  return (<>
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, #ff00ff30, #00ffff30, #ffff0030, #ff00ff30)', backgroundSize: '400% 400%', animation: 'discoWash 2s linear infinite', zIndex: 15, pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', fontSize: '80px', zIndex: 16, animation: 'discoSwing 2s ease-in-out infinite' }}>🪩</div>
    <style>{`@keyframes discoWash { 0% { background-position: 0% 0%; } 100% { background-position: 400% 400%; } } @keyframes discoSwing { 0%,100% { transform: translateX(-50%) rotate(-20deg); } 50% { transform: translateX(-50%) rotate(20deg); } }`}</style>
  </>);
}
function AdminEffectFireworks() {
  return (<>
    {[...Array(6)].map((_, i) => (
      <div key={i} style={{ position: 'absolute', bottom: 0, left: `${15 + i*14}%`, width: 6, height: 6, borderRadius: '50%', background: ['#ff0','#f0f','#0ff','#f00','#0f0','#f90'][i], animation: `fwRocket ${1.5 + i*0.2}s ease-out infinite`, zIndex: 15 }} />
    ))}
    <style>{`@keyframes fwRocket { 0% { bottom: 0; opacity: 1; transform: scale(1); } 70% { bottom: 60%; opacity: 1; transform: scale(1); } 100% { bottom: 60%; opacity: 0; transform: scale(10); box-shadow: 0 0 40px currentColor; } }`}</style>
  </>);
}
function AdminEffectPoop() {
  return (<>
    {[...Array(40)].map((_, i) => (
      <div key={i} style={{ position: 'absolute', top: -40, left: `${(i*5.3) % 100}%`, fontSize: `${24 + (i%3)*8}px`, animation: `poopFall ${2 + (i%4)}s linear infinite`, animationDelay: `${(i*0.15) % 3}s`, zIndex: 15 }}>💩</div>
    ))}
    <style>{`@keyframes poopFall { 0% { top: -40px; } 100% { top: 110%; } }`}</style>
  </>);
}
function AdminEffectRocket() {
  return (<div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', fontSize: '100px', animation: 'rocketLaunch 3s ease-out forwards', zIndex: 20 }}>🚀<style>{`@keyframes rocketLaunch { 0% { bottom: 0; } 100% { bottom: 120%; } }`}</style></div>);
}
function AdminEffectCats() {
  return (<>
    {[...Array(10)].map((_, i) => (
      <div key={i} style={{ position: 'absolute', top: `${8 + i*9}%`, left: -60, fontSize: '44px', animation: `catZoom ${2 + (i%3)*0.5}s linear infinite`, animationDelay: `${i*0.3}s`, zIndex: 15, filter: `hue-rotate(${i*36}deg)` }}>🐱</div>
    ))}
    <style>{`@keyframes catZoom { 0% { left: -60px; } 100% { left: 110%; } }`}</style>
  </>);
}
function AdminEffectTsunami({ setGame }) {
  useEffect(() => {
    const i = setInterval(() => setGame(prev => ({ ...prev, points: prev.points + 50, lifetimePoints: prev.lifetimePoints + 50 })), 500);
    return () => clearInterval(i);
  }, [setGame]);
  return (<>
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(180deg, transparent, rgba(0,212,255,0.5))', animation: 'tsuWave 2s ease-in-out infinite', zIndex: 14 }} />
    {[...Array(20)].map((_, i) => (
      <div key={i} style={{ position: 'absolute', bottom: `${Math.random()*60}%`, left: `${Math.random()*100}%`, fontSize: '24px', animation: `coinPop ${1+Math.random()}s ease-out infinite`, animationDelay: `${Math.random()*2}s`, zIndex: 15 }}>🪙</div>
    ))}
    <style>{`@keyframes tsuWave { 0%,100% { transform: translateY(10px); } 50% { transform: translateY(-10px); } } @keyframes coinPop { 0% { transform: scale(0); } 50% { transform: scale(1.3); } 100% { transform: scale(0); opacity: 0; } }`}</style>
  </>);
}
function AdminEffectLightning() {
  return (<>
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,226,61,0.25)', animation: 'lightFlash 0.4s ease-in-out infinite', zIndex: 14, pointerEvents: 'none' }} />
    {[...Array(6)].map((_, i) => (
      <div key={i} style={{ position: 'absolute', top: `${Math.random()*60}%`, left: `${Math.random()*90}%`, fontSize: '60px', animation: `lightStrike 0.8s ease-out infinite`, animationDelay: `${i*0.15}s`, zIndex: 15 }}>⚡</div>
    ))}
    <style>{`@keyframes lightFlash { 0%,100% { opacity: 0; } 50% { opacity: 1; } } @keyframes lightStrike { 0%,100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1.5); } }`}</style>
  </>);
}
function AdminEffectBomb() {
  const chars = ['01_noobini_lovini','02_la_romantic_grande','03_lovini_lovini_lovini','04_teddy_and_rosie','05_noobini_partini','06_cakini_and_presintini','07_lovin_rose','08_heartini_smilekur','09_dragon_partyini'];
  return (<>
    {chars.map((c, i) => {
      const angle = (i / chars.length) * 360;
      return <img key={c} src={`/characters/${c}.png`} alt="" style={{ position: 'absolute', top: '45%', left: '50%', width: 80, height: 80, zIndex: 20, animation: `bombExplode 3s ease-out forwards`, '--ang': `${angle}deg` }} />;
    })}
    <style>{`@keyframes bombExplode { 0% { transform: translate(-50%, -50%) rotate(var(--ang)) translateY(0) rotate(calc(-1 * var(--ang))); opacity: 1; } 100% { transform: translate(-50%, -50%) rotate(var(--ang)) translateY(-500px) rotate(calc(-1 * var(--ang))); opacity: 0; } }`}</style>
  </>);
}
function AdminEffectCrowd() {
  const emojis = ['🎉','🥳','🎊','👏','🙌','🎤','🔥'];
  return (<>
    <div style={{ position: 'absolute', top: '20%', left: 0, right: 0, textAlign: 'center', zIndex: 20, fontSize: '40px', fontWeight: 900, color: '#fff', textShadow: '0 0 20px #00e87a, 0 0 40px #00e87a', animation: 'crowdPulse 0.5s ease-in-out infinite', fontFamily: "'Bungee Shade', cursive", letterSpacing: '3px' }}>THE CROWD GOES WILD</div>
    {[...Array(25)].map((_, i) => (
      <div key={i} style={{ position: 'absolute', top: -40, left: `${(i*4.1) % 100}%`, fontSize: '32px', animation: `poopFall ${2 + (i%4)}s linear infinite`, animationDelay: `${(i*0.12) % 3}s`, zIndex: 15 }}>{emojis[i % emojis.length]}</div>
    ))}
    <style>{`@keyframes crowdPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }`}</style>
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

  const gameRef = useRef(game);
  const comboRef = useRef(0);
  const lastTapRef = useRef(0);
  const tapsInWindowRef = useRef([]);
  const particleIdRef = useRef(0);
  const goldenTimerRef = useRef(null);
  const cpsIntervalRef = useRef(null);

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
      onEventStateChange: (active, name) => setAdminEvent({ active, name: name || '' }),
      onEffectChange: (effectId, active) => setAdminEffects(prev => ({ ...prev, [effectId]: active })),
      onGlobalMessage: (text) => {
        setAdminMessage({ text, id: Date.now() });
        setTimeout(() => setAdminMessage(null), 8000);
      },
      onSkinGift: (skinName) => {
        const idx = CHARACTERS.findIndex(c => c.name.toLowerCase() === skinName.toLowerCase());
        if (idx < 0) return;
        const ch = CHARACTERS[idx];
        soundEngine.play('unlock');
        setSkinGiftCelebration({ skin: ch, id: Date.now() });
        // Reveal the unlock in inventory after the box opens
        setTimeout(() => {
          setGame(prev => prev.unlockedSkins.includes(idx) ? prev : { ...prev, unlockedSkins: [...prev.unlockedSkins, idx] });
        }, 2400);
        setTimeout(() => setSkinGiftCelebration(null), 5000);
      },
      onCoinGift: (amount) => {
        soundEngine.play('purchase');
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

    if (comboMult > 1) {
      setCombo(comboMult);
      soundEngine.play('combo');
      if (comboTimer) clearTimeout(comboTimer);
      setComboTimer(setTimeout(() => setCombo(0), 1200));
    }

    lastTapRef.current = now;

    const tp = calcTapPower(gameRef.current);
    let effectMult = 1;
    if (activeEffect?.type === 'frenzy') effectMult = 7;
    if (activeEffect?.type === 'tapstorm') effectMult = 20;
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
    const owned = game.autoClickers[ac.id] || 0;
    const cost = getUpgradeCost(ac.baseCost, owned);
    if (game.points < cost) return;
    soundEngine.play('purchase');
    setGame(prev => ({
      ...prev,
      points: prev.points - cost,
      autoClickers: { ...prev.autoClickers, [ac.id]: (prev.autoClickers[ac.id] || 0) + 1 },
      totalUpgrades: prev.totalUpgrades + 1,
    }));
  };

  const buyTapUpgrade = (t) => {
    const owned = game.tapUpgrades[t.id] || 0;
    const cost = getUpgradeCost(t.baseCost, owned);
    if (game.points < cost) return;
    soundEngine.play('purchase');
    setGame(prev => ({
      ...prev,
      points: prev.points - cost,
      tapUpgrades: { ...prev.tapUpgrades, [t.id]: (prev.tapUpgrades[t.id] || 0) + 1 },
      totalUpgrades: prev.totalUpgrades + 1,
    }));
  };

  const buyEfficiency = (eff) => {
    if (game.efficiencyUpgrades.includes(eff.target)) return;
    if (game.points < eff.cost) return;
    soundEngine.play('purchase');
    setGame(prev => ({
      ...prev,
      points: prev.points - eff.cost,
      efficiencyUpgrades: [...prev.efficiencyUpgrades, eff.target],
      totalUpgrades: prev.totalUpgrades + 1,
    }));
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
      background: 'linear-gradient(90deg, rgba(106,13,173,0.7), rgba(0,0,0,0.6), rgba(106,13,173,0.7))',
      padding: '5px 0', overflow: 'hidden',
      whiteSpace: 'nowrap', fontSize: '13px', color: '#0ff',
      borderTop: '1px solid rgba(0,255,255,0.3)', borderBottom: '1px solid rgba(0,255,255,0.3)',
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
      display: 'flex', gap: '2px',
      padding: '6px 8px 8px',
      background: 'linear-gradient(180deg, rgba(10,5,30,0.92), rgba(5,0,15,0.98))',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(16px)',
    },
    navBtn: {
      flex: 1, padding: '8px 2px 6px', textAlign: 'center', color: '#fff',
      fontSize: '10px', cursor: 'pointer', border: 'none', background: 'none',
      fontFamily: "'Bangers', cursive", display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: '4px', transition: 'all 0.2s',
      borderRadius: '12px', position: 'relative',
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

      {/* Sound toggle */}
      <button style={styles.soundBtn} onClick={(e) => {
        e.stopPropagation();
        soundEngine.enabled = !soundEngine.enabled;
        setSettingsOpen(false);
        setGame(prev => ({ ...prev })); // force re-render
      }}>
        {soundEngine.enabled ? '🔊' : '🔇'}
      </button>

      {/* Settings gear */}
      <button style={{ ...styles.soundBtn, right: '50px' }} onClick={(e) => {
        e.stopPropagation();
        setSettingsOpen(!settingsOpen);
        setActivePanel(null);
      }}>⚙️</button>

      {/* HUD */}
      <div style={styles.hud}>
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
      <div style={{ ...styles.ticker, position: 'absolute', bottom: '56px', left: 0, right: 0, zIndex: 10 }}>
        <div style={{ animation: 'scroll 15s linear infinite', display: 'inline-block', paddingLeft: '100%' }}>
          📰 {getNews()} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 📰 {getNews()}
        </div>
      </div>

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

      {/* Admin: Vote popup */}
      {adminVote && !votedOn[adminVote.id] && (
        <div style={{
          position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 45, padding: '16px 20px', borderRadius: '16px',
          background: 'rgba(15,5,35,0.98)', border: '2px solid #a259ff',
          boxShadow: '0 0 40px rgba(162,89,255,0.5)', minWidth: '280px',
        }}>
          <div style={{ fontSize: '16px', color: '#fff', marginBottom: '12px', textAlign: 'center' }}>
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
      {adminEffects.disco && <AdminEffectDisco />}
      {adminEffects.fireworks && <AdminEffectFireworks />}
      {adminEffects.poop && <AdminEffectPoop />}
      {adminEffects.rocket && <AdminEffectRocket />}
      {adminEffects.cats && <AdminEffectCats />}
      {adminEffects.tsunami && <AdminEffectTsunami setGame={setGame} />}
      {adminEffects.lightning && <AdminEffectLightning />}
      {adminEffects.bomb && <AdminEffectBomb />}
      {adminEffects.crowd && <AdminEffectCrowd />}

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
          { id: 'shop', label: 'Shop', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> },
          { id: 'skins', label: 'Skins', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          { id: 'codes', label: 'Codes', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> },
          { id: 'board', label: 'Board', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15l-2 5l9-13h-5l2-5l-9 13h5z"/></svg> },
          { id: 'achieve', label: 'Awards', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
          { id: 'reflex', label: 'Reflex', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
          { id: 'ascend', label: 'Ascend', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/><polyline points="18 9 12 3 6 9"/><line x1="3" y1="21" x2="21" y2="21"/></svg> },
        ].map(tab => (
          <button key={tab.id} style={{
            ...styles.navBtn,
            color: activePanel === tab.id ? '#ffd700' : 'rgba(255,255,255,0.7)',
            background: activePanel === tab.id ? 'rgba(106,13,173,0.4)' : 'transparent',
            borderTop: activePanel === tab.id ? '2px solid #ffd700' : '2px solid transparent',
          }} onClick={() => {
            if (tab.id === 'reflex') { startReflex(); return; }
            setActivePanel(activePanel === tab.id ? null : tab.id);
          }}>
            {tab.svg}
            <span style={{ fontSize: '9px', marginTop: '2px', letterSpacing: '0.5px' }}>{tab.label}</span>
          </button>
        ))}
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
