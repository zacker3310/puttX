// PlayerProgress (src/game.js 2g): bests and stars only ever go up; finishing a course opens the next
// course of its world, and finishing every hole of a world opens the next world.

public struct HoleRecord: Sendable, Codable, Equatable { public var best: Int, stars: Int }

public struct PlayerProgress: Sendable, Codable, Equatable {
    public var v = 2
    public var holes: [String: HoleRecord] = [:]
    public var worlds: [Int]
    public var sound = true
    public var hand = "R"
    public var neon = false
    public var mulligans = 5
    public var coins = 0
    public var owned: [String] = []
    public var equipped: [String: String] = [:]
    /// lost balls found (key -> 1), goals met (key -> bits), the daily hole
    public var lost: [String: Int] = [:]
    public var obj: [String: Int] = [:]
    public var daily: DailyRecord?

    public static let coinMax = 999_999

    public init(catalog: Catalog) { worlds = [catalog.playableWorlds.first ?? catalog.worldOrder[0]] }

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
        owned = try c.decodeIfPresent([String].self, forKey: .owned) ?? []
        equipped = try c.decodeIfPresent([String: String].self, forKey: .equipped) ?? [:]
        lost = (try? c.decodeIfPresent([String: Int].self, forKey: .lost)) ?? [:]
        obj = (try? c.decodeIfPresent([String: Int].self, forKey: .obj)) ?? [:]
        daily = try? c.decodeIfPresent(DailyRecord.self, forKey: .daily)
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
        m.coins = Swift.max(coins, o.coins)
        m.owned = Array(Set(owned).union(o.owned)).sorted()
        m.lost.merge(o.lost) { a, _ in a }
        m.obj.merge(o.obj) { $0 | $1 }
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
    /// spend a mulligan token
    public mutating func spendMulligan() -> Bool { guard mulligans > 0 else { return false }; mulligans -= 1; return true }
}
