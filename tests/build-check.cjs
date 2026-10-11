/* build-check (Node): the shipped index.html is exactly what scripts/build.cjs makes from src/,
   courses/ and three.js, so nobody ships a stale page. Run `npm run build` to fix a FAIL. */
'use strict';
const fs = require('fs');
const path = require('path');
const { check, done } = require('./lib.cjs');
const { build, ROOT } = require('../scripts/build.cjs');

const want = build(), have = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
check('index.html is up to date with src/ and courses/ (npm run build)', want === have, `built ${want.length} bytes, index.html ${have.length}`);
check('index.html has one three block and one game script', (have.match(/<script id="three">/g) || []).length === 1 && (have.match(/<script id="game">/g) || []).length === 1);
done();
