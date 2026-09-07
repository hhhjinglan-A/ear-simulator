/* content.js — the written deliverables: circuit description, parameter
 * provenance, cascade assumptions, limitations, validation results and the
 * AI-use log. Kept as data so the same text can be exported.
 */
(function (root) {
  'use strict';

  const CIRCUIT = `
<h2>The circuit <span class="zh">电路</span></h2>
<p class="note">Transcribed from <b>Figure 1</b> of Pascal, Bourgeade, Lagier &amp; Legros,
"Linear and nonlinear model of the human middle ear", <i>J. Acoust. Soc. Am.</i> <b>104</b>(3),
1509–1516 (1998), with anatomy from Table I. Figure 1 is captioned
"adapted from Zwislocki (1962)".
<span class="zh">电路逐元件转写自论文 Figure 1，解剖常数来自 Table I。</span></p>

<pre class="mono">  p_t o--[Z_cavity]--o--[Z_ossicles]--o--[Z_stapes]--o
       u_t     node1 |         node2 |        node3 |
                [Z_eardrum]     [Z_joint]     [Z_cochlea]   &lt;- p_c measured here
                     |               |             |
                    gnd             gnd           gnd</pre>

<p>Series elements are losses <i>on the road</i>; shunt elements are <i>dead ends</i>
that bleed volume velocity to ground without passing it on.
<span class="zh">串联元件是"路上的损耗"，并联元件是"死胡同"——能量漏掉、传不下去。这个区别不是记号问题，见实验 E2。</span></p>

<table>
<tr><th>Block</th><th>Elements (Fig. 1)</th><th>Role</th><th>Internal topology</th></tr>
<tr><td>Z_cavity<br><span class="zh">中耳腔</span></td><td>L_a 12 mH, C_cp 3.6 µF, R_a 20 Ω, R_cm 420 Ω, C_cm 0.35 µF</td><td><b>series</b></td><td>(L_a+C_cp+R_a) ∥ R_cm ∥ C_cm</td></tr>
<tr><td>Z_eardrum<br><span class="zh">鼓膜损耗</span></td><td>R_ti1 200 Ω, C_ti1 0.5 µF, C_ti2 0.3 µF, R_ti2 105 Ω, L_ti 15 mH, R_ti3 12500 Ω, C_ti3 0.2 µF</td><td><b>shunt</b> at node 1<br>(taps <i>before</i> C_te)</td><td>R_ti1 + C_ti1 + ((C_ti2+R_ti2) ∥ L_ti) + (R_ti3 ∥ C_ti3)</td></tr>
<tr><td>Z_ossicles<br><span class="zh">鼓膜-锤骨-砧骨</span></td><td>C_te 1.4 µF, L_te 40 mH, R_te 65 Ω</td><td><b>series</b></td><td>all in series</td></tr>
<tr><td>Z_joint<br><span class="zh">砧镫关节</span></td><td>C_is 0.03 µF, R_is 170 Ω</td><td><b>shunt</b> at node 2</td><td>R_is + C_is</td></tr>
<tr><td>Z_stapes<br><span class="zh">镫骨+环韧带+前庭</span></td><td>L_s 8 mH, C_st, R_la, C_la, L_v 21 mH</td><td><b>series</b></td><td>all in series</td></tr>
<tr><td>Z_cochlea<br><span class="zh">耳蜗+蜗孔</span></td><td>R_co 1211 Ω, R_h 850 Ω, L_h 150 mH</td><td><b>terminal load</b></td><td>R_co ∥ (R_h + L_h)</td></tr>
</table>

<h2>The transformer, which Figure 1 does not draw <span class="zh">图中未画出的变压器</span></h2>
<p>The paper is explicit (p. 1510): <i>"The impedance match between the eardrum and the cochlea
can be symbolized by an electrical transformer. This influence is not represented in Fig. 1
but must be considered in the computation."</i> Eq. (1) gives
<code>T_r = lever × area ratio = 1 × 17 = 17</code>.</p>
<p>All element values are <b>already referred to the tympanic side</b>, so the pressure across the
referred cochlear load is multiplied by T_r <b>once, and only once</b>.
<span class="zh">元件已折算到鼓膜侧，输出乘一次 T_r 还原为前庭压强。乘两次或漏乘会差 T_r²=289 倍（约 49 dB）。</span></p>

<h2>Verification of the transcription <span class="zh">转写核对</span></h2>
<table>
<tr><th>Check</th><th>Model</th><th>Derivation from the paper</th><th>Agreement</th></tr>
<tr><td>Compliance ↔ volume</td><td>C_cp + C_cm = 3.95 µF</td><td>V_c/(ρ_a c²) = 5.5/(1.15e-3·(3.5e4)²) = 3.904e-6</td><td class="num">1.2 %</td></tr>
<tr><td>Inertance ↔ mass</td><td>L_s = 8 mH</td><td>(m/A_f²)/T_r² = (2.5e-3/0.032²)/289 = 8.448e-3</td><td class="num">5.3 %</td></tr>
<tr><td>Cochlear resistance</td><td>R_co = 1211 Ω</td><td>0.35e11 Pa·s/m³ (Zwislocki 1975) ÷ T_r² ÷ 1e5</td><td class="num">exact</td></tr>
<tr><td>IEC 318 canal circuit<br>(inherited from the outer-ear work)</td><td>5634.95 Hz, 27.0018 dB</td><td><b>ngspice</b> simulation of the same circuit: 5636.8 Hz, 27.00 dB</td><td class="num">3.3e-4</td></tr>
</table>
<p class="hint">The second and third only work if the elements are <b>divided</b> by T_r², which is what
licenses multiplying the output by T_r once. The cavity compliances are <i>not</i> referred — they sum
directly to V_c/(ρc²) — correctly, since the cavity sits on the eardrum side of the transformer.</p>

<h2>Parameter provenance <span class="zh">参数来源分类</span></h2>
<p class="note">At least three parameters classified, as the assignment requires.
<span class="zh">下表逐项标明：物理推导 / 测量·拟合 / 假设。</span></p>
<table>
<tr><th>Parameter</th><th>Classification</th><th>Basis</th></tr>
<tr><td>C_cp + C_cm</td><td><b>PHYSICALLY DERIVED</b><br><span class="zh">物理推导</span></td><td>Eq. (2) C = V/(ρ_a c²) from the measured cavity volume; reproduces the printed values to 1.2 %. Verified independently in this project.</td></tr>
<tr><td>L_s (stapes)</td><td><b>PHYSICALLY DERIVED</b><br><span class="zh">物理推导</span></td><td>Stapes mass 2.5 mg on a 3.2 mm² footplate → m/A_f², referred through T_r². Agrees to 5.3 %.</td></tr>
<tr><td>T_r = 17</td><td><b>PHYSICALLY DERIVED</b><br><span class="zh">物理推导</span></td><td>Eq. (1), lever ratio 1 × area ratio 55/3.2 = 17.2, rounded to 17 in Table I.</td></tr>
<tr><td>R_co = 1211 Ω</td><td><b>MEASURED</b><br><span class="zh">测量</span></td><td>Cochlear acoustic impedance 0.35e11 Pa·s/m³ (Zwislocki 1975), referred through T_r². Not derivable from anatomy.</td></tr>
<tr><td>R_ti1–3, C_ti1–3, L_ti</td><td><b>FITTED</b><br><span class="zh">拟合</span></td><td>The paper states the elasticity resistances and capacitances were "estimated using a minimization algorithm (Nelder and Mead, 1965)". There is no anatomical object corresponding to "cell 2" — treating R_ti2 as anatomy would be a mistake.</td></tr>
<tr><td>R_h, L_h (helicotrema)</td><td><b>FITTED</b><br><span class="zh">拟合</span></td><td>Same Simplex minimisation; the paper says the cochlear model form was "defined before testing many solutions".</td></tr>
<tr><td>Child cavity volume 2.8 cm³</td><td><b>ASSUMED — no source</b><br><span class="zh">假设，无来源</span></td><td>See the Child / Otitis media tab. No measured paediatric middle-ear <i>cleft</i> volume was found; published child volumes of 0.4–1.3 cm³ are <i>ear-canal</i> equivalent volumes, a different cavity.</td></tr>
<tr><td>All otitis-media magnitudes</td><td><b>ASSUMED</b><br><span class="zh">假设</span></td><td>Directions are literature-supported; magnitudes are order-of-magnitude guesses.</td></tr>
</table>

<h2>Cascade loading assumption <span class="zh">级联的负载假设</span></h2>
<p><code>H_total = H_outer × H_middle</code> is only valid if the middle ear draws negligible
volume velocity from the ear canal, i.e. <code>|z_t| ≫ Z_canal</code>. Against the canal's
characteristic impedance ρc/A ≈ 9.35e6 Pa·s/m³ the measured ratio is
<b>median ≈ 8.9, minimum ≈ 3.5</b> — not the ≫ that the product assumes.
<span class="zh">级联假设要求中耳输入阻抗远大于耳道源阻抗。实测中位数约 8.9、最小约 3.5，并不是"远大于"，在中耳共振附近最弱。</span>
The live value is plotted on the Simulator tab and recomputed as you move the sliders.</p>

<h2>Three real limitations <span class="zh">三项实际局限</span></h2>
<ol>
<li><b>The cascade is approximate near the middle-ear resonance.</b> Around 1–2 kHz the middle ear
absorbs most power and does load the canal, damping and detuning its resonance. Nothing here corrects for it.
<span class="zh">1–2 kHz 附近中耳确实给耳道加载，级联只是近似。</span></li>
<li><b>Lumped elements cannot describe the ear above ~3 kHz.</b> The circuit assumes one pressure and
one volume velocity per node; the real tympanic membrane breaks into modes above roughly 3 kHz. The paper
itself notes (p. 1511) that above 2.5 kHz the incudomalleal joint introduces a phase angle it treats as stiff.
<span class="zh">3 kHz 以上鼓膜分区振动，集总参数模型失效。</span></li>
<li><b>The two models do not share a boundary condition.</b> The outer-ear model terminates its canal in a
<i>rigid</i> eardrum (gain 1/cos kL), not in the z_t computed here, and nothing feeds back from stapes to concha.
<span class="zh">外耳模型的终止条件是刚性鼓膜，不是这里算出的中耳阻抗，两个模型不共享边界条件。</span></li>
<li><b>The outer-ear stage already over-predicts and the cascade inherits it.</b> It gives about +22 dB near
3 kHz where a real ear measures roughly +15 to +20 dB — a 2–7 dB offset carried straight into the combined curve.
<span class="zh">外耳段本身高估 2–7 dB，组合曲线原样继承，引用绝对数值时要扣掉。</span></li>
<li><b>Strictly linear.</b> The acoustic reflex and the level-dependent annular ligament (Eqs. 3, 6, 7)
are documented but not implemented; the model is level-independent.
<span class="zh">完全线性，未实现声反射与环韧带的非线性。</span></li>
</ol>`;

  const VALID = `
<h2>Two different claims, kept separate <span class="zh">两种"一致"，必须分开说</span></h2>
<div class="note">
<b>A. The web page agrees with MATLAB.</b> This says the JavaScript port is faithful. It says
<i>nothing</i> about whether the model is right.<br>
<b>B. The model agrees with the paper / with measurements.</b> This is a claim about the physics.<br>
<span class="zh">A 是"网页 = MATLAB"，只说明移植没错；B 是"模型 = 论文/实验"，才是科学结论。两者不能混为一谈。</span>
</div>

<h2>A · Web vs MATLAB <span class="zh">网页与 MATLAB 的数值比较</span></h2>
<p>The MATLAB model exports complex responses for 12 scenarios × 96 frequencies
(<code>exportWebReference.m</code> → <code>data/reference.json</code>). The page recomputes
each from scratch and compares in the <b>complex plane</b>, not just magnitude.
Run it live below — it uses the same file the offline check uses.</p>
<div class="btnrow"><button id="btnSelfTest">Run web-vs-MATLAB comparison <span class="zh">运行对拍</span></button></div>
<div id="selfTestOut"></div>
<p class="hint">Offline the same comparison runs under JavaScriptCore via
<code>tools/compare.js</code>, which additionally counts non-finite values so a NaN cannot
silently report a perfect score.</p>

<h2>B · Model vs the paper <span class="zh">模型与论文的比较</span></h2>
<p>Reference points digitised by eye from the scanned Figs. 2 and 3
(±1.5 dB, ±15 % and ±10° of reading error).</p>
<table>
<tr><th></th><th>Magnitude</th><th>Phase</th></tr>
<tr><td><b>Fig. 3</b> H(f) = p_c/p_t</td><td class="num">1.34 dB rms (max 2.32)</td><td class="num">7.9° rms (max 18°)</td></tr>
<tr><td><b>Fig. 2</b> z_t = p_t/u_t</td><td class="num">0.91 dB rms (max 1.85)</td><td class="num">2.5° rms (max 5.0°)</td></tr>
</table>
<p><b>Magnitude and phase establish different things.</b>
<b>Magnitude</b> tests the element values and the transformer referral; it is insensitive to
topology, and an earlier demonstrably-wrong version of this circuit still produced a
plausible-looking magnitude curve. <b>Phase</b> tests the topology and the ordering — it is set
by how many independent energy stores the signal passes through and in what order, so it catches
a mis-placed shunt that magnitude alone would hide.
<span class="zh">幅度验元件数值和变压器折算，对拓扑不敏感；相位验拓扑和先后顺序。只有两者都过，才说明零件对、接法也对。</span></p>

<h2>An open question, not a correction <span class="zh">存疑项，不是断言论文印错</span></h2>
<div class="warn">
<b>Units of Eq. (7)</b> — the annular-ligament capacitance coefficients.
<span class="zh">论文 Eq.7 的电容系数单位存疑。</span>
</div>
<p>The paper prints c₁ = −3.33e-2 <b>F</b>, c₃ = 0.54 <b>F</b>, giving C_la = 0.5067 F at rest.
Two readings are possible and this project <b>cannot settle which the authors intended</b>:</p>
<table>
<tr><th>Reading</th><th>For</th><th>Against</th><th>Fig. 3</th><th>Fig. 2</th></tr>
<tr><td>A — literal (farads)</td><td>faithful to the printed text</td><td>1 F ≡ 1 cm⁵/dyn here, so 0.54 F is ~10⁵× the entire middle-ear cavity (3.95 µF) — impedance ≈0.003 Ω at 100 Hz, i.e. a short circuit, odd for an element Fig. 1 labels</td><td class="num">3.56 dB rms</td><td class="num">2.77 dB rms</td></tr>
<tr><td>B — microfarads <b>(used)</b></td><td>consistent with every other capacitance in Fig. 1; makes the ligament a real stiffness</td><td>not what the text says</td><td class="num"><b>1.34 dB rms</b></td><td class="num"><b>0.91 dB rms</b></td></tr>
</table>
<p>Only Reading B falls inside the figure-reading error, so it is the default — but that is
<b>indirect evidence</b>, not a statement about the authors' intent. It should be checked against
Lutman &amp; Martin (1979), the source the reflex model derives from, before being reported as fact.
<span class="zh">只有读法 B 能复现论文自己的曲线，故采用；但这是间接证据，需核对 1979 年原文才能定论。</span></p>

<h2>AI use and error log <span class="zh">AI 使用与纠错记录</span></h2>
<p class="note">Separating <b>what the AI caught in its own work</b> from <b>what I caught by checking
against the source</b>. <span class="zh">区分"AI 自查发现的"和"我本人核对论文发现的"。</span></p>
<table>
<tr><th>#</th><th>What happened</th><th>Caught by</th></tr>
<tr><td>1</td><td>AI proposed a naive series chain for the five subsystems. Wrong: the circuit is a ladder.</td><td><b>Me</b> — I described the ladder structure to it</td></tr>
<tr><td>2</td><td>AI then built the eardrum losses as three parallel RC cells tapping <i>after</i> the ossicles. Figure 1 shows one series chain containing two parallel sub-blocks, tapping <i>before</i> C_te.</td><td><b>Me</b> — only visible once I supplied the paper</td></tr>
<tr><td>3</td><td>AI measured p_c across the whole stapes-plus-cochlea tail instead of across the cochlear load alone, overstating output where the stapes mass reactance is large. Changed H at 4 kHz by more than 10 dB.</td><td><b>Me</b> — reading Fig. 1</td></tr>
<tr><td>4</td><td>AI invented a transformer ratio ≈22 before the paper was available; Eq. (1) gives 17.</td><td><b>Me</b> — I supplied Eq. (1)</td></tr>
<tr><td>5</td><td>AI's own test suite asserted a complex division <code>z/z</code> is bit-exactly 1; that a softer cavity can only raise H (it reverses sign above the ossicular resonance); that opening the joint shunt can only raise H (it destroys the 5.4 kHz resonance, costing 5.3 dB); and that a complex current-divider magnitude is bounded by 1.</td><td><b>AI self-check</b> — found by running its own tests</td></tr>
<tr><td>6</td><td>AI had written "Values are Figure 1 / Table I of Pascal et al." into source it had never read. It flagged this itself and downgraded it to an explicit "provenance unverified" block until the PDF arrived.</td><td><b>AI self-check</b></td></tr>
<tr><td>7</td><td>The web-vs-MATLAB comparison silently treated NaN as a perfect score, because every comparison against NaN is false. Hardened to count non-finite values explicitly.</td><td><b>AI self-check</b> — noticed an impossible "0.00e+0" row</td></tr>
<tr><td>8</td><td>The outer-ear engine was copied into this project without its own test suite, so the copy was assumed rather than verified to still work.</td><td><b>Me</b> — I asked whether H1 had actually been integrated</td></tr>
</table>`;

  root.Content = { CIRCUIT, VALID };
})(typeof globalThis !== 'undefined' ? globalThis : this);
