'use strict';
(() => {
/* =====================================================================
   MathCraft — un petit Minecraft pour apprendre les maths
   ===================================================================== */

// ---------- Réglages & sauvegarde ----------
// Version de test (déployée dans /dev/) : mêmes données séparées, pour ne jamais abîmer la progression réelle
const DEV = /\/dev\//.test(location.pathname);
const PFX = DEV ? 'dev-' : '';
const REG_KEY = PFX + 'mathcraft-profiles';
const keyOf = id => PFX + (id === 'p1' ? 'mathcraft-v1' : 'mathcraft-v1-' + id);   // 'p1' garde l'ancienne clé : rien n'est perdu
function loadReg() {
  try { const r = JSON.parse(localStorage.getItem(REG_KEY)); if (r && r.list && r.list.length) return r; } catch (e) {}
  let old = null; try { old = JSON.parse(localStorage.getItem(keyOf('p1'))); } catch (e) {}
  return { list: [{ id: 'p1', name: (old && old.name) || '', avatar: '🦊' }], cur: 'p1', pin: (old && old.pin) || '' };
}
const REG = loadReg();
if (!REG.list.some(p => p.id === REG.cur)) REG.cur = REG.list[0].id;
const saveReg = () => { try { localStorage.setItem(REG_KEY, JSON.stringify(REG)); } catch (e) {} };
const SAVE_KEY = keyOf(REG.cur);
const DEFAULTS = {
  tables: [2, 3, 4, 5],
  ops: { mul: true, add: false, sub: false, div: false, hole: true },
  freq: 60,
  mode: 'choice',
  stats: { ok: 0, ko: 0, stars: 0, diamonds: 0, best: 0, miss: {}, tab: {}, chests: 0, placed: 0, flash5: 0 },
  ach: {}, pets: [], mission: null, world: 'farm', visited: ['farm'],
  pin: '', name: '', limit: 0, first: '', daily: {}, tabAll: {}, opAll: {}, errs: [], bonus: {},
  level: 'libre', levelSet: false, tutoDone: false, seenVer: '', album: {}, photos: {}, found: {}, findDone: {}, care: 0, recent: [], westOpen: false, sus: [], albumDone: {}, quests: null, questsDone: 0, lastDay: '', gift: '', coll: {}, farmT: 0, rareMiss: 0, meetDay: { day: '', set: {} }, learn: {}, qn: 0, wallet: 0, boost: 0, review: {}, market: { ok: 0, ko: 0 }, locks: {}, acc: [], inv: {}, builds: {}, snd: { music: true, amb: true },
};
const clone = o => JSON.parse(JSON.stringify(o));
function loadSave(key = SAVE_KEY) {
  try {
    const o = JSON.parse(localStorage.getItem(key));
    const s = clone(DEFAULTS);
    if (o) { Object.assign(s, o); s.ops = Object.assign(clone(DEFAULTS.ops), o.ops); s.stats = Object.assign(clone(DEFAULTS.stats), o.stats); }
    if (o && o.stats && o.stats.ok > 0) s.tutoDone = true;   // un joueur qui a déjà répondu n'a pas besoin du tutoriel
    if (o && o.level && o.level !== 'libre') s.levelSet = true;   // un niveau déjà choisi par le passé
    if (!s.wlt2) { s.wallet = Math.round((s.wallet || 0) / 10); s.wlt2 = 1; }   // ancienne monnaie (centimes) -> pépites
    s.pets = (s.pets || []).map(p => typeof p === 'string' ? { t: p, name: '' } : p);
    s.pets.forEach(p => { if (!p.accs) p.accs = p.acc ? [p.acc] : []; delete p.acc; });
    const out = s.pets.find(p => p.out) || s.pets[0]; s.pets.forEach(p => p.out = p === out);   // un seul compagnon sort, les autres sont rangés
    return s;
  } catch (e) { return clone(DEFAULTS); }
}
const S = loadSave();
S.name = REG.list.find(p => p.id === REG.cur).name;
saveReg();
// anciennes erreurs -> file de mémorisation
Object.keys(S.stats.miss).forEach(k => { if (S.stats.miss[k] > 0 && !S.learn[k]) S.learn[k] = { ok: 0, due: 0, hole: 0 }; });
function loadProfile(id) { const d = loadSave(keyOf(id)); d.name = (REG.list.find(p => p.id === id) || {}).name || ''; return d; }
const saveProfile = (id, d) => { try { localStorage.setItem(keyOf(id), JSON.stringify(d)); } catch (e) {} };
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} };

const $ = id => document.getElementById(id);
const ICON = n => `<svg class="ic" aria-hidden="true"><use href="icons.svg#i-${n}"/></svg>`;   // icônes dessinées (icons.svg)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => n.toLocaleString('fr-FR') + ' 🪙';   // monnaie virtuelle du jeu : les pépites
function earn(c) { S.wallet += Math.round(c); updateHud(); }   // gagner de l'argent (en centimes)
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 && matchMedia('(pointer:coarse)').matches;
if (IS_TOUCH) document.body.classList.add('touch');

// ---------- Sons (WebAudio, aucun fichier) ----------
let AC = null;
function tone(f, d = .12, type = 'square', vol = .05, delay = 0) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
const sfx = {
  ok: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'triangle', .09, i * .09)),
  ko: () => { tone(220, .18, 'sawtooth', .05); tone(165, .25, 'sawtooth', .05, .12); },
  pop: () => tone(300 + Math.random() * 120, .07, 'square', .05),
  shot: () => { tone(2200, .03, 'square', .05); tone(1100, .07, 'square', .05, .06); },
  place: () => tone(160, .08, 'square', .06),
  oink: () => { tone(260, .09, 'sawtooth', .05); tone(200, .12, 'sawtooth', .05, .08); },
  animal: t => { const m = { dog: [300, 'sawtooth', .09, 2, 200], cat: [820, 'triangle', .22, 1, 560], sheep: [280, 'sawtooth', .3, 2, 250], cow: [130, 'sawtooth', .5, 1, 110], monkey: [600, 'sine', .15, 3, 420], parrot: [1900, 'sine', .08, 3, 2300], lion: [110, 'sawtooth', .6, 1, 80], elephant: [320, 'sawtooth', .45, 1, 260], dolphin: [1500, 'sine', .1, 3, 2000], penguin: [700, 'square', .1, 2, 600], slime: [200, 'sine', .15, 2, 330], bat: [3000, 'sine', .05, 3, 3500], horse: [420, 'sawtooth', .3, 2, 300], crab: [900, 'square', .04, 3, 700] }[t]; if (!m) return sfx.oink(); for (let i = 0; i < m[3]; i++) tone(i % 2 ? m[4] : m[0], m[2], m[1], .05, i * m[2] * .8); },
  coin: () => { tone(1568, .07, 'square', .045); tone(2093, .14, 'square', .045, .06); },
  ask: () => [659, 784, 659, 988].forEach((f, i) => tone(f, .15, 'triangle', .08, i * .1)),
};

// ---------- Blocs & textures procédurales ----------
const W = 96, D = 96, H = 40, CS = 16; let SEA = 16;
const B = { GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5, SAND: 6, PLANKS: 7, BRICK: 8, GLASS: 9, DIAMOND: 10, LUCKY: 11, SNOW: 12, RED: 13, BLUE: 14, YELLOW: 15, WATER: 16, CHEST: 17, CHESTOPEN: 18, JGRASS: 19, JWOOD: 20, JLEAVES: 21, SGRASS: 22, ACACIA: 23, ALEAVES: 24, REDSAND: 25, DROCK: 26, GRAVEL: 27, SPRUCE: 28, ICE: 29, CRYSTAL: 30, CRYSTAL2: 31, CACTUS: 32 };
const GLOW = new Set([30, 31]);
const BLOCKS = {
  1: { t: [0, 1, 2], c: 0x5fb03c }, 2: { t: [2, 2, 2], c: 0x866043 }, 3: { t: [3, 3, 3], c: 0x7d7d7d },
  4: { t: [5, 4, 5], c: 0x66492d }, 5: { t: [6, 6, 6], c: 0x328228 }, 6: { t: [7, 7, 7], c: 0xdecf96 },
  7: { t: [8, 8, 8], c: 0xb48c50 }, 8: { t: [9, 9, 9], c: 0xaa3c32 }, 9: { t: [10, 10, 10], c: 0xc8e6f0 },
  10: { t: [11, 11, 11], c: 0x5af0e6 }, 11: { t: [12, 12, 12], c: 0xf0c828 }, 12: { t: [13, 13, 2], c: 0xf0f5fa },
  13: { t: [14, 14, 14], c: 0xd73232 }, 14: { t: [15, 15, 15], c: 0x325ad2 }, 15: { t: [16, 16, 16], c: 0xf0d232 }, 16: { t: [17, 17, 17], c: 0x3b82e6 }, 17: { t: [18, 18, 18], c: 0xa0642a }, 18: { t: [20, 19, 19], c: 0x8a5a28 },
  19: { t: [21, 22, 2], c: 0x2a9632 }, 20: { t: [24, 23, 24], c: 0x46372a }, 21: { t: [25, 25, 25], c: 0x19732d }, 22: { t: [26, 27, 2], c: 0xaaa046 },
  23: { t: [5, 28, 5], c: 0x967050 }, 24: { t: [29, 29, 29], c: 0x6e9632 }, 25: { t: [30, 30, 30], c: 0xc87846 }, 26: { t: [31, 31, 31], c: 0x55555f },
  27: { t: [32, 32, 32], c: 0x8c8782 }, 32: { t: [49, 48, 49], c: 0x36903e }, 28: { t: [33, 33, 33], c: 0x1e5a46 }, 29: { t: [43, 43, 43], c: 0xaad4f5 }, 30: { t: [44, 44, 44], c: 0x5af0e6 }, 31: { t: [45, 45, 45], c: 0xc77dff },
};
const HOTBAR = [B.GRASS, B.DIRT, B.STONE, B.PLANKS, B.BRICK, B.GLASS, B.RED, B.BLUE, B.YELLOW];
const NAMES = { 1: 'Herbe', 2: 'Terre', 3: 'Pierre', 7: 'Planches', 8: 'Briques', 9: 'Verre', 13: 'Laine rouge', 14: 'Laine bleue', 15: 'Laine jaune' };
const DROPS = { 1: 1, 2: 2, 3: 3, 4: 7, 5: 0, 6: 2, 7: 7, 8: 8, 9: 9, 12: 2, 13: 13, 14: 14, 15: 15, 19: 2, 20: 7, 22: 2, 23: 7, 25: 2, 26: 3, 27: 3 };

const TILES = 56, TS = 16;
const atlas = document.createElement('canvas'); atlas.width = TILES * TS; atlas.height = TS;
const actx = atlas.getContext('2d');
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tile(i, fn) {
  const img = actx.createImageData(TS, TS), r = mulberry(i * 977 + 13);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const c = fn(x, y, r), k = (y * TS + x) * 4;
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = c[3] === undefined ? 255 : c[3];
  }
  actx.putImageData(img, i * TS, 0);
}
const nz = (b, v, r) => { const d = (r() - .5) * 2 * v; return [clamp(b[0] + d, 0, 255), clamp(b[1] + d, 0, 255), clamp(b[2] + d, 0, 255)]; };
const GR = [95, 170, 60], DI = [134, 96, 67];
tile(0, (x, y, r) => nz(GR, 22, r));
tile(1, (x, y, r) => (y < 4 || (y === 4 && r() < .4)) ? nz(GR, 22, r) : nz(DI, 18, r));
tile(2, (x, y, r) => nz(DI, 18, r));
tile(3, (x, y, r) => nz([125, 125, 125], 20, r));
tile(4, (x, y, r) => nz(x % 4 === 0 ? [80, 58, 34] : [104, 78, 47], 8, r));
tile(5, (x, y, r) => { const ring = Math.floor(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5))); return nz(ring >= 7 ? [90, 66, 40] : ring % 2 ? [170, 135, 85] : [140, 105, 62], 8, r); });
tile(6, (x, y, r) => r() < .16 ? [0, 0, 0, 0] : nz([48, 135, 40], 28, r));
tile(7, (x, y, r) => nz([222, 208, 150], 10, r));
tile(8, (x, y, r) => nz(y % 4 === 3 ? [120, 88, 48] : [182, 142, 82], 8, r));
tile(9, (x, y, r) => { const row = Math.floor(y / 4); const m = y % 4 === 3 || (x + (row % 2) * 4) % 8 === 0; return nz(m ? [205, 200, 190] : [172, 62, 52], 8, r); });
tile(10, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? [190, 225, 235, 255] : ((x === y && x > 2 && x < 7) || (x === y + 1 && x > 3 && x < 7)) ? [255, 255, 255, 255] : [0, 0, 0, 0]);
const SPOTS = [[3, 3], [10, 4], [6, 9], [12, 11], [4, 12]];
tile(11, (x, y, r) => SPOTS.some(([sx, sy]) => x >= sx && x < sx + 3 && y >= sy && y < sy + 2) ? nz([90, 240, 230], 14, r) : nz([125, 125, 125], 20, r));
const Q = ['01110', '10001', '00001', '00010', '00100', '00000', '00100'];
tile(12, (x, y, r) => {
  const edge = x < 1 || y < 1 || x > 14 || y > 14;
  const qx = Math.floor((x - 3) / 2), qy = Math.floor((y - 1) / 2);
  if (qx >= 0 && qx < 5 && qy >= 0 && qy < 7 && Q[qy][qx] === '1') return [255, 255, 255];
  return edge ? [190, 135, 20] : nz([242, 200, 40], 14, r);
});
tile(13, (x, y, r) => nz([240, 245, 250], 7, r));
tile(14, (x, y, r) => nz([215, 50, 50], 10, r));
tile(15, (x, y, r) => nz([50, 90, 210], 10, r));
tile(16, (x, y, r) => nz([240, 210, 50], 10, r));
tile(18, (x, y, r) => { if (x >= 6 && x <= 9 && y >= 5 && y <= 9) return nz([250, 205, 60], 8, r); if (y === 5 || y === 6 || x < 1 || x > 14 || y < 1 || y > 14) return nz([60, 40, 25], 6, r); return nz([150, 100, 50], 12, r); });
tile(19, (x, y, r) => (y === 5 || y === 6 || x < 1 || x > 14 || y < 1 || y > 14) ? nz([60, 40, 25], 6, r) : nz([150, 100, 50], 12, r));
tile(20, (x, y, r) => (x < 2 || x > 13 || y < 2 || y > 13) ? nz([60, 40, 25], 6, r) : r() < .25 ? nz([250, 205, 60], 10, r) : nz([40, 28, 20], 6, r));
tile(17, (x, y, r) => nz((x + y * 3) % 11 < 2 ? [90, 150, 245] : [45, 105, 220], 10, r));

tile(21, (x, y, r) => nz([38, 148, 48], 22, r));
tile(22, (x, y, r) => (y < 4 || (y === 4 && r() < .4)) ? nz([38, 148, 48], 22, r) : nz([108, 76, 48], 16, r));
tile(23, (x, y, r) => nz(x % 3 === 0 ? [48, 38, 26] : (r() < .12 ? [50, 110, 40] : [74, 58, 38]), 8, r));
tile(24, (x, y, r) => { const ring = Math.floor(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5))); return nz(ring >= 7 ? [56, 44, 30] : ring % 2 ? [128, 98, 62] : [100, 76, 48], 8, r); });
tile(25, (x, y, r) => r() < .12 ? [0, 0, 0, 0] : nz([24, 112, 44], 26, r));
tile(26, (x, y, r) => nz([172, 160, 70], 20, r));
tile(27, (x, y, r) => (y < 4 || (y === 4 && r() < .4)) ? nz([172, 160, 70], 20, r) : nz(DI, 18, r));
tile(28, (x, y, r) => nz(x % 5 === 0 ? [110, 78, 52] : [150, 118, 90], 10, r));
tile(29, (x, y, r) => r() < .18 ? [0, 0, 0, 0] : nz([112, 150, 50], 24, r));
tile(30, (x, y, r) => nz([200, 120, 70], 12, r));
tile(31, (x, y, r) => nz([84, 84, 96], 18, r));
tile(32, (x, y, r) => nz([140, 135, 130], 36, r));
tile(33, (x, y, r) => r() < .14 ? [0, 0, 0, 0] : nz([28, 90, 70], 22, r));
const T0 = [0, 0, 0, 0];
function tuft(i, col) { const hs = [0, 0, 7, 0, 11, 9, 0, 13, 8, 0, 10, 12, 0, 6, 0, 0]; tile(i, (x, y, r) => { const h = hs[x]; return h && y >= 16 - h ? nz(col, 24, r) : T0; }); }
tuft(34, [70, 160, 55]); tuft(39, [200, 175, 85]);
function flower(i, pc) { tile(i, (x, y, r) => {
  const dx = x - 7, dy = y - 5, m = Math.abs(dx) + Math.abs(dy);
  if (m === 0) return [255, 220, 60]; if (m <= 2) return nz(pc, 14, r);
  if (x === 7 && y >= 8) return nz([60, 150, 50], 12, r);
  if ((x === 8 && y === 12) || (x === 9 && y === 11) || (x === 6 && y === 13) || (x === 5 && y === 12)) return [60, 160, 55];
  return T0; }); }
flower(35, [230, 50, 60]); flower(36, [250, 205, 40]); flower(37, [120, 150, 255]);
{ const fr = new Set(); [[-1.4, 9], [-.8, 10], [-.3, 11], [.3, 11], [.8, 10], [1.4, 9]].forEach(([a, len]) => { for (let t = 0; t < len; t += .5) { const x = Math.round(7.5 + Math.sin(a) * t * .9), y = Math.round(15 - Math.cos(a) * t); fr.add(x + ',' + y); } });
  tile(38, (x, y, r) => fr.has(x + ',' + y) ? nz([40, 150, 70], 22, r) : T0); }
tile(40, (x, y, r) => y >= 11 && ((x > 1 && x < 6 && y > 12) || (x > 7 && x < 13 && y > 11) || (x > 5 && x < 8 && y > 13)) ? nz([135, 135, 140], 22, r) : T0);
tile(41, (x, y, r) => { if (y >= 10 && y <= 14 && x >= 6 && x <= 9) return nz([235, 225, 195], 8, r);
  const rw = [[5, 10], [4, 11], [3, 12], [3, 12], [4, 11]][y - 5]; if (rw && x >= rw[0] && x <= rw[1]) return ((x * 3 + y) % 5 === 0) ? [255, 255, 255] : nz([210, 45, 45], 10, r); return T0; });
tuft(42, [235, 240, 250]); tuft(46, [30, 150, 95]);
tile(43, (x, y, r) => ((x + y) % 9 === 0 || (x * 2 + y) % 13 === 0) ? [225, 242, 255] : nz([165, 212, 245], 10, r));
tile(44, (x, y, r) => ((x + y) % 6 < 2) ? nz([200, 255, 255], 12, r) : nz([55, 205, 228], 14, r));
tile(45, (x, y, r) => ((x + y) % 6 < 2) ? nz([235, 190, 255], 12, r) : nz([160, 80, 225], 14, r));
tile(48, (x, y, r) => (x % 5 === 2 && y % 4 === 1) ? [236, 230, 180] : x % 5 === 0 ? nz([36, 104, 44], 8, r) : nz([54, 142, 60], 10, r));
tile(49, (x, y, r) => (x < 2 || y < 2 || x > 13 || y > 13) ? nz([38, 108, 46], 8, r) : nz([62, 150, 68], 10, r));
tile(47, (x, y, r) => ((x % 5 === 2 && y > 5) || (x % 7 === 4 && y > 8) || (y > 12 && x > 1 && x < 14)) ? nz([240, 110, 150], 18, r) : T0);
const atlasTex = new THREE.CanvasTexture(atlas);
atlasTex.magFilter = THREE.NearestFilter; atlasTex.minFilter = THREE.NearestFilter; atlasTex.generateMipmaps = false;
atlasTex.colorSpace = THREE.SRGBColorSpace;

// ---------- Monde ----------
const world = new Uint8Array(W * H * D);
const idx = (x, y, z) => (y * D + z) * W + x;
const inb = (x, y, z) => x >= 0 && x < W && y >= 0 && y < H && z >= 0 && z < D;
const get = (x, y, z) => inb(x, y, z) ? world[idx(x, y, z)] : 0;
let seed = 7;
function hash2(x, z) { let n = (x * 374761393 + z * 668265263 + seed * 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (n >>> 0) / 4294967296; }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) { let s = 0, a = .5, f = 1; for (let i = 0; i < 4; i++) { s += vnoise(x * f, z * f) * a; a /= 2; f *= 2; } return s; }
const curCfg = () => WORLDS[S.world] || WORLDS.farm;
function findFloor(x, z, from = 30) { x = Math.floor(x); z = Math.floor(z); for (let y = Math.min(from, H - 3); y > 2; y--) if (get(x, y, z) === 0 && solid(get(x, y - 1, z)) && get(x, y + 1, z) === 0) return y; return 0; }
function landY(x, z) { return curCfg().indoor ? findFloor(x, z) : surfaceY(x, z); }
function surfaceY(x, z) { for (let y = H - 1; y >= 0; y--) if (solid(get(Math.floor(x), y, Math.floor(z)))) return y + 1; return 0; }

// ---------- Les mondes ----------
const LEAF = new Set([B.LEAVES, B.JLEAVES, B.ALEAVES, B.SPRUCE]);
const WOOD = new Set([B.WOOD, B.JWOOD, B.ACACIA]);
const WORLDS = {
  farm: {
    name: 'La Ferme', emoji: '🐄', desc: 'Prairies, lacs et animaux de la ferme', unlock: 0,
    sky: [0x87ceeb, 0xff9a5a, 0x0e1538], fog: [40, 120], tint: [1, 1, 1], sea: 16,
    height: (x, z) => Math.floor(9 + fbm(x / 38, z / 38) * 22),
    top: h => h <= SEA ? B.SAND : h >= 26 ? B.SNOW : B.GRASS, sub: h => h <= SEA ? B.SAND : B.DIRT, stone: () => B.STONE,
    ground: new Set([B.GRASS]), trees: { kind: 'oak', density: .012 }, boulders: 0,
    animals: ['pig', 'sheep', 'chick', 'cow', 'horse', 'pig', 'sheep'],
    decor: [[34, .2, 1], [35, .02, .7], [36, .025, .7], [37, .02, .7]], critters: 14,
  },
  jungle: {
    name: 'La Jungle', emoji: '🌴', desc: 'Arbres géants, singes et perroquets', unlock: 10,
    sky: [0x6fcfb4, 0xffa05a, 0x07201c], fog: [18, 75], tint: [.92, 1.02, .9], sea: 17,
    height: (x, z) => Math.floor(10 + fbm(x / 30, z / 30) * 20),
    top: h => h <= SEA ? B.SAND : B.JGRASS, sub: h => h <= SEA ? B.SAND : B.DIRT, stone: () => B.STONE,
    ground: new Set([B.JGRASS]), trees: { kind: 'jungle', density: .05 }, boulders: 0,
    animals: ['monkey', 'parrot', 'frog', 'parrot', 'monkey', 'frog'],
    decor: [[38, .22, 1.3], [34, .12, 1], [35, .015, .8], [41, .01, .6]], critters: 16,
  },
  savanna: {
    name: 'La Savane', emoji: '🦁', desc: 'Grandes plaines, girafes et lions', unlock: 25,
    sky: [0xa8dcf2, 0xff7a3c, 0x1a1030], fog: [60, 150], tint: [1.08, 1, .84], sea: 16,
    height: (x, z) => Math.floor(12 + fbm(x / 55, z / 55) * 14),
    top: h => h <= SEA ? B.REDSAND : B.SGRASS, sub: h => h <= SEA ? B.REDSAND : B.DIRT, stone: () => B.STONE,
    ground: new Set([B.SGRASS]), trees: { kind: 'acacia', density: .006 }, boulders: 14,
    animals: ['giraffe', 'zebra', 'lion', 'elephant', 'zebra', 'giraffe'],
    decor: [[39, .14, 1], [36, .006, .7]], critters: 8,
  },
  ocean: {
    name: 'L\'Océan', emoji: '🏝️', desc: 'Îles, plages, dauphins et tortues', unlock: 70,
    sky: [0x62d3f2, 0xffa56a, 0x081a3a], fog: [50, 140], tint: [1, 1.03, 1.06], sea: 21,
    height: (x, z) => Math.floor(3 + fbm(x / 26 + 13, z / 26 + 7) * 34),
    top: h => h <= SEA + 1 ? B.SAND : B.GRASS, sub: h => h <= SEA + 1 ? B.SAND : B.DIRT, stone: () => B.STONE,
    ground: new Set([B.GRASS, B.SAND]), trees: { kind: 'palm', density: .035 }, boulders: 0,
    animals: ['crab', 'turtle', 'crab', 'parrot', 'turtle'], swimmers: ['dolphin', 'fish', 'fish', 'fish', 'dolphin', 'fish', 'fish'],
    decor: [[34, .15, 1], [35, .02, .7], [37, .02, .7], [46, .12, 1.1, 'w'], [47, .05, .9, 'w']], critters: 6,
  },
  snow: {
    name: 'La Neige', emoji: '❄️', desc: 'Forêt gelée, pingouins et ours polaires', unlock: 90,
    sky: [0xcfe4f2, 0xf0b898, 0x0b1230], fog: [20, 90], tint: [.97, 1, 1.08], sea: 13, frozen: true,
    height: (x, z) => Math.floor(10 + fbm(x / 36 + 5, z / 36 + 9) * 20),
    top: () => B.SNOW, sub: h => h <= SEA ? B.SAND : B.DIRT, stone: () => B.STONE,
    ground: new Set([B.SNOW, B.ICE]), trees: { kind: 'spruce', density: .02 }, boulders: 6,
    animals: ['penguin', 'polarbear', 'arcticfox', 'penguin', 'arcticfox', 'polarbear', 'penguin'],
    decor: [[42, .16, .9], [40, .012, .6]], critters: 0,
  },
  cave: {
    name: 'La Grotte', emoji: '🦇', desc: 'Cristaux lumineux, lacs et chauves-souris', unlock: 110, type: 'cave', indoor: true,
    sky: [0x090d19, 0x090d19, 0x05070d], fog: [6, 44], tint: [.66, .72, .95], sea: 7, height: () => 0,
    top: () => B.STONE, sub: () => B.STONE, stone: r => r() < .3 ? B.DROCK : B.STONE,
    ground: new Set([B.STONE, B.DROCK, B.GRAVEL]), trees: { kind: 'none', density: 0 }, boulders: 0,
    animals: ['mole', 'slime', 'bat', 'slime', 'bat', 'mole', 'bat'], decor: [[40, .05, .7], [41, .03, .7]], critters: 0,
  },
  west: {
    name: 'Le Far West', emoji: '🤠', desc: 'Canyons, cactus et chevaux sauvages', care: true,
    sky: [0xf4cf93, 0xff7a3c, 0x1a1030], fog: [60, 150], tint: [1.1, .98, .8], sea: 10,
    height: (x, z) => { const h = Math.floor(9 + fbm(x / 42 + 3, z / 42 + 11) * 24); return h > 19 ? 19 + ((h - 19) >> 1) : h; },   // plateaux plats (mesas)
    top: (h, r) => h <= SEA ? B.SAND : r() < .1 ? B.SAND : B.REDSAND, sub: () => B.REDSAND, stone: r => r() < .3 ? B.DROCK : B.STONE,
    ground: new Set([B.REDSAND, B.SAND]), trees: { kind: 'cactus', density: .014 }, boulders: 26,
    animals: ['horse', 'pinto', 'blackhorse', 'horse', 'pinto', 'cow', 'blackhorse', 'goat'],
    decor: [[39, .07, .8]], critters: 4,
  },
  rock: {
    name: 'Les Montagnes', emoji: '⛰️', desc: 'Pics rocheux, neige et bouquetins', unlock: 50,
    sky: [0x9db6cc, 0xe0905a, 0x0a1224], fog: [25, 95], tint: [.92, .96, 1.06], sea: 13,
    height: (x, z) => { const n = fbm(x / 28, z / 28), r = 1 - Math.abs(n * 2 - 1); return Math.floor(9 + (r * r * .75 + n * .5) * 28); },
    top: (h, r) => h >= 30 ? B.SNOW : h <= SEA + 1 ? B.GRAVEL : r() < .5 ? B.STONE : r() < .5 ? B.GRAVEL : B.DROCK,
    sub: () => B.STONE, stone: r => r() < .25 ? B.DROCK : B.STONE,
    ground: new Set([B.STONE, B.GRAVEL, B.DROCK, B.GRASS]), trees: { kind: 'spruce', density: .012 }, boulders: 45,
    animals: ['goat', 'ibex', 'marmot', 'goat', 'ibex', 'marmot'],
    decor: [[40, .035, .7], [34, .025, .8], [41, .004, .6]], critters: 0,
  },
};
const UNLOCK_ALL = DEV || /[?&]debug/.test(location.search); // version de test (/dev/) ou index.html?debug : tout débloqué, sans question, crédits illimités
const WORLD_ORDER = ['farm', 'jungle', 'savanna', 'rock', 'ocean', 'snow', 'cave', 'west'];
// le Far West se mérite : réponses réfléchies (réussies du premier coup, sans se précipiter) et bonne réussite récente
const WEST_NEED = 50;
const westAcc = () => S.recent.length ? S.recent.reduce((a, b) => a + b, 0) / S.recent.length : 0;
const worldOpen = k => UNLOCK_ALL || (WORLDS[k].care ? !!S.westOpen : S.stats.stars >= WORLDS[k].unlock);
const lockText = k => WORLDS[k].care ? `🔒 Réponds avec soin : ${Math.min(S.care, WEST_NEED)}/${WEST_NEED} réponses réfléchies` : `🔒 ${WORLDS[k].unlock} ⭐ pour débloquer`;
const LOOK = { tint: [1, 1, 1] };

function putBlock(x, y, z, b) { if (inb(x, y, z) && !world[idx(x, y, z)]) world[idx(x, y, z)] = b; }
function growTree(kind, x, h, z, r) {
  const trunk = (wood, th) => { for (let i = 1; i <= th; i++) putBlock(x, h + i, z, wood); };
  if (kind === 'oak') {
    const th = 4 + Math.floor(r() * 2); trunk(B.WOOD, th);
    for (let dy = th - 2; dy <= th + 1; dy++) { const rad = dy >= th ? 1 : 2;
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad && (dy >= th || r() < .5)) continue; putBlock(x + dx, h + dy, z + dz, B.LEAVES); } }
  } else if (kind === 'jungle') {
    const th = 7 + Math.floor(r() * 4); trunk(B.JWOOD, th);
    for (let dy = th - 2; dy <= th + 1; dy++) { const rad = dy >= th ? 2 : 3;
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad && r() < .6) continue; putBlock(x + dx, h + dy, z + dz, B.JLEAVES); } }
  } else if (kind === 'acacia') {
    const th = 4 + Math.floor(r() * 2); trunk(B.ACACIA, th);
    for (let dy = th; dy <= th + 1; dy++) { const rad = dy === th ? 3 : 2;
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad) continue; putBlock(x + dx, h + dy, z + dz, B.ALEAVES); } }
  } else if (kind === 'cactus') {
    const th = 2 + Math.floor(r() * 3); trunk(B.CACTUS, th);
    if (th >= 3 && r() < .7) { const dx = r() < .5 ? -1 : 1; putBlock(x + dx, h + th - 1, z, B.CACTUS); putBlock(x + dx, h + th, z, B.CACTUS); }   // un bras
  } else if (kind === 'palm') {
    const th = 5 + Math.floor(r() * 3); trunk(B.WOOD, th);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { for (let i = 1; i <= 3; i++) putBlock(x + dx * i, h + th + 1 - (i > 2 ? 1 : 0), z + dz * i, B.JLEAVES); });
    [[1, 1], [-1, -1], [1, -1], [-1, 1]].forEach(([dx, dz]) => { putBlock(x + dx, h + th + 1, z + dz, B.JLEAVES); putBlock(x + dx * 2, h + th, z + dz * 2, B.JLEAVES); });
    putBlock(x, h + th + 1, z, B.JLEAVES); putBlock(x, h + th + 2, z, B.JLEAVES);
  } else {
    const th = 5 + Math.floor(r() * 3); trunk(B.WOOD, th);
    for (let dy = 2; dy <= th + 1; dy++) { const rad = Math.min(2, Math.floor((th + 1 - dy) / 2));
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (rad === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue; putBlock(x + dx, h + dy, z + dz, B.SPRUCE); } }
  }
}

// ---------- Sauvegarde des constructions (par enfant et par monde) ----------
function worldRec() { return S.builds[S.world] || (S.builds[S.world] = { seed: (Math.random() * 1e9) | 0, edits: {}, pos: null }); }
let editCount = 0, saveT = null;
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 1500); };
function savePos() { if (typeof started !== 'undefined' && started) worldRec().pos = [P.x, P.y, P.z, P.yaw]; }
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf), h = (a, b, c) => hash2(a + b * 57, c + b * 131), l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v), l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}
function genCave(cfg, r, heights) {
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) for (let y = 0; y < H; y++) {
    let solidB = true;
    if (y >= 6 && y <= H - 7) {
      const n = (noise3(x / 11, y / 5.5, z / 11) + noise3(x / 5, y / 3, z / 5) * .5) / 1.5;
      if (n > .575) solidB = false;
      const dx = (x - W / 2) / 15, dy = (y - 15) / 6, dz = (z - D / 2) / 15; if (dx * dx + dy * dy + dz * dz < 1) solidB = false;
    }
    world[idx(x, y, z)] = solidB ? (y > 2 && r() < .02 ? B.DIAMOND : cfg.stone(r)) : 0;
  }
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) for (let y = 6; y <= SEA; y++) if (!world[idx(x, y, z)]) world[idx(x, y, z)] = B.WATER;
  for (let x = 1; x < W - 1; x++) for (let z = 1; z < D - 1; z++) for (let y = 4; y < H - 3; y++) {
    const b = world[idx(x, y, z)]; if (!b || b === B.WATER) continue;
    const air = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, c, d]) => world[idx(x + a, y + c, z + d)] === 0);
    if (!air) continue;
    if (r() < .014) world[idx(x, y, z)] = r() < .5 ? B.CRYSTAL : B.CRYSTAL2;
    else if (world[idx(x, y + 1, z)] === 0 && r() < .25) world[idx(x, y, z)] = B.GRAVEL;
  }
  for (let x = 0; x < W; x++) { heights[x] = []; for (let z = 0; z < D; z++) { const f = findFloor(x, z); heights[x][z] = f ? f - 1 : -99; } }
}

function generate() {
  const cfg = curCfg(); SEA = cfg.sea;
  const rec = worldRec(); seed = rec.seed;
  world.fill(0);
  const r = mulberry(seed * 31 + 5), rr = (a, b) => a + Math.floor(r() * (b - a + 1)), heights = [];
  if (cfg.type === 'cave') genCave(cfg, r, heights);
  else {
    for (let x = 0; x < W; x++) { heights[x] = []; for (let z = 0; z < D; z++) {
      const h = Math.min(H - 12, cfg.height(x, z));
      heights[x][z] = h;
      for (let y = 0; y <= h; y++) {
        let b;
        if (y === h) b = cfg.top(h, r);
        else if (y > h - 4) b = cfg.sub(h, r);
        else b = (y > 2 && r() < .012) ? B.DIAMOND : cfg.stone(r);
        world[idx(x, y, z)] = b;
      }
      for (let y = h + 1; y <= SEA; y++) world[idx(x, y, z)] = (cfg.frozen && y === SEA) ? B.ICE : B.WATER;
    } }
    for (let x = 4; x < W - 4; x++) for (let z = 4; z < D - 4; z++) {
      const h = heights[x][z];
      if (r() < cfg.trees.density && cfg.ground.has(get(x, h, z)) && h > SEA) growTree(cfg.trees.kind, x, h, z, r);
    }
    for (let i = 0; i < cfg.boulders; i++) {
      const x = rr(4, W - 5), z = rr(4, D - 5), h = heights[x][z], rad = rr(1, cfg.boulders > 30 ? 3 : 2), mt = [B.STONE, B.DROCK, B.GRAVEL][rr(0, 2)];
      if (h <= SEA) continue;
      for (let dx = -rad; dx <= rad; dx++) for (let dy = -1; dy <= rad; dy++) for (let dz = -rad; dz <= rad; dz++)
        if (dx * dx + dy * dy + dz * dz <= rad * rad + 1) putBlock(x + dx, h + 1 + dy, z + dz, mt);
    }
  }
  const okGround = (x, y, z) => { const below = get(x, y - 1, z); return (cfg.ground.has(below) || below === B.SNOW) && get(x, y, z) === 0; };
  let n = 0, guard = 0;
  while (n < 32 && guard++ < 4000) {
    const x = rr(3, W - 4), z = rr(3, D - 4), y = landY(x, z);
    if (y > SEA + 1 && y < H - 1 && okGround(x, y, z)) { world[idx(x, y, z)] = B.LUCKY; n++; }
  }
  n = 0; guard = 0;
  while (n < 12 && guard++ < 5000) {
    const x = rr(4, W - 5), z = rr(4, D - 5), y = landY(x, z);
    if (y > SEA + 1 && y < H - 1 && cfg.ground.has(get(x, y - 1, z)) && get(x, y, z) === 0) { world[idx(x, y, z)] = B.CHEST; n++; }
  }
  editCount = 0;
  for (const k in rec.edits) { const [x, y, z] = k.split(',').map(Number); if (inb(x, y, z)) world[idx(x, y, z)] = rec.edits[k]; editCount++; }
  buildDecor(cfg, heights);
}
function applyLook() {
  const cfg = curCfg();
  SKY_DAY.set(cfg.sky[0]); SKY_DUSK.set(cfg.sky[1]); SKY_NIGHT.set(cfg.sky[2]);
  scene.fog.near = cfg.fog[0]; scene.fog.far = cfg.fog[1]; LOOK.tint = cfg.tint; { const f = festival(); if (f && f.tint) LOOK.tint = cfg.tint.map((v, i) => v * f.tint[i]); }
  setWeather(pickWeather()); WX.mix = WX.target;
}

// ---------- Rendu ----------
const cv = $('c');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, .05, 400);
camera.rotation.order = 'YXZ';
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < innerHeight ? 85 : 72; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
scene.fog = new THREE.Fog(0x87ceeb, 40, 120);

const mat = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: .5 });
const waterMat = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, transparent: true, opacity: .72, depthWrite: false });
const decorMat = new THREE.MeshBasicMaterial({ map: atlasTex, alphaTest: .5, side: THREE.DoubleSide });
let decorMeshes = [];
function decorGeo(tl) {
  const u0 = tl / TILES + .0004, u1 = (tl + 1) / TILES - .0004, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, .5, 1, 0, -.5, 1, 0, 0, 0, -.5, 0, 0, .5, 0, 1, .5, 0, 1, -.5], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 0, u1, 0, u1, 1, u0, 1, u0, 0, u1, 0, u1, 1, u0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]); return g;
}
function buildDecor(cfg, heights) {
  decorMeshes.forEach(m => { scene.remove(m); m.geometry.dispose(); m.dispose(); }); decorMeshes = [];
  const r = mulberry(seed + 99), dummy = new THREE.Object3D();
  (cfg.decor || []).forEach(([tl, dens, sc, wat]) => {
    const pts = [];
    for (let x = 2; x < W - 2; x++) for (let z = 2; z < D - 2; z++) {
      if (r() >= dens) continue; const h = heights[x][z];
      if (wat ? (h >= SEA - 1 || get(x, h, z) !== B.SAND || get(x, h + 1, z) !== B.WATER) : (h <= SEA || !cfg.ground.has(get(x, h, z)) || get(x, h + 1, z) !== 0)) continue;
      pts.push([x + .15 + r() * .7, h + 1, z + .15 + r() * .7, r() * 3.14, sc * (.8 + r() * .4)]);
    }
    if (!pts.length) return;
    const im = new THREE.InstancedMesh(decorGeo(tl), decorMat, pts.length);
    pts.forEach((q, i) => { dummy.position.set(q[0], q[1], q[2]); dummy.rotation.y = q[3]; dummy.scale.setScalar(q[4]); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.frustumCulled = false; scene.add(im); decorMeshes.push(im);
  });
}
let waterPh = 0, waterT = 0;
function drawWater(ph) { tile(17, (x, y, r) => { const l = ((x * 2 + y + ph * 2) % 13) < 2 || (((x + y * 2 - ph) % 11) + 11) % 11 === 0; return nz(l ? [100, 160, 250] : [45, 105, 220], 8, r); }); atlasTex.needsUpdate = true; }
// dôme de ciel dégradé
const skyMat = new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } }, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.5 + 0.12, 0.0, 1.0); gl_FragColor = vec4(mix(bot, top, pow(h, 0.65)), 1.0);\n#include <colorspace_fragment>\n }',
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 14), skyMat); skyDome.renderOrder = -10; skyDome.frustumCulled = false; scene.add(skyDome);
const worldGroup = new THREE.Group(); scene.add(worldGroup);
const chunks = new Map();
const FACES = [
  { d: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: .8 },
  { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: .8 },
  { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1 },
  { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: .5 },
  { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: .9 },
  { d: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: .7 },
];
const opaque = b => b !== 0 && !LEAF.has(b) && b !== B.GLASS && b !== B.WATER;
const solid = b => b !== 0 && b !== B.WATER;
const AOF = [.5, .68, .84, 1];
function buildChunk(cx, cz) {
  const mk = () => ({ pos: [], uv: [], col: [], ind: [] }), A = mk(), Wt = mk();
  const x0 = cx * CS, z0 = cz * CS, e = .0004, ao = [3, 3, 3, 3], q = [0, 0, 0], r = [0, 0, 0];
  const occ = a => opaque(get(a[0], a[1], a[2])) ? 1 : 0;
  for (let y = 0; y < H; y++) for (let z = z0; z < Math.min(z0 + CS, D); z++) for (let x = x0; x < Math.min(x0 + CS, W); x++) {
    const b = world[idx(x, y, z)]; if (!b) continue;
    const isW = b === B.WATER, t = BLOCKS[b].t, M = isW ? Wt : A;
    for (let fi = 0; fi < 6; fi++) {
      const f = FACES[fi], nb = get(x + f.d[0], y + f.d[1], z + f.d[2]);
      if (isW ? nb !== 0 : (opaque(nb) || (b === B.GLASS && nb === B.GLASS))) continue;
      const ti = fi === 2 ? t[0] : fi === 3 ? t[2] : t[1];
      const u0 = ti / TILES + e, u1 = (ti + 1) / TILES - e, base = M.pos.length / 3;
      const ax = f.d[0] ? 0 : f.d[1] ? 1 : 2, ua = (ax + 1) % 3, va = (ax + 2) % 3;
      for (let k = 0; k < 4; k++) {
        const c = f.c[k];
        M.pos.push(x + c[0], y + c[1] - (isW && fi === 2 ? .1 : 0), z + c[2]);
        M.uv.push(k === 0 || k === 3 ? u0 : u1, k < 2 ? 0 : 1);
        let sh = f.s;
        if (GLOW.has(b)) { sh = 2.4; ao[k] = 3; }
        else if (!isW) {
          const su = c[ua] * 2 - 1, sv = c[va] * 2 - 1;
          q[0] = r[0] = x + f.d[0]; q[1] = r[1] = y + f.d[1]; q[2] = r[2] = z + f.d[2];
          q[ua] += su; r[va] += sv;
          const s1 = occ(q), s2 = occ(r); q[va] += sv;
          ao[k] = s1 && s2 ? 0 : 3 - (s1 + s2 + occ(q));
          sh *= AOF[ao[k]];
        } else ao[k] = 3;
        M.col.push(sh, sh, sh);
      }
      if (ao[0] + ao[2] < ao[1] + ao[3]) M.ind.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
      else M.ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const key = cx + ',' + cz, old = chunks.get(key);
  if (old) old.forEach(m => { worldGroup.remove(m); m.geometry.dispose(); });
  const meshes = [];
  [[A, mat], [Wt, waterMat]].forEach(([M, m]) => {
    if (!M.ind.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(M.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(M.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(M.col, 3));
    g.setIndex(M.ind); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, m); if (m === waterMat) mesh.renderOrder = 1;
    worldGroup.add(mesh); meshes.push(mesh);
  });
  chunks.set(key, meshes);
}
function buildAll() { for (let cx = 0; cx < W / CS; cx++) for (let cz = 0; cz < D / CS; cz++) buildChunk(cx, cz); }
function setBlock(x, y, z, id, noRec) {
  if (!inb(x, y, z)) return;
  world[idx(x, y, z)] = id;
  if (!noRec) { const rec = worldRec(), k = x + ',' + y + ',' + z; if (!(k in rec.edits)) editCount++; if (editCount < 40000) { rec.edits[k] = id; saveSoon(); } }
  const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
  buildChunk(cx, cz);
  if (x % CS === 0 && cx > 0) buildChunk(cx - 1, cz);
  if (x % CS === CS - 1 && cx < W / CS - 1) buildChunk(cx + 1, cz);
  if (z % CS === 0 && cz > 0) buildChunk(cx, cz - 1);
  if (z % CS === CS - 1 && cz < D / CS - 1) buildChunk(cx, cz + 1);
}

// surbrillance du bloc visé
const hl = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006)), new THREE.LineBasicMaterial({ color: 0xffffff }));
hl.visible = false; scene.add(hl);

// soleil / lune / nuages
const sun = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 1), new THREE.MeshBasicMaterial({ color: 0xfff3a0, fog: false }));
const moon = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 1), new THREE.MeshBasicMaterial({ color: 0xdfe6ff, fog: false }));
scene.add(sun, moon);
const sp_ = []; for (let i = 0; i < 500; i++) { const u = Math.random() * 6.283, v = Math.random() * 2 - 1, r = Math.sqrt(1 - v * v); sp_.push(r * Math.cos(u) * 180, v * 180, r * Math.sin(u) * 180); }
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp_, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; scene.add(stars);
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .92 });
const clouds = [];
for (let i = 0; i < 16; i++) {
  const g = new THREE.Group();
  for (let k = 0; k < 3 + rnd(0, 2); k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(rnd(8, 16), 3, rnd(6, 10)), cloudMat); m.position.set(rnd(-8, 8), rnd(-1, 1), rnd(-5, 5)); g.add(m); }
  g.position.set(rnd(-60, W + 60), 50 + rnd(0, 6), rnd(-60, D + 60)); scene.add(g); clouds.push(g);
}
const SKY_DAY = new THREE.Color(0x87ceeb), SKY_DUSK = new THREE.Color(0xff9a5a), SKY_NIGHT = new THREE.Color(0x0e1538);
let dayT = 0.9, isNight = false;
function updateSky(dt) {
  const cfg = curCfg(), wm = WX.mix;
  if (cfg.indoor) {
    scene.background = SKY_DAY; scene.fog.color.copy(SKY_DAY);
    mat.color.setRGB(.9 * LOOK.tint[0], .9 * LOOK.tint[1], .9 * LOOK.tint[2]); waterMat.color.copy(mat.color); decorMat.color.copy(mat.color);
    animalMats.forEach(m => m.color.copy(m.userData.base).multiplyScalar(.9));
    sun.visible = moon.visible = stars.visible = skyDome.visible = false; clouds.forEach(c => c.visible = false); isNight = false; return;
  }
  skyDome.visible = true; stars.visible = true; clouds.forEach(c => c.visible = true);
  dayT += dt * (Math.PI * 2 / 360); // journée de 6 minutes
  const s = Math.sin(dayT);
  const col = s > .25 ? SKY_DAY.clone() : s > 0 ? SKY_DUSK.clone().lerp(SKY_DAY, s / .25) : SKY_DUSK.clone().lerp(SKY_NIGHT, clamp(-s * 4, 0, 1));
  GRAYC.set(WX.type === 'snow' ? 0xdfe6ee : WX.type === 'fog' ? 0xc9d1d8 : 0x7f8b97).multiplyScalar(clamp(.45 + s * .6, .22, 1));
  col.lerp(GRAYC, .7 * wm);
  scene.fog.near = cfg.fog[0] * (1 - .35 * wm); scene.fog.far = cfg.fog[1] * (1 - (WX.type === 'fog' ? .7 : .4) * wm);
  scene.background = col; scene.fog.color.copy(col);
  skyMat.uniforms.bot.value.copy(col); skyMat.uniforms.top.value.copy(col).offsetHSL(.005, .16, -.17); skyDome.position.copy(camera.position);
  const br = clamp(.55 + s * .9, .5, 1) * (1 - .25 * wm);
  mat.color.setRGB(br * LOOK.tint[0], br * LOOK.tint[1], br * LOOK.tint[2]); waterMat.color.copy(mat.color); decorMat.color.copy(mat.color); isNight = br < .66; starMat.opacity = clamp(-s * 3, 0, 1) * (1 - wm); stars.position.copy(camera.position); cloudMat.color.setScalar(clamp(br + .1 - .3 * wm, .35, 1));
  animalMats.forEach(m => m.color.copy(m.userData.base).multiplyScalar(br));
  const cx = P.x, cz = P.z;
  sun.position.set(cx + Math.cos(dayT) * 120, Math.sin(dayT) * 120, cz + 20); sun.lookAt(camera.position); sun.visible = sun.position.y > -5 && wm < .85;
  moon.position.set(cx - Math.cos(dayT) * 120, -Math.sin(dayT) * 120, cz - 20); moon.lookAt(camera.position); moon.visible = moon.position.y > -5 && wm < .85;
  clouds.forEach(c => { c.position.x += dt * 1.5; if (c.position.x > W + 70) c.position.x = -70; });
}
// ---------- Météo ----------
const GRAYC = new THREE.Color();
const WX = { type: 'clear', mix: 0, target: 0, timer: 30, flash: 0, thunderAt: 0 };
const WX_POWER = { clear: 0, cloudy: .4, rain: .7, storm: 1, snow: .6, fog: .65 };
const WX_ICON = { cloudy: '☁️', rain: '🌧️', storm: '⛈️', snow: '❄️', fog: '🌫️' };
const WX_TABLE = {
  farm: { clear: 5, cloudy: 2, rain: 2, storm: .5 }, jungle: { clear: 3, cloudy: 2, rain: 4, storm: 1, fog: 1 }, savanna: { clear: 7, cloudy: 2, rain: .8, storm: .3 },
  rock: { clear: 3, cloudy: 3, fog: 3, snow: 1.5 }, ocean: { clear: 5, cloudy: 2, rain: 2, storm: 1.2 }, snow: { snow: 6, clear: 2, fog: 2 }, cave: { clear: 1 }, west: { clear: 9, cloudy: 2, rain: .3 },
};
function pickWeather() {
  const tbl = Object.assign({}, WX_TABLE[S.world] || { clear: 1 }), fe = festival(); if (fe && fe.id === 'xmas' && (S.world === 'farm' || S.world === 'rock')) tbl.snow = 4; if (fe && fe.id === 'summer') tbl.clear = (tbl.clear || 1) * 3;
  const e = Object.entries(tbl), tot = e.reduce((x, [, w]) => x + w, 0); let r = Math.random() * tot;
  for (const [k, w] of e) { r -= w; if (r <= 0) return k; } return 'clear';
}
function setWeather(k) { WX.type = k; WX.target = WX_POWER[k]; WX.timer = 70 + Math.random() * 110; }
const PN = 1000, pOff = new Float32Array(PN * 3), rainPos = new Float32Array(PN * 6), snowPos = new Float32Array(PN * 3);
for (let i = 0; i < PN; i++) { pOff[i * 3] = (Math.random() - .5) * 40; pOff[i * 3 + 1] = Math.random() * 24; pOff[i * 3 + 2] = (Math.random() - .5) * 40; }
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaecbff, transparent: true, opacity: .55, fog: false })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 3.2, sizeAttenuation: false, transparent: true, opacity: .9, fog: false })); snowPts.frustumCulled = false; snowPts.visible = false; scene.add(snowPts);
let wxIcon = '';
function updateWeather(dt, t) {
  if (curCfg().indoor) { WX.type = 'clear'; WX.target = 0; }
  WX.timer -= dt; if (WX.timer <= 0) setWeather(pickWeather());
  WX.mix += (WX.target - WX.mix) * Math.min(1, dt * .35);
  if (WX.type === 'storm' && WX.flash <= 0 && Math.random() < dt * .12) { WX.flash = 1; WX.thunderAt = t + .4 + Math.random() * 1.2; }
  WX.flash = Math.max(0, WX.flash - dt * 2.5); $('flash').style.opacity = WX.flash * .7;
  if (WX.thunderAt && t > WX.thunderAt) { WX.thunderAt = 0; thunder(); }
  const isSnow = WX.type === 'snow', isRain = WX.type === 'rain' || WX.type === 'storm', on = (isSnow || isRain) && WX.mix > .12 && !curCfg().indoor;
  rain.visible = on && isRain; snowPts.visible = on && isSnow;
  if (on) {
    const n = Math.floor(PN * clamp(WX.mix * (isSnow ? 1.1 : 1.25), .1, 1)), cx = camera.position.x, cy = camera.position.y - 6, cz = camera.position.z;
    for (let i = 0; i < PN; i++) {
      let y = pOff[i * 3 + 1] - (isSnow ? 2.4 : 24) * dt;
      if (y < 0) { y += 24; pOff[i * 3] = (Math.random() - .5) * 40; pOff[i * 3 + 2] = (Math.random() - .5) * 40; }
      pOff[i * 3 + 1] = y;
      const x = cx + pOff[i * 3] + (isSnow ? Math.sin(t + i) * .6 : 0), z = cz + pOff[i * 3 + 2], yy = cy + y;
      if (isSnow) { snowPos[i * 3] = x; snowPos[i * 3 + 1] = yy; snowPos[i * 3 + 2] = z; }
      else { rainPos[i * 6] = x; rainPos[i * 6 + 1] = yy; rainPos[i * 6 + 2] = z; rainPos[i * 6 + 3] = x - .06; rainPos[i * 6 + 4] = yy + .8; rainPos[i * 6 + 5] = z; }
    }
    if (isSnow) { snowGeo.attributes.position.needsUpdate = true; snowGeo.setDrawRange(0, n); } else { rainGeo.attributes.position.needsUpdate = true; rainGeo.setDrawRange(0, n * 2); }
  }
  const ic = curCfg().indoor ? '🔦' : WX.type === 'clear' ? (isNight ? '🌙' : '☀️') : WX_ICON[WX.type];
  if (ic !== wxIcon) { wxIcon = ic; $('h-wx').textContent = ic; }
}

// ---------- Sons d'ambiance et musique (générés, aucun fichier) ----------
const Snd = { started: false, tNote: 0, tBird: 0, tCrick: 0, tDrip: 0, tHoot: 0, tRoar: 0, step: 2, white: null };
function sndStart() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    if (Snd.started) return; Snd.started = true;
    const ac = AC, mkBuf = brown => { const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w * .6; } return b; };
    Snd.white = mkBuf(false); const brown = mkBuf(true);
    const mk = (buf, type, freq, q) => { const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ac.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(ac.destination); src.start(); return g; };
    Snd.wind = mk(brown, 'bandpass', 420, .5); Snd.rain = mk(Snd.white, 'highpass', 2200, .3); Snd.wave = mk(brown, 'lowpass', 380, .4);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 50; Snd.hum = ac.createGain(); Snd.hum.gain.value = 0; o.connect(Snd.hum); Snd.hum.connect(ac.destination); o.start();
  } catch (e) {}
}
const chirp = () => { const f = 2200 + Math.random() * 1600; tone(f, .07, 'sine', .018); tone(f * 1.25, .07, 'sine', .018, .09); if (Math.random() < .5) tone(f * 1.1, .06, 'sine', .016, .18); };
const crickets = () => { for (let i = 0; i < 5; i++) tone(4200, .03, 'square', .006, i * .07); };
const drip = () => { const f = 1100 + Math.random() * 900; tone(f, .18, 'sine', .03); tone(f * .5, .25, 'sine', .015, .02); };
const hoot = () => { tone(520, .25, 'sine', .03); tone(380, .35, 'sine', .03, .22); };
const roar = () => { tone(95, .6, 'sawtooth', .025); tone(70, .8, 'sawtooth', .025, .15); };
function thunder() {
  if (!Snd.started || !S.snd.amb || !Snd.white) return;
  const ac = AC, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t0 = ac.currentTime;
  src.buffer = Snd.white; f.type = 'lowpass'; f.frequency.value = 260; g.gain.setValueAtTime(.001, t0); g.gain.linearRampToValueAtTime(.35, t0 + .08); g.gain.exponentialRampToValueAtTime(.001, t0 + 2.4);
  src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t0); src.stop(t0 + 2.6);
}
const MUSIC = {
  farm: { root: 261.6, scale: [0, 2, 4, 7, 9, 12, 14], wave: 'triangle', gap: [.5, 1.1], vol: .035, dur: .7 },
  jungle: { root: 220, scale: [0, 2, 3, 7, 8, 12], wave: 'sine', gap: [.3, .8], vol: .045, dur: .25 },
  savanna: { root: 196, scale: [0, 2, 5, 7, 9, 12], wave: 'triangle', gap: [.9, 1.6], vol: .035, dur: 1.1 },
  rock: { root: 174.6, scale: [0, 3, 5, 7, 10, 12], wave: 'sine', gap: [1, 2], vol: .04, dur: 1.5 },
  ocean: { root: 246.9, scale: [0, 2, 4, 7, 9, 11, 14], wave: 'sine', gap: [.35, .7], vol: .035, dur: 1.2 },
  snow: { root: 392, scale: [0, 2, 4, 7, 9, 12, 16], wave: 'sine', gap: [.9, 1.8], vol: .035, dur: 2, bell: true },
  cave: { root: 130.8, scale: [0, 3, 6, 7, 10], wave: 'sine', gap: [1.4, 3.2], vol: .04, dur: 2.4 },
  west: { root: 146.8, scale: [0, 3, 5, 7, 10, 12], wave: 'triangle', gap: [.6, 1.3], vol: .035, dur: .8 },
};
function updateSound(t) {
  if (!Snd.started || !AC) return;
  const A = S.snd.amb, M = S.snd.music, w = S.world, g = (n, v) => n.gain.setTargetAtTime(v, AC.currentTime, .6);
  const base = { farm: .008, jungle: .006, savanna: .018, west: .02, rock: .03, ocean: .02, snow: .035, cave: .003 }[w] || .01, calm = state === 'menu' ? .6 : 1;
  g(Snd.wind, A ? (base + WX.mix * .02 + (WX.type === 'storm' ? .02 : 0)) * calm : 0);
  g(Snd.rain, A && (WX.type === 'rain' || WX.type === 'storm') ? .04 * WX.mix : 0);
  g(Snd.wave, A && w === 'ocean' ? .03 + Math.sin(t * .45) * .012 : 0);
  g(Snd.hum, A && w === 'cave' ? .03 : 0);
  if (A) {
    const rainy = WX.type === 'rain' || WX.type === 'storm';
    if (t > Snd.tBird && ['farm', 'jungle', 'savanna', 'ocean'].includes(w) && !isNight && !rainy) { chirp(); Snd.tBird = t + 2 + Math.random() * 5; }
    if (t > Snd.tCrick && isNight && ['farm', 'jungle', 'savanna', 'west'].includes(w)) { crickets(); Snd.tCrick = t + 1.5 + Math.random() * 2.5; }
    if (t > Snd.tDrip && w === 'cave') { drip(); Snd.tDrip = t + 1.5 + Math.random() * 4; }
    if (t > Snd.tHoot && w === 'jungle') { hoot(); Snd.tHoot = t + 8 + Math.random() * 14; }
    if (t > Snd.tRoar && w === 'savanna') { roar(); Snd.tRoar = t + 25 + Math.random() * 30; }
  }
  const m = MUSIC[w] || MUSIC.farm;
  if (M && t > Snd.tNote) {
    Snd.step = clamp(Snd.step + pick([-2, -1, -1, 0, 1, 1, 2]), 0, m.scale.length - 1);
    const f = m.root * Math.pow(2, m.scale[Snd.step] / 12);
    tone(f, m.dur, m.wave, m.vol); if (m.bell) tone(f * 2, m.dur * .6, 'sine', m.vol * .4);
    if (Math.random() < .25) tone(m.root / 2, m.dur * 1.6, 'sine', m.vol * .7);
    Snd.tNote = t + m.gap[0] + Math.random() * (m.gap[1] - m.gap[0]);
  }
}
function renderSndChips(el) {
  el.innerHTML = '';
  [['music', '🎵 Musique'], ['amb', '🔊 Ambiance']].forEach(([k, l]) => chip(el, l, S.snd[k], b => { S.snd[k] = !S.snd[k]; b.classList.toggle('on', S.snd[k]); sndStart(); save(); }));
}

// ---------- Papillons le jour, lucioles la nuit ----------
const critters = [], cmC = {};
const cmat = hex => cmC[hex] || (cmC[hex] = new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide }));
const BCOL = [0xff8fb1, 0xffd54a, 0x7fd1ff, 0xffffff, 0xff9f43, 0xb794f6], bodyDark = cmat(0x2b2b2b), glowMat = new THREE.MeshBasicMaterial({ color: 0xfff27a });
for (let i = 0; i < 16; i++) {
  const g = new THREE.Group(), wm = cmat(pick(BCOL)), body = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .16), bodyDark);
  const mk = sgn => { const pv = new THREE.Group(), gg = new THREE.PlaneGeometry(.2, .15); gg.rotateX(-Math.PI / 2); gg.translate(sgn * .1, 0, 0); pv.add(new THREE.Mesh(gg, wm)); pv.position.x = sgn * .02; return pv; };
  const pl = mk(-1), pr = mk(1); g.add(body, pl, pr); g.visible = false; scene.add(g);
  critters.push({ g, body, pl, pr, x: 0, y: 20, z: 0, dir: Math.random() * 6.28, spd: .6 + Math.random() * .6, ph: Math.random() * 6, init: false });
}
function updateCritters(dt, t) {
  const n = (WORLDS[S.world] || WORLDS.farm).critters || 0;
  critters.forEach((c, i) => {
    c.g.visible = i < n; if (i >= n) return;
    c.dir += Math.sin(t * .7 + c.ph) * dt * 2.2; c.x += Math.sin(c.dir) * c.spd * dt; c.z += Math.cos(c.dir) * c.spd * dt;
    const dx = c.x - P.x, dz = c.z - P.z;
    if (!c.init || dx * dx + dz * dz > 900) { const a = Math.random() * 6.283, d = 5 + Math.random() * 16; c.x = P.x + Math.cos(a) * d; c.z = P.z + Math.sin(a) * d; c.init = true; }
    c.x = clamp(c.x, 1, W - 2); c.z = clamp(c.z, 1, D - 2);
    const ty = surfaceY(c.x, c.z) + 1.1 + Math.sin(t * 2 + c.ph) * .35; c.y += (ty - c.y) * Math.min(1, dt * 3);
    c.g.position.set(c.x, c.y, c.z); c.g.rotation.y = c.dir;
    const flap = isNight ? 0 : Math.sin(t * 22 + c.ph) * .9; c.pl.rotation.z = -flap; c.pr.rotation.z = flap;
    c.pl.visible = c.pr.visible = !isNight; c.body.material = isNight ? glowMat : bodyDark; c.body.scale.setScalar(isNight ? 2.4 : 1);
  });
}
// ---------- Mini-carte ----------
const mmc = $('mm'), mmx = mmc.getContext('2d'), MMS = 48, mmImg = mmx.createImageData(MMS, MMS), mmCol = {};
for (const k in BLOCKS) { const c = BLOCKS[k].c; mmCol[k] = [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
function updateMinimap() {
  const px = Math.floor(P.x), pz = Math.floor(P.z), h = MMS / 2, d = mmImg.data, marks = [];
  for (let j = 0; j < MMS; j++) for (let i = 0; i < MMS; i++) {
    const x = px - h + i, z = pz - h + j, k = (j * MMS + i) * 4; let c = [10, 14, 30];
    if (x >= 0 && x < W && z >= 0 && z < D) {
      let y = curCfg().indoor ? Math.min(H - 1, Math.floor(P.y) + 5) : H - 1; while (y > 0 && !get(x, y, z)) y--;
      const b = get(x, y, z), base = mmCol[b] || [120, 120, 120], f = clamp(.7 + (y - 14) * .018, .5, 1.15);
      c = [base[0] * f, base[1] * f, base[2] * f];
      if (b === B.CHEST) { const sp = EV.chest && EV.chest.x === x && EV.chest.z === z; marks.push([i, j, sp ? '#ff4d4d' : '#ffd43b', sp ? 5 : 3]); } else if (b === B.LUCKY) marks.push([i, j, '#fff3a0', 2]);
    }
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  mmx.putImageData(mmImg, 0, 0);
  marks.forEach(([i, j, col, sz]) => { mmx.fillStyle = '#000'; mmx.fillRect(i - 1, j - 1, sz + 2, sz + 2); mmx.fillStyle = col; mmx.fillRect(i, j, sz, sz); });
  pickups.forEach(p => { if (p.find && p.find.rar) return; const i = Math.floor(p.x) - px + h, j = Math.floor(p.z) - pz + h; if (i >= 0 && i < MMS && j >= 0 && j < MMS) { mmx.fillStyle = '#ffe066'; mmx.fillRect(i, j, 2, 2); } });
  animals.forEach(a => { const i = Math.floor(a.x) - px + h, j = Math.floor(a.z) - pz + h; if (i >= 0 && i < MMS && j >= 0 && j < MMS) { const big = a.type === 'merchant' || a.type === 'tmerchant' || a.rare; mmx.fillStyle = (a.type === 'merchant' || a.type === 'tmerchant') ? '#ff9f1c' : a.rare ? '#c77dff' : a.pet ? '#ff6fa8' : '#fff'; mmx.fillRect(i, j, big ? 4 : 2, big ? 4 : 2); } });
}
let mmT = 0;

// ---------- Joueur ----------
const P = { x: W / 2, y: 30, z: D / 2, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, ground: false, fly: false };
const PW = .3, PH = 1.8, EYE = 1.62;
let riding = false;   // le joueur est monté sur son compagnon
const keys = {};
const joy = { x: 0, y: 0 };
function collides(x, y, z) {
  const x0 = Math.floor(x - PW), x1 = Math.floor(x + PW), y0 = Math.floor(y), y1 = Math.floor(y + PH - .001), z0 = Math.floor(z - PW), z1 = Math.floor(z + PW);
  for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) for (let c = z0; c <= z1; c++) if (solid(get(a, b, c))) return true;
  return false;
}
function placePlayer() {
  const rec = worldRec(), cfg = curCfg();
  P.vx = P.vy = P.vz = 0; P.pitch = -.1; P.yaw = 0; P.fly = false;
  if (rec.pos) { [P.x, P.y, P.z, P.yaw] = rec.pos; for (let i = 0; i < 4 && collides(P.x, P.y, P.z); i++) P.y += 1; if (!collides(P.x, P.y, P.z)) { camera.position.set(P.x, P.y + EYE, P.z); return; } }
  let best = null, bd = 1e9;
  for (let x = 3; x < W - 3; x += 3) for (let z = 3; z < D - 3; z += 3) { const y = landY(x, z); if (y > SEA && cfg.ground.has(get(x, y - 1, z)) && get(x, y, z) === 0 && get(x, y + 1, z) === 0) { const d = (x - W / 2) ** 2 + (z - D / 2) ** 2; if (d < bd) { bd = d; best = [x, y, z]; } } }
  if (best) { P.x = best[0] + .5; P.z = best[2] + .5; P.y = best[1] + .1; } else { P.x = W / 2 + .5; P.z = D / 2 + .5; P.y = landY(P.x, P.z) + .1; }
}
function updatePlayer(dt) {
  // flèches / boutons ◀ ▶ : tourner sur soi-même
  P.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 2.4 * dt;
  P.pitch = clamp(P.pitch + ((keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0)) * 1.6 * dt, -1.55, 1.55);
  let f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) + joy.y;
  let s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + joy.x;
  const m = Math.hypot(f, s); if (m > 1) { f /= m; s /= m; }
  if (P.fly && !UNLOCK_ALL) P.fly = false;
  const sprint = (keys.ShiftLeft || keys.ShiftRight) && !P.fly;
  const inW = !P.fly && (get(Math.floor(P.x), Math.floor(P.y + .9), Math.floor(P.z)) === B.WATER || get(Math.floor(P.x), Math.floor(P.y + .3), Math.floor(P.z)) === B.WATER);
  const sp = (sprint ? 7 : 4.6) * (P.fly ? 1.9 : 1) * (inW ? .6 : 1) * (riding ? mountSpeed() : 1);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const tx = (-sy * f + cy * s) * sp, tz = (-cy * f - sy * s) * sp;
  const k = Math.min(1, dt * (P.ground || P.fly ? 14 : 5));
  P.vx += (tx - P.vx) * k; P.vz += (tz - P.vz) * k;
  if (P.fly) P.vy = ((keys.Space ? 1 : 0) - (keys.ShiftLeft || keys.down ? 1 : 0)) * 8;
  else if (inW) { P.vy = Math.max(P.vy - 9 * dt, -3); if (keys.Space) P.vy = Math.min(P.vy + 32 * dt, 4); if (P.wall && (keys.Space || f || s)) P.vy = Math.max(P.vy, 7.5); }
  else { P.vy = Math.max(P.vy - 28 * dt, -40); if (keys.Space && P.ground) { P.vy = riding ? 11.5 : 9; P.ground = false; if (TUTO.on) tutoEvent('jump'); } }
  let n = Math.ceil(Math.max(Math.abs(P.vx), Math.abs(P.vy), Math.abs(P.vz)) * dt / .3) || 1;
  const sdt = dt / n; P.wall = false;
  for (let i = 0; i < n; i++) {
    P.x += P.vx * sdt; if (collides(P.x, P.y, P.z)) { P.x -= P.vx * sdt; P.vx = 0; P.wall = true; }
    P.z += P.vz * sdt; if (collides(P.x, P.y, P.z)) { P.z -= P.vz * sdt; P.vz = 0; P.wall = true; }
    P.y += P.vy * sdt; P.ground = false;
    if (collides(P.x, P.y, P.z)) { P.y -= P.vy * sdt; if (P.vy < 0) P.ground = true; P.vy = 0; }
  }
  P.x = clamp(P.x, PW + .01, W - PW - .01); P.z = clamp(P.z, PW + .01, D - PW - .01);
  if (P.y < -10) placePlayer();
  camera.position.set(P.x, P.y + EYE + (riding ? mountLift() : 0), P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  $('uw').style.opacity = get(Math.floor(P.x), Math.floor(P.y + EYE), Math.floor(P.z)) === B.WATER ? 1 : 0;
}

// Le vol n'existe qu'en mode debug (index.html?debug) : pour les tests et les captures
function syncFly() { $('t-down').classList.toggle('hidden', !UNLOCK_ALL || !P.fly); $('t-fly').style.background = P.fly ? 'rgba(255,212,59,.6)' : ''; }
function toggleFly() { if (!UNLOCK_ALL) return; P.fly = !P.fly; syncFly(); toast(P.fly ? '🕊️ Mode debug : tu voles (Espace ↑ / Maj ↓)' : 'Tu marches'); }
if (UNLOCK_ALL) $('t-fly').classList.remove('hidden');
// ---------- Lancer de rayon (blocs) ----------
function raycast(o, d, max) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = d.x > 0 ? 1 : -1, sy = d.y > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
  const tdx = d.x ? Math.abs(1 / d.x) : Infinity, tdy = d.y ? Math.abs(1 / d.y) : Infinity, tdz = d.z ? Math.abs(1 / d.z) : Infinity;
  let tx = d.x ? (d.x > 0 ? x + 1 - o.x : o.x - x) * tdx : Infinity;
  let ty = d.y ? (d.y > 0 ? y + 1 - o.y : o.y - y) * tdy : Infinity;
  let tz = d.z ? (d.z > 0 ? z + 1 - o.z : o.z - z) * tdz : Infinity;
  let nx = 0, ny = 0, nz_ = 0, t = 0;
  while (t <= max) {
    if (solid(get(x, y, z))) return { x, y, z, nx, ny, nz: nz_, t };
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz_ = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz_ = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz_ = -sz; }
  }
  return null;
}
const dirVec = new THREE.Vector3();
function lookDir() { return camera.getWorldDirection(dirVec); }

// ---------- Inventaire ----------
const inv = S.inv; HOTBAR.forEach(b => { if (inv[b] == null) inv[b] = 30; });
let sel = 3;
function drawCube(c, id) {
  const x = c.getContext('2d'), a = c.width / 2, h = a * 1.05, t = BLOCKS[id].t;
  x.clearRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false;
  const face = (tx, m, shade) => { x.save(); x.setTransform(...m); x.drawImage(atlas, tx * TS, 0, TS, TS, 0, 0, TS, TS); if (shade) { x.fillStyle = `rgba(0,0,0,${shade})`; x.fillRect(0, 0, TS, TS); } x.restore(); };
  face(t[0], [a / TS, a / (2 * TS), -a / TS, a / (2 * TS), a, 0], 0);
  face(t[1], [a / TS, a / (2 * TS), 0, h / TS, 0, a / 2], .22);
  face(t[1], [a / TS, -a / (2 * TS), 0, h / TS, a, a], .42);
}
function swing() { const h = $('hand'); h.classList.remove('swing'); void h.offsetWidth; h.classList.add('swing'); }
function buildHotbar() {
  const hb = $('hotbar'); hb.innerHTML = '';
  HOTBAR.forEach((b, i) => {
    const s = document.createElement('div'); s.className = 'slot' + (i === sel ? ' sel' : ''); s.dataset.i = i;
    const c = document.createElement('canvas'); c.width = 56; c.height = 58; drawCube(c, b);
    s.appendChild(c);
    const n = document.createElement('i'); n.textContent = i + 1; s.appendChild(n);
    const q = document.createElement('b'); q.textContent = UNLOCK_ALL ? '∞' : inv[b]; q.id = 'cnt' + b; s.appendChild(q);
    s.addEventListener('pointerdown', e => { e.stopPropagation(); selectSlot(i); });
    hb.appendChild(s);
  });
}
function selectSlot(i) { sel = (i + 9) % 9; drawCube($('hand').firstChild, HOTBAR[sel]); [...$('hotbar').children].forEach((s, k) => s.classList.toggle('sel', k === sel)); }
function addInv(b, n) { inv[b] = (inv[b] || 0) + n; saveSoon(); const e = $('cnt' + b); if (e) e.textContent = UNLOCK_ALL ? '∞' : inv[b]; }

// ---------- Particules ----------
const pGeo = new THREE.BoxGeometry(.14, .14, .14), pMats = {}, parts = [];
function burst(x, y, z, color, n = 10) {
  const m = pMats[color] || (pMats[color] = new THREE.MeshBasicMaterial({ color }));
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(pGeo, m); p.position.set(x + Math.random(), y + Math.random(), z + Math.random());
    p.userData = { v: new THREE.Vector3((Math.random() - .5) * 4, Math.random() * 4 + 1, (Math.random() - .5) * 4), life: .8 };
    scene.add(p); parts.push(p);
  }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i], u = p.userData; u.life -= dt; u.v.y -= 14 * dt; p.position.addScaledVector(u.v, dt);
    if (u.life <= 0) { scene.remove(p); parts.splice(i, 1); }
  }
}

// ---------- Animaux gentils ----------
const animalMats = [];
const amC = {};
function am(hex) { if (!amC[hex]) { const m = new THREE.MeshBasicMaterial({ color: hex }); m.userData.base = new THREE.Color(hex); animalMats.push(m); amC[hex] = m; } return amC[hex]; }
const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };
const legs = (g, m, list, w, h) => list.forEach(([x, z]) => g.add(box(w, h, w, m, x, h / 2, z)));
const L4 = (a, b) => [[-a, b], [a, b], [-a, -b], [a, -b]];
const AEYE = am(0x222222);
const TYPES = {
  pig: { size: 1, build(g) { const P = am(0xf4a7b9); g.add(box(.6, .5, .95, P, 0, .55, 0), box(.46, .44, .44, P, 0, .68, .65), box(.2, .14, .08, am(0xe8788e), 0, .62, .9), box(.07, .07, .03, AEYE, -.12, .76, .88), box(.07, .07, .03, AEYE, .12, .76, .88)); legs(g, P, L4(.2, .3), .17, .3); } },
  sheep: { size: 1.1, build(g) { const W = am(0xf5f5f5); g.add(box(.75, .65, 1, W, 0, .7, 0), box(.4, .4, .4, am(0x3a2a2a), 0, .85, .62), box(.07, .07, .03, W, -.1, .92, .83), box(.07, .07, .03, W, .1, .92, .83)); legs(g, am(0x8a8a8a), L4(.22, .3), .15, .4); } },
  chick: { size: .8, build(g) { const Y = am(0xf6c744), O = am(0xf08a24); g.add(box(.4, .4, .5, Y, 0, .45, 0), box(.28, .28, .28, Y, 0, .75, .26), box(.12, .08, .12, O, 0, .72, .46), box(.06, .06, .03, AEYE, -.08, .8, .41), box(.06, .06, .03, AEYE, .08, .8, .41), box(.05, .2, .05, O, -.1, .1, 0), box(.05, .2, .05, O, .1, .1, 0)); } },
  cow: { size: 1.5, build(g) { const W = am(0xf5f5f5), K = am(0x2b2b2b);
    g.add(box(.8, .75, 1.3, W, 0, .95, 0), box(.82, .3, .35, K, 0, 1.1, .2), box(.82, .25, .3, K, 0, .85, -.3), box(.5, .5, .5, W, 0, 1.15, .85), box(.34, .22, .1, am(0xe8a0a0), 0, 1.02, 1.12), box(.08, .15, .08, K, -.2, 1.45, .8), box(.08, .15, .08, K, .2, 1.45, .8), box(.07, .07, .03, AEYE, -.14, 1.22, 1.11), box(.07, .07, .03, AEYE, .14, 1.22, 1.11));
    legs(g, W, L4(.25, .45), .2, .6); } },
  horse: { size: 2, build(g) { const B_ = am(0x8b5a2b), D_ = am(0x3a2412);
    g.add(box(.55, .7, 1.3, B_, 0, 1.1, 0), box(.3, .7, .3, B_, 0, 1.55, .65), box(.3, .35, .6, B_, 0, 1.95, .95), box(.1, .6, .2, D_, 0, 1.7, .45), box(.1, .5, .1, D_, 0, 1.0, -.7), box(.07, .07, .03, AEYE, -.16, 2.02, 1.1), box(.07, .07, .03, AEYE, .16, 2.02, 1.1));
    legs(g, B_, L4(.2, .5), .16, .75); } },
  monkey: { size: .9, hop: false, build(g) { const B_ = am(0x7a4b2a), T = am(0xe3b98a);
    g.add(box(.4, .5, .3, B_, 0, .65, 0), box(.34, .3, .3, B_, 0, 1.05, .05), box(.22, .18, .05, T, 0, 1.02, .22), box(.06, .06, .03, AEYE, -.07, 1.1, .23), box(.06, .06, .03, AEYE, .07, 1.1, .23), box(.1, .4, .1, B_, -.27, .65, .05), box(.1, .4, .1, B_, .27, .65, .05), box(.07, .5, .07, B_, 0, .7, -.22), box(.07, .07, .3, B_, 0, .98, -.35));
    legs(g, B_, [[-.1, 0], [.1, 0]], .12, .4); } },
  parrot: { size: .6, hop: true, build(g) { const R = am(0xe03131), Bl = am(0x1c7ed6), Y = am(0xf6c744);
    g.add(box(.25, .35, .25, R, 0, .4, 0), box(.2, .2, .2, R, 0, .72, .05), box(.1, .1, .12, Y, 0, .7, .18), box(.05, .25, .2, Bl, -.15, .42, 0), box(.05, .25, .2, Bl, .15, .42, 0), box(.1, .1, .35, Bl, 0, .25, -.22), box(.05, .05, .03, AEYE, -.06, .76, .15), box(.05, .05, .03, AEYE, .06, .76, .15), box(.04, .15, .04, Y, -.06, .08, 0), box(.04, .15, .04, Y, .06, .08, 0)); } },
  frog: { size: .45, hop: true, build(g) { const G = am(0x4caf50), D_ = am(0x2e7d32);
    g.add(box(.4, .2, .45, G, 0, .2, 0), box(.1, .1, .1, am(0xffffff), -.12, .35, .18), box(.1, .1, .1, am(0xffffff), .12, .35, .18), box(.05, .05, .03, AEYE, -.12, .35, .24), box(.05, .05, .03, AEYE, .12, .35, .24), box(.12, .12, .25, D_, -.22, .1, -.15), box(.12, .12, .25, D_, .22, .1, -.15)); } },
  giraffe: { size: 3.2, build(g) { const Y = am(0xe9b949), B_ = am(0x8a5a1c);
    g.add(box(.65, .7, 1.2, Y, 0, 1.55, 0), box(.25, 1.2, .25, Y, 0, 2.35, .55), box(.3, .3, .5, Y, 0, 3.0, .75), box(.05, .15, .05, B_, -.08, 3.25, .7), box(.05, .15, .05, B_, .08, 3.25, .7), box(.67, .2, .25, B_, 0, 1.6, .2), box(.67, .2, .25, B_, 0, 1.5, -.3), box(.27, .2, .27, B_, 0, 2.5, .55), box(.2, .15, .1, B_, 0, 2.95, 1.0), box(.06, .06, .03, AEYE, -.1, 3.05, 1.0), box(.06, .06, .03, AEYE, .1, 3.05, 1.0), box(.06, .5, .06, B_, 0, 1.4, -.65));
    legs(g, Y, L4(.22, .45), .18, 1.2); } },
  elephant: { size: 2.4, build(g) { const G = am(0x8e9aa6), W = am(0xf1ead6);
    g.add(box(1, 1, 1.5, G, 0, 1.4, 0), box(.8, .8, .7, G, 0, 1.6, 1.05), box(.25, .9, .25, G, 0, .95, 1.5), box(.1, .7, .6, G, -.5, 1.65, .95), box(.1, .7, .6, G, .5, 1.65, .95), box(.07, .07, .4, W, -.28, 1.1, 1.55), box(.07, .07, .4, W, .28, 1.1, 1.55), box(.08, .08, .03, AEYE, -.25, 1.8, 1.41), box(.08, .08, .03, AEYE, .25, 1.8, 1.41), box(.06, .4, .06, G, 0, 1.2, -.78));
    legs(g, G, L4(.3, .55), .38, .9); } },
  zebra: { size: 1.9, build(g) { const W = am(0xf5f5f5), K = am(0x222222);
    g.add(box(.6, .7, 1.2, W, 0, 1.0, 0), box(.28, .6, .28, W, 0, 1.45, .6), box(.28, .3, .55, W, 0, 1.8, .9), box(.08, .5, .2, K, 0, 1.55, .5), box(.08, .5, .08, K, 0, .9, -.65), box(.06, .06, .03, AEYE, -.15, 1.88, 1.02), box(.06, .06, .03, AEYE, .15, 1.88, 1.02));
    [-.4, -.1, .2, .5].forEach(z => g.add(box(.62, .72, .1, K, 0, 1.0, z))); legs(g, W, L4(.18, .45), .16, .7); } },
  lion: { size: 1.3, build(g) { const T = am(0xd9a441), M = am(0x7a4a1a);
    g.add(box(.6, .55, 1.1, T, 0, .8, 0), box(.45, .45, .4, T, 0, 1.0, .7), box(.65, .65, .25, M, 0, 1.0, .52), box(.08, .08, .5, T, 0, .8, -.75), box(.12, .12, .12, M, 0, .8, -1.05), box(.14, .1, .05, am(0x6b3a1a), 0, .92, .92), box(.06, .06, .03, AEYE, -.12, 1.08, .91), box(.06, .06, .03, AEYE, .12, 1.08, .91));
    legs(g, T, L4(.2, .4), .18, .5); } },
  goat: { size: 1.1, build(g) { const W = am(0xf0efe8), Gy = am(0x8c8c8c);
    g.add(box(.5, .5, .9, W, 0, .7, 0), box(.28, .3, .4, W, 0, 1.05, .6), box(.05, .2, .05, Gy, -.08, 1.3, .55), box(.05, .2, .05, Gy, .08, 1.3, .55), box(.08, .15, .08, W, 0, .9, .82), box(.05, .05, .03, AEYE, -.08, 1.1, .8), box(.05, .05, .03, AEYE, .08, 1.1, .8));
    legs(g, Gy, L4(.15, .3), .12, .45); } },
  ibex: { size: 1.5, build(g) { const B_ = am(0x8a6a4a), D_ = am(0x4a3622), C = am(0xd8cdb0);
    g.add(box(.55, .55, 1, B_, 0, .85, 0), box(.3, .3, .4, D_, 0, 1.2, .65), box(.08, .5, .08, C, -.1, 1.55, .5), box(.08, .5, .08, C, .1, 1.55, .5), box(.08, .12, .3, C, -.1, 1.8, .35), box(.08, .12, .3, C, .1, 1.8, .35), box(.05, .05, .03, AEYE, -.08, 1.28, .85), box(.05, .05, .03, AEYE, .08, 1.28, .85));
    legs(g, D_, L4(.18, .35), .13, .6); } },
  marmot: { size: .5, build(g) { const B_ = am(0x8b6b4a), T = am(0xc9a77c);
    g.add(box(.35, .3, .6, B_, 0, .25, 0), box(.25, .22, .25, T, 0, .33, .38), box(.07, .07, .03, AEYE, -.07, .38, .51), box(.07, .07, .03, AEYE, .07, .38, .51), box(.06, .08, .05, B_, -.1, .48, .34), box(.06, .08, .05, B_, .1, .48, .34), box(.1, .1, .25, B_, 0, .25, -.4)); legs(g, B_, L4(.12, .2), .09, .15); } },
};
TYPES.pig.head = [.9, .65, .46]; TYPES.sheep.head = [1.05, .62, .4]; TYPES.chick.head = [.9, .26, .28]; TYPES.monkey.head = [1.2, .05, .34]; TYPES.lion.head = [1.25, .7, .45];
Object.assign(TYPES, {
  dog: { size: 1, head: [.95, .6, .4], build(g) { const B_ = am(0xc9964a), D_ = am(0x7a5226), W = am(0xf5ead0);
    g.add(box(.45, .45, .85, B_, 0, .6, 0), box(.4, .4, .4, B_, 0, .88, .55), box(.2, .16, .22, W, 0, .8, .8), box(.07, .07, .04, AEYE, -.1, .93, .75), box(.07, .07, .04, AEYE, .1, .93, .75), box(.09, .09, .05, AEYE, 0, .86, .92),
      box(.1, .2, .08, D_, -.22, .9, .5), box(.1, .2, .08, D_, .22, .9, .5), box(.08, .08, .4, B_, 0, .75, -.55)); legs(g, B_, L4(.15, .3), .13, .4); } },
  cat: { size: .9, head: [.9, .5, .34], build(g) { const G = am(0x8d8d96), W = am(0xf1f1f1), P_ = am(0xff9fb5);
    g.add(box(.36, .36, .75, G, 0, .5, 0), box(.34, .32, .32, G, 0, .8, .45), box(.1, .1, .08, G, -.12, 1.02, .42), box(.1, .1, .08, G, .12, 1.02, .42), box(.1, .08, .04, P_, 0, .74, .62), box(.07, .07, .04, AEYE, -.08, .85, .62), box(.07, .07, .04, AEYE, .08, .85, .62), box(.07, .07, .55, G, 0, .75, -.6), box(.07, .3, .07, G, 0, .9, -.85)); legs(g, W, L4(.12, .25), .11, .35); } },
  merchant: { size: 1.9, still: true, head: [1.85, 0, .42], build(g) { const Sk = am(0xf1c27d), Bl = am(0x2c6fb7), Wh = am(0xf6f6f6), St = am(0xe9c46a), Br = am(0x6b3a1a), Wd = am(0x9a6a35);
    g.add(box(.5, .75, .32, Bl, 0, 1.2, 0), box(.46, .5, .05, Wh, 0, 1.1, .17), box(.4, .4, .4, Sk, 0, 1.8 - .02, 0), box(.7, .04, .7, St, 0, 1.97, 0), box(.38, .16, .38, St, 0, 2.06, 0), box(.3, .06, .04, Br, 0, 1.72, .21), box(.07, .07, .04, AEYE, -.09, 1.84, .21), box(.07, .07, .04, AEYE, .09, 1.84, .21),
      box(.14, .6, .14, Bl, -.34, 1.2, 0), box(.14, .6, .14, Bl, .34, 1.2, 0)); legs(g, Br, [[-.12, 0], [.12, 0]], .18, .82);
    g.add(box(1.5, .7, .5, Wd, 0, .35, .85), box(1.6, .08, .6, am(0xc92a2a), 0, .74, .85), box(.25, .2, .25, am(0xe03131), -.45, .88, .85), box(.25, .2, .25, am(0x40c057), 0, .88, .85), box(.25, .2, .25, am(0xffd43b), .45, .88, .85)); } },
});
Object.assign(TYPES, {
  crab: { size: .5, build(g) { const R = am(0xe04a32); g.add(box(.5, .2, .38, R, 0, .2, 0), box(.05, .12, .05, R, -.12, .34, .17), box(.05, .12, .05, R, .12, .34, .17), box(.05, .05, .03, AEYE, -.12, .42, .19), box(.05, .05, .03, AEYE, .12, .42, .19), box(.14, .14, .14, R, -.34, .2, .22), box(.14, .14, .14, R, .34, .2, .22)); legs(g, R, [[-.28, -.1], [-.28, .05], [.28, -.1], [.28, .05]], .06, .12); } },
  turtle: { size: .7, build(g) { const G = am(0x3f8f4a), Lg = am(0x7cc26a), Sk = am(0x9ab86a); g.add(box(.7, .26, .9, G, 0, .3, 0), box(.5, .1, .7, Lg, 0, .46, 0), box(.22, .2, .26, Sk, 0, .28, .55), box(.05, .05, .03, AEYE, -.07, .34, .69), box(.05, .05, .03, AEYE, .07, .34, .69)); legs(g, Sk, L4(.3, .3), .16, .16); } },
  dolphin: { size: 1.4, swim: true, build(g) { const Gb = am(0x6d9bc3), Wh = am(0xe8f1f7); g.add(box(.5, .45, 1.6, Gb, 0, .3, 0), box(.44, .14, 1.4, Wh, 0, .1, 0), box(.2, .18, .5, Gb, 0, .26, 1.0), box(.06, .3, .3, Gb, 0, .6, -.1), box(.6, .06, .3, Gb, 0, .3, -.95), box(.05, .05, .03, AEYE, -.23, .4, .6), box(.05, .05, .03, AEYE, .23, .4, .6), box(.3, .05, .18, Gb, -.32, .15, .3), box(.3, .05, .18, Gb, .32, .15, .3)); } },
  fish: { size: .4, swim: true, build(g) { const F = am(pick([0xf59f00, 0xff6b6b, 0x4dabf7, 0xfcc419, 0xb197fc])); g.add(box(.2, .22, .5, F, 0, .2, 0), box(.04, .2, .18, F, 0, .2, -.32), box(.05, .05, .03, AEYE, -.1, .26, .18), box(.05, .05, .03, AEYE, .1, .26, .18)); } },
  penguin: { size: 1.1, build(g) { const K = am(0x1e2230), W_ = am(0xf5f5f5), O = am(0xf59f00); g.add(box(.45, .7, .35, K, 0, .6, 0), box(.38, .55, .05, W_, 0, .55, .18), box(.34, .3, .32, K, 0, 1.1, 0), box(.14, .06, .14, O, 0, 1.06, .2), box(.06, .06, .03, W_, -.09, 1.15, .17), box(.06, .06, .03, W_, .09, 1.15, .17), box(.06, .45, .22, K, -.27, .65, 0), box(.06, .45, .22, K, .27, .65, 0), box(.15, .05, .22, O, -.1, .03, .08), box(.15, .05, .22, O, .1, .03, .08)); } },
  polarbear: { size: 1.8, build(g) { const W_ = am(0xf4f6f8), Cr = am(0xe6e0d0); g.add(box(.8, .75, 1.3, W_, 0, .85, 0), box(.5, .45, .5, W_, 0, 1.05, .85), box(.25, .2, .22, Cr, 0, .95, 1.2), box(.1, .08, .06, AEYE, 0, 1.02, 1.32), box(.12, .12, .08, W_, -.2, 1.32, .75), box(.12, .12, .08, W_, .2, 1.32, .75), box(.07, .07, .03, AEYE, -.14, 1.12, 1.1), box(.07, .07, .03, AEYE, .14, 1.12, 1.1)); legs(g, W_, L4(.28, .45), .28, .5); } },
  arcticfox: { size: .9, build(g) { const W_ = am(0xf5f8fa), K = am(0x23232b); g.add(box(.35, .35, .8, W_, 0, .45, 0), box(.3, .3, .3, W_, 0, .7, .5), box(.1, .1, .1, K, 0, .66, .68), box(.08, .14, .06, W_, -.1, .92, .45), box(.08, .14, .06, W_, .1, .92, .45), box(.06, .05, .03, AEYE, -.08, .76, .65), box(.06, .05, .03, AEYE, .08, .76, .65), box(.2, .2, .5, W_, 0, .5, -.65)); legs(g, K, L4(.11, .25), .1, .3); } },
  bat: { size: .6, fly: true, build(g) { const Pu = am(0x4a3a6a), Pd = am(0x7a5ca8), wl = new THREE.Group(), wr = new THREE.Group();
    g.add(box(.18, .22, .2, Pu, 0, .3, 0), box(.16, .16, .16, Pu, 0, .5, .05), box(.05, .08, .04, Pu, -.06, .62, .05), box(.05, .08, .04, Pu, .06, .62, .05), box(.04, .04, .03, am(0xffe066), -.04, .52, .14), box(.04, .04, .03, am(0xffe066), .04, .52, .14));
    wl.position.set(-.09, .34, 0); wl.add(box(.4, .03, .26, Pd, -.2, 0, 0)); wr.position.set(.09, .34, 0); wr.add(box(.4, .03, .26, Pd, .2, 0, 0)); g.add(wl, wr); g.userData.wings = [wl, wr]; } },
  mole: { size: .6, build(g) { const Br = am(0x6a5748), Pk = am(0xf4a6b0); g.add(box(.4, .3, .6, Br, 0, .25, 0), box(.28, .24, .3, Br, 0, .3, .42), box(.1, .08, .1, Pk, 0, .26, .62), box(.05, .05, .03, AEYE, -.09, .38, .55), box(.05, .05, .03, AEYE, .09, .38, .55), box(.14, .1, .1, Pk, -.2, .12, .34), box(.14, .1, .1, Pk, .2, .12, .34)); legs(g, Br, L4(.15, .2), .1, .12); } },
  slime: { size: .7, hop: true, build(g) { const G1 = am(0x6ee07a), G2 = am(0x3fb04e); g.add(box(.6, .5, .6, G2, 0, .25, 0), box(.52, .42, .52, G1, 0, .28, 0), box(.1, .12, .03, AEYE, -.12, .35, .3), box(.1, .12, .03, AEYE, .12, .35, .3), box(.16, .05, .03, AEYE, 0, .2, .3)); } },
});
function makeAnimal(type) { const g = new THREE.Group(); TYPES[type].build(g); return g; }
function newAnimal(type, x, y, z, pet) {
  const g = makeAnimal(type); g.position.set(x, y, z); scene.add(g);
  return { g, x, y, z, type, size: TYPES[type].size, dir: Math.random() * 6.28, t: 0, go: false, hop: 0, vy: 0, h: 0, pet: !!pet, ph: Math.random() * 6.28 };
}
let animals = [];
function spawnAnimals() {
  animals.forEach(a => scene.remove(a.g)); animals = [];
  const cfg = curCfg(); let tries = 0;
  while (animals.length < 16 && tries++ < 1500) {
    const x = rnd(5, W - 5) + .5, z = rnd(5, D - 5) + .5, y = landY(x, z), b = get(Math.floor(x), y - 1, Math.floor(z));
    if (y > SEA && (cfg.ground.has(b) || b === B.SAND || b === B.REDSAND) && get(Math.floor(x), y, Math.floor(z)) === 0) { const type = pick(cfg.animals); animals.push(newAnimal(type, x, y + (TYPES[type].fly ? 2 : 0), z)); }
  }
  if (cfg.swimmers) {
    let n = 0; tries = 0;
    while (n < 10 && tries++ < 3000) {
      const x = rnd(5, W - 5) + .5, z = rnd(5, D - 5) + .5;
      if (get(Math.floor(x), SEA, Math.floor(z)) === B.WATER && get(Math.floor(x), SEA - 2, Math.floor(z)) === B.WATER) { animals.push(newAnimal(pick(cfg.swimmers), x, SEA - 1, z)); n++; }
    }
  }
}
// hauteur du sol sous l'animal (cherchée depuis ses pieds : on ignore ce qui est au-dessus, ex. toits, feuilles)
function groundAt(x, z, fromY) {
  for (let y = Math.min(H - 1, Math.floor(fromY + .6)); y >= 0; y--) if (solid(get(Math.floor(x), y, Math.floor(z)))) return y + 1;
  return 0;
}
// un animal pris dans des blocs (souvent posés par le joueur) se dégage : il se place sur le sol libre le plus proche (pour un compagnon : le plus proche de son joueur)
const roomAt = (x, z, y, h) => { for (let k = 0; k < h; k++) if (solid(get(x, y + k, z))) return false; return true; };
function escapeAnimal(a) {
  const T = TYPES[a.type], h = T.size > 1.4 ? 3 : 2, fx = Math.floor(a.x), fz = Math.floor(a.z), [gx, gz] = a.pet ? petSpot() : [a.x, a.z];
  let best = null, bd = 1e9;
  for (let r = 0; r <= 7; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const x = fx + dx, z = fz + dz; if (x < 2 || z < 2 || x >= W - 2 || z >= D - 2) continue;
    const y = groundAt(x, z, a.y + 4); if (!y || get(x, y, z) === B.WATER || !roomAt(x, z, y, h)) continue;
    const d = (x + .5 - gx) ** 2 + (z + .5 - gz) ** 2 + (r === 0 ? 3 : 0);   // de préférence une autre case que celle où il est coincé
    if (d < bd) { bd = d; best = [x + .5, y, z + .5]; }
  }
  if (!best) return;
  a.x = best[0]; a.z = best[2]; a.y = best[1] + (T.fly ? 1.5 : 0); a.h = 0; a.vy = 0; a.wt = 0; a.ax = a.x; a.az = a.z;
  burst(a.x - .5, a.y + .5, a.z - .5, 0xffffff, 6);
}
function updateAnimals(dt) {
  const tt = performance.now() / 1000;
  for (const a of animals) {
    const T = TYPES[a.type];
    if (!T.swim && (solid(get(Math.floor(a.x), Math.floor(a.y + .3), Math.floor(a.z))) || solid(get(Math.floor(a.x), Math.floor(a.y + Math.min(a.size, 1.4) * .6), Math.floor(a.z))))) escapeAnimal(a);   // enfermé dans un bloc
    if (T.still) { const dx = P.x - a.x, dz = P.z - a.z; let dd = Math.atan2(dx, dz) - a.g.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); a.g.rotation.y += dd * Math.min(1, dt * 3); a.y += (groundAt(a.x, a.z, a.y) - a.y) * Math.min(1, dt * 10); a.g.position.set(a.x, a.y, a.z); continue; }
    if (a.pet && riding) { a.x = P.x; a.z = P.z; a.y = P.y; a.h = 0; a.g.position.set(a.x, a.y, a.z); a.g.rotation.y = P.yaw + Math.PI; continue; }
    if (a.pet) {
      const [tx, tz] = petSpot(), dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz), dp = Math.hypot(P.x - a.x, P.z - a.z);
      if (dp > 14) { a.x = tx; a.z = tz; a.y = landY(a.x, a.z); }
      else if (d > 1.1) { a.dir = Math.atan2(dx, dz); a.go = true; a.t = .5; }
      else { a.go = false; a.t = .5; }
    }
    a.t -= dt;
    if (a.t <= 0) { a.t = 1 + Math.random() * 3; a.go = Math.random() < (T.fly ? .9 : .6); a.dir += (Math.random() - .5) * 3; }
    if (T.hop && a.h === 0 && a.vy === 0 && a.go && Math.random() < dt * 2.5) a.vy = 4.5;
    if (a.type === 'dolphin' && a.h === 0 && a.vy === 0 && Math.random() < dt * (a.show ? 1.2 : .12)) a.vy = 8;
    if (a.go) {
      const spd = a.pet ? 2.6 : T.fly ? 1.7 : T.swim ? (a.type === 'dolphin' ? 2.4 : a.type === 'whale' ? .8 : 1.2) : (a.type === 'elephant' ? .6 : a.type === 'snail' ? .25 : .9);
      const nx = a.x + Math.sin(a.dir) * spd * dt, nz = a.z + Math.cos(a.dir) * spd * dt, ix = Math.floor(nx), iz = Math.floor(nz);
      let ok = nx > 2 && nz > 2 && nx < W - 2 && nz < D - 2;
      if (ok) {
        if (T.swim) ok = get(ix, SEA, iz) === B.WATER && get(ix, SEA - 1, iz) === B.WATER;
        else if (T.fly) ok = !solid(get(ix, Math.floor(a.y + .4), iz)) && !solid(get(ix, Math.floor(a.y + 1), iz));
        else { const ny = groundAt(nx, nz, a.y), under = get(ix, ny - 1, iz); ok = ny - a.y < (a.wet ? .6 : .3) && !LEAF.has(under) && !WOOD.has(under) && under !== B.LUCKY && under !== B.CHEST && (a.pet || get(ix, ny, iz) !== B.WATER); }
      }
      if (ok) { a.x = nx; a.z = nz; } else a.dir += 1.7 + Math.random();
    }
    if (a.go && !T.still) {   // il veut avancer mais reste dans moins d'un bloc pendant 4 s (trou, enclos, mur d'un bloc) : il se dégage
      if (a.ax === undefined) { a.ax = a.x; a.az = a.z; a.wt = 0; }
      a.wt += dt;
      if (a.wt > 4) { if (Math.hypot(a.x - a.ax, a.z - a.az) < .8) escapeAnimal(a); a.ax = a.x; a.az = a.z; a.wt = 0; }
    }
    if (T.swim) {
      const bed = groundAt(a.x, a.z, SEA + 1), ty = a.type === 'dolphin' ? SEA + .45 : a.type === 'whale' ? SEA - 1.8 : clamp(SEA - .6 - (.5 + .5 * Math.sin(tt * .6 + a.ph)) * Math.max(0, SEA - bed - 2), bed + .6, SEA - .2);
      a.y += (ty - a.y) * Math.min(1, dt * 3);
    } else if (T.fly) {
      const gy = groundAt(a.x, a.z, a.y); let cy = Math.floor(a.y); while (cy < H - 2 && !solid(get(Math.floor(a.x), cy + 1, Math.floor(a.z)))) cy++;
      a.y += (clamp(gy + 2 + Math.sin(tt * 1.7 + a.ph) * 1.2, gy + 1, cy - .6) - a.y) * Math.min(1, dt * 2.5);
    } else { const g0 = groundAt(a.x, a.z, a.y); a.wet = !!a.pet && get(Math.floor(a.x), SEA, Math.floor(a.z)) === B.WATER; a.y += ((a.wet ? Math.max(g0, SEA + .5) : g0) - a.y) * Math.min(1, dt * 10); }   // un compagnon patauge sur l'eau mais ne grimpe pas
    if (a.h > 0 || a.vy > 0) { a.vy -= 20 * dt; a.h += a.vy * dt; if (a.h <= 0) { a.h = 0; a.vy = 0; } }
    const wg = a.g.userData.wings; if (wg) { const f = Math.sin(tt * 14 + a.ph) * .7; wg[0].rotation.z = -f; wg[1].rotation.z = f; }
    a.g.position.set(a.x, a.y + a.h, a.z);
    let d = a.dir - a.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); a.g.rotation.y += d * Math.min(1, dt * 6);
  }
}
function hitAnimal(o, d, maxT) {
  let best = null, bt = maxT;
  for (const a of animals) {
    if (riding && a.pet) continue;
    const cy = a.y + a.h + a.size * .45, r2 = Math.max(.5, Math.pow(a.size * .3, 2));
    const cx = a.x - o.x, cyy = cy - o.y, cz = a.z - o.z, t = cx * d.x + cyy * d.y + cz * d.z;
    if (t < 0 || t > bt) continue;
    const dx = o.x + d.x * t - a.x, dy = o.y + d.y * t - cy, dz = o.z + d.z * t - a.z;
    if (dx * dx + dy * dy + dz * dz < r2) { best = a; bt = t; }
  }
  return best;
}

// ---------- Actions : casser / poser ----------
let target = null, touchMode = 'break';
function updateTarget() {
  const o = camera.position, d = lookDir();
  target = raycast(o, d, 6);
  if (target) { hl.position.set(target.x + .5, target.y + .5, target.z + .5); hl.visible = true; } else hl.visible = false;
}
function actBreak() {
  swing();
  const o = camera.position, d = lookDir(), a = hitAnimal(o, d, target ? target.t : 5);
  if (a) { if (a.type === 'merchant' || a.type === 'tmerchant') { openMarket('play', a.type === 'tmerchant'); return; } if (a.rare) { startTame(a); return; } a.vy = 6; a.h = .01; a.go = true; a.dir = Math.random() * 6.28; sfx.animal(a.type); burst(a.x - .5, a.y + .6, a.z - .5, 0xff6b9d, 8); toast('❤️'); return; }
  if (!target || target.y === 0) return;
  const b = get(target.x, target.y, target.z);
  if (b === B.CHEST) return startChest(target);
  setBlock(target.x, target.y, target.z, 0); today().broken++; tutoEvent('break');
  burst(target.x, target.y, target.z, BLOCKS[b].c); sfx.pop();
  if (b === B.DIAMOND) { S.stats.diamonds++; save(); toast('💎 Un diamant !'); updateHud(); }
  else if (b === B.LUCKY) setTimeout(() => ask(true), 250);
  else if (DROPS[b]) addInv(DROPS[b], 1);
}
function actPlace() {
  swing();
  if (!target) return;
  if (get(target.x, target.y, target.z) === B.CHEST) return startChest(target);
  const b = HOTBAR[sel];
  if (!inv[b] && !UNLOCK_ALL) { toast('Plus de blocs ! Réponds aux questions pour en gagner 🎁'); return; }
  const x = target.x + target.nx, y = target.y + target.ny, z = target.z + target.nz;
  if (!inb(x, y, z) || solid(get(x, y, z))) return;
  if (x + 1 > P.x - PW && x < P.x + PW && y + 1 > P.y && y < P.y + PH && z + 1 > P.z - PW && z < P.z + PW) return;
  setBlock(x, y, z, b); if (!UNLOCK_ALL) addInv(b, -1); sfx.place();
  S.stats.placed++; today().placed++; tutoEvent('place'); missionProgress('place', b); quest('place'); if (S.stats.placed % 10 === 0) checkAch();
}

// ---------- Mathématiques ----------
function qText(op, a, b, hole) {
  if (op === 'mul') { const p = a * b; return hole === 1 ? [`${a} × ? = ${p}`, b] : hole === 2 ? [`? × ${b} = ${p}`, a] : [`${a} × ${b} = ?`, p]; }
  if (op === 'add') { const p = a + b; return hole === 1 ? [`${a} + ? = ${p}`, b] : [`${a} + ${b} = ?`, p]; }
  if (op === 'sub') return [`${a} − ${b} = ?`, a - b];
  return [`${a} ÷ ${b} = ?`, a / b];
}
function readable(key) { const [op, a, b] = key.split(':'); return `${a} ${{ mul: '×', add: '+', sub: '−', div: '÷' }[op]} ${b}`; }
function buildQ(op, a, b, allowHole, table, forceHole) {
  let hole = 0;
  if (forceHole != null) hole = forceHole;
  else if (allowHole && S.ops.hole && Math.random() < .3 && (op === 'mul' || op === 'add')) hole = op === 'mul' ? rnd(1, 2) : 1;
  const [text, answer] = qText(op, a, b, hole);
  let near = [];
  if (op === 'mul') near = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b];
  if (op === 'div') near = [a / b + 1, a / b - 1, a / b + 2, a / b - 2];
  if (hole) near = [answer + 1, answer - 1, answer + 2, answer - 2];
  return { key: `${op}:${a}:${b}` + (table ? ':' + table : ''), text, answer, near, op, a, b, hole, table: table || null };
}
// les tables les moins maîtrisées reviennent plus souvent
function pickTable(tabs) {
  const w = tabs.map(t => { const m = mastery(t); return 1 + 3 * (1 - (m === null ? .4 : m)); });
  let r = Math.random() * w.reduce((x, y) => x + y, 0);
  for (let i = 0; i < tabs.length; i++) { r -= w[i]; if (r <= 0) return tabs[i]; }
  return tabs[0];
}
const LEVELS = {
  CP:  { tables: [2, 5, 10], ops: { mul: false, add: true, sub: true, div: false, hole: true }, add: [1, 12, 1, 8], sub: [6, 20] },
  CE1: { tables: [2, 3, 4, 5, 10], ops: { mul: true, add: true, sub: true, div: false, hole: true }, add: [10, 60, 3, 39], sub: [15, 99] },
  CE2: { tables: [2, 3, 4, 5, 6, 7, 8, 9], ops: { mul: true, add: true, sub: true, div: true, hole: true }, add: [50, 300, 20, 200], sub: [50, 500] },
  CM1: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], ops: { mul: true, add: true, sub: true, div: true, hole: true }, add: [200, 1200, 100, 800], sub: [200, 2000], big: .3, bigb: 9 },
  CM2: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], ops: { mul: true, add: true, sub: true, div: true, hole: true }, add: [1000, 5000, 500, 4900], sub: [1000, 9999], big: .35, bigb: 12, bigdiv: .3 },
};
// --- répétition espacée : une opération ratée revient vite, puis de plus en plus espacée, jusqu'à 3 réussites du premier coup ---
const LEARN_GAPS = [2, 4, 8, 16];   // nombre de questions avant le prochain rappel
function learnWrong(q) { S.learn[q.key] = { ok: 0, due: (S.qn || 0) + LEARN_GAPS[0], hole: q.hole || 0 }; }
function learnRight(q) {
  const L = S.learn[q.key]; if (!L) return;
  L.ok++;
  if (L.ok >= 3) { delete S.learn[q.key]; setTimeout(() => toast(`💪 Tu maîtrises « ${q.text.replace('?', q.answer)} » !`), 900); }
  else L.due = (S.qn || 0) + LEARN_GAPS[Math.min(L.ok, LEARN_GAPS.length - 1)];
}
function makeQuestion() {
  const qn = S.qn || 0, last = curQ && curQ.key;
  const due = Object.entries(S.learn).filter(([k, v]) => v.due <= qn && k !== last).sort((x, y) => x[1].due - y[1].due);
  const again = [...due];
  if (!again.length && struggle() && Math.random() < .5)   // en difficulté : on ressort aussi un calcul raté pas encore « dû »
    again.push(...Object.entries(S.learn).filter(([k]) => k !== last).sort((x, y) => x[1].due - y[1].due).slice(0, 1));
  if (again.length && Math.random() < .95) {
    const [k, v] = again[0], [op, a, b, t] = k.split(':'), q = buildQ(op, +a, +b, false, t ? +t : null, v.hole || 0);   // exactement le même calcul
    q.fromLearn = true; return q;
  }
  const ops = []; ['mul', 'add', 'sub', 'div'].forEach(o => S.ops[o] && ops.push(o)); if (!ops.length) ops.push('mul');
  const op = pick(ops), tabs = S.tables.length ? S.tables : [2], L = LEVELS[S.level];
  if (op === 'mul' && L && L.big && Math.random() < L.big) return buildQ('mul', rnd(12, 99), rnd(2, L.bigb), false, null);
  if (op === 'mul') { const t = pickTable(tabs); let a = t, b = rnd(1, 10); if (Math.random() < .5) [a, b] = [b, a]; return buildQ('mul', a, b, true, t); }
  if (op === 'add') return L ? buildQ('add', rnd(L.add[0], L.add[1]), rnd(L.add[2], L.add[3]), true) : buildQ('add', rnd(5, 60), rnd(3, 40), true);
  if (op === 'sub' && L) { const a = rnd(L.sub[0], L.sub[1]); return buildQ('sub', a, rnd(1, a - 1), false); }
  if (op === 'sub') { const a = rnd(15, 99), b = rnd(3, a - 5); return buildQ('sub', a, b, false); }
  const dt = tabs.filter(x => x > 1), t = pickTable(dt.length ? dt : [2]), b = (L && L.bigdiv && Math.random() < L.bigdiv) ? rnd(11, 30) : rnd(1, 10);
  return buildQ('div', t * b, t, false, t);
}
function makeChoices(q) {
  const set = new Set([q.answer]), cand = shuffle([...q.near, q.answer + 1, q.answer - 1, q.answer + 10, q.answer - 10, q.answer + 2, q.answer - 2, ...(q.answer >= 100 ? [q.answer + 100, q.answer - 100] : []), ...(q.answer >= 1000 ? [q.answer + 1000, q.answer - 1000] : [])]);
  for (const c of cand) { if (set.size >= 4) break; if (c >= 0 && Number.isInteger(c)) set.add(c); }
  let g = 0; while (set.size < 4 && g++ < 50) { const c = q.answer + rnd(-12, 12); if (c >= 0) set.add(c); }
  return shuffle([...set]);
}

// ---------- États du jeu ----------
let state = 'menu', started = false, nextQ = 25, qInterval = 60, streak = 0;
// quand l'enfant se trompe souvent, les questions arrivent plus vite et ses calculs ratés reviennent plus souvent
const adaptOn = () => S.adapt !== false;
function struggle() { if (!adaptOn() || S.recent.length < 6) return 0; const a = westAcc(); return a < .4 ? 3 : a < .6 ? 2 : a < .8 ? 1 : 0; }   // 0 : tout va bien
const GAP_MUL = [1, .75, .55, .4];
let lastStruggle = 0;
function nextGap() {
  if (TUTO.on) return 1e9;   // pas de question surprise pendant le tutoriel
  const lv = struggle();
  if (lv >= 2 && lastStruggle < 2) setTimeout(() => toast('🔁 On s\'entraîne : les questions reviennent plus souvent, avec les calculs à retenir !'), 1200);
  else if (lv === 0 && lastStruggle >= 2) setTimeout(() => toast('🌟 Tu progresses ! Retour au rythme normal.'), 1200);
  lastStruggle = lv;
  return Math.max(15, qInterval * GAP_MUL[lv]) * (.7 + Math.random() * .6);
}
let curQ = null, tries = 0, qLucky = false, revealed = false, guided = false, guidedTimer = 0, tryT0 = 0, badRun = 0;

function show(id, on) { $(id).classList.toggle('hidden', !on); }
function resume() {
  show('menu', false); show('pause', false); show('qbox', false); show('hud', true); show('touch', IS_TOUCH && !TVMODE);
  state = 'play'; if (TUTO.paused) { TUTO.paused = false; setTimeout(() => tutoEvent('resume'), 200); }
  if (!IS_TOUCH && !TVMODE) { try { const p = cv.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch (e) {} }
  updateHud();
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('toasts').appendChild(t);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  const ms = Math.min(9000, 4200 + msg.length * 60);
  t.style.animationDuration = ms + 'ms';
  setTimeout(() => t.remove(), ms);
}
function confetti(n = 40) {
  const em = ['⭐', '🎉', '💎', '✨', '🟩', '🟦', '🟨'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span'); s.className = 'confetti'; s.textContent = pick(em);
    s.style.left = Math.random() * 100 + 'vw'; s.style.animationDuration = 1.5 + Math.random() * 1.5 + 's'; s.style.animationDelay = Math.random() * .4 + 's';
    document.body.appendChild(s); setTimeout(() => s.remove(), 3600);
  }
}

// ----- Question / défis -----
let chal = null;
const CHEERS = ['Bravo !', 'Génial !', 'Super !', 'Exact !', 'Quel champion !', 'Tu assures !', 'Excellent !'];
const maxTries = () => chal && chal.kind === 'flash' ? 1 : 2;
function ask(lucky, opts) {
  opts = opts || {};
  if (UNLOCK_ALL) {   // mode debug : aucune question, récompenses directes (rien n'est enregistré)
    if (opts.chal && opts.chal.kind === 'chest') { const c = opts.chal; setBlock(c.pos[0], c.pos[1], c.pos[2], B.CHESTOPEN, c.special); if (c.special) endEvent(); burst(c.pos[0], c.pos[1] + 1, c.pos[2], 0xffd43b, 24); toast('🗝️ Mode debug : coffre ouvert sans question'); }
    else toast('🛠️ Mode debug : pas de question');
    nextQ = qInterval; return;
  }
  if (state !== 'play' && !opts.force) return;
  state = 'question'; if (document.pointerLockElement) document.exitPointerLock();
  Object.assign(keys, { Space: false, ShiftLeft: false, down: false, ArrowLeft: false, ArrowRight: false }); joy.x = joy.y = 0; syncJoy();
  show('pause', false); show('menu', false);
  chal = opts.chal || null; qLucky = !!lucky;
  presentQuestion();
}
function presentQuestion() {
  curQ = chal && chal.queue ? chal.queue[chal.got] : makeQuestion(); S.qn = (S.qn || 0) + 1; tries = 0; revealed = false; guided = false; clearInterval(guidedTimer); $('qinput').placeholder = 'Ta réponse'; qStart = tryT0 = performance.now(); sfx.ask();
  $('qtitle').textContent = chal ? (chal.kind === 'chest' ? `🔒 Coffre au trésor · question ${chal.got + 1}/${chal.need}` : chal.kind === 'review' ? `📘 Révision du jour · ${chal.got + 1}/${chal.need}` : chal.kind === 'tame' ? `✨ Apprivoiser · ${chal.got + 1}/${chal.need}` : chal.kind === 'gift' ? '🎁 Cadeau du jour : une question !' : chal.kind === 'tuto' ? '🎓 Entraînement : trouve la bonne réponse !' : chal.kind === 'train' ? `🥕 Dressage · ${chal.got + 1}/${chal.need} : prends ton temps` : `⚡ Défi éclair · ${chal.got + 1}/${chal.need}`)
    : qLucky ? '💎 Bloc chanceux ! Double récompense !' : '🎁 Question magique !';
  $('qtext').textContent = curQ.text;
  if (curQ.fromLearn) $('qtitle').textContent += ' · 🔁 à retenir';
  $('qfb').textContent = ''; show('qok', false); show('qlater', !!chal && chal.kind !== 'tuto');
  const ch = $('qchoices'); ch.innerHTML = '';
  if (S.mode === 'choice') {
    show('qchoices', true); show('qtyped', false);
    makeChoices(curQ).forEach((v, i) => {
      const b = document.createElement('button'); b.className = 'qc'; b.textContent = v; b.dataset.v = v;
      b.innerHTML += `<small>${i + 1}</small>`; b.addEventListener('click', () => answer(v, b)); ch.appendChild(b);
    });
  } else {
    show('qchoices', false); show('qtyped', true); $('qinput').value = ''; setTimeout(() => $('qinput').focus(), 50);
  }
  show('qbox', true);
}
function hint(q) {
  if (q.op === 'mul' && !q.hole) { const c = Math.min(q.a, q.b), v = Math.max(q.a, q.b); if (c > 1 && c <= 10) return `${Array(c).fill(v).join(' + ')} = ${q.answer}`; }
  if (q.op === 'div') return `Pense à la table de ${q.b} : ${q.b} × ${q.answer} = ${q.a}`;
  if (q.op === 'mul' && q.hole) return `Pense à la table de ${q.table || q.a}`;
  if (!q.hole && q.b >= 10 && (q.op === 'add' || q.op === 'sub')) { const t = Math.floor(q.b / 10) * 10, sg = q.op === 'add' ? '+' : '−', mid = q.op === 'add' ? q.a + t : q.a - t; return `${q.a} ${sg} ${t} = ${mid}, puis ${mid} ${sg} ${q.b - t} = ${q.answer}`; }
  if (!q.hole && (q.op === 'add' || q.op === 'sub')) return `Compte sur tes doigts ou sur une droite : ${q.a} ${q.op === 'add' ? '+' : '−'} ${q.b} = ${q.answer}`;
  return '';
}
// en dessous de ce temps, l'enfant n'a pas pu lire ni réfléchir : la réponse est probablement au hasard
const minThink = () => ((S.level === 'CP' || S.level === 'CE1') ? 2000 : 1500) + Math.max(0, curQ.text.length - 8) * 80;
function logFast(right, v, ms) {
  petJoy(-5); const d = today(); d.fast++; if (right) d.skip++;
  S.sus.unshift({ d: Date.now(), q: curQ.text, a: curQ.answer, g: String(v).slice(0, 8), ms: Math.round(ms), ok: right }); S.sus.length = Math.min(S.sus.length, 40);
}
function careAdd(ok) {
  S.recent.push(ok ? 1 : 0); if (S.recent.length > 20) S.recent.shift(); if (ok) S.care++;
  if (!S.westOpen && S.care >= WEST_NEED && S.recent.length >= 20 && westAcc() >= .8) {
    S.westOpen = true; checkAch(); buildMenu();
    setTimeout(() => { toast('🤠 Bravo, tu réponds avec soin ! Le monde du Far West est débloqué : des chevaux t\'attendent !'); sfx.ok(); confetti(120); }, 900);
  }
}
function answer(v, btn) {
  if (revealed) return;
  const now = performance.now(), ms = now - tryT0, fast = ms < minThink(); tryT0 = now;
  const right = +v === curQ.answer;
  if (chal && chal.kind === 'tuto') {   // question d'entraînement : sans enjeu, on peut réessayer
    if (right) { sfx.ok(); return chalNext(true); }
    $('qfb').textContent = 'Oups ! Essaie encore 😉'; if (btn) btn.classList.add('bad'); sfx.ko(); return;
  }
  if (fast) logFast(right, v, ms);
  if (right) return correct(fast && (!chal || chal.kind === 'train'));   // dans un défi (coffre, éclair…) la réponse reste acceptée : seul le parent voit l'alerte
  if (tries === 0) { recordTab(curQ.table, false); S.stats.ko++; logAnswer(false, v); learnWrong(curQ); careAdd(false); petJoy(-2); if (++badRun === 3) { today().runs++; petJoy(-4); } }
  tries++; streak = 0;
  if (S.mission && S.mission.k === 'streak') S.mission.got = 0;
  S.stats.miss[curQ.key] = Math.min(5, (S.stats.miss[curQ.key] || 0) + 1);
  save(); updateHud(); sfx.ko();
  $('qcard').classList.remove('shake'); void $('qcard').offsetWidth; $('qcard').classList.add('shake');
  if (btn) btn.classList.add('bad');
  if (tries >= maxTries()) {
    revealed = true;
    const h = hint(curQ);
    $('qfb').innerHTML = `Pas grave ! La réponse était <span style="color:#ffe066">${curQ.answer}</span> 💪${h ? `<div class="hint">💡 ${h}</div>` : ''}`;
    if (S.mode === 'choice') [...$('qchoices').children].forEach(b => { if (+b.dataset.v === curQ.answer) { b.classList.remove('bad'); b.classList.add('good'); } });
    if (badRun >= 2) startGuided(); else { show('qok', true); $('qok').focus(); }
  } else { $('qfb').textContent = fast ? 'Oups ! Tu as répondu très vite 🧐 Lis bien le calcul, puis essaie encore.' : 'Oups ! Essaie encore 😉'; if (S.mode !== 'choice') { $('qinput').value = ''; $('qinput').focus(); } }
}
// après deux erreurs d'affilée : on recopie la bonne réponse, puis on souffle 10 secondes avant de continuer
function startGuided() {
  guided = true; show('qchoices', false); show('qtyped', true); show('qok', false); $('qinput').value = ''; $('qinput').placeholder = 'Recopie la bonne réponse'; setTimeout(() => $('qinput').focus(), 50);
  $('qfb').insertAdjacentHTML('beforeend', '<div class="hint">✍️ Recopie la bonne réponse pour bien la retenir.</div>');
}
function guidedSubmit(v) {
  if (+v !== curQ.answer) { $('qcard').classList.remove('shake'); void $('qcard').offsetWidth; $('qcard').classList.add('shake'); $('qinput').value = ''; $('qinput').focus(); return; }
  guided = false; badRun = 0; show('qtyped', false); sfx.ok();
  let n = 10; $('qfb').insertAdjacentHTML('beforeend', '<div class="breath">😌 Respire un grand coup… <b id="qcount">10</b></div>');
  clearInterval(guidedTimer);
  guidedTimer = setInterval(() => {
    if (state !== 'question') return clearInterval(guidedTimer);
    $('qcount').textContent = --n;
    if (n <= 0) { clearInterval(guidedTimer); $('qfb').lastChild.textContent = '😌 C\'est reparti !'; show('qok', true); $('qok').focus(); }
  }, 1000);
}
function addStars(n) {
  const before = gradeIdx(); S.stats.stars += n; const after = gradeIdx();
  if (after > before) { const g = GRADES[after]; S.stats.diamonds += 3; earn(50); setTimeout(() => { toast(`🎉 Nouveau grade : ${g[1]} ${g[2]} ! +3💎 +50 🪙`); sfx.ok(); confetti(90); }, 700); }
}
function correct(sus) {
  if (sus && chal) { toast('🧐 Trop vite ! Le dressage demande du calme : lis bien le calcul.'); return chalNext(false); }
  if (sus) {   // réponse trop rapide : acceptée, mais sans récompense, sans série ni progression
    sfx.ok(); nextQ = nextGap(); save(); resume();
    toast('🧐 Trop vite ! Cette réponse ne rapporte rien : lis bien le calcul et prends le temps de réfléchir.'); return;
  }
  const st = S.stats; st.ok++; streak++; st.best = Math.max(st.best, streak);
  if (tries === 0) { recordTab(curQ.table, true); logAnswer(true); learnRight(curQ); careAdd(true); badRun = 0; }
  petJoy(tries === 0 ? 4 : 1);
  if (st.miss[curQ.key]) { st.miss[curQ.key]--; if (st.miss[curQ.key] <= 0) delete st.miss[curQ.key]; }
  sfx.ok(); missionProgress('answer'); missionProgress('streak'); quest('answer');
  if (chal) { confetti(14); return chalNext(true); }
  const mult = qLucky ? 2 : 1, n = 6 * mult + rnd(0, 4), bid = pick([B.PLANKS, B.BRICK, B.GLASS, B.RED, B.BLUE, B.YELLOW, B.STONE]), euros = (tries === 0 ? 5 : 2) * mult;
  let stars = (tries === 0 ? 3 : 1) * mult, boosted = false; if (S.boost > 0) { stars *= 2; S.boost--; boosted = true; } if (S.world === dailyWorld() && !UNLOCK_ALL) { stars *= 2; boosted = true; }
  addStars(stars); addInv(bid, n); earn(euros);
  let msg = `✅ ${pick(CHEERS)} +${stars}⭐${boosted ? '✨' : ''} +${fmt(euros)} +${n} ${NAMES[bid].toLowerCase()}`;
  if (qLucky) { st.diamonds += 3; msg += ' +3💎'; } else if (streak % 5 === 0) { st.diamonds++; msg += ' +1💎 (série de 5 !)'; }
  if (Math.random() < .05) setTimeout(surprise, 1300);
  confetti(qLucky ? 70 : 35); checkAch(); save();
  nextQ = nextGap();
  resume(); toast(msg);
  if (streak > 1) setTimeout(() => toast(`🔥 ${streak} bonnes réponses d'affilée !`), 500);
}
function chalNext(ok) {
  chal.got++; if (ok) chal.ok++;
  if ((['chest', 'tame', 'gift', 'train'].includes(chal.kind) && !ok) || chal.got >= chal.need) return chalEnd();
  presentQuestion();
}
function chalEnd() {
  const c = chal; chal = null; nextQ = nextGap();
  const st = S.stats;
  if (c.kind === 'chest') {
    if (c.ok >= c.need) {
      setBlock(c.pos[0], c.pos[1], c.pos[2], B.CHESTOPEN, c.special); st.chests++; today().chests++; addStars(5); st.diamonds += 3; earn(50);
      const b1 = pick(HOTBAR.slice(3)), b2 = pick(HOTBAR.slice(3)); addInv(b1, 20); addInv(b2, 20);
      confetti(110); sfx.ok(); missionProgress('chest'); quest('chest'); save(); checkAch(); resume();
      toast('🗝️ Coffre ouvert ! +5⭐ +3💎 +50 🪙 + 40 blocs'); burst(c.pos[0], c.pos[1] + 1, c.pos[2], 0xffd43b, 24);
      if (c.special) { earn(100); st.diamonds += 3; addStars(5); endEvent(); setTimeout(() => toast('💰 TRÉSOR SPÉCIAL ! +100 🪙 +3💎 +5⭐ en plus !'), 900); }
    } else { save(); resume(); toast('🔒 Le coffre reste fermé… Réessaie plus tard !'); }
  } else if (c.kind === 'flash') {
    const wk = isWeekend() ? 2 : 1; earn(c.ok * 5 * wk); addStars(c.ok * 2 * wk); let msg = `⚡ Défi éclair : ${c.ok}/${c.need} · +${c.ok * 2 * wk}⭐ +${fmt(c.ok * 5 * wk)}${wk > 1 ? ' (week-end ×2 !)' : ''}`;
    if (c.ok === c.need) { st.diamonds += 2; st.flash5++; msg += ' +2💎 PARFAIT !'; confetti(100); }
    save(); checkAch(); resume(); toast(msg);
  }
  if (c.kind === 'tame') {
    const a = c.animal; animals = animals.filter(x => x !== a); scene.remove(a.g);
    if (c.ok >= c.need) {
      if (!S.pets.some(q => q.t === a.type)) addPet(a.type); else earn(100);
      S.album[a.type] = true; confetti(120); sfx.ok(); toast(`✨ Tu as apprivoisé ${ANIMAL_INFO[a.type][0]} ${ANIMAL_INFO[a.type][1]} ! Il te suit maintenant.`); checkAch();
    } else toast('💨 L\'animal rare s\'est enfui… Il reviendra peut-être !');
    save(); resume();
  }
  if (c.kind === 'tuto') { resume(); confetti(30); setTimeout(() => tutoEvent('question'), 300); }
  if (c.kind === 'train') {
    const nm = c.pet.name || ANIMAL_INFO[c.pet.t]?.[1] || 'Ton compagnon';
    if (c.ok >= c.need) {
      c.pet.trained = true; petJoy(10); save(); resume(); confetti(90); sfx.ok();
      const a = animals.find(x => x.petRef === c.pet); if (a) mount(a);
      toast(`🥕 Bravo, tu as pris ton temps ! ${nm} est dressé et te laisse monter sur son dos !`);
    } else { save(); resume(); toast(`🥕 ${nm} n'est pas encore prêt… Le dressage demande calme et concentration. Réessaie !`); }
  }
  if (c.kind === 'gift') {
    if (c.ok >= c.need) { const pz = giftPrize(); pz[1](); S.gift = dayKey(); confetti(100); sfx.ok(); toast(`🎁 Cadeau du jour : ${pz[0]} !`); } else toast('🎁 Pas grave, tu peux réessayer le cadeau du jour !');
    save(); updateHud(); updateGiftBtn(); resume();
  }
  if (c.kind === 'review') {
    const first = !S.review[dayKey()]; S.review[dayKey()] = Math.max(S.review[dayKey()] || 0, c.ok); quest('review');
    addStars(c.ok * 2); earn(c.ok * 2);
    let msg = `📘 Révision : ${c.ok}/${c.need} · +${c.ok * 2}⭐ +${fmt(c.ok * 2)}`;
    if (first && c.ok >= Math.ceil(c.need * .6)) { earn(30); st.diamonds += 2; msg += ' 🎁 Cadeau du jour : +30 🪙 +2💎 !'; confetti(100); }
    save(); checkAch(); resume(); toast(msg);
  }
}
function closeReveal() {
  if (chal) return chalNext(false);
  nextQ = nextGap();
  resume();
}
function startChest(t) {
  if (state !== 'play') return;
  ask(false, { chal: { kind: 'chest', need: 3, got: 0, ok: 0, pos: [t.x, t.y, t.z], special: !!(EV.chest && EV.chest.x === t.x && EV.chest.y === t.y && EV.chest.z === t.z) } });
}
function startFlash() { ask(false, { force: true, chal: { kind: 'flash', need: 5, got: 0, ok: 0 } }); }

// ----- Progression : grades, maîtrise, succès, missions, boutique -----
const GRADES = [[0, '🌱', 'Apprenti'], [15, '🧭', 'Aventurier'], [40, '🗺️', 'Explorateur'], [80, '⚔️', 'Chevalier'], [140, '🧙', 'Maître des tables'], [220, '👑', 'Légende']];
function gradeIdx(X = S) { let g = 0; GRADES.forEach(([n], i) => { if (X.stats.stars >= n) g = i; }); return g; }
function recordTab(t, ok) { if (!t) return; const h = S.stats.tab[t] = S.stats.tab[t] || []; h.push(ok ? 1 : 0); if (h.length > 10) h.shift(); }
function mastery(t) { const h = S.stats.tab[t]; return h && h.length ? h.reduce((a, b) => a + b, 0) / h.length : null; }
function medal(t) { const h = S.stats.tab[t] || []; if (h.length < 3) return ''; if (h.length < 5) return '🔸'; const m = mastery(t); return m >= .9 ? '🥇' : m >= .75 ? '🥈' : m >= .6 ? '🥉' : '📘'; }
const TABS10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ACH = [
  ['first', '🌟', 'Première bonne réponse', s => s.ok >= 1],
  ['s5', '🔥', '5 bonnes réponses d\'affilée', s => s.best >= 5],
  ['s10', '🚀', '10 d\'affilée !', s => s.best >= 10],
  ['ok25', '📚', '25 bonnes réponses', s => s.ok >= 25],
  ['ok100', '🎓', '100 bonnes réponses', s => s.ok >= 100],
  ['d10', '💎', '10 diamants gagnés', s => s.diamonds >= 10],
  ['chest1', '🗝️', 'Premier coffre ouvert', s => s.chests >= 1],
  ['chest5', '👑', '5 coffres ouverts', s => s.chests >= 5],
  ['gold', '🥇', 'Une table maîtrisée (or)', () => TABS10.some(t => medal(t) === '🥇')],
  ['build', '🏠', '50 blocs posés', s => s.placed >= 50],
  ['flash', '⚡', 'Défi éclair parfait', s => s.flash5 >= 1],
  ['pet', '🐾', 'Un compagnon adopté', () => S.pets.length > 0],
  ['buy1', '🛍️', 'Premier achat au marchand', s => (s.bought || 0) >= 1],
  ['buy10', '💰', '10 achats réussis', s => (s.bought || 0) >= 10],
  ['rev', '📘', 'Première révision du jour', () => Object.keys(S.review).length >= 1],
  ['alb10', '📖', '10 animaux dans l\'album', () => Object.keys(S.album).length >= 10],
  ['rare', '✨', 'Un animal rare apprivoisé', () => S.pets.some(p => RARE_SET.has(p.t))],
  ['west', '🤠', 'Le Far West débloqué', () => !!S.westOpen],
  ['tuto', '🎓', 'Tutoriel terminé', () => !!S.tutoDone],
  ['find1', '🔎', 'Première trouvaille', () => (S.stats.finds || 0) >= 1],
  ['find15', '🧰', '15 trouvailles', () => (S.stats.finds || 0) >= 15],
  ['legend', '🏺', 'Un objet légendaire trouvé', () => FINDS.some(f => f.rar === 3 && S.found[f.id])],
  ['q10', '📜', '10 quêtes réussies', () => (S.questsDone || 0) >= 10],
  ['tour', '🌍', 'Visiter tous les mondes', () => S.visited.length >= WORLD_ORDER.length],
];
function checkAch() {
  let n = 0;
  for (const [id, ic, name, fn] of ACH) if (!S.ach[id] && fn(S.stats)) { S.ach[id] = true; setTimeout(() => { toast(`${ic} Succès : ${name}`); sfx.ok(); }, 700 + 900 * n++); }
  save();
}
const MISSION_BLOCKS = [[B.BRICK, 'briques'], [B.GLASS, 'blocs de verre'], [B.PLANKS, 'planches'], [B.RED, 'blocs de laine rouge'], [B.BLUE, 'blocs de laine bleue'], [B.YELLOW, 'blocs de laine jaune'], [B.STONE, 'blocs de pierre']];
function newMission() {
  const k = pick(['place', 'place', 'answer', 'streak', 'chest']);
  if (k === 'place') { const [id, name] = pick(MISSION_BLOCKS), n = rnd(6, 14); return { k, id, n, got: 0, text: `Pose ${n} ${name}` }; }
  if (k === 'answer') { const n = rnd(4, 8); return { k, n, got: 0, text: `Réponds juste à ${n} questions` }; }
  if (k === 'streak') { const n = rnd(3, 5); return { k, n, got: 0, text: `${n} bonnes réponses d'affilée` }; }
  return { k: 'chest', n: 1, got: 0, text: 'Ouvre un coffre 🔒 (clic droit)' };
}
function missionProgress(k, id) {
  const m = S.mission; if (!m || m.k !== k) return;
  if (k === 'place' && id !== m.id) return;
  if (k === 'streak') m.got = streak; else m.got++;
  if (m.got >= m.n) {
    S.mission = newMission(); today().missions++; addStars(5); S.stats.diamonds += 2; earn(30); sfx.ok(); confetti(60);
    setTimeout(() => toast('🏆 Mission réussie ! +5⭐ +2💎 +30 🪙'), 700); checkAch();
  }
  save(); updateHud();
}
// ---------- Argent, marchand, accessoires, révision ----------
const LV_GRAN = { CP: 5, CE1: 5, CE2: 1, libre: 1, CM1: 1, CM2: 1 };   // les prix sont des multiples de 5 en CP/CE1
const COINS_EASY = [1, 2, 5, 10, 20], COINS_MID = [1, 2, 5, 10, 20, 50, 100], COINS_HARD = [1, 2, 5, 10, 20, 50, 100, 200];
const LV_COINS = { CP: COINS_EASY, CE1: COINS_EASY, CE2: COINS_MID, libre: COINS_MID, CM1: COINS_HARD, CM2: COINS_HARD };
const coinLabel = c => String(c);
const marketLvl = () => LV_GRAN[S.level] ? S.level : 'libre';
const PETEMO = { dog: '🐶', cat: '🐱' }, PETNAME = { dog: 'Chien', cat: 'Chat' };
const petEmo = t => ({ pinto: '🐴', blackhorse: '🐎', goldhorse: '🌟' })[t] || PETEMO[t] || (ANIMAL_INFO[t] && ANIMAL_INFO[t][0]) || '🐾';
const LEVEL_INFO = { CP: 'additions et soustractions jusqu\'à 20', CE1: 'jusqu\'à 100 · tables de 2, 3, 4, 5 et 10', CE2: 'nombres jusqu\'à 500 · tables de 2 à 9 · premières divisions', CM1: 'nombres jusqu\'à 2 000 · multiplications 2 chiffres × 1 chiffre · divisions', CM2: 'grands nombres jusqu\'à 9 999 · multiplications et divisions plus longues', libre: 'tu choisis tables et opérations toi-même' };
function presetFor(k) { const L = LEVELS[k]; return L ? { level: k, tables: L.tables.slice(), ops: Object.assign({}, L.ops) } : { level: 'libre' }; }
function applyLevel(k) { Object.assign(S, presetFor(k)); save(); buildMenu(); }

// --- accessoires (se posent sur la tête de l'animal) ---
const ACCS = {
  hat: { ic: '🎩', name: 'Chapeau haut-de-forme', base: 60, build(y, z, w) { const g = new THREE.Group(), K = am(0x1b1b22), R = am(0xc92a2a); g.add(box(w * 1.7, .04, w * 1.7, K, 0, y, z), box(w * .95, .3, w * .95, K, 0, y + .17, z), box(w * .98, .06, w * .98, R, 0, y + .07, z)); return g; } },
  bow: { ic: '🎀', name: 'Nœud rose', base: 40, build(y, z, w) { const g = new THREE.Group(), P_ = am(0xff6fa8), D_ = am(0xd63384); g.add(box(.12, .11, .08, P_, w * .3 - .08, y + .03, z + .05), box(.12, .11, .08, P_, w * .3 + .08, y + .03, z + .05), box(.06, .07, .09, D_, w * .3, y + .03, z + .05)); return g; } },
  crown: { ic: '👑', name: 'Couronne en or', base: 150, build(y, z, w) { const g = new THREE.Group(), G = am(0xffd43b); g.add(box(w * .95, .08, w * .95, G, 0, y + .04, z)); [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].forEach(([a, b]) => g.add(box(.07, .16, .07, G, a * w * .4, y + .15, z + b * w * .4))); return g; } },
  glasses: { ic: '🕶️', name: 'Lunettes de soleil', base: 50, build(y, z, w) { const g = new THREE.Group(), D_ = am(0x15151c), zf = z + w * .5 + .01, ey = y - w * .35; g.add(box(w * 1.05, .04, .03, D_, 0, ey, zf), box(w * .36, .13, .03, D_, -w * .22, ey, zf), box(w * .36, .13, .03, D_, w * .22, ey, zf)); return g; } },
  cowboy: { ic: '🤠', name: 'Chapeau de cow-boy', base: 120, build(y, z, w) { const g = new THREE.Group(), T = am(0xa9712f), D_ = am(0x5a3a18); g.add(box(w * 2, .04, w * 2, T, 0, y, z), box(w * .95, .26, w * .95, T, 0, y + .15, z), box(w * .98, .05, w * .98, D_, 0, y + .06, z)); return g; } },
  bandana: { ic: '🟥', name: 'Foulard de cow-boy', base: 60, build(y, z, w) { const g = new THREE.Group(), R = am(0xc92a2a); g.add(box(w * 1.15, .12, w * 1.15, R, 0, y - w * .95, z - .08), box(w * .5, .2, .07, R, 0, y - w * .95 - .14, z + w * .5)); return g; } },
  scarf: { ic: '🧣', name: 'Écharpe rouge', base: 70, build(y, z, w) { const g = new THREE.Group(), R = am(0xe03131); g.add(box(w * 1.15, .12, w * 1.15, R, 0, y - w * .95, z - .08), box(.1, .32, .07, R, w * .3, y - w * .95 - .18, z + w * .5)); return g; } },
};
const ACC_SLOT = { cowboy: 'tête', bandana: 'cou', hat: 'tête', bow: 'tête', crown: 'tête', glasses: 'yeux', scarf: 'cou', cape: 'dos', wings: 'dos' };   // un accessoire par emplacement
const spriteCache = {};
function makeLabel(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.font = '700 32px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 7; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(text, 128, 34); x.fillStyle = '#fff'; x.fillText(text, 128, 34);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); sp.scale.set(1.5, .375, 1); return sp;
}
function setAcc(a) {
  if (a.accG) { a.g.remove(a.accG); a.accG = null; }
  if (a.objG) { a.g.remove(a.objG); a.objG = null; }
  const p = a.petRef; if (!p) return;
  if (p.accs.length) {
    const [y, z, w] = TYPES[a.type].head || [a.size * .9, a.size * .35, .4];
    a.accG = new THREE.Group(); p.accs.forEach(k => ACCS[k] && a.accG.add(ACCS[k].build(y, z, w))); a.g.add(a.accG);
  }
  const f = FIND_BY_ID[p.obj]; if (f && S.found[f.id]) { a.objG = emoSprite(f.ic, .6); a.objG.position.set(a.size * .55 + .3, a.size * .8, 0); a.g.add(a.objG); }   // l'objet offert flotte à côté de l'animal
}
function setLabel(a, text) {
  if (a.lab) { a.g.remove(a.lab); a.lab = null; }
  if (!text) return;
  a.lab = makeLabel(text); a.lab.position.set(0, (TYPES[a.type].head ? TYPES[a.type].head[0] : a.size) + .55, 0); a.g.add(a.lab);
}
const petSpot = () => [P.x + Math.cos(.8) * 2.3, P.z + Math.sin(.8) * 2.3];   // le compagnon se tient à côté du joueur
function makePet(p) {
  const [x, z] = petSpot(), a = newAnimal(p.t, x, landY(x, z), z, true);
  a.petRef = p; animals.push(a); setAcc(a); setLabel(a, p.name);
}
function spawnPets() {
  animals = animals.filter(a => { if (a.pet || a.type === 'merchant') { scene.remove(a.g); return false; } return true; });
  riding = false; S.pets.filter(p => p.out).forEach(makePet); spawnMerchant(); updateRideBtn();
}
function spawnMerchant() {
  let x = P.x + 3, z = P.z;
  for (let i = 0; i < 14; i++) { const tx = P.x + Math.cos(i * .9) * 3.5, tz = P.z + Math.sin(i * .9) * 3.5, ty = landY(tx, tz); if (ty > SEA && get(Math.floor(tx), ty, Math.floor(tz)) === 0 && get(Math.floor(tx), ty - 1, Math.floor(tz)) !== B.WATER) { x = tx; z = tz; break; } }
  const a = newAnimal('merchant', x, landY(x, z), z); animals.push(a); setLabel(a, '🛒 Marchand');
}

// sort ce compagnon (et range l'ancien), ou range tout le monde si p est null
function setActivePet(p) {
  riding = false; S.pets.forEach(q => q.out = q === p);
  animals = animals.filter(a => { if (a.pet) { scene.remove(a.g); return false; } return true; });
  if (p) makePet(p);
  updateRideBtn(); save();
}
// un compagnon rare est unique dans la partie : une fois obtenu, plus aucun exemplaire sauvage ne reste ni ne revient
const rareOwned = t => RARE_SET.has(t) && S.pets.some(p => p.t === t);
function addPet(t) {
  if (rareOwned(t)) return;
  const prev = S.pets.find(q => q.out), p = { t, name: '', accs: [], out: false };
  S.pets.push(p); setActivePet(p);
  if (RARE_SET.has(t)) animals = animals.filter(a => { if (a.rare && a.type === t) { scene.remove(a.g); return false; } return true; });
  if (prev) setTimeout(() => toast(`🏠 ${petEmo(prev.t)} ${prev.name || ANIMAL_INFO[prev.t]?.[1] || 'Ton ancien compagnon'} est rangé : retrouve-le dans Pause → Compagnons.`), 1500);
}

// --- le marché ---
const MARKET = [
  { id: 'brick', cat: '🧱 Blocs', ic: '🧱', name: '40 briques', base: 45, give: () => addInv(B.BRICK, 40) },
  { id: 'glass', cat: '🧱 Blocs', ic: '🪟', name: '40 blocs de verre', base: 40, give: () => addInv(B.GLASS, 40) },
  { id: 'stone', cat: '🧱 Blocs', ic: '🪨', name: '60 blocs de pierre', base: 30, give: () => addInv(B.STONE, 60) },
  { id: 'wool', cat: '🧱 Blocs', ic: '🌈', name: '15 laines de chaque couleur', base: 60, give: () => { addInv(B.RED, 15); addInv(B.BLUE, 15); addInv(B.YELLOW, 15); } },
  { id: 'potion', cat: '✨ Magie', ic: '🧪', name: 'Potion ×2 étoiles (5 bonnes réponses)', base: 80, give: () => { S.boost += 5; } },
  { id: 'gift', cat: '✨ Magie', ic: '🎁', name: 'Boîte surprise', base: 100, give: () => { S.stats.diamonds += 2; addInv(pick(HOTBAR.slice(3)), 30); } },
  ...Object.entries(ACCS).map(([k, a]) => ({ id: 'acc-' + k, cat: '🎩 Accessoires', ic: a.ic, name: a.name, base: a.base, acc: k })),
];
MARKET.forEach(it => {
  if (it.acc) it.give = () => { S.acc.push(it.acc); };
});
const itemOwned = it => (it.pet && S.pets.some(p => p.t === it.pet)) || (it.acc && S.acc.includes(it.acc));
let mk = { from: 'play', view: 'home', item: null, price: 0, tray: [], showTotal: true, msg: '', given: 0 };
function openMarket(from, travel) {
  mk.travel = !!travel; mk.from = from; mk.view = 'home'; mk.msg = '';
  if (state === 'play') { state = 'pause'; if (document.pointerLockElement) document.exitPointerLock(); }
  show('pause', false); show('market', true); renderMarket(); sfx.ask();
}
function closeMarket() { show('market', false); if (mk.from === 'play') resume(); else { show('pause', true); renderPause('shop'); } }
function openCounter(it) {
  if (UNLOCK_ALL) { if (!itemOwned(it)) { it.give(); mk.msg = `🛠️ Mode debug : <b>${it.name}</b> offert, sans payer !`; sfx.coin(); } renderMarket(); return; }
  const left = (S.locks[it.id] || 0) - Date.now();
  if (left > 0) { mk.msg = `😤 Je suis encore fâché… reviens dans ${Math.ceil(left / 1000)} secondes.`; return renderMarket(); }
  const g = LV_GRAN[marketLvl()], price = Math.max(g, Math.round(it.base * (mk.travel ? .7 : 1) * (.8 + Math.random() * .4) / g) * g);
  if (S.wallet < price) { mk.msg = `Ça fait <b>${fmt(price)}</b> et tu n'as que ${fmt(S.wallet)}… Réponds à des questions pour gagner des pépites !`; return renderMarket(); }
  Object.assign(mk, { item: it, price, tray: [], showTotal: marketLvl() !== 'CM1' && marketLvl() !== 'CM2', view: 'counter' }); renderMarket();
}
function payNow() {
  const sum = mk.tray.reduce((a, b) => a + b, 0), it = mk.item, o = S.opAll.money || (S.opAll.money = { ok: 0, ko: 0 });
  if (sum === mk.price) {
    o.ok++; S.market.ok++; S.wallet -= mk.price; S.stats.bought = (S.stats.bought || 0) + 1; quest('buy'); it.give(); mk.view = 'ok'; sfx.coin(); confetti(70);
  } else {
    o.ko++; S.market.ko++; S.locks[it.id] = Date.now() + 90000; mk.view = 'ko'; mk.given = sum; sfx.ko();
    S.errs.unshift({ d: Date.now(), q: `Marchand : payer ${fmt(mk.price)}`, a: fmt(mk.price), g: fmt(sum) }); S.errs.length = Math.min(S.errs.length, 60);
  }
  save(); updateHud(); checkAch(); renderMarket();
}
function renderMarket() {
  const c = $('mcard'), nm = S.name || 'mon ami';
  const head = txt => `<div class="mhead"><b class="merch">🧑‍🌾</b><div class="bubble">${txt}</div></div>`;
  let h = '';
  if (mk.view === 'home') {
    h = head(mk.msg || `${mk.travel ? '🌟 Marchand ambulant : objets rares à -30 % ! ' : ''}Bonjour ${esc(nm)} ! Que veux-tu acheter ? Attention : tu dois me donner la <b>somme exacte</b>, sinon je ne te donne rien !`) +
      `<div class="wallet">👛 Ton porte-monnaie : <strong>${fmt(S.wallet)}</strong> <button class="linkbtn" id="mexch" ${S.stats.diamonds < 1 ? 'disabled' : ''}>💎 → 50 🪙</button></div>
      <p class="gnext">📸 Les animaux que tu prends en photo arrivent ici ! ${mk.travel ? '' : 'Un seul compagnon te suit : les autres t\'attendent à la maison.'}</p>`;
    [...new Set(marketList().map(i => i.cat))].forEach(cat => {
      h += `<h3>${cat}</h3><div class="shop">`;
      marketList().filter(i => i.cat === cat).forEach(i => {
        const own = itemOwned(i), lock = (S.locks[i.id] || 0) > Date.now();
        h += `<button class="item" data-id="${i.id}" ${own ? 'disabled' : ''}><b>${i.ic}</b><span>${i.name}</span><em>${own ? '✔ possédé' : lock ? '😤 fâché' : '≈ ' + fmt(Math.round(i.base / 5) * 5)}</em></button>`;
      });
      h += '</div>';
    });
    h += '<div class="row"><button class="btn green" id="mclose">← Quitter le marché</button></div>';
  } else if (mk.view === 'counter') {
    const sum = mk.tray.reduce((a, b) => a + b, 0);
    h = head(`Ça fait <b>${fmt(mk.price)}</b>. Donne-moi la somme exacte avec tes pièces !`) +
      `<div class="product"><b>${mk.item.ic}</b><span>${mk.item.name}</span><div class="price">${fmt(mk.price)}</div></div>
       <div class="tray">${mk.tray.length ? mk.tray.map((v, i) => `<i class="tc c${v}" data-i="${i}">${coinLabel(v)}</i>`).join('') : '<small>Touche les pièces ci-dessous…</small>'}</div>
       <div class="total">${mk.showTotal ? `Tu donnes : <strong>${fmt(sum)}</strong>` : '<button class="linkbtn" id="mtot">👁️ Voir le total</button>'}</div>
       <div class="coins">${LV_COINS[marketLvl()].map(v => `<button class="coin c${v}" data-v="${v}">${coinLabel(v)}</button>`).join('')}</div>
       <div class="row"><button class="btn" id="mundo">↩ Annuler</button><button class="btn" id="mclear">🗑️ Vider</button><button class="btn green" id="mpay" ${mk.tray.length ? '' : 'disabled'}>✅ Payer</button><button class="btn" id="mback">← Retour</button></div>`;
  } else if (mk.view === 'ok') {
    h = head(`🎉 Merci <b>${esc(nm)}</b> ! C'est le compte exact. Voilà ton produit !`) + `<div class="product won"><b>${mk.item.ic}</b><span>${mk.item.name}</span><div class="price">✅ Acheté !</div></div>
      <div class="row"><button class="btn green" id="mhome">Continuer mes achats</button></div>`;
  } else {
    h = head(`❌ Hmm… ce n'est pas le bon compte. Je ne peux pas te donner ce produit !<br><small>Tu m'as donné <b>${fmt(mk.given)}</b> mais il fallait <b>${fmt(mk.price)}</b>. Reviens me voir dans 1 min 30 !</small>`) +
      `<div class="product lost"><b>${mk.item.ic}</b><span>${mk.item.name}</span><div class="price">🚫</div></div><div class="row"><button class="btn" id="mhome">← Retour au marché</button></div>`;
  }
  c.innerHTML = h;
  const on = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  c.querySelectorAll('.item').forEach(b => b.onclick = () => { const it = marketList().find(i => i.id === b.dataset.id); mk.msg = ''; openCounter(it); });
  c.querySelectorAll('.coin').forEach(b => b.onclick = () => { if (mk.tray.length < 30) { mk.tray.push(+b.dataset.v); sfx.coin(); renderMarket(); } });
  c.querySelectorAll('.tc').forEach(b => b.onclick = () => { mk.tray.splice(+b.dataset.i, 1); renderMarket(); });
  on('mundo', () => { mk.tray.pop(); renderMarket(); }); on('mclear', () => { mk.tray = []; renderMarket(); });
  on('mtot', () => { mk.showTotal = true; renderMarket(); }); on('mpay', payNow);
  on('mback', () => { mk.view = 'home'; mk.msg = ''; renderMarket(); }); on('mhome', () => { mk.view = 'home'; mk.msg = ''; renderMarket(); });
  on('mclose', closeMarket);
  on('mexch', () => { if (S.stats.diamonds >= 1) { S.stats.diamonds--; earn(50); sfx.coin(); mk.msg = '💎 Un diamant contre 50 🪙 ! Bonne affaire !'; save(); renderMarket(); } });
}

// --- révision du jour ---
function makeReviewQueue() {
  const q = [], keys = new Set(), push = o => { if (o && !keys.has(o.key) && q.length < 10) { keys.add(o.key); q.push(o); } };
  Object.entries(S.learn).sort((x, y) => x[1].due - y[1].due).slice(0, 6).forEach(([k, v]) => { const [op, a, b, t] = k.split(':'); push(buildQ(op, +a, +b, false, t ? +t : null, v.ok === 0 ? v.hole : 0)); });
  const tabs = (S.tables.length ? S.tables : [2]).slice().sort((x, y) => (mastery(x) === null ? .4 : mastery(x)) - (mastery(y) === null ? .4 : mastery(y)));
  let guard = 0;
  while (q.length < 10 && guard++ < 80) {
    if (S.ops.mul && Math.random() < .7) { const t = tabs[guard % Math.min(3, tabs.length)]; let a = t, b = rnd(1, 10); if (Math.random() < .5) [a, b] = [b, a]; push(buildQ('mul', a, b, false, t)); }
    else push(makeQuestion());
  }
  while (q.length < 10) q.push(makeQuestion());
  return q;
}
function startReview() { const q = makeReviewQueue(); ask(false, { force: true, chal: { kind: 'review', need: q.length, got: 0, ok: 0, queue: q } }); }
function updateReviewBadge() { $('rbadge').style.display = S.review[dayKey()] ? 'none' : 'inline'; }
function renderPets(body) {
  if (!S.pets.length) { body.innerHTML = '<p class="gnext">Tu n\'as pas encore de compagnon. Va voir le marchand 🧑‍🌾 (ou clique sur lui dans le monde) !</p>'; return; }
  body.innerHTML = '<p class="gnext">🐾 Un seul compagnon te suit. Les autres t\'attendent à la maison : tu peux les échanger quand tu veux. Chacun garde ses accessoires !</p>' +
    S.pets.map((p, i) => `<div class="petrow ${p.out ? 'out' : ''}"><b>${petEmo(p.t)}</b><input data-i="${i}" class="pname" maxlength="12" placeholder="Son nom" value="${esc(p.name || '')}">
    <div class="pgrp"><small>${moodOf(joyOf(p))} (${Math.round(joyOf(p))} %)${RIDE.has(p.t) ? (p.trained ? ' · 🏇 dressé : tu peux le monter (touche R)' : ' · 🥕 à dresser pour le monter') : ' · trop petit pour être monté'}</small><div class="mood"><i style="width:${joyOf(p)}%"></i></div></div>
    <button class="btn pswap ${p.out ? 'green' : ''}" data-i="${i}">${p.out ? '🏠 Ranger' : '🐾 Sortir'}</button>
    <div class="pgrp"><small>🎩 Accessoires</small><span class="chips accs" data-i="${i}"></span></div>
    <div class="pgrp"><small>🎁 Objet offert (tes trouvailles)</small><span class="chips objs" data-i="${i}"></span></div></div>`).join('') + (S.acc.length ? '' : '<p class="gnext">Le marchand vend des accessoires : chapeau, couronne, lunettes…</p>');
  body.querySelectorAll('.pname').forEach(inp => inp.oninput = () => { const p = S.pets[+inp.dataset.i]; p.name = inp.value.trim(); const a = animals.find(x => x.petRef === p); if (a) setLabel(a, p.name); save(); });
  body.querySelectorAll('.pswap').forEach(b => b.onclick = () => { const p = S.pets[+b.dataset.i]; setActivePet(p.out ? null : p); renderPause('pets'); });
  body.querySelectorAll('.accs').forEach(ch => { const p = S.pets[+ch.dataset.i];
    if (p.accs.length) chip(ch, 'Tout enlever', false, () => { p.accs = []; refreshAcc(p); });
    S.acc.forEach(k => chip(ch, ACCS[k].ic, p.accs.includes(k), () => { const off = p.accs.includes(k); p.accs = p.accs.filter(x => x !== k && ACC_SLOT[x] !== ACC_SLOT[k]); if (!off) p.accs.push(k); refreshAcc(p); })); });
  const mine = FINDS.filter(f => S.found[f.id]);
  body.querySelectorAll('.objs').forEach(ch => { const p = S.pets[+ch.dataset.i];
    if (!mine.length) { ch.innerHTML = '<small>🔎 Explore les mondes pour trouver des objets à offrir !</small>'; return; }
    if (p.obj) chip(ch, 'Aucun', false, () => { p.obj = null; refreshAcc(p); });
    mine.forEach(f => chip(ch, f.ic, p.obj === f.id, () => { p.obj = p.obj === f.id ? null : f.id; refreshAcc(p); })); });
}
function refreshAcc(p) { const a = animals.find(x => x.petRef === p); if (a) setAcc(a); save(); renderPause('pets'); }


// ----- Écran de pause à onglets -----
let ptab = 'prog';
// la pause regroupe ses sections en 4 : aventure, collections, marchand, sons
const PGROUPS = [['adv', '🎒 Mon aventure', ['prog', 'ach', 'quests', 'chal']], ['coll', '📖 Collections', ['album', 'finds', 'pets']], ['shop', '🛒 Marchand', ['shop']], ['snd', '🔊 Sons', ['snd']]];
const PLEAF = { prog: '📊 Progrès', ach: '🏅 Succès', quests: '📜 Quêtes', chal: '⚡ Défis', album: '📖 Album', finds: '🔎 Trouvailles', pets: '🐾 Compagnons' };
const lastLeaf = {};
function renderPause(tab) {
  ptab = tab || ptab;
  const tb = $('ptabs'); tb.innerHTML = '';
  const grp = PGROUPS.find(g => g[2].includes(ptab)) || PGROUPS[0]; lastLeaf[grp[0]] = ptab;
  PGROUPS.forEach(([k, l, leaves]) => chip(tb, l, grp[0] === k, () => renderPause(lastLeaf[k] || leaves[0])));
  if (grp[2].length > 1) { const sub = document.createElement('div'); sub.className = 'psub'; grp[2].forEach(k => chip(sub, PLEAF[k], k === ptab, () => renderPause(k))); tb.appendChild(sub); }
  const body = $('pbody'), st = S.stats; let h = '';
  if (ptab === 'prog') {
    const tot = st.ok + st.ko, gi = gradeIdx(), g = GRADES[gi], nx = GRADES[gi + 1], pct = nx ? Math.round(100 * (st.stars - g[0]) / (nx[0] - g[0])) : 100;
    h += `<div class="grade">${g[1]} ${g[2]}</div><div class="gbar"><i style="width:${pct}%"></i></div>
      <div class="gnext">${nx ? `Encore ${nx[0] - st.stars} ⭐ pour devenir ${nx[1]} ${nx[2]}` : 'Niveau maximum ! 🎉'}</div>
      <div class="pst">✅ ${st.ok}/${tot} bonnes réponses · ⭐ ${st.stars} · 💎 ${st.diamonds} · 🔥 record ${st.best} · 🔒 ${st.chests}</div>
      <h3>Mes tables</h3><div class="tgrid">`;
    TABS10.forEach(t => { const m = mastery(t), c = m === null ? '#5b6b8f' : m >= .9 ? '#37b24d' : m >= .6 ? '#f59f00' : '#f03e3e';
      h += `<div class="tt"><b>${t}</b><div class="tb"><i style="width:${m === null ? 0 : Math.round(m * 100)}%;background:${c}"></i></div><span>${medal(t) || '·'}</span></div>`; });
    const miss = Object.entries(st.miss).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
    h += `</div><div id="review">${miss.length ? `<b>À réviser :</b> ${miss.map(([k]) => readable(k)).join(' · ')}` : 'Aucune erreur à réviser, bravo ! 🌟'}</div>`;
  } else if (ptab === 'ach') {
    h += '<div class="agrid">' + ACH.map(([id, ic, name]) => S.ach[id] ? `<div class="ach on"><b>${ic}</b><span>${name}</span></div>` : `<div class="ach"><b>❔</b><span>${name}</span></div>`).join('') + '</div>';
  } else if (ptab === 'shop') {
    h += `<p class="gnext">👛 Ton porte-monnaie : <b>${fmt(S.wallet)}</b>. Tu gagnes des pépites 🪙 avec les bonnes réponses, les coffres et les missions. Au marché, il faut donner la <b>somme exacte</b> !</p><button id="gomarket" class="btn green">🧑‍🌾 Aller voir le marchand</button>`;
  } else if (ptab === 'quests') {
    h += questsHtml();
  } else if (ptab === 'album') {
    h += albumHtml();
  } else if (ptab === 'finds') {
    h += findsHtml();
  } else if (ptab === 'snd') {
    h += '<p class="gnext">Choisis les sons du jeu :</p><div id="sndchips" class="chips"></div>';
  } else if (ptab === 'pets') {
    h += '<div id="petbody"></div>';
  } else {
    h += `<p class="gnext">📘 <b>Révision du jour</b> : 10 questions choisies sur tes points faibles. Le premier passage de la journée donne un cadeau 🎁 !</p><button id="revbtn" class="btn green">📘 Lancer la révision du jour</button>
      <p class="gnext">Réponds à <b>5 questions</b> d'affilée, une seule chance par question ! Chaque bonne réponse vaut 2 ⭐ et 5 🪙, et un sans-faute rapporte 2 💎.</p><button id="flash" class="btn green">⚡ Lancer le défi éclair</button>
      <p class="gnext">🔒 Les coffres au trésor sont cachés dans le monde : clique droit dessus et réponds à 3 questions pour les ouvrir.</p>`;
  }
  body.innerHTML = h;
  if (ptab === 'pets') renderPets($('petbody'));
  if (ptab === 'snd') renderSndChips($('sndchips'));
  const gm = $('gomarket'); if (gm) gm.addEventListener('click', () => openMarket('pause'));
  const rv = $('revbtn'); if (rv) rv.addEventListener('click', startReview);
  const f = $('flash'); if (f) f.addEventListener('click', startFlash);
}
function pauseGame() {
  if (state !== 'play') return;
  TUTO.paused = TUTO.on; state = 'pause'; savePos(); if (playAcc > 0) { today().t += playAcc; playAcc = 0; } save();
  if (document.pointerLockElement) document.exitPointerLock();
  renderPause('prog'); show('pause', true);
}
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && state === 'play') pauseGame(); });

function updateHud() {
  const g = GRADES[gradeIdx()], m = S.mission;
  $('h-stars').textContent = '⭐ ' + S.stats.stars; $('h-dia').textContent = '💎 ' + (UNLOCK_ALL ? '∞' : S.stats.diamonds); $('h-streak').textContent = '🔥 ' + streak;
  $('h-wallet').textContent = '🪙 ' + (UNLOCK_ALL ? '∞' : S.wallet.toLocaleString('fr-FR'));
  if (UNLOCK_ALL) { $('qbar').style.display = 'none'; $('mission').style.display = 'none'; }
  $('h-grade').innerHTML = `${g[1]}<em> ${g[2]}</em>`;
  $('mission').textContent = m ? `📜 ${m.text} (${Math.min(m.got, m.n)}/${m.n})` : '';
}

// ---------- Menu ----------
function chip(parent, label, on, fn) {
  const b = document.createElement('button'); b.className = 'chip' + (on ? ' on' : ''); b.textContent = label;
  b.addEventListener('click', () => fn(b)); parent.appendChild(b); return b;
}
function buildWorlds() {
  const el = $('worlds'); el.innerHTML = '';
  WORLD_ORDER.forEach(k => {
    const w = WORLDS[k], locked = !worldOpen(k), b = document.createElement('button');
    b.className = 'wcard w-' + k + (S.world === k ? ' on' : '') + (locked ? ' locked' : '');
    b.innerHTML = `<b>${w.emoji}</b><span>${w.name}</span><small>${locked ? lockText(k) : w.desc}</small>${!locked && k === dailyWorld() ? '<i class="dbadge">⭐×2 aujourd\'hui</i>' : ''}`;
    b.addEventListener('click', () => { if (locked) { $('wmsg').textContent = w.care ? `🤠 ${w.name} : réponds du premier coup, sans te précipiter ! (${Math.min(S.care, WEST_NEED)}/${WEST_NEED} réponses réfléchies, et au moins 80 % de réussite sur tes 20 dernières)` : `🔒 ${w.name} : gagne encore ${w.unlock - S.stats.stars} ⭐ en répondant aux questions !`; return; } $('wmsg').textContent = ''; if (k === S.world) startGame(); else switchWorld(k, true); });
    el.appendChild(b);
  });
}
function withLoading(w, fn) { $('ltxt').textContent = `${w.emoji} ${w.name}`; show('loading', true); setTimeout(() => { fn(); setTimeout(() => show('loading', false), 700); }, 60); }
function switchWorld(k, go) {
  savePos(); if (S.world !== k) quest('world'); S.world = k; if (!S.visited.includes(k)) S.visited.push(k); noteWorld(); save();
  withLoading(WORLDS[k], () => { applyLook(); generate(); buildAll(); spawnAnimals(); placePlayer(); spawnPets(); onWorldReady(); buildWorlds(); if (go) { if (!started) { started = true; nextQ = 25; } startGame(); } });
}
function buildMenu() {
  buildWorlds(); updateReviewBadge(); updateGiftBtn(); $('lvhint').classList.toggle('hidden', !!S.levelSet);
}
function startGame() {
  qInterval = S.freq; noteWorld();
  if (IS_TOUCH && canFS && !isApp && !inFS() && !autoFS) { autoFS = true; enterFS(); }
  if (limitSecs() && today().t >= limitSecs()) { show('menu', false); showLimit(); return; }
  if (!started) { placePlayer(); started = true; nextQ = 25; spawnPets(); onWorldReady(); }
  else nextQ = Math.max(nextQ, 8);
  sndStart();
  resume(); checkAch(); dayHello(); if (!S.tutoDone && !UNLOCK_ALL && !TUTO.on) startTuto(); { const w = WORLDS[S.world]; toast(S.name ? `${w.emoji} Salut ${S.name} ! Bienvenue : ${w.name}` : w.emoji + ' ' + w.name); }
}
$('review').addEventListener('click', () => { startGame(); if (state === 'play') startReview(); });
$('resume').addEventListener('click', resume);
$('settings').addEventListener('click', () => { show('pause', false); show('menu', true); state = 'menu'; buildMenu(); });
$('newworld').addEventListener('click', () => {
  if (editCount > 30 && !confirm('Ça efface ce que tu as construit dans ce monde. Continuer ?')) return;
  const rec = worldRec(); rec.seed = (Math.random() * 1e9) | 0; rec.edits = {}; rec.pos = null; save();
  withLoading(curCfg(), () => { generate(); buildAll(); spawnAnimals(); placePlayer(); spawnPets(); onWorldReady(); started = true; });
});
$('qok').addEventListener('click', closeReveal);
// on peut toujours quitter un défi (coffre, éclair, révision) sans pénalité
$('qlater').addEventListener('click', () => { chal = null; nextQ = nextGap(); resume(); toast('↩ Pas de souci, tu pourras réessayer plus tard !'); });
$('qsubmit').addEventListener('click', () => { const v = $('qinput').value.trim(); if (v !== '') guided ? guidedSubmit(v) : answer(v, null); });

// ---------- Entrées : clavier / souris ----------
document.addEventListener('keydown', e => {
  if (state === 'question') {
    if (revealed) { if (guided) { if (e.key === 'Enter') $('qsubmit').click(); } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeReveal(); } return; }
    if (S.mode === 'choice' && /^[1-4]$/.test(e.key)) { const b = $('qchoices').children[+e.key - 1]; if (b && !b.classList.contains('bad')) b.click(); }
    if (S.mode !== 'choice' && e.key === 'Enter') $('qsubmit').click();
    return;
  }
  if (e.key === 'Escape') {   // Échap ouvre la pause, et la ferme (même quand la souris n'est pas verrouillée)
    if (state === 'map') closeMap();
    else if (state === 'play') pauseGame();
    else if (state === 'pause' && !['market', 'parent', 'news', 'who', 'fshelp', 'limit'].some(id => !$(id).classList.contains('hidden'))) resume();
    return;
  }
  if (state === 'map' && e.key.toLowerCase() === 'n') { closeMap(); return; }
  if (state !== 'play') { if (e.key === 'Enter' && state === 'menu') startGame(); return; }
  keys[e.code] = true;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (/^[1-9]$/.test(e.key)) selectSlot(+e.key - 1);
  const k = e.key.toLowerCase();
  if (k === 'f' && UNLOCK_ALL) toggleFly();
  if (k === 'm') ask(false);
  if (k === 'c') takePhoto();
  if (k === 'n') openMap();
  if (k === 'r') toggleRide();
  if (k === 'p') pauseGame();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });
// Souris : verrouillée (regard libre) ou, à défaut, glisser pour tourner / cliquer pour agir
let drag = null;
document.addEventListener('mousemove', e => {
  if (state !== 'play') return;
  if (document.pointerLockElement === cv) { P.yaw -= e.movementX * .0024; P.pitch = clamp(P.pitch - e.movementY * .0024, -1.55, 1.55); }
  else if (drag) { P.yaw -= e.movementX * .005; P.pitch = clamp(P.pitch - e.movementY * .005, -1.55, 1.55); drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY); }
});
document.addEventListener('mousedown', e => {
  if (state !== 'play' || e.target !== cv) return;
  if (document.pointerLockElement === cv) { if (e.button === 0) actBreak(); else if (e.button === 2) actPlace(); return; }
  drag = { moved: 0, button: e.button };
  try { const p = cv.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch (err) {}
});
document.addEventListener('mouseup', e => {
  if (drag && state === 'play' && drag.moved < 8) { updateTarget(); if (drag.button === 0) actBreak(); else if (drag.button === 2) actPlace(); }
  drag = null;
});
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('wheel', e => { if (state === 'play') selectSlot(sel + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });

// ---------- Entrées : tactile ----------
let joyId = null, lookId = null, lookStart = null;
const joyEl = $('joy'), knob = $('joyknob');
function syncJoy() { knob.style.transform = `translate(${joy.x * 38}px,${-joy.y * 38}px)`; }
function joyMove(t) {
  const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = (t.clientX - cx) / 50, dy = (t.clientY - cy) / 50; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  joy.x = Math.abs(dx) < .12 ? 0 : dx; joy.y = Math.abs(dy) < .12 ? 0 : -dy; syncJoy();
}
joyEl.addEventListener('touchstart', e => { e.preventDefault(); joyId = e.changedTouches[0].identifier; joyMove(e.changedTouches[0]); }, { passive: false });
joyEl.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joyId) joyMove(t); }, { passive: false });
const joyEnd = e => { for (const t of e.changedTouches) if (t.identifier === joyId) { joyId = null; joy.x = joy.y = 0; syncJoy(); } };
joyEl.addEventListener('touchend', joyEnd); joyEl.addEventListener('touchcancel', joyEnd);

cv.addEventListener('touchstart', e => {
  if (state !== 'play') return; e.preventDefault();
  const t = e.changedTouches[0]; if (lookId !== null) return;
  lookId = t.identifier; lookStart = { x: t.clientX, y: t.clientY, lx: t.clientX, ly: t.clientY, time: performance.now(), moved: 0 };
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) if (t.identifier === lookId && state === 'play') {
    const dx = t.clientX - lookStart.lx, dy = t.clientY - lookStart.ly;
    P.yaw -= dx * .006; P.pitch = clamp(P.pitch - dy * .006, -1.55, 1.55);
    lookStart.lx = t.clientX; lookStart.ly = t.clientY; lookStart.moved += Math.abs(dx) + Math.abs(dy);
  }
}, { passive: false });
const lookEnd = e => {
  for (const t of e.changedTouches) if (t.identifier === lookId) {
    if (state === 'play' && lookStart.moved < 14 && performance.now() - lookStart.time < 350) { updateTarget(); touchMode === 'break' ? actBreak() : actPlace(); }
    lookId = null;
  }
};
cv.addEventListener('touchend', lookEnd); cv.addEventListener('touchcancel', lookEnd);

function hold(id, on, off) {
  const el = $(id);
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); on(); }, { passive: false });
  const end = e => { e.preventDefault(); off && off(); };
  el.addEventListener('touchend', end, { passive: false }); el.addEventListener('touchcancel', end, { passive: false });
  el.addEventListener('mousedown', e => { e.stopPropagation(); on(); }); el.addEventListener('mouseup', () => off && off());
}
hold('t-jump', () => keys.Space = true, () => keys.Space = false);
hold('t-ask', () => ask(false));
$('photo').addEventListener('click', takePhoto);
$('ride').addEventListener('click', toggleRide);
hold('t-pause', pauseGame);
hold('t-fly', toggleFly);
hold('t-down', () => keys.down = true, () => keys.down = false);
hold('t-mode', () => { touchMode = touchMode === 'break' ? 'place' : 'break'; $('t-mode').innerHTML = ICON(touchMode === 'break' ? 'pick' : 'block'); });
document.addEventListener('touchmove', e => { if (e.target.closest && !e.target.closest('.overlay')) e.preventDefault(); }, { passive: false });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); if (AC) { try { document.hidden ? AC.suspend() : AC.resume(); } catch (e) {} } });
addEventListener('pointerdown', sndStart, { once: true });

// ---------- Plein écran / appli installée ----------
const fsRoot = document.documentElement, fsReq = fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen;
const isApp = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const canFS = !!fsReq && document.fullscreenEnabled !== false && !/iPhone|iPod/.test(navigator.userAgent);
const inFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
if (isApp) document.body.classList.add('is-app');
function enterFS() { try { const p = fsReq.call(fsRoot, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
function toggleFS() {
  if (inFS()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} return; }
  if (!canFS) { show('fshelp', true); return; }
  try { const p = fsReq.call(fsRoot, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => show('fshelp', true)); } catch (e) { show('fshelp', true); }
}
function syncFS() { $('fs').innerHTML = ICON(inFS() ? 'compress' : 'expand'); $('open-fs').textContent = inFS() ? '✕ Quitter le plein écran' : '⛶ Plein écran'; resize(); }
document.addEventListener('fullscreenchange', syncFS); document.addEventListener('webkitfullscreenchange', syncFS);
$('fs').addEventListener('click', e => { e.stopPropagation(); toggleFS(); });
$('fs').addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
$('open-fs').addEventListener('click', toggleFS);
$('fshelp-ok').addEventListener('click', () => show('fshelp', false));
let autoFS = false;
if (DEV) { document.title = '[DEV] ' + document.title; const b = document.createElement('div'); b.id = 'devbadge'; b.textContent = 'VERSION DE TEST'; document.body.appendChild(b); }
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});

// ---------- Boucle principale ----------
let last = performance.now(), menuAngle = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  updateSky(dt); updateParts(dt); updateAnimals(dt);
  if (state === 'play' || state === 'question') { playAcc += dt; if (playAcc >= 5) flushPlay(); }
  updateCritters(dt, now / 1000); updateWeather(dt, now / 1000); updateLive(dt, now / 1000); Snd.tU = (Snd.tU || 0) + dt; if (Snd.tU > .25) { Snd.tU = 0; updateSound(now / 1000); }
  waterT += dt; if (waterT > .3) { waterT = 0; waterPh = (waterPh + 1) % 8; drawWater(waterPh); }
  if (state === 'play' || state === 'question') {
    if (state === 'play') {
      updatePlayer(dt); updateTarget();
      mmT += dt; if (mmT > .35) { mmT = 0; updateMinimap(); } $('mmarrow').style.transform = `rotate(${-P.yaw}rad)`;
      nextQ -= dt;
      const left = Math.max(0, nextQ), soon = left < 8;
      $('qfill').style.width = clamp(100 * (1 - left / qInterval), 0, 100) + '%';
      $('qlabel').textContent = soon ? `❓ Question dans ${Math.ceil(left)}…` : 'Prochaine question ⏳';
      $('qbar').classList.toggle('soon', soon);
      if (nextQ <= 0) ask(false);
    }
  } else if (state === 'menu' || !started) {
    menuAngle += dt * .12;
    const cx = W / 2, cz = D / 2, r = 34;
    camera.position.set(cx + Math.cos(menuAngle) * r, 46, cz + Math.sin(menuAngle) * r);
    camera.lookAt(cx, 16, cz); hl.visible = false;
  }
  renderer.render(scene, camera);
}

// ---------- Suivi d'activité & espace parent ----------
const pad = n => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const NEWDAY = () => ({ fast: 0, skip: 0, runs: 0, ok: 0, ko: 0, n: 0, ms: 0, t: 0, placed: 0, broken: 0, chests: 0, missions: 0, worlds: [] });
function today() { const k = dayKey(); return S.daily[k] || (S.daily[k] = NEWDAY()); }
let qStart = 0, playAcc = 0, warned5 = false;
// une seule entrée par question : le résultat du premier essai
function logAnswer(ok, given) {
  const d = today(), q = curQ, rt = Math.min(60000, performance.now() - qStart);
  if (ok) d.ok++; else d.ko++; d.n++; d.ms += rt;
  if (q.table) { const t = S.tabAll[q.table] || (S.tabAll[q.table] = { ok: 0, ko: 0, ms: 0, n: 0 }); if (ok) t.ok++; else t.ko++; t.ms += rt; t.n++; }
  const o = S.opAll[q.op] || (S.opAll[q.op] = { ok: 0, ko: 0 }); if (ok) o.ok++; else o.ko++;
  if (!ok) { S.errs.unshift({ d: Date.now(), q: q.text, a: q.answer, g: String(given).slice(0, 8) }); S.errs.length = Math.min(S.errs.length, 60); }
  if (!S.first) S.first = dayKey();
}
function noteWorld() { const d = today(); if (!d.worlds.includes(S.world)) d.worlds.push(S.world); }
function flushPlay() { savePos(); if (playAcc > 0) { today().t += playAcc; playAcc = 0; } save(); checkLimit(); }
const limitSecs = () => UNLOCK_ALL ? 0 : S.limit ? (S.limit + (S.bonus[dayKey()] || 0)) * 60 : 0;
function checkLimit() {
  const lim = limitSecs(); if (!lim || state !== 'play') return;
  const left = lim - today().t;
  if (left <= 0) showLimit();
  else if (left <= 300 && !warned5) { warned5 = true; toast('⏰ Plus que 5 minutes de jeu aujourd\'hui !'); }
}
function showLimit() { state = 'pause'; if (document.pointerLockElement) document.exitPointerLock(); show('limit', true); }
addEventListener('beforeunload', () => { if (playAcc > 0) { today().t += playAcc; playAcc = 0; save(); } });

const fmtT = sec => { sec = Math.round(sec); const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h} h ${pad(m)}` : `${m} min`; };
const pct = (a, b) => b ? Math.round(100 * a / b) : null;
const esc = v => String(v).replace(/[<>&"]/g, '');
function sumDays(n, X = S) {
  const o = NEWDAY(); delete o.worlds;
  for (let i = 0; i < n; i++) { const d = X.daily[dayKey(new Date(Date.now() - i * 864e5))]; if (d) for (const k in o) o[k] += d[k] || 0; }
  return o;
}
function sumAll(X = S) { const o = NEWDAY(); delete o.worlds; Object.values(X.daily).forEach(d => { for (const k in o) o[k] += d[k] || 0; }); return o; }

function parentPin(mode, cb) {
  show('parent', true);
  $('pcard').innerHTML = `<h1 class="ttl">👨‍👩‍👧 Espace parent</h1>
    <p class="gnext">${mode === 'create' ? 'Crée un code à 4 chiffres pour protéger cet espace (ne le donne pas à l\'enfant 😉)' : 'Entre ton code à 4 chiffres'}</p>
    <input id="pin" class="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••">
    <div id="pinmsg" class="gnext">&nbsp;</div>
    <div class="row"><button id="pinok" class="btn green">Valider</button><button id="pinback" class="btn">Retour</button></div>`;
  const inp = $('pin'); setTimeout(() => inp.focus(), 50);
  const go = () => {
    const v = inp.value.trim();
    if (!/^\d{4}$/.test(v)) { $('pinmsg').textContent = 'Le code doit faire 4 chiffres 🙂'; return; }
    if (mode === 'create') { REG.pin = v; saveReg(); (cb || renderParent)(); }
    else if (v === REG.pin) (cb || renderParent)();
    else { $('pinmsg').textContent = '❌ Code incorrect'; inp.value = ''; }
  };
  $('pinok').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  $('pinback').onclick = () => show('parent', false);
}
function openParent() { viewId = REG.cur; ptabP = 'suivi'; parentPin(REG.pin ? 'enter' : 'create'); }

let viewId = REG.cur, ptabP = 'suivi';
function renderParent(id) {
  const keepScroll = id ? 0 : $('pcard').scrollTop;
  if (id) viewId = id; if (!REG.list.some(p => p.id === viewId)) viewId = REG.cur;
  const X = viewId === REG.cur ? S : loadProfile(viewId), persistX = () => X === S ? save() : saveProfile(viewId, X);
  const w7 = sumDays(7, X), tot = sumAll(X), g = GRADES[gradeIdx(X)];
  const acc7 = pct(w7.ok, w7.ok + w7.ko), accT = pct(tot.ok, tot.ok + tot.ko), avgT = tot.n ? tot.ms / tot.n / 1000 : null;
  // jours consécutifs
  let streakD = 0; for (let i = 0; i < 400; i++) { const d = X.daily[dayKey(new Date(Date.now() - i * 864e5))]; if (d && d.n > 0) streakD++; else if (i > 0) break; }
  const lastKey = Object.keys(X.daily).filter(k => X.daily[k].t > 0 || X.daily[k].n > 0).sort().pop();
  const daysAgo = lastKey ? Math.floor((new Date(dayKey()) - new Date(lastKey)) / 864e5) : null;
  const kpi = (ic, l, v, sub) => `<div class="kpi"><b>${ic}</b><span>${l}</span><strong>${v}</strong><small>${sub}</small></div>`;
  const head = `<div class="phead"><h1 class="ttl">👨‍👩‍👧 Espace parent${X.name ? ' · ' + esc(X.name) : ''}</h1><div class="gnext">Suivi au ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}${X.first ? ' · premier jeu le ' + X.first.split('-').reverse().join('/') : ''}</div></div>`;
  let h = `<div class="kpis">
    ${kpi('⏱️', 'Temps de jeu (7 j)', fmtT(w7.t), 'Total : ' + fmtT(tot.t))}
    ${kpi('❓', 'Questions (7 j)', w7.n, 'Total : ' + tot.n)}
    ${kpi('🎯', 'Réussite 1er essai (7 j)', acc7 === null ? '–' : acc7 + ' %', 'Depuis le début : ' + (accT === null ? '–' : accT + ' %'))}
    ${kpi('⚡', 'Temps de réponse', avgT ? avgT.toFixed(1) + ' s' : '–', 'en moyenne')}
    ${kpi('🧐', 'Réponses trop rapides (7 j)', w7.fast, w7.n + w7.skip ? pct(w7.fast, w7.n + w7.skip) + ' % des réponses' : 'aucune donnée')}
    ${kpi('📅', 'Jours d\'affilée', streakD, lastKey ? 'Dernière partie : ' + (daysAgo === 0 ? 'aujourd\'hui' : daysAgo === 1 ? 'hier' : 'il y a ' + daysAgo + ' j') : 'Pas encore joué')}
    ${kpi('🏅', 'Grade', g[1] + ' ' + g[2], X.stats.stars + ' ⭐ · ' + X.stats.diamonds + ' 💎')}
  </div>`;
  // graphique 14 jours
  const bars = []; for (let i = 13; i >= 0; i--) { const dt = new Date(Date.now() - i * 864e5), d = X.daily[dayKey(dt)] || {}; bars.push({ lab: dt.getDate(), n: d.n || 0, acc: d.n ? d.ok / (d.ok + d.ko) : null, t: d.t || 0 }); }
  const mx = Math.max(5, ...bars.map(b => b.n));
  h += `<h3>Questions des 14 derniers jours</h3><svg class="chart" viewBox="0 0 580 175" role="img" aria-label="Questions par jour">` +
    bars.map((b, i) => { const x = 8 + i * 40, hh = Math.round(b.n / mx * 105), col = b.acc === null ? '#4b5a80' : b.acc >= .8 ? '#40c057' : b.acc >= .6 ? '#fab005' : '#fa5252';
      return `<rect x="${x}" y="${125 - hh}" width="30" height="${Math.max(hh, 3)}" rx="5" fill="${col}"/><text x="${x + 15}" y="${119 - hh}" text-anchor="middle" font-size="11" fill="currentColor">${b.n || ''}</text><text x="${x + 15}" y="143" text-anchor="middle" font-size="11" fill="currentColor">${b.lab}</text><text x="${x + 15}" y="158" text-anchor="middle" font-size="9" fill="currentColor" opacity=".7">${b.t ? Math.round(b.t / 60) + 'm' : ''}</text>`; }).join('') +
    `</svg><div class="gnext">🟩 ≥ 80 % de réussite · 🟧 60–80 % · 🟥 &lt; 60 % · sous chaque jour : minutes de jeu</div>`;
  // tables
  h += '<h3>Les tables de multiplication</h3><div class="ptab">';
  const weak = [], strong = [], slow = [];
  TABS10.forEach(t => {
    const a = X.tabAll[t] || { ok: 0, ko: 0, ms: 0, n: 0 }, n = a.ok + a.ko, p = pct(a.ok, n), av = a.n ? a.ms / a.n / 1000 : null;
    let st = 'Peu travaillée', cl = '#5b6b8f', ic = '⚪';
    if (n >= 5) { if (p >= 90 && av < 8) { st = 'Maîtrisée'; cl = '#37b24d'; ic = '✅'; strong.push(t); } else if (p >= 70) { st = 'En progrès'; cl = '#f59f00'; ic = '🙂'; } else { st = 'À retravailler'; cl = '#f03e3e'; ic = '⚠️'; weak.push(t); } if (av > 10) slow.push(t); }
    h += `<div class="prow"><b>Table de ${t}</b><div class="tb"><i style="width:${p || 0}%;background:${cl}"></i></div><span>${p === null ? '–' : p + ' %'}</span><em>${n} q.${av ? ' · ' + av.toFixed(1) + ' s' : ''}</em><u>${ic} ${st}</u></div>`;
  });
  h += '</div>';
  // opérations
  const OPN = { mul: '✖️ Multiplications', div: '➗ Divisions', add: '➕ Additions', sub: '➖ Soustractions', money: '🪙 Monnaie (marchand)' };
  h += '<h3>Par type de calcul</h3><div class="ptab">' + Object.keys(OPN).map(k => { const a = X.opAll[k] || { ok: 0, ko: 0 }, n = a.ok + a.ko, p = pct(a.ok, n);
    return `<div class="prow"><b>${OPN[k]}</b><div class="tb"><i style="width:${p || 0}%;background:${p === null ? '#5b6b8f' : p >= 80 ? '#37b24d' : p >= 60 ? '#f59f00' : '#f03e3e'}"></i></div><span>${p === null ? '–' : p + ' %'}</span><em>${n} q.</em><u></u></div>`; }).join('') + '</div>';
  // erreurs
  h += '<h3>Dernières erreurs</h3>' + (X.errs.length ? '<ul class="errs">' + X.errs.slice(0, 12).map(e => `<li>${esc(e.q).replace('?', '<b>?</b>')} <span>→ répondu <b>${esc(e.g)}</b>, bonne réponse <b>${e.a}</b></span> <small>${new Date(e.d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</small></li>`).join('') + '</ul>' : '<p class="gnext">Aucune erreur enregistrée pour l\'instant 🎉</p>');
  // réponses données trop vite (probablement au hasard)
  h += '<h3>Réponses trop rapides</h3><p class="gnext">En dessous d\'environ 1,5 à 2 s, l\'enfant n\'a pas le temps de lire : la réponse ne rapporte alors ni pépites ni étoiles.</p>' + ((X.sus || []).length ? '<ul class="errs">' + X.sus.slice(0, 8).map(e => `<li>${esc(e.q).replace('?', '<b>?</b>')} <span>→ répondu <b>${esc(e.g)}</b> en ${(e.ms / 1000).toFixed(1)} s (${e.ok ? 'juste' : 'faux'})</span> <small>${new Date(e.d).toLocaleDateString('fr-FR')}</small></li>`).join('') + '</ul>' : '<p class="gnext">✅ Aucune réponse trop rapide pour l\'instant.</p>');
  // activité
  { const lrn = Object.entries(X.learn || {});
    h += '<h3>Opérations à mémoriser</h3>' + (lrn.length ? '<div class="adv">' + lrn.slice(0, 12).map(([k, v]) => `<p>🔁 <b>${esc(readable(k))}</b> · réussie ${v.ok}/3 fois du premier coup</p>`).join('') + '</div>' : '<p class="gnext">Rien de particulier à mémoriser pour l\'instant 👍</p>'); }
  h += `<h3>Ce qu'il fait dans le jeu</h3><div class="kpis small">
    ${kpi('🧱', 'Blocs posés', tot.placed, 'cassés : ' + tot.broken)}
    ${kpi('🔒', 'Coffres ouverts', X.stats.chests, 'missions : ' + tot.missions)}
    ${kpi('🌍', 'Mondes visités', X.visited.length + '/' + WORLD_ORDER.length, X.visited.map(k => WORLDS[k].emoji).join(' '))}
    ${kpi('🐾', 'Compagnons', X.pets.length, 'succès : ' + Object.keys(X.ach).length + '/' + ACH.length)}
    ${kpi('📖', 'Album', Object.keys(X.album || {}).length + '/' + ALBUM_TOTAL, 'animaux rencontrés')}
    ${kpi('📜', 'Quêtes réussies', X.questsDone || 0, 'au total')}
    ${kpi('🤠', 'Far West', X.westOpen ? 'Débloqué' : Math.min(X.care || 0, WEST_NEED) + '/' + WEST_NEED, 'réponses réfléchies')}
  </div>`;
  // conseils
  const adv = [];
  if (tot.n < 10) adv.push('📊 Pas encore assez de données : les conseils apparaîtront après une dizaine de questions.');
  else {
    if (weak.length) adv.push(`📘 <b>À retravailler</b> : table${weak.length > 1 ? 's' : ''} de ${weak.join(', ')}. Le jeu les repose déjà plus souvent ; vous pouvez aussi les réciter ensemble 5 minutes.`);
    if (slow.length) adv.push(`🐢 <b>Encore hésitant</b> (plus de 10 s par réponse) : table${slow.length > 1 ? 's' : ''} de ${slow.join(', ')}.`);
    if (strong.length) adv.push(`🥇 <b>Bien maîtrisée${strong.length > 1 ? 's' : ''}</b> : table${strong.length > 1 ? 's' : ''} de ${strong.join(', ')}. Pensez à activer de nouvelles tables dans les réglages du menu !`);
    if (acc7 !== null && acc7 < 60 && w7.n >= 10) adv.push('🤔 Beaucoup d\'erreurs cette semaine : essayez les tables plus faciles (2, 5, 10) dans le menu pour reprendre confiance.');
    if (acc7 !== null && acc7 >= 85 && w7.n >= 15) adv.push('🚀 Très bonne semaine ! Vous pouvez ajouter des tables ou activer les divisions.');
    if (w7.fast >= 5 && w7.fast / (w7.n + w7.skip) >= .2) adv.push(`🧐 <b>Réponses très rapides</b> : ${w7.fast} réponses en moins de 2 s cette semaine (${pct(w7.fast, w7.n + w7.skip)} %). Il répond sans doute au hasard : le jeu ne les récompense plus. Parlez-en avec lui, et rappelez que le Far West 🤠 se débloque en répondant avec soin.`);
    if ((X.recent || []).length >= 6 && X.adapt !== false) { const ra = X.recent.reduce((p, q) => p + q, 0) / X.recent.length; if (ra < .6) adv.push(`🔁 Réussite récente : ${Math.round(ra * 100)} % du premier coup. Le jeu pose donc les questions plus souvent et repose les mêmes calculs ratés, jusqu'à ce qu'ils soient retenus.`); }
    if (w7.runs >= 2) adv.push(`😕 ${w7.runs} séries de 3 erreurs d'affilée cette semaine : le jeu lui fait recopier la bonne réponse. Une pause ou des tables plus faciles peuvent aider.`);
    if (daysAgo !== null && daysAgo >= 3) adv.push(`📅 Pas de partie depuis ${daysAgo} jours : 10 à 15 minutes par jour suffisent pour progresser.`);
    else if (w7.t < 600) adv.push('⏱️ Peu de jeu cette semaine : 10 à 15 minutes par jour suffisent pour bien progresser.');
  }
  if (!adv.length) adv.push('✅ Tout se passe bien, continuez comme ça !');
  h += '<h3>Conseils</h3><div class="adv">' + adv.map(a => `<p>${a}</p>`).join('') + '</div>';
  h += '<div class="row no-print"><button class="btn" id="pprint">🖨️ Imprimer ce suivi</button></div>';
  const reglages = `<h3>Niveau scolaire</h3><div id="plevel" class="chips"></div><div id="plvdesc" class="gnext"></div>
    <h3>Tables à réviser</h3><div id="ptables" class="chips"></div><div id="ppresets" class="chips small"></div>
    <h3>Types de questions</h3><div id="pops" class="chips"></div>
    <h3>Rythme des questions</h3><div id="pfreq" class="chips"></div>
    <h3>Façon de répondre</h3><div id="pmode" class="chips"></div>
    <h3>Mode TV</h3><div class="row"><button class="btn" id="ptv">${TVMODE ? '📱 Quitter le mode TV' : '📺 Jouer sur la TV'}</button></div>
    <p class="gnext">Le jeu s'affiche sur la télé et le téléphone sert de manette (voir « Mode TV » dans le README).</p>`;
  const securite = `<h3>Temps de jeu maximum par jour</h3><div id="plimit" class="chips"></div>
    <h3>Code parent</h3><div class="row"><button class="btn" id="ppin">🔑 Changer le code</button></div>
    <p class="gnext">Ce code protège cet espace : niveau, réglages et suivi. Ne le donne pas à l'enfant 😉</p>`;
  const donnees = `<h3>Joueur</h3><div class="psets"><label>Prénom de l'enfant <input id="pname" maxlength="20" value="${esc(X.name)}" placeholder="Prénom"></label></div>
    <h3>Sauvegarde</h3><div class="row"><button class="btn" id="pexport">💾 Exporter</button><label class="btn" id="pimportl">📂 Importer<input type="file" id="pimport" accept=".json" hidden></label></div>
    <p class="gnext">Les données sont enregistrées sur cet appareil et ce navigateur. Utilisez « Exporter » pour les sauvegarder ou les copier sur un autre appareil.</p>
    ${syncHtml()}
    <h3>Zone sensible</h3><div class="row"><button class="btn danger" id="preset">🗑️ Supprimer ce joueur</button></div>`;
  const body = { suivi: h, reglages, securite, donnees }[ptabP] || h;
  $('pcard').innerHTML = head + '<div id="ptabsP" class="chips no-print"></div><div class="ptabbody">' + body + '</div><div class="row no-print"><button class="btn green" id="pclose">← Retour au jeu</button></div>';
  if (REG.list.length > 1) { const ph = $('pcard').querySelector('.phead'); ph.insertAdjacentHTML('afterend', '<div id="pkids" class="chips no-print"></div>' + overviewHtml()); REG.list.forEach(p => chip($('pkids'), `${p.avatar} ${profName(p)}`, p.id === viewId, () => renderParent(p.id))); }
  [['suivi', '📊 Suivi'], ['reglages', '🎓 Réglages du jeu'], ['securite', '🔒 Sécurité'], ['donnees', '💾 Données']].forEach(([k, l]) => chip($('ptabsP'), l, ptabP === k, () => { ptabP = k; renderParent(viewId); }));
  const on = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  const change = fn => { fn(); X.levelSet = true; persistX(); renderParent(); };   // chaque réglage reste sur la même page
  if (ptabP === 'reglages') {
    ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'libre'].forEach(k => chip($('plevel'), k === 'libre' ? 'Libre' : k, X.level === k, () => change(() => { const L = LEVELS[k]; X.level = k; if (L) { X.tables = L.tables.slice(); X.ops = Object.assign({}, L.ops); } })));
    $('plvdesc').textContent = (X.level === 'libre' ? '' : X.level + ' : ') + LEVEL_INFO[X.level || 'libre'];
    for (let i = 1; i <= 10; i++) chip($('ptables'), i, X.tables.includes(i), () => change(() => { const k = X.tables.indexOf(i); if (k >= 0) X.tables.splice(k, 1); else X.tables.push(i); X.level = 'libre'; }));
    [['Faciles 2·5·10', [2, 5, 10]], ['2 → 5', [2, 3, 4, 5]], ['6 → 9', [6, 7, 8, 9]], ['Toutes', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]].forEach(([l, arr]) => chip($('ppresets'), l, false, () => change(() => { X.tables = arr.slice(); X.level = 'libre'; })));
    [['mul', '✖️ Multiplications'], ['div', '➗ Divisions'], ['add', '➕ Additions'], ['sub', '➖ Soustractions'], ['hole', '❓ À trous (? × 7 = 42)']].forEach(([k, l]) => chip($('pops'), l, X.ops[k], () => change(() => { X.ops[k] = !X.ops[k]; X.level = 'libre'; })));
    [[30, '⚡ Souvent (30 s)'], [60, '🙂 Normal (1 min)'], [90, '😌 Calme (1 min 30)']].forEach(([v, l]) => chip($('pfreq'), l, X.freq === v, () => change(() => { X.freq = v; })));
    chip($('pfreq'), '🧠 Plus de questions quand il se trompe', X.adapt !== false, () => change(() => { X.adapt = X.adapt === false; }));
    [['choice', '👆 4 réponses au choix'], ['typed', '⌨️ Il tape la réponse']].forEach(([v, l]) => chip($('pmode'), l, X.mode === v, () => change(() => { X.mode = v; })));
    on('ptv', () => { location.href = TVMODE ? location.pathname : location.pathname + '?tv'; });
  }
  if (ptabP === 'securite') {
    [[0, 'Aucune'], [15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 h']].forEach(([v, l]) => chip($('plimit'), l, X.limit === v, () => { X.limit = v; if (X === S) warned5 = false; persistX(); renderParent(); }));
    on('ppin', () => parentPin('create', () => { toast('🔑 Code modifié'); renderParent(); }));
  }
  if (ptabP === 'donnees') {
    syncBind();
    $('pname').oninput = e => { const n = e.target.value.trim(); X.name = n; REG.list.find(p => p.id === viewId).name = n; saveReg(); persistX(); };
    on('pexport', () => {
      const out = { version: 2, reg: REG, profiles: {} }; REG.list.forEach(p => { out.profiles[p.id] = p.id === REG.cur ? S : loadProfile(p.id); });
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })); a.download = 'mathcraft-sauvegarde.json'; a.click(); });
    $('pimport').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try {
      const o = JSON.parse(t);
      if (o && o.profiles && o.reg) { Object.entries(o.profiles).forEach(([id, d]) => localStorage.setItem(keyOf(id), JSON.stringify(d))); localStorage.setItem(REG_KEY, JSON.stringify(o.reg)); }
      else if (o && o.stats) localStorage.setItem(SAVE_KEY, t); else throw 0;
      location.reload(); } catch (err) { alert('Fichier de sauvegarde invalide.'); } }); };
    on('preset', () => {
      if (!confirm(`Supprimer le joueur « ${profName(REG.list.find(p => p.id === viewId))} » et toute sa progression ? Cette action est définitive.`)) return;
      try { localStorage.removeItem(keyOf(viewId)); } catch (e) {}
      REG.list = REG.list.filter(p => p.id !== viewId);
      if (!REG.list.length) REG.list.push({ id: 'p' + Date.now().toString(36), name: '', avatar: pick(AVATARS) });
      if (REG.cur === viewId) REG.cur = REG.list[0].id;
      saveReg(); location.reload(); });
  }
  on('pprint', () => window.print());
  $('pclose').onclick = () => { show('parent', false); buildMenu(); };
  if (keepScroll) $('pcard').scrollTop = keepScroll;
}
$('open-parent').addEventListener('click', openParent);
$('pcard').addEventListener('keydown', e => e.stopPropagation());
$('limit-ext').addEventListener('click', () => parentPin(REG.pin ? 'enter' : 'create', () => {
  S.bonus[dayKey()] = (S.bonus[dayKey()] || 0) + 15; warned5 = false; save(); show('parent', false); show('limit', false); startGame();
}));

// ---------- Profils : plusieurs enfants sur le même appareil ----------
const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🐵', '🦄', '🐙', '🚀', '⚽', '🎨', '🐲'];
const profName = p => p.name || 'Joueur';
function updateWho() { const me = REG.list.find(p => p.id === REG.cur); $('whoami').textContent = `${me.avatar} ${profName(me)}`; }
function reloadAs(id) { REG.cur = id; saveReg(); try { sessionStorage.setItem('mc-skip', '1'); } catch (e) {} location.reload(); }
function createProfile(name, avatar) { const id = 'p' + Date.now().toString(36); REG.list.push({ id, name, avatar }); reloadAs(id); }
function showWho(mode) { show('menu', false); show('pause', false); show('who', true); renderWho(mode); }
function renderWho(mode) {
  const c = $('whocard');
  if (mode === 'add' || mode === 'first') {
    let av = mode === 'first' ? REG.list[0].avatar : pick(AVATARS);
    c.innerHTML = `<h1 class="ttl">${mode === 'first' ? '👋 Bienvenue !' : '➕ Nouveau joueur'}</h1><p class="sub">Comment t'appelles-tu ?</p>
      <input id="wname" class="wname" maxlength="14" placeholder="Ton prénom" autocomplete="off">
      <p class="gnext">Choisis ton personnage :</p><div id="wav" class="avs"></div>
      <div class="row"><button id="wok" class="btn green">C'est parti !</button>${mode === 'first' ? '' : '<button id="wback" class="btn">Retour</button>'}</div>${mode === 'first' && SYNC_URL ? '<div class="row"><button id="wjoin" class="linkbtn">📲 J\'ai déjà une progression sur un autre appareil</button></div>' : ''}`;
    const drawAv = () => { const el = $('wav'); el.innerHTML = ''; AVATARS.forEach(a => { const b = document.createElement('button'); b.className = 'av' + (a === av ? ' on' : ''); b.textContent = a; b.onclick = () => { av = a; drawAv(); }; el.appendChild(b); }); };
    drawAv(); setTimeout(() => $('wname').focus(), 50);
    const go = () => {
      const n = $('wname').value.trim();
      if (!n) { $('wname').classList.add('shake'); return; }
      if (mode === 'first') { const p = REG.list[0]; p.name = n; p.avatar = av; S.name = n; saveReg(); save(); show('who', false); show('menu', true); updateWho(); }
      else createProfile(n, av);
    };
    $('wok').onclick = go; $('wname').onkeydown = e => { if (e.key === 'Enter') go(); };
    if (mode !== 'first') $('wback').onclick = () => renderWho();
    else if ($('wjoin')) $('wjoin').onclick = () => renderWho('join');
    return;
  }
  if (mode === 'join') {
    c.innerHTML = `<h1 class="ttl">📲 Retrouver ma progression</h1><p class="sub">Demande à un parent le code famille (Espace parent → Données, sur l'autre appareil).</p>
      <input id="wcode" class="wname" placeholder="Code famille" autocomplete="off" autocapitalize="characters"><p id="wjmsg" class="gnext"></p>
      <div class="row"><button id="wjgo" class="btn green">Récupérer</button><button id="wjback" class="btn">Retour</button></div>`;
    setTimeout(() => $('wcode').focus(), 50);
    const go = async () => { $('wjmsg').textContent = 'Connexion…'; const e = await syncJoin($('wcode').value); if (e) { $('wjmsg').textContent = e; return; } show('who', false); show('menu', true); updateWho(); toast('✅ Progression retrouvée !'); };
    $('wjgo').onclick = go; $('wcode').onkeydown = e => { if (e.key === 'Enter') go(); };
    $('wjback').onclick = () => renderWho('first');
    return;
  }
  c.innerHTML = '<h1 class="ttl">👋 Qui joue ?</h1><div id="wl" class="wholist"></div><div class="row"><button id="wclose" class="btn">Retour</button></div>';
  const wl = $('wl');
  REG.list.forEach(p => {
    const d = p.id === REG.cur ? S : loadProfile(p.id), g = GRADES[gradeIdx(d)];
    const b = document.createElement('button'); b.className = 'whocard' + (p.id === REG.cur ? ' on' : '');
    b.innerHTML = `<b>${p.avatar}</b><span>${esc(profName(p))}</span><small>${g[1]} ${g[2]} · ${d.stats.stars} ⭐</small>`;
    b.onclick = () => { if (p.id === REG.cur) { show('who', false); show('menu', true); } else reloadAs(p.id); };
    wl.appendChild(b);
  });
  if (REG.list.length < 8) { const b = document.createElement('button'); b.className = 'whocard add'; b.innerHTML = '<b>➕</b><span>Nouveau joueur</span><small>&nbsp;</small>'; b.onclick = () => renderWho('add'); wl.appendChild(b); }
  $('wclose').onclick = () => { show('who', false); show('menu', true); };
}
$('open-who').addEventListener('click', () => showWho());
$('whocard').addEventListener('keydown', e => e.stopPropagation());
function overviewHtml() {
  if (REG.list.length < 2) return '';
  const rows = REG.list.map(p => { const d = p.id === REG.cur ? S : loadProfile(p.id), w = sumDays(7, d), a = pct(w.ok, w.ok + w.ko), g = GRADES[gradeIdx(d)];
    return `<div class="prow ov"><b>${p.avatar} ${esc(profName(p))}</b><span>⏱️ ${fmtT(w.t)}</span><span>❓ ${w.n}</span><span>🎯 ${a === null ? '–' : a + ' %'}</span><u>${g[1]} ${g[2]}</u></div>`; }).join('');
  return `<h3>Vue d'ensemble des enfants (7 jours)</h3><div class="ptab">${rows}</div>`;
}

// Filet de sécurité : si une erreur imprévue survient pendant une question, on débloque l'écran au lieu de le laisser figé
addEventListener('error', () => {
  try { if (state === 'question') { chal = null; show('qbox', false); nextQ = qInterval; resume(); toast('Oups, petit souci… on continue !'); } } catch (e) {}
});

// =====================================================================
// Le monde qui vit : ramassables, événements, faune, album, quêtes, fêtes
// =====================================================================
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const dayRng = salt => mulberry(hashStr(dayKey() + salt));   // même tirage pour tous les enfants, un jour donné
const isWeekend = () => [0, 6].includes(new Date().getDay());

// --- nouveaux animaux ---
Object.assign(ACCS, {
  cape: { ic: '🦸', name: 'Cape de super-héros', base: 250, build(y, z, w) { const g = new THREE.Group(); g.add(box(w * 1.2, .6, .06, am(0xe03131), 0, y - .5, z - w * .8), box(w * .9, .3, .06, am(0xffd43b), 0, y - .2, z - w * .8)); return g; } },
  wings: { ic: '🧚', name: 'Ailes de fée', base: 300, build(y, z, w) { const g = new THREE.Group(), L = am(0xbde0ff); g.add(box(.06, .4, .3, L, -w * .8, y - .25, z - w * .5), box(.06, .4, .3, L, w * .8, y - .25, z - w * .5), box(.06, .25, .2, L, -w * .8, y - .6, z - w * .5), box(.06, .25, .2, L, w * .8, y - .6, z - w * .5)); return g; } },
});
Object.assign(TYPES, {
  owl: { size: .7, fly: true, build(g) { const Br = am(0x8a6a4a), Lt = am(0xd9c3a0), Y = am(0xffd43b), wl = new THREE.Group(), wr = new THREE.Group();
    g.add(box(.3, .4, .25, Br, 0, .4, 0), box(.26, .3, .04, Lt, 0, .38, .13), box(.32, .26, .26, Br, 0, .7, 0), box(.11, .11, .03, Y, -.08, .72, .14), box(.11, .11, .03, Y, .08, .72, .14), box(.04, .05, .03, AEYE, -.08, .72, .16), box(.04, .05, .03, AEYE, .08, .72, .16), box(.06, .06, .05, am(0xf59f00), 0, .64, .15), box(.06, .1, .05, Br, -.12, .88, 0), box(.06, .1, .05, Br, .12, .88, 0));
    wl.position.set(-.15, .45, 0); wl.add(box(.3, .03, .22, Br, -.15, 0, 0)); wr.position.set(.15, .45, 0); wr.add(box(.3, .03, .22, Br, .15, 0, 0)); g.add(wl, wr); g.userData.wings = [wl, wr]; } },
  pinto: { size: 2, build(g) { const B_ = am(0x8b5a2b), D_ = am(0x3a2412), W_ = am(0xf4efe6);
    g.add(box(.55, .7, 1.3, B_, 0, 1.1, 0), box(.57, .32, .55, W_, 0, 1.2, .2), box(.3, .7, .3, B_, 0, 1.55, .65), box(.3, .35, .6, B_, 0, 1.95, .95), box(.32, .2, .2, W_, 0, 1.9, 1.15), box(.1, .6, .2, D_, 0, 1.7, .45), box(.1, .5, .1, D_, 0, 1.0, -.7), box(.07, .07, .03, AEYE, -.16, 2.02, 1.1), box(.07, .07, .03, AEYE, .16, 2.02, 1.1));
    legs(g, B_, L4(.2, .5), .16, .75); } },
  blackhorse: { size: 2, build(g) { const B_ = am(0x1f1f26), D_ = am(0x0b0b0f), W_ = am(0xf4efe6);
    g.add(box(.55, .7, 1.3, B_, 0, 1.1, 0), box(.3, .7, .3, B_, 0, 1.55, .65), box(.3, .35, .6, B_, 0, 1.95, .95), box(.12, .22, .05, W_, 0, 2.05, 1.26), box(.1, .6, .2, D_, 0, 1.7, .45), box(.1, .5, .1, D_, 0, 1.0, -.7), box(.07, .07, .03, am(0xffe9a8), -.16, 2.02, 1.1), box(.07, .07, .03, am(0xffe9a8), .16, 2.02, 1.1));
    legs(g, D_, L4(.2, .5), .16, .75); } },
  goldhorse: { size: 2, build(g) { const B_ = am(0xf2c14e), D_ = am(0xfff3c4), Gd = am(0xffd43b);
    g.add(box(.55, .7, 1.3, B_, 0, 1.1, 0), box(.3, .7, .3, B_, 0, 1.55, .65), box(.3, .35, .6, B_, 0, 1.95, .95), box(.1, .6, .2, D_, 0, 1.7, .45), box(.1, .5, .1, D_, 0, 1.0, -.7), box(.08, .3, .08, Gd, 0, 2.28, 1.0), box(.07, .07, .03, AEYE, -.16, 2.02, 1.1), box(.07, .07, .03, AEYE, .16, 2.02, 1.1));
    legs(g, B_, L4(.2, .5), .16, .75); } },
  fox: { size: .9, build(g) { const O = am(0xe8762c), W_ = am(0xf8f4ee), K = am(0x2a2a30); g.add(box(.35, .35, .8, O, 0, .45, 0), box(.3, .3, .3, O, 0, .7, .5), box(.18, .14, .12, W_, 0, .62, .68), box(.07, .07, .07, K, 0, .66, .75), box(.08, .14, .06, O, -.1, .92, .45), box(.08, .14, .06, O, .1, .92, .45), box(.06, .05, .03, AEYE, -.08, .76, .65), box(.06, .05, .03, AEYE, .08, .76, .65), box(.2, .2, .55, O, 0, .5, -.65), box(.2, .2, .14, W_, 0, .5, -.98)); legs(g, K, L4(.11, .25), .1, .3); } },
  snail: { size: .35, build(g) { const Tn = am(0xd9c3a0), Sh = am(0xc2702a); g.add(box(.14, .1, .34, Tn, 0, .06, 0), box(.04, .12, .04, Tn, -.04, .18, .14), box(.04, .12, .04, Tn, .04, .18, .14), box(.2, .2, .2, Sh, 0, .2, -.04), box(.12, .12, .12, am(0x9a4f1c), 0, .22, -.04)); } },
  unicorn: { size: 2, build(g) { const W_ = am(0xf8f4ff), Pk = am(0xff8fc8), Gd = am(0xffd43b); g.add(box(.55, .7, 1.3, W_, 0, 1.1, 0), box(.3, .7, .3, W_, 0, 1.55, .65), box(.3, .35, .6, W_, 0, 1.95, .95), box(.1, .6, .2, Pk, 0, 1.7, .45), box(.1, .5, .1, Pk, 0, 1.0, -.7), box(.08, .4, .08, Gd, 0, 2.3, 1.05), box(.07, .07, .03, AEYE, -.16, 2.02, 1.1), box(.07, .07, .03, AEYE, .16, 2.02, 1.1)); legs(g, W_, L4(.2, .5), .16, .75); } },
  redpanda: { size: .8, build(g) { const R = am(0xc2542d), W_ = am(0xf8efe0), K = am(0x2a2a30); g.add(box(.4, .35, .7, R, 0, .45, 0), box(.34, .3, .3, R, 0, .7, .45), box(.2, .14, .1, W_, 0, .64, .62), box(.08, .14, .06, W_, -.13, .92, .4), box(.08, .14, .06, W_, .13, .92, .4), box(.06, .05, .03, AEYE, -.09, .76, .6), box(.06, .05, .03, AEYE, .09, .76, .6), box(.07, .07, .07, K, 0, .66, .69));
    for (let i = 0; i < 5; i++) g.add(box(.2, .2, .14, i % 2 ? K : R, 0, .5, -.45 - i * .14)); legs(g, K, L4(.12, .25), .11, .3); } },
  whale: { size: 4, swim: true, build(g) { const Bl = am(0x4f78a8), Wh = am(0xe6eef5); g.add(box(1.5, 1.2, 4.5, Bl, 0, .7, 0), box(1.3, .4, 3.8, Wh, 0, .2, 0), box(1, .9, 1.2, Bl, 0, .75, 2.6), box(1.9, .15, .9, Bl, 0, .8, -2.6), box(.1, .1, .03, AEYE, -.75, 1, 1.9), box(.1, .1, .03, AEYE, .75, 1, 1.9), box(.5, .1, .9, Bl, -1, .2, .8), box(.5, .1, .9, Bl, 1, .2, .8)); } },
  yeti: { size: 2, build(g) { const W_ = am(0xf4f8fc), Bl = am(0x6fb7e8), K = am(0x2a3a4a); g.add(box(.9, 1.1, .6, W_, 0, 1.1, 0), box(.6, .5, .5, W_, 0, 1.85, .05), box(.42, .3, .04, Bl, 0, 1.82, .32), box(.07, .07, .03, K, -.1, 1.88, .34), box(.07, .07, .03, K, .1, 1.88, .34), box(.22, .9, .22, W_, -.6, 1.1, 0), box(.22, .9, .22, W_, .6, 1.1, 0), box(.12, .2, .08, Bl, -.18, 2.2, 0), box(.12, .2, .08, Bl, .18, 2.2, 0)); legs(g, W_, [[-.25, 0], [.25, 0]], .3, .55); } },
  glowslime: { size: .8, hop: true, build(g) { const C = am(0x5af0e6), Pu = am(0xc77dff); g.add(box(.7, .6, .7, Pu, 0, .3, 0), box(.6, .5, .6, C, 0, .33, 0), box(.1, .12, .03, AEYE, -.14, .4, .35), box(.1, .12, .03, AEYE, .14, .4, .35), box(.16, .05, .03, AEYE, 0, .25, .35)); } },
  tmerchant: { size: 1.9, still: true, head: [1.85, 0, .42], build(g) { const Sk = am(0xe0b080), Pu = am(0x6f42c1), Gd = am(0xffd43b), Wh = am(0xf6f6f6), Br = am(0x6b3a1a);
    g.add(box(.55, .9, .36, Pu, 0, 1.15, 0), box(.4, .4, .4, Sk, 0, 1.78, 0), box(.5, .3, .5, Wh, 0, 2.05, 0), box(.12, .12, .06, Gd, 0, 2.1, .26), box(.3, .06, .04, Br, 0, 1.7, .21), box(.07, .07, .04, AEYE, -.09, 1.82, .21), box(.07, .07, .04, AEYE, .09, 1.82, .21), box(.14, .6, .14, Pu, -.36, 1.2, 0), box(.14, .6, .14, Pu, .36, 1.2, 0));
    legs(g, Br, [[-.12, 0], [.12, 0]], .18, .7); g.add(box(1.4, .5, .5, am(0xc92a2a), 0, .25, .85), box(.3, .3, .3, Gd, -.4, .65, .85), box(.3, .3, .3, am(0x40c057), 0, .65, .85), box(.3, .3, .3, am(0x4dabf7), .4, .65, .85)); } },
});
const RARE = { west: 'goldhorse', farm: 'unicorn', jungle: 'redpanda', savanna: 'unicorn', rock: 'yeti', ocean: 'whale', snow: 'yeti', cave: 'glowslime' };
const RARE_SET = new Set(Object.values(RARE));
const NOCT = { west: ['fox', 'owl'], farm: ['owl', 'fox'], jungle: ['owl'], savanna: ['fox', 'owl'], rock: ['owl'], snow: ['owl'] };     // animaux de la nuit
const RAINF = { farm: ['frog', 'snail'], jungle: ['frog', 'snail'], savanna: ['frog', 'snail'] };               // animaux de la pluie
const ANIMAL_INFO = { pig: ['🐷', 'Cochon'], sheep: ['🐑', 'Mouton'], chick: ['🐥', 'Poussin'], cow: ['🐮', 'Vache'], horse: ['🐴', 'Cheval'], monkey: ['🐒', 'Singe'], parrot: ['🦜', 'Perroquet'], frog: ['🐸', 'Grenouille'], giraffe: ['🦒', 'Girafe'], zebra: ['🦓', 'Zèbre'], lion: ['🦁', 'Lion'], elephant: ['🐘', 'Éléphant'], goat: ['🐐', 'Chèvre'], ibex: ['🦌', 'Bouquetin'], marmot: ['🐹', 'Marmotte'], crab: ['🦀', 'Crabe'], turtle: ['🐢', 'Tortue'], dolphin: ['🐬', 'Dauphin'], fish: ['🐟', 'Poisson'], penguin: ['🐧', 'Pingouin'], polarbear: ['🐻‍❄️', 'Ours polaire'], arcticfox: ['🦊', 'Renard polaire'], bat: ['🦇', 'Chauve-souris'], mole: ['🐭', 'Taupe'], slime: ['🟢', 'Slime'], owl: ['🦉', 'Hibou'], fox: ['🦊', 'Renard'], snail: ['🐌', 'Escargot'], unicorn: ['🦄', 'Licorne'], redpanda: ['🦝', 'Panda roux'], whale: ['🐋', 'Baleine'], yeti: ['⛄', 'Yéti'], glowslime: ['🔮', 'Slime cristal'] };
Object.assign(ANIMAL_INFO, { pinto: ['🐴', 'Cheval pie'], blackhorse: ['🐎', 'Étalon noir'], goldhorse: ['🌟', 'Cheval doré'] });
function speciesOf(k) { const c = WORLDS[k]; return [...new Set([...c.animals, ...(c.swimmers || []), ...(NOCT[k] || []), ...(RAINF[k] || []), RARE[k]])]; }
const ALBUM_TOTAL = new Set(WORLD_ORDER.flatMap(speciesOf)).size;

// --- marchand ambulant : objets rares ---
const MARKET_TRAVEL = [
  { id: 'acc-cape', cat: '🌟 Objets rares', ic: '🦸', name: 'Cape de super-héros', base: 250, acc: 'cape' },
  { id: 'acc-wings', cat: '🌟 Objets rares', ic: '🧚', name: 'Ailes de fée', base: 300, acc: 'wings' },
  { id: 'travel-potion', cat: '🌟 Objets rares', ic: '🧪', name: 'Grande potion ×2 (10 réponses)', base: 200, give: () => { S.boost += 10; } },
];
MARKET_TRAVEL.forEach(it => {
  if (it.acc) it.give = () => { S.acc.push(it.acc); };
});
// compagnons en vente : seulement les animaux photographiés (le chien et le chat sont toujours là), les rares chez le marchand ambulant
const PET_PRICE = { pinto: 350, blackhorse: 400, goldhorse: 1000, pig: 120, dog: 220, cat: 220, sheep: 180, chick: 250, monkey: 200, lion: 400, unicorn: 900, redpanda: 700, yeti: 800, glowslime: 600 };
const PET_ITEMS = [...Object.keys(ANIMAL_INFO), 'dog', 'cat'].filter(t => TYPES[t] && !TYPES[t].swim && !TYPES[t].still).map(t => {
  const rare = RARE_SET.has(t), size = TYPES[t].size;
  return { id: 'pet-' + t, cat: rare ? '🌟 Objets rares' : '🐾 Compagnons', ic: petEmo(t), name: ANIMAL_INFO[t] ? ANIMAL_INFO[t][1] : PETNAME[t], base: PET_PRICE[t] || (size < .6 ? 150 : size < 1.6 ? 200 : 450), pet: t, rare, free: !ANIMAL_INFO[t], give: () => addPet(t) };
});
const petsForSale = () => PET_ITEMS.filter(i => i.rare === !!mk.travel && (i.free || S.album[i.pet]));
const marketList = () => mk.travel ? [...MARKET_TRAVEL, ...petsForSale()] : [...MARKET, ...petsForSale()];

// --- ramassables (sprites emoji) : on les ramasse en marchant dessus ---
const EMO = { star: '⭐', egg: ['🥚', '🐣'], milk: '🥛', fruit: '🍎', pumpkin: '🎃', gift: '🎁', shell: '🐚' };
const PREW = { star: { c: 1, s: 1 }, egg: { c: 3 }, milk: { c: 3 }, fruit: { c: 2 }, pumpkin: { c: 5 }, gift: { c: 10, d: .15 }, shell: { c: 4 } };
const emoTex = {};
function emoSprite(ch, scale = .9) {
  if (!emoTex[ch]) {
    const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), g = x.createRadialGradient(48, 48, 6, 48, 48, 46);
    g.addColorStop(0, 'rgba(255,240,150,.8)'); g.addColorStop(1, 'rgba(255,240,150,0)'); x.fillStyle = g; x.fillRect(0, 0, 96, 96);
    x.font = '54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 48, 52); emoTex[ch] = new THREE.CanvasTexture(c);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoTex[ch], transparent: true, depthWrite: false })); sp.scale.set(scale * 1.3, scale * 1.3, 1); return sp;
}
let pickups = [];
function addPickup(kind, x, y, z, o = {}) {
  const e = o.emoji || EMO[kind], sp = emoSprite(Array.isArray(e) ? pick(e) : e); sp.position.set(x, y + .7, z); scene.add(sp);
  const p = { sp, kind, x, y, z, ph: Math.random() * 6, ttl: o.ttl || Infinity, fall: !!o.fall, coll: o.coll || null, idx: o.idx, find: o.find || null, vis: o.vis };
  pickups.push(p); return p;
}
function clearPickups(f = () => true) { pickups = pickups.filter(p => { if (f(p)) { scene.remove(p.sp); return false; } return true; }); }
function collectPickup(p) {
  if (p.find) return collectFind(p);
  const r = PREW[p.kind]; earn(r.c); if (r.s) addStars(r.s); if (r.d && Math.random() < r.d) S.stats.diamonds++;
  S.stats.picked = (S.stats.picked || 0) + 1; sfx.coin(); burst(p.x - .5, p.y + .3, p.z - .5, 0xffe066, 8);
  toast(`${Array.isArray(EMO[p.kind]) ? '🥚' : EMO[p.kind]} +${r.c} 🪙${r.s ? ' +1⭐' : ''}`);
  if (p.coll) (S.coll[p.coll] = S.coll[p.coll] || []).push(p.idx);
  quest('pick'); clearPickups(q => q === p); save(); updateHud();
}
function updatePickups(dt, t) {
  for (const p of pickups) {
    if (p.fall) { p.y -= 7 * dt; const gy = groundAt(p.x, p.z, p.y + 1); if (p.y <= gy) { p.y = gy; p.fall = false; } }
    if (p.find) p.sp.visible = Math.hypot(p.x - P.x, p.z - P.z) < p.vis && !solid(get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)));   // un objet rare ne se voit que de près, un objet enterré seulement une fois déterré
    p.ttl -= dt; p.sp.position.set(p.x, p.y + .75 + Math.sin(t * 2.2 + p.ph) * .15, p.z);
    p.sp.material.opacity = p.ttl < 6 ? .35 + .65 * Math.pow(Math.sin(t * 10), 2) : 1;
  }
  if (state === 'play') for (const p of pickups.slice()) if (!p.fall && p.sp.visible && Math.hypot(p.x - P.x, p.z - P.z) < 1.4 && Math.abs(p.y - P.y) < 2.4) collectPickup(p);
  if (pickups.some(p => p.ttl <= 0)) clearPickups(p => p.ttl <= 0);
}

// --- trouver des endroits ---
function validSpot(x, z) { const y = landY(x, z); return (y > SEA && curCfg().ground.has(get(x, y - 1, z)) && get(x, y, z) === 0) ? y : 0; }
function nearSpot(min, max) {
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * 6.283, d = min + Math.random() * (max - min), x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d);
    if (x < 3 || z < 3 || x > W - 4 || z > D - 4) continue; const y = validSpot(x, z); if (y) return [x + .5, y, z + .5];
  } return null;
}
function seededSpot(r) { for (let i = 0; i < 140; i++) { const x = 3 + Math.floor(r() * (W - 6)), z = 3 + Math.floor(r() * (D - 6)), y = validSpot(x, z); if (y) return [x + .5, y, z + .5]; } return null; }
function waterSpot(min, max) {
  for (let i = 0; i < 120; i++) {
    const a = Math.random() * 6.283, d = min + Math.random() * (max - min), x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d);
    if (x > 3 && z > 3 && x < W - 4 && z < D - 4 && get(x, SEA, z) === B.WATER && get(x, SEA - 2, z) === B.WATER) return [x + .5, z + .5];
  } return null;
}

// --- monter son compagnon ---
// seuls les gros animaux portent un cavalier ; il faut d'abord le dresser (3 bonnes réponses données calmement)
const RIDE = new Set(['horse', 'pinto', 'blackhorse', 'goldhorse', 'unicorn', 'zebra', 'lion', 'cow', 'pig', 'sheep', 'giraffe', 'elephant', 'goat', 'polarbear']);
const activePet = () => S.pets.find(q => q.out);
const rideable = p => !!p && RIDE.has(p.t);
const petName = p => p.name || (ANIMAL_INFO[p.t] ? ANIMAL_INFO[p.t][1] : PETNAME[p.t]) || 'Ton compagnon';
const joyOf = p => p.joy == null ? 60 : p.joy;
const moodOf = j => j >= 80 ? '😍 Très heureux' : j >= 55 ? '😊 Content' : j >= 25 ? '😐 Pas très en forme' : '😢 Triste';
function mountSpeed() { const p = activePet(); return 1.7 * (p && joyOf(p) >= 70 ? 1.2 : 1); }   // un compagnon heureux court plus vite
function mountLift() { const a = animals.find(x => x.pet); return a ? a.size * .4 : 0; }
function updateRideBtn() { const b = $('ride'); b.classList.toggle('hidden', !rideable(activePet())); b.innerHTML = ICON(riding ? 'down' : 'horse'); }
function mount(a) { riding = true; if (a.lab) a.lab.visible = false; updateRideBtn(); toast('🏇 Hue ! Appuie sur R (ou 🚶) pour descendre.'); }
function dismount() {
  riding = false; const a = animals.find(x => x.pet);
  if (a) { a.x = P.x + Math.cos(.8) * 1.8; a.z = P.z + Math.sin(.8) * 1.8; a.y = landY(a.x, a.z); if (a.lab) a.lab.visible = true; }
  updateRideBtn();
}
function toggleRide() {
  if (state !== 'play') return;
  if (riding) return dismount();
  const p = activePet(), a = p && animals.find(x => x.petRef === p);
  if (!rideable(p) || !a) return toast('🐾 Ce compagnon est trop petit pour être monté : seuls les chevaux, lions, moutons, cochons, vaches… portent un cavalier !');
  if (Math.hypot(a.x - P.x, a.z - P.z) > 6) return toast(`🐴 Approche-toi de ${petName(p)} pour le monter !`);
  if (joyOf(p) < 25) return toast(`😢 ${petName(p)} est trop triste pour te porter… Réponds bien aux questions, sans te presser, pour le consoler !`);
  if (!p.trained) { toast(`🥕 Pour monter ${petName(p)}, il faut le dresser : 3 bonnes réponses d'affilée, en prenant ton temps !`); return ask(false, { force: true, chal: { kind: 'train', need: 3, got: 0, ok: 0, pet: p } }); }
  mount(a);
}
// --- humeur du compagnon : contente quand on répond bien et calmement, triste quand on répond au hasard ---
function petJoy(d) {
  const p = activePet(); if (!p) return;
  const before = joyOf(p); p.joy = clamp(before + d, 0, 100);
  if (d > 0 && before < 25 && p.joy >= 25) toast(`💞 ${petName(p)} va mieux, merci de bien répondre !`);
  if (d < 0 && before >= 25 && p.joy < 25) toast(`😢 ${petName(p)} est triste : prends le temps de lire les calculs pour lui faire plaisir.`);
}
let floaters = [];
function floatEmoji(ch, x, y, z) { const sp = emoSprite(ch, .5); sp.position.set(x, y, z); scene.add(sp); floaters.push({ sp, t: 0 }); }
function updateFloaters(dt) {
  floaters = floaters.filter(f => { f.t += dt; f.sp.position.y += dt * .7; f.sp.material.opacity = Math.max(0, 1 - f.t / 2.5); if (f.t >= 2.5) { scene.remove(f.sp); return false; } return true; });
}
function petMood() {
  const p = activePet(), a = p && animals.find(x => x.petRef === p); if (!a) return;
  const j = joyOf(p);
  if (riding && j < 25) { dismount(); toast(`😢 ${petName(p)} est trop triste pour continuer à te porter.`); return; }
  if (riding) return;
  if (j >= 70 && Math.random() < .25) floatEmoji('💖', a.x, a.y + a.size + .7, a.z);
  else if (j < 25 && Math.random() < .25) floatEmoji('💧', a.x, a.y + a.size + .7, a.z);
}

// --- trouvailles : des objets cachés dans chaque monde, d'autant plus difficiles à trouver qu'ils sont rares ---
const RAR = [
  { n: 'Commun', c: '#9aa5b1', vis: 40, lo: 10, pep: 10, dia: 0 },
  { n: 'Peu commun', c: '#4dabf7', vis: 18, lo: 32, pep: 30, dia: 0 },
  { n: 'Rare', c: '#be4bdb', vis: 9, lo: 30, pep: 100, dia: 1 },
  { n: 'Légendaire', c: '#ffd43b', vis: 6, lo: 45, pep: 300, dia: 3 },
];
const FINDS = [
  ['farm', '🌾', 'Épi doré', 0], ['farm', '🥕', 'Carotte géante', 0], ['farm', '🔔', 'Cloche de vache', 1], ['farm', '🧺', 'Panier en argent', 2], ['farm', '🏆', 'Trophée du fermier', 3],
  ['jungle', '🥥', 'Noix de coco', 0], ['jungle', '🪶', 'Plume de perroquet', 0], ['jungle', '🗿', 'Idole ancienne', 1], ['jungle', '🧿', 'Œil protecteur', 2], ['jungle', '🏺', 'Vase des anciens', 3],
  ['savanna', '🦴', 'Os de dinosaure', 0], ['savanna', '🏹', 'Flèche tribale', 0], ['savanna', '🥁', 'Tambour', 1], ['savanna', '🧭', 'Boussole en or', 2], ['savanna', '👑', 'Couronne du roi lion', 3],
  ['rock', '⛏️', 'Vieille pioche', 0], ['rock', '🔦', 'Lampe de mineur', 0], ['rock', '🧲', 'Aimant', 1], ['rock', '🔶', 'Topaze', 2], ['rock', '💠', 'Cristal des montagnes', 3],
  ['ocean', '🐚', 'Coquillage nacré', 0], ['ocean', '🦪', 'Huître perlée', 0], ['ocean', '⚓', 'Ancre', 1], ['ocean', '🔱', 'Trident', 2], ['ocean', '🗺️', 'Carte au trésor', 3],
  ['snow', '❄️', 'Flocon parfait', 0], ['snow', '🧤', 'Moufle perdue', 0], ['snow', '⛸️', 'Patin à glace', 1], ['snow', '🕯️', 'Lanterne de givre', 2], ['snow', '🧊', 'Glace éternelle', 3],
  ['west', '🤠', 'Chapeau de cow-boy', 0], ['west', '🥾', 'Botte à éperon', 0], ['west', '⭐', 'Étoile de shérif', 1], ['west', '📜', 'Avis de recherche', 2], ['west', '💰', 'Sac d\'or du canyon', 3],
  ['cave', '🍄', 'Champignon lumineux', 0], ['cave', '🕸️', 'Toile brillante', 0], ['cave', '🔮', 'Orbe mystérieux', 1], ['cave', '💍', 'Anneau ancien', 2], ['cave', '🗝️', 'Clé mystérieuse', 3],
].map(([w, ic, name, rar], i, a) => ({ id: w + '-' + a.slice(0, i).filter(x => x[0] === w).length, w, ic, name, rar }));
const FIND_BY_ID = Object.fromEntries(FINDS.map(f => [f.id, f]));
const findOf = w => FINDS.filter(f => f.w === w);
// positions fixes pour un monde donné (tirées de sa graine) : commun près du départ, légendaire loin et enterré à 2 blocs
function spawnFinds() {
  const seed = worldRec().seed;
  findOf(S.world).filter(f => !S.found[f.id]).forEach(f => {
    const r = mulberry(hashStr(seed + f.id)), R = RAR[f.rar], d = sp => Math.hypot(sp[0] - P.x, sp[2] - P.z), cands = [];
    for (let i = 0; i < (f.rar ? 40 : 8); i++) { const sp = seededSpot(r); if (sp) cands.push(sp); }
    let pool = cands.filter(sp => d(sp) >= R.lo && (f.rar > 0 || d(sp) <= 50)); if (!pool.length) pool = cands;
    if (!pool.length) { const sp = nearSpot(15, 40); if (!sp) return; pool = [sp]; }
    const sp = f.rar === 2 ? pool.reduce((a, b) => b[1] > a[1] ? b : a) : f.rar === 3 ? pool.reduce((a, b) => d(b) > d(a) ? b : a) : pool[0];   // rare : tout en haut ; légendaire : le plus loin
    addPickup('find', sp[0], sp[1] - (f.rar === 3 ? 2 : 0), sp[2], { emoji: f.ic, find: f, vis: R.vis });
  });
}
function collectFind(p) {
  const f = p.find, R = RAR[f.rar]; S.found[f.id] = true; S.stats.finds = (S.stats.finds || 0) + 1;
  earn(R.pep); if (R.dia) S.stats.diamonds += R.dia;
  burst(p.x - .5, p.y + .3, p.z - .5, 0xffe066, 14); sfx.ok(); if (f.rar >= 2) confetti(f.rar === 3 ? 120 : 60);
  toast(`🔎 Trouvé : ${f.ic} ${f.name} (${R.n}) ! +${R.pep} 🪙${R.dia ? ` +${R.dia}💎` : ''}`);
  if (S.stats.finds === 1 && S.pets.length) setTimeout(() => toast('🐾 Tu peux offrir tes trouvailles à ton compagnon : Pause → Compagnons'), 1600);
  if (!S.findDone[f.w] && findOf(f.w).every(x => S.found[x.id])) { S.findDone[f.w] = true; S.stats.diamonds += 5; setTimeout(() => { toast(`🏅 Toutes les trouvailles : ${WORLDS[f.w].emoji} ${WORLDS[f.w].name} ! +5💎`); confetti(80); }, 1600); }
  quest('pick'); clearPickups(q => q === p); checkAch(); save(); updateHud();
}
// jeu du chaud / froid : un objet rare caché (pas encore visible) se signale quand on s'en approche
let hintAt = 0;
function findHints() {
  const now = performance.now() / 1000; if (now < hintAt) return;
  let bd = 99; for (const p of pickups) if (p.find && p.find.rar >= 2 && !p.sp.visible) bd = Math.min(bd, Math.hypot(p.x - P.x, p.z - P.z));
  if (bd < 18) { hintAt = now + 8; toast(`${bd < 5 ? '🔥 Brûlant' : bd < 10 ? '♨️ Chaud' : '🌤️ Tiède'} : un objet rare est caché tout près…${bd < 10 ? ' (peut-être sous terre : creuse !)' : ''}`); }
}
function findsHtml() {
  const n = FINDS.filter(f => S.found[f.id]).length;
  let h = `<p class="gnext">🔎 <b>${n}/${FINDS.length}</b> trouvailles. Elles sont cachées dans les mondes : plus un objet est rare, plus il est loin, haut ou enterré ! Offre-les à ton compagnon (Pause → Compagnons).</p>`;
  WORLD_ORDER.forEach(k => {
    const l = findOf(k), c = l.filter(f => S.found[f.id]).length;
    h += `<h3>${WORLDS[k].emoji} ${WORLDS[k].name} · ${c}/${l.length} ${c === l.length ? '🏅' : ''}</h3><div class="agrid alb">` + l.map(f => S.found[f.id]
      ? `<div class="ach on r${f.rar}"><b>${f.ic}</b><span>${f.name}</span><em style="color:${RAR[f.rar].c}">${RAR[f.rar].n}</em></div>`
      : `<div class="ach r${f.rar}"><b>❔</b><span>???</span><em style="color:${RAR[f.rar].c}">${RAR[f.rar].n}</em></div>`).join('') + '</div>';
  });
  return h;
}

// --- événements éphémères ---
const EV = { cur: null, next: 0, chest: null, prevWet: false };
function showBanner() {
  const e = EV.cur, el = $('evbanner'); if (!e) { el.classList.add('hidden'); return; }
  const left = Math.max(0, Math.ceil(e.until - performance.now() / 1000)); el.classList.remove('hidden');
  el.textContent = `${e.icon} ${e.short} · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}
function endEvent() { if (EV.cur && EV.cur.end) { try { EV.cur.end(); } catch (e) {} } EV.cur = null; showBanner(); EV.next = performance.now() / 1000 + 150 + Math.random() * 180; }
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,250,170,1)'); g.addColorStop(1, 'rgba(255,230,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function buildRainbow(cx, cy, cz) {
  const g = new THREE.Group(), cols = [0xff3b3b, 0xff9f1c, 0xffe14d, 0x5bd35b, 0x4dabf7, 0x5565d9, 0xb06be0], R = 14;
  cols.forEach((c, i) => g.add(new THREE.Mesh(new THREE.TorusGeometry(R - i * .75, .4, 6, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .6, fog: false, depthWrite: false }))));
  const th = Math.atan2(P.x - cx, P.z - cz); g.rotation.y = th; g.position.set(cx + Math.cos(th) * R, cy, cz - Math.sin(th) * R); scene.add(g); return g;
}
function buildAurora() {
  const g = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const geo = new THREE.PlaneGeometry(190, 34, 40, 4), pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = k === 1 ? [.6, .2, .9] : [.15, .95, .55];
    for (let i = 0; i < pos.count; i++) { const a = Math.sin(((pos.getY(i) + 17) / 34) * Math.PI); col[i * 3] = c[0] * a; col[i * 3 + 1] = c[1] * a; col[i * 3 + 2] = c[2] * a; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false })); m.position.z = -k * 6; g.add(m);
  } scene.add(g); return g;
}
function startEvent(id) {
  const t = performance.now() / 1000;
  const begin = (icon, short, text, dur, end, tick) => { EV.cur = { id, icon, short, until: t + dur, end, tick }; showBanner(); sfx.ask(); toast(`${icon} ${text}`); return true; };
  if (id === 'treasure' || id === 'rainbow') {
    const sp = nearSpot(id === 'rainbow' ? 28 : 14, id === 'rainbow' ? 45 : 42); if (!sp) return false;
    const x = Math.floor(sp[0]), y = sp[1], z = Math.floor(sp[2]); setBlock(x, y, z, B.CHEST, true); EV.chest = { x, y, z };
    const fx = emoSprite('✨', 1.6); fx.position.set(x + .5, y + 2.4, z + .5); scene.add(fx); const rb = id === 'rainbow' ? buildRainbow(x + .5, y, z + .5) : null;
    return begin(id === 'rainbow' ? '🌈' : '💰', id === 'rainbow' ? 'Arc-en-ciel : coffre magique' : 'Trésor flash', id === 'rainbow' ? 'Un arc-en-ciel ! Un coffre magique t\'attend à son pied…' : 'Trésor flash ! Un coffre doré est apparu : cherche le point rouge sur la mini-carte', id === 'rainbow' ? 240 : 180,
      () => { scene.remove(fx); if (rb) scene.remove(rb); if (EV.chest && get(EV.chest.x, EV.chest.y, EV.chest.z) === B.CHEST) setBlock(EV.chest.x, EV.chest.y, EV.chest.z, 0, true); EV.chest = null; });
  }
  if (id === 'merchant') {
    const sp = nearSpot(7, 14); if (!sp) return false; const a = newAnimal('tmerchant', sp[0], sp[1], sp[2]); a.travel = true; animals.push(a); setLabel(a, '🛒 Marchand ambulant');
    return begin('🧙', 'Marchand ambulant', 'Un marchand ambulant est arrivé ! Va le voir : objets rares à -30 %', 300, () => { scene.remove(a.g); animals = animals.filter(x => x !== a); if (!$('market').classList.contains('hidden') && mk.travel) closeMarket(); });
  }
  if (id === 'meteors') {
    return begin('☄️', 'Étoiles filantes', 'Pluie d\'étoiles filantes ! Ramasse les étoiles ⭐ qui tombent', 80, null, dt => {
      EV.cur.acc = (EV.cur.acc || 0) + dt; if (EV.cur.acc > 1.2) { EV.cur.acc = 0; const sp = nearSpot(3, 24); if (sp) addPickup('star', sp[0], sp[1] + 22, sp[2], { fall: true, ttl: 80 }); }
    });
  }
  if (id === 'fireflies') {
    const orbs = []; for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.set(.7, .7, 1); scene.add(s); orbs.push({ s, a: Math.random() * 6.28, r: 3 + Math.random() * 14, h: Math.random() * 3.5, ph: Math.random() * 6 }); }
    return begin('✨', 'Nuée de lucioles', 'Une nuée de lucioles géantes illumine la nuit !', 60, () => { orbs.forEach(o => scene.remove(o.s)); addStars(2); earn(10); toast('✨ Quel beau spectacle ! +2⭐ +10 🪙'); }, (dt, tt) => {
      orbs.forEach(o => o.s.position.set(P.x + Math.cos(o.a + tt * .12) * o.r, P.y + 1 + o.h + Math.sin(tt * .9 + o.ph) * .7, P.z + Math.sin(o.a + tt * .12) * o.r));
    });
  }
  if (id === 'aurora') {
    const au = buildAurora();
    return begin('🌌', 'Aurore boréale', 'Une aurore boréale illumine le ciel ! Lève la tête…', 75, () => { scene.remove(au); addStars(3); earn(15); toast('🌌 Tu as vu l\'aurore boréale ! +3⭐ +15 🪙'); }, (dt, tt) => {
      au.position.set(P.x, 58, P.z - 95); au.children.forEach((m, k) => { const pos = m.geometry.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * .06 + tt * .7 + k * 2) * 7); pos.needsUpdate = true; });
    });
  }
  if (id === 'dolphins') {
    const sp = waterSpot(15, 40); if (!sp) return false; const list = [];
    for (let i = 0; i < 5; i++) { const a = newAnimal('dolphin', sp[0] + (Math.random() - .5) * 6, SEA - 1, sp[1] + (Math.random() - .5) * 6); a.show = true; a.temp = 'show'; animals.push(a); list.push(a); }
    return begin('🐬', 'Spectacle de dauphins', 'Un banc de dauphins fait un spectacle sur l\'eau ! Approche-toi…', 60, () => { const near = list.some(a => Math.hypot(a.x - P.x, a.z - P.z) < 30); list.forEach(a => { scene.remove(a.g); }); animals = animals.filter(a => !list.includes(a)); if (near) { addStars(2); earn(10); toast('🐬 Quel spectacle ! +2⭐ +10 🪙'); } });
  }
  if (id === 'tide') {
    let n = 0; for (let i = 0; i < 8; i++) { const sp = nearSpot(10, 45); if (sp) { addPickup('shell', sp[0], sp[1], sp[2], { ttl: 240 }); n++; } } if (!n) return false;
    return begin('🐚', 'Marée basse', 'Marée basse ! Des coquillages sont apparus sur la plage', 240, () => clearPickups(p => p.kind === 'shell' && !p.coll));
  }
  return false;
}
function tryStartEvent(t) {
  const w = S.world, ind = curCfg().indoor, list = [['treasure', 3], ['merchant', 2]];
  if (!ind && isNight) list.push(['meteors', 3]);
  if (!ind && isNight && ['farm', 'jungle', 'ocean', 'savanna'].includes(w)) list.push(['fireflies', 2]);
  if (!ind && isNight && ['snow', 'rock'].includes(w)) list.push(['aurora', 3]);
  if (w === 'ocean' && !isNight) list.push(['dolphins', 3], ['tide', 2]);
  for (let tries = 0; tries < 4 && list.length; tries++) {
    const tot = list.reduce((s, [, x]) => s + x, 0); let r = Math.random() * tot, k = 0; for (let i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) { k = i; break; } }
    const id = list.splice(k, 1)[0][0]; if (startEvent(id)) return;
  }
  EV.next = t + 30;
}

// --- faune qui change selon l'heure et la météo ---
function updateFauna() {
  const night = isNight && NOCT[S.world], rainy = (WX.type === 'rain' || WX.type === 'storm') && WX.mix > .3 && RAINF[S.world];
  animals = animals.filter(a => { if ((a.temp === 'night' && !night) || (a.temp === 'rain' && !rainy)) { scene.remove(a.g); return false; } return true; });
  const cnt = k => animals.filter(a => a.temp === k).length;
  const add = (type, k) => { const sp = nearSpot(10, 28); if (!sp) return; const a = newAnimal(type, sp[0], sp[1] + (TYPES[type].fly ? 2 : 0), sp[2]); a.temp = k; animals.push(a); };
  if (night && cnt('night') < 4) add(pick(NOCT[S.world]), 'night');
  if (rainy && cnt('rain') < 4) add(pick(RAINF[S.world]), 'rain');
}
function spawnRare() {
  const type = RARE[S.world]; if (!type || rareOwned(type)) return; let a = null;
  if (TYPES[type].swim) { const sp = waterSpot(10, 60); if (sp) a = newAnimal(type, sp[0], SEA - 2, sp[1]); }
  else { const sp = nearSpot(12, 38) || seededSpot(Math.random); if (sp) a = newAnimal(type, sp[0], sp[1], sp[2]); }
  if (!a) return; a.rare = true; animals.push(a); setLabel(a, '✨ Rare !');
  setTimeout(() => toast(`✨ Un animal rare est apparu dans ce monde : ${ANIMAL_INFO[type][0]} ${ANIMAL_INFO[type][1]} ! Trouve-le et apprivoise-le !`), 2500);
}
function startTame(a) { if (state !== 'play') return; ask(false, { chal: { kind: 'tame', need: 3, got: 0, ok: 0, animal: a } }); }

// --- album des animaux ---
function markMet(a, img) {
  const t = a.type, isNew = !S.album[t];
  if (img && !S.photos[t]) S.photos[t] = img;
  if (!isNew) toast(`📷 Belle photo ! ${ANIMAL_INFO[t][0]} ${ANIMAL_INFO[t][1]} est déjà dans ton album.`);
  else {
    S.album[t] = true; earn(5); sfx.ok(); toast(`📸 Nouveau dans ton album : ${ANIMAL_INFO[t][0]} ${ANIMAL_INFO[t][1]} ! +5 🪙`);
    if (PET_ITEMS.some(i => i.pet === t && !i.rare)) setTimeout(() => toast(`🛒 Tu peux maintenant l'acheter chez le marchand !`), 1500);
    WORLD_ORDER.forEach(k => { const sp = speciesOf(k); if (!S.albumDone[k] && sp.every(x => S.album[x])) { S.albumDone[k] = true; S.stats.diamonds += 3; setTimeout(() => { toast(`🏅 Album complet : ${WORLDS[k].emoji} ${WORLDS[k].name} ! +3💎`); confetti(80); }, 1400); } });
    checkAch();
  }
  save();
  if (!S.meetDay || S.meetDay.day !== dayKey()) S.meetDay = { day: dayKey(), set: {} };
  if (!S.meetDay.set[t]) { S.meetDay.set[t] = 1; quest('meet'); }
}
// prendre en photo l'animal le plus proche du centre de l'écran : il entre dans l'album (avec sa photo) et arrive chez le marchand
function takePhoto() {
  if (state !== 'play') return;
  sfx.shot(); const fl = document.createElement('div'); fl.className = 'shot'; document.body.appendChild(fl); setTimeout(() => fl.remove(), 500);
  camera.updateMatrixWorld();
  const o = camera.position, look = lookDir(), v = new THREE.Vector3(); let best = null, bs = 9;
  for (const a of animals) {
    if (!ANIMAL_INFO[a.type] || (riding && a.pet)) continue;
    const dx = a.x - o.x, dy = a.y + a.h + a.size * .45 - o.y, dz = a.z - o.z, dist = Math.hypot(dx, dy, dz);
    if (dist > 32 || (dx * look.x + dy * look.y + dz * look.z) / dist < .4) continue;
    v.set(a.x, o.y + dy, a.z).project(camera);
    if (Math.abs(v.x) > .85 || Math.abs(v.y) > .85) continue;
    const hit = raycast(o, { x: dx / dist, y: dy / dist, z: dz / dist }, dist); if (hit && hit.t < dist - 1) continue;   // caché derrière un bloc
    const sc = v.x * v.x + v.y * v.y + dist * .002; if (sc < bs) { bs = sc; best = a; }
  }
  if (!best) { toast('📷 Aucun animal dans la photo… Approche-toi et vise-le au centre !'); return; }
  const a = best, top = new THREE.Vector3(a.x, a.y + a.h + a.size * 1.05, a.z).project(camera), foot = new THREE.Vector3(a.x, a.y + a.h, a.z).project(camera), mid = new THREE.Vector3(a.x, a.y + a.h + a.size * .45, a.z).project(camera);
  const W = cv.width, Hh = cv.height, cx = (mid.x * .5 + .5) * W, cy = (.5 - mid.y * .5) * Hh;
  const cw = Math.min(W, Hh / .75, Math.max(150, Math.abs(top.y - foot.y) * .5 * Hh * 2.4)), ch = cw * .75, sx = clamp(cx - cw / 2, 0, W - cw), sy = clamp(cy - ch / 2, 0, Hh - ch);
  renderer.render(scene, camera);
  const c2 = document.createElement('canvas'); c2.width = 160; c2.height = 120; c2.getContext('2d').drawImage(cv, sx, sy, cw, ch, 0, 0, 160, 120);
  const img = c2.toDataURL('image/jpeg', .6), t = a.type;
  const pol = document.createElement('div'); pol.className = 'polaroid'; pol.innerHTML = `<img src="${img}" alt=""><span>${ANIMAL_INFO[t][0]} ${ANIMAL_INFO[t][1]}</span>`; document.body.appendChild(pol); setTimeout(() => pol.remove(), 3200);
  markMet(a, img); tutoEvent('photo');
}
function albumHtml() {
  let h = `<p class="gnext">📖 <b>${Object.keys(S.album).length}/${ALBUM_TOTAL}</b> animaux photographiés. Vise un animal au centre de l'écran et prends-le en photo (touche C ou bouton 📷) ! Certains ne sortent que la nuit ou sous la pluie.</p>`;
  WORLD_ORDER.forEach(k => {
    const sp = speciesOf(k), n = sp.filter(t => S.album[t]).length;
    h += `<h3>${WORLDS[k].emoji} ${WORLDS[k].name} · ${n}/${sp.length} ${n === sp.length ? '🏅' : ''}</h3><div class="agrid alb">` + sp.map(t => S.album[t] ? `<div class="ach on">${S.photos[t] ? `<img src="${S.photos[t]}" alt="">` : `<b>${ANIMAL_INFO[t][0]}</b>`}<span>${ANIMAL_INFO[t][0]} ${ANIMAL_INFO[t][1]}${RARE_SET.has(t) ? ' ✨' : ''}</span></div>` : '<div class="ach"><b>❔</b><span>📷 ???</span></div>').join('') + '</div>';
  });
  return h;
}

// --- quêtes du jour (les mêmes pour tous les enfants, un jour donné) ---
const QTPL = [
  { k: 'answer', gen: r => { const n = [5, 8, 10][Math.floor(r() * 3)]; return { n, text: `Réponds juste à ${n} questions` }; } },
  { k: 'pick', gen: r => { const n = [3, 5, 6][Math.floor(r() * 3)]; return { n, text: `Ramasse ${n} trésors (⭐ 🥚 🎃 🎁 🐚…)` }; } },
  { k: 'meet', gen: r => { const n = [3, 4, 5][Math.floor(r() * 3)]; return { n, text: `Photographie ${n} animaux différents` }; } },
  { k: 'chest', gen: () => ({ n: 1, text: 'Ouvre un coffre au trésor 🔒' }) },
  { k: 'buy', gen: () => ({ n: 1, text: 'Fais un achat chez le marchand 🛒' }) },
  { k: 'place', gen: r => { const n = [10, 20, 30][Math.floor(r() * 3)]; return { n, text: `Pose ${n} blocs` }; } },
  { k: 'review', gen: () => ({ n: 1, text: 'Fais la révision du jour 📘' }) },
  { k: 'world', gen: () => ({ n: 1, text: 'Visite un autre monde 🌍' }) },
];
function ensureQuests() {
  const d = dayKey(); if (S.quests && S.quests.day === d) return;
  const r = dayRng('q'), pool = QTPL.slice(), list = [];
  for (let i = 0; i < 3; i++) { const t = pool.splice(Math.floor(r() * pool.length), 1)[0]; list.push(Object.assign({ k: t.k, got: 0, done: false }, t.gen(r))); }
  S.quests = { day: d, list, all: false }; S.meetDay = { day: d, set: {} };
  Object.keys(S.coll).forEach(k => { if (!k.startsWith(d)) delete S.coll[k]; }); save();
}
function quest(k, n = 1) {
  ensureQuests();
  for (const q of S.quests.list) if (q.k === k && !q.done) {
    q.got += n;
    if (q.got >= q.n) { q.done = true; S.questsDone = (S.questsDone || 0) + 1; earn(20); S.stats.diamonds++; sfx.ok(); setTimeout(() => toast(`📜 Quête réussie : ${q.text} ! +20 🪙 +1💎`), 900); }
  }
  if (!S.quests.all && S.quests.list.every(q => q.done)) { S.quests.all = true; earn(50); S.stats.diamonds += 3; confetti(100); setTimeout(() => toast('🏆 Toutes les quêtes du jour sont faites ! +50 🪙 +3💎'), 1800); }
  checkAch(); save();
}
function questsHtml() {
  ensureQuests(); const f = festival(), dw = dailyWorld();
  return `<p class="gnext">🌍 Monde du jour : <b>${WORLDS[dw].emoji} ${WORLDS[dw].name}</b> (étoiles ×2 aujourd'hui)${isWeekend() ? ' · 🎉 Week-end : défi éclair ×2' : ''}${f ? ` · ${f.icon} ${f.name}` : ''}</p>
    <div class="adv">${S.quests.list.map(q => `<p>${q.done ? '✅' : '⬜'} ${q.text} <b>(${Math.min(q.got, q.n)}/${q.n})</b></p>`).join('')}</div>
    <p class="gnext">${S.quests.all ? '🏆 Toutes les quêtes du jour sont faites !' : 'Les quêtes changent chaque jour, et sont les mêmes pour tous les enfants.'}</p>`;
}

// --- monde du jour, cadeau du jour, surprises ---
function dailyWorld() { const un = WORLD_ORDER.filter(worldOpen), r = dayRng('w'); return un[Math.floor(r() * un.length)] || 'farm'; }
function giftPrize() {
  const r = dayRng('g'), pool = [
    ['50 pépites 🪙', () => earn(50)], ['3 diamants 💎', () => { S.stats.diamonds += 3; }], ['60 briques 🧱', () => addInv(B.BRICK, 60)], ['60 blocs de verre 🪟', () => addInv(B.GLASS, 60)],
    ['une potion ×2 (5 réponses) 🧪', () => { S.boost += 5; }], ['20 laines de chaque couleur 🌈', () => { addInv(B.RED, 20); addInv(B.BLUE, 20); addInv(B.YELLOW, 20); }], ['30 pépites et 2 diamants', () => { earn(30); S.stats.diamonds += 2; }],
  ];
  const free = Object.keys(ACCS).filter(k => !S.acc.includes(k) && k !== 'cape' && k !== 'wings'); if (free.length) pool.push([`${ACCS[free[0]].ic} ${ACCS[free[0]].name} gratuit !`, () => S.acc.push(free[0])]);
  return pool[Math.floor(r() * pool.length)];
}
function startGift() { ask(false, { force: true, chal: { kind: 'gift', need: 1, got: 0, ok: 0 } }); }
function updateGiftBtn() { $('giftbtn').style.display = S.gift === dayKey() ? 'none' : ''; }
$('giftbtn').addEventListener('click', () => { startGame(); if (state === 'play') startGift(); });
function surprise() {
  const o = pick([['un diamant 💎', () => { S.stats.diamonds++; }], ['20 pépites 🪙', () => earn(20)], ['25 briques 🧱', () => addInv(B.BRICK, 25)], ['une potion ×2 (3 réponses) 🧪', () => { S.boost += 3; }], ['3 étoiles 🌟', () => addStars(3)]]);
  o[1](); sfx.ok(); confetti(50); toast(`🎊 Surprise ! Tu gagnes ${o[0]}`); save(); updateHud();
}

// --- vraie date : fêtes et week-end ---
const FEST = {
  easter: { id: 'easter', name: 'Pâques', icon: '🐣', pickup: 'egg', count: 12, text: 'Joyeuses Pâques ! 12 œufs sont cachés dans chaque monde : à toi de les trouver !' },
  xmas: { id: 'xmas', name: 'Noël', icon: '🎄', pickup: 'gift', count: 10, text: 'Joyeux Noël ! Des cadeaux sont cachés dans chaque monde, et il neige un peu partout.' },
  halloween: { id: 'halloween', name: 'Halloween', icon: '🎃', pickup: 'pumpkin', count: 10, tint: [1.08, .9, .82], text: 'Halloween ! Des citrouilles se cachent dans chaque monde… Bouh !' },
  summer: { id: 'summer', name: 'Été', icon: '🏖️', pickup: 'shell', count: 8, text: 'C\'est l\'été ! Cherche des coquillages sur les plages de l\'Océan.' },
};
function easterDate(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451); return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1); }
function festival() {
  const n = new Date(), y = n.getFullYear(), md = (n.getMonth() + 1) * 100 + n.getDate(), ed = Math.round((new Date(y, n.getMonth(), n.getDate()) - easterDate(y)) / 864e5);
  if (ed >= -3 && ed <= 1) return FEST.easter; if (md >= 1215 || md <= 102) return FEST.xmas; if (md >= 1025 && md <= 1101) return FEST.halloween; if (md >= 621 && md <= 905) return FEST.summer; return null;
}
function spawnFestival() {
  const f = festival(); if (!f || (f.id === 'summer' && S.world !== 'ocean')) return;
  const key = `${dayKey()}:${S.world}:${f.id}`, done = S.coll[key] || [], r = mulberry(hashStr(key));
  for (let i = 0; i < f.count; i++) { const sp = seededSpot(r); if (sp && !done.includes(i)) addPickup(f.pickup, sp[0], sp[1], sp[2], { coll: key, idx: i }); }
}
// --- la ferme produit des œufs, du lait et des fruits toutes les 10 minutes ---
function farmResources() {
  if (S.world !== 'farm' || Date.now() - (S.farmT || 0) < 600000) return; S.farmT = Date.now(); let n = 0;
  animals.filter(a => a.type === 'chick').slice(0, 2).forEach(a => { addPickup('egg', a.x + .8, landY(a.x + .8, a.z), a.z, { ttl: 900 }); n++; });
  animals.filter(a => a.type === 'cow').slice(0, 1).forEach(a => { addPickup('milk', a.x + .8, landY(a.x + .8, a.z), a.z, { ttl: 900 }); n++; });
  for (let i = 0; i < 2; i++) { const sp = nearSpot(6, 34); if (sp) { addPickup('fruit', sp[0], sp[1], sp[2], { ttl: 900 }); n++; } }
  if (n) toast('🥚 La ferme a produit des œufs, du lait et des fruits : ramasse-les !'); save();
}
function onWorldReady() {
  if (EV.cur) endEvent(); clearPickups(); EV.next = performance.now() / 1000 + 70 + Math.random() * 60;
  spawnFestival(); farmResources(); spawnFinds();
  if (Math.random() < .1 || (S.rareMiss || 0) >= 9) { spawnRare(); S.rareMiss = 0; } else S.rareMiss = (S.rareMiss || 0) + 1;
  save();
}
let helloDay = '';
function dayHello() {
  const d = dayKey(); if (helloDay === d) return; helloDay = d; let delay = 700; const say = m => { setTimeout(() => toast(m), delay); delay += 1300; };
  if (S.lastDay && S.lastDay !== d) { const gap = Math.round((new Date(d) - new Date(S.lastDay)) / 864e5); if (gap >= 3) { earn(50); S.stats.diamonds += 2; say(`🤗 Content de te revoir ! +50 🪙 +2💎 (${gap} jours déjà !)`); } }
  S.lastDay = d; ensureQuests(); const f = festival(); if (f) say(`${f.icon} ${f.text}`);
  if (isWeekend()) say('🎉 Week-end : le défi éclair rapporte le double !');
  const dw = dailyWorld(); say(`🌍 Monde du jour : ${WORLDS[dw].emoji} ${WORLDS[dw].name} (étoiles ×2) · 📜 3 quêtes t'attendent !`);
  save(); updateHud(); updateGiftBtn();
}
let liveT = 0;
function updateLive(dt, t) {
  updatePickups(dt, t); updateFloaters(dt); tutoTick();
  if (EV.cur && EV.cur.tick) EV.cur.tick(dt, t);
  liveT += dt; if (liveT < 1) return; liveT = 0;
  if (state !== 'play') return;
  findHints(); petMood();
  const wet = WX.type === 'rain' || WX.type === 'storm';
  if (EV.prevWet && !wet && !EV.cur && !curCfg().indoor && Math.random() < .6) startEvent('rainbow');
  EV.prevWet = wet;
  if (EV.cur) { showBanner(); if (t >= EV.cur.until) endEvent(); } else if (t > EV.next && !chal) tryStartEvent(t);
  updateFauna(); farmResources(); ensureQuests();
}


// ---------- Nouveautés : l'historique des versions ----------
const CHANGELOG = [
  { v: '1.13', t: 'Tutoriel et grande carte', items: ['🎓 Un tutoriel pas à pas apprend à jouer : avancer, regarder, sauter, casser, poser, prendre une photo, répondre à une question, ouvrir la pause. Il se relance avec « Comment jouer ? ».', '🗺️ Touche la mini-carte (ou la touche N) pour voir la grande carte de tout le monde.', '🐾 Les animaux coincés dans des blocs ou des trous se dégagent tout seuls.'] },
  { v: '1.12', t: 'Boutons et icônes refaits', items: ['🎨 Tous les boutons ont le même relief et s\'enfoncent quand on appuie ; la couleur dit leur rôle (vert = principal, ambre = cadeau et casser, bleu = question).', '🖼️ Nouvelles icônes dessinées, les mêmes sur la télé, le jeu et la manette.', '📱 Les boutons de rotation ont disparu : on tourne en glissant le doigt.', '⌨️ Un contour jaune montre le bouton choisi au clavier.'] },
  { v: '1.11', t: 'S\'entraîner quand c\'est dur', items: ['🔁 Si tu te trompes souvent, les questions arrivent plus vite pour t\'aider à t\'entraîner.', '♻️ Les mêmes calculs ratés reviennent régulièrement, jusqu\'à ce que tu les saches.', '🌟 Quand tu progresses, le jeu revient au rythme normal.'] },
  { v: '1.10', t: 'Un menu plus simple', items: ['🎒 La pause est plus claire : 4 grands onglets (Mon aventure, Collections, Marchand, Sons) au lieu de 9.', '👨‍👩‍👧 Le niveau et les réglages des questions sont maintenant choisis par les parents, dans l\'Espace parent.', '🏠 Le menu ne garde que l\'essentiel : choisir son monde et jouer.'] },
  { v: '1.9', t: 'Le jeu sur la TV', items: ['📺 Mode TV : affiche le jeu sur la télé (ordinateur branché, Chromecast, navigateur de la TV…) et joue avec ton téléphone comme manette.', '📱 Le téléphone affiche un joystick, les boutons, les menus et les questions : tu réponds sur le téléphone, le calcul reste sur la télé.', '🔗 Scanne le QR code ou tape le code à 4 lettres pour relier les deux.'] },
  { v: '1.8', t: 'À cheval !', items: ['🏇 Monte ton compagnon (touche R ou bouton 🐴) : chevaux, lions, moutons, cochons, vaches, zèbres, girafes… vont plus vite et sautent plus haut.', '🥕 Il faut d\'abord le dresser : 3 bonnes réponses d\'affilée, données calmement.', '💖 Ton compagnon a une humeur : content quand tu réponds bien, triste quand tu réponds trop vite ou faux. Un compagnon très heureux court encore plus vite.', '🐱 Les petits compagnons (chat, chien, hibou, poussin…) ne se montent pas.'] },
  { v: '1.7', t: 'Réfléchis avant de répondre', items: ['🧐 Une réponse donnée trop vite (avant d\'avoir pu lire) ne rapporte plus ni pépites ni étoiles, et ne compte pas dans ta série.', '✍️ Après deux erreurs d\'affilée, tu recopies la bonne réponse (avec une astuce) puis tu respires 10 secondes.', '🤠 Nouveau monde : le Far West, avec des canyons, des cactus et plein de chevaux (cheval pie, étalon noir, cheval doré rare).', '🏇 Il se débloque en répondant avec soin : 50 réponses réussies du premier coup, sans te précipiter, avec au moins 80 % de réussite récente.', '🎩 Chapeau et foulard de cow-boy en vente chez le marchand, et 5 nouvelles trouvailles.'] },
  { v: '1.6', t: 'Trouvailles', items: ['🔎 35 objets cachés dans les 7 mondes : communs, peu communs, rares et légendaires.', '🏔️ Plus un objet est rare, plus il est loin, haut ou enterré : les légendaires se creusent !', '🔥 Jeu du chaud / froid pour retrouver les objets rares.', '🎁 Offre tes trouvailles à ton compagnon : l\'objet flotte à côté de lui.', '🏅 Une médaille et 5 💎 quand tu as tout trouvé dans un monde.'] },
  { v: '1.5', t: 'Photos et compagnons', items: ['📷 Prends les animaux en photo (touche C ou bouton 📷) pour les ajouter à ton album, avec leur portrait.', '🛒 Les animaux photographiés sont en vente chez le marchand.', '🐾 Un seul compagnon te suit : les autres t\'attendent à la maison, tu peux les échanger.', '🎩 Chaque compagnon garde ses accessoires, et tu peux en cumuler (chapeau + lunettes + écharpe…).', '⏱️ Les messages restent plus longtemps à l\'écran.'] },
  { v: '1.4', t: 'Un monde qui vit', items: ['🌈 Événements surprise : trésor flash, marchand ambulant, étoiles filantes, aurore boréale…', '✨ Animaux rares à apprivoiser, animaux de nuit et de pluie.', '📖 Album des animaux, 3 quêtes par jour, monde et cadeau du jour.', '🎃 Fêtes selon la vraie date : Pâques, Halloween, Noël, été.', '🪙 La monnaie du jeu devient la pépite.', '🐾 Les compagnons ne se superposent plus.'] },
  { v: '1.3', t: 'Mieux retenir', items: ['🔁 Une opération ratée revient plus souvent, jusqu\'à ce qu\'elle soit retenue.', '⛶ Plein écran sur mobile et jeu installable sur l\'écran d\'accueil.', '↩ Bouton « Plus tard » pour quitter un défi sans pénalité.'] },
  { v: '1.2', t: 'Marchand, océan, neige et grotte', items: ['🧑‍🌾 Le marchand : il faut donner la somme exacte pour recevoir son produit.', '🐶 Compagnons avec nom et accessoires.', '🏝️ Trois nouveaux mondes : l\'Océan, la Neige et la Grotte.', '🌧️ Météo, sons d\'ambiance et musique.'] },
  { v: '1.1', t: 'Pour les parents', items: ['👨‍👩‍👧 Espace parent protégé par un code : progrès, erreurs, temps de jeu, limite quotidienne.', '👦 Plusieurs enfants sur le même appareil.', '🎓 Niveaux scolaires CP, CE1, CE2, CM1, CM2 et révision du jour.'] },
  { v: '1.0', t: 'Le début de l\'aventure', items: ['⛏️ Un monde de blocs en 3D à explorer et à construire, sur ordinateur et mobile.', '🎁 Des questions de maths pour gagner étoiles, diamants et coffres.', '🐄 Les mondes de la Ferme, de la Jungle, de la Savane et des Montagnes.'] },
];
const VERSION = CHANGELOG[0].v;
function openNews() {
  // seules les versions pas encore vues s'affichent (au minimum la dernière) ; l'historique complet reste dans CHANGELOG.md
  const seen = CHANGELOG.findIndex(c => c.v === S.seenVer), fresh = seen < 0 ? 1 : seen;
  $('newscard').innerHTML = `<h1 class="ttl">🆕 Nouveautés</h1><p class="sub">Version ${VERSION}</p>` + CHANGELOG.slice(0, Math.max(fresh, 1)).map((c, i) =>
    `<h3>Version ${c.v} · ${c.t} ${i < fresh ? '<span class="newtag">Nouveau !</span>' : ''}</h3><ul class="news">${c.items.map(x => `<li>${x}</li>`).join('')}</ul>`).join('') +
    '<div class="row"><button id="news-ok" class="btn green">J\'ai compris</button></div>';
  $('news-ok').onclick = () => show('news', false);
  S.seenVer = VERSION; save(); $('newsdot').style.display = 'none'; show('news', true);
}
$('open-news').addEventListener('click', openNews);
$('newsdot').style.display = S.seenVer === VERSION ? 'none' : 'inline';

// ---------- Mode TV : le jeu s'affiche sur l'écran, le téléphone sert de manette ----------
// Le téléphone (manette.html) se connecte directement à la TV en WebRTC (PeerJS) ; seul le code de jumelage passe par le serveur de mise en relation de PeerJS.
const TVMODE = /[?&]tv\b/.test(location.search);
const TV = { peer: null, conn: null, code: '', last: 0, sent: '', sentAt: 0 };
const loadScript = src => new Promise((ok, ko) => { const e = document.createElement('script'); e.src = src; e.onload = ok; e.onerror = ko; document.head.appendChild(e); });
const TV_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sans 0/O ni 1/I pour éviter les confusions
function tvPairUi() {
  const url = new URL('manette.html', location.href); url.searchParams.set('c', TV.code);
  $('tvcode').textContent = TV.code; $('tvurl').textContent = url.host + url.pathname.replace(/[^/]*$/, '') + 'manette.html';
  try { const qr = qrcode(0, 'M'); qr.addData(url.href); qr.make(); $('tvqr').innerHTML = qr.createSvgTag(6, 2); } catch (e) { $('tvqr').textContent = ''; }
  $('tvstatus').textContent = '⏳ En attente du téléphone…';
}
function tvConnected(on) {
  $('tvbadge').classList.toggle('on', on); $('tvbadge').classList.remove('hidden');
  if (on) { show('tvpair', false); toast('📱 Manette connectée !'); sfx.ok(); TV.sent = ''; }
  else { joy.x = joy.y = 0; keys.Space = keys.ShiftLeft = false; $('tvstatus').textContent = '📵 Manette déconnectée : rescanne le QR code.'; toast('📵 Manette déconnectée'); show('tvpair', true); }
}
function tvStart() {
  if (TV.peer) TV.peer.destroy();
  TV.code = Array.from({ length: 4 }, () => TV_ALPHA[Math.floor(Math.random() * TV_ALPHA.length)]).join('');
  const peer = TV.peer = new Peer('mathcraft-' + TV.code);
  peer.on('open', tvPairUi);
  peer.on('error', e => { if (e.type === 'unavailable-id') tvStart(); else $('tvstatus').textContent = '⚠️ Connexion impossible (' + e.type + ') : vérifie Internet.'; });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  peer.on('connection', c => {
    if (TV.conn) TV.conn.close(); TV.conn = c;
    c.on('open', () => tvConnected(true)); c.on('data', tvData);
    c.on('close', () => { if (TV.conn === c) { TV.conn = null; tvConnected(false); } });
  });
}
function tvData(m) {
  TV.last = performance.now();
  if (m.t === 'in') {
    joy.x = clamp(+m.s || 0, -1, 1); joy.y = clamp(+m.f || 0, -1, 1); keys.Space = !!m.j; keys.ShiftLeft = !!m.sp;
    if (state === 'play') { P.yaw -= (+m.dx || 0) * .0055; P.pitch = clamp(P.pitch - (+m.dy || 0) * .0055, -1.55, 1.55); }
  } else if (m.t === 'b') tvButton(String(m.k));
}
function tvButton(k) {
  if (state === 'menu') { if (k === 'play') startGame(); else if (k.startsWith('w:') && WORLDS[k.slice(2)] && worldOpen(k.slice(2))) { k.slice(2) === S.world ? startGame() : switchWorld(k.slice(2), true); } return; }
  if (state === 'question') {
    if (k.startsWith('a:')) { const b = !revealed && !guided && $('qchoices').children[+k.slice(2)]; if (b && !b.classList.contains('bad')) b.click(); }
    else if (k.startsWith('t:')) { const v = k.slice(2).replace(/\D/g, ''); if (v && !$('qtyped').classList.contains('hidden')) { $('qinput').value = v; $('qsubmit').click(); } }
    else if (k === 'ok' && revealed && !guided && !$('qok').classList.contains('hidden')) $('qok').click();
    else if (k === 'later' && chal) $('qlater').click();
    return;
  }
  if (state === 'map') { if (k === 'map') closeMap(); return; }
  if (state === 'pause') { if (k === 'resume') resume(); else if (k === 'settings') $('settings').click(); return; }
  if (state !== 'play') return;
  if (k === 'break') { updateTarget(); actBreak(); } else if (k === 'place') { updateTarget(); actPlace(); }
  else if (k === 'map') openMap(); else if (k === 'photo') takePhoto(); else if (k === 'ride') toggleRide(); else if (k === 'ask') ask(false); else if (k === 'pause') pauseGame();
  else if (k === 'next') selectSlot((sel + 1) % 9); else if (k === 'prev') selectSlot((sel + 8) % 9);
}
// ce que le téléphone doit afficher (question, menu, boutons) : renvoyé seulement quand ça change
function tvSnapshot() {
  const o = { st: state, riding, ride: rideable(activePet()) };
  if (state === 'menu') o.worlds = WORLD_ORDER.map(k => ({ k, e: WORLDS[k].emoji, n: WORLDS[k].name, ok: worldOpen(k), cur: k === S.world }));
  if (state === 'question') o.q = { title: $('qtitle').textContent, text: $('qtext').textContent, fb: $('qfb').innerText, later: !!chal,
    ch: S.mode === 'choice' && !guided && !revealed ? [...$('qchoices').children].map(b => ({ v: b.dataset.v, bad: b.classList.contains('bad') })) : null,
    typed: !$('qtyped').classList.contains('hidden'), ok: revealed && !guided && !$('qok').classList.contains('hidden') };
  return o;
}
if (TVMODE) {
  document.body.classList.add('tv');
  Promise.all([loadScript('lib/peerjs.min.js'), loadScript('lib/qrcode.js')]).then(tvStart).catch(() => { $('tvstatus').textContent = '⚠️ Impossible de charger la connexion.'; });
  show('tvpair', true); $('tvbadge').classList.remove('hidden');
  $('tvok').onclick = () => show('tvpair', false); $('tvbadge').onclick = () => show('tvpair', true);
  setInterval(() => {
    if (!TV.conn || !TV.conn.open) return;
    const now = performance.now(), str = JSON.stringify(tvSnapshot());
    if (str !== TV.sent || now - TV.sentAt > 3000) { TV.sent = str; TV.sentAt = now; TV.conn.send({ t: 'st', s: JSON.parse(str) }); }
    if (now - TV.last > 2500) { joy.x = joy.y = 0; keys.Space = keys.ShiftLeft = false; }   // plus de nouvelles du téléphone : on arrête de bouger
  }, 250);
}

// ---------- Tutoriel : apprendre à jouer, pas à pas ----------
// Un bandeau guide l'enfant ; chaque étape se valide quand l'action est faite. Au premier lancement, ou via « Comment jouer ? » dans le menu.
const TUTO = { on: false, i: 0, x0: 0, z0: 0, yaw0: 0, paused: false };
const tuch = () => IS_TOUCH || TVMODE;   // commandes tactiles (ou manette du téléphone)
const TSTEPS = [
  { t: () => tuch() ? 'Avance avec le joystick, à gauche de l\'écran 🕹️' : 'Avance avec les touches Z Q S D (ou W A S D) 🚶', poll: () => Math.hypot(P.x - TUTO.x0, P.z - TUTO.z0) > 5 },
  { t: () => tuch() ? 'Glisse ton doigt sur l\'écran pour regarder autour de toi 👀' : 'Bouge la souris pour regarder autour de toi 👀 (ou utilise les flèches du clavier)', poll: () => Math.abs(P.yaw - TUTO.yaw0) > 1.2 },
  { t: () => tuch() ? 'Appuie sur le bouton vert pour sauter ⬆️' : 'Appuie sur la barre Espace pour sauter ⬆️', hl: 't-jump', ev: 'jump' },
  { t: () => tuch() ? 'Casse un bloc : touche-le du doigt ⛏️' : 'Casse un bloc : vise-le et fais un clic gauche ⛏️', hl: 't-mode', ev: 'break' },
  { t: () => tuch() ? 'Pose un bloc : touche le bouton orange pour passer en mode 🧱, puis touche l\'écran' : 'Pose un bloc : vise un endroit et fais un clic droit 🧱 (touches 1 à 9 pour choisir le bloc)', hl: 't-mode', ev: 'place' },
  { t: () => tuch() ? 'Prends l\'animal en photo : vise-le au centre, puis appuie sur 📷' : 'Prends l\'animal en photo : vise-le au centre, puis appuie sur C 📷', hl: 'photo', ev: 'photo', start: () => tutoAnimal() },
  { t: () => 'Réponds à une question magique : choisis la bonne réponse 🎁', ev: 'question', start: () => tutoQuestion() },
  { t: () => tuch() ? 'Ouvre la pause avec le bouton ⏸, puis reprends la partie' : 'Appuie sur Échap pour ouvrir la pause, puis reprends la partie ⏸', hl: 't-pause', ev: 'resume' },
  { t: () => 'Bravo, tu sais jouer ! 🎉 Pour la suite : réponds aux questions pour gagner des pépites 🪙, achète des compagnons 🐾 chez le marchand 🛒 (donne la somme exacte !), photographie tous les animaux 📖 et cherche les trouvailles cachées 🔎.', end: true },
];
function tutoShow() {
  const s = TSTEPS[TUTO.i], n = TSTEPS.length;
  $('coach-t').textContent = s.t(); $('coach-n').textContent = s.end ? '🎓 Tutoriel terminé' : `🎓 Étape ${TUTO.i + 1} sur ${n - 1}`;
  $('coach-dots').innerHTML = TSTEPS.slice(0, -1).map((_, k) => `<i class="${k < TUTO.i ? 'done' : k === TUTO.i ? 'cur' : ''}"></i>`).join('');
  show('coach-ok', !!s.end); show('coach-skip', !s.end);
  document.querySelectorAll('.hl').forEach(e => e.classList.remove('hl')); if (s.hl && $(s.hl)) $(s.hl).classList.add('hl');
  const c = $('coach'); c.classList.remove('hidden', 'pop'); void c.offsetWidth; c.classList.add('pop');
  if (s.start) s.start();
}
function startTuto() {
  Object.assign(TUTO, { on: true, i: 0, x0: P.x, z0: P.z, yaw0: P.yaw, paused: false }); nextQ = 1e9; tutoShow();
}
function tutoNext() {
  if (!TUTO.on) return; sfx.ok(); TUTO.i++; Object.assign(TUTO, { x0: P.x, z0: P.z, yaw0: P.yaw }); tutoShow();
}
function endTuto(done) {
  TUTO.on = false; show('coach', false); document.querySelectorAll('.hl').forEach(e => e.classList.remove('hl')); nextQ = nextGap();
  if (done && !S.tutoDone) { earn(10); confetti(60); toast('🎓 Tutoriel terminé ! +10 🪙'); }
  S.tutoDone = true; checkAch(); save();
}
function tutoEvent(name) { const s = TSTEPS[TUTO.i]; if (TUTO.on && s && s.ev === name) tutoNext(); }
function tutoTick() { const s = TSTEPS[TUTO.i]; if (TUTO.on && state === 'play' && s && s.poll && s.poll()) tutoNext(); }
function tutoAnimal() {   // un animal doux juste devant soi, pour la photo
  const sp = nearSpot(4, 7); if (!sp) return;
  const a = newAnimal('pig', sp[0], sp[1], sp[2]); animals.push(a);
  P.yaw = Math.atan2(-(a.x - P.x), -(a.z - P.z)); P.pitch = -.05;
}
function tutoQuestion() { setTimeout(() => { if (UNLOCK_ALL) return tutoEvent('question'); if (TUTO.on && state === 'play') ask(false, { force: true, chal: { kind: 'tuto', need: 1, got: 0, ok: 0, queue: [buildQ('add', 2, 3, false)] } }); }, 600); }
$('coach-skip').addEventListener('click', () => endTuto(false));
$('coach-ok').addEventListener('click', () => endTuto(true));
$('open-tuto').addEventListener('click', () => { startGame(); if (state === 'play' && !TUTO.on) startTuto(); });

// ---------- Grande carte : toucher la mini-carte (ou touche N) pour voir tout le monde ----------
const BM = 6, bmc = $('bmc'), bmx = bmc.getContext('2d'); bmc.width = W * BM; bmc.height = D * BM;
const bmTerrain = document.createElement('canvas'); bmTerrain.width = W; bmTerrain.height = D;
let bmTimer = 0;
function bmBuild() {   // le relief vu de dessus, calculé à l'ouverture
  const tx = bmTerrain.getContext('2d'), img = tx.createImageData(W, D), d = img.data, top0 = curCfg().indoor ? Math.min(H - 1, Math.floor(P.y) + 5) : H - 1;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    let y = top0; while (y > 0 && !get(x, y, z)) y--;
    const b = get(x, y, z), base = mmCol[b] || [120, 120, 120], f = clamp(.7 + (y - 14) * .018, .5, 1.15), k = (z * W + x) * 4;
    d[k] = base[0] * f; d[k + 1] = base[1] * f; d[k + 2] = base[2] * f; d[k + 3] = 255;
  }
  tx.putImageData(img, 0, 0);
}
function bmDot(x, z, col, r) { const cx = x * BM, cy = z * BM; bmx.beginPath(); bmx.arc(cx, cy, r, 0, 6.283); bmx.fillStyle = '#000'; bmx.fill(); bmx.beginPath(); bmx.arc(cx, cy, r - 1.5, 0, 6.283); bmx.fillStyle = col; bmx.fill(); }
function bmDraw() {   // marqueurs et joueur : redessinés régulièrement pendant que la carte est ouverte
  bmx.imageSmoothingEnabled = false; bmx.drawImage(bmTerrain, 0, 0, W * BM, D * BM);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {   // coffres et blocs « ? » visibles
    let y = H - 1; while (y > 0 && !get(x, y, z)) y--; const b = get(x, y, z);
    if (b === B.CHEST) { const sp = EV.chest && EV.chest.x === x && EV.chest.z === z; bmDot(x + .5, z + .5, sp ? '#ff4d4d' : '#ffd43b', sp ? 8 : 6); } else if (b === B.LUCKY) bmDot(x + .5, z + .5, '#fff3a0', 5);
  }
  pickups.forEach(p => { if (!(p.find && p.find.rar)) bmDot(p.x, p.z, '#ffe066', 4); });
  animals.forEach(a => { const m = a.type === 'merchant' || a.type === 'tmerchant'; bmDot(a.x, a.z, m ? '#ff9f1c' : a.rare ? '#c77dff' : a.pet ? '#ff6fa8' : '#fff', m || a.rare ? 8 : 4); });
  bmx.save(); bmx.translate(P.x * BM, P.z * BM); bmx.rotate(-P.yaw); bmx.beginPath(); bmx.moveTo(0, -13); bmx.lineTo(9, 9); bmx.lineTo(0, 4); bmx.lineTo(-9, 9); bmx.closePath();
  bmx.fillStyle = '#fff'; bmx.strokeStyle = '#000'; bmx.lineWidth = 3; bmx.stroke(); bmx.fill(); bmx.restore();
}
function openMap() {
  if (state !== 'play') return;
  state = 'map'; if (document.pointerLockElement) document.exitPointerLock();
  Object.assign(keys, { Space: false, ShiftLeft: false, down: false }); joy.x = joy.y = 0; syncJoy();
  bmBuild(); bmDraw(); show('bigmap', true); clearInterval(bmTimer); bmTimer = setInterval(bmDraw, 600);
}
function closeMap() { if (state !== 'map') return; clearInterval(bmTimer); show('bigmap', false); resume(); }
$('minimap').addEventListener('click', e => { e.stopPropagation(); openMap(); });
$('minimap').addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
$('minimap').addEventListener('mousedown', e => e.stopPropagation());
$('bmclose').addEventListener('click', closeMap);
$('bigmap').addEventListener('click', e => { if (e.target === $('bigmap')) closeMap(); });

// ---------- Synchronisation : retrouver sa progression sur un autre appareil ----------
// Un « code famille » secret (24 caractères au hasard) tient lieu de compte : pas d'e-mail ni de mot de passe.
// Le serveur (dossier worker/, Cloudflare gratuit) fusionne les sauvegardes en gardant, pour chaque joueur, la plus avancée.
// Ni le code PIN parent ni les photos ne sont envoyés.
const SYNC_URL = window.MC_SYNC_URL || '';   // adresse du serveur, à renseigner après son déploiement (voir worker/README.md)
const SYNC_KEY = PFX + 'mathcraft-sync';
let SYNC = null; try { SYNC = JSON.parse(localStorage.getItem(SYNC_KEY)); } catch (e) {}
const syncStore = () => { try { SYNC ? localStorage.setItem(SYNC_KEY, JSON.stringify(SYNC)) : localStorage.removeItem(SYNC_KEY); } catch (e) {} };
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 32 signes, sans I ni O (pas de confusion avec 1 et 0)
const newCode = () => [...crypto.getRandomValues(new Uint8Array(24))].map(b => CODE_CH[b % 32]).join('');
const showCode = c => c.match(/.{1,6}/g).join('-');
const cleanCode = v => String(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
const progress = d => ((d && d.stats && d.stats.ok) || 0) + ((d && d.stats && d.stats.ko) || 0);
function syncPayload() {
  save();
  const list = REG.list.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })), profiles = {};
  REG.list.forEach(p => { const c = clone(p.id === REG.cur ? S : loadProfile(p.id)); delete c.photos; delete c.name; delete c.pin; profiles[p.id] = c; });
  return { reg: { list }, profiles };
}
// applique la sauvegarde du serveur : un joueur n'est remplacé que si la version distante est plus avancée
function syncApply(r) {
  let changed = false;
  for (const rp of (r.reg && r.reg.list) || []) {
    const rd = r.profiles && r.profiles[rp.id]; if (!rd) continue;
    const lp = REG.list.find(p => p.id === rp.id);
    if (!lp) { REG.list.push({ id: rp.id, name: rp.name || '', avatar: rp.avatar || '🦊' }); saveProfile(rp.id, rd); changed = true; continue; }
    if (!lp.name && rp.name) { lp.name = rp.name; changed = true; }
    const ld = lp.id === REG.cur ? S : loadProfile(lp.id);
    if (progress(rd) > progress(ld)) {
      saveProfile(lp.id, Object.assign({}, rd, { photos: ld.photos || {} })); changed = true;
      if (lp.id === REG.cur) { const n = loadSave(keyOf(lp.id)); Object.keys(S).forEach(k => delete S[k]); Object.assign(S, n); }
    }
    if (lp.id === REG.cur) S.name = lp.name;
  }
  if (changed) { saveReg(); save(); updateWho(); buildMenu(); }
  return changed;
}
let syncT = 0;
async function syncNow(force) {
  if (!SYNC || !SYNC_URL || (!force && Date.now() - syncT < 60000)) return false;
  syncT = Date.now();
  try {
    const r = await fetch(`${SYNC_URL}/s/${SYNC.code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(syncPayload()) });
    if (!r.ok) return false;
    const d = await r.json(); if (state !== 'play') syncApply(d);   // jamais de changement en pleine partie
    SYNC.last = Date.now(); syncStore(); return true;
  } catch (e) { return false; }
}
async function syncEnable() { SYNC = { code: newCode() }; syncStore(); const ok = await syncNow(true); if (!ok) { SYNC = null; syncStore(); } return ok; }
// rejoint un code existant : renvoie '' si tout va bien, sinon le message d'erreur
async function syncJoin(raw) {
  const code = cleanCode(raw); if (code.length < 20) return 'Le code est trop court : vérifie-le.';
  try {
    const r = await fetch(`${SYNC_URL}/s/${code}`);
    if (r.status === 404) return 'Code inconnu : vérifie-le ou crée-en un depuis l\'autre appareil.';
    if (!r.ok) return 'Le serveur ne répond pas, réessaie plus tard.';
    SYNC = { code }; syncStore(); syncApply(await r.json());
    await syncNow(true); return '';
  } catch (e) { return 'Pas de connexion : réessaie quand tu es en ligne.'; }
}
async function syncErase() {
  if (!SYNC) return true;
  try { const r = await fetch(`${SYNC_URL}/s/${SYNC.code}`, { method: 'DELETE' }); if (!r.ok) return false; } catch (e) { return false; }
  SYNC = null; syncStore(); return true;
}
const syncAgo = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'à l\'instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; };
// bloc « Synchronisation » de l'Espace parent
function syncHtml() {
  if (!SYNC_URL) return `<h3>Autre appareil</h3><p class="gnext">La synchronisation n'est pas encore activée sur cette version. En attendant, « Exporter » / « Importer » ci-dessus permettent de copier la progression.</p>`;
  if (!SYNC) return `<h3>Autre appareil</h3><div class="row"><button class="btn green" id="sync-on">${ICON('phone')} Activer la synchronisation</button><button class="btn" id="sync-join">J'ai déjà un code</button></div>
    <div id="sync-joinbox" class="row hidden"><input id="sync-code" class="wname" placeholder="Code famille" autocomplete="off" autocapitalize="characters"><button class="btn green" id="sync-go">Récupérer</button></div>
    <p id="sync-msg" class="gnext">Un code famille permet de retrouver la progression sur un autre appareil. Il ne contient aucune donnée personnelle.</p>`;
  return `<h3>Autre appareil</h3><p class="gnext">Code famille à saisir sur l'autre appareil (Espace parent → Données → « J'ai déjà un code ») :</p>
    <div class="row"><b id="sync-show" class="synccode">${showCode(SYNC.code)}</b><button class="btn" id="sync-copy">Copier</button></div>
    <div class="row"><button class="btn" id="sync-now">Synchroniser maintenant</button><button class="btn" id="sync-off">Arrêter ici</button><button class="btn danger" id="sync-del">Effacer les données en ligne</button></div>
    <p id="sync-msg" class="gnext">${SYNC.last ? 'Dernière synchronisation : ' + syncAgo(SYNC.last) + '.' : 'Pas encore synchronisé.'} Ne partagez ce code qu'avec votre famille.</p>`;
}
function syncBind() {
  const on = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  const msg = t => { const m = $('sync-msg'); if (m) m.textContent = t; };
  on('sync-on', async () => { msg('Activation…'); (await syncEnable()) ? renderParent(viewId) : msg('Impossible de joindre le serveur : réessayez en ligne.'); });
  on('sync-join', () => { show('sync-joinbox', true); $('sync-code').focus(); });
  on('sync-go', async () => {
    if (progress(S) > 0 && !confirm('Cet appareil contient déjà une progression. Pour chaque joueur, la progression la plus avancée sera gardée. Continuer ?')) return;
    msg('Connexion…'); const e = await syncJoin($('sync-code').value); e ? msg(e) : renderParent(viewId); });
  on('sync-copy', () => { try { navigator.clipboard.writeText(showCode(SYNC.code)); msg('Code copié.'); } catch (e) { msg('Copie impossible : recopiez-le à la main.'); } });
  on('sync-now', async () => { msg('Synchronisation…'); (await syncNow(true)) ? renderParent(viewId) : msg('Échec : vérifiez la connexion.'); });
  on('sync-off', () => { if (confirm('Arrêter la synchronisation sur cet appareil ? Les données en ligne restent disponibles avec le code.')) { SYNC = null; syncStore(); renderParent(viewId); } });
  on('sync-del', async () => { if (!confirm('Effacer toutes les données en ligne de ce code famille ? Les appareils gardent leur progression locale.')) return; (await syncErase()) ? renderParent(viewId) : msg('Échec : vérifiez la connexion.'); });
}
document.addEventListener('visibilitychange', () => { if (document.hidden) syncNow(); });
setInterval(() => { if (state === 'play') syncNow(); }, 180000);
if (SYNC) setTimeout(() => syncNow(true), 1500);

// ---------- Démarrage ----------
applyLook(); if (!S.visited.includes(S.world)) S.visited.push(S.world); generate(); buildAll(); spawnAnimals(); buildHotbar(); drawCube($('hand').firstChild, HOTBAR[sel]); buildMenu(); if (!S.mission) S.mission = newMission(); updateHud();
updateWho();
{ let skip = false; try { skip = sessionStorage.getItem('mc-skip') === '1'; } catch (e) {}
  if (REG.list.length === 1 && !REG.list[0].name && S.stats.ok === 0) showWho('first');
  else if (REG.list.length > 1 && !skip) showWho(); }
requestAnimationFrame(frame);
window.MC = { syncEnable, syncJoin, syncNow, syncErase, get SYNC() { return SYNC; }, EV, startEvent, endEvent, ensureQuests, quest, festival, dailyWorld, spawnRare, updateFauna, startTame, albumHtml, questsHtml, giftPrize, startGift, takePhoto, joy, keys, TV, tvButton, toggleRide, petJoy, get riding() { return riding; }, careAdd, minThink, spawnFinds, FINDS, addPet, setActivePet, onWorldReady, farmResources, dayHello, collectPickup, addPickup, get pickups() { return pickups; }, markMet, spawnPets, makePet, learnWrong, learnRight, LEARN_GAPS, WX, setWeather, Snd, sndStart, updateSound, spawnAnimals, openMarket, startReview, makeReviewQueue, applyLevel, REG, showWho, openParent, renderParent, today, switchWorld, WORLDS, S, startChest, startFlash, renderPause, get chal() { return chal; }, get curQ() { return curQ; }, get nextQ() { return nextQ; }, struggle, get guided() { return guided; }, get badRun() { return badRun; }, get, get animals() { return animals; }, updateAnimals, ask, S, P, makeQuestion, makeChoices, get state() { return state; }, setBlock };
})();
