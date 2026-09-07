/* report.js — THE SUBMITTED EXPERIMENT REPORT.
 *
 * Committed to the repository, so anyone opening the site reads the finished
 * experiments without typing anything. Separate from the Experiments tab,
 * which is a live TOOL whose records stay in the visitor's own browser.
 *
 * Structure follows the assignment's own order:
 *   1 parameter change and baseline
 *   2 AI-assisted prediction and physical explanation, sourced
 *   3 run the model
 *   4 compare prediction with result, in curves and numbers
 *   5 verification, corrections and limitations
 *
 * Only human text is stored. Every number is recomputed from the model when
 * the page renders, so the report cannot drift away from the code.
 *
 * Field provenance is explicit and time-ordered. `aiPrediction` is written
 * from the circuit topology alone, BEFORE the run. `comparison` and
 * `corrections` are written AFTER seeing the result and are labelled as such;
 * they are never presented as foresight.
 */
window.__EAR_REPORT__ = {
  generated: '2026-09-07',
  course: 'MUE 610 Psychoacoustics — AI Build Lab: middle-ear extension',
  baselineNote:
    'All three experiments start from the published defaults of Pascal et al. (1998) Fig. 1, ' +
    'with the cavity in series and T_r = 17. One parameter is changed at a time; every other ' +
    'element keeps its default value. The complete before/after parameter sets are in the ' +
    'JSON export on the Experiments tab.',

  experiments: [
    /* ------------------------------------------------------------------ */
    {
      id: 'E1', param: 'L_te', factor: 1.2, kind: 'Inertance / mass',
      title: 'E1 — ossicular mass L_te +20 %',
      why: 'L_te is the mass of the coupled eardrum–malleus–incus block. It sits in the SERIES ' +
           'path, so all the volume velocity passes through it.',

      aiPrediction:
        '<b>Prediction, from the topology alone, before running.</b><br><br>' +
        'A mass has impedance jωL, which grows with frequency, so raising L_te should matter ' +
        'more the higher you go. Three consequences follow:<br><br>' +
        '<b>Low frequency should barely move.</b> At 100 Hz the compliance impedance 1/(ωC_te) is ' +
        'roughly 45× the mass impedance ωL_te, so the spring is what resists there. A 20 % change ' +
        'in a term that is already 45× smaller should be invisible. This is the stiffness-controlled ' +
        'region.<br><br>' +
        '<b>High frequency should lose pressure gain.</b> The gain across this block is the complex ' +
        'divider |Z_node2/(Z_oss + Z_node2)|. Raising L_te raises |Z_oss|, which makes that ratio ' +
        'smaller. Note this is a ratio, not a subtraction of impedances.<br><br>' +
        '<b>The isolated L_te–C_te resonance should fall 8.7 %</b> — 1/√1.2 — because the mass is ' +
        'in the denominator under the square root. <b>The system peak should move much less</b>, ' +
        'because the peak of the complete ladder is also set by the cavity, both shunt branches and ' +
        'the cochlear load, none of which changed. These two numbers are different quantities and ' +
        'the prediction keeps them apart.',

      comparison:
        '<b>Written after seeing the result.</b><br><br>' +
        'Every direction predicted was right, and the split between the local and the system ' +
        'resonance mattered more than expected: the isolated pair moved 8.7 % while the system ' +
        'peak moved 0.9 %. Assuming they were the same number would have made the prediction ' +
        'wrong by roughly a factor of ten.',

      corrections:
        '<b>What the prediction missed.</b> 500 Hz <i>gained</i> a little. Adding mass pulled the ' +
        'resonance downward, and on its way down it lifted the response slightly at 500 Hz. So ' +
        '"mass only matters at high frequency" is too simple: a resonance that moves leaves a ' +
        'trace in the bands it passes through.<br><br>' +
        '<b>Limitation.</b> The model is lumped, so above roughly 3 kHz the real eardrum breaks ' +
        'into modes that a single mass cannot represent. The 10 kHz figure should be read as the ' +
        'circuit\'s behaviour, not as a measurement of a real ear.'
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'E2', param: 'C_is', factor: 2.0, kind: 'Compliance',
      title: 'E2 — incudo-stapedial joint compliance C_is ×2',
      why: 'C_is is the softness of the joint between incus and stapes. It sits in a SHUNT ' +
           'branch: a parallel route back to the return, so volume velocity taken by it never ' +
           'reaches the cochlea.',

      aiPrediction:
        '<b>Prediction, from the topology alone, before running.</b><br><br>' +
        'A compliance has impedance 1/(ωC), which falls with frequency, and doubling C halves it. ' +
        'Because this branch is a shunt, a lower branch impedance means more volume velocity is ' +
        'diverted away from the stapes.<br><br>' +
        '<b>Low frequency: almost nothing.</b> At 100 Hz 1/(ωC_is) is enormous, so the branch ' +
        'diverts very little either way.<br><br>' +
        '<b>High frequency: a clear loss</b>, growing with frequency, as the branch impedance ' +
        'falls towards R_is = 170 Ω.<br><br>' +
        '<b>A second effect, which makes the simple "more leak" story insufficient:</b> C_is also ' +
        'forms a resonance with the stapes-plus-vestibular mass, 1/(2π√((L_s+L_v)·C_is)), near ' +
        '5.4 kHz. Doubling C_is moves that resonance <i>down</i> by 1/√2. So this experiment ' +
        'changes two things at once — how much leaks, and where a resonance sits — and the ' +
        'mid-band result will depend on which dominates. The prediction does not commit to a sign ' +
        'in the mid band.',

      comparison:
        '<b>Written after seeing the result.</b><br><br>' +
        'The two ends behaved as predicted: essentially nothing at 100 Hz, and a large loss at ' +
        '10 kHz. <b>The mid band went the other way from the naive "more leak" reading</b>: ' +
        '1 kHz and 2 kHz both <i>gained</i>, and the peak pressure gain <i>rose</i>. The prediction ' +
        'was right to refuse to commit to a sign there.<br><br>' +
        'The cause is the second effect named in the prediction. The joint/stapes resonance moved ' +
        'from about 5.4 kHz down to about 3.8 kHz, and on its way it lifted the 1–4 kHz region. ' +
        'The system peak moved up rather than down, which the simple leak picture cannot explain ' +
        'at all.',

      corrections:
        '<b>What this corrects.</b> "A softer shunt branch always loses signal" is wrong as stated. ' +
        'It is only true where the branch behaves as a pure leak. Where the branch participates in ' +
        'a resonance, changing it retunes the resonance, and the response can rise.<br><br>' +
        '<b>Why this experiment is the best test of the topology.</b> If C_is had been wired in ' +
        'SERIES instead of as a shunt, both the sign and the frequency dependence would be ' +
        'different. The measured pattern — nothing low, gain in the mid band, a large loss high — ' +
        'is the signature of a shunt that also resonates, and it is what the corrected circuit ' +
        'produces.<br><br>' +
        '<b>Limitation.</b> The paper treats the incudomalleal joint as stiff and notes (p. 1511) ' +
        'that above 2.5 kHz a real joint introduces a phase angle it does not model. The 10 kHz ' +
        'figure is therefore the least trustworthy number in this experiment.'
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'E3', param: 'R_te', factor: 2.0, kind: 'Resistance / loss',
      title: 'E3 — ossicular damping R_te ×2',
      why: 'R_te is the damping of the eardrum–malleus–incus block, in the SERIES path. Unlike a ' +
           'mass or a compliance it dissipates energy rather than storing it.',

      aiPrediction:
        '<b>Prediction, from the topology alone, before running.</b><br><br>' +
        'A resistance has an impedance that does not depend on frequency, while the reactances ' +
        'around it do. It therefore only competes where the reactances are small — that is, near ' +
        'resonance, where the mass and the compliance cancel each other.<br><br>' +
        '<b>Near the peak: a visible flattening.</b> Doubling R_te should lower the peak by a few ' +
        'tenths of a dB.<br><br>' +
        '<b>Away from the peak: very little.</b> At 100 Hz the compliance dominates and at 10 kHz ' +
        'the mass dominates; in both places an extra 65 Ω is small beside them.<br><br>' +
        '<b>The peak may also move.</b> The maximum of a lossy resonator does not sit exactly at ' +
        'the undamped resonance. The prediction does not commit to a direction, because the ' +
        'direction depends on how the surrounding blocks vary with frequency, not on the ' +
        'resonator alone.',

      comparison:
        '<b>Written after seeing the result.</b><br><br>' +
        'Both predictions held. The peak flattened, and the effect is concentrated in the ' +
        'mid band: the changes at 100 Hz and 10 kHz are an order of magnitude smaller than the ' +
        'change at 1 kHz. That is the signature of a resistance acting only where the reactances ' +
        'cancel.<br><br>' +
        'The peak did also move, <b>upward</b> by about 20 Hz.',

      corrections:
        '<b>A correction to something stated earlier in this project.</b> While explaining this ' +
        'experiment in conversation, the assistant said that heavier damping "drags the peak ' +
        'downward". That was carried over from an earlier, incorrect version of the circuit. In ' +
        'the corrected circuit the peak moves <b>up</b>. The lesson is that the direction is not a ' +
        'general rule about damped resonators — it depends on the surrounding network — and the ' +
        'earlier claim was an over-generalisation.<br><br>' +
        '<b>Limitation.</b> R_te is a fitted element, estimated by the paper with a Nelder–Mead ' +
        'minimisation rather than derived from anatomy. Its absolute value carries less weight ' +
        'than the qualitative behaviour tested here.'
    }
  ],

  /* ------------------------------------------------------------------ */
  aiCase: {
    title: 'A real AI error and how it was caught',
    summary:
      'One assistant was used throughout: Claude (Opus 5), acting as the coding copilot. The ' +
      'account below states exactly what the student did and what the assistant did at each step. ' +
      'It is the most consequential error in the project: it changed the modelled pressure gain at ' +
      '4 kHz by more than 10 dB.',
    timeline: [
      { who: 'AI', tag: 'ai', when: 'no paper available yet',
        text: 'Asked to build the middle ear from a list of element names, the assistant assembled ' +
              'the five subsystems as a simple series/parallel chain. It also invented a ' +
              'transformer ratio of about 22 from an assumed 1.3 lever ratio.' },
      { who: 'Student', tag: 'stu', when: 'correction 1',
        text: 'Said the circuit is not a chain but a ladder network — one series path with shunt ' +
              'branches — and described that structure in prose. Also supplied Eq. (1), giving ' +
              'the correct transformer ratio T_r = 17, replacing the assistant\'s estimate.' },
      { who: 'AI', tag: 'ai', when: 'rebuild from the prose description',
        text: 'Rebuilt as a ladder. Still got three things wrong, because a prose description does ' +
              'not fix them: it made the eardrum-loss branch three parallel RC cells, attached it ' +
              'after the ossicles, and took the output across the whole stapes-plus-cochlea tail.' },
      { who: 'AI', tag: 'ai', when: 'self-check, still without the paper',
        text: 'Flagged that it had written "Values are Figure 1 / Table I of Pascal et al." into ' +
              'source it had never read, and downgraded that to an explicit ' +
              '"provenance unverified" block rather than leaving a citation it could not support.' },
      { who: 'Student', tag: 'stu', when: 'correction 2 — the decisive one',
        text: 'Supplied the Pascal et al. (1998) PDF. Nothing below could have been found without ' +
              'this; the student did not perform the element-by-element comparison itself.' },
      { who: 'AI', tag: 'ai', when: 'reading Figure 1',
        text: 'Found three concrete errors: the eardrum-loss branch is a single series chain ' +
              'containing two parallel sub-blocks, not three parallel cells; it taps the main line ' +
              'BEFORE C_te, not after the ossicles; and p_c is measured across the cochlear load ' +
              'ALONE, not across the stapes chain as well. Rewrote the circuit accordingly.' },
      { who: 'AI', tag: 'ai', when: 'verification against the paper\'s own figures',
        text: 'Digitised Figs. 2 and 3 and compared. Agreement improved from about 9.7 dB rms to ' +
              '1.34 dB rms in magnitude, with 7.9° rms in phase. At 4 kHz the modelled pressure ' +
              'gain moved from 8.1 dB to about 19.3 dB against the paper\'s 20.8 dB.' },
      { who: 'AI', tag: 'ai', when: 'a second self-check',
        text: 'Noticed while testing that its own web-vs-MATLAB comparison reported a perfect ' +
              '"0.00e+0" for one quantity. Every comparison against NaN is false, so a NaN would ' +
              'have scored perfectly. Hardened the check to count non-finite values explicitly.' },
      { who: 'Student', tag: 'stu', when: 'correction 3',
        text: 'Asked whether the earlier outer-ear assignment had actually been integrated. It had ' +
              'not: its engine had been copied in without its test suite, so the copy was assumed ' +
              'rather than verified to still work. Its 20 checks now run first in runAll.' },
      { who: 'Student', tag: 'stu', when: 'correction 4',
        text: 'Rejected two of the assistant\'s explanations as inaccurate: that "series elements ' +
              'are losses and shunt elements are dead ends", and that magnitude is "insensitive to ' +
              'topology". The assistant checked its own recorded numbers, found they contradicted ' +
              'the second claim — the wrong circuit had been off by 12.7 dB at 4 kHz, so magnitude ' +
              'had caught it immediately — and withdrew it.' }
    ],
    lesson:
      'The pattern is consistent. The assistant was reliable at arithmetic, at running its own ' +
      'tests, and at flagging claims it could not support. It was unreliable whenever it had to ' +
      'guess at structure it had not seen: it produced a confident, plausible-looking circuit that ' +
      'was wrong by more than 10 dB, and no amount of self-checking found that — only the source ' +
      'document did. Every substantive physics correction in this project traces back to the ' +
      'student either supplying the source or rejecting an explanation.'
  }
};
