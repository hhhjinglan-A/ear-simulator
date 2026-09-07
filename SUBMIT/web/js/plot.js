/* plot.js — dependency-free canvas plotter with a logarithmic frequency
 * axis. No charting library, so the page has no CDN dependency and works
 * offline and on GitHub Pages without a build step.
 */
(function (root) {
  'use strict';

  function niceTicksLinear(lo, hi, target) {
    const span = hi - lo;
    if (!(span > 0)) return [lo];
    const raw = span / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
    return out;
  }

  function Plot(canvas, opts) {
    this.canvas = canvas;
    this.o = Object.assign({
      xMin: 20, xMax: 20000, yMin: null, yMax: null,
      yLabel: '', xLabel: 'Frequency (Hz)', yLog: false,
      pad: { l: 62, r: 12, t: 10, b: 34 }
    }, opts || {});
    this.series = [];
    this.hover = null;
    const self = this;
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      self.hover = { x: e.clientX - r.left, y: e.clientY - r.top };
      self.draw();
    });
    canvas.addEventListener('mouseleave', () => { self.hover = null; self.draw(); });
  }

  Plot.prototype.setSeries = function (s) { this.series = s; this.draw(); };

  Plot.prototype._x = function (f, w) {
    const a = Math.log10(this.o.xMin), b = Math.log10(this.o.xMax);
    return this.o.pad.l + (Math.log10(f) - a) / (b - a) * w;
  };
  Plot.prototype._invX = function (px, w) {
    const a = Math.log10(this.o.xMin), b = Math.log10(this.o.xMax);
    return Math.pow(10, a + (px - this.o.pad.l) / w * (b - a));
  };
  Plot.prototype._y = function (v, h, lo, hi) {
    if (this.o.yLog) {
      const a = Math.log10(lo), b = Math.log10(hi);
      return this.o.pad.t + (1 - (Math.log10(Math.max(v, 1e-30)) - a) / (b - a)) * h;
    }
    return this.o.pad.t + (1 - (v - lo) / (hi - lo)) * h;
  };

  Plot.prototype.draw = function () {
    const cv = this.canvas, dpr = window.devicePixelRatio || 1;
    const cssW = cv.clientWidth, cssH = cv.clientHeight;
    if (cv.width !== cssW * dpr || cv.height !== cssH * dpr) {
      cv.width = cssW * dpr; cv.height = cssH * dpr;
    }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cssW, cssH);

    const P = this.o.pad;
    const w = cssW - P.l - P.r, h = cssH - P.t - P.b;
    if (w <= 10 || h <= 10) return;

    const vis = this.series.filter(s => s.visible !== false && s.data && s.data.length);

    /* y range */
    let lo = this.o.yMin, hi = this.o.yMax;
    if (lo === null || hi === null) {
      let mn = Infinity, mx = -Infinity;
      for (const s of vis) for (const p of s.data) {
        if (!isFinite(p.y)) continue;
        if (this.o.yLog && p.y <= 0) continue;
        if (p.y < mn) mn = p.y; if (p.y > mx) mx = p.y;
      }
      if (!isFinite(mn)) { mn = 0; mx = 1; }
      if (this.o.yLog) {
        lo = Math.pow(10, Math.floor(Math.log10(mn)));
        hi = Math.pow(10, Math.ceil(Math.log10(mx)));
      } else {
        const m = (mx - mn) * 0.08 || 1;
        lo = Math.floor((mn - m) / 5) * 5; hi = Math.ceil((mx + m) / 5) * 5;
      }
    }
    this._lo = lo; this._hi = hi;

    /* grid */
    g.font = '11px system-ui, -apple-system, sans-serif';
    g.strokeStyle = 'rgba(128,128,140,0.22)'; g.fillStyle = '#6b7280';
    g.lineWidth = 1;
    const decades = [];
    for (let d = Math.floor(Math.log10(this.o.xMin)); d <= Math.ceil(Math.log10(this.o.xMax)); d++)
      for (let m = 1; m <= 9; m++) {
        const f = m * Math.pow(10, d);
        if (f >= this.o.xMin && f <= this.o.xMax) decades.push({ f, major: m === 1 });
      }
    for (const t of decades) {
      const x = this._x(t.f, w);
      g.beginPath();
      g.strokeStyle = t.major ? 'rgba(128,128,140,0.38)' : 'rgba(128,128,140,0.14)';
      g.moveTo(x, P.t); g.lineTo(x, P.t + h); g.stroke();
      if (t.major || t.f === 200 || t.f === 500 || t.f === 2000 || t.f === 5000) {
        const lbl = t.f >= 1000 ? (t.f / 1000) + 'k' : '' + t.f;
        g.textAlign = 'center'; g.fillText(lbl, x, P.t + h + 15);
      }
    }
    let yt;
    if (this.o.yLog) {
      yt = [];
      for (let d = Math.log10(lo); d <= Math.log10(hi) + 1e-9; d++) yt.push(Math.pow(10, d));
    } else yt = niceTicksLinear(lo, hi, 6);
    g.textAlign = 'right';
    for (const v of yt) {
      const y = this._y(v, h, lo, hi);
      g.beginPath(); g.strokeStyle = 'rgba(128,128,140,0.22)';
      g.moveTo(P.l, y); g.lineTo(P.l + w, y); g.stroke();
      const lbl = this.o.yLog ? (Math.log10(v) >= 0 ? '1e' + Math.round(Math.log10(v)) : v.toExponential(0))
                              : (Math.abs(v) < 1e-9 ? '0' : v.toFixed(0));
      g.fillStyle = '#6b7280'; g.fillText(lbl, P.l - 7, y + 4);
    }

    /* axis labels */
    g.fillStyle = '#374151'; g.textAlign = 'center';
    g.fillText(this.o.xLabel, P.l + w / 2, cssH - 4);
    g.save(); g.translate(13, P.t + h / 2); g.rotate(-Math.PI / 2);
    g.fillText(this.o.yLabel, 0, 0); g.restore();

    /* frame */
    g.strokeStyle = 'rgba(100,100,110,0.55)'; g.lineWidth = 1;
    g.strokeRect(P.l, P.t, w, h);

    /* series */
    g.save();
    g.beginPath(); g.rect(P.l, P.t, w, h); g.clip();
    for (const s of vis) {
      g.beginPath();
      g.strokeStyle = s.color; g.lineWidth = s.width || 2;
      g.setLineDash(s.dash || []);
      let started = false;
      for (const p of s.data) {
        if (p.x < this.o.xMin || p.x > this.o.xMax || !isFinite(p.y)) { started = false; continue; }
        const X = this._x(p.x, w), Y = this._y(p.y, h, lo, hi);
        if (!started) { g.moveTo(X, Y); started = true; } else g.lineTo(X, Y);
      }
      g.stroke();
    }
    g.setLineDash([]);
    g.restore();

    /* hover crosshair + readout */
    if (this.hover && this.hover.x > P.l && this.hover.x < P.l + w) {
      const fx = this._invX(this.hover.x, w);
      g.strokeStyle = 'rgba(120,120,130,0.6)'; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(this.hover.x, P.t); g.lineTo(this.hover.x, P.t + h); g.stroke();
      g.setLineDash([]);
      const lines = [(fx >= 1000 ? (fx / 1000).toFixed(2) + ' kHz' : fx.toFixed(0) + ' Hz')];
      for (const s of vis) {
        let best = null, bd = Infinity;
        for (const p of s.data) { const d = Math.abs(Math.log10(p.x) - Math.log10(fx)); if (d < bd) { bd = d; best = p; } }
        if (best && isFinite(best.y)) {
          lines.push(s.label + ': ' + (this.o.yLog ? best.y.toExponential(2) : best.y.toFixed(1)));
        }
      }
      const bw = 168, bh = 15 * lines.length + 8;
      let bx = this.hover.x + 10; if (bx + bw > P.l + w) bx = this.hover.x - bw - 10;
      const by = P.t + 6;
      g.fillStyle = 'rgba(255,255,255,0.94)'; g.strokeStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(bx, by, bw, bh); g.strokeRect(bx, by, bw, bh);
      g.fillStyle = '#111827'; g.textAlign = 'left';
      lines.forEach((t, i) => g.fillText(t, bx + 7, by + 16 + i * 15));
    }
  };

  root.Plot = Plot;
})(typeof globalThis !== 'undefined' ? globalThis : this);
