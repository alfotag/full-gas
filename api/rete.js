/* La rete Nexum su YouTube: la funzione che tiene aggiornata la pagina (Vercel, runtime Node).
   GET /api/rete?ids=UC…,UC…  →  { generato, canali: { "UC…": { video: [...], short: [...] } } }
   Legge i feed pubblici di YouTube, senza chiave API, esattamente come tools/rete.py, e risponde
   con la stessa forma dello snapshot. La CDN tiene la risposta 15 minuti e la rinnova in sottofondo.
   Su un hosting senza funzioni (GitHub Pages, un FTP) questo file non gira: la pagina usa lo snapshot. */
'use strict';

const RE_ID = /^UC[\w-]{22}$/;
const UA = 'Mozilla/5.0 (compatible; FullGasSito/1.0; +https://nexumchannel.com)';
const PER_CANALE = 15;
const ENTITA = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const decodifica = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isNaN(n) ? m : String.fromCodePoint(n); }
  const k = e.toLowerCase(); return ENTITA[k] !== undefined ? ENTITA[k] : m;
});
const campo = (blocco, tag) => { const m = blocco.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>')); return m ? decodifica(m[1].trim()) : ''; };

function leggiFeed(xml) {
  if (!xml || xml.indexOf('<feed') < 0) return [];           // una pagina di errore al posto dell'XML
  const out = [], re = /<entry>([\s\S]*?)<\/entry>/g; let m;
  while ((m = re.exec(xml))) {
    const b = m[1], id = campo(b, 'yt:videoId'); if (!id) continue;
    const v = b.match(/<media:statistics[^>]*\bviews="(\d+)"/);
    out.push({ id, titolo: campo(b, 'title'), data: campo(b, 'published'), views: v ? +v[1] : 0 });
  }
  return out;
}

async function feed(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'it-IT,it;q=0.9' } });
    if (!r.ok) return [];                                     // 404: playlist vuota (niente short, o niente video lunghi)
    return leggiFeed(await r.text());
  } catch (e) { return []; }
}

async function canale(id) {
  const s = id.slice(2), base = 'https://www.youtube.com/feeds/videos.xml?';
  const [lunghi, short, tutti] = await Promise.all([feed(base + 'playlist_id=UULF' + s), feed(base + 'playlist_id=UUSH' + s), feed(base + 'channel_id=' + id)]);
  const visti = new Set(lunghi.concat(short).map((v) => v.id));
  for (const v of tutti) if (!visti.has(v.id)) lunghi.push(v);   // dirette e premiere, che non stanno nelle due playlist
  const perData = (a, b) => (b.data || '').localeCompare(a.data || '');
  return { video: lunghi.sort(perData).slice(0, PER_CANALE), short: short.sort(perData).slice(0, PER_CANALE) };
}

module.exports = async (req, res) => {
  let grezzo = '';
  try { grezzo = (req.query && req.query.ids) || new URL(req.url || '', 'http://x').searchParams.get('ids') || ''; } catch (e) {}
  const ids = [...new Set(String(grezzo).split(',').map((x) => x.trim()).filter((x) => RE_ID.test(x)))].slice(0, 12);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (!ids.length) { res.statusCode = 400; res.setHeader('Cache-Control', 'no-store'); return res.end(JSON.stringify({ errore: 'Serve ?ids=UC…,UC… con gli id dei canali YouTube (al massimo 12).' })); }
  const canali = {};
  await Promise.all(ids.map(async (id) => { canali[id] = await canale(id); }));
  res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=900, stale-while-revalidate=3600');
  res.statusCode = 200;
  res.end(JSON.stringify({ generato: new Date().toISOString(), canali }));
};
module.exports.leggiFeed = leggiFeed;
