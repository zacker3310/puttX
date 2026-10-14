/* PuttX: one-file 3D mini golf. Sections, in order:
   1. stage   2. sim (DOM-free: physics, rounds, worlds, progress, hole packs)   3. save
   4. audio   5. render (+ world looks)   6. play   7. scenes   8. fx   9. boot */
'use strict';
/* this build's fingerprint (scripts/build.cjs fills it in): a home-screen app compares it with the live page to pick up updates */
const BUILD_ID = '@@BUILD_ID@@';
/* ============ 1. STAGE ============ */
let stageScale = 1, currentScene = '';
function fit() {
  stageScale = Math.min(innerWidth / 1200, innerHeight / 700);
  stage.style.transform = `translate(-50%,-50%) scale(${stageScale})`;
}
function showScene(id) {
  if (updateReady && id !== 'hole') { location.reload(); return; }   /* an update waiting: take it between holes, never mid-putt */
  currentScene = id;
  for (const s of document.querySelectorAll('.scene')) s.classList.toggle('active', s.id === id);
}

/* ============ 2. SIM ============ */
// #region sim
/* Everything between these markers is deterministic and touches neither the page nor the
   renderer: tests/sim.cjs runs it in Node. Units are metres and seconds; y is up; a hole lies in the x-z plane. */

/* ---- 2a. constants ---- */
const SIM_DT = 1 / 240;          /* fixed physics step */
const BALL_R = 0.0255;           /* a small, quick ball: about 1.2x a real one (0.021) */
const CUP_R = 0.11;
const CUP_SINK = 0.2;             /* how deep the cup is drawn: the drop is longer than the physics needs, for the plunk */
const CAP_V0 = 2.1;              /* dead-centre capture speed; an off-centre ball crosses a shorter chord and needs to be slower */
const CAP_CREEP = 0.45;          /* anything this slow with its centre over the hole drops, whatever the line */
const MIN_V = 0.28, MAX_V = 4.27; /* putt speed at power 0 and power 1: full power rolls about 17 m of felt, for the long lag putts */
const V_CAP = 6.5;               /* nothing pushes a ball past this: 0.027 m per step, well under a wall's reach (BALL_R + WALL_HALF) */
const STOP_V = 0.03;
const SETTLE_T = 0.4;            /* slower than STOP_V this long = at rest, even pressed on a wall or a lip */
const STATIC_MU = 0.1;           /* a stopped ball stays put on slopes gentler than this */
const MAX_SIM_T = 25;
const G = 9.8;
const ROLL = 5 / 7;              /* rolling sphere: share of gravity along a slope */
const SKID_MU = 0.22, SKID_END = 0.92;  /* the struck ball slides (sliding friction) until it has shed 12% and rolls */
/* water is a hazard (the ball goes back where it was putted from, plus one); push zones are
   conveyors and fans: a constant acceleration [ax, az] while the ball rolls on them */
/* GLIDE: every surface is slicker than a real green, so the ball coasts; ice is nearly frictionless */
const GLIDE = 0.62, FELT_MU = 0.075;
const SURF = { felt: { mu: FELT_MU * GLIDE }, ice: { mu: 0.006 }, sand: { mu: 0.4 * GLIDE }, mud: { mu: 0.75 * GLIDE }, fast: { mu: 0.04 * GLIDE }, water: { mu: FELT_MU * GLIDE } };
const WALL_TOP = 0.15, WALL_HALF = 0.05, WALL_E = 0.78, WALL_SLIP = 0.94;
const POST_E = 0.6, MOVER_E = 0.8;
const STEP_MAX = 0.03;           /* ground rising more than this under the ball's leading edge is a cliff face */
const CLIFF_E = 0.45;
const BOUNCE_VY = 0.75, BOUNCE_E = 0.5;  /* a landing faster than BOUNCE_VY hops back up: a lively golf ball, not a marble */
const OOB_Y = -1;
/* the cup sits in a slight funnel: inside LIP_PULL_R of the rim a slow ball is drawn in, harder the closer it gets */
const LIP_TURN = 0.5, LIP_KEEP = 0.62, HOP_KEEP = 0.55, LIP_PULL = 2.6, LIP_PULL_R = 0.25;
const TUBE_R = 0.12, TUBE_T = 0.45;   /* a tube mouth swallows a rolling ball whose centre comes this close; transit time */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---- 2b. hole geometry ---- */
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const ring = pts => pts.concat([pts[0]]);
/* A walled hole passes `shape` (one floor, closed outline wall). An open hole (gaps, drop-offs)
   passes `floors` and `walls` itself. `inner` adds wall polylines (girders, dividers).
   Height: `tiers` are raised plateaus { poly, h, sx?, sz? } (sx/sz tilt them, per metre, about
   the origin); `ramps` rise h0 -> h1 along +axis over a rectangle and win over tiers; `bumps`
   are gaussian hills (h > 0) and bowls (h < 0) added on top of everything.
   `tubes` { a, b, dir, keep?, add? } swallow a ball at mouth a and spit it out at b heading
   `dir` degrees. `aim0` sets the tee's opening aim (degrees) when the cup is not the way to go. */
function makeHole(def) {
  const h = Object.assign({ par: 3, g: 1, feltMu: SURF.felt.mu, bumps: [], drains: [], ramps: [], tiers: [], zones: [], posts: [], movers: [], inner: [], tubes: [] }, def);
  h.open = !def.shape;
  if (!h.floors) h.floors = [h.shape];
  if (!h.walls) h.walls = [ring(h.shape)];
  h.walls = h.walls.concat(h.inner);
  h.segs = [];
  for (const w of h.walls) for (let i = 0; i + 1 < w.length; i++) h.segs.push([w[i][0], w[i][1], w[i + 1][0], w[i + 1][1]]);
  /* per segment: a padded bounding box (broad phase) and the wall's top and foot, sampled along it
     so the renderer and the physics agree on how tall a wall stands over hills and tiers */
  const R = BALL_R + WALL_HALF + 0.01;
  h.segBox = h.segs.map(([ax, az, bx, bz]) => [Math.min(ax, bx) - R, Math.max(ax, bx) + R, Math.min(az, bz) - R, Math.max(az, bz) + R]);
  /* computed on first use: sampling every wall over every hole at boot costs seconds */
  let tops = null;
  Object.defineProperty(h, 'segTop', { enumerable: false, get: () => tops || (tops = wallTops(h)) });
  return h;
}
function wallTops(h) {
  return h.segs.map(([ax, az, bx, bz]) => {
    const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.05));
    let hi = -Infinity, lo = Infinity;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u, e = BALL_R;
      /* both faces of the wall: a tier edge under a wall has a different height on each side */
      for (const [ox, oz] of [[0, 0], [e, 0], [-e, 0], [0, e], [0, -e]]) { const y = groundH(h, x + ox, z + oz); hi = Math.max(hi, y); lo = Math.min(lo, y); }
    }
    return [hi + WALL_TOP, lo];
  });
}
function inPoly(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
const onFloor = (h, x, z) => h.floors.some(p => inPoly(p, x, z));
function zoneAt(h, x, z) {
  for (const zn of h.zones) if (inPoly(zn.poly, x, z)) return zn;
  return null;
}
const inRamp = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
/* the plateau under (x, z) and its slope, before bumps: a ramp, else the last tier containing it, else 0 */
function baseAt(h, x, z) {
  for (const r of h.ramps) if (inRamp(r, x, z)) {
    const h0 = r.h0 || 0, h1 = r.h1 !== undefined ? r.h1 : r.h;
    if (r.axis === 'x') { const k = (h1 - h0) / (r.x1 - r.x0); return [h0 + k * (x - r.x0), k, 0]; }
    const k = (h1 - h0) / (r.z1 - r.z0); return [h0 + k * (z - r.z0), 0, k];
  }
  for (let i = h.tiers.length - 1; i >= 0; i--) {
    const t = h.tiers[i];
    if (inPoly(t.poly, x, z)) return [t.h + (t.sx || 0) * x + (t.sz || 0) * z, t.sx || 0, t.sz || 0];
  }
  return [0, 0, 0];
}
/* a drain is a coin-funnel bowl: flat at the bottom (radius f, where the cup goes), then a curve
   that steepens toward the middle, so a ball fed in sideways spirals round and round as it drops */
const DRAIN_FLAT = CUP_R + 0.07;
function drainY(d, dr) {
  const f = dr.flat || DRAIN_FLAT;
  if (d >= dr.r) return [0, 0];
  if (d <= f) return [-dr.depth, 0];
  const u = (dr.r - d) / (dr.r - f);
  return [-dr.depth * u * u, 2 * dr.depth * u / (dr.r - f)];
}
function groundH(h, x, z) {
  let y = baseAt(h, x, z)[0];
  for (const b of h.bumps) { const dx = x - b.x, dz = z - b.z; y += b.h * Math.exp(-(dx * dx + dz * dz) / (b.r * b.r)); }
  for (const dr of h.drains) y += drainY(Math.hypot(x - dr.x, z - dr.z), dr)[0];
  return y;
}
function groundGrad(h, x, z) {
  const base = baseAt(h, x, z);
  let gx = base[1], gz = base[2];
  for (const b of h.bumps) {
    const dx = x - b.x, dz = z - b.z, k = -2 * b.h * Math.exp(-(dx * dx + dz * dz) / (b.r * b.r)) / (b.r * b.r);
    gx += k * dx; gz += k * dz;
  }
  for (const dr of h.drains) {
    const dx = x - dr.x, dz = z - dr.z, d = Math.hypot(dx, dz), s = d > 1e-9 ? drainY(d, dr)[1] / d : 0;
    gx += s * dx; gz += s * dz;
  }
  return [gx, gz];
}

/* ---- 2c. collisions ---- */
function closestOnSeg(ax, az, bx, bz, x, z) {
  const ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez;
  const t = L2 ? clamp(((x - ax) * ex + (z - az) * ez) / L2, 0, 1) : 0;
  return [ax + ex * t, az + ez * t];
}
/* reflect off a surface with normal n moving at (svx, svz); returns the impact speed */
function bounce(b, nx, nz, e, svx, svz) {
  const rvx = b.vx - svx, rvz = b.vz - svz, vn = rvx * nx + rvz * nz;
  if (vn >= 0) return 0;
  const tx = rvx - vn * nx, tz = rvz - vn * nz;
  b.vx = svx + tx * WALL_SLIP - e * vn * nx;
  b.vz = svz + tz * WALL_SLIP - e * vn * nz;
  const s = Math.hypot(b.vx, b.vz);
  if (s > V_CAP) { b.vx *= V_CAP / s; b.vz *= V_CAP / s; }
  return -vn;
}
function hitSeg(b, ax, az, bx, bz, e, svx = 0, svz = 0) {
  const [px, pz] = closestOnSeg(ax, az, bx, bz, b.x, b.z), R = BALL_R + WALL_HALF;
  let nx = b.x - px, nz = b.z - pz;
  const d = Math.hypot(nx, nz);
  if (d >= R || d < 1e-9) return 0;
  nx /= d; nz /= d;
  b.x = px + nx * R; b.z = pz + nz * R;
  return bounce(b, nx, nz, e, svx, svz);
}
function hitCircle(b, cx, cz, cr, e, svx = 0, svz = 0) {
  let nx = b.x - cx, nz = b.z - cz;
  const d = Math.hypot(nx, nz), R = cr + BALL_R;
  if (d >= R || d < 1e-9) return 0;
  nx /= d; nz /= d;
  b.x = cx + nx * R; b.z = cz + nz * R;
  return bounce(b, nx, nz, e, svx, svz);
}
/* movers: a spinning arm (`blades` lines through the hub: 1 = a two-ended arm, 2 = a windmill
   cross), a disc easing between two points (`slide`), or a wall bar easing between two points
   keeping its heading `ang` degrees (`gate`) */
function moverState(m, t) {
  if (m.kind === 'spin') {
    const th = m.phase + m.w * t, n = m.blades || 1, bars = [];
    for (let i = 0; i < n; i++) {
      const a = th + i * Math.PI / n, dx = Math.sin(a) * m.len, dz = Math.cos(a) * m.len;
      bars.push([m.x - dx, m.z - dz, m.x + dx, m.z + dz]);
    }
    return { th, bars, ax: bars[0][0], az: bars[0][1], bx: bars[0][2], bz: bars[0][3] };
  }
  const k = 2 * Math.PI / m.period, u = k * t + (m.phase || 0), s = 0.5 - 0.5 * Math.cos(u), ds = 0.5 * Math.sin(u) * k;
  const st = { x: m.ax + (m.bx - m.ax) * s, z: m.az + (m.bz - m.az) * s, vx: (m.bx - m.ax) * ds, vz: (m.bz - m.az) * ds };
  if (m.kind === 'gate') {
    const a = (m.ang || 0) * Math.PI / 180, dx = Math.sin(a) * m.len, dz = Math.cos(a) * m.len;
    st.bars = [[st.x - dx, st.z - dz, st.x + dx, st.z + dz]];
  }
  return st;
}
function moverTouch(h, b, t) {
  for (const m of h.movers) {
    const s = moverState(m, t);
    if (s.bars) {
      for (const [ax, az, bx, bz] of s.bars) { const p = closestOnSeg(ax, az, bx, bz, b.x, b.z); if (Math.hypot(b.x - p[0], b.z - p[1]) < BALL_R + WALL_HALF) return true; }
    } else if (Math.hypot(b.x - s.x, b.z - s.z) < m.r + BALL_R) return true;
  }
  return false;
}
function collideAll(h, b, t) {
  const air = b.air;
  for (let i = 0; i < h.segs.length; i++) {
    const bb = h.segBox[i];
    if (b.x < bb[0] || b.x > bb[1] || b.z < bb[2] || b.z > bb[3]) continue;
    if (air && h.open && b.y > h.segTop[i][0]) continue;   /* open holes: a flying ball can clear a wall; walled holes keep it in */
    const s = h.segs[i], v = hitSeg(b, s[0], s[1], s[2], s[3], WALL_E);
    if (v) b.hits.push(['wall', v]);
  }
  for (const p of h.posts) {
    if (air && b.y > groundH(h, p.x, p.z) + (p.top || 0.22)) continue;
    const e = p.e || POST_E, v = hitCircle(b, p.x, p.z, p.r, e);
    if (v) b.hits.push([e > 1 ? 'bump' : 'post', v]);
  }
  for (const m of h.movers) {
    const s = moverState(m, t);
    let v = 0;
    if (m.kind === 'spin') {
      for (const [ax, az, bx, bz] of s.bars) {
        const p = closestOnSeg(ax, az, bx, bz, b.x, b.z), rx = p[0] - m.x, rz = p[1] - m.z;
        v = Math.max(v, hitSeg(b, ax, az, bx, bz, MOVER_E, m.w * rz, -m.w * rx));   /* contact point velocity = w x r */
      }
    } else if (m.kind === 'gate') v = hitSeg(b, ...s.bars[0], MOVER_E, s.vx, s.vz);
    else v = hitCircle(b, s.x, s.z, m.r, MOVER_E, s.vx, s.vz);
    if (v) b.hits.push(['mover', v]);
  }
}

/* ---- 2d. the ball ---- */
function newBall(h, x, z) { return { x, z, y: groundH(h, x, z), vx: 0, vz: 0, vy: 0, air: false, inCup: false, skid: 0, tube: null, hits: [] }; }
function puttVelocity(angleDeg, power) {
  const a = angleDeg * Math.PI / 180, v = MIN_V + (MAX_V - MIN_V) * clamp(power, 0, 1);
  return [Math.sin(a) * v, Math.cos(a) * v];
}
function launch(b, angleDeg, power) {
  const v = puttVelocity(angleDeg, power);
  b.vx = v[0]; b.vz = v[1]; b.skid = Math.hypot(v[0], v[1]) * SKID_END;
  return b;
}
/* a ball whose leading edge meets ground more than STEP_MAX above it hits the face of that step */
function hitCliff(h, b, px, pz) {
  const s = Math.hypot(b.vx, b.vz);
  if (s < 1e-9) return 0;
  const lx = b.x + b.vx / s * BALL_R * 0.8, lz = b.z + b.vz / s * BALL_R * 0.8;
  if (!onFloor(h, lx, lz) || groundH(h, lx, lz) - b.y <= STEP_MAX) return 0;
  /* the face normal points from the high ground back down to the ball */
  const e = BALL_R, H = (x, z) => groundH(h, x, z);
  let nx = -(H(lx + e, lz) - H(lx - e, lz)), nz = -(H(lx, lz + e) - H(lx, lz - e));
  const n = Math.hypot(nx, nz);
  if (n < 1e-9) { nx = -b.vx / s; nz = -b.vz / s; } else { nx /= n; nz /= n; }
  b.x = px; b.z = pz;
  return bounce(b, nx, nz, CLIFF_E, 0, 0);
}
/* one fixed step at hole time t. Returns null while the putt is live, else how it ended. */
function stepBall(h, b, t) {
  const dt = SIM_DT, g = G * h.g;
  if (b.tube) {
    if ((b.tube.t -= dt) > 0) return null;
    const tb = b.tube.def, a = tb.dir * Math.PI / 180, v = clamp(b.tube.v * (tb.keep !== undefined ? tb.keep : 0.7) + (tb.add || 0.3), 0.4, V_CAP);
    b.x = tb.b[0]; b.z = tb.b[1]; b.y = groundH(h, b.x, b.z); b.vy = 0;
    b.vx = Math.sin(a) * v; b.vz = Math.cos(a) * v; b.tube = null; b.skid = 0; b.hits.push(['tubeOut', v]);
    return null;
  }
  if (b.air) {
    const px = b.x, pz = b.z, py = b.y;
    b.vy -= g * dt;
    b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
    collideAll(h, b, t);
    if (onFloor(h, b.x, b.z)) {
      const gh = groundH(h, b.x, b.z);
      /* already below this floor's surface last step: it came in from the side, under the edge, so it hits the slab's face */
      if (py < gh - STEP_MAX && b.y <= gh) {
        const s = Math.hypot(b.vx, b.vz) || 1;
        b.x = px; b.z = pz;
        if (bounce(b, -b.vx / s, -b.vz / s, CLIFF_E, 0, 0)) b.hits.push(['wall', s]);
      } else if (b.y <= gh) {
        const imp = -b.vy;
        b.y = gh;
        if (imp > BOUNCE_VY) { b.vy = imp * BOUNCE_E; b.vx *= 0.95; b.vz *= 0.95; }
        else { b.vy = 0; b.air = false; const k = 1 - 0.08 * Math.min(1, imp / BOUNCE_VY); b.vx *= k; b.vz *= k; }
        if (imp > 0.4) b.hits.push(['land', imp]);
      }
    } else if (b.y < OOB_Y) return 'oob';
    return null;
  }
  const grad = groundGrad(h, b.x, b.z), q = 1 + grad[0] * grad[0] + grad[1] * grad[1];
  /* along the surface: gravity's slope share (5/7 for a rolling ball), projected onto the ground plane */
  const sax = -ROLL * g * grad[0] / q, saz = -ROLL * g * grad[1] / q;
  const zn = zoneAt(h, b.x, b.z);
  let vx = b.vx + sax * dt, vz = b.vz + saz * dt;
  if (zn && zn.push) { vx += zn.push[0] * dt; vz += zn.push[1] * dt; }
  /* rolling resistance scales with the normal force; a freshly struck ball slides first */
  const mu = zn && zn.surf ? SURF[zn.surf].mu : h.feltMu, s0 = Math.hypot(vx, vz);
  const muNow = b.skid > 0 && s0 > b.skid ? Math.max(mu, SKID_MU) : mu;
  if (b.skid > 0 && s0 <= b.skid) b.skid = 0;
  const s1 = Math.max(0, s0 - muNow * g * dt / Math.sqrt(q));
  if (s0 > 0) { vx *= s1 / s0; vz *= s1 / s0; }
  if (s1 > V_CAP) { vx *= V_CAP / s1; vz *= V_CAP / s1; }
  b.vx = vx; b.vz = vz;
  const px = b.x, pz = b.z;
  b.x += vx * dt; b.z += vz * dt;
  collideAll(h, b, t);
  const cv = hitCliff(h, b, px, pz);
  if (cv) b.hits.push(['wall', cv]);
  if (!onFloor(h, b.x, b.z)) { b.air = true; b.vy -= g * dt; return null; }
  /* leaves the ground where the ground falls away faster than gravity can bend the path: crests, lips, drops */
  const gh = groundH(h, b.x, b.z), yFree = b.y + b.vy * dt - 0.5 * g * dt * dt;
  if (gh < yFree - 1e-4) { b.air = true; b.y = yFree; b.vy -= g * dt; return null; }
  b.vy = (gh - b.y) / dt; b.y = gh;

  const zw = zoneAt(h, b.x, b.z);
  if (zw && zw.surf === 'water') { b.hits.push(['splash', 1]); return 'oob'; }
  for (const tb of h.tubes) if (Math.hypot(b.x - tb.a[0], b.z - tb.a[1]) < TUBE_R) {
    b.tube = { def: tb, t: TUBE_T, v: Math.hypot(b.vx, b.vz) };
    b.x = tb.a[0]; b.z = tb.a[1]; b.vx = b.vz = 0; b.hits.push(['tubeIn', 1]);
    return null;
  }

  const s = Math.hypot(b.vx, b.vz), dx = b.x - h.cup[0], dz = b.z - h.cup[1], dc = Math.hypot(dx, dz);
  if (dc < CUP_R) {
    /* how far the ball's line passes from the cup centre sets the chord it crosses, and so the capture speed */
    const off = s > 1e-6 ? Math.abs(b.vx * dz - b.vz * dx) / s : 0, chord = Math.max(0, 1 - (off / CUP_R) ** 2) ** 0.25;   /* gentle: an edge ball still gets a fair chance */
    /* one capture decision per pass over the hole: a ball that hopped or lipped stays out unless it is crawling */
    if (s < CAP_CREEP || (!b.inCup && s < CAP_V0 * chord)) return 'sunk';
    if (!b.inCup) {
      if (off < CUP_R * 0.3) { b.vx *= HOP_KEEP; b.vz *= HOP_KEEP; b.hits.push(['lip', s]); }   /* dead centre, too hot: hits the back and hops out */
      else {
        const a = ((b.vx * dz - b.vz * dx) > 0 ? 1 : -1) * LIP_TURN * off / CUP_R, c = Math.cos(a), sn = Math.sin(a);
        const nvx = (b.vx * c - b.vz * sn) * LIP_KEEP, nvz = (b.vx * sn + b.vz * c) * LIP_KEEP;
        b.vx = nvx; b.vz = nvz; b.hits.push(['lip', s]);
      }
    }
    b.inCup = true;
  } else {
    b.inCup = false;
    if (dc < CUP_R + LIP_PULL_R && s < CAP_V0 * 0.75) { const k = LIP_PULL * (1 - (dc - CUP_R) / LIP_PULL_R) * dt / dc; b.vx -= k * dx; b.vz -= k * dz; }
  }
  /* stopped when slow and the slope cannot beat whichever holds harder: static grip or rolling friction */
  const pushA = zn && zn.push ? Math.hypot(zn.push[0], zn.push[1]) : 0;
  if (s < STOP_V && Math.hypot(sax, saz) + pushA < Math.max(STATIC_MU, mu) * g) { b.vx = 0; b.vz = 0; return 'stop'; }
  b.still = s < STOP_V ? (b.still || 0) + SIM_DT : 0;
  if (b.still >= SETTLE_T) { b.vx = 0; b.vz = 0; return 'stop'; }
  return null;
}
function simulatePutt(h, from, angleDeg, power, t0 = 0) {
  const b = launch(newBall(h, from[0], from[1]), angleDeg, power);
  let t = t0, n = 0, end = null;
  while (!end) {
    end = stepBall(h, b, t);
    t += SIM_DT;
    if (!end && ++n * SIM_DT > MAX_SIM_T) end = 'timeout';
  }
  return { end, x: b.x, z: b.z, t, steps: n, hits: b.hits };
}
/* ---- 2e. rounds and scoring ---- */
const capOf = h => h.par * 2;   /* the worst a hole can cost: double par, then the ball rolls itself in */
const starsFor = (score, par) => score < par ? 3 : score === par ? 2 : 1;
function newRound(h) { return { hole: h, strokes: 0, at: h.tee.slice(), done: false, score: null, auto: false }; }
/* a putt finished: count it, move the ball, and finish the hole at the cup or the cap */
function resolvePutt(round, result, from) {
  round.strokes++;
  if (result.end === 'sunk') { round.done = true; round.score = round.strokes; round.at = round.hole.cup.slice(); return 'sunk'; }
  if (result.end === 'oob') { round.strokes++; round.at = from.slice(); } else round.at = [result.x, result.z];
  if (round.strokes >= capOf(round.hole)) { round.done = true; round.auto = true; round.score = capOf(round.hole); return 'auto'; }
  return result.end === 'oob' ? 'oob' : 'stop';
}
/* a mover pushed a resting ball: never the player's fault, so no stroke and no penalty */
function resolveDrift(round, result, from) {
  if (result.end === 'sunk') { round.done = true; round.score = Math.max(1, round.strokes); round.at = round.hole.cup.slice(); return 'sunk'; }
  round.at = result.end === 'oob' ? from.slice() : [result.x, result.z];
  return result.end === 'oob' ? 'oob' : 'stop';
}

/* ---- 2f. courses ---- */
const WORLD_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];   /* ten courses of 18; a course with no pack yet is skipped */
const HOLES_PER = 18;
const WORLDS = {};
function registerWorld(w, def) {
  /* a course's own feltMu is written in old units; GLIDE makes it slicker like everything else */
  const g = def.g || 1, raw = def.feltMu || FELT_MU, feltMu = raw * GLIDE;
  WORLDS[w] = { g, feltMu: raw, defs: def.holes, holes: def.holes.map((d, i) => Object.assign(makeHole(Object.assign({ g, feltMu }, d)), { key: w + '-' + (i + 1) })) };
}
function holeAt(key) {
  const [w, n] = String(key).split('-').map(Number);
  return WORLDS[w] ? WORLDS[w].holes[n - 1] : undefined;
}
function nextKey(key) { const [w, n] = key.split('-').map(Number); return WORLDS[w] && n < WORLDS[w].holes.length ? w + '-' + (n + 1) : null; }
const playable = () => WORLD_ORDER.filter(w => WORLDS[w]);
/* each world has three courses of 18: course w, then w + 10 and w + 20, each more intricate */
const COURSE_STEP = 10, COURSES_PER = 3;
const coursesOf = w => Array.from({ length: COURSES_PER }, (_, k) => w + k * COURSE_STEP).filter(c => WORLDS[c]);
const allCourses = () => WORLD_ORDER.flatMap(coursesOf);
const worldOf = c => ((c % 100) - 1) % COURSE_STEP + 1;

/* ---- 2g. progress (pure; section 3 stores it) ---- */
function freshProgress() { return { v: 2, holes: {}, worlds: [playable()[0] || WORLD_ORDER[0]], sound: true, hand: 'R', mulligans: 5, lost: {}, obj: {}, daily: null }; }
function recordHole(p, key, score, par, maxStars = 3) {
  const prev = p.holes[key];
  const rec = { best: prev ? Math.min(prev.best, score) : score, stars: Math.max(prev ? prev.stars : 0, Math.min(maxStars, starsFor(score, par))) };
  p.holes[key] = rec;
  /* the last hole of a course opens the next playable course */
  const [w, n] = key.split('-').map(Number), list = playable(), i = list.indexOf(w);
  const open = c => { if (WORLDS[c] && !p.worlds.includes(c)) p.worlds.push(c); };
  if (WORLDS[w] && n === WORLDS[w].holes.length && w < NIGHT) {
    /* a world's first course opens the next world; each course opens the next one in its world */
    if (i >= 0 && i + 1 < list.length) open(list[i + 1]);
    if (w + COURSE_STEP <= worldOf(w) + (COURSES_PER - 1) * COURSE_STEP) open(w + COURSE_STEP);
    /* finishing a course also opens its night remix */
    open(NIGHT + w);
  }
  return rec;
}
function holeUnlocked(p, key) {
  const [w, n] = key.split('-').map(Number);
  return p.worlds.includes(w) && (n === 1 || !!p.holes[w + '-' + (n - 1)]);
}
/* ---- 2h. course packs ---- */
/* Each courses/cNN.sim.js registers one course here (scripts/build.cjs inlines them). */
/* @@COURSES_SIM@@ */

/* ---- 2i. night remixes ---- */
/* Course NIGHT + n is course n mirrored left to right (x -> -x). The physics is symmetric under
   that mirror, so each proof carries over by mirroring its aims; tests/night-check.cjs replays all
   of them. Spinners turn the other way, gates and tubes and pushes flip, ramps along x swap ends. */
const NIGHT = 100;
const mx = p => [-p[0], p[1]], mpoly = poly => poly.map(mx);
function mirrorDef(d) {
  const m = Object.assign({}, d);
  for (const k of ['tee', 'cup']) if (d[k]) m[k] = mx(d[k]);
  if (d.shape) m.shape = mpoly(d.shape);
  if (d.floors) m.floors = d.floors.map(mpoly);
  if (d.walls) m.walls = d.walls.map(mpoly);
  if (d.inner) m.inner = d.inner.map(mpoly);
  if (d.tiers) m.tiers = d.tiers.map(t => Object.assign({}, t, { poly: mpoly(t.poly), sx: t.sx ? -t.sx : t.sx }));
  if (d.ramps) m.ramps = d.ramps.map(r => {
    const h0 = r.h0 || 0, h1 = r.h1 !== undefined ? r.h1 : r.h, o = Object.assign({}, r, { x0: -r.x1, x1: -r.x0 });
    delete o.h;
    return r.axis === 'x' ? Object.assign(o, { h0: h1, h1: h0 }) : Object.assign(o, { h0, h1 });
  });
  if (d.bumps) m.bumps = d.bumps.map(b => Object.assign({}, b, { x: -b.x }));
  if (d.drains) m.drains = d.drains.map(b => Object.assign({}, b, { x: -b.x }));
  if (d.zones) m.zones = d.zones.map(z => Object.assign({}, z, { poly: mpoly(z.poly) }, z.push ? { push: [-z.push[0], z.push[1]] } : {}));
  if (d.posts) m.posts = d.posts.map(q => Object.assign({}, q, { x: -q.x }));
  if (d.movers) m.movers = d.movers.map(v => v.kind === 'spin' ? Object.assign({}, v, { x: -v.x, w: -v.w, phase: -(v.phase || 0) })
    : Object.assign({}, v, { ax: -v.ax, bx: -v.bx }, v.kind === 'gate' ? { ang: -(v.ang || 0) } : {}));
  if (d.tubes) m.tubes = d.tubes.map(t => Object.assign({}, t, { a: mx(t.a), b: mx(t.b), dir: -t.dir }));
  if (d.aim0 !== undefined) m.aim0 = -d.aim0;
  if (d.sol) m.sol = d.sol.map(([a, p, t0]) => [(360 - a) % 360, p, t0]);
  return m;
}
for (const w of allCourses()) registerWorld(NIGHT + w, { g: WORLDS[w].g, feltMu: WORLDS[w].feltMu, holes: WORLDS[w].defs.map(mirrorDef) });
const isNight = w => w > NIGHT;
// #endregion sim

/* ============ 3. SAVE ============ */
const SAVE_KEY = 'puttx.v2';     /* v1 saves were for the old 27 holes; the courses changed, so they start fresh */
let progress = freshProgress();
function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!p || p.v !== 2 || typeof p.holes !== 'object' || !p.holes || !Array.isArray(p.worlds)) return freshProgress();
    const worlds = p.worlds.filter(w => !!WORLDS[w]);
    if (!worlds.includes(freshProgress().worlds[0])) return freshProgress();
    const holes = {};
    for (const [k, r] of Object.entries(p.holes)) {
      if (/^\d+-\d+$/.test(k) && r && Number.isInteger(r.best) && r.best >= 1 && [1, 2, 3].includes(r.stars)) holes[k] = { best: r.best, stars: r.stars };
    }
    if (Object.keys(holes).length !== Object.keys(p.holes).length) return freshProgress();
    return Object.assign({}, p, { v: 2, holes, worlds, sound: p.sound !== false, hand: p.hand === 'L' ? 'L' : 'R' });
  } catch (e) { return freshProgress(); }
}
function saveProgress() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) {} }

/* ============ 4. AUDIO ============ */
/* Every sound is synthesized: oscillators and filtered noise through one master gain and a
   compressor. The context is created on the first touch, as iOS requires. */
let actx = null, master = null, noiseBuf = null, rollGain = null;
const sfxLog = [];
function audio() {
  if (actx) return actx;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  const comp = actx.createDynamicsCompressor();
  master = actx.createGain(); master.gain.value = progress.sound ? 0.8 : 0;
  master.connect(comp); comp.connect(actx.destination);
  noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let s = 99; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
  const src = actx.createBufferSource(), lp = actx.createBiquadFilter();
  src.buffer = noiseBuf; src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 700;
  rollGain = actx.createGain(); rollGain.gain.value = 0;
  src.connect(lp); lp.connect(rollGain); rollGain.connect(master); src.start();
  return actx;
}
/* iOS resumes audio only inside an activation gesture (pointerup, click), not a touch pointerdown, and
   reports 'interrupted' after a call or backgrounding; any tap brings the sound back */
function wakeAudio() { const a = audio(); if (a && a.state !== 'running') a.resume().catch(() => {}); }
for (const ev of ['pointerdown', 'pointerup', 'click']) addEventListener(ev, wakeAudio, { capture: true });
function setSound(on) {
  progress.sound = on; saveProgress();
  if (master) master.gain.value = on ? 0.8 : 0;
}
function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0 } = {}) {
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.2, freq = 2000, q = 1, type = 'bandpass', delay = 0 } = {}) {
  const t = actx.currentTime + delay, src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  src.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}
const SFX = {
  /* a clean strike rings; a toe or heel strike thuds */
  putt: (p, clean = 1) => { noise(0.03, { vol: 0.25 + p * 0.3, freq: 2200 + 1500 * clean, q: 2 }); tone(500 + p * 400 + clean * 300, 0.06, { type: 'triangle', vol: 0.2 + p * 0.2, slide: -300 }); },
  clonk: v => tone(170 + Math.min(v, 4) * 30, 0.09, { type: 'triangle', vol: Math.min(0.45, 0.12 + v * 0.1) }),
  boing: v => tone(320, 0.2, { vol: Math.min(0.3, 0.1 + v * 0.08), slide: 260 }),
  cup: () => tone(1500, 0.04, { type: 'triangle', vol: 0.12, slide: -300 }),
  rattle: (v = 0.5) => { tone(1900 - v * 500, 0.035, { type: 'square', vol: 0.05 + v * 0.07 }); noise(0.04, { vol: 0.08 + v * 0.1, freq: 3200, q: 4 }); },
  plunk: () => { tone(150, 0.32, { vol: 0.55, slide: -70 }); tone(300, 0.12, { type: 'triangle', vol: 0.18, slide: -120 }); noise(0.09, { vol: 0.3, freq: 420, q: 1.2, type: 'lowpass' }); },
  lip: () => tone(900, 0.07, { type: 'square', vol: 0.08, slide: 300 }),
  land: v => noise(0.08, { vol: Math.min(0.4, 0.12 + v * 0.08), freq: 400 }),
  boink: () => tone(420, 0.25, { vol: 0.3, slide: -220 }),
  splash: () => { noise(0.35, { vol: 0.35, freq: 900, q: 0.7 }); noise(0.2, { vol: 0.2, freq: 2600, q: 1, delay: 0.05 }); },
  tube: () => noise(0.4, { vol: 0.22, freq: 300, q: 3, type: 'lowpass' }),
  tubeOut: () => tone(260, 0.16, { type: 'triangle', vol: 0.2, slide: 220 }),
  tap: () => tone(660, 0.05, { type: 'triangle', vol: 0.18 }),
  tick: () => tone(1200, 0.02, { type: 'square', vol: 0.05 }),
  star: i => tone([784, 988, 1175][i] || 1175, 0.22, { type: 'triangle', vol: 0.25 }),
  coin: () => { tone(988, 0.07, { type: 'square', vol: 0.08 }); tone(1319, 0.14, { type: 'square', vol: 0.08, delay: 0.07 }); },
  jingle: w => lookOf(w).jingle.forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.18, delay: i * 0.11 })),
  fanfare: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, { type: 'square', vol: 0.12, delay: i * 0.09 })),
};
function sfx(name, ...args) {
  sfxLog.push(name); if (sfxLog.length > 200) sfxLog.shift();
  if (actx && master && SFX[name]) SFX[name](...args);
}
/* rolling hiss follows ball speed; 0 silences it */
function setRoll(speed) {
  if (rollGain) rollGain.gain.setTargetAtTime(0, actx.currentTime, 0.03);   /* the rolling hiss is gone: the ball rolls quietly */
}

/* ============ 5. RENDER ============ */
/* Course looks register into WORLD_LOOK[n]; anything a look leaves out falls back to DEFAULT_LOOK.
   Hooks a look may set: prop(r) scenery outside the course, post(p, look), mover(m, look),
   decor(group, h), tick(group, dt, t). Colors: felt wall ground sky[2] fog sand ice mud fast water
   push skirt tube flag. */
const WORLD_LOOK = {};
const DEFAULT_LOOK = { felt: '#36803a', wall: '#ffd66e', ground: '#c9a476', sky: ['#9fd8ef', '#fff1d6'], fog: true,
  sand: '#8a6236', ice: '#2f7ea6', mud: '#5b4630', fast: '#3f5f86', water: '#2f86c8', push: '#e9a23b', skirt: '#8a6538', tube: '#ef7d6d',
  flag: '#ef7d6d', jingle: [523, 659, 784, 1047], icon: '' };
const dayOf = w => w > NIGHT ? w - NIGHT : w;
/* a night remix wears its day course's look under a moon: deep sky, dimmer ground, a lit cup */
const NIGHT_SKY = ['#05020f', '#2a0b4d'];
const NEON = ['#ff3df2', '#2ef2ff', '#b6ff2e', '#ffb02e', '#8b5cff'];
const lookOf = w => {
  /* a world's later courses inherit its first course's look and override what they like */
  const d = dayOf(w), day = Object.assign({}, DEFAULT_LOOK, WORLD_LOOK[worldOf(d)], d !== worldOf(d) ? WORLD_LOOK[d] : null);
  if (w <= NIGHT) return day;
  /* night is cosmic bowling: black-light carpet, neon tube walls, a glowing ball, a grid to the horizon */
  return Object.assign(day, { night: true, sky: NIGHT_SKY.slice(), fog: true, felt: '#120b2e', ground: '#06030f', skirt: '#1a0f3d', wall: '#1d1240',
    sand: '#5b2a8f', ice: '#1fd4ff', mud: '#3b1d55', fast: '#d13bff', water: '#2a4dff', push: '#ffb02e', tube: '#b6ff2e', flag: '#ff3df2' });
};
/* what the player has equipped; the pro shop fills these in (see applyGear) */
const GEAR = { ball: { base: '#fffdf7', band: '#ffd66e', mark: '#ef7d6d' }, putter: { head: '#c9ced6', metal: 0.85, shaft: '#d9dde3', grip: '#4a3826', shape: 'blade' } };
let renderer = null, hemi = null, scene, camera, sun, holeGroup = null, ballMesh, flagGroup, moverMeshes = [], flowTex = [];
const camNow = { pos: null, look: null };
const play = { key: null, hole: null, round: null, ball: null, phase: 'idle', time: 0, from: null, t0: 0, aim: 0, swing: null, aimDrag: null,
  overview: false, cam: { yaw: 0 }, fx: {}, lastShot: null };

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1200 / 700, 0.05, 160);
  /* the swing pad covers the right edge, so the picture's centre sits left of the stage's */
  camera.setViewOffset(1200, 700, 60, 0, 1200, 700);
  hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a7360, 1.4); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffe2b8, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 24), new THREE.MeshStandardMaterial({ map: ballTexture(GEAR.ball), bumpMap: dimpleTexture(), bumpScale: 0.6, roughness: 0.32 }));
  ballMesh.castShadow = true;
  scene.add(ballMesh);
  resizeRenderer();
}
function resizeRenderer() {
  if (!renderer) return;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio * stageScale));
  renderer.setSize(1200, 700, false);
}
const mat = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o));
/* seeded so props and textures look the same every visit */
function rng32(seed) { let s = seed >>> 0 || 1; return () => (s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x6d2b79f5 >>> 0) / 4294967296; }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function feltTexture(hex) {
  const t = canvasTex(128, 128, x => {
    const r = rng32(7); x.fillStyle = hex; x.fillRect(0, 0, 128, 128);
    /* mowing stripes, like a real green: two bands per tile, about 33 cm each */
    x.fillStyle = 'rgba(255,255,255,0.045)'; x.fillRect(0, 0, 128, 32); x.fillRect(0, 64, 128, 32);
    for (let i = 0; i < 2600; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'; x.fillRect(r() * 128, r() * 128, 1.5, 1.5); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
/* a toy ball with a band and a star, so the roll reads; colours come from the equipped ball */
function ballTexture(b) {
  return canvasTex(256, 128, x => {
    x.fillStyle = b.base; x.fillRect(0, 0, 256, 128);
    x.fillStyle = b.band; x.fillRect(0, 54, 256, 20);
    x.fillStyle = b.mark; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 9 : 20; x.lineTo(64 + Math.cos(a) * r, 30 + Math.sin(a) * r); }
    x.fill();
  });
}
/* dimples for the ball's bump map: a staggered grid of soft dots */
function dimpleTexture() {
  return canvasTex(256, 128, x => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 128);
    for (let j = 0; j < 12; j++) for (let i = 0; i < 24; i++) {
      const g = x.createRadialGradient(i * 10.7 + (j % 2) * 5.3 + 5, j * 10.7 + 5, 0, i * 10.7 + (j % 2) * 5.3 + 5, j * 10.7 + 5, 4.5);
      g.addColorStop(0, '#888'); g.addColorStop(1, '#fff'); x.fillStyle = g; x.fillRect(i * 10.7 + (j % 2) * 5.3, j * 10.7, 10.7, 10.7);
    }
  });
}
/* ripples for water: scrolled slowly in renderFrame */
function waterTexture(hex) {
  const t = canvasTex(128, 128, x => {
    x.fillStyle = hex; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 3; x.lineCap = 'round';
    const r = rng32(11);
    for (let i = 0; i < 14; i++) { const cx = r() * 128, cy = r() * 128, w = 10 + r() * 18; x.beginPath(); x.moveTo(cx - w, cy); x.quadraticCurveTo(cx, cy - 5, cx + w, cy); x.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/* chevrons for conveyor and fan zones, scrolled along the push in renderFrame */
function flowTexture(hex) {
  const t = canvasTex(64, 64, x => {
    x.fillStyle = hex; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 7; x.lineCap = 'round';
    x.beginPath(); x.moveTo(14, 44); x.lineTo(32, 24); x.lineTo(50, 44); x.stroke();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function skyTexture(top, bottom) {
  return canvasTex(2, 256, x => { const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(1, bottom); x.fillStyle = g; x.fillRect(0, 0, 2, 256); });
}
function holeBounds(h) {
  const pts = h.floors.flat(), xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, ext: Math.max(x1 - x0, z1 - z0) / 2 };
}
/* a grid over the hole's bounding box keeping cells whose centre passes `keep`; vertex heights
   follow groundH so bumps, bowls, tiers and ramps are real geometry */
function gridGeometry(h, keep, lift = 0) {
  const B = holeBounds(h), C = (B.x1 - B.x0) * (B.z1 - B.z0) > 60 ? 0.07 : 0.05;
  const nx = Math.ceil((B.x1 - B.x0) / C), nz = Math.ceil((B.z1 - B.z0) / C);
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = B.x0 + i * C, z = B.z0 + j * C;
    pos.push(x, groundH(h, x, z) + lift, z); uv.push(x * 1.5, z * 1.5);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (!keep(B.x0 + (i + 0.5) * C, B.z0 + (j + 0.5) * C)) continue;
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/* walls stand from below their lowest ground to WALL_TOP over their highest, as the physics measures them */
function wallGroup(h, m) {
  const g = new THREE.Group(); g.name = 'walls';
  h.segs.forEach(([ax, az, bx, bz], i) => {
    const len = Math.hypot(bx - ax, bz - az), top = h.segTop[i][0], lo = Math.min(0, h.segTop[i][1]) - 0.03;
    const w = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, top - lo, len), m);
    w.position.set((ax + bx) / 2, (top + lo) / 2, (az + bz) / 2);
    w.rotation.y = Math.atan2(bx - ax, bz - az);
    w.castShadow = w.receiveShadow = true;
    g.add(w);
  });
  let k = 0;
  for (const wl of h.walls) {
    wl.forEach(([x, z], i) => {
      const near = [k + i - 1, k + i].filter(s => s >= k && s < k + wl.length - 1), top = Math.max(...near.map(s => h.segTop[s][0])), lo = Math.min(0, ...near.map(s => h.segTop[s][1])) - 0.03;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(WALL_HALF, WALL_HALF, top - lo + 0.01, 16), m);
      c.position.set(x, (top + lo) / 2, z); c.castShadow = true; g.add(c);
    });
    k += wl.length - 1;
  }
  return g;
}
/* the sides of every floor, so raised and floating floors read as solid slabs */
function skirtGeometry(h, bottom) {
  const pos = [], idx = [];
  for (const f of h.floors) {
    const cx = f.reduce((a, p) => a + p[0], 0) / f.length, cz = f.reduce((a, p) => a + p[1], 0) / f.length;
    for (let i = 0; i < f.length; i++) {
      const [ax, az] = f[i], [bx, bz] = f[(i + 1) % f.length], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.08));
      for (let k = 0; k <= n; k++) {
        const u = k / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u, d = Math.hypot(cx - x, cz - z) || 1;
        const y = groundH(h, x + (cx - x) / d * 0.02, z + (cz - z) / d * 0.02);
        if (k) { const v = pos.length / 3; idx.push(v - 2, v - 1, v, v - 1, v + 1, v); }
        pos.push(x, y, z, x, Math.min(bottom, y - 0.05), z);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/* a drain's look: three painted spiral arms winding down into it, so the funnel reads at a glance */
function drainSpiral(h, dr) {
  const g = new THREE.Group(), f = dr.flat || DRAIN_FLAT, cols = ['#fffdf7', '#ffd66e', '#fffdf7'];
  for (let k = 0; k < 3; k++) {
    const pos = [], idx = [], N = 140, w = 0.022;
    for (let i = 0; i <= N; i++) {
      const u = i / N, rr = dr.r - (dr.r - f) * u, th = k * 2.094 + u * Math.PI * 3.2, x = dr.x + Math.cos(th) * rr, z = dr.z + Math.sin(th) * rr;
      const nx = Math.cos(th), nz = Math.sin(th);
      for (const sgn of [-1, 1]) { const px = x + nx * w * sgn * (1 - u * 0.5), pz = z + nz * w * sgn * (1 - u * 0.5); pos.push(px, groundH(h, px, pz) + 0.004, pz); }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cols[k], transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.renderOrder = 1; g.add(m);
  }
  g.name = 'drain';
  return g;
}
/* the cup, cut clean: the green is drawn as a grid, which can only cut a ragged square round the
   hole, so the grid stops at COLLAR_R and a fine ring of the same felt (same world UVs, drawn just
   above with polygon offset) runs from there to the exact rim. Inside: a cut band of soil, a white
   plastic liner set just below the surface, a dark floor with a drain, and a soft shadow on the
   green that shows the slight funnel the ball feels. */
const COLLAR_R = 0.26;
function collarGeometry(h) {
  const [cx, cz] = h.cup, N = 96, rings = [CUP_R, CUP_R + 0.02, 0.06 + CUP_R, 0.17, COLLAR_R + 0.07], pos = [], uv = [], idx = [];
  rings.forEach(r => { for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; pos.push(x, groundH(h, x, z) + 0.0015, z); uv.push(x * 1.5, z * 1.5); } });
  for (let k = 0; k + 1 < rings.length; k++) for (let i = 0; i < N; i++) { const a = k * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
function cupGroup(h, look) {
  const g = new THREE.Group(), y = groundH(h, h.cup[0], h.cup[1]);
  g.name = 'cup'; g.position.set(h.cup[0], y, h.cup[1]);
  const SEG = 64, CUT = 0.018;
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R, CUP_R, CUT, SEG, 1, true), mat('#4a3626', { roughness: 1, side: THREE.BackSide })); soil.position.y = -CUT / 2 + 0.001;
  const liner = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R - 0.002, CUP_R - 0.002, CUP_SINK - CUT, SEG, 1, true), mat('#f4f1ea', { roughness: 0.55, side: THREE.BackSide })); liner.position.y = -CUT - (CUP_SINK - CUT) / 2;
  const lip = new THREE.Mesh(new THREE.RingGeometry(CUP_R - 0.006, CUP_R - 0.001, SEG), mat('#ffffff', { roughness: 0.4 })); lip.rotation.x = -Math.PI / 2; lip.position.y = -CUT;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(CUP_R, SEG), mat('#2b2620', { roughness: 1 })); bottom.rotation.x = -Math.PI / 2; bottom.position.y = -CUP_SINK;
  const drain = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), mat('#14110e', { roughness: 1 })); drain.rotation.x = -Math.PI / 2; drain.position.y = -CUP_SINK + 0.001;
  /* the funnel's shadow: a soft dark ring on the green, strongest at the edge */
  const shade = new THREE.Mesh(new THREE.RingGeometry(CUP_R, LIP_PULL_R, SEG), new THREE.MeshBasicMaterial({ map: cupShadeTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  shade.rotation.x = -Math.PI / 2; shade.position.y = 0.0025; shade.renderOrder = 1;
  /* the flagstick stands in the cup until a ball comes near, then it is pulled out and held aside */
  flagGroup = new THREE.Group(); flagGroup.name = 'flag';
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.8, 12), mat('#fffdf7', { roughness: 0.35 })); pole.position.y = 0.3; pole.castShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.05, 12), mat(look.flag, { roughness: 0.4 })); band.position.y = 0.5;
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(0.12, -0.03, 0.22, -0.06); shape.lineTo(0.2, -0.1); shape.quadraticCurveTo(0.1, -0.12, 0, -0.14);
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), mat(look.flag, { side: THREE.DoubleSide, roughness: 0.7 })); flag.position.set(0.007, 0.69, 0); flag.castShadow = true;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), mat('#fffdf7', { roughness: 0.35 })); ball.position.y = 0.705;
  flagGroup.add(pole, band, flag, ball);
  g.add(soil, liner, lip, bottom, drain, shade, flagGroup);
  return g;
}
function cupShadeTexture() {
  /* the ring's UVs are planar, so the fade is a radial gradient: dark at the rim, gone at LIP_PULL_R */
  const k = CUP_R / LIP_PULL_R;
  return canvasTex(256, 256, x => { const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(20,14,8,0.45)'); gr.addColorStop(k, 'rgba(20,14,8,0.45)'); gr.addColorStop(k + (1 - k) * 0.22, 'rgba(20,14,8,0.14)'); gr.addColorStop(1, 'rgba(20,14,8,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); });
}
/* tube mouths and exits: a pair shares a colour; the exit has an arrow showing where the ball comes out */
const TUBE_COLORS = ['#ef7d6d', '#6fc0df', '#ffd66e', '#74c465', '#b7a7e0'];
function tubeGroup(h) {
  const g = new THREE.Group(); g.name = 'tubes';
  h.tubes.forEach((tb, i) => {
    const col = tb.color || TUBE_COLORS[i % TUBE_COLORS.length];
    for (const [end, p] of [['a', tb.a], ['b', tb.b]]) {
      const o = new THREE.Group(); o.position.set(p[0], groundH(h, p[0], p[1]), p[1]);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(TUBE_R * 0.92, 32), mat(end === 'a' ? '#1d150e' : '#3a2c1e', { roughness: 1 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.003;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(TUBE_R, 0.022, 10, 36), mat(col, { roughness: 0.45 })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.012;
      rim.castShadow = true; o.add(hole, rim);
      if (end === 'b') {
        const s = new THREE.Shape(); s.moveTo(-0.05, 0); s.lineTo(0.05, 0); s.lineTo(0, 0.07); s.closePath();
        const arrow = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, toneMapped: false }));
        arrow.rotation.x = Math.PI / 2; arrow.rotation.z = -tb.dir * Math.PI / 180; arrow.position.y = 0.006;
        arrow.position.x = Math.sin(tb.dir * Math.PI / 180) * (TUBE_R + 0.07); arrow.position.z = Math.cos(tb.dir * Math.PI / 180) * (TUBE_R + 0.07);
        o.add(arrow);
      }
      g.add(o);
    }
  });
  return g;
}
function defaultPost(p, look) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 1.08, p.top || 0.22, 24), mat(look.wall, { roughness: 0.5 }));
  m.position.y = (p.top || 0.22) / 2; m.castShadow = true;
  const g = new THREE.Group(); g.add(m); return g;
}
function defaultMover(m, look) {
  const g = new THREE.Group();
  if (m.kind === 'spin') {
    for (let i = 0; i < (m.blades || 1); i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.1, m.len * 2), mat(look.wall, { roughness: 0.5 }));
      arm.position.y = 0.09; arm.rotation.y = i * Math.PI / (m.blades || 1); arm.castShadow = true; g.add(arm);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.24, 20), mat('#ef7d6d', { roughness: 0.5 })); hub.position.y = 0.12;
    hub.castShadow = true; g.add(hub);
  } else if (m.kind === 'gate') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.16, m.len * 2), mat('#ef7d6d', { roughness: 0.5 })); bar.position.y = 0.08;
    bar.castShadow = true; g.add(bar);
  } else {
    const s = new THREE.Mesh(new THREE.SphereGeometry(m.r, 24, 16), mat('#fffdf7', { roughness: 0.6 })); s.castShadow = true; g.add(s);
  }
  return g;
}
function scatterProps(group, h, look) {
  const B = holeBounds(h), x0 = B.x0 - 3, x1 = B.x1 + 3, z0 = B.z0 - 3, z1 = B.z1 + 3;
  const r = rng32([...h.key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  for (let n = 0, tries = 0; n < 26 && tries < 400; tries++) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    if (h.floors.some(f => inPoly(f, x, z)) || h.segs.some(s => { const p = closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - p[0], z - p[1]) < 0.5; })
      || h.floors.some(f => f.some((p, i) => { const q = f[(i + 1) % f.length], c = closestOnSeg(p[0], p[1], q[0], q[1], x, z); return Math.hypot(x - c[0], z - c[1]) < 0.5; }))) continue;
    const o = look.prop(r); o.position.set(x, 0, z); o.rotation.y = r() * Math.PI * 2; group.add(o); n++;
  }
}
function disposeGroup(g) {
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const ms = o.material ? [].concat(o.material) : [];
    for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
  });
}
const holeWorld = h => Number(h.key.split('-')[0]);
function zoneMaterial(zn, look) {
  if (zn.push) {
    const t = flowTexture(look.push); t.center.set(0.5, 0.5); t.rotation = -Math.atan2(zn.push[0], zn.push[1]);
    flowTex.push({ t, speed: Math.hypot(zn.push[0], zn.push[1]) });
    return mat('#ffffff', { map: t, roughness: 0.7 });
  }
  switch (zn.surf) {
    case 'ice': return mat(look.ice, { roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.88 });
    case 'water': { const t = waterTexture(look.water); flowTex.push({ t, speed: 0.25 }); return mat('#ffffff', { map: t, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }); }
    case 'fast': return mat(look.fast, { roughness: 0.35 });
    case 'mud': return mat(look.mud, { roughness: 1 });
    default: return mat(look.sand, { roughness: 1 });
  }
}
function buildHoleScene(h) {
  if (holeGroup) { scene.remove(holeGroup); disposeGroup(holeGroup); }
  if (scene.background && scene.background.dispose) scene.background.dispose();
  flowTex = [];
  const look = lookOf(holeWorld(h)), off = (x, z) => Math.hypot(x - h.cup[0], z - h.cup[1]) >= COLLAR_R && h.tubes.every(t => Math.hypot(x - t.a[0], z - t.a[1]) >= TUBE_R * 0.9);
  holeGroup = new THREE.Group(); moverMeshes = [];
  const floor = new THREE.Mesh(gridGeometry(h, (x, z) => onFloor(h, x, z) && off(x, z)), mat('#ffffff', { map: feltTexture(look.felt), roughness: 0.95 }));
  floor.name = 'floor'; floor.receiveShadow = true; holeGroup.add(floor);
  const collar = new THREE.Mesh(collarGeometry(h), floor.material); collar.name = 'collar'; collar.receiveShadow = true; holeGroup.add(collar);
  for (const zn of h.zones) {
    const z = new THREE.Mesh(gridGeometry(h, (x, zz) => zoneAt(h, x, zz) === zn && onFloor(h, x, zz) && off(x, zz), zn.surf === 'water' ? 0.002 : 0.004), zoneMaterial(zn, look));
    z.receiveShadow = true; holeGroup.add(z);
  }
  const skirt = new THREE.Mesh(skirtGeometry(h, look.ground ? -0.03 : -0.5), mat(look.skirt, { roughness: 0.9, side: THREE.DoubleSide }));
  skirt.name = 'skirt'; holeGroup.add(skirt);
  holeGroup.add(wallGroup(h, mat(look.wall, { roughness: 0.55 })), cupGroup(h, look), tubeGroup(h));
  for (const p of h.posts) { const o = (look.post || defaultPost)(p, look); o.position.set(p.x, groundH(h, p.x, p.z), p.z); holeGroup.add(o); }
  for (const mv of h.movers) { const o = (look.mover || defaultMover)(mv, look); o.userData.mover = mv; moverMeshes.push(o); holeGroup.add(o); }
  if (look.ground) {
    /* drawn first without depth, so bowls that dip below it still show: the ground is backdrop */
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat(look.ground, { roughness: 1, depthWrite: false }));
    gr.rotation.x = -Math.PI / 2; gr.position.y = -0.03; gr.receiveShadow = true; gr.renderOrder = -1; holeGroup.add(gr);
  }
  for (const dr of h.drains) holeGroup.add(drainSpiral(h, dr));
  if (look.prop) scatterProps(holeGroup, h, look);
  if (look.decor) look.decor(holeGroup, h);
  scene.background = skyTexture(look.sky[0], look.sky[1]);
  scene.fog = look.fog ? new THREE.Fog(look.sky[1], 16, 55) : null;
  /* night: moonlight, stars, and a warm lamp in the cup */
  hemi.intensity = look.night ? 0.45 : 1.4; hemi.color.set(look.night ? 0x9a7cff : 0xfff4e0);
  sun.intensity = look.night ? 0.7 : 2.4; sun.color.set(look.night ? 0xb89cff : 0xffe2b8);
  if (look.night) nightDecor(holeGroup, h);
  const B = holeBounds(h), ext = B.ext + 1.5;
  sun.position.set(B.cx + 3, 9, B.cz - 2.5); sun.target.position.set(B.cx, 0, B.cz);
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 0.5, far: 30 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(holeGroup);
  updateMovers(play.time);
}
function updateMovers(t) {
  for (const o of moverMeshes) {
    const m = o.userData.mover, s = moverState(m, t);
    if (m.kind === 'spin') { o.position.set(m.x, groundH(play.hole, m.x, m.z), m.z); o.rotation.y = s.th; }
    else if (m.kind === 'gate') { o.position.set(s.x, groundH(play.hole, s.x, s.z), s.z); o.rotation.y = (m.ang || 0) * Math.PI / 180; }
    else { o.position.set(s.x, groundH(play.hole, s.x, s.z) + m.r, s.z); o.rotation.y = t * 0.8; }
  }
}
const _axis = new THREE.Vector3(), _q = new THREE.Quaternion();
/* the ball mesh follows the physics ball, rolling by the distance it covers; a skidding ball barely turns */
function syncBall(dt) {
  const b = play.ball, p = ballMesh.position, dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
  ballMesh.visible = !b.tube && play.fx.ballHidden !== true;
  if (d > 1e-6 && d < 0.5) { _axis.set(dz / d, 0, -dx / d); _q.setFromAxisAngle(_axis, d / BALL_R * (b.skid > 0 ? 0.35 : 1)); ballMesh.quaternion.premultiply(_q); }
  p.set(b.x, b.y + BALL_R, b.z);
}
/* aiming: behind the ball along the aim, pitched to frame the ball and the ground ahead (the cup
   when the aim is near it). Rolling: chase the ball, turning with it. Overview: the whole hole. */
const AHEAD_MIN = 1.4, AHEAD_MAX = 5.5;
function cameraGoal() {
  const h = play.hole, b = play.ball, B = holeBounds(h);
  if (play.phase === 'title') {
    const yaw = play.time * 0.15, r = Math.max(4.5, B.ext * 1.3);
    return { pos: new THREE.Vector3(B.cx - Math.sin(yaw) * r, 2.6 + B.ext * 0.4, B.cz - Math.cos(yaw) * r), look: new THREE.Vector3(B.cx, 0, B.cz) };
  }
  const over = () => { const hi = Math.max(B.x1 - B.x0, (B.z1 - B.z0) * 1.7) * 0.75 + 2; return { pos: new THREE.Vector3(B.cx, hi, B.cz - hi * 0.3), look: new THREE.Vector3(B.cx, 0, B.cz) }; };
  if (play.overview) return over();
  /* the drop: swoop in low over the lip and look down into the cup */
  if (play.phase === 'sunk' && !reducedMotion()) {
    const [fx, fz] = play.fx.sinkFrom || h.tee, dx = h.cup[0] - fx, dz = h.cup[1] - fz, d = Math.hypot(dx, dz) || 1, cy = groundH(h, ...h.cup);
    return { pos: new THREE.Vector3(h.cup[0] - dx / d * 0.42, cy + 0.36, h.cup[1] - dz / d * 0.42), look: new THREE.Vector3(h.cup[0], cy - 0.08, h.cup[1]) };
  }
  if (play.phase === 'replay') {
    /* low, beside the ball's path, looking across it */
    const r = play.replay, b = r.b, v = Math.hypot(b.vx, b.vz), ux = v > 0.05 ? b.vx / v : 0, uz = v > 0.05 ? b.vz / v : 1;
    const x = b.x - uz * 0.9 * r.side - ux * 0.5, z = b.z + ux * 0.9 * r.side - uz * 0.5;
    return { pos: new THREE.Vector3(x, Math.max(b.y, groundH(h, x, z)) + 0.35, z), look: new THREE.Vector3(b.x, b.y + 0.05, b.z) };
  }
  if (play.intro) {
    /* from high over the cup, swinging round to the tee: eased, then handed to the aim camera */
    const u = Math.min(1, play.intro.t / play.intro.dur), e = u * u * (3 - 2 * u), cy = groundH(h, ...h.cup);
    const from = { pos: new THREE.Vector3(h.cup[0] + 1.2, cy + 2.6 + B.ext * 0.35, h.cup[1] + 1.6), look: new THREE.Vector3(h.cup[0], cy, h.cup[1]) };
    const mid = over(), saved = play.intro; play.intro = null; const to = cameraGoal(); play.intro = saved;
    const a = e < 0.5 ? from : mid, c = e < 0.5 ? mid : to, k = e < 0.5 ? e * 2 : e * 2 - 1, kk = k * k * (3 - 2 * k);
    return { pos: a.pos.clone().lerp(c.pos, kk), look: a.look.clone().lerp(c.look, kk) };
  }
  const aiming = play.phase === 'aim' || play.phase === 'idle';
  if (aiming) play.cam.yaw = play.aim * Math.PI / 180;
  const ux = Math.sin(play.cam.yaw), uz = Math.cos(play.cam.yaw);
  let ahead = 2.2;
  const cdx = h.cup[0] - b.x, cdz = h.cup[1] - b.z, cd = Math.hypot(cdx, cdz);
  if (cd > 0.05 && (cdx * ux + cdz * uz) / cd > Math.cos(35 * Math.PI / 180)) ahead = cd;
  ahead = clamp(ahead, AHEAD_MIN, AHEAD_MAX);
  const by = b.tube ? groundH(h, b.tube.def.b[0], b.tube.def.b[1]) : b.y, bx = b.tube ? b.tube.def.b[0] : b.x, bz = b.tube ? b.tube.def.b[1] : b.z;
  const z = play.camZoom || 0, back = (aiming ? 0.62 + 0.2 * ahead : 1.25) * (1 + z * 0.9), high = (aiming ? 0.6 + 0.27 * ahead : 1.0) * (1 + z * 1.3);
  const pos = new THREE.Vector3(bx - ux * back, by + high, bz - uz * back);
  /* never inside a hill or a raised tier behind the ball */
  pos.y = Math.max(pos.y, groundH(h, pos.x, pos.z) + 0.45);
  if (!aiming) return { pos, look: new THREE.Vector3(bx, by, bz) };
  const ty = groundH(h, bx + ux * ahead, bz + uz * ahead) + (ahead === cd ? 0.4 : 0);
  const aBall = Math.atan2(pos.y - by, back), aFar = Math.atan2(pos.y - ty, back + ahead), pitch = aBall * 0.62 + aFar * 0.38;   /* ball in the lower third, the putter behind it in frame */
  return { pos, look: pos.clone().add(new THREE.Vector3(ux * Math.cos(pitch), -Math.sin(pitch), uz * Math.cos(pitch)).multiplyScalar(3)) };
}
function applyCamera() { camera.position.copy(camNow.pos); camera.lookAt(camNow.look); }
function snapCamera() { const g = cameraGoal(); camNow.pos = g.pos; camNow.look = g.look; applyCamera(); }
function updateCamera(dt) {
  const b = play.ball;
  if ((play.phase === 'roll' || play.phase === 'drift') && Math.hypot(b.vx, b.vz) > 0.5) {
    const want = Math.atan2(b.vx, b.vz);
    let d = want - play.cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    play.cam.yaw += d * (1 - Math.exp(-2.2 * dt));
  }
  const g = cameraGoal(), k = 1 - Math.exp(-(play.intro ? 12 : 4) * dt);
  camNow.pos.lerp(g.pos, k); camNow.look.lerp(g.look, k); applyCamera();
  /* a big landing shakes the camera for a moment */
  const sh = play.fx.shake || 0;
  if (sh > 0.01 && !reducedMotion()) { camera.position.x += Math.sin(play.time * 90) * 0.03 * sh; camera.position.y += Math.cos(play.time * 77) * 0.02 * sh; play.fx.shake = sh * Math.exp(-9 * dt); }
}
function renderFrame(dt) {
  const hs = document.getElementById('hole');
  if (hs.dataset.phase !== play.phase) hs.dataset.phase = play.phase;
  const intro = play.intro ? '1' : '';
  if (hs.dataset.intro !== intro) hs.dataset.intro = intro;
  /* the 2D scenes cover the whole stage: no point drawing a hole behind them */
  if (!play.hole || ['map', 'shop', 'title', 'worlds', 'world'].includes(currentScene)) return;
  updateMovers(play.time);
  for (const f of flowTex) f.t.offset.y -= dt * 0.4 * Math.min(3, f.speed);
  const lk = lookOf(holeWorld(play.hole)); if (lk.tick) lk.tick(holeGroup, dt, play.time);
  syncLost(dt); tickNight(dt, play.time); updateSinkRing(dt);
  syncBall(dt);
  syncGhost();
  updatePuffs(dt);
  updateAimLine();
  updatePutter(dt);
  updateFx(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
}

/* ---- 5b. course looks ---- */
/* Each courses/cNN.look.js sets WORLD_LOOK[n] here (scripts/build.cjs inlines them). */
/* @@COURSES_LOOK@@ */

/* ============ 6. PLAY ============ */
/* The stroke, DS style, on the swing pad: touch, pull down (backswing), push back up through the
   spot you touched (contact). Everything is in stage px and seconds.
     power   = backswing length / SWING_FULL, times tempo, times contact
     tempo   = how fast the putter is moving at contact against a smooth pendulum's speed for
               that backswing (length / TEMPO_T): decelerate and it comes up short, jab and it
               runs. Within +-7% nothing changes; past that, 22% per doubling.
     path    = the forward stroke's sideways drift starts the ball off line (40% of its angle)
     contact = where the face meets the ball: the sideways offset of the crossing from the touch
               point. Off the sweet spot loses energy (quadratic) and twists the face.
   The aim itself is set by dragging the course, nudging with the arrow buttons. */
const SWING_FULL = 240, SWING_DEAD = 16, TEMPO_T = 0.2, FACE_HALF = 40;
/* how forgiving the stroke is. The equipped putter sets these (the pro shop's applyGear); they shape
   only how a gesture becomes (angle, power), never the physics, so every hole's proof still holds. */
const FEEL_BASE = { sweet: 0.18, tempoDead: 0.22, tempoK: 0.18, pathK: 0.5, toeLoss: 0.15, twist: 4 };
const FEEL = Object.assign({}, FEEL_BASE);
const AIM_DEG_PX = 0.12, NUDGE_DEG = 0.25;
const PUTTER_SCALE = 0.83;   /* the club shrank with the ball; it is built full size and scaled */
const PUTTER_BACK_M = 0.36, PUTTER_GAP = 0.006, HEAD_W = 0.17, HEAD_D = 0.052, HEAD_H = 0.042, AIM_LEN = 1.8, AIM_POWER = 0.5;
let loopPaused = false, lastNow = 0, simAcc = 0, aimGroup = null, aimLine = null, aimRing = null, putter = null;

/* pure: a pad gesture's samples [{t, x, y}] (first = the touch) -> the stroke, or null (no contact) */
function computeStroke(samples) {
  if (samples.length < 3) return null;
  const s0 = samples[0];
  let L = 0, k = -1;
  for (let i = 1; i < samples.length; i++) {
    const back = samples[i].y - s0.y;
    L = Math.max(L, back);
    if (L >= SWING_DEAD && back <= 0 && samples[i - 1].y - s0.y > 0) { k = i; break; }
  }
  if (k < 0 || L < SWING_DEAD) return null;
  /* the crossing point, interpolated between the samples either side of the address line */
  const a = samples[k - 1], b = samples[k], u = (a.y - s0.y) / Math.max(1e-6, a.y - b.y);
  const cx = a.x + (b.x - a.x) * u, ct = a.t + (b.t - a.t) * u;
  /* putter speed and direction at contact: over the last ~50 ms of the forward stroke */
  let j = k - 1;
  while (j > 0 && ct - samples[j - 1].t <= 0.05 && samples[j - 1].y - s0.y > 0) j--;
  const p = samples[j], dt = Math.max(0.008, ct - p.t), vx = (cx - p.x) / dt, vy = (p.y - s0.y) / dt;
  const speed = Math.max(1, vy), ideal = L / TEMPO_T, lg = Math.log2(speed / ideal);
  const tempo = Math.sign(lg) * Math.max(0, Math.abs(lg) - FEEL.tempoDead);
  const tempoMul = 1 + FEEL.tempoK * clamp(tempo, -1.5, 1.5);
  const off = (cx - s0.x) / FACE_HALF, offAbs = Math.max(0, Math.abs(off) - FEEL.sweet);
  const contactMul = 1 - FEEL.toeLoss * Math.min(1.5, offAbs) ** 2;
  const path = Math.atan2(vx, Math.max(1, vy)) * 180 / Math.PI;
  const base = Math.min(1, L / SWING_FULL);
  return { length: L, base, tempo: lg, tempoMul, off, contactMul, path,
    power: clamp(base * tempoMul * contactMul, 0, 1), turn: -(FEEL.pathK * path + FEEL.twist * Math.sign(off) * offAbs), clean: offAbs === 0 && tempo === 0 };
}

function initAim() {
  aimGroup = new THREE.Group(); aimGroup.visible = false;
  /* the aim line is a ribbon draped over the ground, so it never cuts through a hill or a wall */
  const n = 110, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((n * 2 + 3) * 3), 3));
  const idx = [];
  for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  idx.push(n * 2, n * 2 + 1, n * 2 + 2);
  geo.setIndex(idx);
  aimLine = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfffdf7, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  aimLine.frustumCulled = false; aimLine.renderOrder = 2; aimLine.userData.n = n;
  aimRing = new THREE.Mesh(new THREE.RingGeometry(BALL_R * 1.6, BALL_R * 2.3, 48, 1, 0, 0.01), new THREE.MeshBasicMaterial({ color: 0xffd66e, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
  aimRing.rotation.x = -Math.PI / 2; aimRing.renderOrder = 2;
  aimGroup.add(aimLine, aimRing);
  scene.add(aimGroup);
}
/* where the aim line runs: the ball's own path for its first AIM_LEN metres, struck at a middling
   pace through the real physics, so it bends with the slopes, bounces off walls and posts (bank
   shots read), and stops at water, a tube mouth, the cup or the floor's edge. Painted just above
   whatever it crosses. Cached until the aim, the ball or the movers change. */
const aimCache = { key: '', pts: [] };
function aimPath(h, b, angDeg, len = AIM_LEN) {
  const t0 = play.hole === h ? play.time : 0, moving = h.movers.length > 0;
  const key = [h.key, b.x.toFixed(4), b.z.toFixed(4), angDeg.toFixed(3), len, moving ? Math.floor(t0 * 8) : 0].join();
  if (aimCache.key === key) return aimCache.pts;
  const s = launch(newBall(h, b.x, b.z), angDeg, AIM_POWER), pts = [], STEP = 0.02;
  let t = t0, went = 0, next = BALL_R * 3, px = s.x, pz = s.z;
  for (let i = 0; i < 2400; i++) {
    const end = stepBall(h, s, t); t += SIM_DT;
    if (s.tube) break;
    went += Math.hypot(s.x - px, s.z - pz); px = s.x; pz = s.z;
    if (went >= next) { pts.push([s.x, (s.air ? s.y : groundH(h, s.x, s.z)) + 0.012, s.z]); next += STEP; }
    /* stop where the ball would nearly die: a line rolling back down a hill only confuses */
    if (end || went >= len || (!s.air && Math.hypot(s.vx, s.vz) < 0.3)) break;
  }
  s.hits.length = 0;
  aimCache.key = key; aimCache.pts = pts;
  return pts;
}
function updateAimLine() {
  const show = play.phase === 'aim' && !play.overview && !b0();
  aimGroup.visible = show;
  if (!show) return;
  const b = play.ball, pts = aimPath(play.hole, b, play.aim), geo = aimLine.geometry, pos = geo.attributes.position, n = aimLine.userData.n, w = 0.012;
  const m = Math.min(pts.length, n);
  /* the ribbon's width follows the path's own heading, so it turns with every bounce */
  const side = i => { const a = pts[Math.max(0, i - 1)], c = pts[Math.min(m - 1, i + 1)], dx = c[0] - a[0], dz = c[2] - a[2], d = Math.hypot(dx, dz) || 1; return [dz / d, -dx / d]; };
  for (let i = 0; i < m; i++) { const [x, y, z] = pts[i], [sx, sz] = side(i); pos.setXYZ(i * 2, x + sx * w, y, z + sz * w); pos.setXYZ(i * 2 + 1, x - sx * w, y, z - sz * w); }
  if (m >= 2) {
    /* arrowhead at the far end, along the last heading */
    const [x, y, z] = pts[m - 1], [sx, sz] = side(m - 1), ux = -sz, uz = sx;
    pos.setXYZ(n * 2, x + sx * w * 3.5, y, z + sz * w * 3.5); pos.setXYZ(n * 2 + 1, x - sx * w * 3.5, y, z - sz * w * 3.5); pos.setXYZ(n * 2 + 2, x + ux * 0.06, y, z + uz * 0.06);
    geo.index.array.fill(0, (m - 1) * 6, (n - 1) * 6);
    for (let i = 0; i < m - 1; i++) geo.index.array.set([i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2], i * 6);
    geo.index.needsUpdate = true;
  }
  aimLine.visible = m >= 2;
  pos.needsUpdate = true; geo.computeBoundingSphere();
  /* the power ring fills with the backswing */
  const sw = play.swing, pw = sw ? Math.min(1, sw.back / SWING_FULL) : 0;
  aimRing.visible = pw > 0.01;
  aimRing.position.set(b.x, b.y + 0.006, b.z);
  if (aimRing.visible) {
    aimRing.geometry.dispose();
    aimRing.geometry = new THREE.RingGeometry(BALL_R * 1.6, BALL_R * 2.3, 48, 1, Math.PI / 2, Math.max(0.01, pw * Math.PI * 2));
    aimRing.material.color.set(pw > 0.85 ? 0xef7d6d : 0xffd66e);
  }
}
const b0 = () => play.ball && play.ball.tube;
function hideAim() { if (aimGroup) aimGroup.visible = false; }

/* ---- the putter ---- */
function buildPutter(gear) {
  const g = new THREE.Group(), metal = { roughness: 0.3, metalness: gear.metal };
  const headGeo = gear.shape === 'mallet' ? new THREE.CylinderGeometry(HEAD_D * 0.9, HEAD_D * 0.9, HEAD_W, 24, 1, false, 0, Math.PI) : new THREE.BoxGeometry(HEAD_W, HEAD_H, HEAD_D);
  const head = new THREE.Mesh(headGeo, mat(gear.head, metal));
  if (gear.shape === 'mallet') { head.rotation.z = Math.PI / 2; head.rotation.y = Math.PI / 2; }
  head.position.set(0, HEAD_H / 2, -HEAD_D / 2); head.castShadow = true; head.name = 'head';
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.002, HEAD_D * 0.7), mat('#ffffff', { roughness: 0.5 })); line.position.set(0, HEAD_H + 0.001, -HEAD_D / 2);
  /* the shaft rises from the heel toward the player's hands, who stands to the side of the line (local +x) */
  const shaft = new THREE.Group(); shaft.position.set(HEAD_W * 0.36, HEAD_H, -HEAD_D * 0.5); shaft.rotation.x = 0.12; shaft.rotation.z = -0.2;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.62, 10), mat(gear.shaft, metal)); rod.position.y = 0.31;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.2, 12), mat(gear.grip, { roughness: 0.9 })); grip.position.y = 0.56;
  rod.castShadow = grip.castShadow = true;
  shaft.add(rod, grip);
  g.add(head, line, shaft);
  g.visible = false;
  /* a left-hander stands on the other side of the line: mirror the whole club */
  g.scale.set((progress.hand === 'L' ? -1 : 1) * PUTTER_SCALE, PUTTER_SCALE, PUTTER_SCALE);
  return g;
}
function setPutter(gear) {
  if (putter) { scene.remove(putter); disposeGroup(putter); }
  putter = buildPutter(gear); scene.add(putter);
}
/* how far back the head can go before it would touch a wall, a post, a cliff or leave the floor */
function putterRoom(h, b, angDeg) {
  const a = angDeg * Math.PI / 180, ux = Math.sin(a), uz = Math.cos(a), px = Math.cos(a), pz = -Math.sin(a);
  const clear = d => {
    for (const dd of [0, HEAD_D]) for (const w of [-HEAD_W / 2, 0, HEAD_W / 2]) {
      const back = BALL_R + PUTTER_GAP + d + dd, x = b.x - ux * back + px * w, z = b.z - uz * back + pz * w;
      if (!onFloor(h, x, z) || Math.abs(groundH(h, x, z) - b.y) > 0.05) return false;
      if (h.segs.some(s => { const p = closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - p[0], z - p[1]) < WALL_HALF + 0.004; })) return false;
      if (h.posts.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 0.004)) return false;
    }
    return true;
  };
  if (!clear(0)) return -1;
  let d = 0;
  while (d < PUTTER_BACK_M * 1.2 && clear(d + 0.01)) d += 0.01;
  return d;
}
/* places the putter: `back` metres behind the address, `side` metres toward the toe, face turned `face` degrees */
function poseputter(back, side, face) {
  const h = play.hole, b = play.ball, a = play.aim * Math.PI / 180, ux = Math.sin(a), uz = Math.cos(a), px = Math.cos(a), pz = -Math.sin(a);
  const r = BALL_R + PUTTER_GAP + back, x = b.x - ux * r + px * side, z = b.z - uz * r + pz * side;
  putter.position.set(x, groundH(h, x, z) + 0.002, z);
  putter.rotation.set(0, a + face * Math.PI / 180, 0);
}
function updatePutter(dt) {
  if (!putter || !play.hole) return;
  const fx = play.fx, b = play.ball;
  if (fx.follow) {
    /* the follow-through: the head carries on along the old line, then lifts away */
    const f = fx.follow; f.t += dt;
    const k = Math.min(1, f.t / 0.18), lift = Math.max(0, f.t - 0.3) * 0.8;
    putter.position.set(f.x + f.ux * f.dist * k, f.y + lift, f.z + f.uz * f.dist * k);
    putter.visible = f.t < 0.7;
    if (f.t >= 0.7) fx.follow = null;
    return;
  }
  if (play.phase !== 'aim' || play.overview || b.tube) { putter.visible = false; return; }
  const room = putterRoom(play.hole, b, play.aim);
  putter.visible = room >= 0;
  if (room < 0) return;
  const sw = play.swing;
  const back = sw ? Math.min(room, Math.min(1.15, sw.back / SWING_FULL) * PUTTER_BACK_M) : Math.min(room, 0.004);
  const side = sw ? clamp((sw.x - sw.sx) / FACE_HALF, -1.5, 1.5) * 0.03 : 0;
  poseputter(back, side, 0);
}

/* ---- aim and swing input ---- */
const stageXY = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / stageScale, (e.clientY - r.top) / stageScale]; };
const evT = e => (e.timeStamp || performance.now()) / 1000;
function onViewDown(e) {
  if (play.phase === 'replay') { endReplay(); return; }
  if (play.intro) { skipIntro(); return; }
  if (play.phase !== 'aim' || play.aimDrag || play.swing) return;
  const [x, y] = stageXY(e);
  play.aimDrag = { id: e.pointerId, x, y, aim0: play.aim, zoom0: play.camZoom || 0, mode: null };
}
function onPadDown(e) {
  e.preventDefault();
  if (play.intro) skipIntro();
  if (play.phase === 'replay') { endReplay(); return; }
  if (play.phase !== 'aim' || play.swing || play.aimDrag || b0()) return;
  if (play.overview) setOverview(false);
  const [x, y] = stageXY(e);
  play.swing = { id: e.pointerId, sx: x, sy: y, x, back: 0, samples: [{ t: evT(e), x, y }] };
  try { swingPad.setPointerCapture(e.pointerId); } catch (err) {}
  sfx('tick'); drawPad();
}
function onMove(e) {
  const d = play.aimDrag;
  if (d && e.pointerId === d.id) {
    /* the first 12 px decide: sideways turns the aim, up or down moves the camera (up = higher and further back) */
    const [x, y] = stageXY(e), dx = x - d.x, dy = y - d.y;
    if (!d.mode && Math.hypot(dx, dy) > 12) d.mode = Math.abs(dy) > Math.abs(dx) * 1.3 ? 'cam' : 'aim';
    if (d.mode === 'aim') play.aim = d.aim0 - dx * AIM_DEG_PX;
    else if (d.mode === 'cam') play.camZoom = clamp(d.zoom0 - dy * 0.006, -0.45, 2.2);
    return;
  }
  const s = play.swing;
  if (!s || e.pointerId !== s.id) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  for (const c of (evs.length ? evs : [e])) {
    const [x, y] = stageXY(c);
    s.samples.push({ t: evT(c), x, y }); s.x = x; s.back = Math.max(0, y - s.sy);
    const st = computeStroke(s.samples);
    if (st) { strike(st); return; }
  }
  drawPad();
}
function onUp(e) {
  if (play.aimDrag && e.pointerId === play.aimDrag.id) { play.aimDrag = null; return; }
  const s = play.swing;
  if (s && e.pointerId === s.id) { play.swing = null; drawPad(); }   /* let go before the ball: no stroke */
}
function onCancel(e) {
  if (play.aimDrag && e.pointerId === play.aimDrag.id) play.aimDrag = null;
  if (play.swing && e.pointerId === play.swing.id) { play.swing = null; drawPad(); }
}
function nudge(dir) { if (play.phase === 'aim') { play.aim -= dir * NUDGE_DEG; sfx('tick'); } }
/* handedness: mirrors the club and puts the swing pad on the player's side of the screen */
function setHand(h) {
  progress.hand = h === 'L' ? 'L' : 'R'; saveProgress();
  if (putter) putter.scale.x = (progress.hand === 'L' ? -1 : 1) * PUTTER_SCALE;
  document.getElementById('hole').classList.toggle('lefty', progress.hand === 'L');
  handR.classList.toggle('on', progress.hand !== 'L'); handL.classList.toggle('on', progress.hand === 'L');
  if (camera) camera.setViewOffset(1200, 700, progress.hand === 'L' ? -60 : 60, 0, 1200, 700);
}
function setOverview(on) { play.overview = on; viewBtn.classList.toggle('on', on); }
/* the putter meets the ball */
function strike(st) {
  const s = play.swing;
  play.swing = null;
  play.lastShot = st;
  play.lastPath = { samples: s.samples.slice(), clean: st.clean };
  const a = play.aim * Math.PI / 180;
  if (putter && putter.visible) play.fx.follow = { t: 0, x: putter.position.x, y: putter.position.y, z: putter.position.z, ux: Math.sin(a), uz: Math.cos(a),
    dist: Math.min(0.14, (MIN_V + (MAX_V - MIN_V) * st.power) * 0.05) };
  beginPutt(play.aim + st.turn, st.power, st.clean);
  drawPad(); drawShot(st);
  return s;
}
/* the swing pad shows only the path your finger drew: where you touched (dot and dashed line),
   the pull back (yellow) and the push through (green, red when the stroke was off). The last
   stroke stays on the pad until the next touch; before the first one, an up-down hint. */
function drawPad() {
  const s = play.swing, path = s ? { samples: s.samples, clean: true } : play.lastPath;
  padPath.classList.toggle('old', !s && !!path);
  swingPad.classList.toggle('swinging', !!s);
  padHint.style.display = path ? 'none' : '';
  if (!path || path.samples.length < 1) { padBack.setAttribute('points', ''); padFwd.setAttribute('points', ''); padStart.setAttribute('cx', -50); padLine.setAttribute('y1', -50); padLine.setAttribute('y2', -50); return; }
  /* stage px -> the pad's own picture: the pad's inner box sits at its border plus 4 px */
  const r = padPath.getBoundingClientRect(), st = stage.getBoundingClientRect();
  const ox = (r.left - st.left) / stageScale, oy = (r.top - st.top) / stageScale, sx = 112 / (r.width / stageScale || 112), sy = 352 / (r.height / stageScale || 352);
  const pt = q => `${((q.x - ox) * sx).toFixed(1)},${((q.y - oy) * sy).toFixed(1)}`;
  const sm = path.samples, s0 = sm[0];
  let k = 0; for (let i = 1; i < sm.length; i++) if (sm[i].y > sm[k].y) k = i;   /* the bottom of the backswing */
  padBack.setAttribute('points', sm.slice(0, k + 1).map(pt).join(' '));
  padFwd.setAttribute('points', sm.slice(k).map(pt).join(' '));
  padFwd.classList.toggle('off', !path.clean);
  padStart.setAttribute('cx', ((s0.x - ox) * sx).toFixed(1)); padStart.setAttribute('cy', ((s0.y - oy) * sy).toFixed(1));
  padLine.setAttribute('y1', ((s0.y - oy) * sy).toFixed(1)); padLine.setAttribute('y2', ((s0.y - oy) * sy).toFixed(1));
}
/* the shot readout: where the ball started against the aim (the marker drifts the way the ball did; the
   green notch is dead on) and the power. One meter: path, strike and face all show up as start line. */
function drawShot(st) {
  shotPanel.classList.add('show');
  const k = clamp(-st.turn / 6, -1, 1);
  shotMark.setAttribute('cx', (110 + k * 92).toFixed(1));
  shotMark.setAttribute('fill', Math.abs(st.turn) < 0.75 ? '#74c465' : Math.abs(st.turn) < 2.5 ? '#ffd66e' : '#ef7d6d');
  shotPower.textContent = Math.round(st.power * 100);
}

function startHole(key, opts = {}) {
  const h = holeAt(key);
  if (!h) return false;
  Object.assign(play, { key, hole: h, round: newRound(h), ball: newBall(h, h.tee[0], h.tee[1]), phase: 'aim', time: 0, from: null, t0: 0, swing: null, aimDrag: null, fx: {}, lastOutcome: null, lastShot: null,
    log: [], undo: null, mulls: 0, touched: false, ghost: null, intro: null, replay: null, camZoom: play.key === key ? play.camZoom : 0,
    practice: !opts.daily && !opts.friend && practiceMode, daily: opts.daily || null, friend: opts.friend || null, lost: null });
  play.aim = h.aim0 !== undefined ? h.aim0 : Math.atan2(h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]) * 180 / Math.PI;
  setOverview(false);
  simAcc = 0;
  for (const k in lastHitSfx) delete lastHitSfx[k];
  buildHoleScene(h);
  hideAim();
  for (const m of trailDots.concat(confetti)) m.visible = false;
  holeDone.classList.remove('show'); shotPanel.classList.remove('show'); play.lastPath = null; holeBanner.classList.remove('show');
  setRead(false); initGhost(h); startLostSearch(h); updateMode(); updateMulligan();
  for (const p of puffs) p.visible = false;
  syncBall(0);
  showScene('hole');
  updateHud(); drawPad();
  snapCamera();
  return true;
}
function goHole(key, opts) {
  sfx('tap'); wipe(); startHole(key, opts); sfx('jingle', dayOf(Number(key.split('-')[0])));
  /* the hole introduces itself: a sweep from over the cup back to the tee, with its number and par */
  if (!reducedMotion()) { play.intro = { t: 0, dur: 2.4 }; snapCamera(); }
  holeBannerN.textContent = key.split('-')[1]; holeBannerPar.textContent = play.hole.par;
  holeBanner.classList.remove('show'); void holeBanner.offsetWidth; holeBanner.classList.add('show');
}
function skipIntro() { if (play.intro) { play.intro = null; holeBanner.classList.remove('show'); } }
function beginPutt(angle, power, clean = true) {
  if (play.phase !== 'aim') return false;
  const b = play.ball;
  skipIntro();
  play.undo = { strokes: play.round.strokes, at: [b.x, b.z], aim: play.aim };
  play.from = [b.x, b.z]; play.t0 = play.time;
  play.log.push([+angle.toFixed(3), +power.toFixed(4), +play.time.toFixed(6)]);
  play.ball = launch(newBall(play.hole, b.x, b.z), angle, power);
  play.phase = 'roll'; play.swing = null; play.aimDrag = null;
  ghostPutt(play.log.length - 1);
  updateMulligan();
  sfx('putt', power, clean ? 1 : 0);
  return true;
}
function tickSim() {
  const h = play.hole;
  stepGhost();
  if (play.phase === 'roll' || play.phase === 'drift') {
    const end = stepBall(h, play.ball, play.time);
    play.time += SIM_DT;
    if (end) endRoll(end);
    return;
  }
  if (play.phase === 'aim' && moverTouch(h, play.ball, play.time)) { play.from = [play.ball.x, play.ball.z]; play.phase = 'drift'; play.swing = null; play.aimDrag = null; hideAim(); drawPad(); }
  play.time += SIM_DT;
}
/* is the cup in plain sight from (x, z): no wall between */
function cupInSight(h, x, z) {
  const [cx, cz] = h.cup, cr = (ax, az, bx, bz, px, pz) => (bx - ax) * (pz - az) - (bz - az) * (px - ax);
  return h.segs.every(([ax, az, bx, bz]) => !(cr(x, z, cx, cz, ax, az) * cr(x, z, cx, cz, bx, bz) < 0 && cr(ax, az, bx, bz, x, z) * cr(ax, az, bx, bz, cx, cz) < 0));
}
function endRoll(end) {
  const r = { end, x: play.ball.x, z: play.ball.z }, h = play.hole;
  const out = play.phase === 'drift' ? resolveDrift(play.round, r, play.from) : resolvePutt(play.round, r, play.from);
  play.lastOutcome = out;
  setRoll(0);
  if (out === 'sunk') {
    play.phase = 'sunk'; play.fx.sunkT = 0; play.fx.sinkFrom = [r.x, r.z]; startSink(play.ball.vx, play.ball.vz); sfx('cup');
    if (play.round.score === 1) { burst(new THREE.Vector3(h.cup[0], groundH(h, ...h.cup) + 0.1, h.cup[1])); sfx('fanfare'); if (!reducedMotion() && play.log.length === 1) play.fx.wantReplay = true; }
  }
  else if (out === 'auto') { play.phase = 'auto'; play.fx.autoT = 0; play.fx.autoFrom = end === 'oob' ? play.from.slice() : [r.x, r.z]; }
  else {
    if (out === 'oob') sfx('boink');
    play.ball = newBall(h, play.round.at[0], play.round.at[1]);
    if (cupInSight(h, play.ball.x, play.ball.z)) play.aim = Math.atan2(h.cup[0] - play.ball.x, h.cup[1] - play.ball.z) * 180 / Math.PI;
    play.phase = 'aim';
  }
  updateHud(); updateMulligan();
}
/* the mulligan: take the last stroke back (ball, count and penalty) for one token. Tokens come
   from lost balls, goals, the daily hole and the pro shop; practice takes them back for free. */
const canMulligan = () => play.phase === 'aim' && !play.daily && !!play.undo && play.round.strokes > 0 && (play.practice || progress.mulligans > 0);
function updateMulligan() {
  mulliganBtn.classList.toggle('show', canMulligan());
  mulliganN.textContent = play.practice ? '\u221e' : progress.mulligans;
}
function mulligan() {
  if (!canMulligan()) return false;
  const u = play.undo;
  if (!play.practice) { progress.mulligans--; saveProgress(); }
  play.round.strokes = u.strokes; play.round.at = u.at.slice(); play.aim = u.aim;
  play.ball = newBall(play.hole, u.at[0], u.at[1]); play.undo = null; play.mulls++; play.log.pop();
  if (play.ghost) play.ghost.k = Math.max(0, play.ghost.k - 1);
  sfx('tubeOut'); updateHud(); updateMulligan();
  return true;
}
/* sounds and squash for what the ball hit since the last frame. A ball riding a wall or a mover
   logs a hit every physics step, so grazes stay silent and each sound plays at most every 60 ms. */
const HIT_SFX_MIN = 0.3, HIT_SFX_GAP = 0.06, lastHitSfx = {};
function hitSfx(name, v) {
  if (v < HIT_SFX_MIN || play.time - (lastHitSfx[name] ?? -1) < HIT_SFX_GAP) return;
  lastHitSfx[name] = play.time; sfx(name, v);
}
function drainHits() {
  for (const [kind, v] of play.ball.hits) {
    if (kind === 'wall' || kind === 'post') { hitSfx('clonk', v); if (play.phase === 'roll') play.touched = true; }
    else if (kind === 'bump' || kind === 'mover') hitSfx('boing', v);
    else if (kind === 'lip') sfx('lip');
    else if (kind === 'land') { hitSfx('land', v); if (v > 0.8) puff(play.ball, 'dust', Math.min(14, 4 + v * 4)); if (v > 1.6) play.fx.shake = Math.min(1, v / 4); }
    else if (kind === 'splash') { sfx('splash'); puff(play.ball, 'water', 22); }
    else if (kind === 'tubeIn') sfx('tube');
    else if (kind === 'tubeOut') { sfx('tubeOut'); puff(play.ball, 'dust', 8); }
    if ((kind === 'wall' || kind === 'post' || kind === 'bump' || kind === 'mover' || kind === 'land') && v > 0.8) play.fx.squash = 1;
  }
  play.ball.hits.length = 0;
}
/* where a sunk ball rests: on the cup floor, toward the side it came in from (the pin is out) */
function restInCup(h, from) {
  const dx = from[0] - h.cup[0], dz = from[1] - h.cup[1], d = Math.hypot(dx, dz) || 1, r = CUP_R - BALL_R - 0.006;
  return [h.cup[0] - dx / d * r * 0.6, h.cup[1] - dz / d * r * 0.6];
}
function advance(dt) {
  if (!play.hole || play.phase === 'idle') return;
  if (play.phase === 'title') { play.time += dt; return; }
  if (play.intro) { play.intro.t += dt; if (play.intro.t >= play.intro.dur) skipIntro(); }
  if (play.phase === 'replay') { advanceReplay(dt); return; }
  /* a slow ball closing on the cup plays in slow motion: only the pacing, never the result */
  const b0b = play.ball, near = ((play.phase === 'roll' || play.phase === 'drift') && !b0b.tube && Math.hypot(b0b.x - play.hole.cup[0], b0b.z - play.hole.cup[1]) < 0.35 && Math.hypot(b0b.vx, b0b.vz) < 1.2)
    || (play.phase === 'sunk' && (play.fx.sunkT || 0) < 0.3);
  play.fx.slow = (play.fx.slow || 1) + ((near && !reducedMotion() ? 0.7 : 1) - (play.fx.slow || 1)) * Math.min(1, dt * 8);
  dt *= play.fx.slow;
  simAcc = Math.min(simAcc + dt, 0.1 + SIM_DT);
  while (simAcc >= SIM_DT) { simAcc -= SIM_DT; tickSim(); }
  drainHits();
  stepLost();
  if (play.phase === 'roll' || play.phase === 'drift') setRoll(play.ball.air || play.ball.tube ? 0 : Math.hypot(play.ball.vx, play.ball.vz));
  const h = play.hole, b = play.ball, cy = groundH(h, h.cup[0], h.cup[1]);
  if (play.phase === 'auto') {
    const t = (play.fx.autoT += dt) / 0.9, k = Math.min(1, t), e = k * k * (3 - 2 * k), [fx, fz] = play.fx.autoFrom;
    b.x = fx + (h.cup[0] - fx) * e; b.z = fz + (h.cup[1] - fz) * e; b.tube = null;
    b.y = groundH(h, b.x, b.z) + Math.sin(k * Math.PI) * 0.12;
    if (k >= 1) { play.phase = 'sunk'; play.fx.sunkT = 0; play.fx.sinkFrom = [fx, fz]; const d = Math.hypot(h.cup[0] - fx, h.cup[1] - fz) || 1; startSink((h.cup[0] - fx) / d * 0.5, (h.cup[1] - fz) / d * 0.5); sfx('cup'); }
  } else if (play.phase === 'sunk') {
    const t = (play.fx.sunkT += dt);
    if (!play.fx.sink) startSink(0, 0);
    stepSink(dt);
    const k = play.fx.sink;
    b.x = h.cup[0] + k.x; b.z = h.cup[1] + k.z; b.y = cy + k.y; b.vx = k.vx; b.vz = k.vz;
    if (t > 1.45) { play.fx.sink = null; if (play.fx.wantReplay) startReplay(); else finishHole(); }
  }
}
/* the drop, drawn (the result was settled when the cup caught the ball): the ball carries its
   pace over the lip, falls, clacks off the white liner, rattles round it and plunks onto the floor
   of a cup drawn deeper than the physics needs. A ring of light pops on the green and the camera
   gives a little nod. Visual only: positions relative to the cup centre. */
function startSink(vx, vz) {
  const b = play.ball, h = play.hole, s = Math.hypot(vx, vz), cap = 1.4, k = s > cap ? cap / s : 1;
  play.fx.sink = { x: clamp(b.x - h.cup[0], -0.05, 0.05), z: clamp(b.z - h.cup[1], -0.05, 0.05), y: 0, vx: vx * k, vz: vz * k, vy: 0, walls: 0, floor: false };
}
function stepSink(dt) {
  const k = play.fx.sink, lim = CUP_R - BALL_R - 0.003, floor = -(CUP_SINK - 0.004);
  for (let n = Math.max(1, Math.round(dt / SIM_DT)); n > 0; n--) {
    const d = dt / Math.max(1, Math.round(dt / SIM_DT));
    k.vy -= G * d; k.x += k.vx * d; k.z += k.vz * d; k.y += k.vy * d;
    const r = Math.hypot(k.x, k.z);
    if (r > lim) {
      const nx = k.x / r, nz = k.z / r, vn = k.vx * nx + k.vz * nz;
      if (vn > 0) {
        k.vx -= 1.5 * vn * nx; k.vz -= 1.5 * vn * nz; k.vx *= 0.9; k.vz *= 0.9;
        if (vn > 0.15 && k.walls < 3) { k.walls++; sfx('rattle', Math.min(1, vn)); }
      }
      k.x = nx * lim; k.z = nz * lim;
    }
    if (k.y < floor) {
      k.y = floor;
      if (k.vy < -0.3) {
        if (!k.floor) {
          k.floor = true; sfx('plunk'); sinkRing(); play.fx.shake = Math.max(play.fx.shake || 0, 0.18);
          const h = play.hole; if (!reducedMotion()) burst(new THREE.Vector3(h.cup[0], groundH(h, ...h.cup) + 0.04, h.cup[1]), 45);
        }
        k.vy = -k.vy * 0.32;
      } else k.vy = 0;
      k.vx *= 1 - Math.min(1, 4 * d); k.vz *= 1 - Math.min(1, 4 * d);
    }
  }
}
let sinkRingMesh = null;
function sinkRing() {
  if (reducedMotion()) return;
  if (!sinkRingMesh) {
    sinkRingMesh = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, depthWrite: false, toneMapped: false }));
    sinkRingMesh.rotation.x = -Math.PI / 2; scene.add(sinkRingMesh);
  }
  const h = play.hole; sinkRingMesh.position.set(h.cup[0], groundH(h, ...h.cup) + 0.006, h.cup[1]);
  sinkRingMesh.userData.t = 0; sinkRingMesh.visible = true;
}
function updateSinkRing(dt) {
  const m = sinkRingMesh;
  if (!m || !m.visible) return;
  const t = (m.userData.t += dt), k = Math.min(1, t / 0.55);
  m.scale.setScalar(CUP_R * (1.1 + k * 3.2)); m.material.opacity = 0.9 * (1 - k);
  if (k >= 1) m.visible = false;
}
/* the ace replay: the same putt again, from a low cinematic angle beside the line, at 70% speed. Any tap skips. */
function startReplay() {
  const h = play.hole, [a, p, t0] = play.log[0];
  play.fx.wantReplay = false;
  play.replay = { b: launch(newBall(h, h.tee[0], h.tee[1]), a, p), t: t0, acc: 0, done: false, side: Math.random() < 0.5 ? 1 : -1 };
  play.ball = play.replay.b; play.phase = 'replay'; holeBanner.classList.remove('show');
  replayTag.classList.add('show');
}
function advanceReplay(dt) {
  const r = play.replay, h = play.hole;
  r.acc += dt * 0.7;
  while (r.acc >= SIM_DT && !r.done) {
    r.acc -= SIM_DT;
    const end = stepBall(h, r.b, r.t); r.t += SIM_DT;
    if (end) { r.done = true; r.end = 0; }
  }
  drainHits();
  if (r.done) {
    r.end += dt;
    const k = Math.min(1, r.end / 0.22), [rx, rz] = restInCup(h, [r.b.x, r.b.z]);
    r.b.x += (rx - r.b.x) * k; r.b.z += (rz - r.b.z) * k; r.b.y = groundH(h, ...h.cup) - (CUP_SINK - 0.004) * k * k;
    if (r.end > 0.9) endReplay();
  }
}
function endReplay() {
  if (play.phase !== 'replay') return;
  replayTag.classList.remove('show');
  play.phase = 'sunk'; play.fx.sunkT = 1.31;
  finishHole();
}
function updateHud() {
  const [, n] = play.key.split('-');
  hudHoleN.textContent = n; hudParN.textContent = play.hole.par; hudStrokesN.textContent = Math.min(play.round.strokes, capOf(play.hole));
}
function finishHole() {
  play.phase = 'done';
  const { key, round, hole } = play;
  /* practice keeps nothing; a daily or friend's hole you have not reached yet counts only for itself */
  const counts = !play.practice && holeUnlocked(progress, key), prev = progress.holes[key];
  if (counts) {
    recordHole(progress, key, round.score, hole.par);
    /* a new best (or a first finish) becomes this hole's ghost, unless the cap rolled it in */
    if (!round.auto && (!prev || round.score <= prev.best) && play.log.length === round.score) {
      progress.ghosts = progress.ghosts && typeof progress.ghosts === 'object' ? progress.ghosts : {};
      progress.ghosts[key] = play.log.slice();
    }
  }
  let won = counts ? onHoleFinished(key, round.score, hole.par) : 0;
  if (!play.practice) won += finishGoals(key, round, hole, counts);
  if (play.daily && !play.practice) won += finishDaily(round.score);
  if (!play.practice) tallyHole(round.score, hole.par); else doneBadge.className = '';
  if (won) showCoinPop(won);
  saveProgress();
  updateMulligan();
  holeDone.classList.toggle('practice', play.practice);
  const stars = starsFor(round.score, hole.par);
  holeDone.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('on', i < stars));
  doneStrokes.textContent = round.score; donePar.textContent = hole.par;
  holeDone.classList.add('show');
  for (let i = 0; i < stars; i++) setTimeout(() => sfx('star', i), 250 + i * 150);
}
/* one animation frame: dt is clamped so a backgrounded tab never jumps */
function stepFrame(now) {
  const dt = lastNow ? Math.min(0.1, Math.max(0, (now - lastNow) / 1000)) : 0;
  lastNow = now;
  if (!loopPaused) advance(dt);
  renderFrame(dt);
  return dt;
}
function frame(now) { stepFrame(now); requestAnimationFrame(frame); }

/* ---- 6b. ghost ball, slope read, particles, wipe ---- */
/* the ghost: your best run of this hole, stroke for stroke. When you strike putt k, the ghost
   strikes its putt k from where its own ball lies, on the same physics, as a see-through ball. */
let ghostMesh = null, readGroup = null, puffs = [];
function initGhost(h) {
  if (!ghostMesh) {
    ghostMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 16), new THREE.MeshBasicMaterial({ color: 0xbfe6f5, transparent: true, opacity: 0.45, depthWrite: false }));
    ghostMesh.renderOrder = 3; scene.add(ghostMesh);
  }
  /* a friend's shared putt (?shot=) rides as a pink ghost instead of your own best */
  const log = play.friend || (progress.ghosts && progress.ghosts[h.key]);
  ghostMesh.material.color.set(play.friend ? 0xf6a6d8 : 0xbfe6f5);
  play.ghost = Array.isArray(log) && log.every(p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite)) ? { log, k: 0, b: newBall(h, h.tee[0], h.tee[1]), live: false, t: 0 } : null;
  ghostMesh.visible = false;
}
function ghostPutt(k) {
  const g = play.ghost;
  if (!g || k >= g.log.length || g.done) return;
  const [a, p, t0] = g.log[k];
  g.b = launch(newBall(play.hole, g.b.x, g.b.z), a, p); g.t = t0; g.live = true; g.k = k + 1;
}
function stepGhost() {
  const g = play.ghost;
  if (!g || !g.live) return;
  const end = stepBall(play.hole, g.b, g.t); g.t += SIM_DT; g.b.hits.length = 0;
  if (end) { g.live = false; if (end === 'sunk') g.done = true; if (end === 'oob') g.b = newBall(play.hole, g.b.x, g.b.z); }
}
function syncGhost() {
  const g = play.ghost;
  ghostMesh.visible = !!g && g.k > 0 && !g.b.tube && !(g.done && !g.live) && play.phase !== 'replay';
  if (ghostMesh.visible) ghostMesh.position.set(g.b.x, g.b.y + BALL_R, g.b.z);
}
/* slope read: arrows over the green pointing downhill, longer and redder where it is steeper */
function setRead(on) {
  if (readGroup) { scene.remove(readGroup); disposeGroup(readGroup); readGroup = null; }
  readBtn.classList.toggle('on', on);
  if (!on || !play.hole) return;
  const h = play.hole, B = holeBounds(h), step = 0.28, s = new THREE.Shape();
  s.moveTo(-0.018, -0.06); s.lineTo(0.018, -0.06); s.lineTo(0.018, 0.02); s.lineTo(0.045, 0.02); s.lineTo(0, 0.07); s.lineTo(-0.045, 0.02); s.lineTo(-0.018, 0.02); s.closePath();
  const geo = new THREE.ShapeGeometry(s); geo.rotateX(Math.PI / 2);
  const spots = [];
  for (let x = B.x0 + step / 2; x < B.x1; x += step) for (let z = B.z0 + step / 2; z < B.z1; z += step) {
    if (!onFloor(h, x, z) || h.segs.some(sg => { const p = closestOnSeg(sg[0], sg[1], sg[2], sg[3], x, z); return Math.hypot(x - p[0], z - p[1]) < 0.12; })) continue;
    const [gx, gz] = groundGrad(h, x, z), m = Math.hypot(gx, gz);
    if (m > 0.012) spots.push([x, z, gx, gz, m]);
  }
  readGroup = new THREE.Group();
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), Math.max(1, spots.length));
  const o = new THREE.Object3D(), c = new THREE.Color();
  spots.forEach(([x, z, gx, gz, m], i) => {
    o.position.set(x, groundH(h, x, z) + 0.012, z);
    o.rotation.set(0, Math.atan2(-gx, -gz), 0);
    o.scale.setScalar(0.7 + Math.min(1.3, m * 6));
    o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
    inst.setColorAt(i, c.setHSL(0.33 - Math.min(0.33, m * 1.6), 0.85, 0.6));
  });
  inst.count = spots.length; inst.renderOrder = 2; inst.frustumCulled = false;
  readGroup.add(inst); scene.add(readGroup);
}
/* puffs: a small pool of dust and water particles for landings, splashes and tube exits */
function initPuffs() {
  const geo = new THREE.SphereGeometry(0.018, 8, 6);
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.userData = { life: 0, v: new THREE.Vector3() }; scene.add(m); puffs.push(m);
  }
}
function puff(b, kind, n) {
  if (reducedMotion()) return;
  const col = kind === 'water' ? 0x9fd8ef : new THREE.Color(lookOf(holeWorld(play.hole)).skirt).lerp(new THREE.Color(0xfff8ec), 0.55).getHex();
  for (let i = 0, k = 0; i < puffs.length && k < n; i++) {
    const m = puffs[i]; if (m.visible) continue;
    const a = Math.random() * Math.PI * 2, sp = kind === 'water' ? 0.6 + Math.random() * 0.8 : 0.25 + Math.random() * 0.35;
    m.position.set(b.x, b.y + 0.02, b.z); m.visible = true; m.material.color.setHex(col);
    m.userData.life = m.userData.max = 0.5 + Math.random() * 0.3;
    m.userData.v.set(Math.cos(a) * sp, (kind === 'water' ? 1.6 : 0.5) + Math.random() * 0.6, Math.sin(a) * sp);
    k++;
  }
}
function updatePuffs(dt) {
  for (const m of puffs) if (m.visible) {
    const u = m.userData; u.life -= dt;
    if (u.life <= 0) { m.visible = false; continue; }
    u.v.y -= 3.5 * dt; m.position.addScaledVector(u.v, dt);
    const k = u.life / u.max; m.material.opacity = k * 0.8; m.scale.setScalar(1.6 - k * 0.8);
  }
}
/* the iris wipe between scenes: decoration only, the scene has already switched underneath */
function wipe() {
  if (reducedMotion()) return;
  wipeEl.classList.remove('go'); void wipeEl.offsetWidth; wipeEl.classList.add('go');
}


/* ---- 6c. extras: modes, lost balls, goals, the daily hole, shot codes, night ---- */
let practiceMode = false, mapNight = false;
/* save fields this section owns: mulligans (tokens), lost (key -> 1), obj (key -> goal bits), daily */
function repairExtras(p) {
  if (!Number.isInteger(p.mulligans) || p.mulligans < 0) p.mulligans = 5;
  p.mulligans = Math.min(p.mulligans, 9999);
  const keyed = (o, ok) => { const out = {}; if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (/^\d+-\d+$/.test(k) && ok(v)) out[k] = v; return out; };
  p.lost = keyed(p.lost, v => v === 1);
  p.obj = keyed(p.obj, v => Number.isInteger(v) && v >= 1 && v <= 7);
  const t = p.tally || {};
  p.tally = Object.fromEntries(['birdie', 'eagle', 'alb', 'ace'].map(k => [k, Number.isInteger(t[k]) && t[k] >= 0 ? t[k] : 0]));
  const d = p.daily;
  p.daily = d && typeof d.d === 'string' && /^\d{4}-\d\d-\d\d$/.test(d.d) && Number.isInteger(d.best) && d.best >= 1 && Number.isInteger(d.streak) && d.streak >= 1
    ? { d: d.d, best: d.best, streak: d.streak } : null;
}
const addCoins = n => { progress.coins = Math.min(COIN_MAX, (progress.coins || 0) + n); return n; };

/* the mode chip: practice (a target), the daily hole (a calendar), a friend's putt (their score) */
const MODE_ICONS = {
  practice: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#fffdf7" stroke="#ef7d6d" stroke-width="6"/><circle cx="32" cy="32" r="15" fill="none" stroke="#ef7d6d" stroke-width="6"/><circle cx="32" cy="32" r="5" fill="#ef7d6d"/></svg>',
  daily: '<svg viewBox="0 0 64 64"><rect x="8" y="12" width="48" height="44" rx="8" fill="#fffdf7" stroke="#a8804e" stroke-width="5"/><path d="M8 24 H56" stroke="#ef7d6d" stroke-width="10"/><path d="M20 6 V16 M44 6 V16" stroke="#a8804e" stroke-width="5" stroke-linecap="round"/></svg>',
  friend: '<svg viewBox="0 0 64 64"><path d="M12 56 V28 A20 20 0 0 1 52 28 V56 L45 50 L38 56 L32 50 L26 56 L19 50 Z" fill="#fffdf7" stroke="#d38bbf" stroke-width="4" stroke-linejoin="round"/><circle cx="25" cy="30" r="4" fill="#4a3826"/><circle cx="39" cy="30" r="4" fill="#4a3826"/></svg>',
};
function updateMode() {
  const m = play.practice ? 'practice' : play.daily ? 'daily' : play.friend ? 'friend' : '';
  hudMode.className = 'chip' + (m ? ' show ' + m : '');
  if (!m) return;
  hudMode.querySelector('.ic').innerHTML = MODE_ICONS[m];
  hudModeN.textContent = m === 'friend' ? (friendScore(play.hole, play.friend) || '') : m === 'daily' && progress.daily && progress.daily.d === play.daily ? progress.daily.best : '';
}

/* lost balls: one gold ball per hole, resting somewhere off the obvious line. Its spot is where
   some putt from the tee really stops, so it is always reachable; roll over it to keep it. */
const LOST_SHOTS = [], LOST_CACHE = {}, LOST_R = 0.1;
for (let a = 0; a < 360; a += 10) for (const pw of [0.18, 0.3, 0.45, 0.62, 0.8]) LOST_SHOTS.push([a, pw]);
let lostMesh = null;
function lostScore(h, x, z) {
  const d = (ax, az, bx, bz) => { const q = closestOnSeg(ax, az, bx, bz, x, z); return Math.hypot(x - q[0], z - q[1]); };
  if (!onFloor(h, x, z) || zoneAt(h, x, z)) return -1;
  if (Math.hypot(x - h.cup[0], z - h.cup[1]) < 0.9 || Math.hypot(x - h.tee[0], z - h.tee[1]) < 1) return -1;
  if (h.segs.some(sg => d(...sg) < BALL_R + WALL_HALF + 0.06)) return -1;
  if (h.posts.some(q => Math.hypot(x - q.x, z - q.z) < q.r + 0.16)) return -1;
  if (h.tubes.some(t => [t.a, t.b].some(e => Math.hypot(x - e[0], z - e[1]) < TUBE_R + 0.16))) return -1;
  if (h.movers.some(m => m.kind === 'spin' ? Math.hypot(x - m.x, z - m.z) < m.len + 0.2 : d(m.ax, m.az, m.bx, m.bz) < (m.kind === 'gate' ? m.len : m.r) + 0.2)) return -1;
  const y = groundH(h, x, z);
  for (let a = 0; a < 6.28; a += 0.8) if (Math.abs(groundH(h, x + Math.cos(a) * 0.12, z + Math.sin(a) * 0.12) - y) > 0.012) return -1;
  return d(h.tee[0], h.tee[1], h.cup[0], h.cup[1]);
}
function lostStep(L) {
  const [a, pw] = LOST_SHOTS[L.i++], h = L.h, r = simulatePutt(h, h.tee, a, pw, 0);
  if (r.end === 'stop') { const sc = lostScore(h, r.x, r.z); if (sc > L.score) { L.score = sc; L.spot = [r.x, r.z]; } }
  if (L.i >= LOST_SHOTS.length) { L.done = true; LOST_CACHE[h.key] = L.spot; }
}
function startLostSearch(h) {
  play.lost = play.practice ? null : { h, i: 0, score: 0.25, spot: null, done: false, got: !!progress.lost[h.key] };
  if (play.lost && h.key in LOST_CACHE) Object.assign(play.lost, { spot: LOST_CACHE[h.key], done: true });
}
const lostSpot = h => { const L = { h, i: 0, score: 0.25, spot: null, done: false }; if (h.key in LOST_CACHE) return LOST_CACHE[h.key]; while (!L.done) lostStep(L); return L.spot; };
/* the search runs a few putts a frame (a few ms at most); the pick-up check runs every frame */
function stepLost() {
  const L = play.lost;
  if (!L) return;
  if (!L.done) { const until = performance.now() + 4; while (!L.done && performance.now() < until) lostStep(L); }
  const b = play.ball;
  if (L.done && L.spot && !L.got && (play.phase === 'roll' || play.phase === 'drift') && !b.tube && !b.air && Math.hypot(b.x - L.spot[0], b.z - L.spot[1]) < LOST_R) {
    L.got = true; progress.lost[play.key] = 1; progress.mulligans++; addCoins(15); saveProgress();
    sfx('coin'); setTimeout(() => sfx('star', 2), 120); puff({ x: L.spot[0], y: b.y, z: L.spot[1] }, 'dust', 14);
    lostPop.classList.remove('show'); void lostPop.offsetWidth; lostPop.classList.add('show');
    setTimeout(() => lostPop.classList.remove('show'), 1600);
    updateMulligan(); renderWallet();
  }
}
function syncLost(dt) {
  if (!lostMesh) {
    lostMesh = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc94a, metalness: 0.7, roughness: 0.28, emissive: 0x5a3a00 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 0.9, 20, 14), gold);
    ball.castShadow = true; lostMesh.add(ball);
    const ring = new THREE.Mesh(new THREE.RingGeometry(BALL_R * 1.3, BALL_R * 1.75, 24), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.name = 'ring'; lostMesh.add(ring);
    scene.add(lostMesh);
  }
  const L = play.lost, on = !!(L && L.done && L.spot && !L.got) && play.phase !== 'title' && play.phase !== 'replay';
  lostMesh.visible = on;
  if (!on) return;
  const y = groundH(play.hole, ...L.spot), t = reducedMotion() ? 0 : play.time;
  lostMesh.position.set(L.spot[0], y, L.spot[1]);
  lostMesh.children[0].position.y = BALL_R * 0.55 + Math.sin(t * 2.4) * 0.01;
  lostMesh.children[0].rotation.y = t * 1.5;
  const ring = lostMesh.children[1]; ring.position.y = 0.004; ring.scale.setScalar(1 + (Math.sin(t * 3) + 1) * 0.15);
}
/* three goals per hole: under par, no wall touched, its lost ball found. Each first time pays 10;
   all three pays a mulligan token. */
function finishGoals(key, round, hole) {
  const L = play.lost;
  if (L && !L.done) while (!L.done) lostStep(L);
  const noLost = L ? L.done && !L.spot : !lostSpot(hole);
  const bits = (round.score < hole.par ? 1 : 0) | (!play.touched && !round.auto ? 2 : 0) | (progress.lost[key] || noLost ? 4 : 0);
  const prev = progress.obj[key] | 0, fresh = bits & ~prev, all = prev | bits;
  if (all) progress.obj[key] = all;
  if (all === 7 && prev !== 7) progress.mulligans++;
  doneObj.querySelectorAll('.obj').forEach((o, i) => { o.classList.toggle('on', !!(all & (1 << i))); o.classList.toggle('new', !!(fresh & (1 << i))); });
  return addCoins(10 * ((fresh & 1) + ((fresh >> 1) & 1) + ((fresh >> 2) & 1)));
}

/* the daily hole: the same hole for everyone on a date, from all ten courses. First finish of the
   day pays 25 and a token; days in a row grow the streak. */
const dayStr = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function dailyKey(ds) {
  let x = 2166136261;
  for (const c of ds) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; }
  const keys = allCourses().flatMap(w => WORLDS[w].holes.slice(2).map(h => h.key));
  return keys[x % keys.length];
}
function finishDaily(score) {
  const ds = play.daily, d = progress.daily, y = new Date(); y.setDate(y.getDate() - 1);
  if (d && d.d === ds) { d.best = Math.min(d.best, score); return 0; }
  progress.daily = { d: ds, best: score, streak: d && d.d === dayStr(y) ? d.streak + 1 : 1 };
  progress.mulligans++;
  return addCoins(25);
}
function renderDaily() {
  const ds = dayStr(), d = progress.daily, y = new Date(); y.setDate(y.getDate() - 1);
  const key = dailyKey(ds), [c, n] = key.split('-').map(Number), w = worldOf(c);
  dailyWorld.innerHTML = lookOf(w).icon || ''; dailyHole.textContent = n;
  dailyPips.innerHTML = '<i></i>'.repeat(coursesOf(w).indexOf(c) + 1);
  dailyBtn.classList.toggle('done', !!d && d.d === ds);
  const live = d && (d.d === ds || d.d === dayStr(y));
  dailyStreakN.textContent = live ? d.streak : '';
  dailyStreak.classList.toggle('show', !!live);
}

/* shot codes: a finished hole's putts as a link (?shot=1-7_12.5~0.62~0_...). Opening one plays
   that hole against the putts as a ghost. Only unreserved URL characters, nothing to escape. */
const encodeShot = (key, log) => key + '_' + log.map(e => e.join('~')).join('_');
function decodeShot(code) {
  if (typeof code !== 'string' || code.length > 800) return null;
  const [key, ...parts] = code.split('_'), h = holeAt(key);
  if (!h || !parts.length || parts.length > capOf(h)) return null;
  const log = parts.map(e => e.split('~').map(Number));
  return log.every(e => e.length === 3 && e.every(Number.isFinite) && e[1] >= 0 && e[1] <= 1 && e[2] >= 0 && e[2] < 600) ? { key, log } : null;
}
function friendScore(h, log) {
  let at = h.tee, n = 0;
  for (const [a, pw, t0] of log) {
    const r = simulatePutt(h, at, a, pw, t0);
    n++;
    if (r.end === 'sunk') return n;
    if (r.end === 'oob') n++; else at = [r.x, r.z];
  }
  return null;
}

/* night: cosmic bowling. Neon tube walls with a soft additive halo, a black-light carpet whose
   paint splatters glow, a neon grid to the horizon, a glowing ball, a cyan lamp in the cup,
   stars, and neon shapes drifting round the course. */
function glowTexture() {
  return canvasTex(64, 64, x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
}
function neonCarpet() {
  const t = canvasTex(256, 256, x => {
    const r = rng32(11); x.fillStyle = '#120b2e'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; x.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (let i = 0; i < 18; i++) {
      const c = NEON[i % NEON.length], cx = r() * 256, cy = r() * 256, k = r();
      x.strokeStyle = c; x.fillStyle = c; x.lineWidth = 2.5 + r() * 1.5; x.globalAlpha = 0.6;
      if (k < 0.3) { x.beginPath(); x.arc(cx, cy, 6 + r() * 10, 0, Math.PI * 2); x.stroke(); }
      else if (k < 0.55) { x.beginPath(); x.moveTo(cx, cy); for (let j = 1; j < 5; j++) x.lineTo(cx + j * 7, cy + (j % 2 ? -8 : 8)); x.stroke(); }
      else if (k < 0.75) { x.beginPath(); for (let j = 0; j < 3; j++) { const a = r() * 0 + j * 2.094 + i; x.lineTo(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11); } x.closePath(); x.stroke(); }
      else { x.beginPath(); x.arc(cx, cy, 2 + r() * 3, 0, Math.PI * 2); x.fill(); }
    }
    x.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function neonGrid() {
  const t = canvasTex(128, 128, x => { x.fillStyle = '#06030f'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#ff3df2'; x.globalAlpha = 0.55; x.lineWidth = 3; x.strokeRect(1.5, 1.5, 125, 125); });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); return t;
}
let ballHalo = null;
function nightDecor(group, h) {
  const B = holeBounds(h), pos = [], r = rng32(7);
  /* the carpet: the floor's felt becomes black-light paint */
  const floor = group.getObjectByName('floor');
  if (floor) { const t = neonCarpet(); floor.material.map.dispose(); floor.material.map = t; floor.material.emissiveMap = t; floor.material.emissive.set('#ffffff'); floor.material.emissiveIntensity = 0.8; floor.material.color.set('#ffffff'); }
  /* neon tube walls: each wall line its own colour, glowing, inside a soft halo */
  const walls = group.getObjectByName('walls'), mats = NEON.map(c => mat('#160c33', { emissive: c, emissiveIntensity: 0.95, roughness: 0.4 }));
  const halos = NEON.map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
  if (walls) {
    const old = walls.children[0] && walls.children[0].material;
    let seg = 0;
    const lineOf = []; h.walls.forEach((wl, li) => { for (let i = 0; i + 1 < wl.length; i++) lineOf[seg++] = li; });
    const boxes = walls.children.filter(c => c.geometry.type === 'BoxGeometry'), caps = walls.children.filter(c => c.geometry.type !== 'BoxGeometry');
    boxes.forEach((w, i) => {
      const k = lineOf[i] % NEON.length; w.material = mats[k];
      const halo = new THREE.Mesh(w.geometry, halos[k]); halo.position.copy(w.position); halo.rotation.copy(w.rotation); halo.scale.set(2.6, 1.15, 1.02); halo.name = 'halo'; walls.add(halo);
    });
    let ci = 0; h.walls.forEach((wl, li) => wl.forEach(() => { if (caps[ci]) caps[ci].material = mats[li % NEON.length]; ci++; }));
    if (old) old.dispose();
  }
  /* the grid to the horizon */
  group.children.forEach(c => { if (c.isMesh && c.geometry.type === 'PlaneGeometry' && c.renderOrder === -1) { const t = neonGrid(); c.material.map = t; c.material.emissiveMap = t; c.material.emissive.set('#ffffff'); c.material.emissiveIntensity = 0.9; c.material.color.set('#ffffff'); } });
  /* zones glow in their own colour */
  group.children.forEach(c => { if (c.isMesh && c.material && c.material.emissive && c.name === '' && c.geometry.type === 'BufferGeometry' && c.material.color) { c.material.emissive.copy(c.material.color); c.material.emissiveIntensity = Math.max(c.material.emissiveIntensity || 0, 0.35); } });
  for (let i = 0; i < 420; i++) {
    const th = r() * Math.PI * 2, ph = 0.12 + r() * 1.3, R = 70;
    pos.push(B.cx + Math.cos(th) * Math.cos(ph) * R, Math.sin(ph) * R, B.cz + Math.sin(th) * Math.cos(ph) * R);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  group.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.4, fog: false })));
  const y = groundH(h, ...h.cup);
  const lamp = new THREE.PointLight(0x2ef2ff, 2.6, 3.2, 1.6); lamp.position.set(h.cup[0], y + 0.3, h.cup[1]); group.add(lamp);
  const glow = new THREE.Mesh(new THREE.RingGeometry(CUP_R + 0.004, CUP_R + 0.045, 40), new THREE.MeshBasicMaterial({ color: 0x2ef2ff, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(h.cup[0], y + 0.003, h.cup[1]); glow.name = 'cupGlow'; group.add(glow);
  /* neon shapes drifting round the course, out of the way of play */
  const drift = new THREE.Group(); drift.name = 'neonDrift';
  for (let i = 0; i < 9; i++) {
    const c = NEON[i % NEON.length], m = new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    const geo = i % 3 === 0 ? new THREE.TorusGeometry(0.45, 0.05, 8, 32) : i % 3 === 1 ? new THREE.TorusGeometry(0.35, 0.05, 3, 3) : new THREE.TorusGeometry(0.3, 0.05, 8, 4);
    const o = new THREE.Mesh(geo, m), a = i / 9 * Math.PI * 2, d = B.ext + 2.5 + r() * 2;
    o.position.set(B.cx + Math.cos(a) * d, 1.4 + r() * 2.2, B.cz + Math.sin(a) * d); o.userData.spin = 0.3 + r() * 0.6;
    drift.add(o);
  }
  group.add(drift);
}
/* per frame at night: the ball glows, the cup ring and wall halos breathe, the shapes turn */
function tickNight(dt, t) {
  const on = !!(holeGroup && holeGroup.getObjectByName('neonDrift'));
  if (!ballHalo) {
    ballHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xd8f6ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ballHalo.scale.setScalar(BALL_R * 12); ballMesh.add(ballHalo);
  }
  ballHalo.visible = on;
  ballMesh.material.emissive.set(on ? 0x9a9ab0 : 0x000000);
  if (!on || reducedMotion()) return;
  const k = 0.5 + 0.5 * Math.sin(t * 2.2);
  const glow = holeGroup.getObjectByName('cupGlow'); if (glow) glow.material.opacity = 0.7 + 0.3 * k;
  for (const o of holeGroup.getObjectByName('neonDrift').children) { o.rotation.x += dt * o.userData.spin; o.rotation.y += dt * o.userData.spin * 0.7; }
}

/* the tracker: birdies, eagles, albatrosses and aces, counted for life, and the best on every
   `crazy` hole of a world. Wordless: a bird for each, bigger birds for rarer scores. */
const BIRD_SVG = {
  birdie: '<svg viewBox="0 0 64 64"><ellipse cx="30" cy="38" rx="18" ry="13" fill="#6fc0df"/><circle cx="43" cy="24" r="10" fill="#6fc0df"/><path d="M51 22 L60 25 L51 28 Z" fill="#ffb347"/><circle cx="45" cy="22" r="2.5" fill="#2f241a"/><path d="M16 34 Q28 24 36 36 Q26 44 16 34 Z" fill="#4a94b5"/><path d="M13 40 L4 34 L6 45 Z" fill="#4a94b5"/></svg>',
  eagle: '<svg viewBox="0 0 64 64"><path d="M2 26 Q18 10 30 26 Q42 10 62 26 Q48 24 40 34 L24 34 Q16 24 2 26 Z" fill="#a8804e"/><ellipse cx="32" cy="38" rx="9" ry="12" fill="#8a6538"/><circle cx="32" cy="24" r="7" fill="#fffdf7"/><path d="M32 26 L38 30 L32 32 Z" fill="#ffd66e"/><circle cx="34" cy="22" r="1.8" fill="#2f241a"/><path d="M27 50 L32 58 L37 50 Z" fill="#8a6538"/></svg>',
  alb: '<svg viewBox="0 0 64 64"><path d="M0 30 Q14 22 28 30 L36 30 Q50 22 64 30 Q50 34 36 36 L28 36 Q14 34 0 30 Z" fill="#fffdf7" stroke="#7d6bb8" stroke-width="3"/><ellipse cx="32" cy="34" rx="10" ry="6" fill="#fffdf7" stroke="#7d6bb8" stroke-width="3"/><circle cx="42" cy="30" r="5" fill="#fffdf7" stroke="#7d6bb8" stroke-width="3"/><path d="M46 30 L56 32 L46 34 Z" fill="#ffd66e"/><path d="M2 30 L10 29 M54 29 L62 30" stroke="#2f241a" stroke-width="3"/></svg>',
  ace: '<svg viewBox="0 0 64 64"><path d="M22 58 V8" stroke="#8a7360" stroke-width="5" stroke-linecap="round"/><path d="M24 9 L54 19 L24 29 Z" fill="#ef7d6d"/><ellipse cx="34" cy="56" rx="20" ry="6" fill="#5a4634"/><circle cx="44" cy="44" r="8" fill="#fffdf7" stroke="#e6d2ab" stroke-width="3"/><path d="M50 34 L54 28 M44 32 V25 M38 34 L34 28" stroke="#ffd66e" stroke-width="4" stroke-linecap="round"/></svg>',
};
const BIRD_KINDS = ['birdie', 'eagle', 'alb', 'ace'];
const birdFor = (score, par) => par - score >= 3 ? 'alb' : par - score === 2 ? 'eagle' : par - score === 1 ? 'birdie' : null;
function tallyHole(score, par) {
  const t = progress.tally = Object.assign({ birdie: 0, eagle: 0, alb: 0, ace: 0 }, progress.tally), b = birdFor(score, par);
  if (b) t[b]++;
  if (score === 1) t.ace++;
  /* the badge on the done card: the bird, then the score against par */
  doneBadge.className = b ? 'show ' + b : '';
  doneBadge.innerHTML = b ? BIRD_SVG[b] + `<span>${score - par}</span>` : '';
  if (b) setTimeout(() => sfx(b === 'birdie' ? 'star' : 'fanfare', 2), 380);
}
function openTracker() {
  sfx('tap');
  const t = Object.assign({ birdie: 0, eagle: 0, alb: 0, ace: 0 }, progress.tally);
  trackTotals.innerHTML = BIRD_KINDS.map(k => `<div class="tt ${k}" aria-label="${k}">${BIRD_SVG[k]}<span>${t[k]}</span></div>`).join('');
  const w = worldOf(dayOf(mapWorld)), night = mapNight ? NIGHT : 0, cells = [];
  coursesOf(w).forEach((c, ci) => WORLDS[c].holes.forEach((h, i) => {
    if (!h.crazy) return;
    const key = (night + c) + '-' + (i + 1), r = progress.holes[key], b = r && (r.best === 1 && !birdFor(1, h.par) ? 'ace' : birdFor(r.best, h.par));
    cells.push(`<div class="tc${b ? ' ' + b : ''}${h.auto ? ' auto' : ''}" aria-label="course ${ci + 1} hole ${i + 1}"><span class="pips">${'<i></i>'.repeat(ci + 1)}</span><span class="n">${i + 1}</span>${b ? BIRD_SVG[b] : `<span class="best">${r ? r.best + '/' + h.par : h.par}</span>`}</div>`);
  }));
  trackGrid.innerHTML = cells.join('');
  tracker.classList.add('show');
}

function initExtras() {
  practiceBtn.addEventListener('click', () => { sfx('tap'); practiceMode = !practiceMode; renderMap(); });
  dailyBtn.addEventListener('click', () => { const ds = dayStr(); goHole(dailyKey(ds), { daily: ds }); });
  trophyBtn.addEventListener('click', openTracker);
  trackClose.addEventListener('click', () => { sfx('tap'); tracker.classList.remove('show'); });
}

/* ============ 7. SCENES ============ */
const STAR_SVG = '<svg class="star" viewBox="0 0 64 64"><path d="M32 4 L40 23 L60 24 L44 37 L50 58 L32 46 L14 58 L20 37 L4 24 L24 23 Z"/></svg>';
const MOON_SVG = '<svg class="moon" viewBox="0 0 64 64" aria-hidden="true"><path d="M40 8 A24 24 0 1 0 56 42 A20 20 0 0 1 40 8 Z" fill="#ffd66e" stroke="#dca63f" stroke-width="4"/></svg>';
const CRAZY_SVG = '<svg class="crazy" viewBox="0 0 64 64" aria-hidden="true"><path d="M36 2 L12 36 H30 L24 62 L52 24 H34 Z" fill="#ffd66e" stroke="#c95a4c" stroke-width="4" stroke-linejoin="round"/></svg>';
const LOCK_SVG = '<svg class="lock" viewBox="0 0 64 64"><rect x="12" y="28" width="40" height="30" rx="6" fill="#a3916d"/><path d="M20 28 V20 A12 12 0 0 1 44 20 V28" fill="none" stroke="#a3916d" stroke-width="7"/></svg>';
/* 18 holes in a snake: left to right along the top row, back along the bottom */
const NODE_POS = Array.from({ length: HOLES_PER }, (_, i) => i < 9 ? [130 + i * 117, 310] : [1066 - (i - 9) * 117, 550]);
let mapWorld = 1;

/* the title flies round each course's showpiece 18th in turn; the strip below picks a course */
const titleCourse = 0;
function showTitle() {
  const list = playable(), w = list[titleCourse % list.length], hs = WORLDS[w].holes, key = hs[hs.length - 1].key;
  if (!play.hole || play.key !== key) startHole(key);
  play.phase = 'title';
  showScene('title');
  renderTitleStrip(w); renderDaily();
}
function renderTitleStrip(cur) {
  titleStrip.innerHTML = '';
  for (const w of WORLD_ORDER) {
    const open = progress.worlds.includes(w) && !!WORLDS[w], b = document.createElement('button');
    const stars = WORLDS[w] ? WORLDS[w].holes.reduce((a, h) => a + ((progress.holes[h.key] || {}).stars || 0), 0) : 0;
    b.className = 'btn' + (w === cur ? ' on' : '') + (open ? '' : ' locked');
    b.setAttribute('aria-label', 'course ' + w);
    b.innerHTML = (lookOf(w).icon || `<span class="n">${w}</span>`) + (open ? (stars ? `<span class="tally">${stars}</span>` : '') : LOCK_SVG);
    b.onclick = () => { if (open) { sfx('tap'); showWorld(w); } else sfx('boink'); };
    titleStrip.append(b);
  }
}
/* the ten worlds as big cards; each opens its world map */
function showWorlds() {
  if (currentScene === 'title' || currentScene === 'world' || currentScene === 'card') wipe();
  setRead(false); play.swing = null; play.aimDrag = null; hideAim();
  showScene('worlds');
  worldGrid.innerHTML = '';
  WORLD_ORDER.forEach((w, i) => {
    const open = progress.worlds.includes(w) && !!WORLDS[w], look = lookOf(w), b = document.createElement('button');
    const stars = coursesOf(w).flatMap(c => [c, NIGHT + c]).reduce((a, c) => a + (WORLDS[c] ? WORLDS[c].holes.reduce((t, h) => t + ((progress.holes[h.key] || {}).stars || 0), 0) : 0), 0);
    const night = coursesOf(w).some(c => progress.worlds.includes(NIGHT + c));
    b.className = 'wcard' + (open ? '' : ' locked');
    b.style.background = `linear-gradient(${look.sky[0]}, ${look.sky[1]})`; b.style.animationDelay = (i * 0.03) + 's';
    b.setAttribute('aria-label', 'world ' + w);
    b.innerHTML = `<span class="num">${w}</span><span class="art">${look.icon || ''}</span>` + (open ? `<span class="tally">${STAR_SVG}${stars}</span>` : LOCK_SVG) + (night ? MOON_SVG : '');
    b.onclick = () => { if (open) { sfx('tap'); showWorld(w); } else sfx('boink'); };
    worldGrid.append(b);
  });
  soundBtn.classList.toggle('off', !progress.sound);
  renderWallet();
}
/* a world's map, Mario style: its three courses along a winding path by day, their neon night
   remixes below, and the ball hopping on the course to play next */
const WORLD_POS = [[230, 300], [600, 236], [970, 300]], NIGHT_POS = [[230, 560], [600, 600], [970, 560]];
function showWorld(w) {
  if (currentScene !== 'world') wipe();
  mapWorld = w; mapNight = false;
  setRead(false); play.swing = null; play.aimDrag = null; hideAim();
  showScene('world');
  const look = lookOf(w), cs = coursesOf(w);
  world.style.background = `linear-gradient(${look.sky[0]}, ${look.sky[1]} 55%, ${look.felt} 55%, ${look.felt})`;
  worldBadge.querySelector('.ic').innerHTML = look.icon || ''; worldBadgeN.textContent = w;
  const curve = ps => 'M' + ps.map(p => p.join(' ')).join(' L');
  worldPath.innerHTML = `<path d="${curve(WORLD_POS.slice(0, cs.length))}" fill="none" stroke="#fffdf7" stroke-width="26" stroke-linecap="round" stroke-dasharray="2 38" opacity=".9"/>`
    + `<path d="${curve(NIGHT_POS.slice(0, cs.length))}" fill="none" stroke="#ff3df2" stroke-width="18" stroke-linecap="round" stroke-dasharray="2 30" opacity=".7"/>`
    + cs.map((_, k) => `<path d="M${WORLD_POS[k][0]} ${WORLD_POS[k][1] + 100} L${NIGHT_POS[k][0]} ${NIGHT_POS[k][1] - 80}" stroke="#fffdf7" stroke-width="8" stroke-dasharray="2 16" stroke-linecap="round" opacity=".6"/>`).join('');
  /* scenery: the world's emblem scattered faintly round the paths */
  const r = rng32(w * 97);
  const spots = [];
  for (let i = 0; i < 200 && spots.length < 9; i++) {
    const x = 40 + r() * 1080, y = 120 + r() * 500;
    if (WORLD_POS.concat(NIGHT_POS).every(([nx, ny]) => Math.hypot(x + 40 - nx, y + 40 - ny) > 170) && spots.every(([sx, sy]) => Math.hypot(x - sx, y - sy) > 110)) spots.push([x, y]);
  }
  worldDecor.innerHTML = spots.map(([x, y]) => `<span style="position:absolute;left:${x.toFixed(0)}px;top:${y.toFixed(0)}px">${look.icon || ''}</span>`).join('');
  worldNodes.innerHTML = '';
  let next = null;
  cs.forEach((c, k) => {
    for (const night of [false, true]) {
      const id = night ? NIGHT + c : c, open = progress.worlds.includes(id) && !!WORLDS[id], hs = WORLDS[id] ? WORLDS[id].holes : [];
      const stars = hs.reduce((t, h) => t + ((progress.holes[h.key] || {}).stars || 0), 0), done = hs.length && hs.every(h => progress.holes[h.key]);
      const crazy = hs.filter(h => h.crazy).length, [x, y] = (night ? NIGHT_POS : WORLD_POS)[k], b = document.createElement('button');
      b.className = 'btn cnode' + (night ? ' night' : '') + (open ? (done ? ' done' : night ? '' : ' go') : ' locked');
      b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.animationDelay = (k * 0.08 + (night ? 0.2 : 0)) + 's';
      b.setAttribute('aria-label', (night ? 'night course ' : 'course ') + (k + 1));
      b.innerHTML = `<span class="n">${k + 1}</span>` + (open ? `<span class="tally">${STAR_SVG}${stars}/${hs.length * 3}</span>` + (crazy && !night ? `<span class="crazyN">${CRAZY_SVG.replace('class="crazy"', '')}${crazy}</span>` : '') : LOCK_SVG);
      b.onclick = () => { if (open) { sfx('tap'); showMap(id); } else sfx('boink'); };
      worldNodes.append(b);
      if (!night && open && !done && !next) next = [x, y];
    }
  });
  worldBall.classList.toggle('show', !!next);
  if (next) { worldBall.style.left = next[0] + 'px'; worldBall.style.top = (next[1] - 118) + 'px'; }
}
function showMap(w) {
  if (currentScene !== 'map') wipe();
  setRead(false);
  if (w) mapWorld = w;
  if (!WORLDS[mapWorld]) mapWorld = playable()[0];
  mapNight = isNight(mapWorld);
  play.swing = null; play.aimDrag = null; hideAim();
  showScene('map');
  renderMap();
}
function renderMap() {
  const w = worldOf(dayOf(mapWorld)), k = coursesOf(w).indexOf(dayOf(mapWorld)) + 1;
  mapBadge.querySelector('.ic').innerHTML = lookOf(w).icon || ''; mapBadgeN.textContent = k;
  mapBadge.classList.toggle('night', mapNight);
  const sky = lookOf(w).sky;
  map.style.background = mapNight ? 'linear-gradient(#05020f, #2a0b4d)' : `linear-gradient(${sky[0]}, ${sky[1]})`;
  const holes = WORLDS[mapWorld] ? WORLDS[mapWorld].holes : [], pts = NODE_POS.slice(0, holes.length);
  pathLine.innerHTML = `<path d="M${pts.map(p => p.join(' ')).join(' L')}" fill="none" stroke="var(--v-surface-line)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 34"/>`;
  holePath.innerHTML = '';
  pts.forEach(([x, y], i) => {
    const key = mapWorld + '-' + (i + 1), rec = progress.holes[key], open = holeUnlocked(progress, key) || (practiceMode && progress.worlds.includes(mapWorld));
    const b = document.createElement('button');
    b.className = 'btn node' + (open ? (rec ? '' : ' go') : ' locked');
    b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.animationDelay = (i * 0.03) + 's';
    b.setAttribute('aria-label', 'hole ' + (i + 1));
    const hd = WORLDS[mapWorld].holes[i];
    if (hd.crazy) b.classList.add('crazy');
    b.innerHTML = `<span class="n">${i + 1}</span>` + (hd.crazy ? CRAZY_SVG : '') + (rec ? `<span class="stars">${[0, 1, 2].map(k => STAR_SVG.replace('class="star"', `class="star${k < rec.stars ? ' on' : ''}"`)).join('')}</span><span class="best">${rec.best}</span>` : '') + (open ? '' : LOCK_SVG);
    b.onclick = () => open ? goHole(key) : sfx('boink');
    holePath.append(b);
  });
  soundBtn.classList.toggle('off', !progress.sound);
  map.classList.toggle('night', mapNight); map.classList.toggle('practice', practiceMode);
  practiceBtn.classList.toggle('on', practiceMode);
  mapLostN.textContent = holes.filter(h => progress.lost[h.key]).length + '/' + holes.length;
  renderWallet();
}
function showCard(w) {
  mapWorld = w;
  const holes = WORLDS[w].holes;
  /* a course played out of order (?hole=, or a gapped save) has no full card yet: back to its map */
  if (holes.some(h => !progress.holes[h.key])) { showMap(w); return; }
  cardRow.innerHTML = '';
  let total = 0, par = 0, stars = 0;
  holes.forEach((h, i) => {
    const r = progress.holes[h.key], c = document.createElement('div');
    total += r.best; par += h.par; stars += r.stars;
    c.className = 'cell' + (r.best < h.par ? ' under' : r.best === h.par ? ' par' : '');
    c.innerHTML = `<small>${i + 1}</small>${r.best}`;
    cardRow.append(c);
  });
  const diff = total - par;
  cardTotal.textContent = total;
  cardDiff.textContent = (diff > 0 ? '+' : '') + diff;
  cardStars.innerHTML = STAR_SVG + `<span>${stars}</span>`;
  const list = playable(), d = dayOf(w), nd = WORLDS[d + COURSE_STEP] && worldOf(d + COURSE_STEP) === worldOf(d) ? d + COURSE_STEP : list[list.indexOf(worldOf(d)) + 1], next = nd && (isNight(w) ? NIGHT + nd : nd);
  cardNext.style.display = next && progress.worlds.includes(next) ? '' : 'none';
  cardNext.onclick = () => { sfx('tap'); showWorld(worldOf(dayOf(next))); };
  showScene('card');
  burst(new THREE.Vector3().copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.6)), 140);
  sfx('fanfare');
}

/* ============ 8. FX ============ */
const FX_COLORS = [0xef7d6d, 0xffd66e, 0x74c465, 0x6fc0df, 0xfff8ec];
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let trailDots = [], confetti = [], trailClock = 0, trailNext = 0;
function initFx() {
  const dotGeo = new THREE.SphereGeometry(BALL_R * 0.55, 10, 8);
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xfffdf7, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.userData.life = 0; scene.add(m); trailDots.push(m);
  }
  const confGeo = new THREE.PlaneGeometry(0.045, 0.028);
  for (let i = 0; i < 140; i++) {
    const m = new THREE.Mesh(confGeo, new THREE.MeshBasicMaterial({ color: FX_COLORS[i % FX_COLORS.length], side: THREE.DoubleSide }));
    m.visible = false; m.userData = { life: 0, v: new THREE.Vector3(), spin: new THREE.Vector3() }; scene.add(m); confetti.push(m);
  }
}
function burst(pos, n = 120) {
  if (reducedMotion()) return;
  for (let i = 0; i < n && i < confetti.length; i++) {
    const m = confetti[i], a = Math.random() * Math.PI * 2, s = 1.2 + Math.random() * 1.8;
    m.position.copy(pos); m.visible = true;
    m.userData.life = 2.2 + Math.random() * 0.6;
    m.userData.v.set(Math.cos(a) * s * 0.6, 2.2 + Math.random() * 1.8, Math.sin(a) * s * 0.6);
    m.userData.spin.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
  }
}
const visibleTrail = () => trailDots.filter(m => m.visible).length;
const activeConfetti = () => confetti.filter(m => m.visible).length;
/* the flagstick's pull: 0 in the cup, 1 out and held aside. Pulled when a rolling ball comes within PIN_NEAR of the cup. */
const PIN_NEAR = 1.2;
function pinWanted() {
  const h = play.hole, b = play.ball, ph = play.phase;
  if (ph === 'sunk' || ph === 'auto' || ph === 'done') return 1;
  if ((ph === 'roll' || ph === 'drift') && !b.tube && Math.hypot(b.x - h.cup[0], b.z - h.cup[1]) < PIN_NEAR) return 1;
  if (ph === 'aim' && Math.hypot(b.x - h.cup[0], b.z - h.cup[1]) < PIN_NEAR * 0.6) return 1;
  return 0;
}
function updateFx(dt) {
  const calm = reducedMotion(), b = play.ball, rolling = play.phase === 'roll' || play.phase === 'drift';
  /* trail: a dot every 30 ms while rolling, each fading over 0.4 s */
  trailClock += dt;
  if (!calm && rolling && !b.tube && trailClock >= trailNext && Math.hypot(b.vx, b.vz) > 0.3) {
    trailNext = trailClock + 0.03;
    const m = trailDots.find(d => !d.visible) || trailDots[0];
    m.position.set(b.x, b.y + BALL_R * 0.6, b.z); m.visible = true; m.userData.life = 0.4;
  }
  for (const m of trailDots) if (m.visible) {
    m.userData.life -= dt;
    if (m.userData.life <= 0 || calm) { m.visible = false; continue; }
    m.material.opacity = m.userData.life / 0.4 * 0.55; m.scale.setScalar(0.4 + m.userData.life / 0.4 * 0.6);
  }
  /* squash on hard hits */
  const s = calm ? 0 : (play.fx.squash || 0);
  ballMesh.scale.set(1 + 0.22 * s, 1 - 0.28 * s, 1 + 0.22 * s);
  play.fx.squash = s * Math.exp(-14 * dt);
  /* flagstick: eases out of the cup and aside (never through the ball), pops and spins on a make */
  if (flagGroup) {
    const want = play.hole ? pinWanted() : 0, cur = play.fx.pin || 0, k = calm ? 1 : 1 - Math.exp(-8 * dt);
    const pin = play.fx.pin = cur + (want - cur) * k;
    const side = camera ? new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0) : new THREE.Vector3(1, 0, 0);
    const t = play.phase === 'sunk' && !calm ? play.fx.sunkT : -1, pop = t >= 0 && t < 0.9 ? Math.sin(t / 0.9 * Math.PI) * 0.2 : 0;
    flagGroup.position.set(side.x * 0.32 * pin, 0.14 * pin + pop, side.z * 0.32 * pin);
    flagGroup.rotation.set(0, t >= 0 && t < 0.9 ? t / 0.9 * Math.PI * 2 : 0, -0.25 * pin * Math.sign(side.x || 1));
  }
  /* confetti */
  for (const m of confetti) if (m.visible) {
    const u = m.userData;
    u.life -= dt;
    if (u.life <= 0) { m.visible = false; continue; }
    u.v.y -= 4 * dt; u.v.multiplyScalar(Math.exp(-1.2 * dt));
    m.position.addScaledVector(u.v, dt);
    m.rotation.x += u.spin.x * dt; m.rotation.y += u.spin.y * dt; m.rotation.z += u.spin.z * dt;
  }
}

/* ============ 8b. PRO SHOP ============ */
/* src/shop.js is inlined here by scripts/build.cjs. */
/* @@SHOP@@ */

/* ---- 8c. updates ---- */
/* A web app on the home screen keeps the page it first loaded. On boot, on coming back to the
   foreground and every 10 minutes, fetch the live page and compare fingerprints. A newer build
   reloads at once on the title, map, card or shop; mid-hole, a refresh button appears and the
   next scene change takes it. sw.js (network first, cache when offline) keeps it fresh. */
let updateReady = false;
function checkUpdate() {
  if (!/^https?:$/.test(location.protocol) || updateReady) return;
  fetch(location.pathname + '?v=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '').then(t => {
    const m = t.match(/const BUILD_ID = '([0-9a-f]{12})'/);
    if (!m || m[1] === BUILD_ID || !/^[0-9a-f]{12}$/.test(BUILD_ID)) return;
    updateReady = true;
    if (currentScene === 'hole') updateBtn.classList.add('show'); else location.reload();
  }).catch(() => {});
}
function initUpdates() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  updateBtn.addEventListener('click', () => location.reload());
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });
  setInterval(checkUpdate, 10 * 60 * 1000);
  setTimeout(checkUpdate, 3000);
}

/* ============ 9. BOOT ============ */
function boot() {
  progress = loadProgress();
  repairExtras(progress);
  fit();
  initRenderer();
  initAim();
  setPutter(GEAR.putter);
  initFx();
  initPuffs();
  initShop();
  view.addEventListener('pointerdown', onViewDown);
  swingPad.addEventListener('pointerdown', onPadDown);
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onCancel);
  aimL.addEventListener('click', () => nudge(-1));
  aimR.addEventListener('click', () => nudge(1));
  viewBtn.addEventListener('click', () => { sfx('tap'); setOverview(!play.overview); });
  readBtn.addEventListener('click', () => { sfx('tap'); setRead(!readGroup); });
  mulliganBtn.addEventListener('click', () => mulligan());
  handR.addEventListener('click', () => { sfx('tap'); setHand('R'); });
  handL.addEventListener('click', () => { sfx('tap'); setHand('L'); });
  setBtn.addEventListener('click', () => { sfx('tap'); settings.classList.add('show'); });
  setClose.addEventListener('click', () => { sfx('tap'); settings.classList.remove('show'); });
  setHand(progress.hand);
  homeBtn.addEventListener('click', () => { sfx('tap'); showMap(Number(play.key.split('-')[0])); });
  doneMap.addEventListener('click', () => { sfx('tap'); showMap(Number(play.key.split('-')[0])); });
  titleGo.addEventListener('click', () => { sfx('tap'); showWorlds(); });
  worldsHome.addEventListener('click', () => { sfx('tap'); wipe(); showTitle(); });
  worldBack.addEventListener('click', () => { sfx('tap'); showWorlds(); });
  mapBack.addEventListener('click', () => { sfx('tap'); showWorld(worldOf(dayOf(mapWorld))); });
  cardMap.addEventListener('click', () => { sfx('tap'); showWorld(worldOf(dayOf(mapWorld))); });
  soundBtn.addEventListener('click', () => { setSound(!progress.sound); soundBtn.classList.toggle('off', !progress.sound); sfx('tap'); });
  doneRetry.addEventListener('click', () => goHole(play.key, { daily: play.daily, friend: play.friend }));
  initExtras();
  doneNext.addEventListener('click', () => {
    const w = Number(play.key.split('-')[0]), k = nextKey(play.key);
    if (play.daily || play.friend) { sfx('tap'); if (progress.worlds.includes(w)) showMap(w); else showTitle(); }
    else if (k) goHole(k); else { sfx('tap'); showCard(w); }
  });
  const q = new URLSearchParams(location.search);
  const shot = q.has('shot') && decodeShot(q.get('shot'));
  if (shot) { showTitle(); goHole(shot.key, { friend: shot.log }); }
  else if (q.has('hole') && holeAt(q.get('hole'))) startHole(q.get('hole'));
  else if (q.has('map')) { showTitle(); showMap(); }
  else showTitle();
  addEventListener('resize', () => { fit(); resizeRenderer(); });
  addEventListener('orientationchange', () => { fit(); setTimeout(fit, 350); });
  if (window.visualViewport) visualViewport.addEventListener('resize', fit);
  requestAnimationFrame(frame);
  initUpdates();
  window.booted = true;
}
addEventListener('DOMContentLoaded', boot);
