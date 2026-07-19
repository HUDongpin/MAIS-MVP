'use client';

/* ============================================================================
   NumberLab — an interactive "bench" for what a NUMBER really is: PLACE VALUE
   and the base-ten system.  A multi-digit whole number is the sum of each
   digit times its place value:  N = d₃·1000 + d₂·100 + d₁·10 + d₀·1.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Place value is the
   single most foundational idea in the number strand (CCSS K.NBT, 1.NBT,
   2.NBT, 4.NBT), so this lab is pitched to grow with the child: it opens on a
   single digit in the ones place and unlocks a bigger place — tens, hundreds,
   thousands — one lesson step at a time, each place worth TEN TIMES the one to
   its right.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter.

   The signature centerpiece is the PLACE-VALUE CHART with BASE-TEN BLOCKS —
   the number analogue of the line's slope triangle or addition's count-on
   hops.  Each place is a column headed by its multiplier (×1, ×10, ×100,
   ×1000); inside, the digit is drawn AND shown as that many base-ten blocks
   (unit cubes, ten-rods, hundred-flats, thousand-cubes), so a child SEES that
   a "ten" is literally ten ones joined.  Directly beneath, on a single 0→N
   line, a PROPORTIONAL VALUE BAR splits the number into its place-value parts
   (3000 + 200 + 40 + 7), showing the very same number as one total length —
   the iconic (blocks) and linear (magnitude) models side by side.

   One-accent discipline, adapted for a PLACE-VALUE lab: the four places carry
   a restrained "hotter as bigger" ramp (ones = neutral slate, tens = blue,
   hundreds = teal, thousands = the carmine accent), so the carmine still marks
   the star — the largest place and the total value being built.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/NumberLab.jsx
     2. Import and render it:
          import NumberLab from './NumberLab';
          export default function Page() { return <NumberLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (four digits, step).
     MODEL  — the math is pure integer place value; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Four whole-number DIGITS, ones → thousands.  Each is a
   dial 0–9 that unlocks one lesson step later than the last, so a child meets
   one place at a time.  `unlock` is the step index at which the dial goes live.
   ------------------------------------------------------------------------- */
const PLACES = [
  { name: 'Ones', short: 'ones', mult: 1, unlock: 1, color: '#6B7A8F' }, // d0
  { name: 'Tens', short: 'tens', mult: 10, unlock: 2, color: '#3F74A6' }, // d1
  { name: 'Hundreds', short: 'hundreds', mult: 100, unlock: 3, color: '#2E8B6F' }, // d2
  { name: 'Thousands', short: 'thousands', mult: 1000, unlock: 4, color: '#C81E4F' }, // d3
];
// Start digits give the pleasant reveal 7 → 47 → 247 → 3,247 as places unlock.
const START = [7, 4, 2, 3]; // [d0, d1, d2, d3]

const EXPANDED_STEP = 5; // "same digit, different value" + expanded form
const CALIB_STEP = 6;

/* How many place columns are REVEALED at a given step (independent of whether
   the dial is yet editable). Step 0 shows the ones as an intro demo; each of
   steps 2–4 reveals one more place; the rest show all four. */
const revealedCount = (s) => (s <= 1 ? 1 : Math.min(4, s));

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Place value is exact integer arithmetic; there is nothing
   to approximate.  Only REVEALED places contribute, so navigating back to an
   earlier step cleanly shrinks the number (locked places count as 0).
   ------------------------------------------------------------------------- */
function valueOf(digits, revealed) {
  let n = 0;
  for (let i = 0; i < 4; i++) if (i < revealed) n += digits[i] * PLACES[i].mult;
  return n;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): read a number NAME and build it by setting the four place
   dials.  The meter measures how many of the four places are already correct;
   CALIBRATED only when the built number equals the target exactly.  This
   drills reading numbers, including the classic zero-place trap ("six hundred
   five" = 6 hundreds, 0 tens, 5 ones = 605).
   ------------------------------------------------------------------------- */
const targetDigits = (t) => [t % 10, Math.floor(t / 10) % 10, Math.floor(t / 100) % 10, Math.floor(t / 1000) % 10];
const correctPlaces = (digits, t) => {
  const td = targetDigits(t);
  let c = 0;
  for (let i = 0; i < 4; i++) if (digits[i] === td[i]) c++;
  return c;
};
const matchPercent = (digits, t) => (100 * correctPlaces(digits, t)) / 4;
const isCalibrated = (digits, t) => correctPlaces(digits, t) === 4;

function makeTarget(prev) {
  let t;
  do {
    t = 100 + Math.floor(Math.random() * 9900); // 100 … 9999, all reachable with four 0–9 digits
  } while (prev != null && t === prev);
  return t;
}

/* ---------------------------------------------------------------------------
   Number-to-words (US English, 0–9999).  No "and"; internal zero places are
   simply skipped, so 605 → "six hundred five" and 3040 → "three thousand,
   forty".  Correctness here matters: reading numbers IS the calibration skill.
   ------------------------------------------------------------------------- */
const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function under100(n) {
  if (n < 20) return ONES_W[n];
  return TENS_W[Math.floor(n / 10)] + (n % 10 ? '-' + ONES_W[n % 10] : '');
}
function under1000(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts = [];
  if (h) parts.push(ONES_W[h] + ' hundred');
  if (r) parts.push(under100(r));
  return parts.join(' ');
}
function wordForm(n) {
  if (n === 0) return 'zero';
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const parts = [];
  if (th) parts.push(ONES_W[th] + ' thousand');
  if (r) parts.push(under1000(r));
  return parts.join(th && r ? ', ' : ' ');
}
const commas = (n) => n.toLocaleString('en-US');

/* Break the standard numeral into per-character colour by each digit's place
   (rightmost = ones), so the readout colour-matches the chart.  Commas are
   neutral. */
function coloredNumeral(n) {
  const s = commas(n);
  const out = [];
  let place = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    if (ch >= '0' && ch <= '9') {
      out.unshift({ ch, color: PLACES[place] ? PLACES[place].color : null });
      place++;
    } else {
      out.unshift({ ch, color: null });
    }
  }
  return out;
}

/* The list of nonzero place-value parts, largest first: e.g. [3000,200,40,7]. */
function expandedParts(digits, revealed) {
  const parts = [];
  for (let i = revealed - 1; i >= 0; i--) {
    const v = digits[i] * PLACES[i].mult;
    if (v > 0) parts.push({ value: v, color: PLACES[i].color, place: i });
  }
  return parts;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One place per step; the dial unlocks with the step; the
   reveal lives in `feedback`; distractors are real learner misconceptions
   (a digit is always worth its face value, ten fits in one place, the leading
   digit is "just its digit", zeros can be dropped).  Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What is a number?',
    body:
      'Every number is built from ten DIGITS: 0–9. Where a digit sits — ' +
      'its PLACE — decides its worth.',
    q: 'How many digits build every whole number?',
    choices: ['Ten — 0 through 9', 'Nine — 1 through 9', 'Infinitely many'],
    answer: 0,
    feedback: 'Ten digits. The PLACE changes the value — that is place value.',
  },
  {
    title: 'The ones place',
    body: 'Drag the ones dial. The blocks and the digit change together.',
    q: 'What is the largest digit one place can hold?',
    choices: ['9', '10', 'A hundred'],
    answer: 0,
    feedback: 'Only 0–9 fit. Ten regroups left — that is why 10 needs two places.',
  },
  {
    title: 'The tens place',
    body: 'Ten ones make one TEN. Try 4 tens and 7 ones to build 47.',
    q: 'In the number 47, what is the 4 worth?',
    choices: ['40 — four tens', '4 — just four', '47'],
    answer: 0,
    feedback: 'The 4 sits in the tens place: 4 × 10 = 40, and 40 + 7 = 47.',
  },
  {
    title: 'The hundreds place',
    body: 'Ten tens make one HUNDRED — a 10×10 flat. Each place is TEN TIMES the one to its right.',
    q: 'How many tens are in one hundred?',
    choices: ['10 tens', '100 tens', '2 tens'],
    answer: 0,
    feedback: 'Ten tens: 10 × 10 = 100. Every step left multiplies by ten.',
  },
  {
    title: 'The thousands place',
    body: 'Ten hundreds make one THOUSAND. Four places now: 1, 10, 100, 1,000.',
    q: 'Reading 1,000 · 100 · 10 · 1 left to right, the places…',
    choices: ['shrink by ten each step', 'grow by ten each step', 'stay the same'],
    answer: 0,
    feedback: 'Right means ÷10, left means ×10. That pattern is base ten.',
  },
  {
    title: 'Same digit, different value',
    body: '3,247 = 3,000 + 200 + 40 + 7 — expanded form. Now build 5,555.',
    q: 'In 5,555, the left-most 5 is how much bigger than the right-most?',
    choices: ['1,000 times', '4 times', 'The same'],
    answer: 0,
    feedback: '5,000 ÷ 5 = 1,000. Three places left means ×10×10×10.',
  },
  {
    title: 'Build the number',
    body: 'Read the number name, set the dials. Watch the zeros: “six hundred five” is 605!',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display.  The standard numeral with every digit coloured
   by its place, over the expanded-form sum.  Colour is the pedagogical link
   between the symbol and the base-ten picture.
   ------------------------------------------------------------------------- */
function NumberEquation({ n, parts }) {
  return (
    <span className="eq">
      {coloredNumeral(n).map((c, i) => (
        <span key={i} style={c.color ? { color: c.color } : { color: '#5B6B7B' }}>
          {c.ch}
        </span>
      ))}
      {parts.length > 0 && (
        <span className="eq-exp">
          <span className="eq-eqls">&nbsp;=&nbsp;</span>
          {parts.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="eq-plus">&nbsp;+&nbsp;</span>}
              <span style={{ color: p.color }}>{commas(p.value)}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function NumberLab() {
  const [digits, setDigits] = useState(START); // [d0, d1, d2, d3]
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [reading, setReading] = useState(false);
  const [showBlocks, setShowBlocks] = useState(true);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // place index under the pointer, or null
  const readRef = useRef(null); // during "read the number": place index being highlighted
  const layoutRef = useRef({ cols: [] }); // hit-test rects written by draw()
  const sceneRef = useRef({});

  const revealed = revealedCount(step);
  const current = STEPS[step];
  const calib = !!current.calib;
  const n = valueOf(digits, revealed);
  const parts = expandedParts(digits, revealed);

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/animation handlers never read stale values.
  sceneRef.current = {
    digits,
    revealed,
    step,
    calib,
    reading,
    showBlocks,
    n,
  };

  const pct = target != null ? matchPercent(digits, target) : 0;
  const correct = target != null ? correctPlaces(digits, target) : 0;
  const calibrated = target != null ? isCalibrated(digits, target) : false;

  /* ---- place-value → screen transform + full redraw from state ------------ */
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
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const PAPER = '#FBFBF8';
    const OK = '#1F8A5B';

    const S = sceneRef.current;
    const digs = S.digits;
    const r = S.revealed;
    const N = S.n;
    const eff = (i) => (i < r ? digs[i] : 0);

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
    // mix a hex colour toward white (amt>0) or black (amt<0)
    const shade = (hex, amt) => {
      const v = parseInt(hex.slice(1), 16);
      let R = (v >> 16) & 255;
      let G = (v >> 8) & 255;
      let B = v & 255;
      const to = amt < 0 ? 0 : 255;
      const f = Math.abs(amt);
      R = Math.round(R + (to - R) * f);
      G = Math.round(G + (to - G) * f);
      B = Math.round(B + (to - B) * f);
      return `rgb(${R},${G},${B})`;
    };

    ctx.clearRect(0, 0, W, H);

    /* ---- quadrille paper: faint square grid --------------------------------- */
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

    /* layout bands (all derived from H so it scales) */
    const padL = 20;
    const padR = 20;
    const chartTop = 12;
    const chartBot = Math.round(H * 0.6);
    const barY = Math.round(H * 0.76);
    const barH = Math.max(20, Math.round(H * 0.065));

    /* ======================================================================
       BAND A — the place-value chart with base-ten blocks (the centerpiece)
       ==================================================================== */
    const gap = Math.max(8, Math.round(W * 0.016));
    const areaX0 = padL;
    const areaX1 = W - padR;
    const areaW = areaX1 - areaX0;
    const colW = (areaW - gap * (r - 1)) / r;

    layoutRef.current = { cols: [] };

    for (let k = 0; k < r; k++) {
      const p = r - 1 - k; // leftmost column = highest place
      const place = PLACES[p];
      const di = eff(p);
      const x0 = areaX0 + k * (colW + gap);
      const cx = x0 + colW / 2;
      const col = { x0, x1: x0 + colW, y0: chartTop, y1: chartBot, place: p, digit: di, mult: place.mult, color: place.color };
      layoutRef.current.cols.push(col);

      const hovered = hoverRef.current === p;
      const highlit = S.reading && readRef.current === p;

      /* column card */
      ctx.save();
      ctx.fillStyle = hovered || highlit ? shade(place.color, 0.9) : 'rgba(255,255,255,0.55)';
      rr(x0, chartTop, colW, chartBot - chartTop, 10);
      ctx.fill();
      ctx.lineWidth = highlit ? 2.5 : 1.2;
      ctx.strokeStyle = highlit ? place.color : hovered ? shade(place.color, 0.4) : 'rgba(28,43,58,0.14)';
      ctx.stroke();
      ctx.restore();

      /* header: place name + multiplier pill */
      const headY = chartTop + 8;
      ctx.save();
      ctx.fillStyle = place.color;
      rr(x0 + 8, headY, colW - 16, 20, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const nameFs = colW < 96 ? 10 : 11.5;
      ctx.font = `700 ${nameFs}px system-ui, sans-serif`;
      ctx.fillText(`${place.name}  ×${commas(place.mult)}`, cx, headY + 11);
      ctx.restore();

      /* big digit */
      const digFs = Math.min(46, Math.round(colW * 0.46));
      const digY = headY + 26 + digFs / 2;
      ctx.save();
      ctx.fillStyle = di === 0 ? 'rgba(91,107,123,0.55)' : place.color;
      ctx.font = `700 ${digFs}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(di), cx, digY);
      ctx.restore();

      /* base-ten blocks */
      const blkTop = digY + digFs / 2 + 8;
      const blkBot = chartBot - 26;
      if (S.showBlocks) {
        drawBlocks(ctx, rr, shade, x0 + 8, blkTop, colW - 16, blkBot - blkTop, p, di, place.color);
      }

      /* value label: di × mult = value */
      ctx.save();
      ctx.fillStyle = di === 0 ? INK_SOFT : shade(place.color, -0.15);
      ctx.font = `600 ${colW < 96 ? 10.5 : 12}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${di}×${commas(place.mult)}=${commas(di * place.mult)}`, cx, chartBot - 10);
      ctx.restore();
    }

    /* ======================================================================
       BAND B — the proportional value bar (0 → N), the linear/magnitude model
       ==================================================================== */
    ctx.save();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('the number as one total length', padL, barY - 8);
    ctx.restore();

    const trackX0 = padL;
    const trackX1 = W - padR;
    const trackW = trackX1 - trackX0;

    // track baseline
    ctx.save();
    ctx.fillStyle = 'rgba(28,43,58,0.05)';
    rr(trackX0, barY, trackW, barH, 6);
    ctx.fill();
    ctx.restore();

    if (N > 0) {
      let xcur = trackX0;
      const segs = [];
      for (let i = r - 1; i >= 0; i--) {
        const contribution = eff(i) * PLACES[i].mult;
        if (contribution <= 0) continue;
        const segW = (contribution / N) * trackW;
        segs.push({ x0: xcur, w: segW, value: contribution, color: PLACES[i].color, place: i });
        xcur += segW;
      }
      // segment fills
      segs.forEach((s) => {
        ctx.save();
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x0, barY, s.w, barH);
        // faint unit ticks so even a thin segment reads as "made of units"
        ctx.restore();
      });
      // white seams between segments
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      segs.forEach((s, i) => {
        if (i === 0) return;
        ctx.beginPath();
        ctx.moveTo(s.x0, barY);
        ctx.lineTo(s.x0, barY + barH);
        ctx.stroke();
      });
      ctx.restore();
      // outline
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.35)';
      ctx.lineWidth = 1.4;
      rr(trackX0, barY, trackW * Math.min(1, xcur === trackX0 ? 0 : (xcur - trackX0) / trackW), barH, 6);
      ctx.stroke();
      ctx.restore();

      // value labels above each segment, staggered to avoid overlap on thin ones
      ctx.save();
      ctx.font = '700 11.5px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      segs.forEach((s, i) => {
        const midX = s.x0 + s.w / 2;
        const label = commas(s.value);
        const lw = ctx.measureText(label).width;
        const row = i % 2; // alternate heights
        const ly = barY - 6 - row * 15;
        let lx = Math.max(trackX0 + lw / 2, Math.min(trackX1 - lw / 2, midX));
        // leader when the segment is narrower than its label
        if (s.w < lw + 4) {
          ctx.strokeStyle = shade(s.color, -0.1);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(midX, barY);
          ctx.lineTo(midX, ly + 3);
          ctx.stroke();
        }
        ctx.fillStyle = shade(s.color, -0.2);
        ctx.fillText(label, lx, ly);
      });
      ctx.restore();
    }

    // 0 … N end labels + total
    ctx.save();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('0', trackX0, barY + barH + 6);
    ctx.textAlign = 'right';
    ctx.fillStyle = INK;
    ctx.font = '700 13px ui-monospace, Menlo, monospace';
    ctx.fillText(commas(N), trackX1, barY + barH + 5);
    ctx.restore();

    /* ---- hover caption ------------------------------------------------------ */
    const hp = hoverRef.current;
    if (hp != null && hp < r) {
      const di = eff(hp);
      const place = PLACES[hp];
      const msg = `${di} in the ${place.short} place  =  ${di} × ${commas(place.mult)} = ${commas(di * place.mult)}`;
      ctx.save();
      ctx.font = '600 12px ui-monospace, Menlo, monospace';
      const tw = ctx.measureText(msg).width;
      const bx = Math.min(W - tw - 22, 12);
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      rr(Math.max(10, bx), 10, tw + 14, 22, 5);
      ctx.fill();
      ctx.strokeStyle = shade(place.color, 0.2);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = shade(place.color, -0.15);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, Math.max(17, bx + 7), 22);
      ctx.restore();
    }

    /* ---- reading caption ---------------------------------------------------- */
    if (S.reading && readRef.current != null && readRef.current < r) {
      const p = readRef.current;
      const di = eff(p);
      const place = PLACES[p];
      const spokenPart = di === 0 ? `no ${place.short}` : wordForm(di * place.mult);
      const msg = `${di} ${place.short}  →  ${spokenPart}`;
      ctx.save();
      ctx.font = '700 13px system-ui, sans-serif';
      const tw = ctx.measureText(msg).width;
      const bx = (W - tw - 16) / 2;
      ctx.fillStyle = place.color;
      rr(bx, 8, tw + 16, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, W / 2, 20);
      ctx.restore();
    }

    /* ---- calibrated stamp on the canvas (centred in the clear band between
       the chart and the value bar, so it never collides with a header) ------- */
    if (S.calib && N > 0 && sceneRef.current._cal) {
      ctx.save();
      ctx.translate(W / 2, (chartBot + (barY - 8)) / 2);
      ctx.rotate(-0.05);
      ctx.fillStyle = 'rgba(31,138,91,0.10)';
      rr(-66, -15, 132, 30, 7);
      ctx.fill();
      ctx.strokeStyle = OK;
      ctx.lineWidth = 2;
      rr(-66, -15, 132, 30, 7);
      ctx.stroke();
      ctx.fillStyle = OK;
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓ CALIBRATED', 0, 0.5);
      ctx.restore();
    }
    void PAPER;
  }, []);

  /* Base-ten block glyphs: `di` copies of the place's iconic block, arranged in
     a tidy grid.  Ones = unit cubes, Tens = ten-rods (10 units), Hundreds =
     10×10 flats, Thousands = cubes — the shape names the place, the count names
     the digit. */
  function drawBlocks(ctx, rr, shade, ax, ay, aw, ah, placeIndex, di, color) {
    if (ah <= 6 || aw <= 6) return;
    if (di === 0) {
      // an explicit "empty place" marker — zeros matter in place value
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.4)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      const s = Math.min(aw * 0.5, ah * 0.5, 26);
      rr(ax + aw / 2 - s / 2, ay + ah / 2 - s / 2, s, s, 4);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const perRow = Math.min(di, 3);
    const rows = Math.ceil(di / perRow);
    const cellW = aw / perRow;
    const cellH = ah / rows;
    const g = Math.max(8, Math.min(cellW - 6, cellH - 6, 34));

    const glyph = (gx, gy) => {
      // gx,gy = top-left of the glyph's g×g box
      if (placeIndex === 0) {
        // unit cube
        ctx.fillStyle = color;
        rr(gx + (g * 0.18), gy + (g * 0.18), g * 0.64, g * 0.64, 3);
        ctx.fill();
      } else if (placeIndex === 1) {
        // ten-rod: a tall bar divided into 10 unit cells
        const w = g * 0.42;
        const x = gx + (g - w) / 2;
        ctx.fillStyle = color;
        rr(x, gy, w, g, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1;
        for (let j = 1; j < 10; j++) {
          const yy = gy + (g / 10) * j;
          ctx.beginPath();
          ctx.moveTo(x, yy);
          ctx.lineTo(x + w, yy);
          ctx.stroke();
        }
        ctx.strokeStyle = shade(color, -0.2);
        ctx.lineWidth = 1;
        rr(x, gy, w, g, 3);
        ctx.stroke();
      } else if (placeIndex === 2) {
        // hundred-flat: a 10×10 grid square
        ctx.fillStyle = color;
        rr(gx, gy, g, g, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 0.75;
        for (let j = 1; j < 10; j++) {
          const t = (g / 10) * j;
          ctx.beginPath();
          ctx.moveTo(gx + t, gy);
          ctx.lineTo(gx + t, gy + g);
          ctx.moveTo(gx, gy + t);
          ctx.lineTo(gx + g, gy + t);
          ctx.stroke();
        }
        ctx.strokeStyle = shade(color, -0.2);
        ctx.lineWidth = 1;
        rr(gx, gy, g, g, 3);
        ctx.stroke();
      } else {
        // thousand-cube: a front face + top & side faces for a 3-D read
        const d = g * 0.26;
        const fs = g - d;
        const fx = gx;
        const fy = gy + d;
        // top face
        ctx.fillStyle = shade(color, 0.28);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + d, fy - d);
        ctx.lineTo(fx + fs + d, fy - d);
        ctx.lineTo(fx + fs, fy);
        ctx.closePath();
        ctx.fill();
        // right face
        ctx.fillStyle = shade(color, -0.18);
        ctx.beginPath();
        ctx.moveTo(fx + fs, fy);
        ctx.lineTo(fx + fs + d, fy - d);
        ctx.lineTo(fx + fs + d, fy + fs - d);
        ctx.lineTo(fx + fs, fy + fs);
        ctx.closePath();
        ctx.fill();
        // front face
        ctx.fillStyle = color;
        ctx.fillRect(fx, fy, fs, fs);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 0.6;
        for (let j = 1; j < 10; j++) {
          const t = (fs / 10) * j;
          ctx.beginPath();
          ctx.moveTo(fx + t, fy);
          ctx.lineTo(fx + t, fy + fs);
          ctx.moveTo(fx, fy + t);
          ctx.lineTo(fx + fs, fy + t);
          ctx.stroke();
        }
        ctx.strokeStyle = shade(color, -0.25);
        ctx.lineWidth = 1;
        ctx.strokeRect(fx, fy, fs, fs);
      }
    };

    // centre the grid of glyphs within the block area
    const gridW = perRow * g + (perRow - 1) * (cellW - g < 4 ? 3 : Math.min(6, cellW - g));
    const startX = ax + (aw - Math.min(gridW, aw)) / 2;
    const stepX = Math.min(cellW, g + 6);
    const stepY = Math.min(cellH, g + 6);
    const totalH = rows * g + (rows - 1) * (stepY - g);
    const startY = ay + Math.max(0, (ah - totalH) / 2);

    let count = 0;
    for (let row = 0; row < rows && count < di; row++) {
      const inRow = Math.min(perRow, di - row * perRow);
      const rowW = inRow * g + (inRow - 1) * (stepX - g);
      const rx = ax + (aw - rowW) / 2;
      for (let c = 0; c < inRow; c++) {
        glyph(rx + c * stepX, startY + row * stepY);
        count++;
      }
    }
    void startX;
  }

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [digits, step, target, showBlocks, reading, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it; reset the
     digits to 0 so it starts clearly un-matched (like the addition lab). */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setDigits([0, 0, 0, 0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // keep a flag the renderer can read for the CALIBRATED stamp
  sceneRef.current._cal = calib && target != null && calibrated;

  /* the "read the number" sweep — highlight each place high→low, time-based,
     opt-in, and respectful of reduced motion */
  useEffect(() => {
    if (!reading) {
      readRef.current = null;
      draw();
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setReading(false);
      return;
    }
    let raf;
    let start = null;
    const per = 640; // ms per place
    const total = revealed * per;
    const loop = (now) => {
      if (start == null) start = now;
      const t = now - start;
      const idx = Math.min(revealed - 1, Math.floor(t / per));
      readRef.current = revealed - 1 - idx; // high place first
      draw();
      if (t < total) raf = requestAnimationFrame(loop);
      else {
        readRef.current = null;
        setReading(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reading, revealed, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const setDigit = (i, value) => {
    const v = parseInt(value, 10);
    setDigits((prev) => {
      const next = prev.slice();
      next[i] = v;
      return next;
    });
    if (reading) setReading(false);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const cols = layoutRef.current.cols || [];
    let hit = null;
    for (const c of cols) {
      if (cssX >= c.x0 && cssX <= c.x1 && cssY >= c.y0 && cssY <= c.y1) {
        hit = c.place;
        break;
      }
    }
    if (hit !== hoverRef.current) {
      hoverRef.current = hit;
      draw();
    }
  };
  const onPointerLeave = () => {
    if (hoverRef.current != null) {
      hoverRef.current = null;
      draw();
    }
  };

  const resetDials = () => {
    setDigits(calib ? [0, 0, 0, 0] : START.slice());
    if (reading) setReading(false);
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

  const expandedText = parts.length ? parts.map((p) => commas(p.value)).join(' + ') : '0';
  const lead = parts[0]; // highest nonzero place
  const spoken =
    `The number is ${commas(n)}, ${wordForm(n)}. ` +
    (parts.length
      ? `In expanded form, ${expandedText.replace(/,/g, '')}.`
      : 'zero.');

  return (
    <div className="nlab">
      <header className="head">
        <h1>What Is a Number? Place Value &amp; Base Ten</h1>
        <p className="lede">
          Every number is built from just ten digits — and where a digit <em>sits</em> decides what
          it is worth. Unlock the places one at a time (<span className="mono">ones → tens →
          hundreds → thousands</span>), each worth <em>ten times</em> the one to its right, then read
          and build numbers from their place values.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <NumberEquation n={n} parts={parts} />
            </p>
            <p className="equation-sub mono">{wordForm(n)}</p>
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
            <span className="hint mono">each place = 10 × the place on its right</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — you built ${wordForm(target)}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Standard form</span>
              <span className="fact-v mono big">{commas(n)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Word form</span>
              <span className="fact-v">{wordForm(n)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Expanded form</span>
              <span className="fact-v mono">{expandedText}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Biggest place</span>
              <span className="fact-v mono">
                {lead
                  ? `${digits[lead.place]} ${PLACES[lead.place].short} = ${commas(lead.value)}`
                  : '—'}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (reading ? ' on' : '')}
              onClick={() => setReading((c) => !c)}
            >
              {reading ? 'Reading…' : 'Read the number'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showBlocks ? ' on' : '')}
              onClick={() => setShowBlocks((s) => !s)}
              aria-pressed={showBlocks}
            >
              {showBlocks ? 'Hide blocks' : 'Show blocks'}
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
            {PLACES.map((d, i) => {
              const unlocked = step >= d.unlock;
              const val = digits[i];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.name}>
                  <span className="dk" style={{ color: d.color }}>
                    {d.name}
                  </span>
                  <span className="drole">{unlocked ? `the ${d.short} place · ×${commas(d.mult)}` : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    step={1}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`${d.name} digit — the ${d.short} place`}
                    onChange={(e) => setDigit(i, e.target.value)}
                    style={{ accentColor: d.color }}
                  />
                  <output className="dv" style={unlocked ? { color: d.color } : undefined}>
                    {unlocked ? val : '🔒'}
                  </output>
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
              <div className="target-card">
                <span className="target-k">Build this number</span>
                <span className="target-words">{wordForm(target)}</span>
                {calibrated && <span className="target-num mono">{commas(target)}</span>}
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  places right&nbsp;{correct}/4
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">you built {commas(n)}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setDigits([0, 0, 0, 0]);
                }}
              >
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
                  setShowBlocks(true);
                  setDigits(START.slice());
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">N = d₃·1000 + d₂·100 + d₁·10 + d₀·1</span> &nbsp;·&nbsp; place value in
        the base-ten system, whole numbers to 9,999 (CCSS K.NBT, 1.NBT, 2.NBT, 4.NBT).
      </footer>

      <style jsx>{`
        .nlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --ones: #6b7a8f;
          --tens: #3f74a6;
          --hundreds: #2e8b6f;
          --thousands: #c81e4f;
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
          max-width: 70ch;
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
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.01em;
        }
        .equation :global(.eq-exp) {
          font-size: 15px;
          font-weight: 600;
        }
        .equation :global(.eq-eqls),
        .equation :global(.eq-plus) {
          color: var(--ink-soft);
          font-weight: 400;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
          text-transform: capitalize;
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
          font-size: 22px;
          font-weight: 700;
          color: var(--ink);
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
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 76px 1fr 30px;
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
          background: rgba(63, 116, 166, 0.06);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .target-words {
          font-family: var(--serif);
          font-size: 19px;
          font-weight: 600;
          text-transform: capitalize;
          color: var(--ink);
        }
        .target-num {
          font-size: 14px;
          color: var(--ok);
          font-weight: 700;
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
        :global(.nlab) :focus-visible {
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
