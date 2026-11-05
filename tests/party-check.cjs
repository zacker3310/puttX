/* party-check (browser): pass and play. The map's party button offers 2, 3 or 4 players; each
   player plays the hole out in turn with their own ball colour; the hole's scoreboard crowns the
   best score and the honour passes to it; nothing is saved (no stars, coins or mulligans); the
   course ends on a scorecard with a row per player and a crown; leaving ends the party. No words
   and no small targets anywhere along the way. */
'use strict';
const { check, done, open, fresh, visibleLetters, smallTargets } = require('./lib.cjs');
const tap = (page, id) => page.evaluate(i => document.getElementById(i).click(), id);
/* sink the ball from 20 cm short of the cup after `extra` wasted strokes */
const sink = extra => `(() => { loopPaused = true; play.round.strokes += ${extra}; const h = play.hole, x = h.cup[0], z = h.cup[1] - 0.2;
  play.ball = newBall(h, x, z); beginPutt(Math.atan2(h.cup[0] - x, h.cup[1] - z) * 180 / Math.PI, 0);
  for (let i = 0; i < 400 && play.phase !== 'done'; i++) advance(1 / 60); })()`;
const clean = async (page, what) => {
  const words = await visibleLetters(page), small = await smallTargets(page);
  check(`${what}: no words, no small targets`, words.length === 0 && small.length === 0, JSON.stringify({ words, small }));
};

(async () => {
  const { browser, page, errors } = await open();
  await fresh(page, '?map');
  const before = await page.evaluate(() => { showMap(playable()[0]); return JSON.stringify(progress); });
  await tap(page, 'partyBtn');
  check('the party button offers 2, 3 or 4 players', await page.evaluate(() => partyPick.classList.contains('show') && ['partyN2', 'partyN3', 'partyN4'].every(i => document.getElementById(i).getClientRects().length)));
  await clean(page, 'player picker');
  await tap(page, 'partyN2');
  const s1 = await page.evaluate(() => ({ scene: currentScene, key: play.key, chip: partyChip.classList.contains('show'), p: partyPlayer(), mull: canMulligan() }));
  check('two players: hole 1 opens with player 1 up', s1.scene === 'hole' && /-1$/.test(s1.key) && s1.chip && s1.p === 0, JSON.stringify(s1));
  await page.evaluate(() => { play.intro = null; holeBanner.classList.remove('show'); });
  await clean(page, 'party hole');

  /* player 1 sinks in 1; the pass screen hands over to player 2, whose ball is a different colour */
  await page.evaluate(sink(0));
  const pass = await page.evaluate(() => ({ pass: partyPass.classList.contains('show'), p: partyPlayer(), done: holeDone.classList.contains('show') }));
  check('after player 1 holes out the device passes to player 2 (no result card)', pass.pass && pass.p === 1 && !pass.done, JSON.stringify(pass));
  await clean(page, 'pass screen');
  await tap(page, 'partyPass');
  const s2 = await page.evaluate(() => ({ key: play.key, strokes: play.round.strokes, colour: ballMesh.material.color.getHexString(), chip: partyChipBall.textContent }));
  check('player 2 tees off the same hole with their own ball', /-1$/.test(s2.key) && s2.strokes === 0 && s2.colour !== 'ffffff' && s2.chip === '2', JSON.stringify(s2));

  /* player 2 takes 3: player 1 is crowned and keeps the honour */
  await page.evaluate(sink(2));
  const board = await page.evaluate(() => ({ show: partyDone.classList.contains('show'), rows: partyRows.children.length, crowns: partyRows.querySelectorAll('.crown').length, order: party.order.join() }));
  check('the hole scoreboard lists both players and crowns the best', board.show && board.rows === 2 && board.crowns === 1, JSON.stringify(board));
  check('the honour goes to the lowest score', board.order === '0,1', JSON.stringify(board));
  await clean(page, 'hole scoreboard');

  /* hole 2: player 2 wins it, so player 2 tees off first on hole 3 */
  await tap(page, 'partyNextBtn');
  const h2 = await page.evaluate(() => ({ key: play.key, p: partyPlayer() }));
  check('next hole starts with the player holding the honour', /-2$/.test(h2.key) && h2.p === 0, JSON.stringify(h2));
  await page.evaluate(sink(3)); await tap(page, 'partyPass'); await page.evaluate(sink(0));
  const h3 = await page.evaluate(() => { partyNextBtn.click(); return { key: play.key, p: partyPlayer(), order: party.order.join() }; });
  check('winning a hole takes the honour', /-3$/.test(h3.key) && h3.p === 1 && h3.order === '1,0', JSON.stringify(h3));

  /* play the course out and check the scorecard */
  const card = await page.evaluate(`(() => {
    for (let guard = 0; guard < 200 && currentScene === 'hole'; guard++) {
      if (partyPass.classList.contains('show')) partyPass.click();
      else if (partyDone.classList.contains('show')) partyNextBtn.click();
      else ${sink(0)};
    }
    return { scene: currentScene, rows: cardRow.querySelectorAll('.sc.lb .pball').length, nines: cardRow.children.length, crown: !!cardStars.querySelector('.crown'), next: getComputedStyle(cardNext).display };
  })()`);
  check('the course ends on a scorecard with a row per player, nine by nine', card.scene === 'card' && card.rows === 2 * card.nines, JSON.stringify(card));
  check('the winner is crowned and the card offers no next course', card.crown && card.next === 'none', JSON.stringify(card));
  await clean(page, 'party scorecard');
  const after = await page.evaluate(() => JSON.stringify(progress));
  check('a party saves nothing: no stars, coins, mulligans or unlocks', after === before);
  await tap(page, 'cardMap');
  const end = await page.evaluate(() => ({ scene: currentScene, on: party.on, colour: ballMesh.material.color.getHexString() }));
  check('leaving the card ends the party and gives the ball back', end.scene === 'map' && !end.on && end.colour === 'ffffff', JSON.stringify(end));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
