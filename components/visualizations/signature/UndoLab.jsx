'use client';

/* ============================================================================
   UndoLab — an interactive "bench" for INVERSE FUNCTIONS IN GENERAL: the
   undo machine.  A function is a PIPELINE of stages — ×2, then +3 — and its
   inverse is the same pipeline run BACKWARD: undo the last stage first,
   each stage by its opposite (−3, then ÷2).  Socks and shoes: what goes on
   last comes off first.  No mirror, no reflected graph — the mirror-line
   picture belongs to the logarithm bench and stays there; this bench owns
   the machinery.  (GRADES 9–12 · CCSS HSF-BF.B.4 — find inverse functions;
   understand that f⁻¹ undoes f, and that some functions have no inverse.)

   THE SIGNATURE CENTERPIECE — "THE CONVEYOR, THERE AND BACK."  A blue
   forward conveyor carries the input left to right through gold stage
   boxes (×2, +3), printing every intermediate value; beneath it the
   carmine undo conveyor runs right to left through the OPPOSITE boxes in
   REVERSE order (−3, ÷2).  Feed 5 forward: 5 → 10 → 13.  Feed 13 back:
   13 → 10 → 5.  The round trip is watched, valuewise, both directions.

   THE MODEL — exact integer arithmetic throughout:
     · a pipeline is f(x) = a·x + b with integer a ≥ 2, b; fwdOf runs the
       stages; invOf(y) ASSERTS (y − b) divisible by a and THROWS otherwise
       — every posted undo lands on an integer.
     · the audit proves both round trips inv(fwd(x)) = x and fwd(inv(y)) =
       y across the grid, and stage-order sensitivity: undoing in the
       WRONG order (÷a then −b) provably fails whenever b is not a
       multiple of a.
     · the jumbler: sq(x) = x² sends 3 and −3 to one output — the audit
       exhibits the collision and proves no function can split it.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No y = x line, no reflected curves, no graph at all — the logarithm
       bench owns the mirror picture; erasing it here is the entire reason
       this bench exists.
     · No window, no principal choice — the arcsin bench repaired one
       famous jumbler by choosing a window; this bench states the general
       law the repair obeys, and cites the repair.
     · No area bills, no grids that move — the matrix bench keeps its
       machine; this conveyor carries numbers, not planes.
     · No solving of equations on the side — undoing IS the solving story
       here, told through stages, not through balance moves.
   COLORS: one accent. CARMINE = the undo conveyor (the object). GOLD =
   the stage boxes (the tool). BLUE = the forward conveyor. GREEN only on
   correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a pipeline is posted.  Rule f(5) first (run the
   conveyor forward), then rule f⁻¹ of a posted target (run it backward,
   last stage first).  Truths are derived from fwdOf/invOf at answer time;
   the meter is quantized to {0, 50, 100}; the undo earns nothing until
   the forward run stands.  The stamp provably cannot fire falsely.
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

/* a pipeline f(x) = a·x + b, run stage by stage */
const fwdStages = (a, b, x) => [x, a * x, a * x + b]; /* input, after ×a, after +b */
const fwdOf = (a, b, x) => a * x + b;
/* the undo: last stage first, each by its opposite — and it must land whole */
const invStages = (a, b, y) => {
  if ((y - b) % a !== 0) throw new Error('every posted undo lands on an integer');
  return [y, y - b, (y - b) / a]; /* target, after −b, after ÷a */
};
const invOf = (a, b, y) => invStages(a, b, y)[2];
/* the wrong-order undo (÷a first): where the classic error leads */
const wrongOrder = (a, b, y) => (y % a === 0 ? y / a - b : null);
/* the jumbler */
const sq = (x) => x * x;

const pipeText = (a, b) =>
  `×${a}, then ${b < 0 ? `${MINUS} ${-b}` : `+ ${b}`}`;
const undoText = (a, b) => `${b < 0 ? `+ ${-b}` : `${MINUS} ${b}`}, then ÷${a}`;

/* ---------------------------------------------------------------------------
   CALIBRATION — posted pipelines; truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [
  { a: 2, b: 3, k: 9 },
  { a: 3, b: -1, k: 8 },
  { a: 2, b: -4, k: 10 },
  { a: 4, b: 1, k: 9 },
  { a: 3, b: 2, k: 11 },
  { a: 5, b: 0, k: 10 },
];
const F_CHIPS = ['6', '13', '14', '17', '21', '25'];
const INV_CHIPS = ['2', '3', '7'];

const labelOf = (i) => `f: ${pipeText(CASES[i].a, CASES[i].b)} · undo the target ${CASES[i].k}`;
const fTruth = (i) => String(fwdOf(CASES[i].a, CASES[i].b, 5));
const invTruth = (i) => String(invOf(CASES[i].a, CASES[i].b, CASES[i].k));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, fPick, iPick) => {
  if (i == null) return [false, false];
  const c1 = fPick === fTruth(i);
  const c2 = c1 && iPick === invTruth(i);
  return [c1, c2];
};
const closeness = (i, fPick, iPick) => {
  const [c1, c2] = calibChecks(i, fPick, iPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, fPick, iPick) => calibChecks(i, fPick, iPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A function is a pipeline',
    body:
      'f(x) = 2x + 3, read as machinery: stage one multiplies by 2, stage two ' +
      'adds 3. Feed in 5 and watch: 5 → 10 → 13.',
    a: 2,
    b: 3,
    mode: 'fwd',
    q: 'What did the pipeline reading buy us?',
    choices: [
      'The formula became a SEQUENCE of simple moves — and sequences can be run backward, move by move',
      'Nothing; 2x + 3 was already clear',
      'A faster way to compute 13',
    ],
    answer: 0,
    feedback:
      'A formula is a lump; a pipeline is a plan. Once f is a sequence of ' +
      'stages, "undo f" stops being mysterious — undo each stage, in the right ' +
      'order, and the whole machine reverses. The rest of this bench is just ' +
      'learning what "the right order" means — and what happens to machines ' +
      'for which no order works.',
    note:
      'Any linear function splits this way: a·x + b is always ×a then +b. ' +
      'Watch the intermediate value 10 — the undo conveyor will need to pass ' +
      'through that exact station, in the opposite direction, on its way home.',
  },
  {
    title: 'Socks and shoes',
    body:
      'Undo f. The LAST stage was +3, so the FIRST undo is −3. Then ÷2. Feed ' +
      'the output 13 backward: 13 → 10 → 5.',
    a: 2,
    b: 3,
    mode: 'both',
    q: 'Why must the undo run in REVERSE order?',
    choices: [
      'The last stage applied is the outermost wrapper — it must come off first, like shoes before socks',
      'Order doesn’t matter for undoing',
      'Because subtraction is easier than division',
    ],
    answer: 0,
    feedback:
      'Try the wrong order on 13: ÷2 first gives 13/2 — not even an integer — ' +
      'and then −3 lands nowhere near 5. The stages wrap the input like ' +
      'layers: ×2 innermost, +3 outermost, and unwrapping runs outside-in. ' +
      'Reverse order, opposite operations: that is the whole algorithm, and it ' +
      'scales to pipelines of any length.',
    note:
      'Check the round trip in both directions: 5 forward to 13, 13 backward ' +
      'to 5 — and also 10 backward through the half-trip. The conveyors agree ' +
      'station by station, not just at the ends.',
  },
  {
    title: 'The undo, written down',
    body:
      'Run a NAME backward: give the output the name y, then y → y − 3 → ' +
      '(y − 3)/2. That expression is the inverse.',
    a: 2,
    b: 3,
    mode: 'both',
    q: 'f⁻¹(y) = (y − 3)/2. What certifies it?',
    choices: [
      'Both round trips: f⁻¹(f(x)) = x and f(f⁻¹(y)) = y — undo-after-do and do-after-undo both cancel',
      'It looks like f with the operations swapped',
      'A table of a few values',
    ],
    answer: 0,
    feedback:
      'The certificate is composition, both ways: (2x + 3 − 3)/2 = x, and ' +
      '2·((y − 3)/2) + 3 = y. One direction alone is not enough in general — ' +
      'the full certificate is always a matched pair of cancellations. The ' +
      'formula (y − 3)/2 is just ' +
      'the undo conveyor written as algebra.',
    note:
      'Notice there is no picture in this step and none was needed: the ' +
      'logarithm bench next door says this very same fact with its own famous ' +
      'picture. ' +
      'Two languages, one fact — this bench deliberately speaks only machinery, ' +
      'so each picture stays owned by one bench.',
  },
  {
    title: 'The jumbler',
    body:
      'New stage: SQUARE. Feed 3 → 9. Feed −3 → 9. Two different inputs, one ' +
      'output.',
    a: 2,
    b: 3,
    mode: 'jumble',
    q: 'Can any machine undo the square stage?',
    choices: [
      'No — an undo machine receiving 9 cannot know which input it came from; the collision destroys the information',
      'Yes — just take the square root',
      'Yes, if the machine is fast enough',
    ],
    answer: 0,
    feedback:
      '"Take the root" smuggles in a choice: √9 = 3 picks the positive branch ' +
      'and silently abandons −3. A function must answer with ONE value, so no ' +
      'function can split a collision. The law: f has an undo exactly when it ' +
      'never sends two inputs to one output.',
    note:
      'The arcsin bench met this exact wall with sine and repaired it by ' +
      'narrowing which inputs it answers for. That repair is the standard ' +
      'trick — shrink the domain until the collisions are gone — and now you ' +
      'know the general law that repair serves.',
  },
  {
    title: 'A family of undos',
    body:
      'The dial changes the pipeline: f(x) = 2x + b. The undo is always ' +
      '−b then ÷2. Watch the round trip of 5 hold at every setting.',
    a: 2,
    b: 3,
    mode: 'both',
    dial: true,
    q: 'What stays true as b sweeps?',
    choices: [
      'The round trip: 5 → 10 + b → back to 5, for every b — the undo recipe adapts and never breaks',
      'The output 13 stays fixed',
      'The undo eventually fails for large b',
    ],
    answer: 0,
    feedback:
      'Every linear pipeline with a nonzero multiplier has an undo, and the ' +
      'recipe writes itself: reverse the order, oppose each stage. The output ' +
      'moves with b (13, 12, 11, …) but the round trip is invariant — 5 comes ' +
      'home at every setting. Existence of the undo depends on injectivity, ' +
      'never on the particular constants.',
    note:
      'The one linear machine with no undo is a = 0: f(x) = b flattens every ' +
      'input to one output — the ultimate jumbler. The multiplier, not the ' +
      'shift, carries the invertibility. One coefficient decides whether the ' +
      'whole machine can ever run in reverse.',
  },
  {
    title: 'The mechanic’s stamp',
    body:
      'A pipeline is posted with a separate target number. Run the machine ' +
      'FORWARD from 5 first and rule f(5); then take the posted target and ' +
      'run it BACKWARD — last stage first, each stage by its opposite — and ' +
      'rule the undo. Both exact, or no stamp; the meter reports only how ' +
      'much of the ruling stands.',
    a: 2,
    b: 3,
    mode: 'both',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function UndoLab() {
  const [bDial, setBDial] = useState(3);
  const [fPick, setFPick] = useState(null);
  const [iPick, setIPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const a = calib && kase != null ? CASES[kase].a : current.a;
  const b = calib && kase != null ? CASES[kase].b : current.dial ? bDial : current.b;
  const target = calib && kase != null ? CASES[kase].k : fwdOf(a, b, 5);
  const fwd = fwdStages(a, b, 5);
  const mode = calib ? 'both' : current.mode;

  const checks = calib ? calibChecks(kase, fPick, iPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, fPick, iPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, fPick, iPick) : false;

  const bandLabel = calib
    ? `posted: ${kase != null ? labelOf(kase) : ''}`
    : mode === 'jumble'
      ? 'the square stage — two inputs, one output'
      : `the pipeline f: ${pipeText(a, b)}`;
  sceneRef.current = { a, b, target, fwd, mode, calib, bandLabel };

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
    const boxW = 92;
    const gap = (W - 3 * 70 - 2 * boxW) / 2;
    const xs = [60, 60 + 70 + gap / 2, W / 2, W / 2 + 70 + gap / 2, W - 130];

    const stationRow = (y, values, boxes, color, rightToLeft) => {
      /* three value stations with two op boxes between */
      const px = [80, W / 2, W - 110];
      const seq = rightToLeft ? [2, 1, 0] : [0, 1, 2];
      /* values */
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = color;
        ctx.font = '700 15px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(values[i] == null ? '?' : fmtInt(values[i]), px[i], y);
      }
      /* op boxes + arrows */
      for (let i = 0; i < 2; i++) {
        const xm = (px[i] + px[i + 1]) / 2;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.strokeRect(xm - 34, y - 16, 68, 32);
        ctx.fillStyle = INK_HEX;
        ctx.font = '600 11.5px ui-monospace, monospace';
        ctx.fillText(boxes[i], xm, y);
        /* arrow direction */
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        const [xa, xb] = rightToLeft ? [xm + 52, xm + 40] : [xm - 52, xm - 40];
        ctx.beginPath();
        ctx.moveTo(rightToLeft ? px[i + 1] + 24 : px[i] + 24, y);
        ctx.lineTo(rightToLeft ? xm + 36 : xm - 36, y);
        ctx.stroke();
      }
    };

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';

    if (S.mode === 'jumble') {
      ctx.fillText('the square stage', 22, bandH + 8);
      /* two inputs converge on one output */
      const y1 = bandH + 90;
      const y2 = bandH + 170;
      const ym = (y1 + y2) / 2;
      ctx.font = '700 15px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = BLUE;
      ctx.fillText('3', 100, y1);
      ctx.fillText(`${MINUS}3`, 100, y2);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 44, ym - 18, 88, 36);
      ctx.fillStyle = INK_HEX;
      ctx.font = '600 12px ui-monospace, monospace';
      ctx.fillText('square', W / 2, ym);
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(120, y1);
      ctx.lineTo(W / 2 - 48, ym - 8);
      ctx.moveTo(120, y2);
      ctx.lineTo(W / 2 - 48, ym + 8);
      ctx.stroke();
      ctx.fillStyle = CARMINE;
      ctx.font = '700 15px ui-monospace, monospace';
      ctx.fillText('9', W / 2 + 90, ym);
      ctx.strokeStyle = CARMINE;
      ctx.beginPath();
      ctx.moveTo(W / 2 + 48, ym);
      ctx.lineTo(W / 2 + 72, ym);
      ctx.stroke();
      ctx.fillStyle = SLATE;
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillText('one output — the trail back is gone', W / 2, ym + 54);
    } else {
      ctx.fillText('forward, left to right', 22, bandH + 8);
      stationRow(bandH + 60, S.calib ? [5, null, null] : S.fwd, [`×${S.a}`, S.b < 0 ? `${MINUS} ${-S.b}` : `+ ${S.b}`], BLUE, false);
      if (S.mode === 'both') {
        ctx.fillStyle = SLATE;
        ctx.font = 'italic 600 11.5px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('the undo, right to left — last stage first', 22, bandH + 130);
        let undoVals;
        if (S.calib) {
          undoVals = [null, null, S.target];
        } else {
          const st = invStages(S.a, S.b, S.target);
          undoVals = [st[2], st[1], st[0]];
        }
        stationRow(
          bandH + 182,
          undoVals,
          [`÷${S.a}`, S.b < 0 ? `+ ${-S.b}` : `${MINUS} ${S.b}`],
          CARMINE,
          true
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
    setBDial(3);
    setFPick(null);
    setIPick(null);
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
    setBDial(3);
    setFPick(null);
    setIPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Forward ${fPick ?? 'unruled'}; undo ${iPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : mode === 'jumble'
      ? 'The square stage: 3 and minus 3 both land on 9 — the trail back is gone.'
      : `The pipeline times ${a} then ${b < 0 ? 'minus ' + -b : 'plus ' + b}: forward 5, ${a * 5}, ${fwdOf(a, b, 5)}${mode === 'both' ? `; the undo returns ${target}, ${target - b}, ${invOf(a, b, target)}` : ''}.`;

  return (
    <div className="unlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Inverse Functions: The Undo Machine</h1>
        <p className="lede">
          Read f(x) = 2x + 3 as machinery — ×2, then +3 — and the inverse stops
          being mysterious: run the pipeline backward, <em>last stage first,
          each stage by its opposite</em>. No borrowed pictures anywhere; and when a
          stage jumbles two inputs into one output, no machine can undo it.
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
                  <span className="dial-k">the shift b</span>
                  <span className="dial-v mono">{fmtInt(bDial)}</span>
                </div>
                <input
                  type="range"
                  min={-3}
                  max={3}
                  step={1}
                  value={bDial}
                  onChange={(e) => setBDial(Number(e.target.value))}
                  aria-label={`Shift, ${bDial}`}
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
                <span className="target-k">The posted pipeline</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} forward from 5</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the target, undone</li>
                </ol>
                <div className="declare" role="group" aria-label="Forward ruling">
                  {F_CHIPS.map((c2) => (
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
                <div className="declare" role="group" aria-label="Undo ruling">
                  {INV_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (iPick === c2 ? ' active' : '')}
                      onClick={() => setIPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the machine reverses'
                    : checks[0]
                      ? 'forward done — now last stage first'
                      : '×a first, then the shift'}
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
                  <span className="mono target-hint">forward · then the undo</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setFPick(null);
                  setIPick(null);
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
                  setFPick(null);
                  setIPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">reverse the order · oppose each stage · collisions forfeit the undo</span>{' '}
        &nbsp;·&nbsp; socks and shoes, run backward — and both round trips are the
        certificate.
      </footer>

      <style jsx>{`
        .unlab {
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
        :global(.unlab) :focus-visible {
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
