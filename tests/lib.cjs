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
