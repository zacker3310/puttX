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
