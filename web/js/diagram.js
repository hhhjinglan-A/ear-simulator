/* diagram.js — clickable anatomy / circuit map.
 *
 * One SVG showing the signal path through the ear next to the ladder network,
 * with the six circuit blocks as clickable regions. Clicking a block reports
 * what that part of the ear does, which elements belong to it, and whether it
 * sits in the signal path or diverts volume velocity away from it.
 */
(function (root) {
  'use strict';

  /* id, x, label, anatomy, role, elements, what it does */
  const BLOCKS = [
    { id: 'cavity', x: 60, anat: 'Middle-ear air spaces\n(tympanic cavity, antrum,\nmastoid cells)',
      label: 'Z_cavity', role: 'series',
      params: ['L_a', 'C_cp', 'R_a', 'R_cm', 'C_cm'],
      what: 'The air trapped behind the eardrum. The drum has to compress it, so it acts as an ' +
            'added stiffness in the signal path. Because R_cm sits in parallel across the whole ' +
            'block, its impedance can never exceed about 420 &Omega; however small the air volume ' +
            'becomes — which is why the otitis-media extension is so insensitive to cavity volume.' },
    { id: 'eardrum', x: 235, anat: 'The part of the eardrum\nthat vibrates WITHOUT\ndriving the malleus',
      label: 'Z_eardrum', role: 'shunt',
      params: ['R_ti1', 'C_ti1', 'C_ti2', 'R_ti2', 'L_ti', 'R_ti3', 'C_ti3'],
      what: 'The eardrum does not move as one rigid piston: part of it flexes without driving the ' +
            'ossicles. That part offers a parallel route back to the return, so the volume velocity ' +
            'going into it never reaches the cochlea. Its seven elements are a <b>fitted</b> ' +
            'relaxation spectrum — there is no anatomical object called "cell 2".' },
    { id: 'ossicles', x: 410, anat: 'Eardrum + malleus + incus\nmoving together',
      label: 'Z_ossicles', role: 'series',
      params: ['C_te', 'L_te', 'R_te'],
      what: 'The coupled drum-malleus-incus block: the only path by which sound reaches the stapes. ' +
            'Its mass L_te and compliance C_te set the main resonance near 670 Hz, and R_te damps it. ' +
            '<b>Two of the three assignment experiments live here</b> (L_te and R_te).' },
    { id: 'joint', x: 585, anat: 'Incudo-stapedial joint\n(incus to stapes)',
      label: 'Z_joint', role: 'shunt',
      params: ['C_is', 'R_is'],
      what: 'A compliant joint between the incus and the stapes. Motion that goes into flexing the ' +
            'joint is diverted instead of driving the stapes, and the diversion grows with frequency. ' +
            'C_is also resonates with the stapes and vestibular mass near 5.4 kHz, which produces the ' +
            'second peak in the response. <b>The compliance experiment lives here</b> (C_is).' },
    { id: 'stapes', x: 760, anat: 'Stapes, annular ligament,\nvestibular volume',
      label: 'Z_stapes', role: 'series',
      params: ['L_s', 'R_la', 'C_la', 'L_v'],
      what: 'The stapes and the fluid it pushes. L_s is <b>physically derived</b>: a 2.5 mg stapes on ' +
            'a 3.2 mm&sup2; footplate, referred through the transformer. C_la is the element whose ' +
            'printed units are an open question (see below).' },
    { id: 'cochlea', x: 935, anat: 'Cochlea and helicotrema',
      label: 'Z_cochlea', role: 'load',
      params: ['R_co', 'R_h', 'L_h'],
      what: 'The load the whole middle ear exists to drive. The cochlea is essentially a pure ' +
            '<b>resistance</b> R_co, which is the point of the middle ear: it is an impedance ' +
            'transformer matching air onto a resistive load. The output pressure p_c is measured ' +
            'across this block alone. R_co is <b>measured</b>, not derived.' }
  ];

  const ROLE_TEXT = {
    series: ['in the signal path', 'All the volume velocity passes through it, and the pressure ' +
             'it drops is subtracted from what continues on toward the cochlea.'],
    shunt:  ['diverts away from the path', 'It offers a parallel route back to the return. ' +
             'Volume velocity taken by this branch never reaches the cochlea. It is not a ' +
             'dead end — it carries real current; the loss is the diversion.'],
    load:   ['the terminating load', 'The output pressure is measured across this block.']
  };

  function svg() {
    const W = 1110, H = 300;
    let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label="Clickable map of the middle-ear circuit blocks">
      <defs><marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="3"
        orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#374151"/></marker></defs>
      <text x="6" y="104" font-size="12" font-weight="600" fill="#111827">Sound in</text>
      <text x="6" y="116" font-size="10" fill="#6b7280">from the ear canal</text>
      <line x1="6" y1="128" x2="55" y2="128" stroke="#374151" stroke-width="2" marker-end="url(#ar)"/>
      <line x1="55" y1="128" x2="55" y2="118" stroke="#374151" stroke-width="2"/>
      <line x1="0" y1="232" x2="${W}" y2="232" stroke="#9ca3af" stroke-width="1.5"/>
      <text x="${W - 8}" y="248" font-size="10" fill="#6b7280" text-anchor="end">return path</text>`;

    BLOCKS.forEach((b, i) => {
      const y = b.role === 'shunt' ? 150 : 92;
      const h = 52, w = 150;
      const fill = b.role === 'shunt' ? '#fef3e2' : (b.role === 'load' ? '#e8f3ea' : '#eef4fb');
      const stroke = b.role === 'shunt' ? '#d08b28' : (b.role === 'load' ? '#2f7d32' : '#0b6bcb');
      // connecting wire along the main path
      if (b.role !== 'shunt') {
        s += `<line x1="${b.x - 5}" y1="118" x2="${b.x}" y2="118" stroke="#374151" stroke-width="2"/>`;
        s += `<line x1="${b.x + w}" y1="118" x2="${b.x + w + 25}" y2="118" stroke="#374151" stroke-width="2"/>`;
      } else {
        // tap down from the main path, and down to the return
        s += `<line x1="${b.x + w / 2}" y1="118" x2="${b.x + w / 2}" y2="${y}" stroke="#d08b28" stroke-width="2"/>`;
        s += `<circle cx="${b.x + w / 2}" cy="118" r="3.5" fill="#374151"/>`;
        s += `<line x1="${b.x + w / 2}" y1="${y + h}" x2="${b.x + w / 2}" y2="232" stroke="#d08b28" stroke-width="2"/>`;
      }
      if (b.role === 'load') {
        s += `<line x1="${b.x + w / 2}" y1="${y + h}" x2="${b.x + w / 2}" y2="232" stroke="#2f7d32" stroke-width="2"/>`;
        s += `<text x="${b.x + w / 2 - 8}" y="205" font-size="11" fill="#2f7d32" text-anchor="end">p_c measured here</text>`;
      }
      s += `<g class="blk" data-id="${b.id}">
        <rect x="${b.x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
        <text x="${b.x + w / 2}" y="${y + 21}" font-size="13" font-weight="600" text-anchor="middle" fill="#111827">${b.label}</text>
        <text x="${b.x + w / 2}" y="${y + 38}" font-size="10.5" text-anchor="middle" fill="#6b7280">${b.role === 'load' ? 'terminating load' : b.role}</text>
      </g>`;
      // anatomy caption
      const ay = b.role === 'shunt' ? y + h + 16 : 34;
      b.anat.split('\n').forEach((line, k) => {
        s += `<text x="${b.x + w / 2}" y="${ay + k * 12}" font-size="10" text-anchor="middle" fill="#4b5563">${line}</text>`;
      });
    });
    s += `<text x="${W - 8}" y="118" font-size="11" fill="#6b7280" text-anchor="end"></text></svg>`;
    return s;
  }

  root.Diagram = { BLOCKS, ROLE_TEXT, svg };
})(typeof globalThis !== 'undefined' ? globalThis : this);
