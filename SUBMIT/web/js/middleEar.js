/* middleEar.js — port of the Pascal et al. (1998) Fig. 1 ladder network.
 *
 * Mirrors Z_cavity.m, Z_eardrum.m, Z_ossicles.m, Z_joint.m, Z_stapes.m,
 * Z_cochlea.m and middleEarResponse.m. Impedances are in CGS acoustic ohms
 * (1 ohm = 1 dyn*s/cm^5); multiply by p.Z_unitToSI = 1e5 for Pa*s/m^3.
 *
 *      p_t o--[Z_cavity]--o--[Z_ossicles]--o--[Z_stapes]--o
 *                   node1 |         node2 |        node3 |
 *                    [Z_eardrum]     [Z_joint]     [Z_cochlea]  <- p_c here
 *                         |               |             |
 *                        gnd             gnd           gnd
 */
(function (root) {
  'use strict';
  const C = root.Cx;

  const jw = w => C.of(0, w);
  const R  = r => C.of(r, 0);
  const L  = (w, l) => C.of(0, w * l);
  const Ca = (w, c) => C.of(0, -1 / (w * c));   // 1/(jwC)

  /* --- the six blocks, one function each, matching the MATLAB files --- */

  // Middle-ear cavities. SERIES. Three branches in parallel:
  //   (L_a + C_cp + R_a) || R_cm || C_cm
  function Z_cavity(w, p) {
    return C.par(C.sum(L(w, p.L_a), Ca(w, p.C_cp), R(p.R_a)),
                 R(p.R_cm),
                 Ca(w, p.C_cm));
  }

  // Eardrum losses. SHUNT at node 1 (taps BEFORE C_te). One series chain
  // containing two parallel sub-blocks.
  function Z_eardrum(w, p) {
    return C.sum(R(p.R_ti1), Ca(w, p.C_ti1),
                 C.par(C.add(Ca(w, p.C_ti2), R(p.R_ti2)), L(w, p.L_ti)),
                 C.par(R(p.R_ti3), Ca(w, p.C_ti3)));
  }

  // Eardrum + malleus + incus. SERIES main path.
  function Z_ossicles(w, p) {
    return C.sum(R(p.R_te), L(w, p.L_te), Ca(w, p.C_te));
  }

  // Incudo-stapedial joint. SHUNT at node 2 (taps BEFORE L_s).
  function Z_joint(w, p) {
    return C.add(R(p.R_is), Ca(w, p.C_is));
  }

  // Stapes + acoustic reflex + annular ligament + vestibular volume. SERIES.
  // invC_st is 1/C_st and is 0 at rest ("the capacitance is infinite for no
  // reflex response"), so that term vanishes without forming 1/(jw*Inf).
  function Z_stapes(w, p) {
    return C.sum(L(w, p.L_s),
                 C.of(0, -p.invC_st / w),
                 R(p.R_la), Ca(w, p.C_la),
                 L(w, p.L_v));
  }

  // Cochlea and helicotrema: the TERMINAL LOAD. p_c is taken across this
  // block alone, not across the stapes chain as well.
  function Z_cochlea(w, p) {
    return C.par(R(p.R_co), C.add(R(p.R_h), L(w, p.L_h)));
  }


  /* Refine a discrete maximum to sub-bin accuracy by fitting a parabola to
   * the peak bin and its two neighbours, in log-frequency and dB. Without
   * this a peak that moves less than one grid step reports as not moving at
   * all, which matters for experiments E1 and E3 where the SHIFT is the
   * observation. Returns { f, y }. */
  function refinePeak(f, y, i) {
    if (i <= 0 || i >= f.length - 1) return { f: f[i], y: y[i] };
    const x0 = Math.log10(f[i - 1]), x1 = Math.log10(f[i]), x2 = Math.log10(f[i + 1]);
    const y0 = y[i - 1], y1 = y[i], y2 = y[i + 1];
    const d = (x0 - x1) * (x0 - x2) * (x1 - x2);
    if (!isFinite(d) || d === 0) return { f: f[i], y: y[i] };
    const A = (x2 * (y1 - y0) + x1 * (y0 - y2) + x0 * (y2 - y1)) / d;
    const B = (x2 * x2 * (y0 - y1) + x1 * x1 * (y2 - y0) + x0 * x0 * (y1 - y2)) / d;
    if (A >= 0) return { f: f[i], y: y[i] };
    const xv = -B / (2 * A);
    if (xv < x0 || xv > x2) return { f: f[i], y: y[i] };
    const Cc = y1 - A * x1 * x1 - B * x1;
    return { f: Math.pow(10, xv), y: A * xv * xv + B * xv + Cc };
  }

  /* --- the ladder ----------------------------------------------------- */
  function middleEarResponse(p, f) {
    const n = f.length;
    const out = {
      Zcavity: [], Zeardrum: [], Zossicles: [], Zjoint: [], Zstapes: [],
      Zcochlea: [], inputImpedance: [], total: [],
      cavity: [], ossicles: [], stapes: [], eardrum: [], joint: []
    };
    const series = (p.cavityPlacement || 'series') === 'series';
    const Zsrc = p.Z_source || 0;

    for (let i = 0; i < n; i++) {
      const w = 2 * Math.PI * Math.max(f[i], 1e-9);

      const Zcav = Z_cavity(w, p),  Zed  = Z_eardrum(w, p);
      const Zoss = Z_ossicles(w, p), Zjt = Z_joint(w, p);
      const Zsta = Z_stapes(w, p),  Zco  = Z_cochlea(w, p);

      // collapse from the load backwards
      const Z3 = Zco;
      const Z2 = C.par(Zjt, C.add(Zsta, Z3));
      const Z1 = C.par(Zed, C.add(Zoss, Z2));

      let Zin, srcDiv;
      if (series) {
        Zin    = C.add(Zcav, Z1);
        srcDiv = C.div(Z1, C.add(C.of(Zsrc, 0), C.add(Zcav, Z1)));
      } else {
        Zin    = C.par(Zcav, Z1);
        srcDiv = Zsrc === 0 ? C.of(1, 0) : C.div(Zin, C.add(C.of(Zsrc, 0), Zin));
      }

      const fCav = srcDiv;                                   // p_t   -> node1
      const fOss = C.div(Z2, C.add(Zoss, Z2));               // node1 -> node2
      const fSta = C.div(Z3, C.add(Zsta, Z3));               // node2 -> node3

      out.Zcavity[i]   = Zcav;  out.Zeardrum[i]  = Zed;
      out.Zossicles[i] = Zoss;  out.Zjoint[i]    = Zjt;
      out.Zstapes[i]   = Zsta;  out.Zcochlea[i]  = Zco;
      out.inputImpedance[i] = Zin;
      out.cavity[i] = fCav; out.ossicles[i] = fOss; out.stapes[i] = fSta;

      // current-division diagnostics: how much each shunt diverts. These are
      // complex dividers, so their magnitude is NOT bounded by 1.
      out.eardrum[i] = C.div(Zed, C.add(Zed, C.add(Zoss, Z2)));
      out.joint[i]   = C.div(Zjt, C.add(Zjt, C.add(Zsta, Z3)));

      // the transformer T_r is not drawn in Fig. 1 but must be applied once
      out.total[i] = C.scale(C.mul(C.mul(fCav, fOss), fSta), p.N);
    }

    // first LOCAL minimum of |Zin| above 200 Hz (the global minimum is the
    // band edge, not the middle-ear resonance)
    const az = out.inputImpedance.map(C.abs);
    let loc = -1;
    for (let i = 1; i < n - 1; i++) {
      if (f[i] > 200 && az[i] < az[i - 1] && az[i] < az[i + 1]) { loc = i; break; }
    }
    if (loc < 0) loc = az.indexOf(Math.min.apply(null, az));
    // refine the minimum the same way, by maximising -|Zin| in dB
    out.fResonance = refinePeak(f, az.map(v => -20 * Math.log10(v)), loc).f;

    const g = out.total.map(C.db);
    const gi = g.indexOf(Math.max.apply(null, g));
    const pk = refinePeak(f, g, gi);
    out.peakGainDb = pk.y;
    out.fPeak = pk.f;
    out.f = f;
    return out;
  }

  root.MiddleEar = {
    response: middleEarResponse,
    refinePeak: refinePeak,
    blocks: { Z_cavity, Z_eardrum, Z_ossicles, Z_joint, Z_stapes, Z_cochlea }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
