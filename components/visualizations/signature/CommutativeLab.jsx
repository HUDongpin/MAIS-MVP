'use client';

/* ============================================================================
   CommutativeLab — an interactive "bench" for the COMMUTATIVE PROPERTY, told as
   the story of an OPERATION TABLE and the mirror line down its crease.

   Built for MAIS (math AI system, www.mais.ac), K-12. Grade 3 territory and up —
   CCSS 3.OA.B.5 ("Apply properties of operations as strategies to multiply and
   divide"), with the grade-1 on-ramp 1.OA.B.3 and the later pay-off in
   6.EE.A.3 / 7.EE.A.1 (equivalent expressions — where − and ÷ punish anyone who
   assumed order never matters).

   House style: the interactive-math-bench standard — a quadrille-paper canvas, a
   staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with a
   live meter and a CALIBRATED stamp.

   THE SIGNATURE CENTERPIECE — "the table is its own mirror."
     Every pair (a, b) with a, b from 1 to n gets a cell holding a ⊙ b. Swapping
     the two numbers does not nudge the picture: it REFLECTS you across the
     crease, the diagonal where a = b. So "does order matter?" stops being a
     question about one sum and becomes a question about a shape:

         the operation commutes  ⟺  the table is symmetric about its crease

     which is a claim about all n² pairs at once, not about one lucky example.

     HONESTY IS DESIGNED INTO THE PICTURE, exactly as the sieve is in
     PrimeNumbersLab. A cell's shading is computed by `level()`, a pure function
     of THAT CELL'S OWN VALUE — it never looks at its mirror, and nothing ever
     tells a cell to match its partner. So when the two halves come out identical
     the match is a RESULT, not an instruction. Switch to − and the same honest
     rule tears the picture in half. The audit proves the equivalence:
         level(a,b) === level(b,a) for all a,b   ⟺   the operation commutes.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   this is the LCMLab "built twice" lesson, and it bites hardest here because
   commutativity is ALREADY MET by two shipped labs):
     • AddLab owns a + b on a NUMBER LINE (count-on hops, unit bars) and already
       meets the commutative "turn-around" at its step 5, with a Swap a↔b button.
     • MultiplicationLab owns a × b as an ARRAY of unit squares and already meets
       commutativity at its step 4 — as a TRANSPOSE, with a dashed ghost of b × a
       laid over the solid a × b and a Flip a↔b button.
     Both show ONE pair, and in both the picture MOVES. This lab therefore draws
     no array, no number line, no rods, no hops, and nothing transposes. It owns
     the three things neither sibling has:
       (1) ALL PAIRS AT ONCE — commutativity is a ∀ statement, and the table is
           the smallest picture that can carry a ∀. One flipped array shows that
           3 × 4 = 4 × 3; it cannot show the law.
       (2) THE OPERATIONS THAT FAIL — + − × ÷ on one switch. You cannot know what
           the property means until you have seen an operation that lacks it, and
           no sibling ever draws a − or ÷ table. The failures are not vague: the
           mirror of a − b is its OPPOSITE, the mirror of a ÷ b is its RECIPROCAL
           (the fraction, upside down), both exact, both visible.
       (3) THE CREASE PROVES NOTHING — the a = b cells are their own reflection,
           so every operation passes there, even the broken ones. That is the
           trap the property's name hides, and it is this lab's foil.
     Also distinct from AssociativeAdditionLab / AssociativeMultiplicationLab
     (which REGROUP three inputs and deliberately refuse the reorder mechanic —
     "commutativity reorders, associativity regroups; keeping those apart is the
     whole pedagogical job"), from DistributiveLab (one law, two directions, a
     rectangle pulled apart), and from TableLab (a two-way CONTINGENCY table of
     categorical survey counts, with margins and the "% of what?" trap — a
     different grid entirely, and it has no diagonal).

   DROP-IN USAGE (Next.js, app or pages router):
     1. Save anywhere, e.g. app/labs/CommutativeLab.jsx
     2. import CommutativeLab from './CommutativeLab';
        export default function Page() { return <CommutativeLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the operation, the table
              size, the chosen pair, the lenses, the lesson step, the challenge).
     MODEL  — every value is an EXACT RATIONAL in integer arithmetic. Division is
              the only operation that needs a fraction and it is never once
              evaluated as a float, so no cell can ever read 0.30000000000000004
              and no float ever decides whether two cells agree.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // THE accent — the MIRROR: the crease, and the pair it swaps
const BLUE = '#2f6f9f'; // the table body, and "at or above the crease's value"
const TEAL = '#2e8b6f'; // role-based 2nd tint: "below the crease's value" (a − b < 0, a ÷ b < 1)
const GOLD = '#c8891e'; // the invariant: an answer that survived the swap, a fact you got free
const GOLD_DK = '#8f6410';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const OK = '#1f8a5b';

const N_MIN = 4;
const N_MAX = 12;

/* ===========================================================================
   MODEL — pure integer math. No pixels, and no float ever decides a claim.
   =========================================================================== */

/* Euclid's algorithm, for reducing the division table's fractions. */
function gcd(x, y) {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/* THE FOUR OPERATIONS, and what this lab CLAIMS about each. `commutes` is a
   claim, not a computation — audit-commutative.mjs checks every one of these
   flags against an exhaustive sweep of the actual cells, so the lab can never
   assert a property its own table contradicts. */
const OPS = [
  {
    key: 'add',
    glyph: '+',
    name: 'addition',
    verb: 'add',
    commutes: true,
    law: 'a + b = b + a',
    mirror: 'the same number',
  },
  {
    key: 'mul',
    glyph: '×',
    name: 'multiplication',
    verb: 'multiply',
    commutes: true,
    law: 'a × b = b × a',
    mirror: 'the same number',
  },
  {
    key: 'sub',
    glyph: '−',
    name: 'subtraction',
    verb: 'subtract',
    commutes: false,
    law: 'a − b ≠ b − a  (unless a = b)',
    mirror: 'the opposite — b − a is −(a − b)',
  },
  {
    key: 'div',
    glyph: '÷',
    name: 'division',
    verb: 'divide',
    commutes: false,
    law: 'a ÷ b ≠ b ÷ a  (unless a = b)',
    mirror: 'the reciprocal — b ÷ a is a ÷ b turned upside down',
  },
];
const opOf = (key) => OPS.find((o) => o.key === key);

/* A cell's value as an EXACT rational p/q, q > 0, always fully reduced.
   +, × and − land on q = 1. Division is the only one that needs the fraction —
   and 3 ÷ 4 is stored as {p:3, q:4}, never as 0.75. That is what lets rEq below
   compare two cells in pure integers. */
function cellVal(a, b, op) {
  if (op === 'add') return { p: a + b, q: 1 };
  if (op === 'mul') return { p: a * b, q: 1 };
  if (op === 'sub') return { p: a - b, q: 1 };
  const g = gcd(a, b) || 1; // a, b ≥ 1 here, so g ≥ 1
  return { p: a / g, q: b / g };
}

/* Rational equality by integer cross-multiplication. No float, no epsilon. */
function rEq(x, y) {
  return x.p * y.q === y.p * x.q;
}

function intText(k) {
  return k < 0 ? '−' + String(-k) : String(k);
}

function rText(v) {
  return v.q === 1 ? intText(v.p) : `${intText(v.p)}/${v.q}`;
}

/* THE QUESTION THE WHOLE LAB ASKS, for one cell. Exact. */
function commutesAt(a, b, op) {
  return rEq(cellVal(a, b, op), cellVal(b, a, op));
}

/* THE CENTREPIECE RULE — how dark a cell is drawn.

   Read this before changing it. `level` is a PURE FUNCTION OF THE CELL'S OWN
   VALUE: for every operation it is g(a ⊙ b) for a strictly increasing g, so two
   cells holding the same number are always shaded the same, and NOTHING here
   consults the mirror cell. That is the entire honesty of the picture — the two
   halves of the + table match because a + b really equals b + a, not because
   anything told them to. The audit proves both directions:
       value(a,b) === value(c,d)  ⇒  level(a,b) === level(c,d)      (reads the value)
       (∀a,b: level(a,b) === level(b,a))  ⟺  the operation commutes  (and nothing more)

   Returns t in [−1, 1]. The SIGN picks the hue (blue at or above the crease's
   value, teal below it); |t| picks the intensity. For + and × the value is never
   below the crease's, so those tables come out blue throughout; for − and ÷ the
   sign flips exactly as you cross the crease, which is what tears the picture in
   half. The logs on × and ÷ are only a monotone rescaling — products and
   quotients bunch up at the low end, and a linear ramp would wash the table out.
   A monotone rescaling cannot manufacture a symmetry that is not there. */
function level(a, b, op, n) {
  if (op === 'add') return (a + b - 2) / (2 * n - 2); //          [0, 1]
  if (op === 'mul') return Math.log(a * b) / Math.log(n * n); //  [0, 1]
  if (op === 'sub') return (a - b) / (n - 1); //                  [−1, 1]
  return Math.log(a / b) / Math.log(n); //                 div:   [−1, 1]
}

function cellFill(t) {
  const m = Math.min(1, Math.abs(t));
  const alpha = 0.05 + 0.5 * m;
  return t >= 0 ? `rgba(47,111,159,${alpha})` : `rgba(46,139,111,${alpha})`;
}

/* ---- the counting that makes the property worth having --------------------
   An n × n table has n² cells, but (a, b) and (b, a) are ONE fact written twice.
   The n cells on the crease are their own mirror, so they pair with nobody:
       n² cells  =  n crease cells  +  n(n−1)/2 mirror pairs × 2
   so the facts you actually have to learn number
       n + n(n−1)/2  =  n(n+1)/2
   which for the 12 × 12 times table is 78, not 144. All exact integers. ---- */
function minFacts(n) {
  return (n * (n + 1)) / 2;
}
function mirrorPairs(n) {
  return (n * (n - 1)) / 2;
}

/* ---- the challenge's table sizes. Small enough that covering one by hand is a
   game rather than a chore: 10, 15, 21 and 28 facts respectively. ---- */
const HUNT_NS = [4, 5, 6, 7];

function pickHuntN(prev) {
  let v = prev;
  while (!v || v === prev) v = HUNT_NS[Math.floor(Math.random() * HUNT_NS.length)];
  return v;
}

/* ===========================================================================
   LESSON — one capability unlocks per step; the last step is the challenge.
   Every QUESTION is self-contained and carries its own numbers, so it can never
   contradict where the dials happen to be sitting when a student presses Back.
   =========================================================================== */
const STEPS = [
  {
    title: 'Every answer, all at once',
    body:
      'An addition table: the row picks the first number, the column the second. ' +
      'All 36 answers at once.',
    q: 'What does the cell in row 3, column 5 hold?',
    choices: ['3 + 5, which is 8', '3 × 5, which is 15', 'the digits side by side, 35'],
    answer: 0,
    feedback:
      'Row first, column second: 3 + 5 = 8. Row 5, column 3 is a DIFFERENT cell — ' +
      'does it hold a different number?',
  },
  {
    title: 'Pick a pair',
    body: 'The dials pick a cell: a is the row, b is the column. Click around.',
    q: 'In a + b, which number does the ROW pick?',
    choices: ['a — the first number', 'b — the second', 'Neither'],
    answer: 0,
    feedback: 'The dials spell out an ORDER: a first, b second.',
  },
  {
    title: 'Swap them',
    body:
      'Press Swap. The outlined cell jumps to row b, column a — a genuinely ' +
      'different cell.',
    q: 'Row 3, column 5 holds 8. What is in row 5, column 3?',
    choices: ['8 — the same answer', '2 — the difference', '15 — you multiply'],
    answer: 0,
    feedback:
      '8, both times. Addition is COMMUTATIVE: a + b = b + a. But one pair is ' +
      'one pair — there are 36.',
  },
  {
    title: 'The table is its own mirror',
    body:
      'Turn on the mirror lens. Swapping a and b is a REFLECTION across the ' +
      'crease — and the two shaded halves match.',
    q: 'Each cell is shaded only from its own number. Why does that matter?',
    choices: [
      'The match is a result, not a decoration',
      'It is easier to read',
      'It proves the table is square',
    ],
    answer: 0,
    feedback:
      'No cell is told to match its partner — the halves agree only because ' +
      'a + b = b + a for all 36 pairs at once.',
  },
  {
    title: 'Does multiplication keep it?',
    body: 'Throw the switch to ×. Predict before you look: does the crease survive?',
    q: 'Will the two halves still match?',
    choices: ['Yes — a × b = b × a', 'No — the answers are bigger', 'Only near the crease'],
    answer: 0,
    feedback:
      '3 × 5 and 5 × 3 are the same array, turned a quarter circle. But is ' +
      '“order never matters” a law of arithmetic? No…',
  },
  {
    title: 'Now break it',
    body: 'Throw the switch to −, then try ÷. Watch the crease.',
    q: 'Row 3, column 5 holds 3 − 5 = −2. What is in row 5, column 3?',
    choices: ['2 — the opposite', '−2 — the same', '8 — you add instead'],
    answer: 0,
    feedback:
      'Swapping flips the sign — the halves are photographic negatives. And ' +
      '3 ÷ 5 = 3/5 but 5 ÷ 3 = 5/3. Only + and × commute.',
  },
  {
    title: 'The crease proves nothing',
    body:
      'On −, set BOTH dials to 4. The answer survives the swap! So does ' +
      'subtraction commute after all?',
    q: 'What has that shown?',
    choices: [
      'Nothing — a crease cell is its own mirror',
      'That subtraction commutes',
      'That 4 is special',
    ],
    answer: 0,
    feedback:
      'On the crease a cell cannot disagree with itself — every operation passes ' +
      'there. Test OFF the crease: a − b = b − a only when a = b.',
  },
  {
    title: 'So you only learn half',
    body:
      'Open the table to 12 × 12 — the whole times table. Drag, and watch the ' +
      'mirror pairs collapse in the facts panel.',
    q: '144 cells. How many separate facts must you memorise?',
    choices: [
      '78 — the 66 mirror pairs plus the 12 crease cells',
      '72 — exactly half',
      '144 — every cell',
    ],
    answer: 0,
    feedback:
      'The 12 crease cells have no partner: 66 + 12 = 78. In general n(n+1)/2 — ' +
      'the property nearly halves the work.',
  },
  {
    title: 'Cover the table',
    body:
      'Click a cell to LEARN it — its mirror comes free, in gold. Cover the ' +
      'whole table in the fewest facts.',
    calib: true,
  },
];

const CALIB_STEP = STEPS.length - 1;
const START = { op: 'add', n: 6, a: 3, b: 5 };

/* ===========================================================================
   COMPONENT
   =========================================================================== */
export default function CommutativeLab() {
  const [op, setOp] = useState(START.op);
  const [n, setN] = useState(START.n);
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [mirror, setMirror] = useState(false); // lens: the crease + the reflection bar
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState('');
  const [picks, setPicks] = useState([]); // the challenge: every fact clicked, in order
  const [waste, setWaste] = useState(null); // { a, b } — a fact that was already free

  const current = STEPS[step];
  const calib = !!current.calib;
  const O = opOf(op);

  /* ---- refs -------------------------------------------------------------- */
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const layoutRef = useRef(null);
  const seededRef = useRef({});
  const prevStepRef = useRef(0);

  /* ---- derived, exact math ---------------------------------------------- */
  const vAB = useMemo(() => cellVal(a, b, op), [a, b, op]);
  const vBA = useMemo(() => cellVal(b, a, op), [a, b, op]);
  const same = useMemo(() => rEq(vAB, vBA), [vAB, vBA]);
  const onCrease = a === b;

  /* ---- the challenge ----------------------------------------------------- */
  /* covered is derived from picks, so it can never drift from what was clicked.
     One pick covers its cell AND its mirror — which is the property paying the
     student back, and is the only reason the table can be covered in n(n+1)/2. */
  const covered = useMemo(() => {
    const s = new Set();
    for (const [pa, pb] of picks) {
      s.add(`${pa},${pb}`);
      s.add(`${pb},${pa}`);
    }
    return s;
  }, [picks]);
  const paidSet = useMemo(() => new Set(picks.map(([pa, pb]) => `${pa},${pb}`)), [picks]);

  const clicks = picks.length;
  const need = minFacts(n);
  const cells = n * n;
  const full = covered.size === cells;

  /* THE STAMP GATE. Each pick covers exactly one mirror class, and there are
     exactly minFacts(n) classes, so covering all n² cells needs AT LEAST
     minFacts(n) picks. Therefore
         full ∧ clicks === need   ⟺   every pick hit a fresh class, and all of
                                      them were hit — i.e. perfect play.
     It is a conjunction of two exact integer facts, so it is provably impossible
     to fire falsely. The percentage never gates it. (Audited exhaustively.) */
  const calibrated = calib && full && clicks === need;

  const rawPct = useMemo(() => {
    if (!calib) return 0;
    const cov = covered.size / cells;
    const eff = clicks === 0 ? 0 : need / Math.max(clicks, need);
    return 70 * cov + 30 * eff * cov;
  }, [calib, covered.size, cells, clicks, need]);
  /* 100 is shown only when the stamp is genuinely earned — never as a rounding
     artefact of 99.6. */
  const pct = calibrated ? 100 : Math.min(99, Math.round(rawPct));

  /* ---- the reveal schedule ----------------------------------------------
     A facts panel that is a pure function of the dials will print the lesson's
     punchline before the lesson gets to it (the AssociativeAdditionLab bug).
     Every row below is gated on `step`, and reads a muted "?" until earned —
     which is also the honest answer, since until you have swapped once there is
     no second cell to compare with. */
  const showMirrorFact = step >= 3; // step 2's own Swap is that step's check
  const showVerdict = step >= 3;
  const showRelation = step >= 5; // "the opposite" / "the reciprocal"
  const showCount = step >= 7;

  sceneRef.current = {
    ...sceneRef.current,
    op,
    n,
    a,
    b,
    mirror,
    calib,
    step,
    covered,
    paidSet,
  };

  /* ---- a, b can never point outside the table --------------------------- */
  useEffect(() => {
    setA((x) => Math.min(x, n));
    setB((x) => Math.min(x, n));
  }, [n]);

  /* ---- seed the steps that are a pay-off rather than a prediction ---------
     Deliberately NOT seeded: the operation on steps 4 and 5. Throwing that
     switch IS the check those steps ask for; arriving with it already thrown
     would answer the question before it is asked. Step 7 is different — "back to
     ×" is a return, not a prediction — and its n dial is left for the student,
     because dragging it while the fact count recomputes is the whole pay-off. */
  useEffect(() => {
    if (step >= 3 && !seededRef.current.mirror) {
      seededRef.current.mirror = true;
      setMirror(true);
    }
    if (step >= 7 && !seededRef.current.times) {
      seededRef.current.times = true;
      setOp('mul');
    }
  }, [step]);

  /* ---- entering and leaving the challenge -------------------------------
     Leaving it must restore a table worth looking at: without this, Back out of
     the challenge strands the lesson on the challenge's little 4×4 board with an
     empty pair (the DistributiveLab "back out of calibration" bug). */
  useEffect(() => {
    const wasCalib = prevStepRef.current === CALIB_STEP;
    if (calib && !wasCalib) {
      setOp('mul'); // the challenge is the times table, and only the times table
      setN(pickHuntN(null));
      setPicks([]);
      setWaste(null);
      setNote('');
    } else if (!calib && wasCalib) {
      setOp('mul');
      setN(12);
      setA(3);
      setB(7);
      setPicks([]);
      setWaste(null);
      setNote('');
    }
    prevStepRef.current = step;
  }, [step, calib]);

  /* a wasted fact explains itself, then clears */
  useEffect(() => {
    if (!waste) return;
    const id = setTimeout(() => setWaste(null), 3000);
    return () => clearTimeout(id);
  }, [waste]);

  useEffect(() => setNote(''), [step, op, n]);

  /* =======================================================================
     RENDER — the operation table, redrawn from state.
     ======================================================================= */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const S = sceneRef.current;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

    /* faint quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    const GRID = 28;
    for (let gx = GRID; gx < W; gx += GRID) {
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, H);
    }
    for (let gy = GRID; gy < H; gy += GRID) {
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(W, gy + 0.5);
    }
    ctx.stroke();

    /* ---- layout: one header lane + n cells, each way. The stage is square,
       so the table fills it whatever n is. ---- */
    const N = S.n;
    const PAD = 10;
    const cell = Math.min((W - 2 * PAD) / (N + 1), (H - 2 * PAD) / (N + 1));
    const gx0 = (W - cell * (N + 1)) / 2;
    const gy0 = (H - cell * (N + 1)) / 2;
    const tx0 = gx0 + cell; // the table proper starts after the header column
    const ty0 = gy0 + cell;
    layoutRef.current = { tx0, ty0, cell, n: N };

    const cx = (bb) => tx0 + (bb - 0.5) * cell; // centre of column bb
    const cy = (aa) => ty0 + (aa - 0.5) * cell; // centre of row aa
    const baseFs = Math.max(7, cell * 0.36);
    const inset = Math.max(0.5, cell * 0.03);

    /* shrink a label until it fits its cell — a fraction like 11/12 is far wider
       than a 7, and a smeared label is worse than a small one */
    const fitFont = (txt, max, base, weight) => {
      let fs = base;
      ctx.font = `${weight} ${fs}px ${MONO}`;
      while (fs > 6 && ctx.measureText(txt).width > max) {
        fs -= 0.5;
        ctx.font = `${weight} ${fs}px ${MONO}`;
      }
      return fs;
    };

    /* ---------------- the cells ---------------- */
    for (let aa = 1; aa <= N; aa++) {
      for (let bb = 1; bb <= N; bb++) {
        const x = tx0 + (bb - 1) * cell;
        const y = ty0 + (aa - 1) * cell;
        const key = `${aa},${bb}`;

        let fill;
        let stroke = 'rgba(28,43,58,0.10)';
        let lw = 1;
        let dash = false;
        let txt = null;
        let txtCol = INK;
        let weight = 500;

        if (S.calib) {
          /* the challenge: a cell is blank until it is known. A fact you paid
             for reads blue; one the property handed you reads gold. */
          const isCov = S.covered.has(key);
          if (!isCov) {
            fill = 'rgba(255,255,255,0.55)';
            stroke = 'rgba(28,43,58,0.13)';
            dash = true;
          } else {
            const paid = S.paidSet.has(key);
            fill = paid ? 'rgba(47,111,159,0.13)' : 'rgba(200,137,30,0.15)';
            stroke = paid ? 'rgba(47,111,159,0.5)' : GOLD;
            lw = 1.3;
            txt = rText(cellVal(aa, bb, S.op));
            txtCol = paid ? BLUE : GOLD_DK;
            weight = 700;
          }
        } else {
          const t = level(aa, bb, S.op, N);
          fill = cellFill(t);
          txt = rText(cellVal(aa, bb, S.op));
          txtCol = 'rgba(28,43,58,0.86)';
        }

        roundRect(ctx, x + inset, y + inset, cell - 2 * inset, cell - 2 * inset, Math.min(4, cell * 0.1));
        ctx.fillStyle = fill;
        ctx.fill();
        if (dash) ctx.setLineDash([3, 3]);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
        ctx.setLineDash([]);

        if (txt != null) {
          const fs = fitFont(txt, cell * 0.84, baseFs, weight);
          ctx.font = `${weight} ${fs}px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = txtCol;
          ctx.fillText(txt, x + cell / 2, y + cell / 2 + 0.5);
        }
      }
    }

    /* ---------------- headers ---------------- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hdrFs = Math.max(8, Math.min(15, cell * 0.34));
    for (let k = 1; k <= N; k++) {
      const hotCol = !S.calib && S.step >= 1 && k === S.b;
      const hotRow = !S.calib && S.step >= 1 && k === S.a;
      /* column header */
      ctx.font = `${hotCol ? 700 : 500} ${hdrFs}px ${MONO}`;
      ctx.fillStyle = hotCol ? CURVE : INK_SOFT;
      ctx.fillText(String(k), cx(k), gy0 + cell / 2);
      /* row header */
      ctx.font = `${hotRow ? 700 : 500} ${hdrFs}px ${MONO}`;
      ctx.fillStyle = hotRow ? CURVE : INK_SOFT;
      ctx.fillText(String(k), gx0 + cell / 2, cy(k));
    }
    /* the corner names the operation the whole table is made of */
    ctx.font = `600 ${Math.max(11, Math.min(21, cell * 0.5))}px ${MONO}`;
    ctx.fillStyle = 'rgba(28,43,58,0.5)';
    ctx.fillText(opOf(S.op).glyph, gx0 + cell / 2, gy0 + cell / 2);

    /* ---------------- the crease: the mirror line ----------------
       It runs corner to corner across the table, which passes exactly through
       the centre of every a = b cell — the cells that are their own reflection. */
    if (S.mirror && !S.calib) {
      ctx.strokeStyle = 'rgba(200,30,79,0.75)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(tx0, ty0);
      ctx.lineTo(tx0 + N * cell, ty0 + N * cell);
      ctx.stroke();
      ctx.setLineDash([]);
      if (cell >= 26) {
        ctx.save();
        ctx.translate(tx0 + N * cell - 4, ty0 + N * cell + 11);
        ctx.rotate(-Math.PI / 4);
        ctx.font = `700 10px ${MONO}`;
        ctx.fillStyle = CURVE;
        ctx.textAlign = 'right';
        ctx.fillText('a = b', 0, 0);
        ctx.restore();
      }
    }

    /* ---------------- the chosen pair, and its mirror ---------------- */
    if (!S.calib && S.step >= 1) {
      const drawRing = (aa, bb, dashed) => {
        roundRect(
          ctx,
          tx0 + (bb - 1) * cell + 1.4,
          ty0 + (aa - 1) * cell + 1.4,
          cell - 2.8,
          cell - 2.8,
          Math.min(4, cell * 0.1)
        );
        if (dashed) ctx.setLineDash([4, 3]);
        ctx.strokeStyle = CURVE;
        ctx.lineWidth = dashed ? 1.6 : 2.4;
        ctx.stroke();
        ctx.setLineDash([]);
      };

      /* the reflection bar. The segment from (a,b) to (b,a) is ALWAYS
         perpendicular to the crease and bisected by it — reflection, drawn. */
      if (S.mirror && S.a !== S.b && S.step >= 2) {
        const x1 = cx(S.b);
        const y1 = cy(S.a);
        const x2 = cx(S.a);
        const y2 = cy(S.b);
        ctx.strokeStyle = 'rgba(200,30,79,0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        /* the right-angle tick where it meets the crease */
        const s = Math.min(7, cell * 0.2);
        const ux = (x2 - x1) / Math.hypot(x2 - x1, y2 - y1);
        const uy = (y2 - y1) / Math.hypot(x2 - x1, y2 - y1);
        ctx.beginPath();
        ctx.moveTo(mx + ux * s - uy * s, my + uy * s + ux * s);
        ctx.lineTo(mx - uy * s, my + ux * s);
        ctx.lineTo(mx - ux * s - uy * s, my - uy * s + ux * s);
        ctx.strokeStyle = 'rgba(200,30,79,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mx, my, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = CURVE;
        ctx.fill();
      }

      if (S.a !== S.b && S.step >= 2) drawRing(S.b, S.a, true);
      drawRing(S.a, S.b, false);

      /* on the crease there is only ONE cell — say so, because that is the trap */
      if (S.a === S.b && S.mirror && cell >= 22) {
        ctx.font = `700 10px ${MONO}`;
        ctx.fillStyle = CURVE;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const ly = ty0 + (S.a - 1) * cell - 3;
        if (ly > 12) ctx.fillText('its own mirror', cx(S.b), ly);
      }
    }
  }, []);

  function roundRect(ctx, x, y, w2, h2, rr) {
    const k = Math.max(0, Math.min(rr, Math.min(w2, h2) / 2));
    ctx.beginPath();
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w2, y, x + w2, y + h2, k);
    ctx.arcTo(x + w2, y + h2, x, y + h2, k);
    ctx.arcTo(x, y + h2, x, y, k);
    ctx.arcTo(x, y, x + w2, y, k);
    ctx.closePath();
  }

  useEffect(() => {
    draw();
  }, [op, n, a, b, mirror, step, picks, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* ---- interaction ------------------------------------------------------- */
  const hitCell = (ev) => {
    const L = layoutRef.current;
    const canvas = canvasRef.current;
    if (!L || !canvas) return null;
    const r = canvas.getBoundingClientRect();
    const px = ev.clientX - r.left;
    const py = ev.clientY - r.top;
    const bb = Math.floor((px - L.tx0) / L.cell) + 1;
    const aa = Math.floor((py - L.ty0) / L.cell) + 1;
    if (aa < 1 || aa > L.n || bb < 1 || bb > L.n) return null;
    return { a: aa, b: bb };
  };

  const onPointerDown = (ev) => {
    const hit = hitCell(ev);
    if (!hit) return;
    if (calib) {
      const key = `${hit.a},${hit.b}`;
      const alreadyFree = covered.has(key) && !paidSet.has(key);
      const alreadyPaid = paidSet.has(key);
      /* A repeat still costs a fact — that IS the waste this challenge exists to
         make visible. Nothing is silently ignored. */
      setPicks((p) => [...p, [hit.a, hit.b]]);
      if (alreadyFree) {
        setWaste(hit);
        setNote('');
      } else if (alreadyPaid) {
        setWaste(hit);
        setNote('');
      } else {
        setWaste(null);
        setNote(
          hit.a === hit.b
            ? `${hit.a} × ${hit.b} = ${rText(cellVal(hit.a, hit.b, 'mul'))} — a crease fact. It is its own mirror, so it buys only itself.`
            : `${hit.a} × ${hit.b} = ${rText(cellVal(hit.a, hit.b, 'mul'))} — and ${hit.b} × ${hit.a} came free with it.`
        );
      }
      return;
    }
    if (step < 1) return; // the dials are still locked; so is the table
    setA(hit.a);
    setB(hit.b);
  };

  const swap = () => {
    const before = `${a} ${O.glyph} ${b} = ${rText(vAB)}`;
    const after = `${b} ${O.glyph} ${a} = ${rText(vBA)}`;
    setA(b);
    setB(a);
    setNote(
      onCrease
        ? `${before} → ${after}. Both dials hold the same number, so nothing moved — this cell is its own mirror.`
        : `${before} → ${after} — ${
            same ? 'the same answer, from a different cell.' : 'a different answer. The order mattered.'
          }`
    );
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

  const newTable = () => {
    setN(pickHuntN(n));
    setPicks([]);
    setWaste(null);
    setNote('');
  };

  /* ---- spoken description for screen readers ----------------------------- */
  const spoken = calib
    ? `Cover the times table. A ${n} by ${n} multiplication table. ${covered.size} of ${cells} cells covered using ${clicks} ${
        clicks === 1 ? 'fact' : 'facts'
      }. The fewest possible is ${need}.${calibrated ? ' Calibrated.' : ''}`
    : `A ${n} by ${n} ${O.name} table. The chosen cell is row ${a}, column ${b}, holding ${a} ${O.name === 'addition' ? 'plus' : O.name === 'multiplication' ? 'times' : O.name === 'subtraction' ? 'minus' : 'divided by'} ${b} = ${rText(vAB)}.${
        showMirrorFact
          ? ` Its mirror is row ${b}, column ${a}, holding ${rText(vBA)} — ${same ? 'the same' : 'a different'} answer.`
          : ''
      }${mirror ? ` The mirror lens is on: ${O.commutes ? 'the two halves of the table match.' : 'the two halves of the table do not match.'}` : ''}`;

  return (
    <div className="cmlab">
      <header className="head">
        <h1>The Commutative Property</h1>
        <p className="lede">
          <em>a + b = b + a</em> looks too obvious to be worth a name — right up until you meet{' '}
          <em>a − b</em>. Lay every answer out in a table and the question turns into a picture:
          swapping the two numbers <em>reflects</em> you across the crease, and the property is simply
          whether the two halves match.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            {calib ? (
              <p className="prod mono">
                <span className="hot">{covered.size}</span>
                <span className="eq"> of {cells} cells covered · </span>
                <span className="hot">{clicks}</span>
                <span className="eq">
                  {' '}
                  {clicks === 1 ? 'fact' : 'facts'} spent · {need} is the fewest that can work
                </span>
              </p>
            ) : step < 1 ? (
              /* No pair has been chosen yet — no ring is drawn, no header is lit,
                 and the facts panel reads "?". The headline must not name one
                 either: step 1 ASKS what row 3, column 5 holds, and printing
                 "3 + 5 = 8" here would answer it before it was asked. */
              <p className="prod mono">
                <span className="eq">the </span>
                <span className="v">{O.glyph}</span>
                <span className="eq">
                  {' '}
                  table · every pair from 1 to {n} · {n * n} answers
                </span>
              </p>
            ) : (
              <>
                <p className="prod mono">
                  <span className="v">{a}</span>
                  <span className="eq"> {O.glyph} </span>
                  <span className="v">{b}</span>
                  <span className="eq"> = </span>
                  <span className={'res' + (showVerdict && same ? ' kept' : '')}>{rText(vAB)}</span>
                </p>
                {/* the second line is the whole comparison — held back until step 3,
                    because on step 2 the student's own Swap is the check */}
                <p className={'prod mono second' + (showMirrorFact ? '' : ' veiled')}>
                  <span className="v">{showMirrorFact ? b : 'b'}</span>
                  <span className="eq"> {O.glyph} </span>
                  <span className="v">{showMirrorFact ? a : 'a'}</span>
                  <span className="eq"> = </span>
                  {showMirrorFact ? (
                    <span className={'res' + (same ? ' kept' : '')}>{rText(vBA)}</span>
                  ) : (
                    <span className="res muted">?</span>
                  )}
                </p>
              </>
            )}
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} onPointerDown={onPointerDown} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <p className={'note mono' + (waste ? ' bad' : '')}>
            {waste
              ? `${waste.a} × ${waste.b}? You had that one already — ${waste.b} × ${waste.a} gave it to you free. It still cost you a fact.`
              : note ||
                (calib
                  ? 'Click any blank cell to learn that fact. Its mirror lights up gold, for free.'
                  : step < 1
                  ? 'The table holds every pair from 1 to 6. The dials unlock next.'
                  : 'Click any cell to choose it, or use the dials.')}
          </p>

          <div className="legend" aria-hidden="true">
            {calib ? (
              <>
                <span className="lg">
                  <span className="sw paid" /> a fact you learned
                </span>
                <span className="lg">
                  <span className="sw free" /> free — its mirror
                </span>
                <span className="lg">
                  <span className="sw blank" /> not covered yet
                </span>
              </>
            ) : (
              <>
                <span className="lg">
                  <span className="sw" style={{ background: CURVE }} /> the mirror: the crease, and the pair it swaps
                </span>
                <span className="lg">
                  <span className="sw" style={{ background: 'rgba(47,111,159,0.55)' }} /> at or above the crease’s value
                </span>
                {!O.commutes && (
                  <span className="lg">
                    <span className="sw" style={{ background: 'rgba(46,139,111,0.55)' }} /> below it
                  </span>
                )}
              </>
            )}
          </div>

          {/* Every row is gated on `step`. A facts panel that is a pure function
              of the dials answers the questions before they are asked. */}
          <div className="facts">
            {calib ? (
              <>
                <div className="fact">
                  <span className="fact-k">Covered</span>
                  <span className="fact-v mono">
                    {covered.size} of {cells} cells
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Facts spent</span>
                  <span className="fact-v mono" style={{ color: clicks > need ? GOLD_DK : INK }}>
                    {clicks} · fewest possible {need}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Free from the mirror</span>
                  <span className="fact-v mono" style={{ color: GOLD_DK, fontWeight: 700 }}>
                    {covered.size - paidSet.size} {covered.size - paidSet.size === 1 ? 'cell' : 'cells'}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">This table costs</span>
                  <span className="fact-v mono">
                    {n} on the crease + {mirrorPairs(n)} pairs = {need}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="fact">
                  <span className="fact-k">Your cell · row a, column b</span>
                  <span className="fact-v mono">
                    {step >= 1 ? (
                      <>
                        {a} {O.glyph} {b} = <strong>{rText(vAB)}</strong>
                      </>
                    ) : (
                      <span className="muted">?</span>
                    )}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Its mirror · row b, column a</span>
                  <span className="fact-v mono">
                    {showMirrorFact ? (
                      <>
                        {b} {O.glyph} {a} = <strong>{rText(vBA)}</strong>
                      </>
                    ) : (
                      <span className="muted">?</span>
                    )}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Did the order matter?</span>
                  <span className="fact-v mono">
                    {showVerdict ? (
                      <span style={{ color: same ? OK : INK, fontWeight: 700 }}>
                        {same
                          ? onCrease
                            ? 'no — but this cell is on the crease'
                            : 'no — same answer'
                          : 'yes — different answers'}
                      </span>
                    ) : (
                      <span className="muted">?</span>
                    )}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">{O.name}</span>
                  <span className="fact-v mono">
                    {showVerdict ? (
                      <span style={{ color: O.commutes ? OK : INK_SOFT, fontWeight: 600 }}>{O.law}</span>
                    ) : (
                      <span className="muted">?</span>
                    )}
                  </span>
                </div>
                {showRelation && (
                  <div className="fact wide">
                    <span className="fact-k">Swap the order and you get</span>
                    <span className="fact-v mono">{O.mirror}</span>
                  </div>
                )}
                {showCount && (
                  <div className="fact wide">
                    <span className="fact-k">Facts in this {n} × {n} table</span>
                    <span className="fact-v mono">
                      {cells} cells = {n} on the crease + {mirrorPairs(n)} mirror pairs ×&nbsp;2 &nbsp;⟹&nbsp;{' '}
                      <strong style={{ color: GOLD_DK }}>
                        {need} facts to learn
                      </strong>
                      {O.commutes ? '' : ' — but only if the operation commutes, and this one does not'}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="toolbar">
            {!calib && (
              <>
                <button type="button" className="btn ghost" onClick={swap} disabled={step < 2}>
                  ⇄ Swap a↔b
                </button>
                {(step >= 3 || mirror) && (
                  <button
                    type="button"
                    className={'lens' + (mirror ? ' on' : '')}
                    onClick={() => setMirror((m) => !m)}
                    aria-pressed={mirror}
                  >
                    mirror
                  </button>
                )}
              </>
            )}
            {calib && (
              <button type="button" className="btn ghost" onClick={() => setPicks([])} disabled={!clicks}>
                Clear the board
              </button>
            )}
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

          {!calib ? (
            <div className="picker">
              {/* The operation switch is a segmented control, not a slider: these
                  are four different operations, not four values of one quantity.
                  It stays INK when active — carmine is the mirror's, and only the
                  mirror's. */}
              <div className="opsw" role="group" aria-label="The operation">
                <span className="dk">⊙</span>
                <div className="segs">
                  {OPS.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      className={'seg mono' + (op === o.key ? ' on' : '')}
                      onClick={() => setOp(o.key)}
                      disabled={step < 4}
                      aria-pressed={op === o.key}
                      aria-label={o.name}
                    >
                      {o.glyph}
                    </button>
                  ))}
                </div>
                <span className="drole full">
                  {step < 4 ? 'the operation — unlocks at step 5' : `the table is now ${O.name}`}
                </span>
              </div>

              <label className="dial">
                <span className="dk">a</span>
                <span className="drole">the row — the number that goes first</span>
                <input
                  type="range"
                  min={1}
                  max={n}
                  step={1}
                  value={a}
                  aria-label="a, the row: the first number"
                  disabled={step < 1}
                  onChange={(e) => setA(parseInt(e.target.value, 10))}
                />
                <output className="dv">{a}</output>
              </label>
              <label className="dial">
                <span className="dk">b</span>
                <span className="drole">the column — the number that goes second</span>
                <input
                  type="range"
                  min={1}
                  max={n}
                  step={1}
                  value={b}
                  aria-label="b, the column: the second number"
                  disabled={step < 1}
                  onChange={(e) => setB(parseInt(e.target.value, 10))}
                />
                <output className="dv">{b}</output>
              </label>
              <label className="dial">
                <span className="dk">n</span>
                <span className="drole">how far the table runs</span>
                <input
                  type="range"
                  min={N_MIN}
                  max={N_MAX}
                  step={1}
                  value={n}
                  aria-label="n, how far the table runs"
                  disabled={step < 7}
                  onChange={(e) => setN(parseInt(e.target.value, 10))}
                />
                <output className="dv">{n}</output>
              </label>
            </div>
          ) : (
            <div className="challenge">
              <div className="chbox">
                <span className="chk mono">Cover the</span>
                <span className="chv mono">
                  {n} × {n}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {covered.size}/{cells} cells · {clicks}/{need} facts
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">{pct}%</span>
                )}
              </div>
              {/* the diagnostic middle state this challenge exists to teach:
                  a covered table is not the same as an efficient one */}
              {full && !calibrated && (
                <p className="diag">
                  Every cell is covered — but it took {clicks} facts on a table that needs {need}.{' '}
                  {clicks - need === 1 ? 'One of them was' : `${clicks - need} of them were`} already yours
                  for free. Clear the board and try again, spending a fact only where the gold has not
                  reached.
                </p>
              )}
              <div className="chbtns">
                <button type="button" className="btn" onClick={newTable}>
                  New table
                </button>
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
                  setOp(START.op);
                  setN(START.n);
                  setA(START.a);
                  setB(START.b);
                  setMirror(false);
                  setPicks([]);
                  setWaste(null);
                  setNote('');
                  seededRef.current = {};
                  prevStepRef.current = 0;
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">an operation commutes when a ⊙ b = b ⊙ a for EVERY pair</span> &nbsp;·&nbsp;
        addition and multiplication do; subtraction and division do not — they agree only when a = b, on
        the crease, where a cell is its own mirror and no operation is able to fail. An n × n table holds
        n² cells but only n(n+1)/2 facts. CCSS&nbsp;3.OA.B.5, 1.OA.B.3; the failures matter again at
        6.EE.A.3 / 7.EE.A.1.
      </footer>

      <style jsx>{`
        .cmlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #2f6f9f;
          --teal: #2e8b6f;
          --gold: #c8891e;
          --gold-dk: #8f6410;
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
          max-width: 74ch;
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
          margin-bottom: 10px;
          min-height: 52px;
        }
        .prod {
          font-variant-numeric: tabular-nums;
          font-size: 19px;
          font-weight: 600;
          margin: 0;
          color: var(--ink);
          line-height: 1.3;
        }
        .prod.second {
          margin-top: 2px;
        }
        .prod.veiled {
          opacity: 0.5;
        }
        .prod .eq {
          color: var(--ink-soft);
          font-weight: 400;
        }
        /* CARMINE = the two numbers whose ORDER is the whole subject. They are
           what the swap moves, and what the crease reflects. */
        .prod .v {
          color: var(--curve);
          font-weight: 700;
        }
        .prod .hot {
          color: var(--curve);
          font-weight: 700;
        }
        .prod .res {
          color: var(--ink);
          font-weight: 700;
        }
        .prod .res.muted {
          color: var(--ink-soft);
          font-weight: 400;
        }
        /* GOLD marks the invariant — an answer the swap could not change. Gold
           fails contrast as text on paper, so it never IS the text: it underlines it. */
        .prod .res.kept {
          box-shadow: inset 0 -6px 0 rgba(200, 137, 30, 0.35);
        }
        .stage {
          position: relative;
          --stage-h: 520px;
          height: var(--stage-h);
          /* the stage takes the SHAPE OF THE TABLE, and an operation table is
             square — headers included, it is (n+1) by (n+1) whatever n is */
          width: min(100%, var(--stage-h));
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
          touch-action: manipulation;
          cursor: pointer;
        }
        .note {
          max-width: 720px;
          margin: 10px auto 0;
          min-height: 30px;
          font-size: 12.5px;
          line-height: 1.35;
          color: var(--ink);
          background: rgba(47, 111, 159, 0.07);
          border-left: 3px solid var(--blue);
          padding: 7px 10px;
          border-radius: 0 6px 6px 0;
          box-sizing: border-box;
        }
        /* a wasted fact reads gold — it is the property talking, not an error.
           Carmine is the mirror's and must never come to mean "wrong". */
        .note.bad {
          background: rgba(200, 137, 30, 0.12);
          border-left-color: var(--gold);
          font-weight: 600;
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          justify-content: center;
          margin: 10px 4px 2px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .lg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sw {
          width: 13px;
          height: 13px;
          border-radius: 3px;
          display: inline-block;
        }
        .sw.paid {
          background: rgba(47, 111, 159, 0.13);
          border: 1px solid rgba(47, 111, 159, 0.5);
        }
        .sw.free {
          background: rgba(200, 137, 30, 0.15);
          border: 1px solid var(--gold);
        }
        .sw.blank {
          background: #fff;
          border: 1px dashed rgba(28, 43, 58, 0.3);
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 12px 4px 4px;
        }
        @media (max-width: 480px) {
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
          min-width: 0;
        }
        .fact.wide {
          grid-column: 1 / -1;
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
          word-break: break-word;
        }
        .fact-v .muted {
          color: var(--ink-soft);
          opacity: 0.7;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
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
        .lens {
          font: 600 12px/1 var(--mono);
          letter-spacing: 0.04em;
          padding: 8px 11px;
          border-radius: 999px;
          cursor: pointer;
          border: 1px dashed rgba(28, 43, 58, 0.35);
          background: transparent;
          color: var(--ink-soft);
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .lens:hover {
          border-color: var(--ink);
          color: var(--ink);
        }
        .lens.on {
          border-style: solid;
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.08);
          color: var(--curve);
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
        .picker {
          display: grid;
          gap: 10px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 46px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
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
        .drole.full {
          grid-column: 2 / 3;
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          cursor: pointer;
          accent-color: var(--curve);
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 14px;
          font-weight: 700;
        }
        .opsw {
          display: grid;
          grid-template-columns: 22px 1fr;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 3px 10px;
        }
        .opsw .dk {
          font-style: normal;
        }
        .segs {
          display: flex;
          gap: 4px;
        }
        .seg {
          flex: 1;
          font-size: 16px;
          font-weight: 700;
          padding: 6px 0;
          border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.14s, background 0.14s, color 0.14s;
        }
        .seg:not(:disabled):hover {
          border-color: var(--ink);
        }
        /* the active operation reads INK, never carmine — it is a mode selector,
           not the mathematical object */
        .seg.on {
          border-color: var(--ink);
          background: var(--ink);
          color: #fff;
        }
        .seg:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .challenge {
          display: grid;
          gap: 10px;
          margin-bottom: 6px;
        }
        .chbox {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(28, 43, 58, 0.15);
          background: linear-gradient(180deg, #fff 0%, #f6f8f9 100%);
        }
        .chk {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .chv {
          font-size: 30px;
          font-weight: 700;
          color: var(--curve);
          font-variant-numeric: tabular-nums;
        }
        .chbtns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
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
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .diag {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ink);
          background: rgba(200, 137, 30, 0.1);
          border-left: 3px solid var(--gold);
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
          background: rgba(200, 137, 30, 0.08);
          border-left: 3px solid var(--gold);
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
        :global(.cmlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (max-width: 520px) {
          .stage {
            --stage-h: 380px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .seg,
          .lens {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
