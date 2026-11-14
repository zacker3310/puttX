#!/usr/bin/env node
/* export-gear: the pro shop's gear for the iOS app, straight out of the web's own builders
   (src/shop.js buildPutter + dressPutter, shopBallTexture, studioShot), so a putter or a ball looks
   the same on both:

     ios/PuttX/Scene/gear/<putter id>.json   its meshes (in the putter's frame) and materials
     ios/PuttX/Scene/gear/<ball id>.json     its skin (a texture) and finish
     ios/PuttX/Scene/geo, tex                the meshes and textures, content-hashed with the scenery's
     ios/PuttX/Assets.xcassets/Shop/         each item's shop card picture, as the web's studio draws it

   Usage: node scripts/export-gear.cjs [--out dir]   (CHROMIUM=/path/to/chrome when needed); then pack-scene. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { build, ROOT } = require('./build.cjs');
const { sceneWriter } = require('./scene-writer.cjs');
const { encode: geoBin } = require('./scene-format.cjs');

const args = process.argv.slice(2), outArg = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : null;
const OUT = outArg || path.join(ROOT, 'ios/PuttX/Scene'), ART = outArg ? path.join(outArg, 'Shop') : path.join(ROOT, 'ios/PuttX/Assets.xcassets/Shop');
for (const d of ['geo', 'tex', 'gear']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
const page = `preview/gear-${process.pid}.html`;
fs.mkdirSync(path.join(ROOT, 'preview'), { recursive: true });
fs.writeFileSync(path.join(ROOT, page), build([1]));
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(p).pipe(res);
});

/* runs in the page: one item's records and its card picture */
function grabItem(id) {
  const warn = [], W = sceneWriter(warn), it = SHOP_ITEMS[id];
  const out = { id, kind: it.kind };
  if (it.kind === 'putter') {
    const g = dressPutter(buildPutter(it.look), it.look); shine(g);
    /* the game keeps its putter hidden until there is a ball to address; this one is for keeps */
    g.visible = true;
    g.updateMatrixWorld(true);
    out.parts = [];
    /* which parts are the head: the room check and the face's aim live there */
    const head = g.getObjectByName('head');
    g.traverseVisible(o => {
      if (!o.isMesh) return;
      let inHead = false; for (let a = o; a; a = a.parent) if (a === head) inHead = true;
      out.parts.push(Object.assign(W.node(o, g), { head: inHead }));
    });
    /* pulsing glow: its materials breathe (pulseGroup) */
    out.pulse = [];
    g.traverse(o => { if (o.isMesh && o.material && o.material.userData && o.material.userData.pulse) out.pulse.push(W.matOf(o.material)); });
  } else {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.32 });
    dressBall(m, it);
    out.mat = W.matOf(m);
    out.pulse = it.pulse ? it.glow || 0 : 0;
  }
  out.mats = W.mats;
  /* the card picture, at the device's 3x */
  const c = document.createElement('canvas');
  studioShot(c, id, THUMB_W[it.kind], THUMB_H, 0, false, '#383d47');
  return { out, geos: Object.fromEntries(W.geos), texs: Object.fromEntries(W.texs), thumb: c.toDataURL('image/png'), warn };
}

const hash = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 20);
srv.listen(0, '127.0.0.1', async () => {
  const pw = require('playwright-core');
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || pw.chromium.executablePath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const tab = await browser.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 3 });
  tab.on('pageerror', e => console.error('page: ' + e));
  tab.setDefaultTimeout(600000);
  await tab.goto(`http://127.0.0.1:${srv.address().port}/${page}`);
  await tab.waitForFunction(() => window.booted === true);
  await tab.addScriptTag({ content: sceneWriter.toString() });
  await tab.evaluate(() => renderer.setPixelRatio(3));
  const ids = await tab.evaluate(() => Object.keys(SHOP_ITEMS));
  fs.rmSync(ART, { recursive: true, force: true });
  fs.mkdirSync(ART, { recursive: true });
  fs.writeFileSync(path.join(ART, 'Contents.json'), JSON.stringify({ info: { author: 'export-gear', version: 1 }, properties: { 'provides-namespace': false } }, null, 2) + '\n');
  let bytes = 0;
  for (const id of ids) {
    const { out, geos, texs, thumb, warn } = await tab.evaluate(grabItem, id);
    for (const w of warn) console.warn(`${id}: ${w}`);
    const gmap = {}, tmap = {};
    for (const [k, g] of Object.entries(geos)) { const b = geoBin(g), h = hash(b), f = path.join(OUT, 'geo', h + '.bin'); if (!fs.existsSync(f)) { fs.writeFileSync(f, b); bytes += b.length; } gmap[k] = h; }
    for (const [k, url] of Object.entries(texs)) { const b = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'), h = hash(b), f = path.join(OUT, 'tex', h + '.png'); if (!fs.existsSync(f)) { fs.writeFileSync(f, b); bytes += b.length; } tmap[k] = h; }
    for (const p of out.parts || []) p.g = gmap[p.g];
    for (const m of out.mats) for (const k of Object.keys(m)) if (m[k] && typeof m[k] === 'object' && 't' in m[k]) m[k].t = tmap[m[k].t];
    fs.writeFileSync(path.join(OUT, 'gear', id + '.json'), JSON.stringify(out) + '\n');
    const name = 'shop-' + id, dir = path.join(ART, name + '.imageset'), png = Buffer.from(thumb.slice(thumb.indexOf(',') + 1), 'base64');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name + '.png'), png);
    fs.writeFileSync(path.join(dir, 'Contents.json'), JSON.stringify({ images: [{ filename: name + '.png', idiom: 'universal', scale: '3x' }], info: { author: 'export-gear', version: 1 } }, null, 2) + '\n');
    bytes += png.length;
    process.stdout.write(id + ' ');
  }
  console.log(`\n${ids.length} items, ${(bytes / 1024) | 0} KB written`);
  await browser.close(); srv.close(); fs.rmSync(path.join(ROOT, page), { force: true });
});
