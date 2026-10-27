/* Twine & AI Stories page. Vanilla JS. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }

  /* 1. reveal */
  function initReveal() {
    var els = document.querySelectorAll('.sec, .cta');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.06 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* 2. passage-map nav: current passage + visited count */
  function initMap() {
    var links = document.querySelectorAll('#pmap a');
    var map = {}, seen = {};
    links.forEach(function (a) { map[a.getAttribute('data-id')] = a; });
    function mark(id) {
      links.forEach(function (a) { a.classList.remove('on'); });
      var a = map[id]; if (!a) return;
      a.classList.add('on'); a.classList.add('seen'); seen[id] = true;
      $('pmCount').textContent = Object.keys(seen).length;
    }
    mark('start');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { var s = $(id); if (s) io.observe(s); });
  }

  /* 3. genre filter for the adventures */
  function initLens() {
    var box = $('lens'), list = $('advList'); if (!box || !list) return;
    var cards = Array.prototype.slice.call(list.querySelectorAll('.adv'));
    var all = {};
    cards.forEach(function (c) { c.getAttribute('data-tags').split(',').forEach(function (t) { all[t] = true; }); });
    var active = {};
    Object.keys(all).sort().forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        if (active[t]) delete active[t]; else active[t] = true;
        b.setAttribute('aria-pressed', active[t] ? 'true' : 'false'); apply();
      });
      box.appendChild(b);
    });
    var clear = document.createElement('button'); clear.type = 'button'; clear.textContent = 'Clear';
    clear.addEventListener('click', function () {
      active = {}; box.querySelectorAll('button[aria-pressed]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); apply();
    });
    box.appendChild(clear);
    function apply() {
      var keys = Object.keys(active), hit = 0;
      cards.forEach(function (c) {
        var tags = c.getAttribute('data-tags').split(',');
        var ok = !keys.length || keys.every(function (k) { return tags.indexOf(k) > -1; });
        c.classList.toggle('dim', !ok); if (ok) hit++;
      });
      $('lensOut').textContent = keys.length
        ? hit + ' of ' + cards.length + ' adventures tagged ' + keys.join(' + ') + '.'
        : 'All ' + cards.length + ' adventures.';
    }
    window.TW_lens = { apply: apply };
  }

  /* 4. memory window illustration (a made-up story, not a measurement) */
  var FACTS = [
    { t: 1, f: 'You owe the Guild a debt.' },
    { t: 3, f: 'The old bridge is cursed.' },
    { t: 5, f: 'Tomas is lying to you.' },
    { t: 8, f: 'You lost your left glove.' },
    { t: 12, f: 'The wolf follows at night.' },
    { t: 16, f: 'The storm has not stopped.' }
  ];
  function initMemory() {
    var turn = $('memTurn'), win = $('memWin'), pin = $('memPin'), ul = $('facts'); if (!turn) return;
    var lis = FACTS.map(function (f) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="t"><span>Turn ' + f.t + '</span><em></em></span><span class="f">' + f.f + '</span>';
      ul.appendChild(li); return li;
    });
    function render() {
      var T = +turn.value, W = +win.value, P = pin.checked, known = 0, kept = 0;
      $('memTurnOut').textContent = T; $('memWinOut').textContent = W;
      FACTS.forEach(function (f, i) {
        var li = lis[i], st = li.querySelector('em');
        li.className = '';
        if (f.t > T) { li.className = 'notyet'; st.textContent = 'not yet'; return; }
        known++;
        var inView = (T - f.t) < W;
        if (inView || P) { li.className = 'in'; st.textContent = inView ? 'in view' : 'pinned'; kept++; }
        else { li.className = 'out'; st.textContent = 'may be forgotten'; }
      });
      $('memOut').textContent = known === 0 ? '' :
        kept + ' of ' + known + ' established facts still in view.' + (kept < known ? ' The story can now contradict the rest.' : '');
    }
    turn.addEventListener('input', render); win.addEventListener('input', render); pin.addEventListener('change', render);
    render();
    window.TW_mem = { render: render };
  }

  /* 5. GDD preview loads on click */
  function initPdf() {
    var b = $('pdfLoad'); if (!b) return;
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = '../Documents/ND_Shimmer in the Dark - Brief GDD.pdf'; f.title = 'Quest Design PDF'; f.loading = 'lazy';
      $('pdfBox').appendChild(f); b.remove();
    });
  }

  function init() { initReveal(); initMap(); initLens(); initMemory(); initPdf(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
