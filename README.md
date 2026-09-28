# Full Gas — il sito del canale

Sito statico di **Full Gas**, il canale motori della rete Nexum (canale 403 del digitale terrestre, tasto rosso, posizione 8). Nessun framework, nessun build: si apre `index.html` e funziona. Si pubblica su qualunque hosting statico (GitHub Pages, Vercel, Netlify, un FTP).

## Pagine

| file | cosa |
|---|---|
| `index.html` | Home: sigla video, linea editoriale, programmi, palinsesto con la fascia in corso, speciale, magazine, HbbTV, la rete Nexum |
| `speciale-gazometro.html` | Lo speciale *Il Gazometro accende i motori*: reportage in cinque capitoli, numeri, novità, come è costruito, fonti |
| `magazine.html` | *Full Gas Magazine* n. 01: copertina, sommario, sei doppie pagine da sfogliare, cinque articoli di fila |

## Identità

Tutto segue la bibbia visiva del canale (`assets/css/fullgas.css`):

- **Colore** — asfalto `#0B0C0E`, grafite `#17191D`, Ignition Orange `#FE4309`, ambra `#FFA100`, giallo flash `#FFD400` (un solo elemento per volta), bianco caldo `#F5F0EB`, titanio `#8A9199`, oro d'archivio `#C9A227`. Regola 70/20/10: l'arancione non supera il 10% della superficie.
- **Tipografia** — Archivo Expanded Black maiuscolo per la titolazione (tracking −1,5%, interlinea 0,92), Archivo per il testo, JetBrains Mono maiuscolo (tracking +12%) per dati e kicker, Instrument Serif corsivo per la voce d'archivio. I font sono in `assets/fonts/` (Google Fonts, licenza OFL).
- **Marchio** — in `brand/` (monogramma, wordmark, lockup nelle varianti).

## La sigla (il video dell'hero)

`assets/video/sigla.mp4` e `sigla.webm` sono renderizzati da `tools/sigla/sigla.html`: una pagina HTML con le animazioni in pausa, portata fotogramma per fotogramma al tempo giusto da Playwright e codificata con ffmpeg. Zero crediti, ripetibile, e si modifica come una pagina web.

```bash
NODE_PATH=$(npm root -g) node tools/sigla/render.mjs --fps 30 --dur 14
```

Richiede `playwright` (con Chromium) e un ffmpeg con libx264 (variabile `FFMPEG`, altrimenti quello di `imageio-ffmpeg`).

## Controllo visivo

```bash
NODE_PATH=$(npm root -g) node tools/screenshots.mjs
```

Salva in `tools/.shots/` gli screenshot desktop e telefono di ogni pagina e stampa altezza, overflow orizzontale ed errori di console.

## Crediti

Fotografie del Gazometro: Gidipa, Sergio D'Afflitto, Livio Sapio (CC BY-SA 4.0) ed Emiliano Felicissimo (CC BY-SA 2.0), via Wikimedia Commons, ridimensionate. Immagine chiave del canale, marchi e testi © Blue Vinyl Events S.r.l.s. Dati sull'evento al Gazometro dalla stampa specializzata citata nella pagina dello speciale.
