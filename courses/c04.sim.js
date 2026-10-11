/* world 5, snow: ice patches (low friction), snowmen in the way, narrower lanes, a rolling snowball. */
const SNOWMAN = (x, z) => ({ x, z, r: 0.18, look: 'snowman' });
registerWorld(4, { holes: [
  { par: 2, sol: [[0,0.36,0]], tee: [0, 0.5], cup: [0, 4], shape: rect(-0.5, 0, 0.5, 4.5), zones: [{ surf: 'ice', poly: rect(-0.5, 1.5, 0.5, 3) }] },
  { par: 2, sol: [[0,0.6,0]], tee: [0, 0.5], cup: [0.2, 5.0], shape: rect(-0.6, 0, 0.6, 5.5), posts: [SNOWMAN(-0.25, 1.8), SNOWMAN(0.25, 3.0), SNOWMAN(-0.2, 4.2)] },
  { par: 3, sol: [[34,0.84,0]], tee: [0, 0.5], cup: [2.1, 3.5], shape: [[-0.5, 0], [0.5, 0], [0.5, 3], [2.6, 3], [2.6, 4], [-0.5, 4]], zones: [{ surf: 'ice', poly: rect(-0.5, 2.4, 2.6, 4) }] },
  { par: 3, sol: [[0,0.44,0]], tee: [0, 0.5], cup: [0.1, 4.6], shape: rect(-0.6, 0, 0.6, 5), bumps: [{ x: -0.5, z: 2.5, r: 0.7, h: 0.1 }], zones: [{ surf: 'ice', poly: rect(-0.6, 1.6, 0.6, 3.4) }] },
  { par: 3, sol: [[0,0.48,0]], tee: [0, 0.5], cup: [0, 4.5], shape: rect(-0.9, 0, 0.9, 5), inner: [[[-0.9, 2.4], [-0.25, 2.4]], [[0.25, 2.4], [0.9, 2.4]]],
    movers: [{ kind: 'slide', ax: -0.5, az: 3.3, bx: 0.5, bz: 3.3, r: 0.16, period: 2.4, phase: 0, look: 'snowball' }] },
  { par: 2, sol: [[12,0.68,0]], tee: [0, 0.5], cup: [0.5, 4.5], shape: [[-0.9, 0], [0.9, 0], [0.9, 1.5], [0.3, 1.5], [0.3, 3.5], [0.9, 3.5], [0.9, 5], [-0.9, 5], [-0.9, 3.5], [-0.3, 3.5], [-0.3, 1.5], [-0.9, 1.5]],
    zones: [{ surf: 'ice', poly: rect(-0.3, 1.5, 0.3, 3.5) }] },
  { par: 3, sol: [[12,0.64,0]], tee: [-0.65, 0.5], cup: [0.65, 0.5], shape: rect(-1.3, 0, 1.3, 3.2), inner: [[[0, 0], [0, 2.3]]], zones: [{ surf: 'ice', poly: rect(-1.3, 2.3, 1.3, 3.2) }] },
  { par: 3, sol: [[10,0.52,0]], tee: [0, 0.5], cup: [0.6, 4.4], shape: rect(-1, 0, 1, 5), bumps: [{ x: 0, z: 2.6, r: 0.6, h: -0.12 }],
    posts: [SNOWMAN(-0.45, 3.6), SNOWMAN(0.45, 3.6)], zones: [{ surf: 'ice', poly: rect(-1, 3.0, 1, 5) }] },
  { par: 4, sol: [[306,1,0]], tee: [0, 0.5], cup: [0.2, 6.4], shape: [[-1, 0], [1, 0], [1, 2.8], [2.6, 2.8], [2.6, 7], [-0.2, 7], [-0.2, 5.6], [1.4, 5.6], [1.4, 4], [-1, 4]],
    zones: [{ surf: 'ice', poly: rect(1.4, 2.8, 2.6, 5.6) }],
    movers: [{ kind: 'slide', ax: 0.15, az: 6.3, bx: 1.0, bz: 6.3, r: 0.16, period: 2.6, phase: 0, look: 'snowball' }] },
] });
