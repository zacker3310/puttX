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
}
