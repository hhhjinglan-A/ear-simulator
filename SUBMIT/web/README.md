# Web simulator

Static single-page app — **no build step, no framework, no CDN**. Plain HTML,
CSS and JavaScript, so it deploys to GitHub Pages as-is and also runs from
disk by opening `index.html`.

## Files

| Path | Purpose |
|---|---|
| `js/complex.js` | complex arithmetic (Smith's division algorithm) |
| `js/outerEar.js` | port of `outerEarResponse.m` |
| `js/middleEar.js` | port of the six Fig. 1 blocks and the ladder |
| `js/combined.js` | the cascade and the loading-ratio diagnostic |
| `js/plot.js` | dependency-free canvas plotter, log frequency axis |
| `js/audio.js` | impulse response (twin of `combinedEarIR.m`) + Web Audio |
| `js/paramSpecs.js` | control metadata: label, unit, range, bilingual meaning |
| `js/experiments.js` | the four experiments and their AI explanations |
| `js/content.js` | circuit description, provenance, limitations, AI log |
| `js/app.js` | UI wiring |
| `data/reference.js` / `.json` | **MATLAB-generated** parameters and reference responses |
| `tools/compare.js` | offline web-vs-MATLAB comparison |

## Where the numbers come from

`data/reference.js` is written by `MATLAB_middle_ear_model/exportWebReference.m`.
The page reads **its parameters from that file**, so the web app and MATLAB
cannot drift apart by re-typing values. Regenerate it after changing any
MATLAB parameter:

```matlab
cd MATLAB_middle_ear_model
exportWebReference
```

## Verifying the port

In the page: **Validation & AI log → Run web-vs-MATLAB comparison**.

Offline, with macOS's built-in JavaScriptCore (no Node required):

```bash
cd web
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc \
  js/complex.js js/outerEar.js js/middleEar.js js/combined.js tools/compare.js
```

Both compare the **complex** response — magnitude and phase — across 12
scenarios × 96 frequencies, and both report a worst relative error of
**8.1e-16**, i.e. machine precision. The offline version additionally counts
non-finite values, so a NaN cannot silently report a perfect score.

## Running locally

```bash
cd web && python3 -m http.server 8765
```
then open <http://localhost:8765>. Opening `index.html` directly also works.
