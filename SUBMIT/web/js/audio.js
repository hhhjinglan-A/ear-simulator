/* audio.js — Web Audio audition.
 *
 * The impulse response is built exactly as combinedEarIR.m does: sample the
 * complex transfer function on the FFT bin grid, force real DC and Nyquist,
 * mirror to a Hermitian spectrum, inverse-transform, centre it, and apply a
 * Hann window.
 *
 * NORMALISATION IS REPORTED, NOT HIDDEN. The convolver runs with
 * normalize = false so the model's real gain is preserved; a single explicit
 * scalar is then applied to keep the output below full scale, and its value
 * in dB is shown in the UI. Comparing "original" with "through the ear"
 * therefore compares like with like apart from that one stated number.
 */
(function (root) {
  'use strict';
  const C = root.Cx;

  /* ---- minimal radix-2 inverse FFT (real output) --------------------- */
  function ifftReal(re, im) {
    const n = re.length;
    // conjugate, forward FFT, conjugate, scale  => inverse
    for (let i = 0; i < n; i++) im[i] = -im[i];
    fft(re, im);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = re[i] / n;
    return out;
  }
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t;
                   t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len;
      const wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ur = re[i + k],           ui = im[i + k];
          const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr;            im[i + k] = ui + vi;
          re[i + k + len / 2] = ur - vr;  im[i + k + len / 2] = ui - vi;
          const ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;         cr = ncr;
        }
      }
    }
  }

  /* Impulse response of the cascade — the JS twin of combinedEarIR.m */
  function combinedIR(p1, p2, fs, N) {
    N = N || 4096;
    const nf = N / 2 + 1, f = new Array(nf);
    for (let i = 0; i < nf; i++) f[i] = i * fs / N;
    const H = root.Combined.response(p1, p2, f).total;

    const re = new Float64Array(N), im = new Float64Array(N);
    re[0] = C.abs(H[0]); im[0] = 0;                      // real DC
    re[N / 2] = C.abs(H[nf - 1]); im[N / 2] = 0;         // real Nyquist
    for (let i = 1; i < nf - 1; i++) {
      re[i] = H[i].re;  im[i] = H[i].im;
      re[N - i] = H[i].re; im[N - i] = -H[i].im;         // Hermitian mirror
    }
    let ir = ifftReal(re, im);

    const shifted = new Float64Array(N);                  // centre it
    for (let i = 0; i < N; i++) shifted[i] = ir[(i + N / 2) % N];
    for (let i = 0; i < N; i++)                           // Hann window
      shifted[i] *= 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    return shifted;
  }

  /* ---- sources -------------------------------------------------------- */
  function makeSource(kind, fs, seconds) {
    const n = Math.round(fs * seconds), x = new Float32Array(n);
    if (kind === 'white') {
      for (let i = 0; i < n; i++) x[i] = 0.25 * (Math.random() * 2 - 1);
    } else if (kind === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.0990460;
        b1 = 0.96300 * b1 + w * 0.2965164;
        b2 = 0.57000 * b2 + w * 1.0526913;
        x[i] = 0.12 * (b0 + b1 + b2 + w * 0.1848);
      }
    } else if (kind === 'chirp') {
      const T = seconds, f0 = 20, f1 = 20000;
      const K = T * f0 / Math.log(f1 / f0), Lg = T / Math.log(f1 / f0);
      for (let i = 0; i < n; i++)
        x[i] = 0.25 * Math.sin(2 * Math.PI * K * (Math.exp(i / fs / Lg) - 1));
    } else {
      const step = Math.round(fs / 4);
      for (let i = 0; i < n; i += step) x[i] = 0.8;
    }
    return x;
  }

  /* ---- player --------------------------------------------------------- */
  function Player() { this.ctx = null; this.node = null; this.lastGainDb = 0; }

  Player.prototype._ctx = function () {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  };

  Player.prototype.stop = function () {
    if (this.node) { try { this.node.stop(); } catch (e) {} this.node = null; }
  };

  /* Play `data` (Float32Array or AudioBuffer channel) optionally convolved.
   * Returns { peakBefore, gainDb } so the UI can state the normalisation. */
  Player.prototype.play = function (data, fs, ir, volume) {
    this.stop();
    const ctx = this._ctx();
    let x = data;

    if (ir) {                                   // direct-form convolution
      const y = new Float32Array(x.length);
      const N = ir.length;
      for (let i = 0; i < x.length; i++) {
        let acc = 0;
        const kmax = Math.min(N, i + 1);
        for (let k = 0; k < kmax; k++) acc += ir[k] * x[i - k];
        y[i] = acc;
      }
      x = y;
    }

    let peak = 0;
    for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
    const target = 0.85;
    const g = peak > 0 ? Math.min(1, target / peak) : 1;
    this.lastGainDb = 20 * Math.log10(g || 1);
    this.lastPeak = peak;

    const buf = ctx.createBuffer(1, x.length, fs);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < x.length; i++) ch[i] = x[i] * g;

    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain(); gain.gain.value = volume;
    src.connect(gain); gain.connect(ctx.destination);
    src.start();
    this.node = src;
    return { peak: peak, gainDb: this.lastGainDb };
  };

  /* 16-bit mono WAV encoder, for downloading the impulse response */
  function encodeWav(samples, fs) {
    const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const put = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    put(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); put(8, 'WAVE');
    put(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, fs, true);
    v.setUint32(28, fs * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    put(36, 'data'); v.setUint32(40, n * 2, true);
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(samples[i]));
    const s = peak > 0 ? 0.99 / peak : 1;
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i] * s)) * 32767, true);
    return { blob: new Blob([buf], { type: 'audio/wav' }), scale: s };
  }

  root.EarAudio = { combinedIR, makeSource, Player, encodeWav };
})(typeof globalThis !== 'undefined' ? globalThis : this);
