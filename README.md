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
| `test_vsPaper` | agreement with the paper's Figs. 2 and 3 | 1.34 / 0.91 dB rms |
| `test_middleEar` | circuit algebra, units, transformer, response shape | 80 checks, 0 failed |
| `test_audioIR` | audio path reproduces the analytic transfer function | 23 checks, 0 failed |
| `test_combinedGui` | GUI builds and every control works | 0 failures |

All 20 source files pass `checkcode` with no warnings.

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

Series elements are losses *on the road*; shunt elements are *dead ends* that
bleed volume velocity to ground without passing it on. The distinction is not
cosmetic — see E2 in §5.

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

**Volume assignment** (p. 1510): V_c = 5.5 cm³ total, antrum + pneumatic cells
≈ 5 cm³, tympanic cavity V_tc = 0.5 cm³. So `C_cp` (3.6 µF ↔ 5.07 cm³) is the
**pneumatic cells** and `C_cm` (0.35 µF ↔ 0.49 cm³) the **tympanic cavity**.

### One correction to the paper as printed

Eq. (7) gives the annular-ligament capacitance coefficients in **farads**
(c₁ = −3.33e-2 F, c₃ = 0.54 F), making C_la = 0.5067 F at rest. In this circuit
that is 0.54 cm⁵/dyn — **five orders of magnitude larger than the entire
middle-ear cavity** (3.95 µF), i.e. a dead short, which is impossible for a
ligament. Read as **microfarads**, consistent with every other capacitance in
Fig. 1, it becomes a real stiffness — and only then does the model reproduce the
paper's own figures:

| C_la at rest | Fig. 3 agreement | Fig. 2 agreement |
|---|---|---|
| 0.5067 **F** (as printed) | 3.56 dB rms | 2.77 dB rms |
| 0.5067 **µF** | **1.34 dB rms** | **0.91 dB rms** |

`p2.C_la_unitsAsPrinted = true` restores the literal reading for comparison.

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

Also: the model is **strictly linear** (`p2.nonlinear` unimplemented — Eqs. 3,
6, 7 are documented but not coded), and the outer- and middle-ear parameters do
not come from the same ear.

---

## 7. Validation against the paper

`test_vsPaper` compares against points digitised by eye from the scanned
Figs. 2 and 3 (±1.5 dB and ±15 % reading error respectively).

```
Fig. 3  H(f) = 20 log10(p_c/p_t)     rms 1.34 dB, max 2.32 dB
Fig. 2  z_t = p_t/u_t                rms 0.91 dB, max 1.85 dB
```

Both residuals are inside the error of reading the figures. Qualitative
features all reproduce: the 800–1600 Hz plateau, the dip near 2.5 kHz, the
second peak at 4–5 kHz, the roll-off to ~8 dB at 10 kHz, and phase leading at
low frequency and lagging above 1 kHz.

---

## 8. Graduate extension — otitis media *(exploratory)*

> **EXPLORATORY SIMULATION, NOT A VALIDATED CLINICAL MODEL.** Every parameter
> *direction* is supported by clinical literature; every *magnitude* is an
> assumed order-of-magnitude guess.

`middleEarParams('otitisMedia', severity)` with `'mild' | 'moderate' | 'severe'`.
Run `runOtitisMedia`.

| | 4PTA loss | flatness | Y(226 Hz) | resonance | cavity-only loss |
|---|---|---|---|---|---|
| healthy | — | — | 0.65 mmho | 1738 Hz | — |
| mild (air 20 %) | 2.3 dB | 3.9 dB | 0.57 | 1876 Hz | 1.1 dB |
| moderate (air 5 %) | 6.5 dB | 6.3 dB | 0.53 | 1946 Hz | 1.7 dB |
| severe (air 0.5 %) | 10.0 dB | 8.8 dB | 0.43 | 1829 Hz | 3.2 dB |

**Honest assessment: this extension does *not* currently reproduce OME.** Only
`severe` reaches the bottom of the clinical air-bone-gap range (10–40 dB, mean
≈26 dB); static admittance never falls to type B (<0.2 mmho); and the resonance
frequency **rises** in all three cases, whereas OME is documented to *lower* it.

The reason is diagnosable. Collapsing the cavity air is a **stiffening**, and
stiffening raises the resonance frequency — the opposite of the mass loading
that fluid actually imposes. A lumped air compliance is simply the wrong object
for a middle ear whose air space has been replaced by liquid.

**These severity multipliers were chosen against an earlier, incorrect
transcription of the circuit and have not been re-derived for the corrected
one.** They are the clearest outstanding work item.

**Why this needs the series cavity:** under the rejected shunt placement the
cavity-only loss is **exactly 0.00 dB** at every severity (E4), so the defining
feature of the disease would be invisible.

Clinical sources for the *directions* and normative ranges:
[audiometric profiles in OME](https://pmc.ncbi.nlm.nih.gov/articles/PMC8387329/) ·
[resonance shifts in multifrequency tympanometry](https://link.springer.com/article/10.1007/s12070-011-0470-9) ·
[child static-admittance norms](https://pubmed.ncbi.nlm.nih.gov/25514446/) ·
[air-bone gap range](https://www.ncbi.nlm.nih.gov/books/NBK538293/) ·
[mastoid pneumatization](https://pmc.ncbi.nlm.nih.gov/articles/PMC9390798/)

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
