/* shop-check (node + browser): the pro shop. Coins per hole (finish, under par, ace, first clear)
   and never negative; 30 putters (20 with their own head models, inside the plain head's
   footprint), 32 balls, mulligan token packs; pages and a swipe; buying deducts and owns, short of coins it boinks and nothing changes;
   equip persists across a reload and re-applies (putter look and FEEL, ball skin); FEEL resets for
   the starter and no putter is more than 40% kinder than base in any knob; the physics never
   changes; a corrupt shop save repairs; the shop has no words and no small targets. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { check, done, open, fresh, visibleLetters, smallTargets } = require('./lib.cjs');

/* ---- node: the pure half of src/shop.js, run against FEEL_BASE from src/game.js ---- */
const ROOT = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(ROOT, 'src', 'game.js'), 'utf8');
const feelBase = game.match(/const FEEL_BASE = (\{[^}]*\});/)[1];
const ctx = vm.createContext({});
vm.runInContext(`const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)); const FEEL_BASE = ${feelBase};\n`
  + fs.readFileSync(path.join(ROOT, 'src', 'shop.js'), 'utf8')
  + '\nthis.api = { coinsFor, feelOf, shopRepair, PUTTERS, BALLS, COIN, FEEL_BASE, PACKS, PUTTER_HEADS, BALL_PATS };', ctx);
const S = ctx.api;
{
  const c = S.coinsFor;
  check('coins: 5 to finish, +10 a stroke under par, +25 an ace, +10 first clear',
    c(3, 3, false) === 5 && c(3, 3, true) === 15 && c(2, 3, false) === 15 && c(1, 3, false) === 5 + 20 + 25 && c(1, 2, true) === 5 + 10 + 25 + 10 && c(6, 3, false) === 5,
    [c(3, 3, false), c(3, 3, true), c(2, 3, false), c(1, 3, false), c(1, 2, true), c(6, 3, false)].join());
  check('coins: odd scores still pay the finish, never less', [c(0, 3), c(-4, 3), c(NaN, 3), c(2.5, 3), c(2, 'x'), c(99, 2)].every(v => v === 5));
  const kind = (f, base, better) => better === 'up' ? f / base : base / f;
  const ok = S.PUTTERS.every(p => {
    const f = S.feelOf(p.id), b = S.FEEL_BASE;
    return kind(f.sweet, b.sweet, 'up') <= 1.4 + 1e-9 && kind(f.tempoDead, b.tempoDead, 'up') <= 1.4 + 1e-9
      && kind(f.toeLoss, b.toeLoss) <= 1.4 + 1e-9 && kind(f.twist, b.twist) <= 1.4 + 1e-9 && kind(f.pathK, b.pathK) <= 1.4 + 1e-9
      && f.tempoK === b.tempoK && ['sweet', 'tempoDead', 'toeLoss', 'twist', 'pathK'].every(k => kind(f[k], b[k], ['sweet', 'tempoDead'].includes(k) ? 'up' : 0) >= 1 - 1e-9);
  });
  check('putters: never kinder than 40% over base in any knob, never harsher, tempoK untouched', ok);
  check('putters: 30 of them, the starter is FEEL_BASE exactly and free', S.PUTTERS.length === 30 && S.PUTTERS[0].price === 0
    && JSON.stringify(S.feelOf('p1')) === JSON.stringify(S.FEEL_BASE));
  check('putters: forgiveness levels are whole numbers 0..4', S.PUTTERS.every(p => p.f.length === 3 && p.f.every(l => Number.isInteger(l) && l >= 0 && l <= 4)));
  for (const [name, line] of [['pro line', S.PUTTERS.slice(0, 10)], ['crazy line', S.PUTTERS.slice(10)]]) {
    const lv = line.map(p => p.f[0] + p.f[1] + p.f[2]), pr = line.map(p => p.price);
    check('putters (' + name + '): dearer is never less forgiving, top one is the best', lv.every((v, i) => !i || (v >= lv[i - 1] && pr[i] > pr[i - 1])) && lv[lv.length - 1] === 12, lv.join());
  }
  const crazy = S.PUTTERS.slice(10), styles = crazy.map(p => p.look.style);
  check('putters: 20 crazy ones, each its own head model, priced up to 2000', crazy.length === 20 && new Set(styles).size === 20 && styles.every(st => typeof S.PUTTER_HEADS[st] === 'function')
    && Math.max(...crazy.map(p => p.price)) === 2000 && Math.min(...crazy.map(p => p.price)) >= 250, styles.join());
  const pats = S.BALLS.map(b => b.pat), builtin = ['star', 'stripes', 'dots', 'swirl', 'checker', 'melon', 'eight', 'lava', 'rainbow', 'galaxy', 'gold'];
  check('balls: 32, starter free, some premium', S.BALLS.length === 32 && S.BALLS[0].price === 0 && S.BALLS.filter(b => b.price >= 250).length >= 10);
  check('balls: the 20 new ones each have their own painted skin', new Set(pats.slice(12)).size === 20 && pats.slice(12).every(p => !builtin.includes(p) && typeof S.BALL_PATS[p] === 'function') && pats.slice(0, 12).every(p => builtin.includes(p)), pats.join());
  check('balls: glow and metal stay in range', S.BALLS.every(b => (b.glow || 0) >= 0 && (b.glow || 0) <= 1 && (b.metal || 0) >= 0 && (b.metal || 0) <= 1 && (!b.pulse || b.glow > 0)));
  check('mulligan packs: 3 for 60, 10 for 180, 25 for 400', JSON.stringify(S.PACKS.map(p => [p.n, p.price])) === '[[3,60],[10,180],[25,400]]');
  const mr = v => S.shopRepair(v === undefined ? {} : { mulligans: v }).mulligans;
  check('repair (pure): mulligans default to 5, junk resets to 5, odd numbers floor and clamp to 0..999',
    mr() === 5 && mr('lots') === 5 && mr(NaN) === 5 && mr(null) === 5 && mr(Infinity) === 5 && mr(-3) === 0 && mr(7.9) === 7 && mr(1e9) === 999 && mr(0) === 0 && mr(12) === 12,
    [mr(), mr('lots'), mr(NaN), mr(-3), mr(7.9), mr(1e9), mr(0)].join());
  const r = S.shopRepair({ holes: { '1-1': {}, '1-2': {} }, coins: -40, owned: ['p3', 'nope', 'p3', 7], equipped: { putter: 'p4', ball: 'p3' } });
  check('repair (pure): negative coins to 0, unknown ids dropped, unowned equip falls back, old clears seed firsts',
    r.coins === 0 && JSON.stringify(r.owned) === '["p1","b1","p3"]' && r.equipped.putter === 'p1' && r.equipped.ball === 'b1' && r.firsts.join() === '1-1,1-2', JSON.stringify(r));
  const r2 = S.shopRepair({ coins: 12.9, owned: 'x', equipped: null, firsts: ['1-1', 5, '1-1', 'zz'] });
  check('repair (pure): fractional coins floor, junk shapes reset', r2.coins === 12 && r2.owned.join() === 'p1,b1' && r2.firsts.join() === '1-1' && r2.equipped.putter === 'p1');
  check('repair (pure): Infinity and huge values clamp', S.shopRepair({ coins: Infinity }).coins === 0 && S.shopRepair({ coins: 1e12 }).coins === 999999);
}

/* ---- browser ---- */
const shopKeys = page => page.evaluate(() => ({ coins: progress.coins, owned: progress.owned.join(), eq: progress.equipped.putter + '/' + progress.equipped.ball,
  saved: JSON.parse(localStorage.getItem(SAVE_KEY)) }));
const realErrors = errs => errs.filter(e => !/Failed to load resource/.test(e));

(async () => {
  const { browser, page, errors } = await open('?map');
  await fresh(page, '?map');
  const f0 = await page.evaluate(() => ({ coins: progress.coins, mull: progress.mulligans, owned: progress.owned.join(), eq: progress.equipped, feel: JSON.stringify(FEEL) === JSON.stringify(FEEL_BASE),
    head: GEAR.putter.head, ball: GEAR.ball.base, map: !!ballMesh.material.map, wallet: mapCoinsN.textContent }));
  check('fresh save: 0 coins, 5 mulligans, starters owned and equipped, FEEL is base', f0.coins === 0 && f0.mull === 5 && f0.owned === 'p1,b1' && f0.eq.putter === 'p1' && f0.eq.ball === 'b1' && f0.feel && f0.head === '#c9ced6' && f0.ball === '#fffdf7' && f0.map && f0.wallet === '0', JSON.stringify(f0));
  check('map: wallet and shop button, no words, no small targets', await page.evaluate(() => getComputedStyle(mapWallet).display !== 'none' && shopBtn.getBoundingClientRect().width >= 64)
    && (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));

  /* economy through the real finishHole */
  const eco = await page.evaluate(() => {
    const fin = (key, score) => { startHole(key); play.round.score = score; play.round.done = true; finishHole(); return progress.coins; };
    const p1 = holeAt('1-1').par, p2 = holeAt('1-2').par;
    const a = fin('1-1', p1), b = fin('1-1', p1), c = fin('1-1', p1 - 1), d = fin('1-2', 1), e = fin('1-1', p1 + 3);
    const chip = document.getElementById('doneCoins');
    for (const an of document.getAnimations()) { try { an.finish(); } catch (er) { /* loops */ } }
    return { a, b, c, d, e, p1, p2, chip: chip.textContent, shown: holeDone.classList.contains('show') && getComputedStyle(chip).opacity === '1', saved: JSON.parse(localStorage.getItem(SAVE_KEY)).coins };
  });
  const c3 = 20 + 5 + 10 + (eco.p1 - 1 === 1 ? 25 : 0), d4 = c3 + 5 + 10 * (eco.p2 - 1) + 25 + 10;
  const want = [15, 20, c3, d4, d4 + 5];
  check('finishing holes pays: first clear, par again, under par, an ace on a new hole, the capped worst', [eco.a, eco.b, eco.c, eco.d, eco.e].join() === want.join(), JSON.stringify(eco) + ' want ' + want);
  check('coins are saved with the progress', eco.saved === eco.e);
  check('hole-done card shows the coin pop (+N), wordless', eco.shown && eco.chip === '+5' && (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(eco));
  await page.waitForTimeout(900);
  check('the coin pop chimes', await page.evaluate(() => sfxLog.includes('coin')));

  /* never negative */
  const neg = await page.evaluate(() => { progress.coins = -50; renderWallet(); const a = progress.coins; progress.coins = NaN; renderWallet(); return [a, progress.coins, mapCoinsN.textContent]; });
  check('coins can never go negative or NaN', neg[0] === 0 && neg[1] === 0 && neg[2] === '0', neg.join());

  /* the shop scene */
  await page.evaluate(() => { progress.coins = 100; saveProgress(); showMap(1); shopBtn.click(); });
  await page.waitForTimeout(400);
  const sc = await page.evaluate(() => ({ scene: currentScene, cards: shopGrid.querySelectorAll('.card').length, wallet: shopCoinsN.textContent, mull: shopMullN.textContent,
    eq: shopGrid.querySelector('.card.equipped') && shopGrid.querySelector('.card.equipped').dataset.id }));
  check('shop button opens the shop on putters (a page of 10), the starter equipped, coins and mulligans shown', sc.scene === 'shop' && sc.cards === 10 && sc.wallet === '100' && sc.mull === '5' && sc.eq === 'p1', JSON.stringify(sc));
  check('shop (putters): no words, no small targets', (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify([await visibleLetters(page), await smallTargets(page)]));
  const pix = await page.evaluate(() => {
    const busy = c => { if (!c.width) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const s = new Set(); for (let i = 0; i < d.length; i += 4 * 37) s.add(d[i] >> 3 << 10 | d[i + 1] >> 3 << 5 | d[i + 2] >> 3); return s.size; };
    return { thumbs: [...shopGrid.querySelectorAll('canvas.thumb')].map(busy), view: busy(shopView) };
  });
  check('every card has a rendered thumbnail and the preview is drawn', pix.thumbs.length === 10 && pix.thumbs.every(n => n > 8) && pix.view > 8, JSON.stringify(pix));

  /* buy: short of coins boinks, nothing changes */
  const before = await shopKeys(page);
  await page.evaluate(() => shopGrid.querySelector('[data-id="p10"]').click());
  const poorUi = await page.evaluate(() => ({ locked: shopAction.classList.contains('locked'), sel: shopGrid.querySelector('.card.sel').dataset.id }));
  await page.evaluate(() => shopAction.click());
  const after = await shopKeys(page), boink = await page.evaluate(() => sfxLog[sfxLog.length - 1]);
  check('cannot buy without the coins: boink, no change', poorUi.locked && poorUi.sel === 'p10' && boink === 'boink' && JSON.stringify(before) === JSON.stringify(after), JSON.stringify({ poorUi, before: before.coins, after: after.coins, boink }));
  check('direct shopBuy refuses too', await page.evaluate(() => shopBuy('p10') === false && progress.coins === 100 && !progress.owned.includes('p10')));

  /* buy: deducts, owns, equips; FEEL follows */
  await page.evaluate(() => shopGrid.querySelector('[data-id="p2"]').click());
  await page.evaluate(() => shopAction.click());
  const bought = await page.evaluate(() => ({ coins: progress.coins, owned: progress.owned.includes('p2'), eq: progress.equipped.putter, feel: Object.assign({}, FEEL), base: FEEL_BASE, head: GEAR.putter.head,
    saved: JSON.parse(localStorage.getItem(SAVE_KEY)), log: sfxLog.slice(-3).join(), card: shopGrid.querySelector('.card.equipped').dataset.id, puttHead: putter.getObjectByName('head').material.color.getHexString() }));
  check('buying deducts the price, owns and equips it, and saves', bought.coins === 60 && bought.owned && bought.eq === 'p2' && bought.saved.coins === 60 && bought.saved.owned.includes('p2') && bought.saved.equipped.putter === 'p2' && bought.card === 'p2' && /coin/.test(bought.log), JSON.stringify(bought));
  check('the new putter changes FEEL (wider sweet spot, bigger tempo band) and the look', bought.feel.sweet > bought.base.sweet && bought.feel.tempoDead > bought.base.tempoDead && bought.feel.toeLoss < bought.base.toeLoss
    && bought.head === '#ffd66e' && bought.puttHead === 'ffd66e', JSON.stringify(bought.feel));
  check('buying an owned item does nothing', await page.evaluate(() => shopBuy('p2') === false && progress.coins === 60));

  /* forgiveness: the same off-centre, rushed gesture goes further and straighter with the better putter; a clean one is identical */
  const stroke = await page.evaluate(() => {
    /* back 160 px in 0.2 s, then forward through the touch point at `rush` times the pendulum's speed, drifting dx px sideways */
    const gesture = (dx, rush) => { const s = [{ t: 0, x: 600, y: 300 }]; for (let i = 1; i <= 10; i++) s.push({ t: i * 0.02, x: 600, y: 300 + i * 16 });
      for (let i = 1; s[s.length - 1].y > 280; i++) s.push({ t: 0.2 + i * 0.02, x: 600 + dx * Math.min(1, i / 10), y: 460 - 16 * rush * i }); return s; };
    const run = id => { shopEquip(id); const a = computeStroke(gesture(16, 1)), t = computeStroke(gesture(0, 1.5)), b = computeStroke(gesture(0, 1));
      return { contact: a.contactMul, turn: Math.abs(a.turn), tempo: Math.abs(t.tempoMul - 1), clean: b.power, cleanTurn: b.turn }; };
    const r = { p1: run('p1'), p10: (progress.owned.push('p10'), run('p10')) };
    progress.owned = progress.owned.filter(id => id !== 'p10'); shopEquip('p2');
    return r;
  });
  check('a pro putter forgives a mishit (less power lost, less turn, smaller tempo error) and changes nothing on a clean one',
    stroke.p10.turn < stroke.p1.turn && stroke.p10.contact > stroke.p1.contact && stroke.p10.tempo < stroke.p1.tempo
    && stroke.p10.clean === stroke.p1.clean && stroke.p10.cleanTurn === stroke.p1.cleanTurn, JSON.stringify(stroke));
  const phys = await page.evaluate(() => {
    const h = holeAt('1-1'), go = () => JSON.stringify(simulatePutt(h, h.tee, 3, 0.4));
    const a = go(); progress.owned.push('p10'); shopEquip('p10'); const b = go(); progress.owned = progress.owned.filter(id => id !== 'p10'); shopEquip('p2');
    return a === b;
  });
  check('the physics never changes with the putter', phys);

  /* balls tab */
  await page.evaluate(() => { progress.coins = 500; shopTabBalls.click(); });
  await page.waitForTimeout(300);
  check('ball tab: 12 cards, no words, no small targets', await page.evaluate(() => shopGrid.querySelectorAll('.card').length === BALLS.length && shopTabBalls.classList.contains('on'))
    && (await visibleLetters(page)).length === 0 && (await smallTargets(page)).length === 0, JSON.stringify(await smallTargets(page)));
  const ball = await page.evaluate(() => {
    const oldMap = ballMesh.material.map;
    shopGrid.querySelector('[data-id="b11"]').click(); shopAction.click();
    return { coins: progress.coins, eq: progress.equipped.ball, base: GEAR.ball.base, newMap: ballMesh.material.map !== oldMap, w: ballMesh.material.map.image.width };
  });
  check('buying a premium ball pays, equips and re-skins the ball', ball.coins === 160 && ball.eq === 'b11' && ball.base === '#1d2340' && ball.newMap && ball.w === 256, JSON.stringify(ball));
  const tapOwned = await page.evaluate(() => { shopGrid.querySelector('[data-id="b1"]').click(); const a = progress.equipped.ball; shopGrid.querySelector('[data-id="b11"]').click(); return [a, progress.equipped.ball, progress.coins]; });
  check('tapping an owned item equips it for free', tapOwned.join() === 'b1,b11,160', tapOwned.join());

  /* equip persists across a reload and re-applies */
  await page.reload(); await page.waitForFunction(() => window.booted === true);
  const re = await page.evaluate(() => ({ eq: progress.equipped, coins: progress.coins, feel: JSON.stringify(FEEL) === JSON.stringify(feelOf('p2')), head: GEAR.putter.head,
    ball: GEAR.ball.base, glow: ballMesh.material.emissiveIntensity, puttHead: putter.getObjectByName('head').material.color.getHexString() }));
  check('equip persists across a reload: putter look and FEEL, ball skin, coins', re.eq.putter === 'p2' && re.eq.ball === 'b11' && re.coins === 160 && re.feel && re.head === '#ffd66e' && re.puttHead === 'ffd66e' && re.ball === '#1d2340' && re.glow > 0, JSON.stringify(re));
  const back = await page.evaluate(() => { shopEquip('p1'); shopEquip('b1'); return { feel: JSON.stringify(FEEL) === JSON.stringify(FEEL_BASE), head: GEAR.putter.head, glow: ballMesh.material.emissiveIntensity, ball: GEAR.ball.base }; });
  check('the starter putter puts FEEL back to base exactly', back.feel && back.head === '#c9ced6' && back.glow === 0 && back.ball === '#fffdf7', JSON.stringify(back));
  check('cannot equip what you do not own', await page.evaluate(() => shopEquip('p9') === false && progress.equipped.putter === 'p1'));

  /* back to the map */
  await page.evaluate(() => { showMap(1); shopBtn.click(); shopBack.click(); });
  check('the house button goes back to the map with the wallet', await page.evaluate(() => currentScene === 'map' && mapCoinsN.textContent === '160'));

  /* corrupt shop saves repair at boot */
  for (const [name, junk] of [
    ['junk types', { coins: 'lots', owned: 5, equipped: 'p9', firsts: 'x' }],
    ['negative coins, unknown and unowned ids', { coins: -300, owned: ['p4', 'zzz', null], equipped: { putter: 'p9', ball: { x: 1 } }, firsts: [1, '1-1'] }],
    ['NaN-ish and huge', { coins: 1e15, owned: [], equipped: { putter: 'b2', ball: 'p1' } }],
  ]) {
    await page.evaluate(j => { const p = JSON.parse(localStorage.getItem(SAVE_KEY)); localStorage.setItem(SAVE_KEY, JSON.stringify(Object.assign(p, j))); }, junk);
    await page.reload(); await page.waitForFunction(() => window.booted === true);
    const rep = await page.evaluate(() => ({ coins: progress.coins, owned: progress.owned, eq: progress.equipped, firsts: Array.isArray(progress.firsts), feel: JSON.stringify(FEEL) === JSON.stringify(feelOf(progress.equipped.putter)), saved: JSON.parse(localStorage.getItem(SAVE_KEY)).coins }));
    check('corrupt save repairs (' + name + ')', Number.isInteger(rep.coins) && rep.coins >= 0 && rep.coins <= 999999 && rep.owned.includes('p1') && rep.owned.includes('b1') && rep.owned.every(id => typeof id === 'string' && /^[pb]\d+$/.test(id))
      && rep.owned.includes(rep.eq.putter) && rep.eq.putter[0] === 'p' && rep.owned.includes(rep.eq.ball) && rep.eq.ball[0] === 'b' && rep.firsts && rep.feel && rep.saved === rep.coins, JSON.stringify(rep));
  }
  await page.evaluate(() => { showMap(1); shopBtn.click(); });
  check('the repaired shop still opens cleanly', await page.evaluate(() => currentScene === 'shop' && shopGrid.querySelectorAll('.card').length === PUTTERS.length));

  check('no console errors', realErrors(errors).length === 0, realErrors(errors).join(' | '));
  await browser.close();

  /* reduced motion: the preview holds still, the shop still works */
  const rm = await open('?map', { reducedMotion: 'reduce' });
  await rm.page.evaluate(() => { shopBtn.click(); });
  await rm.page.waitForTimeout(300);
  const still = await rm.page.evaluate(() => ({ scene: currentScene, raf: shopUi.raf, anim: getComputedStyle(shopGrid.querySelector('.card')).animationName }));
  check('reduced motion: no spinning preview, no card bounce', still.scene === 'shop' && still.raf === 0 && still.anim === 'none', JSON.stringify(still));
  check('reduced motion: no console errors', realErrors(rm.errors).length === 0, realErrors(rm.errors).join(' | '));
  await rm.browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
