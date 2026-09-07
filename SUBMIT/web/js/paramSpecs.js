/* paramSpecs.js — control metadata: label, unit, range, default, and a
 * bilingual one-line meaning for every adjustable parameter.
 *
 * scale = multiply the stored SI/analogue value by this for display.
 * Middle-ear ranges are 0.5x .. 2x the Pascal et al. (1998) Fig. 1 value.
 */
(function (root) {
  'use strict';

  // key, label, unit, min, max, display scale, decimals, one-line meaning
  const OUTER = [
    ['canalLength',      'Canal length',        'mm',   0.015, 0.035, 1000, 1, 'Sets the quarter-wave resonance frequency'],
    ['canalDiameter',    'Canal diameter',      'mm',   0.004, 0.012, 1000, 1, 'Affects the open-end correction and characteristic impedance'],
    ['canalQ',           'Canal Q (damping)',   '',     1,     30,    1,    1, 'Higher Q gives a sharper resonance peak'],
    ['conchaVolume',     'Concha volume',       'cm³',  1e-6,  1e-5,  1e6,  2, 'Cavity volume of the Helmholtz resonator'],
    ['conchaDepth',      'Concha depth',        'mm',   0.004, 0.020, 1000, 1, 'Acts as the resonator neck length'],
    ['conchaAperture',   'Concha aperture',     'mm',   0.008, 0.025, 1000, 1, 'Aperture diameter of the concha'],
    ['conchaQ',          'Concha Q',            '',     0.5,   10,    1,    2, 'Sharpness of the concha resonance'],
    ['conchaGainDb',     'Concha peak gain',    'dB',   0,     18,    1,    1, 'Boost at f_H; returns to 0 dB off resonance'],
    ['reflectorDiameter','Reflector diameter',  'mm',   0.010, 0.045, 1000, 1, 'Effective aperture of the pinna reflector'],
    ['reflectorGainMax', 'Reflector max gain',  'dB',   0,     15,    1,    1, 'Asymptotic high-frequency gain of the reflector'],
    ['pinnaPathBase',    'Reflection path',     'mm',   0.002, 0.025, 1000, 1, 'Base extra path length of the pinna reflection'],
    ['pinnaStrength',    'Reflection strength', '',    -1,     1,     1,    2, 'Reflection coefficient, signed; sets where the notches fall'],
    ['azimuth',          'Source azimuth',      '°',   -180,   180,   1,    0, 'Source azimuth, 0 = straight ahead'],
    ['elevation',        'Source elevation',    '°',   -60,    90,    1,    0, 'Source elevation, 0 = ear level']
  ];

  // Middle-ear elements, grouped by the five subsystems of Fig. 1.
  const MIDDLE = [
    ['cavity',   'Middle-ear cavities (series)', [
      ['L_a',   'L_a  aditus inertance',   'mH', 1e3, 3, 'Air mass in the aditus ad antrum'],
      ['C_cp',  'C_cp pneumatic cells',    'µF', 1e6, 3, 'Pneumatic cell compliance, ~5 cm3, derived from C = V/(rho*c^2)'],
      ['R_a',   'R_a  aditus loss',        'Ω',  1,   1, 'Viscous loss of the aditus'],
      ['R_cm',  'R_cm cavity loss',        'Ω',  1,   1, 'Tympanic cavity loss. In PARALLEL, so it caps the cavity block impedance'],
      ['C_cm',  'C_cm tympanic cavity',    'µF', 1e6, 3, 'Tympanic cavity compliance, ~0.5 cm3']
    ]],
    ['eardrum',  'Eardrum losses (shunt at node 1)', [
      ['R_ti1', 'R_ti1', 'Ω',  1,   1, 'First cell resistance of the eardrum-loss chain'],
      ['C_ti1', 'C_ti1', 'µF', 1e6, 3, 'First cell compliance'],
      ['C_ti2', 'C_ti2', 'µF', 1e6, 3, 'Second cell compliance; in series with R_ti2, that pair parallel with L_ti'],
      ['R_ti2', 'R_ti2', 'Ω',  1,   1, 'Second cell resistance'],
      ['L_ti',  'L_ti',  'mH', 1e3, 2, 'Local mass of the membrane'],
      ['R_ti3', 'R_ti3', 'Ω',  1,   0, 'Third cell resistance, in parallel with C_ti3'],
      ['C_ti3', 'C_ti3', 'µF', 1e6, 3, 'Third cell compliance']
    ]],
    ['ossicles', 'Eardrum + malleus + incus (series)', [
      ['C_te',  'C_te compliance', 'µF', 1e6, 3, 'Compliance of the coupled drum-malleus-incus block'],
      ['L_te',  'L_te mass',       'mH', 1e3, 2, 'Ossicular mass'],
      ['R_te',  'R_te damping',    'Ω',  1,   1, 'Damping of the ossicular block']
    ]],
    ['joint',    'Incudo-stapedial joint (shunt at node 2)', [
      ['C_is',  'C_is joint compliance', 'µF', 1e6, 4, 'Joint compliance. Sits in a shunt branch, so a larger value diverts more at high frequency'],
      ['R_is',  'R_is joint loss',       'Ω',  1,   1, 'Joint loss']
    ]],
    ['stapes',   'Stapes + ligament + vestibule (series)', [
      ['L_s',   'L_s  stapes mass',     'mH', 1e3, 2, 'Stapes mass, 2.5 mg referred through T_r^2'],
      ['R_la',  'R_la ligament loss',   'Ω',  1,   1, 'Annular ligament loss, value at rest'],
      ['C_la',  'C_la ligament compl.', 'µF', 1e6, 4, 'Annular ligament compliance. Eq. 7 units are an open question, see Circuit tab'],
      ['L_v',   'L_v  vestibule mass',  'mH', 1e3, 2, 'Vestibular volume mass']
    ]],
    ['cochlea',  'Cochlea + helicotrema (terminal load)', [
      ['R_co',  'R_co cochlear resistance', 'Ω',  1,   0, 'Cochlear acoustic resistance, 0.35e11 Pa.s/m3 referred through T_r^2'],
      ['R_h',   'R_h  helicotrema loss',    'Ω',  1,   0, 'Helicotrema resistance'],
      ['L_h',   'L_h  helicotrema mass',    'mH', 1e3, 0, 'Helicotrema mass; a low-frequency bypass']
    ]]
  ];

  root.ParamSpecs = { OUTER, MIDDLE };
})(typeof globalThis !== 'undefined' ? globalThis : this);
