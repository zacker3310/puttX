/* world 10, course 20: the sky kingdom at sunset. Inherits WORLD_LOOK[10] and warms the sky, adds a low sun. */
const C20_ICON_SVG = '<svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="18" fill="#ffb35c"/><rect x="4" y="40" width="56" height="14" rx="7" fill="#fffdf7"/><path d="M14 30 L18 14 L26 24 L32 8 L38 24 L46 14 L50 30 Z" fill="#ffd66e"/><circle cx="32" cy="8" r="3.5" fill="#ef7d6d"/></svg>';
WORLD_LOOK[20] = {
  sky: ['#e8735a', '#ffd9a8'], felt: '#2e6a3c', flag: '#ef7d6d', icon: C20_ICON_SVG, push: '#c86a8a',
  jingle: [659, 880, 988, 1319, 1760],
  decor(group, h) {
    if (WORLD_LOOK[10] && WORLD_LOOK[10].decor) WORLD_LOOK[10].decor(group, h);
    /* a big low sun far beyond the course */
    const pts = h.floors.flat(), cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, z1 = Math.max(...pts.map(p => p[1]));
    const sun = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshBasicMaterial({ color: 0xffc070, fog: false }));
    sun.position.set(cx - 10, 2, z1 + 40); sun.lookAt(cx, 0, 0); group.add(sun);
  },
};
