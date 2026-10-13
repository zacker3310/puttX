/* world 1, course 11, the late shift: golden hour over the same construction yard. A warm apricot
   sky, a deeper green felt and cement mixers turning among the cones and diggers; belts, cranes,
   boom gates and girders all come from course 1. Names are c11-prefixed: every course shares one scope. */
/* cement mixer: a drum on a little red cart, the drum turns slowly in `tick` */
function c11Mixer(r) {
  const g = new THREE.Group();
  g.add(c01Box(0.36, 0.06, 0.2, C01.redDown, 0, 0.09, 0), c01Box(0.05, 0.09, 0.05, C01.ink, -0.13, 0.045, 0.07), c01Box(0.05, 0.09, 0.05, C01.ink, -0.13, 0.045, -0.07));
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), mat(C01.inkStrong, { roughness: 0.7 }));
  wheel.rotation.x = Math.PI / 2; wheel.position.set(0.14, 0.05, 0); g.add(wheel);
  const drum = new THREE.Group(); drum.position.set(0, 0.24, 0); drum.rotation.z = 0.5;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.22, 14), mat(C01.yellow, { roughness: 0.5 }));
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.06, 14), mat(C01.yellowDown, { roughness: 0.5 }));
  mouth.position.y = 0.14; body.castShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.03, 14), mat(C01.red, { roughness: 0.5 }));
  drum.add(body, mouth, band); drum.userData.c11spin = 0.8 + r() * 0.6; g.add(drum);
  g.userData.c01r = 0.26; return g;
}
WORLD_LOOK[11] = {
  /* the felt keeps the white ball at >= 3:1 (render-check) */
  sky: ['#f4a76f', '#ffe9c7'], felt: '#2f7a4a', ground: '#c99a6b', flag: '#ffd66e', skirt: '#9c7446',
  jingle: [587, 698, 880, 698, 1175],
  prop: r => { const k = r(); return k < 0.3 ? c01Cone() : k < 0.5 ? c11Mixer(r) : k < 0.65 ? c01Girders(r) : k < 0.85 ? c01Barrels() : c01Digger(r); },
  tick(group, dt) {
    if (reducedMotion()) return;
    for (const o of group.children) for (const c of o.children) if (c.userData.c11spin) c.rotation.y += c.userData.c11spin * dt;
  },
};
