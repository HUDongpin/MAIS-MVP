'use client';

/* ============================================================================
   TwoDistributionsLab — an interactive "bench" for COMPARING TWO DISTRIBUTIONS:
   two dot piles on one number line, and the question that actually decides
   things — not "whose center is higher?" but "how many spread-rulers apart
   are the centers?"  (CCSS 7.SP.B.3 — informal degree of visual overlap,
   difference of centers as a multiple of a measure of variability; 7.SP.B.4 —
   informal comparative inference.)

   THE SIGNATURE CENTERPIECE — "the spread-ruler."  A gold ruler exactly one
   MAD long is laid end to end across the carmine gap between the two flagged
   centers.  The same 4-unit gap holds four rulers when the piles are tight
   (ruler = 1) but only two when the piles are wide (ruler = 2) — the units
   tie, the rulers do not, and the rulers are right: 12 dots share the
   stretch in the wide pair against 2 in the tight one.

   THE MODEL — exact integer arithmetic throughout:
     · a pile is a SHAPE (symmetric offset/count rows, n = 10) posted at an
       integer center c: tight = (−2,1)(−1,3)(0,2)(1,3)(2,1), wide = the same
       silhouette stretched ×2.
     · centerOf(c, shape)  = Σ v·k / n — asserts integrality; symmetry makes
       the center land exactly on c.
     · rulerOf(shape)      = Σ|v − μ|·k / n — asserts integrality; the tight
       ruler is exactly 1, the wide ruler exactly 2.  The ruler is BORROWED
       from the spread bench, never derived here.
     · overlapOf(a, b, s)  = the count of dots (both piles) standing in the
       intersection of the two supports — overlap as a NUMBER, not a vibe.
     · gapOf / rulersOf    = b − a, and (b − a) ÷ ruler with exact-division
       assertion.  Every posted scene divides evenly.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No building or editing plots, no dot is draggable — DataLab and
       BoxPlotLab own build-a-dot-plot; VarianceLab owns dragging a point
       and watching spread respond.  Both piles here are POSTED.
     · No quartiles, no five-number machinery — BoxPlotLab owns them.
     · No derivation of the MAD, no bars under dots, no duel with any other
       spread measure — VarianceLab owns all of that.  The MAD arrives here
       as a finished gold ruler "forged on the spread bench," with credit.
     · No balance-point language for the center — MeanLab owns the fulcrum.
       Centers here are flags planted on the line, computed exactly.
     · No sampling story, no pond — SamplingLab owns who-got-measured.
   COLORS: one accent. CARMINE = the gap (the mathematical object).
   GOLD = the spread-ruler (the tool). BLUE / slate = the two quiet piles.
   GREEN appears only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a pair is posted with centers flagged and the ruler
   printed.  Rule the gap in line units (subtract the flags), then rule the
   gap in rulers (divide by the printed ruler).  The stamp is a conjunction
   of exact equalities against chip truths derived from the model; the meter
   is quantized to {0, 50, 100} and the second ruling earns nothing until
   the first stands.  The stamp provably cannot fire falsely.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================================================================
   MODEL — exact integer arithmetic; nothing a student sees is floated.
   ========================================================================== */
const CARMINE = '#c81e4f';
const BLUE = '#3f74a6';
const GOLD = '#b98718';
const INK_HEX = '#243342';
const SLATE = '#5b6b7b';
const CALIB_STEP = 5;

/* a pile is a symmetric shape of [offset, count] rows, n = 10 dots */
const SHAPES = {
  tight: { label: 'tight piles', rows: [[-2, 1], [-1, 3], [0, 2], [1, 3], [2, 1]] },
  wide: { label: 'wide piles', rows: [[-4, 1], [-2, 3], [0, 2], [2, 3], [4, 1]] },
};

const dotsOf = (c, shape) => SHAPES[shape].rows.map(([o, k]) => [c + o, k]);
const nOf = (shape) => SHAPES[shape].rows.reduce((t, [, k]) => t + k, 0);
const sumOf = (c, shape) => dotsOf(c, shape).reduce((t, [v, k]) => t + v * k, 0);

/* the center: Σ v·k over n, asserted exact (symmetry lands it on c) */
const centerOf = (c, shape) => {
  const n = nOf(shape);
  const s = sumOf(c, shape);
  if (s % n !== 0) throw new Error('center must be exact');
  return s / n;
};

/* the spread-ruler: Σ|v − μ|·k over n, asserted exact — borrowed, not derived */
const rulerOf = (shape) => {
  const n = nOf(shape);
  const mu = centerOf(0, shape);
  const t = dotsOf(0, shape).reduce((s, [v, k]) => s + Math.abs(v - mu) * k, 0);
  if (t % n !== 0) throw new Error('ruler must be exact');
  return t / n;
};

/* the shared stretch: dots of BOTH piles inside the supports' intersection */
const spanOf = (c, shape) => {
  const vs = dotsOf(c, shape).map(([v]) => v);
  return [Math.min(...vs), Math.max(...vs)];
};
const overlapOf = (a, b, shape) => {
  const [loA, hiA] = spanOf(a, shape);
  const [loB, hiB] = spanOf(b, shape);
  const lo = Math.max(loA, loB);
  const hi = Math.min(hiA, hiB);
  if (lo > hi) return 0;
  const inside = (c) => dotsOf(c, shape).reduce((t, [v, k]) => t + (v >= lo && v <= hi ? k : 0), 0);
  return inside(a) + inside(b);
};

const gapOf = (a, b) => b - a;
const rulersOf = (shape, a, b) => {
  const g = gapOf(a, b);
  const r = rulerOf(shape);
  if (g % r !== 0) throw new Error('every posted gap divides evenly');
  return g / r;
};

/* the lesson's posted pairs */
const PAIRS = {
  close: { label: 'tight piles at 6 and 7', shape: 'tight', a: 6, b: 7 },
  slide: { label: 'tight piles, the second on a dial', shape: 'tight', a: 6, b: 10, dial: true },
  apart: { label: 'tight piles at 6 and 10', shape: 'tight', a: 6, b: 10 },
  wide: { label: 'wide piles at 6 and 10', shape: 'wide', a: 6, b: 10 },
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted pairs; truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [
  { shape: 'tight', a: 6, b: 7 },
  { shape: 'tight', a: 6, b: 8 },
  { shape: 'tight', a: 5, b: 9 },
  { shape: 'wide', a: 6, b: 8 },
  { shape: 'wide', a: 4, b: 10 },
  { shape: 'wide', a: 5, b: 9 },
  { shape: 'tight', a: 6, b: 9 },
];
const GAP_CHIPS = ['1', '2', '3', '4', '6'];
const RULER_CHIPS = ['1', '2', '3', '4'];

const labelOf = (i) => {
  const c = CASES[i];
  return `${SHAPES[c.shape].label} at ${c.a} and ${c.b}`;
};
const gapTruth = (i) => String(gapOf(CASES[i].a, CASES[i].b));
const rulTruth = (i) => String(rulersOf(CASES[i].shape, CASES[i].a, CASES[i].b));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, gPick, rPick) => {
  if (i == null) return [false, false];
  const c1 = gPick === gapTruth(i);
  const c2 = c1 && rPick === rulTruth(i);
  return [c1, c2];
};
const closeness = (i, gPick, rPick) => {
  const [c1, c2] = calibChecks(i, gPick, rPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, gPick, rPick) => calibChecks(i, gPick, rPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two piles, one line',
    body:
      'Group A and Group B, ten dots each, posted on one number line. Their centers ' +
      'sit at 6 and 7 — one unit apart. Look before you count.',
    pair: 'close',
    q: 'The centers differ. Can you call a winner by eye?',
    choices: [
      'Barely — 18 of the 20 dots stand in the shared stretch, so the piles mostly tell one story',
      'Yes — every dot in the higher pile beats every dot in the lower one',
      'No — two groups can never be compared from a picture',
    ],
    answer: 0,
    feedback:
      'The shared stretch runs from 5 to 8, and 18 of the 20 dots stand inside it. ' +
      'A one-unit difference between centers is real, but it is small next to how ' +
      'widely each pile spreads. Eyes alone cannot referee this one.',
    note:
      'The centers are honest — 6 and 7, computed exactly. What the picture adds is ' +
      'context: a difference between centers only matters when it is weighed against ' +
      'how much the piles themselves wobble.',
  },
  {
    title: 'Push them apart',
    body:
      'Same piles, but the second center rides a dial. Sweep it outward and watch ' +
      'the shared stretch thin.',
    pair: 'slide',
    q: 'At centers 6 and 10, how many dots stand in the shared stretch?',
    choices: [
      'Two — one dot from each pile, meeting at the value 8',
      'Eighteen, as before',
      'None — the piles no longer touch',
    ],
    answer: 0,
    feedback:
      'The stretch has thinned to the single value 8, where each pile parks exactly ' +
      'one dot: two, down from eighteen. The same two piles, four units apart ' +
      'instead of one, now tell two clearly different stories.',
    note:
      'Sweep the dial once more and watch the count fall: 18, then 12, then 8, then ' +
      '2, then none at all. Overlap is not a vibe — it is a number the picture will ' +
      'hand you if you ask.',
  },
  {
    title: 'The ruler appears',
    body:
      'Centers 6 and 10. Now the tool: each pile’s spread, measured on the spread ' +
      'bench, is exactly 1 unit — the MAD. Lay it along the gap like a ruler.',
    pair: 'apart',
    showRuler: true,
    q: 'The gap is 4 units. How many rulers long is it?',
    choices: [
      'Four — the gap holds four full rulers, a wide separation',
      'One — a gap is always one ruler long',
      'Cannot say without more data',
    ],
    answer: 0,
    feedback:
      'Four rulers, end to end, with nothing hanging over. Statisticians read this ' +
      'as strong separation: the distance between centers is four times the typical ' +
      'wobble inside a pile. This gap is no accident of spread.',
    note:
      'The ruler is borrowed, not built. The spread bench forged it; this bench only ' +
      'lays it down. One number from there — the MAD — becomes a unit of measure here.',
  },
  {
    title: 'Same gap, wider piles',
    body:
      'New piles: the same centers, 6 and 10, but each pile now spreads twice as ' +
      'wide. The spread bench reports a ruler 2 units long.',
    pair: 'wide',
    showRuler: true,
    q: 'The gap is still 4 units. How many rulers now?',
    choices: [
      'Two — the ruler grew, so the same gap measures half as many spreads',
      'Four — the gap has not changed',
      'Eight — wider piles double everything',
    ],
    answer: 0,
    feedback:
      'Two rulers. The gap did not move an inch, yet the separation weakened: 12 ' +
      'dots now stand in the shared stretch, up from 2. Measured in units the two ' +
      'gaps tie; measured in rulers, the tight pair is twice as separated.',
    note:
      'This is the whole reason the ruler exists. Units belong to the line; rulers ' +
      'belong to the piles. Only the second measurement notices that wider piles ' +
      'blur a gap.',
  },
  {
    title: 'The rule',
    body: 'Separation is the gap divided by the spread — counted in rulers, never in bare units.',
    pair: 'apart',
    showRuler: true,
    q: 'Gap 3 with ruler 1, or gap 4 with ruler 2 — which pair separates more cleanly?',
    choices: [
      'Gap 3 with ruler 1 — three rulers beats two, even though 4 is the bigger gap',
      'Gap 4 with ruler 2 — bigger gaps always win',
      'They tie — a gap is a gap',
    ],
    answer: 0,
    feedback:
      'Three rulers against two. The bare gap voted the other way — 4 beats 3 — and ' +
      'the bare gap was wrong. Dividing by spread is what turns a picture of dots ' +
      'into a verdict.',
    note:
      'Carry this test everywhere data lives: a headline difference is worth little ' +
      'until someone tells you the wobble it must be weighed against. Ask for the ' +
      'ruler before you applaud the gap.',
  },
  {
    title: 'The referee’s stamp',
    body:
      'A pair of piles is posted, centers flagged, ruler printed. Rule the gap in ' +
      'line units, then rule it in rulers. Both exact, or no stamp.',
    pair: 'apart',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TwoDistributionsLab() {
  const [bC, setBC] = useState(10);
  const [gPick, setGPick] = useState(null);
  const [rPick, setRPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const scene = calib && kase != null ? CASES[kase] : PAIRS[current.pair];
  const shape = scene.shape;
  const a = scene.a;
  const b = scene.dial ? bC : scene.b;
  const muA = centerOf(a, shape);
  const muB = centerOf(b, shape);
  const gap = gapOf(muA, muB);
  const ruler = rulerOf(shape);
  const overlap = overlapOf(a, b, shape);
  const showRuler = calib || !!current.showRuler;

  const checks = calib ? calibChecks(kase, gPick, rPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, gPick, rPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, gPick, rPick) : false;

  const bandLabel = calib
    ? `posted: ${SHAPES[shape].label} at ${a} and ${b}`
    : PAIRS[current.pair].label + (scene.dial ? ` · b = ${b}` : '');
  sceneRef.current = { shape, a, b, muA, muB, gap, ruler, overlap, showRuler, calib, bandLabel };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H2 = stage.clientHeight;
    if (W === 0 || H2 === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H2 * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const S = sceneRef.current;
    ctx.clearRect(0, 0, W, H2);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let gx = gs; gx < W; gx += gs) {
      ctx.moveTo(Math.round(gx) + 0.5, 0);
      ctx.lineTo(Math.round(gx) + 0.5, H2);
    }
    for (let gy = gs; gy < H2; gy += gs) {
      ctx.moveTo(0, Math.round(gy) + 0.5);
      ctx.lineTo(W, Math.round(gy) + 0.5);
    }
    ctx.stroke();

    const bandH = 52;
    const padL = 46;
    const padR = 20;
    const areaH = H2 - bandH;
    const xOf = (v) => padL + (v / 14) * (W - padL - padR);
    const yA = bandH + areaH * 0.42;
    const yB = bandH + areaH * 0.94;
    const yG = bandH + areaH * 0.62;

    /* the two axes, ticks and labels */
    for (const yBase of [yA, yB]) {
      ctx.strokeStyle = SLATE;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(xOf(0), yBase + 0.5);
      ctx.lineTo(xOf(14), yBase + 0.5);
      ctx.stroke();
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let v = 0; v <= 14; v++) {
        ctx.beginPath();
        ctx.moveTo(xOf(v), yBase - 3);
        ctx.lineTo(xOf(v), yBase + 3);
        ctx.stroke();
        if (v % 2 === 0) {
          ctx.fillStyle = SLATE;
          ctx.fillText(String(v), xOf(v), yBase + 6);
        }
      }
    }

    /* the piles: A above in blue, B below in slate */
    const drawPile = (c, yBase, color) => {
      ctx.fillStyle = color;
      for (const [v, k] of dotsOf(c, S.shape)) {
        for (let j = 0; j < k; j++) {
          ctx.beginPath();
          ctx.arc(xOf(v), yBase - 10 - j * 14, 5.4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    };
    drawPile(S.a, yA, BLUE);
    drawPile(S.b, yB, SLATE);
    ctx.font = 'italic 600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = BLUE;
    ctx.fillText('Group A', padL - 38, yA - 40);
    ctx.fillStyle = SLATE;
    ctx.fillText('Group B', padL - 38, yB - 40);

    /* center flags */
    const flag = (mu, yBase) => {
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.moveTo(xOf(mu), yBase - 2);
      ctx.lineTo(xOf(mu) - 5, yBase + 7);
      ctx.lineTo(xOf(mu) + 5, yBase + 7);
      ctx.closePath();
      ctx.fill();
      ctx.font = '700 11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(String(mu), xOf(mu), yBase + 16);
    };
    flag(S.muA, yA);
    flag(S.muB, yB);

    /* the gap — carmine segment between the two centers, mid-strip */
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(xOf(S.muA), yG);
    ctx.lineTo(xOf(S.muB), yG);
    ctx.stroke();
    for (const mu of [S.muA, S.muB]) {
      ctx.beginPath();
      ctx.moveTo(xOf(mu), yG - 7);
      ctx.lineTo(xOf(mu), yG + 7);
      ctx.stroke();
    }
    ctx.fillStyle = CARMINE;
    ctx.font = '700 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(S.calib ? 'gap = ?' : `gap = ${S.gap}`, (xOf(S.muA) + xOf(S.muB)) / 2, yG - 10);

    /* the spread-ruler — gold, laid end to end (a floating legend in calib) */
    if (S.showRuler) {
      ctx.lineWidth = 5;
      if (S.calib) {
        ctx.strokeStyle = GOLD;
        ctx.beginPath();
        ctx.moveTo(xOf(0), yG + 16);
        ctx.lineTo(xOf(S.ruler), yG + 16);
        ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.font = '600 11px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`the ruler: ${S.ruler} unit${S.ruler > 1 ? 's' : ''} · fits ?`, xOf(S.ruler) + 8, yG + 16);
      } else {
        const fits = S.gap / S.ruler;
        for (let i = 0; i < fits; i++) {
          ctx.strokeStyle = i % 2 === 0 ? 'rgba(185,135,24,0.95)' : 'rgba(185,135,24,0.45)';
          ctx.beginPath();
          ctx.moveTo(xOf(S.muA + i * S.ruler), yG + 16);
          ctx.lineTo(xOf(S.muA + (i + 1) * S.ruler), yG + 16);
          ctx.stroke();
        }
        ctx.fillStyle = GOLD;
        ctx.font = '600 11px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`ruler = ${S.ruler} · fits ${fits}×`, xOf(S.muB) + 10, yG + 16);
      }
    }

    /* the readout card */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the piles', 22, bandH + 8);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillStyle = CARMINE;
    ctx.fillText(S.calib ? `centers ${S.muA} and ${S.muB} · gap ?` : `centers ${S.muA} and ${S.muB} · gap ${S.gap}`, 22, bandH + 26);
    ctx.fillStyle = INK_HEX;
    ctx.fillText(`shared stretch: ${S.overlap} dots`, 22, bandH + 44);
    if (S.showRuler && !S.calib) {
      ctx.fillStyle = GOLD;
      ctx.fillText(`ruler ${S.ruler} · gap = ${S.gap / S.ruler} rulers`, 22, bandH + 62);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(S.bandLabel, W / 2, bandH / 2);
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
    setBC(10);
    setGPick(null);
    setRPick(null);
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
    setBC(10);
    setGPick(null);
    setRPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Gap ${gPick ?? 'unruled'}; rulers ${rPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${PAIRS[current.pair].label}: centers ${muA} and ${muB}, gap ${gap}${showRuler ? `, ${gap / ruler} rulers of ${ruler}` : ''}; ${overlap} dots in the shared stretch.`;

  return (
    <div className="tdlab">
      <header className="head">
        <h1>Two Piles, One Verdict: The Spread-Ruler</h1>
        <p className="lede">
          Two dot piles on one line. The real question is never just “whose center is
          higher?” — it is “how many spread-rulers apart are the centers?” A gap of 4
          can be a canyon or a rounding error; <em>the ruler decides</em>.
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

          {scene.dial && !calib && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the second pile’s center</span>
                  <span className="dial-v mono">{bC}</span>
                </div>
                <input
                  type="range"
                  min={7}
                  max={12}
                  step={1}
                  value={bC}
                  onChange={(e) => setBC(Number(e.target.value))}
                  aria-label={`Second center, ${bC}`}
                />
              </div>
            </div>
          )}

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
                {current.choices.map((cq, i) => {
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
                      {cq}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
              {answered && current.note && <p className="note">{current.note}</p>}
            </div>
          )}

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted pair</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the gap, in units</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the gap, in rulers</li>
                </ol>
                <div className="declare" role="group" aria-label="Gap ruling">
                  {GAP_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (gPick === c2 ? ' active' : '')}
                      onClick={() => setGPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Rulers ruling">
                  {RULER_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (rPick === c2 ? ' active' : '')}
                      onClick={() => setRPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — a clean verdict'
                    : checks[0]
                      ? 'gap ruled — now divide by the printed ruler'
                      : 'subtract the flagged centers first'}
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
                  <span className="mono target-hint">the units · then the rulers</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setGPick(null);
                  setRPick(null);
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
                  setGPick(null);
                  setRPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">separation = gap ÷ spread · the ruler decides</span>{' '}
        &nbsp;·&nbsp; two piles can share a line and still tell different stories —
        count the rulers between their centers, not just the units.
      </footer>

      <style jsx>{`
        .tdlab {
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
          display: grid;
          gap: 8px;
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
          color: var(--gold);
          font-weight: 700;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--gold);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .chipbtn {
          font: 600 12px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(63, 116, 166, 0.55);
          background: var(--paper);
          color: var(--blue);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
        }
        .chipbtn:hover {
          border-color: var(--ink);
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
        :global(.tdlab) :focus-visible {
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
