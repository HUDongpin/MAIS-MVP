'use client';

/* ============================================================================
   LogarithmLab — an interactive "bench" for the LOGARITHMIC FUNCTION in its
   full transformed (standard) form

        y = a · log_b(x − h) + k

   where b is the base (b > 1 here), h slides the vertical asymptote, a is a
   vertical stretch/flip, and k is a vertical shift.

   Built for MAIS (math AI system, www.mais.ac), K-12 (Algebra 2 / Precalculus).
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   THE BIG IDEA this lab is built around — a logarithm is an EXPONENT.
     log_b(x) answers the question "b raised to WHAT power gives x?"  The signature
     centerpiece is the INVERSE relationship: y = log_b(x) is the exponential
     y = b^x reflected across the line y = x. Trace a point (x, y) on the log and
     its mirror (y, x) lands exactly on the exponential — input and output swap.
     That single picture explains everything else: why the domain is x > h (a log's
     inputs are an exponential's always-positive outputs), why there is a vertical
     asymptote (the wall the exponential's horizontal asymptote becomes), and why
     every log passes through (h+1, k).

   Why the asymptote is safe here: a logarithm has exactly ONE vertical asymptote,
   at x = h, and it is defined only on x > h. The per-pixel plotter breaks its
   path wherever the model returns NaN (x ≤ h) or leaves the window, so the curve
   dives toward the wall without ever drawing a false vertical line — the same
   discipline the trig-asymptote labs use.

   The rest (state→model→render, DPI handling, the lesson state machine, the RMS
   match meter) is the same spine as the other MAIS labs, so the code reads the
   same from lab to lab.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/LogarithmLab.jsx
     2. Import and render it:
          import LogarithmLab from './LogarithmLab';
          export default function Page() { return <LogarithmLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. The live equation
   readout uses INLINE styles (not styled-jsx classes) so a child component
   renders correctly both in Next and in a plain-React harness. JS/TS agnostic.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   World window & axes. A SQUARE window (14×14, equal unit scale on both axes)
   so the reflection across y = x looks like a true mirror — essential, since
   the inverse (exponential) partner is the whole point of the lab.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -4, xmax: 10, ymin: -4, ymax: 10 };

/* ---------------------------------------------------------------------------
   Parameters. b is the star (the base — which exponential the log inverts);
   h moves the vertical asymptote (and therefore the domain); a stretches/flips;
   k shifts up/down. Each dial names the lesson step at which it unlocks.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'b', label: 'b', min: 2, max: 10, step: 0.25, unlock: 1, role: 'the base — which exponential it inverts' },
  { key: 'h', label: 'h', min: -4, max: 4, step: 0.5, unlock: 3, role: 'horizontal shift — moves the asymptote' },
  { key: 'a', label: 'a', min: -3, max: 3, step: 0.5, unlock: 4, role: 'vertical stretch — a < 0 flips it' },
  { key: 'k', label: 'k', min: -4, max: 4, step: 0.5, unlock: 5, role: 'vertical shift — up / down' },
];
const MIRROR_STEP = 2; // the "Inverse mirror" toggle unlocks here
const START = { b: 2, h: 0, a: 1, k: 0 };

/* The three famous bases, offered as quick-set chips beside the base slider.
   e is off the slider's 0.25 grid, so its chip is the only way to reach the
   natural log exactly — a deliberate nudge toward "click e for ln". */
const BASE_CHIPS = [
  { key: '2', label: '2', val: 2, note: 'binary' },
  { key: 'e', label: 'e', val: Math.E, note: 'natural · ln' },
  { key: '10', label: '10', val: 10, note: 'common · log' },
];

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the dial unlocks with the step; the reveal lives
   in `feedback` (shown after answering); distractors are real student
   misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A logarithm is an exponent',
    body:
      'A logarithm answers a question about exponents. log_b(x) asks: "b raised to WHAT power gives x?" ' +
      'So log₂(8) = 3, because 2³ = 8. The carmine curve is y = log₂(x): read off any point and you get ' +
      'the exponent that turns the base into that x. Notice it passes through (1, 0) — because b⁰ = 1 ' +
      'for every base.',
    q: 'What is log₂(8)?',
    choices: ['3, because 2³ = 8', '4, because 2 × 4 = 8', '16, because 2⁴ = 16'],
    answer: 0,
    feedback:
      'log₂(8) = 3, because 2³ = 8. A logarithm hands you back an exponent: "log base b of x" is "the ' +
      'power you raise b to, to get x." That is the entire idea. And every logarithm passes through ' +
      '(1, 0), because any base to the 0 power is 1.',
  },
  {
    title: 'The base b',
    body:
      'The b dial — and the 2 / e / 10 chips — are live. b is the base, the number being raised to a ' +
      'power. Every log_b passes through (1, 0) and through (b, 1), since b¹ = b. A bigger base grows ' +
      'more SLOWLY: log₁₀ needs x = 100 to reach 2, while log₂ gets there at x = 4. The three famous ' +
      'bases are 2, e ≈ 2.718 (the natural log, written ln), and 10 (the common log).',
    q: 'Through which point does EVERY logarithm y = log_b(x) pass, whatever the base?',
    choices: ['(1, 0)', '(0, 0)', '(0, 1)'],
    answer: 0,
    feedback:
      'Every log passes through (1, 0): log_b(1) = 0 for every base, because b⁰ = 1. They also share the ' +
      'anchor (b, 1). Change the base and the curve pivots around (1, 0) — a larger base flattens it ' +
      '(slower growth), a smaller base steepens it. These two anchor points let you sketch any log by hand.',
  },
  {
    title: 'A logarithm is an exponential in a mirror',
    body:
      'Press "Inverse mirror." The slate curve is the exponential y = bˣ, and the dashed diagonal is the ' +
      'line y = x. The logarithm is that exponential reflected across the diagonal — they are INVERSE ' +
      'functions. Trace the log: for each point (x, y), its mirror (y, x) lands exactly on the ' +
      'exponential. The log’s input is the exponential’s output, and vice-versa.',
    q: 'The exponential y = 2ˣ accepts any real x and returns only positive values. So its inverse, y = log₂(x), has…',
    choices: [
      'Domain x > 0, range all real y',
      'Domain all real x, range y > 0',
      'Domain x > 0, range y > 0',
    ],
    answer: 0,
    feedback:
      'Inverses swap input and output, so they swap domain and range. The exponential takes any x and ' +
      'returns a positive number; the logarithm takes a positive x and returns any number. That is WHY a ' +
      'log is defined only for x > 0 — a log’s inputs are the exponential’s (always positive) outputs.',
  },
  {
    title: 'The wall: asymptote and domain',
    body:
      'The h dial is live. It slides the whole curve — and its vertical asymptote — left and right. The ' +
      'asymptote is the "wall" at x = h: the graph hugs it but never touches it, diving toward −∞. The ' +
      'domain is x > h, because you can’t take the log of zero or a negative number — no power of a ' +
      'positive base ever produces one.',
    q: 'For y = log₂(x − 3), what is the domain (the x-values allowed)?',
    choices: ['x > 3', 'x > 0', 'x > −3'],
    answer: 0,
    feedback:
      'The inside of a log must be positive: x − 3 > 0, so x > 3. Setting h = 3 moves the asymptote to ' +
      'x = 3 and shifts the whole curve right by 3. The rule "the argument must be positive" is what ' +
      'builds the wall — and it is why logs have a restricted domain while exponentials do not.',
  },
  {
    title: 'Stretch and flip: a',
    body:
      'The a dial scales the curve vertically: a > 1 stretches it (steeper), 0 < a < 1 compresses it. Make ' +
      'a NEGATIVE and the whole curve flips over its horizontal — an increasing log becomes a DECREASING ' +
      'one. The anchor (h+1, k) never moves, because a × 0 = 0 there.',
    q: 'Compared with y = log₂(x), how does y = −log₂(x) look?',
    choices: [
      'Flipped to a decreasing curve (mirrored over the x-axis)',
      'Shifted down by 1',
      'Identical — the minus sign does nothing',
    ],
    answer: 0,
    feedback:
      'The −1 reflects the curve over the x-axis: where log₂ rose, −log₂ falls. Both still pass through ' +
      '(1, 0) — multiplying 0 by −1 is still 0 — and both keep the same vertical asymptote. A negative a ' +
      'is how you build a decreasing logarithm.',
  },
  {
    title: 'Shift up and down: k',
    body:
      'The last dial, k, slides the curve straight up (k > 0) or down (k < 0). It moves every point — ' +
      'including the anchor, now at (h+1, k) — but it never touches the vertical asymptote, which depends ' +
      'only on h. Watch the x-intercept slide: the crossing point is x = h + b^(−k/a).',
    q: 'Start from y = log₂(x), which crosses at (1, 0). Set k = 2. Where is the x-intercept now?',
    choices: ['At x = 1/4', 'At x = 2', 'It no longer crosses — k moved it off the axis'],
    answer: 0,
    feedback:
      'With k = 2 we need log₂(x) + 2 = 0, so log₂(x) = −2, meaning x = 2⁻² = 1/4. Lifting the curve pulls ' +
      'its x-intercept LEFT, toward the asymptote. The asymptote itself stays at x = 0 — a vertical shift ' +
      'never moves it.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery logarithm is drawn as a dashed grey curve. Match it: set the base (try ' +
      'the 2 / e / 10 chips), line the asymptote up with h, then tune a and k until your carmine curve ' +
      'lands on top and the meter reads CALIBRATED. Press "New target" for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   MODEL — pure math, no pixels. q is the parameter object { b, h, a, k }.
     model(x)   = a · log_b(x − h) + k        defined only for x > h (else NaN)
     inverse(x) = h + b^((x − k)/a)           the reflection across y = x
   inverse is the exact inverse function of model: model(inverse(x)) = x and
   inverse(model(x)) = x, so the slate "mirror" curve is always a true mirror,
   even for a transformed log.
   ------------------------------------------------------------------------- */
function model(x, q) {
  const t = x - q.h;
  if (!(t > 0)) return NaN; // log undefined at/left of the asymptote (also catches NaN)
  return (q.a * Math.log(t)) / Math.log(q.b) + q.k;
}
function inverse(x, q) {
  if (q.a === 0) return NaN;
  return q.h + Math.pow(q.b, (x - q.k) / q.a);
}

/* The two exact anchor points every log carries:
     (h + 1, k)      because log_b(1) = 0
     (h + b, a + k)  because log_b(b) = 1  */
function anchors(q) {
  return [
    [q.h + 1, q.k],
    [q.h + q.b, q.a + q.k],
  ];
}

/* x-intercept, where model = 0  →  x = h + b^(−k/a).  null if a = 0. */
function xIntercept(q) {
  if (q.a === 0) return null;
  return q.h + Math.pow(q.b, -q.k / q.a);
}

/* Discrete visible points of the curve inside the window, for hover/trace
   read-outs (ordered by increasing x). The curve stroke itself is drawn by the
   per-pixel plotter; this is only for picking the "active" point. */
function visiblePoints(q) {
  const N = 460;
  const lo = q.h; // the asymptote
  const span = WORLD.xmax - lo;
  const pts = [];
  if (span <= 0) return pts;
  for (let i = 1; i <= N; i++) {
    const x = lo + span * (i / N);
    const y = model(x, q);
    if (isFinite(y) && x >= WORLD.xmin && x <= WORLD.xmax && y >= WORLD.ymin && y <= WORLD.ymax) {
      pts.push([x, y]);
    }
  }
  return pts;
}

/* ---------------------------------------------------------------------------
   Calibration meter. Both curves are single-valued y = f(x), so we difference
   them vertically across the window. Two guards keep a logarithm's −∞ dive from
   swamping the meter: residuals are clamped to a CAP, and where exactly one
   curve is defined (the band between two different asymptotes) we charge the
   full CAP — that is precisely the penalty that forces the asymptotes (h) to
   line up. Grid-aligned targets make an exact match read a clean 0.
   ------------------------------------------------------------------------- */
function rmsError(u, t) {
  const N = 320;
  const CAP = 4;
  let s = 0;
  let cnt = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const yu = model(x, u);
    const yt = model(x, t);
    const fu = isFinite(yu);
    const ft = isFinite(yt);
    if (!fu && !ft) continue; // left of both asymptotes — nothing to compare
    let d;
    if (fu && ft) d = yu - yt;
    else d = CAP; // asymptote mismatch — one curve exists here, the other doesn't
    if (d > CAP) d = CAP;
    else if (d < -CAP) d = -CAP;
    s += d * d;
    cnt++;
  }
  return cnt ? Math.sqrt(s / cnt) : CAP;
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.9)));
const MATCH_RMS = 0.05; // below this the curves are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const bs = [2, Math.E, 10]; // all reachable exactly (e only via its chip)
  const as = [-2, -1, 1, 2];
  const hs = [-2, -1, 0, 1, 2];
  const ks = [-2, -1, 0, 1, 2];
  const same = (u, w) => w && u.b === w.b && u.a === w.a && u.h === w.h && u.k === w.k;
  let t;
  let guard = 0;
  do {
    t = { b: pick(bs), a: pick(as), h: pick(hs), k: pick(ks) };
    guard++;
  } while (guard < 80 && (same(t, prev) || same(t, START)));
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals, base labels.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
const isE = (b) => Math.abs(b - Math.E) < 1e-9;
function baseLabel(b) {
  if (isE(b)) return 'e';
  if (Math.abs(b - Math.round(b)) < 1e-9) return String(Math.round(b));
  return trim(b);
}
function baseName(b) {
  if (isE(b)) return 'e ≈ 2.718 · natural log (ln)';
  if (Math.abs(b - 10) < 1e-9) return 'common log (log)';
  if (Math.abs(b - 2) < 1e-9) return 'binary log';
  return 'base ' + trim(b);
}
const ptStr = ([x, y]) => `(${trim(x)}, ${trim(y)})`;

/* Inverse (mirror) function as a compact readable string y = h + b^(exponent). */
function inverseText(q) {
  const base = baseLabel(q.b);
  const idA = Math.abs(q.a - 1) < 1e-9;
  const idK = q.k === 0;
  let inner = 'x';
  if (!idK) inner = `x ${q.k > 0 ? MINUS + ' ' + trim(q.k) : '+ ' + trim(-q.k)}`;
  let expo;
  if (idA) expo = inner;
  else expo = `(${inner})/${trim(q.a)}`;
  const head = q.h === 0 ? '' : `${trim(q.h)} + `;
  return `y = ${head}${base}^(${expo})`;
}

/* Live equation readout — INLINE styles so it renders identically in Next and
   in a bare-React harness (styled-jsx classes don't cross component boundaries).
   Carmine, monospace: the symbol half of the symbol↔picture link. */
const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
const eqStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: 'wrap',
  fontFamily: MONO,
  fontVariantNumeric: 'tabular-nums',
  color: '#c81e4f',
  fontSize: '19px',
  fontWeight: 600,
};
const opStyle = { fontWeight: 600, margin: '0 1px' };
function LogEquation({ q }) {
  const { a, b, h, k } = q;
  let coeff = null;
  if (Math.abs(a + 1) < 1e-9) coeff = <span style={opStyle}>{MINUS}</span>;
  else if (Math.abs(a - 1) > 1e-9) coeff = <span>{trim(a)}</span>;
  const base = baseLabel(b);
  const arg =
    h === 0 ? (
      <>x</>
    ) : (
      <>
        (x&nbsp;{h > 0 ? MINUS : '+'}&nbsp;{trim(Math.abs(h))})
      </>
    );
  const kPart =
    k === 0 ? null : (
      <>
        <span style={opStyle}>{k > 0 ? '+' : MINUS}</span>
        <span>{trim(Math.abs(k))}</span>
      </>
    );
  return (
    <span style={eqStyle}>
      <span>y</span>
      <span style={opStyle}>=</span>
      {coeff}
      <span>
        log<sub style={{ fontSize: '0.66em' }}>{base}</sub>
        {arg}
      </span>
      {kPart}
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function LogarithmLab() {
  const [b, setB] = useState(START.b);
  const [h, setH] = useState(START.h);
  const [a, setA] = useState(START.a);
  const [k, setK] = useState(START.k);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);
  const [mirror, setMirror] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // {wx, wy} world coords under the pointer, or null
  const tracerRef = useRef(null); // normalized sweep t ∈ [0,1] of the tracer, or null
  const sceneRef = useRef({});

  const params = { b, h, a, k };
  const current = STEPS[step];

  const calib = !!current.calib;
  const mirrorUnlocked = step >= MIRROR_STEP;
  const showMirror = mirror && mirrorUnlocked && !calib;
  const showAnchors = !calib && step >= 1;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/tracer handlers never read stale values.
  sceneRef.current = {
    b, h, a, k,
    calib,
    target,
    showMirror,
    showAnchors,
    step,
  };

  const rms = target ? rmsError(params, target) : Infinity;
  const pct = target ? matchPercent(rms) : 0;
  const calibrated = target ? rms < MATCH_RMS : false;

  /* ---- world → screen transform + full redraw from state ------------------ */
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

    const sx = (x) => ((x - WORLD.xmin) / (WORLD.xmax - WORLD.xmin)) * W;
    const sy = (y) => ((WORLD.ymax - y) / (WORLD.ymax - WORLD.ymin)) * H;

    const S = sceneRef.current;
    const q = { b: S.b, h: S.h, a: S.a, k: S.k };

    ctx.clearRect(0, 0, W, H);

    /* forbidden region x ≤ h (outside the domain) — a whisper of grey so the
       "wall" reads as an edge of the world, not just a line. */
    if (!S.calib) {
      const wallX = Math.max(0, Math.min(W, sx(S.h)));
      ctx.fillStyle = 'rgba(91,107,123,0.07)';
      ctx.fillRect(0, 0, wallX, H);
    }

    /* minor grid (quadrille paper) */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    for (let gx = Math.ceil(WORLD.xmin); gx <= WORLD.xmax; gx++) {
      const X = Math.round(sx(gx)) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let gy = Math.ceil(WORLD.ymin); gy <= WORLD.ymax; gy++) {
      const Y = Math.round(sy(gy)) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* axes */
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, Math.round(sy(0)) + 0.5);
    ctx.lineTo(W, Math.round(sy(0)) + 0.5);
    ctx.moveTo(Math.round(sx(0)) + 0.5, 0);
    ctx.lineTo(Math.round(sx(0)) + 0.5, H);
    ctx.stroke();

    /* tick labels (every 2 units) */
    ctx.fillStyle = 'rgba(91,107,123,0.95)';
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let gx = Math.ceil(WORLD.xmin / 2) * 2; gx <= WORLD.xmax; gx += 2) {
      if (gx === 0 || gx <= WORLD.xmin || gx >= WORLD.xmax) continue;
      ctx.fillText(String(gx), sx(gx), sy(0) + 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = Math.ceil(WORLD.ymin / 2) * 2; gy <= WORLD.ymax; gy += 2) {
      if (gy === 0 || gy <= WORLD.ymin || gy >= WORLD.ymax) continue;
      ctx.fillText(String(gy), sx(0) - 6, sy(gy));
    }

    /* ---- small drawing helpers ---- */
    // per-pixel plotter with a pen-break when the value is NaN (outside domain)
    // or leaves the window — so the log never draws a false line across the wall.
    const plot = (fn, color, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      let pen = false;
      for (let px = 0; px <= W; px++) {
        const x = WORLD.xmin + (px / W) * (WORLD.xmax - WORLD.xmin);
        const y = fn(x);
        if (!isFinite(y) || y < WORLD.ymin - 2 || y > WORLD.ymax + 2) {
          pen = false;
          continue;
        }
        const X = sx(x);
        const Y = sy(y);
        if (!pen) {
          ctx.moveTo(X, Y);
          pen = true;
        } else {
          ctx.lineTo(X, Y);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    const line = (x1, y1, x2, y2, color, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      ctx.moveTo(sx(x1), sy(y1));
      ctx.lineTo(sx(x2), sy(y2));
      ctx.stroke();
      ctx.restore();
    };

    const dot = (x, y, r, fill, ring) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx(x), sy(y), r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (ring) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = ring;
        ctx.stroke();
      }
      ctx.restore();
    };

    const labelChip = (text, X, Y, color) => {
      ctx.save();
      ctx.font = '11.5px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      const bx = Math.min(Math.max(X, 4), W - tw - 8);
      const by = Math.min(Math.max(Y, 2), H - 16);
      ctx.fillStyle = 'rgba(251,251,248,0.85)';
      ctx.fillRect(bx - 3, by, tw + 6, 15);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, bx, by + 1);
      ctx.restore();
    };

    /* the mirror world (inverse partner) — line y = x + the exponential y = bˣ */
    if (S.showMirror) {
      const lo = Math.max(WORLD.xmin, WORLD.ymin);
      const hi = Math.min(WORLD.xmax, WORLD.ymax);
      line(lo, lo, hi, hi, 'rgba(91,107,123,0.5)', 1.4, [5, 5]);
      labelChip('y = x', sx(hi) - 44, sy(hi) + 6, '#5B6B7B');
      plot((x) => inverse(x, q), '#356B8A', 2.2);
      // label the exponential near where it exits the top
      let lx = null;
      for (let px = 0; px <= W; px++) {
        const x = WORLD.xmin + (px / W) * (WORLD.xmax - WORLD.xmin);
        if (inverse(x, q) > WORLD.ymax - 0.5) {
          lx = x;
          break;
        }
      }
      if (lx != null) labelChip('y = bˣ  (inverse)', sx(lx) + 6, sy(WORLD.ymax) + 6, '#356B8A');
    }

    /* the vertical asymptote — a dashed grey wall at x = h. Label sits partway
       DOWN the line (≈ y = 7) so it clears both the top-left read-out box and
       the bottom-left "hover" hint chip. */
    if (!S.calib) {
      line(S.h, WORLD.ymin, S.h, WORLD.ymax, 'rgba(91,107,123,0.8)', 1.7, [6, 5]);
      labelChip(`x = ${trim(S.h)}  (asymptote)`, sx(S.h) + 6, sy(7), '#5B6B7B');
    }

    /* target curve (calibration only) — dashed grey, drawn under the accent */
    if (S.calib && S.target) {
      // target's own asymptote, faint, so the "line up the wall" task is legible
      line(S.target.h, WORLD.ymin, S.target.h, WORLD.ymax, 'rgba(91,107,123,0.45)', 1.4, [4, 6]);
      plot((x) => model(x, S.target), 'rgba(91,107,123,0.9)', 2, [7, 6]);
    }

    /* the mathematical object — the one carmine accent */
    plot((x) => model(x, q), '#C81E4F', 2.75);

    /* the two exact anchor points (h+1, k) and (h+b, a+k) */
    if (S.showAnchors) {
      for (const [ax, ay] of anchors(q)) {
        if (ax < WORLD.xmin || ax > WORLD.xmax || ay < WORLD.ymin || ay > WORLD.ymax) continue;
        dot(ax, ay, 3.5, '#C81E4F', '#FBFBF8');
      }
    }

    /* the active point on the curve: tracer takes precedence over hover */
    const vis = visiblePoints(q);
    let active = null;
    if (tracerRef.current != null && vis.length > 1) {
      const idx = Math.round(tracerRef.current * (vis.length - 1));
      active = vis[Math.max(0, Math.min(vis.length - 1, idx))];
    } else if (hoverRef.current && vis.length) {
      const hv = hoverRef.current;
      let best = null;
      let bd = Infinity;
      for (const c of vis) {
        const dd = (c[0] - hv.wx) ** 2 + (c[1] - hv.wy) ** 2;
        if (dd < bd) {
          bd = dd;
          best = c;
        }
      }
      if (best && Math.sqrt(bd) < 0.9) active = best;
    }

    /* the reflection: active point (x, y) on the log, its mirror (y, x) on the
       exponential, joined across y = x — the input↔output swap made visible. */
    if (active && S.showMirror) {
      const [px, py] = active;
      const mxp = py;
      const myp = px; // mirror = (y, x)
      if (mxp >= WORLD.xmin && mxp <= WORLD.xmax && myp >= WORLD.ymin && myp <= WORLD.ymax) {
        line(px, py, mxp, myp, 'rgba(53,107,138,0.55)', 1.4, [3, 4]);
        dot(mxp, myp, 4.5, '#356B8A', '#FBFBF8');
      }
    }

    /* the payoff read-out. When the transforms are at identity (a=1,h=0,k=0) we
       can show the defining arithmetic b^y = x; otherwise a plain coordinate. */
    if (active) {
      const [px, py] = active;
      const identity = Math.abs(S.a - 1) < 1e-9 && S.h === 0 && S.k === 0;
      if (S.showMirror && identity) {
        const bl = baseLabel(S.b);
        const yr = py;
        const lines = [
          `x = ${px.toFixed(2)}`,
          `log${bl}(x) = ${yr.toFixed(2)}   ← the exponent`,
          `${bl}^(${yr.toFixed(2)}) = ${px.toFixed(2)}   ✓`,
          `a log undoes an exponent`,
        ];
        ctx.save();
        ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
        let bw = 0;
        for (const l of lines) bw = Math.max(bw, ctx.measureText(l).width);
        ctx.fillStyle = 'rgba(251,251,248,0.95)';
        ctx.strokeStyle = 'rgba(28,43,58,0.15)';
        ctx.lineWidth = 1;
        ctx.fillRect(8, 8, bw + 16, lines.length * 16 + 10);
        ctx.strokeRect(8, 8, bw + 16, lines.length * 16 + 10);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        lines.forEach((l, i) => {
          ctx.fillStyle = i === 3 ? '#C81E4F' : i === 2 ? '#356B8A' : '#1C2B3A';
          ctx.fillText(l, 16, 14 + i * 16);
        });
        ctx.restore();
      } else {
        const X = sx(px);
        const Y = sy(py);
        ctx.save();
        ctx.strokeStyle = 'rgba(28,43,58,0.28)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(X, sy(0));
        ctx.lineTo(X, Y);
        ctx.moveTo(sx(0), Y);
        ctx.lineTo(X, Y);
        ctx.stroke();
        ctx.restore();
        labelChip(`(${px.toFixed(2)}, ${py.toFixed(2)})`, X + 8, Y - 20, '#1C2B3A');
      }
      dot(px, py, 5.5, '#C81E4F', '#FBFBF8');
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [b, h, a, k, step, target, mirror, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* keep the mirror toggle honest: relock it if we walk back before its step */
  useEffect(() => {
    if (!mirrorUnlocked && mirror) setMirror(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the tracer sweep — time-based (dt), opt-in, and respects reduced motion */
  useEffect(() => {
    if (!tracing) {
      tracerRef.current = null;
      draw();
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setTracing(false);
      return;
    }
    let raf;
    let start = null;
    const DURATION = 4200;
    const loop = (now) => {
      if (start == null) start = now;
      const u = Math.min(1, (now - start) / DURATION);
      tracerRef.current = u; // 0 → 1 across the visible arc
      draw();
      if (u < 1) raf = requestAnimationFrame(loop);
      else {
        tracerRef.current = null;
        setTracing(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tracing, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'b') setB(v);
    else if (key === 'h') setH(v);
    else if (key === 'a') setA(v);
    else setK(v);
    if (tracing) setTracing(false);
  };

  const onBaseChip = (val) => {
    setB(val);
    if (tracing) setTracing(false);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    hoverRef.current = {
      wx: WORLD.xmin + (cssX / rect.width) * (WORLD.xmax - WORLD.xmin),
      wy: WORLD.ymax - (cssY / rect.height) * (WORLD.ymax - WORLD.ymin),
    };
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const resetDials = () => {
    setB(START.b);
    setH(START.h);
    setA(START.a);
    setK(START.k);
    if (tracing) setTracing(false);
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

  const g = params;
  const behavior = a > 0 ? 'increasing ↗' : a < 0 ? 'decreasing ↘' : 'constant →';
  const xi = xIntercept(g);

  return (
    <div className="llab">
      <header className="head">
        <h1>Logarithmic Functions</h1>
        <p className="lede">
          A logarithm is an <span className="mono">exponent</span>: <span className="mono">log_b(x)</span>{' '}
          asks “<em>b</em> to what power gives <em>x</em>?” Each dial unlocks with the lesson, so you meet
          one idea at a time — the base, the inverse (its exponential mirror), the vertical-asymptote wall,
          the stretch and the shift — and finish by calibrating your curve onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <LogEquation q={params} />
            {!calib && (
              <p className="equation-sub mono">
                domain x &gt; {trim(h)} &nbsp;·&nbsp; asymptote x = {trim(h)} &nbsp;·&nbsp; base {baseLabel(b)}
              </p>
            )}
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">hover the curve to read a point</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Base b</span>
              <span className="fact-v mono">{trim(b)} — {baseName(b)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Domain</span>
              <span className="fact-v mono">x &gt; {trim(h)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Range</span>
              <span className="fact-v mono">all real y</span>
            </div>
            <div className="fact">
              <span className="fact-k">Behavior</span>
              <span className="fact-v">{behavior}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Anchors</span>
              <span className="fact-v mono">
                {ptStr(anchors(g)[0])} · {ptStr(anchors(g)[1])}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">x-intercept</span>
              <span className="fact-v mono">{xi == null ? '—' : `x = ${trim(xi)}`}</span>
            </div>
            <div className="fact wide">
              <span className="fact-k">Inverse (mirror across y = x)</span>
              <span className="fact-v mono">{inverseText(g)}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (tracing ? ' on' : '')}
              onClick={() => setTracing((t) => !t)}
            >
              {tracing ? 'Tracing…' : 'Trace the curve'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showMirror ? ' on' : '')}
              disabled={!mirrorUnlocked || calib}
              aria-pressed={showMirror}
              onClick={() => setMirror((m) => !m)}
            >
              {showMirror ? 'Hide inverse mirror' : 'Inverse mirror'}
            </button>
            <button type="button" className="btn ghost" onClick={resetDials}>
              Reset dials
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
              const val = { b, h, a, k }[d.key];
              return (
                <div className="dial-wrap" key={d.key}>
                  <label className={'dial' + (unlocked ? '' : ' locked')}>
                    <span className="dk">{d.label}</span>
                    <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                    <input
                      type="range"
                      min={d.min}
                      max={d.max}
                      step={d.step}
                      value={val}
                      disabled={!unlocked}
                      aria-label={`Dial ${d.label} — ${d.role}`}
                      onChange={(e) => onParam(d.key, e.target.value)}
                    />
                    <output className="dv">{unlocked ? trim(val) : '🔒'}</output>
                  </label>
                  {d.key === 'b' && unlocked && (
                    <div className="chips" role="group" aria-label="Quick base values">
                      {BASE_CHIPS.map((c) => (
                        <button
                          type="button"
                          key={c.key}
                          className={Math.abs(b - c.val) < 1e-9 ? 'chip on' : 'chip'}
                          aria-pressed={Math.abs(b - c.val) < 1e-9}
                          onClick={() => onBaseChip(c.val)}
                        >
                          <span className="chip-b">{c.label}</span>
                          <span className="chip-n">{c.note}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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

          {current.calib && target && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">target: base 2 / e / 10, asymptote ?, a ?, k ?</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
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
                  setMirror(false);
                  resetDials();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">y = a·log_b(x − h) + k</span> &nbsp;·&nbsp; the logarithm in standard form —
        base, asymptote, stretch and shift — plotted live from the dials, with its exponential inverse a
        reflection away across <span className="mono">y = x</span>.
      </footer>

      <style jsx>{`
        .llab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --mirror: #356b8a;
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
          max-width: 74ch;
        }
        .lede em {
          font-style: italic;
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 366px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 940px) {
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
          min-height: 46px;
          margin-bottom: 10px;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 8px 0 0;
        }
        .stage {
          position: relative;
          width: min(100%, 560px);
          aspect-ratio: 1 / 1;
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
          gap: 6px 18px;
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
        .fact.wide {
          grid-column: 1 / -1;
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 13px;
          font-variant-numeric: tabular-nums;
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
          grid-template-columns: 22px 1fr 52px;
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
          font-style: italic;
          font-size: 19px;
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          accent-color: var(--ink);
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
          font-size: 13.5px;
        }
        .chips {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin: 8px 0 0 32px;
        }
        .chip {
          font: 600 12px/1 system-ui, sans-serif;
          padding: 6px 4px;
          border: 1px solid rgba(28, 43, 58, 0.25);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .chip .chip-b {
          font-family: var(--serif);
          font-style: italic;
          font-size: 15px;
        }
        .chip .chip-n {
          font-size: 9.5px;
          letter-spacing: 0.02em;
          opacity: 0.8;
        }
        .chip.on {
          background: var(--ink);
          border-color: var(--ink);
          color: #fff;
        }
        .chip:not(.on):hover {
          border-color: var(--ink);
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
          gap: 10px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 11px;
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
        :global(.llab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chip {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
