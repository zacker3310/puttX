// The courses (src/game.js 2f): ten worlds, three courses of 18 each (course w, w + 10, w + 20,
// each more intricate), plus the extras (the Putt-Putt classic and the bonus nine) that unlock nothing.
import Foundation

public struct CourseInfo: Sendable, Codable, Hashable {
    public let id: Int, world: Int, g: Double, holes: Int
}

public final class Catalog: Sendable {
    public let worldOrder: [Int]
    public let courseStep: Int
    public let extras: [Int]
    public let courses: [CourseInfo]
    private let byKey: [String: Hole]
    private let byCourse: [Int: [Hole]]
    public static let coursesPerWorld = 3
    public static let classic = 98, bonus = 99

    private struct File: Decodable {
        let v: Int, worldOrder: [Int], courseStep: Int, extras: [Int], courses: [CourseInfo], holes: [HoleData]
    }

    public init(json: Data) throws {
        let f = try JSONDecoder().decode(File.self, from: json)
        worldOrder = f.worldOrder; courseStep = f.courseStep; extras = f.extras; courses = f.courses
        let holes = f.holes.map(Hole.init)
        byKey = Dictionary(uniqueKeysWithValues: holes.map { ($0.key, $0) })
        var bc: [Int: [Hole]] = [:]
        for h in holes { bc[Catalog.course(of: h.key), default: []].append(h) }
        byCourse = bc
    }
    /// the catalog bundled with PuttXCore
    public static let shared: Catalog = {
        guard let url = Bundle.module.url(forResource: "holes", withExtension: "json"), let data = try? Data(contentsOf: url),
              let c = try? Catalog(json: data) else { fatalError("PuttXCore: holes.json is missing or unreadable") }
        return c
    }()

    public static func course(of key: String) -> Int { Int(key.split(separator: "-")[0])! }
    public static func number(of key: String) -> Int { Int(key.split(separator: "-")[1])! }
    public func hole(_ key: String) -> Hole? { byKey[key] }
    public func holes(course c: Int) -> [Hole] { byCourse[c] ?? [] }
    public func has(course c: Int) -> Bool { byCourse[c] != nil }
    public func nextKey(_ key: String) -> String? {
        let c = Catalog.course(of: key), n = Catalog.number(of: key)
        return n < holes(course: c).count ? "\(c)-\(n + 1)" : nil
    }
    public func isExtra(_ c: Int) -> Bool { extras.contains(c) }
    public func world(of c: Int) -> Int { ((c % 100) - 1) % courseStep + 1 }
    public var playableWorlds: [Int] { worldOrder.filter(has(course:)) }
    public func courses(ofWorld w: Int) -> [Int] { (0..<Catalog.coursesPerWorld).map { w + $0 * courseStep }.filter(has(course:)) }
    public var allCourses: [Int] { worldOrder.flatMap(courses(ofWorld:)) + extras.filter(has(course:)) }
}
