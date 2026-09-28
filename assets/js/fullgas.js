/* FULL GAS — comportamento della pagina. Nessuna dipendenza. */
(function () {
  'use strict';
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- barra di navigazione --- */
  var nav = d.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-scrolled', w.scrollY > 24); };
    onScroll(); w.addEventListener('scroll', onScroll, { passive: true });
    var burger = nav.querySelector('.nav__burger');
    if (burger) {
      burger.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.querySelectorAll('.nav__links a').forEach(function (a) {
        a.addEventListener('click', function () { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); });
      });
    }
  }

  /* --- comparsa allo scorrimento --- */
  var reveals = d.querySelectorAll('.reveal');
  if (reveals.length) {
    if (reduce || !('IntersectionObserver' in w)) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* --- alone che segue il puntatore nell'hero --- */
  var hero = d.querySelector('.hero');
  if (hero && !reduce) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--px', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      hero.style.setProperty('--py', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  /* --- timecode nell'hero: ora italiana, formato broadcast --- */
  var tc = d.querySelector('[data-timecode]');
  if (tc) {
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var now = new Date();
      var f = Math.floor(now.getMilliseconds() / 40); // 25 fps
      tc.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) + ':' + pad(f);
    };
    tick(); setInterval(tick, 40);
  }

  /* --- palinsesto: la fascia in corso --- */
  var fasce = d.querySelectorAll('.fascia[data-da]');
  if (fasce.length) {
    var h = new Date().getHours() + new Date().getMinutes() / 60;
    var found = false;
    fasce.forEach(function (f) {
      var da = +f.getAttribute('data-da'), a = +f.getAttribute('data-a');
      var dentro = da < a ? (h >= da && h < a) : (h >= da || h < a);
      f.classList.toggle('is-now', dentro && !found);
      if (dentro) found = true;
    });
    var bar = d.querySelector('.giornata__bar i');
    if (bar) {
      var pct = (h / 24 * 100).toFixed(2);
      bar.style.setProperty('--x', pct + '%');
      var hh = new Date();
      bar.setAttribute('data-ora', (hh.getHours() < 10 ? '0' : '') + hh.getHours() + ':' + (hh.getMinutes() < 10 ? '0' : '') + hh.getMinutes());
    }
  }

  /* --- contatori --- */
  var counters = d.querySelectorAll('[data-count]');
  if (counters.length) {
    var fmt = function (n, dec) { return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    var run = function (el) {
      var target = parseFloat(el.getAttribute('data-count')), dec = (el.getAttribute('data-dec') | 0);
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduce) { el.textContent = fmt(target, dec) + suffix; return; }
      var t0 = performance.now(), dur = 1400;
      var step = function (t) {
        var p = Math.min(1, (t - t0) / dur); p = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * p, dec) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in w) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io2.unobserve(e.target); } });
      }, { threshold: 0.4 });
      counters.forEach(function (c) { io2.observe(c); });
    } else { counters.forEach(run); }
  }

  /* --- ticker: si duplica per scorrere senza cuciture --- */
  var track = d.querySelector('.ticker__track');
  if (track && !reduce) { track.innerHTML += track.innerHTML; }

  /* --- sfoglia magazine --- */
  var sf = d.querySelector('.sfoglia');
  if (sf) {
    var tr = sf.querySelector('.sfoglia__track');
    var spreads = tr.querySelectorAll('.spread');
    var cur = sf.querySelector('[data-cur]'), tot = sf.querySelector('[data-tot]');
    if (tot) tot.textContent = spreads.length;
    var idx = function () {
      var x = tr.scrollLeft + tr.clientWidth / 2, best = 0, bd = 1e9;
      spreads.forEach(function (s, i) { var c = s.offsetLeft + s.offsetWidth / 2, dd = Math.abs(c - x); if (dd < bd) { bd = dd; best = i; } });
      return best;
    };
    var go = function (i) {
      i = Math.max(0, Math.min(spreads.length - 1, i));
      spreads[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    };
    var upd = function () { if (cur) cur.textContent = idx() + 1; };
    tr.addEventListener('scroll', function () { w.requestAnimationFrame(upd); }, { passive: true });
    upd();
    sf.querySelectorAll('[data-prev]').forEach(function (b) { b.addEventListener('click', function () { go(idx() - 1); }); });
    sf.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', function () { go(idx() + 1); }); });
    sf.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(idx() + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(idx() - 1); e.preventDefault(); }
    });
  }

  /* --- video hero: se non parte da solo, mostra il poster --- */
  var v = d.querySelector('.hero__media video');
  if (v) {
    var p = v.play && v.play();
    if (p && p.catch) p.catch(function () { v.controls = false; });
    if (reduce) { v.pause(); v.removeAttribute('autoplay'); }
  }

  /* --- anno nel footer --- */
  d.querySelectorAll('[data-anno]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
