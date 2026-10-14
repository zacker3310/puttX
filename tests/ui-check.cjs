/* ui-check (browser): title -> map -> hole -> result -> next -> card, with no words and no tap
   target under 64 px anywhere; ten course tabs, 18 holes per course; locked holes and courses
   boink; a course's last hole opens its card, which totals 18 holes and leads to the next
   course; the speaker toggle persists. Title -> worlds -> world map -> course map -> hole. */
'use strict';
const { check, done, open, fresh, visibleLetters, smallTargets } = require('./lib.cjs');
const tap = (page, id) => page.evaluate(i => document.getElementById(i).click(), id);
const sinkFrom = `(x, z) => { loopPaused = true; play.ball = newBall(play.hole, x, z); beginPutt(Math.atan2(play.hole.cup[0] - x, play.hole.cup[1] - z) * 180 / Math.PI, 0); for (let i = 0; i < 400 && play.phase !== 'done'; i++) advance(1 / 60); }`;
const sinkHere = `(() => { const h = play.hole; (${sinkFrom})(h.cup[0], h.cup[1] - 0.2); })()`;

(async () => {
  const { browser, page, errors } = await open();
  await fresh(page);
  await page.waitForTimeout(300);
  const first = await page.evaluate(() => playable()[0]), count = await page.evaluate(() => playable().length);
  const title = await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish(); } catch (e) {} } return { scene: currentScene, phase: play.phase, go: Math.min(titleGo.getBoundingClientRect().width, titleGo.getBoundingClientRect().height) }; });
  check('title: a showcase hole orbits behind a big GO', title.scene === 'title' && title.phase === 'title' && title.go >= 120, JSON.stringify(title));
  check('title: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0);

  await tap(page, 'titleGo');
  const worlds = await page.evaluate(() => ({ scene: currentScene, cards: worldGrid.children.length, locked: worldGrid.querySelectorAll('.locked').length }));
  check('worlds: ten world cards, only the first open', worlds.scene === 'worlds' && worlds.cards === 10 && worlds.locked === 9, JSON.stringify(worlds));
  check('worlds: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));
  await page.evaluate(() => worldGrid.children[9].click());
  check('a locked world boinks and stays put', await page.evaluate(() => currentScene === 'worlds' && sfxLog.slice(-1)[0] === 'boink'));
  await page.evaluate(() => worldGrid.children[0].click());
  const wm = await page.evaluate(() => ({ scene: currentScene, nodes: worldNodes.children.length, want: coursesOf(playable()[0]).length * 2, open: worldNodes.querySelectorAll('.cnode:not(.locked)').length, ball: worldBall.classList.contains('show') }));
  check('world map: a day and a night node per course, only course 1 open, the ball on it', wm.scene === 'world' && wm.nodes === wm.want && wm.open === 1 && wm.ball, JSON.stringify(wm));
  check('world map: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));
  const wOverlap = await page.evaluate(() => {
    const rs = [...worldNodes.children, worldBack, trophyBtn, worldBadge].map(b => b.getBoundingClientRect()), bad = [];
    rs.forEach((a, i) => rs.forEach((b, j) => { if (j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) bad.push(i + '/' + j); }));
    return bad;
  });
  check('world map buttons never overlap', wOverlap.length === 0, wOverlap.join());
  await page.evaluate(() => worldNodes.children[0].click());
  const map = await page.evaluate(() => ({ scene: currentScene, nodes: holePath.querySelectorAll('.node').length, holes: WORLDS[mapWorld].holes.length,
    open: holePath.querySelectorAll('.node:not(.locked)').length }));
  check('course map: a node per hole, only hole 1 open', map.scene === 'map' && map.nodes === map.holes && map.open === 1, JSON.stringify(map));
  check('map: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));
  const overlap = await page.evaluate(() => {
    const rs = [...holePath.querySelectorAll('.node'), mapBack, mapBadge, practiceBtn, mapLost].map(b => b.getBoundingClientRect()), bad = [];
    rs.forEach((a, i) => rs.forEach((b, j) => { if (j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) bad.push(i + '/' + j); }));
    return bad;
  });
  check('map buttons never overlap each other', overlap.length === 0, overlap.join());

  await page.evaluate(() => holePath.querySelectorAll('.node')[4].click());
  const boink = await page.evaluate(() => ({ scene: currentScene, world: mapWorld, log: sfxLog.slice(-1).join() }));
  check('a locked hole boinks and stays put', boink.scene === 'map' && boink.world === first && boink.log === 'boink', JSON.stringify(boink));

  await page.evaluate(() => holePath.querySelectorAll('.node')[0].click());
  check('hole 1 opens the hole scene', await page.evaluate(f => currentScene === 'hole' && play.key === f + '-1', first));
  check('hole scene: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));
  await tap(page, 'homeBtn');
  check('home goes back to the map', await page.evaluate(() => currentScene === 'map'));

  /* finish hole 1 for real, then next */
  await page.evaluate(`goHole(playable()[0] + '-1'); ${sinkHere}`);
  check('result card: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0);
  await tap(page, 'doneNext');
  check('next goes to hole 2', await page.evaluate(f => play.key === f + '-2' && currentScene === 'hole', first));
  await page.evaluate(() => { loopPaused = false; showMap(playable()[0]); });
  const m2 = await page.evaluate(() => { const n = holePath.querySelectorAll('.node')[0]; return { stars: n.querySelectorAll('.star.on').length, best: n.querySelector('.best').textContent, open2: !holePath.querySelectorAll('.node')[1].classList.contains('locked') }; });
  check('map shows hole 1 stars and best, hole 2 open', m2.stars >= 2 && m2.best === '1' && m2.open2, JSON.stringify(m2));

  /* the card after the course's last hole */
  const card = await page.evaluate(`(() => {
    const w = playable()[0], hs = WORLDS[w].holes;
    for (const h of hs.slice(0, -1)) recordHole(progress, h.key, h.par, h.par);
    startHole(hs[hs.length - 1].key); play.round.strokes = 3; ${sinkHere};
    doneNext.click();
    const pars = hs.reduce((a, h) => a + h.par, 0), total = hs.reduce((a, h) => a + progress.holes[h.key].best, 0);
    return { scene: currentScene, cells: cardRow.children.length, holes: hs.length, total: cardTotal.textContent, want: String(total), diff: cardDiff.textContent, wantDiff: total - pars,
      next: getComputedStyle(cardNext).display !== 'none', worlds: progress.worlds.join(), second: playable()[1], c2: WORLDS[w + COURSE_STEP] ? w + COURSE_STEP : 0 };
  })()`);
  check('after the last hole the card shows every hole and the total', card.scene === 'card' && card.cells === card.holes && card.total === card.want, JSON.stringify(card));
  check('card shows strokes against par with a sign', card.diff === (card.wantDiff > 0 ? '+' : '') + card.wantDiff, JSON.stringify(card));
  if (count > 1) check('the next world and the next course unlocked; the card offers them', card.worlds === [first, card.second].concat(card.c2 ? [card.c2] : [], [100 + first]).join() && card.next, JSON.stringify(card));
  check('card: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0);
  if (count > 1) {
    await tap(page, 'cardNext');
    check('next opens the world map with the next course waiting', await page.evaluate(() => currentScene === 'world' && worldNodes.querySelectorAll('.cnode:not(.locked)').length >= 2));
  }

  await page.evaluate(() => showMap());
  await tap(page, 'soundBtn');
  check('speaker toggle mutes and persists', await page.evaluate(() => JSON.parse(localStorage.getItem('puttx.v2')).sound === false && soundBtn.classList.contains('off')));

  /* arriving at the last hole without the earlier records (?hole=, or a gapped save) must not dead-end */
  const lastKey = await page.evaluate(() => { const hs = WORLDS[playable()[0]].holes; return hs[hs.length - 1].key; });
  await fresh(page, '?hole=' + lastKey);
  const gap = await page.evaluate(`(() => {
    const errs = []; addEventListener('error', e => errs.push(String(e.message)));
    ${sinkHere};
    try { doneNext.click(); } catch (e) { errs.push(e.message); }
    return { scene: currentScene, errs };
  })()`);
  check('the last hole without earlier records goes to the map instead of a broken card', gap.scene === 'map' && gap.errs.length === 0, JSON.stringify(gap));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
