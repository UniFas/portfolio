/* Portfolio section hubs: reveal, pointer light, and per-theme interactions */
(function () {
  "use strict";
  var b = document.body;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  /* scroll reveal */
  var rv = [].slice.call(document.querySelectorAll(".rv"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    rv.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + "ms"; io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add("in"); });

  /* pointer light (flashlight / lantern) */
  window.addEventListener("pointermove", function (e) {
    b.style.setProperty("--mx", e.clientX + "px");
    b.style.setProperty("--my", e.clientY + "px");
  }, { passive: true });

  /* ---------------- SD: Fear Index console ---------------- */
  if (b.classList.contains("hub-sd")) {
    var meter = document.querySelector(".fear-meter");
    var val = document.querySelector(".fm-val");
    var cards = [].slice.call(document.querySelectorAll(".hub-card[data-fear]"));
    var fear = 8, target = 8, t0 = performance.now(), hover = false;
    var COL = ["#5de8d4", "#d9e85d", "#ffa24d", "#ff3d7a"];
    function render() {
      var st = fear < 25 ? 0 : fear < 50 ? 1 : fear < 75 ? 2 : 3;
      b.style.setProperty("--fear", (fear / 100).toFixed(3));
      meter.style.setProperty("--pct", fear.toFixed(1) + "%");
      meter.style.setProperty("--sc", COL[st]);
      meter.dataset.state = st;
      val.textContent = ("00" + Math.round(fear)).slice(-3);
    }
    cards.forEach(function (c) {
      var on = function () { hover = true; target = +c.dataset.fear; };
      var off = function () { hover = false; };
      c.addEventListener("pointerenter", on); c.addEventListener("focus", on);
      c.addEventListener("pointerleave", off); c.addEventListener("blur", off);
    });
    (function tick(now) {
      if (!hover) target = reduce ? 8 : 14 + 11 * Math.sin((now - t0) / 1700) + 5 * Math.sin((now - t0) / 530);
      fear += (target - fear) * 0.06;
      render();
      requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------------- ND: guild scribe ---------------- */
  if (b.classList.contains("hub-nd")) {
    var say = document.querySelector(".scribe .say");
    var timer;
    function type(text) {
      clearInterval(timer);
      if (reduce) { say.textContent = text; return; }
      var i = 0; say.textContent = "";
      timer = setInterval(function () {
        say.textContent = text.slice(0, ++i);
        if (i >= text.length) clearInterval(timer);
      }, 16);
    }
    type(say.dataset.line);
    var nd = [].slice.call(document.querySelectorAll(".hub-card"));
    [].slice.call(document.querySelectorAll(".choices button")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = nd[+btn.dataset.card];
        type(btn.dataset.reply);
        nd.forEach(function (c) { c.classList.remove("called"); });
        card.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
        setTimeout(function () { card.classList.add("called"); }, reduce ? 0 : 450);
        setTimeout(function () { card.classList.remove("called"); }, 3200);
      });
    });
  }

  /* ---------------- GD: gameplay loop ---------------- */
  if (b.classList.contains("hub-gd")) {
    var dot = document.querySelector(".loop .dot");
    var nodes = [].slice.call(document.querySelectorAll(".loop .node"));
    var cap = document.querySelector(".loop .sub");
    var NOTE = ["player acts", "rules respond", "world answers", "player earns"];
    var forced = -1, ang = -Math.PI / 2, last = performance.now(), R = 100, C = 130;
    var gcards = [].slice.call(document.querySelectorAll(".hub-card[data-node]"));
    gcards.forEach(function (c) {
      var on = function () { forced = +c.dataset.node; };
      var off = function () { forced = -1; };
      c.addEventListener("pointerenter", on); c.addEventListener("focus", on);
      c.addEventListener("pointerleave", off); c.addEventListener("blur", off);
    });
    (function tick(now) {
      var dt = Math.min(now - last, 60); last = now;
      var cur;
      if (forced >= 0) {
        var tgt = -Math.PI / 2 + forced * Math.PI / 2;
        var d = Math.atan2(Math.sin(tgt - ang), Math.cos(tgt - ang));
        ang += d * 0.12; cur = forced;
      } else {
        if (!reduce) ang += dt * 0.0011;
        var q = ((ang + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        cur = Math.round(q / (Math.PI / 2)) % 4;
      }
      dot.setAttribute("cx", (C + R * Math.cos(ang)).toFixed(1));
      dot.setAttribute("cy", (C + R * Math.sin(ang)).toFixed(1));
      nodes.forEach(function (n, i) { n.classList.toggle("on", i === cur); });
      cap.textContent = NOTE[cur];
      requestAnimationFrame(tick);
    })(last);
  }
})();
