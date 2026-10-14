/* physics-check (Node): the hand-rolled ball physics. Rolling stops and skids first, the cup
   captures by speed and line (dead centre beats the edge; too hot hops or lips out), walls bank,
   surfaces change roll-out, slopes break the ball with the exact incline force, crests launch it,
   landings bounce, cliffs stop it, tiers and ramps carry it up, tubes move it, water and the void
   cost a stroke, conveyors push, movers (arms, windmills, gates, discs) hit it, results are
   deterministic, and no putt ever escapes a walled hole, tunnels, or rolls forever. */
'use strict';
const { check, done } = require('./lib.cjs');
const { loadSim, regionSource } = require('./sim.cjs');
const S = loadSim();
const R = S.BALL_R + S.WALL_HALF;

check('ball is half the v2 ball (0.051)', Math.abs(S.BALL_R - 0.0255) < 1e-9, String(S.BALL_R));
const straight = S.makeHole({ par: 2, tee: [0, 0.5], cup: [0, 3.5], shape: S.rect(-0.6, 0, 0.6, 4) });

/* 1. a soft putt stops on the felt; a struck ball skids before it rolls */
const soft = S.simulatePutt(straight, [0, 0.5], 0, 0);
check('soft putt stops on the felt', soft.end === 'stop' && soft.z > 0.55 && soft.z < 0.8 && Math.abs(soft.x) < 1e-9, JSON.stringify(soft));
{
  const b = S.launch(S.newBall(straight, 0, 0.5), 0, 0.5), v0 = Math.hypot(b.vx, b.vz);
  let t = 0, n = 0; while (b.skid > 0 && n < 2000) { S.stepBall(straight, b, t); t += S.SIM_DT; n++; }
  check('the struck ball skids, then rolls once it has shed ~8%', n > 5 && n < 200 && Math.abs(Math.hypot(b.vx, b.vz) / v0 - S.SKID_END) < 0.02, JSON.stringify({ n, ratio: Math.hypot(b.vx, b.vz) / v0 }));
}

/* 2. the cup: slow drops, centre catches faster balls than the edge, hot balls hop or lip out */
const longCup = S.makeHole({ tee: [0, 0.5], cup: [0, 3.5], shape: S.rect(-0.6, 0, 0.6, 12) });
const over = (x, v) => { const b = S.newBall(longCup, x, 3.5 - S.CUP_R - 0.01); b.vz = v; let t = 0, end = null; for (let i = 0; i < 400 && !end; i++) { end = S.stepBall(longCup, b, t); t += S.SIM_DT; } return { end, hits: b.hits.map(h => h[0]) }; };
check('a slow ball over the cup is sunk', over(0, 0.5).end === 'sunk');
check('dead centre at 1.9 m/s drops, but 1.9 m/s along the edge lips out', over(0, 1.9).end === 'sunk' && over(0.085, 1.9).hits.includes('lip'), JSON.stringify([over(0, 1.9), over(0.085, 1.9)]));
check('dead centre at 2.2 m/s hops the cup', over(0, 2.2).hits.includes('lip') && over(0, 2.2).end !== 'sunk');
check('a crawling ball at the very edge still drops', over(0.1, 0.15).end === 'sunk');

/* 3. some straight power from the tee sinks it */
let sinks = 0;
for (let p = 0; p <= 1.0001; p += 0.02) if (S.simulatePutt(straight, [0, 0.5], 0, p).end === 'sunk') sinks++;
check('a straight putt from the tee can sink', sinks > 0, 'sinking powers: ' + sinks);

/* 4. walls bank: the ball reflects and stays inside the wall's thickness */
{
  const b = S.launch(S.newBall(straight, 0, 0.5), 45, 0.6);
  let t = 0, hit = false;
  for (let i = 0; i < 2000 && !hit; i++) { S.stepBall(straight, b, t); t += S.SIM_DT; hit = b.hits.some(h => h[0] === 'wall'); }
  check('wall hit reflects the ball back across the lane', hit && b.vx < 0 && b.x <= 0.6 - R + 1e-9, JSON.stringify({ x: b.x, vx: b.vx }));
}

/* 5. surfaces: ice > fast > felt > sand > mud roll-out; full power rolls about 17 m */
const lane = (surf, len = 40) => S.makeHole({ tee: [0, 0.5], cup: [0, len - 0.5], shape: S.rect(-0.6, 0, 0.6, len), zones: surf ? [{ surf, poly: S.rect(-0.6, 0, 0.6, len) }] : [] });
const roll = s => S.simulatePutt(lane(s), [0, 0.5], 0, 0.3).z;
const zs = ['ice', 'fast', null, 'sand', 'mud'].map(roll);
check('ice > fast > felt > sand > mud roll-out', zs.every((z, i) => i === 0 || z < zs[i - 1]), JSON.stringify(zs));
const full = S.simulatePutt(lane(null), [0, 0.5], 0, 1).z - 0.5;
check('full power rolls 15.5-19 m on felt, for long lag putts', full > 15.5 && full < 19, full.toFixed(2));

/* 6. a hill to the right breaks the ball left; slope force follows the exact incline */
const hill = S.makeHole({ tee: [0, 0.5], cup: [0, 5.5], shape: S.rect(-1, 0, 1, 6), bumps: [{ x: 0.3, z: 2.5, r: 0.6, h: 0.12 }] });
const brk = S.simulatePutt(hill, [0, 0.5], 0, 0.3);
check('slope breaks the ball away from the hill', brk.x < -0.05, JSON.stringify(brk));
check('groundH matches the bump peak', Math.abs(S.groundH(hill, 0.3, 2.5) - 0.12) < 1e-9);
{
  /* a ball rolling down a 1:2 tilted tier accelerates at 5/7 g sin(theta) cos(theta) horizontally, less rolling resistance */
  const tilt = S.makeHole({ tee: [0, 2], cup: [0, 9], shape: S.rect(-1, 0, 1, 10), tiers: [{ poly: S.rect(-1, 0, 1, 10), h: 5, sz: -0.5 }] });
  const b = S.newBall(tilt, 0, 2); b.skid = 0;
  for (let i = 0; i < 24; i++) S.stepBall(tilt, b, i * S.SIM_DT);
  const a = b.vz / (24 * S.SIM_DT), want = S.G * 5 / 7 * 0.5 / 1.25 - S.SURF.felt.mu * S.G / Math.sqrt(1.25);   /* minus rolling resistance */
  check('incline force is 5/7 g sin(theta), projected', Math.abs(a - want) / want < 0.08, JSON.stringify({ a, want }));
}

/* 7. crests: a fast ball leaves the ground over a sharp hilltop and bounces on landing */
const crest = S.makeHole({ tee: [0, 0.5], cup: [0, 9.5], shape: S.rect(-1, 0, 1, 10), bumps: [{ x: 0, z: 3, r: 0.5, h: 0.3 }] });
const jump = S.simulatePutt(crest, [0, 0.5], 0, 0.95);
check('a fast ball takes off over a crest and lands', jump.hits.some(h => h[0] === 'land'), JSON.stringify(jump.hits.slice(0, 4)));
check('a slow ball rolls over the same crest without leaving it', !S.simulatePutt(crest, [0, 0.5], 0, 0.42).hits.some(h => h[0] === 'land'));

/* 8. tiers and ramps: up the ramp onto the deck; straight at the deck's face bounces off the cliff */
const deck = S.makeHole({ tee: [0, 0.5], cup: [0, 6], shape: S.rect(-1, 0, 1, 7), tiers: [{ poly: S.rect(-1, 3, 1, 7), h: 0.3 }], ramps: [{ x0: -0.3, z0: 2, x1: 0.3, z1: 3, axis: 'z', h0: 0, h1: 0.3 }] });
const up = S.simulatePutt(deck, [0, 0.5], 0, 0.7), face = S.simulatePutt(deck, [0.7, 0.5], 0, 0.7);
check('a ramp carries the ball up onto a tier', up.z > 3.1 && Math.abs(S.groundH(deck, up.x, up.z) - 0.3) < 1e-9, JSON.stringify(up));
check('a tier face is a cliff: the ball bounces back off it', face.z < 3 && face.hits.some(h => h[0] === 'wall'), JSON.stringify(face));
const drop = S.simulatePutt(deck, [0.7, 6.5], 180, 0.5);
check('rolling off a tier edge falls, lands and carries on', drop.z < 2.6 && drop.hits.some(h => h[0] === 'land'), JSON.stringify(drop));

/* 9. tubes */
const tube = S.makeHole({ tee: [0, 0.5], cup: [1.5, 5], shape: S.rect(-0.6, 0, 2.2, 6), inner: [[[0.8, 0], [0.8, 4]]], tubes: [{ a: [0, 3], b: [1.5, 3], dir: 0 }] });
const tb = S.simulatePutt(tube, [0, 0.5], 0, 0.45);
check('a tube swallows the ball and spits it out at its exit, heading dir', tb.hits.some(h => h[0] === 'tubeIn') && tb.hits.some(h => h[0] === 'tubeOut') && tb.x > 0.9, JSON.stringify([tb.end, tb.x, tb.z]));

/* 10. hazards: water and the void cost a stroke (oob); conveyors push */
const pond = S.makeHole({ tee: [0, 0.5], cup: [0, 5.5], shape: S.rect(-0.6, 0, 0.6, 6), zones: [{ surf: 'water', poly: S.rect(-0.6, 2, 0.6, 3) }] });
check('rolling into water ends the putt as oob', S.simulatePutt(pond, [0, 0.5], 0, 0.3).end === 'oob');
const belt = S.makeHole({ tee: [0, 0.5], cup: [0, 9.5], shape: S.rect(-1, 0, 1, 10), zones: [{ push: [1.5, 0], poly: S.rect(-1, 1, 1, 9) }] });
check('a conveyor pushes the ball sideways', S.simulatePutt(belt, [0, 0.5], 0, 0.3).x > 0.2);

/* 11. determinism */
check('same putt, same result', JSON.stringify(S.simulatePutt(hill, [0.1, 0.7], 13, 0.77)) === JSON.stringify(S.simulatePutt(hill, [0.1, 0.7], 13, 0.77)));

/* 12. low-gravity ramp over a gap: some powers clear it, some fall in */
const gap = S.makeHole({ tee: [0, 0.5], cup: [0, 6.2], g: 0.427, feltMu: 0.19,
  floors: [S.rect(-0.6, 0, 0.6, 3), S.rect(-0.6, 3.8, 0.6, 7)],
  walls: [[[-0.6, 3], [-0.6, 2.2], [-0.6, 0], [0.6, 0], [0.6, 2.2], [0.6, 3]], [[-0.6, 3.8], [-0.6, 7], [0.6, 7], [0.6, 3.8]]],
  ramps: [{ x0: -0.6, z0: 2.2, x1: 0.6, z1: 3, axis: 'z', h: 0.2 }] });
let cleared = 0, fell = 0, stuck = [];
for (let p = 0; p <= 1.0001; p += 0.01) { const r = S.simulatePutt(gap, [0, 0.5], 0, p); if (r.end === 'oob') fell++; else if (r.z > 3.8) cleared++; if (r.end === 'timeout') stuck.push(+p.toFixed(2)); }
check('ramp jump: some powers clear the gap, some fall in', cleared > 0 && fell > 0, JSON.stringify({ cleared, fell }));
check('a ball that friction holds on a ramp stops instead of timing out', stuck.length === 0, 'timeouts at ' + stuck.join());
check('makeHole marks floors-based holes open', gap.open === true && straight.open === false);
check('an airborne ball can fly over a low wall; a rolling ball never passes one', (() => {
  const b = S.newBall(gap, 0, 2); b.air = true; b.y = 1; b.vz = 2; b.vy = 0; let t = 0;
  for (let i = 0; i < 30; i++) { S.stepBall(gap, b, t); t += S.SIM_DT; }
  return !b.hits.some(h => h[0] === 'wall');
})());

/* 13. fuzz: max power into corners, wall ends, slopes, tiers and tubes never escapes, tunnels, NaNs or runs forever */
const ell = S.makeHole({ tee: [0, 0.5], cup: [2.2, 3], shape: [[-0.6, 0], [0.6, 0], [0.6, 2.4], [2.8, 2.4], [2.8, 3.6], [-0.6, 3.6]],
  inner: [[[-0.6, 1.4], [0.2, 1.4]]], bumps: [{ x: 1.5, z: 3, r: 0.4, h: 0.2 }], tiers: [{ poly: S.rect(1.8, 2.4, 2.8, 3.6), h: 0.15 }],
  ramps: [{ x0: 1.4, z0: 2.4, x1: 1.8, z1: 3.6, axis: 'x', h0: 0, h1: 0.15 }] });
let bad = [];
for (const hh of [ell, deck, tube]) for (const from of [hh.tee, [hh.cup[0] - 0.3, hh.cup[1] - 0.3]]) for (let a = 0; a < 360; a += 4) for (const p of [0.35, 1]) {
  const r = S.simulatePutt(hh, from, a, p);
  if (!Number.isFinite(r.x) || !Number.isFinite(r.z) || r.end === 'timeout' || r.end === 'oob' || (r.end !== 'sunk' && !S.onFloor(hh, r.x, r.z))) bad.push([from, a, p, r.end]);
}
check('fuzz: 1080 putts stay on the floor and terminate', bad.length === 0, JSON.stringify(bad.slice(0, 3)));

/* 14. the sim region never reads clocks or randomness */
const src = regionSource();
check('sim region is deterministic and DOM-free', !/Math\.random|Date\b|performance|document|window|THREE/.test(src));

/* ---- obstacles ---- */
const posted = S.makeHole({ tee: [0, 0.5], cup: [0, 4.5], shape: S.rect(-0.6, 0, 0.6, 5), posts: [{ x: 0, z: 2, r: 0.15 }] });
const pr = S.simulatePutt(posted, [0, 0.5], 0, 0.3);
check('post blocks and bounces a straight putt', pr.hits.some(h => h[0] === 'post') && pr.z < 2, JSON.stringify(pr));
const bumper = S.makeHole({ tee: [0, 0.5], cup: [0, 4.5], shape: S.rect(-0.6, 0, 0.6, 5), posts: [{ x: 0.05, z: 2, r: 0.15, e: 1.1 }] });
check('bumper logs a bump', S.simulatePutt(bumper, [0, 0.5], 0, 0.6).hits.some(h => h[0] === 'bump'));

const arm = (phase, w, blades) => S.makeHole({ tee: [0.4, 0.5], cup: [0, 4.5], shape: S.rect(-0.9, 0, 0.9, 5), movers: [{ kind: 'spin', x: 0, z: 2.5, len: 0.7, w, phase, blades }] });
check('arm along the lane lets an off-centre ball past', S.simulatePutt(arm(0, 0), [0.4, 0.5], 0, 0.4).z > 2.6);
check('arm across the lane blocks it', S.simulatePutt(arm(Math.PI / 2, 0), [0.4, 0.5], 0, 0.3).z < 2.5);
check('a windmill (blades 2) blocks where a single arm would not', S.simulatePutt(arm(0, 0, 2), [0.4, 0.5], 0, 0.3).z < 2.5);
const st = S.moverState({ kind: 'spin', x: 0, z: 2.5, len: 0.7, w: 0, phase: Math.PI / 2 }, 0);
check('spin state: arm across x at phase pi/2', Math.abs(st.ax + 0.7) < 1e-9 && Math.abs(st.bx - 0.7) < 1e-9 && Math.abs(st.az - 2.5) < 1e-9);
let pass = 0, block = 0;
for (let t0 = 0; t0 < 4.5; t0 += 0.1) { const r = S.simulatePutt(arm(0, 1.4), [0.4, 0.5], 0, 0.55, t0); if (r.z > 2.6) pass++; else block++; }
check('a spinning arm makes timing matter', pass > 0 && block > 0, JSON.stringify({ pass, block }));

const sl = { kind: 'slide', ax: -0.5, az: 2.5, bx: 0.5, bz: 2.5, r: 0.16, period: 2.4, phase: 0 };
const s0 = S.moverState(sl, 0), s1 = S.moverState(sl, 1.2);
check('slider starts at A and reaches B at half period', Math.abs(s0.x + 0.5) < 1e-9 && Math.abs(s1.x - 0.5) < 1e-9);
const slid = S.makeHole({ tee: [0, 0.5], cup: [0, 4.5], shape: S.rect(-0.6, 0, 0.6, 5), movers: [Object.assign({}, sl, { ax: 0, bx: 0, period: 1000 })] });
check('slider disc bounces the ball', S.simulatePutt(slid, [0, 0.5], 0, 0.5).hits.some(h => h[0] === 'mover'));
check('moverTouch: a ball inside the disc is touched, one far away is not',
  S.moverTouch(slid, S.newBall(slid, 0, 2.6), 0) && !S.moverTouch(slid, S.newBall(slid, 0, 0.5), 0));
const gate = S.makeHole({ tee: [0, 0.5], cup: [0, 4.5], shape: S.rect(-0.9, 0, 0.9, 5), movers: [{ kind: 'gate', ax: 0, az: 2.5, bx: 1.6, bz: 2.5, len: 0.8, ang: 90, period: 1000 }] });
check('a closed gate blocks the lane', S.simulatePutt(gate, [0, 0.5], 0, 0.3).z < 2.5);

let overCap = 0;
for (let a = 0; a < 360; a += 5) { const b = S.launch(S.newBall(bumper, 0, 1.6), a, 1); let t = 0; for (let i = 0; i < 1200; i++) { if (S.stepBall(bumper, b, t)) break; t += S.SIM_DT; if (Math.hypot(b.vx, b.vz) > S.V_CAP + 1e-9) overCap++; } }
check('bumpers never push the ball past V_CAP', overCap === 0, 'over-cap steps: ' + overCap);

/* a ball the slope presses into a wall, or the cup's lip pull holds on a mound, still settles */
const pinned = S.makeHole({ tee: [0, 0.5], cup: [0, 4], shape: S.rect(-0.8, 0, 0.8, 4.5), bumps: [{ x: 0.25, z: 2.2, r: 0.6, h: 0.12 }] });
const mound = S.makeHole({ par: 3, tee: [0, 0.5], cup: [0, 3.2], shape: S.rect(-1, 0, 1, 4.5), bumps: [{ x: 0, z: 3.2, r: 0.6, h: 0.14 }] });
const pin = S.simulatePutt(pinned, [0, 0.5], 4, 1, 1.2), lip = S.simulatePutt(mound, [0, 0.5], 2, 1, 0.6);
check('a ball pinned against a wall by a slope settles', pin.end !== 'timeout', JSON.stringify([pin.end, pin.x, pin.z]));
check('a ball held at the lip of a mound cup settles', lip.end !== 'timeout', JSON.stringify([lip.end, lip.x, lip.z]));

/* drains: a coin funnel round the cup. Flat where the cup sits, steeper toward the middle, and a ball
   fed in fast and sideways spirals down and drops */
{
  const dh = S.makeHole({ tee: [-1.6, 0.4], cup: [0, 2.5], shape: S.rect(-2, 0, 2, 4.5), drains: [{ x: 0, z: 2.5, r: 1.3, depth: 0.32 }] });
  const flat = [0, 1, 2, 3].every(k => Math.abs(S.groundH(dh, k * 0.03, 2.5) + 0.32) < 1e-9);
  const steeper = S.groundH(dh, 0.6, 2.5) - S.groundH(dh, 0.4, 2.5) > S.groundH(dh, 1.2, 2.5) - S.groundH(dh, 1.0, 2.5);
  let laps = 0, best = null;
  for (let p = 0.3; p <= 0.9 && !best; p += 0.02) {
    const b = S.launch(S.newBall(dh, -1.2, 2.5), 0, p);
    let th0 = Math.atan2(b.z - 2.5, b.x), turn = 0, t = 0, end = null;
    for (let i = 0; i < 240 * 25 && !end; i++) { end = S.stepBall(dh, b, t); t += S.SIM_DT; const th = Math.atan2(b.z - 2.5, b.x); let d = th - th0; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; turn += d; th0 = th; }
    if (end === 'sunk' && Math.abs(turn) / (2 * Math.PI) >= 1) { best = p; laps = Math.abs(turn) / (2 * Math.PI); }
  }
  check('a drain is flat under the cup and steepens toward it', flat && steeper);
  check('a ball fed sideways into a drain spirals at least a lap and drops', !!best && laps >= 1, JSON.stringify({ best, laps: +laps.toFixed(2) }));
  const m = S.mirrorDef({ tee: [0.5, 0.4], cup: [1, 2], shape: S.rect(-2, 0, 2, 4), drains: [{ x: 1, z: 2, r: 1, depth: 0.2 }] });
  check('night remixes mirror drains', m.drains[0].x === -1);
}

done();
