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
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
