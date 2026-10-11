#!/usr/bin/env node
/* solve: proves each hole's par by search and prints a `sol` to paste into the hole.
   Beam search: from each start try 180 angles x 25 powers (x 5 start times when the hole has
   movers). A sinking putt ends the search; the rest are ranked by walking distance to the cup
   (a grid flood fill around walls) and the best BEAM distinct spots seed the next putt.
   Usage: node scripts/solve.cjs [--world 1] [--hole 1-3]     exit 1 when a hole misses par */
'use strict';
const S = require('../tests/sim.cjs').loadSim();
const args = process.argv.slice(2), val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const BEAM = 6, ANGLES = 180, POWERS = 25, T0S = [0, 0.5, 1, 1.5, 2];

function walkField(h) {
  const C = 0.05, pts = h.floors.flat(), xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const x0 = Math.min(...xs), z0 = Math.min(...zs);
  const nx = Math.ceil((Math.max(...xs) - x0) / C) + 1, nz = Math.ceil((Math.max(...zs) - z0) / C) + 1;
  const R = S.BALL_R + S.WALL_HALF;
  const free = (x, z) => S.onFloor(h, x, z) && h.segs.every(s => { const p = S.closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - p[0], z - p[1]) >= R; });
  const dist = new Float64Array(nx * nz).fill(Infinity);
  const start = Math.round((h.cup[1] - z0) / C) * nx + Math.round((h.cup[0] - x0) / C), q = [start];
  dist[start] = 0;
  for (let k = 0; k < q.length; k++) {
    const id = q[k], i = id % nx, j = (id - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const n = b * nx + a;
      if (dist[n] !== Infinity || !free(x0 + a * C, z0 + b * C)) continue;
      dist[n] = dist[id] + C; q.push(n);
    }
  }
  return (x, z) => {
    const i = Math.round((x - x0) / C), j = Math.round((z - z0) / C);
    const d = i >= 0 && j >= 0 && i < nx && j < nz ? dist[j * nx + i] : Infinity;
    return d === Infinity ? 100 + Math.hypot(x - h.cup[0], z - h.cup[1]) : d;
  };
}
function solve(h) {
  const far = walkField(h), t0s = h.movers.length ? T0S : [0];
  let layer = [{ at: h.tee, sol: [] }];
  for (let depth = 1; depth <= h.par + 1 && layer.length; depth++) {
    const next = [];
    for (const node of layer) for (const t0 of t0s) for (let a = 0; a < ANGLES; a++) for (let p = 1; p <= POWERS; p++) {
      const ang = a * 360 / ANGLES, pw = p / POWERS, r = S.simulatePutt(h, node.at, ang, pw, t0);
      const sol = node.sol.concat([[ang, pw, t0]]);
      if (r.end === 'sunk') return sol;
      if (r.end === 'stop') next.push({ at: [r.x, r.z], sol, d: far(r.x, r.z) });
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

const onlyHole = val('--hole'), onlyWorld = val('--world') && Number(val('--world'));
let missed = 0;
for (const w of S.WORLD_ORDER) {
  if (!S.WORLDS[w] || (onlyWorld && w !== onlyWorld)) continue;
  for (const h of S.WORLDS[w].holes) {
    if (onlyHole && h.key !== onlyHole) continue;
    const t = Date.now(), sol = solve(h), ok = sol && sol.length <= h.par;
    if (!ok) missed++;
    console.log(`${h.key}  par ${h.par}  ${sol ? sol.length + ' putt(s)' : 'no solution'}  ${ok ? 'ok' : 'MISSES PAR'}  ${((Date.now() - t) / 1000).toFixed(1)}s`);
    if (sol) console.log(`    sol: ${JSON.stringify(sol.map(([a, p, t0]) => [a, +p.toFixed(2), t0]))},`);
  }
}
process.exit(missed ? 1 : 0);
