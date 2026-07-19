'use client';

/* ============================================================================
   ProbabilityLab — an interactive "bench" for PROBABILITY: chance is a NUMBER.
   A spinner is divided into N equal sectors, so every outcome is equally likely.
   Mark an EVENT (the outcomes you care about, carmine) and its probability is the
   simple ratio  P = favorable outcomes ÷ total outcomes = k / N.  That number
   lives on a fixed ruler from 0 (impossible) to 1 (certain).

   The thesis of the lab — its deepest, most beautiful truth — is the LAW OF LARGE
   NUMBERS: the theoretical probability k/N is exactly the number the EXPERIMENTAL
   relative frequency (hits ÷ spins) settles onto as you spin again and again.
   Two ways of knowing one number, and they agree.  A live convergence chart makes
   this visible: the wild early jitter of hits/spins homing in on the carmine P.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 7–8
   (CCSS 7.SP.C.5 "probability is a number 0–1 expressing likelihood"; 7.SP.C.7a
   "uniform probability model — equally likely outcomes"; 7.SP.C.6 "the long-run
   relative frequency approximates the probability").  Set N = 2 and it is a coin;
   N = 6 and it is a die; the ideas never change.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   controls that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.  Sibling
   of the DataLab (both live on a number/probability line and end in a build-to-a-
   target challenge).  The "one number, two linked pictures" signature, retuned:
     • the SPINNER (left) — N equal sectors, each an equally likely outcome; the
       favorable ones glow carmine.  This is the THEORETICAL picture: P = k/N.
     • the LONG-RUN CHART (bottom, revealed with the experiment step) — the
       experimental probability hits/spins, plotted against the number of spins on
       a log axis, jittering at first then hugging the carmine theoretical line.
       This is the EXPERIMENTAL picture, and its convergence IS the lab's thesis.
   A 0-to-1 ruler between them carries the carmine P marker and splits into the
   event (carmine, [0,P]) and its complement (gold, [P,1]) that sum to 1.

   One-accent discipline: CARMINE is the mathematical object the lab reveals — the
   PROBABILITY P: the favorable sectors, the P readout, the P marker on the ruler,
   the theoretical line on the chart, and the experimental trace converging to it.
   The secondary ideas keep their own quiet hues so they never fight the accent:
   the 0–1 SCALE is blue (structure/position), the COMPLEMENT is gold, the
   LONG-RUN experiment frame is slate.  Green is reserved for "correct"/"CALIBRATED".

   All probabilities are computed EXACTLY from integers, so a K-12 student never
   meets a float artefact like 0.30000000004:
     • outcomes are equal integer sectors, so P is the exact fraction k/N.
     • k/N is reduced by an integer gcd and rendered as an integer (0 or 1), an
       exact terminating decimal (by integer long division), or a clearly-marked
       "≈" 2-decimal rounding — never a raw float.
     • the complement identity  k/N + (N−k)/N = N/N = 1  is exact by construction.
     • calibration is an EXACT fraction match (k·Tden === Tnum·N), not a float
       compare, so 3/6, 6/12, 2/4 all count as hitting the target 1/2.
   The experiment uses honest uniform draws over the N outcomes; the estimator is
   unbiased (its expected value equals k/N exactly), which is why it converges.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ProbabilityLab.jsx
     2. Import and render it:
          import ProbabilityLab from './ProbabilityLab';
          export default function Page() { return <ProbabilityLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (N, the event set, which
              lenses are on, the lesson step, the experiment counters).
     MODEL  — the probabilities are exact integer arithmetic; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. The primary "dial" is N (how many equal sectors the
   spinner has); the EVENT is built by toggling outcomes; and each LENS unlocks
   one per lesson step, overlaying one idea on the picture — so the picture is
   never ahead of the idea. Small integer N keeps every probability classroom-
   clean and every sector legible.
   ------------------------------------------------------------------------- */
const NMIN = 2;
const NMAX = 12; // spinner has 2…12 equal sectors
const MAX_TRIALS = 2000; // cap on spins (bounds the convergence history)

// a friendly start: a 6-sector spinner (a die) with the "even" outcomes marked,
// so P = 3/6 = 1/2 — an even chance — the moment the event lens turns on.
const START_N = 6;
const START_EVENT = [2, 4, 6]; // outcome numbers 1…N that count as the event

const STEP_SPINNER = 0; // meet the spinner — equal sectors, equally likely
const STEP_EVENT = 1; // an event and its probability P = k/N
const STEP_SCALE = 2; // the 0-to-1 scale: impossible → certain
const STEP_COMPLEMENT = 3; // the complement: P(not A) = 1 − P(A)
const STEP_EXPERIMENT = 4; // spin many times — experimental probability (LLN)
const STEP_CALIB = 5; // build a spinner whose P matches a target (calibration)

// the lenses, unlocked as the lesson earns them
const LENSES = [
  { key: 'event', unlock: STEP_EVENT, color: '#c81e4f', name: 'Event', role: 'P = favorable ÷ total' },
  { key: 'scale', unlock: STEP_SCALE, color: '#3f74a6', name: '0-to-1 scale', role: 'impossible → certain' },
  { key: 'complement', unlock: STEP_COMPLEMENT, color: '#d9982b', name: 'Complement', role: 'P(not A) = 1 − P(A)' },
  { key: 'longrun', unlock: STEP_EXPERIMENT, color: '#5b6b7b', name: 'Long run', role: 'spin — the law of large numbers' },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. The probabilities, EXACT. Everything derives from the two
   integers k (favorable outcomes) and N (total outcomes); nothing here knows a
   pixel.  These helpers are shared with audit-probability.mjs verbatim.
   ------------------------------------------------------------------------- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}
function reduceFrac(num, den) {
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}
// exact terminating decimal for num/den by integer long division; guarded so a
// non-terminating fraction (caught earlier by terminates()) can never spin.
function longDivide(num, den) {
  const intPart = Math.floor(num / den);
  let rem = num % den;
  if (rem === 0) return String(intPart);
  let frac = '';
  let guard = 0;
  while (rem !== 0 && guard < 14) {
    rem *= 10;
    frac += Math.floor(rem / den);
    rem %= den;
    guard++;
  }
  return intPart + '.' + frac;
}
function terminates(den) {
  let d = den;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}
// round num/den to hundredths, formatted exactly (no float artefact)
function roundedHundredths(num, den) {
  const H = Math.round((num * 100) / den);
  const whole = Math.floor(H / 100);
  const frac = H % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}
// format an exact ratio: integer, exact decimal, or "≈" 2-dp rounding
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}

// the qualitative likelihood word — decided by EXACT integer comparison of 2k
// against N, so "even chance" means exactly k/N = 1/2, never a rounded 0.5.
function likelihoodWord(k, N) {
  if (k <= 0) return 'impossible';
  if (k >= N) return 'certain';
  if (2 * k < N) return 'unlikely';
  if (2 * k === N) return 'even chance';
  return 'likely';
}

// the full probability report for k favorable of N total, all exact
function computeProb(k, N) {
  const red = reduceFrac(k, N); // reduced fraction (k=0 → 0/1, k=N → 1/1)
  const dec = fmtRatio(k, N); // exact decimal or ≈ hundredths
  const pct = fmtRatio(100 * k, N); // exact percent or ≈ hundredths
  const comp = reduceFrac(N - k, N); // complement, reduced
  const word = likelihoodWord(k, N);
  // the "big" display form: 0, 1, or the reduced a/b
  let big;
  if (k <= 0) big = '0';
  else if (k >= N) big = '1';
  else big = red.num + '/' + red.den;
  return { k, N, red, dec, pct, comp, word, big };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to curve-
   matching): a target probability is fixed on the ruler as a carmine tick; the
   student builds ANY spinner — choose N, mark outcomes — whose P equals it
   exactly.  There are many correct answers (1/2 = 2/4 = 3/6 …), which is the
   point.  The meter reads closeness in probability units; CALIBRATED is an EXACT
   fraction hit (k·Tden === Tnum·N), never a float compare.
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 0.5; // probability-units spread across the match meter
const matchPercent = (k, N, T) =>
  N > 0 ? 100 * Math.max(0, 1 - Math.abs(k / N - T.num / T.den) / MATCH_SCALE) : 0;
const isCalibrated = (k, N, T) => N > 0 && k >= 0 && k * T.den === T.num * N;

// curated "nice" targets, all reachable with N ≤ 12 (choose N = den) and all
// with clean decimals/percents.  0 < T < 1 so the goal is always non-trivial.
const TARGETS = [
  { num: 1, den: 2 },
  { num: 1, den: 3 },
  { num: 2, den: 3 },
  { num: 1, den: 4 },
  { num: 3, den: 4 },
  { num: 1, den: 5 },
  { num: 2, den: 5 },
  { num: 3, den: 5 },
  { num: 1, den: 6 },
  { num: 5, den: 6 },
  { num: 3, den: 8 },
  { num: 1, den: 10 },
  { num: 7, den: 10 },
  { num: 5, den: 12 },
];
function makeTarget(prev) {
  let t;
  do {
    t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  } while (prev != null && t.num === prev.num && t.den === prev.den);
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display. The PROBABILITY is the star, in the carmine accent;
   the other views ride along as small chips as their lenses unlock.  Rendered by
   a CHILD component, so styles are INLINED (styled-jsx only scopes a component's
   own JSX) — this keeps the readout identical in Next.js and any plain preview.
   ------------------------------------------------------------------------- */
const CHIP_BASE = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function ProbEquation({ prob, showComplement, showExp, expText, trials }) {
  const { k, N, big, dec, pct, comp, word } = prob;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#5b6b7b', letterSpacing: '0.02em' }}>P =</span>
        <span
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '30px',
            fontWeight: 700,
            color: '#c81e4f',
            letterSpacing: '0.01em',
          }}
        >
          {big}
        </span>
      </span>
      <span style={{ ...CHIP_BASE, color: '#1c2b3a', background: 'rgba(28,43,58,0.08)' }}>
        {k} of {N}
      </span>
      <span style={{ ...CHIP_BASE, color: '#1c2b3a', background: 'rgba(28,43,58,0.08)' }}>
        {dec.approx ? '≈ ' : '= '}
        {dec.text}
      </span>
      <span style={{ ...CHIP_BASE, color: '#1c2b3a', background: 'rgba(28,43,58,0.08)' }}>
        {pct.approx ? '≈ ' : '= '}
        {pct.text}%
      </span>
      {showComplement && (
        <span style={{ ...CHIP_BASE, color: '#b07a17', background: 'rgba(217,152,43,0.14)' }}>
          not A = {comp.num}/{comp.den}
        </span>
      )}
      {showExp && trials > 0 && (
        <span style={{ ...CHIP_BASE, color: '#c81e4f', background: 'rgba(200,30,79,0.12)' }}>
          exp ≈ {expText} ({trials})
        </span>
      )}
      {!showComplement && !showExp && (
        <span style={{ ...CHIP_BASE, color: '#5b6b7b', background: 'rgba(91,107,123,0.10)' }}>{word}</span>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the lens unlocks with the step; the reveal
   lives in `feedback` (shown after answering); distractors are real probability
   misconceptions ("more sectors ⇒ more likely," "probability can be more than 1,"
   "the complement is the mode of the rest," "a run of misses makes a hit due").
   Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the spinner — equally likely',
    body:
      'This spinner is cut into N equal slices. Because every slice is the same size, every outcome ' +
      'is equally likely — the arrow has no reason to prefer one over another. Drag the “Outcomes” ' +
      'slider to change N. Two slices make a coin; six make a die. Equal slices are what makes the ' +
      'outcomes fair.',
    q: 'Why are the outcomes on this spinner equally likely?',
    choices: [
      'Because every slice is exactly the same size',
      'Because the numbers count up 1, 2, 3, …',
      'Because there are an even number of slices',
    ],
    answer: 0,
    feedback:
      'Equal SIZE is the whole reason. The arrow lands in proportion to area, so equal slices give ' +
      'equal chances. If one slice were bigger, that outcome would be more likely — the model would ' +
      'no longer be “uniform,” and P = k/N would not apply.',
  },
  {
    title: 'An event, and its probability',
    body:
      'An EVENT is a set of outcomes you care about — click the outcome chips (or the slices) to mark ' +
      'them carmine. The probability of the event is a simple ratio: how many outcomes are favorable, ' +
      'out of how many total.  P = favorable ÷ total = k ÷ N.  Nothing more.',
    q: 'On an 8-slice spinner you mark 3 slices. What is P?',
    choices: ['3/8 — favorable ÷ total', '8/3 — total ÷ favorable', '3 — the number of favorable slices'],
    answer: 0,
    feedback:
      'P = favorable ÷ total = 3 ÷ 8 = 3/8. Probability is always the favorable count OVER the total ' +
      'count, so it can never exceed 1. Flipping the ratio (8/3) or forgetting to divide (3) are the ' +
      'two most common slips.',
  },
  {
    title: 'The 0-to-1 scale',
    body:
      'Every probability lives on one ruler, from 0 to 1. P = 0 means impossible (no favorable ' +
      'slices); P = 1 means certain (every slice is favorable); P = 1/2 is an even chance. The carmine ' +
      'tick shows exactly where your event sits — closer to 1 is more likely, closer to 0 is less.',
    q: 'Which of these is NOT a possible probability?',
    choices: ['1.4 — it is greater than 1', '0 — impossible', '0.75 — likely'],
    answer: 0,
    feedback:
      'A probability can never exceed 1, because favorable outcomes can never outnumber the total. So ' +
      '1.4 is impossible as a probability. 0 (impossible) and 0.75 (likely) both sit on the 0-to-1 ruler; ' +
      '1.4 falls right off the end of it.',
  },
  {
    title: 'The complement — the rest of the whole',
    body:
      'The slices you did NOT mark form the COMPLEMENT, “not A.” Together the event and its complement ' +
      'are the whole spinner, so their probabilities add to 1:  P(A) + P(not A) = 1,  which rearranges ' +
      'to  P(not A) = 1 − P(A).  The gold part of the ruler is the complement; carmine + gold fills the ' +
      'whole bar.',
    q: 'If P(rain) = 1/4, what is P(no rain)?',
    choices: ['3/4 — because 1 − 1/4 = 3/4', '1/4 — the same as P(rain)', '4 — the reciprocal of 1/4'],
    answer: 0,
    feedback:
      'P(not A) = 1 − P(A) = 1 − 1/4 = 3/4. The event and its complement always fill the whole, so they ' +
      'must add to 1. This is often the fast way to a probability: find the easy side, then subtract ' +
      'from 1.',
  },
  {
    title: 'Spin it — the law of large numbers',
    body:
      'Theory says P = k/N. Now TEST it. Each spin is real: press Spin (or ×10, ×100) and count hits. ' +
      'The experimental probability is hits ÷ spins. Watch the chart: it lurches around at first, then ' +
      'settles onto the carmine theoretical line. More spins ⇒ closer. That convergence is the law of ' +
      'large numbers.',
    q: 'After 5 spins you have 4 hits (0.8) but P = 1/2. What should you expect as you keep spinning?',
    choices: [
      'The experimental value drifts back toward 1/2',
      'Misses are now “due,” so the next few must miss',
      'It stays near 0.8 — the spinner remembers the start',
    ],
    answer: 0,
    feedback:
      'The relative frequency converges to 1/2 as spins grow — not because misses are “owed” (the ' +
      'spinner has no memory: that is the gambler’s fallacy), but because a few early spins simply stop ' +
      'mattering once thousands pile up. Each spin is independent; the AVERAGE is what settles.',
  },
  {
    title: 'Build the target probability',
    body:
      'Final challenge. A carmine target tick is fixed on the ruler. Build a spinner whose ' +
      'probability lands exactly on it: choose N, then mark outcomes. Many spinners win — 1/2 is ' +
      '1 of 2, 2 of 4, 3 of 6… any equal fraction counts. CALIBRATED lights when your P equals ' +
      'the target exactly. “New target” deals a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ProbabilityLab() {
  const [N, setN] = useState(START_N);
  const [event, setEvent] = useState(() => new Set(START_EVENT)); // outcome numbers 1…N
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // calibration target fraction {num,den}
  const [lensOn, setLensOn] = useState({ event: false, scale: false, complement: false, longrun: false });
  const [exp, setExp] = useState({ trials: 0, hits: 0 }); // experiment counters (for DOM)
  const [lastOutcome, setLastOutcome] = useState(null); // { o, hit } of the most recent spin
  const [spinning, setSpinning] = useState(false); // a single animated spin is in flight

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({}); // spinner geometry, written by draw(), read by pointer handlers
  const sceneRef = useRef({}); // snapshot the renderer reads
  const histRef = useRef([]); // relative-frequency history (one entry per spin)
  const spinRef = useRef({ rot: -Math.PI / 2, anim: null }); // disk rotation + animation handle
  const expRef = useRef({ trials: 0, hits: 0 }); // live counters for the animation/batch loops

  const current = STEPS[step];
  const calib = !!current.calib;

  const k = event.size;
  const prob = computeProb(k, N);

  // effective (drawn) lenses — a lens only shows once its step is reached
  const eff = {
    event: lensOn.event && step >= STEP_EVENT,
    scale: lensOn.scale && step >= STEP_SCALE,
    complement: lensOn.complement && step >= STEP_COMPLEMENT,
    longrun: lensOn.longrun && step >= STEP_EXPERIMENT,
  };
  const showChart = eff.longrun;

  const targetFrac = calib && target != null ? target : null;
  const matchPct = targetFrac != null ? matchPercent(k, N, targetFrac) : 0;
  const calibrated = targetFrac != null ? isCalibrated(k, N, targetFrac) : false;

  // experimental probability, exact-ish for display (a genuine ratio hits/trials)
  const expText = exp.trials > 0 ? (exp.hits / exp.trials).toFixed(3) : '—';

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    N,
    event,
    prob,
    eff,
    showChart,
    calib,
    targetFrac,
    calibrated,
    lastOutcome,
    trials: exp.trials,
    hits: exp.hits,
    expText,
  };

  /* ---- outcome/probability → screen transform + full redraw from state ----- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const Wd = stage.clientWidth;
    const Hd = stage.clientHeight;
    if (Wd === 0 || Hd === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped for perf & crisp lines
    canvas.width = Math.round(Wd * dpr);
    canvas.height = Math.round(Hd * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept in one place so the drawing matches the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F'; // the PROBABILITY — favorable slices, P marker, theory line, trace
    const BLUE = '#3F74A6'; // the 0–1 SCALE
    const GOLD = '#D9982B'; // the COMPLEMENT
    const QUAD = '#C7D8E4';
    const SEC_A = '#eef3f7'; // neutral slice tints (alternating), so sectors read even when unmarked
    const SEC_B = '#dbe6ee';

    const S = sceneRef.current;
    ctx.clearRect(0, 0, Wd, Hd);

    /* faint quadrille backdrop behind everything */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    for (let gx = 0; gx <= Wd; gx += 22) {
      const X = Math.round(gx) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, Hd);
    }
    for (let gy = 0; gy <= Hd; gy += 22) {
      const Y = Math.round(gy) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(Wd, Y);
    }
    ctx.stroke();

    /* ---- regions -----------------------------------------------------------
       Wide canvas: spinner LEFT, ruler RIGHT, chart across the bottom.
       Narrow canvas (phones): everything STACKS — spinner, then ruler, then
       chart — so nothing is squeezed into a half-width column. The stage's
       aspect-ratio is taller on mobile (CSS) to make room for the stack.       */
    const pad = 16;
    const narrow = Wd < 520;
    const chartH = S.showChart ? Math.max(narrow ? 104 : 120, Math.round(Hd * (narrow ? 0.3 : 0.34))) : 0;
    const topH = Hd - chartH; // spinner (+ ruler, when wide) share the top band
    const showRuler = S.eff.scale; // ruler appears with the scale lens

    let spinCX;
    let spinCY;
    let spinR;

    if (showRuler && narrow) {
      // STACKED: spinner on top of a full-width ruler band
      const rulerBandH = 98;
      const spinBandH = topH - rulerBandH;
      spinCX = Math.round(Wd * 0.5);
      spinCY = Math.round(spinBandH * 0.46);
      spinR = Math.max(30, Math.min(Wd, spinBandH) * 0.5 - 24);
      drawSpinner(ctx, S, spinCX, spinCY, spinR, { INK, INK_SOFT, CARMINE, QUAD, SEC_A, SEC_B });
      geoRef.current = { spinCX, spinCY, spinR, N: S.N };
      const ry = spinBandH + Math.round(rulerBandH * 0.52);
      drawRuler(ctx, S, pad + 4, ry, Wd - 2 * (pad + 4), narrow, { INK, INK_SOFT, CARMINE, BLUE, GOLD });
    } else if (showRuler) {
      // WIDE: spinner left column, ruler right column
      const spinColW = Math.round(Wd * 0.5);
      spinCX = Math.round(spinColW * 0.5);
      spinCY = Math.round(topH * 0.5);
      spinR = Math.max(30, Math.min(spinColW, topH) * 0.5 - 30);
      drawSpinner(ctx, S, spinCX, spinCY, spinR, { INK, INK_SOFT, CARMINE, QUAD, SEC_A, SEC_B });
      geoRef.current = { spinCX, spinCY, spinR, N: S.N };
      const rx = spinColW + 8;
      const rw = Wd - rx - pad - 8;
      const ry = Math.round(topH * 0.5);
      drawRuler(ctx, S, rx, ry, rw, narrow, { INK, INK_SOFT, CARMINE, BLUE, GOLD });
    } else {
      // no ruler yet: spinner centered in the whole top band
      spinCX = Math.round(Wd * 0.5);
      spinCY = Math.round(topH * 0.5);
      spinR = Math.max(30, Math.min(Wd, topH) * 0.5 - 30);
      drawSpinner(ctx, S, spinCX, spinCY, spinR, { INK, INK_SOFT, CARMINE, QUAD, SEC_A, SEC_B });
      geoRef.current = { spinCX, spinCY, spinR, N: S.N };
    }

    /* ---- the long-run convergence chart (bottom band) ---------------------- */
    if (S.showChart) {
      drawChart(ctx, S, pad, topH + 6, Wd - 2 * pad, chartH - 14, narrow, histRef.current, {
        INK,
        INK_SOFT,
        CARMINE,
        QUAD,
      });
    }
  }, []);

  /* ======= drawing helpers (pure; read only their arguments) ============== */
  function drawSpinner(ctx, S, cx, cy, r, C) {
    const N = S.N;
    const Δ = (Math.PI * 2) / N;
    const rot = spinRef.current.rot; // live rotation (radians)
    const evt = S.event;
    const showFav = S.eff.event; // carmine highlight only once the event lens is on
    const showComp = S.eff.complement;

    // sectors
    for (let i = 0; i < N; i++) {
      const o = i + 1; // outcome number 1…N
      const a0 = -Math.PI / 2 + i * Δ + rot;
      const a1 = -Math.PI / 2 + (i + 1) * Δ + rot;
      const fav = evt.has(o);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      if (fav && showFav) {
        ctx.fillStyle = 'rgba(200,30,79,0.82)';
      } else if (!fav && showComp && showFav) {
        ctx.fillStyle = 'rgba(217,152,43,0.20)'; // complement tint (gold) when that lens is on
      } else {
        ctx.fillStyle = i % 2 ? C.SEC_B : C.SEC_A;
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(251,251,248,0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(28,43,58,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // outcome labels — drawn UPRIGHT in screen space at each slice's current spot
    const lr = r * 0.7;
    ctx.font = '700 ' + Math.max(11, Math.min(18, r * 0.13)).toFixed(0) + 'px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < N; i++) {
      const o = i + 1;
      const mid = -Math.PI / 2 + (i + 0.5) * Δ + rot;
      const lx = cx + lr * Math.cos(mid);
      const ly = cy + lr * Math.sin(mid);
      const fav = evt.has(o) && showFav;
      ctx.fillStyle = fav ? '#fff' : C.INK;
      ctx.fillText(String(o), lx, ly);
    }

    // hub
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(6, r * 0.09), 0, Math.PI * 2);
    ctx.fillStyle = C.INK;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // fixed pointer at the top, pointing down into the wheel
    const py = cy - r - 2;
    ctx.beginPath();
    ctx.moveTo(cx, py + 16);
    ctx.lineTo(cx - 10, py - 4);
    ctx.lineTo(cx + 10, py - 4);
    ctx.closePath();
    ctx.fillStyle = C.CARMINE;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // last-result readout under the wheel (experiment steps)
    if (S.lastOutcome != null) {
      const { o, hit } = S.lastOutcome;
      ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = hit ? C.CARMINE : C.INK_SOFT;
      ctx.fillText('landed on ' + o + ' — ' + (hit ? 'hit ✓' : 'miss'), cx, cy + r + 10);
    }
  }

  function drawRuler(ctx, S, x, y, w, narrow, C) {
    const P = S.prob.k / S.prob.N;
    const xOf = (p) => x + p * w;
    const barH = 14;

    // caption — sits above the P flag so the two never collide
    ctx.fillStyle = C.INK_SOFT;
    ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('the probability scale', x, y - barH / 2 - 42);

    // base bar
    ctx.fillStyle = 'rgba(28,43,58,0.10)';
    roundRect(ctx, x, y - barH / 2, w, barH, 7);
    ctx.fill();

    // event fill [0,P] carmine; complement [P,1] gold (only when complement lens on)
    if (S.eff.complement) {
      ctx.fillStyle = 'rgba(217,152,43,0.35)';
      roundRect(ctx, xOf(P), y - barH / 2, w - P * w, barH, 7);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(200,30,79,0.55)';
    roundRect(ctx, x, y - barH / 2, Math.max(0, P * w), barH, 7);
    ctx.fill();

    // ticks 0, 1/2, 1
    ctx.strokeStyle = C.BLUE;
    ctx.fillStyle = C.BLUE;
    ctx.lineWidth = 1.4;
    ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const ticks = [
      { p: 0, lab: '0' },
      { p: 0.5, lab: '½' },
      { p: 1, lab: '1' },
    ];
    for (const t of ticks) {
      const tx = xOf(t.p);
      ctx.beginPath();
      ctx.moveTo(tx + 0.5, y - barH / 2 - 4);
      ctx.lineTo(tx + 0.5, y + barH / 2 + 4);
      ctx.stroke();
      ctx.fillText(t.lab, tx, y + barH / 2 + 7);
    }
    // end words
    ctx.fillStyle = C.INK_SOFT;
    ctx.textAlign = 'left';
    ctx.fillText('impossible', x, y + barH / 2 + 22);
    ctx.textAlign = 'right';
    ctx.fillText('certain', x + w, y + barH / 2 + 22);

    // the carmine P marker
    const px = xOf(P);
    ctx.strokeStyle = C.CARMINE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(px, y - barH / 2 - 16);
    ctx.lineTo(px, y + barH / 2 + 2);
    ctx.stroke();
    // marker flag
    const lab = 'P = ' + S.prob.big;
    ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
    const tw = ctx.measureText(lab).width;
    const fw = tw + 12;
    const fx = Math.max(x, Math.min(x + w - fw, px - fw / 2));
    const fy = y - barH / 2 - 34;
    ctx.fillStyle = C.CARMINE;
    roundRect(ctx, fx, fy, fw, 18, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lab, fx + fw / 2, fy + 9.5);

    // calibration target tick (grey) during the challenge
    if (S.calib && S.targetFrac != null) {
      const T = S.targetFrac.num / S.targetFrac.den;
      const tx = xOf(T);
      ctx.strokeStyle = 'rgba(91,107,123,0.95)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(tx, y - barH / 2 - 16);
      ctx.lineTo(tx, y + barH / 2 + 16);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('target ' + S.targetFrac.num + '/' + S.targetFrac.den, tx, y + barH / 2 + 34);
    }
  }

  function drawChart(ctx, S, x, y, w, h, narrow, hist, C) {
    const P = S.prob.k / S.prob.N;
    const AX = Math.log10(MAX_TRIALS); // x-axis: log10(spins), 1 … MAX_TRIALS
    const xOf = (t) => x + (Math.log10(Math.max(1, t)) / AX) * w;
    const yOf = (p) => y + (1 - p) * h;

    // frame + caption (shortened on narrow canvases so it never overflows)
    ctx.fillStyle = C.INK_SOFT;
    ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      narrow ? 'long run — hits ÷ spins vs. spins' : 'long run — experimental probability (hits ÷ spins) vs. number of spins',
      x,
      y - 4
    );

    // y gridlines at 0, ½, 1
    ctx.strokeStyle = 'rgba(28,43,58,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const p of [0, 0.5, 1]) {
      const Y = Math.round(yOf(p)) + 0.5;
      ctx.moveTo(x, Y);
      ctx.lineTo(x + w, Y);
    }
    ctx.stroke();
    ctx.fillStyle = C.INK_SOFT;
    ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const p of [0, 0.5, 1]) ctx.fillText(p === 0.5 ? '½' : String(p), x - 4, yOf(p));

    // x gridlines/labels at powers of ten
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const t of [1, 10, 100, 1000]) {
      const X = Math.round(xOf(t)) + 0.5;
      ctx.strokeStyle = 'rgba(28,43,58,0.07)';
      ctx.beginPath();
      ctx.moveTo(X, y);
      ctx.lineTo(X, y + h);
      ctx.stroke();
      ctx.fillStyle = C.INK_SOFT;
      ctx.fillText(String(t), X, y + h + 4);
    }

    // the carmine theoretical line P = k/N
    const py = yOf(P);
    ctx.strokeStyle = C.CARMINE;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.CARMINE;
    ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = P > 0.85 ? 'top' : 'bottom';
    ctx.fillText('theory  P = ' + S.prob.big, x + w, P > 0.85 ? py + 3 : py - 3);

    // the experimental trace (downsampled to one point per x-pixel)
    if (hist.length > 0) {
      ctx.strokeStyle = 'rgba(200,30,79,0.9)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      let lastPx = -1;
      let started = false;
      for (let i = 0; i < hist.length; i++) {
        const X = xOf(i + 1);
        const rp = Math.round(X);
        if (rp === lastPx && i !== hist.length - 1) continue;
        lastPx = rp;
        const Y = yOf(hist[i]);
        if (!started) {
          ctx.moveTo(X, Y);
          started = true;
        } else {
          ctx.lineTo(X, Y);
        }
      }
      ctx.stroke();

      // moving end dot + current value
      const last = hist[hist.length - 1];
      const ex = xOf(hist.length);
      const ey = yOf(last);
      ctx.beginPath();
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = C.CARMINE;
      ctx.fill();
    } else {
      ctx.fillStyle = C.INK_SOFT;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        narrow ? 'Press Spin to gather data' : 'Press Spin to gather data — watch it approach the carmine line',
        x + w / 2,
        y + h / 2
      );
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [N, event, step, target, lensOn, exp, lastOutcome, spinning, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* auto-enable the lens that unlocks on this step (picture keeps pace) */
  useEffect(() => {
    const l = LENSES.find((x) => x.unlock === step);
    if (l) setLensOn((prev) => (prev[l.key] ? prev : { ...prev, [l.key]: true }));
  }, [step]);

  /* set up the calibration target the first time we reach it; start from a clean
     4-slice spinner with nothing marked so the build is clearly un-matched. */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setN(4);
      setEvent(new Set());
      resetExperiment();
      // focus the build: show the spinner + ruler, hide the experiment chart
      // (the student can re-enable "Long run" to spin-check if they wish)
      setLensOn((prev) => ({ ...prev, event: true, scale: true, longrun: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- experiment engine: honest uniform spins over the N outcomes -------- */
  const resetExperiment = () => {
    expRef.current = { trials: 0, hits: 0 };
    histRef.current = [];
    setExp({ trials: 0, hits: 0 });
    setLastOutcome(null);
  };

  // simulate `m` spins instantly (batch), recording running relative frequency
  const spinBatch = (m) => {
    const S = sceneRef.current;
    const NN = S.N;
    const evt = S.event;
    let { trials, hits } = expRef.current;
    let lastO = 0;
    let lastHit = false;
    const hist = histRef.current;
    const room = MAX_TRIALS - trials;
    const count = Math.min(m, room);
    for (let i = 0; i < count; i++) {
      const o = 1 + Math.floor(Math.random() * NN);
      const hit = evt.has(o);
      trials++;
      if (hit) hits++;
      hist.push(hits / trials);
      lastO = o;
      lastHit = hit;
    }
    if (count === 0) return;
    expRef.current = { trials, hits };
    // rest the disk on the last outcome so the wheel shows the final result
    const Δ = (Math.PI * 2) / NN;
    spinRef.current.rot = -(lastO - 0.5) * Δ;
    setExp({ trials, hits });
    setLastOutcome({ o: lastO, hit: lastHit });
  };

  // a single animated spin: pick the outcome, twirl the disk to it, then commit
  const spinOnce = () => {
    if (spinning) return;
    const S = sceneRef.current;
    const NN = S.N;
    if (expRef.current.trials >= MAX_TRIALS) return;
    const o = 1 + Math.floor(Math.random() * NN); // the honest uniform draw
    const hit = S.event.has(o);
    const Δ = (Math.PI * 2) / NN;
    const finalRot = -(o - 0.5) * Δ; // brings sector o under the top pointer

    const commit = () => {
      let { trials, hits } = expRef.current;
      trials++;
      if (hit) hits++;
      expRef.current = { trials, hits };
      histRef.current.push(hits / trials);
      spinRef.current.rot = finalRot;
      setExp({ trials, hits });
      setLastOutcome({ o, hit });
      setSpinning(false);
    };

    const wantsReduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (wantsReduce) {
      commit();
      draw();
      return;
    }

    // ease the rotation from its current value to finalRot + several full turns
    const startRot = spinRef.current.rot;
    const turns = 5 + Math.floor(Math.random() * 3);
    // normalize so we always spin forward by a positive amount
    let delta = finalRot + turns * Math.PI * 2 - startRot;
    delta = ((delta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) + turns * Math.PI * 2;
    const dur = 1200 + Math.random() * 400;
    const t0 = performance.now();
    setSpinning(true);
    const loop = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - u, 3); // easeOutCubic
      spinRef.current.rot = startRot + delta * ease;
      draw();
      if (u < 1) spinRef.current.anim = requestAnimationFrame(loop);
      else commit();
    };
    spinRef.current.anim = requestAnimationFrame(loop);
  };

  useEffect(() => {
    return () => {
      if (spinRef.current.anim) cancelAnimationFrame(spinRef.current.anim);
    };
  }, []);

  /* ---- interaction: click a slice to toggle it in/out of the event -------- */
  const toggleOutcome = (o) => {
    if (o < 1 || o > N) return;
    setEvent((prev) => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o);
      else next.add(o);
      return next;
    });
    resetExperiment(); // the probability changed — the old experiment is stale
  };

  const onCanvasClick = (e) => {
    if (spinning || step < STEP_EVENT) return; // slices become clickable with the event step
    const g = geoRef.current;
    if (!g.spinR) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dx = cx - g.spinCX;
    const dy = cy - g.spinCY;
    const dist = Math.hypot(dx, dy);
    if (dist > g.spinR || dist < g.spinR * 0.09) return; // outside the wheel or on the hub
    // which slice? invert the same transform used to draw (subtract live rot)
    const rot = spinRef.current.rot;
    let ang = Math.atan2(dy, dx) - rot + Math.PI / 2; // local angle from the top
    ang = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const i = Math.floor(ang / ((Math.PI * 2) / g.N));
    toggleOutcome(i + 1);
  };

  /* ---- N slider: prune the event to valid outcomes, reset the experiment -- */
  const changeN = (nextN) => {
    setN(nextN);
    setEvent((prev) => {
      const next = new Set();
      for (const o of prev) if (o <= nextN) next.add(o);
      return next;
    });
    resetExperiment();
    spinRef.current.rot = -Math.PI / 2;
  };

  /* ---- quick event presets ----------------------------------------------- */
  const markAll = () => {
    setEvent(new Set(Array.from({ length: N }, (_, i) => i + 1)));
    resetExperiment();
  };
  const markNone = () => {
    setEvent(new Set());
    resetExperiment();
  };

  const toggleLens = (key, unlock) => {
    if (step < unlock) return;
    setLensOn((prev) => ({ ...prev, [key]: !prev[key] }));
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
  const canSpin = eff.longrun && exp.trials < MAX_TRIALS && k >= 0;
  // before the event is introduced (step 0) the story is the UNIFORM MODEL: each
  // of the N equal outcomes has probability 1/N. The event/P readout waits for it.
  const perOutcome = computeProb(1, N);
  const showEvent = eff.event;

  /* spoken description (accessibility) */
  const spoken = !showEvent
    ? `A spinner with ${N} equal slices — ${N} equally likely outcomes, each with probability 1 over ${N}.`
    : `A spinner with ${N} equal slices. ` +
      `${k} ${k === 1 ? 'slice is' : 'slices are'} marked as the event. ` +
      `The probability is ${prob.big}${prob.dec.approx ? ', about ' + prob.dec.text : ''} — ${prob.word}. ` +
      (eff.complement ? `The complement, not A, has probability ${prob.comp.num} over ${prob.comp.den}. ` : '') +
      (eff.longrun && exp.trials > 0
        ? `After ${exp.trials} spins the experimental probability is about ${expText}.`
        : '');

  return (
    <div className="plab">
      <header className="head">
        <h1>Probability — How Likely Is It?</h1>
        <p className="lede">
          Chance is a <em>number</em>. Cut a spinner into equal slices, mark the outcomes you care about,
          and the probability is just a ratio: <span className="mono">favorable ÷ total</span>. Then{' '}
          <em>spin it hundreds of times</em> and watch the experimental results settle onto that exact
          number — the <em>law of large numbers</em>. Each lens unlocks with the lesson, so the picture is
          never ahead of the idea.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              {showEvent ? (
                <ProbEquation
                  prob={prob}
                  showComplement={eff.complement}
                  showExp={eff.longrun}
                  expText={expText}
                  trials={exp.trials}
                />
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 600 }}>
                    {N} equally likely outcomes
                  </span>
                  <span style={{ ...CHIP_BASE, color: '#c81e4f', background: 'rgba(200,30,79,0.12)' }}>
                    each = 1/{N}
                  </span>
                </span>
              )}
            </p>
            <p className="equation-sub mono">
              {!showEvent ? (
                <>
                  a uniform model: every slice has the same probability, 1 ÷ {N}
                  {perOutcome.dec.approx ? ' ≈ ' : ' = '}
                  {perOutcome.dec.text}
                </>
              ) : eff.complement ? (
                <>
                  {prob.k}/{N} + {N - prob.k}/{N} = 1 &nbsp;·&nbsp; event + complement = whole
                </>
              ) : (
                <>P = favorable ÷ total = {prob.k} ÷ {N}</>
              )}
            </p>
          </div>

          <div
            className={'stage' + (showChart ? ' has-chart' : '')}
            ref={stageRef}
            onClick={onCanvasClick}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            {!showChart && (
              <span className="hint mono">
                {step < STEP_EVENT ? 'drag the Outcomes slider to change N' : 'click a slice to add / remove it from the event'}
              </span>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — your probability equals the target of ${target.num}/${target.den}.` : ''}
          </p>

          <div className="facts">
            {showEvent ? (
              <>
                <div className="fact">
                  <span className="fact-k">Probability</span>
                  <span className="fact-v mono carm big">{prob.big}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">As a decimal</span>
                  <span className="fact-v mono">{prob.dec.approx ? '≈ ' : ''}{prob.dec.text}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">As a percent</span>
                  <span className="fact-v mono">{prob.pct.approx ? '≈ ' : ''}{prob.pct.text}%</span>
                </div>
                <div className="fact">
                  <span className="fact-k">In words</span>
                  <span className="fact-v mono">{prob.word}</span>
                </div>
              </>
            ) : (
              <>
                <div className="fact">
                  <span className="fact-k">Total outcomes</span>
                  <span className="fact-v mono big">{N}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Each outcome</span>
                  <span className="fact-v mono carm">1/{N}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">As a decimal</span>
                  <span className="fact-v mono">{perOutcome.dec.approx ? '≈ ' : ''}{perOutcome.dec.text}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Model</span>
                  <span className="fact-v mono">uniform</span>
                </div>
              </>
            )}
          </div>

          {/* N dial */}
          <div className="dial">
            <label className="dial-lab" htmlFor="nslider">
              Outcomes <span className="mono">N = {N}</span>
            </label>
            <input
              id="nslider"
              type="range"
              min={NMIN}
              max={NMAX}
              step={1}
              value={N}
              onChange={(e) => changeN(parseInt(e.target.value, 10))}
            />
            <span className="dial-hint mono">
              {N === 2 ? 'a coin' : N === 6 ? 'a die' : N + ' equal slices'}
            </span>
          </div>

          {/* event outcome chips — appear once the event idea is introduced */}
          {step >= STEP_EVENT && (
          <div className="chips" role="group" aria-label="Outcomes — click to mark the event">
            <span className="chips-lab mono">event:</span>
            {Array.from({ length: N }, (_, i) => i + 1).map((o) => {
              const on = event.has(o);
              return (
                <button
                  key={o}
                  type="button"
                  className={'chip' + (on ? ' on' : '')}
                  onClick={() => toggleOutcome(o)}
                  aria-pressed={on}
                >
                  {o}
                </button>
              );
            })}
            <button type="button" className="chip mini" onClick={markAll} disabled={k === N}>
              all
            </button>
            <button type="button" className="chip mini" onClick={markNone} disabled={k === 0}>
              none
            </button>
          </div>
          )}

          {/* experiment controls (appear with the long-run step) */}
          {eff.longrun && (
            <div className="toolbar">
              <button type="button" className="btn" onClick={spinOnce} disabled={!canSpin || spinning}>
                {spinning ? 'Spinning…' : 'Spin'}
              </button>
              <button type="button" className="btn ghost" onClick={() => spinBatch(10)} disabled={!canSpin || spinning}>
                Spin ×10
              </button>
              <button type="button" className="btn ghost" onClick={() => spinBatch(100)} disabled={!canSpin || spinning}>
                Spin ×100
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={resetExperiment}
                disabled={exp.trials === 0 || spinning}
              >
                Reset trials
              </button>
              <span className="trial-read mono">
                {exp.trials > 0 ? `${exp.hits} hits / ${exp.trials} spins = ${expText}` : 'no spins yet'}
                {exp.trials >= MAX_TRIALS ? ' · max' : ''}
              </span>
            </div>
          )}
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

          <div className="lenses" role="group" aria-label="Idea lenses">
            {LENSES.map((l) => {
              const unlocked = step >= l.unlock;
              const on = unlocked && lensOn[l.key];
              return (
                <button
                  type="button"
                  key={l.key}
                  className={'lens' + (on ? ' on' : '') + (!unlocked ? ' locked' : '')}
                  style={on ? { borderColor: l.color, boxShadow: `inset 0 0 0 1px ${l.color}` } : undefined}
                  onClick={() => toggleLens(l.key, l.unlock)}
                  disabled={!unlocked}
                  aria-pressed={on}
                >
                  <span className="lk" style={{ background: l.color }} aria-hidden="true" />
                  <span className="lname">{l.name}</span>
                  <span className="lrole">{unlocked ? l.role : 'unlocks soon'}</span>
                  <span className="lstate mono" aria-hidden="true">
                    {!unlocked ? '🔒' : on ? 'on' : 'off'}
                  </span>
                </button>
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

          {current.calib && target != null && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: matchPct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{matchPct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    aim P at {target.num}/{target.den}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setN(4);
                  setEvent(new Set());
                  resetExperiment();
                  spinRef.current.rot = -Math.PI / 2;
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
                  setLensOn({ event: false, scale: false, complement: false, longrun: false });
                  setN(START_N);
                  setEvent(new Set(START_EVENT));
                  resetExperiment();
                  spinRef.current.rot = -Math.PI / 2;
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">
          P(event) = favorable ÷ total &nbsp;·&nbsp; 0 ≤ P ≤ 1 &nbsp;·&nbsp; P(not A) = 1 − P(A)
        </span>{' '}
        &nbsp;·&nbsp; the experimental probability (hits ÷ spins) approaches P as spins grow — the law of large
        numbers (CCSS 7.SP.C.5–7). Outcomes here are equally likely; the same ideas extend to any chance model.
      </footer>

      <style jsx>{`
        .plab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --scale: #3f74a6;
          --comp: #d9982b;
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
          margin: 0;
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
          cursor: pointer;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* the convergence chart appears with the experiment step — grow the box */
        .stage.has-chart {
          aspect-ratio: 8 / 7;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 3 / 4;
          }
          .stage.has-chart {
            aspect-ratio: 3 / 5;
          }
          /* on mobile the ruler/chart fill the canvas, so the floating hint
             would overlap them; the chips row below already guides tapping */
          .hint {
            display: none;
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
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 8px 16px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 620px) {
          .facts {
            grid-template-columns: 1fr 1fr;
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
          font-size: 16px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.big {
          font-size: 20px;
        }
        .fact-v.carm {
          color: var(--curve);
          font-weight: 700;
        }
        .dial {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 14px 4px 2px;
          flex-wrap: wrap;
        }
        .dial-lab {
          font-size: 13px;
          font-weight: 600;
          min-width: 116px;
        }
        .dial input[type='range'] {
          flex: 1;
          min-width: 140px;
          accent-color: var(--curve);
          height: 4px;
        }
        .dial-hint {
          font-size: 12px;
          color: var(--ink-soft);
          min-width: 78px;
          text-align: right;
        }
        .chips {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin: 12px 4px 2px;
        }
        .chips-lab {
          font-size: 12px;
          color: var(--ink-soft);
          margin-right: 2px;
        }
        .chip {
          font: 700 13px/1 var(--mono);
          min-width: 30px;
          padding: 7px 9px;
          border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.22);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s, color 0.12s;
        }
        .chip.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .chip.mini {
          font-size: 11px;
          font-weight: 600;
          color: var(--ink-soft);
          min-width: 0;
          padding: 7px 8px;
        }
        .chip:not(:disabled):hover {
          border-color: var(--ink);
        }
        .chip:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .toolbar {
          margin: 14px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .trial-read {
          font-size: 12px;
          color: var(--ink-soft);
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
        .lenses {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 4px;
        }
        @media (max-width: 400px) {
          .lenses {
            grid-template-columns: 1fr;
          }
        }
        .lens {
          display: grid;
          grid-template-columns: 12px 1fr auto;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 1px 8px;
          text-align: left;
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.18);
          border-radius: 9px;
          background: var(--paper);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, opacity 0.15s;
        }
        .lens:not(:disabled):hover {
          border-color: var(--ink);
        }
        .lens.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .lens.on {
          background: #fff;
        }
        .lk {
          grid-row: 1 / 3;
          grid-column: 1;
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .lname {
          grid-column: 2;
          grid-row: 1;
          font-weight: 700;
          font-size: 13px;
        }
        .lrole {
          grid-column: 2;
          grid-row: 2;
          font-size: 10.5px;
          color: var(--ink-soft);
        }
        .lstate {
          grid-column: 3;
          grid-row: 1 / 3;
          font-size: 11px;
          font-weight: 700;
          color: var(--ink-soft);
        }
        .lens.on .lstate {
          color: var(--curve);
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
        :global(.plab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .lens,
          .chip {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
