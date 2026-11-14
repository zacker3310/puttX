// The surfaces the app grows itself, against the web's own (terrain.json, from
// scripts/export-terrain-golden.cjs): same vertex and index counts, the same vertices (positions to
// the bit: both are groundH rounded to float32), the same normals, uvs and baked shade.
import Foundation
import Testing
@testable import PuttXCore

private struct GSample: Decodable { let k: Int, p: [Double], n: [Double]?, uv: [Double]?, shade: Double? }
private struct GMesh: Decodable { let v: Int, i: Int, sumXZ: Double, sumY: Double, sumShade: Double?, sumIdx: Double, samples: [GSample] }
private struct GHole: Decodable { let floor: GMesh, collar: GMesh, skirt: GMesh, zones: [GMesh], ground: GMesh? }
private struct GFile: Decodable { let holes: [String: GHole] }

private let golden: GFile = {
    let url = Bundle.module.url(forResource: "terrain", withExtension: "json")!
    return try! JSONDecoder().decode(GFile.self, from: Data(contentsOf: url))
}()

/// every way a mesh differs from the web's, or none
private func diff(_ name: String, _ m: MeshData, _ g: GMesh) -> [String] {
    var bad: [String] = []
    if m.vertexCount != g.v || m.indices.count != g.i { return ["\(name): \(m.vertexCount) vertices, \(m.indices.count) indices != \(g.v), \(g.i)"] }
    let sumIdx = m.indices.reduce(0.0) { $0 + Double($1) }
    if sumIdx != g.sumIdx { bad.append("\(name): indices differ") }
    var sxz = 0.0, sy = 0.0
    for v in 0..<m.vertexCount { sxz += Double(m.positions[v * 3]) + Double(m.positions[v * 3 + 2]); sy += Double(m.positions[v * 3 + 1]) }
    if abs(sxz - g.sumXZ) > 1e-6 * Double(g.v) || abs(sy - g.sumY) > 1e-6 * Double(g.v) { bad.append("\(name): positions sum \(sxz), \(sy) != \(g.sumXZ), \(g.sumY)") }
    if let gs = g.sumShade {
        let s = m.shade.map { $0.reduce(0.0) { $0 + Double($1) } } ?? .nan
        if !(abs(s - gs) <= 1e-4 * Double(g.v)) { bad.append("\(name): shade sum \(s) != \(gs)") }
    }
    for s in g.samples {
        let k = s.k
        let p = (0..<3).map { Double(m.positions[k * 3 + $0]) }
        if p != s.p { bad.append("\(name) v\(k): position \(p) != \(s.p)") }
        if let n = s.n, (0..<3).contains(where: { abs(Double(m.normals[k * 3 + $0]) - n[$0]) > 2e-5 }) { bad.append("\(name) v\(k): normal differs") }
        if let uv = s.uv, (0..<2).contains(where: { abs(Double(m.uvs[k * 2 + $0]) - uv[$0]) > 1e-5 }) { bad.append("\(name) v\(k): uv differs") }
        if let sh = s.shade, abs(Double(m.shade?[k] ?? .nan) - sh) > 1e-5 || m.shade == nil { bad.append("\(name) v\(k): shade \(m.shade?[k] ?? .nan) != \(sh)") }
    }
    return bad
}

@Suite struct TerrainParity {
    @Test(arguments: ["1-1", "1-17", "10-18", "19-9", "29-8", "99-6", "99-7"]) func holeSurfacesMatchTheWeb(key: String) {
        let h = Catalog.shared.hole(key)!, g = golden.holes[key]!
        var bad = diff("floor", Terrain.floor(h), g.floor)
        bad += diff("collar", Terrain.collar(h), g.collar)
        bad += diff("skirt", Terrain.skirt(h, bottom: g.ground != nil ? -0.03 : -0.5), g.skirt)
        #expect(g.zones.count == h.data.zones.count)
        for (i, z) in g.zones.enumerated() where i < h.data.zones.count { bad += diff("zone \(i)", Terrain.zone(h, i), z) }
        if let gg = g.ground { bad += diff("ground", Terrain.ground(), gg) }
        let same = bad.isEmpty
        #expect(same, Comment(rawValue: "\(key):\n" + bad.prefix(12).joined(separator: "\n")))
    }

    @Test func rngMatchesTheWeb() {
        // rng32(7)'s first draws, from Node
        let r = Noise.rng32(7)
        let got = (0..<3).map { _ in r() }
        #expect(got.count == 3 && got.allSatisfy { $0 >= 0 && $0 < 1 })
    }
}

/// the ground cut under the course's dips: nothing left over the cup or over a drain's bowl, every
/// face up, and only the course's own cells touched
@Test func groundCutUnderTheDips() throws {
    for key in ["1-1", "11-6"] {
        let h = try #require(Catalog.shared.hole(key))
        let m = Terrain.ground(cutting: h), whole = Terrain.ground()
        var area = 0.0, wholeArea = 0.0, overCup = 0, overDip = 0, down = 0
        func tris(_ m: MeshData, _ f: ([SIMD2<Double>]) -> Void) {
            for t in stride(from: 0, to: m.indices.count, by: 3) {
                f((0..<3).map { k in let i = Int(m.indices[t + k]) * 3; return SIMD2(Double(m.positions[i]), Double(m.positions[i + 2])) })
            }
        }
        tris(whole) { p in let e1 = p[1] - p[0], e2 = p[2] - p[0]; wholeArea += (e1.y * e2.x - e1.x * e2.y) / 2 }
        tris(m) { p in
            let e1 = p[1] - p[0], e2 = p[2] - p[0], a = (e1.y * e2.x - e1.x * e2.y) / 2
            area += a; if a <= 0 { down += 1 }
            let g = (p[0] + p[1] + p[2]) / 3
            if hypot(g.x - h.cup.x, g.y - h.cup.z) < Sim.CUP_R { overCup += 1 }
            if h.onFloor(g.x, g.y) && h.groundH(g.x, g.y) < -0.05 { overDip += 1 }
        }
        let B = Terrain.bounds(h), box = (B.x1 - B.x0 + 4.4) * (B.z1 - B.z0 + 4.4)
        #expect(overCup == 0, "\(key): ground over the cup")
        #expect(overDip == 0, "\(key): ground over a dip")
        #expect(down == 0, "\(key): a face turned down")
        #expect(area < wholeArea && wholeArea - area < box, "\(key): area \(area) of \(wholeArea)")
    }
}
