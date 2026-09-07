# Middle-Ear Model — extension of an outer-ear simulator

MATLAB implementation of the **linear** middle-ear equivalent circuit of

> J. Pascal, A. Bourgeade, M. Lagier and C. Legros,
> "Linear and nonlinear model of the human middle ear",
> *J. Acoust. Soc. Am.* **104**(3), 1509–1516 (1998).

transcribed from **Figure 1** (circuit + element values, p. 1510) and **Table I**
(anatomy, p. 1510), and cascaded with an outer-ear model from a previous
assignment.

Signal path: **pinna/concha → ear canal → eardrum → ossicles → cochlear load**

**The model reproduces the paper's own published curves to 1.34 dB rms
(Fig. 3, transfer function) and 0.91 dB rms (Fig. 2, input impedance)** — see
§7. Run `test_vsPaper` to reproduce that comparison.

---

## 1. Quick start

```matlab
runAll            % verification + all 5 figures + experiments, opens the figures
combinedEarModel  % the interactive GUI
```

Or double-click `MATLAB_middle_ear_model/run_middle_ear.command`.

Base MATLAB only — no toolboxes. Developed and verified on R2026a.

> `Z_cavity`, `Z_eardrum`, `Z_ossicles`, `Z_joint`, `Z_stapes` and `Z_cochlea`
> are functions taking `(f, p2)`. Typing a bare name at the prompt will error.
> You never need to call them by hand.
> ```matlab
> p2 = middleEarParams();
> Z  = Z_ossicles(logspace(log10(20), log10(20000), 1024).', p2);
> ```

### Test suites

| Command | What it checks | Result |
|---|---|---|
| `test_outerEar` | **inherited from the outer-ear assignment, unchanged** — 20 physics checks on the outer-ear engine, including a cross-check against an ngspice simulation of the same IEC 318 circuit | ALL PASSED |
| `test_vsPaper` | agreement with the paper's Figs. 2 and 3 | 1.34 / 0.91 dB rms |
| `test_middleEar` | circuit algebra, units, transformer, response shape | 80 checks, 0 failed |
| `test_audioIR` | audio path reproduces the analytic transfer function | 23 checks, 0 failed |
| `test_combinedGui` | GUI builds and every control works | 0 failures |

All source files pass `checkcode` with no warnings.

### What is inherited from the outer-ear assignment

Four files are carried over **byte-identical**, not rewritten:
`outerEarParams.m`, `outerEarResponse.m`, `outerEarIR.m` and its test suite
`test_outerEar.m`. `runAll` runs that suite **first**, so the outer-ear engine is
re-verified in its new home before anything is cascaded onto it — the copies are
not assumed to still behave, they are checked. The middle-ear GUI, figure script
and impulse-response helper are modelled on their outer-ear counterparts but are
separate files, since they drive a different transfer function.

---

## 2. The circuit

```
  p_t o--[Z_cavity]--o--[Z_ossicles]--o--[Z_stapes]--o
       u_t     node1 |         node2 |        node3 |
                [Z_eardrum]     [Z_joint]     [Z_cochlea]   <- p_c measured here
                     |               |             |
                    gnd             gnd           gnd
```

| Block | Elements | Role | Internal topology |
|---|---|---|---|
| `Z_cavity` | L_a 12 mH, C_cp 3.6 µF, R_a 20 Ω, R_cm 420 Ω, C_cm 0.35 µF | **series** | (L_a+C_cp+R_a) ∥ R_cm ∥ C_cm |
| `Z_eardrum` | R_ti1 200 Ω, C_ti1 0.5 µF, C_ti2 0.3 µF, R_ti2 105 Ω, L_ti 15 mH, R_ti3 12500 Ω, C_ti3 0.2 µF | **shunt** at node 1 | R_ti1 + C_ti1 + ((C_ti2+R_ti2) ∥ L_ti) + (R_ti3 ∥ C_ti3) |
| `Z_ossicles` | C_te 1.4 µF, L_te 40 mH, R_te 65 Ω | **series** | all in series |
| `Z_joint` | C_is 0.03 µF, R_is 170 Ω | **shunt** at node 2 | in series with each other |
| `Z_stapes` | L_s 8 mH, C_st, R_la, C_la, L_v 21 mH | **series** | all in series |
| `Z_cochlea` | R_co 1211 Ω, R_h 850 Ω, L_h 150 mH | **terminal load** | R_co ∥ (R_h + L_h) |

**Series** and **shunt** describe *where an element sits*, not whether it wastes
energy. A **series** element is in the signal path: all the volume velocity passes
through it and the pressure it drops is subtracted from what continues onward. A
**shunt** element offers a parallel route back to the return, diverting volume
velocity that then never reaches the cochlea.

Whether either dissipates depends only on whether it is resistive — a series
capacitor or inductor stores and returns energy, reshaping the response without
wasting any. A shunt branch is not a "dead end" either: it carries real volume
velocity to the return. What makes it a loss *for the cochlea* is the diversion,
not disappearance. The distinction is not cosmetic — see E2 in §5.

**Definitions**, matching the paper's own figures:

- `R2.inputImpedance` = z_t = p_t/u_t → the paper's Fig. 2
- `R2.total` = H(f) = p_c/p_t, **p_c taken across `Z_cochlea` alone** → Fig. 3

**The transformer.** Figure 1 does not draw it. The paper (p. 1510): *"The
impedance match between the eardrum and the cochlea can be symbolized by an
electrical transformer. This influence is not represented in Fig. 1 but must be
considered in the computation."* Eq. (1): `T_r = lever × area ratio = 1 × 17 = 17`.
All element values are already referred to the tympanic side, so the pressure
across the referred cochlear load is multiplied by `T_r` **once**.

---

## 3. Units, and how they were verified

Figure 1 uses electrical symbols (H, F, Ω) but the numbers are **CGS acoustic**
values: 1 F ≡ 1 cm⁵/dyn, 1 H ≡ 1 g/cm⁴, 1 Ω ≡ 1 dyn·s/cm⁵. Multiply impedances
by `p2.Z_unitToSI = 1e5` for Pa·s/m³. Three independent arithmetic checks, all
asserted in `test_middleEar`:

| Check | Model | Derivation from the paper | Agreement |
|---|---|---|---|
| Compliance ↔ volume | C_cp + C_cm = 3.95 µF | V_c/(ρ_a c²) = 5.5/(1.15e-3·(3.5e4)²) = 3.904e-6 | **1.2 %** |
| Inertance ↔ mass | L_s = 8 mH | (m/A_f²)/T_r² = (2.5e-3/0.032²)/289 = 8.448e-3 | **5.3 %** |
| Cochlear resistance | R_co = 1211 Ω | 0.35e11 Pa·s/m³ (Zwislocki 1975) ÷ T_r² ÷ 1e5 | **exact** |

The second and third only work if the elements are **divided** by T_r², which is
what licenses multiplying the output by T_r once. The cavity compliances are
*not* referred (they sum directly to V_c/(ρc²)) — correctly, since the cavity is
physically on the eardrum side of the transformer.

**Independent circuit cross-check, inherited from the outer-ear assignment.**
The outer-ear model's IEC 318 mode was validated against an **ngspice**
simulation of the same lumped circuit, which is an independent check of a
circuit transcription of exactly the kind this assignment asks for:

| Quantity | ngspice | MATLAB |
|---|---|---|
| Peak frequency | 5636.8 Hz | 5634.95 Hz (rel. err 3.3e-4) |
| Peak gain | 27.00 dB | 27.0018 dB (rel. err 6.7e-5) |

That check runs as part of `test_outerEar`.

**Volume assignment** (p. 1510): V_c = 5.5 cm³ total, antrum + pneumatic cells
≈ 5 cm³, tympanic cavity V_tc = 0.5 cm³. So `C_cp` (3.6 µF ↔ 5.07 cm³) is the
**pneumatic cells** and `C_cm` (0.35 µF ↔ 0.49 cm³) the **tympanic cavity**.

### An open question: the units of Eq. (7)

Eq. (7) gives the annular-ligament capacitance coefficients in **farads**
(c₁ = −3.33e-2 F, c₃ = 0.54 F), making C_la = 0.5067 F at rest. Two readings
are possible; this code adopts one and records the evidence for both rather
than asserting the paper is in error.

**Reading A — literal (farads).** Faithful to the printed text. Against it: in
this analogue 1 F ≡ 1 cm⁵/dyn, so 0.54 F is a compliance ~10⁵ times larger than
the *entire* middle-ear cavity (C_cp + C_cm = 3.95 µF). Its impedance is then
~0.003 Ω at 100 Hz — the annular ligament is a short circuit contributing
nothing, which sits oddly with Fig. 1 drawing it as a labelled element.

**Reading B — microfarads.** Consistent with every other capacitance in Fig. 1,
and makes the ligament a real stiffness. Against it: it is not what the text
says.

The evidence that decides it *here* is agreement with the paper's own published
curves — an indirect test, and not a statement about the authors' intent:

| | Fig. 3 magnitude | Fig. 2 magnitude |
|---|---|---|
| Reading A (F) | 3.56 dB rms | 2.77 dB rms |
| **Reading B (µF)** | **1.34 dB rms** | **0.91 dB rms** |

Only Reading B falls inside the error of reading the scanned figures, so it is
the default. **This remains unconfirmed** and should be checked against the
Lutman & Martin (1979) source that the reflex model derives from before being
reported as a fact about the paper. `p2.C_la_unitsAsPrinted = true` restores
Reading A.

---

## 4. Results

| Quantity | Model | Paper (Figs. 2–3) |
|---|---|---|
| H peak | +20.4 dB at 1422 Hz | ≈ +22.5 dB, 800–1600 Hz plateau |
| H at 100 Hz | +5.1 dB | +4.0 dB |
| H at 4 kHz (2nd peak) | +19.3 dB | +20.8 dB |
| H at 10 kHz | +7.4 dB | +8.0 dB |
| \|z_t\| at 100 Hz | 3.16e8 Pa·s/m³ | 3.5e8 |
| \|z_t\| at 1 kHz | 6.99e7 Pa·s/m³ | 6.0e7 |
| Middle-ear resonance (first local min of \|z_t\|) | 1738 Hz | ≈ 1800 Hz |
| Static admittance at 226 Hz | 0.65 mmho | *(child 5–7 yr norm 0.2–1.0)* |
| Combined outer+middle peak | +39.2 dB at 3003 Hz | — |

The **second peak near 4–5 kHz** is not an artefact: `C_is` (0.03 µF) resonates
with the stapes + vestibular mass `L_s + L_v` (29 mH) at
1/(2π√(LC)) = **5396 Hz**. Open-circuiting the joint destroys it (−5.3 dB at
5262 Hz), which `test_middleEar` asserts.

Figures: `figures/fig1_outer_ear.png`, `fig2_middle_ear.png`,
`fig3_combined.png`, `fig4_experiments.png`, `fig5_otitis_media.png`.

---

## 5. Parameter experiments

Predictions were written into `runMiddleEarExperiments.m` **before** each run.
ΔH in dB.

| | 100 Hz | 500 Hz | 1 kHz | 2 kHz | 4 kHz | 10 kHz |
|---|---|---|---|---|---|---|
| **E1** `L_te` +20 % (inertance) | +0.01 | +0.10 | −0.04 | −0.12 | −0.14 | **−1.96** |
| **E2** `C_is` ×2 (compliance) | −0.15 | −0.10 | +0.21 | +0.88 | +0.04 | **−6.70** |
| **E3** `R_te` ×2 (resistance) | −0.03 | −0.41 | −0.47 | −0.32 | −0.45 | −0.06 |
| **E4** `C_cp` ×2 (cavity compliance) | +0.22 | +0.30 | +0.09 | −0.48 | +0.00 | +0.00 |

**E2 is the most instructive.** A more compliant joint is a bigger *leak*, and
because the joint is a **shunt** its effect is concentrated where its impedance
is lowest — −6.7 dB at 10 kHz and essentially nothing below 1 kHz. If the joint
had been wired in series the sign and frequency dependence would both be wrong.
This is the experiment that most directly tests whether the ladder topology is
right.

**E3** flattens the peak (+20.4 → +20.0 dB) and — not predicted — *moves* it
(1422 → 1444 Hz). The maximum of a lossy resonator does not sit at the undamped
resonance.

**E4 control.** With the cavity moved to a shunt at the input node (the rejected
variant), the same `C_cp` ×2 produces **exactly 0.00000 dB** of change across
the whole band, while |z_t| at 1 kHz moves +4.18 dB. A shunt at the input node
cannot affect the output of an ideal pressure source; it acts only through
loading, and the cascade H_outer × H_middle discards loading. Figure 1 draws the
cavity **in series**, so the real model does not have that blind spot.

---

## 6. Cascade assumptions and limitations

`H_total = H_outer × H_middle` requires the middle ear to draw negligible volume
velocity from the canal, i.e. `|z_t| ≫ Z_canal`. Measured against the canal's
characteristic impedance ρc/A = 9.35e6 Pa·s/m³, the ratio is **median 8.9,
minimum 3.49**. So:

1. **The cascade is approximate near the middle-ear resonance.** The ratio is
   lowest around 1–2 kHz, where the middle ear absorbs most power and does load
   the canal, damping and detuning its resonance. `C.loadingRatio` reports this
   per frequency; nothing corrects for it.
2. **Lumped elements cannot describe the ear above ~3 kHz.** The circuit assumes
   one pressure and one volume velocity per node; the real tympanic membrane
   breaks into modes above roughly 3 kHz. The paper itself notes (p. 1511) that
   above 2.5 kHz the incudomalleal joint introduces a phase angle it treats as
   stiff.
3. **The two models do not share a boundary condition.** The outer-ear model
   terminates its canal in a *rigid* eardrum (gain 1/cos kL), not in the z_t
   computed here, and nothing feeds back from stapes to concha.

4. **The outer-ear stage already over-predicts, and the cascade inherits it.**
   The outer-ear model gives a combined peak of about +22 dB near 3 kHz where a
   real ear measures roughly +15 to +20 dB at 2.5–3 kHz — an overestimate of
   some 2–7 dB carried straight into the combined +39.2 dB figure. The
   middle-ear stage is not responsible for it, and any absolute level quoted
   from `C.total` should be read with that offset in mind.

Also: the model is **strictly linear** (`p2.nonlinear` unimplemented — Eqs. 3,
6, 7 are documented but not coded), and the outer- and middle-ear parameters do
not come from the same ear.

---

## 7. Validation against the paper

`test_vsPaper` compares against points digitised by eye from the scanned
Figs. 2 and 3 (±1.5 dB, ±15 % and ±10° of reading error).

| | magnitude | phase |
|---|---|---|
| **Fig. 3** H(f) = p_c/p_t | **1.34 dB rms** (max 2.32) | **7.9° rms** (max 18°) |
| **Fig. 2** z_t = p_t/u_t | **0.91 dB rms** (max 1.85) | **2.5° rms** (max 5.0°) |

**Both were needed, and magnitude is not the weaker test.** An earlier draft of this
README claimed magnitude was "insensitive to topology" and that a wrong circuit had
still produced a plausible magnitude curve. **This project's own recorded numbers
contradict that, so the claim is withdrawn.** Before Figure 1 was available the circuit
had the eardrum-loss branch mis-structured and the output taken at the wrong node, and
its magnitude was wrong by far more than the figure-reading error:

| Frequency | Paper Fig. 3 | Wrong-topology version | Error |
|---|---|---|---|
| 100 Hz | +4.0 dB | +16.7 dB | +12.7 dB |
| 1 kHz | +22.4 dB | +25.0 dB | +2.6 dB |
| 4 kHz | +20.8 dB | +8.1 dB | −12.7 dB |
| 10 kHz | +8.0 dB | +1.2 dB | −6.8 dB |

Magnitude caught that immediately once there was a reference curve. The errors survived
as long as they did because **no reference was available**, not because magnitude is a
weak test.

- **Magnitude** tests the **element values and the transformer referral**.
- **Phase** adds **independent** evidence rather than stronger evidence. It is fixed by
  how many energy-storage elements the signal passes and in what order, so it constrains
  the arrangement by a partly different route: a model could in principle be tuned to fit
  a magnitude curve with compensating element values and still disagree in phase.
  Agreement in both is therefore better evidence than either alone.

Only both together support the claim that the parts are right *and* wired
right. Qualitative features also reproduce: the 800–1600 Hz plateau, the dip
near 2.5 kHz, the second peak at 4–5 kHz, roll-off to ~8 dB at 10 kHz, phase
leading below 1 kHz and lagging above 2 kHz, and z_t's first local minimum at
1500 Hz against the paper's ~1800 Hz.

---

## 8. Graduate extension — otitis media in a small child *(exploratory)*

> **EXPLORATORY SIMULATION, NOT A VALIDATED CLINICAL MODEL.**

`middleEarParams('child')` and `middleEarParams('otitisMedia', severity)`.
Run `runOtitisMedia`. The **child baseline and the effusion are kept separate**,
because they rest on different evidence.

### What is derived and what is assumed

| Quantity | Status | Basis |
|---|---|---|
| C_cp, C_cm from remaining air volume | **DERIVED** | Eq. (2), C = V/(ρ_a c²) — the same relation that reproduces Pascal's adult values to 1.2 % |
| Added drum inertance from fluid depth | **DERIVED** | ρ·t/A_t for a layer of depth *t* on the drum; **assumes the layer moves rigidly with the drum** |
| Child cleft volume V_c = 2.8 cm³ | **ASSUMED — no source** | Mastoid pneumatization is incomplete until ~age 10 and is suppressed by early otitis media (direction supported), but **no measured paediatric middle-ear cleft volume was found**. Published child volumes of 0.4–1.3 cm³ are *ear-canal* equivalent volumes — a different cavity, not substitutable. **This is the largest single uncertainty.** |
| Fill fraction φ (0.3 / 0.6 / 0.9) | **ASSUMED** | clinically meaningful (partial vs full effusion) but not measured here |
| Fluid depth t (0.2 / 0.5 / 1.0 mm) | **ASSUMED** | — |
| R_te ×2/4/8 (viscous damping) | **ASSUMED** | measured effusion viscosities span 1 cP (serous) to 10 000 cP (mucoid) — four decades; a lumped resistance cannot be derived from that without a flow model, so the factors span deliberately *less* than one decade |
| C_te ×0.85/0.75/0.6, R_a ×2/5/20 | **ASSUMED** | drum thickening/retraction; aditus swelling |

Deliberately **unchanged**: cochlea, incudo-stapedial joint, and the
acoustic-reflex / annular-ligament elements. OME is conductive (bone conduction
stays normal), and the reflex parameters are a *loudness* mechanism — using
them as an infection model would be a category error.

**Nothing was tuned to reproduce a target hearing loss.**

### Results

| | 4PTA loss vs child | flatness | Y(226 Hz) | resonance | effusion alone |
|---|---|---|---|---|---|
| healthy adult | — | — | 0.65 mmho | 1738 Hz | — |
| healthy child | +0.5 dB vs adult | — | 0.61 mmho | 1817 Hz | — |
| mild (φ=0.3, t=0.2 mm) | 1.0 dB | 1.4 dB | 0.59 | 1850 Hz | 0.05 dB |
| moderate (φ=0.6, t=0.5 mm) | 3.1 dB | 3.4 dB | 0.57 | 1881 Hz | 0.20 dB |
| severe (φ=0.9, t=1.0 mm) | 7.1 dB | 8.2 dB | 0.55 | **467 Hz** | 1.50 dB |

Scored against the clinic: loss 10–40 dB ✗ (all three), flat <10 dB ✓ (all
three), type B <0.2 mmho ✗ (all three), resonance falls ✓ only for severe.

### Honest assessment — this extension does *not* reproduce OME

The **direction** of the loss and its **flat configuration** are right. The
**magnitude is far too small** (1–7 dB against a clinical 10–40 dB), the static
admittance never reaches type B, and the resonance frequency moves the *wrong
way* for mild and moderate.

**The reason is structural and was measured, not guessed.** `R_cm` = 420 Ω sits
**in parallel** across the whole cavity block in Fig. 1, so it caps that block's
impedance no matter how much air the fluid displaces:

| | max \|Z_cavity\| |
|---|---|
| healthy child | 417.5 Ω |
| severe effusion (air volume ÷10) | 419.9 Ω |
| severe, with R_cm removed | **40 038 Ω** |

The circuit is therefore **structurally insensitive to cavity volume**. Filling
the cleft is also a *stiffening*, which raises a resonance frequency, whereas
real OME lowers it because the fluid mass-loads the drum more than its loss of
air stiffens it. A lumped air compliance simply cannot express a middle ear
whose air space has been replaced by liquid. **Fixing this needs a different
element, not a different number** — which is why the severities were not
adjusted to close the gap.

**Why the series cavity is still required:** under the rejected shunt placement
the effusion alone produces **exactly 0.00 dB** at every severity, so the
defining feature of the disease would be invisible and the question could not be
posed at all.

Clinical sources (directions and normative ranges only):
[audiometric profiles in OME](https://pmc.ncbi.nlm.nih.gov/articles/PMC8387329/) ·
[resonance shifts](https://link.springer.com/article/10.1007/s12070-011-0470-9) ·
[child admittance norms](https://pubmed.ncbi.nlm.nih.gov/25514446/) ·
[air-bone gap range](https://www.ncbi.nlm.nih.gov/books/NBK538293/) ·
[mastoid pneumatization](https://pmc.ncbi.nlm.nih.gov/articles/PMC9390798/) ·
[effusion viscosity 1–10 000 cP](https://www.sciencedirect.com/science/article/abs/pii/S0196070986800163)

---

## 9. Interactive model

`combinedEarModel` — `uifigure` + `uigridlayout` + `uislider` + `uiaxes`, in the
style of the outer-ear GUI it extends. 18 live sliders (14 outer-ear anatomy +
4 middle-ear circuit elements, each 0.5×–2× its Fig. 1 value), a healthy/OME
condition menu, parameter sweeps over all 18, CSV and PNG export, and audio
audition (noise / chirp / clicks / your own file, dry or through the ear).
Switching the condition menu and replaying is a direct A/B of the disease.

The GUI contains no physics: it calls `outerEarResponse`, `middleEarResponse`,
`combinedEarResponse`, `middleEarParams` and `combinedEarIR`.

**Audio verified by frequency response, not by impulse peak** (`test_audioIR`):
the impulse response matches the analytic transfer function to **0.005 dB rms**
in magnitude and **0.04° rms** in phase; the full playback chain
(noise → convolve → truncate) matches to **0.002–0.005 dB rms** after removing
the common-mode bias of the spectral estimator.

---

## 10. AI use log

1. **AI proposed the wrong topology twice, and was corrected both times.** The
   first build made the five subsystems a naive series chain. The second, built
   from a prose description, made the eardrum losses three parallel RC cells
   tapping after the ossicles. **Reading Figure 1 showed both were wrong**: the
   losses are a single series chain containing two parallel sub-blocks, and they
   tap *before* C_te.
2. **AI took the output at the wrong node.** It measured p_c across the whole
   stapes-plus-cochlea tail instead of across the cochlear load alone,
   overstating the output wherever the stapes mass reactance is large. Fixing
   this changed H at 4 kHz by more than 10 dB.
3. **AI invented a transformer ratio (≈22) before the paper was available**;
   Eq. (1) gives 17. The estimate was discarded.
4. **AI's own test suites contained false assertions**, caught by running them:
   that a complex division `z/z` is bit-exactly 1; that a softer cavity can only
   raise H (it reverses sign above the ossicular resonance); that opening the
   joint shunt can only raise H (it destroys the 5.4 kHz resonance and costs
   5.3 dB); and that a complex current-divider magnitude is bounded by 1.
5. **AI reported a units inconsistency in the published paper rather than
   silently adopting it** — Eq. (7) in farads versus microfarads (§3).
6. **AI flagged its own unverifiable citations.** Before the PDFs were
   available it had written "Values are Figure 1 / Table I of Pascal et al."
   into the source, which it had never read; that was downgraded to an explicit
   "provenance unverified" block, and only restored once the paper was in hand.

---

## 11. Repository layout

```
MATLAB_middle_ear_model/
  middleEarParams.m        element table, units, anatomy, OME variant
  Z_cavity.m Z_eardrum.m Z_ossicles.m Z_joint.m Z_stapes.m Z_cochlea.m
  middleEarResponse.m      ladder assembly -> z_t and H(f)
  combinedEarResponse.m    H_outer x H_middle + cascade assumptions
  combinedEarIR.m          impulse response for the audio audition
  combinedEarModel.m       interactive GUI
  generateCombinedFigures.m runMiddleEarExperiments.m runOtitisMedia.m
  runAll.m                 one command for everything
  test_vsPaper.m test_middleEar.m test_audioIR.m test_combinedGui.m
  outerEarParams.m outerEarResponse.m   (unmodified copies from the outer-ear work)
figures/                   generated PNGs
```

## Licence

Code released under the MIT Licence (see `LICENSE`). The Pascal et al. (1998)
paper is © Acoustical Society of America and is **not** redistributed here; the
element values are reproduced under fair use for academic work, with citation.
