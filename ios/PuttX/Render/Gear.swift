// The pro shop's gear in 3D, from what export-gear wrote out of the web's own builders: a putter as
// an entity (shaft, grip and its own head, crazy ones included) and a ball's finish as a material.
import Foundation
import RealityKit
import UIKit

@MainActor
enum Gear {
    /// a putter, in the web's frame: the face looks down +z at the origin, the shaft rises toward +x
    static func putter(_ id: String) -> Entity? {
        guard let g = try? SceneStore.shared.gear(id), let parts = g.parts else { return nil }
        let S = SceneStore.shared, mats = g.mats.map { S.material($0) }, root = Entity()
        for p in parts {
            guard let geo = try? S.geo(p.g), let mesh = try? S.mesh(geo, materials: p.m.list.count) else { continue }
            let e = ModelEntity(mesh: mesh, materials: p.m.list.map { mats[$0] })
            e.transform = Transform(matrix: CourseBuilder.matrix(p.x))
            if p.head { e.name = "head" }
            root.addChild(e)
        }
        return root
    }
    /// a ball's skin and finish
    static func ballMaterial(_ id: String) -> (any Material)? {
        guard let g = try? SceneStore.shared.gear(id), let m = g.mat, m < g.mats.count else { return nil }
        return SceneStore.shared.material(g.mats[m])
    }
}

extension Gear {
    /// a sphere laid out as three's SphereGeometry (uvs and all), so a skin painted for the web's ball
    /// wraps this one the same way
    static func sphere(radius r: Float, widthSegments w: Int = 40, heightSegments h: Int = 28) -> MeshResource {
        var pos: [SIMD3<Float>] = [], nor: [SIMD3<Float>] = [], uv: [SIMD2<Float>] = [], idx: [UInt32] = []
        var grid: [[UInt32]] = []
        for iy in 0...h {
            let v = Float(iy) / Float(h)
            var row: [UInt32] = []
            for ix in 0...w {
                let u = Float(ix) / Float(w)
                let n = SIMD3(-cos(u * 2 * .pi) * sin(v * .pi), cos(v * .pi), sin(u * 2 * .pi) * sin(v * .pi))
                row.append(UInt32(pos.count)); pos.append(n * r); nor.append(n); uv.append(SIMD2(u, 1 - v))
            }
            grid.append(row)
        }
        for iy in 0..<h { for ix in 0..<w {
            let a = grid[iy][ix + 1], b = grid[iy][ix], c = grid[iy + 1][ix], d = grid[iy + 1][ix + 1]
            if iy != 0 { idx += [a, b, d] }
            if iy != h - 1 { idx += [b, c, d] }
        } }
        var d = MeshDescriptor()
        d.positions = MeshBuffers.Positions(pos); d.normals = MeshBuffers.Normals(nor); d.textureCoordinates = MeshBuffers.TextureCoordinates(uv)
        d.primitives = .triangles(idx)
        return (try? MeshResource.generate(from: [d])) ?? .generateSphere(radius: r)
    }
}
