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
  const title = await page.evaluate(() => { for (const a of document.getAnimations()) a.finish(); return { scene: currentScene, phase: play.phase, go: Math.min(titleGo.getBoundingClientRect().width, titleGo.getBoundingClientRect().height) }; });
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

  /* arriving at hole 9 without the earlier records (?hole=, or a gapped save) must not dead-end */
  await fresh(page, '?hole=1-9');
  const gap = await page.evaluate(() => {
    const errs = []; addEventListener('error', e => errs.push(String(e.message)));
    loopPaused = true; play.ball = newBall(play.hole, play.hole.cup[0], play.hole.cup[1] - 0.25);
    beginPutt(0, 0); for (let i = 0; i < 400 && play.phase !== 'done'; i++) advance(1 / 60);
    try { doneNext.click(); } catch (e) { errs.push(e.message); }
    return { scene: currentScene, errs };
  });
  check('hole 9 without earlier records goes to the map instead of a broken card', gap.scene === 'map' && gap.errs.length === 0, JSON.stringify(gap));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
