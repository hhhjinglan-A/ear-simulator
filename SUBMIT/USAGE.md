# How to run this project

## 1. The web simulator (no MATLAB needed)

The web app is in `web/`. To preview locally:

```bash
cd web && python3 -m http.server 8765
```

then open <http://localhost:8765>. Opening `web/index.html` directly from disk
also works — the reference data is loaded as a script, not by `fetch`.

Six tabs, matching the assignment deliverables:

| Tab | What it covers |
|---|---|
| **Simulator** | Outer / middle / combined response — magnitude, phase, and middle-ear input impedance. 38 live parameter controls, curve show/hide, baseline comparison, reset. |
| **Experiments** | The three parameter experiments (plus a control), in the order predict → AI explanation → run → compare and record. Exports as JSON or CSV. |
| **Child / Otitis media** | Healthy child baseline versus three effusion severities, with what changed and on what evidence. |
| **Circuit & sources** | The five subsystems, their connections, the transcription checks, parameter provenance, the cascade loading assumption, and the model limitations. |
| **Validation & AI log** | Magnitude and phase validation, reported separately, plus the AI error/correction record. |
| **Audio & export** | Test signals, upload, dry/processed switching, volume, normalisation statement, and downloads. |

Every curve is computed live in the browser from the formulas in `web/js/` —
none of them is a pre-rendered image.

## 2. The MATLAB model

Open `MATLAB_middle_ear_model` in MATLAB and type one word:

```matlab
runAll
```

This runs all five steps — the inherited outer-ear suite, the middle-ear
verification, the three response figures, the parameter experiments and the
otitis-media extension — and leaves all five figures on screen. Double-clicking
`run_middle_ear.command` does the same from Finder.

For the interactive MATLAB GUI: `combinedEarModel`

> `Z_cavity`, `Z_eardrum`, `Z_ossicles`, `Z_joint`, `Z_stapes` and `Z_cochlea`
> are functions taking `(f, p2)`. Typing a bare name at the prompt will error.
> You never need to call them by hand.

## 3. Test suites

| Command | What it checks | Result |
|---|---|---|
| `test_outerEar` | inherited outer-ear engine, unchanged, including a cross-check against ngspice | ALL PASSED |
| `test_vsPaper` | agreement with the paper's Figs. 2 and 3 | 1.34 / 0.91 dB, 7.9° / 2.5° |
| `test_middleEar` | circuit algebra, units, transformer, response shape | 80 checks, 0 failed |
| `test_audioIR` | audio path reproduces the analytic transfer function | 23 checks, 0 failed |
| `test_combinedGui` | GUI builds and every control works | 0 failures |
| `web/tools/compare.js` | web port versus MATLAB, in the complex plane | 8.1e-16 relative |

All MATLAB sources pass `checkcode` with no warnings.

## 4. What magnitude and phase each establish

These are **not** the same claim and are reported separately:

- **Magnitude** tests the element values and the transformer referral. It is
  **not** blind to topology: when this circuit had the eardrum-loss branch
  mis-structured and the output taken at the wrong node, its magnitude was wrong
  by +12.7 dB at 100 Hz and −12.7 dB at 4 kHz. Magnitude caught that as soon as
  there was a reference curve to compare against.
- **Phase** adds *independent* evidence rather than stronger evidence. It is
  fixed by how many energy-storage elements the signal passes and in what order,
  so it constrains the arrangement by a partly different route: a model could in
  principle be tuned to fit a magnitude curve with compensating element values
  and still disagree in phase. Agreement in both is better evidence than either
  alone.

Separately again: **"the web agrees with MATLAB"** says the port is faithful and
says nothing about whether the model is right. **"the model agrees with the
paper"** is the scientific claim.

## 5. Open items

1. **The otitis-media extension does not reproduce the clinical magnitude**
   (about 1–7 dB against a clinical air-bone gap of 10–40 dB). The cause was
   located and measured rather than guessed: `R_cm` = 420 Ω sits in parallel
   across the cavity block, capping its impedance at ~420 Ω however much air
   the fluid displaces (40 kΩ with `R_cm` removed), so the circuit is
   structurally insensitive to cavity volume. Fixing this needs a different
   element, not a different number, which is why the assumed severities were
   not adjusted to close the gap.
2. **The child cavity volume of 2.8 cm³ has no source.** Published child figures
   of 0.4–1.3 cm³ are *ear-canal* equivalent volumes — a different cavity, not
   substitutable. This is the largest single uncertainty in the extension.
3. **The units of Eq. (7) are an open question**, presented as two candidate
   readings with the evidence for each. It is not claimed that the paper is
   misprinted; confirming it needs Lutman & Martin (1979).
4. **The second paper (25-page scan) has not been read** — it has no text layer
   and needs `poppler` to render. The Table 1 versus Figure 12 discrepancy in
   that paper (R_D2 = 12 or 220 Ω; C_C = 0.65 or 0.6 µF) is therefore still
   unresolved. Those elements do not appear in this model, so no value has been
   silently chosen.
5. **The non-linear block is not implemented.** Eqs. 3, 6 and 7 are documented
   in `middleEarParams.m`; setting `p2.nonlinear = true` raises an explicit
   error rather than silently returning a linear result.
6. Experiment records are stored in the browser's `localStorage`, so export them
   before clearing site data or changing machine.
