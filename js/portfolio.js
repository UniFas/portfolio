/* ------------------------------------------------------------------
   portfolio.js: Portfolio page behaviour.
     - game filter (reads data-tags on each .game card)
     - filter counts, and a filter with zero games hides itself
     - stats at the top are counted from the page, so they stay true
       when you add a game or a jam
   Needs js/dev-home.js too (menu, reveal, spotlight).
------------------------------------------------------------------- */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var grid = document.getElementById("gamesGrid");
  var status = document.getElementById("gamesStatus");
  var games = grid ? Array.prototype.slice.call(grid.querySelectorAll(".game")) : [];
  var filters = Array.prototype.slice.call(document.querySelectorAll(".pf-filter"));

  function tagsOf(card) {
    return (card.getAttribute("data-tags") || "").split(/\s+/).filter(Boolean);
  }

  /* ---------- filter ---------- */

  function countFor(filter) {
    if (filter === "all") return games.length;
    return games.filter(function (g) { return tagsOf(g).indexOf(filter) !== -1; }).length;
  }

  filters.forEach(function (btn) {
    var n = countFor(btn.getAttribute("data-filter"));
    var badge = btn.querySelector(".n");
    if (badge) badge.textContent = String(n);
    // nothing to show for this filter yet: hide it instead of showing an empty result
    if (n === 0) btn.hidden = true;
  });

  function applyFilter(filter, label) {
    var shown = 0;
    games.forEach(function (g) {
      var match = filter === "all" || tagsOf(g).indexOf(filter) !== -1;
      g.hidden = !match;
      g.classList.remove("pop");
      if (match) {
        shown++;
        g.classList.add("in");
        if (!reduceMotion) {
          void g.offsetWidth; // restart the animation
          g.classList.add("pop");
        }
      }
    });
    if (status) {
      status.textContent = filter === "all"
        ? "Showing all " + shown + " games"
        : "Showing " + shown + " " + (shown === 1 ? "game" : "games") + " · " + label;
    }
  }

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var filter = btn.getAttribute("data-filter");
      filters.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      var label = btn.firstChild ? btn.firstChild.textContent : filter;
      applyFilter(filter, label);
    });
  });

  /* ---------- stats ---------- */

  var steamCount = games.filter(function (g) { return g.getAttribute("data-badge") === "steam"; }).length;
  var targets = {
    games: games.length,
    jams: document.querySelectorAll(".jams-grid .jam").length,
    steam: steamCount
  };

  function countUp(el, to) {
    if (reduceMotion || to === 0) { el.textContent = String(to); return; }
    var start = null;
    var dur = 900;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-stat]"), function (el) {
    var key = el.getAttribute("data-stat");
    if (!(key in targets)) return; // "cores" stays as written in the HTML
    countUp(el, targets[key]);
  });

  /* ---------- hero: let the first screen settle, then start the main card drawing ---------- */
  // The tension curve in the main core card draws once the card is revealed (CSS, via .in).
})();
