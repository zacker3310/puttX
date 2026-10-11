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

  const sc = await page.evaluate(() => [...document.querySelectorAll('.scene.active')].map(s => s.id).join(',') + '|' + currentScene);
  check('title is the only active scene', sc === 'title|title', sc);

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
