// Parity: the Swift sim against the JS sim, to the bit. golden.json holds, for every hole, its `sol`
// replay and a fixed fan of extra shots, each with how it ended, where, when, after how many steps,
// and every contact on the way (scripts/export-ios.cjs). Any difference at all is a failure.
import Foundation
import Testing
@testable import PuttXCore

private struct GHit: Decodable {
    let kind: String, v: Double
    init(from d: Decoder) throws { var c = try d.unkeyedContainer(); kind = try c.decode(String.self); v = try c.decode(Double.self) }
}
private struct GPutt: Decodable {
    let from: Vec2?, a: Double, p: Double, t0: Double
    let end: String, x: Double, z: Double, t: Double, steps: Int, hits: [GHit]
}
private struct GHole: Decodable { let key: String, sol: [GPutt], fan: [GPutt] }
private struct GFile: Decodable { let v: Int, putts: [GHole] }

private let golden: GFile = {
    let url = Bundle.module.url(forResource: "golden", withExtension: "json")!
    return try! JSONDecoder().decode(GFile.self, from: Data(contentsOf: url))
}()

/// the first way a Swift putt differs from its golden twin, or nil
private func diff(_ r: PuttResult, _ g: GPutt) -> String? {
    if r.end.rawValue != g.end { return "end \(r.end) != \(g.end)" }
    if r.steps != g.steps { return "steps \(r.steps) != \(g.steps)" }
    if r.hits.count != g.hits.count { return "hits \(r.hits.count) != \(g.hits.count)" }
    for (i, (a, b)) in zip(r.hits, g.hits).enumerated() where a.kind.rawValue != b.kind || a.v.bitPattern != b.v.bitPattern {
        return "hit \(i): \(a.kind) \(a.v) != \(b.kind) \(b.v)"
    }
    for (n, a, b) in [("x", r.x, g.x), ("z", r.z, g.z), ("t", r.t, g.t)] where a.bitPattern != b.bitPattern { return "\(n) \(a) != \(b)" }
    return nil
}

@Suite struct Parity {
    @Test func everyHoleLoads() {
        #expect(Catalog.shared.allCourses.count >= 30)
        #expect(golden.putts.allSatisfy { Catalog.shared.hole($0.key) != nil })
    }

    @Test func fdlibmMatchesKnownBits() {
        // values from Node: the sim's dsin, dcos and dexp
        #expect(dsin(1).bitPattern == (0.8414709848078965).bitPattern)
        #expect(dcos(1).bitPattern == (0.5403023058681398).bitPattern)
        #expect(dexp(-1).bitPattern == (0.36787944117144233).bitPattern)
        #expect(dsin(100).bitPattern == (-0.5063656411097588).bitPattern)
        #expect(dexp(5.5).bitPattern == (244.69193226422038).bitPattern)
    }

    @Test(arguments: [false, true]) func goldenPutts(fan: Bool) {
        var bad: [String] = [], n = 0
        for gh in golden.putts {
            guard let h = Catalog.shared.hole(gh.key) else { bad.append("\(gh.key): missing"); continue }
            for g in fan ? gh.fan : gh.sol {
                n += 1
                let r = h.simulatePutt(from: g.from ?? h.tee, angle: g.a, power: g.p, t0: g.t0)
                if let d = diff(r, g) { bad.append("\(gh.key) a=\(g.a) p=\(g.p) t0=\(g.t0): \(d)") }
            }
        }
        let report = "\(bad.count) of \(n) putts differ from JS:\n" + bad.prefix(25).joined(separator: "\n")
        let same = bad.isEmpty
        #expect(same, Comment(rawValue: report))
    }

    @Test func everySolSinksWithinPar() {
        for c in Catalog.shared.allCourses {
            for h in Catalog.shared.holes(course: c) {
                var round = Round(h), last: PuttOutcome?
                for s in h.data.sol where !round.done {
                    let from = round.at
                    var run = PuttRun(h, from: from, angle: s[0], power: s[1], t0: s.count > 2 ? s[2] : 0)
                    while run.step() == nil {}
                    last = round.resolvePutt(run.raw!, from: from)
                }
                #expect(last == .sunk && round.score! <= h.par, "\(h.key)")
            }
        }
    }
}
