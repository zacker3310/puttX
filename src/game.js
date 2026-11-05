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
const CUP_R = 0.099;
const CUP_SINK = 0.2;             /* how deep the cup is drawn: the drop is longer than the physics needs, for the plunk */
/* The ball is a rigid sphere with a spin vector (wx, wy, wz) in rad/s. Every contact (the turf, a
   wall, a post, a mover, the cup's rim and liner) is an impulse at the contact point with a normal
   restitution and Coulomb friction, so spin is real: a struck ball slides until friction spins it
   up to a true roll, a rolling ball that meets a wall at its equator hops and comes off it with
   the wrong spin (it checks and comes off flatter), and the cup is a real hole with a rim edge. */
const SPIN_I = 0.4;              /* moment of inertia over m R^2: a solid sphere (a golf ball is 0.38 to 0.40) */
const SLIDE_J = SPIN_I / (1 + SPIN_I);   /* 2/7: the impulse, per unit slip, that stops a contact point sliding */
const SLIP_EPS = 2e-3;           /* slower slip than this (m/s) is a true roll */
/* putt speed at power 0 and power 1. A putter launches the ball with almost no spin, so it slides
   first and rolls at 5/7 of its launch speed or a little more; these are set so the total roll on
   felt matches the old game's (full power about 17 m), for the long lag putts */
const MIN_V = 0.354, MAX_V = 5.4;
const V_CAP = 6.5;               /* nothing pushes a ball past this: 0.027 m per step, well under a wall's reach (BALL_R + WALL_HALF) */
const STOP_V = 0.03;
const SETTLE_T = 0.4;            /* slower than STOP_V this long = at rest, even pressed on a wall or a lip */
const STATIC_MU = 0.1;           /* a stopped ball stays put on slopes gentler than this */
const MAX_SIM_T = 40;            /* a putt that runs this long is called stopped: room for the bonus nine's ice */
const G = 9.8;
const ROLL = 5 / 7;              /* rolling sphere: share of gravity along a slope (1 / (1 + SPIN_I)) */
/* water is a hazard (the ball goes back where it was putted from, plus one); push zones are
   conveyors and fans: a constant acceleration [ax, az] while the ball rolls on them */
/* GLIDE: every surface is slicker than a real green, so the ball coasts; ice is nearly frictionless.
   Per surface: mu is rolling resistance (deceleration over g: felt is a stimp of about 12 ft), slide is
   the sliding friction of the contact (carpet and turf about 0.2), e the landing restitution */
const GLIDE = 0.62, FELT_MU = 0.075;
const SURF = { felt: { mu: FELT_MU * GLIDE, slide: 0.22, e: 0.5 }, ice: { mu: 0.006, slide: 0.03, e: 0.6 }, sand: { mu: 0.4 * GLIDE, slide: 0.55, e: 0.12 },
  mud: { mu: 0.75 * GLIDE, slide: 0.7, e: 0.05 }, fast: { mu: 0.04 * GLIDE, slide: 0.16, e: 0.55 }, water: { mu: FELT_MU * GLIDE, slide: 0.22, e: 0.1 } };
/* walls are timber or steel borders that meet the ball at its equator: restitution and friction at the rail */
const WALL_TOP = 0.15, WALL_HALF = 0.05, WALL_E = 0.8, WALL_MU = 0.18;
const POST_E = 0.65, MOVER_E = 0.8, HOP_V = 0.25;   /* a wall's friction that lifts the ball faster than HOP_V makes it hop */
const STEP_MAX = 0.03;           /* ground rising more than this under the ball's leading edge is a cliff face */
const CLIFF_E = 0.45;
const BOUNCE_VY = 0.75;          /* a landing faster than this bounces (each surface's e); slower joins the ground */
const OOB_Y = -1;
/* the cup: a hole of radius CUP_R with a sharp rim edge and a plastic liner. A ball whose centre
   crosses the rim loses the turf under it and falls; the far rim edge either turns it down into the
   hole or throws it back out (a hop, a lip out, a horseshoe). It is in once its centre is half a ball
   below the rim. Around it the turf dips a few millimetres, as round a well-played cup. */
const RIM_E = 0, RIM_MU = 1, RIM_RHO = 0.008, LINER_E = 0.35, LINER_MU = 0.2, SUNK_DEPTH = 0.5;
const DISH_R = 0.22, DISH_D = 0.006;
const LIP_PULL_R = DISH_R;       /* the renderer's soft shade round the cup covers the dish */
const TUBE_R = 0.12, TUBE_T = 0.45;   /* a tube mouth swallows a rolling ball whose centre comes this close; transit time */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/* a 2D length from sqrt, which IEEE pins down exactly in every engine (Math.hypot is not), and faster */
const hyp = (a, b) => Math.sqrt(a * a + b * b);

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
    const n = Math.max(2, Math.ceil(hyp(bx - ax, bz - az) / 0.05));
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
/* the worn dish round the cup: DISH_D deep at the middle, smooth (zero slope) at DISH_R; returns [y, dy/dd] */
function dishY(d) {
  if (d >= DISH_R) return [0, 0];
  const u = d / DISH_R, w = 1 - u * u;
  return [-DISH_D * w * w, 4 * DISH_D * u * w / DISH_R];
}
function groundH(h, x, z) {
  let y = baseAt(h, x, z)[0];
  for (const b of h.bumps) { const dx = x - b.x, dz = z - b.z; y += b.h * Math.exp(-(dx * dx + dz * dz) / (b.r * b.r)); }
  for (const dr of h.drains) y += drainY(hyp(x - dr.x, z - dr.z), dr)[0];
  if (h.cup) y += dishY(hyp(x - h.cup[0], z - h.cup[1]))[0];
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
    const dx = x - dr.x, dz = z - dr.z, d = hyp(dx, dz), s = d > 1e-9 ? drainY(d, dr)[1] / d : 0;
    gx += s * dx; gz += s * dz;
  }
  if (h.cup) {
    const dx = x - h.cup[0], dz = z - h.cup[1], d = hyp(dx, dz);
    if (d < DISH_R && d > 1e-9) { const s = dishY(d)[1] / d; gx += s * dx; gz += s * dz; }
  }
  return [gx, gz];
}

/* ---- 2c. collisions ---- */
function closestOnSeg(ax, az, bx, bz, x, z) {
  const ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez;
  const t = L2 ? clamp(((x - ax) * ex + (z - az) * ez) / L2, 0, 1) : 0;
  return [ax + ex * t, az + ez * t];
}
/* one contact, as an impulse at the contact point: (nx, ny, nz) is the unit normal pushing the ball
   away, e the normal restitution, mu the friction, (svx, svy, svz) the surface's own velocity. The
   contact point sits at -R n from the centre, so its velocity is v + w x (-R n): the normal part
   bounces, the sliding part is opposed by friction up to the impulse that would stop it (2/7 of the
   slip for a solid ball), and that friction also turns the spin. Unit mass. Returns the approach speed. */
function impulse(b, nx, ny, nz, e, mu, svx = 0, svy = 0, svz = 0) {
  const R = BALL_R, rx = -R * nx, ry = -R * ny, rz = -R * nz;
  const ux = b.vx - svx + b.wy * rz - b.wz * ry, uy = b.vy - svy + b.wz * rx - b.wx * rz, uz = b.vz - svz + b.wx * ry - b.wy * rx;
  const un = ux * nx + uy * ny + uz * nz;
  if (un >= 0) return 0;
  const jn = -(1 + e) * un, tx = ux - un * nx, ty = uy - un * ny, tz = uz - un * nz, ts = Math.sqrt(tx * tx + ty * ty + tz * tz);
  b.vx += jn * nx; b.vy += jn * ny; b.vz += jn * nz;
  if (ts > 1e-9) {
    const k = Math.min(mu * jn, SLIDE_J * ts) / ts, fx = -tx * k, fy = -ty * k, fz = -tz * k, ik = 1 / (SPIN_I * R * R);
    b.vx += fx; b.vy += fy; b.vz += fz;
    b.wx += (ry * fz - rz * fy) * ik; b.wy += (rz * fx - rx * fz) * ik; b.wz += (rx * fy - ry * fx) * ik;
  }
  const s = hyp(b.vx, b.vz);
  if (s > V_CAP) { b.vx *= V_CAP / s; b.vz *= V_CAP / s; }
  return -un;
}
/* a vertical face (wall, post, mover, cliff) with outward normal (nx, nz) moving at (svx, svz) */
const bounce = (b, nx, nz, e, svx, svz, mu = WALL_MU) => impulse(b, nx, 0, nz, e, mu, svx, 0, svz);
function hitSeg(b, ax, az, bx, bz, e, svx = 0, svz = 0) {
  const [px, pz] = closestOnSeg(ax, az, bx, bz, b.x, b.z), R = BALL_R + WALL_HALF;
  let nx = b.x - px, nz = b.z - pz;
  const d = hyp(nx, nz);
  if (d >= R || d < 1e-9) return 0;
  nx /= d; nz /= d;
  b.x = px + nx * R; b.z = pz + nz * R;
  return bounce(b, nx, nz, e, svx, svz);
}
function hitCircle(b, cx, cz, cr, e, svx = 0, svz = 0) {
  let nx = b.x - cx, nz = b.z - cz;
  const d = hyp(nx, nz), R = cr + BALL_R;
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
      for (const [ax, az, bx, bz] of s.bars) { const p = closestOnSeg(ax, az, bx, bz, b.x, b.z); if (hyp(b.x - p[0], b.z - p[1]) < BALL_R + WALL_HALF) return true; }
    } else if (hyp(b.x - s.x, b.z - s.z) < m.r + BALL_R) return true;
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
/* b.y is the height of the bottom of the ball (its centre is BALL_R above); (vx, vy, vz) its velocity,
   (wx, wy, wz) its spin. On the ground vy follows the slope; b.slide is 1 while the contact slides. */
function newBall(h, x, z) { return { x, z, y: groundH(h, x, z), vx: 0, vz: 0, vy: 0, wx: 0, wy: 0, wz: 0, slide: 0, air: false, tube: null, hits: [] }; }
function puttVelocity(angleDeg, power) {
  const a = angleDeg * Math.PI / 180, v = MIN_V + (MAX_V - MIN_V) * clamp(power, 0, 1);
  return [Math.sin(a) * v, Math.cos(a) * v];
}
/* the putter face sends the ball off with no spin: it slides, and the turf spins it up to a roll */
function launch(b, angleDeg, power) {
  const v = puttVelocity(angleDeg, power);
  b.vx = v[0]; b.vz = v[1]; b.wx = b.wy = b.wz = 0; b.slide = 1;
  return b;
}
/* spin that rolls without slipping at velocity (vx, vz) */
function rollSpin(b) { b.wx = b.vz / BALL_R; b.wz = -b.vx / BALL_R; b.slide = 0; }
/* a ball whose leading edge meets ground more than STEP_MAX above it hits the face of that step */
function hitCliff(h, b, px, pz) {
  const s = hyp(b.vx, b.vz);
  if (s < 1e-9) return 0;
  const lx = b.x + b.vx / s * BALL_R * 0.8, lz = b.z + b.vz / s * BALL_R * 0.8;
  if (!onFloor(h, lx, lz) || groundH(h, lx, lz) - b.y <= STEP_MAX) return 0;
  /* the face normal points from the high ground back down to the ball */
  const e = BALL_R, H = (x, z) => groundH(h, x, z);
  let nx = -(H(lx + e, lz) - H(lx - e, lz)), nz = -(H(lx, lz + e) - H(lx, lz - e));
  const n = hyp(nx, nz);
  if (n < 1e-9) { nx = -b.vx / s; nz = -b.vz / s; } else { nx /= n; nz /= n; }
  b.x = px; b.z = pz;
  return bounce(b, nx, nz, CLIFF_E, 0, 0);
}
const cupDist = (h, b) => hyp(b.x - h.cup[0], b.z - h.cup[1]);
/* the hole itself, for a ball whose centre is near it in the air: below the rim the liner (a vertical
   cylinder) holds the ball in; at the rim the edge is a circle the ball can strike, ride or tip over.
   Returns the strongest impact, logged as a lip (the rim) or a rattle (the liner). */
function cupContact(h, b) {
  const R = BALL_R, dx = b.x - h.cup[0], dz = b.z - h.cup[1], d = hyp(dx, dz);
  if (d >= CUP_R + RIM_RHO + R) return 0;
  const ux = d > 1e-9 ? dx / d : 1, uz = d > 1e-9 ? dz / d : 0, kr = CUP_R + RIM_RHO;
  /* the lip's rounding: a torus whose core circle sits RIM_RHO outside and below the rim's top */
  const kx = h.cup[0] + ux * kr, kz = h.cup[1] + uz * kr, yk = groundH(h, kx, kz) - RIM_RHO, cy = b.y + R;
  if (cy < yk) {
    if (d < CUP_R - R || d >= CUP_R) return 0;
    /* inside, against the liner */
    b.x = h.cup[0] + ux * (CUP_R - R); b.z = h.cup[1] + uz * (CUP_R - R);
    const v = impulse(b, -ux, 0, -uz, LINER_E, LINER_MU);
    if (v > 0.15) b.hits.push(['rattle', v]);
    return v;
  }
  const ex = b.x - kx, ey = cy - yk, ez = b.z - kz, el = Math.sqrt(ex * ex + ey * ey + ez * ez), reach = R + RIM_RHO;
  if (el >= reach || el < 1e-9) return 0;
  const nx = ex / el, ny = ey / el, nz = ez / el;
  b.x = kx + nx * reach; b.z = kz + nz * reach; b.y = yk + ny * reach - R;
  /* a real knock bounces off the lip; a ball merely resting on it rides it (no bounce, no jitter) */
  const vn = -(b.vx * nx + b.vy * ny + b.vz * nz), v = impulse(b, nx, ny, nz, vn > 0.2 ? RIM_E : 0, RIM_MU);
  if (v > 0.3) b.hits.push(['lip', v]);
  return v;
}
/* the ball's centre is over the hole (inside the lip's rounding): no flat turf under it */
const overHole = (h, b) => cupDist(h, b) < CUP_R + RIM_RHO;
/* in the air: gravity, walls, the cup's rim and liner, and the landing. Near the cup the step is
   split so a fast ball cannot pass through the rim edge between two steps. */
function stepAir(h, b, t, dt, g) {
  const px = b.x, pz = b.z, py = b.y, dc = cupDist(h, b), s = hyp(b.vx, b.vz);
  const near = dc < CUP_R + RIM_RHO + 2 * BALL_R + s * dt, n = near ? Math.min(8, Math.max(1, Math.ceil(s * dt / (0.2 * BALL_R)))) : 1, d = dt / n;
  for (let i = 0; i < n; i++) {
    b.vy -= g * d; b.x += b.vx * d; b.z += b.vz * d; b.y += b.vy * d;
    if (near) cupContact(h, b);
  }
  collideAll(h, b, t);
  const c = cupDist(h, b);
  if (c < CUP_R && b.y + BALL_R < groundH(h, h.cup[0] + (b.x - h.cup[0]) / (c || 1) * CUP_R, h.cup[1] + (b.z - h.cup[1]) / (c || 1) * CUP_R) - SUNK_DEPTH * BALL_R) return 'sunk';
  if (c >= CUP_R + RIM_RHO && onFloor(h, b.x, b.z)) {
    const gh = groundH(h, b.x, b.z);
    /* already below this floor's surface last step: it came in from the side, under the edge, so it hits the slab's face */
    if (py < gh - STEP_MAX && b.y <= gh) {
      const sp = hyp(b.vx, b.vz) || 1;
      b.x = px; b.z = pz;
      if (bounce(b, -b.vx / sp, -b.vz / sp, CLIFF_E, 0, 0)) b.hits.push(['wall', sp]);
    } else if (b.y <= gh) {
      /* the landing: an impulse against the ground's own normal, with that surface's bounce and friction */
      const [gx, gz] = groundGrad(h, b.x, b.z), q = Math.sqrt(1 + gx * gx + gz * gz), nx = -gx / q, ny = 1 / q, nz = -gz / q;
      const zn = zoneAt(h, b.x, b.z), sf = zn && zn.surf ? SURF[zn.surf] : SURF.felt, imp = -(b.vx * nx + b.vy * ny + b.vz * nz);
      b.y = gh;
      impulse(b, nx, ny, nz, imp > BOUNCE_VY ? sf.e : 0, sf.slide);
      /* a soft landing joins the ground: vertical speed follows the slope, so the ball rolls on down a ramp */
      if (imp <= BOUNCE_VY) { b.air = false; b.vy = gx * b.vx + gz * b.vz; b.slide = 1; }
      if (imp > 0.4) b.hits.push(['land', imp]);
    }
  } else if (b.y < OOB_Y) return 'oob';
  return null;
}
/* one fixed step at hole time t. Returns null while the putt is live, else how it ended. */
function stepBall(h, b, t) {
  const dt = SIM_DT, g = G * h.g, R = BALL_R;
  if (b.tube) {
    if ((b.tube.t -= dt) > 0) return null;
    const tb = b.tube.def, a = tb.dir * Math.PI / 180, v = clamp(b.tube.v * (tb.keep !== undefined ? tb.keep : 0.7) + (tb.add || 0.3), 0.4, V_CAP);
    b.x = tb.b[0]; b.z = tb.b[1]; b.y = groundH(h, b.x, b.z); b.vy = 0;
    b.vx = Math.sin(a) * v; b.vz = Math.cos(a) * v; b.tube = null; b.wy = 0; rollSpin(b); b.hits.push(['tubeOut', v]);
    return null;
  }
  if (b.air) return stepAir(h, b, t, dt, g);
  const grad = groundGrad(h, b.x, b.z), q = 1 + grad[0] * grad[0] + grad[1] * grad[1], gn = g / Math.sqrt(q);
  /* gravity along the surface, projected onto the ground plane */
  const gax = -g * grad[0] / q, gaz = -g * grad[1] / q;
  const zn = zoneAt(h, b.x, b.z), sf = zn && zn.surf ? SURF[zn.surf] : null;
  const mu = sf ? sf.mu : h.feltMu, slide = sf ? sf.slide : SURF.felt.slide;
  let vx = b.vx, vz = b.vz;
  if (zn && zn.push) { vx += zn.push[0] * dt; vz += zn.push[1] * dt; }
  /* rolling resistance scales with the normal force */
  const roll = (rx, rz) => { const s0 = hyp(rx, rz), s1 = Math.max(0, s0 - mu * gn * dt), k = s0 > 0 ? Math.min(s1, V_CAP) / s0 : 0; return [rx * k, rz * k]; };
  /* the contact point's slip: v + w x (-R up) */
  if (hyp(vx + R * b.wz, vz - R * b.wx) > SLIP_EPS) {
    /* sliding: all of gravity's slope pull works on the centre, and sliding friction at the contact
       both slows the ball and spins it up, until the slip is gone (it closes at 7/2 mu g) */
    [vx, vz] = roll(vx + gax * dt, vz + gaz * dt);
    const ux = vx + R * b.wz, uz = vz - R * b.wx, us = hyp(ux, uz) || 1;
    const f = Math.min(slide * gn * dt, SLIDE_J * us), fx = -ux / us * f, fz = -uz / us * f, ik = 1 / (SPIN_I * R);
    vx += fx; vz += fz; b.wx -= fz * ik; b.wz += fx * ik;
    b.slide = hyp(vx + R * b.wz, vz - R * b.wx) > SLIP_EPS ? 1 : 0;
  } else {
    /* rolling: the slope pull is 5/7 g sin(theta), the spin rides along with the speed */
    [vx, vz] = roll(vx + ROLL * gax * dt, vz + ROLL * gaz * dt);
    b.slide = 0;
  }
  b.vx = vx; b.vz = vz;
  if (!b.slide) { b.wx = vz / R; b.wz = -vx / R; }
  /* spin about the vertical (from glancing wall hits) bleeds away in the contact patch */
  b.wy -= Math.sign(b.wy) * Math.min(Math.abs(b.wy), 60 * slide * gn * dt);
  const px = b.x, pz = b.z, vy0 = b.vy;
  b.x += vx * dt; b.z += vz * dt;
  collideAll(h, b, t);
  const cv = hitCliff(h, b, px, pz);
  if (cv) b.hits.push(['wall', cv]);
  /* a hard knock against a wall's face kicks the ball up off the turf (the rail's friction on its spin) */
  if (b.vy - vy0 > HOP_V) { b.air = true; return null; }
  b.vy = vy0;
  if (!onFloor(h, b.x, b.z)) { b.air = true; b.vy -= g * dt; return null; }
  /* over the hole: the turf is gone from under the ball's centre */
  if (overHole(h, b)) { b.air = true; return null; }
  /* leaves the ground where the ground falls away faster than gravity can bend the path: crests, lips, drops */
  const gh = groundH(h, b.x, b.z), yFree = b.y + b.vy * dt - 0.5 * g * dt * dt;
  if (gh < yFree - 1e-4) { b.air = true; b.y = yFree; b.vy -= g * dt; return null; }
  b.vy = (gh - b.y) / dt; b.y = gh;

  const zw = zoneAt(h, b.x, b.z);
  if (zw && zw.surf === 'water') { b.hits.push(['splash', 1]); return 'oob'; }
  for (const tb of h.tubes) if (hyp(b.x - tb.a[0], b.z - tb.a[1]) < TUBE_R) {
    b.tube = { def: tb, t: TUBE_T, v: hyp(b.vx, b.vz) };
    b.x = tb.a[0]; b.z = tb.a[1]; b.vx = b.vz = 0; b.hits.push(['tubeIn', 1]);
    return null;
  }
  /* stopped when slow, not sliding, and the slope cannot beat whichever holds harder: static grip or rolling friction */
  const s = hyp(b.vx, b.vz), pushA = zn && zn.push ? hyp(zn.push[0], zn.push[1]) : 0;
  if (s < STOP_V && !b.slide && hyp(gax, gaz) * ROLL + pushA < Math.max(STATIC_MU, mu) * g) { b.vx = 0; b.vz = 0; b.wx = b.wy = b.wz = 0; return 'stop'; }
  b.still = s < STOP_V ? (b.still || 0) + SIM_DT : 0;
  if (b.still >= SETTLE_T) { b.vx = 0; b.vz = 0; b.wx = b.wy = b.wz = 0; return 'stop'; }
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
  const [x, z] = end === 'stop' ? restSpot(h, b.x, b.z) : [b.x, b.z];
  return { end, x, z, t, steps: n, hits: b.hits };
}
/* the real rule for a ball against the border (WMF, PPA, BMGA): it may be placed out from the wall,
   square to it. Here it happens for you whenever the ball comes to rest with its edge within
   RELIEF_GAP of a wall or post face, so the putter always has room; it lands RELIEF_TO from the
   face, or a little closer if that spot is not fair (off the floor, in water, on a slope, by the cup,
   a tube or another wall). Deterministic, so live play, ghosts, shot codes and the solver agree. */
const RELIEF_GAP = 0.025, RELIEF_TO = 0.12;
function restSpot(h, x, z) {
  let bd = Infinity, px = 0, pz = 0, reach = 0;
  for (const s of h.segs) { const p = closestOnSeg(s[0], s[1], s[2], s[3], x, z), d = hyp(x - p[0], z - p[1]); if (d - WALL_HALF < bd - reach) { bd = d; px = p[0]; pz = p[1]; reach = WALL_HALF; } }
  for (const p of h.posts) { const d = hyp(x - p.x, z - p.z); if (d - p.r < bd - reach) { bd = d; px = p.x; pz = p.z; reach = p.r; } }
  if (bd - reach - BALL_R > RELIEF_GAP || bd < 1e-9) return [x, z];
  const nx = (x - px) / bd, nz = (z - pz) / bd, y0 = groundH(h, x, z);
  for (const to of [RELIEF_TO, RELIEF_TO * 0.7, RELIEF_TO * 0.45]) {
    const tx = px + nx * (reach + BALL_R + to), tz = pz + nz * (reach + BALL_R + to), zn = zoneAt(h, tx, tz), gg = groundGrad(h, tx, tz);
    if (!onFloor(h, tx, tz) || (zn && zn.surf === 'water') || Math.abs(groundH(h, tx, tz) - y0) > 0.02 || hyp(gg[0], gg[1]) * ROLL > STATIC_MU) continue;
    if (hyp(tx - h.cup[0], tz - h.cup[1]) < DISH_R || h.tubes.some(tb => hyp(tx - tb.a[0], tz - tb.a[1]) < TUBE_R + BALL_R + 0.03)) continue;
    if (h.segs.some(s => { const p = closestOnSeg(s[0], s[1], s[2], s[3], tx, tz); return hyp(tx - p[0], tz - p[1]) < WALL_HALF + BALL_R + RELIEF_GAP * 1.5; })) continue;
    if (h.posts.some(p => hyp(tx - p.x, tz - p.z) < p.r + BALL_R + RELIEF_GAP * 1.5)) continue;
    return [tx, tz];
  }
  return [x, z];
}
/* ---- 2e. rounds and scoring ---- */
const capOf = h => h.par * 2;   /* the worst a hole can cost: double par, then the ball rolls itself in */
const starsFor = (score, par) => score < par ? 3 : score === par ? 2 : 1;
function newRound(h) { return { hole: h, strokes: 0, at: h.tee.slice(), done: false, score: null, auto: false }; }
/* a putt finished: count it, move the ball, and finish the hole at the cup or the cap */
function resolvePutt(round, result, from) {
  round.strokes++;
  if (result.end === 'sunk') { round.done = true; round.score = round.strokes; round.at = round.hole.cup.slice(); return 'sunk'; }
  if (result.end === 'oob') { round.strokes++; round.at = from.slice(); } else round.at = restSpot(round.hole, result.x, result.z);
  if (round.strokes >= capOf(round.hole)) { round.done = true; round.auto = true; round.score = capOf(round.hole); return 'auto'; }
  return result.end === 'oob' ? 'oob' : 'stop';
}
/* a mover pushed a resting ball: never the player's fault, so no stroke and no penalty */
function resolveDrift(round, result, from) {
  if (result.end === 'sunk') { round.done = true; round.score = Math.max(1, round.strokes); round.at = round.hole.cup.slice(); return 'sunk'; }
  round.at = result.end === 'oob' ? from.slice() : restSpot(round.hole, result.x, result.z);
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
/* the bonus nine: a practice course of its own, always open, every hole playable from the start */
const BONUS = 99;
/* the Putt-Putt classic: the original kind of course (flat carpet, aluminium bumpboards, every hole a
   par 2), also always open. Extra courses sit outside the worlds and unlock nothing. */
const CLASSIC = 98, EXTRAS = [CLASSIC, BONUS];
const isExtra = w => EXTRAS.includes(Number(w));
const allCourses = () => WORLD_ORDER.flatMap(coursesOf).concat(EXTRAS.filter(c => WORLDS[c]));
const worldOf = c => ((c % 100) - 1) % COURSE_STEP + 1;

/* ---- 2g. progress (pure; section 3 stores it) ---- */
function freshProgress() { return { v: 2, holes: {}, worlds: [playable()[0] || WORLD_ORDER[0]], sound: true, hand: 'R', mulligans: 5, lost: {}, obj: {}, daily: null, neon: false }; }
function recordHole(p, key, score, par, maxStars = 3) {
  const prev = p.holes[key];
  const rec = { best: prev ? Math.min(prev.best, score) : score, stars: Math.max(prev ? prev.stars : 0, Math.min(maxStars, starsFor(score, par))) };
  p.holes[key] = rec;
  /* the last hole of a course opens the next playable course */
  const [w, n] = key.split('-').map(Number), list = playable();
  const open = c => { if (WORLDS[c] && !p.worlds.includes(c)) p.worlds.push(c); };
  if (WORLDS[w] && n === WORLDS[w].holes.length && w + COURSE_STEP <= worldOf(w) + (COURSES_PER - 1) * COURSE_STEP) open(w + COURSE_STEP);
  /* the next world opens only once every hole of every course in this world is finished */
  const home = worldOf(w), j = list.indexOf(home);
  if (!isExtra(w) && j >= 0 && j + 1 < list.length && coursesOf(home).every(c => WORLDS[c].holes.every(hd => p.holes[hd.key]))) open(list[j + 1]);
  return rec;
}
function holeUnlocked(p, key) {
  const [w, n] = key.split('-').map(Number);
  if (isExtra(w)) return !!WORLDS[w];
  return p.worlds.includes(w) && (n === 1 || !!p.holes[w + '-' + (n - 1)]);
}
/* ---- 2h. course packs ---- */
/* Each courses/cNN.sim.js registers one course here (scripts/build.cjs inlines them). */
/* @@COURSES_SIM@@ */

// #endregion sim

/* ============ 3. SAVE ============ */
/* three profiles, three saves. Slot 1 keeps the original key so a save from before profiles is
   simply profile 1; the active slot is remembered on its own key. */
const SLOTS = 3, SLOT_KEY = 'puttx.slot';
const slotKey = n => n === 1 ? 'puttx.v2' : 'puttx.v2.p' + n;   /* v1 saves were for the old 27 holes; the courses changed, so they start fresh */
let slot = 1, SAVE_KEY = slotKey(1);
let progress = freshProgress();
function loadProgress(key = SAVE_KEY) {
  try {
    const p = JSON.parse(localStorage.getItem(key));
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
function readSlot() { try { const n = Number(localStorage.getItem(SLOT_KEY)); return n >= 1 && n <= SLOTS && Number.isInteger(n) ? n : 1; } catch (e) { return 1; } }
function slotUsed(n) { try { return !!localStorage.getItem(slotKey(n)); } catch (e) { return false; } }
function eraseSlot(n) { try { localStorage.removeItem(slotKey(n)); } catch (e) {} }

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
  src.buffer = noiseBuf; src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.7;
  rollGain = actx.createGain(); rollGain.gain.value = 0; rollFilter = lp;
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
  /* a wall knock sounds like what the border is made of: aluminium rails ring, timber tocks, stone clacks */
  clonk: v => {
    const k = Math.min(v, 4), vol = Math.min(0.45, 0.12 + v * 0.1);
    if (wallKindNow === 'steel') { tone(1400 + k * 90, 0.12, { type: 'triangle', vol: vol * 0.5 }); tone(2950 + k * 120, 0.18, { vol: vol * 0.18 }); noise(0.02, { vol: vol * 0.5, freq: 4200, q: 3 }); }
    else if (wallKindNow === 'stone' || wallKindNow === 'brick' || wallKindNow === 'marble') { noise(0.03, { vol: vol * 0.9, freq: 2400, q: 2.2 }); tone(620 + k * 40, 0.04, { type: 'triangle', vol: vol * 0.5 }); }
    else if (wallKindNow === 'paint') tone(520 + k * 50, 0.06, { type: 'sine', vol: vol * 0.8, slide: -120 });
    else { tone(330 + k * 30, 0.07, { type: 'triangle', vol }); noise(0.025, { vol: vol * 0.45, freq: 900, q: 2 }); }
  },
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
  /* the clubhouse bell on the last hole; rung twice and brighter for an ace */
  bell: (ace = 0) => { for (let i = 0; i < (ace ? 3 : 1); i++) { tone(1568, 1.2, { vol: 0.16, delay: i * 0.28 }); tone(3920, 0.6, { vol: 0.05, delay: i * 0.28 }); tone(784, 1.4, { type: 'triangle', vol: 0.08, delay: i * 0.28 }); } },
  /* the ball lifted and set down out from the border */
  place: () => { tone(880, 0.04, { type: 'triangle', vol: 0.1 }); noise(0.03, { vol: 0.08, freq: 1200, q: 2, delay: 0.12 }); },
};
let wallKindNow = 'wood';
/* ---- the course's soundscape: very quiet, under everything. Water burbles where a hole has water,
   wind blows on the peaks and in the sky, birds call by day and crickets by night ---- */
const amb = { key: '', bed: null, birds: 0, crickets: 0, next: 0 };
function setAmbience(look, h) {
  const water = h.zones.some(z => z.surf === 'water'), w = worldOf(holeWorld(h)), wind = w === 4 || w === 10 || w === 2;
  amb.birds = look.night || w === 8 ? 0 : w === 3 ? 1.6 : 0.6; amb.crickets = look.night || w === 7 ? 1 : 0;
  const key = [water, wind].join();
  if (!actx || !master || key === amb.key) return;
  amb.key = key;
  if (amb.bed) { const old = amb.bed; old.g.gain.setTargetAtTime(0, actx.currentTime, 0.4); setTimeout(() => { try { old.src.stop(); } catch (e) { /* already stopped */ } }, 2000); amb.bed = null; }
  if (!water && !wind) return;
  const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(), lfo = actx.createOscillator(), lg = actx.createGain();
  src.buffer = noiseBuf; src.loop = true; f.type = water ? 'bandpass' : 'lowpass'; f.frequency.value = water ? 650 : 380; f.Q.value = water ? 0.9 : 0.5;
  lfo.frequency.value = water ? 3.1 : 0.13; lg.gain.value = water ? 260 : 160; lfo.connect(lg); lg.connect(f.frequency);
  g.gain.value = 0; g.gain.setTargetAtTime(water ? 0.05 : 0.07, actx.currentTime, 1.2);
  src.connect(f); f.connect(g); g.connect(master); src.start(); lfo.start();
  amb.bed = { src, g };
}
function tickAmbience(dt) {
  /* the audio wakes on the first touch, often mid-hole: start this hole's bed then */
  if (actx && master && !amb.key && play.hole) setAmbience(lookOf(holeWorld(play.hole)), play.hole);
  if (!actx || !master || currentScene !== 'hole') { if (amb.bed && actx) amb.bed.g.gain.setTargetAtTime(0, actx.currentTime, 0.3); return; }
  if (amb.bed) amb.bed.g.gain.setTargetAtTime(amb.key.startsWith('true') ? 0.05 : 0.07, actx.currentTime, 0.6);
  if ((amb.next -= dt) > 0) return;
  amb.next = 0.6 + Math.random() * 2.4;
  if (amb.birds && Math.random() < 0.35 * amb.birds) {
    const f0 = 2400 + Math.random() * 1800, n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) tone(f0 + (i % 2 ? 380 : 0), 0.07, { vol: 0.018, slide: (Math.random() - 0.3) * 900, delay: i * 0.11 });
  }
  if (amb.crickets && Math.random() < 0.6) for (let i = 0; i < 6; i++) tone(4400, 0.025, { type: 'square', vol: 0.006, delay: i * 0.045 });
}
/* a touch of haptics where the device has them (Android Chrome); quiet mode keeps them off too */
function buzz(p) { try { if (progress.sound && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no haptics */ } }
function sfx(name, ...args) {
  sfxLog.push(name); if (sfxLog.length > 200) sfxLog.shift();
  if (actx && master && SFX[name]) SFX[name](...args);
}
/* rolling hiss follows ball speed; 0 silences it */
/* the ball's roll, heard: a soft rumble that grows and brightens with speed, coloured by what it
   rolls on (felt hushes, fast carpet is brighter, ice hisses, sand crunches, mud thuds) */
let rollFilter = null;
const ROLL_SOUND = { felt: [380, 0.045], fast: [900, 0.05], ice: [3200, 0.03], sand: [1500, 0.07], mud: [220, 0.06], water: [600, 0] };
function setRoll(speed, surf = 'felt') {
  if (!rollGain) return;
  const [f, k] = ROLL_SOUND[surf] || ROLL_SOUND.felt, t = actx.currentTime;
  rollGain.gain.setTargetAtTime(Math.min(0.11, k * Math.sqrt(Math.max(0, speed))), t, 0.04);
  rollFilter.frequency.setTargetAtTime(f * (0.6 + 0.4 * Math.min(2.5, speed)), t, 0.05);
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
/* a night remix wears its day course's look under a moon: deep sky, dimmer ground, a lit cup */
const NIGHT_SKY = ['#05020f', '#2a0b4d'];
const NEON = ['#ff3df2', '#2ef2ff', '#b6ff2e', '#ffb02e', '#8b5cff'];
const lookOf = w => {
  /* a world's later courses inherit its first course's look and override what they like */
  const day = w === CLASSIC ? Object.assign({}, DEFAULT_LOOK, WORLD_LOOK[w]) : Object.assign({}, DEFAULT_LOOK, WORLD_LOOK[worldOf(w)], w !== worldOf(w) ? WORLD_LOOK[w] : null);
  if (!progress.neon) return day;
  /* night is cosmic bowling: black-light carpet, neon tube walls, a glowing ball, a grid to the horizon */
  return Object.assign(day, { night: true, sky: NIGHT_SKY.slice(), fog: true, felt: '#120b2e', ground: '#06030f', skirt: '#1a0f3d', wall: '#1d1240',
    sand: '#5b2a8f', ice: '#1fd4ff', mud: '#3b1d55', fast: '#d13bff', water: '#2a4dff', push: '#ffb02e', tube: '#b6ff2e', flag: '#ff3df2' });
};
/* what the player has equipped; the pro shop fills these in (see applyGear) */
const GEAR = { ball: { base: '#fffdf7', band: '#ffd66e', mark: '#ef7d6d' }, putter: { head: '#c9ced6', metal: 0.85, shaft: '#d9dde3', grip: '#4a3826', shape: 'blade' } };
let ballShadow = null, renderer = null, hemi = null, scene, camera, sun, holeGroup = null, ballMesh, flagGroup, moverMeshes = [], flowTex = [];
const camNow = { pos: null, look: null };
const play = { key: null, hole: null, round: null, ball: null, phase: 'idle', time: 0, from: null, t0: 0, aim: 0, swing: null, aimDrag: null,
  overview: false, cam: { yaw: 0 }, fx: {}, lastShot: null };

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  /* PCF (PCF soft ignores the radius for a sun in r170): crisp shadows, as a real sun casts */
  renderer.shadowMap.type = THREE.PCFShadowMap;
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
  sun.shadow.radius = 1.5;
  sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.01;
  scene.add(sun, sun.target);
  initSky();
  ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 24), (() => { const d = texOf(dimpleNormalCanvas(), false); d.wrapT = THREE.ClampToEdgeWrapping; d.userData.keep = true;
    return new THREE.MeshPhysicalMaterial({ map: ballTexture(GEAR.ball), normalMap: d, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.07, clearcoatNormalMap: d, clearcoatNormalScale: new THREE.Vector2(0.6, 0.6) }); })());
  ballMesh.castShadow = true;
  scene.add(ballMesh);
  /* a soft contact shadow under the ball: the sun's shadow map is too coarse to ground a 5 cm ball */
  ballShadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 1.25, 24), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }),
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  ballShadow.rotation.x = -Math.PI / 2; ballShadow.renderOrder = 2; scene.add(ballShadow);
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
/* ---- 5a2. real surfaces ----
   Everything is drawn once on canvas at runtime (no image files): tileable value noise, turf with
   blade speckle and a normal map, sand, timber, stone, brick, steel, marble and mulch. The canvases
   are cached by key (the GPU textures are made per hole and freed with it, so nothing leaks). */
const CANVAS_CACHE = new Map();
function cachedCanvas(key, w, h, draw) {
  let c = CANVAS_CACHE.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); CANVAS_CACHE.set(key, c); }
  return c;
}
function texOf(canvas, srgb = true, rep = 1) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  return t;
}
/* tileable value noise on a period x period lattice, smoothed; fbm sums octaves */
function noiseField(seed, period) {
  const r = rng32(seed), g = Float32Array.from({ length: period * period }, () => r());
  const at = (i, j) => g[((j % period + period) % period) * period + ((i % period + period) % period)];
  return (u, v) => {
    const x = u * period, y = v * period, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx, b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
    return a + (b - a) * sy;
  };
}
function fbm(seed, base, oct) {
  const fs = Array.from({ length: oct }, (_, k) => noiseField(seed + k * 101, base << k));
  return (u, v) => { let s = 0, a = 0.5, n = 0; for (const f of fs) { s += f(u, v) * a; n += a; a *= 0.5; } return s / n; };
}
const hexRGB = hex => { const c = new THREE.Color(hex); return [c.r * 255, c.g * 255, c.b * 255]; };
/* fills a canvas pixel by pixel: fn(u, v) -> [r, g, b] (0..255) */
function paint(x, w, h, fn) {
  const img = x.createImageData(w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const c = fn(i / w, j / h, i, j), k = (j * w + i) * 4;
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
}
/* a tangent-space normal map from a height function (tileable when the height is) */
function normalCanvas(key, size, height, strength) {
  return cachedCanvas('n:' + key, size, size, (x, w, h) => {
    const H = new Float32Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) H[j * w + i] = height(i / w, j / h, i, j);
    const at = (i, j) => H[((j + h) % h) * w + ((i + w) % w)];
    paint(x, w, h, (u, v, i, j) => {
      const dx = (at(i + 1, j) - at(i - 1, j)) * strength, dy = (at(i, j + 1) - at(i, j - 1)) * strength, l = Math.hypot(dx, dy, 1);
      return [(-dx / l * 0.5 + 0.5) * 255, (dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
    });
  });
}
/* turf: the felt colour, a soft two-scale mottle, and thousands of short blades a shade lighter or
   darker, some yellower, some bluer; the normal map gives the nap its grain */
const TURF_PX = 512;
function turfCanvas(hex) {
  return cachedCanvas('turf:' + hex, TURF_PX, TURF_PX, (x, w, h) => {
    const [r0, g0, b0] = hexRGB(hex), m = fbm(17, 4, 4), f = fbm(29, 32, 2);
    paint(x, w, h, (u, v) => { const k = 0.98 + 0.16 * m(u, v) + 0.1 * (f(u, v) - 0.5); return [Math.min(255, r0 * k), Math.min(255, g0 * k), Math.min(255, b0 * k)]; });
    const r = rng32(7);
    x.lineCap = 'round';
    for (let i = 0; i < 26000; i++) {
      const px = r() * w, py = r() * h, a = r() * Math.PI * 2, L = 1.2 + r() * 2.6, t = r();
      const lit = t < 0.55 ? 1.2 + r() * 0.25 : 0.8 + r() * 0.12, warm = r() < 0.3 ? 1.08 : r() < 0.3 ? 0.92 : 1;
      x.strokeStyle = `rgba(${Math.min(255, r0 * lit * warm) | 0},${Math.min(255, g0 * lit) | 0},${Math.min(255, b0 * lit / warm) | 0},${0.35 + r() * 0.35})`;
      x.lineWidth = 0.8 + r() * 0.7;
      for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) {
        if (px + ox < -4 || px + ox > w + 4 || py + oy < -4 || py + oy > h + 4) continue;
        x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(px + ox + Math.cos(a) * L, py + oy + Math.sin(a) * L); x.stroke();
      }
    }
  });
}
function turfNormal() {
  const fine = noiseField(41, 128), mid = fbm(43, 16, 3);
  return normalCanvas('turf', 256, (u, v) => fine(u, v) * 0.7 + mid(u, v) * 0.6, 2.2);
}
/* generic grainy surfaces: sand, mud, the lawn round the course, mulch, river rock */
function grainCanvas(key, hex, { scale = 64, contrast = 0.22, speck = 0.12, seed = 5, size = 256 } = {}) {
  return cachedCanvas(`grain:${key}:${hex}`, size, size, (x, w, h) => {
    const [r0, g0, b0] = hexRGB(hex), m = fbm(seed, 4, 3), n = noiseField(seed + 9, scale), r = rng32(seed + 3);
    paint(x, w, h, (u, v) => { const k = 1 - contrast / 2 + contrast * m(u, v) + speck * (n(u, v) - 0.5) + (r() - 0.5) * speck; return [r0 * k, g0 * k, b0 * k]; });
  });
}
/* mulch beds and river rock: the landscaping strip round the course */
function edgingCanvas(kind, hex) {
  return cachedCanvas(`edge:${kind}:${hex}`, 256, 256, (x, w, h) => {
    const [r0, g0, b0] = hexRGB(hex), r = rng32(kind === 'rock' ? 61 : 67), m = fbm(71, 4, 3);
    paint(x, w, h, (u, v) => { const k = 0.75 + 0.3 * m(u, v); return [r0 * k * 0.8, g0 * k * 0.8, b0 * k * 0.8]; });
    const n = kind === 'rock' ? 260 : 2200;
    for (let i = 0; i < n; i++) {
      const px = r() * w, py = r() * h, s = kind === 'rock' ? 5 + r() * 9 : 1.5 + r() * 4, k = 0.7 + r() * 0.6;
      x.fillStyle = `rgb(${Math.min(255, r0 * k) | 0},${Math.min(255, g0 * k) | 0},${Math.min(255, b0 * k) | 0})`;
      x.beginPath();
      if (kind === 'rock') x.ellipse(px, py, s, s * (0.6 + r() * 0.3), r() * 3, 0, Math.PI * 2);
      else { x.save(); x.translate(px, py); x.rotate(r() * 3); x.rect(-s, -s * 0.3, s * 2, s * 0.6); x.restore(); }
      x.fill();
    }
  });
}
/* borders: the material a world builds its walls from, tinted by its wall colour */
function wallCanvas(kind, hex) {
  return cachedCanvas(`wall:${kind}:${hex}`, 256, 256, (x, w, h) => {
    const [r0, g0, b0] = hexRGB(hex), r = rng32(13), m = fbm(19, 4, 4), n = noiseField(23, 64);
    if (kind === 'wood') {
      /* timber: grain runs along the board (u), with knots and a few plank seams */
      const g = fbm(31, 8, 3);
      paint(x, w, h, (u, v) => { const s = Math.sin((v * 22 + g(u * 0.3, v) * 6) * Math.PI) * 0.5 + 0.5, k = 0.78 + 0.18 * s + 0.08 * m(u, v); return [r0 * k, g0 * k, b0 * k]; });
      x.fillStyle = 'rgba(40,24,10,0.35)'; for (let i = 0; i < 4; i++) x.fillRect(0, (i * 64 + 62) % h, w, 2);
    } else if (kind === 'stone' || kind === 'brick') {
      /* blocks with mortar joints; stone blocks vary in length and tone */
      const rows = kind === 'brick' ? 8 : 4;
      paint(x, w, h, (u, v) => { const k = 0.82 + 0.2 * m(u, v) + 0.1 * (n(u, v) - 0.5); return [r0 * k, g0 * k, b0 * k]; });
      for (let j = 0; j < rows; j++) {
        let u = (j % 2) * (kind === 'brick' ? 0.25 : 0.17);
        while (u < 1.2) {
          const len = kind === 'brick' ? 0.5 : 0.25 + r() * 0.35, k = 0.86 + r() * 0.24;
          x.fillStyle = `rgba(${r0 * k | 0},${g0 * k | 0},${b0 * k | 0},0.55)`;
          x.fillRect((u % 1) * w, j * h / rows, len * w, h / rows);
          x.fillStyle = 'rgba(30,24,20,0.55)'; x.fillRect((u % 1) * w - 1, j * h / rows, 3, h / rows);
          u += len;
        }
        x.fillStyle = 'rgba(30,24,20,0.55)'; x.fillRect(0, j * h / rows - 1, w, 3);
      }
    } else if (kind === 'steel') {
      /* painted steel: brushed streaks, a few rivets */
      paint(x, w, h, (u, v) => { const k = 0.86 + 0.1 * n(u * 0.05, v * 3) + 0.06 * m(u, v); return [r0 * k, g0 * k, b0 * k]; });
      x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc((i + 0.5) * w / 8, h * 0.2, 3, 0, 7); x.fill(); x.beginPath(); x.arc((i + 0.5) * w / 8, h * 0.8, 3, 0, 7); x.fill(); }
    } else if (kind === 'marble') {
      const g = fbm(37, 4, 5);
      paint(x, w, h, (u, v) => { const vein = Math.pow(Math.abs(Math.sin((u * 3 + v * 2 + g(u, v) * 4) * Math.PI)), 0.25), k = 0.84 + 0.16 * vein; return [r0 * k, g0 * k, b0 * k]; });
    } else {
      paint(x, w, h, (u, v) => { const k = 0.93 + 0.08 * m(u, v); return [r0 * k, g0 * k, b0 * k]; });
    }
  });
}
function wallNormalCanvas(kind) {
  if (kind === 'wood') { const g = fbm(31, 8, 3); return normalCanvas('wood', 128, (u, v) => Math.sin((v * 22 + g(u * 0.3, v) * 6) * Math.PI) * 0.5, 1.6); }
  if (kind === 'stone' || kind === 'brick') { const rows = kind === 'brick' ? 8 : 4, m = fbm(53, 8, 3); return normalCanvas(kind, 128, (u, v) => { const fv = (v * rows) % 1; return (fv < 0.05 || fv > 0.95 ? -1 : 0) + m(u, v) * 0.8; }, 2.4); }
  const n = fbm(59, 16, 2);
  return normalCanvas('fine', 128, (u, v) => n(u, v) * 0.4, 1.2);
}
/* UVs for a wall box in metres along its length and height, so one texture tiles at real scale */
function scaleBoxUV(geo, len, hgt, wid, tile = 0.5) {
  const uv = geo.attributes.uv, dims = [[len, hgt], [len, hgt], [wid, len], [wid, len], [wid, hgt], [wid, hgt]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  uv.needsUpdate = true;
  return geo;
}
/* ---- one sky: the visible dome and the image-based light come from the same shader, so the
   horizon tracks the camera and the light holds real (above 1) energy. Colours are linear. ---- */
const SKY = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() },
  sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(1, 0.93, 0.8) }, disc: { value: 1 } };
let skyDome = null, envScene = null, envRT = null, envKey = '';
function initSky() {
  const m = new THREE.ShaderMaterial({ uniforms: SKY, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vDir;\nvoid main() { vDir = position; gl_Position = ( projectionMatrix * modelViewMatrix * vec4( position, 1.0 ) ).xyww; }',
    fragmentShader: `uniform vec3 top, horizon, ground, sunDir, sunCol; uniform float disc; varying vec3 vDir;
      void main() {
        vec3 d = normalize( vDir );
        vec3 c = d.y > 0.0 ? mix( horizon, top, pow( d.y, 0.5 ) ) : mix( horizon, ground, pow( -d.y, 0.3 ) );
        float s = max( dot( d, sunDir ), 0.0 );
        c += sunCol * ( pow( s, 8.0 ) * 0.25 + pow( s, 64.0 ) * 0.6 );
        c += sunCol * smoothstep( 0.9995, 0.9998, s ) * 20.0 * disc;
        gl_FragColor = vec4( c, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const g = new THREE.SphereGeometry(100, 32, 16);
  skyDome = new THREE.Mesh(g, m); skyDome.frustumCulled = false; skyDome.renderOrder = 1000; skyDome.name = 'sky';
  scene.add(skyDome);
  envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(g, m));
}
function setSky(look) {
  SKY.top.value.set(look.sky[0]); SKY.horizon.value.set(look.sky[1]); SKY.ground.value.set(look.ground || '#55603f');
  SKY.sunDir.value.copy(sun.position).sub(sun.target.position).normalize();
  SKY.sunCol.value.set(look.night ? 0x9a8cff : 0xfff0d8);
  const key = look.sky.join() + (look.ground || '') + (look.night ? 'n' : '');
  if (key !== envKey) {
    /* once per look, never per frame; the disc stays out of the light (the sun lamp gives its highlight) */
    SKY.disc.value = 0;
    const pm = new THREE.PMREMGenerator(renderer);
    if (envRT) envRT.dispose();
    envRT = pm.fromScene(envScene, 0.02, 0.1, 200); pm.dispose(); envKey = key;
  }
  SKY.disc.value = look.night ? 0 : 1;
  scene.environment = envRT.texture; scene.background = null;
}
/* the sun's shadow box fitted tightly round the hole in the light's own space: more texels per metre */
const _fitM = new THREE.Matrix4(), _fitP = new THREE.Vector3();
function fitSun(h) {
  const B = holeBounds(h), c = new THREE.Vector3(B.cx, 0, B.cz), dir = new THREE.Vector3(5, 6.5, -4.5).normalize();
  sun.target.position.copy(c); sun.position.copy(c).addScaledVector(dir, 12);
  sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
  const cam = sun.shadow.camera; cam.position.copy(sun.position); cam.lookAt(c); cam.updateMatrixWorld();
  _fitM.copy(cam.matrixWorld).invert();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const x of [B.x0 - 0.4, B.x1 + 0.4]) for (const y of [-0.6, 1.2]) for (const z of [B.z0 - 0.4, B.z1 + 0.4]) {
    _fitP.set(x, y, z).applyMatrix4(_fitM);
    x0 = Math.min(x0, _fitP.x); x1 = Math.max(x1, _fitP.x); y0 = Math.min(y0, _fitP.y); y1 = Math.max(y1, _fitP.y); z0 = Math.min(z0, _fitP.z); z1 = Math.max(z1, _fitP.z);
  }
  const half = Math.max(x1 - x0, y1 - y0) / 2, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  Object.assign(cam, { left: mx - half, right: mx + half, bottom: my - half, top: my + half, near: Math.max(0.1, -z1 - 0.5), far: -z0 + 0.5 });
  cam.updateProjectionMatrix();
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
/* dimples: 336 of them spread evenly on a Fibonacci sphere (no pinching at the poles), baked to a
   normal map in the sphere's own UVs; the clear urethane topcoat follows them too */
function dimpleNormalCanvas(n = 336, W = 512, H = 256) {
  return cachedCanvas('dimples:' + n, W, H, x => {
    const ga = Math.PI * (3 - Math.sqrt(5)), C = [];
    for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - y * y); C.push([Math.cos(i * ga) * r, y, Math.sin(i * ga) * r]); }
    const R = 0.48 * Math.sqrt(8 * Math.PI / (Math.sqrt(3) * n)), Hh = new Float32Array(W * H);
    for (let j = 0; j < H; j++) {
      const th = (j + 0.5) / H * Math.PI, st = Math.sin(th), ct = Math.cos(th), cand = C.filter(c => Math.abs(c[1] - ct) < R);
      for (let i = 0; i < W; i++) {
        const ph = (i + 0.5) / W * Math.PI * 2, dx = -Math.cos(ph) * st, dz = Math.sin(ph) * st;
        let best = 4; for (const c of cand) { const e = (dx - c[0]) ** 2 + (ct - c[1]) ** 2 + (dz - c[2]) ** 2; if (e < best) best = e; }
        const t = Math.sqrt(best) / R; Hh[j * W + i] = t < 1 ? -(1 - t * t) : 0;
      }
    }
    const at = (i, j) => Hh[Math.min(H - 1, Math.max(0, j)) * W + ((i + W) % W)];
    paint(x, W, H, (u, v, i, j) => {
      const st = Math.max(0.15, Math.sin((j + 0.5) / H * Math.PI)), k = 3.0;
      const gx = (at(i + 1, j) - at(i - 1, j)) * k / st, gy = (at(i, j + 1) - at(i, j - 1)) * k, l = Math.hypot(gx, gy, 1);
      return [(-gx / l * 0.5 + 0.5) * 255, (gy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
    });
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
function holeBounds(h) {
  const pts = h.floors.flat(), xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, ext: Math.max(x1 - x0, z1 - z0) / 2 };
}
/* a grid over the hole's bounding box keeping cells whose centre passes `keep`; vertex heights
   follow groundH so bumps, bowls, tiers and ramps are real geometry */
function gridGeometry(h, keep, lift = 0, shade = null) {
  const B = holeBounds(h), C = (B.x1 - B.x0) * (B.z1 - B.z0) > 60 ? 0.07 : 0.05;
  const nx = Math.ceil((B.x1 - B.x0) / C), nz = Math.ceil((B.z1 - B.z0) / C);
  const pos = [], uv = [], idx = [], col = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = B.x0 + i * C, z = B.z0 + j * C;
    pos.push(x, groundH(h, x, z) + lift, z); uv.push(x * 1.5, z * 1.5);
    if (shade) { const k = shade(x, z); col.push(k, k, k); }
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (!keep(B.x0 + (i + 0.5) * C, B.z0 + (j + 0.5) * C)) continue;
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (shade) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  /* normals straight from the ground's own shape (central differences), so there are no dark seams
     where the grid is cut round the cup or at a tier's lip */
  const nor = [], e = 0.02;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], z = pos[i + 2], nx = groundH(h, x - e, z) - groundH(h, x + e, z), nz = groundH(h, x, z - e) - groundH(h, x, z + e), l = Math.hypot(nx, 2 * e, nz);
    nor.push(nx / l, 2 * e / l, nz / l);
  }
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
/* the turf's baked light, per vertex: contact shadow where it meets a wall, a post or the foot of a
   step, and a slow mottle so no two metres match (the mowing stripes live in the turf shader) */
function floorShade(h) {
  const mott = noiseField(97 + h.key.length, 64);
  return (x, z) => {
    let ao = 1;
    for (let i = 0; i < h.segs.length; i++) {
      const bb = h.segBox[i];
      if (x < bb[0] - 0.1 || x > bb[1] + 0.1 || z < bb[2] - 0.1 || z > bb[3] + 0.1) continue;
      const s = h.segs[i], p = closestOnSeg(s[0], s[1], s[2], s[3], x, z), d = Math.hypot(x - p[0], z - p[1]) - WALL_HALF;
      ao = Math.min(ao, 1 - 0.34 * Math.exp(-Math.max(0, d) / 0.045));
    }
    for (const p of h.posts) { const d = Math.hypot(x - p.x, z - p.z) - p.r; if (d < 0.25) ao = Math.min(ao, 1 - 0.3 * Math.exp(-Math.max(0, d) / 0.035)); }
    const y = groundH(h, x, z);
    let rise = 0;
    for (const [ox, oz] of [[0.05, 0], [-0.05, 0], [0, 0.05], [0, -0.05]]) rise = Math.max(rise, groundH(h, x + ox, z + oz) - y);
    if (rise > 0.02) ao *= 1 - Math.min(0.28, (rise - 0.02) * 4);
    return ao * (0.96 + 0.08 * mott(x / 9, z / 9));
  };
}
/* walls stand from below their lowest ground to WALL_TOP over their highest, as the physics measures them */
function wallGroup(h, m) {
  const g = new THREE.Group(); g.name = 'walls';
  h.segs.forEach(([ax, az, bx, bz], i) => {
    const len = Math.hypot(bx - ax, bz - az), top = h.segTop[i][0], lo = Math.min(0, h.segTop[i][1]) - 0.03;
    const w = new THREE.Mesh(scaleBoxUV(new THREE.BoxGeometry(WALL_HALF * 2, top - lo, len), len, top - lo, WALL_HALF * 2), m);
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
  const shade = floorShade(h), col = [];
  rings.forEach(r => { for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, k = shade(x, z); pos.push(x, groundH(h, x, z) + 0.0015, z); uv.push(x * 1.5, z * 1.5); col.push(k, k, k); } });
  for (let k = 0; k + 1 < rings.length; k++) for (let i = 0; i < N; i++) { const a = k * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
function cupGroup(h, look) {
  const g = new THREE.Group(), y = groundH(h, h.cup[0], h.cup[1]);
  g.name = 'cup'; g.position.set(h.cup[0], y, h.cup[1]);
  const SEG = 64, CUT = 0.018;
  /* the cut band above the liner is painted white, as on a tournament green */
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R, CUP_R, CUT, SEG, 1, true), mat(look.night ? '#2b2620' : '#eeeae0', { roughness: 0.9, side: THREE.BackSide })); soil.position.y = -CUT / 2 + 0.001;
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
  /* a real course flag: the hole's number printed on it, the right way round on both faces, waving
     in the breeze (a vertex wave that grows toward the fly end; its shadow waves too) */
  const flagGeo = new THREE.PlaneGeometry(0.22, 0.14, 12, 4).translate(0.11, -0.07, 0), n = h.key.split('-')[1];
  const face = flip => { const t = flagTexture(look.flag, n); t.repeat.set(flip ? -1 : 1, 1); t.offset.set(flip ? 1 : 0, 0); return t; };
  const flag = new THREE.Mesh(flagGeo, waveMat(mat('#ffffff', { map: face(false), side: THREE.FrontSide, roughness: 0.75 }))), back = new THREE.Mesh(flagGeo, waveMat(mat('#ffffff', { map: face(true), side: THREE.BackSide, roughness: 0.75 })));
  for (const f of [flag, back]) { f.position.set(0.007, 0.69, 0); f.castShadow = true; f.customDepthMaterial = waveMat(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })); }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), mat('#fffdf7', { roughness: 0.35 })); ball.position.y = 0.705;
  flagGroup.add(pole, band, flag, back, ball);
  /* the cup's brushed metal ferrule, the ring a real cup shows just below the turf */
  const ferrule = new THREE.Mesh(new THREE.TorusGeometry(CUP_R - 0.003, 0.0035, 8, SEG), mat('#d8dde3', { roughness: 0.28, metalness: 0.9 }));
  ferrule.rotation.x = Math.PI / 2; ferrule.position.y = -CUT + 0.002;
  g.add(soil, liner, lip, ferrule, bottom, drain, shade, flagGroup);
  return g;
}
function waveMat(m) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uT = FX_TIME;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float k = position.x / 0.22; transformed.z += sin( position.x * 28.0 - uT * 6.0 ) * 0.012 * k; transformed.y -= 0.01 * k * k;`);
  };
  m.customProgramCacheKey = () => 'flag-wave-' + m.type;
  return m;
}
function flagTexture(hex, n) {
  return canvasTex(128, 96, x => {
    x.fillStyle = hex; x.fillRect(0, 0, 128, 96);
    x.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 128; i += 6) x.fillRect(i, 0, 2, 96);
    x.fillStyle = '#fffdf7'; x.font = '900 62px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(n, 50, 52);
  });
}
/* the tee: a rubber tee mat with its moulded tee spot, square to the line of play, cut to fit the
   floor; and a ball-shaped hole marker on a short post just outside the border beside it */
function teeGroup(h, look) {
  const g = new THREE.Group(); g.name = 'tee';
  const [tx, tz] = h.tee, a = (h.aim0 !== undefined ? h.aim0 : Math.atan2(h.cup[0] - tx, h.cup[1] - tz) * 180 / Math.PI) * Math.PI / 180;
  const ux = Math.sin(a), uz = Math.cos(a), px = Math.cos(a), pz = -Math.sin(a), y = groundH(h, tx, tz);
  const fits = (w, l) => [[-w, -l * 0.35], [w, -l * 0.35], [-w, l * 0.65], [w, l * 0.65]].every(([s, f]) => {
    const x = tx + px * s + ux * f, z = tz + pz * s + uz * f;
    return onFloor(h, x, z) && Math.abs(groundH(h, x, z) - y) < 0.004 && h.segs.every(sg => { const p = closestOnSeg(sg[0], sg[1], sg[2], sg[3], x, z); return hyp(x - p[0], z - p[1]) > WALL_HALF + 0.015; });
  });
  let w = 0.16, l = 0.42;
  while (w > 0.06 && !fits(w, l)) { w *= 0.85; l *= 0.85; }
  if (fits(w, l)) {
    const mt = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, l), mat('#ffffff', { map: teeMatTexture(), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }));
    mt.rotation.x = -Math.PI / 2; mt.rotation.z = a; mt.position.set(tx + ux * l * 0.15, y + 0.0015, tz + uz * l * 0.15); mt.receiveShadow = true; mt.renderOrder = 1;
    g.add(mt);
  }
  /* the marker: beside the tee, out past the nearest border, on open ground only */
  if (look.ground && !look.night) {
    for (const side of [1, -1]) {
      let d = 0.25;
      while (d < 1.6 && (onFloor(h, tx + px * side * d, tz + pz * side * d) || h.segs.some(sg => { const p = closestOnSeg(sg[0], sg[1], sg[2], sg[3], tx + px * side * d, tz + pz * side * d); return hyp(tx + px * side * d - p[0], tz + pz * side * d - p[1]) < 0.22; }))) d += 0.05;
      const mx = tx + px * side * d - ux * 0.15, mz = tz + pz * side * d - uz * 0.15;
      if (d >= 1.6 || h.floors.some(f => inPoly(f, mx, mz))) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), mat('#6b6f74', { roughness: 0.5, metalness: 0.6 })); post.position.set(mx, -0.03 + 0.11, mz); post.castShadow = true;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 32), [mat('#e9e4d8', { roughness: 0.5 }), mat('#ffffff', { map: markerTexture(h.key.split('-')[1], look.flag), roughness: 0.5 }), mat('#ffffff', { map: markerTexture(h.key.split('-')[1], look.flag), roughness: 0.5 })]);
      disc.rotation.set(Math.PI / 2, 0, 0); disc.rotation.order = 'YXZ'; disc.rotation.y = a + Math.PI; disc.position.set(mx, -0.03 + 0.27, mz); disc.castShadow = true;
      g.add(post, disc);
      break;
    }
  }
  return g;
}
function teeMatTexture() {
  return canvasTex(64, 128, x => {
    x.fillStyle = '#2b2f2c'; x.fillRect(0, 0, 64, 128);
    const r = rng32(5); for (let i = 0; i < 500; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.15)'; x.fillRect(r() * 64, r() * 128, 1.5, 1.5); }
    x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 3; x.strokeRect(3, 3, 58, 122);
    x.fillStyle = '#1b1e1c'; x.beginPath(); x.arc(32, 128 * 0.35, 7, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 2; x.beginPath(); x.arc(32, 128 * 0.35, 9, 0, 7); x.stroke();
  });
}
function markerTexture(n, hex) {
  return canvasTex(128, 128, x => {
    x.fillStyle = '#fffdf7'; x.beginPath(); x.arc(64, 64, 64, 0, 7); x.fill();
    x.strokeStyle = hex; x.lineWidth = 10; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.stroke();
    x.fillStyle = '#3a3026'; x.font = '900 64px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 64, 68);
  });
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
      /* a shape per pair as well as a colour, so the pairs read without colour vision */
      const glyph = new THREE.Mesh(new THREE.ShapeGeometry(tubeGlyph(i)), new THREE.MeshBasicMaterial({ color: col, toneMapped: false, side: THREE.DoubleSide }));
      glyph.rotation.x = -Math.PI / 2; glyph.position.y = 0.005; o.add(glyph);
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
function tubeGlyph(i) {
  const s = new THREE.Shape(), r = 0.035, k = i % 4;
  if (k === 0) s.absarc(0, 0, r * 0.8, 0, Math.PI * 2);
  else if (k === 1) { s.moveTo(0, r); s.lineTo(r * 0.95, -r * 0.7); s.lineTo(-r * 0.95, -r * 0.7); s.closePath(); }
  else if (k === 2) { s.moveTo(-r * 0.75, -r * 0.75); s.lineTo(r * 0.75, -r * 0.75); s.lineTo(r * 0.75, r * 0.75); s.lineTo(-r * 0.75, r * 0.75); s.closePath(); }
  else for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5 + Math.PI / 2, rr = j % 2 ? r * 0.45 : r; j ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  return s;
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
    const o = look.prop(r); o.position.set(x, 0, z); o.rotation.y = r() * Math.PI * 2; o.userData.prop = true; group.add(o); n++;
  }
}
const TEX_SLOTS = ['map', 'normalMap', 'roughnessMap', 'bumpMap', 'emissiveMap', 'alphaMap', 'aoMap', 'clearcoatNormalMap'];
function disposeGroup(g) {
  g.traverse(o => {
    if (o.isInstancedMesh) o.dispose();   /* frees its per-instance buffers */
    if (o.customDepthMaterial) o.customDepthMaterial.dispose();
    if (o.geometry) o.geometry.dispose();
    const ms = o.material ? [].concat(o.material) : [];
    for (const m of ms) { for (const k of TEX_SLOTS) if (m[k] && !(m[k].userData && m[k].userData.keep)) m[k].dispose(); m.dispose(); }
  });
}
const holeWorld = h => Number(h.key.split('-')[0]);
/* the putting surface: a real-looking carpet of turf. Sheen gives it the soft velvet glow turf has
   against the light; the baked shade rides in the vertex colours. Night keeps its flat black-light look. */
function turfMaterial(hex, o = {}) {
  const c = new THREE.Color(hex), m = new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xffffff, map: texOf(turfCanvas(hex)), normalMap: texOf(turfNormal(), false), normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.93, sheen: 0.42, sheenRoughness: 0.42, sheenColor: c.clone().lerp(new THREE.Color(0xcfe39a), 0.6), vertexColors: true }, o));
  patchTurf(m);
  return m;
}
/* mowing stripes the way real ones work: each band's blades lean the way it was cut, so a band reads
   light when its blades lean away from you and dark when they lean toward you, and the bands swap as
   the camera turns. Plus a slow world-space mottle that breaks the texture's tiling, and a touch of
   roughness variation. Shared uniforms: set per hole, no recompile. */
/* time for decorative shader motion (water ripples): frozen under reduced motion */
const FX_TIME = { value: 0 };
const TURF_U = { uAlong: { value: new THREE.Vector2(0, 1) }, uStripeW: { value: 0.7 }, uStripeK: { value: 0.13 } };
function patchTurf(mat) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, TURF_U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vWXZ; uniform vec2 uAlong; uniform float uStripeW, uStripeK;
        float h21( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
        float vnoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
          return mix( mix( h21( i ), h21( i + vec2( 1, 0 ) ), f.x ), mix( h21( i + vec2( 0, 1 ) ), h21( i + vec2( 1, 1 ) ), f.x ), f.y ); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 across = vec2( -uAlong.y, uAlong.x );
        float mown = clamp( sin( dot( vWXZ, across ) * PI / uStripeW ) * 6.0, -1.0, 1.0 );
        vec2 toCam = normalize( cameraPosition.xz - vWXZ + 1e-4 );
        float away = -mown * dot( uAlong, toCam );
        float macro = vnoise( vWXZ * 0.35 ) * 0.6 + vnoise( vWXZ * 1.7 ) * 0.4;
        diffuseColor.rgb *= ( 1.0 + uStripeK * away ) * ( 0.93 + 0.14 * macro );`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp( roughnessFactor + 0.06 * ( 0.5 - macro ) - 0.04 * away, 0.0, 1.0 );`);
  };
  mat.customProgramCacheKey = () => 'turf-v1';
}
/* the world's border material: timber, stone, brick, painted steel, marble, or plain paint */
const WALL_KIND_OF = { 1: 'steel', 2: 'stone', 3: 'stone', 4: 'wood', 5: 'wood', 6: 'stone', 7: 'brick', 8: 'steel', 9: 'paint', 10: 'marble' };
function wallMaterial(look, w) {
  const kind = look.night ? 'paint' : look.wallKind || WALL_KIND_OF[worldOf(w)] || 'wood';
  const metal = kind === 'steel' ? 0.45 : 0, rough = { wood: 0.78, stone: 0.9, brick: 0.92, steel: 0.42, marble: 0.35, paint: 0.5 }[kind];
  return new THREE.MeshStandardMaterial({ color: 0xffffff, map: texOf(wallCanvas(kind, look.wall)), normalMap: texOf(wallNormalCanvas(kind), false), normalScale: new THREE.Vector2(0.7, 0.7), roughness: rough, metalness: metal });
}
function zoneMaterial(zn, look) {
  if (zn.push) {
    const t = flowTexture(look.push); t.center.set(0.5, 0.5); t.rotation = -Math.atan2(zn.push[0], zn.push[1]);
    flowTex.push({ t, speed: Math.hypot(zn.push[0], zn.push[1]) });
    return mat('#ffffff', { map: t, roughness: 0.6, normalMap: texOf(wallNormalCanvas('fine'), false) });
  }
  switch (zn.surf) {
    case 'ice': return new THREE.MeshPhysicalMaterial({ color: look.ice, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.9, envMapIntensity: 1.4 });
    case 'water': {
      /* real water: a 2% mirror at normal incidence (IOR 1.333) that grows to a full mirror at grazing
         angles, over two ripple layers drifting against each other so the surface never repeats */
      const t = waterTexture(look.water); flowTex.push({ t, speed: 0.25 }); const n = texOf(normalCanvas('ripple', 128, fbm(83, 4, 3), 3), false);
      const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: t, normalMap: n, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.05, metalness: 0, ior: 1.333, transparent: true, opacity: 0.9, envMapIntensity: 1.2 });
      m.onBeforeCompile = sh => {
        sh.uniforms.uT = FX_TIME;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT;')
          .replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
            `vec3 mapN = normalize( texture2D( normalMap, vNormalMapUv + uT * vec2( 0.031, 0.017 ) ).xyz * 2.0 - 1.0
              + texture2D( normalMap, vNormalMapUv * 1.7 - uT * vec2( 0.023, -0.029 ) ).xyz * 2.0 - 1.0 );`);
      };
      m.customProgramCacheKey = () => 'water-v1';
      return m;
    }
    case 'fast': return turfMaterial(look.fast, { roughness: 0.6, sheen: 0.35, normalScale: new THREE.Vector2(0.25, 0.25), vertexColors: false });
    case 'mud': return mat('#ffffff', { map: texOf(grainCanvas('mud', look.mud, { contrast: 0.3, speck: 0.08, seed: 9 })), normalMap: texOf(normalCanvas('mud', 128, fbm(87, 8, 3), 3), false), roughness: 0.75 });
    default: return mat('#ffffff', { map: texOf(grainCanvas('sand', look.sand, { scale: 128, contrast: 0.18, speck: 0.22, seed: 7 })), normalMap: texOf(normalCanvas('sand', 128, noiseField(89, 64), 1.5), false), roughness: 1 });
  }
}
/* the ground beyond the course: lawn, desert, snow or rock in the world's colour, with grain */
function groundMaterial(look) {
  const t = texOf(grainCanvas('ground', look.ground, { scale: 96, contrast: 0.22, speck: 0.16, seed: 3 }), true, 48), n = texOf(normalCanvas('ground', 128, fbm(91, 8, 3), 2.5), false, 48);
  return mat('#ffffff', { map: t, normalMap: n, roughness: 1, depthWrite: false, vertexColors: true });
}
/* the border's cap rail: one merged mesh of slightly wider boards along every wall's top, so each
   border reads as a built thing (a timber cap, a stone coping, a steel rail top) */
const CAP_COL = { wood: 0.72, stone: 1.12, brick: 1.08, steel: 1.18, marble: 1.06, paint: 0.9 };
function wallCaps(h, look) {
  if (look.night) return null;
  const kind = look.wallKind || WALL_KIND_OF[worldOf(holeWorld(h))] || 'wood', pos = [], nor = [], uv = [], idx = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  h.segs.forEach(([ax, az, bx, bz], i) => {
    const len = Math.hypot(bx - ax, bz - az), g = scaleBoxUV(new THREE.BoxGeometry(WALL_HALF * 2 + 0.014, 0.016, len + 0.008), len, 0.016, WALL_HALF * 2);
    m4.compose(new THREE.Vector3((ax + bx) / 2, h.segTop[i][0] - 0.0075, (az + bz) / 2), q.setFromAxisAngle(up, Math.atan2(bx - ax, bz - az)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m4);
    const base = pos.length / 3, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    for (let k = 0; k < P.count; k++) { pos.push(P.getX(k), P.getY(k), P.getZ(k)); nor.push(N.getX(k), N.getY(k), N.getZ(k)); uv.push(U.getX(k), U.getY(k)); }
    for (let k = 0; k < g.index.count; k++) idx.push(base + g.index.getX(k));
    g.dispose();
  });
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const c = new THREE.Color(look.wall).multiplyScalar(CAP_COL[kind] || 1);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff, map: texOf(wallCanvas(kind, '#' + c.getHexString())), normalMap: texOf(wallNormalCanvas(kind), false), roughness: kind === 'steel' ? 0.38 : 0.8, metalness: kind === 'steel' ? 0.45 : 0 }));
  m.name = 'wallCaps'; m.castShadow = true; m.receiveShadow = true;
  return m;
}
/* landscaping close round the course: river rock scattered on the edging bed, and grass tufts on a
   grassy lawn. Instanced, seeded by the hole's key, never on a floor or against a wall. */
function landscape(h, look) {
  if (!look.ground || look.night) return null;
  const g = new THREE.Group(), r = rng32([...h.key].reduce((a, c) => a * 31 + c.charCodeAt(0), 11)), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  const edges = [];
  for (const f of h.floors) {
    if (f.some(([x, z]) => Math.abs(groundH(h, x, z)) > 0.02)) continue;
    let area = 0;
    for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length]; area += a[0] * b[1] - b[0] * a[1]; }
    for (let i = 0; i < f.length; i++) { const [ax, az] = f[i], [bx, bz] = f[(i + 1) % f.length], L = Math.hypot(bx - ax, bz - az); if (L > 0.05) edges.push([ax, az, bx, bz, L, area > 0 ? 1 : -1]); }
  }
  if (!edges.length) return null;
  const total = edges.reduce((a, e) => a + e[4], 0), clear = (x, z, d) => !h.floors.some(f => inPoly(f, x, z)) && h.segs.every(s => { const c = closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - c[0], z - c[1]) > d; });
  const pick = (o0, o1) => {
    let u = r() * total;
    for (const [ax, az, bx, bz, L, sg] of edges) {
      if ((u -= L) > 0) continue;
      const t = r(), nx = (bz - az) / L * sg, nz = -(bx - ax) / L * sg, o = o0 + r() * (o1 - o0);
      return [ax + (bx - ax) * t + nx * o, az + (bz - az) * t + nz * o];
    }
    return null;
  };
  const e = look.edging || EDGING_OF[worldOf(holeWorld(h))];
  if (e) {
    /* river rock: flattened little dodecahedra, grey to warm, on the bed */
    const n = Math.min(260, Math.round(total * 9)), rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.85 }), n);
    let k = 0;
    for (let tries = 0; k < n && tries < n * 6; tries++) {
      const at = pick(WALL_HALF + 0.05, WALL_HALF + 0.3);
      if (!at || !clear(at[0], at[1], WALL_HALF + 0.04)) continue;
      const s = 0.012 + r() * 0.022;
      m4.compose(p.set(at[0], -0.03 + s * 0.35, at[1]), q.setFromAxisAngle(sc.set(r(), r(), r()).normalize(), r() * 6.28), sc.set(s * (1 + r() * 0.5), s * 0.55, s));
      rocks.setMatrixAt(k, m4); rocks.setColorAt(k++, col.set(e[1]).multiplyScalar(0.75 + r() * 0.5));
    }
    rocks.count = k; rocks.receiveShadow = true; rocks.instanceMatrix.needsUpdate = true; if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    if (k) g.add(rocks); else rocks.geometry.dispose();
  }
  const hsl = {}; new THREE.Color(look.ground).getHSL(hsl);
  if (hsl.h > 0.15 && hsl.h < 0.45 && hsl.l > 0.12 && hsl.l < 0.6) {
    /* grass tufts: a few lean blades each, solid (no alpha test), lit like the ground they stand on */
    const pos = [], cl = [], nor = [], tr = rng32(5);
    for (let b = 0; b < 7; b++) {
      const a = b / 7 * Math.PI * 2 + tr() * 0.5, lean = 0.25 + tr() * 0.35, hgt = 0.05 + tr() * 0.05, w = 0.004, cx = Math.cos(a), cz = Math.sin(a);
      pos.push(-cz * w, 0, cx * w, cz * w, 0, -cx * w, cx * hgt * lean, hgt, cz * hgt * lean);
      cl.push(0.3, 0.4, 0.16, 0.3, 0.4, 0.16, 0.72, 0.82, 0.42); nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
    const n = Math.min(500, Math.round(total * 18)), tufts = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }), n);
    let k = 0;
    for (let tries = 0; k < n && tries < n * 6; tries++) {
      const at = pick(WALL_HALF + 0.36, WALL_HALF + 1.2);
      if (!at || !clear(at[0], at[1], WALL_HALF + 0.3)) continue;
      m4.compose(p.set(at[0], -0.03, at[1]), q.setFromAxisAngle(sc.set(0, 1, 0), r() * 6.28), sc.setScalar(0.7 + r() * 0.8));
      tufts.setMatrixAt(k, m4); tufts.setColorAt(k++, col.setHSL(hsl.h + (r() - 0.5) * 0.05, 0.45, 0.42 + r() * 0.12));
    }
    tufts.count = k; tufts.receiveShadow = true; tufts.instanceMatrix.needsUpdate = true; if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
    if (k) g.add(tufts); else tufts.geometry.dispose();
  }
  g.name = 'landscape';
  return g.children.length ? g : null;
}
/* landscaping: a bed of mulch or river rock round the course's outline, as real courses have */
const EDGING_OF = { 1: ['rock', '#9a9086'], 2: ['rock', '#c08a5a'], 3: ['mulch', '#6b4a2e'], 4: ['rock', '#c9d6de'], 5: ['rock', '#d8c39a'], 6: ['rock', '#3a3236'], 7: ['mulch', '#4a3a3a'], 9: ['mulch', '#c98a5a'] };
function edgingGroup(h, look) {
  const e = look.edging || EDGING_OF[worldOf(holeWorld(h))];
  if (!e || !look.ground || look.night) return null;
  const W = 0.32, pos = [], uv = [], idx = [];
  for (const f of h.floors) {
    if (f.some(([x, z]) => Math.abs(groundH(h, x, z)) > 0.02)) continue;   /* only floors that meet the ground */
    let area = 0;
    for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const sg = area > 0 ? -1 : 1;
    for (let i = 0; i < f.length; i++) {
      const [ax, az] = f[i], [bx, bz] = f[(i + 1) % f.length], L = Math.hypot(bx - ax, bz - az) || 1, nx = (bz - az) / L * sg * -1, nz = -(bx - ax) / L * sg * -1;
      const v = pos.length / 3, o = WALL_HALF + 0.01;
      for (const [x, z, d] of [[ax, az, o], [bx, bz, o], [ax, az, o + W], [bx, bz, o + W]]) { const px = x + nx * d, pz = z + nz * d; pos.push(px, -0.027, pz); uv.push(px * 1.2, pz * 1.2); }
      idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat('#ffffff', { map: texOf(edgingCanvas(e[0], e[1])), roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }));
  m.name = 'edging'; m.receiveShadow = true; m.renderOrder = -1;
  return m;
}
function buildHoleScene(h) {
  if (holeGroup) { scene.remove(holeGroup); disposeGroup(holeGroup); }
  flowTex = [];
  const look = lookOf(holeWorld(h)), off = (x, z) => Math.hypot(x - h.cup[0], z - h.cup[1]) >= COLLAR_R && h.tubes.every(t => Math.hypot(x - t.a[0], z - t.a[1]) >= TUBE_R * 0.9);
  holeGroup = new THREE.Group(); moverMeshes = [];
  const floor = new THREE.Mesh(gridGeometry(h, (x, z) => onFloor(h, x, z) && off(x, z), 0, floorShade(h)), turfMaterial(look.felt));
  floor.name = 'floor'; floor.receiveShadow = true; holeGroup.add(floor);
  const collar = new THREE.Mesh(collarGeometry(h), floor.material); collar.name = 'collar'; collar.receiveShadow = true; holeGroup.add(collar);
  for (const zn of h.zones) {
    const z = new THREE.Mesh(gridGeometry(h, (x, zz) => zoneAt(h, x, zz) === zn && onFloor(h, x, zz) && off(x, zz), zn.surf === 'water' ? 0.002 : 0.004), zoneMaterial(zn, look));
    z.receiveShadow = true; holeGroup.add(z);
  }
  const skirt = new THREE.Mesh(skirtGeometry(h, look.ground ? -0.03 : -0.5), mat('#ffffff', { map: texOf(wallCanvas('stone', look.skirt)), normalMap: texOf(wallNormalCanvas('stone'), false), roughness: 0.92, side: THREE.DoubleSide }));
  skirt.name = 'skirt'; holeGroup.add(skirt);
  holeGroup.add(wallGroup(h, wallMaterial(look, holeWorld(h))), cupGroup(h, look), tubeGroup(h), teeGroup(h, look));
  const caps = wallCaps(h, look); if (caps) holeGroup.add(caps);
  for (const p of h.posts) { const o = (look.post || defaultPost)(p, look); o.position.set(p.x, groundH(h, p.x, p.z), p.z); holeGroup.add(o); }
  for (const mv of h.movers) { const o = (look.mover || defaultMover)(mv, look); o.userData.mover = mv; moverMeshes.push(o); holeGroup.add(o); }
  if (look.ground) {
    /* drawn first without depth, so bowls that dip below it still show: the ground is backdrop */
    const gg = new THREE.PlaneGeometry(120, 120, 60, 60), gp = gg.attributes.position, gn = fbm(113, 4, 3), gc = [];
    for (let i = 0; i < gp.count; i++) { const k = 0.82 + 0.3 * gn(gp.getX(i) / 60 + 0.5, gp.getY(i) / 60 + 0.5); gc.push(k, k, k); }
    gg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
    const gr = new THREE.Mesh(gg, groundMaterial(look));
    gr.rotation.x = -Math.PI / 2; gr.position.y = -0.03; gr.receiveShadow = true; gr.renderOrder = -1; holeGroup.add(gr);
    const ed = edgingGroup(h, look); if (ed) holeGroup.add(ed);
    const ls = landscape(h, look); if (ls) holeGroup.add(ls);
  }
  for (const dr of h.drains) holeGroup.add(drainSpiral(h, dr));
  if (look.prop) scatterProps(holeGroup, h, look);
  if (look.decor) look.decor(holeGroup, h);
  scene.fog = look.fog ? new THREE.Fog(look.sky[1], 16, 55) : null;
  /* night: moonlight, stars, and a warm lamp in the cup */
  /* daylight: a warm low sun for long soft shadows and real modelling of every slope, the sky itself as
     image-based light (so turf, water, ice, the ball and the putter all reflect the world they are in) */
  wallKindNow = look.night ? 'paint' : look.wallKind || WALL_KIND_OF[worldOf(holeWorld(h))] || 'wood';
  setAmbience(look, h);
  /* the sky carries the ambient light now; the hemisphere only lifts the shade a touch */
  scene.environmentIntensity = look.night ? 0.35 : 1.0;
  hemi.intensity = look.night ? 0.35 : 0.35; hemi.color.set(look.night ? 0x9a7cff : 0xfff4e0);
  sun.intensity = look.night ? 0.7 : 3.0; sun.color.set(look.night ? 0xb89cff : 0xffe6c4);
  if (look.night) nightDecor(holeGroup, h);
  /* a sun about 45 degrees up, off the tee's shoulder: long crisp shadows off every wall and real light and shade on every slope */
  fitSun(h);
  setSky(look);
  TURF_U.uAlong.value.set(h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]).normalize(); TURF_U.uStripeK.value = look.night ? 0 : 0.13;
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
/* the ball mesh turns by the physics ball's own spin over the sim time that passed, so a sliding
   ball barely turns, backspin shows, and a ball off a rail visibly checks; balls without a spin
   (the auto-sink, the replay's last glide) roll by the distance they cover */
let syncT = 0;
function syncBall(dt) {
  const b = play.ball, p = ballMesh.position, dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
  ballMesh.visible = !b.tube && play.fx.ballHidden !== true;
  const simDt = clamp(play.time - syncT, 0, 0.1), w = Math.hypot(b.wx || 0, b.wy || 0, b.wz || 0);
  syncT = play.time;
  if ((play.phase === 'roll' || play.phase === 'drift') && w > 1e-6) { _axis.set(b.wx / w, b.wy / w, b.wz / w); _q.setFromAxisAngle(_axis, w * simDt); ballMesh.quaternion.premultiply(_q); }
  else if (d > 1e-6 && d < 0.5) { _axis.set(dz / d, 0, -dx / d); _q.setFromAxisAngle(_axis, d / BALL_R); ballMesh.quaternion.premultiply(_q); }
  p.set(b.x, b.y + BALL_R, b.z);
  if (ballShadow) {
    const gy = play.hole ? groundH(play.hole, b.x, b.z) : b.y, up = Math.max(0, b.y - gy);
    ballShadow.visible = ballMesh.visible && up < 0.4 && !(play.hole && Math.hypot(b.x - play.hole.cup[0], b.z - play.hole.cup[1]) < CUP_R);
    ballShadow.position.set(b.x, gy + 0.002, b.z); ballShadow.scale.setScalar(1 + up * 6); ballShadow.material.opacity = Math.max(0, 1 - up * 4);
  }
  const pl = play.fx.place;
  if (pl) {
    const k = Math.min(1, (pl.t += dt) / 0.35), e = k * k * (3 - 2 * k);
    p.set(pl.from[0] + (b.x - pl.from[0]) * e, b.y + BALL_R + Math.sin(k * Math.PI) * 0.04, pl.from[1] + (b.z - pl.from[1]) * e);
    if (k >= 1 || reducedMotion()) play.fx.place = null;
  }
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
  tickAmbience(dt);
  if (!play.hole || ['map', 'shop', 'title', 'worlds', 'world'].includes(currentScene)) return;
  updateMovers(play.time);
  for (const f of flowTex) f.t.offset.y -= dt * 0.4 * Math.min(3, f.speed);
  if (!reducedMotion()) FX_TIME.value += dt;
  const lk = lookOf(holeWorld(play.hole)); if (lk.tick) lk.tick(holeGroup, dt, play.time);
  syncLost(dt); tickNight(dt, play.time); updateSinkRing(dt);
  syncBall(dt);
  syncGhost();
  updatePuffs(dt);
  updateAimLine();
  updatePinTag();
  updatePutter(dt);
  updateFx(dt);
  updateCamera(dt);
  skyDome.position.copy(camera.position);
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
  if (!reducedMotion()) play.fx.hold = st.clean ? 0.045 + 0.04 * st.power : 0.03;
  buzz(st.clean ? 8 + 18 * st.power : [6, 20, 6]);
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
    practice: !opts.daily && !opts.friend && (practiceMode || party.on), daily: opts.daily || null, friend: opts.friend || null, lost: null });
  play.aim = h.aim0 !== undefined ? h.aim0 : Math.atan2(h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]) * 180 / Math.PI;
  setOverview(false);
  simAcc = 0;
  for (const k in lastHitSfx) delete lastHitSfx[k];
  buildHoleScene(h);
  hideAim();
  for (const m of trailDots.concat(confetti)) m.visible = false;
  holeDone.classList.remove('show'); shotPanel.classList.remove('show'); play.lastPath = null; holeBanner.classList.remove('show');
  setRead(false); initGhost(h); startLostSearch(h); updateMode(); partyDress(); updateMulligan(); clearTrace();
  for (const p of puffs) p.visible = false;
  syncBall(0);
  showScene('hole');
  updateHud(); drawPad();
  snapCamera();
  return true;
}
function goHole(key, opts) {
  sfx('tap'); wipe(); startHole(key, opts); sfx('jingle', (Number(key.split('-')[0])));
  /* the hole introduces itself: a sweep from over the cup back to the tee, with its number and par */
  if (!reducedMotion()) { play.intro = { t: 0, dur: 2.4 }; snapCamera(); }
  holeBannerN.textContent = key.split('-')[1]; holeBannerPar.textContent = play.hole.par;
  holeBannerMap.innerHTML = holeMapSvg(play.hole, play.aim);
  holeBanner.classList.remove('show'); void holeBanner.offsetWidth; holeBanner.classList.add('show');
}
/* the tee sign's picture of the hole: its outline seen from the tee (the line of play points up), the
   walls, water and sand, the tee and the flag. Like the layout drawing on a real course's tee sign. */
function holeMapSvg(h, aimDeg) {
  const a = aimDeg * Math.PI / 180, fx = Math.sin(a), fz = Math.cos(a), rx = -Math.cos(a), rz = Math.sin(a);
  const P = ([x, z]) => [x * rx + z * rz, -(x * fx + z * fz)];
  const pts = h.floors.flat().map(P), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), k = 84 / Math.max(x1 - x0, y1 - y0, 0.5);
  const ox = 48 - (x0 + x1) / 2 * k, oy = 48 - (y0 + y1) / 2 * k;
  const S = p => { const [x, y] = P(p); return `${(x * k + ox).toFixed(1)},${(y * k + oy).toFixed(1)}`; };
  const poly = (ring, fill, stroke = 'none', sw = 0) => `<polygon points="${ring.map(S).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  const zf = { water: '#6fc0df', sand: '#e9cf9a', ice: '#cfeaf5', mud: '#8a6a4a', fast: '#5f8fc4' };
  const [tx, ty] = S(h.tee).split(','), [cx, cy] = S(h.cup).split(',');
  return '<svg viewBox="0 0 96 96" aria-hidden="true">' + h.floors.map(f => poly(f, '#74c465', '#fffdf7', 3)).join('') +
    h.zones.filter(z => zf[z.surf]).map(z => poly(z.poly, zf[z.surf])).join('') +
    h.walls.map(w => `<polyline points="${w.map(S).join(' ')}" fill="none" stroke="#fffdf7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('') +
    `<circle cx="${tx}" cy="${ty}" r="4.5" fill="#fffdf7" stroke="#2f241a" stroke-width="1.5"/><path d="M${cx} ${cy} V${+cy - 14}" stroke="#fffdf7" stroke-width="2"/><path d="M${cx} ${+cy - 14} L${+cx + 9} ${+cy - 10.5} L${cx} ${+cy - 7} Z" fill="#ef7d6d"/><circle cx="${cx}" cy="${cy}" r="3" fill="#2f241a"/></svg>`;
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
  clearTrace(); recordTrace(play.ball);
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
  if (end !== 'sunk') showTrace();
  const out = play.phase === 'drift' ? resolveDrift(play.round, r, play.from) : resolvePutt(play.round, r, play.from);
  play.lastOutcome = out;
  setRoll(0);
  if (out === 'sunk') {
    play.phase = 'sunk'; play.fx.sunkT = 0; play.fx.sinkFrom = [r.x, r.z]; startSink(play.ball.vx, play.ball.vz); sfx('cup');
    if (!reducedMotion()) play.fx.hold = 0.07;
    buzz([18, 40, 30]);
    /* the last hole of a course keeps your ball: it rattles away down the return pipe and the clubhouse bell rings */
    if (isLastHole(play.key) && (!play.practice || party.on)) { play.fx.swallow = true; sfx('bell', play.round.score === 1 ? 1 : 0); }
    if (play.round.score === 1) { burst(new THREE.Vector3(h.cup[0], groundH(h, ...h.cup) + 0.1, h.cup[1])); sfx('fanfare'); if (!reducedMotion() && play.log.length === 1) play.fx.wantReplay = true; }
  }
  else if (out === 'auto') { play.phase = 'auto'; play.fx.autoT = 0; play.fx.autoFrom = end === 'oob' ? play.from.slice() : [r.x, r.z]; }
  else {
    if (out === 'oob') sfx('boink');
    /* the border rule moved it out from a rail: lift it and set it down there, as a player would */
    if (out !== 'oob' && Math.hypot(r.x - play.round.at[0], r.z - play.round.at[1]) > 0.005) { play.fx.place = { from: [r.x, r.z], t: 0 }; sfx('place'); }
    play.ball = newBall(h, play.round.at[0], play.round.at[1]);
    if (cupInSight(h, play.ball.x, play.ball.z)) play.aim = Math.atan2(h.cup[0] - play.ball.x, h.cup[1] - play.ball.z) * 180 / Math.PI;
    play.phase = 'aim';
  }
  updateHud(); updateMulligan();
}
/* the mulligan: take the last stroke back (ball, count and penalty) for one token. Tokens come
   from lost balls, goals, the daily hole and the pro shop; practice takes them back for free. */
const canMulligan = () => play.phase === 'aim' && !party.on && !play.daily && !!play.undo && play.round.strokes > 0 && (play.practice || progress.mulligans > 0);
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
    else if (kind === 'lip') { sfx('lip'); buzz([6, 30, 6]); }
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
  /* hit-stop: the world holds for a beat at contact and on the drop (only the pacing: the putt's
     start time is already fixed, so the result is the same to the bit) */
  if (play.fx.hold > 0) { play.fx.hold -= dt; return; }
  /* a slow ball closing on the cup plays in slow motion: only the pacing, never the result */
  const b0b = play.ball, near = ((play.phase === 'roll' || play.phase === 'drift') && !b0b.tube && Math.hypot(b0b.x - play.hole.cup[0], b0b.z - play.hole.cup[1]) < 0.35 && Math.hypot(b0b.vx, b0b.vz) < 1.2)
    || (play.phase === 'sunk' && (play.fx.sunkT || 0) < 0.18);
  play.fx.slow = (play.fx.slow || 1) + ((near && !reducedMotion() ? 0.7 : 1) - (play.fx.slow || 1)) * Math.min(1, dt * 8);
  dt *= play.fx.slow;
  simAcc = Math.min(simAcc + dt, 0.1 + SIM_DT);
  while (simAcc >= SIM_DT) { simAcc -= SIM_DT; tickSim(); }
  drainHits();
  stepLost();
  if (play.phase === 'roll' || play.phase === 'drift') { const b = play.ball, zn = zoneAt(play.hole, b.x, b.z); setRoll(b.air || b.tube ? 0 : Math.hypot(b.vx, b.vz), zn && zn.surf ? zn.surf : 'felt'); recordTrace(b); }
  const h = play.hole, b = play.ball, cy = groundH(h, h.cup[0], h.cup[1]);
  if (play.phase === 'auto') {
    const t = (play.fx.autoT += dt) / 0.9, k = Math.min(1, t), e = k * k * (3 - 2 * k), [fx, fz] = play.fx.autoFrom;
    b.x = fx + (h.cup[0] - fx) * e; b.z = fz + (h.cup[1] - fz) * e; b.tube = null;
    b.y = groundH(h, b.x, b.z) + Math.sin(k * Math.PI) * 0.12; b.vy = 0;
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
const isLastHole = key => { const [w, n] = String(key).split('-').map(Number); return !!WORLDS[w] && n === WORLDS[w].holes.length; };
/* the drop, drawn (the result was settled when the cup caught the ball): the ball carries its
   pace over the lip, falls, clacks off the white liner, rattles round it and plunks onto the floor
   of a cup drawn deeper than the physics needs. A ring of light pops on the green and the camera
   gives a little nod. Visual only: positions relative to the cup centre. */
function startSink(vx, vz) {
  const b = play.ball, h = play.hole, s = Math.hypot(vx, vz), cap = 1.4, k = s > cap ? cap / s : 1;
  /* from exactly where the cup caught it: no jump inward */
  /* the physics hands over a ball already part way down: carry on from its height and fall speed */
  const y = Math.min(0, b.y - groundH(h, h.cup[0], h.cup[1])), vy = play.phase === 'sunk' ? Math.min(0, b.vy || 0) : 0;
  /* a ball the physics already dropped below the lip skips the tip-over-the-lip part */
  play.fx.sink = { x: b.x - h.cup[0], z: b.z - h.cup[1], y, vx: vx * k, vz: vz * k, vy, walls: 0, floor: false, below: y < -BALL_R * 0.5 };
}
function stepSink(dt) {
  const k = play.fx.sink, lim = CUP_R - BALL_R - 0.003, floor = -(CUP_SINK - 0.004);
  for (let n = Math.max(1, Math.round(dt / SIM_DT)); n > 0; n--) {
    const d = dt / Math.max(1, Math.round(dt / SIM_DT));
    k.vy -= G * d; k.x += k.vx * d; k.z += k.vz * d; k.y += k.vy * d;
    let r = Math.hypot(k.x, k.z);
    /* over the lip: until the whole ball is inside the rim it rests on the rim's edge, so it tips
       over it (sinking as it goes, and pulled inward by the tilt) instead of dropping like a stone */
    const e = CUP_R - r;
    if (e < BALL_R && r > 1e-6 && !k.below) {
      const lipY = -(BALL_R - Math.sqrt(Math.max(0, BALL_R * BALL_R - Math.max(0, e) ** 2)));
      if (k.y < lipY) { k.y = lipY; k.vy = Math.max(k.vy, 0) * 0.5 + (lipY - k.y); }
      const pull = G * 0.6 * Math.min(1, Math.max(0, e) / BALL_R + 0.25);
      k.vx -= k.x / r * pull * d; k.vz -= k.z / r * pull * d;
      if (k.y <= lipY + 1e-6) k.vy = Math.min(k.vy, -0.05);
    }
    r = Math.hypot(k.x, k.z);
    /* below the rim the liner holds it; up at the rim it can ride to the far lip but never back out */
    const wall = k.y < -BALL_R * 0.9 ? lim : CUP_R - 0.004;
    if (r > wall) {
      const nx = k.x / r, nz = k.z / r, vn = k.vx * nx + k.vz * nz;
      if (vn > 0) {
        k.vx -= 1.5 * vn * nx; k.vz -= 1.5 * vn * nz; k.vx *= 0.9; k.vz *= 0.9;
        if (vn > 0.15 && k.walls < 3) { k.walls++; sfx('rattle', Math.min(1, vn)); }
      }
      k.x = nx * wall; k.z = nz * wall;
    }
    if (play.fx.swallow && k.floor && (k.swT = (k.swT || 0) + d) > 0.35) {
      /* down the drain and away to the clubhouse */
      if (!k.gone) { k.gone = true; sfx('tube'); }
      k.vy -= G * d * 0.5; k.y += k.vy * d * 0.5;
      if (k.y < floor - 0.12) play.fx.ballHidden = true;
      continue;
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
  if (party.on) { updateMulligan(); partyFinish(round.score); return; }
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
  if (end) { g.live = false; if (end === 'sunk') g.done = true; if (end === 'oob') g.b = newBall(play.hole, g.b.x, g.b.z); else if (end === 'stop') { const [x, z] = restSpot(play.hole, g.b.x, g.b.z); g.b = newBall(play.hole, x, z); } }
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
/* the putt tracer: the whole line the last putt took stays painted on the green until the next one,
   coloured by its pace (sky blue slow, sun yellow, coral fast), so the break and the bank can be read */
let traceMesh = null, tracePts = [];
function recordTrace(b) {
  if (b.tube) return;
  const l = tracePts[tracePts.length - 1];
  if (!l || Math.hypot(b.x - l[0], b.z - l[2]) > 0.025) tracePts.push([b.x, b.y, b.z, Math.hypot(b.vx, b.vz)]);
}
function clearTrace() { tracePts = []; if (traceMesh) traceMesh.visible = false; }
const TRACE_COLS = [new THREE.Color('#6fc0df'), new THREE.Color('#ffd66e'), new THREE.Color('#ef7d6d')];
function showTrace() {
  if (tracePts.length < 3) return;
  if (!traceMesh) {
    traceMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    traceMesh.renderOrder = 2; traceMesh.frustumCulled = false; scene.add(traceMesh);
  }
  const pos = [], col = [], idx = [], w = 0.007, n = tracePts.length, c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = tracePts[Math.max(0, i - 1)], b = tracePts[Math.min(n - 1, i + 1)], p = tracePts[i], dx = b[0] - a[0], dz = b[2] - a[2], d = Math.hypot(dx, dz) || 1;
    const sx = dz / d * w, sz = -dx / d * w, k = Math.min(1, p[3] / 3) * 2, fade = Math.min(1, i / 4, (n - 1 - i) / 4);
    c.copy(TRACE_COLS[Math.min(1, Math.floor(k))]).lerp(TRACE_COLS[Math.min(2, Math.floor(k) + 1)], k - Math.floor(k)).multiplyScalar(0.4 + 0.6 * fade);
    pos.push(p[0] + sx, p[1] + 0.004, p[2] + sz, p[0] - sx, p[1] + 0.004, p[2] - sz); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i) idx.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
  }
  traceMesh.geometry.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  traceMesh.geometry = g; traceMesh.visible = true;
}
/* the pin tag: while you aim, a little tag rides over the flag with the distance to the cup (metres)
   and how far it rises or falls (centimetres), the numbers a caddie would give you */
let pinTagKey = '';
function updatePinTag() {
  const show = play.phase === 'aim' && !play.overview && !play.intro && !!play.hole && currentScene === 'hole';
  if (!show) { if (pinTag.classList.contains('show')) pinTag.classList.remove('show'); return; }
  const h = play.hole, b = play.ball, cy = groundH(h, h.cup[0], h.cup[1]), v = new THREE.Vector3(h.cup[0], cy + 0.86, h.cup[1]).project(camera);
  if (v.z > 1 || Math.abs(v.x) > 0.92 || v.y > 0.8 || v.y < -0.9) { pinTag.classList.remove('show'); return; }
  const d = Math.hypot(h.cup[0] - b.x, h.cup[1] - b.z), rise = Math.round((cy - b.y) * 100), key = d.toFixed(1) + '/' + rise;
  if (key !== pinTagKey) {
    pinTagKey = key; pinTagD.textContent = d.toFixed(1);
    pinTagR.textContent = Math.abs(rise) >= 2 ? Math.abs(rise) : ''; pinTag.classList.toggle('up', rise >= 2); pinTag.classList.toggle('down', rise <= -2);
  }
  pinTag.style.left = ((v.x + 1) / 2 * 1200) + 'px'; pinTag.style.top = ((1 - v.y) / 2 * 700) + 'px';
  pinTag.classList.add('show');
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


/* ---- 6b2. pass and play: 2 to 4 players on one device, the way a group plays a real course ----
   Each player has a ball colour. On every hole each player plays it out in turn (to the cup or the
   double-par cap), then a little scoreboard crowns the hole's best. The honour (who putts first on
   the next hole) goes to the lowest score on the last one, ties keeping the old order. At the end
   the scorecard has a row per player and a crown for the winner. Nothing is saved: no stars, coins
   or mulligans, like practice. */
const PARTY_BALLS = ['#fffdf7', '#ffd66e', '#ef7d6d', '#6fc0df'];
const party = { on: false, n: 0, course: 0, order: [], turn: 0, scores: {} };
const CROWN_SVG = '<svg class="crown" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 50 L12 18 L24 32 L32 12 L40 32 L52 18 L56 50 Z" fill="#ffd66e" stroke="#dca63f" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="40" r="5" fill="#ef7d6d"/></svg>';
const partyBall = (p, size = 40) => `<span class="pball" style="width:${size}px;height:${size}px;background:${PARTY_BALLS[p]}"><b>${p + 1}</b></span>`;
const partyPlayer = () => party.order[party.turn];
function startParty(n, course) {
  Object.assign(party, { on: true, n, course, order: Array.from({ length: n }, (_, i) => i), turn: 0, scores: {} });
  partyPick.classList.remove('show');
  goHole(course + '-1');
}
function endParty() {
  party.on = false;
  if (ballMesh) ballMesh.material.color.set('#ffffff');
  partyChip.classList.remove('show'); partyPass.classList.remove('show'); partyDone.classList.remove('show');
}
/* called by startHole: the active player's ball and chip */
function partyDress() {
  if (!party.on) { partyChip.classList.remove('show'); if (ballMesh) ballMesh.material.color.set('#ffffff'); return; }
  const p = partyPlayer();
  ballMesh.material.color.set(p === 0 ? '#ffffff' : PARTY_BALLS[p]);
  partyChipBall.innerHTML = partyBall(p, 44); partyChip.classList.add('show');
  play.ghost = null; play.lost = null; if (lostMesh) lostMesh.visible = false;
}
/* the hole is finished for this player: next player, or the hole's scoreboard */
function partyFinish(score) {
  const key = play.key, sc = party.scores[key] || (party.scores[key] = []);
  sc[partyPlayer()] = score;
  if (party.turn + 1 < party.n) {
    party.turn++;
    const p = partyPlayer();
    partyPassBall.innerHTML = partyBall(p, 150);
    partyPass.classList.add('show'); sfx('tap');
    clearTimeout(partyPass._t); partyPass._t = setTimeout(partyGo, 1600);
    return;
  }
  /* everyone is in: the hole's scoreboard, the best score crowned, running totals beside */
  const best = Math.min(...sc), keys = Object.keys(party.scores);
  partyRows.innerHTML = party.order.map(p => {
    const tot = keys.reduce((a, k) => a + (party.scores[k][p] || 0), 0);
    return `<div class="prow">${partyBall(p, 56)}<span class="ps">${sc[p]}</span><span class="pc">${sc[p] === best ? CROWN_SVG : ''}</span><span class="pt">${tot}</span></div>`;
  }).join('');
  partyDone.classList.add('show'); sfx('star', 2);
  /* the honour: lowest score on this hole putts first on the next, ties keep the order */
  party.order = party.order.slice().sort((a, b) => sc[a] - sc[b] || party.order.indexOf(a) - party.order.indexOf(b));
  party.turn = 0;
}
function partyGo() {
  clearTimeout(partyPass._t);
  if (!partyPass.classList.contains('show')) return;
  partyPass.classList.remove('show');
  startHole(play.key);
}
function partyNext() {
  partyDone.classList.remove('show');
  const k = nextKey(play.key);
  if (k) { goHole(k); return; }
  sfx('tap'); showCard(party.course);
}
/* ---- 6c. extras: modes, lost balls, goals, the daily hole, shot codes, night ---- */
let practiceMode = false;
/* save fields this section owns: mulligans (tokens), lost (key -> 1), obj (key -> goal bits), daily */
function repairExtras(p) {
  if (!Number.isInteger(p.mulligans) || p.mulligans < 0) p.mulligans = 5;
  p.mulligans = Math.min(p.mulligans, 9999);
  p.neon = p.neon === true;
  const keyed = (o, ok) => { const out = {}; if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (/^\d+-\d+$/.test(k) && ok(v)) out[k] = v; return out; };
  p.lost = keyed(p.lost, v => v === 1);
  p.obj = keyed(p.obj, v => Number.isInteger(v) && v >= 1 && v <= 7);
  const t = p.tally || {};
  p.tally = Object.fromEntries(['birdie', 'eagle', 'alb', 'ace'].map(k => [k, Number.isInteger(t[k]) && t[k] >= 0 ? t[k] : 0]));
  const d = p.daily;
  p.daily = d && typeof d.d === 'string' && /^\d{4}-\d\d-\d\d$/.test(d.d) && Number.isInteger(d.best) && d.best >= 1 && Number.isInteger(d.streak) && d.streak >= 1
    ? { d: d.d, best: d.best, streak: d.streak } : null;
  /* ghosts are putt inputs, replayed through the physics: ones recorded under older physics would
     roll somewhere else now, so they go (bests and stars stay, they only ever go up) */
  if (p.phys !== PHYS_VERSION) { p.ghosts = {}; p.phys = PHYS_VERSION; }
}
const PHYS_VERSION = 3;
const addCoins = n => { progress.coins = Math.min(COIN_MAX, (progress.coins || 0) + n); return n; };

/* the mode chip: practice (a target), the daily hole (a calendar), a friend's putt (their score) */
const MODE_ICONS = {
  practice: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#fffdf7" stroke="#ef7d6d" stroke-width="6"/><circle cx="32" cy="32" r="15" fill="none" stroke="#ef7d6d" stroke-width="6"/><circle cx="32" cy="32" r="5" fill="#ef7d6d"/></svg>',
  daily: '<svg viewBox="0 0 64 64"><rect x="8" y="12" width="48" height="44" rx="8" fill="#fffdf7" stroke="#a8804e" stroke-width="5"/><path d="M8 24 H56" stroke="#ef7d6d" stroke-width="10"/><path d="M20 6 V16 M44 6 V16" stroke="#a8804e" stroke-width="5" stroke-linecap="round"/></svg>',
  friend: '<svg viewBox="0 0 64 64"><path d="M12 56 V28 A20 20 0 0 1 52 28 V56 L45 50 L38 56 L32 50 L26 56 L19 50 Z" fill="#fffdf7" stroke="#d38bbf" stroke-width="4" stroke-linejoin="round"/><circle cx="25" cy="30" r="4" fill="#4a3826"/><circle cx="39" cy="30" r="4" fill="#4a3826"/></svg>',
};
function updateMode() {
  const m = party.on ? '' : play.practice ? 'practice' : play.daily ? 'daily' : play.friend ? 'friend' : '';
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
/* the cosmic-bowling groove: a four-on-the-floor kick, off-beat hats and a little bass line,
   synthesized, scheduled a beat ahead, only while a neon hole is on screen (and the sound is on) */
const BPM = 118, BASS = [55, 55, 65.4, 49, 55, 73.4, 65.4, 49];
let beatAt = 0, beatN = 0;
function neonBeat(on) {
  if (!on || !actx || !progress.sound) { beatAt = 0; return; }
  const now = actx.currentTime, step = 60 / BPM;
  if (!beatAt || beatAt < now - 0.5) beatAt = now + 0.05;
  while (beatAt < now + 0.2) {
    const d = beatAt - now;
    tone(110, 0.22, { vol: 0.22, slide: -70, delay: d });
    noise(0.04, { vol: 0.05, freq: 8000, q: 0.8, type: 'highpass', delay: d + step / 2 });
    tone(BASS[beatN % BASS.length], step * 0.45, { type: 'sawtooth', vol: 0.045, delay: d + step / 2 });
    if (beatN % 4 === 3) noise(0.12, { vol: 0.07, freq: 1800, q: 0.7, delay: d });
    beatAt += step; beatN++;
  }
}
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
  /* the scenery turns into black-light silhouettes, each glowing its own neon */
  let pi = 0;
  for (const c of group.children) if (c.userData.prop) {
    const col = NEON[pi++ % NEON.length];
    c.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { o.material = o.material.clone(); o.material.color.set('#160c33'); o.material.emissive.set(col); o.material.emissiveIntensity = 0.55; } });
  }
  /* lasers sweeping from two towers of light over the course */
  const lasers = new THREE.Group(); lasers.name = 'lasers';
  for (let i = 0; i < 8; i++) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 7.5, 5, 1, true), new THREE.MeshBasicMaterial({ color: NEON[i % NEON.length], transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    beam.geometry.translate(0, -3.75, 0);
    const pivot = new THREE.Group(); pivot.position.set(B.cx + (i < 4 ? -1 : 1) * Math.max(0.6, (B.x1 - B.x0) * 0.3), 5.5, B.z0 + ((i % 4) + 0.5) / 4 * (B.z1 - B.z0));
    pivot.userData.phase = i * 0.8; pivot.userData.side = i < 4 ? 1 : -1; pivot.add(beam); lasers.add(pivot);
  }
  group.add(lasers);
  /* a disco ball high over the green, throwing spots of light that wheel across the carpet */
  const disco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: 0.15, flatShading: true, emissive: '#5a4a90', emissiveIntensity: 0.5 }));
  disco.position.set(B.cx, 3.4, B.cz); disco.name = 'disco'; group.add(disco);
  const spots = new THREE.Group(); spots.name = 'spots'; spots.position.set(B.cx, 0, B.cz);
  const spotGeo = new THREE.CircleGeometry(0.045, 14);
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(spotGeo, new THREE.MeshBasicMaterial({ color: NEON[i % NEON.length], transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.userData.r = 0.4 + r() * B.ext; m.userData.a = r() * Math.PI * 2; spots.add(m);
  }
  group.add(spots);
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
  neonBeat(on && currentScene === 'hole');
  if (!on || reducedMotion()) return;
  /* everything breathes on the beat */
  const beat = (t * BPM / 60) % 1, k = Math.exp(-beat * 5);
  const glow = holeGroup.getObjectByName('cupGlow'); if (glow) glow.material.opacity = 0.6 + 0.4 * k;
  const walls = holeGroup.getObjectByName('walls');
  if (walls) for (const c of walls.children) if (c.name === 'halo') c.material.opacity = 0.1 + 0.22 * k;
  const h = play.hole;
  for (const p of holeGroup.getObjectByName('lasers').children) {
    const u = t * 0.6 + p.userData.phase;
    p.rotation.set(Math.sin(u) * 0.45, 0, -p.userData.side * (0.45 + Math.sin(u * 0.7) * 0.3));
  }
  const disco = holeGroup.getObjectByName('disco'); disco.rotation.y += dt * 0.8;
  for (const m of holeGroup.getObjectByName('spots').children) {
    const a = m.userData.a + t * 0.35, x = disco.position.x + Math.cos(a) * m.userData.r, z = disco.position.z + Math.sin(a) * m.userData.r;
    m.position.set(Math.cos(a) * m.userData.r, groundH(h, x, z) + 0.006, Math.sin(a) * m.userData.r);
    m.visible = onFloor(h, x, z);
  }
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
  const w = worldOf(mapWorld), cells = [];
  coursesOf(w).forEach((c, ci) => WORLDS[c].holes.forEach((h, i) => {
    if (!h.crazy) return;
    const key = c + '-' + (i + 1), r = progress.holes[key], b = r && (r.best === 1 && !birdFor(1, h.par) ? 'ace' : birdFor(r.best, h.par));
    cells.push(`<div class="tc${b ? ' ' + b : ''}${h.auto ? ' auto' : ''}" aria-label="course ${ci + 1} hole ${i + 1}"><span class="pips">${'<i></i>'.repeat(ci + 1)}</span><span class="n">${i + 1}</span>${b ? BIRD_SVG[b] : `<span class="best">${r ? r.best + '/' + h.par : h.par}</span>`}</div>`);
  }));
  trackGrid.innerHTML = cells.join('');
  tracker.classList.add('show');
}

function initExtras() {
  practiceBtn.addEventListener('click', () => { sfx('tap'); practiceMode = !practiceMode; renderMap(); });
  dailyBtn.addEventListener('click', () => { const ds = dayStr(); goHole(dailyKey(ds), { daily: ds }); });
  trophyBtn.addEventListener('click', openTracker);
  neonBtn.addEventListener('click', () => { sfx('tap'); setNeon(!progress.neon); });
  neonSet.addEventListener('click', () => { sfx('tap'); setNeon(!progress.neon); });
  trackClose.addEventListener('click', () => { sfx('tap'); tracker.classList.remove('show'); });
}

/* ============ 7. SCENES ============ */
const STAR_SVG = '<svg class="star" viewBox="0 0 64 64"><path d="M32 4 L40 23 L60 24 L44 37 L50 58 L32 46 L14 58 L20 37 L4 24 L24 23 Z"/></svg>';
const BONUS_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3 L40 22 L61 24 L45 38 L50 59 L32 48 L14 59 L19 38 L3 24 L24 22 Z" fill="#ff3df2" stroke="#2ef2ff" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="34" r="9" fill="#fffdf7"/></svg>';
/* the classic: a straight carpet lane between silver rails, the cup and its flag */
const CLASSIC_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="6" width="40" height="54" rx="4" fill="#2e8a46" stroke="#c9ced6" stroke-width="5"/><circle cx="32" cy="18" r="5" fill="#1d150e"/><path d="M32 18 V4" stroke="#fffdf7" stroke-width="3"/><path d="M33 4 L44 8 L33 12 Z" fill="#ef7d6d"/><circle cx="32" cy="50" r="4" fill="#fffdf7"/></svg>';
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
    const stars = coursesOf(w).reduce((a, c) => a + (WORLDS[c] ? WORLDS[c].holes.reduce((t, h) => t + ((progress.holes[h.key] || {}).stars || 0), 0) : 0), 0);
    b.className = 'wcard' + (open ? '' : ' locked');
    b.style.background = `linear-gradient(${look.sky[0]}, ${look.sky[1]})`; b.style.animationDelay = (i * 0.03) + 's';
    b.setAttribute('aria-label', 'world ' + w);
    b.innerHTML = `<span class="num">${w}</span><span class="art">${look.icon || ''}</span>` + (open ? `<span class="tally">${STAR_SVG}${stars}</span>` : LOCK_SVG);
    b.onclick = () => { if (open) { sfx('tap'); showWorld(w); } else sfx('boink'); };
    worldGrid.append(b);
  });
  soundBtn.classList.toggle('off', !progress.sound);
  bonusBtn.classList.toggle('locked', !WORLDS[BONUS]); classicBtn.classList.toggle('locked', !WORLDS[CLASSIC]);
  renderWallet();
}
/* a world's map, Mario style: its three courses along one winding road, left to right. Gold when
   finished, green when it is the one to play (a ball hops on it), grey and locked until reached. */
const WORLD_POS = [[230, 470], [600, 330], [970, 470]];
function showWorld(w) {
  if (currentScene !== 'world') wipe();
  mapWorld = w;
  setRead(false); play.swing = null; play.aimDrag = null; hideAim();
  showScene('world');
  const look = lookOf(w), cs = coursesOf(w);
  world.style.background = `linear-gradient(${look.sky[0]}, ${look.sky[1]} 62%, ${look.felt} 62%, ${look.felt})`;
  worldBadge.querySelector('.ic').innerHTML = look.icon || ''; worldBadgeN.textContent = w;
  const P = WORLD_POS.slice(0, cs.length), road = 'M80 560 C 160 560, 160 ' + P[0][1] + ' ' + P[0].join(' ') + P.slice(1).map((p, i) => ` S ${(P[i][0] + p[0]) / 2} ${i % 2 ? p[1] + 120 : p[1] - 40}, ${p.join(' ')}`).join('') + ` S 1100 560, 1140 560`;
  worldPath.innerHTML = `<path d="${road}" fill="none" stroke="#c9a476" stroke-width="58" stroke-linecap="round" opacity=".85"/><path d="${road}" fill="none" stroke="#fffdf7" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 30"/>`;
  /* scenery: the world's emblem scattered faintly, away from the road and the courses */
  const r = rng32(w * 97), spots = [];
  for (let i = 0; i < 300 && spots.length < 8; i++) {
    const x = 40 + r() * 1080, y = 120 + r() * 520;
    if (P.every(([nx, ny]) => Math.hypot(x + 40 - nx, y + 40 - ny) > 190) && spots.every(([sx, sy]) => Math.hypot(x - sx, y - sy) > 120)) spots.push([x, y]);
  }
  worldDecor.innerHTML = spots.map(([x, y]) => `<span style="position:absolute;left:${x.toFixed(0)}px;top:${y.toFixed(0)}px">${look.icon || ''}</span>`).join('');
  worldNodes.innerHTML = '';
  let next = null;
  cs.forEach((c, k) => {
    const open = progress.worlds.includes(c) && !!WORLDS[c], hs = WORLDS[c].holes;
    const stars = hs.reduce((t, h) => t + ((progress.holes[h.key] || {}).stars || 0), 0), done = hs.every(h => progress.holes[h.key]);
    const crazy = hs.filter(h => h.crazy).length, [x, y] = P[k], b = document.createElement('button');
    b.className = 'btn cnode' + (open ? (done ? ' done' : ' go') : ' locked');
    b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.animationDelay = (k * 0.08) + 's';
    b.setAttribute('aria-label', 'course ' + (k + 1));
    b.innerHTML = `<span class="n">${k + 1}</span>` + (open ? `<span class="tally">${STAR_SVG}${stars}/${hs.length * 3}</span>` + (crazy ? `<span class="crazyN">${CRAZY_SVG.replace('class="crazy"', '')}${crazy}</span>` : '') : LOCK_SVG);
    b.onclick = () => { if (open) { sfx('tap'); showMap(c); } else sfx('boink'); };
    worldNodes.append(b);
    if (open && !done && !next) next = [x, y];
  });
  worldBall.classList.toggle('show', !!next);
  if (next) { worldBall.style.left = next[0] + 'px'; worldBall.style.top = (next[1] - 118) + 'px'; }
  neonBtn.classList.toggle('on', !!progress.neon);
}
/* neon night: a display mode for every course, kept in the save */
function setNeon(on) {
  progress.neon = !!on; saveProgress();
  neonBtn.classList.toggle('on', progress.neon); neonSet.classList.toggle('on', progress.neon);
  if (currentScene === 'world') showWorld(mapWorld);
}
/* three profiles: a card per save with its ball, stars, coins and furthest world. A new profile
   tees straight off on world 1, course 1, hole 1. Erasing takes two taps: the first arms the bin. */
const BIN_SVG = '<svg viewBox="0 0 64 64"><path d="M14 18 H50 L46 58 H18 Z" fill="#fffdf7" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M8 18 H56 M24 18 V10 H40 V18 M26 28 V48 M38 28 V48" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';
const FLAG_SVG = '<svg class="flag" viewBox="0 0 64 64"><path d="M18 58 V6" stroke="#4a3826" stroke-width="5" stroke-linecap="round"/><path d="M20 8 L52 18 L20 30 Z" fill="#ef7d6d"/></svg>';
const ballSvg = (b, n) => `<svg class="ball" viewBox="0 0 64 64"><defs><clipPath id="pball${n}"><circle cx="32" cy="32" r="26"/></clipPath></defs><circle cx="32" cy="34" r="27" fill="rgba(74,53,35,.18)"/><circle cx="32" cy="32" r="26" fill="${b.base}"/><g clip-path="url(#pball${n})"><rect x="0" y="27" width="64" height="10" fill="${b.band}"/><circle cx="44" cy="20" r="4" fill="${b.mark}"/></g><circle cx="32" cy="32" r="26" fill="none" stroke="rgba(74,53,35,.35)" stroke-width="3"/><ellipse cx="23" cy="20" rx="7" ry="4" fill="#fff" opacity=".6" transform="rotate(-30 23 20)"/></svg>`;
function slotSummary(n) {
  if (!slotUsed(n)) return null;
  const p = loadProgress(slotKey(n)), holes = Object.values(p.holes);
  if (!holes.length) return null;
  shopRepair(p);
  const b = SHOP_ITEMS[p.equipped.ball];
  return { stars: holes.reduce((a, r) => a + r.stars, 0), coins: p.coins, world: Math.max(...p.worlds.filter(c => !isExtra(c)).map(worldOf)), ball: b };
}
function useSlot(n) {
  slot = n; SAVE_KEY = slotKey(n);
  try { localStorage.setItem(SLOT_KEY, String(n)); } catch (e) {}
  progress = loadProgress();
  repairExtras(progress); shopRepair(progress); saveProgress();
  applyGear(); setHand(progress.hand);
  if (master) master.gain.value = progress.sound ? 0.8 : 0;
  soundBtn.classList.toggle('off', !progress.sound);
  neonSet.classList.toggle('on', progress.neon); neonBtn.classList.toggle('on', progress.neon);
  renderWallet();
}
let binArmed = 0, binTimer = 0;
function showProfiles() {
  if (currentScene === 'title') wipe();
  setRead(false); play.swing = null; play.aimDrag = null; hideAim();
  showScene('profiles');
  renderProfiles();
}
function renderProfiles() {
  profileRow.innerHTML = '';
  for (let n = 1; n <= SLOTS; n++) {
    const sum = slotSummary(n), card = document.createElement('button'), x = 72 + (n - 1) * 368;
    card.className = 'pcard' + (sum ? '' : ' empty') + (sum && n === slot ? ' last' : '');
    card.style.left = x + 'px'; card.style.animationDelay = ((n - 1) * 0.07) + 's';
    card.setAttribute('aria-label', 'profile ' + n);
    card.innerHTML = `<span class="num">${n}</span>` + (sum
      ? `${ballSvg(sum.ball, n)}<span class="row"><span class="tally">${STAR_SVG}${sum.stars}</span><span class="tally">${COIN_SVG}${sum.coins}</span></span><span class="tally world">${FLAG_SVG}${sum.world}</span>`
      : '<span class="plus"><svg viewBox="0 0 64 64"><path d="M32 12 V52 M12 32 H52" stroke="#fff" stroke-width="10" stroke-linecap="round"/></svg></span>');
    card.onclick = () => {
      useSlot(n);
      if (sum) { sfx('tap'); showWorlds(); } else goHole(playable()[0] + '-1');
    };
    profileRow.append(card);
    if (!sum) continue;
    const bin = document.createElement('button');
    bin.className = 'btn bin' + (binArmed === n ? ' armed' : '');
    bin.style.left = (x + 50) + 'px';
    bin.setAttribute('aria-label', 'erase profile ' + n);
    bin.innerHTML = BIN_SVG;
    bin.onclick = () => {
      clearTimeout(binTimer);
      if (binArmed !== n) { binArmed = n; sfx('tick'); binTimer = setTimeout(() => { binArmed = 0; if (currentScene === 'profiles') renderProfiles(); }, 3000); }
      else { binArmed = 0; eraseSlot(n); sfx('boink'); if (n === slot) useSlot(n); }
      renderProfiles();
    };
    profileRow.append(bin);
    /* carry on: one tap from here to this profile's next unplayed hole */
    const next = nextHoleFor(loadProgress(slotKey(n)));
    if (!next) continue;
    const go = document.createElement('button');
    go.className = 'btn go cont'; go.style.left = (x + 182) + 'px';
    go.setAttribute('aria-label', 'carry on with profile ' + n);
    go.innerHTML = '<svg viewBox="0 0 64 64"><path d="M22 12 L52 32 L22 52 Z" fill="#fff"/></svg><span class="hn">' + next.split('-')[1] + '</span>';
    go.onclick = () => { useSlot(n); goHole(next); };
    profileRow.append(go);
  }
}
/* the first hole a profile has open but not yet finished, course by course */
function nextHoleFor(p) {
  for (const w of WORLD_ORDER) for (const c of coursesOf(w)) {
    if (!p.worlds.includes(c)) continue;
    for (const h of WORLDS[c].holes) if (!p.holes[h.key] && holeUnlocked(p, h.key)) return h.key;
  }
  return null;
}
function showMap(w) {
  if (currentScene !== 'map') wipe();
  setRead(false);
  if (w) mapWorld = w;
  if (!WORLDS[mapWorld]) mapWorld = playable()[0];
  play.swing = null; play.aimDrag = null; hideAim();
  showScene('map');
  renderMap();
}
function renderMap() {
  const w = worldOf(mapWorld), k = coursesOf(w).indexOf(mapWorld) + 1, bonus = mapWorld === BONUS, classic = mapWorld === CLASSIC;
  mapBadge.querySelector('.ic').innerHTML = bonus ? BONUS_SVG : classic ? CLASSIC_SVG : lookOf(w).icon || ''; mapBadgeN.textContent = bonus || classic ? WORLDS[mapWorld].holes.length : k;
  mapBadge.classList.toggle('night', !!progress.neon);
  const sky = lookOf(mapWorld).sky;
  map.style.background = progress.neon ? 'linear-gradient(#05020f, #2a0b4d)' : `linear-gradient(${sky[0]}, ${sky[1]})`;
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
  map.classList.toggle('night', !!progress.neon); map.classList.toggle('practice', practiceMode);
  practiceBtn.classList.toggle('on', practiceMode);
  mapLostN.textContent = holes.filter(h => progress.lost[h.key]).length + '/' + holes.length;
  renderWallet();
}
function showCard(w) {
  mapWorld = w;
  const holes = WORLDS[w].holes, inParty = party.on && party.course === w;
  /* a course played out of order (?hole=, or a gapped save) has no full card yet: back to its map */
  if (!inParty && holes.some(h => !progress.holes[h.key])) { showMap(w); return; }
  /* a real paper scorecard: the hole numbers, the par row and a row per player, a subtotal for each nine,
     scores marked the way golfers mark them: a circle under par, two for two under, a square over */
  cardRow.innerHTML = '';
  let total = 0, par = 0, stars = 0;
  const FLAG = '<svg viewBox="0 0 64 64"><path d="M20 58 V6" stroke="#8a7360" stroke-width="6" stroke-linecap="round"/><path d="M22 8 L52 18 L22 30 Z" fill="#ef7d6d"/></svg>';
  const BALL = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="#fffdf7" stroke="#8a7360" stroke-width="5"/><circle cx="25" cy="26" r="3" fill="#cdbf9f"/><circle cx="37" cy="26" r="3" fill="#cdbf9f"/><circle cx="31" cy="37" r="3" fill="#cdbf9f"/></svg>';
  const players = inParty ? Array.from({ length: party.n }, (_, p) => ({ icon: partyBall(p, 32), best: h => party.scores[h.key][p] }))
    : [{ icon: BALL, best: h => progress.holes[h.key].best }];
  const sums = players.map(() => 0);
  cardPanel.classList.toggle('party', inParty);
  for (let k = 0; k < holes.length; k += 9) {
    const ns = holes.slice(k, k + 9), t = document.createElement('div');
    const p9 = ns.reduce((a, h) => a + h.par, 0);
    const rows = [[['', 'hd'], ...ns.map((h, i) => [String(k + i + 1), 'hd']), [`${k + 1}-${k + ns.length}`, 'hd sub']],
      [[FLAG, 'lb'], ...ns.map(h => [String(h.par), 'par']), [String(p9), 'par sub']]];
    players.forEach((pl, j) => {
      let s9 = 0;
      const row = [[pl.icon, 'lb']];
      ns.forEach(h => { const b = pl.best(h), d = b - h.par; s9 += b; row.push([`<span class="mk ${d <= -2 ? 'e' : d === -1 ? 'b' : d === 1 ? 'o' : d >= 2 ? 'd' : ''}">${b}</span>`, 'me']); });
      row.push([String(s9), 'me sub']); rows.push(row); sums[j] += s9;
    });
    if (!inParty) ns.forEach(h => { stars += progress.holes[h.key].stars; });
    par += p9;
    t.className = 'nine'; t.style.gridTemplateColumns = `64px repeat(${ns.length}, 1fr) 112px`;
    t.innerHTML = rows.map(row => row.map(([v, c]) => `<div class="sc ${c}">${v}</div>`).join('')).join('');
    cardRow.append(t);
  }
  total = Math.min(...sums);
  if (inParty) {
    const win = sums.indexOf(total);
    const diff = total - par;
    cardTotal.innerHTML = partyBall(win, 72) + total;
    cardDiff.textContent = (diff > 0 ? '+' : '') + diff;
    cardStars.innerHTML = sums.filter(v => v === total).length > 1 ? '' : CROWN_SVG;
    cardNext.style.display = 'none';
    showScene('card');
    burst(new THREE.Vector3().copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.6)), 140);
    sfx('fanfare');
    return;
  }
  const diff = total - par;
  cardTotal.textContent = total;
  cardDiff.textContent = (diff > 0 ? '+' : '') + diff;
  cardStars.innerHTML = STAR_SVG + `<span>${stars}</span>`;
  const list = playable(), d = w, nd = isExtra(w) ? null : WORLDS[d + COURSE_STEP] && worldOf(d + COURSE_STEP) === worldOf(d) ? d + COURSE_STEP : list[list.indexOf(worldOf(d)) + 1], next = nd;
  cardNext.style.display = next && progress.worlds.includes(next) ? '' : 'none';
  cardNext.onclick = () => { sfx('tap'); showWorld(worldOf((next))); };
  showScene('card');
  burst(new THREE.Vector3().copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.6)), 140);
  sfx('fanfare');
}

/* ============ 8. FX ============ */
const FX_COLORS = [0xef7d6d, 0xffd66e, 0x74c465, 0x6fc0df, 0xfff8ec];
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let trailDots = [], confetti = [], trailClock = 0, trailNext = 0, trailN = 0;
function initFx() {
  const dotGeo = new THREE.SphereGeometry(BALL_R * 0.55, 10, 8);
  for (let i = 0; i < 30; i++) {
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
    m.position.set(b.x, b.y + BALL_R * 0.6, b.z); m.visible = true; m.userData.life = progress.neon ? 0.8 : 0.4;
    m.material.color.set(progress.neon ? NEON[(trailN++) % NEON.length] : '#fffdf7'); m.material.blending = progress.neon ? THREE.AdditiveBlending : THREE.NormalBlending;
  }
  for (const m of trailDots) if (m.visible) {
    m.userData.life -= dt;
    if (m.userData.life <= 0 || calm) { m.visible = false; continue; }
    const L = progress.neon ? 0.8 : 0.4; m.material.opacity = m.userData.life / L * (progress.neon ? 0.9 : 0.55); m.scale.setScalar((0.4 + m.userData.life / L * 0.6) * (progress.neon ? 1.6 : 1));
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
  slot = readSlot(); SAVE_KEY = slotKey(slot);
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
  neonSet.classList.toggle('on', !!progress.neon);
  homeBtn.addEventListener('click', () => { sfx('tap'); endParty(); showMap(Number(play.key.split('-')[0])); });
  partyBtn.addEventListener('click', () => { sfx('tap'); partyPick.classList.add('show'); });
  partyPickClose.addEventListener('click', () => { sfx('tap'); partyPick.classList.remove('show'); });
  [2, 3, 4].forEach(n => document.getElementById('partyN' + n).addEventListener('click', () => { sfx('tap'); startParty(n, mapWorld); }));
  partyPass.addEventListener('click', () => { sfx('tap'); partyGo(); });
  partyNextBtn.addEventListener('click', () => { sfx('tap'); partyNext(); });
  partyMap.addEventListener('click', () => { sfx('tap'); const w = party.course; endParty(); showMap(w); });
  doneMap.addEventListener('click', () => { sfx('tap'); showMap(Number(play.key.split('-')[0])); });
  titleGo.addEventListener('click', () => { sfx('tap'); showProfiles(); });
  profilesBack.addEventListener('click', () => { sfx('tap'); showTitle(); });
  worldsHome.addEventListener('click', () => { sfx('tap'); showProfiles(); });
  worldBack.addEventListener('click', () => { sfx('tap'); showWorlds(); });
  mapBack.addEventListener('click', () => { sfx('tap'); if (isExtra(mapWorld)) showWorlds(); else showWorld(worldOf(mapWorld)); });
  bonusBtn.addEventListener('click', () => { if (WORLDS[BONUS]) { sfx('tap'); showMap(BONUS); } else sfx('boink'); });
  classicBtn.addEventListener('click', () => { if (WORLDS[CLASSIC]) { sfx('tap'); showMap(CLASSIC); } else sfx('boink'); });
  cardMap.addEventListener('click', () => { sfx('tap'); const was = party.on; endParty(); if (was) showMap(mapWorld); else if (isExtra(mapWorld)) showWorlds(); else showWorld(worldOf(mapWorld)); });
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
