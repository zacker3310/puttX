/* save-check (browser): progress persists under puttx.v1; corrupt, foreign or wrongly shaped
   data falls back to a fresh save without a console error. */
'use strict';
const { check, done, open, URL } = require('./lib.cjs');

(async () => {
  const { browser, page, errors } = await open();
  const reload = async () => { await page.goto(URL); await page.waitForFunction(() => window.booted === true); };

  await page.evaluate(() => { localStorage.clear(); progress = freshProgress(); recordHole(progress, '1-1', 2, 2); saveProgress(); });
  await reload();
  const kept = await page.evaluate(() => progress.holes['1-1']);
  check('progress survives a reload', kept && kept.best === 2 && kept.stars === 2, JSON.stringify(kept));

  for (const [name, raw] of [['not json', '{oops'], ['wrong version', '{"v":7,"holes":{},"worlds":[1]}'], ['no worlds', '{"v":1,"holes":{}}'],
    ['bad hole entries', '{"v":1,"holes":{"1-1":{"best":"x","stars":9},"zz":3},"worlds":[1]}'], ['foreign worlds', '{"v":1,"holes":{},"worlds":[42,"a"]}']]) {
    await page.evaluate(r => localStorage.setItem('puttx.v1', r), raw);
    await reload();
    const p = await page.evaluate(() => ({ worlds: progress.worlds.join(), holes: Object.keys(progress.holes).length, sound: progress.sound }));
    check('corrupt save (' + name + ') loads as fresh', p.worlds === '1' && p.holes === 0 && p.sound === true, JSON.stringify(p));
  }
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
