// The title: the web's own illustration (src/shell.html #titleArt), layer by layer as export-ui drew
// it, each replaying its CSS keyframes: the sun turns, clouds drift, stars twinkle, the volcano smokes,
// the planet and the island float, the bat flits, the palm sways, the flag waves, and every six seconds
// the putter swings and the ball with a face rolls into the cup in a burst of confetti. The sign
// drops in and sways; its lettering is set here in SF Rounded, as Safari sets it. Still under
// reduced motion. The art fills the screen the way the web's does (slice).
import SwiftUI

struct TitleLayer: Decodable {
    let name: String
    let rect: [Double]
    let anim: String?
    let dur: Double?
    let delay: Double?
    let origin: [Double]?
    let dx: Double?
    let dy: Double?
}

enum TitleData {
    static let layers: [TitleLayer] = {
        struct F: Decodable { let layers: [TitleLayer] }
        guard let u = Bundle.main.url(forResource: "title", withExtension: "json"), let d = try? Data(contentsOf: u) else { return [] }
        return (try? JSONDecoder().decode(F.self, from: d))?.layers ?? []
    }()
}

/// the pose of one layer at a moment: in the art's own units
private struct Pose {
    var tx = 0.0, ty = 0.0, rot = 0.0, sx = 1.0, sy = 1.0, skewY = 0.0, opacity = 1.0
}

/// a CSS cubic-bezier timing function
private func bezier(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double, _ x: Double) -> Double {
    var t = x
    for _ in 0..<8 {
        let cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
        let fx = ((ax * t + bx) * t + cx) * t - x, d = (3 * ax * t + 2 * bx) * t + cx
        if abs(fx) < 1e-6 || abs(d) < 1e-6 { break }
        t -= fx / d
    }
    t = min(1, max(0, t))
    let cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    return ((ay * t + by) * t + cy) * t
}
/// CSS `ease-in-out` on a segment
private func ease(_ u: Double) -> Double { bezier(0.42, 0, 0.58, 1, min(1, max(0, u))) }
/// a there-and-back curve peaking at 50% (keyframes that set only the 50% stop)
private func bounce(_ p: Double) -> Double { ease(p < 0.5 ? p * 2 : (1 - p) * 2) }
private func seg(_ p: Double, _ a: Double, _ b: Double) -> Double { min(1, max(0, (p - a) / (b - a))) }

private func pose(_ l: TitleLayer, _ t: Double) -> Pose {
    var o = Pose()
    guard let anim = l.anim, let dur = l.dur, dur > 0 else { return o }
    var p = ((t + (l.delay ?? 0)) / dur).truncatingRemainder(dividingBy: 1)
    if p < 0 { p += 1 }
    switch anim {
    case "spin": o.rot = 360 * p
    case "twinkle": o.opacity = 1 - 0.65 * bounce(p)
    case "drift": o.tx = -420 + 1060 * p
    case "smoke":
        let e = bezier(0, 0, 0.58, 1, p)
        o.tx = 10 * e; o.ty = 30 - 70 * e; o.sx = 0.4 + 0.9 * e; o.sy = o.sx; o.opacity = 0.9 * (1 - e)
    case "float": o.ty = -10 * bounce(p)
    case "bat": let b = bounce(p); o.tx = 24 * b; o.ty = -14 * b
    case "sway", "sign": o.rot = 1.6 * bounce(p)
    case "wave": let b = bounce(p); o.sx = 1 - 0.1 * b; o.sy = 1 + 0.06 * b; o.skewY = -4 * b
    case "swing":
        if p < 0.12 { o.rot = -16 * ease(p / 0.12) }
        else if p < 0.17 { o.rot = -16 + 22 * ease(seg(p, 0.12, 0.17)) }
        else if p < 0.24 { o.rot = 6 - 6 * ease(seg(p, 0.17, 0.24)) }
    case "putt", "rollspin", "lines":
        // the ball's run to the cup, shared by the ball, its spin and its speed lines
        let run = bezier(0.2, 0.7, 0.4, 1, seg(p, 0.16, 0.52))
        if p < 0.52 { o.tx = 430 * run; o.ty = 30 * run }
        else if p < 0.56 { o.tx = 430; o.ty = 30 + 20 * ease(seg(p, 0.52, 0.56)) }
        else if p < 0.92 { o.tx = 430; o.ty = 50 + 10 * ease(seg(p, 0.56, 0.6)); o.opacity = p < 0.6 ? 1 - ease(seg(p, 0.56, 0.6)) : 0 }
        else { let k = ease(seg(p, 0.92, 0.96)); o.tx = 430 * (1 - k); o.ty = 60 * (1 - k); o.opacity = p < 0.96 ? 0 : ease(seg(p, 0.96, 1)) }
        if anim == "rollspin" { o.rot = 700 * run }
        if anim == "lines" { o.opacity *= p < 0.16 ? 0 : p < 0.22 ? 0.9 * ease(seg(p, 0.16, 0.22)) : 0.9 * (1 - ease(seg(p, 0.22, 0.44))) }
    case "pop":
        let dx = l.dx ?? 0, dy = l.dy ?? 0
        if p < 0.57 { o.opacity = 0 }
        else if p < 0.8 { let k = ease(seg(p, 0.57, 0.8)); o.opacity = min(1, seg(p, 0.57, 0.6)); o.tx = dx * k; o.ty = dy * k; o.rot = 280 * k }
        else { let k = ease(seg(p, 0.8, 0.9)); o.opacity = 1 - k; o.tx = dx; o.ty = dy + 60 * k; o.rot = 280 + 120 * k }
    default: break
    }
    return o
}

struct TitleArt: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var start = Date()

    var body: some View {
        GeometryReader { g in
            // fill the screen as the web's slice does: the art's shorter side meets the screen's
            let k = max(g.size.width / 1200, g.size.height / 700)
            TimelineView(.animation(paused: reduceMotion)) { tl in
                let t = reduceMotion ? 0 : tl.date.timeIntervalSince(start)
                ZStack(alignment: .topLeading) {
                    ForEach(TitleData.layers, id: \.name) { l in layer(l, t, k) }
                }
                .frame(width: 1200 * k, height: 700 * k, alignment: .topLeading)
                .position(x: g.size.width / 2, y: g.size.height / 2)
            }
        }
        .clipped()
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }

    @ViewBuilder private func layer(_ l: TitleLayer, _ t: Double, _ k: Double) -> some View {
        let r = l.rect, o = pose(l, t), org = l.origin ?? [r[0] + r[2] / 2, r[1] + r[3] / 2]
        let anchor = UnitPoint(x: (org[0] - r[0]) / r[2], y: (org[1] - r[1]) / r[3])
        // the sign drops in from above once, with an overshoot
        let drop = l.anim == "sign" && !reduceMotion ? -260 * (1 - bezier(0.3, 1.5, 0.5, 1, min(1, t / 0.8))) : 0
        ZStack(alignment: .topLeading) {
            Image("title-" + l.name).resizable().interpolation(.high)
            if l.name == "sign" { LogoText() }
        }
        .frame(width: r[2] * k, height: r[3] * k)
        .transformEffect(skew(o.skewY, anchor: anchor, size: CGSize(width: r[2] * k, height: r[3] * k)))
        .scaleEffect(x: o.sx, y: o.sy, anchor: anchor)
        .rotationEffect(.degrees(o.rot), anchor: anchor)
        .opacity(o.opacity)
        .offset(x: (r[0] + o.tx) * k, y: (r[1] + o.ty + drop) * k)
    }
    private func skew(_ deg: Double, anchor: UnitPoint, size: CGSize) -> CGAffineTransform {
        guard deg != 0 else { return .identity }
        let ax = anchor.x * size.width, ay = anchor.y * size.height
        // about the anchor: there, shear y by x, and back
        return CGAffineTransform(translationX: -ax, y: -ay)
            .concatenating(CGAffineTransform(a: 1, b: tan(deg * .pi / 180), c: 0, d: 1, tx: 0, ty: 0))
            .concatenating(CGAffineTransform(translationX: ax, y: ay))
    }
}

/// the logo on the sign, set as the web sets it (900 weight, rounded, letter-spaced, a brown outline
/// painted under the fill): "putt" in orange, a bigger "X" in coral. Drawn from glyph outlines so it
/// can carry the outline, in the sign layer's own frame.
struct LogoText: View {
    var body: some View {
        Canvas { ctx, size in
            guard let layer = TitleData.layers.first(where: { $0.name == "sign" }) else { return }
            let r = layer.rect, k = size.width / r[2]
            // the web's text: x 580 (middle), baseline 196, "putt" 112 px and "X" 128 px
            func font(_ px: CGFloat) -> CTFont {
                let base = UIFont.systemFont(ofSize: px * k, weight: .black)
                let d = base.fontDescriptor.withDesign(.rounded) ?? base.fontDescriptor
                return CTFontCreateWithFontDescriptor(d as CTFontDescriptor, px * k, nil)
            }
            var pen: CGFloat = 0
            var parts: [(CGPath, Color)] = []
            for (s, px, color) in [("putt", 112.0, Color(hex: "#ffb02e")), ("X", 128.0, Color(hex: "#ef7d6d"))] {
                let f = font(px), chars = Array(s.utf16)
                var glyphs = [CGGlyph](repeating: 0, count: chars.count)
                CTFontGetGlyphsForCharacters(f, chars, &glyphs, chars.count)
                var adv = [CGSize](repeating: .zero, count: glyphs.count)
                CTFontGetAdvancesForGlyphs(f, .horizontal, glyphs, &adv, glyphs.count)
                let one = CGMutablePath()
                for (i, gl) in glyphs.enumerated() {
                    if let gp = CTFontCreatePathForGlyph(f, gl, nil) {
                        // glyphs are drawn y-up: flip onto the baseline
                        one.addPath(gp, transform: CGAffineTransform(a: 1, b: 0, c: 0, d: -1, tx: pen, ty: 0))
                    }
                    pen += adv[i].width + 2 * k
                }
                parts.append((one, color))
            }
            // centred on x 580, sitting on y 196, in the sign layer's own frame
            let shift = CGAffineTransform(translationX: (580 - r[0]) * k - pen / 2, y: (196 - r[1]) * k)
            for (p, _) in parts {
                ctx.stroke(Path(p).applying(shift), with: .color(Color(hex: "#7a4a20")), style: StrokeStyle(lineWidth: 10 * k, lineJoin: .round))
            }
            for (p, c) in parts { ctx.fill(Path(p).applying(shift), with: .color(c)) }
        }
        .accessibilityLabel("PuttX")
    }
}
