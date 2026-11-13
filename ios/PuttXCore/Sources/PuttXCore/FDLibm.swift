// sin, cos and exp to the bit: fdlibm in plain arithmetic, a line-for-line port of the sim's own
// dsin, dcos and dexp (src/game.js). The platform's sin and exp may differ in the last bit; these
// give exactly what Node gives, so a line the solver proves in JS rolls the same on an iPhone.
import Foundation

@inline(__always) private func hi(_ x: Double) -> Int32 { Int32(truncatingIfNeeded: Int64(bitPattern: x.bitPattern) >> 32) }
@inline(__always) private func withHi(_ x: Double, _ h: Int32) -> Double {
    Double(bitPattern: (UInt64(UInt32(bitPattern: h)) << 32) | (x.bitPattern & 0xffff_ffff))
}
@inline(__always) private func fromWords(_ h: Int32, _ l: UInt32) -> Double {
    Double(bitPattern: (UInt64(UInt32(bitPattern: h)) << 32) | UInt64(l))
}

private let S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04
private let S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10
private func ksin(_ x: Double, _ y: Double, _ iy: Int) -> Double {
    let ix = hi(x) & 0x7fff_ffff
    if ix < 0x3e40_0000 && x.rounded(.towardZero) == 0 { return x }
    let z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)))
    return iy == 0 ? x + v * (S1 + z * r) : x - ((z * (0.5 * y - v * r) - y) - v * S1)
}
private let C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05
private let C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11
private func kcos(_ x: Double, _ y: Double) -> Double {
    let ix = hi(x) & 0x7fff_ffff
    if ix < 0x3e40_0000 && x.rounded(.towardZero) == 0 { return 1 }
    let z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))))
    if ix < 0x3FD3_3333 { return 1 - (0.5 * z - (z * r - x * y)) }
    let qx = ix > 0x3fe9_0000 ? 0.28125 : fromWords(ix - 0x0020_0000, 0), hz = 0.5 * z - qx, a = 1 - qx
    return a - (hz - (z * r - x * y))
}
private let pio2_1 = 1.57079632673412561417e+00, pio2_1t = 6.07710050650619224932e-11, pio2_2 = 6.07710050630396597660e-11
private let pio2_2t = 2.02226624879595063154e-21, pio2_3 = 2.02226624871116645580e-21, pio2_3t = 8.47842766036889956997e-32
private let invpio2 = 6.36619772367581382433e-01
private let NPIO2: [Int32] = [0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C, 0x4025FDBB, 0x402921FB,
                              0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C, 0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB,
                              0x403AB41B, 0x403C463A, 0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C,
                              0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB, 0x404858EB, 0x404921FB]

/// x reduced by multiples of pi/2: (n, y0, y1). |x| <= 2^19 pi/2 only.
private func remPio2(_ x: Double) -> (Int, Double, Double) {
    let hx = hi(x), ix = hx & 0x7fff_ffff
    if ix <= 0x3fe9_21fb { return (0, x, 0) }
    if ix < 0x4002_d97c {
        var z: Double, y0: Double, y1: Double
        if hx > 0 {
            z = x - pio2_1
            if ix != 0x3ff9_21fb { y0 = z - pio2_1t; y1 = (z - y0) - pio2_1t } else { z -= pio2_2; y0 = z - pio2_2t; y1 = (z - y0) - pio2_2t }
            return (1, y0, y1)
        }
        z = x + pio2_1
        if ix != 0x3ff9_21fb { y0 = z + pio2_1t; y1 = (z - y0) + pio2_1t } else { z += pio2_2; y0 = z + pio2_2t; y1 = (z - y0) + pio2_2t }
        return (-1, y0, y1)
    }
    var t = abs(x)
    let n = Int(Int32(truncatingIfNeeded: Int((t * invpio2 + 0.5).rounded(.towardZero)))), fn = Double(n)
    var r = t - fn * pio2_1, w = fn * pio2_1t, y0: Double
    if n < 32 && ix != NPIO2[n - 1] { y0 = r - w } else {
        let j = Int(ix >> 20); y0 = r - w; var i = j - Int((hi(y0) >> 20) & 0x7ff)
        if i > 16 {
            t = r; w = fn * pio2_2; r = t - w; w = fn * pio2_2t - ((t - r) - w); y0 = r - w; i = j - Int((hi(y0) >> 20) & 0x7ff)
            if i > 49 { t = r; w = fn * pio2_3; r = t - w; w = fn * pio2_3t - ((t - r) - w); y0 = r - w }
        }
    }
    let y1 = (r - y0) - w
    if hx < 0 { return (-n, -y0, -y1) }
    return (n, y0, y1)
}

public func dsin(_ x: Double) -> Double {
    let ix = hi(x) & 0x7fff_ffff
    if ix > 0x4139_21fb { return Foundation.sin(x) }
    if ix <= 0x3fe9_21fb { return ksin(x, 0, 0) }
    let (n, y0, y1) = remPio2(x)
    switch n & 3 {
    case 0: return ksin(y0, y1, 1)
    case 1: return kcos(y0, y1)
    case 2: return -ksin(y0, y1, 1)
    default: return -kcos(y0, y1)
    }
}
public func dcos(_ x: Double) -> Double {
    let ix = hi(x) & 0x7fff_ffff
    if ix > 0x4139_21fb { return Foundation.cos(x) }
    if ix <= 0x3fe9_21fb { return kcos(x, 0) }
    let (n, y0, y1) = remPio2(x)
    switch n & 3 {
    case 0: return kcos(y0, y1)
    case 1: return -ksin(y0, y1, 1)
    case 2: return -kcos(y0, y1)
    default: return ksin(y0, y1, 1)
    }
}

private let ln2HI = [6.93147180369123816490e-01, -6.93147180369123816490e-01], ln2LO = [1.90821492927058770002e-10, -1.90821492927058770002e-10]
private let invln2 = 1.44269504088896338700e+00
private let P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05
private let P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08, twom1000 = 9.33263618503218878990e-302

public func dexp(_ x0: Double) -> Double {
    var x = x0, hx = hi(x)
    let xsb = Int((UInt32(bitPattern: hx) >> 31) & 1)
    hx &= 0x7fff_ffff
    var k = 0, hiv = 0.0, lo = 0.0
    if hx >= 0x4086_2E42 {
        if x.isNaN { return x }
        if x > 7.09782712893383973096e+02 { return .infinity }
        if x < -7.45133219101941108420e+02 { return 0 }
    }
    if hx > 0x3fd6_2e42 {
        if hx < 0x3FF0_A2B2 { hiv = x - ln2HI[xsb]; lo = ln2LO[xsb]; k = 1 - xsb - xsb }
        else {
            k = Int((invln2 * x + (xsb != 0 ? -0.5 : 0.5)).rounded(.towardZero))
            let t = Double(k); hiv = x - t * ln2HI[0]; lo = t * ln2LO[0]
        }
        x = hiv - lo
    } else if hx < 0x3e30_0000 { return 1 + x }
    let t = x * x, c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))))
    if k == 0 { return 1 - ((x * c) / (c - 2.0) - x) }
    let y = 1 - ((lo - (x * c) / (2.0 - c)) - hiv)
    if k >= -1021 { return withHi(y, Int32(truncatingIfNeeded: Int(hi(y)) + (k << 20))) }
    return withHi(y, Int32(truncatingIfNeeded: Int(hi(y)) + ((k + 1000) << 20))) * twom1000
}
