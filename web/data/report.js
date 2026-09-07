/* report.js — THE SUBMITTED EXPERIMENT REPORT.
 *
 * This file is committed to the repository, so anyone opening the site sees
 * the finished experiments without typing anything. It is deliberately
 * separate from the Experiments tab, which is a live TOOL whose records live
 * only in the visitor's own browser.
 *
 * Only the human content is stored here. Every number is recomputed from the
 * model when the page renders, so the report cannot drift away from the code.
 *
 * Provenance of each field is explicit:
 *   studentFirstAnswer  the student's own first answer, written BEFORE any
 *                       explanation and BEFORE the experiment was run.
 *                       Preserved as given (translated from Chinese).
 *   aiExplanation       AI-ASSISTED teaching, given after the first answer
 *                       and still before the run.
 *   studentRevised      the student's prediction after that explanation,
 *                       still before the run. null = not yet written.
 *   postHoc             analysis written AFTER seeing the result. Never
 *                       presented as a prediction.
 */
window.__EAR_REPORT__ = {
  generated: '2026-09-07',
  course: 'MUE 610 Psychoacoustics — AI Build Lab, middle-ear extension',
  note: 'Numbers in this report are recomputed live from the model each time ' +
        'the page loads. The text fields record who said what, and when.',

  experiments: [
    {
      id: 'E1', param: 'L_te', factor: 1.2,
      kind: 'Inertance / mass',
      title: 'E1 — ossicular mass L_te +20 %',
      question: 'What happens to the resonance, to 100 Hz, and to 10 kHz?',

      studentFirstAnswer: {
        when: 'before any explanation, before running',
        text: 'A: the resonance goes UP. B: at low frequency the impedance falls as ' +
              'frequency rises. C: the level at 10 kHz goes UP.',
        translated: true
      },

      aiExplanation:
        'Two of these needed correcting, and one was a true statement answering a ' +
        'different question.\n\n' +
        'A — the resonance goes DOWN, not up. In f = 1/(2π√(L·C)) the mass sits in the ' +
        'denominator under the square root, so more mass means a lower resonance. A thicker ' +
        'cello string sounds lower than a thin one at the same tension.\n\n' +
        'B — the statement "impedance falls as frequency rises" is correct, but it describes ' +
        'the COMPLIANCE, 1/(ωC). The question was whether 100 Hz changes. At 100 Hz the ' +
        'compliance impedance is about 45 times larger than the mass impedance, so the spring ' +
        'is what resists there and a 20 % change in mass is swamped. This is the ' +
        'stiffness-controlled region.\n\n' +
        'C — the pressure gain at 10 kHz FALLS. L_te is a series element, and the pressure ' +
        'gain across the ossicular block is the divider |Z_node2/(Z_oss + Z_node2)|. Raising ' +
        'L_te raises |Z_oss|, which makes that ratio smaller. (It is not a matter of ' +
        '"subtracting" an impedance — the quantities are complex and the gain is a ratio.)\n\n' +
        'One more distinction the question hides: the LOCAL resonance of the isolated ' +
        'L_te–C_te pair is not the same thing as the peak of the COMPLETE ladder, which the ' +
        'cavity, both shunt branches and the cochlear load also help to set.',

      studentRevised: {
        when: 'after the explanation, still before running',
        text: 'The isolated L_te-C_te resonance should fall by about 9 %. The peak of the ' +
              'whole network should move much less, because other blocks help set it. ' +
              '100 Hz should barely change, because the spring dominates there. The pressure ' +
              'gain at 10 kHz should fall, because a larger |Z_oss| makes the divider smaller.',
        translated: true
      },

      postHoc:
        'Written after seeing the result.\n\n' +
        'The isolated pair behaved exactly as predicted, and separating it from the system ' +
        'peak turned out to matter a great deal: the local resonance moved 8.7 % while the ' +
        'system peak moved only 0.9 %. Treating them as the same number would have made the ' +
        'prediction wrong by an order of magnitude.\n\n' +
        '100 Hz and 10 kHz both went the way the revised prediction said.\n\n' +
        'Not predicted, and only visible after running: 500 Hz GAINED a little. Adding mass ' +
        'pulled the resonance downward, and on its way down it lifted the response slightly ' +
        'at 500 Hz. So "mass only matters at high frequency" is too simple — a resonance that ' +
        'moves leaves a trace in the bands it passes through.'
    },

    {
      id: 'E2', param: 'C_is', factor: 2.0,
      kind: 'Compliance',
      title: 'E2 — incudo-stapedial joint compliance C_is ×2',
      question: 'C_is sits in a SHUNT branch. What happens at low and at high frequency?',
      studentFirstAnswer: null,
      aiExplanation: null,
      studentRevised: null,
      postHoc: null
    },

    {
      id: 'E3', param: 'R_te', factor: 2.0,
      kind: 'Resistance / loss',
      title: 'E3 — ossicular damping R_te ×2',
      question: 'R_te is a series RESISTANCE. Where in frequency should it act?',
      studentFirstAnswer: null,
      aiExplanation: null,
      studentRevised: null,
      postHoc: null
    }
  ]
};
