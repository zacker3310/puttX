const CONE_SVG = '<svg viewBox="0 0 64 64"><path d="M32 6 L48 54 H16 Z" fill="#ef7d6d"/><path d="M26 24 H38 L41 33 H23 Z M21 40 H43 L45 46 H19 Z" fill="#fff8ec"/><rect x="10" y="52" width="44" height="7" rx="3" fill="#c95a4c"/></svg>';
function trafficCone() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 20), mat('#ef7d6d', { roughness: 0.5 })); c.position.y = 0.15;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.04, 20), mat('#fff8ec', { roughness: 0.5 })); band.position.y = 0.15;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.2), mat('#c95a4c')); base.position.y = 0.012;
  c.castShadow = base.castShadow = true; g.add(c, band, base); return g;
}
function girderStack(r) {
  const g = new THREE.Group(), n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), mat('#ef7d6d', { roughness: 0.6 })); b.position.set(0, 0.04 + i * 0.08, (i % 2) * 0.05); b.castShadow = true; g.add(b); }
  return g;
}
WORLD_LOOK[1] = {
  /* felt, dirt and ice are tuned so the white ball renders at >= 3:1 against them (render-check) */
  felt: '#36803a', sand: '#8a6236', wall: '#ffd66e', ground: '#c9a476', sky: ['#9fd8ef', '#fff1d6'], flag: '#ef7d6d', icon: CONE_SVG,
  jingle: [523, 659, 784, 659, 1047],
  prop: r => r() < 0.6 ? trafficCone() : girderStack(r),
};

