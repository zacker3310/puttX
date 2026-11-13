// The stage: every layout is written in the web's stage pixels (a 1200 x 700 design), and scaled to the
// screen like the web's fit(). One rule bends it: an 88 stage px button must never render under 64 pt,
// so on a small phone the scale stops shrinking and the stage itself gets smaller instead (layouts read
// `size` and place things proportionally). An iPad 13" stage is about 1200 x 900; an iPhone 16 Pro
// landscape stage about 1100 x 540.
import SwiftUI

struct StageMetrics: Equatable {
    /// the stage's size in stage px
    var size: CGSize
    /// points per stage px
    var scale: CGFloat

    static let design = CGSize(width: 1200, height: 700)
    static let minScale: CGFloat = 64.0 / 88.0

    static func fit(_ s: CGSize) -> StageMetrics {
        guard s.width > 0, s.height > 0 else { return StageMetrics(size: design, scale: 1) }
        let k = max(min(s.width / design.width, s.height / design.height), minScale)
        return StageMetrics(size: CGSize(width: s.width / k, height: s.height / k), scale: k)
    }
    /// stage px to points
    @inline(__always) func s(_ v: CGFloat) -> CGFloat { v * scale }
    func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * scale, y: y * scale) }
    var w: CGFloat { size.width }
    var h: CGFloat { size.height }
}

private struct StageKey: EnvironmentKey { static let defaultValue = StageMetrics(size: StageMetrics.design, scale: 1) }
extension EnvironmentValues {
    var stage: StageMetrics {
        get { self[StageKey.self] }
        set { self[StageKey.self] = newValue }
    }
}

/// Measures the safe area and hands the stage to everything inside.
struct Stage<Content: View>: View {
    @ViewBuilder var content: (StageMetrics) -> Content
    var body: some View {
        GeometryReader { geo in
            let st = StageMetrics.fit(geo.size)
            content(st).environment(\.stage, st).frame(width: geo.size.width, height: geo.size.height)
        }
    }
}
