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
    /// neon night: the ball glows and the trail runs in neon
    var night = false
    /// the scenery that moves between putts
    let anim = SceneAnimator()
    var sunDirection = SIMD3<Float>(0.53, 0.69, -0.48)
    /// the ground plane, whose fog follows the camera
    var ground: ModelEntity?
    var skyTop = SIMD3<Double>(0.5, 0.7, 0.9), skyHorizon = SIMD3<Double>(1, 1, 1), skyGround = SIMD3<Double>(0.6, 0.5, 0.4)
}

@MainActor
enum CourseBuilder {
    static let library: MTLLibrary? = MTLCreateSystemDefaultDevice()?.makeDefaultLibrary()

    /// the hole as the web builds it: exported scenery plus natively grown surfaces
    static func exported(_ h: Hole, night: Bool = false) throws -> CourseRig {
        let S = SceneStore.shared, hole = try S.hole(h.key, night: night), rig = CourseRig()
        rig.anim.hole = h
        rig.night = hole.env.night
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
            // a flat decal on the turf (the tee mat, the cup's shade, painted marks), draped over the turf
            // as it is drawn: on a slope or by a step the turf's grid rises through a flat piece, which the
            // web's polygon offset hides and RealityKit cannot
            if hole.mats[n.m.list[0]].polygonOffset != nil, n.m.list.count == 1, let mesh = drape(g, x, h) {
                var mat = mats[n.m.list[0]]
                if var p = mat as? PhysicallyBasedMaterial { p.faceCulling = .none; mat = p }
                if var u = mat as? UnlitMaterial { u.faceCulling = .none; mat = u }
                let e = ModelEntity(mesh: mesh, materials: [mat])
                rig.anim.bind(e, materials: n.m.list, hole: hole)
                rig.root.addChild(e)
                continue
            }
            let lift = Float(hole.mats[n.m.list[0]].polygonOffset != nil ? 0.002 : 0)   // RealityKit has no polygon offset
            // a sheared matrix (a turned child in a stretched group: the sky islands' rock roots, some tee
            // mats) cannot be a RealityKit transform, which keeps only scale, turn and place: bake it in
            let bake = sheared(x)
            let e = ModelEntity(mesh: try S.mesh(g, materials: n.m.list.count, lift: lift, transforms: [bake ? x : matrix_identity_float4x4]), materials: n.m.list.map { mats[$0] })
            if !bake { e.transform = Transform(matrix: x) }
            rig.anim.bind(e, materials: n.m.list, hole: hole)
            rig.root.addChild(e)
        }
        /// a node in its parent's frame
        func part(_ n: SceneNode) throws -> ModelEntity {
            let lift = Float(hole.mats[n.m.list[0]].polygonOffset != nil ? 0.002 : 0), x = matrix(n.x), bake = sheared(x)
            let e = ModelEntity(mesh: try S.mesh(try S.geo(n.g), materials: n.m.list.count, lift: lift, transforms: [bake ? x : matrix_identity_float4x4]), materials: n.m.list.map { mats[$0] })
            if !bake { e.transform = Transform(matrix: x) }
            rig.anim.bind(e, materials: n.m.list, hole: hole)
            return e
        }
        for (i, parts) in hole.movers.enumerated() where i < h.data.movers.count {
            let m = Entity()
            for n in parts { m.addChild(try part(n)) }
            // a tumbleweed's inner ball, which rolls as it travels
            for w in hole.weeds ?? [] where w.i == i {
                let inner = Entity()
                inner.transform = Transform(matrix: matrix(w.x))
                for n in w.parts { inner.addChild(try part(n)) }
                m.addChild(inner)
                rig.anim.addWeed(inner, mover: h.data.movers[i], r: w.r)
            }
            rig.root.addChild(m)
            rig.movers.append((m, h.data.movers[i]))
        }
        // the animated scenery, riders on movers included, once the movers stand
        try rig.anim.build(hole, root: rig.root, movers: rig.movers.map(\.0), mesh: part)

        // the surfaces grown from the sim
        let turf = hole.mats[hole.native.floor]
        let along = simd_normalize(SIMD2(Float(h.cup.x - h.tee.x), Float(h.cup.z - h.tee.z)))
        // at night the carpet is black-light paint, lit by itself: drawn unlit from its own texture
        let turfMat: any Material = hole.env.night ? glow(turf) : try turfMaterial(turf, along: along, stripes: 0.13)
        rig.root.addChild(ModelEntity(mesh: try lowMesh(Terrain.floor(h)), materials: [turfMat]))
        rig.root.addChild(ModelEntity(mesh: try lowMesh(Terrain.collar(h)), materials: [turfMat]))
        for (i, z) in hole.native.zones.enumerated() where i < h.data.zones.count {
            let zm = hole.mats[z.m], zd = h.data.zones[i]
            let real = hole.env.night || zd.push != nil ? nil : zd.surf.flatMap { try? zoneMaterial($0, zm, sky: hole.env.sky) }
            let e = ModelEntity(mesh: try lowMesh(Terrain.zone(h, i)), materials: [real ?? S.material(zm)])
            if let t = zm.map, t.flow > 0 { rig.flows.append((e, 0, t.flow)) }
            rig.root.addChild(e)
        }
        rig.root.addChild(ModelEntity(mesh: try lowMesh(Terrain.skirt(h, bottom: hole.native.skirt.bottom)), materials: [S.material(hole.mats[hole.native.skirt.m])]))
        if let gi = hole.native.ground {
            let gm = hole.mats[gi]
            // the night's grid to the horizon: unlit, its 40 x 40 repeat laid into the mesh's uvs
            var mesh = Terrain.ground(cutting: h)
            if hole.env.night, let r = gm.map?.rep { for i in stride(from: 0, to: mesh.uvs.count - 1, by: 2) { mesh.uvs[i] *= Float(r[0]); mesh.uvs[i + 1] *= Float(r[1]) } }
            // the pirate cove's worlds (5, 15, 25) stand in a lagoon: their ground is the sea
            let sea = !hole.env.night && (Int(h.key.split(separator: "-")[0]) ?? 0) % 10 == 5
            let g = ModelEntity(mesh: try lowMesh(mesh), materials: [hole.env.night ? glow(gm) : sea ? try seaMaterial(gm, fog: hole.env.fog, sky: hole.env.sky) : try groundMaterial(gm, fog: hole.env.fog)])
            rig.root.addChild(g)
            rig.ground = g
        }

        // particles, as tiny glowing dots: one mesh per cloud, redrawn as it drifts
        for cloud in hole.points ?? [] {
            guard let c = try PointCloud(cloud) else { continue }
            rig.root.addChild(c.entity)
            if c.animated { rig.anim.add(c) }
        }

        light(rig, hole.env)
        // the night's lamp over the cup (three's candela to RealityKit's lumens, 4 pi, at the scene's scale)
        for l in hole.lights ?? [] {
            let p = PointLight()
            p.light.color = SceneStore.color(l.color)
            p.light.intensity = Float(l.intensity * 4 * .pi * 120)
            p.light.attenuationRadius = Float(l.distance > 0 ? l.distance : 4)
            p.position = SIMD3(Float(l.pos[0]), Float(l.pos[1]), Float(l.pos[2]))
            rig.root.addChild(p)
        }
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
        if let sc = m.sheenColor { c.emissiveColor = .init(color: SceneStore.color(sc)) }
        return c
    }
    /// a self-lit surface (black-light paint): its texture as it is, no light needed
    static func glow(_ m: SceneMat) -> any Material {
        guard let t = m.map, let tex = try? SceneStore.shared.param(t) else { return SceneStore.shared.material(m) }
        var u = UnlitMaterial()
        u.color = .init(tint: .white, texture: tex)
        return u
    }
    static func groundMaterial(_ m: SceneMat, fog: SceneEnv.Fog?) throws -> any Material {
        guard let lib = library else { return SceneStore.shared.material(m) }
        var c = try CustomMaterial(surfaceShader: CustomMaterial.SurfaceShader(named: "groundSurface", in: lib), lightingModel: .lit)
        if let t = m.map { c.baseColor = .init(tint: SceneStore.color(m.color), texture: .init(try SceneStore.shared.texture(t))) }
        if let t = m.normalMap { c.normal = .init(texture: .init(try SceneStore.shared.texture(t, normal: true))) }
        c.custom.value = SIMD4(Float(m.map?.rep[0] ?? 48), 0, 0, Float(fog?.far ?? 0))
        if let f = fog { c.emissiveColor = .init(color: SceneStore.color(f.color)) }
        return c
    }

    /// sand, mud and water as they look in the world: the zone's colour, the detail made in the shader
    static func zoneMaterial(_ surf: Surface, _ m: SceneMat, sky: [String]) throws -> (any Material)? {
        let kind: Float
        switch surf { case .sand: kind = 0; case .mud: kind = 1; case .water: kind = 2; default: return nil }
        guard let lib = library else { return nil }
        var c = try CustomMaterial(surfaceShader: CustomMaterial.SurfaceShader(named: "zoneSurface", in: lib), lightingModel: .lit)
        c.baseColor = .init(tint: averageColor(m))
        c.custom.value = SIMD4(kind, 0, 0, 0)
        if surf == .water { c.emissiveColor = .init(color: horizon(sky)) }
        return c
    }
    static func seaMaterial(_ m: SceneMat, fog: SceneEnv.Fog?, sky: [String]) throws -> any Material {
        guard let lib = library else { return SceneStore.shared.material(m) }
        var c = try CustomMaterial(surfaceShader: CustomMaterial.SurfaceShader(named: "seaSurface", in: lib), lightingModel: .lit)
        c.baseColor = .init(tint: averageColor(m))
        c.custom.value = SIMD4(0, 0, 0, Float(fog?.far ?? 0))
        c.emissiveColor = .init(color: fog.map { SceneStore.color($0.color) } ?? horizon(sky))
        return c
    }
    /// the sky's colour overhead, which water mirrors
    static func horizon(_ sky: [String]) -> UIColor {
        let hex = sky.first ?? "#ffffff", v = UInt64(hex.dropFirst(hex.hasPrefix("#") ? 1 : 0), radix: 16) ?? 0
        return UIColor(red: CGFloat((v >> 16) & 0xff) / 255, green: CGFloat((v >> 8) & 0xff) / 255, blue: CGFloat(v & 0xff) / 255, alpha: 1)
    }
    /// a material's colour as it reads from afar: its tint times its texture's mean
    static func averageColor(_ m: SceneMat) -> UIColor {
        var k = SIMD3<Double>(m.color[0], m.color[1], m.color[2])
        if let t = m.map, let mean = SceneStore.shared.meanColor(t) { k *= mean }
        return SceneStore.color([k.x, k.y, k.z])
    }

    /// a flat piece laid in the world by `x`, cut until no edge is longer than 2.5 cm, lying 2 mm over the
    /// turf (6 mm over a zone, which lies 4 mm up) as the turf is drawn; nil for anything not flat
    /// and lying (more than 2 cm of height in it, or tipped up), which is left as it is
    static func drape(_ g: SceneGeo, _ x: simd_float4x4, _ h: Hole) -> MeshResource? {
        let w = g.positions.map { p -> SIMD3<Float> in let q = x * SIMD4(p, 1); return SIMD3(q.x, q.y, q.z) }
        guard let lo = w.map(\.y).min(), let hi = w.map(\.y).max(), hi - lo < 0.02, g.indices.count >= 3 else { return nil }
        let up = simd_normalize(SIMD3(x.columns.1.x, x.columns.1.y, x.columns.1.z)), out = simd_normalize(SIMD3(x.columns.2.x, x.columns.2.y, x.columns.2.z))
        // a plane faces along its local z, anything else along its local y: either must point up
        guard max(abs(up.y), abs(out.y)) > 0.9 else { return nil }
        let uv0 = g.uvs
        var pos: [SIMD3<Float>] = [], uvs: [SIMD2<Float>] = [], idx: [UInt32] = []
        func put(_ p: SIMD3<Float>, _ u: SIMD2<Float>) -> UInt32 {
            let floor = Float(Terrain.floorHeight(h, Double(p.x), Double(p.z)) + (h.zoneAt(Double(p.x), Double(p.z)) != nil ? 0.006 : 0.002))
            // lying on the turf (within 1.5 cm of it): follows it up and down; held up off it on purpose: kept,
            // only never under it
            let y = !h.onFloor(Double(p.x), Double(p.z)) ? p.y : abs(p.y - floor) < 0.015 ? floor : max(p.y, floor)
            pos.append(SIMD3(p.x, y, p.z)); uvs.append(u)
            return UInt32(pos.count - 1)
        }
        func tri(_ a: SIMD3<Float>, _ b: SIMD3<Float>, _ c: SIMD3<Float>, _ ua: SIMD2<Float>, _ ub: SIMD2<Float>, _ uc: SIMD2<Float>, _ depth: Int) {
            let e = max(simd_distance(SIMD2(a.x, a.z), SIMD2(b.x, b.z)), simd_distance(SIMD2(b.x, b.z), SIMD2(c.x, c.z)), simd_distance(SIMD2(a.x, a.z), SIMD2(c.x, c.z)))
            if e < 0.025 || depth >= 6 { idx += [put(a, ua), put(b, ub), put(c, uc)]; return }
            let ab = (a + b) / 2, bc = (b + c) / 2, ca = (c + a) / 2, uab = (ua + ub) / 2, ubc = (ub + uc) / 2, uca = (uc + ua) / 2
            tri(a, ab, ca, ua, uab, uca, depth + 1); tri(ab, b, bc, uab, ub, ubc, depth + 1); tri(ca, bc, c, uca, ubc, uc, depth + 1); tri(ab, bc, ca, uab, ubc, uca, depth + 1)
        }
        for t in stride(from: 0, to: g.indices.count - 2, by: 3) {
            let i = Int(g.indices[t]), j = Int(g.indices[t + 1]), k = Int(g.indices[t + 2])
            tri(w[i], w[j], w[k], uv0?[i] ?? .zero, uv0?[j] ?? .zero, uv0?[k] ?? .zero, 0)
        }
        guard pos.count < 400_000 else { return nil }
        var d = MeshDescriptor()
        d.positions = MeshBuffers.Positions(pos)
        d.normals = MeshBuffers.Normals(Array(repeating: SIMD3<Float>(0, 1, 0), count: pos.count))
        if uv0 != nil { d.textureCoordinates = MeshBuffers.TextureCoordinates(uvs) }
        d.primitives = .triangles(idx)
        return try? MeshResource.generate(from: [d])
    }

    /// whether a matrix's axes have been pushed off square (a non-uniform scale over a turn)
    static func sheared(_ m: simd_float4x4) -> Bool {
        let a = simd_normalize(SIMD3(m.columns.0.x, m.columns.0.y, m.columns.0.z)), b = simd_normalize(SIMD3(m.columns.1.x, m.columns.1.y, m.columns.1.z)), c = simd_normalize(SIMD3(m.columns.2.x, m.columns.2.y, m.columns.2.z))
        return abs(simd_dot(a, b)) > 1e-3 || abs(simd_dot(b, c)) > 1e-3 || abs(simd_dot(a, c)) > 1e-3
    }

    static func matrix(_ e: [Float]) -> simd_float4x4 {
        simd_float4x4(SIMD4(e[0], e[1], e[2], e[3]), SIMD4(e[4], e[5], e[6], e[7]), SIMD4(e[8], e[9], e[10], e[11]), SIMD4(e[12], e[13], e[14], e[15]))
    }
}
