/* physics-check (Node): the hand-rolled ball physics. Rolling stops, the cup captures slow balls
   and lips out fast ones, walls bank, surfaces change roll-out, slopes break the ball, ramps
   launch it over gaps in low gravity, results are deterministic, and no putt ever escapes a
   walled hole, tunnels, or rolls forever. */
'use strict';
const { check, done } = require('./lib.cjs');
const { loadSim, regionSource } = require('./sim.cjs');
const S = loadSim();

const straight = S.makeHole({ par: 2, tee: [0, 0.5], cup: [0, 3.5], shape: S.rect(-0.6, 0, 0.6, 4) });

/* 1. a soft putt stops on the felt where friction says it should */
const soft = S.simulatePutt(straight, [0, 0.5], 0, 0);
check('soft putt stops on the felt', soft.end === 'stop' && soft.z > 0.55 && soft.z < 0.8 && Math.abs(soft.x) < 1e-9, JSON.stringify(soft));

/* 2. a slow ball over the cup drops in; a fast one lips out */
check('slow ball into the cup is sunk', S.simulatePutt(straight, [0, 3.2], 0, 0).end === 'sunk');
const fast = S.simulatePutt(straight, [0, 3.0], 0, 1);
check('full-power ball over the cup lips out', fast.hits.some(h => h[0] === 'lip'), JSON.stringify(fast.hits.slice(0, 4)));

/* 3. some straight power from the tee sinks it */
let sinks = 0;
for (let p = 0; p <= 1.0001; p += 0.05) if (S.simulatePutt(straight, [0, 0.5], 0, p).end === 'sunk') sinks++;
check('a straight putt from the tee can sink', sinks > 0, 'sinking powers: ' + sinks);

/* 4. walls bank: the ball reflects and stays inside the wall's thickness */
{
  const b = S.launch(S.newBall(straight, 0, 0.5), 45, 0.6);
  let t = 0, hit = false;
  for (let i = 0; i < 2000 && !hit; i++) { S.stepBall(straight, b, t); t += S.SIM_DT; hit = b.hits.some(h => h[0] === 'wall'); }
  check('wall hit reflects the ball back across the lane', hit && b.vx < 0 && b.x <= 0.6 - S.BALL_R - S.WALL_HALF + 1e-9, JSON.stringify({ x: b.x, vx: b.vx }));
}

/* 5. surfaces: ice rolls farther than felt, sand shorter */
const lane = (surf) => S.makeHole({ tee: [0, 0.5], cup: [0, 39.5], shape: S.rect(-0.6, 0, 0.6, 40), zones: surf ? [{ surf, poly: S.rect(-0.6, 0, 0.6, 40) }] : [] });
const zFelt = S.simulatePutt(lane(null), [0, 0.5], 0, 0.3).z, zIce = S.simulatePutt(lane('ice'), [0, 0.5], 0, 0.3).z, zSand = S.simulatePutt(lane('sand'), [0, 0.5], 0, 0.3).z;
check('ice > felt > sand roll-out', zIce > zFelt && zFelt > zSand, JSON.stringify({ zIce, zFelt, zSand }));

/* 6. a hill to the right breaks the ball left */
const hill = S.makeHole({ tee: [0, 0.5], cup: [0, 5.5], shape: S.rect(-1, 0, 1, 6), bumps: [{ x: 0.3, z: 2.5, r: 0.6, h: 0.12 }] });
const brk = S.simulatePutt(hill, [0, 0.5], 0, 0.4);
check('slope breaks the ball away from the hill', brk.x < -0.05, JSON.stringify(brk));
check('groundH matches the bump peak', Math.abs(S.groundH(hill, 0.3, 2.5) - 0.12) < 1e-9);

/* 7. determinism */
check('same putt, same result', JSON.stringify(S.simulatePutt(hill, [0.1, 0.7], 13, 0.77)) === JSON.stringify(S.simulatePutt(hill, [0.1, 0.7], 13, 0.77)));

/* 8. low-gravity ramp over a gap: some powers clear it, some fall in */
const gap = S.makeHole({ tee: [0, 0.5], cup: [0, 6.2], g: 0.427, feltMu: 0.19,
  floors: [S.rect(-0.6, 0, 0.6, 3), S.rect(-0.6, 3.8, 0.6, 7)],
  walls: [[[-0.6, 3], [-0.6, 2.2], [-0.6, 0], [0.6, 0], [0.6, 2.2], [0.6, 3]], [[-0.6, 3.8], [-0.6, 7], [0.6, 7], [0.6, 3.8]]],
  ramps: [{ x0: -0.6, z0: 2.2, x1: 0.6, z1: 3, axis: 'z', h: 0.2 }] });
let cleared = 0, fell = 0, stuck = [];
for (let p = 0; p <= 1.0001; p += 0.01) { const r = S.simulatePutt(gap, [0, 0.5], 0, p); if (r.end === 'oob') fell++; else if (r.z > 3.8) cleared++; if (r.end === 'timeout') stuck.push(+p.toFixed(2)); }
check('ramp jump: some powers clear the gap, some fall in', cleared > 0 && fell > 0, JSON.stringify({ cleared, fell }));
check('a ball that friction holds on a ramp stops instead of timing out', stuck.length === 0, 'timeouts at ' + stuck.join());
check('makeHole marks floors-based holes open', gap.open === true && straight.open === false);

/* 9. fuzz: max power into corners, wall ends and slopes never escapes, tunnels, NaNs or runs forever */
const ell = S.makeHole({ tee: [0, 0.5], cup: [2.2, 3], shape: [[-0.6, 0], [0.6, 0], [0.6, 2.4], [2.8, 2.4], [2.8, 3.6], [-0.6, 3.6]],
  inner: [[[-0.6, 1.4], [0.2, 1.4]]], bumps: [{ x: 1.5, z: 3, r: 0.4, h: 0.08 }] });
let bad = [];
for (const from of [[0, 0.5], [0.4, 3.2], [2.5, 2.7]]) for (let a = 0; a < 360; a += 3) for (const p of [0.35, 1]) {
  const r = S.simulatePutt(ell, from, a, p);
  if (!Number.isFinite(r.x) || !Number.isFinite(r.z) || r.end === 'timeout' || r.end === 'oob' || (r.end !== 'sunk' && !S.onFloor(ell, r.x, r.z))) bad.push([from, a, p, r.end]);
}
check('fuzz: 720 putts stay on the floor and terminate', bad.length === 0, JSON.stringify(bad.slice(0, 3)));

/* 10. the sim region never reads clocks or randomness */
const src = regionSource();
check('sim region is deterministic and DOM-free', !/Math\.random|Date\b|performance|document|window|THREE/.test(src));

done();
