#!/usr/bin/env node
/* shot: screenshots holes so you can see them. Builds a preview page (preview/, gitignored) with
   only the courses you name, serves the repo, and for each hole saves the aim view from the tee
   and the top-down overview (and, with --swing, the putter mid-backswing).
   Usage: node scripts/shot.cjs --course 3 [--hole 3-7] [--swing] [--out dir]
   Prints the PNG paths and any console errors. Safe to run while other courses are being edited:
   it only builds the course you ask for, plus its world's first course (whose look the others inherit). */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { build, ROOT } = require('./build.cjs');

const args = process.argv.slice(2), val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const course = Number(val('--course') || (val('--hole') || '').split('-')[0]);
if (!course) { console.error('shot: --course N or --hole N-M'); process.exit(2); }
const only = val('--hole'), out = path.resolve(val('--out') || path.join(ROOT, 'preview', 'shots', 'c' + String(course).padStart(2, '0')));
fs.mkdirSync(out, { recursive: true });
const page = `preview/c${String(course).padStart(2, '0')}-${process.pid}.html`;
fs.writeFileSync(path.join(ROOT, page), build([...new Set([((course - 1) % 10) + 1, course])]));

const srv = http.createServer((req, res) => {
  const p = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
srv.listen(0, '127.0.0.1', async () => {
  const pw = require('playwright-core');
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || pw.chromium.executablePath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const tab = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  const errors = [];
  tab.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  tab.on('pageerror', e => errors.push(String(e)));
  await tab.goto(`http://127.0.0.1:${srv.address().port}/${page}?hole=${course}-1`);
  await tab.waitForFunction(() => window.booted === true, null, { timeout: 300000 });
  tab.setDefaultTimeout(300000);
  const keys = await tab.evaluate(c => WORLDS[c] ? WORLDS[c].holes.map(h => h.key) : [], course);
  const files = [];
  for (const key of keys) {
    if (only && key !== only) continue;
    await tab.evaluate(k => { loopPaused = true; startHole(k); for (let i = 0; i < 3; i++) renderFrame(0.016); snapCamera(); renderFrame(0.016); }, key);
    const f1 = path.join(out, key + '-aim.png'); await tab.screenshot({ path: f1 }); files.push(f1);
    await tab.evaluate(() => { setOverview(true); snapCamera(); renderFrame(0.016); });
    const f2 = path.join(out, key + '-overview.png'); await tab.screenshot({ path: f2 }); files.push(f2);
    await tab.evaluate(() => setOverview(false));
    if (args.includes('--swing')) {
      await tab.evaluate(() => { play.swing = { id: 1, sx: 1110, sy: 230, x: 1110, back: 260, samples: [] }; snapCamera(); renderFrame(0.016); });
      const f3 = path.join(out, key + '-swing.png'); await tab.screenshot({ path: f3 }); files.push(f3);
      await tab.evaluate(() => { play.swing = null; });
    }
  }
  await browser.close(); srv.close();
  fs.rmSync(path.join(ROOT, page), { force: true });
  for (const f of files) console.log(path.relative(ROOT, f));
  console.log(errors.length ? 'console errors:\n  ' + errors.join('\n  ') : 'no console errors');
  process.exit(errors.length ? 1 : 0);
});
