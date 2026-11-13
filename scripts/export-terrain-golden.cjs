#!/usr/bin/env node
/* export-terrain-golden: the web's own course surfaces for a handful of holes that between them have
   every kind of ground (tiers, ramps, bumps, bowls, drains, zones, tubes, split floors), written to
   ios/PuttXCore/Tests/PuttXCoreTests/Resources/terrain.json for the Swift Terrain to be held to:
   each mesh's counts, sums and a spread of sampled vertices.
   Usage: node scripts/export-terrain-golden.cjs   (CHROMIUM=/path/to/chrome if needed) */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { build, ROOT } = require('./build.cjs');

const HOLES = ['1-1', '1-17', '10-18', '19-9', '29-8', '99-6', '99-7'];
const OUT = path.join(ROOT, 'ios/PuttXCore/Tests/PuttXCoreTests/Resources/terrain.json');
const courses = [...new Set(HOLES.map(k => Number(k.split('-')[0])))];
fs.mkdirSync(path.join(ROOT, 'preview'), { recursive: true });
const page = `preview/terrain-${process.pid}.html`;
fs.writeFileSync(path.join(ROOT, page), build([...new Set(courses.flatMap(c => [((c - 1) % 10) + 1, c]))]));
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(p).pipe(res);
});
srv.listen(0, '127.0.0.1', async () => {
  const pw = require('playwright-core');
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || pw.chromium.executablePath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const tab = await browser.newPage();
  tab.on('pageerror', e => console.error('page: ' + e));
  tab.setDefaultTimeout(600000);
  await tab.goto(`http://127.0.0.1:${srv.address().port}/${page}?hole=${HOLES[0]}`);
  await tab.waitForFunction(() => window.booted === true);
  const out = await tab.evaluate(keys => {
    const sum = g => {
      const P = g.attributes.position, C = g.attributes.color, U = g.attributes.uv, N = g.attributes.normal, I = g.index;
      const v = P.count, pick = [0, 1, 2, 7, Math.floor(v / 3), Math.floor(v / 2), v - 2, v - 1].filter(i => i >= 0 && i < v);
      let sp = 0, sy = 0, sc = 0, si = 0;
      for (let i = 0; i < v; i++) { sp += P.getX(i) + P.getZ(i); sy += P.getY(i); if (C) sc += C.getX(i); }
      if (I) for (let i = 0; i < I.count; i++) si += I.getX(i);
      return { v, i: I ? I.count : 0, sumXZ: sp, sumY: sy, sumShade: C ? sc : null, sumIdx: si,
        samples: pick.map(i => ({ k: i, p: [P.getX(i), P.getY(i), P.getZ(i)], n: N ? [N.getX(i), N.getY(i), N.getZ(i)] : null, uv: U ? [U.getX(i), U.getY(i)] : null, shade: C ? C.getX(i) : null })) };
    };
    const res = {};
    for (const key of keys) {
      startHole(key);
      const h = play.hole, byName = n => holeGroup.children.find(c => c.name === n);
      res[key] = { floor: sum(byName('floor').geometry), collar: sum(byName('collar').geometry), skirt: sum(byName('skirt').geometry),
        zones: holeGroup.children.filter(c => c.isMesh && 'zoneColor' in c.userData).map(c => sum(c.geometry)) };
      const ground = holeGroup.children.find(c => c.isMesh && c.renderOrder === -1 && c.geometry.type === 'PlaneGeometry');
      if (ground) {
        /* the plane's own frame: laid flat at -3 cm, as the app builds it */
        ground.updateMatrix(); const g = ground.geometry.clone(); g.applyMatrix4(ground.matrix); res[key].ground = sum(g);
      }
    }
    return res;
  }, HOLES);
  fs.writeFileSync(OUT, JSON.stringify({ v: 1, holes: out }) + '\n');
  console.log(`${Object.keys(out).length} holes -> ${path.relative(ROOT, OUT)}`);
  await browser.close(); srv.close(); fs.rmSync(path.join(ROOT, page), { force: true });
});
