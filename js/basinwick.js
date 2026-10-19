/* Basinwick Shire page: reveal, scroll infection, ash, lightbox, quest state-machine sim */
(function () {
  "use strict";
  var b = document.body, $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) b.classList.add("calm");

  /* reveal */
  var rv = $$(".rv");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add("in"); });

  /* scroll-driven infection (the page itself is the debuff) */
  var hudVal = $("#infVal"), hudState = $("#infState"), calmBtn = $("#calmBtn");
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
    b.style.setProperty("--inf", p.toFixed(3));
    hudVal.textContent = Math.round(p * 100) + "%";
    hudState.textContent = p < .2 ? "Healthy" : p < .5 ? "Feverish" : p < .8 ? "Infected" : "Critical";
  }
  addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); onScroll();
  calmBtn.addEventListener("click", function () {
    var c = b.classList.toggle("calm");
    calmBtn.textContent = c ? "Effects: off" : "Effects: on";
  });
  if (reduce) calmBtn.textContent = "Effects: off";

  /* drifting ash / spores */
  var cv = $("#ash");
  if (cv && !reduce) {
    var cx = cv.getContext("2d"), W, H, P = [];
    var rs = function () { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    rs(); addEventListener("resize", rs);
    for (var i = 0; i < 70; i++) P.push({ x: Math.random() * 2000, y: Math.random() * 1200, r: Math.random() * 1.8 + .4, v: Math.random() * .35 + .1, d: Math.random() * 6 });
    (function loop(t) {
      if (!b.classList.contains("calm")) {
        cx.clearRect(0, 0, W, H);
        var inf = +getComputedStyle(b).getPropertyValue("--inf") || 0;
        P.forEach(function (q) {
          q.y += q.v; q.x += Math.sin(t / 1500 + q.d) * .25;
          if (q.y > H + 5) { q.y = -5; q.x = Math.random() * W; }
          cx.fillStyle = inf > .5 ? "rgba(170,205,80," + (.25 + inf * .3) + ")" : "rgba(235,200,150,.28)";
          cx.beginPath(); cx.arc(q.x % W, q.y, q.r, 0, 6.3); cx.fill();
        });
      } else cx.clearRect(0, 0, W, H);
      requestAnimationFrame(loop);
    })(0);
  }

  /* flowchart lightbox */
  var lb = $("#lb"), lbImg = $("img", lb), flow = $(".flow");
  if (flow) {
    var open = function () { lbImg.src = $("img", flow).src; lb.classList.add("on"); lb.scrollTo(0, 0); };
    flow.addEventListener("click", open);
    flow.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    lb.addEventListener("click", function () { lb.classList.remove("on"); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") lb.classList.remove("on"); });
  }

  /* ---------- quest state machine (illustrative model of the implementation notes) ---------- */
  var S, over;
  var el = {
    inf: $("#mInf"), infB: $("#mInfB"), host: $("#mHost"), hostB: $("#mHostB"),
    herbs: $("#iHerbs"), feathers: $("#iFeathers"), day: $("#iDay"), log: $("#simLog"), res: $("#simRes")
  };
  var END = { saved: 0, bitter: 1, collapse: 2, death: 3 };
  function log(t, c) {
    var p = document.createElement("p"); if (c) p.className = c; p.textContent = t;
    el.log.appendChild(p); el.log.scrollTop = el.log.scrollHeight;
  }
  function render() {
    el.inf.textContent = S.inf; el.infB.style.width = S.inf + "%";
    el.host.textContent = S.host; el.hostB.style.width = S.host + "%";
    el.herbs.textContent = S.herbs; el.feathers.textContent = S.feathers; el.day.textContent = S.day;
    $$(".acts button").forEach(function (bt) { bt.disabled = over; });
  }
  function reset() {
    S = { inf: 5, host: 20, herbs: 0, feathers: 0, day: 1, cure: "none", combat: false };
    over = false; el.log.innerHTML = ""; el.res.textContent = "";
    $$(".endings li").forEach(function (li) { li.classList.remove("reached"); });
    log("Day 1. Basinwick Shire is quiet in the wrong way. Villagers are dying, and the cure depends entirely on you.");
    render();
  }
  function finish(k, msg) {
    over = true;
    var names = ["Village Saved", "Bittersweet Survival", "Village Collapse", "Player Death"];
    log(msg, "end"); el.res.textContent = "Ending: " + names[k];
    $$(".endings li").forEach(function (li, i) { li.classList.toggle("reached", i === k); });
    render();
  }
  function tick(infAdd, label) {
    S.inf = Math.min(100, S.inf + infAdd); S.day++;
    if (S.host >= 70) {
      log("Hostility threshold reached. Villagers turn on you: combat triggers.", "warn");
      S.inf = Math.min(100, S.inf + 10);
    }
    if (S.inf >= 100) { render(); return finish(END.death, "The infection overtakes you. The village will never know whether you were savior or catalyst."); }
    render();
  }
  var ACT = {
    herbs: function () { S.herbs++; log("You forage wild herbs along the plague road. The air is thick."); tick(7); },
    feathers: function () { S.feathers++; log("You climb toward the cave mouth and gather feathers. Something shifts below.", ""); tick(7); },
    comfort: function () { S.host = Math.max(0, S.host - 15); log("You sit with the sick and listen. Faces soften a little.", "good"); tick(5); },
    accuse: function () { S.host = Math.min(100, S.host + 25); log("You point a finger. Doors close. Fear travels faster than the sickness.", "warn"); tick(3); },
    brew: function () {
      if (S.herbs >= 3 && S.feathers >= 2) {
        if (S.host < 60) return finish(END.saved, "The cure takes. Villagers remember what you did, and how you treated them.");
        return finish(END.bitter, "The cure works, but too many have turned against you. Several villagers are already gone.");
      }
      if (S.herbs >= 2 && S.feathers >= 1) return finish(END.bitter, "An incomplete cure. It saves some, not all. Several villagers die.");
      finish(END.collapse, "The mixture is useless, even harmful. The cure is misused and the village collapses.");
    },
    abandon: function () { finish(END.collapse, "You walk away. Behind you, Basinwick Shire stops answering its own bells."); }
  };
  $$(".acts button").forEach(function (bt) {
    bt.addEventListener("click", function () { if (!over && ACT[bt.dataset.act]) ACT[bt.dataset.act](); });
  });
  $("#simReset").addEventListener("click", reset);
  reset();
  window.BW = { get state() { return S; }, act: function (a) { ACT[a](); }, get over() { return over; } };
})();
