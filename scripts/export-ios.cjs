/* export-ios: the iOS app's sim data, straight from the same sim the web game and the solver run.
   Holes stay authored in courses/cNN.sim.js and proven in JS; this writes them, resolved, to
   ios/PuttXCore/Sources/PuttXCore/Resources/holes.json, and writes golden putts (every hole's `sol`
   replay plus a fixed fan of extra shots, with every contact) to
   ios/PuttXCore/Tests/PuttXCoreTests/Resources/golden.json. The Swift sim must match them to the bit.

   node scripts/export-ios.cjs          write both
   node scripts/export-ios.cjs --check  fail if either file is stale (CI) */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadSim } = require('../tests/sim.cjs');

const ROOT = path.join(__dirname, '..');
const HOLES_OUT = path.join(ROOT, 'ios/PuttXCore/Sources/PuttXCore/Resources/holes.json');
const GOLDEN_OUT = path.join(ROOT, 'ios/PuttXCore/Tests/PuttXCoreTests/Resources/golden.json');
const S = loadSim();

/* defaults are resolved here, with the sim's own `||` and `!== undefined` rules, so Swift never
   has to know them; render-only keys (look, color) ride along */
const num = (v, d) => (v !== undefined ? v : d);
function hole(h) {
  return {
    key: h.key, par: h.par, g: h.g, feltMu: h.feltMu, open: h.open,
    tee: h.tee, cup: h.cup, aim0: num(h.aim0, null), crazy: !!h.crazy, auto: !!h.auto, sol: h.sol || [],
    floors: h.floors, walls: h.walls, segTop: h.segTop,
    bumps: h.bumps.map(b => ({ x: b.x, z: b.z, r: b.r, h: b.h })),
    drains: h.drains.map(d => ({ x: d.x, z: d.z, r: d.r, depth: d.depth, flat: d.flat || 0 })),
    ramps: h.ramps.map(r => ({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, axis: r.axis === 'x' ? 'x' : 'z', h0: r.h0 || 0, h1: r.h1 !== undefined ? r.h1 : r.h })),
    tiers: h.tiers.map(t => ({ poly: t.poly, h: t.h, sx: t.sx || 0, sz: t.sz || 0 })),
    zones: h.zones.map(z => ({ poly: z.poly, surf: z.surf || null, push: z.push || null })),
    posts: h.posts.map(p => ({ x: p.x, z: p.z, r: p.r, top: p.top || 0.22, e: p.e || 0, look: p.look || null })),
    movers: h.movers.map(m => m.kind === 'spin'
      ? { kind: 'spin', x: m.x, z: m.z, len: m.len, w: m.w, phase: m.phase, blades: m.blades || 1, look: m.look || null }
      : { kind: m.kind, ax: m.ax, az: m.az, bx: m.bx, bz: m.bz, period: m.period, phase: m.phase || 0, r: num(m.r, 0), len: num(m.len, 0), ang: m.ang || 0, look: m.look || null }),
    tubes: h.tubes.map(t => ({ a: t.a, b: t.b, dir: t.dir, keep: num(t.keep, 0.7), add: t.add || 0.3, color: t.color || null })),
  };
}

/* a putt, recorded to the bit: JSON numbers from V8 round-trip exactly */
const rec = r => ({ end: r.end, x: r.x, z: r.z, t: r.t, steps: r.steps, hits: r.hits.map(([k, v]) => [k, v]) });
function golden(h) {
  const out = { key: h.key, sol: [], fan: [] };
  let at = h.tee.slice();
  for (const [a, p, t0] of h.sol || []) {
    const r = S.simulatePutt(h, at, a, p, t0 || 0);
    out.sol.push({ from: at, a, p, t0: t0 || 0, ...rec(r) });
    if (r.end === 'stop') at = [r.x, r.z]; else if (r.end !== 'oob') break;
  }
  /* the fan: toward the cup and either side of it, soft to firm, at two mover phases */
  const toCup = Math.atan2(h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]) * 180 / Math.PI;
  const base = Math.round((h.aim0 !== undefined ? h.aim0 : toCup) * 4) / 4;
  for (const da of [-17, 0, 23]) for (const p of [0.35, 0.8]) for (const t0 of [0, 1.375]) {
    const r = S.simulatePutt(h, h.tee, base + da, p, t0);
    out.fan.push({ a: base + da, p, t0, ...rec(r) });
  }
  return out;
}

const holes = [], gold = [];
for (const c of S.allCourses()) for (const h of S.WORLDS[c].holes) { holes.push(hole(h)); gold.push(golden(h)); }
const courses = S.allCourses().map(c => ({ id: c, world: S.worldOf(c), g: S.WORLDS[c].g, holes: S.WORLDS[c].holes.length }));
const holesJson = JSON.stringify({ v: 1, worldOrder: S.WORLD_ORDER, courseStep: S.COURSE_STEP, extras: S.EXTRAS, courses, holes }) + '\n';
const goldenJson = JSON.stringify({ v: 1, putts: gold }) + '\n';

if (process.argv.includes('--check')) {
  const stale = [[HOLES_OUT, holesJson], [GOLDEN_OUT, goldenJson]].filter(([f, s]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== s);
  for (const [f] of stale) console.error('stale: ' + path.relative(ROOT, f) + ' (run node scripts/export-ios.cjs)');
  process.exit(stale.length ? 1 : 0);
}
for (const [f, s] of [[HOLES_OUT, holesJson], [GOLDEN_OUT, goldenJson]]) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); }
const n = gold.reduce((s, g) => s + g.sol.length + g.fan.length, 0);
console.log(`${holes.length} holes, ${n} golden putts (${(holesJson.length / 1024) | 0} KB + ${(goldenJson.length / 1024) | 0} KB)`);
