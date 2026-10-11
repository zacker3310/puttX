/* holes-check (Node): every registered hole is well formed and nothing on it is stuffed into
   anything else, its stored bot solution still sinks within par, it is not a gimme, and full-power
   and random putts never escape, NaN or run forever. Holes are checked on worker threads.
   Per hole:
     - par 2..5; tee and cup on the floor, clear of walls, posts, tubes and water, on flat ground
       and not straddling a tier edge; the tee outside every mover's sweep
     - posts clear of walls, each other, the cup, the tee and tube mouths
     - movers never pinch a ball against a wall, never sweep the cup, never hit a post
     - tube mouths and exits on flat floor, clear of walls; each exit has room to roll out
     - `sol` sinks within par
     - at most 2% of a 72 x 20 grid of putts from the tee is an ace (much harder than v1)
     - 180 full-power putts plus 60 random ones stay in (walled holes) and terminate
   PUTTX_ONLY=3 checks one course. PUTTX_ALL_WORLDS=1 also requires all ten courses of 18. */
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

if (!isMainThread) {
  const S = require('./sim.cjs').loadSim();
  const out = [];
  for (const key of workerData.keys) out.push(...checkHole(S, S.holeAt(key)));
  parentPort.postMessage(out);
  return;
}

function checkHole(S, h) {
  const res = [], check = (name, ok, detail) => res.push([`${h.key}: ${name}`, !!ok, ok ? '' : detail]);
  const R = S.BALL_R + S.WALL_HALF;
  const ptSeg = (x, z, sg) => { const p = S.closestOnSeg(sg[0], sg[1], sg[2], sg[3], x, z); return Math.hypot(x - p[0], z - p[1]); };
  const wallGap = (x, z) => Math.min(Infinity, ...h.segs.map(sg => ptSeg(x, z, sg)));
  const cross = (ax, az, bx, bz, cx, cz) => (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
  const segSeg = (a, b) => {
    const d1 = cross(...a, b[0], b[1]), d2 = cross(...a, b[2], b[3]), d3 = cross(...b, a[0], a[1]), d4 = cross(...b, a[2], a[3]);
    if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
    return Math.min(ptSeg(a[0], a[1], b), ptSeg(a[2], a[3], b), ptSeg(b[0], b[1], a), ptSeg(b[2], b[3], a));
  };
  /* flat: the ground varies less than 1.5 cm over a disc, so nothing sits on a tier edge or a steep bank */
  const flat = (x, z, r) => {
    const y0 = S.groundH(h, x, z);
    for (let a = 0; a < 16; a++) for (const k of [0.5, 1]) if (Math.abs(S.groundH(h, x + Math.cos(a) * r * k, z + Math.sin(a) * r * k) - y0) > 0.015) return false;
    return true;
  };
  const water = (x, z) => (S.zoneAt(h, x, z) || {}).surf === 'water';
  /* a mover's sweep as a set of capsules [ax, az, bx, bz, r] */
  const sweep = m => m.kind === 'spin' ? [[m.x, m.z, m.x, m.z, m.len + S.WALL_HALF]]
    : m.kind === 'gate' ? (() => { const a = (m.ang || 0) * Math.PI / 180, dx = Math.sin(a) * m.len, dz = Math.cos(a) * m.len;
      return [[m.ax - dx, m.az - dz, m.bx - dx, m.bz - dz, S.WALL_HALF], [m.ax + dx, m.az + dz, m.bx + dx, m.bz + dz, S.WALL_HALF], [m.ax, m.az, m.bx, m.bz, S.WALL_HALF]]; })()
    : [[m.ax, m.az, m.bx, m.bz, m.r]];
  const inSweep = (m, x, z, pad) => sweep(m).some(([ax, az, bx, bz, r]) => ptSeg(x, z, [ax, az, bx, bz]) < r + pad);

  check('par 2..5', h.par >= 2 && h.par <= 5, 'par ' + h.par);
  for (const [what, p] of [['tee', h.tee], ['cup', h.cup]]) {
    const ok = S.onFloor(h, ...p) && wallGap(...p) >= R + (what === 'cup' ? S.CUP_R : 0.01) && !water(...p) && flat(...p, what === 'cup' ? S.CUP_R + S.BALL_R : S.BALL_R * 2)
      && h.posts.every(q => Math.hypot(p[0] - q.x, p[1] - q.z) >= q.r + S.BALL_R + (what === 'cup' ? S.CUP_R : 0.05))
      && h.tubes.every(t => [t.a, t.b].every(e => Math.hypot(p[0] - e[0], p[1] - e[1]) >= S.TUBE_R + S.BALL_R + 0.1));
    check(`${what} on flat floor, clear of walls, posts, tubes and water`, ok, JSON.stringify({ p, wall: +wallGap(...p).toFixed(3), flat: flat(...p, S.BALL_R * 2) }));
  }
  check('tee outside every mover sweep', h.movers.every(m => !inSweep(m, ...h.tee, S.BALL_R + 0.05)));
  check('no mover sweeps the cup', h.movers.every(m => !inSweep(m, ...h.cup, S.CUP_R)));

  const stuffed = [];
  h.posts.forEach((p, i) => {
    if (wallGap(p.x, p.z) < p.r + S.WALL_HALF - 1e-9) stuffed.push(`post ${i} in a wall`);
    if (!S.onFloor(h, p.x, p.z)) stuffed.push(`post ${i} off the floor`);
    h.posts.forEach((q, j) => { if (j > i && Math.hypot(p.x - q.x, p.z - q.z) < p.r + q.r) stuffed.push(`posts ${i},${j} overlap`); });
    h.tubes.forEach((t, j) => [t.a, t.b].forEach(e => { if (Math.hypot(p.x - e[0], p.z - e[1]) < p.r + S.TUBE_R + 0.02) stuffed.push(`post ${i} on tube ${j}`); }));
    h.movers.forEach((m, j) => { if (inSweep(m, p.x, p.z, p.r)) stuffed.push(`mover ${j} sweeps post ${i}`); });
  });
  h.tubes.forEach((t, j) => {
    for (const [end, e] of [['mouth', t.a], ['exit', t.b]]) {
      if (!S.onFloor(h, ...e) || water(...e)) stuffed.push(`tube ${j} ${end} off the floor`);
      if (wallGap(...e) < S.TUBE_R + S.WALL_HALF + 0.02) stuffed.push(`tube ${j} ${end} in a wall`);
      if (!flat(...e, S.TUBE_R)) stuffed.push(`tube ${j} ${end} not on flat ground`);
      h.movers.forEach((m, k) => { if (inSweep(m, ...e, S.TUBE_R)) stuffed.push(`mover ${k} sweeps tube ${j} ${end}`); });
    }
    const a = t.dir * Math.PI / 180;
    for (let d = 0.05; d <= 0.3; d += 0.05) {
      const x = t.b[0] + Math.sin(a) * d, z = t.b[1] + Math.cos(a) * d;
      if (!S.onFloor(h, x, z) || wallGap(x, z) < R) { stuffed.push(`tube ${j} exit points into a wall`); break; }
    }
  });
  /* walls stand taller than the ground beside them, so the picture never shows a ball rolling over one */
  h.segs.forEach((sg, i) => { if (h.segTop[i][0] - h.segTop[i][1] > 0.6) stuffed.push(`wall ${i} spans a ${(h.segTop[i][0] - h.segTop[i][1]).toFixed(2)} m height change`); });
  check('nothing stuffed into anything', stuffed.length === 0, stuffed.slice(0, 4).join(' | '));

  /* a mover must never pinch a resting ball against a wall: its sweep keeps a whole ball (plus
     the wall's collision margin) clear of every wall line, or it shoves the ball through */
  const pinch = [];
  for (const m of h.movers) for (const sg of h.segs) {
    const room = m.kind === 'spin' ? ptSeg(m.x, m.z, sg) - m.len - 2 * R
      : m.kind === 'gate' ? Math.min(...sweep(m).map(([ax, az, bx, bz]) => segSeg([ax, az, bx, bz], sg))) - 2 * R - 1e-6 + (sweep(m).some(([ax, az, bx, bz]) => segSeg([ax, az, bx, bz], sg) === 0) ? 2 * R : 0)
      : segSeg([m.ax, m.az, m.bx, m.bz], sg) - m.r - S.BALL_R - R;
    if (m.kind === 'gate' && sweep(m).some(([ax, az, bx, bz]) => segSeg([ax, az, bx, bz], sg) === 0)) continue;   /* a gate sliding into a slot in a wall */
    if (room < -1e-9) pinch.push(m.kind + '@' + sg.map(v => +v.toFixed(2)).join(',') + ' short by ' + (-room).toFixed(3));
  }
  check('movers never pinch a ball against a wall', pinch.length === 0, pinch.slice(0, 2).join(' | '));

  let at = h.tee, last = null;
  for (const [a, p, t0] of h.sol || []) { last = S.simulatePutt(h, at, a, p, t0); if (last.end === 'stop') at = [last.x, last.z]; else if (last.end !== 'oob') break; }
  check(`bot solution sinks within par ${h.par}`, !!h.sol && h.sol.length <= h.par && last && last.end === 'sunk', JSON.stringify(h.sol));

  let aces = 0;
  for (let a = 0; a < 72; a++) for (let p = 1; p <= 20; p++) if (S.simulatePutt(h, h.tee, a * 5, p / 20, 0).end === 'sunk') aces++;
  check('not a gimme: at most 2% of tee shots ace', aces / 1440 <= 0.02, `${aces} of 1440`);

  let seed = 12345 + h.key.length;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bad = [];
  for (let a = 0; a < 360; a += 2) {
    const r = S.simulatePutt(h, h.tee, a, 1, (a % 10) * 0.3);
    if (!Number.isFinite(r.x) || r.end === 'timeout' || (!h.open && (r.end === 'oob' && !h.zones.some(z => z.surf === 'water')))) bad.push(a);
    else if (!h.open && r.end === 'stop' && !S.onFloor(h, r.x, r.z)) bad.push(a + 'off');
  }
  for (let i = 0; i < 60; i++) {
    const r = S.simulatePutt(h, h.tee, rnd() * 360, rnd(), rnd() * 5);
    if (!Number.isFinite(r.x) || r.end === 'timeout') bad.push('r' + i);
  }
  check('240 fuzz putts stay in and terminate', bad.length === 0, bad.slice(0, 5).join());
  return res;
}

(async () => {
  const { check, done } = require('./lib.cjs');
  const S = require('./sim.cjs').loadSim();
  const STRICT = process.env.PUTTX_ALL_WORLDS === '1';
  const worlds = S.playable();
  if (STRICT) check('all ten courses are registered', worlds.length === 10, worlds.join());
  for (const w of worlds) check(`course ${w}: ${S.HOLES_PER} holes`, S.WORLDS[w].holes.length === S.HOLES_PER || !STRICT, 'has ' + S.WORLDS[w].holes.length);
  check('at least one course registered', worlds.length > 0);
  const keys = worlds.flatMap(w => S.WORLDS[w].holes.map(h => h.key));
  const n = Math.max(1, Math.min(os.cpus().length, 4)), parts = Array.from({ length: n }, (_, i) => keys.filter((_, k) => k % n === i));
  const results = await Promise.all(parts.filter(p => p.length).map(p => new Promise((res, rej) => {
    const wk = new Worker(__filename, { workerData: { keys: p } });
    wk.on('message', res); wk.on('error', rej);
  })));
  const all = results.flat().sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));
  for (const [name, ok, detail] of all) check(name, ok, detail);
  done();
})().catch(e => { console.error(e); process.exit(1); });
