'use client';

/* ============================================================================
   MatrixLab — an interactive "bench" for MATRICES AS TRANSFORMATIONS:
   the machine that moves the grid.  A 2×2 matrix is completely described by
   two columns — where the east errand (1,0) and the north errand (0,1) are
   sent.  Every other point follows by recombination: M·(x, y) = x·(first
   column) + y·(second column).  The unit square rides to a parallelogram,
   and the AREA BILL is det = ad − bc, exactly: 6 for the stretch, 1 for the
   shear (distortion without loss), 0 for the collapse, negative when the
   plane is flipped.  (GRADES 9–12 · CCSS HSN-VM.C.6–12, HSA-REI.C.8–9 —
   work with matrices as transformations of the plane; the determinant as
   area; singular matrices.)

   THE SIGNATURE CENTERPIECE — "THE TWO COLUMNS AND THE AREA BILL."  The
   unit square stands quiet in blue; the machine's image parallelogram
   stands in carmine, spanned by the two column arrows.  The gold bill
   prints det = ad − bc with its sign read aloud: positive keeps the
   plane's handedness, negative flips it, zero collapses everything onto
   a line — and a collapsed plane cannot be un-collapsed.

   THE MODEL — exact integer arithmetic throughout:
     · a matrix is [[a, b], [c, d]] (rows); its columns (a, c) and (b, d)
       are the images of east and north.
     · applyM recombines columns; detOf = a·d − b·c; the audit verifies
       |det| against the shoelace area of the column parallelogram for
       every matrix in a grid sweep, and linearity M(u + v) = Mu + Mv.
     · verdictOf reads det: nonzero same-handed, nonzero flipped, or
       collapsed — and the audit proves collapse happens exactly when the
       columns are parallel (one a scalar copy of the other).

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · Vectors themselves — what an arrow is, how arrows add — are the
       errand bench's lesson, cited once; here arrows are only inputs and
       outputs of the machine.
     · No solving of systems, no elimination — the systems benches own
       finding where equations meet; this bench studies the machine, not
       its inverse problems, and stops at "det 0 forfeits the undo."
     · No rotation formulas, no angles — the turn belongs elsewhere; even
       the flip matrix here is read by its columns, not by degrees.
     · No 3×3, no cofactors — one size, fully seen, beats generality.
   COLORS: one accent. CARMINE = the image parallelogram (the object).
   GOLD = the area bill (the tool). BLUE = the quiet unit square. GREEN
   only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a machine is posted.  Rule det = ad − bc first, then
   rule the verdict: keeps the plane same-handed, keeps it flipped, or
   collapses it.  Truths are derived from detOf/verdictOf at answer time;
   the meter is quantized to {0, 50, 100}; the verdict earns nothing until
   the bill stands.  The stamp provably cannot fire falsely.
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

/* a machine is [[a, b], [c, d]]; its columns are where east and north go */
const colsOf = (M) => [
  [M[0][0], M[1][0]],
  [M[0][1], M[1][1]],
];
const applyM = (M, [x, y]) => [M[0][0] * x + M[0][1] * y, M[1][0] * x + M[1][1] * y];
/* the area bill, signed */
const detOf = (M) => M[0][0] * M[1][1] - M[0][1] * M[1][0];
const verdictOf = (M) => {
  const d = detOf(M);
  return d > 0 ? 'keeps, same-handed' : d < 0 ? 'keeps, flipped' : 'collapses to a line';
};
const matText = (M) => `[${M[0][0]} ${M[0][1]} / ${M[1][0]} ${M[1][1]}]`;

/* the lesson's machines */
const MACHINES = {
  stretch: { label: 'the stretch', M: [[2, 0], [0, 3]] },
  shear: { label: 'the shear', M: [[1, 1], [0, 1]] },
  mix: { label: 'the mixer', M: [[2, 1], [1, 2]] },
  swap: { label: 'the hand-swap', M: [[0, 1], [1, 0]] },
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted machines; truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [
  [[2, 0], [0, 3]],
  [[1, 1], [0, 1]],
  [[2, 1], [1, 2]],
  [[1, 2], [2, 4]],
  [[0, 1], [1, 0]],
  [[1, 3], [2, 1]],
];
const DET_CHIPS = [MINUS + '5', MINUS + '1', '0', '1', '3', '6'];
const VERDICT_CHIPS = ['keeps, same-handed', 'keeps, flipped', 'collapses to a line'];

const labelOf = (i) => matText(CASES[i]);
const detTruth = (i) => fmtInt(detOf(CASES[i]));
const verdictTruth = (i) => verdictOf(CASES[i]);

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, dPick, vPick) => {
  if (i == null) return [false, false];
  const c1 = dPick === detTruth(i);
  const c2 = c1 && vPick === verdictTruth(i);
  return [c1, c2];
};
const closeness = (i, dPick, vPick) => {
  const [c1, c2] = calibChecks(i, dPick, vPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, dPick, vPick) => calibChecks(i, dPick, vPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A machine is two columns',
    body:
      'The machine [2 0 / 0 3] is fully described by two answers: east (1, 0) ' +
      'is sent to (2, 0), and north (0, 1) is sent to (0, 3). Those are its ' +
      'COLUMNS, and they are about to do all the work.',
    machine: 'stretch',
    q: 'Why do two columns pin down the whole machine?',
    choices: [
      'Every point is built from east and north steps — send those two, and linearity decides everyone else',
      'They don’t; each point needs its own rule',
      'Because 2 × 2 matrices have four entries',
    ],
    answer: 0,
    feedback:
      'The errand bench showed every arrow is x easts plus y norths. A linear ' +
      'machine respects that recipe: M·(x, y) = x·(first column) + y·(second ' +
      'column). Two answers, infinitely many consequences — the unit square ' +
      'here rides to a 2-by-3 rectangle, and every other point in the plane ' +
      'follows suit without being asked.',
    note:
      'Read a matrix column-first forever after: the first column is a ' +
      'PICTURE of where east lands, the second of where north lands. The four ' +
      'numbers are two arrows in disguise, and the machine keeps no secrets ' +
      'beyond them.',
  },
  {
    title: 'Everyone follows the columns',
    body:
      'Apply the stretch to (2, 1): M·(2, 1) = 2·(2, 0) + 1·(0, 3) = (4, 3). ' +
      'Recombine the columns — that is the whole computation.',
    machine: 'stretch',
    q: 'M·(2, 1) for the stretch [2 0 / 0 3] = ?',
    choices: [
      '(4, 3) — two copies of the east-image plus one copy of the north-image',
      '(2, 3) — the diagonal entries',
      '(4, 1) — only east stretches',
    ],
    answer: 0,
    feedback:
      'Column recombination is matrix multiplication, seen honestly: 2 copies ' +
      'of (2, 0) plus 1 copy of (0, 3) lands at (4, 3). The rows-times-columns ' +
      'drill computes exactly this — the drill is bookkeeping, the columns are ' +
      'the meaning. Once the columns feel like pictures, the drill stops ' +
      'being memorable and starts being obvious.',
    note:
      'Linearity is the machine’s promise: M(u + v) = Mu + Mv, always. ' +
      'Machines that keep this promise are rare and precious — most rules in ' +
      'the world do not. Doubling an input rarely doubles an outcome out ' +
      'there; linear machines are the ones for which it always does.',
  },
  {
    title: 'The shear: distortion without loss',
    body:
      'The shear [1 1 / 0 1] sends east to (1, 0) — untouched — and north to ' +
      '(1, 1), a lean. The square becomes a slanted parallelogram.',
    machine: 'shear',
    q: 'The square looks squashed. What is its image’s area?',
    choices: [
      'Exactly 1, unchanged — det = 1·1 − 1·0 = 1; the lean redistributes area without creating or destroying it',
      'Less than 1 — squashing loses area',
      'More than 1 — the slant adds length',
    ],
    answer: 0,
    feedback:
      'The bill says 1 and the bill is exact: base 1, height 1, area 1, ' +
      'however far the top leans. Shears shuffle the plane sideways layer by ' +
      'layer — the eye reads loss, the determinant reads the truth. Trust ' +
      'instruments over impressions when the two disagree.',
    note:
      'This is why det, not appearance, is the machine’s honest size stamp: it ' +
      'measures the area factor applied to EVERY region, not just the square ' +
      'you happened to draw. One patch or the whole plane, the multiplier ' +
      'never wavers.',
  },
  {
    title: 'The bill in general',
    body:
      'The mixer [2 1 / 1 2]: east to (2, 1), north to (1, 2). The columns ' +
      'span a parallelogram, and det = 2·2 − 1·1 = 3.',
    machine: 'mix',
    q: 'What does det = 3 assert, exactly?',
    choices: [
      'Every region’s area is multiplied by exactly 3 — the column parallelogram itself has area 3',
      'The machine moves points 3 units',
      'The matrix has 3 nonzero entries',
    ],
    answer: 0,
    feedback:
      'ad − bc = 4 − 1 = 3, and the parallelogram spanned by (2, 1) and ' +
      '(1, 2) encloses exactly 3 unit squares — the audit checks this against ' +
      'the shoelace count. One number bills every patch of the plane at once: ' +
      'triple, everywhere, exactly.',
    note:
      'The sign is information too: the hand-swap [0 1 / 1 0] has det = −1 — ' +
      'areas preserved, handedness reversed, the plane turned over like a ' +
      'page. Positive keeps the page face-up — area answers how much; sign ' +
      'answers which way up.',
  },
  {
    title: 'The collapse',
    body:
      'The dial bends the mixer: [2 1 / t 2], det = 4 − t. Watch the ' +
      'parallelogram thin as t climbs.',
    machine: 'mix',
    dial: true,
    q: 'At t = 4, det = 0. What has the machine done?',
    choices: [
      'Collapsed the plane onto a line — the columns became parallel, all area is gone, and no machine can undo it',
      'Nothing special; 0 is just small',
      'Reversed the plane’s handedness',
    ],
    answer: 0,
    feedback:
      'At t = 4 the columns are (2, 4) and (1, 2) — one is twice the other, ' +
      'so both images lie on one line and every square is flattened to ' +
      'nothing. Information is destroyed: two different points can land ' +
      'together, so no inverse machine exists. det = 0 is not "small"; it is ' +
      'the exact boundary where undoing dies — and the systems benches ' +
      'inherit that boundary whenever their equations go singular.',
    note:
      'Past the collapse (t = 5, 6) the bill goes negative: the plane ' +
      'reappears, flipped. The dial crosses zero the way a folding page ' +
      'passes through its own spine. Zero is the crease, and everything ' +
      'interesting about invertibility happens at that crease.',
  },
  {
    title: 'The assessor’s stamp',
    body:
      'A machine is posted, its columns drawn and its bill unpaid. Rule the ' +
      'area bill first — det = ad − bc, sign and all — then rule the verdict ' +
      'its sign dictates: same-handed, flipped, or collapsed. Both exact, or ' +
      'no stamp; the meter reports only how much of the ruling stands.',
    machine: 'mix',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function MatrixLab() {
  const [tDial, setTDial] = useState(1);
  const [dPick, setDPick] = useState(null);
  const [vPick, setVPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const M = calib && kase != null ? CASES[kase] : current.dial ? [[2, 1], [tDial, 2]] : MACHINES[current.machine].M;
  const det = detOf(M);
  const verdict = verdictOf(M);
  const cols = colsOf(M);

  const checks = calib ? calibChecks(kase, dPick, vPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, dPick, vPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, dPick, vPick) : false;

  const bandLabel = calib
    ? `posted: ${kase != null ? labelOf(kase) : ''}`
    : current.dial
      ? `the bent mixer [2 1 / ${fmtInt(tDial)} 2]`
      : `${MACHINES[current.machine].label} ${matText(M)}`;
  sceneRef.current = { M, det, verdict, cols, calib, bandLabel };

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
    const u = 44;
    const ox = W * 0.34;
    const oy = H2 * 0.66;
    const P = ([x, y]) => [ox + x * u, oy - y * u];

    /* the quiet unit square */
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(P([0, 1])[0], P([0, 1])[1], u, u);

    /* the image parallelogram, spanned by the columns */
    const [c1, c2] = S.cols;
    const quad = [[0, 0], c1, [c1[0] + c2[0], c1[1] + c2[1]], c2];
    ctx.fillStyle = 'rgba(200,30,79,0.15)';
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(...P(quad[0]));
    for (let i = 1; i < 4; i++) ctx.lineTo(...P(quad[i]));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    /* the column arrows */
    const arrow = (vec, color, lbl) => {
      const [x0, y0] = P([0, 0]);
      const [x1, y1] = P(vec);
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
      ctx.lineTo(x1 - 9 * Math.cos(ang - 0.4), y1 - 9 * Math.sin(ang - 0.4));
      ctx.lineTo(x1 - 9 * Math.cos(ang + 0.4), y1 - 9 * Math.sin(ang + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.font = '600 10.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(lbl, x1 + 6, y1 - 2);
    };
    arrow(c1, CARMINE, `east → (${fmtInt(c1[0])}, ${fmtInt(c1[1])})`);
    arrow(c2, CARMINE, `north → (${fmtInt(c2[0])}, ${fmtInt(c2[1])})`);

    /* the area bill */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the area bill', 22, bandH + 8);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillStyle = GOLD;
    const [[a, b], [c, d]] = S.M;
    ctx.fillText(
      S.calib
        ? `det = ${fmtInt(a)}·${fmtInt(d)} ${MINUS} ${fmtInt(b)}·${fmtInt(c)} = ?`
        : `det = ${fmtInt(a)}·${fmtInt(d)} ${MINUS} ${fmtInt(b)}·${fmtInt(c)} = ${fmtInt(S.det)}`,
      22,
      bandH + 26
    );
    ctx.fillStyle = CARMINE;
    ctx.fillText(S.calib ? 'the verdict: ?' : `the verdict: ${S.verdict}`, 22, bandH + 44);

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
    setTDial(1);
    setDPick(null);
    setVPick(null);
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
    setTDial(1);
    setDPick(null);
    setVPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Det ${dPick ?? 'unruled'}; verdict ${vPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${bandLabel}: east lands on (${fmtInt(cols[0][0])}, ${fmtInt(cols[0][1])}), north on (${fmtInt(cols[1][0])}, ${fmtInt(cols[1][1])}); det ${fmtInt(det)} — ${verdict}.`;

  return (
    <div className="mxlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Matrices: The Machine That Moves the Grid</h1>
        <p className="lede">
          A 2×2 matrix is two answers — where east lands, where north lands —
          and every other point follows by recombining those columns. The area
          bill det = ad − bc is exact: <em>1 for the shear that only leans, 0
          for the collapse that cannot be undone, negative for the flip</em>.
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
                  <span className="dial-k">the bend t</span>
                  <span className="dial-v mono">{fmtInt(tDial)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={tDial}
                  onChange={(e) => setTDial(Number(e.target.value))}
                  aria-label={`Bend, ${tDial}`}
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
                <span className="target-k">The posted machine</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the bill, computed</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the verdict, read</li>
                </ol>
                <div className="declare" role="group" aria-label="Det ruling">
                  {DET_CHIPS.map((c2) => (
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
                <div className="declare" role="group" aria-label="Verdict ruling">
                  {VERDICT_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (vPick === c2 ? ' active' : '')}
                      onClick={() => setVPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the machine is assessed'
                    : checks[0]
                      ? 'bill computed — now read its sign'
                      : 'ad − bc, sign and all'}
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
                  <span className="mono target-hint">the bill · then the verdict</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setDPick(null);
                  setVPick(null);
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
                  setVPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">two columns pin the machine · det = ad − bc bills every region</span>{' '}
        &nbsp;·&nbsp; the shear leans and loses nothing, the collapse forfeits the
        undo, and the sign remembers the handedness.
      </footer>

      <style jsx>{`
        .mxlab {
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
        :global(.mxlab) :focus-visible {
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
