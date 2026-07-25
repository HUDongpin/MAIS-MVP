'use client';

/* ============================================================================
   ComplexArithmeticLab — an interactive "bench" for the METRIC of the complex
   plane: how long an arm is, its mirror twin, how you divide by one, the two
   names every arm answers to, and the distance between two of them.

        |z|² = a² + b²          the length, squared — always a whole number
        z̄  = a − bi            the mirror twin across the real axis
        z·z̄ = |z|²             a complex number times its twin is REAL
        z/w = z·w̄ / |w|²       divide by making the bottom real
        z   = (a, b) = (r, θ)   rectangular and polar: two names, one arrow
        |zw| = |z|·|w|          multiply: lengths multiply, angles add

   Built for MAIS (math AI system, www.mais.ac), K-12.  GRADES 11–12 —
   CCSS N-CN.A.3 (conjugates, moduli, quotients), N-CN.B.4 (rectangular and
   polar form), N-CN.B.5 (operations represented geometrically) and
   N-CN.B.6 (distance and midpoint in the complex plane).

   ---------------------------------------------------------------------------
   HOW THIS LAB STAYS DISTINCT  (the library's hard rule)
   ---------------------------------------------------------------------------
   ComplexPlaneLab already owns the ARRIVAL of i: ×i as a quarter-turn of the
   whole plane, i² = −1 as a fact about turning, i⁴ = 1, and the payoff that
   every quadratic finally has roots.  It is a lab about ONE gesture.

   This bench never re-teaches that gesture.  It owns what you can MEASURE once
   the plane exists — the metric:
     • ComplexPlaneLab  — the quarter-turn, and roots of quadratics (N-CN.1/2/7/9).
     • DistanceLab      — owns the distance formula on the real coordinate plane
                          via Pythagoras.  This lab CITES it rather than
                          re-deriving it, and spends its distance step on the
                          MIDPOINT and on |z − w| as one number.
     • VectorLab        — owns tip-to-tail addition of arrows.  So this lab does
                          not re-draw vector addition; its geometric step is
                          MULTIPLICATION (stretch-and-turn), which no arrow-sum
                          bench can show.
     • TrigRatioLab / UnitCircleLab — own sine and cosine.  Polar form here is
                          read off the same arm, not re-derived from a triangle.

   EXACT INTEGER MATH.  Both arms are Gaussian integers, so every quantity the
   bench asserts is exact: |z|² is a whole number, the conjugate is a lattice
   point, z·w̄ is a lattice point, and the quotient is held as a REDUCED PAIR OF
   FRACTIONS (never a float).  |zw|² = |z|²·|w|² is checked as an integer
   identity, and the CALIBRATED stamp is an exact lattice equality — a float can
   never fire it.  The angle readout is the one rounded number on the bench and
   is labelled as such.

   The block between MODEL:START and MODEL:END is pure, React-free JavaScript;
   audit-complexarithmetic.mjs slices it out and evaluates it, so the audit
   tests the code that ships.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

/* the lattice the arms live on. Z is roomy; W stays small so a quotient and a
   product both stay on screen. */
const Z_RANGE = { min: -6, max: 6 };
const W_RANGE = { min: -4, max: 4 };

const gcdI = (m, n) => (n ? gcdI(n, Math.abs(m % n)) : Math.abs(m));

/* a complex number as an exact integer pair */
const cx = (re, im) => ({ re, im });
const addC = (z, w) => cx(z.re + w.re, z.im + w.im);
const subC = (z, w) => cx(z.re - w.re, z.im - w.im);
const mulC = (z, w) => cx(z.re * w.re - z.im * w.im, z.re * w.im + z.im * w.re);
/* N-CN.3 — the conjugate: same real part, flipped imaginary part. Geometrically
   the reflection of the arm across the real axis. */
const conjC = (z) => cx(z.re, -z.im);
/* |z|², exact. This is the quantity the bench asserts; |z| itself is shown as a
   rounded readout because it is usually irrational. */
const normSq = (z) => z.re * z.re + z.im * z.im;
const isZero = (z) => z.re === 0 && z.im === 0;

/* N-CN.3 — z·z̄ = |z|², and it is REAL: the imaginary part is exactly 0.
   That is the whole trick behind division. */
function conjProduct(z) {
  return mulC(z, conjC(z)); // { re: |z|², im: 0 }
}

/* an exact reduced fraction n/d with d > 0 */
function frac(n, d) {
  if (d === 0) return null;
  const s = d < 0 ? -1 : 1;
  const nn = n * s, dd = d * s;
  const g = gcdI(nn, dd) || 1;
  return { n: nn / g, d: dd / g };
}
const fracIsInt = (f) => f != null && f.d === 1;
function fracString(f) {
  if (f == null) return '—';
  if (f.d === 1) return String(f.n);
  return `${f.n}/${f.d}`;
}

/* N-CN.3 — the quotient z/w, exact. Multiply top and bottom by w̄: the bottom
   becomes the whole number |w|², and the top is the lattice point z·w̄. */
function quotient(z, w) {
  if (isZero(w)) return null;
  const num = mulC(z, conjC(w));
  const den = normSq(w);
  return { num, den, re: frac(num.re, den), im: frac(num.im, den) };
}
/* the quotient is a Gaussian integer exactly when both parts reduce to /1 */
const quotientIsLattice = (q) => q != null && fracIsInt(q.re) && fracIsInt(q.im);

/* N-CN.5 — multiplication seen geometrically. The exact half of the claim is an
   INTEGER identity: the squared lengths multiply. (The angles add; that half is
   read off the picture, and the readout is rounded.) */
function productLengthIdentity(z, w) {
  const lhs = normSq(mulC(z, w));
  const rhs = normSq(z) * normSq(w);
  return { lhs, rhs, holds: lhs === rhs };
}

/* N-CN.4 — polar form. r² is exact; the angle is the bench's one rounded
   number. Angles are reported in [0, 360). */
function argDeg(z) {
  if (isZero(z)) return null;
  const d = (Math.atan2(z.im, z.re) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
}
/* the arms whose angle is exact on this lattice — the axes and the diagonals.
   The bench flags these so a student sees when the readout is not an estimate. */
function exactAngleDeg(z) {
  if (isZero(z)) return null;
  const { re, im } = z;
  if (im === 0) return re > 0 ? 0 : 180;
  if (re === 0) return im > 0 ? 90 : 270;
  if (Math.abs(re) === Math.abs(im)) {
    if (re > 0 && im > 0) return 45;
    if (re < 0 && im > 0) return 135;
    if (re < 0 && im < 0) return 225;
    return 315;
  }
  return null;
}

/* N-CN.6 — distance and midpoint. |z − w|² is an exact whole number; the
   midpoint is exact in halves, so it is held DOUBLED to stay on the integers. */
const distSq = (z, w) => normSq(subC(z, w));
function midpointDoubled(z, w) {
  return cx(z.re + w.re, z.im + w.im); // the true midpoint is this, halved
}
function halfString(twice) {
  if (twice % 2 === 0) return String(twice / 2);
  return `${twice}/2`;
}

/* ---- parameters ---------------------------------------------------------
   Four dials, unlocking one idea at a time: the two parts of z, then the two
   parts of w once division needs a second arm. */
const DIALS = [
  { key: 'a', label: 'a — the real part of z', min: Z_RANGE.min, max: Z_RANGE.max, step: 1, from: 0 },
  { key: 'b', label: 'b — the imaginary part of z', min: Z_RANGE.min, max: Z_RANGE.max, step: 1, from: 0 },
  { key: 'c', label: 'c — the real part of w', min: W_RANGE.min, max: W_RANGE.max, step: 1, from: 2 },
  { key: 'd', label: 'd — the imaginary part of w', min: W_RANGE.min, max: W_RANGE.max, step: 1, from: 2 },
];
const START = { a: 3, b: 4, c: 1, d: 1 }; // 3+4i has |z|² = 25, |z| = 5 exactly

/* ---- calibration --------------------------------------------------------
   "The divider's stamp." A divisor w and a target quotient q are posted; set z
   so that z ÷ w lands exactly on q. Since q·w is a lattice point, the goal is
   always reachable, and CALIBRATED is the exact integer equality z === q·w. */
const CALIB_W = [cx(1, 1), cx(2, -1), cx(1, -2), cx(2, 1), cx(-1, 1)];
const CALIB_Q = [cx(2, 0), cx(1, 1), cx(0, 2), cx(-1, 1), cx(2, -1), cx(1, -1), cx(-2, 0), cx(0, -1)];

function makeTarget(prev, rnd) {
  const rand = rnd || Math.random;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  let t = null;
  let guard = 0;
  while (guard < 999) {
    guard += 1;
    const w = pick(CALIB_W);
    const q = pick(CALIB_Q);
    if (isZero(q) || isZero(w)) continue;
    const z = mulC(q, w); // the arm the student must build
    if (z.re < Z_RANGE.min || z.re > Z_RANGE.max) continue;
    if (z.im < Z_RANGE.min || z.im > Z_RANGE.max) continue;
    if (isZero(z)) continue;
    if (prev && prev.z.re === z.re && prev.z.im === z.im && prev.w.re === w.re && prev.w.im === w.im) continue;
    t = { w, q, z };
    break;
  }
  return t || { w: cx(1, 1), q: cx(2, 0), z: cx(2, 2) };
}
/* exact lattice equality — no tolerance, so a near miss never stamps */
const isCalibrated = (z, target) => z.re === target.z.re && z.im === target.z.im;
/* the meter reads how far the arm still is, in exact squared distance */
function matchPercent(z, target) {
  const start = Math.max(1, distSq(cx(0, 0), target.z));
  const now = distSq(z, target.z);
  return Math.max(0, Math.min(100, 100 * (1 - now / (start + 4))));
}

/* ---- the lesson ---------------------------------------------------------- */
const STEPS = [
  {
    title: 'How long is an arm?',
    focus: 'modulus',
    unlock: 2,
    body:
      'z = 3 + 4i is an arrow from 0 to the point (3, 4). Its length is called the MODULUS, written ' +
      '|z|. Drop the legs and it is the old right triangle: |z|² = a² + b² = 9 + 16 = 25, so |z| = 5. ' +
      'The squared length is always a whole number here — that is the quantity worth trusting.',
    q: 'Move to z = 6 + 0i. What is |z|²?',
    choices: ['36 — a² + b² = 36 + 0', '6 — the modulus is just a', '0 — there is no imaginary part'],
    answer: 0,
    feedback:
      '|z|² = 6² + 0² = 36, so |z| = 6. An arm lying flat on the real axis has length equal to its ' +
      'real part — the modulus generalises "how far from zero", which on the number line was just ' +
      'absolute value.',
  },
  {
    title: 'The mirror twin',
    focus: 'conjugate',
    unlock: 2,
    body:
      'Flip the arm across the real axis and you get the CONJUGATE, z̄ = a − bi. Same length, ' +
      'opposite angle. Now multiply the two: z·z̄ = (a + bi)(a − bi) = a² + b². The i-terms cancel, ' +
      'so the answer is REAL — and it is exactly |z|².',
    q: 'Why is z·z̄ always real, never complex?',
    choices: [
      'The two imaginary terms are +abi and −abi, so they cancel exactly',
      'Because a and b are whole numbers',
      'It is not — it is real only when b = 0',
    ],
    answer: 0,
    feedback:
      '(a + bi)(a − bi) = a² − abi + abi − b²i² = a² + b². The cross terms are opposites and vanish, ' +
      'and −b²i² becomes +b². A number times its conjugate is real for EVERY complex number — that ' +
      'is the property the next step turns into a division method.',
  },
  {
    title: 'Divide by making the bottom real',
    focus: 'quotient',
    unlock: 4,
    body:
      'You cannot divide by an arrow. But you can turn the bottom into a plain number: multiply top ' +
      'and bottom by w̄. The bottom becomes w·w̄ = |w|², a whole number — and the top is just another ' +
      'lattice point. Read the exact answer under the picture; it is a pair of fractions, never a decimal.',
    q: 'To simplify z / w, what do you multiply the top and bottom by?',
    choices: ['w̄ — the conjugate of the BOTTOM', 'z̄ — the conjugate of the top', 'i, to rotate it flat'],
    answer: 0,
    feedback:
      'Multiplying by w̄/w̄ is multiplying by 1, so the value is unchanged — but the denominator ' +
      'becomes |w|², a real whole number, and dividing by a real number is easy. Using z̄ would clear ' +
      'the top, which is the part you wanted to keep.',
  },
  {
    title: 'Two names, one arrow',
    focus: 'polar',
    unlock: 2,
    body:
      'The same arm answers to two names. RECTANGULAR (a, b) says how far across and up. POLAR (r, θ) ' +
      'says how long and at what angle, with r = |z|. Neither is more true — they are addresses in ' +
      'different languages, and each makes a different job easy.',
    q: 'Which form makes it obvious that two numbers have the SAME length?',
    choices: ['Polar — the r matches, whatever the angle', 'Rectangular — the a matches', 'Neither shows length'],
    answer: 0,
    feedback:
      'Polar puts the length first, so equal lengths are visible at a glance; rectangular hides it ' +
      'inside a² + b². The next step shows why polar is also the right language for multiplication.',
  },
  {
    title: 'Multiply: stretch and turn',
    focus: 'multiply',
    unlock: 4,
    body:
      'Multiplying two complex numbers does two geometric things at once: the LENGTHS MULTIPLY and ' +
      'the ANGLES ADD. The length half is exact and you can check it as whole numbers on the readout: ' +
      '|zw|² = |z|²·|w|², every time.',
    q: 'z has length 5, w has length 2. How long is zw?',
    choices: ['10 — lengths multiply', '7 — lengths add', '5 — the longer one wins'],
    answer: 0,
    feedback:
      '|zw| = |z|·|w| = 10, and the angle of zw is the sum of the two angles. This is why ×i (length 1, ' +
      'angle 90°) is a pure quarter-turn — it stretches by nothing and turns by a right angle.',
  },
  {
    title: 'Between two points',
    focus: 'distance',
    unlock: 4,
    body:
      'The gap between two complex numbers is the length of their difference: |z − w|. Subtracting ' +
      'slides the pair so w sits at 0, and then it is just a modulus again. The MIDPOINT is the ' +
      'average of the two addresses — halve each coordinate.',
    q: 'What is the distance between z and w, in one expression?',
    choices: ['|z − w|', '|z| − |w|', '|z| + |w|'],
    answer: 0,
    feedback:
      '|z − w| is the distance. |z| − |w| only compares their distances from 0 and can even be ' +
      'negative; two arms of equal length have |z| − |w| = 0 while sitting far apart. Subtract first, ' +
      'measure second.',
  },
  {
    title: 'The divider’s stamp',
    focus: 'calib',
    unlock: 2,
    body:
      'Last challenge. A divisor w and a target quotient q are posted. Set the two z dials so that ' +
      'z ÷ w lands exactly on q. The stamp only fires on an exact lattice hit — a near miss is a miss. ' +
      'Press New target for another.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ComplexArithmeticLab() {
  const [vals, setVals] = useState(START);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;

  const z = cx(vals.a, vals.b);
  const w = cx(vals.c, vals.d);
  const q = quotient(z, w);
  const prod = mulC(z, w);
  const ident = productLengthIdentity(z, w);
  const ang = argDeg(z);
  const angExact = exactAngleDeg(z);

  sceneRef.current = { z, w, focus, target };

  const calibrated = current.calib && target ? isCalibrated(z, target) : false;
  const pct = current.calib && target ? matchPercent(z, target) : 0;

  /* ---- the renderer: the complex plane, and whatever this step measures --- */
  const draw = useCallback(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const INK = '#1c2b3a', SOFT = '#5b6b7b', CARM = '#c81e4f', BLUE = '#3a6ea5';
    const GOLD = '#b8860b', OK = '#1f8a5b', QUAD = '#c7d8e4';

    const LIM = 8;
    const pad = 26;
    const size = Math.min(W, H) - pad * 2;
    const ox = W / 2, oy = H / 2;
    const u = size / (2 * LIM); // pixels per unit
    const px = (re) => ox + re * u;
    const py = (im) => oy - im * u;

    // quadrille
    ctx.lineWidth = 1;
    ctx.strokeStyle = QUAD;
    for (let g = -LIM; g <= LIM; g++) {
      ctx.globalAlpha = g === 0 ? 0 : 0.55;
      ctx.beginPath(); ctx.moveTo(px(g), py(-LIM)); ctx.lineTo(px(g), py(LIM)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(-LIM), py(g)); ctx.lineTo(px(LIM), py(g)); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // axes
    ctx.strokeStyle = 'rgba(28,43,58,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px(-LIM), py(0)); ctx.lineTo(px(LIM), py(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(0), py(-LIM)); ctx.lineTo(px(0), py(LIM)); ctx.stroke();
    ctx.fillStyle = SOFT; ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('real', px(LIM) - 2, py(0) + 4);
    ctx.textAlign = 'left';
    ctx.fillText('imaginary', px(0) + 5, py(LIM) + 2);

    const arrow = (from, to, color, width) => {
      const x1 = px(from.re), y1 = py(from.im), x2 = px(to.re), y2 = py(to.im);
      ctx.strokeStyle = color; ctx.lineWidth = width || 3;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1), hl = 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hl * Math.cos(a - 0.4), y2 - hl * Math.sin(a - 0.4));
      ctx.lineTo(x2 - hl * Math.cos(a + 0.4), y2 - hl * Math.sin(a + 0.4));
      ctx.closePath(); ctx.fill();
    };
    const dot = (p, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(px(p.re), py(p.im), r || 5, 0, Math.PI * 2); ctx.fill();
    };
    const tag = (p, text, color, dy) => {
      ctx.fillStyle = color; ctx.font = '600 13px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(text, px(p.re) + 9, py(p.im) + (dy || -12));
    };
    const label = (z2) => `${z2.re}${z2.im < 0 ? ' − ' : ' + '}${Math.abs(z2.im)}i`;

    const F = S.focus;

    // the second arm, where the step uses one
    if (F === 'quotient' || F === 'multiply' || F === 'distance' || F === 'calib') {
      if (!isZero(S.w)) { arrow(cx(0, 0), S.w, BLUE, 2.5); tag(S.w, `w = ${label(S.w)}`, BLUE); }
    }

    // the conjugate: mirror the arm, dashed, and mark the mirror line
    if (F === 'conjugate') {
      const zc = conjC(S.z);
      ctx.save(); ctx.setLineDash([6, 5]);
      arrow(cx(0, 0), zc, SOFT, 2.5);
      ctx.restore();
      tag(zc, `z̄ = ${label(zc)}`, SOFT, 16);
      ctx.strokeStyle = 'rgba(184,134,11,0.55)'; ctx.lineWidth = 2;
      ctx.save(); ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(px(-LIM), py(0)); ctx.lineTo(px(LIM), py(0)); ctx.stroke();
      ctx.restore();
    }

    // modulus: the legs of the right triangle
    if (F === 'modulus') {
      ctx.strokeStyle = 'rgba(58,110,165,0.85)'; ctx.lineWidth = 2;
      ctx.save(); ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(S.z.re), py(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(S.z.re), py(0)); ctx.lineTo(px(S.z.re), py(S.z.im)); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = BLUE; ctx.font = '600 12px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(`a = ${S.z.re}`, px(S.z.re / 2), py(0) + 5);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`b = ${S.z.im}`, px(S.z.re) + 6, py(S.z.im / 2));
    }

    // polar: the angle arc from the positive real axis
    if (F === 'polar' && !isZero(S.z)) {
      const th = Math.atan2(S.z.im, S.z.re);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px(0), py(0), Math.max(22, u * 1.6), 0, -th, th > 0);
      ctx.stroke();
      const a2 = argDeg(S.z);
      ctx.fillStyle = GOLD; ctx.font = '600 13px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`θ ≈ ${a2 == null ? '—' : a2.toFixed(1)}°`, px(0) + u * 1.9, py(0) - 14);
    }

    // multiply: the product arm
    if (F === 'multiply') {
      const zw = mulC(S.z, S.w);
      if (Math.abs(zw.re) <= LIM && Math.abs(zw.im) <= LIM) {
        arrow(cx(0, 0), zw, GOLD, 3);
        tag(zw, `zw = ${label(zw)}`, GOLD, 16);
      } else {
        ctx.fillStyle = GOLD; ctx.font = '600 12px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(`zw = ${label(zw)} (off the grid)`, W / 2, 8);
      }
    }

    // distance: the segment and its midpoint
    if (F === 'distance') {
      ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px(S.z.re), py(S.z.im)); ctx.lineTo(px(S.w.re), py(S.w.im)); ctx.stroke();
      const md = midpointDoubled(S.z, S.w);
      const mp = { re: md.re / 2, im: md.im / 2 };
      dot(mp, GOLD, 6);
      ctx.fillStyle = GOLD; ctx.font = '600 12px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(`midpoint (${halfString(md.re)}, ${halfString(md.im)})`, px(mp.re), py(mp.im) - 9);
    }

    // the quotient point, when it lands on the grid
    if (F === 'quotient') {
      const qq = quotient(S.z, S.w);
      if (qq) {
        const p = { re: qq.num.re / qq.den, im: qq.num.im / qq.den };
        if (Math.abs(p.re) <= LIM && Math.abs(p.im) <= LIM) {
          dot(p, GOLD, 6);
          ctx.fillStyle = GOLD; ctx.font = '600 12px ui-monospace, Menlo, monospace';
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(`z/w`, px(p.re) + 9, py(p.im) + 12);
        }
      }
    }

    // the calibration target
    if (F === 'calib' && S.target) {
      ctx.strokeStyle = OK; ctx.lineWidth = 2.5;
      ctx.save(); ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(px(S.target.z.re), py(S.target.z.im), 13, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // the main arm, always last so it sits on top
    if (!isZero(S.z)) {
      arrow(cx(0, 0), S.z, CARM, 3.5);
      tag(S.z, `z = ${label(S.z)}`, CARM);
    } else {
      dot(cx(0, 0), CARM, 6);
      tag(cx(0, 0), 'z = 0', CARM);
    }
    void INK;
  }, []);

  useEffect(() => { draw(); }, [vals, step, target, focus, draw]);
  useEffect(() => {
    const st = stageRef.current;
    if (!st || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(st);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) {
      const t = makeTarget(null);
      setTarget(t);
      setVals({ a: 0, b: 0, c: t.w.re, d: t.w.im });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* per-step presets so the copy matches the picture */
  useEffect(() => {
    if (focus === 'modulus' || focus === 'conjugate') setVals((v) => ({ ...v, a: 3, b: 4 }));
    if (focus === 'quotient') setVals({ a: 3, b: 4, c: 1, d: 1 });
    if (focus === 'polar') setVals((v) => ({ ...v, a: 3, b: 3 }));
    if (focus === 'multiply') setVals({ a: 3, b: 4, c: 2, d: 0 });
    if (focus === 'distance') setVals({ a: 3, b: 4, c: -2, d: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const setDial = (key, v) => setVals((p) => ({ ...p, [key]: parseInt(v, 10) }));
  const choose = (i) => { if (answers[step] == null) setAnswers((p) => ({ ...p, [step]: i })); };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const answered = answers[step] != null;
  const canNext = step < STEPS.length - 1 && (!current.q || answered);

  const fmt = (z2) => `${z2.re}${z2.im < 0 ? ' − ' : ' + '}${Math.abs(z2.im)}i`;
  const modulus = Math.sqrt(normSq(z));
  const modExact = Number.isInteger(modulus);

  const spoken = (() => {
    if (focus === 'calib' && target)
      return `Divisor ${fmt(target.w)}, target quotient ${fmt(target.q)}. z is ${fmt(z)}.`;
    if (focus === 'quotient' && q)
      return `z over w is ${fracString(q.re)} plus ${fracString(q.im)} i.`;
    return `z is ${fmt(z)}, with squared modulus ${normSq(z)}.`;
  })();

  return (
    <div className="calab">
      <header className="head">
        <h1>The Complex Plane, Measured</h1>
        <p className="lede">
          Once <em>i</em> exists, the plane can be <strong>measured</strong>: how long an arm is, its
          mirror twin, how you divide by one, and how far apart two of them sit. Every number below is
          exact — the squared length, the conjugate, the quotient held as fractions — except the angle,
          which says so.
        </p>
      </header>

      <div className="bench">
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={`The complex plane. ${spoken}`} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>
          <div className="readout" role="group" aria-label="Exact readouts">
            <div className="cell">
              <span className="k">|z|²</span>
              <span className="v">{normSq(z)}</span>
            </div>
            <div className="cell">
              <span className="k">|z|</span>
              <span className="v">{modExact ? modulus : `≈ ${modulus.toFixed(3)}`}</span>
            </div>
            <div className="cell">
              <span className="k">z̄</span>
              <span className="v">{fmt(conjC(z))}</span>
            </div>
            <div className="cell">
              <span className="k">z·z̄</span>
              <span className="v">{conjProduct(z).re}</span>
            </div>
            {(focus === 'quotient' || focus === 'calib') && (
              <div className="cell wide">
                <span className="k">z ÷ w</span>
                <span className="v">
                  {q == null
                    ? 'undefined (w = 0)'
                    : `${fracString(q.re)} ${q.im.n < 0 ? '−' : '+'} ${fracString({ n: Math.abs(q.im.n), d: q.im.d })}i`}
                  {q && quotientIsLattice(q) ? '  · a lattice point' : ''}
                </span>
              </div>
            )}
            {focus === 'polar' && (
              <div className="cell wide">
                <span className="k">polar</span>
                <span className="v">
                  r = {modExact ? modulus : `√${normSq(z)}`} · θ ={' '}
                  {angExact != null ? `${angExact}° (exact)` : ang == null ? '—' : `≈ ${ang.toFixed(1)}°`}
                </span>
              </div>
            )}
            {focus === 'multiply' && (
              <div className="cell wide">
                <span className="k">|zw|² = |z|²·|w|²</span>
                <span className="v">
                  {ident.lhs} = {normSq(z)} × {normSq(w)}{' '}
                  {ident.holds ? <em className="ok">✓ exact</em> : <em>mismatch</em>}
                </span>
              </div>
            )}
            {focus === 'distance' && (
              <div className="cell wide">
                <span className="k">|z − w|²</span>
                <span className="v">
                  {distSq(z, w)} · midpoint ({halfString(midpointDoubled(z, w).re)},{' '}
                  {halfString(midpointDoubled(z, w).im)})
                </span>
              </div>
            )}
          </div>
        </section>

        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span key={i} role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined} />
            ))}
          </div>
          <p className="eyebrow small">Step {step + 1} of {STEPS.length}</p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          {DIALS.slice(0, current.unlock).map((d) => (
            <label className="dial" key={d.key}>
              <span className="drole">{d.label}</span>
              <input type="range" min={d.min} max={d.max} step={d.step}
                value={vals[d.key]} aria-label={d.label}
                onChange={(e) => setDial(d.key, e.target.value)} />
              <output className="dv">{vals[d.key]}</output>
            </label>
          ))}

          {current.q && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
                  const chosen = answers[step];
                  let cls = 'choice';
                  if (chosen != null) {
                    if (i === current.answer) cls += ' correct';
                    else if (i === chosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && i === current.answer ? '✓' : chosen != null && i === chosen ? '✕' : ''}
                      </span>{ch}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target && (
            <div className="calib">
              <p className="calib-goal">
                Divide by <span className="mono">{fmt(target.w)}</span> and land on{' '}
                <span className="mono goal">{fmt(target.q)}</span>. Set the z dials.
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  z ÷ w ={' '}
                  {q == null
                    ? '—'
                    : `${fracString(q.re)} ${q.im.n < 0 ? '−' : '+'} ${fracString({ n: Math.abs(q.im.n), d: q.im.d })}i`}
                </span>
                {calibrated
                  ? <span className="stamp">CALIBRATED</span>
                  : <span className="mono hint">keep going</span>}
              </div>
              <button type="button" className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setVals({ a: 0, b: 0, c: t.w.re, d: t.w.im });
                }}>
                New target
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>← Back</button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {current.q && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => {
                setStep(0); setAnswers({}); setTarget(null); setVals(START);
              }}>Restart lab</button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">|z|² = a² + b² · z·z̄ = |z|² · z/w = z·w̄ / |w|² · |zw| = |z|·|w|</span>
        &nbsp;·&nbsp; exact on the Gaussian lattice, drawn live on a dependency-free canvas.
      </footer>

      <style jsx>{`
        .calab{
          --page:#eff1ee;--paper:#fbfbf8;--ink:#1c2b3a;--ink-soft:#5b6b7b;
          --curve:#c81e4f;--quad:#c7d8e4;--ok:#1f8a5b;--blue:#3a6ea5;--gold:#b8860b;
          --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
          --serif:'Iowan Old Style',Palatino,Georgia,serif;
          background:var(--page);color:var(--ink);
          font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;
          padding:28px 18px 44px;border-radius:16px;max-width:1120px;margin:0 auto;
        }
        .mono{font-family:var(--mono);}
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
        .eyebrow{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 6px;}
        .eyebrow.small{margin:0 0 4px;}
        h1{font-family:var(--serif);font-weight:600;font-size:clamp(26px,4vw,34px);margin:0 0 6px;}
        .lede{color:var(--ink-soft);margin:0 0 22px;max-width:64ch;}
        .bench{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start;}
        @media (max-width:920px){.bench{grid-template-columns:1fr;}}
        .panel{background:#fff;border:1px solid rgba(28,43,58,.15);border-radius:12px;box-shadow:0 1px 2px rgba(28,43,58,.05);}
        .stage-panel{padding:14px;}
        .stage{position:relative;width:100%;aspect-ratio:1/1;border:1px solid var(--quad);border-radius:8px;overflow:hidden;
          background:radial-gradient(120% 120% at 30% 18%,#fdfefe 0%,#eef3f7 60%,#e3ebf1 100%);}
        .stage canvas{display:block;width:100%;height:100%;}
        .readout{margin:12px 2px 2px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
        .cell{background:var(--paper);border:1px solid rgba(28,43,58,.14);border-radius:8px;padding:8px 10px;display:grid;gap:2px;}
        .cell.wide{grid-column:1/-1;}
        .cell .k{font-size:11px;letter-spacing:.06em;color:var(--ink-soft);font-family:var(--mono);}
        .cell .v{font-family:var(--mono);font-weight:700;font-size:15px;}
        .cell .ok{color:var(--ok);font-style:normal;font-weight:700;}
        @media (max-width:700px){.readout{grid-template-columns:repeat(2,1fr);}}
        .btn{font:600 14px/1 system-ui,sans-serif;padding:10px 16px;border-radius:8px;cursor:pointer;
          border:1px solid var(--ink);background:var(--ink);color:#fff;transition:filter .15s,opacity .15s;}
        .btn.ghost{background:transparent;color:var(--ink);}
        .btn:disabled{opacity:.4;cursor:not-allowed;}
        .btn:not(:disabled):hover{filter:brightness(1.08);}
        .tutor{padding:18px 20px 20px;}
        .progress{display:flex;gap:6px;margin-bottom:14px;}
        .pip{height:6px;flex:1;border-radius:3px;background:rgba(28,43,58,.14);}
        .pip.done{background:rgba(200,30,79,.45);}
        .pip.cur{background:var(--curve);}
        h2{font-family:var(--serif);font-weight:600;font-size:21px;margin:0 0 10px;padding-bottom:9px;border-bottom:3px double rgba(200,30,79,.45);}
        .body{margin:0 0 16px;font-size:14.5px;}
        .dial{display:grid;grid-template-columns:1fr 52px;grid-template-rows:auto auto;align-items:center;gap:2px 10px;margin-bottom:12px;}
        .drole{grid-column:1/3;font-size:12px;color:var(--ink-soft);}
        .dial input[type=range]{grid-column:1;width:100%;accent-color:var(--ink);cursor:pointer;}
        .dv{grid-column:2;font-family:var(--mono);text-align:right;font-size:17px;font-weight:700;}
        .quiz{margin-top:4px;}
        .q{font-size:14px;font-weight:600;margin:0 0 10px;}
        .choices{display:grid;gap:8px;}
        .choice{text-align:left;font:14px/1.4 system-ui,sans-serif;padding:11px 11px 11px 32px;
          border:1px solid rgba(28,43,58,.2);border-radius:8px;background:var(--paper);color:var(--ink);
          cursor:pointer;position:relative;transition:border-color .15s,background .15s;}
        .choice:not(:disabled):hover{border-color:var(--ink);}
        .choice .mark{position:absolute;left:11px;font-weight:700;}
        .choice.correct{border-color:var(--ok);background:rgba(31,138,91,.08);}
        .choice.correct .mark{color:var(--ok);}
        .choice.wrong{border-color:var(--ink-soft);background:rgba(91,107,123,.08);}
        .choice.wrong .mark{color:var(--ink-soft);}
        .choice.dim{opacity:.55;}
        .choice:disabled{cursor:default;}
        .feedback{margin:12px 0 0;font-size:13px;line-height:1.55;background:rgba(200,30,79,.05);
          border-left:3px solid var(--curve);padding:10px 12px;border-radius:0 6px 6px 0;}
        .calib{margin-top:6px;display:grid;gap:11px;}
        .calib-goal{margin:0;font-size:15px;background:rgba(58,110,165,.08);border-radius:8px;padding:11px 13px;}
        .calib-goal .mono{font-weight:700;}
        .calib-goal .goal{color:var(--curve);}
        .meter{height:12px;border-radius:6px;background:rgba(28,43,58,.1);overflow:hidden;}
        .meter-fill{height:100%;background:linear-gradient(90deg,rgba(200,30,79,.55),var(--curve));transition:width .12s ease-out;}
        .meter-row{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;}
        .hint{color:var(--ink-soft);font-size:12.5px;}
        .stamp{font:700 12px/1 var(--mono);letter-spacing:.16em;color:var(--ok);border:2px solid var(--ok);border-radius:6px;padding:5px 9px;transform:rotate(-3deg);}
        .nav{margin-top:20px;display:flex;justify-content:space-between;gap:10px;}
        .foot{margin-top:24px;font-size:12.5px;color:var(--ink-soft);}
        :global(.calab) :focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:4px;}
        @media (prefers-reduced-motion:reduce){.btn,.choice,.meter-fill{transition:none;}}
      `}</style>
    </div>
  );
}
