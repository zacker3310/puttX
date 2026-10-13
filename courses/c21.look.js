/* world 1, course 21, the night pour: the yard at dusk under floodlights. A violet sky, a teal
   felt, floodlight towers among the girder stacks, and concrete buckets for the sliders; belts,
   cranes, boom gates and girders come from course 1. Names are c21-prefixed: every course shares one scope. */
/* floodlight tower: a yellow mast on a red skid with a lamp head that glows */
function c21Flood(r) {
  const g = new THREE.Group(), h = 0.7 + r() * 0.3;
  g.add(c01Box(0.3, 0.05, 0.22, C01.redDown, 0, 0.025, 0), c01Box(0.05, h, 0.05, C01.yellow, 0, h / 2, 0));
  g.add(c01Box(0.26, 0.04, 0.05, C01.yellowDown, 0, h, 0));
  for (const x of [-0.08, 0.08]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: '#fff4c2' }));
    lamp.position.set(x, h + 0.07, 0.01); g.add(lamp, c01Box(0.12, 0.1, 0.03, C01.ink, x, h + 0.07, -0.035));
  }
  g.userData.c01r = 0.22; return g;
}
/* concrete bucket for slide movers: a grey drum with a red rim, the size of the collision disc */
function c21Bucket(m) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(m.r, m.r * 0.8, 0.16, 18), mat('#b9b2a6', { roughness: 0.8 }));
  b.position.y = 0.08; b.castShadow = true;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(m.r * 1.04, m.r * 1.04, 0.035, 18), mat(C01.red, { roughness: 0.5 }));
  rim.position.y = 0.16; g.add(b, rim, c01Box(0.03, 0.12, m.r * 2.1, C01.ink, 0, 0.24, 0));
  return g;
}
WORLD_LOOK[21] = {
  /* the felt keeps the white ball at >= 3:1 (render-check) */
  sky: ['#5d5aa8', '#f6c4b0'], felt: '#2c6a7a', ground: '#a98c72', flag: '#ffd66e', skirt: '#8a6a4c', tube: '#ef7d6d',
  jingle: [523, 622, 784, 932, 1047],
  prop: r => { const k = r(); return k < 0.3 ? c01Cone() : k < 0.5 ? c21Flood(r) : k < 0.65 ? c01Girders(r) : k < 0.85 ? c01Barrels() : c01Digger(r); },
  mover: (m, look) => m.look === 'slab' ? c21Bucket(m) : m.look === 'crane' ? c01Crane(m) : m.look === 'boom' ? c01Boom(m) : defaultMover(m, look),
};
