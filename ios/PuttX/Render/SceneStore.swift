// Loads what scripts/export-scene.cjs wrote (ios/PuttX/Scene): meshes by content hash, textures by
// content hash, and a hole's manifest, and turns them into RealityKit resources. Meshes and textures
// are cached for the life of the app: most of them are shared by many holes.
import Foundation
import RealityKit
import ImageIO
import UIKit
import Metal

// MARK: the manifest, as written
struct SceneTex: Decodable {
    let t: String
    let srgb: Bool
    let rep: [Double], off: [Double], rot: Double, center: [Double]
    let wrap: String
    let flow: Double
    let aniso: Double?
}
struct SceneMat: Decodable {
    let type: String
    let color: [Double]
    let opacity: Double
    let transparent: Bool
    let alphaTest: Double
    let side: String
    let depthWrite: Bool
    let vertexColors: Bool
    let map: SceneTex?
    let polygonOffset: [Double]?
    let roughness: Double?, metalness: Double?
    let normalMap: SceneTex?
    let emissive: [Double]?, emissiveIntensity: Double?, emissiveMap: SceneTex?
    let sheen: Double?, sheenColor: [Double]?, clearcoat: Double?, clearcoatRoughness: Double?
    let shader: String?
}
struct SceneNode: Decodable {
    let g: String
    let m: MatRef
    let x: [Float]
    let shadow: [Bool]
    let inst: [[Float]]?
    enum MatRef: Decodable {
        case one(Int), many([Int])
        init(from d: Decoder) throws { let c = try d.singleValueContainer(); if let i = try? c.decode(Int.self) { self = .one(i) } else { self = .many(try c.decode([Int].self)) } }
        var list: [Int] { switch self { case .one(let i): [i]; case .many(let a): a } }
    }
}
struct SceneEnv: Decodable {
    struct Sun: Decodable { let dir: [Double], color: [Double], intensity: Double }
    struct Fog: Decodable { let color: [Double], near: Double, far: Double }
    let sky: [String]
    let fog: Fog?
    let sun: Sun
    let night: Bool
}
struct SceneHole: Decodable {
    struct Native: Decodable {
        struct Zone: Decodable { let m: Int, lift: Double }
        struct Skirt: Decodable { let m: Int, bottom: Double }
        let floor: Int, collar: Int
        let zones: [Zone]
        let skirt: Skirt
        let ground: Int?
    }
    let key: String
    let mats: [SceneMat]
    let `static`: [SceneNode]
    let movers: [[SceneNode]]
    let native: Native
    let env: SceneEnv
}

/// a mesh as exported: interleaved later, per RealityKit's needs
struct SceneGeo {
    var positions: [SIMD3<Float>], normals: [SIMD3<Float>], uvs: [SIMD2<Float>]?
    var indices: [UInt32]
    var groups: [(start: Int, count: Int, material: Int)]
}

@MainActor
final class SceneStore {
    static let shared = SceneStore()
    private let root = Bundle.main.url(forResource: "Scene", withExtension: nil)
    private var geos: [String: SceneGeo] = [:]
    private var textures: [String: TextureResource] = [:]

    func has(_ key: String) -> Bool { root.map { FileManager.default.fileExists(atPath: $0.appendingPathComponent("holes/\(key).json").path) } ?? false }

    func hole(_ key: String) throws -> SceneHole {
        let url = root!.appendingPathComponent("holes/\(key).json")
        return try JSONDecoder().decode(SceneHole.self, from: Data(contentsOf: url))
    }

    func geo(_ hash: String) throws -> SceneGeo {
        if let g = geos[hash] { return g }
        let d = try Data(contentsOf: root!.appendingPathComponent("geo/\(hash).bin"))
        let g: SceneGeo = d.withUnsafeBytes { raw in
            func u32(_ o: Int) -> Int { Int(raw.loadUnaligned(fromByteOffset: o, as: UInt32.self)) }
            let v = u32(4), ni = u32(8), flags = u32(12), ng = u32(16)
            var o = 20
            func floats(_ n: Int) -> [Float] { let a = (0..<n).map { raw.loadUnaligned(fromByteOffset: o + $0 * 4, as: Float.self) }; o += n * 4; return a }
            let p = floats(v * 3), n = floats(v * 3)
            let uv = flags & 1 != 0 ? floats(v * 2) : nil
            if flags & 2 != 0 { _ = floats(flags & 4 != 0 ? v : v * 3) }   // vertex colours: not drawn on iOS (yet)
            let idx = (0..<ni).map { UInt32(u32(o + $0 * 4)) }; o += ni * 4
            var groups: [(Int, Int, Int)] = []
            for _ in 0..<ng { let s = u32(o), c = u32(o + 4), m = u32(o + 8); o += 12; groups.append((s, c == 0xffff_ffff ? ni - s : c, m)) }
            return SceneGeo(positions: (0..<v).map { SIMD3(p[$0 * 3], p[$0 * 3 + 1], p[$0 * 3 + 2]) },
                            normals: (0..<v).map { SIMD3(n[$0 * 3], n[$0 * 3 + 1], n[$0 * 3 + 2]) },
                            uvs: uv.map { u in (0..<v).map { SIMD2(u[$0 * 2], u[$0 * 2 + 1]) } },
                            indices: idx, groups: groups.map { (start: $0.0, count: $0.1, material: $0.2) })
        }
        geos[hash] = g
        return g
    }

    func texture(_ t: SceneTex, normal: Bool = false) throws -> TextureResource {
        let key = t.t + (normal ? "n" : "")
        if let r = textures[key] { return r }
        let url = root!.appendingPathComponent("tex/\(t.t).png")
        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { throw CocoaError(.fileReadCorruptFile) }
        let r = try TextureResource.generate(from: img, options: .init(semantic: normal ? .normal : (t.srgb ? .color : .raw), mipmapsMode: .allocateAndGenerateAll))
        textures[key] = r
        return r
    }

    /// a texture parameter that tiles and filters as the web's does (repeat wrap, trilinear, anisotropic)
    func param(_ t: SceneTex, normal: Bool = false) throws -> MaterialParameters.Texture {
        var p = MaterialParameters.Texture(try texture(t, normal: normal))
        let s = MTLSamplerDescriptor()
        let mode: MTLSamplerAddressMode = t.wrap == "clamp" ? .clampToEdge : t.wrap == "mirror" ? .mirrorRepeat : .repeat
        s.sAddressMode = mode; s.tAddressMode = mode
        s.minFilter = .linear; s.magFilter = .linear; s.mipFilter = .linear
        s.maxAnisotropy = 8
        p.sampler = MaterialParameters.Texture.Sampler(s)
        return p
    }

    // MARK: materials
    /// three's linear colour to the sRGB UIColor RealityKit's tints expect
    static func color(_ c: [Double], _ k: Double = 1) -> UIColor {
        func s(_ v: Double) -> CGFloat { let x = max(0, min(1, v * k)); return CGFloat(x <= 0.0031308 ? 12.92 * x : 1.055 * pow(x, 1 / 2.4) - 0.055) }
        return UIColor(red: s(c[0]), green: s(c[1]), blue: s(c[2]), alpha: 1)
    }

    /// a web material as a RealityKit one; `tint` multiplies the base colour (instanced copies)
    func material(_ m: SceneMat, tint: SIMD3<Float>? = nil) -> any Material {
        let base = tint.map { t in m.color.enumerated().map { $0.element * Double(t[$0.offset]) } } ?? m.color
        if m.type == "MeshBasicMaterial" {
            var u = UnlitMaterial(color: SceneStore.color(base))
            if let t = m.map, let p = try? param(t) { u.color = .init(tint: SceneStore.color(base), texture: p) }
            if m.transparent { u.blending = .transparent(opacity: .init(floatLiteral: Float(m.opacity))) }
            if m.alphaTest > 0 { u.opacityThreshold = Float(m.alphaTest) }
            u.faceCulling = m.side == "double" ? .none : m.side == "back" ? .front : .back
            return u
        }
        var p = PhysicallyBasedMaterial()
        p.baseColor = .init(tint: SceneStore.color(base), texture: m.map.flatMap { try? param($0) })
        if let t = m.map, t.rep != [1, 1] || t.off != [0, 0] || t.rot != 0 {
            p.textureCoordinateTransform = .init(offset: SIMD2(Float(t.off[0]), Float(t.off[1])), scale: SIMD2(Float(t.rep[0]), Float(t.rep[1])), rotation: Float(t.rot))
        }
        p.roughness = .init(floatLiteral: Float(m.roughness ?? 1))
        p.metallic = .init(floatLiteral: Float(m.metalness ?? 0))
        if let n = m.normalMap, let t = try? param(n, normal: true) { p.normal = .init(texture: t) }
        if let e = m.emissive, let k = m.emissiveIntensity, e.contains(where: { $0 > 0 }) {
            p.emissiveColor = .init(color: SceneStore.color(e), texture: m.emissiveMap.flatMap { try? param($0) })
            p.emissiveIntensity = Float(k)
        }
        if let s = m.sheen, s > 0, let c = m.sheenColor { p.sheen = .init(tint: SceneStore.color(c, s)) }
        if let c = m.clearcoat, c > 0 { p.clearcoat = .init(floatLiteral: Float(c)); p.clearcoatRoughness = .init(floatLiteral: Float(m.clearcoatRoughness ?? 0)) }
        if m.transparent { p.blending = .transparent(opacity: .init(floatLiteral: Float(m.opacity))) }
        if m.alphaTest > 0 { p.opacityThreshold = Float(m.alphaTest) }
        p.faceCulling = m.side == "double" ? .none : m.side == "back" ? .front : .back
        return p
    }

    // MARK: meshes
    /// a mesh resource with one part per material group, transformed (instances) when asked
    /// three keeps a geometry's groups (a box has six, one per face) but draws them all with a lone
    /// material; only a mesh with a material list draws group by group. `materials` is that count.
    func mesh(_ g: SceneGeo, materials: Int = 1, lift: Float = 0, transforms: [simd_float4x4] = [matrix_identity_float4x4]) throws -> MeshResource {
        let groups = g.groups.isEmpty || materials < 2 ? [(start: 0, count: g.indices.count, material: 0)] : g.groups.map { (start: $0.start, count: $0.count, material: min($0.material, materials - 1)) }
        var descs: [MeshDescriptor] = []
        for gr in groups {
            var pos: [SIMD3<Float>] = [], nor: [SIMD3<Float>] = [], uv: [SIMD2<Float>] = [], idx: [UInt32] = []
            for m in transforms {
                let base = UInt32(pos.count), nm = simd_float3x3(SIMD3(m.columns.0.x, m.columns.0.y, m.columns.0.z), SIMD3(m.columns.1.x, m.columns.1.y, m.columns.1.z), SIMD3(m.columns.2.x, m.columns.2.y, m.columns.2.z)).inverse.transpose
                for p in g.positions { let q = m * SIMD4(p, 1); pos.append(SIMD3(q.x, q.y + lift, q.z)) }
                for n in g.normals { nor.append(simd_normalize(nm * n)) }
                if let u = g.uvs { uv += u }
                for i in g.indices[gr.start..<min(g.indices.count, gr.start + gr.count)] { idx.append(base + i) }
            }
            var d = MeshDescriptor()
            d.positions = MeshBuffers.Positions(pos)
            d.normals = MeshBuffers.Normals(nor)
            if g.uvs != nil { d.textureCoordinates = MeshBuffers.TextureCoordinates(uv) }
            d.primitives = .triangles(idx)
            d.materials = .allFaces(UInt32(gr.material))
            descs.append(d)
        }
        return try MeshResource.generate(from: descs)
    }
}
