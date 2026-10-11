/* render-check (browser): a hole renders as a lit 3D scene (floor with interior vertices, one
   wall box per segment, a cup), the frame is not blank, the ball mesh sits on the physics ball,
   the aim camera frames ball and cup, movers follow hole time, and rebuilding holes leaks no
   GPU geometry or textures. */
'use strict';
const { check, done, open } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  await page.evaluate(() => { loopPaused = true; startHole('1-1'); renderFrame(0); });

  const g = await page.evaluate(() => {
    const floor = holeGroup.getObjectByName('floor'), walls = holeGroup.getObjectByName('walls');
    return { tris: floor.geometry.index.count / 3, walls: walls.children.filter(c => c.geometry.type === 'BoxGeometry').length,
      segs: play.hole.segs.length, cup: !!holeGroup.getObjectByName('cup'), shadows: renderer.shadowMap.enabled,
      lights: scene.children.filter(c => c.isDirectionalLight && c.castShadow).length, pr: renderer.getPixelRatio() };
  });
  check('floor mesh is a real grid (> 1000 triangles)', g.tris > 1000, JSON.stringify(g));
  check('one wall box per wall segment, plus a cup', g.walls === g.segs && g.cup, JSON.stringify(g));
  check('soft shadows from exactly one sun; pixel ratio <= 2', g.shadows && g.lights === 1 && g.pr <= 2, JSON.stringify(g));

  const px = await page.evaluate(() => {
    const rt = new THREE.WebGLRenderTarget(120, 70), buf = new Uint8Array(120 * 70 * 4);
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.readRenderTargetPixels(rt, 0, 0, 120, 70, buf); renderer.setRenderTarget(null);
    const set = new Set(); for (let i = 0; i < buf.length; i += 16) set.add((buf[i] >> 3) + ',' + (buf[i + 1] >> 3) + ',' + (buf[i + 2] >> 3));
    rt.dispose(); return set.size;
  });
  check('the frame is not blank (> 40 distinct colours)', px > 40, 'colours: ' + px);

  const b = await page.evaluate(() => ({ m: ballMesh.position.toArray(), x: play.ball.x, y: play.ball.y + BALL_R, z: play.ball.z }));
  check('ball mesh sits on the physics ball', Math.abs(b.m[0] - b.x) < 1e-6 && Math.abs(b.m[1] - b.y) < 1e-6 && Math.abs(b.m[2] - b.z) < 1e-6, JSON.stringify(b));

  /* every hole, from the tee: the aim camera keeps the ball and the cup on screen */
  const framing = await page.evaluate(() => {
    const bad = [];
    for (const w of WORLD_ORDER) for (const h of (WORLDS[w] ? WORLDS[w].holes : [])) {
      startHole(h.key); snapCamera(); camera.updateMatrixWorld();
      const p = v => v.project(camera);
      const ball = p(new THREE.Vector3(h.tee[0], groundH(h, ...h.tee) + BALL_R, h.tee[1])), cup = p(new THREE.Vector3(h.cup[0], groundH(h, ...h.cup), h.cup[1]));
      const f = [ball.x, ball.y, cup.x, cup.y].map(v => +v.toFixed(2));
      if (!f.every(v => Math.abs(v) < 0.9)) bad.push(h.key + ' ' + f.join());
    }
    return bad;
  });
  check('aim camera frames ball and cup from every tee', framing.length === 0, framing.join(' | '));

  const rot = await page.evaluate(() => { startHole('1-8'); updateMovers(0); const a = moverMeshes[0].rotation.y; updateMovers(1); return [a, moverMeshes[0].rotation.y]; });
  check('crane arm turns with hole time', Math.abs(rot[0] - rot[1]) > 0.5, JSON.stringify(rot));

  const mem = await page.evaluate(() => {
    const snap = () => { renderFrame(0); return renderer.info.memory.geometries + '/' + renderer.info.memory.textures; };
    startHole('1-1'); const a = snap(); startHole('1-9'); snap(); startHole('1-4'); snap(); startHole('1-1'); return [a, snap()];
  });
  check('rebuilding holes leaks no geometry or textures', mem[0] === mem[1], JSON.stringify(mem));

  const snow = await page.evaluate(() => { const ok = startHole('5-2'); renderFrame(0.016); return { ok, flakes: !!holeGroup.userData.snow, posts: play.hole.posts.length }; });
  check('snow world builds with snowfall and snowmen', snow.ok && snow.flakes && snow.posts === 3, JSON.stringify(snow));

  /* the ball must stand out from the felt it sits on: rendered pixels, 3:1 like any graphic */
  for (const [key, spot, what] of [['1-1', null, 'felt'], ['1-3', [-0.3, 2.5], 'dirt'], ['5-1', null, 'felt'], ['5-1', [0, 2.2], 'ice'], ['8-1', null, 'felt']]) {
    const c = await page.evaluate(([k, spot]) => {
      if (!startHole(k)) return null;
      if (spot) play.ball = newBall(play.hole, spot[0], spot[1]);
      loopPaused = true; snapCamera(); renderFrame(0.016); renderer.render(scene, camera);
      const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      const at = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera), px = new Uint8Array(4); gl.readPixels(Math.round((v.x + 1) / 2 * W), Math.round((v.y + 1) / 2 * H), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [...px]; };
      const lum = p => { const c = [0, 1, 2].map(i => { const s = p[i] / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      const b = play.ball, ball = at(b.x, b.y + BALL_R * 1.7, b.z), felt = at(b.x + 0.25, b.y, b.z + 0.2), L1 = lum(ball), L2 = lum(felt);
      return { ball, felt, ratio: +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2) };
    }, [key, spot]);
    if (c) check(`ball reads against the ${what} on ${key} (>= 3:1 rendered)`, c.ratio >= 3, JSON.stringify(c));
  }

  /* the outside ground never paints over the course, even where bowls dip below it */
  const bowl = await page.evaluate(() => {
    startHole('5-8'); loopPaused = true; snapCamera(); renderFrame(0.016);
    const gl = renderer.getContext(), b = play.hole.bumps[0], v = new THREE.Vector3(b.x, groundH(play.hole, b.x, b.z), b.z).project(camera);
    const x = Math.round((v.x + 1) / 2 * gl.drawingBufferWidth), y = Math.round((v.y + 1) / 2 * gl.drawingBufferHeight);
    const read = () => { renderer.render(scene, camera); const px = new Uint8Array(4); gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [...px]; };
    const ground = holeGroup.children.find(o => o.geometry && o.geometry.type === 'PlaneGeometry');
    const shown = read(); ground.visible = false; const hidden = read(); ground.visible = true;
    return { shown, hidden };
  });
  check('a bowl below ground level still shows its felt', bowl.shown.join() === bowl.hidden.join(), JSON.stringify(bowl));

  const space = await page.evaluate(() => { const ok = startHole('8-2'); renderFrame(0.016); return { ok, g: play.hole.g, open: play.hole.open, stars: !!holeGroup.userData.stars, fog: scene.fog }; });
  check('space builds open, low gravity, starfield, no fog', space.ok && space.g === 0.427 && space.open && space.stars && space.fog === null, JSON.stringify(space));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
