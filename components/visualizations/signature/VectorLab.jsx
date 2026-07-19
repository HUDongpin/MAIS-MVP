'use client';

/* ============================================================================
   VectorLab — an interactive "bench" for VECTORS: the errand chain.  A
   vector is an ERRAND — go 3 east, 1 north — owned by no starting point.
   Chain two errands tip to tail and the landing spot defines their sum; the
   shortcut arrow that replaces the chain is exactly the componentwise sum
   (3+1, 1+2).  Run the chain in the other order and a parallelogram closes
   around the two routes — commutativity you can see.  (GRADES 9–12 · CCSS
   HSN-VM.A.1–3, B.4–5 — recognize vector quantities with magnitude and
   direction; add vectors tip to tail; multiply by scalars.)

   THE SIGNATURE CENTERPIECE — "THE CHAIN AND THE SHORTCUT."  Blue errand
   arrows chained tip to tail across the grid; the carmine shortcut arrow
   runs straight from the chain's start to its final tip, labeled with its
   exact components.  The gold tally line beneath does the bookkeeping:
   east totals add, north totals add, separately — the deep fact that turns
   geometry into arithmetic.

   THE MODEL — exact integer arithmetic throughout:
     · vectors are integer pairs [x, y]; addV is componentwise; scaleV
       multiplies both parts; negV reverses the errand.
     · mag2Of([x, y]) = x² + y² — magnitudes are compared by exact SQUARED
       length, and the extraction of an actual root is the roots bench's
       craft, cited when √10 appears as a symbol.
     · the audit proves tip-to-tail = componentwise sum by walking the
       chain point by point, commutativity and associativity across the
       integer grid, |k·v|² = k²·|v|², and the cancellation v + (−v) = 0.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No quarter turn, no perpendicularity test — the slope bench owns
       the turn; nothing here rotates.
     · No multiplication of arrows — the complex bench owns arrows that
       multiply; these errands only chain and scale.  No product of two
       vectors of any kind appears on this bench.
     · No slopes — an errand's direction is carried by its components,
       and the line benches keep their rise-over-run.
     · Why x² + y² measures the straight-line reach is the rearrangement
       bench's theorem; it is cited at the moment of use, not re-proved.
   COLORS: one accent. CARMINE = the shortcut arrow, the sum (the object).
   GOLD = the component tally line (the tool). BLUE = quiet errand
   arrows. GREEN only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — two errands are posted.  Rule the sum's components
   first (add east totals and north totals), then rule the sum's squared
   length, exactly.  Truths are derived from addV/mag2Of at answer time;
   the meter is quantized to {0, 50, 100}; the length earns nothing until
   the components stand.  The stamp provably cannot fire falsely.
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
const vecText = ([x, y]) => `(${fmtInt(x)}, ${fmtInt(y)})`;

/* the errand algebra */
const addV = ([a, b], [c, d]) => [a + c, b + d];
const scaleV = (k, [x, y]) => [k * x, k * y];
const negV = ([x, y]) => [-x, -y];
/* squared length — exact; the root itself is another bench's craft */
const mag2Of = ([x, y]) => x * x + y * y;
/* walk a chain of errands from the origin; return every waypoint */
const walkOf = (vs) => {
  const pts = [[0, 0]];
  for (const v of vs) pts.push(addV(pts[pts.length - 1], v));
  return pts;
};

/* the lesson's posted errands */
const V = [3, 1];
const W = [1, 2];

/* ---------------------------------------------------------------------------
   CALIBRATION — posted errand pairs; truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [
  { v: [3, 1], w: [1, 2] },
  { v: [2, 2], w: [1, -1] },
  { v: [1, 3], w: [3, 1] },
  { v: [2, -1], w: [2, 3] },
  { v: [3, 0], w: [0, 4] },
  { v: [1, 1], w: [2, 2] },
];
const SUM_CHIPS = ['(3, 1)', '(3, 3)', '(3, 4)', '(4, 2)', '(4, 3)', '(4, 4)'];
const MAG_CHIPS = ['10', '18', '20', '25', '32'];

const labelOf = (i) => `${vecText(CASES[i].v)} then ${vecText(CASES[i].w)}`;
const sumTruth = (i) => vecText(addV(CASES[i].v, CASES[i].w));
const magTruth = (i) => String(mag2Of(addV(CASES[i].v, CASES[i].w)));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, sPick, mPick) => {
  if (i == null) return [false, false];
  const c1 = sPick === sumTruth(i);
  const c2 = c1 && mPick === magTruth(i);
  return [c1, c2];
};
const closeness = (i, sPick, mPick) => {
  const [c1, c2] = calibChecks(i, sPick, mPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, sPick, mPick) => calibChecks(i, sPick, mPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'An arrow is an errand',
    body:
      'The vector (3, 1) is an instruction: go 3 east, 1 north. Draw it from ' +
      'the origin, from (1, 2), from anywhere — it is the SAME errand.',
    scene: 'free',
    q: 'What makes two drawn arrows the same vector?',
    choices: [
      'Same components — same east, same north — wherever each happens to start',
      'Same starting point',
      'Same length, any direction',
    ],
    answer: 0,
    feedback:
      'A vector owns its displacement and nothing else: (3, 1) is (3, 1) from ' +
      'the origin or from the moon. Length alone is not enough — (3, 1) and ' +
      '(1, 3) reach equally far but run different errands. Components are the ' +
      'whole identity.',
    note:
      'This freedom is what makes the algebra possible: since arrows carry no ' +
      'address, you may slide one to start where another ends — which is the ' +
      'entire trick of the next step. An address would pin the arrow down; ' +
      'freedom from address is what lets arrows cooperate.',
  },
  {
    title: 'Tip to tail',
    body:
      'Run (3, 1), then from its tip run (1, 2). You land at (4, 3). The ' +
      'carmine shortcut from start to landing IS the sum.',
    scene: 'chain',
    q: 'Why do the components simply add — (3+1, 1+2)?',
    choices: [
      'East steps and north steps pile up separately — the two directions never trade, so each total is its own little sum',
      'They don’t; the sum needs the angles',
      'Because both arrows are short',
    ],
    answer: 0,
    feedback:
      'The gold tally line is the proof: all the east in the chain is 3 + 1 ' +
      'regardless of when it happened, and all the north is 1 + 2. Two ' +
      'independent tallies, one landing: (4, 3). Vector addition is geometry ' +
      'on the surface and plain column addition underneath.',
    note:
      'The word "independent" is the treasure here: east cannot leak into ' +
      'north. Every harder vector tool downstream inherits its power from ' +
      'exactly this separation. When a problem hands you tangled directions, ' +
      'components are the untangling.',
  },
  {
    title: 'The other order',
    body: 'Now chain them the other way: (1, 2) first, then (3, 1).',
    scene: 'both',
    q: 'Where do you land?',
    choices: [
      '(4, 3) again — both routes close a parallelogram with one shared tip: addition commutes',
      'Somewhere else — order matters for journeys',
      '(2, −1) — the difference',
    ],
    answer: 0,
    feedback:
      'Both routes land on (4, 3) because both tallies are the same additions ' +
      'in a different order — and integer addition commutes. On the paper the ' +
      'two routes trace the two sides of a parallelogram; the shared landing ' +
      'is its far corner. The classic picture is not an extra fact; it is ' +
      'commutativity, drawn.',
    note:
      'Journeys DO differ — you pass through (3, 1) one way and (1, 2) the ' +
      'other. The sum forgets the route and keeps the destination; that ' +
      'forgetting is what makes it an operation worth having. Operations that ' +
      'remember too much refuse to obey laws.',
  },
  {
    title: 'Scaling and undoing',
    body:
      'Double the errand: 2·(3, 1) = (6, 2), same direction, twice the reach. ' +
      'Reverse it: −(3, 1) = (−3, −1). Chain v with −v.',
    scene: 'scale',
    q: 'v + (−v) = ?',
    choices: [
      '(0, 0) — the stay-home errand: every step east undone by a step west, north by south',
      'A smaller arrow pointing east',
      '2v — reversal doubles',
    ],
    answer: 0,
    feedback:
      'Each component cancels on its own tally line: 3 − 3 = 0 east, 1 − 1 = ' +
      '0 north. The zero vector is a genuine errand — the one that goes ' +
      'nowhere — and it is the additive identity this algebra needs. Scalars ' +
      'stretch (k > 1), shrink (0 < k < 1), or flip (k < 0), always along the ' +
      'same line.',
    note:
      'Note what scaling never does: bend. k·v keeps v’s direction or exactly ' +
      'reverses it. Turning an arrow is a different bench’s business entirely, ' +
      'and this bench does not own a protractor.',
  },
  {
    title: 'How long is an errand?',
    body:
      'The dial scales v = (3, 1) by k. Its squared reach — east² + north², by ' +
      'the rearrangement bench’s theorem — reads 10, then 40, then 90.',
    scene: 'scale',
    dial: true,
    q: 'Scale by k. What happens to the squared length?',
    choices: [
      'It multiplies by k² — |k·v|² = (3k)² + (k)² = k²·10; doubling an errand quadruples its squared reach',
      'It multiplies by k',
      'It stays 10 — length ignores scale',
    ],
    answer: 0,
    feedback:
      'Both components scale by k, both squares by k², so the sum scales by ' +
      'k²: 10, 40, 90 at k = 1, 2, 3 — and 10 again at k = −1, because ' +
      'squares forget the flip. The bench posts squared lengths because they ' +
      'stay exact integers; writing |v| = √10 is the roots bench’s extraction ' +
      'craft, borrowed as a symbol only.',
    note:
      'Compare reaches without any roots: |v|² = 10 beats |w|² = 5 exactly ' +
      'when 10 > 5. For ORDERING lengths, squares are all you ever need — a ' +
      'quiet trick that removes the radical from half of geometry, and this ' +
      'bench leans on it everywhere.',
  },
  {
    title: 'The dispatcher’s stamp',
    body:
      'Two errands are posted, chained on the paper with the shortcut unmarked. ' +
      'Rule the sum’s components first — east totals and north totals, kept ' +
      'strictly separate — then rule the sum’s squared length, exactly. Both ' +
      'exact, or no stamp; the meter reports only how much of the ruling ' +
      'stands.',
    scene: 'chain',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function VectorLab() {
  const [kDial, setKDial] = useState(1);
  const [sPick, setSPick] = useState(null);
  const [mPick, setMPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const v = calib && kase != null ? CASES[kase].v : current.dial ? scaleV(kDial, V) : V;
  const w = calib && kase != null ? CASES[kase].w : W;
  const scene = calib ? 'chain' : current.scene;
  const sum = addV(v, w);
  const mag2 = mag2Of(current.dial && !calib ? v : sum);

  const checks = calib ? calibChecks(kase, sPick, mPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, sPick, mPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, sPick, mPick) : false;

  const bandLabel = calib
    ? `posted: ${kase != null ? labelOf(kase) : ''}`
    : current.dial
      ? `the scaled errand ${fmtInt(kDial)}·(3, 1) = ${vecText(v)}`
      : scene === 'free'
        ? 'one errand, drawn anywhere'
        : `${vecText(v)} then ${vecText(w)}`;
  sceneRef.current = { v, w, sum, mag2, scene, dial: !!current.dial && !calib, calib, bandLabel };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W2 = stage.clientWidth;
    const H2 = stage.clientHeight;
    if (W2 === 0 || H2 === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W2 * dpr);
    canvas.height = Math.round(H2 * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const S = sceneRef.current;
    ctx.clearRect(0, 0, W2, H2);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let gx = gs; gx < W2; gx += gs) {
      ctx.moveTo(Math.round(gx) + 0.5, 0);
      ctx.lineTo(Math.round(gx) + 0.5, H2);
    }
    for (let gy = gs; gy < H2; gy += gs) {
      ctx.moveTo(0, Math.round(gy) + 0.5);
      ctx.lineTo(W2, Math.round(gy) + 0.5);
    }
    ctx.stroke();

    const bandH = 52;
    const u = 34;
    const ox = W2 * 0.3;
    const oy = H2 * 0.68;
    const P = ([x, y]) => [ox + x * u, oy - y * u];

    const arrow = (from, vec, color, width = 3) => {
      const [x0, y0] = P(from);
      const [x1, y1] = P(addV(from, vec));
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;
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

    if (S.scene === 'free') {
      /* the same errand from three starts */
      arrow([0, 0], S.v, BLUE);
      arrow([-2, 2], S.v, BLUE);
      arrow([1, -2], S.v, 'rgba(63,116,166,0.55)');
      ctx.fillStyle = SLATE;
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${vecText(S.v)}, three times`, P([0, 0])[0] + 8, P([0, 0])[1] - 40);
    } else if (S.scene === 'scale') {
      arrow([0, 0], S.v, CARMINE);
      ctx.fillStyle = CARMINE;
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const tip = P(S.v);
      ctx.fillText(vecText(S.v), tip[0] + 8, tip[1]);
    } else {
      /* chain: v then w, plus the shortcut; 'both' adds the other route */
      arrow([0, 0], S.v, BLUE);
      arrow(S.v, S.w, BLUE);
      if (S.scene === 'both') {
        arrow([0, 0], S.w, 'rgba(63,116,166,0.45)');
        arrow(S.w, S.v, 'rgba(63,116,166,0.45)');
      }
      arrow([0, 0], S.sum, CARMINE, 3.4);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 11.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const tip = P(S.sum);
      ctx.fillText(S.calib ? 'the shortcut: ?' : `the shortcut: ${vecText(S.sum)}`, tip[0] + 10, tip[1] - 4);
    }
    /* origin dot */
    ctx.fillStyle = INK_HEX;
    ctx.beginPath();
    ctx.arc(...P([0, 0]), 3.4, 0, 2 * Math.PI);
    ctx.fill();

    /* the component tally line */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the tallies', 22, bandH + 8);
    ctx.font = '600 11.5px ui-monospace, monospace';
    if (S.scene === 'free' || S.scene === 'scale') {
      ctx.fillStyle = GOLD;
      ctx.fillText(`east ${fmtInt(S.v[0])} · north ${fmtInt(S.v[1])}`, 22, bandH + 26);
      ctx.fillStyle = CARMINE;
      ctx.fillText(`squared reach: ${fmtInt(S.v[0])}² + ${fmtInt(S.v[1])}² = ${mag2Of(S.v)}`, 22, bandH + 44);
    } else {
      ctx.fillStyle = GOLD;
      ctx.fillText(
        S.calib
          ? `east: ${fmtInt(S.v[0])} + ${fmtInt(S.w[0])} = ? · north: ${fmtInt(S.v[1])} + ${fmtInt(S.w[1])} = ?`
          : `east: ${fmtInt(S.v[0])} + ${fmtInt(S.w[0])} = ${fmtInt(S.sum[0])} · north: ${fmtInt(S.v[1])} + ${fmtInt(S.w[1])} = ${fmtInt(S.sum[1])}`,
        22,
        bandH + 26
      );
      ctx.fillStyle = CARMINE;
      ctx.fillText(S.calib ? 'squared reach of the sum: ?' : `squared reach of the sum: ${mag2Of(S.sum)}`, 22, bandH + 44);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(S.bandLabel, W2 / 2, bandH / 2);
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
    setKDial(1);
    setSPick(null);
    setMPick(null);
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
    setKDial(1);
    setSPick(null);
    setMPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Sum ${sPick ?? 'unruled'}; squared length ${mPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : current.dial
      ? `The scaled errand ${vecText(v)}: squared reach ${mag2Of(v)}.`
      : scene === 'free'
        ? `The errand ${vecText(v)}, drawn from three different starts — one vector.`
        : `${vecText(v)} then ${vecText(w)}: the shortcut is ${vecText(sum)}, squared reach ${mag2Of(sum)}.`;

  return (
    <div className="velab">
      <header className="head">
        <h1>Vectors: The Errand Chain</h1>
        <p className="lede">
          A vector is an errand — 3 east, 1 north — owned by no starting point.
          Chain errands tip to tail and the shortcut home is the sum, computed by
          <em> two separate tallies: east adds with east, north with north</em>.
          Both orders land on one tip, and squared reach keeps every length exact.
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
                  <span className="dial-k">the scalar k</span>
                  <span className="dial-v mono">{fmtInt(kDial)}</span>
                </div>
                <input
                  type="range"
                  min={-2}
                  max={3}
                  step={1}
                  value={kDial}
                  onChange={(e) => setKDial(Number(e.target.value))}
                  aria-label={`Scalar, ${kDial}`}
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
                <span className="target-k">The posted errands</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the sum, tallied</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the reach², ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Sum ruling">
                  {SUM_CHIPS.map((c2) => (
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
                <div className="declare" role="group" aria-label="Reach ruling">
                  {MAG_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (mPick === c2 ? ' active' : '')}
                      onClick={() => setMPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the chain is dispatched'
                    : checks[0]
                      ? 'sum tallied — now square both parts and add'
                      : 'east with east, north with north'}
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
                  <span className="mono target-hint">the sum · then the reach²</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setSPick(null);
                  setMPick(null);
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
                  setMPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">chain tip to tail · tallies add separately · reach² stays exact</span>{' '}
        &nbsp;·&nbsp; the sum forgets the route and keeps the destination — both
        orders, one tip, one parallelogram.
      </footer>

      <style jsx>{`
        .velab {
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
        :global(.velab) :focus-visible {
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
