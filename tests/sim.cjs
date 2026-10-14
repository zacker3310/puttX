/* sim: loads the DOM-free sim region (between `// #region sim` and `// #endregion sim`) of the
   game source, with the course packs inlined exactly as scripts/build.cjs inlines them, into a
   Node vm context. Physics, round and hole suites and the solver run against exactly the code
   the page runs, straight from src/ and courses/ (no build needed). PUTTX_ONLY=3,7 loads just
   those courses. Names not defined yet come back undefined. */
'use strict';
const vm = require('vm');
const { simSource, parseOnly } = require('../scripts/build.cjs');

const NAMES = ['SIM_DT', 'BALL_R', 'CUP_R', 'CAP_V0', 'MIN_V', 'MAX_V', 'V_CAP', 'WALL_HALF', 'WALL_TOP', 'G', 'SURF', 'TUBE_R',
  'STEP_MAX', 'rect', 'ring', 'makeHole', 'inPoly', 'onFloor', 'zoneAt', 'baseAt', 'groundH', 'groundGrad', 'closestOnSeg', 'moverState',
  'moverTouch', 'newBall', 'launch', 'stepBall', 'simulatePutt', 'newRound', 'capOf', 'starsFor', 'resolvePutt',
  'resolveDrift', 'WORLD_ORDER', 'HOLES_PER', 'WORLDS', 'registerWorld', 'holeAt', 'nextKey', 'playable', 'allCourses', 'coursesOf', 'worldOf', 'COURSE_STEP', 'GLIDE', 'SKID_END', 'DRAIN_FLAT', 'drainY', 'FELT_MU', 'freshProgress', 'recordHole',
  'holeUnlocked', 'NIGHT', 'mirrorDef', 'isNight'];

function regionSource(only = parseOnly(process.env.PUTTX_ONLY)) { return simSource(only); }
function loadSim(only) {
  const ctx = vm.createContext({});
  const exp = NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(',');
  vm.runInContext(regionSource(only) + `\n;globalThis.__sim = { ${exp} };`, ctx);
  return ctx.__sim;
}
module.exports = { loadSim, regionSource };
