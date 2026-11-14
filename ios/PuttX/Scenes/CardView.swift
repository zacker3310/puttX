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
    @ViewBuilder private var solo: some View {
        let holes = app.catalog.holes(course: course)
        let total = holes.reduce(0) { $0 + (app.progress.holes[$1.key]?.best ?? $1.par) }, par = holes.reduce(0) { $0 + $1.par }
        let diff = total - par
        ZStack(alignment: .topLeading) {
            WorldScene(look: app.look(course), horizon: 0.7).ignoresSafeArea()
            VStack(spacing: st.s(18)) {
                ForEach(Array(stride(from: 0, to: holes.count, by: 9)), id: \.self) { k in nine(Array(holes[k..<min(k + 9, holes.count)]), from: k) }
                HStack(spacing: st.s(24)) {
                    Text("\(total)").font(Toy.font(72, st)).foregroundStyle(Toy.inkStrong)
                    Text(diff > 0 ? "+\(diff)" : "\(diff)").font(Toy.font(48, st)).foregroundStyle(diff > 0 ? Toy.redLine : Toy.greenLine)
                    Tally(value: "\(app.progress.stars(course: course, catalog: app.catalog))") { StarView() }
                    Spacer()
                    Button { app.go(.map(course)) } label: { HudIconView(icon: .home).frame(width: st.s(48), height: st.s(48)) }
                        .buttonStyle(ToyButtonStyle()).accessibilityLabel("course map")
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

    /// the web's scorecard stock: cream paper, a ruled header, a red margin, pen-blue marks; rows
    /// as tall as the stage allows (47 px on the web), so two nines and the total always fit
    private var rowH: CGFloat { min(47, max(34, (st.h - 260) / 5.6)) }
    // a dark plate ruled in steel; the scores are written in a bright pen
    private static let paper = Color(hex: "#22252c"), rule = Color(hex: "#3f444e"), head = Color(hex: "#2c3039"), sub = Color(hex: "#30343d")
    private static let margin = Color(hex: "#ef7d6d"), pen = Color(hex: "#8fd3ff"), edge = Color(hex: "#6b727e")

    private func nine(_ ns: [Hole], from k: Int) -> some View {
        let cell = st.s(min(80, (st.w - 330) / 11)), lab = st.s(64), subW = st.s(112)
        let bests = ns.map { app.progress.holes[$0.key]?.best ?? $0.par }
        return Grid(horizontalSpacing: 0, verticalSpacing: 0) {
            GridRow {
                Color.clear.frame(width: lab, height: st.s(rowH))
                ForEach(ns.indices, id: \.self) { i in cellText("\(k + i + 1)", cell, Toy.inkSoft, 22) }
                cellText("\(k + 1)-\(k + ns.count)", subW, Toy.inkSoft, 20).background(CardView.sub)
            }
            .background(CardView.head)
            GridRow {
                Glyph.flag.image.resizable().scaledToFit().frame(width: st.s(34)).frame(width: lab, height: st.s(rowH))
                ForEach(ns.indices, id: \.self) { i in cellText("\(ns[i].par)", cell, Toy.inkSoft, 28) }
                cellText("\(ns.reduce(0) { $0 + $1.par })", subW, Toy.inkSoft, 30).background(CardView.sub)
            }
            GridRow {
                BallIcon().frame(width: st.s(34), height: st.s(34)).frame(width: lab, height: st.s(rowH))
                ForEach(ns.indices, id: \.self) { i in mark(bests[i], ns[i].par, cell) }
                cellText("\(bests.reduce(0, +))", subW, Toy.inkStrong, 30).background(CardView.sub)
            }
        }
        // the red margin after the labels
        .overlay(alignment: .leading) { Rectangle().fill(CardView.margin).frame(width: st.s(3)).offset(x: lab) }
        .background(CardView.paper)
        .clipShape(RoundedRectangle(cornerRadius: st.s(Toy.rMd)))
        .overlay(RoundedRectangle(cornerRadius: st.s(Toy.rMd)).strokeBorder(CardView.edge, lineWidth: st.s(3)))
    }

    private func cellText(_ s: String, _ w: CGFloat, _ c: Color, _ size: CGFloat) -> some View {
        Text(s).font(Toy.font(size, st)).foregroundStyle(c).frame(width: w, height: st.s(rowH))
            .overlay(alignment: .leading) { Rectangle().fill(CardView.rule).frame(width: st.s(2)) }
    }

    /// a pen mark round the score: a ring for one under, a double ring for two, a box over, a double box
    @ViewBuilder private func mark(_ best: Int, _ par: Int, _ w: CGFloat) -> some View {
        let d = best - par, r = st.s(19), line = st.s(3)
        ZStack {
            if d <= -1 { Circle().strokeBorder(CardView.pen, lineWidth: line).frame(width: 2 * r, height: 2 * r) }
            if d <= -2 { Circle().strokeBorder(CardView.pen, lineWidth: line).frame(width: 2 * r - st.s(10), height: 2 * r - st.s(10)) }
            if d >= 1 { RoundedRectangle(cornerRadius: st.s(4)).strokeBorder(CardView.pen, lineWidth: line).frame(width: 2 * r, height: 2 * r) }
            if d >= 2 { RoundedRectangle(cornerRadius: st.s(2)).strokeBorder(CardView.pen, lineWidth: line).frame(width: 2 * r - st.s(10), height: 2 * r - st.s(10)) }
            Text("\(best)").font(Toy.font(26, st)).foregroundStyle(CardView.pen)
        }
        .frame(width: w, height: st.s(rowH))
        .overlay(alignment: .leading) { Rectangle().fill(CardView.rule).frame(width: st.s(2)) }
        .accessibilityLabel("\(best)")
    }
}
