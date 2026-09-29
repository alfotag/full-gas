/* Screenshot delle pagine del sito, desktop e telefono, per il controllo visivo.
   uso: node tools/screenshots.mjs [outDir]   (richiede playwright) */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'tools', '.shots'));
mkdirSync(out, { recursive: true });
const pages = ['index.html', 'rete.html', 'guarda.html', 'speciale-gazometro.html', 'magazine.html'];
const views = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone', width: 390, height: 844, mobile: true }];

const srv = await serve(root);
const browser = await chromium.launch();
for (const v of views) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 1, isMobile: !!v.mobile, hasTouch: !!v.mobile, reducedMotion: 'reduce' });
  for (const p of pages) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(srv.url + p, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    // forza la comparsa di tutto (reveal) e misura l'overflow orizzontale
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in')));
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: path.join(out, `${p.replace('.html', '')}-${v.name}.png`), fullPage: true });
    await page.screenshot({ path: path.join(out, `${p.replace('.html', '')}-${v.name}-fold.png`), fullPage: false });
    console.log(`${p} @${v.name}: height ${h}px, overflow-x ${overflow}px, errors: ${errors.length ? errors.join(' | ') : 'none'}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
srv.close();
