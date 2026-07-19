'use client';

/* ============================================================================
   FactorLab — an interactive "bench" for one of the foundations of number
   sense: the FACTOR. A factor of a whole number divides it evenly, with no
   remainder.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter and a CALIBRATED stamp.

   THE SIGNATURE CENTERPIECE is THE RECTANGLE ARRAY. A number N is drawn as N
   unit squares. Slide the width d and the squares wrap into d columns:
       • when d divides N evenly, the squares fill a PERFECT rectangle
         (d × N/d = N) — d is a FACTOR, shown all in carmine;
       • when d does not divide N, the last row is RAGGED — those leftover
         squares are the REMAINDER, and d is NOT a factor.
   That single picture makes "factor = divides with no remainder" visible, and
   it makes a factor PAIR obvious: the rectangle d × (N/d) is the same N squares
   whether you read it tall or wide. Below the array, a factor track shows every
   factor of N and links each pair with an arc that meets at √N.

   DELIBERATELY DISTINCT from its siblings:
     • MultiplicationLab / MultiDigitMultiplicationLab build ONE product a × b
       from GIVEN factors (composition). FactorLab runs the other way: it
       DECOMPOSES a given N into ALL of its factor pairs and its primes.
     • DivisionLab computes ONE quotient N ÷ d = q. FactorLab is about the whole
       SET of divisors that leave remainder 0, and the prime/composite verdict.
     • QuadraticPolynomialLab / PolynomialLab factor POLYNOMIALS (algebra).
       FactorLab factors WHOLE NUMBERS (number theory) — a different object.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FactorLab.jsx
     2. Import and render it:
          import FactorLab from './FactorLab';
          export default function Page() { return <FactorLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (N, d, lesson step).
     MODEL  — factorsOf / primeFactors / … are pure math; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // the ONE accent = a FACTOR (and everything made of factors)
const CURVE_SOFT = 'rgba(200,30,79,0.14)';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const QUAD = '#c7d8e4'; // calm scaffolding blue — the "not (yet) a factor" state
const BLUE = '#3f74a6';
const MINUS = '−';
const TIMES = '×';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Two dials, unlocking one per lesson step:
     N — the number we are factoring (the star). 1..36 keeps every array legible
         and still spans rich composites (12, 18, 24, 30, 36), perfect squares
         (1, 4, 9, 16, 25, 36) and primes (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31).
     d — the test width / divisor. Slide it to probe: does d tile N into a
         perfect rectangle (a factor) or leave a remainder (not a factor)?
   ------------------------------------------------------------------------- */
const N_MIN = 1;
const N_MAX = 36;
// The width d is the probe (unlocks first, at step index 1, so the whole first
// half is spent sliding d over a fixed, factor-rich N = 12). The star N unlocks
// at step index 3 ("Find every factor"), where varying the number becomes the point.
const PARAMS = [
  { key: 'n', label: 'N', min: N_MIN, max: N_MAX, step: 1, unlock: 3, star: true, role: 'the number we factor' },
  { key: 'd', label: 'd', min: 1, max: N_MAX, step: 1, unlock: 1, role: 'test width · a candidate divisor' },
];
const START = { n: 12, d: 3 }; // opens on 3 × 4 = 12 — a factor, a clean rectangle

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels. All exact integer arithmetic.
   ------------------------------------------------------------------------- */
function factorsOf(n) {
  const f = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) f.push(d);
  return f;
}
function isFactor(n, d) {
  return d >= 1 && n % d === 0;
}
// prime factors WITH multiplicity, e.g. 12 -> [2, 2, 3]
function primeFactors(n) {
  const out = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    while (m % p === 0) {
      out.push(p);
      m /= p;
    }
  }
  if (m > 1) out.push(m);
  return out;
}
function isPrime(n) {
  return n > 1 && factorsOf(n).length === 2;
}
function isComposite(n) {
  return n > 1 && factorsOf(n).length > 2;
}
// exponent form, e.g. 12 -> [[2,2],[3,1]]
function expForm(n) {
  const pf = primeFactors(n);
  const map = new Map();
  for (const p of pf) map.set(p, (map.get(p) || 0) + 1);
  return [...map.entries()];
}
// factor pairs (unordered), e.g. 12 -> [[1,12],[2,6],[3,4]]
function factorPairs(n) {
  const pairs = [];
  for (let d = 1; d * d <= n; d++) if (n % d === 0) pairs.push([d, n / d]);
  return pairs;
}
function isPerfectSquare(n) {
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}
function smallestPrimeFactor(m) {
  for (let p = 2; p * p <= m; p++) if (m % p === 0) return p;
  return m; // m is prime (or 1)
}
// the "caterpillar" factor tree: repeatedly split off the smallest prime.
// 12 -> [{node:12,leaf:2,rest:6},{node:6,leaf:2,rest:3},{node:3,last:true}]
function treeData(n) {
  if (n < 2) return [];
  const steps = [];
  let m = n;
  while (true) {
    const p = smallestPrimeFactor(m);
    if (p === m) {
      steps.push({ node: m, last: true });
      break;
    }
    steps.push({ node: m, leaf: p, rest: m / p, last: false });
    m /= p;
  }
  return steps;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
// plain product of primes, e.g. "2 × 2 × 3"
function primeProduct(n) {
  const pf = primeFactors(n);
  return pf.length ? pf.join(` ${TIMES} `) : `${n}`;
}
// the division sentence when d does NOT divide N: "12 = 5 × 2 + 2"
function remainderSentence(n, d) {
  const q = Math.floor(n / d);
  const r = n % d;
  return `${n} = ${d} ${TIMES} ${q} + ${r}`;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration ("factor the mystery number"). A target composite T is
   revealed with a row of empty slots — one per factor. Sweeping the width d
   past each divisor lights up that factor (and its partner T/d), filling the
   slots. Because a slot is filled ONLY when d divides T exactly, the found set
   is always a subset of T's true factors, so CALIBRATED (all slots filled)
   happens if and only if every factor has genuinely been found — there is never
   a false stamp. Targets are curated composites with a satisfying factor count.
   ------------------------------------------------------------------------- */
const CALIB_TARGETS = [12, 16, 18, 20, 24, 28, 30, 36];
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
   student misconceptions (a factor "is any smaller number," 5 is "close" to 12,
   stopping a factorization at composite factors like 2 × 9). Next is gated on
   ANSWERED, not CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the factors',
    body:
      'Every whole number can be laid out as a rectangle of unit squares. Here N = 12 squares. ' +
      'A FACTOR is a width that packs the squares into a PERFECT rectangle — no square left over. ' +
      'Right now the width is 3, and the 12 squares fill a tidy 3 × 4 rectangle, so 3 is a factor of 12.',
    q: 'Which of these is a factor of 12?',
    choices: [
      '3 — because 3 × 4 = 12 exactly',
      '5 — because 5 is smaller than 12',
      '7 — because 7 + 5 = 12',
    ],
    answer: 0,
    feedback:
      'A factor divides the number evenly, leaving no remainder. 12 ÷ 3 = 4 with nothing left over, so ' +
      '3 is a factor. Being smaller than 12 is not enough (12 ÷ 5 leaves a remainder of 2), and adding ' +
      'to 12 has nothing to do with factoring.',
  },
  {
    title: 'Test a width',
    body:
      'The d dial is live — d is the width of the rectangle. Slide it and watch the last row. When the ' +
      'squares fill a complete rectangle with no ragged row, d is a factor. When the last row comes up ' +
      'short, those leftover squares are the REMAINDER, and d is not a factor.',
    q: 'Set the width to d = 5. Is 5 a factor of 12?',
    choices: [
      'No — 12 = 5 × 2 + 2, a remainder of 2 is left over',
      'Yes — 5 is close to 12',
      'Yes — every number smaller than 12 is a factor',
    ],
    answer: 0,
    feedback:
      'At d = 5 the squares fill two full rows of five (that is 10) and then two squares dangle in a ' +
      'ragged third row — a remainder of 2. A leftover means 5 does NOT divide 12 evenly, so 5 is not a ' +
      'factor. Only widths that leave a remainder of 0 are factors.',
  },
  {
    title: 'Factors come in pairs',
    body:
      'Whenever d is a factor of N, its partner N ÷ d is a factor too, because d × (N ÷ d) = N. The ' +
      'rectangle read the tall way and read the wide way is the SAME N squares — the same area — just ' +
      'turned. So factors always come in pairs. Try d = 2 and d = 6 on N = 12 and watch the arc link them.',
    q: 'We know 12 = 3 × 4. Which of these is ALSO a factor pair of 12?',
    choices: ['2 × 6', '5 × 7', '3 × 5'],
    answer: 0,
    feedback:
      '2 × 6 = 12, so 2 and 6 are a factor pair. 5 × 7 = 35 and 3 × 5 = 15 — neither makes 12, so those ' +
      'are not factor pairs of 12. Each factor you find hands you its partner for free: find 2, and 6 ' +
      'comes with it.',
  },
  {
    title: 'Find every factor',
    body:
      'The N dial unlocks — now you can pick any number. To list ALL of a number’s factors, test each ' +
      'width from 1 upward. You only have to check up to √N: every factor at or below √N pairs with one ' +
      'above it, so they arrive two at a time. The factor track below the array fills in as you sweep d, ' +
      'and the pairs meet at √N.',
    q: 'How many factors does 12 have in all?',
    choices: [
      'Six — 1, 2, 3, 4, 6, and 12',
      'Four — 2, 3, 4, and 6',
      'Two — just 1 and 12',
    ],
    answer: 0,
    feedback:
      'The full list is 1, 2, 3, 4, 6, 12 — six factors. Do not forget the pair 1 and N: every number has ' +
      '1 and itself as factors. A number with more than those two, like 12, is called composite.',
  },
  {
    title: 'Prime or composite',
    body:
      'A PRIME number has exactly two factors, 1 and itself, so its only rectangle is a single 1 × N ' +
      'strip — it can never be packed into a fuller block. A COMPOSITE number has more than two factors. ' +
      '(The number 1 is special: it has just one factor, so it is neither prime nor composite.)',
    q: 'Which of these numbers is prime?',
    choices: [
      '17 — its only factors are 1 and 17',
      '15 — because 3 × 5 = 15',
      '21 — because 3 × 7 = 21',
    ],
    answer: 0,
    feedback:
      '17 is prime: no width from 2 to 16 divides it evenly, so its only factors are 1 and 17 and its only ' +
      'rectangle is a 1 × 17 strip. 15 = 3 × 5 and 21 = 3 × 7, so both have extra factors — they are ' +
      'composite. Set the dial to a prime and watch the array refuse to be anything but a strip.',
  },
  {
    title: 'Break it into primes',
    body:
      'Primes are the atoms of multiplication. Every composite number breaks down into a product of ' +
      'primes, and — remarkably — into exactly ONE such product (the Fundamental Theorem of Arithmetic). ' +
      'The tree splits N by its smallest prime again and again until only primes remain: 12 = 2 × 2 × 3 = 2² × 3.',
    q: 'What is the prime factorization of 18?',
    choices: ['2 × 3 × 3', '2 × 9', '3 × 6'],
    answer: 0,
    feedback:
      '18 = 2 × 3 × 3 = 2 × 3². The other answers stop too early: 9 and 6 are still composite (9 = 3 × 3, ' +
      '6 = 2 × 3), so they are not prime factorizations. Keep splitting until every factor on the branch ' +
      'tips is prime.',
  },
  {
    title: 'Factor the mystery number',
    body:
      'Final challenge. A mystery number is shown with one empty slot for each of its factors. Sweep the ' +
      'width d across every divisor — each time d lands on a factor, that factor and its partner light up ' +
      'and fill their slots. Click the factor track to jump the width. Fill every slot to reach CALIBRATED, ' +
      'then press New number.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FactorLab() {
  const [n, setN] = useState(START.n);
  const [d, setD] = useState(START.d);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [found, setFound] = useState([]); // factors discovered during calibration

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  // during calibration N is pinned to the target; the width may run up to it
  const activeN = calib && target ? target : n;
  const dMax = calib && target ? target : n;
  const dClamped = Math.min(d, dMax);

  // derived facts (single source of truth = state; recomputed for the readouts)
  const facts = factorsOf(activeN);
  const full = isFactor(activeN, dClamped);
  const partner = full ? activeN / dClamped : null;
  const rem = activeN % dClamped;
  const quotient = Math.floor(activeN / dClamped);

  // calibration progress
  const totalFactors = target ? factorsOf(target).length : 0;
  const calibrated = target ? found.length === totalFactors : false;
  const pct = target ? (found.length / totalFactors) * 100 : 0;

  // Single source of truth snapshot for the renderer & pointer handler.
  sceneRef.current = {
    ...sceneRef.current,
    n: activeN,
    d: dClamped,
    calib,
    target,
    found,
    step,
  };

  /* ---- full redraw of the array + factor track from state ---------------- */
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
    const N = S.n;
    const D = Math.max(1, Math.min(S.d, N));
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
    const cols = D;
    const rows = Math.ceil(N / D);
    const remr = N % D;
    const isFull = remr === 0;
    const foundSet = new Set(S.found || []);

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

    /* ---------- THE ARRAY (upper region) ---------- */
    const aTop = 26; // headroom for the "width = d" label above the grid
    const aBottom = H * 0.62;
    const aH = aBottom - aTop;
    const aW = W - 40;
    const cell = Math.max(6, Math.min(aW / cols, aH / rows));
    const gridW = cell * cols;
    const gridH = cell * rows;
    const ox = (W - gridW) / 2;
    const oy = aTop + (aH - gridH) / 2;

    // the N unit squares, wrapped into `cols` columns
    for (let i = 0; i < N; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = ox + c * cell;
      const y = oy + r * cell;
      const inRemainder = !isFull && r === rows - 1; // ragged last row = the remainder
      ctx.beginPath();
      ctx.rect(x + 1, y + 1, cell - 2, cell - 2);
      if (isFull) {
        ctx.fillStyle = CURVE_SOFT; // a factor: the whole rectangle glows carmine
        ctx.fill();
        ctx.strokeStyle = CURVE;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else if (inRemainder) {
        ctx.fillStyle = 'rgba(251,251,248,0.9)'; // leftover squares: hollow, dashed
        ctx.fill();
        ctx.setLineDash([3, 2]);
        ctx.strokeStyle = INK_SOFT;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = 'rgba(199,216,228,0.55)'; // complete rows, but not a factor: calm blue
        ctx.fill();
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // dimension labels: width d across the top, height (rows) down the left
    ctx.fillStyle = isFull ? CURVE : INK_SOFT;
    ctx.font = `600 13px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`width = ${fmt(cols)}`, ox + gridW / 2, oy - 5);
    // (draw the width bracket)
    ctx.strokeStyle = isFull ? CURVE : INK_SOFT;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(ox, oy - 3);
    ctx.lineTo(ox + gridW, oy - 3);
    ctx.stroke();

    if (isFull) {
      // height label = N / d, only meaningful when it's a clean rectangle
      ctx.save();
      ctx.translate(ox - 8, oy + gridH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = CURVE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`tall = ${fmt(rows)}`, 0, 0);
      ctx.restore();
    } else {
      // annotate the remainder squares
      const rr = rows - 1;
      const ry = oy + rr * cell + cell / 2;
      const rx = ox + gridW + 10;
      ctx.fillStyle = INK_SOFT;
      ctx.font = `600 12px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      if (rx < W - 4) ctx.fillText(`remainder ${fmt(remr)}`, Math.min(rx, W - 90), ry);
    }

    /* ---------- THE FACTOR TRACK (lower region) ---------- */
    const trackY = H * 0.82;
    const tPadL = 26;
    const tPadR = 26;
    const trackW = W - tPadL - tPadR;
    const tx = (k) => (N <= 1 ? W / 2 : tPadL + ((k - 1) / (N - 1)) * trackW);

    // baseline
    ctx.strokeStyle = 'rgba(28,43,58,0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tPadL - 6, trackY);
    ctx.lineTo(W - tPadR + 6, trackY);
    ctx.stroke();

    // √N marker (dashed) — the fold line where factor pairs meet
    if (N >= 2) {
      const sx = tx(Math.sqrt(N));
      ctx.strokeStyle = 'rgba(63,116,166,0.7)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, trackY - 34);
      ctx.lineTo(sx, trackY + 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = BLUE;
      ctx.font = `11px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('√N', sx, trackY + 13);
    }

    // pairing arc for the current width, when it is a factor
    const showPair = isFull && !S.calib; // in calibration the arcs would spoil the hunt
    if (showPair && N >= 2) {
      const a = tx(D);
      const b = tx(N / D);
      const mid = (a + b) / 2;
      const lift = 20 + Math.min(26, Math.abs(b - a) * 0.18);
      ctx.strokeStyle = CURVE;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(a, trackY - 6);
      ctx.quadraticCurveTo(mid, trackY - 6 - lift, b, trackY - 6);
      ctx.stroke();
    }

    // ticks + factor dots
    ctx.font = `10px ${MONO}`;
    for (let k = 1; k <= N; k++) {
      const X = tx(k);
      const fac = isFactor(N, k);
      const isCur = k === D;
      const collected = S.calib ? foundSet.has(k) : true;
      if (fac) {
        // a factor: filled dot (carmine when revealed, hollow slot until found in calib)
        ctx.beginPath();
        ctx.arc(X, trackY, isCur ? 5.5 : 4.2, 0, Math.PI * 2);
        if (S.calib && !collected) {
          ctx.fillStyle = PAPER;
          ctx.fill();
          ctx.strokeStyle = INK_SOFT;
          ctx.setLineDash([2, 2]);
          ctx.lineWidth = 1.3;
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = CURVE;
          ctx.fill();
        }
        // label the factor value
        ctx.fillStyle = S.calib && !collected ? 'rgba(91,107,123,0.7)' : CURVE;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = `${isCur ? '700' : '600'} 11px ${MONO}`;
        if (!S.calib || collected) ctx.fillText(fmt(k), X, trackY - 8);
      } else {
        // not a factor: a faint tick
        ctx.strokeStyle = 'rgba(28,43,58,0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(X, trackY - 3);
        ctx.lineTo(X, trackY + 3);
        ctx.stroke();
      }
      // the current-width caret under the track
      if (isCur) {
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.moveTo(X, trackY + 8);
        ctx.lineTo(X - 4, trackY + 15);
        ctx.lineTo(X + 4, trackY + 15);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [n, d, step, target, found, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* keep the width dial inside 1..N when N shrinks (outside calibration) */
  useEffect(() => {
    if (!calib && d > n) setD(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  /* entering the calibration step: hand out a fresh mystery number */
  useEffect(() => {
    if (current.calib && !target) {
      const t = makeTarget(null);
      setTarget(t);
      setFound([]);
      setD(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* collect factors as the width sweeps past them (calibration only) */
  useEffect(() => {
    if (!calib || !target) return;
    if (isFactor(target, dClamped)) {
      const partnerD = target / dClamped;
      setFound((prev) => {
        const s = new Set(prev);
        s.add(dClamped);
        s.add(partnerD);
        return [...s].sort((a, b) => a - b);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dClamped, calib, target]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'n') setN(v);
    else setD(v);
  };

  // click the factor track to jump the width to the nearest whole number
  const onStagePointerDown = (e) => {
    if (step < 1) return; // the width isn't live until it unlocks
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    if (cssY < rect.height * 0.66) return; // only the lower track region is clickable
    const N = activeN;
    const tPadL = 26;
    const tPadR = 26;
    const trackW = rect.width - tPadL - tPadR;
    const k = N <= 1 ? 1 : Math.round(1 + ((cssX - tPadL) / trackW) * (N - 1));
    setD(Math.max(1, Math.min(dMax, k)));
  };

  const resetDials = () => {
    setN(START.n);
    setD(START.d);
  };

  const newTarget = () => {
    const t = makeTarget(target);
    setTarget(t);
    setFound([]);
    setD(1);
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

  const values = { n: calib && target ? target : n, d: dClamped };
  const dLocked = step < 2;

  // verdict readout for the header
  let verdict, verdictClass, equation;
  if (full) {
    equation = `${fmt(dClamped)} ${TIMES} ${fmt(partner)} = ${fmt(activeN)}`;
    verdict = `${fmt(dClamped)} is a factor of ${fmt(activeN)}`;
    verdictClass = 'yes';
  } else {
    equation = remainderSentence(activeN, dClamped);
    verdict = `${fmt(dClamped)} is not a factor of ${fmt(activeN)} — remainder ${fmt(rem)}`;
    verdictClass = 'no';
  }

  const kind = activeN === 1 ? 'unit' : isPrime(activeN) ? 'prime' : 'composite';
  const tree = treeData(activeN);
  const primes = expForm(activeN);

  const spoken =
    `N is ${fmt(activeN)}. With width ${fmt(dClamped)}, ` +
    (full
      ? `the ${fmt(activeN)} squares fill a perfect ${fmt(dClamped)} by ${fmt(partner)} rectangle, so ${fmt(
          dClamped
        )} is a factor.`
      : `the last row is short by ${fmt(dClamped - rem)}, leaving a remainder of ${fmt(rem)}, so ${fmt(
          dClamped
        )} is not a factor.`) +
    ` The factors of ${fmt(activeN)} are ${facts.join(', ')}. ${fmt(activeN)} is ${kind}.` +
    (calib && calibrated ? ' Calibrated — every factor found.' : '');

  return (
    <div className="flab">
      <header className="head">
        <h1>Factors</h1>
        <p className="lede">
          A <em>factor</em> of a whole number divides it evenly — with no remainder. Lay the number out
          as a rectangle of unit squares and slide the <em>width</em>: when the squares pack into a{' '}
          <em>perfect rectangle</em> the width is a factor; when the last row is ragged, that leftover is
          the <em>remainder</em>. Discover factor pairs, tell primes from composites, and break a number
          into its prime <em>atoms</em>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className={'equation ' + verdictClass}>{equation}</p>
            <p className={'verdict ' + verdictClass}>
              {full ? '✓ ' : '✕ '}
              {verdict}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onStagePointerDown}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {step < 1 ? 'the width unlocks soon' : 'drag d, or click the factor track'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw factor" /> factor rectangle
            </span>
            <span className="lg">
              <span className="sw nonfactor" /> not a factor
            </span>
            <span className="lg">
              <span className="sw remainder" /> remainder
            </span>
            <span className="lg">
              <span className="dot" /> factor of N
            </span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Factors of {fmt(activeN)}</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                {facts.join(', ')}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">How many factors</span>
              <span className="fact-v mono">
                {facts.length}
                {isPerfectSquare(activeN) && activeN > 1 ? ' · odd (perfect square)' : ''}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Prime or composite</span>
              <span
                className="fact-v mono"
                style={{ color: kind === 'prime' ? CURVE : kind === 'composite' ? BLUE : INK_SOFT }}
              >
                {kind === 'unit' ? '1 — neither (a unit)' : kind}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Prime factorization</span>
              <span className="fact-v mono">
                {activeN < 2 ? (
                  '—'
                ) : (
                  <>
                    {primes.map(([p, e], i) => (
                      <span key={p} style={{ color: CURVE, fontWeight: 700 }}>
                        {i > 0 ? ' × ' : ''}
                        {p}
                        {e > 1 ? <sup>{e}</sup> : null}
                      </span>
                    ))}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* the prime factor tree — the "atoms" made visual */}
          {activeN >= 2 && (
            <div className="tree-wrap">
              <p className="tree-cap mono">
                {isPrime(activeN)
                  ? `${fmt(activeN)} is prime — it is its own only prime factor`
                  : `${fmt(activeN)} = ${primeProduct(activeN)}`}
              </p>
              <FactorTree n={activeN} />
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
              const isN = dparam.key === 'n';
              const val = values[dparam.key];
              const disabled = !unlocked || (isN && calib); // N is pinned during calibration
              const mx = dparam.key === 'd' ? dMax : dparam.max;
              return (
                <label
                  className={'dial' + (disabled ? ' locked' : '') + (dparam.star ? ' star' : '')}
                  key={dparam.key}
                >
                  <span className="dk">{dparam.label}</span>
                  <span className="drole">
                    {isN && calib ? 'the mystery number' : unlocked ? dparam.role : 'unlocks soon'}
                  </span>
                  <input
                    type="range"
                    min={dparam.min}
                    max={mx}
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
                Mystery number: <strong>{fmt(target)}</strong> · find all {totalFactors} factors
              </p>
              <div className="slots" aria-hidden="true">
                {factorsOf(target).map((f) => {
                  const got = found.includes(f);
                  return (
                    <span key={f} className={'slot' + (got ? ' got' : '')}>
                      {got ? fmt(f) : '?'}
                    </span>
                  );
                })}
              </div>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  found&nbsp;{found.length}/{totalFactors}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">sweep d past every divisor</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={newTarget}>
                New number
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
                  setFound([]);
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
        <span className="mono">
          d {TIMES} (N ÷ d) = N
        </span>{' '}
        &nbsp;·&nbsp; a factor divides a whole number with no remainder; factors come in pairs meeting at
        √N; primes are the atoms of every factorization. CCSS&nbsp;4.OA.B.4.
      </footer>

      <style jsx>{`
        .flab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
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
        .equation.yes {
          color: var(--curve);
        }
        .equation.no {
          color: var(--ink-soft);
        }
        .verdict {
          font-size: 13px;
          margin: 0;
          font-weight: 600;
        }
        .verdict.yes {
          color: var(--ok);
        }
        .verdict.no {
          color: var(--ink-soft);
        }
        .stage {
          position: relative;
          width: min(100%, 640px);
          aspect-ratio: 16 / 12;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: crosshair;
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
          border-radius: 3px;
          display: inline-block;
          box-sizing: border-box;
        }
        .sw.factor {
          background: var(--curve-soft, rgba(200, 30, 79, 0.14));
          border: 1.4px solid var(--curve);
        }
        .sw.nonfactor {
          background: rgba(199, 216, 228, 0.55);
          border: 1.2px solid var(--blue);
        }
        .sw.remainder {
          background: #fbfbf8;
          border: 1.4px dashed var(--ink-soft);
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--curve);
          display: inline-block;
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
        .fact-v sup {
          font-size: 0.7em;
        }
        .tree-wrap {
          margin: 10px 4px 2px;
          padding-top: 10px;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .tree-cap {
          font-size: 13px;
          color: var(--ink);
          margin: 0 0 6px;
          text-align: center;
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
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          accent-color: var(--blue);
          cursor: pointer;
        }
        .dial.star input[type='range'] {
          accent-color: var(--curve);
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
          color: var(--curve);
          font-size: 16px;
        }
        .slots {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .slot {
          min-width: 30px;
          text-align: center;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 14px;
          font-weight: 700;
          padding: 5px 6px;
          border-radius: 6px;
          border: 1.4px dashed rgba(28, 43, 58, 0.28);
          color: var(--ink-soft);
          background: var(--paper);
        }
        .slot.got {
          border-style: solid;
          border-color: var(--curve);
          color: var(--curve);
          background: rgba(200, 30, 79, 0.06);
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
          transition: width 0.14s ease-out;
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
        :global(.flab) :focus-visible {
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

/* ============================================================================
   FactorTree — a compact inline-SVG "caterpillar" factor tree. Splits N by its
   smallest prime again and again; each split hangs the prime off to the right
   and continues down the spine until only a prime remains. Primes are carmine
   (the accent = the factor atoms); composite spine nodes are outlined.
   ========================================================================== */
function FactorTree({ n }) {
  const steps = treeData(n);
  if (!steps.length) return null;

  const xS = 34; // spine column
  const xL = 104; // prime-leaf column
  const rowH = 42;
  const top = 22;
  const r = 15;
  const width = 150;
  const height = top + steps.length * rowH + 8;

  const nodeY = (i) => top + i * rowH;

  const edges = [];
  const nodes = [];
  steps.forEach((s, i) => {
    const y = nodeY(i);
    nodes.push({ x: xS, y, v: s.node, prime: !!s.last });
    if (!s.last) {
      const leafY = y + rowH * 0.55;
      nodes.push({ x: xL, y: leafY, v: s.leaf, prime: true });
      edges.push([xS, y, xL, leafY]);
      edges.push([xS, y, xS, nodeY(i + 1)]);
    }
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Factor tree for ${n}`}
    >
      {edges.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(28,43,58,0.4)" strokeWidth="1.4" />
      ))}
      {nodes.map((nd, i) => (
        <g key={i}>
          <circle
            cx={nd.x}
            cy={nd.y}
            r={r}
            fill={nd.prime ? '#c81e4f' : '#fff'}
            stroke={nd.prime ? '#c81e4f' : '#3f74a6'}
            strokeWidth="1.6"
          />
          <text
            x={nd.x}
            y={nd.y + 4}
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fontFamily="ui-monospace, 'SF Mono', Menlo, monospace"
            fill={nd.prime ? '#fff' : '#1c2b3a'}
          >
            {nd.v}
          </text>
        </g>
      ))}
    </svg>
  );
}
