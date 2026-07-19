'use client';

/* ============================================================================
   NormalDistributionLab — an interactive "bench" for THE NORMAL DISTRIBUTION

        f(x) = 1 / (σ√(2π)) · e^( −(x − μ)² / (2σ²) )

   Built for MAIS (math AI system, www.mais.ac). Target band: US high-school
   Statistics & Probability — CCSS HSS-ID.A.4 ("use the mean and standard
   deviation of a data set to fit it to a normal distribution and to estimate
   population percentages… estimate areas under the normal curve") and the
   ubiquitous 68–95–99.7 (empirical) rule.

   House style: the interactive-math-bench standard — a quadrille-paper canvas,
   ONE carmine accent that IS the mathematical object (here the bell curve),
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter that stamps CALIBRATED.

   THE SIGNATURE CENTERPIECE — "area is probability, and the shape is fixed."
   A normal distribution has only two knobs: μ slides the center, σ sets the
   spread. Everything else is locked by the bell's rigid geometry, and the lab
   makes the two invariants you can SEE the stars of the show:

     • THE INFLECTION POINTS sit exactly at x = μ ± σ. So σ is not an abstract
       number — it is a distance you can point to on the picture: the horizontal
       gap from the center out to where the curve stops bending down and starts
       bending up. Move σ and watch those two points ride out or in with it.

     • THE 68–95–99.7 RULE. Shade the region within k standard deviations of the
       mean and its area — the share of all the data — is ALWAYS 68.3 % (k=1),
       95.4 % (k=2), 99.7 % (k=3), no matter what μ and σ you dial. The area is
       computed analytically (the error function), so the percentages are exact,
       and they never budge as you move the dials. That invariance is the whole
       point of standardizing with z = (x − μ)/σ, previewed here as a σ-ruler
       printed under the axis.

   The total area under any normal curve is exactly 1 (100 %): area = probability.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/NormalDistributionLab.jsx
     2. Import and render it:
          import NormalDistributionLab from './NormalDistributionLab';
          export default function Page() { return <NormalDistributionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (μ, σ, lesson step, …).
     MODEL  — f(x) and the area/erf helpers are pure math; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change (DPI-aware).
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. x spans [−6, 6] so a default N(0,1) sits with
   its whole ±3σ reach on screen; y runs a touch below 0 up to 0.86 so the
   tallest allowed bell (σ = 0.5, peak ≈ 0.798) still fits. The y-axis measures
   probability DENSITY (small decimals), so we grid it every 0.1 and label every
   0.2 — what matters here is AREA, not the height number.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -6, xmax: 6, ymin: -0.14, ymax: 0.86 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Just two dials, because a normal distribution has just
   two degrees of freedom. σ is kept strictly positive (min 0.5) — the density
   is undefined at σ = 0 (a spike of zero width) and would blow the peak past
   the top of the window well before then.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'mu', label: 'μ', min: -2, max: 2, step: 0.5, unlock: 1, role: 'mean · the center of the bell' },
  { key: 'sig', label: 'σ', min: 0.5, max: 2, step: 0.25, unlock: 2, role: 'standard deviation · the spread' },
];
const START = { mu: 0, sig: 1 };

const INFLECT_STEP = 3; // inflection points at μ±σ are named; σ becomes a distance
const AREA_STEP = 4; // area = probability; the first shaded band appears
const EMPIRICAL_STEP = 5; // the 68–95–99.7 rule; nested shells shown
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.
     pdf   — the normal probability density f(x).
     erf   — Gauss error function (Abramowitz & Stegun 7.1.26, |err| < 1.5e-7).
     Phi   — the standard-normal CDF Φ(z) = ½(1 + erf(z/√2)).
     areaBetween(a,b) = Φ((b−μ)/σ) − Φ((a−μ)/σ) — the probability in [a, b].
     bandArea(k)      = erf(k/√2)  — the area within ±kσ; note it depends ONLY
                        on k, not on μ or σ. That is the empirical rule's engine.
   ------------------------------------------------------------------------- */
const SQRT2 = Math.SQRT2;
const SQRT2PI = Math.sqrt(2 * Math.PI);

function pdf(x, p) {
  return Math.exp(-((x - p.mu) ** 2) / (2 * p.sig * p.sig)) / (p.sig * SQRT2PI);
}
const peakHeight = (sig) => 1 / (sig * SQRT2PI);

function erf(x) {
  const s = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}
const Phi = (z) => 0.5 * (1 + erf(z / SQRT2));
const areaBetween = (a, b, p) => Phi((b - p.mu) / p.sig) - Phi((a - p.mu) / p.sig);
const bandArea = (k) => erf(k / SQRT2); // area within ±kσ (μ,σ-independent)

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A construction goal disguised as a curve match: a
   mystery bell (hidden μ*, σ*) is drawn dashed-grey and the student rebuilds it
   from the clues (peak position → μ, width between inflection points → σ). The
   density is bounded, so a plain RMS over the window is stable — no clamping.
   Targets live on a well-centered sub-grid of the dials, so an exact match
   (RMS 0 → 100 % → CALIBRATED) is always reachable. The meter scale and stamp
   threshold below are the ones locked in by audit-normal.mjs: exact = 100 %,
   the closest wrong grid neighbour tops out near 77 %, and nothing but the true
   answer can ever stamp.
   ------------------------------------------------------------------------- */
const CALIB_SCALE = 0.042;
const MATCH_RMS = 0.002;
function rmsError(p, t) {
  const N = 200;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const d = pdf(x, p) - pdf(x, t);
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / CALIB_SCALE)));

const MU_TARGETS = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
const SIG_TARGETS = [0.75, 1, 1.25, 1.5, 1.75];
function makeTarget(prev) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let t;
  do {
    t = { mu: pick(MU_TARGETS), sig: pick(SIG_TARGETS) };
  } while (
    (prev && t.mu === prev.mu && t.sig === prev.sig) ||
    (t.mu === START.mu && t.sig === START.sig) // never hand back the start
  );
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions (σ changes the center; the curve "touches zero"; the
   percentages depend on the numbers). Next is gated on ANSWERED, not CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the bell curve',
    body:
      'So many measurements — heights, test scores, repeated readings — pile up in the same shape: a ' +
      'symmetric “bell.” Most values crowd near the middle; the further out you go, the rarer they get, ' +
      'and the two tails thin toward zero without ever quite reaching it. The single peak sits right at ' +
      'the average. This shape is the normal distribution.',
    q: 'On a normal (bell) curve, the values are most crowded…',
    choices: ['near the center (the mean)', 'out in the tails', 'spread evenly everywhere'],
    answer: 0,
    feedback:
      'The curve is tallest at the center, so that is where data is densest — the mean is also the median ' +
      'and the mode. Heights drop off symmetrically on both sides, so extreme values (far tails) are rare. ' +
      '“Tall = likely, low = rare” is how to read the height of a distribution.',
  },
  {
    title: 'μ — the mean (center)',
    body:
      'The first dial, μ (“mew”), is the mean. It marks the center of the bell — the peak, the axis of ' +
      'symmetry, and the balance point all at once. Slide μ and the entire curve glides left or right as ' +
      'one rigid piece: its shape never changes, only its position.',
    q: 'Changing μ (with σ fixed) does what to the curve?',
    choices: [
      'slides it sideways without changing its shape',
      'makes it taller and thinner',
      'tilts it to one side',
    ],
    answer: 0,
    feedback:
      'μ is a location knob: it translates the whole bell along the x-axis, peak and all, but leaves the ' +
      'width and height untouched. Because the curve is perfectly symmetric about μ, the mean equals the ' +
      'median equals the mode for every normal distribution.',
  },
  {
    title: 'σ — the standard deviation (spread)',
    body:
      'The second dial, σ (“sigma”), is the standard deviation — the spread. Small σ pulls the data into a ' +
      'tall, narrow spike close to the mean; large σ lets it fan out into a low, wide mound. Watch the peak ' +
      'trade height for width: it must, because the total area underneath always stays exactly 1.',
    q: 'A larger σ makes the bell…',
    choices: ['wider and shorter', 'narrower and taller', 'move to the right'],
    answer: 0,
    feedback:
      'σ is the spread knob. Bigger σ spreads the data out, so the curve gets wider — and because the area ' +
      'under it is fixed at 1, spreading wider forces it to get shorter. Smaller σ concentrates the data, ' +
      'giving a taller, narrower peak. σ changes the shape; μ (last step) only moved it.',
  },
  {
    title: 'Inflection points — σ you can see',
    body:
      'Here is σ made visible. Trace the curve down from the peak: at first it bends downward (concave ' +
      'down), then it straightens and starts bending upward (concave up) into the tail. The exact turning ' +
      'points of that bend — the inflection points, marked in teal — sit precisely one standard deviation ' +
      'from the mean, at x = μ − σ and x = μ + σ. So σ is a distance you can point to on the picture.',
    q: 'The two inflection points of a normal curve are located at…',
    choices: ['x = μ ± σ', 'x = μ ± 2σ', 'at the very peak, x = μ'],
    answer: 0,
    feedback:
      'The curvature flips exactly at x = μ ± σ. That gives σ a concrete geometric meaning: it is the ' +
      'horizontal distance from the center out to where the bell changes the way it curves. Move the σ ' +
      'dial and the two teal points slide out or in to stay one standard deviation from the peak.',
  },
  {
    title: 'Area = probability',
    body:
      'The height of the curve is a density, not a probability — probability lives in the AREA underneath. ' +
      'The total area under any normal curve is exactly 1, i.e. 100 % of the data. The area over an ' +
      'interval is the share of values that land there. The shaded band shows the area within one standard ' +
      'deviation of the mean; read its percentage in the band.',
    q: 'For any normal distribution, the total area under the curve is…',
    choices: ['exactly 1 (100% of the data)', 'equal to σ', 'bigger when σ is bigger'],
    answer: 0,
    feedback:
      'Every probability distribution encloses a total area of exactly 1 — it has to, since some value is ' +
      'certain to occur. So area is probability: the fraction of the region you shade is the fraction of ' +
      'the data in that range. Widening σ spreads that same unit of area thinner; it never adds more.',
  },
  {
    title: 'The 68–95–99.7 rule',
    body:
      'Now the headline. Shade within ±1σ of the mean and the area is 68.3 % of the data; within ±2σ it is ' +
      '95.4 %; within ±3σ it is 99.7 %. The remarkable part: these numbers never change. Slide μ, slide σ ' +
      '— the picture moves and reshapes, but the area within k standard deviations stays locked. Use the ' +
      'band buttons to check each one, and “All” to see the nested shells.',
    q: 'About what share of the data falls within TWO standard deviations of the mean?',
    choices: ['about 95%', 'about 68%', 'about 99.7%'],
    answer: 0,
    feedback:
      '≈ 68 % within ±1σ, ≈ 95 % within ±2σ, ≈ 99.7 % within ±3σ — the empirical rule. It holds for ' +
      'EVERY normal distribution because the area within ±kσ depends only on k, once you measure distance ' +
      'in standard deviations: z = (x − μ)/σ. That standardized ruler is printed under the axis.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery bell is drawn as a dashed grey curve. Tune μ and σ until your carmine ' +
      'curve lands exactly on top of it and the meter reads CALIBRATED. Read the clues from the picture: ' +
      'the peak sits above the mean μ, and the teal inflection marks are one σ out from that peak — so ' +
      'their gap is 2σ. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals, percents.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function fmt(v, dp = 2) {
  const f = Math.pow(10, dp);
  const n = Math.round(v * f) / f;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
const pct1 = (area) => (area * 100).toFixed(1) + '%';

/* EDIT 5 — Equation display. The general symbolic form stays fixed (it is the
   identity of the object); the live numbers ride underneath in the sub-line and
   the facts grid, which keeps the readout clean instead of cramming decimals
   into an exponent. */
function NormalEquation() {
  return (
    <span className="eq-main">
      f(x) =&nbsp;
      <span className="frac">
        <span className="fr-n">1</span>
        <span className="fr-d">
          σ√<span className="rad">2π</span>
        </span>
      </span>
      &nbsp;e<sup className="exp">{MINUS}(x{MINUS}μ)² / (2σ²)</sup>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function NormalDistributionLab() {
  const [mu, setMu] = useState(START.mu);
  const [sig, setSig] = useState(START.sig);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [band, setBand] = useState('off'); // 'off' | '1' | '2' | '3' | 'all'
  const [rulerOn, setRulerOn] = useState(false); // manual σ-ruler / inflection toggle

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // world-x under the pointer, or null
  const sceneRef = useRef({});

  const params = { mu, sig };
  const current = STEPS[step];
  const calib = !!current.calib;

  // Per-step display logic. Inflection marks + σ-ruler appear once σ has meaning;
  // bands are hidden during calibration to keep the match uncluttered.
  const showInflection = (step >= INFLECT_STEP && !calib) || rulerOn;
  const showRuler = (step >= INFLECT_STEP && !calib) || rulerOn;
  const activeBand = calib ? 'off' : band;

  // Snapshot everything the renderer needs so draw() (a stable callback) never
  // reads stale values.
  sceneRef.current = {
    mu,
    sig,
    calib,
    target,
    band: activeBand,
    showInflection,
    showRuler,
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
    const p = { mu: S.mu, sig: S.sig };
    const INK = '#1C2B3A';
    const SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F';
    const TEAL = '#2E7D9A';
    const PAPER = '#FBFBF8';
    const OK = '#1F8A5B';

    ctx.clearRect(0, 0, W, H);

    /* minor grid (quadrille paper): x every 1, y every 0.1 */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    for (let gx = Math.ceil(WORLD.xmin); gx <= WORLD.xmax; gx++) {
      const X = Math.round(sx(gx)) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let gy = 0; gy <= WORLD.ymax + 1e-9; gy += 0.1) {
      const Y = Math.round(sy(gy)) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    const y0 = sy(0);

    /* helpers ------------------------------------------------------------- */
    const inWinX = (x) => x >= WORLD.xmin && x <= WORLD.xmax;
    const clampX = (x) => Math.max(WORLD.xmin, Math.min(WORLD.xmax, x));

    // sample the curve one point per pixel; break when it leaves the window top
    const plot = (fn, stroke, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      let pen = false;
      for (let px = 0; px <= W; px++) {
        const x = WORLD.xmin + (px / W) * (WORLD.xmax - WORLD.xmin);
        const y = fn(x);
        if (!isFinite(y) || y > WORLD.ymax + 0.2) {
          pen = false;
          continue;
        }
        const X = sx(x);
        const Y = sy(y);
        if (!pen) {
          ctx.moveTo(X, Y);
          pen = true;
        } else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.restore();
    };

    // fill the area under a curve between world-x a and b (the shaded band)
    const fillBand = (a, b, fn, fill) => {
      const xa = clampX(a);
      const xb = clampX(b);
      const Xa = sx(xa);
      const Xb = sx(xb);
      ctx.save();
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(Xa, y0);
      for (let X = Xa; X <= Xb; X += 1) {
        const x = WORLD.xmin + (X / W) * (WORLD.xmax - WORLD.xmin);
        ctx.lineTo(X, sy(fn(x)));
      }
      ctx.lineTo(Xb, sy(fn(xb)));
      ctx.lineTo(Xb, y0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // a small paper-backed label so text stays readable over the grid/curve
    const paperLabel = (text, cx, cy, align, baseline, color, font) => {
      ctx.font = font || '12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      let by = cy;
      if (baseline === 'middle') by = cy - 7;
      else if (baseline === 'bottom') by = cy - 15;
      let bx = cx;
      if (align === 'center') bx = cx - tw / 2;
      else if (align === 'right') bx = cx - tw;
      ctx.fillStyle = 'rgba(251,251,248,0.88)';
      ctx.fillRect(bx - 3, by - 1, tw + 6, 16);
      ctx.fillStyle = color || INK;
      ctx.textAlign = align;
      ctx.textBaseline = 'top';
      ctx.fillText(text, cx, by);
    };

    /* ---- shaded probability bands (behind the curve) --------------------- */
    const drawShell = (k, fill) => {
      fillBand(p.mu - k * p.sig, p.mu + k * p.sig, (x) => pdf(x, p), fill);
    };
    if (S.band === 'all') {
      // nested shells: outermost first, so the center overlaps to the darkest tint
      drawShell(3, 'rgba(200,30,79,0.09)');
      drawShell(2, 'rgba(200,30,79,0.12)');
      drawShell(1, 'rgba(200,30,79,0.18)');
    } else if (S.band !== 'off') {
      drawShell(+S.band, 'rgba(200,30,79,0.17)');
    }

    /* ---- axes ------------------------------------------------------------ */
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y0) + 0.5);
    ctx.lineTo(W, Math.round(y0) + 0.5);
    const Xaxis = Math.round(sx(0)) + 0.5;
    ctx.moveTo(Xaxis, 0);
    ctx.lineTo(Xaxis, H);
    ctx.stroke();

    /* x tick labels (every 2 units) */
    ctx.fillStyle = 'rgba(91,107,123,0.95)';
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let gx = Math.ceil(WORLD.xmin / 2) * 2; gx <= WORLD.xmax; gx += 2) {
      if (gx === 0 || gx <= WORLD.xmin || gx >= WORLD.xmax) continue;
      ctx.fillText(String(gx), sx(gx), y0 + 4);
    }
    /* y tick labels (density, every 0.2) */
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = 0.2; gy <= WORLD.ymax + 1e-9; gy += 0.2) {
      ctx.fillText(gy.toFixed(1), sx(0) - 6, sy(gy));
    }
    paperLabel('density', sx(0) - 6, sy(WORLD.ymax) + 12, 'right', 'top', SOFT, '10px ui-monospace, monospace');

    /* ---- the σ-ruler: standardized ticks at μ + kσ (z = −3…3) ------------
       Drawn in its own lane BELOW the integer x-labels so the two never
       collide: a faint teal baseline, short ticks, and a ±kσ label under each. */
    if (S.showRuler) {
      const laneY = y0 + 20; // top of the label row (below the integer ticks)
      const baseY = y0 + 14;
      // find the on-screen extent of the ruler for its baseline
      const xl = clampX(p.mu - 3 * p.sig);
      const xr2 = clampX(p.mu + 3 * p.sig);
      ctx.save();
      ctx.strokeStyle = 'rgba(46,125,154,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx(xl), baseY);
      ctx.lineTo(sx(xr2), baseY);
      ctx.stroke();
      ctx.restore();
      for (let k = -3; k <= 3; k++) {
        const x = p.mu + k * p.sig;
        if (!inWinX(x)) continue;
        const X = sx(x);
        ctx.save();
        ctx.strokeStyle = k === 0 ? 'rgba(46,125,154,0.9)' : 'rgba(46,125,154,0.55)';
        ctx.lineWidth = k === 0 ? 1.8 : 1.2;
        ctx.beginPath();
        ctx.moveTo(X, baseY - 4);
        ctx.lineTo(X, baseY + 4);
        ctx.stroke();
        ctx.restore();
        const lbl = k === 0 ? 'μ' : (k > 0 ? '+' : MINUS) + Math.abs(k) + 'σ';
        ctx.fillStyle = k === 0 ? TEAL : 'rgba(46,125,154,0.85)';
        ctx.font = k === 0 ? '600 11px ui-monospace, monospace' : '10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(lbl, X, laneY);
      }
      // name the ruler once, at its right end
      ctx.fillStyle = 'rgba(46,125,154,0.7)';
      ctx.font = 'italic 10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      if (sx(xr2) < W - 60) ctx.fillText('z = (x−μ)/σ', sx(xr2) + 6, baseY);
      ctx.restore();
    }

    /* ---- mystery target curve (calibration only) — dashed grey ----------- */
    if (S.calib && S.target) {
      const t = S.target;
      plot((x) => pdf(x, t), 'rgba(91,107,123,0.85)', 2, [7, 6]);
      // target's mean line + inflection marks, as clues
      const Xt = sx(t.mu);
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.5)';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(Xt, y0);
      ctx.lineTo(Xt, sy(pdf(t.mu, t)));
      ctx.stroke();
      ctx.restore();
      for (const s of [-1, 1]) {
        const x = t.mu + s * t.sig;
        if (!inWinX(x)) continue;
        ctx.save();
        ctx.fillStyle = 'rgba(91,107,123,0.75)';
        ctx.beginPath();
        ctx.arc(sx(x), sy(pdf(x, t)), 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /* ---- the bell curve — the one carmine accent = the object ------------- */
    // a whisper of fill under the whole curve, so "area" always reads as the story
    fillBand(WORLD.xmin, WORLD.xmax, (x) => pdf(x, p), 'rgba(200,30,79,0.05)');
    plot((x) => pdf(x, p), CARMINE, 2.9);

    /* ---- band boundary verticals + the area percentage ------------------- */
    if (S.band !== 'off') {
      const ks = S.band === 'all' ? [1, 2, 3] : [+S.band];
      for (const k of ks) {
        for (const s of [-1, 1]) {
          const x = p.mu + s * p.sig * k;
          if (!inWinX(x)) continue;
          const X = sx(x);
          ctx.save();
          ctx.strokeStyle = 'rgba(200,30,79,0.5)';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(X, y0);
          ctx.lineTo(X, sy(pdf(x, p)));
          ctx.stroke();
          ctx.restore();
        }
      }
      // the area readout(s)
      if (S.band === 'all') {
        // label each shell's cumulative area near the top of its right edge
        const rows = [
          { k: 1, txt: '±1σ · 68.3%' },
          { k: 2, txt: '±2σ · 95.4%' },
          { k: 3, txt: '±3σ · 99.7%' },
        ];
        let ly = 16;
        for (const r of rows) {
          paperLabel(r.txt, 12, ly, 'left', 'top', CARMINE, '600 12px ui-monospace, monospace');
          ly += 18;
        }
      } else {
        const k = +S.band;
        const area = bandArea(k);
        const cx = sx(p.mu);
        const cy = sy(peakHeight(p.sig) * 0.42);
        paperLabel(
          `area = ${pct1(area)}`,
          cx,
          cy,
          'center',
          'middle',
          CARMINE,
          '700 14px ui-monospace, monospace'
        );
        paperLabel(
          `within ±${k}σ`,
          cx,
          cy + 15,
          'center',
          'middle',
          SOFT,
          '11px ui-monospace, monospace'
        );
      }
    }

    /* ---- peak (mean) marker + axis of symmetry --------------------------- */
    if (!S.calib || true) {
      const px0 = sx(p.mu);
      const pk = peakHeight(p.sig);
      const pyk = sy(pk);
      ctx.save();
      ctx.strokeStyle = 'rgba(200,30,79,0.35)';
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px0, y0);
      ctx.lineTo(px0, pyk);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.arc(px0, pyk, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      if (!S.calib && S.band === 'off') {
        paperLabel(`peak at μ = ${fmt(p.mu)}`, px0, pyk - 8, 'center', 'bottom', CARMINE);
      }
    }

    /* ---- inflection points at μ ± σ (σ made visible) --------------------- */
    if (S.showInflection) {
      for (const s of [-1, 1]) {
        const x = p.mu + s * p.sig;
        if (!inWinX(x)) continue;
        const X = sx(x);
        const Y = sy(pdf(x, p));
        ctx.save();
        ctx.fillStyle = TEAL;
        ctx.beginPath();
        ctx.arc(X, Y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }
      // one shared label above the right inflection point
      const xr = p.mu + p.sig;
      if (inWinX(xr) && S.band === 'off') {
        paperLabel('inflection · μ ± σ', sx(xr) + 8, sy(pdf(xr, p)) - 6, 'left', 'bottom', TEAL);
      }
    }

    /* ---- calibration legend (top-left) — only when the target shares the
       stage, so students can tell their carmine curve from the grey target. */
    if (S.calib && S.target) {
      const legend = [
        { t: 'your curve', c: CARMINE, dash: [] },
        { t: 'mystery target', c: SOFT, dash: [6, 5] },
      ];
      ctx.save();
      ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
      let yL = 16;
      for (const it of legend) {
        ctx.strokeStyle = it.c;
        ctx.lineWidth = 2.6;
        ctx.setLineDash(it.dash);
        ctx.beginPath();
        ctx.moveTo(14, yL);
        ctx.lineTo(34, yL);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = it.c;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.t, 39, yL);
        yL += 17;
      }
      ctx.restore();
    }

    /* ---- hover readout: a point on the curve + its z-score --------------- */
    const hx = hoverRef.current;
    if (hx != null && !S.calib) {
      const hy = pdf(hx, p);
      const X = sx(hx);
      const Y = sy(hy);
      const z = (hx - p.mu) / p.sig;
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.28)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(X, y0);
      ctx.lineTo(X, Y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(28,43,58,0.6)';
      ctx.beginPath();
      ctx.arc(X, Y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      const txt = `x = ${fmt(hx, 1)} · z = ${fmt(z, 2)}`;
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(txt).width;
      const bx = Math.min(Math.max(X + 8, 4), W - tw - 12);
      const by = Math.max(Y - 26, 4);
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      ctx.fillRect(bx - 4, by - 2, tw + 8, 18);
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(txt, bx, by);
      ctx.restore();
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [mu, sig, step, target, band, rulerOn, calib, showInflection, showRuler, draw]);

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

  /* auto-advance the shaded band as the lesson reaches the area steps, without
     locking the student out of the band buttons afterward */
  useEffect(() => {
    if (step === AREA_STEP) setBand('1');
    else if (step === EMPIRICAL_STEP) setBand('all');
    else if (step < AREA_STEP) setBand('off');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'mu') setMu(v);
    else setSig(v);
  };
  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    hoverRef.current = WORLD.xmin + (cssX / rect.width) * (WORLD.xmax - WORLD.xmin);
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };
  const resetDials = () => {
    setMu(START.mu);
    setSig(START.sig);
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

  const infl = [mu - sig, mu + sig];
  const spoken =
    `Normal distribution bell curve. Mean mu = ${fmt(mu)}, the center and peak. ` +
    `Standard deviation sigma = ${fmt(sig)}, the spread. Peak height ${fmt(peakHeight(sig), 3)}. ` +
    `Inflection points at ${fmt(infl[0])} and ${fmt(infl[1])}, one sigma from the mean. ` +
    `About 68 percent of the area lies within one sigma of the mean, 95 percent within two, ` +
    `99.7 percent within three.`;

  const BANDS = [
    { key: 'off', label: 'Off' },
    { key: '1', label: '±1σ · 68%' },
    { key: '2', label: '±2σ · 95%' },
    { key: '3', label: '±3σ · 99.7%' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="nlab">
      <header className="head">
        <h1>The Normal Distribution</h1>
        <p className="lede">
          The bell curve has just two knobs: <em>μ</em> slides its center, <em>σ</em> sets its spread.
          Explore <span className="mono">f(x)</span> one dial at a time, see the inflection points mark
          off <span className="mono">σ</span>, watch the <span className="mono">68–95–99.7</span> areas
          hold no matter what — then calibrate your curve onto a mystery bell.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <NormalEquation />
            </p>
            <p className="equation-sub mono">
              μ = {fmt(mu)} · σ = {fmt(sig)}
            </p>
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
            {!calib && <span className="hint mono">hover the curve → x &amp; z-score</span>}
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — your curve matches the mystery target.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Mean = Median = Mode</span>
              <span className="fact-v mono">μ = {fmt(mu)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Standard deviation</span>
              <span className="fact-v mono">σ = {fmt(sig)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Peak height</span>
              <span className="fact-v mono">1/(σ√2π) = {fmt(peakHeight(sig), 3)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Inflection points</span>
              <span className="fact-v mono">
                μ±σ = {fmt(infl[0])} &amp; {fmt(infl[1])}
              </span>
            </div>
            <div className="fact wide">
              <span className="fact-k">Empirical rule · area within 1, 2, 3 SD</span>
              <span className="fact-v mono">±1σ 68.3% &nbsp;·&nbsp; ±2σ 95.4% &nbsp;·&nbsp; ±3σ 99.7%</span>
            </div>
          </div>

          <div className="toolbar">
            <div className="seg" role="group" aria-label="Shade the area within k standard deviations">
              {BANDS.map((b) => (
                <button
                  type="button"
                  key={b.key}
                  className={'segbtn' + (activeBand === b.key ? ' on' : '')}
                  aria-pressed={activeBand === b.key}
                  disabled={calib || step < AREA_STEP}
                  onClick={() => setBand(b.key)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={'btn ghost' + (rulerOn ? ' on' : '')}
              onClick={() => setRulerOn((v) => !v)}
              aria-pressed={rulerOn}
              disabled={calib}
            >
              {showRuler ? 'σ-ruler on' : 'Show σ-ruler'}
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
              const val = { mu, sig }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
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
                  <output className="dv">{unlocked ? fmt(val) : '🔒'}</output>
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
                  <span className="mono target-hint">read the clues · μ, σ = ?</span>
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
                  setBand('off');
                  setRulerOn(false);
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
        <span className="mono">f(x) = 1/(σ√2π) · e^(−(x−μ)²/2σ²)</span> &nbsp;·&nbsp; the normal
        distribution — two dials, μ for center and σ for spread; area is probability, and 68–95–99.7% of
        it always lies within 1, 2, 3 standard deviations of the mean.
      </footer>

      <style jsx>{`
        .nlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --quad: #c7d8e4;
          --teal: #2e7d9a;
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
          font-family: var(--serif);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 350px;
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
        .eq-main {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          color: var(--curve);
          font-size: 17px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
        }
        .eq-main sup.exp {
          font-size: 0.72em;
          font-weight: 500;
        }
        .frac {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          vertical-align: middle;
          margin: 0 2px;
          line-height: 1.05;
        }
        .fr-n {
          padding: 0 4px;
        }
        .fr-d {
          padding: 1px 4px 0;
          border-top: 1.4px solid var(--curve);
        }
        .rad {
          border-top: 1.4px solid var(--curve);
          margin-left: 1px;
          padding: 0 1px;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 1.5 / 1;
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
          right: 10px;
          top: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.78);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        @media (hover: none), (max-width: 520px) {
          /* the hover readout is a pointer affordance — hide its hint on touch */
          .hint {
            display: none;
          }
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
        .fact.wide {
          grid-column: 1 / -1;
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
        }
        .seg {
          display: inline-flex;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          overflow: hidden;
        }
        .segbtn {
          font: 600 12px/1 system-ui, sans-serif;
          padding: 8px 10px;
          border: 0;
          border-right: 1px solid rgba(28, 43, 58, 0.14);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .segbtn:last-child {
          border-right: 0;
        }
        .segbtn.on {
          background: var(--curve);
          color: #fff;
        }
        .segbtn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
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
          background: var(--teal);
          border-color: var(--teal);
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
          grid-template-columns: 22px 1fr 48px;
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
          accent-color: var(--curve);
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
        :global(.nlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .segbtn,
          .meter-fill,
          .choice {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
