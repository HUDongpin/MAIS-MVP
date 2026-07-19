'use client';

/* ============================================================================
   MultiplesLab — an interactive "bench" for one of the pillars of number sense:
   the MULTIPLE. A multiple of a whole number n is what you land on when you
   SKIP-COUNT by n: n×1, n×2, n×3, n×4, … They march on forever.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter and a CALIBRATED stamp.

   THE SIGNATURE CENTERPIECE is THE SKIP-COUNT NUMBER LINE. Counting by n draws
   a run of equal carmine JUMPS of length n; each landing spot is a multiple of
   n (n, 2n, 3n, …), and the line ends in a "→ forever" arrow — because the
   multiples never stop (the headline contrast with factors, which are finite).
   Unlock a SECOND counter m and its jumps appear (in blue) below the line; the
   spots where BOTH counters land at once are the COMMON MULTIPLES (gold), and
   the very first one is the LEAST COMMON MULTIPLE — the moment two rhythms sync.

   DELIBERATELY DISTINCT from its siblings:
     • FactorLab runs the OTHER way: it DECOMPOSES one number N into its FINITE
       set of divisors (a rectangle array + a factor track meeting at √N).
       MultiplesLab BUILDS UP the INFINITE sequence of multiples by skip-counting,
       and its capstone is the LCM — an idea FactorLab never touches.
       The two labs are two sides of one coin: "m is a multiple of n" is exactly
       "n is a factor of m" — a duality the lab makes explicit in a whole step.
     • MultiplicationLab builds ONE product a×b as an ARRAY of squares.
       MultiplesLab is a NUMBER-LINE walk of the whole run n, 2n, 3n, …
     • VariableLab's number-line walk EVALUATES a·x+b (one carmine x-jump then a
       blue constant jump → a value dot). MultiplesLab's walk is a repeated,
       equal skip of size n landing on a whole SEQUENCE, plus a second rhythm.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/MultiplesLab.jsx
     2. Import and render it:
          import MultiplesLab from './MultiplesLab';
          export default function Page() { return <MultiplesLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (n, k, m, lesson step).
     MODEL  — gcd / lcm / multiplesOf / … are pure math; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // the ONE accent = the MULTIPLES of n (the star)
const CURVE_SOFT = 'rgba(200,30,79,0.14)';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const BLUE = '#3f74a6'; // the SECOND counter m (a principled second color, staged in late)
const BLUE_SOFT = 'rgba(63,116,166,0.14)';
const GOLD = '#c98a1e'; // COMMON multiples / the LCM — the coincidence of two rhythms
const GOLD_SOFT = 'rgba(201,138,30,0.16)';
const TIMES = '×';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three dials, unlocking one per lesson step:
     n — the number we COUNT BY (the star). 2..12 keeps the jumps legible and
         spans rich cases for common multiples and LCM.
     k — how far we count: the number of jumps / "which multiple." 1..12. Slide
         it to add landings one at a time; the readout names the k-th multiple.
     m — a SECOND counter, revealed for common multiples and the LCM. 2..12.
   ------------------------------------------------------------------------- */
const N_MIN = 2;
const N_MAX = 12;
const K_MIN = 1;
const K_MAX = 12;
const PARAMS = [
  { key: 'n', label: 'n', min: N_MIN, max: N_MAX, step: 1, unlock: 1, star: true, role: 'count by this' },
  { key: 'k', label: 'k', min: K_MIN, max: K_MAX, step: 1, unlock: 2, role: 'how many jumps · the k-th multiple' },
  { key: 'm', label: 'm', min: N_MIN, max: N_MAX, step: 1, unlock: 5, role: 'a second counter' },
];
const START = { n: 3, k: 4, m: 6 }; // opens on 3, 6, 9, 12 — the first four multiples of 3
const MAXLINE = 132; // hard cap on the number line's right end, for legibility

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels. All exact integer arithmetic — the
   K-12 correctness win: no float ever decides whether something is a multiple.
   ------------------------------------------------------------------------- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}
function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)) * b); // divide first to avoid overflow; exact for integers
}
// the first `count` multiples of n: [n, 2n, 3n, …]
function multiplesOf(n, count) {
  const out = [];
  for (let j = 1; j <= count; j++) out.push(n * j);
  return out;
}
// is `value` a multiple of n?  (⟺ n divides value evenly ⟺ n is a factor of value)
function isMultiple(value, n) {
  return n > 0 && value % n === 0;
}
// every common multiple of n and m up to hi — these are exactly the multiples of lcm(n,m)
function commonMultiplesUpTo(n, m, hi) {
  const L = lcm(n, m);
  const out = [];
  if (L <= 0) return out;
  for (let c = L; c <= hi; c += L) out.push(c);
  return out;
}
// all counter pairs (a ≤ b, both in 2..12) whose LCM is exactly T — the calibration solution set
function lcmPairs(T) {
  const out = [];
  for (let a = N_MIN; a <= N_MAX; a++) {
    for (let b = a; b <= N_MAX; b++) {
      if (lcm(a, b) === T) out.push([a, b]);
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString();
}
// the multiples list as text: "3, 6, 9, 12, …"
function multiplesText(n, count) {
  return multiplesOf(n, count).join(', ') + ', …';
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration ("build the target LCM"). A target T is revealed; the
   student tunes the two counters n and m until the FIRST place their rhythms
   meet — their least common multiple — lands exactly on T. Because CALIBRATED
   is gated on the EXACT integer test lcm(n,m) === T (never a float compare),
   there is no false stamp. Many counter pairs share an LCM, so success quietly
   reveals the whole family (e.g. LCM 12 ← 3 & 4, 4 & 6, 2 & 12, …). Targets are
   curated so each is reachable with ≥ 2 distinct pairs and both counters ≤ 12.
   ------------------------------------------------------------------------- */
const CALIB_TARGETS = [12, 18, 20, 24, 30, 36, 40];
function makeTarget(prev) {
  let t;
  do {
    t = CALIB_TARGETS[Math.floor(Math.random() * CALIB_TARGETS.length)];
  } while (t === prev && CALIB_TARGETS.length > 1);
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with its step; the
   reveal lives in `feedback` (shown after answering); the distractors are real
   student misconceptions ("close to a multiple," confusing multiple with factor,
   thinking multiples run out). Next is gated on ANSWERED, not CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the multiples',
    body:
      'A MULTIPLE of a number is what you land on when you SKIP-COUNT by it. Count by 3 and you land on ' +
      '3, 6, 9, 12, … — those are the multiples of 3. On the number line each carmine jump is the same ' +
      'length, 3, so every landing is 3 more than the last: 3 × 1, 3 × 2, 3 × 3, 3 × 4, …',
    q: 'Which of these is a multiple of 3?',
    choices: [
      '12 — because 3 × 4 = 12, you land on it counting by 3',
      '10 — because it is close to 9',
      '7 — because 7 is a whole number',
    ],
    answer: 0,
    feedback:
      'A multiple of 3 is any number you reach by counting 3, 6, 9, 12, … You land on 12 (that is 3 × 4), ' +
      'so 12 is a multiple of 3. You skip right over 10 (9 then 12), and 7 as well — being a whole number ' +
      'or being “close” is not enough. A multiple of n is exactly n times some whole number.',
  },
  {
    title: 'Count by n',
    body:
      'The n dial is live — n is the length of each jump. Slide it and watch the landings: every one is a ' +
      'multiple of n. Counting by 5 lands on 5, 10, 15, 20, …; counting by 4 lands on 4, 8, 12, 16, …. The ' +
      'j-th multiple is simply n × j.',
    q: 'Set the jump to n = 5. What are the first four multiples of 5?',
    choices: ['5, 10, 15, 20', '5, 6, 7, 8', '1, 5, 25, 125'],
    answer: 0,
    feedback:
      'Counting by 5 you land on 5, 10, 15, 20 — each is 5 more than the one before (5 × 1, 5 × 2, 5 × 3, ' +
      '5 × 4). “5, 6, 7, 8” is counting by ONE, and “1, 5, 25, 125” is multiplying by 5 each time (powers), ' +
      'not skip-counting by 5.',
  },
  {
    title: 'The k-th multiple',
    body:
      'The k dial unlocks — it sets how many jumps you take, and the last landing is the k-th multiple of ' +
      'n, which equals n × k. Slide k to add landings one at a time. You do not have to count all the way ' +
      'up: to get the k-th multiple, just multiply n × k.',
    q: 'What is the 6th multiple of 4?',
    choices: ['24 — because 4 × 6 = 24', '10 — because 4 + 6 = 10', '46 — put the digits together'],
    answer: 0,
    feedback:
      'The 6th multiple of 4 is 4 × 6 = 24 — take six jumps of 4 (4, 8, 12, 16, 20, 24) and you land on 24. ' +
      'Adding (4 + 6) or gluing digits together does not give a multiple. The k-th multiple of n is always ' +
      'n × k.',
  },
  {
    title: 'Multiples go on forever',
    body:
      'Here is the big difference from factors. A number has only a FINITE list of factors — 4 has just 1, ' +
      '2, and 4, and that is all. But its multiples never run out: 4, 8, 12, 16, 20, … keep going as far as ' +
      'you like. That is why the number line ends in an arrow: → forever. Push k to the end and there is ' +
      'always a next multiple.',
    q: 'How many multiples does the number 4 have?',
    choices: [
      'Infinitely many — 4, 8, 12, 16, 20, … never stop',
      'Exactly three — 1, 2, and 4',
      'Just one — the number 4 itself',
    ],
    answer: 0,
    feedback:
      'Every whole number has infinitely many multiples — you can always take one more jump. (Its FACTORS, ' +
      'by contrast, are a short finite list: 4 has only 1, 2, 4.) Do not mix them up: factors DIVIDE the ' +
      'number and stop; multiples are BUILT FROM it and go on forever.',
  },
  {
    title: 'Multiple and factor — two sides of one coin',
    body:
      'Multiples and factors are the same relationship read two ways. “24 is a multiple of 6” means you ' +
      'land on 24 when you count by 6 — and that is exactly the same as saying “6 is a factor of 24,” ' +
      'because 6 divides 24 evenly (24 ÷ 6 = 4, remainder 0). To TEST whether a number is a multiple of n, ' +
      'just divide: remainder 0 means yes.',
    q: '“24 is a multiple of 6.” Which statement below says the very same thing?',
    choices: [
      '6 is a factor of 24 — it divides 24 with no remainder',
      '6 is a multiple of 24',
      '24 is a factor of 6',
    ],
    answer: 0,
    feedback:
      '“24 is a multiple of 6” and “6 is a factor of 24” are two ways to state one fact: 24 = 6 × 4, so 6 ' +
      'divides 24 evenly. The number you build UP to (24) is the multiple; the number you count BY (6) is ' +
      'the factor. The other choices flip which number is bigger, which reverses the roles.',
  },
  {
    title: 'Common multiples',
    body:
      'Now a second counter, m, unlocks (its jumps show in blue, below the line). Follow along with n = 4 ' +
      'and m = 6. A COMMON MULTIPLE is a spot where BOTH counters land — a multiple of 4 AND of 6. Watch ' +
      'for the gold marks where a carmine landing and a blue landing meet: 12, 24, 36, … are common ' +
      'multiples of 4 and 6.',
    q: 'Which number is a common multiple of 4 and 6?',
    choices: ['12 — both 4 and 6 divide it (4 × 3 and 6 × 2)', '8 — only 4 divides it', '18 — only 6 divides it'],
    answer: 0,
    feedback:
      '12 is a common multiple of 4 and 6: 4 × 3 = 12 and 6 × 2 = 12, so both counters land on it. 8 is a ' +
      'multiple of 4 but not of 6, and 18 is a multiple of 6 but not of 4 — each is missed by one counter, ' +
      'so neither is common to both.',
  },
  {
    title: 'The least common multiple (LCM)',
    body:
      'The common multiples of 4 and 6 are 12, 24, 36, … — and notice they are exactly the multiples of ' +
      'the FIRST one, 12. That first (smallest) common multiple is the LEAST COMMON MULTIPLE, LCM(4, 6) = ' +
      '12: the moment the two rhythms first sync up. A quick way to get it: LCM = n × m ÷ GCF(n, m).',
    q: 'What is the least common multiple of 4 and 6?',
    choices: ['12 — the first spot both counters land on', '24 — a common multiple, but not the least', '2 — that is the GCF, not the LCM'],
    answer: 0,
    feedback:
      'LCM(4, 6) = 12 — the smallest number both 4 and 6 divide into. 24 IS a common multiple, but it is ' +
      'the second one, not the least. And 2 is the greatest common FACTOR (GCF) of 4 and 6, a different ' +
      'idea: the GCF is the biggest number that divides both; the LCM is the smallest both divide into.',
  },
  {
    title: 'Build the target LCM',
    body:
      'Final challenge. A target number is shown as a grey flag on the line. Tune the two counters n and m ' +
      'so their rhythms FIRST meet exactly on the target — that is, so LCM(n, m) equals the target. Many ' +
      'different pairs work! Land the least common multiple on the flag to reach CALIBRATED, then press ' +
      'New target.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function MultiplesLab() {
  const [n, setN] = useState(START.n);
  const [k, setK] = useState(START.k);
  const [m, setM] = useState(START.m);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const seededRef = useRef(false); // seed the two-counter example exactly once

  const current = STEPS[step];
  const calib = !!current.calib;
  // the second counter (and common-multiple view) is on for the two-counter steps and calibration
  const twoCounters = calib || step >= 5;

  /* ---- derived facts (single source of truth = state; recomputed for readouts) ---- */
  const kthMultiple = n * k;
  const L = twoCounters ? lcm(n, m) : 0;
  const gcfNM = twoCounters ? gcd(n, m) : 0;

  // number-line extent (right end), chosen so the picture stays legible in every mode
  let hi;
  if (calib && target) {
    hi = Math.min(MAXLINE, target * 2); // frame the target and its double so "multiples of the LCM" reads
  } else if (twoCounters) {
    const want = k * L; // k common-multiple periods
    hi = Math.max(L, Math.min(MAXLINE, want || L));
  } else {
    hi = Math.max(n, Math.min(MAXLINE, n * k)); // k jumps of n
  }

  // calibration status — gated on the EXACT integer test, so there is never a false stamp
  const calibrated = calib && target ? L === target : false;
  const pct = calib && target ? (L === target ? 100 : Math.min(96, Math.max(0, Math.round(100 * (1 - Math.min(1, Math.abs(L - target) / target)))))) : 0;

  // single source of truth snapshot for the renderer & pointer handler
  sceneRef.current = {
    ...sceneRef.current,
    n,
    k,
    m,
    hi,
    twoCounters,
    calib,
    target,
    step,
  };

  /* ---- full redraw of the skip-count number line from state -------------- */
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
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
    const N = S.n;
    const M = S.m;
    const HI = Math.max(1, S.hi);
    const two = S.twoCounters;
    const showInfinity = !two && S.step >= 3; // the "forever" step leans on the arrow

    /* faint quadrille backdrop */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    const q = 22;
    for (let gx = q; gx < W; gx += q) {
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, H);
    }
    for (let gy = q; gy < H; gy += q) {
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(W, gy + 0.5);
    }
    ctx.stroke();

    /* geometry of the number line */
    const padL = 34;
    const padR = 40; // room for the → forever arrow
    const lineX0 = padL;
    const lineX1 = W - padR;
    const yBase = Math.round(H * 0.52);
    const xOf = (v) => lineX0 + (v / HI) * (lineX1 - lineX0);
    const jumpW = xOf(N) - xOf(0); // pixel length of one n-jump
    const arcCapAbove = Math.min(46, yBase - 24);
    const arcCapBelow = Math.min(46, H - yBase - 26);

    /* ---- coincidence bands (drawn first, behind everything) ---- */
    if (two) {
      const commons = commonMultiplesUpTo(N, M, HI);
      for (const c of commons) {
        const cx = xOf(c);
        ctx.fillStyle = GOLD_SOFT;
        ctx.beginPath();
        ctx.rect(cx - 7, 14, 14, H - 28);
        ctx.fill();
      }
    }

    /* ---- the number line itself, with a right-pointing arrow ---- */
    ctx.strokeStyle = 'rgba(28,43,58,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(lineX0 - 8, yBase);
    ctx.lineTo(lineX1 + 22, yBase);
    ctx.stroke();
    // arrowhead
    ctx.fillStyle = 'rgba(28,43,58,0.6)';
    ctx.beginPath();
    ctx.moveTo(lineX1 + 30, yBase);
    ctx.lineTo(lineX1 + 20, yBase - 5);
    ctx.lineTo(lineX1 + 20, yBase + 5);
    ctx.closePath();
    ctx.fill();

    /* ---- reference ticks + faint round-number labels ---- */
    const tickStep = HI <= 24 ? 1 : HI <= 48 ? 2 : HI <= 80 ? 5 : 10;
    const labelStep = HI <= 24 ? 5 : HI <= 48 ? 10 : HI <= 80 ? 20 : 20;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= HI; v += tickStep) {
      const X = xOf(v);
      const major = v % labelStep === 0;
      ctx.strokeStyle = 'rgba(28,43,58,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X, yBase - (major ? 5 : 3));
      ctx.lineTo(X, yBase + (major ? 5 : 3));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = 'rgba(91,107,123,0.85)';
        ctx.fillText(fmt(v), X, yBase + 8);
      }
    }
    // "0" start label
    ctx.fillStyle = INK_SOFT;
    ctx.font = `600 11px ${MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillText('0', xOf(0), yBase + 8);

    /* ---- helper: draw one counter's run of equal jumps ---- */
    const drawRun = (stepN, above, color, softColor, labelLandings, jumpCount) => {
      const dir = above ? -1 : 1;
      const y = yBase;
      const arcCap = above ? arcCapAbove : arcCapBelow;
      const stepPx = xOf(stepN) - xOf(0);
      const showPlus = stepPx > 30; // only label "+n" when jumps are wide enough to read
      const landings = [];
      for (let j = 1; j <= jumpCount; j++) {
        const v = stepN * j;
        if (v > HI) break;
        landings.push(v);
      }
      // arcs
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      let prev = 0;
      for (const v of landings) {
        const xa = xOf(prev);
        const xb = xOf(v);
        const mid = (xa + xb) / 2;
        const lift = Math.min(arcCap, 16 + (xb - xa) * 0.34);
        ctx.beginPath();
        ctx.moveTo(xa, y + dir * 3);
        ctx.quadraticCurveTo(mid, y + dir * (3 + lift), xb, y + dir * 3);
        ctx.stroke();
        if (showPlus) {
          ctx.fillStyle = color;
          ctx.font = `600 10px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = above ? 'bottom' : 'top';
          ctx.fillText(`+${fmt(stepN)}`, mid, y + dir * (3 + lift) + dir * 2);
        }
        prev = v;
      }
      // landing dots + value labels
      for (const v of landings) {
        const X = xOf(v);
        ctx.beginPath();
        ctx.arc(X, y, 4.6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (labelLandings) {
          ctx.fillStyle = color;
          ctx.font = `700 12px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = above ? 'bottom' : 'top';
          ctx.fillText(fmt(v), X, y + dir * (arcCap + 9));
        }
      }
      return landings;
    };

    /* ---- draw the runs ---- */
    if (!two) {
      // single counter: label every landing (the teaching focus is "these are the multiples of n")
      drawRun(N, true, CURVE, CURVE_SOFT, true, S.k);
    } else {
      // two counters: n above (carmine), m below (blue). Keep per-dot value labels off to reduce
      // clutter — the gold COMMON multiples carry the labels instead.
      const jN = Math.floor(HI / N);
      const jM = Math.floor(HI / M);
      drawRun(N, true, CURVE, CURVE_SOFT, false, jN);
      drawRun(M, false, BLUE, BLUE_SOFT, false, jM);

      // gold rings + labels on the common multiples; flag the first one as the LCM
      const commons = commonMultiplesUpTo(N, M, HI);
      commons.forEach((c, i) => {
        const X = xOf(c);
        ctx.beginPath();
        ctx.arc(X, yBase, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = PAPER;
        ctx.fill();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.font = `700 12px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(fmt(c), X, yBase + 20);
        if (i === 0 && !S.calib) {
          ctx.font = `700 11px ${MONO}`;
          ctx.fillText('LCM', X, yBase + 34);
        }
      });
    }

    /* ---- calibration: grey target flag on the line ---- */
    if (S.calib && S.target) {
      const tx = xOf(S.target);
      ctx.strokeStyle = 'rgba(28,43,58,0.55)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(tx, 18);
      ctx.lineTo(tx, H - 30);
      ctx.stroke();
      ctx.setLineDash([]);
      // little flag
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.moveTo(tx, 18);
      ctx.lineTo(tx + 30, 24);
      ctx.lineTo(tx, 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 10px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('target', tx + 4, 24);
      ctx.fillStyle = INK;
      ctx.font = `700 12px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`LCM = ${fmt(S.target)}`, tx, 33);
    }

    /* ---- "→ forever" caption on the infinity step ---- */
    if (showInfinity) {
      ctx.fillStyle = CURVE;
      ctx.font = `italic 600 12px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('· · · forever →', lineX1 + 18, yBase - 8);
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [n, k, m, step, target, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* entering the common-multiples step: seed a clean n = 4, m = 6 example (once) */
  useEffect(() => {
    if (step === 5 && !seededRef.current) {
      seededRef.current = true;
      setN(4);
      setM(6);
      setK(4);
    }
  }, [step]);

  /* entering the calibration step: hand out a fresh target and reset the counters */
  useEffect(() => {
    if (current.calib && !target) {
      const t = makeTarget(null);
      setTarget(t);
      setN(2);
      setM(3); // start un-matched (LCM 6 ≠ any target)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'n') setN(v);
    else if (key === 'k') setK(v);
    else setM(v);
  };

  const resetDials = () => {
    setN(step >= 5 ? 4 : START.n);
    setK(START.k);
    setM(step >= 5 ? 6 : START.m);
  };

  const newTarget = () => {
    const t = makeTarget(target);
    setTarget(t);
    setN(2);
    setM(3);
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

  const values = { n, k, m };

  /* ---- header readout (the symbolic ↔ picture link) ---------------------- */
  let equation, verdict, headClass;
  if (calib && target) {
    equation = `LCM(${fmt(n)}, ${fmt(m)}) = ${fmt(L)}`;
    verdict = calibrated
      ? `both rhythms first meet on ${fmt(target)} — you built the target LCM`
      : `make the two counters first meet exactly on ${fmt(target)}`;
    headClass = calibrated ? 'gold' : 'muted';
  } else if (twoCounters) {
    equation = `LCM(${fmt(n)}, ${fmt(m)}) = ${fmt(L)}`;
    verdict = `${fmt(L)} is the smallest number that is a multiple of both ${fmt(n)} and ${fmt(m)}`;
    headClass = 'gold';
  } else {
    equation = multiplesText(n, Math.min(k, 6));
    verdict = `count by ${fmt(n)} → the multiples of ${fmt(n)} (they never stop)`;
    headClass = 'curve';
  }

  // the multiple/factor duality readout, built from the current dials
  const dualityValue = kthMultiple;

  const commonsList = twoCounters ? commonMultiplesUpTo(n, m, Math.max(hi, L * 3)).slice(0, 4) : [];
  const solvedPairs = calib && target ? lcmPairs(target) : [];
  const otherPairs = solvedPairs.filter(([a, b]) => !((a === Math.min(n, m)) && (b === Math.max(n, m))));

  const spoken = calib && target
    ? `Build the target least common multiple ${fmt(target)}. Counter n is ${fmt(n)}, counter m is ${fmt(m)}, and their least common multiple is ${fmt(L)}. ${calibrated ? 'Calibrated — the target is built.' : 'Not yet on target.'}`
    : twoCounters
    ? `Counting by ${fmt(n)} and by ${fmt(m)}. Their common multiples are ${commonsList.join(', ')}, and the least common multiple is ${fmt(L)}.`
    : `Counting by ${fmt(n)}. The first ${fmt(k)} multiples of ${fmt(n)} are ${multiplesOf(n, k).join(', ')}. Multiples of ${fmt(n)} go on forever.`;

  return (
    <div className="mlab">
      <header className="head">
        <h1>Multiples</h1>
        <p className="lede">
          A <em>multiple</em> is what you land on when you <em>skip-count</em>: 3, 6, 9, 12, … —
          and they go on <em>forever</em>. Two counters reveal the <em>least common multiple</em>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className={'equation ' + headClass}>{equation}</p>
            <p className={'verdict ' + headClass}>{verdict}</p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {step < 1 ? 'the counter unlocks soon' : twoCounters ? 'slide n and m — watch where they meet' : 'slide n and k — count by n'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw curve" /> multiples of n
            </span>
            {twoCounters && (
              <span className="lg">
                <span className="sw blue" /> multiples of m
              </span>
            )}
            {twoCounters && (
              <span className="lg">
                <span className="ring gold" /> common multiple
              </span>
            )}
            {!twoCounters && (
              <span className="lg">
                <span className="arrow">→</span> goes on forever
              </span>
            )}
          </div>

          {/* facts panel — adapts to single vs. two-counter mode */}
          {!twoCounters ? (
            <div className="facts">
              <div className="fact">
                <span className="fact-k">Multiples of {fmt(n)}</span>
                <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                  {multiplesText(n, Math.min(k, 8))}
                </span>
              </div>
              <div className="fact">
                <span className="fact-k">The {fmt(k)}
                  {ordinalSuffix(k)} multiple</span>
                <span className="fact-v mono">
                  {fmt(n)} {TIMES} {fmt(k)} = <b style={{ color: CURVE }}>{fmt(kthMultiple)}</b>
                </span>
              </div>
              <div className="fact">
                <span className="fact-k">How many multiples</span>
                <span className="fact-v mono">infinitely many (∞)</span>
              </div>
              <div className="fact">
                <span className="fact-k">Multiple ⇔ factor</span>
                <span className="fact-v mono">
                  {fmt(dualityValue)} ÷ {fmt(n)} = {fmt(dualityValue / n)} r0 → {fmt(n)} is a factor of {fmt(dualityValue)}
                </span>
              </div>
            </div>
          ) : (
            <div className="facts">
              <div className="fact">
                <span className="fact-k">Multiples of {fmt(n)}</span>
                <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                  {multiplesText(n, 5)}
                </span>
              </div>
              <div className="fact">
                <span className="fact-k">Multiples of {fmt(m)}</span>
                <span className="fact-v mono" style={{ color: BLUE, fontWeight: 700 }}>
                  {multiplesText(m, 5)}
                </span>
              </div>
              <div className="fact">
                <span className="fact-k">Common multiples</span>
                <span className="fact-v mono" style={{ color: GOLD, fontWeight: 700 }}>
                  {commonsList.length ? commonsList.join(', ') + ', …' : '—'}
                </span>
              </div>
              <div className="fact">
                <span className="fact-k">Least common multiple</span>
                <span className="fact-v mono">
                  LCM = {fmt(n)}·{fmt(m)} ÷ GCF{' '}= {fmt(n * m)} ÷ {fmt(gcfNM)} ={' '}
                  <b style={{ color: GOLD }}>{fmt(L)}</b>
                </span>
              </div>
            </div>
          )}

          <div className="toolbar">
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

          <div className="dials">
            {PARAMS.map((dparam) => {
              const unlocked = step >= dparam.unlock;
              const val = values[dparam.key];
              const disabled = !unlocked || (calib && dparam.key === 'k'); // k is inert during calibration
              return (
                <label
                  className={'dial' + (disabled ? ' locked' : '') + (dparam.star ? ' star' : '') + (dparam.key === 'm' ? ' second' : '')}
                  key={dparam.key}
                >
                  <span className="dk">{dparam.label}</span>
                  <span className="drole">{unlocked ? dparam.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dparam.min}
                    max={dparam.max}
                    step={dparam.step}
                    value={val}
                    disabled={disabled}
                    aria-label={`Dial ${dparam.label} — ${dparam.role}`}
                    onChange={(e) => onParam(dparam.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? fmt(val) : '🔒'}</output>
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

          {current.calib && target && (
            <div className="calib">
              <p className="calib-lead mono">
                Target: <strong>LCM = {fmt(target)}</strong> · make the counters first meet here
              </p>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  LCM({fmt(n)},{fmt(m)}) = {fmt(L)} · {pct.toFixed(0)}%
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {L < target ? 'too small — grow a counter' : L > target ? 'overshot — shrink a counter' : 'a factor off'}
                  </span>
                )}
              </div>
              {calibrated && otherPairs.length > 0 && (
                <p className="calib-note mono">
                  Other counters with LCM {fmt(target)}:{' '}
                  {otherPairs.slice(0, 6).map(([a, b], i) => (
                    <span key={a + '-' + b}>
                      {i > 0 ? ' · ' : ''}
                      {fmt(a)} &amp; {fmt(b)}
                    </span>
                  ))}
                </p>
              )}
              <button type="button" className="btn ghost" onClick={newTarget}>
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
                  seededRef.current = false;
                  setN(START.n);
                  setK(START.k);
                  setM(START.m);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">
          multiple of n = n {TIMES} (a whole number)
        </span>{' '}
        &nbsp;·&nbsp; skip-count by n to list its multiples; they are infinite; “m is a multiple of n” ⇔
        “n is a factor of m”; the LCM is the first common multiple. CCSS&nbsp;4.OA.B.4, 6.NS.B.4.
      </footer>

      <style jsx>{`
        .mlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
          --gold: #c98a1e;
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
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .equation.curve {
          color: var(--curve);
        }
        .equation.gold {
          color: var(--gold);
        }
        .equation.muted {
          color: var(--ink-soft);
        }
        .verdict {
          font-size: 13px;
          margin: 0;
          font-weight: 600;
          max-width: 46ch;
          text-align: right;
        }
        .verdict.curve {
          color: var(--ink-soft);
        }
        .verdict.gold {
          color: var(--gold);
        }
        .verdict.muted {
          color: var(--ink-soft);
        }
        .stage {
          position: relative;
          width: min(100%, 680px);
          aspect-ratio: 16 / 9;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 3;
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
          background: rgba(251, 251, 248, 0.8);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
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
          width: 15px;
          height: 15px;
          border-radius: 50%;
          display: inline-block;
          box-sizing: border-box;
        }
        .sw.curve {
          background: var(--curve);
        }
        .sw.blue {
          background: var(--blue);
        }
        .ring {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          display: inline-block;
          box-sizing: border-box;
          background: var(--paper);
        }
        .ring.gold {
          border: 2.4px solid var(--gold);
        }
        .arrow {
          color: var(--curve);
          font-weight: 700;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 12px 4px 4px;
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
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 60px;
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
        .dial.star .dk {
          color: var(--curve);
        }
        .dial.second .dk {
          color: var(--blue);
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          accent-color: var(--ink-soft);
          cursor: pointer;
        }
        .dial.star input[type='range'] {
          accent-color: var(--curve);
        }
        .dial.second input[type='range'] {
          accent-color: var(--blue);
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
        .calib-lead {
          font-size: 13px;
          margin: 0;
          color: var(--ink-soft);
        }
        .calib-lead strong {
          color: var(--gold);
          font-size: 16px;
        }
        .calib-note {
          font-size: 12.5px;
          margin: 0;
          color: var(--ink);
          background: rgba(201, 138, 30, 0.08);
          border-left: 3px solid var(--gold);
          padding: 8px 10px;
          border-radius: 0 6px 6px 0;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(201, 138, 30, 0.5), var(--gold));
          transition: width 0.14s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          gap: 8px;
          flex-wrap: wrap;
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
        :global(.mlab) :focus-visible {
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

/* small helper: ordinal suffix for "the k-th multiple" readout (1st, 2nd, 3rd, …) */
function ordinalSuffix(k) {
  const t = k % 100;
  if (t >= 11 && t <= 13) return 'th';
  switch (k % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}
