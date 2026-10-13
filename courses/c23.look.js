/* world 3, course 23: deep in the temple at golden morning. Misty jade sky, sandstone walls, gold
   tunnels, carved stone doors, and hanging vines on the skyline. Inherits WORLD_LOOK[3]. */
function j23Door(m) {
  const g = new THREE.Group(), stone = mat('#c2b38a', { roughness: 0.9, flatShading: true });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.2, m.len * 2), stone); slab.position.y = 0.1; slab.castShadow = true; g.add(slab);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2 + 0.01, 0.07, m.len * 0.5), mat('#ffd66e', { roughness: 0.4, emissive: 0x6a5010 }));
  eye.position.y = 0.12; g.add(eye);
  const moss = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2 + 0.02, 0.03, m.len * 2 + 0.02), mat('#5f9a4e', { roughness: 1 })); moss.position.y = 0.215; g.add(moss);
  return g;
}
function j23Vine(r) {
  const g = new THREE.Group(), leaf = mat(r() < 0.5 ? '#74c465' : '#4e9a45', { roughness: 0.9 }), n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 5), leaf); b.position.y = 0.12 + i * 0.17; b.rotation.z = (i % 2 ? 1 : -1) * 0.35; b.castShadow = true; g.add(b);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, n * 0.17 + 0.1, 6), mat('#6e5233')); stem.position.y = (n * 0.17 + 0.1) / 2; g.add(stem);
  return g;
}
WORLD_LOOK[23] = {
  sky: ['#9fd8c4', '#fff4d6'], felt: '#2e6a4c', wall: '#b8aa80', skirt: '#7c7458', tube: '#ffc94a', flag: '#ffd66e',
  jingle: [440, 554, 659, 880, 784],
  prop: r => { const k = r(), w3 = typeof j3Palm === 'function', o = !w3 || (k >= 0.55 && k < 0.8) ? j23Vine(r) : k < 0.3 ? j3Palm(r) : k < 0.55 ? j3Fern(r) : j3Ruin(r); o.userData.prop = true; return o; },
  mover: m => m.look === 'door' ? j23Door(m) : WORLD_LOOK[3] && WORLD_LOOK[3].mover ? WORLD_LOOK[3].mover(m) : defaultMover(m, lookOf(23)),
};
