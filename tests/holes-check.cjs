/* holes-check (Node): every registered hole is well formed (tee and cup on the floor and clear of
   walls, par 2..4, tee outside every mover's sweep), its stored bot solution still sinks within
   par, and 360 full-power putts plus 200 random ones never escape, NaN or run forever. */
'use strict';
const { check, done } = require('./lib.cjs');
const S = require('./sim.cjs').loadSim();
const R = S.BALL_R + S.WALL_HALF;
const STRICT = process.env.PUTTX_ALL_WORLDS === '1';

let seed = 12345;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const clearOfWalls = (h, [x, z]) => h.segs.every(s => { const p = S.closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - p[0], z - p[1]) >= R; });
const clearOfMovers = (h, [x, z]) => h.movers.every(m => m.kind === 'spin'
  ? Math.hypot(x - m.x, z - m.z) > m.len + R
  : (() => { const p = S.closestOnSeg(m.ax, m.az, m.bx, m.bz, x, z); return Math.hypot(x - p[0], z - p[1]) > m.r + S.BALL_R; })());

const ptSeg = (x, z, sg) => { const p = S.closestOnSeg(sg[0], sg[1], sg[2], sg[3], x, z); return Math.hypot(x - p[0], z - p[1]); };
const cross = (ax, az, bx, bz, cx, cz) => (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
const segSeg = (a, b) => {
  const d1 = cross(...a, b[0], b[1]), d2 = cross(...a, b[2], b[3]), d3 = cross(...b, a[0], a[1]), d4 = cross(...b, a[2], a[3]);
  if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
  return Math.min(ptSeg(a[0], a[1], b), ptSeg(a[2], a[3], b), ptSeg(b[0], b[1], a), ptSeg(b[2], b[3], a));
};
const worlds = S.WORLD_ORDER.filter(w => S.WORLDS[w]);
if (STRICT) check('all three worlds are registered', worlds.length === 3, worlds.join());
for (const w of worlds) {
  const holes = S.WORLDS[w].holes;
  check(`world ${w}: 9 holes`, holes.length === 9);
  for (const h of holes) {
    /* a mover must never pinch a resting ball against a wall: its sweep keeps a whole ball (plus
       the wall's collision margin) clear of every wall line, or it shoves the ball through */
    const pinch = [];
    for (const m of h.movers) for (const sg of h.segs) {
      const room = m.kind === 'spin' ? ptSeg(m.x, m.z, sg) - m.len - 2 * R : segSeg([m.ax, m.az, m.bx, m.bz], sg) - m.r - S.BALL_R - R;
      if (room < -1e-9) pinch.push(m.kind + '@' + sg.map(v => +v.toFixed(2)).join(',') + ' short by ' + (-room).toFixed(3));
    }
    check(`${h.key}: movers never pinch a ball against a wall`, pinch.length === 0, pinch.slice(0, 2).join(' | '));
    const okShape = h.par >= 2 && h.par <= 4 && S.onFloor(h, ...h.tee) && S.onFloor(h, ...h.cup) && clearOfWalls(h, h.tee) && clearOfWalls(h, h.cup) && clearOfMovers(h, h.tee);
    check(`${h.key}: well formed`, okShape, JSON.stringify({ par: h.par, tee: h.tee, cup: h.cup }));

    let at = h.tee, last = null;
    for (const [a, p, t0] of h.sol || []) { last = S.simulatePutt(h, at, a, p, t0); if (last.end !== 'stop') break; at = [last.x, last.z]; }
    check(`${h.key}: bot solution sinks within par ${h.par}`, !!h.sol && h.sol.length <= h.par && last && last.end === 'sunk', JSON.stringify(h.sol));

    const bad = [];
    for (let a = 0; a < 360; a++) {
      const r = S.simulatePutt(h, h.tee, a, 1, (a % 10) * 0.3);
      if (!Number.isFinite(r.x) || r.end === 'timeout' || (!h.open && (r.end === 'oob' || (r.end !== 'sunk' && !S.onFloor(h, r.x, r.z))))) bad.push(a);
    }
    for (let i = 0; i < 200; i++) {
      const r = S.simulatePutt(h, h.tee, rnd() * 360, rnd(), rnd() * 5);
      if (!Number.isFinite(r.x) || r.end === 'timeout' || (!h.open && r.end === 'oob')) bad.push('r' + i);
    }
    check(`${h.key}: 560 fuzz putts stay in and terminate`, bad.length === 0, bad.slice(0, 5).join());
  }
}
check('at least one world registered', worlds.length > 0);
done();
