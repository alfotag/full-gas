/* FULL GAS — le pagine interne (speciale, magazine): contatori, sfoglia, player, fasce del palinsesto.
   Il resto (scorrimento, cursore, contagiri, barra, righe che entrano) sta in motion.js. */
(function () {
  'use strict';
  var d = document, w = window, FG = w.FG || {}, reduce = !!FG.reduce;

  /* --- contatori --- */
  var counters = d.querySelectorAll('[data-count]');
  if (counters.length) {
    var fmt = function (n, dec) { return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    var run = function (el) { var target = parseFloat(el.getAttribute('data-count')), dec = el.getAttribute('data-dec') | 0, suf = el.getAttribute('data-suffix') || ''; if (reduce) { el.textContent = fmt(target, dec) + suf; return; } var t0 = performance.now(); var st = function (t) { var p = Math.min(1, (t - t0) / 1400); p = 1 - Math.pow(1 - p, 3); el.textContent = fmt(target * p, dec) + suf; if (p < 1) requestAnimationFrame(st); }; requestAnimationFrame(st); };
    if ('IntersectionObserver' in w) { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: .4 }); counters.forEach(function (c) { io.observe(c); }); } else counters.forEach(run);
  }

  /* --- sfoglia magazine --- */
  var sf = d.querySelector('.sfoglia');
  if (sf) {
    var tr = sf.querySelector('.sfoglia__track'), spreads = tr.querySelectorAll('.spread'), cur = sf.querySelector('[data-cur]'), tot = sf.querySelector('[data-tot]');
    if (tot) tot.textContent = spreads.length;
    var idx = function () { var x = tr.scrollLeft + tr.clientWidth / 2, best = 0, bd = 1e9; spreads.forEach(function (s, i) { var c = s.offsetLeft + s.offsetWidth / 2, dd = Math.abs(c - x); if (dd < bd) { bd = dd; best = i; } }); return best; };
    var go = function (i) { i = Math.max(0, Math.min(spreads.length - 1, i)); spreads[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'center' }); };
    var upd = function () { if (cur) cur.textContent = idx() + 1; };
    tr.addEventListener('scroll', function () { w.requestAnimationFrame(upd); }, { passive: true }); upd();
    sf.querySelectorAll('[data-prev]').forEach(function (b) { b.addEventListener('click', function () { go(idx() - 1); }); });
    sf.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', function () { go(idx() + 1); }); });
    sf.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { go(idx() + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(idx() - 1); e.preventDefault(); } });
  }

  /* --- player della premiere --- */
  var player = d.querySelector('.player'), pchip = player && player.querySelector('[data-player-cd]'), pad = function (n) { return (n < 10 ? '0' : '') + n; };
  if (player) {
    var loadPlayer = function (start) {
      var old = player.querySelector('iframe'); if (old) old.remove();
      var f = d.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + (FG.VIDEO_ID || 'LesX001M5Co') + '?autoplay=1&rel=0&modestbranding=1&playsinline=1&hl=it' + (start ? '&start=' + start : '');
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; f.allowFullscreen = true; f.title = 'Speciale Full Gas · Eternal City Moto Show 2026';
      player.appendChild(f); player.classList.add('is-playing');
    };
    var btn = player.querySelector('.player__btn'); if (btn) btn.addEventListener('click', function () { loadPlayer(0); });
    d.querySelectorAll('[data-play]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); loadPlayer(+a.getAttribute('data-play') || 0); if (FG.scrollTo) FG.scrollTo(player, -90); else player.scrollIntoView({ behavior: 'smooth' }); }); });
    var tick = function () { var st = FG.premiereState ? FG.premiereState() : 'before'; player.setAttribute('data-state', st); if (pchip) pchip.textContent = st === 'before' ? FG.countdown().text : st === 'live' ? 'In onda' : 'Disponibile'; };
    tick(); setInterval(tick, 500);
  }

  /* --- fasce del palinsesto (se presenti) --- */
  var fasce = d.querySelectorAll('.fascia[data-da]');
  if (fasce.length) { var h = new Date().getHours() + new Date().getMinutes() / 60, found = false; fasce.forEach(function (f) { var da = +f.getAttribute('data-da'), a = +f.getAttribute('data-a'); var dentro = da < a ? (h >= da && h < a) : (h >= da || h < a); f.classList.toggle('is-now', dentro && !found); if (dentro) found = true; }); }
})();
