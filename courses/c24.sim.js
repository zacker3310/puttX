/* world 4, course 24, snow peak, the summit circuit: the world's masterpiece. Stacked terraces and
   switchback stairs, chained ice caves, lift bars guarding every drop, sinkholes with caves at the
   bottom and a grand bobsled run that rides itself all the way home. */
const C24_MAN = (x, z, r = 0.16) => ({ x, z, r, top: 0.4, look: 'snowman' });
const C24_BALL = (ax, az, bx, bz, period, phase = 0, r = 0.16) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'snowball' });
const C24_LIFT = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'lift' });
/* an open-water hole in the ice: a rough n-gon (deterministic, no randomness) */
const C24_POOL = (cx, cz, rx, rz = rx, n = 10) => Array.from({ length: n }, (_, i) => {
  const a = i * 2 * Math.PI / n, k = 1 + 0.08 * Math.cos(3 * a);
  return [+(cx + Math.sin(a) * rx * k).toFixed(3), +(cz + Math.cos(a) * rz * k).toFixed(3)];
});
registerWorld(24, { holes: [
  /* 1. gondola deck: off the deck, over the ice past the snowball, up the ramp to the cup shelf */
  { par: 3, sol: [[12,0.76,0]], tee: [0, 0.5], cup: [0.4, 6.7], shape: rect(-1, 0, 1, 7.6),
    tiers: [{ poly: rect(-1, 0, 1, 1.6), h: 0.3 }, { poly: rect(-1, 5.0, 1, 7.6), h: 0.22 }],
    ramps: [{ x0: -1, z0: 4.2, x1: 1, z1: 5.0, axis: 'z', h0: 0, h1: 0.22 }],
    zones: [{ surf: 'fast', poly: rect(-1, 1.6, 1, 4.2) }], movers: [C24_BALL(-0.55, 3.0, 0.55, 3.0, 2.8)], posts: [C24_MAN(-0.3, 6.3)] },
  /* 2. switchback stair: up the first ramp through the fence, across, up the second ramp to the top terrace */
  { par: 3, sol: [[50,1,0]], tee: [-0.6, 0.5], cup: [0.6, 5.8], aim0: 20, shape: rect(-1.4, 0, 1.4, 6.6),
    inner: [[[-1.4, 2.2], [0.6, 2.2]], [[-0.6, 4.4], [1.4, 4.4]]],
    tiers: [{ poly: rect(-1.4, 2.2, 1.4, 4.4), h: 0.2 }, { poly: rect(-1.4, 4.4, 1.4, 6.6), h: 0.4 }],
    ramps: [{ x0: 0.6, z0: 1.6, x1: 1.4, z1: 2.8, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.4, z0: 3.8, x1: -0.6, z1: 5.0, axis: 'z', h0: 0.2, h1: 0.4 }],
    bumps: [{ x: 0.6, z: 5.8, r: 0.5, h: 0.06 }], posts: [C24_MAN(0, 3.3)] },
  /* 3. cave relay: the first cave fires you across the middle chamber into the second; the lift bar decides */
  { par: 3, sol: [[30,0.64,0]], tee: [0, 0.5], cup: [0.4, 6.3], aim0: 50, shape: rect(-1.6, 0, 1.6, 7.2), inner: [[[-1.6, 2.4], [1.6, 2.4]], [[-1.6, 4.8], [1.6, 4.8]]],
    tubes: [{ a: [0.9, 1.9], b: [-0.9, 3.0], dir: 90 }, { a: [0.9, 3.0], b: [-0.9, 5.4], dir: 45 }],
    movers: [C24_LIFT(0, 3.0, 0, 4.0, 0.3, 0, 2.8)], zones: [{ surf: 'ice', poly: rect(-1.6, 4.8, 1.6, 7.2) }],
    bumps: [{ x: 0.4, z: 6.3, r: 0.5, h: 0.08 }], posts: [C24_MAN(-0.2, 6.6), C24_MAN(-0.3, 1.4)] },
  /* 4. the summit green: a fourteen metre green that leans left all the way, a broad ridge across
     the middle and a swale behind it; lag over the ridge and let the tilt bring it home */
  { par: 3, sol: [[6,1,0]], tee: [1.0, 0.5], cup: [-1.0, 12.8], shape: rect(-2, 0, 2, 14),
    tiers: [{ poly: rect(-2, 0, 2, 14), h: 0.03, sx: 0.012, sz: 0.004 }],
    bumps: [{ x: 0.2, z: 6.0, r: 1.6, h: 0.16 }, { x: -1.6, z: 6.4, r: 1.2, h: 0.1 }, { x: -0.2, z: 9.4, r: 1.5, h: -0.12 }, { x: 1.2, z: 11.6, r: 1.0, h: 0.08 }] },
  /* 5. sinkhole lift: roll into the sinkhole and its cave lifts you to the high shelf; drop off the shelf to the cup */
  { par: 3, sol: [[335,1,0],[100,1,0]], tee: [0, 0.5], cup: [0.9, 2.0], aim0: 0, shape: rect(-1.4, 0, 1.4, 6.6), inner: [[[0.2, 0], [0.2, 3.4]]],
    tiers: [{ poly: rect(-1.4, 4.6, 1.4, 6.6), h: 0.3 }], ramps: [{ x0: -1.4, z0: 3.8, x1: -0.4, z1: 4.6, axis: 'z', h0: 0, h1: 0.3 }],
    bumps: [{ x: -0.6, z: 2.6, r: 0.6, h: -0.25 }, { x: 0.9, z: 2.0, r: 0.5, h: 0.06 }], tubes: [{ a: [-0.6, 2.6], b: [-0.4, 5.6], dir: 90 }],
    zones: [{ surf: 'ice', poly: rect(-1.4, 4.6, 1.4, 6.6) }], posts: [C24_MAN(0.9, 5.6)] },
  /* 6. lift tower: up the lift ramp past the first bar or the cave onto the deck, then through the fence gap past the second bar, down to the lake */
  { par: 4, sol: [[359.76,1,0.5]], tee: [0, 0.5], cup: [-0.6, 8.6], shape: rect(-1.4, 0, 1.4, 9.4), inner: [[[-1.4, 6.0], [-0.3, 6.0]], [[0.3, 6.0], [1.4, 6.0]]],
    ramps: [{ x0: -0.45, z0: 2.0, x1: 0.45, z1: 3.6, axis: 'z', h0: 0, h1: 0.3 }], tiers: [{ poly: rect(-1.4, 3.6, 1.4, 6.0), h: 0.3 }],
    movers: [C24_LIFT(-0.8, 4.0, 0.8, 4.0, 0.35, 90, 3.2), C24_LIFT(-0.5, 5.75, 0.5, 5.75, 0.25, 90, 2.6, 1)], tubes: [{ a: [1.0, 1.4], b: [0.9, 4.9], dir: 330 }],
    zones: [{ surf: 'water', poly: C24_POOL(0.5, 8.0, 0.4, 0.35) }, { surf: 'ice', poly: rect(-1.4, 6.0, 1.4, 7.4) }],
    bumps: [{ x: -0.6, z: 8.6, r: 0.5, h: 0.08 }], posts: [C24_MAN(0.1, 9.0)] },
  /* 7. terraced switchback: up the first run, across the top, down the icy second run, across the bottom and up the third run past the snowball */
  { par: 4, crazy: true, sol: [[345,1,0],[152,1,0]], tee: [0, 0.5], cup: [2.4, 5.7], aim0: 0, shape: rect(-0.6, 0, 3, 6.6), inner: [[[0.6, 0], [0.6, 5.4]], [[1.8, 6.6], [1.8, 1.2]]],
    ramps: [{ x0: -0.6, z0: 1.4, x1: 0.6, z1: 4.0, axis: 'z', h0: 0, h1: 0.3 }, { x0: 0.6, z0: 1.2, x1: 1.8, z1: 4.0, axis: 'z', h0: 0.1, h1: 0.3 }, { x0: 1.8, z0: 1.2, x1: 3, z1: 2.0, axis: 'z', h0: 0.1, h1: 0.2 }],
    tiers: [{ poly: rect(-0.6, 4.0, 1.8, 6.6), h: 0.3 }, { poly: rect(0.6, 0, 3, 1.2), h: 0.1 }, { poly: rect(1.8, 2.0, 3, 6.6), h: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(0.6, 1.2, 1.8, 4.0) }], movers: [C24_BALL(2.06, 3.6, 2.74, 3.6, 2.4, 0, 0.14)], bumps: [{ x: 2.4, z: 5.7, r: 0.5, h: 0.06 }] },
  /* 8. crevasse: cross one of the two ice bridges over the crevasse, then up the narrow ramp to the cup shelf */
  { par: 3, sol: [[345,0.917,0]], tee: [0, 0.5], cup: [0.6, 7.0], aim0: 0,
    floors: [rect(-0.8, 0, 0.8, 3.0), rect(-0.8, 3.0, -0.4, 4.2), rect(0.4, 3.0, 0.8, 4.2), rect(-1.2, 4.2, 1.2, 7.8)],
    walls: [[[-0.8, 4.2], [-0.8, 0], [0.8, 0], [0.8, 4.2]], [[-0.8, 4.2], [-1.2, 4.2], [-1.2, 7.8], [1.2, 7.8], [1.2, 4.2], [0.8, 4.2]]],
    tiers: [{ poly: rect(-1.2, 6.2, 1.2, 7.8), h: 0.2 }], ramps: [{ x0: -0.3, z0: 5.6, x1: 0.3, z1: 6.2, axis: 'z', h0: 0, h1: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(-0.8, 3.0, -0.4, 4.2) }, { surf: 'ice', poly: rect(0.4, 3.0, 0.8, 4.2) }],
    bumps: [{ x: 0.6, z: 5.0, r: 0.3, h: 0.1 }], posts: [C24_MAN(-0.5, 7.2)] },
  /* 9. the grand bobsled: the push-start booster, the banked turn at the top, up the kicker onto the
     race deck and off its lip into the collector drain; its cave fires you sideways into the big
     spiral drain, whose cave feeds the cup drain. Seven stages, one putt. */
  { par: 4, auto: true, sol: [[0, 0.7, 0]], tee: [0, 0.5], cup: [4.6, 2.0], aim0: 0, shape: rect(-0.5, 0, 5.6, 6.0),
    inner: [[[0.5, 0], [0.5, 4.6], [5.6, 4.6]], [[-0.5, 5.3], [0.2, 6.0]]],
    tiers: [{ poly: rect(2.4, 4.6, 3.4, 6.0), h: 0.2 }], ramps: [{ x0: 1.4, z0: 4.6, x1: 2.4, z1: 6.0, axis: 'x', h0: 0, h1: 0.2 }],
    zones: [{ surf: 'fast', push: [0, 1.2], poly: rect(-0.5, 1.0, 0.5, 4.0) }],
    drains: [{ x: 4.7, z: 5.3, r: 0.8, depth: 0.22, flat: 0.12 }, { x: 2.1, z: 2.2, r: 1.15, depth: 0.3, flat: 0.12 }, { x: 4.6, z: 2.0, r: 1.0, depth: 0.25 }],
    tubes: [{ a: [4.7, 5.3], b: [0.85, 2.2], dir: 40, keep: 0, add: 1.2 }, { a: [2.1, 2.2], b: [4.6, 0.85], dir: 40, keep: 0, add: 1.0 }] },
  /* 10. gate terraces: four terraces, each snow fence open at one gap; lift bars slide across the top two */
  { par: 4, sol: [[218,1,0],[14,0.88,0]], tee: [0, 0.5], cup: [0.4, 8.8], shape: rect(-1.4, 0, 1.4, 9.6),
    inner: [[[-1.4, 2.6], [-0.3, 2.6]], [[0.3, 2.6], [1.4, 2.6]], [[-1.4, 5.2], [0.5, 5.2]], [[1.1, 5.2], [1.4, 5.2]], [[-1.4, 7.6], [-1.1, 7.6]], [[-0.5, 7.6], [1.4, 7.6]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 2.6), h: 0.42 }, { poly: rect(-1.4, 2.6, 1.4, 5.2), h: 0.28 }, { poly: rect(-1.4, 5.2, 1.4, 7.6), h: 0.14 }],
    movers: [C24_LIFT(-0.5, 2.35, 0.5, 2.35, 0.3, 90, 2.8), C24_LIFT(0.2, 4.95, 0.8, 4.95, 0.3, 90, 2.4, 1)],
    zones: [{ surf: 'ice', poly: rect(-1.4, 2.6, 1.4, 5.2) }, { surf: 'water', poly: C24_POOL(-0.3, 6.4, 0.35, 0.3) }],
    bumps: [{ x: 0.6, z: 6.6, r: 0.3, h: 0.1 }, { x: 0.4, z: 8.8, r: 0.5, h: 0.06 }], posts: [C24_MAN(-0.4, 8.9)] },
  /* 11. the cornice: a long green with a snow spine down the middle; tee off the right of it, and
     the cup sits on the left behind it, so the lag has to ride the spine or swing round its end */
  { par: 3, sol: [[36,1,0]], tee: [1.4, 0.5], cup: [-1.1, 9.6], shape: rect(-2.2, 0, 2.2, 10.6),
    tiers: [{ poly: rect(-2.2, 0, 2.2, 10.6), h: 0.04, sx: -0.01, sz: 0.004 }],
    bumps: [{ x: 0, z: 3.4, r: 1.1, h: 0.16 }, { x: -0.1, z: 5.4, r: 1.2, h: 0.18 }, { x: 0.1, z: 7.4, r: 1.0, h: 0.14 }, { x: -1.2, z: 7.6, r: 1.0, h: -0.07 }] },
  /* 12. twin chutes: the icy chute past the open water or the mogul chute, onto the terrace, then through the gated fence to the cup */
  { par: 4, sol: [[4,0.8,0]], tee: [0, 0.5], cup: [-0.5, 8.4], shape: rect(-1.4, 0, 1.4, 9.2),
    inner: [[[0, 1.6], [0, 5.6]], [[-1.4, 7.0], [-0.3, 7.0]], [[0.3, 7.0], [1.4, 7.0]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 1.4), h: 0.42 }, { poly: rect(-1.4, 5.6, 1.4, 7.0), h: 0.14 }],
    ramps: [{ x0: -1.4, z0: 1.4, x1: 1.4, z1: 5.6, axis: 'z', h0: 0.42, h1: 0.14 }],
    zones: [{ surf: 'water', poly: C24_POOL(-0.7, 3.6, 0.3, 0.35) }, { surf: 'ice', poly: rect(-1.4, 1.4, 0, 5.6) }],
    bumps: [{ x: 0.5, z: 2.6, r: 0.3, h: 0.12 }, { x: 0.9, z: 3.6, r: 0.3, h: 0.12 }, { x: 0.4, z: 4.6, r: 0.3, h: 0.12 }],
    movers: [C24_LIFT(-0.5, 6.75, 0.5, 6.75, 0.25, 90, 2.6)], posts: [C24_MAN(0.4, 8.6)] },
  /* 13. avalanche chain: four terraces, a fence on each edge; or the summit cave that skips straight to the third */
  { par: 4, crazy: true, sol: [[299.95,0.833,0],[9.98,0.98,0]], tee: [0, 0.5], cup: [0.5, 8.2], shape: rect(-1.4, 0, 1.4, 9),
    inner: [[[-1.4, 1.8], [0.6, 1.8]], [[-0.6, 4.0], [1.4, 4.0]], [[-1.4, 6.2], [-0.3, 6.2]], [[0.3, 6.2], [1.4, 6.2]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 1.8), h: 0.42 }, { poly: rect(-1.4, 1.8, 1.4, 4.0), h: 0.28 }, { poly: rect(-1.4, 4.0, 1.4, 6.2), h: 0.14 }],
    tubes: [{ a: [-1.0, 1.2], b: [-1.0, 4.6], dir: 60 }],
    zones: [{ surf: 'water', poly: C24_POOL(0.2, 3.0, 0.4, 0.35) }, { surf: 'ice', poly: rect(-1.4, 1.8, 1.4, 4.0) }],
    bumps: [{ x: -0.1, z: 5.2, r: 0.3, h: 0.1 }, { x: 0.8, z: 5.3, r: 0.3, h: 0.12 }, { x: 0.5, z: 8.2, r: 0.5, h: 0.06 }],
    movers: [C24_BALL(-0.8, 7.2, 0.8, 7.2, 2.8), C24_LIFT(0.75, 1.55, 1.0, 1.55, 0.2, 90, 2.2)] },
  /* 14. sinkholes: three icy sinkholes with a cave at the bottom of each; one to the cup shelf, two back up the hill */
  { par: 4, sol: [[19.95,1,0],[172.71,0.04,0]], tee: [0, 0.5], cup: [0.6, 7.6], shape: rect(-1.6, 0, 1.6, 8.4),
    tiers: [{ poly: rect(-1.6, 0, 1.6, 1.6), h: 0.25 }, { poly: rect(-1.6, 6.4, 1.6, 8.4), h: 0.2 }],
    ramps: [{ x0: 0.9, z0: 5.8, x1: 1.6, z1: 6.4, axis: 'z', h0: 0, h1: 0.2 }],
    bumps: [{ x: -0.8, z: 3.0, r: 0.6, h: -0.25 }, { x: 0.7, z: 3.4, r: 0.6, h: -0.25 }, { x: -0.3, z: 4.9, r: 0.6, h: -0.25 }],
    tubes: [{ a: [-0.3, 4.9], b: [-1.0, 7.0], dir: 90 }, { a: [-0.8, 3.0], b: [-1.2, 1.0], dir: 90 }, { a: [0.7, 3.4], b: [1.2, 1.0], dir: 270 }],
    zones: [{ surf: 'fast', poly: rect(-1.6, 1.6, 1.6, 5.8) }], posts: [C24_MAN(1.1, 8.0)] },
  /* 15. lift chain: three decks up the mountain, a lift bar at the top of every ramp, then off the summit deck to the lake */
  { par: 5, crazy: true, sol: [[10,0.833,2],[144,0.88,2]], tee: [0, 0.5], cup: [0.5, 11.0], shape: rect(-1.4, 0, 1.4, 11.8),
    ramps: [{ x0: -0.45, z0: 1.4, x1: 0.45, z1: 2.6, axis: 'z', h0: 0, h1: 0.14 }, { x0: 0.5, z0: 4.4, x1: 1.4, z1: 5.4, axis: 'z', h0: 0.14, h1: 0.28 },
      { x0: -1.4, z0: 7.0, x1: -0.5, z1: 8.0, axis: 'z', h0: 0.28, h1: 0.42 }],
    tiers: [{ poly: rect(-1.4, 2.6, 1.4, 5.4), h: 0.14 }, { poly: rect(-1.4, 5.4, 1.4, 8.0), h: 0.28 }, { poly: rect(-1.4, 8.0, 1.4, 9.4), h: 0.42 }],
    movers: [C24_LIFT(-0.8, 3.0, 0.8, 3.0, 0.35, 90, 3.0), C24_LIFT(-0.8, 5.8, 0.8, 5.8, 0.35, 90, 2.6, 1), C24_LIFT(-0.8, 8.4, 0.8, 8.4, 0.35, 90, 2.8, 2)],
    zones: [{ surf: 'ice', poly: rect(-1.4, 8.0, 1.4, 9.4) }, { surf: 'water', poly: C24_POOL(-0.5, 10.6, 0.35, 0.3) }],
    bumps: [{ x: 0.5, z: 11.0, r: 0.4, h: 0.05 }], posts: [C24_MAN(-0.6, 4.0), C24_MAN(0.6, 7.0)] },
  /* 16. the long run-out: a twelve metre green falling away from the tee, three tilted tiers on
     wide banks, a swale and a crown; the pace is everything */
  { par: 3, sol: [[162,0.88,0],[6,0.24,0]], tee: [-0.8, 0.5], cup: [0.8, 11.4], shape: rect(-1.8, 0, 1.8, 12.4),
    tiers: [{ poly: rect(-1.8, 0, 1.8, 4.0), h: 0.24, sx: -0.01, sz: -0.006 }, { poly: rect(-1.8, 5.2, 1.8, 8.4), h: 0.12, sx: 0.012 }, { poly: rect(-1.8, 9.4, 1.8, 12.4), h: 0.02, sx: -0.008 }],
    ramps: [{ x0: -1.8, z0: 4.0, x1: 1.8, z1: 5.2, axis: 'z', h0: 0.216, h1: 0.12 }, { x0: -1.8, z0: 8.4, x1: 1.8, z1: 9.4, axis: 'z', h0: 0.12, h1: 0.02 }],
    bumps: [{ x: 0.5, z: 2.2, r: 1.2, h: -0.08 }, { x: -0.6, z: 6.8, r: 1.3, h: 0.12 }, { x: 0.2, z: 10.4, r: 0.9, h: -0.06 }] },
  /* 17. cave maze: four chambers; walk the gaps round or chain the caves through the middle */
  { par: 4, crazy: true, sol: [[45,1,0],[7.61,1,0]], tee: [0, 0.5], cup: [-0.9, 8.0], aim0: 0, shape: rect(-1.6, 0, 1.6, 9.0),
    inner: [[[-1.6, 2.4], [1.0, 2.4]], [[-1.0, 4.6], [1.6, 4.6]], [[-1.6, 6.8], [1.0, 6.8]]],
    tubes: [{ a: [-0.9, 1.8], b: [0.9, 3.0], dir: 0 }, { a: [0.0, 4.0], b: [-0.9, 5.2], dir: 90 }, { a: [0.9, 6.2], b: [0.9, 7.4], dir: 270 }],
    tiers: [{ poly: rect(-1.6, 6.8, 1.6, 9.0), h: 0.15 }], ramps: [{ x0: 1.0, z0: 6.2, x1: 1.6, z1: 7.4, axis: 'z', h0: 0, h1: 0.15 }],
    zones: [{ surf: 'ice', poly: rect(-1.6, 2.4, 1.6, 4.6) }], posts: [C24_MAN(0.3, 1.2), C24_MAN(-0.2, 8.4)], movers: [C24_BALL(-0.4, 5.8, 0.6, 5.8, 2.6)] },
  /* 18. the peak: off the summit, down the ice funnel, over the moguls, through the gated fence or the cave to the lake, and the cup past the snowball */
  { par: 5, crazy: true, sol: [[144.95,0.667,1],[33.01,0.64,0]], tee: [0, 0.5], cup: [0.6, 10.6], shape: rect(-1.6, 0, 1.6, 11.6),
    inner: [[[-1.6, 2.6], [-0.5, 4.4]], [[1.6, 2.6], [0.5, 4.4]], [[-1.6, 7.4], [-0.3, 7.4]], [[0.3, 7.4], [1.6, 7.4]]],
    tiers: [{ poly: rect(-1.6, 0, 1.6, 1.4), h: 0.42 }, { poly: rect(-1.6, 4.4, 1.6, 7.4), h: 0.22 }],
    ramps: [{ x0: -1.6, z0: 1.4, x1: 1.6, z1: 4.4, axis: 'z', h0: 0.42, h1: 0.22 }],
    zones: [{ surf: 'ice', poly: rect(-1.6, 1.4, 1.6, 4.4) }, { surf: 'water', poly: C24_POOL(-0.6, 10.4, 0.4, 0.35) }],
    bumps: [{ x: 0.6, z: 5.3, r: 0.3, h: 0.12 }, { x: -0.5, z: 5.9, r: 0.3, h: 0.1 }, { x: 0.3, z: 6.5, r: 0.25, h: 0.1 }],
    tubes: [{ a: [-1.1, 6.6], b: [-1.0, 8.4], dir: 45 }], movers: [C24_LIFT(-0.5, 7.15, 0.5, 7.15, 0.25, 90, 2.6), C24_BALL(0.0, 9.4, 1.2, 9.4, 2.6)],
    posts: [C24_MAN(1.2, 10.9)] },
] });
