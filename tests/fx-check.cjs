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
