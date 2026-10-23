/* Once Upon a Page: progress bar, reveal, journey book, sketch slider, card demo */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  /* reading progress (pencil line) */
  var bar = $("#oupProgress");
  function prog() {
    var h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (h > 0 ? Math.min(100, scrollY / h * 100) : 0) + "%";
  }
  addEventListener("scroll", prog, { passive: true }); prog();

  /* reveal + gallery sketch->colour */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".oup-reveal,.gallery figure").forEach(function (el) { io.observe(el); });
  } else $$(".oup-reveal,.gallery figure").forEach(function (el) { el.classList.add("in"); });

  /* sketch / reality slider */
  var xf = $("#xform");
  if (xf) {
    var rng = $("input", xf);
    var upd = function () { xf.style.setProperty("--cut", (100 - rng.value) + "%"); };
    rng.addEventListener("input", upd); upd();
  }

  /* ---------------- journey (turn the page) ---------------- */
  var tabs = $$(".j-tabs button"), pages = $$(".j-page"), path = $("#jPath");
  var cur = 0, busy = false, ringDone = false;
  function ring() {
    if (ringDone) return; ringDone = true;
    var f = $(".oup-ring .fill"), n = $("#oupRingNum");
    setTimeout(function () { f.style.strokeDashoffset = "0"; }, 150);
    var c = 0, t = setInterval(function () { c++; n.textContent = c + " / 7"; if (c >= 7) clearInterval(t); }, 200);
  }
  function go(i) {
    if (i === cur || i < 0 || i >= pages.length || busy) return;
    var old = pages[cur], nw = pages[i];
    busy = true;
    old.classList.remove("on"); old.classList.add("out");
    nw.classList.add("on");
    setTimeout(function () { old.classList.remove("out"); busy = false; }, reduce ? 0 : 480);
    cur = i;
    tabs.forEach(function (t, k) { t.setAttribute("aria-selected", k === i ? "true" : "false"); t.tabIndex = k === i ? 0 : -1; });
    path.style.setProperty("--p", (i / (pages.length - 1)).toFixed(2));
    $("#jPrev").disabled = i === 0; $("#jNext").disabled = i === pages.length - 1;
    $("#jNext").style.opacity = i === pages.length - 1 ? .4 : 1;
    if (i === 3) ring();
  }
  tabs.forEach(function (t, k) {
    t.addEventListener("click", function () { go(k); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { go(Math.min(pages.length - 1, cur + 1)); tabs[cur].focus(); }
      if (e.key === "ArrowLeft") { go(Math.max(0, cur - 1)); tabs[cur].focus(); }
    });
  });
  $("#jPrev").addEventListener("click", function () { go(cur - 1); });
  $("#jNext").addEventListener("click", function () { go(cur + 1); });
  tabs.forEach(function (t, k) { t.tabIndex = k === 0 ? 0 : -1; });
  $("#jPrev").disabled = true;
  path.style.setProperty("--p", "0");

  /* youtube facade (loads the player only on click) */
  var fa = $("#ytFacade");
  if (fa) fa.addEventListener("click", function () {
    var f = document.createElement("iframe");
    f.src = "https://www.youtube.com/embed/" + fa.dataset.id + "?autoplay=1&rel=0";
    f.title = "Once Upon a Page, Unreal Engine prototype";
    f.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"; f.allowFullscreen = true;
    fa.innerHTML = ""; fa.appendChild(f); fa.style.cursor = "default";
  });

  /* ---------------- card demo ---------------- */
  var page = $("#dPage"); if (!page) return;
  var hand = $("#dHand"), slots = $$(".d-slot"), bubble = $("#dBubble"), count = $("#dCount"), toast = $("#dToast");
  var placed = 0, selected = null, bt;
  var JOKES = ["Hmm, not there. But the page giggles anyway.", "Oops! No harm done. Try another spot.", "The page tilts its head at that one.", "Wrong spot, right attitude!"];
  function say(t) {
    bubble.textContent = t; bubble.classList.add("on");
    clearTimeout(bt); bt = setTimeout(function () { bubble.classList.remove("on"); }, 2200);
  }
  function wiggle(el) {
    if (reduce || !el.animate) return;
    el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px) rotate(-3deg)" }, { transform: "translateX(8px) rotate(3deg)" }, { transform: "translateX(-5px)" }, { transform: "none" }], { duration: 450 });
  }
  function confetti() {
    if (reduce) return;
    var cols = ["#e0589c", "#f09a35", "#f6cf4a", "#5fb34f", "#3f9bc4"];
    for (var i = 0; i < 40; i++) {
      var c = document.createElement("i"); c.className = "conf";
      c.style.left = (30 + Math.random() * 40) + "vw"; c.style.top = "-20px";
      c.style.background = cols[i % cols.length]; c.style.setProperty("--dx", (Math.random() * 300 - 150) + "px");
      c.style.animationDelay = (Math.random() * .4) + "s";
      document.body.appendChild(c); setTimeout(function (el) { el.remove(); }.bind(null, c), 2400);
    }
  }
  function select(card) {
    $$(".d-card").forEach(function (c) { c.classList.remove("sel"); });
    selected = card; if (card) card.classList.add("sel");
  }
  function drop(card, target, x, y) {
    var k = card.dataset.k, slot = target && target.closest ? target.closest(".d-slot") : null;
    if (k === "boot") {
      var r = page.getBoundingClientRect(), s = document.createElement("div"); s.className = "d-sticker";
      var px = x != null ? x : r.left + r.width / 2, py = y != null ? y : r.top + r.height / 2;
      s.style.left = Math.max(8, Math.min(92, (px - r.left) / r.width * 100)) + "%"; s.style.top = Math.max(12, Math.min(88, (py - r.top) / r.height * 100)) + "%";
      s.style.setProperty("--r", (Math.random() * 40 - 20) + "deg");
      s.innerHTML = '<svg viewBox="0 0 100 100"><use href="#s-boot"/></svg>'; page.appendChild(s);
      say("A boot? The page adores it."); card.classList.add("used"); select(null); return;
    }
    if (!slot) { wiggle(card); select(null); return; }
    if (slot.dataset.want === k && !slot.classList.contains("done")) {
      slot.classList.add("done"); card.classList.add("used"); placed++; count.textContent = placed + " / 3 placed";
      say("Sketch to reality! " + { sheep: "Meadow filled.", chicken: "Coop filled.", sun: "Let there be light." }[k]);
      select(null);
      if (placed === 3) { setTimeout(function () { toast.classList.add("on"); confetti(); setTimeout(function () { toast.classList.remove("on"); }, 4200); }, 500); }
    } else {
      say(JOKES[Math.floor(Math.random() * JOKES.length)]); wiggle(slot.classList.contains("done") ? card : slot); select(null);
    }
  }
  /* tap-to-place (also keyboard) */
  $$(".d-card").forEach(function (card) {
    card.addEventListener("click", function () { if (card._dragged) { card._dragged = false; return; } select(selected === card ? null : card); });
  });
  slots.forEach(function (s) { s.addEventListener("click", function () { if (selected) drop(selected, s); }); });
  page.addEventListener("click", function (e) { if (selected && selected.dataset.k === "boot" && !e.target.closest(".d-slot")) drop(selected, null, e.clientX, e.clientY); });

  /* drag */
  $$(".d-card").forEach(function (card) {
    card.addEventListener("pointerdown", function (e) {
      if (card.classList.contains("used")) return;
      var sx = e.clientX, sy = e.clientY, ghost = null, moved = false;
      function mv(ev) {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (!moved) {
          moved = true; ghost = document.createElement("div"); ghost.className = "d-ghost";
          ghost.innerHTML = '<svg viewBox="' + $("svg", card).getAttribute("viewBox") + '"><use href="#s-' + card.dataset.k + '"/></svg>'; document.body.appendChild(ghost);
        }
        ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px";
        var t = document.elementFromPoint(ev.clientX, ev.clientY), sl = t && t.closest ? t.closest(".d-slot") : null;
        slots.forEach(function (s) { s.classList.toggle("hot", s === sl); });
      }
      function up(ev) {
        removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
        slots.forEach(function (s) { s.classList.remove("hot"); });
        if (!moved) return;
        card._dragged = true; setTimeout(function () { card._dragged = false; }, 50);
        var t = document.elementFromPoint(ev.clientX, ev.clientY); ghost.remove();
        var inPage = t && t.closest && t.closest("#dPage");
        drop(card, inPage ? t : null, ev.clientX, ev.clientY);
      }
      addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
    });
  });
  $("#dReset").addEventListener("click", function () {
    slots.forEach(function (s) { s.classList.remove("done"); });
    $$(".d-sticker").forEach(function (s) { s.remove(); });
    $$(".d-card").forEach(function (c) { c.classList.remove("used", "sel"); });
    placed = 0; selected = null; count.textContent = "0 / 3 placed"; bubble.classList.remove("on");
  });
  window.OUP = { go: go, drop: drop, get placed() { return placed; } };
})();
