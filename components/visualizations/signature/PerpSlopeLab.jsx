'use client';

/* ============================================================================
   PerpSlopeLab — an interactive "bench" for PARALLEL & PERPENDICULAR SLOPES:
   the quarter turn.  A line's slope is its STEP — run a, rise b.  Turn the
   step a quarter turn and it becomes (−b, a): run and rise swap and one sign
   flips.  The turned step rides the perpendicular line, so the two slopes
   are b/a and −a/b, and their product is −1 — not a rule to memorize but a
   fraction meeting its own flipped negative.  (GRADES 9–12 · CCSS
   HSG-GPE.B.5 — prove the slope criteria for parallel and perpendicular
   lines and use them to solve geometric problems.)

   THE SIGNATURE CENTERPIECE — "THE TURNED TILE."  The step (3, 2) is drawn
   as an arrow with its a × b tile behind it; the quarter turn stands the
   SAME tile on its side, and the turned arrow (−2, 3) rides its edge.  Two
   lines grow out of the two arrows, visibly square at the shared point,
   and the carmine product line runs the arithmetic: (2/3) · (−3/2) = −1,
   exactly.  The line bench's slope triangle never turns; this bench is the
   turn.

   THE MODEL — exact integer/rational arithmetic throughout:
     · steps are integer vectors [a, b]; turn([a, b]) = [−b, a] — one law.
     · slopeOf([a, b]) = b/a as a reduced fraction, THROWING on vertical
       steps — the undefined slope is treated as the honest exception it
       is, not papered over.
     · perpSlopeOf(step) = slopeOf(turn(step)) — DERIVED from the turn,
       never stored; the audit proves slope · perpSlope = −1 for every
       posted step with both slopes defined, and proves the handshake
       a·c + b·d = 0 between every step and its turn.
     · the exception pair: step (1, 0) turns to (0, 1) — perpendicular by
       the turn, yet the product rule cannot even speak (0 times undefined).

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No intercepts, no equation-of-a-line fitting, no staircase — the
       line bench owns a line's anatomy; its slope triangle is cited as
       the ancestor of the step, and it NEVER rotates.
     · No traded quadrants, no ×i — the complex bench owns turning as
       multiplication; the two benches reach the same quarter turn from
       different doors, and each stays in its own.
     · No deficit, no account cards — the triangle-audit bench owns
       classifying corners by side lengths.
     · No named vector machinery — a later bench owns products of
       arrows at large; here a·c + b·d = 0 is plain arithmetic.
   COLORS: one accent. CARMINE = the turned step and the −1 (the object).
   GOLD = the tile (the tool). BLUE = the original step and its line.
   GREEN only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a step is posted.  Rule the line's slope first (read
   the step), then rule the perpendicular slope (turn it).  Truths are
   derived from slopeOf/turn at answer time; the meter is quantized to
   {0, 50, 100}; the perpendicular earns nothing until the slope stands.
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

const fmtInt = (n) => (n < 0 ? MINUS + String(-n) : String(n));
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

/* the one law: a quarter turn swaps run and rise and flips one sign */
const turn = ([a, b]) => [-b, a];

/* the slope of a step, as a reduced exact fraction — vertical steps refuse */
const slopeOf = ([a, b]) => {
  if (a === 0) throw new Error('a vertical step has no slope — the honest exception');
  const g = gcdOf(b, a);
  let n = b / g;
  let d = a / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return [n, d];
};
const perpSlopeOf = (step) => slopeOf(turn(step));
const slopeText = ([n, d]) => (d === 1 ? fmtInt(n) : `${n < 0 ? MINUS : ''}${Math.abs(n)}/${d}`);
/* the handshake: a·c + b·d, exact — zero certifies the square corner */
const handshake = ([a, b], [c, d]) => a * c + b * d;

/* the dial's step set (the last pair is the product rule's blind spot) */
const STEP_SET = [
  [3, 2],
  [1, 3],
  [5, 1],
  [1, 1],
  [1, 0],
];

/* ---------------------------------------------------------------------------
   CALIBRATION — posted steps; truths derived from the turn.
   ------------------------------------------------------------------------- */
const CASES = [
  [3, 2],
  [1, 3],
  [5, 1],
  [2, 5],
  [4, 3],
  [1, 1],
];
const SLOPE_CHIPS = ['1/5', '2/3', '3/4', '1', '5/2', '3'];
const PERP_CHIPS = [MINUS + '5', MINUS + '3/2', MINUS + '4/3', MINUS + '1', MINUS + '2/5', MINUS + '1/3'];

const labelOf = (i) => `the step (run ${CASES[i][0]}, rise ${CASES[i][1]})`;
const slopeTruth = (i) => slopeText(slopeOf(CASES[i]));
const perpTruth = (i) => slopeText(perpSlopeOf(CASES[i]));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, sPick, pPick) => {
  if (i == null) return [false, false];
  const c1 = sPick === slopeTruth(i);
  const c2 = c1 && pPick === perpTruth(i);
  return [c1, c2];
};
const closeness = (i, sPick, pPick) => {
  const [c1, c2] = calibChecks(i, sPick, pPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, sPick, pPick) => calibChecks(i, sPick, pPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A line is its step',
    body:
      'Run 3, rise 2: the step (3, 2). Repeat it and a line grows; scale it to ' +
      '(6, 4) and the same line grows, because 4/6 reduces to 2/3.',
    stepIdx: 0,
    showTurn: false,
    q: 'What exactly does the slope 2/3 record?',
    choices: [
      'The step’s shape — rise per run, unchanged by scaling, the line bench’s slope triangle sharpened into an arrow',
      'The step’s size — longer steps mean bigger slopes',
      'The line’s distance from the origin',
    ],
    answer: 0,
    feedback:
      'Slope is shape, not size: (3, 2), (6, 4), (9, 6) all reduce to 2/3, and ' +
      'all ride one line. The line bench proved this with its slope triangle; ' +
      'this bench borrows the triangle, sharpens it into an arrow — and then ' +
      'does the one thing the line bench never does: turns it.',
    note:
      'Keep the step as an ordered pair, run first. Everything today is a ' +
      'statement about what happens to that pair — the lines are just the ' +
      'pairs made visible on paper.',
  },
  {
    title: 'The quarter turn',
    body:
      'Turn the step (3, 2) a quarter turn: it lands on (−2, 3). Run and rise ' +
      'SWAP, and one sign flips. The gold tile shows why: it is the same 3 × 2 ' +
      'tile, stood on its side.',
    stepIdx: 0,
    showTurn: true,
    q: 'Why is the turned arrow exactly square to the original?',
    choices: [
      'Same tile, stood on its side — a rectangle’s corner is square, so edge and stood-up edge meet at a right angle',
      'Because the numbers 2 and 3 are coprime',
      'It is only approximately square',
    ],
    answer: 0,
    feedback:
      'The arrow rides the tile’s diagonal-free edge pair: (3, 2) spans the ' +
      'lying tile, (−2, 3) spans the standing one, and standing a rectangle on ' +
      'its side is a turn through exactly one corner — 90°, no protractor ' +
      'needed. As a receipt, run the handshake: 3·(−2) + 2·3 = 0.',
    note:
      'The handshake a·c + b·d = 0 is the arithmetic shadow of the square ' +
      'corner — it reads zero for every step against its own turn: ' +
      '−ab + ba = 0, always. A later bench gives that expression its ' +
      'full name and career.',
  },
  {
    title: 'The product lands on −1',
    body:
      'Slopes now. The step (3, 2) has slope 2/3. The turned step (−2, 3) has ' +
      'slope 3/(−2) = −3/2. Multiply.',
    stepIdx: 0,
    showTurn: true,
    q: '(2/3) · (−3/2) = ?',
    choices: [
      '−1 exactly — the swap puts the same two numbers into a fraction and its flipped negative, so everything cancels',
      'About −0.9, close to −1',
      '−6/6, which rounds to −1',
    ],
    answer: 0,
    feedback:
      'Cancellation, not coincidence: slope b/a meets slope −a/b, and the ' +
      'product is −(ab)/(ab) = −1 for EVERY step with both slopes defined. ' +
      'm₁ · m₂ = −1 is the quarter turn written in fraction notation — the ' +
      'geometry did the proving; the algebra is just the receipt.',
    note:
      '−6/6 IS −1, not a rounding of it — watch for that snare of language. ' +
      'Nothing in today’s arithmetic is approximate; the product lands on −1 ' +
      'the way 2 + 2 lands on 4.',
  },
  {
    title: 'Parallel is the easy half',
    body:
      'Two lines with steps (3, 2) and (6, 4): both slopes reduce to 2/3. The ' +
      'lines run forever at the same tilt.',
    stepIdx: 0,
    showTurn: false,
    q: 'The parallel criterion, precisely?',
    choices: [
      'Equal slopes — same reduced step shape — through different anchor points: the lines never meet',
      'Slopes that multiply to +1',
      'Steps of equal length',
    ],
    answer: 0,
    feedback:
      'Parallel lines share their step shape exactly: equal reduced slopes. ' +
      '(Two lines with equal slopes and a shared point are the SAME line — ' +
      'the criterion needs them apart.) Together with the quarter turn, one ' +
      'pair of criteria now covers both extremes of how two lines can relate.',
    note:
      'Mind the false cousin: slopes multiplying to +1 — like 2/3 and 3/2 — ' +
      'are NOT parallel and NOT perpendicular; they are mirror tilts across ' +
      'the diagonal. Only equality speaks for parallel.',
  },
  {
    title: 'Where the rule goes silent',
    body:
      'The dial walks the step set. Last stop: the flat step (1, 0), slope 0. ' +
      'Its turn is (0, 1) — a vertical step, whose slope refuses to exist.',
    stepIdx: 0,
    dial: true,
    showTurn: true,
    q: 'The flat and vertical pair — perpendicular or not?',
    choices: [
      'Perpendicular by the turn test — but m₁ · m₂ = −1 cannot even be written: 0 times an undefined slope says nothing',
      'Not perpendicular, since the product is not −1',
      'Perpendicular, because 0 · anything = −1 vertically',
    ],
    answer: 0,
    feedback:
      'The turn test never blinks: (1, 0) turns to (0, 1), handshake 1·0 + 0·1 ' +
      '= 0, square corner certified. The PRODUCT rule is the one that fails — ' +
      'it needs both slopes to exist, and the vertical step declines. Know ' +
      'which of your instruments is fundamental: the turn is; the −1 is its ' +
      'shadow, and shadows vanish at noon.',
    note:
      'This is why the bench’s slopeOf THROWS on vertical steps instead of ' +
      'faking a value. An honest "undefined" preserves the theorem; a fake ' +
      '"infinity" would quietly break the product rule’s bookkeeping.',
  },
  {
    title: 'The turner’s stamp',
    body:
      'A step is posted. Rule the line’s slope first — read rise over run and ' +
      'reduce — then rule the perpendicular slope: turn the step and read ' +
      'again. Both exact, or no stamp.',
    stepIdx: 0,
    showTurn: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PerpSlopeLab() {
  const [stepDial, setStepDial] = useState(0);
  const [sPick, setSPick] = useState(null);
  const [pPick, setPPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const vec = calib && kase != null ? CASES[kase] : current.dial ? STEP_SET[stepDial] : STEP_SET[current.stepIdx];
  const turned = turn(vec);
  const vertical = vec[0] === 0;
  const turnedVertical = turned[0] === 0;
  const slope = vertical ? null : slopeOf(vec);
  const perp = turnedVertical ? null : slopeOf(turned);

  const checks = calib ? calibChecks(kase, sPick, pPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, sPick, pPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, sPick, pPick) : false;

  const bandLabel = calib
    ? `posted: ${kase != null ? labelOf(kase) : ''}`
    : `the step (${fmtInt(vec[0])}, ${fmtInt(vec[1])}) and its quarter turn`;
  sceneRef.current = { vec, turned, slope, perp, showTurn: !!current.showTurn || calib, calib, bandLabel };

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
    const cx = W * 0.42;
    const cy = bandH + (H2 - bandH) * 0.52;
    const u = 30; /* pixels per grid unit */
    const P = ([x, y]) => [cx + x * u, cy - y * u];

    /* the two lines through the shared point */
    const drawLine = (v, color) => {
      const L = 12;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(...P([-L * v[0], -L * v[1]]));
      ctx.lineTo(...P([L * v[0], L * v[1]]));
      ctx.stroke();
    };
    drawLine(S.vec, 'rgba(63,116,166,0.45)');
    if (S.showTurn) drawLine(S.turned, 'rgba(200,30,79,0.35)');

    /* the tiles */
    const tile = (v, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(
        Math.min(P([0, 0])[0], P([v[0], 0])[0]),
        Math.min(P([0, 0])[1], P([0, v[1]])[1]),
        Math.abs(v[0]) * u,
        Math.abs(v[1]) * u
      );
    };
    if (S.showTurn) {
      tile(S.vec, 'rgba(185,135,24,0.8)');
      tile(S.turned, 'rgba(185,135,24,0.45)');
    }

    /* the arrows */
    const arrow = (v, color) => {
      const [x0, y0] = P([0, 0]);
      const [x1, y1] = P(v);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const ang = Math.atan2(y1 - y0, x1 - x0);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - 10 * Math.cos(ang - 0.4), y1 - 10 * Math.sin(ang - 0.4));
      ctx.lineTo(x1 - 10 * Math.cos(ang + 0.4), y1 - 10 * Math.sin(ang + 0.4));
      ctx.closePath();
      ctx.fill();
    };
    arrow(S.vec, BLUE);
    if (S.showTurn) arrow(S.turned, CARMINE);
    ctx.fillStyle = INK_HEX;
    ctx.beginPath();
    ctx.arc(...P([0, 0]), 3.4, 0, 2 * Math.PI);
    ctx.fill();

    /* the readout card */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the turn, on paper', 22, bandH + 8);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillStyle = BLUE;
    ctx.fillText(
      S.calib
        ? `step (${fmtInt(S.vec[0])}, ${fmtInt(S.vec[1])}) · slope ?`
        : `step (${fmtInt(S.vec[0])}, ${fmtInt(S.vec[1])}) · slope ${S.slope ? slopeText(S.slope) : 'undefined'}`,
      22,
      bandH + 26
    );
    if (S.showTurn) {
      ctx.fillStyle = CARMINE;
      ctx.fillText(
        S.calib
          ? `turned (${fmtInt(S.turned[0])}, ${fmtInt(S.turned[1])}) · slope ?`
          : `turned (${fmtInt(S.turned[0])}, ${fmtInt(S.turned[1])}) · slope ${S.perp ? slopeText(S.perp) : 'undefined'}`,
        22,
        bandH + 44
      );
      ctx.fillStyle = GOLD;
      if (!S.calib) {
        const hs = handshake(S.vec, S.turned);
        ctx.fillText(
          S.slope && S.perp
            ? `product: ${slopeText(S.slope)} · ${slopeText(S.perp)} = ${MINUS}1 · handshake ${fmtInt(hs)}`
            : `product: silent · handshake ${fmtInt(hs)} — still square`,
          22,
          bandH + 62
        );
      }
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
    setStepDial(STEPS[step].dial ? 4 : 0);
    setSPick(null);
    setPPick(null);
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
    setStepDial(current.dial ? 4 : 0);
    setSPick(null);
    setPPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Slope ${sPick ?? 'unruled'}; perpendicular ${pPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Step (${fmtInt(vec[0])}, ${fmtInt(vec[1])}), slope ${slope ? slopeText(slope) : 'undefined'}; turned (${fmtInt(turned[0])}, ${fmtInt(turned[1])}), slope ${perp ? slopeText(perp) : 'undefined'}; handshake ${fmtInt(handshake(vec, turned))}.`;

  return (
    <div className="qtlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Perpendicular Slopes: The Quarter Turn</h1>
        <p className="lede">
          Turn a line’s step (a, b) a quarter turn and it lands on (−b, a): run
          and rise swap, one sign flips. The slopes b/a and −a/b then cancel to
          −1 — <em>the famous rule is the turn written in fraction notation</em>,
          and the turn keeps working even where the rule goes silent.
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
                  <span className="dial-k">the step</span>
                  <span className="dial-v mono">({fmtInt(STEP_SET[stepDial][0])}, {fmtInt(STEP_SET[stepDial][1])})</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={STEP_SET.length - 1}
                  step={1}
                  value={stepDial}
                  onChange={(e) => setStepDial(Number(e.target.value))}
                  aria-label={`Step index, ${stepDial}`}
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
                <span className="target-k">The posted step</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the slope, read</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the turn, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Slope ruling">
                  {SLOPE_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (sPick === c2 ? ' active' : '')}
                      onClick={() => setSPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Perpendicular ruling">
                  {PERP_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (pPick === c2 ? ' active' : '')}
                      onClick={() => setPPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — square as a tile corner'
                    : checks[0]
                      ? 'slope read — now swap, flip one sign, reread'
                      : 'rise over run, reduced'}
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
                  <span className="mono target-hint">the slope · then the turn</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setSPick(null);
                  setPPick(null);
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
                  setSPick(null);
                  setPPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">turn: (a, b) → (−b, a) · slopes b/a and −a/b · product −1</span>{' '}
        &nbsp;·&nbsp; the turn is fundamental; the −1 is its shadow — and the
        handshake a·c + b·d = 0 still speaks where slopes cannot.
      </footer>

      <style jsx>{`
        .qtlab {
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
        :global(.qtlab) :focus-visible {
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
