#!/usr/bin/env node
/* lint: writes the game source (src/game.js with every course pack inlined, exactly as
   scripts/build.cjs ships it) to a temp .js file and runs ESLint over it.
   Names unused inside the script but referenced from the test suites are reported as
   "external", not as findings. Exit 1 when any real finding remains. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ESLint } = require('eslint');

const ROOT = path.resolve(__dirname, '..');
const { gameSource } = require('../scripts/build.cjs');
const src = gameSource();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'puttx-lint-'));
const tmp = path.join(dir, 'game.js');
fs.writeFileSync(tmp, src);

const external = new Set();
for (const f of fs.readdirSync(__dirname)) {
  if (!f.endsWith('-check.cjs')) continue;
  for (const m of fs.readFileSync(path.join(__dirname, f), 'utf8').matchAll(/[A-Za-z_$][\w$]*/g)) external.add(m[0]);
}

/* map a line of the assembled source back to src/game.js or the course file it came from */
function where(line) {
  const lines = src.split('\n');
  for (let i = line - 1; i >= 0; i--) {
    if (/^\/\* ---- end of /.test(lines[i])) break;
    const m = lines[i].match(/^\/\* ---- ((?:courses|src)\/[\w.]+\.js) ---- \*\//); if (m) return `${m[1]}:${line - i - 1}`;
  }
  return `src/game.js~${line}`;
}
(async () => {
  const eslint = new ESLint({ cwd: dir, overrideConfigFile: path.join(ROOT, 'eslint.config.js') });
  const [result] = await eslint.lintFiles([tmp]);
  const findings = [];
  let ext = 0;
  for (const m of result.messages) {
    const name = (m.message.match(/'([^']+)'/) || [])[1];
    if (m.ruleId === 'no-unused-vars' && name && external.has(name)) { ext++; continue; }
    findings.push(`${where(m.line)}:${m.column}  ${m.ruleId}  ${m.message}  | ${src.split('\n')[m.line - 1].trim().slice(0, 80)}`);
  }
  for (const f of findings) console.log(f);
  console.log(`\n${findings.length} finding(s), ${ext} external-only name(s)`);
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(findings.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
