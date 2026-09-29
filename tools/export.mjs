/* Esporta l'immagine per i social (og.jpg, 1200×630) e il PDF del numero del magazine.
   uso: node tools/export.mjs [numero-slug]   (default: settembre-2026) — richiede playwright */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2] || 'settembre-2026';
const srv = await serve(root);
const browser = await chromium.launch();

// og.jpg
let page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(srv.url + 'tools/og.html', { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(200);
await page.screenshot({ path: path.join(root, 'og.jpg'), type: 'jpeg', quality: 90 });
console.log('og.jpg');
await page.close();

// PDF del numero: modalità "di fila", regole @media print della pagina
page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(srv.url + 'magazine/' + slug + '.html', { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { const r = document.querySelector('.rivista'); if (r) r.setAttribute('data-mode', 'fila'); document.querySelectorAll('.fade-up, .split .ln > span').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); });
await page.waitForTimeout(800);
await page.emulateMedia({ media: 'print' });
const pdf = path.join(root, 'magazine', 'full-gas-magazine-01-' + slug + '.pdf');
await page.pdf({ path: pdf, format: 'A4', landscape: true, printBackground: true, margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' }, preferCSSPageSize: false });
console.log(pdf);
await browser.close(); srv.close();
try { console.log(execSync('ls -la "' + pdf + '" "' + path.join(root, 'og.jpg') + '"').toString()); } catch {}
