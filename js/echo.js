/* Echo Mechanic page: ripples, reveal, lightbox and the playable pulse demo */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* reveal */
  var rv = $$(".rv");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add("in"); });

  /* background ripples: click/tap anywhere (outside controls) sends a pulse */
  var bg = $("#ripples"), bx = bg.getContext("2d"), BW, BH, rings = [];
  function bsize() { BW = bg.width = innerWidth; BH = bg.height = innerHeight; }
  bsize(); addEventListener("resize", bsize);
  function ripple(x, y, col) { rings.push({ x: x, y: y, r: 0, c: col || "94,231,255" }); }
  addEventListener("pointerdown", function (e) {
    if (e.target.closest("a,button,iframe,canvas,input")) return;
    ripple(e.clientX, e.clientY);
  });
  if (!reduce) {
    setTimeout(function () { ripple(BW * .75, BH * .3); }, 700);
    setInterval(function () { if (!document.hidden) ripple(Math.random() * BW, Math.random() * BH * .8, Math.random() < .12 ? "255,77,87" : "94,231,255"); }, 4200);
  }
  var bl = performance.now();
  (function bloop(t) {
    var dt = Math.min(.05, (t - bl) / 1000); bl = t;
    bx.clearRect(0, 0, BW, BH);
    for (var i = rings.length - 1; i >= 0; i--) {
      var q = rings[i]; q.r += 260 * dt;
      var a = Math.max(0, .28 * (1 - q.r / 700));
      if (a <= 0) { rings.splice(i, 1); continue; }
      bx.strokeStyle = "rgba(" + q.c + "," + a + ")"; bx.lineWidth = 2;
      bx.beginPath(); bx.arc(q.x, q.y, q.r, 0, 6.2832); bx.stroke();
    }
    requestAnimationFrame(bloop);
  })(bl);

  /* lightbox */
  var lb = $("#lb"), lbi = $("img", lb);
  $$("[data-zoom]").forEach(function (el) {
    el.addEventListener("click", function () { var im = $("img", el) || el; lbi.src = im.src; lbi.alt = im.alt; lb.classList.add("on"); });
  });
  lb.addEventListener("click", function () { lb.classList.remove("on"); });
  addEventListener("keydown", function (e) { if (e.key === "Escape") lb.classList.remove("on"); });

  /* ====================== PLAYABLE PULSE DEMO ====================== */
  var cv = $("#echoCv"); if (!cv) return;
  var cx = cv.getContext("2d");
  var T = 24, COLS = 31, ROWS = 19, W = COLS * T, H = ROWS * T;
  cv.width = W; cv.height = H;
  var msg = $("#demoMsg"), stPulse = $("#stPulse"), stTime = $("#stTime"), stCool = $("#stCool");
  var grid, litG, litD, litE, P, E, pulses, keys = {}, over, started, seen = false;
  var seed = 7;

  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function idx(c, r) { return r * COLS + c; }
  function wall(c, r) { return c < 0 || r < 0 || c >= COLS || r >= ROWS || grid[idx(c, r)] === 1; }

  function genMaze() {
    grid = new Uint8Array(COLS * ROWS).fill(1);
    var st = [[1, 1]]; grid[idx(1, 1)] = 0;
    var D = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    while (st.length) {
      var cur = st[st.length - 1], opts = [];
      D.forEach(function (d) { var nc = cur[0] + d[0], nr = cur[1] + d[1]; if (nc > 0 && nr > 0 && nc < COLS - 1 && nr < ROWS - 1 && grid[idx(nc, nr)] === 1) opts.push(d); });
      if (!opts.length) { st.pop(); continue; }
      var d = opts[Math.floor(rnd() * opts.length)];
      grid[idx(cur[0] + d[0] / 2, cur[1] + d[1] / 2)] = 0; grid[idx(cur[0] + d[0], cur[1] + d[1])] = 0;
      st.push([cur[0] + d[0], cur[1] + d[1]]);
    }
    // open a few extra loops so the labyrinth is not a single path
    for (var k = 0; k < 14; k++) { var c = 2 + Math.floor(rnd() * (COLS - 4)), r = 2 + Math.floor(rnd() * (ROWS - 4)); if ((c + r) % 2 === 1) grid[idx(c, r)] = 0; }
  }
  function openN(c, r) { return (wall(c + 1, r) ? 0 : 1) + (wall(c - 1, r) ? 0 : 1) + (wall(c, r + 1) ? 0 : 1) + (wall(c, r - 1) ? 0 : 1); }

  function reset(newSeed) {
    if (newSeed) seed = (Math.random() * 1e9) | 0;
    var s0 = seed; genMaze(); seed = s0 + 99;
    litG = new Float32Array(COLS * ROWS); litD = new Float32Array(COLS * ROWS); litE = new Float32Array(COLS * ROWS);
    P = { x: 1.5 * T, y: 1.5 * T, pulses: 0, cool: 0, t: 0, caught: 0 };
    E = { x: (COLS - 4.5) * T, y: (ROWS - 4.5) * T, path: [], vis: 0, nextPulse: 2.5, nextTele: 9 };
    E.x = Math.floor(E.x / T) * T + T / 2; E.y = Math.floor(E.y / T) * T + T / 2;
    if (wall(Math.floor(E.x / T), Math.floor(E.y / T))) { E.x = (COLS - 2.5) * T; E.y = (ROWS - 4.5) * T; }
    G = { x: (COLS - 1.5) * T, y: (ROWS - 1.5) * T, vis: 0, nextPing: 5, hint: 0 };
    pulses = []; over = false; started = false; warn = 0; msg.textContent = "Click the maze, then use WASD / arrows to move and Space or click to send a pulse.";
  }
  var G, warn = 0;

  function los(ox, oy, tx, ty, tc, tr) {
    var dx = tx - ox, dy = ty - oy, d = Math.hypot(dx, dy), n = Math.ceil(d / 3);
    for (var i = 1; i < n; i++) {
      var x = ox + dx * i / n, y = oy + dy * i / n, c = Math.floor(x / T), r = Math.floor(y / T);
      if (wall(c, r) && !(c === tc && r === tr)) return false;
    }
    return true;
  }
  function emit(kind, x, y, max, speed, global) {
    var tiles = [], c0 = Math.floor((x - max) / T), c1 = Math.floor((x + max) / T), r0 = Math.floor((y - max) / T), r1 = Math.floor((y + max) / T);
    for (var r = Math.max(0, r0); r <= Math.min(ROWS - 1, r1); r++) for (var c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) {
      var tx = (c + .5) * T, ty = (r + .5) * T, d = Math.hypot(tx - x, ty - y);
      if (d > max) continue;
      if (global ? wall(c, r) : los(x, y, tx, ty, c, r)) tiles.push({ i: idx(c, r), d: d, w: wall(c, r) });
    }
    pulses.push({ k: kind, x: x, y: y, r: 0, max: max, v: speed, tiles: tiles, hitP: false });
  }
  function playerPulse() {
    if (over || P.cool > 0) return;
    P.cool = 1.1; P.pulses++; started = true;
    emit("g", P.x, P.y, 175, 260, false);
  }

  function pathTo(sc, sr, tc, tr) {
    var prev = new Int16Array(COLS * ROWS).fill(-2), q = [idx(sc, sr)]; prev[q[0]] = -1;
    for (var h = 0; h < q.length; h++) {
      var cur = q[h], c = cur % COLS, r = (cur / COLS) | 0;
      if (c === tc && r === tr) break;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nc = c + d[0], nr = r + d[1]; if (!wall(nc, nr) && prev[idx(nc, nr)] === -2) { prev[idx(nc, nr)] = cur; q.push(idx(nc, nr)); } });
    }
    var out = [], k = idx(tc, tr); if (prev[k] === -2) return out;
    while (k !== -1) { out.push([(k % COLS + .5) * T, (((k / COLS) | 0) + .5) * T]); k = prev[k]; }
    return out.reverse().slice(1);
  }
  function enemyNewTarget() {
    var ec = Math.floor(E.x / T), er = Math.floor(E.y / T);
    for (var tries = 0; tries < 30; tries++) {
      var c = 1 + Math.floor(rnd() * (COLS - 2)), r = 1 + Math.floor(rnd() * (ROWS - 2));
      if (wall(c, r) || Math.hypot(c - ec, r - er) > 12) continue;
      E.path = pathTo(ec, er, c, r); if (E.path.length) return;
    }
  }
  function enemyTeleport() {
    var best = [];
    for (var r = 1; r < ROWS - 1; r++) for (var c = 1; c < COLS - 1; c++)
      if (!wall(c, r) && openN(c, r) >= 3 && Math.hypot((c + .5) * T - P.x, (r + .5) * T - P.y) > 7 * T) best.push([c, r]);
    if (!best.length) return;
    var n = best[Math.floor(rnd() * best.length)];
    E.x = (n[0] + .5) * T; E.y = (n[1] + .5) * T; E.path = []; E.vis = 0;
  }

  function move(dt) {
    var vx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), vy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (vx && vy) { vx *= .7071; vy *= .7071; }
    var sp = 95 * dt, rad = 6.2;
    function free(x, y) { return !(wall(Math.floor((x - rad) / T), Math.floor((y - rad) / T)) || wall(Math.floor((x + rad) / T), Math.floor((y - rad) / T)) || wall(Math.floor((x - rad) / T), Math.floor((y + rad) / T)) || wall(Math.floor((x + rad) / T), Math.floor((y + rad) / T))); }
    if (vx || vy) started = true;
    if (free(P.x + vx * sp, P.y)) P.x += vx * sp;
    if (free(P.x, P.y + vy * sp)) P.y += vy * sp;
  }

  function tick(dt) {
    if (over) return;
    P.t += dt; P.cool = Math.max(0, P.cool - dt); move(dt);
    // enemy: deaf, hyper-visual. Wanders, teleports through nodes, emits a danger pulse on its own rhythm.
    var sp = 52 * dt;
    if (!E.path.length) enemyNewTarget();
    if (E.path.length) {
      var t = E.path[0], dx = t[0] - E.x, dy = t[1] - E.y, d = Math.hypot(dx, dy);
      if (d <= sp) { E.x = t[0]; E.y = t[1]; E.path.shift(); } else { E.x += dx / d * sp; E.y += dy / d * sp; }
    }
    E.nextPulse -= dt; E.nextTele -= dt;
    if (E.nextPulse <= 0) { E.nextPulse = 3.4; emit("d", E.x, E.y, 190, 150, false); }
    if (E.nextTele <= 0) { E.nextTele = 9; enemyTeleport(); }
    G.nextPing -= dt;
    if (G.nextPing <= 0) { G.nextPing = 8; emit("e", G.x, G.y, 1000, 330, true); G.hint = 2.2; }
    G.hint = Math.max(0, G.hint - dt);
    // pulses
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i], pr = p.r; p.r += p.v * dt;
      p.tiles.forEach(function (t) {
        if (t.d > pr && t.d <= p.r) {
          var arr = p.k === "g" ? litG : p.k === "d" ? litD : litE;
          arr[t.i] = t.w ? 1 : .6;
        }
      });
      var pd = Math.hypot(P.x - p.x, P.y - p.y), ed = Math.hypot(E.x - p.x, E.y - p.y), gd = Math.hypot(G.x - p.x, G.y - p.y);
      if (p.k === "g") {
        if (ed > pr && ed <= p.r && los(p.x, p.y, E.x, E.y, -1, -1)) E.vis = 1.6;
        if (gd > pr && gd <= p.r && los(p.x, p.y, G.x, G.y, -1, -1)) G.vis = 2.5;
      }
      if (p.k === "e" && gd <= p.r) G.vis = Math.max(G.vis, .5);
      if (p.k === "d" && !p.hitP && pd > pr && pd <= p.r && los(p.x, p.y, P.x, P.y, -1, -1)) { p.hitP = true; warn = 1; msg.textContent = "Danger pulse crossed you: it can see you. Break line of sight."; }
      if (p.r > p.max) pulses.splice(i, 1);
    }
    [litG, litD, litE].forEach(function (a) { for (var k = 0; k < a.length; k++) if (a[k] > 0) a[k] = Math.max(0, a[k] - dt / 2.6); });
    E.vis = Math.max(0, E.vis - dt); G.vis = Math.max(0, G.vis - dt); warn = Math.max(0, warn - dt * 1.4);
    // outcomes
    if (Math.hypot(E.x - P.x, E.y - P.y) < 13) {
      P.caught++; P.x = 1.5 * T; P.y = 1.5 * T; E.vis = 0; msg.textContent = "Caught. The enemy sees you even when you can't see it. Back to the start.";
      enemyTeleport();
    }
    if (Math.hypot(G.x - P.x, G.y - P.y) < 13) { over = true; msg.textContent = "Elevator reached in " + P.t.toFixed(0) + "s with " + P.pulses + " pulses. Fewer pulses, more tension."; }
  }

  function draw() {
    cx.fillStyle = "#010207"; cx.fillRect(0, 0, W, H);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var i = idx(c, r), g = litG[i], d = litD[i], e = litE[i];
      if (g <= 0 && d <= 0 && e <= 0) continue;
      var w = grid[i] === 1;
      if (g > 0) { cx.fillStyle = "rgba(94,231,255," + (g * (w ? .85 : .55)) + ")"; fillT(c, r, w); }
      if (d > 0) { cx.fillStyle = "rgba(255,77,87," + (d * (w ? .8 : .5)) + ")"; fillT(c, r, w); }
      if (e > 0) { cx.fillStyle = "rgba(255,197,77," + (e * .7) + ")"; fillT(c, r, w); }
    }
    function fillT(c, r, wl) { if (wl) cx.fillRect(c * T + 1, r * T + 1, T - 2, T - 2); else cx.fillRect(c * T + T / 2 - 3, r * T + T / 2 - 3, 6, 6); }
    // rings
    pulses.forEach(function (p) {
      var col = p.k === "g" ? "94,231,255" : p.k === "d" ? "255,77,87" : "255,197,77";
      var a = Math.max(0, (p.k === "e" ? .35 : .75) * (1 - p.r / p.max));
      cx.strokeStyle = "rgba(" + col + "," + a + ")"; cx.lineWidth = p.k === "e" ? 3 : 2;
      cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.2832); cx.stroke();
    });
    // elevator
    if (G.vis > 0) { var ga = Math.min(1, G.vis); cx.fillStyle = "rgba(255,197,77," + ga + ")"; cx.fillRect(G.x - 8, G.y - 8, 16, 16); cx.strokeStyle = "rgba(255,255,255," + ga + ")"; cx.strokeRect(G.x - 8, G.y - 8, 16, 16); }
    // hint arrow
    if (G.hint > 0) {
      var ang = Math.atan2(G.y - P.y, G.x - P.x), ha = Math.min(1, G.hint);
      cx.save(); cx.translate(P.x + Math.cos(ang) * 22, P.y + Math.sin(ang) * 22); cx.rotate(ang);
      cx.fillStyle = "rgba(255,197,77," + ha + ")"; cx.beginPath(); cx.moveTo(8, 0); cx.lineTo(-5, -6); cx.lineTo(-2, 0); cx.lineTo(-5, 6); cx.closePath(); cx.fill(); cx.restore();
    }
    // enemy (only seen when lit)
    if (E.vis > 0) { var ea = Math.min(1, E.vis); cx.save(); cx.translate(E.x, E.y); cx.rotate(.785); cx.fillStyle = "rgba(255,77,87," + ea + ")"; cx.fillRect(-6, -6, 12, 12); cx.restore(); }
    // player
    cx.fillStyle = "#e8fbff"; cx.shadowColor = "#5ee7ff"; cx.shadowBlur = 12; cx.beginPath(); cx.arc(P.x, P.y, 4.6, 0, 6.2832); cx.fill(); cx.shadowBlur = 0;
    if (warn > 0) { cx.strokeStyle = "rgba(255,77,87," + warn * .8 + ")"; cx.lineWidth = 6; cx.strokeRect(3, 3, W - 6, H - 6); }
  }

  reset(false);
  var last = performance.now(), vis = false;
  new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: .15 }).observe(cv);
  (function loop(t) {
    var dt = Math.min(.05, (t - last) / 1000); last = t;
    if (vis) { tick(dt); stPulse.textContent = P.pulses; stTime.textContent = P.t.toFixed(0) + "s"; stCool.textContent = P.cool > 0 ? "recharging" : "ready"; }
    draw(); requestAnimationFrame(loop);
  })(last);

  var KM = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
  addEventListener("keydown", function (e) {
    if (!vis) return;
    if (KM[e.key]) { keys[KM[e.key]] = true; if (e.key.indexOf("Arrow") === 0) e.preventDefault(); }
    else if (e.key === " " && document.activeElement === cv) { e.preventDefault(); playerPulse(); }
    else if (e.key === " " && !/BUTTON|A|INPUT|IFRAME/.test(document.activeElement.tagName)) { e.preventDefault(); playerPulse(); }
  });
  addEventListener("keyup", function (e) { if (KM[e.key]) keys[KM[e.key]] = false; });
  addEventListener("blur", function () { keys = {}; });
  cv.addEventListener("pointerdown", function () { cv.focus({ preventScroll: true }); playerPulse(); });
  $$(".pad button").forEach(function (b) {
    var k = b.dataset.k;
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); keys[k] = true; });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { b.addEventListener(ev, function () { keys[k] = false; }); });
  });
  $("#btnPulse").addEventListener("click", playerPulse);
  $("#btnNew").addEventListener("click", function () { reset(true); });
  window.ECHO = { tick: tick, pulse: playerPulse, keys: keys, get P() { return P; }, get E() { return E; }, get G() { return G; }, get over() { return over; }, reset: reset, wall: wall };
})();
