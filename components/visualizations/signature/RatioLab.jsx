'use client';

/* ============================================================================
   RatioLab — an interactive "bench" for RATIOS: a MULTIPLICATIVE comparison of
   two quantities.  A ratio a : b says "for every a of the first quantity there
   are b of the second."  Its load-bearing idea is EQUIVALENCE by scaling: multi-
   plying BOTH terms by the same number names the SAME ratio, so 2:3 = 4:6 = 6:9.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grade 6
   (CCSS 6.RP.A.1 — understand a ratio as a comparison of two quantities;
   6.RP.A.3.A — build tables of equivalent ratios; 6.RP.A.2/3.B — unit rate).
   A child who already knows fractions and multiplication meets the ratio idea
   and the three misconceptions that trip every beginner: (1) a ratio is NOT its
   reverse (2:3 ≠ 3:2 — order matters), (2) you make an equivalent ratio by
   MULTIPLYING both terms, never by ADDING the same number to each (2:3 → 4:6,
   not 5:6), and (3) a ratio compares parts to PARTS, but the same numbers also
   tell you parts to the WHOLE (2:3 ⇒ 2 of every 5 are red).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.

   The signature centerpiece — deliberately DIFFERENT from every sibling lab —
   is the BATCH TAPE married to a DOUBLE NUMBER LINE:
     • the BATCH TAPE (hero) is one whole made of n IDENTICAL batches, each batch
       = a red tiles followed by b blue tiles.  Because every batch is the same,
       "scale up" is literally "add another identical batch," and equivalent
       ratios (a:b = na:nb) become something you SEE, not memorize.  Within one
       batch you also read part-to-whole: a of the a+b tiles are red.  This is
       distinct from the Fraction lab's cut-one-whole bar and the Percentage
       lab's 10×10 grid — here TWO co-varying quantities repeat as a unit.
     • the DOUBLE NUMBER LINE is the canonical grade-6 ratio tool: quantity A on
       a top line, quantity B on a bottom line, ticked at each batch so every
       vertical pair (ka, kb) sits in the same ratio.  It turns the tape's
       repetition into a ratio TABLE you can read numerically.

   One-accent discipline, adapted for a TWO-object lab (as ComparingLab did):
   the two quantities own the two colours — A is CARMINE (the accent object),
   B its restrained BLUE companion.  GOLD marks the SCALING / equivalence (the
   batches and the ×n dial), never a quantity.  GREEN is reserved for "the
   answer" — the CALIBRATED stamp.  The child's eye ties the carmine term a to
   the carmine tiles, the blue term b to the blue tiles.

   All arithmetic is EXACT integer math on a, b, n — reduce by gcd, compare and
   test equivalence by cross-multiplication (a·d vs b·c), never by decimals — so
   a K-12 student never meets a float artefact.  Only pixel positions divide,
   and the unit-rate/decimal readout is built digit-by-digit (exact, or marked
   "≈" when it repeats).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/RatioLab.jsx
     2. Import and render it:
          import RatioLab from './RatioLab';
          export default function Page() { return <RatioLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (terms a, b; scale n;
              lesson step).
     MODEL  — the math is exact integer ratio arithmetic; it knows no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three dials, unlocked as the lesson earns them.
     a — the FIRST term (antecedent): red tiles in one batch (1…6). Unlocks
         step 1 — you meet a ratio one quantity at a time.
     b — the SECOND term (consequent): blue tiles in one batch (1…6). Unlocks
         step 2 — now you have a full ratio a:b.
     n — the SCALE / number of BATCHES (1…5). Unlocks step 4 — repeating the
         batch is the equivalent-ratio engine (a:b = na:nb), the way the split
         dial drove equivalence in the Fraction lab.
   Terms are capped at 6 and batches at 5 so at most (6+6)·5 = 60 tiles are ever
   drawn and every batch stays countable.
   ------------------------------------------------------------------------- */
const A_MIN = 1;
const A_MAX = 6;
const B_MIN = 1;
const B_MAX = 6;
const N_MIN = 1;
const N_MAX = 5;

const START = { a: 2, b: 3, n: 1 }; // 2:3 — a friendly, clearly-unequal ratio

const A_STEP = 1; // first term unlocks
const B_STEP = 2; // second term unlocks
const WHOLE_STEP = 3; // part-to-part vs part-to-whole (no new dial)
const SCALE_STEP = 4; // batches ×n unlock — equivalent ratios
const RATE_STEP = 5; // simplest form & unit rate (no new dial)
const CALIB_STEP = 6; // build the ratio (calibration)

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Exact integer ratio arithmetic. No floats.
   ------------------------------------------------------------------------- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
// simplest form of a ratio: divide both terms by their gcd
function reduceRatio(a, b) {
  const g = gcd(a, b) || 1;
  return { a: a / g, b: b / g };
}
// lowest-terms fraction (for part-to-whole shares); 0 → 0/1
function reduceFrac(p, q) {
  if (p === 0) return { p: 0, q: 1 };
  const g = gcd(p, q);
  return { p: p / g, q: q / g };
}
// two ratios are equal ⟺ a·d = b·c  (all terms > 0, exact integers)
const ratioEqual = (a, b, c, d) => a * d === b * c;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): a mystery target mix ta:tb is shown; set your terms so your
   ratio is EQUIVALENT to it. Because equivalent ratios ARE the same ratio, ANY
   equivalent build counts (4:6 calibrates a 2:3 target) — the challenge actively
   rewards the equivalence insight from step 4, and the scale dial n never
   changes the match (na:nb is still equivalent), which is the whole point.

   The match TEST is exact integer cross-multiplication (a·tb = b·ta). The METER
   is the closeness of the two "red shares"  fA = a/(a+b)  and  fT = ta/(ta+tb),
   a bounded [0,1] quantity, computed from the exact integer distance
   |a·tb − b·ta| / ((a+b)(ta+tb)). That numerator is 0 EXACTLY when the ratios
   are equivalent, so the meter reads a clean 100% iff calibrated — no float.
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 0.34; // red-share spread across the meter (~a third of [0,1])
const shareDistNum = (a, b, ta, tb) => Math.abs(a * tb - b * ta); // exact integer
const matchPercent = (a, b, ta, tb) =>
  100 * Math.max(0, 1 - shareDistNum(a, b, ta, tb) / ((a + b) * (ta + tb)) / MATCH_SCALE);
const isCalibrated = (a, b, ta, tb) => ratioEqual(a, b, ta, tb);

// A friendly target: a REDUCED ratio with terms 1…5 (so it is directly buildable
// and its doubles fit the dials), and NOT equivalent to the previous target.
function makeTarget(prev) {
  for (let guard = 0; guard < 500; guard++) {
    const ta = 1 + Math.floor(Math.random() * 5); // 1…5
    const tb = 1 + Math.floor(Math.random() * 5); // 1…5
    if (gcd(ta, tb) !== 1) continue; // keep it in simplest form
    if (ta === tb && ta !== 1) continue; // the only reduced equal ratio is 1:1
    if (prev && ratioEqual(ta, tb, prev.a, prev.b)) continue;
    return { a: ta, b: tb };
  }
  return { a: 2, b: 3 };
}

/* ---------------------------------------------------------------------------
   Formatting helpers — exact, built from the integers.
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
// "two to three", "one to one"
function readRatio(a, b) {
  return `${words99(a)} to ${words99(b)}`;
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

/* EDIT 5 — Equation display. The ratio a : b with a carmine (quantity A) and b
   blue (quantity B), a neutral colon between. When n > 1, the scaled equivalent
   na : nb is shown after an "=", tagged gold to name the scaling. Built with
   INLINE styles, not styled-jsx classes: a <style jsx> only scopes elements in
   the component that declares it, so a child readout would lose its colours in a
   plain (non-Next) preview. Inlining keeps it identical in Next.js and in the
   verification harness. */
const CARMINE = '#c81e4f';
const BLUE = '#3f74a6';
const GOLD = '#d9982b';
const INK_SOFT = '#5b6b7b';
function RatioReadout({ a, b, n }) {
  const pair = (x, y) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span style={{ color: CARMINE, fontWeight: 700, fontSize: '28px' }}>{x}</span>
      <span style={{ color: INK_SOFT, fontWeight: 700, fontSize: '24px' }}>:</span>
      <span style={{ color: BLUE, fontWeight: 700, fontSize: '28px' }}>{y}</span>
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      {pair(a, b)}
      {n > 1 && (
        <>
          <span style={{ color: INK_SOFT, fontSize: '22px', fontWeight: 600 }}>=</span>
          {pair(a * n, b * n)}
          <span
            style={{
              color: GOLD,
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              fontSize: '12px',
              fontWeight: 700,
              border: `1px solid ${GOLD}`,
              borderRadius: '5px',
              padding: '2px 5px',
              whiteSpace: 'nowrap',
            }}
          >
            ×{n}
          </span>
        </>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   ratio misconceptions (reverse ≠ same, ADD-instead-of-multiply, part-to-whole
   confusion). Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What a ratio is',
    body:
      'A RATIO compares two quantities. Here one BATCH holds red tiles and blue tiles. ' +
      'The ratio 2:3 (read "two to three") means: for every 2 red tiles there are 3 blue tiles. ' +
      'It is a comparison — not a total.',
    q: 'What does the ratio 2:3 tell you?',
    choices: [
      'For every 2 red, there are 3 blue',
      'There are exactly 2 red and 3 blue, never more',
      'There are 2 + 3 = 5 red tiles',
    ],
    answer: 0,
    feedback:
      'A ratio is a "for every" comparison: 2 red for every 3 blue. It fixes the COMPARISON, ' +
      'not the amounts — 2:3 could be 2 and 3, or 20 and 30. That "same comparison, different ' +
      'amounts" idea is what makes ratios powerful.',
  },
  {
    title: 'The first term',
    body:
      'The FIRST term (a) counts the red tiles in one batch — it is now live and carmine. ' +
      'Drag it and watch the red group grow or shrink while the blue group stays fixed. The ' +
      'first term always names the first quantity you say out loud.',
    q: 'In the ratio 5:3, what does the 5 count?',
    choices: ['The red tiles (first quantity)', 'The blue tiles', 'The total tiles'],
    answer: 0,
    feedback:
      'Order tells you which is which: in 5:3 the 5 is the FIRST quantity (red) and the 3 is the ' +
      'second (blue). Say them in the same order you write them — "five to three."',
  },
  {
    title: 'The second term — a full ratio',
    body:
      'The SECOND term (b) is now live and blue — it counts the blue tiles in one batch. Now ' +
      'both terms move, so you can build any ratio a:b. Try making 3:1, then 1:4 — notice a:b and ' +
      'b:a look completely different.',
    q: 'Is the ratio 2:3 the same as 3:2?',
    choices: [
      'No — order matters, they are different ratios',
      'Yes — the numbers are the same',
      'Yes — you can always flip a ratio',
    ],
    answer: 0,
    feedback:
      '2:3 and 3:2 are DIFFERENT. 2:3 is mostly blue (more blue than red); 3:2 is mostly red. ' +
      'Swapping the terms swaps which quantity is bigger, so the ratio is not the same. Order is ' +
      'part of a ratio’s meaning.',
  },
  {
    title: 'Part-to-part and part-to-whole',
    body:
      'a:b compares a PART to a PART (red to blue). But the same batch also has a WHOLE of ' +
      'a + b tiles, so the same numbers give part-to-whole fractions: a out of a+b are red. ' +
      'For 2:3 the whole batch is 5 tiles, so 2/5 are red and 3/5 are blue.',
    q: 'In the ratio 2:3, what fraction of all the tiles are red?',
    choices: ['2/5 — 2 red out of 5 total', '2/3 — red compared to blue', '3/5 — most of them'],
    answer: 0,
    feedback:
      'The whole batch is 2 + 3 = 5 tiles, and 2 of them are red, so 2/5 are red (and 3/5 blue). ' +
      'The 2/3 trap uses the OTHER PART (blue) as the whole — but the whole is the TOTAL, a + b, ' +
      'not the second term.',
  },
  {
    title: 'Equivalent ratios — add a batch',
    body:
      'The BATCHES dial (×n) is now live and gold. Every batch is IDENTICAL, so adding batches ' +
      'multiplies BOTH terms by the same number: 2:3 = 4:6 = 6:9. Same ratio, bigger amounts. ' +
      'Watch the double number line — every stacked pair is the same ratio.',
    q: 'Which ratio is EQUIVALENT to 2:3?',
    choices: [
      '6:9 — multiply both terms by 3',
      '5:6 — add 3 to each term',
      '4:5 — add 2 to each term',
    ],
    answer: 0,
    feedback:
      'Multiply BOTH terms by the same number: 2:3 = 6:9 (×3). The "5:6" and "4:5" traps ADD the ' +
      'same number to each — but adding changes the ratio (5:6 has almost equal parts; 2:3 does ' +
      'not). Equivalent ratios come from MULTIPLYING, never adding.',
  },
  {
    title: 'Simplest form & the unit rate',
    body:
      'Run scaling backwards: divide both terms by their greatest common factor to reach ' +
      'SIMPLEST FORM (6:9 → 2:3). Divide the whole way down to ONE and you get the UNIT RATE — ' +
      'how many of one quantity per single unit of the other (2:3 → 1 red : 1.5 blue).',
    q: 'Write 6:9 in simplest form.',
    choices: ['2:3 — divide both by 3', '3:6 — divide both by 2', '6:9 is already simplest'],
    answer: 0,
    feedback:
      'The greatest common factor of 6 and 9 is 3, so 6:9 = 2:3 in simplest form — the smallest ' +
      'whole-number names for the same ratio. Keep dividing past whole numbers and you reach the ' +
      'unit rate 1 : 1.5, the ratio "per one."',
  },
  {
    title: 'Build the ratio',
    body:
      'Final challenge. A grey TARGET mix names a mystery ratio. Set your terms so your ratio is ' +
      'EQUIVALENT to it — the meter reads CALIBRATED. Any equivalent build counts: 4:6 matches a ' +
      '2:3 target, and scaling with ×n never breaks the match. Press "New target" for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function RatioLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [n, setN] = useState(START.n);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // reduced { a, b }
  const [building, setBuilding] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // { type:'batch', index } | null
  const buildRef = useRef(null); // during the build animation: # of batches shown
  const geoRef = useRef({}); // layout geometry, written by draw(), read by handlers
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  const red = reduceRatio(a, b);
  const alreadySimplest = red.a === a && red.b === b;
  const whole = a + b;
  const faRed = reduceFrac(a, whole); // part-to-whole, red
  const faBlue = reduceFrac(b, whole); // part-to-whole, blue
  const reading = readRatio(a, b);

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    a,
    b,
    n,
    step,
    calib,
    target,
    shownBatches: building ? buildRef.current : null,
  };

  const pct = target != null ? matchPercent(a, b, target.a, target.b) : 0;
  const calibrated = target != null ? isCalibrated(a, b, target.a, target.b) : false;

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
    const CARM = '#C81E4F'; // quantity A — the accent object
    const CARM_FILL = 'rgba(200,30,79,0.26)';
    const BLU = '#3F74A6'; // quantity B — the companion object
    const BLU_FILL = 'rgba(63,116,166,0.24)';
    const GOLD_C = '#D9982B'; // the scaling / batches / equivalence
    const INK_C = '#1C2B3A';
    const INK_SOFT_C = '#5B6B7B';
    const MONO = 'px ui-monospace, "SF Mono", Menlo, monospace';

    const S = sceneRef.current;
    const A = S.a;
    const B = S.b;
    const per = A + B; // tiles per batch
    const N = S.shownBatches == null ? S.n : Math.min(S.n, S.shownBatches);
    const totalTiles = per * S.n; // full width is always sized for the full n

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

    const geo = {};

    /* =================== CALIBRATION TARGET (top strip) ================== */
    // A grey dashed PROPORTION bar for the mystery ratio — drawn as a proportion,
    // not tile counts, so 2:3 and 4:6 look identical (rewarding equivalence).
    let heroTop = 30;
    if (S.calib && S.target != null) {
      const tA = S.target.a;
      const tB = S.target.b;
      const tW = tA + tB;
      const ty = 16;
      const th = 16;
      const tx0 = pad;
      const tw = bandW;
      const split = tx0 + (tA / tW) * tw;
      ctx.save();
      // red share
      ctx.fillStyle = 'rgba(200,30,79,0.14)';
      ctx.fillRect(tx0, ty, split - tx0, th);
      // blue share
      ctx.fillStyle = 'rgba(63,116,166,0.14)';
      ctx.fillRect(split, ty, tx0 + tw - split, th);
      // dashed outline + split
      ctx.strokeStyle = 'rgba(91,107,123,0.95)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(tx0 + 0.5, ty + 0.5, tw - 1, th - 1);
      ctx.beginPath();
      ctx.moveTo(Math.round(split) + 0.5, ty);
      ctx.lineTo(Math.round(split) + 0.5, ty + th);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK_SOFT_C;
      ctx.font = '700 11' + MONO;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`target  ${tA}:${tB}`, tx0 + 4, ty + th / 2);
      ctx.restore();
      heroTop = ty + th + 20;
    }

    /* ========================= HERO: BATCH TAPE ========================== */
    // one whole = n identical batches, each batch = A red tiles then B blue tiles
    const tileW = bandW / totalTiles;
    const tapeTop = heroTop;
    const tapeH = Math.max(30, Math.round(H * 0.22));
    const drawnTiles = per * N; // tiles actually revealed (build animation)

    // batch bracket sizing
    const batchW = per * tileW;

    // tiles
    for (let k = 0; k < S.n; k++) {
      const bx0 = pad + k * batchW;
      const revealed = k < N;
      for (let i = 0; i < per; i++) {
        const x = bx0 + i * tileW;
        const isRed = i < A;
        if (revealed) {
          ctx.fillStyle = isRed ? CARM_FILL : BLU_FILL;
          ctx.fillRect(x, tapeTop, tileW, tapeH);
        } else {
          ctx.fillStyle = 'rgba(28,43,58,0.03)';
          ctx.fillRect(x, tapeTop, tileW, tapeH);
        }
        // tile separators (thin)
        ctx.strokeStyle = revealed
          ? isRed
            ? 'rgba(200,30,79,0.55)'
            : 'rgba(63,116,166,0.55)'
          : 'rgba(28,43,58,0.10)';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(x) + 0.5, tapeTop + 0.5, Math.max(1, tileW - 1), tapeH - 1);
      }
      // gold dashed batch separator (between this batch and the next)
      if (k > 0) {
        ctx.save();
        ctx.strokeStyle = GOLD_C;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        const X = Math.round(bx0) + 0.5;
        ctx.moveTo(X, tapeTop - 4);
        ctx.lineTo(X, tapeTop + tapeH + 4);
        ctx.stroke();
        ctx.restore();
      }
    }

    // whole-tape outline
    ctx.strokeStyle = INK_C;
    ctx.lineWidth = 2.2;
    ctx.strokeRect(pad + 0.5, tapeTop + 0.5, bandW - 1, tapeH - 1);

    // "1 batch = a:b" bracket under the first batch
    {
      const bx0 = pad;
      const bx1 = pad + batchW;
      const by = tapeTop + tapeH + 6;
      ctx.strokeStyle = GOLD_C;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx0 + 1, by);
      ctx.lineTo(bx0 + 1, by + 5);
      ctx.lineTo(bx1 - 1, by + 5);
      ctx.lineTo(bx1 - 1, by);
      ctx.stroke();
      ctx.fillStyle = GOLD_C;
      ctx.font = '700 11' + MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const lbl = `1 batch = ${A}:${B}`;
      // only label inside if it fits; else place to the right of the bracket
      if (batchW > ctx.measureText(lbl).width + 8) {
        ctx.fillText(lbl, (bx0 + bx1) / 2, by + 8);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(lbl, bx1 + 6, by);
      }
    }

    // running totals at the tape's right end (carmine A total, blue B total)
    {
      ctx.font = '700 12' + MONO;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'right';
      ctx.fillStyle = CARM;
      const totA = `${A * S.n} red`;
      const totB = `${B * S.n} blue`;
      ctx.fillText(totA, pad + bandW, tapeTop - 5);
      const wA = ctx.measureText(totA).width;
      ctx.fillStyle = INK_SOFT_C;
      ctx.fillText('  ·  ', pad + bandW - wA, tapeTop - 5);
      const wSep = ctx.measureText('  ·  ').width;
      ctx.fillStyle = BLU;
      ctx.fillText(totB, pad + bandW - wA - wSep, tapeTop - 5);
    }

    // hover / batch highlight
    const hv = hoverRef.current;
    if (hv && hv.type === 'batch' && hv.index < S.n) {
      const bx0 = pad + hv.index * batchW;
      ctx.save();
      ctx.strokeStyle = GOLD_C;
      ctx.lineWidth = 2.4;
      ctx.strokeRect(bx0 + 1.4, tapeTop + 1.4, batchW - 2.8, tapeH - 2.8);
      ctx.fillStyle = INK_C;
      ctx.font = '700 11' + MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lab = `batch ${hv.index + 1}`;
      if (batchW > ctx.measureText(lab).width + 8) {
        ctx.fillText(lab, bx0 + batchW / 2, tapeTop + tapeH / 2);
      }
      ctx.restore();
    }

    geo.tape = { x0: pad, top: tapeTop, w: bandW, h: tapeH, batchW, nBatches: S.n };

    /* ===================== DOUBLE NUMBER LINE ============================ */
    // quantity A (top, carmine) and quantity B (bottom, blue), ticked per batch;
    // every vertical pair (k·a, k·b) is the same ratio — the ratio TABLE.
    const dnlTop = tapeTop + tapeH + 34;
    const remaining = H - dnlTop - 14;
    const yA = dnlTop + Math.min(24, remaining * 0.32);
    // clamp the bottom line so its below-labels always clear the corner hint
    const yB = Math.min(dnlTop + Math.min(remaining - 6, remaining * 0.86), H - 44);
    const nx0 = pad + 44; // leave room for the axis labels on the left
    const nx1 = W - pad - 10;
    const xk = (k) => nx0 + (S.n === 0 ? 0 : (k / S.n) * (nx1 - nx0));

    if (yB - yA > 24) {
      // axis captions
      ctx.font = '700 11' + MONO;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = CARM;
      ctx.fillText('A', pad, yA);
      ctx.fillStyle = BLU;
      ctx.fillText('B', pad, yB);
      ctx.fillStyle = INK_SOFT_C;
      ctx.font = '600 9' + MONO;
      ctx.fillText('red', pad + 14, yA);
      ctx.fillText('blue', pad + 14, yB);

      // baselines
      ctx.strokeStyle = 'rgba(200,30,79,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nx0, yA + 0.5);
      ctx.lineTo(nx1, yA + 0.5);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(63,116,166,0.6)';
      ctx.beginPath();
      ctx.moveTo(nx0, yB + 0.5);
      ctx.lineTo(nx1, yB + 0.5);
      ctx.stroke();

      // per-batch ticks, labels, and gold vertical connectors
      for (let k = 0; k <= S.n; k++) {
        const X = xk(k);
        const lit = k <= N;
        // connector
        ctx.strokeStyle = lit ? 'rgba(217,152,43,0.75)' : 'rgba(217,152,43,0.18)';
        ctx.lineWidth = k === N && N > 0 ? 2 : 1;
        ctx.setLineDash(k === S.n ? [] : [3, 3]);
        ctx.beginPath();
        ctx.moveTo(X, yA);
        ctx.lineTo(X, yB);
        ctx.stroke();
        ctx.setLineDash([]);

        // A tick + label
        ctx.strokeStyle = CARM;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X + 0.5, yA - 5);
        ctx.lineTo(X + 0.5, yA + 5);
        ctx.stroke();
        ctx.fillStyle = lit ? CARM : 'rgba(200,30,79,0.4)';
        ctx.font = '700 11' + MONO;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(k * A), X, yA - 7);

        // B tick + label
        ctx.strokeStyle = BLU;
        ctx.beginPath();
        ctx.moveTo(X + 0.5, yB - 5);
        ctx.lineTo(X + 0.5, yB + 5);
        ctx.stroke();
        ctx.fillStyle = lit ? BLU : 'rgba(63,116,166,0.4)';
        ctx.textBaseline = 'top';
        ctx.fillText(String(k * B), X, yB + 7);
      }

      // dots at the current end (k = n)
      const Xend = xk(S.n);
      ctx.fillStyle = CARM;
      ctx.beginPath();
      ctx.arc(Xend, yA, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = BLU;
      ctx.beginPath();
      ctx.arc(Xend, yB, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    void drawnTiles;
    geoRef.current = geo;
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, n, step, target, building, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it. Start the
     dials from the REVERSED target (a common beginner error, and guaranteed NOT
     equivalent unless the target is symmetric) so it begins clearly un-matched. */
  useEffect(() => {
    if (current.calib && target == null) {
      const t = makeTarget(null);
      setTarget(t);
      if (t.a === t.b) {
        setA(1);
        setB(2);
      } else {
        setA(t.b);
        setB(t.a);
      }
      setN(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the build animation — batches appear one at a time, time-based, opt-in, and
     respectful of reduced motion */
  useEffect(() => {
    if (!building) {
      buildRef.current = null;
      draw();
      return;
    }
    if (n <= 1) {
      setBuilding(false);
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setBuilding(false);
      return;
    }
    let raf;
    let start = null;
    const total = 900; // ms for the whole build, regardless of batch count
    const per = total / n;
    buildRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const t = now - start;
      buildRef.current = Math.min(n, Math.floor(t / per) + 1);
      draw();
      if (t < total) raf = requestAnimationFrame(loop);
      else {
        buildRef.current = null;
        setBuilding(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [building, n, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (building) setBuilding(false);
    if (key === 'a') setA(Math.max(A_MIN, Math.min(A_MAX, v)));
    else if (key === 'b') setB(Math.max(B_MIN, Math.min(B_MAX, v)));
    else setN(Math.max(N_MIN, Math.min(N_MAX, v)));
  };

  const hitBatch = (x, y) => {
    const geo = geoRef.current;
    if (!geo || !geo.tape) return null;
    const t = geo.tape;
    if (x < t.x0 || x > t.x0 + t.w) return null;
    if (y < t.top || y > t.top + t.h) return null;
    const idx = Math.floor((x - t.x0) / t.batchW);
    return Math.max(0, Math.min(t.nBatches - 1, idx));
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = hitBatch(x, y);
    if (idx != null) {
      hoverRef.current = { type: 'batch', index: idx };
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
  // click a batch to set the number of batches directly (when ×n is unlocked)
  const scaleUnlocked = step >= SCALE_STEP || calib;
  const onPointerDown = (e) => {
    if (!scaleUnlocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = hitBatch(x, y);
    if (idx == null) return;
    if (building) setBuilding(false);
    setN(Math.max(N_MIN, Math.min(N_MAX, idx + 1)));
  };

  const resetDials = () => {
    if (calib && target != null) {
      if (target.a === target.b) {
        setA(1);
        setB(2);
      } else {
        setA(target.b);
        setB(target.a);
      }
      setN(1);
    } else {
      setA(START.a);
      setB(START.b);
      setN(START.n);
    }
    if (building) setBuilding(false);
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
    `The ratio is ${a} to ${b}. ` +
    `For every ${a} red ${a === 1 ? 'tile' : 'tiles'} there are ${b} blue ${b === 1 ? 'tile' : 'tiles'}. ` +
    (alreadySimplest
      ? 'It is in simplest form. '
      : `In simplest form, ${red.a} to ${red.b}. `) +
    `Out of every ${whole} tiles, ${a} are red, the fraction ${faRed.p} over ${faRed.q}. ` +
    (n > 1 ? `Scaled by ${n} batches, ${a * n} to ${b * n}. ` : '') +
    `The unit rate is 1 red to ${decimalString(b, a)} blue.`;

  const PARAMS = [
    { key: 'a', name: 'quantity A', sym: 'a', unlock: A_STEP, role: 'red tiles in one batch', cls: 'a' },
    { key: 'b', name: 'quantity B', sym: 'b', unlock: B_STEP, role: 'blue tiles in one batch', cls: 'b' },
    { key: 'n', name: 'batches ×n', sym: '×n', unlock: SCALE_STEP, role: 'repeat the batch — same ratio, bigger amounts', cls: 'n' },
  ];
  const valOf = { a, b, n };
  const maxOf = { a: A_MAX, b: B_MAX, n: N_MAX };
  const minOf = { a: A_MIN, b: B_MIN, n: N_MIN };

  return (
    <div className="rlab">
      <header className="head">
        <h1>Ratios &amp; Equivalent Ratios</h1>
        <p className="lede">
          A ratio <span className="mono">a : b</span> compares two quantities — <em>for every a
          red, there are b blue</em>. Build one <span className="mono">batch</span>, then repeat it:
          scaling both terms the same way keeps the ratio, so{' '}
          <span className="mono">2 : 3 = 4 : 6 = 6 : 9</span>. Each dial unlocks with the lesson.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <RatioReadout a={a} b={b} n={n} />
            </p>
            <p className="equation-sub mono">
              {reading}
              {'  ·  red '}
              {faRed.p}/{faRed.q}
              {'  ·  unit rate 1 : '}
              {decimalString(b, a)}
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
              {n} {n === 1 ? 'batch' : 'batches'} of {a}:{b}
              {scaleUnlocked ? ' · click to scale' : ''}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated
              ? ` Calibrated — ${a}:${b} is equivalent to the target ${target.a}:${target.b}.`
              : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Ratio (A : B)</span>
              <span className="fact-v mono big">
                <span className="carm">{a}</span>
                <span className="sep"> : </span>
                <span className="blu">{b}</span>
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Simplest form</span>
              <span className="fact-v mono">
                {red.a}:{red.b}
                {alreadySimplest ? ' (already simplest)' : ''}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Part-to-whole</span>
              <span className="fact-v mono">
                red {faRed.p}/{faRed.q} · blue {faBlue.p}/{faBlue.q}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Unit rate</span>
              <span className="fact-v mono">
                1 red : {decimalString(b, a)} blue
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (building ? ' on' : '')}
              onClick={() => setBuilding((f) => !f)}
              disabled={n <= 1}
            >
              {building ? 'Building…' : 'Build the batches'}
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
                    build {target.a}:{target.b}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  if (t.a === t.b) {
                    setA(1);
                    setB(2);
                  } else {
                    setA(t.b);
                    setB(t.a);
                  }
                  setN(1);
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
                  setA(START.a);
                  setB(START.b);
                  setN(START.n);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">a : b = na : nb</span> &nbsp;·&nbsp; a ratio is a multiplicative
        comparison; scaling both terms the same way names the same ratio (CCSS 6.RP.A).
      </footer>

      <style jsx>{`
        .rlab {
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
          min-height: 40px;
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
        /* On narrow screens the 7:5 ratio gets cramped for the stacked bands
           (tape, double line), so go a little taller there. */
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
        .fact-v.big {
          font-size: 21px;
          font-weight: 700;
        }
        .fact-v .carm {
          color: var(--curve);
        }
        .fact-v .blu {
          color: var(--addend);
        }
        .fact-v .sep {
          color: var(--ink-soft);
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
          background: var(--gold);
          border-color: var(--gold);
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
        .dk.a {
          color: var(--curve);
        }
        .dk.b {
          color: var(--addend);
        }
        .dk.n {
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
