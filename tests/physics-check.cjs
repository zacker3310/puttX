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


/* ---- obstacles (T1.3) ---- */
const posted = S.makeHole({ tee: [0, 0.5], cup: [0, 4.5], shape: S.rect(-0.6, 0, 0.6, 5), posts: [{ x: 0, z: 2, r: 0.15 }] });
const pr = S.simulatePutt(posted, [0, 0.5], 0, 0.5);
check('post blocks and bounces a straight putt', pr.hits.some(h => h[0] === 'post') && pr.z < 2, JSON.stringify(pr));

const bumper = S.makeHole({ tee: [0, 0.5], cup: [0, 4.5], shape: S.rect(-0.6, 0, 0.6, 5), posts: [{ x: 0.05, z: 2, r: 0.15, e: 1.1 }] });
check('bumper logs a bump', S.simulatePutt(bumper, [0, 0.5], 0, 0.6).hits.some(h => h[0] === 'bump'));

const arm = (phase, w) => S.makeHole({ tee: [0.4, 0.5], cup: [0, 4.5], shape: S.rect(-0.9, 0, 0.9, 5), movers: [{ kind: 'spin', x: 0, z: 2.5, len: 0.7, w, phase }] });
check('arm along the lane lets an off-centre ball past', S.simulatePutt(arm(0, 0), [0.4, 0.5], 0, 0.6).z > 2.6);
check('arm across the lane blocks it', S.simulatePutt(arm(Math.PI / 2, 0), [0.4, 0.5], 0, 0.6).z < 2.5);
const st = S.moverState({ kind: 'spin', x: 0, z: 2.5, len: 0.7, w: 0, phase: Math.PI / 2 }, 0);
check('spin state: arm across x at phase pi/2', Math.abs(st.ax + 0.7) < 1e-9 && Math.abs(st.bx - 0.7) < 1e-9 && Math.abs(st.az - 2.5) < 1e-9);
let pass = 0, block = 0;
for (let t0 = 0; t0 < 4.5; t0 += 0.1) { const r = S.simulatePutt(arm(0, 1.4), [0.4, 0.5], 0, 0.6, t0); if (r.z > 2.6) pass++; else block++; }
check('a spinning arm makes timing matter', pass > 0 && block > 0, JSON.stringify({ pass, block }));

const sl = { kind: 'slide', ax: -0.5, az: 2.5, bx: 0.5, bz: 2.5, r: 0.16, period: 2.4, phase: 0 };
const s0 = S.moverState(sl, 0), s1 = S.moverState(sl, 1.2);
check('slider starts at A and reaches B at half period', Math.abs(s0.x + 0.5) < 1e-9 && Math.abs(s1.x - 0.5) < 1e-9);
const slid = S.makeHole({ tee: [0, 0.5], cup: [0, 4.5], shape: S.rect(-0.6, 0, 0.6, 5), movers: [Object.assign({}, sl, { ax: 0, bx: 0, period: 1000 })] });
check('slider disc bounces the ball', S.simulatePutt(slid, [0, 0.5], 0, 0.5).hits.some(h => h[0] === 'mover'));
check('moverTouch: a ball inside the disc is touched, one far away is not',
  S.moverTouch(slid, S.newBall(slid, 0, 2.6), 0) && !S.moverTouch(slid, S.newBall(slid, 0, 0.5), 0));

let overCap = 0;
for (let a = 0; a < 360; a += 5) { const b = S.launch(S.newBall(bumper, 0, 1.6), a, 1); let t = 0; for (let i = 0; i < 1200; i++) { if (S.stepBall(bumper, b, t)) break; t += S.SIM_DT; if (Math.hypot(b.vx, b.vz) > S.V_CAP + 1e-9) overCap++; } }
check('bumpers never push the ball past V_CAP', overCap === 0, 'over-cap steps: ' + overCap);

/* a ball the slope presses into a wall, or the cup's lip pull holds on a mound, still settles */
const pinned = S.makeHole({ tee: [0, 0.5], cup: [0, 4], shape: S.rect(-0.8, 0, 0.8, 4.5), bumps: [{ x: 0.25, z: 2.2, r: 0.6, h: 0.12 }] });
const mound = S.makeHole({ par: 3, tee: [0, 0.5], cup: [0, 3.2], shape: S.rect(-1, 0, 1, 4.5), bumps: [{ x: 0, z: 3.2, r: 0.6, h: 0.14 }] });
const pin = S.simulatePutt(pinned, [0, 0.5], 4, 1, 1.2), lip = S.simulatePutt(mound, [0, 0.5], 2, 1, 0.6);
check('a ball pinned against a wall by a slope settles', pin.end === 'stop', JSON.stringify([pin.end, pin.x, pin.z]));
check('a ball held at the lip of a mound cup settles', lip.end !== 'timeout', JSON.stringify([lip.end, lip.x, lip.z]));

done();
