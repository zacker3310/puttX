/* scene-format: the mesh files export-scene writes for the iOS app, and reads back for check-scene.
   PXG2, little-endian, about 2.3 times smaller than plain floats and invisible on screen:
     'PXG2' | vertices u32 | indices u32 | flags u32 | groups u32 | box min f32 x3 | box size f32 x3
     positions u16 x3 (quantised to the box: 0.03 mm on a 2 m prop)
     normals   i8 x4 (x, y, z, 0)
     uvs       f16 x2 when every |uv| <= 4 (flag 16), else f32 x2      (flag 1: present)
     colours   u8 (grey, flag 4) or u8 x3                              (flag 2: present)
     indices   u16 (flag 8) or u32
     groups    u32 x3 (start, count, material); count 0xffffffff = to the end
   PXG1 (plain f32 positions, normals, uvs, colours and u32 indices) is still read. */
'use strict';

const F32 = new Float32Array(1), U32 = new Uint32Array(F32.buffer);
/* IEEE half from a float, round to nearest */
function toHalf(v) {
  F32[0] = v; const x = U32[0], sign = (x >>> 16) & 0x8000, e = ((x >>> 23) & 0xff) - 127 + 15, m = x & 0x7fffff;
  if (e <= 0) { if (e < -10) return sign; const mm = (m | 0x800000) >> (1 - e); return sign | ((mm + 0x1000) >> 13); }
  if (e >= 31) return sign | 0x7c00;
  const h = sign | (e << 10) | (m >> 13);
  return (m & 0x1000) ? h + 1 : h;
}
function fromHalf(h) {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, m = h & 0x3ff;
  if (e === 0) return s * m * 2 ** -24;
  if (e === 31) return m ? NaN : s * Infinity;
  return s * (1 + m / 1024) * 2 ** (e - 15);
}

/* g: { pos, nor, uv?, col?, idx, groups } as plain arrays (col either v or 3v long) */
function encode(g) {
  const v = g.pos.length / 3, grey = !!g.col && g.col.length === v, small = v <= 65535;
  const halfUV = !!g.uv && g.uv.every(x => Math.abs(x) <= 4);
  const flags = (g.uv ? 1 : 0) | (g.col ? 2 : 0) | (grey ? 4 : 0) | (small ? 8 : 0) | (halfUV ? 16 : 0);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < v; i++) for (let k = 0; k < 3; k++) { const x = g.pos[i * 3 + k]; lo[k] = Math.min(lo[k], x); hi[k] = Math.max(hi[k], x); }
  if (!v) { lo.fill(0); hi.fill(0); }
  const size = hi.map((x, k) => Math.max(x - lo[k], 1e-9));
  const n = 44 + v * 6 + v * 4 + (g.uv ? v * (halfUV ? 4 : 8) : 0) + (g.col ? (grey ? v : v * 3) : 0) + g.idx.length * (small ? 2 : 4) + g.groups.length * 12;
  const b = Buffer.alloc(n);
  let o = b.write('PXG2', 0, 'ascii');
  for (const x of [v, g.idx.length, flags, g.groups.length]) o = b.writeUInt32LE(x, o);
  for (const x of [...lo, ...size]) o = b.writeFloatLE(x, o);
  for (let i = 0; i < v * 3; i++) o = b.writeUInt16LE(Math.round((g.pos[i] - lo[i % 3]) / size[i % 3] * 65535), o);
  for (let i = 0; i < v; i++) { for (let k = 0; k < 3; k++) o = b.writeInt8(Math.max(-127, Math.min(127, Math.round(g.nor[i * 3 + k] * 127))), o); o = b.writeInt8(0, o); }
  if (g.uv) for (const x of g.uv) o = halfUV ? b.writeUInt16LE(toHalf(x), o) : b.writeFloatLE(x, o);
  if (g.col) for (const x of g.col) o = b.writeUInt8(Math.max(0, Math.min(255, Math.round(x * 255))), o);
  for (const i of g.idx) o = small ? b.writeUInt16LE(i, o) : b.writeUInt32LE(i, o);
  for (const gr of g.groups) for (const x of gr) o = b.writeUInt32LE(Number.isFinite(x) ? Math.min(x, 0xffffffff) : 0xffffffff, o);
  return b;
}

/* either format back to plain arrays */
function decode(b) {
  const tag = b.toString('ascii', 0, 4);
  const v = b.readUInt32LE(4), ni = b.readUInt32LE(8), flags = b.readUInt32LE(12), ng = b.readUInt32LE(16), g = { groups: [] };
  let o;
  if (tag === 'PXG1') {
    o = 20;
    const f = n => { const a = new Array(n); for (let i = 0; i < n; i++) { a[i] = b.readFloatLE(o); o += 4; } return a; };
    g.pos = f(v * 3); g.nor = f(v * 3); g.uv = flags & 1 ? f(v * 2) : null; g.col = flags & 2 ? f(flags & 4 ? v : v * 3) : null;
    g.idx = []; for (let i = 0; i < ni; i++) { g.idx.push(b.readUInt32LE(o)); o += 4; }
  } else if (tag === 'PXG2') {
    o = 20;
    const lo = [], size = [];
    for (let k = 0; k < 3; k++) { lo.push(b.readFloatLE(o)); o += 4; }
    for (let k = 0; k < 3; k++) { size.push(b.readFloatLE(o)); o += 4; }
    g.pos = []; for (let i = 0; i < v * 3; i++) { g.pos.push(lo[i % 3] + b.readUInt16LE(o) / 65535 * size[i % 3]); o += 2; }
    g.nor = []; for (let i = 0; i < v; i++) { const x = b.readInt8(o) / 127, y = b.readInt8(o + 1) / 127, z = b.readInt8(o + 2) / 127, l = Math.hypot(x, y, z) || 1; g.nor.push(x / l, y / l, z / l); o += 4; }
    g.uv = null;
    if (flags & 1) { g.uv = []; for (let i = 0; i < v * 2; i++) { if (flags & 16) { g.uv.push(fromHalf(b.readUInt16LE(o))); o += 2; } else { g.uv.push(b.readFloatLE(o)); o += 4; } } }
    g.col = null;
    if (flags & 2) { g.col = []; for (let i = 0; i < (flags & 4 ? v : v * 3); i++) g.col.push(b.readUInt8(o++) / 255); }
    g.idx = []; for (let i = 0; i < ni; i++) { if (flags & 8) { g.idx.push(b.readUInt16LE(o)); o += 2; } else { g.idx.push(b.readUInt32LE(o)); o += 4; } }
  } else throw new Error('scene-format: not a mesh file');
  for (let i = 0; i < ng; i++) { const s = b.readUInt32LE(o), c = b.readUInt32LE(o + 4), m = b.readUInt32LE(o + 8); o += 12; g.groups.push([s, c === 0xffffffff ? Infinity : c, m]); }
  return g;
}

module.exports = { encode, decode, toHalf, fromHalf };
