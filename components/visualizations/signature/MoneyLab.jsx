'use client';

/* ============================================================================
   MoneyLab — an interactive "bench" for COUNTING MONEY: coins and bills, the
   $ and ¢ symbols, and the big idea that money is just decimal place value in
   disguise.  A money amount is the sum of each coin's value, counted in exact
   CENTS, and 100 cents make one dollar:

        total¢ = 1·(pennies) + 5·(nickels) + 10·(dimes) + 25·(quarters)
                 + 100·(dollars)      and      $1.00 = 100¢

   Built for MAIS (math AI system, www.mais.ac), K-12.  Counting mixed coins
   and bills and writing amounts with $ and ¢ is a core early-grades skill
   (CCSS 2.MD.C.8) that grows into money-as-decimals later (4.MD.A.2, 5.NBT).
   The lab meets one denomination at a time — penny, nickel, dime, quarter,
   dollar — unlocking a dial per lesson step, so a child builds an amount up
   coin by coin and skip-counts by 1s, 5s, 10s, and 25s.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter.

   The signature centerpiece is TWO LINKED MODELS of one amount, side by side
   (the money analogue of the number line's slope triangle or the decimal
   lab's grid + number line):

     • the COIN TRAY — a labeled compartment per denomination showing the coins
       themselves at true relative sizes (the dime really is the SMALLEST coin,
       yet worth more than the nickel!) with a running skip-count subtotal.
       Money as a COLLECTION of denominations.
     • the HUNDRED-CENT DOLLAR GRID — one dollar drawn as a 10×10 grid of 100
       cents (each cell = 1¢, each column = 10¢ = a dime, the whole grid = $1),
       filled to the amount, with whole dollars shown as $1 bills.  Money as a
       PLACE-VALUE quantity — and exactly why we write it with two decimal
       places (dimes = tenths, pennies = hundredths).

   Correctness discipline (the thing we owe K-12 students): ALL arithmetic is
   done in INTEGER CENTS.  A child never sees a floating-point artefact like
   $0.30000000004 — every amount is built from whole cents and formatted by
   string, always exact.

   One-accent discipline, adapted for a money lab: the coins wear their natural
   muted metal tones (copper penny, silver nickel/dime/quarter, green bill) as
   the neutral "object palette"; the CARMINE accent moves to whatever the step
   teaches — the active denomination's tray, the filled cents in the grid, and
   the running total — so carmine always marks the amount being built.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.  app/labs/MoneyLab.jsx
     2. Import and render it:
          import MoneyLab from './MoneyLab';
          export default function Page() { return <MoneyLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (five coin counts, step).
     MODEL  — the math is pure integer-cent arithmetic; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Five US denominations, smallest value → largest.  Each
   is a count dial that unlocks one lesson step later than the last, so a child
   meets one coin at a time.  `unlock` is the step index at which the dial goes
   live; `max` caps the count so the trays stay legible.  `rSize` is the coin's
   TRUE relative diameter (mm), preserved so the dime renders visibly smaller
   than the nickel — the classic "size ≠ value" surprise.
   ------------------------------------------------------------------------- */
const COINS = [
  { key: 'penny', name: 'Penny', plural: 'pennies', face: '1¢', cents: 1, unlock: 1, max: 9, color: '#B06A2C', kind: 'coin', rSize: 19.05 },
  { key: 'nickel', name: 'Nickel', plural: 'nickels', face: '5¢', cents: 5, unlock: 2, max: 9, color: '#8A929C', kind: 'coin', rSize: 21.21 },
  { key: 'dime', name: 'Dime', plural: 'dimes', face: '10¢', cents: 10, unlock: 3, max: 9, color: '#818A94', kind: 'coin', rSize: 17.91 }, // smallest!
  { key: 'quarter', name: 'Quarter', plural: 'quarters', face: '25¢', cents: 25, unlock: 4, max: 4, color: '#6C7682', kind: 'coin', rSize: 24.26 },
  { key: 'dollar', name: 'Dollar', plural: 'dollar bills', face: '$1', cents: 100, unlock: 5, max: 4, color: '#2E7D57', kind: 'bill', rSize: 30.0 },
];
// pieces of denomination i, correctly pluralised ("1 penny" / "3 pennies")
const pieceLabel = (n, i) => `${n} ${n === 1 ? COINS[i].name.toLowerCase() : COINS[i].plural}`;
const N_DEN = COINS.length;
const RSIZE_MAX = 24.26; // quarter — the largest coin, used to normalise radii

// Start counts give the pleasant reveal 3¢ → 18¢ → 38¢ → 88¢ → $1.88 as
// denominations unlock: 3 pennies, 3 nickels, 2 dimes, 2 quarters, 1 dollar.
const START = [3, 3, 2, 2, 1];

const DECIMAL_STEP = 6;
const CALIB_STEP = 7;

/* How many denominations are REVEALED (shown & counted) at a given step.
   Step 0 is the "meet the money" gallery (nothing counted yet); each of steps
   1–5 reveals one more denomination; steps 6–7 show all five. */
const revealedCount = (s) => (s <= 0 ? 0 : Math.min(N_DEN, s));

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Money is EXACT integer-cent arithmetic; there is nothing to
   approximate and never a float to round.  Only REVEALED denominations
   contribute, so navigating back to an earlier step cleanly shrinks the amount.
   ------------------------------------------------------------------------- */
function totalCentsOf(counts, revealed) {
  let c = 0;
  for (let i = 0; i < N_DEN; i++) if (i < revealed) c += counts[i] * COINS[i].cents;
  return c;
}

/* Format integer cents as a dollar string "$1.05" — cents ALWAYS two digits,
   built by string so it is exact.  And as a plain "¢" string "5¢". */
function fmtDollars(cents) {
  const neg = cents < 0;
  const a = Math.abs(cents);
  return (neg ? '-' : '') + '$' + Math.floor(a / 100) + '.' + String(a % 100).padStart(2, '0');
}
const fmtCents = (cents) => `${cents}¢`;

/* Number-to-words for small whole numbers (US English, 0–999 is plenty here:
   dollars ≤ 6, cents ≤ 99). */
const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function under100(n) {
  if (n < 20) return ONES_W[n];
  return TENS_W[Math.floor(n / 10)] + (n % 10 ? '-' + ONES_W[n % 10] : '');
}
function wordSmall(n) {
  if (n < 100) return under100(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  return ONES_W[h] + ' hundred' + (r ? ' ' + under100(r) : '');
}

/* Read a money amount in words: "one dollar and twenty-three cents",
   "eighty-five cents", "two dollars", "one cent".  (In spoken US English "and"
   naturally joins the dollars and cents — unlike the whole-number word form.) */
function readMoney(cents) {
  const d = Math.floor(cents / 100);
  const c = cents % 100;
  const dp = d > 0 ? `${wordSmall(d)} dollar${d === 1 ? '' : 's'}` : '';
  const cp = c > 0 ? `${wordSmall(c)} cent${c === 1 ? '' : 's'}` : '';
  if (d > 0 && c > 0) return `${dp} and ${cp}`;
  if (d > 0) return dp;
  if (c > 0) return cp;
  return 'zero dollars';
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* Fewest coins/bills for an amount — greedy largest-first, which is provably
   OPTIMAL for the US denomination set.  Returns [{count, den}] largest first. */
function fewestPieces(cents) {
  const out = [];
  let r = cents;
  for (let i = N_DEN - 1; i >= 0; i--) {
    const q = Math.floor(r / COINS[i].cents);
    if (q > 0) {
      out.push({ count: q, i });
      r -= q * COINS[i].cents;
    }
  }
  return out;
}
const pieceCount = (cents) => fewestPieces(cents).reduce((a, p) => a + p.count, 0);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): make EXACTLY a target amount with the coin & bill dials.
   Because many coin sets share a value, there are many correct answers — which
   is exactly the lesson (equivalent amounts).  The meter measures closeness in
   cents; CALIBRATED only when the total equals the target exactly.
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 50; // cents of error that drops the meter to 0%
const matchPercent = (total, target) => 100 * Math.max(0, 1 - Math.abs(total - target) / MATCH_SCALE);
const isCalibrated = (total, target) => total === target;

// Every amount ≤ $2.89 is greedy-buildable within the dial caps (greedy uses
// dollars ≤2, quarters ≤3, dimes ≤2, nickels ≤1, pennies ≤4 — all within caps).
function makeTarget(prev) {
  let t;
  do {
    t = 8 + Math.floor(Math.random() * 282); // 8¢ … $2.89
  } while (prev != null && t === prev);
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One denomination per step; the dial unlocks with the step;
   the reveal lives in `feedback`; distractors are real learner misconceptions
   (add the digits instead of skip-counting, judge value by size, drop a zero in
   the cents).  Next is gated on ANSWERED, never on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the money',
    body:
      'Penny 1¢, nickel 5¢, dime 10¢, quarter 25¢ — and 100¢ make one dollar. ' +
      'The dime is the smallest coin, yet beats the nickel!',
    q: 'Which is worth more — a dime or a nickel?',
    choices: ['The dime — 10¢ beats 5¢', 'The nickel — it is bigger', 'The same'],
    answer: 0,
    feedback: 'Value comes from the markings, never the size. Two nickels equal one dime.',
  },
  {
    title: 'Pennies · 1¢',
    body: 'Pennies count one at a time: 1, 2, 3, 4… Drag the penny dial.',
    q: 'You have 5 pennies. How much money is that?',
    choices: ['5¢', '1¢', '10¢'],
    answer: 0,
    feedback: 'Five pennies are 5 × 1¢ = 5¢ — the same as one nickel.',
  },
  {
    title: 'Nickels · 5¢',
    body: 'Count nickels by fives: 5, 10, 15, 20…',
    q: 'How much are 3 nickels worth?',
    choices: ['15¢ — count 5, 10, 15', '8¢ — 5 plus 3', '3¢'],
    answer: 0,
    feedback: '5 + 5 + 5 = 15¢. Each nickel adds 5¢ — never just count the coins.',
  },
  {
    title: 'Dimes · 10¢',
    body: 'Count dimes by tens: 10, 20, 30… Each dime fills one whole column.',
    q: 'How much are 4 dimes worth?',
    choices: ['40¢ — count 10, 20, 30, 40', '14¢ — 10 plus 4', '4¢'],
    answer: 0,
    feedback: '10 + 10 + 10 + 10 = 40¢. Ten dimes would fill the grid: one dollar.',
  },
  {
    title: 'Quarters · 25¢',
    body: 'Count quarters by twenty-fives: 25, 50, 75, 100.',
    q: 'How many quarters make one dollar?',
    choices: ['4 — count 25, 50, 75, 100', '2', '10'],
    answer: 0,
    feedback: 'Four — a “quarter” is one of the FOUR equal parts of a dollar.',
  },
  {
    title: 'Dollars · making $1',
    body: 'Any coins that total 100¢ trade for one dollar bill.',
    q: 'Which does NOT equal one dollar?',
    choices: ['3 quarters and 1 dime', '4 quarters', '10 dimes'],
    answer: 0,
    feedback: '75¢ + 10¢ = 85¢ — that is 15¢ short. The other two make exactly 100¢.',
  },
  {
    title: 'Write it with a decimal point',
    body: 'Money is $DOLLARS.CENTS — always TWO digits after the point.',
    q: 'How do you write “one dollar and five cents”?',
    choices: ['$1.05 — cents take two digits', '$1.5', '$1.50'],
    answer: 0,
    feedback: '$1.05. Writing $1.5 would mean $1.50 — a 45¢ mistake!',
  },
  {
    title: 'Make the amount',
    body: 'Make EXACTLY the amount shown. Any coin set that totals the target counts!',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display.  The running total as a big dollar amount (the
   carmine accent) plus its exact cents.  Colour and inline styles keep the
   symbol linked to the picture — and because this is a CHILD component, the
   coloured pieces use INLINE styles (styled-jsx :global would not scope a
   child’s spans, and is dropped by the Babel preview harness anyway).
   ------------------------------------------------------------------------- */
function MoneyEquation({ total, revealed, gallery }) {
  if (gallery) {
    return (
      <span className="eq">
        <span style={{ color: '#C81E4F', fontWeight: 700 }}>100¢</span>
        <span style={{ color: '#5B6B7B', fontWeight: 400 }}>&nbsp;=&nbsp;</span>
        <span style={{ color: '#2E7D57', fontWeight: 700 }}>$1.00</span>
        <span style={{ color: '#5B6B7B', fontWeight: 400, fontSize: '14px' }}>
          &nbsp;&nbsp;· one dollar
        </span>
      </span>
    );
  }
  return (
    <span className="eq">
      <span style={{ color: '#C81E4F', fontWeight: 700 }}>{fmtDollars(total)}</span>
      <span style={{ color: '#5B6B7B', fontWeight: 400, fontSize: '15px' }}>
        &nbsp;=&nbsp;{fmtCents(total)}
      </span>
      {void revealed}
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function MoneyLab() {
  const [counts, setCounts] = useState(START); // [penny, nickel, dime, quarter, dollar]
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [counting, setCounting] = useState(false); // "count up" skip-count sweep

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // { type:'tray', i } | { type:'grid' } | null
  const countRef = useRef(null); // during the count-up sweep: coins shown in the active tray
  const layoutRef = useRef({ trays: [], grid: null });
  const sceneRef = useRef({});

  const revealed = revealedCount(step);
  const current = STEPS[step];
  const calib = !!current.calib;
  const gallery = step === 0;
  const activeDen = step >= 1 && step <= 5 ? step - 1 : -1; // denomination taught this step
  const total = totalCentsOf(counts, revealed);

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/animation handlers never read stale values.
  sceneRef.current = {
    counts,
    revealed,
    step,
    calib,
    gallery,
    activeDen,
    counting,
    total,
    target,
  };

  const pct = target != null ? matchPercent(total, target) : 0;
  const calibrated = target != null ? isCalibrated(total, target) : false;
  sceneRef.current._cal = calib && target != null && calibrated;

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

    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARM = '#C81E4F';
    const BLUE = '#2D5F8C';
    const OK = '#1F8A5B';

    const S = sceneRef.current;
    const cts = S.counts;
    const r = S.revealed;
    const T = S.total;

    /* small helpers ------------------------------------------------------- */
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
    const shade = (hex, amt) => {
      const v = parseInt(hex.slice(1), 16);
      let R = (v >> 16) & 255, G = (v >> 8) & 255, B = v & 255;
      const to = amt < 0 ? 0 : 255;
      const f = Math.abs(amt);
      R = Math.round(R + (to - R) * f);
      G = Math.round(G + (to - G) * f);
      B = Math.round(B + (to - B) * f);
      return `rgb(${R},${G},${B})`;
    };
    const TAU = Math.PI * 2;

    /* draw one coin at (cx,cy) with radius R */
    const drawCoin = (idx, cx, cy, R, dim) => {
      const c = COINS[idx];
      ctx.save();
      // soft shadow
      ctx.beginPath();
      ctx.arc(cx, cy + R * 0.12, R, 0, TAU);
      ctx.fillStyle = 'rgba(28,43,58,0.10)';
      ctx.fill();
      // metal body (radial highlight)
      const g = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.34, R * 0.15, cx, cy, R);
      g.addColorStop(0, shade(c.color, dim ? 0.28 : 0.46));
      g.addColorStop(0.72, dim ? shade(c.color, 0.25) : c.color);
      g.addColorStop(1, shade(c.color, -0.22));
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();
      // rim
      ctx.lineWidth = Math.max(1, R * 0.11);
      ctx.strokeStyle = shade(c.color, -0.32);
      ctx.stroke();
      // inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.78, 0, TAU);
      ctx.lineWidth = 1;
      ctx.strokeStyle = shade(c.color, 0.2);
      ctx.stroke();
      // value text
      if (R >= 9) {
        ctx.fillStyle = idx === 0 ? '#3B2510' : '#232B34';
        ctx.font = `700 ${Math.max(8, R * (c.face.length > 2 ? 0.5 : 0.62))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.face, cx, cy);
      }
      ctx.restore();
    };

    /* draw a $1 bill at (x,y) size w×h */
    const drawBill = (x, y, w, h, dim) => {
      ctx.save();
      rr(x, y + 2, w, h, 5);
      ctx.fillStyle = 'rgba(28,43,58,0.10)';
      ctx.fill();
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, dim ? '#E6F2EA' : '#D8EFE0');
      g.addColorStop(1, dim ? '#D3E9DA' : '#BFE3CC');
      rr(x, y, w, h, 5);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#2E7D57';
      rr(x, y, w, h, 5);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(46,125,87,0.5)';
      rr(x + 3, y + 3, w - 6, h - 6, 4);
      ctx.stroke();
      // center oval
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, Math.min(w, h) * 0.3, 0, 0, TAU);
      ctx.fillStyle = 'rgba(46,125,87,0.13)';
      ctx.fill();
      // $1
      ctx.fillStyle = '#1F6A48';
      ctx.font = `700 ${Math.max(9, h * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$1', x + w / 2, y + h / 2);
      // corner 1s
      ctx.font = `700 ${Math.max(7, h * 0.22)}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(31,106,72,0.8)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('1', x + 5, y + 4);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('1', x + w - 5, y + h - 4);
      ctx.restore();
    };

    ctx.clearRect(0, 0, W, H);

    /* ---- quadrille paper ------------------------------------------------- */
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

    const padL = 18, padR = 18;
    layoutRef.current = { trays: [], grid: null };

    /* ======================================================================
       STEP 0 — the "meet the money" gallery: five denominations sorted by
       physical size so the dime-is-smallest surprise is visible.
       ==================================================================== */
    if (S.gallery) {
      const order = [...COINS.keys()].sort((a, b) => COINS[a].rSize - COINS[b].rSize); // dime,penny,nickel,quarter,dollar
      const bandY = H * 0.30;
      const slotW = (W - padL - padR) / N_DEN;
      const baseR = Math.min(slotW * 0.30, H * 0.14);
      ctx.textAlign = 'center';
      order.forEach((idx, k) => {
        const c = COINS[idx];
        const cx = padL + slotW * (k + 0.5);
        // name above
        ctx.fillStyle = INK;
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(c.name, cx, bandY - baseR - 14);
        if (c.kind === 'bill') {
          const bw = baseR * 2.5, bh = bw / 2.2;
          drawBill(cx - bw / 2, bandY - bh / 2, bw, bh, false);
        } else {
          const R = baseR * (c.rSize / RSIZE_MAX);
          drawCoin(idx, cx, bandY, R, false);
        }
        // value below
        ctx.fillStyle = c.kind === 'bill' ? '#2E7D57' : shade(c.color, -0.3);
        ctx.font = '700 15px ui-monospace, Menlo, monospace';
        ctx.textBaseline = 'top';
        ctx.fillText(c.face, cx, bandY + baseR + 12);
      });
      // size axis caption
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◂ smaller coin        ·        larger coin ▸', W / 2, bandY + H * 0.20);
      ctx.fillStyle = CARM;
      ctx.font = '600 12.5px system-ui, sans-serif';
      ctx.fillText('the dime is the smallest coin — but it is worth 10¢, more than the nickel', W / 2, bandY + H * 0.20 + 20);

      // the 100¢ = $1 banner at the bottom
      const banY = H * 0.86;
      ctx.fillStyle = 'rgba(200,30,79,0.08)';
      rr(W / 2 - 150, banY - 18, 300, 34, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,30,79,0.35)';
      ctx.lineWidth = 1.2;
      rr(W / 2 - 150, banY - 18, 300, 34, 8);
      ctx.stroke();
      ctx.fillStyle = CARM;
      ctx.font = '700 16px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('100 cents  =  $1.00', W / 2, banY);
      return;
    }

    /* ======================================================================
       BAND A — the coin trays (the SET model of the amount)
       ==================================================================== */
    const trayTop = 10;
    const trayBot = Math.round(H * 0.52);
    const gap = Math.max(8, Math.round(W * 0.012));
    const areaX0 = padL, areaX1 = W - padR, areaW = areaX1 - areaX0;
    const trayW = Math.min((areaW - gap * (r - 1)) / r, areaW / 3.0);
    const rowW = trayW * r + gap * (r - 1);
    const startX = areaX0 + (areaW - rowW) / 2;

    // shared coin sizing so a dime renders smaller than a quarter ACROSS trays
    const cellUnit = Math.min((trayW - 18) / 3, (trayBot - trayTop - 66) / 3);
    const Rq = Math.max(9, cellUnit * 0.42); // radius of the largest coin (quarter)

    for (let i = 0; i < r; i++) {
      const c = COINS[i];
      const x0 = startX + i * (trayW + gap);
      const cx = x0 + trayW / 2;
      const active = i === S.activeDen;
      layoutRef.current.trays.push({ i, x0, x1: x0 + trayW, y0: trayTop, y1: trayBot });

      // card
      ctx.save();
      ctx.fillStyle = active ? 'rgba(200,30,79,0.06)' : 'rgba(255,255,255,0.55)';
      rr(x0, trayTop, trayW, trayBot - trayTop, 10);
      ctx.fill();
      ctx.lineWidth = active ? 2.4 : 1.2;
      ctx.strokeStyle = active ? CARM : 'rgba(28,43,58,0.14)';
      rr(x0, trayTop, trayW, trayBot - trayTop, 10);
      ctx.stroke();
      ctx.restore();

      // header pill: name + value
      const headY = trayTop + 8;
      ctx.save();
      ctx.fillStyle = c.kind === 'bill' ? c.color : shade(c.color, -0.05);
      rr(x0 + 8, headY, trayW - 16, 20, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${trayW < 108 ? 10.5 : 12}px system-ui, sans-serif`;
      ctx.fillText(`${c.name}  ·  ${c.face}`, cx, headY + 11);
      ctx.restore();

      // coins / bills
      const cnt = cts[i];
      const contentTop = headY + 28;
      const contentBot = trayBot - 24;
      const contentH = contentBot - contentTop;
      // during the count-up sweep, only show the swept coins in the active tray
      const shown = S.counting && active && countRef.current != null ? Math.min(cnt, countRef.current) : cnt;

      if (c.kind === 'bill') {
        const bw = Math.min(trayW - 22, Rq * 3.2);
        const bh = bw / 2.2;
        const rowsAvail = Math.max(1, Math.floor(contentH / (bh + 6)));
        for (let k = 0; k < shown; k++) {
          const row = k;
          if (row >= rowsAvail) break;
          const by = contentTop + row * (bh + 6);
          drawBill(cx - bw / 2, by, bw, bh, false);
        }
      } else {
        const R = Rq * (c.rSize / RSIZE_MAX);
        const perRow = 3;
        const stepX = (trayW - 18) / perRow;
        const stepY = Math.min(contentH / 3, R * 2 + 12);
        for (let k = 0; k < shown; k++) {
          const row = Math.floor(k / perRow);
          const inThisRow = Math.min(perRow, cnt - row * perRow);
          const colX0 = cx - (inThisRow * stepX) / 2 + stepX / 2;
          const col = k - row * perRow;
          const px = colX0 + col * stepX;
          const py = contentTop + R + row * stepY;
          drawCoin(i, px, py, R, false);
          // skip-count running subtotal under the coin (active tray, steps 1–5)
          if (active) {
            ctx.save();
            ctx.fillStyle = CARM;
            ctx.font = '700 10.5px ui-monospace, Menlo, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(String((k + 1) * c.cents), px, py + R + 2);
            ctx.restore();
          }
        }
      }

      // subtotal footer
      ctx.save();
      ctx.fillStyle = cnt === 0 ? INK_SOFT : active ? CARM : shade(c.color, -0.2);
      ctx.font = `700 ${trayW < 108 ? 11 : 12.5}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const sub = cnt * c.cents;
      const subStr = c.cents >= 100 || sub >= 100 ? fmtDollars(sub) : fmtCents(sub);
      ctx.fillText(`${cnt} × ${c.face} = ${subStr}`, cx, trayBot - 8);
      ctx.restore();
    }

    /* ======================================================================
       BAND B — the hundred-cent dollar grid (the PLACE-VALUE model): one dollar
       = a 10×10 grid of 100 cents; whole dollars shown as $1 bills to the left.
       ==================================================================== */
    const bandTop = Math.round(H * 0.575);
    const bandBot = Math.round(H * 0.965);
    const bandH = bandBot - bandTop;

    // grid geometry — square, cells crisp
    let cs = Math.floor(Math.min(bandH - 30, (areaW) * 0.34) / 10);
    cs = Math.max(9, cs);
    const gridSide = cs * 10;
    const dollars = Math.floor(T / 100);
    const centsPart = T % 100;

    // reserve a left column for whole-dollar bills, and place the grid
    const dollarColW = Math.min(gridSide * 0.62, areaW * 0.22);
    const gridX = areaX0 + dollarColW + 14;
    const gridY = bandTop + Math.max(6, (bandH - gridSide) / 2) + 6;

    // caption above the grid
    ctx.save();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('one dollar = 100 cents', gridX, gridY - 8);
    ctx.restore();

    layoutRef.current.grid = { x0: gridX, y0: gridY, side: gridSide, cs };

    // grid cells: fill `centsPart` column-major (full columns = dimes, singles = pennies)
    for (let col = 0; col < 10; col++) {
      for (let rowc = 0; rowc < 10; rowc++) {
        const idxCell = col * 10 + rowc; // column-major
        const gx = gridX + col * cs;
        const gy = gridY + (9 - rowc) * cs; // fill from the bottom up
        const filled = idxCell < centsPart;
        const inFullColumn = filled && (col + 1) * 10 <= centsPart;
        ctx.fillStyle = filled
          ? inFullColumn
            ? 'rgba(200,30,79,0.85)'
            : 'rgba(200,30,79,0.45)'
          : 'rgba(45,95,140,0.05)';
        ctx.fillRect(gx + 0.5, gy + 0.5, cs - 1, cs - 1);
      }
    }
    // grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(45,95,140,0.35)';
    ctx.lineWidth = 1;
    for (let k = 0; k <= 10; k++) {
      const gx = Math.round(gridX + k * cs) + 0.5;
      const gy = Math.round(gridY + k * cs) + 0.5;
      ctx.beginPath();
      ctx.moveTo(gx, gridY);
      ctx.lineTo(gx, gridY + gridSide);
      ctx.moveTo(gridX, gy);
      ctx.lineTo(gridX + gridSide, gy);
      ctx.stroke();
    }
    // thicker outer frame
    ctx.strokeStyle = 'rgba(28,43,58,0.5)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(gridX + 0.5, gridY + 0.5, gridSide, gridSide);
    ctx.restore();

    // grid legend under it
    ctx.save();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`▪ = 1¢    ▏column = 10¢ (a dime)`, gridX, gridY + gridSide + 6);
    ctx.fillStyle = CARM;
    ctx.font = '700 11px ui-monospace, Menlo, monospace';
    ctx.fillText(`${centsPart}¢ of 100 filled`, gridX, gridY + gridSide + 21);
    ctx.restore();

    // whole-dollar bills stacked in the reserved left column
    if (dollars > 0) {
      const bw = Math.min(dollarColW - 8, gridSide * 0.6);
      const bh = bw / 2.2;
      const maxRows = Math.max(1, Math.floor(gridSide / (bh + 5)));
      const showBills = Math.min(dollars, maxRows);
      for (let k = 0; k < showBills; k++) {
        drawBill(areaX0 + (dollarColW - bw) / 2, gridY + k * (bh + 5), bw, bh, false);
      }
      ctx.save();
      ctx.fillStyle = '#2E7D57';
      ctx.font = '700 12px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${dollars} × $1`, areaX0 + dollarColW / 2, gridY + gridSide + 6);
      ctx.restore();
    }

    // right zone: step-specific readout ------------------------------------
    const rzX = gridX + gridSide + 18;
    const rzW = areaX1 - rzX;
    if (rzW > 90) {
      ctx.save();
      ctx.textAlign = 'left';
      if (S.step === 5) {
        // "ways to make $1" equivalences
        ctx.fillStyle = INK;
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText('$1.00 in coins:', rzX, gridY + 2);
        ctx.font = '600 12px ui-monospace, Menlo, monospace';
        ctx.fillStyle = INK_SOFT;
        const lines = ['4 quarters', '10 dimes', '20 nickels', '100 pennies'];
        lines.forEach((ln, k) => ctx.fillText('= ' + ln, rzX, gridY + 24 + k * 19));
      } else if (S.step === DECIMAL_STEP) {
        // decimal place-value breakdown of the amount
        const t = Math.floor(centsPart / 10);
        const h = centsPart % 10;
        ctx.fillStyle = CARM;
        ctx.font = '700 20px ui-monospace, Menlo, monospace';
        ctx.textBaseline = 'top';
        ctx.fillText(fmtDollars(T), rzX, gridY + 2);
        ctx.font = '600 11.5px system-ui, sans-serif';
        ctx.fillStyle = INK_SOFT;
        const rows = [
          `${dollars}  dollars`,
          `${t}  dimes  (tenths, $0.10)`,
          `${h}  pennies (hundredths, $0.01)`,
        ];
        rows.forEach((ln, k) => ctx.fillText(ln, rzX, gridY + 32 + k * 18));
      } else if (S.calib && S.target != null) {
        ctx.fillStyle = INK_SOFT;
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText('target', rzX, gridY + 2);
        ctx.fillStyle = INK;
        ctx.font = '700 22px ui-monospace, Menlo, monospace';
        ctx.fillText(fmtDollars(S.target), rzX, gridY + 18);
        ctx.fillStyle = S._cal ? OK : CARM;
        ctx.font = '700 13px ui-monospace, Menlo, monospace';
        ctx.fillText(`you: ${fmtDollars(T)}`, rzX, gridY + 46);
      } else {
        // default: the amount, big
        ctx.fillStyle = CARM;
        ctx.font = '700 24px ui-monospace, Menlo, monospace';
        ctx.textBaseline = 'top';
        ctx.fillText(fmtDollars(T), rzX, gridY + 4);
        ctx.fillStyle = INK_SOFT;
        ctx.font = '600 12px ui-monospace, Menlo, monospace';
        ctx.fillText(fmtCents(T), rzX, gridY + 34);
      }
      ctx.restore();
    }

    /* ---- hover caption --------------------------------------------------- */
    const hv = hoverRef.current;
    if (hv) {
      let msg = null;
      if (hv.type === 'tray' && hv.i < r) {
        const c = COINS[hv.i];
        const sub = cts[hv.i] * c.cents;
        const subStr = sub >= 100 ? fmtDollars(sub) : fmtCents(sub);
        const label = cts[hv.i] === 1 ? c.name.toLowerCase() : c.plural;
        msg = `${cts[hv.i]} ${label} = ${cts[hv.i]} × ${c.face} = ${subStr}`;
      } else if (hv.type === 'grid') {
        msg = `${centsPart}¢ of 100  =  ${fmtDollars(centsPart)} toward the next dollar`;
      }
      if (msg) {
        ctx.save();
        ctx.font = '600 12px ui-monospace, Menlo, monospace';
        const tw = ctx.measureText(msg).width;
        const bx = Math.max(10, Math.min(W - tw - 22, 12));
        ctx.fillStyle = 'rgba(251,251,248,0.95)';
        rr(bx, 8, tw + 14, 22, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(200,30,79,0.4)';
        ctx.lineWidth = 1;
        rr(bx, 8, tw + 14, 22, 5);
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(msg, bx + 7, 20);
        ctx.restore();
      }
    }

    /* ---- CALIBRATED stamp ------------------------------------------------ */
    if (S._cal) {
      ctx.save();
      ctx.translate(W / 2, bandTop - 6);
      ctx.rotate(-0.05);
      ctx.fillStyle = 'rgba(31,138,91,0.1)';
      rr(-72, -15, 144, 30, 7);
      ctx.fill();
      ctx.strokeStyle = OK;
      ctx.lineWidth = 2;
      rr(-72, -15, 144, 30, 7);
      ctx.stroke();
      ctx.fillStyle = OK;
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓ CALIBRATED', 0, 0.5);
      ctx.restore();
    }
    void BLUE;
  }, []);

  /* redraw when state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [counts, step, target, counting, draw]);

  /* redraw on resize */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it; reset the
     coins to 0 so it starts clearly un-matched. */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setCounts([0, 0, 0, 0, 0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the "count up" skip-count sweep — reveal the active tray's coins one at a
     time, time-based, opt-in, reduced-motion-respecting. */
  useEffect(() => {
    if (!counting) {
      countRef.current = null;
      return;
    }
    if (activeDen < 0 || counts[activeDen] <= 0) {
      setCounting(false);
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setCounting(false);
      return;
    }
    const n = counts[activeDen];
    let raf;
    let start = null;
    const per = 420; // ms per coin
    const loop = (now) => {
      if (start == null) start = now;
      const k = Math.min(n, 1 + Math.floor((now - start) / per));
      countRef.current = k;
      draw();
      if (k < n) raf = requestAnimationFrame(loop);
      else setCounting(false);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [counting, activeDen, counts, draw]);

  /* ---- interaction ------------------------------------------------------- */
  const setCount = (i, value) => {
    const v = parseInt(value, 10);
    setCounts((prev) => {
      const next = prev.slice();
      next[i] = v;
      return next;
    });
    if (counting) setCounting(false);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let hit = null;
    for (const t of layoutRef.current.trays) {
      if (x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1) {
        hit = { type: 'tray', i: t.i };
        break;
      }
    }
    if (!hit) {
      const g = layoutRef.current.grid;
      if (g && x >= g.x0 && x <= g.x0 + g.side && y >= g.y0 && y <= g.y0 + g.side) hit = { type: 'grid' };
    }
    const prev = hoverRef.current;
    const changed = JSON.stringify(prev) !== JSON.stringify(hit);
    if (changed) {
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
    setCounts(calib ? [0, 0, 0, 0, 0] : START.slice());
    if (counting) setCounting(false);
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

  const fewest = fewestPieces(total);
  const fewestStr = fewest.length ? fewest.map((p) => pieceLabel(p.count, p.i)).join(', ') : '—';
  const fewestTargetStr =
    calib && target != null && fewestPieces(target).length
      ? fewestPieces(target).map((p) => pieceLabel(p.count, p.i)).join(', ')
      : '—';
  const spoken =
    gallery
      ? 'Meet the money: penny one cent, nickel five cents, dime ten cents, quarter twenty-five cents, and a one dollar bill worth one hundred cents.'
      : `The amount is ${fmtDollars(total)}, ${readMoney(total)}.`;

  return (
    <div className="mlab">
      <header className="head">
        <h1>Counting Money: Coins, Bills &amp; the Dollar</h1>
        <p className="lede">
          Every amount of money is a count of coins and bills, added up in <em>cents</em> — and
          100&nbsp;cents make one dollar. Meet each coin one at a time (
          <span className="mono">penny → nickel → dime → quarter → dollar</span>), skip-count to a
          total, and see why we write money with a <em>decimal point</em>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <MoneyEquation total={total} revealed={revealed} gallery={gallery} />
            </p>
            <p className="equation-sub mono">{gallery ? 'penny · nickel · dime · quarter · dollar' : cap(readMoney(total))}</p>
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
            <span className="hint mono">100¢ = $1.00 · a coin’s value is not its size</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — you made ${fmtDollars(target)}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Total</span>
              <span className="fact-v mono big">{fmtDollars(total)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">In cents</span>
              <span className="fact-v mono">{fmtCents(total)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">In words</span>
              <span className="fact-v">{cap(readMoney(total))}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Fewest coins &amp; bills</span>
              <span className="fact-v">
                {fewestStr}
                {fewest.length ? ` (${pieceCount(total)})` : ''}
              </span>
            </div>
          </div>

          <div className="toolbar">
            {activeDen >= 0 && COINS[activeDen].kind === 'coin' && counts[activeDen] > 0 && (
              <button
                type="button"
                className={'btn ghost' + (counting ? ' on' : '')}
                onClick={() => setCounting((c) => !c)}
              >
                {counting ? 'Counting…' : `Count up by ${COINS[activeDen].cents}s`}
              </button>
            )}
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
            {COINS.map((d, i) => {
              const unlocked = step >= d.unlock;
              const val = counts[i];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk" style={{ color: d.color }}>
                    {d.name}
                  </span>
                  <span className="drole">{unlocked ? `worth ${d.face}` : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={0}
                    max={d.max}
                    step={1}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Number of ${d.name.toLowerCase()}s — worth ${d.face} each`}
                    onChange={(e) => setCount(i, e.target.value)}
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
                <span className="target-k">Make this amount</span>
                <span className="target-words mono">{fmtDollars(target)}</span>
                <span className="target-sub">{cap(readMoney(target))}</span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">you made {fmtDollars(total)}</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {total === target ? '' : total > target ? `${fmtCents(total - target)} too much` : `${fmtCents(target - total)} to go`}
                  </span>
                )}
              </div>
              {calibrated && (
                <p className="calib-note">
                  You used {pieceCount(total)} piece{pieceCount(total) === 1 ? '' : 's'}. The fewest possible is{' '}
                  {pieceCount(target)} — {fewestTargetStr}. Many coin sets, one amount!
                </p>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setCounts([0, 0, 0, 0, 0]);
                }}
              >
                New amount
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
                  setCounts(START.slice());
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">total¢ = 1·p + 5·n + 10·d + 25·q + 100·$ ·· $1.00 = 100¢</span> &nbsp;·&nbsp;
        counting coins &amp; bills and writing amounts with $ and ¢ (CCSS 2.MD.C.8), extended to
        money as decimals (4.MD.A.2).
      </footer>

      <style jsx>{`
        .mlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #2d5f8c;
          --green: #2e7d57;
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
          font-size: 26px;
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
          color: var(--green);
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
          gap: 11px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 72px 1fr 30px;
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
          background: rgba(46, 125, 87, 0.07);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .target-words {
          font-size: 26px;
          font-weight: 700;
          color: var(--green);
        }
        .target-sub {
          font-size: 12.5px;
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
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          gap: 8px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .calib-note {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ink);
          background: rgba(31, 138, 91, 0.07);
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
