#!/usr/bin/env python3
"""
La rete Nexum su YouTube: il generatore.

Legge le redazioni della rete da `content/rete/canali.json` e, per ogni canale che ha
un canale YouTube, scarica i feed pubblici (senza chiave API): la playlist dei video
lunghi (`UULF…`), quella degli short (`UUSH…`) e il feed del canale. Ne ricava gli
ultimi caricamenti e li scrive in `assets/data/rete.js` (window.FG_RETE), che le pagine
leggono anche da file:// e senza rete. Scarica una volta le immagini profilo dei canali
in `assets/img/rete/`. Infine aggiorna, in tutte le pagine, i blocchi generati fra i
marcatori `<!-- @rete-… -->` (monoscopio, quadrante, schede, iscrizioni, griglia, mini).

Uso:
  python3 tools/rete.py            # scarica i feed, aggiorna dati, immagini e pagine
  python3 tools/rete.py --pagine   # solo i blocchi nelle pagine, senza rete (lo fa anche build.py)
  python3 tools/rete.py --avatar   # riscarica anche le immagini profilo

Nessuna dipendenza oltre alla libreria standard. In produzione la pagina prova poi ad
aggiornarsi da sola tramite `api/rete.js` (Vercel): questo snapshot è la base e il ripiego.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANALI = os.path.join(ROOT, "content", "rete", "canali.json")
DATI = os.path.join(ROOT, "assets", "data", "rete.js")
AVATAR_DIR = os.path.join(ROOT, "assets", "img", "rete")
UA = "Mozilla/5.0 (compatible; FullGasSito/1.0; +https://nexumchannel.com)"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "media": "http://search.yahoo.com/mrss/"}
PER_CANALE = 15   # quanti caricamenti tiene ogni feed di YouTube


# ---------------------------------------------------------------------------
# i dati
# ---------------------------------------------------------------------------
def leggi_canali() -> list[dict]:
    canali = json.load(open(CANALI, encoding="utf-8"))
    canali.sort(key=lambda c: c["pos"])
    for c in canali:
        c["avatar"] = f"assets/img/rete/{c['slug']}." + ("svg" if not c.get("youtube") else "jpg")
    return canali


def scarica(url: str, timeout: int = 25) -> bytes | None:
    """Un GET semplice. 404 (playlist vuota, canale senza short) vale come «niente»."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        print(f"  ! {url}: HTTP {e.code}", file=sys.stderr)
        return None
    except Exception as e:  # rete assente, timeout
        print(f"  ! {url}: {e}", file=sys.stderr)
        return None


def leggi_feed(raw: bytes | None) -> list[dict]:
    """Dal feed Atom di YouTube agli elementi: id, titolo, data ISO, visualizzazioni."""
    if not raw:
        return []
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:      # una pagina HTML di errore al posto dell'XML
        return []
    out = []
    for e in root.findall("a:entry", NS):
        vid = e.findtext("yt:videoId", namespaces=NS)
        if not vid:
            continue
        st = e.find("media:group/media:community/media:statistics", NS)
        views = int(st.get("views") or 0) if st is not None else 0
        out.append({"id": vid, "titolo": (e.findtext("a:title", namespaces=NS) or "").strip(), "data": e.findtext("a:published", namespaces=NS) or "", "views": views})
    return out


def feed_canale(cid: str) -> tuple[list[dict], list[dict]]:
    """Video lunghi e short di un canale, dal più recente."""
    suffisso = cid[2:]
    lunghi = leggi_feed(scarica(f"https://www.youtube.com/feeds/videos.xml?playlist_id=UULF{suffisso}"))
    short = leggi_feed(scarica(f"https://www.youtube.com/feeds/videos.xml?playlist_id=UUSH{suffisso}"))
    tutti = leggi_feed(scarica(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"))
    visti = {v["id"] for v in lunghi} | {v["id"] for v in short}
    for v in tutti:                       # quello che non sta in nessuna delle due playlist (dirette, premiere) va coi video
        if v["id"] not in visti:
            lunghi.append(v)
    lunghi.sort(key=lambda v: v["data"], reverse=True)
    short.sort(key=lambda v: v["data"], reverse=True)
    return lunghi[:PER_CANALE], short[:PER_CANALE]


def scarica_avatar(c: dict, forza: bool = False) -> None:
    yt = c.get("youtube")
    if not yt or not yt.get("avatar"):
        return
    dest = os.path.join(ROOT, c["avatar"])
    if os.path.exists(dest) and not forza:
        return
    raw = scarica(yt["avatar"])
    if raw:
        os.makedirs(AVATAR_DIR, exist_ok=True)
        open(dest, "wb").write(raw)
        print(f"  immagine profilo · {c['nome']}")


def leggi_snapshot() -> dict | None:
    if not os.path.exists(DATI):
        return None
    txt = open(DATI, encoding="utf-8").read()
    m = re.search(r"window\.FG_RETE\s*=\s*(\{.*\});?\s*$", txt, re.S)
    return json.loads(m.group(1)) if m else None


def aggiorna_dati(canali: list[dict], avatar: bool = False) -> dict:
    vecchio = leggi_snapshot() or {}
    prima = {c["slug"]: c for c in vecchio.get("canali", [])}
    out = []
    for c in canali:
        scarica_avatar(c, forza=avatar)
        voce = {k: c.get(k) for k in ("slug", "pos", "nome", "categoria", "claim", "descrizione", "nota", "stato", "colore", "youtube", "nexum", "sito", "diretta", "avatar") if c.get(k) is not None}
        if c.get("youtube"):
            video, short = feed_canale(c["youtube"]["id"])
            if not video and not short and prima.get(c["slug"], {}).get("video") is not None:
                # niente risposta: si tiene quello che c'era, piuttosto che svuotare la pagina
                video, short = prima[c["slug"]].get("video", []), prima[c["slug"]].get("short", [])
                print(f"  {c['nome']}: feed non raggiungibile, tengo lo snapshot precedente")
            voce["video"], voce["short"] = video, short
            print(f"  {c['nome']:<18} video {len(video):>2} · short {len(short):>2}")
        else:
            print(f"  {c['nome']:<18} senza YouTube")
        out.append(voce)
    dati = {"generato": datetime.now(timezone.utc).replace(microsecond=0).isoformat(), "canali": out}
    testo = "/* generato da tools/rete.py — gli ultimi caricamenti YouTube dei canali della rete Nexum. Non modificare a mano. */\nwindow.FG_RETE = " + json.dumps(dati, ensure_ascii=False, separators=(",", ":")) + ";\n"
    os.makedirs(os.path.dirname(DATI), exist_ok=True)
    open(DATI, "w", encoding="utf-8").write(testo)
    return dati


# ---------------------------------------------------------------------------
# i blocchi nelle pagine
# ---------------------------------------------------------------------------
def _yt(c: dict) -> dict | None:
    return c.get("youtube") or None


def _stato(c: dict) -> str:
    return "Live sul 403" if c["stato"] == "live" else "In arrivo"


def blocco_barre(canali, root):
    """Il monoscopio: otto barre, una per canale, nei colori della rete."""
    barre = "".join(
        f'<a class="barre__b" href="{root}rete.html#{c["slug"]}" style="--c:{c["colore"]};--k:{k}" title="{c["pos"]:02d} · {escape(c["nome"])}"><span class="barre__nome">{escape(c["nome"])}</span><span class="barre__n">{c["pos"]:02d}</span></a>'
        for k, c in enumerate(canali))
    return f'<div class="barre" aria-label="Gli otto canali della rete, uno per barra">{barre}</div>'


def blocco_dial(canali, root):
    """Il quadrante: la barra dei canali, fissa sotto la navigazione."""
    voci = []
    for c in canali:
        yt = _yt(c)
        st = '<span class="dial__st dial__st--yt">YouTube</span>' if yt else '<span class="dial__st">Diretta</span>'
        voci.append(f'<a class="dial__ch" href="#{c["slug"]}" style="--c:{c["colore"]}" aria-current="false" data-ch="{c["slug"]}" data-pos="{c["pos"]}"><span class="dial__n">{c["pos"]:02d}</span><img class="dial__av" src="{root}{c["avatar"]}" alt="" width="34" height="34" loading="lazy"><span class="dial__t"><b>{escape(c["nome"])}</b><small>{escape(c["categoria"])}</small></span>{st}</a>')
    return f'''<nav class="dial" aria-label="Cambia canale">
  <div class="dial__track">{"".join(voci)}</div>
</nav>'''


def blocco_canali(canali, root):
    """Le schede: una sezione per canale; le liste dei video le riempie rete.js."""
    out = []
    for c in canali:
        yt = _yt(c)
        nota = f'<p class="ch__nota">{escape(c["nota"])}</p>' if c.get("nota") else ""
        if yt:
            h = yt["handle"]
            meta = f'''<div class="ch__meta"><span>YouTube · <b><a href="https://www.youtube.com/@{h}" target="_blank" rel="noopener">@{escape(h)}</a></b></span><span>Ultimi · <b data-ch-n="video">–</b> video · <b data-ch-n="short">–</b> short</span><span>Ultima uscita · <b data-ch-last>–</b></span></div>'''
            azioni = f'''<div class="ch__act"><a class="btn btn--yt btn--primary" href="https://www.youtube.com/@{h}?sub_confirmation=1" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-4.8.5-4.8s0-2.9-.5-4.8zM9.8 15.1V8.9l6 3.1z"/></svg>Iscriviti</a><a class="btn btn--ghost" href="https://www.youtube.com/@{h}/videos" target="_blank" rel="noopener">Tutti i video ↗</a><a class="btn btn--ghost" href="https://www.youtube.com/@{h}/shorts" target="_blank" rel="noopener">Gli short ↗</a>{f'<a class="btn btn--ghost" href="{root}{c["sito"]}">La videoteca</a>' if c.get("sito") else f'<a class="btn btn--ghost" href="{c["nexum"]}" target="_blank" rel="noopener">La diretta ↗</a>'}</div>'''
            corpo = f'''<div class="ch__featured" data-featured hidden></div>
    <div class="ch__block" data-block="video" hidden><h3 class="ch__h">Ultimi video <small data-ch-count="video"></small></h3><div class="ch__grid" data-list="video"></div></div>
    <div class="ch__block" data-block="short" hidden><h3 class="ch__h">Gli short <small data-ch-count="short"></small></h3><div class="ch__shorts" data-list="short" tabindex="0" aria-label="Gli short, in scorrimento orizzontale"></div></div>
    <div class="ch__empty" data-empty hidden><b>Su YouTube il canale è appena nato.</b><span>I primi video compaiono qui appena escono. Intanto iscriviti: la campanella avvisa un minuto prima di ogni premiere.</span></div>'''
        else:
            meta = f'''<div class="ch__meta"><span>YouTube · <b>nessun canale</b></span><span>Dove · <b>canale 403 · nexumchannel.com</b></span><span>Stato · <b>{_stato(c)}</b></span></div>'''
            azioni = f'''<div class="ch__act"><a class="btn btn--primary" href="{c.get("diretta") or c["nexum"]}" target="_blank" rel="noopener">Guarda la diretta ↗</a><a class="btn btn--ghost" href="{c["nexum"]}" target="_blank" rel="noopener">La scheda su nexumchannel.com ↗</a><a class="btn btn--ghost" href="{root}index.html#hbbtv">Come vederci sul 403</a></div>'''
            corpo = f'''<div class="ch__empty ch__empty--diretta"><b>Questo canale non è su YouTube.</b><span>Nexum TV va in onda ventiquattr'ore su ventiquattro sul 403, e in diretta su nexumchannel.com: è il primo canale del menu del tasto rosso.</span><a class="btn btn--ghost btn--sm" href="{c.get("diretta") or c["nexum"]}" target="_blank" rel="noopener">Apri la diretta ↗</a></div>'''
        out.append(f'''<section class="ch" id="{c["slug"]}" data-ch="{c["slug"]}" style="--c:{c["colore"]}" aria-label="{escape(c["nome"])}">
    <header class="ch__head">
      <img class="ch__av" src="{root}{c["avatar"]}" alt="" width="112" height="112" loading="lazy">
      <div class="ch__id">
        <p class="ch__k"><b>{c["pos"]:02d}</b><span>{escape(c["categoria"])}</span><span class="ch__stato{' is-live' if c["stato"] == "live" else ''}">{_stato(c)}</span></p>
        <h2 class="ch__nome">{escape(c["nome"])}</h2>
        <p class="ch__claim">{escape(c["claim"])}</p>
        <p class="ch__descr">{escape(c["descrizione"])}</p>
        {nota}
      </div>
      <div class="ch__side">{meta}{azioni}</div>
    </header>
    {corpo}
  </section>''')
    return "\n  ".join(out)


def blocco_iscriviti(canali, root):
    """Otto campanelle: un'iscrizione per canale (la diretta per chi non è su YouTube)."""
    voci = []
    for c in canali:
        yt = _yt(c)
        if yt:
            href, etichetta, piccolo = f'https://www.youtube.com/@{yt["handle"]}?sub_confirmation=1', "Iscriviti ↗", f'@{yt["handle"]}'
        else:
            href, etichetta, piccolo = (c.get("diretta") or c["nexum"]), "Guarda la diretta ↗", "solo in diretta"
        voci.append(f'<a class="abb" href="{href}" target="_blank" rel="noopener" style="--c:{c["colore"]}"><img src="{root}{c["avatar"]}" alt="" width="44" height="44" loading="lazy"><span><b>{escape(c["nome"])}</b><small>{escape(piccolo)}</small></span><span class="abb__btn">{etichetta}</span></a>')
    return f'<div class="abbonati">{"".join(voci)}</div>'


def blocco_griglia(canali, root):
    """La griglia della rete nella home: ogni scheda porta alla pagina della rete, sul suo canale."""
    voci = []
    for c in canali:
        yt = _yt(c)
        online = f'YouTube · @{yt["handle"]}' if yt else "In diretta su nexumchannel.com"
        fg = ' class="is-fg"' if c["slug"] == "full-gas" else ""
        voci.append(f'<a href="{root}rete.html#{c["slug"]}"{fg} style="--c:{c["colore"]}"><img src="{root}{c["avatar"]}" alt="" width="40" height="40" loading="lazy"><b><i></i>{escape(c["nome"])}</b><span>{escape(c["claim"])}</span><small>{escape(c["categoria"])} · {_stato(c)}<br>{escape(online)}</small></a>')
    return f'<div class="rete rete--yt fade-up">{"".join(voci)}</div>'


def blocco_mini(canali, root):
    """La fila compatta dei canali, per le altre pagine (la videoteca)."""
    voci = "".join(f'<a href="{root}rete.html#{c["slug"]}" style="--c:{c["colore"]}"><img src="{root}{c["avatar"]}" alt="" width="28" height="28" loading="lazy"><span class="n">{c["pos"]:02d}</span>{escape(c["nome"])}</a>' for c in canali)
    return f'<div class="mini-rete">{voci}</div>'


BLOCCHI = {"rete-barre": blocco_barre, "rete-dial": blocco_dial, "rete-canali": blocco_canali, "rete-iscriviti": blocco_iscriviti, "rete-griglia": blocco_griglia, "rete-mini": blocco_mini}


def applica_blocchi(html: str, root: str = "", canali: list[dict] | None = None) -> str:
    """Sostituisce, in una pagina, ogni blocco `<!-- @rete-… -->…<!-- /@rete-… -->` presente."""
    canali = canali or leggi_canali()
    for nome, fn in BLOCCHI.items():
        pat = re.compile(rf"<!-- @{nome} -->.*?<!-- /@{nome} -->", re.S)
        if pat.search(html):
            nuovo = fn(canali, root)
            html = pat.sub(lambda m: f"<!-- @{nome} -->\n{nuovo}\n<!-- /@{nome} -->", html)
    return html


def aggiorna_pagine(canali: list[dict]) -> None:
    pagine = [f for f in os.listdir(ROOT) if f.endswith(".html")]
    for rel in sorted(pagine):
        path = os.path.join(ROOT, rel)
        html = open(path, encoding="utf-8").read()
        nuovo = applica_blocchi(html, "", canali)
        if nuovo != html:
            open(path, "w", encoding="utf-8").write(nuovo)
            print("  aggiornata", rel)


def main(argv: list[str]) -> None:
    canali = leggi_canali()
    if "--pagine" not in argv:
        print("feed YouTube:")
        dati = aggiorna_dati(canali, avatar="--avatar" in argv)
        n_v = sum(len(c.get("video", [])) for c in dati["canali"]); n_s = sum(len(c.get("short", [])) for c in dati["canali"])
        print(f"assets/data/rete.js · {n_v} video · {n_s} short · {dati['generato']}")
    print("pagine:")
    aggiorna_pagine(canali)


if __name__ == "__main__":
    main(sys.argv[1:])
