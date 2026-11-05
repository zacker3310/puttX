#!/usr/bin/env node
/* resolve: re-proves every hole after a physics change and writes the new `sol` arrays straight
   back into courses/cNN.sim.js, so nobody pastes 550 lines by hand.
   For each hole: if the stored sol still sinks within par it is kept untouched; otherwise the old
   line is repaired (its last putt nudged in aim and pace, closest first); otherwise the solver
   (scripts/solve.cjs) searches again and the k-th `sol: [...]` of the course file is
   replaced (holes appear in file order). Holes the solver cannot prove are listed, not touched.
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
  process.env.PUTTX_ONLY = String(c);
  const { solve, S } = require('./solve.cjs');
  const replay = (h, sol) => {
    let at = h.tee, last = null;
    for (const [a, p, t0] of sol) { last = S.simulatePutt(h, at, a, p, t0); if (last.end === 'stop') at = [last.x, last.z]; else if (last.end !== 'oob') break; }
    return sol.length <= h.par && last && last.end === 'sunk';
  };
  /* repair first: the old line, nudged. Keep its earlier putts, then search outward from its last putt
     (closest aim and pace first) for one that sinks. An auto hole wants the middle of its ace window,
     not its edge, so it scores each sinking candidate by how many of holes-check's neighbours ace too. */
  const repair = (h, sol) => {
    if (!sol || !sol.length) return null;
    let at = h.tee;
    for (const [a, p, t0] of sol.slice(0, -1)) { const r = S.simulatePutt(h, at, a, p, t0); if (r.end === 'stop') at = [r.x, r.z]; else if (r.end !== 'oob') return null; }
    const [a0, p0, t0] = sol[sol.length - 1], cands = [];
    for (let da = -6; da <= 6.0001; da += 0.25) for (let dp = -0.3; dp <= 0.3001; dp += 0.01) cands.push([da, dp]);
    cands.sort((u, v) => (Math.abs(u[0]) / 6 + Math.abs(u[1]) / 0.3) - (Math.abs(v[0]) / 6 + Math.abs(v[1]) / 0.3));
    let best = null, bestScore = -1;
    for (const [da, dp] of cands) {
      const a = +(a0 + da).toFixed(2), p = +Math.min(1, Math.max(0.01, p0 + dp)).toFixed(2);
      if (S.simulatePutt(h, at, a, p, t0).end !== 'sunk') continue;
      const out = sol.slice(0, -1).concat([[a, p, t0]]);
      if (!h.auto) return out;
      let near = 0;
      for (const d of [-0.6, 0, 0.6]) for (let k = -3; k <= 3; k++) if (S.simulatePutt(h, h.tee, a + d, Math.min(1, Math.max(0.02, p + k * 0.012)), 0).end === 'sunk') near++;
      if (near > bestScore) { bestScore = near; best = out; }
      if (near >= 18) break;
    }
    return best && (!h.auto || bestScore >= 11) ? best : null;
  };
  const rows = [];
  for (const h of S.WORLDS[c].holes) {
    const t = Date.now();
    if (!force && h.sol && replay(h, h.sol)) { rows.push({ key: h.key, kept: true }); continue; }
    const fixed = !force && repair(h, h.sol);
    if (fixed && replay(h, fixed)) { rows.push({ key: h.key, par: h.par, sol: fixed, putts: fixed.length, s: +((Date.now() - t) / 1000).toFixed(1), repaired: true }); process.stderr.write(`${h.key} repaired ${fixed.length}/${h.par} ${((Date.now() - t) / 1000).toFixed(1)}s\n`); continue; }
    const sol = solve(h);
    let out = null;
    if (sol && sol.length <= h.par) {
      const rounded = JSON.parse(fmt(sol));
      out = replay(h, rounded) ? rounded : (replay(h, sol) ? sol : null);
    }
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
const results = {};
let next = 0;
function runOne(c) {
  return new Promise(res => {
    let out = '';
    const ch = spawn(process.execPath, [__filename], { env: { ...process.env, PUTTX_RESOLVE_CHILD: String(c), PUTTX_RESOLVE_FORCE: args.includes('--force') ? '1' : '' } });
    ch.stdout.on('data', d => { out += d; });
    ch.stderr.on('data', d => process.stdout.write(`[c${c}] ${d}`));
    ch.on('close', () => {
      let rows = [];
      try { rows = JSON.parse(out); } catch (e) { console.log(`[c${c}] crashed`); }
      /* write back: re-read the file now, in case another course's child finished first (different file) */
      const f = fileOf(c);
      let src = fs.readFileSync(f, 'utf8');
      const spans = solSpans(src);
      const edits = [];
      rows.forEach((r, k) => { if (r.sol && spans[k]) edits.push([spans[k], fmt(r.sol)]); });
      for (const [[a, b], txt] of edits.sort((x, y) => y[0][0] - x[0][0])) src = src.slice(0, a) + txt + src.slice(b);
      if (edits.length) fs.writeFileSync(f, src);
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
  console.log(`\nresolve: ${courses.length} courses in ${((Date.now() - t0) / 60000).toFixed(1)} min; ${missed.length} holes miss par${missed.length ? ': ' + missed.join(' ') : ''}`);
  if (report) fs.writeFileSync(report, JSON.stringify(results, null, 1));
  process.exit(missed.length ? 1 : 0);
})();
