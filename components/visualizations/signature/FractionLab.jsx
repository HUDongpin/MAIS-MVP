'use client';

/* ============================================================================
   FractionLab — an interactive "bench" for FRACTIONS: equal parts of a whole.
   A fraction p/q means one whole is cut into q EQUAL parts and you take p of
   them.  The denominator names the size of one part (the unit fraction 1/q);
   the numerator counts how many of those parts.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 3–4
   (CCSS 3.NF.A.1/2/3) — a child meeting fractions for the first time and
   learning the three load-bearing ideas: the parts must be EQUAL, a fraction is
   p copies of the unit fraction 1/q, and the SAME amount has many equivalent
   names (1/2 = 2/4 = 3/6).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.

   The signature centerpiece is the PARTITIONED WHOLE — the area / part-whole
   model, deliberately DIFFERENT from the Decimal lab's 10x10 grid and the
   Rational lab's number-line band.  One whole is drawn as a BAR cut into q
   equal parts with p shaded; the SAME fraction is echoed as a PIE cut into q
   sectors; and a slim NUMBER LINE places it between 0 and 2.  The equivalence
   idea gets its own engine: the SPLIT dial slices every part into k smaller
   parts, so the shaded region never changes while its name becomes (k·p)/(k·q)
   — "same amount, more (thinner) pieces," which is *why* equivalent fractions
   are equal.

   One-accent discipline, adapted for a part-whole lab: CARMINE (the accent) is
   the fraction itself — the numerator, the shaded parts, the value on the line.
   BLUE is the WHOLE's structure — the denominator and the cut lines that make
   the equal parts.  GOLD marks the equivalence (the split).  The child's eye
   ties the carmine symbol p/q to the carmine shaded area.

   All arithmetic is EXACT rational math on integers p and q — reduce by gcd,
   compare by cross-multiplication (p1·q2 vs p2·q1), never by decimals — so a
   K-12 student never sees a float artefact and 1/3 is never "0.333…4".  Only
   pixel positions divide.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FractionLab.jsx
     2. Import and render it:
          import FractionLab from './FractionLab';
          export default function Page() { return <FractionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (numerator p,
              denominator q, split k, lesson step).
     MODEL  — the math is exact rational arithmetic; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Two dials define the fraction; a third renames it.
     q — the DENOMINATOR: how many EQUAL parts the whole is cut into (1…12).
         Unlocks first (step 1) because you must cut before you can count.
     p — the NUMERATOR: how many of those parts you take (0…2q, so improper
         fractions up to two wholes are reachable). Unlocks step 2.
     k — the SPLIT: cut each part into k smaller parts, renaming p/q as
         (k·p)/(k·q) WITHOUT changing the amount. Unlocks step 4 (equivalence).

   Value is capped at 2 wholes (p ≤ 2q) so at most two bars / two pies are ever
   drawn and every part stays countable.
   ------------------------------------------------------------------------- */
const Q_MIN = 1;
const Q_MAX = 12;
const WHOLES_MAX = 2; // value ≤ 2
const numMax = (q) => WHOLES_MAX * q; // numerator dial max for a given q
// keep the split legible: k·q sub-parts, capped so the bar never turns to mush
const kMax = (q) => Math.max(1, Math.min(4, Math.floor(24 / q)));

const START = { p: 3, q: 4, k: 1 }; // 3/4 — a friendly proper fraction

const DENOM_STEP = 1; // denominator dial unlocks
const NUM_STEP = 2; // numerator dial unlocks
const WHOLE_STEP = 3; // improper / mixed numbers
const EQUIV_STEP = 4; // split dial unlocks — equivalent fractions
const COMPARE_STEP = 5;
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Exact rational arithmetic on integers. No floats.
   ------------------------------------------------------------------------- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
// lowest terms; 0 → 0/1
function reduce(p, q) {
  if (p === 0) return { p: 0, q: 1 };
  const g = gcd(p, q);
  return { p: p / g, q: q / g };
}
// exact equality of two fractions by cross-multiplication (q's are > 0)
const fracEqual = (p1, q1, p2, q2) => p1 * q2 === p2 * q1;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): match a mystery shaded amount by setting the dials. Because
   equivalent fractions are equal, ANY fraction with the target's value counts
   (2/4 calibrates a 1/2 target) — the challenge actively rewards the
   equivalence insight from step 4. The match test is EXACT integer
   cross-multiplication; the meter is a linear closeness in value.
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 0.5; // half a whole spread across the meter
const matchPercent = (p, q, tp, tq) =>
  100 * Math.max(0, 1 - Math.abs(p * tq - tp * q) / (q * tq) / MATCH_SCALE);
const isCalibrated = (p, q, tp, tq) => fracEqual(p, q, tp, tq);

// A friendly target: reduced denominator 2…8, value in (0, 2), never an integer,
// and different in value from the previous target.
function makeTarget(prev) {
  for (let guard = 0; guard < 500; guard++) {
    const tq = 2 + Math.floor(Math.random() * 7); // 2…8
    const tp = 1 + Math.floor(Math.random() * (WHOLES_MAX * tq - 1)); // 1…2q-1
    if (tp % tq === 0) continue; // skip whole numbers — keep it a fraction
    const r = reduce(tp, tq);
    if (prev && fracEqual(r.p, r.q, prev.p, prev.q)) continue;
    return r; // store the reduced target
  }
  return { p: 1, q: 2 };
}

/* ---------------------------------------------------------------------------
   Formatting helpers — exact, built from the integers p and q.
   ------------------------------------------------------------------------- */
const ONES_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS_WORDS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words99(n) {
  if (n < 20) return ONES_WORDS[n];
  const t = Math.floor(n / 10);
  const r = n % 10;
  return TENS_WORDS[t] + (r ? '-' + ONES_WORDS[r] : '');
}

// ordinal names for the denominator (the size of one part)
const DENOM = {
  2: 'half', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth',
  7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth',
};
function denomName(q, count) {
  const base = DENOM[q] || `1/${q}`;
  if (count === 1) return base;
  return q === 2 ? 'halves' : base + 's';
}

// "three fourths", "one half", "one and one fourth", "two"
function readFraction(p, q) {
  if (p === 0) return 'zero';
  if (q === 1) return words99(p);
  const whole = Math.floor(p / q);
  const rem = p - whole * q;
  if (rem === 0) return words99(whole); // an exact whole number
  const fracPart = `${words99(rem)} ${denomName(q, rem)}`;
  return whole === 0 ? fracPart : `${words99(whole)} and ${fracPart}`;
}

// mixed-number string for an improper fraction: "1 1/4", or the whole "2"
function mixedString(p, q) {
  if (p % q === 0) return String(p / q);
  const whole = Math.floor(p / q);
  const rem = p - whole * q;
  return whole > 0 ? `${whole} ${rem}/${q}` : `${rem}/${q}`;
}

// exact terminating decimal, else a rounded "≈ …" (display only, never for math)
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
  return '≈ ' + (Math.round((p / q) * 1000) / 1000) + '…';
}

/* EDIT 5 — Equation display. The fraction p/q stacked, numerator carmine (the
   count / the accent) over a bar over denominator blue (the whole's cut). Built
   with INLINE styles, not styled-jsx classes: a styled-jsx <style jsx> only
   scopes elements in the component that declares it, so a child readout would
   lose its colours in a plain (non-Next) preview. Inlining keeps it identical
   in Next.js and in the verification harness. */
const CARMINE = '#c81e4f';
const BLUE = '#3f74a6';
const GOLD = '#d9982b';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
function FractionReadout({ p, q, k }) {
  const stack = (top, bot, topColor, botColor) => (
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
      <span style={{ color: topColor, fontWeight: 700, fontSize: '26px', padding: '0 3px' }}>{top}</span>
      <span
        style={{
          height: '2px',
          alignSelf: 'stretch',
          background: INK,
          margin: '3px 0',
        }}
      />
      <span style={{ color: botColor, fontWeight: 700, fontSize: '26px', padding: '0 3px' }}>{bot}</span>
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      {stack(p, q, CARMINE, BLUE)}
      {k > 1 && (
        <>
          <span style={{ color: INK_SOFT, fontSize: '22px', fontWeight: 600 }}>=</span>
          {stack(k * p, k * q, CARMINE, BLUE)}
        </>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   fraction misconceptions (unequal parts, adding top+bottom, "bigger bottom =
   bigger number", 1/2 ≠ 2/4). Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet fractions',
    body:
      'A FRACTION names EQUAL parts of one whole. The bottom number is the ' +
      'DENOMINATOR — how many equal parts the whole is cut into. The top number is ' +
      'the NUMERATOR — how many of those parts you take. Right now the bar shows 3/4: ' +
      'one whole cut into 4 equal parts, with 3 shaded.',
    q: 'What must the parts of a fraction always be?',
    choices: ['Equal in size', 'Any size you like', 'Bigger toward the right'],
    answer: 0,
    feedback:
      'Every part must be the SAME size — that is what makes them "fourths." If a whole ' +
      'is cut into 4 UNequal pieces, no single piece is really 1/4. Fractions are built on ' +
      'equal parts of the whole.',
  },
  {
    title: 'The denominator cuts the whole',
    body:
      'The DENOMINATOR (bottom) is now live. Drag it: the whole splits into q equal ' +
      'parts, and one part is the UNIT FRACTION 1/q. Watch what happens to the size of a ' +
      'part as q grows — more parts, but each one smaller.',
    q: 'Cut one whole into 6 equal parts. How big is one part?',
    choices: ['1/6 — one sixth', '6 — six wholes', '1/3 — one third'],
    answer: 0,
    feedback:
      'One of 6 equal parts is 1/6, a unit fraction. And 1/6 is SMALLER than 1/4: the more ' +
      'parts you cut a whole into, the smaller each part becomes. The bottom number names the ' +
      'size of one part.',
  },
  {
    title: 'The numerator counts the parts',
    body:
      'The NUMERATOR (top) is now live. It counts how many parts you take: p/q is p copies ' +
      'of the unit fraction 1/q. Drag the numerator — or click the bar directly — to shade ' +
      'parts.',
    q: 'You shade 3 of 4 equal parts. What fraction is that?',
    choices: ['3/4 — three fourths', '4/3 — four thirds', '3/7 — shaded plus the leftover'],
    answer: 0,
    feedback:
      'Three shaded parts out of four equal parts is 3/4 — three copies of 1/4. The top counts, ' +
      'the bottom names the size. The "7" trap adds the numbers, but the denominator is the ' +
      'TOTAL number of equal parts, not the leftover ones.',
  },
  {
    title: 'One whole — and past it',
    body:
      'When the numerator equals the denominator, every part is shaded: q/q = 1 whole. Push ' +
      'the numerator further and it passes the denominator — an IMPROPER fraction that spills ' +
      'into a second whole and can be read as a MIXED number.',
    q: 'How much is 5/4?',
    choices: ['One whole and one fourth (1 1/4)', 'Less than one whole', 'Five wholes'],
    answer: 0,
    feedback:
      '5/4 is 4/4 (one whole) plus one more 1/4 = 1 1/4. When the top is at least the bottom, ' +
      'the fraction is one whole or more. And 4/4, 6/6, 12/12 all equal exactly 1.',
  },
  {
    title: 'Equivalent fractions — split each part',
    body:
      'The SPLIT dial is now live. It cuts each part into k smaller parts. The shaded amount ' +
      'never changes — but its NAME does: p/q becomes (k·p)/(k·q). That is why 1/2 = 2/4 = 3/6: ' +
      'same amount, more (thinner) pieces. Try 1/2, then split it.',
    q: 'Split halves into fourths. What is 1/2 the same as?',
    choices: ['2/4 — same amount, more pieces', '1/4 — half got smaller', '2/2 — a whole'],
    answer: 0,
    feedback:
      'Splitting each part in two turns 1/2 into 2/4 — the shaded region is identical, only ' +
      'renamed. Multiplying the top AND bottom by the same number gives an EQUIVALENT fraction. ' +
      'Going the other way (dividing both) gives the SIMPLEST form: 2/4 → 1/2.',
  },
  {
    title: 'Comparing fractions',
    body:
      'With the SAME denominator, more shaded parts means a bigger fraction (3/8 > 2/8). But ' +
      'with the SAME numerator, a BIGGER denominator makes SMALLER pieces — so 1/3 is bigger ' +
      'than 1/4, even though 4 > 3. Set the dials and see the pieces.',
    q: 'Which is greater, 1/3 or 1/4?',
    choices: [
      '1/3 — fewer parts means each part is bigger',
      '1/4 — 4 is more than 3',
      'They are equal',
    ],
    answer: 0,
    feedback:
      '1/3 > 1/4. Cutting a whole into 3 gives bigger pieces than cutting it into 4. When the ' +
      'numerators match, the SMALLER denominator wins. Comparing fractions is about the size of ' +
      'the pieces — not just which digits look bigger.',
  },
  {
    title: 'Build the fraction',
    body:
      'Final challenge. A grey target shades a mystery amount and names a fraction. Set the ' +
      'denominator and numerator so your bar shades the SAME amount — the meter reads ' +
      'CALIBRATED. Any equal fraction counts: 2/4 matches a 1/2 target! Press "New target" for ' +
      'a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FractionLab() {
  const [p, setP] = useState(START.p);
  const [q, setQ] = useState(START.q);
  const [k, setK] = useState(START.k);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // reduced { p, q }
  const [filling, setFilling] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // { type:'barpart', index } | null
  const fillRef = useRef(null); // during the fill animation: # of shaded parts shown
  const geoRef = useRef({}); // layout geometry, written by draw(), read by handlers
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  const red = reduce(p, q);
  const alreadySimplest = red.p === p && red.q === q;
  const improper = q > 0 && p >= q && p % q !== 0;
  const reading = readFraction(p, q);

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    p,
    q,
    k,
    step,
    calib,
    target,
    shownParts: filling ? fillRef.current : null,
  };

  const pct = target != null ? matchPercent(p, q, target.p, target.q) : 0;
  const calibrated = target != null ? isCalibrated(p, q, target.p, target.q) : false;

  /* ---- value → screen transform + full redraw from state ------------------ */
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

    /* palette (kept in one place so the drawing matches the CSS tokens) */
    const PAPER = '#FBFBF8';
    const CARM = '#C81E4F'; // the fraction: numerator, shaded parts, the value — the accent
    const CARM_FILL = 'rgba(200,30,79,0.30)';
    const BLU = '#3F74A6'; // the whole's structure: denominator + cut lines
    const BLU_SOFT = 'rgba(63,116,166,0.14)';
    const GOLD_C = '#D9982B'; // equivalence (the split)
    const INK_C = '#1C2B3A';
    const INK_SOFT_C = '#5B6B7B';
    const MONO = 'px ui-monospace, "SF Mono", Menlo, monospace';

    const S = sceneRef.current;
    const P = S.p;
    const Q = S.q;
    const K = S.k;
    const shownParts = S.shownParts == null ? P : Math.min(P, S.shownParts);
    const nW = Math.max(1, Math.ceil(P / Q)); // wholes to draw (1 or 2)

    ctx.clearRect(0, 0, W, H);

    const pad = 16;
    const bandW = W - 2 * pad;

    // faint quadrille backdrop
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    for (let gx = 0; gx <= W; gx += 24) {
      const X = Math.round(gx) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    ctx.stroke();

    /* ============================ FRACTION BAR ============================ */
    const barTop = 22;
    const barH = Math.round(H * 0.24);
    const uw = bandW / nW; // width of one whole
    const pw = uw / Q; // width of one part
    const subs = K > 1 ? K : 1; // split sub-divisions

    // equivalence tag above the bar
    if (K > 1) {
      ctx.fillStyle = GOLD_C;
      ctx.font = '700 14' + MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${P}/${Q}  =  ${K * P}/${K * Q}`, pad + bandW / 2, barTop - 5);
    }

    for (let w = 0; w < nW; w++) {
      const x0 = pad + w * uw;
      // whole background
      ctx.fillStyle = PAPER;
      ctx.fillRect(x0, barTop, uw, barH);

      // shade the taken parts (carmine); complete-whole parts still carmine —
      // the fraction is the whole shaded amount
      for (let i = 0; i < Q; i++) {
        const partIndex = w * Q + i;
        if (partIndex < shownParts) {
          ctx.fillStyle = CARM_FILL;
          ctx.fillRect(x0 + i * pw, barTop, pw, barH);
        }
      }

      // split sub-division lines (gold dashed) — same area, more pieces
      if (subs > 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(217,152,43,0.9)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (let i = 0; i < Q; i++) {
          for (let j = 1; j < subs; j++) {
            const X = Math.round(x0 + i * pw + (j * pw) / subs) + 0.5;
            ctx.moveTo(X, barTop);
            ctx.lineTo(X, barTop + barH);
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      // part separators (blue) — the equal cuts
      ctx.strokeStyle = BLU;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 1; i < Q; i++) {
        const X = Math.round(x0 + i * pw) + 0.5;
        ctx.moveTo(X, barTop);
        ctx.lineTo(X, barTop + barH);
      }
      ctx.stroke();

      // whole outline (bold ink)
      ctx.strokeStyle = INK_C;
      ctx.lineWidth = 2.4;
      ctx.strokeRect(x0 + 0.5, barTop + 0.5, uw - 1, barH - 1);

      // "1 whole" brace label under each whole
      ctx.fillStyle = INK_SOFT_C;
      ctx.font = '600 11' + MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('1 whole', x0 + uw / 2, barTop + barH + 5);
    }

    // hover: outline the part under the pointer + label it 1/q
    const hv = hoverRef.current;
    if (hv && hv.type === 'barpart' && hv.index < nW * Q) {
      const w = Math.floor(hv.index / Q);
      const i = hv.index % Q;
      const hx = pad + w * uw + i * pw;
      ctx.save();
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 2.4;
      ctx.strokeRect(hx + 1.2, barTop + 1.2, pw - 2.4, barH - 2.4);
      ctx.fillStyle = INK_C;
      ctx.font = '700 12' + MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`1/${Q}`, hx + pw / 2, barTop + barH / 2);
      ctx.restore();
    } else {
      // otherwise, label the size of one part on the first part
      ctx.save();
      ctx.fillStyle = INK_SOFT_C;
      ctx.font = '700 12' + MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const one = `1/${Q}`;
      if (pw > ctx.measureText(one).width + 8) {
        ctx.fillText(one, pad + pw / 2, barTop + barH / 2);
      }
      ctx.restore();
    }

    // store bar geometry for hit-testing
    const geo = { bar: { x0: pad, top: barTop, uw, pw, barH, nW, Q } };

    /* =============================== PIES ================================ */
    // the same fraction as circular area — one pie per whole, sectors shaded
    const pieTop = barTop + barH + 26;
    const pieH = Math.round(H * 0.24);
    const rMax = Math.min(pieH / 2 - 2, uw / 2 - 10, 52);
    if (rMax > 10) {
      for (let w = 0; w < nW; w++) {
        const cx = pad + w * uw + uw / 2;
        const cy = pieTop + pieH / 2;
        const r = rMax;
        for (let i = 0; i < Q; i++) {
          const partIndex = w * Q + i;
          const a0 = (i / Q) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((i + 1) / Q) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, a0, a1);
          ctx.closePath();
          ctx.fillStyle = partIndex < shownParts ? CARM_FILL : PAPER;
          ctx.fill();
          ctx.strokeStyle = BLU;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        // outer ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = INK_C;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    /* ============================ NUMBER LINE ============================ */
    const lineY = Math.min(pieTop + pieH + 34, H - 30);
    const nx0 = pad + 6;
    const nx1 = W - pad - 6;
    const vmax = WHOLES_MAX; // 0 … 2 (fixed, so the line never jumps)
    const nx = (v) => nx0 + (v / vmax) * (nx1 - nx0);
    geo.line = { x0: nx0, x1: nx1, y: lineY, vmax };

    // baseline
    ctx.strokeStyle = 'rgba(28,43,58,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nx0, lineY + 0.5);
    ctx.lineTo(nx1, lineY + 0.5);
    ctx.stroke();

    // ticks: 1/q minor across each whole, integers major + labelled
    ctx.textAlign = 'center';
    for (let n = 0; n <= vmax * Q; n++) {
      const v = n / Q;
      const X = nx(v);
      const major = n % Q === 0;
      ctx.strokeStyle = major ? 'rgba(28,43,58,0.75)' : 'rgba(63,116,166,0.6)';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(X + 0.5, lineY);
      ctx.lineTo(X + 0.5, lineY + (major ? 11 : 6));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = INK_C;
        ctx.font = '600 12' + MONO;
        ctx.textBaseline = 'top';
        ctx.fillText(String(n / Q), X, lineY + 13);
      }
    }

    // calibration: grey dashed target marker + name
    if (S.calib && S.target != null) {
      const tv = S.target.p / S.target.q;
      const X = nx(tv);
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.95)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(X, lineY - 30);
      ctx.lineTo(X, lineY + 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK_SOFT_C;
      ctx.font = '700 12' + MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`build ${S.target.p}/${S.target.q}`, X, lineY - 33);
      ctx.restore();
    }

    // hover ghost marker on the line
    if (hv && hv.type === 'line') {
      const X = nx(hv.v);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.32)';
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(X, lineY - 14);
      ctx.lineTo(X, lineY);
      ctx.stroke();
      ctx.restore();
    }

    // the value marker (carmine dot + p/q pill)
    {
      const X = nx(Math.min(vmax, P / Q));
      ctx.save();
      ctx.fillStyle = CARM;
      ctx.beginPath();
      ctx.arc(X, lineY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 2;
      ctx.stroke();

      const pill = `${P}/${Q}`;
      ctx.font = '700 14' + MONO;
      const tw = ctx.measureText(pill).width;
      const bw = tw + 16;
      const bh = 22;
      const half = bw / 2 + 4;
      const px = Math.min(Math.max(X, nx0 + half), nx1 - half);
      const py = lineY - bh - 12;
      const bxp = px - bw / 2;
      const rr = 6;
      ctx.fillStyle = CARM;
      ctx.beginPath();
      ctx.moveTo(bxp + rr, py);
      ctx.arcTo(bxp + bw, py, bxp + bw, py + bh, rr);
      ctx.arcTo(bxp + bw, py + bh, bxp, py + bh, rr);
      ctx.arcTo(bxp, py + bh, bxp, py, rr);
      ctx.arcTo(bxp, py, bxp + bw, py, rr);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pill, px, py + bh / 2 + 0.5);
      ctx.restore();
    }

    geoRef.current = geo;
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [p, q, k, step, target, filling, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it; reset the
     dials so it starts clearly un-matched (like the decimal / cube labs). */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setP(0);
      setQ(2);
      setK(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the fill animation — shaded parts appear one at a time, time-based, opt-in,
     and respectful of reduced motion */
  useEffect(() => {
    if (!filling) {
      fillRef.current = null;
      draw();
      return;
    }
    if (p === 0) {
      setFilling(false);
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setFilling(false);
      return;
    }
    let raf;
    let start = null;
    const total = 1000; // ms for the whole shade-in, regardless of count
    const per = total / p;
    fillRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const t = now - start;
      fillRef.current = Math.min(p, Math.floor(t / per));
      draw();
      if (t < total) raf = requestAnimationFrame(loop);
      else {
        fillRef.current = null;
        setFilling(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [filling, p, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (filling) setFilling(false);
    if (key === 'q') {
      const nq = Math.max(Q_MIN, Math.min(Q_MAX, v));
      setQ(nq);
      setP((cur) => Math.min(cur, numMax(nq))); // keep p ≤ 2q
      setK((cur) => Math.min(cur, kMax(nq))); // keep the split legible
    } else if (key === 'p') {
      setP(Math.max(0, Math.min(numMax(q), v)));
    } else {
      setK(Math.max(1, Math.min(kMax(q), v)));
    }
  };

  const hitBarPart = (x, y) => {
    const geo = geoRef.current;
    if (!geo || !geo.bar) return null;
    const b = geo.bar;
    if (x < b.x0 || x > b.x0 + b.nW * b.uw) return null;
    if (y < b.top || y > b.top + b.barH) return null;
    const w = Math.min(b.nW - 1, Math.max(0, Math.floor((x - b.x0) / b.uw)));
    const i = Math.min(b.Q - 1, Math.max(0, Math.floor((x - (b.x0 + w * b.uw)) / b.pw)));
    return w * b.Q + i;
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = hitBarPart(x, y);
    if (idx != null) {
      hoverRef.current = { type: 'barpart', index: idx };
      draw();
      return;
    }
    const geo = geoRef.current;
    const ln = geo && geo.line;
    if (ln && Math.abs(y - ln.y) <= 20 && x >= ln.x0 && x <= ln.x1) {
      const v = ((x - ln.x0) / (ln.x1 - ln.x0)) * ln.vmax;
      hoverRef.current = { type: 'line', v: Math.max(0, Math.min(ln.vmax, v)) };
      draw();
      return;
    }
    if (hoverRef.current) {
      hoverRef.current = null;
      draw();
    }
  };
  const onPointerLeave = () => {
    if (hoverRef.current) {
      hoverRef.current = null;
      draw();
    }
  };
  // click a bar part to set the numerator directly (when it is unlocked)
  const numUnlocked = step >= NUM_STEP || calib;
  const onPointerDown = (e) => {
    if (!numUnlocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = hitBarPart(x, y);
    if (idx == null) return;
    if (filling) setFilling(false);
    setP(Math.max(0, Math.min(numMax(q), idx + 1)));
  };

  const resetDials = () => {
    if (calib) {
      setP(0);
      setQ(2);
      setK(1);
    } else {
      setP(START.p);
      setQ(START.q);
      setK(START.k);
    }
    if (filling) setFilling(false);
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
    `The fraction is ${p} over ${q}, read ${reading}. ` +
    `The whole is cut into ${q} equal part${q === 1 ? '' : 's'} and ${p} ` +
    `${p === 1 ? 'part is' : 'parts are'} shaded. ` +
    (alreadySimplest ? 'It is in simplest form. ' : `In simplest form, ${red.p} over ${red.q}. `) +
    `As a decimal, ${decimalString(p, q)}.`;

  const PARAMS = [
    { key: 'p', name: 'numerator', sym: 'p', unlock: NUM_STEP, role: 'parts you shade (take)', cls: 'p' },
    { key: 'q', name: 'denominator', sym: 'q', unlock: DENOM_STEP, role: 'equal parts in one whole', cls: 'q' },
    { key: 'k', name: 'split ×k', sym: '×k', unlock: EQUIV_STEP, role: 'cut each part into k — same amount, new name', cls: 'k' },
  ];
  const valOf = { p, q, k };
  const maxOf = { p: numMax(q), q: Q_MAX, k: kMax(q) };
  const minOf = { p: 0, q: Q_MIN, k: 1 };

  return (
    <div className="flab">
      <header className="head">
        <h1>Fractions &amp; Equal Parts</h1>
        <p className="lede">
          A fraction <span className="mono">p/q</span> cuts one whole into <em>q equal parts</em> and
          takes <em>p</em> of them. See the same fraction three ways — shaded on a{' '}
          <span className="mono">bar</span>, on a <span className="mono">pie</span>, and as a{' '}
          <span className="mono">position</span> on a number line. Each dial unlocks with the lesson,
          so you cut before you count.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <FractionReadout p={p} q={q} k={k} />
            </p>
            <p className="equation-sub mono">
              {reading}
              {improper ? `  ·  ${mixedString(p, q)}` : ''}
              {'  ·  = '}
              {decimalString(p, q)}
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
            <span className="hint mono">
              bar &amp; pie = one whole in {q} equal parts · {numUnlocked ? 'click a part to shade' : 'shaded amount'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — ${p}/${q} equals the target ${target.p}/${target.q}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Fraction</span>
              <span className="fact-v mono carm big">
                {p}/{q}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">In words</span>
              <span className="fact-v">{reading}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Simplest form</span>
              <span className="fact-v mono">
                {red.p}/{red.q}
                {alreadySimplest ? ' (already simplest)' : ''}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">{improper ? 'Mixed number' : 'As a decimal'}</span>
              <span className="fact-v mono">{improper ? mixedString(p, q) : decimalString(p, q)}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (filling ? ' on' : '')}
              onClick={() => setFilling((f) => !f)}
              disabled={p === 0}
            >
              {filling ? 'Shading…' : 'Shade the parts'}
            </button>
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
                  <span className="mono target-hint">
                    build {target.p}/{target.q}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setP(0);
                  setQ(2);
                  setK(1);
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
                  setP(START.p);
                  setQ(START.q);
                  setK(START.k);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">p/q = p copies of the unit fraction 1/q</span> &nbsp;·&nbsp; equal
        parts of a whole, shown as a bar, a pie, and a point on a number line (CCSS 3.NF.A).
      </footer>

      <style jsx>{`
        .flab {
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
          aspect-ratio: 7 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* On narrow screens the 7:5 ratio gets too short for the stacked bands
           (bar, pies, line), so go taller there. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
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
