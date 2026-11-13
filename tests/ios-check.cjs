/* ios-check (Node): the iOS app's hole data and golden putts (ios/PuttXCore) are exactly what
   scripts/export-ios.cjs makes from the sim and courses/, so the Swift sim is always tested against
   today's holes and today's physics. Run `node scripts/export-ios.cjs` to fix a FAIL. */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const { check, done } = require('./lib.cjs');

const r = spawnSync(process.execPath, [path.join(__dirname, '../scripts/export-ios.cjs'), '--check'], { encoding: 'utf8' });
check('ios holes.json and golden.json are up to date (node scripts/export-ios.cjs)', r.status === 0, (r.stderr || '').trim());
done();
