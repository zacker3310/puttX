// Pass and play (src/game.js party): two to four players share one device on a course. Each takes
// the hole in turn with their own coloured ball; the lowest score on a hole putts first on the next
// (ties keep the order); each hole ends on a scoreboard with a crown for its best and running totals.
// Nothing is saved: no stars, coins or tokens, like practice.
import SwiftUI
import PuttXCore

struct Party: Equatable {
    static let balls = ["#fffdf7", "#ffd66e", "#ef7d6d", "#6fc0df"]
    let n: Int, course: Int
    var order: [Int]
    var turn = 0
    var scores: [String: [Int: Int]] = [:]
    /// between players: whose ball comes up next
    var passing: Int?
    /// everyone is in: this hole's scoreboard
    var board: String?
    init(n: Int, course: Int) { self.n = n; self.course = course; order = Array(0..<n) }
    var player: Int { order[turn] }
    func total(_ p: Int) -> Int { scores.values.reduce(0) { $0 + ($1[p] ?? 0) } }

    /// a player finished the hole: the next one, or the hole's board (and the honour for the next)
    mutating func finish(_ key: String, score: Int) {
        scores[key, default: [:]][player] = score
        if turn + 1 < n { turn += 1; passing = player; return }
        let sc = scores[key] ?? [:], was = order
        order = order.sorted { (sc[$0] ?? 0, was.firstIndex(of: $0)!) < (sc[$1] ?? 0, was.firstIndex(of: $1)!) }
        turn = 0
        board = key
    }
}

/// a player's numbered ball
struct PartyBall: View {
    let p: Int
    var size: CGFloat
    var body: some View {
        Text("\(p + 1)").font(.system(size: size * 0.48, weight: .heavy, design: .rounded)).foregroundStyle(Toy.inkStrong)
            .frame(width: size, height: size)
            .background(Circle().fill(Color(hex: Party.balls[p])))
            .overlay(Circle().fill(.black.opacity(0.12)).mask(Circle().strokeBorder(lineWidth: size * 0.1).offset(x: -size * 0.06, y: -size * 0.08)))
            .overlay(Circle().strokeBorder(Color(hex: "#4a3826").opacity(0.35), lineWidth: max(3, size * 0.08)))
            .accessibilityLabel("player \(p + 1)")
    }
}

/// how many players: three panels of balls
struct PartyPick: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    let course: Int
    let close: () -> Void
    var body: some View {
        ZStack {
            Toy.scrim.ignoresSafeArea().onTapGesture(perform: close)
            HStack(spacing: st.s(40)) {
                ForEach(2...4, id: \.self) { n in
                    Button { app.startParty(n, course: course) } label: {
                        LazyVGrid(columns: [GridItem(.fixed(st.s(64))), GridItem(.fixed(st.s(64)))], spacing: st.s(8)) {
                            ForEach(0..<n, id: \.self) { PartyBall(p: $0, size: st.s(64)) }
                        }
                        .frame(width: st.s(196 - 36), height: st.s(196 - 36))
                    }
                    .buttonStyle(ToyButtonStyle())
                    .accessibilityLabel(["two", "three", "four"][n - 2] + " players")
                }
            }
            .padding(st.s(60))
            .toyCard(st, radius: Toy.rXl)
            .overlay(alignment: .topTrailing) { IconButton(symbol: "xmark", label: "close", action: close).offset(x: st.s(30), y: -st.s(30)) }
            .popIn()
        }
    }
}

/// the hole's overlay in a party: the pass to the next player, or the board
struct PartyOverlay: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    let key: String
    var body: some View {
        if let party = app.party {
            if let p = party.passing {
                ZStack {
                    Toy.scrim.ignoresSafeArea()
                    PartyBall(p: p, size: st.s(150)).popIn()
                }
                .contentShape(Rectangle())
                .onTapGesture { app.partyGo() }
                .onAppear { SFX.tap() }
                .task { try? await Task.sleep(for: .seconds(1.6)); app.partyGo() }
                .accessibilityAddTraits(.isButton).accessibilityLabel("next player")
            } else if party.board == key, let sc = party.scores[key] {
                let best = sc.values.min() ?? 0
                ZStack {
                    Toy.scrim.ignoresSafeArea()
                    VStack(spacing: st.s(10)) {
                        ForEach(party.order, id: \.self) { p in
                            HStack(spacing: st.s(16)) {
                                PartyBall(p: p, size: st.s(56))
                                Text("\(sc[p] ?? 0)").font(Toy.font(52, st)).foregroundStyle(Toy.inkStrong).frame(width: st.s(80))
                                Group { if sc[p] == best { Crown() } else { Color.clear } }.frame(width: st.s(52), height: st.s(52))
                                Text("\(party.total(p))").font(Toy.font(36, st)).foregroundStyle(Toy.inkSoft).frame(width: st.s(90), alignment: .trailing)
                            }
                            .accessibilityElement(children: .ignore).accessibilityLabel("player \(p + 1), \(sc[p] ?? 0), total \(party.total(p))")
                        }
                        HStack(spacing: st.s(60)) {
                            Button { app.endParty(); app.go(.map(party.course)) } label: { HudIconView(icon: .home).frame(width: st.s(48), height: st.s(48)) }
                                .buttonStyle(ToyButtonStyle()).accessibilityLabel("map")
                            Button { app.partyNext(after: key) } label: { Image(systemName: "play.fill").font(.system(size: st.s(40), weight: .black)) }
                                .buttonStyle(ToyButtonStyle(kind: .go, size: CGSize(width: 140, height: 88))).accessibilityLabel("next hole")
                        }
                        .padding(.top, st.s(20))
                    }
                    .padding(st.s(40))
                    .frame(width: st.s(520))
                    .toyCard(st, radius: Toy.rXl)
                    .popIn()
                    .onAppear { SFX.star(2) }
                }
            }
        }
    }
}

/// the end of a party: every player's total, the lowest crowned
struct PartyCard: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    let party: Party
    var body: some View {
        let best = (0..<party.n).map(party.total).min() ?? 0
        ZStack {
            SkyBackground(colors: app.look(party.course).skyColors)
            VStack(spacing: st.s(14)) {
                ForEach((0..<party.n).sorted { party.total($0) < party.total($1) }, id: \.self) { p in
                    HStack(spacing: st.s(18)) {
                        PartyBall(p: p, size: st.s(72))
                        Text("\(party.total(p))").font(Toy.font(64, st)).foregroundStyle(Toy.inkStrong).frame(width: st.s(120))
                        Group { if party.total(p) == best { Crown() } else { Color.clear } }.frame(width: st.s(64), height: st.s(64))
                    }
                    .accessibilityElement(children: .ignore).accessibilityLabel("player \(p + 1), total \(party.total(p))")
                }
                Button { app.endParty(); app.go(.map(party.course)) } label: { HudIconView(icon: .home).frame(width: st.s(48), height: st.s(48)) }
                    .buttonStyle(ToyButtonStyle()).accessibilityLabel("map").padding(.top, st.s(16))
            }
            .padding(st.s(44)).toyCard(st, radius: Toy.rXl).popIn()
        }
        .onAppear { SFX.fanfare() }
    }
}

struct Crown: View {
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 64
            let p = Path { $0.addLines([CGPoint(x: 8 * k, y: 50 * k), CGPoint(x: 12 * k, y: 18 * k), CGPoint(x: 24 * k, y: 32 * k), CGPoint(x: 32 * k, y: 12 * k), CGPoint(x: 40 * k, y: 32 * k), CGPoint(x: 52 * k, y: 18 * k), CGPoint(x: 56 * k, y: 50 * k)]); $0.closeSubpath() }
            ctx.fill(p, with: .color(Toy.yellow)); ctx.stroke(p, with: .color(Toy.yellowLine), style: StrokeStyle(lineWidth: 4 * k, lineJoin: .round))
            ctx.fill(Path(ellipseIn: CGRect(x: 27 * k, y: 35 * k, width: 10 * k, height: 10 * k)), with: .color(Toy.red))
        }
        .aspectRatio(1, contentMode: .fit).accessibilityLabel("best")
    }
}

/// the map's pass-and-play button: three balls
struct PartyGlyph: View {
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 64
            for (x, y, f, l) in [(20.0, 40.0, "#fffdf7", "#8a7360"), (44, 40, "#ffd66e", "#dca63f"), (32, 20, "#ef7d6d", "#c95a4c")] {
                let c = Path(ellipseIn: CGRect(x: (x - 13) * k, y: (y - 13) * k, width: 26 * k, height: 26 * k))
                ctx.fill(c, with: .color(Color(hex: f))); ctx.stroke(c, with: .color(Color(hex: l)), lineWidth: 4 * k)
            }
        }
        .aspectRatio(1, contentMode: .fit).accessibilityHidden(true)
    }
}

/// whose turn it is, on the hole's top bar
struct PartyChip: View {
    @Environment(\.stage) private var st
    let p: Int
    var body: some View {
        PartyBall(p: p, size: st.s(44))
            .padding(.horizontal, st.s(14)).frame(height: st.s(76))
            .background(Capsule().fill(Toy.surface)).overlay(Capsule().strokeBorder(Toy.surfaceLine, lineWidth: st.s(4)))
    }
}
