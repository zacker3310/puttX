// The DS-style stroke (src/game.js computeStroke): touch the pad, pull down (the backswing), push back
// up through the spot you touched (contact). Stage px and seconds.
//   power   = backswing length / SWING_FULL, times tempo, times contact
//   tempo   = putter speed at contact against a smooth pendulum's for that backswing (length / TEMPO_T)
//   path    = the forward stroke's sideways drift starts the ball off line
//   contact = the crossing's sideways offset from the touch: off the sweet spot loses energy and twists the face
// The putter's Feel shapes only how a gesture becomes (angle, power), never the sim.
import Foundation

public enum Swing {
    public static let FULL = 240.0, DEAD = 16.0, TEMPO_T = 0.2, FACE_HALF = 40.0
    /// degrees of aim per stage px dragged across the course, and per tap of an aim button
    public static let AIM_DEG_PX = 0.12, NUDGE_DEG = 0.25
}

/// how forgiving the stroke is; each putter in the pro shop has its own
public struct Feel: Sendable, Codable, Equatable {
    public var sweet = 0.18, tempoDead = 0.22, tempoK = 0.18, pathK = 0.5, toeLoss = 0.15, twist = 4.0
    public init() {}
    public init(sweet: Double, tempoDead: Double, tempoK: Double, pathK: Double, toeLoss: Double, twist: Double) {
        self.sweet = sweet; self.tempoDead = tempoDead; self.tempoK = tempoK; self.pathK = pathK; self.toeLoss = toeLoss; self.twist = twist
    }
}

/// one touch sample on the pad
public struct PadSample: Sendable, Equatable {
    public var t: Double, x: Double, y: Double
    public init(t: Double, x: Double, y: Double) { self.t = t; self.x = x; self.y = y }
}

public struct Stroke: Sendable, Equatable {
    public let length: Double, base: Double, tempo: Double, tempoMul: Double, off: Double, contactMul: Double, path: Double
    /// 0...1
    public let power: Double
    /// degrees added to the aim
    public let turn: Double
    /// dead on: in the sweet spot, on tempo
    public let clean: Bool

    /// a pad gesture's samples (the first is the touch) to the stroke, or nil while there is no contact yet
    public static func from(_ s: [PadSample], feel: Feel = Feel()) -> Stroke? {
        guard s.count >= 3 else { return nil }
        let s0 = s[0]
        var L = 0.0, k = -1
        for i in 1..<s.count {
            let back = s[i].y - s0.y
            L = max(L, back)
            if L >= Swing.DEAD && back <= 0 && s[i - 1].y - s0.y > 0 { k = i; break }
        }
        if k < 0 || L < Swing.DEAD { return nil }
        let a = s[k - 1], b = s[k], u = (a.y - s0.y) / max(1e-6, a.y - b.y)
        let cx = a.x + (b.x - a.x) * u, ct = a.t + (b.t - a.t) * u
        var j = k - 1
        while j > 0 && ct - s[j - 1].t <= 0.05 && s[j - 1].y - s0.y > 0 { j -= 1 }
        let p = s[j], dt = max(0.008, ct - p.t), vx = (cx - p.x) / dt, vy = (p.y - s0.y) / dt
        let speed = max(1, vy), ideal = L / Swing.TEMPO_T, lg = log2(speed / ideal)
        let tempo = jsSign(lg) * max(0, abs(lg) - feel.tempoDead)
        let tempoMul = 1 + feel.tempoK * clamp(tempo, -1.5, 1.5)
        let off = (cx - s0.x) / Swing.FACE_HALF, offAbs = max(0, abs(off) - feel.sweet)
        let contactMul = 1 - feel.toeLoss * pow(min(1.5, offAbs), 2)
        let path = atan2(vx, max(1, vy)) * 180 / Double.pi
        let base = min(1, L / Swing.FULL)
        return Stroke(length: L, base: base, tempo: lg, tempoMul: tempoMul, off: off, contactMul: contactMul, path: path,
                      power: clamp(base * tempoMul * contactMul, 0, 1), turn: -(feel.pathK * path + feel.twist * jsSign(off) * offAbs),
                      clean: offAbs == 0 && tempo == 0)
    }
}

/// JS `+x.toFixed(digits)`: the nearest multiple of 10^-digits to the exact value of x, ties away from
/// zero. Every logged putt is rounded this way (beginPutt), so replays, ghosts and shared shots agree.
public func jsFixed(_ x: Double, _ digits: Int) -> Double {
    guard x.isFinite, abs(x) < 1e21 else { return x }
    // every finite double has a finite decimal expansion of at most 1074 digits after the point
    let exact = String(format: "%.\(digits + 1100)f", abs(x))
    let dot = exact.firstIndex(of: ".")!
    var keep = Array(exact[..<dot]) + Array(exact[exact.index(after: dot)...].prefix(digits))
    let next = exact[exact.index(dot, offsetBy: digits + 1)]
    if next >= "5" {
        var i = keep.count - 1
        while i >= 0 {
            if keep[i] == "9" { keep[i] = "0"; i -= 1 } else { keep[i] = Character(String(keep[i].wholeNumberValue! + 1)); break }
        }
        if i < 0 { keep.insert("1", at: 0) }
    }
    let intLen = keep.count - digits
    let text = String(keep[..<intLen]) + (digits > 0 ? "." + String(keep[intLen...]) : "")
    return (x < 0 || (x == 0 && x.sign == .minus) ? -1 : 1) * Double(text)!
}
