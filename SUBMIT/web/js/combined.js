/* combined.js — cascade of the outer and middle ear.
 *
 *     H_total(f) = H_outer(f) * H_middle(f)
 *
 * Both factors are dimensionless PRESSURE ratios, which is what makes the
 * product meaningful. The assumptions this hides are listed in the app's
 * "Circuit & sources" tab and in combinedEarResponse.m; the loading ratio
 * returned here quantifies the main one.
 */
(function (root) {
  'use strict';
  const C = root.Cx;

  function combinedEarResponse(p1, p2, f) {
    const R1 = root.OuterEar.response(p1, f);
    const R2 = root.MiddleEar.response(p2, f);
    const total = f.map((_, i) => C.mul(R1.total[i], R2.total[i]));

    // Diagnostic for the no-reverse-loading assumption: the middle ear must
    // draw negligible volume velocity from the canal for the product to hold.
    const Acanal = Math.PI * Math.pow(p1.canalDiameter / 2, 2);
    const Zcanal = p1.rho * p1.c / Acanal;                  // Pa*s/m^3
    const loadingRatio = R2.inputImpedance.map(
      z => C.abs(z) * p2.Z_unitToSI / Zcanal);

    const g = total.map(C.db);
    const gi = g.indexOf(Math.max.apply(null, g));
    const pk = root.MiddleEar.refinePeak(f, g, gi);

    return { outer: R1, middle: R2,
             Houter: R1.total, Hmiddle: R2.total, total: total,
             f: f, Zcanal: Zcanal, loadingRatio: loadingRatio,
             peakGainDb: pk.y, fPeak: pk.f };
  }

  /* log-spaced frequency grid, matching logspace() in MATLAB */
  function logspace(f0, f1, n) {
    const a = Math.log10(f0), b = Math.log10(f1), out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = Math.pow(10, a + (b - a) * i / (n - 1));
    return out;
  }

  root.Combined = { response: combinedEarResponse, logspace: logspace };
})(typeof globalThis !== 'undefined' ? globalThis : this);
