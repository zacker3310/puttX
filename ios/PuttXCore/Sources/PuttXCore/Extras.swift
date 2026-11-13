// The extras around a round (src/game.js 6c): the lost ball on every hole, the three goals, and the
// daily hole. All deterministic, so a hole's lost ball lies in the same spot on every device and on
// the web (ExtrasTests holds it to the web's own code).

import Foundation

public enum LostBall {
    /// the pick-up radius
    public static let radius = 0.1
    /// the putts tried from the tee: every 10 degrees, five strengths
    static let shots: [(Double, Double)] = stride(from: 0, to: 360, by: 10).flatMap { a in [0.18, 0.3, 0.45, 0.62, 0.8].map { (Double(a), $0) } }

    /// how good a resting spot is for the ball: off the line from tee to cup, on flat open felt, clear
    /// of walls, posts, tubes and movers (-1: not a place for it)
    static func score(_ h: Hole, _ x: Double, _ z: Double) -> Double {
        func d(_ ax: Double, _ az: Double, _ bx: Double, _ bz: Double) -> Double { let q = closestOnSeg(ax, az, bx, bz, x, z); return hyp(x - q.0, z - q.1) }
        if !h.onFloor(x, z) || h.zoneAt(x, z) != nil { return -1 }
        if hyp(x - h.cup.x, z - h.cup.z) < 0.9 || hyp(x - h.tee.x, z - h.tee.z) < 1 { return -1 }
        if h.segs.contains(where: { d($0.ax, $0.az, $0.bx, $0.bz) < Sim.BALL_R + Sim.WALL_HALF + 0.06 }) { return -1 }
        if h.data.posts.contains(where: { hyp(x - $0.x, z - $0.z) < $0.r + 0.16 }) { return -1 }
        if h.data.tubes.contains(where: { t in [t.a, t.b].contains { hyp(x - $0.x, z - $0.z) < Sim.TUBE_R + 0.16 } }) { return -1 }
        if h.data.movers.contains(where: { m in
            m.kind == .spin ? hyp(x - m.x!, z - m.z!) < (m.len ?? 0) + 0.2
                : d(m.ax!, m.az!, m.bx!, m.bz!) < (m.kind == .gate ? (m.len ?? 0) : (m.r ?? 0)) + 0.2
        }) { return -1 }
        let y = h.groundH(x, z)
        var a = 0.0
        while a < 6.28 { if abs(h.groundH(x + cos(a) * 0.12, z + sin(a) * 0.12) - y) > 0.012 { return -1 }; a += 0.8 }
        return d(h.tee.x, h.tee.z, h.cup.x, h.cup.z)
    }

    /// where the hole's lost ball lies: where some putt from the tee really stops, so it is always
    /// reachable; nil when no putt stops anywhere good
    public static func spot(_ h: Hole) -> Vec2? {
        var best = 0.25, at: Vec2?
        for (a, p) in shots {
            let r = h.simulatePutt(from: h.tee, angle: a, power: p)
            guard r.end == .stop else { continue }
            let s = score(h, r.x, r.z)
            if s > best { best = s; at = Vec2(r.x, r.z) }
        }
        return at
    }
}

public enum Goals {
    /// bit 0: under par; bit 1: no wall touched (and not auto-sunk); bit 2: the lost ball found (or
    /// the hole has none)
    public static func bits(score: Int, par: Int, touched: Bool, auto: Bool, lostFound: Bool) -> Int {
        (score < par ? 1 : 0) | (!touched && !auto ? 2 : 0) | (lostFound ? 4 : 0)
    }
}

public enum Daily {
    /// the local date as the web writes it
    public static func day(_ d: Date = Date(), calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }
    /// the day before, as the web's setDate(getDate() - 1)
    public static func yesterday(_ d: Date = Date(), calendar: Calendar = .current) -> String {
        day(calendar.date(byAdding: .day, value: -1, to: d) ?? d.addingTimeInterval(-86_400), calendar: calendar)
    }
    /// the same hole for everyone on a date: any hole from the third on, of any course
    public static func key(_ day: String, catalog: Catalog) -> String {
        var x: UInt32 = 2166136261
        for u in day.utf16 { x ^= UInt32(u); x = x &* 16777619 }
        let keys = catalog.allCourses.flatMap { catalog.holes(course: $0).dropFirst(2).map(\.key) }
        return keys[Int(x % UInt32(keys.count))]
    }
}

public struct DailyRecord: Sendable, Codable, Equatable {
    public var d: String, best: Int, streak: Int
    public init(d: String, best: Int, streak: Int) { self.d = d; self.best = best; self.streak = streak }
}
