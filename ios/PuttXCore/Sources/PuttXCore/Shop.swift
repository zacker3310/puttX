// The pro shop (src/shop.js), its stock read from shop.json (export-ios writes it from shop.js):
// putters change how a swing gesture becomes a putt (Feel), never the physics; balls are looks.
// Coins come from finishing holes and only ever go down by buying.

import Foundation

public struct ShopPutter: Sendable, Codable, Identifiable {
    public struct Look: Sendable, Codable { public let head: String, shaft: String, grip: String, metal: Double; public let shape: String?, style: String? }
    public let id: String, price: Int
    /// forgiveness levels 0...4: contact, tempo, line
    public let f: [Int]
    public let look: Look
}
public struct ShopBall: Sendable, Codable, Identifiable {
    public let id: String, price: Int
    public let base: String, band: String, mark: String, pat: String
    public let rough: Double?, metal: Double?, glow: Double?, pulse: Int?
}
public struct ShopPack: Sendable, Codable, Identifiable { public let id: String, n: Int, price: Int }

public final class Shop: Sendable {
    public struct Coin: Sendable, Codable { public let finish: Int, under: Int, ace: Int, first: Int }
    public let coin: Coin
    public let premium: Int
    public let starter: [String: String]
    public let putters: [ShopPutter]
    public let balls: [ShopBall]
    public let packs: [ShopPack]

    private struct File: Codable { let coin: Coin; let premium: Int; let starter: [String: String]; let putters: [ShopPutter]; let balls: [ShopBall]; let packs: [ShopPack] }
    public init(json: Data) throws {
        let f = try JSONDecoder().decode(File.self, from: json)
        coin = f.coin; premium = f.premium; starter = f.starter; putters = f.putters; balls = f.balls; packs = f.packs
    }
    public static let shared: Shop = {
        let u = Bundle.module.url(forResource: "shop", withExtension: "json")!
        return try! Shop(json: Data(contentsOf: u))
    }()

    public func putter(_ id: String) -> ShopPutter? { putters.first { $0.id == id } }
    public func ball(_ id: String) -> ShopBall? { balls.first { $0.id == id } }
    public func price(_ id: String) -> Int? { putter(id)?.price ?? ball(id)?.price }

    /// coins for one finished hole: 5, 10 a stroke under par, 25 for an ace, 10 the first time
    public func coinsFor(score: Int, par: Int, first: Bool) -> Int {
        guard score >= 1 else { return coin.finish }
        let p = par > 0 ? par : score
        return coin.finish + coin.under * max(0, p - score) + (score == 1 ? coin.ace : 0) + (first ? coin.first : 0)
    }
    /// the stroke feel a putter gives: each level is 10% kinder (sweet and tempoDead grow, the rest shrink)
    public func feel(_ putterId: String) -> Feel {
        let f = putter(putterId)?.f ?? [0, 0, 0], base = Feel()
        if f.allSatisfy({ $0 == 0 }) { return base }
        func up(_ l: Int) -> Double { 1 + 0.1 * Double(min(4, max(0, l))) }
        var o = base
        o.sweet = base.sweet * up(f[0]); o.toeLoss = base.toeLoss / up(f[0]); o.twist = base.twist / up(f[0])
        o.tempoDead = base.tempoDead * up(f[1])
        o.pathK = base.pathK / up(f[2])
        return o
    }
}

extension PlayerProgress {
    /// shopRepair: the starter gear is always owned, equipped gear is owned gear of its kind
    public mutating func repairGear(_ shop: Shop) {
        let sp = shop.starter["putter"] ?? "p1", sb = shop.starter["ball"] ?? "b1"
        var seen = Set<String>(), list: [String] = []
        for id in [sp, sb] + owned where shop.price(id) != nil && seen.insert(id).inserted { list.append(id) }
        owned = list
        if !(equipped["putter"].map { owned.contains($0) && shop.putter($0) != nil } ?? false) { equipped["putter"] = sp }
        if !(equipped["ball"].map { owned.contains($0) && shop.ball($0) != nil } ?? false) { equipped["ball"] = sb }
        coins = Swift.max(0, Swift.min(PlayerProgress.coinMax, coins))
    }
    /// a finished hole's coins (onHoleFinished): the first-clear bonus once per hole
    public mutating func payFinish(_ key: String, score: Int, par: Int, shop: Shop) -> Int {
        let first = firsts.map { !$0.contains(key) } ?? (holes[key] == nil)
        if firsts == nil { firsts = Array(holes.keys).filter { $0 != key }.sorted() }
        if first { firsts!.append(key) }
        let n = shop.coinsFor(score: score, par: par, first: first)
        coins = Swift.min(PlayerProgress.coinMax, coins + n)
        return n
    }
    /// buy (and wear) an item; short of coins nothing changes
    public mutating func buy(_ id: String, shop: Shop) -> Bool {
        guard let price = shop.price(id), !owned.contains(id), coins >= price else { return false }
        coins -= price; owned.append(id)
        equip(id, shop: shop)
        return true
    }
    public mutating func equip(_ id: String, shop: Shop) {
        guard owned.contains(id) else { return }
        if shop.putter(id) != nil { equipped["putter"] = id } else if shop.ball(id) != nil { equipped["ball"] = id }
    }
    /// a pack of mulligan tokens for coins
    public mutating func buyPack(_ id: String, shop: Shop) -> Bool {
        guard let p = shop.packs.first(where: { $0.id == id }), coins >= p.price else { return false }
        coins -= p.price; mulligans = Swift.min(9999, mulligans + p.n)
        return true
    }
}
