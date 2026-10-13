/* world 3, course 13: the jungle temple at dusk. Warm sunset sky, deeper felt, and sliding stone
   doors carved with a gold glyph. Everything else comes from WORLD_LOOK[3]. */
function j13Door(m) {
  const g = new THREE.Group(), stone = mat('#a39a7c', { roughness: 0.9, flatShading: true });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.2, m.len * 2), stone); slab.position.y = 0.1; slab.castShadow = true; g.add(slab);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2 + 0.02, 0.03, m.len * 2 + 0.02), mat('#74c465', { roughness: 1 })); cap.position.y = 0.215; g.add(cap);
  for (const s of [-1, 1]) {
    const glyph = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2 + 0.01, 0.06, m.len * 0.6), mat('#ffd66e', { roughness: 0.4, emissive: 0x6a5010 }));
    glyph.position.set(0, 0.11, s * m.len * 0.45); g.add(glyph);
  }
  return g;
}
WORLD_LOOK[13] = {
  sky: ['#f0a77c', '#ffe6b8'], felt: '#2a6540', ground: '#4f5a2c', flag: '#ef7d6d', tube: '#ffb35c',
  jingle: [349, 440, 523, 698, 659],
  mover: m => m.look === 'door' ? j13Door(m) : WORLD_LOOK[3] && WORLD_LOOK[3].mover ? WORLD_LOOK[3].mover(m) : defaultMover(m, lookOf(13)),
};
