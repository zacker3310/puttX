#!/usr/bin/env node
/* build: assembles the single shipped index.html from its sources.
     src/shell.html        CSS and scene markup, with @@THREE@@ and @@GAME@@ placeholders
     node_modules/three    three.js r170, inlined as window.THREE inside an IIFE
     src/game.js           the game script, with anchors:
                             @@COURSES_SIM@@   <- every courses/cNN.sim.js  (inside the sim region)
                             @@COURSES_LOOK@@  <- every courses/cNN.look.js (render section)
                             @@SHOP@@          <- src/shop.js (the pro shop, before boot)
   Usage: node scripts/build.cjs [--out path] [--only 3,7]
   --only keeps just those course numbers (preview builds while other courses are mid-edit).
   The library half (gameSource, simSource) is shared with tests/sim.cjs and tests/lint.cjs. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COURSES = path.join(ROOT, 'courses');

function courseFiles(kind, only) {
  if (!fs.existsSync(COURSES)) return [];
  return fs.readdirSync(COURSES).filter(f => new RegExp(`^c\\d\\d\\.${kind}\\.js$`).test(f)).sort()
    .filter(f => !only || only.includes(Number(f.slice(1, 3))))
    .map(f => ({ f, src: fs.readFileSync(path.join(COURSES, f), 'utf8') }));
}
const join = list => list.map(({ f, src }) => `/* ---- courses/${f} ---- */\n${src.trim()}\n`).join('') + '/* ---- end of courses ---- */';
/* only: array of course numbers, or null for all. Env PUTTX_ONLY=3,7 does the same for tests. */
function parseOnly(s) { return s ? String(s).split(',').map(Number).filter(Boolean) : null; }
function gameSource(only = parseOnly(process.env.PUTTX_ONLY)) {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'game.js'), 'utf8');
  if (!g.includes('/* @@COURSES_SIM@@ */') || !g.includes('/* @@COURSES_LOOK@@ */')) throw new Error('build: course anchors missing from src/game.js');
  const shop = fs.readFileSync(path.join(ROOT, 'src', 'shop.js'), 'utf8').trim();
  return g.replace('/* @@COURSES_SIM@@ */', () => join(courseFiles('sim', only))).replace('/* @@COURSES_LOOK@@ */', () => join(courseFiles('look', only)))
    .replace('/* @@SHOP@@ */', () => '/* ---- src/shop.js ---- */\n' + shop + '\n/* ---- end of src/shop.js ---- */');
}
function simSource(only) {
  const g = gameSource(only), a = g.indexOf('// #region sim'), b = g.indexOf('// #endregion sim');
  if (a < 0 || b < a) throw new Error('sim region markers missing from src/game.js');
  return g.slice(a, b);
}
function threeSource() {
  /* three's package `exports` hides build/, so read the file by path */
  const src = fs.readFileSync(path.join(ROOT, 'node_modules', 'three', 'build', 'three.module.min.js'), 'utf8').trim();
  const rev = (src.match(/const \w+="(\d+)"/) || [])[1];
  const m = src.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
  if (!m || !rev) throw new Error('build: unexpected three.module.min.js shape');
  const pairs = m[1].split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const [local, , exported] = s.split(/\s+/);
    return `${exported || local}:${local}`;
  });
  const body = src.slice(0, m.index) + `window.THREE=Object.freeze({${pairs.join(',')}});`;
  if (/\bexport\s*\{/.test(body) || /<\/script/i.test(body)) throw new Error('build: three body still has an export or a closing script tag');
  return `/* three.js r${rev}, MIT, Copyright 2010-2024 Three.js Authors */\n(function(){${body}})();`;
}
function build(only) {
  const shell = fs.readFileSync(path.join(ROOT, 'src', 'shell.html'), 'utf8'), game = gameSource(only);
  if (/<\/script/i.test(game)) throw new Error('build: the game source contains a closing script tag');
  return shell.replace('/* @@THREE@@ */', () => threeSource()).replace('/* @@GAME@@ */', () => game.trim());
}
module.exports = { gameSource, simSource, build, parseOnly, ROOT };

if (require.main === module) {
  const args = process.argv.slice(2), val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const out = path.resolve(ROOT, val('--out') || 'index.html'), only = parseOnly(val('--only'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const html = build(only);
  fs.writeFileSync(out, html);
  console.log(`build: ${path.relative(ROOT, out)} (${(html.length / 1024).toFixed(0)} KB${only ? ', courses ' + only.join(',') : ''})`);
}
