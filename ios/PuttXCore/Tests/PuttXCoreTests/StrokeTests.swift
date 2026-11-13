// The stroke and the putt log's rounding against the web's own (play.json, from scripts/export-ios.cjs).
import Foundation
import Testing
@testable import PuttXCore

private struct GStroke: Decodable { let power: Double, turn: Double, clean: Bool }
private struct GCase: Decodable { let feel: Int, samples: [[Double]], stroke: GStroke? }
private struct GFixed: Decodable {
    let x: Double, f: Int, want: Double
    init(from d: Decoder) throws {
        var c = try d.unkeyedContainer(); x = try c.decode(Double.self); f = try c.decode(Int.self)
        want = (try? c.decode(Double.self)) ?? -0.0   // "-0": JSON has no negative zero
    }
}
private struct GPlay: Decodable { let feels: [Feel], strokes: [GCase], fixed: [GFixed] }

private let play: GPlay = {
    let url = Bundle.module.url(forResource: "play", withExtension: "json")!
    return try! JSONDecoder().decode(GPlay.self, from: Data(contentsOf: url))
}()

@Suite struct Strokes {
    @Test func strokesMatchTheWeb() {
        var bad: [String] = []
        for (i, c) in play.strokes.enumerated() {
            let s = Stroke.from(c.samples.map { PadSample(t: $0[0], x: $0[1], y: $0[2]) }, feel: play.feels[c.feel])
            switch (s, c.stroke) {
            case (nil, nil): continue
            case let (s?, g?):
                // log2 and atan2 may differ from V8 in the last bit; the putt log rounds far coarser than that
                if s.clean != g.clean || abs(s.power - g.power) > 1e-12 || abs(s.turn - g.turn) > 1e-9 { bad.append("\(i): \(s.power) \(s.turn) \(s.clean) != \(g.power) \(g.turn) \(g.clean)") }
            default: bad.append("\(i): contact \(s != nil) != \(c.stroke != nil)")
            }
        }
        let same = bad.isEmpty
        #expect(same, Comment(rawValue: "\(bad.count) strokes differ:\n" + bad.prefix(10).joined(separator: "\n")))
    }

    @Test func toFixedMatchesJS() {
        let bad = play.fixed.filter { jsFixed($0.x, $0.f).bitPattern != $0.want.bitPattern }.map { "\($0.x) \($0.f): \(jsFixed($0.x, $0.f)) != \($0.want)" }
        let same = bad.isEmpty
        #expect(same, Comment(rawValue: bad.prefix(10).joined(separator: "\n")))
    }

    @Test func letGoBeforeContactIsNoStroke() {
        let pull = (0...10).map { PadSample(t: Double($0) / 120, x: 60, y: 120 + Double($0) * 10) }
        #expect(Stroke.from(pull) == nil)
    }
}
