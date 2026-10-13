/* round-check (Node): strokes, the double-par cap, out-of-bounds, drift, stars, the course registry
   and progress (bests and stars never get worse; a course's last hole unlocks the next course). */
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
for (let i = 0; i < 4; i++) out = S.resolvePutt(r, stop(), [0, 0.5]);
check('cap: the double-par putt auto-sinks with score 4, 1 star', out === 'auto' && r.done && r.auto && r.score === 4 && S.capOf(h) === 4 && S.starsFor(4, 2) === 1);

r = S.newRound(h);
out = S.resolvePutt(r, { end: 'oob', x: 9, z: 9 }, [0.1, 0.7]);
check('oob: +1 penalty, ball back where it was putted', out === 'oob' && r.strokes === 2 && r.at[0] === 0.1 && r.at[1] === 0.7);

r = S.newRound(h); r.strokes = 3;
out = S.resolvePutt(r, { end: 'oob', x: 9, z: 9 }, [0, 0.5]);
check('oob at the cap still scores the cap, never more', out === 'auto' && r.score === 4);

r = S.newRound(h);
check('timeout counts as a stop', S.resolvePutt(r, { end: 'timeout', x: 0.2, z: 1.1 }, [0, 0.5]) === 'stop' && r.at[0] === 0.2);

r = S.newRound(h); r.strokes = 1;
out = S.resolveDrift(r, { end: 'stop', x: 0.3, z: 1.5 }, [0, 1]);
check('drift moves the ball without a stroke', out === 'stop' && r.strokes === 1 && r.at[1] === 1.5);
out = S.resolveDrift(r, { end: 'oob', x: 9, z: 9 }, [0, 1]);
check('drift off the edge returns the ball free of charge', out === 'oob' && r.strokes === 1 && r.at[1] === 1);

S.registerWorld(99, { g: 0.5, feltMu: 0.2, holes: [{ par: 3, tee: [0, 0.5], cup: [0, 3.5], shape: S.rect(-0.6, 0, 0.6, 4) }] });
const hh = S.holeAt('99-1');
check('registerWorld keys holes and applies world gravity and felt', hh && hh.key === '99-1' && hh.g === 0.5 && Math.abs(hh.feltMu - 0.2 * S.GLIDE) < 1e-12 && hh.par === 3);
check('holeAt misses cleanly', S.holeAt('99-2') === undefined && S.holeAt('42-1') === undefined);
S.registerWorld(98, { holes: Array.from({ length: 18 }, () => ({ par: 3, tee: [0, 0.5], cup: [0, 3.5], shape: S.rect(-0.6, 0, 0.6, 4) })) });
check('nextKey walks 1..18 then stops', S.nextKey('98-9') === '98-10' && S.nextKey('98-17') === '98-18' && S.nextKey('98-18') === null && S.nextKey('99-1') === null);

const first = S.playable()[0], p = S.freshProgress(), k = n => first + '-' + n;
check('fresh progress: the first course open, sound on', p.v === 2 && p.worlds.join() === String(first) && p.sound === true && S.holeUnlocked(p, k(1)) && !S.holeUnlocked(p, k(2)));
S.recordHole(p, k(1), 3, 2);
let rec = S.recordHole(p, k(1), 5, 2);
check('best and stars never get worse', rec.best === 3 && rec.stars === 1);
rec = S.recordHole(p, k(1), 1, 2);
check('a better score improves both', rec.best === 1 && rec.stars === 3 && S.holeUnlocked(p, k(2)));
const list = S.playable().filter(w => w < 90), second = list[1], last = S.WORLDS[first].holes.length;
S.recordHole(p, k(last - 1 > 0 ? last - 1 : 1), 4, 3);
check('a hole before the last opens nothing new', p.worlds.length === 1, p.worlds.join());
S.recordHole(p, k(last), 4, 3);
check('finishing the last hole opens the next playable course and its own night remix', !second || (p.worlds.join() === [first, second].concat(S.WORLDS[first + S.COURSE_STEP] ? [first + S.COURSE_STEP] : [], [S.NIGHT + first]).join() && S.holeUnlocked(p, second + '-1')), p.worlds.join());
check('ten courses in order', S.WORLD_ORDER.join() === '1,2,3,4,5,6,7,8,9,10' && S.HOLES_PER === 18);

done();
