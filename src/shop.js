/* The pro shop: coins, putters, balls. Hooks the game calls:
     initShop()                          once at boot, after the renderer exists
     onHoleFinished(key, score, par)     a hole was just recorded in `progress`
     renderWallet()                      the map was redrawn
   Save fields (kept by loadProgress, repaired here): progress.coins (whole, >= 0),
   progress.owned (item ids), progress.equipped {putter, ball}, progress.firsts (hole keys
   that already paid the first-clear bonus), progress.mulligans (whole, >= 0, default 5: the shop
   sells packs of these tokens, the game spends them). Coins only ever go down by buying.
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
  /* the crazy line: each has its own head model (PUTTER_HEADS below, keyed by look.style). Same
     forgiveness rule, and within this line too, dearer is never less forgiving. */
  { id: 'p11', price: 300, f: [2, 1, 2], look: { head: '#ef5d4d', metal: 0.2, shaft: '#ffd66e', grip: '#3f83a2', style: 'brick' } },
  { id: 'p12', price: 340, f: [1, 3, 1], look: { head: '#c98a4e', metal: 0.1, shaft: '#8a5a32', grip: '#4a3826', style: 'wood' } },
  { id: 'p13', price: 380, f: [2, 2, 1], look: { head: '#fffdf7', metal: 0.1, shaft: '#fffdf7', grip: '#e8414b', style: 'candy' } },
  { id: 'p14', price: 420, f: [1, 1, 3], look: { head: '#5fb35a', metal: 0.1, shaft: '#c9a476', grip: '#ff8fbf', style: 'cactus' } },
  { id: 'p15', price: 480, f: [3, 1, 2], look: { head: '#ffd84a', metal: 0.1, shaft: '#6fc0df', grip: '#ff9a3d', style: 'duck' } },
  { id: 'p16', price: 520, f: [2, 3, 2], look: { head: '#ffd84a', metal: 0.1, shaft: '#8fd06f', grip: '#6b4a2a', style: 'banana' } },
  { id: 'p17', price: 560, f: [3, 2, 2], look: { head: '#f6efdc', metal: 0.1, shaft: '#e6dcc6', grip: '#7d68c4', style: 'bone' } },
  { id: 'p18', price: 620, f: [2, 2, 3], look: { head: '#bfe9ff', metal: 0.5, shaft: '#e6f6ff', grip: '#3f83a2', style: 'ice' } },
  { id: 'p19', price: 680, f: [4, 1, 2], look: { head: '#b4bcc7', metal: 0.7, shaft: '#b88550', grip: '#ef5d4d', style: 'hammer' } },
  { id: 'p20', price: 740, f: [2, 2, 4], look: { head: '#6f8fa8', metal: 0.3, shaft: '#d9dde3', grip: '#2e4f6b', style: 'shark' } },
  { id: 'p21', price: 800, f: [3, 3, 2], look: { head: '#6b4fa8', metal: 0.25, shaft: '#2b2240', grip: '#74c465', style: 'claw' } },
  { id: 'p22', price: 880, f: [2, 4, 2], look: { head: '#f4f1ea', metal: 0.4, shaft: '#d9dde3', grip: '#ef5d4d', style: 'rocket' } },
  { id: 'p23', price: 960, f: [3, 3, 3], look: { head: '#9aa7b8', metal: 0.6, shaft: '#5d6878', grip: '#ffd66e', style: 'robot' } },
  { id: 'p24', price: 1040, f: [4, 2, 3], look: { head: '#f3ead8', metal: 0.1, shaft: '#2e2e38', grip: '#ff8fbf', style: 'skull' } },
  { id: 'p25', price: 1120, f: [2, 3, 4], look: { head: '#f0c24a', metal: 0.85, shaft: '#2f9c9a', grip: '#1f5f6b', style: 'trident' } },
  { id: 'p26', price: 1200, f: [3, 4, 3], look: { head: '#ff5fd2', metal: 0.3, shaft: '#2b2b40', grip: '#59f3ff', style: 'neon' } },
  { id: 'p27', price: 1320, f: [4, 3, 3], look: { head: '#b48cff', metal: 0.3, shaft: '#e9e2ff', grip: '#5b3fa8', style: 'crystal' } },
  { id: 'p28', price: 1460, f: [3, 4, 4], look: { head: '#3a2a26', metal: 0.1, shaft: '#2a2020', grip: '#ff7a3d', style: 'lava' } },
  { id: 'p29', price: 1640, f: [4, 4, 3], look: { head: '#f0c24a', metal: 0.85, shaft: '#d9dde3', grip: '#8e2b3a', style: 'sword' } },
  { id: 'p30', price: 2000, f: [4, 4, 4], look: { head: '#f0c24a', metal: 0.9, shaft: '#c69334', grip: '#c8402e', style: 'dragon' } },
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
  /* the crazy line: looks only. `pulse` balls breathe their glow (held still under reduced motion) */
  { id: 'b13', price: 80, base: '#fffdf7', band: '#2e2e38', mark: '#c9ced6', pat: 'soccer' },
  { id: 'b14', price: 100, base: '#e8823a', band: '#2e2016', mark: '#f6a35e', pat: 'basket', rough: 0.6 },
  { id: 'b15', price: 110, base: '#d7e84a', band: '#fffdf7', mark: '#b5c93a', pat: 'tennis', rough: 0.85 },
  { id: 'b16', price: 130, base: '#fffdf7', band: '#d8443a', mark: '#e6dcc6', pat: 'baseball', rough: 0.5 },
  { id: 'b17', price: 150, base: '#d9a066', band: '#4a2a18', mark: '#b77b45', pat: 'cookie', rough: 0.85 },
  { id: 'b18', price: 170, base: '#ffcf5a', band: '#c8402e', mark: '#4e9a45', pat: 'pizza', rough: 0.6 },
  { id: 'b19', price: 190, base: '#f6fbff', band: '#bfe3ff', mark: '#8fc8ef', pat: 'snow', rough: 0.9 },
  { id: 'b20', price: 220, base: '#fffdf7', band: '#4aa3df', mark: '#1d2340', pat: 'eye', rough: 0.2 },
  { id: 'b21', price: 240, base: '#2a4fb8', band: '#6f9fe8', mark: '#14204a', pat: 'bowling', rough: 0.12, metal: 0.1 },
  { id: 'b22', price: 280, base: '#c9c9cf', band: '#a3a3ab', mark: '#e6e6ea', pat: 'moon', rough: 0.95 },
  { id: 'b23', price: 320, base: '#e9c99a', band: '#c47a45', mark: '#c8402e', pat: 'planet', rough: 0.5 },
  { id: 'b24', price: 360, base: '#2f86c8', band: '#5fb35a', mark: '#fffdf7', pat: 'earth', rough: 0.45 },
  { id: 'b25', price: 400, base: '#e3a65c', band: '#ff9ccf', mark: '#6fc0df', pat: 'donut', rough: 0.4 },
  { id: 'b26', price: 450, base: '#c9d2dc', band: '#fffdf7', mark: '#8fd3f0', pat: 'disco', metal: 0.85, rough: 0.15, glow: 0.3, pulse: 1 },
  { id: 'b27', price: 520, base: '#1a1530', band: '#ff5fd2', mark: '#59f3ff', pat: 'neon', glow: 0.9, rough: 0.3, pulse: 1 },
  { id: 'b28', price: 600, base: '#e9e2ff', band: '#9fe8ff', mark: '#ffb3e6', pat: 'holo', metal: 0.6, rough: 0.2, glow: 0.3, pulse: 1 },
  { id: 'b29', price: 680, base: '#ffb02e', band: '#fff0a0', mark: '#e8641e', pat: 'sun', glow: 0.85, rough: 0.5, pulse: 1 },
  { id: 'b30', price: 760, base: '#e8edf2', band: '#aab3bf', mark: '#ffd66e', pat: 'chrome', metal: 0.75, rough: 0.12 },
  { id: 'b31', price: 850, base: '#c8ffd8', band: '#2e7d4f', mark: '#ff9ccf', pat: 'smile', glow: 0.7, rough: 0.35, pulse: 1 },
  { id: 'b32', price: 1000, base: '#bff4ff', band: '#fffdf7', mark: '#c9b6ff', pat: 'diamond', metal: 0.5, rough: 0.05, glow: 0.25, pulse: 1 },
];
/* mulligan token packs: the game spends progress.mulligans when a putt is taken back */
const PACKS = [{ id: 'm3', n: 3, price: 60 }, { id: 'm10', n: 10, price: 180 }, { id: 'm25', n: 25, price: 400 }];
const MULL_START = 5, MULL_MAX = 9999;
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
  /* mulligan tokens (the same rule as the game's repairExtras): a fresh or older save starts with 5,
     anything but a whole number >= 0 resets to 5, and it tops out at MULL_MAX */
  p.mulligans = Number.isInteger(p.mulligans) && p.mulligans >= 0 ? Math.min(p.mulligans, MULL_MAX) : MULL_START;
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
      default: if (BALL_PATS[b.pat]) BALL_PATS[b.pat](x, b, rnd, star);
    }
    if (['stripes', 'dots', 'swirl', 'checker', 'melon', 'rainbow', 'gold'].includes(b.pat)) { x.fillStyle = b.pat === 'rainbow' ? '#fffdf7' : b.mark; star(x, 64, 30, 20, 9); }
  });
}
/* the crazy balls' skins: (2D context, ball, seeded random, star painter) on a 256 x 128 wrap,
   x around the ball, y pole to pole; x = 64 at the equator faces the camera at rest */
const poly = (x, pts) => { x.beginPath(); pts.forEach(([px, py]) => x.lineTo(px, py)); x.closePath(); x.fill(); };
const disc = (x, cx, cy, r) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); };
const wave = (x, f, w) => { x.lineWidth = w; x.beginPath(); for (let i = 0; i <= 64; i++) x.lineTo(i * 4, f(i * 4)); x.stroke(); };
const BALL_PATS = {
  soccer(x, b) {
    x.fillStyle = b.band;
    for (const [cy, off] of [[18, 0], [64, 32], [110, 0]]) for (let c = 0; c < 4; c++) {
      const cx = c * 64 + off + 16;
      poly(x, [0, 1, 2, 3, 4].map(k => [cx + Math.cos(k * 1.2566 - 1.5708) * 15, cy + Math.sin(k * 1.2566 - 1.5708) * 13]));
    }
    x.strokeStyle = b.mark; x.lineWidth = 2;
    for (let c = 0; c < 8; c++) { x.beginPath(); x.moveTo(c * 32 + 16, 30); x.lineTo(c * 32, 52); x.moveTo(c * 32 + 16, 98); x.lineTo(c * 32, 76); x.stroke(); }
  },
  basket(x, b, rnd) {
    x.fillStyle = b.mark; for (let i = 0; i < 400; i++) x.fillRect(rnd() * 256, rnd() * 128, 2, 2);
    x.strokeStyle = b.band; x.lineCap = 'round';
    wave(x, () => 64, 4);
    for (const c of [64, 192]) { x.lineWidth = 4; x.beginPath(); x.moveTo(c, 0); x.lineTo(c, 128); x.stroke(); }
    for (const c of [0, 128, 256]) { x.lineWidth = 4; x.beginPath(); for (let y = 0; y <= 128; y += 4) x.lineTo(c + Math.sin(y / 128 * Math.PI) * 30, y); x.stroke(); }
  },
  tennis(x, b, rnd) {
    x.fillStyle = b.mark; for (let i = 0; i < 700; i++) x.fillRect(rnd() * 256, rnd() * 128, 1.5, 1.5);
    x.strokeStyle = b.band; x.lineCap = 'round'; wave(x, u => 64 + Math.sin(u / 256 * Math.PI * 4) * 34, 7);
  },
  baseball(x, b) {
    x.strokeStyle = b.band; x.lineCap = 'round'; x.lineWidth = 3;
    for (const s of [-1, 1]) {
      const f = u => 64 + s * 26 + Math.sin(u / 256 * Math.PI * 4) * 22;
      x.strokeStyle = b.mark; wave(x, f, 2); x.strokeStyle = b.band; x.lineWidth = 3;
      for (let u = 4; u < 256; u += 9) { const y = f(u); x.beginPath(); x.moveTo(u - 4, y - 5); x.lineTo(u, y); x.lineTo(u - 4, y + 5); x.stroke(); }
    }
  },
  cookie(x, b, rnd) {
    x.fillStyle = b.mark; for (let i = 0; i < 300; i++) x.fillRect(rnd() * 256, rnd() * 128, 3, 3);
    x.fillStyle = b.band;
    for (let i = 0; i < 26; i++) { const cx = rnd() * 256, cy = 8 + rnd() * 112, r = 5 + rnd() * 5; poly(x, [0, 1, 2, 3, 4, 5].map(k => [cx + Math.cos(k + rnd()) * r, cy + Math.sin(k + rnd()) * r * 0.9])); }
  },
  pizza(x, b, rnd) {
    x.fillStyle = '#fff0a8'; for (let i = 0; i < 40; i++) disc(x, rnd() * 256, rnd() * 128, 3 + rnd() * 5);
    for (let i = 0; i < 16; i++) {
      const cx = (i % 8) * 32 + 16 + (rnd() - 0.5) * 10, cy = i < 8 ? 38 : 90;
      x.fillStyle = b.band; disc(x, cx, cy + (rnd() - 0.5) * 10, 11); x.fillStyle = '#9e2f22'; disc(x, cx - 3, cy - 2, 2); disc(x, cx + 4, cy + 3, 2);
    }
    x.strokeStyle = b.mark; x.lineWidth = 3; x.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const cx = rnd() * 256, cy = rnd() * 128; x.beginPath(); x.arc(cx, cy, 6, 0, 2.2); x.stroke(); }
  },
  snow(x, b, rnd) {
    x.fillStyle = b.band; for (let i = 0; i < 260; i++) x.fillRect(rnd() * 256, rnd() * 128, 2, 2);
    x.strokeStyle = b.mark; x.lineWidth = 2; x.lineCap = 'round';
    for (let i = 0; i < 18; i++) { const cx = rnd() * 256, cy = 10 + rnd() * 108, r = 7 + rnd() * 5; x.lineWidth = 3; x.beginPath(); for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; x.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.stroke(); }
  },
  eye(x, b) {
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 26); g.addColorStop(0, '#9fe0ff'); g.addColorStop(0.7, b.band); g.addColorStop(1, '#2e6f9e');
    x.fillStyle = g; disc(x, 64, 64, 26);
    x.fillStyle = b.mark; disc(x, 64, 64, 12);
    x.fillStyle = '#ffffff'; disc(x, 70, 57, 5); disc(x, 58, 70, 2.5);
  },
  bowling(x, b, rnd) {
    x.strokeStyle = b.band; x.lineCap = 'round';
    for (let i = 0; i < 9; i++) { x.globalAlpha = 0.35 + rnd() * 0.4; const y0 = rnd() * 128, a = 10 + rnd() * 20, k = 1 + Math.floor(rnd() * 3); wave(x, u => y0 + Math.sin(u / 256 * Math.PI * 2 * k + i) * a, 4 + rnd() * 8); }
    x.globalAlpha = 1; x.fillStyle = b.mark;
    for (const [cx, cy] of [[56, 40], [72, 40], [64, 56]]) disc(x, cx, cy, 6);
  },
  moon(x, b, rnd) {
    for (let i = 0; i < 26; i++) {
      const cx = rnd() * 256, cy = 10 + rnd() * 108, r = 3 + rnd() * 10;
      x.fillStyle = b.mark; disc(x, cx + 1.5, cy + 1.5, r); x.fillStyle = b.band; disc(x, cx, cy, r * 0.85);
    }
  },
  planet(x, b, rnd) {
    const cols = [b.base, b.band, '#f6e3c2', '#a85c34', b.band, '#f6e3c2', b.base];
    let y = 0;
    cols.forEach((c, i) => { const h = 128 / cols.length; x.fillStyle = c; x.beginPath(); x.moveTo(0, y); for (let u = 0; u <= 256; u += 8) x.lineTo(u, y + Math.sin(u / 20 + i) * 2); for (let u = 256; u >= 0; u -= 8) x.lineTo(u, y + h + Math.sin(u / 17 + i * 2) * 3); x.fill(); y += h; });
    x.fillStyle = b.mark; x.beginPath(); x.ellipse(90, 78, 16, 8, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ff8a6a'; x.beginPath(); x.ellipse(90, 78, 9, 4, 0, 0, Math.PI * 2); x.fill();
  },
  earth(x, b, rnd) {
    x.fillStyle = b.band;
    for (const [cx, cy, n] of [[40, 50, 9], [70, 84, 7], [150, 40, 10], [170, 78, 6], [220, 60, 8]]) for (let i = 0; i < n; i++) disc(x, cx + (rnd() - 0.5) * 34, cy + (rnd() - 0.5) * 24, 6 + rnd() * 8);
    x.fillStyle = b.mark; x.fillRect(0, 0, 256, 9); x.fillRect(0, 120, 256, 8);
    x.globalAlpha = 0.75; x.strokeStyle = b.mark; x.lineCap = 'round';
    for (let i = 0; i < 7; i++) { const y0 = 16 + rnd() * 96, u0 = rnd() * 256; x.lineWidth = 3 + rnd() * 3; x.beginPath(); for (let u = 0; u < 50; u += 5) x.lineTo(u0 + u, y0 + Math.sin(u / 9) * 3); x.stroke(); }
    x.globalAlpha = 1;
  },
  donut(x, b, rnd) {
    x.fillStyle = b.band; x.beginPath(); x.moveTo(0, 0); x.lineTo(256, 0);
    for (let u = 256; u >= 0; u -= 8) x.lineTo(u, 72 + Math.sin(u / 11) * 5 + (u % 32 === 0 ? 7 : 0)); x.fill();
    const sp = ['#6fc0df', '#ffd66e', '#74c465', '#fffdf7', '#ef7d6d', '#b7a7e0'];
    for (let i = 0; i < 90; i++) { x.save(); x.translate(rnd() * 256, 6 + rnd() * 58); x.rotate(rnd() * Math.PI); x.fillStyle = sp[i % sp.length]; x.fillRect(-4, -1.5, 8, 3); x.restore(); }
  },
  disco(x, b, rnd, star) {
    const cs = [b.base, b.band, b.mark, '#9aa7b8', '#ffffff', '#d8c9ff'];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 16; c++) { x.fillStyle = cs[Math.floor(rnd() * cs.length)]; x.fillRect(c * 16 + 1, r * 16 + 1, 14, 14); }
    x.fillStyle = '#ffffff'; for (let i = 0; i < 10; i++) star(x, rnd() * 256, rnd() * 128, 5, 1.5);
  },
  neon(x, b, rnd, star) {
    x.lineCap = 'round';
    x.strokeStyle = b.band; wave(x, u => 40 + Math.sin(u / 256 * Math.PI * 6) * 10, 5);
    x.strokeStyle = b.mark; wave(x, u => 88 + Math.sin(u / 256 * Math.PI * 6 + 2) * 10, 5);
    x.fillStyle = '#ffd66e'; star(x, 64, 64, 12, 5); star(x, 192, 64, 12, 5);
  },
  holo(x, b) {
    for (let i = -128; i < 384; i += 4) { x.fillStyle = `hsl(${(i * 2.2) % 360}, 90%, 78%)`; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 4, 0); x.lineTo(i + 4 - 64, 128); x.lineTo(i - 64, 128); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.55)'; for (let u = 0; u < 256; u += 32) { x.beginPath(); x.moveTo(u, 0); x.lineTo(u + 8, 0); x.lineTo(u - 56, 128); x.lineTo(u - 64, 128); x.fill(); }
  },
  sun(x, b, rnd) {
    x.fillStyle = b.mark; for (let i = 0; i < 300; i++) disc(x, rnd() * 256, rnd() * 128, 1 + rnd() * 2.5);
    for (let i = 0; i < 9; i++) { const cx = rnd() * 256, cy = 10 + rnd() * 108, g = x.createRadialGradient(cx, cy, 0, cx, cy, 14 + rnd() * 14); g.addColorStop(0, b.band); g.addColorStop(1, 'rgba(255,240,160,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 128); }
  },
  chrome(x, b) {
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.42, b.base); g.addColorStop(0.5, b.band); g.addColorStop(0.58, '#d9dde3'); g.addColorStop(1, '#ffffff');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  },
  smile(x, b) {
    x.fillStyle = b.band; x.beginPath(); x.ellipse(54, 52, 4.5, 7, 0, 0, Math.PI * 2); x.ellipse(74, 52, 4.5, 7, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = b.band; x.lineWidth = 4.5; x.lineCap = 'round'; x.beginPath(); x.arc(64, 64, 15, 0.35, Math.PI - 0.35); x.stroke();
    x.fillStyle = b.mark; disc(x, 44, 70, 5); disc(x, 84, 70, 5);
  },
  diamond(x, b, rnd, star) {
    const cs = [b.base, b.band, b.mark, '#8fe0f5', '#ffffff'];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) for (const up of [0, 1]) {
      const x0 = c * 32 - (r % 2) * 16, y0 = r * 32;
      x.fillStyle = cs[Math.floor(rnd() * cs.length)];
      poly(x, up ? [[x0, y0], [x0 + 32, y0], [x0 + 16, y0 + 32]] : [[x0 + 16, y0 + 32], [x0 + 48, y0 + 32], [x0 + 32, y0]]);
    }
    x.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) star(x, rnd() * 256, rnd() * 128, 5, 1.5);
  },
};
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
/* ---- the crazy putter heads ----
   Each builder returns the parts of one head in the putter's own frame, the frame buildPutter
   uses: the face is the plane z = 0 looking down +z at the ball, the head sits on y = 0 and
   fills x in [-HEAD_W / 2, HEAD_W / 2], z in [-HEAD_D, 0], so nothing ever reaches past the face
   toward the ball or further than the plain head reaches toward a wall. The shaft meets the top
   of the heel at (HEAD_W * 0.36, HEAD_H, -HEAD_D / 2); a short neck fills any gap under it. */
const ZC = -0.026, AX = Math.PI / 2;
/* one mesh: geometry, material, position, rotation [x, y, z], scale */
function hp(geo, m, pos, rot, scl) {
  const o = new THREE.Mesh(geo, m);
  if (pos) o.position.fromArray(pos);
  if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
  if (scl) o.scale.fromArray(scl);
  o.castShadow = true;
  return o;
}
const hmat = (c, o) => mat(c, Object.assign({ roughness: 0.45 }, o));
const glowMat = (c, k, o) => mat(c, Object.assign({ roughness: 0.35, emissive: new THREE.Color(c), emissiveIntensity: k }, o));
const along = (r0, r1, len, seg) => new THREE.CylinderGeometry(r0, r1, len, seg || 20);  /* rotate z by AX to lie along x */
const ball = (r, w, h) => new THREE.SphereGeometry(r, w || 20, h || 14);
/* a few small textures for the heads */
const headTex = {
  wood: () => canvasTex(128, 64, x => { const r = rng32(5); x.fillStyle = '#c98a4e'; x.fillRect(0, 0, 128, 64); for (let i = 0; i < 22; i++) { x.strokeStyle = r() < 0.5 ? 'rgba(110,64,28,0.45)' : 'rgba(255,220,170,0.35)'; x.lineWidth = 1 + r() * 2.5; x.beginPath(); const y0 = r() * 64; for (let u = 0; u <= 128; u += 8) x.lineTo(u, y0 + Math.sin(u / 14 + i) * 2.5); x.stroke(); } }),
  candy: () => canvasTex(128, 64, x => { x.fillStyle = '#fffdf7'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#e8414b'; for (let i = -64; i < 160; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 14, 0); x.lineTo(i + 46, 64); x.lineTo(i + 32, 64); x.fill(); } x.fillStyle = '#74c465'; for (let i = -64; i < 160; i += 32) { x.beginPath(); x.moveTo(i + 18, 0); x.lineTo(i + 22, 0); x.lineTo(i + 54, 64); x.lineTo(i + 50, 64); x.fill(); } }),
  lava: () => canvasTex(128, 64, x => { const r = rng32(9); x.fillStyle = '#2a1e1c'; x.fillRect(0, 0, 128, 64); for (let i = 0; i < 200; i++) { x.fillStyle = r() < 0.5 ? '#3d2c28' : '#1b1312'; x.fillRect(r() * 128, r() * 64, 3, 3); }
    x.lineCap = 'round'; for (let i = 0; i < 12; i++) { let px = r() * 128, py = r() * 64; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - 0.5) * 30; py += (r() - 0.5) * 18; x.lineTo(px, py); } x.strokeStyle = '#ff5a1f'; x.lineWidth = 6; x.stroke(); x.strokeStyle = '#ffd66e'; x.lineWidth = 2.5; x.stroke(); } }),
};
const PUTTER_HEADS = {
  brick(L) {
    const m = hmat(L.head, { roughness: 0.3 }), out = [hp(new THREE.BoxGeometry(HEAD_W, 0.034, HEAD_D * 0.96), m, [0, 0.017, ZC])];
    for (let i = 0; i < 4; i++) for (const dz of [-0.012, 0.012]) out.push(hp(along(0.0095, 0.0095, 0.008, 18), m, [-0.0638 + i * 0.0425, 0.038, ZC + dz]));
    return out;
  },
  wood(L) {
    const t = headTex.wood(), m = hmat('#ffffff', { map: t, roughness: 0.7 }), dark = hmat('#7a4a26', { roughness: 0.7 });
    return [hp(along(0.024, 0.024, 0.15, 24), m, [0, 0.0245, ZC], [0, 0, AX]),
      hp(along(0.025, 0.025, 0.012, 24), dark, [-0.058, 0.0252, ZC], [0, 0, AX]), hp(along(0.025, 0.025, 0.012, 24), dark, [0.058, 0.0252, ZC], [0, 0, AX]),
      hp(along(0.021, 0.021, 0.01, 24), hmat('#e9b872', { roughness: 0.8 }), [-0.08, 0.024, ZC], [0, 0, AX]), hp(along(0.021, 0.021, 0.01, 24), hmat('#e9b872', { roughness: 0.8 }), [0.08, 0.024, ZC], [0, 0, AX])];
  },
  candy() {
    const m = hmat('#ffffff', { map: headTex.candy(), roughness: 0.18 });
    return [hp(along(0.022, 0.022, 0.126, 24), m, [0, 0.022, ZC], [0, 0, AX]), hp(ball(0.022), m, [-0.063, 0.022, ZC]), hp(ball(0.022), m, [0.063, 0.022, ZC])];
  },
  cactus(L) {
    const g = hmat(L.head, { roughness: 0.6 }), sp = hmat('#fffdf7', { roughness: 0.4 }), out = [];
    out.push(hp(new THREE.CapsuleGeometry(0.022, 0.12, 6, 16), g, [0, 0.023, ZC], [0, 0, AX], [1, 1, 1.1]));
    out.push(hp(new THREE.CapsuleGeometry(0.009, 0.014, 4, 10), g, [-0.045, 0.05, ZC]), hp(new THREE.CapsuleGeometry(0.008, 0.01, 4, 10), g, [0.02, 0.046, ZC]));
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) {
      const x0 = -0.066 + i * 0.022, a = s * 0.9;
      out.push(hp(new THREE.ConeGeometry(0.0022, 0.009, 6), sp, [x0 + s * 0.004, 0.023 + Math.cos(a) * 0.024, ZC + Math.sin(a) * 0.024], [a, 0, 0]));
    }
    const petal = hmat('#ff8fbf', { roughness: 0.5 });
    for (let k = 0; k < 5; k++) out.push(hp(ball(0.0055, 10, 8), petal, [-0.045 + Math.cos(k * 1.2566) * 0.006, 0.066, ZC + Math.sin(k * 1.2566) * 0.006]));
    out.push(hp(ball(0.004, 10, 8), hmat('#ffd66e'), [-0.045, 0.069, ZC]));
    return out;
  },
  duck(L) {
    const y = hmat(L.head, { roughness: 0.25 }), o = hmat('#ff9a3d', { roughness: 0.35 }), k = hmat('#2e2e38', { roughness: 0.2 });
    return [hp(ball(1, 28, 18), y, [0.006, 0.025, ZC], null, [0.074, 0.025, 0.025]),
      hp(new THREE.ConeGeometry(0.012, 0.024, 14), y, [0.074, 0.04, ZC], [0, 0, -0.7]),
      hp(ball(1, 16, 10), hmat('#f0c23a', { roughness: 0.3 }), [0.02, 0.046, ZC], null, [0.03, 0.007, 0.016]),
      hp(ball(0.019, 22, 16), y, [-0.05, 0.058, ZC]),
      hp(ball(1, 14, 10), o, [-0.07, 0.054, ZC], null, [0.013, 0.005, 0.011]),
      hp(ball(0.0035, 10, 8), k, [-0.062, 0.066, ZC - 0.012]), hp(ball(0.0035, 10, 8), k, [-0.062, 0.066, ZC + 0.012])];
  },
  banana(L) {
    const pts = [[-0.064, 0.034], [-0.034, 0.02], [0, 0.016], [0.034, 0.02], [0.064, 0.034]].map(([px, py]) => new THREE.Vector3(px, py, ZC));
    const brown = hmat('#6b4a2a', { roughness: 0.7 });
    return [hp(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.016, 14, false), hmat(L.head, { roughness: 0.4 })),
      hp(ball(0.016, 16, 12), hmat(L.head, { roughness: 0.4 }), [-0.064, 0.034, ZC]), hp(ball(0.016, 16, 12), hmat(L.head, { roughness: 0.4 }), [0.064, 0.034, ZC]),
      hp(new THREE.CylinderGeometry(0.005, 0.007, 0.014, 10), brown, [-0.078, 0.04, ZC], [0, 0, 0.9]), hp(ball(0.006, 10, 8), brown, [0.079, 0.036, ZC])];
  },
  bone(L) {
    const m = hmat(L.head, { roughness: 0.5 }), out = [hp(along(0.012, 0.012, 0.13, 18), m, [0, 0.022, ZC], [0, 0, AX])];
    for (const sx of [-1, 1]) for (const dz of [-0.0095, 0.0095]) out.push(hp(ball(0.016), m, [sx * 0.068, 0.022, ZC + dz]));
    return out;
  },
  ice(L) {
    const m = hmat(L.head, { roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.55, depthWrite: false }), core = hmat('#ffffff', { roughness: 0.3, transparent: true, opacity: 0.55 });
    const box = new THREE.BoxGeometry(HEAD_W * 0.98, 0.044, HEAD_D * 0.98), edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: '#ffffff' }));
    edges.position.set(0, 0.022, ZC);
    const out = [hp(box, m, [0, 0.022, ZC]), edges, hp(new THREE.BoxGeometry(0.1, 0.02, 0.024), core, [0, 0.022, ZC], [0.2, 0.3, 0.1])];
    const r = rng32(3);
    for (let i = 0; i < 6; i++) out.push(hp(ball(0.003 + r() * 0.003, 8, 6), core, [(r() - 0.5) * 0.14, 0.01 + r() * 0.025, ZC + (r() - 0.5) * 0.03]));
    out[0].renderOrder = 1;
    return out;
  },
  hammer(L) {
    const m = hmat(L.head, { roughness: 0.25, metalness: 0.85 }), dark = hmat('#5d6672', { roughness: 0.3, metalness: 0.7 });
    return [hp(along(0.017, 0.017, 0.11, 20), m, [-0.012, 0.022, ZC], [0, 0, AX]),
      hp(along(0.022, 0.02, 0.018, 24), m, [-0.076, 0.022, ZC], [0, 0, AX]),
      hp(along(0.0185, 0.0185, 0.006, 20), dark, [-0.062, 0.022, ZC], [0, 0, AX]),
      hp(new THREE.BoxGeometry(0.042, 0.012, 0.009), m, [0.062, 0.016, ZC - 0.01], [0, 0.12, -0.45]),
      hp(new THREE.BoxGeometry(0.042, 0.012, 0.009), m, [0.062, 0.016, ZC + 0.01], [0, -0.12, -0.45]),
      hp(new THREE.BoxGeometry(0.03, 0.03, 0.03), hmat(L.shaft, { roughness: 0.7 }), [0.04, 0.026, ZC])];
  },
  shark(L) {
    const g = hmat(L.head, { roughness: 0.35, metalness: 0.3 }), w = hmat('#fffdf7', { roughness: 0.5 }), k = hmat('#1d2340', { roughness: 0.2 });
    const fin = new THREE.Shape(); fin.moveTo(-0.032, 0); fin.quadraticCurveTo(-0.01, 0.02, 0.012, 0.05); fin.quadraticCurveTo(0.012, 0.02, 0.026, 0); fin.closePath();
    const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.lineTo(-0.02, 0.022); tail.lineTo(-0.012, 0); tail.lineTo(-0.02, -0.014); tail.closePath();
    const ex = sh => new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 });
    return [hp(ball(1, 28, 18), g, [0.004, 0.021, ZC], null, [0.078, 0.021, 0.025]),
      hp(ball(1, 22, 14), w, [0.008, 0.013, ZC], null, [0.066, 0.012, 0.021]),
      hp(ex(fin), g, [-0.004, 0.036, ZC - 0.003]), hp(ex(tail), g, [-0.07, 0.022, ZC - 0.003]),
      hp(ball(0.0035, 10, 8), k, [0.058, 0.028, ZC - 0.019]), hp(ball(0.0035, 10, 8), k, [0.058, 0.028, ZC + 0.019])];
  },
  claw(L) {
    const m = hmat(L.head, { roughness: 0.4, metalness: 0.25 }), wt = hmat('#fffdf7', { roughness: 0.3 }), eye = glowMat('#ffd66e', 0.6), k = hmat('#1d2340');
    const out = [hp(new THREE.CapsuleGeometry(0.022, 0.124, 6, 18), m, [0, 0.023, ZC], [0, 0, AX], [1, 1, 1.12])];
    for (let i = 0; i < 4; i++) out.push(hp(new THREE.ConeGeometry(0.005, 0.014, 10), wt, [-0.042 + i * 0.026, 0.009, -0.007], [Math.PI, 0, 0]));
    for (const dz of [-0.012, 0, 0.012]) out.push(hp(new THREE.ConeGeometry(0.005, 0.02, 10), wt, [-0.078, 0.012, ZC + dz], [0, 0, AX + 0.4]));
    for (const dz of [-0.009, 0.009]) { out.push(hp(ball(0.0065, 14, 10), eye, [-0.035, 0.043, ZC + dz]), hp(new THREE.BoxGeometry(0.002, 0.003, 0.007), k, [-0.035, 0.0495, ZC + dz])); }
    return out;
  },
  rocket(L) {
    const w = hmat(L.head, { roughness: 0.3, metalness: 0.3 }), red = hmat('#ef5d4d', { roughness: 0.35 }), out = [];
    out.push(hp(along(0.019, 0.019, 0.1, 22), w, [0.004, 0.022, ZC], [0, 0, AX]));
    out.push(hp(new THREE.ConeGeometry(0.019, 0.034, 22), red, [-0.063, 0.022, ZC], [0, 0, AX]));
    out.push(hp(along(0.0195, 0.0195, 0.008, 22), red, [0.03, 0.022, ZC], [0, 0, AX]));
    out.push(hp(ball(0.007, 14, 10), glowMat('#6fc0df', 0.4, { metalness: 0.3, roughness: 0.1 }), [-0.02, 0.039, ZC]));
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; out.push(hp(new THREE.BoxGeometry(0.024, 0.011, 0.003), red, [0.064, 0.022 + Math.cos(a) * 0.024, ZC + Math.sin(a) * 0.022], [a, 0, 0])); }
    const flame = glowMat('#ff8a2a', 1.4, { roughness: 0.6 }); flame.userData.pulse = 1.4;
    out.push(hp(new THREE.ConeGeometry(0.012, 0.018, 16), flame, [0.078, 0.022, ZC], [0, 0, -AX]));
    return out;
  },
  robot(L) {
    const m = hmat(L.head, { roughness: 0.3, metalness: 0.6 }), d = hmat('#2e3440', { roughness: 0.3 }), eye = glowMat('#59f3ff', 1.2), bolt = hmat('#ffd66e', { metalness: 0.6, roughness: 0.3 });
    eye.userData.pulse = 1.2;
    const out = [hp(new THREE.BoxGeometry(0.15, 0.036, 0.048), m, [0, 0.018, ZC]), hp(new THREE.BoxGeometry(0.07, 0.004, 0.032), d, [-0.028, 0.038, ZC])];
    for (const dz of [-0.008, 0.008]) out.push(hp(new THREE.BoxGeometry(0.01, 0.004, 0.006), eye, [-0.04, 0.0405, ZC + dz]));
    for (let i = 0; i < 3; i++) out.push(hp(new THREE.BoxGeometry(0.003, 0.003, 0.012), eye, [-0.018 + i * 0.006, 0.0405, ZC]));
    for (const sx of [-1, 1]) out.push(hp(along(0.012, 0.012, 0.01, 18), d, [sx * 0.08, 0.02, ZC], [0, 0, AX]));
    for (const [bx, bz] of [[-0.068, -0.02], [-0.068, 0.02], [0.03, -0.02], [0.03, 0.02]]) out.push(hp(ball(0.0035, 10, 8), bolt, [bx, 0.037, ZC + bz]));
    out.push(hp(new THREE.CylinderGeometry(0.0018, 0.0018, 0.024, 8), d, [-0.07, 0.048, ZC]));
    const tip = glowMat('#ef5d4d', 1); tip.userData.pulse = 1;
    out.push(hp(ball(0.0055, 12, 8), tip, [-0.07, 0.062, ZC]));
    return out;
  },
  skull(L) {
    const m = hmat(L.head, { roughness: 0.55 }), k = hmat('#2e2e38', { roughness: 0.6 }), wt = hmat('#ffffff', { roughness: 0.2 }), pink = hmat('#ff9ccf', { roughness: 0.6 });
    const out = [hp(ball(1, 28, 18), m, [0, 0.03, ZC], null, [0.075, 0.03, 0.025]), hp(new THREE.BoxGeometry(0.07, 0.016, 0.03), m, [-0.01, 0.009, ZC + 0.006])];
    for (const ex of [-0.032, 0.012]) { out.push(hp(ball(1, 18, 12), k, [ex, 0.054, ZC], null, [0.013, 0.006, 0.011]), hp(ball(0.003, 8, 6), wt, [ex - 0.004, 0.0595, ZC - 0.004])); }
    out.push(hp(new THREE.ConeGeometry(0.005, 0.004, 3), k, [-0.01, 0.059, ZC + 0.008]));
    for (let i = 0; i < 5; i++) out.push(hp(new THREE.BoxGeometry(0.008, 0.009, 0.003), wt, [-0.03 + i * 0.01, 0.012, -0.0016]));
    for (const ex of [-0.05, 0.03]) out.push(hp(ball(1, 12, 8), pink, [ex, 0.05, ZC + 0.012], null, [0.007, 0.003, 0.006]));
    return out;
  },
  trident(L) {
    const g = hmat(L.head, { roughness: 0.2, metalness: 0.85 }), gem = glowMat('#2fd4c8', 0.7, { roughness: 0.1 }), out = [];
    gem.userData.pulse = 0.7;
    out.push(hp(new THREE.BoxGeometry(0.16, 0.02, 0.016), g, [0, 0.014, -0.009]));
    for (const sx of [-1, 1]) out.push(hp(ball(0.011, 16, 12), g, [sx * 0.076, 0.016, -0.011]));
    for (const [px, len] of [[-0.062, 0.018], [0, 0.022], [0.062, 0.018]]) {
      out.push(hp(new THREE.CylinderGeometry(0.0055, 0.0055, len, 12), g, [px, 0.014, -0.017 - len / 2], [AX, 0, 0]));
      out.push(hp(new THREE.ConeGeometry(0.009, 0.014, 4), g, [px, 0.014, -0.017 - len - 0.006], [-AX, 0, 0]));
    }
    out.push(hp(new THREE.OctahedronGeometry(0.01), gem, [0, 0.03, -0.012]));
    return out;
  },
  neon(L) {
    const base = hmat('#2b2b40', { roughness: 0.5 }), pink = glowMat(L.head, 2, { roughness: 0.3, toneMapped: false }), cyan = glowMat('#59f3ff', 2, { roughness: 0.3, toneMapped: false });
    pink.userData.pulse = 2; cyan.userData.pulse = 2;
    const v = pts => pts.map(([px, pz]) => new THREE.Vector3(px, 0.024, pz));
    const loop = new THREE.CatmullRomCurve3(v([[-0.074, -0.007], [0, -0.006], [0.074, -0.007], [0.075, -0.026], [0.074, -0.045], [0, -0.046], [-0.074, -0.045], [-0.075, -0.026]]), true, 'catmullrom', 0.15);
    const zig = new THREE.CatmullRomCurve3(v([[-0.058, -0.03], [-0.03, -0.016], [-0.005, -0.036], [0.022, -0.016], [0.05, -0.034]]), false, 'catmullrom', 0.05);
    const out = [hp(new THREE.BoxGeometry(HEAD_W, 0.014, HEAD_D), base, [0, 0.007, ZC]), hp(new THREE.TubeGeometry(loop, 80, 0.0045, 10, true), pink), hp(new THREE.TubeGeometry(zig, 48, 0.0042, 10, false), cyan)];
    for (const [px, pz] of [[-0.06, -0.007], [0.06, -0.007], [-0.06, -0.045], [0.06, -0.045]]) out.push(hp(new THREE.CylinderGeometry(0.002, 0.002, 0.012, 6), base, [px, 0.018, pz]));
    return out;
  },
  crystal(L) {
    const m = mat(L.head, { roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.82, flatShading: true, emissive: new THREE.Color('#7a4dff'), emissiveIntensity: 0.45 });
    m.userData.pulse = 0.45;
    const core = glowMat('#ffffff', 1.2); core.userData.pulse = 1.2;
    const out = [hp(along(0.021, 0.021, 0.094, 6), m, [0, 0.022, ZC], [0, 0, AX]),
      hp(new THREE.ConeGeometry(0.021, 0.036, 6), m, [-0.065, 0.022, ZC], [0, 0, AX]), hp(new THREE.ConeGeometry(0.021, 0.036, 6), m, [0.065, 0.022, ZC], [0, 0, -AX]),
      hp(ball(0.008, 12, 8), core, [0, 0.022, ZC])];
    for (const [px, tilt] of [[-0.03, 0.35], [-0.012, -0.2], [0.018, 0.25]]) out.push(hp(new THREE.ConeGeometry(0.006, 0.026, 6), m, [px, 0.046, ZC], [0, 0, tilt]));
    out[0].renderOrder = 1;
    return out;
  },
  lava() {
    const t = headTex.lava(), m = mat('#ffffff', { map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.5, roughness: 0.9, flatShading: true });
    m.userData.pulse = 1.5;
    const geo = new THREE.IcosahedronGeometry(1, 2), pos = geo.attributes.position, r = rng32(17), seen = new Map();
    for (let i = 0; i < pos.count; i++) {
      const key = [pos.getX(i), pos.getY(i), pos.getZ(i)].map(v => v.toFixed(3)).join();
      if (!seen.has(key)) seen.set(key, 0.86 + r() * 0.2);
      const k = seen.get(key); pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
    }
    geo.computeVertexNormals();
    return [hp(geo, m, [0, 0.025, ZC], null, [0.078, 0.024, 0.0235])];
  },
  sword(L) {
    const g = hmat(L.head, { roughness: 0.2, metalness: 0.85 }), steel = hmat('#d9dde3', { roughness: 0.15, metalness: 0.9 }), gem = glowMat('#e8414b', 0.8, { roughness: 0.1 });
    gem.userData.pulse = 0.8;
    const out = [hp(new THREE.BoxGeometry(0.13, 0.016, 0.018), g, [0, 0.02, ZC + 0.012])];
    for (const sx of [-1, 1]) out.push(hp(new THREE.TorusGeometry(0.009, 0.0045, 10, 20), g, [sx * 0.07, 0.024, ZC + 0.012], [0, 0, 0]));
    out.push(hp(new THREE.OctahedronGeometry(0.02, 0), g, [0, 0.022, ZC + 0.006], null, [1, 0.6, 0.75]));
    out.push(hp(ball(0.0075, 14, 10), gem, [0, 0.034, ZC + 0.006]));
    const blade = new THREE.Shape(); blade.moveTo(-0.012, 0); blade.lineTo(0.012, 0); blade.lineTo(0.012, 0.016); blade.lineTo(0, 0.024); blade.lineTo(-0.012, 0.016); blade.closePath();
    out.push(hp(new THREE.ExtrudeGeometry(blade, { depth: 0.005, bevelEnabled: false }), steel, [0, 0.0175, ZC + 0.003], [AX, 0, 0]));
    return out;
  },
  dragon(L) {
    const g = hmat(L.head, { roughness: 0.22, metalness: 0.9 }), red = hmat('#c8402e', { roughness: 0.4 }), eye = glowMat('#ff3b2f', 1.3), wt = hmat('#fffdf7', { roughness: 0.3 }), k = hmat('#4a3826');
    eye.userData.pulse = 1.3;
    const out = [hp(ball(1, 28, 18), g, [0.016, 0.027, ZC], null, [0.062, 0.027, 0.025]), hp(ball(1, 22, 14), g, [-0.05, 0.02, ZC], null, [0.034, 0.018, 0.019])];
    for (const dz of [-0.007, 0.007]) out.push(hp(ball(0.0025, 8, 6), k, [-0.081, 0.027, ZC + dz]));
    for (const dz of [-0.012, 0.012]) {
      out.push(hp(ball(0.0058, 12, 8), eye, [-0.022, 0.045, ZC + dz]));
      out.push(hp(new THREE.ConeGeometry(0.0058, 0.032, 12), g, [0.03, 0.056, ZC + dz], [dz * 12, 0, -1.05]));
      out.push(hp(new THREE.ConeGeometry(0.003, 0.008, 8), wt, [-0.07, 0.006, ZC + dz * 1.1], [Math.PI, 0, 0]));
    }
    for (let i = 0; i < 3; i++) out.push(hp(new THREE.ConeGeometry(0.005, 0.014, 4), red, [0.045 + i * 0.013, 0.052 - i * 0.004, ZC], [0, 0, -0.4]));
    return out;
  },
};
/* swaps a putter's plain head for its style's model; the plain head and sight line are disposed */
function dressPutter(g, look) {
  if (!g || !look || !PUTTER_HEADS[look.style]) return g;
  const was = g.getObjectByName('head');
  if (was && was.userData.style === look.style) return g;
  for (const o of g.children.slice()) {
    if (!o.isMesh) continue;
    g.remove(o); o.geometry.dispose(); for (const m of [].concat(o.material)) m.dispose();
  }
  const head = new THREE.Group(); head.name = 'head'; head.userData.style = look.style;
  head.add(...PUTTER_HEADS[look.style](look));
  /* the neck: from inside the head up to where the shaft starts */
  head.add(hp(new THREE.CylinderGeometry(0.0072, 0.0085, 0.03, 12), hmat(look.shaft, { metalness: look.metal, roughness: 0.3 }), [HEAD_W * 0.36, HEAD_H - 0.013, -HEAD_D / 2]));
  g.add(head);
  return g;
}
/* the glow of `pulse` materials breathes; returns whether anything in `obj` pulses */
function pulseGroup(obj, t) {
  let any = false;
  if (obj) obj.traverse(o => { const m = o.material; if (o.isMesh && m && m.userData.pulse) { any = true; m.emissiveIntensity = m.userData.pulse * (0.72 + 0.28 * Math.sin(t * 2.6 + o.id)); } });
  return any;
}
/* dresses a ball material from a ball item (map, roughness, metalness, glow); disposes the old map */
function dressBall(m, b) {
  const old = m.map, t = shopBallTexture(b);
  m.map = t; m.roughness = b.rough !== undefined ? b.rough : 0.32; m.metalness = b.metal || 0;
  m.envMap = shopEnv(); m.envMapIntensity = b.metal ? 1 : 0.35;
  m.emissiveMap = b.glow ? t : null; m.emissive.set(b.glow ? '#ffffff' : '#000000'); m.emissiveIntensity = b.glow || 0;
  m.userData.pulse = b.pulse ? b.glow || 0 : 0;
  m.needsUpdate = true;
  if (old && old !== t) old.dispose();
}
/* puts the equipped gear on: putter look and feel, ball skin, and the swing pad's little ball and head */
function applyGear() {
  const p = SHOP_ITEMS[progress.equipped.putter], b = SHOP_ITEMS[progress.equipped.ball];
  delete GEAR.putter.style; delete GEAR.putter.shape;
  Object.assign(GEAR.putter, { shape: 'blade' }, p.look);
  for (const k of Object.keys(FEEL)) delete FEEL[k];
  Object.assign(FEEL, feelOf(p.id));
  Object.assign(GEAR.ball, { base: b.base, band: b.band, mark: b.mark, pat: b.pat });
  if (renderer && scene) { setPutter(GEAR.putter); dressPutter(putter, GEAR.putter); shine(putter); }
  if (ballMesh) dressBall(ballMesh.material, b);
  padBall.style.background = b.base; padBall.style.borderColor = b.band;
  padHead.style.background = p.look.head;
  startGlow();
}
/* the glowing gear breathes while it is equipped (never under reduced motion) */
let glowRaf = 0;
function startGlow() { if (!glowRaf && !reducedMotion()) glowRaf = requestAnimationFrame(glowTick); }
function glowTick(now) {
  glowRaf = 0;
  const t = now / 1000, a = ballMesh ? pulseGroup(ballMesh, t) : false, b = pulseGroup(putter, t);
  if ((a || b) && !reducedMotion()) glowRaf = requestAnimationFrame(glowTick);
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
      if (!o.geometry || o.material === st.wood) return;
      if (o.geometry !== st.ballGeo) o.geometry.dispose();
      for (const m of [].concat(o.material)) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }
  const g = new THREE.Group();
  if (it.kind === 'putter') {
    /* the face looks down +z, the shaft rises toward the player at +x; the big picture sets your
       own ball up in front of the face */
    const p = dressPutter(buildPutter(it.look), it.look); p.visible = true;
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
const THUMB_W = { putter: 132, ball: 108 }, THUMB_H = 150, VIEW_W = 340, VIEW_H = 230;
const thumbCache = {};
function thumbFor(id) {
  const it = SHOP_ITEMS[id];
  if (!thumbCache[id]) { const c = document.createElement('canvas'); studioShot(c, id, THUMB_W[it.kind], THUMB_H, 0, false, '#f6e9d2'); thumbCache[id] = c; }
  const c = document.createElement('canvas'), src = thumbCache[id];
  c.className = 'thumb'; c.width = src.width; c.height = src.height;
  if (src.width) c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

/* ---- the shop scene ----
   Three tabs: putters, balls, mulligan packs. Putters and balls show a page of cards at a time
   (wordless arrows, dots, or a swipe across the grid); packs fit on one page. */
const TOKEN_SVG = '<svg class="tok" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="35" r="26" fill="#3f83a2"/><circle cx="32" cy="30" r="26" fill="#6fc0df" stroke="#4a94b5" stroke-width="4"/><path d="M24 22 A12 12 0 1 1 21 36" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/><path d="M17 15 L24 23 L32 18" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW_SVG = '<svg class="arr" viewBox="0 0 64 64" aria-hidden="true"><path d="M14 32 H48 M34 17 L50 32 L34 47" fill="none" stroke="#6f7881" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PER_PAGE = { putter: 10, ball: 12, mull: 3 };
const shopList = kind => kind === 'putter' ? PUTTERS : kind === 'ball' ? BALLS : PACKS;
const shopUi = { tab: 'putter', sel: { putter: null, ball: null, mull: 'm10' }, page: { putter: 0, ball: 0, mull: 0 }, spin: 0, raf: 0, last: 0, swipe: null, swiped: 0 };
const shopPages = (kind = shopUi.tab) => Math.ceil(shopList(kind).length / PER_PAGE[kind]);
const pageOf = (kind, id) => Math.max(0, Math.floor(shopList(kind).findIndex(it => it.id === id) / PER_PAGE[kind]));
function openShop() {
  sfx('tap');
  play.swing = null; play.aimDrag = null; hideAim();
  shopUi.sel.putter = progress.equipped.putter; shopUi.sel.ball = progress.equipped.ball;
  for (const k of ['putter', 'ball']) shopUi.page[k] = pageOf(k, progress.equipped[k]);
  showScene('shop');
  renderShop();
}
function shopSetTab(kind) {
  if (!PER_PAGE[kind]) return;
  if (shopUi.tab !== kind) sfx('tap');
  shopUi.tab = kind;
  if (kind !== 'mull') { shopUi.sel[kind] = progress.equipped[kind]; shopUi.page[kind] = pageOf(kind, progress.equipped[kind]); }
  renderShop();
}
/* turns the page (wraps around at the ends); returns the new page */
function shopGoPage(n) {
  const k = shopUi.tab, pages = shopPages(k), to = ((n % pages) + pages) % pages;
  if (to !== shopUi.page[k]) { shopUi.page[k] = to; sfx('tick'); renderShop(); }
  return to;
}
function shopTap(id) {
  if (Date.now() - shopUi.swiped < 300) return;
  const pk = PACKS.find(p => p.id === id);
  if (pk) { shopUi.sel.mull = id; sfx('tick'); renderShop(); return; }
  const it = SHOP_ITEMS[id];
  if (!it) return;
  shopUi.sel[it.kind] = id;
  if (owns(id)) { if (!isEquipped(id)) { shopEquip(id); sfx('tick'); } sfx('tap'); } else sfx('tick');
  renderShop();
}
/* a pack of mulligan tokens: costs coins, adds tokens, saves; short of coins it boinks */
function shopBuyPack(id) {
  const pk = PACKS.find(p => p.id === id);
  if (!pk) return false;
  shopRepair(progress);
  if (progress.coins < pk.price) { sfx('boink'); shopNudge('poor'); return false; }
  progress.coins -= pk.price; progress.mulligans = Math.min(MULL_MAX, progress.mulligans + pk.n);
  saveProgress(); sfx('coin'); setTimeout(() => sfx('star', 2), 160);
  shopNudge('bought');
  return true;
}
function shopAct() {
  if (shopUi.tab === 'mull') { shopBuyPack(shopUi.sel.mull); renderShop(); return; }
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
/* a stack of tokens for a pack card: more tokens for a bigger pack */
function packArt(pk) {
  const n = pk.n >= 25 ? 5 : pk.n >= 10 ? 3 : 1;
  let g = '';
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i - (n - 1) / 2) * 22, y = 18 - Math.abs(i - (n - 1) / 2) * 10;
    g += `<g transform="translate(${50 + x} ${30 + y})">${TOKEN_SVG.replace('<svg class="tok" viewBox="0 0 64 64" aria-hidden="true">', '<svg width="64" height="64" viewBox="0 0 64 64">')}</g>`;
  }
  return `<svg class="pack" viewBox="0 0 164 120" aria-hidden="true">${g}</svg>`;
}
function renderShop() {
  shopRepair(progress);
  const kind = shopUi.tab, list = shopList(kind), per = PER_PAGE[kind], pages = shopPages(kind);
  shopUi.page[kind] = clamp(shopUi.page[kind] | 0, 0, pages - 1);
  const pg = shopUi.page[kind], sel = shopUi.sel[kind] || progress.equipped[kind];
  for (const [el, k] of [[shopTabPutters, 'putter'], [shopTabBalls, 'ball'], [shopTabMull, 'mull']]) { el.classList.toggle('on', kind === k); el.setAttribute('aria-pressed', String(kind === k)); }
  shopGrid.className = kind;
  shopGrid.innerHTML = '';
  list.slice(pg * per, pg * per + per).forEach((it, j) => {
    const i = pg * per + j, b = document.createElement('button');
    b.dataset.id = it.id;
    b.style.animationDelay = (j * 0.025) + 's';
    b.onclick = () => shopTap(it.id);
    if (kind === 'mull') {
      const poor = progress.coins < it.price;
      b.className = 'card pack' + (it.id === sel ? ' sel' : '') + (poor ? ' poor' : '');
      b.setAttribute('aria-label', it.n + ' mulligans, costs ' + it.price);
      b.innerHTML = `<span class="art">${packArt(it)}<span class="plus">+${it.n}</span></span><span class="tag">${COIN_SVG}<span class="n">${it.price}</span></span>`;
      shopGrid.append(b);
      return;
    }
    const own = owns(it.id), eq = isEquipped(it.id), poor = !own && progress.coins < it.price;
    b.className = 'card' + (own ? ' owned' : '') + (eq ? ' equipped' : '') + (it.id === sel ? ' sel' : '') + (poor ? ' poor' : '') + (it.price >= PREMIUM ? ' premium' : '');
    b.setAttribute('aria-label', kind + ' ' + (i + 1) + (eq ? ', equipped' : own ? ', owned' : ', costs ' + it.price));
    b.append(thumbFor(it.id));
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = eq ? CHECK_SVG : own ? '' : COIN_SVG + `<span class="n">${it.price}</span>`;
    if (own && !eq) tag.className = 'tag none';
    b.append(tag);
    if (it.price >= PREMIUM) b.insertAdjacentHTML('beforeend', SPARKLE_SVG);
    shopGrid.append(b);
  });
  /* the pager: arrows wrap around, dots show where you are */
  shopPager.classList.toggle('one', pages < 2);
  shopDots.innerHTML = Array.from({ length: pages }, (_, n) => `<i class="${n === pg ? 'on' : ''}"></i>`).join('');
  shopDots.setAttribute('aria-label', 'page ' + (pg + 1) + ' of ' + pages);
  shopStage.classList.toggle('mull', kind === 'mull');
  if (kind === 'mull') {
    const pk = PACKS.find(p => p.id === sel) || PACKS[1], poor = progress.coins < pk.price, now = progress.mulligans;
    shopMullArt.innerHTML = packArt(pk) + `<span class="plus">+${pk.n}</span>`;
    shopStats.innerHTML = `<div class="tokens" aria-label="mulligans ${now}, then ${Math.min(MULL_MAX, now + pk.n)}">${TOKEN_SVG}<span class="n">${now}</span>${ARROW_SVG}${TOKEN_SVG}<span class="n up">${Math.min(MULL_MAX, now + pk.n)}</span></div>`;
    shopAction.className = 'btn' + (poor ? ' locked' : ' go');
    shopAction.setAttribute('aria-label', 'buy for ' + pk.price);
    shopAction.innerHTML = COIN_SVG + `<span class="n">${pk.price}</span>` + (poor ? SHOP_LOCK_SVG : '');
    renderWallet();
    return;
  }
  /* the preview panel: stats against the equipped putter, or the ball's colours */
  const it = SHOP_ITEMS[sel], eqIt = SHOP_ITEMS[progress.equipped[kind]];
  if (kind === 'putter') {
    shopStats.innerHTML = STAT_ICONS.map((icon, k) => {
      const lv = it.f[k] + 1, was = eqIt.f[k] + 1;
      return `<div class="stat" aria-label="forgiveness ${lv} of 5">${icon}<span class="pips">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= Math.min(lv, was) ? 'on' : n <= lv ? 'on up' : n <= was ? 'down' : ''}"></i>`).join('')}</span></div>`;
    }).join('');
  } else {
    const sw = it.pat === 'rainbow' || it.pat === 'holo' ? ['#ef7d6d', '#ffd66e', '#74c465', '#6fc0df'] : [it.base, it.band, it.mark];
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
  if (shopUi.tab === 'mull') return;
  const id = shopUi.sel[shopUi.tab] || progress.equipped[shopUi.tab];
  studioShot(shopView, id, VIEW_W, VIEW_H, shopUi.spin, true, '#dff0f5');
}
/* the preview turns slowly while the shop is open (still under reduced motion); glowing gear breathes */
function shopLoop(now) {
  shopUi.raf = 0;
  if (currentScene !== 'shop') return;
  const dt = shopUi.last ? Math.min(0.1, (now - shopUi.last) / 1000) : 0;
  shopUi.last = now;
  shopUi.spin = Math.sin(now / 1000 * 0.7) * (shopUi.tab === 'ball' ? 1.6 : 0.35) + (shopUi.tab === 'ball' ? now / 1000 * 0.4 : 0);
  if (studio) pulseGroup(studio.item, now / 1000);
  if (dt) drawShopView();
  shopUi.raf = requestAnimationFrame(shopLoop);
}
/* a swipe across the grid turns the page */
function shopSwipeDown(e) { shopUi.swipe = { x: e.clientX, y: e.clientY }; }
function shopSwipeUp(e) {
  const sw = shopUi.swipe; shopUi.swipe = null;
  if (!sw || shopUi.tab === 'mull') return;
  const dx = (e.clientX - sw.x) / stageScale, dy = (e.clientY - sw.y) / stageScale;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { shopUi.swiped = Date.now(); shopGoPage(shopUi.page[shopUi.tab] + (dx < 0 ? 1 : -1)); }
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
  shopTabMull.addEventListener('click', () => shopSetTab('mull'));
  shopPrev.addEventListener('click', () => shopGoPage(shopUi.page[shopUi.tab] - 1));
  shopNext.addEventListener('click', () => shopGoPage(shopUi.page[shopUi.tab] + 1));
  shopGrid.addEventListener('pointerdown', shopSwipeDown);
  shopGrid.addEventListener('pointerup', shopSwipeUp);
  shopGrid.addEventListener('pointercancel', () => { shopUi.swipe = null; });
  /* every later setPutter (the shop's own, or a left-hander swap) gets its style's head back */
  const plainSetPutter = setPutter;
  setPutter = gear => { plainSetPutter(gear); dressPutter(putter, gear); shine(putter); startGlow(); };
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
  shopMullN.textContent = progress.mulligans;
}
