'use client';

/* ============================================================================
   HistogramLab — an interactive "bench" for the HISTOGRAM: numeric data
   gathered into equal-width BINS, bars that touch because the axis is a
   number line — and the unsettling lever nobody mentions: the same data
   changes its story when you change the bin width.

        bin width 2 → two humps · bin width 6 → one hump · same 24 numbers
        the shape is partly YOURS — the width is a choice, not a fact

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 6 lab with
   the HS hand-off — CCSS 6.SP.B.4 ("Display numerical data in plots on a
   number line, including dot plots, HISTOGRAMS, and box plots") and
   S-ID.A.1.  The library holds DataLab (the dot plot) and BoxPlotLab (the
   five-number summary) with nothing between them; this bench fills that
   hole with the one idea neither owns: BINNING.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions gated
   on ANSWERED (not correct), and a calibration challenge with a live meter
   and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE BIN LEVER."
     Twenty-four field-day sprint times sit on the number line.  The WIDTH
     dial gathers them into equal bins: at width 1 the picture is noise —
     six little humps of coincidence; at width 2 the truth appears — TWO
     humps, the sprinters and the joggers; at width 6 the humps melt into
     ONE.  Nothing about the data changed.  The histogram's shape is a
     JOINT PRODUCT of the numbers and the width, and a reader who does not
     ask "what width?" is a reader who can be fooled — the most transferable
     statistical lesson a sixth-grader can own.  Alongside runs the quiet
     grammar: histogram bars TOUCH, because the axis is a number line and
     the bins share edges — the categorical bar chart's gaps (GraphsLab's
     picture) would be a lie here.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • DataLab owns the DOT PLOT — every individual visible — and the mean
       as a balance point.  Here individuals surrender their identity to
       BINS (that surrender is the subject), and no average of any kind is
       computed.
     • GraphsLab owns the categorical BAR CHART (bars separated, categories
       reorderable) and the misleading-axis trap.  This lab's bars touch,
       its axis is numeric and unreorderable, and its trap is the WIDTH,
       not the axis: a genuinely different deception.
     • BoxPlotLab owns the five-number summary; MedianLab and ModeLab own
       their statistics.  The word "mode" is refused even though humps beg
       for it — a hump is a feature of the PICTURE, and this lab keeps the
       distinction sharp.
     • ScatterPlotLab owns bivariate data.  One variable here, always.

   One-accent discipline: CARMINE is THE SHAPE — the histogram bars and the
   hump count.  BLUE is the raw data (the rug of individual ticks below the
   axis, kept visible so the surrender to bins is watchable).  GOLD is the
   POSTED BIN — the interval under the capstone's question.  GREEN is
   reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a twelve-year-old):
     • The data is a fixed table of 24 INTEGERS on 0–23; bins are
       [i·w, (i+1)·w) with integer w from the dial, so every count is exact
       integer arithmetic and every value lands in exactly one bin (the
       audit re-bins from first principles at every width and compares).
     • The HUMP COUNT is a definition, not an impression: a hump is a
       maximal plateau of equal counts strictly higher than both flanks
       (edges flank with −1).  The audit re-derives it at every width and
       pins the lever's story to the shipped data: 6 humps at width 1,
       2 at widths 2–4, 1 at width 6.
     • The calibration stamp needs two facts at once: the chosen width
       makes the ordered hump count AND the posted interval is genuinely a
       bin of that width (each order's interval pins the width uniquely —
       audited), AND the count declared for that bin is exact.  Wrong
       width with a right count never stamps.  Audited over every order ×
       every width × every chip.
   Verified by audit-histogram.mjs (numeric proof + source greps) and
   verify-histogram.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/HistogramLab.jsx
     2. Import and render it:
          import HistogramLab from './HistogramLab';
          export default function Page() { return <HistogramLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the width, the
              lesson step, answers, the order, the declared count).
     MODEL  — exact integer binning and the hump definition; it knows
              nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  ONE dial: the bin width.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the shape: bars and humps
const BLUE = '#3f74a6'; // the raw data rug
const GOLD = '#b98718'; // the posted bin
const INK_HEX = '#1c2b3a';

const WIDTHS = [1, 2, 3, 4, 6];
const CALIB_STEP = 5;

/* the field-day sprint times (seconds over 10): two honest clusters */
const DATA = [2, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 9, 11, 13, 15, 15, 16, 16, 16, 16, 17, 17, 18, 20];
const X_MAX = 24;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact binning; the hump definition.
   ------------------------------------------------------------------------- */
const countsAt = (w) => {
  const n = Math.ceil(X_MAX / w);
  const c = Array(n).fill(0);
  for (const v of DATA) c[Math.floor(v / w)]++;
  return c;
};
/* a hump: a maximal plateau of equal counts strictly above both flanks */
const humpsOf = (c) => {
  let h = 0;
  let i = 0;
  while (i < c.length) {
    let j = i;
    while (j + 1 < c.length && c[j + 1] === c[i]) j++;
    const left = i === 0 ? -1 : c[i - 1];
    const right = j === c.length - 1 ? -1 : c[j + 1];
    if (c[i] > left && c[i] > right && c[i] > 0) h++;
    i = j + 1;
  }
  return h;
};
const humpsAt = (w) => humpsOf(countsAt(w));
/* is [lo, hi) a bin of width w? */
const isBinOf = (lo, hi, w) => hi - lo === w && lo % w === 0 && lo >= 0 && hi <= X_MAX;
const countIn = (lo, hi) => DATA.filter((v) => v >= lo && v < hi).length;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The editor's order."  A hump count and a posted
   interval; the interval pins the width uniquely (audited), the count
   seals it.
   ------------------------------------------------------------------------- */
const DOCKET = [
  { id: 'h1', humps: 2, bin: [4, 8] }, // ⇒ w = 4
  { id: 'h2', humps: 2, bin: [6, 9] }, // ⇒ w = 3
  { id: 'h3', humps: 2, bin: [16, 18] }, // ⇒ w = 2
  { id: 'h4', humps: 1, bin: [0, 6] }, // ⇒ w = 6
];
function makeOrder(prevId) {
  let c;
  do {
    c = DOCKET[Math.floor(Math.random() * DOCKET.length)];
  } while (prevId && c.id === prevId);
  return c;
}
/* the count chips: the truth and near-miss foils, distinct by construction */
function countChips(kase) {
  const t = countIn(kase.bin[0], kase.bin[1]);
  return [
    { s: String(t), ok: true },
    { s: String(t + 2), ok: false },
    { s: String(Math.max(0, t - 2)), ok: false },
  ];
}
const calibChecks = (kase, w, declared) => {
  if (!kase) return [false, false];
  const widthOK = humpsAt(w) === kase.humps && isBinOf(kase.bin[0], kase.bin[1], w);
  const truth = String(countIn(kase.bin[0], kase.bin[1]));
  return [widthOK, widthOK && declared != null && declared === truth];
};
const closeness = (kase, w, declared) =>
  Math.round((100 * calibChecks(kase, w, declared).filter(Boolean).length) / 2);
const isCalibrated = (kase, w, declared) => calibChecks(kase, w, declared).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that the histogram shows the data
   "as it is", that bars touching is sloppy drawing, that more bins are
   always more honest.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'From ticks to bins',
    body:
      'Twenty-four sprint times, each a blue tick on the number line. The histogram GATHERS ' +
      'them: every bin is an interval of equal width, and its bar’s height counts the ticks ' +
      'inside. Width 1 first — one bin per second.',
    demo: 1,
    q: 'What does a histogram bar’s HEIGHT say?',
    choices: [
      'How many values landed inside that bin’s interval',
      'The size of the largest value in the bin',
      'The average of the bin',
    ],
    answer: 0,
    feedback:
      'A count — nothing more. Each value surrenders its exact identity and becomes “one of ' +
      'the ticks in [6, 8)”. That surrender is the histogram’s whole trade: you lose the ' +
      'individuals (the dot plot keeps them) and you gain a SHAPE you can read at a glance.',
  },
  {
    title: 'Why the bars touch',
    body:
      'Look at the bars’ shoulders: they TOUCH. Not sloppy drawing — the axis is a number ' +
      'line, and where one bin ends the next begins. A value of exactly 8 belongs to [8, 10), ' +
      'never to [6, 8).',
    demo: 2,
    q: 'A bar chart of favorite fruits has gaps between its bars. Why must a histogram’s bars touch?',
    choices: [
      'Its bins share edges on a number line — there is no “between” to leave empty',
      'To save ink',
      'They only touch when the data is crowded',
    ],
    answer: 0,
    feedback:
      'Fruit categories have nothing between them, so their bars float apart (that chart ' +
      'lives in the Graphs bench). Bins are intervals on a continuous line: [6, 8) hands off ' +
      'to [8, 10) at exactly 8, so their bars share a wall. Touching bars is the histogram ' +
      'announcing “my axis is numeric.”',
  },
  {
    title: 'The lever — two humps appear',
    body:
      'Width 2. Suddenly the picture organizes: TWO humps — a cluster of quick times, a ' +
      'cluster of slower ones, a valley between. This is the same 24 numbers as before.',
    demo: 2,
    q: 'At width 1 this data showed six little humps. Where did they go?',
    choices: [
      'They were noise — coincidences of single seconds that wider bins absorb',
      'The dial deleted some data',
      'They are hiding behind the two big humps',
    ],
    answer: 0,
    feedback:
      'Absorbed. At width 1, whether three or four sprinters happened to share one exact ' +
      'second is luck, and luck makes humps. Width 2 pools neighbours, the luck cancels, and ' +
      'the real structure — two kinds of runner — stands up. Binning is a noise filter, and ' +
      'the width is its knob.',
  },
  {
    title: 'The lever — and then one',
    body:
      'Keep pulling: width 6. The valley fills, the two humps fuse into one broad mound. ' +
      'Same data. Again.',
    demo: 6,
    q: 'Width 2 says “two kinds of runner”; width 6 says “one blob”. Which histogram is lying?',
    choices: [
      'Neither — the shape is a joint product of the data AND the width; a reader must ask “what width?”',
      'Width 6 — coarse bins are always dishonest',
      'Width 2 — it invented a valley',
    ],
    answer: 0,
    feedback:
      'Neither lies; each answers a different question. Too fine and you see noise; too ' +
      'coarse and you erase structure; in between, the story stabilizes — and an honest ' +
      'reader checks more than one width before believing any of them. The same numbers, ' +
      'wearing three shapes: that is the deepest fact on this bench.',
  },
  {
    title: 'Reading a bin',
    body:
      'The gold interval [12, 16) is posted at width 4. Read its bar: the height is the count ' +
      'of times in that interval — 12 and 13 and 15 count; 16 does not.',
    demo: 4,
    postBin: [12, 16],
    q: 'How many sprint times land in [12, 16)?',
    choices: ['3 — the values 13, 15, 15 (12 ≤ t < 16)', '5 — everything from 12 to 16 inclusive', '0'],
    answer: 0,
    feedback:
      'Three: 13, 15, 15. The bracket does the work — [12, 16) includes 12 and excludes 16, ' +
      'so the four 16s next door belong to [16, 20). Every value lands in exactly one bin, ' +
      'every time; the half-open interval is the rule that makes the handoff airtight.',
  },
  {
    title: 'The editor’s order',
    body:
      'An order arrives from the news desk: a histogram showing a given number of humps, with ' +
      'a posted interval as one of its bins — and the desk wants that bin’s count. Set the ' +
      'width; declare the count.',
    demo: 1,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function HistogramLab() {
  const [w, setW] = useState(1);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);
  const [declared, setDeclared] = useState(null);
  const [chipSet, setChipSet] = useState([]);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  const checks = calib ? calibChecks(kase, w, declared) : [false, false];
  const pct = calib && kase ? closeness(kase, w, declared) : 0;
  const calibrated = calib && kase ? isCalibrated(kase, w, declared) : false;

  sceneRef.current = {
    w,
    postBin: calib && kase ? kase.bin : current.postBin || null,
    calib,
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

    const bandH = 56;
    const padL = 52;
    const padR = 26;
    const rugH = 34;
    const axisY = H - 58;
    const plotTop = bandH + 14;
    const kx = (W - padL - padR) / X_MAX;
    const counts = countsAt(S.w);
    const maxC = Math.max(...counts, 1);
    const ky = (axisY - plotTop - rugH) / maxC;

    /* axis */
    ctx.strokeStyle = 'rgba(28,43,58,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(padL, axisY);
    ctx.lineTo(W - padR, axisY);
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= X_MAX; v += S.w >= 3 ? S.w : 2) {
      ctx.fillText(String(v), padL + v * kx, axisY + 6);
      ctx.beginPath();
      ctx.moveTo(padL + v * kx, axisY - 3);
      ctx.lineTo(padL + v * kx, axisY + 3);
      ctx.stroke();
    }
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('sprint time →', padL + (X_MAX * kx) / 2, axisY + 22);
    /* count scale */
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let c = 2; c <= maxC; c += 2) {
      ctx.fillText(String(c), padL - 8, axisY - rugH - c * ky);
    }

    /* the bars — touching, carmine */
    counts.forEach((c, i) => {
      if (c === 0) return;
      const x0 = padL + i * S.w * kx;
      const bw = S.w * kx;
      const bh = c * ky;
      const posted = S.postBin && S.postBin[0] === i * S.w && S.postBin[1] === (i + 1) * S.w;
      ctx.fillStyle = posted ? 'rgba(185,135,24,0.30)' : 'rgba(200,30,79,0.18)';
      ctx.strokeStyle = posted ? GOLD : CARMINE;
      ctx.lineWidth = posted ? 2.4 : 1.8;
      ctx.fillRect(x0, axisY - rugH - bh, bw, bh);
      ctx.strokeRect(x0, axisY - rugH - bh, bw, bh);
    });
    /* the posted bin marker even when its count is 0 */
    if (S.postBin) {
      const [lo, hi] = S.postBin;
      ctx.strokeStyle = GOLD;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padL + lo * kx, axisY - rugH + 2);
      ctx.lineTo(padL + lo * kx, axisY + 2);
      ctx.moveTo(padL + hi * kx, axisY - rugH + 2);
      ctx.lineTo(padL + hi * kx, axisY + 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GOLD;
      ctx.font = '700 11.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`[${lo}, ${hi})`, padL + ((lo + hi) / 2) * kx, axisY - rugH - 4);
    }

    /* the rug — every individual, still visible below the bars */
    const seen = {};
    for (const v of DATA) {
      seen[v] = (seen[v] || 0) + 1;
      const x = padL + (v + 0.5) * kx;
      const y = axisY - 6 - (seen[v] - 1) * 7;
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    /* ---- the readout band ---- */
    const h = humpsOf(counts);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 15.5px ui-monospace, monospace';
    ctx.fillStyle = CARMINE;
    ctx.fillText(
      `bin width ${S.w}   ·   ${h} hump${h === 1 ? '' : 's'}   ·   same 24 numbers`,
      W / 2,
      bandH / 2
    );
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
    setW(STEPS[step].demo);
    if (STEPS[step].calib) {
      const c = makeOrder(null);
      setKase(c);
      setDeclared(null);
      setChipSet(countChips(c).sort(() => Math.random() - 0.5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setW(STEPS[step].demo);
    setDeclared(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = calib
    ? `The editor's order: ${kase ? `${kase.humps} hump${kase.humps === 1 ? '' : 's'}, with [${kase.bin[0]}, ${kase.bin[1]}) as a bin` : ''}. ` +
      `Width ${w}, ${humpsAt(w)} humps. Declared ${declared ?? 'nothing'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Bin width ${w}: ${humpsAt(w)} hump${humpsAt(w) === 1 ? '' : 's'} from the same 24 numbers.`;

  return (
    <div className="hglab">
      <header className="head">
        <h1>The Histogram: Pull the Bin Lever</h1>
        <p className="lede">
          Gather numeric data into equal-width <em>bins</em> — bars that touch, because the
          axis is a number line. Then pull the lever:{' '}
          <span className="mono">width 2 → two humps · width 6 → one</span> — same numbers.
          The shape is partly <em>your</em> choice.
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
          </p>

          <div className="dials">
            <div className="dial">
              <div className="dial-head">
                <span className="dial-k">bin width</span>
                <span className="dial-v mono">{w}</span>
              </div>
              <input
                type="range"
                min={0}
                max={WIDTHS.length - 1}
                step={1}
                value={WIDTHS.indexOf(w)}
                onChange={(e) => setW(WIDTHS[Number(e.target.value)])}
                aria-label={`Bin width, ${w}`}
              />
            </div>
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={reset}>
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

          {calib && kase && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The order</span>
                <span className="target-word mono">
                  {kase.humps} hump{kase.humps === 1 ? '' : 's'} · bin [{kase.bin[0]}, {kase.bin[1]})
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} a width with {kase.humps} hump{kase.humps === 1 ? '' : 's'} whose bins
                    include [{kase.bin[0]}, {kase.bin[1]})
                  </li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} that bin’s count declared</li>
                </ol>
                <div className="declare" role="group" aria-label="Count">
                  {chipSet.map((c2) => (
                    <button
                      type="button"
                      key={c2.s}
                      className={'declbtn mono' + (declared === c2.s ? ' active' : '')}
                      onClick={() => setDeclared(c2.s)}
                    >
                      {c2.s}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'filed — width, shape and count agree'
                    : checks[0]
                      ? 'width found — read the gold bar'
                      : 'the posted interval must be one of YOUR bins'}
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
                  <span className="mono target-hint">the width · then the count</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const c = makeOrder(kase.id);
                  setKase(c);
                  setDeclared(null);
                  setChipSet(countChips(c).sort(() => Math.random() - 0.5));
                }}
              >
                Next order
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
                  setKase(null);
                  setDeclared(null);
                  setW(1);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">same numbers · your width · its shape</span> &nbsp;·&nbsp;
        histograms display numeric data in equal-width bins on a number line (CCSS 6.SP.B.4,
        S-ID.A.1); the bars touch because the bins share edges, and the hump count belongs
        jointly to the data and the width. Ask “what width?” before believing any shape.
      </footer>

      <style jsx>{`
        .hglab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --blue: #3f74a6;
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
          min-height: 400px;
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
            min-height: 380px;
          }
        }
        .dials {
          margin: 12px 4px 0;
        }
        .dial {
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          background: var(--paper);
        }
        .dial-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .dial-k {
          font-size: 12.5px;
          font-weight: 600;
        }
        .dial-v {
          font-size: 13px;
          color: var(--carmine);
          font-weight: 700;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--carmine);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 10px;
          align-items: center;
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
        .quiz {
          margin-top: 4px;
          padding-top: 6px;
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
          font-size: 20px;
          font-weight: 700;
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
        .declare {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .declbtn {
          font-size: 13px;
          font-weight: 700;
          padding: 7px 14px;
          border-radius: 6px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
        }
        .declbtn.active {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.1);
          color: var(--carmine);
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
        :global(.hglab) :focus-visible {
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
