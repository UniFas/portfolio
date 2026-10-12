/* ------------------------------------------------------------------
   dev-home.js: general behaviour for the homepage.
   Replaces js/menu.js on index.html (do not load both).
   Everything here is a progressive enhancement: the page reads fine
   without it.
------------------------------------------------------------------- */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- current year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- mobile navigation ---------- */
  var header = document.getElementById("header");
  var menuIcon = document.getElementById("menuIcon");
  var navbar = document.getElementById("navbar");

  function setMenu(open) {
    if (!menuIcon || !navbar) return;
    navbar.classList.toggle("active", open);
    menuIcon.setAttribute("aria-expanded", String(open));
    menuIcon.setAttribute("aria-label", open ? "Close navigation" : "Toggle navigation");
  }

  if (menuIcon && navbar) {
    menuIcon.addEventListener("click", function () {
      setMenu(!navbar.classList.contains("active"));
    });
    navbar.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- header border once scrolled ---------- */
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- cursor spotlight + card glow ---------- */
  if (finePointer && !reduceMotion) {
    var rafId = 0;
    var px = 0, py = 0;

    document.addEventListener("pointermove", function (e) {
      px = e.clientX; py = e.clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(function () {
        rafId = 0;
        var root = document.documentElement.style;
        root.setProperty("--mx", px + "px");
        root.setProperty("--my", py + "px");
      });
    }, { passive: true });

    document.querySelectorAll(".card-glow").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--cx", (e.clientX - r.left) + "px");
        card.style.setProperty("--cy", (e.clientY - r.top) + "px");
      }, { passive: true });
    });
  }

  /* ---------- typed terminal prompt ---------- */
  var promptEl = document.getElementById("promptText");
  var COMMANDS = [
    'francis.init("horror_systems")',
    'director.request("object_change")',
    'tension.build(); // then let go',
    'player.control = uncertain'
  ];

  if (promptEl && !reduceMotion) {
    var cmdIndex = 0;

    var typeCommand = function (text, done) {
      var i = 0;
      promptEl.textContent = "";
      (function step() {
        promptEl.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, 38 + Math.random() * 40);
        else setTimeout(done, 3600);
      })();
    };

    var eraseCommand = function (done) {
      (function step() {
        var t = promptEl.textContent;
        if (t.length > 0) { promptEl.textContent = t.slice(0, -1); setTimeout(step, 14); }
        else done();
      })();
    };

    var loop = function () {
      cmdIndex = (cmdIndex + 1) % COMMANDS.length;
      eraseCommand(function () { typeCommand(COMMANDS[cmdIndex], loop); });
    };

    // first command is already in the HTML; erase and retype it once for the effect
    setTimeout(function () {
      eraseCommand(function () { typeCommand(COMMANDS[0], loop); });
    }, 900);
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }
})();
