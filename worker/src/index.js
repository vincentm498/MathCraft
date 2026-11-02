// Serveur de synchronisation MathCraft : stocke la progression sous un « code famille » secret.
//   GET    /s/<code>   -> la sauvegarde (404 si le code n'existe pas)
//   PUT    /s/<code>   -> envoie la sauvegarde ; le serveur la fusionne avec l'existante et renvoie le résultat
//   DELETE /s/<code>   -> efface tout
// Aucun nom de compte, e-mail ni mot de passe : le code (24 caractères au hasard) est le seul secret.
// Le code PIN parent n'est jamais envoyé.

const CODE = /^[A-Z0-9]{20,40}$/;
const PID = /^p[a-z0-9]{1,12}$/;
const MAX_BYTES = 900_000;
const TTL = 60 * 60 * 24 * 400;   // une sauvegarde jamais synchronisée pendant ~13 mois est effacée toute seule

// la progression d'un joueur = nombre de réponses données
export const score = p => ((p && p.stats && p.stats.ok) || 0) + ((p && p.stats && p.stats.ko) || 0);

// fusion : pour chaque joueur, on garde la sauvegarde la plus avancée (à égalité, la plus récente)
function withoutGone(d) {
  const gone = d.gone || [], profiles = { ...d.profiles };
  gone.forEach(id => delete profiles[id]);
  return { reg: { list: d.reg.list.filter(p => !gone.includes(p.id)) }, profiles, gone };
}
export function merge(old, inc) {
  if (!old) return withoutGone(inc);
  const gone = [...new Set([...(old.gone || []), ...(inc.gone || [])])].slice(-50);   // joueurs supprimés : ils ne reviennent pas
  const profiles = { ...old.profiles };
  for (const id in inc.profiles) if (!profiles[id] || score(inc.profiles[id]) >= score(profiles[id])) profiles[id] = inc.profiles[id];
  const byId = new Map((old.reg.list || []).map(p => [p.id, p]));
  for (const p of inc.reg.list) { const o = byId.get(p.id) || {}; byId.set(p.id, { ...o, ...p, name: p.name || o.name || '' }); }
  for (const id of gone) { delete profiles[id]; byId.delete(id); }
  return { reg: { list: [...byId.values()] }, profiles, gone };
}

function valid(d) {
  if (!d || typeof d !== 'object' || !d.reg || !Array.isArray(d.reg.list) || d.reg.list.length > 8 || !d.profiles || typeof d.profiles !== 'object') return false;
  const ids = Object.keys(d.profiles);
  if (d.gone !== undefined && !(Array.isArray(d.gone) && d.gone.length <= 50 && d.gone.every(id => PID.test(id)))) return false;
  return ids.length <= 8 && ids.every(id => PID.test(id)) && d.reg.list.every(p => p && PID.test(p.id) && d.profiles[p.id]);
}

function corsFor(req, env) {
  const o = req.headers.get('Origin');
  if (!o) return { ok: true, h: {} };
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return { ok, h: ok ? { 'Access-Control-Allow-Origin': o, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } : {} };
}

export default {
  async fetch(req, env) {
    const c = corsFor(req, env);
    const out = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { ...c.h, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    if (!c.ok) return out(403, { error: 'origine refusée' });
    if (req.method === 'OPTIONS') return out(204);
    const m = new URL(req.url).pathname.match(/^\/s\/([A-Za-z0-9]+)$/);
    if (!m) return out(404, { error: 'introuvable' });
    const code = m[1].toUpperCase();
    if (!CODE.test(code)) return out(400, { error: 'code invalide' });
    const key = 's:' + code;

    if (req.method === 'GET') {
      const v = await env.SAVES.get(key);
      return v ? new Response(v, { status: 200, headers: { ...c.h, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }) : out(404, { error: 'code inconnu' });
    }
    if (req.method === 'DELETE') { await env.SAVES.delete(key); return out(200, { ok: true }); }
    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > MAX_BYTES) return out(413, { error: 'sauvegarde trop grosse' });
      let inc; try { inc = JSON.parse(text); } catch (e) { return out(400, { error: 'JSON invalide' }); }
      if (!valid(inc)) return out(400, { error: 'format invalide' });
      const old = await env.SAVES.get(key, 'json');
      const merged = merge(old, inc), s = JSON.stringify(merged);
      if (s.length > MAX_BYTES) return out(413, { error: 'sauvegarde trop grosse' });
      await env.SAVES.put(key, s, { expirationTtl: TTL });
      return new Response(s, { status: 200, headers: { ...c.h, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    return out(405, { error: 'méthode non permise' });
  },
};
