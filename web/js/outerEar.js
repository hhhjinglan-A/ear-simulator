/* outerEar.js — port of outerEarResponse.m (unchanged from the outer-ear
 * assignment). Every formula and comment below mirrors the MATLAB source;
 * the numerical self-test compares the two directly.
 */
(function (root) {
  'use strict';
  const C = root.Cx;

  /* Direct port of outerEarResponse(p, f).
   * p : outer-ear parameter object (same field names as outerEarParams.m)
   * f : array of frequencies in Hz
   * returns { reflector, concha, canal, pinna, total, fHelmholtz, fCanal,
   *           fNotch, pathDiff, tau }  with complex arrays
   */
  function outerEarResponse(p, f) {
    const n = f.length, c = p.c;
    const reflector = new Array(n), concha = new Array(n),
          canal = new Array(n), pinna = new Array(n), total = new Array(n);

    /* ---- 1. concha as a parabolic reflector ---------------------------- */
    const aRef = p.reflectorDiameter / 2;

    /* ---- 2. concha cavity: Helmholtz resonance ------------------------- */
    const aAp  = p.conchaAperture / 2;
    const Aap  = Math.PI * aAp * aAp;
    const Leff = p.conchaDepth + 1.7 * aAp;          // 0.85a at each end
    const fH   = (c / (2 * Math.PI)) * Math.sqrt(Aap / (p.conchaVolume * Leff));
    const Amp  = Math.pow(10, p.conchaGainDb / 20);

    /* ---- 3. ear canal -------------------------------------------------- */
    const aC = p.canalDiameter / 2;
    const Lc = p.canalLength + 0.85 * aC;            // unflanged open end
    let L3 = 0, C1 = 0;
    if (p.canalModel === 'iec318') {
      const A0 = Math.PI * Math.pow(p.canalDiameter0 / 2, 2);
      const A  = Math.PI * Math.pow(p.canalDiameter  / 2, 2);
      const sL = (p.canalLength / p.canalLength0) * (A0 / A);
      const sC = (A * p.canalLength) / (A0 * p.canalLength0);
      L3 = p.L3 * sL;
      C1 = p.C1 * sC;
    }

    /* ---- 4. pinna reflection geometry ---------------------------------- */
    const az = p.azimuth   * Math.PI / 180;
    const el = p.elevation * Math.PI / 180;
    const s  = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
    const nv = p.pinnaNormal;
    const nn = Math.hypot(nv[0], nv[1], nv[2]);
    const cosPsi = (s[0] * nv[0] + s[1] * nv[1] + s[2] * nv[2]) / nn;
    const delta = p.pinnaPathBase * (1 + cosPsi);
    const tau   = delta / c;

    for (let i = 0; i < n; i++) {
      const fs = Math.max(f[i], 1e-9);               // guard DC
      const w  = 2 * Math.PI * fs;

      /* 1. reflector: gain rises with the size parameter ka */
      const ka = w * aRef / c;
      const gdB = p.reflectorGainMax * (ka * ka) / (1 + ka * ka);
      reflector[i] = C.of(Math.pow(10, gdB / 20), 0);

      /* 2. concha: resonant boost superimposed on the direct path,
       *    H = 1 + (A-1)*bandpass  -> exactly A at f_H, unity far away  */
      const r  = f[i] / fH;
      const num = C.of(0, r / p.conchaQ);
      const den = C.of(1 - r * r, r / p.conchaQ);
      concha[i] = C.add(C.of(1, 0), C.scale(C.div(num, den), Amp - 1));

      /* 3. canal */
      if (p.canalModel === 'iec318') {
        const jw  = C.of(0, w);
        const Zb2 = C.sum(C.inv(C.mul(jw, C.of(p.C2, 0))), C.mul(jw, C.of(p.L1, 0)), C.of(p.R2, 0));
        const Zb3 = C.sum(C.inv(C.mul(jw, C.of(p.C3, 0))), C.mul(jw, C.of(p.L2, 0)), C.of(p.R3, 0));
        const Y   = C.sum(C.of(1 / p.R1, 0), C.mul(jw, C.of(C1, 0)), C.inv(Zb2), C.inv(Zb3));
        const Zld = C.inv(Y);
        canal[i]  = C.div(Zld, C.add(Zld, C.mul(jw, C.of(L3, 0))));
      } else {
        /* quarter-wave tube closed by the eardrum: gain 1/cos(k L),
         * complex k supplies the loss that keeps the peaks finite */
        const k = C.of(w / c, -(w / c) / (2 * p.canalQ));
        canal[i] = C.inv(C.cos(C.scale(k, Lc)));
      }

      /* 4. pinna comb, with the reflection weighted by ka so that features
       *    cannot reflect wavelengths far larger than themselves */
      const kap = w * p.pinnaPathBase / c;
      const rho = p.pinnaStrength * (kap * kap) / (1 + kap * kap);
      pinna[i] = C.add(C.of(1, 0), C.scale(C.expj(-w * tau), rho));

      total[i] = C.mul(C.mul(reflector[i], concha[i]), C.mul(canal[i], pinna[i]));
    }

    const out = { reflector, concha, canal, pinna, total,
                  fHelmholtz: fH, pathDiff: delta, tau: tau };
    if (p.canalModel === 'iec318') {
      out.fCanal = [1 / (2 * Math.PI * Math.sqrt(L3 * C1))];
    } else {
      out.fCanal = [1, 2, 3].map(m => (2 * m - 1) * c / (4 * Lc));
    }
    out.fNotch = tau > 0
      ? (p.pinnaStrength >= 0 ? [1, 2, 3].map(m => (2 * m - 1) / (2 * tau))
                              : [1, 2, 3].map(m => m / tau))
      : [];
    return out;
  }

  root.OuterEar = { response: outerEarResponse };
})(typeof globalThis !== 'undefined' ? globalThis : this);
