/* tools/compare.js — numerical cross-check of the JavaScript port against
 * the MATLAB reference exported by exportWebReference.m.
 *
 * Run with JavaScriptCore:
 *   jsc js/complex.js js/outerEar.js js/middleEar.js js/combined.js tools/compare.js
 *
 * Reports, for every scenario and every quantity, the maximum error in the
 * COMPLEX plane -- not just magnitude -- both in absolute terms and relative
 * to the reference magnitude, plus the worst magnitude error in dB and the
 * worst phase error in degrees.
 */
'use strict';

const raw = readFile('data/reference.json');
const REF = JSON.parse(raw);
const f = REF.f;

function toC(o) { return o.re.map((r, i) => ({ re: r, im: o.im[i] })); }

function compare(name, got, want) {
  let maxAbs = 0, maxRel = 0, maxDb = 0, maxDeg = 0, worstAt = 0, bad = 0;
  if (!Array.isArray(got) || got.length !== want.length) {
    return { name, maxAbs: NaN, maxRel: NaN, maxDb: NaN, maxDeg: NaN,
             worstAt: 0, bad: want.length,
             note: 'length mismatch: got ' + (got ? got.length : 'undefined') };
  }
  for (let i = 0; i < want.length; i++) {
    // A NaN would make every comparison below false and silently report a
    // perfect score, so count non-finite values explicitly.
    if (!got[i] || !Number.isFinite(got[i].re) || !Number.isFinite(got[i].im)) {
      bad++; continue;
    }
    const d = Cx.abs(Cx.sub(got[i], want[i]));
    const m = Cx.abs(want[i]);
    const rel = m > 0 ? d / m : d;
    if (rel > maxRel) { maxRel = rel; worstAt = f[i]; }
    if (d > maxAbs) maxAbs = d;
    const dDb = Math.abs(Cx.db(got[i]) - Cx.db(want[i]));
    if (dDb > maxDb) maxDb = dDb;
    let dDeg = Math.abs(Cx.deg(got[i]) - Cx.deg(want[i]));
    if (dDeg > 180) dDeg = 360 - dDeg;
    if (dDeg > maxDeg) maxDeg = dDeg;
  }
  return { name, maxAbs, maxRel, maxDb, maxDeg, worstAt, bad };
}

const rows = [];
let worstRel = 0, worstDb = 0, worstDeg = 0, badTotal = 0;

for (const key of Object.keys(REF.cases)) {
  const cs = REF.cases[key];
  const got = Combined.response(cs.outerParams, cs.middleParams, f);

  const checks = [
    compare('outer',    got.Houter,                toC(cs.outer)),
    compare('middle',   got.Hmiddle,               toC(cs.middle)),
    compare('combined', got.total,                 toC(cs.combined)),
    compare('Zin',      got.middle.inputImpedance, toC(cs.Zin))
  ];
  for (const c of checks) {
    rows.push({ case: key, ...c });
    if (c.maxRel > worstRel) worstRel = c.maxRel;
    if (c.maxDb  > worstDb)  worstDb  = c.maxDb;
    if (c.maxDeg > worstDeg) worstDeg = c.maxDeg;
    if (c.bad) badTotal += c.bad;
  }
}

print('scenario                quantity   max|rel err|   max dB    max deg   worst @Hz');
print('------------------------------------------------------------------------------');
for (const r of rows) {
  print(
    r.case.padEnd(22) + '  ' + r.name.padEnd(9) + '  ' +
    r.maxRel.toExponential(2).padStart(11) + '  ' +
    r.maxDb.toExponential(2).padStart(9) + '  ' +
    r.maxDeg.toExponential(2).padStart(9) + '  ' +
    r.worstAt.toFixed(0).padStart(8) + (r.bad ? ('   ' + r.bad + ' NON-FINITE') : ''));
}
print('------------------------------------------------------------------------------');
print('WORST OVERALL   relative ' + worstRel.toExponential(3) +
      '   magnitude ' + worstDb.toExponential(3) + ' dB' +
      '   phase ' + worstDeg.toExponential(3) + ' deg');
print(rows.length + ' comparisons over ' + Object.keys(REF.cases).length +
      ' scenarios x ' + f.length + ' frequencies');
print('non-finite values: ' + badTotal);
const ok = worstRel < 1e-9 && badTotal === 0;
print(ok ? 'PASS  JS matches MATLAB to better than 1e-9 relative, no non-finite values'
         : 'FAIL  JS and MATLAB disagree, or non-finite values present');
