// A whole putt, the border rule, and rounds and scoring (src/game.js 2d to 2e).

public struct PuttResult: Sendable {
    public let end: PuttEnd
    public let x: Double, z: Double, t: Double
    public let steps: Int
    public let hits: [Hit]
}

extension Hole {
    /// a putt from `from` at hole time t0, run to the end
    public func simulatePutt(from: Vec2, angle: Double, power: Double, t0: Double = 0) -> PuttResult {
        var b = Ball(self, from.x, from.z)
        b.launch(angle, power)
        var t = t0, n = 0, end: PuttEnd? = nil
        while end == nil {
            end = step(&b, t)
            t += Sim.SIM_DT
            if end == nil { n += 1; if Double(n) * Sim.SIM_DT > Sim.MAX_SIM_T { end = .timeout } }
        }
        let p = end == .stop ? restSpot(b.x, b.z) : Vec2(b.x, b.z)
        return PuttResult(end: end!, x: p.x, z: p.z, t: t, steps: n, hits: b.hits)
    }

    /// the real rule for a ball against the border (WMF, PPA, BMGA): placed out from the wall, square to it
    public func restSpot(_ x: Double, _ z: Double) -> Vec2 {
        let y0 = groundH(x, z)
        let edge = Sim.RELIEF_GAP * 1.5
        func fair(_ tx: Double, _ tz: Double) -> Bool {
            let zn = zoneAt(tx, tz), gg = groundGrad(tx, tz)
            if !onFloor(tx, tz) || zn?.surf == .water || abs(groundH(tx, tz) - y0) > 0.02 || hyp(gg.0, gg.1) * Sim.ROLL > Sim.STATIC_MU { return false }
            if hyp(tx - cup.x, tz - cup.z) < Sim.DISH_R || data.tubes.contains(where: { hyp(tx - $0.a.x, tz - $0.a.z) < Sim.TUBE_R + Sim.BALL_R + 0.03 }) { return false }
            if segs.contains(where: { s in let p = closestOnSeg(s.ax, s.az, s.bx, s.bz, tx, tz); return hyp(tx - p.0, tz - p.1) < Sim.WALL_HALF + Sim.BALL_R + edge }) { return false }
            return !data.posts.contains { hyp(tx - $0.x, tz - $0.z) < $0.r + Sim.BALL_R + edge }
        }
        var bd = Double.infinity, px = 0.0, pz = 0.0, reach = 0.0
        for s in segs { let p = closestOnSeg(s.ax, s.az, s.bx, s.bz, x, z), d = hyp(x - p.0, z - p.1); if d - Sim.WALL_HALF < bd - reach { bd = d; px = p.0; pz = p.1; reach = Sim.WALL_HALF } }
        for p in data.posts { let d = hyp(x - p.x, z - p.z); if d - p.r < bd - reach { bd = d; px = p.x; pz = p.z; reach = p.r } }
        if bd - reach - Sim.BALL_R > Sim.RELIEF_GAP || bd < 1e-9 { return Vec2(x, z) }
        let nx = (x - px) / bd, nz = (z - pz) / bd
        for to in [Sim.RELIEF_TO, Sim.RELIEF_TO * 0.7, Sim.RELIEF_TO * 0.45] {
            let tx = px + nx * (reach + Sim.BALL_R + to), tz = pz + nz * (reach + Sim.BALL_R + to)
            if fair(tx, tz) { return Vec2(tx, tz) }
        }
        var near: [(Double, Double)] = []
        func close(_ qx: Double, _ qz: Double, _ r: Double) {
            let d = hyp(x - qx, z - qz)
            if d > 1e-9 && d - r - Sim.BALL_R <= Sim.RELIEF_GAP { near.append(((x - qx) / d, (z - qz) / d)) }
        }
        for s in segs { let p = closestOnSeg(s.ax, s.az, s.bx, s.bz, x, z); close(p.0, p.1, Sim.WALL_HALF) }
        for p in data.posts { close(p.x, p.z, p.r) }
        var sx = 0.0, sz = 0.0
        for n in near { sx += n.0; sz += n.1 }
        var dirs: [(Double, Double)] = []
        let sl = hyp(sx, sz)
        if sl > 1e-6 { dirs.append((sx / sl, sz / sl)) }
        dirs += near
        for to in [Sim.RELIEF_TO, Sim.RELIEF_TO * 0.7, Sim.RELIEF_TO * 0.45, Sim.RELIEF_TO * 0.3] {
            for (dx, dz) in dirs { let tx = x + dx * to, tz = z + dz * to; if fair(tx, tz) { return Vec2(tx, tz) } }
        }
        return Vec2(x, z)
    }
}

// MARK: 2e. rounds and scoring

public enum Scoring {
    /// the worst a hole can cost: double par, then the ball rolls itself in
    public static func cap(_ h: Hole) -> Int { h.par * 2 }
    public static func stars(_ score: Int, _ par: Int) -> Int { score < par ? 3 : score == par ? 2 : 1 }
}

public enum PuttOutcome: Sendable { case sunk, auto, oob, stop }

public struct Round: Sendable {
    public let hole: Hole
    public private(set) var strokes = 0
    public private(set) var at: Vec2
    public private(set) var done = false
    public private(set) var score: Int?
    public private(set) var auto = false
    public init(_ h: Hole) { hole = h; at = h.tee }

    /// a putt finished: count it, move the ball, and finish the hole at the cup or the cap
    public mutating func resolvePutt(_ r: PuttResult, from: Vec2) -> PuttOutcome {
        strokes += 1
        if r.end == .sunk { done = true; score = strokes; at = hole.cup; return .sunk }
        if r.end == .oob { strokes += 1; at = from } else { at = hole.restSpot(r.x, r.z) }
        if strokes >= Scoring.cap(hole) { done = true; auto = true; score = Scoring.cap(hole); return .auto }
        return r.end == .oob ? .oob : .stop
    }
    /// a mover pushed a resting ball: never the player's fault, so no stroke and no penalty
    public mutating func resolveDrift(_ r: PuttResult, from: Vec2) -> PuttOutcome {
        if r.end == .sunk { done = true; score = Swift.max(1, strokes); at = hole.cup; return .sunk }
        at = r.end == .oob ? from : hole.restSpot(r.x, r.z)
        return r.end == .oob ? .oob : .stop
    }
}
