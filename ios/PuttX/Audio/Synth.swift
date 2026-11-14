// Every sound in PuttX is synthesized, as on the web (src/game.js section 4): oscillators with
// exponential envelopes and pitch slides, and seeded noise through a biquad filter, mixed through one
// master gain and a soft limiter. Plus the ball's roll (a filtered rumble that follows its speed and
// what it rolls on) and the course's quiet soundscape (water, wind, birds by day, crickets by night).
// The audio session is ambient: the silent switch silences it, and other apps' music plays on.
import AVFoundation
import os

final class Synth: @unchecked Sendable {
    static let shared = Synth()

    enum Wave { case sine, triangle, square, sawtooth }
    enum Filter { case bandpass, lowpass, highpass }

    private struct Voice {
        enum Kind { case tone(Wave, Double, Double), noise(Biquad) }   // tone: wave, start freq, end freq
        var kind: Kind
        var start: Int, length: Int, vol: Double, attack: Int
        var phase = 0.0, noiseAt = 0
    }
    private struct Biquad {
        var b0 = 1.0, b1 = 0.0, b2 = 0.0, a1 = 0.0, a2 = 0.0, x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0
        init(_ type: Filter, freq: Double, q: Double, rate: Double) {
            let w = 2 * Double.pi * min(freq, rate * 0.45) / rate, alpha = sin(w) / (2 * max(q, 0.01)), c = cos(w), a0 = 1 + alpha
            switch type {
            case .bandpass: b0 = alpha / a0; b1 = 0; b2 = -alpha / a0
            case .lowpass: b0 = (1 - c) / 2 / a0; b1 = (1 - c) / a0; b2 = (1 - c) / 2 / a0
            case .highpass: b0 = (1 + c) / 2 / a0; b1 = -(1 + c) / a0; b2 = (1 + c) / 2 / a0
            }
            a1 = -2 * c / a0; a2 = (1 - alpha) / a0
        }
        mutating func run(_ x: Double) -> Double {
            let y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2 = x1; x1 = x; y2 = y1; y1 = y
            return y
        }
    }

    private let engine = AVAudioEngine()
    private var source: AVAudioSourceNode!
    private let rate: Double
    private let lock = OSAllocatedUnfairLock()
    private var voices: [Voice] = []
    private var pending: [Voice] = []
    private var clock = 0
    private let noiseBuf: [Double]
    // the roll and the ambient bed: continuous voices whose level glides to a target
    private var rollGain = 0.0, rollTarget = 0.0, rollCut = 380.0, rollCutTarget = 380.0, rollFilter: Biquad, rollAt = 0
    private var bedGain = 0.0, bedTarget = 0.0, bedFilter: Biquad, bedAt = 7919, bedLFO = 0.0, bedRate = 0.0, bedDepth = 0.0, bedFreq = 650.0, bedQ = 0.9, bedType = Filter.bandpass
    private var master = 0.8
    private var started = false

    private init() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.ambient, mode: .default)
        rate = session.sampleRate > 0 ? session.sampleRate : 48000
        // the web's noise: one second of a Park-Miller sequence from 99
        var s = 99.0, n: [Double] = []
        n.reserveCapacity(Int(rate))
        for _ in 0..<Int(rate) { s = (s * 16807).truncatingRemainder(dividingBy: 2147483647); n.append(s / 1073741823.5 - 1) }
        noiseBuf = n
        rollFilter = Biquad(.lowpass, freq: 700, q: 0.7, rate: rate)
        bedFilter = Biquad(.bandpass, freq: 650, q: 0.9, rate: rate)
        let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 1)!
        source = AVAudioSourceNode(format: format) { [unowned self] _, _, frames, abl in
            let buf = UnsafeMutableAudioBufferListPointer(abl)
            let out = buf[0].mData!.assumingMemoryBound(to: Float.self)
            self.render(out, Int(frames))
            return noErr
        }
        engine.attach(source)
        engine.connect(source, to: engine.mainMixerNode, format: format)
        NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] _ in self?.wake() }
    }

    /// starts (or restarts, after a call or the background) the engine. Starting it takes tens of ms,
    /// so it happens on a queue of its own; sounds asked for meanwhile wait in `pending` and play once
    /// it runs.
    private let starter = DispatchQueue(label: "puttx.audio.start", qos: .userInitiated)
    private var starting = false
    func wake() {
        guard !engine.isRunning else { return }
        let go = lock.withLock { () -> Bool in if starting { return false }; starting = true; return true }
        guard go else { return }
        starter.async { [self] in
            try? AVAudioSession.sharedInstance().setActive(true)
            try? engine.start()
            lock.withLock { started = engine.isRunning; starting = false }
        }
    }
    var enabled = true { didSet { lock.withLock { master = enabled ? 0.8 : 0 } } }

    // MARK: voices
    func tone(_ freq: Double, _ dur: Double, wave: Wave = .sine, vol: Double = 0.3, slide: Double = 0, delay: Double = 0) {
        wake()
        let v = Voice(kind: .tone(wave, freq, max(30, freq + slide)), start: Int(delay * rate), length: max(1, Int(dur * rate)), vol: vol, attack: Int(0.008 * rate))
        lock.withLock { pending.append(v) }
    }
    func noise(_ dur: Double, vol: Double = 0.2, freq: Double = 2000, q: Double = 1, type: Filter = .bandpass, delay: Double = 0) {
        wake()
        var v = Voice(kind: .noise(Biquad(type, freq: freq, q: q, rate: rate)), start: Int(delay * rate), length: max(1, Int(dur * rate)), vol: vol, attack: 0)
        v.noiseAt = Int.random(in: 0..<(Int(rate) / 2))
        lock.withLock { pending.append(v) }
    }
    /// the ball's roll: louder and brighter with speed, coloured by the surface (0 silences it)
    func roll(speed: Double, surface: String) {
        let (f, k): (Double, Double) = ["fast": (900, 0.05), "ice": (3200, 0.03), "sand": (1500, 0.07), "mud": (220, 0.06), "water": (600, 0)][surface] ?? (380, 0.045)
        lock.withLock { rollTarget = min(0.11, k * max(0, speed).squareRoot()); rollCutTarget = f * (0.6 + 0.4 * min(2.5, speed)) }
    }
    /// the course's bed: water burbles, or wind blows; nil for quiet
    func bed(water: Bool, wind: Bool) {
        lock.withLock {
            if !water && !wind { bedTarget = 0; return }
            bedType = water ? .bandpass : .lowpass; bedFreq = water ? 650 : 380; bedQ = water ? 0.9 : 0.5
            bedRate = water ? 3.1 : 0.13; bedDepth = water ? 260 : 160; bedTarget = water ? 0.025 : 0.03
        }
    }

    // MARK: render (the audio thread)
    private func render(_ out: UnsafeMutablePointer<Float>, _ n: Int) {
        lock.withLock { renderLocked(out, n) }
    }
    private func renderLocked(_ out: UnsafeMutablePointer<Float>, _ n: Int) {
        let now = clock
        for var p in pending { p.start += now; voices.append(p) }
        pending.removeAll(keepingCapacity: true)
        for i in 0..<n { out[i] = 0 }
        var keep: [Voice] = []
        keep.reserveCapacity(voices.count)
        for var v in voices {
            let end = v.start + v.length
            if now + n <= v.start { keep.append(v); continue }
            for i in 0..<n {
                let t = now + i
                if t < v.start || t >= end { continue }
                let k = t - v.start, u = Double(k) / Double(v.length)
                // exponential envelope: up to vol in 8 ms (tones), then down to 0.0001 at the end
                var env = v.vol * pow(0.0001 / v.vol, u)
                if v.attack > 0 && k < v.attack { env = 0.0001 * pow(v.vol / 0.0001, Double(k) / Double(v.attack)) }
                var s = 0.0
                switch v.kind {
                case .tone(let w, let f0, let f1):
                    let f = f0 * pow(f1 / f0, u)
                    v.phase += f / rate
                    v.phase -= v.phase.rounded(.down)
                    switch w {
                    case .sine: s = sin(2 * .pi * v.phase)
                    case .triangle: s = 1 - 4 * abs(v.phase - 0.5)
                    case .square: s = v.phase < 0.5 ? 0.6 : -0.6
                    case .sawtooth: s = 0.7 * (2 * v.phase - 1)
                    }
                case .noise(var bq):
                    s = bq.run(noiseBuf[v.noiseAt % noiseBuf.count]); v.noiseAt += 1
                    v.kind = .noise(bq)
                }
                out[i] += Float(s * env)
            }
            if end > now + n { keep.append(v) }
        }
        voices = keep
        // the roll
        for i in 0..<n {
            rollGain += (rollTarget - rollGain) * 0.0006; rollCut += (rollCutTarget - rollCut) * 0.0005
            if i % 64 == 0 { let st = (rollFilter.x1, rollFilter.x2, rollFilter.y1, rollFilter.y2); rollFilter = Biquad(.lowpass, freq: rollCut, q: 0.7, rate: rate); (rollFilter.x1, rollFilter.x2, rollFilter.y1, rollFilter.y2) = st }
            if rollGain > 1e-5 { out[i] += Float(rollFilter.run(noiseBuf[rollAt % noiseBuf.count]) * rollGain) }
            rollAt += 1
        }
        // the bed, its filter swaying
        for i in 0..<n {
            bedGain += (bedTarget - bedGain) * 0.00002
            if bedGain > 1e-5 {
                if i % 64 == 0 {
                    bedLFO += bedRate * 64 / rate
                    let st = (bedFilter.x1, bedFilter.x2, bedFilter.y1, bedFilter.y2)
                    bedFilter = Biquad(bedType, freq: bedFreq + bedDepth * sin(2 * .pi * bedLFO), q: bedQ, rate: rate)
                    (bedFilter.x1, bedFilter.x2, bedFilter.y1, bedFilter.y2) = st
                }
                out[i] += Float(bedFilter.run(noiseBuf[bedAt % noiseBuf.count]) * bedGain)
            }
            bedAt += 1
        }
        // master and a soft limiter in place of the web's compressor
        let m = Float(master)
        for i in 0..<n { out[i] = tanhf(out[i] * m * 1.2) / 1.2 }
        clock += n
    }
}

/// the web's sound recipes (src/game.js SFX)
enum SFX {
    static var s: Synth { Synth.shared }
    /// neon night's beat (src/game.js neonBeat), 118 to the minute: a kick, an offbeat hat, a bass line,
    /// a clap every fourth. `n` counts beats; `d` is how far ahead it falls
    static let bpm = 118.0
    static func beat(_ n: Int, in d: Double) {
        let step = 60 / bpm, bass = [55.0, 55, 65.4, 49, 55, 73.4, 65.4, 49]
        s.tone(110, 0.22, vol: 0.22, slide: -70, delay: d)
        s.noise(0.04, vol: 0.05, freq: 8000, q: 0.8, type: .highpass, delay: d + step / 2)
        s.tone(bass[n % bass.count], step * 0.45, wave: .sawtooth, vol: 0.045, delay: d + step / 2)
        if n % 4 == 3 { s.noise(0.12, vol: 0.07, freq: 1800, q: 0.7, delay: d) }
    }
    /// a clean strike rings; a toe or heel strike thuds
    static func putt(_ p: Double, clean: Bool) {
        let c = clean ? 1.0 : 0
        s.noise(0.03, vol: 0.25 + p * 0.3, freq: 2200 + 1500 * c, q: 2)
        s.tone(500 + p * 400 + c * 300, 0.06, wave: .triangle, vol: 0.2 + p * 0.2, slide: -300)
    }
    /// a wall knock sounds like what the border is made of
    static func clonk(_ v: Double, wall: String) {
        let k = min(v, 4), vol = min(0.45, 0.12 + v * 0.1)
        switch wall {
        case "steel":
            s.tone(1400 + k * 90, 0.12, wave: .triangle, vol: vol * 0.5); s.tone(2950 + k * 120, 0.18, vol: vol * 0.18); s.noise(0.02, vol: vol * 0.5, freq: 4200, q: 3)
        case "stone", "brick", "marble":
            s.noise(0.03, vol: vol * 0.9, freq: 2400, q: 2.2); s.tone(620 + k * 40, 0.04, wave: .triangle, vol: vol * 0.5)
        case "paint": s.tone(520 + k * 50, 0.06, vol: vol * 0.8, slide: -120)
        default: s.tone(330 + k * 30, 0.07, wave: .triangle, vol: vol); s.noise(0.025, vol: vol * 0.45, freq: 900, q: 2)
        }
    }
    /// a bumper or a mover: a short dull knock, not a cartoon spring
    static func boing(_ v: Double) { let vol = min(0.3, 0.08 + v * 0.07); s.tone(190 + min(v, 4) * 15, 0.06, wave: .triangle, vol: vol, slide: -40); s.noise(0.03, vol: vol * 0.4, freq: 600, q: 1.5) }
    static func cup() { s.tone(1500, 0.04, wave: .triangle, vol: 0.12, slide: -300) }
    static func rattle(_ v: Double) { s.tone(1900 - v * 500, 0.035, wave: .triangle, vol: 0.05 + v * 0.07); s.noise(0.04, vol: 0.08 + v * 0.1, freq: 3200, q: 4) }
    static func plunk() { s.tone(150, 0.32, vol: 0.55, slide: -70); s.tone(300, 0.12, wave: .triangle, vol: 0.18, slide: -120); s.noise(0.09, vol: 0.3, freq: 420, q: 1.2, type: .lowpass) }
    static func lip() { s.tone(1100, 0.03, wave: .triangle, vol: 0.06); s.noise(0.02, vol: 0.05, freq: 2600, q: 3) }
    static func land(_ v: Double) { s.noise(0.08, vol: min(0.4, 0.12 + v * 0.08), freq: 400) }
    static func boink() { s.tone(420, 0.25, vol: 0.3, slide: -220) }
    static func splash() { s.noise(0.35, vol: 0.35, freq: 900, q: 0.7); s.noise(0.2, vol: 0.2, freq: 2600, q: 1, delay: 0.05) }
    static func tube() { s.noise(0.3, vol: 0.12, freq: 260, q: 0.8, type: .lowpass) }
    static func tubeOut() { s.noise(0.06, vol: 0.12, freq: 380, q: 1, type: .lowpass) }
    static func tap() { s.tone(660, 0.05, wave: .triangle, vol: 0.18) }
    static func tick() { s.tone(1200, 0.02, wave: .square, vol: 0.05) }
    static func star(_ i: Int) { s.tone([784, 988, 1175][min(i, 2)], 0.22, wave: .triangle, vol: 0.25) }
    static func coin() { s.tone(988, 0.07, wave: .square, vol: 0.08); s.tone(1319, 0.14, wave: .square, vol: 0.08, delay: 0.07) }
    static func jingle(_ notes: [Double]) { for (i, f) in notes.enumerated() { s.tone(f, 0.16, wave: .triangle, vol: 0.18, delay: Double(i) * 0.11) } }
    static func fanfare() { for (i, f) in [523.0, 659, 784, 1047, 1319].enumerated() { s.tone(f, 0.22, wave: .square, vol: 0.12, delay: Double(i) * 0.09) } }
    /// the clubhouse bell on the last hole; three times for an ace
    static func bell(ace: Bool) {
        for i in 0..<(ace ? 3 : 1) {
            let d = Double(i) * 0.28
            s.tone(1568, 1.2, vol: 0.16, delay: d); s.tone(3920, 0.6, vol: 0.05, delay: d); s.tone(784, 1.4, wave: .triangle, vol: 0.08, delay: d)
        }
    }
    static func place() { s.tone(880, 0.04, wave: .triangle, vol: 0.1); s.noise(0.03, vol: 0.08, freq: 1200, q: 2, delay: 0.12) }
    /// off: synthesised birds and crickets read as bleeps, not wildlife
    static let ambient = false
    /// birdsong (by day) and crickets (by night), now and then
    static func ambientCall(birds: Double, crickets: Double) {
        guard ambient else { return }
        if birds > 0 && Double.random(in: 0..<1) < 0.35 * birds {
            let f0 = 2400 + Double.random(in: 0..<1800), n = 2 + Int.random(in: 0..<3)
            for i in 0..<n { s.tone(f0 + (i % 2 == 1 ? 380 : 0), 0.07, vol: 0.018, slide: (Double.random(in: 0..<1) - 0.3) * 900, delay: Double(i) * 0.11) }
        }
        if crickets > 0 && Double.random(in: 0..<1) < 0.6 { for i in 0..<6 { s.tone(4400, 0.025, wave: .square, vol: 0.006, delay: Double(i) * 0.045) } }
    }
}
