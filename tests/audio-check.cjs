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
  check('every SFX plays without throwing (17 sounds + roll)', all.bad.length === 0 && all.n === 17, JSON.stringify(all));

  const q = await page.evaluate(() => { setSound(false); return { g: master.gain.value, saved: JSON.parse(localStorage.getItem('puttx.v2')).sound }; });
  check('quiet mode zeroes the master gain and saves', q.g === 0 && q.saved === false, JSON.stringify(q));
  await page.evaluate(() => setSound(true));

  /* a ball riding a wall or a mover logs a hit every physics step; the speaker must not machine-gun */
  const spam = await page.evaluate(() => {
    startHole(playable()[0] + '-1'); loopPaused = true;
    const before = sfxLog.length;
    for (let f = 0; f < 60; f++) { for (let i = 0; i < 4; i++) play.ball.hits.push(['wall', 0.5], ['mover', 0.5]); advance(1 / 60); }
    const loud = sfxLog.slice(before), mid = sfxLog.length;
    for (let f = 0; f < 60; f++) { for (let i = 0; i < 4; i++) play.ball.hits.push(['wall', 0.05], ['mover', 0.05]); advance(1 / 60); }
    return { clonk: loud.filter(n => n === 'clonk').length, boing: loud.filter(n => n === 'boing').length, grazes: sfxLog.length - mid };
  });
  check('sustained contact plays at most ~16 clonks and boings a second', spam.clonk >= 1 && spam.clonk <= 17 && spam.boing >= 1 && spam.boing <= 17, JSON.stringify(spam));
  check('grazing contacts stay silent', spam.grazes === 0, JSON.stringify(spam));

  const next = await page.evaluate(() => {
    startHole(playable()[0] + '-1'); loopPaused = true; for (let f = 0; f < 300; f++) advance(1 / 60);
    play.ball.hits.push(['wall', 0.5]); advance(1 / 60);
    startHole(playable()[0] + '-2'); loopPaused = true; const n = sfxLog.length;
    play.ball.hits.push(['wall', 0.5]); advance(1 / 60);
    return sfxLog.slice(n);
  });
  check('the first wall hit on the next hole still clonks', next.includes('clonk'), JSON.stringify(next));

  /* iOS only honours resume() inside an activation gesture (pointerup, click), not a touch pointerdown,
     and reports 'interrupted' after a call or backgrounding: any later tap must bring the sound back */
  await page.evaluate(() => actx.suspend());
  await page.evaluate(() => dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3 })));
  await page.waitForTimeout(250);
  const back = await page.evaluate(() => actx.state);
  check('a tap release resumes suspended audio', back === 'running', back);

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
