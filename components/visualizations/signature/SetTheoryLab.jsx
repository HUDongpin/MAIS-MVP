'use client';

/* ============================================================================
   SetTheoryLab — an interactive "bench" for the foundations of SET THEORY: what
   a SET is, MEMBERSHIP (∈), the two-circle VENN DIAGRAM with its four regions,
   and the operations INTERSECTION (A ∩ B), UNION (A ∪ B), COMPLEMENT (A′), and
   DIFFERENCE (A − B) — capped by the counting idea that ties it all together,
   the INCLUSION–EXCLUSION principle  |A ∪ B| = |A| + |B| − |A ∩ B|.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Sets, Venn diagrams, and
   these operations run from upper-elementary "sorting" activities through the
   middle-school "sets & probability" strand into high-school logic — this lab
   makes the whole picture one manipulable object.

   House style: the interactive-math-bench standard — quadrille-paper stage, a
   control that unlocks one idea per lesson step, predict-then-check questions,
   and a calibration challenge with a live match meter.

   THE SIGNATURE CENTERPIECE — a CONCRETE Venn diagram.  Instead of drawing empty
   circles, the universal set U = {1, 2, …, 12} is shown as twelve numbered CHIPS
   that actually LIVE inside the diagram.  Every element sits in exactly ONE of
   the four regions — A only, the A∩B overlap, B only, or neither — and a click
   moves a chip from region to region (outside → A → A∩B → B → outside).  Because
   each number is physically in a region, a child SEES that:
     • an OPERATION is just "which regions do I shade?" — ∩ shades the overlap,
       ∪ shades everything in either circle, A′ shades everything outside A;
     • COUNTING obeys inclusion–exclusion — the overlap chips get counted by both
       |A| and |B|, so you subtract them once to count the union.

   One-accent discipline adapted to TWO sets: set A wears the carmine accent, set
   B a restrained blue (the two established lab colours), and their overlap the
   plum that is literally their blend.  The moment an operation is chosen, the
   RESULT set becomes the single carmine star — result chips fill solid carmine,
   the rest fade — so "the answer" always reads in one colour.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SetTheoryLab.jsx
     2. Import and render it:
          import SetTheoryLab from './SetTheoryLab';
          export default function Page() { return <SetTheoryLab />; }
   Zero dependencies (pure <canvas> + React hooks). Styles are scoped with
   styled-jsx (built into Next.js), so nothing here can leak into or collide with
   the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (mem, op, step, …).
     MODEL  — the math is pure, exact SET arithmetic; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — The universe.  A small, concrete universal set U = {1, …, 12}.  Twelve
   is a friendly size: it fits the diagram without crowding and it carries rich,
   checkable structure (evens, multiples of 3, primes, factors of 12), which the
   challenge exploits.
   ------------------------------------------------------------------------- */
const UNIVERSE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const N = UNIVERSE.length;

/* Membership is stored as a 2-bit code per element:  bit 0 (value 1) = "in A",
   bit 1 (value 2) = "in B".  So a chip's region is one of:
       0 = neither      1 = A only      2 = B only      3 = both (A ∩ B)
   This makes A and B independent booleans while staying trivially serialisable. */
const NEITHER = 0, A_ONLY = 1, B_ONLY = 2, BOTH = 3;
const inA = (code) => (code & 1) !== 0;
const inB = (code) => (code & 2) !== 0;

/* Seed the free-play diagram with two *meaningful* sets so the opening picture
   already teaches: A = the even numbers, B = the multiples of 3.  Then the
   overlap A∩B is exactly the multiples of 6 (= {6, 12}) and "neither" is the
   numbers that are neither even nor a multiple of 3 (= {1, 5, 7, 11}). */
const isEven = (n) => n % 2 === 0;
const isMul3 = (n) => n % 3 === 0;
function seedMem() {
  const m = {};
  for (const n of UNIVERSE) m[n] = (isEven(n) ? 1 : 0) | (isMul3(n) ? 2 : 0);
  return m;
}
const EMPTY_MEM = () => {
  const m = {};
  for (const n of UNIVERSE) m[n] = NEITHER;
  return m;
};

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Pure, exact set arithmetic over the universe.  These are the
   mathematics the lab teaches; the audit (audit-set.mjs) mirrors them exactly.
   ------------------------------------------------------------------------- */
const listA = (m) => UNIVERSE.filter((n) => inA(m[n]));
const listB = (m) => UNIVERSE.filter((n) => inB(m[n]));
const listInter = (m) => UNIVERSE.filter((n) => inA(m[n]) && inB(m[n])); // A ∩ B
const listUnion = (m) => UNIVERSE.filter((n) => inA(m[n]) || inB(m[n])); // A ∪ B
const listCompA = (m) => UNIVERSE.filter((n) => !inA(m[n]));             // A′  = U − A
const listDiffAB = (m) => UNIVERSE.filter((n) => inA(m[n]) && !inB(m[n])); // A − B
const listDiffBA = (m) => UNIVERSE.filter((n) => !inA(m[n]) && inB(m[n])); // B − A

/* Roster notation for a set, e.g. {6, 12}; the empty set prints as { } (∅). */
const roster = (arr) => (arr.length ? '{' + arr.join(', ') + '}' : '{ }');

/* Set relationship, from the live membership. */
function relationship(m) {
  const I = listInter(m).length;
  const aInB = listDiffAB(m).length === 0; // every element of A is also in B
  const bInA = listDiffBA(m).length === 0; // every element of B is also in A
  if (aInB && bInA) return { key: 'equal', text: 'A = B  (exactly the same elements)' };
  if (I === 0) return { key: 'disjoint', text: 'A and B are DISJOINT  (no shared elements)' };
  if (aInB) return { key: 'subset', text: 'A ⊆ B  (every element of A is in B)' };
  if (bInA) return { key: 'subset', text: 'B ⊆ A  (every element of B is in A)' };
  return { key: 'overlap', text: 'A and B OVERLAP  (they share some elements)' };
}

/* ---------------------------------------------------------------------------
   The four set OPERATIONS.  Each is (a) a symbol to display, (b) a function that
   returns the result set, and (c) the list of Venn REGIONS the result occupies
   (used to shade the canvas and to highlight the result chips).
   ------------------------------------------------------------------------- */
const CYCLE_FWD = { 0: A_ONLY, 1: BOTH, 3: B_ONLY, 2: NEITHER }; // outside→A→both→B→outside

function opInfo(op, dir) {
  switch (op) {
    case 'inter':
      return { label: 'A ∩ B', name: 'intersection', pick: listInter, regions: [BOTH] };
    case 'union':
      return { label: 'A ∪ B', name: 'union', pick: listUnion, regions: [A_ONLY, BOTH, B_ONLY] };
    case 'compA':
      return { label: 'A′', name: 'complement of A', pick: listCompA, regions: [NEITHER, B_ONLY] };
    case 'diff':
      return dir === 'BA'
        ? { label: 'B − A', name: 'difference', pick: listDiffBA, regions: [B_ONLY] }
        : { label: 'A − B', name: 'difference', pick: listDiffAB, regions: [A_ONLY] };
    default:
      return { label: null, name: 'the two sets', pick: () => null, regions: [] };
  }
}

/* Step indices — named so the unlock schedule and default-operation map read
   clearly.  One idea per step; the operation selector unlocks in lock-step. */
const STEP_SET = 0;      // what is a set / membership (only A live)
const STEP_TWOSETS = 1;  // two sets, the Venn diagram, the four regions
const STEP_INTER = 2;    // intersection
const STEP_UNION = 3;    // union
const STEP_COMP = 4;     // complement
const STEP_DIFF = 5;     // difference + relationships
const STEP_COUNT = 6;    // inclusion–exclusion
const CALIB_STEP = 7;    // the challenge

/* Which operation the selector auto-picks when a step is opened (the student may
   change it afterwards). */
function defaultOp(step) {
  if (step === STEP_INTER) return 'inter';
  if (step === STEP_UNION) return 'union';
  if (step === STEP_COMP) return 'compA';
  if (step === STEP_DIFF) return 'diff';
  if (step === STEP_COUNT) return 'union';
  return 'none';
}

const OPS = [
  { id: 'none', sym: 'A, B', name: 'just the sets', unlock: 0 },
  { id: 'inter', sym: 'A ∩ B', name: 'intersection', unlock: STEP_INTER },
  { id: 'union', sym: 'A ∪ B', name: 'union', unlock: STEP_UNION },
  { id: 'compA', sym: 'A′', name: 'complement', unlock: STEP_COMP },
  { id: 'diff', sym: 'A − B', name: 'difference', unlock: STEP_DIFF },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION GOAL (the skill's alternative to curve-
   matching): the challenge names a RULE for A and a RULE for B; the student must
   sort every number in U into the correct region.  The target region of each
   element is computed from the two rules, so the meter is exact and self-checking
   — CALIBRATED only when all twelve chips are placed correctly.
   ------------------------------------------------------------------------- */
const RULES = [
  { label: 'even numbers', test: (n) => n % 2 === 0 },
  { label: 'odd numbers', test: (n) => n % 2 === 1 },
  { label: 'multiples of 3', test: (n) => n % 3 === 0 },
  { label: 'multiples of 4', test: (n) => n % 4 === 0 },
  { label: 'numbers greater than 6', test: (n) => n > 6 },
  { label: 'numbers greater than 8', test: (n) => n > 8 },
  { label: 'numbers less than 6', test: (n) => n < 6 },
  { label: 'numbers from 1 to 4', test: (n) => n <= 4 },
  { label: 'prime numbers', test: (n) => [2, 3, 5, 7, 11].includes(n) },
  { label: 'factors of 12', test: (n) => 12 % n === 0 },
];

/* Is a pair of rules a good challenge?  Both sets non-trivial, not identical, and
   at least one number in "neither" so all four regions are in play. */
function goodPair(a, b) {
  const A = UNIVERSE.filter(a.test);
  const B = UNIVERSE.filter(b.test);
  if (A.length < 2 || A.length > 9) return false;
  if (B.length < 2 || B.length > 9) return false;
  const sameSet = A.length === B.length && A.every((n) => b.test(n));
  if (sameSet) return false;
  const union = UNIVERSE.filter((n) => a.test(n) || b.test(n));
  if (union.length >= N) return false; // keep a "neither" region
  return true;
}

function makeChallenge(prev) {
  const R = (hi) => Math.floor(Math.random() * hi);
  let a, b, guard = 0;
  do {
    a = RULES[R(RULES.length)];
    b = RULES[R(RULES.length)];
    guard++;
  } while (
    guard < 400 &&
    (a === b || !goodPair(a, b) || (prev && prev.a === a.label && prev.b === b.label))
  );
  return { a, b, aLabel: a.label, bLabel: b.label };
}

/* Target region code for an element under the challenge's two rules. */
const targetCode = (ch, n) => (ch.a.test(n) ? 1 : 0) | (ch.b.test(n) ? 2 : 0);
const matchCount = (ch, m) => UNIVERSE.filter((n) => m[n] === targetCode(ch, n)).length;
const matchPercent = (ch, m) => Math.round((100 * matchCount(ch, m)) / N);
const isCalibrated = (ch, m) => matchCount(ch, m) === N;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the operation selector unlocks with the
   step; the reveal lives in `feedback`; distractors are real learner
   misconceptions ("union double-counts the overlap", "A′ is the empty set", "the
   overlap is in A only").  Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What is a set?',
    body:
      'A SET is a collection of distinct objects — its ELEMENTS — listed in braces: A = {2, 4, 6}. ' +
      'Membership has a symbol: 3 ∈ A means 3 is in A; 5 ∉ A means it is not. Order and repeats ' +
      'never matter: {2, 4, 6} = {6, 4, 2}. The universe U holds 1 to 12. Click a number to drop ' +
      'it into A or pull it out.',
    q: 'For A = {2, 4, 6, 8}, which statement is TRUE?',
    choices: ['6 ∈ A (6 is in A)', '5 ∈ A', 'A has 6 elements'],
    answer: 0,
    feedback:
      '6 is listed, so 6 ∈ A; 5 is not, so 5 ∉ A. A lists four elements, so |A| = 4, not 6. Size ' +
      'is how many elements — repeats and reorders never change it.',
  },
  {
    title: 'Two sets & the Venn diagram',
    body:
      'A SECOND set B joins, drawn as a second circle. Where the circles cross, an element is in ' +
      'BOTH. That splits U into FOUR regions: A-only, the A∩B overlap, B-only, and NEITHER. Every ' +
      'number lives in exactly one region — click a chip to cycle it: outside → A → A∩B → B → ' +
      'outside.',
    q: 'A number sits inside BOTH circle A and circle B. Which region is it in?',
    choices: ['the overlap — it is in A and in B', 'the A-only crescent', 'outside both circles'],
    answer: 0,
    feedback:
      'Inside both circles is the OVERLAP — the lens-shaped A ∩ B. The left crescent is “A but ' +
      'not B”, the right “B but not A”, the box outside is “neither”. Four regions; each element ' +
      'sits in exactly one.',
  },
  {
    title: 'Intersection: A ∩ B (in BOTH)',
    body:
      'The INTERSECTION A ∩ B holds the elements in A AND in B — exactly the chips in the overlap, ' +
      'shaded now. Sets that share nothing have the EMPTY set, written ∅ or { }. With A = evens and ' +
      'B = multiples of 3, the overlap is the multiples of 6.',
    q: 'A = {2,4,6,8,10,12} (evens) and B = {3,6,9,12} (multiples of 3). What is A ∩ B?',
    choices: ['{6, 12}', '{3, 6, 9, 12}', '{ } (empty)'],
    answer: 0,
    feedback:
      'A ∩ B keeps only what is in BOTH lists: even AND a multiple of 3 means a multiple of 6, so ' +
      'A ∩ B = {6, 12}. Everything else is in one set, or neither.',
  },
  {
    title: 'Union: A ∪ B (in EITHER)',
    body:
      'The UNION A ∪ B holds the elements in A OR in B — “or” is inclusive, so the overlap counts ' +
      'too. It is every chip inside either circle, shaded as one region. A shared element is listed ' +
      'ONCE: a set never repeats.',
    q: 'How many elements are in A ∪ B if |A| = 6, |B| = 4, and they share 2 elements?',
    choices: ['8', '10', '2'],
    answer: 0,
    feedback:
      'Add, then remove the double-count: 6 + 4 = 10 counts the 2 shared elements TWICE; subtract ' +
      'once → 8. That counting rule becomes the final step’s formula.',
  },
  {
    title: 'Complement: A′ (NOT in A)',
    body:
      'The COMPLEMENT A′ (also written Aᶜ) is everything in U that is NOT in A: A′ = U − A — every ' +
      'region outside circle A, shaded now. It depends on U: change the universe, change A′. A set ' +
      'and its complement make all of U, so |A| + |A′| = |U|.',
    q: 'U = {1, …, 12} and A = the even numbers. What is A′?',
    choices: ['the odd numbers {1,3,5,7,9,11}', '{ } (empty)', 'the even numbers again'],
    answer: 0,
    feedback:
      'A′ is everything in U that is NOT even — the odds {1,3,5,7,9,11}. 6 evens + 6 odds = 12 = ' +
      '|U|. A complement is measured against the universe U, so U must be stated.',
  },
  {
    title: 'Difference & set relationships',
    body:
      'The DIFFERENCE A − B is “in A but NOT in B” — the A-only crescent. Order matters: A − B and ' +
      'B − A differ (try the direction toggle). Watch the badge: sharing nothing makes A and B ' +
      'DISJOINT (A ∩ B = ∅); every element of A inside B makes A a SUBSET, A ⊆ B.',
    q: 'What does A − B mean?',
    choices: ['the elements in A but NOT in B', 'the elements in B but not in A', 'the elements in both A and B'],
    answer: 0,
    feedback:
      'A − B removes B’s elements from A, leaving the A-only crescent — generally NOT the same as ' +
      'B − A. When A − B is empty, nothing in A lies outside B: that is exactly A ⊆ B.',
  },
  {
    title: 'Counting: inclusion–exclusion',
    body:
      'The payoff. Adding sizes over-counts a UNION: the overlap chips are claimed by BOTH |A| and ' +
      '|B|. Subtract the overlap once — the INCLUSION–EXCLUSION principle: |A ∪ B| = |A| + |B| − ' +
      '|A ∩ B|. The live equation below always balances — move chips and watch.',
    q: 'In a class, 15 play soccer and 12 play basketball; 5 play both. How many play at least one sport?',
    choices: ['22', '27', '17'],
    answer: 0,
    feedback:
      '“At least one” is the union: 15 + 12 − 5 = 22. Adding double-counts the 5 who play both; ' +
      'subtract them once. Getting 27 is the classic mistake.',
  },
  {
    title: 'The sorting challenge',
    body:
      'Final challenge. Two RULES are named below — one for A, one for B. Sort every number in U: ' +
      'click a chip to cycle it. Fits BOTH rules → the overlap; fits neither → outside both circles. ' +
      'The meter climbs as chips land correctly — all 12 for CALIBRATED. “New challenge” deals a ' +
      'fresh pair of rules.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 5 — Expression display.  The current expression, big and carmine, with
   its result set in roster notation and a green size chip.  With no operation
   chosen it shows the two sets A and B in their own colours.  Colour is the
   pedagogical link between the symbol and the shaded picture.

   Styles are inlined here (not in the styled-jsx block) because these spans are
   rendered by a CHILD component; styled-jsx only scopes a component's own JSX,
   so inlining keeps the readout identical in Next.js and in any plain preview.
   ------------------------------------------------------------------------- */
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const CHIP_BASE = {
  fontFamily: MONO,
  fontSize: '12px',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function SetExpr({ op, dir, mem }) {
  if (op === 'none') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 700, color: '#c81e4f' }}>
          A = {roster(listA(mem))}
        </span>
        <span style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 700, color: '#3f74a6' }}>
          B = {roster(listB(mem))}
        </span>
      </span>
    );
  }
  const info = opInfo(op, dir);
  const res = info.pick(mem) || [];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: '19px',
          fontWeight: 700,
          color: '#c81e4f',
          letterSpacing: '0.01em',
        }}
      >
        {info.label} = {roster(res)}
      </span>
      <span style={{ ...CHIP_BASE, color: '#2e8b6f', background: 'rgba(46,139,111,0.1)' }}>
        size {res.length}
      </span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SetTheoryLab() {
  const [mem, setMem] = useState(seedMem);
  const [op, setOp] = useState('none');
  const [dir, setDir] = useState('AB'); // difference direction: A−B or B−A
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [challenge, setChallenge] = useState(null); // { a, b, aLabel, bLabel }

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const chipPosRef = useRef({}); // element → {x, y} screen position, written by draw()
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const bLive = step >= STEP_TWOSETS; // set B (and the four-region cycle) in play

  /* live sets & counts */
  const A = listA(mem), B = listB(mem);
  const I = listInter(mem), U = listUnion(mem);
  const rel = relationship(mem);
  const info = opInfo(op, dir);
  const result = info.pick(mem);

  /* Snapshot everything the renderer needs so the stable draw() callback never
     reads stale values. */
  sceneRef.current = { mem, op, dir, step, bLive, calib, result };

  const pct = challenge ? matchPercent(challenge, mem) : 0;
  const nRight = challenge ? matchCount(challenge, mem) : 0;
  const calibrated = challenge ? isCalibrated(challenge, mem) : false;
  sceneRef.current._cal = calib && calibrated;

  /* ---- full redraw from state ------------------------------------------- */
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
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept beside the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F';
    const BLUE = '#3F74A6';
    const PLUM = '#8E4585';
    const GREY = '#8A97A3';
    const OK = '#1F8A5B';
    const PAPER = '#FBFBF8';

    const S = sceneRef.current;
    const M = S.mem;

    g.clearRect(0, 0, W, H);

    /* ---- the universal-set frame (box U) ----------------------------------- */
    const pad = 16;
    const fx = pad, fy = pad + 4, fw = W - pad * 2, fh = H - pad * 2 - 4;
    const rr = (x, y, w, h, rad) => {
      const t = Math.min(rad, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + t, y);
      g.arcTo(x + w, y, x + w, y + h, t);
      g.arcTo(x + w, y + h, x, y + h, t);
      g.arcTo(x, y + h, x, y, t);
      g.arcTo(x, y, x + w, y, t);
      g.closePath();
    };

    /* solid paper interior — this is also the "eraser" colour the region-shading
       uses to punch clean holes, so it MUST be an opaque solid. */
    rr(fx, fy, fw, fh, 12);
    g.fillStyle = PAPER;
    g.fill();

    /* faint quadrille rules inside the box */
    g.save();
    rr(fx, fy, fw, fh, 12);
    g.clip();
    g.strokeStyle = 'rgba(199,216,228,0.5)';
    g.lineWidth = 1;
    g.beginPath();
    const gs = 26;
    for (let x = fx + gs; x < fx + fw; x += gs) {
      g.moveTo(Math.round(x) + 0.5, fy);
      g.lineTo(Math.round(x) + 0.5, fy + fh);
    }
    for (let y = fy + gs; y < fy + fh; y += gs) {
      g.moveTo(fx, Math.round(y) + 0.5);
      g.lineTo(fx + fw, Math.round(y) + 0.5);
    }
    g.stroke();
    g.restore();

    /* ---- circle geometry --------------------------------------------------- */
    const cx = fx + fw / 2;
    const cy = fy + fh * 0.5;
    const twoSets = S.bLive;
    // radius chosen so two overlapping circles sit comfortably inside the box
    const r = Math.min(fw * (twoSets ? 0.28 : 0.24), fh * 0.4);
    const off = twoSets ? r * 0.5 : 0; // half the centre separation
    const cxA = cx - off;
    const cxB = cx + off;
    const rc = Math.max(11, Math.min(15, fw / 34)); // chip radius

    const circle = (ccx, ccy, rad) => {
      g.beginPath();
      g.arc(ccx, ccy, rad, 0, Math.PI * 2);
    };

    /* ---- region shading ---------------------------------------------------- */
    if (S.op === 'none' || !twoSets) {
      // Base tints: A carmine, B blue; the overlap naturally blends to plum.
      g.fillStyle = 'rgba(200,30,79,0.12)';
      circle(cxA, cy, r);
      g.fill();
      if (twoSets) {
        g.fillStyle = 'rgba(63,116,166,0.12)';
        circle(cxB, cy, r);
        g.fill();
      }
    } else {
      // A single medium carmine wash over EXACTLY the result regions, built with
      // clip + paper-erase so every result is one uniform, textbook "shaded
      // region" — no compositing tricks.
      const WASH = 'rgba(200,30,79,0.26)';
      g.fillStyle = WASH;
      if (S.op === 'inter') {
        g.save();
        circle(cxA, cy, r);
        g.clip();
        circle(cxB, cy, r);
        g.fill();
        g.restore();
      } else if (S.op === 'union') {
        // one path, two subpaths, non-zero winding → the union, filled uniformly
        g.beginPath();
        g.arc(cxA, cy, r, 0, Math.PI * 2);
        g.arc(cxB, cy, r, 0, Math.PI * 2);
        g.fill();
      } else if (S.op === 'compA') {
        g.save();
        rr(fx, fy, fw, fh, 12);
        g.clip();
        g.fillStyle = WASH;
        g.fillRect(fx, fy, fw, fh);
        g.fillStyle = PAPER; // erase circle A back to paper
        circle(cxA, cy, r);
        g.fill();
        g.restore();
      } else if (S.op === 'diff') {
        const keep = S.dir === 'BA' ? [cxB, cxA] : [cxA, cxB];
        g.save();
        circle(keep[0], cy, r);
        g.clip();
        g.fillStyle = WASH;
        g.fillRect(fx, fy, fw, fh); // fills the kept circle
        g.fillStyle = PAPER; // erase the other circle (removes the overlap)
        circle(keep[1], cy, r);
        g.fill();
        g.restore();
      }
    }

    /* ---- circle outlines + labels ------------------------------------------ */
    g.lineWidth = 2;
    g.strokeStyle = CARMINE;
    circle(cxA, cy, r);
    g.stroke();
    if (twoSets) {
      g.strokeStyle = BLUE;
      circle(cxB, cy, r);
      g.stroke();
    }
    // set labels A / B at the outer tops of the circles
    g.font = '700 17px ' + '"Iowan Old Style", Palatino, Georgia, serif';
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.fillStyle = CARMINE;
    g.fillText('A', cxA - (twoSets ? r * 0.62 : 0), cy - r + (twoSets ? 2 : 14));
    if (twoSets) {
      g.fillStyle = BLUE;
      g.fillText('B', cxB + r * 0.62, cy - r + 2);
    }

    /* ---- the box outline + "U" label (drawn last of the frame) ------------- */
    rr(fx, fy, fw, fh, 12);
    g.strokeStyle = 'rgba(28,43,58,0.45)';
    g.lineWidth = 1.4;
    g.stroke();
    g.font = '700 13px ' + MONO;
    g.fillStyle = INK_SOFT;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText('U', fx + 8, fy + 6);
    g.font = '600 10.5px system-ui, sans-serif';
    g.fillText('universe', fx + 20, fy + 8);

    /* ---- lay out the chips: classify a grid of candidate points by region, then
       spread each region's elements over its candidates -------------------- */
    const inAroom = (px, py) => (px - cxA) ** 2 + (py - cy) ** 2 <= (r - rc - 4) ** 2;
    const inBroom = (px, py) => twoSets && (px - cxB) ** 2 + (py - cy) ** 2 <= (r - rc - 4) ** 2;
    const outA = (px, py) => (px - cxA) ** 2 + (py - cy) ** 2 >= (r + rc * 0.35) ** 2;
    const outB = (px, py) => !twoSets || (px - cxB) ** 2 + (py - cy) ** 2 >= (r + rc * 0.35) ** 2;

    const cand = { [NEITHER]: [], [A_ONLY]: [], [B_ONLY]: [], [BOTH]: [] };
    const gstep = Math.max(22, 2 * rc + 2);
    const m2 = rc + 6;
    for (let py = fy + m2; py <= fy + fh - m2; py += gstep * 0.72) {
      for (let px = fx + m2; px <= fx + fw - m2; px += gstep) {
        const iA = inAroom(px, py), iB = inBroom(px, py);
        if (iA && iB) cand[BOTH].push({ x: px, y: py });
        else if (iA && outB(px, py)) cand[A_ONLY].push({ x: px, y: py });
        else if (iB && outA(px, py)) cand[B_ONLY].push({ x: px, y: py });
        else if (outA(px, py) && outB(px, py)) cand[NEITHER].push({ x: px, y: py });
      }
    }

    // farthest-point sampling so a region's chips spread out instead of clustering
    const anchors = {
      [NEITHER]: { x: fx + fw * 0.5, y: fy + fh * 0.9 },
      [A_ONLY]: { x: cxA - r * 0.45, y: cy },
      [BOTH]: { x: cx, y: cy },
      [B_ONLY]: { x: cxB + r * 0.45, y: cy },
    };
    const pickSpread = (arr, k, ax, ay) => {
      if (k <= 0) return [];
      if (arr.length <= k) {
        const out = arr.slice();
        let i = out.length;
        while (out.length < k) {
          const col = (i % 3) - 1, row = Math.floor(i / 3) - 1;
          out.push({ x: ax + col * (2 * rc + 3), y: ay + row * (2 * rc + 3) });
          i++;
        }
        return out;
      }
      const chosen = [];
      let seed = arr[0], sd = Infinity;
      for (const p of arr) {
        const d = (p.x - ax) ** 2 + (p.y - ay) ** 2;
        if (d < sd) { sd = d; seed = p; }
      }
      chosen.push(seed);
      while (chosen.length < k) {
        let best = null, bestD = -1;
        for (const p of arr) {
          let dmin = Infinity;
          for (const c of chosen) {
            const dd = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
            if (dd < dmin) dmin = dd;
          }
          if (dmin > bestD) { bestD = dmin; best = p; }
        }
        chosen.push(best);
      }
      return chosen;
    };

    const pos = {};
    for (const regionCode of [NEITHER, A_ONLY, B_ONLY, BOTH]) {
      const elems = UNIVERSE.filter((n) => M[n] === regionCode).sort((p, q) => p - q);
      if (elems.length === 0) continue;
      const a = anchors[regionCode];
      const slots = pickSpread(cand[regionCode], elems.length, a.x, a.y);
      slots.sort((p, q) => (Math.abs(p.y - q.y) > rc ? p.y - q.y : p.x - q.x));
      elems.forEach((n, i) => { pos[n] = slots[i]; });
    }
    chipPosRef.current = pos;

    /* ---- draw the chips ---------------------------------------------------- */
    const resultSet = S.result ? new Set(S.result) : null;
    const chipStyleFor = (n) => {
      const code = M[n];
      if (resultSet) {
        // an operation is active: the result set is the single carmine star
        if (resultSet.has(n)) return { fill: CARMINE, stroke: CARMINE, text: '#fff', bold: true };
        return { fill: '#fff', stroke: 'rgba(28,43,58,0.22)', text: 'rgba(28,43,58,0.42)', bold: false };
      }
      // no operation: colour the chip by its region (carmine A / blue B / plum both)
      const col = code === A_ONLY ? CARMINE : code === B_ONLY ? BLUE : code === BOTH ? PLUM : GREY;
      return { fill: '#fff', stroke: col, text: col, bold: false };
    };

    for (const n of UNIVERSE) {
      const p = pos[n];
      if (!p) continue;
      const st = chipStyleFor(n);
      g.save();
      g.beginPath();
      g.arc(p.x, p.y, rc, 0, Math.PI * 2);
      g.fillStyle = st.fill;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = st.stroke;
      g.stroke();
      g.fillStyle = st.text;
      g.font = (st.bold ? '700 ' : '600 ') + Math.round(rc * 0.95) + 'px ' + MONO;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(n), p.x, p.y + 0.5);
      g.restore();
    }

    /* ---- a caption naming the shaded region -------------------------------- */
    if (S.op !== 'none' && twoSets) {
      const cap = 'shaded: ' + opInfo(S.op, S.dir).label;
      g.font = '600 11.5px ' + MONO;
      const tw = g.measureText(cap).width;
      const bx = fx + fw - tw - 20;
      const by = fy + fh - 26;
      g.fillStyle = 'rgba(251,251,248,0.92)';
      rr(bx - 8, by - 4, tw + 16, 22, 6);
      g.fill();
      g.strokeStyle = 'rgba(200,30,79,0.35)';
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = CARMINE;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(cap, bx, by + 7);
    }

    /* ---- calibrated stamp -------------------------------------------------- */
    if (S._cal) {
      g.save();
      g.translate(cx, fy + fh * 0.5);
      g.rotate(-0.05);
      g.fillStyle = 'rgba(31,138,91,0.12)';
      rr(-84, -18, 168, 36, 8);
      g.fill();
      g.strokeStyle = OK;
      g.lineWidth = 2;
      rr(-84, -18, 168, 36, 8);
      g.stroke();
      g.fillStyle = OK;
      g.font = '700 15px ' + MONO;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('✓ CALIBRATED', 0, 0.5);
      g.restore();
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [mem, op, dir, step, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* when the step changes: auto-select the step's operation, and set up / tear
     down the challenge. */
  useEffect(() => {
    setOp(defaultOp(step));
    setDir('AB');
    if (step === CALIB_STEP) {
      setChallenge((prev) => prev || makeChallenge(null));
      setMem(EMPTY_MEM());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction: click a chip to cycle its region --------------------- */
  const cycleChip = (n) => {
    setMem((prev) => {
      const next = { ...prev };
      if (!bLive) {
        // only set A is live: a plain in/out toggle
        next[n] = inA(prev[n]) ? NEITHER : A_ONLY;
      } else {
        next[n] = CYCLE_FWD[prev[n]];
      }
      return next;
    });
  };

  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const pos = chipPosRef.current;
    let hit = null, best = Infinity;
    for (const n of UNIVERSE) {
      const p = pos[n];
      if (!p) continue;
      const d = (px - p.x) ** 2 + (py - p.y) ** 2;
      if (d < best) { best = d; hit = n; }
    }
    const rc = Math.max(11, Math.min(15, (stageRef.current?.clientWidth || 400) / 34));
    if (hit != null && best <= (rc + 6) ** 2) cycleChip(hit);
  };

  /* ---- other handlers ---------------------------------------------------- */
  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const resetMembership = () => {
    if (calib) setMem(EMPTY_MEM());
    else setMem(seedMem());
  };
  const newChallenge = () => {
    setChallenge((prev) => makeChallenge(prev));
    setMem(EMPTY_MEM());
  };
  const restart = () => {
    setStep(0);
    setAnswers({});
    setChallenge(null);
    setOp('none');
    setDir('AB');
    setMem(seedMem());
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* region label for the accessible element strip */
  const regionName = (code) =>
    code === A_ONLY ? 'A only' : code === B_ONLY ? 'B only' : code === BOTH ? 'A and B' : 'neither';
  const regionShort = (code) => (code === A_ONLY ? 'A' : code === B_ONLY ? 'B' : code === BOTH ? 'A∩B' : '·');

  /* spoken description (accessibility) */
  const parts = [`The universe U holds the numbers 1 to 12.`, `Set A is ${roster(A)}.`];
  if (bLive) parts.push(`Set B is ${roster(B)}.`);
  if (op !== 'none' && bLive) parts.push(`${info.label} is ${roster(result)}, with ${result.length} elements.`);
  if (bLive) parts.push(rel.text.replace(/\s+\(.*\)/, '') + '.');
  const spoken = parts.join(' ');

  return (
    <div className="slab">
      <header className="head">
        <h1>Set Theory: Circles that Sort the World</h1>
        <p className="lede">
          A <em>set</em> is a collection of elements. Drop the numbers of the universe{' '}
          <span className="mono">U = {'{1, …, 12}'}</span> into two circles and watch how the operations{' '}
          <em>intersection</em> <span className="mono">(∩)</span>, <em>union</em>{' '}
          <span className="mono">(∪)</span>, <em>complement</em> <span className="mono">(′)</span>, and{' '}
          <em>difference</em> <span className="mono">(−)</span> are simply <em>which region you shade</em> —
          then count them with the inclusion–exclusion rule.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <SetExpr op={op} dir={dir} mem={mem} />
            </p>
            <p className="equation-sub mono">{bLive ? rel.text : 'set A — click numbers to add them'}</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onPointerDown}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">click a number to move it</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — every number is sorted correctly.' : ''}
          </p>

          {/* accessible element control — the primary, keyboard-friendly way to
              move numbers between regions (mirrors clicking the chips). */}
          <div className="strip" role="group" aria-label="Universe elements — click to move between regions">
            {UNIVERSE.map((n) => {
              const code = mem[n];
              const cls =
                'el ' +
                (code === A_ONLY ? 'a' : code === B_ONLY ? 'b' : code === BOTH ? 'ab' : 'none');
              return (
                <button
                  type="button"
                  key={n}
                  className={cls}
                  onClick={() => cycleChip(n)}
                  aria-label={`Number ${n}, currently in ${regionName(code)}. Click to move it.`}
                >
                  <span className="el-n">{n}</span>
                  <span className="el-r" aria-hidden="true">{regionShort(code)}</span>
                </button>
              );
            })}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Sizes</span>
              <span className="fact-v mono">
                |A| = {A.length}{bLive ? `,  |B| = ${B.length}` : ''}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Intersection · Union</span>
              <span className="fact-v mono">
                {bLive ? `|A∩B| = ${I.length},  |A∪B| = ${U.length}` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Relationship</span>
              <span className="fact-v">{bLive ? rel.text.replace(/\s+\(.*\)/, '') : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Inclusion–exclusion</span>
              <span className="fact-v mono">
                {bLive ? `${A.length} + ${B.length} − ${I.length} = ${U.length}` : '—'}
              </span>
            </div>
          </div>

          <div className="toolbar">
            {op === 'diff' && !calib && (
              <div className="ctx-group" role="group" aria-label="Difference direction">
                <button
                  type="button"
                  className={'chipbtn' + (dir === 'AB' ? ' on' : '')}
                  aria-pressed={dir === 'AB'}
                  onClick={() => setDir('AB')}
                >
                  A − B
                </button>
                <button
                  type="button"
                  className={'chipbtn' + (dir === 'BA' ? ' on' : '')}
                  aria-pressed={dir === 'BA'}
                  onClick={() => setDir('BA')}
                >
                  B − A
                </button>
              </div>
            )}
            <button type="button" className="btn ghost" onClick={resetMembership}>
              {calib ? 'Clear all' : 'Reset sets'}
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

          {/* the operation selector — the "dials" of this lab, unlocking per step */}
          {!calib && (
            <div className="ops" role="group" aria-label="Set operation">
              <span className="ops-k">Operation</span>
              <div className="ops-row">
                {OPS.map((o) => {
                  const unlocked = step >= o.unlock;
                  return (
                    <button
                      type="button"
                      key={o.id}
                      className={'opbtn' + (op === o.id ? ' on' : '') + (unlocked ? '' : ' locked')}
                      disabled={!unlocked}
                      aria-pressed={op === o.id}
                      onClick={() => setOp(o.id)}
                      title={unlocked ? o.name : `unlocks at step ${o.unlock + 1}`}
                    >
                      <span className="opsym">{unlocked ? o.sym : '🔒'}</span>
                      <span className="opname">{o.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

          {calib && challenge && (
            <div className="calib">
              <div className="clue-card">
                <span className="clue-k">Sort the numbers so that…</span>
                <span className="clue-row">
                  <span className="clue-badge a">A</span>
                  <span className="clue-text">{challenge.aLabel}</span>
                </span>
                <span className="clue-row">
                  <span className="clue-badge b">B</span>
                  <span className="clue-text">{challenge.bLabel}</span>
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{nRight} / {N} correct</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono dir-hint">keep sorting…</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={newChallenge}>
                New challenge
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
              <button type="button" className="btn" onClick={restart}>
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">A ∩ B · A ∪ B · A′ · A − B</span> &nbsp;·&nbsp; sets, Venn diagrams, and the
        inclusion–exclusion rule <span className="mono">|A∪B| = |A| + |B| − |A∩B|</span>.
      </footer>

      <style jsx>{`
        .slab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --bcol: #3f74a6;
          --plum: #8e4585;
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
          max-width: 78ch;
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
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 7 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: manipulation;
          cursor: pointer;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
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
          background: rgba(251, 251, 248, 0.78);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 5 / 5;
          }
        }
        .strip {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin: 12px 2px 2px;
        }
        .el {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 40px;
          padding: 4px 0 3px;
          border-radius: 8px;
          border: 1px solid rgba(28, 43, 58, 0.18);
          background: var(--paper);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.12s, background 0.12s;
        }
        .el:hover {
          transform: translateY(-1px);
        }
        .el-n {
          font-family: var(--mono);
          font-weight: 700;
          font-size: 14px;
          line-height: 1.1;
        }
        .el-r {
          font-family: var(--mono);
          font-size: 9px;
          line-height: 1.1;
          color: var(--ink-soft);
        }
        .el.a {
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.08);
        }
        .el.a .el-n,
        .el.a .el-r {
          color: var(--curve);
        }
        .el.b {
          border-color: var(--bcol);
          background: rgba(63, 116, 166, 0.08);
        }
        .el.b .el-n,
        .el.b .el-r {
          color: var(--bcol);
        }
        .el.ab {
          border-color: var(--plum);
          background: rgba(142, 69, 133, 0.1);
        }
        .el.ab .el-n,
        .el.ab .el-r {
          color: var(--plum);
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
          font-size: 14px;
          font-variant-numeric: tabular-nums;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
        }
        .ctx-group {
          display: inline-flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .chipbtn {
          font: 600 12px/1 var(--mono);
          padding: 7px 10px;
          border-radius: 999px;
          cursor: pointer;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink-soft);
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .chipbtn.on {
          background: var(--ink);
          border-color: var(--ink);
          color: #fff;
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
        .ops {
          margin-bottom: 4px;
        }
        .ops-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .ops-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 5px;
          margin-top: 7px;
        }
        .opbtn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 8px 2px 6px;
          border-radius: 8px;
          border: 1px solid rgba(28, 43, 58, 0.18);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.12s, background 0.12s, color 0.12s;
        }
        .opbtn .opsym {
          font-family: var(--mono);
          font-weight: 700;
          font-size: 13px;
        }
        .opbtn .opname {
          font-size: 9.5px;
          color: var(--ink-soft);
          text-align: center;
          line-height: 1.1;
        }
        .opbtn.on {
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.09);
        }
        .opbtn.on .opsym {
          color: var(--curve);
        }
        .opbtn.on .opname {
          color: var(--curve);
        }
        .opbtn.locked {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .opbtn:not(:disabled):not(.on):hover {
          border-color: var(--ink);
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
        .clue-card {
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 11px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(63, 116, 166, 0.05);
        }
        .clue-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .clue-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .clue-badge {
          flex: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font: 700 13px var(--serif);
          color: #fff;
        }
        .clue-badge.a {
          background: var(--curve);
        }
        .clue-badge.b {
          background: var(--bcol);
        }
        .clue-text {
          font-family: var(--serif);
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.5), var(--curve));
          transition: width 0.18s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .dir-hint {
          color: var(--ink-soft);
          font-size: 12.5px;
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
        :global(.slab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chipbtn,
          .opbtn,
          .el {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
