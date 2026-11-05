/* perf-check (browser): the page links a manifest and an apple-touch-icon that both resolve,
   the renderer stays inside the iPad budget (pixel ratio <= 2, one 1024 shadow map), and the
   biggest hole stays under the triangle budget. Frame time under SwiftShader is printed only:
   CI has no GPU, so it is not a pass/fail signal. */
'use strict';
const { check, done, open } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  const links = await page.evaluate(async () => {
    const m = document.querySelector('link[rel=manifest]'), a = document.querySelector('link[rel=apple-touch-icon]');
    const ok = async l => !!l && (await fetch(l.href)).ok;
    return { manifest: await ok(m), icon: await ok(a) };
  });
  check('manifest and apple-touch-icon resolve', links.manifest && links.icon, JSON.stringify(links));
  const budget = await page.evaluate(() => {
    /* triangle counts do not depend on resolution, so the sweep over every hole renders at a tiny
       pixel ratio (same camera, same culling): software rendering at full size takes 20 minutes */
    const pr = renderer.getPixelRatio();
    let maxTris = 0, worst = '';
    renderer.setPixelRatio(0.05);
    for (const w of allCourses()) for (const h of WORLDS[w].holes) {
      startHole(h.key); renderFrame(0.016);
      const t = renderer.info.render.triangles; if (t > maxTris) { maxTris = t; worst = h.key; }
    }
    renderer.setPixelRatio(pr);
    return { pr, map: sun.shadow.mapSize.x, maxTris, worst };
  });
  check('pixel ratio <= 2 and one 1024 shadow map', budget.pr <= 2 && budget.map === 1024, JSON.stringify(budget));
  check('every hole renders under 400k triangles (shadow pass included)', budget.maxTris < 400000, JSON.stringify(budget));
  await page.evaluate(w => { window.budgetWorst = w; }, budget.worst);
  const ms = await page.evaluate(() => { startHole(budgetWorst); const t0 = performance.now(); for (let i = 0; i < 30; i++) renderFrame(1 / 60); return (performance.now() - t0) / 30; });
  console.log(`info  ${budget.worst} frame time under SwiftShader: ${ms.toFixed(1)} ms`);
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
