/* FULL GAS — la rete Nexum su YouTube: il quadrante dei canali, la sintonia (tasti 1–8, frecce, OSD),
   le liste di video e short renderizzate dallo snapshot (assets/data/rete.js), lo schermo con il player
   ufficiale, lo zapping di tutta la rete e l'aggiornamento dal vivo tramite api/rete (se c'è).
   Scorrimento, cursore, contagiri e righe che entrano stanno in motion.js. */
(function () {
  'use strict';
  var d = document, w = window, FG = w.FG || {};
  var reduce = !!FG.reduce || (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var DATI = w.FG_RETE; if (!DATI || !DATI.canali) return;
  var canali = DATI.canali.slice().sort(function (a, b) { return a.pos - b.pos; });
  var perSlug = {};
  canali.forEach(function (c) { c.video = c.video || []; c.short = c.short || []; perSlug[c.slug] = c; });

  /* --- utilità --- */
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var taglia = function (s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
  var fmtData, fmtMese, fmtNum;
  try { fmtData = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' }); fmtMese = new Intl.DateTimeFormat('it-IT', { month: 'short', timeZone: 'Europe/Rome' }); fmtNum = new Intl.NumberFormat('it-IT'); } catch (e) {}
  var dataIt = function (iso) { var t = new Date(iso); if (isNaN(t)) return '–'; try { return fmtData.format(t).replace(/\./g, ''); } catch (e) { return String(iso).slice(0, 10); } };
  var meseIt = function (t) { try { return fmtMese.format(t).replace(/\./g, ''); } catch (e) { return ''; } };
  var numIt = function (n) { try { return fmtNum.format(n); } catch (e) { return String(n); } };
  var relativa = function (iso) { var t = new Date(iso).getTime(); if (isNaN(t)) return '–'; var g = Math.floor((Date.now() - t) / 864e5); if (g <= 0) return 'oggi'; if (g === 1) return 'ieri'; if (g < 7) return g + ' giorni fa'; return dataIt(iso); };
  var visual = function (v) { return v.views ? numIt(v.views) + ' visualizzazioni' : ''; };
  var YT = 'https://i.ytimg.com/vi/';
  var thumb = function (id, kind, big) { return kind === 'short' ? YT + id + '/oar2.jpg' : YT + id + (big ? '/maxresdefault.jpg' : '/hq720.jpg'); };
  var url = function (id, kind) { return kind === 'short' ? 'https://www.youtube.com/shorts/' + id : 'https://www.youtube.com/watch?v=' + id; };
  var EMBED = function (id) { return 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1&hl=it'; };
  var ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l16 9-16 9z"/></svg>';
  var YTSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-4.8.5-4.8s0-2.9-.5-4.8zM9.8 15.1V8.9l6 3.1z"/></svg>';

  /* le miniature: se una variante manca, si passa alla successiva (data-fb) */
  d.addEventListener('error', function (e) {
    var img = e.target; if (!img || img.tagName !== 'IMG' || !img.getAttribute('data-fb')) return;
    var resto = img.getAttribute('data-fb').split(',').filter(Boolean); var next = resto.shift();
    if (resto.length) img.setAttribute('data-fb', resto.join(',')); else img.removeAttribute('data-fb');
    if (next) img.src = img.src.replace(/\/[a-z0-9]+\.jpg(\?.*)?$/i, '/' + next + '.jpg');
  }, true);

  /* --- le schede: in evidenza, la griglia dei video, la fila degli short --- */
  var featuredHTML = function (c, v) {
    return '<div class="player" data-video="' + esc(v.id) + '">' +
      '<img src="' + thumb(v.id, 'video', true) + '" data-fb="hq720,hqdefault" alt="" width="1280" height="720" loading="lazy">' +
      '<button class="player__btn" type="button" data-featplay aria-label="Riproduci: ' + esc(v.titolo) + '"><span class="player__play">' + PLAY + '</span></button>' +
      '<div class="player__meta"><span class="player__title">' + esc(taglia(v.titolo, 64)) + '</span><span class="player__yt">YouTube · ' + dataIt(v.data) + '</span></div></div>' +
      '<div class="ch__fside"><p class="eyebrow eyebrow--no">In evidenza · l\'ultimo video</p><h3 class="ch__ft">' + esc(v.titolo) + '</h3>' +
      '<p class="ch__fm">' + dataIt(v.data) + (v.views ? ' · ' + visual(v) : '') + '</p>' +
      '<div class="hero__actions" style="margin-top:0"><button class="btn btn--primary" type="button" data-featplay>Guarda qui</button>' +
      '<a class="btn btn--yt" href="' + url(v.id) + '" target="_blank" rel="noopener">' + YTSVG + 'Commenta su YouTube</a></div></div>';
  };
  var cardHTML = function (c, v, i) {
    return '<a class="vc" href="' + url(v.id) + '" target="_blank" rel="noopener" data-play="' + esc(v.id) + '" data-src="video:' + c.slug + '" data-i="' + (i + 1) + '" style="--i:' + i + '">' +
      '<span class="vc__img"><img src="' + thumb(v.id, 'video') + '" data-fb="hqdefault" alt="" loading="lazy"><i class="vc__play">' + PLAY + '</i></span>' +
      '<span class="vc__body"><span class="vc__k">' + dataIt(v.data) + '</span><span class="vc__t">' + esc(v.titolo) + '</span>' + (v.views ? '<span class="vc__v">' + visual(v) + '</span>' : '') + '</span></a>';
  };
  var shortHTML = function (c, v, i) {
    return '<a class="short" href="' + url(v.id, 'short') + '" target="_blank" rel="noopener" data-play="' + esc(v.id) + '" data-src="short:' + c.slug + '" data-i="' + i + '" style="--i:' + i + '">' +
      '<img src="' + thumb(v.id, 'short') + '" data-fb="frame0,hqdefault" alt="" loading="lazy"><span class="short__play">' + PLAY + '</span>' +
      '<span class="short__cap"><span class="short__k">Short · ' + dataIt(v.data) + (v.views ? ' · ' + numIt(v.views) + ' visual.' : '') + '</span><span class="short__t">' + esc(v.titolo) + '</span></span></a>';
  };
  var renderCanale = function (c) {
    var sec = d.getElementById(c.slug); if (!sec || !c.youtube) return;
    if (sec.querySelector('.player.is-playing')) return;   // non si interrompe chi sta guardando
    var video = c.video, short = c.short, primo = video[0], resto = video.slice(1);
    var feat = sec.querySelector('[data-featured]'), bv = sec.querySelector('[data-block="video"]'), bs = sec.querySelector('[data-block="short"]'), vuoto = sec.querySelector('[data-empty]');
    if (feat) { feat.innerHTML = primo ? featuredHTML(c, primo) : ''; feat.hidden = !primo; }
    if (bv) { bv.querySelector('[data-list]').innerHTML = resto.map(function (v, i) { return cardHTML(c, v, i); }).join(''); bv.hidden = !resto.length; bv.querySelector('[data-ch-count]').textContent = resto.length ? pad(resto.length) : ''; }
    if (bs) { bs.querySelector('[data-list]').innerHTML = short.map(function (v, i) { return shortHTML(c, v, i); }).join(''); bs.hidden = !short.length; bs.querySelector('[data-ch-count]').textContent = short.length ? pad(short.length) : ''; }
    if (vuoto) vuoto.hidden = !!(video.length || short.length);
    var nv = sec.querySelector('[data-ch-n="video"]'), ns = sec.querySelector('[data-ch-n="short"]'), ul = sec.querySelector('[data-ch-last]');
    if (nv) nv.textContent = video.length; if (ns) ns.textContent = short.length;
    if (ul) { var best = ''; video.concat(short).forEach(function (v) { if (v.data > best) best = v.data; }); ul.textContent = best ? relativa(best) : 'ancora niente'; }
  };
  var embedInline = function (player) {
    var id = player.getAttribute('data-video'); if (!id) return;
    var old = player.querySelector('iframe'); if (old) old.remove();
    var f = d.createElement('iframe'); f.src = EMBED(id); f.allow = ALLOW; f.allowFullscreen = true; f.title = 'YouTube · video';
    player.appendChild(f); player.classList.add('is-playing');
  };

  /* --- lo zapping: tutte le uscite della rete, dal più recente --- */
  var flusso = d.querySelector('[data-flusso]'), moreBtn = d.querySelector('[data-flusso-more]'), filtro = 'tutti', tutti = [], mostrati = 16;
  var costruisci = function () {
    tutti = [];
    canali.forEach(function (c) { if (!c.youtube) return; c.video.forEach(function (v) { tutti.push({ v: v, c: c, kind: 'video' }); }); c.short.forEach(function (v) { tutti.push({ v: v, c: c, kind: 'short' }); }); });
    tutti.sort(function (a, b) { return (b.v.data || '').localeCompare(a.v.data || ''); });
  };
  var lista = function () { return filtro === 'tutti' ? tutti : tutti.filter(function (x) { return x.kind === filtro; }); };
  var flHTML = function (x, i) {
    var v = x.v, c = x.c, t = new Date(v.data);
    return '<li class="fl" style="--c:' + c.colore + ';--i:' + Math.min(i, 12) + '"><a href="' + url(v.id, x.kind) + '" target="_blank" rel="noopener" data-play="' + esc(v.id) + '" data-src="flusso" data-i="' + i + '">' +
      '<span class="fl__d"><b>' + (isNaN(t) ? '–' : t.getDate()) + '</b><small>' + (isNaN(t) ? '' : meseIt(t)) + '</small></span>' +
      '<span class="fl__img"><img src="' + YT + v.id + '/hq720.jpg" data-fb="hqdefault" alt="" loading="lazy"></span>' +
      '<span class="fl__body"><span class="fl__k"><i></i>' + pad(c.pos) + ' · ' + esc(c.nome) + ' · <b>' + (x.kind === 'short' ? 'Short' : 'Video') + '</b></span><span class="fl__t">' + esc(v.titolo) + '</span><span class="fl__m">' + dataIt(v.data) + (v.views ? ' · ' + visual(v) : '') + '</span></span>' +
      '<span class="fl__play">' + PLAY + '</span></a></li>';
  };
  var renderFlusso = function () {
    if (!flusso) return; var l = lista();
    flusso.innerHTML = l.slice(0, mostrati).map(flHTML).join('');
    if (moreBtn) moreBtn.hidden = l.length <= mostrati;
  };

  /* --- la testata: quando è stato aggiornato, l'ultima uscita --- */
  var aggiornaMeta = function () {
    var when = d.querySelector('[data-rete-when]'), last = d.querySelector('[data-rete-last]'), n = d.querySelector('[data-rete-n]');
    if (when && DATI.generato) { var g = new Date(DATI.generato); when.textContent = isNaN(g) ? '–' : dataIt(DATI.generato) + ', ' + pad(g.getHours()) + ':' + pad(g.getMinutes()); }
    if (n) n.textContent = canali.filter(function (c) { return !!c.youtube; }).length;
    if (last) { var best = null; canali.forEach(function (c) { c.video.concat(c.short).forEach(function (v) { if (!best || v.data > best.v.data) best = { v: v, c: c }; }); }); last.textContent = best ? dataIt(best.v.data) + ' · ' + best.c.nome : '–'; }
  };

  /* --- lo schermo --- */
  var schermo = d.querySelector('.schermo'), listaS = [], idx = 0, ritorno = null;
  var sBox = schermo && schermo.querySelector('.schermo__box'), sFrame = schermo && schermo.querySelector('.schermo__frame');
  var sTit = schermo && schermo.querySelector('[data-s-titolo]'), sN = schermo && schermo.querySelector('[data-s-n]'), sNome = schermo && schermo.querySelector('[data-s-nome]'), sLink = schermo && schermo.querySelector('[data-s-link]'), sCount = schermo && schermo.querySelector('[data-s-count]');
  var sPrev = schermo && schermo.querySelector('[data-prev]'), sNext = schermo && schermo.querySelector('[data-next]'), sX = schermo && schermo.querySelector('.schermo__x');
  var itemsFor = function (src) {
    var p = (src || '').split(':');
    if (p[0] === 'flusso') return lista().slice(0, mostrati).map(function (x) { return { id: x.v.id, titolo: x.v.titolo, kind: x.kind, c: x.c }; });
    var c = perSlug[p[1]]; if (!c) return [];
    return (p[0] === 'short' ? c.short : c.video).map(function (v) { return { id: v.id, titolo: v.titolo, kind: p[0], c: c }; });
  };
  var mostra = function () {
    var it = listaS[idx]; if (!it || !schermo) return;
    sBox.setAttribute('data-ratio', it.kind === 'short' ? '9-16' : '16-9'); sBox.style.setProperty('--c', it.c.colore);
    sFrame.innerHTML = '<iframe src="' + EMBED(it.id) + '" allow="' + ALLOW + '" allowfullscreen title="' + esc(it.titolo) + '"></iframe>';
    sTit.textContent = it.titolo; sN.textContent = pad(it.c.pos); sNome.textContent = it.c.nome + ' · ' + (it.kind === 'short' ? 'Short' : 'Video'); sLink.href = url(it.id, it.kind);
    sPrev.disabled = idx <= 0; sNext.disabled = idx >= listaS.length - 1; sCount.textContent = pad(idx + 1) + ' / ' + pad(listaS.length);
  };
  var apri = function (items, i, trigger) {
    if (!schermo || !items.length) return;
    listaS = items; idx = Math.max(0, Math.min(i, items.length - 1)); ritorno = trigger || null;
    schermo.hidden = false; d.documentElement.classList.add('is-schermo'); if (FG.lenis) FG.lenis.stop();
    mostra(); if (sX) sX.focus();
  };
  var chiudi = function () {
    if (!schermo || schermo.hidden) return;
    sFrame.innerHTML = ''; schermo.hidden = true; d.documentElement.classList.remove('is-schermo'); if (FG.lenis) FG.lenis.start();
    if (ritorno && ritorno.focus) ritorno.focus(); ritorno = null;
  };
  var salta = function (dir) { var n = idx + dir; if (n < 0 || n >= listaS.length) return; idx = n; mostra(); };

  /* --- la sintonia --- */
  var attuale = null, tuner = d.getElementById('tuner'), dial = d.querySelector('.dial'), osd = d.querySelector('.osd'), osdT;
  var navH = function () { return parseInt(getComputedStyle(d.documentElement).getPropertyValue('--nav-h')) || 68; };
  var vaiAlTuner = function (forza) {
    if (!tuner) return;
    var top = tuner.getBoundingClientRect().top, off = navH() + (dial ? dial.offsetHeight : 0), delta = top - off;
    if (!forza && Math.abs(delta) < 40) return;
    var y = w.scrollY + delta;
    if (FG.lenis) FG.lenis.scrollTo(y, { duration: 1 }); else w.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  };
  var sintonizza = function (slug, opts) {
    opts = opts || {}; var c = perSlug[slug]; if (!c) return; var prima = attuale; attuale = slug;
    d.querySelectorAll('.ch').forEach(function (s) { s.classList.toggle('is-on', s.id === slug); });
    d.querySelectorAll('.dial__ch').forEach(function (a) {
      var on = a.getAttribute('data-ch') === slug; a.setAttribute('aria-current', on ? 'true' : 'false');
      if (on && dial) { var tr = dial.querySelector('.dial__track'), x = Math.max(0, a.offsetLeft - (tr.clientWidth - a.offsetWidth) / 2); try { tr.scrollTo({ left: x, behavior: (reduce || opts.silent) ? 'auto' : 'smooth' }); } catch (e) { tr.scrollLeft = x; } }
    });
    if (prima && prima !== slug && !reduce && tuner) { tuner.classList.remove('is-zap'); void tuner.offsetWidth; tuner.classList.add('is-zap'); setTimeout(function () { tuner.classList.remove('is-zap'); }, 420); }
    if (osd && !opts.silent) { osd.style.setProperty('--c', c.colore); osd.querySelector('[data-osd-n]').textContent = pad(c.pos); osd.querySelector('[data-osd-nome]').textContent = c.nome; osd.classList.add('is-on'); clearTimeout(osdT); osdT = setTimeout(function () { osd.classList.remove('is-on'); }, 1700); }
    if (!opts.silent) { try { history.replaceState(null, '', '#' + slug); } catch (e) {} }   // all'avvio no: il browser scrollerebbe al canale
    if (opts.scroll) vaiAlTuner();
  };
  var norm = function (p) { return (p || '').replace(/\/index\.html$/, '/').replace(/\.html$/, ''); };

  /* --- i click: canale, video, schermo, filtri --- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]'); if (!a) return;
    var slug = (a.hash || '').slice(1); if (norm(a.pathname) !== norm(location.pathname)) return;
    if (slug === 'tuner') { e.preventDefault(); e.stopPropagation(); vaiAlTuner(true); return; }
    if (!perSlug[slug]) return;
    e.preventDefault(); e.stopPropagation(); sintonizza(slug, { scroll: true });
  }, true);
  d.addEventListener('click', function (e) {
    var t = e.target, el;
    if ((el = t.closest('[data-play]'))) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      var items = itemsFor(el.getAttribute('data-src')); if (!items.length) return;
      e.preventDefault(); apri(items, +el.getAttribute('data-i') || 0, el); return;
    }
    if ((el = t.closest('[data-featplay]'))) { var sec = el.closest('.ch'), pl = sec && sec.querySelector('.player'); if (pl) { embedInline(pl); if (!el.classList.contains('player__btn') && pl.getBoundingClientRect().top < 0) { if (FG.scrollTo) FG.scrollTo(pl, -90); else pl.scrollIntoView({ behavior: 'smooth' }); } } return; }
    if (t.closest('[data-close]')) { chiudi(); return; }
    if (t.closest('[data-prev]')) { salta(-1); return; }
    if (t.closest('[data-next]')) { salta(1); return; }
    if ((el = t.closest('[data-filtro]'))) { filtro = el.getAttribute('data-filtro'); mostrati = 16; d.querySelectorAll('[data-filtro]').forEach(function (b) { var on = b === el; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); renderFlusso(); return; }
    if (t.closest('[data-flusso-more]')) { mostrati += 16; renderFlusso(); }
  });

  /* --- la tastiera: 1–8 cambia canale, le frecce zappano, Esc spegne --- */
  d.addEventListener('keydown', function (e) {
    if (schermo && !schermo.hidden) {
      if (e.key === 'Escape') { chiudi(); e.preventDefault(); } else if (e.key === 'ArrowRight') { salta(1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { salta(-1); e.preventDefault(); }
      return;
    }
    var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-8]$/.test(e.key)) { for (var i = 0; i < canali.length; i++) if (canali[i].pos === +e.key) { sintonizza(canali[i].slug, { scroll: true }); e.preventDefault(); return; } }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && t && t.closest && t.closest('.dial')) {
      var k = 0; for (var j = 0; j < canali.length; j++) if (canali[j].slug === attuale) k = j;
      var n = canali[(k + (e.key === 'ArrowRight' ? 1 : -1) + canali.length) % canali.length];
      sintonizza(n.slug, { scroll: true }); var el = dial.querySelector('[data-ch="' + n.slug + '"]'); if (el) el.focus(); e.preventDefault();
    }
  });

  /* --- l'aggiornamento dal vivo: api/rete (Vercel). Se non c'è, resta lo snapshot. --- */
  var aggiorna = function () {
    if (!w.fetch || location.protocol === 'file:') return;
    var ids = canali.filter(function (c) { return c.youtube; }).map(function (c) { return c.youtube.id; }); if (!ids.length) return;
    var ctrl = w.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 9000);
    fetch('api/rete?ids=' + ids.join(','), { signal: ctrl && ctrl.signal, headers: { Accept: 'application/json' } })
      .then(function (r) { clearTimeout(t); if (!r.ok || (r.headers.get('content-type') || '').indexOf('json') < 0) throw new Error('niente'); return r.json(); })
      .then(function (j) {
        if (!j || !j.canali) return; var cambiato = false;
        var chiave = function (l) { return (l || []).map(function (x) { return x.id + ':' + (x.views | 0); }).join(','); };
        canali.forEach(function (c) {
          var n = c.youtube && j.canali[c.youtube.id]; if (!n) return;
          if (chiave(n.video) !== chiave(c.video) || chiave(n.short) !== chiave(c.short)) { c.video = n.video || []; c.short = n.short || []; renderCanale(c); cambiato = true; }
        });
        if (cambiato) { costruisci(); renderFlusso(); }
        if (j.generato) DATI.generato = j.generato; aggiornaMeta();
      })
      .catch(function () {});
  };

  /* --- via --- */
  canali.forEach(renderCanale); costruisci(); renderFlusso(); aggiornaMeta();
  var hash = (location.hash || '').slice(1), inizio = perSlug[hash] ? hash : 'full-gas';
  sintonizza(inizio, { silent: true });
  if (perSlug[hash]) setTimeout(vaiAlTuner, 400);
  w.addEventListener('hashchange', function () { var h = (location.hash || '').slice(1); if (perSlug[h] && h !== attuale) sintonizza(h, { scroll: true }); });
  aggiorna();
})();
