/* save-check (browser): progress persists under puttx.v2; corrupt, foreign or wrongly shaped
   data falls back to a fresh save without a console error. */
'use strict';
const { check, done, open, URL } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  const reload = async () => { await page.goto(URL); await page.waitForFunction(() => window.booted === true); };

  await page.evaluate(() => { localStorage.clear(); progress = freshProgress(); recordHole(progress, playable()[0] + '-1', 2, 2); saveProgress(); });
  await reload();
  const kept = await page.evaluate(() => progress.holes[playable()[0] + '-1']);
  check('progress survives a reload', kept && kept.best === 2 && kept.stars === 2, JSON.stringify(kept));

  for (const [name, raw] of [['not json', '{oops'], ['wrong version', '{"v":7,"holes":{},"worlds":[1]}'], ['no worlds', '{"v":2,"holes":{}}'], ['null holes', '{"v":2,"holes":null,"worlds":[1]}'],
    ['bad hole entries', '{"v":2,"holes":{"1-1":{"best":"x","stars":9},"zz":3},"worlds":[1]}'], ['foreign worlds', '{"v":2,"holes":{},"worlds":[42,"a"]}']]) {
    await page.evaluate(r => localStorage.setItem('puttx.v2', r), raw);
    await reload();
    const p = await page.evaluate(() => ({ worlds: progress.worlds.join(), first: playable()[0], holes: Object.keys(progress.holes).length, sound: progress.sound }));
    check('corrupt save (' + name + ') loads as fresh', p.worlds === String(p.first) && p.holes === 0 && p.sound === true, JSON.stringify(p));
  }
  /* a v1 save (the old 27 holes) is left alone and the new game starts fresh */
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('puttx.v1', '{"v":1,"holes":{"1-1":{"best":1,"stars":3}},"worlds":[1,5],"sound":false}'); });
  await reload();
  const v1 = await page.evaluate(() => ({ holes: Object.keys(progress.holes).length, old: !!localStorage.getItem('puttx.v1') }));
  check('a v1 save starts the v2 game fresh and is not destroyed', v1.holes === 0 && v1.old, JSON.stringify(v1));
  /* three profiles: separate saves, the last one used comes back, erasing takes two taps */
  await page.evaluate(() => { localStorage.clear(); });
  await reload();
  const slots = await page.evaluate(() => {
    useSlot(1); recordHole(progress, playable()[0] + '-1', 2, 2); progress.coins = 40; saveProgress();
    useSlot(2); const fresh2 = Object.keys(progress.holes).length === 0 && progress.coins === 0;
    recordHole(progress, playable()[0] + '-1', 1, 2); recordHole(progress, playable()[0] + '-2', 1, 2); saveProgress();
    useSlot(1); const back1 = progress.holes[playable()[0] + '-1'].best === 2 && !progress.holes[playable()[0] + '-2'] && progress.coins === 40;
    useSlot(2);
    return { fresh2, back1, s1: slotSummary(1), s2: slotSummary(2), s3: slotSummary(3) };
  });
  check('each profile keeps its own save', slots.fresh2 && slots.back1 && slots.s1.stars === 2 && slots.s1.coins === 40 && slots.s2.stars === 6 && slots.s3 === null, JSON.stringify(slots));
  await reload();
  check('the last profile played comes back after a reload', await page.evaluate(() => slot === 2 && Object.keys(progress.holes).length === 2));
  const bin = await page.evaluate(() => {
    showProfiles();
    const bins = () => profileRow.querySelectorAll('.bin');
    const n0 = bins().length; bins()[0].click(); const armed = bins()[0].classList.contains('armed') && slotUsed(1);
    bins()[0].click();
    return { n0, armed, gone: slotSummary(1) === null, other: slotSummary(2) !== null, n1: bins().length, active: slot };
  });
  check('erasing a profile takes two taps and leaves the others alone', bin.n0 === 2 && bin.armed && bin.gone && bin.other && bin.n1 === 1 && bin.active === 2, JSON.stringify(bin));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
