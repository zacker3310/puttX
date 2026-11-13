// The sim: a line-for-line port of src/game.js `// #region sim` (2a to 2d). Deterministic, fixed
// 240 Hz. Every expression keeps the JS evaluation order, because the golden putts are compared to
// the bit; change the physics in JS first, re-export, then mirror it here.
import Foundation

public enum Sim {
    public static let SIM_DT = 1.0 / 240
    public static let BALL_R = 0.0255
    public static let CUP_R = 0.099
    public static let CUP_SINK = 0.2
    static let SPIN_I = 0.4
    static let SLIDE_J = SPIN_I / (1 + SPIN_I)
    static let SLIP_EPS = 2e-3
    public static let MIN_V = 0.354, MAX_V = 5.4
    static let V_CAP = 6.5
    static let STOP_V = 0.03
    static let SETTLE_T = 0.4
    static let STATIC_MU = 0.1
    static let MAX_SIM_T = 40.0
    public static let G = 9.8
    static let ROLL = 5.0 / 7
    static let GLIDE = 0.62, FELT_MU = 0.075
    struct Surf { let mu, slide, e: Double }
    static func surf(_ s: Surface) -> Surf {
        switch s {
        case .felt: return Surf(mu: FELT_MU * GLIDE, slide: 0.22, e: 0.5)
        case .ice: return Surf(mu: 0.006, slide: 0.03, e: 0.6)
        case .sand: return Surf(mu: 0.4 * GLIDE, slide: 0.55, e: 0.12)
        case .mud: return Surf(mu: 0.75 * GLIDE, slide: 0.7, e: 0.05)
        case .fast: return Surf(mu: 0.04 * GLIDE, slide: 0.16, e: 0.55)
        case .water: return Surf(mu: FELT_MU * GLIDE, slide: 0.22, e: 0.1)
        }
    }
    static let FELT = surf(.felt)
    public static let WALL_TOP = 0.15, WALL_HALF = 0.05
    static let WALL_E = 0.8, WALL_MU = 0.18
    static let POST_E = 0.65, MOVER_E = 0.8, HOP_V = 0.25
    static let STEP_MAX = 0.03
    static let CLIFF_E = 0.45
    static let BOUNCE_VY = 0.75
    static let OOB_Y = -1.0
    static let RIM_E = 0.0, RIM_MU = 1.0, RIM_RHO = 0.008, LINER_E = 0.35, LINER_MU = 0.2, SUNK_DEPTH = 0.5
    public static let DISH_R = 0.22, DISH_D = 0.006
    public static let TUBE_R = 0.12
    static let TUBE_T = 0.45
    static let DRAIN_FLAT = CUP_R + 0.07
    static let RELIEF_GAP = 0.025, RELIEF_TO = 0.12
}

// MARK: helpers
@inline(__always) func hyp(_ a: Double, _ b: Double) -> Double { (a * a + b * b).squareRoot() }
@inline(__always) func clamp(_ v: Double, _ lo: Double, _ hi: Double) -> Double { Swift.max(lo, Swift.min(hi, v)) }
@inline(__always) func within(_ dx: Double, _ dz: Double, _ r: Double) -> Bool { dx < r && dx > -r && dz < r && dz > -r }
/// JS `a || b` for numbers: b when a is 0 or NaN
@inline(__always) func or(_ a: Double, _ b: Double) -> Double { a == 0 || a.isNaN ? b : a }
/// JS Math.sign
@inline(__always) func jsSign(_ x: Double) -> Double { x > 0 ? 1 : x < 0 ? -1 : x }

// MARK: 2b. hole geometry
extension Hole {
    @inline(__always) public func onFloor(_ x: Double, _ z: Double) -> Bool { data.floors.contains { $0.contains(x, z) } }
    @inline(__always) func zoneAt(_ x: Double, _ z: Double) -> Zone? { data.zones.first { $0.poly.contains(x, z) } }

    /// the plateau under (x, z) and its slope, before bumps
    func baseAt(_ x: Double, _ z: Double) -> (Double, Double, Double) {
        for r in data.ramps where r.contains(x, z) {
            if r.axis == .x { let k = (r.h1 - r.h0) / (r.x1 - r.x0); return (r.h0 + k * (x - r.x0), k, 0) }
            let k = (r.h1 - r.h0) / (r.z1 - r.z0); return (r.h0 + k * (z - r.z0), 0, k)
        }
        for t in data.tiers.reversed() where t.poly.contains(x, z) { return (t.h + t.sx * x + t.sz * z, t.sx, t.sz) }
        return (0, 0, 0)
    }
    static func drainY(_ d: Double, _ dr: Drain) -> (Double, Double) {
        let f = or(dr.flat, Sim.DRAIN_FLAT)
        if d >= dr.r { return (0, 0) }
        if d <= f { return (-dr.depth, 0) }
        let u = (dr.r - d) / (dr.r - f)
        return (-dr.depth * u * u, 2 * dr.depth * u / (dr.r - f))
    }
    static func dishY(_ d: Double) -> (Double, Double) {
        if d >= Sim.DISH_R { return (0, 0) }
        let u = d / Sim.DISH_R, w = 1 - u * u
        return (-Sim.DISH_D * w * w, 4 * Sim.DISH_D * u * w / Sim.DISH_R)
    }
    public func groundH(_ x: Double, _ z: Double) -> Double {
        var y = baseAt(x, z).0
        for b in data.bumps { let dx = x - b.x, dz = z - b.z; y += b.h * dexp(-(dx * dx + dz * dz) / (b.r * b.r)) }
        for dr in data.drains { let dx = x - dr.x, dz = z - dr.z; y += within(dx, dz, dr.r) ? Hole.drainY(hyp(dx, dz), dr).0 : 0 }
        let dx = x - cup.x, dz = z - cup.z
        y += within(dx, dz, Sim.DISH_R) ? Hole.dishY(hyp(dx, dz)).0 : 0
        return y
    }
    public func groundGrad(_ x: Double, _ z: Double) -> (Double, Double) {
        let base = baseAt(x, z)
        var gx = base.1, gz = base.2
        for b in data.bumps {
            let dx = x - b.x, dz = z - b.z, k = -2 * b.h * dexp(-(dx * dx + dz * dz) / (b.r * b.r)) / (b.r * b.r)
            gx += k * dx; gz += k * dz
        }
        for dr in data.drains {
            let dx = x - dr.x, dz = z - dr.z
            if !within(dx, dz, dr.r) { gx += 0 * dx; gz += 0 * dz; continue }
            let d = hyp(dx, dz), s = d > 1e-9 ? Hole.drainY(d, dr).1 / d : 0
            gx += s * dx; gz += s * dz
        }
        let dx = x - cup.x, dz = z - cup.z
        if within(dx, dz, Sim.DISH_R) { let d = hyp(dx, dz); if d < Sim.DISH_R && d > 1e-9 { let s = Hole.dishY(d).1 / d; gx += s * dx; gz += s * dz } }
        return (gx, gz)
    }
}

// MARK: 2c. collisions
@inline(__always) func closestOnSeg(_ ax: Double, _ az: Double, _ bx: Double, _ bz: Double, _ x: Double, _ z: Double) -> (Double, Double) {
    let ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez
    let t = L2 != 0 ? clamp(((x - ax) * ex + (z - az) * ez) / L2, 0, 1) : 0
    return (ax + ex * t, az + ez * t)
}

public enum HitKind: String, Sendable, Codable { case wall, bump, post, mover, rattle, lip, land, splash, tubeIn, tubeOut }
public struct Hit: Sendable, Equatable { public let kind: HitKind, v: Double }

public struct Ball: Sendable {
    /// x, z the centre; y the bottom of the ball (its centre is BALL_R above)
    public var x, z, y: Double
    public var vx = 0.0, vz = 0.0, vy = 0.0, wx = 0.0, wy = 0.0, wz = 0.0
    public var slide = false, air = false
    public var tube: (def: Tube, t: Double, v: Double)?
    public var still = 0.0
    public var hits: [Hit] = []
    public init(_ h: Hole, _ x: Double, _ z: Double) { self.x = x; self.z = z; y = h.groundH(x, z) }
}

public struct MoverState: Sendable {
    public var th = 0.0, x = 0.0, z = 0.0, vx = 0.0, vz = 0.0
    public var bars: [Seg] = []
}
extension Mover {
    public func state(at t: Double) -> MoverState {
        var st = MoverState()
        if kind == .spin {
            let th = phase + w! * t, n = blades ?? 1, len = len!
            st.th = th
            for i in 0..<n {
                let a = th + Double(i) * Double.pi / Double(n), dx = dsin(a) * len, dz = dcos(a) * len
                st.bars.append(Seg(ax: x! - dx, az: z! - dz, bx: x! + dx, bz: z! + dz))
            }
            return st
        }
        let ax = ax!, az = az!, bx = bx!, bz = bz!
        let k = 2 * Double.pi / period!, u = k * t + phase, s = 0.5 - 0.5 * dcos(u), ds = 0.5 * dsin(u) * k
        st.x = ax + (bx - ax) * s; st.z = az + (bz - az) * s; st.vx = (bx - ax) * ds; st.vz = (bz - az) * ds
        if kind == .gate {
            let a = (ang ?? 0) * Double.pi / 180, dx = dsin(a) * len!, dz = dcos(a) * len!
            st.bars = [Seg(ax: st.x - dx, az: st.z - dz, bx: st.x + dx, bz: st.z + dz)]
        }
        return st
    }
}

/// one contact as an impulse at the contact point: n pushes the ball away, e restitution, mu friction,
/// sv the surface's own velocity. Unit mass. Returns the approach speed.
@discardableResult
func impulse(_ b: inout Ball, _ nx: Double, _ ny: Double, _ nz: Double, _ e: Double, _ mu: Double,
             _ svx: Double = 0, _ svy: Double = 0, _ svz: Double = 0) -> Double {
    let R = Sim.BALL_R, rx = -R * nx, ry = -R * ny, rz = -R * nz
    let ux = b.vx - svx + b.wy * rz - b.wz * ry, uy = b.vy - svy + b.wz * rx - b.wx * rz, uz = b.vz - svz + b.wx * ry - b.wy * rx
    let un = ux * nx + uy * ny + uz * nz
    if un >= 0 { return 0 }
    let jn = -(1 + e) * un, tx = ux - un * nx, ty = uy - un * ny, tz = uz - un * nz, ts = (tx * tx + ty * ty + tz * tz).squareRoot()
    b.vx += jn * nx; b.vy += jn * ny; b.vz += jn * nz
    if ts > 1e-9 {
        let k = Swift.min(mu * jn, Sim.SLIDE_J * ts) / ts, fx = -tx * k, fy = -ty * k, fz = -tz * k, ik = 1 / (Sim.SPIN_I * R * R)
        b.vx += fx; b.vy += fy; b.vz += fz
        b.wx += (ry * fz - rz * fy) * ik; b.wy += (rz * fx - rx * fz) * ik; b.wz += (rx * fy - ry * fx) * ik
    }
    let s = hyp(b.vx, b.vz)
    if s > Sim.V_CAP { b.vx *= Sim.V_CAP / s; b.vz *= Sim.V_CAP / s }
    return -un
}
@inline(__always) @discardableResult
func bounce(_ b: inout Ball, _ nx: Double, _ nz: Double, _ e: Double, _ svx: Double, _ svz: Double, _ mu: Double = Sim.WALL_MU) -> Double {
    impulse(&b, nx, 0, nz, e, mu, svx, 0, svz)
}
func hitSeg(_ b: inout Ball, _ ax: Double, _ az: Double, _ bx: Double, _ bz: Double, _ e: Double, _ svx: Double = 0, _ svz: Double = 0) -> Double {
    let (px, pz) = closestOnSeg(ax, az, bx, bz, b.x, b.z), R = Sim.BALL_R + Sim.WALL_HALF
    var nx = b.x - px, nz = b.z - pz
    let d = hyp(nx, nz)
    if d >= R || d < 1e-9 { return 0 }
    nx /= d; nz /= d
    b.x = px + nx * R; b.z = pz + nz * R
    return bounce(&b, nx, nz, e, svx, svz)
}
func hitCircle(_ b: inout Ball, _ cx: Double, _ cz: Double, _ cr: Double, _ e: Double, _ svx: Double = 0, _ svz: Double = 0) -> Double {
    var nx = b.x - cx, nz = b.z - cz
    if !within(nx, nz, cr + Sim.BALL_R) { return 0 }
    let d = hyp(nx, nz), R = cr + Sim.BALL_R
    if d >= R || d < 1e-9 { return 0 }
    nx /= d; nz /= d
    b.x = cx + nx * R; b.z = cz + nz * R
    return bounce(&b, nx, nz, e, svx, svz)
}

extension Hole {
    /// does any mover touch a ball at rest here at time t (the play layer's drift check)
    public func moverTouch(_ b: Ball, _ t: Double) -> Bool {
        for m in data.movers {
            let s = m.state(at: t)
            if !s.bars.isEmpty {
                for g in s.bars { let p = closestOnSeg(g.ax, g.az, g.bx, g.bz, b.x, b.z); if hyp(b.x - p.0, b.z - p.1) < Sim.BALL_R + Sim.WALL_HALF { return true } }
            } else if hyp(b.x - s.x, b.z - s.z) < m.r! + Sim.BALL_R { return true }
        }
        return false
    }
    func collideAll(_ b: inout Ball, _ t: Double) {
        let air = b.air
        for i in 0..<segs.count {
            let bb = segBox[i]
            if b.x < bb.x0 || b.x > bb.x1 || b.z < bb.z0 || b.z > bb.z1 { continue }
            if air && data.open && b.y > data.segTop[i][0] { continue }
            let s = segs[i], v = hitSeg(&b, s.ax, s.az, s.bx, s.bz, Sim.WALL_E)
            if v != 0 { b.hits.append(Hit(kind: .wall, v: v)) }
        }
        for p in data.posts {
            if air && b.y > groundH(p.x, p.z) + or(p.top, 0.22) { continue }
            let e = or(p.e, Sim.POST_E), v = hitCircle(&b, p.x, p.z, p.r, e)
            if v != 0 { b.hits.append(Hit(kind: e > 1 ? .bump : .post, v: v)) }
        }
        for m in data.movers {
            let s = m.state(at: t)
            var v = 0.0
            switch m.kind {
            case .spin:
                for g in s.bars {
                    let p = closestOnSeg(g.ax, g.az, g.bx, g.bz, b.x, b.z), rx = p.0 - m.x!, rz = p.1 - m.z!
                    v = Swift.max(v, hitSeg(&b, g.ax, g.az, g.bx, g.bz, Sim.MOVER_E, m.w! * rz, -m.w! * rx))
                }
            case .gate:
                let g = s.bars[0]; v = hitSeg(&b, g.ax, g.az, g.bx, g.bz, Sim.MOVER_E, s.vx, s.vz)
            case .slide:
                v = hitCircle(&b, s.x, s.z, m.r!, Sim.MOVER_E, s.vx, s.vz)
            }
            if v != 0 { b.hits.append(Hit(kind: .mover, v: v)) }
        }
    }
}

// MARK: 2d. the ball
public enum PuttEnd: String, Sendable, Codable { case stop, sunk, oob, timeout }

public func puttVelocity(_ angleDeg: Double, _ power: Double) -> (Double, Double) {
    let a = angleDeg * Double.pi / 180, v = Sim.MIN_V + (Sim.MAX_V - Sim.MIN_V) * clamp(power, 0, 1)
    return (dsin(a) * v, dcos(a) * v)
}

extension Ball {
    /// the putter face sends the ball off with no spin: it slides, and the turf spins it up to a roll
    public mutating func launch(_ angleDeg: Double, _ power: Double) {
        let v = puttVelocity(angleDeg, power)
        vx = v.0; vz = v.1; wx = 0; wy = 0; wz = 0; slide = true
    }
    mutating func rollSpin() { wx = vz / Sim.BALL_R; wz = -vx / Sim.BALL_R; slide = false }
}

extension Hole {
    func hitCliff(_ b: inout Ball, _ px: Double, _ pz: Double) -> Double {
        let s = hyp(b.vx, b.vz)
        if s < 1e-9 { return 0 }
        let lx = b.x + b.vx / s * Sim.BALL_R * 0.8, lz = b.z + b.vz / s * Sim.BALL_R * 0.8
        if !onFloor(lx, lz) || groundH(lx, lz) - b.y <= Sim.STEP_MAX { return 0 }
        let e = Sim.BALL_R
        var nx = -(groundH(lx + e, lz) - groundH(lx - e, lz)), nz = -(groundH(lx, lz + e) - groundH(lx, lz - e))
        let n = hyp(nx, nz)
        if n < 1e-9 { nx = -b.vx / s; nz = -b.vz / s } else { nx /= n; nz /= n }
        b.x = px; b.z = pz
        return bounce(&b, nx, nz, Sim.CLIFF_E, 0, 0)
    }
    @inline(__always) func cupDist(_ b: Ball) -> Double { hyp(b.x - cup.x, b.z - cup.z) }

    /// the hole itself: the liner below the rim, the rim's rounded edge at it
    @discardableResult
    func cupContact(_ b: inout Ball) -> Double {
        let R = Sim.BALL_R, dx = b.x - cup.x, dz = b.z - cup.z, d = hyp(dx, dz)
        if d >= Sim.CUP_R + Sim.RIM_RHO + R { return 0 }
        let ux = d > 1e-9 ? dx / d : 1, uz = d > 1e-9 ? dz / d : 0, kr = Sim.CUP_R + Sim.RIM_RHO
        let kx = cup.x + ux * kr, kz = cup.z + uz * kr, yk = groundH(kx, kz) - Sim.RIM_RHO, cy = b.y + R
        if cy < yk {
            if d < Sim.CUP_R - R || d >= Sim.CUP_R { return 0 }
            b.x = cup.x + ux * (Sim.CUP_R - R); b.z = cup.z + uz * (Sim.CUP_R - R)
            let v = impulse(&b, -ux, 0, -uz, Sim.LINER_E, Sim.LINER_MU)
            if v > 0.15 { b.hits.append(Hit(kind: .rattle, v: v)) }
            return v
        }
        let ex = b.x - kx, ey = cy - yk, ez = b.z - kz, el = (ex * ex + ey * ey + ez * ez).squareRoot(), reach = R + Sim.RIM_RHO
        if el >= reach || el < 1e-9 { return 0 }
        let nx = ex / el, ny = ey / el, nz = ez / el
        b.x = kx + nx * reach; b.z = kz + nz * reach; b.y = yk + ny * reach - R
        let vn = -(b.vx * nx + b.vy * ny + b.vz * nz), v = impulse(&b, nx, ny, nz, vn > 0.2 ? Sim.RIM_E : 0, Sim.RIM_MU)
        if v > 0.3 { b.hits.append(Hit(kind: .lip, v: v)) }
        return v
    }
    @inline(__always) func overHole(_ b: Ball) -> Bool {
        within(b.x - cup.x, b.z - cup.z, Sim.CUP_R + Sim.RIM_RHO) && cupDist(b) < Sim.CUP_R + Sim.RIM_RHO
    }

    func stepAir(_ b: inout Ball, _ t: Double, _ dt: Double, _ g: Double) -> PuttEnd? {
        let px = b.x, pz = b.z, py = b.y, dc = cupDist(b), s = hyp(b.vx, b.vz)
        let near = dc < Sim.CUP_R + Sim.RIM_RHO + 2 * Sim.BALL_R + s * dt
        let n = near ? Int(Swift.min(8, Swift.max(1, (s * dt / (0.2 * Sim.BALL_R)).rounded(.up)))) : 1, d = dt / Double(n)
        for _ in 0..<n {
            b.vy -= g * d; b.x += b.vx * d; b.z += b.vz * d; b.y += b.vy * d
            if near { cupContact(&b) }
        }
        collideAll(&b, t)
        let c = cupDist(b), c1 = or(c, 1)
        if c < Sim.CUP_R && b.y + Sim.BALL_R < groundH(cup.x + (b.x - cup.x) / c1 * Sim.CUP_R, cup.z + (b.z - cup.z) / c1 * Sim.CUP_R) - Sim.SUNK_DEPTH * Sim.BALL_R { return .sunk }
        if c >= Sim.CUP_R + Sim.RIM_RHO && onFloor(b.x, b.z) {
            let gh = groundH(b.x, b.z)
            if py < gh - Sim.STEP_MAX && b.y <= gh {
                let sp = or(hyp(b.vx, b.vz), 1)
                b.x = px; b.z = pz
                if bounce(&b, -b.vx / sp, -b.vz / sp, Sim.CLIFF_E, 0, 0) != 0 { b.hits.append(Hit(kind: .wall, v: sp)) }
            } else if b.y <= gh {
                let (gx, gz) = groundGrad(b.x, b.z), q = (1 + gx * gx + gz * gz).squareRoot(), nx = -gx / q, ny = 1 / q, nz = -gz / q
                let zn = zoneAt(b.x, b.z), sf = zn?.surf.map(Sim.surf) ?? Sim.FELT, imp = -(b.vx * nx + b.vy * ny + b.vz * nz)
                b.y = gh
                impulse(&b, nx, ny, nz, imp > Sim.BOUNCE_VY ? sf.e : 0, sf.slide)
                if imp <= Sim.BOUNCE_VY { b.air = false; b.vy = gx * b.vx + gz * b.vz; b.slide = true }
                if imp > 0.4 { b.hits.append(Hit(kind: .land, v: imp)) }
            }
        } else if b.y < Sim.OOB_Y { return .oob }
        return nil
    }

    /// one fixed step at hole time t: nil while the putt is live, else how it ended
    public func step(_ b: inout Ball, _ t: Double) -> PuttEnd? {
        let dt = Sim.SIM_DT, g = Sim.G * data.g, R = Sim.BALL_R
        if let tube = b.tube {
            b.tube!.t -= dt
            if b.tube!.t > 0 { return nil }
            let tb = tube.def, a = tb.dir * Double.pi / 180, v = clamp(tube.v * tb.keep + or(tb.add, 0.3), 0.4, Sim.V_CAP)
            b.x = tb.b.x; b.z = tb.b.z; b.y = groundH(b.x, b.z); b.vy = 0
            b.vx = dsin(a) * v; b.vz = dcos(a) * v; b.tube = nil; b.wy = 0; b.rollSpin(); b.hits.append(Hit(kind: .tubeOut, v: v))
            return nil
        }
        if b.air { return stepAir(&b, t, dt, g) }
        let grad = groundGrad(b.x, b.z), q = 1 + grad.0 * grad.0 + grad.1 * grad.1, gn = g / q.squareRoot()
        let gax = -g * grad.0 / q, gaz = -g * grad.1 / q
        let zn = zoneAt(b.x, b.z), sf = zn?.surf.map(Sim.surf)
        let mu = sf?.mu ?? data.feltMu, slide = sf?.slide ?? Sim.FELT.slide
        var vx = b.vx, vz = b.vz
        if let p = zn?.push { vx += p.x * dt; vz += p.z * dt }
        func roll(_ rx: Double, _ rz: Double) -> (Double, Double) {
            let s0 = hyp(rx, rz), s1 = Swift.max(0, s0 - mu * gn * dt), k = s0 > 0 ? Swift.min(s1, Sim.V_CAP) / s0 : 0
            return (rx * k, rz * k)
        }
        if hyp(vx + R * b.wz, vz - R * b.wx) > Sim.SLIP_EPS {
            (vx, vz) = roll(vx + gax * dt, vz + gaz * dt)
            let ux = vx + R * b.wz, uz = vz - R * b.wx, us = or(hyp(ux, uz), 1)
            let f = Swift.min(slide * gn * dt, Sim.SLIDE_J * us), fx = -ux / us * f, fz = -uz / us * f, ik = 1 / (Sim.SPIN_I * R)
            vx += fx; vz += fz; b.wx -= fz * ik; b.wz += fx * ik
            b.slide = hyp(vx + R * b.wz, vz - R * b.wx) > Sim.SLIP_EPS
        } else {
            (vx, vz) = roll(vx + Sim.ROLL * gax * dt, vz + Sim.ROLL * gaz * dt)
            b.slide = false
        }
        b.vx = vx; b.vz = vz
        if !b.slide { b.wx = vz / R; b.wz = -vx / R }
        b.wy -= jsSign(b.wy) * Swift.min(abs(b.wy), 60 * slide * gn * dt)
        let px = b.x, pz = b.z, vy0 = b.vy
        b.x += vx * dt; b.z += vz * dt
        collideAll(&b, t)
        let cv = hitCliff(&b, px, pz)
        if cv != 0 { b.hits.append(Hit(kind: .wall, v: cv)) }
        if b.vy - vy0 > Sim.HOP_V { b.air = true; return nil }
        b.vy = vy0
        if !onFloor(b.x, b.z) { b.air = true; b.vy -= g * dt; return nil }
        if overHole(b) { b.air = true; return nil }
        let gh = groundH(b.x, b.z), yFree = b.y + b.vy * dt - 0.5 * g * dt * dt
        if gh < yFree - 1e-4 { b.air = true; b.y = yFree; b.vy -= g * dt; return nil }
        b.vy = (gh - b.y) / dt; b.y = gh

        if let zw = zoneAt(b.x, b.z), zw.surf == .water { b.hits.append(Hit(kind: .splash, v: 1)); return .oob }
        for tb in data.tubes where within(b.x - tb.a.x, b.z - tb.a.z, Sim.TUBE_R) && hyp(b.x - tb.a.x, b.z - tb.a.z) < Sim.TUBE_R {
            b.tube = (tb, Sim.TUBE_T, hyp(b.vx, b.vz))
            b.x = tb.a.x; b.z = tb.a.z; b.vx = 0; b.vz = 0; b.hits.append(Hit(kind: .tubeIn, v: 1))
            return nil
        }
        let s = hyp(b.vx, b.vz), pushA = zn?.push.map { hyp($0.x, $0.z) } ?? 0
        if s < Sim.STOP_V && !b.slide && hyp(gax, gaz) * Sim.ROLL + pushA < Swift.max(Sim.STATIC_MU, mu) * g {
            b.vx = 0; b.vz = 0; b.wx = 0; b.wy = 0; b.wz = 0; return .stop
        }
        b.still = s < Sim.STOP_V ? b.still + Sim.SIM_DT : 0
        if b.still >= Sim.SETTLE_T { b.vx = 0; b.vz = 0; b.wx = 0; b.wy = 0; b.wz = 0; return .stop }
        return nil
    }
}
