/* world 1, construction day: straight shots, walls, bank shots, slopes, a crane arm.
   Each hole's `sol` is printed by `npm run solve -- --world 1`; holes-check replays it. */
registerWorld(1, { holes: [
  { par: 2, sol: [[0,0.4,0]], tee: [0, 0.5], cup: [0, 3.5], shape: rect(-0.6, 0, 0.6, 4) },
  { par: 2, sol: [[60,0.92,0]], tee: [0, 0.5], cup: [2.2, 3.0], shape: [[-0.6, 0], [0.6, 0], [0.6, 2.4], [2.8, 2.4], [2.8, 3.6], [-0.6, 3.6]] },
  { par: 2, sol: [[0,0.76,0]], tee: [0, 0.5], cup: [0, 4.4], shape: rect(-0.8, 0, 0.8, 5), zones: [{ surf: 'sand', poly: rect(-0.8, 2, 0.3, 3) }] },
  { par: 3, sol: [[28,1,0],[6,0.88,0]], tee: [0, 0.5], cup: [0, 4.5], shape: rect(-1, 0, 1, 5), inner: [[[-1, 2.5], [0.55, 2.5]], [[-0.55, 3.6], [1, 3.6]]] },
  { par: 2, sol: [[2,0.8,0]], tee: [0, 0.5], cup: [0, 4], shape: rect(-0.8, 0, 0.8, 4.5), bumps: [{ x: 0.25, z: 2.2, r: 0.6, h: 0.12 }] },
  { par: 3, sol: [[14,0.92,0]], tee: [-0.8, 0.5], cup: [0.8, 0.5], shape: rect(-1.6, 0, 1.6, 3), inner: [[[0, 0], [0, 2]]] },
  { par: 3, sol: [[0,0.48,0]], tee: [0, 0.5], cup: [0, 3.2], shape: rect(-1, 0, 1, 4.5), bumps: [{ x: 0, z: 3.2, r: 0.6, h: 0.14 }] },
  { par: 2, sol: [[0,0.96,0]], tee: [0, 0.5], cup: [0, 4.5], shape: rect(-0.9, 0, 0.9, 5), movers: [{ kind: 'spin', x: 0, z: 2.5, len: 0.66, w: 1.4, phase: 0, look: 'crane' }] },
  { par: 3, sol: [[12,0.6,0]], tee: [0, 0.5], cup: [1.7, 5.8], shape: [[-1, 0], [1, 0], [1, 3.2], [2.4, 3.2], [2.4, 6.4], [-1, 6.4]],
    bumps: [{ x: 0, z: 1.8, r: 0.5, h: 0.1 }], zones: [{ surf: 'sand', poly: rect(1.2, 3.2, 2.4, 4.2) }],
    movers: [{ kind: 'spin', x: 0.7, z: 4.8, len: 0.6, w: -1.2, phase: 0.8, look: 'crane' }] },
] });
