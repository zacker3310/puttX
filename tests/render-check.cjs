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

  for (const key of ['1-1', '1-9']) {
    const f = await page.evaluate(k => {
      startHole(k); snapCamera(); camera.updateMatrixWorld();
      const p = v => v.project(camera), h = play.hole;
      const ball = p(new THREE.Vector3(h.tee[0], groundH(h, ...h.tee), h.tee[1])), cup = p(new THREE.Vector3(h.cup[0], groundH(h, ...h.cup), h.cup[1]));
      return [ball.x, ball.y, cup.x, cup.y].map(v => +v.toFixed(2));
    }, key);
    check(`aim camera frames ball and cup on ${key}`, f.every(v => Math.abs(v) < 0.95), JSON.stringify(f));
  }

  const rot = await page.evaluate(() => { startHole('1-8'); updateMovers(0); const a = moverMeshes[0].rotation.y; updateMovers(1); return [a, moverMeshes[0].rotation.y]; });
  check('crane arm turns with hole time', Math.abs(rot[0] - rot[1]) > 0.5, JSON.stringify(rot));

  const mem = await page.evaluate(() => {
    const snap = () => { renderFrame(0); return renderer.info.memory.geometries + '/' + renderer.info.memory.textures; };
    startHole('1-1'); const a = snap(); startHole('1-9'); snap(); startHole('1-4'); snap(); startHole('1-1'); return [a, snap()];
  });
  check('rebuilding holes leaks no geometry or textures', mem[0] === mem[1], JSON.stringify(mem));

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
