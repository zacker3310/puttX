// PlayerProgress (src/game.js 2g): bests and stars only ever go up; finishing a course opens the next
// course of its world, and finishing every hole of a world opens the next world.

public struct HoleRecord: Sendable, Codable, Equatable {
    public var best: Int, stars: Int
    public init(best: Int, stars: Int) { self.best = best; self.stars = stars }
}

public struct PlayerProgress: Sendable, Codable, Equatable {
    public var v = 2
    public var holes: [String: HoleRecord] = [:]
    public var worlds: [Int]
    public var sound = true
    public var hand = "R"
    public var neon = false
    public var mulligans = 5
    public var coins = 0
    /// all coins and tokens ever spent: they only grow, so two devices' saves merge without a refund
    /// (earned is balance + spent, the merge keeps the most earned and the most spent)
    public var coinsSpent = 0
    /// birdies, eagles, albatrosses and aces, counted for life
    public var tally: [String: Int] = [:]
    public var mulligansSpent = 0
    public var owned: [String] = []
    public var equipped: [String: String] = [:]
    /// lost balls found (key -> 1), goals met (key -> bits), the daily hole
    public var lost: [String: Int] = [:]
    public var obj: [String: Int] = [:]
    public var daily: DailyRecord?
    /// each hole's best run as putt inputs (angle, power, hole time), replayed as the ghost; inputs only
    /// mean the same run under the same physics, so a new physics version drops them
    public var ghosts: [String: [[Double]]] = [:]
    /// holes that already paid the first-clear bonus (nil in a save from before the shop: every hole
    /// finished by then counts as paid)
    public var firsts: [String]?
    public var phys = PlayerProgress.physVersion
    public static let physVersion = 3

    public static let coinMax = 999_999

    public init(catalog: Catalog) {
        firsts = []; worlds = [catalog.playableWorlds.first ?? catalog.worldOrder[0]]
        repairGear(Shop.shared)
    }

    /// a save from any version: anything missing takes its default, so old saves always load
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        v = try c.decodeIfPresent(Int.self, forKey: .v) ?? 2
        holes = try c.decodeIfPresent([String: HoleRecord].self, forKey: .holes) ?? [:]
        worlds = try c.decodeIfPresent([Int].self, forKey: .worlds) ?? [1]
        sound = try c.decodeIfPresent(Bool.self, forKey: .sound) ?? true
        hand = try c.decodeIfPresent(String.self, forKey: .hand) ?? "R"
        neon = try c.decodeIfPresent(Bool.self, forKey: .neon) ?? false
        mulligans = try c.decodeIfPresent(Int.self, forKey: .mulligans) ?? 5
        coins = try c.decodeIfPresent(Int.self, forKey: .coins) ?? 0
        coinsSpent = max(0, (try? c.decodeIfPresent(Int.self, forKey: .coinsSpent)) ?? 0)
        tally = ((try? c.decodeIfPresent([String: Int].self, forKey: .tally)) ?? [:]).filter { ["birdie", "eagle", "alb", "ace"].contains($0.key) && $0.value >= 0 }
        mulligansSpent = max(0, (try? c.decodeIfPresent(Int.self, forKey: .mulligansSpent)) ?? 0)
        owned = try c.decodeIfPresent([String].self, forKey: .owned) ?? []
        equipped = try c.decodeIfPresent([String: String].self, forKey: .equipped) ?? [:]
        lost = (try? c.decodeIfPresent([String: Int].self, forKey: .lost)) ?? [:]
        obj = (try? c.decodeIfPresent([String: Int].self, forKey: .obj)) ?? [:]
        daily = try? c.decodeIfPresent(DailyRecord.self, forKey: .daily)
        ghosts = (try? c.decodeIfPresent([String: [[Double]]].self, forKey: .ghosts)) ?? [:]
        firsts = (try? c.decodeIfPresent([String].self, forKey: .firsts)) ?? nil
        phys = (try? c.decodeIfPresent(Int.self, forKey: .phys)) ?? 0
        if phys != PlayerProgress.physVersion { ghosts = [:]; phys = PlayerProgress.physVersion }
        // repairExtras: tokens in range, goal bits in range
        if mulligans < 0 { mulligans = 5 }
        mulligans = Swift.min(mulligans, 9999)
        lost = lost.filter { $0.value == 1 }
        obj = obj.filter { (1...7).contains($0.value) }
        if let d = daily, !(1...99).contains(d.best) || d.streak < 1 { daily = nil }
    }

    /// two saves of the same profile, merged with nothing lost: bests only go down, stars only go up,
    /// open courses only grow. Order does not matter, so two devices always agree (iCloud).
    public func merged(with o: PlayerProgress) -> PlayerProgress {
        var m = self
        for (k, r) in o.holes {
            if let a = m.holes[k] { m.holes[k] = HoleRecord(best: Swift.min(a.best, r.best), stars: Swift.max(a.stars, r.stars)) } else { m.holes[k] = r }
        }
        m.worlds = Array(Set(worlds).union(o.worlds)).sorted()
        // nothing bought on one device comes back on the other, and nothing earned is lost
        let earned = Swift.max(coins + coinsSpent, o.coins + o.coinsSpent), spent = Swift.max(coinsSpent, o.coinsSpent)
        m.coinsSpent = spent; m.coins = Swift.max(0, Swift.min(PlayerProgress.coinMax, earned - spent))
        let got = Swift.max(mulligans + mulligansSpent, o.mulligans + o.mulligansSpent), used = Swift.max(mulligansSpent, o.mulligansSpent)
        m.mulligansSpent = used; m.mulligans = Swift.max(0, Swift.min(9999, got - used))
        m.owned = Array(Set(owned).union(o.owned)).sorted()
        m.lost.merge(o.lost) { a, _ in a }
        m.obj.merge(o.obj) { $0 | $1 }
        m.tally.merge(o.tally) { Swift.max($0, $1) }
        // the ghost of the better run (fewer putts) wins
        if firsts != nil || o.firsts != nil { m.firsts = Array(Set(firsts ?? []).union(o.firsts ?? [])).sorted() }
        m.ghosts.merge(o.ghosts) { a, b in b.count < a.count ? b : a }
        if let b = o.daily {
            if let a = m.daily, a.d == b.d { m.daily = DailyRecord(d: a.d, best: Swift.min(a.best, b.best), streak: Swift.max(a.streak, b.streak)) }
            else if m.daily == nil || b.d > m.daily!.d { m.daily = b }
        }
        return m
    }

    /// stars won on a course
    public func stars(course c: Int, catalog: Catalog) -> Int { catalog.holes(course: c).reduce(0) { $0 + (holes[$1.key]?.stars ?? 0) } }
    /// the first hole open but not yet finished, course by course
    public func nextHole(catalog: Catalog) -> String? {
        for w in catalog.worldOrder { for c in catalog.courses(ofWorld: w) where worlds.contains(c) {
            for h in catalog.holes(course: c) where holes[h.key] == nil && unlocked(h.key, catalog: catalog) { return h.key }
        } }
        return nil
    }

    @discardableResult
    public mutating func record(_ key: String, score: Int, par: Int, maxStars: Int = 3, catalog: Catalog) -> HoleRecord {
        let prev = holes[key]
        let rec = HoleRecord(best: prev.map { Swift.min($0.best, score) } ?? score,
                             stars: Swift.max(prev?.stars ?? 0, Swift.min(maxStars, Scoring.stars(score, par))))
        holes[key] = rec
        let w = Catalog.course(of: key), n = Catalog.number(of: key), list = catalog.playableWorlds
        func open(_ c: Int) { if catalog.has(course: c) && !worlds.contains(c) { worlds.append(c) } }
        if catalog.has(course: w) && n == catalog.holes(course: w).count
            && w + catalog.courseStep <= catalog.world(of: w) + (Catalog.coursesPerWorld - 1) * catalog.courseStep { open(w + catalog.courseStep) }
        let home = catalog.world(of: w)
        if !catalog.isExtra(w), let j = list.firstIndex(of: home), j + 1 < list.count,
           catalog.courses(ofWorld: home).allSatisfy({ c in catalog.holes(course: c).allSatisfy { holes[$0.key] != nil } }) { open(list[j + 1]) }
        return rec
    }

    public func unlocked(_ key: String, catalog: Catalog) -> Bool {
        let w = Catalog.course(of: key), n = Catalog.number(of: key)
        if catalog.isExtra(w) { return catalog.has(course: w) }
        return worlds.contains(w) && (n == 1 || holes["\(w)-\(n - 1)"] != nil)
    }

    // MARK: the extras (src/game.js 6c)
    private mutating func addCoins(_ n: Int) -> Int { coins = Swift.min(PlayerProgress.coinMax, coins + n); return n }

    /// the hole's lost ball, rolled over: a token and 15 coins, once per hole
    public mutating func findLost(_ key: String) -> Int {
        guard lost[key] == nil else { return 0 }
        lost[key] = 1; mulligans += 1
        return addCoins(15)
    }
    /// the goals met on a finish: 10 coins for each met for the first time, a token for all three
    public mutating func finishGoals(_ key: String, bits: Int) -> (coins: Int, fresh: Int, all: Int) {
        let prev = obj[key] ?? 0, fresh = bits & ~prev, all = prev | bits
        if all != 0 { obj[key] = all }
        if all == 7 && prev != 7 { mulligans += 1 }
        return (addCoins(10 * ((fresh & 1) + ((fresh >> 1) & 1) + ((fresh >> 2) & 1))), fresh, all)
    }
    /// the daily hole finished: the first finish of a day pays 25 and a token, days in a row grow the streak
    public mutating func finishDaily(day: String, yesterday: String, score: Int) -> Int {
        if let d = daily, d.d == day { daily!.best = Swift.min(d.best, score); return 0 }
        daily = DailyRecord(d: day, best: score, streak: daily?.d == yesterday ? daily!.streak + 1 : 1)
        mulligans += 1
        return addCoins(25)
    }
    /// a new best (or a first finish) becomes the hole's ghost, unless the cap rolled it in
    public mutating func keepGhost(_ key: String, log: [[Double]], score: Int, previousBest: Int?, auto: Bool) {
        if !auto && (previousBest == nil || score <= previousBest!) && log.count == score { ghosts[key] = log }
    }
    /// the bird a score earns against par: birdie (1 under), eagle (2), albatross (3 or more)
    public static func bird(score: Int, par: Int) -> String? { par - score >= 3 ? "alb" : par - score == 2 ? "eagle" : par - score == 1 ? "birdie" : nil }
    /// counts a finish's bird (and an ace) for life; returns the bird for the done card's badge
    @discardableResult
    public mutating func tallyHole(score: Int, par: Int) -> String? {
        let b = PlayerProgress.bird(score: score, par: par)
        if let b { tally[b, default: 0] += 1 }
        if score == 1 { tally["ace", default: 0] += 1 }
        return b
    }
    /// spend a mulligan token
    public mutating func spendMulligan() -> Bool { guard mulligans > 0 else { return false }; mulligans -= 1; mulligansSpent += 1; return true }
}
