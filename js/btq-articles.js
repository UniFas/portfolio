/* btq-articles.js: sideways row of Beneath the Questline devlogs.
   The cards are already in the HTML. This file adds:
   - arrow buttons, drag-to-scroll on desktop, a progress bar
   - image fallbacks (large thumbnail -> small thumbnail -> placeholder)
   - newer articles from /api/indiedb?feed=game (silently skipped if the endpoint is missing) */
(function () {
  "use strict";

  var track = document.getElementById("btqTrack");
  if (!track) return;
  var wrap = document.getElementById("btqWrap");
  var prog = document.getElementById("btqProg");
  var prev = document.getElementById("btqPrev");
  var next = document.getElementById("btqNext");
  var arrows = document.getElementById("btqArrows");
  var hint = document.getElementById("btqHint");
  var countEl = document.getElementById("btqCount");
  var rangeEl = document.getElementById("btqRange");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- helpers ---------- */
  function make(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fmt(iso) {
    var d = new Date(iso); if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  function fmtMonth(iso) {
    return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  }
  function isIndieDb(u) { return typeof u === "string" && u.indexOf("https://www.indiedb.com/") === 0; }
  function isGame(u) { return typeof u === "string" && u.indexOf("https://www.indiedb.com/games/beneath-the-questline/") === 0; }
  function isMedia(u) { return typeof u === "string" && u.indexOf("https://media.indiedb.com/") === 0; }

  /* ---------- images ---------- */
  function armImage(img) {
    var ph = img.parentNode.querySelector(".dl-ph");
    img.addEventListener("load", function () { if (ph && ph.parentNode) ph.remove(); });
    img.addEventListener("error", function () {
      var fb = img.getAttribute("data-fallback");
      if (fb && img.src !== fb) { img.removeAttribute("data-fallback"); img.src = fb; }
      else img.remove();
    });
    if (img.complete && img.naturalWidth > 0 && ph && ph.parentNode) ph.remove();
  }
  Array.prototype.forEach.call(track.querySelectorAll(".dl-thumb img"), armImage);

  /* ---------- count + date range ---------- */
  function cards() { return Array.prototype.slice.call(track.querySelectorAll(".arc-card")); }
  function updateMeta() {
    var cs = cards();
    if (countEl) countEl.textContent = cs.length;
    var dates = cs.map(function (c) { return c.getAttribute("data-date"); }).filter(Boolean).sort();
    if (rangeEl && dates.length) {
      var a = fmtMonth(dates[0]), b = fmtMonth(dates[dates.length - 1]);
      rangeEl.textContent = a === b ? a : a + " – " + b;
    }
  }

  /* ---------- scrolling ---------- */
  function maxScroll() { return track.scrollWidth - track.clientWidth; }
  function update() {
    var max = maxScroll();
    var overflow = max > 4;
    if (arrows) arrows.hidden = !overflow;
    if (hint) hint.hidden = !overflow;
    wrap.classList.toggle("at-end", !overflow || track.scrollLeft >= max - 4);
    if (prev) prev.disabled = track.scrollLeft <= 4;
    if (next) next.disabled = track.scrollLeft >= max - 4;
    if (prog) {
      var visible = Math.min(1, track.clientWidth / Math.max(1, track.scrollWidth));
      prog.style.width = visible * 100 + "%";
      var pos = max > 0 ? track.scrollLeft / max : 0;
      prog.style.transform = "translateX(" + pos * (1 / visible - 1) * 100 + "%)";
    }
  }
  function by(dir) {
    var c = track.querySelector(".arc-card");
    var step = c ? (c.getBoundingClientRect().width + 18) * 2 : 300;
    track.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  }
  if (prev) prev.addEventListener("click", function () { by(-1); });
  if (next) next.addEventListener("click", function () { by(1); });
  track.addEventListener("scroll", function () { window.requestAnimationFrame(update); }, { passive: true });
  window.addEventListener("resize", update);

  /* drag with a mouse (touch and trackpads already scroll natively) */
  var down = false, startX = 0, startLeft = 0, moved = 0;
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    down = true; moved = 0; startX = e.clientX; startLeft = track.scrollLeft;
  });
  window.addEventListener("pointermove", function (e) {
    if (!down) return;
    var dx = e.clientX - startX; moved = Math.max(moved, Math.abs(dx));
    if (moved > 5) { track.classList.add("drag"); track.scrollLeft = startLeft - dx; }
  });
  function end() { if (!down) return; down = false; setTimeout(function () { track.classList.remove("drag"); }, 0); }
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  track.addEventListener("click", function (e) { if (moved > 5) { e.preventDefault(); moved = 0; } }, true);

  /* ---------- newer posts from the feed ---------- */
  function build(p) {
    var card = make("article", "dl-card arc-card"); card.setAttribute("data-date", p.date.slice(0, 10));
    var thumb = make("a", "dl-thumb"); thumb.href = p.link; thumb.target = "_blank"; thumb.rel = "noopener noreferrer";
    thumb.setAttribute("aria-label", "Read " + p.title + " on IndieDB");
    var ph = make("div", "dl-ph", "</>"); ph.setAttribute("aria-hidden", "true"); thumb.appendChild(ph);
    if (p.image) {
      var img = document.createElement("img"); img.alt = ""; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
      armImage.call(null, (function () { thumb.appendChild(img); return img; })()); img.src = p.image;
    }
    var m = /^(?:Devlog|Post)\s*#?(\d+)\s*[–-]?\s*(.*)$/.exec(p.title);
    if (m) thumb.appendChild(make("span", "arc-no", "#" + m[1]));
    var body = make("div", "dl-body");
    body.appendChild(make("div", "dl-date", fmt(p.date)));
    var h = make("h3"), a = make("a", "", m ? m[2] : p.title); a.href = p.link; a.target = "_blank"; a.rel = "noopener noreferrer"; h.appendChild(a); body.appendChild(h);
    var more = make("a", "dl-more", "Read on IndieDB ↗"); more.href = p.link; more.target = "_blank"; more.rel = "noopener noreferrer"; body.appendChild(more);
    card.appendChild(thumb); card.appendChild(body);
    return card;
  }

  function merge(posts) {
    var have = {};
    cards().forEach(function (c) { var a = c.querySelector("a.dl-thumb"); if (a) have[a.href] = c; });
    var fresh = [];
    posts.forEach(function (p) {
      /* only this game's articles: an older /api/indiedb ignores ?feed=game and sends the personal blog */
      if (!p || typeof p.title !== "string" || !isGame(p.link) || isNaN(new Date(p.date).getTime())) return;
      var existing = have[p.link];
      if (existing) {
        /* the feed knows the real image address: prefer it over my guess */
        var img = existing.querySelector(".dl-thumb img");
        if (img && isMedia(p.image) && img.getAttribute("src") !== p.image) { img.removeAttribute("data-fallback"); img.src = p.image; }
        return;
      }
      p.image = isMedia(p.image) ? p.image : null;
      fresh.push(p);
    });
    fresh.sort(function (a, b) { return b.date.localeCompare(a.date); });
    var first = track.firstElementChild;
    fresh.forEach(function (p) { track.insertBefore(build(p), first); });
    if (fresh.length) { updateMeta(); update(); }
  }

  if ("fetch" in window && location.protocol !== "file:") {
    var ctl = "AbortController" in window ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, 6000) : null;
    fetch("/api/indiedb?feed=game", { headers: { accept: "application/json" }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { if (d && Array.isArray(d.posts)) merge(d.posts); })
      .catch(function () { /* endpoint missing or offline: the built-in list stays */ })
      .then(function () { if (t) clearTimeout(t); });
  }

  updateMeta(); update();
  window.addEventListener("load", update);
  window.BTQ = { merge: merge, update: update };
})();
