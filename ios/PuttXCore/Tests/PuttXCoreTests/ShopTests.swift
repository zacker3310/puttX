import Foundation
import Testing
@testable import PuttXCore

/// the pro shop's rules against src/shop.js (export-ios writes shopgold.json from it)
@Suite struct ShopRules {
    struct G: Decodable { let coins: [[Coded]]; let feel: [String: Feel] }
    enum Coded: Decodable { case i(Int), b(Bool)
        init(from d: Decoder) throws { let c = try d.singleValueContainer(); if let b = try? c.decode(Bool.self) { self = .b(b) } else { self = .i(try c.decode(Int.self)) } }
        var int: Int { if case .i(let v) = self { v } else { 0 } }
        var bool: Bool { if case .b(let v) = self { v } else { false } }
    }
    let g: G = try! JSONDecoder().decode(G.self, from: Data(contentsOf: Bundle.module.url(forResource: "shopgold", withExtension: "json")!))
    let shop = Shop.shared

    @Test func coinsPerFinish() {
        for c in g.coins { #expect(shop.coinsFor(score: c[0].int, par: c[1].int, first: c[2].bool) == c[3].int) }
    }
    @Test func everyPuttersFeel() {
        #expect(g.feel.count == shop.putters.count)
        for (id, f) in g.feel {
            let s = shop.feel(id)
            #expect(s.sweet.bitPattern == f.sweet.bitPattern && s.tempoDead.bitPattern == f.tempoDead.bitPattern && s.tempoK.bitPattern == f.tempoK.bitPattern
                    && s.pathK.bitPattern == f.pathK.bitPattern && s.toeLoss.bitPattern == f.toeLoss.bitPattern && s.twist.bitPattern == f.twist.bitPattern, Comment(rawValue: id))
        }
    }
    @Test func buyingAndPaying() {
        var p = PlayerProgress(catalog: Catalog.shared)
        p.repairGear(shop)
        #expect(p.owned == ["p1", "b1"] && p.equipped["putter"] == "p1")
        #expect(p.payFinish("1-1", score: 1, par: 2, shop: shop) == 50)
        #expect(p.payFinish("1-1", score: 1, par: 2, shop: shop) == 40)
        #expect(!p.buy("p30", shop: shop) && p.coins == 90)
        #expect(p.buy("p2", shop: shop) && p.coins == 50 && p.equipped["putter"] == "p2")
        #expect(p.buyPack("m3", shop: shop) == false)
    }
}
