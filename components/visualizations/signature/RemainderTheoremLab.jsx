'use client';

/* ============================================================================
   RemainderTheoremLab — an interactive "bench" for THE REMAINDER THEOREM:
   the Horner fold.  Evaluating f at a and dividing f by (x − a) are the SAME
   computation — one carry, threaded left to right through the coefficients,
   whose intermediate values are the quotient and whose final value is both
   f(a) and the remainder.  (GRADES 9–12 · CCSS HSA-APR.B.2 — know and apply
   the Remainder Theorem: for a polynomial p(x) and a number a, the remainder
   on division by x − a is p(a), so p(a) = 0 if and only if (x − a) is a
   factor of p(x).)

   THE SIGNATURE CENTERPIECE — "THE HORNER FOLD."  The coefficients of
   f(x) = x³ − 2x² − 5x + 6 sit as blue cards, high degree to low.  A single
   carry starts at the leading 1 and folds rightward: ×a, then add the next
   card, again and again.  The first carries wear a gold bracket — they ARE
   the quotient's coefficients — and the last cell burns carmine with a
   double stamp: f(a), and the remainder.  One picture, two theorems.

   THE MODEL — exact integer arithmetic throughout:
     · F = [1, −2, −5, 6], the fixed cubic (x − 1)(x + 2)(x − 3), coefficients
       high to low.  Integer probes keep every carry an integer.
     · foldAt(a) returns the carry sequence; its last entry is the value,
       its earlier entries are the quotient coefficients.
     · the audit proves foldAt(a) against brute a³ − 2a² − 5a + 6 for every
       integer probe in range, AND expands (x − a)·q(x) + r symbolically to
       recover F exactly — the division identity, not just the evaluation.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No tableau, no bring-downs, no subtract-and-drop rows — the numeric
       long-division bench owns that machine.  The fold has ONE moving value
       and never writes a subtraction; it is visibly a different creature,
       which is the point of building it.
     · The word usually attached to this shortcut names it after the tableau
       it replaces; this bench does not use that name.  The fold is taught
       as what it is: nested evaluation, ((1·a − 2)·a − 5)·a + 6.
     · No slot row, nothing is mailed — the polynomial-arithmetic bench owns
       degree bookkeeping; its identity (x − a)q + r = f is cited as the
       check, computed here symbolically without drawing slots.
     · No graph, no marked crossings — the polynomial-function bench owns
       the picture of y = f(x).  When the dial finds a probe with remainder
       0, this bench says "divides cleanly," and leaves the curve home.
   COLORS: one accent. CARMINE = the final cell, f(a) = r (the object).
   GOLD = the quotient bracket (the tool). BLUE = quiet coefficient cards.
   GREEN only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a probe a is posted; the fold stands with its carries
   hidden.  Rule the last quotient coefficient first (the carry before the
   final fold), then rule the remainder f(a).  Truths are derived from
   foldAt at answer time; the meter is quantized to {0, 50, 100}; the
   remainder earns nothing until the carry stands.  The stamp provably
   cannot fire falsely.
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

/* the fixed cubic, coefficients high to low: x³ − 2x² − 5x + 6 */
const F = [1, -2, -5, 6];

/* the Horner fold: one carry, threaded left to right */
const foldAt = (a) => {
  const carries = [F[0]];
  for (let i = 1; i < F.length; i++) carries.push(carries[i - 1] * a + F[i]);
  return carries;
};
const remainderAt = (a) => foldAt(a)[F.length - 1];
const quotientAt = (a) => foldAt(a).slice(0, F.length - 1); /* x², x, const */

const fmtInt = (n) => (n < 0 ? MINUS + String(-n) : String(n));
const quotientText = (a) => {
  const [c2, c1, c0] = quotientAt(a);
  const t1 = c2 === 1 ? 'x²' : `${fmtInt(c2)}x²`;
  const t2 = c1 === 0 ? '' : ` ${c1 < 0 ? MINUS : '+'} ${Math.abs(c1) === 1 ? 'x' : Math.abs(c1) + 'x'}`;
  const t3 = c0 === 0 ? '' : ` ${c0 < 0 ? MINUS : '+'} ${Math.abs(c0)}`;
  return t1 + t2 + t3;
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted probes; truths derived from the fold, never stored.
   ------------------------------------------------------------------------- */
const CASES = [-2, -1, 0, 1, 2, 3];
const CARRY_CHIPS = [MINUS + '6', MINUS + '5', MINUS + '2', '3'];
const R_CHIPS = [MINUS + '4', '0', '6', '8'];

const labelOf = (i) => `the probe a = ${fmtInt(CASES[i])}`;
const carryTruth = (i) => fmtInt(quotientAt(CASES[i])[2]);
const rTruth = (i) => fmtInt(remainderAt(CASES[i]));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, kPick, rPick) => {
  if (i == null) return [false, false];
  const c1 = kPick === carryTruth(i);
  const c2 = c1 && rPick === rTruth(i);
  return [c1, c2];
};
const closeness = (i, kPick, rPick) => {
  const [c1, c2] = calibChecks(i, kPick, rPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, kPick, rPick) => calibChecks(i, kPick, rPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One carry, threaded through',
    body:
      'f(x) = x³ − 2x² − 5x + 6, probed at a = 2. Start the carry at the ' +
      'leading 1; then, over and over: multiply by a, add the next coefficient. ' +
      'Read the cells left to right: 1, then 1·2 − 2 = 0, then 0·2 − 5 = −5, ' +
      'then −5·2 + 6 = −4. Four cells, one thread.',
    a: 2,
    q: 'What has the fold just computed?',
    choices: [
      'f(2) — the fold is nested evaluation: ((1·2 − 2)·2 − 5)·2 + 6 = −4',
      'The derivative of f at 2',
      'The sum of the coefficients',
    ],
    answer: 0,
    feedback:
      'The fold is f(2) computed inside-out: ((1·2 − 2)·2 − 5)·2 + 6 = −4. ' +
      'Three multiplications, three additions — cheaper than powering up 2³ and ' +
      '2² separately, and every intermediate value is an honest integer you can ' +
      'audit by eye. Computers evaluate every polynomial this way, for exactly ' +
      'these reasons: fewer operations, and no value ever leaves the integers ' +
      'when the inputs are whole.',
    note:
      'Worth doing once by hand, slowly: x³ − 2x² − 5x + 6 = ((x − 2)x − 5)x + 6. ' +
      'The fold is just this identity, walked left to right with a number in ' +
      'hand. Nothing new was invented here — the terms were only regrouped.',
  },
  {
    title: 'The carries moonlight',
    body:
      'Same fold at a = 2, but now look at the cells BEFORE the last: ' +
      '1, 0, −5. The gold bracket beneath them makes a bold claim: those three ' +
      'numbers are a polynomial in their own right, one degree down from f.',
    a: 2,
    q: 'The carries 1, 0, −5 — what are they?',
    choices: [
      'The coefficients of the quotient: f(x) = (x − 2)(x² + 0x − 5) + (−4)',
      'Random intermediate junk with no meaning',
      'The digits of f(2)',
    ],
    answer: 0,
    feedback:
      'Multiply back and watch it land: (x − 2)(x² − 5) = x³ − 2x² − 5x + 10, ' +
      'and adding the remainder −4 restores f exactly. The fold quietly performed ' +
      'the whole division by (x − 2) — the carries are the quotient, the last ' +
      'cell is the remainder, and no cell had to know it was doing either job.',
    note:
      'One pass, two products: the value f(2) AND the full quotient. That ' +
      'economy is why the fold matters — evaluation and division were never two ' +
      'different jobs, and this picture is where you find that out. Try tracing ' +
      'why it works: each carry collects exactly the terms of f that the ' +
      'quotient needs at that degree, no more and no fewer.',
  },
  {
    title: 'The theorem falls out',
    body:
      'For any probe a, division leaves an identity: f(x) = (x − a)·q(x) + r, ' +
      'where r is a plain number — degree zero, because the divisor has degree ' +
      'one. Now substitute x = a into both sides and watch.',
    a: 2,
    q: 'Substituting x = a proves…',
    choices: [
      'f(a) = 0·q(a) + r = r — the remainder IS the value; that is the whole theorem',
      'f(a) = q(a) — the quotient at a',
      'Nothing; substitution is not allowed mid-identity',
    ],
    answer: 0,
    feedback:
      'The factor (x − a) dies at x = a, taking q with it: f(a) = 0·q(a) + r = r. ' +
      'One line, no machinery — the Remainder Theorem is the division identity ' +
      'read at a single point. The fold merely computes both sides at once.',
    note:
      'Notice what the proof did NOT need: any formula for q, any work at all. ' +
      'The identity holds for every x, so it holds at the one x where the ' +
      'divisor vanishes. Cheap arguments that cannot fail are worth collecting — ' +
      'this one substitution will keep earning its keep across the rest of ' +
      'algebra.',
  },
  {
    title: 'Remainder zero, factor found',
    body:
      'Probe a = 1: the fold reads 1, −1, −6, 0. The last cell — the remainder, ' +
      'the value f(1) — is exactly 0, not merely small.',
    a: 1,
    q: 'What does remainder 0 certify?',
    choices: [
      '(x − 1) divides f cleanly: f(x) = (x − 1)(x² − x − 6), no remainder term at all',
      'f is the zero polynomial',
      'The probe was too small to matter',
    ],
    answer: 0,
    feedback:
      'r = 0 turns the identity into f(x) = (x − 1)·q(x) — a clean split. This ' +
      'is the Factor Theorem, the theorem’s sharper edge: (x − a) divides f ' +
      'exactly when f(a) = 0. Probing values now doubles as hunting for clean ' +
      'divisors, and every probe costs only one quick fold to run.',
    note:
      'Check the quotient the bracket hands you: x² − x − 6. Fold IT at a = 3 ' +
      'and the remainder reads 0 again — the hunt continues inside the quotient, ' +
      'one clean split at a time, each round played on a polynomial one degree ' +
      'smaller than the last.',
  },
  {
    title: 'Probing the whole line',
    body:
      'The dial sweeps the probe a from −3 to 3, one integer at a time, and the ' +
      'whole fold recomputes at every stop. Keep your eye on the last cell.',
    a: 2,
    dial: true,
    q: 'At how many dial stops does the remainder read exactly 0?',
    choices: [
      'Three — at a = −2, 1, and 3; each names a clean divisor of f',
      'One — a polynomial can only afford one',
      'Zero — remainders are never exactly 0',
    ],
    answer: 0,
    feedback:
      'Three stops: a = −2, 1, 3 — and indeed f(x) = (x − 1)(x + 2)(x − 3), a ' +
      'cubic fully split into its three clean divisors. A degree-3 polynomial ' +
      'can never afford a fourth: each clean split costs one degree, and three ' +
      'is all f has to spend. The dial just performed a complete search, and ' +
      'the budget argument says the search is genuinely finished.',
    note:
      'The picture of y = f(x) crossing the axis belongs to the function bench ' +
      'next door. This bench reads the same three numbers off the fold, with ' +
      'no picture at all — two benches, one truth, different instruments. When ' +
      'the instruments agree, you can start trusting both of them.',
  },
  {
    title: 'The folder’s stamp',
    body:
      'A probe is posted; the fold stands with its carries veiled. Thread the ' +
      'carry yourself, cell by cell: ×a, add, ×a, add. Rule the last quotient ' +
      'coefficient first — the carry just before the final fold — then rule the ' +
      'remainder f(a). Both exact, or no stamp; the meter reports only how much ' +
      'of the ruling stands.',
    a: 2,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function RemainderTheoremLab() {
  const [aDial, setADial] = useState(2);
  const [kPick, setKPick] = useState(null);
  const [rPick, setRPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const a = calib && kase != null ? CASES[kase] : current.dial ? aDial : current.a;
  const carries = foldAt(a);
  const r = remainderAt(a);

  const checks = calib ? calibChecks(kase, kPick, rPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, kPick, rPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, kPick, rPick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''}` : `the fold at a = ${fmtInt(a)}`;
  sceneRef.current = { a, carries, r, calib, bandLabel };

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

    /* the polynomial card */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the polynomial in the vise', 22, bandH + 8);
    ctx.fillStyle = BLUE;
    ctx.font = '600 12.5px ui-monospace, monospace';
    ctx.fillText(`f(x) = x³ ${MINUS} 2x² ${MINUS} 5x + 6`, 22, bandH + 26);

    /* the fold strip */
    const n = F.length;
    const cellW = Math.min(120, (W - 80) / n);
    const x0 = (W - n * cellW) / 2;
    const yCoef = bandH + 92;
    const yCarry = yCoef + 84;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * cellW;
      /* coefficient card */
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x + 8, yCoef, cellW - 16, 40);
      ctx.fillStyle = BLUE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 14px ui-monospace, monospace';
      ctx.fillText(fmtInt(F[i]), x + cellW / 2, yCoef + 20);
      ctx.fillStyle = SLATE;
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.fillText(['x³', 'x²', 'x', '1'][i], x + cellW / 2, yCoef - 12);

      /* carry cell */
      const last = i === n - 1;
      const veiled = S.calib && i > 0;
      ctx.strokeStyle = last ? CARMINE : GOLD;
      ctx.lineWidth = last ? 2.4 : 2;
      ctx.strokeRect(x + 8, yCarry, cellW - 16, 44);
      ctx.fillStyle = last ? CARMINE : INK_HEX;
      ctx.font = (last ? '700' : '600') + ' 15px ui-monospace, monospace';
      ctx.fillText(veiled ? '?' : fmtInt(S.carries[i]), x + cellW / 2, yCarry + 22);
      /* the fold arrow: ×a then + */
      if (i < n - 1) {
        ctx.strokeStyle = SLATE;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + cellW - 8, yCarry + 22);
        ctx.lineTo(x + cellW + 8, yCarry + 22);
        ctx.stroke();
        ctx.fillStyle = SLATE;
        ctx.font = '600 10.5px ui-monospace, monospace';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`×${fmtInt(S.a)}`, x + cellW, yCarry + 18);
        ctx.textBaseline = 'middle';
        /* the drop from the coefficient card */
        ctx.beginPath();
        ctx.moveTo(x + cellW + cellW / 2, yCoef + 40);
        ctx.lineTo(x + cellW + cellW / 2, yCarry - 6);
        ctx.stroke();
        ctx.font = '600 11px ui-monospace, monospace';
        ctx.fillText('+', x + cellW + cellW / 2 + 10, yCarry - 14);
      }
    }
    /* the gold quotient bracket under the first three carries */
    const bx0 = x0 + 8;
    const bx1 = x0 + (n - 1) * cellW - 8;
    const yB = yCarry + 56;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx0, yB);
    ctx.lineTo(bx0, yB + 8);
    ctx.lineTo(bx1, yB + 8);
    ctx.lineTo(bx1, yB);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillText(S.calib ? 'the quotient — veiled' : `the quotient: ${quotientText(S.a)}`, (bx0 + bx1) / 2, yB + 14);
    /* the double stamp on the last cell */
    ctx.fillStyle = CARMINE;
    ctx.textAlign = 'center';
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib ? 'f(a) = r = ?' : `f(${fmtInt(S.a)}) = ${fmtInt(S.r)} = the remainder`,
      x0 + (n - 1) * cellW + cellW / 2,
      yB + 14
    );

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
    setADial(2);
    setKPick(null);
    setRPick(null);
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
    setADial(2);
    setKPick(null);
    setRPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Carry ${kPick ?? 'unruled'}; remainder ${rPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `The fold at a = ${fmtInt(a)}: carries ${carries.map(fmtInt).join(', ')}; the remainder is ${fmtInt(r)}${r === 0 ? ' — a clean divisor' : ''}.`;

  return (
    <div className="rtlab">
      <header className="head">
        <h1>The Remainder Theorem: One Fold, Two Answers</h1>
        <p className="lede">
          Thread one carry through the coefficients — ×a, add, ×a, add. The final
          cell is f(a); the cells before it are the quotient on division by
          (x − a). <em>Evaluation and division were never two different jobs</em>,
          and r = 0 names a clean divisor.
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
                  <span className="dial-k">the probe a</span>
                  <span className="dial-v mono">{fmtInt(aDial)}</span>
                </div>
                <input
                  type="range"
                  min={-3}
                  max={3}
                  step={1}
                  value={aDial}
                  onChange={(e) => setADial(Number(e.target.value))}
                  aria-label={`Probe, ${aDial}`}
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
                <span className="target-k">The posted probe</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the last carry, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the remainder, stamped</li>
                </ol>
                <div className="declare" role="group" aria-label="Carry ruling">
                  {CARRY_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (kPick === c2 ? ' active' : '')}
                      onClick={() => setKPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Remainder ruling">
                  {R_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (rPick === c2 ? ' active' : '')}
                      onClick={() => setRPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the fold agrees'
                    : checks[0]
                      ? 'carry ruled — one more ×a and add'
                      : 'fold from the left: ×a, add, ×a, add'}
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
                  <span className="mono target-hint">the carry · then the remainder</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setKPick(null);
                  setRPick(null);
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
                  setKPick(null);
                  setRPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">×a, add, ×a, add · last cell = f(a) = the remainder</span>{' '}
        &nbsp;·&nbsp; the carries are the quotient, r = 0 names a clean divisor —
        one fold, two theorems, one moving value.
      </footer>

      <style jsx>{`
        .rtlab2 {
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
        :global(.rtlab2) :focus-visible {
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
