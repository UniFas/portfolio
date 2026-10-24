/* ==========================================================
   Horror Study Notes: small enhancements.
   The page reads fine without this file.
   ========================================================== */
(function () {
    'use strict';
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* reveal on scroll */
    function initReveal() {
        var els = $$('.rv');
        if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
        }, { threshold: .1, rootMargin: '0px 0px -6% 0px' });
        els.forEach(function (e) { io.observe(e); });
    }

    /* nav: appears after the hero, highlights the current section */
    function initNav() {
        var nav = $('#stNav'), hero = $('#top'); if (!nav) return;
        function onScroll() { nav.classList.toggle('show', window.scrollY > (hero ? hero.offsetHeight * .6 : 300)); }
        window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
        if (!('IntersectionObserver' in window)) return;
        var links = {}; $$('a', nav).forEach(function (a) { links[a.dataset.s] = a; });
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) {
                if (!e.isIntersecting) return;
                Object.keys(links).forEach(function (k) { links[k].classList.toggle('on', k === e.target.id); });
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        Object.keys(links).forEach(function (k) { var s = document.getElementById(k); if (s) io.observe(s); });
    }

    /* technique lens: dims the case studies that don't use the chosen techniques */
    function initLens() {
        var chips = $$('#lens .chip[data-k]'), cards = $$('.case'), out = $('#lensOut'), clear = $('#lensClear');
        if (!chips.length) return;
        var on = {};
        function title(c) { return $('.case-title', c).textContent; }
        function apply() {
            var keys = Object.keys(on).filter(function (k) { return on[k]; });
            clear.hidden = !keys.length;
            var hits = [];
            cards.forEach(function (c) {
                var tags = (c.dataset.tags || '').split(' ').filter(Boolean);
                var pending = c.dataset.pending === 'true';
                var match = keys.every(function (k) { return tags.indexOf(k) >= 0; });
                c.classList.toggle('dim', keys.length > 0 && !match && !pending);
                c.classList.toggle('hit', keys.length > 0 && match && !pending);
                if (keys.length && match && !pending) hits.push(title(c));
            });
            if (!keys.length) { out.textContent = ''; return; }
            out.textContent = hits.length
                ? (hits.length + ' of ' + cards.filter(function (c) { return c.dataset.pending !== 'true'; }).length + ' studied games: ' + hits.join(' · '))
                : 'No game in these notes uses all of those together.';
        }
        chips.forEach(function (b) {
            b.addEventListener('click', function () {
                on[b.dataset.k] = !on[b.dataset.k];
                b.setAttribute('aria-pressed', on[b.dataset.k] ? 'true' : 'false');
                apply();
            });
        });
        clear.addEventListener('click', function () {
            on = {}; chips.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); apply();
        });
        window.ST_lens = { state: function () { return on; } };
    }

    /* the room: inspect three things, the threat is never shown */
    function initRoom() {
        var scene = $('#scene'); if (!scene) return;
        var hots = $$('.hot', scene), clues = $$('.clue'), seen = {};
        var fill = $('#dreadFill'), val = $('#dreadVal'), note = $('#dreadNote'), meter = $('.dread-bar');
        var notes = ['Illustration, not a measurement.', 'Something is wrong, and nothing has appeared yet.', 'Two clues in. The room feels different.', 'Three clues, and the threat was never shown.'];
        function show(i) {
            hots.forEach(function (h) { h.classList.toggle('on', +h.dataset.c === i); });
            clues.forEach(function (c) { c.classList.toggle('on', +c.dataset.c === i); });
            hots[i].classList.add('seen'); seen[i] = true;
            var em = $('#clueEmpty'); if (em) em.classList.add('gone');
            var n = Object.keys(seen).length;
            fill.style.width = (n / 3 * 100) + '%';
            val.textContent = n + ' / 3 clues';
            meter.setAttribute('aria-valuenow', n);
            note.textContent = notes[n];
            scene.style.setProperty('--noise', (.45 + n * .17).toFixed(2));
        }
        hots.forEach(function (h) { h.addEventListener('click', function () { show(+h.dataset.c); }); });
        window.ST_room = { seen: function () { return Object.keys(seen).length; } };

        /* the window's static: low-res noise, paused when off-screen */
        var cv = $('#noise'); if (!cv || !cv.getContext) return;
        var ctx = cv.getContext('2d'), w = cv.width, h = cv.height, img = ctx.createImageData(w, h), d = img.data, visible = true, last = 0;
        function frame(t) {
            if (visible && t - last > 85) {
                last = t;
                for (var i = 0; i < d.length; i += 4) { var v = Math.random() * 120 | 0; d[i] = v; d[i + 1] = v; d[i + 2] = v + 6; d[i + 3] = 255; }
                ctx.putImageData(img, 0, 0);
            }
            if (!reduce) requestAnimationFrame(frame);
        }
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(scene);
        }
        requestAnimationFrame(frame);
        if (reduce) { frame(1000); }
    }

    function boot() { initReveal(); initNav(); initLens(); initRoom(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
