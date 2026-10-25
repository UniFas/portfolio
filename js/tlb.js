/* The Things Left Behind: redacted file interactions. Vanilla JS. */
(function () {
  'use strict';

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Sheets fade in */
  function initReveal() {
    var els = document.querySelectorAll('.sheet, .dark');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* 2. Click a black bar: access denied */
  var MSGS = ['CLASSIFIED', 'NO ACCESS', 'WIP', 'NOT YET', 'REDACTED', 'LATER'];
  function initRedactions() {
    var n = 0;
    document.addEventListener('click', function (e) {
      var rd = e.target.closest && e.target.closest('.rd');
      if (!rd) return;
      rd.setAttribute('data-msg', MSGS[n++ % MSGS.length]);
      rd.classList.remove('denied');
      void rd.offsetWidth;
      rd.classList.add('denied');
      clearTimeout(rd._t);
      rd._t = setTimeout(function () { rd.classList.remove('denied'); }, 900);
    });
  }

  /* 3. Section nav highlight */
  function initNav() {
    var links = document.querySelectorAll('#tnav a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('on'); });
        var a = map[e.target.id];
        if (a) a.classList.add('on');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) io.observe(s);
    });
  }

  /* 4. The observation contract, on the page itself.
        The specimen only changes pose while it is out of view. */
  var POSES = [
    { h: 0,  la: 8,   ra: -8,  hx: 0 },
    { h: 7,  la: 8,   ra: -8,  hx: 1 },
    { h: 7,  la: 22,  ra: -8,  hx: 1 },
    { h: -9, la: 22,  ra: -30, hx: -1 },
    { h: -9, la: 3,   ra: -30, hx: -1 },
    { h: 14, la: 3,   ra: -4,  hx: 2 }
  ];
  function initSpecimen() {
    var fig = document.getElementById('specimen');
    if (!fig) return;
    var head = document.getElementById('mqHead');
    var la = document.getElementById('mqLA');
    var ra = document.getElementById('mqRA');
    var out = document.getElementById('mqCount');
    var all = document.getElementById('mqAll');
    var idx = 0, count = 0, seen = false, visible = false;

    function apply() {
      var p = POSES[idx];
      head.setAttribute('transform', 'rotate(' + p.h + ' 50 34)');
      la.setAttribute('transform', 'rotate(' + p.la + ' 34 52)');
      ra.setAttribute('transform', 'rotate(' + p.ra + ' 66 52)');
      all.setAttribute('transform', 'translate(' + p.hx + ' 0)');
    }
    function change() {
      if (!seen) return;              // nothing changes before it was ever observed
      idx = (idx + 1) % POSES.length;
      count++;
      out.textContent = count;
      apply();
    }
    apply();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var v = es[0].intersectionRatio > 0.55;
        if (v && !visible) { seen = true; }
        if (!v && visible) { change(); }        // looked away: it moved
        visible = v;
      }, { threshold: [0, 0.55, 1] }).observe(fig);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && visible) { change(); }
    });

    window.TLB_specimen = { get count() { return count; }, get idx() { return idx; } };
  }

  /* 5. Teaser: click to load (keeps the page light) */
  function initVideo() {
    document.querySelectorAll('.video[data-yt]').forEach(function (box) {
      var btn = box.querySelector('.vplay');
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (location.protocol === 'file:') {
          // YouTube refuses embeds without a referrer, so open it directly
          window.open('https://www.youtube.com/watch?v=' + box.getAttribute('data-yt'), '_blank', 'noopener');
          return;
        }
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube.com/embed/' + box.getAttribute('data-yt') + '?autoplay=1&rel=0';
        f.title = box.getAttribute('data-title') || 'Video';
        f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        box.appendChild(f);
        btn.remove();
      });
    });
  }

  /* 6. Locked GDD button */
  function initLocked() {
    var b = document.getElementById('gddBtn');
    if (!b || !b.classList.contains('locked')) return;
    b.addEventListener('click', function (e) { e.preventDefault(); });
  }

  function init() {
    initReveal(); initRedactions(); initNav(); initSpecimen(); initVideo(); initLocked();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
