#!/usr/bin/env node
/* solve: proves each hole's par by search, prints a `sol` to paste into the hole, and (with
   --bot) measures how hard the hole really is.
   Search: beam search from the tee. Each putt tries ANGLES x POWERS (x 5 start times when the hole
   has movers); a sinking putt ends the search. If none sinks, the putts that stopped nearest the
   cup are refined on a fine grid (0.25 deg x 0.01 power) so narrow lines are found too. The rest
   are ranked by walking distance to the cup (a grid flood fill that respects walls, water, cliff
   faces and tubes) and the best BEAM distinct spots seed the next putt.
   Bot (--bot): a player with human error (aim sigma 1.2 deg, pace sigma 4%) plays the hole
   BOT_RUNS times, choosing each putt by the same search and then mis-hitting it with seeded noise.
   Reports the bot's mean strokes and its ace and par rates. Hard-but-fair target for a
   12-year-old: mean between par and par + 1.
   Usage: node scripts/solve.cjs [--course 3] [--hole 3-7] [--bot] [--json]
   PUTTX_ONLY=3 loads only courses/c03.*. Exit 1 when a hole misses par. */
'use strict';
const S = require('../tests/sim.cjs').loadSim();
const args = process.argv.slice(2), val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const BEAM = 7, ANGLES = 180, POWERS = 25, T0S = [0, 0.5, 1, 1.5, 2], BOT_RUNS = 12, AIM_SD = 1.2, PACE_SD = 0.04;

function walkField(h) {
  const C = 0.05, pts = h.floors.flat(), xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const x0 = Math.min(...xs), z0 = Math.min(...zs);
  const nx = Math.ceil((Math.max(...xs) - x0) / C) + 1, nz = Math.ceil((Math.max(...zs) - z0) / C) + 1;
  const R = S.BALL_R + S.WALL_HALF;
  const free = new Uint8Array(nx * nz), H = new Float64Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * C, z = z0 + j * C, zn = S.zoneAt(h, x, z);
    H[j * nx + i] = S.groundH(h, x, z);
    free[j * nx + i] = S.onFloor(h, x, z) && !(zn && zn.surf === 'water') &&
      h.segs.every(s => { const p = S.closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - p[0], z - p[1]) >= R; }) ? 1 : 0;
  }
  const id = (x, z) => { const i = Math.round((x - x0) / C), j = Math.round((z - z0) / C); return i >= 0 && j >= 0 && i < nx && j < nz ? j * nx + i : -1; };
  const dist = new Float64Array(nx * nz).fill(Infinity);
  const flood = seeds => {
    const q = seeds.slice();
    for (let k = 0; k < q.length; k++) {
      const c = q[k], i = c % nx, j = (c - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        const n = b * nx + a;
        /* the ball travels n -> c: it may drop any distance but cannot climb a cliff */
        if (!free[n] || H[c] - H[n] > S.STEP_MAX || dist[n] <= dist[c] + C) continue;
        dist[n] = dist[c] + C; q.push(n);
      }
    }
  };
  const cup = id(h.cup[0], h.cup[1]);
  dist[cup] = 0; flood([cup]);
  /* tubes: a mouth is as close as its exit (plus a little), repeated until nothing improves */
  for (let pass = 0; pass < 4; pass++) {
    const seeds = [];
    for (const tb of h.tubes) {
      const a = id(tb.a[0], tb.a[1]), b = id(tb.b[0], tb.b[1]);
      if (a >= 0 && b >= 0 && dist[b] + 0.3 < dist[a]) { dist[a] = dist[b] + 0.3; seeds.push(a); }
    }
    if (!seeds.length) break;
    flood(seeds);
  }
  return (x, z) => {
    const c = id(x, z), d = c >= 0 ? dist[c] : Infinity;
    return d === Infinity ? 100 + Math.hypot(x - h.cup[0], z - h.cup[1]) : d;
  };
}

/* every putt from one spot: returns a sinking putt, or the outcomes ranked by distance */
function sweep(h, at, far, fine, angles = ANGLES, powers = POWERS) {
  const t0s = h.movers.length ? T0S : [0], out = [];
  for (const t0 of t0s) for (let a = 0; a < angles; a++) for (let p = 1; p <= powers; p++) {
    const ang = a * 360 / angles, pw = p / powers, r = S.simulatePutt(h, at, ang, pw, t0);
    if (r.end === 'sunk') return { sink: [ang, pw, t0] };
    if (r.end === 'stop') out.push({ putt: [ang, pw, t0], at: [r.x, r.z], d: far(r.x, r.z), e: Math.hypot(r.x - h.cup[0], r.z - h.cup[1]) });
  }
  if (fine) {
    /* refine around the putts that stopped closest to the cup */
    const near = out.slice().sort((u, v) => u.e - v.e).slice(0, 10);
    for (const n of near) for (let da = -1; da <= 1.0001; da += 0.25) for (let dp = -0.03; dp <= 0.0301; dp += 0.01) {
      const ang = n.putt[0] + da, pw = Math.min(1, Math.max(0, n.putt[1] + dp)), r = S.simulatePutt(h, at, ang, pw, n.putt[2]);
      if (r.end === 'sunk') return { sink: [+ang.toFixed(2), +pw.toFixed(2), n.putt[2]] };
    }
  }
  out.sort((u, v) => u.d - v.d);
  return { out };
}
function solve(h, maxDepth = h.par + 1) {
  const far = walkField(h);
  let layer = [{ at: h.tee, sol: [] }];
  for (let depth = 1; depth <= maxDepth && layer.length; depth++) {
    const next = [];
    for (const node of layer) {
      const r = sweep(h, node.at, far, true);
      if (r.sink) return node.sol.concat([r.sink]);
      for (const o of r.out) next.push({ at: o.at, sol: node.sol.concat([o.putt]), d: o.d });
    }
    next.sort((u, v) => u.d - v.d);
    layer = [];
    for (const n of next) {
      if (layer.length === BEAM) break;
      if (layer.every(m => Math.hypot(m.at[0] - n.at[0], m.at[1] - n.at[1]) > 0.3)) layer.push(n);
    }
  }
  return null;
}

/* the noisy bot: seeded gaussian error on every putt it plans */
function bot(h) {
  const far = walkField(h);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const plans = new Map(), scores = [];
  /* its plan from a spot: a sinking putt if there is one, else the putt that ends nearest by walking distance */
  const plan = at => {
    const k = at.map(v => v.toFixed(2)).join();
    /* the bot plans on a coarser grid than the par proof: it needs a human plan, not the optimum, and it is 2x faster */
    if (!plans.has(k)) { const r = sweep(h, at, far, true, 120, 20); plans.set(k, r.sink || (r.out[0] && r.out[0].putt) || [0, 0.5, 0]); }
    return plans.get(k);
  };
  for (let run = 0; run < BOT_RUNS; run++) {
    let at = h.tee.slice(), strokes = 0, t = 0;
    for (;;) {
      const [a, p] = plan(at), r = S.simulatePutt(h, at, a + gauss() * AIM_SD, Math.min(1, Math.max(0, p * (1 + gauss() * PACE_SD))), t);
      strokes++; t = (t + 2.3) % 5;
      if (r.end === 'sunk') break;
      if (r.end === 'oob') strokes++; else at = [r.x, r.z];
      if (strokes >= S.capOf(h)) { strokes = S.capOf(h); break; }
    }
    scores.push(strokes);
  }
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { mean: +mean.toFixed(2), ace: scores.filter(s => s === 1).length / scores.length, par: scores.filter(s => s <= h.par).length / scores.length, scores };
}
module.exports = { solve, bot, walkField };

if (require.main === module) {
  const onlyHole = val('--hole'), onlyWorld = Number(val('--course') || val('--world')) || null, doBot = args.includes('--bot'), asJson = args.includes('--json');
  let missed = 0;
  const rows = [];
  for (const w of S.allCourses()) {
    if (!S.WORLDS[w] || (onlyWorld && w !== onlyWorld)) continue;
    for (const h of S.WORLDS[w].holes) {
      if (onlyHole && h.key !== onlyHole) continue;
      const t = Date.now(), sol = solve(h), ok = sol && sol.length <= h.par;
      if (!ok) missed++;
      const b = doBot && ok ? bot(h) : null;
      rows.push({ key: h.key, par: h.par, putts: sol ? sol.length : null, ok: !!ok, sol, bot: b });
      if (!asJson) {
        console.log(`${h.key}  par ${h.par}  ${sol ? sol.length + ' putt(s)' : 'no solution'}  ${ok ? 'ok' : 'MISSES PAR'}` +
          (b ? `  bot mean ${b.mean} (par+${(b.mean - h.par).toFixed(2)}) ace ${(b.ace * 100).toFixed(0)}% par-or-better ${(b.par * 100).toFixed(0)}%` : '') + `  ${((Date.now() - t) / 1000).toFixed(1)}s`);
        if (sol) console.log(`    sol: ${JSON.stringify(sol.map(([a, p, t0]) => [+a.toFixed(2), +p.toFixed(2), t0]))},`);
      }
    }
  }
  if (asJson) console.log(JSON.stringify(rows));
  process.exit(missed ? 1 : 0);
}
