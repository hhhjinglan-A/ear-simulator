/* app.js — UI wiring.
 *
 * Parameters are loaded from data/reference.json, which MATLAB writes, so the
 * two implementations cannot drift apart by re-typing numbers.
 */
(function () {
  'use strict';
  const C = Cx, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  let REF = null, P1 = null, P2 = null, D1 = null, D2 = null;
  let baseline = null;
  const F = Combined.logspace(20, 20000, 1024);
  const plots = {};
  const vis = { outer: true, middle: true, combined: true, base: true };
  const player = new EarAudio.Player();
  let userAudio = null;

  const COL = { outer: '#0b6bcb', middle: '#a3142b', combined: '#111827',
                base: '#8b8f98', child: '#2f7d32',
                mild: '#e0a800', moderate: '#e06c00', severe: '#a3142b' };

  /* ================= boot =================
   * Parameters come from data/reference.js, which MATLAB generates, so the
   * two implementations cannot drift apart by re-typing numbers. It is a
   * <script> rather than a fetch so the page also works from file://.
   *
   * start() is invoked at the BOTTOM of this module, not here: the module
   * uses `let` bindings declared further down, and calling boot() at this
   * point would hit their temporal dead zone. The async fetch this replaced
   * had been hiding that by deferring the call by a microtask. */
  function start() {
    if (window.__EAR_REFERENCE__) {
      REF = window.__EAR_REFERENCE__;
      boot();
    } else {
      $('#headStat').textContent = 'reference data not loaded';
      document.body.insertAdjacentHTML('afterbegin',
        '<div class="warn" style="margin:12px">Could not load <code>data/reference.js</code>. ' +
        'Re-run <code>exportWebReference.m</code> in MATLAB to regenerate it. ' +
        '<span class="zh">未能载入参考数据，请在 MATLAB 里重新运行 exportWebReference.m。</span></div>');
    }
  }

  function boot() {
    D1 = REF.params.outer;
    D2 = REF.params.middle_normal;
    P1 = JSON.parse(JSON.stringify(D1));
    P2 = JSON.parse(JSON.stringify(D2));

    buildTabs();
    buildControls();
    buildLegend();
    plots.mag   = new Plot($('#cvMag'),   { yLabel: 'Gain (dB)' });
    plots.phase = new Plot($('#cvPhase'), { yLabel: 'Phase (deg)' });
    plots.z     = new Plot($('#cvZ'),     { yLabel: '|z_t| (Pa·s/m³)', yLog: true });
    $('#circuitBody').innerHTML = Content.CIRCUIT;
    $('#validBody').innerHTML   = Content.VALID;
    $('#btnSelfTest').addEventListener('click', runSelfTest);
    buildExperiments();
    buildOme();
    buildAudio();
    window.addEventListener('resize', () => Object.values(plots).forEach(p => p.draw()));
    recompute();
  }

  /* ================= tabs ================= */
  function buildTabs() {
    $$('#tabs button').forEach(b => b.addEventListener('click', () => {
      $$('#tabs button').forEach(x => x.classList.remove('on'));
      $$('.tab').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      $('#tab-' + b.dataset.tab).classList.add('on');
      Object.values(plots).forEach(p => p.draw());
      if (window.omePlots) window.omePlots.forEach(p => p.draw());
    }));
  }

  /* ================= controls ================= */
  function ctlHTML(key, label, unit, min, max, scale, dec, zh, val) {
    const dv = (val * scale);
    return `<div class="p" data-key="${key}">
      <div class="lab"><span class="nm">${label}</span>
        <span class="val"><span class="cur">${dv.toFixed(dec)}</span> ${unit}</span></div>
      <div class="desc zh">${zh}</div>
      <div class="rowc">
        <input type="range" min="${min * scale}" max="${max * scale}" step="${(max - min) * scale / 400}" value="${dv}">
        <input type="number" step="any" value="${dv.toFixed(dec)}">
      </div></div>`;
  }

  function buildControls() {
    let h = `<details class="grp" open><summary>Outer ear 外耳 (14)</summary><div class="body">`;
    for (const s of ParamSpecs.OUTER)
      h += ctlHTML('o:' + s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], P1[s[0]]);
    h += `<div class="p"><div class="lab"><span class="nm">Canal model 耳道模型</span></div>
      <select id="canalModel">
        <option value="quarterwave">Quarter-wave tube 四分之一波长管</option>
        <option value="iec318">IEC 318 equivalent circuit</option>
      </select></div>`;
    h += `</div></details>`;

    for (const [gid, gname, items] of ParamSpecs.MIDDLE) {
      h += `<details class="grp"><summary>${gname}</summary><div class="body">`;
      for (const [k, lab, unit, scale, dec, zh] of items) {
        const d = D2[k];
        h += ctlHTML('m:' + k, lab, unit, d * 0.5, d * 2, scale, dec, zh, P2[k]);
      }
      h += `</div></details>`;
    }
    $('#ctlGroups').innerHTML = h;
    $('#canalModel').value = P1.canalModel;
    $('#canalModel').addEventListener('change', e => { P1.canalModel = e.target.value; recompute(); });

    $$('#ctlGroups .p[data-key]').forEach(row => {
      const key = row.dataset.key, [side, name] = key.split(':');
      const spec = side === 'o'
        ? ParamSpecs.OUTER.find(s => s[0] === name)
        : ParamSpecs.MIDDLE.flatMap(g => g[2]).find(s => s[0] === name);
      const scale = side === 'o' ? spec[5] : spec[3];
      const dec   = side === 'o' ? spec[6] : spec[4];
      const rng = row.querySelector('input[type=range]');
      const num = row.querySelector('input[type=number]');
      const set = disp => {
        const v = disp / scale;
        if (side === 'o') P1[name] = v; else P2[name] = v;
        row.querySelector('.cur').textContent = (+disp).toFixed(dec);
        const def = (side === 'o' ? D1 : D2)[name];
        row.classList.toggle('changed', Math.abs(v - def) > Math.abs(def) * 1e-9);
        recompute();
      };
      rng.addEventListener('input', e => { num.value = (+e.target.value).toFixed(dec); set(+e.target.value); });
      num.addEventListener('change', e => {
        let d = +e.target.value;
        if (!isFinite(d)) return;
        rng.value = Math.max(+rng.min, Math.min(+rng.max, d));
        set(d);
      });
    });

    $('#btnReset').addEventListener('click', () => {
      P1 = JSON.parse(JSON.stringify(D1)); P2 = JSON.parse(JSON.stringify(D2));
      $('#canalModel').value = P1.canalModel;
      $$('#ctlGroups .p[data-key]').forEach(row => {
        const [side, name] = row.dataset.key.split(':');
        const spec = side === 'o' ? ParamSpecs.OUTER.find(s => s[0] === name)
                                  : ParamSpecs.MIDDLE.flatMap(g => g[2]).find(s => s[0] === name);
        const scale = side === 'o' ? spec[5] : spec[3];
        const dec   = side === 'o' ? spec[6] : spec[4];
        const v = (side === 'o' ? P1 : P2)[name] * scale;
        row.querySelector('input[type=range]').value = v;
        row.querySelector('input[type=number]').value = v.toFixed(dec);
        row.querySelector('.cur').textContent = v.toFixed(dec);
        row.classList.remove('changed');
      });
      recompute();
    });
    $('#btnBaseline').addEventListener('click', () => {
      baseline = Combined.response(P1, P2, F); vis.base = true; buildLegend(); recompute();
    });
    $('#btnClearBase').addEventListener('click', () => { baseline = null; buildLegend(); recompute(); });
  }

  /* ================= legend ================= */
  function buildLegend() {
    const items = [['outer', 'Outer ear alone 外耳'], ['middle', 'Middle ear alone 中耳'],
                   ['combined', 'Combined 组合']];
    if (baseline) items.push(['base', 'Baseline 基线']);
    $('#legendbar').innerHTML = items.map(([k, l]) =>
      `<label><input type="checkbox" data-vis="${k}" ${vis[k] ? 'checked' : ''}>
       <span class="swatch" style="background:${COL[k]}"></span>${l}</label>`).join('');
    $$('#legendbar input').forEach(cb => cb.addEventListener('change', e => {
      vis[e.target.dataset.vis] = e.target.checked; recompute();
    }));
  }

  /* ================= compute + draw ================= */
  let cur = null;
  function recompute() {
    cur = Combined.response(P1, P2, F);
    const xy = (arr, fn) => F.map((f, i) => ({ x: f, y: fn(arr[i], i) }));
    const ph = a => C.unwrapDeg(a.map(C.deg));
    const phXY = a => { const u = ph(a); return F.map((f, i) => ({ x: f, y: u[i] })); };

    plots.mag.setSeries([
      baseline && { key: 'base', label: 'Baseline', color: COL.base, dash: [5, 4], width: 2,
                    visible: vis.base, data: xy(baseline.total, C.db) },
      { key: 'outer', label: 'Outer', color: COL.outer, dash: [5, 4], width: 1.6,
        visible: vis.outer, data: xy(cur.Houter, C.db) },
      { key: 'middle', label: 'Middle', color: COL.middle, dash: [5, 4], width: 1.6,
        visible: vis.middle, data: xy(cur.Hmiddle, C.db) },
      { key: 'combined', label: 'Combined', color: COL.combined, width: 2.6,
        visible: vis.combined, data: xy(cur.total, C.db) }
    ].filter(Boolean));

    plots.phase.setSeries([
      baseline && { key: 'base', label: 'Baseline', color: COL.base, dash: [5, 4], width: 2,
                    visible: vis.base, data: phXY(baseline.total) },
      { key: 'outer', label: 'Outer', color: COL.outer, dash: [5, 4], width: 1.6,
        visible: vis.outer, data: phXY(cur.Houter) },
      { key: 'middle', label: 'Middle', color: COL.middle, dash: [5, 4], width: 1.6,
        visible: vis.middle, data: phXY(cur.Hmiddle) },
      { key: 'combined', label: 'Combined', color: COL.combined, width: 2.6,
        visible: vis.combined, data: phXY(cur.total) }
    ].filter(Boolean));

    plots.z.setSeries([
      baseline && { key: 'base', label: 'Baseline', color: COL.base, dash: [5, 4], width: 2,
                    visible: vis.base,
                    data: xy(baseline.middle.inputImpedance, z => C.abs(z) * P2.Z_unitToSI) },
      { key: 'z', label: '|z_t|', color: COL.middle, width: 2.4, visible: true,
        data: xy(cur.middle.inputImpedance, z => C.abs(z) * P2.Z_unitToSI) }
    ].filter(Boolean));

    drawReadout();
  }

  function at(arr, f0, fn) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < F.length; i++) { const d = Math.abs(Math.log10(F[i]) - Math.log10(f0)); if (d < bd) { bd = d; bi = i; } }
    return fn(arr[bi], bi);
  }

  function drawReadout() {
    const m = cur.middle;
    const lr = cur.loadingRatio;
    const med = [...lr].sort((a, b) => a - b)[Math.floor(lr.length / 2)];
    const Y226 = 1 / (at(m.inputImpedance, 226, C.abs) * P2.Z_unitToSI) / 1e-8;
    const kv = (t, v, zh) => `<div class="kv"><b>${t}${zh ? ' · <span class="zh">' + zh + '</span>' : ''}</b><span>${v}</span></div>`;
    $('#readout').innerHTML =
      kv('Middle-ear peak', m.peakGainDb.toFixed(1) + ' dB @ ' + m.fPeak.toFixed(0) + ' Hz', '中耳峰值') +
      kv('Combined peak', cur.peakGainDb.toFixed(1) + ' dB @ ' + cur.fPeak.toFixed(0) + ' Hz', '组合峰值') +
      kv('Middle-ear resonance', m.fResonance.toFixed(0) + ' Hz', '中耳共振') +
      kv('|z_t| @ 1 kHz', (at(m.inputImpedance, 1000, C.abs) * P2.Z_unitToSI).toExponential(2) + ' Pa·s/m³', '') +
      kv('Static admittance Y(226 Hz)', Y226.toFixed(2) + ' mmho', '静态导纳') +
      kv('Cascade loading |z_t|/Z_canal', 'min ' + Math.min(...lr).toFixed(2) + ' · median ' + med.toFixed(2), '级联可靠度') +
      kv('H_middle @ 1 kHz', at(cur.Hmiddle, 1000, C.db).toFixed(1) + ' dB', '') +
      kv('H_combined @ 3 kHz', at(cur.total, 3000, C.db).toFixed(1) + ' dB', '');
    $('#headStat').textContent =
      'combined peak ' + cur.peakGainDb.toFixed(1) + ' dB @ ' + cur.fPeak.toFixed(0) + ' Hz\n' +
      F.length + ' points · live';
  }

  /* ================= self-test ================= */
  function runSelfTest() {
    const out = $('#selfTestOut');
    out.innerHTML = '<p class="hint">running…</p>';
    setTimeout(() => {
      const f = REF.f;
      const rows = [];
      let worstRel = 0, worstDb = 0, worstDeg = 0, bad = 0;
      for (const key of Object.keys(REF.cases)) {
        const cs = REF.cases[key];
        const got = Combined.response(cs.outerParams, cs.middleParams, f);
        const quantities = [['outer', got.Houter, cs.outer], ['middle', got.Hmiddle, cs.middle],
                            ['combined', got.total, cs.combined],
                            ['Zin', got.middle.inputImpedance, cs.Zin]];
        for (const [qn, g, w] of quantities) {
          let mr = 0, mdb = 0, mdeg = 0;
          for (let i = 0; i < f.length; i++) {
            const want = { re: w.re[i], im: w.im[i] };
            if (!g[i] || !isFinite(g[i].re) || !isFinite(g[i].im)) { bad++; continue; }
            const d = C.abs(C.sub(g[i], want)), mm = C.abs(want);
            mr = Math.max(mr, mm > 0 ? d / mm : d);
            mdb = Math.max(mdb, Math.abs(C.db(g[i]) - C.db(want)));
            let dd = Math.abs(C.deg(g[i]) - C.deg(want)); if (dd > 180) dd = 360 - dd;
            mdeg = Math.max(mdeg, dd);
          }
          rows.push([key, qn, mr, mdb, mdeg]);
          worstRel = Math.max(worstRel, mr); worstDb = Math.max(worstDb, mdb);
          worstDeg = Math.max(worstDeg, mdeg);
        }
      }
      const pass = worstRel < 1e-9 && bad === 0;
      out.innerHTML =
        `<div class="${pass ? 'ok' : 'warn'}"><b>${pass ? 'PASS' : 'FAIL'}</b> —
          worst relative error <b>${worstRel.toExponential(3)}</b>,
          magnitude ${worstDb.toExponential(2)} dB, phase ${worstDeg.toExponential(2)}°,
          non-finite values ${bad}.<br>
          ${rows.length} comparisons over ${Object.keys(REF.cases).length} scenarios ×
          ${f.length} frequencies, compared in the complex plane.
          <span class="zh">网页与 MATLAB 的复数响应逐点比较，最大相对误差 ${worstRel.toExponential(2)}（机器精度量级）。</span>
          </div>
        <table><tr><th>scenario</th><th>quantity</th><th>max rel.</th><th>max dB</th><th>max deg</th></tr>` +
        rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2].toExponential(2)}</td>
          <td class="num">${r[3].toExponential(2)}</td><td class="num">${r[4].toExponential(2)}</td></tr>`).join('') +
        `</table><p class="hint">MATLAB reference generated ${REF.generated} on ${REF.matlab}.</p>`;
    }, 20);
  }

  /* ================= experiments ================= */
  function buildExperiments() {
    const store = Experiments.load();
    $('#expList').innerHTML = Experiments.DEFS.map(d => {
      const s = store[d.id] || {};
      return `<div class="exp" data-id="${d.id}">
        <h3>${d.title}</h3>
        <p class="hint">${d.kind} · changes <code>${d.param}</code> × ${d.factor}
          (from the current value on the Simulator tab)</p>
        <p><span class="step">1</span><b>Your prediction 你的预测</b>
          <span class="zh">— 先写，再看解释。此栏不会被自动填写。</span></p>
        <textarea data-f="prediction" placeholder="What will happen to magnitude and phase, and why? 会怎么变？为什么？">${s.prediction || ''}</textarea>
        <p><span class="step">2</span><button class="showAi">Show AI explanation 查看AI解释</button>
          <span class="hint zh">写完预测后再点</span></p>
        <div class="aiexp">${d.ai}</div>
        <p><span class="step">3</span><button class="runExp">Run experiment 运行实验</button></p>
        <div class="result"></div>
        <p><span class="step">4</span><b>Your observation 你的观察与对比</b></p>
        <textarea data-f="observation" placeholder="Did it match your prediction? What surprised you? 与预测一致吗？哪里意外？">${s.observation || ''}</textarea>
        <div class="hint saved"></div>
      </div>`;
    }).join('');

    $$('#expList .exp').forEach(el => {
      const id = el.dataset.id, def = Experiments.DEFS.find(d => d.id === id);
      el.querySelector('.showAi').addEventListener('click', () => {
        const pred = el.querySelector('[data-f=prediction]').value.trim();
        if (!pred) { alert('Write your prediction first.\n请先写下你的预测，再查看 AI 解释。'); return; }
        el.querySelector('.aiexp').style.display = 'block';
        persist(id, { aiViewedAfterPrediction: true });
      });
      el.querySelector('.runExp').addEventListener('click', () => runExperiment(id, def, el));
      el.querySelectorAll('textarea').forEach(ta => ta.addEventListener('input', () => {
        const o = {}; o[ta.dataset.f] = ta.value; persist(id, o);
        el.querySelector('.saved').textContent = 'saved 已保存 ' + new Date().toLocaleTimeString();
      }));
      const s = Experiments.load()[id];
      if (s && s.result) showResult(el, s.result);
    });

    $('#expExportJson').addEventListener('click', () => {
      download('experiment_log.json', JSON.stringify(Experiments.load(), null, 2), 'application/json');
    });
    $('#expExportCsv').addEventListener('click', () => {
      const st = Experiments.load();
      let csv = 'id,param,factor,ran_at,prediction,observation,ai_viewed_after_prediction,' +
                'dH_100Hz,dH_500Hz,dH_1kHz,dH_2kHz,dH_4kHz,dH_10kHz,peak_before_dB,peak_after_dB,peak_f_before,peak_f_after\n';
      for (const id of Object.keys(st)) {
        const s = st[id], r = s.result || {};
        const q = t => '"' + String(t == null ? '' : t).replace(/"/g, '""') + '"';
        csv += [id, r.param || '', r.factor || '', r.ranAt || '', q(s.prediction), q(s.observation),
                !!s.aiViewedAfterPrediction, ...(r.dH || ['', '', '', '', '', '']),
                r.peakBefore, r.peakAfter, r.fPeakBefore, r.fPeakAfter].join(',') + '\n';
      }
      download('experiment_log.csv', csv, 'text/csv');
    });
    $('#expClear').addEventListener('click', () => {
      if (confirm('Delete all experiment records? 确定清空全部实验记录？')) {
        localStorage.removeItem(Experiments.KEY); buildExperiments();
      }
    });
  }

  function persist(id, patch) {
    const st = Experiments.load();
    st[id] = Object.assign({}, st[id], patch);
    Experiments.save(st);
  }

  function runExperiment(id, def, el) {
    const before = Combined.response(P1, P2, F);
    const q2 = JSON.parse(JSON.stringify(P2));
    q2[def.param] = q2[def.param] * def.factor;
    const after = Combined.response(P1, q2, F);
    const fs = [100, 500, 1000, 2000, 4000, 10000];
    const dH = fs.map(f0 => +(at(after.Hmiddle, f0, C.db) - at(before.Hmiddle, f0, C.db)).toFixed(3));
    const res = {
      param: def.param, factor: def.factor, ranAt: new Date().toISOString(),
      baselineValue: P2[def.param], newValue: q2[def.param],
      dH, freqs: fs,
      peakBefore: +before.middle.peakGainDb.toFixed(2), peakAfter: +after.middle.peakGainDb.toFixed(2),
      fPeakBefore: Math.round(before.middle.fPeak), fPeakAfter: Math.round(after.middle.fPeak),
      resBefore: Math.round(before.middle.fResonance), resAfter: Math.round(after.middle.fResonance),
      params: JSON.parse(JSON.stringify(P2))
    };
    persist(id, { result: res });
    showResult(el, res);
  }

  function showResult(el, r) {
    const box = el.querySelector('.result');
    box.style.display = 'block';
    box.innerHTML =
      `<b>Result 结果</b> — ran ${new Date(r.ranAt).toLocaleString()}<br>
       <code>${r.param}</code>: ${r.baselineValue.toPrecision(4)} → ${r.newValue.toPrecision(4)} (×${r.factor})
       <table><tr><th>f (Hz)</th>${r.freqs.map(f => `<th>${f}</th>`).join('')}</tr>
       <tr><td>ΔH<sub>middle</sub> (dB)</td>${r.dH.map(v => `<td class="num">${v >= 0 ? '+' : ''}${v.toFixed(2)}</td>`).join('')}</tr></table>
       Middle-ear peak ${r.peakBefore.toFixed(1)} dB @ ${r.fPeakBefore} Hz →
       <b>${r.peakAfter.toFixed(1)} dB @ ${r.fPeakAfter} Hz</b> ·
       resonance ${r.resBefore} → ${r.resAfter} Hz`;
  }

  /* ================= OME tab ================= */
  function buildOme() {
    const conds = [['middle_normal', 'Healthy adult 健康成人', 'combined'],
                   ['middle_child', 'Healthy child 健康儿童', 'child'],
                   ['middle_ome_mild', 'OME mild 轻度', 'mild'],
                   ['middle_ome_moderate', 'OME moderate 中度', 'moderate'],
                   ['middle_ome_severe', 'OME severe 重度', 'severe']];
    const on = { middle_normal: true, middle_child: true, middle_ome_mild: true,
                 middle_ome_moderate: true, middle_ome_severe: true };
    $('#omeButtons').innerHTML = conds.map(([k, l]) =>
      `<label style="margin-right:10px"><input type="checkbox" data-c="${k}" checked> ${l}</label>`).join('');

    const pT = new Plot($('#cvOme'), { yLabel: '|H_middle| (dB)' });
    const pL = new Plot($('#cvOmeLoss'), { yLabel: 'Loss vs healthy child (dB)' });
    window.omePlots = [pT, pL];

    const draw = () => {
      const child = MiddleEar.response(REF.params.middle_child, F);
      const S = [], L = [];
      for (const [k, l, ck] of conds) {
        if (!on[k]) continue;
        const r = MiddleEar.response(REF.params[k], F);
        S.push({ key: k, label: l.split(' ')[0], color: COL[ck] || COL.combined,
                 width: ck === 'combined' ? 1.6 : 2.2, dash: ck === 'combined' ? [4, 3] : [],
                 data: F.map((f, i) => ({ x: f, y: C.db(r.total[i]) })) });
        if (k.indexOf('ome') >= 0)
          L.push({ key: k, label: l.split(' ')[0], color: COL[ck], width: 2.2,
                   data: F.map((f, i) => ({ x: f, y: C.db(child.total[i]) - C.db(r.total[i]) })) });
      }
      pT.setSeries(S); pL.setSeries(L);
    };
    $$('#omeButtons input').forEach(cb => cb.addEventListener('change', e => {
      on[e.target.dataset.c] = e.target.checked; draw();
    }));
    draw();

    /* table of what changed and why */
    const rows = [['mild', 'middle_ome_mild'], ['moderate', 'middle_ome_moderate'], ['severe', 'middle_ome_severe']];
    const child = MiddleEar.response(REF.params.middle_child, F);
    const fPTA = [500, 1000, 2000, 4000];
    const y226 = (r, p) => 1 / (at(r.inputImpedance, 226, C.abs) * p.Z_unitToSI) / 1e-8;
    let t = `<h3>What changes, and on what evidence <span class="zh">改了哪些参数、依据是什么</span></h3>
      <table><tr><th>Quantity</th><th>Status</th><th>Basis</th></tr>
      <tr><td>C_cp, C_cm</td><td><b>DERIVED</b></td><td>Eq. (2) C = V/(ρ_a c²) from the remaining air volume (1−φ)·V_c — the same relation that reproduces Pascal's adult values to 1.2 %</td></tr>
      <tr><td>Added drum inertance</td><td><b>DERIVED</b></td><td>ρ·t/A_t for a fluid layer of depth t on the drum. <i>Assumes the layer moves rigidly with the drum.</i></td></tr>
      <tr><td>Child cleft volume 2.8 cm³</td><td><b>ASSUMED — no source</b></td><td>Mastoid pneumatization is incomplete until ~age 10 and is suppressed by early otitis media (direction supported), but no measured paediatric middle-ear <b>cleft</b> volume was found. Published child figures of 0.4–1.3 cm³ are <b>ear-canal</b> equivalent volumes — a different cavity. <b>Largest single uncertainty.</b></td></tr>
      <tr><td>Fill fraction φ, fluid depth t</td><td><b>ASSUMED</b></td><td>clinically meaningful but not measured here</td></tr>
      <tr><td>R_te ×2/4/8</td><td><b>ASSUMED</b></td><td>measured effusion viscosities span 1 cP (serous) to 10 000 cP (mucoid) — four decades; a lumped resistance cannot be derived from that without a flow model, so these factors deliberately span less than one decade</td></tr>
      <tr><td>C_te, R_a factors</td><td><b>ASSUMED</b></td><td>drum thickening / retraction; aditus swelling</td></tr>
      <tr><td>Cochlea, joint, reflex elements</td><td><b>UNCHANGED</b></td><td>OME is conductive — bone conduction stays normal — so nothing distal to the ossicles should move. The acoustic-reflex parameters are a <i>loudness</i> mechanism; using them as an infection model would be a category error.</td></tr>
      </table>
      <h3>Results <span class="zh">结果</span></h3><table>
      <tr><th>Ear</th><th>φ</th><th>fluid depth</th><th>air volume</th><th>L_te</th><th>4PTA loss</th><th>Y(226 Hz)</th><th>resonance</th></tr>`;
    const cr = MiddleEar.response(REF.params.middle_child, F);
    t += `<tr><td>healthy child</td><td>—</td><td>—</td><td class="num">${REF.params.middle_child.V_c.toFixed(2)} cm³</td>
      <td class="num">${(REF.params.middle_child.L_te * 1e3).toFixed(0)} mH</td><td class="num">—</td>
      <td class="num">${y226(cr, REF.params.middle_child).toFixed(2)}</td>
      <td class="num">${cr.fResonance.toFixed(0)} Hz</td></tr>`;
    for (const [nm, key] of rows) {
      const p = REF.params[key], r = MiddleEar.response(p, F);
      const loss = fPTA.map(f0 => at(child.total, f0, C.db) - at(r.total, f0, C.db));
      const pta = loss.reduce((a, b) => a + b, 0) / loss.length;
      t += `<tr><td>${nm}</td><td class="num">${p.ome.fillFraction}</td>
        <td class="num">${p.ome.fluidDepth_mm} mm</td><td class="num">${p.V_c.toFixed(2)} cm³</td>
        <td class="num">${(p.L_te * 1e3).toFixed(0)} mH</td>
        <td class="num">${pta.toFixed(1)} dB</td><td class="num">${y226(r, p).toFixed(2)}</td>
        <td class="num">${r.fResonance.toFixed(0)} Hz</td></tr>`;
    }
    t += `</table>`;
    $('#omeTable').innerHTML = t;

    $('#omeNotes').innerHTML = `
      <div class="warn"><b>This extension does NOT reproduce clinical otitis media, and that is
      reported rather than tuned away.</b>
      <span class="zh">这个扩展没有复现临床中耳炎，如实报告而不是调参掩盖。</span><br><br>
      The <b>direction</b> of the loss and its <b>flat</b> configuration are right. The
      <b>magnitude is far too small</b> (about 1–7 dB against a clinical air-bone gap of 10–40 dB,
      mean ≈26 dB), static admittance never reaches type B (&lt;0.2 mmho), and the resonance
      frequency moves the <i>wrong way</i> for mild and moderate.</div>
      <h3>Why — measured, not guessed <span class="zh">原因是测出来的，不是猜的</span></h3>
      <p><code>R_cm</code> = 420 Ω sits <b>in parallel</b> across the whole cavity block in Fig. 1,
      so it caps that block's impedance no matter how much air the fluid displaces:</p>
      <table><tr><th>Ear</th><th>max |Z_cavity|</th></tr>
      <tr><td>healthy child</td><td class="num">417.5 Ω</td></tr>
      <tr><td>severe effusion (air volume ÷10)</td><td class="num">419.9 Ω</td></tr>
      <tr><td>severe, with R_cm removed</td><td class="num">40 038 Ω</td></tr></table>
      <p>The circuit is therefore <b>structurally insensitive to cavity volume</b>. Filling the cleft
      is also a <i>stiffening</i>, which raises a resonance frequency, whereas real OME lowers it because
      the fluid mass-loads the drum more than its loss of air stiffens it. A lumped air compliance simply
      cannot express a middle ear whose air space has been replaced by liquid.
      <b>Fixing this needs a different element, not a different number</b> — which is why the assumed
      severities were not adjusted to close the gap.
      <span class="zh">腔体阻抗被 R_cm 锁死，所以电路对腔体容积在结构上不敏感；要修得换元件，不是调数字。</span></p>
      <p class="hint">A healthy child is <b>not</b> the adult model renamed: its cavity volume is changed
      and the capacitances are re-derived from it. The child-vs-adult difference is small
      (about +0.5 dB 4PTA), which is itself a reportable result — the paediatric anatomy alone does
      little here, so almost all of the modelled effect comes from the effusion.
      <span class="zh">健康儿童不是把成人模型改个名字：腔体容积改了、电容按公式重新推导。儿童与成人差别很小（约 0.5 dB），这本身也是结果。</span></p>`;
  }

  /* ================= audio ================= */
  function buildAudio() {
    const fs = 44100;
    $('#audVol').addEventListener('input', e => $('#audVolTxt').textContent = e.target.value + '%');
    $('#audFile').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      const ab = await f.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await ctx.decodeAudioData(ab);
      const ch = buf.getChannelData(0);
      userAudio = { data: Float32Array.from(ch), fs: buf.sampleRate };
      $('#audSrc').value = 'file';
      $('#audStat').textContent = `Loaded ${f.name}: ${(buf.duration).toFixed(1)} s @ ${buf.sampleRate} Hz`;
    });

    const condParams = () => {
      const c = $('#audCond').value;
      if (c === 'current') return P2;
      if (c === 'child') return REF.params.middle_child;
      return REF.params['middle_ome_' + c];
    };
    const src = () => {
      if ($('#audSrc').value === 'file') {
        if (!userAudio) { alert('Upload an audio file first. 请先上传音频。'); return null; }
        return userAudio;
      }
      return { data: EarAudio.makeSource($('#audSrc').value, fs, 2.5), fs: fs };
    };

    const go = wet => {
      const s = src(); if (!s) return;
      const vol = (+$('#audVol').value) / 100;
      let ir = null;
      if (wet) ir = EarAudio.combinedIR(P1, condParams(), s.fs, 4096);
      const info = player.play(s.data, s.fs, ir, vol);
      $('#audStat').textContent =
        (wet ? 'Through the ear' : 'Original') + ' · peak before scaling ' + info.peak.toFixed(3) +
        ' · normalisation applied ' + info.gainDb.toFixed(1) + ' dB · volume ' + $('#audVol').value + '%';
      $('#normNote').innerHTML =
        `Each clip is scaled by a single explicit scalar so its peak reaches 0.85 full scale; the last
         clip used <b>${info.gainDb.toFixed(1)} dB</b>. The convolution itself is <b>not</b> normalised,
         so the model's real gain is preserved — but because each clip is peak-normalised separately,
         <b>loudness differences between "original" and "through the ear" are removed</b>. Compare
         timbre, not level. <span class="zh">每段音频各自峰值归一化到 0.85，所以"原声"与"过耳"之间的响度差被抵消了，请比较音色而不是音量。本次归一化增益 ${info.gainDb.toFixed(1)} dB。</span>`;
    };
    $('#btnDry').addEventListener('click', () => go(false));
    $('#btnWet').addEventListener('click', () => go(true));
    $('#btnStop').addEventListener('click', () => player.stop());
    $('#normNote').textContent = 'Play something to see the exact figure. 播放后显示具体数值。';

    /* downloads */
    $('#dlCsv').addEventListener('click', () => {
      let csv = 'frequency_Hz,outer_dB,outer_deg,middle_dB,middle_deg,combined_dB,combined_deg,Zin_Pa_s_m3,Zin_deg,loading_ratio\n';
      const po = C.unwrapDeg(cur.Houter.map(C.deg)), pm = C.unwrapDeg(cur.Hmiddle.map(C.deg)),
            pc = C.unwrapDeg(cur.total.map(C.deg));
      F.forEach((f, i) => {
        csv += [f.toFixed(4), C.db(cur.Houter[i]).toFixed(4), po[i].toFixed(3),
                C.db(cur.Hmiddle[i]).toFixed(4), pm[i].toFixed(3),
                C.db(cur.total[i]).toFixed(4), pc[i].toFixed(3),
                (C.abs(cur.middle.inputImpedance[i]) * P2.Z_unitToSI).toExponential(6),
                C.deg(cur.middle.inputImpedance[i]).toFixed(3),
                cur.loadingRatio[i].toFixed(4)].join(',') + '\n';
      });
      download('ear_response.csv', csv, 'text/csv');
    });
    $('#dlParams').addEventListener('click', () => download('parameters.json',
      JSON.stringify({ outer: P1, middle: P2, exported: new Date().toISOString() }, null, 2),
      'application/json'));
    const png = (cv, name) => () => {
      const a = document.createElement('a');
      a.href = cv.toDataURL('image/png'); a.download = name; a.click();
    };
    $('#dlPngMag').addEventListener('click', png($('#cvMag'), 'magnitude.png'));
    $('#dlPngPhase').addEventListener('click', png($('#cvPhase'), 'phase.png'));
    $('#dlPngZ').addEventListener('click', png($('#cvZ'), 'input_impedance.png'));
    $('#dlIR').addEventListener('click', () => {
      const ir = EarAudio.combinedIR(P1, condParams(), 44100, 4096);
      const { blob, scale } = EarAudio.encodeWav(ir, 44100);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'impulse_response.wav'; a.click();
      $('#audStat').textContent = 'IR written; WAV peak-normalised by ×' + scale.toPrecision(4) +
        ' (16-bit files cannot hold the raw gain). 原始增益无法存进 16-bit WAV，已按此系数归一化。';
    });
  }

  function download(name, text, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name; a.click();
  }

  start();
})();
