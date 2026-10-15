/* ------------------------------------------------------------------
   cv.js: Resume / CV page behaviour.
     - timeline pictures open in a viewer (a native <dialog>)
     - "years in game dev" is worked out from the year in data-since,
       so it never goes stale
     - stat numbers count up once
   Needs js/dev-home.js too (menu, reveal, spotlight, typed prompt).
------------------------------------------------------------------- */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- picture viewer ---------- */

  var box = document.getElementById("lightbox");
  var boxImg = document.getElementById("lightboxImg");
  var boxCap = document.getElementById("lightboxCap");

  if (box && boxImg && typeof box.showModal === "function") {
    var lastTrigger = null;

    Array.prototype.forEach.call(document.querySelectorAll(".tl-thumb"), function (btn) {
      btn.addEventListener("click", function () {
        lastTrigger = btn;
        boxImg.src = btn.getAttribute("data-full");
        boxImg.alt = btn.getAttribute("data-alt") || "";
        boxCap.textContent = btn.getAttribute("data-alt") || "";
        box.showModal();
      });
    });

    // click outside the picture closes it
    box.addEventListener("click", function (e) {
      if (e.target === box) box.close();
    });

    box.addEventListener("close", function () {
      boxImg.removeAttribute("src");
      if (lastTrigger) lastTrigger.focus();
    });
  } else {
    // very old browser without <dialog>: open the picture in a new tab instead
    Array.prototype.forEach.call(document.querySelectorAll(".tl-thumb"), function (btn) {
      btn.addEventListener("click", function () { window.open(btn.getAttribute("data-full"), "_blank", "noopener"); });
    });
  }

  /* ---------- stats ---------- */

  function countUp(el, to) {
    if (reduceMotion || to <= 0) { el.textContent = String(to); return; }
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

  Array.prototype.forEach.call(document.querySelectorAll("[data-since]"), function (el) {
    var since = parseInt(el.getAttribute("data-since"), 10);
    if (!isNaN(since)) countUp(el, new Date().getFullYear() - since);
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-count]"), function (el) {
    var n = parseInt(el.getAttribute("data-count"), 10);
    if (!isNaN(n)) countUp(el, n);
  });
})();
