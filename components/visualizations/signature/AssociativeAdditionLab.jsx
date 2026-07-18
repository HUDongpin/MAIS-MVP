'use client';

/* ============================================================================
   AssociativeAdditionLab — an interactive "bench" for the ASSOCIATIVE PROPERTY
   OF ADDITION,  (a + b) + c = a + (b + c).

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at CCSS
   1.OA.B.3 ("apply properties of operations as strategies to add"), reaching
   forward to 3.OA.B.5 — grades 1–3.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials/lenses that unlock one per lesson step, predict-then-check questions
   gated on ANSWERED (not correct), and a calibration challenge with a live
   match meter and a CALIBRATED stamp.

   ---------------------------------------------------------------------------
   HOW THIS LAB IS DELIBERATELY DISTINCT FROM ITS SIBLINGS
   ---------------------------------------------------------------------------
   AddLab owns two addends, the number line, "count-on" hops, the commutative
   turn-around, and make-a-ten-by-splitting-b.  This lab never draws a number
   line and never hops.  It has THREE addends in a FIXED ORDER, and the only
   thing the student may move is the GROUPING — which pair gets added first.
   Commutativity reorders; associativity regroups.  Keeping those two apart is
   the whole pedagogical job here, so the reorder mechanic is deliberately
   absent and is named only as a contrast (step 3's distractor).

   ---------------------------------------------------------------------------
   THE SIGNATURE CENTERPIECE — "THE RIGHT EDGE NEVER MOVES"
   ---------------------------------------------------------------------------
   Three unit-divided rods (a, b, c) lie end to end in a train.  A train of
   three rods has TWO joints, and "+" only ever joins two numbers — so you must
   pick a joint to glue first.  That choice is the grouping, and it is drawn as
   a literal carmine PARENTHESIS CLAMP around the chosen pair.

   The track then folds downward as a worked evaluation, one row per round:

        (2 + 3) + 6          row 0 — the train, clamped
        = 5 + 6              row 1 — the clamped pair fused into one rod
        = 11                 row 2 — the total

   Every row is left-aligned and every row is the same total length, so all
   three rows END ON THE SAME VERTICAL.  Turn on "Both at once" and the two
   clampings run as two tracks, six rods deep, under ONE gold plumb line: the
   middle rows genuinely differ (5 vs 9) while the right edge refuses to move.
   That is the property, seen rather than asserted.

   ---------------------------------------------------------------------------
   COLOUR / ONE-ACCENT DISCIPLINE (adapted for a PROPERTY lab)
   ---------------------------------------------------------------------------
   CARMINE is the thing being taught: the clamp, the parentheses, and the first
   sum it produces.  The addends are calm and are coloured by ROLE, not by
   identity — a and c are the two outsiders (blue); b is the middle rod, the
   one both clamps compete for, so it earns the second tint (teal).  GOLD marks
   the invariant: the total rod, the plumb line, and the friendly ten.  Gold is
   never used for text (it fails contrast on paper); the total READS in ink and
   is merely underlined in gold.

   ---------------------------------------------------------------------------
   MATH CORRECTNESS CONTRACT
   ---------------------------------------------------------------------------
   Every number in this lab is a whole number and every operation is exact
   integer arithmetic — there is not a single float in the model, so a child can
   never be shown an artefact.  See audit-associative.mjs for the numeric proof
   (the theorem over all 1,331 trios, the a = c partial-sum criterion, the
   subtraction counterexample, and the calibration gate).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/AssociativeAdditionLab.jsx
     2. Import and render it:
          import AssociativeAdditionLab from './AssociativeAdditionLab';
          export default function Page() { return <AssociativeAdditionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, c, grouping, step).
     MODEL  — pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three whole-number addends.

   The unlock ORDER is deliberate and is NOT left-to-right: b unlocks first
   (step 4) because b is the rod in the middle — the only addend both clamps
   compete for, and therefore the one that makes the two first sums move while
   the total stays nailed down. a follows (step 5) as the ten-maker, and c last
   (step 6), when the point is that ALL three are free and the parentheses can
   be dropped. The lesson copy carries this; check any change here against it.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: 0, max: 10, step: 1, unlock: 5, role: 'first addend · the ten-maker' },
  { key: 'b', label: 'b', min: 0, max: 10, step: 1, unlock: 4, role: 'middle addend · both clamps want it' },
  { key: 'c', label: 'c', min: 0, max: 10, step: 1, unlock: 6, role: 'last addend · frees all three' },
];

/* START is chosen so that:
     · both first sums are distinct and interesting  (2+3 = 5,  3+6 = 9)
     · neither clamp is already a ten (nothing is pre-solved)
     · at the make-a-ten step, with only a unlocked and b = 3, the solution
       a + 3 = 10 is UNIQUE — a = 7 — so the instruction has one right answer. */
const START = { a: 2, b: 3, c: 6 };

const GROUP_STEP = 1; // the grouping control unlocks (the star mechanic)
const COMPARE_STEP = 3; // the "Both at once" lens unlocks — the property itself
const MAKETEN_STEP = 5; // regroup to make a ten
const DROP_STEP = 6; // "drop the parentheses" + the subtraction counterexample
const CALIB_STEP = 7;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Exact integer arithmetic. Written as the two groupings the
   lab actually draws, rather than as one `a+b+c`, so that the theorem the lab
   claims is the theorem the code evaluates (and the audit compares them).
   ------------------------------------------------------------------------- */
const groupLeft = (a, b, c) => a + b + c; // (a + b) + c  — evaluated left pair first
const groupRight = (a, b, c) => a + (b + c); // a + (b + c) — evaluated right pair first
const firstSum = (a, b, c, g) => (g === 'L' ? a + b : b + c);
const total = (a, b, c) => a + b + c;

/* The counterexample. A single fixed witness is all a counterexample needs, so
   the foil is NOT wired to the dials — that keeps it free of negative numbers
   (out of scope for grade 1–3) and free of guards. */
const FOIL = { a: 10, b: 3, c: 2 };
const foilLeft = (f) => f.a - f.b - f.c; // (10 − 3) − 2 = 5
const foilRight = (f) => f.a - (f.b - f.c); // 10 − (3 − 2) = 9

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; one control unlocks per step (steps 1, 3,
   4, 5, 6); the reveal lives in `feedback`, never in `body`; Next is gated on
   ANSWERED, not on correct. Distractors are real misconceptions: confusing
   associativity with commutativity, believing the intermediate sums must match,
   and believing left-to-right is a law rather than a convention.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Plus takes two at a time',
    body:
      'The train holds 2 + 3 + 6. But + joins only TWO numbers at a time. ' +
      'Which pair goes first?',
    q: 'Why can’t you add all three at once?',
    choices: ['Plus joins two at a time', 'Too big', 'You just can'],
    answer: 0,
    feedback:
      'Two rounds: join one pair, then add the leftover rod. ' +
      'The parentheses say which pair went first.',
  },
  {
    title: 'Clamp the left pair — (a + b) + c',
    body:
      'Choose (a + b) + c. Read the staircase: 2 + 3 makes 5, then 5 + 6 makes 11. ' +
      'Press “Fold it” to replay.',
    q: 'In (2 + 3) + 6, which addition happens first?',
    choices: ['2 + 3 — inside the parentheses', '3 + 6', '2 + 6'],
    answer: 0,
    feedback: 'The parentheses go first: 2 + 3 = 5. The carmine rod IS that first sum.',
  },
  {
    title: 'Clamp the right pair — a + (b + c)',
    body:
      'Flip the grouping: now 3 + 6 makes 9 first. No rod moved — only the ' +
      'joint changed.',
    q: 'You glue 3 + 6 first. What happens to the TOTAL?',
    choices: ['It stays 11', 'It changes to 9', 'It gets bigger'],
    answer: 0,
    feedback: 'Still 11. The middle rows differ — 5 and 9 — but the bottom rod never changes.',
  },
  {
    title: 'The associative property',
    body:
      'Both clampings run side by side. Different middles, identical bottoms: ' +
      '(a + b) + c = a + (b + c).',
    q: 'What does the property promise?',
    choices: [
      'Regrouping never changes the sum',
      'Reordering never changes the sum',
      'Every sum is 11',
    ],
    answer: 0,
    feedback: 'Grouping is free to choose. Reordering is a DIFFERENT promise — the commutative one.',
  },
  {
    title: 'b — the number in the middle',
    body:
      'Both clamps want b. Slide it — the first sums move, but the bottoms ' +
      'stay welded together.',
    q: 'When are a + b and b + c equal?',
    choices: ['Exactly when a = c', 'Always', 'Only when b = 0'],
    answer: 0,
    feedback: 'Only when a = c. The first sums may differ — the property only welds the TOTALS.',
  },
  {
    title: 'Regroup to make a ten',
    body: 'Set a = 7. Now the left clamp holds 7 + 3 — a friendly ten!',
    q: 'Which grouping of 7 + 3 + 6 is easier in your head?',
    choices: ['(7 + 3) + 6 = 10 + 6', '7 + (3 + 6) = 7 + 9', 'Must work left to right'],
    answer: 0,
    feedback:
      'Both make 16, but 10 + 6 is a gift. The property is your licence ' +
      'to hunt the friendly pair.',
  },
  {
    title: 'So we can drop the parentheses',
    body:
      'Both routes always agree — so we may simply write a + b + c, ' +
      'no parentheses at all.',
    q: 'Why is that safe?',
    choices: ['Both groupings agree', 'They are decoration', 'It is never safe'],
    answer: 0,
    feedback: 'Subtraction has no such gift: (10 − 3) − 2 = 5 but 10 − (3 − 2) = 9!',
  },
  {
    title: 'Make a ten, hit the target',
    body:
      'Reach the grey target — with ONE clamp holding exactly 10. ' +
      'Press “New target” for more.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's sanctioned
   alternative to curve-matching, precedent AddLab / CubeLab / NumberLab): hit
   a target total AND engineer a friendly ten AND clamp it. That is the whole
   lab in one act — the property is what makes the third part legal.

   The meter is deliberately DIAGNOSTIC, not a distance: it pays 60 for the
   total, 25 for creating a ten, and 15 for actually clamping it, so a student
   who is close can see WHICH part is missing.

   The stamp is gated on exact integer conditions, never on the meter, and the
   two agree exactly:  pct === 100  ⟺  isCalibrated.
     · 60·totalScore = 60 requires |sum − T| = 0, i.e. totalOK
     · tenOK ⟹ hasTen, so the 25 is implied by the 15
   Both directions are swept in audit-associative.mjs, so a wrong build can
   never be stamped and a right build can never read below 100.
   ------------------------------------------------------------------------- */
const TEN = 10;
const hasTen = (a, b, c) => a + b === TEN || b + c === TEN;
const tenClamped = (a, b, c, g) => (g === 'L' ? a + b === TEN : b + c === TEN);

const matchPercent = (a, b, c, g, T) => {
  const totalScore = Math.max(0, 1 - Math.abs(total(a, b, c) - T) / 10);
  return 60 * totalScore + 25 * (hasTen(a, b, c) ? 1 : 0) + 15 * (tenClamped(a, b, c, g) ? 1 : 0);
};
const isCalibrated = (a, b, c, g, T) => total(a, b, c) === T && tenClamped(a, b, c, g);

/* Targets 12…20 are exactly the reachable ones: a ten plus a leftover c in
   [2, 10]. (T = 11 would force c = 1 and T = 21 would force c = 11 > max.) */
function makeTarget(prev) {
  let T;
  do {
    T = 12 + Math.floor(Math.random() * 9); // 12 … 20
  } while (prev != null && T === prev);
  return T;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
const MINUS = '−'; // a real minus sign, not a hyphen
const NE = '≠'; // ≠
const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
  'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_WORD = ['twenty', 'thirty'];
function word(n) {
  if (n < 20) return ONES[n];
  const t = TENS_WORD[Math.floor(n / 10) - 2];
  const r = n % 10;
  return r ? `${t}-${ONES[r]}` : t;
}

/* EDIT 5 — Equation display. The worked evaluation, colour-coded to match the
   rods exactly: a and c in the outsider blue, b in the middle-rod teal, the
   parentheses and the first sum in the carmine accent, and the total in ink
   under a gold rule. (Gold text would fail contrast on paper — the total reads
   in ink and only its underline is gold.) */
function AssocEquation({ a, b, c, grouping, meet }) {
  if (meet) {
    return (
      <span className="eq">
        <span className="t-a">{a}</span>
        <span className="t-op"> + </span>
        <span className="t-b">{b}</span>
        <span className="t-op"> + </span>
        <span className="t-a">{c}</span>
        <span className="t-op"> = </span>
        <span className="t-q">?</span>
      </span>
    );
  }
  const left = grouping === 'L';
  const first = firstSum(a, b, c, grouping);
  return (
    <span className="eq">
      {left ? (
        <>
          <span className="t-par">(</span>
          <span className="t-a">{a}</span>
          <span className="t-op"> + </span>
          <span className="t-b">{b}</span>
          <span className="t-par">)</span>
          <span className="t-op"> + </span>
          <span className="t-a">{c}</span>
        </>
      ) : (
        <>
          <span className="t-a">{a}</span>
          <span className="t-op"> + </span>
          <span className="t-par">(</span>
          <span className="t-b">{b}</span>
          <span className="t-op"> + </span>
          <span className="t-a">{c}</span>
          <span className="t-par">)</span>
        </>
      )}
      <span className="t-op"> = </span>
      {left ? (
        <>
          <span className="t-first">{first}</span>
          <span className="t-op"> + </span>
          <span className="t-a">{c}</span>
        </>
      ) : (
        <>
          <span className="t-a">{a}</span>
          <span className="t-op"> + </span>
          <span className="t-first">{first}</span>
        </>
      )}
      <span className="t-op"> = </span>
      <span className="t-total">{total(a, b, c)}</span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function AssociativeAdditionLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [grouping, setGrouping] = useState('L'); // 'L' = (a+b)+c   'R' = a+(b+c)
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [compare, setCompare] = useState(false);
  const [folding, setFolding] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // 'L' | 'R' — the joint under the pointer
  const foldRef = useRef(null); // during the fold animation: progress 0…1
  const geoRef = useRef({ joints: [] }); // joint hit-boxes, stashed by draw()
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const meet = step === 0;
  const sum = total(a, b, c);
  const groupUnlocked = step >= GROUP_STEP;
  const compareUnlocked = step >= COMPARE_STEP;

  // Snapshot everything the renderer needs, so draw() (a stable callback) and
  // the pointer/animation handlers never read stale values.
  sceneRef.current = {
    a,
    b,
    c,
    grouping,
    meet,
    calib,
    target,
    compare: compare && !meet && !calib,
    foil: step === DROP_STEP,
    tenMark: step === MAKETEN_STEP || calib,
    interactive: groupUnlocked,
  };

  const pct = target != null ? matchPercent(a, b, c, grouping, target) : 0;
  const calibrated = target != null ? isCalibrated(a, b, c, grouping, target) : false;

  /* ---- full redraw from state -------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped for perf & crisp lines
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept in one place so the drawing matches the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F';
    const BLUE = '#3F74A6'; // a and c — the two outsiders
    const TEAL = '#2E8B6F'; // b — the rod in the middle
    const GOLD = '#D9982B'; // the invariant: total, plumb line, the friendly ten
    const GOLD_EDGE = '#B87F1D';
    const BLUE_SOFT = 'rgba(63,116,166,0.16)';
    const TEAL_SOFT = 'rgba(46,139,111,0.16)';
    const CARM_SOFT = 'rgba(200,30,79,0.14)';
    const GOLD_SOFT = 'rgba(217,152,43,0.20)';
    const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

    const S = sceneRef.current;
    const A = S.a;
    const B = S.b;
    const C = S.c;
    const TOT = A + B + C;
    const showTwo = S.compare;

    ctx.clearRect(0, 0, W, H);

    /* ---- geometry ---------------------------------------------------------
       Scale: one shared unit for every rod on the canvas, so lengths are always
       comparable. On the calibration step the basis is FROZEN at the dial
       maximum (30) so that the grey target length stays put while the train
       grows toward it; elsewhere it fits the current total, so the picture
       stays generous at small totals without ever overflowing.               */
    const padL = 30;
    const padR = 30;
    const top = 12;
    const foilH = S.foil ? 78 : 0;
    const basis = S.calib ? 30 : Math.max(TOT, 6);
    const spanW = W - padL - padR;
    const u = Math.min(46, spanW / basis);
    const nx = (v) => padL + v * u;

    /* ---- quadrille paper: faint unit gridlines, bold every five ------------ */
    for (let v = 0; nx(v) <= W - 1; v++) {
      const X = Math.round(nx(v)) + 0.5;
      ctx.strokeStyle = v % 5 === 0 ? 'rgba(199,216,228,0.95)' : 'rgba(199,216,228,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H - foilH);
      ctx.stroke();
    }

    /* ---- small drawing helpers -------------------------------------------- */
    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // Draw a run of coloured text pieces left to right. This is what keeps the
    // on-canvas captions colour-locked to the rods beneath them.
    const drawRuns = (x, y, runs, font) => {
      ctx.save();
      ctx.font = font;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      let cx = x;
      for (const r of runs) {
        ctx.fillStyle = r.c;
        ctx.fillText(r.t, cx, y);
        cx += ctx.measureText(r.t).width;
      }
      ctx.restore();
    };

    // One unit-divided rod: soft fill, white unit seams (so it stays countable),
    // coloured outline, centred count label.
    const drawRod = (v0, len, y, h, fill, edge, label, labelColor) => {
      if (len <= 0) return;
      const x0 = nx(v0);
      const x1 = nx(v0 + len);
      ctx.save();
      ctx.fillStyle = fill;
      ctx.fillRect(x0, y, x1 - x0, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      for (let k = 1; k < len; k++) {
        const X = Math.round(nx(v0 + k)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(X, y);
        ctx.lineTo(X, y + h);
        ctx.stroke();
      }
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1.8;
      ctx.strokeRect(x0 + 0.5, y + 0.5, x1 - x0 - 1, h - 1);
      if (label != null && x1 - x0 > 15) {
        ctx.fillStyle = labelColor || edge;
        ctx.font = `700 ${Math.round(Math.min(15, h * 0.52))}px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, (x0 + x1) / 2, y + h / 2 + 0.5);
      }
      ctx.restore();
    };

    /* ---- the fold animation -----------------------------------------------
       The loop mutates foldRef and calls draw() DIRECTLY with no re-render, so
       the progress must be read LIVE from the ref here — reading it from the
       render-time scene snapshot would leave it stale and the rows would never
       appear. (Same trap AddLab's count-on hit.) When foldRef is null the
       tableau is simply complete, so a static render is always meaningful.  */
    const rowAlpha = (i) => {
      if (i === 0) return 1;
      const t = foldRef.current;
      if (t == null) return 1;
      const start = i === 1 ? 0.34 : 0.7;
      return Math.max(0, Math.min(1, (t - start) / 0.16));
    };

    /* ---- calibration: the grey dashed target length ------------------------ */
    let tracksTop = top;
    if (S.calib && S.target != null) {
      const gy = top + 12;
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(nx(0), gy);
      ctx.lineTo(nx(S.target), gy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(nx(0), gy - 6);
      ctx.lineTo(nx(0), gy + 6);
      ctx.moveTo(nx(S.target), gy - 6);
      ctx.lineTo(nx(S.target), gy + 6);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = `600 12px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`build ${S.target}`, (nx(0) + nx(S.target)) / 2, gy - 8);
      ctx.restore();
      tracksTop = gy + 14;
    }

    const tracksH = H - tracksTop - foilH - 8;
    const tracks = showTwo ? ['L', 'R'] : [S.grouping];
    const slotH = tracksH / tracks.length;

    /* ---- the gold "friendly ten" marker ----------------------------------- */
    if (S.tenMark && nx(TEN) < W - padR + 2) {
      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(nx(TEN), tracksTop);
      ctx.lineTo(nx(TEN), H - foilH - 6);
      ctx.stroke();
      ctx.restore();
      // The label rides at the TOP of the marker: at the bottom it was both
      // clipped by the canvas edge and covered by the colour legend.
      ctx.save();
      ctx.fillStyle = GOLD_EDGE;
      ctx.font = `700 11px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const tenLabelY = tracksTop + 2;
      ctx.fillStyle = 'rgba(251,251,248,0.95)';
      ctx.fillRect(nx(TEN) - 11, tenLabelY - 1, 22, 14);
      ctx.fillStyle = GOLD_EDGE;
      ctx.fillText('10', nx(TEN), tenLabelY);
      ctx.restore();
    }

    /* ---- a track: one grouping, folded down into a worked evaluation ------- */
    const joints = [];
    const drawTrack = (g, slotTop, active) => {
      const left = g === 'L';
      // capH must clear the caption's descenders from the clamp outline that
      // sits 4px above the rod — at capH 15 the carmine clamp struck straight
      // through "(2 + 3)".
      const capH = 20;
      const gap = showTwo ? 8 : 26;
      const rodH = showTwo
        ? Math.min(28, Math.max(16, slotH / 3 - capH - gap))
        : Math.min(42, Math.max(20, slotH / 3 - capH - gap - 12));
      const rowBlock = capH + rodH + gap;
      const rows = S.meet ? 1 : 3;
      const blockH = rowBlock * rows - gap;
      const y0 = slotTop + Math.max(0, (slotH - blockH) / 2);
      const rowY = (i) => y0 + i * rowBlock + capH;
      const capBase = (i) => rowY(i) - 11; // caption baseline, clear of the clamp
      const capFont = `600 ${showTwo ? 12 : 13}px ${MONO}`;

      /* the active-track rail: in "both at once" the two tracks are drawn with
         equal weight (that is the argument), so the current grouping is marked
         only by a quiet carmine rail — enough to anchor the equation readout
         and the calibration to a definite choice. */
      if (showTwo && active) {
        ctx.save();
        ctx.fillStyle = 'rgba(200,30,79,0.55)';
        ctx.fillRect(padL - 14, y0 - 2, 3, blockH + 4);
        ctx.restore();
      }

      /* ---- row 0: the train, and the clamp ---------------------------------- */
      const y = rowY(0);
      if (S.meet) {
        drawRuns(
          nx(0),
          capBase(0),
          [
            { t: String(A), c: BLUE },
            { t: ' + ', c: INK_SOFT },
            { t: String(B), c: TEAL },
            { t: ' + ', c: INK_SOFT },
            { t: String(C), c: BLUE },
            { t: '  =  ', c: INK_SOFT },
            { t: '?', c: CARMINE },
          ],
          capFont
        );
      } else {
        drawRuns(
          nx(0),
          capBase(0),
          left
            ? [
                { t: '(', c: CARMINE },
                { t: String(A), c: BLUE },
                { t: ' + ', c: INK_SOFT },
                { t: String(B), c: TEAL },
                { t: ')', c: CARMINE },
                { t: ' + ', c: INK_SOFT },
                { t: String(C), c: BLUE },
              ]
            : [
                { t: String(A), c: BLUE },
                { t: ' + ', c: INK_SOFT },
                { t: '(', c: CARMINE },
                { t: String(B), c: TEAL },
                { t: ' + ', c: INK_SOFT },
                { t: String(C), c: BLUE },
                { t: ')', c: CARMINE },
              ],
          capFont
        );
      }

      drawRod(0, A, y, rodH, BLUE_SOFT, BLUE, String(A), BLUE);
      drawRod(A, B, y, rodH, TEAL_SOFT, TEAL, String(B), TEAL);
      drawRod(A + B, C, y, rodH, BLUE_SOFT, BLUE, String(C), BLUE);

      // the two joints — the whole reason a choice exists
      const jL = { x: nx(A), y: y + rodH / 2, g: 'L' };
      const jR = { x: nx(A + B), y: y + rodH / 2, g: 'R' };
      if (S.interactive) joints.push(jL, jR);

      if (S.meet) {
        // "?" bubbles: two joints, and no way to proceed without choosing one
        for (const j of [jL, jR]) {
          ctx.save();
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(j.x, j.y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = CARMINE;
          ctx.font = `700 14px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', j.x, j.y + 0.5);
          ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = INK_SOFT;
        ctx.font = `600 12px ${MONO}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('two joints — which pair first?', nx(0), y + rodH + 12);
        ctx.restore();
      } else {
        // THE CLAMP: a carmine bracket closing around the chosen pair. The
        // caption directly above already carries carmine parentheses spanning
        // exactly this x-range, so drawing glyph parens here too was redundant
        // AND collided with the bracket's ends — the bracket alone is cleaner
        // and keeps the symbol↔picture link intact.
        const gx0 = left ? nx(0) : nx(A);
        const gx1 = Math.max(left ? nx(A + B) : nx(TOT), (left ? nx(0) : nx(A)) + 12);
        ctx.save();
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 2.2;
        roundRect(gx0 - 5, y - 4, gx1 - gx0 + 10, rodH + 8, 7);
        ctx.stroke();
        ctx.restore();

        // the joint you did NOT choose stays visible as a click target
        const other = left ? jR : jL;
        const hovered = hoverRef.current;
        ctx.save();
        ctx.strokeStyle = hovered === other.g ? CARMINE : 'rgba(91,107,123,0.55)';
        ctx.fillStyle = '#fff';
        ctx.lineWidth = hovered === other.g ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.arc(other.x, other.y, hovered === other.g ? 9 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (S.meet) return { y0, blockH };

      /* ---- row 1: the clamped pair, fused into one carmine rod ------------- */
      const first = left ? A + B : B + C;
      const y1 = rowY(1);
      ctx.save();
      ctx.globalAlpha = rowAlpha(1);
      drawRuns(
        nx(0),
        capBase(1),
        left
          ? [
              { t: '= ', c: INK_SOFT },
              { t: String(first), c: CARMINE },
              { t: ' + ', c: INK_SOFT },
              { t: String(C), c: BLUE },
            ]
          : [
              { t: '= ', c: INK_SOFT },
              { t: String(A), c: BLUE },
              { t: ' + ', c: INK_SOFT },
              { t: String(first), c: CARMINE },
            ],
        capFont
      );
      if (left) {
        drawRod(0, A + B, y1, rodH, CARM_SOFT, CARMINE, String(first), CARMINE);
        drawRod(A + B, C, y1, rodH, BLUE_SOFT, BLUE, String(C), BLUE);
      } else {
        drawRod(0, A, y1, rodH, BLUE_SOFT, BLUE, String(A), BLUE);
        drawRod(A, B + C, y1, rodH, CARM_SOFT, CARMINE, String(first), CARMINE);
      }
      ctx.restore();

      /* ---- row 2: the total ------------------------------------------------ */
      const y2 = rowY(2);
      ctx.save();
      ctx.globalAlpha = rowAlpha(2);
      drawRuns(
        nx(0),
        capBase(2),
        [
          { t: '= ', c: INK_SOFT },
          { t: String(TOT), c: INK },
        ],
        `700 ${showTwo ? 12.5 : 14}px ${MONO}`
      );
      drawRod(0, TOT, y2, rodH, GOLD_SOFT, GOLD_EDGE, String(TOT), INK);
      ctx.restore();

      return { y0, blockH };
    };

    let firstTrackTop = null;
    let lastTrackBottom = null;
    tracks.forEach((g, i) => {
      const slotTop = tracksTop + i * slotH;
      const r = drawTrack(g, slotTop, g === S.grouping);
      if (i === 0) firstTrackTop = r.y0;
      lastTrackBottom = r.y0 + r.blockH;
    });
    geoRef.current = { joints };

    /* ---- THE PLUMB LINE: the right edge that never moves ------------------
       Every row of every track ends at nx(TOT) — that is the theorem. Drawn
       last so it reads as the thing pinning the whole picture down.         */
    if (!S.meet && TOT > 0) {
      const X = nx(TOT);
      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(X, firstTrackTop - 10);
      ctx.lineTo(X, lastTrackBottom + 8);
      ctx.stroke();
      ctx.restore();

      if (showTwo) {
        const label = 'same end';
        ctx.save();
        ctx.font = `700 11px ${MONO}`;
        const tw = ctx.measureText(label).width;
        const bx = Math.min(X + 6, W - tw - 12);
        // clamped: on a phone the first track starts ~16px down, so an
        // unclamped badge floated off the top of the canvas
        const by = Math.max(2, firstTrackTop - 24);
        ctx.fillStyle = 'rgba(251,251,248,0.95)';
        roundRect(bx - 5, by, tw + 10, 17, 5);
        ctx.fill();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = GOLD_EDGE;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx, by + 9);
        ctx.restore();
      }
    }

    /* ---- the counterexample: subtraction is NOT associative ----------------
       Deliberately drawn in neutral slate, never carmine — carmine belongs to
       the property, and this is the thing that lacks it. Fixed numbers: one
       witness is all a counterexample needs.                                */
    if (S.foil) {
      const F = FOIL;
      const fy = H - foilH + 4;
      const fh = foilH - 12;
      ctx.save();
      ctx.fillStyle = 'rgba(251,251,248,0.96)';
      roundRect(padL, fy, W - padL - padR, fh, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(91,107,123,0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const boxW = W - padL - padR;
      const narrow = boxW < 380;

      ctx.fillStyle = INK_SOFT;
      ctx.font = `600 10.5px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(
        narrow
          ? `${MINUS} IS NOT ASSOCIATIVE`
          : `${MINUS} IS NOT ASSOCIATIVE — HERE THE PARENTHESES DO MATTER`,
        padL + 12,
        fy + 8
      );

      // the two lines set the width budget, so measure them before deciding
      // whether the badge has anywhere to go
      const l1 = `(${F.a} ${MINUS} ${F.b}) ${MINUS} ${F.c}  =  ${F.a - F.b} ${MINUS} ${F.c}  =  ${foilLeft(F)}`;
      const l2 = `${F.a} ${MINUS} (${F.b} ${MINUS} ${F.c})  =  ${F.a} ${MINUS} ${F.b - F.c}  =  ${foilRight(F)}`;
      ctx.font = `600 ${Math.min(13, Math.max(10, boxW / 26))}px ${MONO}`;
      ctx.fillStyle = INK;
      ctx.fillText(l1, padL + 12, fy + 26);
      ctx.fillText(l2, padL + 12, fy + 44);
      const longest = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width);

      // The badge is a flourish — both lines already end in their answer. On a
      // phone it collided with line 1 and read as "7 − 25 ≠ 95", so it only
      // appears when it genuinely clears the text.
      const badge = `${foilLeft(F)} ${NE} ${foilRight(F)}`;
      ctx.font = `700 14px ${MONO}`;
      const tw = ctx.measureText(badge).width;
      const bx = padL + boxW - tw - 24;
      if (bx > padL + 12 + longest + 16) {
        ctx.fillStyle = 'rgba(91,107,123,0.1)';
        roundRect(bx - 10, fy + fh / 2 - 13, tw + 20, 26, 6);
        ctx.fill();
        ctx.fillStyle = INK_SOFT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(badge, bx, fy + fh / 2);
      }
      ctx.restore();
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, c, grouping, step, target, compare, folding, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* step transitions: reveal the compare lens on its step, and hand the
     calibration a target the first time we reach it — with the dials zeroed so
     it always starts clearly un-matched and un-stamped. */
  useEffect(() => {
    setFolding(false);
    if (step === COMPARE_STEP) setCompare(true);
    if (step === CALIB_STEP) setCompare(false); // one clamp, unambiguously yours
    if (STEPS[step].calib && target == null) {
      setTarget(makeTarget(null));
      setA(0);
      setB(0);
      setC(0);
      setGrouping('L');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the fold animation — the staircase collapses one row at a time. Opt-in,
     time-based (never per-frame), and reduced-motion aware. */
  useEffect(() => {
    if (!folding) {
      foldRef.current = null;
      draw();
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setFolding(false);
      return;
    }
    let raf;
    let start = null;
    const DUR = 1900;
    foldRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const t = (now - start) / DUR;
      foldRef.current = Math.min(1, t);
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else {
        foldRef.current = null;
        setFolding(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [folding, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'a') setA(v);
    else if (key === 'b') setB(v);
    else setC(v);
    if (folding) setFolding(false);
  };

  const pickGroup = (g) => {
    setGrouping(g);
    if (folding) setFolding(false);
  };

  // Pointer → joint. The hit-boxes are stashed by draw() rather than recomputed
  // here, so the handler can never disagree with the picture.
  const jointAt = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let best = null;
    let bestD = 20;
    for (const j of geoRef.current.joints) {
      const d = Math.hypot(j.x - x, j.y - y);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    return best;
  };

  const onPointerMove = (e) => {
    const j = jointAt(e);
    const g = j ? j.g : null;
    if (g !== hoverRef.current) {
      hoverRef.current = g;
      draw();
    }
  };
  const onPointerLeave = () => {
    if (hoverRef.current != null) {
      hoverRef.current = null;
      draw();
    }
  };
  const onPointerDown = (e) => {
    const j = jointAt(e);
    if (j) pickGroup(j.g);
  };

  const resetDials = () => {
    if (calib) {
      setA(0);
      setB(0);
      setC(0);
    } else {
      setA(START.a);
      setB(START.b);
      setC(START.c);
    }
    setGrouping('L');
    if (folding) setFolding(false);
  };

  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };

  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* the diagnostic hint: name the part that is missing, never the answer */
  let calibHint = '';
  if (target != null) {
    if (sum !== target) calibHint = `total ${sum} → need ${target}`;
    else if (!hasTen(a, b, c)) calibHint = 'total ✓ — now make a clamp equal 10';
    else calibHint = 'ten ✓ — now clamp that joint';
  }

  /* The spoken description follows the same reveal schedule as the facts, so a
     screen-reader user gets to predict too rather than being told the answer
     one step early. */
  const spokenTrain = `${word(a)} plus ${word(b)} plus ${word(c)}.`;
  const spokenOne =
    grouping === 'L'
      ? `Clamping the left pair: ${word(a)} plus ${word(b)} is ${word(a + b)}, then ${word(a + b)} plus ${word(c)} is ${word(sum)}.`
      : `Clamping the right pair: ${word(b)} plus ${word(c)} is ${word(b + c)}, then ${word(a)} plus ${word(b + c)} is ${word(sum)}.`;
  const spoken = meet
    ? `${spokenTrain} Plus joins only two numbers at a time, so which pair do you add first?`
    : step < GROUP_STEP + 1
    ? `${spokenTrain} ${spokenOne}`
    : `${spokenTrain} Clamping the left pair: ${word(a)} plus ${word(b)} is ${word(a + b)}, then ` +
      `${word(a + b)} plus ${word(c)} is ${word(sum)}. Clamping the right pair: ${word(b)} plus ${word(c)} is ` +
      `${word(b + c)}, then ${word(a)} plus ${word(b + c)} is ${word(sum)}. ` +
      `Both make ${word(sum)} — regrouping does not change the total.`;

  return (
    <div className="aalab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Associative Property of Addition</h1>
        <p className="lede">
          Move the clamp: the middle row changes, and the right-hand edge <em>refuses to</em>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <AssocEquation a={a} b={b} c={c} grouping={grouping} meet={meet} />
            </p>
            {/* The mirror line shows the OTHER grouping already worked out, so
                it stays hidden until step 2 introduces that clamp — at step 1
                it would have answered "does the total change?" in advance. */}
            <p className="equation-sub mono">
              {meet
                ? 'which pair goes first?'
                : step < GROUP_STEP + 1
                ? 'the pair inside the ( ) is added first'
                : grouping === 'L'
                ? `${a} + (${b} + ${c}) = ${a} + ${b + c} = ${sum}  ·  the other way round`
                : `(${a} + ${b}) + ${c} = ${a + b} + ${c} = ${sum}  ·  the other way round`}
            </p>
          </div>

          <div
            className={'stage' + (hoverRef.current ? ' pick' : '')}
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerDown={onPointerDown}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            {/* The colour legend and the counterexample inset both want the
                bottom strip of the stage — with both up, the legend covered the
                foil's second line. The foil step speaks for itself, so the
                legend stands down there. */}
            {step !== DROP_STEP && (
              <span className="hint mono">carmine ( ) = the pair you add first · gold = the total</span>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — you built ${word(target)} with a ten inside.` : ''}
          </p>

          {/* The facts unfold with the lesson. Stating "total · either way" and
              "the property, checked ✓" from step 0 would answer step 2's and
              step 3's predictions before they are asked — the reveal belongs in
              the feedback. Until a fact is earned it reads "?", which is also
              the honest answer: with no pair chosen there IS no total yet. */}
          <div className="facts">
            <div className="fact">
              <span className="fact-k">First sum · left clamp (a + b)</span>
              {step >= GROUP_STEP ? (
                <span className="fact-v mono carm">
                  {a} + {b} = {a + b}
                </span>
              ) : (
                <span className="fact-v mono held">?</span>
              )}
            </div>
            <div className="fact">
              <span className="fact-k">First sum · right clamp (b + c)</span>
              {step >= GROUP_STEP + 1 ? (
                <span className="fact-v mono carm">
                  {b} + {c} = {b + c}
                </span>
              ) : (
                <span className="fact-v mono held">?</span>
              )}
            </div>
            <div className="fact">
              <span className="fact-k">
                {step >= COMPARE_STEP ? 'Total · either way' : 'Total'}
              </span>
              {step >= GROUP_STEP ? (
                <span className="fact-v mono big gold-rule">{sum}</span>
              ) : (
                <span className="fact-v mono big held">?</span>
              )}
            </div>
            <div className="fact">
              <span className="fact-k">The property, checked</span>
              {step >= COMPARE_STEP ? (
                <span className="fact-v mono ok">
                  {a + b} + {c} = {a} + {b + c} = {sum} ✓
                </span>
              ) : (
                <span className="fact-v mono held">?</span>
              )}
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (folding ? ' on' : '')}
              onClick={() => setFolding((f) => !f)}
              disabled={meet}
            >
              {folding ? 'Folding…' : 'Fold it'}
            </button>
            <button type="button" className="btn ghost" onClick={resetDials}>
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

          {/* the grouping control and the compare lens unlock with the lesson,
              exactly as the dials do — so every control lives in one place with
              one lock treatment. */}
          <div className="controls">
            <div className={'ctl' + (groupUnlocked ? '' : ' locked')}>
              <span className="ck par">( )</span>
              <span className="crole">
                {groupUnlocked ? 'grouping · which pair you add first' : 'unlocks soon'}
              </span>
              <div className="seg" role="group" aria-label="Grouping">
                {/* While the control is still locked NEITHER segment reads as
                    chosen — step 0's whole question is "which pair first?", and
                    a pre-highlighted segment would answer it before the student
                    does. The canvas shows two "?" joints to match. */}
                <button
                  type="button"
                  className={'segb' + (groupUnlocked && grouping === 'L' ? ' on' : '')}
                  aria-pressed={groupUnlocked && grouping === 'L'}
                  disabled={!groupUnlocked}
                  onClick={() => pickGroup('L')}
                >
                  (a + b) + c
                </button>
                <button
                  type="button"
                  className={'segb' + (groupUnlocked && grouping === 'R' ? ' on' : '')}
                  aria-pressed={groupUnlocked && grouping === 'R'}
                  disabled={!groupUnlocked}
                  onClick={() => pickGroup('R')}
                >
                  a + (b + c)
                </button>
              </div>
            </div>

            <div className={'ctl' + (compareUnlocked ? '' : ' locked')}>
              <span className="ck lens" aria-hidden="true">
                ⧉
              </span>
              <span className="crole">
                {compareUnlocked ? 'lens · run both clampings side by side' : 'unlocks soon'}
              </span>
              <div className="seg">
                <button
                  type="button"
                  className={'segb wide' + (compare ? ' on' : '')}
                  aria-pressed={compare}
                  disabled={!compareUnlocked || calib || meet}
                  onClick={() => setCompare((v) => !v)}
                >
                  {compare ? 'Both at once — on' : 'Both at once'}
                </button>
              </div>
            </div>
          </div>

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = { a, b, c }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className={'dk ' + d.key}>{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? val : '🔒'}</output>
                </label>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
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
                    <button
                      type="button"
                      key={i}
                      className={cls}
                      onClick={() => choose(i)}
                      disabled={chosen != null}
                    >
                      <span className="mark" aria-hidden="true">
                        {chosen != null && isCorrect ? '✓' : chosen != null && isChosen ? '✕' : ''}
                      </span>
                      {ch}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target != null && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">{calibHint}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setA(0);
                  setB(0);
                  setC(0);
                  setGrouping('L');
                }}
              >
                New target
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
                  setTarget(null);
                  setCompare(false);
                  setGrouping('L');
                  setA(START.a);
                  setB(START.b);
                  setC(START.c);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">(a + b) + c = a + (b + c)</span> &nbsp;·&nbsp; the associative property
        of addition — regrouping the addends never changes the sum, which is exactly why{' '}
        <span className="mono">a + b + c</span> may be written without parentheses at all (CCSS
        1.OA.B.3).
      </footer>

      <style jsx>{`
        .aalab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --addend: #3f74a6;
          --mid: #2e8b6f;
          --quad: #c7d8e4;
          --gold: #d9982b;
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
          max-width: 68ch;
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
            grid-template-columns: 1fr;
          }
        }
        .panel {
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .equation {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 21px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .equation .t-a {
          color: var(--addend);
        }
        .equation .t-b {
          color: var(--mid);
        }
        .equation .t-par,
        .equation .t-first,
        .equation .t-q {
          color: var(--curve);
          font-weight: 700;
        }
        .equation .t-op {
          color: var(--ink-soft);
        }
        /* Gold text fails contrast on paper, so the total READS in ink and is
           only underlined in gold — the accent without the illegibility. */
        .equation .t-total {
          color: var(--ink);
          font-weight: 700;
          border-bottom: 2px solid var(--gold);
          padding-bottom: 1px;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 8 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage.pick {
          cursor: pointer;
        }
        /* On a phone the 8:5 stage is too short for two stacked tracks (six rod
           rows plus their captions), so go taller than wide. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 5 / 6;
          }
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          position: absolute;
          left: 10px;
          bottom: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.96);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 460px) {
          .facts {
            grid-template-columns: 1fr;
          }
        }
        .fact {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 6px 0;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 15px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.carm {
          color: var(--curve);
          font-weight: 700;
        }
        /* a fact the lesson has not reached yet */
        .fact-v.held {
          color: var(--ink-soft);
          opacity: 0.5;
          font-weight: 700;
        }
        .fact-v.ok {
          color: var(--ok);
          font-weight: 600;
          font-size: 13.5px;
        }
        .fact-v.big {
          font-size: 21px;
          font-weight: 700;
        }
        .fact-v.gold-rule {
          border-bottom: 2px solid var(--gold);
          align-self: start;
          padding: 0 2px 1px;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
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
        .btn.ghost.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
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
          background: var(--curve);
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
        .controls {
          display: grid;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(28, 43, 58, 0.1);
        }
        .ctl {
          display: grid;
          grid-template-columns: 30px 1fr;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 3px 8px;
        }
        .ctl.locked {
          opacity: 0.5;
        }
        .ck {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-size: 18px;
          text-align: center;
        }
        .ck.par {
          color: var(--curve);
          font-weight: 700;
        }
        .ck.lens {
          color: var(--ink-soft);
        }
        .crole {
          font-size: 11px;
          color: var(--ink-soft);
        }
        .seg {
          display: flex;
          gap: 6px;
        }
        .segb {
          flex: 1;
          font: 600 12.5px/1 var(--mono);
          padding: 8px 6px;
          border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.22);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .segb.wide {
          flex: none;
          padding: 8px 12px;
        }
        .segb:not(:disabled):hover {
          border-color: var(--ink);
        }
        .segb.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .segb:disabled {
          cursor: not-allowed;
        }
        .dials {
          display: grid;
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 48px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
        }
        .dial.locked {
          opacity: 0.5;
        }
        .dk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 19px;
        }
        .dk.a,
        .dk.c {
          color: var(--addend);
        }
        .dk.b {
          color: var(--mid);
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 15px;
          font-weight: 600;
        }
        .quiz {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
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
          border-left: 3px solid var(--curve);
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
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
          text-align: right;
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
        :global(.aalab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .segb,
          .meter-fill,
          .choice {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
