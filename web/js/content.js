/* content.js — the written deliverables: circuit description, parameter
 * provenance, cascade assumptions, limitations, validation results and the
 * AI-use log. Kept as data so the same text can be exported.
 */
(function (root) {
  'use strict';

  const CIRCUIT = `
<h2>The circuit</h2>
<p class="note">Transcribed from <b>Figure 1</b> of Pascal, Bourgeade, Lagier &amp; Legros,
"Linear and nonlinear model of the human middle ear", <i>J. Acoust. Soc. Am.</i> <b>104</b>(3),
1509–1516 (1998), with anatomy from Table I. Figure 1 is captioned
"adapted from Zwislocki (1962)".</p>

<pre class="mono">  p_t o--[Z_cavity]--o--[Z_ossicles]--o--[Z_stapes]--o
       u_t     node1 |         node2 |        node3 |
                [Z_eardrum]     [Z_joint]     [Z_cochlea]   &lt;- p_c measured here
                     |               |             |
                    gnd             gnd           gnd</pre>

<p><b>Series</b> and <b>shunt</b> describe <i>where an element sits</i>, not whether it wastes
energy. A <b>series</b> element is in the signal path: all the volume velocity passes through it,
and the pressure it drops is subtracted from what continues onward. A <b>shunt</b> element offers a
parallel route back to the return, diverting volume velocity that then never reaches the cochlea.</p>
<p>Whether either one <i>dissipates</i> depends only on whether it is resistive: a series capacitor
or inductor stores energy and gives it back, reshaping the response without wasting any, and only
the resistances dissipate. A shunt branch is not a "dead end" either — it carries real volume
velocity to the return. What makes it a loss <i>for the cochlea</i> is the diversion, not
disappearance. The distinction is not cosmetic: see experiment E2, where an element's position
decides the sign and the frequency dependence of its effect.</p>

<table>
<tr><th>Block</th><th>Elements (Fig. 1)</th><th>Role</th><th>Internal topology</th></tr>
<tr><td>Z_cavity<br></td><td>L_a 12 mH, C_cp 3.6 µF, R_a 20 Ω, R_cm 420 Ω, C_cm 0.35 µF</td><td><b>series</b></td><td>(L_a+C_cp+R_a) ∥ R_cm ∥ C_cm</td></tr>
<tr><td>Z_eardrum<br></td><td>R_ti1 200 Ω, C_ti1 0.5 µF, C_ti2 0.3 µF, R_ti2 105 Ω, L_ti 15 mH, R_ti3 12500 Ω, C_ti3 0.2 µF</td><td><b>shunt</b> at node 1<br>(taps <i>before</i> C_te)</td><td>R_ti1 + C_ti1 + ((C_ti2+R_ti2) ∥ L_ti) + (R_ti3 ∥ C_ti3)</td></tr>
<tr><td>Z_ossicles<br></td><td>C_te 1.4 µF, L_te 40 mH, R_te 65 Ω</td><td><b>series</b></td><td>all in series</td></tr>
<tr><td>Z_joint<br></td><td>C_is 0.03 µF, R_is 170 Ω</td><td><b>shunt</b> at node 2</td><td>R_is + C_is</td></tr>
<tr><td>Z_stapes<br></td><td>L_s 8 mH, C_st, R_la, C_la, L_v 21 mH</td><td><b>series</b></td><td>all in series</td></tr>
<tr><td>Z_cochlea<br></td><td>R_co 1211 Ω, R_h 850 Ω, L_h 150 mH</td><td><b>terminal load</b></td><td>R_co ∥ (R_h + L_h)</td></tr>
</table>

<h2>The transformer, which Figure 1 does not draw</h2>
<p>The paper is explicit (p. 1510): <i>"The impedance match between the eardrum and the cochlea
can be symbolized by an electrical transformer. This influence is not represented in Fig. 1
but must be considered in the computation."</i> Eq. (1) gives
<code>T_r = lever × area ratio = 1 × 17 = 17</code>.</p>
<p>All element values are <b>already referred to the tympanic side</b>, so the pressure across the
referred cochlear load is multiplied by T_r <b>once, and only once</b>.</p>

<h2>Verification of the transcription</h2>
<table>
<tr><th>Check</th><th>Model</th><th>Derivation from the paper</th><th>Agreement</th></tr>
<tr><td>Compliance ↔ volume</td><td>C_cp + C_cm = 3.95 µF</td><td>V_c/(ρ_a c²) = 5.5/(1.15e-3(3.5e4)²) = 3.904e-6</td><td class="num">1.2 %</td></tr>
<tr><td>Inertance ↔ mass</td><td>L_s = 8 mH</td><td>(m/A_f²)/T_r² = (2.5e-3/0.032²)/289 = 8.448e-3</td><td class="num">5.3 %</td></tr>
<tr><td>Cochlear resistance</td><td>R_co = 1211 Ω</td><td>0.35e11 Pas/m³ (Zwislocki 1975) ÷ T_r² ÷ 1e5</td><td class="num">exact</td></tr>
<tr><td>IEC 318 canal circuit<br>(inherited from the outer-ear work)</td><td>5634.95 Hz, 27.0018 dB</td><td><b>ngspice</b> simulation of the same circuit: 5636.8 Hz, 27.00 dB</td><td class="num">3.3e-4</td></tr>
</table>
<p class="hint">The second and third only work if the elements are <b>divided</b> by T_r², which is what
licenses multiplying the output by T_r once. The cavity compliances are <i>not</i> referred — they sum
directly to V_c/(ρc²) — correctly, since the cavity sits on the eardrum side of the transformer.</p>

<h2>Parameter provenance</h2>
<p class="note">At least three parameters classified, as the assignment requires.</p>
<table>
<tr><th>Parameter</th><th>Classification</th><th>Basis</th></tr>
<tr><td>C_cp + C_cm</td><td><b>PHYSICALLY DERIVED</b><br></td><td>Eq. (2) C = V/(ρ_a c²) from the measured cavity volume; reproduces the printed values to 1.2 %. Verified independently in this project.</td></tr>
<tr><td>L_s (stapes)</td><td><b>PHYSICALLY DERIVED</b><br></td><td>Stapes mass 2.5 mg on a 3.2 mm² footplate → m/A_f², referred through T_r². Agrees to 5.3 %.</td></tr>
<tr><td>T_r = 17</td><td><b>PHYSICALLY DERIVED</b><br></td><td>Eq. (1), lever ratio 1 × area ratio 55/3.2 = 17.2, rounded to 17 in Table I.</td></tr>
<tr><td>R_co = 1211 Ω</td><td><b>MEASURED</b><br></td><td>Cochlear acoustic impedance 0.35e11 Pas/m³ (Zwislocki 1975), referred through T_r². Not derivable from anatomy.</td></tr>
<tr><td>R_ti1–3, C_ti1–3, L_ti</td><td><b>FITTED</b><br></td><td>The paper states the elasticity resistances and capacitances were "estimated using a minimization algorithm (Nelder and Mead, 1965)". There is no anatomical object corresponding to "cell 2" — treating R_ti2 as anatomy would be a mistake.</td></tr>
<tr><td>R_h, L_h (helicotrema)</td><td><b>FITTED</b><br></td><td>Same Simplex minimisation; the paper says the cochlear model form was "defined before testing many solutions".</td></tr>
<tr><td>Child cavity volume 2.8 cm³</td><td><b>ASSUMED — no source</b><br></td><td>See the Child / Otitis media tab. No measured paediatric middle-ear <i>cleft</i> volume was found; published child volumes of 0.4–1.3 cm³ are <i>ear-canal</i> equivalent volumes, a different cavity.</td></tr>
<tr><td>All otitis-media magnitudes</td><td><b>ASSUMED</b><br></td><td>Directions are literature-supported; magnitudes are order-of-magnitude guesses.</td></tr>
</table>

<h2>Cascade loading assumption</h2>
<p><code>H_total = H_outer × H_middle</code> is only valid if the middle ear draws negligible
volume velocity from the ear canal, i.e. <code>|z_t| ≫ Z_canal</code>. Against the canal's
characteristic impedance ρc/A ≈ 9.35e6 Pas/m³ the measured ratio is
<b>median ≈ 8.9, minimum ≈ 3.5</b> — not the ≫ that the product assumes.
The live value is plotted on the Simulator tab and recomputed as you move the sliders.</p>

<h2>Three real limitations</h2>
<ol>
<li><b>The cascade is approximate near the middle-ear resonance.</b> Around 1–2 kHz the middle ear
absorbs most power and does load the canal, damping and detuning its resonance. Nothing here corrects for it.</li>
<li><b>Lumped elements cannot describe the ear above ~3 kHz.</b> The circuit assumes one pressure and
one volume velocity per node; the real tympanic membrane breaks into modes above roughly 3 kHz. The paper
itself notes (p. 1511) that above 2.5 kHz the incudomalleal joint introduces a phase angle it treats as stiff.</li>
<li><b>The two models do not share a boundary condition.</b> The outer-ear model terminates its canal in a
<i>rigid</i> eardrum (gain 1/cos kL), not in the z_t computed here, and nothing feeds back from stapes to concha.</li>
<li><b>The outer-ear stage already over-predicts and the cascade inherits it.</b> It gives about +22 dB near
3 kHz where a real ear measures roughly +15 to +20 dB — a 2–7 dB offset carried straight into the combined curve.</li>
<li><b>Strictly linear.</b> The acoustic reflex and the level-dependent annular ligament (Eqs. 3, 6, 7)
are documented but not implemented; the model is level-independent.</li>
</ol>`;

  const VALID = `
<h2>Two different claims, kept separate</h2>
<div class="note">
<b>A. The web page agrees with MATLAB.</b> This says the JavaScript port is faithful. It says
<i>nothing</i> about whether the model is right.<br>
<b>B. The model agrees with the paper / with measurements.</b> This is a claim about the physics.<br>
</div>

<h2>A Web vs MATLAB</h2>
<p>The MATLAB model exports complex responses for 12 scenarios × 96 frequencies
(<code>exportWebReference.m</code> → <code>data/reference.json</code>). The page recomputes
each from scratch and compares in the <b>complex plane</b>, not just magnitude.
Run it live below — it uses the same file the offline check uses.</p>
<div class="btnrow"><button id="btnSelfTest">Run web-vs-MATLAB comparison</button></div>
<div id="selfTestOut"></div>
<p class="hint">Offline the same comparison runs under JavaScriptCore via
<code>tools/compare.js</code>, which additionally counts non-finite values so a NaN cannot
silently report a perfect score.</p>

<h2>B Model vs the paper</h2>
<p>Reference points digitised by eye from the scanned Figs. 2 and 3
(±1.5 dB, ±15 % and ±10° of reading error).</p>
<table>
<tr><th></th><th>Magnitude</th><th>Phase</th></tr>
<tr><td><b>Fig. 3</b> H(f) = p_c/p_t</td><td class="num">1.34 dB rms (max 2.32)</td><td class="num">7.9° rms (max 18°)</td></tr>
<tr><td><b>Fig. 2</b> z_t = p_t/u_t</td><td class="num">0.91 dB rms (max 1.85)</td><td class="num">2.5° rms (max 5.0°)</td></tr>
</table>
<h3>What magnitude and phase each establish</h3>
<p><b>Neither is blind to topology, and magnitude is not the weaker test.</b> An earlier draft of
this page claimed that magnitude was "insensitive to topology" and that a wrong circuit had still
produced a plausible magnitude curve. <b>The project's own recorded numbers contradict that</b>, so
the claim has been withdrawn. Before Figure 1 was available the circuit had the eardrum-loss branch
mis-structured and the output taken at the wrong node, and its magnitude was wrong by far more than
the figure-reading error:</p>
<table>
<tr><th>Frequency</th><th>Paper Fig. 3</th><th>Wrong-topology version</th><th>Error</th></tr>
<tr><td>100 Hz</td><td class="num">+4.0 dB</td><td class="num">+16.7 dB</td><td class="num">+12.7 dB</td></tr>
<tr><td>1 kHz</td><td class="num">+22.4 dB</td><td class="num">+25.0 dB</td><td class="num">+2.6 dB</td></tr>
<tr><td>4 kHz</td><td class="num">+20.8 dB</td><td class="num">+8.1 dB</td><td class="num">&minus;12.7 dB</td></tr>
<tr><td>10 kHz</td><td class="num">+8.0 dB</td><td class="num">+1.2 dB</td><td class="num">&minus;6.8 dB</td></tr>
</table>
<p>Magnitude caught the error immediately once there was something to compare against. The errors
survived as long as they did because <b>no reference curve was available</b>, not because magnitude
is a weak test.</p>
<p>What phase adds is <b>independent</b> evidence rather than stronger evidence. Phase is fixed by
how many energy-storage elements the signal passes and in what order, so it constrains the
arrangement through a partly different route: a model could in principle be tuned to fit a
magnitude curve with compensating element values, and the phase would then still disagree.
Agreement in <i>both</i> is therefore better evidence than either alone — which is why both are
reported separately above, and why neither number is quoted without the other.</p>

<h2>An open question, not a correction</h2>
<div class="warn">
<b>Units of Eq. (7)</b> — the annular-ligament capacitance coefficients.
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
Lutman &amp; Martin (1979), the source the reflex model derives from, before being reported as fact.</p>

<h2>AI use and error log</h2>
<p class="note">Every row is attributed to <b>who actually found it</b>, in three strict
categories. Nothing is attributed to the student that the student did not do.</p>
<table>
<tr><th>Category</th><th>Meaning</th></tr>
<tr><td><b>A · Student found it</b></td><td>The student identified the error from their own
knowledge and told the AI. No new material was needed.</td></tr>
<tr><td><b>B · Student supplied material, AI found it</b></td><td>The student provided the paper
or a table; the AI then read it and located the discrepancy. Neither party could have done this
alone — without the source nothing would have been found, and the student did not do the
element-by-element comparison.</td></tr>
<tr><td><b>C · AI self-check</b></td><td>The AI found it in its own work, with no new material
and without being told anything was wrong — usually by running its own tests.</td></tr>
</table>

<table>
<tr><th>#</th><th>What happened</th><th>Found by</th></tr>

<tr><td>1</td><td>The AI built the five subsystems as a naive series/parallel chain. The circuit
is a <b>ladder network</b>: one series path with shunt branches. The student described the correct
structure in prose.</td><td><b>A</b></td></tr>

<tr><td>2</td><td>The AI estimated a transformer ratio of about 22 from an assumed 1.3 lever ratio.
The student supplied Eq. (1) and the correct value, <b>T_r = 17</b>.</td><td><b>A</b></td></tr>

<tr><td>3</td><td>The outer-ear engine had been copied into this project without its own test
suite, so the copies were assumed rather than verified to still work. The student's question
"did you actually integrate H1?" exposed it.</td><td><b>A</b></td></tr>

<tr><td>4</td><td>Wording in this page claimed magnitude was "insensitive to topology" and that a
wrong circuit had produced a plausible magnitude curve. The student asked for inaccurate
explanations to be corrected; the AI then checked its own recorded numbers, found they contradicted
the claim (12.7 dB error at 4 kHz), and withdrew it.</td><td><b>A</b> flagged the
category, <b>C</b> identified the specific error</td></tr>

<tr><td>5</td><td>With the paper supplied, Figure 1 showed the eardrum-loss branch is a
<b>single series chain containing two parallel sub-blocks</b>, not three parallel RC cells, and
that it taps the main line <b>before</b> C_te, not after the ossicles.</td><td><b>B</b></td></tr>

<tr><td>6</td><td>Figure 1 showed p_c is measured <b>across the cochlear load alone</b>. The model
had been taking it across the whole stapes-plus-cochlea tail, overstating the output wherever the
stapes mass reactance is large — more than 10 dB at 4 kHz.</td><td><b>B</b></td></tr>

<tr><td>7</td><td>Figure 1 showed the cavity block is three branches in parallel,
(L_a+C_cp+R_a) ∥ R_cm ∥ C_cm, not the arrangement first coded.</td><td><b>B</b></td></tr>

<tr><td>8</td><td>The volume assignment on p. 1510 showed C_cp is the <b>pneumatic cells</b> (≈5 cm³)
and C_cm the <b>tympanic cavity</b> (≈0.5 cm³) — the opposite of the labels first used.</td><td><b>B</b></td></tr>

<tr><td>9</td><td>Eq. (7)'s capacitance coefficients are printed in farads, which would make the
annular ligament a short circuit. Testing both readings against the paper's own figures showed only
the microfarad reading reproduces them. Reported as an <b>open question</b>, not as a correction to
the paper.</td><td><b>B</b></td></tr>

<tr><td>10</td><td>The AI's own test suite contained four false assertions, all found by running it:
that a complex division z/z is bit-exactly 1; that a softer cavity can only raise H (the sign
reverses above the ossicular resonance); that opening the joint shunt can only raise H (it destroys
the 5.4 kHz resonance and costs 5.3 dB); and that a complex current-divider magnitude is bounded
by 1.</td><td><b>C</b></td></tr>

<tr><td>11</td><td>The AI had written "Values are Figure 1 / Table I of Pascal et al." into source it
had never read. It flagged this itself and downgraded it to an explicit "provenance unverified"
block until the PDF arrived.</td><td><b>C</b></td></tr>

<tr><td>12</td><td>Implementing the cavity as a shunt, as instructed, produced an input impedance
that falls monotonically to the band edge — which no measured middle ear does. The AI reported the
comparison with the series alternative rather than silently overriding the instruction; the student
then decided to switch. (Figure 1 later confirmed series.)</td><td><b>C</b> found the anomaly,
<b>A</b> made the decision</td></tr>

<tr><td>13</td><td>The web-vs-MATLAB comparison silently treated NaN as a perfect score, because
every comparison against NaN is false. Noticed as an impossible "0.00e+0" row and hardened to count
non-finite values.</td><td><b>C</b></td></tr>

<tr><td>14</td><td>The web page could not resolve a peak shift smaller than one frequency-grid bin,
so experiments E1 and E3 reported a peak as not moving. Found by comparing against MATLAB during
browser testing; fixed with sub-bin parabolic refinement.</td><td><b>C</b></td></tr>

<tr><td>15</td><td>Replacing the asynchronous data fetch with a script tag exposed a
temporal-dead-zone crash that the fetch had been masking. Found by reading the browser console
after the change.</td><td><b>C</b></td></tr>
</table>
<p class="hint">Counts: <b>A</b> 3 (plus 2 shared), <b>B</b> 5, <b>C</b> 6 (plus 2 shared).
The B rows are the substantive physics errors, and none of them could have been found without the
student supplying the paper.</p>`;

  root.Content = { CIRCUIT, VALID };
})(typeof globalThis !== 'undefined' ? globalThis : this);
