// The pro shop (src/shop.js renderShop): three tabs (putters, balls, mulligan packs), a page of cards
// at a time (arrows, dots, or a swipe), and a preview where the picked item turns in a little 3D
// studio over its stats: a putter's three forgiveness bars against the one you carry, a ball's
// colours. One big button buys (coins, a lock when short) or equips. Wordless.
import SwiftUI
import RealityKit
import Combine
import PuttXCore

struct ShopView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    enum Tab: Hashable { case putter, ball, mull }
    @State private var tab: Tab = .putter
    @State private var sel: [Tab: String] = [:]
    @State private var page: [Tab: Int] = [:]
    @State private var nudge = 0
    @State private var shake = 0
    private let shop = Shop.shared
    // the layout reflows to the stage (never scaled below it, so every button stays at least 64 pt):
    // the grid takes the width the preview leaves, two rows of as many columns as fit
    private var gridW: CGFloat { min(756, st.w - 444) }
    private var gridH: CGFloat { st.h - 248 }
    private func cols(_ t: Tab) -> Int { t == .putter ? min(5, max(3, Int(gridW / 140))) : t == .ball ? min(6, max(4, Int(gridW / 116))) : 3 }
    private func perOf(_ t: Tab) -> Int { t == .mull ? 3 : cols(t) * 2 }
    private var per: Int { perOf(tab) }
    private var ids: [String] { tab == .putter ? shop.putters.map(\.id) : tab == .ball ? shop.balls.map(\.id) : shop.packs.map(\.id) }
    private var pages: Int { max(1, (ids.count + per - 1) / per) }
    private var current: String {
        sel[tab] ?? (tab == .mull ? "m10" : app.progress.equipped[tab == .putter ? "putter" : "ball"] ?? "")
    }

    var body: some View {
        ZStack {
            // the shop stands out in the first world, under its striped awning
            WorldScene(look: app.look(app.catalog.allCourses[0]), horizon: 0.82).ignoresSafeArea()
            ZStack(alignment: .topLeading) {
                Color.clear
                awning.frame(width: st.s(400), height: st.s(100)).offset(x: st.s(436))
                Button { app.go(.worlds) } label: { HudIconView(icon: .home).frame(width: st.s(48), height: st.s(48)) }
                    .buttonStyle(ToyButtonStyle()).accessibilityLabel("back").offset(x: st.s(24), y: st.s(24))
                ForEach(Array([Tab.putter, .ball, .mull].enumerated()), id: \.element) { i, t in
                    Button { pick(t) } label: { tabIcon(t).frame(width: st.s(56), height: st.s(56)) }
                        .buttonStyle(ToyButtonStyle(kind: tab == t ? .yellow : .plain))
                        .accessibilityLabel(["putters", "balls", "mulligans"][i])
                        .accessibilityAddTraits(tab == t ? .isSelected : [])
                        .offset(x: st.s(128 + 100 * CGFloat(i)), y: st.s(24))
                }
                wallet.frame(width: st.s(400), alignment: .trailing).offset(x: st.s(st.w - 24 - 400), y: st.s(30))
                stage.frame(width: st.s(372), height: st.s(st.h - 152)).offset(x: st.s(24), y: st.s(128))
                grid.frame(width: st.s(gridW), height: st.s(gridH), alignment: .top).offset(x: st.s(420), y: st.s(128))
                if pages > 1 { pager.frame(width: st.s(gridW)).offset(x: st.s(420), y: st.s(st.h - 104)) }
            }
            .frame(width: st.s(st.w), height: st.s(st.h))
        }
        .onAppear { for (t, k) in [(Tab.putter, "putter"), (.ball, "ball")] { let id = app.progress.equipped[k] ?? ""; sel[t] = id; page[t] = pageOf(t, id) } }
    }

    /// the preview panel's parts on a short stage: the stats give a little, the studio the rest
    private var cardH: CGFloat { min(214, (gridH - 16) / 2 - 8) }
    private var statsH: CGFloat { min(150, max(100, st.h - 152 - 262 - 100)) }
    private var previewH: CGFloat { max(100, min(230, st.h - 152 - 162 - statsH)) }

    // MARK: pieces
    private var awning: some View {
        Canvas { ctx, size in
            let w = size.width / 10
            for i in 0..<10 {
                let c = i % 2 == 0 ? Toy.red : Color(hex: "#fff8ec")
                ctx.fill(Path(CGRect(x: CGFloat(i) * w, y: 0, width: w, height: size.height * 0.64)), with: .color(c))
                ctx.fill(Path(ellipseIn: CGRect(x: CGFloat(i) * w, y: size.height * 0.64 - w / 2, width: w, height: w)), with: .color(c))
            }
            // the canvas catches the light along its top
            ctx.fill(Path(CGRect(x: 0, y: 0, width: size.width, height: size.height * 0.3)), with: .linearGradient(Gradient(colors: [.white.opacity(0.35), .white.opacity(0)]), startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height * 0.3)))
        }
        .shadow(color: Toy.shadow.opacity(0.3), radius: st.s(6), y: st.s(8))
        .allowsHitTesting(false).accessibilityHidden(true)
    }
    private var wallet: some View {
        HStack(spacing: st.s(8)) {
            Glyph.coin.image.resizable().scaledToFit().frame(width: st.s(50), height: st.s(50))
            Text("\(app.progress.coins)").font(Toy.font(40, st)).foregroundStyle(Toy.inkStrong)
            Token().frame(width: st.s(50), height: st.s(50)).padding(.leading, st.s(10))
            Text("\(app.progress.mulligans)").font(Toy.font(40, st)).foregroundStyle(Toy.inkStrong)
        }
        .padding(.horizontal, st.s(18)).frame(height: st.s(76))
        .background(ZStack { Capsule().fill(Toy.surface); Gloss(shape: Capsule()).padding(st.s(4)) })
        .overlay(Capsule().strokeBorder(Toy.surfaceLine, lineWidth: st.s(4)))
        .shadow(color: Toy.shadow.opacity(0.28), radius: st.s(8), y: st.s(9))
        .modifier(Shake(n: shake))
        .accessibilityElement(children: .ignore).accessibilityLabel("\(app.progress.coins) coins, \(app.progress.mulligans) mulligans")
    }
    @ViewBuilder private func tabIcon(_ t: Tab) -> some View {
        switch t {
        case .putter: Canvas { ctx, s in
            let k = s.width / 64
            ctx.stroke(Path { $0.move(to: CGPoint(x: 44 * k, y: 6 * k)); $0.addLine(to: CGPoint(x: 26 * k, y: 46 * k)) }, with: .color(Toy.inkSoft), style: StrokeStyle(lineWidth: 5 * k, lineCap: .round))
            ctx.fill(Path(roundedRect: CGRect(x: 8 * k, y: 42 * k, width: 30 * k, height: 14 * k), cornerRadius: 4 * k), with: .color(Color(hex: "#c9ced6")))
        }
        case .ball: Canvas { ctx, s in
            let k = s.width / 64, c = Path(ellipseIn: CGRect(x: 8 * k, y: 8 * k, width: 48 * k, height: 48 * k))
            ctx.fill(c, with: .color(Color(hex: "#fffdf7"))); ctx.stroke(c, with: .color(Toy.surfaceLine), lineWidth: 4 * k)
            ctx.clip(to: c); ctx.fill(Path(CGRect(x: 0, y: 32 * k, width: 64 * k, height: 8 * k)), with: .color(Toy.yellow))
        }
        case .mull: Token()
        }
    }

    /// the preview: the item turning in the studio, its stats, and the buy or equip button
    private var stage: some View {
        let shape = RoundedRectangle(cornerRadius: st.s(Toy.rXl), style: .continuous)
        return ZStack(alignment: .top) {
            shape.fill(Toy.surface)
            VStack(spacing: 0) {
                Group {
                    if tab == .mull, let pk = shop.packs.first(where: { $0.id == current }) { PackArt(n: pk.n) }
                    else { ShopPreview(id: current, ball: app.progress.equipped["ball"] ?? "b1").id(current + (app.progress.equipped["ball"] ?? "")) }
                }
                .frame(width: st.s(340), height: st.s(previewH))
                .background(RadialGradient(colors: [Color(hex: "#ffffff"), Color(hex: "#d6eef6"), Color(hex: "#a9d3e3")], center: UnitPoint(x: 0.5, y: 0.25), startRadius: 0, endRadius: st.s(260)))
                .clipShape(RoundedRectangle(cornerRadius: st.s(Toy.rLg), style: .continuous))
                .scaleEffect(nudge % 2 == 1 ? 1.03 : 1)
                .padding(.top, st.s(10))
                stats.frame(height: st.s(statsH)).padding(.horizontal, st.s(24)).padding(.top, st.s(12))
                Spacer(minLength: 0)
                action.padding(st.s(22))
            }
        }
        .overlay(shape.strokeBorder(Toy.surfaceLine, lineWidth: st.s(5)))
        .background(shape.fill(Toy.surfaceDown).offset(y: st.s(6)))
        .shadow(color: Toy.shadow.opacity(0.3), radius: st.s(12), y: st.s(12))
    }
    @ViewBuilder private var stats: some View {
        if tab == .putter, let it = shop.putter(current), let eq = shop.putter(app.progress.equipped["putter"] ?? "p1") {
            VStack(spacing: st.s(8)) {
                ForEach(0..<3, id: \.self) { k in
                    let lv = it.f[k] + 1, was = eq.f[k] + 1
                    HStack(spacing: st.s(14)) {
                        StatIcon(k: k).frame(width: st.s(44), height: st.s(44))
                        HStack(spacing: st.s(8)) {
                            ForEach(1...5, id: \.self) { n in
                                let on = n <= lv, up = on && n > was, down = !on && n <= was
                                Capsule().fill(on ? (up ? Toy.blue : Toy.green) : Toy.surface2)
                                    .overlay(Capsule().strokeBorder(down ? Toy.red : on ? .clear : Toy.surfaceLine, lineWidth: st.s(3)))
                                    .overlay(alignment: .bottom) { if on { Capsule().fill(up ? Toy.blueLine : Toy.greenLine).frame(height: st.s(5)) } }
                                    .frame(height: st.s(22))
                            }
                        }
                    }
                    .accessibilityElement(children: .ignore).accessibilityLabel("forgiveness \(lv) of 5")
                }
            }
        } else if tab == .ball, let b = shop.ball(current) {
            let sw = b.pat == "rainbow" || b.pat == "holo" ? ["#ef7d6d", "#ffd66e", "#74c465", "#6fc0df"] : [b.base, b.band, b.mark]
            VStack(spacing: st.s(10)) {
                HStack(spacing: st.s(18)) {
                    ForEach(sw, id: \.self) { c in
                        Circle().fill(Color(hex: c)).overlay(Circle().strokeBorder(Toy.surfaceLine, lineWidth: st.s(5))).frame(width: st.s(62), height: st.s(62))
                    }
                }
                if b.price >= shop.premium { HStack(spacing: st.s(10)) { ForEach(0..<3, id: \.self) { _ in Sparkle().frame(width: st.s(34), height: st.s(34)) } } }
            }
            .accessibilityElement(children: .ignore).accessibilityLabel("colours")
        } else if tab == .mull, let pk = shop.packs.first(where: { $0.id == current }) {
            let now = app.progress.mulligans
            HStack(spacing: st.s(8)) {
                Token().frame(width: st.s(52), height: st.s(52)); Text("\(now)")
                Image(systemName: "arrow.right").foregroundStyle(Toy.inkSoft).padding(.horizontal, st.s(6))
                Token().frame(width: st.s(52), height: st.s(52)); Text("\(min(9999, now + pk.n))").foregroundStyle(Toy.blueLine)
            }
            .font(Toy.font(48, st)).foregroundStyle(Toy.inkStrong)
        }
    }
    private var action: some View {
        let id = current, own = app.progress.owned.contains(id)
        let eq = app.progress.equipped.values.contains(id)
        let price = tab == .mull ? shop.packs.first { $0.id == id }?.price ?? 0 : shop.price(id) ?? 0
        let poor = !own && app.progress.coins < price
        let kind: ToyKind = tab != .mull && eq ? .yellow : tab != .mull && own ? .plain : poor ? .locked : .go
        return Button { act(id, price: price) } label: {
            HStack(spacing: st.s(12)) {
                if tab != .mull && (own || eq) { Image(systemName: "checkmark").font(.system(size: st.s(48), weight: .black)) }
                else {
                    Glyph.coin.image.resizable().scaledToFit().frame(width: st.s(60), height: st.s(60))
                    Text("\(price)").font(Toy.font(48, st))
                    if poor { Glyph.lock.image.resizable().scaledToFit().frame(width: st.s(40), height: st.s(40)) }
                }
            }
            .frame(maxWidth: .infinity).frame(height: st.s(96))
        }
        .buttonStyle(ToyButtonStyle(kind: kind))
        .modifier(Shake(n: poor ? shake : 0))
        .accessibilityLabel(tab == .mull ? "buy for \(price)" : eq ? "equipped" : own ? "equip" : "buy for \(price)")
    }

    private var grid: some View {
        let cols = Array(repeating: GridItem(.flexible(), spacing: st.s(tab == .ball ? 10 : 14)), count: cols(tab))
        let pg = min(page[tab] ?? 0, pages - 1), slice = Array(ids.dropFirst(pg * per).prefix(per))
        return LazyVGrid(columns: cols, spacing: st.s(16)) {
            ForEach(Array(slice.enumerated()), id: \.element) { j, id in card(id).popIn(Double(j) * 0.025) }
        }
        .id(String(describing: tab) + "\(pg)")
        .contentShape(Rectangle())
        .gesture(DragGesture(minimumDistance: 30).onEnded { g in
            guard tab != .mull, abs(g.translation.width) > st.s(70), abs(g.translation.width) > abs(g.translation.height) * 1.5 else { return }
            turn(g.translation.width < 0 ? 1 : -1)
        })
    }
    private func card(_ id: String) -> some View {
        let shape = RoundedRectangle(cornerRadius: st.s(Toy.rLg), style: .continuous), selected = id == current
        if tab == .mull, let pk = shop.packs.first(where: { $0.id == id }) {
            let poor = app.progress.coins < pk.price
            return AnyView(Button { sel[.mull] = id } label: {
                VStack(spacing: 0) {
                    PackArt(n: pk.n).frame(height: st.s(gridH - 152))
                    HStack(spacing: st.s(4)) { Glyph.coin.image.resizable().scaledToFit().frame(width: st.s(32)); Text("\(pk.price)") }
                        .font(Toy.font(30, st)).foregroundStyle(poor ? Toy.inkSoft : Toy.inkStrong).frame(maxHeight: .infinity)
                }
                .frame(height: st.s(gridH - 72))
                .background(shape.fill(Toy.surface)).clipShape(shape)
                .overlay(Gloss(shape: shape).opacity(0.5))
                .overlay(shape.strokeBorder(selected ? Toy.blueLine : Toy.surfaceLine, lineWidth: st.s(5)))
                .background(shape.fill(selected ? Toy.blueDown : Toy.surfaceDown).offset(y: st.s(6)))
                .shadow(color: selected ? Toy.blue.opacity(0.7) : Toy.shadow.opacity(0.25), radius: st.s(selected ? 14 : 7), y: st.s(selected ? 4 : 8))
                .scaleEffect(selected ? 1.04 : 1)
                .animation(.spring(response: 0.3, dampingFraction: 0.6), value: selected)
            }
            .buttonStyle(PressDown()).accessibilityLabel("\(pk.n) mulligans, costs \(pk.price)"))
        }
        let own = app.progress.owned.contains(id), eq = app.progress.equipped.values.contains(id)
        let price = shop.price(id) ?? 0, poor = !own && app.progress.coins < price
        return AnyView(Button { tap(id) } label: {
            VStack(spacing: 0) {
                Image("shop-" + id).resizable().scaledToFill().frame(height: st.s(cardH - 64)).clipped()
                    .background(Toy.surface2)
                HStack(spacing: st.s(4)) {
                    if eq { Image(systemName: "checkmark").font(.system(size: st.s(28), weight: .black)).foregroundStyle(Toy.yellowDown) }
                    else if own { Circle().fill(Toy.green).overlay(Circle().strokeBorder(Toy.greenLine, lineWidth: st.s(3))).frame(width: st.s(20), height: st.s(20)) }
                    else {
                        Glyph.coin.image.resizable().scaledToFit().frame(width: st.s(32))
                        Text("\(price)").font(Toy.font(26, st))
                        if poor { Glyph.lock.image.resizable().scaledToFit().frame(width: st.s(22)).opacity(0.6) }
                    }
                }
                .foregroundStyle(poor ? Toy.inkSoft : Toy.inkStrong).frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(height: st.s(cardH))
            .background(shape.fill(Toy.surface)).clipShape(shape)
            .overlay(Gloss(shape: shape).opacity(0.5))
            .overlay(shape.strokeBorder(selected ? Toy.blueLine : eq ? Toy.yellowLine : Toy.surfaceLine, lineWidth: st.s(5)))
            .overlay { if price >= shop.premium { PremiumRim(shape: shape, width: st.s(5)) } }
            .overlay(alignment: .topTrailing) { if price >= shop.premium { Sparkle().frame(width: st.s(30), height: st.s(30)).offset(x: st.s(8), y: -st.s(8)) } }
            .background(shape.fill(selected ? Toy.blueDown : Toy.surfaceDown).offset(y: st.s(6)))
            .shadow(color: selected ? Toy.blue.opacity(0.7) : Toy.shadow.opacity(0.25), radius: st.s(selected ? 14 : 7), y: st.s(selected ? 4 : 8))
            .scaleEffect(selected ? 1.05 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: selected)
        }
        .buttonStyle(PressDown())
        .accessibilityLabel((tab == .putter ? "putter " : "ball ") + (eq ? "equipped" : own ? "owned" : "costs \(price)")))
    }
    private var pager: some View {
        HStack(spacing: st.s(24)) {
            IconButton(symbol: "arrow.left", label: "previous page") { turn(-1) }
            HStack(spacing: st.s(10)) {
                ForEach(0..<pages, id: \.self) { n in
                    let on = n == (page[tab] ?? 0)
                    Circle().fill(on ? Toy.yellow : Toy.surfaceLine).overlay(Circle().strokeBorder(on ? Toy.yellowLine : .clear, lineWidth: st.s(3)))
                        .frame(width: st.s(24), height: st.s(24)).scaleEffect(on ? 1.35 : 1)
                }
            }
            .accessibilityElement(children: .ignore).accessibilityLabel("page \((page[tab] ?? 0) + 1) of \(pages)")
            IconButton(symbol: "arrow.right", label: "next page") { turn(1) }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: actions
    private func pageOf(_ t: Tab, _ id: String) -> Int {
        let list = t == .putter ? shop.putters.map(\.id) : shop.balls.map(\.id), n = perOf(t)
        return max(0, (list.firstIndex(of: id) ?? 0) / n)
    }
    private func pick(_ t: Tab) {
        guard t != tab else { return }
        tab = t
        if t != .mull { let id = app.progress.equipped[t == .putter ? "putter" : "ball"] ?? ""; sel[t] = id; page[t] = pageOf(t, id) }
    }
    private func turn(_ d: Int) {
        let to = (((page[tab] ?? 0) + d) % pages + pages) % pages
        if to != page[tab] { withAnimation(.easeOut(duration: 0.2)) { page[tab] = to }; SFX.tick() }
    }
    private func tap(_ id: String) {
        sel[tab] = id
        if app.progress.owned.contains(id) {
            if !app.progress.equipped.values.contains(id) { app.progress.equip(id, shop: shop); app.save() }
        }
    }
    private func act(_ id: String, price: Int) {
        if tab == .mull {
            if app.progress.buyPack(id, shop: shop) { app.save(); bought() } else { poor() }
            return
        }
        guard !app.progress.owned.contains(id) else { SFX.tap(); return }
        if app.progress.buy(id, shop: shop) { app.save(); bought() } else { poor() }
    }
    private func bought() {
        SFX.coin(); DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) { SFX.star(2) }
        Haptics.knock(1)
        guard !UIAccessibility.isReduceMotionEnabled else { return }
        withAnimation(.spring(response: 0.25, dampingFraction: 0.4)) { nudge += 1 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { withAnimation(.spring) { nudge += 1 } }
    }
    private func poor() {
        SFX.boink()
        withAnimation(.linear(duration: 0.4)) { shake += 1 }
    }
}

/// a little shake (short of coins); still under reduced motion
struct Shake: GeometryEffect {
    var n: Int
    var animatableData: CGFloat
    init(n: Int) { self.n = n; animatableData = CGFloat(n) }
    func effectValue(size: CGSize) -> ProjectionTransform {
        guard !UIAccessibility.isReduceMotionEnabled else { return ProjectionTransform(.identity) }
        return ProjectionTransform(CGAffineTransform(translationX: 8 * sin(animatableData * .pi * 6), y: 0))
    }
}

/// a mulligan token: a blue coin with the take-back arrow
struct Token: View {
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 64
            ctx.fill(Path(ellipseIn: CGRect(x: 6 * k, y: 9 * k, width: 52 * k, height: 52 * k)), with: .color(Toy.blueDown))
            let face = Path(ellipseIn: CGRect(x: 6 * k, y: 4 * k, width: 52 * k, height: 52 * k))
            ctx.fill(face, with: .color(Toy.blue)); ctx.stroke(face, with: .color(Toy.blueLine), lineWidth: 4 * k)
            var c = ctx; c.translateBy(x: 16 * k, y: 14 * k); c.scaleBy(x: 0.5, y: 0.5)
            ExtraIcon.mulligan.draw(c, k)
        }
        .aspectRatio(1, contentMode: .fit)
    }
}
/// a stack of tokens for a pack card: more tokens for a bigger pack, and its count
struct PackArt: View {
    @Environment(\.stage) private var st
    let n: Int
    var body: some View {
        let m = n >= 25 ? 5 : n >= 10 ? 3 : 1
        ZStack {
            ForEach(0..<m, id: \.self) { i in
                let x = m == 1 ? 0 : (Double(i) - Double(m - 1) / 2) * 22, y = 18 - abs(Double(i) - Double(m - 1) / 2) * 10
                Token().frame(width: st.s(64), height: st.s(64)).offset(x: st.s(x), y: st.s(y - 10))
            }
            Text("+\(n)").font(Toy.font(44, st)).foregroundStyle(Toy.inkStrong).offset(y: st.s(56))
        }
    }
}
struct Sparkle: View {
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 64
            let p = Path {
                $0.move(to: CGPoint(x: 32 * k, y: 4 * k))
                $0.addCurve(to: CGPoint(x: 60 * k, y: 32 * k), control1: CGPoint(x: 34 * k, y: 22 * k), control2: CGPoint(x: 42 * k, y: 30 * k))
                $0.addCurve(to: CGPoint(x: 32 * k, y: 60 * k), control1: CGPoint(x: 42 * k, y: 34 * k), control2: CGPoint(x: 34 * k, y: 42 * k))
                $0.addCurve(to: CGPoint(x: 4 * k, y: 32 * k), control1: CGPoint(x: 30 * k, y: 42 * k), control2: CGPoint(x: 22 * k, y: 34 * k))
                $0.addCurve(to: CGPoint(x: 32 * k, y: 4 * k), control1: CGPoint(x: 22 * k, y: 30 * k), control2: CGPoint(x: 30 * k, y: 22 * k))
            }
            ctx.fill(p, with: .color(Toy.yellow)); ctx.stroke(p, with: .color(Toy.yellowLine), style: StrokeStyle(lineWidth: 3 * k, lineJoin: .round))
        }
        .aspectRatio(1, contentMode: .fit).accessibilityHidden(true)
    }
}
/// the forgiveness icons: contact (the sweet spot on a face), tempo (a metronome), line (a straight roll)
struct StatIcon: View {
    let k: Int
    var body: some View {
        Canvas { ctx, s in
            let u = s.width / 64
            func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * u, y: y * u) }
            switch k {
            case 0:
                let face = Path(roundedRect: CGRect(x: 4 * u, y: 20 * u, width: 56 * u, height: 24 * u), cornerRadius: 9 * u)
                ctx.fill(face, with: .color(Color(hex: "#c9ced6"))); ctx.stroke(face, with: .color(Color(hex: "#6f7881")), lineWidth: 4 * u)
                ctx.fill(Path(roundedRect: CGRect(x: 24 * u, y: 22 * u, width: 16 * u, height: 20 * u), cornerRadius: 4 * u), with: .color(Toy.green))
                ctx.fill(Path(ellipseIn: CGRect(x: 28 * u, y: 28 * u, width: 8 * u, height: 8 * u)), with: .color(.white))
            case 1:
                let body = Path { $0.addLines([p(20, 58), p(28, 8), p(36, 8), p(44, 58)]); $0.closeSubpath() }
                ctx.fill(body, with: .color(Color(hex: "#c9a476"))); ctx.stroke(body, with: .color(Color(hex: "#8a6538")), style: StrokeStyle(lineWidth: 4 * u, lineJoin: .round))
                ctx.stroke(Path { $0.move(to: p(32, 46)); $0.addLine(to: p(46, 16)) }, with: .color(Toy.inkStrong), style: StrokeStyle(lineWidth: 5 * u, lineCap: .round))
                ctx.fill(Path(ellipseIn: CGRect(x: 37 * u, y: 19 * u, width: 10 * u, height: 10 * u)), with: .color(Toy.red))
            default:
                ctx.stroke(Path { $0.move(to: p(32, 54)); $0.addLine(to: p(32, 14)) }, with: .color(Toy.blue), style: StrokeStyle(lineWidth: 7 * u, lineCap: .round, dash: [1 * u, 11 * u]))
                ctx.stroke(Path { $0.addLines([p(22, 18), p(32, 6), p(42, 18)]) }, with: .color(Toy.blueLine), style: StrokeStyle(lineWidth: 6 * u, lineCap: .round, lineJoin: .round))
                ctx.fill(Path(ellipseIn: CGRect(x: 24 * u, y: 44 * u, width: 16 * u, height: 16 * u)), with: .color(Color(hex: "#fffdf7")))
            }
        }
        .aspectRatio(1, contentMode: .fit).accessibilityHidden(true)
    }
}

/// the studio: the picked putter (with your ball in front of its face) or ball (on a tee), turning
/// slowly under a warm key light, as the web's studioShot frames it
struct ShopPreview: UIViewRepresentable {
    let id: String
    let ball: String
    func makeUIView(context: Context) -> ARView {
        let v = ARView(frame: .zero, cameraMode: .nonAR, automaticallyConfigureSession: false)
        v.environment.background = .color(UIColor(red: 0.87, green: 0.94, blue: 0.96, alpha: 1))
        v.renderOptions.formUnion([.disableMotionBlur, .disableDepthOfField])
        context.coordinator.build(v, id: id, ball: ball)
        return v
    }
    func updateUIView(_ v: ARView, context: Context) {}
    static func dismantleUIView(_ v: ARView, coordinator: Coordinator) { coordinator.sub?.cancel() }
    func makeCoordinator() -> Coordinator { Coordinator() }

    @MainActor final class Coordinator {
        var sub: Cancellable?
        private let model = Entity()
        private var t = 0.0
        func build(_ v: ARView, id: String, ball: String) {
            let anchor = AnchorEntity(world: .zero), cam = PerspectiveCamera()
            cam.camera.fieldOfViewInDegrees = 30; cam.camera.near = 0.01
            anchor.addChild(cam); anchor.addChild(model)
            let key = DirectionalLight(); key.light.intensity = 2600; key.light.color = UIColor(red: 1, green: 0.89, blue: 0.72, alpha: 1)
            key.look(at: .zero, from: [1.2, 2, 2], relativeTo: nil); anchor.addChild(key)
            let rim = DirectionalLight(); rim.light.intensity = 700; rim.light.color = UIColor(red: 0.81, green: 0.93, blue: 1, alpha: 1)
            rim.look(at: .zero, from: [-2, 1, -1.5], relativeTo: nil); anchor.addChild(rim)
            v.scene.addAnchor(anchor)
            let isPutter = Shop.shared.putter(id) != nil, R = Float(Sim.BALL_R)
            if isPutter, let p = Gear.putter(id) {
                model.addChild(p)
                let b = ModelEntity(mesh: Gear.sphere(radius: R), materials: [Gear.ballMaterial(ball) ?? SimpleMaterial()])
                b.position = [-Float(PlayProps.HEAD_W) * 0.42, R, R + 0.055]; b.orientation = simd_quatf(angle: -0.6, axis: [0, 1, 0])
                model.addChild(b)
                // frame the head: look along (0.34, 0.42, 0.84), far enough to fit it 1.4 times
                model.orientation = simd_quatf(angle: 0.45, axis: [0, 1, 0])
                var box = BoundingBox.empty
                for e in p.children where e.name == "head" { box = box.union(e.visualBounds(relativeTo: nil)) }
                if box.isEmpty { box = p.visualBounds(relativeTo: nil) }
                let c = box.center, len = simd_length(box.extents), half = Float(15 * Double.pi / 180)
                let dist = len / 2 / sin(half) * 1.4, dir = simd_normalize(SIMD3<Float>(0.34, 0.42, 0.84))
                cam.look(at: c + [0, len * 0.1, 0], from: c + dir * dist, relativeTo: nil)
            } else {
                let b = ModelEntity(mesh: Gear.sphere(radius: R), materials: [Gear.ballMaterial(id) ?? SimpleMaterial()])
                b.position.y = R + 0.002
                model.addChild(b)
                var wood = PhysicallyBasedMaterial(); wood.baseColor = .init(tint: UIColor(red: 0.91, green: 0.72, blue: 0.45, alpha: 1)); wood.roughness = 0.6
                let cup = ModelEntity(mesh: .generateCylinder(height: 0.014, radius: 0.016), materials: [wood]); cup.position.y = -0.007
                let peg = ModelEntity(mesh: .generateCylinder(height: 0.07, radius: 0.0045), materials: [wood]); peg.position.y = -0.049
                model.addChild(cup); model.addChild(peg)
                cam.look(at: [0, 0.03, 0], from: [0, 0.12, 0.36], relativeTo: nil)
            }
            let still = UIAccessibility.isReduceMotionEnabled
            sub = v.scene.subscribe(to: SceneEvents.Update.self) { [weak self] e in
                MainActor.assumeIsolated {
                    guard let self, !still else { return }
                    self.t += e.deltaTime
                    let spin = isPutter ? sin(self.t * 0.7) * 0.35 : sin(self.t * 0.7) * 1.6 + self.t * 0.4
                    self.model.orientation = simd_quatf(angle: Float((isPutter ? 0.45 : -0.35) + spin), axis: [0, 1, 0])
                }
            }
        }
    }
}

/// the pro shop's door: a little shop front under a striped awning
struct ShopGlyph: View {
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 64
            func r(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect { CGRect(x: x * k, y: y * k, width: w * k, height: h * k) }
            let front = Path(roundedRect: r(11, 28, 42, 28), cornerRadius: 4 * k)
            ctx.fill(front, with: .color(Toy.surface)); ctx.stroke(front, with: .color(Toy.woodDeep), lineWidth: 4 * k)
            ctx.fill(Path(roundedRect: r(26, 36, 12, 20), cornerRadius: 3 * k), with: .color(Toy.blue))
            ctx.fill(Path(r(6, 12, 52, 12)), with: .color(Toy.red))
            for x in [19.0, 32, 45] { ctx.fill(Path(r(x - 3, 12, 6, 12)), with: .color(Toy.surface)) }
            for i in 0..<4 { ctx.fill(Path(ellipseIn: r(6 + 13 * CGFloat(i), 18, 13, 12)), with: .color(Toy.redLine)) }
            ctx.fill(Path(r(6, 18, 52, 6)), with: .color(Toy.redLine))
        }
        .aspectRatio(1, contentMode: .fit).accessibilityHidden(true)
    }
}

/// the rim of a premium item: a rainbow turning slowly round it (still under reduced motion)
struct PremiumRim<S: InsettableShape>: View {
    let shape: S
    let width: CGFloat
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: reduceMotion)) { tl in
            let a = reduceMotion ? 0 : tl.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 4) / 4 * 360
            shape.strokeBorder(AngularGradient(colors: ["#ef7d6d", "#ffd66e", "#74c465", "#6fc0df", "#b58cff", "#ef7d6d"].map(Color.init(hex:)), center: .center, angle: .degrees(a)), lineWidth: width)
        }
        .allowsHitTesting(false)
    }
}
