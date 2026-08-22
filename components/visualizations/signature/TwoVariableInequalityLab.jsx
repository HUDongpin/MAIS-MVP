'use client';

/* ============================================================================
   TwoVariableInequalityLab — an interactive "bench" for the LINEAR INEQUALITY
        IN TWO VARIABLES,   y  {<, ≤, >, ≥}  m·x + b,
   whose solution is a HALF-PLANE.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   CCSS: HSA-REI.D.12 (graph the solutions to a linear inequality in two
   variables as a half-plane, boundary included or not), with an 8.EE.B.5/6
   on-ramp.  Algebra 1.

   House style: the interactive-math-bench standard — one carmine accent for the
   mathematical object, dials that unlock one per lesson step, predict-then-check
   questions gated on ANSWERED (not on correct), and a capstone construction
   challenge with a live meter stamped CALIBRATED on success.

   ---------------------------------------------------------------------------
   WHY A NEW LAB — and how it is DISTINCT from its siblings.

   InequalityLab (a·x + b OP c) owns the ONE-variable story: a NUMBER LINE, a
   boundary POINT, an open ○ / closed ● circle, a solution RAY, and THE FLIP
   (dividing by a negative reverses the sign).  Nothing here re-tells that.

   This lab is the next standard, and it changes the ambient space:

       one variable  →  the answer is a RAY      on a LINE   (a set of NUMBERS)
       two variables →  the answer is a HALF-PLANE in a PLANE (a set of POINTS)

   Concretely distinct machinery, not a re-skin:
     • the stage is a coordinate PLANE with EQUAL x/y scales, not a number line;
     • the boundary is a LINE (dashed vs solid), not a circle (open vs closed);
     • the probe is a point (x, y) draggable in TWO dimensions, not along one;
     • m = 0 is ALLOWED and instructive (a horizontal fence) — the sibling had
       to forbid a = 0, because there a = 0 destroys the x-term;
     • THE FLIP DOES NOT APPEAR, and its absence is itself a lesson (step 5):
       once an inequality is solved for y, "greater" means vertically ABOVE and
       "less" means vertically BELOW — ALWAYS, whatever the slope does.  A
       negative slope tilts the fence; it does not swap the sides.  That is the
       exact counterpoint to the sibling's flip, not a copy of it.

   LineFunctionLab owns y = m·x + b and the SLOPE TRIANGLE; this lab draws no
   slope triangle — the line is demoted to the blue-collar role of a FENCE, and
   the carmine accent belongs to the SHADED REGION, which is the actual answer.

   ---------------------------------------------------------------------------
   THE CENTERPIECE — THE FENCE, THE VERDICT, AND THE VERTICAL GAP.

     • THE HALF-PLANE (hero).  A carmine wash covering every point that makes
       the statement true, fenced by the boundary line — DASHED when the sign is
       strict (the fence is not part of the yard), SOLID when it is ≤ or ≥.

     • THE TEST POINT (the probe).  Draggable anywhere in the plane, it glows
       green wherever the statement is true.  A whole REGION of answers becomes
       something you sweep with a finger.

     • THE VERTICAL GAP (the why).  A dashed segment drops from the test point to
       the fence at the SAME x, meeting it at the blue point (x, m·x + b) — the
       line's HEIGHT there.  The inequality compares the point's y to that
       height, so the SIGN OF THE GAP y − (m·x + b) IS THE VERDICT:
             gap > 0  ⟺  the point is ABOVE the fence  ⟺  y > m·x + b.
       "Shade above" stops being a rule to memorize and becomes something read
       off a picture.

     • THE POINT-TEST GRID (the lens).  Toggle it and every lattice point in the
       plane is tested and marked.  The half-plane is not asserted — it visibly
       EMERGES as the set of points that pass.  This is the honest definition of
       a solution set, rendered.

   The one accent (carmine) is the INEQUALITY and its SOLUTION REGION — the
   wash, the fence, the sign, the readout.  Green marks a TRUE/satisfied state,
   blue is the fence's height at x (the known reference), gold appears ONLY in
   the capstone to flag a misclassified point.

   ---------------------------------------------------------------------------
   EXACT ARITHMETIC.  m and b are integers; the test point moves on a 0.5 grid.
   Every quantity compared is an exact multiple of 0.5, which is exactly
   representable in binary floating point, so `y < m*x + b` is an EXACT test —
   no epsilon, no drift.  The audit proves this by re-deciding every comparison
   in pure integers (double everything: 2y OP m·(2x) + 2b) and checking the two
   agree at every reachable point.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TwoVariableInequalityLab.jsx
     2. Import and render it:
          import TwoVariableInequalityLab from './TwoVariableInequalityLab';
          export default function Page() { return <TwoVariableInequalityLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (m, b, op, the test
              point, step, and the capstone the student constructs).
     MODEL  — the math (line height, truth, the drawn region) is pure; it knows
              nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change; DPI-aware,
              equal x/y scales, native form controls.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Palette — shared between the canvas and the inline-styled equation head (a
   child component; styled-jsx only scopes a component's OWN JSX, so the head is
   styled inline to render identically in Next.js and any preview harness).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the one accent — the inequality & its half-plane
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const OK = '#1f8a5b'; // TRUE / satisfied
const BLUE = '#3f74a6'; // the fence's height at x — the known reference
const GOLD = '#c8891e'; // capstone only: a misclassified point
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window.  A square, symmetric integer plane.  The renderer
   derives ONE scale (px per unit) from min(width, height) and uses it for BOTH
   axes, so a slope of 1 always looks like 45°.  Equal scales are a correctness
   property in any lab where a slope is visible.
   ------------------------------------------------------------------------- */
const XMIN = -7;
const XMAX = 7;
const YMIN = -7;
const YMAX = 7;

/* the reachable range for the test point and for capstone evidence points */
const PMIN = -6;
const PMAX = 6;

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  m, b, op define  y OP m·x + b; (x, y) is the draggable
   test point.  One control unlocks per lesson step:
     x, y — always live (the probe that reveals the region)
     op   — the sign; a 4-way segmented control, not a slider (unlocks @ step 3)
     b    — the fence's y-intercept, slides it up and down (@ step 4)
     m    — the fence's slope, tilts it (@ step 5)
   Unlike the one-variable sibling, m = 0 is ALLOWED: a horizontal fence is a
   perfectly good boundary, and y > 2 is a real inequality.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'x', label: 'x', min: PMIN, max: PMAX, step: 0.5, unlock: 0, star: true, role: 'the test point · drag it' },
  { key: 'y', label: 'y', min: PMIN, max: PMAX, step: 0.5, unlock: 0, star: true, role: 'the test point’s height' },
  { key: 'b', label: 'b', min: -4, max: 4, step: 1, unlock: 4, role: 'the fence’s y-intercept' },
  { key: 'm', label: 'm', min: -3, max: 3, step: 1, unlock: 5, role: 'the fence’s slope · its tilt' },
];
const START = { m: 1, b: 2, op: '>', x: 1, y: 5 }; // y > x + 2, tested at (1,5): 5 > 3 → TRUE, above

/* the capstone hands the student a NEUTRAL fence to move — never the answer */
const CALIB_START = { m: 1, b: 0, op: '<' };

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Pure math, no pixels.
   ------------------------------------------------------------------------- */
const OPS = ['<', '≤', '>', '≥'];
const isStrict = (op) => op === '<' || op === '>'; // strict → DASHED fence
const isLess = (op) => op === '<' || op === '≤'; // "less" → shade BELOW

/* the fence's height at x — the number the point's y is compared against */
const lineY = (x, p) => p.m * x + p.b;

/* the signed vertical gap: the sign of this IS the verdict */
const gapAt = (x, y, p) => y - lineY(x, p);

/* is the point (x, y) a solution?  Exact: every operand is a multiple of 0.5. */
const truth = (x, y, p) => {
  const L = lineY(x, p);
  if (p.op === '<') return y < L;
  if (p.op === '≤') return y <= L;
  if (p.op === '>') return y > L;
  return y >= L; // '≥'
};

/* ---------------------------------------------------------------------------
   THE PICTURE, AS A PREDICATE.  These two flags are the ONLY things draw() uses
   to paint the region, so `drawnRegion` below is an exact mirror of the pixels.
   The audit asserts  truth === drawnRegion  at every reachable point, which is
   what makes it impossible for the shading to disagree with plugging the point
   in.  (The one-variable sibling shipped a real bug of exactly this shape: its
   ray was drawn from the pre-flip operator while its algebra used the post-flip
   one.  Mirroring the renderer in the audit is the guard against that class.)

   Note the structural reason this lab is safer: the inequality is ALREADY
   solved for y, so there is no "solved operator" indirection to get wrong.
   ------------------------------------------------------------------------- */
const drawAbove = (p) => !isLess(p.op); // shade the half ABOVE the fence?
const drawDashed = (p) => isStrict(p.op); // fence excluded → dashed
const drawnRegion = (x, y, p) => {
  const L = lineY(x, p);
  if (drawAbove(p)) return drawDashed(p) ? y > L : y >= L;
  return drawDashed(p) ? y < L : y <= L;
};

/* ---------------------------------------------------------------------------
   Formatting — a real minus sign (−), trimmed decimals.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function fmtNum(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
/* the m·x coefficient as it should read: '', '−', or the number */
function coefStr(m) {
  if (m === 1) return '';
  if (m === -1) return MINUS;
  return fmtNum(m);
}
/* the whole right-hand side, m·x + b, written the way a human writes it:
   m = 0 collapses to just b; b = 0 disappears; a negative b becomes a minus. */
function rhsStr(p) {
  if (p.m === 0) return fmtNum(p.b);
  const head = `${coefStr(p.m)}x`;
  if (p.b === 0) return head;
  return `${head} ${p.b > 0 ? '+' : MINUS} ${Math.abs(p.b)}`;
}
const pointStr = (x, y) => `(${fmtNum(x)}, ${fmtNum(y)})`;
/* A negative number being multiplied MUST be parenthesised: "1·(−4)", never
   "1·−4".  And a negative constant is ADDED as a subtraction: "− 4", never
   "+ −4".  These are not cosmetics — a K-12 student copying "1·−4" off the
   screen is copying malformed notation. */
const parenNeg = (v) => (v < 0 ? `(${fmtNum(v)})` : fmtNum(v));
const signedTerm = (v) => (v < 0 ? `${MINUS} ${Math.abs(v)}` : `+ ${fmtNum(v)}`);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; a control unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions (thinking the boundary is always included, thinking a
   negative slope swaps which side is shaded, thinking "above" means "left").
   Next is gated on ANSWERED, not on CORRECT.
   The ramp: a point either works or it doesn't → the answer is a REGION → the
   fence → dashed/solid → the vertical gap decides above/below → tilt the fence
   (and "above" still means above) → the test-point method → build one.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the two-variable inequality',
    body:
      'y > x + 2 is not a question about one number — it is a claim about a POINT (x, y). Put the point in ' +
      'and the claim is either true or false. Drag the test point anywhere on the plane: it glows GREEN ' +
      'wherever the claim holds and goes hollow where it fails. Read the substitution under the picture.',
    q: 'Is the point (1, 5) a solution of y > x + 2?',
    choices: [
      'Yes — 5 > 1 + 2 = 3, so the claim is true there',
      'No — x must equal 5',
      'You cannot tell; y > x + 2 is not solvable',
    ],
    answer: 0,
    feedback:
      'Substitute BOTH coordinates: y = 5 and x = 1 give 5 > 3, which is true. So (1, 5) is one solution — ' +
      'and, as the next step shows, it has a lot of company.',
  },
  {
    title: 'The answer is a REGION',
    body:
      'A one-variable inequality like x + 2 < 6 answers with a RAY — a stretch of the number line. Give the ' +
      'inequality a second variable and the answer grows a dimension: it becomes a whole HALF of the plane. ' +
      'Every point in the carmine wash is a solution. Sweep the test point through it — it stays green.',
    q: 'How many points (x, y) satisfy y > x + 2?',
    choices: [
      'Infinitely many — every point lying above the line',
      'Exactly one point',
      'Only the points sitting on the line',
    ],
    answer: 0,
    feedback:
      '(1, 5), (0, 3), (−4, 0), (2, 100) … an endless set, filling half the plane. That shaded half is the ' +
      'SOLUTION SET, and drawing it is what "graphing an inequality" means.',
  },
  {
    title: 'The boundary — a fence, not a circle',
    body:
      'Where does true turn into false? Exactly where the two sides are EQUAL: y = m·x + b. That line is the ' +
      'BOUNDARY, and it fences the plane into two halves. Switch on the point-test grid under the picture: ' +
      'every lattice point gets tested, and the fence is precisely where the verdict changes.',
    q: 'The point (1, 3) sits exactly on the line y = x + 2. What is true of it?',
    choices: [
      'The two sides are EQUAL there — it is on the fence, not inside the yard',
      'It is above the line',
      'It makes y > x + 2 true',
    ],
    answer: 0,
    feedback:
      'At (1, 3): y = 3 and x + 2 = 3. Equal — so "3 > 3" is FALSE. Points on the fence are the tie cases, ' +
      'and the sign decides whether a tie counts. That is the next step.',
  },
  {
    title: 'Dashed or solid',
    body:
      'A tie counts only if the sign allows EQUAL. Use the sign buttons. For a strict sign (< or >) the ' +
      'boundary is NOT part of the solution, so the fence is drawn DASHED. For ≤ or ≥ it IS part of the ' +
      'solution, so the fence is SOLID. Same idea as the open ○ and closed ● circle on a number line — one ' +
      'dimension up.',
    q: 'Why is the fence of y > x + 2 drawn DASHED?',
    choices: [
      'Because > is strict — on the line the sides are equal, not greater, so those points are excluded',
      'Because the line is not really part of the plane',
      'Because the slope is positive',
    ],
    answer: 0,
    feedback:
      'Dashed = "the fence itself is out". Switch to ≥ and the very same line turns SOLID, because now the ' +
      'tie counts. The half that gets shaded does not change — only the fence.',
  },
  {
    title: 'Above or below — read the gap',
    body:
      'Here is the honest reason shading works. Drop straight down from the test point to the fence: you meet ' +
      'it at the blue point, the line’s HEIGHT m·x + b at that same x. The inequality just compares the ' +
      'point’s y to that height. So the SIGN OF THE GAP y − (m·x + b) is the whole verdict. Slide b to lift ' +
      'the fence and watch points change their minds.',
    q: 'At x = 2 the line y = x + 2 has height 4. Which point satisfies y > x + 2?',
    choices: [
      '(2, 6) — its height 6 is above the fence’s 4, so the gap is +2',
      '(2, 4) — it sits exactly on the fence',
      '(2, 1) — its height 1 is below the fence’s 4',
    ],
    answer: 0,
    feedback:
      'gap = 6 − 4 = +2, a positive gap, so the point is ABOVE the fence and y > x + 2 is true there. ' +
      'A positive gap means above; a negative gap means below; a zero gap means on the fence.',
  },
  {
    title: 'Tilt the fence — “above” still means above',
    body:
      'Unlock the slope and tilt the fence. Now the trap. In a ONE-variable inequality, dividing by a negative ' +
      'FLIPS the sign — so students expect a negative slope to flip which side gets shaded. It does not. Once ' +
      'the inequality is solved for y, "greater" means vertically ABOVE and "less" means vertically BELOW, ' +
      'always. A negative slope tilts the fence; it never swaps the sides. Try m = −3 and watch.',
    q: 'For y < −2x + 1, which half of the plane is shaded?',
    choices: [
      'The half BELOW the fence — “less” always means vertically below',
      'The half to the LEFT, because the fence is steep',
      'The half ABOVE, because the slope is negative flips it',
    ],
    answer: 0,
    feedback:
      'Solved for y, the sign alone decides the side: < shades below, > shades above, whatever the slope. ' +
      '“Below” always means straight DOWN, never “to the left” — even when a steep fence makes it look that ' +
      'way. And note there is no flip here: nothing was divided by a negative.',
  },
  {
    title: 'The test-point method',
    body:
      'This is the method you will use on paper, and it works no matter what form the inequality arrives in. ' +
      'Draw the fence. Then test ONE easy point that is not on it — (0, 0) is almost always easiest. If the ' +
      'point is TRUE, shade the side it is on. If FALSE, shade the other side. Press “Test the origin” and ' +
      'check it against the wash.',
    q: 'To graph y ≥ 2x − 4 you test (0, 0) and get 0 ≥ −4, which is TRUE. What now?',
    choices: [
      'Shade the side of the fence that contains (0, 0)',
      'Shade the other side, since the test point is never in the solution',
      'Test a second point before you can decide',
    ],
    answer: 0,
    feedback:
      'One true test point identifies its whole side — because a fence has exactly two sides and the verdict ' +
      'can only change by crossing it. The only rule: never test a point sitting ON the fence, since a tie ' +
      'tells you nothing about either side.',
  },
  {
    title: 'Shade-it challenge',
    body:
      'Final challenge, and it runs the skill backwards. Seven points have already been tested for you: green ' +
      '✓ are IN the solution, hollow ✗ are OUT. Build an inequality whose shaded half-plane matches ALL the ' +
      'evidence — set m and b to place the fence, then pick the sign, which decides both dashed/solid AND ' +
      'which side gets shaded. The point sitting ON your fence is the one that tells you whether the boundary ' +
      'is included. The meter reads CALIBRATED when every point is classified correctly.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   CHOICE ORDER.  The steps[] source above keeps the correct answer FIRST: it
   reads better, and it keeps `answer: 0` a meaningful, auditable convention.
   But a student must never be able to pass by always clicking the first choice.
   That is not about scoring — Next is gated on ANSWERED, not on correct, so a
   guessed answer costs nothing anyway. It is that PREDICTING is the entire
   pedagogy of a predict-then-check step, and a student who spots "the first one
   is always right" stops predicting. The lesson quietly stops working.

   So the DISPLAY order is rotated by a hash of the question text:
     • deterministic — the buttons never reorder mid-question or between renders
       (no state, no shuffling on re-render, nothing to get out of sync);
     • varies per question AND per lab, unlike a rotation by step index, which
       would leave step 1's answer first in every lab;
     • still lands the answer first ~1 time in 3 — "never first" is just as
       learnable a pattern as "always first".

   ONLY the display moves. State stores ORIGINAL indices throughout, so
   `answer`, the ✓/✕ marks and the feedback are all untouched.
   ------------------------------------------------------------------------- */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
/* display slot j shows the original choice at index choiceOrder(q, n)[j] */
const choiceOrder = (q, n) => {
  const rot = hashStr(q) % n;
  return Array.from({ length: n }, (_, j) => (j + rot) % n);
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Capstone (a CONSTRUCTION goal — the skill's sanctioned alternative
   to curve-matching; precedent: IntegerLab, MultiplesLab, CubeLab).

   The lesson teaches FORWARD (given an inequality, shade the region); the
   capstone tests BACKWARD (given a shaded region's evidence, write an
   inequality).  That is deliberately not a repeat of what was just practised.

   Seven evidence points are generated from a hidden target: 3 strictly ABOVE
   its fence, 3 strictly BELOW, and — the load-bearing one — exactly 1 sitting
   ON it.  That on-fence point is what makes DASHED vs SOLID decidable from the
   evidence rather than guessable: its ✓/✗ label reveals whether the boundary is
   included.  Without it the strict/inclusive choice would be unfalsifiable.

   THE GATE IS AN EXACT INTEGER TEST — every one of the 7 points classified
   correctly — so CALIBRATED can never fire falsely.  Note that a student may
   legitimately land on an inequality OTHER than the hidden target: any region
   consistent with all the evidence genuinely solves the stated goal, so the
   success note names what they found and what was hidden.  (Precedent:
   MultiplesLab's "other counters with this LCM".)
   ------------------------------------------------------------------------- */
const EVIDENCE_N = 7;

function makeTarget(prev, rnd = Math.random) {
  const randInt = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

  for (let guard = 0; guard < 4000; guard++) {
    const m = randInt(-3, 3);
    const b = randInt(-4, 4);
    const op = OPS[randInt(0, 3)];
    const p = { m, b, op };

    /* the ON-fence point: an integer x whose fence height is on-screen.
       x = 0 always qualifies (its height is b ∈ [−4, 4]), so this never fails. */
    const onXs = [];
    for (let x = PMIN; x <= PMAX; x++) {
      const h = m * x + b;
      if (h >= PMIN && h <= PMAX) onXs.push(x);
    }
    if (!onXs.length) continue;
    const onX = onXs[randInt(0, onXs.length - 1)];
    const pts = [{ x: onX, y: m * onX + b }];

    /* `sign` = +1 for strictly above the fence, −1 for strictly below */
    const grow = (sign, need) => {
      const out = [];
      for (let tries = 0; out.length < need && tries < 500; tries++) {
        const x = randInt(PMIN, PMAX);
        const d = randInt(1, 3); // a gap of 1…3 — never 0, so never on the fence
        const y = m * x + b + sign * d;
        if (y < PMIN || y > PMAX) continue;
        const clash = (q) => q.x === x && q.y === y;
        if (pts.some(clash) || out.some(clash)) continue;
        out.push({ x, y });
      }
      return out;
    };
    const above = grow(1, 3);
    const below = grow(-1, 3);
    if (above.length < 3 || below.length < 3) continue;

    const all = [...pts, ...above, ...below].map((q) => ({ ...q, in: truth(q.x, q.y, p) }));
    if (all.length !== EVIDENCE_N) continue;

    /* both classes must be genuinely represented (by construction this is 3–4,
       but assert it rather than trust it) */
    const nIn = all.filter((q) => q.in).length;
    if (nIn < 2 || nIn > EVIDENCE_N - 2) continue;

    /* never open already-solved: the neutral fence the student is handed must
       misclassify at least one point */
    if (all.every((q) => truth(q.x, q.y, CALIB_START) === q.in)) continue;

    /* never hand back the same puzzle twice in a row */
    if (prev && prev.m === m && prev.b === b && prev.op === op) continue;

    return { m, b, op, pts: all };
  }

  /* Unreachable in practice; a hand-checked fallback so the capstone can never
     hand back null.  y > x, evidence: 1 on the fence, 3 above, 3 below.
     CALIB_START (y < x) classifies every one of them wrong. */
  const p = { m: 1, b: 0, op: '>' };
  const raw = [
    { x: 0, y: 0 },
    { x: 1, y: 2 },
    { x: -2, y: 1 },
    { x: 3, y: 5 },
    { x: 2, y: 0 },
    { x: -1, y: -3 },
    { x: 4, y: 1 },
  ];
  return { ...p, pts: raw.map((q) => ({ ...q, in: truth(q.x, q.y, p) })) };
}

/* how many evidence points the student's current inequality gets right */
const scoreEvidence = (pts, p) => pts.reduce((n, q) => n + (truth(q.x, q.y, p) === q.in ? 1 : 0), 0);

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display.  y OP m·x + b, with the sign and the variables in
   carmine.  Inline styles because this is a CHILD component: styled-jsx only
   scopes a component's OWN JSX, so class names declared in the parent's <style
   jsx> would not reach here — and :global() is additionally dropped by the
   Babel preview harness.  Inlining renders identically in both.
   ------------------------------------------------------------------------- */
const CHIP = {
  fontFamily: MONO,
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 9px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function InequalityHead({ p, showRegion }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span
        style={{
          fontFamily: MONO,
          fontVariantNumeric: 'tabular-nums',
          fontSize: '26px',
          fontWeight: 700,
          color: INK,
          letterSpacing: '0.01em',
        }}
      >
        <span style={{ color: CARMINE }}>y</span>{' '}
        <span style={{ color: CARMINE, fontSize: '28px' }}>{p.op}</span> {rhsStr(p)}
      </span>
      {showRegion && (
        <span style={{ ...CHIP, color: CARMINE, background: 'rgba(200,30,79,0.1)' }}>
          {drawDashed(p) ? 'dashed' : 'solid'} · shade {drawAbove(p) ? 'above' : 'below'}
        </span>
      )}
    </span>
  );
}

/* The live substitution check — the point goes in, the verdict comes out.
   Generated from the current m, b, op and the test point, so it can never drift
   from the picture. */
function subLines(p, x, y) {
  const L = lineY(x, p);
  return [
    { lhs: 'y', op: p.op, rhs: rhsStr(p), note: 'the inequality' },
    {
      lhs: fmtNum(y),
      op: p.op,
      rhs: `${fmtNum(p.m)}·${parenNeg(x)} ${signedTerm(p.b)}`,
      note: `put in the point ${pointStr(x, y)}`,
    },
    { lhs: fmtNum(y), op: p.op, rhs: fmtNum(L), note: 'the fence’s height at that x' },
  ];
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TwoVariableInequalityLab() {
  const [m, setM] = useState(START.m);
  const [b, setB] = useState(START.b);
  const [op, setOp] = useState(START.op);
  const [x, setX] = useState(START.x); // the test point
  const [y, setY] = useState(START.y);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [showGrid, setShowGrid] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const layoutRef = useRef({});
  const draggingRef = useRef(false);

  const p = { m, b, op };
  const current = STEPS[step];
  const calib = !!current.calib;

  /* derived math */
  const L = lineY(x, p);
  const gap = gapAt(x, y, p);
  const inSet = truth(x, y, p);

  /* capstone scoring — an EXACT integer test, so the stamp cannot fire falsely */
  const nRight = calib && target ? scoreEvidence(target.pts, p) : 0;
  const nTotal = target ? target.pts.length : EVIDENCE_N;
  const pct = calib && target ? (100 * nRight) / nTotal : 0;
  const solved = calib && target ? nRight === nTotal : false;
  const exactMatch = calib && target ? target.m === m && target.b === b && target.op === op : false;

  /* snapshot everything the renderer reads so draw() (a stable callback) never
     sees stale values */
  sceneRef.current = { m, b, op, x, y, L, gap, inSet, calib, showGrid, target, solved };

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
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const P = { m: S.m, b: S.b, op: S.op };

    /* ---- ONE scale for both axes (a slope of 1 must look like 45°) -------- */
    const padL = 30;
    const padR = 14;
    const padT = 14;
    const padB = 26;
    const availW = W - padL - padR;
    const availH = H - padT - padB;
    if (availW <= 0 || availH <= 0) return;
    const s = Math.min(availW / (XMAX - XMIN), availH / (YMAX - YMIN)); // px per unit
    const plotW = s * (XMAX - XMIN);
    const plotH = s * (YMAX - YMIN);
    const oxp = padL + (availW - plotW) / 2;
    const oyp = padT + (availH - plotH) / 2;
    const PX = (v) => oxp + (v - XMIN) * s;
    const PY = (v) => oyp + (YMAX - v) * s;
    const plot = { L: oxp, T: oyp, R: oxp + plotW, B: oyp + plotH };
    layoutRef.current = { PX, PY, s, plot };

    const rr = (x0, y0, w, h, rad) => {
      const t = Math.min(rad, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x0 + t, y0);
      g.arcTo(x0 + w, y0, x0 + w, y0 + h, t);
      g.arcTo(x0 + w, y0 + h, x0, y0 + h, t);
      g.arcTo(x0, y0 + h, x0, y0, t);
      g.arcTo(x0, y0, x0 + w, y0, t);
      g.closePath();
    };
    /* Pills of text, drawn LAST so nothing strokes through them.  Split into
       MEASURE and DRAW so two pills can be collision-checked before either is
       committed: on a small stage (a phone) the scale compresses to ~17px per
       unit, and a 2-unit gap puts the gap pill exactly where the point pill
       already sits. */
    const PILL_F = '700 11.5px ' + MONO;
    const pillRect = (text, cx, cy) => {
      g.font = PILL_F;
      const pw = g.measureText(text).width + 14;
      const ph = 19;
      return {
        x: Math.max(plot.L + 1, Math.min(plot.R - pw - 1, cx - pw / 2)),
        y: Math.max(plot.T + 1, Math.min(plot.B - ph - 1, cy - ph / 2)),
        w: pw,
        h: ph,
        text,
      };
    };
    const overlaps = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
    const drawPill = (r, col, tint) => {
      rr(r.x, r.y, r.w, r.h, 9);
      /* an OPAQUE base under the tint — a translucent pill lets the axis tick
         labels underneath show through and the text stops being readable */
      g.fillStyle = '#fdfefe';
      g.fill();
      g.fillStyle = tint;
      g.fill();
      g.strokeStyle = col;
      g.lineWidth = 1.1;
      g.stroke();
      g.fillStyle = col;
      g.font = PILL_F;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(r.text, r.x + r.w / 2, r.y + r.h / 2 + 0.5);
    };

    /* everything is clipped to the plot rectangle */
    g.save();
    g.beginPath();
    g.rect(plot.L, plot.T, plotW, plotH);
    g.clip();

    /* ---- paper -------------------------------------------------------- */
    g.fillStyle = '#fdfefe';
    g.fillRect(plot.L, plot.T, plotW, plotH);

    /* =================== THE HALF-PLANE (the hero) ======================= */
    /* The region is the polygon between the fence and the top (or bottom) edge.
       The fence's endpoints are computed at XMIN/XMAX even when they land far
       off-screen; the clip above handles every degenerate case correctly —
       a fence entirely above the window leaves "above" empty, one entirely
       below leaves it full, which is exactly right. */
    {
      const y1 = PY(lineY(XMIN, P));
      const y2 = PY(lineY(XMAX, P));
      const edge = drawAbove(P) ? plot.T - plotH : plot.B + plotH;
      g.beginPath();
      g.moveTo(PX(XMIN), y1);
      g.lineTo(PX(XMAX), y2);
      g.lineTo(PX(XMAX), edge);
      g.lineTo(PX(XMIN), edge);
      g.closePath();
      g.fillStyle = 'rgba(200,30,79,0.13)';
      g.fill();
    }

    /* ---- quadrille paper: integer rules both ways ----------------------- */
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(199,216,228,0.75)';
    g.beginPath();
    for (let v = XMIN; v <= XMAX; v++) {
      const px = Math.round(PX(v)) + 0.5;
      g.moveTo(px, plot.T);
      g.lineTo(px, plot.B);
    }
    for (let v = YMIN; v <= YMAX; v++) {
      const py = Math.round(PY(v)) + 0.5;
      g.moveTo(plot.L, py);
      g.lineTo(plot.R, py);
    }
    g.stroke();

    /* ---- the point-test grid (the lens): the region, EMERGING ----------- */
    if (S.showGrid) {
      for (let gx = XMIN + 1; gx <= XMAX - 1; gx++) {
        for (let gy = YMIN + 1; gy <= YMAX - 1; gy++) {
          const t = truth(gx, gy, P);
          g.beginPath();
          g.arc(PX(gx), PY(gy), t ? 2.1 : 1.5, 0, Math.PI * 2);
          g.fillStyle = t ? 'rgba(31,138,91,0.85)' : 'rgba(91,107,123,0.28)';
          g.fill();
        }
      }
    }

    /* ---- axes ---------------------------------------------------------- */
    g.strokeStyle = 'rgba(28,43,58,0.75)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(plot.L, Math.round(PY(0)) + 0.5);
    g.lineTo(plot.R, Math.round(PY(0)) + 0.5);
    g.moveTo(Math.round(PX(0)) + 0.5, plot.T);
    g.lineTo(Math.round(PX(0)) + 0.5, plot.B);
    g.stroke();

    /* =================== THE FENCE (dashed ⇔ strict) ===================== */
    g.save();
    g.strokeStyle = CARMINE;
    g.lineWidth = 2.8;
    g.lineCap = 'butt';
    if (drawDashed(P)) g.setLineDash([7, 5]);
    g.beginPath();
    g.moveTo(PX(XMIN), PY(lineY(XMIN, P)));
    g.lineTo(PX(XMAX), PY(lineY(XMAX, P)));
    g.stroke();
    g.restore();

    /* =================== THE VERTICAL GAP (the why) ====================== */
    if (!S.calib) {
      const tx = PX(S.x);
      const ty = PY(S.y);
      const ly = PY(S.L);
      const onFence = Math.abs(S.gap) < 1e-9;
      const fenceVisible = S.L >= YMIN && S.L <= YMAX;

      if (!onFence && fenceVisible) {
        /* the drop from the point to the fence at the SAME x */
        g.strokeStyle = S.inSet ? 'rgba(31,138,91,0.7)' : 'rgba(91,107,123,0.6)';
        g.setLineDash([4, 4]);
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(tx, ly);
        g.stroke();
        g.setLineDash([]);
        /* a small arrowhead showing which way the gap points */
        const dir = S.gap > 0 ? 1 : -1; // world-up = pixel-up
        g.fillStyle = S.inSet ? OK : INK_SOFT;
        g.beginPath();
        g.moveTo(tx, ty + dir * 6);
        g.lineTo(tx - 3.5, ty + dir * 12);
        g.lineTo(tx + 3.5, ty + dir * 12);
        g.closePath();
        g.fill();
      }

      /* the fence's height at x — the blue known reference */
      if (fenceVisible) {
        g.beginPath();
        g.arc(tx, ly, 4.5, 0, Math.PI * 2);
        g.fillStyle = '#ffffff';
        g.fill();
        g.strokeStyle = BLUE;
        g.lineWidth = 2;
        g.stroke();
      }

      /* the TEST POINT: filled green where the claim is true, hollow where not */
      g.lineWidth = 2.4;
      g.beginPath();
      g.arc(tx, ty, 8, 0, Math.PI * 2);
      if (S.inSet) {
        g.fillStyle = OK;
        g.fill();
      } else {
        g.fillStyle = '#ffffff';
        g.fill();
        g.strokeStyle = INK_SOFT;
        g.stroke();
      }
      /* grab ring */
      g.strokeStyle = S.inSet ? 'rgba(31,138,91,0.35)' : 'rgba(91,107,123,0.3)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(tx, ty, 12.5, 0, Math.PI * 2);
      g.stroke();
    }

    /* =================== CAPSTONE EVIDENCE ============================== */
    if (S.calib && S.target) {
      for (const q of S.target.pts) {
        const qx = PX(q.x);
        const qy = PY(q.y);
        const got = truth(q.x, q.y, P);
        const right = got === q.in;

        /* a gold ring flags a point the student's region currently gets wrong */
        if (!right) {
          g.strokeStyle = GOLD;
          g.setLineDash([3, 3]);
          g.lineWidth = 2;
          g.beginPath();
          g.arc(qx, qy, 12, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);
        }

        g.lineWidth = 2.2;
        g.beginPath();
        g.arc(qx, qy, 7, 0, Math.PI * 2);
        if (q.in) {
          g.fillStyle = OK;
          g.fill();
        } else {
          g.fillStyle = '#ffffff';
          g.fill();
          g.strokeStyle = INK_SOFT;
          g.stroke();
        }
        /* ✓ / ✗ glyph */
        g.font = '700 9px ' + MONO;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = q.in ? '#ffffff' : INK_SOFT;
        g.fillText(q.in ? '✓' : '✕', qx, qy + 0.5);
      }
    }

    /* ---- tick labels (drawn late, over the wash, under nothing) --------- */
    g.font = '600 10px ' + MONO;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    for (let v = XMIN + 1; v <= XMAX - 1; v++) {
      if (v === 0 || v % 2 !== 0) continue;
      g.fillStyle = 'rgba(91,107,123,0.9)';
      g.fillText(fmtNum(v), PX(v), PY(0) + 4);
    }
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let v = YMIN + 1; v <= YMAX - 1; v++) {
      if (v === 0 || v % 2 !== 0) continue;
      g.fillStyle = 'rgba(91,107,123,0.9)';
      g.fillText(fmtNum(v), PX(0) - 5, PY(v));
    }

    /* ---- labels LAST: a pill cannot survive being stroked through ------- */
    if (!S.calib) {
      const tx = PX(S.x);
      const ty = PY(S.y);
      const lyPix = PY(S.L);
      const fenceVisible = S.L >= YMIN && S.L <= YMAX;
      const col = S.inSet ? OK : INK_SOFT;
      const tint = S.inSet ? 'rgba(31,138,91,0.12)' : 'rgba(91,107,123,0.09)';

      /* the verdict pill is anchored to the dot and always wins the space */
      const ptRect = pillRect(`${pointStr(S.x, S.y)} · ${S.inSet ? 'TRUE' : 'FALSE'}`, tx, ty - 26);

      if (fenceVisible && Math.abs(S.gap) > 1e-9) {
        const gText = `gap = ${S.gap > 0 ? '+' : ''}${fmtNum(S.gap)}`;
        g.font = PILL_F;
        const half = (g.measureText(gText).width + 14) / 2;
        const midY = (ty + lyPix) / 2;
        /* try beside the drop's midpoint, then beside the fence end; take the
           first placement that clears the verdict pill.  If a short drop leaves
           no room at all, drop the label rather than overlap — the gap is still
           on the facts panel and the arrowhead still shows its direction. */
        const cands = [
          [tx + half + 12, midY],
          [tx - half - 12, midY],
          [tx + half + 12, lyPix],
          [tx - half - 12, lyPix],
        ];
        for (const [cx, cy] of cands) {
          const r = pillRect(gText, cx, cy);
          if (!overlaps(r, ptRect)) {
            drawPill(r, col, tint);
            break;
          }
        }
      }
      drawPill(ptRect, col, tint);
    }

    g.restore(); // release the plot clip

    /* ---- legend, bottom-left.  Adaptive: pick the wordiest variant that fits
       so it can never clip on a phone (the sibling's hard-won lesson). ----- */
    g.font = '10.5px ' + MONO;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    const ly2 = H - 9;
    const variants = [
      { a: '< >  fence excluded (dashed)', b: '≤ ≥  fence included (solid)' },
      { a: '< >  excluded', b: '≤ ≥  included' },
      { a: '< >', b: '≤ ≥' },
    ];
    const seg = 18;
    const preGap = 6;
    const midGap = 14;
    const measure = (v) => seg + preGap + g.measureText(v.a).width + midGap + seg + preGap + g.measureText(v.b).width;
    let V = variants[variants.length - 1];
    for (const v of variants) {
      if (10 + measure(v) <= W - 8) {
        V = v;
        break;
      }
    }
    let lx = 10;
    /* a real dashed sample, then a real solid one */
    g.strokeStyle = CARMINE;
    g.lineWidth = 2.4;
    g.setLineDash([4, 3]);
    g.beginPath();
    g.moveTo(lx, ly2);
    g.lineTo(lx + seg, ly2);
    g.stroke();
    g.setLineDash([]);
    lx += seg + preGap;
    g.fillStyle = INK_SOFT;
    g.fillText(V.a, lx, ly2);
    lx += g.measureText(V.a).width + midGap;
    g.beginPath();
    g.moveTo(lx, ly2);
    g.lineTo(lx + seg, ly2);
    g.stroke();
    lx += seg + preGap;
    g.fillStyle = INK_SOFT;
    g.fillText(V.b, lx, ly2);
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [m, b, op, x, y, step, target, showGrid, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a fresh puzzle to the capstone the first time we reach it */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* entering the capstone: hand over a NEUTRAL fence, never the answer */
  useEffect(() => {
    if (calib && target) {
      setM(CALIB_START.m);
      setB(CALIB_START.b);
      setOp(CALIB_START.op);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, calib]);

  /* ---- pointer drag on the canvas: move the test point in TWO dimensions -- */
  const pointerToXY = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const { PX, PY, s } = layoutRef.current;
    if (!canvas || !s) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const snap = (v) => Math.max(PMIN, Math.min(PMAX, Math.round(v * 2) / 2));
    return { x: snap(XMIN + (px - PX(XMIN)) / s), y: snap(YMAX - (py - PY(YMAX)) / s) };
  };
  const onDown = (e) => {
    if (calib) return; // the capstone has no test point — the evidence replaces it
    draggingRef.current = true;
    const v = pointerToXY(e.clientX, e.clientY);
    if (v) {
      setX(v.x);
      setY(v.y);
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!draggingRef.current) return;
    const v = pointerToXY(e.clientX, e.clientY);
    if (v) {
      setX(v.x);
      setY(v.y);
    }
  };
  const onUp = (e) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  /* ---- other interaction ------------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'm') setM(v);
    else if (key === 'b') setB(v);
    else if (key === 'x') setX(v);
    else setY(v);
  };
  const resetDials = () => {
    setM(START.m);
    setB(START.b);
    setOp(START.op);
    setX(START.x);
    setY(START.y);
  };
  const testOrigin = () => {
    setX(0);
    setY(0);
  };
  const showMe = () => {
    if (!target) return;
    setM(target.m);
    setB(target.b);
    setOp(target.op);
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* which controls are live?  Note the INVERSION of the sibling: during the
     capstone the fence dials UNLOCK (the student is building an inequality) and
     the test point locks away, because the evidence points replace the probe. */
  const dialLocked = (d) => (calib ? d.key === 'x' || d.key === 'y' : step < d.unlock);
  const opLocked = !calib && step < 3;

  const spoken =
    `Coordinate plane. The inequality is y ${op} ${rhsStr(p)}. ` +
    `Its boundary is a ${drawDashed(p) ? 'dashed' : 'solid'} line and the shaded half-plane lies ` +
    `${drawAbove(p) ? 'above' : 'below'} it. ` +
    (calib
      ? target
        ? `Challenge: build an inequality matching ${nTotal} tested points. ${nRight} of ${nTotal} are currently correct.`
        : 'Challenge loading.'
      : `The test point is at ${pointStr(x, y)}. The fence's height at x = ${fmtNum(x)} is ${fmtNum(L)}, ` +
        `so the gap is ${fmtNum(gap)} and the statement is ${inSet ? 'true' : 'false'} there.`);

  return (
    <div className="tvilab">
      <header className="head">
        <h1>Inequalities in Two Variables</h1>
        <p className="lede">
          Give an inequality a second variable and its answer gains a dimension: not a ray on a line, but a{' '}
          <em>half of the plane</em>. Every point either passes{' '}
          <span className="mono">y&nbsp;{'>'}&nbsp;m·x&nbsp;+&nbsp;b</span> or it does not — and the shading is
          simply <em>all the points that pass</em>. Each control unlocks with the lesson.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <InequalityHead p={p} showRegion={!calib} />
            </p>
            <p className="equation-sub mono">
              {calib ? `${nRight} of ${nTotal} points classified` : 'the shaded half-plane is the solution set'}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            role="img"
            aria-label={spoken}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={calib ? { cursor: 'default' } : undefined}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {calib ? 'tune m, b and the sign to fit every point' : 'drag the test point anywhere'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && solved ? ' Calibrated — every point is classified correctly.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Test point · (x, y)</span>
              <span className="fact-v mono">{calib ? '—' : pointStr(x, y)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Fence height · m·x + b</span>
              <span className="fact-v mono" style={{ color: calib ? INK_SOFT : BLUE }}>
                {calib ? '—' : fmtNum(L)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Gap · y − (m·x + b)</span>
              <span className="fact-v mono">
                {calib ? '—' : `${gap > 0 ? '+' : ''}${fmtNum(gap)}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">{calib ? 'Points correct' : `At ${pointStr(x, y)}`}</span>
              <span className="fact-v" style={{ color: calib ? (solved ? OK : INK_SOFT) : inSet ? OK : INK_SOFT }}>
                {calib ? `${nRight} / ${nTotal}` : inSet ? 'true ✓' : 'false ✕'}
              </span>
            </div>
          </div>

          {!calib && (
            <div className="steps">
              <p className="steps-title">Check the point by substituting</p>
              <ol>
                {subLines(p, x, y).map((ln, i, arr) => (
                  <li key={i} className={'step-line' + (i === arr.length - 1 ? ' final' : '')}>
                    <span className="step-eq mono">
                      <span className={i === 0 ? 'xac' : ''}>{ln.lhs}</span>{' '}
                      <span className="op">{ln.op}</span> <span>{ln.rhs}</span>
                    </span>
                    <span className="step-note">{ln.note}</span>
                  </li>
                ))}
                <li className="step-line verdict">
                  <span className="step-eq mono" style={{ color: inSet ? OK : INK_SOFT, fontWeight: 700 }}>
                    {inSet ? 'TRUE ✓' : 'FALSE ✕'}
                  </span>
                  <span className="step-note">
                    {inSet ? 'the point is in the shaded half' : 'the point is outside the shaded half'}
                  </span>
                </li>
              </ol>
            </div>
          )}

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={testOrigin} disabled={calib}>
              Test the origin
            </button>
            <button
              type="button"
              className={'btn ghost' + (showGrid ? ' on' : '')}
              onClick={() => setShowGrid((v) => !v)}
              aria-pressed={showGrid}
            >
              {showGrid ? 'Hide point grid' : 'Show point grid'}
            </button>
            <button type="button" className="btn ghost" onClick={resetDials} disabled={calib}>
              Reset dials
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

          {/* the sign control — a 4-way segmented control, live from step 4 on */}
          <div className={'opctl' + (opLocked ? ' locked' : '')}>
            <span className="opk">sign</span>
            <div className="opgroup" role="group" aria-label="Inequality sign">
              {OPS.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={'opbtn' + (op === o ? ' sel' : '')}
                  disabled={opLocked}
                  aria-pressed={op === o}
                  onClick={() => setOp(o)}
                >
                  {o}
                </button>
              ))}
            </div>
            <span className="oprole">
              {opLocked ? 'unlocks soon' : calib ? 'sets dashed/solid AND the side' : 'strict → dashed · ≤ ≥ → solid'}
            </span>
          </div>

          <div className="dials">
            {PARAMS.map((d) => {
              const locked = dialLocked(d);
              const val = { m, b, x, y }[d.key];
              return (
                <label className={'dial' + (locked ? ' locked' : '')} key={d.key}>
                  <span className="dk" style={d.star && !calib ? { color: CARMINE } : undefined}>
                    {d.label}
                  </span>
                  <span className="drole">
                    {calib ? (locked ? 'not used here' : 'place the fence') : step >= d.unlock ? d.role : 'unlocks soon'}
                  </span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={locked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    style={d.star && !calib ? { accentColor: CARMINE } : undefined}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{locked && !calib ? '🔒' : fmtNum(val)}</output>
                </label>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {/* `orig` is the index in steps[].choices; only the ORDER of the
                    buttons is rotated, so every comparison below still speaks
                    the source's language. */}
                {choiceOrder(current.q, current.choices.length).map((orig) => {
                  const chosen = answers[step];
                  const isChosen = chosen === orig;
                  const isCorrect = orig === current.answer;
                  let cls = 'choice';
                  if (chosen != null) {
                    if (isCorrect) cls += ' correct';
                    else if (isChosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button
                      type="button"
                      key={orig}
                      className={cls}
                      onClick={() => choose(orig)}
                      disabled={chosen != null}
                    >
                      <span className="mark" aria-hidden="true">
                        {chosen != null && isCorrect ? '✓' : chosen != null && isChosen ? '✕' : ''}
                      </span>
                      {current.choices[orig]}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {/* the capstone panel — guarded on `target`, which an EFFECT supplies:
              reading target.pts on the first render would white-screen the lab
              at the very moment a student reaches it. */}
          {current.calib && target && (
            <div className="calib">
              <p className="calib-goal">
                Seven points, already tested. Build an inequality whose shaded half-plane holds{' '}
                <strong className="in">every ✓</strong> and <strong className="out">no ✗</strong>.
              </p>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {solved ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {nTotal - nRight} point{nTotal - nRight === 1 ? '' : 's'} still wrong (ringed in gold)
                  </span>
                )}
              </div>
              {solved && (
                <p className="factnote">
                  y {op} {rhsStr(p)} fits all seven points.{' '}
                  {exactMatch
                    ? 'That is exactly the one I hid.'
                    : `I was hiding y ${target.op} ${rhsStr(target)} — yours fits the evidence just as well, so it is every bit as correct.`}
                </p>
              )}
              <div className="calib-btns">
                <button type="button" className="btn ghost" onClick={showMe}>
                  Show me
                </button>
                <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                  New evidence
                </button>
              </div>
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
                  setShowGrid(false);
                  resetDials();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">y {'>'} m·x + b</span> &nbsp;·&nbsp; the two-variable linear inequality — its answer
        is a shaded half-plane, its fence is dashed when the sign is strict, and “greater” always means
        vertically above.
      </footer>

      <style jsx>{`
        .tvilab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
          --quad: #c7d8e4;
          --ok: #1f8a5b;
          --gold: #c8891e;
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
          grid-template-columns: minmax(0, 1fr) 350px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 940px) {
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
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        /* a PLANE wants a square box — the renderer keeps x and y scales equal
           regardless, but a square stage wastes no room doing it. */
        .stage {
          position: relative;
          width: min(100%, 560px);
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: crosshair;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* A plane cannot trade aspect ratio for room the way a number line can
           (equal x/y scales are non-negotiable when a slope is on screen), so
           on a phone we buy the stage back by shedding chrome padding instead.
           This lifts a 390px viewport from ~17 to ~22 px per unit. */
        @media (max-width: 560px) {
          .tvilab {
            padding: 20px 10px 32px;
          }
          .stage-panel {
            padding: 8px;
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
          top: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.82);
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
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
        }
        .steps {
          margin: 14px 4px 2px;
          padding: 12px 14px;
          background: rgba(28, 43, 58, 0.025);
          border: 1px solid rgba(28, 43, 58, 0.08);
          border-radius: 8px;
        }
        .steps-title {
          margin: 0 0 8px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .steps ol {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 6px;
        }
        .step-line {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
        }
        .step-line.verdict {
          border-top: 1px solid rgba(28, 43, 58, 0.08);
          padding-top: 6px;
        }
        .step-eq {
          font-size: 15px;
          font-variant-numeric: tabular-nums;
          color: var(--ink);
        }
        .step-line.final .step-eq {
          font-weight: 700;
        }
        .step-eq .xac {
          color: var(--curve);
          font-weight: 700;
        }
        .step-eq .op {
          color: var(--curve);
          font-weight: 700;
          padding: 0 1px;
        }
        .step-note {
          font-size: 12px;
          color: var(--ink-soft);
          font-style: italic;
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
          gap: 5px;
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
        .opctl {
          display: grid;
          grid-template-columns: 34px 1fr;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 3px 10px;
          margin-bottom: 14px;
        }
        .opctl.locked {
          opacity: 0.5;
        }
        .opk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 15px;
          color: var(--ink-soft);
        }
        .opgroup {
          grid-column: 2;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .opbtn {
          font: 700 17px/1 var(--mono);
          padding: 8px 0;
          border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.12s, background 0.12s, color 0.12s;
        }
        .opbtn:not(:disabled):hover {
          border-color: var(--ink);
        }
        .opbtn.sel {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .opbtn:disabled {
          cursor: not-allowed;
        }
        .oprole {
          grid-column: 2;
          font-size: 11px;
          color: var(--ink-soft);
        }
        @media (max-width: 560px) {
          .opctl {
            grid-template-columns: minmax(0, 1fr);
          }
          .opk,
          .opgroup,
          .oprole {
            grid-column: 1;
          }
          .opk {
            grid-row: auto;
          }
          .opgroup {
            grid-template-columns: repeat(2, minmax(44px, 1fr));
          }
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
          font-size: 13.5px;
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
        .calib-goal {
          margin: 0;
          font-size: 13.5px;
          color: var(--ink);
        }
        .calib-goal .in {
          color: var(--ok);
        }
        .calib-goal .out {
          color: var(--ink-soft);
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
          gap: 10px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
          text-align: right;
        }
        .factnote {
          margin: 0;
          font-size: 12.5px;
          color: var(--ink);
          background: rgba(31, 138, 91, 0.08);
          border-left: 3px solid var(--ok);
          padding: 9px 11px;
          border-radius: 0 6px 6px 0;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
        }
        .calib-btns {
          display: flex;
          gap: 9px;
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
        :global(.tvilab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .opbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
