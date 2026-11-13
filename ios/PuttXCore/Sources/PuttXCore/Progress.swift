// Progress (src/game.js 2g): bests and stars only ever go up; finishing a course opens the next
// course of its world, and finishing every hole of a world opens the next world.

public struct HoleRecord: Sendable, Codable, Equatable { public var best: Int, stars: Int }

public struct Progress: Sendable, Codable, Equatable {
    public var v = 2
    public var holes: [String: HoleRecord] = [:]
    public var worlds: [Int]
    public var sound = true
    public var hand = "R"
    public var mulligans = 5
    public var coins = 0
    public var owned: [String] = []
    public var equipped: [String: String] = [:]

    public init(catalog: Catalog) { worlds = [catalog.playableWorlds.first ?? catalog.worldOrder[0]] }

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
