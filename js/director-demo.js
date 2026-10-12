/* ------------------------------------------------------------------
   director-demo.js: a small, simplified web simulation of the
   Unreliable Reality idea (objects request events, a central
   director approves or denies them based on tension, cooldowns and
   chance). It is an illustration for the homepage, NOT the Unreal
   implementation. Tweak the numbers in CONFIG to change the feel.
------------------------------------------------------------------- */

(function () {
  "use strict";

  var root = document.getElementById("director");
  if (!root) return;

  var CONFIG = {
    tickMs: 400,          // how often the simulation updates
    idleRise: 0.9,        // tension gained per tick while nothing happens
    releaseAt: 88,        // above this the director forces a release phase
    releaseUntil: 42,     // release ends once tension falls below this
    releaseFall: 2.4,     // tension lost per tick during release
    busyMs: 1200,         // an approved event blocks new ones for this long
    requestEveryMs: [1500, 2700], // min/max gap between automatic requests
    historyLength: 60
  };

  var OBJECTS = {
    painting: { event: "object_change", cooldown: 9000,  bump: [9, 14] },
    chair:    { event: "object_moved",  cooldown: 8000,  bump: [7, 12] },
    light:    { event: "flicker",       cooldown: 5000,  bump: [4, 8]  },
    door:     { event: "state_change",  cooldown: 12000, bump: [11, 16] }
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var el = {
    val: document.getElementById("tVal"),
    state: document.getElementById("tState"),
    fill: document.getElementById("tFill"),
    line: document.getElementById("tLine"),
    log: document.getElementById("dirLog"),
    toggle: document.getElementById("dirToggle"),
    buttons: root.querySelectorAll(".obj")
  };

  var sim = {
    tension: 22,
    release: false,
    busyUntil: 0,
    lastFired: {},
    history: [],
    startedAt: Date.now(),
    nextRequestAt: 0,
    running: !reduceMotion,
    visible: true
  };

  /* ---------- helpers ---------- */

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function clock() {
    var s = Math.floor((Date.now() - sim.startedAt) / 1000);
    var m = Math.floor(s / 60);
    return String(m).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  function stateName() {
    if (sim.release) return "release";
    if (sim.tension < 25) return "calm";
    if (sim.tension < 50) return "unease";
    if (sim.tension < 72) return "pressure";
    return "peak";
  }

  /* ---------- log ---------- */

  function addLog(kind, parts) {
    var line = document.createElement("div");
    line.className = "ln " + kind;

    var t = document.createElement("time");
    t.textContent = clock();
    line.appendChild(t);

    parts.forEach(function (p) {
      var node = document.createElement(p.tag || "span");
      node.textContent = p.text;
      line.appendChild(node);
    });

    el.log.appendChild(line);
    while (el.log.children.length > 7) el.log.removeChild(el.log.firstChild);
  }

  /* ---------- the "director" ---------- */

  function evaluate(name, now) {
    var cfg = OBJECTS[name];
    var since = now - (sim.lastFired[name] || -Infinity);

    if (since < cfg.cooldown) {
      return { ok: false, why: "cooldown " + Math.ceil((cfg.cooldown - since) / 1000) + "s" };
    }
    if (now < sim.busyUntil) return { ok: false, why: "another event is playing" };
    if (sim.release) return { ok: false, why: "release phase, let the player breathe" };

    // low tension: hold back. high tension: more willing. never certain.
    var p = clamp((sim.tension - 8) / 70, 0.12, 0.85);
    if (Math.random() > p) return { ok: false, why: "not the right moment" };

    return { ok: true };
  }

  function request(name) {
    var cfg = OBJECTS[name];
    var now = Date.now();

    addLog("req", [
      { text: name, tag: "em" },
      { text: " requests " + cfg.event }
    ]);

    var verdict = evaluate(name, now);

    if (!verdict.ok) {
      addLog("no", [
        { text: "director: " },
        { text: "DENIED", tag: "b" },
        { text: " (" + verdict.why + ")" }
      ]);
      return;
    }

    var bump = Math.round(rand(cfg.bump[0], cfg.bump[1]));
    sim.lastFired[name] = now;
    sim.busyUntil = now + CONFIG.busyMs;
    sim.tension = clamp(sim.tension + bump, 0, 100);

    addLog("ok", [
      { text: "director: " },
      { text: "APPROVED", tag: "b" }
    ]);
    addLog("evt", [{ text: "event: " + name + "." + cfg.event + "  tension +" + bump }]);

    if (sim.tension >= CONFIG.releaseAt) {
      sim.release = true;
      addLog("sys", [{ text: "director: peak reached, entering release" }]);
    }

    var btn = root.querySelector('.obj[data-obj="' + name + '"]');
    if (btn) {
      btn.classList.remove("fire");
      void btn.offsetWidth; // restart the animation
      btn.classList.add("fire");
      setTimeout(function () { btn.classList.remove("fire"); }, 800);
    }

    render();
  }

  /* ---------- simulation tick ---------- */

  function tick() {
    var now = Date.now();

    if (sim.release) {
      sim.tension -= CONFIG.releaseFall;
      if (sim.tension <= CONFIG.releaseUntil) {
        sim.release = false;
        addLog("sys", [{ text: "director: release complete, building again" }]);
      }
    } else if (now >= sim.busyUntil) {
      sim.tension += CONFIG.idleRise;
    }
    sim.tension = clamp(sim.tension, 0, 100);

    if (sim.running && now >= sim.nextRequestAt) {
      var names = Object.keys(OBJECTS);
      request(names[Math.floor(Math.random() * names.length)]);
      sim.nextRequestAt = now + rand(CONFIG.requestEveryMs[0], CONFIG.requestEveryMs[1]);
    }

    render();
  }

  /* ---------- drawing ---------- */

  function render() {
    var now = Date.now();
    var shown = Math.round(sim.tension);
    var name = stateName();

    root.setAttribute("data-state", name);
    el.val.textContent = shown;
    el.state.textContent = name.toUpperCase();
    el.fill.style.width = sim.tension + "%";

    sim.history.push(sim.tension);
    if (sim.history.length > CONFIG.historyLength) sim.history.shift();
    var step = 120 / (CONFIG.historyLength - 1);
    var offset = (CONFIG.historyLength - sim.history.length) * step;
    el.line.setAttribute("points", sim.history.map(function (v, i) {
      return (offset + i * step).toFixed(1) + "," + (26.5 - (v / 100) * 25).toFixed(1);
    }).join(" "));

    el.buttons.forEach(function (btn) {
      var cfg = OBJECTS[btn.getAttribute("data-obj")];
      var left = cfg.cooldown - (now - (sim.lastFired[btn.getAttribute("data-obj")] || -Infinity));
      var cd = btn.querySelector(".cd");
      if (left > 0) {
        btn.classList.add("cooling");
        cd.textContent = "cooldown " + Math.ceil(left / 1000) + "s";
      } else {
        btn.classList.remove("cooling");
        cd.textContent = "ready";
      }
    });
  }

  /* ---------- wiring ---------- */

  el.buttons.forEach(function (btn) {
    btn.addEventListener("click", function () { request(btn.getAttribute("data-obj")); });
  });

  function setRunning(on) {
    sim.running = on;
    el.toggle.textContent = on ? "Pause" : "Run";
    el.toggle.setAttribute("aria-pressed", String(!on));
    if (on) sim.nextRequestAt = Date.now() + 800;
  }
  el.toggle.addEventListener("click", function () { setRunning(!sim.running); });

  // run the clock only while the console is on screen and the tab is visible
  var timer = null;
  function sync() {
    var shouldRun = sim.visible && !document.hidden;
    if (shouldRun && !timer) timer = setInterval(tick, CONFIG.tickMs);
    if (!shouldRun && timer) { clearInterval(timer); timer = null; }
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      sim.visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.1 }).observe(root);
  }
  document.addEventListener("visibilitychange", sync);

  /* ---------- start ---------- */

  addLog("sys", [{ text: "director: online, waiting for requests" }]);
  sim.history = [sim.tension];
  setRunning(sim.running);
  if (reduceMotion) {
    addLog("sys", [{ text: "auto mode is off (reduced motion). Click an object." }]);
  }
  sim.nextRequestAt = Date.now() + 1200;
  render();
  sync();
})();
