'use client';

/* ============================================================================
   LinePlotLab — an interactive "bench" for the LINE PLOT: measure many
   things, and let a mark remember each one.

        measure a worm → read its number → an X lands above that number
        …and when the worms crawl home, the X's still answer questions.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 2 lab — CCSS
   2.MD.D.9 ("generate measurement data by measuring lengths of several
   objects to the nearest whole unit… show the measurements by making a line
   plot, where the horizontal scale is marked off in whole-number units").
   The standard has two halves — GENERATE the data by measuring, then SHOW it
   — and this lab is the pipeline between them, walked one worm at a time.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE MARK REPLACES THE THING."
     A tray of worms, a fixed ruler, and beneath the ruler its TWIN: the plot
     line, the very same scale laid out to collect marks.  Measure a worm and
     an X lands above its number — one X per worm, always.  Stacks grow where
     lengths repeat, and the shape of the data appears.  Then the payoff step:
     the worms crawl home, the tray empties — and every question still has an
     answer, read off the X's alone.  A line plot is the tray, written down.
     The trap the lab is built to spring: the TALLEST STACK is not the
     LONGEST WORM.  A stack's height counts worms; a mark's position tells
     length.  Up is how many; along is how long.  Confusing those two axes is
     the line plot's classic misreading, and the step-4 question hands it to
     the child and lets the plot refute it.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • DataLab (grades 5–7) owns the DOT PLOT and the measures of center — its
       dots, its balance-point mean, its median and mode.  This lab draws
       X's (two strokes, never a dot), computes NO statistic of any kind, and
       its questions are reading questions: how many, which side, where.  The
       audit greps out the entire center-statistics vocabulary.
     • MeasurementLab owns HOW measuring works — unit iteration, unit size,
       estimation.  Here measuring is a single honest read against a FIXED
       ruler (the lab never varies the unit), because the subject is what
       happens AFTER the measurement: the record.
     • LengthComparisonLab owns comparing lengths with no numbers and the
       fair-start protocol.  This lab is downstream: the ruler bakes the fair
       start in (every worm is laid to the ruler's zero), and numbers are the
       whole point.
     • GraphsLab owns the displays of CATEGORICAL data — bar graph,
       pictograph, pie.  A line plot lives on a NUMERIC scale: position means
       amount, and there are no category bars here.

   One-accent discipline: CARMINE is THE RECORD — the X marks and the plot
   line they stand on.  The worms are quiet slate-blue things; the worm being
   measured and the column its X will join flash GOLD (the tool at work); the
   ruler is ink.  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a seven-year-old):
     • Lengths are exact integers 2–8; the ruler and the plot share one scale
       function, so a measurement and its mark can never disagree by a pixel.
     • One X per worm is an invariant: the lesson auto-drops exactly one mark
       per measurement, and the capstone's meter counts matched marks by
       exact multiset comparison — never by position tolerance.
     • The calibration stamp needs every worm measured AND the child's marks
       to equal the true lengths AS A MULTISET — order-free, duplicate-exact.
       The generator always deals at least one repeated length (a stack must
       be possible), audited over thousands of deals.
   Verified by audit-lineplot.mjs (numeric proof + source greps) and
   verify-lineplot.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/LinePlotLab.jsx
     2. Import and render it:
          import LinePlotLab from './LinePlotLab';
          export default function Page() { return <LinePlotLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the tray, how many
              are measured, the marks, the lesson step).
     MODEL  — pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  One dial (how many worms), one action button
   (Measure), and in the capstone: tap the plot to place each mark.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the record: the X marks and the plot line
const WORM = '#5b7a99'; // the worms — quiet slate-blue things
const GOLD = '#b98718'; // the tool at work: the worm on the ruler, its column
const INK_HEX = '#1c2b3a';

const DIALS = [
  { key: 'n', name: 'Worms', role: 'how many crawl in · 4–8', min: 4, max: 8, unlock: 3, color: WORM },
];

/* deterministic trays for the lesson — every tray repeats a length, so a
   stack is always there to be read */
const TRAYS = {
  4: [4, 3, 5, 3],
  5: [4, 3, 5, 3, 6],
  6: [4, 3, 5, 3, 6, 5],
  7: [4, 3, 5, 3, 6, 5, 3],
  8: [4, 3, 5, 3, 6, 5, 3, 7],
};
const START_N = 5;
const CALIB_STEP = 5;
const RULER_MAX = 9;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integers, nothing else.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* how many X's stand above each number */
function plotCounts(marks) {
  const c = {};
  for (const m of marks) c[m] = (c[m] || 0) + 1;
  return c;
}

/* order-free, duplicate-exact: the only honest way to compare records */
const multisetEq = (a, b) => a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');

/* the reading the trap question is about: rightmost mark vs tallest stack */
const longestOf = (lengths) => Math.max(...lengths);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Be the plot-maker."  Five fresh worms.  Measure
   each (the ruler reads its number), then TAP the plot column where its X
   belongs.  The plot ends up being the child's own record — right or wrong.

   No false stamp, provably: the stamp needs every worm measured AND the
   marks to equal the true lengths as a MULTISET.  The generator deals
   integer lengths 2–8 with at least one repeat.  Audited: correct records
   stamp; any single wrong mark, missing mark, or extra mark does not.
   ------------------------------------------------------------------------- */
function makeTray(prev) {
  let t;
  do {
    t = [];
    for (let i = 0; i < 5; i++) t.push(2 + Math.floor(Math.random() * 7)); // 2…8
  } while (new Set(t).size === t.length || (prev != null && multisetEq(t, prev)));
  return t;
}
const calibChecks = (measured, marks, lengths) => [measured >= lengths.length, multisetEq(marks, lengths)];
const isCalibrated = (measured, marks, lengths) => calibChecks(measured, marks, lengths).every(Boolean);
const closeness = (measured, marks, lengths) => {
  if (isCalibrated(measured, marks, lengths)) return 100;
  /* matched marks as a multiset fraction — a wrong mark never scores,
     wherever it sits — capped at 99 short of a true record */
  const truth = [...lengths].sort((a, b) => a - b);
  const mine = [...marks].sort((a, b) => a - b);
  let i = 0;
  let j = 0;
  let hit = 0;
  while (i < truth.length && j < mine.length) {
    if (truth[i] === mine[j]) {
      hit++;
      i++;
      j++;
    } else if (truth[i] < mine[j]) i++;
    else j++;
  }
  return Math.min(99, Math.round((100 * hit) / lengths.length));
};

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step.  The lesson tray is deterministic, so
   every question's numbers are pinned by construction.  The reveal lives in
   the feedback; the trap is the tallest-stack misreading.  Next gates on
   ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One worm, one number',
    body: 'A tray of worms crawls in. Press Measure: the first worm lies down at the ruler’s zero and its number appears.',
    measure: 1,
    q: 'The worm’s far end reaches the 4 on the ruler. Its length is…',
    choices: ['4 — read where the far end lands', '5 — the next number up', 'However many worms there are'],
    answer: 0,
    feedback:
      'Four. The ruler does the fair-start work for you — every worm lies down at zero, so the ' +
      'far end tells the truth. (How rulers work is its own lab; here the measuring is one honest ' +
      'read, because the story starts AFTER it.)',
  },
  {
    title: 'The mark',
    body: 'Below the ruler sits its twin — the plot line, the same numbers in the same places. The measurement just landed there as an X.',
    measure: 1,
    q: 'What does one X above the 4 say?',
    choices: ['One worm turned out to be 4 long', 'The number 4 is special', 'There are four worms'],
    answer: 0,
    feedback:
      'One X is one worm, remembered. Not the worm’s picture — just the one fact we measured, ' +
      'parked above its number. The plot line is the ruler’s twin, so the mark lands exactly ' +
      'where the worm’s far end reached.',
  },
  {
    title: 'Measure them all',
    body: 'Keep pressing Measure until the tray is done. Watch what happens when two worms share a length.',
    measure: 99,
    q: 'Two X’s stand above the 3. What does that say?',
    choices: ['Two worms measured 3', 'One worm measured 6', 'The 3-column holds the longest worm'],
    answer: 0,
    feedback:
      'Two worms, each 3 long — their X’s stack up. A stack is a count: every repeat climbs one ' +
      'higher. The shape of the whole crawl is appearing, one mark at a time.',
  },
  {
    title: 'Up is how many, along is how long',
    body: 'The Worms dial is unlocked — deal a bigger crawl and measure it. Then read carefully: two directions, two different facts.',
    measure: 99,
    q: 'The tallest stack stands above 3. Is the longest worm 3 long?',
    choices: [
      'No — most worms are 3 long; the longest is the farthest X',
      'Yes — the tallest stack holds the longest worm',
      'Yes — 3 is the biggest number here',
    ],
    answer: 0,
    feedback:
      'No — and this is the line plot’s classic misreading. A stack’s HEIGHT counts worms; a ' +
      'mark’s POSITION tells length. Up is how many, along is how long. The longest worm is ' +
      'wherever the farthest-right X stands, even if it stands alone.',
  },
  {
    title: 'The worms crawl home',
    body: 'The tray is empty. The X’s stay. Ask your questions anyway.',
    measure: 0,
    lens: 'gone',
    q: 'The worms are gone. Can you still tell how many were longer than 4?',
    choices: ['Yes — count the X’s to the right of 4', 'No — the worms are gone', 'Only by remembering the worms'],
    answer: 0,
    feedback:
      'Yes — that is the whole point of a plot. The marks remember so you do not have to. A line ' +
      'plot is the tray, written down: the things can leave, and every how-many question still ' +
      'has an answer.',
  },
  {
    title: 'Be the plot-maker',
    body:
      'Five fresh worms, and the plot is blank. Measure each worm, then TAP the plot where its ' +
      'X belongs. When the record matches the crawl, it is calibrated.',
    measure: 99,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function LinePlotLab() {
  const [n, setN] = useState(START_N);
  const [tray, setTray] = useState(TRAYS[START_N]);
  const [measured, setMeasured] = useState(0); // worms measured so far
  const [marks, setMarks] = useState([]); // the X's on the plot
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [pending, setPending] = useState(false); // capstone: a measured worm awaits its mark

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const geomRef = useRef({ cols: [] });

  const current = STEPS[step];
  const calib = !!current.calib;
  const gone = current.lens === 'gone';

  const pct = calib ? closeness(measured, marks, tray) : 0;
  const calibrated = calib ? isCalibrated(measured, marks, tray) : false;
  const checks = calib ? calibChecks(measured, marks, tray) : [false, false];

  sceneRef.current = { tray, measured, marks, calib, gone, pending, calibrated };

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

    /* ONE scale for ruler and plot — a measurement and its mark can never
       disagree.  x(v) maps a whole-number length to a pixel column. */
    const x0 = 46;
    const unit = (W - x0 - 30) / RULER_MAX;
    const xOf = (v) => x0 + v * unit;

    /* zones: tray (top), ruler band (middle), plot (bottom) */
    const trayTop = 14;
    const trayH = H * 0.34;
    const rulerY = H * 0.52;
    const plotY = H - 60;

    /* ---- the tray --------------------------------------------------------- */
    const wormH = 13;
    if (!S.gone) {
      const perRow = 3;
      for (let i = S.measured; i < S.tray.length; i++) {
        const row = Math.floor((i - S.measured) / perRow);
        const col = (i - S.measured) % perRow;
        const wx = 30 + col * (W / 3.2);
        const wy = trayTop + 16 + row * (wormH + 14);
        if (wy + wormH > trayTop + trayH) break;
        ctx.fillStyle = WORM;
        rr(wx, wy, S.tray[i] * unit * 0.55, wormH, wormH / 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(wx + S.tray[i] * unit * 0.55 - wormH / 2, wy + wormH / 2, wormH / 4.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        S.tray.length - S.measured > 0 ? `${S.tray.length - S.measured} still in the tray` : 'the tray is done',
        30,
        trayTop + 8
      );
    } else {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('the worms crawled home — the marks stayed', W / 2, trayTop + trayH / 2);
    }

    /* ---- the ruler, fixed, with the worm being measured ------------------- */
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(xOf(0), rulerY + 0.5);
    ctx.lineTo(xOf(RULER_MAX), rulerY + 0.5);
    ctx.stroke();
    ctx.font = '600 12px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    for (let v = 0; v <= RULER_MAX; v++) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xOf(v) + 0.5, rulerY - 5);
      ctx.lineTo(xOf(v) + 0.5, rulerY + 5);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillText(String(v), xOf(v), rulerY + 18);
    }
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('the ruler', xOf(0), rulerY - 34);

    /* the worm on the ruler: the last measured (lesson) or the pending one
       (capstone) — gold, laid to zero, its number read at the far end */
    const showIdx = S.calib ? (S.pending ? S.measured - 1 : -1) : S.measured - 1;
    if (showIdx >= 0 && showIdx < S.tray.length && !S.gone) {
      const len = S.tray[showIdx];
      ctx.fillStyle = GOLD;
      rr(xOf(0), rulerY - 24, len * unit, wormH, wormH / 2);
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(xOf(len) + 0.5, rulerY - 24);
      ctx.lineTo(xOf(len) + 0.5, rulerY - 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK;
      ctx.font = '700 15px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(len), xOf(len), rulerY - 40);
    }

    /* ---- the plot: the ruler's twin --------------------------------------- */
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xOf(0), plotY + 0.5);
    ctx.lineTo(xOf(RULER_MAX), plotY + 0.5);
    ctx.stroke();
    ctx.font = '600 12px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    const cols = [];
    for (let v = 0; v <= RULER_MAX; v++) {
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xOf(v) + 0.5, plotY);
      ctx.lineTo(xOf(v) + 0.5, plotY + 5);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillText(String(v), xOf(v), plotY + 18);
      cols.push({ v, x: xOf(v) - unit / 2, w: unit, y: rulerY + 30, h: plotY - rulerY - 30 + 24 });
    }
    geomRef.current = { cols };
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('the plot — its twin', xOf(0), plotY + 34);

    /* the X's — two carmine strokes each, stacked by count */
    const counts = plotCounts(S.marks);
    const xs = 7;
    const seen = {};
    for (const m of S.marks) {
      seen[m] = (seen[m] || 0) + 1;
      const level = seen[m];
      const cx = xOf(m);
      const cy = plotY - 12 - (level - 1) * 19;
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - xs, cy - xs);
      ctx.lineTo(cx + xs, cy + xs);
      ctx.moveTo(cx - xs, cy + xs);
      ctx.lineTo(cx + xs, cy - xs);
      ctx.stroke();
    }

    /* capstone prompt: where the pending mark should be placed is the
       child's call — the lab only says that one is owed */
    if (S.calib && S.pending) {
      ctx.fillStyle = GOLD;
      ctx.font = 'italic 600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('tap the plot where this worm’s X belongs', W / 2, plotY - (H - 60 - rulerY) + 6);
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

  /* every step opens on the scene its words describe */
  useEffect(() => {
    if (current.calib) {
      const t = makeTray(null);
      setTray(t);
      setMeasured(0);
      setMarks([]);
      setPending(false);
      return;
    }
    /* the lesson walks ONE deterministic tray; each step needs a minimum
       number measured so the copy's scene is on screen */
    const t = TRAYS[n];
    setTray(t);
    if (step === 0) {
      setMeasured(0);
      setMarks([]);
    } else if (step <= 2) {
      const want = step; // step 1: one measured; step 2: two
      setMeasured(want);
      setMarks(t.slice(0, want));
    } else {
      setMeasured(t.length);
      setMarks(t.slice());
    }
    setPending(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const measureNext = () => {
    if (gone || measured >= tray.length) return;
    if (calib) {
      if (pending) return; // the owed mark comes first
      setMeasured(measured + 1);
      setPending(true);
    } else {
      setMeasured(measured + 1);
      setMarks((prev) => [...prev, tray[measured]]); // one worm, one X — always
    }
  };
  const onPointerDown = (e) => {
    if (!calib || !pending) return;
    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    for (const c of geomRef.current.cols) {
      if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) {
        setMarks((prev) => [...prev, c.v]);
        setPending(false);
        return;
      }
    }
  };
  const setDial = (v) => {
    const nn = clampInt(v, 4, 8);
    setN(nn);
    const t = TRAYS[nn];
    setTray(t);
    setMeasured(t.length);
    setMarks(t.slice());
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    if (calib) {
      setMeasured(0);
      setMarks([]);
      setPending(false);
    } else {
      setMeasured(0);
      setMarks([]);
      setPending(false);
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);
  const canMeasure = !gone && measured < tray.length && (!calib || !pending);

  const spoken = `${measured} of ${tray.length} worms measured, ${marks.length} marks on the plot.${
    gone ? ' The worms are gone; the marks remain.' : ''
  }${calibrated ? ' Calibrated.' : ''}`;

  return (
    <div className="lplab">
      <header className="head">
        <h1>The Line Plot: Marks That Remember</h1>
        <p className="lede">
          Measure a worm, and an <em>X</em> lands above its number. Measure them all, and the crawl
          takes shape. Then the worms leave — and the marks{' '}
          <span className="mono">still answer every question</span>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken} onPointerDown={onPointerDown}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="toolbar">
            {current.measure > 0 && (
              <button type="button" className="btn measure" onClick={measureNext} disabled={!canMeasure}>
                Measure the next worm
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
                      max={d.max}
                      step={1}
                      value={n}
                      disabled={!unlocked}
                      aria-label={`${d.name} — ${d.role}`}
                      onChange={(e) => setDial(e.target.value)}
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

          {calib && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Be the plot-maker</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} every worm measured ({measured}/{tray.length})
                  </li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the record matches the crawl
                  </li>
                </ol>
                <span className="target-hint mono">
                  {pending
                    ? 'a mark is owed — tap the plot'
                    : measured < tray.length
                      ? 'measure, then mark — one X per worm'
                      : checks[1]
                        ? 'a true record'
                        : 'something is off — Start over and re-measure'}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{checks.filter(Boolean).length}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">measure · mark · match</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTray(tray);
                  setTray(t);
                  setMeasured(0);
                  setMarks([]);
                  setPending(false);
                }}
              >
                New crawl
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
                  setN(START_N);
                  setTray(TRAYS[START_N]);
                  setMeasured(0);
                  setMarks([]);
                  setPending(false);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">one worm ⇒ one X</span> &nbsp;·&nbsp; generate measurement data and
        show it on a line plot with a whole-number scale (CCSS 2.MD.D.9). Up counts, along tells
        length — and the marks remember so you do not have to.
      </footer>

      <style jsx>{`
        .lplab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --worm: #5b7a99;
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
            /* minmax(0,1fr), never a bare 1fr (the TeenNumbersLab phone lesson) */
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
          aspect-ratio: 7 / 5;
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
            aspect-ratio: 4 / 5;
            min-height: 400px;
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
        .btn.measure {
          background: var(--gold);
          border-color: var(--gold);
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
        .tasks {
          margin: 0;
          padding: 0 0 0 4px;
          list-style: none;
          font-size: 13.5px;
          display: grid;
          gap: 4px;
        }
        .tasks li.done {
          color: var(--ok);
          font-weight: 600;
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
        :global(.lplab) :focus-visible {
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
