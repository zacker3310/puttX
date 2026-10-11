/* The pro shop: coins, putters, balls. Hooks the game calls:
     initShop()                          once at boot, after the renderer exists
     onHoleFinished(key, score, par)     a hole was just recorded in `progress`
     renderWallet()                      the map was redrawn
   Save fields (kept by loadProgress, repaired here): progress.coins (whole, >= 0),
   progress.owned (item ids), progress.equipped {putter, ball}, progress.firsts (hole keys
   that already paid the first-clear bonus). Coins only ever go down by buying.
   Putters set FEEL from FEEL_BASE (how a pad gesture becomes angle and power), never the
   physics, so every hole proof still holds. Balls are looks only. */

/* ---- economy ---- */
const COIN = { finish: 5, under: 10, ace: 25, first: 10 }, COIN_MAX = 999999;
/* pure: coins for one finished hole */
function coinsFor(score, par, first) {
  if (!Number.isInteger(score) || score < 1) return COIN.finish;
  const p = Number.isInteger(par) && par > 0 ? par : score;
  return COIN.finish + COIN.under * Math.max(0, p - score) + (score === 1 ? COIN.ace : 0) + (first ? COIN.first : 0);
}

/* ---- the stock ---- */
/* f = [contact, tempo, line] forgiveness levels 0..4; each level is 10% more forgiving, so the best
   putter is exactly 40% kinder than the starter in any knob and never more */
const PUTTERS = [
  { id: 'p1', price: 0, f: [0, 0, 0], look: { head: '#c9ced6', metal: 0.85, shaft: '#d9dde3', grip: '#4a3826', shape: 'blade' } },
  { id: 'p2', price: 40, f: [1, 1, 0], look: { head: '#ffd66e', metal: 0.2, shaft: '#d9dde3', grip: '#ef7d6d', shape: 'blade' } },
  { id: 'p3', price: 80, f: [1, 0, 2], look: { head: '#d08452', metal: 0.55, shaft: '#eadccb', grip: '#3c2a1c', shape: 'blade' } },
  { id: 'p4', price: 130, f: [2, 1, 1], look: { head: '#74c465', metal: 0.2, shaft: '#d9dde3', grip: '#fff8ec', shape: 'mallet' } },
  { id: 'p5', price: 190, f: [2, 2, 2], look: { head: '#6fc0df', metal: 0.3, shaft: '#eef2f6', grip: '#3f83a2', shape: 'mallet' } },
  { id: 'p6', price: 260, f: [3, 2, 2], look: { head: '#454b59', metal: 0.5, shaft: '#2a2e36', grip: '#ef7d6d', shape: 'blade' } },
  { id: 'p7', price: 340, f: [2, 3, 3], look: { head: '#ef7d6d', metal: 0.3, shaft: '#fff8ec', grip: '#4a3826', shape: 'mallet' } },
  { id: 'p8', price: 440, f: [3, 3, 3], look: { head: '#f0c24a', metal: 0.6, shaft: '#f3e3b5', grip: '#2b2b33', shape: 'blade' } },
  { id: 'p9', price: 580, f: [4, 3, 4], look: { head: '#323a4a', metal: 0.4, shaft: '#15171c', grip: '#ffd66e', shape: 'mallet' } },
  { id: 'p10', price: 800, f: [4, 4, 4], look: { head: '#ffd66e', metal: 0.65, shaft: '#f0c24a', grip: '#fffdf7', shape: 'mallet' } },
];
const BALLS = [
  { id: 'b1', price: 0, base: '#fffdf7', band: '#ffd66e', mark: '#ef7d6d', pat: 'star' },
  { id: 'b2', price: 30, base: '#ffd66e', band: '#fffdf7', mark: '#ef7d6d', pat: 'star' },
  { id: 'b3', price: 45, base: '#e9f7e4', band: '#74c465', mark: '#4e9a45', pat: 'stripes' },
  { id: 'b4', price: 60, base: '#fffdf7', band: '#6fc0df', mark: '#4a94b5', pat: 'dots' },
  { id: 'b5', price: 75, base: '#fffdf7', band: '#ef7d6d', mark: '#ffd66e', pat: 'swirl' },
  { id: 'b6', price: 90, base: '#f3ecff', band: '#b7a7e0', mark: '#7d68c4', pat: 'checker' },
  { id: 'b7', price: 120, base: '#bfe8a6', band: '#3e8a3a', mark: '#ef5d6d', pat: 'melon' },
  { id: 'b8', price: 150, base: '#2e2e38', band: '#fffdf7', mark: '#2e2e38', pat: 'eight', rough: 0.2 },
  { id: 'b9', price: 200, base: '#3a2420', band: '#ff7a3d', mark: '#ffd66e', pat: 'lava', glow: 0.5 },
  { id: 'b10', price: 260, base: '#fffdf7', band: '#ef7d6d', mark: '#6fc0df', pat: 'rainbow', rough: 0.25 },
  { id: 'b11', price: 340, base: '#1d2340', band: '#8e7bd8', mark: '#fff3c4', pat: 'galaxy', glow: 0.35, rough: 0.2 },
  { id: 'b12', price: 450, base: '#f0c24a', band: '#fff3c4', mark: '#c69334', pat: 'gold', metal: 0.55, rough: 0.22 },
];
const PREMIUM = 250;
const SHOP_ITEMS = {};
for (const p of PUTTERS) SHOP_ITEMS[p.id] = Object.assign(p, { kind: 'putter' });
for (const b of BALLS) SHOP_ITEMS[b.id] = Object.assign(b, { kind: 'ball' });
const STARTER = { putter: 'p1', ball: 'b1' };

/* pure: the stroke feel a putter gives. Bigger is kinder for sweet and tempoDead, smaller for the rest. */
function feelOf(putterId) {
  const it = SHOP_ITEMS[putterId], f = it && it.kind === 'putter' ? it.f : [0, 0, 0];
  if (!f[0] && !f[1] && !f[2]) return Object.assign({}, FEEL_BASE);
  const up = l => 1 + 0.1 * clamp(l, 0, 4);
  return Object.assign({}, FEEL_BASE, {
    sweet: FEEL_BASE.sweet * up(f[0]), toeLoss: FEEL_BASE.toeLoss / up(f[0]), twist: FEEL_BASE.twist / up(f[0]),
    tempoDead: FEEL_BASE.tempoDead * up(f[1]),
    pathK: FEEL_BASE.pathK / up(f[2]),
  });
}

/* ---- save repair: anything odd falls back to safe values, never throws ---- */
function shopRepair(p) {
  const c = typeof p.coins === 'number' && Number.isFinite(p.coins) ? Math.floor(p.coins) : 0;
  p.coins = clamp(c, 0, COIN_MAX);
  const owned = Array.isArray(p.owned) ? p.owned.filter(id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(SHOP_ITEMS, id)) : [];
  p.owned = [...new Set([STARTER.putter, STARTER.ball].concat(owned))];
  const eq = p.equipped && typeof p.equipped === 'object' ? p.equipped : {}, ok = (id, kind) => p.owned.includes(id) && SHOP_ITEMS[id].kind === kind;
  p.equipped = { putter: ok(eq.putter, 'putter') ? eq.putter : STARTER.putter, ball: ok(eq.ball, 'ball') ? eq.ball : STARTER.ball };
  const holes = p.holes && typeof p.holes === 'object' ? Object.keys(p.holes) : [];
  /* an older save already cleared some holes: those do not pay the first-clear bonus again */
  const firsts = Array.isArray(p.firsts) ? p.firsts : holes;
  p.firsts = [...new Set(firsts.filter(k => typeof k === 'string' && /^\d+-\d+$/.test(k)))];
  return p;
}
const owns = id => progress.owned.includes(id);
const isEquipped = id => SHOP_ITEMS[id] && progress.equipped[SHOP_ITEMS[id].kind] === id;

/* ---- textures and gear ---- */
function shopBallTexture(b) {
  if (b.pat === 'star') return ballTexture(b);
  const star = (x, cx, cy, R, r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, d = i % 2 ? r : R; x.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } x.fill(); };
  return canvasTex(256, 128, x => {
    const rnd = rng32(b.id.length * 97 + b.price);
    x.fillStyle = b.base; x.fillRect(0, 0, 256, 128);
    x.fillStyle = b.band;
    switch (b.pat) {
      case 'stripes': for (const y of [18, 54, 90]) x.fillRect(0, y, 256, 20); break;
      case 'dots': for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) { x.beginPath(); x.arc(c * 32 + (r % 2) * 16 + 8, 12 + r * 26, 8, 0, Math.PI * 2); x.fill(); } break;
      case 'checker': for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2) x.fillRect(c * 32, r * 32, 32, 32); break;
      case 'swirl': x.beginPath(); x.moveTo(0, 128); for (let i = 0; i <= 64; i++) x.lineTo(i * 4, 64 + Math.sin(i / 64 * Math.PI * 6) * 16); x.lineTo(256, 128); x.fill(); break;
      case 'melon': for (let c = 0; c < 12; c++) { x.beginPath(); for (let y = 0; y <= 128; y += 8) x.lineTo(c * 21.3 + 6 + Math.sin(y / 9 + c) * 4, y); for (let y = 128; y >= 0; y -= 8) x.lineTo(c * 21.3 + 14 + Math.sin(y / 9 + c) * 4, y); x.fill(); } break;
      case 'eight': x.beginPath(); x.ellipse(64, 52, 26, 30, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = b.mark; x.font = '800 40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('8', 64, 54); break;
      case 'lava': x.strokeStyle = b.band; x.lineWidth = 5; x.lineCap = 'round';
        for (let i = 0; i < 14; i++) { x.beginPath(); let px = rnd() * 256, py = rnd() * 128; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (rnd() - 0.5) * 50; py += (rnd() - 0.5) * 30; x.lineTo(px, py); } x.stroke(); }
        x.fillStyle = b.mark; for (let i = 0; i < 18; i++) { x.beginPath(); x.arc(rnd() * 256, rnd() * 128, 2 + rnd() * 4, 0, Math.PI * 2); x.fill(); } break;
      case 'rainbow': ['#ef7d6d', '#f6a35e', '#ffd66e', '#74c465', '#6fc0df', '#b7a7e0'].forEach((c, i) => { x.fillStyle = c; x.fillRect(0, 10 + i * 18, 256, 18); }); break;
      case 'galaxy':
        for (let i = 0; i < 7; i++) { const cx = rnd() * 256, cy = 20 + rnd() * 88, g = x.createRadialGradient(cx, cy, 0, cx, cy, 30 + rnd() * 30); g.addColorStop(0, i % 2 ? 'rgba(239,125,180,0.55)' : 'rgba(142,123,216,0.7)'); g.addColorStop(1, 'rgba(29,35,64,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 128); }
        x.fillStyle = '#fffdf7'; for (let i = 0; i < 160; i++) x.fillRect(rnd() * 256, rnd() * 128, 1.5, 1.5);
        x.fillStyle = b.mark; for (let i = 0; i < 6; i++) star(x, rnd() * 256, 16 + rnd() * 96, 6, 2.5); break;
      case 'gold': { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#fff3c4'); g.addColorStop(0.45, b.base); g.addColorStop(1, '#c69334'); x.fillStyle = g; x.fillRect(0, 0, 256, 128); x.fillStyle = b.band; x.fillRect(0, 56, 256, 14); break; }
    }
    if (['stripes', 'dots', 'swirl', 'checker', 'melon', 'rainbow', 'gold'].includes(b.pat)) { x.fillStyle = b.pat === 'rainbow' ? '#fffdf7' : b.mark; star(x, 64, 30, 20, 9); }
  });
}
/* a soft studio light probe, so metal heads read as metal instead of going black (the courses
   have no environment); set per material on the gear only, never on the course scene */
let gearEnv = null;
function shopEnv() {
  if (gearEnv || !renderer) return gearEnv;
  const t = canvasTex(256, 128, x => {
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#f4fbff'); g.addColorStop(0.3, '#9fd2ea'); g.addColorStop(0.5, '#fff1d6'); g.addColorStop(0.56, '#8a7360'); g.addColorStop(1, '#3c2a1c');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    x.fillStyle = '#ffffff'; x.fillRect(40, 18, 46, 26); x.fillRect(170, 24, 30, 18);
  });
  t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer);
  gearEnv = pm.fromEquirectangular(t).texture;
  pm.dispose(); t.dispose();
  return gearEnv;
}
function shine(group) {
  const env = shopEnv();
  group.traverse(o => { if (o.isMesh && o.material && o.material.metalness > 0) { o.material.envMap = env; o.material.envMapIntensity = 0.2 + 0.6 * o.material.metalness; o.material.needsUpdate = true; } });
}
/* dresses a ball material from a ball item (map, roughness, metalness, glow); disposes the old map */
function dressBall(m, b) {
  const old = m.map, t = shopBallTexture(b);
  m.map = t; m.roughness = b.rough !== undefined ? b.rough : 0.32; m.metalness = b.metal || 0;
  m.envMap = shopEnv(); m.envMapIntensity = b.metal ? 1 : 0.35;
  m.emissiveMap = b.glow ? t : null; m.emissive.set(b.glow ? '#ffffff' : '#000000'); m.emissiveIntensity = b.glow || 0;
  m.needsUpdate = true;
  if (old && old !== t) old.dispose();
}
/* puts the equipped gear on: putter look and feel, ball skin, and the swing pad's little ball and head */
function applyGear() {
  const p = SHOP_ITEMS[progress.equipped.putter], b = SHOP_ITEMS[progress.equipped.ball];
  Object.assign(GEAR.putter, p.look);
  for (const k of Object.keys(FEEL)) delete FEEL[k];
  Object.assign(FEEL, feelOf(p.id));
  Object.assign(GEAR.ball, { base: b.base, band: b.band, mark: b.mark, pat: b.pat });
  if (renderer && scene) { setPutter(GEAR.putter); shine(putter); }
  if (ballMesh) dressBall(ballMesh.material, b);
  padBall.style.background = b.base; padBall.style.borderColor = b.band;
  padHead.style.background = p.look.head;
}
function shopEquip(id) {
  const it = SHOP_ITEMS[id];
  if (!it || !owns(id)) return false;
  progress.equipped[it.kind] = id;
  saveProgress(); applyGear();
  return true;
}
/* buying spends coins and equips; short of coins it boinks and nothing changes */
function shopBuy(id) {
  const it = SHOP_ITEMS[id];
  if (!it || owns(id)) return false;
  if (progress.coins < it.price) { sfx('boink'); shopNudge('poor'); return false; }
  progress.coins -= it.price; progress.owned.push(id);
  saveProgress(); sfx('coin'); setTimeout(() => sfx('star', 2), 160);
  shopEquip(id);
  shopNudge('bought');
  return true;
}

/* ---- icons ---- */
const COIN_SVG = '<svg class="coin" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="35" r="26" fill="#c69334"/><circle cx="32" cy="30" r="26" fill="#ffd66e" stroke="#dca63f" stroke-width="4"/><circle cx="32" cy="30" r="16" fill="none" stroke="#fff3c4" stroke-width="4"/><path d="M32 20 L35 27 L42 27 L36.5 31.5 L38.5 39 L32 34.5 L25.5 39 L27.5 31.5 L22 27 L29 27 Z" fill="#dca63f"/></svg>';
const CHECK_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 33 L27 46 L51 19" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SHOP_LOCK_SVG = '<svg class="lk" viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="28" width="40" height="30" rx="6" fill="currentColor"/><path d="M20 28 V20 A12 12 0 0 1 44 20 V28" fill="none" stroke="currentColor" stroke-width="7"/></svg>';
const SPARKLE_SVG = '<svg class="spark" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 C34 22 42 30 60 32 C42 34 34 42 32 60 C30 42 22 34 4 32 C22 30 30 22 32 4 Z" fill="#ffd66e" stroke="#dca63f" stroke-width="3" stroke-linejoin="round"/></svg>';
const STAT_ICONS = [
  /* contact: the sweet spot on a face */
  '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="20" width="56" height="24" rx="9" fill="#c9ced6" stroke="#6f7881" stroke-width="4"/><rect x="24" y="22" width="16" height="20" rx="4" fill="#74c465"/><circle cx="32" cy="32" r="4" fill="#fff"/></svg>',
  /* tempo: a metronome */
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 58 L28 8 H36 L44 58 Z" fill="#c9a476" stroke="#8a6538" stroke-width="4" stroke-linejoin="round"/><path d="M32 46 L46 16" stroke="#4a3826" stroke-width="5" stroke-linecap="round"/><circle cx="42" cy="24" r="5" fill="#ef7d6d"/></svg>',
  /* line: the ball rolling dead straight */
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 54 V14" stroke="#6fc0df" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 11"/><path d="M22 18 L32 6 L42 18" fill="none" stroke="#4a94b5" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="52" r="9" fill="#fffdf7" stroke="#e6d2ab" stroke-width="3"/></svg>',
];

/* ---- the studio: shop pictures, drawn by the game's renderer ----
   The view canvas sits under the opaque shop scene, so its bottom-left corner is scratch space:
   render the item there, copy the pixels into a 2D canvas in the same task, put things back. */
let studio = null;
function shadowBlobTex() {
  return canvasTex(64, 64, x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(74,53,35,0.45)'); g.addColorStop(1, 'rgba(74,53,35,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
}
function shopStudio() {
  if (studio) return studio;
  const s = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  s.add(new THREE.HemisphereLight(0xfff4e0, 0x8a7360, 1.3));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.2); key.position.set(1.2, 2, 2); s.add(key);
  const rim = new THREE.DirectionalLight(0xcfeeff, 0.6); rim.position.set(-2, 1, -1.5); s.add(rim);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowBlobTex(), transparent: true, depthWrite: false, toneMapped: false }));
  blob.rotation.x = -Math.PI / 2; s.add(blob);
  const ballGeo = new THREE.SphereGeometry(BALL_R, 40, 28);
  const tee = new THREE.Group(), wood = mat('#e9b872', { roughness: 0.6 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.009, 0.014, 20), wood); cup.position.y = -0.007;
  const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.002, 0.07, 12), wood); peg.position.y = -0.049;
  tee.add(cup, peg);
  studio = { scene: s, cam, blob, ballGeo, tee, wood, item: null, itemId: null, ballId: null, v: new THREE.Vector4(), sc: new THREE.Vector4() };
  return studio;
}
/* builds (or reuses) the model for an item. Putters stand at address with a ball; balls sit on a tee. */
function studioModel(id, big) {
  const st = shopStudio(), it = SHOP_ITEMS[id], key = id + (big ? '+' + progress.equipped.ball : '');
  if (st.itemId === key) return st.item;
  if (st.item) {
    st.scene.remove(st.item);
    st.item.traverse(o => {
      if (!o.isMesh || o.material === st.wood) return;
      if (o.geometry !== st.ballGeo) o.geometry.dispose();
      for (const m of [].concat(o.material)) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }
  const g = new THREE.Group();
  if (it.kind === 'putter') {
    /* the face looks down +z, the shaft rises toward the player at +x; the big picture sets your
       own ball up in front of the face */
    const p = buildPutter(it.look); p.visible = true;
    shine(p);
    g.add(p);
    if (big) {
      const ball = new THREE.Mesh(st.ballGeo, new THREE.MeshStandardMaterial({ roughness: 0.32 }));
      dressBall(ball.material, SHOP_ITEMS[progress.equipped.ball]);
      ball.position.set(-HEAD_W * 0.42, BALL_R, BALL_R + 0.055); ball.rotation.y = -0.6;
      g.add(ball);
    }
  } else {
    const ball = new THREE.Mesh(st.ballGeo, new THREE.MeshStandardMaterial({ roughness: 0.32 }));
    dressBall(ball.material, it);
    ball.position.y = BALL_R + 0.002;
    g.add(ball, st.tee);
  }
  g.userData.kind = it.kind;
  st.scene.add(g);
  st.item = g; st.itemId = key;
  return g;
}
/* frames the model and draws it into a 2D canvas of w x h stage px */
function studioShot(canvas, id, w, h, spin, big, bg) {
  if (!renderer) return;
  const st = shopStudio(), g = studioModel(id, big), pr = renderer.getPixelRatio(), cam = st.cam;
  const k = SHOTS[g.userData.kind + (big ? 'Big' : '')];
  cam.fov = k.fov; cam.aspect = w / h; cam.updateProjectionMatrix();
  if (k.pos) {
    g.rotation.y = k.yaw + spin;
    st.blob.scale.set(k.blob[0], k.blob[1], 1); st.blob.position.set(k.blob[2], 0.0005, k.blob[3]);
    cam.position.fromArray(k.pos); cam.lookAt(k.look[0], k.look[1], k.look[2]);
  } else {
    const fitKey = w + 'x' + h;
    if (!g.userData[fitKey]) {
      g.rotation.y = k.yaw; g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(k.on ? g.getObjectByName(k.on) : g), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
      const half = Math.min(k.fov / 2, Math.atan(Math.tan(k.fov / 2 * Math.PI / 180) * cam.aspect) * 180 / Math.PI) * Math.PI / 180;
      const dist = sz.length() / 2 / Math.sin(half) * k.fit, dir = new THREE.Vector3().fromArray(k.dir).normalize();
      const hb = new THREE.Box3().setFromObject(g.getObjectByName('head')), hc = hb.getCenter(new THREE.Vector3()), hs = hb.getSize(new THREE.Vector3());
      g.userData[fitKey] = { pos: c.clone().addScaledVector(dir, dist), look: c.clone().add(new THREE.Vector3(0, sz.length() * k.drop, 0)), c: hc, sz: hs };
    }
    const f = g.userData[fitKey];
    g.rotation.y = k.yaw + spin;
    st.blob.scale.set(Math.max(f.sz.x, 0.1) * k.blob[0], Math.max(f.sz.z, 0.08) * k.blob[1], 1); st.blob.position.set(f.c.x, 0.0005, f.c.z);
    cam.position.copy(f.pos); cam.lookAt(f.look);
  }
  st.scene.background = (st.scene.background || new THREE.Color()).set(bg);
  renderer.getViewport(st.v); renderer.getScissor(st.sc);
  const scissor = renderer.getScissorTest();
  renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h); renderer.setScissorTest(true);
  renderer.render(st.scene, cam);
  const cw = Math.round(w * pr), ch = Math.round(h * pr);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  const x = canvas.getContext('2d');
  x.clearRect(0, 0, cw, ch);
  x.drawImage(view, 0, view.height - ch, cw, ch, 0, 0, cw, ch);
  renderer.setViewport(st.v); renderer.setScissor(st.sc); renderer.setScissorTest(scissor);
}
/* camera for each picture. Balls: position, look-at and shadow blob [sx, sz, x, z]. Putters frame
   themselves (their size is the game's business): look along `dir` at the head (or the whole
   club), far enough to fit it, `drop` lowers the subject in the frame. */
const SHOTS = {
  putter: { dir: [0.22, 0.5, 0.84], fov: 30, yaw: 0.55, on: 'head', fit: 0.92, drop: 0.25, blob: [1.4, 1.6] },
  putterBig: { dir: [0.34, 0.42, 0.84], fov: 30, yaw: 0.45, on: 'head', fit: 1.4, drop: 0.1, blob: [1.6, 3.2] },
  ball: { pos: [0, 0.115, 0.44], look: [0, 0.025, 0], fov: 30, yaw: -0.35, blob: [0.16, 0.16, 0, 0] },
  ballBig: { pos: [0, 0.12, 0.36], look: [0, 0.03, 0], fov: 30, yaw: -0.35, blob: [0.16, 0.16, 0, 0] },
};
const THUMB_W = { putter: 132, ball: 108 }, THUMB_H = 176, VIEW_W = 340, VIEW_H = 230;
const thumbCache = {};
function thumbFor(id) {
  const it = SHOP_ITEMS[id];
  if (!thumbCache[id]) { const c = document.createElement('canvas'); studioShot(c, id, THUMB_W[it.kind], THUMB_H, 0, false, '#f6e9d2'); thumbCache[id] = c; }
  const c = document.createElement('canvas'), src = thumbCache[id];
  c.className = 'thumb'; c.width = src.width; c.height = src.height;
  if (src.width) c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

/* ---- the shop scene ---- */
const shopUi = { tab: 'putter', sel: { putter: null, ball: null }, spin: 0, raf: 0, last: 0 };
function openShop() {
  sfx('tap');
  play.swing = null; play.aimDrag = null; hideAim();
  shopUi.sel.putter = progress.equipped.putter; shopUi.sel.ball = progress.equipped.ball;
  showScene('shop');
  renderShop();
}
function shopSetTab(kind) {
  if (shopUi.tab !== kind) sfx('tap');
  shopUi.tab = kind; shopUi.sel[kind] = progress.equipped[kind];
  renderShop();
}
function shopTap(id) {
  const it = SHOP_ITEMS[id];
  if (!it) return;
  shopUi.sel[it.kind] = id;
  if (owns(id)) { if (!isEquipped(id)) { shopEquip(id); sfx('tick'); } sfx('tap'); } else sfx('tick');
  renderShop();
}
function shopAct() {
  const id = shopUi.sel[shopUi.tab];
  if (!id || owns(id)) { sfx('tap'); return; }
  shopBuy(id);
  renderShop();
}
/* a little bounce: 'bought' pops the preview, 'poor' shakes the wallet and the price */
function shopNudge(kind) {
  if (currentScene !== 'shop' || reducedMotion()) return;
  const els = kind === 'poor' ? [shopWallet, shopAction] : [shopStage, shopWallet];
  for (const el of els) { el.classList.remove('shake', 'pop'); void el.offsetWidth; el.classList.add(kind === 'poor' ? 'shake' : 'pop'); }
}
function renderShop() {
  shopRepair(progress);
  const kind = shopUi.tab, list = kind === 'putter' ? PUTTERS : BALLS, sel = shopUi.sel[kind] || progress.equipped[kind];
  shopTabPutters.classList.toggle('on', kind === 'putter'); shopTabBalls.classList.toggle('on', kind === 'ball');
  shopTabPutters.setAttribute('aria-pressed', String(kind === 'putter')); shopTabBalls.setAttribute('aria-pressed', String(kind === 'ball'));
  shopGrid.className = kind;
  shopGrid.innerHTML = '';
  list.forEach((it, i) => {
    const b = document.createElement('button'), own = owns(it.id), eq = isEquipped(it.id), poor = !own && progress.coins < it.price;
    b.className = 'card' + (own ? ' owned' : '') + (eq ? ' equipped' : '') + (it.id === sel ? ' sel' : '') + (poor ? ' poor' : '') + (it.price >= PREMIUM ? ' premium' : '');
    b.dataset.id = it.id;
    b.style.animationDelay = (i * 0.025) + 's';
    b.setAttribute('aria-label', kind + ' ' + (i + 1) + (eq ? ', equipped' : own ? ', owned' : ', costs ' + it.price));
    b.append(thumbFor(it.id));
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = eq ? CHECK_SVG : own ? '' : COIN_SVG + `<span class="n">${it.price}</span>`;
    if (own && !eq) tag.className = 'tag none';
    b.append(tag);
    if (it.price >= PREMIUM) b.insertAdjacentHTML('beforeend', SPARKLE_SVG);
    b.onclick = () => shopTap(it.id);
    shopGrid.append(b);
  });
  /* the preview panel: stats against the equipped putter, or the ball's colours */
  const it = SHOP_ITEMS[sel], eqIt = SHOP_ITEMS[progress.equipped[kind]];
  if (kind === 'putter') {
    shopStats.innerHTML = STAT_ICONS.map((icon, k) => {
      const lv = it.f[k] + 1, was = eqIt.f[k] + 1;
      return `<div class="stat" aria-label="forgiveness ${lv} of 5">${icon}<span class="pips">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= Math.min(lv, was) ? 'on' : n <= lv ? 'on up' : n <= was ? 'down' : ''}"></i>`).join('')}</span></div>`;
    }).join('');
  } else {
    const sw = it.pat === 'rainbow' ? ['#ef7d6d', '#ffd66e', '#74c465', '#6fc0df'] : [it.base, it.band, it.mark];
    shopStats.innerHTML = `<div class="swatches" aria-label="colours">${sw.map(c => `<i style="background:${c}"></i>`).join('')}</div>` + (it.price >= PREMIUM ? `<div class="sparks" aria-label="premium">${SPARKLE_SVG}${SPARKLE_SVG}${SPARKLE_SVG}</div>` : '');
  }
  const own = owns(sel), eq = isEquipped(sel), poor = !own && progress.coins < it.price;
  shopAction.className = 'btn' + (eq ? ' eq' : own ? '' : poor ? ' locked' : ' go');
  shopAction.setAttribute('aria-label', eq ? 'equipped' : own ? 'equip' : 'buy for ' + it.price);
  shopAction.innerHTML = eq || own ? CHECK_SVG : COIN_SVG + `<span class="n">${it.price}</span>` + (poor ? SHOP_LOCK_SVG : '');
  renderWallet();
  drawShopView();
  if (!shopUi.raf && !reducedMotion()) { shopUi.last = 0; shopUi.raf = requestAnimationFrame(shopLoop); }
}
function drawShopView() {
  const id = shopUi.sel[shopUi.tab] || progress.equipped[shopUi.tab];
  studioShot(shopView, id, VIEW_W, VIEW_H, shopUi.spin, true, '#dff0f5');
}
/* the preview turns slowly while the shop is open (still under reduced motion) */
function shopLoop(now) {
  shopUi.raf = 0;
  if (currentScene !== 'shop') return;
  const dt = shopUi.last ? Math.min(0.1, (now - shopUi.last) / 1000) : 0;
  shopUi.last = now;
  shopUi.spin = Math.sin(now / 1000 * 0.7) * (shopUi.tab === 'ball' ? 1.6 : 0.35) + (shopUi.tab === 'ball' ? now / 1000 * 0.4 : 0);
  if (dt) drawShopView();
  shopUi.raf = requestAnimationFrame(shopLoop);
}

/* ---- the coin pop on the hole-done card ---- */
function showCoinPop(n) {
  const chip = document.getElementById('doneCoins');
  if (!chip) return;
  chip.querySelector('.n').textContent = '+' + n;
  chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop');
  setTimeout(() => { if (holeDone.classList.contains('show')) sfx('coin'); }, 700);
}

/* ---- hooks ---- */
function initShop() {
  shopRepair(progress);
  saveProgress();
  holeDone.insertAdjacentHTML('beforeend', `<div class="chip" id="doneCoins" aria-label="coins won">${COIN_SVG}<span class="n">+0</span></div>`);
  shopBtn.addEventListener('click', openShop);
  shopBack.addEventListener('click', () => { sfx('tap'); showMap(); });
  shopTabPutters.addEventListener('click', () => shopSetTab('putter'));
  shopTabBalls.addEventListener('click', () => shopSetTab('ball'));
  shopAction.addEventListener('click', shopAct);
  applyGear();
  renderWallet();
}
function onHoleFinished(key, score, par) {
  shopRepair(progress);
  const first = !progress.firsts.includes(key);
  if (first) progress.firsts.push(key);
  const n = coinsFor(score, par, first);
  progress.coins = Math.min(COIN_MAX, progress.coins + n);
  showCoinPop(n);
  return n;
}
function renderWallet() {
  shopRepair(progress);
  mapCoinsN.textContent = progress.coins;
  shopCoinsN.textContent = progress.coins;
}
