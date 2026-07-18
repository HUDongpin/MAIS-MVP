'use client';

/* ============================================================================
   CompareFunctionsLab — an interactive "bench" for COMPARING TWO FUNCTIONS
   THAT ARE WEARING DIFFERENT CLOTHES:

        function A arrives as a GRAPH.      function B arrives as a TABLE.
        Which one climbs faster?  You cannot tell by looking.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 8 lab —
   CCSS 8.F.A.2 ("compare properties of two functions each represented in a
   different way — algebraically, graphically, numerically in tables, or by
   verbal descriptions"), extended by F-IF.C.9.

   ---------------------------------------------------------------------------
   THE ONE IDEA — "YOU CANNOT COMPARE COSTUMES. ONLY THE SCORECARD."
   ---------------------------------------------------------------------------
   A graph and a table are not two functions — they are two COSTUMES. A picture
   looks steep or shallow depending on how the axes were drawn; a table looks
   fast or slow depending on how far apart its rows were chosen. Neither
   appearance is a property of the function.

   So the lab refuses to compare the costumes and builds a third object: THE
   SCORECARD, which holds the only two numbers that survive undressing —

        START  (the value at x = 0)        RATE  (the climb per ONE step of x)

   Both costumes feed the scorecard. Only the scorecard gets compared. That is
   the standard's actual demand, and the scorecard is this lab's centerpiece:
   an object no sibling owns, precisely because no sibling ever needed to put
   two differently-dressed functions on the same footing.

   THE TRAP THE LAB IS BUILT AROUND — PER ROW IS NOT PER UNIT.
   B's table steps by TWO in x, not one. So a table that climbs 6 per row is
   climbing 3 per unit, and a student who compares "6" against A's slope is
   comparing a costume against a scorecard. This is the single most common
   error on this standard, so it is not a footnote here — it is the reason the
   lab exists, and the reason RATE is defined per ONE step and never per row.

   ---------------------------------------------------------------------------
   HOW IT STAYS DISTINCT FROM ITS SIBLINGS  (the library's hard rule)
   ---------------------------------------------------------------------------
   Grade-8 linear functions is the most crowded corner of this library, so the
   refusals here are load-bearing and audit-pyramid-style GREPPED from source:

     • LineFunctionLab      — owns the SLOPE TRIANGLE (rise-over-run drawn on
                              the curve). So this lab NEVER draws a slope
                              triangle. A's rate is read from its scorecard,
                              not from a triangle on its graph.
     • SystemsOfEquationsLab— owns TWO LINES ON ONE GRID and their crossing
                              (one/none/infinite solutions). So this lab NEVER
                              plots B. B stays in its table for the whole
                              lesson — the moment both functions share a grid,
                              this becomes Systems with extra steps.
     • FunctionLab          — owns the DEFINITION (each input fires exactly one
                              arrow). This lab takes "function" as given and
                              asks a question the definition cannot answer:
                              which of two is faster.
     • TableLab             — owns the two-way CONTINGENCY table (two crossed
                              CATEGORICAL variables, margins, denominators).
                              B's table here is an input→output list, a
                              different object entirely.
     • ProportionalLab      — owns y = kx (start pinned at 0). Here START is
                              half the scorecard, so it must be free.

   ---------------------------------------------------------------------------
   EXACT ARITHMETIC (the house rule)
   ---------------------------------------------------------------------------
   Rates step by 0.5 and starts are integers, so every value is a DYADIC
   rational (k/2) and every product below is exact in binary floating point.
   The table's entries are m·x + b at even x, so they are exact too. The
   CALIBRATED stamp is therefore a pair of EXACT equalities

        rateB === rateA  &&  startB === startA

   with no epsilon anywhere: two functions are the same function or they are
   not, and a meter tolerance has no business deciding which.

   DROP-IN USAGE (Next.js):
     1. Save this file anywhere, e.g. app/labs/CompareFunctionsLab.jsx
     2. Import and render it:
          import CompareFunctionsLab from './CompareFunctionsLab';
          export default function Page() { return <CompareFunctionsLab />; }

   The block between MODEL:START and MODEL:END is pure, React-free, pixel-free
   JavaScript. audit-comparefunctions.mjs SLICES THAT BLOCK OUT OF THIS FILE
   and evaluates it, so the audit tests the code that actually ships.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

/* ---- the two costumes ---------------------------------------------------
   A is drawn as a graph; B is printed as a table. Neither costume is ever
   allowed to become the other — see the header's refusals. */
const PARAMS = [
  { key: 'mA', label: 'A rate', min: -3, max: 3, step: 0.5, unlock: 1, role: 'A’s climb per step' },
  { key: 'bA', label: 'A start', min: -4, max: 6, step: 1, unlock: 1, role: 'A’s value at x = 0' },
  { key: 'mB', label: 'B rate', min: -3, max: 3, step: 0.5, unlock: 2, role: 'B’s climb per step' },
  { key: 'bB', label: 'B start', min: -4, max: 6, step: 1, unlock: 2, role: 'B’s value at x = 0' },
];
const START = { mA: 1, bA: 1, mB: 1.5, bB: -1 };

/* B's table steps by TWO in x. This is THE TRAP, and it is a constant rather
   than a dial on purpose: a student must never be able to make the trap go
   away by fiddling. Every "per row" number in this lab is 2× the rate. */
const TABLE_STEP = 2;
const TABLE_ROWS = 5;              // x = 0, 2, 4, 6, 8

const f = (m, b, x) => m * x + b;

/* B's table: exact, because m is a multiple of 0.5 and x is an even integer,
   so m·x is an integer and m·x + b is an integer. A table of whole numbers,
   always — no 4.999999999 ever reaches a student. */
function tableOf(m, b) {
  const rows = [];
  for (let i = 0; i < TABLE_ROWS; i++) {
    const x = i * TABLE_STEP;
    rows.push({ x, y: f(m, b, x) });
  }
  return rows;
}

/* ---- THE SCORECARD — the centerpiece, and the only thing ever compared ---
   Two numbers per function, and they mean the same thing for both no matter
   which costume the function arrived in. */
function scorecard(m, b) {
  return { start: f(m, b, 0), rate: m };
}

/* What a table LOOKS like it climbs (per row) versus what it actually climbs
   (per one step of x). The gap between these two numbers is the whole trap. */
function perRow(m) { return m * TABLE_STEP; }

/* The verdicts. Computed from the SCORECARD only — never from the costumes.
   This function cannot see the graph's steepness or the table's row spacing,
   which is the point, and the audit proves it by grepping this body. */
function faster(sA, sB) {
  if (sA.rate > sB.rate) return 'A';
  if (sB.rate > sA.rate) return 'B';
  return 'tie';
}
function higherStart(sA, sB) {
  if (sA.start > sB.start) return 'A';
  if (sB.start > sA.start) return 'B';
  return 'tie';
}
/* Same function, in different clothes? Exact — no epsilon. */
function sameFunction(sA, sB) {
  return sA.rate === sB.rate && sA.start === sB.start;
}

/* ---- calibration: DRESS B AS A ----------------------------------------
   A is locked and mysterious; read its scorecard off the graph and build B's
   table to match it. The payoff is the lab's thesis made physical: a graph and
   a table that look nothing alike are the SAME FUNCTION when the scorecards
   agree. Targets sit on the dials' own grid, so an exact hit is always
   reachable. */
function makeTarget(prev, rnd) {
  const rand = rnd || Math.random;
  const rates = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5];
  const starts = [-3, -2, -1, 0, 1, 2, 3, 4];
  let t;
  do {
    t = {
      mA: rates[Math.floor(rand() * rates.length)],
      bA: starts[Math.floor(rand() * starts.length)],
    };
  } while (prev && t.mA === prev.mA && t.bA === prev.bA);
  return t;
}
function isCalibrated(mA, bA, mB, bB) {
  return sameFunction(scorecard(mA, bA), scorecard(mB, bB));
}
/* A two-part meter: half for the rate, half for the start. It can read 100
   only when both halves are exactly right — and even then the STAMP is
   decided by isCalibrated, never by this number. */
function matchPercent(mA, bA, mB, bB) {
  const r = Math.max(0, 1 - Math.abs(mA - mB) / 6);
  const s = Math.max(0, 1 - Math.abs(bA - bB) / 10);
  return Math.round(100 * (0.5 * r + 0.5 * s));
}

/* ---- the lesson --------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two costumes',
    focus: 'meet',
    body:
      'Function A turned up as a GRAPH. Function B turned up as a TABLE. They are both functions, and ' +
      'the question is simple: which one climbs faster? Look at them for a moment before you answer — ' +
      'and notice how little looking actually tells you.',
    q: 'Just by looking at the picture and the table, which function climbs faster?',
    choices: [
      'You cannot tell yet — they are dressed differently',
      'A, because you can see the line is steep',
      'B, because its numbers jump a lot',
    ],
    answer: 0,
    feedback:
      'You cannot tell yet, and both of the other answers are traps. A graph looks steep or shallow ' +
      'depending on how someone drew the axes. A table looks fast or slow depending on how far apart ' +
      'someone chose the rows. Neither of those is a fact about the function — they are facts about the ' +
      'COSTUME. To compare, we have to undress both.',
  },
  {
    title: 'Read A',
    focus: 'readA',
    body:
      'A’s dials are live. Every function like these gives up exactly two numbers: where it STARTS (its ' +
      'value at x = 0) and its RATE (how much it climbs for ONE step of x). Move A’s dials and watch ' +
      'both numbers land on the scorecard.',
    q: 'What does a function’s “start” mean?',
    choices: [
      'Its value when x = 0',
      'The first number you happen to see',
      'The smallest value it ever reaches',
    ],
    answer: 0,
    feedback:
      'The start is the value at x = 0 — nothing to do with where a picture is cropped or where a table ' +
      'happens to begin. It is a fact about the function, so it goes on the scorecard.',
  },
  {
    title: 'Read B — mind the rows',
    focus: 'readB',
    body:
      'B’s dials are live. Now look hard at B’s table: the x column does not go 0, 1, 2, 3. It goes 0, 2, ' +
      '4, 6, 8 — it steps by TWO. So the jump from one row to the next is not the rate. It is two rates.',
    q: 'B’s table climbs 3 from one row to the next, and its rows step by 2 in x. What is B’s rate?',
    choices: ['1.5 — because 3 ÷ 2 = 1.5', '3 — the table says 3', '6 — because 3 × 2 = 6'],
    answer: 0,
    feedback:
      'Rate is per ONE step of x, so 3 per row ÷ 2 steps per row = 1.5. This is the most common mistake ' +
      'on this whole idea: reading “3” straight off the table and comparing it to A’s rate. That compares ' +
      'a costume to a scorecard. Whoever chose the rows chose that 3 — the function did not.',
  },
  {
    title: 'The scorecard decides',
    focus: 'compare',
    body:
      'Both functions are undressed now, and the scorecard holds the same two numbers for each. This — ' +
      'and only this — is what you compare. Move any dial and watch the verdicts follow the scorecard, ' +
      'never the picture.',
    q: 'Suppose A’s graph looks far steeper than B’s table “feels”, but the scorecard says B’s rate is bigger. Who is right?',
    choices: [
      'The scorecard — B climbs faster',
      'The graph — you can see A is steeper',
      'Neither; you would need to plot B too',
    ],
    answer: 0,
    feedback:
      'The scorecard. “Looks steeper” is a fact about the drawing, and “feels fast” is a fact about the ' +
      'row spacing. The rate is a fact about the function. And no, you do not need to plot B — that is ' +
      'the point of the scorecard: it lets you compare without ever putting them in the same costume.',
  },
  {
    title: 'Dress B as A',
    focus: 'calib',
    body:
      'Last challenge. A is locked and its dials are hidden — read its scorecard off the graph. Then turn ' +
      'B’s dials until B’s table is the SAME FUNCTION as A’s graph. It will not look the same. It will ' +
      'be the same. Press New A for a fresh one.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

export default function CompareFunctionsLab() {
  const [mA, setMA] = useState(START.mA);
  const [bA, setBA] = useState(START.bA);
  const [mB, setMB] = useState(START.mB);
  const [bB, setBB] = useState(START.bB);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;

  const sA = scorecard(mA, bA);
  const sB = scorecard(mB, bB);
  const rows = tableOf(mB, bB);

  sceneRef.current = { mA, bA, mB, bB, focus, target };

  const pct = target ? matchPercent(mA, bA, mB, bB) : 0;
  const calibrated = target ? isCalibrated(mA, bA, mB, bB) : false;

  /* ---- the renderer: A's graph on the left, B's table on the right -------
     B is NEVER plotted. Two functions on one grid is SystemsOfEquationsLab. */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const LmA = S.mA, LbA = S.bA, LmB = S.mB, LbB = S.bB;

    const INK = '#1c2b3a';
    const SOFT = '#5b6b7b';
    const CARM = '#c81e4f';   // A — the graph
    const BLUE = '#2f6f9f';   // B — the table (a principled 2nd object colour)

    // ---- left half: A's graph -----------------------------------------
    const gW = W * 0.52, gH = H;
    const pad = 26;
    const X0 = 0, X1 = 9, Y0 = -5, Y1 = 9;
    const gx = (x) => pad + ((x - X0) / (X1 - X0)) * (gW - pad * 1.6);
    const gy = (y) => gH - pad - ((y - Y0) / (Y1 - Y0)) * (gH - pad * 2);

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, gW, gH); ctx.clip();

    // quadrille
    ctx.strokeStyle = 'rgba(199,216,228,0.7)';
    ctx.lineWidth = 1;
    for (let x = X0; x <= X1; x++) { ctx.beginPath(); ctx.moveTo(gx(x), gy(Y0)); ctx.lineTo(gx(x), gy(Y1)); ctx.stroke(); }
    for (let y = Y0; y <= Y1; y++) { ctx.beginPath(); ctx.moveTo(gx(X0), gy(y)); ctx.lineTo(gx(X1), gy(y)); ctx.stroke(); }
    // axes
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gx(X0), gy(0)); ctx.lineTo(gx(X1), gy(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx(0), gy(Y0)); ctx.lineTo(gx(0), gy(Y1)); ctx.stroke();

    // A's line — plain. NO slope triangle: that is LineFunctionLab's.
    ctx.strokeStyle = CARM;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx(X0), gy(f(LmA, LbA, X0)));
    ctx.lineTo(gx(X1), gy(f(LmA, LbA, X1)));
    ctx.stroke();

    // the start dot: the one number the graph shows for free
    const s0 = gy(f(LmA, LbA, 0));
    ctx.fillStyle = CARM;
    ctx.beginPath(); ctx.arc(gx(0), s0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = '12px ui-monospace, Menlo, monospace';
    ctx.fillStyle = CARM;
    ctx.textAlign = 'left';
    // Sit the label on the side the line is LEAVING, so it never lies across
    // the line: the line climbs away up-right when the rate is positive, so the
    // label goes below; it falls away down-right when negative, so it goes above.
    ctx.fillText(`start ${trim(f(LmA, LbA, 0))}`, gx(0) + 9, LmA >= 0 ? s0 + 18 : s0 - 10);

    ctx.font = '600 13px ui-monospace, Menlo, monospace';
    ctx.fillStyle = CARM;
    ctx.fillText('A — a graph', pad, 18);
    ctx.restore();

    // ---- right half: B's table ----------------------------------------
    const tx = gW + 18;
    ctx.save();
    ctx.font = '600 13px ui-monospace, Menlo, monospace';
    ctx.fillStyle = BLUE;
    ctx.textAlign = 'left';
    ctx.fillText('B — a table', tx, 18);

    const tRows = tableOf(LmB, LbB);
    const rowH = Math.min(30, (gH - 70) / (TABLE_ROWS + 1));
    const tTop = 34;
    const colX = tx + 16, colY = tx + 92;

    ctx.font = '12px ui-monospace, Menlo, monospace';
    ctx.fillStyle = SOFT;
    ctx.fillText('x', colX, tTop);
    ctx.fillText('y', colY, tTop);
    ctx.strokeStyle = 'rgba(28,43,58,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx + 8, tTop + 6); ctx.lineTo(tx + 150, tTop + 6); ctx.stroke();

    for (let i = 0; i < tRows.length; i++) {
      const yy = tTop + 22 + i * rowH;
      ctx.fillStyle = INK;
      ctx.font = '13px ui-monospace, Menlo, monospace';
      ctx.fillText(trim(tRows[i].x), colX, yy);
      ctx.fillStyle = BLUE;
      ctx.fillText(trim(tRows[i].y), colY, yy);
      // the row gap, annotated — the trap, made visible rather than hidden
      if (i > 0 && (S.focus === 'readB' || S.focus === 'compare')) {
        const dy = tRows[i].y - tRows[i - 1].y;
        ctx.fillStyle = 'rgba(47,111,159,0.75)';
        ctx.font = '11px ui-monospace, Menlo, monospace';
        ctx.fillText(`${dy >= 0 ? '+' : ''}${trim(dy)} per row`, colY + 40, yy - rowH / 2);
      }
    }
    if (S.focus === 'readB' || S.focus === 'compare') {
      ctx.fillStyle = SOFT;
      ctx.font = '11px ui-monospace, Menlo, monospace';
      ctx.fillText(`x steps by ${TABLE_STEP}`, colX, tTop + 26 + TABLE_ROWS * rowH);
      ctx.fillStyle = BLUE;
      ctx.fillText(`rate = ${trim(perRow(LmB))} ÷ ${TABLE_STEP} = ${trim(LmB)}`, colX, tTop + 42 + TABLE_ROWS * rowH);
    }
    ctx.restore();
  }, []);

  useEffect(() => { draw(); }, [mA, bA, mB, bB, step, target, focus, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) {
      const t = makeTarget(null);
      setTarget(t); setMA(t.mA); setBA(t.bA); setMB(0.5); setBB(-4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'mA') setMA(v);
    else if (key === 'bA') setBA(v);
    else if (key === 'mB') setMB(v);
    else setBB(v);
  };
  const dialValue = (k) => (k === 'mA' ? mA : k === 'bA' ? bA : k === 'mB' ? mB : bB);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const fasterOne = faster(sA, sB);
  const higherOne = higherStart(sA, sB);
  const showScore = focus !== 'meet';
  // A's column is withheld during the build challenge — see the scorecard markup.
  const hideA = focus === 'calib' && !calibrated;
  const spoken = `A starts at ${trim(sA.start)} and climbs ${trim(sA.rate)} per step. ` +
    `B starts at ${trim(sB.start)} and climbs ${trim(sB.rate)} per step.`;

  return (
    <div className="cflab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Which One Climbs Faster?</h1>
        <p className="lede">
          One function arrives as a graph, the other as a table. You cannot compare them
          like that — a graph looks steep because of how it was drawn, and a table looks fast
          because of how its rows were chosen. Undress them both onto the{' '}
          <strong>scorecard</strong>, and only then answer.
        </p>
      </header>

      <div className="bench">
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={`Function A as a graph, function B as a table. ${spoken}`} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>

          {/* THE CENTERPIECE — the scorecard. The only thing ever compared. */}
          {showScore && (
            <div className="score">
              <p className="score-title">The scorecard</p>
              <table>
                <thead>
                  <tr><th /><th className="a">A <span>(graph)</span></th><th className="b">B <span>(table)</span></th></tr>
                </thead>
                <tbody>
                  {/* During the build challenge A's column is BLANK. The task is
                      "read A off the graph", and a scorecard that prints A's
                      answer hands it over — the challenge would be reading a
                      number off a table, not reading a function off a picture.
                      The graph still shows what a graph honestly shows. */}
                  <tr>
                    <th scope="row">Start <em>(at x = 0)</em></th>
                    <td className="a">{hideA ? '?' : trim(sA.start)}</td>
                    <td className="b">{trim(sB.start)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Rate <em>(per one step)</em></th>
                    <td className="a">{hideA ? '?' : trim(sA.rate)}</td>
                    <td className="b">{trim(sB.rate)}</td>
                  </tr>
                </tbody>
              </table>
              {focus === 'compare' && (
                <p className="verdict">
                  {fasterOne === 'tie'
                    ? 'Same rate — neither climbs faster.'
                    : `${fasterOne} climbs faster.`}{' '}
                  {higherOne === 'tie'
                    ? 'And they start level.'
                    : `${higherOne} starts higher.`}
                </p>
              )}
            </div>
          )}
        </section>

        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span key={i} role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined} />
            ))}
          </div>

          <p className="eyebrow small">Step {step + 1} of {STEPS.length}</p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          <div className="dials">
            {PARAMS.map((d) => {
              const hidden = focus === 'calib' && d.key.endsWith('A');
              const unlocked = step >= d.unlock && !hidden;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{hidden ? 'hidden — read it off the graph' : unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range" min={d.min} max={d.max} step={d.step}
                    value={dialValue(d.key)} disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{hidden ? '?' : unlocked ? trim(dialValue(d.key)) : '🔒'}</output>
                </label>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((c, i) => {
                  const chosen = answers[step];
                  let cls = 'choice';
                  if (chosen != null) {
                    if (i === current.answer) cls += ' correct';
                    else if (chosen === i) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && i === current.answer ? '✓' : chosen != null && chosen === i ? '✕' : ''}
                      </span>
                      {c}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target && (
            <div className="calib">
              <p className="calib-goal">Make B’s table the same function as A’s graph.</p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match {pct}%</span>
                {calibrated ? <span className="stamp">SAME FUNCTION</span>
                  : <span className="mono target-hint">rate {trim(sB.rate)} vs ? · start {trim(sB.start)} vs ?</span>}
              </div>
              {calibrated && (
                <p className="celebrate">
                  A picture and a list of numbers, and they are the <strong>same function</strong> —
                  start {trim(sA.start)}, rate {trim(sA.rate)}, both of them. They never looked alike.
                  That was never the test.
                </p>
              )}
              <button type="button" className="btn ghost"
                onClick={() => { const t = makeTarget(target); setTarget(t); setMA(t.mA); setBA(t.bA); setMB(0.5); setBB(-4); }}>
                New A
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>← Back</button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {hasQuestion && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => {
                setStep(0); setAnswers({}); setTarget(null);
                setMA(START.mA); setBA(START.bA); setMB(START.mB); setBB(START.bB);
              }}>Restart lab</button>
            )}
          </div>
        </aside>
      </div>

      <style jsx>{`
        .cflab {
          --page: #eff1ee; --paper: #fbfbf8; --ink: #1c2b3a; --ink-soft: #5b6b7b;
          --curve: #c81e4f; --blue: #2f6f9f; --quad: #c7d8e4; --ok: #1f8a5b;
          --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
          --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
          background: var(--page); color: var(--ink);
          font: 16px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif;
          padding: 28px 18px 44px; border-radius: 16px; max-width: 1120px; margin: 0 auto;
        }
        .mono { font-family: var(--mono); }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        .eyebrow { font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--ink-soft); margin: 0 0 6px; }
        .eyebrow.small { margin: 0 0 4px; }
        h1 { font-family: var(--serif); font-weight: 600; font-size: clamp(24px,3.6vw,32px); margin: 0 0 6px; }
        .lede { color: var(--ink-soft); margin: 0 0 22px; max-width: 70ch; }
        .bench { display: grid; grid-template-columns: minmax(0,1fr) 340px; gap: 22px; align-items: start; }
        @media (max-width: 920px) { .bench { grid-template-columns: 1fr; } }
        .panel { background: #fff; border: 1px solid rgba(28,43,58,0.15); border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28,43,58,0.05); }
        .stage-panel { padding: 14px; }
        .stage { position: relative; width: 100%; aspect-ratio: 16 / 9; border: 1px solid var(--quad);
          border-radius: 8px; overflow: hidden; background: var(--paper); }
        .stage canvas { display: block; width: 100%; height: 100%; }
        .score { margin: 14px 2px 2px; }
        .score-title { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--ink-soft); margin: 0 0 6px; }
        .score table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
        .score th, .score td { padding: 7px 8px; border-top: 1px solid rgba(28,43,58,0.12); text-align: right; }
        .score thead th { border-top: 0; font-size: 12px; letter-spacing: 0.04em; }
        .score thead th span { font-weight: 400; color: var(--ink-soft); font-size: 11px; }
        .score th[scope='row'] { text-align: left; font-weight: 600; font-size: 13px; }
        .score th[scope='row'] em { font-style: normal; color: var(--ink-soft); font-weight: 400; font-size: 11.5px; }
        .score td { font-family: var(--mono); font-size: 16px; font-weight: 600; }
        .score .a { color: var(--curve); }
        .score .b { color: var(--blue); }
        .verdict { margin: 10px 0 0; font-size: 13.5px; background: rgba(200,30,79,0.05);
          border-left: 3px solid var(--curve); padding: 8px 11px; border-radius: 0 6px 6px 0; }
        .btn { font: 600 13px/1 system-ui, sans-serif; padding: 9px 14px; border-radius: 8px;
          cursor: pointer; border: 1px solid var(--ink); background: var(--ink); color: #fff;
          transition: background .15s, color .15s, border-color .15s, opacity .15s; }
        .btn.ghost { background: transparent; color: var(--ink); }
        .btn:disabled { opacity: .4; cursor: not-allowed; }
        .btn:not(:disabled):hover { filter: brightness(1.08); }
        .tutor { padding: 18px 20px 20px; }
        .progress { display: flex; gap: 6px; margin-bottom: 14px; }
        .pip { height: 5px; flex: 1; border-radius: 3px; background: rgba(28,43,58,0.14); }
        .pip.done { background: rgba(200,30,79,0.45); }
        .pip.cur { background: var(--curve); }
        h2 { font-family: var(--serif); font-weight: 600; font-size: 20px; margin: 0 0 10px;
          padding-bottom: 9px; border-bottom: 3px double rgba(200,30,79,0.45); }
        .body { margin: 0 0 16px; font-size: 14.5px; }
        .dials { display: grid; gap: 11px; margin-bottom: 6px; }
        .dial { display: grid; grid-template-columns: 54px 1fr 44px; grid-template-rows: auto auto;
          align-items: center; gap: 2px 10px; }
        .dial.locked { opacity: .5; }
        .dk { grid-row: 1 / 3; font-family: var(--mono); font-size: 12px; font-weight: 600; }
        .drole { grid-column: 2 / 4; font-size: 11px; color: var(--ink-soft); }
        .dial input[type='range'] { grid-column: 2; width: 100%; accent-color: var(--ink); cursor: pointer; }
        .dial input[type='range']:disabled { cursor: not-allowed; }
        .dv { grid-column: 3; font-family: var(--mono); font-variant-numeric: tabular-nums;
          text-align: right; font-size: 13px; }
        .quiz { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(28,43,58,0.1); }
        .q { font-size: 14px; font-weight: 600; margin: 0 0 10px; }
        .choices { display: grid; gap: 7px; }
        .choice { text-align: left; font: 13.5px/1.4 system-ui, sans-serif; padding: 9px 11px 9px 30px;
          border: 1px solid rgba(28,43,58,0.2); border-radius: 8px; background: var(--paper);
          color: var(--ink); cursor: pointer; position: relative; transition: border-color .15s, background .15s; }
        .choice:not(:disabled):hover { border-color: var(--ink); }
        .choice .mark { position: absolute; left: 10px; font-weight: 700; }
        .choice.correct { border-color: var(--ok); background: rgba(31,138,91,0.08); }
        .choice.correct .mark { color: var(--ok); }
        .choice.wrong { border-color: var(--ink-soft); background: rgba(91,107,123,0.08); }
        .choice.wrong .mark { color: var(--ink-soft); }
        .choice.dim { opacity: .55; }
        .choice:disabled { cursor: default; }
        .feedback { margin: 12px 0 0; font-size: 13px; line-height: 1.55; color: var(--ink);
          background: rgba(200,30,79,0.05); border-left: 3px solid var(--curve);
          padding: 10px 12px; border-radius: 0 6px 6px 0; }
        .calib { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(28,43,58,0.1);
          display: grid; gap: 10px; }
        .calib-goal { margin: 0; font-size: 14px; font-weight: 600; }
        .meter { height: 12px; border-radius: 6px; background: rgba(28,43,58,0.1); overflow: hidden; }
        .meter-fill { height: 100%; background: linear-gradient(90deg, rgba(200,30,79,.55), var(--curve));
          transition: width .12s ease-out; }
        .meter-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12.5px; }
        .target-hint { color: var(--ink-soft); font-size: 11.5px; }
        .stamp { font: 700 11px/1 var(--mono); letter-spacing: .14em; color: var(--ok);
          border: 2px solid var(--ok); border-radius: 6px; padding: 4px 7px; transform: rotate(-3deg); }
        .celebrate { margin: 0; font-size: 12.5px; line-height: 1.5; background: rgba(31,138,91,0.07);
          border-left: 3px solid var(--ok); padding: 9px 11px; border-radius: 0 6px 6px 0; }
        .nav { margin-top: 20px; display: flex; justify-content: space-between; gap: 10px; }
        :global(.cflab) :focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px; }
        @media (prefers-reduced-motion: reduce) { .btn, .meter-fill, .choice { transition: none; } }
      `}</style>
    </div>
  );
}
