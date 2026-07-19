'use client';

/* ============================================================================
   RationalFunctionLab — an interactive "bench" for the RATIONAL FUNCTION's
   two kinds of forbidden point: the HOLE (a cancelled factor — one missing
   point on an otherwise healthy curve) and the WALL (a surviving factor —
   a vertical asymptote the curve explodes against).

        (x² − 1)/(x − 1):  a HOLE at x = 1, height 2  — the factor cancels
        1/(x − 1):         a WALL at x = 1            — the factor survives
        a table cannot tell them apart.  The graph can.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A HIGH-SCHOOL lab —
   A-APR.D.6–7 (rational expressions; rewrite a(x)/b(x) by division) and
   F-IF.C.7d (+) ("graph rational functions, identifying zeros and
   asymptotes").  The library graphs quadratics, polynomials, exponentials,
   logarithms and six trig functions — and owns not one rational function.
   The missing family arrives through its sharpest idea.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge
   with a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE TABLE THAT CANNOT TELL."
     Two functions, both undefined at x = 1.  The gold PROBE walks a table
     toward the forbidden input — x = 0.9, 0.99, 0.999, every value an
     EXACT fraction — and the rows tell two different stories: one column
     settles calmly toward 2, the other blows past every bound.  But at
     x = 1 itself both tables print the same single word: undefined.  The
     table HINTS; only the graph SHOWS: the first curve is a straight line
     wearing one open circle (the hole), the second dives against a dashed
     vertical wall it can never touch.  The reveal is the algebra:
     (x²−1)/(x−1) = x+1 EXCEPT AT x = 1 — the offending factor cancels but
     its crime scene remains — while in 1/(x−1) the factor survives and
     builds the wall.  Division by zero comes in two severities, and the
     difference is whether the zero can be divided AWAY.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • LogarithmLab and the tan/sec/csc/cot labs own the PATH-BREAK
       discipline for drawing near an asymptote; this lab inherits that
       craft (break the path where the model is undefined or explodes)
       and adds what none of them have: the HOLE, and the cancelled-factor
       reason for it.  Their asymptotes are facts of their functions; this
       lab's wall-vs-hole is a CHOICE the algebra makes.
     • PolynomialFunctionLab owns polynomial graphing (end behavior,
       roots); QuadraticPolynomialLab owns factoring quadratics as area.
       Factoring appears here only as the cancellation step, never as a
       skill being taught.
     • FunctionLab owns "what a function is" and the vertical-line probe.
       This lab's probe is a TABLE WALKER — it approaches a bad input
       rather than counting outputs at a good one.
     • DerivativeLab owns h → 0 secants; roadmap H30 owns limits.  The
       word "limit" is deliberately refused: the table "settles toward 2"
       in plain speech, and the limit's formal name waits for its own
       bench.

   One-accent discipline: CARMINE is THE FUNCTION — its curve, its hole,
   its wall.  BLUE is the REDUCED TWIN (the dashed x+1 the algebra
   uncovers).  GOLD is the PROBE — the table walker and its rows.  GREEN
   is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Every preset is a pair of INTEGER polynomials with integer roots;
       classification is EXACT: a bad point a (root of the denominator) is
       a HOLE iff synthetic division removes (x − a) from numerator and
       denominator until the denominator no longer vanishes at a, and a
       WALL otherwise — integer arithmetic throughout, audited against
       every preset.
     • The hole's height is EXACT: the fully-cancelled function evaluated
       at a, as a fraction in lowest terms (the audit re-reduces).
     • The probe's table rows are EXACT rational numbers: f(9/10) is
       computed by integer cross-multiplication and shown as a fraction
       and its decimal — no float ever prints a stated value.  (Pixels,
       as ever, may divide.)
     • The calibration stamp needs two facts at once: every bad point of
       the posted preset classified correctly (hole/wall chips), AND the
       hole's height declared exactly (or the explicit "no hole" plea
       when the preset has none).  Audited over every preset × every
       classification × every chip.
   Verified by audit-rationalfunction.mjs (numeric proof + source greps)
   and verify-rationalfunction.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/RationalFunctionLab.jsx
     2. Import and render it:
          import RationalFunctionLab from './RationalFunctionLab';
          export default function Page() { return <RationalFunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the preset, the
              probe position, the lesson step, answers, the inspection).
     MODEL  — exact integer polynomials and rational arithmetic; it knows
              nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Presets by chip; the probe by dial (how close the
   table walks to the forbidden input).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the function: curve, hole, wall
const BLUE = '#3f74a6'; // the reduced twin
const GOLD = '#b98718'; // the probe and its table
const INK_HEX = '#1c2b3a';

const PROBE_STEPS = 4; // the walker: 0.9, 0.99, 0.999, 0.9999 (and mirrored)
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Integer polynomials; exact division; exact fractions.
   ------------------------------------------------------------------------- */
/* polynomials as coefficient arrays, constant first: x²−1 = [-1, 0, 1] */
const evalPoly = (p, x) => p.reduce((a, c, i) => a + c * x ** i, 0);
/* synthetic division of p by (x − a); returns quotient iff remainder 0 */
function divideOut(p, a) {
  const q = Array(p.length - 1).fill(0);
  let carry = p[p.length - 1];
  for (let i = p.length - 2; i >= 0; i--) {
    q[i] = carry;
    carry = p[i] + carry * a;
  }
  return carry === 0 ? q : null;
}
const gcdInt = (a, b) => (b === 0 ? Math.abs(a) : gcdInt(b, a % b));
/* exact fraction of small integers */
const frac = (n, d) => {
  const s = d < 0 ? -1 : 1;
  const g = gcdInt(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
};
const fracText = (f) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);

/* classify the bad points of num/den: cancel (x−a) as often as it divides
   BOTH; a is a HOLE if the final denominator no longer vanishes at a */
function inspect(num, den, badPoints) {
  return badPoints.map((a) => {
    let n = num.slice();
    let d = den.slice();
    while (evalPoly(d, a) === 0) {
      const dn = divideOut(n, a);
      const dd = divideOut(d, a);
      if (dn && dd) {
        n = dn;
        d = dd;
      } else break;
    }
    if (evalPoly(d, a) !== 0) {
      /* hole: exact height = n(a)/d(a) */
      return { a, kind: 'hole', height: frac(evalPoly(n, a), evalPoly(d, a)) };
    }
    return { a, kind: 'wall', height: null };
  });
}
/* exact f(p/q): num(p/q)/den(p/q) = (Σ n_i p^i q^(N−i)) / (Σ d_i p^i q^(N−i)),
   N = max degree — integer arithmetic, then reduced */
function evalAtFraction(num, den, p, q) {
  const N = Math.max(num.length, den.length) - 1;
  const up = num.reduce((a, c, i) => a + c * p ** i * q ** (N - i), 0);
  const dn = den.reduce((a, c, i) => a + c * p ** i * q ** (N - i), 0);
  if (dn === 0) return null;
  return frac(up, dn);
}

/* the presets */
const PRESETS = {
  holey: {
    label: '(x² − 1)/(x − 1)',
    num: [-1, 0, 1],
    den: [-1, 1],
    bad: [1],
    twin: 'x + 1',
    twinPoly: [1, 1],
  },
  wall: {
    label: '1/(x − 1)',
    num: [1],
    den: [-1, 1],
    bad: [1],
    twin: null,
    twinPoly: null,
  },
  combo: {
    label: '(x + 1)/(x² − 1)',
    num: [1, 1],
    den: [-1, 0, 1],
    bad: [-1, 1],
    twin: null,
    twinPoly: null,
  },
  twin4: {
    label: '(x² − 4)/(x − 2)',
    num: [-4, 0, 1],
    den: [-2, 1],
    bad: [2],
    twin: 'x + 2',
    twinPoly: [2, 1],
  },
};
const presetIds = Object.keys(PRESETS);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The singularity inspector."  A preset is posted;
   classify each forbidden input, then declare the hole's exact height (or
   the plea that no hole exists).
   ------------------------------------------------------------------------- */
function makeCase(prevId) {
  let id;
  do {
    id = presetIds[Math.floor(Math.random() * presetIds.length)];
  } while (id === prevId);
  return id;
}
/* the height chips for a preset: the truth (or 'no hole') plus foils */
function heightChips(presetId) {
  const P = PRESETS[presetId];
  const inspected = inspect(P.num, P.den, P.bad);
  const hole = inspected.find((r) => r.kind === 'hole');
  if (!hole) {
    return [
      { s: 'no hole', ok: true },
      { s: '0', ok: false },
      { s: '1', ok: false },
    ];
  }
  const t = fracText(hole.height);
  const foil1 = fracText(frac(hole.height.n + hole.height.d, hole.height.d)); // +1
  const foil2 = 'no hole';
  return [
    { s: t, ok: true },
    { s: foil1, ok: false },
    { s: foil2, ok: false },
  ];
}
const calibChecks = (presetId, marks, declared) => {
  if (!presetId) return [false, false];
  const P = PRESETS[presetId];
  const inspected = inspect(P.num, P.den, P.bad);
  const marksOK =
    inspected.length > 0 &&
    inspected.every((r) => marks[r.a] != null && marks[r.a] === r.kind);
  const truth = heightChips(presetId).find((c) => c.ok).s;
  return [marksOK, marksOK && declared != null && declared === truth];
};
const closeness = (presetId, marks, declared) =>
  Math.round((100 * calibChecks(presetId, marks, declared).filter(Boolean).length) / 2);
const isCalibrated = (presetId, marks, declared) =>
  calibChecks(presetId, marks, declared).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that undefined is undefined is
   undefined, that a table settles the question, that cancelling erases
   the crime.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The forbidden input',
    body:
      'Two functions, posted side by side in spirit: (x² − 1)/(x − 1) and 1/(x − 1). Feed ' +
      'either one x = 1 and the denominator hits zero — both print UNDEFINED. Same crime?',
    preset: 'holey',
    q: 'At x = 1 both functions are undefined. Does that make them alike there?',
    choices: [
      'Not necessarily — “undefined” is a symptom; the causes could differ',
      'Yes — undefined is undefined',
      'Yes — both will crash a calculator',
    ],
    answer: 0,
    feedback:
      'A symptom, not a diagnosis. Division by zero always prints the same word, but WHY the ' +
      'zero got there — and whether it can be divided away — splits into two very different ' +
      'stories. The next steps hunt the difference with a table, then with the graph, then ' +
      'with algebra.',
  },
  {
    title: 'The table that cannot tell',
    body:
      'The gold probe walks toward x = 1: first 0.9, then 0.99, then 0.999 — every row an ' +
      'exact fraction. Watch this function’s column: it settles calmly toward 2.',
    preset: 'holey',
    table: true,
    q: 'The rows read 1.9, then 1.99, then 1.999. What is the table entitled to claim about x = 1 itself?',
    choices: [
      'Nothing certain — it can only report that nearby values settle toward 2; x = 1 stays undefined',
      'That f(1) = 2',
      'That the function is broken everywhere near 1',
    ],
    answer: 0,
    feedback:
      'The table reports the NEIGHBORHOOD — beautifully — and stays silent about the point ' +
      'itself. “Settles toward 2” is real, checkable information (every row is exact ' +
      'arithmetic), but f(1) remains undefined however close the walk gets. What the settling ' +
      'MEANS is a deep story with its own name, and its own bench some day.',
  },
  {
    title: 'The graph can — the hole',
    body:
      'Now draw it. The curve of (x² − 1)/(x − 1) is… a straight line, wearing one OPEN ' +
      'CIRCLE at (1, 2). Everything the table hinted, made visible: healthy everywhere, ' +
      'missing exactly one point.',
    preset: 'holey',
    table: true,
    graph: true,
    q: 'What does the open circle at (1, 2) say?',
    choices: [
      'The curve approaches this point from both sides — but the point itself is not on the graph',
      'The function is zero there',
      'A printing error in the lab',
    ],
    answer: 0,
    feedback:
      'A HOLE: one missing point on an otherwise perfect line. The two branches of the table ' +
      '(walking in from the left and from the right) both aim at height 2, the curve carries ' +
      'their promise — and keeps the single puncture where the function refuses to speak. ' +
      'Puncture, not catastrophe.',
  },
  {
    title: 'The graph can — the wall',
    body:
      'Same forbidden input, different function: 1/(x − 1). The probe’s rows now EXPLODE — ' +
      '−10, −100, −1000 — and the graph shows why: a dashed vertical WALL at x = 1 that the ' +
      'curve dives against and never touches.',
    preset: 'wall',
    table: true,
    graph: true,
    q: 'Near the wall, the function’s values…',
    choices: [
      'Blow past every bound in SIZE — name any ceiling and the curve beats it close enough to the wall',
      'Stop at exactly 1000',
      'Settle toward 2, like before',
    ],
    answer: 0,
    feedback:
      'Past EVERY bound: at x = 1 − 1/1000 the value is −1000; step across to 1 + 1/1000 and it is +1000. ' +
      'That is a vertical asymptote — the wall — and it is the other face of division by ' +
      'zero. One forbidden input, two behaviors: the missing point, and the explosion. The ' +
      'algebra now owes us the reason.',
  },
  {
    title: 'The reason — cancel, or survive',
    body:
      'Factor the first: (x² − 1)/(x − 1) = (x − 1)(x + 1)/(x − 1). The offending factor ' +
      'CANCELS: the function equals x + 1 everywhere EXCEPT x = 1 (the blue twin, dashed). ' +
      'In 1/(x − 1), the factor has nothing to cancel with — it SURVIVES, and builds the wall.',
    preset: 'holey',
    table: false,
    graph: true,
    twin: true,
    q: 'So the rule behind hole-versus-wall is…',
    choices: [
      'Cancel the zero away → a hole (with the twin’s height); the zero survives → a wall',
      'Big numerators make walls',
      'Holes and walls alternate along the x-axis',
    ],
    answer: 0,
    feedback:
      'Cancellation decides. If (x − a) divides out of the fraction completely, the function ' +
      'IS its reduced twin except at the crime scene — a hole at height twin(a). If any copy ' +
      'of (x − a) survives downstairs, the wall stands. And the combo exists: ' +
      '(x + 1)/(x² − 1) cancels at −1 (hole, height −1/2) and survives at 1 (wall) — one ' +
      'function, both stories. The inspector’s badge awaits.',
  },
  {
    title: 'The singularity inspector',
    body:
      'A function is posted. For each forbidden input, file the classification — hole or ' +
      'wall — then declare the hole’s exact height (or enter the plea: no hole).',
    preset: 'holey',
    table: true,
    graph: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function RationalFunctionLab() {
  const [presetId, setPresetId] = useState('holey');
  const [probeK, setProbeK] = useState(1); // table depth: 1..PROBE_STEPS
  const [marks, setMarks] = useState({}); // badPoint -> 'hole' | 'wall'
  const [declared, setDeclared] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);
  const [chipSet, setChipSet] = useState([]);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const activeId = calib && kase ? kase : presetId;
  const P = PRESETS[activeId];
  const inspected = inspect(P.num, P.den, P.bad);

  const checks = calib ? calibChecks(activeId, marks, declared) : [false, false];
  const pct = calib && kase ? closeness(activeId, marks, declared) : 0;
  const calibrated = calib && kase ? isCalibrated(activeId, marks, declared) : false;

  sceneRef.current = {
    P,
    inspected,
    probeK,
    table: !!current.table || calib,
    graph: !!current.graph || calib,
    twin: !!current.twin,
    calib,
    marks,
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

    const INK = '#1c2b3a';
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

    const bandH = 52;
    const tableW = S.table ? Math.min(240, W * 0.34) : 0;
    const plotX0 = 14;
    const plotX1 = W - tableW - 14;
    const plotW = plotX1 - plotX0;
    const plotY0 = bandH + 12;
    const plotY1 = H - 20;
    const XMIN = -6;
    const XMAX = 6;
    const YMIN = -8;
    const YMAX = 8;
    const kx = plotW / (XMAX - XMIN);
    const ky = (plotY1 - plotY0) / (YMAX - YMIN);
    const px = (X, Y) => [plotX0 + (X - XMIN) * kx, plotY1 - (Y - YMIN) * ky];

    const f = (x) => {
      const d = evalPoly(S.P.den, x);
      if (d === 0) return null;
      return evalPoly(S.P.num, x) / d;
    };

    if (S.graph) {
      /* axes */
      ctx.strokeStyle = 'rgba(91,107,123,0.5)';
      ctx.lineWidth = 1.2;
      const [ox0, oy0] = px(0, 0);
      ctx.beginPath();
      ctx.moveTo(plotX0, oy0);
      ctx.lineTo(plotX1, oy0);
      ctx.moveTo(ox0, plotY0);
      ctx.lineTo(ox0, plotY1);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 9.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let v = XMIN; v <= XMAX; v += 2) {
        if (v === 0) continue;
        ctx.fillText(String(v), px(v, 0)[0], oy0 + 5);
      }

      /* the walls */
      for (const r of S.inspected.filter((r) => r.kind === 'wall')) {
        const [wx] = px(r.a, 0);
        ctx.strokeStyle = CARMINE;
        ctx.setLineDash([7, 5]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx, plotY0);
        ctx.lineTo(wx, plotY1);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      /* the reduced twin, dashed blue */
      if (S.twin && S.P.twinPoly) {
        ctx.strokeStyle = BLUE;
        ctx.setLineDash([5, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 100; i++) {
          const X = XMIN + ((XMAX - XMIN) * i) / 100;
          const Y = evalPoly(S.P.twinPoly, X);
          if (Y < YMIN || Y > YMAX) {
            first = true;
            continue;
          }
          const [dx, dy] = px(X, Y);
          if (first) {
            ctx.moveTo(dx, dy);
            first = false;
          } else ctx.lineTo(dx, dy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      /* the curve — per-pixel, path broken at walls and window exits */
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      let pen = false;
      let prevY = null;
      const steps = Math.max(200, Math.floor(plotW));
      for (let i = 0; i <= steps; i++) {
        const X = XMIN + ((XMAX - XMIN) * i) / steps;
        const Y = f(X);
        const bad = Y == null || Y < YMIN || Y > YMAX || (prevY != null && Math.abs(Y - prevY) > (YMAX - YMIN) / 2);
        if (bad) {
          pen = false;
          prevY = Y == null ? null : Y;
          continue;
        }
        const [dx, dy] = px(X, Y);
        if (!pen) {
          ctx.moveTo(dx, dy);
          pen = true;
        } else ctx.lineTo(dx, dy);
        prevY = Y;
      }
      ctx.stroke();
      /* the holes — open circles */
      for (const r of S.inspected.filter((r) => r.kind === 'hole')) {
        const hy = r.height.n / r.height.d;
        if (hy < YMIN || hy > YMAX) continue;
        const [hx, hpy] = px(r.a, hy);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(hx, hpy, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
      /* capstone marks */
      if (S.calib) {
        for (const r of S.inspected) {
          const m = S.marks[r.a];
          if (!m) continue;
          const [mx] = px(r.a, 0);
          ctx.fillStyle = GOLD;
          ctx.font = '700 11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`${m} @ ${r.a}`, mx, plotY0 + 14);
        }
      }
    }

    /* ---- the probe table ---- */
    if (S.table) {
      const tx = W - tableW + 6;
      const a = S.P.bad[S.P.bad.length - 1]; // walk toward the right-most bad point
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`the walk toward x = ${a}`, tx, bandH + 8);
      ctx.font = '600 11.5px ui-monospace, monospace';
      let rowY = bandH + 30;
      for (let k = 1; k <= S.probeK; k++) {
        /* x = a − 1/10^k, exactly */
        const q = 10 ** k;
        const p = a * q - 1;
        const val = evalAtFraction(S.P.num, S.P.den, p, q);
        ctx.fillStyle = GOLD;
        ctx.fillText(`x = ${a} − 1/${q}`, tx, rowY);
        ctx.fillStyle = INK_HEX;
        ctx.fillText(
          val
            ? `f = ${fracText(val)} ≈ ${(val.n / val.d).toFixed(Math.min(4, k + 1))}`
            : 'f = undefined',
          tx,
          rowY + 14
        );
        rowY += 36;
      }
      ctx.fillStyle = CARMINE;
      ctx.fillText(`x = ${a}`, tx, rowY);
      ctx.fillText('f = undefined', tx, rowY + 14);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 16px ui-monospace, monospace';
    const badText = S.inspected
      .map((r) => (r.kind === 'hole' ? `hole @ ${r.a}` : `wall @ ${r.a}`))
      .join('   ·   ');
    ctx.fillText(`f(x) = ${S.P.label}${S.calib ? '' : '   ·   ' + badText}`, W / 2, bandH / 2);
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
    setPresetId(STEPS[step].preset);
    setProbeK(1);
    setMarks({});
    setDeclared(null);
    if (STEPS[step].calib) {
      const c = makeCase(null);
      setKase(c);
      setChipSet(heightChips(c).sort(() => Math.random() - 0.5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const mark = (a, kind) => setMarks((m) => ({ ...m, [a]: kind }));

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setProbeK(1);
    setMarks({});
    setDeclared(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = calib
    ? `The singularity inspector: f(x) = ${P.label}. Forbidden inputs ${P.bad.join(', ')}. ` +
      `Marks: ${P.bad.map((a) => `${a}: ${marks[a] ?? 'unmarked'}`).join('; ')}. Declared ${declared ?? 'nothing'}. ${
        calibrated ? 'Calibrated.' : ''
      }`
    : `f(x) = ${P.label}: ${inspected
        .map((r) => (r.kind === 'hole' ? `a hole at ${r.a}, height ${fracText(r.height)}` : `a wall at ${r.a}`))
        .join('; ')}.`;

  return (
    <div className="rflab">
      <header className="head">
        <h1>Rational Functions: The Hole and the Wall</h1>
        <p className="lede">
          Two functions, both undefined at the same input — one hides a <em>hole</em> (the
          factor cancels), one builds a <em>wall</em> (the factor survives). A table of exact
          values cannot tell them apart. The graph can, and the algebra says why.
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

          {(current.table || calib) && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the probe’s walk (rows)</span>
                  <span className="dial-v mono">{probeK}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={PROBE_STEPS}
                  step={1}
                  value={probeK}
                  onChange={(e) => setProbeK(Number(e.target.value))}
                  aria-label={`Probe rows, ${probeK}`}
                />
              </div>
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Inspection">
            {calib &&
              P.bad.map((a) => (
                <span key={a} className="markgroup">
                  <span className="mono marklabel">x = {a}:</span>
                  <button
                    type="button"
                    className={'chipbtn' + (marks[a] === 'hole' ? ' active' : '')}
                    onClick={() => mark(a, 'hole')}
                  >
                    hole
                  </button>
                  <button
                    type="button"
                    className={'chipbtn neg' + (marks[a] === 'wall' ? ' active' : '')}
                    onClick={() => mark(a, 'wall')}
                  >
                    wall
                  </button>
                </span>
              ))}
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

          {calib && kase && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Posted for inspection</span>
                <span className="target-word mono">f(x) = {P.label}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} every forbidden input classified
                  </li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the hole’s height declared</li>
                </ol>
                <div className="declare" role="group" aria-label="Height">
                  {chipSet.map((c2) => (
                    <button
                      type="button"
                      key={c2.s}
                      className={'declbtn mono' + (declared === c2.s ? ' active' : '')}
                      onClick={() => setDeclared(c2.s)}
                    >
                      {c2.s}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'inspection filed — cause and height on record'
                    : checks[0]
                      ? 'classified — now the height (the twin, evaluated at the hole)'
                      : 'does the factor cancel, or survive?'}
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
                  <span className="mono target-hint">classify · then the height</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const c = makeCase(kase);
                  setKase(c);
                  setMarks({});
                  setDeclared(null);
                  setChipSet(heightChips(c).sort(() => Math.random() - 0.5));
                }}
              >
                Next inspection
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
                  setMarks({});
                  setDeclared(null);
                  setPresetId('holey');
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">cancel → hole · survive → wall</span> &nbsp;·&nbsp; a rational
        function’s forbidden inputs split by whether the zero divides away (A-APR.D.6–7,
        F-IF.C.7d): the cancelled factor leaves a puncture at the twin’s height; the surviving
        factor builds the asymptote. The table hints; the graph shows; the algebra decides.
      </footer>

      <style jsx>{`
        .rflab {
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
        .markgroup {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border: 1px dashed rgba(28, 43, 58, 0.25);
          border-radius: 8px;
        }
        .marklabel {
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-soft);
        }
        .chipbtn {
          font: 600 12px/1.2 system-ui, sans-serif;
          padding: 7px 10px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(63, 116, 166, 0.55);
          background: var(--paper);
          color: var(--blue);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.neg {
          border-color: rgba(200, 30, 79, 0.55);
          color: var(--carmine);
        }
        .chipbtn.active {
          background: rgba(63, 116, 166, 0.12);
          border-color: var(--ink);
        }
        .chipbtn.neg.active {
          background: rgba(200, 30, 79, 0.1);
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
          font-size: 20px;
          font-weight: 700;
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
          font-size: 13px;
          font-weight: 700;
          padding: 7px 12px;
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
        :global(.rflab) :focus-visible {
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
