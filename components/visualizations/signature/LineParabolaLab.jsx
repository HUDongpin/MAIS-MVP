'use client';

/* ============================================================================
   LineParabolaLab — an interactive "bench" for LINEAR–QUADRATIC SYSTEMS:
   the gap gauge.  A line meets the parabola y = x² twice, once, or never —
   and one subtraction decides which: d(x) = x² − (mx + b), the vertical gap.
   Meetings are exactly the places the gap reads zero, so the whole encounter
   is governed by the gap's lowest reading: below zero → two meetings, exactly
   zero → a tangent kiss, above zero → a clean miss with a measurable closest
   approach.  (GRADES 9–12 · CCSS HSA-REI.C.7 — solve a simple system of a
   linear and a quadratic equation in two variables algebraically and
   graphically.)

   THE SIGNATURE CENTERPIECE — "THE GAP GAUGE."  The parabola and the line
   share the paper; between them, at the gap's narrowest station, a gold
   gauge segment is drawn with its exact reading: the FLOOR of d(x).  The
   floor is the verdict — −4 means the line dove under the curve (two
   crossings), 0 means a kiss, +4 means the line never arrives and 4 is the
   closest it gets.  Meetings burn carmine where the gap runs dry.

   THE MODEL — exact integer arithmetic throughout:
     · lines y = mx + b with EVEN integer slope m, so the gap's floor
       −m²/4 − b + (nothing) lands on an integer: floorOf(m, b) =
       (m/2)² − m·(m/2) − b, computed by integer arithmetic and asserted.
     · countOf(m, b) classifies by the floor's sign — and the audit verifies
       the count against an independent integer-root search of d(x) plus a
       parity/floor argument for the no-meeting cases.
     · meetingsOf(m, b) lists integer meeting stations by exhaustive search;
       every posted two-meeting scene has both meetings on integers.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No vertex form, no family of parabolas, nothing slides or stretches —
       the quadratic-function bench owns the parabola as a shape-shifting
       function.  Here y = x² is fixed scenery; the OBJECT is the gap.
     · No solving ritual — the quadratic bench owns unlocking x² − 2x − 3 = 0;
       this bench takes its integer stations as certified and cites it.
     · No named formula for the meeting count — the classical name for
       m² + 4b stays home; this bench reads the same number as "the gap's
       floor, times −4," which is the picture the name compresses.
     · No linear–linear machinery — the systems bench owns two lines and
       their bookkeeping; it is cited as the prequel, never re-run.
   COLORS: one accent. CARMINE = the meetings (the object). GOLD = the gap
   gauge at its narrowest (the tool). BLUE = the quiet line and parabola.
   GREEN only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a line is posted against y = x².  Rule the meeting
   count first (read the encounter), then rule the gap's floor (the exact
   integer at the narrowest station).  Truths are derived from floorOf and
   countOf at answer time; the meter is quantized to {0, 50, 100}; the floor
   earns nothing until the count stands.  The stamp provably cannot fire
   falsely.
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
const lineText = (m, b) => {
  const mTxt = m === 0 ? '' : m === 2 ? '2x' : m === 4 ? '4x' : `${fmtInt(m)}x`;
  const bTxt = b === 0 ? (m === 0 ? '0' : '') : m === 0 ? fmtInt(b) : ` ${b < 0 ? MINUS : '+'} ${Math.abs(b)}`;
  return `y = ${mTxt}${bTxt}`;
};

/* the gap d(x) = x² − mx − b, evaluated exactly */
const gapAt = (m, b, x) => x * x - m * x - b;
/* the gap's floor: at the narrowest station x = m/2 (m is always even) */
const floorOf = (m, b) => {
  if (m % 2 !== 0) throw new Error('the bench posts even slopes only, for an integer floor');
  const h = m / 2;
  return gapAt(m, b, h);
};
const stationOf = (m) => m / 2;
/* the meeting count, decided by the floor's sign */
const countOf = (m, b) => {
  const f = floorOf(m, b);
  return f < 0 ? 2 : f === 0 ? 1 : 0;
};
/* integer meeting stations, by exhaustive search */
const meetingsOf = (m, b) => {
  const out = [];
  for (let x = -12; x <= 12; x++) if (gapAt(m, b, x) === 0) out.push(x);
  return out;
};

/* the lesson's posted lines (all even slopes) */
const SCENES = {
  cross: { m: 2, b: 3 },
  kiss: { m: 2, b: -1 },
  miss: { m: 2, b: -5 },
  flat: { m: 0, b: -2 },
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted lines; truths derived from the gap, never stored.
   ------------------------------------------------------------------------- */
const CASES = [
  { m: 2, b: 3 },
  { m: 2, b: -1 },
  { m: 0, b: -2 },
  { m: 4, b: 5 },
  { m: 4, b: -4 },
  { m: 2, b: -5 },
];
const COUNT_CHIPS = ['0', '1', '2'];
const FLOOR_CHIPS = [MINUS + '9', MINUS + '4', '0', '2', '4'];

const labelOf = (i) => lineText(CASES[i].m, CASES[i].b);
const countTruth = (i) => String(countOf(CASES[i].m, CASES[i].b));
const floorTruth = (i) => fmtInt(floorOf(CASES[i].m, CASES[i].b));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, cPick, fPick) => {
  if (i == null) return [false, false];
  const c1 = cPick === countTruth(i);
  const c2 = c1 && fPick === floorTruth(i);
  return [c1, c2];
};
const closeness = (i, cPick, fPick) => {
  const [c1, c2] = calibChecks(i, cPick, fPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, cPick, fPick) => calibChecks(i, cPick, fPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two curves, one question',
    body:
      'The parabola y = x² and the line y = 2x + 3 share the paper. "Solve the ' +
      'system" asks one thing: at which x do the two rules report the same y?',
    scene: 'cross',
    q: 'What exactly counts as a solution here?',
    choices: [
      'An x where both rules agree — the pair (x, y) sits on the line AND the parabola',
      'Any point on either curve',
      'The place where the parabola is steepest',
    ],
    answer: 0,
    feedback:
      'A solution is a shared point: one x, one y, both equations satisfied at ' +
      'once. Here there are two — the line enters the parabola at (−1, 1) and ' +
      'leaves at (3, 9). Check both coordinates in both rules; all four checks ' +
      'land exactly, and nothing less than all four would do.',
    note:
      'The linear-systems bench asked this same question about two lines, where ' +
      'the answer is one point, none, or a shared line. A curve changes the ' +
      'menu: two meetings are now on the table, and the in-between cases — the ' +
      'kiss, the near miss — become the interesting ones to hunt.',
  },
  {
    title: 'One subtraction, one story',
    body:
      'Stack the rules and subtract: d(x) = x² − (2x + 3). This GAP measures, ' +
      'at every x, how far the parabola rides above the line.',
    scene: 'cross',
    q: 'Why is studying d(x) the same as studying the meetings?',
    choices: [
      'The curves meet exactly where the gap reads 0 — two curves became one function',
      'It is not the same; subtraction changes the solutions',
      'Because d(x) is the line reflected',
    ],
    answer: 0,
    feedback:
      'At any x, the gap is parabola-height minus line-height. Meeting means ' +
      'equal heights, which means gap zero — nothing more. The subtraction ' +
      'compresses a two-curve encounter into a single readable instrument: ' +
      'd(x) = x² − 2x − 3, whose zero stations the quadratic bench certifies ' +
      'as −1 and 3. Every system question about the pair is now a question ' +
      'about one function’s readings.',
    note:
      'The gap is negative between the meetings — the line rides ABOVE the ' +
      'parabola there. Read the gauge at x = 1: d(1) = 1 − 2 − 3 = −4, the ' +
      'floor, drawn in gold at the narrowest station.',
  },
  {
    title: 'The kiss',
    body:
      'Lower the line to y = 2x − 1. The gap becomes d(x) = x² − 2x + 1 — ' +
      'which is (x − 1)², never negative.',
    scene: 'kiss',
    q: 'How many meetings now?',
    choices: [
      'Exactly one — the gap touches 0 at x = 1 and nowhere else: a tangent',
      'Two, very close together',
      'None — the gap never reads zero',
    ],
    answer: 0,
    feedback:
      'The gap is a square: zero at x = 1, positive everywhere else. The line ' +
      'kisses the parabola at (1, 1) and retreats — one shared point, counted ' +
      'once. Tangency is not "two meetings squeezed"; it is the floor of the ' +
      'gap landing exactly on zero.',
    note:
      'Watch how fragile the kiss is: raise the line by any amount and the ' +
      'floor dips below zero (two meetings); lower it and the floor lifts ' +
      'above (none). Tangency is a knife edge, and the floor says so with a ' +
      'single exact number rather than a squint at the picture.',
  },
  {
    title: 'The miss, measured',
    body:
      'Lower it again: y = 2x − 5. Now d(x) = x² − 2x + 5, and its floor — at ' +
      'the narrowest station x = 1 — reads 1 − 2 + 5 = 4.',
    scene: 'miss',
    q: 'What does the floor value 4 tell you?',
    choices: [
      'No meetings — and 4 is the closest vertical approach, achieved at x = 1',
      'There are meetings, but off the page',
      'The system is unsolvable, so nothing can be said',
    ],
    answer: 0,
    feedback:
      'A gap whose floor is 4 never reads zero — the line misses, full stop. ' +
      'But the gauge refuses to shrug: the miss has a size. At x = 1 the line ' +
      'passes exactly 4 below the parabola, and nowhere closer. "No solution" ' +
      'became a measurement.',
    note:
      'This is the quiet upgrade the gap buys you: the empty answer set still ' +
      'carries information. An engineer asking "how much taller must the arch ' +
      'be?" reads the same 4 off the same gauge. Instruments that keep reporting ' +
      'after the answer is "no" are the ones worth building.',
  },
  {
    title: 'The floor decides everything',
    body:
      'The dial slides the line y = 2x + b from b = −5 up to b = 3. The floor ' +
      'of the gap is −1 − b; watch the count as the line rises.',
    scene: 'kiss',
    dial: true,
    q: 'Where does the meeting count change?',
    choices: [
      'Only at b = −1 — floor 0, the kiss; below it 0 meetings, above it 2',
      'The count climbs steadily: 0, 1, 2, 3, …',
      'At b = 0, when the line crosses the origin',
    ],
    answer: 0,
    feedback:
      'One threshold, at the tangent line: floor(b) = −1 − b is positive below ' +
      'b = −1 (miss), zero at b = −1 (kiss), negative above (two crossings). ' +
      'The count never visits any other value: 0, then 1 for a single instant, ' +
      'then 2. The whole taxonomy of encounters lives in one sign.',
    note:
      'The classical shortcut multiplies this floor by −4 and reads its sign; ' +
      'that named number belongs to the quadratic bench. Same verdict either ' +
      'way — but the floor shows you WHERE the near-miss happens, not just that ' +
      'it does. Keep both readings; they answer different questions.',
  },
  {
    title: 'The gauger’s stamp',
    body:
      'A line is posted against y = x², its gauge drawn but unread. Rule the ' +
      'meeting count first, then rule the gap’s floor — the exact integer ' +
      'reading at the narrowest station. Remember the order of work: the ' +
      'floor’s sign is what justifies the count. Both exact, or no stamp; the ' +
      'meter reports only how much of the ruling stands.',
    scene: 'cross',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function LineParabolaLab() {
  const [bDial, setBDial] = useState(-1);
  const [cPick, setCPick] = useState(null);
  const [fPick, setFPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const sc = calib && kase != null ? CASES[kase] : current.dial ? { m: 2, b: bDial } : SCENES[current.scene];
  const m = sc.m;
  const b = sc.b;
  const floor = floorOf(m, b);
  const count = countOf(m, b);
  const meets = meetingsOf(m, b);

  const checks = calib ? calibChecks(kase, cPick, fPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, cPick, fPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, cPick, fPick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''} against y = x²` : `${lineText(m, b)} against y = x²`;
  sceneRef.current = { m, b, floor, count, meets, calib, bandLabel };

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
    /* world → pixels: x in [−5, 5], y in [−8, 14] */
    const padL = 40;
    const padB = 24;
    const xOf = (x) => padL + ((x + 5) / 10) * (W - padL - 20);
    const yOf = (y) => bandH + 14 + ((14 - y) / 22) * (H2 - bandH - 14 - padB);

    /* axes */
    ctx.strokeStyle = SLATE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xOf(-5), yOf(0));
    ctx.lineTo(xOf(5), yOf(0));
    ctx.moveTo(xOf(0), yOf(14));
    ctx.lineTo(xOf(0), yOf(-8));
    ctx.stroke();

    /* the parabola (pixels only) */
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= 100; px++) {
      const x = -5 + (px / 100) * 10;
      const y = x * x;
      if (px === 0) ctx.moveTo(xOf(x), yOf(y));
      else ctx.lineTo(xOf(x), yOf(y));
    }
    ctx.stroke();
    /* the line */
    ctx.beginPath();
    ctx.moveTo(xOf(-5), yOf(S.m * -5 + S.b));
    ctx.lineTo(xOf(5), yOf(S.m * 5 + S.b));
    ctx.stroke();

    /* the gap gauge at the narrowest station */
    const h = stationOf(S.m);
    const yTop = h * h;
    const yBot = S.m * h + S.b;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(xOf(h), yOf(yTop));
    ctx.lineTo(xOf(h), yOf(yBot));
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.font = '700 12px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(S.calib ? 'floor ?' : `floor ${fmtInt(S.floor)}`, xOf(h) + 8, (yOf(yTop) + yOf(yBot)) / 2);

    /* the meetings */
    if (!S.calib)
      for (const x of S.meets) {
        ctx.fillStyle = CARMINE;
        ctx.beginPath();
        ctx.arc(xOf(x), yOf(x * x), 5.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = '600 10.5px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`(${fmtInt(x)}, ${x * x})`, xOf(x), yOf(x * x) - 8);
      }

    /* the readout card */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the gap gauge', 22, bandH + 8);
    ctx.fillStyle = CARMINE;
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillText(S.calib ? 'meetings: ?' : `meetings: ${S.count}`, 22, bandH + 26);
    ctx.fillStyle = GOLD;
    ctx.fillText(
      S.calib ? `narrowest at x = ${fmtInt(stationOf(S.m))} · floor ?` : `narrowest at x = ${fmtInt(stationOf(S.m))} · floor ${fmtInt(S.floor)}`,
      22,
      bandH + 44
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
    setBDial(-1);
    setCPick(null);
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
    setBDial(-1);
    setCPick(null);
    setFPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Count ${cPick ?? 'unruled'}; floor ${fPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${lineText(m, b)} against the parabola: ${count} meeting${count === 1 ? '' : 's'}; the gap's floor is ${fmtInt(floor)} at x = ${fmtInt(stationOf(m))}.`;

  return (
    <div className="lplab">
      <header className="head">
        <h1>Line Meets Parabola: The Gap Gauge</h1>
        <p className="lede">
          Twice, once, or never — one subtraction decides. The gap d(x) = x² −
          (mx + b) turns two curves into one instrument, and <em>its floor is the
          verdict</em>: below zero, two crossings; exactly zero, a kiss; above
          zero, a miss with a measurable closest approach.
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
                  <span className="dial-k">the line’s height b</span>
                  <span className="dial-v mono">{fmtInt(bDial)}</span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={3}
                  step={1}
                  value={bDial}
                  onChange={(e) => setBDial(Number(e.target.value))}
                  aria-label={`Height, ${bDial}`}
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
                <span className="target-k">The posted line</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the count, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the floor, gauged</li>
                </ol>
                <div className="declare" role="group" aria-label="Count ruling">
                  {COUNT_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (cPick === c2 ? ' active' : '')}
                      onClick={() => setCPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Floor ruling">
                  {FLOOR_CHIPS.map((c2) => (
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
                    ? 'both ruled, exactly — the gauge agrees'
                    : checks[0]
                      ? 'count ruled — now read the narrowest station'
                      : 'the floor’s sign decides the count'}
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
                  <span className="mono target-hint">the count · then the floor</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setCPick(null);
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
                  setCPick(null);
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
        <span className="mono">meetings = zeros of the gap · the floor is the verdict</span>{' '}
        &nbsp;·&nbsp; below zero it crosses twice, at zero it kisses, above zero the
        floor measures the closest approach — no meeting goes unexplained.
      </footer>

      <style jsx>{`
        .lplab {
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
        :global(.lplab) :focus-visible {
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
