#!/usr/bin/env python3
"""
Il generatore delle pagine di Full Gas.

Cosa fa, in ordine:
1. legge gli articoli del diario da `content/diario/*.html` (un frammento HTML con
   un'intestazione JSON in commento) e scrive `diario/<slug>.html`, `diario.html`
   (l'indice) e `feed.xml` (RSS);
2. in tutte le pagine del sito sostituisce la barra di navigazione e il piè di
   pagina fra i marcatori `<!-- @nav -->…<!-- /@nav -->` e `<!-- @footer -->…<!-- /@footer -->`,
   così restano uguali dappertutto;
3. aggiorna le schede "dal diario" nelle pagine che le chiedono con
   `<!-- @diario:3 -->…<!-- /@diario -->`.

Uso:  python3 tools/build.py
Nessuna dipendenza oltre alla libreria standard.
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta
from email.utils import format_datetime
from html import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_URL = os.environ.get("FG_SITE_URL", "").rstrip("/")   # es. https://fullgas.example — serve solo al feed e all'og:image assoluta
ROMA = timezone(timedelta(hours=2))

# ---------------------------------------------------------------------------
# i pezzi comuni
# ---------------------------------------------------------------------------
NAV_ITEMS = [
    ("index.html#canale", "Il canale"),
    ("guarda.html", "Guarda"),
    ("index.html#programmi", "Programmi"),
    ("diario.html", "Diario"),
    ("magazine.html", "Magazine"),
    ("redazione.html", "Redazione"),
    ("garage.html", "Garage"),
]


def nav(root: str, current: str) -> str:
    links = []
    for href, label in NAV_ITEMS:
        cur = ' aria-current="page"' if ("#" not in href and href == current) else ""
        links.append(f'      <a href="{root}{href}"{cur}>{label}</a>')
    return f'''<header class="nav">
  <div class="wrap">
    <a class="brand" href="{root}index.html" aria-label="Full Gas, home"><img class="brand__mark" src="{root}brand/fg_mark_arancio.png" alt=""><span class="brand__name">Full Gas</span></a>
    <nav class="nav__links" aria-label="Principale">
{chr(10).join(links)}
    </nav>
    <div class="nav__cta">
      <a class="nav__live" href="{root}index.html#stasera" data-state="before"><i class="dot dot--pulse"></i><span data-live-label>Premiere 21:00</span><b data-cd-mini>--:--:--</b></a>
      <button class="nav__burger" aria-label="Apri il menu" aria-expanded="false"><span></span></button>
    </div>
  </div>
</header>'''


def footer(root: str) -> str:
    return f'''<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div class="footer__brand">
        <img src="{root}brand/fg_lockup_mono_bianco.png" alt="Full Gas">
        <p style="margin:0">Il canale motori della rete Nexum, la piattaforma editoriale multicanale sul digitale terrestre italiano. Canale 403, HbbTV, Full HD.</p>
        <address><b style="color:var(--bianco)">Blue Vinyl Events S.r.l.s.</b><br>Via degli Olmetti 18, 00060 Formello (RM), Italia<br>P.IVA 17199591003</address>
        <p style="margin:0"><a href="mailto:commerciale@nexumchannel.com">commerciale@nexumchannel.com</a> · <a href="tel:+393440793787">344 079 3787</a></p>
        <div class="badges"><span class="pill">DVB-T2</span><span class="pill">HbbTV</span><span class="pill">LCN 403</span><a class="pill pill--ar" href="https://www.youtube.com/@FullGas403?sub_confirmation=1" target="_blank" rel="noopener">YouTube ↗</a><a class="pill" href="{root}feed.xml">RSS</a></div>
      </div>
      <div><h4>Canale</h4><ul>
        <li><a href="{root}index.html#canale">Il canale</a></li><li><a href="{root}guarda.html">Guarda i video</a></li><li><a href="{root}index.html#programmi">Programmi</a></li><li><a href="{root}index.html#stasera">Stasera · la premiere</a></li><li><a href="{root}index.html#palinsesto">Palinsesto</a></li><li><a href="{root}index.html#hbbtv">Come vederci</a></li></ul></div>
      <div><h4>Editoria</h4><ul>
        <li><a href="{root}diario.html">Il Diario</a></li><li><a href="{root}magazine.html">Il Magazine</a></li><li><a href="{root}magazine/settembre-2026.html">Numero 01 · Settembre 2026</a></li><li><a href="{root}speciale-gazometro.html">Speciale Gazometro</a></li><li><a href="{root}redazione.html">La redazione</a></li><li><a href="{root}garage.html">Il Garage</a></li></ul></div>
      <div><h4>Rete e business</h4><ul>
        <li><a href="https://nexumchannel.com/canali" target="_blank" rel="noopener">Gli otto canali Nexum</a></li><li><a href="https://nexumchannel.com/guarda" target="_blank" rel="noopener">Guarda in diretta</a></li><li><a href="https://nexumchannel.com/inserzionisti" target="_blank" rel="noopener">Area inserzionisti</a></li><li><a href="https://nexumchannel.com/inserzionisti#dati" target="_blank" rel="noopener">Dati di ascolto</a></li><li><a href="https://nexumchannel.com/inserzionisti#contatti" target="_blank" rel="noopener">Contatti</a></li></ul></div>
    </div>
    <p class="small muted" style="margin:32px 0 0;font-size:12.5px;max-width:90ch">Fotografie del Gazometro: Gidipa, Sergio D'Afflitto, Livio Sapio (CC BY-SA 4.0) ed Emiliano Felicissimo (CC BY-SA 2.0), via <a href="https://commons.wikimedia.org/wiki/Category:Gazometro_(Rome)" target="_blank" rel="noopener" style="color:var(--bianco-2)">Wikimedia Commons</a>, ridimensionate. Fotogrammi dei video, immagine chiave e marchi © Blue Vinyl Events S.r.l.s.</p>
    <div class="footer__bottom">
      <span>© <span data-anno>2026</span> Blue Vinyl Events S.r.l.s. — Full Gas, canale 403 digitale terrestre. Tutti i diritti riservati.</span>
      <span><a href="https://nexumchannel.com/privacy" target="_blank" rel="noopener">Privacy</a> · <a href="https://nexumchannel.com/cookie-policy" target="_blank" rel="noopener">Cookie</a> · <a href="https://nexumchannel.com/note-legali" target="_blank" rel="noopener">Note legali</a></span>
    </div>
  </div>
</footer>'''


def replace_block(html: str, name: str, new: str) -> str:
    pat = re.compile(rf"<!-- @{name}(?::[^>]*)? -->.*?<!-- /@{name} -->", re.S)
    if not pat.search(html):
        return html
    marker = pat.search(html).group(0).split("-->")[0] + "-->"
    return pat.sub(lambda m: f"{marker}\n{new}\n<!-- /@{name} -->", html)


# ---------------------------------------------------------------------------
# gli articoli
# ---------------------------------------------------------------------------
def read_articles():
    src = os.path.join(ROOT, "content", "diario")
    arts = []
    for fn in sorted(os.listdir(src)):
        if not fn.endswith(".html"):
            continue
        raw = open(os.path.join(src, fn), encoding="utf-8").read()
        m = re.match(r"\s*<!--\s*(\{.*?\})\s*-->\s*(.*)$", raw, re.S)
        if not m:
            sys.exit(f"{fn}: manca l'intestazione JSON")
        meta = json.loads(m.group(1))
        meta["slug"] = fn[:-5]
        meta["body"] = m.group(2).strip()
        meta["dt"] = datetime.fromisoformat(meta["data"]).replace(tzinfo=ROMA)
        arts.append(meta)
    arts.sort(key=lambda a: a["dt"], reverse=True)
    return arts


MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]


def data_it(dt: datetime) -> str:
    return f"{dt.day} {MESI[dt.month - 1]} {dt.year}"


def card(a: dict, root: str, big: bool = False) -> str:
    cls = "post fade-up" + (" post--big" if big else "")
    return f'''<a class="{cls}" href="{root}diario/{a["slug"]}.html">
        <div class="post__img"><img src="{root}{a["immagine"]}" alt="" loading="lazy"><span class="pill">{escape(a["rubrica"])}</span></div>
        <div class="post__body"><div class="post__k">{escape(a["rubrica"])}<span>{data_it(a["dt"])} · {a["minuti"]} min</span></div><h3 class="post__t">{a["titolo"]}</h3><p class="post__d">{a["sommario"]}</p></div>
      </a>'''


def write_article(a: dict, prev: dict | None, nxt: dict | None, template: str):
    root = "../"
    video = ""
    if a.get("video"):
        video = f'''<div class="player" data-video="{a["video"]}" data-state="before">
        <img src="{root}{a.get("video_img", a["immagine"])}" alt="" loading="lazy">
        <button class="player__btn" type="button" aria-label="Riproduci il video"><span class="player__play"><svg viewBox="0 0 24 24" fill="#0B0C0E"><path d="M5 3l16 9-16 9z"/></svg></span></button>
        <div class="player__meta"><span class="player__title">{escape(a.get("video_titolo", "Guarda il video"))}</span><span class="player__yt">YouTube</span></div>
      </div>
      <p class="yt-note"><svg viewBox="0 0 24 24"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-4.8.5-4.8s0-2.9-.5-4.8zM9.8 15.1V8.9l6 3.1z"/></svg><span>Il video si guarda qui, ma <b>la visualizzazione conta su YouTube</b>: è lo stesso player del canale. Se ti piace, <a href="https://www.youtube.com/watch?v={a["video"]}" target="_blank" rel="noopener" style="color:var(--bianco);border-bottom:1px solid var(--line-2)">lascia un commento</a>.</span></p>'''
    nav_prev = f'<a href="{root}diario/{prev["slug"]}.html"><small>← Precedente</small><b>{prev["titolo"]}</b></a>' if prev else "<span></span>"
    nav_next = f'<a href="{root}diario/{nxt["slug"]}.html"><small>Successivo →</small><b>{nxt["titolo"]}</b></a>' if nxt else "<span></span>"
    out = template
    for k, v in {
        "{{root}}": root, "{{titolo}}": a["titolo"], "{{titolo_txt}}": re.sub(r"<[^>]+>", "", a["titolo"]),
        "{{sommario}}": a["sommario"], "{{sommario_txt}}": re.sub(r"<[^>]+>", "", a["sommario"]),
        "{{rubrica}}": a["rubrica"], "{{data}}": data_it(a["dt"]), "{{iso}}": a["dt"].isoformat(),
        "{{minuti}}": str(a["minuti"]), "{{immagine}}": a["immagine"], "{{didascalia}}": a.get("didascalia", ""),
        "{{autore}}": a.get("autore", "La redazione di Full Gas"), "{{body}}": a["body"], "{{video}}": video,
        "{{prev}}": nav_prev, "{{next}}": nav_next, "{{slug}}": a["slug"],
    }.items():
        out = out.replace(k, v)
    out = replace_block(out, "nav", nav(root, "diario.html"))
    out = replace_block(out, "footer", footer(root))
    os.makedirs(os.path.join(ROOT, "diario"), exist_ok=True)
    open(os.path.join(ROOT, "diario", a["slug"] + ".html"), "w", encoding="utf-8").write(out)


def write_feed(arts):
    items = []
    for a in arts:
        link = f"{SITE_URL}/diario/{a['slug']}.html" if SITE_URL else f"diario/{a['slug']}.html"
        items.append(f'''  <item>
    <title>{escape(re.sub(r"<[^>]+>", "", a["titolo"]))}</title>
    <link>{escape(link)}</link>
    <guid isPermaLink="{'true' if SITE_URL else 'false'}">{escape(link)}</guid>
    <pubDate>{format_datetime(a["dt"])}</pubDate>
    <category>{escape(a["rubrica"])}</category>
    <description>{escape(re.sub(r"<[^>]+>", "", a["sommario"]))}</description>
  </item>''')
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Full Gas · Il Diario</title>
  <link>{escape(SITE_URL or ".")}</link>
  <description>Il diario della redazione di Full Gas, il canale motori della rete Nexum. Storie che vanno a benzina.</description>
  <language>it-it</language>
  <lastBuildDate>{format_datetime(datetime.now(ROMA))}</lastBuildDate>
{chr(10).join(items)}
</channel>
</rss>
'''
    open(os.path.join(ROOT, "feed.xml"), "w", encoding="utf-8").write(xml)


# ---------------------------------------------------------------------------
def main():
    arts = read_articles()
    template = open(os.path.join(ROOT, "tools", "templates", "articolo.html"), encoding="utf-8").read()
    for i, a in enumerate(arts):
        prev = arts[i + 1] if i + 1 < len(arts) else None   # più vecchio
        nxt = arts[i - 1] if i > 0 else None                # più nuovo
        write_article(a, prev, nxt, template)
    write_feed(arts)

    # le pagine alla radice e nelle sottocartelle
    pages = [f for f in os.listdir(ROOT) if f.endswith(".html")] + [os.path.join("magazine", f) for f in os.listdir(os.path.join(ROOT, "magazine")) if f.endswith(".html")]
    for rel in pages:
        path = os.path.join(ROOT, rel)
        html = open(path, encoding="utf-8").read()
        root = "../" if os.sep in rel or "/" in rel else ""
        current = os.path.basename(rel) if root == "" else "magazine.html"
        new = replace_block(html, "nav", nav(root, current))
        new = replace_block(new, "footer", footer(root))
        m = re.search(r"<!-- @diario:(\d+)(?::big)? -->", new)
        if m:
            n = int(m.group(1)); big = ":big" in m.group(0)
            cards = "\n".join(card(a, root, big=(big and i == 0)) for i, a in enumerate(arts[:n]))
            new = replace_block(new, "diario", cards)
        if new != html:
            open(path, "w", encoding="utf-8").write(new)
            print("aggiornata", rel)
    print(f"{len(arts)} articoli · feed.xml · pagine allineate")


if __name__ == "__main__":
    main()
