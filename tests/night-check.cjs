/* night-check (Node): every course has a night remix, mirrored left to right, and every night
   hole's mirrored proof still sinks within par (the physics is symmetric under the mirror). */
'use strict';
const { check, done } = require('./lib.cjs');
const S = require('./sim.cjs').loadSim();
const days = S.allCourses(), bad = [];
check('every course has a night remix with the same number of holes', days.every(w => S.WORLDS[S.NIGHT + w] && S.WORLDS[S.NIGHT + w].holes.length === S.WORLDS[w].holes.length));
for (const w of days) for (const h of S.WORLDS[S.NIGHT + w].holes) {
  let at = h.tee, r = null;
  for (const [a, p, t0] of h.sol || []) { r = S.simulatePutt(h, at, a, p, t0); if (r.end === 'sunk') break; if (r.end === 'stop') at = [r.x, r.z]; }
  if (!(r && r.end === 'sunk' && h.sol.length <= h.par)) bad.push(h.key);
}
check('every night hole sinks its mirrored proof within par', bad.length === 0, bad.join(' '));
const d = S.holeAt('1-1'), n = S.holeAt((S.NIGHT + 1) + '-1');
check('night 1-1 is day 1-1 mirrored', n.tee[0] === -d.tee[0] && n.cup[0] === -d.cup[0] && n.par === d.par);
done();
