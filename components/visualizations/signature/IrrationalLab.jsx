'use client';

/* ============================================================================
   IrrationalLab — an interactive "bench" for what an IRRATIONAL number really
   is: a real number that CANNOT be written as a ratio of two integers, whose
   decimal expansion never ends and never repeats.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is the heart of
   CCSS 8.NS.A.1 and 8.NS.A.2:
     • Every number has a decimal expansion.  A RATIONAL number (a ratio p/q of
       integers) always has a decimal that either TERMINATES (1/4 = 0.25) or
       REPEATS (1/3 = 0.3‾, 1/7 = 0.142857‾).
     • A number that is NOT rational is called IRRATIONAL.  Its decimal goes on
       forever with NO repeating block — √2 = 1.41421356…, π = 3.14159265….
     • √n is irrational unless n is a perfect square (√9 = 3 is rational).
     • We LOCATE an irrational on the number line by rational approximation:
       squeeze √2 between 1 and 2, then 1.4 and 1.5, then 1.41 and 1.42, ….

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter.

   THE SIGNATURE CENTERPIECE is the "ENDLESS ZOOM" telescope: a stack of nested
   number lines.  Each line is the ×10 magnification of the shaded slice of the
   line above it, so you literally watch a number get squeezed between ever-
   closer decimals.  The payoff is that the SAME picture reveals the whole
   trichotomy at a glance:
     • a TERMINATING decimal (1/4) → the point eventually LANDS on a tick and
       the squeeze closes to a single spot;
     • a REPEATING decimal (1/3, 1/7) → the point never lands, but sits in the
       SAME relative place at every zoom — self-similar, predictable;
     • an IRRATIONAL (√2, π) → the point never lands and never falls into a
       pattern — the digits march on with no repeat.

   MATH CORRECTNESS: every digit shown is computed EXACTLY, never with floating
   point.  Rational digits come from long division (with exact cycle detection);
   square-root digits come from an integer/BigInt digit-extraction (floor√ of a
   scaled BigInt); π and e are verified constant strings; φ = (1+√5)/2 is derived
   from the exact √5 BigInt.  A companion `audit-irrational.mjs` re-derives all
   of this and checks it against the known values.

   One-accent discipline: the carmine accent is THE NUMBER under study — its
   symbol, its point on every line, and its decimal tape.  The rational /
   irrational VERDICT is the only other colour: green when the decimal closes or
   repeats (rational), a muted indigo when it runs on forever (irrational).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/IrrationalLab.jsx
     2. Import and render it:
          import IrrationalLab from './IrrationalLab';
          export default function Page() { return <IrrationalLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (specimen, zoom, step…).
     MODEL  — the math is exact integer / BigInt arithmetic; it knows no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact decimal machinery.  Nothing here uses floating point
   for the digits it teaches; floats only ever place pixels.
   ------------------------------------------------------------------------- */

const DIGITS_D = 30; // exact fractional digits computed for irrationals
const EXPAND = 40; // fractional digits materialised for repeating rationals
const MAX_ZOOM = 9; // deepest zoom (well within DIGITS_D, so labels stay exact)

/* floor( sqrt(n) ) for a BigInt n ≥ 0  (Newton's method on integers). */
function bigSqrt(n) {
  if (n < 0n) throw new Error('bigSqrt of negative');
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + n / x) >> 1n;
  }
  return x;
}

/* Exact fractional digits of √k (k a positive integer, not a perfect square).
   floor(√k · 10^D) as a BigInt gives the integer part and D fractional digits
   with no rounding error. */
function sqrtParts(k, D) {
  const scale = 10n ** BigInt(D);
  const v = bigSqrt(BigInt(k) * scale * scale); // floor(√k · 10^D)
  const s = v.toString();
  const intLen = s.length - D;
  return { intPart: s.slice(0, intLen), digits: s.slice(intLen) };
}

/* Exact fractional digits of φ = (1 + √5) / 2, derived from the √5 BigInt. */
function phiParts(D) {
  const scale = 10n ** BigInt(D);
  const s5 = bigSqrt(5n * scale * scale); // floor(√5 · 10^D)
  const v = (scale + s5) / 2n; // floor(φ · 10^D); truncation only in the last place
  const s = v.toString();
  const intLen = s.length - D;
  return { intPart: s.slice(0, intLen), digits: s.slice(intLen) };
}

/* Long division of p/q → integer part, fractional digits, and the start of the
   repeating cycle (−1 if it terminates).  Cycle detection is exact: a remainder
   that recurs marks the period. */
function rationalParts(p, q) {
  const intPart = String(Math.floor(p / q));
  let r = p % q;
  const digits = [];
  const seen = new Map();
  let repeatStart = -1;
  while (r !== 0) {
    if (seen.has(r)) {
      repeatStart = seen.get(r);
      break;
    }
    seen.set(r, digits.length);
    r *= 10;
    digits.push(String(Math.floor(r / q)));
    r = r % q;
    if (digits.length > 5000) break; // safety; our q are tiny
  }
  return { intPart, raw: digits.join(''), repeatStart, terminates: r === 0 };
}

/* Verified constant strings (fractional digits).  π and e are standard, widely
   published constants; only ~14 of these are ever shown, and the audit checks
   them against the math library. */
const PI_FRAC = '141592653589793238462643383279502884197169';
const E_FRAC = '718281828459045235360287471352662497757247';

/* ---------------------------------------------------------------------------
   Build a normalised SPECIMEN.  Every number — fraction, root, or constant —
   ends up with the same shape so the telescope and tape can treat them
   uniformly:
     intPart   string integer part
     digits    long fractional digit string (expanded for repeaters)
     kind      'rational' | 'irrational'
     frac      [p, q] when a ratio of integers is known, else null
     decType   'terminating' | 'repeating' | null (irrational)
     repeatStart / period / preperiod   for drawing the vinculum
     value     a float, used ONLY to place pixels / show "≈"
   ------------------------------------------------------------------------- */
function fraction(id, sym, p, q, note) {
  const { intPart, raw, repeatStart, terminates } = rationalParts(p, q);
  let digits = raw;
  let decType = 'terminating';
  let period = 0;
  let preperiod = raw.length;
  if (!terminates && repeatStart >= 0) {
    decType = 'repeating';
    preperiod = repeatStart;
    period = raw.length - repeatStart;
    const pre = raw.slice(0, repeatStart);
    const block = raw.slice(repeatStart);
    let ex = pre;
    while (ex.length < EXPAND) ex += block;
    digits = ex.slice(0, EXPAND);
  }
  return {
    id, sym, group: 'fraction', note,
    kind: 'rational', intPart, digits,
    frac: [p, q], decType, repeatStart: decType === 'repeating' ? repeatStart : -1,
    period, preperiod, perfectSquare: null, rootN: null,
    value: p / q,
  };
}

function root(id, n, note) {
  const s = Math.round(Math.sqrt(n));
  if (s * s === n) {
    // perfect square → a RATIONAL square root (the classic trap)
    return {
      id, sym: `√${n}`, group: 'root', note: note || `${s} × ${s} = ${n}`,
      kind: 'rational', intPart: String(s), digits: '',
      frac: [s, 1], decType: 'terminating', repeatStart: -1,
      period: 0, preperiod: 0, perfectSquare: { n, s }, rootN: n,
      value: s,
    };
  }
  const { intPart, digits } = sqrtParts(n, DIGITS_D);
  return {
    id, sym: `√${n}`, group: 'root', note: note || `not a perfect square`,
    kind: 'irrational', intPart, digits,
    frac: null, decType: null, repeatStart: -1,
    period: 0, preperiod: 0, perfectSquare: null, rootN: n,
    value: Math.sqrt(n),
  };
}

function constant(id, sym, intPart, digits, value, note) {
  return {
    id, sym, group: 'constant', note,
    kind: 'irrational', intPart, digits,
    frac: null, decType: null, repeatStart: -1,
    period: 0, preperiod: 0, perfectSquare: null, rootN: null,
    value,
  };
}

const phi = phiParts(DIGITS_D);

const SPECIMENS = [
  // Fractions — rational, decimal terminates or repeats
  fraction('q14', '1/4', 1, 4, 'one part in four'),
  fraction('q38', '3/8', 3, 8, 'three parts in eight'),
  fraction('q34', '3/4', 3, 4, 'three parts in four'),
  fraction('q13', '1/3', 1, 3, 'one part in three'),
  fraction('q29', '2/9', 2, 9, 'two ninths'),
  fraction('q211', '2/11', 2, 11, 'two elevenths'),
  fraction('q17', '1/7', 1, 7, 'one seventh'),
  fraction('q227', '22/7', 22, 7, 'a famous fraction NEAR π'),
  // Roots — √n is irrational unless n is a perfect square
  root('r2', 2, 'the diagonal of a 1 × 1 square'),
  root('r3', 3, null),
  root('r5', 5, null),
  root('r7', 7, null),
  root('r9', 9, null), // = 3, rational
  root('r16', 16, null), // = 4, rational
  // Famous constants — irrational
  constant('pi', 'π', '3', PI_FRAC, Math.PI, 'circumference ÷ diameter of any circle'),
  constant('phi', 'φ', phi.intPart, phi.digits, (1 + Math.sqrt(5)) / 2, 'the golden ratio, (1 + √5) ⁄ 2'),
  constant('e', 'e', '2', E_FRAC, Math.E, "Euler's number, base of natural growth"),
];
const byId = (id) => SPECIMENS.find((s) => s.id === id) || SPECIMENS[0];

/* Which of the 10 sub-intervals holds x at level L (i.e. the (L+1)-th digit). */
const childDigit = (spec, L) => (L < spec.digits.length ? spec.digits.charCodeAt(L) - 48 : 0);

/* Fractional position of x inside its level-L bracket, in [0, 1). */
const posInLevel = (spec, L) => {
  const s = spec.digits.slice(L, L + 9);
  return s.length ? Number('0.' + s) : 0;
};

/* Exact [lo, hi] of the level-L bracket, as display strings.  hi = lo + 10^-L,
   handled with BigInt so the carry (…1.9 → 2.0) is exact. */
function bracket(spec, L) {
  const frac = spec.digits.slice(0, L).padEnd(L, '0');
  const loStr = L === 0 ? spec.intPart : spec.intPart + '.' + frac;
  const whole = BigInt(spec.intPart + frac) + 1n;
  const w = whole.toString().padStart(L + 1, '0');
  const hiInt = w.slice(0, w.length - L);
  const hiStr = L === 0 ? hiInt : hiInt + '.' + w.slice(w.length - L);
  return { loStr, hiStr };
}

/* A short, honest classification blurb for a specimen. */
function reason(spec) {
  if (spec.perfectSquare) {
    const { n, s } = spec.perfectSquare;
    return `${n} is a perfect square (${s}×${s}=${n}), so √${n} = ${s} = ${s}/1 — rational, and its decimal terminates.`;
  }
  if (spec.rootN && spec.kind === 'irrational') {
    return `${spec.rootN} is not a perfect square, so √${spec.rootN} is irrational — its decimal never ends and never repeats.`;
  }
  if (spec.kind === 'rational') {
    const [p, q] = spec.frac;
    const how = spec.decType === 'terminating'
      ? 'its decimal terminates'
      : `its decimal repeats (period ${spec.period})`;
    return `${spec.sym} = ${p}/${q} is a ratio of integers, so it is rational — ${how}.`;
  }
  const name = spec.sym === 'π' ? 'π' : spec.sym === 'φ' ? 'the golden ratio φ' : spec.sym === 'e' ? "Euler's number e" : spec.sym;
  return `${name} is irrational — its decimal never ends and never falls into a repeating block, so it is not any ratio p/q.`;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION-style capstone (the skill's alternative
   to curve-matching): the "Number Sorter".  A labelled number appears; you
   decide RATIONAL or IRRATIONAL, using the telescope to inspect its decimal.
   A streak meter fills; land TARGET correct in a row for CALIBRATED.  Each
   verdict teaches the actual criterion (a ratio of integers? a perfect
   square?), never "eyeball a few digits".
   ------------------------------------------------------------------------- */
const TARGET_STREAK = 5;
const SORTER_POOL = SPECIMENS.map((s) => s.id);
function pickSorter(prevId) {
  let id = prevId;
  while (id === prevId) id = SORTER_POOL[Math.floor(Math.random() * SORTER_POOL.length)];
  return id;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; a control unlocks with the early steps;
   the reveal lives in `feedback`; distractors are real learner misconceptions
   ("√2 = 1.41 exactly", "1/7 is random", "22/7 IS π", "√2 is rational").  Next
   is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What makes a number rational?',
    body:
      'A RATIONAL number is any RATIO of two integers, p⁄q (q ≠ 0). Whole numbers, fractions, ' +
      'and tidy decimals all qualify: 3 = 3⁄1, ½, 0.25 = 1⁄4. On stage now: 1⁄4 — read its exact ' +
      'decimal above the line.',
    q: 'Which of these is a rational number?',
    choices: ['3⁄4', '√2', 'π'],
    answer: 0,
    feedback:
      '3⁄4 is a ratio of integers, so it is rational (3 ÷ 4 = 0.75). √2 and π are no fraction ' +
      'of integers at all — the irrationals we are about to meet.',
  },
  {
    title: 'Every fraction terminates or repeats',
    body:
      'Divide any fraction into a decimal and exactly one of two things happens: it TERMINATES ' +
      '(1⁄4 = 0.25) or it REPEATS a block forever (1⁄3 = 0.3‾, 1⁄7 = 0.142857‾). Pick different ' +
      'fractions below and watch the tape.',
    q: '1⁄7 = 0.142857142857… — what kind of decimal is this?',
    choices: ['Repeating (a block comes back forever)', 'Terminating (it stops)', 'Random, no pattern'],
    answer: 0,
    feedback:
      'The block 142857 returns forever — repeating, period 6. Terminating decimals are really ' +
      '"repeating 0s". EVERY fraction does one or the other — the rational fingerprint.',
  },
  {
    title: 'Zoom in: trap it between decimals',
    body:
      'Unlock the Zoom dial. Each ×10 zoom blows the shaded slice up to a new line and pins down ' +
      'the next digit — the number is squeezed between ever-closer decimals. Keep 1⁄4 selected ' +
      'and zoom in.',
    q: 'As you zoom into 1⁄4 = 0.25, the point on the line…',
    choices: ['Lands exactly on the 0.25 tick and stays', 'Drifts around with no pattern', 'Keeps moving farther right'],
    answer: 0,
    feedback:
      '1⁄4 terminates: at 0.25 the squeeze CLOSES on a tick — nothing left to pin down. A repeating ' +
      'decimal (try 1⁄3) never lands, but sits in the same spot at every zoom.',
  },
  {
    title: 'A number that is NOT a fraction: √2',
    body:
      'Select √2 — the diagonal of a 1×1 square (Pythagoras: 1²+1² = 2). Its decimal 1.41421356… ' +
      'runs forever with no repeating block. IRRATIONAL: no fraction of integers equals it. Zoom ' +
      'in — the squeeze never closes, never settles.',
    q: 'Is √2 exactly equal to 1.41?',
    choices: ['No — 1.41 is only an approximation', 'Yes, √2 = 1.41', 'Yes, √2 = 1.41421 exactly'],
    answer: 0,
    feedback:
      '1.41² = 1.9881 and 1.42² = 2.0164, so √2 sits between them — no terminating decimal hits ' +
      'it. The Greeks proved √2 is not any ratio p⁄q.',
  },
  {
    title: 'Locating an irrational by approximation',
    body:
      'We can still place √2 as precisely as we like by SQUEEZING: 1 < √2 < 2, then 1.4 < √2 < 1.5, ' +
      'then 1.41 < √2 < 1.42, …. Read the tightening bracket below. Each zoom adds one correct ' +
      'digit — the list never finishes.',
    q: 'Between which two tenths does √2 lie?',
    choices: ['1.4 and 1.5', '1.3 and 1.4', '1.5 and 1.6'],
    answer: 0,
    feedback:
      '1.4² = 1.96 < 2 < 2.25 = 1.5², so 1.4 < √2 < 1.5 — hence √2 ≈ 1.4. Zoom further: 1.41, ' +
      '1.414, 1.4142, … forever.',
  },
  {
    title: 'Which square roots are irrational?',
    body:
      'Square roots are the easiest irrationals to spot: √n is IRRATIONAL for every whole n EXCEPT ' +
      'the perfect squares. √9 = 3 and √16 = 4 land on ticks; √2, √3, √5, √7 do not. Try √9, then ' +
      '√7, and compare.',
    q: 'Which of these is a RATIONAL number?',
    choices: ['√9', '√7', '√2'],
    answer: 0,
    feedback:
      '9 = 3², so √9 = 3 = 3⁄1 — rational, terminating. 7, 2, 3, 5 are not perfect squares, so ' +
      'their roots are irrational. A root is rational only when un-squaring a perfect square.',
  },
  {
    title: 'The line is full of irrationals',
    body:
      'Famous irrationals live between the fractions too: π = 3.14159… (circumference ÷ diameter) ' +
      'and φ = 1.61803… (the golden ratio). Fractions like 22⁄7 only APPROXIMATE π — select 22⁄7 ' +
      'and π and zoom to see them split apart.',
    q: '22⁄7 = 3.142857142857…  Is that exactly π = 3.141592…?',
    choices: ['No — 22⁄7 is a rational number that is only NEAR π', 'Yes, π = 22⁄7 exactly', 'Yes, both are irrational'],
    answer: 0,
    feedback:
      '22⁄7 is rational (repeating, period 6) and merely NEAR π — they disagree at the third ' +
      'decimal (3.142857… vs 3.141592…). π never repeats, so no fraction can equal it.',
  },
  {
    title: 'Calibration — the Number Sorter',
    body:
      'Final challenge. A number appears below. Decide whether it is RATIONAL or IRRATIONAL — zoom the ' +
      'telescope to inspect its decimal if you like — then lock in your verdict. Get ' + TARGET_STREAK +
      ' in a row for CALIBRATED. Press “New number” for another.',
    calib: true,
  },
];

const CALIB_STEP = STEPS.length - 1;

/* ---------------------------------------------------------------------------
   EDIT 5 — Decimal readout + verdict.  The number, big and carmine, with its
   EXACT decimal "tape": revealed digits, a vinculum (overline) over a repeating
   block, and a … for an endless one.  Beside it, the only other colour in the
   lab — the rational (green) / irrational (indigo) verdict.

   Inlined styles (not styled-jsx) because this is a CHILD component; styled-jsx
   only scopes a component's OWN JSX, so inlining keeps the readout identical in
   Next.js and in any plain preview harness.
   ------------------------------------------------------------------------- */
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const CARMINE = '#C81E4F';
const RAT = '#2E8B6F';
const IRR = '#6A5AC9';

function Tape({ spec }) {
  const digitStyle = { fontFamily: MONO, fontSize: '26px', fontWeight: 700, color: CARMINE, letterSpacing: '0.02em' };
  const over = { textDecoration: 'overline', textDecorationThickness: '2px' };
  let body;
  if (spec.digits === '') {
    body = <span>{spec.intPart}</span>; // an integer (e.g. √9 = 3)
  } else if (spec.kind === 'rational' && spec.decType === 'terminating') {
    body = <span>{spec.intPart}.{spec.digits}</span>;
  } else if (spec.kind === 'rational' && spec.decType === 'repeating') {
    const pre = spec.digits.slice(0, spec.preperiod);
    const block = spec.digits.slice(spec.preperiod, spec.preperiod + spec.period);
    const tail = spec.digits.slice(spec.preperiod + spec.period, spec.preperiod + spec.period * 2);
    body = (
      <span>
        {spec.intPart}.{pre}
        <span style={over}>{block}</span>
        {tail}
        <span style={{ color: '#9aa7b3' }}>…</span>
      </span>
    );
  } else {
    // irrational — show a healthy prefix and a … that means "forever, no pattern"
    body = (
      <span>
        {spec.intPart}.{spec.digits.slice(0, 12)}
        <span style={{ color: '#9aa7b3' }}>…</span>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
      <span style={{ ...digitStyle, fontSize: '30px' }}>{spec.sym}</span>
      <span style={{ fontFamily: MONO, fontSize: '18px', color: '#5b6b7b', fontWeight: 600 }}>=</span>
      <span style={digitStyle}>{body}</span>
    </span>
  );
}

const CHIP = {
  fontFamily: MONO, fontSize: '12px', fontWeight: 700, padding: '3px 9px',
  borderRadius: '999px', lineHeight: 1.15, whiteSpace: 'nowrap',
};
function Verdict({ spec }) {
  const irr = spec.kind === 'irrational';
  const color = irr ? IRR : RAT;
  const label = irr ? 'IRRATIONAL' : 'RATIONAL';
  const sub = irr
    ? 'never ends · never repeats'
    : spec.decType === 'terminating'
    ? (spec.frac ? `= ${spec.frac[0]}⁄${spec.frac[1]} · terminates` : 'terminates')
    : `= ${spec.frac[0]}⁄${spec.frac[1]} · repeats, period ${spec.period}`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ ...CHIP, color: '#fff', background: color, letterSpacing: '0.08em', padding: '4px 11px' }}>
        {label}
      </span>
      <span style={{ ...CHIP, color, background: irr ? 'rgba(106,90,201,0.1)' : 'rgba(46,139,111,0.1)' }}>
        {sub}
      </span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function IrrationalLab() {
  const [specimenId, setSpecimenId] = useState('q14');
  const [zoom, setZoom] = useState(0);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [autoZoom, setAutoZoom] = useState(false);

  // calibration (Number Sorter) state
  const [sorterId, setSorterId] = useState(null);
  const [sorterChoice, setSorterChoice] = useState(null); // 'rational' | 'irrational' | null
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const selectorUnlocked = step >= 1;
  const zoomUnlocked = step >= 2 || calib;

  // Derived "active" values — independent of unlock, so stepping back cleanly
  // hides later ideas (the house pattern).
  const spec = calib && sorterId ? byId(sorterId) : selectorUnlocked ? byId(specimenId) : byId('q14');
  const z = zoomUnlocked ? Math.min(zoom, MAX_ZOOM) : 0;

  const br = bracket(spec, z);
  const calibrated = streak >= TARGET_STREAK;

  sceneRef.current = { spec, z };

  /* ---- exact model → screen transform + full redraw from state ----------- */
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

    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const QUAD = '#C7D8E4';
    const CAR = '#C81E4F';

    const S = sceneRef.current;
    const sp = S.spec;
    const zz = S.z;
    const irr = sp.kind === 'irrational';
    const VERDICT = irr ? '#6A5AC9' : '#2E8B6F';

    g.clearRect(0, 0, W, H);

    /* faint quadrille horizontals */
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(199,216,228,0.4)';
    g.beginPath();
    for (let y = 26; y < H; y += 26) {
      g.moveTo(0, Math.round(y) + 0.5);
      g.lineTo(W, Math.round(y) + 0.5);
    }
    g.stroke();

    const marginX = 48;
    const spanW = W - marginX * 2;
    const XT = (t) => marginX + spanW * t; // t in [0,1] across a line

    // the visible telescope window: the deepest three levels ending at zz
    const start = Math.max(0, zz - 2);
    const levels = [];
    for (let L = start; L <= zz; L++) levels.push(L);
    const rows = levels.length;

    const topY = 40;
    const botY = H - 34;
    const yOf = (i) => (rows === 1 ? (topY + botY) / 2 : topY + ((botY - topY) * i) / (rows - 1));

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

    /* ---- draw each nested number line -------------------------------------- */
    for (let i = 0; i < rows; i++) {
      const L = levels[i];
      const y = yOf(i);
      const d = childDigit(sp, L); // which tenth holds x
      const xInLevel = posInLevel(sp, L); // x's position across this line, [0,1)
      const b = bracket(sp, L);
      const isBottom = i === rows - 1;

      // highlighted slice [d/10, (d+1)/10] — becomes the next line's full width
      const sx0 = XT(d / 10);
      const sx1 = XT((d + 1) / 10);

      // funnel from this slice down to the NEXT line's full width
      if (i < rows - 1) {
        const y2 = yOf(i + 1);
        g.beginPath();
        g.moveTo(sx0, y + 6);
        g.lineTo(marginX, y2 - 12);
        g.lineTo(W - marginX, y2 - 12);
        g.lineTo(sx1, y + 6);
        g.closePath();
        g.fillStyle = 'rgba(200,30,79,0.05)';
        g.fill();
        g.strokeStyle = 'rgba(200,30,79,0.22)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(sx0, y + 6);
        g.lineTo(marginX, y2 - 12);
        g.moveTo(sx1, y + 6);
        g.lineTo(W - marginX, y2 - 12);
        g.stroke();
      }

      // slice highlight on this line
      g.fillStyle = 'rgba(200,30,79,0.1)';
      g.fillRect(sx0, y - 12, sx1 - sx0, 24);

      // baseline
      g.strokeStyle = 'rgba(28,43,58,0.8)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(marginX, y + 0.5);
      g.lineTo(W - marginX, y + 0.5);
      g.stroke();

      // 11 ticks (tenths of this bracket)
      for (let j = 0; j <= 10; j++) {
        const x = XT(j / 10);
        const major = j === 0 || j === 10;
        const onSlice = j === d || j === d + 1;
        g.strokeStyle = onSlice ? 'rgba(200,30,79,0.7)' : 'rgba(28,43,58,0.5)';
        g.lineWidth = onSlice ? 1.8 : major ? 1.6 : 1;
        g.beginPath();
        g.moveTo(x + 0.5, y - (major ? 8 : onSlice ? 7 : 5));
        g.lineTo(x + 0.5, y + (major ? 8 : onSlice ? 7 : 5));
        g.stroke();
      }

      // endpoint labels (exact)
      g.font = '600 11px ' + MONO;
      g.fillStyle = INK;
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillText(b.loStr, marginX - 2, y + 11);
      g.textAlign = 'right';
      g.fillText(b.hiStr, W - marginX + 2, y + 11);

      // slice-boundary labels (only on the bottom line, to avoid clutter) — the
      // "between" bracket the child is being squeezed into
      if (isBottom) {
        const nb = bracket(sp, L + 1);
        g.fillStyle = CAR;
        g.font = '700 10.5px ' + MONO;
        g.textAlign = 'center';
        g.textBaseline = 'bottom';
        if (sx0 > marginX + 14) g.fillText(nb.loStr, sx0, y - 13);
        if (sx1 < W - marginX - 14) g.fillText(nb.hiStr, sx1, y - 13);
      }

      // the number's point on this line
      const px = XT(xInLevel);
      g.beginPath();
      g.arc(px, y, isBottom ? 6 : 4.5, 0, Math.PI * 2);
      g.fillStyle = CAR;
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = 1.6;
      g.stroke();

      // does it sit exactly on a tick? (terminating decimals do, eventually)
      const onTick = Math.abs(xInLevel * 10 - Math.round(xInLevel * 10)) < 1e-9;
      if (isBottom && onTick && sp.decType === 'terminating' && L >= sp.preperiod) {
        g.save();
        g.fillStyle = VERDICT;
        g.font = '700 10.5px ' + MONO;
        g.textAlign = 'center';
        g.textBaseline = 'top';
        g.fillText('lands exactly ✓', px, y + 24);
        g.restore();
      }
    }

    /* ---- level counter, top-left ------------------------------------------- */
    g.font = '600 11px ' + MONO;
    g.fillStyle = INK_SOFT;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText(zz === 0 ? 'whole-number view' : `zoom ×10  (${zz} decimal${zz === 1 ? '' : 's'})`, marginX, 12);

    /* ---- the tightening bracket caption, bottom-centre --------------------- */
    {
      const capB = bracket(sp, zz);
      const cap = `${capB.loStr} < ${sp.sym} < ${capB.hiStr}`;
      g.font = '700 12.5px ' + MONO;
      const tw = g.measureText(cap).width;
      const bx = Math.max(8, (W - tw) / 2 - 9);
      g.fillStyle = 'rgba(251,251,248,0.92)';
      rr(bx, H - 26, Math.min(W - 16, tw + 18), 22, 6);
      g.fill();
      g.strokeStyle = 'rgba(200,30,79,0.35)';
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = CAR;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(cap, bx + 9, H - 15);
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [specimenId, zoom, step, sorterId, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* seed a sorter number the first time we reach the calibration step */
  useEffect(() => {
    if (calib && sorterId == null) {
      setSorterId(pickSorter(null));
      setSorterChoice(null);
      setZoom(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* Auto-zoom — step outward one decimal place at a time, opt-in and time-based,
     respecting reduced motion.  This is the signature "watch it squeeze". */
  useEffect(() => {
    if (!autoZoom) return;
    if (!zoomUnlocked) {
      setAutoZoom(false);
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setZoom(MAX_ZOOM);
      setAutoZoom(false);
      return;
    }
    if (zoom >= MAX_ZOOM) {
      setAutoZoom(false);
      return;
    }
    const t = setTimeout(() => setZoom((v) => Math.min(MAX_ZOOM, v + 1)), 750);
    return () => clearTimeout(t);
  }, [autoZoom, zoom, zoomUnlocked]);

  /* ---- interaction: click the stage to zoom in one level ----------------- */
  const onStageClick = () => {
    if (!zoomUnlocked) return;
    setAutoZoom(false);
    setZoom((v) => Math.min(MAX_ZOOM, v + 1));
  };

  /* ---- handlers ---------------------------------------------------------- */
  const chooseSpecimen = (id) => {
    setAutoZoom(false);
    setZoom(0);
    setSpecimenId(id);
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const sortAnswer = (kind) => {
    if (sorterChoice != null) return;
    setSorterChoice(kind);
    const correct = kind === spec.kind;
    if (correct) {
      setStreak((s) => {
        const ns = s + 1;
        setBest((b) => Math.max(b, ns));
        return ns;
      });
    } else {
      setStreak(0);
    }
  };
  const nextSorter = () => {
    setSorterId((prev) => pickSorter(prev));
    setSorterChoice(null);
    setAutoZoom(false);
    setZoom(0);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const sorterCorrect = sorterChoice != null && sorterChoice === spec.kind;
  const meterPct = Math.min(100, Math.round((streak / TARGET_STREAK) * 100));

  /* spoken description (accessibility) */
  const spoken = (() => {
    const parts = [`The number ${spec.sym} is ${spec.kind}.`];
    if (spec.kind === 'rational') {
      parts.push(
        spec.decType === 'terminating'
          ? `Its decimal is ${spec.intPart}.${spec.digits} and it terminates.`
          : `Its decimal repeats with period ${spec.period}.`
      );
    } else {
      parts.push('Its decimal never ends and never repeats.');
    }
    parts.push(`At this zoom, ${br.loStr} is less than ${spec.sym} which is less than ${br.hiStr}.`);
    return parts.join(' ');
  })();

  return (
    <div className="qlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Irrational Numbers: The Endless Decimal</h1>
        <p className="lede">
          Some numbers are a tidy <em>ratio</em> of integers — their decimals <em>terminate</em> or{' '}
          <em>repeat</em>. Others, the <em>irrationals</em>, run on forever with no pattern and match no
          fraction at all. Pick a number, then <em>zoom the telescope</em> to watch it get squeezed
          between ever-closer decimals — and see whether the squeeze ever closes.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <Tape spec={spec} />
            </p>
            <p className="verdict-line">
              <Verdict spec={spec} />
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onClick={onStageClick}
            role="img"
            aria-label={spoken}
            title={zoomUnlocked ? 'click to zoom in ×10' : undefined}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {zoomUnlocked ? 'click the stage to zoom in ×10' : 'unlock Zoom to squeeze the number →'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — you sorted enough numbers in a row.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Type</span>
              <span className="fact-v" style={{ color: spec.kind === 'irrational' ? IRR : RAT, fontWeight: 700 }}>
                {spec.kind === 'irrational' ? 'Irrational' : 'Rational'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">As a fraction</span>
              <span className="fact-v mono">{spec.frac ? `${spec.frac[0]}⁄${spec.frac[1]}` : 'none exists'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Decimal</span>
              <span className="fact-v mono">
                {spec.kind === 'irrational'
                  ? 'never ends, never repeats'
                  : spec.decType === 'terminating'
                  ? 'terminates'
                  : `repeats · period ${spec.period}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Squeezed between</span>
              <span className="fact-v mono">
                {br.loStr} … {br.hiStr}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <div className="zoom-controls" role="group" aria-label="Zoom">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setAutoZoom(false);
                  setZoom((v) => Math.max(0, v - 1));
                }}
                disabled={!zoomUnlocked || z === 0}
                aria-label="Zoom out"
              >
                − Out
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setAutoZoom(false);
                  setZoom((v) => Math.min(MAX_ZOOM, v + 1));
                }}
                disabled={!zoomUnlocked || z >= MAX_ZOOM}
                aria-label="Zoom in ten times"
              >
                Zoom ×10 +
              </button>
              <button
                type="button"
                className={'btn ghost' + (autoZoom ? ' on' : '')}
                onClick={() => setAutoZoom((a) => !a)}
                disabled={!zoomUnlocked || z >= MAX_ZOOM}
                title="Step the zoom outward automatically"
              >
                {autoZoom ? 'Zooming…' : 'Auto-zoom ▶'}
              </button>
            </div>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setAutoZoom(false);
                setZoom(0);
              }}
              disabled={!zoomUnlocked || z === 0}
            >
              Reset zoom
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

          {/* Specimen selector — the first "dial", a gallery of numbers to study */}
          {!calib && (
            <div className={'gallery' + (selectorUnlocked ? '' : ' locked')}>
              <span className="gallery-k">
                {selectorUnlocked ? 'Pick a number' : 'unlocks at step 2'}
              </span>
              {['fraction', 'root', 'constant'].map((grp) => (
                <div className="gal-row" key={grp}>
                  <span className="gal-tag">
                    {grp === 'fraction' ? 'Fractions' : grp === 'root' ? 'Roots' : 'Constants'}
                  </span>
                  <div className="gal-chips">
                    {SPECIMENS.filter((s) => s.group === grp).map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        className={
                          'numchip' +
                          (specimenId === s.id && selectorUnlocked ? ' on' : '') +
                          (s.kind === 'irrational' ? ' irr' : ' rat')
                        }
                        aria-pressed={specimenId === s.id}
                        disabled={!selectorUnlocked}
                        onClick={() => chooseSpecimen(s.id)}
                        title={s.note}
                      >
                        {s.sym}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Zoom dial — the second control, unlocks a step later */}
          {!calib && (
            <div className={'dial' + (zoomUnlocked ? '' : ' locked')}>
              <span className="dk">🔎</span>
              <span className="drole">{zoomUnlocked ? 'zoom depth (decimal places)' : 'unlocks at step 3'}</span>
              <input
                type="range"
                min={0}
                max={MAX_ZOOM}
                step={1}
                value={z}
                disabled={!zoomUnlocked}
                aria-label="Zoom depth"
                onChange={(e) => {
                  setAutoZoom(false);
                  setZoom(parseInt(e.target.value, 10));
                }}
              />
              <output className="dv">{zoomUnlocked ? z : '🔒'}</output>
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

          {/* Calibration — the Number Sorter */}
          {calib && sorterId != null && (
            <div className="calib">
              <div className="sorter-card">
                <span className="sorter-k">Rational or irrational?</span>
                <span className="sorter-sym">{spec.sym}</span>
                <span className="sorter-note">{spec.note}</span>
              </div>

              <div className="sort-buttons">
                <button
                  type="button"
                  className={
                    'sortbtn rat' +
                    (sorterChoice != null && spec.kind === 'rational' ? ' reveal' : '') +
                    (sorterChoice === 'rational' && spec.kind !== 'rational' ? ' miss' : '')
                  }
                  disabled={sorterChoice != null}
                  onClick={() => sortAnswer('rational')}
                >
                  Rational
                </button>
                <button
                  type="button"
                  className={
                    'sortbtn irr' +
                    (sorterChoice != null && spec.kind === 'irrational' ? ' reveal' : '') +
                    (sorterChoice === 'irrational' && spec.kind !== 'irrational' ? ' miss' : '')
                  }
                  disabled={sorterChoice != null}
                  onClick={() => sortAnswer('irrational')}
                >
                  Irrational
                </button>
              </div>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: meterPct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  streak&nbsp;{streak}/{TARGET_STREAK}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono dir-hint">best&nbsp;{best}</span>
                )}
              </div>

              {sorterChoice != null && (
                <p className={'feedback' + (sorterCorrect ? ' good' : ' bad')}>
                  {sorterCorrect ? '✓ ' : '✕ '}
                  {reason(spec)}
                </p>
              )}

              <button type="button" className="btn ghost" onClick={nextSorter}>
                New number →
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
                  setSpecimenId('q14');
                  setZoom(0);
                  setAutoZoom(false);
                  setSorterId(null);
                  setSorterChoice(null);
                  setStreak(0);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">p⁄q terminates or repeats · irrationals never do</span> &nbsp;·&nbsp; rational
        vs. irrational numbers, located by approximation on the number line (CCSS 8.NS.A.1, 8.NS.A.2).
      </footer>

      <style jsx>{`
        .qlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --rat: #2e8b6f;
          --irr: #6a5ac9;
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
          grid-template-columns: minmax(0, 1fr) 360px;
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
          gap: 12px 16px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .equation,
        .verdict-line {
          margin: 0;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 7 / 6;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          cursor: zoom-in;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          position: absolute;
          right: 10px;
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
            aspect-ratio: 5 / 6;
          }
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
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
        }
        .zoom-controls {
          display: inline-flex;
          gap: 7px;
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
        .gallery {
          display: grid;
          gap: 8px;
          margin-bottom: 14px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.12);
          border-radius: 10px;
          background: var(--paper);
        }
        .gallery.locked {
          opacity: 0.5;
        }
        .gallery-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .gal-row {
          display: grid;
          grid-template-columns: 70px 1fr;
          align-items: center;
          gap: 8px;
        }
        .gal-tag {
          font-size: 11px;
          color: var(--ink-soft);
          font-weight: 600;
        }
        .gal-chips {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }
        .numchip {
          font: 700 13px/1 var(--mono);
          min-width: 34px;
          padding: 7px 9px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: #fff;
          color: var(--ink);
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .numchip:not(:disabled):hover {
          border-color: var(--ink);
        }
        .numchip.on {
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.06);
          box-shadow: 0 0 0 2px rgba(200, 30, 79, 0.18);
        }
        .numchip:disabled {
          cursor: not-allowed;
        }
        .dial {
          display: grid;
          grid-template-columns: 30px 1fr 42px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
          margin-bottom: 8px;
        }
        .dial.locked {
          opacity: 0.5;
        }
        .dk {
          grid-row: 1 / 3;
          font-size: 18px;
          text-align: center;
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          cursor: pointer;
          accent-color: #c81e4f;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 17px;
          font-weight: 700;
          color: var(--curve);
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
        .feedback.good {
          background: rgba(46, 139, 111, 0.08);
          border-left-color: var(--rat);
        }
        .feedback.bad {
          background: rgba(106, 90, 201, 0.08);
          border-left-color: var(--irr);
        }
        .calib {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
          display: grid;
          gap: 10px;
        }
        .sorter-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 14px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 10px;
          background: linear-gradient(180deg, #fff 0%, #f6f8f9 100%);
        }
        .sorter-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .sorter-sym {
          font-family: var(--mono);
          font-size: 40px;
          font-weight: 700;
          color: var(--curve);
          line-height: 1.05;
        }
        .sorter-note {
          font-size: 12px;
          color: var(--ink-soft);
          text-align: center;
        }
        .sort-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .sortbtn {
          font: 700 14px/1 system-ui, sans-serif;
          padding: 12px 10px;
          border-radius: 9px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.22);
          background: #fff;
          color: var(--ink);
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .sortbtn.rat:not(:disabled):hover {
          border-color: var(--rat);
          color: var(--rat);
        }
        .sortbtn.irr:not(:disabled):hover {
          border-color: var(--irr);
          color: var(--irr);
        }
        .sortbtn.reveal.rat {
          background: var(--rat);
          border-color: var(--rat);
          color: #fff;
        }
        .sortbtn.reveal.irr {
          background: var(--irr);
          border-color: var(--irr);
          color: #fff;
        }
        .sortbtn.miss {
          opacity: 0.5;
          text-decoration: line-through;
        }
        .sortbtn:disabled {
          cursor: default;
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
          transition: width 0.2s ease-out;
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
        :global(.qlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .numchip,
          .sortbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
