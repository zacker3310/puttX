// What moves on a course between putts, replayed from the formulas export-scene wrote (each checked
// there against the look's own tick): bats circling, ships rocking, asteroids and buoys bobbing,
// beacons blinking, mixers turning, the aurora breathing, neon ribs chasing, the clubhouse pennant
// stirring; fireflies, snow and embers drifting; tumbleweeds rolling along with their movers.
// Everything is a function of the hole's time, so a frame can be posed from scratch. Still under
// reduced motion, as on the web.
import Foundation
import RealityKit
import UIKit
import PuttXCore

// MARK: the manifest
/// c + rate * t + sum a * sin(f * t + p), with each sine clipped at 0 when `relu`
struct Channel: Decodable {
    let v: [Double]
    init(from d: Decoder) throws { v = try d.singleValueContainer().decode([Double].self) }
    func at(_ t: Double, relu: Bool = false) -> Double {
        var x = v[0] + v[1] * t
        var i = 2
        while i + 2 < v.count {
            let s = sin(v[i + 1] * t + v[i + 2])
            x += v[i] * (relu ? max(0, s) : s)
            i += 3
        }
        return x
    }
}
struct SceneAnim: Decodable {
    /// the animated ancestor this one rides on (-1: the hole)
    let up: Int
    /// from that ancestor's frame to this object's parent frame
    let px: [Float]
    /// the pose at t = 0: position, rotation (XYZ), scale
    let b: [Double]
    let ch: [String: Channel]
    /// blinking: shown while sin(f * t + p) > threshold
    let vis: [Double]?
    /// a rig the game drives itself ("flag": the flagstick)
    let name: String?
    /// a night floor spot: wheels round (cx, cz) at radius r from angle a, on the ground, shown only over the felt
    let orbit: [Double]?
    let parts: [SceneNode]
}
struct SceneMatAnim: Decodable {
    let m: Int
    /// "g" (the colour's green), "ei" (emissive intensity), "op" (opacity)
    let p: String
    let ch: Channel
    let relu: Int
    /// pulses on neon night's beat: plus this times exp(-5 x the beat's phase)
    let beat: Double?
}
struct SceneWeed: Decodable {
    let i: Int
    let x: [Float]
    let r: Double
    let parts: [SceneNode]
}
struct PointsAnim: Decodable {
    let k: String
    let rate: Double
    let off: [Double]
}

// MARK: playback
@MainActor
final class SceneAnimator {
    private struct Rig { let e: Entity; let a: SceneAnim }
    private var rigs: [Rig] = []
    private struct MatTarget { let e: ModelEntity; let slot: Int; let a: SceneMatAnim; let base: SceneMat; var last: Double }
    private var mats: [MatTarget] = []
    private var clouds: [PointCloud] = []
    private struct Weed { let e: Entity; let mover: Mover; let base: SIMD3<Float>; let r: Double; var roll: Double }
    private var weeds: [Weed] = []
    private var lastT: Double?
    /// the hole, for the night spots' ground and felt
    var hole: Hole?

    /// a named rig's entity (the flagstick), which the game poses itself
    func named(_ n: String) -> Entity? { rigs.first { $0.a.name == n }?.e }

    var isEmpty: Bool { rigs.isEmpty && mats.isEmpty && clouds.isEmpty && weeds.isEmpty }

    /// the animated objects as entities under `root`, each carrying its meshes
    func build(_ hole: SceneHole, root: Entity, mesh: (SceneNode) throws -> ModelEntity) throws {
        for a in hole.anims ?? [] {
            let parent = Entity()
            parent.transform = Transform(matrix: CourseBuilder.matrix(a.px))
            (a.up >= 0 && a.up < rigs.count ? rigs[a.up].e : root).addChild(parent)
            let o = Entity()
            parent.addChild(o)
            for n in a.parts { o.addChild(try mesh(n)) }
            rigs.append(Rig(e: o, a: a))
            pose(rigs.count - 1, 0)
        }
    }
    /// every entity drawn with an animated material
    func bind(_ e: ModelEntity, materials: [Int], hole: SceneHole) {
        for (slot, m) in materials.enumerated() {
            for a in hole.matAnims ?? [] where a.m == m {
                mats.append(MatTarget(e: e, slot: slot, a: a, base: hole.mats[m], last: .nan))
                // an opacity channel fades the entity through its opacity component: the material
                // itself goes fully opaque-capable once, and nothing is rebuilt per frame
                if a.p == "op", var list = e.model?.materials, slot < list.count {
                    if var u = list[slot] as? UnlitMaterial { u.blending = .transparent(opacity: 1.0); list[slot] = u }
                    else if var p = list[slot] as? PhysicallyBasedMaterial { p.blending = .transparent(opacity: 1.0); list[slot] = p }
                    e.model?.materials = list
                }
            }
        }
    }
    func add(_ c: PointCloud) { clouds.append(c) }
    func addWeed(_ e: Entity, mover: Mover, r: Double) { weeds.append(Weed(e: e, mover: mover, base: e.position, r: r, roll: 0)) }

    func update(_ t: Double) {
        let dt = lastT.map { max(0, min(0.1, t - $0)) } ?? 0
        lastT = t
        for i in rigs.indices where rigs[i].a.name == nil { pose(i, t) }
        for i in mats.indices { paint(i, t) }
        for c in clouds { c.update(t) }
        for i in weeds.indices { roll(i, t, dt) }
    }

    private func pose(_ i: Int, _ t: Double) {
        let r = rigs[i], a = r.a, b = a.b
        func v(_ k: String, _ base: Double) -> Float { Float(a.ch[k]?.at(t) ?? base) }
        r.e.position = SIMD3(v("px", b[0]), v("py", b[1]), v("pz", b[2]))
        // three's XYZ order: x, then y, then z, about the object's own axes
        let qx = simd_quatf(angle: v("rx", b[3]), axis: [1, 0, 0]), qy = simd_quatf(angle: v("ry", b[4]), axis: [0, 1, 0]), qz = simd_quatf(angle: v("rz", b[5]), axis: [0, 0, 1])
        r.e.orientation = qx * qy * qz
        r.e.scale = SIMD3(Float(b[6]), Float(b[7]), Float(b[8]))
        if let s = a.vis { r.e.isEnabled = sin(s[0] * t + s[1]) > s[2] }
        // a night spot wheeling over the carpet, set on the ground, hidden off the felt
        if let o = a.orbit, o.count == 4, let h = hole {
            let ang = o[0] + t * 0.35, x = cos(ang) * o[1], z = sin(ang) * o[1], wx = o[2] + x, wz = o[3] + z
            r.e.position = SIMD3(Float(x), Float(h.groundH(wx, wz) + 0.006), Float(z))
            r.e.isEnabled = h.onFloor(wx, wz)
        }
    }

    private func paint(_ i: Int, _ t: Double) {
        let x = mats[i], beat = x.a.beat.map { $0 * exp(-5 * (t * SFX.bpm / 60).truncatingRemainder(dividingBy: 1)) } ?? 0
        let val = x.a.ch.at(t, relu: x.a.relu != 0) + beat
        if x.a.p == "op" { x.e.components.set(OpacityComponent(opacity: Float(max(0, min(1, val))))); return }
        // colour and glow: rebuilt only when the change would show
        if abs(val - x.last) < 0.01 { return }
        mats[i].last = val
        guard var list = x.e.model?.materials, x.slot < list.count else { return }
        let m = list[x.slot]
        switch x.a.p {
        case "g":
            let c = SceneStore.color([x.base.color[0], val, x.base.color[2]])
            if var p = m as? PhysicallyBasedMaterial { p.baseColor.tint = c; list[x.slot] = p }
            else if var u = m as? UnlitMaterial { u.color.tint = c; list[x.slot] = u }
        case "ei":
            if var p = m as? PhysicallyBasedMaterial { p.emissiveIntensity = Float(val); list[x.slot] = p }
        case "op":
            if var p = m as? PhysicallyBasedMaterial { p.blending = .transparent(opacity: .init(floatLiteral: Float(val))); list[x.slot] = p }
            else if var u = m as? UnlitMaterial { u.blending = .transparent(opacity: .init(floatLiteral: Float(val))); list[x.slot] = u }
        default: return
        }
        x.e.model?.materials = list
    }

    /// c02's tick: the inner ball rolls about the axis across its travel, undoing the mover's slow
    /// yaw, and skips a little each half turn
    private func roll(_ i: Int, _ t: Double, _ dt: Double) {
        let w = weeds[i], s = w.mover.state(at: t), v = hypot(s.vx, s.vz)
        guard v > 1e-4, dt > 0 else { return }
        let yaw = -t * 0.8   // the slide's own turn (updateMovers)
        let ax = SIMD3(s.vz / v * cos(yaw) + (-s.vx / v) * sin(yaw), 0, -(s.vz / v) * sin(yaw) + (-s.vx / v) * cos(yaw))
        let k = v * dt / w.r
        w.e.orientation = simd_quatf(angle: Float(k), axis: SIMD3(Float(ax.x), 0, Float(ax.z))) * w.e.orientation
        weeds[i].roll += k
        w.e.position = SIMD3(w.base.x, Float(w.r * 0.12 * abs(sin(weeds[i].roll * 0.5))), w.base.z)
    }
}

/// a particle cloud as tiny diamonds (one per point), drifting as the web's tick drifts it
@MainActor
final class PointCloud {
    let entity: ModelEntity
    private let mesh: LowLevelMesh
    private let base: [SIMD3<Double>]
    private let anim: PointsAnim?
    private let r: Float
    private static let dirs: [SIMD3<Float>] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
    private static let faces: [UInt32] = [0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4, 2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5]

    init?(_ c: ScenePoints) throws {
        var pts: [SIMD3<Double>] = []
        for i in stride(from: 0, to: c.pts.count - 2, by: 3) { pts.append(SIMD3(Double(c.pts[i]), Double(c.pts[i + 1]), Double(c.pts[i + 2]))) }
        guard !pts.isEmpty else { return nil }
        base = pts; anim = c.anim; r = Float(c.size) * 0.5
        var d = LowLevelMesh.Descriptor()
        d.vertexAttributes = [.init(semantic: .position, format: .float3, offset: 0)]
        d.vertexLayouts = [.init(bufferIndex: 0, bufferStride: MemoryLayout<SIMD3<Float>>.stride)]
        d.vertexCapacity = pts.count * 6
        d.indexCapacity = pts.count * 24
        d.indexType = .uint32
        mesh = try LowLevelMesh(descriptor: d)
        mesh.withUnsafeMutableIndices { raw in
            let out = raw.bindMemory(to: UInt32.self)
            for p in 0..<pts.count { for (k, f) in Self.faces.enumerated() { out[p * 24 + k] = f + UInt32(p * 6) } }
        }
        var m = UnlitMaterial(color: SceneStore.color(c.color))
        if c.opacity < 1 { m.blending = .transparent(opacity: .init(floatLiteral: Float(c.opacity))) }
        entity = ModelEntity(mesh: try MeshResource(from: mesh), materials: [m])
        write(0)
    }

    var animated: Bool { anim != nil }

    func update(_ t: Double) { if anim != nil { write(t) } }

    private func write(_ t: Double) {
        var lo = SIMD3<Float>(repeating: .greatestFiniteMagnitude), hi = -lo
        mesh.withUnsafeMutableBytes(bufferIndex: 0) { raw in
            let out = raw.bindMemory(to: SIMD3<Float>.self)
            for (i, p0) in base.enumerated() {
                let p = at(p0, i, t), c = SIMD3(Float(p.x), Float(p.y), Float(p.z))
                for (k, d) in Self.dirs.enumerated() { out[i * 6 + k] = c + d * r }
                lo = simd_min(lo, c); hi = simd_max(hi, c)
            }
        }
        mesh.parts.replaceAll([LowLevelMesh.Part(indexCount: base.count * 24, topology: .triangle, bounds: BoundingBox(min: lo - r, max: hi + r))])
    }

    /// export-scene's ptAt: the tick's frame-by-frame drift in closed form
    private func at(_ w: SIMD3<Double>, _ i: Int, _ t: Double) -> SIMD3<Double> {
        guard let a = anim, t != 0 else { return w }
        let off = SIMD3(a.off[0], a.off[1], a.off[2]), fi = Double(i)
        var x = w.x - off.x, y = w.y - off.y, z = w.z - off.z
        func wrapped(_ v: Double, _ lo: Double, _ hi: Double, _ F: (Double) -> Double) {
            let L = hi - lo, Y = y + v * t
            let n = v > 0 ? max(0, ((Y - hi) / L).rounded(.up)) : max(0, ((lo - Y) / L).rounded(.up))
            let yy = v > 0 ? Y - n * L : Y + n * L, a = v > 0 ? hi : lo, b = v > 0 ? lo : hi
            x += n == 0 ? F(yy) - F(y) : F(a) - F(y) + (n - 1) * (F(a) - F(b)) + F(yy) - F(b)
            y = yy
        }
        switch a.k {
        case "flies":
            y += 0.12 / 1.3 * (cos(fi) - cos(1.3 * t + fi))
            x += 0.08 / 0.9 * (sin(0.9 * t + 1.7 * fi) - sin(1.7 * fi))
        case "snow": wrapped(-0.45, 0.6, 6.6) { 0.05 / 0.9 * cos(2 * $0 + fi) }
        case "embers": wrapped(0.25, 0.3, 5) { -0.03 / (0.25 * 1.7) * cos(1.7 * $0 + fi) }
        case "spin":
            // the whole cloud turns about the hole's vertical axis
            let ang = a.rate * t, c = cos(ang), s = sin(ang), wx = w.x, wz = w.z
            return SIMD3(wx * c + wz * s, w.y, -wx * s + wz * c)
        default: break
        }
        return SIMD3(x, y, z) + off
    }
}
