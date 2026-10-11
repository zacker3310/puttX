/* render-check (browser): a hole renders as a lit 3D scene (floor with interior vertices, one
   wall box per segment, a cup, tube mouths, floor skirts), the frame is not blank, the ball mesh
   sits on the physics ball (and hides in a tube), walls stand as tall as the physics says, the
   aim camera keeps the ball in frame from every tee and never sits inside a hill, the overview
   frames the whole hole, movers follow hole time, and rebuilding holes leaks no GPU memory.
   Every course's look renders its first hole without errors, with the ball readable on its felt. */
'use strict';
const { check, done, open } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  await page.evaluate(() => {
    registerWorld(97, { holes: [
      { par: 3, tee: [0, 0.5], cup: [1.6, 5.5], shape: rect(-0.8, 0, 2.4, 6), inner: [[[0.8, 0], [0.8, 4]]], tubes: [{ a: [0, 3.4], b: [1.6, 3.4], dir: 0 }],
        tiers: [{ poly: rect(0.8, 4.5, 2.4, 6), h: 0.2 }], ramps: [{ x0: 0.8, z0: 4, x1: 2.4, z1: 4.5, axis: 'z', h0: 0, h1: 0.2 }],
        movers: [{ kind: 'spin', x: -0.0, z: 1.8, len: 0.5, w: 1.2, phase: 0, blades: 2 }, { kind: 'gate', ax: 1.6, az: 2.2, bx: 1.6, bz: 2.2, len: 0.3, ang: 90, period: 3 }] },
    ] });
    loopPaused = true; startHole('97-1'); renderFrame(0);
  });

  const g = await page.evaluate(() => {
    const floor = holeGroup.getObjectByName('floor'), walls = holeGroup.getObjectByName('walls'), tubes = holeGroup.getObjectByName('tubes');
    return { tris: floor.geometry.index.count / 3, walls: walls.children.filter(c => c.geometry.type === 'BoxGeometry').length,
      segs: play.hole.segs.length, cup: !!holeGroup.getObjectByName('cup'), tubes: tubes.children.length, skirt: !!holeGroup.getObjectByName('skirt'),
      shadows: renderer.shadowMap.enabled, lights: scene.children.filter(c => c.isDirectionalLight && c.castShadow).length, pr: renderer.getPixelRatio() };
  });
  check('floor mesh is a real grid (> 1000 triangles)', g.tris > 1000, JSON.stringify(g));
  check('one wall box per wall segment, a cup, both tube ends, floor skirts', g.walls === g.segs && g.cup && g.tubes === 2 && g.skirt, JSON.stringify(g));
  check('soft shadows from exactly one sun; pixel ratio <= 2', g.shadows && g.lights === 1 && g.pr <= 2, JSON.stringify(g));

  const walls = await page.evaluate(() => {
    const ws = holeGroup.getObjectByName('walls').children.filter(c => c.geometry.type === 'BoxGeometry');
    return ws.map((w, i) => { w.geometry.computeBoundingBox(); return Math.abs(w.position.y + w.geometry.boundingBox.max.y - play.hole.segTop[i][0]); });
  });
  check('every wall stands exactly as tall as the physics says', walls.every(d => d < 1e-6), JSON.stringify(walls.slice(0, 4)));

  const px = await page.evaluate(() => {
    const rt = new THREE.WebGLRenderTarget(120, 70), buf = new Uint8Array(120 * 70 * 4);
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.readRenderTargetPixels(rt, 0, 0, 120, 70, buf); renderer.setRenderTarget(null);
    const set = new Set(); for (let i = 0; i < buf.length; i += 16) set.add((buf[i] >> 3) + ',' + (buf[i + 1] >> 3) + ',' + (buf[i + 2] >> 3));
    rt.dispose(); return set.size;
  });
  check('the frame is not blank (> 40 distinct colours)', px > 40, 'colours: ' + px);

  const b = await page.evaluate(() => ({ m: ballMesh.position.toArray(), x: play.ball.x, y: play.ball.y + BALL_R, z: play.ball.z, r: ballMesh.geometry.parameters.radius }));
  check('ball mesh sits on the physics ball, at the new size', Math.abs(b.m[0] - b.x) < 1e-6 && Math.abs(b.m[1] - b.y) < 1e-6 && Math.abs(b.m[2] - b.z) < 1e-6 && b.r === 0.051, JSON.stringify(b));
  const hid = await page.evaluate(() => { play.ball = newBall(play.hole, 0, 3); play.ball.tube = { def: play.hole.tubes[0], t: 0.3, v: 1 }; renderFrame(0.016); const v = ballMesh.visible; play.ball = newBall(play.hole, ...play.hole.tee); renderFrame(0.016); return [v, ballMesh.visible]; });
  check('the ball hides inside a tube', hid[0] === false && hid[1] === true, JSON.stringify(hid));

  const rot = await page.evaluate(() => { updateMovers(0); const a = moverMeshes[0].rotation.y; updateMovers(1); return [a, moverMeshes[0].rotation.y, moverMeshes[0].children.length]; });
  check('a windmill turns with hole time and has two blades', Math.abs(rot[0] - rot[1]) > 0.5 && rot[2] >= 3, JSON.stringify(rot));

  /* every tee of every course: the ball in frame, in front of the camera, camera clear of the ground; overview frames the hole */
  const framing = await page.evaluate(() => {
    const bad = [];
    for (const w of playable().concat([97])) for (const h of WORLDS[w].holes) {
      startHole(h.key); snapCamera(); camera.updateMatrixWorld();
      const ball = new THREE.Vector3(h.tee[0], groundH(h, ...h.tee) + BALL_R, h.tee[1]).project(camera);
      const camGround = groundH(h, camera.position.x, camera.position.z);
      if (!(Math.abs(ball.x) < 0.9 && Math.abs(ball.y) < 0.9 && ball.z < 1) || camera.position.y < camGround + 0.3) bad.push(h.key + ' ball ' + [ball.x, ball.y].map(v => v.toFixed(2)));
      setOverview(true); snapCamera(); camera.updateMatrixWorld();
      for (const p of [h.tee, h.cup]) { const v = new THREE.Vector3(p[0], groundH(h, ...p), p[1]).project(camera); if (!(Math.abs(v.x) < 1 && Math.abs(v.y) < 1)) bad.push(h.key + ' overview'); }
      setOverview(false);
    }
    return bad;
  });
  check('every tee: ball in frame, camera above ground; overview frames tee and cup', framing.length === 0, framing.slice(0, 6).join(' | '));

  const mem = await page.evaluate(() => {
    const snap = () => { renderFrame(0); return renderer.info.memory.geometries + '/' + renderer.info.memory.textures; };
    const k = playable()[0];
    startHole(k + '-1'); const a = snap(); startHole('97-1'); snap(); startHole(k + '-2'); snap(); startHole(k + '-1'); return [a, snap()];
  });
  check('rebuilding holes leaks no geometry or textures', mem[0] === mem[1], JSON.stringify(mem));

  /* every course look renders and the white ball reads against its felt at 3:1 */
  const looks = await page.evaluate(() => {
    const lum = p => { const c = [0, 1, 2].map(i => { const s = p[i] / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    return playable().map(w => {
      startHole(w + '-1'); loopPaused = true; snapCamera(); renderFrame(0.016); putter.visible = false; aimGroup.visible = false; renderer.render(scene, camera);
      const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      const at = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera), px = new Uint8Array(4); gl.readPixels(Math.round((v.x + 1) / 2 * W), Math.round((v.y + 1) / 2 * H), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [...px]; };
      const b = play.ball, ball = at(b.x, b.y + BALL_R * 1.7, b.z);
      /* felt beside the ball, wherever there is felt with nothing on it */
      let felt = null;
      for (const [dx, dz] of [[0.25, 0.2], [-0.25, 0.2], [0.2, -0.15], [-0.2, -0.15], [0, 0.35]]) {
        const x = b.x + dx, z = b.z + dz;
        if (onFloor(play.hole, x, z) && !zoneAt(play.hole, x, z) && play.hole.segs.every(s => { const p = closestOnSeg(...s, x, z); return Math.hypot(x - p[0], z - p[1]) > 0.1; })) { felt = at(x, groundH(play.hole, x, z), z); break; }
      }
      if (!felt) return { w, ratio: 99 };
      const L1 = lum(ball), L2 = lum(felt);
      return { w, ratio: +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2), ball, felt };
    });
  });
  check('every course look renders; the ball reads on its felt (>= 3:1)', looks.every(l => l.ratio >= 3), JSON.stringify(looks.filter(l => l.ratio < 3)));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
