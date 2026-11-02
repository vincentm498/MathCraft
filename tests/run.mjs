// Tests automatiques de MathCraft : un vrai navigateur (Chromium sans fenêtre) charge le jeu servi en local
// et vérifie les règles qui comptent (questions, répétition espacée, réponses au hasard, animaux, sauvegardes…).
// Lancer : npm install && npx playwright install chromium && npm test
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import worker from '../worker/src/index.js';

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
// `opts.kv` : branche le jeu sur le vrai code du serveur de synchronisation (worker/), avec un stockage en mémoire
const SYNC_TEST_URL = 'https://sync.test';
const memoryKV = () => { const m = new Map(); return { m, get: async (k, t) => { const v = m.get(k); return v === undefined ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { m.set(k, v); }, delete: async k => { m.delete(k); } }; };
async function open(url = '/index.html?debug', seed, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 }, serviceWorkers: 'block' });
  const pfx = url.startsWith('/dev/') ? 'dev-' : '';
  seed = seed || { [pfx + 'mathcraft-profiles']: JSON.stringify({ list: [{ id: 'p1', name: 'Test', avatar: '🦊' }], cur: 'p1', pin: '' }) };
  await ctx.addInitScript(entries => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); for (const k in entries) localStorage.setItem(k, entries[k]); } }, seed);
  if (opts.kv) {
    await ctx.addInitScript(u => { window.MC_SYNC_URL = u; }, SYNC_TEST_URL);
    await ctx.route(SYNC_TEST_URL + '/**', async route => {
      const rq = route.request(), r = await worker.fetch(new Request(rq.url(), { method: rq.method(), headers: rq.headers(), body: ['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(rq.method()) ? undefined : rq.postData() }), { SAVES: opts.kv, ALLOWED_ORIGINS: 'https://vincentm498.github.io' });
      await route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() });
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.MC && window.MC.S, null, { timeout: 60000 });
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
    const fresh = await titles(''), latest = MC.S.seenVer;   // après ouverture, la version vue est la dernière publiée
    return { fresh, old: await titles('1.10'), seen: await titles(latest) };
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

// ---------- Synchronisation entre appareils ----------
const CODE_OK = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.slice(0, 24);
const wreq = (method, p, body, origin = 'http://localhost:1', kv) => worker.fetch(new Request('https://w.test' + p, { method, headers: { Origin: origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }), { SAVES: kv, ALLOWED_ORIGINS: 'https://vincentm498.github.io' });
const save = (ok, ko = 0, extra = {}) => ({ reg: { list: [{ id: 'p1', name: 'Léa', avatar: '🦊' }] }, profiles: { p1: { stats: { ok, ko, stars: ok }, ...extra } } });

test('serveur de synchro : création, lecture, fusion, effacement', async () => {
  const kv = memoryKV();
  eq((await wreq('GET', '/s/' + CODE_OK, undefined, undefined, kv)).status, 404, 'code inconnu');
  eq((await wreq('PUT', '/s/' + CODE_OK, save(10), undefined, kv)).status, 200, 'création');
  eq((await (await wreq('GET', '/s/' + CODE_OK, undefined, undefined, kv)).json()).profiles.p1.stats.ok, 10, 'relecture');
  const merged = await (await wreq('PUT', '/s/' + CODE_OK, save(4), undefined, kv)).json();   // un appareil en retard n'écrase pas
  eq(merged.profiles.p1.stats.ok, 10, 'la progression la plus avancée est gardée');
  eq((await (await wreq('PUT', '/s/' + CODE_OK, save(25), undefined, kv)).json()).profiles.p1.stats.ok, 25, 'plus avancé : remplace');
  const two = { reg: { list: [{ id: 'p1', name: 'Léa' }, { id: 'ptom', name: 'Tom' }] }, profiles: { p1: { stats: { ok: 25 } }, ptom: { stats: { ok: 3 } } } };
  eq(Object.keys((await (await wreq('PUT', '/s/' + CODE_OK, two, undefined, kv)).json()).profiles).sort(), ['p1', 'ptom'], 'deux joueurs');
  const del = await (await wreq('PUT', '/s/' + CODE_OK, { ...two, gone: ['ptom'] }, undefined, kv)).json();
  eq(del.reg.list.map(p => p.id), ['p1'], 'joueur supprimé retiré du serveur');
  eq(Object.keys((await (await wreq('PUT', '/s/' + CODE_OK, two, undefined, kv)).json()).profiles), ['p1'], 'un autre appareil ne le fait pas revenir');
  eq((await wreq('DELETE', '/s/' + CODE_OK, undefined, undefined, kv)).status, 200, 'effacement');
  eq((await wreq('GET', '/s/' + CODE_OK, undefined, undefined, kv)).status, 404, 'plus rien après effacement');
});

test('serveur de synchro : refuse les requêtes invalides', async () => {
  const kv = memoryKV();
  eq((await wreq('PUT', '/s/court', save(1), undefined, kv)).status, 400, 'code trop court');
  eq((await wreq('PUT', '/s/' + CODE_OK, { x: 1 }, undefined, kv)).status, 400, 'format invalide');
  eq((await wreq('PUT', '/s/' + CODE_OK, save(1), 'https://pirate.example', kv)).status, 403, 'site non autorisé');
  eq((await wreq('PUT', '/s/' + CODE_OK, save(1, 0, { blob: 'x'.repeat(950000) }), undefined, kv)).status, 413, 'trop gros');
  eq((await wreq('PUT', '/s/' + CODE_OK, { reg: { list: [{ id: '../x', name: '' }] }, profiles: { '../x': {} } }, undefined, kv)).status, 400, 'identifiant de joueur invalide');
  ok(!JSON.stringify([...kv.m.values()]).includes('pin'), 'rien d\'inattendu stocké');
});

test('synchro : un enfant retrouve sa progression sur un autre appareil', async () => {
  const kv = memoryKV();
  const a = await open('/index.html?debug', undefined, { kv });
  await a.evaluate(() => { MC.S.stats.ok = 30; MC.S.stats.stars = 12; MC.S.photos = { pig: 'data:image/png;base64,AAAA' }; MC.REG.list[0].name = 'Léa'; MC.REG.pin = '1234'; });
  eq(await a.evaluate(() => MC.syncEnable()), true, 'activation');
  const code = await a.evaluate(() => MC.SYNC.code);
  ok(/^[A-Z2-9]{24}$/.test(code), 'code de 24 signes');
  const stored = JSON.stringify([...kv.m.values()]);
  ok(!stored.includes('1234') && !stored.includes('data:image'), 'ni le code parent ni les photos ne partent en ligne');

  const b = await open('/index.html?debug', { 'mathcraft-profiles': JSON.stringify({ list: [{ id: 'p1', name: '', avatar: '🦊' }], cur: 'p1', pin: '' }) }, { kv });
  eq(await b.evaluate(c => MC.syncJoin(c), code.slice(0, 6) + '-' + code.slice(6, 12) + ' ' + code.slice(12).toLowerCase()), '', 'saisie tolérante (tirets, espaces, minuscules)');
  eq(await b.evaluate(() => [MC.S.name, MC.S.stats.ok, MC.S.stats.stars]), ['Léa', 30, 12], 'progression retrouvée');

  await b.evaluate(() => { MC.S.stats.ok = 40; });
  await b.evaluate(() => MC.syncNow(true)); await a.evaluate(() => MC.syncNow(true));
  eq(await a.evaluate(() => MC.S.stats.ok), 40, 'la progression de B arrive sur A');
  await a.evaluate(() => { MC.S.stats.ok = 5; }); await a.evaluate(() => MC.syncNow(true));
  eq(await a.evaluate(() => MC.S.stats.ok), 40, 'un appareil en retard récupère au lieu d\'écraser');
  ok(await a.evaluate(() => Object.keys(MC.S.photos).includes('pig')), 'les photos locales sont gardées');
  eq(await b.evaluate(() => MC.syncJoin('ZZZZZZZZZZZZZZZZZZZZZZZZ')), 'Code inconnu : vérifie-le ou crée-en un depuis l\'autre appareil.', 'code inconnu');

  eq(await a.evaluate(() => MC.syncErase()), true, 'effacement en ligne'); eq(await a.evaluate(() => MC.SYNC), null, 'appareil détaché');
  eq(kv.m.size, 0, 'plus rien sur le serveur');
  await a.close_(); await b.close_();
});

test('synchro : un appareil neuf (identifiant aléatoire) reprend le joueur sans en créer un second', async () => {
  const kv = memoryKV();
  const a = await open('/index.html?debug', undefined, { kv });
  await a.evaluate(() => { MC.S.stats.ok = 30; MC.REG.list[0].name = 'Léa'; });
  await a.evaluate(() => MC.syncEnable()); const code = await a.evaluate(() => MC.SYNC.code);
  const c = await open('/index.html?debug', {}, { kv });
  const idC = await c.evaluate(() => MC.REG.list[0].id);
  ok(/^p[a-z0-9]{8}$/.test(idC) && idC !== 'p1', 'identifiant aléatoire pour un appareil neuf : ' + idC);
  await c.evaluate(cd => MC.syncJoin(cd), code).catch(() => {});   // la page se recharge sur le joueur retrouvé
  await c.waitForFunction(() => window.MC && window.MC.S && window.MC.S.stats.ok === 30, null, { timeout: 90000 });   // rechargement de la page : lent sur les machines sans carte graphique
  eq(await c.evaluate(() => [MC.REG.list.length, MC.S.name, MC.REG.cur === MC.REG.list[0].id]), [1, 'Léa', true], 'un seul joueur, celui de l\'autre appareil');
  await a.close_(); await c.close_();
});

test('synchro : un joueur supprimé sur un appareil disparaît des autres', async () => {
  const kv = memoryKV();
  const a = await open('/index.html?debug', undefined, { kv });
  await a.evaluate(() => { MC.S.stats.ok = 20; localStorage.setItem('mathcraft-v1-ptom00001', JSON.stringify({ stats: { ok: 7, ko: 0, stars: 1 } })); MC.REG.list.push({ id: 'ptom00001', name: 'Tom', avatar: '🐼' }); });
  await a.evaluate(() => MC.syncEnable()); const code = await a.evaluate(() => MC.SYNC.code);
  const b = await open('/index.html?debug', undefined, { kv });
  await b.evaluate(cd => MC.syncJoin(cd), code);
  eq(await b.evaluate(() => MC.REG.list.map(p => p.id).sort()), ['p1', 'ptom00001'], 'B a les deux joueurs');
  await a.evaluate(async () => { MC.SYNC.pending = ['ptom00001']; await MC.syncNow(true); MC.REG.list = MC.REG.list.filter(p => p.id !== 'ptom00001'); });
  await b.evaluate(() => MC.syncNow(true));
  eq(await b.evaluate(() => MC.REG.list.map(p => p.id)), ['p1'], 'Tom supprimé aussi sur B');
  await a.evaluate(() => MC.syncNow(true));
  eq(await a.evaluate(() => MC.REG.list.map(p => p.id)), ['p1'], 'et il ne revient pas sur A');
  await a.close_(); await b.close_();
});

test('synchro : la progression n\'est jamais remplacée en pleine partie', async () => {
  const kv = memoryKV();
  const a = await open('/index.html?debug', undefined, { kv });
  await a.evaluate(() => MC.syncEnable()); const code = await a.evaluate(() => MC.SYNC.code);
  const b = await open('/index.html?debug', undefined, { kv });
  await b.evaluate(c => MC.syncJoin(c), code); await b.evaluate(() => { MC.S.stats.ok = 99; }); await b.evaluate(() => MC.syncNow(true));
  await a.evaluate(async () => { document.querySelector('#worlds .wcard').click(); await new Promise(x => setTimeout(x, 2500)); });
  await a.evaluate(() => MC.syncNow(true));
  eq(await a.evaluate(() => MC.S.stats.ok), 0, 'pas de changement pendant la partie');
  await a.close_(); await b.close_();
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
