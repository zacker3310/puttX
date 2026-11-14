// The course surfaces the app grows itself, from the same sim data the physics uses: the turf grid,
// the collar round the cup, each zone, the slab's skirt and the ground plane (src/game.js
// gridGeometry, floorShade, collarGeometry, skirtGeometry and buildHoleScene's ground). They are most
// of a hole's vertices and every one follows groundH, so they are not exported; TerrainTests holds
// them to the web's own geometry.
import Foundation

/// a triangle mesh as plain arrays; `shade` is the web's grey vertex colour (baked light), when it has one
public struct MeshData: Sendable {
    public var positions: [Float] = []
    public var normals: [Float] = []
    public var uvs: [Float] = []
    public var shade: [Float]? = nil
    public var indices: [UInt32] = []
    public var vertexCount: Int { positions.count / 3 }

    /// smooth normals from the faces, as three's computeVertexNormals: each face's (unnormalised) normal summed into its corners
    public mutating func computeNormals() {
        var n = [Float](repeating: 0, count: positions.count)
        let p = positions
        for t in stride(from: 0, to: indices.count - 2, by: 3) {
            let a = Int(indices[t]) * 3, b = Int(indices[t + 1]) * 3, c = Int(indices[t + 2]) * 3
            let ex = p[c] - p[b], ey = p[c + 1] - p[b + 1], ez = p[c + 2] - p[b + 2]
            let fx = p[a] - p[b], fy = p[a + 1] - p[b + 1], fz = p[a + 2] - p[b + 2]
            let nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx
            for v in [a, b, c] { n[v] += nx; n[v + 1] += ny; n[v + 2] += nz }
        }
        for v in stride(from: 0, to: n.count, by: 3) {
            let l = (n[v] * n[v] + n[v + 1] * n[v + 1] + n[v + 2] * n[v + 2]).squareRoot()
            if l > 0 { n[v] /= l; n[v + 1] /= l; n[v + 2] /= l }
        }
        normals = n
    }
}

/// the web's seeded noise: rng32 (mulberry-style), a tileable value-noise lattice of Float32s, and fbm
public enum Noise {
    public static func rng32(_ seed: UInt32) -> () -> Double {
        var s: UInt32 = seed == 0 ? 1 : seed
        return {
            s = (s ^ (s >> 15)) &* 2_246_822_519 &+ 0x6d2b_79f5
            return Double(s) / 4_294_967_296
        }
    }
    /// tileable value noise on a period x period lattice, smoothstepped
    public static func field(_ seed: UInt32, _ period: Int) -> (Double, Double) -> Double {
        let r = rng32(seed)
        let g = (0..<(period * period)).map { _ in Double(Float(r())) }
        func at(_ i: Int, _ j: Int) -> Double { g[((j % period + period) % period) * period + ((i % period + period) % period)] }
        return { u, v in
            let x = u * Double(period), y = v * Double(period), i = Int(x.rounded(.down)), j = Int(y.rounded(.down))
            let fx = x - Double(i), fy = y - Double(j)
            let sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
            let a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx, b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx
            return a + (b - a) * sy
        }
    }
    public static func fbm(_ seed: UInt32, _ base: Int, _ octaves: Int) -> (Double, Double) -> Double {
        let fs = (0..<octaves).map { field(seed + UInt32($0 * 101), base << $0) }
        return { u, v in
            var s = 0.0, a = 0.5, n = 0.0
            for f in fs { s += f(u, v) * a; n += a; a *= 0.5 }
            return s / n
        }
    }
}

public enum Terrain {
    /// the grid stops this far from the cup; a fine ring of the same turf runs from there to the rim
    public static let COLLAR_R = 0.26

    public struct Bounds: Sendable { public let x0, x1, z0, z1: Double; public var cx: Double { (x0 + x1) / 2 }; public var cz: Double { (z0 + z1) / 2 } }
    public static func bounds(_ h: Hole) -> Bounds {
        var x0 = Double.infinity, x1 = -Double.infinity, z0 = Double.infinity, z1 = -Double.infinity
        for f in h.data.floors { for p in f.pts { x0 = min(x0, p.x); x1 = max(x1, p.x); z0 = min(z0, p.z); z1 = max(z1, p.z) } }
        return Bounds(x0: x0, x1: x1, z0: z0, z1: z1)
    }

    /// clear of the cup's collar and every tube mouth: where the grid may lay turf
    static func offCup(_ h: Hole, _ x: Double, _ z: Double) -> Bool {
        hypot(x - h.cup.x, z - h.cup.z) >= COLLAR_R && h.data.tubes.allSatisfy { hypot(x - $0.a.x, z - $0.a.z) >= Sim.TUBE_R * 0.9 }
    }

    /// a grid over the hole's bounding box keeping cells whose centre passes `keep`; heights follow groundH
    public static func grid(_ h: Hole, lift: Double = 0, shade: ((Double, Double) -> Double)? = nil, keep: (Double, Double) -> Bool) -> MeshData {
        let B = bounds(h), C = (B.x1 - B.x0) * (B.z1 - B.z0) > 60 ? 0.07 : 0.05
        let nx = Int(((B.x1 - B.x0) / C).rounded(.up)), nz = Int(((B.z1 - B.z0) / C).rounded(.up))
        var m = MeshData()
        if shade != nil { m.shade = [] }
        let e = 0.02
        for j in 0...nz { for i in 0...nx {
            let x = B.x0 + Double(i) * C, z = B.z0 + Double(j) * C
            m.positions += [Float(x), Float(h.groundH(x, z) + lift), Float(z)]
            m.uvs += [Float(x * 1.5), Float(z * 1.5)]
            if let shade { m.shade!.append(Float(shade(x, z))) }
            // normals from the ground's own shape (central differences): no seams where the grid is cut
            let gx = h.groundH(x - e, z) - h.groundH(x + e, z), gz = h.groundH(x, z - e) - h.groundH(x, z + e)
            let l = (gx * gx + 4 * e * e + gz * gz).squareRoot()
            m.normals += [Float(gx / l), Float(2 * e / l), Float(gz / l)]
        } }
        for j in 0..<nz { for i in 0..<nx {
            if !keep(B.x0 + (Double(i) + 0.5) * C, B.z0 + (Double(j) + 0.5) * C) { continue }
            let a = UInt32(j * (nx + 1) + i), b = a + 1, c = a + UInt32(nx + 1), d = c + 1
            m.indices += [a, c, b, b, c, d]
        } }
        return m
    }

    /// the turf's baked light: contact shadow at walls, posts and the foot of a step, and a slow mottle
    public static func floorShade(_ h: Hole) -> (Double, Double) -> Double {
        let mott = Noise.field(UInt32(97 + h.key.utf16.count), 64)
        return { x, z in
            var ao = 1.0
            for (i, s) in h.segs.enumerated() {
                let bb = h.segBox[i]
                if x < bb.x0 - 0.1 || x > bb.x1 + 0.1 || z < bb.z0 - 0.1 || z > bb.z1 + 0.1 { continue }
                let p = closestOnSeg(s.ax, s.az, s.bx, s.bz, x, z), d = hypot(x - p.0, z - p.1) - Sim.WALL_HALF
                ao = min(ao, 1 - 0.34 * exp(-max(0, d) / 0.045))
            }
            for p in h.data.posts { let d = hypot(x - p.x, z - p.z) - p.r; if d < 0.25 { ao = min(ao, 1 - 0.3 * exp(-max(0, d) / 0.035)) } }
            let y = h.groundH(x, z)
            var rise = 0.0
            for (ox, oz) in [(0.05, 0.0), (-0.05, 0.0), (0.0, 0.05), (0.0, -0.05)] { rise = max(rise, h.groundH(x + ox, z + oz) - y) }
            if rise > 0.02 { ao *= 1 - min(0.28, (rise - 0.02) * 4) }
            return ao * (0.96 + 0.08 * mott(x / 9, z / 9))
        }
    }

    public static func floor(_ h: Hole) -> MeshData {
        grid(h, shade: floorShade(h)) { x, z in h.onFloor(x, z) && offCup(h, x, z) }
    }
    /// zone i (in the hole's order), lifted as the web lifts it (water 2 mm, the rest 4 mm)
    public static func zone(_ h: Hole, _ i: Int) -> MeshData {
        let zn = h.data.zones[i], lift = zn.surf == .water ? 0.002 : 0.004
        return grid(h, lift: lift) { x, z in
            // the first zone containing the point is the one it belongs to, as zoneAt decides
            h.data.zones.firstIndex { $0.poly.contains(x, z) } == i && h.onFloor(x, z) && offCup(h, x, z)
        }
    }

    /// a fine ring of turf from the grid's edge to the cup's rim
    public static func collar(_ h: Hole) -> MeshData {
        let cx = h.cup.x, cz = h.cup.z, N = 96, rings = [Sim.CUP_R, Sim.CUP_R + 0.02, 0.06 + Sim.CUP_R, 0.17, COLLAR_R + 0.07], shade = floorShade(h)
        var m = MeshData(); m.shade = []
        for r in rings { for i in 0...N {
            let a = Double(i) / Double(N) * Double.pi * 2, x = cx + cos(a) * r, z = cz + sin(a) * r
            m.positions += [Float(x), Float(h.groundH(x, z) + 0.0015), Float(z)]; m.uvs += [Float(x * 1.5), Float(z * 1.5)]; m.shade!.append(Float(shade(x, z)))
        } }
        for k in 0..<(rings.count - 1) { for i in 0..<N {
            let a = UInt32(k * (N + 1) + i), b = a + 1, c = a + UInt32(N + 1), d = c + 1
            m.indices += [a, b, c, b, d, c]
        } }
        m.computeNormals()
        return m
    }

    /// the sides of every floor, so raised and floating floors read as solid slabs
    public static func skirt(_ h: Hole, bottom: Double) -> MeshData {
        var m = MeshData()
        let TILE = 0.5
        for f in h.data.floors {
            let pts = f.pts, n = Double(pts.count)
            let cx = pts.reduce(0) { $0 + $1.x } / n, cz = pts.reduce(0) { $0 + $1.z } / n
            var run = 0.0
            for i in 0..<pts.count {
                let a = pts[i], b = pts[(i + 1) % pts.count], L = hypot(b.x - a.x, b.z - a.z), segs = max(1, Int((L / 0.08).rounded(.up)))
                for k in 0...segs {
                    let u = Double(k) / Double(segs), x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u
                    let dd = hypot(cx - x, cz - z), d = dd == 0 ? 1 : dd
                    let y = h.groundH(x + (cx - x) / d * 0.02, z + (cz - z) / d * 0.02), lo = min(bottom, y - 0.05), s = (run + L * u) / TILE
                    if k > 0 { let v = UInt32(m.vertexCount); m.indices += [v - 2, v - 1, v, v - 1, v + 1, v] }
                    m.positions += [Float(x), Float(y), Float(z), Float(x), Float(lo), Float(z)]
                    m.uvs += [Float(s), Float(y / TILE), Float(s), Float(lo / TILE)]
                }
                run += L
            }
        }
        m.computeNormals()
        return m
    }

    /// the ground beyond the course: a 120 m plane at -3 cm with a slow fbm shade, its texture tiled 48 times
    public static func ground() -> MeshData {
        let n = 60, size = 120.0, gn = Noise.fbm(113, 4, 3)
        var m = MeshData(); m.shade = []
        for iy in 0...n { for ix in 0...n {
            // three's PlaneGeometry, laid flat: its local y becomes -z
            let lx = Double(ix) / Double(n) * size - size / 2, ly = size / 2 - Double(iy) / Double(n) * size
            m.positions += [Float(lx), -0.03, Float(-ly)]
            m.normals += [0, 1, 0]
            m.uvs += [Float(Double(ix) / Double(n)), Float(1 - Double(iy) / Double(n))]
            m.shade!.append(Float(0.82 + 0.3 * gn(lx / 60 + 0.5, ly / 60 + 0.5)))
        } }
        for iy in 0..<n { for ix in 0..<n {
            let a = UInt32(iy * (n + 1) + ix), b = UInt32((iy + 1) * (n + 1) + ix), c = b + 1, d = a + 1
            m.indices += [a, b, d, b, c, d]
        } }
        return m
    }

    /// the ground with a round hole under the cup. The web draws its ground first without depth, as a
    /// backdrop; RealityKit cannot, so a plane 3 cm down would plug every cup on a flat hole. The grid
    /// cells under the cup go, and a ring with the hole in it fills their rectangle, its uvs and shade
    /// laid as the grid lays them, so the cut shows only down the cup.
    public static func ground(cutting c: Vec2, r: Double = Sim.CUP_R + 0.01) -> MeshData {
        var m = ground()
        let n = 60, cell = 2.0, half = 60.0
        func idx(_ v: Double) -> Int { max(0, min(n - 1, Int(((v + half) / cell).rounded(.down)))) }
        let ix0 = idx(c.x - r), ix1 = idx(c.x + r), iz0 = idx(c.z - r), iz1 = idx(c.z + r)
        // vertex row iy sits at z = iy * cell - half, so cells index straight from x and z
        var keep: [UInt32] = []
        for iy in 0..<n { for ix in 0..<n where !(ix0...ix1 ~= ix && iz0...iz1 ~= iy) {
            let k = (iy * n + ix) * 6
            keep += m.indices[k..<k + 6]
        } }
        m.indices = keep
        let X0 = Double(ix0) * cell - half, X1 = Double(ix1 + 1) * cell - half
        let Z0 = Double(iz0) * cell - half, Z1 = Double(iz1 + 1) * cell - half
        // shade between the grid's own vertices, as the grid would interpolate it along its edges
        func shade(_ x: Double, _ z: Double) -> Float {
            let fx = (x + half) / cell, fz = (z + half) / cell
            let i = max(0, min(n - 1, Int(fx.rounded(.down)))), j = max(0, min(n - 1, Int(fz.rounded(.down))))
            let u = Float(fx - Double(i)), v = Float(fz - Double(j))
            func s(_ a: Int, _ b: Int) -> Float { m.shade![b * (n + 1) + a] }
            return (s(i, j) * (1 - u) + s(i + 1, j) * u) * (1 - v) + (s(i, j + 1) * (1 - u) + s(i + 1, j + 1) * u) * v
        }
        func vertex(_ x: Double, _ z: Double) -> UInt32 {
            let k = UInt32(m.positions.count / 3)
            m.positions += [Float(x), -0.03, Float(z)]
            m.normals += [0, 1, 0]
            m.uvs += [Float((x + half) / (2 * half)), Float(1 - (z + half) / (2 * half))]
            m.shade!.append(shade(x, z))
            return k
        }
        // round the cup, with the rectangle's corners among the angles so its edges stay straight
        var angles = (0..<64).map { Double($0) / 64 * 2 * .pi }
        for (x, z) in [(X0, Z0), (X1, Z0), (X1, Z1), (X0, Z1)] {
            let a = atan2(z - c.z, x - c.x); angles.append(a < 0 ? a + 2 * .pi : a)
        }
        angles.sort()
        var ring: [(UInt32, UInt32)] = []
        for a in angles {
            let ux = cos(a), uz = sin(a)
            var t = Double.infinity
            if ux > 1e-12 { t = min(t, (X1 - c.x) / ux) } else if ux < -1e-12 { t = min(t, (X0 - c.x) / ux) }
            if uz > 1e-12 { t = min(t, (Z1 - c.z) / uz) } else if uz < -1e-12 { t = min(t, (Z0 - c.z) / uz) }
            ring.append((vertex(c.x + ux * r, c.z + uz * r), vertex(c.x + ux * t, c.z + uz * t)))
        }
        for i in 0..<ring.count {
            let (a, b) = ring[i], (a2, b2) = ring[(i + 1) % ring.count]
            m.indices += [a, a2, b, b, a2, b2]
        }
        return m
    }
}
