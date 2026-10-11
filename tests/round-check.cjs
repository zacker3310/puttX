/* round-check (Node): strokes, the par + 3 cap, out-of-bounds, drift, stars, the world registry
   and progress (bests and stars never get worse; hole 9 unlocks the next world). */
'use strict';
const { check, done } = require('./lib.cjs');
const S = require('./sim.cjs').loadSim();

const h = S.makeHole({ par: 2, tee: [0, 0.5], cup: [0, 3.5], shape: S.rect(-0.6, 0, 0.6, 4) });
const stop = (x = 0, z = 1) => ({ end: 'stop', x, z });

let r = S.newRound(h);
check('hole in one: score 1, done, 3 stars', S.resolvePutt(r, { end: 'sunk' }, [0, 0.5]) === 'sunk' && r.done && r.score === 1 && S.starsFor(1, 2) === 3);

r = S.newRound(h);
S.resolvePutt(r, stop(0, 2), [0, 0.5]);
check('a stop moves the ball and counts a stroke', r.strokes === 1 && r.at[1] === 2 && !r.done);
S.resolvePutt(r, { end: 'sunk' }, [0, 2]);
check('par: score 2, 2 stars', r.score === 2 && S.starsFor(2, 2) === 2);

r = S.newRound(h);
let out;
for (let i = 0; i < 5; i++) out = S.resolvePutt(r, stop(), [0, 0.5]);
check('cap: the par + 3 putt auto-sinks with score 5, 1 star', out === 'auto' && r.done && r.auto && r.score === 5 && S.capOf(h) === 5 && S.starsFor(5, 2) === 1);

r = S.newRound(h);
out = S.resolvePutt(r, { end: 'oob', x: 9, z: 9 }, [0.1, 0.7]);
check('oob: +1 penalty, ball back where it was putted', out === 'oob' && r.strokes === 2 && r.at[0] === 0.1 && r.at[1] === 0.7);

r = S.newRound(h); r.strokes = 4;
out = S.resolvePutt(r, { end: 'oob', x: 9, z: 9 }, [0, 0.5]);
check('oob at the cap still scores the cap, never more', out === 'auto' && r.score === 5);

r = S.newRound(h);
check('timeout counts as a stop', S.resolvePutt(r, { end: 'timeout', x: 0.2, z: 1.1 }, [0, 0.5]) === 'stop' && r.at[0] === 0.2);

r = S.newRound(h); r.strokes = 1;
out = S.resolveDrift(r, { end: 'stop', x: 0.3, z: 1.5 }, [0, 1]);
check('drift moves the ball without a stroke', out === 'stop' && r.strokes === 1 && r.at[1] === 1.5);
out = S.resolveDrift(r, { end: 'oob', x: 9, z: 9 }, [0, 1]);
check('drift off the edge returns the ball free of charge', out === 'oob' && r.strokes === 1 && r.at[1] === 1);

S.registerWorld(99, { g: 0.5, feltMu: 0.2, holes: [{ par: 3, tee: [0, 0.5], cup: [0, 3.5], shape: S.rect(-0.6, 0, 0.6, 4) }] });
const hh = S.holeAt('99-1');
check('registerWorld keys holes and applies world gravity and felt', hh && hh.key === '99-1' && hh.g === 0.5 && hh.feltMu === 0.2 && hh.par === 3);
check('holeAt misses cleanly', S.holeAt('99-2') === undefined && S.holeAt('42-1') === undefined);
check('nextKey walks 1..9 then stops', S.nextKey('1-1') === '1-2' && S.nextKey('5-9') === null);

const p = S.freshProgress();
check('fresh progress: world 1 open, sound on', p.worlds.join() === '1' && p.sound === true && S.holeUnlocked(p, '1-1') && !S.holeUnlocked(p, '1-2'));
S.recordHole(p, '1-1', 3, 2);
let rec = S.recordHole(p, '1-1', 5, 2);
check('best and stars never get worse', rec.best === 3 && rec.stars === 1);
rec = S.recordHole(p, '1-1', 1, 2);
check('a better score improves both', rec.best === 1 && rec.stars === 3 && S.holeUnlocked(p, '1-2'));
S.recordHole(p, '1-9', 4, 3);
check('finishing hole 9 opens the next world in order', p.worlds.join() === '1,5' && S.holeUnlocked(p, '5-1'));
check('world order is construction, snow, space', S.WORLD_ORDER.join() === '1,5,8');

done();
