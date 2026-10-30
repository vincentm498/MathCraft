'use strict';
(() => {
/* =====================================================================
   MathCraft — un petit Minecraft pour apprendre les maths
   ===================================================================== */

// ---------- Réglages & sauvegarde ----------
const REG_KEY = 'mathcraft-profiles';
const keyOf = id => id === 'p1' ? 'mathcraft-v1' : 'mathcraft-v1-' + id;   // 'p1' garde l'ancienne clé : rien n'est perdu
function loadReg() {
  try { const r = JSON.parse(localStorage.getItem(REG_KEY)); if (r && r.list && r.list.length) return r; } catch (e) {}
  let old = null; try { old = JSON.parse(localStorage.getItem('mathcraft-v1')); } catch (e) {}
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
  level: 'libre', wallet: 0, boost: 0, review: {}, market: { ok: 0, ko: 0 }, locks: {}, acc: [], inv: {}, builds: {}, snd: { music: true, amb: true },
};
const clone = o => JSON.parse(JSON.stringify(o));
function loadSave(key = SAVE_KEY) {
  try {
    const o = JSON.parse(localStorage.getItem(key));
    const s = clone(DEFAULTS);
    if (o) { Object.assign(s, o); s.ops = Object.assign(clone(DEFAULTS.ops), o.ops); s.stats = Object.assign(clone(DEFAULTS.stats), o.stats); }
    s.pets = (s.pets || []).map(p => typeof p === 'string' ? { t: p, name: '', acc: null } : p);
    return s;
  } catch (e) { return clone(DEFAULTS); }
}
const S = loadSave();
S.name = REG.list.find(p => p.id === REG.cur).name;
saveReg();
function loadProfile(id) { const d = loadSave(keyOf(id)); d.name = (REG.list.find(p => p.id === id) || {}).name || ''; return d; }
const saveProfile = (id, d) => { try { localStorage.setItem(keyOf(id), JSON.stringify(d)); } catch (e) {} };
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} };

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = c => (c / 100).toFixed(2).replace('.', ',') + ' €';
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
  place: () => tone(160, .08, 'square', .06),
  oink: () => { tone(260, .09, 'sawtooth', .05); tone(200, .12, 'sawtooth', .05, .08); },
  animal: t => { const m = { dog: [300, 'sawtooth', .09, 2, 200], cat: [820, 'triangle', .22, 1, 560], sheep: [280, 'sawtooth', .3, 2, 250], cow: [130, 'sawtooth', .5, 1, 110], monkey: [600, 'sine', .15, 3, 420], parrot: [1900, 'sine', .08, 3, 2300], lion: [110, 'sawtooth', .6, 1, 80], elephant: [320, 'sawtooth', .45, 1, 260], dolphin: [1500, 'sine', .1, 3, 2000], penguin: [700, 'square', .1, 2, 600], slime: [200, 'sine', .15, 2, 330], bat: [3000, 'sine', .05, 3, 3500], horse: [420, 'sawtooth', .3, 2, 300], crab: [900, 'square', .04, 3, 700] }[t]; if (!m) return sfx.oink(); for (let i = 0; i < m[3]; i++) tone(i % 2 ? m[4] : m[0], m[2], m[1], .05, i * m[2] * .8); },
  coin: () => { tone(1568, .07, 'square', .045); tone(2093, .14, 'square', .045, .06); },
  ask: () => [659, 784, 659, 988].forEach((f, i) => tone(f, .15, 'triangle', .08, i * .1)),
};

// ---------- Blocs & textures procédurales ----------
const W = 96, D = 96, H = 40, CS = 16; let SEA = 16;
const B = { GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5, SAND: 6, PLANKS: 7, BRICK: 8, GLASS: 9, DIAMOND: 10, LUCKY: 11, SNOW: 12, RED: 13, BLUE: 14, YELLOW: 15, WATER: 16, CHEST: 17, CHESTOPEN: 18, JGRASS: 19, JWOOD: 20, JLEAVES: 21, SGRASS: 22, ACACIA: 23, ALEAVES: 24, REDSAND: 25, DROCK: 26, GRAVEL: 27, SPRUCE: 28, ICE: 29, CRYSTAL: 30, CRYSTAL2: 31 };
const GLOW = new Set([30, 31]);
const BLOCKS = {
  1: { t: [0, 1, 2], c: 0x5fb03c }, 2: { t: [2, 2, 2], c: 0x866043 }, 3: { t: [3, 3, 3], c: 0x7d7d7d },
  4: { t: [5, 4, 5], c: 0x66492d }, 5: { t: [6, 6, 6], c: 0x328228 }, 6: { t: [7, 7, 7], c: 0xdecf96 },
  7: { t: [8, 8, 8], c: 0xb48c50 }, 8: { t: [9, 9, 9], c: 0xaa3c32 }, 9: { t: [10, 10, 10], c: 0xc8e6f0 },
  10: { t: [11, 11, 11], c: 0x5af0e6 }, 11: { t: [12, 12, 12], c: 0xf0c828 }, 12: { t: [13, 13, 2], c: 0xf0f5fa },
  13: { t: [14, 14, 14], c: 0xd73232 }, 14: { t: [15, 15, 15], c: 0x325ad2 }, 15: { t: [16, 16, 16], c: 0xf0d232 }, 16: { t: [17, 17, 17], c: 0x3b82e6 }, 17: { t: [18, 18, 18], c: 0xa0642a }, 18: { t: [20, 19, 19], c: 0x8a5a28 },
  19: { t: [21, 22, 2], c: 0x2a9632 }, 20: { t: [24, 23, 24], c: 0x46372a }, 21: { t: [25, 25, 25], c: 0x19732d }, 22: { t: [26, 27, 2], c: 0xaaa046 },
  23: { t: [5, 28, 5], c: 0x967050 }, 24: { t: [29, 29, 29], c: 0x6e9632 }, 25: { t: [30, 30, 30], c: 0xc87846 }, 26: { t: [31, 31, 31], c: 0x55555f },
  27: { t: [32, 32, 32], c: 0x8c8782 }, 28: { t: [33, 33, 33], c: 0x1e5a46 }, 29: { t: [43, 43, 43], c: 0xaad4f5 }, 30: { t: [44, 44, 44], c: 0x5af0e6 }, 31: { t: [45, 45, 45], c: 0xc77dff },
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
const UNLOCK_ALL = /[?&]debug/.test(location.search); // ouvrir index.html?debug pour tout débloquer
const WORLD_ORDER = ['farm', 'jungle', 'savanna', 'rock', 'ocean', 'snow', 'cave'];
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
  scene.fog.near = cfg.fog[0]; scene.fog.far = cfg.fog[1]; LOOK.tint = cfg.tint;
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
function setBlock(x, y, z, id) {
  if (!inb(x, y, z)) return;
  world[idx(x, y, z)] = id;
  { const rec = worldRec(), k = x + ',' + y + ',' + z; if (!(k in rec.edits)) editCount++; if (editCount < 40000) { rec.edits[k] = id; saveSoon(); } }
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
  rock: { clear: 3, cloudy: 3, fog: 3, snow: 1.5 }, ocean: { clear: 5, cloudy: 2, rain: 2, storm: 1.2 }, snow: { snow: 6, clear: 2, fog: 2 }, cave: { clear: 1 },
};
function pickWeather() {
  const e = Object.entries(WX_TABLE[S.world] || { clear: 1 }), tot = e.reduce((x, [, w]) => x + w, 0); let r = Math.random() * tot;
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
};
function updateSound(t) {
  if (!Snd.started || !AC) return;
  const A = S.snd.amb, M = S.snd.music, w = S.world, g = (n, v) => n.gain.setTargetAtTime(v, AC.currentTime, .6);
  const base = { farm: .008, jungle: .006, savanna: .018, rock: .03, ocean: .02, snow: .035, cave: .003 }[w] || .01, calm = state === 'menu' ? .6 : 1;
  g(Snd.wind, A ? (base + WX.mix * .02 + (WX.type === 'storm' ? .02 : 0)) * calm : 0);
  g(Snd.rain, A && (WX.type === 'rain' || WX.type === 'storm') ? .04 * WX.mix : 0);
  g(Snd.wave, A && w === 'ocean' ? .03 + Math.sin(t * .45) * .012 : 0);
  g(Snd.hum, A && w === 'cave' ? .03 : 0);
  if (A) {
    const rainy = WX.type === 'rain' || WX.type === 'storm';
    if (t > Snd.tBird && ['farm', 'jungle', 'savanna', 'ocean'].includes(w) && !isNight && !rainy) { chirp(); Snd.tBird = t + 2 + Math.random() * 5; }
    if (t > Snd.tCrick && isNight && ['farm', 'jungle', 'savanna'].includes(w)) { crickets(); Snd.tCrick = t + 1.5 + Math.random() * 2.5; }
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
      if (b === B.CHEST) marks.push([i, j, '#ffd43b', 3]); else if (b === B.LUCKY) marks.push([i, j, '#fff3a0', 2]);
    }
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  mmx.putImageData(mmImg, 0, 0);
  marks.forEach(([i, j, col, sz]) => { mmx.fillStyle = '#000'; mmx.fillRect(i - 1, j - 1, sz + 2, sz + 2); mmx.fillStyle = col; mmx.fillRect(i, j, sz, sz); });
  animals.forEach(a => { const i = Math.floor(a.x) - px + h, j = Math.floor(a.z) - pz + h; if (i >= 0 && i < MMS && j >= 0 && j < MMS) { mmx.fillStyle = a.type === 'merchant' ? '#ff9f1c' : a.pet ? '#ff6fa8' : '#fff'; mmx.fillRect(i, j, a.type === 'merchant' ? 4 : 2, a.type === 'merchant' ? 4 : 2); } });
}
let mmT = 0;

// ---------- Joueur ----------
const P = { x: W / 2, y: 30, z: D / 2, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, ground: false, fly: false };
const PW = .3, PH = 1.8, EYE = 1.62;
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
  const sprint = (keys.ShiftLeft || keys.ShiftRight) && !P.fly;
  const inW = !P.fly && (get(Math.floor(P.x), Math.floor(P.y + .9), Math.floor(P.z)) === B.WATER || get(Math.floor(P.x), Math.floor(P.y + .3), Math.floor(P.z)) === B.WATER);
  const sp = (sprint ? 7 : 4.6) * (P.fly ? 1.9 : 1) * (inW ? .6 : 1);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const tx = (-sy * f + cy * s) * sp, tz = (-cy * f - sy * s) * sp;
  const k = Math.min(1, dt * (P.ground || P.fly ? 14 : 5));
  P.vx += (tx - P.vx) * k; P.vz += (tz - P.vz) * k;
  if (P.fly) P.vy = ((keys.Space ? 1 : 0) - (keys.ShiftLeft || keys.down ? 1 : 0)) * 8;
  else if (inW) { P.vy = Math.max(P.vy - 9 * dt, -3); if (keys.Space) P.vy = Math.min(P.vy + 32 * dt, 4); if (P.wall && (keys.Space || f || s)) P.vy = Math.max(P.vy, 7.5); }
  else { P.vy = Math.max(P.vy - 28 * dt, -40); if (keys.Space && P.ground) { P.vy = 9; P.ground = false; } }
  let n = Math.ceil(Math.max(Math.abs(P.vx), Math.abs(P.vy), Math.abs(P.vz)) * dt / .3) || 1;
  const sdt = dt / n; P.wall = false;
  for (let i = 0; i < n; i++) {
    P.x += P.vx * sdt; if (collides(P.x, P.y, P.z)) { P.x -= P.vx * sdt; P.vx = 0; P.wall = true; }
    P.z += P.vz * sdt; if (collides(P.x, P.y, P.z)) { P.z -= P.vz * sdt; P.vz = 0; P.wall = true; }
    P.y += P.vy * sdt; P.ground = false;
    if (collides(P.x, P.y, P.z)) { P.y -= P.vy * sdt; if (P.vy < 0) P.ground = true; P.vy = 0; }
  }
  if (P.fly && P.ground) P.fly = false, syncFly();
  P.x = clamp(P.x, PW + .01, W - PW - .01); P.z = clamp(P.z, PW + .01, D - PW - .01);
  if (P.y < -10) placePlayer();
  camera.position.set(P.x, P.y + EYE, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  $('uw').style.opacity = get(Math.floor(P.x), Math.floor(P.y + EYE), Math.floor(P.z)) === B.WATER ? 1 : 0;
}
function syncFly() { $('t-down').classList.toggle('hidden', !P.fly); $('t-fly').style.background = P.fly ? 'rgba(255,212,59,.6)' : ''; }
function toggleFly() { P.fly = !P.fly; syncFly(); toast(P.fly ? '🕊️ Tu voles ! (Espace ↑ / Maj ↓)' : 'Tu marches'); }

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
    const q = document.createElement('b'); q.textContent = inv[b]; q.id = 'cnt' + b; s.appendChild(q);
    s.addEventListener('pointerdown', e => { e.stopPropagation(); selectSlot(i); });
    hb.appendChild(s);
  });
}
function selectSlot(i) { sel = (i + 9) % 9; drawCube($('hand').firstChild, HOTBAR[sel]); [...$('hotbar').children].forEach((s, k) => s.classList.toggle('sel', k === sel)); }
function addInv(b, n) { inv[b] = (inv[b] || 0) + n; saveSoon(); const e = $('cnt' + b); if (e) e.textContent = inv[b]; }

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
function updateAnimals(dt) {
  const tt = performance.now() / 1000;
  for (const a of animals) {
    const T = TYPES[a.type];
    if (T.still) { const dx = P.x - a.x, dz = P.z - a.z; let dd = Math.atan2(dx, dz) - a.g.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); a.g.rotation.y += dd * Math.min(1, dt * 3); a.y += (groundAt(a.x, a.z, a.y) - a.y) * Math.min(1, dt * 10); a.g.position.set(a.x, a.y, a.z); continue; }
    if (a.pet) {
      const dx = P.x - a.x, dz = P.z - a.z, d = Math.hypot(dx, dz);
      if (d > 14) { a.x = P.x + 1.5; a.z = P.z + 1.5; a.y = landY(a.x, a.z); }
      else if (d > 3) { a.dir = Math.atan2(dx, dz); a.go = true; a.t = .5; }
      else { a.go = false; a.t = .5; }
    }
    a.t -= dt;
    if (a.t <= 0) { a.t = 1 + Math.random() * 3; a.go = Math.random() < (T.fly ? .9 : .6); a.dir += (Math.random() - .5) * 3; }
    if (T.hop && a.h === 0 && a.vy === 0 && a.go && Math.random() < dt * 2.5) a.vy = 4.5;
    if (a.type === 'dolphin' && a.h === 0 && a.vy === 0 && Math.random() < dt * .12) a.vy = 8;
    if (a.go) {
      const spd = a.pet ? 2.6 : T.fly ? 1.7 : T.swim ? (a.type === 'dolphin' ? 2.4 : 1.2) : (a.type === 'elephant' ? .6 : .9);
      const nx = a.x + Math.sin(a.dir) * spd * dt, nz = a.z + Math.cos(a.dir) * spd * dt, ix = Math.floor(nx), iz = Math.floor(nz);
      let ok = nx > 2 && nz > 2 && nx < W - 2 && nz < D - 2;
      if (ok) {
        if (T.swim) ok = get(ix, SEA, iz) === B.WATER && get(ix, SEA - 1, iz) === B.WATER;
        else if (T.fly) ok = !solid(get(ix, Math.floor(a.y + .4), iz)) && !solid(get(ix, Math.floor(a.y + 1), iz));
        else { const ny = groundAt(nx, nz, a.y), under = get(ix, ny - 1, iz); ok = ny - a.y < .3 && !LEAF.has(under) && !WOOD.has(under) && under !== B.LUCKY && under !== B.CHEST && get(ix, ny, iz) !== B.WATER; }
      }
      if (ok) { a.x = nx; a.z = nz; } else a.dir += 1.7 + Math.random();
    }
    if (T.swim) {
      const bed = groundAt(a.x, a.z, SEA + 1), ty = a.type === 'dolphin' ? SEA + .45 : clamp(SEA - .6 - (.5 + .5 * Math.sin(tt * .6 + a.ph)) * Math.max(0, SEA - bed - 2), bed + .6, SEA - .2);
      a.y += (ty - a.y) * Math.min(1, dt * 3);
    } else if (T.fly) {
      const gy = groundAt(a.x, a.z, a.y); let cy = Math.floor(a.y); while (cy < H - 2 && !solid(get(Math.floor(a.x), cy + 1, Math.floor(a.z)))) cy++;
      a.y += (clamp(gy + 2 + Math.sin(tt * 1.7 + a.ph) * 1.2, gy + 1, cy - .6) - a.y) * Math.min(1, dt * 2.5);
    } else a.y += (groundAt(a.x, a.z, a.y) - a.y) * Math.min(1, dt * 10);
    if (a.h > 0 || a.vy > 0) { a.vy -= 20 * dt; a.h += a.vy * dt; if (a.h <= 0) { a.h = 0; a.vy = 0; } }
    const wg = a.g.userData.wings; if (wg) { const f = Math.sin(tt * 14 + a.ph) * .7; wg[0].rotation.z = -f; wg[1].rotation.z = f; }
    a.g.position.set(a.x, a.y + a.h, a.z);
    let d = a.dir - a.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); a.g.rotation.y += d * Math.min(1, dt * 6);
  }
}
function hitAnimal(o, d, maxT) {
  let best = null, bt = maxT;
  for (const a of animals) {
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
  if (a) { if (a.type === 'merchant') { openMarket('play'); return; } a.vy = 6; a.h = .01; a.go = true; a.dir = Math.random() * 6.28; sfx.animal(a.type); burst(a.x - .5, a.y + .6, a.z - .5, 0xff6b9d, 8); toast('❤️'); return; }
  if (!target || target.y === 0) return;
  const b = get(target.x, target.y, target.z);
  if (b === B.CHEST) return startChest(target);
  setBlock(target.x, target.y, target.z, 0); today().broken++;
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
  if (!inv[b]) { toast('Plus de blocs ! Réponds aux questions pour en gagner 🎁'); return; }
  const x = target.x + target.nx, y = target.y + target.ny, z = target.z + target.nz;
  if (!inb(x, y, z) || solid(get(x, y, z))) return;
  if (x + 1 > P.x - PW && x < P.x + PW && y + 1 > P.y && y < P.y + PH && z + 1 > P.z - PW && z < P.z + PW) return;
  setBlock(x, y, z, b); addInv(b, -1); sfx.place();
  S.stats.placed++; today().placed++; missionProgress('place', b); if (S.stats.placed % 10 === 0) checkAch();
}

// ---------- Mathématiques ----------
function qText(op, a, b, hole) {
  if (op === 'mul') { const p = a * b; return hole === 1 ? [`${a} × ? = ${p}`, b] : hole === 2 ? [`? × ${b} = ${p}`, a] : [`${a} × ${b} = ?`, p]; }
  if (op === 'add') { const p = a + b; return hole === 1 ? [`${a} + ? = ${p}`, b] : [`${a} + ${b} = ?`, p]; }
  if (op === 'sub') return [`${a} − ${b} = ?`, a - b];
  return [`${a} ÷ ${b} = ?`, a / b];
}
function readable(key) { const [op, a, b] = key.split(':'); return `${a} ${{ mul: '×', add: '+', sub: '−', div: '÷' }[op]} ${b}`; }
function buildQ(op, a, b, allowHole, table) {
  let hole = 0;
  if (allowHole && S.ops.hole && Math.random() < .3 && (op === 'mul' || op === 'add')) hole = op === 'mul' ? rnd(1, 2) : 1;
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
function makeQuestion() {
  const miss = Object.entries(S.stats.miss).filter(([, v]) => v > 0);
  if (miss.length && Math.random() < .3) {
    const tot = miss.reduce((s, [, v]) => s + v, 0); let r = Math.random() * tot;
    for (const [k, v] of miss) { r -= v; if (r <= 0) { const [op, a, b, t] = k.split(':'); return buildQ(op, +a, +b, true, t ? +t : null); } }
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
let curQ = null, tries = 0, qLucky = false, revealed = false;

function show(id, on) { $(id).classList.toggle('hidden', !on); }
function resume() {
  show('menu', false); show('pause', false); show('qbox', false); show('hud', true); show('touch', IS_TOUCH);
  state = 'play';
  if (!IS_TOUCH) { try { const p = cv.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch (e) {} }
  updateHud();
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('toasts').appendChild(t);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  setTimeout(() => t.remove(), 2600);
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
  if (state !== 'play' && !opts.force) return;
  state = 'question'; if (document.pointerLockElement) document.exitPointerLock();
  Object.assign(keys, { Space: false, ShiftLeft: false, down: false, ArrowLeft: false, ArrowRight: false }); joy.x = joy.y = 0; syncJoy();
  show('pause', false); show('menu', false);
  chal = opts.chal || null; qLucky = !!lucky;
  presentQuestion();
}
function presentQuestion() {
  curQ = chal && chal.queue ? chal.queue[chal.got] : makeQuestion(); tries = 0; revealed = false; qStart = performance.now(); sfx.ask();
  $('qtitle').textContent = chal ? (chal.kind === 'chest' ? `🔒 Coffre au trésor · question ${chal.got + 1}/${chal.need}` : chal.kind === 'review' ? `📘 Révision du jour · ${chal.got + 1}/${chal.need}` : `⚡ Défi éclair · ${chal.got + 1}/${chal.need}`)
    : qLucky ? '💎 Bloc chanceux ! Double récompense !' : '🎁 Question magique !';
  $('qtext').textContent = curQ.text;
  $('qfb').textContent = ''; show('qok', false);
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
  return '';
}
function answer(v, btn) {
  if (revealed) return;
  if (+v === curQ.answer) return correct();
  if (tries === 0) { recordTab(curQ.table, false); S.stats.ko++; logAnswer(false, v); }
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
    show('qok', true); $('qok').focus();
  } else { $('qfb').textContent = 'Oups ! Essaie encore 😉'; if (S.mode !== 'choice') { $('qinput').value = ''; $('qinput').focus(); } }
}
function addStars(n) {
  const before = gradeIdx(); S.stats.stars += n; const after = gradeIdx();
  if (after > before) { const g = GRADES[after]; S.stats.diamonds += 3; earn(500); setTimeout(() => { toast(`🎉 Nouveau grade : ${g[1]} ${g[2]} ! +3💎 +5,00 €`); sfx.ok(); confetti(90); }, 700); }
}
function correct() {
  const st = S.stats; st.ok++; streak++; st.best = Math.max(st.best, streak);
  if (tries === 0) { recordTab(curQ.table, true); logAnswer(true); }
  if (st.miss[curQ.key]) { st.miss[curQ.key]--; if (st.miss[curQ.key] <= 0) delete st.miss[curQ.key]; }
  sfx.ok(); missionProgress('answer'); missionProgress('streak');
  if (chal) { confetti(14); return chalNext(true); }
  const mult = qLucky ? 2 : 1, n = 6 * mult + rnd(0, 4), bid = pick([B.PLANKS, B.BRICK, B.GLASS, B.RED, B.BLUE, B.YELLOW, B.STONE]), euros = (tries === 0 ? 50 : 20) * mult;
  let stars = (tries === 0 ? 3 : 1) * mult, boosted = false; if (S.boost > 0) { stars *= 2; S.boost--; boosted = true; }
  addStars(stars); addInv(bid, n); earn(euros);
  let msg = `✅ ${pick(CHEERS)} +${stars}⭐${boosted ? '✨' : ''} +${fmt(euros)} +${n} ${NAMES[bid].toLowerCase()}`;
  if (qLucky) { st.diamonds += 3; msg += ' +3💎'; } else if (streak % 5 === 0) { st.diamonds++; msg += ' +1💎 (série de 5 !)'; }
  confetti(qLucky ? 70 : 35); checkAch(); save();
  nextQ = qInterval * (.7 + Math.random() * .6);
  resume(); toast(msg);
  if (streak > 1) setTimeout(() => toast(`🔥 ${streak} bonnes réponses d'affilée !`), 500);
}
function chalNext(ok) {
  chal.got++; if (ok) chal.ok++;
  if ((chal.kind === 'chest' && !ok) || chal.got >= chal.need) return chalEnd();
  presentQuestion();
}
function chalEnd() {
  const c = chal; chal = null; nextQ = qInterval * (.7 + Math.random() * .6);
  const st = S.stats;
  if (c.kind === 'chest') {
    if (c.ok >= c.need) {
      setBlock(c.pos[0], c.pos[1], c.pos[2], B.CHESTOPEN); st.chests++; today().chests++; addStars(5); st.diamonds += 3; earn(500);
      const b1 = pick(HOTBAR.slice(3)), b2 = pick(HOTBAR.slice(3)); addInv(b1, 20); addInv(b2, 20);
      confetti(110); sfx.ok(); missionProgress('chest'); save(); checkAch(); resume();
      toast('🗝️ Coffre ouvert ! +5⭐ +3💎 +5,00 € + 40 blocs'); burst(c.pos[0], c.pos[1] + 1, c.pos[2], 0xffd43b, 24);
    } else { save(); resume(); toast('🔒 Le coffre reste fermé… Réessaie plus tard !'); }
  } else if (c.kind === 'flash') {
    earn(c.ok * 50); addStars(c.ok * 2); let msg = `⚡ Défi éclair : ${c.ok}/${c.need} · +${c.ok * 2}⭐ +${fmt(c.ok * 50)}`;
    if (c.ok === c.need) { st.diamonds += 2; st.flash5++; msg += ' +2💎 PARFAIT !'; confetti(100); }
    save(); checkAch(); resume(); toast(msg);
  }
  if (c.kind === 'review') {
    const first = !S.review[dayKey()]; S.review[dayKey()] = Math.max(S.review[dayKey()] || 0, c.ok);
    addStars(c.ok * 2); earn(c.ok * 20);
    let msg = `📘 Révision : ${c.ok}/${c.need} · +${c.ok * 2}⭐ +${fmt(c.ok * 20)}`;
    if (first && c.ok >= Math.ceil(c.need * .6)) { earn(300); st.diamonds += 2; msg += ' 🎁 Cadeau du jour : +3,00 € +2💎 !'; confetti(100); }
    save(); checkAch(); resume(); toast(msg);
  }
}
function closeReveal() {
  if (chal) return chalNext(false);
  nextQ = qInterval * (.7 + Math.random() * .6);
  resume();
}
function startChest(t) {
  if (state !== 'play') return;
  ask(false, { chal: { kind: 'chest', need: 3, got: 0, ok: 0, pos: [t.x, t.y, t.z] } });
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
    S.mission = newMission(); today().missions++; addStars(5); S.stats.diamonds += 2; earn(300); sfx.ok(); confetti(60);
    setTimeout(() => toast('🏆 Mission réussie ! +5⭐ +2💎 +3,00 €'), 700); checkAch();
  }
  save(); updateHud();
}
// ---------- Argent, marchand, accessoires, révision ----------
const LV_GRAN = { CP: 100, CE1: 100, CE2: 50, libre: 50, CM1: 5, CM2: 5 };
const COINS_EASY = [100, 200, 500, 1000], COINS_MID = [10, 20, 50, 100, 200, 500, 1000], COINS_HARD = [5, 10, 20, 50, 100, 200, 500, 1000, 2000];
const LV_COINS = { CP: COINS_EASY, CE1: COINS_EASY, CE2: COINS_MID, libre: COINS_MID, CM1: COINS_HARD, CM2: COINS_HARD };
const coinLabel = c => c < 100 ? c + ' c' : (c / 100) + ' €';
const marketLvl = () => LV_GRAN[S.level] ? S.level : 'libre';
const PETEMO = { pig: '🐷', sheep: '🐑', chick: '🐥', monkey: '🐒', lion: '🦁', dog: '🐶', cat: '🐱' };
const LEVEL_INFO = { CP: 'additions et soustractions jusqu\'à 20', CE1: 'jusqu\'à 100 · tables de 2, 3, 4, 5 et 10', CE2: 'nombres jusqu\'à 500 · tables de 2 à 9 · premières divisions', CM1: 'nombres jusqu\'à 2 000 · multiplications 2 chiffres × 1 chiffre · divisions', CM2: 'grands nombres jusqu\'à 9 999 · multiplications et divisions plus longues', libre: 'tu choisis tables et opérations toi-même' };
function presetFor(k) { const L = LEVELS[k]; return L ? { level: k, tables: L.tables.slice(), ops: Object.assign({}, L.ops) } : { level: 'libre' }; }
function applyLevel(k) { Object.assign(S, presetFor(k)); save(); buildMenu(); }

// --- accessoires (se posent sur la tête de l'animal) ---
const ACCS = {
  hat: { ic: '🎩', name: 'Chapeau haut-de-forme', base: 600, build(y, z, w) { const g = new THREE.Group(), K = am(0x1b1b22), R = am(0xc92a2a); g.add(box(w * 1.7, .04, w * 1.7, K, 0, y, z), box(w * .95, .3, w * .95, K, 0, y + .17, z), box(w * .98, .06, w * .98, R, 0, y + .07, z)); return g; } },
  bow: { ic: '🎀', name: 'Nœud rose', base: 400, build(y, z, w) { const g = new THREE.Group(), P_ = am(0xff6fa8), D_ = am(0xd63384); g.add(box(.12, .11, .08, P_, w * .3 - .08, y + .03, z + .05), box(.12, .11, .08, P_, w * .3 + .08, y + .03, z + .05), box(.06, .07, .09, D_, w * .3, y + .03, z + .05)); return g; } },
  crown: { ic: '👑', name: 'Couronne en or', base: 1500, build(y, z, w) { const g = new THREE.Group(), G = am(0xffd43b); g.add(box(w * .95, .08, w * .95, G, 0, y + .04, z)); [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].forEach(([a, b]) => g.add(box(.07, .16, .07, G, a * w * .4, y + .15, z + b * w * .4))); return g; } },
  glasses: { ic: '🕶️', name: 'Lunettes de soleil', base: 500, build(y, z, w) { const g = new THREE.Group(), D_ = am(0x15151c), zf = z + w * .5 + .01, ey = y - w * .35; g.add(box(w * 1.05, .04, .03, D_, 0, ey, zf), box(w * .36, .13, .03, D_, -w * .22, ey, zf), box(w * .36, .13, .03, D_, w * .22, ey, zf)); return g; } },
  scarf: { ic: '🧣', name: 'Écharpe rouge', base: 700, build(y, z, w) { const g = new THREE.Group(), R = am(0xe03131); g.add(box(w * 1.15, .12, w * 1.15, R, 0, y - w * .95, z - .08), box(.1, .32, .07, R, w * .3, y - w * .95 - .18, z + w * .5)); return g; } },
};
const spriteCache = {};
function makeLabel(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.font = '700 32px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 7; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(text, 128, 34); x.fillStyle = '#fff'; x.fillText(text, 128, 34);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); sp.scale.set(1.5, .375, 1); return sp;
}
function setAcc(a) {
  if (a.accG) { a.g.remove(a.accG); a.accG = null; }
  const p = a.petRef; if (!p || !p.acc || !ACCS[p.acc]) return;
  const [y, z, w] = TYPES[a.type].head || [a.size * .9, a.size * .35, .4];
  a.accG = ACCS[p.acc].build(y, z, w); a.g.add(a.accG);
}
function setLabel(a, text) {
  if (a.lab) { a.g.remove(a.lab); a.lab = null; }
  if (!text) return;
  a.lab = makeLabel(text); a.lab.position.set(0, (TYPES[a.type].head ? TYPES[a.type].head[0] : a.size) + .55, 0); a.g.add(a.lab);
}
function makePet(p) {
  const x = P.x + 1.5, z = P.z + 1.5, a = newAnimal(p.t, x, landY(x, z), z, true);
  a.petRef = p; animals.push(a); setAcc(a); setLabel(a, p.name);
}
function spawnPets() {
  animals = animals.filter(a => { if (a.pet || a.type === 'merchant') { scene.remove(a.g); return false; } return true; });
  S.pets.forEach(makePet); spawnMerchant();
}
function spawnMerchant() {
  let x = P.x + 3, z = P.z;
  for (let i = 0; i < 14; i++) { const tx = P.x + Math.cos(i * .9) * 3.5, tz = P.z + Math.sin(i * .9) * 3.5, ty = landY(tx, tz); if (ty > SEA && get(Math.floor(tx), ty, Math.floor(tz)) === 0 && get(Math.floor(tx), ty - 1, Math.floor(tz)) !== B.WATER) { x = tx; z = tz; break; } }
  const a = newAnimal('merchant', x, landY(x, z), z); animals.push(a); setLabel(a, '🛒 Marchand');
}

// --- le marché ---
const MARKET = [
  { id: 'brick', cat: '🧱 Blocs', ic: '🧱', name: '40 briques', base: 450, give: () => addInv(B.BRICK, 40) },
  { id: 'glass', cat: '🧱 Blocs', ic: '🪟', name: '40 blocs de verre', base: 400, give: () => addInv(B.GLASS, 40) },
  { id: 'stone', cat: '🧱 Blocs', ic: '🪨', name: '60 blocs de pierre', base: 300, give: () => addInv(B.STONE, 60) },
  { id: 'wool', cat: '🧱 Blocs', ic: '🌈', name: '15 laines de chaque couleur', base: 600, give: () => { addInv(B.RED, 15); addInv(B.BLUE, 15); addInv(B.YELLOW, 15); } },
  { id: 'potion', cat: '✨ Magie', ic: '🧪', name: 'Potion ×2 étoiles (5 bonnes réponses)', base: 800, give: () => { S.boost += 5; } },
  { id: 'gift', cat: '✨ Magie', ic: '🎁', name: 'Boîte surprise', base: 1000, give: () => { S.stats.diamonds += 2; addInv(pick(HOTBAR.slice(3)), 30); } },
  { id: 'pet-pig', cat: '🐾 Compagnons', ic: '🐷', name: 'Cochon', base: 1200, pet: 'pig' },
  { id: 'pet-dog', cat: '🐾 Compagnons', ic: '🐶', name: 'Chien', base: 2200, pet: 'dog' },
  { id: 'pet-cat', cat: '🐾 Compagnons', ic: '🐱', name: 'Chat', base: 2200, pet: 'cat' },
  { id: 'pet-sheep', cat: '🐾 Compagnons', ic: '🐑', name: 'Mouton', base: 1800, pet: 'sheep' },
  { id: 'pet-chick', cat: '🐾 Compagnons', ic: '🐥', name: 'Poussin', base: 2500, pet: 'chick' },
  { id: 'pet-monkey', cat: '🐾 Compagnons', ic: '🐒', name: 'Singe', base: 2000, pet: 'monkey' },
  { id: 'pet-lion', cat: '🐾 Compagnons', ic: '🦁', name: 'Lion', base: 4000, pet: 'lion' },
  ...Object.entries(ACCS).map(([k, a]) => ({ id: 'acc-' + k, cat: '🎩 Accessoires', ic: a.ic, name: a.name, base: a.base, acc: k })),
];
MARKET.forEach(it => {
  if (it.pet) it.give = () => { const p = { t: it.pet, name: '', acc: null }; S.pets.push(p); makePet(p); };
  if (it.acc) it.give = () => { S.acc.push(it.acc); };
});
const itemOwned = it => (it.pet && S.pets.some(p => p.t === it.pet)) || (it.acc && S.acc.includes(it.acc));
let mk = { from: 'play', view: 'home', item: null, price: 0, tray: [], showTotal: true, msg: '', given: 0 };
function openMarket(from) {
  mk.from = from; mk.view = 'home'; mk.msg = '';
  if (state === 'play') { state = 'pause'; if (document.pointerLockElement) document.exitPointerLock(); }
  show('pause', false); show('market', true); renderMarket(); sfx.ask();
}
function closeMarket() { show('market', false); if (mk.from === 'play') resume(); else { show('pause', true); renderPause('shop'); } }
function openCounter(it) {
  const left = (S.locks[it.id] || 0) - Date.now();
  if (left > 0) { mk.msg = `😤 Je suis encore fâché… reviens dans ${Math.ceil(left / 1000)} secondes.`; return renderMarket(); }
  const g = LV_GRAN[marketLvl()], price = Math.max(g, Math.round(it.base * (.8 + Math.random() * .4) / g) * g);
  if (S.wallet < price) { mk.msg = `Ça fait <b>${fmt(price)}</b> et tu n'as que ${fmt(S.wallet)}… Réponds à des questions pour gagner des pièces !`; return renderMarket(); }
  Object.assign(mk, { item: it, price, tray: [], showTotal: marketLvl() !== 'CM1' && marketLvl() !== 'CM2', view: 'counter' }); renderMarket();
}
function payNow() {
  const sum = mk.tray.reduce((a, b) => a + b, 0), it = mk.item, o = S.opAll.money || (S.opAll.money = { ok: 0, ko: 0 });
  if (sum === mk.price) {
    o.ok++; S.market.ok++; S.wallet -= mk.price; S.stats.bought = (S.stats.bought || 0) + 1; it.give(); mk.view = 'ok'; sfx.coin(); confetti(70);
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
    h = head(mk.msg || `Bonjour ${esc(nm)} ! Que veux-tu acheter ? Attention : tu dois me donner la <b>somme exacte</b>, sinon je ne te donne rien !`) +
      `<div class="wallet">👛 Ton porte-monnaie : <strong>${fmt(S.wallet)}</strong> <button class="linkbtn" id="mexch" ${S.stats.diamonds < 1 ? 'disabled' : ''}>💎 → 5 €</button></div>`;
    [...new Set(MARKET.map(i => i.cat))].forEach(cat => {
      h += `<h3>${cat}</h3><div class="shop">`;
      MARKET.filter(i => i.cat === cat).forEach(i => {
        const own = itemOwned(i), lock = (S.locks[i.id] || 0) > Date.now();
        h += `<button class="item" data-id="${i.id}" ${own ? 'disabled' : ''}><b>${i.ic}</b><span>${i.name}</span><em>${own ? '✔ possédé' : lock ? '😤 fâché' : '≈ ' + fmt(Math.round(i.base / 50) * 50)}</em></button>`;
      });
      h += '</div>';
    });
    h += '<div class="row"><button class="btn green" id="mclose">← Quitter le marché</button></div>';
  } else if (mk.view === 'counter') {
    const sum = mk.tray.reduce((a, b) => a + b, 0);
    h = head(`Ça fait <b>${fmt(mk.price)}</b>. Donne-moi la somme exacte avec tes pièces et tes billets !`) +
      `<div class="product"><b>${mk.item.ic}</b><span>${mk.item.name}</span><div class="price">${fmt(mk.price)}</div></div>
       <div class="tray">${mk.tray.length ? mk.tray.map((v, i) => `<i class="tc c${v}" data-i="${i}">${coinLabel(v)}</i>`).join('') : '<small>Touche les pièces et billets ci-dessous…</small>'}</div>
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
  c.querySelectorAll('.item').forEach(b => b.onclick = () => { const it = MARKET.find(i => i.id === b.dataset.id); mk.msg = ''; openCounter(it); });
  c.querySelectorAll('.coin').forEach(b => b.onclick = () => { if (mk.tray.length < 30) { mk.tray.push(+b.dataset.v); sfx.coin(); renderMarket(); } });
  c.querySelectorAll('.tc').forEach(b => b.onclick = () => { mk.tray.splice(+b.dataset.i, 1); renderMarket(); });
  on('mundo', () => { mk.tray.pop(); renderMarket(); }); on('mclear', () => { mk.tray = []; renderMarket(); });
  on('mtot', () => { mk.showTotal = true; renderMarket(); }); on('mpay', payNow);
  on('mback', () => { mk.view = 'home'; mk.msg = ''; renderMarket(); }); on('mhome', () => { mk.view = 'home'; mk.msg = ''; renderMarket(); });
  on('mclose', closeMarket);
  on('mexch', () => { if (S.stats.diamonds >= 1) { S.stats.diamonds--; earn(500); sfx.coin(); mk.msg = '💎 Un diamant contre 5 € ! Bonne affaire !'; save(); renderMarket(); } });
}

// --- révision du jour ---
function makeReviewQueue() {
  const q = [], keys = new Set(), push = o => { if (o && !keys.has(o.key) && q.length < 10) { keys.add(o.key); q.push(o); } };
  Object.entries(S.stats.miss).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([k]) => { const [op, a, b, t] = k.split(':'); push(buildQ(op, +a, +b, false, t ? +t : null)); });
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
function buildLevels() {
  const el = $('levels'); el.innerHTML = '';
  ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'libre'].forEach(k => chip(el, k === 'libre' ? 'Libre' : k, S.level === k, () => applyLevel(k)));
  $('lvdesc').textContent = (S.level === 'libre' ? '' : S.level + ' : ') + LEVEL_INFO[S.level || 'libre'];
}
function updateReviewBadge() { $('rbadge').style.display = S.review[dayKey()] ? 'none' : 'inline'; }
function renderPets(body) {
  if (!S.pets.length) { body.innerHTML = '<p class="gnext">Tu n\'as pas encore de compagnon. Va voir le marchand 🧑‍🌾 (ou clique sur lui dans le monde) !</p>'; return; }
  body.innerHTML = S.pets.map((p, i) => `<div class="petrow"><b>${PETEMO[p.t]}</b><input data-i="${i}" class="pname" maxlength="12" placeholder="Son nom" value="${esc(p.name || '')}">
    <span class="chips" data-i="${i}"></span></div>`).join('') + (S.acc.length ? '' : '<p class="gnext">Le marchand vend des accessoires : chapeau, couronne, lunettes…</p>');
  body.querySelectorAll('.pname').forEach(inp => inp.oninput = () => { const p = S.pets[+inp.dataset.i]; p.name = inp.value.trim(); const a = animals.find(x => x.petRef === p); if (a) setLabel(a, p.name); save(); });
  body.querySelectorAll('.chips').forEach(ch => { const p = S.pets[+ch.dataset.i];
    [null, ...S.acc].forEach(k => chip(ch, k ? ACCS[k].ic : 'Aucun', p.acc === k, () => { p.acc = k; const a = animals.find(x => x.petRef === p); if (a) setAcc(a); save(); renderPause('pets'); })); });
}


// ----- Écran de pause à onglets -----
let ptab = 'prog';
function renderPause(tab) {
  ptab = tab || ptab;
  const tb = $('ptabs'); tb.innerHTML = '';
  [['prog', '📊 Progrès'], ['ach', '🏅 Succès'], ['shop', '🛒 Marchand'], ['pets', '🐾 Compagnons'], ['chal', '⚡ Défis'], ['snd', '🔊 Sons']].forEach(([k, l]) => chip(tb, l, k === ptab, () => renderPause(k)));
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
    h += `<p class="gnext">👛 Ton porte-monnaie : <b>${fmt(S.wallet)}</b>. Tu gagnes de l'argent avec les bonnes réponses, les coffres et les missions. Au marché, il faut donner la <b>somme exacte</b> !</p><button id="gomarket" class="btn green">🧑‍🌾 Aller voir le marchand</button>`;
  } else if (ptab === 'snd') {
    h += '<p class="gnext">Choisis les sons du jeu :</p><div id="sndchips" class="chips"></div>';
  } else if (ptab === 'pets') {
    h += '<div id="petbody"></div>';
  } else {
    h += `<p class="gnext">📘 <b>Révision du jour</b> : 10 questions choisies sur tes points faibles. Le premier passage de la journée donne un cadeau 🎁 !</p><button id="revbtn" class="btn green">📘 Lancer la révision du jour</button>
      <p class="gnext">Réponds à <b>5 questions</b> d'affilée, une seule chance par question ! Chaque bonne réponse vaut 2 ⭐ et 0,50 €, et un sans-faute rapporte 2 💎.</p><button id="flash" class="btn green">⚡ Lancer le défi éclair</button>
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
  state = 'pause'; savePos(); if (playAcc > 0) { today().t += playAcc; playAcc = 0; } save();
  if (document.pointerLockElement) document.exitPointerLock();
  renderPause('prog'); show('pause', true);
}
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && state === 'play') pauseGame(); });

function updateHud() {
  const g = GRADES[gradeIdx()], m = S.mission;
  $('h-stars').textContent = '⭐ ' + S.stats.stars; $('h-dia').textContent = '💎 ' + S.stats.diamonds; $('h-streak').textContent = '🔥 ' + streak;
  $('h-wallet').textContent = '💶 ' + fmt(S.wallet);
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
    const w = WORLDS[k], locked = !UNLOCK_ALL && S.stats.stars < w.unlock, b = document.createElement('button');
    b.className = 'wcard w-' + k + (S.world === k ? ' on' : '') + (locked ? ' locked' : '');
    b.innerHTML = `<b>${w.emoji}</b><span>${w.name}</span><small>${locked ? `🔒 ${w.unlock} ⭐ pour débloquer` : w.desc}</small>`;
    b.addEventListener('click', () => { if (locked) { $('wmsg').textContent = `🔒 ${w.name} : gagne encore ${w.unlock - S.stats.stars} ⭐ en répondant aux questions !`; return; } $('wmsg').textContent = ''; switchWorld(k); });
    el.appendChild(b);
  });
}
function withLoading(w, fn) { $('ltxt').textContent = `${w.emoji} ${w.name}`; show('loading', true); setTimeout(() => { fn(); setTimeout(() => show('loading', false), 700); }, 60); }
function switchWorld(k) {
  savePos(); S.world = k; if (!S.visited.includes(k)) S.visited.push(k); noteWorld(); save();
  withLoading(WORLDS[k], () => { applyLook(); generate(); buildAll(); spawnAnimals(); placePlayer(); spawnPets(); buildWorlds(); });
}
function buildMenu() {
  buildWorlds(); buildLevels(); updateReviewBadge(); renderSndChips($('snd'));
  const t = $('tables'); t.innerHTML = '';
  for (let i = 1; i <= 10; i++) chip(t, i, S.tables.includes(i), b => {
    const k = S.tables.indexOf(i); if (k >= 0) S.tables.splice(k, 1); else S.tables.push(i);
    b.classList.toggle('on'); S.level = 'libre'; save(); buildLevels();
  });
  const pr = $('presets'); pr.innerHTML = '';
  [['Faciles 2·5·10', [2, 5, 10]], ['2 → 5', [2, 3, 4, 5]], ['6 → 9', [6, 7, 8, 9]], ['Toutes', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]].forEach(([l, arr]) =>
    chip(pr, l, false, () => { S.tables = arr.slice(); S.level = 'libre'; save(); buildMenu(); }));
  const o = $('ops'); o.innerHTML = '';
  [['mul', '✖️ Multiplications'], ['div', '➗ Divisions'], ['add', '➕ Additions'], ['sub', '➖ Soustractions'], ['hole', '❓ À trous (? × 7 = 42)']].forEach(([k, l]) =>
    chip(o, l, S.ops[k], b => { S.ops[k] = !S.ops[k]; b.classList.toggle('on'); S.level = 'libre'; save(); buildLevels(); }));
  const f = $('freq'); f.innerHTML = '';
  [[30, '⚡ Souvent (30 s)'], [60, '🙂 Normal (1 min)'], [90, '😌 Calme (1 min 30)']].forEach(([v, l]) =>
    chip(f, l, S.freq === v, () => { S.freq = v; qInterval = v; save(); buildMenu(); }));
  const m = $('mode'); m.innerHTML = '';
  [['choice', '👆 Je choisis (4 réponses)'], ['typed', '⌨️ Je tape la réponse']].forEach(([v, l]) =>
    chip(m, l, S.mode === v, () => { S.mode = v; save(); buildMenu(); }));
}
function startGame() {
  qInterval = S.freq; noteWorld();
  if (limitSecs() && today().t >= limitSecs()) { show('menu', false); showLimit(); return; }
  if (!started) { placePlayer(); started = true; nextQ = 25; spawnPets(); }
  else nextQ = Math.max(nextQ, 8);
  sndStart();
  resume(); checkAch(); { const w = WORLDS[S.world]; toast(S.name ? `${w.emoji} Salut ${S.name} ! Bienvenue : ${w.name}` : w.emoji + ' ' + w.name); }
}
$('play').addEventListener('click', startGame);
$('review').addEventListener('click', () => { startGame(); if (state === 'play') startReview(); });
$('resume').addEventListener('click', resume);
$('settings').addEventListener('click', () => { show('pause', false); show('menu', true); state = 'menu'; buildMenu(); });
$('newworld').addEventListener('click', () => {
  if (editCount > 30 && !confirm('Ça efface ce que tu as construit dans ce monde. Continuer ?')) return;
  const rec = worldRec(); rec.seed = (Math.random() * 1e9) | 0; rec.edits = {}; rec.pos = null; save();
  withLoading(curCfg(), () => { generate(); buildAll(); spawnAnimals(); placePlayer(); spawnPets(); started = true; });
});
$('qok').addEventListener('click', closeReveal);
$('qsubmit').addEventListener('click', () => { const v = $('qinput').value.trim(); if (v !== '') answer(v, null); });

// ---------- Entrées : clavier / souris ----------
document.addEventListener('keydown', e => {
  if (state === 'question') {
    if (revealed) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeReveal(); } return; }
    if (S.mode === 'choice' && /^[1-4]$/.test(e.key)) { const b = $('qchoices').children[+e.key - 1]; if (b && !b.classList.contains('bad')) b.click(); }
    if (S.mode !== 'choice' && e.key === 'Enter') $('qsubmit').click();
    return;
  }
  if (state !== 'play') { if (e.key === 'Enter' && state === 'menu') startGame(); return; }
  keys[e.code] = true;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (/^[1-9]$/.test(e.key)) selectSlot(+e.key - 1);
  const k = e.key.toLowerCase();
  if (k === 'f') toggleFly();
  if (k === 'm') ask(false);
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
hold('t-down', () => keys.down = true, () => keys.down = false);
hold('t-left', () => keys.ArrowLeft = true, () => keys.ArrowLeft = false);
hold('t-right', () => keys.ArrowRight = true, () => keys.ArrowRight = false);
hold('t-fly', toggleFly);
hold('t-ask', () => ask(false));
hold('t-pause', pauseGame);
hold('t-mode', () => { touchMode = touchMode === 'break' ? 'place' : 'break'; $('t-mode').textContent = touchMode === 'break' ? '⛏️' : '🧱'; });
document.addEventListener('touchmove', e => { if (e.target.closest && !e.target.closest('.overlay')) e.preventDefault(); }, { passive: false });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); if (AC) { try { document.hidden ? AC.suspend() : AC.resume(); } catch (e) {} } });
addEventListener('pointerdown', sndStart, { once: true });

// ---------- Boucle principale ----------
let last = performance.now(), menuAngle = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  updateSky(dt); updateParts(dt); updateAnimals(dt);
  if (state === 'play' || state === 'question') { playAcc += dt; if (playAcc >= 5) flushPlay(); }
  updateCritters(dt, now / 1000); updateWeather(dt, now / 1000); Snd.tU = (Snd.tU || 0) + dt; if (Snd.tU > .25) { Snd.tU = 0; updateSound(now / 1000); }
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
const NEWDAY = () => ({ ok: 0, ko: 0, n: 0, ms: 0, t: 0, placed: 0, broken: 0, chests: 0, missions: 0, worlds: [] });
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
const limitSecs = () => S.limit ? (S.limit + (S.bonus[dayKey()] || 0)) * 60 : 0;
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
function openParent() { viewId = REG.cur; parentPin(REG.pin ? 'enter' : 'create'); }

let viewId = REG.cur;
function renderParent(id) {
  if (id) viewId = id; if (!REG.list.some(p => p.id === viewId)) viewId = REG.cur;
  const X = viewId === REG.cur ? S : loadProfile(viewId), persistX = () => X === S ? save() : saveProfile(viewId, X);
  const w7 = sumDays(7, X), tot = sumAll(X), g = GRADES[gradeIdx(X)];
  const acc7 = pct(w7.ok, w7.ok + w7.ko), accT = pct(tot.ok, tot.ok + tot.ko), avgT = tot.n ? tot.ms / tot.n / 1000 : null;
  // jours consécutifs
  let streakD = 0; for (let i = 0; i < 400; i++) { const d = X.daily[dayKey(new Date(Date.now() - i * 864e5))]; if (d && d.n > 0) streakD++; else if (i > 0) break; }
  const lastKey = Object.keys(X.daily).filter(k => X.daily[k].t > 0 || X.daily[k].n > 0).sort().pop();
  const daysAgo = lastKey ? Math.floor((new Date(dayKey()) - new Date(lastKey)) / 864e5) : null;
  const kpi = (ic, l, v, sub) => `<div class="kpi"><b>${ic}</b><span>${l}</span><strong>${v}</strong><small>${sub}</small></div>`;
  let h = `<div class="phead"><h1 class="ttl">👨‍👩‍👧 Espace parent${X.name ? ' · ' + esc(X.name) : ''}</h1><div class="gnext">Suivi au ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}${X.first ? ' · premier jeu le ' + X.first.split('-').reverse().join('/') : ''}</div></div>
  <div class="kpis">
    ${kpi('⏱️', 'Temps de jeu (7 j)', fmtT(w7.t), 'Total : ' + fmtT(tot.t))}
    ${kpi('❓', 'Questions (7 j)', w7.n, 'Total : ' + tot.n)}
    ${kpi('🎯', 'Réussite 1er essai (7 j)', acc7 === null ? '–' : acc7 + ' %', 'Depuis le début : ' + (accT === null ? '–' : accT + ' %'))}
    ${kpi('⚡', 'Temps de réponse', avgT ? avgT.toFixed(1) + ' s' : '–', 'en moyenne')}
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
  const OPN = { mul: '✖️ Multiplications', div: '➗ Divisions', add: '➕ Additions', sub: '➖ Soustractions', money: '💶 Monnaie (marchand)' };
  h += '<h3>Par type de calcul</h3><div class="ptab">' + Object.keys(OPN).map(k => { const a = X.opAll[k] || { ok: 0, ko: 0 }, n = a.ok + a.ko, p = pct(a.ok, n);
    return `<div class="prow"><b>${OPN[k]}</b><div class="tb"><i style="width:${p || 0}%;background:${p === null ? '#5b6b8f' : p >= 80 ? '#37b24d' : p >= 60 ? '#f59f00' : '#f03e3e'}"></i></div><span>${p === null ? '–' : p + ' %'}</span><em>${n} q.</em><u></u></div>`; }).join('') + '</div>';
  // erreurs
  h += '<h3>Dernières erreurs</h3>' + (X.errs.length ? '<ul class="errs">' + X.errs.slice(0, 12).map(e => `<li>${esc(e.q).replace('?', '<b>?</b>')} <span>→ répondu <b>${esc(e.g)}</b>, bonne réponse <b>${e.a}</b></span> <small>${new Date(e.d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</small></li>`).join('') + '</ul>' : '<p class="gnext">Aucune erreur enregistrée pour l\'instant 🎉</p>');
  // activité
  h += `<h3>Ce qu'il fait dans le jeu</h3><div class="kpis small">
    ${kpi('🧱', 'Blocs posés', tot.placed, 'cassés : ' + tot.broken)}
    ${kpi('🔒', 'Coffres ouverts', X.stats.chests, 'missions : ' + tot.missions)}
    ${kpi('🌍', 'Mondes visités', X.visited.length + '/' + WORLD_ORDER.length, X.visited.map(k => WORLDS[k].emoji).join(' '))}
    ${kpi('🐾', 'Compagnons', X.pets.length, 'succès : ' + Object.keys(X.ach).length + '/' + ACH.length)}
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
    if (daysAgo !== null && daysAgo >= 3) adv.push(`📅 Pas de partie depuis ${daysAgo} jours : 10 à 15 minutes par jour suffisent pour progresser.`);
    else if (w7.t < 600) adv.push('⏱️ Peu de jeu cette semaine : 10 à 15 minutes par jour suffisent pour bien progresser.');
  }
  if (!adv.length) adv.push('✅ Tout se passe bien, continuez comme ça !');
  h += '<h3>Conseils</h3><div class="adv">' + adv.map(a => `<p>${a}</p>`).join('') + '</div>';
  // réglages parent
  h += `<h3 class="no-print">Réglages parent</h3><div class="no-print psets">
    <label>Prénom de l'enfant <input id="pname" maxlength="20" value="${esc(X.name)}" placeholder="Prénom"></label>
    <div>Temps de jeu max par jour : <span id="plimit" class="chips"></span></div>
    <div>Niveau scolaire : <span id="plevel" class="chips"></span></div>
    <div class="row"><button class="btn" id="pprint">🖨️ Imprimer</button><button class="btn" id="pexport">💾 Exporter</button><label class="btn" id="pimportl">📂 Importer<input type="file" id="pimport" accept=".json" hidden></label></div>
    <div class="row"><button class="btn" id="ppin">🔑 Changer le code</button><button class="btn danger" id="preset">🗑️ Supprimer ce joueur</button></div>
    <p class="gnext">Les données sont enregistrées sur cet appareil et ce navigateur. Utilisez « Exporter » pour les sauvegarder ou les copier sur un autre appareil.</p>
  </div>
  <div class="row no-print"><button class="btn green" id="pclose">← Retour au jeu</button></div>`;
  $('pcard').innerHTML = h;
  if (REG.list.length > 1) { const ph = $('pcard').querySelector('.phead'); ph.insertAdjacentHTML('afterend', '<div id="pkids" class="chips no-print"></div>' + overviewHtml()); REG.list.forEach(p => chip($('pkids'), `${p.avatar} ${profName(p)}`, p.id === viewId, () => renderParent(p.id))); }
  const lim = $('plimit'); [[0, 'Aucune'], [15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 h']].forEach(([v, l]) => chip(lim, l, X.limit === v, () => { X.limit = v; if (X === S) warned5 = false; persistX(); renderParent(viewId); }));
  ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'libre'].forEach(k => chip($('plevel'), k === 'libre' ? 'Libre' : k, X.level === k, () => { const L = LEVELS[k]; X.level = k; if (L) { X.tables = L.tables.slice(); X.ops = Object.assign({}, L.ops); } persistX(); renderParent(viewId); }));
  $('pname').oninput = e => { const n = e.target.value.trim(); X.name = n; REG.list.find(p => p.id === viewId).name = n; saveReg(); persistX(); };
  $('pprint').onclick = () => window.print();
  $('pexport').onclick = () => {
    const out = { version: 2, reg: REG, profiles: {} }; REG.list.forEach(p => { out.profiles[p.id] = p.id === REG.cur ? S : loadProfile(p.id); });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })); a.download = 'mathcraft-sauvegarde.json'; a.click(); };
  $('pimport').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try {
    const o = JSON.parse(t);
    if (o && o.profiles && o.reg) { Object.entries(o.profiles).forEach(([id, d]) => localStorage.setItem(keyOf(id), JSON.stringify(d))); localStorage.setItem(REG_KEY, JSON.stringify(o.reg)); }
    else if (o && o.stats) localStorage.setItem(SAVE_KEY, t); else throw 0;
    location.reload(); } catch (err) { alert('Fichier de sauvegarde invalide.'); } }); };
  $('ppin').onclick = () => parentPin('create', () => { toast('🔑 Code modifié'); renderParent(); });
  $('preset').onclick = () => {
    if (!confirm(`Supprimer le joueur « ${profName(REG.list.find(p => p.id === viewId))} » et toute sa progression ? Cette action est définitive.`)) return;
    try { localStorage.removeItem(keyOf(viewId)); } catch (e) {}
    REG.list = REG.list.filter(p => p.id !== viewId);
    if (!REG.list.length) REG.list.push({ id: 'p' + Date.now().toString(36), name: '', avatar: pick(AVATARS) });
    if (REG.cur === viewId) REG.cur = REG.list[0].id;
    saveReg(); location.reload(); };
  $('pclose').onclick = () => show('parent', false);
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
      <div class="row"><button id="wok" class="btn green">C'est parti !</button>${mode === 'first' ? '' : '<button id="wback" class="btn">Retour</button>'}</div>`;
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

// ---------- Démarrage ----------
applyLook(); if (!S.visited.includes(S.world)) S.visited.push(S.world); generate(); buildAll(); spawnAnimals(); buildHotbar(); drawCube($('hand').firstChild, HOTBAR[sel]); buildMenu(); if (!S.mission) S.mission = newMission(); updateHud();
updateWho();
{ let skip = false; try { skip = sessionStorage.getItem('mc-skip') === '1'; } catch (e) {}
  if (REG.list.length === 1 && !REG.list[0].name && S.stats.ok === 0) showWho('first');
  else if (REG.list.length > 1 && !skip) showWho(); }
requestAnimationFrame(frame);
window.MC = { WX, setWeather, Snd, sndStart, updateSound, spawnAnimals, openMarket, startReview, makeReviewQueue, applyLevel, REG, showWho, openParent, renderParent, today, switchWorld, WORLDS, S, startChest, startFlash, renderPause, get chal() { return chal; }, get, get animals() { return animals; }, ask, S, P, makeQuestion, makeChoices, get state() { return state; }, setBlock };
})();
