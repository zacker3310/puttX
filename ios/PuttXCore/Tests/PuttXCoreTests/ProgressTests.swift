import Foundation
import Testing
@testable import PuttXCore

@Suite struct Play {
    /// the live loop steps a PuttRun; it must end exactly where the solver's putt ends
    @Test func liveRunMatchesSimulatePutt() {
        for key in ["1-1", "5-4", "8-12", "10-18", "99-3"] {
            let h = Catalog.shared.hole(key)!
            var at = h.tee
            for s in h.data.sol {
                let t0 = s.count > 2 ? s[2] : 0
                var run = PuttRun(h, from: at, angle: s[0], power: s[1], t0: t0)
                var r: PuttResult?
                while r == nil { r = run.step() }
                let g = h.simulatePutt(from: at, angle: s[0], power: s[1], t0: t0)
                #expect(r!.end == g.end && r!.steps == g.steps && r!.x.bitPattern == g.x.bitPattern && r!.z.bitPattern == g.z.bitPattern && r!.hits == g.hits, "\(key)")
                if g.end != .stop { break }
                at = Vec2(g.x, g.z)
            }
        }
    }
}

@Suite struct Saves {
    let cat = Catalog.shared

    @Test func oldSavesLoad() throws {
        let p = try JSONDecoder().decode(PlayerProgress.self, from: Data(#"{"v":2,"holes":{"1-1":{"best":2,"stars":3}},"worlds":[1],"tally":{}}"#.utf8))
        #expect(p.holes["1-1"]?.best == 2 && p.sound && p.coins == 0)
    }

    @Test func mergeKeepsTheBestOfBoth() {
        var a = PlayerProgress(catalog: cat), b = PlayerProgress(catalog: cat)
        a.record("1-1", score: 4, par: 3, catalog: cat); b.record("1-1", score: 2, par: 3, catalog: cat)
        a.record("1-2", score: 3, par: 3, catalog: cat)
        b.worlds.append(11)
        let m1 = a.merged(with: b), m2 = b.merged(with: a)
        #expect(m1 == m2)
        #expect(m1.holes["1-1"] == HoleRecord(best: 2, stars: 3))
        #expect(m1.holes["1-2"] != nil && m1.worlds.contains(11))
    }

    @Test func finishingACourseOpensTheNext() {
        var p = PlayerProgress(catalog: cat)
        for h in cat.holes(course: 1) { p.record(h.key, score: h.par, par: h.par, catalog: cat) }
        #expect(p.worlds.contains(11))
        #expect(!p.worlds.contains(2))
        #expect(p.nextHole(catalog: cat) == "11-1")
    }
}
