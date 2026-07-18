'use client';

/* ============================================================================
   SignedAdditionLab — an interactive "bench" for ADDING AND SUBTRACTING
   SIGNED NUMBERS: every signed number is a directed arrow, addition is a
   march, and subtraction is unmasked as adding the opposite.

        a signed number = length + aim        (+3 right · −3 left)
        addition: march the first arrow, then the second, tip to tail
        p + (−p) = 0 — every number has exactly one arrow home
        p − q  =  p + (−q) — subtraction IS adding the opposite

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 7.NS.A.1.
   IntegerLab introduces where the negatives live; SignedNumbersLab owns
   what ×(−1) does to the whole line.  This bench owns the DIRECTED march:
   how signed quantities combine, and why p − q = p + (−q) is a
   definition you can watch, not a trick you memorize.

   THE SIGNATURE CENTERPIECE — "THE DIRECTED MARCH, AND THE UNMASKING."
     Arrows on lanes above the number line: the first marches from zero,
     the second starts where the first stopped — tip to tail — and the
     carmine landing is the sum.  (+5) + (−3) spends three of its five
     steps walking back.  The arrow home, −a, closes any march to zero:
     that is what "opposite" means in arithmetic.  Then the unmasking:
     the bench shows 5 − 8 and 5 + (−8) as the SAME march, and
     subtracting a negative marches right — removing a debt makes you
     richer.  The capstone posts a subtraction: rule its rewrite, then
     its landing, both exact, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • AddLab (1-2) owns the count-on hop for whole numbers; nothing here
       counts on, and the word "hop" never appears — these are directed
       marches whose AIM is the content.
     • IntegerLab owns the mirror at zero; no mirror appears.  The
       opposite is defined operationally: the arrow that walks you home.
     • SignedNumbersLab owns the flip of the whole line and the parity of
       flip chains — multiplication.  Nothing here multiplies; the words
       "flip" and "parity" never appear.
     • AbsoluteValueLab owns the fold and distance-as-magnitude; no fold,
       and the word "distance" never appears — arrows have LENGTH and AIM.
     • NumberBondLab owns part-part-whole; no bond diagram is drawn.

   One-accent discipline: CARMINE is THE LANDING — the sum, the rewrite
   verdicts.  GOLD is the marching arrows (the tool).  BLUE is quiet
   labels.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Integers only, everywhere.  Every landing is computed by integer
       addition; every subtraction is REWRITTEN (p, q) → (p, −q) and then
       marched — the audit proves the rewrite law p − q = p + (−q) over
       the whole dial grid, the inverse law a + (−a) = 0, commutativity
       of the march, and every quoted landing in the copy.
     • The dispatcher's stamp needs two exact rulings (the rewrite, then
       the landing), audited over every posted case × chip pair; the
       truth chip is always present and never duplicated.
   Verified by audit-signedaddition.mjs (numeric proof + source greps)
   and verify-signedaddition.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SignedAdditionLab.jsx
     2. Import and render it:
          import SignedAdditionLab from './SignedAdditionLab';
          export default function Page() { return <SignedAdditionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the two arrows,
              the lesson step, answers, the rulings).
     MODEL  — integer arithmetic; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the landing — the sum
const BLUE = '#3f74a6'; // quiet labels
const GOLD = '#b98718'; // the marching arrows
const INK_HEX = '#1c2b3a';

const ARROW_MAX = 9; // the dials: −9 … 9
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Integers; the march; the rewrite law.
   ------------------------------------------------------------------------- */
const fmtSigned = (v) => (v < 0 ? `−${-v}` : `${v}`);
const fmtSecond = (v) => `(${v < 0 ? '−' + -v : '+' + v})`;
const marchOf = (a, b) => a + b; /* land the two-arrow march */
const inverseOf = (a) => -a; /* the arrow home */
/* subtraction p − q, rewritten as the march p + (−q) — THE law of this bench */
const subRewrite = (p, q) => ({ first: p, second: -q });
const aimText = (v) => (v === 0 ? 'no length at all' : v < 0 ? `length ${-v}, aimed left` : `length ${v}, aimed right`);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The dispatcher's stamp."  A subtraction is
   posted; rule its rewrite, then its landing.
   ------------------------------------------------------------------------- */
const CASES = [
  { p: -3, q: 5 },
  { p: 4, q: 9 },
  { p: -6, q: -4 },
  { p: 2, q: -7 },
  { p: -1, q: 8 },
  { p: 7, q: -5 },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const fmtPair = (a, b) => `${fmtSigned(a)} + ${fmtSecond(b)}`;
const rewriteTruth = (i) => fmtPair(CASES[i].p, -CASES[i].q);
const rewriteChips = (i) => {
  const { p, q } = CASES[i];
  const cands = [
    [p, -q],
    [p, q],
    [-p, -q],
    [-p, q],
  ];
  return cands
    .sort((u, v) => u[0] - v[0] || u[1] - v[1])
    .map(([a, b]) => fmtPair(a, b));
};
const landTruth = (i) => CASES[i].p - CASES[i].q;
const landChips = (i) => {
  const { p, q } = CASES[i];
  const cands = [p - q, p + q, q - p, -(p + q), p - q + 2];
  const seen = new Set();
  const out = [];
  for (const v of cands) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
    if (out.length === 4) break;
  }
  return out.sort((x, y) => x - y).map(fmtSigned);
};
const calibChecks = (i, rwPick, landPick) => {
  if (i == null) return [false, false];
  const rwOK = rwPick != null && rwPick === rewriteTruth(i);
  const landOK = rwOK && landPick != null && landPick === fmtSigned(landTruth(i));
  return [rwOK, landOK];
};
const closeness = (i, r, l) =>
  Math.round((100 * calibChecks(i, r, l).filter(Boolean).length) / 2);
const isCalibrated = (i, r, l) => calibChecks(i, r, l).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that lengths add regardless of
   aim, that subtracting always shrinks, that minus-a-minus is mysterious.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A number with an aim',
    body:
      'One arrow, one dial. Positive aims right, negative aims left. Read the arrow, not ' +
      'just the numeral: −3 and +3 share a length and disagree about everything else.',
    a: -3,
    b: 0,
    single: true,
    q: 'What IS −3, on this bench?',
    choices: [
      'An arrow: length 3, aimed left — a number that carries a direction',
      'The same as 3, wearing a small decoration',
      'A number smaller than anything, so it barely counts',
    ],
    answer: 0,
    feedback:
      'Length AND aim. Signed numbers answer two questions at once — how far, and which ' +
      'way. Money, temperature, elevation: every signed quantity is an arrow in disguise, ' +
      'and the arithmetic below is just arrows cooperating.',
  },
  {
    title: 'Addition is a march',
    body:
      'Two arrows now. March the first from zero; the second starts where the first ' +
      'stopped — tip to tail. The carmine landing is the sum. Try (+5) + (−3).',
    a: 5,
    b: -3,
    q: 'So (−4) + 7 lands at…',
    choices: [
      '3 — four of the seven steps are spent walking back; three remain',
      '11 — lengths always add',
      '−3 — the negative one goes first, so it wins',
    ],
    answer: 0,
    feedback:
      'Land at 3. When aims agree, lengths add; when aims argue, they cancel step for ' +
      'step and what remains keeps the longer arrow’s aim. Order never matters — march ' +
      '7 first and then −4, and you land on the same 3.',
  },
  {
    title: 'The arrow home',
    body:
      'Set any first arrow. The bench answers with its opposite — same length, opposite ' +
      'aim — and the march closes at zero, every time.',
    a: 6,
    b: -6,
    inverse: true,
    q: 'Which arrow returns (+6) to zero?',
    choices: [
      '−6 — same length, opposite aim; every number has exactly one arrow home',
      '6 — walk it again',
      '0 — standing still returns you home',
    ],
    answer: 0,
    feedback:
      'a + (−a) = 0 is the whole meaning of “opposite” in arithmetic: the one arrow that ' +
      'undoes yours. Zero is not nothing here — it is HOME, the place every ' +
      'opposite-pair march ends. Keep this; the next step spends it.',
  },
  {
    title: 'Subtraction, unmasked',
    body:
      'The bench now shows two readings of one march: 5 − 8 and 5 + (−8). Same arrows, ' +
      'same landing: −3. Subtracting q IS adding the opposite of q.',
    a: 5,
    b: -8,
    sub: true,
    subQ: 8,
    q: 'Rewrite 3 − 7 as a march.',
    choices: [
      '3 + (−7) — land at −4; subtracting 7 is adding the arrow −7',
      '7 + (−3) — the bigger number goes first',
      '3 + (+7) — drop the sign and add',
    ],
    answer: 0,
    feedback:
      'p − q = p + (−q), always. That single rewrite is the entire subtraction chapter: ' +
      'there is no second machine for subtracting, only the march plus the arrow home. ' +
      'It also explains why 3 − 7 can land below zero without any mystery.',
  },
  {
    title: 'Subtracting a negative',
    body:
      'The famous one. Post 5 − (−2): the rewrite turns it into 5 + (+2), a march that ' +
      'goes RIGHT.',
    a: 5,
    b: 2,
    sub: true,
    subQ: -2,
    q: '5 − (−2) = …',
    choices: [
      '7 — the opposite of −2 is +2; taking away a leftward arrow moves you right',
      '3 — subtraction always shrinks',
      '−7 — two minus signs, so aim left twice',
    ],
    answer: 0,
    feedback:
      'Land at 7. Removing a debt of 2 makes you 2 richer — the rewrite says so without ' +
      'ceremony: 5 − (−2) = 5 + (+2). Minus-a-minus is not a chant; it is the arrow home ' +
      'of an arrow that already aimed left.',
  },
  {
    title: 'The dispatcher’s stamp',
    body:
      'A subtraction is posted. Rule its rewrite as a march first, then rule the landing. ' +
      'Both exact, or no stamp.',
    a: 0,
    b: 0,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SignedAdditionLab() {
  const [arrowA, setArrowA] = useState(-3);
  const [arrowB, setArrowB] = useState(0);
  const [rwPick, setRwPick] = useState(null);
  const [landPick, setLandPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const inverse = !!current.inverse;
  const aNow = calib && kase != null ? CASES[kase].p : arrowA;
  const bNow = calib && kase != null ? -CASES[kase].q : inverse ? -arrowA : arrowB;

  const checks = calib ? calibChecks(kase, rwPick, landPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, rwPick, landPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, rwPick, landPick) : false;

  sceneRef.current = {
    a: aNow,
    b: bNow,
    single: !!current.single,
    sub: !!current.sub,
    subQ: current.subQ,
    calib,
    kase,
  };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const INK_SOFT = '#5b6b7b';
    const S = sceneRef.current;
    ctx.clearRect(0, 0, W, H);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let x = gs; x < W; x += gs) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = gs; y < H; y += gs) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();

    const bandH = 56;
    const lineY = H * 0.62;
    const pad = 34;
    const kx = (W - 2 * pad) / 20; /* −10 … 10 */
    const px = (X) => pad + (X + 10) * kx;

    /* the number line */
    ctx.strokeStyle = 'rgba(91,107,123,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(px(-10), lineY);
    ctx.lineTo(px(10), lineY);
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = -10; v <= 10; v += 2) {
      ctx.beginPath();
      ctx.moveTo(px(v), lineY - 4);
      ctx.lineTo(px(v), lineY + 4);
      ctx.strokeStyle = 'rgba(91,107,123,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillText(v === 0 ? '0' : fmtSigned(v), px(v), lineY + 8);
    }
    /* home, ringed */
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(px(0), lineY, 6.5, 0, 2 * Math.PI);
    ctx.stroke();

    const arrow = (x0, x1, y, color, lw) => {
      if (x0 === x1) return;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(px(x0), y);
      ctx.lineTo(px(x1), y);
      ctx.stroke();
      const dir = x1 > x0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(px(x1), y);
      ctx.lineTo(px(x1) - dir * 9, y - 5);
      ctx.lineTo(px(x1) - dir * 9, y + 5);
      ctx.closePath();
      ctx.fill();
    };

    /* the march: lane 1 then lane 2, tip to tail */
    const lane1 = lineY - 56;
    const lane2 = lineY - 30;
    arrow(0, S.a, lane1, GOLD, 3);
    ctx.fillStyle = INK_HEX;
    ctx.font = '700 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    if (S.a !== 0) ctx.fillText(fmtSigned(S.a), px(S.a / 2), lane1 - 7);
    if (!S.single) {
      arrow(S.a, S.a + S.b, lane2, 'rgba(185,135,24,0.75)', 3);
      if (S.b !== 0) ctx.fillText(fmtSigned(S.b), px(S.a + S.b / 2), lane2 - 7);
    }

    /* the landing */
    const land = S.single ? S.a : marchOf(S.a, S.b);
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px(land), S.single ? lane1 : lane2);
    ctx.lineTo(px(land), lineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = CARMINE;
    ctx.beginPath();
    ctx.arc(px(land), lineY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(S.calib ? '?' : fmtSigned(land), px(land), lineY + 24);

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    let bandText;
    if (S.calib && S.kase != null) {
      const { p, q } = CASES[S.kase];
      bandText = `${fmtSigned(p)} − ${fmtSecond(q)} · rewrite it, then land it`;
    } else if (S.single) {
      bandText = aimText(S.a);
    } else if (S.sub) {
      bandText = `${fmtSigned(S.a)} − ${fmtSecond(S.subQ)}  =  ${fmtSigned(S.a)} + ${fmtSecond(S.b)}  =  ${fmtSigned(marchOf(S.a, S.b))}`;
    } else {
      bandText = `${fmtSigned(S.a)} + ${fmtSecond(S.b)}  =  ${fmtSigned(marchOf(S.a, S.b))}`;
    }
    ctx.fillText(bandText, W / 2, bandH / 2);
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
    const st = STEPS[step];
    setArrowA(st.a);
    setArrowB(st.b);
    setRwPick(null);
    setLandPick(null);
    if (st.calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setArrowA(current.a);
    setArrowB(current.b);
    setRwPick(null);
    setLandPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? `${fmtSigned(CASES[kase].p)} minus ${fmtSigned(CASES[kase].q)}` : ''}. Rewrite ${rwPick ?? 'unruled'}; landing ${landPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : current.single
      ? `One arrow: ${aimText(arrowA)}.`
      : `March ${fmtSigned(aNow)} then ${fmtSigned(bNow)}; land at ${fmtSigned(marchOf(aNow, bNow))}.`;

  return (
    <div className="salab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Signed Numbers: The Directed March</h1>
        <p className="lede">
          A signed number is an arrow — length plus aim. Addition marches the arrows tip
          to tail; the opposite is <em>the arrow home</em>; and subtraction wears a mask:{' '}
          <span className="mono">p − q = p + (−q)</span>, always.
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

          {!calib && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">{current.sub ? 'the number p' : 'the first arrow'}</span>
                  <span className="dial-v mono">{fmtSigned(arrowA)}</span>
                </div>
                <input
                  type="range"
                  min={-ARROW_MAX}
                  max={ARROW_MAX}
                  step={1}
                  value={arrowA}
                  onChange={(e) => setArrowA(Number(e.target.value))}
                  aria-label={`First arrow, ${fmtSigned(arrowA)}`}
                />
              </div>
              {!current.single && !current.sub && (
                <div className="dial">
                  <div className="dial-head">
                    <span className="dial-k">{inverse ? 'the arrow home (locked)' : 'the second arrow'}</span>
                    <span className="dial-v mono">{fmtSigned(inverse ? -arrowA : arrowB)}</span>
                  </div>
                  <input
                    type="range"
                    min={-ARROW_MAX}
                    max={ARROW_MAX}
                    step={1}
                    value={inverse ? -arrowA : arrowB}
                    disabled={inverse}
                    onChange={(e) => setArrowB(Number(e.target.value))}
                    aria-label={`Second arrow, ${fmtSigned(inverse ? -arrowA : arrowB)}`}
                  />
                </div>
              )}
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
                {current.choices.map((c, i) => {
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
                      {c}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted subtraction</span>
                <span className="target-word mono">
                  {fmtSigned(CASES[kase].p)} − {fmtSecond(CASES[kase].q)}
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the rewrite, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the landing, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Rewrite ruling">
                  {rewriteChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (rwPick === c2 ? ' active' : '')}
                      onClick={() => setRwPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Landing ruling">
                  {landChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (landPick === c2 ? ' active' : '')}
                      onClick={() => setLandPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — dispatched'
                    : checks[0]
                      ? 'rewritten — now march it'
                      : 'unmask it first: p + (−q)'}
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
                  <span className="mono target-hint">the rewrite · then the landing</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setRwPick(null);
                  setLandPick(null);
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
                  setRwPick(null);
                  setLandPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">length + aim · tip to tail · p − q = p + (−q)</span>{' '}
        &nbsp;·&nbsp; the march adds arrows, the opposite walks you home, and subtraction
        is the same machine wearing a mask.
      </footer>

      <style jsx>{`
        .salab {
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
        :global(.salab) :focus-visible {
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
