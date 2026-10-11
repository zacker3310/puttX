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
