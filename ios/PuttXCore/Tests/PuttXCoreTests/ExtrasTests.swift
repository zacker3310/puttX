import Foundation
import Testing
@testable import PuttXCore

/// the extras against the web's own code (scripts/export-ios.cjs extrasGolden)
@Suite struct Extras {
    struct G: Decodable { let lost: [String: [Double]?]; let daily: [String: String] }
    let g: G = try! JSONDecoder().decode(G.self, from: Data(contentsOf: Bundle.module.url(forResource: "extras", withExtension: "json")!))

    @Test func lostBallsLieWhereTheWebPutsThem() {
        for (key, want) in g.lost {
            let got = LostBall.spot(Catalog.shared.hole(key)!)
            let ok = want == nil ? got == nil : got.map { $0.x.bitPattern == want![0].bitPattern && $0.z.bitPattern == want![1].bitPattern } ?? false
            #expect(ok, Comment(rawValue: "\(key): \(String(describing: got)) vs \(String(describing: want))"))
        }
    }
    @Test func dailyHoleMatches() {
        for (day, key) in g.daily { #expect(Daily.key(day, catalog: Catalog.shared) == key, Comment(rawValue: day)) }
    }
    @Test func goalsPayOnce() {
        var p = PlayerProgress(catalog: Catalog.shared)
        let t0 = p.mulligans
        #expect(p.finishGoals("1-1", bits: 3).coins == 20)
        #expect(p.finishGoals("1-1", bits: 3).coins == 0)
        #expect(p.finishGoals("1-1", bits: 4).coins == 10 && p.obj["1-1"] == 7 && p.mulligans == t0 + 1)
        #expect(p.findLost("2-1") == 15 && p.findLost("2-1") == 0 && p.mulligans == t0 + 2)
    }
    @Test func dailyStreaks() {
        var p = PlayerProgress(catalog: Catalog.shared)
        #expect(p.finishDaily(day: "2026-11-12", yesterday: "2026-11-11", score: 4) == 25)
        #expect(p.finishDaily(day: "2026-11-12", yesterday: "2026-11-11", score: 3) == 0 && p.daily?.best == 3)
        _ = p.finishDaily(day: "2026-11-13", yesterday: "2026-11-12", score: 5)
        #expect(p.daily?.streak == 2)
        _ = p.finishDaily(day: "2026-11-15", yesterday: "2026-11-14", score: 5)
        #expect(p.daily?.streak == 1)
    }
}
