#!/usr/bin/env node
/* vendor-three: inlines node_modules/three/build/three.module.min.js into index.html between
   the three:begin and three:end markers. The module's trailing `export{a as B,...}` becomes
   `window.THREE=Object.freeze({B:a,...})`, and the whole thing is wrapped in an IIFE so its
   minified top-level names never reach the game script's global scope. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
/* three's package `exports` hides build/, so read the file by path */
const src = fs.readFileSync(path.join(ROOT, 'node_modules', 'three', 'build', 'three.module.min.js'), 'utf8').trim();
const rev = (src.match(/const \w+="(\d+)"/) || [])[1];
const m = src.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
if (!m || !rev) { console.error('vendor-three: unexpected three.module.min.js shape'); process.exit(1); }
const pairs = m[1].split(',').map(s => s.trim()).filter(Boolean).map(s => {
  const [local, , exported] = s.split(/\s+/);
  return `${exported || local}:${local}`;
});
const body = src.slice(0, m.index) + `window.THREE=Object.freeze({${pairs.join(',')}});`;
if (/\bexport\s*\{/.test(body) || /<\/script/i.test(body)) { console.error('vendor-three: body still has an export or a closing script tag'); process.exit(1); }

const file = path.join(ROOT, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const B = '/* three:begin */', E = '/* three:end */';
const i = html.indexOf(B), j = html.indexOf(E);
if (i < 0 || j < i) { console.error('vendor-three: markers missing from index.html'); process.exit(1); }
fs.writeFileSync(file, html.slice(0, i + B.length) + `\n/* three.js r${rev}, MIT, Copyright 2010-2024 Three.js Authors */\n(function(){${body}})();\n` + html.slice(j));
console.log(`vendor-three: inlined three.js r${rev} (${(body.length / 1024).toFixed(0)} KB)`);
