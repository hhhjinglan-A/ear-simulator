/* experiments.js — the three (here four) parameter experiments, run in the
 * order the assignment requires: PREDICT -> AI EXPLANATION -> RUN -> COMPARE.
 *
 * The prediction and observation fields are the student's own. Nothing here
 * writes into them; the AI explanation stays hidden until a prediction has
 * been entered, so the explanation cannot be read first and copied.
 * Records live in localStorage and can be exported as JSON or CSV.
 */
(function (root) {
  'use strict';

  const KEY = 'earsim.experiments.v1';

  /* Each experiment names ONE element and a factor. The three the assignment
   * asks for are E1 (inertance), E2 (compliance) and E3 (loss); E4 is a
   * control that isolates the cascade-loading argument. */
  const DEFS = [
    { id: 'E1', param: 'L_te', factor: 1.2, kind: 'Inertance / mass 惯性（质量）',
      title: 'E1 · Ossicular mass L_te +20 %',
      ai: `L_te is a <b>series</b> mass in the main path, so its reactance jωL grows with frequency.
Raising it by 20 % lowers the ossicular resonance 1/(2π√(L_te·C_te)) by 1/√1.2 = −8.7 %, and costs
gain above that resonance while leaving the stiffness-controlled low frequencies almost untouched.
<span class="zh">L_te 是主干道上的串联质量，抬高它会把共振频率压低约 8.7%，并削弱共振以上的增益，低频几乎不变。</span>` },
    { id: 'E2', param: 'C_is', factor: 2.0, kind: 'Compliance 顺应性',
      title: 'E2 · Joint compliance C_is ×2',
      ai: `C_is sits in a <b>shunt</b> branch — a dead end. Doubling it halves that branch's impedance
1/(ωC), so more volume velocity leaks away instead of reaching the stapes, and the leak grows with
frequency. Expect little change below 1 kHz and a clear loss at the top of the band. Note also that
C_is resonates with the stapes+vestibule mass near 5.4 kHz, so it also moves that second peak.
<span class="zh">C_is 在并联死胡同里，加倍等于漏得更多，高频损失明显、低频几乎无影响；它还与镫骨质量在 5.4 kHz 谐振。</span>` },
    { id: 'E3', param: 'R_te', factor: 2.0, kind: 'Resistance / loss 阻性（损耗）',
      title: 'E3 · Ossicular damping R_te ×2',
      ai: `R_te is a <b>series</b> resistance. A resistance only competes with the reactances where they
cancel each other — that is, near resonance. Expect the peak to flatten and very little to happen away
from it. Watch whether the peak also <i>moves</i>: the maximum of a lossy resonator does not sit at the
undamped resonance frequency.
<span class="zh">串联电阻只在共振附近起作用，预期峰值被压平；注意峰值频率是否也会移动。</span>` },
    { id: 'E4', param: 'C_cp', factor: 2.0, kind: 'Control 对照组',
      title: 'E4 · Cavity compliance C_cp ×2 (control)',
      ai: `With the cavity <b>in series</b> (as Fig. 1 draws it) the drum must compress the air behind it,
so a softer cavity is less series stiffness and helps at low frequency, fading out above the ossicular
resonance where mass rather than stiffness sets the impedance. The control point: if the cavity were a
<i>shunt</i> at the input node, this same change would alter H by <b>exactly nothing</b>, because a shunt
across an ideal pressure source cannot affect its output. That is the cascade-loading argument made concrete.
<span class="zh">对照实验：若腔体是输入端并联，这个改动对 H 的影响会精确为零——这正是级联忽略负载效应的具体体现。</span>` }
  ];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  root.Experiments = { DEFS, load, save, KEY };
})(typeof globalThis !== 'undefined' ? globalThis : this);
