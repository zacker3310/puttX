/* sim: loads the DOM-free sim region of index.html (between `// #region sim` and
   `// #endregion sim`) into a Node vm context. Physics, round and hole suites and the solver
   run against exactly the code the page runs. Names not defined yet come back undefined. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NAMES = ['SIM_DT', 'BALL_R', 'CUP_R', 'CAPTURE_V', 'MIN_V', 'MAX_V', 'V_CAP', 'WALL_HALF', 'WALL_TOP', 'G', 'SURF',
  'rect', 'ring', 'makeHole', 'inPoly', 'onFloor', 'surfMu', 'groundH', 'groundGrad', 'closestOnSeg', 'moverState',
  'moverTouch', 'newBall', 'launch', 'stepBall', 'simulatePutt', 'newRound', 'capOf', 'starsFor', 'resolvePutt',
  'resolveDrift', 'WORLD_ORDER', 'WORLDS', 'registerWorld', 'holeAt', 'nextKey', 'freshProgress', 'recordHole',
  'holeUnlocked'];

function regionSource() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const a = html.indexOf('// #region sim'), b = html.indexOf('// #endregion sim');
  if (a < 0 || b < a) throw new Error('sim region markers missing from index.html');
  return html.slice(a, b);
}
function loadSim() {
  const ctx = vm.createContext({});
  const exp = NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(',');
  vm.runInContext(regionSource() + `\n;globalThis.__sim = { ${exp} };`, ctx);
  return ctx.__sim;
}
module.exports = { loadSim, regionSource };
