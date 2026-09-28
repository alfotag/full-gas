/*
  Renderizza la sigla di Full Gas da HTML a video.
  Ogni fotogramma è deterministico: la pagina espone window.seek(t) e il renderer
  la porta al tempo t, fa uno screenshot, passa al fotogramma dopo.

  uso:  node tools/sigla/render.mjs [--fps 30] [--dur 14] [--w 1920] [--h 1080] [--out assets/video]
  richiede: playwright (globale o locale) e un ffmpeg con libx264 (FFMPEG=percorso, altrimenti imageio-ffmpeg).
*/
import { chromium } from 'playwright';
import { spawnSync, execSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const arg = (k, def) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : def; };
const fps = +arg('fps', 30), dur = +arg('dur', 14), W = +arg('w', 1920), H = +arg('h', 1080);
const out = path.resolve(root, arg('out', 'assets/video'));
const frames = path.join(here, '.frames');
const ffmpeg = process.env.FFMPEG || (() => {
  try { return execSync('python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())"').toString().trim(); } catch { return 'ffmpeg'; }
})();

rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true }); mkdirSync(out, { recursive: true });

const srv = await serve(root);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(srv.url + 'tools/sigla/sigla.html', { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; }))));
await page.waitForTimeout(200);

const N = Math.round(fps * dur);
const t0 = Date.now();
for (let f = 0; f < N; f++) {
  await page.evaluate((t) => window.seek(t), f / fps);
  await page.screenshot({ path: path.join(frames, String(f).padStart(5, '0') + '.png'), type: 'png' });
  if (f % 60 === 0) process.stdout.write(`frame ${f}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
}
await browser.close();
srv.close();

const run = (args) => { const r = spawnSync(ffmpeg, args, { stdio: 'inherit' }); if (r.status !== 0) throw new Error('ffmpeg failed: ' + args.join(' ')); };
const seq = path.join(frames, '%05d.png');
run(['-y', '-framerate', String(fps), '-i', seq, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '19', '-preset', 'slow', '-movflags', '+faststart', '-an', path.join(out, 'sigla.mp4')]);
run(['-y', '-framerate', String(fps), '-i', seq, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-an', path.join(out, 'sigla.webm')]);
// poster: il fotogramma del titolo
const posterFrame = path.join(frames, String(Math.round(fps * 4.6)).padStart(5, '0') + '.png');
run(['-y', '-i', posterFrame, '-q:v', '3', path.join(out, 'sigla-poster.jpg')]);
console.log('fatto →', out);
