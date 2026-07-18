'use client';

/* ============================================================================
   EquivalentFractionsLab — an interactive "bench" for EQUIVALENT FRACTIONS.

   The thesis: a fraction is not a number — it is a NAME for one.  One number
   carries infinitely many names (1/2 = 2/4 = 3/6 = …), and the object worth
   teaching is the whole FAMILY of names, not one bar being re-cut.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 4–6:
   CCSS 4.NF.A.1 (explain why a/b = (n·a)/(n·b) and generate equivalent
   fractions) as the anchor, 4.NF.A.2 (compare by cross-multiplying) and
   6.NS.B.4 (gcd / simplest form) as the reach.

   ---------------------------------------------------------------------------
   DISTINCTNESS — read this before editing.  Equivalent fractions is the most
   crowded topic in this library, and two siblings already own its two natural
   pictures:
     • FractionLab.jsx      step 5 "Equivalent fractions — split each part":
                            owns the AREA / part-whole model — a partitioned
                            BAR whose parts are sliced into k with gold dashed
                            sub-lines.  Do NOT re-cut a bar here.
     • RationalNumbersLab   step 4 "Equivalent fractions: same point, simpler
                            name": owns the NUMBER-LINE reading.  Do NOT put a
                            number line here.
     • DecimalLab owns the 10x10 grid; RatioLab owns the batch tape + double
       number line and the ×n scaling engine; MultiplesLab owns the skip-count
       line; GreatestCommonFactorLab owns the prime-brick Venn for the gcd.

   So this lab takes the deliberately OPPOSITE mental model (the precedent is
   LCMLab refusing MultiplesLab's number line, and MedianLab refusing DataLab's
   dot plot): where FractionLab is LOCAL and about AMOUNT ("same amount, more
   pieces"), this lab is GLOBAL and about the FAMILY ("same number, infinitely
   many names").

   SIGNATURE CENTERPIECE = THE NAME LATTICE.  Every fraction p/q is the DOT q
   across and p up on a 12x12 integer lattice (the quadrille paper's own squares
   ARE the denominators).  All the names of one number are exactly the lattice
   dots on ONE RAY from the origin — so the ray IS the number and the dots on it
   are its names.  Three exact-integer facts fall out, and no sibling owns any
   of them:

     1. The FIRST dot on the ray (nearest the origin) is the SIMPLEST FORM —
        simplifying is literally walking back to the first dot.
     2. gcd(p, q) is the dot's STEP NUMBER along the ray.  This is why the k
        dial below is not independent state: k === gcd(p, q), always.  Dragging
        k walks the dot along its ray; reading k reads the gcd off the picture.
        (The analogue of LCMLab's turn counters reading b/GCF at re-sync: the
        theorem is READ OFF the centerpiece rather than asserted.)
     3. Cross-multiplication is the WEDGE.  Pin a name; the triangle joining the
        origin to both dots has area |p1·q2 − p2·q1| / 2 grid squares.  That
        integer is the TWIST.  Twist === 0  <=>  collinear with the origin  <=>
        same ray  <=>  same number.  The wedge visibly COLLAPSES TO NOTHING
        exactly when the fractions are equal — the WHY behind a rule that
        FractionLab can only assert.  Its SIGN also orders them.

   The additive trap (1/2 -> 2/3 by "adding 1 to both") is the headline
   misconception, and the lattice kills it visually: adding falls OFF the ray.

   One-accent discipline, adapted for a family-of-names lab:
     CARMINE  the fraction and its family — the dot, the ray, the name chips.
              This is the accent; it is the math object.
     BLUE     the lattice's structure — grid lines, axes, the denominator.
     GOLD     the machinery of SAMENESS — the ×k staircase, the simplest-form
              ring, the q = 1 value guide, and the wedge.
     INK      the pinned name — a bookmark you left behind, deliberately NOT a
              second accent.

   All arithmetic is EXACT integer math — gcd, reduce, and cross-multiplication
   on p and q; never a float comparison — so a K-12 student never meets a float
   artefact.  Only pixel positions divide.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/EquivalentFractionsLab.jsx
     2. Import and render it:
          import EquivalentFractionsLab from './EquivalentFractionsLab';
          export default function Page() { return <EquivalentFractionsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (numerator p,
              denominator q, the pinned name, lesson step).
     MODEL  — exact integer arithmetic; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Two dials place the dot; the third walks its ray.
     q — the DENOMINATOR: how many equal parts one whole is cut into (1…12).
         The dot's ACROSS coordinate. Unlocks first (step 1) — you cut before
         you count, the same pedagogy as FractionLab.
     p — the NUMERATOR: how many of those parts you take (0…12). The dot's UP
         coordinate. Unlocks step 2.
     k — the STEP NUMBER on the ray. Unlocks step 3. NOT independent state:
         k === gcd(p, q) always, and setting k to j moves the dot to the j-th
         name (j·p0, j·q0). This coupling IS the lesson.

   The lattice is 12x12 so it reads as the familiar times-table grid and caps at
   the twelfths FractionLab already uses.
   ------------------------------------------------------------------------- */
const Q_MIN = 1;
const Q_MAX = 12;
const P_MIN = 0;
const P_MAX = 12;

// 2/4 — deliberately NOT in simplest form, so the moment the ray appears the
// dot is already standing on step 2 with its simpler name 1/2 visible below it.
const START = { p: 2, q: 4 };

const DENOM_STEP = 1; // q dial unlocks — across
const NUM_STEP = 2; // p dial unlocks — up
const RAY_STEP = 3; // k dial unlocks — the ray, the family, the staircase
const SIMPLE_STEP = 4; // simplest form = the first dot (reuses the k dial)
const TWIST_STEP = 5; // pin + wedge = cross-multiplication
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Exact integer arithmetic. No floats anywhere a fact is
   stated; floats appear only in pixel positions and in the display-only
   decimal readout.
   ------------------------------------------------------------------------- */

// Euclid. Note gcd(0, n) === n, which is what makes p = 0 fall out correctly
// below rather than needing a special case.
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

// Lowest terms. 0/q reduces to 0/1 — and since gcd(0, q) === q, the identity
// (p, q) === (gcd(p,q) · p0, gcd(p,q) · q0) still holds: 0/4 is the 4th dot on
// the horizontal ray 0/1, 0/2, 0/3, 0/4. The degenerate case is genuinely
// consistent with the picture, so it is allowed rather than excluded.
function reduce(p, q) {
  if (p === 0) return { p: 0, q: 1 };
  const g = gcd(p, q);
  return { p: p / g, q: q / g };
}

// Exact equality of two fractions by cross-multiplication (both q > 0).
const fracEqual = (p1, q1, p2, q2) => p1 * q2 === p2 * q1;

/* THE TWIST — the heart of this lab.
   twist(A, B) = p1·q2 − p2·q1 for A = p1/q1 at lattice point (q1, p1) and
   B = p2/q2 at (q2, p2).

   Geometry: the triangle joining the origin, A and B has area |twist| / 2 grid
   squares (the standard shoelace determinant; note |q1·p2 − q2·p1| is the same
   magnitude). So:
     twist === 0  <=>  zero area  <=>  O, A, B collinear  <=>  same ray
                  <=>  p1·q2 === p2·q1  <=>  A and B are the same number.
   And the sign orders them: twist > 0  <=>  p1/q1 > p2/q2 (since q1, q2 > 0).
   Exact integers throughout — the wedge closing is not an approximation. */
const twist = (p1, q1, p2, q2) => p1 * q2 - p2 * q1;

/* How many names of p0/q0 fit inside the lattice. k ranges 1…kMax, and the
   j-th name is (j·p0, j·q0). For p0 === 0 the ray is the horizontal axis and
   only q is bounded. */
const kMax = (p0, q0) =>
  p0 === 0 ? Q_MAX : Math.min(Math.floor(P_MAX / p0), Math.floor(Q_MAX / q0));

// The family: every name of this number that fits on the grid, in order.
// (The equivalence class is infinite; the grid is what runs out, not the family
// — the ray is drawn with an arrowhead and the strip ends in "…" to say so.)
function familyOf(p0, q0) {
  const out = [];
  const K = kMax(p0, q0);
  for (let j = 1; j <= K; j++) out.push({ p: j * p0, q: j * q0, k: j });
  return out;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's sanctioned
   alternative to curve-matching): a grey ray runs out from the origin and its
   name is hidden. Land on ANY lattice dot along it and it calibrates — so the
   challenge actively rewards the equivalence insight, and the k dial can then
   walk the whole ray without ever breaking the match.

   The meter measures the gap between your ray and the target ray, read on the
   q = 1 line: |p·tq − tp·q| / (q·tq) is EXACTLY |p/q − tp/tq|, computed from
   integers. So the meter and the picture measure the same thing, and
   pct === 100 <=> |p·tq − tp·q| === 0 <=> isCalibrated. The stamp is gated on
   the exact integer test, never on the meter, so it is provably impossible to
   fire falsely (the audit sweeps every dot × every target to prove it).
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 0.5; // a value gap of half a whole empties the meter
const matchPercent = (p, q, tp, tq) =>
  100 * Math.max(0, 1 - Math.abs(p * tq - tp * q) / (q * tq) / MATCH_SCALE);
const isCalibrated = (p, q, tp, tq) => fracEqual(p, q, tp, tq);

/* The legal targets, enumerated rather than rejection-sampled so the audit can
   sweep them exhaustively. Every target is reduced with tq >= 2, and both
   2·tp <= P_MAX and 2·tq <= Q_MAX, which guarantees at least TWO names are
   reachable on the grid — otherwise "any name counts" would be a lie for that
   target. Because each is reduced with tq >= 2, no target's value is a whole
   number, which is what makes the 1/1 start state provably never pre-solved. */
const TARGETS = (() => {
  const out = [];
  for (let tq = 2; tq <= 6; tq++) {
    for (let tp = 1; tp <= 6; tp++) {
      if (gcd(tp, tq) !== 1) continue; // reduced only
      if (2 * tp > P_MAX || 2 * tq > Q_MAX) continue; // >= 2 names reachable
      out.push({ p: tp, q: tq });
    }
  }
  return out;
})();

function makeTarget(prev) {
  for (let guard = 0; guard < 500; guard++) {
    const t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    if (prev && t.p === prev.p && t.q === prev.q) continue;
    return t;
  }
  return TARGETS[0];
}

// The dot the calibration step starts from. 1/1 is provably never a target's
// name (every target is reduced with tq >= 2, so tp/tq is never the whole
// number 1), so the challenge always starts genuinely un-matched.
const CALIB_START = { p: 1, q: 1 };

/* ---------------------------------------------------------------------------
   Formatting helpers — exact, built from the integers p and q.
   ------------------------------------------------------------------------- */
const ONES_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve',
];
const DENOM_NAME = {
  1: 'whole', 2: 'half', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth',
  7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh',
  12: 'twelfth',
};
function denomName(q, count) {
  const base = DENOM_NAME[q] || `1/${q}`;
  if (count === 1) return base;
  return q === 2 ? 'halves' : base + 's';
}

// "two fourths", "one half", "one and one fourth", "three"
function readFraction(p, q) {
  if (p === 0) return 'zero';
  if (q === 1) return ONES_WORDS[p] || String(p);
  const whole = Math.floor(p / q);
  const rem = p - whole * q;
  if (rem === 0) return ONES_WORDS[whole] || String(whole);
  const fracPart = `${ONES_WORDS[rem] || rem} ${denomName(q, rem)}`;
  return whole === 0 ? fracPart : `${ONES_WORDS[whole] || whole} and ${fracPart}`;
}

// Exact terminating decimal, else a rounded "≈ …". Display only — never math.
function decimalString(p, q) {
  if (p === 0) return '0';
  const whole = Math.floor(p / q);
  let rem = p - whole * q;
  if (rem === 0) return String(whole);
  let digits = '';
  let terminates = false;
  for (let i = 0; i < 6; i++) {
    rem *= 10;
    const d = Math.floor(rem / q);
    digits += d;
    rem -= d * q;
    if (rem === 0) {
      terminates = true;
      break;
    }
  }
  if (terminates) return `${whole}.${digits}`;
  return '≈ ' + Math.round((p / q) * 1000) / 1000 + '…';
}

/* EDIT 5 — Equation display. The fraction stacked, numerator carmine (the up /
   the count) over a rule over denominator blue (the across / the whole's cut),
   and — when this name is not the simplest one — "=" its simplest form with a
   gold ÷k chip.

   Built with INLINE styles, not styled-jsx classes. This is a REUSABLE FIX
   repeated from IntegerLab and FractionLab: a <style jsx> block only scopes
   elements in the component that declares it, so a child component would lose
   the parent's scope hash and drop its colours — in the Babel verify harness
   AND in a real Next build. Inlining renders identically in both. */
const CARMINE = '#c81e4f';
const BLUE = '#3f74a6';
const GOLD = '#d9982b';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';

// `showRay` gates the second half: before the ray is taught (step 3) the head
// must not already be printing "2/4 = 1/2", which is the lab's whole thesis.
function FractionReadout({ p, q, p0, q0, k, showRay }) {
  const stack = (top, bot) => (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontVariantNumeric: 'tabular-nums',
        margin: '0 2px',
      }}
    >
      <span style={{ color: CARMINE, fontWeight: 700, fontSize: '26px', padding: '0 3px' }}>
        {top}
      </span>
      <span style={{ height: '2px', alignSelf: 'stretch', background: INK, margin: '3px 0' }} />
      <span style={{ color: BLUE, fontWeight: 700, fontSize: '26px', padding: '0 3px' }}>
        {bot}
      </span>
    </span>
  );
  const chip = (text) => (
    <span
      style={{
        color: GOLD,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontWeight: 700,
        fontSize: '11px',
        letterSpacing: '0.08em',
        border: `1px solid ${GOLD}`,
        borderRadius: '5px',
        padding: '2px 5px',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
      {stack(p, q)}
      {showRay &&
        (k > 1 ? (
          <>
            <span style={{ color: INK_SOFT, fontSize: '22px', fontWeight: 600 }}>=</span>
            {stack(p0, q0)}
            {chip(`÷ ${k}`)}
          </>
        ) : (
          chip('SIMPLEST')
        ))}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; one dial unlocks per step; the reveal
   lives in `feedback` (shown only after answering); every distractor is a real
   equivalent-fractions misconception. Next is gated on ANSWERED, not correct.

   The headline misconception this lab exists to kill is the ADDITIVE trap
   (1/2 -> 2/3 by adding 1 to both), which the lattice makes visible as falling
   off the ray. It is the wrong answer in step 3 and the reason step 3 is the
   pivot of the whole lesson.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Every fraction is a dot',
    body:
      'Across (→) is the DENOMINATOR q; up (↑) is the NUMERATOR p. The fraction ' +
      'p/q is the dot q across, p up. The carmine dot is at 2/4.',
    q: 'Which fraction does the dot 3 across and 1 up name?',
    choices: ['1/3 — one third', '3/1 — three wholes', '4/4 — three plus one'],
    answer: 0,
    feedback: '3 across, 1 up: 1/3. The bottom number is the ACROSS; the top is the UP.',
  },
  {
    title: 'Across: the denominator',
    body:
      'The DENOMINATOR dial is live. Drag it and the dot slides sideways, staying at the same ' +
      'height. A bigger q cuts the whole into MORE parts, so every part is SMALLER — and with ' +
      'the same number of parts taken, the number itself gets smaller as the dot slides right.',
    q: 'The dot is at 2/4. You drag the denominator to 8, so the dot slides to 2/8. What ' +
      'happened to the number?',
    choices: [
      'It got smaller — 2/8 is less than 2/4',
      'It got bigger — 8 is more than 4',
      'It stayed the same — the numerator never moved',
    ],
    answer: 0,
    feedback:
      '2/8 is smaller than 2/4. Cutting the whole into 8 parts instead of 4 makes every part ' +
      'half as big, so taking 2 of them gives half as much. A bigger bottom number means ' +
      'smaller pieces — and, when the top number stays put, a smaller fraction.',
  },
  {
    title: 'Up: the numerator',
    body:
      'Place the dot anywhere — or CLICK a grid dot. Try 2/4, then 1/2 — ' +
      'two different dots.',
    q: '2/4 and 1/2 are different dots. Are they different numbers?',
    choices: [
      'No — they are two names for the same number',
      'Yes — different dots must differ',
      'Yes — 2/4 is twice as big',
    ],
    answer: 0,
    feedback: 'Different DOT, same NUMBER — both mean one half. A number can have many NAMES.',
  },
  {
    title: 'One number, many names',
    body:
      'Every dot on the CARMINE RAY names the SAME number: k steps land on ' +
      '(k·p)/(k·q). Infinitely many names.',
    q: 'Start at 1/2. Which is NOT another name for the same number?',
    choices: [
      '2/3 — add 1 to the top and 1 to the bottom',
      '2/4 — double both',
      '3/6 — triple both',
    ],
    answer: 0,
    feedback:
      'ADDING to top and bottom swings the ray. Only MULTIPLYING both by the ' +
      'same k holds it still: a/b = (n·a)/(n·b).',
  },
  {
    title: 'Simplest form is the first dot',
    body:
      'Walk STEP back to 1: the first dot on the ray is the SIMPLEST FORM. ' +
      'And the step number you left IS the gcd!',
    q: '9/12 sits on a ray. Which step of that ray is it, and what is its simplest form?',
    choices: [
      'Step 3 — simplest form 3/4',
      'Step 9 — simplest form 1/12',
      'Step 1 — 9/12 is already simplest',
    ],
    answer: 0,
    feedback:
      'gcd(9, 12) = 3, so 9/12 is the 3rd dot on its ray, and the 1st dot is 9÷3 over 12÷3 = ' +
      '3/4. To SIMPLIFY a fraction is just to walk back to the first dot. And a fraction is ' +
      'already in simplest form exactly when it IS the first dot — when gcd(p, q) = 1.',
  },
  {
    title: 'The twist test',
    body:
      'Are two dots the same number? PIN a name, then move away. The gold WEDGE is the ' +
      'triangle joining the origin to both dots, and it covers exactly half the TWIST number ' +
      'p₁·q₂ − p₂·q₁ in grid squares. Stay on the ray and the wedge stays SHUT — zero area. ' +
      'Step off and it opens. Twist = 0 means one ray, one number: that is cross-multiplying. ' +
      'The sign is a bonus — it says which dot sits above the other one’s ray.',
    q: 'Cross-multiply to test 3/4 against 5/7:  3·7 − 5·4 = 21 − 20 = 1. What does that tell you?',
    choices: [
      'Not equal — and the twist is positive, so 3/4 is the bigger one',
      'Equal — a twist of 1 is close enough to zero',
      'Not equal — 5/7 is bigger, because 5 and 7 are bigger numbers',
    ],
    answer: 0,
    feedback:
      'A twist of 1 is not zero, so 3/4 ≠ 5/7 — they sit on different rays, and the wedge ' +
      'covers half a grid square. Only an EXACT zero means the same number; close is not equal. ' +
      'The positive sign says the first fraction is above the other’s ray: 3/4 = 0.75 is ' +
      'indeed greater than 5/7 ≈ 0.714. Build them both and look.',
  },
  {
    title: 'Hit the mystery ray',
    body:
      'A grey ray hides one number. Land your dot on ANY lattice dot along ' +
      'it — every name on the ray counts.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function EquivalentFractionsLab() {
  const [p, setP] = useState(START.p);
  const [q, setQ] = useState(START.q);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // reduced { p, q } — the hidden ray
  const [pin, setPin] = useState(null); // { p, q } — the bookmarked name

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // { q, p } | null
  const geoRef = useRef({}); // layout written by draw(), read by the handlers
  const sceneRef = useRef({}); // single-source-of-truth snapshot for draw()

  const current = STEPS[step];
  const calib = !!current.calib;

  /* ---- derived model (all exact integers) --------------------------------- */
  const red = reduce(p, q); // the simplest name = the first dot on the ray
  const g = gcd(p, q); // === the step number this dot stands on
  const alreadySimplest = g === 1;
  const family = familyOf(red.p, red.q);
  const famMax = kMax(red.p, red.q);
  const showRay = step >= RAY_STEP || calib;
  const pinLive = step >= TWIST_STEP && !calib && pin != null;
  const tw = pinLive ? twist(p, q, pin.p, pin.q) : 0;
  const sameAsPin = pinLive ? fracEqual(p, q, pin.p, pin.q) : false;

  // Snapshot everything the renderer needs so draw() (a stable callback) never
  // reads stale values.
  sceneRef.current = {
    p, q, step, calib, target, showRay,
    pin: pinLive ? pin : null,
    red,
  };

  const pct = target != null ? matchPercent(p, q, target.p, target.q) : 0;
  const calibrated = target != null ? isCalibrated(p, q, target.p, target.q) : false;

  /* ---- lattice → screen transform + full redraw from state ---------------- */
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette — kept here so the drawing matches the CSS tokens exactly */
    const PAPER = '#FBFBF8';
    const CARM = '#C81E4F'; // the fraction + its ray + its names — the accent
    const BLU = '#3F74A6'; // the lattice's structure
    const QUAD = 'rgba(199,216,228,0.9)';
    const GOLD_C = '#D9982B'; // the machinery of sameness
    const GOLD_SOFT = 'rgba(217,152,43,0.22)';
    const INK_C = '#1C2B3A'; // the pinned name
    const INK_SOFT_C = '#5B6B7B';
    const MONO = 'px ui-monospace, "SF Mono", Menlo, monospace';

    const S = sceneRef.current;
    const P = S.p;
    const Q = S.q;
    const R = S.red; // { p: p0, q: q0 } — the ray's direction

    ctx.clearRect(0, 0, W, H);

    /* ---- layout: a SQUARE lattice, centred, whatever the stage aspect ----- */
    const small = W < 420;
    const padL = small ? 28 : 46;
    const padR = small ? 12 : 18;
    // the top band is left clear for the floating hint, which would otherwise
    // sit on the q = 1 tick label down in the bottom margin. It must clear the
    // hint AND the p=12 label, which is centred on Y(12) and so pokes upward.
    const padT = small ? 38 : 44;
    const padB = small ? 26 : 38;
    const availW = W - padL - padR;
    const availH = H - padT - padB;
    const side = Math.max(40, Math.min(availW, availH));
    const cell = side / Q_MAX; // Q_MAX === P_MAX, so cells are square
    const ox = padL + (availW - side) / 2;
    const oy = padT + (availH - side) / 2 + side;
    const X = (qq) => ox + qq * cell;
    const Y = (pp) => oy - pp * cell;
    geoRef.current = { ox, oy, cell };

    const labelEvery = cell < 26 ? 2 : 1; // thin the tick labels on small screens

    /* ---- the quadrille IS the lattice ------------------------------------ */
    ctx.lineWidth = 1;
    ctx.strokeStyle = QUAD;
    ctx.beginPath();
    for (let i = 0; i <= Q_MAX; i++) {
      const gx = Math.round(X(i)) + 0.5;
      ctx.moveTo(gx, Y(0));
      ctx.lineTo(gx, Y(P_MAX));
      const gy = Math.round(Y(i)) + 0.5;
      ctx.moveTo(X(0), gy);
      ctx.lineTo(X(Q_MAX), gy);
    }
    ctx.stroke();

    /* ---- axes ------------------------------------------------------------ */
    ctx.strokeStyle = 'rgba(28,43,58,0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(X(0), Math.round(Y(0)) + 0.5);
    ctx.lineTo(X(Q_MAX), Math.round(Y(0)) + 0.5);
    ctx.moveTo(Math.round(X(0)) + 0.5, Y(0));
    ctx.lineTo(Math.round(X(0)) + 0.5, Y(P_MAX));
    ctx.stroke();

    // tick labels: q across the bottom (blue — the whole's structure), p up the
    // left (carmine — the count)
    ctx.font = '600 ' + (small ? 9 : 11) + MONO;
    ctx.fillStyle = BLU;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 1; i <= Q_MAX; i++) {
      if (i % labelEvery !== 0) continue;
      ctx.fillText(String(i), X(i), Y(0) + 5);
    }
    ctx.fillStyle = CARM;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 1; i <= P_MAX; i++) {
      if (i % labelEvery !== 0) continue;
      ctx.fillText(String(i), X(0) - 5, Y(i));
    }
    if (!small) {
      ctx.fillStyle = INK_SOFT_C;
      ctx.font = '600 10' + MONO;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('q  denominator  →', X(Q_MAX), Y(0) + 19);
      // centred on the axis and rotated to read upward. (Anchoring this at
      // Y(P_MAX) with textAlign 'left' ran the label off the top of the stage.)
      ctx.save();
      ctx.translate(X(0) - 26, (Y(0) + Y(P_MAX)) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('p  numerator  →', 0, 0);
      ctx.restore();
    }

    /* ---- a ray's far end, clipped to the lattice edge --------------------- */
    const rayEnd = (p0, q0) => {
      const t = p0 === 0 ? Q_MAX / q0 : Math.min(Q_MAX / q0, P_MAX / p0);
      return { q: q0 * t, p: p0 * t };
    };
    const arrow = (x0, y0, x1, y1, color) => {
      const a = Math.atan2(y1 - y0, x1 - x0);
      const s = 7;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - s * Math.cos(a - 0.4), y1 - s * Math.sin(a - 0.4));
      ctx.lineTo(x1 - s * Math.cos(a + 0.4), y1 - s * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fill();
    };

    /* ---- the target ray (calibration): one number, name hidden ----------- */
    if (S.calib && S.target != null) {
      const e = rayEnd(S.target.p, S.target.q);
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      ctx.lineTo(X(e.q), Y(e.p));
      ctx.stroke();
      ctx.restore();
      arrow(X(0), Y(0), X(e.q), Y(e.p), 'rgba(91,107,123,0.85)');
      // (no "the ray" caption: it sat at the ray's end, where it collided with
      // the dot's own pill. Grey-dashed vs carmine-solid already tells them
      // apart, and the tutor text names it.)
    }

    /* ---- the ×k STAIRCASE: k identical steps, over q0 then up p0 ---------- */
    // Its LANDINGS are exactly the names — this is why "×k" and "another name"
    // are the same act.
    if (S.showRay) {
      ctx.save();
      ctx.strokeStyle = 'rgba(217,152,43,0.85)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      let cq = 0;
      let cp = 0;
      const K = R.p === 0 ? Math.min(Q, Q_MAX) : Math.round(Q / R.q);
      for (let j = 0; j < K; j++) {
        ctx.lineTo(X(cq + R.q), Y(cp));
        cq += R.q;
        ctx.lineTo(X(cq), Y(cp + R.p));
        cp += R.p;
      }
      ctx.stroke();
      ctx.restore();
    }

    /* ---- lattice dots; the ones on the ray are the FAMILY ----------------- */
    for (let qq = Q_MIN; qq <= Q_MAX; qq++) {
      for (let pp = P_MIN; pp <= P_MAX; pp++) {
        const onRay = S.showRay && fracEqual(pp, qq, R.p, R.q);
        ctx.beginPath();
        ctx.arc(X(qq), Y(pp), onRay ? 3.4 : 1.9, 0, Math.PI * 2);
        ctx.fillStyle = onRay ? GOLD_C : 'rgba(28,43,58,0.20)';
        ctx.fill();
        if (onRay) {
          ctx.beginPath();
          ctx.arc(X(qq), Y(pp), 6.5, 0, Math.PI * 2);
          ctx.strokeStyle = GOLD_C;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
    }

    /* ---- THE RAY: the number itself -------------------------------------- */
    if (S.showRay) {
      const e = rayEnd(R.p, R.q);
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      ctx.lineTo(X(e.q), Y(e.p));
      ctx.stroke();
      arrow(X(0), Y(0), X(e.q), Y(e.p), CARM);
      // the family is infinite; the grid is what runs out
      ctx.fillStyle = CARM;
      ctx.font = '700 13' + MONO;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const ex = X(e.q);
      const ey = Y(e.p);
      if (ex < W - 22) ctx.fillText('…', ex + 7, ey - 7);
    }

    /* ---- the q = 1 line: where the whole is ONE part, so the height IS the
       number. This is also the picture of the calibration meter. ----------- */
    if (S.showRay) {
      const vy = Y(P / Q);
      ctx.save();
      ctx.strokeStyle = 'rgba(217,152,43,0.75)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(X(1), Y(0));
      ctx.lineTo(X(1), vy);
      ctx.stroke();
      ctx.restore();

      if (S.calib && S.target != null) {
        // the meter, drawn: the gap between the two rays on the q = 1 line
        const ty = Y(S.target.p / S.target.q);
        ctx.save();
        ctx.strokeStyle = 'rgba(91,107,123,0.9)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(X(1) - 5, ty);
        ctx.lineTo(X(1) + 5, ty);
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(X(1), vy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = PAPER;
      ctx.fill();
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (cell >= 30) {
        const vtext = decimalString(P, Q);
        ctx.font = '700 11' + MONO;
        const tw2 = ctx.measureText(vtext).width;
        ctx.fillStyle = 'rgba(251,251,248,0.9)';
        ctx.fillRect(X(1) + 8, vy - 8, tw2 + 6, 15);
        ctx.fillStyle = CARM;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(vtext, X(1) + 11, vy);
      }
      // (no "q=1" caption here: the blue tick label 1 already sits directly
      // below this guide, and a second label collided with it)
    }

    /* ---- THE WEDGE: cross-multiplication, made visible -------------------- */
    // Area = |twist| / 2 grid squares. It collapses to nothing exactly when the
    // two dots name the same number.
    if (S.pin) {
      const t = twist(P, Q, S.pin.p, S.pin.q);
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      ctx.lineTo(X(Q), Y(P));
      ctx.lineTo(X(S.pin.q), Y(S.pin.p));
      ctx.closePath();
      ctx.fillStyle = GOLD_SOFT;
      ctx.fill();
      ctx.strokeStyle = t === 0 ? 'rgba(217,152,43,0.5)' : GOLD_C;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      if (t !== 0) {
        // Anchor on the midpoint of the two dots (NOT the triangle's centroid,
        // which is dragged toward the origin and collided with the q = 1
        // readout), then push PERPENDICULAR to the wedge's long axis, away from
        // the origin. Adjacent dots like 1/3 and 1/2 make a sliver whose
        // midpoint lands on the pinned dot itself, so pushing off-axis is the
        // only placement that survives the cramped near-miss cases.
        const mx = (X(Q) + X(S.pin.q)) / 2;
        const my = (Y(P) + Y(S.pin.p)) / 2;
        const dxE = X(Q) - X(S.pin.q);
        const dyE = Y(P) - Y(S.pin.p);
        let nx = -dyE;
        let ny = dxE;
        const nlen = Math.hypot(nx, ny) || 1;
        nx /= nlen;
        ny /= nlen;
        const d2 = (x, y) => (x - X(0)) ** 2 + (y - Y(0)) ** 2;
        if (d2(mx + nx, my + ny) < d2(mx, my)) {
          nx = -nx;
          ny = -ny;
        }
        const cxw = mx + nx * 22;
        const cyw = my + ny * 22;
        const lab = `twist ${t > 0 ? '+' : '−'}${Math.abs(t)}`;
        ctx.font = '700 11' + MONO;
        const lw = ctx.measureText(lab).width;
        ctx.fillStyle = 'rgba(251,251,248,0.92)';
        ctx.fillRect(cxw - lw / 2 - 4, cyw - 8, lw + 8, 16);
        ctx.fillStyle = GOLD_C;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lab, cxw, cyw);
      }

      // the pinned name — ink, a bookmark, deliberately not a second accent
      ctx.beginPath();
      ctx.arc(X(S.pin.q), Y(S.pin.p), 5.5, 0, Math.PI * 2);
      ctx.fillStyle = INK_C;
      ctx.fill();
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // below the dot: above is where the carmine pill and the twist label go
      ctx.fillStyle = INK_C;
      ctx.font = '700 11' + MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${S.pin.p}/${S.pin.q} pinned`, X(S.pin.q), Y(S.pin.p) + 9);
    }

    /* ---- the simplest-form dot: the FIRST dot on the ray ------------------ */
    if (S.showRay && !(R.p === P && R.q === Q)) {
      ctx.beginPath();
      ctx.arc(X(R.q), Y(R.p), 8.5, 0, Math.PI * 2);
      ctx.strokeStyle = GOLD_C;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    /* ---- hover ----------------------------------------------------------- */
    const hv = hoverRef.current;
    if (hv) {
      ctx.beginPath();
      ctx.arc(X(hv.q), Y(hv.p), 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(28,43,58,0.45)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      const lab = `${hv.p}/${hv.q}`;
      ctx.font = '700 11' + MONO;
      const lw = ctx.measureText(lab).width;
      const bx = Math.min(Math.max(X(hv.q), X(0) + lw / 2 + 6), W - lw / 2 - 6);
      ctx.fillStyle = 'rgba(28,43,58,0.9)';
      ctx.fillRect(bx - lw / 2 - 5, Y(hv.p) + 11, lw + 10, 16);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, bx, Y(hv.p) + 19);
    }

    /* ---- THE DOT: your fraction ------------------------------------------ */
    {
      const dx = X(Q);
      const dy = Y(P);
      ctx.beginPath();
      ctx.arc(dx, dy, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = CARM;
      ctx.fill();
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 2;
      ctx.stroke();

      const pill = `${P}/${Q}`;
      ctx.font = '700 13' + MONO;
      const tw3 = ctx.measureText(pill).width;
      const bw = tw3 + 14;
      const bh = 20;
      const bx = Math.min(Math.max(dx + 10, 2), W - bw - 2);
      // sit above the dot, but flip below rather than ride up into the hint
      let by = dy - bh - 8;
      if (by < padT + 2) by = dy + 10;
      by = Math.min(by, H - bh - 2);
      const rr = 5;
      ctx.fillStyle = CARM;
      ctx.beginPath();
      ctx.moveTo(bx + rr, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + bh, rr);
      ctx.arcTo(bx + bw, by + bh, bx, by + bh, rr);
      ctx.arcTo(bx, by + bh, bx, by, rr);
      ctx.arcTo(bx, by, bx + bw, by, rr);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pill, bx + bw / 2, by + bh / 2 + 0.5);
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [p, q, step, target, pin, draw]);

  /* redraw on resize (the canvas is fluid; the lattice re-squares itself) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it, and start
     from 1/1 — provably never any target's name, so it is never pre-solved. */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setP(CALIB_START.p);
      setQ(CALIB_START.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* set up the twist step: pin the SIMPLEST name and stand on the 2nd name, so
     the wedge opens already SHUT between two DIFFERENT dots — "different name,
     same number" is the first thing you see, not something you have to build. */
  useEffect(() => {
    if (step === TWIST_STEP && pin == null) {
      const r = reduce(p, q);
      setPin({ p: r.p, q: r.q });
      if (kMax(r.p, r.q) >= 2) {
        setP(2 * r.p);
        setQ(2 * r.q);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (Number.isNaN(v)) return;
    if (key === 'q') {
      setQ(Math.max(Q_MIN, Math.min(Q_MAX, v)));
    } else if (key === 'p') {
      setP(Math.max(P_MIN, Math.min(P_MAX, v)));
    } else {
      // the k dial walks the dot along its own ray: k === gcd(p, q), always
      const r = reduce(p, q);
      const j = Math.max(1, Math.min(kMax(r.p, r.q), v));
      setP(j * r.p);
      setQ(j * r.q);
    }
  };

  const hitDot = (x, y) => {
    const { ox, oy, cell } = geoRef.current;
    if (!cell) return null;
    const qq = Math.round((x - ox) / cell);
    const pp = Math.round((oy - y) / cell);
    if (qq < Q_MIN || qq > Q_MAX || pp < P_MIN || pp > P_MAX) return null;
    const dx = x - (ox + qq * cell);
    const dy = y - (oy - pp * cell);
    if (dx * dx + dy * dy > (cell * 0.45) ** 2) return null;
    return { q: qq, p: pp };
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hit = hitDot(e.clientX - rect.left, e.clientY - rect.top);
    const cur = hoverRef.current;
    if ((hit && cur && hit.q === cur.q && hit.p === cur.p) || (!hit && !cur)) return;
    hoverRef.current = hit;
    draw();
  };
  const onPointerLeave = () => {
    if (hoverRef.current) {
      hoverRef.current = null;
      draw();
    }
  };
  // click any lattice dot to jump straight to that name — the map's natural
  // affordance, and the analogue of FractionLab's "click a bar part"
  const dotsClickable = step >= NUM_STEP || calib;
  const onPointerDown = (e) => {
    if (!dotsClickable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const hit = hitDot(e.clientX - rect.left, e.clientY - rect.top);
    if (!hit) return;
    setP(hit.p);
    setQ(hit.q);
  };

  const resetDials = () => {
    if (calib) {
      setP(CALIB_START.p);
      setQ(CALIB_START.q);
    } else {
      setP(START.p);
      setQ(START.q);
    }
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

  const spoken =
    `The fraction ${p} over ${q}, read ${readFraction(p, q)}, is the dot ${q} across and ` +
    `${p} up. It names the number ${decimalString(p, q)}. ` +
    (alreadySimplest
      ? 'It is in simplest form — the first dot on its ray. '
      : `Its simplest form is ${red.p} over ${red.q}, and it stands on step ${g} of its ray, ` +
        `so the greatest common factor of ${p} and ${q} is ${g}. `) +
    (showRay ? `Inside this grid its ray carries ${famMax} name${famMax === 1 ? '' : 's'}. ` : '') +
    (pinLive
      ? `Against the pinned name ${pin.p} over ${pin.q}, the twist is ${tw}, so they are ` +
        `${sameAsPin ? 'the same number' : 'different numbers'}. `
      : '') +
    (calib && target != null
      ? `The target ray passes through the dots ${familyOf(target.p, target.q)
          .map((n) => `${n.p} over ${n.q}`)
          .join(', ')}. `
      : '');

  const PARAMS = [
    {
      key: 'q', name: 'denominator', sym: 'q', unlock: DENOM_STEP, cls: 'q',
      role: 'equal parts in one whole — the dot’s ACROSS',
    },
    {
      key: 'p', name: 'numerator', sym: 'p', unlock: NUM_STEP, cls: 'p',
      role: 'parts you take — the dot’s UP',
    },
    {
      key: 'k', name: 'step on the ray', sym: 'k', unlock: RAY_STEP, cls: 'k',
      role: 'which name you stand on — this dial reads gcd(p, q)',
    },
  ];
  const valOf = { p, q, k: g };
  const maxOf = { p: P_MAX, q: Q_MAX, k: famMax };
  const minOf = { p: P_MIN, q: Q_MIN, k: 1 };

  return (
    <div className="eqlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Equivalent Fractions</h1>
        <p className="lede">
          A fraction is not a number — it is a <em>name</em> for one. Put every fraction{' '}
          <span className="mono">p/q</span> on a map: <span className="mono">q</span> across,{' '}
          <span className="mono">p</span> up. Then all the names of one number line up on a single{' '}
          <em>ray</em> from the origin. The ray is the number; the dots on it are its names.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <FractionReadout p={p} q={q} p0={red.p} q0={red.q} k={g} showRay={showRay} />
            </p>
            <p className="equation-sub mono">
              {readFraction(p, q)}
              {'  ·  = '}
              {decimalString(p, q)}
              {showRay ? `  ·  step ${g} of ${famMax}` : ''}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerDown={onPointerDown}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            {/* one line, always: wrapped to two it buried the top of the
                lattice on a phone. The trailing clause drops out below 560px. */}
            <span className="hint mono">
              {showRay ? 'one ray = one number' : dotsClickable ? 'click any dot' : 'each dot is a fraction'}
              <span className="hint-more">
                {showRay && dotsClickable ? ' · click any dot to jump' : ''}
              </span>
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated && target != null
              ? ` Calibrated — ${p}/${q} is a name for the target ray ${target.p}/${target.q}.`
              : ''}
          </p>

          {showRay && (
            <div className="names">
              <span className="names-k">
                Names of this number{alreadySimplest ? '' : ' — gold ring marks the simplest'}
              </span>
              <div className="names-row">
                {family.map((n) => (
                  <button
                    type="button"
                    key={n.k}
                    className={
                      'nchip' +
                      (n.p === p && n.q === q ? ' cur' : '') +
                      (n.k === 1 ? ' simplest' : '')
                    }
                    onClick={() => {
                      setP(n.p);
                      setQ(n.q);
                    }}
                    aria-label={`Jump to the name ${n.p} over ${n.q}, step ${n.k} of the ray`}
                  >
                    {n.p}/{n.q}
                  </button>
                ))}
                <span className="nmore" title="the family is infinite — the grid is what runs out">
                  …
                </span>
              </div>
            </div>
          )}

          <div className="facts">
            <div className="fact">
              <span className="fact-k">This name</span>
              <span className="fact-v mono carm big">
                {p}/{q}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">The number it names</span>
              <span className="fact-v mono">{decimalString(p, q)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Simplest form</span>
              <span className="fact-v mono">
                {red.p}/{red.q}
                {alreadySimplest ? ' (already simplest)' : ''}
              </span>
            </div>
            {/* "step on the ray" is meaningless before the ray exists (step 3),
                so hold that slot with the plain reading until then */}
            {showRay ? (
              <div className="fact">
                <span className="fact-k">Step on the ray</span>
                <span className="fact-v mono">
                  {g} of {famMax} · gcd({p},{q}) = {g}
                </span>
              </div>
            ) : (
              <div className="fact">
                <span className="fact-k">In words</span>
                <span className="fact-v">{readFraction(p, q)}</span>
              </div>
            )}
            {pinLive && (
              <div className="fact wide">
                <span className="fact-k">
                  Twist vs the pinned {pin.p}/{pin.q}
                </span>
                <span className="fact-v mono">
                  {p}·{pin.q} − {pin.p}·{q} ={' '}
                  <b className={sameAsPin ? 'ok' : 'gold'}>
                    {tw < 0 ? '−' + Math.abs(tw) : tw}
                  </b>
                  {sameAsPin
                    ? ' — zero twist: the wedge is shut, same number'
                    : ` — not zero: different numbers, and ${
                        tw > 0 ? `${p}/${q}` : `${pin.p}/${pin.q}`
                      } is the bigger one`}
                </span>
              </div>
            )}
          </div>

          <div className="toolbar">
            {step >= TWIST_STEP && !calib && (
              <button
                type="button"
                className={'btn ghost' + (pin ? ' on' : '')}
                onClick={() => setPin(pin ? null : { p, q })}
              >
                {pin ? 'Unpin' : 'Pin this name'}
              </button>
            )}
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

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className={'dk ' + d.cls}>{d.sym}</span>
                  <span className="dname">{d.name}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={minOf[d.key]}
                    max={maxOf[d.key]}
                    step={1}
                    value={valOf[d.key]}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.name} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? valOf[d.key] : '🔒'}</output>
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
                      {c}
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
                  <span className="mono target-hint">land on the grey ray</span>
                )}
              </div>
              {calibrated && (
                <p className="reveal">
                  That ray is <b className="mono">{target.p}/{target.q}</b> — and you named it{' '}
                  <b className="mono">{p}/{q}</b>
                  {fracEqual(p, q, target.p, target.q) && (p !== target.p || q !== target.q)
                    ? '. A different name, the same number.'
                    : '.'}{' '}
                  Walk the <b className="mono">k</b> dial: every step stays calibrated.
                </p>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setP(CALIB_START.p);
                  setQ(CALIB_START.q);
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
                  setPin(null);
                  setP(START.p);
                  setQ(START.q);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">p/q = (k·p)/(k·q)</span> &nbsp;·&nbsp; one number, infinitely many
        names: the dots on one ray from the origin. Simplest form is the first dot; gcd is its step
        number; cross-multiplying is the wedge (CCSS 4.NF.A.1, 4.NF.A.2, 6.NS.B.4).
      </footer>

      <style jsx>{`
        .eqlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --addend: #3f74a6;
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
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
          min-height: 58px;
        }
        .equation {
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
          text-align: right;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 7 / 6;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* the lattice is square, so give it a square stage when the column is
           narrow rather than letting the margins eat it */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
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
          top: 8px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
          white-space: nowrap;
          max-width: calc(100% - 20px);
          overflow: hidden;
        }
        @media (max-width: 560px) {
          .hint-more {
            display: none;
          }
        }
        .names {
          margin: 13px 4px 0;
        }
        .names-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          display: block;
          margin-bottom: 7px;
        }
        .names-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }
        .nchip {
          font: 700 12px/1 var(--mono);
          font-variant-numeric: tabular-nums;
          padding: 5px 7px;
          border-radius: 6px;
          border: 1px solid rgba(200, 30, 79, 0.4);
          background: transparent;
          color: var(--curve);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .nchip:hover {
          background: rgba(200, 30, 79, 0.08);
        }
        .nchip.cur {
          background: var(--curve);
          color: #fff;
          border-color: var(--curve);
        }
        .nchip.simplest {
          box-shadow: 0 0 0 2px var(--gold);
        }
        .nmore {
          color: var(--ink-soft);
          font: 700 14px/1 var(--mono);
          padding-left: 2px;
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
        .fact.wide {
          grid-column: 1 / -1;
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
        .fact-v.big {
          font-size: 21px;
        }
        .fact-v .ok {
          color: var(--ok);
        }
        .fact-v .gold {
          color: var(--gold);
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
          background: var(--ink);
          border-color: var(--ink);
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
        .dials {
          display: grid;
          gap: 14px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 46px 1fr 44px;
          grid-template-rows: auto auto auto;
          align-items: center;
          gap: 1px 10px;
        }
        .dial.locked {
          opacity: 0.5;
        }
        .dk {
          grid-row: 1 / 3;
          grid-column: 1;
          font-family: var(--mono);
          font-weight: 700;
          font-size: 17px;
          text-align: center;
        }
        .dk.p {
          color: var(--curve);
        }
        .dk.q {
          color: var(--addend);
        }
        .dk.k {
          color: var(--gold);
        }
        .dname {
          grid-column: 2 / 4;
          grid-row: 1;
          font-weight: 600;
          font-size: 13px;
        }
        .drole {
          grid-column: 2 / 4;
          grid-row: 2;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          grid-row: 3;
          width: 100%;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          grid-row: 3;
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
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
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
        .reveal {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          background: rgba(31, 138, 91, 0.07);
          border-left: 3px solid var(--ok);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
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
        :global(.eqlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .nchip {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
