'use client';

/* ============================================================================
   HundredChartLab — an interactive "bench" for COUNTING TO ONE HUNDRED, by
   ones and by tens, on the hundred chart — and then PAST it, to 120, because
   one hundred was never a wall.

        …28, 29, → 30 (a new row begins)        10, 20, 30, … 100 (the fast lane)

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a KINDERGARTEN
   lab that now carries one grade-1 step:
     • CCSS K.CC.A.1  count to 100 by ones and by tens   <- the anchor
     • CCSS 1.NBT.A.1 count to 120, starting at any number under 120
                      <- added 2026-07-17 as an EXTENSION, not a sibling lab.
                      Rounding a chart is not a new idea and does not deserve a
                      new picture: the chart already GROWS with the lesson
                      (1 row -> 3 -> 10), so "the pattern does not stop" is told
                      with machinery this lab already owns — two more rows. It
                      cost one step and NO new dial, NO new mode, NO second
                      representation, which is what lets a K-tier lab absorb it.
                      The five Kindergarten steps still stop at one hundred; the
                      audit pins that so the extension cannot leak backwards.
   CCSS K.CC.A.1 ("count to 100 by ones and by tens") is the anchor,
   with K.CC.A.2 (count on from a given number — the capstone's game) and
   K.CC.A.3 (read the numerals) carried along.  CountingLab taught what
   counting IS on 0–20; this lab is about the SEQUENCE'S SHAPE from there to
   one hundred: the names repeat a pattern, the pattern fills rows of ten, and
   the count can travel the chart at two speeds.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE ROLLOVER, AND THE TWO SPEEDS."
     The count is a path through the chart: cells light in order, and the
     number you are ON is the one carmine cell, said out loud as a word
     ("twenty-nine").  The star moment is the ROLLOVER: after twenty-nine the
     row is full, and the next press does not stop the count — it starts a NEW
     row with a new name, thirty.  "Twenty-ten" — the single most common
     kindergarten counting error — is a choice in the step-2 question, and the
     chart itself is the refutation: there is no cell for it.
     Then the second speed: +10 leaps a WHOLE ROW in one press, straight down
     the chart — ten, twenty, thirty … one hundred.  Ten presses land on the
     same cell that one hundred single steps reach, and the step-5 lens draws
     that fast lane down the chart's right edge.  Same landing, fewer says:
     that comparison IS "count by tens", and the child makes it with buttons.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • PrimeNumbersLab owns the 1–100 grid AS A SIEVE: cells are STRUCK OUT by
       divisibility and survival is a proof.  Here nothing is ever struck,
       eliminated, or crossed off; cells only light IN COUNTING ORDER, and the
       object is the path, not the population.
     • MultiplesLab owns skip-counting AS ARITHMETIC: equal jumps on a number
       line landing on n, 2n, 3n …, running to "forever", with the LCM as its
       capstone.  This lab draws no number line and no jump arcs; +10 here is
       a ROW OF THE CHART, the count stops at one hundred, and the point is
       saying the decade words in order — a kindergarten mouth-skill, not a
       multiplication fact.
     • TwoDigitNumberLab owns BUNDLING (ten loose ones snapping into a ten-rod)
       and the tens/ones anatomy of a numeral.  TeenNumbersLab owns the teen
       NAMES.  NumberLab owns the place-value chart.  This lab never bundles,
       never splits a numeral into parts, and never says "tens place": rows
       are just where the count's pattern folds, and the names are read whole.
     • CountingLab owns one-to-one correspondence and cardinality on 0–20 (a
       gold finger touching OBJECTS).  Nothing is counted here — there are no
       objects and no "how many": the cells ARE the numbers, and the skill is
       knowing what comes next, all the way to one hundred.
     • DecimalLab / PercentageLab / MoneyLab own 10×10 grids where cells are
       PARTS OF ONE WHOLE (hundredths, cents).  This grid's cells are the
       whole numbers 1–100 themselves; nothing is shaded as an amount.

   One-accent discipline: CARMINE is THE COUNT — the cell you are on, the lit
   path behind you, the leap arrow, and the number word being said.  GOLD is
   the goal/structure tool: the target cell in the capstone, the fast-lane
   edge in the lens, the underline of a completed row.  GREEN is reserved for
   "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a five-year-old):
     • The count n is an INTEGER 0–100; +1 and +10 are integer moves that are
       DISABLED rather than clamped when they would leave the chart, so the
       model never overshoots 100 silently.
     • Number words are built by exact rule and audited: every word 1–100 is
       unique, "forty" has no u, hyphens appear exactly where English puts
       them, and the word always matches the numeral in the carmine cell.
     • The calibration stamp is the integer identity  n === target.  Nothing
       else can fire it: the meter reads 100 only at equality (audited over
       every target × every reachable n), and the capstone hides the scrub
       dial, so the only way to the gold cell is to COUNT there.
   Verified by audit-hundredchart.mjs (numeric proof + source greps) and
   verify-hundredchart.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/HundredChartLab.jsx
     2. Import and render it:
          import HundredChartLab from './HundredChartLab';
          export default function Page() { return <HundredChartLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the count n, the last
              move, the lesson step, answers, the challenge target).
     MODEL  — pure integer arithmetic + the exact word rule; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  One dial (the Count, for riding the chart), two
   buttons (+1 and +10 — the two speeds), and nothing else to operate.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the count: current cell, lit path, word, leap
const GOLD = '#b98718'; // the goal & structure: target cell, fast lane, row lines
const INK_HEX = '#1c2b3a';

const DIALS = [
  { key: 'count', name: 'Count', role: 'ride the whole chart · 0–120', min: 0, max: 120, unlock: 2, color: CARMINE },
];

const CALIB_STEP = 6; // one step later since 1.NBT.A.1 ('past one hundred') was added

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integers and an exact word rule.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function wordFor(v) {
  /* 1.NBT.A.1 (added 2026-07-17): the names past one hundred are the names you
     already have, with 'one hundred' in front — so the rule RECURSES rather
     than growing a new table. 101 -> 'one hundred one', 120 -> 'one hundred
     twenty'. US school convention: no 'and'. Every word 1-120 stays exact and
     distinct (audited by exhaustive sweep). */
  if (v >= 100) {
    const r = v - 100;
    return 'one hundred' + (r ? ' ' + wordFor(r) : '');
  }
  if (v < 20) return ONES_W[v];
  const t = Math.floor(v / 10);
  const o = v % 10;
  return TENS_W[t] + (o ? '-' + ONES_W[o] : '');
}

/* the chart: cell v (1…120) lives in row 1…12, column 1…10 */
const rowOf = (v) => Math.ceil(v / 10);
const colOf = (v) => ((v - 1) % 10) + 1;

/* the rollover: v just FILLED a row (…9 → the next press starts a new row) */
const isRowEnd = (v) => v > 0 && v % 10 === 0;

/* WHAT WAS SAID.  The lit path records the numbers the child actually said,
   not merely the numbers passed over — that distinction IS the two-speeds
   lesson: counting by ones washes whole rows; counting by tens lights ten
   sparse cells down the edge.  Same landing, visibly fewer says. */
const saidUpTo = (n) => {
  const s = new Set();
  for (let v = 1; v <= n; v++) s.add(v);
  return s;
};
const afterOne = (said, n) => {
  const s = new Set(said);
  s.add(n + 1);
  return s;
};
const afterLeap = (said, n) => {
  const s = new Set(said);
  s.add(n + 10);
  return s;
};

/* how far this step's chart reaches, and which moves it offers */
const stepCap = (rows) => rows * 10;
const canStepOne = (n, cap) => n + 1 <= cap;
const canLeapTen = (n, cap) => n + 10 <= cap;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Land on the gold cell."  From zero, reach the
   target exactly, with leaps of ten and single steps.  The scrub dial is
   hidden here: the only road to the gold cell is counting.

   No false stamp, provably: CALIBRATED ⟺ n === target, an integer identity.
   The meter reads 100 only at equality (99 is its ceiling everywhere else),
   audited over every target × every reachable count.  Targets have at least
   two full rows and some loose steps (21…99, never a row-ender), so the
   efficient road — leaps, then steps — is always a real mix.
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let t;
  do {
    t = 21 + Math.floor(Math.random() * 99); // 21 … 119 (was 21 … 99 before 1.NBT.A.1)
  } while (t % 10 === 0 || t === prev);
  return t;
}
const closeness = (n, t) => (n === t ? 100 : Math.max(0, Math.min(99, 100 - Math.abs(t - n))));
const isCalibrated = (n, t) => n === t;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the chart GROWS with the lesson (one
   row, then three, then all ten); every scene a step's words depend on is
   pinned by STEPS[].demo.  The step-2 distractor is the real error five-year-
   olds make; the reveal lives in the feedback.  Next gates on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The first row',
    body: 'Press +1 and count: one, two, three… Each number lights its cell.',
    rows: 1,
    demo: 0,
    buttons: ['one'],
    q: 'A row of this chart holds…',
    choices: ['Ten numbers', 'Nine numbers', 'One number'],
    answer: 0,
    feedback: 'Ten cells fill the row. Then where does the count go?',
  },
  {
    title: 'After twenty-nine comes…',
    body: 'Press +1 past twenty-nine. Watch where the next number lands.',
    rows: 3,
    demo: 27,
    buttons: ['one'],
    q: 'What comes right after twenty-nine?',
    choices: ['Thirty', 'Twenty-ten', 'Forty'],
    answer: 0,
    feedback: 'Thirty! There is no “twenty-ten” — a new row begins.',
  },
  {
    title: 'The whole chart',
    body: 'Slide the Count dial. Ride the path to the very last cell.',
    rows: 10,
    demo: null,
    buttons: ['one'],
    q: 'Where does this chart’s count end?',
    choices: ['At one hundred', 'It never ends', 'At ninety-nine'],
    answer: 0,
    feedback: 'One hundred fills the last cell: ten full rows of ten.',
  },
  {
    title: 'Counting by tens',
    body: 'Press +10: ten, twenty, thirty … a whole row per leap!',
    rows: 10,
    demo: 0,
    buttons: ['ten'],
    q: 'Counting by tens, what comes after forty?',
    choices: ['Fifty', 'Forty-one', 'Fourteen'],
    answer: 0,
    feedback: 'Fifty. Counting by tens, you say only the row-enders.',
  },
  {
    title: 'Two speeds, one landing',
    body: 'By ones: one hundred says. By tens: just ten. Try both!',
    rows: 10,
    demo: null,
    buttons: ['one', 'ten'],
    lens: { edge: true },
    q: 'Which way says FEWER numbers?',
    choices: ['By tens — ten says instead of one hundred', 'By ones', 'Both the same'],
    answer: 0,
    feedback: 'A leap of ten is worth a whole row of ones.',
  },
  {
    title: 'It does not stop at one hundred',
    body:
      'One hundred fills the chart — ten rows of ten. But the counting does not stop, and neither ' +
      'does the chart: two more rows appear. Ride the count past one hundred and listen.',
    rows: 12,
    demo: null,
    buttons: ['one', 'ten'],
    lens: { edge: true },
    q: 'After one hundred nine, what comes next?',
    choices: ['one hundred ten', 'two hundred', 'one hundred twenty'],
    answer: 0,
    feedback:
      'One hundred ten — and nothing new happened. 109 rolls into 110 exactly the way 9 rolled into ' +
      '10 and 29 rolled into 30: a new row begins. The names are the ones you already know with ' +
      '“one hundred” in front. One hundred was never a wall; it was just the end of the tenth row.',
  },
  {
    title: 'Land on the gold cell',
    body: 'Count to the gold cell. Land EXACTLY on it. Tens first is the fast road.',
    rows: 12,
    buttons: ['one', 'ten'],
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function HundredChartLab() {
  const [n, setN] = useState(0);
  const [said, setSaid] = useState(() => new Set()); // the numbers actually said
  const [lastMove, setLastMove] = useState(null); // 'one' | 'leap' | null
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const rows = current.rows;
  const cap = stepCap(rows);
  const buttons = current.buttons || [];

  const pct = calib && target != null ? closeness(n, target) : 0;
  const calibrated = calib && target != null ? isCalibrated(n, target) : false;
  const overshot = calib && target != null && n > target;

  sceneRef.current = {
    n,
    said,
    rows,
    lastMove,
    calib,
    calibrated,
    target: calib ? target : null,
    edge: !calib && !!(current.lens && current.lens.edge),
  };

  /* ---- full redraw from state ------------------------------------------- */
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
    const S = sceneRef.current;

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

    /* ---- layout: a SAY band on top (reserved, so it can never collide with
       the chart — the NumberBond lesson), the chart below ------------------ */
    const bandH = 64;
    const pad = 14;
    const cell = Math.min((W - pad * 2) / 10, (H - bandH - pad) / S.rows);
    const chartW = cell * 10;
    const x0 = (W - chartW) / 2;
    const y0 = bandH + (H - bandH - pad - cell * S.rows) / 2;

    /* the SAY band: the word being said (the count out loud) */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (S.n === 0) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 15px system-ui, sans-serif';
      ctx.fillText(S.calib ? 'count your way to the gold cell' : 'ready to count — the chart is listening', W / 2, bandH / 2);
    } else {
      ctx.fillStyle = CARMINE;
      const wf = Math.min(30, W / 14);
      ctx.font = `600 ${wf}px 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif`;
      ctx.fillText(wordFor(S.n), W / 2, bandH / 2 - (isRowEnd(S.n) && S.lastMove === 'one' && !S.calib ? 8 : 0));
      if (isRowEnd(S.n) && S.lastMove === 'one' && !S.calib && S.n < S.rows * 10) {
        ctx.fillStyle = INK_SOFT;
        ctx.font = 'italic 12px system-ui, sans-serif';
        ctx.fillText('the row is full — the next number starts a new row', W / 2, bandH - 12);
      }
    }

    /* ---- the chart -------------------------------------------------------- */
    const fs = Math.max(9, Math.min(15, cell * 0.38));
    for (let v = 1; v <= S.rows * 10; v++) {
      const cx = x0 + (colOf(v) - 1) * cell;
      const cy = y0 + (rowOf(v) - 1) * cell;
      const said = S.said.has(v);
      const here = v === S.n;

      // cell face
      if (here) {
        ctx.fillStyle = CARMINE;
        rr(cx + 1.5, cy + 1.5, cell - 3, cell - 3, 5);
        ctx.fill();
      } else if (said) {
        ctx.fillStyle = 'rgba(200,30,79,0.10)';
        rr(cx + 1.5, cy + 1.5, cell - 3, cell - 3, 5);
        ctx.fill();
      }

      // gold target ring (capstone)
      if (S.target === v) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.4;
        rr(cx + 2, cy + 2, cell - 4, cell - 4, 6);
        ctx.stroke();
      }

      // fast-lane rings (the lens): the decade cells
      if (S.edge && v % 10 === 0) {
        ctx.strokeStyle = 'rgba(185,135,24,0.85)';
        ctx.lineWidth = 1.6;
        rr(cx + 2.5, cy + 2.5, cell - 5, cell - 5, 6);
        ctx.stroke();
      }

      // grid line of the chart
      ctx.strokeStyle = 'rgba(28,43,58,0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 0.5, cy + 0.5, cell, cell);

      // numeral
      ctx.fillStyle = here ? '#fff' : said ? INK : 'rgba(28,43,58,0.42)';
      ctx.font = `${here ? 700 : 600} ${fs}px ui-monospace, Menlo, monospace`;
      ctx.fillText(String(v), cx + cell / 2, cy + cell / 2 + 0.5);
    }

    /* a gold underline beneath every row the count has FULLY SAID (a leap
       earns no underline — a leap says one number, not ten) */
    ctx.strokeStyle = 'rgba(185,135,24,0.55)';
    ctx.lineWidth = 2;
    for (let r = 1; r <= S.rows; r++) {
      let full = true;
      for (let v = (r - 1) * 10 + 1; v <= r * 10; v++) {
        if (!S.said.has(v)) {
          full = false;
          break;
        }
      }
      if (full) {
        const uy = y0 + r * cell - 1;
        ctx.beginPath();
        ctx.moveTo(x0 + 3, uy);
        ctx.lineTo(x0 + chartW - 3, uy);
        ctx.stroke();
      }
    }

    /* the leap arrow: the last +10 drawn as a straight drop, one row down */
    if (S.lastMove === 'leap' && S.n >= 11) {
      const from = S.n - 10;
      const fx = x0 + (colOf(from) - 1) * cell + cell / 2;
      const fy = y0 + (rowOf(from) - 1) * cell + cell * 0.72;
      const ty = y0 + (rowOf(S.n) - 1) * cell + cell * 0.28;
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, ty - 6);
      ctx.stroke();
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.moveTo(fx, ty);
      ctx.lineTo(fx - 5, ty - 8);
      ctx.lineTo(fx + 5, ty - 8);
      ctx.closePath();
      ctx.fill();
    }

    /* the fast lane (lens): arrows chaining the decades down the edge */
    if (S.edge) {
      const ex = x0 + 9 * cell + cell / 2;
      ctx.strokeStyle = 'rgba(185,135,24,0.8)';
      ctx.lineWidth = 2;
      for (let r = 1; r < S.rows; r++) {
        const fy = y0 + (r - 1) * cell + cell * 0.8;
        const ty = y0 + r * cell + cell * 0.2;
        ctx.beginPath();
        ctx.moveTo(ex, fy);
        ctx.lineTo(ex, ty - 5);
        ctx.stroke();
        ctx.fillStyle = 'rgba(185,135,24,0.8)';
        ctx.beginPath();
        ctx.moveTo(ex, ty);
        ctx.lineTo(ex - 4, ty - 7);
        ctx.lineTo(ex + 4, ty - 7);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, []);

  useEffect(() => {
    draw();
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* every step whose words name a scene opens on that scene — a pinned count
     opens as a by-ones ride (the copy says the count is SITTING there) */
  useEffect(() => {
    const d = STEPS[step].demo;
    if (d != null) {
      setN(d);
      setSaid(saidUpTo(d));
      setLastMove(null);
    }
    if (STEPS[step].calib) {
      setN(0);
      setSaid(new Set());
      setLastMove(null);
    }
  }, [step]);

  /* hand the capstone a target on first arrival */
  useEffect(() => {
    if (current.calib && target == null) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const sayOne = () => {
    if (!canStepOne(n, cap)) return;
    setSaid(afterOne(said, n));
    setN(n + 1);
    setLastMove('one');
  };
  const leapTen = () => {
    if (!canLeapTen(n, cap)) return;
    setSaid(afterLeap(said, n));
    setN(n + 10);
    setLastMove('leap');
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    const d = current.demo != null ? current.demo : 0;
    setN(d);
    setSaid(saidUpTo(d));
    setLastMove(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken =
    n === 0
      ? 'Ready to count. The chart is empty.'
      : `The count is at ${wordFor(n)}${calib && target != null ? `, aiming for ${wordFor(target)}` : ''}.`;

  return (
    <div className="hclab">
      <header className="head">
        <h1>Counting to One Hundred — and Past It</h1>
        <p className="lede">
          Rows of ten fill and roll over — a <em>pattern</em>, all the way to one hundred.
          And then it keeps going: 101, 102… the same names, two more rows.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calibrated ? ' Calibrated — you landed exactly on the gold cell.' : ''}
          </p>

          <div className="toolbar">
            {buttons.includes('one') && (
              <button type="button" className="btn count" onClick={sayOne} disabled={!canStepOne(n, cap)}>
                +1 · say the next number
              </button>
            )}
            {buttons.includes('ten') && (
              <button type="button" className="btn count" onClick={leapTen} disabled={!canLeapTen(n, cap)}>
                +10 · leap a whole row
              </button>
            )}
            <button type="button" className="btn ghost" onClick={reset}>
              Start over
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
            {!calib &&
              DIALS.map((d) => {
                const unlocked = step >= d.unlock;
                return (
                  <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                    <span className="dk" style={{ color: d.color }}>
                      {d.name}
                    </span>
                    <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                    <input
                      type="range"
                      min={d.min}
                      max={Math.min(d.max, cap)}
                      step={1}
                      value={n}
                      disabled={!unlocked}
                      aria-label={`${d.name} — ${d.role}`}
                      onChange={(e) => {
                        const v = clampInt(e.target.value, d.min, Math.min(d.max, cap));
                        setN(v);
                        setSaid(saidUpTo(v)); // the dial RIDES the path, saying every number
                        setLastMove(null);
                      }}
                      style={{ accentColor: d.color }}
                    />
                    <output className="dv" style={unlocked ? { color: d.color } : undefined}>
                      {unlocked ? n : '🔒'}
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
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
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
                <span className="target-k">Count to</span>
                <span className="target-word">{wordFor(target)}</span>
                <span className="target-hint mono">
                  {calibrated
                    ? `you landed on ${wordFor(target)} — exactly`
                    : overshot
                      ? 'you went past it — Start over and try again'
                      : 'leaps of ten, then single steps'}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{calibrated ? 'landed exactly' : overshot ? 'past it' : 'counting…'}</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">aim for the gold cell</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setN(0);
                  setSaid(new Set());
                  setLastMove(null);
                }}
              >
                New gold cell
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
                  setN(0);
                  setSaid(new Set());
                  setLastMove(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">…29 → 30 · ten leaps = one hundred steps</span> &nbsp;·&nbsp; count to
        100 by ones and by tens (CCSS K.CC.A.1), counting on from anywhere (K.CC.A.2), reading the
        numerals (K.CC.A.3). The names repeat their pattern in every row — that is <em>why</em> a
        five-year-old can reach one hundred.
      </footer>

      <style jsx>{`
        .hclab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --gold: #b98718;
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
            /* minmax(0,1fr), never a bare 1fr — a bare 1fr floors at the
               stage's intrinsic width and blows the lab out sideways on a
               phone (the TeenNumbersLab lesson) */
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .panel {
          min-width: 0;
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          min-height: 430px;
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
        @media (max-width: 560px) {
          .stage {
            min-height: 360px;
          }
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
        .btn.count {
          background: var(--carmine);
          border-color: var(--carmine);
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
          background: var(--carmine);
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
          grid-template-columns: 96px 1fr 40px;
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
          border-left: 3px solid var(--carmine);
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
          background: rgba(185, 135, 24, 0.07);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .target-word {
          font-family: var(--serif);
          font-size: 30px;
          font-weight: 600;
          text-transform: capitalize;
          letter-spacing: 0.01em;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--carmine));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
          white-space: nowrap;
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
        :global(.hclab) :focus-visible {
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
