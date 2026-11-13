#!/usr/bin/env node
/* export-ui: the title scene's illustration for the iOS app, straight from the web's own (src/shell.html
   #titleArt). Each animated part (sun, clouds, stars, smoke, planet, island, bat, crane hook, palm, flag,
   putter, the ball and its spin and speed lines, each confetti piece, the sign) is drawn alone at 3x,
   cropped to its own box, with everything else hidden; the rest is the background. The app stacks
   them in place and replays the web's CSS keyframes on each (ios/PuttX/Title).
     ios/PuttX/Assets.xcassets/Title/title-<layer>.imageset   the PNGs
     ios/PuttX/Resources/title.json                          where each sits, and how it moves
   The logo's lettering is left out of the sign: the app sets it in SF Rounded, as Safari does.
   Usage: node scripts/export-ui.cjs   (CHROMIUM=/path/to/chrome when needed) */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { build, ROOT } = require('./build.cjs');

const ART = path.join(ROOT, 'ios/PuttX/Assets.xcassets/Title'), JSON_OUT = path.join(ROOT, 'ios/PuttX/Resources/title.json');
const SCALE = 3, PAD = 14;
/* each layer: a selector, and the web's animation (src/shell.html #titleArt rules) */
const LAYERS = [
  { name: 'sun', sel: '.t-sun', anim: 'spin', dur: 30, origin: 'center' },
  { name: 'stars', sel: '.t-stars', anim: 'twinkle', dur: 2.4 },
  { name: 'cloud1', sel: '.t-cloud.c1', anim: 'drift', dur: 40 },
  { name: 'cloud2', sel: '.t-cloud.c2', anim: 'drift', dur: 55, delay: -20 },
  { name: 'smoke0', sel: '.t-smoke circle:nth-child(1)', anim: 'smoke', dur: 3, origin: 'center' },
  { name: 'smoke1', sel: '.t-smoke circle:nth-child(2)', anim: 'smoke', dur: 3, delay: -1, origin: 'center' },
  { name: 'smoke2', sel: '.t-smoke circle:nth-child(3)', anim: 'smoke', dur: 3, delay: -2, origin: 'center' },
  { name: 'island', sel: '.t-island', anim: 'float', dur: 5 },
  { name: 'planet', sel: '.t-planet', anim: 'float', dur: 7 },
  { name: 'bat', sel: '.t-bat', anim: 'bat', dur: 3 },
  { name: 'hook', sel: '.t-hook', anim: 'float', dur: 3 },
  { name: 'palm', sel: '.t-palm', anim: 'sway', dur: 3, origin: [0.5, 0.7] },
  { name: 'flag', sel: '.t-flag', anim: 'wave', dur: 1.1, origin: [0, 0.5] },
  { name: 'putter', sel: '.t-putter', anim: 'swing', dur: 6, originView: [250, 330] },
  { name: 'ballLines', sel: '.t-lines', anim: 'lines', dur: 6 },
  { name: 'ballSpin', sel: '.t-spin', anim: 'rollspin', dur: 6, originView: [370, 586] },
  { name: 'ball', sel: '.t-ball', anim: 'putt', dur: 6, without: ['.t-lines', '.t-spin'] },
  ...[[-80, -140], [60, -170], [-30, -200], [110, -110], [-120, -90], [20, -150]].map(([dx, dy], i) =>
    ({ name: 'confetti' + i, sel: `.t-confetti rect:nth-child(${i + 1})`, anim: 'pop', dur: 6, origin: 'center', dx, dy })),
  { name: 'sign', sel: '.t-sign', anim: 'sign', dur: 4, originView: [600, 0], without: ['text'] },
];

fs.mkdirSync(path.join(ROOT, 'preview'), { recursive: true });
const page = `preview/ui-${process.pid}.html`;
fs.writeFileSync(path.join(ROOT, page), build([1]));
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(p).pipe(res);
});
srv.listen(0, '127.0.0.1', async () => {
  const pw = require('playwright-core');
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || pw.chromium.executablePath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const tab = await browser.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: SCALE });
  tab.setDefaultTimeout(600000);
  await tab.goto(`http://127.0.0.1:${srv.address().port}/${page}`);
  await tab.waitForFunction(() => window.booted === true);
  /* the title, still (no animation), nothing over it, on a transparent page */
  await tab.evaluate(() => {
    showTitle();
    const st = document.createElement('style');
    st.textContent = `#titleArt, #titleArt * { animation: none !important; transition: none !important; }
      #titleArt .t-confetti rect { opacity: 1 !important; }
      html, body, #stage, #title { background: transparent !important; }
      #view, #title > :not(#titleArt), body > :not(#stage), #stage > :not(#title) { display: none !important; }
      #stage { transform: none !important; left: 0 !important; top: 0 !important; width: 1200px !important; height: 700px !important; }`;
    document.head.append(st);
  });
  await tab.waitForTimeout(500);
  fs.rmSync(ART, { recursive: true, force: true });
  fs.mkdirSync(ART, { recursive: true });
  fs.writeFileSync(path.join(ART, 'Contents.json'), JSON.stringify({ info: { author: 'export-ui', version: 1 }, properties: { 'provides-namespace': false } }, null, 2) + '\n');
  const out = [];
  const shoot = async (name, show, hideInside, box) => {
    await tab.evaluate(({ LAYERS, show, hideInside }) => {
      const art = document.getElementById('titleArt');
      for (const el of art.querySelectorAll('*')) el.style.removeProperty('display');
      /* hide every layer except the one asked for (nothing shown: the background) */
      for (const l of LAYERS) for (const el of art.querySelectorAll(l.sel)) if (l.sel !== show) el.style.setProperty('display', 'none', 'important');
      if (show) {
        const keep = art.querySelector(show);
        /* a layer inside another hidden one: show the chain down to it, hide its siblings */
        for (let a = keep; a && a !== art; a = a.parentElement) {
          a.style.removeProperty('display');
          for (const sib of a.parentElement.children) if (sib !== a && sib.tagName !== 'defs') sib.style.setProperty('display', 'none', 'important');
        }
        for (const s of hideInside || []) for (const el of keep.querySelectorAll(s)) el.style.setProperty('display', 'none', 'important');
        for (const el of keep.querySelectorAll('*')) if (!(hideInside || []).some(s => el.matches(s) || el.closest(s))) el.style.removeProperty('display');
      }
    }, { LAYERS, show, hideInside });
    const file = `title-${name}`;
    const png = await tab.screenshot({ clip: box, omitBackground: true });
    const dir = path.join(ART, file + '.imageset');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, file + '.png'), png);
    fs.writeFileSync(path.join(dir, 'Contents.json'), JSON.stringify({ images: [{ filename: file + '.png', idiom: 'universal', scale: '3x' }], info: { author: 'export-ui', version: 1 } }, null, 2) + '\n');
    return png.length;
  };
  let bytes = await shoot('bg', null, null, { x: 0, y: 0, width: 1200, height: 700 });
  out.push({ name: 'bg', rect: [0, 0, 1200, 700] });
  for (const l of LAYERS) {
    /* measured with nothing hidden: a hidden element has no box */
    const bb = await tab.evaluate(sel => {
      for (const el of document.querySelectorAll('#titleArt *')) el.style.removeProperty('display');
      const el = document.querySelector('#titleArt ' + sel); if (!el) return null; const b = el.getBBox(); return [b.x, b.y, b.width, b.height];
    }, l.sel);
    if (!bb) { console.warn('no element for ' + l.sel); continue; }
    const x = Math.max(0, Math.floor(bb[0] - PAD)), y = Math.max(0, Math.floor(bb[1] - PAD)), w = Math.min(1200 - x, Math.ceil(bb[2] + 2 * PAD)), h = Math.min(700 - y, Math.ceil(bb[3] + 2 * PAD));
    bytes += await shoot(l.name, l.sel, l.without, { x, y, width: w, height: h });
    /* the pivot, in the art's own units: the element's box (fill-box) or a point of the view (view-box) */
    const origin = l.originView || (l.origin === 'center' ? [bb[0] + bb[2] / 2, bb[1] + bb[3] / 2] : l.origin ? [bb[0] + bb[2] * l.origin[0], bb[1] + bb[3] * l.origin[1]] : [x + w / 2, y + h / 2]);
    out.push({ name: l.name, rect: [x, y, w, h], anim: l.anim, dur: l.dur, delay: l.delay || 0, origin, dx: l.dx || 0, dy: l.dy || 0 });
  }
  fs.writeFileSync(JSON_OUT, JSON.stringify({ v: 1, layers: out }, null, 1) + '\n');
  console.log(`${out.length} title layers, ${(bytes / 1024) | 0} KB`);
  await browser.close(); srv.close(); fs.rmSync(path.join(ROOT, page), { force: true });
});
