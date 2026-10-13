/* play-check (browser): the putter stroke and everything around it.
   - computeStroke: backswing length sets power; tempo, path and strike point bend it; letting go
     before the ball, or a tiny backswing, is no stroke
   - a real mouse stroke on the swing pad putts along the aim; dragging the course and the arrow
     buttons turn the aim; a stroke pushed to the right sends the ball right on screen
   - only the first pointer counts, HUD taps never putt
   - the putter sits behind the ball, never touches the ball, a wall or the ground under a hill,
     and hides when there is no room; the aim line drapes over hills and stops at walls
   - the live loop equals simulatePutt through ragged frames and a 5 s gap; movers nudge a resting
     ball for free; the HUD is numerals; sinking pulls the pin, rests the ball in the cup, scores
     and saves; the double-par cap auto-sinks. Test holes are registered as course 97. */
'use strict';
const { check, done, open, fresh, visibleLetters } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  await fresh(page);
  await page.evaluate(() => {
    registerWorld(97, { holes: [
      { par: 3, tee: [0, 0.5], cup: [0, 5.5], shape: rect(-0.8, 0, 0.8, 6) },
      { par: 3, tee: [0, 0.5], cup: [0, 5.5], shape: rect(-1, 0, 1, 6), bumps: [{ x: 0, z: 1.6, r: 0.5, h: 0.3 }, { x: 0.5, z: 3.5, r: 0.6, h: 0.2 }] },
      { par: 3, tee: [0, 0.12], cup: [0, 5.5], shape: rect(-0.8, 0, 0.8, 6) },
      { par: 3, tee: [0, 0.5], cup: [0, 4.5], shape: rect(-0.9, 0, 0.9, 5), movers: [{ kind: 'spin', x: 0, z: 2.5, len: 0.66, w: 1.4, phase: 0 }] },
    ] });
    loopPaused = true;
  });

  /* 1. the stroke model */
  const m = await page.evaluate(() => {
    /* a stroke: pull back L px over 0.5 s, then forward through the address at `speed` px/s, drifting dx px sideways */
    const stroke = (L, speed, dx = 0, off = 0) => {
      const s = [{ t: 0, x: 0, y: 0 }];
      for (let i = 1; i <= 10; i++) s.push({ t: i * 0.05, x: 0, y: L * i / 10 });
      const T = L / speed;
      for (let i = 1; i <= 12; i++) { const u = i / 10; s.push({ t: 0.5 + T * u, x: off * Math.min(1, u * 1.2) + dx * u, y: L * (1 - u) }); }
      return computeStroke(s);
    };
    const ideal = L => L / TEMPO_T;
    return {
      smooth: stroke(120, ideal(120)), full: stroke(240, ideal(240)), slow: stroke(120, ideal(120) / 2), fast: stroke(120, ideal(120) * 2),
      right: stroke(120, ideal(120), 40), toe: stroke(120, ideal(120), 0, 30), heel: stroke(120, ideal(120), 0, -30), tiny: stroke(10, 200),
      letGo: computeStroke([{ t: 0, x: 0, y: 0 }, { t: 0.2, x: 0, y: 100 }, { t: 0.4, x: 0, y: 30 }]),
    };
  });
  check('smooth stroke: power = backswing / full, no turn, clean', Math.abs(m.smooth.power - 0.5) < 0.01 && Math.abs(m.smooth.turn) < 0.01 && m.smooth.clean, JSON.stringify(m.smooth));
  check('full backswing is full power', Math.abs(m.full.power - 1) < 0.01);
  check('decelerating comes up short, jabbing runs long', m.slow.power < 0.47 && m.fast.power > 0.53, JSON.stringify([m.slow.power, m.fast.power]));
  check('a stroke drifting right turns the ball right (negative angle)', m.right.turn < -1 && m.right.path > 0, JSON.stringify(m.right));
  check('toe and heel strikes lose power and twist opposite ways', m.toe.power < 0.49 && m.heel.power < 0.49 && Math.sign(m.toe.turn) === -Math.sign(m.heel.turn) && m.toe.turn !== 0, JSON.stringify([m.toe, m.heel]));
  check('a tiny backswing or letting go before the ball is no stroke', m.tiny === null && m.letGo === null);

  /* 2. a real mouse stroke on the pad */
  await page.evaluate(() => { startHole('97-1'); loopPaused = true; });
  const pad = await page.evaluate(() => { const r = swingPad.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.3, s: stageScale }; });
  const aim0 = await page.evaluate(() => play.aim);
  await page.mouse.move(pad.x, pad.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(pad.x, pad.y + 20 * i * pad.s); }
  const mid = await page.evaluate(() => ({ back: play.swing && play.swing.back, ring: aimRing.visible, putter: putter.visible }));
  for (let i = 7; i >= -2; i--) { await page.mouse.move(pad.x, pad.y + 20 * i * pad.s); }
  await page.mouse.up();
  const real = await page.evaluate(() => ({ phase: play.phase, ang: Math.atan2(play.ball.vx, play.ball.vz) * 180 / Math.PI, shot: play.lastShot, readout: shotPanel.classList.contains('show') }));
  check('backswing on the pad fills the power ring and draws the putter back', mid.back > 140 && mid.ring && mid.putter, JSON.stringify(mid));
  check('pushing through the address line strikes the ball along the aim', real.phase === 'roll' && Math.abs(real.ang - (aim0 + real.shot.turn)) < 0.5 && real.shot.length > 140, JSON.stringify(real));
  check('the shot readout shows after the stroke', real.readout);

  /* 3. let go before the ball: no stroke */
  await page.evaluate(() => { startHole('97-1'); loopPaused = true; });
  await page.mouse.move(pad.x, pad.y); await page.mouse.down(); await page.mouse.move(pad.x, pad.y + 150 * pad.s, { steps: 5 }); await page.mouse.up();
  check('letting go mid-backswing is no stroke', await page.evaluate(() => play.phase === 'aim' && play.round.strokes === 0 && !play.swing));

  /* 4. aiming: drag the course, nudge with the arrows; a right-turned putt goes right on screen */
  const aimed = await page.evaluate(() => {
    startHole('97-1'); loopPaused = true; snapCamera();
    const a0 = play.aim;
    const v = view.getBoundingClientRect(), x = v.left + v.width * 0.4, y = v.top + v.height * 0.5;
    view.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 5, clientX: x, clientY: y, bubbles: true }));
    dispatchEvent(new PointerEvent('pointermove', { pointerId: 5, clientX: x + 100 * stageScale, clientY: y, bubbles: true }));
    dispatchEvent(new PointerEvent('pointerup', { pointerId: 5, clientX: x + 100 * stageScale, clientY: y, bubbles: true }));
    const dragged = play.aim - a0;
    const a1 = play.aim; aimR.click(); const nudged = play.aim - a1;
    /* where does a putt turned right land on screen, against one straight? */
    startHole('97-1'); loopPaused = true; snapCamera(); camera.updateMatrixWorld();
    const sx = ang => { const r = simulatePutt(play.hole, play.hole.tee, ang, 0.4); return new THREE.Vector3(r.x, 0, r.z).project(camera).x; };
    return { dragged, nudged, straight: sx(play.aim), right: sx(play.aim - 8) };
  });
  check('dragging the course right turns the aim right (angle down)', aimed.dragged < -5, JSON.stringify(aimed));
  check('the right arrow nudges the aim a quarter degree right', Math.abs(aimed.nudged + 0.25) < 1e-9, JSON.stringify(aimed));
  check('a putt turned right lands right of the straight one on screen', aimed.right > aimed.straight + 0.02, JSON.stringify(aimed));

  /* 5. a second pointer and a HUD tap never putt */
  await page.evaluate(() => { startHole('97-1'); loopPaused = true; });
  await page.mouse.move(pad.x, pad.y); await page.mouse.down(); await page.mouse.move(pad.x, pad.y + 120 * pad.s, { steps: 4 });
  const second = await page.evaluate(([x, y]) => {
    swingPad.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, clientX: x, clientY: y, bubbles: true }));
    dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: x, clientY: y - 300, bubbles: true }));
    return { phase: play.phase, id: play.swing && play.swing.id };
  }, [pad.x, pad.y]);
  await page.mouse.up();
  check('a second pointer is ignored mid-swing', second.phase === 'aim' && second.id !== 7, JSON.stringify(second));
  await page.evaluate(() => { startHole('97-1'); loopPaused = true; });
  const hb = await page.evaluate(() => { const r = homeBtn.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(hb.x, hb.y); await page.mouse.down(); await page.mouse.move(hb.x, hb.y + 200); await page.mouse.move(hb.x, hb.y - 100); await page.mouse.up();
  check('a gesture that starts on a HUD button never putts', await page.evaluate(() => play.phase !== 'roll' && play.round.strokes === 0));

  /* 6. the putter never stuffs into the ball, a wall or a hill; the aim line drapes and stops at walls */
  const clip = await page.evaluate(() => {
    const out = {};
    startHole('97-2'); loopPaused = true;
    const headPts = () => { const hd = putter.getObjectByName('head'); hd.geometry.computeBoundingBox(); const bb = hd.geometry.boundingBox, pts = [];
      for (const x of [bb.min.x, bb.max.x]) for (const z of [bb.min.z, bb.max.z]) pts.push(new THREE.Vector3(x, bb.min.y, z).applyMatrix4(hd.matrixWorld)); return pts; };
    let worst = Infinity, under = 0;
    for (let a = -60; a <= 60; a += 20) for (const back of [0, 100, 250, 320]) {
      play.aim = a; play.swing = back ? { sx: 0, sy: 0, x: 0, back } : null; renderFrame(0.016); putter.updateMatrixWorld(true);
      const b = play.ball;
      for (const p of headPts()) {
        worst = Math.min(worst, Math.hypot(p.x - b.x, p.z - b.z));
        if (p.y < groundH(play.hole, p.x, p.z) - 0.004) under++;
      }
    }
    out.ballGap = worst; out.under = under;
    play.swing = null;
    /* aim line on the hills: every point on or above the ground */
    let below = 0, pts = 0;
    for (let a = -40; a <= 40; a += 10) for (const p of aimPath(play.hole, play.ball, a, 3)) { pts++; if (p[1] < groundH(play.hole, p[0], p[2])) below++; }
    out.below = below; out.pts = pts;
    /* tee 0.12 from the back wall: no room, so no putter, and the aim line still runs forward */
    startHole('97-3'); loopPaused = true; play.aim = 0; renderFrame(0.016);
    out.noRoom = putter.visible;
    play.aim = 180; out.wallStop = aimPath(play.hole, play.ball, 180).length;
    return out;
  });
  check('the putter head never touches the ball (gap >= ball radius)', clip.ballGap >= 0.051 - 1e-6, JSON.stringify(clip));
  check('the putter head never sinks into a hill', clip.under === 0, JSON.stringify(clip));
  check('the aim line drapes over hills, never under them', clip.pts > 50 && clip.below === 0, JSON.stringify(clip));
  check('no room behind the ball: the putter hides instead of clipping the wall', clip.noRoom === false, JSON.stringify(clip));
  check('the aim line stops at a wall', clip.wallStop === 0, JSON.stringify(clip));

  /* 7. live loop == pure simulation, with ragged frames and a long background gap */
  const same = await page.evaluate(() => {
    startHole('97-4'); loopPaused = false;
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

  /* 8. a mover nudges a resting ball: no stroke, ball moves */
  const drift = await page.evaluate(() => {
    startHole('97-4'); loopPaused = true;
    const mv = play.hole.movers[0];
    play.ball = newBall(play.hole, mv.x + 0.4, mv.z); play.round.at = [play.ball.x, play.ball.z];
    let saw = false;
    for (let i = 0; i < 600; i++) { advance(1 / 60); if (play.phase === 'drift') saw = true; if (saw && play.phase === 'aim') break; }
    return { saw, strokes: play.round.strokes, moved: Math.hypot(play.ball.x - (mv.x + 0.4), play.ball.z - mv.z) > 0.05, phase: play.phase };
  });
  check('a mover nudges a resting ball without a stroke', drift.saw && drift.strokes === 0 && drift.moved, JSON.stringify(drift));

  /* 9. HUD is numerals only */
  await page.evaluate(() => { startHole('97-3'); loopPaused = true; });
  const hud = await page.evaluate(() => [hudHoleN.textContent, hudParN.textContent, hudStrokesN.textContent].join(','));
  check('HUD shows hole, par and strokes as numerals', hud === '3,3,0', hud);
  check('no words in the hole scene', (await visibleLetters(page)).length === 0);

  /* 10. sinking pulls the pin, rests the ball in the cup off the pole, scores and saves */
  const fin = await page.evaluate(() => {
    progress.worlds.push(97); startHole('97-1'); loopPaused = true;   /* only holes you have reached are saved */
    play.ball = newBall(play.hole, 0, 5.2);
    beginPutt(0, 0.02);
    let pinOut = 0, gap = Infinity;
    for (let i = 0; i < 400 && play.phase !== 'done'; i++) {
      advance(1 / 60); renderFrame(1 / 60);
      const pole = new THREE.Vector3(); flagGroup.getWorldPosition(pole);
      if (play.phase === 'sunk') { pinOut = Math.max(pinOut, Math.hypot(pole.x - play.hole.cup[0], pole.z - play.hole.cup[1])); gap = Math.min(gap, Math.hypot(pole.x - ballMesh.position.x, pole.z - ballMesh.position.z)); }
    }
    return { phase: play.phase, shown: getComputedStyle(holeDone).display !== 'none', score: play.round.score, lit: holeDone.querySelectorAll('.star.on').length,
      pinOut, gap, ballY: ballMesh.position.y - groundH(play.hole, ...play.hole.cup), saved: JSON.parse(localStorage.getItem('puttx.v2')).holes['97-1'], log: sfxLog.slice(-12) };
  });
  check('sinking shows the result: 1 stroke, 3 stars', fin.phase === 'done' && fin.shown && fin.score === 1 && fin.lit === 3, JSON.stringify(fin));
  check('the pin is pulled out and aside; the ball never sits on the pole', fin.pinOut > 0.2 && fin.gap > 0.051 + 0.008, JSON.stringify(fin));
  check('the ball rests down in the cup', fin.ballY < -0.05, JSON.stringify(fin));
  check('the hole is saved', fin.saved && fin.saved.best === 1 && fin.saved.stars === 3, JSON.stringify(fin.saved));
  check('putt and cup sounds fired', fin.log.includes('putt') && fin.log.includes('cup'), fin.log.join());

  /* 11. the double-par cap auto-rolls into the cup */
  const cap = await page.evaluate(() => {
    startHole('97-1'); loopPaused = true; play.round.strokes = 5;
    beginPutt(180, 0);
    let sawAuto = false;
    for (let i = 0; i < 600 && play.phase !== 'done'; i++) { advance(1 / 60); if (play.phase === 'auto') sawAuto = true; }
    return { sawAuto, phase: play.phase, score: play.round.score };
  });
  check('the cap putt auto-rolls in and scores double par', cap.sawAuto && cap.phase === 'done' && cap.score === 6, JSON.stringify(cap));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
