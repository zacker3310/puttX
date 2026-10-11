# PuttX v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A wordless, AAA-feel 3D mini golf game for a 3-5 year old: 27 holes across vroom's construction, snow and space worlds, in one offline `index.html` on GitHub Pages.

**Architecture:** One `index.html` holds CSS, scene markup, three.js r170 inlined by a vendor script (`<script id="three">`) and, after it, the game script (`<script id="game">`), so the game can build THREE objects at top level. Inside the game script a `// #region sim` block holds everything DOM-free and THREE-free (physics, rounds, scoring, hole data); `tests/sim.cjs` loads that block into a Node `vm`, so physics and hole suites run without a browser. Physics is hand-rolled, fixed-step at 240 Hz and deterministic, which lets the hole bot prove every par and lets the live loop be tested against the pure simulation.

**Tech Stack:** HTML/CSS/vanilla JS, three.js r170 (inlined), Web Audio (synthesized), Node 22, playwright-core 1.63.0, eslint 10.11.0.

**Spec:** `SPEC.md` (approved 2026-10-11). Read it before each task.

## Global Constraints

- One `index.html`. three.js lives in `<script id="three">` just before `<script id="game">`, written only by `scripts/vendor-three.cjs`. Never hand-edit or Read the three block (about 690 KB on one line); use Grep with offsets on `index.html`.
- No network requests at runtime. No CDN. No service worker.
- devDependencies are exactly: `eslint` 10.11.0, `playwright-core` 1.63.0, `three` 0.170.0. The game itself depends only on the inlined three.js.
- Zero visible words: rendered text nodes contain no letters (`\p{L}`); numerals and the symbols `+ - / x` only. `aria-label`s are fine.
- Every interactive element is at least 64 px rendered at 1024x768. The stage is 1200x700 scaled to fit, so buttons are at least 88 stage px.
- Toybox look: vroom's `--v-*` tokens (copied verbatim in Task 1.1), flat unblurred shadows, big radii, `var(--v-font)`.
- No fail states: stroke cap is `par + 3` and auto-sinks; stars are 1 (finish), 2 (par), 3 (under par); best strokes and stars never get worse.
- Worlds play in the order `[1, 5, 8]`, 9 holes each, par 2 to 4. World 8 gravity scale is `0.427` (vroom's 640/1500) with felt friction `0.19` so rolls feel the same as Earth.
- The sim region uses no `Math.random`, `Date`, `performance`, `document`, `window` or `THREE`.
- 60 fps target on iPad: pixel ratio capped at 2, one shadow-casting light, 1024 shadow map.
- `prefers-reduced-motion: reduce` turns off decorative motion (trail, squash, confetti, flag spin, snowfall drift).
- No em dashes in code, comments, docs or commit messages.
- Commit to `main` after each task with message `feat(T<id>): ...` (or `test`/`docs`), ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Never `--no-verify`.

## Review Focus

1. **Ball at rest in a mover's sweep.** A spinning arm or sliding asteroid reaches a ball the kid left in its path. Expected: the mover nudges the ball, no stroke is counted, and the ball settles or resets. It never passes through the ball. Pinned in Task 2.4 (`play-check` "drift").
2. **Max-power putts into corners, bumpers and wall ends.** Expected: the ball never tunnels or escapes a walled hole, and speed never exceeds `V_CAP`. Pinned in Task 1.2 (physics fuzz) and Task 2.1 (per-hole fuzz at power 1 over 360 angles).
3. **App backgrounded mid-roll, or a long frame.** Expected: no teleport. The frame step is clamped, and the live outcome equals the pure simulation for the same putt. Pinned in Task 2.4.
4. **A second finger, or a HUD tap, during a drag.** Expected: only the first pointer aims; HUD buttons never start a putt. Pinned in Task 2.4.
5. **Corrupt or foreign localStorage.** Expected: a fresh save and no crash. Pinned in Task 1.4 (`save-check`).

---

## File Structure

| Path | Responsibility |
|---|---|
| `index.html` | Everything the player gets: style, markup, game script, inlined three.js |
| `scripts/vendor-three.cjs` | Inlines `three/build/three.module.min.js` as `window.THREE` between markers |
| `scripts/solve.cjs` | Hole bot: beam search that proves each par and prints `sol` arrays |
| `scripts/render-icons.cjs` | Rasterises `docs/icons/icon.svg` into the PNG icons (copied from vroom) |
| `tests/lib.cjs` | Shared `check`/`done` trailer, Chromium launcher, word and tap-target probes |
| `tests/sim.cjs` | Loads the sim region into a Node `vm` |
| `tests/run-all.cjs` | `npm test`: serves the repo, runs every `*-check.cjs`, prints a table |
| `tests/lint.cjs` | ESLint over the game script only |
| `tests/*-check.cjs` | One suite per concern (see each task) |
| `eslint.config.js` | Flat config: browser globals, element ids, `THREE` |
| `manifest.webmanifest`, `docs/icons/*` | Home-screen install |
| `.github/workflows/test.yml` | CI: the suites on every push |
| `SPEC.md`, `TASKS.md`, `CLAUDE.md`, `README.md` | Design, queue, agent notes, player and parent notes |

Game script sections, in file order (a table of contents comment sits at the top of the script):
`1. stage` · `2. sim` (region: constants, geometry, physics, movers, rounds, worlds, progress, world packs) · `3. save` · `4. audio` · `5. render` (+ world looks) · `6. play` · `7. scenes` · `8. fx` · `9. boot`.

---

## Phase 1: Engine

### Task 1.1: Scaffold, harness, page shell, inlined three.js

**Files:**
- Create: `package.json`, `.gitignore`, `.editorconfig`, `.gitattributes`, `LICENSE`, `eslint.config.js`, `CLAUDE.md`, `TASKS.md` (already written with this plan), `scripts/vendor-three.cjs`, `tests/lib.cjs`, `tests/sim.cjs`, `tests/run-all.cjs`, `tests/lint.cjs`, `index.html`
- Test: `tests/boot-check.cjs`

**Interfaces:**
- Produces: `fit()`, `stageScale` (number), `showScene(id)`, `currentScene` (string), `window.booted` (true after boot), markers `// #region sim` / `// #endregion sim` and `/* three:begin */` / `/* three:end */`, `window.THREE` (r170), `tests/lib.cjs` exports `{ check, done, open, fresh, visibleLetters, smallTargets }`, `tests/sim.cjs` exports `{ loadSim }`.

- [ ] **Step 1: Repo files**

`package.json`:
```json
{
  "name": "puttx",
  "version": "1.0.0",
  "private": true,
  "description": "Mini golf for a 3 to 5 year old in vroom's worlds. One HTML file, no reading, works offline.",
  "homepage": "https://zacker3310.github.io/puttX/",
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/zacker3310/puttX.git" },
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node tests/run-all.cjs",
    "lint": "node tests/lint.cjs",
    "serve": "python3 -m http.server 4173",
    "vendor": "node scripts/vendor-three.cjs",
    "solve": "node scripts/solve.cjs",
    "icons": "node scripts/render-icons.cjs"
  },
  "devDependencies": {
    "eslint": "10.11.0",
    "playwright-core": "1.63.0",
    "three": "0.170.0"
  }
}
```

`.gitignore`:
```
node_modules
tests/shots/
.claude/
.DS_Store
```

`.editorconfig` and `.gitattributes`: copy `~/dev/vroom/.editorconfig` and `~/dev/vroom/.gitattributes` verbatim.

`LICENSE`: MIT, `Copyright (c) 2026 Zac Acker`.

`CLAUDE.md`:
```markdown
# PuttX: notes for Claude Code

One-file 3D mini golf for a 3-5 year old, set in vroom's worlds. `index.html` holds the CSS, the
scene markup, three.js r170 (`<script id="three">`, written by `npm run vendor`) and, after it,
the game script (`<script id="game">`). Never hand-edit or Read the three block:
it is one ~690 KB line. Grep `index.html` with offsets instead. `SPEC.md` is the design,
`TASKS.md` the queue, `.buildloop/current-plan.md` the plan.

## Rules the suites enforce

- Zero words on screen: numerals and symbols only. `aria-label`s are fine.
- No fail states: every hole finishes (the stroke cap, par + 3, auto-sinks); stars and bests only go up.
- Tap targets at least 64 px rendered at 1024x768 (88 stage px buttons).
- Toybox look: the `--v-*` tokens from vroom, flat shadows, big radii.
- The `// #region sim` block is DOM-free, THREE-free and deterministic (no Math.random, no
  clocks). `tests/sim.cjs` runs it in Node. Keep it that way.
- Honour `prefers-reduced-motion` for anything decorative.
- No em dashes anywhere.

## Working here

    npm ci && npx playwright-core install chromium
    npm test                       # every suite; serves the repo on a free port
    npm run lint                   # ESLint over the game script, must be 0 findings
    npm run solve -- --world 5     # prove pars and print sol arrays for a world
    npm run vendor                 # re-inline three.js after changing its version
    python3 -m http.server 4173    # then http://localhost:4173/?hole=1-3 or ?map
```

- [ ] **Step 2: ESLint config and lint runner**

`eslint.config.js`:
```js
/* Dev-only ESLint flat config for the game script in index.html (tests/lint.cjs extracts it).
   Browser globals are listed by hand; every element id is a global too, since the game
   addresses elements by id. THREE comes from the inlined three.js block. */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const ids = {};
for (const m of html.matchAll(/\sid="([A-Za-z_$][\w$]*)"/g)) ids[m[1]] = 'readonly';

const browser = { THREE: 'readonly' };
for (const g of [
  'window', 'document', 'navigator', 'location', 'localStorage', 'console', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'URLSearchParams',
  'AudioContext', 'webkitAudioContext', 'PointerEvent', 'Event', 'NodeFilter', 'matchMedia', 'getComputedStyle',
  'devicePixelRatio', 'innerWidth', 'innerHeight', 'visualViewport', 'addEventListener', 'removeEventListener',
]) browser[g] = 'readonly';

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...browser, ...ids } },
    rules: {
      'no-unused-vars': ['warn', { vars: 'all', args: 'none', caughtErrors: 'none' }],
      'no-undef': 'warn',
      'no-redeclare': 'warn',
      'no-dupe-keys': 'warn',
      'no-unreachable': 'warn',
      'no-duplicate-case': 'warn',
      'no-self-assign': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      eqeqeq: ['warn', 'smart'],
    },
  },
];
```

`tests/lint.cjs`:
```js
#!/usr/bin/env node
/* lint: extracts <script id="game"> from index.html to a temp .js file and runs ESLint over it.
   Names unused inside the script but referenced from the test suites are reported as
   "external", not as findings. Exit 1 when any real finding remains. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ESLint } = require('eslint');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const OPEN = '<script id="game">';
const a = html.indexOf(OPEN), b = html.indexOf('</script>', a);
if (a < 0 || b < 0) { console.error('lint: no <script id="game"> found'); process.exit(2); }
const lineOffset = html.slice(0, a + OPEN.length).split('\n').length - 1;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'puttx-lint-'));
const tmp = path.join(dir, 'game.js');
fs.writeFileSync(tmp, html.slice(a + OPEN.length, b));

const external = new Set();
for (const f of fs.readdirSync(__dirname)) {
  if (!f.endsWith('-check.cjs')) continue;
  for (const m of fs.readFileSync(path.join(__dirname, f), 'utf8').matchAll(/[A-Za-z_$][\w$]*/g)) external.add(m[0]);
}

(async () => {
  const eslint = new ESLint({ cwd: dir, overrideConfigFile: path.join(ROOT, 'eslint.config.js') });
  const [result] = await eslint.lintFiles([tmp]);
  const findings = [];
  let ext = 0;
  for (const m of result.messages) {
    const name = (m.message.match(/'([^']+)'/) || [])[1];
    if (m.ruleId === 'no-unused-vars' && name && external.has(name)) { ext++; continue; }
    findings.push(`index.html:${m.line + lineOffset}:${m.column}  ${m.ruleId}  ${m.message}`);
  }
  for (const f of findings) console.log(f);
  console.log(`\n${findings.length} finding(s), ${ext} external-only name(s)`);
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(findings.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
```

- [ ] **Step 3: Test harness**

`tests/lib.cjs`:
```js
/* lib: what every suite shares. check() prints PASS/FAIL lines and done() prints the
   "N/M passed" trailer run-all parses. open() launches Chromium at iPad landscape (1024x768)
   with software WebGL, records console errors and network requests, and waits for boot. */
'use strict';
const URL = process.env.PUTTX_URL || 'http://127.0.0.1:4173/index.html';
const results = [];

function check(name, ok, detail) {
  results.push(!!ok);
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  -- ' + detail : ''));
}
function done() {
  const p = results.filter(Boolean).length;
  console.log(`\n${p}/${results.length} passed`);
  process.exit(p === results.length ? 0 : 1);
}
async function open(query = '', { reducedMotion = 'no-preference', viewport = { width: 1024, height: 768 } } = {}) {
  const pw = require('playwright-core');
  const browser = await pw.chromium.launch({
    executablePath: process.env.CHROMIUM || pw.chromium.executablePath(),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport, reducedMotion });
  const errors = [], requests = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => requests.push(r.url()));
  await page.goto(URL + query);
  await page.waitForFunction(() => window.booted === true, null, { timeout: 20000 });
  return { browser, page, errors, requests };
}
/* clear the save and reload with a query, for suites that need a fresh kid */
async function fresh(page, query = '') {
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL + query);
  await page.waitForFunction(() => window.booted === true, null, { timeout: 20000 });
}
/* rendered text nodes that contain a letter (numerals and symbols are fine) */
const visibleLetters = page => page.evaluate(() => {
  const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const el = n.parentElement;
    if (!el || el.closest('script,style,title') || !el.getClientRects().length) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    if (/\p{L}/u.test(n.nodeValue)) out.push(n.nodeValue.trim().slice(0, 24));
  }
  return out;
});
/* visible buttons smaller than 64 rendered px on either side */
const smallTargets = page => page.evaluate(() => [...document.querySelectorAll('button')]
  .filter(b => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden')
  .map(b => { const r = b.getBoundingClientRect(); return { id: b.id || b.className, s: Math.round(Math.min(r.width, r.height)) }; })
  .filter(t => t.s < 64));

module.exports = { URL, check, done, open, fresh, visibleLetters, smallTargets };
```

`tests/sim.cjs`:
```js
/* sim: loads the DOM-free sim region of index.html (between `// #region sim` and
   `// #endregion sim`) into a Node vm context. Physics, round and hole suites and the solver
   run against exactly the code the page runs. Names not defined yet come back undefined. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NAMES = ['SIM_DT', 'BALL_R', 'CUP_R', 'CAPTURE_V', 'MIN_V', 'MAX_V', 'V_CAP', 'WALL_HALF', 'WALL_TOP', 'G', 'SURF',
  'rect', 'ring', 'makeHole', 'inPoly', 'onFloor', 'surfMu', 'groundH', 'groundGrad', 'closestOnSeg', 'moverState',
  'moverTouch', 'newBall', 'launch', 'stepBall', 'simulatePutt', 'newRound', 'capOf', 'starsFor', 'resolvePutt',
  'resolveDrift', 'WORLD_ORDER', 'WORLDS', 'registerWorld', 'holeAt', 'nextKey', 'freshProgress', 'recordHole',
  'holeUnlocked'];

function regionSource() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const a = html.indexOf('// #region sim'), b = html.indexOf('// #endregion sim');
  if (a < 0 || b < a) throw new Error('sim region markers missing from index.html');
  return html.slice(a, b);
}
function loadSim() {
  const ctx = vm.createContext({});
  const exp = NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(',');
  vm.runInContext(regionSource() + `\n;globalThis.__sim = { ${exp} };`, ctx);
  return ctx.__sim;
}
module.exports = { loadSim, regionSource };
```

`tests/run-all.cjs`:
```js
#!/usr/bin/env node
/* run-all: the canonical runner (`npm test`). Serves the repo root on a free port (or honours
   PUTTX_URL), resolves a Chromium (CHROMIUM env, else playwright-core's download), runs every
   tests/*-check.cjs in turn, prints a table and exits non-zero when anything fails.
   Node-only suites (physics, round, holes) simply ignore the URL.
   Usage: node tests/run-all.cjs [--verbose] [--only name,name] */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const oi = args.indexOf('--only');
const only = oi >= 0 ? args[oi + 1].split(',').map(s => s.trim()) : null;
const SUITES = fs.readdirSync(__dirname).filter(f => f.endsWith('-check.cjs')).map(f => f.slice(0, -4)).sort()
  .filter(s => !only || only.includes(s));

function chromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const exe = require('playwright-core').chromium.executablePath();
  if (!fs.existsSync(exe)) { console.error('run-all: no Chromium. Run `npx playwright-core install chromium` or set CHROMIUM.'); process.exit(2); }
  return exe;
}
const MIME = { '.html': 'text/html; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
function run(name, env) {
  return new Promise(resolve => {
    const t0 = Date.now();
    let out = '';
    const child = spawn(process.execPath, [path.join(__dirname, name + '.cjs')], { cwd: __dirname, env });
    const sink = c => { out += c; if (verbose) process.stdout.write(c); };
    child.stdout.on('data', sink);
    child.stderr.on('data', sink);
    child.on('close', code => {
      const m = out.match(/(\d+)\/(\d+) passed\s*$/m);
      resolve({ name, code, out, passed: m ? +m[1] : 0, total: m ? +m[2] : 0, ms: Date.now() - t0 });
    });
  });
}
(async () => {
  if (!SUITES.length) { console.error('run-all: no suites match'); process.exit(2); }
  const exe = chromium();
  let srv = null, url = process.env.PUTTX_URL;
  if (!url) { srv = await serve(); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
  console.log(`puttx tests | ${SUITES.length} suites | ${url}\n`);
  const env = { ...process.env, CHROMIUM: exe, PUTTX_URL: url };
  const results = [];
  for (const s of SUITES) {
    if (!verbose) process.stdout.write(s.padEnd(24) + ' ... ');
    const r = await run(s, env);
    results.push(r);
    if (!verbose) console.log(r.code === 0 ? `ok   ${r.passed}/${r.total}  ${(r.ms / 1000).toFixed(1)}s` : `FAIL ${r.passed}/${r.total}`);
  }
  if (srv) srv.close();
  const failed = results.filter(r => r.code !== 0);
  if (!verbose) for (const r of failed) console.log(`\n--- ${r.name} ---\n${r.out.trim()}`);
  const p = results.reduce((a, r) => a + r.passed, 0), t = results.reduce((a, r) => a + r.total, 0);
  console.log(`\n${results.length - failed.length}/${results.length} suites, ${p}/${t} checks  ${failed.length ? 'FAIL' : 'ok'}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('run-all: ' + (e.stack || e)); process.exit(2); });
```

- [ ] **Step 4: Write the failing boot suite**

`tests/boot-check.cjs`:
```js
/* boot-check: the page boots at iPad landscape with no console errors and no network beyond
   the page itself, three.js r170 is inlined as window.THREE, the 1200x700 stage scales to fit,
   the title is the first scene, nothing on screen is a word, and portrait asks to rotate. */
'use strict';
const { check, done, open, visibleLetters } = require('./lib.cjs');

(async () => {
  const { browser, page, errors, requests } = await open();
  await page.waitForTimeout(400);

  const t = await page.evaluate(() => ({ rev: window.THREE && THREE.REVISION, renderer: typeof (window.THREE && THREE.WebGLRenderer) }));
  check('three.js r170 is inlined as window.THREE', t.rev === '170' && t.renderer === 'function', JSON.stringify(t));

  const origin = new URL(page.url()).origin;
  const foreign = requests.filter(u => !u.startsWith(origin) && !u.startsWith('data:'));
  check('no network requests beyond the page origin', foreign.length === 0, foreign.join(' '));

  const st = await page.evaluate(() => { const r = stage.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), s: stageScale }; });
  check('stage scales 1200x700 to fit 1024x768', st.w === 1024 && st.h === 597, JSON.stringify(st));

  const sc = await page.evaluate(() => [...document.querySelectorAll('.scene.active')].map(s => s.id).join(','));
  check('title is the only active scene', sc === 'title', sc);

  const letters = await visibleLetters(page);
  check('no words on screen', letters.length === 0, letters.join(' | '));

  check('no console errors', errors.length === 0, errors.join(' | '));

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(200);
  const rot = await page.evaluate(() => getComputedStyle(rotate).display);
  check('portrait shows the rotate overlay', rot !== 'none', rot);

  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm ci && npx playwright-core install chromium && npm test -- --only boot-check`
Expected: FAIL (no `index.html` yet, so `open()` times out waiting for `booted`).

- [ ] **Step 6: Write the page shell**

`index.html`:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#2f241a">
<title>PuttX</title>
<style>
/* ---------- 1. TOKENS (copied from vroom's Toybox system) ---------- */
:root {
  --v-surface: #fff8ec;
  --v-surface-2: #f6e9d2;
  --v-surface-line: #e6d2ab;
  --v-surface-down: #d9c193;
  --v-ink: #5a4634;
  --v-ink-strong: #4a3826;
  --v-ink-soft: #8a7360;
  --v-wood: #c9a476;
  --v-wood-deep: #a8804e;
  --v-wood-dark: #6e5233;
  --v-wood-line: #8a6538;
  --v-accent-green: #74c465;  --v-green-line: #4e9a45;  --v-green-down: #438a3b;
  --v-accent-red:   #ef7d6d;  --v-red-line:   #c95a4c;  --v-red-down:   #b34e41;
  --v-accent-blue:  #6fc0df;  --v-blue-line:  #4a94b5;  --v-blue-down:  #3f83a2;
  --v-accent-yellow:#ffd66e;  --v-yellow-line:#dca63f;  --v-yellow-down:#c69334;
  --v-mute: #cfc0a6;  --v-mute-line: #b1a082;  --v-mute-down: #a3916d;
  --v-r-sm: 16px;
  --v-r-md: 22px;
  --v-r-lg: 30px;
  --v-r-xl: 38px;
  --v-r-round: 50%;
  --v-shadow-soft: 0 5px 0 rgba(74, 53, 35, .18);
  --v-shadow-card: 0 6px 0 rgba(74, 53, 35, .14);
  --v-outline-soft: rgba(74, 53, 35, .22);
  --v-scrim: rgba(64, 44, 28, .55);
  --v-dots: radial-gradient(rgba(90, 70, 52, .05) 2.4px, transparent 2.6px);
  --v-dots-size: 26px 26px;
  --v-font: ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold",
            "Hiragino Maru Gothic ProN", -apple-system, system-ui, sans-serif;
}

/* ---------- 2. SHELL ---------- */
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }
html, body { margin: 0; height: 100%; overflow: hidden; background: #2f241a; touch-action: none; }
#stage { position: absolute; left: 50%; top: 50%; width: 1200px; height: 700px; transform-origin: 50% 50%;
  overflow: hidden; background: var(--v-surface); font-family: var(--v-font); color: var(--v-ink); }
#view { position: absolute; inset: 0; width: 1200px; height: 700px; display: block; touch-action: none; }
.scene { position: absolute; inset: 0; display: none; pointer-events: none; }
.scene.active { display: block; }
.scene.panel { pointer-events: auto; }
.scene button, .scene .live { pointer-events: auto; }

/* ---------- 3. BUTTONS AND CHIPS ---------- */
.btn { position: absolute; width: 88px; height: 88px; padding: 0; display: grid; place-items: center; cursor: pointer;
  border: 4px solid var(--v-surface-line); border-radius: var(--v-r-md); background: var(--v-surface);
  box-shadow: 0 6px 0 var(--v-surface-down); font: 800 40px var(--v-font); color: var(--v-ink-strong);
  font-variant-numeric: tabular-nums; transition: transform .08s; }
.btn:active { transform: translateY(4px); box-shadow: 0 2px 0 var(--v-surface-down); }
.btn svg { width: 62%; height: 62%; pointer-events: none; }
.btn.go { background: var(--v-accent-green); border-color: var(--v-green-line); box-shadow: 0 6px 0 var(--v-green-down); color: #fff; }
.btn.go:active { box-shadow: 0 2px 0 var(--v-green-down); }
.btn.locked { background: var(--v-mute); border-color: var(--v-mute-line); box-shadow: 0 6px 0 var(--v-mute-down); }
.chip { position: absolute; height: 76px; padding: 0 22px 0 14px; display: flex; align-items: center; gap: 10px;
  border-radius: var(--v-r-lg); background: var(--v-surface); border: 4px solid var(--v-surface-line);
  box-shadow: var(--v-shadow-card); font: 800 44px var(--v-font); color: var(--v-ink-strong); font-variant-numeric: tabular-nums; }
.chip svg { width: 48px; height: 48px; }

/* ---------- 4. TITLE ---------- */
#titleGo { left: 510px; top: 452px; width: 180px; height: 180px; border-radius: 50%; }

/* ---------- 5. ROTATE ---------- */
#rotate { display: none; position: fixed; inset: 0; background: #2f241a; place-items: center; z-index: 10; }
#rotate svg { width: 40vmin; height: 40vmin; }
@media (orientation: portrait) { #rotate { display: grid; } }
</style>
</head>
<body>
<div id="stage">
  <canvas id="view" aria-label="golf course"></canvas>
  <section class="scene" id="title">
    <button class="btn go" id="titleGo" aria-label="play"><svg viewBox="0 0 64 64"><path d="M22 12 L52 32 L22 52 Z" fill="#fff"/></svg></button>
  </section>
  <section class="scene panel" id="map"></section>
  <section class="scene" id="hole"></section>
  <section class="scene" id="card"></section>
</div>
<div id="rotate" aria-label="turn sideways"><svg viewBox="0 0 64 64"><rect x="20" y="8" width="24" height="40" rx="5" fill="none" stroke="#fff8ec" stroke-width="4"/><path d="M14 52 A22 22 0 0 0 50 52" fill="none" stroke="#ffd66e" stroke-width="4"/><path d="M50 44 L50 53 L41 53" fill="none" stroke="#ffd66e" stroke-width="4"/></svg></div>
<script id="three">/* three:begin *//* three:end */</script>
<script id="game">
/* PuttX: one-file 3D mini golf. Sections, in order:
   1. stage   2. sim (DOM-free: physics, rounds, worlds, progress, hole packs)   3. save
   4. audio   5. render (+ world looks)   6. play   7. scenes   8. fx   9. boot */
'use strict';
/* ============ 1. STAGE ============ */
let stageScale = 1, currentScene = '';
function fit() {
  stageScale = Math.min(innerWidth / 1200, innerHeight / 700);
  stage.style.transform = `translate(-50%,-50%) scale(${stageScale})`;
}
function showScene(id) {
  currentScene = id;
  for (const s of document.querySelectorAll('.scene')) s.classList.toggle('active', s.id === id);
}

/* ============ 2. SIM ============ */
// #region sim
// #endregion sim

/* ============ 9. BOOT ============ */
function boot() {
  fit();
  addEventListener('resize', fit);
  addEventListener('orientationchange', () => { fit(); setTimeout(fit, 350); });
  if (window.visualViewport) visualViewport.addEventListener('resize', fit);
  showScene('title');
  window.booted = true;
}
addEventListener('DOMContentLoaded', boot);
</script>
</body>
</html>
```

- [ ] **Step 7: Vendor three.js**

`scripts/vendor-three.cjs`:
```js
#!/usr/bin/env node
/* vendor-three: inlines node_modules/three/build/three.module.min.js into index.html between
   the three:begin and three:end markers. The module's trailing `export{a as B,...}` becomes
   `window.THREE=Object.freeze({B:a,...})`, and the whole thing is wrapped in an IIFE so its
   minified top-level names never reach the game script's global scope. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(require.resolve('three/build/three.module.min.js'), 'utf8').trim();
const rev = (src.match(/const \w+="(\d+)"/) || [])[1];
const m = src.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
if (!m || !rev) { console.error('vendor-three: unexpected three.module.min.js shape'); process.exit(1); }
const pairs = m[1].split(',').map(s => s.trim()).filter(Boolean).map(s => {
  const [local, , exported] = s.split(/\s+/);
  return `${exported || local}:${local}`;
});
const body = src.slice(0, m.index) + `window.THREE=Object.freeze({${pairs.join(',')}});`;
if (/\bexport\s*\{/.test(body) || /<\/script/i.test(body)) { console.error('vendor-three: body still has an export or a closing script tag'); process.exit(1); }

const file = path.join(ROOT, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const B = '/* three:begin */', E = '/* three:end */';
const i = html.indexOf(B), j = html.indexOf(E);
if (i < 0 || j < i) { console.error('vendor-three: markers missing from index.html'); process.exit(1); }
fs.writeFileSync(file, html.slice(0, i + B.length) + `\n/* three.js r${rev}, MIT, Copyright 2010-2024 Three.js Authors */\n(function(){${body}})();\n` + html.slice(j));
console.log(`vendor-three: inlined three.js r${rev} (${(body.length / 1024).toFixed(0)} KB)`);
```

Run: `npm run vendor`
Expected: `vendor-three: inlined three.js r170 (675 KB)` (size approximate).

- [ ] **Step 8: Run the boot suite and lint**

Run: `npm test -- --only boot-check && npm run lint`
Expected: `7/7 passed`, then `0 finding(s)`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(T1.1): scaffold, test harness, page shell, inlined three.js r170

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 1.2: Physics core (walls, slopes, surfaces, cup, ramps, air)

**Files:**
- Modify: `index.html` (sim region)
- Test: `tests/physics-check.cjs`

**Interfaces:**
- Consumes: sim region markers from Task 1.1.
- Produces (all in the sim region):
  - Constants `SIM_DT`, `BALL_R`, `CUP_R`, `CAPTURE_V`, `MIN_V`, `MAX_V`, `V_CAP`, `STOP_V`, `STATIC_MU`, `MAX_SIM_T`, `G`, `ROLL`, `SURF`, `WALL_TOP`, `WALL_HALF`, `WALL_E`, `DROP`, `OOB_Y`, `LAND_KEEP`, `LIP_TURN`, `LIP_KEEP`, `LIP_PULL`, `LIP_PULL_R`.
  - `rect(x0,z0,x1,z1) -> [[x,z]x4]`, `ring(pts) -> pts + first`, `makeHole(def) -> hole`.
  - `inPoly(poly,x,z) -> bool`, `onFloor(h,x,z) -> bool`, `surfMu(h,x,z) -> number`, `groundH(h,x,z) -> number`, `groundGrad(h,x,z) -> [gx,gz]`.
  - `closestOnSeg(ax,az,bx,bz,x,z) -> [px,pz]`, `bounce(b,nx,nz,e,svx,svz) -> impact`, `hitSeg(...)`, `hitCircle(...)`, `collideAll(h,b,t)`.
  - `newBall(h,x,z) -> { x, z, y, vx, vz, vy, air, inCup, hits: [] }`, `puttVelocity(angleDeg, power) -> [vx,vz]`, `launch(b, angleDeg, power) -> b`.
  - `stepBall(h, b, t) -> null | 'stop' | 'sunk' | 'oob'`, `simulatePutt(h, from, angleDeg, power, t0 = 0) -> { end, x, z, t, steps, hits }`. `end` may also be `'timeout'`.
  - Hole object: `{ key?, par, tee:[x,z], cup:[x,z], g, feltMu, floors:[poly], walls:[polyline], segs:[[ax,az,bx,bz]], bumps:[{x,z,r,h}], ramps:[{x0,z0,x1,z1,axis:'x'|'z',h}], zones:[{surf:'ice'|'sand', poly}], posts:[{x,z,r,e?,look?}], movers:[...], open:bool, sol? }`.
  - Angle convention: `angleDeg` 0 putts toward +z, 90 toward +x.

- [ ] **Step 1: Write the failing physics suite**

`tests/physics-check.cjs`:
```js
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
let cleared = 0, fell = 0;
for (let p = 0; p <= 1.0001; p += 0.05) { const r = S.simulatePutt(gap, [0, 0.5], 0, p); if (r.end === 'oob') fell++; else if (r.z > 3.8) cleared++; }
check('ramp jump: some powers clear the gap, some fall in', cleared > 0 && fell > 0, JSON.stringify({ cleared, fell }));
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

done();
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- --only physics-check`
Expected: FAIL with `TypeError: S.makeHole is not a function`.

- [ ] **Step 3: Implement the physics core**

Replace the empty region in `index.html` with:
```js
// #region sim
/* Everything between these markers is deterministic and touches neither the page nor the
   renderer: tests/sim.cjs runs it in Node. Units are metres and seconds; y is up; a hole lies in the x-z plane. */

/* ---- 2a. constants ---- */
const SIM_DT = 1 / 240;          /* fixed physics step */
const BALL_R = 0.06;             /* toy-sized ball: bigger than real (0.021) so a kid can see it */
const CUP_R = 0.11;
const CAPTURE_V = 1.6;           /* slower than this over the cup drops in; faster lips out */
const MIN_V = 0.5, MAX_V = 5.5;  /* putt speed at power 0 and power 1 */
const V_CAP = 6;                 /* bumpers never push a ball past this: 0.025 m per step < BALL_R */
const STOP_V = 0.04;
const STATIC_MU = 0.1;           /* a stopped ball stays put on slopes gentler than this */
const MAX_SIM_T = 20;
const G = 9.8;
const ROLL = 5 / 7;              /* rolling sphere: share of gravity along a slope */
const SURF = { felt: { mu: 0.08 }, ice: { mu: 0.025 }, sand: { mu: 0.35 } };
const WALL_TOP = 0.15, WALL_HALF = 0.05, WALL_E = 0.75;
const DROP = 0.03;               /* ground falling away faster than this per step = airborne */
const OOB_Y = -1;
const LAND_KEEP = 0.85;
const LIP_TURN = 0.5, LIP_KEEP = 0.6, LIP_PULL = 1.5, LIP_PULL_R = 0.1;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---- 2b. hole geometry ---- */
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const ring = pts => pts.concat([pts[0]]);
/* A walled hole passes `shape` (one floor, closed outline wall). An open hole (space gaps)
   passes `floors` and `walls` itself. `inner` adds wall polylines (girders, dividers). */
function makeHole(def) {
  const h = Object.assign({ par: 2, g: 1, feltMu: SURF.felt.mu, bumps: [], ramps: [], zones: [], posts: [], movers: [], inner: [] }, def);
  h.open = !def.shape;
  if (!h.floors) h.floors = [h.shape];
  if (!h.walls) h.walls = [ring(h.shape)];
  h.walls = h.walls.concat(h.inner);
  h.segs = [];
  for (const w of h.walls) for (let i = 0; i + 1 < w.length; i++) h.segs.push([w[i][0], w[i][1], w[i + 1][0], w[i + 1][1]]);
  return h;
}
function inPoly(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
const onFloor = (h, x, z) => h.floors.some(p => inPoly(p, x, z));
function surfMu(h, x, z) {
  for (const zn of h.zones) if (inPoly(zn.poly, x, z)) return SURF[zn.surf].mu;
  return h.feltMu;
}
/* height: gaussian bumps (h > 0 hills, h < 0 bowls) plus ramps rising 0 -> h along +axis */
function groundH(h, x, z) {
  let y = 0;
  for (const b of h.bumps) { const dx = x - b.x, dz = z - b.z; y += b.h * Math.exp(-(dx * dx + dz * dz) / (b.r * b.r)); }
  for (const r of h.ramps) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1)
    y += r.h * (r.axis === 'x' ? (x - r.x0) / (r.x1 - r.x0) : (z - r.z0) / (r.z1 - r.z0));
  return y;
}
function groundGrad(h, x, z) {
  let gx = 0, gz = 0;
  for (const b of h.bumps) {
    const dx = x - b.x, dz = z - b.z, k = -2 * b.h * Math.exp(-(dx * dx + dz * dz) / (b.r * b.r)) / (b.r * b.r);
    gx += k * dx; gz += k * dz;
  }
  for (const r of h.ramps) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
    if (r.axis === 'x') gx += r.h / (r.x1 - r.x0); else gz += r.h / (r.z1 - r.z0);
  }
  return [gx, gz];
}

/* ---- 2c. collisions ---- */
function closestOnSeg(ax, az, bx, bz, x, z) {
  const ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez;
  const t = L2 ? clamp(((x - ax) * ex + (z - az) * ez) / L2, 0, 1) : 0;
  return [ax + ex * t, az + ez * t];
}
/* reflect off a surface with normal n moving at (svx, svz); returns the impact speed */
function bounce(b, nx, nz, e, svx, svz) {
  const rvx = b.vx - svx, rvz = b.vz - svz, vn = rvx * nx + rvz * nz;
  if (vn >= 0) return 0;
  const tx = rvx - vn * nx, tz = rvz - vn * nz;
  b.vx = svx + tx * 0.97 - e * vn * nx;
  b.vz = svz + tz * 0.97 - e * vn * nz;
  const s = Math.hypot(b.vx, b.vz);
  if (s > V_CAP) { b.vx *= V_CAP / s; b.vz *= V_CAP / s; }
  return -vn;
}
function hitSeg(b, ax, az, bx, bz, e, svx = 0, svz = 0) {
  const [px, pz] = closestOnSeg(ax, az, bx, bz, b.x, b.z), R = BALL_R + WALL_HALF;
  let nx = b.x - px, nz = b.z - pz;
  const d = Math.hypot(nx, nz);
  if (d >= R || d < 1e-9) return 0;
  nx /= d; nz /= d;
  b.x = px + nx * R; b.z = pz + nz * R;
  return bounce(b, nx, nz, e, svx, svz);
}
function hitCircle(b, cx, cz, cr, e, svx = 0, svz = 0) {
  let nx = b.x - cx, nz = b.z - cz;
  const d = Math.hypot(nx, nz), R = cr + BALL_R;
  if (d >= R || d < 1e-9) return 0;
  nx /= d; nz /= d;
  b.x = cx + nx * R; b.z = cz + nz * R;
  return bounce(b, nx, nz, e, svx, svz);
}
function collideAll(h, b, t) {
  for (const s of h.segs) { const v = hitSeg(b, s[0], s[1], s[2], s[3], WALL_E); if (v) b.hits.push(['wall', v]); }
}

/* ---- 2d. the ball ---- */
function newBall(h, x, z) { return { x, z, y: groundH(h, x, z), vx: 0, vz: 0, vy: 0, air: false, inCup: false, hits: [] }; }
function puttVelocity(angleDeg, power) {
  const a = angleDeg * Math.PI / 180, v = MIN_V + (MAX_V - MIN_V) * clamp(power, 0, 1);
  return [Math.sin(a) * v, Math.cos(a) * v];
}
function launch(b, angleDeg, power) { const v = puttVelocity(angleDeg, power); b.vx = v[0]; b.vz = v[1]; return b; }

/* one fixed step at hole time t. Returns null while the putt is live, else how it ended. */
function stepBall(h, b, t) {
  const dt = SIM_DT, g = G * h.g;
  if (b.air) {
    b.vy -= g * dt;
    b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
    if (b.y < WALL_TOP) collideAll(h, b, t);
    if (onFloor(h, b.x, b.z)) {
      const gh = groundH(h, b.x, b.z);
      if (b.y <= gh) { b.y = gh; b.vy = 0; b.air = false; b.vx *= LAND_KEEP; b.vz *= LAND_KEEP; b.hits.push(['land', 1]); }
    } else if (b.y < OOB_Y) return 'oob';
    return null;
  }
  const grad = groundGrad(h, b.x, b.z), sax = -ROLL * g * grad[0], saz = -ROLL * g * grad[1];
  let vx = b.vx + sax * dt, vz = b.vz + saz * dt;
  const s0 = Math.hypot(vx, vz), s1 = Math.max(0, s0 - surfMu(h, b.x, b.z) * g * dt);
  if (s0 > 0) { vx *= s1 / s0; vz *= s1 / s0; }
  b.vx = vx; b.vz = vz;
  b.x += vx * dt; b.z += vz * dt;
  collideAll(h, b, t);
  if (!onFloor(h, b.x, b.z)) { b.air = true; return null; }
  const gh = groundH(h, b.x, b.z);
  if (gh < b.y - DROP) { b.air = true; return null; }
  b.vy = (gh - b.y) / dt; b.y = gh;

  const s = Math.hypot(b.vx, b.vz), dx = b.x - h.cup[0], dz = b.z - h.cup[1], dc = Math.hypot(dx, dz);
  if (dc < CUP_R) {
    if (s < CAPTURE_V) return 'sunk';
    if (!b.inCup) {
      const a = (b.vx * dz - b.vz * dx) > 0 ? LIP_TURN : -LIP_TURN, c = Math.cos(a), sn = Math.sin(a);
      const nvx = (b.vx * c - b.vz * sn) * LIP_KEEP, nvz = (b.vx * sn + b.vz * c) * LIP_KEEP;
      b.vx = nvx; b.vz = nvz; b.hits.push(['lip', s]);
    }
    b.inCup = true;
  } else {
    b.inCup = false;
    if (dc < CUP_R + LIP_PULL_R && s < CAPTURE_V) { b.vx -= LIP_PULL * dt * dx / dc; b.vz -= LIP_PULL * dt * dz / dc; }
  }
  if (s < STOP_V && Math.hypot(sax, saz) < STATIC_MU * g) { b.vx = 0; b.vz = 0; return 'stop'; }
  return null;
}
function simulatePutt(h, from, angleDeg, power, t0 = 0) {
  const b = launch(newBall(h, from[0], from[1]), angleDeg, power);
  let t = t0, n = 0, end = null;
  while (!end) {
    end = stepBall(h, b, t);
    t += SIM_DT;
    if (!end && ++n * SIM_DT > MAX_SIM_T) end = 'timeout';
  }
  return { end, x: b.x, z: b.z, t, steps: n, hits: b.hits };
}
// #endregion sim
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- --only physics-check`
Expected: `13/13 passed`. If check 1 fails on its bounds, print `soft` and confirm the stop distance against `v^2 / (2 * mu * g)` (0.16 m from 0.5 m/s on felt); adjust the test bounds only if the formula and the sim agree.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint` (expect `0 finding(s)`; names used only by suites count as external).
```bash
git add index.html tests/physics-check.cjs
git commit -m "feat(T1.2): deterministic ball physics: walls, slopes, surfaces, cup, ramps, air

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 1.3: Obstacles: posts, bumpers, spinning arms, sliders

**Files:**
- Modify: `index.html` (sim region: add `moverState`, `moverTouch`; replace `collideAll`)
- Modify: `tests/physics-check.cjs` (append obstacle checks before `done()`)

**Interfaces:**
- Consumes: `hitSeg`, `hitCircle`, `closestOnSeg` from Task 1.2.
- Adds constants `POST_E = 0.6` (posts, unless a post sets `e`) and `MOVER_E = 0.8`.
- Produces:
  - Post: `{ x, z, r, e = POST_E, look? }`. `e > 1` is a bumper and logs `['bump', v]`; otherwise `['post', v]`.
  - Spinner: `{ kind: 'spin', x, z, len, w, phase, look? }`: a two-sided arm through pivot (x,z), half-length `len`, angle `phase + w*t` (dir = (sin, cos)).
  - Slider: `{ kind: 'slide', ax, az, bx, bz, r, period, phase, look? }`: a disc easing A to B and back.
  - `moverState(m, t)`: spin -> `{ th, ax, az, bx, bz }`; slide -> `{ x, z, vx, vz }`.
  - `moverTouch(h, b, t) -> bool`: a mover overlaps a resting ball.
  - Hits: `['mover', v]`.

- [ ] **Step 1: Append the failing obstacle checks** (before `done();` in `tests/physics-check.cjs`)

```js
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

let fast = 0;
for (let a = 0; a < 360; a += 5) { const b = S.launch(S.newBall(bumper, 0, 1.6), a, 1); let t = 0; for (let i = 0; i < 1200; i++) { if (S.stepBall(bumper, b, t)) break; t += S.SIM_DT; if (Math.hypot(b.vx, b.vz) > S.V_CAP + 1e-9) fast++; } }
check('bumpers never push the ball past V_CAP', fast === 0, 'over-cap steps: ' + fast);
```

- [ ] **Step 2: Run to verify the new checks fail**

Run: `npm test -- --only physics-check`
Expected: FAIL on `post blocks...` (posts are not collided yet) and `S.moverState is not a function`.

- [ ] **Step 3: Implement obstacles**

In the sim region, add `const POST_E = 0.6, MOVER_E = 0.8;` after the `WALL_TOP` line, then replace `collideAll` with:
```js
/* movers: a spinning two-sided arm, or a disc easing between two points */
function moverState(m, t) {
  if (m.kind === 'spin') {
    const th = m.phase + m.w * t, dx = Math.sin(th) * m.len, dz = Math.cos(th) * m.len;
    return { th, ax: m.x - dx, az: m.z - dz, bx: m.x + dx, bz: m.z + dz };
  }
  const k = 2 * Math.PI / m.period, u = k * t + m.phase, s = 0.5 - 0.5 * Math.cos(u), ds = 0.5 * Math.sin(u) * k;
  return { x: m.ax + (m.bx - m.ax) * s, z: m.az + (m.bz - m.az) * s, vx: (m.bx - m.ax) * ds, vz: (m.bz - m.az) * ds };
}
function moverTouch(h, b, t) {
  for (const m of h.movers) {
    const s = moverState(m, t);
    if (m.kind === 'spin') {
      const p = closestOnSeg(s.ax, s.az, s.bx, s.bz, b.x, b.z);
      if (Math.hypot(b.x - p[0], b.z - p[1]) < BALL_R + WALL_HALF) return true;
    } else if (Math.hypot(b.x - s.x, b.z - s.z) < m.r + BALL_R) return true;
  }
  return false;
}
function collideAll(h, b, t) {
  for (const s of h.segs) { const v = hitSeg(b, s[0], s[1], s[2], s[3], WALL_E); if (v) b.hits.push(['wall', v]); }
  for (const p of h.posts) {
    const e = p.e || POST_E, v = hitCircle(b, p.x, p.z, p.r, e);
    if (v) b.hits.push([e > 1 ? 'bump' : 'post', v]);
  }
  for (const m of h.movers) {
    const s = moverState(m, t);
    let v;
    if (m.kind === 'spin') {
      const p = closestOnSeg(s.ax, s.az, s.bx, s.bz, b.x, b.z), rx = p[0] - m.x, rz = p[1] - m.z;
      v = hitSeg(b, s.ax, s.az, s.bx, s.bz, MOVER_E, m.w * rz, -m.w * rx);   /* contact point velocity = w x r */
    } else v = hitCircle(b, s.x, s.z, m.r, MOVER_E, s.vx, s.vz);
    if (v) b.hits.push(['mover', v]);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --only physics-check`
Expected: `23/23 passed`.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/physics-check.cjs
git commit -m "feat(T1.3): posts, bumpers, spinning arms and sliders

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 1.4: Rounds, scoring, worlds registry, progress and save

**Files:**
- Modify: `index.html` (sim region: rounds, registry, progress; section 3: save)
- Test: `tests/round-check.cjs` (Node), `tests/save-check.cjs` (browser)

**Interfaces:**
- Consumes: `makeHole`, `SURF`.
- Produces:
  - `newRound(h) -> { hole, strokes: 0, at: [x,z], done: false, score: null, auto: false }`.
  - `capOf(h) -> par + 3`, `starsFor(score, par) -> 1|2|3`.
  - `resolvePutt(round, result, from) -> 'sunk'|'stop'|'oob'|'auto'` where `result = { end, x, z }`. OOB costs one extra stroke and returns the ball to `from`. Reaching the cap auto-sinks with score `capOf`.
  - `resolveDrift(round, result, from) -> 'sunk'|'stop'|'oob'`: a mover pushed a resting ball; no stroke counted.
  - `WORLD_ORDER = [1, 5, 8]`, `WORLDS = { [w]: { g, holes: [hole x9] } }`, `registerWorld(w, { g?, feltMu?, holes: [def] })`, `holeAt('w-n') -> hole|undefined`, `nextKey('w-n') -> 'w-(n+1)'|null`. Registered holes carry `key`.
  - `freshProgress() -> { v: 1, holes: {}, worlds: [1], sound: true }`, `recordHole(p, key, score, par) -> { best, stars }` (also unlocks the next world on hole 9), `holeUnlocked(p, key) -> bool`.
  - Section 3: `SAVE_KEY = 'puttx.v1'`, `let progress`, `loadProgress()`, `saveProgress()`.

- [ ] **Step 1: Write the failing round suite**

`tests/round-check.cjs`:
```js
/* round-check (Node): strokes, the par + 3 cap, out-of-bounds, drift, stars, the world registry
   and progress (bests and stars never get worse; hole 9 unlocks the next world). */
'use strict';
const { check, done } = require('./lib.cjs');
const S = require('./sim.cjs').loadSim();

const h = S.makeHole({ par: 2, tee: [0, 0.5], cup: [0, 3.5], shape: S.rect(-0.6, 0, 0.6, 4) });
const stop = (x = 0, z = 1) => ({ end: 'stop', x, z });

let r = S.newRound(h);
check('hole in one: score 1, done, 3 stars', S.resolvePutt(r, { end: 'sunk' }, [0, 0.5]) === 'sunk' && r.done && r.score === 1 && S.starsFor(1, 2) === 3);

r = S.newRound(h);
S.resolvePutt(r, stop(0, 2), [0, 0.5]);
check('a stop moves the ball and counts a stroke', r.strokes === 1 && r.at[1] === 2 && !r.done);
S.resolvePutt(r, { end: 'sunk' }, [0, 2]);
check('par: score 2, 2 stars', r.score === 2 && S.starsFor(2, 2) === 2);

r = S.newRound(h);
let out;
for (let i = 0; i < 5; i++) out = S.resolvePutt(r, stop(), [0, 0.5]);
check('cap: the par + 3 putt auto-sinks with score 5, 1 star', out === 'auto' && r.done && r.auto && r.score === 5 && S.capOf(h) === 5 && S.starsFor(5, 2) === 1);

r = S.newRound(h);
out = S.resolvePutt(r, { end: 'oob', x: 9, z: 9 }, [0.1, 0.7]);
check('oob: +1 penalty, ball back where it was putted', out === 'oob' && r.strokes === 2 && r.at[0] === 0.1 && r.at[1] === 0.7);

r = S.newRound(h); r.strokes = 4;
out = S.resolvePutt(r, { end: 'oob', x: 9, z: 9 }, [0, 0.5]);
check('oob at the cap still scores the cap, never more', out === 'auto' && r.score === 5);

r = S.newRound(h);
check('timeout counts as a stop', S.resolvePutt(r, { end: 'timeout', x: 0.2, z: 1.1 }, [0, 0.5]) === 'stop' && r.at[0] === 0.2);

r = S.newRound(h); r.strokes = 1;
out = S.resolveDrift(r, { end: 'stop', x: 0.3, z: 1.5 }, [0, 1]);
check('drift moves the ball without a stroke', out === 'stop' && r.strokes === 1 && r.at[1] === 1.5);
out = S.resolveDrift(r, { end: 'oob', x: 9, z: 9 }, [0, 1]);
check('drift off the edge returns the ball free of charge', out === 'oob' && r.strokes === 1 && r.at[1] === 1);

S.registerWorld(99, { g: 0.5, feltMu: 0.2, holes: [{ par: 3, tee: [0, 0.5], cup: [0, 3.5], shape: S.rect(-0.6, 0, 0.6, 4) }] });
const hh = S.holeAt('99-1');
check('registerWorld keys holes and applies world gravity and felt', hh && hh.key === '99-1' && hh.g === 0.5 && hh.feltMu === 0.2 && hh.par === 3);
check('holeAt misses cleanly', S.holeAt('99-2') === undefined && S.holeAt('42-1') === undefined);
check('nextKey walks 1..9 then stops', S.nextKey('1-1') === '1-2' && S.nextKey('5-9') === null);

const p = S.freshProgress();
check('fresh progress: world 1 open, sound on', p.worlds.join() === '1' && p.sound === true && S.holeUnlocked(p, '1-1') && !S.holeUnlocked(p, '1-2'));
S.recordHole(p, '1-1', 3, 2);
let rec = S.recordHole(p, '1-1', 5, 2);
check('best and stars never get worse', rec.best === 3 && rec.stars === 1);
rec = S.recordHole(p, '1-1', 1, 2);
check('a better score improves both', rec.best === 1 && rec.stars === 3 && S.holeUnlocked(p, '1-2'));
S.recordHole(p, '1-9', 4, 3);
check('finishing hole 9 opens the next world in order', p.worlds.join() === '1,5' && S.holeUnlocked(p, '5-1'));
check('world order is construction, snow, space', S.WORLD_ORDER.join() === '1,5,8');

done();
```

- [ ] **Step 2: Write the failing save suite**

`tests/save-check.cjs`:
```js
/* save-check (browser): progress persists under puttx.v1; corrupt, foreign or wrongly shaped
   data falls back to a fresh save without a console error. */
'use strict';
const { check, done, open, URL } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  const reload = async () => { await page.goto(URL); await page.waitForFunction(() => window.booted === true); };

  await page.evaluate(() => { localStorage.clear(); progress = freshProgress(); recordHole(progress, '1-1', 2, 2); saveProgress(); });
  await reload();
  const kept = await page.evaluate(() => progress.holes['1-1']);
  check('progress survives a reload', kept && kept.best === 2 && kept.stars === 2, JSON.stringify(kept));

  for (const [name, raw] of [['not json', '{oops'], ['wrong version', '{"v":7,"holes":{},"worlds":[1]}'], ['no worlds', '{"v":1,"holes":{}}'],
    ['bad hole entries', '{"v":1,"holes":{"1-1":{"best":"x","stars":9},"zz":3},"worlds":[1]}'], ['foreign worlds', '{"v":1,"holes":{},"worlds":[42,"a"]}']]) {
    await page.evaluate(r => localStorage.setItem('puttx.v1', r), raw);
    await reload();
    const p = await page.evaluate(() => ({ worlds: progress.worlds.join(), holes: Object.keys(progress.holes).length, sound: progress.sound }));
    check('corrupt save (' + name + ') loads as fresh', p.worlds === '1' && p.holes === 0 && p.sound === true, JSON.stringify(p));
  }
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Run both to verify they fail**

Run: `npm test -- --only round-check,save-check`
Expected: FAIL (`S.newRound is not a function`; `freshProgress is not defined`).

- [ ] **Step 4: Implement rounds, registry and progress** (append inside the sim region, before `// #endregion sim`)

```js
/* ---- 2e. rounds and scoring ---- */
const capOf = h => h.par + 3;
const starsFor = (score, par) => score < par ? 3 : score === par ? 2 : 1;
function newRound(h) { return { hole: h, strokes: 0, at: h.tee.slice(), done: false, score: null, auto: false }; }
/* a putt finished: count it, move the ball, and finish the hole at the cup or the cap */
function resolvePutt(round, result, from) {
  round.strokes++;
  if (result.end === 'sunk') { round.done = true; round.score = round.strokes; round.at = round.hole.cup.slice(); return 'sunk'; }
  if (result.end === 'oob') { round.strokes++; round.at = from.slice(); } else round.at = [result.x, result.z];
  if (round.strokes >= capOf(round.hole)) { round.done = true; round.auto = true; round.score = capOf(round.hole); return 'auto'; }
  return result.end === 'oob' ? 'oob' : 'stop';
}
/* a mover pushed a resting ball: never the kid's fault, so no stroke and no penalty */
function resolveDrift(round, result, from) {
  if (result.end === 'sunk') { round.done = true; round.score = Math.max(1, round.strokes); round.at = round.hole.cup.slice(); return 'sunk'; }
  round.at = result.end === 'oob' ? from.slice() : [result.x, result.z];
  return result.end === 'oob' ? 'oob' : 'stop';
}

/* ---- 2f. worlds ---- */
const WORLD_ORDER = [1, 5, 8];     /* vroom's construction day, snow, space */
const WORLDS = {};
function registerWorld(w, def) {
  const g = def.g || 1, feltMu = def.feltMu || SURF.felt.mu;
  WORLDS[w] = { g, holes: def.holes.map((d, i) => Object.assign(makeHole(Object.assign({ g, feltMu }, d)), { key: w + '-' + (i + 1) })) };
}
function holeAt(key) {
  const [w, n] = String(key).split('-').map(Number);
  return WORLDS[w] ? WORLDS[w].holes[n - 1] : undefined;
}
function nextKey(key) { const [w, n] = key.split('-').map(Number); return n < 9 ? w + '-' + (n + 1) : null; }

/* ---- 2g. progress (pure; section 3 stores it) ---- */
function freshProgress() { return { v: 1, holes: {}, worlds: [WORLD_ORDER[0]], sound: true }; }
function recordHole(p, key, score, par) {
  const prev = p.holes[key];
  const rec = { best: prev ? Math.min(prev.best, score) : score, stars: Math.max(prev ? prev.stars : 0, starsFor(score, par)) };
  p.holes[key] = rec;
  const [w, n] = key.split('-').map(Number), i = WORLD_ORDER.indexOf(w);
  if (n === 9 && i >= 0 && i + 1 < WORLD_ORDER.length && !p.worlds.includes(WORLD_ORDER[i + 1])) p.worlds.push(WORLD_ORDER[i + 1]);
  return rec;
}
function holeUnlocked(p, key) {
  const [w, n] = key.split('-').map(Number);
  return p.worlds.includes(w) && (n === 1 || !!p.holes[w + '-' + (n - 1)]);
}
```

After `// #endregion sim`, add section 3:
```js
/* ============ 3. SAVE ============ */
const SAVE_KEY = 'puttx.v1';
let progress = freshProgress();
function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!p || p.v !== 1 || typeof p.holes !== 'object' || !Array.isArray(p.worlds)) return freshProgress();
    const worlds = p.worlds.filter(w => WORLD_ORDER.includes(w));
    if (!worlds.includes(WORLD_ORDER[0])) return freshProgress();
    const holes = {};
    for (const [k, r] of Object.entries(p.holes)) {
      if (/^\d+-[1-9]$/.test(k) && r && Number.isInteger(r.best) && r.best >= 1 && [1, 2, 3].includes(r.stars)) holes[k] = { best: r.best, stars: r.stars };
    }
    if (Object.keys(holes).length !== Object.keys(p.holes).length) return freshProgress();
    return { v: 1, holes, worlds, sound: p.sound !== false };
  } catch (e) { return freshProgress(); }
}
function saveProgress() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) {} }
```

In `boot()`, add as the first line: `progress = loadProgress();`

- [ ] **Step 5: Run to verify they pass**

Run: `npm test -- --only round-check,save-check && npm run lint`
Expected: `round-check 17/17`, `save-check 7/7`, lint `0 finding(s)`.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/round-check.cjs tests/save-check.cjs
git commit -m "feat(T1.4): rounds, par+3 cap, worlds registry, progress and save

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 2: Construction day, playable end to end

### Task 2.1: Hole bot and construction day's 9 holes

**Files:**
- Create: `scripts/solve.cjs`
- Modify: `index.html` (sim region: world 1 pack, at the anchor `/* ---- 2h. world packs ---- */`)
- Test: `tests/holes-check.cjs`

**Interfaces:**
- Consumes: `registerWorld`, `rect`, `simulatePutt`, `onFloor`, `closestOnSeg`, `moverState`, `WORLDS`, `WORLD_ORDER`, `BALL_R`, `WALL_HALF`.
- Produces: `WORLDS[1]` with 9 holes, each carrying `sol: [[angleDeg, power, t0], ...]` proven by the bot. `scripts/solve.cjs` CLI: `--world N`, `--hole w-n`; exit 1 if any hole cannot make par.

- [ ] **Step 1: Write the failing hole suite**

`tests/holes-check.cjs`:
```js
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

const worlds = S.WORLD_ORDER.filter(w => S.WORLDS[w]);
if (STRICT) check('all three worlds are registered', worlds.length === 3, worlds.join());
for (const w of worlds) {
  const holes = S.WORLDS[w].holes;
  check(`world ${w}: 9 holes`, holes.length === 9);
  for (const h of holes) {
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --only holes-check`
Expected: FAIL `at least one world registered`.

- [ ] **Step 3: Write the hole bot**

`scripts/solve.cjs`:
```js
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
```

- [ ] **Step 4: Author construction day** (inside the sim region, just before `// #endregion sim`)

```js
/* ---- 2h. world packs ---- */
/* world 1, construction day: straight shots, walls, bank shots, slopes, a crane arm.
   Each hole's `sol` is printed by `npm run solve -- --world 1`; holes-check replays it. */
registerWorld(1, { holes: [
  { par: 2, tee: [0, 0.5], cup: [0, 3.5], shape: rect(-0.6, 0, 0.6, 4) },
  { par: 2, tee: [0, 0.5], cup: [2.2, 3.0], shape: [[-0.6, 0], [0.6, 0], [0.6, 2.4], [2.8, 2.4], [2.8, 3.6], [-0.6, 3.6]] },
  { par: 2, tee: [0, 0.5], cup: [0, 4.4], shape: rect(-0.8, 0, 0.8, 5), zones: [{ surf: 'sand', poly: rect(-0.8, 2, 0.3, 3) }] },
  { par: 3, tee: [0, 0.5], cup: [0, 4.5], shape: rect(-1, 0, 1, 5), inner: [[[-1, 2.5], [0.55, 2.5]], [[-0.55, 3.6], [1, 3.6]]] },
  { par: 2, tee: [0, 0.5], cup: [0, 4], shape: rect(-0.8, 0, 0.8, 4.5), bumps: [{ x: 0.25, z: 2.2, r: 0.6, h: 0.12 }] },
  { par: 3, tee: [-0.8, 0.5], cup: [0.8, 0.5], shape: rect(-1.6, 0, 1.6, 3), inner: [[[0, 0], [0, 2]]] },
  { par: 3, tee: [0, 0.5], cup: [0, 3.2], shape: rect(-1, 0, 1, 4.5), bumps: [{ x: 0, z: 3.2, r: 0.6, h: 0.14 }] },
  { par: 2, tee: [0, 0.5], cup: [0, 4.5], shape: rect(-0.9, 0, 0.9, 5), movers: [{ kind: 'spin', x: 0, z: 2.5, len: 0.7, w: 1.4, phase: 0, look: 'crane' }] },
  { par: 3, tee: [0, 0.5], cup: [1.7, 5.8], shape: [[-1, 0], [1, 0], [1, 3.2], [2.4, 3.2], [2.4, 6.4], [-1, 6.4]],
    bumps: [{ x: 0, z: 1.8, r: 0.5, h: 0.1 }], zones: [{ surf: 'sand', poly: rect(1.2, 3.2, 2.4, 4.2) }],
    movers: [{ kind: 'spin', x: 0.7, z: 4.8, len: 0.6, w: -1.2, phase: 0.8, look: 'crane' }] },
] });
```

- [ ] **Step 5: Run the bot and paste solutions**

Run: `npm run solve -- --world 1`
Expected: nine lines ending `ok`, each followed by a `sol: [...]` line. Paste each `sol: [...]` as a property on its hole object in order. If a hole prints `MISSES PAR`, make the hole fairer, not the par looser: widen the narrowest gap by 0.1, or lower a bump's `h` by 0.02, then rerun `npm run solve -- --hole 1-N`. Raise par only if the hole still fails after two geometry passes, and write the reason in the commit body.

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- --only holes-check,physics-check,round-check`
Expected: `holes-check 29/29` (1 world check + 9 x 3 + the registered check), the other two unchanged.

- [ ] **Step 7: Commit**

```bash
git add index.html scripts/solve.cjs tests/holes-check.cjs
git commit -m "feat(T2.1): hole bot and construction day's 9 proven holes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2.2: Renderer: lit 3D holes, camera, construction look

**Files:**
- Modify: `index.html` (section 5 render, section 6 `play` state + loop skeleton, boot)
- Test: `tests/render-check.cjs`

**Interfaces:**
- Consumes: hole objects, `groundH`, `onFloor`, `inPoly`, `moverState`, `CUP_R`, `BALL_R`, `WALL_TOP`, `WALL_HALF`, `holeAt`, `newBall`, `newRound`, `stageScale`.
- Produces:
  - `WORLD_LOOK[w]` look packs: `{ felt, wall, ground|null, sky:[top,bottom], fog, sand, ice, flag, jingle:[hz], icon:svg, prop(rng)->Object3D, post(p)->Object3D, mover(m)->Object3D, decor(group,h)?, tick(group,dt,t)? }`; `lookOf(w)` merges with `DEFAULT_LOOK`.
  - `initRenderer()`, `resizeRenderer()`, `buildHoleScene(h)`, `disposeGroup(g)`, `updateMovers(t)`, `syncBall(dt)`, `cameraGoal()`, `snapCamera()`, `updateCamera(dt)`, `renderFrame(dt)`, `stepFrame(now) -> dt`, `frame(now)`.
  - Globals `renderer`, `scene`, `camera`, `holeGroup`, `ballMesh`, `flagGroup`, `moverMeshes`, `loopPaused` (let, false), `lastNow`.
  - `play = { key, hole, round, ball, phase: 'idle'|'title'|'aim'|'roll'|'drift'|'auto'|'sunk'|'done', time, from, t0, drag, cam: { yaw, dist }, fx: {} }`.
  - `startHole(key) -> bool` (this task: builds the scene, tee ball, phase `'aim'`, shows the hole scene, snaps the camera).

- [ ] **Step 1: Write the failing render suite**

`tests/render-check.cjs`:
```js
/* render-check (browser): a hole renders as a lit 3D scene (floor with interior vertices, one
   wall box per segment, a cup), the frame is not blank, the ball mesh sits on the physics ball,
   the aim camera frames ball and cup, movers follow hole time, and rebuilding holes leaks no
   GPU geometry or textures. */
'use strict';
const { check, done, open } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  await page.evaluate(() => { loopPaused = true; startHole('1-1'); renderFrame(0); });

  const g = await page.evaluate(() => {
    const floor = holeGroup.getObjectByName('floor'), walls = holeGroup.getObjectByName('walls');
    return { tris: floor.geometry.index.count / 3, walls: walls.children.filter(c => c.geometry.type === 'BoxGeometry').length,
      segs: play.hole.segs.length, cup: !!holeGroup.getObjectByName('cup'), shadows: renderer.shadowMap.enabled,
      lights: scene.children.filter(c => c.isDirectionalLight && c.castShadow).length, pr: renderer.getPixelRatio() };
  });
  check('floor mesh is a real grid (> 1000 triangles)', g.tris > 1000, JSON.stringify(g));
  check('one wall box per wall segment, plus a cup', g.walls === g.segs && g.cup, JSON.stringify(g));
  check('soft shadows from exactly one sun; pixel ratio <= 2', g.shadows && g.lights === 1 && g.pr <= 2, JSON.stringify(g));

  const px = await page.evaluate(() => {
    const rt = new THREE.WebGLRenderTarget(120, 70), buf = new Uint8Array(120 * 70 * 4);
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.readRenderTargetPixels(rt, 0, 0, 120, 70, buf); renderer.setRenderTarget(null);
    const set = new Set(); for (let i = 0; i < buf.length; i += 16) set.add((buf[i] >> 3) + ',' + (buf[i + 1] >> 3) + ',' + (buf[i + 2] >> 3));
    rt.dispose(); return set.size;
  });
  check('the frame is not blank (> 40 distinct colours)', px > 40, 'colours: ' + px);

  const b = await page.evaluate(() => ({ m: ballMesh.position.toArray(), x: play.ball.x, y: play.ball.y + BALL_R, z: play.ball.z }));
  check('ball mesh sits on the physics ball', Math.abs(b.m[0] - b.x) < 1e-6 && Math.abs(b.m[1] - b.y) < 1e-6 && Math.abs(b.m[2] - b.z) < 1e-6, JSON.stringify(b));

  for (const key of ['1-1', '1-9']) {
    const f = await page.evaluate(k => {
      startHole(k); snapCamera(); camera.updateMatrixWorld();
      const p = v => v.project(camera), h = play.hole;
      const ball = p(new THREE.Vector3(h.tee[0], groundH(h, ...h.tee), h.tee[1])), cup = p(new THREE.Vector3(h.cup[0], groundH(h, ...h.cup), h.cup[1]));
      return [ball.x, ball.y, cup.x, cup.y].map(v => +v.toFixed(2));
    }, key);
    check(`aim camera frames ball and cup on ${key}`, f.every(v => Math.abs(v) < 0.95), JSON.stringify(f));
  }

  const rot = await page.evaluate(() => { startHole('1-8'); updateMovers(0); const a = moverMeshes[0].rotation.y; updateMovers(1); return [a, moverMeshes[0].rotation.y]; });
  check('crane arm turns with hole time', Math.abs(rot[0] - rot[1]) > 0.5, JSON.stringify(rot));

  const mem = await page.evaluate(() => {
    const snap = () => { renderFrame(0); return renderer.info.memory.geometries + '/' + renderer.info.memory.textures; };
    startHole('1-1'); const a = snap(); startHole('1-9'); snap(); startHole('1-4'); snap(); startHole('1-1'); return [a, snap()];
  });
  check('rebuilding holes leaks no geometry or textures', mem[0] === mem[1], JSON.stringify(mem));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --only render-check`
Expected: FAIL `startHole is not defined`.

- [ ] **Step 3: Implement the renderer** (new section after section 3 SAVE; section 4 AUDIO comes in Task 2.3)

```js
/* ============ 5. RENDER ============ */
/* World looks register into WORLD_LOOK[w]; anything a pack leaves out falls back to DEFAULT_LOOK. */
const WORLD_LOOK = {};
const DEFAULT_LOOK = { felt: '#74c465', wall: '#ffd66e', ground: '#c9a476', sky: ['#9fd8ef', '#fff1d6'], fog: true,
  sand: '#d9b77a', ice: '#bfe6f5', flag: '#ef7d6d', jingle: [523, 659, 784, 1047], icon: '' };
const lookOf = w => Object.assign({}, DEFAULT_LOOK, WORLD_LOOK[w]);
let renderer = null, scene, camera, sun, holeGroup = null, ballMesh, flagGroup, moverMeshes = [];
const camNow = { pos: null, look: null };
const play = { key: null, hole: null, round: null, ball: null, phase: 'idle', time: 0, from: null, t0: 0, drag: null, cam: { yaw: 0, dist: 3 }, fx: {} };

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1200 / 700, 0.05, 120);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a7360, 1.4));
  sun = new THREE.DirectionalLight(0xffe2b8, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 24), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.32 }));
  ballMesh.castShadow = true;
  scene.add(ballMesh);
  resizeRenderer();
}
function resizeRenderer() {
  if (!renderer) return;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio * stageScale));
  renderer.setSize(1200, 700, false);
}
const mat = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o));
/* seeded so props and textures look the same every visit */
function rng32(seed) { let s = seed >>> 0 || 1; return () => (s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x6d2b79f5 >>> 0) / 4294967296; }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function feltTexture(hex) {
  const t = canvasTex(128, 128, x => {
    const r = rng32(7); x.fillStyle = hex; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2600; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'; x.fillRect(r() * 128, r() * 128, 1.5, 1.5); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
/* white toy ball with a yellow band and a red star, so the roll reads */
function ballTexture() {
  return canvasTex(256, 128, x => {
    x.fillStyle = '#fffdf7'; x.fillRect(0, 0, 256, 128);
    x.fillStyle = '#ffd66e'; x.fillRect(0, 54, 256, 20);
    x.fillStyle = '#ef7d6d'; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 9 : 20; x.lineTo(64 + Math.cos(a) * r, 30 + Math.sin(a) * r); }
    x.fill();
  });
}
function skyTexture(top, bottom) {
  return canvasTex(2, 256, x => { const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(1, bottom); x.fillStyle = g; x.fillRect(0, 0, 2, 256); });
}
/* a grid over the hole's bounding box keeping cells whose centre passes `keep`; vertex heights
   follow groundH so bumps, bowls and ramps are real geometry */
function gridGeometry(h, keep, lift = 0, C = 0.05) {
  const pts = h.floors.flat(), xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const x0 = Math.min(...xs), z0 = Math.min(...zs);
  const nx = Math.ceil((Math.max(...xs) - x0) / C), nz = Math.ceil((Math.max(...zs) - z0) / C);
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * C, z = z0 + j * C;
    pos.push(x, groundH(h, x, z) + lift, z); uv.push(x * 1.5, z * 1.5);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (!keep(x0 + (i + 0.5) * C, z0 + (j + 0.5) * C)) continue;
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function wallGroup(h, m) {
  const g = new THREE.Group(); g.name = 'walls';
  for (const [ax, az, bx, bz] of h.segs) {
    const len = Math.hypot(bx - ax, bz - az), top = WALL_TOP + Math.max(groundH(h, ax, az), groundH(h, bx, bz));
    const w = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, top, len), m);
    w.position.set((ax + bx) / 2, top / 2, (az + bz) / 2);
    w.rotation.y = Math.atan2(bx - ax, bz - az);
    w.castShadow = w.receiveShadow = true;
    g.add(w);
  }
  for (const wl of h.walls) for (const [x, z] of wl) {
    const top = WALL_TOP + groundH(h, x, z), c = new THREE.Mesh(new THREE.CylinderGeometry(WALL_HALF, WALL_HALF, top + 0.01, 16), m);
    c.position.set(x, top / 2, z); c.castShadow = true; g.add(c);
  }
  return g;
}
function cupGroup(h, look) {
  const g = new THREE.Group(), y = groundH(h, h.cup[0], h.cup[1]);
  g.name = 'cup'; g.position.set(h.cup[0], y, h.cup[1]);
  const dark = mat('#3a2c1e', { roughness: 1, side: THREE.BackSide });
  const liner = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R, CUP_R, 0.12, 32, 1, true), dark); liner.position.y = -0.06;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(CUP_R, 32), mat('#2a1f15', { roughness: 1 })); bottom.rotation.x = -Math.PI / 2; bottom.position.y = -0.12;
  const rim = new THREE.Mesh(new THREE.RingGeometry(CUP_R - 0.004, CUP_R + 0.04, 48), mat('#ffffff', { roughness: 0.5 })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.004;
  flagGroup = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 8), mat('#fffdf7', { roughness: 0.4 })); pole.position.y = 0.35; pole.castShadow = true;
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.22, -0.07); shape.lineTo(0, -0.14);
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(look.flag, { side: THREE.DoubleSide, roughness: 0.7 })); flag.position.set(0.008, 0.69, 0); flag.castShadow = true;
  flagGroup.add(pole, flag);
  g.add(liner, bottom, rim, flagGroup);
  return g;
}
function defaultPost(p, look) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 1.08, 0.22, 24), mat(look.wall, { roughness: 0.5 }));
  m.position.y = 0.11; m.castShadow = true;
  const g = new THREE.Group(); g.add(m); return g;
}
function defaultMover(m, look) {
  const g = new THREE.Group();
  if (m.kind === 'spin') {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.1, m.len * 2), mat(look.wall, { roughness: 0.5 })); arm.position.y = 0.09;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.24, 20), mat('#ef7d6d', { roughness: 0.5 })); hub.position.y = 0.12;
    arm.castShadow = hub.castShadow = true; g.add(arm, hub);
  } else {
    const s = new THREE.Mesh(new THREE.SphereGeometry(m.r, 24, 16), mat('#fffdf7', { roughness: 0.6 })); s.castShadow = true; g.add(s);
  }
  return g;
}
function scatterProps(group, h, look) {
  const pts = h.floors.flat(), xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const x0 = Math.min(...xs) - 3, x1 = Math.max(...xs) + 3, z0 = Math.min(...zs) - 3, z1 = Math.max(...zs) + 3;
  const r = rng32([...h.key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  for (let n = 0, tries = 0; n < 26 && tries < 400; tries++) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    if (h.floors.some(f => inPoly(f, x, z)) || h.segs.some(s => { const p = closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - p[0], z - p[1]) < 0.5; })) continue;
    const o = look.prop(r); o.position.set(x, 0, z); o.rotation.y = r() * Math.PI * 2; group.add(o); n++;
  }
}
function disposeGroup(g) {
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const ms = o.material ? [].concat(o.material) : [];
    for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
  });
}
const holeWorld = h => Number(h.key.split('-')[0]);
function buildHoleScene(h) {
  if (holeGroup) { scene.remove(holeGroup); disposeGroup(holeGroup); }
  if (scene.background && scene.background.dispose) scene.background.dispose();
  const look = lookOf(holeWorld(h)), off = (x, z) => Math.hypot(x - h.cup[0], z - h.cup[1]) >= CUP_R;
  holeGroup = new THREE.Group(); moverMeshes = [];
  const floor = new THREE.Mesh(gridGeometry(h, (x, z) => onFloor(h, x, z) && off(x, z)), mat('#ffffff', { map: feltTexture(look.felt), roughness: 0.95 }));
  floor.name = 'floor'; floor.receiveShadow = true; holeGroup.add(floor);
  for (const zn of h.zones) {
    const m = zn.surf === 'ice' ? mat(look.ice, { roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.88 }) : mat(look.sand, { roughness: 1 });
    const z = new THREE.Mesh(gridGeometry(h, (x, zz) => inPoly(zn.poly, x, zz) && onFloor(h, x, zz) && off(x, zz), 0.004), m);
    z.receiveShadow = true; holeGroup.add(z);
  }
  holeGroup.add(wallGroup(h, mat(look.wall, { roughness: 0.55 })), cupGroup(h, look));
  for (const p of h.posts) { const o = (look.post || defaultPost)(p, look); o.position.set(p.x, groundH(h, p.x, p.z), p.z); holeGroup.add(o); }
  for (const mv of h.movers) { const o = (look.mover || defaultMover)(mv, look); o.userData.mover = mv; moverMeshes.push(o); holeGroup.add(o); }
  if (look.ground) {
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat(look.ground, { roughness: 1 }));
    gr.rotation.x = -Math.PI / 2; gr.position.y = -0.03; gr.receiveShadow = true; holeGroup.add(gr);
  }
  if (look.prop) scatterProps(holeGroup, h, look);
  if (look.decor) look.decor(holeGroup, h);
  scene.background = skyTexture(look.sky[0], look.sky[1]);
  scene.fog = look.fog ? new THREE.Fog(look.sky[1], 14, 45) : null;
  const pts = h.floors.flat(), xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2 + 1.5;
  sun.position.set(cx + 3, 7, cz - 2.5); sun.target.position.set(cx, 0, cz);
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 0.5, far: 20 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(holeGroup);
  updateMovers(play.time);
}
function updateMovers(t) {
  for (const o of moverMeshes) {
    const m = o.userData.mover, s = moverState(m, t);
    if (m.kind === 'spin') { o.position.set(m.x, groundH(play.hole, m.x, m.z), m.z); o.rotation.y = s.th; }
    else { o.position.set(s.x, groundH(play.hole, s.x, s.z) + m.r, s.z); o.rotation.y = t * 0.8; }
  }
}
const _axis = new THREE.Vector3(), _q = new THREE.Quaternion();
function syncBall(dt) {
  const b = play.ball, p = ballMesh.position, dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
  if (d > 1e-6 && d < 0.5) { _axis.set(dz / d, 0, -dx / d); _q.setFromAxisAngle(_axis, d / BALL_R); ballMesh.quaternion.premultiply(_q); }
  p.set(b.x, b.y + BALL_R, b.z);
}
/* aiming: a 3/4 view from behind the ball toward the cup, framing both. Rolling: follow the ball. */
function cameraGoal() {
  const h = play.hole, b = play.ball;
  let look;
  if (play.phase === 'aim' || play.phase === 'idle') {
    const dx = h.cup[0] - b.x, dz = h.cup[1] - b.z, d = Math.hypot(dx, dz);
    if (d > 0.05) play.cam.yaw = Math.atan2(dx, dz);
    play.cam.dist = Math.min(4.2, Math.max(1.6, 1.3 + d * 0.55));
    look = new THREE.Vector3(b.x + dx * 0.35, b.y, b.z + dz * 0.35);
  } else look = new THREE.Vector3(b.x, b.y, b.z);
  const { yaw, dist } = play.cam;
  return { pos: new THREE.Vector3(look.x - Math.sin(yaw) * dist, look.y + dist * 0.8, look.z - Math.cos(yaw) * dist), look };
}
function applyCamera() { camera.position.copy(camNow.pos); camera.lookAt(camNow.look); }
function snapCamera() { const g = cameraGoal(); camNow.pos = g.pos; camNow.look = g.look; applyCamera(); }
function updateCamera(dt) {
  const g = cameraGoal(), k = 1 - Math.exp(-4 * dt);
  camNow.pos.lerp(g.pos, k); camNow.look.lerp(g.look, k); applyCamera();
}
function renderFrame(dt) {
  if (!play.hole || currentScene === 'map') return;
  updateMovers(play.time);
  syncBall(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
}
```

Then section 6 starts (Task 2.4 grows it):
```js
/* ============ 6. PLAY ============ */
let loopPaused = false, lastNow = 0;
function startHole(key) {
  const h = holeAt(key);
  if (!h) return false;
  Object.assign(play, { key, hole: h, round: newRound(h), ball: newBall(h, h.tee[0], h.tee[1]), phase: 'aim', time: 0, from: null, t0: 0, drag: null, fx: {} });
  buildHoleScene(h);
  syncBall(0);
  showScene('hole');
  snapCamera();
  return true;
}
/* one animation frame: dt is clamped so a backgrounded tab never jumps */
function stepFrame(now) {
  const dt = lastNow ? Math.min(0.1, Math.max(0, (now - lastNow) / 1000)) : 0;
  lastNow = now;
  renderFrame(dt);
  return dt;
}
function frame(now) { stepFrame(now); requestAnimationFrame(frame); }
```

Construction look, at a new anchor `/* ---- 5b. world looks ---- */` after `renderFrame`:
```js
/* ---- 5b. world looks ---- */
const CONE_SVG = '<svg viewBox="0 0 64 64"><path d="M32 6 L48 54 H16 Z" fill="#ef7d6d"/><path d="M26 24 H38 L41 33 H23 Z M21 40 H43 L45 46 H19 Z" fill="#fff8ec"/><rect x="10" y="52" width="44" height="7" rx="3" fill="#c95a4c"/></svg>';
function trafficCone() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 20), mat('#ef7d6d', { roughness: 0.5 })); c.position.y = 0.15;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.04, 20), mat('#fff8ec', { roughness: 0.5 })); band.position.y = 0.15;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.2), mat('#c95a4c')); base.position.y = 0.012;
  c.castShadow = base.castShadow = true; g.add(c, band, base); return g;
}
function girderStack(r) {
  const g = new THREE.Group(), n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), mat('#ef7d6d', { roughness: 0.6 })); b.position.set(0, 0.04 + i * 0.08, (i % 2) * 0.05); b.castShadow = true; g.add(b); }
  return g;
}
WORLD_LOOK[1] = {
  felt: '#74c465', wall: '#ffd66e', ground: '#c9a476', sky: ['#9fd8ef', '#fff1d6'], flag: '#ef7d6d', icon: CONE_SVG,
  jingle: [523, 659, 784, 659, 1047],
  prop: r => r() < 0.6 ? trafficCone() : girderStack(r),
};
```

In `boot()`, after `fit();` add `initRenderer();`, after `addEventListener('resize', fit);` change the handler to `addEventListener('resize', () => { fit(); resizeRenderer(); });`, and before `window.booted = true;` add `requestAnimationFrame(frame);`.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --only render-check,boot-check && npm run lint`
Expected: `render-check 10/10`, `boot-check 7/7`, lint `0 finding(s)`. If the "not blank" check fails under SwiftShader, confirm `initRenderer` ran (no console error) before touching thresholds.

- [ ] **Step 5: Look at it**

Run: `python3 -m http.server 4173` and open `http://localhost:4173/?hole=1-9` after Task 2.4 adds the query; for now run in the console `startHole('1-9')`. Expected: lit felt, yellow walls with round caps, a cup with a white rim and a red flag, cones and girders around, soft shadows. Take a screenshot into `tests/shots/` for the commit body notes.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/render-check.cjs
git commit -m "feat(T2.2): three.js hole renderer, aim camera, construction look

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2.3: Synthesized audio

**Files:**
- Modify: `index.html` (section 4 audio, between SAVE and RENDER)
- Test: `tests/audio-check.cjs`

**Interfaces:**
- Consumes: `progress.sound`, `WORLD_LOOK[w].jingle` via `lookOf`.
- Produces: `audio() -> AudioContext|null`, `setSound(on)`, `sfx(name, ...args)`, `sfxLog` (array of names, last 200), `SFX` table with `putt(power)`, `clonk(v)`, `boing(v)`, `cup()`, `lip()`, `land()`, `boink()`, `tap()`, `star(i)`, `jingle(w)`, `fanfare()`; `setRoll(speed)` for the rolling hiss.

- [ ] **Step 1: Write the failing audio suite**

`tests/audio-check.cjs`:
```js
/* audio-check (browser): the audio graph is created on the first touch (iOS rule), every sound
   in the SFX table plays without throwing, sfx() logs names for the other suites, quiet mode
   zeroes the master gain and persists, and nothing throws before the first touch. */
'use strict';
const { check, done, open, fresh } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  await fresh(page);
  const before = await page.evaluate(() => { let threw = false; try { sfx('tap'); } catch (e) { threw = true; } return { threw, ctx: actx !== null, log: sfxLog.slice(-1)[0] }; });
  check('sfx before the first touch is silent, logged and safe', !before.threw && !before.ctx && before.log === 'tap', JSON.stringify(before));

  await page.mouse.click(600, 350);
  const ctx = await page.evaluate(() => actx && actx.state);
  check('first touch creates the audio context', ctx === 'running' || ctx === 'suspended', String(ctx));

  const all = await page.evaluate(() => { const bad = []; for (const k of Object.keys(SFX)) { try { sfx(k, 0.5); } catch (e) { bad.push(k + ': ' + e.message); } } try { setRoll(2); setRoll(0); } catch (e) { bad.push('roll: ' + e.message); } return { bad, n: Object.keys(SFX).length }; });
  check('every SFX plays without throwing (11 sounds + roll)', all.bad.length === 0 && all.n === 11, JSON.stringify(all));

  const q = await page.evaluate(() => { setSound(false); return { g: master.gain.value, saved: JSON.parse(localStorage.getItem('puttx.v1')).sound }; });
  check('quiet mode zeroes the master gain and saves', q.g === 0 && q.saved === false, JSON.stringify(q));
  await page.evaluate(() => setSound(true));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --only audio-check`
Expected: FAIL `sfx is not defined`.

- [ ] **Step 3: Implement audio** (section 4, after section 3 SAVE)

```js
/* ============ 4. AUDIO ============ */
/* Every sound is synthesized: oscillators and filtered noise through one master gain and a
   compressor. The context is created on the first touch, as iOS requires. */
let actx = null, master = null, noiseBuf = null, rollGain = null;
const sfxLog = [];
function audio() {
  if (actx) return actx;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  const comp = actx.createDynamicsCompressor();
  master = actx.createGain(); master.gain.value = progress.sound ? 0.8 : 0;
  master.connect(comp); comp.connect(actx.destination);
  noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let s = 99; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
  const src = actx.createBufferSource(), lp = actx.createBiquadFilter();
  src.buffer = noiseBuf; src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 700;
  rollGain = actx.createGain(); rollGain.gain.value = 0;
  src.connect(lp); lp.connect(rollGain); rollGain.connect(master); src.start();
  return actx;
}
addEventListener('pointerdown', () => { const a = audio(); if (a && a.state === 'suspended') a.resume(); }, { capture: true });
function setSound(on) {
  progress.sound = on; saveProgress();
  if (master) master.gain.value = on ? 0.8 : 0;
}
function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0 } = {}) {
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.2, freq = 2000, q = 1, type = 'bandpass', delay = 0 } = {}) {
  const t = actx.currentTime + delay, src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  src.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}
const SFX = {
  putt: p => { noise(0.03, { vol: 0.25 + p * 0.3, freq: 3500, q: 2 }); tone(700 + p * 500, 0.06, { type: 'triangle', vol: 0.2 + p * 0.2, slide: -300 }); },
  clonk: v => tone(170 + Math.min(v, 4) * 30, 0.09, { type: 'triangle', vol: Math.min(0.45, 0.12 + v * 0.1) }),
  boing: v => tone(320, 0.2, { vol: 0.3, slide: 260 }),
  cup: () => { [0, 0.06, 0.11].forEach((d, i) => tone(1400 - i * 200, 0.05, { type: 'square', vol: 0.08, delay: d })); tone(110, 0.18, { vol: 0.4, delay: 0.16, slide: -40 }); },
  lip: () => tone(900, 0.07, { type: 'square', vol: 0.08, slide: 300 }),
  land: () => noise(0.08, { vol: 0.3, freq: 400 }),
  boink: () => tone(420, 0.25, { vol: 0.3, slide: -220 }),
  tap: () => tone(660, 0.05, { type: 'triangle', vol: 0.18 }),
  star: i => tone([784, 988, 1175][i] || 1175, 0.22, { type: 'triangle', vol: 0.25 }),
  jingle: w => lookOf(w).jingle.forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.18, delay: i * 0.11 })),
  fanfare: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, { type: 'square', vol: 0.12, delay: i * 0.09 })),
};
function sfx(name, ...args) {
  sfxLog.push(name); if (sfxLog.length > 200) sfxLog.shift();
  if (actx && master) SFX[name](...args);
}
/* rolling hiss follows ball speed; 0 silences it */
function setRoll(speed) {
  if (rollGain) rollGain.gain.setTargetAtTime(Math.min(0.25, speed * 0.06), actx.currentTime, 0.03);
}
```

Note: the `Math.random()` in `noise()` is outside the sim region (only the sim region must be deterministic).

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --only audio-check && npm run lint`
Expected: `audio-check 5/5`, lint `0 finding(s)`.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/audio-check.cjs
git commit -m "feat(T2.3): synthesized putt, wall, cup, jingle and rolling sounds

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2.4: Play: drag to putt, live loop, HUD, hole finish

**Files:**
- Modify: `index.html` (hole scene markup + CSS, section 6 play, boot query params)
- Test: `tests/play-check.cjs`

**Interfaces:**
- Consumes: everything above; `sfx`, `setRoll`.
- Produces:
  - Constants `DRAG_DEAD = 24`, `DRAG_FULL = 260` (stage px).
  - `aimFromDrag(d, clientX, clientY)` sets `d.angle`, `d.power`, `d.live`.
  - `beginPutt(angleDeg, power) -> bool`, `advance(dt)`, `tickSim()`, `endRoll(end)`, `drainHits()`, `updateHud()`, `finishHole()`, `goHole(key)` (sfx tap + `startHole`).
  - `stepFrame` now calls `advance(dt)` unless `loopPaused`.
  - `play.phase` transitions: `aim -> roll -> (aim | sunk | auto)`, `aim -> drift -> (aim | sunk)`, `auto -> sunk`, `sunk -> done` (shows `#holeDone`).
  - Boot query: `?hole=w-n` starts that hole; `?map` opens the map (map scene comes in Task 2.5; until then `?map` falls back to the title).
  - Aim visuals: `aimGroup` (arrow + power ring) shown while `play.drag.live`.

- [ ] **Step 1: Write the failing play suite**

`tests/play-check.cjs`:
```js
/* play-check (browser): a real mouse drag aims opposite the drag and sets power by length; a short
   drag cancels; only the first pointer aims and HUD taps never putt; the live loop produces the
   same result as the pure simulation even with ragged frame timing and a 5 s background gap;
   a mover nudges a resting ball without a stroke; the HUD shows numerals; sinking finishes the
   hole and saves it. */
'use strict';
const { check, done, open, fresh, visibleLetters } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  await fresh(page, '?hole=1-1');
  await page.evaluate(() => { loopPaused = true; snapCamera(); });
  const box = await page.evaluate(() => { const r = view.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: stageScale }; });

  /* 1. drag straight down the screen: putt straight at the cup (toward +z) */
  await page.mouse.move(box.x, box.y); await page.mouse.down();
  await page.mouse.move(box.x, box.y + 200 * box.s, { steps: 6 });
  const mid = await page.evaluate(() => ({ live: play.drag && play.drag.live, aim: aimGroup.visible }));
  await page.mouse.up();
  const p1 = await page.evaluate(() => ({ phase: play.phase, vx: play.ball.vx, vz: play.ball.vz }));
  const ang = Math.atan2(p1.vx, p1.vz) * 180 / Math.PI, spd = Math.hypot(p1.vx, p1.vz), want = 0.5 + 5 * ((200 - 24) / (260 - 24));
  check('dragging shows the aim and power ring', mid.live && mid.aim, JSON.stringify(mid));
  check('drag down the screen putts at the cup', p1.phase === 'roll' && Math.abs(ang) < 3, JSON.stringify({ ang, phase: p1.phase }));
  check('drag length sets power', Math.abs(spd - want) < 0.06, JSON.stringify({ spd, want }));

  /* 2. a short drag cancels */
  await page.evaluate(() => startHole('1-1'));
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.up();
  check('a drag shorter than the dead zone cancels', await page.evaluate(() => play.phase === 'aim' && !aimGroup.visible));

  /* 3. a second finger and a HUD tap never putt */
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x, box.y + 150 * box.s);
  const second = await page.evaluate(([x, y]) => {
    view.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, clientX: x, clientY: y, bubbles: true }));
    dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX: x + 300, clientY: y, bubbles: true }));
    return { phase: play.phase, id: play.drag && play.drag.id };
  }, [box.x + 100, box.y]);
  await page.mouse.up();
  check('a second pointer is ignored mid-drag', second.phase === 'aim' && second.id !== 7, JSON.stringify(second));
  await page.evaluate(() => { startHole('1-1'); loopPaused = true; });
  const hb = await page.evaluate(() => { const r = homeBtn.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(hb.x, hb.y); await page.mouse.down(); await page.mouse.move(hb.x, hb.y + 200); await page.mouse.up();
  check('a drag that starts on a HUD button never putts', await page.evaluate(() => play.phase !== 'roll' && play.round.strokes === 0));

  /* 4. live loop == pure simulation, with ragged frames and a long background gap */
  const same = await page.evaluate(() => {
    startHole('1-8'); loopPaused = false;
    let now = 1000; lastNow = now;
    const ms = [16, 100, 4, 33, 70, 17], step = d => { now += d; return stepFrame(now); };
    for (let i = 0; i < 40; i++) step(ms[i % ms.length]);
    const from = [play.ball.x, play.ball.z];
    beginPutt(12, 0.55);
    const t0 = play.t0;
    let i = 0, maxDt = 0;
    while (play.phase === 'roll' && i < 5000) { maxDt = Math.max(maxDt, step(i === 30 ? 5000 : ms[i % ms.length])); i++; }
    loopPaused = true;
    const sim = simulatePutt(play.hole, from, 12, 0.55, t0);
    return { live: [play.round.at[0], play.round.at[1], play.lastOutcome], sim: [sim.x, sim.z, sim.end], maxDt };
  });
  const eq = same.maxDt <= 0.1 + 1e-9 && (same.sim[2] === 'sunk' ? same.live[2] === 'sunk' : same.live[0] === same.sim[0] && same.live[1] === same.sim[1]);
  check('live loop matches simulatePutt exactly, through a 5 s background gap', eq, JSON.stringify(same));

  /* 5. a mover nudges a resting ball: no stroke, ball moves */
  const drift = await page.evaluate(() => {
    startHole('1-8'); loopPaused = true;
    const m = play.hole.movers[0];
    play.ball = newBall(play.hole, m.x + 0.4, m.z); play.round.at = [play.ball.x, play.ball.z];
    let saw = false;
    for (let i = 0; i < 600; i++) { advance(1 / 60); if (play.phase === 'drift') saw = true; if (saw && play.phase === 'aim') break; }
    return { saw, strokes: play.round.strokes, moved: Math.hypot(play.ball.x - (m.x + 0.4), play.ball.z - m.z) > 0.05, phase: play.phase };
  });
  check('a mover nudges a resting ball without a stroke', drift.saw && drift.strokes === 0 && drift.moved, JSON.stringify(drift));

  /* 6. HUD is numerals only */
  await page.evaluate(() => { startHole('1-3'); loopPaused = true; });
  const hud = await page.evaluate(() => [hudHoleN.textContent, hudParN.textContent, hudStrokesN.textContent].join(','));
  check('HUD shows hole, par and strokes as numerals', hud === '3,2,0', hud);
  check('no words in the hole scene', (await visibleLetters(page)).length === 0);

  /* 7. sinking finishes the hole, shows the result and saves it */
  const fin = await page.evaluate(() => {
    startHole('1-1'); loopPaused = true;
    play.ball = newBall(play.hole, 0, 3.2);
    beginPutt(0, 0);
    for (let i = 0; i < 400 && play.phase !== 'done'; i++) advance(1 / 60);
    return { phase: play.phase, shown: getComputedStyle(holeDone).display !== 'none', score: play.round.score, lit: holeDone.querySelectorAll('.star.on').length,
      saved: JSON.parse(localStorage.getItem('puttx.v1')).holes['1-1'], log: sfxLog.slice(-12) };
  });
  check('sinking shows the result: 1 stroke, 3 stars', fin.phase === 'done' && fin.shown && fin.score === 1 && fin.lit === 3, JSON.stringify(fin));
  check('the hole is saved', fin.saved && fin.saved.best === 1 && fin.saved.stars === 3, JSON.stringify(fin.saved));
  check('putt and cup sounds fired', fin.log.includes('putt') && fin.log.includes('cup'), fin.log.join());

  /* 8. the par + 3 cap auto-rolls into the cup */
  const cap = await page.evaluate(() => {
    startHole('1-1'); loopPaused = true; play.round.strokes = 4;
    beginPutt(180, 0);
    let sawAuto = false;
    for (let i = 0; i < 600 && play.phase !== 'done'; i++) { advance(1 / 60); if (play.phase === 'auto') sawAuto = true; }
    return { sawAuto, phase: play.phase, score: play.round.score };
  });
  check('the cap putt auto-rolls in and scores par + 3', cap.sawAuto && cap.phase === 'done' && cap.score === 5, JSON.stringify(cap));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --only play-check`
Expected: FAIL (boot ignores `?hole=`, so `snapCamera` throws on a null hole).

- [ ] **Step 3: Hole scene markup and CSS**

Replace `<section class="scene" id="hole"></section>` with:
```html
  <section class="scene" id="hole">
    <button class="btn" id="homeBtn" aria-label="map"><svg viewBox="0 0 64 64"><path d="M10 30 L32 10 L54 30 V54 H40 V38 H24 V54 H10 Z" fill="#a8804e"/></svg></button>
    <div class="chip" id="hudHole" aria-label="hole"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="#fffdf7" stroke="#e6d2ab" stroke-width="4"/><circle cx="32" cy="32" r="6" fill="#e6d2ab"/></svg><span id="hudHoleN">1</span></div>
    <div class="chip" id="hudPar" aria-label="par"><svg viewBox="0 0 64 64"><path d="M20 56 V8" stroke="#8a7360" stroke-width="5" stroke-linecap="round"/><path d="M22 9 L50 18 L22 27 Z" fill="#ef7d6d"/><ellipse cx="32" cy="56" rx="18" ry="5" fill="#5a4634"/></svg><span id="hudParN">2</span></div>
    <div class="chip" id="hudStrokes" aria-label="strokes"><svg viewBox="0 0 64 64"><path d="M44 6 L24 48" stroke="#8a7360" stroke-width="6" stroke-linecap="round"/><rect x="10" y="44" width="24" height="12" rx="5" fill="#6fc0df"/></svg><span id="hudStrokesN">0</span></div>
    <div class="live" id="holeDone" aria-label="hole done">
      <div class="stars"><svg class="star" viewBox="0 0 64 64"><path d="M32 4 L40 23 L60 24 L44 37 L50 58 L32 46 L14 58 L20 37 L4 24 L24 23 Z"/></svg><svg class="star" viewBox="0 0 64 64"><path d="M32 4 L40 23 L60 24 L44 37 L50 58 L32 46 L14 58 L20 37 L4 24 L24 23 Z"/></svg><svg class="star" viewBox="0 0 64 64"><path d="M32 4 L40 23 L60 24 L44 37 L50 58 L32 46 L14 58 L20 37 L4 24 L24 23 Z"/></svg></div>
      <div class="score"><span id="doneStrokes">1</span><span class="par"><svg viewBox="0 0 64 64"><path d="M20 56 V8" stroke="#8a7360" stroke-width="5" stroke-linecap="round"/><path d="M22 9 L50 18 L22 27 Z" fill="#ef7d6d"/></svg><span id="donePar">2</span></span></div>
      <button class="btn" id="doneMap" aria-label="map"><svg viewBox="0 0 64 64"><path d="M10 30 L32 10 L54 30 V54 H40 V38 H24 V54 H10 Z" fill="#a8804e"/></svg></button>
      <button class="btn go" id="doneNext" aria-label="next hole"><svg viewBox="0 0 64 64"><path d="M22 12 L52 32 L22 52 Z" fill="#fff"/></svg></button>
    </div>
  </section>
```

CSS, appended to the `<style>` block:
```css
/* ---------- 6. HOLE HUD ---------- */
#homeBtn { left: 24px; top: 24px; }
#hudHole { left: 132px; top: 30px; }
#hudPar { left: 300px; top: 30px; }
#hudStrokes { right: 24px; top: 30px; }
#holeDone { position: absolute; left: 340px; top: 150px; width: 520px; height: 400px; display: none;
  border-radius: var(--v-r-xl); background: var(--v-surface); border: 6px solid var(--v-surface-line); box-shadow: var(--v-shadow-card);
  background-image: var(--v-dots); background-size: var(--v-dots-size); animation: popIn .35s cubic-bezier(.3, 1.6, .5, 1) both; }
#holeDone.show { display: block; }
#holeDone .stars { position: absolute; top: 34px; left: 0; right: 0; display: flex; justify-content: center; gap: 14px; }
#holeDone .star { width: 96px; height: 96px; fill: var(--v-mute); }
#holeDone .star.on { fill: var(--v-accent-yellow); stroke: var(--v-yellow-line); stroke-width: 3; animation: popIn .4s cubic-bezier(.3, 1.6, .5, 1) both; }
#holeDone .star.on:nth-child(2) { animation-delay: .15s; }
#holeDone .star.on:nth-child(3) { animation-delay: .3s; }
#holeDone .score { position: absolute; top: 150px; left: 0; right: 0; display: flex; justify-content: center; align-items: center; gap: 28px;
  font: 800 96px var(--v-font); color: var(--v-ink-strong); font-variant-numeric: tabular-nums; }
#holeDone .par { display: flex; align-items: center; gap: 6px; font-size: 52px; color: var(--v-ink-soft); }
#holeDone .par svg { width: 52px; height: 52px; }
#doneMap { left: 60px; bottom: 36px; }
#doneNext { right: 60px; bottom: 36px; width: 140px; }
@keyframes popIn { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { #holeDone, #holeDone .star.on { animation: none; } }
```

- [ ] **Step 4: Implement play** (replace all of section 6 from Task 2.2 with this)

```js
/* ============ 6. PLAY ============ */
const DRAG_DEAD = 24, DRAG_FULL = 260;   /* stage px: below DEAD cancels, FULL is full power */
let loopPaused = false, lastNow = 0, simAcc = 0, aimGroup = null, aimArrow = null, aimRing = null;
const _ray = new THREE.Raycaster(), _plane = new THREE.Plane(), _hit = new THREE.Vector3(), _v = new THREE.Vector3(), _n = new THREE.Vector3(0, 1, 0);

function initAim() {
  aimGroup = new THREE.Group(); aimGroup.visible = false;
  const s = new THREE.Shape();
  s.moveTo(-0.025, 0); s.lineTo(0.025, 0); s.lineTo(0.025, 0.7); s.lineTo(0.07, 0.7); s.lineTo(0, 0.86); s.lineTo(-0.07, 0.7); s.lineTo(-0.025, 0.7); s.closePath();
  aimArrow = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: 0xfffdf7, transparent: true, opacity: 0.92, depthWrite: false }));
  aimArrow.rotation.x = Math.PI / 2;
  aimRing = new THREE.Mesh(new THREE.RingGeometry(BALL_R * 1.6, BALL_R * 2.3, 48, 1, 0, 0.01), new THREE.MeshBasicMaterial({ color: 0xffd66e, side: THREE.DoubleSide, depthWrite: false }));
  aimRing.rotation.x = -Math.PI / 2;
  aimGroup.add(aimArrow, aimRing);
  scene.add(aimGroup);
}
function showAim(d) {
  const b = play.ball;
  aimGroup.visible = d.live;
  aimGroup.position.set(b.x, b.y + 0.006, b.z);
  aimArrow.rotation.z = -d.angle * Math.PI / 180;
  aimArrow.scale.set(1, 0.35 + 0.65 * d.power, 1);
  aimArrow.material.color.set(d.power > 0.85 ? 0xef7d6d : 0xfffdf7);
  aimRing.geometry.dispose();
  aimRing.geometry = new THREE.RingGeometry(BALL_R * 1.6, BALL_R * 2.3, 48, 1, Math.PI / 2, Math.max(0.01, d.power * Math.PI * 2));
  aimRing.material.color.set(d.power > 0.85 ? 0xef7d6d : 0xffd66e);
}
function hideAim() { if (aimGroup) aimGroup.visible = false; }
/* screen drag -> world aim: the putt goes opposite the drag, through the ground plane */
function aimFromDrag(d, cx, cy) {
  const dx = (cx - d.sx) / stageScale, dy = (cy - d.sy) / stageScale, len = Math.hypot(dx, dy), b = play.ball;
  d.live = len >= DRAG_DEAD;
  d.power = clamp((len - DRAG_DEAD) / (DRAG_FULL - DRAG_DEAD), 0, 1);
  _v.set(b.x, b.y, b.z).project(camera);
  const tx = (_v.x + 1) / 2 * 1200 - dx, ty = (1 - _v.y) / 2 * 700 - dy;
  _ray.setFromCamera({ x: tx / 1200 * 2 - 1, y: -(ty / 700 * 2 - 1) }, camera);
  _plane.set(_n, -b.y);
  if (!_ray.ray.intersectPlane(_plane, _hit)) _hit.copy(_ray.ray.direction).multiplyScalar(50).add(_ray.ray.origin);
  d.angle = Math.atan2(_hit.x - b.x, _hit.z - b.z) * 180 / Math.PI;
  showAim(d);
}
function onDown(e) {
  if (play.phase !== 'aim' || play.drag) return;
  play.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, angle: 0, power: 0, live: false };
}
function onMove(e) { const d = play.drag; if (d && e.pointerId === d.id) aimFromDrag(d, e.clientX, e.clientY); }
function onUp(e) {
  const d = play.drag;
  if (!d || e.pointerId !== d.id) return;
  aimFromDrag(d, e.clientX, e.clientY);
  play.drag = null; hideAim();
  if (d.live) beginPutt(d.angle, d.power);
}
function onCancel(e) { if (play.drag && e.pointerId === play.drag.id) { play.drag = null; hideAim(); } }

function startHole(key) {
  const h = holeAt(key);
  if (!h) return false;
  Object.assign(play, { key, hole: h, round: newRound(h), ball: newBall(h, h.tee[0], h.tee[1]), phase: 'aim', time: 0, from: null, t0: 0, drag: null, fx: {}, lastOutcome: null });
  simAcc = 0;
  buildHoleScene(h);
  hideAim();
  holeDone.classList.remove('show');
  syncBall(0);
  showScene('hole');
  updateHud();
  snapCamera();
  return true;
}
function goHole(key) { sfx('tap'); startHole(key); sfx('jingle', Number(key.split('-')[0])); }
function beginPutt(angle, power) {
  if (play.phase !== 'aim') return false;
  const b = play.ball;
  play.from = [b.x, b.z]; play.t0 = play.time;
  play.ball = launch(newBall(play.hole, b.x, b.z), angle, power);
  play.phase = 'roll';
  sfx('putt', power);
  return true;
}
function tickSim() {
  const h = play.hole;
  if (play.phase === 'roll' || play.phase === 'drift') {
    const end = stepBall(h, play.ball, play.time);
    play.time += SIM_DT;
    if (end) endRoll(end);
    return;
  }
  if (play.phase === 'aim' && moverTouch(h, play.ball, play.time)) { play.from = [play.ball.x, play.ball.z]; play.phase = 'drift'; play.drag = null; hideAim(); }
  play.time += SIM_DT;
}
function endRoll(end) {
  const r = { end, x: play.ball.x, z: play.ball.z };
  const out = play.phase === 'drift' ? resolveDrift(play.round, r, play.from) : resolvePutt(play.round, r, play.from);
  play.lastOutcome = out;
  setRoll(0);
  if (out === 'sunk') { play.phase = 'sunk'; play.fx.sunkT = 0; sfx('cup'); }
  else if (out === 'auto') { play.phase = 'auto'; play.fx.autoT = 0; play.fx.autoFrom = end === 'oob' ? play.from.slice() : [r.x, r.z]; }
  else {
    if (out === 'oob') sfx('boink');
    play.ball = newBall(play.hole, play.round.at[0], play.round.at[1]);
    play.phase = 'aim';
  }
  updateHud();
}
/* sounds and squash for what the ball hit since the last frame */
function drainHits() {
  for (const [kind, v] of play.ball.hits) {
    if (kind === 'wall' || kind === 'post') sfx('clonk', v);
    else if (kind === 'bump' || kind === 'mover') sfx('boing', v);
    else if (kind === 'lip') sfx('lip');
    else if (kind === 'land') sfx('land');
    if (kind !== 'lip' && v > 0.8) play.fx.squash = 1;
  }
  play.ball.hits.length = 0;
}
function advance(dt) {
  if (!play.hole || play.phase === 'idle') return;
  simAcc = Math.min(simAcc + dt, 0.1 + SIM_DT);
  while (simAcc >= SIM_DT) { simAcc -= SIM_DT; tickSim(); }
  drainHits();
  if (play.phase === 'roll' || play.phase === 'drift') setRoll(play.ball.air ? 0 : Math.hypot(play.ball.vx, play.ball.vz));
  const h = play.hole, b = play.ball;
  if (play.phase === 'auto') {
    const t = (play.fx.autoT += dt) / 0.9, k = Math.min(1, t), e = k * k * (3 - 2 * k), [fx, fz] = play.fx.autoFrom;
    b.x = fx + (h.cup[0] - fx) * e; b.z = fz + (h.cup[1] - fz) * e;
    b.y = groundH(h, b.x, b.z) + Math.sin(k * Math.PI) * 0.12;
    if (k >= 1) { play.phase = 'sunk'; play.fx.sunkT = 0; sfx('cup'); }
  } else if (play.phase === 'sunk') {
    const t = (play.fx.sunkT += dt);
    b.x = h.cup[0]; b.z = h.cup[1]; b.y = groundH(h, h.cup[0], h.cup[1]) - Math.min(1, t / 0.25) * 0.08;
    if (t > 1.3) finishHole();
  }
}
function updateHud() {
  const [, n] = play.key.split('-');
  hudHoleN.textContent = n; hudParN.textContent = play.hole.par; hudStrokesN.textContent = Math.min(play.round.strokes, capOf(play.hole));
}
function finishHole() {
  play.phase = 'done';
  const { key, round, hole } = play;
  recordHole(progress, key, round.score, hole.par); saveProgress();
  const stars = starsFor(round.score, hole.par);
  holeDone.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('on', i < stars));
  doneStrokes.textContent = round.score; donePar.textContent = hole.par;
  holeDone.classList.add('show');
  for (let i = 0; i < stars; i++) setTimeout(() => sfx('star', i), 250 + i * 150);
}
/* one animation frame: dt is clamped so a backgrounded tab never jumps */
function stepFrame(now) {
  const dt = lastNow ? Math.min(0.1, Math.max(0, (now - lastNow) / 1000)) : 0;
  lastNow = now;
  if (!loopPaused) advance(dt);
  renderFrame(dt);
  return dt;
}
function frame(now) { stepFrame(now); requestAnimationFrame(frame); }
```

In `syncBall`, the ball mesh already follows `play.ball`, so auto and sunk animations show through it. Add these hole-scene wires to `boot()` after `initRenderer();`:
```js
  initAim();
  view.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onCancel);
  homeBtn.addEventListener('click', () => { sfx('tap'); showScene('title'); });
  doneMap.addEventListener('click', () => { sfx('tap'); showScene('title'); });
  doneNext.addEventListener('click', () => { const k = nextKey(play.key); if (k) goHole(k); else showScene('title'); });
  const q = new URLSearchParams(location.search);
  if (q.has('hole') && holeAt(q.get('hole'))) startHole(q.get('hole')); else showScene('title');
```
and delete the old `showScene('title');` line from `boot()`. (Task 2.5 points home, map and "after hole 9" at the real map and card.)

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- --only play-check,render-check,boot-check && npm run lint`
Expected: `play-check 15/15`; render and boot unchanged; lint `0 finding(s)`. If "live loop matches" fails, compare `play.t0` with the `t0` passed to `simulatePutt` first: both must be the same float.

- [ ] **Step 6: Play it**

Run: `python3 -m http.server 4173`, open `http://localhost:4173/?hole=1-1`, drag back and release. Expected: arrow and ring while dragging, a putt that rolls, bounces and drops in, then the result card.

- [ ] **Step 7: Commit**

```bash
git add index.html tests/play-check.cjs
git commit -m "feat(T2.4): drag to putt, fixed-step live loop, HUD, drift, cap auto-sink, hole result

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2.5: Title, map and world card

**Files:**
- Modify: `index.html` (title emblem, map and card markup/CSS, section 7 scenes, boot)
- Test: `tests/ui-check.cjs`

**Interfaces:**
- Consumes: `progress`, `holeUnlocked`, `WORLD_ORDER`, `WORLDS`, `lookOf`, `goHole`, `setSound`, `sfx`.
- Produces: `showTitle()`, `showMap(w?)`, `renderMap()`, `showCard(w)`, `mapWorld` (let), `NODE_POS` (9 stage points), `LOCK_SVG`, `STAR_SVG`. Title runs `play.phase = 'title'` with hole 1-1 orbiting behind it; `cameraGoal()` gains a `'title'` branch.

- [ ] **Step 1: Write the failing UI suite**

`tests/ui-check.cjs`:
```js
/* ui-check (browser): title -> map -> hole -> result -> next -> card, with no words and no tap
   target under 64 px anywhere; locked holes and worlds boink; hole 9 opens the world card,
   which totals strokes and leads to the next world; the speaker toggle persists. */
'use strict';
const { check, done, open, fresh, visibleLetters, smallTargets } = require('./lib.cjs');
const tap = (page, id) => page.evaluate(i => document.getElementById(i).click(), id);

(async () => {
  const { browser, page, errors } = await open();
  await fresh(page);
  await page.waitForTimeout(300);
  const title = await page.evaluate(() => ({ scene: currentScene, phase: play.phase, go: Math.min(titleGo.getBoundingClientRect().width, titleGo.getBoundingClientRect().height) }));
  check('title: hole 1-1 orbits behind a big GO', title.scene === 'title' && title.phase === 'title' && title.go >= 150, JSON.stringify(title));
  check('title: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0);

  await tap(page, 'titleGo');
  const map = await page.evaluate(() => ({ scene: currentScene, tabs: worldTabs.children.length, nodes: holePath.querySelectorAll('.node').length,
    open: holePath.querySelectorAll('.node:not(.locked)').length, lockedTabs: worldTabs.querySelectorAll('.locked').length }));
  check('map: 3 world tabs, 9 holes, only hole 1 open, 2 worlds locked', map.scene === 'map' && map.tabs === 3 && map.nodes === 9 && map.open === 1 && map.lockedTabs === 2, JSON.stringify(map));
  check('map: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));

  await page.evaluate(() => holePath.querySelectorAll('.node')[4].click());
  await page.evaluate(() => worldTabs.children[2].click());
  const boink = await page.evaluate(() => ({ scene: currentScene, world: mapWorld, log: sfxLog.slice(-2).join() }));
  check('locked hole and locked world boink and stay put', boink.scene === 'map' && boink.world === 1 && boink.log === 'boink,boink', JSON.stringify(boink));

  await page.evaluate(() => holePath.querySelectorAll('.node')[0].click());
  check('hole 1 opens the hole scene', await page.evaluate(() => currentScene === 'hole' && play.key === '1-1'));
  await tap(page, 'homeBtn');
  check('home goes back to the map', await page.evaluate(() => currentScene === 'map'));

  /* finish 1-1 for real, then next */
  await page.evaluate(() => { goHole('1-1'); loopPaused = true; play.ball = newBall(play.hole, 0, 3.2); beginPutt(0, 0); for (let i = 0; i < 400 && play.phase !== 'done'; i++) advance(1 / 60); });
  check('result card: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0);
  await tap(page, 'doneNext');
  check('next goes to hole 2', await page.evaluate(() => play.key === '1-2' && currentScene === 'hole'));
  await page.evaluate(() => { loopPaused = false; showMap(1); });
  const m2 = await page.evaluate(() => { const n = holePath.querySelectorAll('.node')[0]; return { stars: n.querySelectorAll('.star.on').length, best: n.querySelector('.best').textContent, open2: !holePath.querySelectorAll('.node')[1].classList.contains('locked') }; });
  check('map shows hole 1 stars and best, hole 2 open', m2.stars === 3 && m2.best === '1' && m2.open2, JSON.stringify(m2));

  /* card after hole 9 */
  const card = await page.evaluate(() => {
    for (let n = 1; n <= 8; n++) recordHole(progress, '1-' + n, holeAt('1-' + n).par, holeAt('1-' + n).par);
    startHole('1-9'); loopPaused = true; play.round.strokes = 3; play.ball = newBall(play.hole, play.hole.cup[0], play.hole.cup[1] - 0.25);
    beginPutt(0, 0); for (let i = 0; i < 400 && play.phase !== 'done'; i++) advance(1 / 60);
    doneNext.click();
    const pars = WORLDS[1].holes.reduce((a, h) => a + h.par, 0), total = WORLDS[1].holes.reduce((a, h) => a + progress.holes[h.key].best, 0);
    return { scene: currentScene, cells: cardRow.children.length, total: cardTotal.textContent, want: String(total), diff: cardDiff.textContent, wantDiff: total - pars,
      next: getComputedStyle(cardNext).display !== 'none', worlds: progress.worlds.join() };
  });
  check('after hole 9 the card shows 9 holes and the total', card.scene === 'card' && card.cells === 9 && card.total === card.want, JSON.stringify(card));
  check('card shows strokes against par with a sign', card.diff === (card.wantDiff > 0 ? '+' : '') + card.wantDiff, JSON.stringify(card));
  check('world 5 unlocked; card offers the next world', card.worlds === '1,5' && card.next, JSON.stringify(card));
  check('card: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0);
  await tap(page, 'cardNext');
  check('next world opens the map on world 5', await page.evaluate(() => currentScene === 'map' && mapWorld === 5));

  await tap(page, 'soundBtn');
  check('speaker toggle mutes and persists', await page.evaluate(() => JSON.parse(localStorage.getItem('puttx.v1')).sound === false && soundBtn.classList.contains('off')));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
```

Until Tasks 3.2 and 3.3 register snow and space, `WORLDS[5]` is missing: the card's next-world button checks `progress.worlds` (unlocked) only, and `showMap(5)` shows 9 locked placeholder nodes. Both are covered here.

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --only ui-check`
Expected: FAIL (title phase is not `'title'`, `worldTabs` is not defined).

- [ ] **Step 3: Markup and CSS**

Title section becomes:
```html
  <section class="scene" id="title">
    <div id="titleLogo" aria-label="puttx"><svg viewBox="0 0 240 160"><ellipse cx="120" cy="140" rx="100" ry="14" fill="rgba(74,53,35,.18)"/><circle cx="92" cy="86" r="52" fill="#fffdf7" stroke="#e6d2ab" stroke-width="6"/><path d="M40 86 H144" stroke="#ffd66e" stroke-width="14"/><path d="M170 140 V22" stroke="#8a7360" stroke-width="8" stroke-linecap="round"/><path d="M174 22 L222 38 L174 54 Z" fill="#ef7d6d"/></svg></div>
    <button class="btn go" id="titleGo" aria-label="play"><svg viewBox="0 0 64 64"><path d="M22 12 L52 32 L22 52 Z" fill="#fff"/></svg></button>
  </section>
```
Map and card sections become:
```html
  <section class="scene panel" id="map">
    <div id="worldTabs"></div>
    <button class="btn" id="soundBtn" aria-label="sound"><svg viewBox="0 0 64 64"><path d="M10 24 H22 L36 12 V52 L22 40 H10 Z" fill="#8a7360"/><path class="wave" d="M44 22 Q52 32 44 42 M50 16 Q62 32 50 48" fill="none" stroke="#8a7360" stroke-width="5" stroke-linecap="round"/><path class="cross" d="M44 24 L58 40 M58 24 L44 40" stroke="#c95a4c" stroke-width="5" stroke-linecap="round"/></svg></button>
    <svg id="pathLine" viewBox="0 0 1200 700" aria-hidden="true"></svg>
    <div id="holePath"></div>
  </section>
  <section class="scene panel" id="card">
    <div id="cardPanel">
      <div id="cardRow"></div>
      <div id="cardSum"><span id="cardTotal">0</span><span id="cardDiff">0</span><span id="cardStars"></span></div>
      <button class="btn" id="cardMap" aria-label="map"><svg viewBox="0 0 64 64"><path d="M10 30 L32 10 L54 30 V54 H40 V38 H24 V54 H10 Z" fill="#a8804e"/></svg></button>
      <button class="btn go" id="cardNext" aria-label="next world"><svg viewBox="0 0 64 64"><path d="M22 12 L52 32 L22 52 Z" fill="#fff"/></svg></button>
    </div>
  </section>
```
CSS appended:
```css
/* ---------- 7. TITLE, MAP, CARD ---------- */
#titleLogo { position: absolute; left: 420px; top: 120px; width: 360px; animation: popIn .5s cubic-bezier(.3, 1.6, .5, 1) both; }
#titleGo { animation: popIn .5s .2s cubic-bezier(.3, 1.6, .5, 1) both; }
#map { background: var(--v-surface); background-image: var(--v-dots); background-size: var(--v-dots-size); }
#worldTabs { position: absolute; left: 24px; top: 24px; display: flex; gap: 16px; }
#worldTabs .btn { position: relative; width: 104px; height: 104px; }
#worldTabs .btn.on { background: var(--v-accent-yellow); border-color: var(--v-yellow-line); box-shadow: 0 6px 0 var(--v-yellow-down); }
#worldTabs .btn .lock, #holePath .lock { position: absolute; right: -8px; bottom: -8px; width: 40px; height: 40px; }
#soundBtn { right: 24px; top: 24px; }
#soundBtn .cross, #soundBtn.off .wave { display: none; }
#soundBtn.off .cross { display: inline; }
#pathLine { position: absolute; inset: 0; width: 1200px; height: 700px; pointer-events: none; }
#holePath .node { width: 104px; height: 104px; margin: -52px 0 0 -52px; border-radius: 50%; animation: popIn .35s cubic-bezier(.3, 1.6, .5, 1) both; }
#holePath .node .n { font-size: 44px; line-height: 1; }
#holePath .node .stars { position: absolute; top: -30px; display: flex; gap: 2px; }
#holePath .node .star { width: 26px; height: 26px; fill: var(--v-mute); }
#holePath .node .star.on { fill: var(--v-accent-yellow); stroke: var(--v-yellow-line); stroke-width: 4; }
#holePath .node .best { position: absolute; bottom: -34px; font-size: 26px; color: var(--v-ink-soft); }
#card { background: var(--v-scrim); }
#cardPanel { position: absolute; left: 110px; top: 90px; width: 980px; height: 520px; border-radius: var(--v-r-xl); background: var(--v-surface);
  border: 6px solid var(--v-surface-line); box-shadow: var(--v-shadow-card); animation: popIn .4s cubic-bezier(.3, 1.6, .5, 1) both; }
#cardRow { position: absolute; left: 40px; right: 40px; top: 50px; display: grid; grid-template-columns: repeat(9, 1fr); gap: 10px; }
#cardRow .cell { height: 150px; border-radius: var(--v-r-md); background: var(--v-surface-2); display: grid; place-items: center; font: 800 54px var(--v-font); color: var(--v-ink-strong); }
#cardRow .cell small { font-size: 22px; color: var(--v-ink-soft); }
#cardRow .cell.under { background: var(--v-accent-green); color: #fff; }
#cardRow .cell.par { background: var(--v-accent-yellow); }
#cardSum { position: absolute; left: 0; right: 0; top: 240px; display: flex; justify-content: center; align-items: center; gap: 40px; font: 800 96px var(--v-font); color: var(--v-ink-strong); font-variant-numeric: tabular-nums; }
#cardDiff { font-size: 60px; color: var(--v-ink-soft); }
#cardStars { display: flex; align-items: center; gap: 8px; font-size: 60px; }
#cardStars svg { width: 64px; height: 64px; fill: var(--v-accent-yellow); stroke: var(--v-yellow-line); stroke-width: 3; }
#cardMap { left: 60px; bottom: 40px; }
#cardNext { right: 60px; bottom: 40px; width: 140px; }
@media (prefers-reduced-motion: reduce) { #titleLogo, #titleGo, #holePath .node, #cardPanel { animation: none; } }
```

- [ ] **Step 4: Implement scenes** (section 7, after section 6)

```js
/* ============ 7. SCENES ============ */
const STAR_SVG = '<svg class="star" viewBox="0 0 64 64"><path d="M32 4 L40 23 L60 24 L44 37 L50 58 L32 46 L14 58 L20 37 L4 24 L24 23 Z"/></svg>';
const LOCK_SVG = '<svg class="lock" viewBox="0 0 64 64"><rect x="12" y="28" width="40" height="30" rx="6" fill="#a3916d"/><path d="M20 28 V20 A12 12 0 0 1 44 20 V28" fill="none" stroke="#a3916d" stroke-width="7"/></svg>';
const NODE_POS = [[150, 560], [300, 470], [450, 560], [600, 470], [750, 560], [900, 470], [1050, 540], [1000, 320], [820, 260]];
let mapWorld = 1;

function showTitle() {
  if (!play.hole || play.key !== '1-1') startHole('1-1');
  play.phase = 'title';
  showScene('title');
}
function showMap(w) {
  if (w) mapWorld = w;
  play.drag = null; hideAim();
  showScene('map');
  renderMap();
}
function renderMap() {
  worldTabs.innerHTML = '';
  for (const w of WORLD_ORDER) {
    const open = progress.worlds.includes(w) && !!WORLDS[w], b = document.createElement('button');
    b.className = 'btn' + (w === mapWorld ? ' on' : '') + (open ? '' : ' locked');
    b.setAttribute('aria-label', 'world ' + w);
    b.innerHTML = lookOf(w).icon + (open ? '' : LOCK_SVG);
    b.onclick = () => { if (open) { mapWorld = w; sfx('tap'); renderMap(); } else sfx('boink'); };
    worldTabs.append(b);
  }
  pathLine.innerHTML = `<path d="M${NODE_POS.map(p => p.join(' ')).join(' L')}" fill="none" stroke="var(--v-surface-line)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 34"/>`;
  holePath.innerHTML = '';
  NODE_POS.forEach(([x, y], i) => {
    const key = mapWorld + '-' + (i + 1), rec = progress.holes[key], open = !!WORLDS[mapWorld] && holeUnlocked(progress, key);
    const b = document.createElement('button');
    b.className = 'btn node' + (open ? (rec ? '' : ' go') : ' locked');
    b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.animationDelay = (i * 0.04) + 's';
    b.setAttribute('aria-label', 'hole ' + (i + 1));
    b.innerHTML = `<span class="n">${i + 1}</span>` + (rec ? `<span class="stars">${[0, 1, 2].map(k => STAR_SVG.replace('class="star"', `class="star${k < rec.stars ? ' on' : ''}"`)).join('')}</span><span class="best">${rec.best}</span>` : '') + (open ? '' : LOCK_SVG);
    b.onclick = () => open ? goHole(key) : sfx('boink');
    holePath.append(b);
  });
  soundBtn.classList.toggle('off', !progress.sound);
}
function showCard(w) {
  const holes = WORLDS[w].holes;
  cardRow.innerHTML = '';
  let total = 0, par = 0, stars = 0;
  holes.forEach((h, i) => {
    const r = progress.holes[h.key], c = document.createElement('div');
    total += r.best; par += h.par; stars += r.stars;
    c.className = 'cell' + (r.best < h.par ? ' under' : r.best === h.par ? ' par' : '');
    c.innerHTML = `<small>${i + 1}</small>${r.best}`;
    cardRow.append(c);
  });
  const diff = total - par;
  cardTotal.textContent = total;
  cardDiff.textContent = (diff > 0 ? '+' : '') + diff;
  cardStars.innerHTML = STAR_SVG + `<span>${stars}</span>`;
  const next = WORLD_ORDER[WORLD_ORDER.indexOf(w) + 1];
  cardNext.style.display = next && progress.worlds.includes(next) ? '' : 'none';
  cardNext.onclick = () => { sfx('tap'); showMap(next); };
  showScene('card');
  sfx('fanfare');
}
```

`cameraGoal()` in section 5 gains a title branch as its first lines:
```js
  if (play.phase === 'title') {
    const pts = play.hole.floors.flat(), cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const yaw = play.time * 0.15, look = new THREE.Vector3(cx, 0, cz);
    return { pos: new THREE.Vector3(cx - Math.sin(yaw) * 5, 3.2, cz - Math.cos(yaw) * 5), look };
  }
```
`advance(dt)` in section 6: change its first line to `if (!play.hole || play.phase === 'idle') return;` followed by `if (play.phase === 'title') { play.time += dt; return; }`.

`doneNext`'s handler becomes: `doneNext.addEventListener('click', () => { const k = nextKey(play.key); if (k) goHole(k); else { sfx('tap'); showCard(Number(play.key.split('-')[0])); } });`
`homeBtn` and `doneMap` handlers become `() => { sfx('tap'); showMap(Number(play.key.split('-')[0])); }`.
Add to boot: `titleGo.addEventListener('click', () => { sfx('tap'); showMap(); });`, `cardMap.addEventListener('click', () => { sfx('tap'); showMap(); });`, `soundBtn.addEventListener('click', () => { setSound(!progress.sound); soundBtn.classList.toggle('off', !progress.sound); sfx('tap'); });`.
Boot's scene choice becomes:
```js
  const q = new URLSearchParams(location.search);
  if (q.has('hole') && holeAt(q.get('hole'))) startHole(q.get('hole'));
  else if (q.has('map')) { showTitle(); showMap(); }
  else showTitle();
```

- [ ] **Step 5: Run the full suite**

Run: `npm test && npm run lint`
Expected: every suite ok (`ui-check 17/17`), lint `0 finding(s)`. Fix the code, never the checks, unless a check contradicts the spec.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/ui-check.cjs
git commit -m "feat(T2.5): orbiting title, world map, hole result flow, world card, speaker toggle

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 3: Juice and worlds

### Task 3.1: Juice: trail, squash, flag pop, confetti, reduced motion

**Files:**
- Modify: `index.html` (section 8 fx; hooks in `renderFrame`, `endRoll`, `finishHole`, `showCard`)
- Test: `tests/fx-check.cjs`

**Interfaces:**
- Consumes: `play.fx.squash` (set by `drainHits`), `flagGroup`, `ballMesh`, `camera`.
- Produces: `reducedMotion()`, `initFx()`, `updateFx(dt)`, `burst(pos, n)`, `trailDots` (pool of 16), `confetti` (pool of 140), `activeConfetti() -> number`, `visibleTrail() -> number`. Holes-in-one burst at the cup; the card bursts in front of the camera.

- [ ] **Step 1: Write the failing fx suite**

`tests/fx-check.cjs`:
```js
/* fx-check (browser): while rolling, a trail follows the ball; a hard wall hit squashes it; sinking
   pops the flag; a hole in one and the world card throw confetti. With reduced motion, none of
   the decorative motion runs but the game still plays and finishes. */
'use strict';
const { check, done, open, fresh } = require('./lib.cjs');

async function run(reduced) {
  const { browser, page, errors } = await open('', { reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await fresh(page, '?hole=1-1');
  const r = await page.evaluate(() => {
    loopPaused = true;
    let trail = 0, squash = 1, flag = 0, conf = 0;
    const frames = n => { for (let i = 0; i < n; i++) { advance(1 / 60); renderFrame(1 / 60); trail = Math.max(trail, visibleTrail()); squash = Math.min(squash, ballMesh.scale.y); flag = Math.max(flag, flagGroup.position.y); conf = Math.max(conf, activeConfetti()); } };
    beginPutt(45, 1); frames(90);
    startHole('1-1'); loopPaused = true; play.ball = newBall(play.hole, 0, 3.2); beginPutt(0, 0); frames(200);
    return { trail, squash, flag, conf, phase: play.phase };
  });
  await browser.close();
  return { r, errors };
}

(async () => {
  const on = await run(false), off = await run(true);
  check('trail follows a rolling ball', on.r.trail > 3, JSON.stringify(on.r));
  check('a hard wall hit squashes the ball', on.r.squash < 0.9, JSON.stringify(on.r));
  check('sinking pops the flag', on.r.flag > 0.1, JSON.stringify(on.r));
  check('a hole in one throws confetti', on.r.conf > 50, JSON.stringify(on.r));
  check('reduced motion: no trail, squash, flag pop or confetti', off.r.trail === 0 && off.r.squash === 1 && off.r.flag === 0 && off.r.conf === 0, JSON.stringify(off.r));
  check('reduced motion: the hole still finishes', off.r.phase === 'done', off.r.phase);
  check('no console errors', on.errors.length + off.errors.length === 0, on.errors.concat(off.errors).join(' | '));
  done();
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --only fx-check`
Expected: FAIL `visibleTrail is not defined`.

- [ ] **Step 3: Implement fx** (section 8, after section 7)

```js
/* ============ 8. FX ============ */
const FX_COLORS = [0xef7d6d, 0xffd66e, 0x74c465, 0x6fc0df, 0xfff8ec];
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let trailDots = [], confetti = [], trailClock = 0, trailNext = 0;
function initFx() {
  const dotGeo = new THREE.SphereGeometry(BALL_R * 0.55, 10, 8);
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xfffdf7, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.userData.life = 0; scene.add(m); trailDots.push(m);
  }
  const confGeo = new THREE.PlaneGeometry(0.045, 0.028);
  for (let i = 0; i < 140; i++) {
    const m = new THREE.Mesh(confGeo, new THREE.MeshBasicMaterial({ color: FX_COLORS[i % FX_COLORS.length], side: THREE.DoubleSide }));
    m.visible = false; m.userData = { life: 0, v: new THREE.Vector3(), spin: new THREE.Vector3() }; scene.add(m); confetti.push(m);
  }
}
function burst(pos, n = 120) {
  if (reducedMotion()) return;
  for (let i = 0; i < n && i < confetti.length; i++) {
    const m = confetti[i], a = Math.random() * Math.PI * 2, s = 1.2 + Math.random() * 1.8;
    m.position.copy(pos); m.visible = true;
    m.userData.life = 2.2 + Math.random() * 0.6;
    m.userData.v.set(Math.cos(a) * s * 0.6, 2.2 + Math.random() * 1.8, Math.sin(a) * s * 0.6);
    m.userData.spin.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
  }
}
const visibleTrail = () => trailDots.filter(m => m.visible).length;
const activeConfetti = () => confetti.filter(m => m.visible).length;
function updateFx(dt) {
  const calm = reducedMotion(), b = play.ball, rolling = play.phase === 'roll' || play.phase === 'drift';
  /* trail: a dot every 30 ms while rolling, each fading over 0.4 s */
  trailClock += dt;
  if (!calm && rolling && trailClock >= trailNext && Math.hypot(b.vx, b.vz) > 0.3) {
    trailNext = trailClock + 0.03;
    const m = trailDots.find(d => !d.visible) || trailDots[0];
    m.position.set(b.x, b.y + BALL_R * 0.6, b.z); m.visible = true; m.userData.life = 0.4;
  }
  for (const m of trailDots) if (m.visible) {
    m.userData.life -= dt;
    if (m.userData.life <= 0 || calm) { m.visible = false; continue; }
    m.material.opacity = m.userData.life / 0.4 * 0.55; m.scale.setScalar(0.4 + m.userData.life / 0.4 * 0.6);
  }
  /* squash on hard hits */
  const s = calm ? 0 : (play.fx.squash || 0);
  ballMesh.scale.set(1 + 0.22 * s, 1 - 0.28 * s, 1 + 0.22 * s);
  play.fx.squash = s * Math.exp(-14 * dt);
  /* flag pops up and spins when the ball drops */
  if (flagGroup) {
    const t = play.phase === 'sunk' && !calm ? play.fx.sunkT : -1;
    flagGroup.position.y = t >= 0 && t < 0.9 ? Math.sin(t / 0.9 * Math.PI) * 0.3 : 0;
    flagGroup.rotation.y = t >= 0 && t < 0.9 ? t / 0.9 * Math.PI * 2 : 0;
  }
  /* confetti */
  for (const m of confetti) if (m.visible) {
    const u = m.userData;
    u.life -= dt;
    if (u.life <= 0) { m.visible = false; continue; }
    u.v.y -= 4 * dt; u.v.multiplyScalar(Math.exp(-1.2 * dt));
    m.position.addScaledVector(u.v, dt);
    m.rotation.x += u.spin.x * dt; m.rotation.y += u.spin.y * dt; m.rotation.z += u.spin.z * dt;
  }
}
```

Hooks:
- In `renderFrame`, after `syncBall(dt);` add `updateFx(dt);`.
- In `boot()`, after `initAim();` add `initFx();`.
- In `endRoll`, in the `out === 'sunk'` branch, after `sfx('cup');` add: `if (play.round.score === 1) { burst(new THREE.Vector3(play.hole.cup[0], groundH(play.hole, ...play.hole.cup) + 0.1, play.hole.cup[1])); sfx('fanfare'); }`
- In `showCard`, after `showScene('card');` add: `burst(new THREE.Vector3().copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.6)), 140);`
- In `startHole`, after `hideAim();` add: `for (const m of trailDots.concat(confetti)) m.visible = false;`

- [ ] **Step 4: Run to verify it passes**

Run: `npm test && npm run lint`
Expected: all suites ok, `fx-check 7/7`, lint `0 finding(s)`.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/fx-check.cjs
git commit -m "feat(T3.1): trail, squash, flag pop, confetti, reduced-motion respect

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3.2: Snow world (vroom world 5)

**Files:**
- Modify: `index.html` (sim region world 5 pack after world 1; section 5b snow look)
- Modify: `tests/render-check.cjs` (one check: snow decor builds)

**Interfaces:**
- Consumes: `registerWorld`, `rect`, look-pack contract from Task 2.2.
- Produces: `WORLDS[5]` (9 holes with `sol`), `WORLD_LOOK[5]` with `post` (snowman), `mover` (snowball), `decor` (snowfall points, stored as `group.userData.snow`), `tick`.

- [ ] **Step 1: Add the failing render check** (before `check('no console errors'...` in `tests/render-check.cjs`)

```js
  const snow = await page.evaluate(() => { const ok = startHole('5-2'); renderFrame(0.016); return { ok, flakes: !!holeGroup.userData.snow, posts: play.hole.posts.length }; });
  check('snow world builds with snowfall and snowmen', snow.ok && snow.flakes && snow.posts === 3, JSON.stringify(snow));
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --only render-check`
Expected: FAIL `snow world builds...` (`startHole('5-2')` returns false).

- [ ] **Step 3: Author the snow holes** (sim region, after the world 1 pack)

```js
/* world 5, snow: ice patches (low friction), snowmen in the way, narrower lanes, a rolling snowball. */
const SNOWMAN = (x, z) => ({ x, z, r: 0.18, look: 'snowman' });
registerWorld(5, { holes: [
  { par: 2, tee: [0, 0.5], cup: [0, 4], shape: rect(-0.5, 0, 0.5, 4.5), zones: [{ surf: 'ice', poly: rect(-0.5, 1.5, 0.5, 3) }] },
  { par: 2, tee: [0, 0.5], cup: [0.2, 5.0], shape: rect(-0.6, 0, 0.6, 5.5), posts: [SNOWMAN(-0.25, 1.8), SNOWMAN(0.25, 3.0), SNOWMAN(-0.2, 4.2)] },
  { par: 3, tee: [0, 0.5], cup: [2.1, 3.5], shape: [[-0.5, 0], [0.5, 0], [0.5, 3], [2.6, 3], [2.6, 4], [-0.5, 4]], zones: [{ surf: 'ice', poly: rect(-0.5, 2.4, 2.6, 4) }] },
  { par: 3, tee: [0, 0.5], cup: [0.1, 4.6], shape: rect(-0.6, 0, 0.6, 5), bumps: [{ x: -0.5, z: 2.5, r: 0.7, h: 0.1 }], zones: [{ surf: 'ice', poly: rect(-0.6, 1.6, 0.6, 3.4) }] },
  { par: 3, tee: [0, 0.5], cup: [0, 4.5], shape: rect(-0.9, 0, 0.9, 5), inner: [[[-0.9, 2.4], [-0.25, 2.4]], [[0.25, 2.4], [0.9, 2.4]]],
    movers: [{ kind: 'slide', ax: -0.5, az: 3.3, bx: 0.5, bz: 3.3, r: 0.16, period: 2.4, phase: 0, look: 'snowball' }] },
  { par: 2, tee: [0, 0.5], cup: [0.5, 4.5], shape: [[-0.9, 0], [0.9, 0], [0.9, 1.5], [0.3, 1.5], [0.3, 3.5], [0.9, 3.5], [0.9, 5], [-0.9, 5], [-0.9, 3.5], [-0.3, 3.5], [-0.3, 1.5], [-0.9, 1.5]],
    zones: [{ surf: 'ice', poly: rect(-0.3, 1.5, 0.3, 3.5) }] },
  { par: 3, tee: [-0.65, 0.5], cup: [0.65, 0.5], shape: rect(-1.3, 0, 1.3, 3.2), inner: [[[0, 0], [0, 2.3]]], zones: [{ surf: 'ice', poly: rect(-1.3, 2.3, 1.3, 3.2) }] },
  { par: 3, tee: [0, 0.5], cup: [0.6, 4.4], shape: rect(-1, 0, 1, 5), bumps: [{ x: 0, z: 2.6, r: 0.6, h: -0.12 }],
    posts: [SNOWMAN(-0.45, 3.6), SNOWMAN(0.45, 3.6)], zones: [{ surf: 'ice', poly: rect(-1, 3.0, 1, 5) }] },
  { par: 4, tee: [0, 0.5], cup: [0.2, 6.4], shape: [[-1, 0], [1, 0], [1, 2.8], [2.6, 2.8], [2.6, 7], [-0.2, 7], [-0.2, 5.6], [1.4, 5.6], [1.4, 4], [-1, 4]],
    zones: [{ surf: 'ice', poly: rect(1.4, 2.8, 2.6, 5.6) }],
    movers: [{ kind: 'slide', ax: -0.1, az: 6.3, bx: 1.0, bz: 6.3, r: 0.16, period: 2.6, phase: 0, look: 'snowball' }] },
] });
```

- [ ] **Step 4: Prove the pars**

Run: `npm run solve -- --world 5`
Expected: nine `ok` lines. Paste each `sol` into its hole. Same rule as Task 2.1 Step 5 for any `MISSES PAR`.

- [ ] **Step 5: Snow look** (section 5b, after `WORLD_LOOK[1]`)

```js
const FLAKE_SVG = '<svg viewBox="0 0 64 64"><g stroke="#6fc0df" stroke-width="5" stroke-linecap="round"><path d="M32 6 V58 M9 19 L55 45 M9 45 L55 19"/><path d="M24 10 L32 17 L40 10 M24 54 L32 47 L40 54"/></g></svg>';
function snowman(p) {
  const g = new THREE.Group(), white = mat('#fffdf7', { roughness: 0.9 });
  const base = new THREE.Mesh(new THREE.SphereGeometry(p.r, 24, 16), white); base.position.y = p.r * 0.9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(p.r * 0.65, 24, 16), white); head.position.y = p.r * 2.3;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 12), mat('#ef7d6d')); nose.position.set(0, p.r * 2.3, -p.r * 0.7); nose.rotation.x = -Math.PI / 2;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.45, p.r * 0.45, p.r * 0.5, 20), mat('#5a4634')); hat.position.y = p.r * 2.95;
  base.castShadow = head.castShadow = hat.castShadow = true;
  g.add(base, head, nose, hat); return g;
}
function pine(r) {
  const g = new THREE.Group(), s = 0.7 + r() * 0.8;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.06 * s, 0.25 * s, 8), mat('#6e5233')); trunk.position.y = 0.12 * s;
  const tree = new THREE.Mesh(new THREE.ConeGeometry(0.32 * s, 0.9 * s, 10), mat('#4e9a45', { roughness: 0.9 })); tree.position.y = 0.65 * s;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, 0.3 * s, 10), mat('#fffdf7')); cap.position.y = 0.98 * s;
  tree.castShadow = true; g.add(trunk, tree, cap); return g;
}
WORLD_LOOK[5] = {
  felt: '#e8f3f6', wall: '#6fc0df', ground: '#fffdf7', sky: ['#bcd9ea', '#f4f8fa'], ice: '#bfe6f5', flag: '#ef7d6d', icon: FLAKE_SVG,
  jingle: [659, 784, 988, 1175, 1319],
  prop: r => r() < 0.75 ? pine(r) : snowman({ r: 0.14 + r() * 0.08 }),
  post: p => p.look === 'snowman' ? snowman(p) : defaultPost(p, lookOf(5)),
  mover: m => defaultMover(m, lookOf(5)),
  decor(group) {
    const n = 500, pos = new Float32Array(n * 3), r = rng32(5);
    for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * 16; pos[i * 3 + 1] = r() * 6; pos[i * 3 + 2] = (r() - 0.3) * 16; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.85, depthWrite: false }));
    group.add(pts); group.userData.snow = pts;
  },
  tick(group, dt) {
    const pts = group.userData.snow; if (!pts || reducedMotion()) return;
    const a = pts.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * 0.5; if (y < 0) y += 6; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(y * 2 + i) * dt * 0.05); }
    a.needsUpdate = true;
  },
};
```

In `renderFrame`, after `updateMovers(play.time);` add: `const lk = WORLD_LOOK[holeWorld(play.hole)]; if (lk && lk.tick) lk.tick(holeGroup, dt, play.time);`

- [ ] **Step 6: Run to verify it passes**

Run: `npm test && npm run lint`
Expected: all ok; `holes-check` now covers 18 holes; `render-check 11/11`.

- [ ] **Step 7: Commit**

```bash
git add index.html tests/render-check.cjs
git commit -m "feat(T3.2): snow world: 9 proven holes, ice, snowmen, snowballs, snowfall

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3.3: Space world (vroom world 8)

**Files:**
- Modify: `index.html` (sim region world 8 pack; section 5b space look)
- Modify: `tests/render-check.cjs` (space check), `package.json` (`"test"` sets `PUTTX_ALL_WORLDS=1` so holes-check demands all three worlds)

**Interfaces:**
- Consumes: as Task 3.2. Open holes use `floors` + `walls` + `ramps`.
- Produces: `WORLDS[8]` (9 holes, `g: 0.427`, `feltMu: 0.19`), `WORLD_LOOK[8]` with `ground: null`, `fog: false`, starfield `decor`, `post` (alien bumper), `mover` (asteroid).

- [ ] **Step 1: Add the failing checks**

In `tests/render-check.cjs`, before the console-errors check:
```js
  const space = await page.evaluate(() => { const ok = startHole('8-2'); renderFrame(0.016); return { ok, g: play.hole.g, open: play.hole.open, stars: !!holeGroup.userData.stars, fog: scene.fog }; });
  check('space builds open, low gravity, starfield, no fog', space.ok && space.g === 0.427 && space.open && space.stars && space.fog === null, JSON.stringify(space));
```
In `package.json`, change `"test"` to `"PUTTX_ALL_WORLDS=1 node tests/run-all.cjs"`.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- --only render-check,holes-check`
Expected: FAIL on the space check and `all three worlds are registered`.

- [ ] **Step 3: Author the space holes** (sim region, after the world 5 pack)

```js
/* world 8, space: vroom's low gravity (640 / 1500), jumps over gaps, crater bowls, drifting
   asteroids, alien bumpers. Felt is grippier so rolls feel like Earth; only slopes and air float. */
const ALIEN = (x, z) => ({ x, z, r: 0.15, e: 1.1, look: 'alien' });
const ROCK = (ax, az, bx, bz, period) => ({ kind: 'slide', ax, az, bx, bz, r: 0.2, period, phase: 0, look: 'asteroid' });
registerWorld(8, { g: 0.427, feltMu: 0.19, holes: [
  { par: 2, tee: [0, 0.5], cup: [-0.2, 4], shape: rect(-0.7, 0, 0.7, 4.5), bumps: [{ x: 0.3, z: 2.3, r: 0.6, h: -0.12 }] },
  { par: 2, tee: [0, 0.5], cup: [0, 6.2], floors: [rect(-0.6, 0, 0.6, 3), rect(-0.6, 3.8, 0.6, 7)],
    walls: [[[-0.6, 3], [-0.6, 2.2], [-0.6, 0], [0.6, 0], [0.6, 2.2], [0.6, 3]], [[-0.6, 3.8], [-0.6, 7], [0.6, 7], [0.6, 3.8]]],
    ramps: [{ x0: -0.6, z0: 2.2, x1: 0.6, z1: 3, axis: 'z', h: 0.2 }] },
  { par: 2, tee: [0, 0.5], cup: [0, 4.5], shape: rect(-0.8, 0, 0.8, 5), movers: [ROCK(-0.55, 2.5, 0.55, 2.5, 2.2), ROCK(0.55, 3.6, -0.55, 3.6, 2.8)] },
  { par: 2, tee: [0, 0.5], cup: [0.3, 4.5], shape: rect(-1, 0, 1, 5), posts: [ALIEN(-0.4, 2), ALIEN(0.4, 2.6), ALIEN(-0.3, 3.4)] },
  { par: 3, tee: [0, 0.5], cup: [0.3, 5.4], shape: rect(-1, 0, 1, 6),
    bumps: [{ x: -0.4, z: 2, r: 0.5, h: -0.1 }, { x: 0.45, z: 3.3, r: 0.5, h: -0.1 }, { x: -0.3, z: 4.6, r: 0.45, h: -0.1 }] },
  { par: 3, tee: [0, 0.5], cup: [2.1, 5.6], floors: [rect(-0.6, 0, 0.6, 2.8), [[-0.6, 3.6], [0.6, 3.6], [0.6, 5], [2.6, 5], [2.6, 6.2], [-0.6, 6.2]]],
    walls: [[[-0.6, 2.8], [-0.6, 2], [-0.6, 0], [0.6, 0], [0.6, 2], [0.6, 2.8]], [[0.6, 3.6], [0.6, 5], [2.6, 5], [2.6, 6.2], [-0.6, 6.2], [-0.6, 3.6]]],
    ramps: [{ x0: -0.6, z0: 2, x1: 0.6, z1: 2.8, axis: 'z', h: 0.2 }] },
  { par: 3, tee: [0, 0.5], cup: [0, 5], shape: rect(-0.9, 0, 0.9, 5.5), bumps: [{ x: 0, z: 2.7, r: 0.7, h: 0.18 }], movers: [ROCK(-0.6, 4, 0.6, 4, 2.4)] },
  { par: 3, tee: [0, 0.5], cup: [0, 7.6], floors: [rect(-0.6, 0, 0.6, 2.6), rect(-0.6, 3.4, 0.6, 5.4), rect(-0.6, 6.2, 0.6, 8.2)],
    walls: [[[-0.6, 2.6], [-0.6, 1.9], [-0.6, 0], [0.6, 0], [0.6, 1.9], [0.6, 2.6]], [[-0.6, 3.4], [-0.6, 4.7], [-0.6, 5.4]], [[0.6, 3.4], [0.6, 4.7], [0.6, 5.4]],
      [[-0.6, 6.2], [-0.6, 8.2], [0.6, 8.2], [0.6, 6.2]]],
    ramps: [{ x0: -0.6, z0: 1.9, x1: 0.6, z1: 2.6, axis: 'z', h: 0.2 }, { x0: -0.6, z0: 4.7, x1: 0.6, z1: 5.4, axis: 'z', h: 0.2 }] },
  { par: 4, tee: [0, 0.5], cup: [0, 7.4], floors: [rect(-0.8, 0, 0.8, 3), rect(-1.2, 3.8, 1.2, 8)],
    walls: [[[-0.8, 3], [-0.8, 2.2], [-0.8, 0], [0.8, 0], [0.8, 2.2], [0.8, 3]], [[-1.2, 3.8], [-1.2, 8], [1.2, 8], [1.2, 3.8]]],
    ramps: [{ x0: -0.8, z0: 2.2, x1: 0.8, z1: 3, axis: 'z', h: 0.2 }], bumps: [{ x: -0.5, z: 5.6, r: 0.5, h: -0.1 }],
    posts: [ALIEN(0.5, 5.2)], movers: [ROCK(-0.8, 6.6, 0.8, 6.6, 2.6)] },
] });
```

- [ ] **Step 4: Prove the pars**

Run: `npm run solve -- --world 8`
Expected: nine `ok` lines. Paste each `sol`. Jump holes fail first if the ramp is too shallow: raise the ramp `h` by 0.04 before widening anything else.

- [ ] **Step 5: Space look** (section 5b)

```js
const PLANET_SVG = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="16" fill="#b7a7e0"/><ellipse cx="32" cy="34" rx="28" ry="8" fill="none" stroke="#ffd66e" stroke-width="5" transform="rotate(-18 32 34)"/><circle cx="26" cy="27" r="3" fill="#8f7dc6"/></svg>';
function alien(p) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(p.r, 24, 16), mat('#74c465', { roughness: 0.4, emissive: 0x1a3a14 })); body.position.y = p.r;
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(p.r * 0.28, 12, 8), mat('#fffdf7', { roughness: 0.3 })); eye.position.set(s * p.r * 0.38, p.r * 1.3, -p.r * 0.75);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(p.r * 0.13, 10, 8), mat('#4a3826')); pupil.position.set(s * p.r * 0.38, p.r * 1.3, -p.r * 0.98);
    g.add(eye, pupil);
  }
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, p.r, 6), mat('#4e9a45')); ant.position.y = p.r * 2.4;
  const bob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), mat('#ffd66e', { emissive: 0x806020 })); bob.position.y = p.r * 2.9;
  body.castShadow = true; g.add(body, ant, bob); return g;
}
function asteroid(m) {
  const g = new THREE.Group(), r = rng32(Math.round(m.ax * 100 + m.az * 10));
  const geo = new THREE.IcosahedronGeometry(m.r, 1), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) { const k = 0.85 + r() * 0.3; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k, a.getZ(i) * k); }
  geo.computeVertexNormals();
  const s = new THREE.Mesh(geo, mat('#9d93b8', { roughness: 1, flatShading: true })); s.castShadow = true; g.add(s); return g;
}
function moonRock(r) {
  const s = 0.08 + r() * 0.18, m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat('#8f86a8', { roughness: 1, flatShading: true }));
  m.position.y = s * 0.5; m.castShadow = true; const g = new THREE.Group(); g.add(m); return g;
}
WORLD_LOOK[8] = {
  felt: '#b7b3c9', wall: '#ef7d6d', ground: null, fog: false, sky: ['#0b0820', '#2a1f4a'], flag: '#ffd66e', icon: PLANET_SVG,
  jingle: [392, 587, 784, 587, 1175],
  prop: null,
  post: p => p.look === 'alien' ? alien(p) : defaultPost(p, lookOf(8)),
  mover: m => m.look === 'asteroid' ? asteroid(m) : defaultMover(m, lookOf(8)),
  decor(group, h) {
    const n = 900, pos = new Float32Array(n * 3), r = rng32(8);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(a) * s * 40; pos[i * 3 + 1] = Math.abs(u) * 40 - 6; pos[i * 3 + 2] = Math.sin(a) * s * 40;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff4e0, size: 0.12, sizeAttenuation: true }));
    group.add(stars); group.userData.stars = stars;
    const pts = h.floors.flat(), r2 = rng32(81);
    for (let i = 0; i < 18; i++) {
      const o = moonRock(r2), base = pts[Math.floor(r2() * pts.length)];
      o.position.set(base[0] + (r2() - 0.5) * 2.5, -0.4 - r2() * 1.5, base[1] + (r2() - 0.5) * 2.5); group.add(o);
    }
  },
};
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test && npm run lint`
Expected: all ok; `holes-check` covers all 27 holes and passes `all three worlds are registered`; `render-check 12/12`.

- [ ] **Step 7: Play the whole game once**

Run: `python3 -m http.server 4173`, open `http://localhost:4173/`, clear storage, and play world 1 through world 8 hole 9 by hand (or `?hole=8-9`). Expected: every hole finishable, jumps feel floaty, ice slides, card after each world. Note anything that feels wrong in `TASKS.md` under the task as a follow-up line, not a silent fix.

- [ ] **Step 8: Commit**

```bash
git add index.html package.json tests/render-check.cjs
git commit -m "feat(T3.3): space world: 9 proven holes, ramps over gaps, craters, aliens, asteroids

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 4: Ship

### Task 4.1: Home-screen install, CI, perf guard, README

**Files:**
- Create: `manifest.webmanifest`, `docs/icons/icon.svg`, `scripts/render-icons.cjs` (copy of `~/dev/vroom/scripts/render-icons.cjs` with background `#fff8ec`), `docs/icons/*.png` (generated), `.github/workflows/test.yml`, `README.md`, `tests/perf-check.cjs`
- Modify: `index.html` (`<link rel="manifest">`, `<link rel="apple-touch-icon">`, `<link rel="icon">`)

**Interfaces:**
- Consumes: everything.
- Produces: an installable, CI-tested repo.

- [ ] **Step 1: Write the failing perf/install suite**

`tests/perf-check.cjs`:
```js
/* perf-check (browser): the page links a manifest and an apple-touch-icon that both resolve,
   the renderer stays inside the iPad budget (pixel ratio <= 2, one 1024 shadow map), and the
   biggest hole stays under the triangle budget. Frame time under SwiftShader is printed only:
   CI has no GPU, so it is not a pass/fail signal. */
'use strict';
const { check, done, open } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  const links = await page.evaluate(async () => {
    const m = document.querySelector('link[rel=manifest]'), a = document.querySelector('link[rel=apple-touch-icon]');
    const ok = async l => !!l && (await fetch(l.href)).ok;
    return { manifest: await ok(m), icon: await ok(a) };
  });
  check('manifest and apple-touch-icon resolve', links.manifest && links.icon, JSON.stringify(links));
  const budget = await page.evaluate(() => {
    let maxTris = 0, worst = '';
    for (const w of WORLD_ORDER) for (const h of WORLDS[w].holes) {
      startHole(h.key); renderFrame(0.016);
      const t = renderer.info.render.triangles; if (t > maxTris) { maxTris = t; worst = h.key; }
    }
    return { pr: renderer.getPixelRatio(), map: sun.shadow.mapSize.x, maxTris, worst };
  });
  check('pixel ratio <= 2 and one 1024 shadow map', budget.pr <= 2 && budget.map === 1024, JSON.stringify(budget));
  check('every hole renders under 400k triangles (shadow pass included)', budget.maxTris < 400000, JSON.stringify(budget));
  const ms = await page.evaluate(() => { startHole('8-9'); const t0 = performance.now(); for (let i = 0; i < 30; i++) renderFrame(1 / 60); return (performance.now() - t0) / 30; });
  console.log(`info  8-9 frame time under SwiftShader: ${ms.toFixed(1)} ms`);
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --only perf-check`
Expected: FAIL `manifest and apple-touch-icon resolve`.

- [ ] **Step 3: Install files**

`docs/icons/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#74c465"/><ellipse cx="256" cy="420" rx="170" ry="34" fill="#4e9a45"/><ellipse cx="330" cy="404" rx="54" ry="16" fill="#3a2c1e"/><path d="M330 404 V96" stroke="#fff8ec" stroke-width="16" stroke-linecap="round"/><path d="M338 98 L440 132 L338 166 Z" fill="#ef7d6d"/><circle cx="190" cy="330" r="74" fill="#fffdf7" stroke="#e6d2ab" stroke-width="10"/><path d="M116 330 H264" stroke="#ffd66e" stroke-width="22"/></svg>
```
`manifest.webmanifest`:
```json
{
  "name": "PuttX",
  "short_name": "PuttX",
  "description": "Mini golf for a 3 to 5 year old. One file, no reading, nothing to lose.",
  "id": "./",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "landscape",
  "background_color": "#fff8ec",
  "theme_color": "#2f241a",
  "lang": "en",
  "categories": ["games", "kids"],
  "icons": [
    { "src": "docs/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "docs/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "docs/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "docs/icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```
`index.html` `<head>`, after the `<title>`:
```html
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="docs/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" sizes="180x180" href="docs/icons/apple-touch-icon.png">
```
Copy the icon script and render:
```bash
cp ~/dev/vroom/scripts/render-icons.cjs scripts/render-icons.cjs
sed -i '' 's/#fdf6ea/#fff8ec/' scripts/render-icons.cjs
npm run icons
```
Expected: four PNGs in `docs/icons/`. Read the copied script once to confirm it has no vroom-specific paths beyond `docs/icons`.

`.github/workflows/test.yml`:
```yaml
name: tests

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: tests-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  suites:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright-core install --with-deps --no-shell chromium
      - run: npm run lint
      - run: npm test
```

`README.md` (player and parent notes, no em dashes):
```markdown
# PuttX

3D mini golf for a 3 to 5 year old, set in [vroom](https://github.com/zacker3310/vroom)'s worlds:
construction day, snow and space, 9 holes each. One `index.html`, no reading, nothing to lose.
Play at **https://zacker3310.github.io/puttX/**.

## How to play

Drag back anywhere on the course. The arrow shows where the ball goes, the ring shows how hard.
Let go to putt. Sink it in as few putts as you can; the flag and the number next to it are par.

## For grown-ups

- **No fail states.** After par + 3 putts the ball rolls itself in. Stars (1 finish, 2 par,
  3 under par) and best scores only ever go up.
- **Harder as you go.** Construction teaches walls, banks and slopes; snow adds ice and snowmen;
  space adds low gravity, jumps over gaps, craters and drifting asteroids.
- **Quiet mode.** The speaker on the map mutes everything. It sticks.
- **Home screen.** In Safari: Share, then Add to Home Screen. It launches full screen in landscape.
- **Progress** lives in this browser's local storage. Clearing website data resets it.

## Development

See `CLAUDE.md`. `npm ci && npx playwright-core install chromium && npm test`.
Every par is proven by a bot (`npm run solve`) and replayed by the suite.

MIT licence. three.js r170 is inlined under its MIT licence.
```

- [ ] **Step 4: Run everything**

Run: `npm run lint && npm test`
Expected: lint `0 finding(s)`; every suite ok, `perf-check 4/4` plus the info line.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(T4.1): home-screen install, icons, CI workflow, perf guard, README

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4.2: Publish to GitHub Pages (needs Zac's go-ahead)

**Files:** none (repo settings and remote)

**Interfaces:** Consumes the finished repo. Produces `https://zacker3310.github.io/puttX/`.

- [ ] **Step 1: Stop and ask.** Creating a public GitHub repo and turning on Pages is outward-facing. Show Zac the final `npm test` table and ask to publish. Do not run Step 2 without a yes in this conversation.

- [ ] **Step 2: Create, push, enable Pages**

```bash
gh repo view zacker3310/puttX >/dev/null 2>&1 && echo "repo exists: stop and ask" || gh repo create zacker3310/puttX --public --source . --remote origin --push
gh api -X POST repos/zacker3310/puttX/pages -f 'source[branch]=main' -f 'source[path]=/'
```

- [ ] **Step 3: Verify it is live**

```bash
for i in $(seq 1 30); do curl -sf https://zacker3310.github.io/puttX/ -o /dev/null && break; sleep 10; done
curl -sf https://zacker3310.github.io/puttX/ | grep -c 'three:begin'
PUTTX_URL=https://zacker3310.github.io/puttX/index.html npm test -- --only boot-check,ui-check
gh run list --repo zacker3310/puttX --limit 1
```
Expected: `1`, both suites ok against the live URL, latest CI run `completed success`.

- [ ] **Step 4: Close the queue**

Tick every task in `TASKS.md`, commit `docs: v1 shipped`, push.
