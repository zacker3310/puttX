#!/usr/bin/env node
/* resolve: re-proves every hole after a physics change and writes the new `sol` arrays straight
   back into courses/cNN.sim.js, so nobody pastes 550 lines by hand.
   For each hole: if the stored sol still sinks within par it is kept untouched; otherwise the old
   line is repaired (its last putt nudged in aim and pace, closest first); otherwise the solver
   (scripts/solve.cjs) searches again and the k-th `sol: [...]` of the course file is
   replaced (holes appear in file order). An auto hole is held to holes-check's rule (one ace on a
   line where at least 11 of 21 neighbouring putts ace) and searched for such a line from the tee. Holes the solver cannot prove are listed, not touched.
   Courses run in parallel on child processes, one per core.
   Usage: node scripts/resolve.cjs [--course 3,13] [--jobs 4] [--force] [--report path.json]
   --force re-solves even holes whose sol still works (to tidy lines after a big change). */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const fileOf = c => path.join(ROOT, 'courses', `c${String(c).padStart(2, '0')}.sim.js`);
const fmt = sol => '[' + sol.map(([a, p, t0]) => `[${+a.toFixed(2)},${+p.toFixed(2)},${t0}]`).join(',') + ']';

/* the k-th `sol: [[...]]` in a course file: [start, end) of the array literal */
function solSpans(src) {
  const out = [], re = /sol:\s*\[/g;
  let m;
  while ((m = re.exec(src))) {
    const a = m.index + m[0].length - 1;
    let depth = 0, i = a;
    for (; i < src.length; i++) { if (src[i] === '[') depth++; else if (src[i] === ']' && --depth === 0) break; }
    out.push([a, i + 1]);
  }
  return out;
}

if (process.env.PUTTX_RESOLVE_CHILD) {
  /* child: one course */
  const c = Number(process.env.PUTTX_RESOLVE_CHILD), force = process.env.PUTTX_RESOLVE_FORCE === '1';
  /* a course can use shape helpers its world's first course defines (c17 uses c07's), so load both */
  process.env.PUTTX_ONLY = c <= 30 ? [((c - 1) % 10) + 1, c].join() : String(c);
  const { solve, sweep, walkField, S } = require('./solve.cjs');
  /* a putt into the water costs two (the stroke and the penalty) and the ball goes back where it was hit from, as in play */
  const replay = (h, sol) => {
    let at = h.tee, last = null, cost = 0;
    for (const [a, p, t0] of sol) { last = S.simulatePutt(h, at, a, p, t0); cost += last.end === 'oob' ? 2 : 1; if (last.end === 'stop') at = [last.x, last.z]; else if (last.end !== 'oob') break; }
    return cost <= h.par && last && last.end === 'sunk';
  };
  /* an auto hole's line, as holes-check measures it: of 21 putts round (a, p) from the tee (aim
     +-0.6 deg, pace in 0.012 steps, start time 0), how many ace. It needs at least AUTO_MIN. */
  const AUTO_MIN = 11;
  const autoNear = (h, a, p) => {
    let n = 0;
    for (const d of [-0.6, 0, 0.6]) for (let k = -3; k <= 3; k++) if (S.simulatePutt(h, h.tee, a + d, Math.min(1, Math.max(0.02, p + k * 0.012)), 0).end === 'sunk') n++;
    return n;
  };
  /* a proof holes-check accepts: sinks within par, and on an auto hole is one ace on a line that nearly always aces */
  const good = (h, sol) => !!sol && replay(h, sol) && (!h.auto || (sol.length === 1 && autoNear(h, sol[0][0], sol[0][1]) >= AUTO_MIN));
  /* an auto hole from scratch: every putt from the tee on a 1 deg x 0.02 grid; the aces whose grid
     neighbours ace too are scored by autoNear, then the best is tuned on a finer grid round it */
  const solveAuto = h => {
    const A = 360, P = 50, ace = new Uint8Array(A * P);
    for (let a = 0; a < A; a++) for (let p = 1; p <= P; p++) if (S.simulatePutt(h, h.tee, a, +(p / P).toFixed(2), 0).end === 'sunk') ace[a * P + p - 1] = 1;
    const dense = [];
    for (let a = 0; a < A; a++) for (let p = 0; p < P; p++) {
      if (!ace[a * P + p]) continue;
      let n = 0;
      for (const da of [-1, 0, 1]) for (const dp of [-1, 0, 1]) { const q = p + dp; if (q >= 0 && q < P && ace[((a + da + A) % A) * P + q]) n++; }
      dense.push([n, a, +((p + 1) / P).toFixed(2)]);
    }
    dense.sort((u, v) => v[0] - u[0]);
    let best = null, bestN = -1;
    for (const [, a, p] of dense.slice(0, 24)) { const n = autoNear(h, a, p); if (n > bestN) { bestN = n; best = [a, p]; } if (n >= 19) break; }
    if (!best) return null;
    for (let da = -0.5; da <= 0.5001; da += 0.25) for (let dp = -0.02; dp <= 0.0201; dp += 0.01) {
      const a = +(best[0] + da).toFixed(2), p = +Math.min(1, Math.max(0.02, best[1] + dp)).toFixed(2);
      if (S.simulatePutt(h, h.tee, a, p, 0).end !== 'sunk') continue;
      const n = autoNear(h, a, p);
      if (n > bestN) { bestN = n; best = [a, p]; }
    }
    process.stderr.write(`${h.key} auto line ${best} aces ${bestN}/21\n`);
    return bestN >= AUTO_MIN ? [[best[0], best[1], 0]] : null;
  };
  /* repair first: the old line, nudged. Keep its earlier putts, then search outward from its last putt
     (closest aim and pace first) for one that sinks. An auto hole wants the middle of its ace window,
     not its edge, so it scores each sinking candidate by how many of holes-check's neighbours ace too. */
  const repair = (h, sol) => {
    if (!sol || !sol.length) return null;
    if (h.auto) sol = [[sol[0][0], sol[0][1], 0]];   /* an auto hole is one ace from the tee */
    /* the earlier putts that stop (a water putt is dropped: it only costs strokes and leaves the ball where it was) */
    let at = h.tee;
    const pre = [];
    for (const s of sol.slice(0, -1)) { const r = S.simulatePutt(h, at, s[0], s[1], s[2]); if (r.end === 'stop') { at = [r.x, r.z]; pre.push(s); } else if (r.end !== 'oob') return null; }
    const [a0, p0, t0] = sol[sol.length - 1], cands = [];
    for (let da = -6; da <= 6.0001; da += 0.25) for (let dp = -0.3; dp <= 0.3001; dp += 0.01) cands.push([da, dp]);
    cands.sort((u, v) => (Math.abs(u[0]) / 6 + Math.abs(u[1]) / 0.3) - (Math.abs(v[0]) / 6 + Math.abs(v[1]) / 0.3));
    let best = null, bestScore = -1;
    for (const [da, dp] of cands) {
      const a = +(a0 + da).toFixed(2), p = +Math.min(1, Math.max(0.01, p0 + dp)).toFixed(2);
      if (S.simulatePutt(h, at, a, p, t0).end !== 'sunk') continue;
      const out = pre.concat([[a, p, t0]]);
      if (!h.auto) return out;
      const near = autoNear(h, a, p);
      if (near > bestScore) { bestScore = near; best = out; }
      if (near >= 18) break;
    }
    return best && (!h.auto || bestScore >= AUTO_MIN) ? best : null;
  };
  /* extend: play the old line until it stops short, then one full sweep from that spot for a putt
     that sinks (and, failing that, from the spot before its last putt). One solver node, not a beam. */
  const extend = (h, sol) => {
    if (!sol || !sol.length || h.auto) return null;
    /* the path keeps only putts that stop: a water putt in a proof would cost a penalty stroke in play */
    const far = walkField(h), spots = [{ at: h.tee, path: [] }];
    let at = h.tee, path = [];
    for (const s of sol) {
      const r = S.simulatePutt(h, at, s[0], s[1], s[2]);
      if (r.end === 'sunk') return path.length + 1 <= h.par ? path.concat([s]) : null;
      if (r.end === 'stop') { at = [r.x, r.z]; path = path.concat([s]); spots.push({ at, path }); } else if (r.end !== 'oob') return null;
    }
    for (const sp of spots.reverse()) {
      if (sp.path.length + 1 > h.par) continue;
      const r = sweep(h, sp.at, far, true);
      if (r.sink) return sp.path.concat([r.sink]);
    }
    return null;
  };
  /* each finished hole is written straight back, so a run that is stopped keeps what it proved */
  const save = (k, sol) => {
    const f = fileOf(c); let src = fs.readFileSync(f, 'utf8'); const sp = solSpans(src)[k];
    if (sp) { src = src.slice(0, sp[0]) + JSON.stringify(sol) + src.slice(sp[1]); fs.writeFileSync(f, src); }
  };
  const rows = [];
  for (const [k, h] of S.WORLDS[c].holes.entries()) {
    const t = Date.now();
    if (!force && good(h, h.sol)) { rows.push({ key: h.key, kept: true }); continue; }
    let fixed = !force && repair(h, h.sol);
    if (!good(h, fixed) && !force) { fixed = extend(h, h.sol); if (good(h, fixed)) process.stderr.write(`${h.key} extended `); else fixed = null; }
    if (good(h, fixed)) { save(k, fixed); rows.push({ key: h.key, par: h.par, sol: fixed, putts: fixed.length, s: +((Date.now() - t) / 1000).toFixed(1), repaired: true }); process.stderr.write(`${h.key} repaired ${fixed.length}/${h.par} ${((Date.now() - t) / 1000).toFixed(1)}s\n`); continue; }
    const sol = h.auto ? solveAuto(h) : solve(h);
    let out = null;
    if (sol && sol.length <= h.par) {
      const rounded = JSON.parse(fmt(sol));
      out = good(h, rounded) ? rounded : (good(h, sol) ? sol : null);
    }
    if (out) save(k, out);
    rows.push({ key: h.key, par: h.par, sol: out, putts: sol ? sol.length : null, s: +((Date.now() - t) / 1000).toFixed(1) });
    process.stderr.write(`${h.key} ${out ? 'ok ' + out.length + '/' + h.par : 'MISSES PAR' + (sol ? ' (' + sol.length + ')' : ' (none)')} ${((Date.now() - t) / 1000).toFixed(1)}s\n`);
  }
  process.stdout.write(JSON.stringify(rows));
  return;
}

if (require.main !== module) return;
const all = fs.readdirSync(path.join(ROOT, 'courses')).filter(f => /^c\d\d\.sim\.js$/.test(f)).map(f => Number(f.slice(1, 3))).sort((a, b) => a - b);
const courses = val('--course') ? val('--course').split(',').map(Number) : all;
const jobs = Number(val('--jobs')) || Math.max(1, os.cpus().length);
const report = val('--report');
const results = {}, crashed = [];
let next = 0;
function runOne(c) {
  return new Promise(res => {
    let out = '';
    const ch = spawn(process.execPath, [__filename], { env: { ...process.env, PUTTX_RESOLVE_CHILD: String(c), PUTTX_RESOLVE_FORCE: args.includes('--force') ? '1' : '' } });
    ch.stdout.on('data', d => { out += d; });
    ch.stderr.on('data', d => process.stdout.write(`[c${c}] ${d}`));
    ch.on('close', (code, sig) => {
      let rows = [], bad = !!(code || sig);
      try { rows = JSON.parse(out); } catch (e) { bad = true; }
      if (bad) { crashed.push(c); console.log(`[c${c}] crashed (${sig || 'exit ' + code})`); }
      /* no write-back here: the child saves each hole as it is proven, and writing the whole run's sols
         again at the end would undo any hand fix made to the course file while the child was running */
      results[c] = rows;
      const kept = rows.filter(r => r.kept).length, rep = rows.filter(r => r.repaired).length, fixed = rows.filter(r => r.sol && !r.repaired).length, missed = rows.filter(r => !r.kept && !r.sol);
      console.log(`[c${c}] done: ${kept} kept, ${rep} repaired, ${fixed} re-solved, ${missed.length} miss par${missed.length ? ': ' + missed.map(r => r.key).join(' ') : ''}`);
      res();
    });
  });
}
(async () => {
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(jobs, courses.length) }, async () => { while (next < courses.length) await runOne(courses[next++]); }));
  const missed = Object.values(results).flat().filter(r => !r.kept && !r.sol).map(r => r.key);
  console.log(`\nresolve: ${courses.length} courses in ${((Date.now() - t0) / 60000).toFixed(1)} min; ${missed.length} holes miss par${missed.length ? ': ' + missed.join(' ') : ''}${crashed.length ? '; crashed: c' + crashed.join(' c') : ''}`);
  if (report) fs.writeFileSync(report, JSON.stringify(results, null, 1));
  process.exit(missed.length || crashed.length ? 1 : 0);
})();
