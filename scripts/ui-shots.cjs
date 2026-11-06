#!/usr/bin/env node
/* ui-shots: screenshots of every scene and overlay (home, profiles, courses, a world, the map, the
   party picker, the shop, a hole, its intro banner, the done card, the scorecard) at iPad landscape
   (1024x768) and a phone (844x390), for UI work. Builds a preview of the sources, serves the repo,
   and writes ipad-NAME.png and phone-NAME.png into the folder you give.
   Usage: node scripts/ui-shots.cjs <out-dir>   (CHROMIUM=/path/to/chrome, else playwright-core's) */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { build, ROOT } = require('./build.cjs');

const out = path.resolve(process.argv[2] || path.join(ROOT, 'preview', 'ui'));
fs.mkdirSync(out, { recursive: true });
const page = 'ui-shots-' + process.pid + '.html';
fs.writeFileSync(path.join(ROOT, page), build());   /* at the root, so the manifest and icons resolve */

/* each entry: a name and the page-side code that opens that scene */
const SHOTS = [
  ['title', 'showTitle()'],
  ['profiles', 'showProfiles()'],
  ['worlds', 'showWorlds()'],
  ['world', 'showWorld(1)'],
  ['map', 'showMap(playable()[0])'],
  ['partypick', 'showMap(playable()[0]); partyBtn.click()'],
  ['shop', 'openShop()'],
  ['hole', `goHole(WORLDS[playable()[0]].holes[2].key); play.intro = null; holeBanner.classList.remove('show')`],
  ['banner', `goHole(WORLDS[playable()[0]].holes[3].key)`],
  ['done', `(() => { goHole(WORLDS[playable()[0]].holes[0].key); play.intro = null; loopPaused = true; const h = play.hole;
    play.ball = newBall(h, h.cup[0], h.cup[1] - 0.2); beginPutt(0, 0); for (let i = 0; i < 400 && play.phase !== 'done'; i++) advance(1 / 60); })()`],
  ['card', `(() => { const w = playable()[0]; for (const h of WORLDS[w].holes) recordHole(progress, h.key, h.par, h.par); showCard(w); })()`],
];

const srv = http.createServer((req, res) => {
  const p = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
srv.listen(0, '127.0.0.1', async () => {
  process.env.PUTTX_URL = `http://127.0.0.1:${srv.address().port}/${page}`;
  const { open } = require('../tests/lib.cjs');
  const errors = [];
  try {
    for (const [w, h, tag] of [[1024, 768, 'ipad'], [844, 390, 'phone']]) {
      const s = await open('', { viewport: { width: w, height: h } });
      for (const [name, js] of SHOTS) {
        try { await s.page.evaluate(js); } catch (e) { errors.push(`${tag}-${name}: ${String(e).slice(0, 120)}`); }
        await s.page.waitForTimeout(2500);   /* past the scene wipe */
        await s.page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish(); } catch (e) { /* infinite loops stay */ } } });
        await s.page.screenshot({ path: path.join(out, `${tag}-${name}.png`) });
      }
      errors.push(...s.errors.map(e => `${tag}: ${e}`));
      await s.browser.close();
    }
  } finally {
    srv.close();
    fs.rmSync(path.join(ROOT, page), { force: true });
  }
  console.log(`${SHOTS.length * 2} screenshots in ${path.relative(ROOT, out) || out}`);
  console.log(errors.length ? 'errors:\n  ' + errors.join('\n  ') : 'no console errors');
  process.exit(errors.length ? 1 : 0);
});
