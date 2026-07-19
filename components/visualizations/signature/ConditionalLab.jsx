'use client';

/* ============================================================================
   ConditionalLab — an interactive "bench" for CONDITIONAL PROBABILITY &
   INDEPENDENCE: the crop.  "Given B" is a camera move: crop the picture to
   the B-dots and recount inside the smaller frame.  The numerator changes,
   the DENOMINATOR changes, and every probability stays an exact fraction of
   a countable field.  Independence is then a checkable equality — the crop
   leaves the share unchanged — never a vibe.  (GRADES 9–12 · CCSS
   S-CP.A.1–5 — conditional probability as P(A and B)/P(B); interpret
   independence as P(A|B) = P(A).)

   THE SIGNATURE CENTERPIECE — "THE CROP."  A 10 × 10 field of 100 dots.
   Event A glows carmine; event B is the left block of 50 dots.  Ask
   P(A | B) and a gold crop frame closes around B, dimming everything
   outside: 50 dots remain, 20 glow, and the answer is 20/50 = 2/5 —
   which HAPPENS to equal the whole-field share 40/100 = 2/5, so this
   layout is independent, exactly.  Swap the layout and the crop moves
   the share to 3/5: dependence, printed as an inequality of fractions.

   THE MODEL — exact integer arithmetic throughout:
     · dots live at (row, col), 0..9 × 0..9; B is always the rule c < 5
       (50 dots); A is a per-layout RULE — membership is computed from
       coordinates at every count, never stored as a list of answers.
     · countA / countB / countAB scan the grid; every probability is a
       reduced fraction over its own denominator: whole field 100, or the
       crop's population.
     · indepOf(layout) checks P(A|B) = P(A) by cross-multiplication of
       exact integers — and the audit verifies the product law
       P(A∩B) = P(A)·P(B) holds exactly when it does and fails exactly
       when it does not.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No Venn, no overlapping ovals — the set bench owns that picture;
       here regions are neighborhoods of a dot field, not blobs.
     · No two-way table, no rows and columns of counts — the table bench
       owns "% of WHAT?" as a spreadsheet discipline; this bench makes the
       same point with a camera, and cites the kinship once.
     · No tree, no multiplied paths — the tree bench owns compound
       events by branching; nothing branches here.
     · No spinner, no long run, no simulation — the chance bench owns
       convergence; every number here is a census of visible dots.
   COLORS: one accent. CARMINE = the glowing A-dots and the conditional
   share (the object). GOLD = the crop frame (the tool). BLUE = quiet
   dots. GREEN only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a layout and a question (P(A|B) or P(B|A)) are
   posted.  Rule the crop's population first — the new denominator — then
   rule the conditional share as an exact reduced fraction.  Truths are
   derived from the grid rules at answer time; the meter is quantized to
   {0, 50, 100}; the share earns nothing until the denominator stands.
   The stamp provably cannot fire falsely.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================================================================
   MODEL — exact integer arithmetic; nothing a student sees is floated.
   ========================================================================== */
const CARMINE = '#c81e4f';
const BLUE = '#3f74a6';
const GOLD = '#b98718';
const INK_HEX = '#243342';
const SLATE = '#5b6b7b';
const CALIB_STEP = 5;
const MINUS = '−'; /* U+2212 */

const gcdOf = (x, y) => {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
};
const fracText = ([n, d]) => {
  const g = gcdOf(n, d);
  const rn = n / g;
  const rd = d / g;
  return rd === 1 ? String(rn) : `${rn}/${rd}`;
};

/* B is always the left block: c < 5.  A is a per-layout rule on (r, c). */
const inB = (r, c) => c < 5;
const LAYOUTS = {
  indep: { label: 'the even field', inA: (r, c) => r < 4 },
  dep: { label: 'the left-leaning field', inA: (r, c) => (c < 5 ? r < 6 : r < 2) },
  avoid: { label: 'the right-leaning field', inA: (r, c) => (c < 5 ? r < 1 : r < 7) },
};

/* the censuses — scanned from the rules, never stored */
const countOf = (pred) => {
  let n = 0;
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) if (pred(r, c)) n++;
  return n;
};
const countA = (key) => countOf(LAYOUTS[key].inA);
const countB = () => countOf(inB);
const countAB = (key) => countOf((r, c) => LAYOUTS[key].inA(r, c) && inB(r, c));

/* conditional shares, as exact fractions over the CROP's population */
const condAgivenB = (key) => [countAB(key), countB()];
const condBgivenA = (key) => [countAB(key), countA(key)];
const probA = (key) => [countA(key), 100];
/* independence: P(A|B) = P(A), by exact cross-multiplication */
const indepOf = (key) => countAB(key) * 100 === countA(key) * countB();

/* ---------------------------------------------------------------------------
   CALIBRATION — posted layout + question; truths derived from the rules.
   ------------------------------------------------------------------------- */
const CASES = [
  { layout: 'indep', ask: 'AgB' },
  { layout: 'indep', ask: 'BgA' },
  { layout: 'dep', ask: 'AgB' },
  { layout: 'dep', ask: 'BgA' },
  { layout: 'avoid', ask: 'AgB' },
  { layout: 'avoid', ask: 'BgA' },
];
const DENOM_CHIPS = ['40', '50', '100'];
const FRAC_CHIPS = ['1/10', '1/8', '2/5', '1/2', '3/5', '3/4'];

const askText = (ask) => (ask === 'AgB' ? 'P(glow | left block)' : 'P(left block | glow)');
const labelOf = (i) => `${LAYOUTS[CASES[i].layout].label} · ${askText(CASES[i].ask)}`;
const denomTruth = (i) => String(CASES[i].ask === 'AgB' ? countB() : countA(CASES[i].layout));
const fracTruth = (i) =>
  fracText(CASES[i].ask === 'AgB' ? condAgivenB(CASES[i].layout) : condBgivenA(CASES[i].layout));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, dPick, fPick) => {
  if (i == null) return [false, false];
  const c1 = dPick === denomTruth(i);
  const c2 = c1 && fPick === fracTruth(i);
  return [c1, c2];
};
const closeness = (i, dPick, fPick) => {
  const [c1, c2] = calibChecks(i, dPick, fPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, dPick, fPick) => calibChecks(i, dPick, fPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The whole field',
    body:
      'One hundred dots. Forty glow. No crop yet — the question is asked of ' +
      'the entire field.',
    layout: 'indep',
    crop: 'none',
    q: 'P(a random dot glows) = ?',
    choices: [
      '40/100 = 2/5 — a probability here is a SHARE of a countable field, nothing fancier',
      '40 — the number of glowing dots',
      'Impossible to say without an experiment',
    ],
    answer: 0,
    feedback:
      'Count and divide: 40 glowing dots over 100 dots, reduced to 2/5. On this ' +
      'bench every probability stays this concrete — a census of visible dots ' +
      'over the population currently in frame. The interesting question is what ' +
      'happens when the frame moves.',
    note:
      'Keep the phrase "in frame" — it is about to do all the work. The ' +
      'denominator of every probability is precisely the population of the ' +
      'current frame, and so far the frame is everything. The number 100 will ' +
      'stay on the chips below as a standing temptation — the old frame, kept ' +
      'past its expiry.',
  },
  {
    title: 'The crop',
    body:
      'New question: a dot is drawn FROM THE LEFT BLOCK — given that, what is ' +
      'the chance it glows? The gold frame crops to the 50 left dots.',
    layout: 'indep',
    crop: 'B',
    q: 'P(glow | left block) = ?',
    choices: [
      '20/50 = 2/5 — recount inside the crop: 20 glowing among the 50 remaining',
      '20/100 — the glowing left dots over the whole field',
      '40/50 — all glowing dots over the crop',
    ],
    answer: 0,
    feedback:
      '"Given B" means the world outside B no longer exists: 50 dots remain, ' +
      'and 20 of them glow, so 20/50 = 2/5. Both wrong answers are real errors ' +
      'with names — keeping the old denominator, and importing glowers the ' +
      'crop already discarded. The crop IS the definition of conditional ' +
      'probability — everything else in this subject is corollary.',
    note:
      'Formula readers: P(A|B) = P(A∩B)/P(B) = (20/100)/(50/100) — the 100s ' +
      'cancel and you are left with 20/50, exactly the recount inside the ' +
      'frame. The camera and the formula are one instrument.',
  },
  {
    title: 'Independence, certified',
    body:
      'Compare the two answers on this field: whole-frame 40/100 = 2/5, and ' +
      'cropped 20/50 = 2/5. Identical — exactly.',
    layout: 'indep',
    crop: 'B',
    q: 'What does P(glow | left) = P(glow) certify?',
    choices: [
      'Independence — learning a dot is in the left block tells you NOTHING new about glowing',
      'That the field has an error',
      'That glowing causes left-ness',
    ],
    answer: 0,
    feedback:
      'The crop moved the frame and the share did not flinch: 2/5 before, 2/5 ' +
      'after. That equality — checked by cross-multiplying integers, 20·100 = ' +
      '40·50 — is what independence IS. And the product law follows: P(both) = ' +
      '20/100 = 1/5 = (2/5)·(1/2), the shares multiplying exactly.',
    note:
      'Certified, not eyeballed: independence on this bench is the integer ' +
      'identity 20·100 = 40·50. Near-independence does not exist here — the ' +
      'equality holds or it fails, and either way you can point at the exact ' +
      'dots that settle it.',
  },
  {
    title: 'When the crop moves the odds',
    body:
      'New field, same 40 glowers, same left block. But now the crop reads ' +
      '30 glowing among the 50.',
    layout: 'dep',
    crop: 'B',
    q: 'P(glow | left) = 30/50 = 3/5, but P(glow) = 2/5. Meaning?',
    choices: [
      'Dependent — the crop CHANGED the share, so left-ness carries real information about glowing',
      'The field is broken; shares cannot change',
      'Independent, since both fractions use 5ths',
    ],
    answer: 0,
    feedback:
      'Same glow count, different arrangement: the glowers lean left, so ' +
      'entering the left block RAISES the share from 2/5 to 3/5. Dependence is ' +
      'not a mystery force — it is geometry, visible as crowding inside the ' +
      'crop, and printed as 3/5 ≠ 2/5 in exact fractions.',
    note:
      'What dependence does NOT certify: that the left block MAKES dots glow. ' +
      'Association and mechanism live on different benches, and the ' +
      'lurking-variable bench guards that border.',
  },
  {
    title: 'The two crops are different questions',
    body:
      'The dial swaps the crop: frame the left block, or frame the glowers. ' +
      'Same field, same overlap of 30 — different denominators.',
    layout: 'dep',
    crop: 'B',
    dial: true,
    q: 'On this field, P(glow | left) vs P(left | glow)?',
    choices: [
      '30/50 = 3/5 against 30/40 = 3/4 — same overlap, different frames, different answers',
      'Equal — conditioning is symmetric',
      'They always sum to 1',
    ],
    answer: 0,
    feedback:
      'Both questions share the numerator 30 — the dots that are both — but ' +
      'the frames differ: 50 in the left block, 40 glowing. 3/5 and 3/4 are ' +
      'answers to DIFFERENT questions, and swapping them is the single most ' +
      'consequential probability error in medicine and law. The table bench ' +
      'asks "percent of WHAT?"; this bench asks "cropped to WHAT?" — one ' +
      'discipline, two instruments.',
    note:
      'Sweep the dial a few times and watch only the denominator line: the ' +
      'numerator 30 never moves. Conditioning re-frames; it never re-counts ' +
      'the overlap. Hold that asymmetry and the reversal error can never ' +
      'sneak past you again.',
  },
  {
    title: 'The cropper’s stamp',
    body:
      'A field and a question are posted. Read which way the question crops — ' +
      'to the left block, or to the glowers — and rule the crop’s population ' +
      'first: the new denominator, never the stale 100. Then recount inside ' +
      'the frame and rule the conditional share as an exact reduced fraction. ' +
      'Both exact, or no stamp; the meter reports only how much of the ruling ' +
      'stands.',
    layout: 'indep',
    crop: 'B',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ConditionalLab() {
  const [cropDial, setCropDial] = useState(0); /* 0 = crop B, 1 = crop A */
  const [dPick, setDPick] = useState(null);
  const [fPick, setFPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const layout = calib && kase != null ? CASES[kase].layout : current.layout;
  const cropMode = calib && kase != null ? (CASES[kase].ask === 'AgB' ? 'B' : 'A') : current.dial && cropDial === 1 ? 'A' : current.crop;
  const cA = countA(layout);
  const cB = countB();
  const cAB = countAB(layout);

  const checks = calib ? calibChecks(kase, dPick, fPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, dPick, fPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, dPick, fPick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''}` : `${LAYOUTS[layout].label}${cropMode !== 'none' ? ` · cropped to ${cropMode === 'B' ? 'the left block' : 'the glowers'}` : ''}`;
  sceneRef.current = { layout, cropMode, cA, cB, cAB, calib, bandLabel };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H2 = stage.clientHeight;
    if (W === 0 || H2 === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H2 * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const S = sceneRef.current;
    ctx.clearRect(0, 0, W, H2);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let gx = gs; gx < W; gx += gs) {
      ctx.moveTo(Math.round(gx) + 0.5, 0);
      ctx.lineTo(Math.round(gx) + 0.5, H2);
    }
    for (let gy = gs; gy < H2; gy += gs) {
      ctx.moveTo(0, Math.round(gy) + 0.5);
      ctx.lineTo(W, Math.round(gy) + 0.5);
    }
    ctx.stroke();

    const bandH = 52;
    const gridW = Math.min(W - 300, H2 - bandH - 60);
    const cell = gridW / 10;
    const gx0 = 30;
    const gy0 = bandH + 30;
    const inCrop = (r, c) =>
      S.cropMode === 'none' ? true : S.cropMode === 'B' ? inB(r, c) : LAYOUTS[S.layout].inA(r, c);

    /* the dots */
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        const glow = LAYOUTS[S.layout].inA(r, c);
        const inside = inCrop(r, c);
        ctx.globalAlpha = inside ? 1 : 0.18;
        ctx.fillStyle = glow ? CARMINE : BLUE;
        ctx.beginPath();
        ctx.arc(gx0 + c * cell + cell / 2, gy0 + r * cell + cell / 2, cell * 0.28, 0, 2 * Math.PI);
        ctx.fill();
      }
    ctx.globalAlpha = 1;

    /* the crop frame */
    if (S.cropMode === 'B') {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.strokeRect(gx0, gy0, 5 * cell, 10 * cell);
    } else if (S.cropMode === 'A') {
      /* frame every glowing dot's cell (the A region may be ragged) */
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 10; c++)
          if (LAYOUTS[S.layout].inA(r, c)) ctx.strokeRect(gx0 + c * cell + 1, gy0 + r * cell + 1, cell - 2, cell - 2);
    }

    /* the readout card */
    const cx0 = gx0 + 10 * cell + 26;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the census', cx0, gy0);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillStyle = CARMINE;
    ctx.fillText(`glowing: ${S.cA} of 100`, cx0, gy0 + 22);
    ctx.fillStyle = BLUE;
    ctx.fillText(`left block: ${S.cB} of 100`, cx0, gy0 + 40);
    ctx.fillStyle = INK_HEX;
    ctx.fillText(`both: ${S.cAB}`, cx0, gy0 + 58);
    if (S.cropMode !== 'none') {
      const denom = S.cropMode === 'B' ? S.cB : S.cA;
      ctx.fillStyle = GOLD;
      ctx.fillText(S.calib ? 'in frame: ?' : `in frame: ${denom} dots`, cx0, gy0 + 84);
      ctx.fillStyle = CARMINE;
      ctx.fillText(
        S.calib
          ? 'the share: ?'
          : `the share: ${fracText([S.cAB, denom])}  (${S.cAB} of ${denom})`,
        cx0,
        gy0 + 102
      );
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(S.bandLabel, W / 2, bandH / 2);
  }, []);

  useEffect(() => {
    draw();
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* every step opens on the scene its words describe */
  useEffect(() => {
    setCropDial(0);
    setDPick(null);
    setFPick(null);
    if (STEPS[step].calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setCropDial(0);
    setDPick(null);
    setFPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Denominator ${dPick ?? 'unruled'}; share ${fPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : cropMode === 'none'
      ? `${LAYOUTS[layout].label}: ${cA} glow among 100; the share is ${fracText([cA, 100])}.`
      : `${LAYOUTS[layout].label}, cropped to ${cropMode === 'B' ? 'the left block' : 'the glowers'}: ${cropMode === 'B' ? cB : cA} in frame, ${cAB} both; the share is ${fracText([cAB, cropMode === 'B' ? cB : cA])}.`;

  return (
    <div className="cclab">
      <header className="head">
        <h1>Conditional Probability: The Crop</h1>
        <p className="lede">
          “Given B” is a camera move: crop the field to B’s dots and recount
          inside the smaller frame — <em>the denominator is the population in
          frame</em>. Independence is the crop leaving the share untouched,
          certified by exact fractions on a countable field of 100 dots.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {current.dial && !calib && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the crop</span>
                  <span className="dial-v mono">{cropDial === 0 ? 'the left block' : 'the glowers'}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={1}
                  value={cropDial}
                  onChange={(e) => setCropDial(Number(e.target.value))}
                  aria-label={`Crop, ${cropDial === 0 ? 'left block' : 'glowers'}`}
                />
              </div>
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Scene">
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
            </button>
          </div>
        </section>

        {/* ---------- TUTOR ---------- */}
        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span
                key={i}
                role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </div>

          <p className="eyebrow small">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((cq, i) => {
                  const chosen = answers[step];
                  const isChosen = chosen === i;
                  const isCorrect = i === current.answer;
                  let cls = 'choice';
                  if (chosen != null) {
                    if (isCorrect) cls += ' correct';
                    else if (isChosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && isCorrect ? '✓' : chosen != null && isChosen ? '✕' : ''}
                      </span>
                      {cq}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
              {answered && current.note && <p className="note">{current.note}</p>}
            </div>
          )}

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted question</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the frame, counted</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the share, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Denominator ruling">
                  {DENOM_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (dPick === c2 ? ' active' : '')}
                      onClick={() => setDPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Share ruling">
                  {FRAC_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (fPick === c2 ? ' active' : '')}
                      onClick={() => setFPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the frame is honest'
                    : checks[0]
                      ? 'frame counted — now recount the glow inside'
                      : 'cropped to WHAT? count that population'}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{checks.filter(Boolean).length}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">the frame · then the share</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setDPick(null);
                  setFPick(null);
                }}
              >
                Next case
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {hasQuestion && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setStep(0);
                  setAnswers({});
                  setKase(null);
                  setDPick(null);
                  setFPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">given B = cropped to B · the denominator is the frame</span>{' '}
        &nbsp;·&nbsp; independence is the crop leaving the share untouched — an
        integer identity, never a vibe.
      </footer>

      <style jsx>{`
        .cclab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --blue: #3f74a6;
          --gold: #b98718;
          --quad: #c7d8e4;
          --ok: #1f8a5b;
          --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
          --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
          background: var(--page);
          color: var(--ink);
          font: 16px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif;
          padding: 28px 18px 44px;
          border-radius: 16px;
          max-width: 1120px;
          margin: 0 auto;
        }
        .mono {
          font-family: var(--mono);
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 6px;
        }
        .eyebrow.small {
          margin: 0 0 4px;
        }
        h1 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: clamp(26px, 4vw, 34px);
          margin: 0 0 6px;
        }
        .lede {
          color: var(--ink-soft);
          margin: 0 0 22px;
          max-width: 72ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 920px) {
          .bench {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .panel {
          min-width: 0;
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 7 / 5;
          min-height: 400px;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
            min-height: 380px;
          }
        }
        .dials {
          margin: 12px 4px 0;
          display: grid;
          gap: 8px;
        }
        .dial {
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          background: var(--paper);
        }
        .dial-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .dial-k {
          font-size: 12.5px;
          font-weight: 600;
        }
        .dial-v {
          font-size: 13px;
          color: var(--gold);
          font-weight: 700;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--gold);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .chipbtn {
          font: 600 12px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(63, 116, 166, 0.55);
          background: var(--paper);
          color: var(--blue);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
        }
        .chipbtn:hover {
          border-color: var(--ink);
        }
        .btn {
          font: 600 13px/1 system-ui, sans-serif;
          padding: 9px 14px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: #fff;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .btn.ghost {
          background: transparent;
          color: var(--ink);
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
          filter: brightness(1.08);
        }
        .tutor {
          padding: 18px 20px 20px;
        }
        .progress {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
        }
        .pip {
          height: 5px;
          flex: 1;
          border-radius: 3px;
          background: rgba(28, 43, 58, 0.14);
        }
        .pip.done {
          background: rgba(200, 30, 79, 0.45);
        }
        .pip.cur {
          background: var(--carmine);
        }
        h2 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: 20px;
          margin: 0 0 10px;
          padding-bottom: 9px;
          border-bottom: 3px double rgba(200, 30, 79, 0.45);
        }
        .body {
          margin: 0 0 16px;
          font-size: 14.5px;
        }
        .quiz {
          margin-top: 4px;
          padding-top: 6px;
        }
        .q {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
        }
        .choices {
          display: grid;
          gap: 7px;
        }
        .choice {
          text-align: left;
          font: 13.5px/1.4 system-ui, sans-serif;
          padding: 9px 11px 9px 30px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .choice:not(:disabled):hover {
          border-color: var(--ink);
        }
        .choice .mark {
          position: absolute;
          left: 10px;
          font-weight: 700;
        }
        .choice.correct {
          border-color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
        }
        .choice.correct .mark {
          color: var(--ok);
        }
        .choice.wrong {
          border-color: var(--ink-soft);
          background: rgba(91, 107, 123, 0.08);
        }
        .choice.wrong .mark {
          color: var(--ink-soft);
        }
        .choice.dim {
          opacity: 0.55;
        }
        .choice:disabled {
          cursor: default;
        }
        .feedback {
          margin: 12px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink);
          background: rgba(200, 30, 79, 0.05);
          border-left: 3px solid var(--carmine);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
        }
        .calib {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
          display: grid;
          gap: 10px;
        }
        .target-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(185, 135, 24, 0.07);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .target-word {
          font-family: var(--serif);
          font-size: 21px;
          font-weight: 600;
        }
        .tasks {
          margin: 0;
          padding: 0 0 0 4px;
          list-style: none;
          font-size: 13.5px;
          display: grid;
          gap: 4px;
        }
        .tasks li.done {
          color: var(--ok);
          font-weight: 600;
        }
        .declare {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .declbtn {
          font-size: 12.5px;
          font-weight: 700;
          padding: 7px 11px;
          border-radius: 6px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
        }
        .declbtn.reason {
          font-size: 11.5px;
          font-weight: 600;
        }
        .declbtn.active {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.1);
          color: var(--carmine);
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--carmine));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
          white-space: nowrap;
        }
        .nav {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .foot {
          margin-top: 24px;
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        :global(.cclab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (max-width: 460px) {
          .toolbar {
            gap: 6px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chipbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
