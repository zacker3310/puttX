// The extras on screen (src/shell.html section 15): the mulligan button and its token count, the pop
// when the gold lost ball is picked up, the three goals on the done card, and the daily-hole ticket
// on the title. Drawn from the web's own SVGs on a 64 x 64 grid. No words: icons and numerals.
import SwiftUI
import PuttXCore

enum ExtraIcon {
    case mulligan, bird, noWalls, goldBall, sun, flame, check, target

    func draw(_ ctx: GraphicsContext, _ k: CGFloat, ink: Color = Toy.inkSoft) {
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * k, y: y * k) }
        func circle(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat) -> Path { Path(ellipseIn: CGRect(x: (x - r) * k, y: (y - r) * k, width: 2 * r * k, height: 2 * r * k)) }
        let line = { (w: CGFloat) in StrokeStyle(lineWidth: w * k, lineCap: .round, lineJoin: .round) }
        switch self {
        case .mulligan:
            // an arrow curling back round
            ctx.stroke(Path { $0.addArc(center: p(32, 31), radius: 18 * k, startAngle: .degrees(-152), endAngle: .degrees(153), clockwise: false) }, with: .color(.white), style: line(7))
            ctx.stroke(Path { $0.addLines([p(8, 12), p(18, 24), p(30, 16)]) }, with: .color(.white), style: line(7))
        case .bird:
            ctx.fill(Path(ellipseIn: CGRect(x: 10 * k, y: 24 * k, width: 40 * k, height: 28 * k)), with: .color(ink))
            ctx.fill(circle(44, 22, 11), with: .color(ink))
            ctx.fill(Path { $0.addLines([p(53, 20), p(62, 24), p(53, 27)]); $0.closeSubpath() }, with: .color(Toy.red))
            ctx.fill(circle(46, 20, 2.6), with: .color(Color(hex: "#fffdf7")))
            ctx.fill(Path { $0.move(to: p(14, 34)); $0.addQuadCurve(to: p(34, 36), control: p(26, 26)); $0.addQuadCurve(to: p(14, 34), control: p(24, 44)) }, with: .color(Color(hex: "#fffdf7").opacity(0.55)))
            ctx.fill(Path { $0.addLines([p(10, 38), p(2, 32), p(4, 42)]); $0.closeSubpath() }, with: .color(ink))
        case .noWalls:
            for r in [(8.0, 14.0, 20.0), (32, 14, 24), (8, 30, 28), (40, 30, 16)] {
                ctx.fill(Path(roundedRect: CGRect(x: r.0 * k, y: r.1 * k, width: r.2 * k, height: 12 * k), cornerRadius: 2 * k), with: .color(ink))
            }
            let slash = Path { $0.move(to: p(8, 56)); $0.addLine(to: p(56, 6)) }
            ctx.stroke(slash, with: .color(Color(hex: "#fffdf7")), style: line(10))
            ctx.stroke(slash, with: .color(Color(hex: "#c95a4c")), style: line(5))
        case .goldBall:
            ctx.fill(circle(32, 34, 22), with: .color(Toy.yellowDown))
            ctx.fill(circle(32, 30, 22), with: .color(Toy.yellow))
            ctx.stroke(circle(32, 30, 22), with: .color(Toy.yellowLine), style: line(4))
            for (x, y) in [(25.0, 24.0), (37, 22), (31, 33), (41, 34), (23, 36)] { ctx.fill(circle(x, y, 3), with: .color(Toy.yellowLine)) }
        case .sun:
            let rays = Path { for (a, b) in [((32.0, 3.0), (32.0, 10.0)), ((32, 54), (32, 61)), ((3, 32), (10, 32)), ((54, 32), (61, 32)), ((11, 11), (16, 16)), ((48, 48), (53, 53)), ((11, 53), (16, 48)), ((48, 16), (53, 11))] { $0.move(to: p(a.0, a.1)); $0.addLine(to: p(b.0, b.1)) } }
            ctx.stroke(rays, with: .color(Toy.yellowLine), style: line(5))
            ctx.fill(circle(32, 32, 17), with: .color(Toy.yellow))
            ctx.stroke(circle(32, 32, 17), with: .color(Toy.yellowLine), style: line(4))
        case .flame:
            ctx.fill(Path {
                $0.move(to: p(34, 4)); $0.addCurve(to: p(50, 42), control1: p(38, 18), control2: p(52, 24))
                $0.addArc(center: p(32, 42), radius: 18 * k, startAngle: .degrees(0), endAngle: .degrees(180), clockwise: false)
                $0.addCurve(to: p(22, 18), control1: p(13, 32), control2: p(20, 26))
                $0.addCurve(to: p(30, 26), control1: p(26, 26), control2: p(30, 26))
                $0.addCurve(to: p(34, 4), control1: p(28, 18), control2: p(30, 10)); $0.closeSubpath()
            }, with: .color(Color(hex: "#ff8a3d")))
            ctx.fill(Path {
                $0.move(to: p(33, 30)); $0.addCurve(to: p(40, 48), control1: p(36, 38), control2: p(42, 40))
                $0.addArc(center: p(32, 48), radius: 8 * k, startAngle: .degrees(0), endAngle: .degrees(180), clockwise: false)
                $0.addCurve(to: p(33, 30), control1: p(24, 42), control2: p(30, 40)); $0.closeSubpath()
            }, with: .color(Toy.yellow))
        case .target:
            ctx.fill(circle(32, 32, 26), with: .color(Color(hex: "#fffdf7")))
            ctx.stroke(circle(32, 32, 26), with: .color(Toy.red), style: line(6))
            ctx.stroke(circle(32, 32, 15), with: .color(Toy.red), style: line(6))
            ctx.fill(circle(32, 32, 5), with: .color(Toy.red))
        case .check:
            ctx.stroke(Path { $0.addLines([p(14, 33), p(27, 46), p(51, 19)]) }, with: .color(.white), style: line(9))
        }
    }
}

struct ExtraIconView: View {
    let icon: ExtraIcon
    var ink: Color = Toy.inkSoft
    var body: some View {
        Canvas { ctx, size in icon.draw(ctx, min(size.width, size.height) / 64, ink: ink) }.aspectRatio(1, contentMode: .fit)
    }
}

/// take the last putt back for a token: blue, with the tokens left on a badge (practice: infinite)
struct MulliganButton: View {
    @Environment(\.stage) private var st
    /// tokens left; nil in practice (free)
    let tokens: Int?
    let action: () -> Void
    var body: some View {
        Button(action: action) { ExtraIconView(icon: .mulligan).frame(width: st.s(52), height: st.s(52)) }
            .buttonStyle(ToyButtonStyle(kind: .blue))
            .overlay(alignment: .bottomTrailing) {
                Text(tokens.map { "\($0)" } ?? "\u{221E}").font(Toy.font(20, st)).foregroundStyle(Toy.inkStrong)
                    .frame(minWidth: st.s(34), minHeight: st.s(34)).padding(.horizontal, st.s(4))
                    .background(Capsule().fill(Toy.surface)).overlay(Capsule().strokeBorder(Toy.blueLine, lineWidth: st.s(3)))
                    .offset(x: st.s(10), y: st.s(10))
                    .allowsHitTesting(false)
            }
            .accessibilityLabel("take the last putt back" + (tokens.map { ", \($0) left" } ?? ""))
    }
}

/// the gold lost ball, just found: it and a "+1" token
struct LostPop: View {
    @Environment(\.stage) private var st
    var body: some View {
        HStack(spacing: st.s(8)) {
            ExtraIconView(icon: .goldBall).frame(width: st.s(52), height: st.s(52))
            Text("+1").font(Toy.font(40, st)).foregroundStyle(Toy.inkStrong)
        }
        .padding(.leading, st.s(12)).padding(.trailing, st.s(20)).frame(height: st.s(76))
        .background(Capsule().fill(Toy.surface))
        .overlay(Capsule().strokeBorder(Toy.surfaceLine, lineWidth: st.s(4)))
        .background(Capsule().fill(Toy.shadow.opacity(0.14)).offset(y: st.s(6)))
        .popIn()
        .accessibilityLabel("lost ball found")
    }
}

/// the hole's three goals on the done card: under par, no walls, the lost ball. Met ones turn yellow;
/// ones met for the first time pop in
struct GoalsRow: View {
    @Environment(\.stage) private var st
    let all: Int, fresh: Int
    var body: some View {
        HStack(spacing: st.s(22)) {
            ForEach(0..<3, id: \.self) { i in
                let on = all & (1 << i) != 0, new = fresh & (1 << i) != 0
                let icon: ExtraIcon = [.bird, .noWalls, .goldBall][i]
                ExtraIconView(icon: icon, ink: on ? Toy.inkStrong : Toy.inkSoft).frame(width: st.s(40), height: st.s(40))
                    .frame(width: st.s(64), height: st.s(64))
                    .background(Circle().fill(on ? Toy.yellow : Toy.mute))
                    .overlay(Circle().strokeBorder(on ? Toy.yellowLine : Toy.muteLine, lineWidth: st.s(4)))
                    .opacity(on ? 1 : 0.6)
                    .modifier(MaybePop(on: new, delay: 0.5))
                    .accessibilityLabel(["under par", "no walls", "lost ball"][i] + (on ? ", done" : ""))
            }
        }
        .accessibilityElement(children: .contain)
    }
}
private struct MaybePop: ViewModifier {
    let on: Bool, delay: Double
    func body(content: Content) -> some View { if on { content.popIn(delay) } else { content } }
}

/// the hole of the day, a ticket on the title: today's course and hole, the streak, a stamp once
/// played today; a slowly turning sun on its corner
struct DailyButton: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var turn = false
    var body: some View {
        let d = app.dailyToday, c = Catalog.course(of: d.key), n = Catalog.number(of: d.key), w = app.catalog.world(of: c)
        let shape = RoundedRectangle(cornerRadius: st.s(22), style: .continuous)
        Button { app.playDaily() } label: {
            HStack(spacing: st.s(8)) {
                Group {
                    if c == Catalog.classic { Glyph.classic.image.resizable().scaledToFit() }
                    else if c == Catalog.bonus { Glyph.bonus.image.resizable().scaledToFit() }
                    else { app.looks[w].iconImage?.resizable().scaledToFit() }
                }
                .padding(st.s(8)).frame(width: st.s(70), height: st.s(70))
                .background(Circle().fill(Color(hex: "#fffdf7"))).overlay(Circle().strokeBorder(Toy.yellowLine, lineWidth: st.s(4)))
                VStack(spacing: st.s(6)) {
                    Text("\(n)").font(Toy.font(40, st)).foregroundStyle(Toy.inkStrong)
                    if !app.catalog.isExtra(c) {
                        let k = (app.catalog.courses(ofWorld: w).firstIndex(of: c) ?? 0) + 1
                        HStack(spacing: st.s(4)) { ForEach(0..<k, id: \.self) { _ in Circle().fill(Toy.inkSoft).frame(width: st.s(9), height: st.s(9)) } }
                    }
                }
                Spacer(minLength: 0)
                if let s = d.streak {
                    HStack(spacing: st.s(2)) { ExtraIconView(icon: .flame).frame(width: st.s(34), height: st.s(34)); Text("\(s)").font(Toy.font(28, st)).foregroundStyle(Toy.inkStrong) }
                }
            }
            .padding(.leading, st.s(10)).padding(.trailing, st.s(16))
            .frame(width: st.s(236), height: st.s(112))
            .background(shape.fill(LinearGradient(colors: [Color(hex: "#ffe9a3"), Toy.yellow], startPoint: .top, endPoint: .bottom)))
            .overlay(shape.strokeBorder(Toy.yellowLine, lineWidth: st.s(5)))
            // the ticket's notches
            .overlay(alignment: .leading) { Circle().fill(Color(hex: "#7bc463")).frame(width: st.s(22), height: st.s(22)).offset(x: -st.s(13)) }
            .overlay(alignment: .trailing) { Circle().fill(Color(hex: "#3f6a5a")).frame(width: st.s(22), height: st.s(22)).offset(x: st.s(13)) }
            .overlay(alignment: .topLeading) {
                ExtraIconView(icon: .sun).frame(width: st.s(64), height: st.s(64))
                    .rotationEffect(.degrees(turn ? 360 : 0))
                    .offset(x: -st.s(26), y: -st.s(30))
            }
            .overlay(alignment: .topTrailing) {
                if d.best != nil {
                    ExtraIconView(icon: .check).frame(width: st.s(50), height: st.s(50))
                        .background(Circle().fill(Toy.green)).overlay(Circle().strokeBorder(Toy.greenLine, lineWidth: st.s(4)))
                        .rotationEffect(.degrees(12)).offset(x: st.s(14), y: -st.s(16))
                }
            }
            .background(shape.fill(Toy.yellowDown).offset(y: st.s(7)))
        }
        .buttonStyle(PressDown())
        .accessibilityLabel("hole of the day" + (d.streak.map { ", \($0) days in a row" } ?? ""))
        .onAppear { if !reduceMotion { withAnimation(.linear(duration: 14).repeatForever(autoreverses: false)) { turn = true } } }
    }
}

/// the replay's tag: a ball in a ring, on red
struct ReplayTag: View {
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 64
            ctx.fill(Path(ellipseIn: CGRect(x: 0, y: 0, width: 64 * k, height: 64 * k)), with: .color(Toy.red))
            ctx.fill(Path(ellipseIn: CGRect(x: 18 * k, y: 18 * k, width: 28 * k, height: 28 * k)), with: .color(.white))
            ctx.stroke(Path(ellipseIn: CGRect(x: 8 * k, y: 8 * k, width: 48 * k, height: 48 * k)), with: .color(.white), lineWidth: 5 * k)
        }
        .aspectRatio(1, contentMode: .fit).accessibilityLabel("replay")
    }
}

/// the slope read: a hill with arrows running down it
struct ReadGlyph: View {
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 64
            func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * k, y: y * k) }
            ctx.stroke(Path { $0.move(to: p(8, 44)); $0.addQuadCurve(to: p(56, 44), control: p(32, 20)) }, with: .color(Toy.green), style: StrokeStyle(lineWidth: 6 * k, lineCap: .round))
            ctx.stroke(Path { $0.addLines([p(20, 22), p(14, 34), p(26, 32)]); $0.move(to: p(44, 22)); $0.addLines([p(44, 22), p(50, 34), p(38, 32)]) }, with: .color(Color(hex: "#5a4634")), style: StrokeStyle(lineWidth: 5 * k, lineCap: .round, lineJoin: .round))
        }
        .aspectRatio(1, contentMode: .fit).accessibilityHidden(true)
    }
}
/// show me the line: a dashed green ball with a question mark
struct GuideGlyph: View {
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 64
            func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * k, y: y * k) }
            let c = Path(ellipseIn: CGRect(x: 10 * k, y: 16 * k, width: 40 * k, height: 40 * k))
            ctx.fill(c, with: .color(Color(hex: "#cdeac6"))); ctx.stroke(c, with: .color(Toy.green), style: StrokeStyle(lineWidth: 5 * k, dash: [7 * k, 5 * k]))
            ctx.stroke(Path { $0.move(to: p(25, 30)); $0.addQuadCurve(to: p(32, 22), control: p(25, 22)); $0.addQuadCurve(to: p(39, 29), control: p(39, 22)); $0.addQuadCurve(to: p(32, 36), control: p(39, 34)); $0.addLine(to: p(32, 41)) }, with: .color(Color(hex: "#3f7a3a")), style: StrokeStyle(lineWidth: 5 * k, lineCap: .round))
            ctx.fill(Path(ellipseIn: CGRect(x: 28.5 * k, y: 45.5 * k, width: 7 * k, height: 7 * k)), with: .color(Color(hex: "#3f7a3a")))
        }
        .aspectRatio(1, contentMode: .fit).accessibilityHidden(true)
    }
}
