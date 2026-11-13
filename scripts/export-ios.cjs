/* export-ios: the iOS app's sim data, straight from the same sim the web game and the solver run.
   Holes stay authored in courses/cNN.sim.js and proven in JS; this writes them, resolved, to
   ios/PuttXCore/Sources/PuttXCore/Resources/holes.json, and writes golden putts (every hole's `sol`
   replay plus a fixed fan of extra shots, with every contact) to
   ios/PuttXCore/Tests/PuttXCoreTests/Resources/golden.json. The Swift sim must match them to the bit.
   It also writes each course's look palette (resolved as lookOf resolves it, by day) to
   ios/PuttX/Resources/looks.json, and the course icons and UI glyphs, as the same SVGs the web draws,
   into ios/PuttX/Assets.xcassets/Art.

   node scripts/export-ios.cjs          write both
   node scripts/export-ios.cjs --check  fail if either file is stale (CI) */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadSim } = require('../tests/sim.cjs');

const ROOT = path.join(__dirname, '..');
const HOLES_OUT = path.join(ROOT, 'ios/PuttXCore/Sources/PuttXCore/Resources/holes.json');
const GOLDEN_OUT = path.join(ROOT, 'ios/PuttXCore/Tests/PuttXCoreTests/Resources/golden.json');
const LOOKS_OUT = path.join(ROOT, 'ios/PuttX/Resources/looks.json');
const PLAY_OUT = path.join(ROOT, 'ios/PuttXCore/Tests/PuttXCoreTests/Resources/play.json');
const ART_DIR = path.join(ROOT, 'ios/PuttX/Assets.xcassets/Art');
const S = loadSim();

/* course looks: run courses/cNN.look.js in a sandbox where THREE and every other name is an inert
   stub, and keep only plain data (colors, the jingle, the icon); the 3D builders are ported by hand */
function readLooks() {
  const vm = require('vm');
  const stub = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : stub), apply: () => stub, construct: () => stub });
  const base = { WORLD_LOOK: {}, Math, Array, Object, String, Number, JSON };
  const ctx = vm.createContext(new Proxy(base, { has: () => true, get: (t, k) => (k in t ? t[k] : k === Symbol.unscopables ? undefined : stub), set: (t, k, v) => ((t[k] = v), true) }));
  const dir = path.join(ROOT, 'courses');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.look.js')).sort()) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  const plain = o => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v) || (Array.isArray(v) && v.every(x => typeof x !== 'object'))));
  const src = fs.readFileSync(path.join(ROOT, 'src/game.js'), 'utf8');
  const DEFAULT = Function('return ' + src.match(/const DEFAULT_LOOK = (\{[\s\S]*?\});/)[1])();
  const L = base.WORLD_LOOK;
  /* lookOf, by day: the classic stands alone; a later course inherits its world's first course */
  return S.allCourses().map(c => {
    const w = S.worldOf(c);
    const look = c === S.CLASSIC ? Object.assign({}, DEFAULT, plain(L[c])) : Object.assign({}, DEFAULT, plain(L[w]), c !== w ? plain(L[c]) : null);
    return { course: c, ...look };
  });
}
/* the play layer's pure pieces, for the Swift stroke and rounding to be held to: computeStroke (a pad
   gesture to a stroke, for two putter feels) over a fixed set of synthetic gestures, and JS toFixed,
   which beginPutt rounds every logged putt with (ties go away from zero, unlike printf) */
function playGolden() {
  const vm = require('vm');
  const src = fs.readFileSync(path.join(ROOT, 'src/game.js'), 'utf8'), grab = re => src.match(re)[0];
  const code = [grab(/^const SWING_FULL = .*$/m), grab(/^const FEEL_BASE = .*$/m), grab(/^const FEEL = .*$/m), grab(/^function computeStroke\(samples\) \{[\s\S]*?\n\}/m)].join('\n');
  const ctx = vm.createContext({ Math });
  vm.runInContext('const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));\n' + code + '\nglobalThis.api = { computeStroke, FEEL, FEEL_BASE };', ctx);
  const { computeStroke, FEEL, FEEL_BASE } = ctx.api;
  const feels = [Object.assign({}, FEEL_BASE), { sweet: 0.3, tempoDead: 0.3, tempoK: 0.12, pathK: 0.35, toeLoss: 0.1, twist: 3 }];
  /* a gesture: touch, an eased pull back of `back` px over tb seconds, then a push through at `fwd`
     px/s drifting `drift` px/s sideways, sampled at `hz`, starting `off` px to the side */
  const gesture = (back, tb, fwd, drift, off, hz) => {
    const out = [{ t: 0, x: 60, y: 120 }];
    const nb = Math.max(2, Math.round(tb * hz));
    /* an ease-out in plain arithmetic, so the samples are the same bits in every engine */
    for (let i = 1; i <= nb; i++) { const u = i / nb; out.push({ t: i / hz, x: 60 + off * u, y: 120 + back * u * (2 - u) }); }
    let y = 120 + back, x = 60 + off, t = nb / hz;
    while (y > 60 && out.length < 400) { t += 1 / hz; y -= fwd / hz; x += drift / hz; out.push({ t, x, y }); }
    return out;
  };
  const strokes = [];
  for (const [fi, feel] of feels.entries()) {
    for (const back of [10, 40, 120, 240, 300]) for (const tb of [0.25, 0.6]) for (const ratio of [0.5, 1, 2.2]) for (const drift of [0, 90]) for (const off of [0, 14, -30]) for (const hz of [120, 240]) {
      const samples = gesture(back, tb, back / 0.2 * ratio, drift, off, hz);
      for (const k of Object.keys(FEEL)) delete FEEL[k];
      Object.assign(FEEL, feel);
      const r = computeStroke(samples);
      strokes.push({ feel: fi, samples: samples.map(q => [q.t, q.x, q.y]), stroke: r && { power: r.power, turn: r.turn, clean: r.clean } });
    }
  }
  const fixed = [];
  for (const [x, f] of [[0.125, 2], [-0.125, 2], [2.5, 0], [-2.5, 0], [1.005, 2], [1.0005, 3], [12.3456785, 6], [359.99951, 3], [-0.0001, 3], [0.99995, 4], [1e-7, 6]]) fixed.push([x, f, +x.toFixed(f)]);
  for (let i = 0; i < 300; i++) { const x = ((i * 2654435761) % 1000003) / 997.1 - 400, f = [3, 4, 6][i % 3]; fixed.push([x, f, +x.toFixed(f)]); }
  /* JSON writes -0 as 0; a toFixed of a tiny negative is -0, so the sign travels as a string */
  for (const c of fixed) if (Object.is(c[2], -0)) c[2] = '-0';
  return JSON.stringify({ v: 1, feels, strokes, fixed }) + '\n';
}

/* the UI glyphs the web inlines as SVG strings */
function readGlyphs() {
  const src = ['src/game.js', 'src/shop.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  const out = {};
  for (const n of ['STAR', 'LOCK', 'COIN', 'CROWN', 'FLAG', 'BIN', 'CRAZY', 'CLASSIC', 'BONUS']) {
    let svg = src.match(new RegExp(`^const ${n}_SVG = '(<svg[^\\n]*</svg>)';$`, 'm'))[1];
    if (n === 'STAR') svg = svg.replace('<path ', '<path fill="#000" ');   /* the page fills it from CSS: a template here */
    out[n.toLowerCase()] = svg;
  }
  return out;
}
/* an asset catalog image set holding one SVG, kept as vectors */
function imageSet(name, svg, template) {
  let xml = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  /* Xcode sizes a vector from width and height; the web's SVGs only carry a viewBox */
  const root = xml.slice(0, xml.indexOf('>')), vb = root.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/);
  if (vb && !/\swidth=/.test(root)) xml = xml.replace('<svg ', `<svg width="${vb[1]}" height="${vb[2]}" `);
  const contents = { images: [{ filename: name + '.svg', idiom: 'universal' }], info: { author: 'export-ios', version: 1 },
    properties: Object.assign({ 'preserves-vector-representation': true }, template ? { 'template-rendering-intent': 'template' } : {}) };
  return { [`${name}.imageset/${name}.svg`]: xml + '\n', [`${name}.imageset/Contents.json`]: JSON.stringify(contents, null, 2) + '\n' };
}

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

const looks = readLooks();
const looksJson = JSON.stringify({ v: 1, looks: looks.map(({ icon, ...l }) => ({ ...l, icon: icon ? 'course' + l.course : null })) }, null, 1) + '\n';
const art = { 'Contents.json': JSON.stringify({ info: { author: 'export-ios', version: 1 }, properties: { 'provides-namespace': false } }, null, 2) + '\n' };
for (const l of looks) if (l.icon) Object.assign(art, imageSet('course' + l.course, l.icon, false));
for (const [n, svg] of Object.entries(readGlyphs())) Object.assign(art, imageSet('glyph-' + n, svg, n === 'star'));

/* the extras, from the web's own code (src/game.js 6c): lost-ball spots for a hole of every fourth
   course, and the daily hole for a spread of dates */
function extrasGolden() {
  const src = fs.readFileSync(path.join(ROOT, 'src/game.js'), 'utf8');
  const cut = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
  const names = ['BALL_R', 'WALL_HALF', 'TUBE_R', 'simulatePutt', 'groundH', 'onFloor', 'zoneAt', 'closestOnSeg'];
  const lostSpot = new Function(...names, cut('const LOST_SHOTS', '/* the search runs').replace('let lostMesh = null;', '') + '\nreturn lostSpot;')(...names.map(n => S[n]));
  const dailyKey = new Function('allCourses', 'WORLDS', cut('function dailyKey', 'function finishDaily') + '\nreturn dailyKey;')(S.allCourses, S.WORLDS);
  const lost = {};
  S.allCourses().forEach((c, i) => { if (i % 4 === 0) { const h = S.WORLDS[c].holes[3 % S.WORLDS[c].holes.length]; lost[h.key] = lostSpot(h); } });
  const daily = {};
  for (let i = 0; i < 40; i++) { const d = new Date(Date.UTC(2026, 0, 1 + i * 37)), ds = d.toISOString().slice(0, 10); daily[ds] = dailyKey(ds); }
  return JSON.stringify({ v: 1, lost, daily }) + '\n';
}
const EXTRAS_OUT = path.join(ROOT, 'ios/PuttXCore/Tests/PuttXCoreTests/Resources/extras.json');
const files = [[EXTRAS_OUT, extrasGolden()], [HOLES_OUT, holesJson], [GOLDEN_OUT, goldenJson], [LOOKS_OUT, looksJson], [PLAY_OUT, playGolden()], ...Object.entries(art).map(([f, s]) => [path.join(ART_DIR, f), s])];
if (process.argv.includes('--check')) {
  /* play.json's outputs come from log2 and atan2, which engines may round differently in the last
     bit: fresh means the same gestures and the same strokes to 1e-12 (the Swift test's own tolerance) */
  const near = (a, b) => {
    if (typeof a === 'number' && typeof b === 'number') return a === b || Math.abs(a - b) <= 1e-12;
    if (a && b && typeof a === 'object' && typeof b === 'object') { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => near(a[k], b[k])); }
    return a === b;
  };
  const same = (f, s) => f === PLAY_OUT ? near(JSON.parse(fs.readFileSync(f, 'utf8')), JSON.parse(s)) : fs.readFileSync(f, 'utf8') === s;
  const stale = files.filter(([f, s]) => !fs.existsSync(f) || !same(f, s));
  for (const [f] of stale) console.error('stale: ' + path.relative(ROOT, f) + ' (run node scripts/export-ios.cjs)');
  process.exit(stale.length ? 1 : 0);
}
fs.rmSync(ART_DIR, { recursive: true, force: true });
for (const [f, s] of files) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); }
const n = gold.reduce((s, g) => s + g.sol.length + g.fan.length, 0);
console.log(`${holes.length} holes, ${n} golden putts, ${looks.length} looks, ${Object.keys(art).length >> 1} art sets`);
