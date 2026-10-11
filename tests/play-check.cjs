/* play-check (browser): a real mouse drag aims opposite the drag and sets power by length; a short
   drag cancels; only the first pointer aims and HUD taps never putt; the live loop produces the
   same result as the pure simulation even with ragged frame timing and a 5 s background gap;
   a mover nudges a resting ball without a stroke; the HUD shows numerals; sinking finishes the
   hole and saves it. */
'use strict';
const { check, done, open, fresh, visibleLetters } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  await fresh(page, '?hole=1-1');
  await page.evaluate(() => { loopPaused = true; snapCamera(); });
  const box = await page.evaluate(() => { const r = view.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: stageScale }; });

  /* 1. drag straight down the screen: putt straight at the cup (toward +z) */
  await page.mouse.move(box.x, box.y); await page.mouse.down();
  await page.mouse.move(box.x, box.y + 200 * box.s, { steps: 6 });
  const mid = await page.evaluate(() => {
    /* the aim must actually reach the screen: render with it on and off and count changed pixels */
    const shot = () => { const rt = new THREE.WebGLRenderTarget(300, 175), px = new Uint8Array(300 * 175 * 4); renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.readRenderTargetPixels(rt, 0, 0, 300, 175, px); renderer.setRenderTarget(null); rt.dispose(); return px; };
    const on = shot(); aimGroup.visible = false; const off = shot(); aimGroup.visible = true;
    let arrow = 0; for (let i = 0; i < on.length; i += 4) if (Math.abs(on[i] - off[i]) + Math.abs(on[i + 1] - off[i + 1]) + Math.abs(on[i + 2] - off[i + 2]) > 30) arrow++;
    aimRing.visible = false; const noRing = shot(); aimRing.visible = true;
    let ring = 0; for (let i = 0; i < on.length; i += 4) if (Math.abs(on[i] - noRing[i]) + Math.abs(on[i + 1] - noRing[i + 1]) + Math.abs(on[i + 2] - noRing[i + 2]) > 30) ring++;
    return { live: play.drag && play.drag.live, aim: aimGroup.visible, pixels: arrow, ringPixels: ring };
  });
  await page.mouse.up();
  const p1 = await page.evaluate(() => ({ phase: play.phase, vx: play.ball.vx, vz: play.ball.vz }));
  const ang = Math.atan2(p1.vx, p1.vz) * 180 / Math.PI, spd = Math.hypot(p1.vx, p1.vz), want = 0.5 + 5 * ((200 - 24) / (260 - 24));
  check('dragging shows the aim and power ring', mid.live && mid.aim, JSON.stringify(mid));
  check('the aim arrow and power ring are drawn on screen', mid.pixels > 150 && mid.ringPixels > 15, JSON.stringify(mid));
  check('drag down the screen putts at the cup', p1.phase === 'roll' && Math.abs(ang) < 3, JSON.stringify({ ang, phase: p1.phase }));
  check('drag length sets power', Math.abs(spd - want) < 0.06, JSON.stringify({ spd, want }));

  /* 2. a short drag cancels */
  await page.evaluate(() => startHole('1-1'));
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.up();
  check('a drag shorter than the dead zone cancels', await page.evaluate(() => play.phase === 'aim' && !aimGroup.visible));

  /* 3. a second finger and a HUD tap never putt */
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x, box.y + 150 * box.s);
  const second = await page.evaluate(([x, y]) => {
    view.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, clientX: x, clientY: y, bubbles: true }));
    dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX: x + 300, clientY: y, bubbles: true }));
    return { phase: play.phase, id: play.drag && play.drag.id };
  }, [box.x + 100, box.y]);
  await page.mouse.up();
  check('a second pointer is ignored mid-drag', second.phase === 'aim' && second.id !== 7, JSON.stringify(second));
  await page.evaluate(() => { startHole('1-1'); loopPaused = true; });
  const hb = await page.evaluate(() => { const r = homeBtn.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(hb.x, hb.y); await page.mouse.down(); await page.mouse.move(hb.x, hb.y + 200); await page.mouse.up();
  check('a drag that starts on a HUD button never putts', await page.evaluate(() => play.phase !== 'roll' && play.round.strokes === 0));

  /* 4. live loop == pure simulation, with ragged frames and a long background gap */
  const same = await page.evaluate(() => {
    startHole('1-8'); loopPaused = false;
    let now = 1000; lastNow = now;
    const ms = [16, 100, 4, 33, 70, 17], step = d => { now += d; return stepFrame(now); };
    for (let i = 0; i < 40; i++) step(ms[i % ms.length]);
    const from = [play.ball.x, play.ball.z];
    beginPutt(12, 0.55);
    const t0 = play.t0;
    let i = 0, maxDt = 0;
    while (play.phase === 'roll' && i < 5000) { maxDt = Math.max(maxDt, step(i === 30 ? 5000 : ms[i % ms.length])); i++; }
    loopPaused = true;
    const sim = simulatePutt(play.hole, from, 12, 0.55, t0);
    return { live: [play.round.at[0], play.round.at[1], play.lastOutcome], sim: [sim.x, sim.z, sim.end], maxDt };
  });
  const eq = same.maxDt <= 0.1 + 1e-9 && (same.sim[2] === 'sunk' ? same.live[2] === 'sunk' : same.live[0] === same.sim[0] && same.live[1] === same.sim[1]);
  check('live loop matches simulatePutt exactly, through a 5 s background gap', eq, JSON.stringify(same));

  /* 5. a mover nudges a resting ball: no stroke, ball moves */
  const drift = await page.evaluate(() => {
    startHole('1-8'); loopPaused = true;
    const m = play.hole.movers[0];
    play.ball = newBall(play.hole, m.x + 0.4, m.z); play.round.at = [play.ball.x, play.ball.z];
    let saw = false;
    for (let i = 0; i < 600; i++) { advance(1 / 60); if (play.phase === 'drift') saw = true; if (saw && play.phase === 'aim') break; }
    return { saw, strokes: play.round.strokes, moved: Math.hypot(play.ball.x - (m.x + 0.4), play.ball.z - m.z) > 0.05, phase: play.phase };
  });
  check('a mover nudges a resting ball without a stroke', drift.saw && drift.strokes === 0 && drift.moved, JSON.stringify(drift));

  /* 6. HUD is numerals only */
  await page.evaluate(() => { startHole('1-3'); loopPaused = true; });
  const hud = await page.evaluate(() => [hudHoleN.textContent, hudParN.textContent, hudStrokesN.textContent].join(','));
  check('HUD shows hole, par and strokes as numerals', hud === '3,2,0', hud);
  check('no words in the hole scene', (await visibleLetters(page)).length === 0);

  /* 7. sinking finishes the hole, shows the result and saves it */
  const fin = await page.evaluate(() => {
    startHole('1-1'); loopPaused = true;
    play.ball = newBall(play.hole, 0, 3.2);
    beginPutt(0, 0);
    for (let i = 0; i < 400 && play.phase !== 'done'; i++) advance(1 / 60);
    return { phase: play.phase, shown: getComputedStyle(holeDone).display !== 'none', score: play.round.score, lit: holeDone.querySelectorAll('.star.on').length,
      saved: JSON.parse(localStorage.getItem('puttx.v1')).holes['1-1'], log: sfxLog.slice(-12) };
  });
  check('sinking shows the result: 1 stroke, 3 stars', fin.phase === 'done' && fin.shown && fin.score === 1 && fin.lit === 3, JSON.stringify(fin));
  check('the hole is saved', fin.saved && fin.saved.best === 1 && fin.saved.stars === 3, JSON.stringify(fin.saved));
  check('putt and cup sounds fired', fin.log.includes('putt') && fin.log.includes('cup'), fin.log.join());

  /* 8. the par + 3 cap auto-rolls into the cup */
  const cap = await page.evaluate(() => {
    startHole('1-1'); loopPaused = true; play.round.strokes = 4;
    beginPutt(180, 0);
    let sawAuto = false;
    for (let i = 0; i < 600 && play.phase !== 'done'; i++) { advance(1 / 60); if (play.phase === 'auto') sawAuto = true; }
    return { sawAuto, phase: play.phase, score: play.round.score };
  });
  check('the cap putt auto-rolls in and scores par + 3', cap.sawAuto && cap.phase === 'done' && cap.score === 5, JSON.stringify(cap));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
