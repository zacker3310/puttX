#!/usr/bin/env node
/* pack-scene: rewrites every mesh in ios/PuttX/Scene/geo as PXG2 (scripts/scene-format.cjs), renamed to
   its new content hash, and points the hole files at the new names. For scenery exported before
   export-scene wrote PXG2 itself; a no-op on a scene that is already packed. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { encode, decode } = require('./scene-format.cjs');

const DIR = path.resolve(process.argv[2] || path.join(__dirname, '../ios/PuttX/Scene'));
const hash = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 20);
const rename = {};
let before = 0, after = 0;
for (const f of fs.readdirSync(path.join(DIR, 'geo'))) {
  const p = path.join(DIR, 'geo', f), raw = fs.readFileSync(p);
  before += raw.length;
  if (raw.toString('ascii', 0, 4) === 'PXG2') { after += raw.length; continue; }
  const b = encode(decode(raw)), h = hash(b);
  fs.writeFileSync(path.join(DIR, 'geo', h + '.bin'), b);
  if (h + '.bin' !== f) fs.rmSync(p);
  rename[f.slice(0, -4)] = h; after += b.length;
}
let holes = 0;
for (const f of fs.readdirSync(path.join(DIR, 'holes'))) {
  const p = path.join(DIR, 'holes', f), hole = JSON.parse(fs.readFileSync(p, 'utf8'));
  const fix = n => { if (rename[n.g]) n.g = rename[n.g]; };
  hole.static.forEach(fix); hole.movers.forEach(m => m.forEach(fix));
  fs.writeFileSync(p, JSON.stringify(hole) + '\n'); holes++;
}
/* sweep: meshes and textures no hole uses any more (left behind by a re-export) */
const usedGeo = new Set(), usedTex = new Set();
for (const f of fs.readdirSync(path.join(DIR, 'holes'))) {
  const hole = JSON.parse(fs.readFileSync(path.join(DIR, 'holes', f), 'utf8'));
  for (const n of hole.static.concat(...hole.movers)) usedGeo.add(n.g);
  for (const m of hole.mats) for (const v of Object.values(m)) if (v && typeof v === 'object' && 't' in v) usedTex.add(v.t);
}
let swept = 0;
for (const [dir, used, ext] of [['geo', usedGeo, '.bin'], ['tex', usedTex, '.png']]) {
  for (const f of fs.readdirSync(path.join(DIR, dir))) if (!used.has(f.slice(0, -ext.length))) { fs.rmSync(path.join(DIR, dir, f)); swept++; }
}
console.log(`${swept} unused files swept`);
console.log(`${Object.keys(rename).length} meshes packed, ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB, ${holes} holes updated`);
