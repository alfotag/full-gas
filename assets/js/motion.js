/* FULL GAS — movimento condiviso da tutte le pagine.
   Scorrimento morbido (Lenis), contagiri legato alla velocità, cursore, accensione,
   righe che entrano, pill della premiere in barra. Tutto degrada con grazia:
   senza librerie o con "riduci movimento" la pagina resta completa e ferma. */
(function () {
  'use strict';
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!w.gsap, hasST = hasGsap && !!w.ScrollTrigger, hasLenis = !!w.Lenis;
  if (reduce) d.documentElement.classList.add('no-motion');
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  var FG = w.FG = {
    reduce: reduce,
    PREMIERE: Date.UTC(2026, 8, 29, 19, 0, 0),          // 29 settembre 2026, 21:00 a Roma
    PREMIERE_DURATION: 34 * 60 * 1000,                    // il video dura 33'27" + sigla
    VIDEO_ID: 'LesX001M5Co',
    lenis: null,
    scrollTo: function (target, offset) {
      var el = typeof target === 'string' ? d.querySelector(target) : target; if (!el) return;
      if (FG.lenis) FG.lenis.scrollTo(el, { offset: offset || -60, duration: 1.1 });
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  };

  /* --- scorrimento morbido --- */
  if (hasLenis && !reduce) {
    var lenis = FG.lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
    if (hasST) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(function (t) { lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
    else { (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0); }
    d.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href'); if (id.length < 2) return; var el = d.querySelector(id); if (!el) return;
        e.preventDefault(); FG.scrollTo(el, -64); history.replaceState(null, '', id);
      });
    });
  }

  /* --- barra di navigazione --- */
  var nav = d.querySelector('.nav');
  if (nav) {
    var onS = function () { nav.classList.toggle('is-scrolled', w.scrollY > 24); }; onS(); w.addEventListener('scroll', onS, { passive: true });
    var burger = nav.querySelector('.nav__burger');
    if (burger) {
      burger.addEventListener('click', function () { var o = nav.classList.toggle('is-open'); burger.setAttribute('aria-expanded', o ? 'true' : 'false'); });
      nav.querySelectorAll('.nav__links a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }); });
    }
  }

  /* --- la premiere: stato e countdown condivisi --- */
  FG.premiereState = function (now) {
    now = now || Date.now();
    if (now < FG.PREMIERE) return 'before';
    if (now < FG.PREMIERE + FG.PREMIERE_DURATION) return 'live';
    return 'after';
  };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  FG.countdown = function (now) {
    var diff = Math.max(0, FG.PREMIERE - (now || Date.now())), s = Math.floor(diff / 1000);
    var dd = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return { d: dd, h: hh, m: mm, s: ss, text: (dd ? dd + 'g ' : '') + pad(hh) + ':' + pad(mm) + ':' + pad(ss) };
  };
  var live = d.querySelector('.nav__live'), minis = d.querySelectorAll('[data-cd-mini]'), labs = d.querySelectorAll('[data-live-label]');
  var tickLive = function () {
    var st = FG.premiereState(); d.body.setAttribute('data-state', st); if (live) live.setAttribute('data-state', st);
    var mini = st === 'before' ? FG.countdown().text : st === 'live' ? 'In onda' : 'Disponibile';
    var lab = st === 'before' ? 'Premiere 21:00' : st === 'live' ? 'In onda ora' : 'Lo speciale';
    minis.forEach(function (m) { m.textContent = mini; }); labs.forEach(function (l) { l.textContent = lab; });
  };
  tickLive(); setInterval(tickLive, 1000);

  /* --- accensione --- */
  var ign = d.getElementById('ignition');
  var startPage = function () { d.documentElement.classList.add('is-ready'); d.dispatchEvent(new CustomEvent('fg:ready')); };
  if (ign) {
    var seen = false; try { seen = sessionStorage.getItem('fg-ign') === '1'; } catch (e) {}
    if (seen || reduce || !hasGsap) { ign.hidden = true; startPage(); }
    else {
      try { sessionStorage.setItem('fg-ign', '1'); } catch (e) {}
      var rpm = ign.querySelector('[data-rpm]'), cnt = { v: 0 };
      var tl = gsap.timeline({ onComplete: function () { ign.hidden = true; } });
      tl.to('.ignition__mark', { opacity: 1, scale: 1, duration: .45, ease: 'power3.out' }, 0)
        .to('.ignition__line', { width: 'min(70vw, 520px)', duration: .7, ease: 'power3.out' }, .1)
        .to('.ignition__rpm', { opacity: 1, duration: .3 }, .25)
        .to(cnt, { v: 8400, duration: .8, ease: 'power2.inOut', onUpdate: function () { if (rpm) rpm.textContent = Math.round(cnt.v); } }, .3)
        .to('.ignition__in', { y: -30, opacity: 0, duration: .35, ease: 'power2.in' }, 1.15)
        .to(ign, { clipPath: 'inset(0 0 100% 0)', duration: .6, ease: 'power4.inOut', onStart: startPage }, 1.25);
      var skip = ign.querySelector('.ignition__skip');
      if (skip) skip.addEventListener('click', function () { tl.progress(1); });
    }
  } else { startPage(); }

  /* --- righe che entrano: si spezza il testo in righe e le si fa salire --- */
  FG.splitLines = function (el) {
    if (el.dataset.splitDone) return; el.dataset.splitDone = '1';
    var text = el.innerHTML.trim();
    // le righe sono dichiarate con <br> o con elementi .riga; altrimenti una sola
    var parts = text.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(function (p) { return '<span class="ln"><span>' + p + '</span></span>'; }).join('');
    el.classList.add('split');
  };
  var reveal = function () {
    var items = d.querySelectorAll('[data-split]');
    items.forEach(FG.splitLines);
    var targets = d.querySelectorAll('.split, .fade-up, .reveal');
    if (reduce || !('IntersectionObserver' in w)) { targets.forEach(function (t) { t.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; var t = e.target; io.unobserve(t);
        if (hasGsap && t.classList.contains('split')) {
          gsap.to(t.querySelectorAll('.ln > span'), { y: 0, duration: .9, ease: 'power4.out', stagger: .08, overwrite: true, onComplete: function () { t.classList.add('is-in'); } });
        } else if (hasGsap && t.classList.contains('fade-up')) {
          gsap.to(t, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', delay: (+t.dataset.delay || 0) * .1, overwrite: true, onComplete: function () { t.classList.add('is-in'); } });
        } else t.classList.add('is-in');
      });
    }, { rootMargin: '0px 0px 0px 0px', threshold: 0 });
    targets.forEach(function (t) { io.observe(t); });
  };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', reveal); else reveal();

  /* --- cursore --- */
  var cur = d.querySelector('.cursor');
  if (cur && !reduce && w.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var dot = cur.querySelector('.cursor__dot'), ring = cur.querySelector('.cursor__ring');
    var px = w.innerWidth / 2, py = w.innerHeight / 2, rx = px, ry = py, shown = false;
    d.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; if (!shown) { shown = true; cur.classList.remove('is-hidden'); } }, { passive: true });
    d.addEventListener('pointerleave', function () { cur.classList.add('is-hidden'); });
    d.addEventListener('pointerover', function (e) {
      var t = e.target.closest('a, button, [role="button"], .hs__panel, .spread, .tv, .remote__red');
      cur.classList.toggle('is-link', !!t);
      cur.classList.toggle('is-text', !t && !!e.target.closest('p, h1, h2, h3, li'));
    });
    var loop = function () { rx += (px - rx) * .18; ry += (py - ry) * .18; dot.style.transform = 'translate(' + px + 'px,' + py + 'px) translate(-50%,-50%)'; ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)'; requestAnimationFrame(loop); };
    cur.classList.add('is-hidden'); loop();
  }

  /* --- contagiri: la lancetta segue la velocità di scorrimento, l'anello l'avanzamento --- */
  var gauge = d.getElementById('gauge');
  if (gauge) {
    var needle = gauge.querySelector('.g-needle'), prog = gauge.querySelector('.g-prog'), num = gauge.querySelector('[data-gauge-num]');
    var progLen = prog ? prog.getTotalLength() : 1; if (prog) { prog.style.strokeDasharray = progLen; prog.style.strokeDashoffset = progLen; }
    var lastY = w.scrollY, lastT = performance.now(), vel = 0, rpmV = 0;
    var tick = function () {
      var now = performance.now(), y = w.scrollY, dt = Math.max(16, now - lastT);
      var v = Math.abs(y - lastY) / dt * 16;      // px per fotogramma
      lastY = y; lastT = now;
      vel += (v - vel) * .25;
      var target = Math.min(1, vel / 38); rpmV += (target - rpmV) * .12;
      if (needle) needle.style.transform = 'rotate(' + (-135 + rpmV * 270) + 'deg)';
      if (num) num.firstChild.nodeValue = String(Math.round(rpmV * 8400)).padStart(4, '0');
      gauge.classList.toggle('is-red', rpmV > .82);
      var max = d.documentElement.scrollHeight - w.innerHeight, p = max > 0 ? y / max : 0;
      if (prog) prog.style.strokeDashoffset = progLen * (1 - p);
      requestAnimationFrame(tick);
    };
    if (!reduce) requestAnimationFrame(tick); else if (prog) prog.style.strokeDashoffset = progLen;
    gauge.addEventListener('click', function () { FG.scrollTo(d.body, 0); if (!FG.lenis) w.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    setTimeout(function () { gauge.classList.add('is-on'); }, 1600);
  }

  /* --- barra di avanzamento --- */
  var pb = d.querySelector('.progress i');
  if (pb) { var upd = function () { var max = d.documentElement.scrollHeight - w.innerHeight; pb.style.transform = 'scaleX(' + (max > 0 ? w.scrollY / max : 0) + ')'; }; upd(); w.addEventListener('scroll', upd, { passive: true }); }

  /* --- timecode e anno --- */
  var tc = d.querySelector('[data-timecode]');
  if (tc) { var t2 = function () { var n = new Date(); tc.textContent = pad(n.getHours()) + ':' + pad(n.getMinutes()) + ':' + pad(n.getSeconds()) + ':' + pad(Math.floor(n.getMilliseconds() / 40)); }; t2(); setInterval(t2, 40); }
  d.querySelectorAll('[data-anno]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* --- ticker: si duplica per scorrere senza cuciture --- */
  var track = d.querySelector('.ticker__track'); if (track && !reduce) track.innerHTML += track.innerHTML;
})();
