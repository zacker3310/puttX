// The birdie tracker (src/game.js tallyHole, openTracker): a bird for each score under par, bigger
// birds for rarer ones, counted for life; a badge on the done card; and on each world's road a panel
// with the totals and every `crazy` hole of the world, marked with the best bird it has given up.
import SwiftUI
import PuttXCore

/// the web's bird drawings (BIRD_SVG), on a 64 x 64 grid
struct BirdIcon: View {
    let kind: String
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 64
            func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * k, y: y * k) }
            func oval(_ cx: CGFloat, _ cy: CGFloat, _ rx: CGFloat, _ ry: CGFloat) -> Path { Path(ellipseIn: CGRect(x: (cx - rx) * k, y: (cy - ry) * k, width: 2 * rx * k, height: 2 * ry * k)) }
            func tri(_ a: CGPoint, _ b: CGPoint, _ c: CGPoint) -> Path { Path { $0.addLines([a, b, c]); $0.closeSubpath() } }
            let ink = Color(hex: "#2f241a")
            switch kind {
            case "birdie":
                let blue = Color(hex: "#6fc0df"), deep = Color(hex: "#4a94b5")
                ctx.fill(oval(30, 38, 18, 13), with: .color(blue)); ctx.fill(oval(43, 24, 10, 10), with: .color(blue))
                ctx.fill(tri(p(51, 22), p(60, 25), p(51, 28)), with: .color(Color(hex: "#ffb347"))); ctx.fill(oval(45, 22, 2.5, 2.5), with: .color(ink))
                ctx.fill(Path { $0.move(to: p(16, 34)); $0.addQuadCurve(to: p(36, 36), control: p(28, 24)); $0.addQuadCurve(to: p(16, 34), control: p(26, 44)) }, with: .color(deep))
                ctx.fill(tri(p(13, 40), p(4, 34), p(6, 45)), with: .color(deep))
            case "eagle":
                ctx.fill(Path { $0.move(to: p(2, 26)); $0.addQuadCurve(to: p(30, 26), control: p(18, 10)); $0.addQuadCurve(to: p(62, 26), control: p(42, 10)); $0.addQuadCurve(to: p(40, 34), control: p(48, 24)); $0.addLine(to: p(24, 34)); $0.addQuadCurve(to: p(2, 26), control: p(16, 24)) }, with: .color(Color(hex: "#a8804e")))
                ctx.fill(oval(32, 38, 9, 12), with: .color(Color(hex: "#8a6538"))); ctx.fill(oval(32, 24, 7, 7), with: .color(Color(hex: "#fffdf7")))
                ctx.fill(tri(p(32, 26), p(38, 30), p(32, 32)), with: .color(Toy.yellow)); ctx.fill(oval(34, 22, 1.8, 1.8), with: .color(ink))
                ctx.fill(tri(p(27, 50), p(32, 58), p(37, 50)), with: .color(Color(hex: "#8a6538")))
            case "alb":
                let line = Color(hex: "#7d6bb8"), white = Color(hex: "#fffdf7")
                let wings = Path { $0.move(to: p(0, 30)); $0.addQuadCurve(to: p(28, 30), control: p(14, 22)); $0.addLine(to: p(36, 30)); $0.addQuadCurve(to: p(64, 30), control: p(50, 22)); $0.addQuadCurve(to: p(36, 36), control: p(50, 34)); $0.addLine(to: p(28, 36)); $0.addQuadCurve(to: p(0, 30), control: p(14, 34)) }
                ctx.fill(wings, with: .color(white)); ctx.stroke(wings, with: .color(line), lineWidth: 3 * k)
                ctx.fill(oval(32, 34, 10, 6), with: .color(white)); ctx.stroke(oval(32, 34, 10, 6), with: .color(line), lineWidth: 3 * k)
                ctx.fill(oval(42, 30, 5, 5), with: .color(white)); ctx.stroke(oval(42, 30, 5, 5), with: .color(line), lineWidth: 3 * k)
                ctx.fill(tri(p(46, 30), p(56, 32), p(46, 34)), with: .color(Toy.yellow))
            default: // ace: a flag over the cup and a ball, with a burst
                ctx.stroke(Path { $0.move(to: p(22, 58)); $0.addLine(to: p(22, 8)) }, with: .color(Toy.inkSoft), style: StrokeStyle(lineWidth: 5 * k, lineCap: .round))
                ctx.fill(tri(p(24, 9), p(54, 19), p(24, 29)), with: .color(Toy.red))
                ctx.fill(oval(34, 56, 20, 6), with: .color(Color(hex: "#5a4634")))
                ctx.fill(oval(44, 44, 8, 8), with: .color(Color(hex: "#fffdf7"))); ctx.stroke(oval(44, 44, 8, 8), with: .color(Toy.surfaceLine), lineWidth: 3 * k)
                ctx.stroke(Path { $0.move(to: p(50, 34)); $0.addLine(to: p(54, 28)); $0.move(to: p(44, 32)); $0.addLine(to: p(44, 25)); $0.move(to: p(38, 34)); $0.addLine(to: p(34, 28)) }, with: .color(Toy.yellow), style: StrokeStyle(lineWidth: 4 * k, lineCap: .round))
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityLabel(["birdie": "birdie", "eagle": "eagle", "alb": "albatross"][kind] ?? "hole in one")
    }
}

/// the done card's badge: the bird, then the score against par
struct BirdBadge: View {
    @Environment(\.stage) private var st
    let kind: String, diff: Int
    var body: some View {
        let (fill, rim): (Color, Color) = kind == "eagle" ? (Color(hex: "#f3e2c2"), Toy.woodDeep) : kind == "alb" ? (Color(hex: "#e6defa"), Color(hex: "#7d6bb8")) : (Toy.yellow, Toy.yellowLine)
        HStack(spacing: st.s(2)) {
            BirdIcon(kind: kind).frame(width: st.s(60), height: st.s(60))
            Text("\(diff)").font(Toy.font(30, st)).foregroundStyle(Toy.inkStrong)
        }
        .padding(.leading, st.s(4)).padding(.trailing, st.s(10)).padding(.vertical, st.s(4))
        .background(Capsule().fill(fill)).overlay(Capsule().strokeBorder(rim, lineWidth: st.s(4)))
        .popIn(0.45)
        .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.38) { if kind == "birdie" { SFX.star(2) } else { SFX.fanfare() } } }
    }
}

/// the world's trophy: totals for life, and every crazy hole of the world with its best bird
struct TrackerPanel: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    let world: Int
    let close: () -> Void
    var body: some View {
        let t = app.progress.tally
        ZStack {
            Toy.scrim.ignoresSafeArea().onTapGesture(perform: close)
            VStack(spacing: st.s(20)) {
                HStack(spacing: st.s(16)) {
                    ForEach(["birdie", "eagle", "alb", "ace"], id: \.self) { k in
                        HStack(spacing: st.s(10)) { BirdIcon(kind: k).frame(width: st.s(72), height: st.s(72)); Text("\(t[k] ?? 0)").font(Toy.font(48, st)).foregroundStyle(Toy.inkStrong) }
                            .frame(width: st.s(196), height: st.s(108))
                            .background(RoundedRectangle(cornerRadius: st.s(Toy.rLg)).fill(Toy.surface))
                            .overlay(RoundedRectangle(cornerRadius: st.s(Toy.rLg)).strokeBorder(Toy.surfaceLine, lineWidth: st.s(4)))
                            .accessibilityElement(children: .combine)
                    }
                }
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: st.s(12)), count: 6), spacing: st.s(12)) {
                    ForEach(cells, id: \.key) { c in cell(c) }
                }
                .frame(maxHeight: st.s(min(290, st.h - 380)), alignment: .top)
                .clipped()
                IconButton(symbol: "checkmark", kind: .go, label: "close", action: close)
            }
            .padding(st.s(30))
            .frame(width: st.s(900))
            .toyCard(st, radius: Toy.rXl)
            .popIn()
        }
    }
    private struct Cell { let key: String, course: Int, n: Int, par: Int, best: Int?, bird: String?, auto: Bool }
    private var cells: [Cell] {
        app.catalog.courses(ofWorld: world).enumerated().flatMap { ci, c in
            app.catalog.holes(course: c).enumerated().compactMap { i, h -> Cell? in
                guard h.data.crazy else { return nil }
                let r = app.progress.holes[h.key]
                let b = r.flatMap { r in r.best == 1 && PlayerProgress.bird(score: 1, par: h.par) == nil ? "ace" : PlayerProgress.bird(score: r.best, par: h.par) }
                return Cell(key: h.key, course: ci + 1, n: i + 1, par: h.par, best: r?.best, bird: b, auto: h.data.auto)
            }
        }
    }
    private func cell(_ c: Cell) -> some View {
        let shape = RoundedRectangle(cornerRadius: st.s(Toy.rLg))
        let (fill, rim): (Color, Color) = switch c.bird {
        case "birdie": (Color(hex: "#d7eef7"), Toy.blueLine)
        case "eagle": (Color(hex: "#f3e2c2"), Toy.woodDeep)
        case "alb": (Color(hex: "#e6defa"), Color(hex: "#7d6bb8"))
        case "ace": (Color(hex: "#fbd9d3"), Toy.redLine)
        default: (Toy.mute, Toy.muteLine)
        }
        return HStack(spacing: st.s(6)) {
            Text("\(c.n)").font(Toy.font(30, st)).foregroundStyle(Toy.inkStrong)
            if let b = c.bird { BirdIcon(kind: b).frame(width: st.s(52), height: st.s(52)) }
            else { Text(c.best.map { "\($0)/\(c.par)" } ?? "\(c.par)").font(Toy.font(20, st)).foregroundStyle(Toy.inkSoft) }
        }
        .frame(maxWidth: .infinity).frame(height: st.s(88))
        .background(shape.fill(fill))
        .overlay(shape.strokeBorder(rim, style: StrokeStyle(lineWidth: st.s(4), dash: c.auto ? [st.s(8), st.s(6)] : [])))
        .overlay(alignment: .topLeading) {
            HStack(spacing: st.s(3)) { ForEach(0..<c.course, id: \.self) { _ in Circle().fill(Toy.inkSoft).frame(width: st.s(8), height: st.s(8)) } }.padding(.leading, st.s(8)).padding(.top, st.s(6))
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("course \(c.course) hole \(c.n)" + (c.bird.map { ", \($0)" } ?? ""))
    }
}

/// the trophy on the world's road
struct TrophyGlyph: View {
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 64
            func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * k, y: y * k) }
            let cup = Path { $0.move(to: p(18, 8)); $0.addLine(to: p(46, 8)); $0.addLine(to: p(46, 22)); $0.addArc(center: p(32, 22), radius: 14 * k, startAngle: .degrees(0), endAngle: .degrees(180), clockwise: false); $0.closeSubpath() }
            ctx.fill(cup, with: .color(Toy.yellow)); ctx.stroke(cup, with: .color(Toy.yellowLine), lineWidth: 4 * k)
            ctx.stroke(Path { $0.move(to: p(18, 12)); $0.addLine(to: p(8, 12)); $0.addQuadCurve(to: p(20, 28), control: p(8, 26)); $0.move(to: p(46, 12)); $0.addLine(to: p(56, 12)); $0.addQuadCurve(to: p(44, 28), control: p(56, 26)) }, with: .color(Toy.yellowLine), lineWidth: 4 * k)
            let base = Path { $0.move(to: p(32, 36)); $0.addLine(to: p(32, 46)); $0.move(to: p(20, 56)); $0.addLine(to: p(44, 56)); $0.addLine(to: p(40, 46)); $0.addLine(to: p(24, 46)); $0.closeSubpath() }
            ctx.fill(base, with: .color(Toy.yellowLine)); ctx.stroke(base, with: .color(Toy.yellowLine), style: StrokeStyle(lineWidth: 4 * k, lineJoin: .round))
        }
        .aspectRatio(1, contentMode: .fit).accessibilityHidden(true)
    }
}
