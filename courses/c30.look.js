/* world 10, course 30: the sky kingdom under the aurora, the grand finale. Inherits WORLD_LOOK[10] with a violet
   dusk sky, a teal felt and slow aurora ribbons far overhead. */
const C30_ICON_SVG = '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="14" fill="#3b3a8c"/><path d="M8 26 C20 10 30 30 42 14 S58 18 58 18" stroke="#7ee0b5" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M14 52 L18 34 L26 44 L32 28 L38 44 L46 34 L50 52 Z" fill="#ffd66e"/></svg>';
WORLD_LOOK[30] = {
  sky: ['#2c2f7a', '#d68ad0'], felt: '#25606a', flag: '#7ee0b5', icon: C30_ICON_SVG, skirt: '#7a5a3a',
  jingle: [523, 784, 1047, 1319, 1568, 2093],
  decor(group, h) {
    if (WORLD_LOOK[10] && WORLD_LOOK[10].decor) WORLD_LOOK[10].decor(group, h);
    /* aurora ribbons: wide flat bands far above and beyond the course */
    const pts = h.floors.flat(), cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, z1 = Math.max(...pts.map(p => p[1])), bands = [];
    ['#7ee0b5', '#b7a7e0', '#6fc0df'].forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 3, 12, 1), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false }));
      m.position.set(cx + (i - 1) * 4, 9 + i * 2.2, z1 + 26 + i * 4); m.rotation.x = -0.35; group.add(m); bands.push({ m, ph: i * 2.1 });
    });
    group.userData.c30bands = bands;
  },
  tick(group, dt, t) {
    if (WORLD_LOOK[10] && WORLD_LOOK[10].tick) WORLD_LOOK[10].tick(group, dt, t);
    if (reducedMotion()) return;
    for (const b of group.userData.c30bands || []) { b.m.material.opacity = 0.25 + 0.12 * Math.sin(t * 0.4 + b.ph); b.m.rotation.z = Math.sin(t * 0.15 + b.ph) * 0.08; }
  },
};
