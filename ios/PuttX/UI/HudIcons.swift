// The hole HUD's icons, drawn from the web's own SVGs (src/shell.html #hole) on a 64 x 64 grid, and
// the chips that hold them.
import SwiftUI
import PuttXCore

enum HudIcon {
    case hole, par, strokes, home, eye, ruler, arrowUp

    func draw(_ ctx: GraphicsContext, _ k: CGFloat) {
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * k, y: y * k) }
        func circle(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat) -> Path { Path(ellipseIn: CGRect(x: (x - r) * k, y: (y - r) * k, width: 2 * r * k, height: 2 * r * k)) }
        let line = { (w: CGFloat) in StrokeStyle(lineWidth: w * k, lineCap: .round, lineJoin: .round) }
        switch self {
        case .hole:
            ctx.fill(circle(32, 32, 24), with: .color(Color(hex: "#fffdf7")))
            ctx.stroke(circle(32, 32, 24), with: .color(Toy.surfaceLine), style: line(4))
            ctx.fill(circle(32, 32, 6), with: .color(Toy.surfaceLine))
        case .par:
            ctx.fill(Path(ellipseIn: CGRect(x: 14 * k, y: 51 * k, width: 36 * k, height: 10 * k)), with: .color(.black.opacity(0.55)))
            ctx.stroke(Path { $0.move(to: p(20, 56)); $0.addLine(to: p(20, 8)) }, with: .color(Toy.inkSoft), style: line(5))
            ctx.fill(Path { $0.move(to: p(22, 9)); $0.addLine(to: p(50, 18)); $0.addLine(to: p(22, 27)); $0.closeSubpath() }, with: .color(Toy.red))
        case .strokes:
            ctx.stroke(Path { $0.move(to: p(44, 6)); $0.addLine(to: p(24, 48)) }, with: .color(Toy.inkSoft), style: line(6))
            ctx.fill(Path(roundedRect: CGRect(x: 10 * k, y: 44 * k, width: 24 * k, height: 12 * k), cornerRadius: 5 * k), with: .color(Toy.blue))
        case .home:
            // a chrome house, its doorway lit
            let house = Path { $0.addLines([p(10, 30), p(32, 10), p(54, 30), p(54, 54), p(10, 54)]); $0.closeSubpath() }
            ctx.fill(house, with: .linearGradient(Gradient(colors: [Color(hex: "#f4f6fa"), Color(hex: "#a9b0bc"), Color(hex: "#6b727e")]), startPoint: p(32, 10), endPoint: p(32, 54)))
            ctx.stroke(house, with: .color(.black.opacity(0.6)), style: line(2.5))
            ctx.fill(Path(roundedRect: CGRect(x: 25 * k, y: 36 * k, width: 14 * k, height: 18 * k), cornerRadius: 3 * k), with: .linearGradient(Gradient(colors: [Color(hex: "#ffd36b"), Color(hex: "#ff7a1a")]), startPoint: p(32, 36), endPoint: p(32, 54)))
        case .eye:
            let lens = Path { $0.move(to: p(4, 32)); $0.addQuadCurve(to: p(60, 32), control: p(32, 6)); $0.addQuadCurve(to: p(4, 32), control: p(32, 58)); $0.closeSubpath() }
            ctx.fill(lens, with: .color(Color(hex: "#fffdf7"))); ctx.stroke(lens, with: .color(Toy.inkSoft), style: line(5))
            ctx.fill(circle(32, 32, 10), with: .color(Toy.blue)); ctx.fill(circle(32, 32, 4), with: .color(Color(hex: "#101216")))
        case .ruler:
            let r = Path(roundedRect: CGRect(x: 6 * k, y: 22 * k, width: 52 * k, height: 20 * k), cornerRadius: 4 * k)
            ctx.fill(r, with: .color(Toy.yellow)); ctx.stroke(r, with: .color(Toy.inkDark), style: line(4))
            for (x, l) in [(16.0, 32.0), (26, 28), (36, 32), (46, 28)] {
                ctx.stroke(Path { $0.move(to: p(x, 22)); $0.addLine(to: p(x, l)) }, with: .color(Toy.inkDark), style: line(3))
            }
        case .arrowUp:
            ctx.fill(Path { $0.addLines([p(32, 10), p(50, 34), p(38, 34), p(38, 54), p(26, 54), p(26, 34), p(14, 34)]); $0.closeSubpath() }, with: .color(Toy.green))
        }
    }
}

struct HudIconView: View {
    let icon: HudIcon
    var body: some View {
        Canvas { ctx, size in icon.draw(ctx, min(size.width, size.height) / 64) }.aspectRatio(1, contentMode: .fit)
    }
}

/// a HUD chip: an icon and a numeral on a cream pill, 76 stage px tall
struct HudChip: View {
    @Environment(\.stage) private var st
    let icon: HudIcon
    let value: String
    var body: some View {
        HStack(spacing: st.s(10)) {
            HudIconView(icon: icon).frame(width: st.s(48), height: st.s(48))
            Text(value).font(Toy.font(44, st)).foregroundStyle(Toy.inkStrong)
        }
        .padding(.leading, st.s(14)).padding(.trailing, st.s(22))
        .frame(height: st.s(76))
        .toyCard(st, radius: Toy.rLg)
    }
}

/// the distance tag over the cup: a ruler, the metres, and how far up or down the cup sits
struct PinTag: View {
    @Environment(\.stage) private var st
    let metres: Double
    let riseCm: Int
    var body: some View {
        HStack(spacing: st.s(4)) {
            HudIconView(icon: .ruler).frame(width: st.s(34), height: st.s(34))
            Text(String(format: "%.1f", metres)).font(Toy.font(30, st)).foregroundStyle(Toy.inkStrong)
            if abs(riseCm) >= 2 {
                HudIconView(icon: .arrowUp).frame(width: st.s(26), height: st.s(26))
                    .scaleEffect(x: 1, y: riseCm < 0 ? -1 : 1)
                    .colorMultiply(riseCm < 0 ? Toy.red : .white)
                Text("\(abs(riseCm))").font(Toy.font(22, st)).foregroundStyle(Toy.inkSoft)
            }
        }
        .padding(.leading, st.s(6)).padding(.trailing, st.s(12))
        .frame(height: st.s(44))
        .background(Capsule().fill(Toy.surface.opacity(0.95)))
        .overlay(Capsule().strokeBorder(Toy.surfaceLine, lineWidth: st.s(3)))
        .accessibilityLabel(String(format: "%.1f metres to the cup", metres))
    }
}

/// the last shot (src/shell.html #shotPanel): where the ball started against the aim (the marker drifts
/// the way the ball did; the green notch is dead on), and the power
struct ShotPanel: View {
    @Environment(\.stage) private var st
    let stroke: Stroke
    var body: some View {
        let k = max(-1, min(1, -stroke.turn / 6)), t = abs(stroke.turn)
        let dot = t < 0.75 ? Toy.green : t < 2.5 ? Toy.yellow : Toy.red
        HStack(spacing: st.s(16)) {
            Canvas { ctx, size in
                let s = size.width / 220
                let track = Path(roundedRect: CGRect(x: 8 * s, y: 22 * s, width: 204 * s, height: 16 * s), cornerRadius: 8 * s)
                ctx.fill(track, with: .color(Toy.surface2)); ctx.stroke(track, with: .color(Toy.surfaceLine), lineWidth: 3 * s)
                ctx.fill(Path(CGRect(x: 98 * s, y: 22 * s, width: 24 * s, height: 16 * s)), with: .color(Color(hex: "#cdeac6")))
                ctx.stroke(Path { $0.move(to: CGPoint(x: 110 * s, y: 8 * s)); $0.addLine(to: CGPoint(x: 110 * s, y: 52 * s)) }, with: .color(Toy.inkSoft), style: StrokeStyle(lineWidth: 3 * s, lineCap: .round))
                let c = CGRect(x: (110 + k * 92 - 12) * s, y: 18 * s, width: 24 * s, height: 24 * s)
                ctx.fill(Path(ellipseIn: c), with: .color(dot)); ctx.stroke(Path(ellipseIn: c), with: .color(.white), lineWidth: 4 * s)
            }
            .frame(width: st.s(220), height: st.s(60))
            Text("\(Int((stroke.power * 100).rounded()))").font(Toy.font(44, st)).foregroundStyle(Toy.inkStrong)
        }
        .padding(.horizontal, st.s(22)).padding(.vertical, st.s(4))
        .frame(height: st.s(84))
        .toyCard(st, radius: Toy.rLg)
        .accessibilityLabel("power \(Int((stroke.power * 100).rounded()))")
    }
}
