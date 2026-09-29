/* FULL GAS — le pagine interne: player YouTube (ogni video si guarda qui e conta là), sfoglia,
   contatori, condivisione, newsletter, la domanda del mese, palinsesto.
   Il resto (scorrimento, cursore, contagiri, barra, righe che entrano) sta in motion.js. */
(function () {
  'use strict';
  var d = document, w = window, FG = w.FG || {}, reduce = !!FG.reduce;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* --- player: l'iframe di YouTube si carica solo al click, con autoplay. È il player ufficiale,
     quindi la visualizzazione conta sul canale. `data-video` sceglie il video; senza, è la premiere. --- */
  var embed = function (player, start) {
    var id = player.getAttribute('data-video') || FG.VIDEO_ID || 'LesX001M5Co';
    var old = player.querySelector('iframe'); if (old) old.remove();
    var f = d.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1&hl=it' + (start ? '&start=' + start : '');
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; f.allowFullscreen = true; f.title = 'Full Gas · video';
    player.appendChild(f); player.classList.add('is-playing');
  };
  d.querySelectorAll('.player').forEach(function (player) {
    var btn = player.querySelector('.player__btn'); if (btn) btn.addEventListener('click', function () { embed(player, 0); });
  });
  var main = d.querySelector('.player:not([data-video])') || d.querySelector('.player');
  d.querySelectorAll('[data-play]').forEach(function (a) {
    a.addEventListener('click', function (e) { if (!main) return; e.preventDefault(); embed(main, +a.getAttribute('data-play') || 0); if (FG.scrollTo) FG.scrollTo(main, -90); else main.scrollIntoView({ behavior: 'smooth' }); });
  });
  var chips = d.querySelectorAll('[data-player-cd]');
  if (chips.length) { var tick = function () { var st = FG.premiereState ? FG.premiereState() : 'before'; d.querySelectorAll('.player:not([data-video])').forEach(function (p) { p.setAttribute('data-state', st); }); chips.forEach(function (c) { c.textContent = st === 'before' ? FG.countdown().text : st === 'live' ? 'In onda' : 'Disponibile'; }); }; tick(); setInterval(tick, 500); }

  /* --- la playlist del canale: si carica al click, così la pagina resta leggera --- */
  d.querySelectorAll('[data-playlist]').forEach(function (box) {
    var b = box.querySelector('button'); if (!b) return;
    b.addEventListener('click', function () {
      var f = d.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/videoseries?list=' + box.getAttribute('data-playlist') + '&rel=0&hl=it';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; f.allowFullscreen = true; f.title = 'Tutti i video di Full Gas';
      box.appendChild(f); var ph = box.querySelector('.playlist__ph'); if (ph) ph.remove();
    });
  });

  /* --- contatori --- */
  var counters = d.querySelectorAll('[data-count]');
  if (counters.length) {
    var fmt = function (n, dec) { return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    var run = function (el) { var target = parseFloat(el.getAttribute('data-count')), dec = el.getAttribute('data-dec') | 0, suf = el.getAttribute('data-suffix') || ''; if (reduce) { el.textContent = fmt(target, dec) + suf; return; } var t0 = performance.now(); var st = function (t) { var p = Math.min(1, (t - t0) / 1400); p = 1 - Math.pow(1 - p, 3); el.textContent = fmt(target * p, dec) + suf; if (p < 1) requestAnimationFrame(st); }; requestAnimationFrame(st); };
    if ('IntersectionObserver' in w) { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: .4 }); counters.forEach(function (c) { io.observe(c); }); } else counters.forEach(run);
  }

  /* --- sfoglia (magazine) --- */
  var sf = d.querySelector('.sfoglia');
  if (sf) {
    var tr = sf.querySelector('.sfoglia__track'), spreads = tr.querySelectorAll('.spread'), curs = d.querySelectorAll('[data-cur]'), tots = d.querySelectorAll('[data-tot]');
    tots.forEach(function (t) { t.textContent = spreads.length; });
    var idx = function () { var x = tr.scrollLeft + tr.clientWidth / 2, best = 0, bd = 1e9; spreads.forEach(function (s, i) { var c = s.offsetLeft + s.offsetWidth / 2, dd = Math.abs(c - x); if (dd < bd) { bd = dd; best = i; } }); return best; };
    var go = function (i) { i = Math.max(0, Math.min(spreads.length - 1, i)); spreads[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'center' }); };
    var toc = d.querySelectorAll('[data-goto]');
    var upd = function () { var i = idx(); curs.forEach(function (c) { c.textContent = i + 1; }); toc.forEach(function (b) { b.classList.toggle('is-on', +b.getAttribute('data-goto') === i); }); };
    tr.addEventListener('scroll', function () { w.requestAnimationFrame(upd); }, { passive: true }); upd();
    sf.querySelectorAll('[data-prev]').forEach(function (b) { b.addEventListener('click', function () { go(idx() - 1); }); });
    sf.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', function () { go(idx() + 1); }); });
    toc.forEach(function (b) { b.addEventListener('click', function () { var riv = d.querySelector('.rivista'); if (riv && riv.getAttribute('data-mode') === 'fila') { spreads[+b.getAttribute('data-goto')].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); } else go(+b.getAttribute('data-goto')); }); });
    sf.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { go(idx() + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(idx() - 1); e.preventDefault(); } });
    var riv = d.querySelector('.rivista');
    if (riv) {
      var modeBtns = riv.querySelectorAll('[data-mode-set]');
      var setMode = function (m) { riv.setAttribute('data-mode', m); modeBtns.forEach(function (b) { b.classList.toggle('btn--primary', b.getAttribute('data-mode-set') === m); b.classList.toggle('btn--ghost', b.getAttribute('data-mode-set') !== m); }); try { localStorage.setItem('fg-mag-mode', m); } catch (e) {} };
      modeBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode-set')); }); });
      var saved = null; try { saved = localStorage.getItem('fg-mag-mode'); } catch (e) {}
      if (saved === 'fila' || (w.matchMedia('(max-width: 700px)').matches && !saved)) setMode('fila'); else setMode('sfoglia');
    }
  }

  /* --- condividi --- */
  d.querySelectorAll('[data-share]').forEach(function (b) {
    if (!navigator.share) { b.hidden = true; return; }
    b.addEventListener('click', function () { navigator.share({ title: d.title, url: location.href }).catch(function () {}); });
  });
  d.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = function () { b.classList.add('is-done'); b.textContent = 'Copiato'; setTimeout(function () { b.classList.remove('is-done'); b.textContent = 'Copia il link'; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, function () { w.prompt('Copia il link', location.href); });
      else w.prompt('Copia il link', location.href);
    });
  });

  /* --- newsletter: se c'è un endpoint configurato si spedisce lì; altrimenti si apre la mail alla redazione --- */
  d.querySelectorAll('form[data-newsletter]').forEach(function (form) {
    var endpoint = (w.FG_CONFIG && w.FG_CONFIG.newsletterEndpoint) || '';
    try { if (localStorage.getItem('fg-news') === '1') form.classList.add('is-done'); } catch (e) {}
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('input[type="email"]').value.trim(); if (!email) return;
      var fine = function () { form.classList.add('is-done'); try { localStorage.setItem('fg-news', '1'); } catch (err) {} };
      if (endpoint) {
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ email: email, lista: 'la-benzina-del-lunedi', origine: location.pathname }) }).then(fine, fine);
      } else {
        location.href = 'mailto:commerciale@nexumchannel.com?subject=' + encodeURIComponent('Iscrivimi alla Benzina del lunedì') + '&body=' + encodeURIComponent('Ciao Full Gas, iscrivetemi alla newsletter con questa mail: ' + email + '\n\nDaje gas!');
        fine();
      }
    });
  });

  /* --- la domanda del mese: scegli, il testo si copia, si apre YouTube per commentare --- */
  var dom = d.querySelector('[data-domanda]');
  if (dom) {
    var opts = dom.querySelectorAll('.risposte button'), altro = dom.querySelector('input[data-altro]'), go2 = dom.querySelector('[data-commenta]'), stato = dom.querySelector('[data-stato]');
    var scelta = ''; try { scelta = localStorage.getItem('fg-risposta') || ''; } catch (e) {}
    var render = function () { opts.forEach(function (o) { o.classList.toggle('is-sel', o.getAttribute('data-v') === scelta); }); if (stato) stato.textContent = scelta ? 'La tua risposta: ' + scelta : 'Scegli o scrivi la tua'; };
    opts.forEach(function (o) { o.addEventListener('click', function () { scelta = o.getAttribute('data-v'); if (altro) altro.value = ''; try { localStorage.setItem('fg-risposta', scelta); } catch (e) {} render(); }); });
    if (altro) altro.addEventListener('input', function () { scelta = altro.value.trim(); try { localStorage.setItem('fg-risposta', scelta); } catch (e) {} render(); });
    if (go2) go2.addEventListener('click', function (e) {
      var testo = scelta ? ('La mia moto preferita? ' + scelta + '. Daje gas! #FullGas') : '';
      if (testo && navigator.clipboard && navigator.clipboard.writeText) { e.preventDefault(); navigator.clipboard.writeText(testo).then(function () { if (stato) stato.textContent = 'Risposta copiata: incollala nel commento su YouTube'; w.open(go2.href, '_blank', 'noopener'); }, function () { w.open(go2.href, '_blank', 'noopener'); }); }
    });
    render();
  }

  /* --- fasce del palinsesto (se presenti) --- */
  var fasce = d.querySelectorAll('.fascia[data-da]');
  if (fasce.length) { var h = new Date().getHours() + new Date().getMinutes() / 60, found = false; fasce.forEach(function (f) { var da = +f.getAttribute('data-da'), a = +f.getAttribute('data-a'); var dentro = da < a ? (h >= da && h < a) : (h >= da || h < a); f.classList.toggle('is-now', dentro && !found); if (dentro) found = true; }); }
})();
