// Hole 1-1, built by hand in RealityKit, for comparison with the exported course: the same sim
// surfaces, camera, sun and sky, but every texture painted here with Core Graphics and every border,
// stone, cup, flag and prop modelled here from RealityKit primitives. No exported data.
import Foundation
import RealityKit
import UIKit
import Metal
import PuttXCore

@MainActor
enum HandHole {
    static func build(_ h: Hole) throws -> CourseRig {
        let rig = CourseRig(), root = rig.root
        var rng = Rand(seed: 1)

        // turf: the sim's own surface, the turf shader, a turf painted here
        let felt = UIColor(red: 0.21, green: 0.50, blue: 0.23, alpha: 1)
        let turfTex = try texture(paintTurf(felt, &rng), srgb: true), turfN = try texture(paintNoiseNormal(&rng, scale: 64, strength: 2.2), srgb: false, normal: true)
        var turf: any Material
        if let lib = CourseBuilder.library {
            var c = try CustomMaterial(surfaceShader: CustomMaterial.SurfaceShader(named: "turfSurface", in: lib), lightingModel: .lit)
            c.baseColor = .init(tint: .white, texture: .init(turfTex)); c.normal = .init(texture: .init(turfN)); c.roughness = .init(scale: 0.93)
            let along = simd_normalize(SIMD2(Float(h.cup.x - h.tee.x), Float(h.cup.z - h.tee.z)))
            c.custom.value = SIMD4(along.x, along.y, 0.13, 0.7)
            turf = c
        } else { var p = PhysicallyBasedMaterial(); p.baseColor = .init(tint: .white, texture: .init(turfTex)); turf = p }
        root.addChild(ModelEntity(mesh: try CourseBuilder.lowMesh(Terrain.floor(h)), materials: [turf]))
        root.addChild(ModelEntity(mesh: try CourseBuilder.lowMesh(Terrain.collar(h)), materials: [turf]))

        // the zones: a rubber conveyor belt with chevrons, and a sand pocket
        for (i, z) in h.data.zones.enumerated() {
            var m = PhysicallyBasedMaterial()
            if let push = z.push {
                m.baseColor = .init(tint: .white, texture: .init(try texture(paintBelt(), srgb: true)))
                m.roughness = 0.6
                m.textureCoordinateTransform = .init(offset: .zero, scale: [1, 1], rotation: -Float(atan2(push.x, push.z)))
            } else {
                m.baseColor = .init(tint: .white, texture: .init(try texture(paintGrain(UIColor(red: 0.54, green: 0.38, blue: 0.21, alpha: 1), &rng), srgb: true)))
                m.roughness = 1.0
            }
            let e = ModelEntity(mesh: try CourseBuilder.lowMesh(Terrain.zone(h, i)), materials: [m])
            if z.push != nil { rig.flows.append((e, 0, hypot(z.push!.x, z.push!.z))) }
            root.addChild(e)
        }

        // the ground: a sandy yard
        var ground = PhysicallyBasedMaterial()
        ground.baseColor = .init(tint: .white, texture: .init(try texture(paintGrain(UIColor(red: 0.79, green: 0.64, blue: 0.46, alpha: 1), &rng), srgb: true)))
        ground.textureCoordinateTransform = .init(offset: .zero, scale: [48, 48], rotation: 0)
        ground.roughness = 1.0
        root.addChild(ModelEntity(mesh: try CourseBuilder.lowMesh(Terrain.ground()), materials: [ground]))

        // the borders: yellow steel rails on posts, with a cap rail
        var rail = PhysicallyBasedMaterial()
        rail.baseColor = .init(tint: .white, texture: .init(try texture(paintRail(), srgb: true)))
        rail.roughness = 0.45; rail.metallic = 0.4
        var cap = rail; cap.baseColor = .init(tint: UIColor(white: 1.0, alpha: 1), texture: .init(try texture(paintRail(), srgb: true)))
        for (i, s) in h.segs.enumerated() {
            let len = Float(hypot(s.bx - s.ax, s.bz - s.az)), top = Float(h.data.segTop[i][0]), lo = Float(min(0, h.data.segTop[i][1]) - 0.03)
            let mid = SIMD3(Float(s.ax + s.bx) / 2, 0, Float(s.az + s.bz) / 2), yaw = Float(atan2(s.bx - s.ax, s.bz - s.az))
            let w = ModelEntity(mesh: .generateBox(size: [Float(Sim.WALL_HALF * 2), top - lo, len]), materials: [rail])
            w.position = mid + [0, (top + lo) / 2, 0]; w.orientation = simd_quatf(angle: yaw, axis: [0, 1, 0])
            root.addChild(w)
            let c = ModelEntity(mesh: .generateBox(size: [Float(Sim.WALL_HALF * 2) + 0.014, 0.016, len + 0.008], cornerRadius: 0.004), materials: [cap])
            c.position = mid + [0, top + 0.008, 0]; c.orientation = w.orientation
            root.addChild(c)
        }
        for wall in h.data.walls { for p in wall {
            let post = ModelEntity(mesh: .generateCylinder(height: 0.2, radius: Float(Sim.WALL_HALF)), materials: [rail])
            post.position = [Float(p.x), 0.07, Float(p.z)]
            root.addChild(post)
        } }

        // river-rock edging: stones laid in a band round the floor
        let stoneMats = (0..<4).map { k -> PhysicallyBasedMaterial in
            var m = PhysicallyBasedMaterial(); let g = 0.55 + 0.1 * CGFloat(k)
            m.baseColor = .init(tint: UIColor(red: g, green: g * 0.97, blue: g * 0.93, alpha: 1)); m.roughness = 0.85; return m
        }
        let stone = MeshResource.generateSphere(radius: 1)
        for f in h.data.floors {
            for i in 0..<f.pts.count {
                let a = f.pts[i], b = f.pts[(i + 1) % f.pts.count], L = hypot(b.x - a.x, b.z - a.z)
                guard L > 1e-6 else { continue }
                let nx = (b.z - a.z) / L, nz = -(b.x - a.x) / L, n = Int(L / 0.07)
                for k in 0..<n { for row in 0..<4 {
                    let u = (Double(k) + rng.next()) / Double(n), d = Sim.WALL_HALF + 0.03 + Double(row) * 0.075 + rng.next() * 0.03
                    // the band lies outside the course: pick the side away from the floor's middle
                    let x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u
                    let side: Double = f.contains(x + nx * 0.2, z + nz * 0.2) ? -1 : 1
                    let r = Float(0.022 + rng.next() * 0.02)
                    let s = ModelEntity(mesh: stone, materials: [stoneMats[Int(rng.next() * 4)]])
                    s.scale = [r, r * 0.55, r * Float(0.8 + rng.next() * 0.4)]
                    s.position = [Float(x + nx * d * side), -0.03 + r * 0.3, Float(z + nz * d * side)]
                    s.orientation = simd_quatf(angle: Float(rng.next() * 6.28), axis: [0, 1, 0])
                    root.addChild(s)
                } }
            }
        }

        // the cup: a white liner, a dark floor, a flag on its pin
        let cy = Float(h.groundH(h.cup.x, h.cup.z))
        var white = PhysicallyBasedMaterial(); white.baseColor = .init(tint: UIColor(white: 0.95, alpha: 1)); white.roughness = 0.55; white.faceCulling = .front
        var dark = PhysicallyBasedMaterial(); dark.baseColor = .init(tint: UIColor(red: 0.17, green: 0.15, blue: 0.13, alpha: 1)); dark.roughness = 1.0
        let liner = ModelEntity(mesh: .generateCylinder(height: Float(Sim.CUP_SINK), radius: Float(Sim.CUP_R)), materials: [white])
        liner.position = [Float(h.cup.x), cy - Float(Sim.CUP_SINK) / 2, Float(h.cup.z)]
        let floorDisc = ModelEntity(mesh: .generateCylinder(height: 0.002, radius: Float(Sim.CUP_R) - 0.002), materials: [dark])
        floorDisc.position = [Float(h.cup.x), cy - Float(Sim.CUP_SINK), Float(h.cup.z)]
        var pinMat = PhysicallyBasedMaterial(); pinMat.baseColor = .init(tint: UIColor(white: 0.97, alpha: 1)); pinMat.roughness = 0.3; pinMat.metallic = 0.6
        let pin = ModelEntity(mesh: .generateCylinder(height: 0.75, radius: 0.006), materials: [pinMat])
        pin.position = [Float(h.cup.x), cy + 0.375 - 0.05, Float(h.cup.z)]
        var flagMat = PhysicallyBasedMaterial(); flagMat.baseColor = .init(tint: UIColor(red: 0.94, green: 0.49, blue: 0.43, alpha: 1)); flagMat.roughness = 0.8; flagMat.faceCulling = .none
        let flag = ModelEntity(mesh: .generatePlane(width: 0.26, height: 0.17), materials: [flagMat])
        flag.position = [Float(h.cup.x) + 0.13, cy + 0.61, Float(h.cup.z)]
        root.addChild(liner); root.addChild(floorDisc); root.addChild(pin); root.addChild(flag)

        // the tee: a rubber mat with a white border
        var matMat = PhysicallyBasedMaterial(); matMat.baseColor = .init(tint: .white, texture: .init(try texture(paintTeeMat(), srgb: true))); matMat.roughness = 0.9
        let tee = ModelEntity(mesh: .generateBox(size: [0.3, 0.008, 0.36], cornerRadius: 0.003), materials: [matMat])
        tee.position = [Float(h.tee.x), Float(h.groundH(h.tee.x, h.tee.z)) + 0.002, Float(h.tee.z)]
        root.addChild(tee)

        // the yard round it: cones, girder stacks, barrels and a digger, scattered clear of the course
        let B = Terrain.bounds(h)
        var placed = 0, tries = 0
        while placed < 22 && tries < 400 {
            tries += 1
            let x = B.x0 - 3 + rng.next() * (B.x1 - B.x0 + 6), z = B.z0 - 3 + rng.next() * (B.z1 - B.z0 + 6)
            if h.onFloor(x, z) || h.segs.contains(where: { s in let p = closestOnSeg(s.ax, s.az, s.bx, s.bz, x, z); return hypot(x - p.0, z - p.1) < 0.9 }) { continue }
            let k = rng.next(), o = k < 0.4 ? cone() : k < 0.65 ? girders(&rng) : k < 0.85 ? barrels() : digger()
            o.position = [Float(x), -0.03, Float(z)]
            o.orientation = simd_quatf(angle: Float(rng.next() * 6.28), axis: [0, 1, 0])
            root.addChild(o); placed += 1
        }

        CourseBuilder.light(rig, SceneEnv.hand)
        return rig
    }

    // MARK: props, from primitives
    static func pbr(_ c: UIColor, rough: Float = 0.7, metal: Float = 0) -> PhysicallyBasedMaterial {
        var m = PhysicallyBasedMaterial(); m.baseColor = .init(tint: c); m.roughness = .init(floatLiteral: rough); m.metallic = .init(floatLiteral: metal); return m
    }
    static let orange = UIColor(red: 0.94, green: 0.49, blue: 0.43, alpha: 1), cream = UIColor(red: 1, green: 0.97, blue: 0.93, alpha: 1)
    static let yellow = UIColor(red: 1, green: 0.84, blue: 0.43, alpha: 1), pink = UIColor(red: 0.94, green: 0.55, blue: 0.5, alpha: 1)

    static func cone() -> Entity {
        let e = Entity()
        let body = ModelEntity(mesh: .generateCone(height: 0.42, radius: 0.12), materials: [pbr(orange, rough: 0.5)])
        body.position.y = 0.23
        let band = ModelEntity(mesh: .generateCylinder(height: 0.06, radius: 0.085), materials: [pbr(cream, rough: 0.5)])
        band.position.y = 0.26
        let base = ModelEntity(mesh: .generateBox(size: [0.3, 0.03, 0.3], cornerRadius: 0.02), materials: [pbr(orange, rough: 0.6)])
        base.position.y = 0.015
        e.addChild(body); e.addChild(band); e.addChild(base)
        return e
    }
    static func girders(_ rng: inout Rand) -> Entity {
        let e = Entity(), n = 2 + Int(rng.next() * 3)
        for i in 0..<n {
            let g = ModelEntity(mesh: .generateBox(size: [0.16, 0.12, 1.1 + Float(rng.next()) * 0.4], cornerRadius: 0.01), materials: [pbr(pink, rough: 0.6, metal: 0.2)])
            g.position = [Float(i % 2) * 0.18 - 0.09, 0.06 + Float(i / 2) * 0.12, 0]
            e.addChild(g)
        }
        return e
    }
    static func barrels() -> Entity {
        let e = Entity()
        for (i, off) in [SIMD3<Float>(0, 0, 0), [0.32, 0, 0.05], [0.15, 0, 0.3]].enumerated() {
            let b = ModelEntity(mesh: .generateCylinder(height: 0.42, radius: 0.14), materials: [pbr(i == 1 ? cream : yellow, rough: 0.55, metal: 0.3)])
            b.position = off + [0, 0.21, 0]
            let ring = ModelEntity(mesh: .generateCylinder(height: 0.025, radius: 0.145), materials: [pbr(UIColor(white: 0.85, alpha: 1), rough: 0.4, metal: 0.6)])
            ring.position = off + [0, 0.3, 0]
            e.addChild(b); e.addChild(ring)
        }
        return e
    }
    static func digger() -> Entity {
        let e = Entity(), body = pbr(yellow, rough: 0.5, metal: 0.2), dark = pbr(UIColor(white: 0.18, alpha: 1), rough: 0.8)
        for x: Float in [-0.22, 0.22] {
            let track = ModelEntity(mesh: .generateBox(size: [0.16, 0.14, 0.8], cornerRadius: 0.05), materials: [dark])
            track.position = [x, 0.07, 0]; e.addChild(track)
        }
        let cab = ModelEntity(mesh: .generateBox(size: [0.5, 0.3, 0.55], cornerRadius: 0.03), materials: [body]); cab.position = [0, 0.29, 0]
        let roof = ModelEntity(mesh: .generateBox(size: [0.32, 0.22, 0.3], cornerRadius: 0.02), materials: [pbr(cream, rough: 0.4)]); roof.position = [-0.06, 0.55, -0.08]
        let boom = ModelEntity(mesh: .generateBox(size: [0.08, 0.08, 0.7], cornerRadius: 0.01), materials: [body])
        boom.position = [0.12, 0.62, 0.42]; boom.orientation = simd_quatf(angle: -0.6, axis: [1, 0, 0])
        let stick = ModelEntity(mesh: .generateBox(size: [0.07, 0.07, 0.45], cornerRadius: 0.01), materials: [body])
        stick.position = [0.12, 0.62, 0.9]; stick.orientation = simd_quatf(angle: 0.9, axis: [1, 0, 0])
        let bucket = ModelEntity(mesh: .generateBox(size: [0.2, 0.12, 0.14], cornerRadius: 0.02), materials: [dark]); bucket.position = [0.12, 0.42, 1.02]
        for p in [cab, roof, boom, stick, bucket] { e.addChild(p) }
        return e
    }

    // MARK: textures, painted with Core Graphics
    static func texture(_ img: CGImage, srgb: Bool, normal: Bool = false) throws -> TextureResource {
        try TextureResource.generate(from: img, options: .init(semantic: normal ? .normal : (srgb ? .color : .raw), mipmapsMode: .allocateAndGenerateAll))
    }
    static func canvas(_ n: Int, _ draw: (CGContext) -> Void) -> CGImage {
        let ctx = CGContext(data: nil, width: n, height: n, bitsPerComponent: 8, bytesPerRow: n * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        draw(ctx)
        return ctx.makeImage()!
    }
    static func paintTurf(_ felt: UIColor, _ rng: inout Rand) -> CGImage {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        felt.getRed(&r, green: &g, blue: &b, alpha: &a)
        var local = rng
        let img = canvas(512) { x in
            x.setFillColor(red: r, green: g, blue: b, alpha: 1); x.fill(CGRect(x: 0, y: 0, width: 512, height: 512))
            x.setLineCap(.round)
            for _ in 0..<26000 {
                let px = local.next() * 512, py = local.next() * 512, ang = local.next() * 6.28, L = 1.2 + local.next() * 2.6
                let lit = local.next() < 0.55 ? 1.2 + local.next() * 0.25 : 0.8 + local.next() * 0.12
                x.setStrokeColor(red: min(1, r * lit), green: min(1, g * lit), blue: min(1, b * lit), alpha: 0.35 + local.next() * 0.35)
                x.setLineWidth(0.8 + local.next() * 0.7)
                x.move(to: CGPoint(x: px, y: py)); x.addLine(to: CGPoint(x: px + cos(ang) * L, y: py + sin(ang) * L)); x.strokePath()
            }
        }
        rng = local
        return img
    }
    static func paintGrain(_ c: UIColor, _ rng: inout Rand) -> CGImage {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        c.getRed(&r, green: &g, blue: &b, alpha: &a)
        var local = rng
        let img = canvas(256) { x in
            x.setFillColor(red: r, green: g, blue: b, alpha: 1); x.fill(CGRect(x: 0, y: 0, width: 256, height: 256))
            for _ in 0..<9000 {
                let k = 0.8 + local.next() * 0.4, s = 0.6 + local.next() * 1.6
                x.setFillColor(red: min(1, r * k), green: min(1, g * k), blue: min(1, b * k), alpha: 0.7)
                x.fillEllipse(in: CGRect(x: local.next() * 256, y: local.next() * 256, width: s, height: s))
            }
        }
        rng = local
        return img
    }
    static func paintNoiseNormal(_ rng: inout Rand, scale: Int, strength: Double) -> CGImage {
        let n = 256, f = Noise.field(UInt32(rng.next() * 1000) + 1, scale)
        var px = [UInt8](repeating: 255, count: n * n * 4)
        func hgt(_ i: Int, _ j: Int) -> Double { f(Double((i + n) % n) / Double(n), Double((j + n) % n) / Double(n)) }
        for j in 0..<n { for i in 0..<n {
            let dx = (hgt(i + 1, j) - hgt(i - 1, j)) * strength, dy = (hgt(i, j + 1) - hgt(i, j - 1)) * strength, l = (dx * dx + dy * dy + 1).squareRoot()
            let k = (j * n + i) * 4
            px[k] = UInt8((-dx / l * 0.5 + 0.5) * 255); px[k + 1] = UInt8((-dy / l * 0.5 + 0.5) * 255); px[k + 2] = UInt8((1 / l * 0.5 + 0.5) * 255)
        } }
        let ctx = CGContext(data: &px, width: n, height: n, bitsPerComponent: 8, bytesPerRow: n * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        return ctx.makeImage()!
    }
    static func paintBelt() -> CGImage {
        canvas(256) { x in
            x.setFillColor(red: 0.30, green: 0.26, blue: 0.23, alpha: 1); x.fill(CGRect(x: 0, y: 0, width: 256, height: 256))
            x.setStrokeColor(red: 0.93, green: 0.92, blue: 0.9, alpha: 0.9); x.setLineWidth(18); x.setLineCap(.round); x.setLineJoin(.round)
            for y in stride(from: 32.0, to: 256, by: 128) {
                x.move(to: CGPoint(x: 70, y: y + 70)); x.addLine(to: CGPoint(x: 128, y: y)); x.addLine(to: CGPoint(x: 186, y: y + 70)); x.strokePath()
            }
        }
    }
    static func paintRail() -> CGImage {
        canvas(128) { x in
            x.setFillColor(red: 1, green: 0.84, blue: 0.43, alpha: 1); x.fill(CGRect(x: 0, y: 0, width: 128, height: 128))
            for i in 0..<40 { x.setFillColor(red: 0.95, green: 0.78, blue: 0.38, alpha: 0.25); x.fill(CGRect(x: 0, y: CGFloat(i) * 3.2, width: 128, height: 1.2)) }
        }
    }
    static func paintTeeMat() -> CGImage {
        canvas(128) { x in
            x.setFillColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 1); x.fill(CGRect(x: 0, y: 0, width: 128, height: 128))
            x.setStrokeColor(red: 0.8, green: 0.8, blue: 0.8, alpha: 1); x.setLineWidth(4); x.stroke(CGRect(x: 6, y: 6, width: 116, height: 116))
        }
    }
}

/// a small seeded random source for the hand-built scenery
struct Rand {
    private var s: UInt64
    init(seed: UInt64) { s = seed &* 0x9E37_79B9_7F4A_7C15 | 1 }
    mutating func next() -> Double { s ^= s << 13; s ^= s >> 7; s ^= s << 17; return Double(s >> 11) / Double(1 << 53) }
}

extension SceneEnv {
    /// course 1's sky and sun, for the hand-built hole
    static let hand: SceneEnv = try! JSONDecoder().decode(SceneEnv.self, from: Data(##"{"sky":["#9fd8ef","#fff1d6"],"fog":null,"sun":{"dir":[0.5345,0.6949,-0.4811],"color":[1,0.79,0.55],"intensity":3},"night":false}"##.utf8))
}
