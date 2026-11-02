// Manette MathCraft : le téléphone envoie ses commandes à la TV (WebRTC / PeerJS) et affiche questions et menus.
(() => {
  const $ = id => document.getElementById(id);
  const show = (id, on) => $(id).classList.toggle('hidden', !on);
  const ctl = { f: 0, s: 0, dx: 0, dy: 0, j: false, sp: false };
  let peer = null, conn = null, code = '', st = { st: 'menu' }, lastSend = 0, lastKey = '', wake = null, retry = 0;

  function connect(c) {
    code = c.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) { $('cstat').textContent = 'Le code a 4 caractères.'; return; }
    clearTimeout(retry); $('cstat').textContent = '⏳ Connexion à la TV…';
    if (peer) peer.destroy();
    peer = new Peer();
    peer.on('open', () => {
      conn = peer.connect('mathcraft-' + code, { reliable: true });
      conn.on('open', () => { show('connect', false); show('pad', true); $('lamp').textContent = '📡 connecté'; sendNow(); try { navigator.wakeLock && navigator.wakeLock.request('screen').then(w => wake = w).catch(() => {}); } catch (e) {} });
      conn.on('data', m => { if (m.t === 'st') { st = m.s; render(); } });
      conn.on('close', lost);
      conn.on('error', lost);
    });
    peer.on('error', e => { $('cstat').textContent = e.type === 'peer-unavailable' ? '❌ Code inconnu : regarde bien le code sur la TV.' : '⚠️ ' + e.type; if (e.type !== 'peer-unavailable') lost(); });
  }
  function lost() {
    show('pad', false); show('connect', true); $('cstat').textContent = '📵 Connexion perdue… nouvelle tentative';
    clearTimeout(retry); retry = setTimeout(() => connect(code), 2500);
  }
  const ok = () => conn && conn.open;
  const send = m => { if (ok()) conn.send(m); };
  const btn = k => { send({ t: 'b', k }); if (navigator.vibrate) navigator.vibrate(15); };
  function sendNow() { send({ t: 'in', f: ctl.f, s: ctl.s, dx: ctl.dx, dy: ctl.dy, j: ctl.j, sp: ctl.sp }); ctl.dx = ctl.dy = 0; lastSend = performance.now(); }
  setInterval(() => {
    const k = [ctl.f, ctl.s, ctl.j, ctl.sp].join();
    if (k !== lastKey || ctl.dx || ctl.dy || performance.now() - lastSend > 250) { lastKey = k; sendNow(); }
  }, 33);

  // joystick
  const joy = $('joy'), knob = $('knob'); let joyId = null, jc = null;
  const joyMove = e => {
    const r = joy.getBoundingClientRect(), R = r.width / 2, cx = r.left + R, cy = r.top + R;
    let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    ctl.s = Math.abs(dx) < .12 ? 0 : dx; ctl.f = Math.abs(dy) < .12 ? 0 : -dy;
    knob.style.transform = `translate(${dx * R * .6}px,${dy * R * .6}px)`;
  };
  joy.addEventListener('pointerdown', e => { joyId = e.pointerId; try { joy.setPointerCapture(joyId); } catch (x) {} joyMove(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = e => { if (e.pointerId === joyId) { joyId = null; ctl.f = ctl.s = 0; knob.style.transform = ''; } };
  joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);

  // regarder : glisser dans la zone de droite
  const look = $('look'); let lookId = null, lx = 0, ly = 0;
  look.addEventListener('pointerdown', e => { lookId = e.pointerId; try { look.setPointerCapture(lookId); } catch (x) {} lx = e.clientX; ly = e.clientY; });
  look.addEventListener('pointermove', e => { if (e.pointerId === lookId) { ctl.dx += (e.clientX - lx) * 1.4; ctl.dy += (e.clientY - ly) * 1.4; lx = e.clientX; ly = e.clientY; } });
  const lookEnd = e => { if (e.pointerId === lookId) lookId = null; };
  look.addEventListener('pointerup', lookEnd); look.addEventListener('pointercancel', lookEnd);

  // boutons
  const tap = (id, k) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); btn(k); });
  tap('bbreak', 'break'); tap('bplace', 'place'); tap('bpause', 'pause'); tap('bphoto', 'photo'); tap('bride', 'ride'); tap('bask', 'ask'); tap('bprev', 'prev'); tap('bnext', 'next');
  tap('mplay', 'play'); tap('presume', 'resume'); tap('pset', 'settings'); tap('qok', 'ok'); tap('qlater', 'later');
  const hold = (id, on) => { const el = $(id); el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {} on(true); }); const off = () => on(false); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); };
  hold('bjump', v => { ctl.j = v; });
  $('bsprint').addEventListener('pointerdown', e => { e.preventDefault(); ctl.sp = !ctl.sp; $('bsprint').classList.toggle('on', ctl.sp); });
  $('qsend').addEventListener('click', () => { const v = $('qin').value.trim(); if (v) { btn('t:' + v); $('qin').value = ''; } });
  $('qin').addEventListener('keydown', e => { if (e.key === 'Enter') $('qsend').click(); });

  // affichage selon ce que dit la TV
  let lastQ = '';
  function render() {
    const s = st.st;
    show('qpanel', s === 'question'); show('mpanel', s === 'menu'); show('ppanel', s === 'pause');
    show('bride', !!st.ride); $('bride').textContent = st.riding ? '🚶' : '🐴';
    if (s === 'menu' && st.worlds) {
      $('worlds').innerHTML = '';
      st.worlds.forEach(w => { const b = document.createElement('button'); b.className = w.cur ? 'cur' : ''; b.disabled = !w.ok; b.innerHTML = `<b>${w.ok ? w.e : '🔒'}</b>${w.n}`; b.addEventListener('pointerdown', () => btn('w:' + w.k)); $('worlds').appendChild(b); });
    }
    if (s === 'question' && st.q) {
      const q = st.q; $('qtitle').textContent = q.title; $('qtext').textContent = q.text; $('qfb').textContent = q.fb || '';
      if (q.text !== lastQ) { lastQ = q.text; if (navigator.vibrate) navigator.vibrate([60, 40, 60]); }
      const ch = $('qch'); ch.innerHTML = '';
      show('qch', !!q.ch);
      (q.ch || []).forEach((c, i) => { const b = document.createElement('button'); b.textContent = c.v; b.className = c.bad ? 'bad' : ''; b.disabled = c.bad; b.addEventListener('pointerdown', () => btn('a:' + i)); ch.appendChild(b); });
      show('qtyped', q.typed); show('qok', q.ok); show('qlater', q.later);
      if (q.typed && document.activeElement !== $('qin')) setTimeout(() => $('qin').focus(), 50);
    } else lastQ = '';
  }

  $('go').addEventListener('click', () => connect($('code').value));
  $('code').addEventListener('keydown', e => { if (e.key === 'Enter') $('go').click(); });
  document.addEventListener('contextmenu', e => e.preventDefault());
  const c0 = new URLSearchParams(location.search).get('c');
  if (c0) { $('code').value = c0.toUpperCase(); connect(c0); }
})();
