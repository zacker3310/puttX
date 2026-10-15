/* world 6, course 26: the caldera. The volcano's masterpiece: stacked basalt decks, switchback
   ramps up the crater wall, chained lava tubes from crater to crater, sliding basalt gates over
   the drops, and two lava-tube expresses that ride a good putt all the way in.
   Crater cups: a cone plus a narrower bowl at one spot leaves a flat floor for the cup. */
const V26_CRATER = (x, z, k = 1) => [{ x, z, r: 1.1 * k, h: 0.32 }, { x, z, r: 0.55 * k, h: -0.2 }];
const V26_LAVA = poly => ({ surf: 'water', poly });
const V26_MUD = poly => ({ surf: 'mud', poly });
const V26_COL = (x, z, r = 0.12) => ({ x, z, r, top: 0.3, look: 'basalt' });
const V26_ROCK = (ax, az, bx, bz, period, phase = 0, r = 0.18) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'boulder' });
const V26_GATE = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'basalt' });
registerWorld(26, { holes: [
  /* 1: off the rim deck through the gap, past the cone, into the crater (3 stages) */
  { par: 3, sol: [[324,1,0]], tee: [0.5, 0.6], cup: [0.4, 6.8], aim0: 345, shape: rect(-1.2, 0, 1.2, 7.8),
    inner: [[[-0.3, 2.4], [1.2, 2.4]]],
    tiers: [{ poly: rect(-1.3, -0.1, 1.3, 2.4), h: 0.3 }],
    bumps: [{ x: -0.3, z: 4.4, r: 0.5, h: 0.24 }, ...V26_CRATER(0.4, 6.8, 0.85)],
    zones: [V26_LAVA(rect(0.3, 3.8, 1.2, 4.4)), V26_MUD(rect(-1.2, 5.4, -0.5, 6)), V26_LAVA(rect(-1.2, 7.4, -0.2, 7.8))] },
  /* 2: up the ramp to the crater shelf; its tube drops you by the cup green below (3 stages) */
  { par: 3, sol: [[346,0.72,0],[0,0.84,0]], tee: [0, 0.5], cup: [-1.9, 1.6], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 5.6], [-2.8, 5.6], [-2.8, 0.4], [-1.2, 0.4], [-1.2, 3.6], [-0.7, 3.6]],
    ramps: [{ x0: -0.7, z0: 1.8, x1: 0.7, z1: 3, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-0.8, 3, 0.8, 5.7), h: 0.3 }, { poly: rect(-1.25, 3.6, -0.7, 5.7), h: 0.3 }],
    bumps: [...V26_CRATER(0, 4.6, 0.65), ...V26_CRATER(-1.9, 1.6, 0.85)],
    tubes: [{ a: [0, 4.6], b: [-2.3, 4.6], dir: 180 }],
    zones: [V26_LAVA(rect(-2.8, 3.2, -2.2, 3.7)), V26_MUD(rect(-1.6, 3.2, -1.2, 3.6))] },
  /* 3: long green: off the rim tier, down the bank, then a 7 m read past a shoulder and a swale */
  { par: 3, sol: [[4,0.88,0]], tee: [0, 0.5], cup: [0.7, 11.8], shape: rect(-2, 0, 2, 12.8),
    tiers: [{ poly: rect(-2.1, -0.1, 2.1, 4), h: 0.3 }, { poly: rect(-2.1, 5.5, 2.1, 12.9), h: 0.045, sz: 0.01 }],
    ramps: [{ x0: -2, z0: 4, x1: 2, z1: 5.5, axis: 'z', h0: 0.3, h1: 0.1 }],
    bumps: [{ x: 1.1, z: 8, r: 2, h: 0.14 }, { x: -1.2, z: 10.5, r: 1.4, h: -0.09 }, { x: -0.6, z: 2, r: 1.2, h: 0.07 }] },
  /* 4: two lava rivers, two bridges, a boulder on the second (3 stages) */
  { par: 3, sol: [[44,0.92,0.5],[4,0.12,0]], tee: [0, 0.5], cup: [0.6, 7.8], shape: rect(-1.5, 0, 1.5, 8.8),
    bumps: [{ x: -0.3, z: 4.2, r: 0.5, h: 0.26 }, ...V26_CRATER(0.6, 7.8, 0.85)],
    movers: [V26_ROCK(-1.15, 6, -0.25, 6, 2.2)],
    zones: [V26_LAVA(rect(-1.5, 2.6, 0.5, 3.1)), V26_LAVA(rect(-0.5, 5.2, 1.5, 5.7)), V26_MUD(rect(0.5, 3.1, 1.5, 3.5)), V26_LAVA(rect(-1.5, 8.5, 0, 8.8))] },
  /* 5: the triple vortex: down the chute, off the banked corner, round vortex one into its tube,
     spat at a fixed pace round vortex two into a second tube, then spat into the last vortex and
     round and round into the cup (auto, 6 stages) */
  { par: 4, auto: true, sol: [[0, 0.9, 0]], tee: [0, 0.5], cup: [5.4, 4.2], aim0: 0,
    shape: [[-0.4, 0], [7, 0], [7, 7.4], [0.4, 7.4], [-0.4, 6.6]],
    inner: [[[0.4, 0], [0.4, 5.2]], [[0.4, 4.2], [3.7, 4.2]], [[3.7, 0], [3.7, 6.6], [2.9, 7.4]]],
    tiers: [{ poly: rect(-0.5, -0.1, 0.4, 1.6), h: 0.3 }],
    ramps: [{ x0: -0.4, z0: 1.6, x1: 0.4, z1: 3.2, axis: 'z', h0: 0.3, h1: 0 }],
    drains: [{ x: 2.3, z: 5.8, r: 1.5, depth: 0.3, flat: 0.11 }, { x: 2.3, z: 2, r: 1.4, depth: 0.3, flat: 0.11 }, { x: 5.4, z: 4.2, r: 1.5, depth: 0.32 }],
    tubes: [{ a: [2.3, 5.8], b: [1.4, 0.5], dir: 0, keep: 0, add: 1.45 }, { a: [2.3, 2], b: [6.4, 0.6], dir: 0, keep: 0, add: 1.6 }],
    zones: [{ surf: 'fast', poly: rect(-0.4, 1.6, 0.4, 3.2) }] },
  /* 6: switchback up the crater wall: three legs, two ramps, ash on the middle leg (3 stages) */
  { par: 4, sol: [[30,0.92,0.5],[92,0.84,0]], tee: [0, 0.5], cup: [1.1, 7.3], shape: rect(-1.8, 0, 1.8, 8.2),
    inner: [[[-1.8, 2.7], [1, 2.7]], [[-1, 5.4], [1.8, 5.4]]],
    tiers: [{ poly: rect(-1.9, 2.7, 1.9, 5.4), h: 0.18 }, { poly: rect(-1.9, 5.4, 1.9, 8.3), h: 0.36 }],
    ramps: [{ x0: 1, z0: 2.2, x1: 1.8, z1: 3.2, axis: 'z', h0: 0, h1: 0.18 }, { x0: -1.8, z0: 4.9, x1: -1, z1: 5.9, axis: 'z', h0: 0.18, h1: 0.36 }],
    movers: [V26_ROCK(0.2, 3.1, 0.2, 5, 2.6)],
    posts: [V26_COL(0.2, 6.6), V26_COL(-0.4, 7.3)],
    zones: [{ surf: 'sand', poly: rect(-0.6, 2.75, -0.2, 5.35) }, V26_LAVA(rect(-1.8, 0, -1.2, 1.2)), V26_LAVA(rect(0.3, 7.85, 1.8, 8.2))] },
  /* 7: the basalt windmill guards the ramp to the crater shelf (3 stages) */
  { par: 3, sol: [[24,0.96,0]], tee: [0, 0.5], cup: [-0.4, 7.4], shape: rect(-1.4, 0, 1.4, 8.4),
    movers: [{ kind: 'spin', x: 0, z: 3, len: 0.75, w: 1.1, phase: 0, blades: 2, look: 'basalt' }],
    ramps: [{ x0: -1.4, z0: 4.6, x1: 1.4, z1: 5.6, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: rect(-1.5, 5.6, 1.5, 8.5), h: 0.25 }],
    bumps: [...V26_CRATER(-0.4, 7.4, 0.85)],
    zones: [V26_LAVA(rect(-1.4, 4.6, -0.7, 5.6)), V26_MUD(rect(0.3, 6.2, 1.4, 6.7)), V26_LAVA(rect(-1.4, 8.1, 0.4, 8.4))] },
  /* 8: lava falls: four decks stepping down through offset gaps, a gate on the first (crazy, 4 stages) */
  { par: 4, crazy: true, sol: [[238,1,1.5],[192,0.72,0]], tee: [0, 0.5], cup: [-0.6, 10.4], shape: rect(-1.2, 0, 1.2, 11.2),
    inner: [[[-1.2, 2.8], [-0.35, 2.8]], [[0.35, 2.8], [1.2, 2.8]], [[-1.2, 5.6], [0.3, 5.6]], [[-0.3, 8.4], [1.2, 8.4]]],
    tiers: [{ poly: rect(-1.4, -0.2, 1.4, 2.8), h: 0.42 }, { poly: rect(-1.4, 2.8, 1.4, 5.6), h: 0.28 }, { poly: rect(-1.4, 5.6, 1.4, 8.4), h: 0.14 }],
    movers: [V26_GATE(-0.55, 2.4, 0.55, 2.4, 0.3, 90, 3)],
    posts: [V26_COL(-0.2, 9.8), V26_COL(-1.0, 9.8)],
    zones: [V26_LAVA(rect(0.4, 4, 1.2, 4.6)), V26_LAVA(rect(-1.2, 6.8, -0.4, 7.4)), V26_LAVA(rect(0.2, 10.8, 1.2, 11.2)), V26_MUD(rect(-1.2, 3.8, -0.6, 4.4))] },
  /* 9: long green: the caldera floor, 13 m across a big shoulder, a hollow and a last knoll */
  { par: 3, sol: [[24,1,0]], tee: [0, 0.5], cup: [-1.2, 12.8], shape: rect(-2.5, 0, 2.5, 13.8),
    tiers: [{ poly: rect(-2.6, -0.1, 2.6, 13.9), h: 0.2, sx: 0.02, sz: 0.004 }],
    bumps: [{ x: 1.4, z: 4.5, r: 2.5, h: 0.18 }, { x: -1.5, z: 8, r: 2, h: -0.12 }, { x: 1, z: 11, r: 1.5, h: 0.1 }] },
  /* 10: the gated drop: a basalt gate slides across the gap off the deck, then the boulder lane (3 stages) */
  { par: 4, sol: [[315,0.92,0]], tee: [0, 0.5], cup: [-0.7, 8.2], shape: rect(-1.4, 0, 1.4, 9.2),
    tiers: [{ poly: rect(-1.5, -0.1, 1.5, 3.8), h: 0.36 }],
    inner: [[[-1.4, 3.8], [-0.4, 3.8]], [[0.4, 3.8], [1.4, 3.8]]],
    movers: [V26_GATE(-0.84, 3.4, 0.84, 3.4, 0.3, 90, 3.2), V26_ROCK(-0.9, 6, 0.9, 6, 2.6, 0.5)],
    bumps: [{ x: 0.6, z: 4.8, r: 0.45, h: 0.2 }, ...V26_CRATER(-0.7, 8.2, 0.85)],
    zones: [V26_LAVA(rect(0.3, 7, 1.4, 7.5)), V26_MUD(rect(-1.4, 4.4, -0.7, 5)), V26_LAVA(rect(-1.4, 8.9, 0.2, 9.2))] },
  /* 11: two crater mouths on the shelf: one tube drops beside the cup, the other back to the tee (3 stages) */
  { par: 4, sol: [[335.5,1,0]], tee: [0, 0.5], cup: [0.8, 8.4], aim0: 0, shape: rect(-1.5, 0, 1.5, 9.2),
    ramps: [{ x0: -1.5, z0: 1.6, x1: 1.5, z1: 2.6, axis: 'z', h0: 0, h1: 0.24 }],
    tiers: [{ poly: rect(-1.6, 2.6, 1.6, 5.4), h: 0.24 }],
    inner: [[[-1.5, 5.4], [-0.6, 5.4]], [[0.1, 5.4], [1.5, 5.4]]],
    bumps: [...V26_CRATER(-0.8, 4, 0.7), ...V26_CRATER(0.8, 4, 0.7), ...V26_CRATER(0.8, 8.4, 0.85)],
    posts: [V26_COL(0.1, 7.6), V26_COL(-0.5, 8.2)],
    tubes: [{ a: [-0.8, 4], b: [-0.9, 6.6], dir: 30 }, { a: [0.8, 4], b: [1, 0.6], dir: 340 }],
    zones: [V26_LAVA(rect(0.4, 6.6, 1.5, 7.1)), V26_LAVA(rect(-1.5, 8.9, 0, 9.2)), V26_MUD(rect(-1.5, 7.2, -0.9, 7.8))] },
  /* 12: chained tubes: crater to the upper deck, crater to the cup green, or the ramps the long way (crazy, 4 stages) */
  { par: 4, crazy: true, sol: [[26.6,0.92,0],[194.2,0.7,0]], tee: [0, 0.5], cup: [-2.6, 1.2], aim0: 0,
    shape: [[-0.8, 0], [0.8, 0], [0.8, 7], [-3.4, 7], [-3.4, 0], [-1.8, 0], [-1.8, 4.4], [-0.8, 4.4]],
    tiers: [{ poly: rect(-3.5, 4.4, 0.9, 7.1), h: 0.34 }],
    ramps: [{ x0: -0.8, z0: 3.2, x1: 0.8, z1: 4.4, axis: 'z', h0: 0, h1: 0.34 }, { x0: -3.4, z0: 3.4, x1: -1.8, z1: 4.4, axis: 'z', h0: 0, h1: 0.34 }],
    bumps: [...V26_CRATER(0, 1.8, 0.7), ...V26_CRATER(-1.2, 6, 0.7), ...V26_CRATER(-2.6, 1.2, 0.85)],
    tubes: [{ a: [0, 1.8], b: [0.3, 5.6], dir: 300 }, { a: [-1.2, 6], b: [-2.9, 3], dir: 180 }],
    movers: [V26_ROCK(-0.2, 5.3, -0.2, 6.6, 2.2, 0.5)],
    posts: [V26_COL(-2.2, 2.4)],
    zones: [V26_LAVA(rect(-2.2, 4.4, -1.8, 5)), V26_LAVA(rect(-3.4, 6.2, -3, 7)), V26_MUD(rect(-0.4, 6.6, 0.8, 7))] },
  /* 13: the caldera express: down the chute, off the banked corner, round the vortex into its tube,
     out onto the lava river that carries the ball the other way, round the hairpin, off the
     bank and round the cup vortex (auto, 6 stages) */
  { par: 3, auto: true, sol: [[0, 0.9, 0]], tee: [0, 0.5], cup: [-1.9, 1.4], aim0: 0,
    shape: [[-3.7, 0.8], [-2.9, 0], [0.4, 0], [0.4, 6.6], [-0.4, 7.4], [-2.9, 7.4], [-3.7, 6.6]],
    inner: [[[-0.4, 0], [-0.4, 5.2]], [[-0.4, 4.2], [-3.7, 4.2]], [[-0.4, 2.8], [-3, 2.8]], [[-3.7, 3.4], [-2.9, 4.2]]],
    tiers: [{ poly: rect(-0.4, -0.1, 0.5, 1.6), h: 0.3 }],
    ramps: [{ x0: -0.4, z0: 1.6, x1: 0.4, z1: 3.2, axis: 'z', h0: 0.3, h1: 0 }],
    drains: [{ x: -2.3, z: 5.8, r: 1.5, depth: 0.3, flat: 0.11 }, { x: -1.9, z: 1.4, r: 1.2, depth: 0.3 }],
    tubes: [{ a: [-2.3, 5.8], b: [-0.7, 3.5], dir: 270, keep: 0, add: 1 }],
    zones: [{ surf: 'fast', poly: rect(-0.4, 1.6, 0.4, 3.2) }, { surf: 'fast', push: [-0.5, 0], poly: rect(-3, 2.85, -0.45, 4.15) }, { surf: 'fast', push: [0, -0.6], poly: rect(-3.65, 0.9, -3.05, 3.3) }] },
  /* 14: switchback with a gate on the top leg and lava on the hairpins (3 stages) */
  { par: 4, sol: [[320,1,2],[16,0.48,0]], tee: [0, 0.5], cup: [-1.2, 7.3], shape: rect(-1.8, 0, 1.8, 8.2),
    inner: [[[-1, 2.7], [1.8, 2.7]], [[-1.8, 5.4], [1, 5.4]]],
    tiers: [{ poly: rect(-1.9, 2.7, 1.9, 5.4), h: 0.18 }, { poly: rect(-1.9, 5.4, 1.9, 8.3), h: 0.36 }],
    ramps: [{ x0: -1.8, z0: 2.2, x1: -1, z1: 3.2, axis: 'z', h0: 0, h1: 0.18 }, { x0: 1, z0: 4.9, x1: 1.8, z1: 5.9, axis: 'z', h0: 0.18, h1: 0.36 }],
    movers: [V26_GATE(0.2, 7.2, 0.2, 6.3, 0.35, 0, 3)],
    bumps: [{ x: 0, z: 1.4, r: 0.45, h: 0.22 }, { x: 0, z: 4, r: 0.5, h: 0.24 }],
    zones: [V26_LAVA(rect(1.2, 0, 1.8, 1.2)), V26_LAVA(rect(-1.8, 3.2, -1.3, 3.9)), V26_MUD(rect(0.2, 2.75, 0.6, 5.35)), V26_LAVA(rect(-1.8, 7.85, -0.4, 8.2))] },
  /* 15: the stacked decks: ramp up, ramp up again, then a gated drop to the crater (crazy, 4 stages) */
  { par: 4, crazy: true, sol: [[6,1,0],[122,1,0]], tee: [0, 0.5], cup: [1.6, 2], aim0: 0,
    shape: [[-0.9, 0], [0.9, 0], [0.9, 6.4], [1.2, 6.4], [1.2, 0.6], [2.6, 0.6], [2.6, 8], [-0.9, 8]],
    inner: [[[-0.9, 5.6], [0, 5.6]]],
    ramps: [{ x0: -0.9, z0: 2, x1: 0.9, z1: 3.2, axis: 'z', h0: 0, h1: 0.18 }, { x0: 0, z0: 4.8, x1: 0.9, z1: 5.8, axis: 'z', h0: 0.18, h1: 0.36 }],
    tiers: [{ poly: rect(-1, 3.2, 1, 5.6), h: 0.18 }, { poly: rect(-1, 5.6, 1.15, 8.1), h: 0.36 }, { poly: rect(1.15, 3.6, 2.7, 8.1), h: 0.36 }],
    movers: [V26_GATE(1.6, 3.95, 2.2, 3.95, 0.24, 90, 3.2)],
    bumps: [{ x: -0.3, z: 4.2, r: 0.4, h: 0.18 }, ...V26_CRATER(1.9, 1.7, 0.75)],
    zones: [V26_LAVA(rect(-0.9, 7.5, 0.3, 8)), V26_LAVA(rect(2.1, 6.6, 2.6, 7.4)), V26_MUD(rect(-0.9, 1, -0.3, 1.6))] },
  /* 16: the tube maze: ramp to the deck, the crater tube or the drop, the boulder ledge and the cup plateau (crazy, 4 stages) */
  { par: 5, crazy: true, sol: [[328,0.92,0],[2,0.88,0]], tee: [0, 0.5], cup: [3, 0.8], aim0: 0,
    shape: [[-0.8, 0], [0.8, 0], [0.8, 2], [0.8, 3.4], [2.2, 3.4], [2.2, 0], [3.8, 0], [3.8, 5.4], [-0.8, 5.4]],
    ramps: [{ x0: -0.8, z0: 2, x1: 0.8, z1: 3.4, axis: 'z', h0: 0, h1: 0.34 }, { x0: 2.2, z0: 1.6, x1: 3.8, z1: 2.6, axis: 'z', h0: 0.16, h1: 0 }],
    tiers: [{ poly: rect(-0.9, 3.4, 3.9, 5.5), h: 0.34 }, { poly: rect(2.1, -0.1, 3.9, 1.6), h: 0.16 }],
    inner: [[[2.2, 3.4], [3.2, 3.4]]],
    bumps: [...V26_CRATER(1.4, 4.5, 0.65), ...V26_CRATER(3, 0.8, 0.8)],
    tubes: [{ a: [1.4, 4.5], b: [3.4, 2.9], dir: 200 }],
    movers: [V26_ROCK(2.6, 2.2, 3.4, 2.2, 2, 0.3, 0.15)],
    zones: [V26_LAVA(rect(-0.8, 5, 0.4, 5.4)), V26_LAVA(rect(3.3, 4.6, 3.8, 5.4)), V26_MUD(rect(2.2, 2.6, 2.6, 3.3))] },
  /* 17: long green: a 9 m side-slope with a crown in the middle: round it high or low */
  { par: 2, sol: [[347.76,0.69,0]], tee: [0, 0.5], cup: [-0.6, 8.6], shape: rect(-1.6, 0, 1.6, 9.6),
    tiers: [{ poly: rect(-1.7, -0.1, 1.7, 9.7), h: 0.15, sx: -0.035 }],
    bumps: [{ x: 0, z: 5, r: 1.2, h: 0.12 }, { x: 1, z: 7.5, r: 1, h: -0.05 }] },
  /* 18: the summit: boulder run, switchback up two decks, the gated vent, the summit crater, or the tube (crazy, 4 stages) */
  { par: 5, crazy: true, sol: [[10,0.92,1],[6,0.52,0]], tee: [0, 0.5], cup: [2.2, 9.6], aim0: 0,
    shape: [[-0.8, 0], [0.8, 0], [0.8, 3.6], [3.2, 3.6], [3.2, 10.8], [-0.8, 10.8]],
    inner: [[[-0.8, 6.8], [1.6, 6.8]], [[2.4, 6.8], [3.2, 6.8]]],
    ramps: [{ x0: -0.8, z0: 2.6, x1: 0.8, z1: 3.8, axis: 'z', h0: 0, h1: 0.18 }, { x0: 0.8, z0: 3.6, x1: 2, z1: 5.2, axis: 'x', h0: 0.18, h1: 0.32 }],
    tiers: [{ poly: rect(-1, 3.8, 0.8, 6.8), h: 0.18 }, { poly: rect(2, 3.6, 3.4, 6.8), h: 0.32 }, { poly: rect(0.8, 5.2, 2, 6.8), h: 0.32 }, { poly: rect(-1, 6.8, 3.4, 11), h: 0.12 }],
    movers: [V26_ROCK(-0.45, 1.6, 0.45, 1.6, 2.2), V26_GATE(1.6, 6.4, 2.6, 6.4, 0.18, 90, 3)],
    bumps: [...V26_CRATER(2.2, 9.6, 0.9), ...V26_CRATER(2.5, 4.7, 0.6)],
    tubes: [{ a: [2.5, 4.7], b: [0, 10.1], dir: 140 }],
    zones: [V26_LAVA(rect(-0.8, 8, 1.2, 8.5)), V26_LAVA(rect(2.6, 7.6, 3.2, 8.2)), V26_MUD(rect(-0.8, 5.6, -0.2, 6.2)), V26_LAVA(rect(0.4, 10.4, 3.2, 10.8))] },
] });
