/* The Tension Laboratory page. Vanilla JS.
   The bench is a toy model of the design in the dossier. It is NOT the Unreal build. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- ENGINE (pure; used by the live bench and the batch compare) ---------- */
  var EVENT_TYPES = ['Move', 'DisappearReappear', 'Rotate', 'Scale'];
  var OBJS = [
    { id: 'Chair_A',    allowed: ['Move', 'Rotate'] },
    { id: 'Lamp_B',     allowed: ['DisappearReappear'] },
    { id: 'Painting_C', allowed: ['Rotate', 'Scale'] },
    { id: 'Door_D',     allowed: ['Move', 'Rotate'] },
    { id: 'Shelf_E',    allowed: ['Move', 'DisappearReappear', 'Scale'] }
  ];
  var CODES = ['APPROVED', 'DISABLED', 'TENSION_TOO_LOW', 'RECOVERY_ACTIVE', 'NO_CANDIDATES', 'PROBABILITY_ROLL_FAILED'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var PRESETS = {
    A: { prob: 0.9, minT: 15, delay: 4, cooldown: 8, recSec: 4 },
    B: { prob: 0.6, minT: 25, delay: 8, cooldown: 25, recSec: 14 }
  };
  function defaultCfg() {
    var allow = {}; EVENT_TYPES.forEach(function (e) { allow[e] = true; });
    var c = { enabled: true, exposure: 0.5, uncertainty: 0.6, recovery: 0.2,
              wE: 0.4, wU: 0.35, wP: 0.25, wR: 0.3, allow: allow };
    var p = PRESETS.B; for (var k in p) c[k] = p[k];
    return c;
  }
  function mk(cfg, seed) {
    var s = { cfg: cfg, rng: mulberry32(seed || 7), t: 0, tension: 12, pressure: 0, recWin: 0,
      focus: null, last: null, global: '', eligN: 0, sel: null, act: null, decision: '—',
      recent: null, counts: {}, events: [], log: [], hist: [], key: '' };
    CODES.forEach(function (c) { s.counts[c] = 0; });
    s.objs = OBJS.map(function (o) { return { id: o.id, allowed: o.allowed, unseen: 0, cd: 0, exec: 0, reason: '' }; });
    return s;
  }
  function note(s, code, obj, extra) {
    s.counts[code] = (s.counts[code] || 0) + 1;
    var key = code + '|' + (obj || '') + '|' + (extra || '');
    var top = s.log[s.log.length - 1];
    if (top && s.key === key) { top.n++; top.t = s.t; }
    else { s.log.push({ t: s.t, code: code, obj: obj || '', extra: extra || '', n: 1 }); if (s.log.length > 60) s.log.shift(); }
    s.key = key;
  }
  function tick(s) {
    var c = s.cfg;
    s.t++;
    s.pressure *= 0.93;
    var base = c.exposure * c.wE + c.uncertainty * c.wU + s.pressure * c.wP;
    var target = clamp(base - c.recovery * c.wR, 0, 1) * 100;
    s.tension += (target - s.tension) * 0.2;
    if (s.recWin > 0) s.recWin--;

    var elig = [];
    s.objs.forEach(function (o) {
      if (o.exec > 0) o.exec--;
      if (o.cd > 0) o.cd--;
      if (s.focus === o.id) o.unseen = 0; else o.unseen++;
      var r;
      if (o.exec > 0) r = 'EXECUTING';
      else if (s.focus === o.id) r = 'OBJECT_OBSERVED';
      else if (o.unseen < c.delay) r = 'UNSEEN_DELAY';
      else if (o.cd > 0) r = 'OBJECT_COOLDOWN';
      else if (!o.allowed.some(function (e) { return c.allow[e]; })) r = 'EVENT_UNSUPPORTED';
      else { r = 'ELIGIBLE'; elig.push(o); }
      o.reason = r;
    });
    s.eligN = elig.length;

    var g = '';
    if (!c.enabled) g = 'DISABLED';
    else if (s.tension < c.minT) g = 'TENSION_TOO_LOW';
    else if (s.recWin > 0) g = 'RECOVERY_ACTIVE';
    s.global = g;
    var approved = false;
    if (g) { note(s, g); s.decision = g; }
    else if (!elig.length) { note(s, 'NO_CANDIDATES'); s.decision = 'NO_CANDIDATES'; }
    else {
      var pool = elig.length > 1 ? elig.filter(function (o) { return o.id !== s.last; }) : elig;
      var pick = pool[Math.floor(s.rng() * pool.length)];
      s.sel = pick.id;
      if (!(s.rng() < c.prob)) { note(s, 'PROBABILITY_ROLL_FAILED', pick.id); s.decision = 'PROBABILITY_ROLL_FAILED'; s.act = '—'; }
      else {
        var acts = pick.allowed.filter(function (e) { return c.allow[e]; });
        var act = acts[Math.floor(s.rng() * acts.length)];
        pick.exec = 2; pick.cd = c.cooldown; pick.unseen = 0;
        s.recWin = c.recSec; s.pressure = Math.min(1, s.pressure + 0.35);
        s.last = pick.id; s.act = act; s.decision = 'APPROVED';
        s.events.push(s.t); s.recent = { id: pick.id, act: act, t: s.t };
        note(s, 'APPROVED', pick.id, act);
        approved = true;
      }
    }
    s.hist.push({ v: s.tension, ev: approved });
    if (s.hist.length > 120) s.hist.shift();
    return approved;
  }
  function band(v) { return v < 25 ? 'CALM' : v < 50 ? 'BUILDING' : v < 75 ? 'HIGH' : 'CRITICAL'; }

  /* scripted looker for the "simulated player" and the compare run */
  function makeLooker(seed) {
    var r = mulberry32(seed), left = 0;
    return function (s) {
      if (left <= 0) {
        left = 3 + Math.floor(r() * 6);
        s.focus = r() < 0.35 ? null : OBJS[Math.floor(r() * OBJS.length)].id;
      }
      left--;
    };
  }
  function run(presetKey, seconds, seed) {
    var cfg = defaultCfg(), p = PRESETS[presetKey];
    for (var k in p) cfg[k] = p[k];
    cfg.exposure = 0.5; cfg.uncertainty = 0.6; cfg.recovery = 0.2;
    var s = mk(cfg, seed || 11), look = makeLooker((seed || 11) + 1);
    for (var i = 0; i < seconds; i++) { look(s); tick(s); }
    var gaps = [], ev = s.events;
    for (var j = 1; j < ev.length; j++) gaps.push(ev[j] - ev[j - 1]);
    if (ev.length) gaps.push(seconds - ev[ev.length - 1]);
    var quiet = Math.max.apply(null, [ev.length ? ev[0] : seconds].concat(gaps));
    return {
      events: ev.length, perMin: ev.length / (seconds / 60),
      longestQuiet: quiet, shortestGap: gaps.length > 1 ? Math.min.apply(null, gaps.slice(0, -1)) : null,
      recovery: s.counts.RECOVERY_ACTIVE, nocand: s.counts.NO_CANDIDATES, roll: s.counts.PROBABILITY_ROLL_FAILED
    };
  }
  window.TL = { mk: mk, tick: tick, run: run, defaultCfg: defaultCfg, PRESETS: PRESETS };

  /* ---------- PAGE: reveal + nav ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.sec, .board');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.05 });
    els.forEach(function (e) { io.observe(e); });
  }
  function initNav() {
    var links = document.querySelectorAll('#lnav a');
    if (!('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('on'); });
        if (map[e.target.id]) map[e.target.id].classList.add('on');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) { var s = $(id); if (s) io.observe(s); });
  }

  /* ---------- HERO: tension trace ---------- */
  function initHero() {
    var cv = $('heroTrace'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var s = mk(defaultCfg(), 5); s.cfg.exposure = 0.55; s.cfg.uncertainty = 0.7; s.cfg.prob = 0.7;
    var look = makeLooker(9), N = 140, pts = [], evs = [], acc = 0, last = 0, visible = true;
    for (var i = 0; i < N; i++) { look(s); var a = tick(s); pts.push(s.tension); evs.push(a); }
    function size() { var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var top = H * 0.12, bot = H * 0.62, h = bot - top;
      [25, 50, 75].forEach(function (b) {
        var y = bot - h * b / 100; ctx.strokeStyle = 'rgba(180,200,205,.10)'; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.beginPath();
      pts.forEach(function (v, i) { var x = i / (N - 1) * W, y = bot - h * v / 100; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2; ctx.shadowColor = '#6ee7b7'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
      evs.forEach(function (e, i) {
        if (!e) return; var x = i / (N - 1) * W;
        ctx.strokeStyle = 'rgba(229,72,77,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top - 8); ctx.lineTo(x, bot + 10); ctx.stroke();
      });
    }
    function frame(ts) {
      if (visible && ts - last > 450) { last = ts; look(s); var a = tick(s); pts.push(s.tension); evs.push(a); pts.shift(); evs.shift(); draw(); }
      if (!reduce) requestAnimationFrame(frame);
    }
    size(); draw();
    window.addEventListener('resize', function () { size(); draw(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cv);
    if (!reduce) requestAnimationFrame(frame);
  }

  /* ---------- ARCHITECTURE TOGGLE ---------- */
  function initArch() {
    var b1 = $('aV1'), b2 = $('aV2'), v1 = $('archV1'), v2 = $('archV2');
    if (!b1) return;
    function set(two) {
      b1.setAttribute('aria-pressed', two ? 'false' : 'true'); b2.setAttribute('aria-pressed', two ? 'true' : 'false');
      v1.hidden = two; v2.hidden = !two;
    }
    b1.onclick = function () { set(false); }; b2.onclick = function () { set(true); };
  }

  /* ---------- BENCH ---------- */
  function initBench() {
    var rig = $('rig'); if (!rig) return;
    rig.hidden = false;
    var S = mk(defaultCfg(), 21), timer = null, running = true, auto = false, look = makeLooker(33);
    var SIG = [['exposure', 'Exposure', 0, 1, 0.05], ['uncertainty', 'Uncertainty', 0, 1, 0.05], ['recovery', 'Recovery (safe)', 0, 1, 0.05]];
    var RULES = [['prob', 'Probability', 0, 1, 0.05], ['minT', 'Min tension', 0, 100, 1], ['delay', 'Unseen delay s', 0, 20, 1],
                 ['cooldown', 'Object cooldown s', 0, 60, 1], ['recSec', 'Recovery window s', 0, 40, 1]];
    var WTS = [['wE', 'ExposureWeight', 0, 1, 0.05], ['wU', 'UncertaintyWt', 0, 1, 0.05], ['wP', 'RecentPressureWt', 0, 1, 0.05], ['wR', 'RecoveryWeight*', 0, 1, 0.05]];
    var sliders = {};

    function addRows(host, list) {
      list.forEach(function (d) {
        var row = document.createElement('div'); row.className = 'row';
        var id = 'sl_' + d[0];
        row.innerHTML = '<label for="' + id + '">' + d[1] + '</label><input type="range" id="' + id + '" min="' + d[2] + '" max="' + d[3] + '" step="' + d[4] + '"><output></output>';
        var inp = row.querySelector('input'), out = row.querySelector('output');
        function upd() { S.cfg[d[0]] = parseFloat(inp.value); out.textContent = d[4] < 1 ? (+inp.value).toFixed(2) : inp.value; }
        inp.value = S.cfg[d[0]]; upd();
        inp.addEventListener('input', upd);
        sliders[d[0]] = { inp: inp, upd: upd };
        host.appendChild(row);
      });
    }
    addRows($('sigs'), SIG);
    addRows($('rules'), RULES);
    var wh = document.createElement('div'); wh.innerHTML = '<p class="lbl" style="margin-top:16px">Weights <small>(* RecoveryWeight is mine, not in the dossier)</small></p>';
    $('rules').appendChild(wh); addRows($('rules'), WTS);

    /* enabled + allowed event types */
    var al = $('allow');
    var en = document.createElement('label'); en.innerHTML = '<input type="checkbox" checked> Events enabled'; al.appendChild(en);
    en.querySelector('input').addEventListener('change', function (e) { S.cfg.enabled = e.target.checked; });
    EVENT_TYPES.forEach(function (ev) {
      var l = document.createElement('label'); l.innerHTML = '<input type="checkbox" checked> ' + ev; al.appendChild(l);
      l.querySelector('input').addEventListener('change', function (e) { S.cfg.allow[ev] = e.target.checked; });
    });

    /* tiles */
    var tiles = $('tiles'), tileEls = {};
    S.objs.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tile'; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<b>' + o.id + '</b><span class="ev">' + o.allowed.join(' · ') + '</span><span class="rs">—</span><span class="bar"><i></i></span>';
      b.addEventListener('click', function () { setFocus(o.id); });
      tiles.appendChild(b); tileEls[o.id] = b;
    });
    var wall = $('bWall');
    wall.addEventListener('click', function () { setFocus(null); });
    function setFocus(id) {
      if (auto) toggleAuto(false);
      S.focus = id; paintFocus();
    }
    function paintFocus() {
      S.objs.forEach(function (o) { tileEls[o.id].setAttribute('aria-pressed', S.focus === o.id ? 'true' : 'false'); });
      wall.setAttribute('aria-pressed', S.focus === null ? 'true' : 'false');
    }

    var RS = { OBJECT_OBSERVED: 'observed', UNSEEN_DELAY: 'unseen', OBJECT_COOLDOWN: 'cooldown', EVENT_UNSUPPORTED: 'no allowed event', ELIGIBLE: 'ELIGIBLE', EXECUTING: 'EXECUTING' };
    function paint() {
      $('gVal').textContent = Math.round(S.tension);
      $('gBand').textContent = band(S.tension);
      $('gMark').style.left = 'calc(' + clamp(S.tension, 0, 100) + '% - 1px)';
      S.objs.forEach(function (o) {
        var el = tileEls[o.id], c = S.cfg;
        el.classList.toggle('elig', o.reason === 'ELIGIBLE');
        el.classList.toggle('exec', o.reason === 'EXECUTING');
        el.classList.toggle('obs', o.reason === 'OBJECT_OBSERVED');
        var txt = o.reason === 'UNSEEN_DELAY' ? 'UNSEEN_DELAY ' + o.unseen + '/' + c.delay + 's'
                : o.reason === 'OBJECT_COOLDOWN' ? 'OBJECT_COOLDOWN ' + o.cd + 's' : (o.reason || '—');
        el.querySelector('.rs').textContent = txt;
        el.querySelector('.bar i').style.width = clamp(o.unseen / Math.max(1, c.delay), 0, 1) * 100 + '%';
      });
      var rec = S.recent ? S.recent.id + ' / ' + S.recent.act + ' / ' + (S.t - S.recent.t) + 's ago' : '—';
      $('dbg').textContent =
        'TENSION LABORATORY — DIRECTOR DEBUG\n' +
        'Tension: ' + Math.round(S.tension) + ' / 100      Band: ' + band(S.tension) + '\n' +
        'Events enabled: ' + (S.cfg.enabled ? 'YES' : 'NO') + '    Recovery window: ' + (S.recWin > 0 ? 'YES (' + S.recWin + 's)' : 'NO') + '\n' +
        'Registered objects: ' + S.objs.length + '  Eligible objects: ' + S.eligN + '\n' +
        'Selected object: ' + (S.sel || '—') + '\n' +
        'Selected action: ' + (S.act || '—') + '\n' +
        'Decision: ' + S.decision + '\n' +
        'Recent event: ' + rec;
      /* log */
      var ol = $('log'); ol.innerHTML = '';
      var items = S.log.slice(-10).reverse();
      if (!items.length) { ol.innerHTML = '<li class="empty">Nothing decided yet.</li>'; }
      items.forEach(function (e) {
        var li = document.createElement('li');
        var ok = e.code === 'APPROVED';
        li.innerHTML = '<span class="t">' + e.t + 's</span><span class="' + (ok ? 'ok' : 'rej') + '">' +
          (ok ? 'APPROVED  ' + e.obj + ' → ' + e.extra : e.code + (e.obj ? '  (' + e.obj + ')' : '')) + '</span>' + (e.n > 1 ? '<span class="n">×' + e.n + '</span>' : '');
        ol.appendChild(li);
      });
      /* counts */
      var max = 1; CODES.forEach(function (c) { max = Math.max(max, S.counts[c]); });
      $('counts').innerHTML = CODES.map(function (c) {
        return '<div class="' + (c === 'APPROVED' ? 'ap' : '') + '"><span>' + c + '</span><span><i style="width:' + (S.counts[c] / max * 100) + '%"></i></span><b>' + S.counts[c] + '</b></div>';
      }).join('');
      drawHist();
    }
    function drawHist() {
      var cv = $('hist'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      [25, 50, 75].forEach(function (b) { var y = H - H * b / 100; ctx.strokeStyle = 'rgba(180,200,205,.14)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
      ctx.setLineDash([]);
      var h = S.hist, n = 120;
      ctx.beginPath();
      h.forEach(function (p, i) { var x = (i + (n - h.length)) / (n - 1) * W, y = H - H * p.v / 100; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2; ctx.stroke();
      h.forEach(function (p, i) { if (!p.ev) return; var x = (i + (n - h.length)) / (n - 1) * W; ctx.strokeStyle = 'rgba(229,72,77,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); });
    }

    function step() { if (auto) look(S); tick(S); paint(); }
    function loop() {
      clearInterval(timer);
      if (!running) return;
      timer = setInterval(step, 1000 / parseFloat($('bSpeed').value));
    }
    $('bSpeed').addEventListener('change', loop);
    $('bRun').addEventListener('click', function () { running = !running; this.textContent = running ? 'Pause' : 'Run'; loop(); });
    $('bReset').addEventListener('click', function () {
      var cfg = S.cfg, f = S.focus; S = mk(cfg, 21); S.focus = f; look = makeLooker(33); paintFocus(); paint();
    });
    function toggleAuto(on) {
      auto = on; var b = $('bAuto'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = 'Simulated player: ' + (on ? 'on' : 'off');
    }
    $('bAuto').addEventListener('click', function () { toggleAuto(!auto); });
    document.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = PRESETS[b.getAttribute('data-preset')];
        for (var k in p) { S.cfg[k] = p[k]; if (sliders[k]) { sliders[k].inp.value = p[k]; sliders[k].upd(); } }
      });
    });
    $('bCmp').addEventListener('click', function () {
      var a = run('A', 180, 11), b = run('B', 180, 11);
      function f(v, d) { return v === null ? '—' : (d ? v.toFixed(d) : String(v)); }
      var rows = [
        ['Approved events', f(a.events), f(b.events)],
        ['Events per minute', f(a.perMin, 1), f(b.perMin, 1)],
        ['Longest quiet stretch (s)', f(a.longestQuiet), f(b.longestQuiet)],
        ['Shortest gap between events (s)', f(a.shortestGap), f(b.shortestGap)],
        ['Ticks blocked by RECOVERY_ACTIVE', f(a.recovery), f(b.recovery)],
        ['Ticks with NO_CANDIDATES', f(a.nocand), f(b.nocand)],
        ['Rolls lost (PROBABILITY_ROLL_FAILED)', f(a.roll), f(b.roll)]
      ];
      document.querySelector('#cmpTbl tbody').innerHTML = rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('');
    });

    paintFocus(); paint(); loop();
    /* pause when off-screen */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (!running) return;
        if (e[0].isIntersecting) loop(); else clearInterval(timer);
      }).observe(rig);
    }
    window.TL_bench = { get S() { return S; }, setFocus: setFocus, step: step };
  }

  function init() { initReveal(); initNav(); initHero(); initArch(); initBench(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
