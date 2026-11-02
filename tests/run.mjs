// Tests automatiques de MathCraft : un vrai navigateur (Chromium sans fenêtre) charge le jeu servi en local
// et vérifie les règles qui comptent (questions, répétition espacée, réponses au hasard, animaux, sauvegardes…).
// Lancer : npm install && npx playwright install chromium && npm test
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/json' };

// Sert le dossier du jeu à la racine ET sous /dev/ (comme sur GitHub Pages) pour tester les deux versions.
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/dev(\/|$)/, '/');
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || 'différent'} : attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg || 'condition fausse'); };

// ouvre le jeu sur une page neuve (stockage vide) et attend qu'il soit prêt
// `seed` : contenu du localStorage avant le chargement (par défaut un joueur déjà nommé, sinon l'écran « Qui joue ? » masque le menu)
async function open(url = '/index.html?debug', seed) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 }, serviceWorkers: 'block' });
  const pfx = url.startsWith('/dev/') ? 'dev-' : '';
  seed = seed || { [pfx + 'mathcraft-profiles']: JSON.stringify({ list: [{ id: 'p1', name: 'Test', avatar: '🦊' }], cur: 'p1', pin: '' }) };
  await ctx.addInitScript(entries => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); for (const k in entries) localStorage.setItem(k, entries[k]); } }, seed);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + url);
  await page.waitForFunction(() => window.MC && window.MC.S, null, { timeout: 20000 });
  page.errors = errors; page.close_ = () => ctx.close();
  return page;
}
const wait = (page, ms) => page.waitForTimeout(ms);

// ---------- Questions ----------
test('questions : chaque niveau donne des questions valides, adaptées au niveau', async () => {
  const p = await open();
  const r = await p.evaluate(() => {
    const out = {};
    for (const lv of ['CP', 'CE1', 'CE2', 'CM1', 'CM2']) {
      MC.applyLevel(lv); const ops = new Set(), bad = [];
      for (let i = 0; i < 400; i++) {
        const q = MC.makeQuestion(), ch = MC.makeChoices(q); ops.add(q.op);
        if (!Number.isInteger(q.answer) || q.answer < 0) bad.push('réponse ' + q.text);
        if (new Set(ch).size !== 4 || !ch.includes(q.answer)) bad.push('choix ' + q.text);
      }
      out[lv] = { ops: [...ops].sort(), bad: bad.slice(0, 3) };
    }
    return out;
  });
  for (const lv in r) eq(r[lv].bad, [], 'questions invalides en ' + lv);
  ok(!r.CP.ops.includes('mul') && !r.CP.ops.includes('div'), 'CP : ni multiplication ni division');
  ok(!r.CE1.ops.includes('div'), 'CE1 : pas de division');
  ok(r.CE2.ops.includes('div') && r.CE2.ops.includes('mul'), 'CE2 : multiplication et division');
  await p.close_();
});

test('répétition espacée : un calcul raté revient, puis disparaît après 3 réussites', async () => {
  const p = await open();
  const r = await p.evaluate(() => {
    const q = { key: 'mul:3:4:3', text: '3 × 4 = ?', answer: 12 };
    MC.S.learn = {}; MC.S.qn = 0; MC.learnWrong(q);
    const due = MC.S.learn[q.key].due; MC.S.qn = due;
    let same = 0; for (let i = 0; i < 40; i++) if (MC.makeQuestion().key === q.key) same++;
    MC.learnRight(q); MC.learnRight(q); const stillThere = !!MC.S.learn[q.key]; MC.learnRight(q);
    return { due, same, stillThere, gone: !MC.S.learn[q.key] };
  });
  eq(r.due, 2, 'rappel après 2 questions');
  ok(r.same >= 30, `le calcul raté doit revenir presque à chaque fois (${r.same}/40)`);
  ok(r.stillThere, 'encore à apprendre après 2 réussites'); ok(r.gone, 'oublié après 3 réussites');
  await p.close_();
});

test('rythme adaptatif : plus d\'entraînement quand l\'enfant se trompe souvent', async () => {
  const p = await open();
  const r = await p.evaluate(() => {
    const lv = a => { MC.S.recent = a; return MC.struggle(); };
    const out = { few: lv([0, 0, 0]), bad: lv(Array(10).fill(0)), mid: lv([1, 0, 1, 0, 1, 0, 1, 0, 1, 0]), good: lv(Array(10).fill(1)) };
    MC.S.adapt = false; out.off = lv(Array(10).fill(0)); return out;
  });
  eq(r.few, 0, 'pas assez de réponses'); eq(r.bad, 3, 'beaucoup d\'erreurs'); eq(r.mid, 2, '50 % de réussite'); eq(r.good, 0, 'tout va bien'); eq(r.off, 0, 'option désactivée');
  await p.close_();
});

// ---------- Réponses au hasard / Far West ----------
test('Far West : il faut 50 réponses soignées et 80 % de réussite', async () => {
  const p = await open();
  const r = await p.evaluate(() => {
    const reset = () => { MC.S.recent = []; MC.S.care = 0; MC.S.westOpen = false; };
    reset(); for (let i = 0; i < 49; i++) MC.careAdd(true); const at49 = MC.S.westOpen; MC.careAdd(true); const at50 = MC.S.westOpen;
    reset(); for (let i = 0; i < 100; i++) MC.careAdd(i % 2 === 0); const sloppy = MC.S.westOpen;
    return { at49, at50, sloppy };
  });
  eq(r.at49, false, 'pas encore à 49'); eq(r.at50, true, 'débloqué à 50'); eq(r.sloppy, false, 'trop d\'erreurs : reste verrouillé');
  await p.close_();
});

// ---------- Compagnons ----------
test('compagnon rare : unique dans la partie', async () => {
  const p = await open();
  const r = await p.evaluate(async () => {
    MC.S.pets = []; MC.switchWorld('snow'); await new Promise(x => setTimeout(x, 1800));
    MC.spawnRare(); const wild = MC.animals.filter(a => a.rare).length;
    MC.addPet('yeti'); MC.addPet('yeti');
    const owned = MC.S.pets.filter(q => q.t === 'yeti').length, wildAfter = MC.animals.filter(a => a.rare).length;
    MC.spawnRare(); return { wild, owned, wildAfter, respawn: MC.animals.filter(a => a.rare).length };
  });
  eq(r.wild, 1, 'un rare sauvage apparaît'); eq(r.owned, 1, 'un seul exemplaire'); eq(r.wildAfter, 0, 'le sauvage disparaît'); eq(r.respawn, 0, 'il ne revient pas');
  await p.close_();
});

test('un seul compagnon actif à la fois', async () => {
  const p = await open();
  const r = await p.evaluate(() => { MC.S.pets = []; MC.addPet('pig'); MC.addPet('sheep'); MC.addPet('cow'); return MC.S.pets.filter(q => q.out).length; });
  eq(r, 1, 'compagnons sortis');
  await p.close_();
});

// ---------- Animaux ----------
test('animal enfermé dans un bloc : il se dégage', async () => {
  const p = await open();
  const r = await p.evaluate(async () => {
    document.querySelector('#worlds .wcard').click(); await new Promise(x => setTimeout(x, 2500));
    MC.spawnAnimals(); const a = MC.animals.find(x => !x.pet && !x.rare && x.type !== 'merchant' && x.type !== 'tmerchant' && !x.swim);
    if (!a) return { skip: true };
    const x = Math.floor(a.x), y = Math.floor(a.y), z = Math.floor(a.z);
    for (let k = 0; k < 3; k++) MC.setBlock(x, y + k, z, 3, true);
    MC.updateAnimals(.016);
    const cell = MC.get(Math.floor(a.x), Math.floor(a.y + .3), Math.floor(a.z));
    return { solid: cell !== 0 && cell !== 16, moved: Math.floor(a.x) !== x || Math.floor(a.z) !== z || Math.floor(a.y) > y };
  });
  ok(r.skip || (!r.solid && r.moved), 'l\'animal doit être replacé hors du bloc');
  await p.close_();
});

// ---------- Interface ----------
test('menu : cliquer un monde lance la partie (pas de bouton Jouer)', async () => {
  const p = await open();
  const r = await p.evaluate(async () => {
    const hasPlay = !!document.getElementById('play');
    document.querySelectorAll('#worlds .wcard')[1].click(); await new Promise(x => setTimeout(x, 2500));
    return { hasPlay, menuHidden: document.getElementById('menu').classList.contains('hidden'), state: MC.state };
  });
  eq(r.hasPlay, false, 'bouton Jouer supprimé'); eq(r.menuHidden, true, 'menu fermé'); eq(r.state, 'play', 'partie lancée');
  await p.close_();
});

test('Échap ouvre puis ferme la pause', async () => {
  const p = await open();
  const r = await p.evaluate(async () => {
    document.querySelector('#worlds .wcard').click(); await new Promise(x => setTimeout(x, 2500));
    const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const a = MC.state; esc(); const b = MC.state; esc(); return { a, b, c: MC.state };
  });
  eq([r.a, r.b, r.c], ['play', 'pause', 'play'], 'états');
  await p.close_();
});

test('nouveautés : seules les versions pas encore vues s\'affichent', async () => {
  const p = await open();
  const r = await p.evaluate(async () => {
    const titles = async seen => { MC.S.seenVer = seen; document.getElementById('open-news').click(); await new Promise(x => setTimeout(x, 100)); const n = document.querySelectorAll('#newscard h3').length; document.getElementById('news-ok').click(); return n; };
    return { fresh: await titles(''), old: await titles('1.10'), seen: await titles('1.13') };
  });
  eq(r.fresh, 1, 'nouveau joueur : 1 version'); ok(r.old >= 2, 'ancien joueur : plusieurs'); eq(r.seen, 1, 'tout vu : la dernière seulement');
  await p.close_();
});

// ---------- Sauvegarde et versions ----------
test('sauvegarde : une ancienne sauvegarde incomplète est complétée sans rien perdre', async () => {
  const p = await open('/index.html', { 'mathcraft-v1': JSON.stringify({ name: 'Léa', stats: { ok: 12, ko: 3, stars: 40 } }) });
  const r = await p.evaluate(() => ({ name: MC.S.name, stars: MC.S.stats.stars, ok: MC.S.stats.ok, hasPets: Array.isArray(MC.S.pets), hasLearn: typeof MC.S.learn === 'object' }));
  eq(r, { name: 'Léa', stars: 40, ok: 12, hasPets: true, hasLearn: true }, 'sauvegarde migrée');
  await p.close_();
});

test('version de test (/dev/) : sauvegardes séparées, tout débloqué', async () => {
  const dev = await open('/dev/index.html'), prod = await open('/index.html');
  const d = await dev.evaluate(() => { MC.applyLevel('CE1'); return { keys: Object.keys(localStorage), locked: document.querySelectorAll('#worlds .wcard.locked').length, badge: !!document.getElementById('devbadge') }; });
  const q = await prod.evaluate(() => { MC.applyLevel('CE1'); return { keys: Object.keys(localStorage), locked: document.querySelectorAll('#worlds .wcard.locked').length, badge: !!document.getElementById('devbadge') }; });
  ok(d.keys.includes('dev-mathcraft-v1') && !d.keys.includes('mathcraft-v1'), 'dev écrit seulement dans dev-…');
  ok(q.keys.includes('mathcraft-v1') && !q.keys.some(k => k.startsWith('dev-')), 'prod n\'écrit jamais dans dev-…');
  eq(d.locked, 0, 'dev : aucun monde verrouillé'); ok(q.locked > 0, 'prod : des mondes verrouillés'); ok(d.badge && !q.badge, 'bandeau de test seulement en dev');
  await dev.close_(); await prod.close_();
});

// ---------- Exécution ----------
let failed = 0;
for (const t of tests) {
  const t0 = Date.now();
  try { await t.fn(); console.log(`  ✓ ${t.name} (${Date.now() - t0} ms)`); }
  catch (e) { failed++; console.log(`  ✗ ${t.name}\n      ${e.message}`); }
}
await browser.close(); server.close();
console.log(`\n${tests.length - failed}/${tests.length} tests réussis`);
process.exit(failed ? 1 : 0);
