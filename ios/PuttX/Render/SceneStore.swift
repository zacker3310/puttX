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
    let wallKind: String?
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
    /// particles: fireflies, snow, embers, night skies
    let points: [ScenePoints]?
    /// what moves between putts (SceneAnim.swift)
    let anims: [SceneAnim]?
    let matAnims: [SceneMatAnim]?
    let weeds: [SceneWeed]?
}
struct ScenePoints: Decodable { let pts: [Float], color: [Double], size: Double, opacity: Double; let anim: PointsAnim? }

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

    /// a hole's file: deflated (.json.z, as shipped) or plain (.json)
    private func holeURL(_ key: String) -> URL? {
        guard let r = root else { return nil }
        for name in ["holes/\(key).json.z", "holes/\(key).json"] {
            let u = r.appendingPathComponent(name)
            if FileManager.default.fileExists(atPath: u.path) { return u }
        }
        return nil
    }
    func has(_ key: String) -> Bool { holeURL(key) != nil }

    func hole(_ key: String) throws -> SceneHole {
        guard let url = holeURL(key) else { throw CocoaError(.fileNoSuchFile) }
        var data = try Data(contentsOf: url)
        if url.pathExtension == "z" { data = try (data as NSData).decompressed(using: .zlib) as Data }
        return try JSONDecoder().decode(SceneHole.self, from: data)
    }

    func geo(_ hash: String) throws -> SceneGeo {
        if let g = geos[hash] { return g }
        let d = try Data(contentsOf: root!.appendingPathComponent("geo/\(hash).bin"))
        let g: SceneGeo = d.withUnsafeBytes { raw in
            func u32(_ o: Int) -> Int { Int(raw.loadUnaligned(fromByteOffset: o, as: UInt32.self)) }
            func f32(_ o: Int) -> Float { raw.loadUnaligned(fromByteOffset: o, as: Float.self) }
            let packed = raw[3] == UInt8(ascii: "2")
            // IEEE half to float, by hand (Float16 is not on every simulator architecture)
            func half(_ h: UInt16) -> Float {
                let s: Float = h & 0x8000 != 0 ? -1 : 1, e = Int((h >> 10) & 0x1f), m = Float(h & 0x3ff)
                if e == 0 { return s * m * powf(2, -24) }
                if e == 31 { return m != 0 ? .nan : s * .infinity }
                return s * (1 + m / 1024) * powf(2, Float(e - 15))
            }
            let v = u32(4), ni = u32(8), flags = u32(12), ng = u32(16)
            var o = 20
            var pos: [SIMD3<Float>] = [], nor: [SIMD3<Float>] = [], uvs: [SIMD2<Float>]? = nil, idx: [UInt32] = []
            pos.reserveCapacity(v); nor.reserveCapacity(v)
            if packed {
                // PXG2 (scripts/scene-format.cjs): positions quantised to the box, i8 normals, f16 or f32 uvs
                let lo = SIMD3(f32(20), f32(24), f32(28)), size = SIMD3(f32(32), f32(36), f32(40))
                o = 44
                for _ in 0..<v {
                    let q = SIMD3(Float(raw.loadUnaligned(fromByteOffset: o, as: UInt16.self)), Float(raw.loadUnaligned(fromByteOffset: o + 2, as: UInt16.self)), Float(raw.loadUnaligned(fromByteOffset: o + 4, as: UInt16.self)))
                    pos.append(lo + q / 65535 * size); o += 6
                }
                for _ in 0..<v {
                    let n = SIMD3(Float(Int8(bitPattern: raw[o])), Float(Int8(bitPattern: raw[o + 1])), Float(Int8(bitPattern: raw[o + 2])))
                    nor.append(simd_length(n) > 0 ? simd_normalize(n) : SIMD3(0, 1, 0)); o += 4
                }
                if flags & 1 != 0 {
                    var u: [SIMD2<Float>] = []; u.reserveCapacity(v)
                    for _ in 0..<v {
                        if flags & 16 != 0 {
                            u.append(SIMD2(half(raw.loadUnaligned(fromByteOffset: o, as: UInt16.self)), half(raw.loadUnaligned(fromByteOffset: o + 2, as: UInt16.self)))); o += 4
                        } else { u.append(SIMD2(f32(o), f32(o + 4))); o += 8 }
                    }
                    uvs = u
                }
                if flags & 2 != 0 { o += flags & 4 != 0 ? v : v * 3 }   // vertex colours: not drawn on iOS (yet)
                for _ in 0..<ni {
                    if flags & 8 != 0 { idx.append(UInt32(raw.loadUnaligned(fromByteOffset: o, as: UInt16.self))); o += 2 } else { idx.append(UInt32(u32(o))); o += 4 }
                }
            } else {
                for i in 0..<v { pos.append(SIMD3(f32(o + i * 12), f32(o + i * 12 + 4), f32(o + i * 12 + 8))) }; o += v * 12
                for i in 0..<v { nor.append(SIMD3(f32(o + i * 12), f32(o + i * 12 + 4), f32(o + i * 12 + 8))) }; o += v * 12
                if flags & 1 != 0 { uvs = (0..<v).map { SIMD2(f32(o + $0 * 8), f32(o + $0 * 8 + 4)) }; o += v * 8 }
                if flags & 2 != 0 { o += (flags & 4 != 0 ? v : v * 3) * 4 }
                for i in 0..<ni { idx.append(UInt32(u32(o + i * 4))) }; o += ni * 4
            }
            var groups: [(start: Int, count: Int, material: Int)] = []
            for _ in 0..<ng { let s = u32(o), c = u32(o + 4), m = u32(o + 8); o += 12; groups.append((s, c == 0xffff_ffff ? ni - s : c, m)) }
            return SceneGeo(positions: pos, normals: nor, uvs: uvs, indices: idx, groups: groups)
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
        // the pin flag waves (still under reduced motion, as the web's FX clock stops)
        if m.shader?.hasPrefix("flag-wave") == true, !UIAccessibility.isReduceMotionEnabled, let lib = CourseBuilder.library,
           let c = try? CustomMaterial(from: p, geometryModifier: CustomMaterial.GeometryModifier(named: "flagWave", in: lib)) {
            return c
        }
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
