'use client';

/* ============================================================================
   GreatestCommonFactorLab — an interactive "bench" for a keystone of number
   sense: the GREATEST COMMON FACTOR (GCF, also called the GCD). Given two whole
   numbers, the GCF is the LARGEST number that divides BOTH of them evenly.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   ONE carmine accent for the mathematical object (here the SHARED factors and,
   crowned among them, the GCF), dials that unlock one per lesson step,
   predict-then-check questions gated on ANSWERED (not correct), and a
   calibration challenge with a live match meter and a CALIBRATED stamp.

   THE SIGNATURE CENTERPIECE is THE COMMON-FACTOR NUMBER LINE. One shared axis
   1 … max(a,b). The factors of a hang as pins ABOVE the axis; the factors of b
   hang as pins BELOW it. Wherever a number is a factor of BOTH, its column lights
   up carmine — that is a COMMON factor. The RIGHTMOST carmine column wears a
   crown: it is the GREATEST common factor. So "common = in both" and "greatest =
   the biggest of those" become a single, readable picture.

   A second view — THE PRIME-BRICK OVERLAP — teaches the deeper method. Each
   number is shown as a row of prime "bricks" (12 = 2·2·3, 18 = 2·3·3). The
   bricks they SHARE (each prime taken the fewer number of times it appears) are
   pulled into a middle row and multiplied: that product IS the GCF (2·3 = 6).

   DELIBERATELY DISTINCT from its siblings:
     • FactorLab lists ALL factors of ONE number (a rectangle array). This lab is
       about TWO numbers at once and the INTERSECTION of their factor sets.
     • PrimeFactorizationLab breaks ONE number into its prime atoms (a tree). Here
       primes are a means to an end — we OVERLAP two factorizations to find what
       they share.
     • MultiplyLab / DivisionLab build one product or one quotient. The GCF is
       neither: it is the largest divisor two numbers hold in common.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/GreatestCommonFactorLab.jsx
     2. Import and render it:
          import GreatestCommonFactorLab from './GreatestCommonFactorLab';
          export default function Page() { return <GreatestCommonFactorLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, view, lesson step).
     MODEL  — gcd / factorsOf / primeFactors / overlap are pure math; no pixels.
              Every quantity is EXACT integer arithmetic — no floats, no rounding,
              so a K-12 student can trust every number on screen.
     RENDER — the canvas is fully redrawn from a state snapshot on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // the ONE accent = a SHARED factor (and the GCF crowned among them)
const CURVE_SOFT = 'rgba(200,30,79,0.12)';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const QUAD = '#c7d8e4';
const BLUE = '#3f74a6'; // the two numbers' own (non-shared) factors / bricks — calm, never the accent
const GOLD = '#c98a1e'; // the crown only
const MINUS = '−';
const TIMES = '×';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Two dials, unlocking one per lesson step:
     a — the first number.  b — the second number.
   Range 2..48 keeps the shared number line legible (factors are sparse) and the
   prime-brick rows short (at most ~5 bricks), while spanning rich composites
   (12, 18, 24, 30, 36, 48), primes (for coprime cases) and equal/divisor pairs.
   ------------------------------------------------------------------------- */
const N_MIN = 2;
const N_MAX = 48;
const PARAMS = [
  { key: 'a', label: 'a', min: N_MIN, max: N_MAX, step: 1, unlock: 1, role: 'the first number' },
  { key: 'b', label: 'b', min: N_MIN, max: N_MAX, step: 1, unlock: 2, role: 'the second number' },
];
const START = { a: 12, b: 18 }; // common factors 1,2,3,6 — the GCF is 6

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels. All exact integer arithmetic.
   ------------------------------------------------------------------------- */
// Euclid's algorithm — the fast, classic way to a GCF. gcd(a,0)=a.
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return (a / gcd(a, b)) * b; // divide first to keep it exact and avoid overflow
}
function factorsOf(n) {
  const f = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) f.push(d);
  return f;
}
// the factors a and b hold in common — exactly the factors of gcd(a,b).
function commonFactors(a, b) {
  const g = gcd(a, b);
  return factorsOf(g);
}
// prime factors WITH multiplicity, ascending, e.g. 12 -> [2, 2, 3]
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
// exponent form, e.g. 12 -> [[2,2],[3,1]]
function expForm(n) {
  const map = new Map();
  for (const p of primeFactors(n)) map.set(p, (map.get(p) || 0) + 1);
  return [...map.entries()];
}
// The shared primes: each prime taken the FEWER number of times it appears in a
// and b (min of the two exponents). Their product is exactly gcd(a,b).
// 12=2²·3, 18=2·3² -> shared [[2,1],[3,1]] -> product 6.
function sharedPrimes(a, b) {
  const ea = new Map(expForm(a));
  const eb = new Map(expForm(b));
  const out = [];
  for (const [p, e] of ea) {
    const m = Math.min(e, eb.get(p) || 0);
    if (m > 0) out.push([p, m]);
  }
  return out.sort((x, y) => x[0] - y[0]);
}
function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
// "2 × 2 × 3"  (plain product of primes with multiplicity)
function primeProduct(n) {
  const pf = primeFactors(n);
  return pf.length ? pf.join(` ${TIMES} `) : `${n}`;
}
// "2 × 3" for the shared-prime list; "1" when there is no shared prime.
function sharedProduct(a, b) {
  const sp = sharedPrimes(a, b);
  if (!sp.length) return '1';
  const parts = [];
  for (const [p, m] of sp) for (let i = 0; i < m; i++) parts.push(p);
  return parts.join(` ${TIMES} `);
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration ("hit the target GCF"). A target value T is revealed;
   BOTH dials are free. Set a and b so that their greatest common factor is
   EXACTLY T. Many pairs work (12 & 18, 12 & 30, 6 & 42 all have GCF 6), so this
   is a genuine construction task, not a single lookup. The pass is gated on the
   EXACT integer test gcd(a,b) === T — never a float, never a threshold — so the
   CALIBRATED stamp can never appear falsely. The meter is diagnostic, teaching
   the two things a GCF must be: it must divide BOTH, and it must be the GREATEST
   such divisor.
   ------------------------------------------------------------------------- */
const CALIB_TARGETS = [2, 3, 4, 5, 6, 8, 9, 12];
function makeTarget(prev) {
  let t;
  do {
    t = CALIB_TARGETS[Math.floor(Math.random() * CALIB_TARGETS.length)];
  } while (t === prev && CALIB_TARGETS.length > 1);
  return t;
}
// grade the current (a,b) against target T. 100 only on an exact GCF hit.
function calibGrade(a, b, T) {
  const g = gcd(a, b);
  if (g === T) return { pct: 100, done: true, hint: `GCF(${a}, ${b}) = ${T}` };
  const dividesA = a % T === 0;
  const dividesB = b % T === 0;
  if (dividesA && dividesB) {
    // T is a common factor, but not the greatest (g is a bigger multiple of T)
    return {
      pct: 62,
      done: false,
      hint: `${T} divides both, but their GCF is ${g} — bigger than ${T}. Make ${T} the GREATEST.`,
    };
  }
  if (dividesA || dividesB) {
    return {
      pct: 30,
      done: false,
      hint: `${T} divides only ${dividesA ? 'a' : 'b'}. It must divide BOTH numbers.`,
    };
  }
  return { pct: 10, done: false, hint: `${T} divides neither. Pick multiples of ${T}.` };
}
// a couple of OTHER winning pairs to celebrate on success (for the note)
function otherPairs(T, curA, curB, limit = 3) {
  const out = [];
  for (let x = T; x <= N_MAX && out.length < limit; x += T) {
    for (let y = x + T; y <= N_MAX && out.length < limit; y += T) {
      // two DISTINCT numbers (x < y) whose greatest common factor is exactly T
      if (gcd(x, y) === T && !(x === Math.min(curA, curB) && y === Math.max(curA, curB))) {
        out.push(`${x} & ${y}`);
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with its step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions (a common factor that divides only one; stopping at any
   common factor instead of the greatest; multiplying ALL primes — which gives a
   common MULTIPLE, not the greatest common factor). Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A factor they share',
    body:
      'Here are two numbers, a = 12 (its factors hang above the line) and b = 18 (below). ' +
      'A COMMON FACTOR is a number that divides BOTH of them evenly — its column lights up carmine ' +
      'because it appears above AND below. Look for the columns that reach top and bottom.',
    q: 'Which number is a factor of BOTH 12 and 18?',
    choices: [
      '6 — 12 = 6 × 2 and 18 = 6 × 3',
      '4 — 12 = 4 × 3',
      '9 — 18 = 9 × 2',
    ],
    answer: 0,
    feedback:
      '6 divides both (12 ÷ 6 = 2, 18 ÷ 6 = 3), so it is a common factor — a full carmine column. ' +
      '4 divides 12 but not 18 (18 ÷ 4 leaves 2), and 9 divides 18 but not 12, so neither is common. ' +
      'A common factor has to divide BOTH numbers.',
  },
  {
    title: 'Factors of the first number',
    body:
      'The a dial is live. Slide it and watch its pins (above the line) redraw — every factor of a, the ' +
      'widths that divide a with no remainder. The pins that also reach BELOW the line, into b’s factors, ' +
      'are the ones the two numbers share.',
    q: 'The first number is a = 12. Which list gives ALL of its factors?',
    choices: [
      '1, 2, 3, 4, 6, 12',
      '2, 3, 4, 6',
      '1, 12',
    ],
    answer: 0,
    feedback:
      'Every factor of 12 is 1, 2, 3, 4, 6, 12 — six in all. Do not forget 1 and the number itself: ' +
      'both are always factors. Leaving them out (or listing only 1 and 12) misses the ones in the middle.',
  },
  {
    title: 'The common factors',
    body:
      'Now the b dial unlocks too. Both combs are live. A number is a COMMON factor when it is a factor of ' +
      'a AND a factor of b — a pin above and a pin below at the same spot. Those carmine columns are the ' +
      'overlap of the two factor lists.',
    q: '12’s factors are 1, 2, 3, 4, 6, 12 and 18’s are 1, 2, 3, 6, 9, 18. Which factors do they SHARE?',
    choices: [
      '1, 2, 3, 6',
      '3, 6',
      '1, 2, 3, 4, 6',
    ],
    answer: 0,
    feedback:
      'The common factors are the numbers in BOTH lists: 1, 2, 3, and 6. 4 belongs only to 12 and 9 only ' +
      'to 18, so they are not shared. (Every pair shares 1, so the list of common factors is never empty.)',
  },
  {
    title: 'The GREATEST of them',
    body:
      'Among all the carmine columns, the RIGHTMOST one — the biggest — wears a crown. That is the ' +
      'GREATEST COMMON FACTOR: the largest number that divides both a and b. For 12 and 18 the common ' +
      'factors are 1, 2, 3, 6, so the GCF is 6.',
    q: 'The common factors of 12 and 18 are 1, 2, 3, 6. What is their GREATEST common factor?',
    choices: [
      '6 — the largest number that divides both',
      '3 — it is a common factor',
      '1 — every pair shares 1',
    ],
    answer: 0,
    feedback:
      'The GCF is the LARGEST of the common factors: 6. 1 and 3 are common too, but they are not the ' +
      'greatest. A handy truth: the common factors of a and b are exactly the factors of their GCF — the ' +
      'factors of 6 are 1, 2, 3, 6, which is precisely the shared list.',
  },
  {
    title: 'Build it from primes',
    body:
      'A second method, and the one that scales to big numbers. Switch to the PRIME-BRICK view: write each ' +
      'number as a product of primes — 12 = 2 × 2 × 3, 18 = 2 × 3 × 3 — and keep only the bricks they ' +
      'SHARE. Take each shared prime the FEWER number of times it appears, then multiply.',
    q: '12 = 2 × 2 × 3 and 18 = 2 × 3 × 3. Build the GCF from the primes they share.',
    choices: [
      '2 × 3 = 6 — both have one 2 and one 3 to spare',
      '2 × 2 × 3 × 3 = 36 — use all the primes',
      '2 × 3 × 3 = 18',
    ],
    answer: 0,
    feedback:
      'Both numbers have at least one 2 and at least one 3, so the shared bricks are 2 and 3: GCF = 2 × 3 = ' +
      '6. Using ALL the primes gives 36 — that is the least common MULTIPLE, not the greatest common ' +
      'FACTOR. The rule: each shared prime counts the FEWER-many times (the smaller exponent).',
  },
  {
    title: 'Coprime & pulling out the GCF',
    body:
      'When the only common factor is 1, the GCF is 1 and the numbers are called RELATIVELY PRIME (coprime) ' +
      '— like 8 and 15. And the GCF lets you factor a sum: since 12 = 6 × 2 and 18 = 6 × 3, ' +
      '12 + 18 = 6 × (2 + 3). What is left inside, 2 and 3, share nothing — that is why 6 is the greatest ' +
      'you could pull out.',
    q: 'The GCF of 12 and 18 is 6. Rewrite 12 + 18 by pulling out the GCF.',
    choices: [
      '6 × (2 + 3)',
      '2 × (6 + 9)',
      '12 + 18 cannot be factored',
    ],
    answer: 0,
    feedback:
      '12 = 6 × 2 and 18 = 6 × 3, so 12 + 18 = 6 × 2 + 6 × 3 = 6 × (2 + 3) = 6 × 5 = 30. Pulling out 2 ' +
      'instead leaves 6 + 9, which still share a 3 — so 2 was not the GREATEST common factor. This is ' +
      'exactly what CCSS 6.NS.B.4 asks for.',
  },
  {
    title: 'Hit the target GCF',
    body:
      'Final challenge. A target GCF is shown. Set BOTH dials so that a and b have that greatest common ' +
      'factor — pick two multiples of the target that share nothing bigger. Many pairs work. Reach 100% to ' +
      'earn CALIBRATED, then press New target.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function GreatestCommonFactorLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [view, setView] = useState('line'); // 'line' (number line) | 'bricks' (prime overlap)
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  // derived facts (single source of truth = state) — all exact integers
  const g = gcd(a, b);
  const facA = factorsOf(a);
  const facB = factorsOf(b);
  const common = commonFactors(a, b);
  const shared = sharedPrimes(a, b);
  const theLcm = lcm(a, b);
  const coprime = g === 1;
  const bricksUnlocked = step >= 4;

  // calibration grade
  const grade = calib && target ? calibGrade(a, b, target) : { pct: 0, done: false, hint: '' };
  const calibrated = grade.done;

  // Single source of truth snapshot for the renderer.
  sceneRef.current = {
    ...sceneRef.current,
    a,
    b,
    g,
    view,
    step,
    calib,
    crown: step >= 3 || calib, // the GCF crown appears once "greatest" is introduced
  };

  /* ---- full redraw from the state snapshot ------------------------------- */
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
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const A = S.a;
    const B = S.b;
    const G = S.g;
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

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

    if (S.view === 'bricks') {
      drawBricks(ctx, W, H, A, B, G, MONO);
    } else {
      drawNumberLine(ctx, W, H, A, B, G, S.crown, MONO);
    }
  }, []);

  /* ---------- VIEW 1: the common-factor number line ---------- */
  function drawNumberLine(ctx, W, H, A, B, G, crown, MONO) {
    const M = Math.max(A, B);
    const padL = 66; // room at the left for the "a = …" / "b = …" row-identity labels
    const padR = 26;
    const trackW = W - padL - padR;
    const x = (k) => (M <= 1 ? padL + trackW / 2 : padL + ((k - 1) / (M - 1)) * trackW);

    const axisY = H * 0.5;
    const pinLen = Math.min(H * 0.24, 120);
    const dotR = 4.6;

    const facA = factorsOf(A);
    const facB = factorsOf(B);
    const setB = new Set(facB);
    const isCommon = (k) => A % k === 0 && B % k === 0;

    /* the axis */
    ctx.strokeStyle = 'rgba(28,43,58,0.5)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(padL - 8, axisY);
    ctx.lineTo(W - padR + 8, axisY);
    ctx.stroke();

    /* faint unit ticks on the axis (only where they fit) */
    if (M <= 24) {
      ctx.strokeStyle = 'rgba(28,43,58,0.16)';
      ctx.lineWidth = 1;
      for (let k = 1; k <= M; k++) {
        const X = x(k);
        ctx.beginPath();
        ctx.moveTo(X, axisY - 3);
        ctx.lineTo(X, axisY + 3);
        ctx.stroke();
      }
    }

    /* row identity labels at the far left, lifted onto their own line so they
       never collide with the k = 1 factor pin that always sits at the axis start */
    ctx.font = `italic 600 14px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = BLUE;
    ctx.textBaseline = 'bottom';
    ctx.fillText(`a = ${fmt(A)}`, 6, axisY - pinLen - 20);
    ctx.textBaseline = 'top';
    ctx.fillText(`b = ${fmt(B)}`, 6, axisY + pinLen + 20);

    /* carmine bands behind the shared columns (drawn first so pins sit on top) */
    for (let k = 1; k <= M; k++) {
      if (!isCommon(k)) continue;
      const X = x(k);
      const isG = k === G;
      ctx.fillStyle = isG ? 'rgba(200,30,79,0.16)' : CURVE_SOFT;
      const bw = isG ? 16 : 11;
      ctx.fillRect(X - bw / 2, axisY - pinLen - 2, bw, 2 * (pinLen + 2));
    }

    /* helper to draw one comb (factors of n) above (dir=-1) or below (dir=+1) */
    const drawComb = (facs, dir) => {
      for (const k of facs) {
        const X = x(k);
        const common = isCommon(k);
        const tipY = axisY + dir * pinLen;
        ctx.strokeStyle = common ? CURVE : 'rgba(63,116,166,0.85)';
        ctx.lineWidth = common ? 2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(X, axisY);
        ctx.lineTo(X, tipY);
        ctx.stroke();
        // dot at the tip
        ctx.beginPath();
        ctx.arc(X, tipY, common ? dotR + 0.6 : dotR, 0, Math.PI * 2);
        ctx.fillStyle = common ? CURVE : BLUE;
        ctx.fill();
        // value label
        ctx.font = `${common ? '700' : '600'} 11px ${MONO}`;
        ctx.fillStyle = common ? CURVE : INK_SOFT;
        ctx.textAlign = 'center';
        ctx.textBaseline = dir < 0 ? 'bottom' : 'top';
        ctx.fillText(fmt(k), X, tipY + dir * (dotR + 4));
      }
    };
    drawComb(facA, -1); // a above
    drawComb(facB, +1); // b below

    /* the crown on the GCF column */
    if (crown && G >= 1) {
      const X = x(G);
      const topY = axisY - pinLen - 18;
      drawCrown(ctx, X, topY, GOLD); // crown glyph occupies [topY-11, topY]
      ctx.font = `700 12px ${MONO}`;
      ctx.fillStyle = CURVE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`GCF = ${fmt(G)}`, X, topY - 14); // lifted clear of the crown
    }

    /* coprime banner when the only shared factor is 1 — pinned to the top-center
       (empty when coprime, since the lone crown sits over the 1 at the far left)
       so it never collides with the bottom-left hint chip */
    if (G === 1) {
      ctx.font = `600 12px ${MONO}`;
      ctx.fillStyle = INK_SOFT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('only 1 in common — relatively prime (coprime)', W / 2, 12);
    }
  }

  /* a tiny crown glyph */
  function drawCrown(ctx, cx, cy, color) {
    const w = 18;
    const h = 11;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy);
    ctx.lineTo(cx - w / 2, cy - h);
    ctx.lineTo(cx - w / 4, cy - h * 0.4);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx + w / 4, cy - h * 0.4);
    ctx.lineTo(cx + w / 2, cy - h);
    ctx.lineTo(cx + w / 2, cy);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------- VIEW 2: the prime-brick overlap ---------- */
  function drawBricks(ctx, W, H, A, B, G, MONO) {
    const listA = primeFactors(A);
    const listB = primeFactors(B);
    const sp = sharedPrimes(A, B); // [[p, m], ...]

    // per-brick "shared" mask: for each prime, the first min(cntA,cntB) copies
    // in EACH list are the shared ones.
    const need = new Map(sp); // prime -> how many are shared
    const maskFor = (list) => {
      const left = new Map(need);
      return list.map((p) => {
        const n = left.get(p) || 0;
        if (n > 0) {
          left.set(p, n - 1);
          return true;
        }
        return false;
      });
    };
    const maskA = maskFor(listA);
    const maskB = maskFor(listB);
    // the GCF bricks themselves
    const gcfList = [];
    for (const [p, m] of sp) for (let i = 0; i < m; i++) gcfList.push(p);

    const maxBricks = Math.max(listA.length, listB.length, 1);
    const bw = Math.max(26, Math.min(46, (W - 150) / maxBricks));
    const bh = 30;
    const gap = 8;

    const rowY = [H * 0.2, H * 0.46, H * 0.76];
    const labels = [`${fmt(A)} =`, `${fmt(B)} =`, 'GCF ='];

    const drawRow = (list, mask, y, label, allCarmine) => {
      const total = list.length * bw + (list.length - 1) * gap;
      const startX = Math.max(120, (W - total) / 2 + 30);
      // label
      ctx.font = `italic 600 15px ${MONO}`;
      ctx.fillStyle = INK;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, startX - 14, y);
      if (list.length === 0) {
        ctx.font = `600 13px ${MONO}`;
        ctx.fillStyle = INK_SOFT;
        ctx.textAlign = 'left';
        ctx.fillText('1  (no shared prime)', startX, y);
        return;
      }
      for (let i = 0; i < list.length; i++) {
        const bx = startX + i * (bw + gap);
        const on = allCarmine || mask[i];
        // brick
        roundRect(ctx, bx, y - bh / 2, bw, bh, 6);
        ctx.fillStyle = on ? CURVE_SOFT : 'rgba(199,216,228,0.45)';
        ctx.fill();
        ctx.strokeStyle = on ? CURVE : BLUE;
        ctx.lineWidth = on ? 2 : 1.4;
        ctx.stroke();
        // prime value
        ctx.font = `700 15px ${MONO}`;
        ctx.fillStyle = on ? CURVE : INK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fmt(list[i]), bx + bw / 2, y + 1);
        // × between bricks
        if (i < list.length - 1) {
          ctx.font = `600 14px ${MONO}`;
          ctx.fillStyle = INK_SOFT;
          ctx.fillText(TIMES, bx + bw + gap / 2, y + 1);
        }
      }
      // trailing "= value" for the GCF row
      if (allCarmine) {
        const endX = startX + total + 12;
        ctx.font = `700 16px ${MONO}`;
        ctx.fillStyle = CURVE;
        ctx.textAlign = 'left';
        ctx.fillText(`= ${fmt(G)}`, endX, y + 1);
      }
    };

    drawRow(listA, maskA, rowY[0], labels[0], false);
    drawRow(listB, maskB, rowY[1], labels[1], false);

    // a divider + caption before the GCF row
    ctx.strokeStyle = 'rgba(28,43,58,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, (rowY[1] + rowY[2]) / 2);
    ctx.lineTo(W - 30, (rowY[1] + rowY[2]) / 2);
    ctx.stroke();
    ctx.font = `600 12px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('keep only the shared bricks →', W / 2, (rowY[1] + rowY[2]) / 2 - 12);

    drawRow(gcfList, gcfList.map(() => true), rowY[2], labels[2], true);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [a, b, view, step, target, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* auto-switch to the prime-brick view when its step arrives; back to the line
     for the earlier steps and calibration (which is played on the number line). */
  useEffect(() => {
    if (step === 4) setView('bricks');
    else if (step < 4 || step === STEPS.length - 1) setView('line');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* entering the calibration step: hand out a fresh target and reset the dials
     to a coprime pair (GCF 1) so it always starts un-matched. */
  useEffect(() => {
    if (current.calib && !target) {
      setTarget(makeTarget(null));
      setA(2);
      setB(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'a') setA(v);
    else setB(v);
  };
  const resetDials = () => {
    setA(START.a);
    setB(START.b);
  };
  const newTarget = () => {
    setTarget(makeTarget(target));
    setA(2);
    setB(3);
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

  const values = { a, b };
  const spoken =
    `a is ${fmt(a)} with factors ${facA.join(', ')}. b is ${fmt(b)} with factors ${facB.join(', ')}. ` +
    `Their common factors are ${common.join(', ')}. The greatest common factor is ${fmt(g)}. ` +
    (coprime ? `${fmt(a)} and ${fmt(b)} are relatively prime.` : `${fmt(a)} = ${primeProduct(a)} and ${fmt(b)} = ${primeProduct(b)}; the shared primes multiply to ${fmt(g)}.`) +
    (calib && calibrated ? ' Calibrated.' : '');

  return (
    <div className="gcflab">
      <header className="head">
        <h1>Greatest Common Factor</h1>
        <p className="lede">
          The <em>greatest common factor</em> of two whole numbers is the largest number that divides{' '}
          <em>both</em> of them evenly. Hang the factors of <em>a</em> above a shared number line and the
          factors of <em>b</em> below it: the columns that reach top <em>and</em> bottom are the{' '}
          <em>common</em> factors, and the biggest of those — crowned — is the GCF. Then meet the
          prime-factorization method and use the GCF to factor a sum.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              GCF({fmt(a)}, {fmt(b)}) ={' '}
              <span className="gcf">{fmt(g)}</span>
            </p>
            <p className={'verdict ' + (coprime ? 'no' : 'yes')}>
              {coprime
                ? `${fmt(a)} and ${fmt(b)} share only 1 — relatively prime`
                : `common factors: ${common.join(', ')}`}
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {view === 'bricks' ? 'shared prime bricks → GCF' : 'above = a · below = b · carmine = shared'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {/* view toggle — the prime-brick lens unlocks at its step */}
          <div className="toolbar">
            <button
              type="button"
              className={'seg' + (view === 'line' ? ' on' : '')}
              onClick={() => setView('line')}
              aria-pressed={view === 'line'}
            >
              Number line
            </button>
            <button
              type="button"
              className={'seg' + (view === 'bricks' ? ' on' : '')}
              onClick={() => setView('bricks')}
              disabled={!bricksUnlocked}
              aria-pressed={view === 'bricks'}
              title={bricksUnlocked ? '' : 'unlocks at the prime-factorization step'}
            >
              Prime bricks {bricksUnlocked ? '' : '🔒'}
            </button>
            <span className="spacer" />
            <button type="button" className="btn ghost" onClick={resetDials} disabled={calib}>
              Reset dials
            </button>
          </div>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw shared" /> shared factor
            </span>
            <span className="lg">
              <span className="sw own" /> a / b only
            </span>
            <span className="lg">
              <span className="crown-sw" /> the GCF
            </span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Factors of {fmt(a)}</span>
              <span className="fact-v mono">{facA.join(', ')}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Factors of {fmt(b)}</span>
              <span className="fact-v mono">{facB.join(', ')}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Common factors</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                {common.join(', ')}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Greatest common factor</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700, fontSize: '16px' }}>
                {fmt(g)}
                {coprime ? ' · coprime' : ''}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Prime overlap</span>
              <span className="fact-v mono">
                {fmt(a)} = {primeProduct(a)} · {fmt(b)} = {primeProduct(b)}
                <br />
                shared: {sharedProduct(a, b)} = <strong style={{ color: CURVE }}>{fmt(g)}</strong>
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">GCF × LCM = a × b</span>
              <span className="fact-v mono">
                {fmt(g)} × {fmt(theLcm)} = {fmt(g * theLcm)} = {fmt(a)} × {fmt(b)}
              </span>
            </div>
            {!coprime && (
              <div className="fact wide">
                <span className="fact-k">Factor the sum (CCSS 6.NS.B.4)</span>
                <span className="fact-v mono">
                  {fmt(a)} + {fmt(b)} = {fmt(g)} × ({fmt(a / g)} + {fmt(b / g)}) = {fmt(g)} × {fmt(a / g + b / g)}
                </span>
              </div>
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

          <div className="dials">
            {PARAMS.map((dparam) => {
              const unlocked = step >= dparam.unlock || calib;
              const val = values[dparam.key];
              const disabled = !unlocked;
              return (
                <label className={'dial' + (disabled ? ' locked' : '')} key={dparam.key}>
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
                Target GCF: <strong>{fmt(target)}</strong> · set a and b so GCF(a, b) = {fmt(target)}
              </p>
              <div className="meter" aria-hidden="true">
                <div
                  className="meter-fill"
                  style={{ width: grade.pct.toFixed(0) + '%', background: calibrated ? OK : undefined }}
                />
              </div>
              <div className="meter-row">
                <span className="mono">
                  now: GCF({fmt(a)}, {fmt(b)}) = {fmt(g)}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">{grade.pct.toFixed(0)}%</span>
                )}
              </div>
              <p className="calib-hint">{grade.hint}</p>
              {calibrated && otherPairs(target, a, b).length > 0 && (
                <p className="calib-note">
                  Other pairs with GCF {fmt(target)}: {otherPairs(target, a, b).join(', ')} …
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
                  setView('line');
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
        <span className="mono">GCF(a, b) × LCM(a, b) = a × b</span> &nbsp;·&nbsp; the common factors of a
        and b are exactly the factors of their GCF; build the GCF from the primes they share.
        CCSS&nbsp;6.NS.B.4.
      </footer>

      <style jsx>{`
        .gcflab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
          --quad: #c7d8e4;
          --ok: #1f8a5b;
          --gold: #c98a1e;
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
          color: var(--ink);
        }
        .equation .gcf {
          color: var(--curve);
          font-weight: 700;
        }
        .verdict {
          font-size: 13px;
          margin: 0;
          font-weight: 600;
        }
        .verdict.yes {
          color: var(--curve);
        }
        .verdict.no {
          color: var(--ink-soft);
        }
        .stage {
          position: relative;
          width: min(100%, 640px);
          aspect-ratio: 16 / 11;
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
        /* the two combs stack vertically, so give them a taller portrait stage on
           phones and drop the hint chip (it would crowd the b-row label) */
        @media (max-width: 520px) {
          .stage {
            aspect-ratio: 4 / 5;
          }
          .hint {
            display: none;
          }
        }
        .hint {
          position: absolute;
          left: 10px;
          bottom: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
        }
        .spacer {
          flex: 1;
        }
        .seg {
          font: 600 12.5px/1 system-ui, sans-serif;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid rgba(28, 43, 58, 0.25);
          background: var(--paper);
          color: var(--ink-soft);
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .seg.on {
          border-color: var(--curve);
          color: var(--curve);
          background: rgba(200, 30, 79, 0.06);
        }
        .seg:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          justify-content: center;
          margin: 12px 4px 2px;
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
        .sw.shared {
          background: rgba(200, 30, 79, 0.12);
          border: 2px solid var(--curve);
        }
        .sw.own {
          background: rgba(199, 216, 228, 0.5);
          border: 1.4px solid var(--blue);
        }
        .crown-sw {
          width: 16px;
          height: 12px;
          display: inline-block;
          background: var(--gold);
          clip-path: polygon(0 100%, 0 25%, 25% 60%, 50% 15%, 75% 60%, 100% 25%, 100% 100%);
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
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          line-height: 1.5;
        }
        .toolbar .btn {
          margin: 0;
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
          accent-color: var(--blue);
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
        .calib-lead {
          font-size: 13px;
          margin: 0;
          color: var(--ink-soft);
        }
        .calib-lead strong {
          color: var(--curve);
          font-size: 16px;
        }
        .calib-hint {
          font-size: 12.5px;
          margin: 0;
          color: var(--ink-soft);
        }
        .calib-note {
          font-size: 12.5px;
          margin: 0;
          color: var(--ok);
          font-family: var(--mono);
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
        :global(.gcflab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .seg {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
