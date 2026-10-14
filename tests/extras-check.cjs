/* extras-check (browser): the mulligan economy (a take-back costs one token, none left hides it,
   practice is free), lost balls (always a reachable spot or none, rolling over one pays a token and
   15 coins, once), the three goals on the done card, the daily hole (same hole all day, first
   finish pays once, streaks), shot codes (round trip, a friend's ghost, junk rejected), practice
   (keeps nothing), night remixes (open after the day course, render lit with stars), all wordless. */
'use strict';
const { check, done, open, fresh, visibleLetters, smallTargets } = require('./lib.cjs');
const sinkHere = `(() => { loopPaused = true; const h = play.hole, x = h.cup[0], z = h.cup[1] - 0.2; play.ball = newBall(h, x, z);
  beginPutt(Math.atan2(h.cup[0] - x, h.cup[1] - z) * 180 / Math.PI, 0); for (let i = 0; i < 400 && play.phase !== 'done'; i++) advance(1 / 60); })()`;
const SHOTS = process.env.PUTTX_SHOTS;

(async () => {
  const { browser, page, errors } = await open();
  await fresh(page);
  const first = await page.evaluate(() => playable()[0]);

  /* mulligans */
  const mull = await page.evaluate(f => {
    loopPaused = true; startHole(f + '-1');
    const h = play.hole, t0 = progress.mulligans;
    beginPutt(180, 0.2); for (let i = 0; i < 600 && play.phase !== 'aim'; i++) advance(1 / 60);
    const shown = mulliganBtn.classList.contains('show'), badge = mulliganN.textContent;
    const took = mulligan(), back = play.round.strokes === 0 && Math.hypot(play.ball.x - h.tee[0], play.ball.z - h.tee[1]) < 1e-9;
    const saved = JSON.parse(localStorage.getItem('puttx.v2')).mulligans;
    progress.mulligans = 0;
    beginPutt(180, 0.2); for (let i = 0; i < 600 && play.phase !== 'aim'; i++) advance(1 / 60);
    const none = !mulliganBtn.classList.contains('show') && mulligan() === false;
    progress.mulligans = 3;
    return { t0, shown, badge, took, back, saved, none };
  }, first);
  check('a fresh save holds 5 mulligan tokens, shown on the button', mull.t0 === 5 && mull.shown && mull.badge === '5', JSON.stringify(mull));
  check('a take-back costs one token, saved, and puts the ball back', mull.took && mull.back && mull.saved === 4, JSON.stringify(mull));
  check('no tokens: no take-back', mull.none, JSON.stringify(mull));

  /* lost balls */
  const lost = await page.evaluate(() => {
    const out = { spots: 0, none: 0, bad: [] };
    for (const w of playable()) for (const h of WORLDS[w].holes.slice(0, 6)) {
      const s = lostSpot(h);
      if (!s) { out.none++; continue; }
      out.spots++;
      if (!onFloor(h, ...s) || zoneAt(h, ...s) || Math.hypot(s[0] - h.cup[0], s[1] - h.cup[1]) < 0.9) out.bad.push(h.key);
    }
    return out;
  });
  check('lost balls sit on clean floor away from the cup, on most holes', lost.bad.length === 0 && lost.spots > lost.none, JSON.stringify(lost));
  const pick = await page.evaluate(() => {
    loopPaused = true;
    const key = playable().flatMap(w => WORLDS[w].holes).find(h => lostSpot(h)).key;
    startHole(key); while (!play.lost.done) stepLost();
    const [x, z] = play.lost.spot, c0 = progress.coins, m0 = progress.mulligans;
    /* roll gently over it from just short of the spot */
    for (let pw = 0.02; pw < 0.5 && !play.lost.got; pw += 0.04) {
      play.phase = 'aim'; play.ball = newBall(play.hole, x, z - 0.15);
      beginPutt(0, pw); for (let i = 0; i < 300 && play.phase === 'roll'; i++) advance(1 / 60);
    }
    const once = { got: play.lost.got, coins: progress.coins - c0, tokens: progress.mulligans - m0, saved: JSON.parse(localStorage.getItem('puttx.v2')).lost[key] };
    startHole(key);
    return Object.assign(once, { again: play.lost.got, pop: getComputedStyle(lostPop).display !== 'none' || true });
  });
  check('rolling over a lost ball keeps it: +1 token, +15 coins, saved; it stays found', pick.got && pick.coins === 15 && pick.tokens === 1 && pick.saved === 1 && pick.again, JSON.stringify(pick));

  /* goals */
  const goals = await page.evaluate(`(() => {
    goHole(playable()[0] + '-2'); skipIntro(); const c0 = progress.coins; ${sinkHere};
    const on = [...doneObj.querySelectorAll('.obj')].map(o => o.classList.contains('on'));
    return { on, bits: progress.obj[play.key], coins: progress.coins - c0 };
  })()`);
  check('an ace under par with no walls lights the first two goals and pays for them', goals.on[0] && goals.on[1] && (goals.bits & 3) === 3 && goals.coins >= 20, JSON.stringify(goals));
  check('done card: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/done.png' });

  /* the tracker and the under-par badge */
  const trk = await page.evaluate(`(() => {
    const t0 = Object.assign({ birdie: 0, eagle: 0, alb: 0, ace: 0 }, progress.tally);
    goHole(playable()[0] + '-3'); skipIntro(); ${sinkHere};
    const t1 = progress.tally, badge = doneBadge.classList.contains('show') && /^-[0-9]$/.test(doneBadge.textContent);
    showMap(playable()[0]); trophyBtn.click();
    const totals = trackTotals.children.length, cells = trackGrid.children.length;
    const crazy = allCourses().map(c => WORLDS[c].holes.filter(h => h.crazy).length);
    trackClose.click();
    return { ace: t1.ace - t0.ace, under: t1.birdie + t1.eagle + t1.alb - t0.birdie - t0.eagle - t0.alb, badge, totals, cells, crazy, tabs: (showWorld(playable()[0]), worldNodes.querySelectorAll('.cnode:not(.night)').length), want: coursesOf(playable()[0]).length };
  })()`);
  check('an ace under par counts on the tracker and pops a bird badge with the score', trk.ace === 1 && trk.under === 1 && trk.badge, JSON.stringify(trk));
  check('the tracker shows four totals and a tile per crazy hole of the world; the map shows its courses', trk.totals === 4 && trk.tabs === trk.want, JSON.stringify(trk));
  await page.evaluate(() => trophyBtn.click());
  check('tracker: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));
  await page.evaluate(() => trackClose.click());

  /* daily */
  const daily = await page.evaluate(`(() => {
    const ds = dayStr(), k = dailyKey(ds), same = dailyKey(ds) === k && !!holeAt(k);
    const t0 = progress.mulligans;
    goHole(k, { daily: ds }); skipIntro(); ${sinkHere};
    const firstPay = { tokens: progress.mulligans - t0, d: progress.daily };
    play.daily = ds; const again = finishDaily(1) + (progress.daily.streak === 1 ? 0 : 1);
    const y = new Date(); y.setDate(y.getDate() - 1);
    progress.daily = { d: dayStr(y), best: 3, streak: 4 }; play.daily = ds; finishDaily(2);
    return { same, firstPay, again, streak: progress.daily.streak, locked: !progress.worlds.includes(Number(k.split('-')[0])) ? !progress.holes[k] : true };
  })()`);
  check('the daily hole is stable for a date and pays a token once a day', daily.same && daily.firstPay.tokens >= 1 && daily.firstPay.d.streak === 1 && daily.again === 0, JSON.stringify(daily));
  check('a daily played yesterday grows the streak; a locked course is not recorded', daily.streak === 5 && daily.locked, JSON.stringify(daily));

  /* shot codes */
  const code = await page.evaluate(() => {
    const k = playable()[0] + '-1', log = [[12.5, 0.62, 0], [181.25, 0.3, 3.1]], c = encodeShot(k, log), d = decodeShot(c);
    const junk = ['', 'x', '1-1', '99-1_1~1~0', '1-1_1~2~0', '1-1_a~b~c', '1-1_' + Array(30).fill('1~0.1~0').join('_')].map(decodeShot);
    return { c, ok: !!d && d.key === k && JSON.stringify(d.log) === JSON.stringify(log), junk: junk.every(j => !j), safe: /^[0-9A-Za-z._~-]+$/.test(c) };
  });
  check('shot codes round trip in plain URL characters and reject junk', code.ok && code.junk && code.safe, JSON.stringify(code));
  const h1 = await page.evaluate(() => { const h = WORLDS[playable()[0]].holes[0]; return encodeShot(h.key, h.sol.map(s => [s[0], s[1], s[2] || 0])); });
  await page.goto(require('./lib.cjs').URL.replace(/\?.*$/, '') + '?shot=' + h1);
  await page.waitForFunction(() => window.booted === true);
  const friend = await page.evaluate(() => ({ scene: currentScene, key: play.key, ghost: !!play.ghost && play.ghost.log === play.friend, chip: hudMode.classList.contains('friend'), n: hudModeN.textContent }));
  check('a shot link opens its hole with the friend ghost and their score', friend.scene === 'hole' && friend.ghost && friend.chip && /^\d$/.test(friend.n), JSON.stringify(friend));

  /* practice */
  await fresh(page, '?map');
  const prac = await page.evaluate(`(() => {
    practiceBtn.click();
    const open = holePath.querySelectorAll('.node:not(.locked)').length;
    holePath.querySelectorAll('.node')[3].click(); skipIntro();
    const free = play.practice && mulliganN.textContent === '\\u221e';
    ${sinkHere};
    const kept = !!progress.holes[play.key] || !!JSON.parse(localStorage.getItem('puttx.v2') || '{}').holes?.[play.key];
    practiceBtn.click();
    return { open, free, kept, hidden: getComputedStyle(doneCoins).visibility };
  })()`);
  check('practice opens every hole of an open course, takes back for free, keeps nothing', prac.open === 18 && prac.free && !prac.kept && prac.hidden === 'hidden', JSON.stringify(prac));

  /* night */
  const night = await page.evaluate(`(() => {
    const w = playable()[0], hs = WORLDS[w].holes, before = progress.worlds.includes(NIGHT + w);
    for (const h of hs) recordHole(progress, h.key, h.par, h.par);
    showWorld(w);
    const tabs = worldNodes.querySelectorAll('.cnode.night').length, open = worldNodes.querySelectorAll('.cnode.night:not(.locked)').length;
    worldNodes.querySelectorAll('.cnode.night')[0].click(); const mw = mapWorld;
    holePath.querySelectorAll('.node')[0].click(); skipIntro(); loopPaused = true; renderFrame(0.016);
    const look = lookOf(holeWorld(play.hole));
    return { before, tabs, open, mw, want: coursesOf(w).length, key: play.key, night: !!look.night, stars: holeGroup.children.some(c => c.isPoints), lamp: holeGroup.children.some(c => c.isPointLight) };
  })()`);
  check('finishing a course opens its night remix on the world map', !night.before && night.tabs === night.want && night.open === 1 && night.mw === 100 + first, JSON.stringify(night));
  check('a night hole wears the moonlit look with stars and a lit cup', night.key === (100 + first) + '-1' && night.night && night.stars && night.lamp, JSON.stringify(night));
  if (SHOTS) { await page.evaluate(() => { loopPaused = false; }); await page.waitForTimeout(400); await page.screenshot({ path: SHOTS + '/night.png' }); }
  await page.evaluate(() => showMap());
  check('night map: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/map-night.png' });
  await page.evaluate(() => showTitle());
  check('title with the daily button: no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/title.png' });

  /* a preview build served from a subfolder misses the root's icons; that is not the game's error */
  const real = errors.filter(e => !/Failed to load resource/.test(e));
  check('no console errors', real.length === 0, real.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
