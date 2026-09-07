/* complex.js — minimal complex arithmetic.
 * Values are plain {re, im} objects. Kept dependency-free so the same file
 * runs in the browser and in JavaScriptCore for the numerical self-test.
 */
(function (root) {
  'use strict';

  const C = {
    of:   (re, im) => ({ re: re, im: im === undefined ? 0 : im }),
    add:  (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
    sub:  (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
    mul:  (a, b) => ({ re: a.re * b.re - a.im * b.im,
                       im: a.re * b.im + a.im * b.re }),
    scale:(a, s) => ({ re: a.re * s, im: a.im * s }),

    div: function (a, b) {
      // Smith's algorithm: avoids overflow when |b| is large or tiny.
      let r, den;
      if (Math.abs(b.re) >= Math.abs(b.im)) {
        r = b.im / b.re;  den = b.re + b.im * r;
        return { re: (a.re + a.im * r) / den, im: (a.im - a.re * r) / den };
      }
      r = b.re / b.im;    den = b.re * r + b.im;
      return { re: (a.re * r + a.im) / den, im: (a.im * r - a.re) / den };
    },

    inv:  (a)    => C.div({ re: 1, im: 0 }, a),
    abs:  (a)    => Math.hypot(a.re, a.im),
    arg:  (a)    => Math.atan2(a.im, a.re),

    /* exp(i*t) */
    expj: (t)    => ({ re: Math.cos(t), im: Math.sin(t) }),

    /* cos of a complex argument: cos(a+bi) = cos a cosh b - i sin a sinh b */
    cos: function (z) {
      return { re:  Math.cos(z.re) * Math.cosh(z.im),
               im: -Math.sin(z.re) * Math.sinh(z.im) };
    },

    /* parallel combination: 1/(1/a + 1/b + ...) */
    par: function () {
      let y = { re: 0, im: 0 };
      for (let i = 0; i < arguments.length; i++) y = C.add(y, C.inv(arguments[i]));
      return C.inv(y);
    },

    /* sum of any number of terms */
    sum: function () {
      let s = { re: 0, im: 0 };
      for (let i = 0; i < arguments.length; i++) s = C.add(s, arguments[i]);
      return s;
    },

    db:  (a) => 20 * Math.log10(Math.max(C.abs(a), 1e-12)),
    deg: (a) => C.arg(a) * 180 / Math.PI,

    /* unwrap a phase array given in degrees */
    unwrapDeg: function (p) {
      const out = p.slice();
      for (let i = 1; i < out.length; i++) {
        let d = out[i] - out[i - 1];
        while (d >  180) { out[i] -= 360; d = out[i] - out[i - 1]; }
        while (d < -180) { out[i] += 360; d = out[i] - out[i - 1]; }
      }
      return out;
    }
  };

  root.Cx = C;
})(typeof globalThis !== 'undefined' ? globalThis : this);
