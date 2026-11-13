// A hole, as the sim sees it: the resolved data scripts/export-ios.cjs writes from courses/cNN.sim.js,
// plus the derived wall segments and their broad-phase boxes (src/game.js makeHole).

public struct Vec2: Hashable, Sendable, Codable {
    public var x: Double, z: Double
    public init(_ x: Double, _ z: Double) { self.x = x; self.z = z }
    public init(from d: Decoder) throws {
        var c = try d.unkeyedContainer()
        x = try c.decode(Double.self); z = try c.decode(Double.self)
    }
    public func encode(to e: Encoder) throws { var c = e.unkeyedContainer(); try c.encode(x); try c.encode(z) }
}

/// A closed polygon in the x-z plane with its bounding box (padded by 1e-6 in x, as the sim's polyBox).
public struct Poly: Sendable, Codable {
    public let pts: [Vec2]
    public let bb: (x0: Double, x1: Double, z0: Double, z1: Double)
    public init(_ pts: [Vec2]) {
        self.pts = pts
        var x0 = Double.infinity, x1 = -Double.infinity, z0 = Double.infinity, z1 = -Double.infinity
        for p in pts { x0 = Swift.min(x0, p.x); x1 = Swift.max(x1, p.x); z0 = Swift.min(z0, p.z); z1 = Swift.max(z1, p.z) }
        bb = (x0 - 1e-6, x1 + 1e-6, z0, z1)
    }
    public init(from d: Decoder) throws { self.init(try [Vec2](from: d)) }
    public func encode(to e: Encoder) throws { try pts.encode(to: e) }

    public func contains(_ x: Double, _ z: Double) -> Bool {
        if z < bb.z0 || z > bb.z1 || x < bb.x0 || x > bb.x1 { return false }
        var inside = false
        var j = pts.count - 1
        for i in 0..<pts.count {
            let xi = pts[i].x, zi = pts[i].z, xj = pts[j].x, zj = pts[j].z
            if (zi > z) != (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi { inside.toggle() }
            j = i
        }
        return inside
    }
}

public struct Bump: Sendable, Codable { public let x, z, r, h: Double }
public struct Drain: Sendable, Codable { public let x, z, r, depth, flat: Double }
public struct Ramp: Sendable, Codable {
    public enum Axis: String, Sendable, Codable { case x, z }
    public let x0, z0, x1, z1: Double, axis: Axis, h0, h1: Double
    @inline(__always) func contains(_ x: Double, _ z: Double) -> Bool { x >= x0 && x <= x1 && z >= z0 && z <= z1 }
}
public struct Tier: Sendable, Codable { public let poly: Poly, h, sx, sz: Double }
public enum Surface: String, Sendable, Codable, CaseIterable { case felt, ice, sand, mud, fast, water }
public struct Zone: Sendable, Codable { public let poly: Poly, surf: Surface?, push: Vec2? }
public struct Post: Sendable, Codable {
    public let x, z, r, top: Double
    /// restitution; 0 means the default post bounce
    public let e: Double
    public let look: String?
}
public struct Mover: Sendable, Codable {
    public enum Kind: String, Sendable, Codable { case spin, slide, gate }
    public let kind: Kind
    // spin: hub, arm half-length, angular speed (rad/s), blades through the hub
    public let x, z, w: Double?
    public let blades: Int?
    // slide and gate: eases a -> b and back every `period` seconds; a slide is a disc of radius r,
    // a gate a bar of half-length len held at heading ang degrees
    public let ax, az, bx, bz, period, r, ang: Double?
    public let len: Double?
    public let phase: Double
    public let look: String?
}
public struct Tube: Sendable, Codable { public let a, b: Vec2, dir, keep, add: Double, color: String? }

public struct HoleData: Sendable, Codable {
    public let key: String, par: Int, g, feltMu: Double, open: Bool
    public let tee: Vec2, cup: Vec2, aim0: Double?, crazy: Bool, auto: Bool
    /// the solver's proof: (angle degrees, power 0...1, start time) per putt
    public let sol: [[Double]]
    public let floors: [Poly], walls: [[Vec2]]
    /// per wall segment: the wall's top and the ground's lowest point along it
    public let segTop: [[Double]]
    public let bumps: [Bump], drains: [Drain], ramps: [Ramp], tiers: [Tier], zones: [Zone]
    public let posts: [Post], movers: [Mover], tubes: [Tube]
}

public struct Seg: Sendable { public let ax, az, bx, bz: Double }

public final class Hole: Sendable {
    public let data: HoleData
    public let segs: [Seg]
    let segBox: [(x0: Double, x1: Double, z0: Double, z1: Double)]
    public var key: String { data.key }
    public var par: Int { data.par }
    public var tee: Vec2 { data.tee }
    public var cup: Vec2 { data.cup }

    public init(_ d: HoleData) {
        data = d
        var s: [Seg] = []
        for w in d.walls where w.count > 1 { for i in 0..<(w.count - 1) { s.append(Seg(ax: w[i].x, az: w[i].z, bx: w[i + 1].x, bz: w[i + 1].z)) } }
        segs = s
        let R = Sim.BALL_R + Sim.WALL_HALF + 0.01
        segBox = s.map { (Swift.min($0.ax, $0.bx) - R, Swift.max($0.ax, $0.bx) + R, Swift.min($0.az, $0.bz) - R, Swift.max($0.az, $0.bz) + R) }
        precondition(d.segTop.count == s.count, "\(d.key): segTop does not match the walls")
    }
}
