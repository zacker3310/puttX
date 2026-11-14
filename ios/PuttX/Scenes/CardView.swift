// A finished course's scorecard (src/game.js showCard): a real paper card, a row of hole numbers, a
// par row and the player's row per nine, with each nine's subtotal, and scores marked as golfers mark
// them: a circle under par, two for two under, a square over, two for two over.
import SwiftUI
import PuttXCore

struct CardView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    let course: Int

    var body: some View {
        if let p = app.party, p.course == course { PartyCard(party: p) } else { solo }
    }
    private var solo: some View {
        let holes = app.catalog.holes(course: course)
        let total = holes.reduce(0) { $0 + (app.progress.holes[$1.key]?.best ?? $1.par) }, par = holes.reduce(0) { $0 + $1.par }
        let diff = total - par
        ZStack(alignment: .topLeading) {
            SkyBackground(colors: app.look(course).skyColors)
            VStack(spacing: st.s(18)) {
                ForEach(Array(stride(from: 0, to: holes.count, by: 9)), id: \.self) { k in nine(Array(holes[k..<min(k + 9, holes.count)]), from: k) }
                HStack(spacing: st.s(24)) {
                    Text("\(total)").font(Toy.font(72, st)).foregroundStyle(Toy.inkStrong)
                    Text(diff > 0 ? "+\(diff)" : "\(diff)").font(Toy.font(48, st)).foregroundStyle(diff > 0 ? Toy.redLine : Toy.greenLine)
                    Tally(value: "\(app.progress.stars(course: course, catalog: app.catalog))") { StarView() }
                    Spacer()
                    IconButton(symbol: "map.fill", label: "course map") { app.go(.map(course)) }
                    if let next = nextCourse { IconButton(symbol: "play.fill", kind: .go, label: "next course") { app.go(.world(app.catalog.world(of: next))) } }
                }
            }
            .padding(st.s(30))
            .background(Dots())
            .toyCard(st, radius: Toy.rXl)
            .padding(.horizontal, st.s(40))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .popIn()
        }
    }

    /// where the card's play button leads: this world's next course, else the next world, if open
    private var nextCourse: Int? {
        let c = app.catalog
        guard !c.isExtra(course) else { return nil }
        let w = c.world(of: course), list = c.playableWorlds
        let n: Int? = c.has(course: course + c.courseStep) && c.world(of: course + c.courseStep) == w ? course + c.courseStep
            : list.firstIndex(of: w).flatMap { $0 + 1 < list.count ? list[$0 + 1] : nil }
        return n.flatMap { app.progress.worlds.contains($0) ? $0 : nil }
    }

    private func nine(_ ns: [Hole], from k: Int) -> some View {
        let cell = st.s(min(80, (st.w - 330) / 11)), lab = st.s(64), sub = st.s(112)
        let bests = ns.map { app.progress.holes[$0.key]?.best ?? $0.par }
        return Grid(horizontalSpacing: 0, verticalSpacing: 0) {
            GridRow {
                Color.clear.frame(width: lab, height: cell * 0.7)
                ForEach(ns.indices, id: \.self) { i in cellText("\(k + i + 1)", cell, Toy.inkSoft, 26) }
                cellText("\(k + 1)-\(k + ns.count)", sub, Toy.inkSoft, 24).frame(width: sub)
            }
            GridRow {
                Glyph.flag.image.resizable().scaledToFit().frame(width: lab * 0.6).frame(width: lab)
                ForEach(ns.indices, id: \.self) { i in cellText("\(ns[i].par)", cell, Toy.inkSoft, 30) }
                cellText("\(ns.reduce(0) { $0 + $1.par })", sub, Toy.inkSoft, 30).frame(width: sub)
            }
            .background(Toy.surface2)
            GridRow {
                BallIcon().frame(width: lab * 0.7, height: lab * 0.7).frame(width: lab)
                ForEach(ns.indices, id: \.self) { i in mark(bests[i], ns[i].par, cell) }
                cellText("\(bests.reduce(0, +))", sub, Toy.inkStrong, 34).frame(width: sub)
            }
        }
        .padding(st.s(8))
        .background(RoundedRectangle(cornerRadius: st.s(Toy.rMd)).fill(.white))
        .overlay(RoundedRectangle(cornerRadius: st.s(Toy.rMd)).strokeBorder(Toy.surfaceLine, lineWidth: st.s(3)))
    }

    private func cellText(_ s: String, _ w: CGFloat, _ c: Color, _ size: CGFloat) -> some View {
        Text(s).font(Toy.font(size, st)).foregroundStyle(c).frame(width: w, height: st.s(56))
    }

    @ViewBuilder private func mark(_ best: Int, _ par: Int, _ w: CGFloat) -> some View {
        let d = best - par, r = st.s(22), line = st.s(3)
        ZStack {
            if d <= -1 { Circle().strokeBorder(Toy.greenLine, lineWidth: line).frame(width: 2 * r, height: 2 * r) }
            if d <= -2 { Circle().strokeBorder(Toy.greenLine, lineWidth: line).frame(width: 2 * r + st.s(10), height: 2 * r + st.s(10)) }
            if d >= 1 { Rectangle().strokeBorder(Toy.redLine, lineWidth: line).frame(width: 2 * r, height: 2 * r) }
            if d >= 2 { Rectangle().strokeBorder(Toy.redLine, lineWidth: line).frame(width: 2 * r + st.s(10), height: 2 * r + st.s(10)) }
            Text("\(best)").font(Toy.font(30, st)).foregroundStyle(Toy.inkStrong)
        }
        .frame(width: w, height: st.s(56))
    }
}
