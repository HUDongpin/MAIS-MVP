'use client';

/* ============================================================================
   GraphStoryLab — an interactive "bench" for QUALITATIVE GRAPHS: the story
   of a graph, told with no formula, no numbers, and no scenery.

        rising = growing · flat = frozen · falling = shrinking
        steeper = faster · a bend = the speed itself is changing
        the graph plots its NAMED QUANTITY — never the landscape

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 8.F.B.5.
   Every function lab in this library starts from an equation.  This one
   never has one — its entire subject is shape as meaning, and its final
   boss is the oldest misconception in the chapter: reading a graph as a
   photograph of the journey.

   THE SIGNATURE CENTERPIECE — "THE STORY AND ITS SILHOUETTE."
     Stories compile to silhouettes: each clause of the story is one
     piece of the graph, and the piece vocabulary is tiny — rises gently,
     rises steeply, holds level, falls, rises ever faster.  The walk to
     school reads as three sentences; the forgotten backpack puts a
     U-turn in the middle; the bath fills, soaks, and drains.  Then the
     famous hill: walked at a steady pace, it graphs as a straight rising
     line THE WHOLE WAY — the hill is scenery, and the graph refuses to
     draw scenery.  A cone flask bends the line instead: same pour,
     narrowing container, ever-faster rise.  The capstone posts a story
     and four drawn silhouettes: rule which silhouette tells it, then
     rule what belongs on the y-axis — both, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • Every function lab (Line, Quadratic, Exponential, …) owns
       equation-first graphs; no equation, formula, or symbol rule
       appears anywhere in this bench — the audit greps it.
     • FunctionLab owns the one-output promise and the vertical-line
       test; neither is mentioned.
     • LineFunctionLab owns the slope triangle; the word "slope" never
       appears — steepness is read as speed, in words.
     • GraphsLab (3-5) owns bar graphs of categories; nothing here is a
       bar.  DataLab owns dot plots.
     • IntegralLab owns area under curves; nothing here is shaded or
       accumulated.

   One-accent discipline: CARMINE is THE SILHOUETTE — the story's shape.
   GOLD is the piece markers and highlights (the tool).  BLUE is quiet
   axes and labels.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • There are NO numbers to get right — the correctness surface is
       structural, and the audit patrols it: every story's silhouette is
       DERIVED from its clauses (never stored), the five silhouettes are
       pairwise distinct, every cumulative height stays non-negative,
       the hill compiles to one unbroken rise, and the flask to a single
       accelerating curve.
     • The capstone's silhouette letters are assigned by a deterministic
       alphabetical ordering the audit reproduces; the y-axis truth is
       the story's own declared quantity, and the foil "speed" is proven
       never to be a truth.
     • The storyteller's stamp needs both rulings, audited over every
       posted story × chip pair; the truth chip is always present.
   Verified by audit-graphstory.mjs (structural proof + source greps)
   and verify-graphstory.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/GraphStoryLab.jsx
     2. Import and render it:
          import GraphStoryLab from './GraphStoryLab';
          export default function Page() { return <GraphStoryLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the story, the
              lesson step, the rulings).
     MODEL  — stories as clause lists; silhouettes derived, not stored.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the silhouette
const BLUE = '#3f74a6'; // quiet axes
const GOLD = '#b98718'; // piece markers and highlights
const INK_HEX = '#1c2b3a';

const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  A tiny piece vocabulary; stories as clause lists;
   the silhouette is DERIVED from the clauses.
   ------------------------------------------------------------------------- */
const SEGS = {
  up1: { label: 'rises gently', dy: 1, curve: 0 },
  up2: { label: 'rises steeply', dy: 2, curve: 0 },
  flat: { label: 'holds level', dy: 0, curve: 0 },
  down2: { label: 'falls steeply', dy: -2, curve: 0 },
  upCurve: { label: 'rises ever faster', dy: 2, curve: 1 },
};
const STORIES = {
  walk: {
    title: 'the walk to school',
    yLab: 'distance from home',
    clauses: [
      { text: 'walk steadily away from home', seg: 'up1' },
      { text: 'wait at the crossing', seg: 'flat' },
      { text: 'jog the last stretch', seg: 'up2' },
    ],
  },
  backpack: {
    title: 'the forgotten backpack',
    yLab: 'distance from home',
    clauses: [
      { text: 'set off toward school', seg: 'up2' },
      { text: 'remember the backpack and hurry home', seg: 'down2' },
      { text: 'grab it and set off again', seg: 'up2' },
    ],
  },
  bath: {
    title: 'the bath',
    yLab: 'water depth',
    clauses: [
      { text: 'the taps run full', seg: 'up2' },
      { text: 'a long soak', seg: 'flat' },
      { text: 'the plug is pulled', seg: 'down2' },
    ],
  },
  hill: {
    title: 'the hill at a steady pace',
    yLab: 'distance from home',
    clauses: [
      { text: 'climb the near side, never slowing', seg: 'up1' },
      { text: 'cross the top, same pace', seg: 'up1' },
      { text: 'descend the far side, same pace', seg: 'up1' },
    ],
  },
  flask: {
    title: 'the cone flask, steady pour',
    yLab: 'water height',
    clauses: [{ text: 'a steady pour into a flask that narrows toward the neck', seg: 'upCurve' }],
  },
};
const storyIds = Object.keys(STORIES);
const silhouetteOf = (story) => story.clauses.map((c) => c.seg);
const silhouetteText = (story) => {
  const segs = silhouetteOf(story);
  if (segs.every((s) => s === segs[0])) return `${SEGS[segs[0]].label} the whole way`;
  return segs.map((s) => SEGS[s].label).join(', then ');
};
/* the running height of a silhouette, clause by clause */
const heightsOf = (story) => {
  const hs = [0];
  for (const c of story.clauses) hs.push(hs[hs.length - 1] + SEGS[c.seg].dy);
  return hs;
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The storyteller's stamp."  A story is posted
   with four drawn silhouettes; rule the silhouette, then the y-axis.
   ------------------------------------------------------------------------- */
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * storyIds.length);
  } while (prev != null && i === prev);
  return i;
}
/* the four candidates: the story itself plus the next three, cyclically;
   letters assigned in alphabetical order of silhouette text */
const candIdsOf = (i) => [0, 1, 2, 3].map((k) => storyIds[(i + k) % storyIds.length]);
const orderedCandsOf = (i) =>
  candIdsOf(i)
    .slice()
    .sort((a, b) => (silhouetteText(STORIES[a]) < silhouetteText(STORIES[b]) ? -1 : 1));
const LETTERS = ['A', 'B', 'C', 'D'];
const shapeTruth = (i) => LETTERS[orderedCandsOf(i).indexOf(storyIds[i])];
const Y_CHIPS = ['distance from home', 'water depth', 'water height', 'speed'];
const axisTruth = (i) => STORIES[storyIds[i]].yLab;
const calibChecks = (i, shapePick, axisPick) => {
  if (i == null) return [false, false];
  const shapeOK = shapePick != null && shapePick === shapeTruth(i);
  const axisOK = shapeOK && axisPick != null && axisPick === axisTruth(i);
  return [shapeOK, axisOK];
};
const closeness = (i, s, a) =>
  Math.round((100 * calibChecks(i, s, a).filter(Boolean).length) / 2);
const isCalibrated = (i, s, a) => calibChecks(i, s, a).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that the graph draws the street,
   that falling means slowing, that the hill makes a hill.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What flat says',
    body:
      'A graph can tell a story with no numbers at all. This one tracks distance from ' +
      'home on the walk to school — three pieces, three sentences. The middle piece is ' +
      'level.',
    story: 'walk',
    hiSeg: 1,
    q: 'What does the flat middle piece say?',
    choices: [
      'Standing still — time keeps passing, distance does not; flat is the graph’s word for waiting',
      'The ground is level there',
      'The walk is half finished',
    ],
    answer: 0,
    feedback:
      'Flat means the QUANTITY is frozen while time runs on — here, waiting at the ' +
      'crossing. Notice the snare the second choice sets: a graph is not a drawing of ' +
      'the street. It reports one named quantity, and it will keep refusing to be a ' +
      'picture for the rest of this bench.',
  },
  {
    title: 'Steeper is faster',
    body:
      'The first piece and the last piece both rise — but not alike. The jog at the end ' +
      'climbs more distance in the same slice of time.',
    story: 'walk',
    hiSeg: 2,
    q: 'Why is the last piece steeper?',
    choices: [
      'Jogging covers more distance each minute — steepness is speed, read straight off the shape',
      'The street tilts uphill near the school',
      'Graphs are drawn to end steeply',
    ],
    answer: 0,
    feedback:
      'Steeper means faster, gentler means slower, flat means stopped — that is the ' +
      'whole reading kit. And again the street’s tilt appears nowhere in it: only how ' +
      'quickly the distance itself is growing.',
  },
  {
    title: 'The U-turn',
    body:
      'A new story: halfway to school you remember the backpack. Set off, hurry home, ' +
      'then set off again.',
    story: 'backpack',
    hiSeg: 1,
    q: 'What does the falling middle piece say?',
    choices: [
      'Heading home — the distance from home is shrinking; falling is direction, not slowing down',
      'Slowing down',
      'Walking downhill',
    ],
    answer: 0,
    feedback:
      'Falling reports the quantity dropping — you are getting CLOSER to home, and ' +
      'quickly. Speed lives in steepness; direction lives in rising versus falling. ' +
      'Two different questions, answered by two different features of the shape.',
  },
  {
    title: 'The graph is not a photo',
    body:
      'The famous one. You walk over a hill, never changing pace, and the y-axis says ' +
      'distance from home. What shape does the graph make?',
    story: 'hill',
    hiSeg: -1,
    q: 'The graph of the hill walk is…',
    choices: [
      'A straight rising line the whole way — distance grows steadily; the hill is scenery, and graphs refuse to draw scenery',
      'A hill shape — up, then down',
      'Flat at the top, where the ground levels out',
    ],
    answer: 0,
    feedback:
      'The hill shape is the most common wrong answer in the chapter. But the y-axis ' +
      'says distance from home, and that grows with every steady step — up the near ' +
      'side, across the top, down the far side. A graph plots its named quantity and ' +
      'nothing else, ever.',
  },
  {
    title: 'The curve that speeds',
    body:
      'A steady pour into a flask that narrows toward the neck. The height line is one ' +
      'unbroken curve — shallow at first, steep at the end.',
    story: 'flask',
    hiSeg: 0,
    q: 'Why does the line curve upward?',
    choices: [
      'Each second’s water spreads across a narrower width, so the level climbs faster and faster — a bend means the speed itself is changing',
      'The pour must be speeding up',
      'Curved lines are just prettier',
    ],
    answer: 0,
    feedback:
      'The pour never changed; the CONTAINER did. At the wide base a cupful barely ' +
      'raises the level; at the narrow neck the same cupful jumps it. Straight pieces ' +
      'say steady; bends say changing — the last word in the silhouette vocabulary.',
  },
  {
    title: 'The storyteller’s stamp',
    body:
      'A story is posted and four silhouettes are drawn. Rule which silhouette tells the ' +
      'story, then rule what belongs on the y-axis. Both, or no stamp.',
    story: 'walk',
    hiSeg: -1,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function GraphStoryLab() {
  const [shapePick, setShapePick] = useState(null);
  const [axisPick, setAxisPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  const checks = calib ? calibChecks(kase, shapePick, axisPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, shapePick, axisPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, shapePick, axisPick) : false;

  sceneRef.current = {
    story: STORIES[current.story],
    hiSeg: current.hiSeg,
    calib,
    kase,
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

    const INK_SOFT = '#5b6b7b';
    const S = sceneRef.current;
    ctx.clearRect(0, 0, W, H);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let gx = gs; gx < W; gx += gs) {
      ctx.moveTo(Math.round(gx) + 0.5, 0);
      ctx.lineTo(Math.round(gx) + 0.5, H);
    }
    for (let gy = gs; gy < H; gy += gs) {
      ctx.moveTo(0, Math.round(gy) + 0.5);
      ctx.lineTo(W, Math.round(gy) + 0.5);
    }
    ctx.stroke();

    const bandH = 52;

    /* draw one silhouette inside a pixel box */
    const drawSilhouette = (story, x0, y0, w, h, hiSeg, lw) => {
      const segs = silhouetteOf(story);
      const hs = heightsOf(story);
      const maxH = Math.max(...hs, 2.5);
      const segW = w / segs.length;
      const yPix = (v) => y0 + h - (v / (maxH + 0.6)) * h - 8;
      /* axes */
      ctx.strokeStyle = 'rgba(91,107,123,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x0, yPix(0));
      ctx.lineTo(x0 + w, yPix(0));
      ctx.moveTo(x0, y0 + 4);
      ctx.lineTo(x0, yPix(0));
      ctx.stroke();
      /* the pieces */
      for (let k = 0; k < segs.length; k++) {
        const seg = SEGS[segs[k]];
        const sx = x0 + k * segW;
        const ex = x0 + (k + 1) * segW;
        const sy = yPix(hs[k]);
        const ey = yPix(hs[k + 1]);
        ctx.strokeStyle = hiSeg === k ? GOLD : CARMINE;
        ctx.lineWidth = hiSeg === k ? lw + 1.4 : lw;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        if (seg.curve) {
          ctx.quadraticCurveTo(sx + (ex - sx) * 0.75, sy - (sy - ey) * 0.12, ex, ey);
        } else {
          ctx.lineTo(ex, ey);
        }
        ctx.stroke();
        /* piece joints */
        ctx.fillStyle = INK_HEX;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.6, 0, 2 * Math.PI);
        ctx.fill();
      }
      const endY = yPix(hs[hs.length - 1]);
      ctx.fillStyle = INK_HEX;
      ctx.beginPath();
      ctx.arc(x0 + w, endY, 2.6, 0, 2 * Math.PI);
      ctx.fill();
      return yPix;
    };

    if (!S.calib) {
      const x0 = 70;
      const wPlot = W - 110;
      const y0 = bandH + 26;
      const hPlot = H - bandH - 120;
      drawSilhouette(S.story, x0, y0, wPlot, hPlot, S.hiSeg, 3);
      /* axis words */
      ctx.fillStyle = BLUE;
      ctx.font = 'italic 600 12px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('time →', x0 + wPlot, y0 + hPlot + 2);
      ctx.textAlign = 'left';
      ctx.fillText('↑ ' + S.story.yLab, x0 - 52, y0 - 20);
      /* the clauses, numbered under the plot */
      ctx.font = '600 11.5px ui-monospace, monospace';
      ctx.textBaseline = 'top';
      let cy = y0 + hPlot + 26;
      S.story.clauses.forEach((c, k) => {
        ctx.fillStyle = S.hiSeg === k ? GOLD : INK_HEX;
        ctx.textAlign = 'left';
        ctx.fillText(`${k + 1} · ${c.text} — ${SEGS[c.seg].label}`, x0 - 30, cy);
        cy += 19;
      });
    } else if (S.kase != null) {
      /* the four candidates, lettered, in a 2×2 grid */
      const ordered = orderedCandsOf(S.kase);
      const cw = (W - 90) / 2;
      const ch = (H - bandH - 70) / 2;
      ordered.forEach((id, k) => {
        const gx = 40 + (k % 2) * (cw + 30);
        const gy = bandH + 16 + Math.floor(k / 2) * (ch + 26);
        ctx.fillStyle = INK_HEX;
        ctx.font = '700 14px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(LETTERS[k], gx, gy);
        drawSilhouette(STORIES[id], gx + 18, gy, cw - 24, ch - 20, -1, 2.2);
      });
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib && S.kase != null
        ? `the story: ${STORIES[storyIds[S.kase]].title}`
        : `${S.story.title} · ${S.story.yLab}, against time`,
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
    setShapePick(null);
    setAxisPick(null);
    if (STEPS[step].calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setShapePick(null);
    setAxisPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? STORIES[storyIds[kase]].title : ''}, with four silhouettes drawn. Shape ${shapePick ?? 'unruled'}; axis ${axisPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${STORIES[current.story].title}: the ${STORIES[current.story].yLab} line ${silhouetteText(STORIES[current.story])}.`;

  return (
    <div className="gslab">
      <header className="head">
        <h1>Qualitative Graphs: The Story’s Silhouette</h1>
        <p className="lede">
          No symbols, no numbers — just shape as meaning. Rising is growing, flat is
          frozen, steeper is faster, a bend is changing speed. And the graph plots its{' '}
          <em>named quantity</em>, never the scenery.
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

          <div className="toolbar" role="group" aria-label="Scene">
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

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted story</span>
                <span className="target-word">{STORIES[storyIds[kase]].title}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the silhouette, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the y-axis, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Silhouette ruling">
                  {LETTERS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (shapePick === c2 ? ' active' : '')}
                      onClick={() => setShapePick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Axis ruling">
                  {Y_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (axisPick === c2 ? ' active' : '')}
                      onClick={() => setAxisPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled — the story is told'
                    : checks[0]
                      ? 'shape ruled — now the axis'
                      : 'read the clauses, piece by piece'}
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
                  <span className="mono target-hint">the shape · then the axis</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setShapePick(null);
                  setAxisPick(null);
                }}
              >
                Next case
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
                  setShapePick(null);
                  setAxisPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">rising grows · flat waits · steeper hurries · bends change</span>{' '}
        &nbsp;·&nbsp; a qualitative graph is a story told by one quantity — and it never,
        ever draws the scenery.
      </footer>

      <style jsx>{`
        .gslab {
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
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
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
          font-family: var(--serif);
          font-size: 21px;
          font-weight: 600;
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
          font-size: 12.5px;
          font-weight: 700;
          padding: 7px 11px;
          border-radius: 6px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
        }
        .declbtn.reason {
          font-size: 11.5px;
          font-weight: 600;
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
        :global(.gslab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (max-width: 460px) {
          .toolbar {
            gap: 6px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chipbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
