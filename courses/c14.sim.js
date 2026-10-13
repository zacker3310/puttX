/* world 4, course 14, snow peak, the back bowls: more intricate than course 4. Terraces that step
   down the mountain, ice caves (tubes) that cut through the snowbanks, ski-lift bars guarding the
   decks, rolling snowballs and a bobsled run that rides itself home. */
const C14_MAN = (x, z, r = 0.16) => ({ x, z, r, top: 0.4, look: 'snowman' });
const C14_BALL = (ax, az, bx, bz, period, phase = 0, r = 0.17) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'snowball' });
const C14_LIFT = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'lift' });
/* an open-water hole in the ice: a rough n-gon (deterministic, no randomness) */
const C14_POOL = (cx, cz, rx, rz = rx, n = 10) => Array.from({ length: n }, (_, i) => {
  const a = i * 2 * Math.PI / n, k = 1 + 0.08 * Math.cos(3 * a);
  return [+(cx + Math.sin(a) * rx * k).toFixed(3), +(cz + Math.cos(a) * rz * k).toFixed(3)];
});
registerWorld(14, { holes: [
  /* 1. first chair: off the lift deck, down the ramp, over the ice to the cup on a drift */
  { par: 2, sol: [], tee: [0, 0.5], cup: [0, 5.7], shape: rect(-0.7, 0, 0.7, 6.6),
    tiers: [{ poly: rect(-0.7, 0, 0.7, 1.4), h: 0.2 }], ramps: [{ x0: -0.7, z0: 1.4, x1: 0.7, z1: 2.4, axis: 'z', h0: 0.2, h1: 0 }],
    zones: [{ surf: 'ice', poly: rect(-0.7, 2.4, 0.7, 4.4) }], bumps: [{ x: 0, z: 5.7, r: 0.6, h: 0.1 }], posts: [C14_MAN(0.32, 3.4)] },
  /* 2. mogul steps: drop off the deck into the moguls, then the narrow ramp up to the cup shelf */
  { par: 3, sol: [], tee: [0, 0.5], cup: [0.5, 6.6], shape: rect(-1, 0, 1, 7.4),
    tiers: [{ poly: rect(-1, 0, 1, 1.8), h: 0.35 }, { poly: rect(-1, 5.4, 1, 7.4), h: 0.25 }],
    ramps: [{ x0: -0.35, z0: 4.6, x1: 0.35, z1: 5.4, axis: 'z', h0: 0, h1: 0.25 }],
    bumps: [{ x: -0.5, z: 2.8, r: 0.35, h: 0.15 }, { x: 0.5, z: 3.3, r: 0.38, h: 0.16 }, { x: -0.15, z: 4.0, r: 0.3, h: 0.12 }],
    posts: [C14_MAN(-0.3, 6.4)] },
  /* 3. ice cave: the cave cuts under the snowbank and fires you at the ramp, or go round by the gap */
  { par: 3, sol: [], tee: [0, 0.5], cup: [-1.0, 5.8], aim0: 330, shape: rect(-1.6, 0, 1.6, 6.6), inner: [[[-1.6, 3.2], [0.9, 3.2]]],
    tubes: [{ a: [-1.0, 2.5], b: [-0.2, 3.7], dir: 330 }], posts: [C14_MAN(-0.4, 1.5)],
    tiers: [{ poly: rect(-1.6, 5.2, 1.6, 6.6), h: 0.2 }], ramps: [{ x0: -1.6, z0: 4.5, x1: 0.2, z1: 5.2, axis: 'z', h0: 0, h1: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(-1.6, 3.2, 1.6, 4.5) }] },
  /* 4. lift line: beat the lift bar through the gap, slip between the snowballs, climb to the deck */
  { par: 3, sol: [], tee: [0, 0.5], cup: [-0.35, 6.9], shape: rect(-1, 0, 1, 7.8), inner: [[[-1, 2.4], [-0.3, 2.4]], [[0.3, 2.4], [1, 2.4]]],
    movers: [C14_LIFT(-0.44, 2.7, 0.44, 2.7, 0.35, 90, 3.0), C14_BALL(-0.6, 4.2, 0.6, 4.2, 2.8, 1)],
    zones: [{ surf: 'ice', poly: rect(-1, 3.0, 1, 5.0) }],
    ramps: [{ x0: -1, z0: 5.0, x1: 1, z1: 5.9, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1, 5.9, 1, 7.8), h: 0.25 }], posts: [C14_MAN(0.3, 6.6)] },
  /* 5. three terraces: drop through the gap in each snow fence, terrace by terrace, to the cup */
  { par: 3, sol: [], tee: [0.6, 0.5], cup: [-0.5, 6.3], shape: rect(-1.2, 0, 1.2, 7.2),
    inner: [[[-1.2, 2.2], [-0.2, 2.2]], [[0.45, 2.2], [1.2, 2.2]], [[-0.4, 4.6], [1.2, 4.6]]],
    tiers: [{ poly: rect(-1.2, 0, 1.2, 2.2), h: 0.5 }, { poly: rect(-1.2, 2.2, 1.2, 4.6), h: 0.25 }],
    zones: [{ surf: 'ice', poly: rect(-1.2, 2.2, 1.2, 4.6) }], bumps: [{ x: 0.6, z: 3.4, r: 0.35, h: 0.1 }, { x: -0.5, z: 6.3, r: 0.6, h: 0.08 }] },
  /* 6. bobsled run: down the summit chute into the ice cave, back up the second run, through the
     lower cave and out into the funnel bowl. A good putt rides the whole thing in. */
  { par: 3, auto: true, sol: [[0, 0.9, 0]], tee: [0, 0.5], cup: [3.0, 4.0], aim0: 0, shape: rect(-0.5, 0, 4.3, 5.6),
    inner: [[[0.5, 0], [0.5, 5.6]], [[1.5, 0], [1.5, 5.6]]],
    tiers: [{ poly: rect(-0.5, 0, 0.5, 1.2), h: 0.6 }, { poly: rect(-0.5, 4.0, 0.5, 5.6), h: 0.35 }, { poly: rect(0.5, 4.2, 1.5, 5.6), h: 0.35 }],
    ramps: [{ x0: -0.5, z0: 1.2, x1: 0.5, z1: 4.0, axis: 'z', h0: 0.6, h1: 0.35 }, { x0: 0.5, z0: 1.6, x1: 1.5, z1: 4.2, axis: 'z', h0: 0, h1: 0.35 }],
    zones: [{ surf: 'ice', poly: rect(-0.5, 4.0, 0.5, 5.6) }, { surf: 'ice', poly: rect(0.5, 0, 1.5, 1.6) }],
    tubes: [{ a: [0, 4.3], b: [1.0, 5.0], dir: 180, keep: 0, add: 1.6 }, { a: [1.0, 1.3], b: [3.0, 0.6], dir: 0, keep: 0, add: 2.3 }],
    bumps: [{ x: 3.0, z: 4.0, r: 0.8, h: -0.2 }], posts: [C14_MAN(2.0, 2.2), C14_MAN(4.0, 2.2)] },
] });
