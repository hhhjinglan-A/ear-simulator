/* paramSpecs.js — control metadata: label, unit, range, default, and a
 * bilingual one-line meaning for every adjustable parameter.
 *
 * scale = multiply the stored SI/analogue value by this for display.
 * Middle-ear ranges are 0.5x .. 2x the Pascal et al. (1998) Fig. 1 value.
 */
(function (root) {
  'use strict';

  // key, label(EN), unit, min, max, scale, decimals, 中文说明
  const OUTER = [
    ['canalLength',      'Canal length',        'mm',   0.015, 0.035, 1000, 1, '耳道长度：决定四分之一波长共振频率'],
    ['canalDiameter',    'Canal diameter',      'mm',   0.004, 0.012, 1000, 1, '耳道直径：影响端口修正与特征阻抗'],
    ['canalQ',           'Canal Q (damping)',   '',     1,     30,    1,    1, '耳道阻尼：Q 越大共振峰越尖'],
    ['conchaVolume',     'Concha volume',       'cm³',  1e-6,  1e-5,  1e6,  2, '耳甲腔容积：亥姆霍兹共振的腔体'],
    ['conchaDepth',      'Concha depth',        'mm',   0.004, 0.020, 1000, 1, '耳甲深度：相当于共振器颈长'],
    ['conchaAperture',   'Concha aperture',     'mm',   0.008, 0.025, 1000, 1, '耳甲开口直径'],
    ['conchaQ',          'Concha Q',            '',     0.5,   10,    1,    2, '耳甲共振尖锐度'],
    ['conchaGainDb',     'Concha peak gain',    'dB',   0,     18,    1,    1, '耳甲共振峰增益（离开共振点回到 0 dB）'],
    ['reflectorDiameter','Reflector diameter',  'mm',   0.010, 0.045, 1000, 1, '耳廓反射面有效口径'],
    ['reflectorGainMax', 'Reflector max gain',  'dB',   0,     15,    1,    1, '反射面高频渐近增益'],
    ['pinnaPathBase',    'Reflection path',     'mm',   0.002, 0.025, 1000, 1, '耳廓反射的基准附加路程'],
    ['pinnaStrength',    'Reflection strength', '',    -1,     1,     1,    2, '反射系数（可正可负，决定陷波位置）'],
    ['azimuth',          'Source azimuth',      '°',   -180,   180,   1,    0, '声源方位角（0 = 正前方）'],
    ['elevation',        'Source elevation',    '°',   -60,    90,    1,    0, '声源仰角（0 = 与耳等高）']
  ];

  // Middle-ear elements, grouped by the five subsystems of Fig. 1.
  const MIDDLE = [
    ['cavity',   'Middle-ear cavities 中耳腔', [
      ['L_a',   'L_a  aditus inertance',   'mH', 1e3, 3, '鼓窦入口空气质量'],
      ['C_cp',  'C_cp pneumatic cells',    'µF', 1e6, 3, '乳突气房顺性（≈5 cm³，由 C=V/ρc² 推导）'],
      ['R_a',   'R_a  aditus loss',        'Ω',  1,   1, '鼓窦入口粘滞损耗'],
      ['R_cm',  'R_cm cavity loss',        'Ω',  1,   1, '鼓室损耗（并联，会把腔体阻抗上限锁死）'],
      ['C_cm',  'C_cm tympanic cavity',    'µF', 1e6, 3, '鼓室顺性（≈0.5 cm³）']
    ]],
    ['eardrum',  'Eardrum losses 鼓膜损耗 (shunt)', [
      ['R_ti1', 'R_ti1', 'Ω',  1,   1, '鼓膜损耗链第一段电阻'],
      ['C_ti1', 'C_ti1', 'µF', 1e6, 3, '鼓膜损耗链第一段顺性'],
      ['C_ti2', 'C_ti2', 'µF', 1e6, 3, '第二段顺性（与 R_ti2 串联后并联 L_ti）'],
      ['R_ti2', 'R_ti2', 'Ω',  1,   1, '第二段电阻'],
      ['L_ti',  'L_ti',  'mH', 1e3, 2, '鼓膜局部质量'],
      ['R_ti3', 'R_ti3', 'Ω',  1,   0, '第三段电阻（与 C_ti3 并联）'],
      ['C_ti3', 'C_ti3', 'µF', 1e6, 3, '第三段顺性']
    ]],
    ['ossicles', 'Eardrum + malleus + incus 鼓膜-锤骨-砧骨 (series)', [
      ['C_te',  'C_te compliance', 'µF', 1e6, 3, '听骨链顺性'],
      ['L_te',  'L_te mass',       'mH', 1e3, 2, '听骨质量（Ossicular mass）'],
      ['R_te',  'R_te damping',    'Ω',  1,   1, '听骨链阻尼（Eardrum resistance）']
    ]],
    ['joint',    'Incudo-stapedial joint 砧镫关节 (shunt)', [
      ['C_is',  'C_is joint compliance', 'µF', 1e6, 4, '关节顺性：并联死胡同，越大高频漏得越多'],
      ['R_is',  'R_is joint loss',       'Ω',  1,   1, '关节损耗']
    ]],
    ['stapes',   'Stapes + ligament + vestibule 镫骨-环韧带-前庭 (series)', [
      ['L_s',   'L_s  stapes mass',     'mH', 1e3, 2, '镫骨质量（2.5 mg 折算）'],
      ['R_la',  'R_la ligament loss',   'Ω',  1,   1, '环韧带损耗（静息值）'],
      ['C_la',  'C_la ligament compl.', 'µF', 1e6, 4, '环韧带顺性（Eq.7 单位存疑，见 Circuit 页）'],
      ['L_v',   'L_v  vestibule mass',  'mH', 1e3, 2, '前庭腔质量']
    ]],
    ['cochlea',  'Cochlea + helicotrema 耳蜗+蜗孔 (terminal load)', [
      ['R_co',  'R_co cochlear resistance', 'Ω',  1,   0, '耳蜗声阻（0.35e11 Pa·s/m³ 折算）'],
      ['R_h',   'R_h  helicotrema loss',    'Ω',  1,   0, '蜗孔电阻'],
      ['L_h',   'L_h  helicotrema mass',    'mH', 1e3, 0, '蜗孔质量（低频旁路）']
    ]]
  ];

  root.ParamSpecs = { OUTER, MIDDLE };
})(typeof globalThis !== 'undefined' ? globalThis : this);
