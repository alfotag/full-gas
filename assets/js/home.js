/* FULL GAS — la home: Gazometro disegnato, premiere e countdown, player, righe cinetiche,
   programmi in orizzontale, palinsesto ad anello, speciale a scorrimento, magazine 3D, televisore. */
(function () {
  'use strict';
  var d = document, w = window, FG = w.FG || {};
  var reduce = !!FG.reduce, hasGsap = !!w.gsap, hasST = hasGsap && !!w.ScrollTrigger;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var mqDesk = w.matchMedia('(min-width: 901px)');

  /* --- il Gazometro nell'hero --- */
  var hero = d.getElementById('top'), stasera = d.getElementById('stasera'), canvas = d.getElementById('gazo');
  if (canvas && w.Gazometro) {
    var gz = new Gazometro(canvas); gz.reduce = reduce;
    var tx = 0, ty = 0;
    if (!reduce) d.addEventListener('pointermove', function (e) { tx = (e.clientX / w.innerWidth - .5) * 2; ty = (e.clientY / w.innerHeight - .5) * 2; }, { passive: true });
    var host = canvas.closest('section') || stasera || hero;
    var ease = function () { gz.mx += (tx - gz.mx) * .04; gz.my += (ty - gz.my) * .04; var r = host.getBoundingClientRect(); gz.scroll = Math.max(0, Math.min(1, (w.innerHeight - r.top) / (r.height + w.innerHeight))); requestAnimationFrame(ease); };
    if (!reduce) ease(); else gz.frame(0);
    if ('IntersectionObserver' in w) new IntersectionObserver(function (es) { gz.visible = es[0].isIntersecting; }, { threshold: 0 }).observe(host);
    if (!reduce) gz.start();
  }

  /* --- premiere: stato e countdown nell'hero e nel player --- */
  var cd = d.querySelector('[data-cd]'), player = d.querySelector('.player'), pchip = player && player.querySelector('[data-player-cd]');
  var cells = cd ? { d: cd.querySelector('[data-cd-d]'), h: cd.querySelector('[data-cd-h]'), m: cd.querySelector('[data-cd-m]'), s: cd.querySelector('[data-cd-s]') } : null;
  var lastState = null;
  var tickPremiere = function () {
    var st = FG.premiereState ? FG.premiereState() : 'before';
    d.body.setAttribute('data-state', st); if (hero) hero.setAttribute('data-state', st);
    if (player) player.setAttribute('data-state', st);
    if (st === 'before' && cells && FG.countdown) {
      var c = FG.countdown();
      cd.setAttribute('data-hide-days', c.d ? '0' : '1');
      if (cells.d) cells.d.textContent = c.d; cells.h.textContent = pad(c.h); cells.m.textContent = pad(c.m); cells.s.textContent = pad(c.s);
      if (pchip) pchip.textContent = c.text;
    } else if (pchip) pchip.textContent = st === 'live' ? 'In onda' : 'Disponibile';
    if (st !== lastState) { lastState = st; d.querySelectorAll('[data-live-text]').forEach(function (el) { el.textContent = el.getAttribute('data-live-text-' + st) || el.textContent; }); }
  };
  tickPremiere(); setInterval(tickPremiere, 500);

  /* --- player: il video si carica solo quando lo chiedi --- */
  var loadPlayer = function (start) {
    if (!player) return;
    var old = player.querySelector('iframe'); if (old) old.remove();
    var f = d.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + FG.VIDEO_ID + '?autoplay=1&rel=0&modestbranding=1&playsinline=1&hl=it' + (start ? '&start=' + start : '');
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; f.allowFullscreen = true; f.title = 'Speciale Full Gas · Eternal City Moto Show 2026';
    player.appendChild(f); player.classList.add('is-playing');
  };
  if (player) {
    var btn = player.querySelector('.player__btn'); if (btn) btn.addEventListener('click', function () { loadPlayer(0); });
    d.querySelectorAll('[data-play]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); loadPlayer(+a.getAttribute('data-play') || 0); if (FG.scrollTo) FG.scrollTo(player, -90); else player.scrollIntoView({ behavior: 'smooth' }); }); });
  }

  /* --- righe cinetiche: scorrono in direzioni opposte --- */
  if (hasST && !reduce) {
    d.querySelectorAll('.kin__line').forEach(function (ln, i) {
      var dir = i % 2 ? 1 : -1;
      gsap.fromTo(ln, { x: dir * -12 + 'vw' }, { x: dir * 12 + 'vw', ease: 'none', scrollTrigger: { trigger: '.kin', start: 'top bottom', end: 'bottom top', scrub: .6 } });
    });
  }

  /* --- programmi: la pista scorre in orizzontale mentre la pagina scende --- */
  var hs = d.querySelector('.hs'), track = d.querySelector('.hs__track'), cnt = d.querySelector('[data-hs-cur]');
  var panels = track ? track.querySelectorAll('.hs__panel') : [];
  if (hs && track && hasST && !reduce && mqDesk.matches) {
    var dist = function () { return Math.max(0, track.scrollWidth - w.innerWidth); };
    gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: hs.querySelector('.hs__viewport'), pin: true, scrub: .8, start: 'top top', end: function () { return '+=' + (dist() + w.innerHeight * .2); }, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (st) { if (cnt) cnt.textContent = pad(Math.min(panels.length, 1 + Math.floor(st.progress * panels.length))); } }
    });
  } else if (track && cnt) {
    var vp = hs.querySelector('.hs__viewport');
    vp.addEventListener('scroll', function () { var x = vp.scrollLeft + vp.clientWidth / 2, best = 0; panels.forEach(function (p, i) { if (Math.abs(p.offsetLeft + p.offsetWidth / 2 - x) < Math.abs(panels[best].offsetLeft + panels[best].offsetWidth / 2 - x)) best = i; }); cnt.textContent = pad(best + 1); }, { passive: true });
  }

  /* --- palinsesto ad anello --- */
  var ring = d.querySelector('.ring svg');
  var fasce = [
    { da: 6, a: 12, nome: 'Mattina', prog: 'Il Dettaglio · Magazine', picco: false },
    { da: 12, a: 15, nome: 'Pranzo', prog: 'Lungo Raggio', picco: true },
    { da: 15, a: 19, nome: 'Pomeriggio', prog: "L'Auto Storica · Confronto e Verdetto", picco: false },
    { da: 19, a: 23, nome: 'Prima serata', prog: 'Officina Centrale · Speciale', picco: true },
    { da: 23, a: 30, nome: 'Notte', prog: 'Seconda serata · Repliche', picco: false }
  ];
  var polar = function (cx, cy, r, deg) { var a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  var arc = function (cx, cy, r, a0, a1) { var p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1); var big = a1 - a0 > 180 ? 1 : 0; return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2); };
  var nowH = function () { var n = new Date(); return n.getHours() + n.getMinutes() / 60; };
  var fasciaOf = function (h) { var hh = h < 6 ? h + 24 : h; for (var i = 0; i < fasce.length; i++) if (hh >= fasce[i].da && hh < fasce[i].a) return i; return 4; };
  if (ring) {
    var s = '', gap = 1.2;
    fasce.forEach(function (f, i) { var a0 = f.da / 24 * 360 + gap, a1 = f.a / 24 * 360 - gap; s += '<path class="arc' + (f.picco ? ' arc--picco' : '') + '" data-i="' + i + '" d="' + arc(100, 100, 82, a0, a1) + '"/>'; });
    for (var h = 0; h < 24; h++) { var p = polar(100, 100, 66, h * 15), q = polar(100, 100, h % 6 ? 70 : 72, h * 15); s += '<line class="tick" x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"/>'; if (h % 6 === 0) { var t = polar(100, 100, 58, h * 15); s += '<text x="' + t[0].toFixed(1) + '" y="' + (t[1] + 3).toFixed(1) + '" text-anchor="middle">' + pad(h) + '</text>'; } }
    s += '<line class="hand" x1="100" y1="100" x2="100" y2="14"/><circle class="hand-dot" cx="100" cy="100" r="3.5"/>';
    ring.innerHTML = s;
    var hand = ring.querySelector('.hand'), arcs = ring.querySelectorAll('.arc'), rows = d.querySelectorAll('.fasce-list .fr');
    var cNow = d.querySelector('[data-ring-now]'), cNome = d.querySelector('[data-ring-nome]'), cProg = d.querySelector('[data-ring-prog]');
    var updRing = function () {
      var hh = nowH(), i = fasciaOf(hh), n = new Date();
      hand.style.transform = 'rotate(' + (hh / 24 * 360) + 'deg)';
      arcs.forEach(function (a, k) { a.classList.toggle('is-now', k === i); }); rows.forEach(function (r, k) { r.classList.toggle('is-now', k === i); });
      if (cNow) cNow.textContent = pad(n.getHours()) + ':' + pad(n.getMinutes()); if (cNome) cNome.textContent = fasce[i].nome; if (cProg) cProg.textContent = fasce[i].prog;
    };
    updRing(); setInterval(updRing, 30000);
  }

  /* --- speciale: la foto cambia con il capitolo --- */
  var scMedia = d.querySelector('.sc__media'), steps = d.querySelectorAll('.sc__step');
  if (scMedia && steps.length) {
    var imgs = scMedia.querySelectorAll('img'), capB = scMedia.querySelector('[data-sc-cap]'), capN = scMedia.querySelector('[data-sc-n]');
    var setStep = function (i) { imgs.forEach(function (im, k) { im.classList.toggle('is-on', k === i); }); steps.forEach(function (st, k) { st.classList.toggle('is-on', k === i); }); if (capB) capB.textContent = steps[i].getAttribute('data-cap') || ''; if (capN) capN.textContent = pad(i + 1) + ' / ' + pad(steps.length); };
    setStep(0);
    if ('IntersectionObserver' in w && !mqDesk.matches) { steps.forEach(function (st) { st.classList.add('is-on'); }); }
    else if (hasST && !reduce) steps.forEach(function (st, i) { ScrollTrigger.create({ trigger: st, start: 'top 55%', end: 'bottom 45%', onEnter: function () { setStep(i); }, onEnterBack: function () { setStep(i); } }); });
    else if ('IntersectionObserver' in w) { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) setStep([].indexOf.call(steps, e.target)); }); }, { rootMargin: '-45% 0px -45% 0px' }); steps.forEach(function (st) { io.observe(st); }); }
  }

  /* --- magazine: il libro si apre scorrendo --- */
  var book = d.querySelector('.book');
  if (book) {
    var cover = book.querySelector('.book__cover'), p1 = book.querySelector('.book__p1'), p2 = book.querySelector('.book__p2');
    if (hasST && !reduce && mqDesk.matches) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: '.bk__stage', start: 'top top', end: '+=160%', pin: true, scrub: .7, anticipatePin: 1 } });
      tl.to(book, { rotateY: -4, rotateX: 2, x: '18%', duration: .6, ease: 'none' }, 0)
        .to(cover, { rotateY: -168, duration: 1, ease: 'none' }, .1)
        .to(p1, { rotateY: -166, duration: 1, ease: 'none' }, .9)
        .to(p2, { rotateY: -164, duration: 1, ease: 'none' }, 1.7);
    } else if ('IntersectionObserver' in w) {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) { cover.style.transition = 'transform 1.4s cubic-bezier(.2,.8,.2,1)'; cover.style.transform = 'rotateY(-160deg)'; setTimeout(function () { p1.style.transition = 'transform 1.2s cubic-bezier(.2,.8,.2,1)'; p1.style.transform = 'rotateY(-158deg)'; }, 700); } }, { threshold: .5 }).observe(book);
    }
  }

  /* --- il televisore: premi il rosso --- */
  var tv = d.querySelector('.tvmock'), red = d.querySelector('.remote--live .remote__red'), tvSteps = d.querySelectorAll('.tv-steps div');
  if (tv) {
    var items = tv.querySelectorAll('.tvmock__item'), busy = false;
    var demo = function () {
      if (busy) return; busy = true;
      items.forEach(function (it) { it.classList.remove('is-sel'); }); tvSteps.forEach(function (s) { s.classList.remove('is-on'); });
      tv.classList.remove('is-full'); if (tvSteps[0]) tvSteps[0].classList.add('is-on');
      setTimeout(function () { tv.classList.add('is-full'); if (tvSteps[1]) tvSteps[1].classList.add('is-on'); }, 400);
      setTimeout(function () { tv.classList.add('is-menu'); if (tvSteps[2]) tvSteps[2].classList.add('is-on'); }, 900);
      var i = 0; var step = function () { items.forEach(function (it, k) { it.classList.toggle('is-sel', k === i); }); if (i < items.length - 1) { i++; setTimeout(step, 190); } else { if (tvSteps[3]) tvSteps[3].classList.add('is-on'); busy = false; } };
      setTimeout(step, 1500);
    };
    if (red) red.addEventListener('click', demo);
    var b2 = tv.querySelector('[data-tv-demo]'); if (b2) b2.addEventListener('click', demo);
    if ('IntersectionObserver' in w) { var once = false; new IntersectionObserver(function (es) { if (es[0].isIntersecting && !once) { once = true; setTimeout(demo, 500); } }, { threshold: .55 }).observe(tv); }
  }

  /* --- contatori --- */
  var counters = d.querySelectorAll('[data-count]');
  if (counters.length) {
    var fmt = function (n, dec) { return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    var run = function (el) { var target = parseFloat(el.getAttribute('data-count')), dec = el.getAttribute('data-dec') | 0, suf = el.getAttribute('data-suffix') || ''; if (reduce) { el.textContent = fmt(target, dec) + suf; return; } var t0 = performance.now(); var st = function (t) { var p = Math.min(1, (t - t0) / 1400); p = 1 - Math.pow(1 - p, 3); el.textContent = fmt(target * p, dec) + suf; if (p < 1) requestAnimationFrame(st); }; requestAnimationFrame(st); };
    if ('IntersectionObserver' in w) { var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io2.unobserve(e.target); } }); }, { threshold: .4 }); counters.forEach(function (c) { io2.observe(c); }); } else counters.forEach(run);
  }

  /* --- video hero: parte da solo, muto --- */
  var v = d.querySelector('.hero video'); if (v) { var p = v.play && v.play(); if (p && p.catch) p.catch(function () {}); if (reduce) v.pause(); }

  /* dopo l'accensione, si rimisura tutto */
  d.addEventListener('fg:ready', function () { if (hasST) setTimeout(function () { ScrollTrigger.refresh(); }, 100); });
  w.addEventListener('load', function () { if (hasST) ScrollTrigger.refresh(); });
})();
