'use client';

/* ============================================================================
   TwoDigitNumberLab — an interactive "bench" for the first big idea in the
   number strand: a TWO-DIGIT NUMBER is some TENS and some ONES, and the two
   digits simply COUNT them.  N = t·10 + o, where t = tens (0–9) and o = ones
   (0–9).  (CCSS 1.NBT.B.2 a/b/c and 2.NBT.A.1.)

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at Grade 1–2:
   the child sees *where the digits come from* — you gather ones, and every time
   ten ones pile up they BUNDLE into a single ten.  The tens digit is just the
   number of bundles; the ones digit is what is left loose.  That bundling is
   the whole reason 10 is the first two-digit number, why the ones digit never
   passes 9, and why 40 needs a 0 to hold the empty ones place.

   HOW THIS LAB IS DISTINCT from the sibling NumberLab (whole-number place value
   to 9,999): NumberLab shows four independent digit-dials and static base-ten
   blocks side by side with a magnitude bar.  THIS lab has ONE quantity shown
   two ways at once, and its star is the *action of bundling*: a single 10-wide
   frame grid fills one one at a time; each completed row of ten snaps into a
   connected carmine "ten-rod" (bundled), while the unfinished last row stays as
   separate blue squares (loose ones).  And its three dials are LINKED — Count,
   Tens, and Ones all read and write the SAME number — so a child feels directly
   that ten ones and one ten are the same amount seen two ways.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions (Next is
   gated on ANSWERED, not correct), and a calibration challenge with a live
   match meter and a CALIBRATED stamp.

   One-accent discipline, adapted for THIS lab: carmine is the TEN — the bundle,
   the new unit that makes two-digit numbers possible — and the whole number it
   builds; loose ones carry a quieter blue.  So the accent still marks the one
   idea the lab is about.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TwoDigitNumberLab.jsx
     2. Import and render it:
          import TwoDigitNumberLab from './TwoDigitNumberLab';
          export default function Page() { return <TwoDigitNumberLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (one number `value`
              0–99, plus the lesson step).  tens and ones are DERIVED, never
              stored separately, so the three dials can never disagree.
     MODEL  — the math is pure integer place value; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Three LINKED dials over one number 0–99.  `Count` is
   the whole amount (the hero — dragging it fills the grid and forms bundles);
   `Tens` sets how many bundles; `Ones` sets the loose leftover.  All three
   mutate the single `value`, so they always agree.  `unlock` is the step index
   at which each dial goes live.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the TEN / the whole number — the accent
const BLUE = '#3f74a6'; // loose ones — the quieter partner

const DIALS = [
  { key: 'count', name: 'Count', role: 'the whole amount · 0–99', min: 0, max: 99, unlock: 1, color: CARMINE },
  { key: 'tens', name: 'Tens', role: 'bundles of ten · ×10', min: 0, max: 9, unlock: 3, color: CARMINE },
  { key: 'ones', name: 'Ones', role: 'loose ones · ×1', min: 0, max: 9, unlock: 4, color: BLUE },
];

const START_VALUE = 7; // a one-digit number: 0 tens, 7 ones — sets up "then two"
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Place value for a two-digit number is exact integer math.
   The two digits are DERIVED from the single number, which is what makes them
   always consistent no matter which dial the child touched.
   ------------------------------------------------------------------------- */
const tensOf = (v) => Math.floor(v / 10); // number of full bundles of ten
const onesOf = (v) => v % 10; // loose ones left over
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* Number-to-words, 0–99 (US English). */
const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function wordForm(n) {
  if (n < 20) return ONES_W[n];
  return TENS_W[Math.floor(n / 10)] + (n % 10 ? '-' + ONES_W[n % 10] : '');
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A COUNT-THE-PILE challenge (the skill's construction
   variant of curve-matching): a mystery pile of loose dots is shown, too many
   to read at a glance.  The child figures out the tens and ones — by bundling —
   and dials the number to match.  The meter measures how many of the two digits
   are already right; CALIBRATED only when the built number equals the target
   EXACTLY.  Because both numbers live in 0–99, "both digits right" happens iff
   the numbers are equal, so the stamp can never fire early (proved in the audit).
   ------------------------------------------------------------------------- */
const correctDigits = (v, t) => (tensOf(v) === tensOf(t) ? 1 : 0) + (onesOf(v) === onesOf(t) ? 1 : 0);
const matchPercent = (v, t) => 50 * correctDigits(v, t);
const isCalibrated = (v, t) => v === t;

function makeTarget(prev) {
  let t;
  do {
    t = 10 + Math.floor(Math.random() * 90); // 10 … 99, always a two-digit number
  } while (prev != null && t === prev);
  return t;
}

// Small deterministic PRNG so a target's "mystery pile" is stable while shown.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback`; distractors are real learner misconceptions
   (a digit is worth its face value; ten can sit in one place; the 0 in a decade
   "means nothing").  Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One digit, then two',
    body:
      'Past nine, we gather ten ones and BUNDLE them into one “ten”. ' +
      'That is how two-digit numbers are born.',
    q: 'How many ones make one ten?',
    choices: ['Ten ones', 'Nine ones', 'Two ones'],
    answer: 0,
    feedback: 'Ten ones make one ten — which is why 10 is the first two-digit number.',
  },
  {
    title: 'Bundle ten ones into a ten',
    body: 'Drag Count past 9. Watch the full row snap into one solid rod.',
    q: 'You have 9 loose ones and add one more. What happens?',
    choices: ['They bundle into one ten', 'The ones place shows 10', 'Nothing changes'],
    answer: 0,
    feedback: 'They snap into one ten: 1 ten and 0 ones = 10. That rod IS the ten.',
  },
  {
    title: 'Reading the tens and ones',
    body: '34 is 3 full rods (3 tens = 30) and 4 loose ones. The digits COUNT them.',
    q: 'In the number 47, what does the 4 mean?',
    choices: ['4 tens — that is 40', '4 ones — just 4', 'Forty-seven'],
    answer: 0,
    feedback: 'The 4 sits in the tens place: 4 tens = 40, and 40 + 7 = 47.',
  },
  {
    title: 'The tens dial',
    body: 'Each ten you add jumps the number up by 10. Try it.',
    q: 'You raise Tens from 3 to 5. The number goes up by…',
    choices: ['20 — two more tens', '2', '5'],
    answer: 0,
    feedback: 'Two more tens is 2 × 10 = 20 — for example 34 → 54.',
  },
  {
    title: 'Why the ones stop at 9',
    body: 'The Ones dial only reaches 9. Why?',
    q: 'Why can the ones digit never be 10?',
    choices: ['Ten ones always bundle', 'Ten is too big to draw', 'It can be 10'],
    answer: 0,
    feedback: 'Ten loose ones cannot stay loose — they regroup, and the ones reset to 0.',
  },
  {
    title: 'Tens, teens, and the sneaky 0',
    body: 'The decades 20, 30, … 90 end in ZERO — and that 0 is not nothing.',
    q: 'In the number 60, what is the 0 telling us?',
    choices: ['Zero loose ones', 'Nothing — drop it', 'The number is 6'],
    answer: 0,
    feedback: 'Drop the 0 and the 6 slides into the ones place — six, not sixty!',
  },
  {
    title: 'Count the pile',
    body: 'Bundle the pile into tens and ones in your head. Set the dials to match!',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TwoDigitNumberLab() {
  const [value, setValue] = useState(START_VALUE); // the single source of truth, 0–99
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [sweepVal, setSweepVal] = useState(null); // non-null while "Watch it bundle" plays

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const pileRef = useRef(null); // mini-canvas for the calibration pile
  const hoverRef = useRef(null); // { type:'ten'|'ones', row } under the pointer
  const layoutRef = useRef({ rows: [] });
  const sceneRef = useRef({});
  const sweepTargetRef = useRef(0);

  const current = STEPS[step];
  const calib = !!current.calib;

  // displayValue is what everything shows: the swept value while animating, else state.
  const displayValue = sweepVal != null ? sweepVal : value;
  const t = tensOf(displayValue);
  const o = onesOf(displayValue);

  // snapshot for the renderer so draw() and handlers never read stale values
  sceneRef.current = { value: displayValue, tens: t, ones: o, calib };

  const pct = target != null ? matchPercent(value, target) : 0;
  const digitsRight = target != null ? correctDigits(value, target) : 0;
  const calibrated = target != null ? isCalibrated(value, target) : false;
  sceneRef.current._cal = calib && calibrated;

  const reducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- full redraw from state: the bundling frame grid --------------------- */
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

    const INK = '#1c2b3a';
    const INK_SOFT = '#5b6b7b';
    const OK = '#1f8a5b';

    const S = sceneRef.current;
    const V = S.value;
    const TENS = S.tens;
    const ONES = S.ones;

    const rr = (x, y, w, h, rad) => {
      const rC = Math.max(0, Math.min(rad, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + rC, y);
      ctx.arcTo(x + w, y, x + w, y + h, rC);
      ctx.arcTo(x + w, y + h, x, y + h, rC);
      ctx.arcTo(x, y + h, x, y, rC);
      ctx.arcTo(x, y, x + w, y, rC);
      ctx.closePath();
    };
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

    /* caption */
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 12px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('fill each frame of ten — ten ones bundle into one ten', 14, 20);

    /* grid geometry (fixed 10×10 envelope so cells never resize while dragging) */
    const padL = 14;
    const padR = 14;
    const capH = 30;
    const eqH = 34;
    const leftGutter = 28; // running "10, 20, 30…" tens labels
    const rightGutter = 118; // brackets + "N tens = N0" / "N ones" labels
    const gridX0 = padL + leftGutter;
    const gridAreaW = Math.max(80, W - gridX0 - padR - rightGutter);
    const gridTop = padL + capH;
    const gridBottomLimit = H - 8 - eqH;
    const gridAreaH = Math.max(60, gridBottomLimit - gridTop);
    const cell = Math.max(12, Math.min(gridAreaW / 10, gridAreaH / 10));
    const gx = gridX0;
    const gy = gridTop;
    const gridRight = gx + cell * 10;

    layoutRef.current = { rows: [] };

    /* ---- full rows: each a connected carmine ten-rod (BUNDLED) -------------- */
    for (let r = 0; r < TENS; r++) {
      const y0 = gy + r * cell;
      // running tens count on the left (skip-counting by ten)
      ctx.fillStyle = shade(CARMINE, -0.05);
      ctx.font = '700 12px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String((r + 1) * 10), gx - 6, y0 + cell / 2);

      // the rod
      ctx.fillStyle = CARMINE;
      rr(gx + 2, y0 + 2, cell * 10 - 4, cell - 4, 5);
      ctx.fill();
      // ten subdivisions in white, so a child still sees it is TEN ones joined
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let j = 1; j < 10; j++) {
        const x = gx + j * cell;
        ctx.moveTo(x, y0 + 4);
        ctx.lineTo(x, y0 + cell - 4);
      }
      ctx.stroke();
      ctx.strokeStyle = shade(CARMINE, -0.25);
      ctx.lineWidth = 1.2;
      rr(gx + 2, y0 + 2, cell * 10 - 4, cell - 4, 5);
      ctx.stroke();

      layoutRef.current.rows.push({ type: 'ten', row: r, y0, y1: y0 + cell, x0: gx, x1: gridRight });
    }

    /* ---- the active row: loose blue ones + the dashed frame being filled ---- */
    if (TENS < 10) {
      const ay = gy + TENS * cell;
      const inset = Math.max(2, cell * 0.16);
      for (let c = 0; c < 10; c++) {
        const x0 = gx + c * cell;
        if (c < ONES) {
          // a loose one — a SEPARATE square (not bundled)
          ctx.fillStyle = BLUE;
          rr(x0 + inset, ay + inset, cell - 2 * inset, cell - 2 * inset, 4);
          ctx.fill();
          ctx.strokeStyle = shade(BLUE, -0.22);
          ctx.lineWidth = 1;
          rr(x0 + inset, ay + inset, cell - 2 * inset, cell - 2 * inset, 4);
          ctx.stroke();
        } else {
          // an empty slot in the ten-frame (room still to fill)
          ctx.strokeStyle = 'rgba(63,116,166,0.45)';
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          rr(x0 + inset, ay + inset, cell - 2 * inset, cell - 2 * inset, 4);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      layoutRef.current.rows.push({ type: 'ones', row: TENS, y0: ay, y1: ay + cell, x0: gx, x1: gridRight });
    }

    /* ---- right-side brackets that name the two groups ---------------------- */
    const bracket = (yTop, yBot, color) => {
      const bx = gridRight + 8;
      const tick = 6;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx - tick, yTop);
      ctx.lineTo(bx, yTop);
      ctx.lineTo(bx, yBot);
      ctx.lineTo(bx - tick, yBot);
      ctx.stroke();
      return bx + 8;
    };
    if (TENS >= 1) {
      const yTop = gy + 1;
      const yBot = gy + TENS * cell - 1;
      const lx = bracket(yTop, yBot, CARMINE);
      const midY = (yTop + yBot) / 2;
      ctx.fillStyle = shade(CARMINE, -0.1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.fillText(`${TENS} ${TENS === 1 ? 'ten' : 'tens'}`, lx, midY - 2);
      ctx.font = '600 12px ui-monospace, Menlo, monospace';
      ctx.fillStyle = INK_SOFT;
      ctx.fillText(`= ${TENS * 10}`, lx, midY + 13);
    }
    if (TENS < 10) {
      const ay = gy + TENS * cell;
      const lx = bracket(ay + 1, ay + cell - 1, BLUE);
      ctx.fillStyle = shade(BLUE, -0.1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.fillText(`${ONES} ${ONES === 1 ? 'one' : 'ones'}`, lx, ay + cell / 2);
    }

    /* ---- bottom equation: t tens + o ones = value -------------------------- */
    const eqY = H - 8 - eqH / 2;
    ctx.textBaseline = 'middle';
    ctx.font = '700 17px ui-monospace, Menlo, monospace';
    const seg = [
      { s: `${TENS}`, c: CARMINE },
      { s: ` ${TENS === 1 ? 'ten' : 'tens'} + `, c: INK_SOFT },
      { s: `${ONES}`, c: BLUE },
      { s: ` ${ONES === 1 ? 'one' : 'ones'} = `, c: INK_SOFT },
      { s: `${V}`, c: CARMINE },
    ];
    let totalW = 0;
    seg.forEach((p) => (totalW += ctx.measureText(p.s).width));
    let ex = Math.max(padL, (W - totalW) / 2);
    ctx.textAlign = 'left';
    seg.forEach((p) => {
      ctx.fillStyle = p.c;
      ctx.fillText(p.s, ex, eqY);
      ex += ctx.measureText(p.s).width;
    });

    /* ---- hover caption ----------------------------------------------------- */
    const hv = hoverRef.current;
    if (hv) {
      const msg =
        hv.type === 'ten'
          ? 'a full row = ten ones bundled into one ten = 10'
          : `the last row holds the loose ones: ${ONES}`;
      ctx.font = '600 12px ui-monospace, Menlo, monospace';
      const tw = ctx.measureText(msg).width;
      const color = hv.type === 'ten' ? CARMINE : BLUE;
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      rr(12, 28, tw + 14, 22, 5);
      ctx.fill();
      ctx.strokeStyle = shade(color, 0.2);
      ctx.lineWidth = 1;
      rr(12, 28, tw + 14, 22, 5);
      ctx.stroke();
      ctx.fillStyle = shade(color, -0.15);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, 19, 39);
    }

    /* ---- CALIBRATED stamp -------------------------------------------------- */
    if (S._cal) {
      ctx.save();
      ctx.translate(W / 2, gy + cell * 10 + 4);
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
    void INK;
  }, []);

  /* redraw when the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [displayValue, calib, calibrated, draw]);

  /* redraw on resize */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it; clear the
     build so it starts un-matched */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* "Watch it bundle" — a time-based sweep 0 → value that shows each ten form.
     Opt-in, cancelable, and skipped entirely under reduced motion. */
  useEffect(() => {
    if (sweepVal == null) return undefined;
    const tv = sweepTargetRef.current;
    let raf;
    let start = null;
    const dur = Math.min(3200, 500 + tv * 70);
    const loop = (now) => {
      if (start == null) start = now;
      const f = (now - start) / dur;
      if (f >= 1) {
        setSweepVal(null);
        return;
      }
      setSweepVal(Math.min(tv, Math.floor(f * (tv + 1))));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sweepVal == null]);

  /* draw the calibration "mystery pile" of loose dots (seeded so it is stable) */
  useEffect(() => {
    const canvas = pileRef.current;
    if (!canvas || target == null) return;
    const W = canvas.clientWidth || 232;
    const H = canvas.clientHeight || 122;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const rand = mulberry32(target * 2654435761);
    const R = 5;
    const m = 10;
    for (let i = 0; i < target; i++) {
      const x = m + R + rand() * (W - 2 * (m + R));
      const y = m + R + rand() * (H - 2 * (m + R));
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = calibrated ? 'rgba(31,138,91,0.85)' : BLUE;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = calibrated ? '#1f8a5b' : '#2f5b82';
      ctx.stroke();
    }
  }, [target, calibrated]);

  /* ---- interaction ------------------------------------------------------- */
  const setCount = (v) => {
    if (sweepVal != null) return;
    setValue(clampInt(v, 0, 99));
  };
  const setTens = (v) => {
    if (sweepVal != null) return;
    const nt = clampInt(v, 0, 9);
    setValue((cur) => nt * 10 + onesOf(cur));
  };
  const setOnes = (v) => {
    if (sweepVal != null) return;
    const no = clampInt(v, 0, 9);
    setValue((cur) => tensOf(cur) * 10 + no);
  };
  const setDial = (key, v) => (key === 'count' ? setCount(v) : key === 'tens' ? setTens(v) : setOnes(v));
  const dialValue = (key) => (key === 'count' ? displayValue : key === 'tens' ? t : o);

  const startSweep = () => {
    if (sweepVal != null) return;
    const tv = value;
    if (tv <= 0 || reducedMotion()) return;
    sweepTargetRef.current = tv;
    setSweepVal(0);
  };

  const onPointerMove = (e) => {
    if (sweepVal != null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    let hit = null;
    for (const rw of layoutRef.current.rows || []) {
      if (x >= rw.x0 && x <= rw.x1 && y >= rw.y0 && y <= rw.y1) {
        hit = { type: rw.type, row: rw.row };
        break;
      }
    }
    const same = (a, b) => (a && b ? a.type === b.type && a.row === b.row : a === b);
    if (!same(hit, hoverRef.current)) {
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

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const resetDial = () => {
    setSweepVal(null);
    setValue(calib ? 0 : START_VALUE);
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const expanded = displayValue >= 10 ? `${t * 10} + ${o}` : `${displayValue}`;
  const spoken =
    `The number is ${displayValue}, ${wordForm(displayValue)}: ${t} ${t === 1 ? 'ten' : 'tens'} and ` +
    `${o} ${o === 1 ? 'one' : 'ones'}.`;

  return (
    <div className="tlab">
      <header className="head">
        <h1>Two-Digit Numbers: Tens &amp; Ones</h1>
        <p className="lede">
          A two-digit number is just some <em>tens</em> and some <em>ones</em>. Gather ones and every
          time <em>ten</em> of them pile up they <em>bundle</em> into one ten — the tens digit counts the
          bundles, the ones digit counts what is left loose. Count, Tens, and Ones are{' '}
          <span className="mono">one number shown three ways</span>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              {displayValue >= 10 ? (
                <>
                  <span style={{ color: CARMINE }}>{t}</span>
                  <span style={{ color: BLUE }}>{o}</span>
                  <span className="eq-exp">
                    <span className="eq-eqls">&nbsp;=&nbsp;</span>
                    <span style={{ color: CARMINE }}>{t * 10}</span>
                    <span className="eq-plus">&nbsp;+&nbsp;</span>
                    <span style={{ color: BLUE }}>{o}</span>
                  </span>
                </>
              ) : (
                <span style={{ color: BLUE }}>{displayValue}</span>
              )}
            </p>
            <p className="equation-sub mono">{wordForm(displayValue)}</p>
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
            <span className="hint mono">carmine rod = one ten · blue square = one loose one</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — you built ${wordForm(target)}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Standard form</span>
              <span className="fact-v mono big">{displayValue}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Word form</span>
              <span className="fact-v">{wordForm(displayValue)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Tens &amp; ones</span>
              <span className="fact-v mono">
                {t} {t === 1 ? 'ten' : 'tens'} · {o} {o === 1 ? 'one' : 'ones'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Expanded form</span>
              <span className="fact-v mono">{expanded}</span>
            </div>
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={startSweep} disabled={sweepVal != null}>
              {sweepVal != null ? 'Bundling…' : 'Watch it bundle'}
            </button>
            <button type="button" className="btn ghost" onClick={resetDial}>
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
            {DIALS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = dialValue(d.key);
              const dis = !unlocked || sweepVal != null;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk" style={{ color: d.color }}>
                    {d.name}
                  </span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={1}
                    value={val}
                    disabled={dis}
                    aria-label={`${d.name} — ${d.role}`}
                    onChange={(e) => setDial(d.key, e.target.value)}
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
                <span className="target-k">Count this pile</span>
                <canvas ref={pileRef} className="pile" />
                {calibrated ? (
                  <span className="target-num mono">
                    {target} = {wordForm(target)}
                  </span>
                ) : (
                  <span className="target-hint mono">bundle the loose ones into tens</span>
                )}
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">digits right&nbsp;{digitsRight}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">you built {value}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setValue(0);
                  setSweepVal(null);
                }}
              >
                New pile
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
                  setSweepVal(null);
                  setValue(START_VALUE);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">N = t·10 + o</span> &nbsp;·&nbsp; a two-digit number is <em>t</em> tens and{' '}
        <em>o</em> ones, 0–99 (CCSS 1.NBT.B.2, 2.NBT.A.1).
      </footer>

      <style jsx>{`
        .tlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --tens: #c81e4f;
          --ones: #3f74a6;
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
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.02em;
        }
        .equation :global(.eq-exp) {
          font-size: 16px;
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
          background: var(--tens);
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
          grid-template-columns: 68px 1fr 34px;
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
          border-left: 3px solid var(--tens);
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
          gap: 6px;
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
        .pile {
          display: block;
          width: 100%;
          height: 122px;
          border: 1px dashed rgba(63, 116, 166, 0.4);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.6);
        }
        .target-num {
          font-size: 14px;
          color: var(--ok);
          font-weight: 700;
          text-transform: capitalize;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--tens));
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
        .foot em {
          font-style: italic;
          color: var(--ink);
        }
        :global(.tlab) :focus-visible {
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
