'use client';

/* ============================================================================
   RoundingLab — an interactive "bench" for ROUNDING to the nearest tenth,
   one, ten, hundred, or thousand — whole numbers AND decimals.  Rounding replaces a number with the
   NEAREST multiple of a chosen place value:

        round(n, place) = the multiple of `place` closest to n
                          (ties — the exact halfway point — round UP).

   Built for MAIS (math AI system, www.mais.ac), K-12.  Rounding is a Grade
   3–5 arc, and this one lab now carries the whole arc:
     • CCSS 3.NBT.A.1  round to the nearest 10 or 100
     • CCSS 4.NBT.A.3  round multi-digit whole numbers to any place
     • CCSS 5.NBT.A.4  use place-value understanding to round DECIMALS to any
                       place  ← added 2026-07-17 as an EXTENSION, not a sibling
                       lab: see the note above DIGIT_MULT for why rounding a
                       decimal does not deserve a second picture.
   (originally: 3.NBT.A.1 round to the nearest 10 or 100; 4.NBT.A.3
   round multi-digit whole numbers to any place), and it is the first place a
   child meets the idea of a "good-enough" number — so getting the picture and
   the rule EXACTLY right matters.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials/controls that unlock one idea per lesson step, predict-then-check
   questions (Next gated on ANSWERED, not correct), and a calibration challenge
   with a live match meter.

   The signature CENTERPIECE (the rounding analogue of NumberLab's place-value
   chart or LineLab's slope triangle) is the ZOOMED NUMBER LINE: the number n
   is shown sitting between its two neighbouring multiples, with the MIDPOINT
   drawn as a dashed "tipping point."  The two distances (n → lower, n → upper)
   are bracketed; the shorter one glows carmine — that neighbour WINS, and n
   rounds to it.  Directly below, the DECIDER-DIGIT strip shows the classroom
   shortcut (look at the single digit just right of the rounding place: 5+ up,
   4− down) and proves it gives the very same answer as the midpoint test.

   One-accent discipline, adapted for rounding: CARMINE marks the rounding
   itself — n's marker, the WINNING (nearer) distance, the rounded result, and
   the decider digit.  A restrained steel-blue is used only for structure (the
   number line, the two multiples, the place-being-rounded box); gold marks the
   calibration target zone.  So carmine always means "this is where the number
   goes."

   All arithmetic is EXACT INTEGER math (floor / multiply / compare) — a child
   never sees a floating-point artefact — which also makes the carry cases
   (97 → 100, 950 → 1,000) come out exactly right.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/RoundingLab.jsx
     2. Import and render it:
          import RoundingLab from './RoundingLab';
          export default function Page() { return <RoundingLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (four digits, place,
              step, calibration target).
     MODEL  — the math is pure integer rounding; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */
/* audit-rounding.mjs SLICES THE BLOCK BETWEEN THESE SENTINELS out of this file
   and evaluates it, so the audit tests the code that actually ships. It used to
   keep a hand-written MIRROR of these constants instead — which meant the audit
   could pass while the lab was wrong, because the two copies had no way to stay
   in step. Anything the audit checks must live in here and stay React-free.
   NOTE: the START sentinel must be a ONE-LINE comment — the slicing regex takes
   everything after its first newline as the body. */

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  SIX DIGITS (hundredths … thousands) build the number
   n, plus a rounding PLACE.  The ones/tens dials are live from the start
   (nearest-ten lessons use 2-digit numbers); the hundreds/thousands dials and
   the place selector unlock together at PLACE_STEP; the two DECIMAL dials
   unlock at DECIMAL_STEP, when the lab crosses the point.
   ---------------------------------------------------------------------------
   THE DECIMAL EXTENSION (2026-07-17) — CCSS 5.NBT.A.4, "use place value
   understanding to round decimals to any place", added to this lab's existing
   3.NBT.A.1 / 4.NBT.A.3 whole-number anchors.

   It is an EXTENSION and not a sibling lab, deliberately.  Rounding a decimal
   is not a new idea and does not deserve a new picture: it is this lab's
   zoomed number line, this lab's midpoint tipping point, and this lab's
   decider digit, with the places continued to the right of the point.  A
   separate lab would have had to redraw all three, which is duplication, not
   coverage.

   HOW IT KEEPS THE EXACT-INTEGER PROMISE.  The naive move is to let `place` be
   0.1 — and it is wrong: Math.floor(2.47 / 0.1) * 0.1 is 2.4000000000000004, a
   float artefact in the one lab that promises a child never meets one.  So the
   value is instead held as an INTEGER COUNT OF HUNDREDTHS, and every place is
   an integer number of hundredths:

        tenths = 10   ones = 100   tens = 1,000   hundreds = 10,000  …

   roundInfo() is then UNCHANGED — rounding to the nearest tenth is literally
   the same integer code as rounding to the nearest ten, one scale down, which
   is the mathematical content of 5.NBT.A.4 and the reason this belongs here.
   Only the DISPLAY divides by 100 (see `fmt`).

   Note which places are roundable: hundredths is the smallest DIGIT, so it is
   not offered as a rounding place — rounding to the nearest hundredth would be
   a no-op, and its midpoint (lower + 0.5 hundredths) is the one midpoint that
   is not an integer.  Every place the lab offers has an exact integer midpoint.
   ------------------------------------------------------------------------- */
const SCALE = 100; // n is an integer count of HUNDREDTHS
// [hundredths, tenths, ones, tens, hundreds, thousands]
const DIGIT_MULT = [1, 10, 100, 1000, 10000, 100000];
const DIGIT_NAME = ['hundredths', 'tenths', 'ones', 'tens', 'hundreds', 'thousands'];
const START = [0, 0, 7, 4, 0, 0]; // n = 47 → a clean "rounds up to 50" opener

// The rounding places the lab teaches, indexed by their power of ten (in
// hundredths). roundIndex indexes DIGIT_MULT; the decider is always the digit
// one place to its right, which is why deciderIndex = roundIndex − 1 still holds.
const PLACES = [
  { mult: 10, label: 'tenth', labelCap: 'Tenth', deciderName: 'hundredths', roundIndex: 1 },
  { mult: 100, label: 'one', labelCap: 'One', deciderName: 'tenths', roundIndex: 2 },
  { mult: 1000, label: 'ten', labelCap: 'Ten', deciderName: 'ones', roundIndex: 3 },
  { mult: 10000, label: 'hundred', labelCap: 'Hundred', deciderName: 'tens', roundIndex: 4 },
  { mult: 100000, label: 'thousand', labelCap: 'Thousand', deciderName: 'hundreds', roundIndex: 5 },
];
const placeOf = (mult) => PLACES.find((p) => p.mult === mult);

/* The place the lab OPENS on. This lives in the model, not in useState, because
   it is a claim the lesson makes out loud ("rounding 47 to the nearest TEN") and
   claims belong where the audit can reach them. It was briefly wrong during the
   decimal extension: `useState(10)` used to mean "nearest ten" and, once the
   scale moved to hundredths, silently came to mean "nearest TENTH" — so step 1
   taught tenths while its text said tens. The picture contradicted the words,
   the audit could not see it, and only opening the page did. */
const DEFAULT_PLACE = 1000; // 1000 hundredths = the nearest TEN

const PLACE_STEP = 4;   // hundreds/thousands digits + the place selector unlock here
const DECIMAL_STEP = 6; // the two decimal digits unlock here — the lab crosses the point
const CALIB_STEP = 7;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Rounding is EXACT integer arithmetic, round-half-up (the
   universal US-school convention).  Everything the lab shows — the two
   neighbouring multiples, the midpoint, the distances, the decider digit, and
   the result — is derived here, so the picture and the readouts can never
   disagree.
   ------------------------------------------------------------------------- */
const valueOf = (digits) =>
  digits.reduce((sum, d, i) => sum + d * DIGIT_MULT[i], 0);

const digitAt = (n, i) => Math.floor(n / DIGIT_MULT[i]) % 10;

function roundInfo(n, place) {
  const lower = Math.floor(n / place) * place; // the multiple at or below n
  const upper = lower + place; // the next multiple up
  const mid = lower + place / 2; // the halfway "tipping point" (integer: place is even)
  const up = n >= mid; // round half UP: on/after the midpoint → up
  const rounded = up ? upper : lower;
  const p = placeOf(place);
  const deciderIndex = p.roundIndex - 1; // the single digit just right of the place
  const decider = digitAt(n, deciderIndex); // 5+ → up, 4− → down (equivalent to n≥mid)
  return {
    lower,
    upper,
    mid,
    up,
    rounded,
    roundIndex: p.roundIndex,
    deciderIndex,
    decider,
    distLower: n - lower,
    distUpper: upper - n,
  };
}

/* Format an internal value (a whole number of HUNDREDTHS) the way a child
   writes it: 4700 → "47", 4750 → "47.5", 247 → "2.47". Grouping commas above a
   thousand, and NO trailing zeros — 47.50 and 47.5 are the same number, and
   this lab is not the one that teaches otherwise (DecimalLab owns equivalent
   decimals). Built from integer division and remainder, never from n/100
   printed as a float, so no artefact can leak into a readout.

   `commas` is kept as the name used throughout the render so the extension did
   not have to touch ~20 call sites — it now means "format a value", and for
   every whole-number value it prints exactly what it always printed. */
function commas(n) {
  const neg = n < 0;
  const v = Math.abs(n);
  const whole = Math.floor(v / SCALE);
  const frac = v % SCALE;               // 0…99 hundredths — an integer, always
  let s = whole.toLocaleString('en-US');
  if (frac !== 0) s += frac % 10 === 0 ? `.${frac / 10}` : `.${String(frac).padStart(2, '0')}`;
  return (neg ? '−' : '') + s;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION GOAL (the skill's sanctioned
   alternative to curve-matching, as in NumberLab/DecimalLab): read a target
   ROUNDED value and a place, then BUILD a number n that rounds to it.  Because
   MANY numbers round to the same value, this quietly teaches the rounding
   RANGE — every number from `goal − place/2` up to `goal + place/2 − 1` rounds
   to `goal` — the true inverse-rounding skill (the direct analogue of
   MultiplicationLab's "many rectangles, one area").  CALIBRATED only when the
   built number actually rounds to the goal; a live directional hint says which
   way to nudge.
   ------------------------------------------------------------------------- */
// inclusive integer range of numbers that round (half-up) to `goal` at `place`
const roundRange = (goal, place) => [goal - place / 2, goal + place / 2 - 1];

function makeTarget(prev) {
  /* Goals are INTERNAL values (hundredths), so 5000 reads to the child as "50"
     and 25 reads as "0.25". Every goal is a multiple of its own place, and the
     decimal banks are what carries 5.NBT.A.4 into the challenge — inverse
     rounding across the point ("build a number that rounds to 2.5"). */
  const options = [
    { place: 1000, goals: [2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000] },      // nearest ten
    { place: 10000, goals: [20000, 30000, 40000, 50000, 60000, 70000, 80000] },    // nearest hundred
    { place: 100, goals: [200, 300, 400, 500, 600, 700, 800, 900] },               // nearest one
    { place: 10, goals: [20, 30, 40, 50, 60, 70, 80, 90, 110, 120, 250, 340] },    // nearest tenth
  ];
  let t;
  do {
    const bank = options[Math.floor(Math.random() * options.length)];
    const goal = bank.goals[Math.floor(Math.random() * bank.goals.length)];
    t = { place: bank.place, goal };
  } while (prev && t.place === prev.place && t.goal === prev.goal);
  return t;
}

const calibMatchPercent = (n, target) => {
  // meter is based on where n ROUNDS (so calibrated ⟺ exactly 100%), softened
  // by two intervals of runway on either side
  const pr = roundInfo(n, target.place).rounded;
  const off = Math.abs(pr - target.goal) / (2 * target.place);
  return Math.max(0, 100 * (1 - off));
};
const isCalibrated = (n, target) =>
  roundInfo(n, target.place).rounded === target.goal;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in `feedback`;
   distractors are real learner misconceptions (rounding "keeps the tens
   digit," "always rounds up," "round twice," "the ones digit always decides").
   Next is gated on ANSWERED, never on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What is rounding?',
    body:
      'Rounding swaps a number for a nearby, tidier one that is easier to picture and ' +
      'use — the nearest ten, hundred, thousand, or (once you cross the point) tenth. “47 people” ' +
      'becomes “about 50.” ' +
      'On the number line, 47 sits between 40 and 50; rounding simply slides it to whichever ' +
      'neighbour is nearer.',
    q: 'Rounding 47 to the nearest ten means finding…',
    choices: [
      'the nearest multiple of ten — 40 or 50',
      'the biggest ten, which is always 50',
      'the tens digit, 4',
    ],
    answer: 0,
    feedback:
      'Rounding to the nearest ten means choosing the CLOSER multiple of ten. 47 is between ' +
      '40 and 50, and it is nearer to 50 — so 47 rounds to 50. Rounding never just “keeps the ' +
      'tens digit”; it moves the number to the closest round number.',
  },
  {
    title: 'Between two tens',
    body:
      'Every whole number lands between two neighbouring tens — a lower ten and an upper ten. ' +
      '47 sits between 40 and 50. The distance to each neighbour is what settles the winner: ' +
      '47 is 7 away from 40 but only 3 away from 50. Change the dials and watch the two ' +
      'distances trade places.',
    q: '63 is between which two tens — and which is nearer?',
    choices: [
      '60 and 70 — nearer to 60',
      '60 and 70 — nearer to 70',
      '63 and 64',
    ],
    answer: 0,
    feedback:
      '63 sits between 60 and 70. It is 3 past 60 but 7 short of 70, so it is nearer to 60 → ' +
      '63 rounds to 60. The neighbour you are closer to always wins.',
  },
  {
    title: 'The halfway mark decides',
    body:
      'Halfway between the two tens is the tipping point — for 40 and 50 that is 45. Below 45 ' +
      'you are nearer the lower ten; above 45 you are nearer the upper ten. And exactly ON 45? ' +
      'The rule everyone shares is “round half UP,” so 45 rounds to 50.',
    q: 'Where does 45 round to (nearest ten)?',
    choices: [
      '50 — a halfway number rounds up',
      '40 — it has not passed 45',
      'either one is fine',
    ],
    answer: 0,
    feedback:
      '45 is the same distance from 40 and 50 — a genuine tie. To keep everyone consistent, the ' +
      'standard rule is “round half up,” so 45 → 50. This single rule removes all the guesswork ' +
      'right at the midpoint.',
  },
  {
    title: 'The decider digit',
    body:
      'You do not have to measure distances every time. Look at just ONE digit — the digit ' +
      'immediately to the right of the place you are rounding to. Rounding to tens? Look at the ' +
      'ONES digit: 5 or more rounds up, 4 or less rounds down. It gives the exact same answer as ' +
      'the midpoint, every single time.',
    q: 'Round 82 to the nearest ten using the decider digit.',
    choices: [
      '80 — the ones digit 2 is 4-or-less, round down',
      '90 — you always round up',
      '82 — leave it as it is',
    ],
    answer: 0,
    feedback:
      'The ones digit is 2, which is 4-or-less, so round down: 82 → 80. Check it on the line — ' +
      '82 is only 2 past 80 but 8 short of 90, so it is nearer 80. The digit shortcut and the ' +
      'number line always agree.',
  },
  {
    title: 'Round to any place',
    body:
      'The same rule scales up. Pick the place with the selector — the decider is always the ' +
      'single digit just to its right. Watch 3,247: to the nearest ten it is 3,250 (ones 7 → up), ' +
      'to the nearest hundred 3,200 (tens 4 → down), to the nearest thousand 3,000 (hundreds 2 → ' +
      'down). One number, three different round answers.',
    q: 'Round 3,247 to the nearest hundred. Which digit decides?',
    choices: [
      'the tens digit, 4 → round down to 3,200',
      'the ones digit, 7 → round up to 3,300',
      'the hundreds digit, 2',
    ],
    answer: 0,
    feedback:
      'Rounding to hundreds, the decider is the digit just right of the hundreds place — the ' +
      'TENS digit, 4. That is 4-or-less, so round down: 3,247 → 3,200. The ones digit (7) does ' +
      'not get a vote when you are rounding to hundreds.',
  },
  {
    title: 'Two traps to dodge',
    body:
      'Trap 1 — use ONLY that one decider digit; never round twice. 449 to the nearest hundred: ' +
      'the tens digit is 4 → round DOWN to 400. (Going 449 → 450 → 500 is the classic mistake.) ' +
      'Trap 2 — rounding up can roll over: 97 to the nearest ten is 100, and 950 to the nearest ' +
      'hundred is 1,000. A brand-new digit is born.',
    q: 'Round 449 to the nearest hundred.',
    choices: [
      '400 — the tens digit 4 says round down',
      '500 — round the ones up first, then round again',
      '450',
    ],
    answer: 0,
    feedback:
      'Only the tens digit decides for hundreds, and it is 4 → round down → 400. Rounding in two ' +
      'steps (449 → 450 → 500) double-counts and gives the wrong answer. Read one decider digit, ' +
      'and one only.',
  },
  {
    title: 'Across the point',
    body:
      'The two decimal dials are live, and the place list has grown to the right. Nothing else has ' +
      'changed — and that is the point. A tenth is just the next place down, so rounding 2.47 to the ' +
      'nearest tenth uses the very same picture: find the two neighbouring tenths, find the midpoint ' +
      'between them, and see which side 2.47 falls on. The decider digit still sits one place to the right.',
    q: 'Round 2.47 to the nearest tenth. Which two tenths is it between, and which wins?',
    choices: [
      'Between 2.4 and 2.5; the midpoint is 2.45, and 2.47 is past it → 2.5',
      'Between 2 and 3; 2.47 is nearer 2 → 2',
      'It is already a decimal, so it cannot be rounded any further',
    ],
    answer: 0,
    feedback:
      '2.47 sits between 2.4 and 2.5. The tipping point is 2.45, and 2.47 is past it, so 2.5 wins — ' +
      'and the decider digit (the hundredths, 7) says the same thing, exactly as it always has. ' +
      'Rounding never learned a new rule for decimals. The places simply keep going to the right of ' +
      'the point, and the number line keeps zooming in.',
  },
  {
    title: 'Round it yourself',
    body:
      'Your turn. Build a number with the dials so it rounds to the TARGET shown, using the place ' +
      'given. Remember the winning zone: for the nearest ten, everything from 5 below the target ' +
      'to 4 above it rounds to the target. Land anywhere in the gold zone for CALIBRATED. Press ' +
      '“New target” for another.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display.  The number, an arrow, and the rounded result —
   carmine on the result because that is where the number "goes."  Rendered by
   a child component with INLINE colour styles (not styled-jsx classes): a
   child's spans are outside this component's style scope, and inline styles
   render identically in the Babel verify-harness and in real Next.js.
   ------------------------------------------------------------------------- */
function RoundingEquation({ n, rounded, place }) {
  const CARMINE = '#C81E4F';
  const INK = '#1C2B3A';
  const SOFT = '#5B6B7B';
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ color: INK, fontWeight: 700 }}>{commas(n)}</span>
      <span style={{ color: SOFT, fontWeight: 400, margin: '0 0.5ch' }}>→</span>
      <span style={{ color: CARMINE, fontWeight: 700 }}>{commas(rounded)}</span>
      <span style={{ color: SOFT, fontWeight: 400, fontSize: '0.66em', marginLeft: '0.8ch' }}>
        nearest {placeOf(place).label}
      </span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function RoundingLab() {
  const [digits, setDigits] = useState(START.slice()); // [hundredths, tenths, ones, tens, hundreds, thousands]
  const [place, setPlace] = useState(DEFAULT_PLACE);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null); // { place, goal }
  const [rolling, setRolling] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef(null); // number-line geometry for hit-testing, written by draw()
  const hoverRef = useRef(null); // value under the pointer on the line, or null
  const rollRef = useRef(null); // roll-animation fraction 0..1, or null
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const bigPlacesUnlocked = step >= PLACE_STEP;
  const decimalsUnlocked = step >= DECIMAL_STEP; // the two digits right of the point

  // during calibration the place is fixed by the challenge
  const activePlace = calib && target ? target.place : place;
  const n = valueOf(digits);
  const info = roundInfo(n, activePlace);

  const pct = calib && target ? calibMatchPercent(n, target) : 0;
  const calibrated = calib && target ? isCalibrated(n, target) : false;

  // Snapshot everything the renderer / handlers read, so the stable draw()
  // callback and the animation loop never see stale values.
  sceneRef.current = {
    digits,
    n,
    place: activePlace,
    info,
    step,
    calib,
    target,
    calibrated,
  };

  /* ---- full redraw from state -------------------------------------------- */
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

    /* palette */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F';
    const BLUE = '#3F74A6';
    const GOLD = '#D9982B';
    const OK = '#1F8A5B';

    const S = sceneRef.current;

    const rr = (x, y, w, h, rad) => {
      const t = Math.min(rad, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + t, y);
      ctx.arcTo(x + w, y, x + w, y + h, t);
      ctx.arcTo(x + w, y + h, x, y + h, t);
      ctx.arcTo(x, y + h, x, y, t);
      ctx.arcTo(x, y, x + w, y, t);
      ctx.closePath();
    };

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

    const padL = 46;
    const padR = 46;
    const trackX0 = padL;
    const trackX1 = W - padR;
    const trackW = trackX1 - trackX0;
    const lineY = Math.round(H * 0.34);

    /* choose the window: lesson shows n's own interval [lower, upper]; the
       calibration view is centred on the GOAL with a full interval of context
       on each side so the winning zone reads as a target band. */
    const place = S.place;
    const info = S.info;
    let winLo, winHi; // value at trackX0 / trackX1
    if (S.calib && S.target) {
      winLo = S.target.goal - place;
      winHi = S.target.goal + place;
    } else {
      winLo = info.lower;
      winHi = info.upper;
    }
    const span = winHi - winLo;
    const vx = (v) => trackX0 + ((v - winLo) / span) * trackW;

    /* ---- the number line ---------------------------------------------------- */
    // baseline
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trackX0, lineY);
    ctx.lineTo(trackX1, lineY);
    ctx.stroke();
    // end arrows (the line runs on forever)
    const arrow = (x, dir) => {
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x - dir * 8, lineY - 5);
      ctx.lineTo(x - dir * 8, lineY + 5);
      ctx.closePath();
      ctx.fillStyle = INK_SOFT;
      ctx.fill();
    };
    arrow(trackX0 - 2, -1);
    arrow(trackX1 + 2, 1);

    // ticks: divide the shown span into unit sub-steps of `place/10`
    const sub = place / 10;
    const nTicks = Math.round(span / sub);
    const labelAll = trackW / nTicks >= 40;
    ctx.textAlign = 'center';
    for (let i = 0; i <= nTicks; i++) {
      const v = winLo + i * sub;
      const x = vx(v);
      const isMultiple = v % place === 0; // a "round" number = a bold major tick
      ctx.strokeStyle = isMultiple ? INK : 'rgba(28,43,58,0.35)';
      ctx.lineWidth = isMultiple ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, lineY - (isMultiple ? 9 : 5));
      ctx.lineTo(x, lineY + (isMultiple ? 9 : 5));
      ctx.stroke();
      if (isMultiple || labelAll) {
        ctx.fillStyle = isMultiple ? INK : INK_SOFT;
        ctx.font = `${isMultiple ? '700 12.5' : '500 10.5'}px ui-monospace, Menlo, monospace`;
        ctx.textBaseline = 'top';
        ctx.fillText(commas(v), x, lineY + 12);
      }
    }

    /* ---- midpoint "tipping point" ------------------------------------------ */
    const drawMid = (midVal, labelText) => {
      const mx = vx(midVal);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.5)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mx, lineY - 34);
      ctx.lineTo(mx, lineY + 30);
      ctx.stroke();
      ctx.setLineDash([]);
      // little fulcrum triangle sitting under the line at the tipping point
      ctx.fillStyle = 'rgba(28,43,58,0.55)';
      ctx.beginPath();
      ctx.moveTo(mx, lineY - 34);
      ctx.lineTo(mx - 5, lineY - 44);
      ctx.lineTo(mx + 5, lineY - 44);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 10.5px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(labelText, mx, lineY - 46);
      ctx.restore();
    };

    if (S.calib && S.target) {
      /* ================= CALIBRATION VIEW ================================== */
      const goal = S.target.goal;
      // winning ZONE band: drawn edge-to-edge between the two tipping points
      // (goal ± place/2), so the shaded zone lines up exactly with the dashed
      // midpoint markers.  The integer range [goal−place/2, goal+place/2−1] is
      // stated precisely in the success note.
      const zx0 = vx(goal - place / 2);
      const zx1 = vx(goal + place / 2);
      ctx.save();
      ctx.fillStyle = S.calibrated ? 'rgba(31,138,91,0.16)' : 'rgba(217,152,43,0.16)';
      ctx.fillRect(zx0, lineY - 26, zx1 - zx0, 52);
      ctx.strokeStyle = S.calibrated ? OK : GOLD;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(zx0, lineY - 26, zx1 - zx0, 52);
      ctx.setLineDash([]);
      ctx.fillStyle = S.calibrated ? OK : '#8A6A1E';
      ctx.font = '700 11px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`rounds to ${commas(goal)}`, (zx0 + zx1) / 2, lineY - 30);
      ctx.restore();

      // the goal multiple as a bold gold flag on the line
      const gx = vx(goal);
      ctx.save();
      ctx.strokeStyle = S.calibrated ? OK : GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, lineY);
      ctx.lineTo(gx, lineY + 24);
      ctx.stroke();
      ctx.restore();

      // the two neighbouring midpoints are the zone edges → tipping points
      drawMid(goal - place / 2, commas(goal - place / 2));
      drawMid(goal + place / 2, commas(goal + place / 2));

      // the student's number n as the carmine marker (clamped into view w/ hint)
      drawNumberMarker(ctx, S.n, vx, trackX0, trackX1, lineY, winLo, winHi, CARMINE, INK, INK_SOFT, rr);

      // caption
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        `nearest ${placeOf(place).label} — land in the gold zone`,
        W / 2,
        lineY + 44
      );

      if (S.calibrated) drawStamp(ctx, W / 2, H - 30, OK, rr);
      return;
    }

    /* ================= LESSON VIEW ========================================= */
    // the two neighbouring multiples, labelled as lower / upper
    const drawMultipleLabel = (v, text, isWinner) => {
      const x = vx(v);
      ctx.save();
      ctx.fillStyle = isWinner ? CARMINE : BLUE;
      // marker ring on the line
      ctx.beginPath();
      ctx.arc(x, lineY, isWinner ? 7 : 5, 0, Math.PI * 2);
      ctx.lineWidth = isWinner ? 3 : 2;
      ctx.strokeStyle = isWinner ? CARMINE : BLUE;
      ctx.fillStyle = isWinner ? 'rgba(200,30,79,0.14)' : 'rgba(63,116,166,0.12)';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    drawMultipleLabel(info.lower, commas(info.lower), info.rounded === info.lower);
    drawMultipleLabel(info.upper, commas(info.upper), info.rounded === info.upper);

    // midpoint tipping line
    if (S.step >= 2) drawMid(info.mid, commas(info.mid));

    // distance brackets under the line (nearer = carmine, farther = neutral)
    if (S.step >= 1) {
      const nx = vx(S.n);
      const bracketY = lineY + 40;
      const drawDist = (x0, x1, dist, win) => {
        if (Math.abs(x1 - x0) < 0.5) return;
        ctx.save();
        ctx.strokeStyle = win ? CARMINE : 'rgba(28,43,58,0.35)';
        ctx.lineWidth = win ? 2.5 : 1.4;
        ctx.beginPath();
        ctx.moveTo(x0, bracketY - 4);
        ctx.lineTo(x0, bracketY + 4);
        ctx.moveTo(x0, bracketY);
        ctx.lineTo(x1, bracketY);
        ctx.moveTo(x1, bracketY - 4);
        ctx.lineTo(x1, bracketY + 4);
        ctx.stroke();
        const midx = (x0 + x1) / 2;
        const label = commas(dist); // a DISTANCE is a value too — it must be formatted,
        // not printed raw, or the rescale leaks hundredths onto the picture ("700 to 40")
        ctx.font = `${win ? '700' : '600'} 11.5px ui-monospace, Menlo, monospace`;
        const lw = ctx.measureText(label).width;
        ctx.fillStyle = win ? '#fff' : 'rgba(251,251,248,0.9)';
        rr(midx - lw / 2 - 4, bracketY + 6, lw + 8, 15, 4);
        ctx.fill();
        ctx.fillStyle = win ? CARMINE : INK_SOFT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, midx, bracketY + 8);
        ctx.restore();
      };
      drawDist(vx(info.lower), nx, info.distLower, info.rounded === info.lower);
      drawDist(nx, vx(info.upper), info.distUpper, info.rounded === info.upper);
    }

    // the number n itself (carmine marker + flag), possibly mid-roll
    let shown = S.n;
    if (rollRef.current != null) {
      const f = rollRef.current;
      shown = S.n + (info.rounded - S.n) * f;
    }
    drawNumberMarker(ctx, shown, vx, trackX0, trackX1, lineY, winLo, winHi, CARMINE, INK, INK_SOFT, rr, S.n);

    // "rounds to" arrow from n toward the winning multiple (a soft directional
    // cue once past the intro; the inner gap-check suppresses it when n already
    // sits on the multiple)
    if (S.step >= 1 && rollRef.current == null) {
      const nx = vx(S.n);
      const tx = vx(info.rounded);
      if (Math.abs(tx - nx) > 6) {
        ctx.save();
        ctx.strokeStyle = 'rgba(200,30,79,0.5)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        const ay = lineY - 20;
        ctx.beginPath();
        ctx.moveTo(nx, ay);
        ctx.lineTo(tx, ay);
        ctx.stroke();
        ctx.setLineDash([]);
        const d = Math.sign(tx - nx);
        ctx.beginPath();
        ctx.moveTo(tx, ay);
        ctx.lineTo(tx - d * 7, ay - 4);
        ctx.lineTo(tx - d * 7, ay + 4);
        ctx.closePath();
        ctx.fillStyle = 'rgba(200,30,79,0.6)';
        ctx.fill();
        ctx.restore();
      }
    }

    /* ---- hover readout: sweep the line, see where a value would round ------- */
    if (hoverRef.current != null && rollRef.current == null) {
      const hv = hoverRef.current;
      const hx = vx(hv);
      const hInfo = roundInfo(hv, place);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, lineY - 12);
      ctx.lineTo(hx, lineY + 12);
      ctx.stroke();
      ctx.setLineDash([]);
      const msg = `${commas(hv)} → ${commas(hInfo.rounded)}`;
      ctx.font = '600 11px ui-monospace, Menlo, monospace';
      const lw = ctx.measureText(msg).width;
      let bx = hx - lw / 2 - 6;
      bx = Math.max(4, Math.min(W - lw - 16, bx));
      ctx.fillStyle = 'rgba(251,251,248,0.95)';
      rr(bx, lineY + 58, lw + 12, 20, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,43,58,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, bx + 6, lineY + 68);
      ctx.restore();
    }

    /* ======================================================================
       DECIDER-DIGIT STRIP (the classroom shortcut), from step 3 on
       ==================================================================== */
    if (S.step >= 3) {
      drawDeciderStrip(ctx, rr, S.n, info, place, W, H, { INK, INK_SOFT, CARMINE, BLUE, OK });
    }
  }, []);

  /* the carmine number marker with a value flag; clamps to the visible edges
     with a directional hint when n is off-window (used in the calib view) */
  function drawNumberMarker(ctx, v, vx, x0, x1, lineY, winLo, winHi, CARMINE, INK, INK_SOFT, rr, exactN) {
    let clamped = false;
    let mx = vx(v);
    if (v < winLo) {
      mx = x0;
      clamped = true;
    } else if (v > winHi) {
      mx = x1;
      clamped = true;
    }
    ctx.save();
    // stem
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx, lineY);
    ctx.lineTo(mx, lineY - 24);
    ctx.stroke();
    // dot on the line
    ctx.beginPath();
    ctx.arc(mx, lineY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = CARMINE;
    ctx.fill();
    // value flag
    const label = clamped
      ? (v < winLo ? '◄ ' : '') + commas(exactN != null ? exactN : Math.round(v)) + (v > winHi ? ' ►' : '')
      : commas(exactN != null && rollRef.current == null ? exactN : Math.round(v));
    ctx.font = '700 12.5px ui-monospace, Menlo, monospace';
    const lw = ctx.measureText(label).width;
    let fx = mx - lw / 2 - 7;
    fx = Math.max(2, Math.min(x1 - lw - 12, fx));
    rr(fx, lineY - 46, lw + 14, 20, 5);
    ctx.fillStyle = CARMINE;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, fx + (lw + 14) / 2, lineY - 36);
    ctx.restore();
  }

  /* the CALIBRATED stamp */
  function drawStamp(ctx, cx, cy, OK, rr) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.05);
    ctx.fillStyle = 'rgba(31,138,91,0.10)';
    rr(-70, -15, 140, 30, 7);
    ctx.fill();
    ctx.strokeStyle = OK;
    ctx.lineWidth = 2;
    rr(-70, -15, 140, 30, 7);
    ctx.stroke();
    ctx.fillStyle = OK;
    ctx.font = '700 13px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ CALIBRATED', 0, 0.5);
    ctx.restore();
  }

  /* the decider-digit strip: n's digits in boxes, the place-being-rounded
     outlined in blue, the single decider digit carmine with ↑/↓, then the
     rounded result.  This is the algorithm that matches the number line. */
  function drawDeciderStrip(ctx, rr, n, info, place, W, H, C) {
    // show digits from the highest of (rounding place, top nonzero) down to ones
    let hi = info.roundIndex;
    for (let i = 3; i >= 0; i--) {
      if (digitAt(n, i) !== 0) {
        hi = Math.max(hi, i);
        break;
      }
    }
    const idxs = [];
    for (let i = hi; i >= 0; i--) idxs.push(i);

    const boxW = 30;
    const gap = 7;
    const totalW = idxs.length * boxW + (idxs.length - 1) * gap;
    const y0 = Math.round(H * 0.64);
    const x0 = (W - totalW) / 2 - 60; // leave room for "→ result" on the right
    const cx0 = Math.max(16, x0);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    idxs.forEach((idx, k) => {
      const bx = cx0 + k * (boxW + gap);
      const isRoundPlace = idx === info.roundIndex;
      const isDecider = idx === info.deciderIndex;
      ctx.save();
      if (isDecider) {
        ctx.fillStyle = 'rgba(200,30,79,0.10)';
        rr(bx, y0, boxW, boxW, 6);
        ctx.fill();
        ctx.strokeStyle = C.CARMINE;
        ctx.lineWidth = 2;
        rr(bx, y0, boxW, boxW, 6);
        ctx.stroke();
      } else if (isRoundPlace) {
        ctx.strokeStyle = C.BLUE;
        ctx.lineWidth = 2;
        rr(bx, y0, boxW, boxW, 6);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(28,43,58,0.18)';
        ctx.lineWidth = 1;
        rr(bx, y0, boxW, boxW, 6);
        ctx.stroke();
      }
      ctx.fillStyle = isDecider ? C.CARMINE : isRoundPlace ? C.BLUE : C.INK;
      ctx.font = `700 17px ui-monospace, Menlo, monospace`;
      ctx.textBaseline = 'middle';
      ctx.fillText(String(digitAt(n, idx)), bx + boxW / 2, y0 + boxW / 2 + 1);
      ctx.restore();

      // The round-place and decider digits are always adjacent, so their labels
      // go on DIFFERENT rows (place ABOVE, decider BELOW) to avoid colliding.
      if (isRoundPlace) {
        ctx.fillStyle = C.BLUE;
        ctx.font = '600 9.5px system-ui, sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText('round here', bx + boxW / 2, y0 - 5);
      }
      if (isDecider) {
        ctx.fillStyle = C.CARMINE;
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(info.up ? '5+ ↑ up' : '4− ↓ down', bx + boxW / 2, y0 + boxW + 6);
      }
    });

    // "→ rounds to result"
    const arrowX = cx0 + totalW + 14;
    ctx.fillStyle = C.INK_SOFT;
    ctx.font = '600 15px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('→', arrowX, y0 + boxW / 2);
    ctx.fillStyle = C.CARMINE;
    ctx.font = '700 20px ui-monospace, Menlo, monospace';
    ctx.fillText(commas(info.rounded), arrowX + 22, y0 + boxW / 2);

    // rule caption below
    ctx.fillStyle = C.INK_SOFT;
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `decider = the ${placeOf(place).deciderName} digit (${info.decider}) — ${
        info.up ? '5 or more, round up' : '4 or less, round down'
      }`,
      W / 2,
      y0 + boxW + 30
    );
  }

  /* redraw on any state that affects the picture */
  useEffect(() => {
    draw();
  }, [digits, place, step, target, calibrated, draw]);

  /* redraw on resize (canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* per-step didactic setup: seed nice demonstration numbers so each step's
     copy matches the picture (precedent: AreaLab resting on the parallelogram).
     Forced on entry; the student is free to change afterward. */
  useEffect(() => {
    if (step === PLACE_STEP) {
      setDigits([0, 0, 7, 4, 2, 3]); // 3,247
      setPlace(DEFAULT_PLACE);       // nearest ten
    } else if (step === 5) {
      setDigits([0, 0, 9, 4, 4, 0]); // 449
      setPlace(10000);               // nearest hundred
    } else if (step === DECIMAL_STEP) {
      setDigits([7, 4, 2, 0, 0, 0]); // 2.47 — the number the decimal step talks through
      setPlace(10);                  // nearest tenth
    } else if (step === CALIB_STEP) {
      setDigits([0, 0, 0, 0, 0, 0]);
      setRolling(false);
    } else if (step <= 3) {
      setPlace(DEFAULT_PLACE);       // nearest ten
    }
    hoverRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* hand a target to the calibration step the first time we reach it */
  useEffect(() => {
    if (calib && target == null) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the "Roll to nearest" flourish — n slides to its rounded multiple */
  useEffect(() => {
    if (!rolling) {
      rollRef.current = null;
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      rollRef.current = null;
      setRolling(false);
      draw();
      return;
    }
    let raf;
    let start = null;
    const dur = 900;
    const loop = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / dur);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      rollRef.current = ease;
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else {
        rollRef.current = null;
        setRolling(false);
        draw();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rolling, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const setDigit = (i, value) => {
    const v = parseInt(value, 10);
    setDigits((prev) => {
      const next = prev.slice();
      next[i] = v;
      return next;
    });
    if (rolling) setRolling(false);
  };

  const onPointerMove = (e) => {
    if (calib) return; // hover-to-explore is a lesson-only aid
    const S = sceneRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const g = geoRef.current;
    if (!g) return;
    if (cssY < g.lineY - 60 || cssY > g.lineY + 90 || cssX < g.trackX0 - 4 || cssX > g.trackX1 + 4) {
      if (hoverRef.current != null) {
        hoverRef.current = null;
        draw();
      }
      return;
    }
    const frac = (cssX - g.trackX0) / (g.trackX1 - g.trackX0);
    const v = Math.round(g.winLo + frac * (g.winHi - g.winLo));
    const clamped = Math.max(g.winLo, Math.min(g.winHi, v));
    if (clamped !== hoverRef.current) {
      hoverRef.current = clamped;
      draw();
    }
    void S;
  };
  const onPointerLeave = () => {
    if (hoverRef.current != null) {
      hoverRef.current = null;
      draw();
    }
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

  /* store number-line geometry for the pointer handler (mirror of draw's math) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const padL = 46;
    const padR = 46;
    const trackX0 = padL;
    const trackX1 = W - padR;
    const lineY = Math.round(H * 0.34);
    let winLo, winHi;
    if (calib && target) {
      winLo = target.goal - activePlace;
      winHi = target.goal + activePlace;
    } else {
      winLo = info.lower;
      winHi = info.upper;
    }
    geoRef.current = { trackX0, trackX1, lineY, winLo, winHi };
  }, [digits, place, step, target, activePlace, info.lower, info.upper, calib]);

  /* facts + spoken description */
  const rangeStr = calib && target ? roundRange(target.goal, target.place) : null;
  const spoken = calib
    ? target
      ? `Build a number that rounds to ${commas(target.goal)} to the nearest ${
          placeOf(target.place).label
        }. You built ${commas(n)}, which rounds to ${commas(roundInfo(n, target.place).rounded)}.`
      : ''
    : `${commas(n)} rounds to ${commas(info.rounded)} to the nearest ${
        placeOf(activePlace).label
      }. It is between ${commas(info.lower)} and ${commas(info.upper)}, ${
        info.distLower < info.distUpper
          ? `nearer ${commas(info.lower)}`
          : info.distUpper < info.distLower
          ? `nearer ${commas(info.upper)}`
          : `exactly halfway, so it rounds up`
      }.`;

  return (
    <div className="rlab">
      <header className="head">
        <h1>Rounding Numbers: Find the Nearest Round Number</h1>
        <p className="lede">
          To round a number is to slide it to the <em>nearest</em> ten, hundred, thousand — or, once
          you cross the point, the nearest tenth. Watch a
          number sit between two neighbours on the line, see which one it is <em>closer</em> to, and
          learn the one-digit shortcut that gives the same answer every time.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <RoundingEquation n={n} rounded={info.rounded} place={activePlace} />
            </p>
            <p className="equation-sub mono">
              {calib
                ? target
                  ? `goal: rounds to ${commas(target.goal)}`
                  : ''
                : info.distLower === info.distUpper
                ? 'exactly halfway — rounds up'
                : info.up
                ? `nearer ${commas(info.upper)} · rounds up`
                : `nearer ${commas(info.lower)} · rounds down`}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {calib ? 'land the carmine number in the gold zone' : 'hover the line to see where a number rounds'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — ${commas(n)} rounds to ${commas(target.goal)}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Rounding to</span>
              <span className="fact-v">nearest {placeOf(activePlace).label} ({commas(activePlace)})</span>
            </div>
            <div className="fact">
              <span className="fact-k">Between</span>
              <span className="fact-v mono">
                {commas(info.lower)} and {commas(info.upper)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Halfway mark</span>
              <span className="fact-v mono">{commas(info.mid)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Decider digit</span>
              <span className="fact-v mono">
                {placeOf(activePlace).deciderName} = {info.decider} ({info.up ? '5+ up' : '4− down'})
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Distances</span>
              <span className="fact-v mono">
                {commas(info.distLower)} to {commas(info.lower)} · {commas(info.distUpper)} to {commas(info.upper)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Rounded value</span>
              <span className="fact-v mono big" style={{ color: '#C81E4F' }}>
                {commas(info.rounded)}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (rolling ? ' on' : '')}
              onClick={() => setRolling((c) => !c)}
              disabled={info.distLower === info.distUpper && info.distLower === 0}
            >
              {rolling ? 'Rolling…' : 'Roll to nearest'}
            </button>
            <div className="seg" role="group" aria-label="Rounding place">
              {PLACES.map((p) => {
                const on = activePlace === p.mult;
                const locked = calib || !bigPlacesUnlocked;
                return (
                  <button
                    key={p.mult}
                    type="button"
                    className={'seg-btn' + (on ? ' on' : '')}
                    aria-pressed={on}
                    disabled={locked && !on}
                    onClick={() => !calib && setPlace(p.mult)}
                  >
                    nearest {p.label}
                  </button>
                );
              })}
            </div>
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
            {[5, 4, 3, 2, 1, 0].map((i) => {
              const names = ['Hundredths', 'Tenths', 'Ones', 'Tens', 'Hundreds', 'Thousands'];
              // ones/tens live from the start; hundreds/thousands at PLACE_STEP;
              // the two decimal digits at DECIMAL_STEP, when the lab crosses the point
              const unlocked = i === 2 || i === 3 ? true : i <= 1 ? decimalsUnlocked : bigPlacesUnlocked;
              const disabledForCalibNo = false;
              void disabledForCalibNo;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={i}>
                  <span className="dk">{names[i]}</span>
                  <span className="drole">
                    {unlocked ? `the ${names[i].toLowerCase()} digit` : 'unlocks at “any place”'}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    step={1}
                    value={digits[i]}
                    disabled={!unlocked}
                    aria-label={`${names[i]} digit`}
                    onChange={(e) => setDigit(i, e.target.value)}
                    style={{ accentColor: '#C81E4F' }}
                  />
                  <output className="dv">{unlocked ? digits[i] : '🔒'}</output>
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

          {calib && target != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Build a number that rounds to</span>
                <span className="target-words mono">
                  {commas(target.goal)}
                  <span className="target-place"> · nearest {placeOf(target.place).label}</span>
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    you built {commas(n)} → rounds to{' '}
                    {commas(roundInfo(n, target.place).rounded)}.{' '}
                    {roundInfo(n, target.place).rounded < target.goal
                      ? 'Go higher ↑'
                      : roundInfo(n, target.place).rounded > target.goal
                      ? 'Go lower ↓'
                      : ''}
                  </span>
                )}
              </div>
              {calibrated && rangeStr && (
                <p className="range-note">
                  Every number from <b>{commas(rangeStr[0])}</b> to <b>{commas(rangeStr[1])}</b> rounds
                  to {commas(target.goal)} — you found <b>{commas(n)}</b>
                  {n === target.goal
                    ? ' (a multiple rounds to itself!).'
                    : n < target.goal
                    ? ' (it rounded up).'
                    : ' (it rounded down).'}
                </p>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setDigits([0, 0, 0, 0, 0, 0]);
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
                  setDigits(START.slice());
                  setPlace(DEFAULT_PLACE);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">round(n) = the nearest multiple of the place · ties round up</span>{' '}
        &nbsp;·&nbsp; rounding whole numbers to the nearest 10 / 100 / 1,000 (CCSS 3.NBT.A.1,
        4.NBT.A.3). Rounding decimals is the natural next lab.
      </footer>

      <style jsx>{`
        .rlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
          --gold: #d9982b;
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
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.01em;
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
          background: rgba(251, 251, 248, 0.9);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px 18px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 640px) {
          .facts {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 420px) {
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
        .fact-v.big {
          font-size: 20px;
          font-weight: 700;
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
        .seg {
          /* WRAPS. The decimal extension took this control from three options
             to five ("nearest tenth … nearest thousand"), and an inline-flex
             that cannot shrink below its content pushed the whole page into a
             horizontal scroll at phone width. Wrapping inside the bordered box
             keeps every place reachable on a 390px screen. */
          display: flex;
          flex-wrap: wrap;
          max-width: 100%;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          overflow: hidden;
        }
        .seg-btn {
          font: 600 12px/1 system-ui, sans-serif;
          padding: 8px 11px;
          border: none;
          border-right: 1px solid rgba(28, 43, 58, 0.14);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .seg-btn:last-child {
          border-right: none;
        }
        .seg-btn.on {
          background: var(--blue);
          color: #fff;
        }
        .seg-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
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
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 84px 1fr 30px;
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
          font-weight: 600;
          font-size: 15px;
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
        .target-card {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(217, 152, 43, 0.08);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .target-words {
          font-size: 24px;
          font-weight: 700;
          color: var(--ink);
        }
        .target-place {
          font-size: 13px;
          font-weight: 600;
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
          background: linear-gradient(90deg, rgba(217, 152, 43, 0.6), var(--gold));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          min-height: 24px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .range-note {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.5;
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
        :global(.rlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
