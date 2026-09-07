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
        'Re-run <code>exportWebReference.m</code> in MATLAB to regenerate it.</div>');
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
    $('#circuitBody').innerHTML = foldSections(Content.CIRCUIT, ['The circuit']);
    $('#validBody').innerHTML   = foldSections(Content.VALID,
      ['Two different claims', 'Web vs MATLAB']);
    wrapTables();
    $('#btnSelfTest').addEventListener('click', runSelfTest);
    buildReport();
    buildExperiments();
    buildOme();
    buildDiagram();
    const ob = $('#onboard'), gt = $('#guideToggle');
    if (localStorage.getItem('earsim.guide') === 'open') ob.classList.remove('hidden');
    const syncGuide = () => {
      const open = !ob.classList.contains('hidden');
      gt.textContent = (open ? '▾' : '▸') + ' Start here — 4 steps';
      localStorage.setItem('earsim.guide', open ? 'open' : 'closed');
    };
    gt.addEventListener('click', () => { ob.classList.toggle('hidden'); syncGuide();
      Object.values(plots).forEach(p => p.draw()); });
    syncGuide();

    /* plot view switcher: one plot at a time so the controls and the result
     * are both on screen without scrolling */
    $$('#viewSel button').forEach(b => b.addEventListener('click', () => {
      $$('#viewSel button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      const v = b.dataset.v, all = v === 'all';
      $('#tab-sim .plots').classList.toggle('showall', all);
      $$('#tab-sim .plotcard').forEach(c => { c.hidden = !all && c.dataset.v !== v; });
      requestAnimationFrame(() => Object.values(plots).forEach(p => p.draw()));
    }));

    window.addEventListener('resize', () => {
      Object.values(plots).forEach(p => p.draw());
      if (window.omePlots) window.omePlots.forEach(p => p.draw());
    });
    recompute();
  }

  /* ================= tabs ================= */
  function buildTabs() {
    document.addEventListener('click', ev => {
      const a = ev.target.closest('[data-goto]');
      if (!a) return;
      ev.preventDefault();
      const b = document.querySelector(`#tabs button[data-tab="${a.dataset.goto}"]`);
      if (b) b.click();
    });
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
  function ctlHTML(key, label, unit, min, max, scale, dec, zh, val, isKey) {
    const dv = (val * scale);
    return `<div class="p${isKey ? ' keyparam' : ''}" data-key="${key}">
      <div class="lab"><span class="nm">${label}</span>
        <span class="val"><span class="cur">${dv.toFixed(dec)}</span> ${unit}</span></div>
      <div class="desc zh">${zh}</div>
      <div class="rowc">
        <input type="range" min="${min * scale}" max="${max * scale}" step="${(max - min) * scale / 400}" value="${dv}">
        <input type="number" step="any" value="${dv.toFixed(dec)}">
      </div></div>`;
  }

  // The three parameters the assignment's experiments use. Shown first and
  // open by default, so the page opens with three sliders rather than 38.
  const KEY = [['L_te', 'E1 inertance'], ['C_is', 'E2 compliance'], ['R_te', 'E3 loss']];

  function buildControls() {
    const midSpec = k => ParamSpecs.MIDDLE.flatMap(g => g[2]).find(x => x[0] === k);

    let h = `<details class="grp key" open><summary>Start with these three</summary>
      <div class="body">
      <p class="hint">One inertance, one compliance and one loss &mdash; the three the assignment
      asks you to experiment with. Change one at a time.</p>`;
    for (const [k, tag] of KEY) {
      const sp = midSpec(k);
      h += ctlHTML('m:' + k, sp[1] + `<span class="tagexp">${tag}</span>`,
                   sp[2], D2[k] * 0.5, D2[k] * 2, sp[3], sp[4], sp[5], P2[k], true);
    }
    h += `</div></details>`;

    h += `<details class="grp"><summary>Advanced &mdash; all other parameters</summary>
      <div class="body" style="padding:4px 2px">`;

    h += `<details class="grp"><summary>Outer ear (14)</summary><div class="body">`;
    for (const sp of ParamSpecs.OUTER)
      h += ctlHTML('o:' + sp[0], sp[1], sp[2], sp[3], sp[4], sp[5], sp[6], sp[7], P1[sp[0]]);
    h += `<div class="p"><div class="lab"><span class="nm">Ear-canal model</span></div>
      <select id="canalModel">
        <option value="quarterwave">Quarter-wave tube</option>
        <option value="iec318">IEC 318 equivalent circuit</option>
      </select></div>`;
    h += `</div></details>`;

    for (const [gid, gname, items] of ParamSpecs.MIDDLE) {
      h += `<details class="grp"><summary>${gname}</summary><div class="body">`;
      for (const [k, lab, unit, scale, dec, desc] of items) {
        if (KEY.some(x => x[0] === k)) continue;      // already shown above
        const d = D2[k];
        h += ctlHTML('m:' + k, lab, unit, d * 0.5, d * 2, scale, dec, desc, P2[k]);
      }
      h += `</div></details>`;
    }
    h += `</div></details>`;
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
    const items = [['outer', 'Outer ear alone'], ['middle', 'Middle ear alone'],
                   ['combined', 'Combined']];
    if (baseline) items.push(['base', 'Baseline']);
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
    const kv = (t, v, zh) => `<div class="kv"><b>${t}${zh ? ' ·' : ''}</b><span>${v}</span></div>`;
    $('#readout').innerHTML =
      kv('Middle-ear peak', m.peakGainDb.toFixed(1) + ' dB @ ' + m.fPeak.toFixed(0) + ' Hz') +
      kv('Combined peak', cur.peakGainDb.toFixed(1) + ' dB @ ' + cur.fPeak.toFixed(0) + ' Hz') +
      kv('Middle-ear resonance', m.fResonance.toFixed(0) + ' Hz') +
      kv('|z_t| @ 1 kHz', (at(m.inputImpedance, 1000, C.abs) * P2.Z_unitToSI).toExponential(2) + ' Pa·s/m³') +
      kv('Static admittance Y(226 Hz)', Y226.toFixed(2) + ' mmho') +
      kv('Cascade loading |z_t|/Z_canal', 'min ' + Math.min(...lr).toFixed(2) + ' · median ' + med.toFixed(2)) +
      kv('H_middle @ 1 kHz', at(cur.Hmiddle, 1000, C.db).toFixed(1) + ' dB') +
      kv('H_combined @ 3 kHz', at(cur.total, 3000, C.db).toFixed(1) + ' dB');
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
          </div>
        <table><tr><th>scenario</th><th>quantity</th><th>max rel.</th><th>max dB</th><th>max deg</th></tr>` +
        rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2].toExponential(2)}</td>
          <td class="num">${r[3].toExponential(2)}</td><td class="num">${r[4].toExponential(2)}</td></tr>`).join('') +
        `</table><p class="hint">MATLAB reference generated ${REF.generated} on ${REF.matlab}.</p>`;
    }, 20);
  }

  /* ================= experiments ================= */
  let expCurrent = 'E1';
  function buildExperiments() {
    // Records written before runs were tagged were all automated demos.
    const mig = Experiments.load();
    let changed = false;
    for (const k of Object.keys(mig))
      if (mig[k].result && !mig[k].result.mode) { mig[k].result.mode = 'demo'; changed = true; }
    if (changed) Experiments.save(mig);

    const store = Experiments.load();
    $('#expSel').innerHTML = Experiments.DEFS.map(d =>
      `<button data-e="${d.id}" class="${d.id === expCurrent ? 'on' : ''}">${d.id}
        <span class="st">${statusMark(store[d.id])}</span></button>`).join('');
    $$('#expSel button').forEach(b => b.addEventListener('click', () => {
      expCurrent = b.dataset.e;
      $$('#expSel button').forEach(x => x.classList.toggle('on', x === b));
      $$('#expList .exp').forEach(el => { el.hidden = el.dataset.id !== expCurrent; });
    }));
    $('#expList').innerHTML = Experiments.DEFS.map(d => {
      const s = store[d.id] || {};
      return `<div class="exp" data-id="${d.id}">
        <h3>${d.title}</h3>
        <div class="statusbar"></div>
        <p class="hint">${d.kind} · changes <code>${d.param}</code> × ${d.factor}
          (from the current value on the Simulator tab)</p>
        <p><span class="step">1</span><b>Step 1 — your prediction</b></p>
        <textarea data-f="prediction" placeholder="What will happen to the magnitude and the phase, and why?">${s.prediction || ''}</textarea>
        <p><span class="step">2</span><button class="showAi">Show AI explanation</button>
          <span class="hint">available once a prediction is written</span></p>
        <div class="aiexp">${d.ai}</div>
        <p><span class="step">3</span><button class="runExp">Run experiment</button></p>
        <div class="result"></div>
        <p><span class="step">4</span><b>Step 4 — your observation</b></p>
        <textarea data-f="observation" placeholder="Did it match your prediction? What surprised you?">${s.observation || ''}</textarea>
        <div class="hint saved"></div>
      </div>`;
    }).join('');

    $$('#expList .exp').forEach(el => {
      const id = el.dataset.id, def = Experiments.DEFS.find(d => d.id === id);
      el.querySelector('.showAi').addEventListener('click', () => {
        const pred = el.querySelector('[data-f=prediction]').value.trim();
        if (!pred) { alert('Write your prediction first, then the AI explanation will open.'); return; }
        el.querySelector('.aiexp').style.display = 'block';
        persist(id, { aiViewedAfterPrediction: true });
      });
      el.querySelector('.runExp').addEventListener('click', () => runExperiment(id, def, el, false));
      el.querySelectorAll('textarea').forEach(ta => ta.addEventListener('input', () => {
        const o = {}; o[ta.dataset.f] = ta.value; persist(id, o);
        el.querySelector('.saved').textContent = 'saved ' + new Date().toLocaleTimeString();
        refreshStatuses();
      }));
      const st2 = Experiments.load()[id];
      if (st2 && st2.result) showResult(el, st2.result);
      el.hidden = id !== expCurrent;
    });
    refreshStatuses();

    $('#expExportJson').addEventListener('click', () => {
      // The JSON already carries paramsBefore / paramsAfter in full, so the
      // export is reproducible without the page.
      const st = Experiments.load();
      const doc = {
        exported: new Date().toISOString(),
        note: 'paramsBefore and paramsAfter are the COMPLETE outer- and middle-ear parameter ' +
              'sets used for each run. mode:"demo" marks an automated demonstration run, ' +
              'mode:"student" marks the student\'s own. student_prediction and ' +
              'student_observation are never auto-filled.',
        defaults: { outer: D1, middle: D2 },
        experiments: st
      };
      download('experiment_log.json', JSON.stringify(doc, null, 2), 'application/json');
    });
    $('#expExportCsv').addEventListener('click', () => {
      const st = Experiments.load();
      let csv = 'id,param,factor,ran_at,student_prediction,student_observation,' +
                'ai_viewed_after_prediction,dH_100Hz,dH_500Hz,dH_1kHz,dH_2kHz,dH_4kHz,dH_10kHz,' +
                'peak_before_dB,peak_after_dB,peak_f_before,peak_f_after,resonance_before,' +
                'resonance_after,mode,baseline_is_defaults,baseline_drift,' +
                'param_value_before,param_value_after,reference_prediction_vs_result\n';
      for (const id of Object.keys(st)) {
        const s = st[id], r = s.result || {};
        const q = t => '"' + String(t == null ? '' : t).replace(/"/g, '""') + '"';
        csv += [id, r.param || '', r.factor || '', r.ranAt || '', q(s.prediction), q(s.observation),
                !!s.aiViewedAfterPrediction, ...(r.dH || ['', '', '', '', '', '']),
                r.peakBefore, r.peakAfter, r.fPeakBefore, r.fPeakAfter,
                r.resBefore, r.resAfter,
                r.mode || '', r.baselineIsDefaults, q((r.baselineDrift || []).join(' ')),
                r.baselineValue, r.newValue,
                q((r.referenceCheck || []).join(' | '))].join(',') + '\n';
      }
      download('experiment_log.csv', csv, 'text/csv');
    });
    $('#expClear').addEventListener('click', () => {
      if (confirm('Delete all experiment records? This cannot be undone.')) {
        localStorage.removeItem(Experiments.KEY); buildExperiments();
      }
    });
  }


  /* Three distinct states, because "the computation ran" and "the student has
   * recorded the experiment" are different things and the assignment marks the
   * second one. */
  function expStatus(rec) {
    if (!rec || !rec.result) return 'notrun';
    const wrote = (rec.prediction || '').trim() && (rec.observation || '').trim();
    if (rec.result.mode === 'demo') return 'demo';
    return wrote ? 'complete' : 'ran';
  }
  const STATUS_TXT = {
    notrun:   ['not run',            'grey',  'Nothing recorded yet.'],
    demo:     ['demo run',           'amber', 'Run automatically as a demonstration. Re-run it yourself to make it your own experiment.'],
    ran:      ['run, not written up','blue',  'The computation has run, but your prediction and observation are still empty.'],
    complete: ['complete',           'green', 'Run, with your prediction and your observation both written.']
  };
  function statusMark(rec) {
    const st = expStatus(rec);
    return { notrun: '○', demo: '▶', ran: '◐', complete: '✓' }[st];
  }
  function refreshStatuses() {
    const store = Experiments.load();
    $$('#expSel button').forEach(b => {
      b.querySelector('.st').textContent = statusMark(store[b.dataset.e]);
    });
    $$('#expList .exp').forEach(el => {
      const rec = store[el.dataset.id], st = expStatus(rec);
      const [txt, col, help] = STATUS_TXT[st];
      const bar = el.querySelector('.statusbar');
      if (bar) bar.innerHTML =
        `<span class="pill ${col}">${txt}</span> <span class="hint">${help}</span>` +
        (st === 'demo' ? ' <button class="sm claimRun">Re-run as my own</button>' : '');
      const cb = el.querySelector('.claimRun');
      if (cb) cb.addEventListener('click', () => {
        const def = Experiments.DEFS.find(d => d.id === el.dataset.id);
        runExperiment(el.dataset.id, def, el, false);
      });
    });
  }

  function persist(id, patch) {
    const st = Experiments.load();
    st[id] = Object.assign({}, st[id], patch);
    Experiments.save(st);
  }

  // isDemo: set when the run is an automated demonstration rather than the
  // student's own. Marked in the record and in the export so a demo run is
  // never mistaken for the student's experiment.
  function runExperiment(id, def, el, isDemo) {
    const before = Combined.response(P1, P2, F);
    const q2 = JSON.parse(JSON.stringify(P2));
    q2[def.param] = q2[def.param] * def.factor;
    const after = Combined.response(P1, q2, F);

    // Is the run starting from the published defaults, or from parameters the
    // student has already moved? An experiment is only comparable with the
    // report if it starts from the defaults.
    const drift = [];
    for (const k of Object.keys(D2))
      if (typeof D2[k] === 'number' && Math.abs(P2[k] - D2[k]) > Math.abs(D2[k]) * 1e-9)
        drift.push(k);
    for (const k of Object.keys(D1))
      if (typeof D1[k] === 'number' && Math.abs(P1[k] - D1[k]) > Math.abs(D1[k]) * 1e-9)
        drift.push(k);
    const fs = [100, 500, 1000, 2000, 4000, 10000];
    const dH = fs.map(f0 => +(at(after.Hmiddle, f0, C.db) - at(before.Hmiddle, f0, C.db)).toFixed(3));
    const res = {
      param: def.param, factor: def.factor, ranAt: new Date().toISOString(),
      baselineValue: P2[def.param], newValue: q2[def.param],
      dH, freqs: fs,
      peakBefore: +before.middle.peakGainDb.toFixed(2), peakAfter: +after.middle.peakGainDb.toFixed(2),
      fPeakBefore: Math.round(before.middle.fPeak), fPeakAfter: Math.round(after.middle.fPeak),
      resBefore: Math.round(before.middle.fResonance), resAfter: Math.round(after.middle.fResonance),
      mode: isDemo ? 'demo' : 'student',
      baselineIsDefaults: drift.length === 0,
      baselineDrift: drift,
      paramsBefore: { outer: JSON.parse(JSON.stringify(P1)),
                      middle: JSON.parse(JSON.stringify(P2)) },
      paramsAfter:  { outer: JSON.parse(JSON.stringify(P1)),
                      middle: q2 }
    };
    res.referenceCheck = checkReference(id, res, before, after);
    persist(id, { result: res });
    showResult(el, res);
    refreshStatuses();
  }

  function showResult(el, r) {
    const box = el.querySelector('.result');
    box.style.display = 'block';
    box.innerHTML =
      (r.mode === 'demo'
        ? `<div class="demoflag"><b>DEMONSTRATION RUN</b> — produced automatically to show the
             workflow. It is real output from the model, but it is <b>not</b> your experiment.
             Press "Re-run as my own" above once you have written your prediction.</div>` : '') +
      `<b>Result</b> — ran ${new Date(r.ranAt).toLocaleString()}<br>
       <b>Baseline:</b> ${r.baselineIsDefaults === undefined
          ? '<span class="hint">not recorded (run predates baseline tracking) — re-run to capture it</span>'
          : r.baselineIsDefaults
            ? 'published defaults (comparable with the report)'
            : 'MODIFIED from defaults — ' + (r.baselineDrift || []).join(', ') +
              ' <span class="hint">(results will not match the report)</span>'}<br>
       <code>${r.param}</code>: ${r.baselineValue.toPrecision(4)} → ${r.newValue.toPrecision(4)} (×${r.factor})
       <table><tr><th>f (Hz)</th>${r.freqs.map(f => `<th>${f}</th>`).join('')}</tr>
       <tr><td>ΔH<sub>middle</sub> (dB)</td>${r.dH.map(v => `<td class="num">${v >= 0 ? '+' : ''}${v.toFixed(2)}</td>`).join('')}</tr></table>
       Middle-ear peak ${r.peakBefore.toFixed(1)} dB @ ${r.fPeakBefore} Hz →
       <b>${r.peakAfter.toFixed(1)} dB @ ${r.fPeakAfter} Hz</b> ·
       resonance ${r.resBefore} → ${r.resAfter} Hz
       ${r.referenceCheck ? `<div class="refcheck"><b>Reference prediction vs result</b>
         <span class="hint">(computed — this is not your observation)</span>
         <ul>${r.referenceCheck.map(x => '<li>' + x + '</li>').join('')}</ul></div>` : ''}`;
  }


  /* Factual comparison of the REFERENCE prediction against what actually
   * happened. This is the model reporting its own outcome — it is not, and is
   * not labelled as, the student's observation. Each claim is checked against
   * a number rather than asserted. */
  function checkReference(id, r, before, after) {
    const d  = (f0) => at(after.Hmiddle, f0, C.db) - at(before.Hmiddle, f0, C.db);
    const pk = (r.fPeakAfter - r.fPeakBefore) / r.fPeakBefore * 100;
    const out = [];
    const line = (ok, txt) => out.push((ok === null ? '•' : ok ? '✓' : '✗') + ' ' + txt);

    if (id === 'E1') {
      const fOssBefore = 1 / (2 * Math.PI * Math.sqrt(P2.L_te * P2.C_te));
      const fOssAfter  = 1 / (2 * Math.PI * Math.sqrt(P2.L_te * 1.2 * P2.C_te));
      const predShift  = (fOssAfter - fOssBefore) / fOssBefore * 100;
      line(true, `The isolated ossicular resonance 1/(2π√(L_te·C_te)) does fall by ` +
                 `${predShift.toFixed(1)} %, as predicted.`);
      line(false, `But the SYSTEM peak moved only ${pk.toFixed(1)} % ` +
                  `(${r.fPeakBefore} → ${r.fPeakAfter} Hz), not ${Math.abs(predShift).toFixed(1)} %. ` +
                  `The prediction was incomplete: the peak of the whole ladder is not the ` +
                  `resonance of one series branch — the cavity, the shunts and the cochlear ` +
                  `load all help set it, and they did not change.`);
      line(d(10000) < d(100), `Loss does grow towards high frequency: ${d(100).toFixed(2)} dB at ` +
           `100 Hz versus ${d(10000).toFixed(2)} dB at 10 kHz, so the mass term acts where predicted.`);
    } else if (id === 'E2') {
      line(Math.abs(d(100)) < 0.3, `Almost nothing at 100 Hz (${d(100).toFixed(2)} dB), as predicted: ` +
           `1/(ωC_is) is huge there, so the shunt diverts almost nothing.`);
      line(d(10000) < -1, `A clear loss at the top of the band (${d(10000).toFixed(2)} dB at 10 kHz), ` +
           `as predicted, because the shunt impedance falls with frequency.`);
      line(null, `The peak also moved ${r.fPeakBefore} → ${r.fPeakAfter} Hz and the mid-band ` +
           `actually GAINED (${d(2000).toFixed(2)} dB at 2 kHz). C_is resonates with the stapes ` +
           `and vestibular mass, so changing it retunes that resonance as well as changing the leak — ` +
           `a second effect the one-line prediction did not separate.`);
    } else if (id === 'E3') {
      line(r.peakAfter < r.peakBefore, `The peak did flatten: ${r.peakBefore.toFixed(1)} → ` +
           `${r.peakAfter.toFixed(1)} dB.`);
      line(Math.abs(d(100)) < 0.2 && Math.abs(d(10000)) < 0.2,
           `Away from resonance almost nothing happened (${d(100).toFixed(2)} dB at 100 Hz, ` +
           `${d(10000).toFixed(2)} dB at 10 kHz), as predicted — a resistance only competes with ` +
           `the reactances where they cancel.`);
      line(null, `The peak also moved ${r.fPeakBefore} → ${r.fPeakAfter} Hz. The maximum of a lossy ` +
           `resonator does not sit at the undamped resonance, so damping shifts it as well as ` +
           `flattening it.`);
    } else if (id === 'E4') {
      line(d(100) > 0, `A softer cavity helps at low frequency (${d(100).toFixed(2)} dB at 100 Hz), ` +
           `as predicted — less series stiffness for the drum to work against.`);
      line(d(2000) < 0, `And it costs a little above the ossicular resonance ` +
           `(${d(2000).toFixed(2)} dB at 2 kHz): there the capacitive cavity had been partly ` +
           `cancelling the inductive ossicular reactance, and softening it removes that.`);
      line(null, `Control: with p2.cavityPlacement = 'shunt' the same change gives exactly ` +
           `0.00 dB everywhere, because a shunt across an ideal pressure source cannot affect ` +
           `its output. That is the cascade-loading assumption made concrete.`);
    }
    return out;
  }

  /* ================= OME tab ================= */
  // Live scenario. phi and t are PHYSICAL quantities from which the circuit
  // values are derived; the three multipliers are assumed. Both are labelled
  // as such in the UI so the distinction stays visible while you drag them.
  let omeScn = { phi: 0.60, t: 0.5, kR: 4, kCte: 0.75, kRa: 5 };
  const OME_PRESETS = {
    mild:     { phi: 0.30, t: 0.2, kR: 2, kCte: 0.85, kRa: 2 },
    moderate: { phi: 0.60, t: 0.5, kR: 4, kCte: 0.75, kRa: 5 },
    severe:   { phi: 0.90, t: 1.0, kR: 8, kCte: 0.60, kRa: 20 }
  };
  const OME_SPECS = [
    ['phi',  'Fill fraction &phi;', '', 0, 0.98, 0.01, 2, 'assumed',
     'Fraction of the middle-ear cleft occupied by fluid. Clinically meaningful (partial vs full effusion) but not measured here.'],
    ['t',    'Fluid depth on the drum', 'mm', 0, 2, 0.05, 2, 'assumed',
     'Depth of the fluid layer lying against the eardrum. Sets the added mass.'],
    ['kR',   'Damping factor on R_te', '×', 1, 12, 0.5, 1, 'assumed',
     'Viscous damping from the effusion. Measured effusion viscosities span 1 cP (serous) to 10 000 cP (mucoid) — four decades — so a lumped resistance cannot be derived from them without a flow model.'],
    ['kCte', 'Stiffening factor on C_te', '×', 0.3, 1, 0.05, 2, 'assumed',
     'Drum thickening and retraction by negative middle-ear pressure.'],
    ['kRa',  'Aditus obstruction on R_a', '×', 1, 40, 1, 0, 'assumed',
     'Mucosal swelling narrowing the aditus ad antrum.']
  ];

  function omeParams(scn) {
    // Start from the healthy CHILD and apply the scenario, deriving what can
    // be derived exactly as middleEarParams.m does.
    const p = JSON.parse(JSON.stringify(REF.params.middle_child));
    const Vc0 = REF.params.middle_child.V_c;
    p.V_c = Vc0 * (1 - scn.phi);                       // DERIVED
    const cTot = p.V_c / (p.rho_a * p.c * p.c);        // Eq. (2)
    p.C_cp = cTot * 3.6 / 3.95;
    p.C_cm = cTot * 0.35 / 3.95;
    p.ome_L_added = 1.0 * (scn.t / 10) / p.A_t;        // DERIVED: rho*t/A_t
    p.L_te = REF.params.middle_child.L_te + p.ome_L_added;
    p.R_te = REF.params.middle_child.R_te * scn.kR;    // assumed
    p.C_te = REF.params.middle_child.C_te * scn.kCte;  // assumed
    p.R_a  = REF.params.middle_child.R_a  * scn.kRa;   // assumed
    return p;
  }

  function buildOme() {
    const conds = [['middle_normal', 'Healthy adult', 'combined'],
                   ['middle_child', 'Healthy child', 'child'],
                   ['middle_ome_mild', 'OME mild', 'mild'],
                   ['middle_ome_moderate', 'OME moderate', 'moderate'],
                   ['middle_ome_severe', 'OME severe', 'severe']];
    const on = { middle_normal: true, middle_child: true, middle_ome_mild: true,
                 middle_ome_moderate: true, middle_ome_severe: true };
    $('#omeButtons').innerHTML = conds.map(([k, l]) =>
      `<label style="margin-right:10px"><input type="checkbox" data-c="${k}" checked> ${l}</label>`).join('');

    /* ---- scenario controls ---- */
    $('#omePresets').innerHTML = Object.keys(OME_PRESETS).map(k =>
      `<button class="sm omePreset" data-p="${k}">${k}</button>`).join('') +
      `<span class="hint" style="margin-left:8px">presets from the report</span>`;
    $('#omeControls').innerHTML = OME_SPECS.map(([k, lab, unit, mn, mx, st, dec, tag, desc]) =>
      `<div class="p" data-ome="${k}">
        <div class="lab"><span class="nm">${lab}<span class="tagd ${tag}">${tag}</span></span>
          <span class="val"><span class="cur">${omeScn[k].toFixed(dec)}</span> ${unit}</span></div>
        <div class="desc">${desc}</div>
        <div class="rowc"><input type="range" min="${mn}" max="${mx}" step="${st}" value="${omeScn[k]}">
          <input type="number" step="${st}" value="${omeScn[k]}"></div>
      </div>`).join('');

    $$('#omeControls .p[data-ome]').forEach(row => {
      const k = row.dataset.ome;
      const sp = OME_SPECS.find(x => x[0] === k);
      const rng = row.querySelector('input[type=range]');
      const num = row.querySelector('input[type=number]');
      const set = v => {
        omeScn[k] = +v;
        row.querySelector('.cur').textContent = (+v).toFixed(sp[6]);
        window.drawOme && window.drawOme();
      };
      rng.addEventListener('input', e => { num.value = e.target.value; set(e.target.value); });
      num.addEventListener('change', e => { rng.value = e.target.value; set(e.target.value); });
    });
    $$('#omePresets .omePreset').forEach(b => b.addEventListener('click', () => {
      omeScn = Object.assign({}, OME_PRESETS[b.dataset.p]);
      $$('#omeControls .p[data-ome]').forEach(row => {
        const k = row.dataset.ome, sp = OME_SPECS.find(x => x[0] === k);
        row.querySelector('input[type=range]').value = omeScn[k];
        row.querySelector('input[type=number]').value = omeScn[k];
        row.querySelector('.cur').textContent = omeScn[k].toFixed(sp[6]);
      });
      $$('#omePresets .omePreset').forEach(x => x.classList.toggle('on', x === b));
      window.drawOme && window.drawOme();
    }));

    const pT = new Plot($('#cvOme'), { yLabel: '|H_middle| (dB)' });
    const pL = new Plot($('#cvOmeLoss'), { yLabel: 'Loss vs healthy child (dB)' });
    window.omePlots = [pT, pL];

    const drawOme = () => {
      const child = MiddleEar.response(REF.params.middle_child, F);
      const S = [], L = [];
      for (const [k, l, ck] of conds) {
        if (!on[k]) continue;
        const r = MiddleEar.response(REF.params[k], F);
        S.push({ key: k, label: l.split(' ')[0], color: COL[ck] || COL.combined,
                 width: 1.4, dash: [4, 3],
                 data: F.map((f, i) => ({ x: f, y: C.db(r.total[i]) })) });
        if (k.indexOf('ome') >= 0)
          L.push({ key: k, label: l.split(' ')[0], color: COL[ck], width: 1.4, dash: [4, 3],
                   data: F.map((f, i) => ({ x: f, y: C.db(child.total[i]) - C.db(r.total[i]) })) });
      }
      /* the live scenario, drawn solid and on top */
      const pS = omeParams(omeScn);
      const rS = MiddleEar.response(pS, F);
      S.push({ key: 'live', label: 'Your scenario', color: '#111827', width: 2.8,
               data: F.map((f, i) => ({ x: f, y: C.db(rS.total[i]) })) });
      L.push({ key: 'live', label: 'Your scenario', color: '#111827', width: 2.8,
               data: F.map((f, i) => ({ x: f, y: C.db(child.total[i]) - C.db(rS.total[i]) })) });
      pT.setSeries(S); pL.setSeries(L);
      showOmeDerived(pS, rS, child);
    };
    window.drawOme = drawOme;
    $$('#omeButtons input').forEach(cb => cb.addEventListener('change', e => {
      on[e.target.dataset.c] = e.target.checked; drawOme();
    }));
    drawOme();

    /* table of what changed and why */
    const rows = [['mild', 'middle_ome_mild'], ['moderate', 'middle_ome_moderate'], ['severe', 'middle_ome_severe']];
    const child = MiddleEar.response(REF.params.middle_child, F);
    const fPTA = [500, 1000, 2000, 4000];
    const y226 = (r, p) => 1 / (at(r.inputImpedance, 226, C.abs) * p.Z_unitToSI) / 1e-8;
    let t = `<h3>What changes, and on what evidence</h3>
      <table><tr><th>Quantity</th><th>Status</th><th>Basis</th></tr>
      <tr><td>C_cp, C_cm</td><td><b>DERIVED</b></td><td>Eq. (2) C = V/(ρ_a c²) from the remaining air volume (1−φ)·V_c — the same relation that reproduces Pascal's adult values to 1.2 %</td></tr>
      <tr><td>Added drum inertance</td><td><b>DERIVED</b></td><td>ρ·t/A_t for a fluid layer of depth t on the drum. <i>Assumes the layer moves rigidly with the drum.</i></td></tr>
      <tr><td>Child cleft volume 2.8 cm³</td><td><b>ASSUMED — no source</b></td><td>Mastoid pneumatization is incomplete until ~age 10 and is suppressed by early otitis media (direction supported), but no measured paediatric middle-ear <b>cleft</b> volume was found. Published child figures of 0.4–1.3 cm³ are <b>ear-canal</b> equivalent volumes — a different cavity. <b>Largest single uncertainty.</b></td></tr>
      <tr><td>Fill fraction φ, fluid depth t</td><td><b>ASSUMED</b></td><td>clinically meaningful but not measured here</td></tr>
      <tr><td>R_te ×2/4/8</td><td><b>ASSUMED</b></td><td>measured effusion viscosities span 1 cP (serous) to 10 000 cP (mucoid) — four decades; a lumped resistance cannot be derived from that without a flow model, so these factors deliberately span less than one decade</td></tr>
      <tr><td>C_te, R_a factors</td><td><b>ASSUMED</b></td><td>drum thickening / retraction; aditus swelling</td></tr>
      <tr><td>Cochlea, joint, reflex elements</td><td><b>UNCHANGED</b></td><td>OME is conductive — bone conduction stays normal — so nothing distal to the ossicles should move. The acoustic-reflex parameters are a <i>loudness</i> mechanism; using them as an infection model would be a category error.</td></tr>
      </table>
      <h3>Results</h3><table>
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
      reported rather than tuned away.</b><br><br>
      The <b>direction</b> of the loss and its <b>flat</b> configuration are right. The
      <b>magnitude is far too small</b> (about 1–7 dB against a clinical air-bone gap of 10–40 dB,
      mean ≈26 dB), static admittance never reaches type B (&lt;0.2 mmho), and the resonance
      frequency moves the <i>wrong way</i> for mild and moderate.</div>
      <h3>Why — measured, not guessed</h3>
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
      severities were not adjusted to close the gap.</p>
      <p class="hint">A healthy child is <b>not</b> the adult model renamed: its cavity volume is changed
      and the capacitances are re-derived from it. The child-vs-adult difference is small
      (about +0.5 dB 4PTA), which is itself a reportable result — the paediatric anatomy alone does
      little here, so almost all of the modelled effect comes from the effusion.</p>`;
  }



  /* Split a content block at its <h2> headings and wrap each section in a
   * collapsed <details>, except the ones named in keepOpen. Long reference
   * text should not push the interactive parts off the screen. */
  function foldSections(html, keepOpen) {
    const parts = html.split(/(?=<h2>)/).filter(x => x.trim());
    return parts.map(part => {
      const m = part.match(/<h2>([\s\S]*?)<\/h2>/);
      if (!m) return part;
      const title = m[1].replace(/<[^>]+>/g, '').trim();
      const body = part.replace(/<h2>[\s\S]*?<\/h2>/, '');
      const open = keepOpen.some(k => title.indexOf(k) >= 0);
      return `<details class="fold"${open ? ' open' : ''}>
        <summary>${title}</summary><div>${body}</div></details>`;
    }).join('');
  }

  /* Any table wide enough to overflow gets its own horizontal scroller, so
   * the page itself never scrolls sideways at narrow widths or high zoom. */
  function wrapTables() {
    $$('#circuitBody table, #validBody table, #omeTable table, .blockinfo table')
      .forEach(t => {
        if (t.parentElement && t.parentElement.classList.contains('tablewrap')) return;
        const w = document.createElement('div');
        w.className = 'tablewrap';
        t.parentNode.insertBefore(w, t); w.appendChild(t);
      });
  }


  /* ================= submitted experiment report =================
   * Rendered from data/report.js, which is committed to the repository, so a
   * visitor sees the finished experiments without typing anything. All
   * numbers are recomputed here from the model rather than stored, so the
   * report and the code cannot disagree. */
  function buildReport() {
    const R = window.__EAR_REPORT__;
    if (!R) { $('#reportBody').innerHTML = '<div class="warn">report data not loaded</div>'; return; }
    const fs = [100, 500, 1000, 2000, 4000, 10000];

    $('#reportBody').innerHTML = R.experiments.map(e => {
      const q2 = JSON.parse(JSON.stringify(D2));
      q2[e.param] = D2[e.param] * e.factor;
      const before = MiddleEar.response(D2, F);
      const after  = MiddleEar.response(q2, F);
      const dH = fs.map(f0 => at(after.total, f0, C.db) - at(before.total, f0, C.db));
      const fLC = p => 1 / (2 * Math.PI * Math.sqrt(p.L_te * p.C_te));

      const done = !!(e.studentFirstAnswer && e.postHoc);
      const block = (cls, who, when, txt) => txt ? `
        <div class="rblock ${cls}">
          <div class="rwho">${who}<span class="rwhen">${when}</span></div>
          <div>${txt.replace(/\n\n/g, '<br><br>')}</div>
        </div>` : '';

      return `<div class="repcard">
        <h3>${e.title} <span class="pill ${done ? 'green' : 'grey'}">${done ? 'complete' : 'prediction pending'}</span></h3>
        <p class="hint">${e.kind} · changes <code>${e.param}</code> from
          ${(D2[e.param]).toPrecision(4)} to ${q2[e.param].toPrecision(4)} (×${e.factor}),
          starting from the published defaults. <br>${e.question}</p>

        ${block('r-student', 'Student — first answer', e.studentFirstAnswer ? e.studentFirstAnswer.when : '',
                e.studentFirstAnswer ? e.studentFirstAnswer.text : null)}
        ${block('r-ai', 'AI-assisted explanation', 'after the first answer, before running',
                e.aiExplanation)}
        ${block('r-student', 'Student — revised prediction', e.studentRevised ? e.studentRevised.when : '',
                e.studentRevised ? e.studentRevised.text : null)}

        <div class="rblock r-result">
          <div class="rwho">Result<span class="rwhen">computed from the model just now</span></div>
          <div class="tablewrap"><table>
            <tr><th>f (Hz)</th>${fs.map(f => `<th>${f}</th>`).join('')}</tr>
            <tr><td>pressure gain before (dB)</td>${fs.map(f0 => `<td class="num">${at(before.total, f0, C.db).toFixed(2)}</td>`).join('')}</tr>
            <tr><td>pressure gain after (dB)</td>${fs.map(f0 => `<td class="num">${at(after.total, f0, C.db).toFixed(2)}</td>`).join('')}</tr>
            <tr><td><b>change (dB)</b></td>${dH.map(v => `<td class="num"><b>${v >= 0 ? '+' : ''}${v.toFixed(3)}</b></td>`).join('')}</tr>
          </table></div>
          <p style="margin:6px 0 0">
            Peak pressure gain ${before.peakGainDb.toFixed(2)} → <b>${after.peakGainDb.toFixed(2)} dB</b> ·
            system peak ${before.fPeak.toFixed(0)} → <b>${after.fPeak.toFixed(0)} Hz</b>
            (${((after.fPeak - before.fPeak) / before.fPeak * 100).toFixed(1)} %) ·
            |z_t| minimum ${before.fResonance.toFixed(0)} → ${after.fResonance.toFixed(0)} Hz
            ${e.param === 'L_te' ? `<br><span class="hint">For contrast, the LOCAL resonance of the
              isolated L_te–C_te pair, which is not the system peak:
              ${fLC(D2).toFixed(0)} → ${fLC(q2).toFixed(0)} Hz
              (${((fLC(q2) - fLC(D2)) / fLC(D2) * 100).toFixed(1)} %).</span>` : ''}
          </p>
        </div>

        ${block('r-post', 'Analysis', 'written AFTER seeing the result — not a prediction', e.postHoc)}
        ${!done ? `<div class="rblock r-pending"><div class="rwho">Not yet written</div>
          <div>The student's first answer for this experiment has not been recorded yet. The
          numbers above are already computed; only the written prediction and analysis are
          outstanding.</div></div>` : ''}
      </div>`;
    }).join('');
    wrapTables();
  }

  /* ================= clickable circuit / anatomy map ================= */
  function buildDiagram() {
    $('#diagramWrap').innerHTML = Diagram.svg();
    $$('#diagramWrap .blk').forEach(g => g.addEventListener('click', () => {
      $$('#diagramWrap .blk').forEach(x => x.classList.remove('sel'));
      g.classList.add('sel');
      showBlock(g.dataset.id);
    }));
  }

  function showBlock(id) {
    const b = Diagram.BLOCKS.find(x => x.id === id);
    const [roleShort, roleLong] = Diagram.ROLE_TEXT[b.role];
    const midSpec = k => ParamSpecs.MIDDLE.flatMap(g => g[2]).find(x => x[0] === k);
    let rows = '';
    for (const k of b.params) {
      const sp = midSpec(k);
      const val = P2[k] * sp[3];
      const isKey = KEY.some(x => x[0] === k);
      rows += `<tr><td><code>${k}</code>${isKey ? ' <span class="tagexp">experiment</span>' : ''}</td>
        <td class="num">${val.toFixed(sp[4])} ${sp[2]}</td><td>${sp[5]}</td></tr>`;
    }
    $('#blockInfo').innerHTML =
      `<h3 style="margin:0 0 4px">${b.label} &mdash; ${b.anat.replace(/\n/g, ' ')}</h3>
       <p style="margin:4px 0"><b>Position:</b> ${roleShort}. ${roleLong}</p>
       <p style="margin:4px 0">${b.what}</p>
       <table><tr><th>Element</th><th>Current value</th><th>What it represents</th></tr>${rows}</table>
       <p class="hint">Values shown are the ones currently set on the Simulator tab.</p>`;
  }


  /* Live derived / assumed readout for the otitis-media scenario. Keeps the
   * distinction between DERIVED and ASSUMED visible while the sliders move. */
  function showOmeDerived(p, r, child) {
    const fPTA = [500, 1000, 2000, 4000];
    const loss = fPTA.reduce((a, f0) =>
      a + (at(child.total, f0, C.db) - at(r.total, f0, C.db)), 0) / fPTA.length;
    const ls = [];
    for (let f0 = 250; f0 <= 4000; f0 *= 1.15)
      ls.push(at(child.total, f0, C.db) - at(r.total, f0, C.db));
    const flat = Math.max(...ls) - Math.min(...ls);
    const y226 = 1 / (at(r.inputImpedance, 226, C.abs) * p.Z_unitToSI) / 1e-8;
    const childY = 1 / (at(child.inputImpedance, 226, C.abs) * p.Z_unitToSI) / 1e-8;
    const d = (t, v, tag) => `<span class="d"><b>${t}${tag ? ' <span class="tagd ' + tag +
      '">' + tag + '</span>' : ''}</b><span>${v}</span></span>`;
    const ok = (c, txt) => `<b style="color:${c ? '#2f7d32' : '#a3142b'}">${txt}</b>`;
    $('#omeDerived').innerHTML =
      `<div style="margin-bottom:6px">${
        d('Air volume left', p.V_c.toFixed(2) + ' cm³', 'derived')}${
        d('C_cp', p.C_cp.toExponential(3) + ' F', 'derived')}${
        d('Added drum mass', (p.ome_L_added * 1e3).toFixed(1) + ' mH', 'derived')}${
        d('L_te total', (p.L_te * 1e3).toFixed(1) + ' mH', 'derived')}</div>
       <div style="margin-bottom:6px">${
        d('R_te', p.R_te.toFixed(0) + ' Ω', 'assumed')}${
        d('C_te', (p.C_te * 1e6).toFixed(3) + ' µF', 'assumed')}${
        d('R_a', p.R_a.toFixed(0) + ' Ω', 'assumed')}</div>
       <div style="border-top:1px solid var(--line);padding-top:6px">${
        d('4PTA loss vs healthy child', loss.toFixed(1) + ' dB')}${
        d('Flatness 250–4000 Hz', flat.toFixed(1) + ' dB')}${
        d('Y(226 Hz)', y226.toFixed(2) + ' mmho (child ' + childY.toFixed(2) + ')')}${
        d('Resonance', r.fResonance.toFixed(0) + ' Hz (child ' + child.fResonance.toFixed(0) + ')')}</div>
       <div style="border-top:1px solid var(--line);padding-top:6px;margin-top:6px">
        <b>Against the clinic:</b>
        loss 10–40 dB ${ok(loss >= 10 && loss <= 40, loss.toFixed(1) + ' dB')} ·
        flat &lt;10 dB ${ok(flat < 10, flat.toFixed(1) + ' dB')} ·
        type B &lt;0.2 mmho ${ok(y226 < 0.2, y226.toFixed(2))} ·
        resonance falls ${ok(r.fResonance < child.fResonance, r.fResonance.toFixed(0) + ' Hz')}
       </div>
       <p class="hint" style="margin:6px 0 0">Green means the model matches that clinical
       signature at these settings. You will find it hard to turn all four green at once —
       that limitation is explained below and is a property of the circuit, not of the sliders.</p>`;
    wrapTables();
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
        if (!userAudio) { alert('Upload an audio file first.'); return null; }
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
         timbre, not level.`;
    };
    $('#btnDry').addEventListener('click', () => go(false));
    $('#btnWet').addEventListener('click', () => go(true));
    $('#btnStop').addEventListener('click', () => player.stop());
    $('#normNote').textContent = 'Play something to see the exact figure.';

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
        ' (16-bit WAV cannot hold the raw gain, so the file is peak-normalised).';
    });
  }

  function download(name, text, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name; a.click();
  }

  start();
})();
