// A hole's course as RealityKit entities: the exported scenery (static nodes, instanced rocks and
// tufts, movers) and the surfaces grown natively from the sim (turf, collar, zones, skirt, ground),
// lit by the hole's own sun under its own sky.
import Foundation
import RealityKit
import UIKit
import Metal
import PuttXCore

/// what the live view drives each frame
@MainActor
final class CourseRig {
    let root = Entity()
    /// each mover's entity and its sim definition, posed from moverState as the web's updateMovers does
    var movers: [(Entity, Mover)] = []
    var ball = ModelEntity()
    /// textures that flow (conveyors): their material slots, and how fast
    var flows: [(ModelEntity, Int, Double)] = []
    var sunDirection = SIMD3<Float>(0.53, 0.69, -0.48)
    var skyTop = SIMD3<Double>(0.5, 0.7, 0.9), skyHorizon = SIMD3<Double>(1, 1, 1), skyGround = SIMD3<Double>(0.6, 0.5, 0.4)
}

@MainActor
enum CourseBuilder {
    static let library: MTLLibrary? = MTLCreateSystemDefaultDevice()?.makeDefaultLibrary()

    /// the hole as the web builds it: exported scenery plus natively grown surfaces
    static func exported(_ h: Hole) throws -> CourseRig {
        let S = SceneStore.shared, hole = try S.hole(h.key), rig = CourseRig()
        let mats = hole.mats.map { S.material($0) }

        // the scenery, as the web built it
        for n in hole.static {
            let g = try S.geo(n.g), x = matrix(n.x)
            if let inst = n.inst {
                // instanced copies (rocks, tufts): merged per tint, a material per tint
                var buckets: [SIMD3<Float>: [simd_float4x4]] = [:]
                for e in inst {
                    let t = e.count >= 19 ? SIMD3(e[16], e[17], e[18]) : SIMD3<Float>(1, 1, 1)
                    let q = (t * 10).rounded(.toNearestOrAwayFromZero) / 10
                    buckets[q, default: []].append(x * matrix(Array(e.prefix(16))))
                }
                for (tint, ms) in buckets {
                    let e = ModelEntity(mesh: try S.mesh(g, materials: n.m.list.count, transforms: ms), materials: n.m.list.map { S.material(hole.mats[$0], tint: tint) })
                    rig.root.addChild(e)
                }
                continue
            }
            let lift = Float(hole.mats[n.m.list[0]].polygonOffset != nil ? 0.002 : 0)   // RealityKit has no polygon offset
            let e = ModelEntity(mesh: try S.mesh(g, materials: n.m.list.count, lift: lift), materials: n.m.list.map { mats[$0] })
            e.transform = Transform(matrix: x)
            rig.root.addChild(e)
        }
        for (i, parts) in hole.movers.enumerated() where i < h.data.movers.count {
            let m = Entity()
            for n in parts {
                let e = ModelEntity(mesh: try S.mesh(try S.geo(n.g), materials: n.m.list.count), materials: n.m.list.map { mats[$0] })
                e.transform = Transform(matrix: matrix(n.x))
                m.addChild(e)
            }
            rig.root.addChild(m)
            rig.movers.append((m, h.data.movers[i]))
        }

        // the surfaces grown from the sim
        let turf = hole.mats[hole.native.floor]
        let along = simd_normalize(SIMD2(Float(h.cup.x - h.tee.x), Float(h.cup.z - h.tee.z)))
        let turfMat = try turfMaterial(turf, along: along, stripes: hole.env.night ? 0 : 0.13)
        rig.root.addChild(ModelEntity(mesh: try lowMesh(Terrain.floor(h)), materials: [turfMat]))
        rig.root.addChild(ModelEntity(mesh: try lowMesh(Terrain.collar(h)), materials: [turfMat]))
        for (i, z) in hole.native.zones.enumerated() where i < h.data.zones.count {
            let zm = hole.mats[z.m], e = ModelEntity(mesh: try lowMesh(Terrain.zone(h, i)), materials: [S.material(zm)])
            if let t = zm.map, t.flow > 0 { rig.flows.append((e, 0, t.flow)) }
            rig.root.addChild(e)
        }
        rig.root.addChild(ModelEntity(mesh: try lowMesh(Terrain.skirt(h, bottom: hole.native.skirt.bottom)), materials: [S.material(hole.mats[hole.native.skirt.m])]))
        if let gi = hole.native.ground {
            rig.root.addChild(ModelEntity(mesh: try lowMesh(Terrain.ground()), materials: [try groundMaterial(hole.mats[gi])]))
        }

        light(rig, hole.env)
        addBall(rig)
        return rig
    }

    // MARK: light and sky
    static func light(_ rig: CourseRig, _ env: SceneEnv) {
        let d = SIMD3(Float(env.sun.dir[0]), Float(env.sun.dir[1]), Float(env.sun.dir[2]))
        rig.sunDirection = simd_normalize(d)
        let sun = DirectionalLight()
        sun.light.color = SceneStore.color(env.sun.color)
        sun.light.intensity = Float(env.sun.intensity) * 1400
        sun.shadow = DirectionalLightComponent.Shadow(maximumDistance: 18, depthBias: 1.5)
        sun.look(at: .zero, from: rig.sunDirection * 12, relativeTo: nil)
        rig.root.addChild(sun)
        func lin(_ hex: String) -> SIMD3<Double> {
            let v = UInt64(hex.dropFirst(), radix: 16) ?? 0
            func l(_ c: UInt64) -> Double { let s = Double(c) / 255; return s <= 0.04045 ? s / 12.92 : pow((s + 0.055) / 1.055, 2.4) }
            return SIMD3(l((v >> 16) & 0xff), l((v >> 8) & 0xff), l(v & 0xff))
        }
        rig.skyTop = lin(env.sky[0]); rig.skyHorizon = lin(env.sky[1]); rig.skyGround = lin(env.sky[1])
    }

    static func addBall(_ rig: CourseRig) {
        var m = PhysicallyBasedMaterial()
        m.baseColor = .init(tint: UIColor(red: 1, green: 0.99, blue: 0.97, alpha: 1))
        m.roughness = 0.45; m.clearcoat = 1.0; m.clearcoatRoughness = 0.07
        rig.ball = ModelEntity(mesh: .generateSphere(radius: Float(Sim.BALL_R)), materials: [m])
        rig.root.addChild(rig.ball)
    }

    // MARK: native meshes
    /// a terrain mesh with its baked shade in uv1, for the surface shaders
    static func lowMesh(_ m: MeshData) throws -> MeshResource {
        struct V { var p: SIMD3<Float>; var n: SIMD3<Float>; var t: SIMD3<Float>; var uv0: SIMD2<Float>; var uv1: SIMD2<Float> }
        let v = m.vertexCount
        var d = LowLevelMesh.Descriptor()
        d.vertexAttributes = [
            .init(semantic: .position, format: .float3, offset: MemoryLayout<V>.offset(of: \.p)!),
            .init(semantic: .normal, format: .float3, offset: MemoryLayout<V>.offset(of: \.n)!),
            .init(semantic: .tangent, format: .float3, offset: MemoryLayout<V>.offset(of: \.t)!),
            .init(semantic: .uv0, format: .float2, offset: MemoryLayout<V>.offset(of: \.uv0)!),
            .init(semantic: .uv1, format: .float2, offset: MemoryLayout<V>.offset(of: \.uv1)!),
        ]
        d.vertexLayouts = [.init(bufferIndex: 0, bufferStride: MemoryLayout<V>.stride)]
        d.vertexCapacity = max(1, v)
        d.indexCapacity = max(3, m.indices.count)
        d.indexType = .uint32
        let mesh = try LowLevelMesh(descriptor: d)
        var lo = SIMD3<Float>(repeating: .greatestFiniteMagnitude), hi = -lo
        mesh.withUnsafeMutableBytes(bufferIndex: 0) { raw in
            let out = raw.bindMemory(to: V.self)
            for i in 0..<v {
                let p = SIMD3(m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2])
                let n = m.normals.count == m.positions.count ? SIMD3(m.normals[i * 3], m.normals[i * 3 + 1], m.normals[i * 3 + 2]) : SIMD3<Float>(0, 1, 0)
                // uvs run with world x, so the tangent is x laid onto the surface
                let t = simd_normalize(SIMD3<Float>(1, 0, 0) - n * n.x + SIMD3(0, 0, 1e-5))
                out[i] = V(p: p, n: n, t: t, uv0: SIMD2(m.uvs[i * 2], m.uvs[i * 2 + 1]), uv1: SIMD2(m.shade?[i] ?? 1, 0))
                lo = simd_min(lo, p); hi = simd_max(hi, p)
            }
        }
        mesh.withUnsafeMutableIndices { raw in
            let out = raw.bindMemory(to: UInt32.self)
            for (i, x) in m.indices.enumerated() { out[i] = x }
        }
        mesh.parts.replaceAll([LowLevelMesh.Part(indexCount: m.indices.count, topology: .triangle, bounds: BoundingBox(min: lo, max: hi))])
        return try MeshResource(from: mesh)
    }

    // MARK: native materials
    static func turfMaterial(_ m: SceneMat, along: SIMD2<Float>, stripes: Float) throws -> any Material {
        guard let lib = library else { return SceneStore.shared.material(m) }
        var c = try CustomMaterial(surfaceShader: CustomMaterial.SurfaceShader(named: "turfSurface", in: lib), lightingModel: .lit)
        if let t = m.map { c.baseColor = .init(tint: SceneStore.color(m.color), texture: .init(try SceneStore.shared.texture(t))) }
        if let t = m.normalMap { c.normal = .init(texture: .init(try SceneStore.shared.texture(t, normal: true))) }
        c.roughness = .init(scale: Float(m.roughness ?? 0.93))
        c.custom.value = SIMD4(along.x, along.y, stripes, 0.7)
        return c
    }
    static func groundMaterial(_ m: SceneMat) throws -> any Material {
        guard let lib = library else { return SceneStore.shared.material(m) }
        var c = try CustomMaterial(surfaceShader: CustomMaterial.SurfaceShader(named: "groundSurface", in: lib), lightingModel: .lit)
        if let t = m.map { c.baseColor = .init(tint: SceneStore.color(m.color), texture: .init(try SceneStore.shared.texture(t))) }
        if let t = m.normalMap { c.normal = .init(texture: .init(try SceneStore.shared.texture(t, normal: true))) }
        c.custom.value = SIMD4(Float(m.map?.rep[0] ?? 48), 0, 0, 0)
        return c
    }

    static func matrix(_ e: [Float]) -> simd_float4x4 {
        simd_float4x4(SIMD4(e[0], e[1], e[2], e[3]), SIMD4(e[4], e[5], e[6], e[7]), SIMD4(e[8], e[9], e[10], e[11]), SIMD4(e[12], e[13], e[14], e[15]))
    }
}
