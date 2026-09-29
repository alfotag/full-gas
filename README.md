# Full Gas — il sito del canale

Sito statico di **Full Gas**, il canale motori della rete Nexum (canale 403 del digitale terrestre, tasto rosso, posizione 8). Nessun framework, nessun build: si apre `index.html` e funziona. Si pubblica su qualunque hosting statico (GitHub Pages, Vercel, Netlify, un FTP).

## Pagine

| file | cosa |
|---|---|
| `index.html` | Home: accensione, sigla nell'hero, chi è Full Gas, programmi in scorrimento orizzontale, la premiere di stasera (Gazometro disegnato su canvas, countdown, player YouTube, capitoli, short), dal Diario, palinsesto ad anello, magazine 3D, il Garage, televisore e telecomando, la rete Nexum |
| `guarda.html` | La videoteca: lo speciale con i capitoli, la playlist dei caricamenti del canale (si aggiorna da sola), ogni video con il player ufficiale di YouTube, gli short, la fila degli altri canali della rete |
| `rete.html` | La rete Nexum su YouTube: il monoscopio, il quadrante degli otto canali (fisso sotto la barra, tasti 1–8), per ogni canale l'ultimo video in evidenza, la griglia dei video, la fila degli short; lo schermo con il player ufficiale e le frecce per zappare; il flusso delle ultime uscite di tutta la rete; le campanelle |
| `diario.html` + `diario/*.html` | Il Diario della redazione: otto articoli di settembre, generati da `content/diario/` |
| `magazine.html` + `magazine/settembre-2026.html` | L'edicola e il numero 01 (settembre 2026): 14 doppie pagine da sfogliare o da leggere di fila, con il PDF |
| `redazione.html` | Chi fa Full Gas, come lavora, contatti, kit stampa |
| `garage.html` | La community: la domanda del mese, la newsletter, manda la tua moto, gli appuntamenti |
| `speciale-gazometro.html` | Lo speciale *Eternal City Moto Show 2026*: player con i capitoli al minuto, sei capitoli, i protagonisti, fonti |
| `feed.xml` | Il feed RSS del Diario |

## Come si aggiorna

```bash
python3 tools/build.py          # genera gli articoli da content/diario, l'indice, il feed; allinea nav, footer e blocchi della rete ovunque
python3 tools/rete.py           # scarica i feed YouTube dei canali della rete e aggiorna lo snapshot (assets/data/rete.js)
node tools/export.mjs settembre-2026   # og.jpg per i social e il PDF del numero (richiede playwright)
```

Un articolo nuovo è un file in `content/diario/` con un'intestazione JSON in commento (titolo, sommario, rubrica, data, minuti, immagine, video opzionale) seguita dal corpo in HTML. Nav e footer si scrivono una volta sola in `tools/build.py` e vengono inseriti fra i marcatori `<!-- @nav -->` e `<!-- @footer -->` di ogni pagina.

## Si guarda qui, conta là

Ogni video si riproduce nel player ufficiale di YouTube (`youtube-nocookie.com/embed`), caricato solo al click: la visualizzazione, il tempo di visione e l'iscrizione contano sul canale @FullGas403. La playlist della videoteca è quella dei caricamenti del canale (`UUH0v_efZqSS6ZmvFHaYiafg`), quindi si aggiorna da sola. I link "Iscriviti" usano `?sub_confirmation=1`.

## La rete su YouTube

I canali della rete stanno in `content/rete/canali.json`: posizione nel menu del tasto rosso, nome, genere, claim, descrizione, colore, stato, il canale YouTube (id `UC…`, handle, immagine profilo) e la scheda su nexumchannel.com. Nexum TV non ha un canale YouTube (`"youtube": null`): resta nel quadrante con il rimando alla diretta.

I video arrivano dai **feed pubblici di YouTube**, senza chiave API: per ogni canale la playlist dei video lunghi (`UULF` + id), quella degli short (`UUSH` + id) e il feed del canale, quindici caricamenti ciascuna. Due strade, la stessa forma dei dati:

- `python3 tools/rete.py` scarica i feed e scrive lo **snapshot** `assets/data/rete.js` (`window.FG_RETE`), che la pagina legge subito, anche da `file://`. Scarica una volta le immagini profilo in `assets/img/rete/` (`--avatar` per riscaricarle). Poi rigenera i blocchi `<!-- @rete-… -->` di tutte le pagine (monoscopio, quadrante, schede, campanelle, la griglia in home, la fila nella videoteca); `--pagine` fa solo questo, senza rete, ed è quello che fa anche `build.py`.
- `api/rete.js` è una **funzione Vercel** (`GET /api/rete?ids=UC…,UC…`) che legge gli stessi feed dal vivo; la CDN la tiene 15 minuti. La pagina la chiama dopo il caricamento e, se risponde, aggiorna le liste. Su un hosting senza funzioni la chiamata fallisce in silenzio e resta lo snapshot: conviene rilanciare `tools/rete.py` ogni tanto e pubblicare.

Le miniature sono quelle di YouTube (`i.ytimg.com`: `hq720`/`maxresdefault` per i video, `oar2` in verticale per gli short, con ripiego automatico). Ogni video si apre nello **schermo**, il player ufficiale `youtube-nocookie.com`, caricato solo al click: la visualizzazione conta sul canale. Sul quadrante: click, tasti da 1 a 8, frecce; `rete.html#salute24` apre la pagina già sintonizzata.

## Community

- **La benzina del lunedì**: il modulo spedisce a `FG_CONFIG.newsletterEndpoint` (in `assets/js/config.js`, POST JSON); se è vuoto apre una mail alla redazione.
- **La domanda del mese**: la risposta si copia negli appunti e si apre il video su YouTube per incollarla nel commento. Non c'è un contatore lato server: i voti sono i commenti.
- **Manda la tua moto** e **gli appuntamenti**: mail alla redazione con oggetto e campi precompilati.

## Identità

Tutto segue la bibbia visiva del canale (`assets/css/fullgas.css`):

- **Colore** — asfalto `#0B0C0E`, grafite `#17191D`, Ignition Orange `#FE4309`, ambra `#FFA100`, giallo flash `#FFD400` (un solo elemento per volta), bianco caldo `#F5F0EB`, titanio `#8A9199`, oro d'archivio `#C9A227`. Regola 70/20/10: l'arancione non supera il 10% della superficie.
- **Tipografia** — Archivo Expanded Black maiuscolo per la titolazione (tracking −1,5%, interlinea 0,92), Archivo per il testo, JetBrains Mono maiuscolo (tracking +12%) per dati e kicker, Instrument Serif corsivo per la voce d'archivio. I font sono in `assets/fonts/` (Google Fonts, licenza OFL).
- **Marchio** — in `brand/` (monogramma, wordmark, lockup nelle varianti).

## Movimento

`assets/js/motion.js` è condiviso da tutte le pagine: scorrimento morbido (Lenis), accensione all'ingresso (una volta per sessione), cursore, righe dei titoli che entrano, contagiri in basso a destra (la lancetta segue la velocità di scorrimento, l'anello l'avanzamento; cliccato torna in cima), pill della premiere in barra. `assets/js/home.js` fa la home: il Gazometro a traliccio disegnato in `assets/js/gazometro.js`, la pista dei programmi (GSAP ScrollTrigger), l'anello del palinsesto, lo speciale a scorrimento, il libro che si apre, il televisore. Le librerie (GSAP 3.13, Lenis 1.3) stanno in `assets/vendor/`. Con *riduci movimento* attivo tutto resta fermo e completo.

## La premiere

Data e ora della premiere sono in `motion.js` (`FG.PREMIERE`, 29 settembre 2026 alle 21:00 di Roma, durata 34′) e l'ID del video in `FG.VIDEO_ID`. Prima delle 21:00 le pagine mostrano il countdown; durante, "in onda ora"; dopo, "disponibile". Il player carica l'iframe di YouTube solo al click.

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
