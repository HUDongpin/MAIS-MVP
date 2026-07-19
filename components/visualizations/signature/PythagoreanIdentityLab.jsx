'use client';

/* ============================================================================
   PythagoreanIdentityLab — an interactive "bench" for THE PYTHAGOREAN
   IDENTITY: a budget of 1.  On the unit circle the hypotenuse of the radius
   triangle IS the radius, so Pythagoras reads cos²θ + sin²θ = 1 — the two
   squared shares spend the whole budget, exactly, at every corner.  The
   identity recovers a missing share's SIZE; only the quadrant can supply
   its SIGN.  (GRADES 9–12 · CCSS HSF-TF.C.8 — prove the Pythagorean
   identity and use it to find sin θ, cos θ, or tan θ given one of them and
   the quadrant of the angle.)

   THE SIGNATURE CENTERPIECE — "THE BUDGET BAR."  Under the circle runs a
   gold bar of length exactly 1.  At every posted corner the bar fills with
   two blocks — cos² in blue, sin² in carmine — and the blocks ALWAYS meet
   the end of the bar exactly: 16/25 + 9/25 = 25/25.  No gap, no overflow,
   no rounding: every posted corner is a primitive-triple point (4/5, 3/5),
   (12/13, 5/13), (15/17, 8/17), (24/25, 7/25), so the budget is checkable
   by hand in fraction arithmetic.

   THE MODEL — exact fraction arithmetic throughout:
     · fractions are [n, d] pairs with integer entries; sqF, oneMinusF, eqF
       and reduceF work by integer gcd — no float touches a value a student
       reads.
     · every corner's legs come from a primitive triple, and the audit
       re-proves a² + b² = c² for each, then the budget n²/d² + m²/d² = 1.
     · cosFromSin(sin, quad) recovers the missing share: the numerator of
       cos² must be a perfect square (sqrtInt by bounded search, THROWS
       otherwise), and the quadrant stamps the sign.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No corner fan, no ratio ledger, no steepness ladder — the triangle
       bench (G-SRT) owns quotients pinned by an acute corner; it is cited
       for the names sine and cosine and left alone.
     · No rearrangement proof — why a² + b² = c² is the rearrangement
       bench's theorem; this bench USES it on the radius triangle, with
       credit, and proves only the renaming.
     · No waves, no unwrapping, nothing periodic — the circular-function
       benches own the graphs; the unit-circle bench owns the turning
       story.  Here the circle is still scenery and the OBJECT is the bar.
     · No decimals anywhere — 0.6² + 0.8² = 1 teaches a fact about a
       calculator; 9/25 + 16/25 = 25/25 teaches a fact about arithmetic.
   COLORS: one accent. CARMINE = the sin² block and the filled identity
   (the object). GOLD = the budget bar frame (the tool). BLUE = the cos²
   block and quiet legs. GREEN only on correct answers and CALIBRATED.

   THE CALIBRATION — a sine and a quadrant are posted.  Rule cos² first
   (spend the rest of the budget), then rule cos θ itself with its sign
   (read the quadrant).  Truths are derived from the model at answer time;
   the meter is quantized to {0, 50, 100}; the signed share earns nothing
   until the budget stands.  The stamp provably cannot fire falsely.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================================================================
   MODEL — exact fraction arithmetic; nothing a student sees is floated.
   ========================================================================== */
const CARMINE = '#c81e4f';
const BLUE = '#3f74a6';
const GOLD = '#b98718';
const INK_HEX = '#243342';
const SLATE = '#5b6b7b';
const CALIB_STEP = 5;
const MINUS = '−'; /* U+2212 */

const gcdOf = (x, y) => {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
};
/* a fraction is [n, d], d > 0 */
const reduceF = ([n, d]) => {
  const g = gcdOf(n, d);
  return [n / g, d / g];
};
const sqF = ([n, d]) => [n * n, d * d];
const oneMinusF = ([n, d]) => reduceF([d - n, d]);
const addF = ([a, b], [c, d]) => reduceF([a * d + c * b, b * d]);
const eqF = (x, y) => {
  const [a, b] = reduceF(x);
  const [c, d] = reduceF(y);
  return a === c && b === d;
};
const fracText = ([n, d]) => (d === 1 ? fmtInt(n) : `${n < 0 ? MINUS : ''}${Math.abs(n)}/${d}`);
const fmtInt = (n) => (n < 0 ? MINUS + String(-n) : String(n));

/* the integer square root, by bounded search — throws on non-squares */
const sqrtInt = (n) => {
  for (let r = 0; r <= n; r++) {
    if (r * r === n) return r;
    if (r * r > n) break;
  }
  throw new Error('not a perfect square — every posted corner is a triple point');
};

/* signs by quadrant: cos then sin */
const QUAD_SIGNS = { 1: [1, 1], 2: [-1, 1], 3: [-1, -1], 4: [1, -1] };

/* recover cos from sin and the quadrant — size from the budget, sign from Q */
const cos2FromSin = (sin) => {
  const s2 = sqF(sin);
  return oneMinusF(s2); /* still an exact fraction */
};
const cosFromSin = (sin, quad) => {
  const [n2, d2] = cos2FromSin(sin);
  const b = sqrtInt(n2);
  const c = sqrtInt(d2);
  const sign = QUAD_SIGNS[quad][0];
  /* the posted sine must match its quadrant's sign */
  if (Math.sign(sin[0]) !== QUAD_SIGNS[quad][1]) throw new Error('the posted sine contradicts its quadrant');
  return [sign * b, c];
};

/* the lesson's exact corners (cos, sin), all primitive-triple points */
const CORNERS = {
  c345: { cos: [4, 5], sin: [3, 5] },
  c51213: { cos: [12, 13], sin: [5, 13] },
  c81517: { cos: [15, 17], sin: [8, 17] },
  c72425: { cos: [24, 25], sin: [7, 25] },
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted sine + quadrant; truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [
  { sin: [3, 5], quad: 1 },
  { sin: [3, 5], quad: 2 },
  { sin: [5, 13], quad: 2 },
  { sin: [8, 17], quad: 2 },
  { sin: [-7, 25], quad: 3 },
  { sin: [-7, 25], quad: 4 },
];
const SQ_CHIPS = ['16/25', '144/169', '225/289', '576/625'];
const COS_CHIPS = [MINUS + '24/25', MINUS + '15/17', MINUS + '12/13', MINUS + '4/5', '4/5', '24/25'];

const labelOf = (i) => `sin θ = ${fracText(CASES[i].sin)} · quadrant ${['I', 'II', 'III', 'IV'][CASES[i].quad - 1]}`;
const sqTruth = (i) => fracText(cos2FromSin(CASES[i].sin));
const cosTruth = (i) => fracText(cosFromSin(CASES[i].sin, CASES[i].quad));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, sPick, cPick) => {
  if (i == null) return [false, false];
  const c1 = sPick === sqTruth(i);
  const c2 = c1 && cPick === cosTruth(i);
  return [c1, c2];
};
const closeness = (i, sPick, cPick) => {
  const [c1, c2] = calibChecks(i, sPick, cPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, sPick, cPick) => calibChecks(i, sPick, cPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The radius triangle',
    body:
      'A unit circle, and the radius out to the point (4/5, 3/5). Drop the ' +
      'vertical: a right triangle with legs 4/5 and 3/5 — and a hypotenuse ' +
      'that is the radius itself, length exactly 1.',
    corner: 'c345',
    quad: 1,
    q: 'What does the rearrangement bench’s theorem say about THIS triangle?',
    choices: [
      '(4/5)² + (3/5)² = 1² — legs squared fill the hypotenuse’s square, which here is just 1',
      '4² + 3² = 5² — but only for whole-number sides',
      'Nothing; the theorem needs sides longer than 1',
    ],
    answer: 0,
    feedback:
      'The theorem never asked for whole sides: legs 4/5 and 3/5, hypotenuse 1, ' +
      'so (4/5)² + (3/5)² = 1. Run the fractions: 16/25 + 9/25 = 25/25. The ' +
      'budget bar below the circle fills exactly — no gap, no overflow — and ' +
      'that exactness is the whole show today.',
    note:
      'Why is the hypotenuse 1? Because it IS the radius — that is what "unit ' +
      'circle" purchases. Every point on the circle will hand us a right ' +
      'triangle with this same privileged hypotenuse. Set the radius to 1 once, ' +
      'and every later formula stops carrying an r around.',
  },
  {
    title: 'A budget that always balances',
    body:
      'New corner: (12/13, 5/13). Same drop, same bar: 144/169 + 25/169. Then ' +
      '(15/17, 8/17), then (24/25, 7/25). The bar fills exactly, every time.',
    corner: 'c51213',
    quad: 1,
    q: 'Why must the two squared shares always spend exactly 1?',
    choices: [
      'The hypotenuse is always the radius, always 1 — so the legs’ squares always split 1² between them',
      'Because these corners were specially chosen to work',
      'They only balance in the first quadrant',
    ],
    answer: 0,
    feedback:
      'No corner is special: whatever point the radius reaches, the right ' +
      'triangle it drops has hypotenuse 1, and the theorem forces the legs’ ' +
      'squares to total 1² = 1. The choice of triple points only makes the ' +
      'balance CHECKABLE by hand — 144/169 + 25/169 = 169/169 — not TRUE.',
    note:
      'This is a budget, not a coincidence: the horizontal share and vertical ' +
      'share compete for one radius. When one share grows, the other must ' +
      'shrink — squared shares trading pieces of the same single unit. Watch the ' +
      'bar as the corners change: the boundary between the blocks slides, but ' +
      'the total never budges from 1.',
  },
  {
    title: 'The renaming',
    body:
      'The triangle bench named the shares: the radius point’s horizontal ' +
      'coordinate is cos θ, the vertical is sin θ. Substitute those names.',
    corner: 'c345',
    quad: 1,
    q: 'What does the budget become under its new names?',
    choices: [
      'sin²θ + cos²θ = 1 — the Pythagorean identity is Pythagoras, renamed, on the radius triangle',
      'A brand-new law of trigonometry with its own proof',
      'sin θ + cos θ = 1',
    ],
    answer: 0,
    feedback:
      'Nothing new was proved in this step — that is the point. The most-used ' +
      'identity in trigonometry is the oldest theorem in geometry wearing ' +
      'function names: legs cos θ and sin θ, hypotenuse 1, squares totaling 1. ' +
      'An identity you can re-derive in one breath is one you can never forget — ' +
      'and one you can trust at corners far stranger than these.',
    note:
      'Beware the third choice: sin θ + cos θ = 1 fails at the very corner on ' +
      'screen — 3/5 + 4/5 = 7/5. It is the SQUARES that budget to 1; the bar ' +
      'is drawn in squared units for exactly this reason.',
  },
  {
    title: 'Recovering a lost share',
    body:
      'Suppose all you know is sin θ = 5/13. The budget forces cos²θ = 1 − ' +
      '25/169 = 144/169. So cos θ = 12/13 … or −12/13.',
    corner: 'c51213',
    quad: 2,
    q: 'The identity handed back two candidates. What is it missing?',
    choices: [
      'The quadrant — squaring erased the sign, so the budget recovers size but never direction',
      'Nothing; cos θ is always positive',
      'More decimal places',
    ],
    answer: 0,
    feedback:
      'cos² = 144/169 is satisfied by both 12/13 and −12/13, and the budget ' +
      'cannot tell them apart — squares forget signs. The missing information ' +
      'is geographic: WHERE is the angle? In quadrant II the horizontal share ' +
      'points left, so cos θ = −12/13, exactly.',
    note:
      'The same amnesia appeared on the radical bench: squaring is a one-way ' +
      'move, and what it forgets must be restored from outside. Here the ' +
      'outside information has a name — the quadrant — and posting it beside the ' +
      'given share is not a courtesy but a requirement of the arithmetic.',
  },
  {
    title: 'Four rooms, four sign pairs',
    body:
      'The dial carries the 3-4-5 corner around the circle: quadrant I, II, ' +
      'III, IV. The shares keep their sizes — 4/5 and 3/5 — and trade signs.',
    corner: 'c345',
    quad: 1,
    dial: true,
    q: 'In which quadrants could sin θ = +3/5 live?',
    choices: [
      'I and II only — sine is the vertical share, positive exactly in the upper half',
      'I and IV — sine follows the horizontal',
      'Any quadrant, with the right cosine',
    ],
    answer: 0,
    feedback:
      'Sine reads the vertical coordinate: positive upstairs (I and II), ' +
      'negative downstairs (III and IV). The budget is identical in all four ' +
      'rooms — 16/25 + 9/25 = 25/25 — which is precisely why the quadrant must ' +
      'be posted alongside any share you are given.',
    note:
      'Read the sign pairs off the dial: (+,+), (−,+), (−,−), (+,−) for ' +
      '(cos, sin) in rooms I through IV. Two bits of geography, four rooms — ' +
      'and the identity blind to all of them. Whatever survives squaring is ' +
      'the identity’s business; whatever does not is the quadrant’s.',
  },
  {
    title: 'The bookkeeper’s stamp',
    body:
      'A sine and its quadrant are posted. Spend the budget: rule cos²θ first — ' +
      'the exact fraction the budget has left after sin² is paid — then rule ' +
      'cos θ itself, sign and all, reading the quadrant for the direction. ' +
      'Both exact, or no stamp; the meter reports only how much of the ruling ' +
      'stands.',
    corner: 'c345',
    quad: 1,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PythagoreanIdentityLab() {
  const [quadDial, setQuadDial] = useState(1);
  const [sPick, setSPick] = useState(null);
  const [cPick, setCPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  /* the scene's exact shares, signed by quadrant */
  const base = calib && kase != null
    ? (() => {
        const s = CASES[kase].sin;
        const c = cosFromSin(CASES[kase].sin, CASES[kase].quad);
        return { cos: c, sin: s, quad: CASES[kase].quad };
      })()
    : (() => {
        const k = CORNERS[current.corner];
        const q = current.dial ? quadDial : current.quad;
        const [sc, ss] = QUAD_SIGNS[q];
        return { cos: [sc * k.cos[0], k.cos[1]], sin: [ss * k.sin[0], k.sin[1]], quad: q };
      })();
  const cos2 = sqF(base.cos);
  const sin2 = sqF(base.sin);
  const total = addF(cos2, sin2);

  const checks = calib ? calibChecks(kase, sPick, cPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, sPick, cPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, sPick, cPick) : false;

  const bandLabel = calib
    ? `posted: ${kase != null ? labelOf(kase) : ''}`
    : `the corner at (${fracText(base.cos)}, ${fracText(base.sin)})`;
  sceneRef.current = { ...base, cos2, sin2, total, calib, bandLabel };

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
    /* the circle (pixels only — the values on screen are exact fractions) */
    const cx = W / 2;
    const cy = bandH + (H2 - bandH - 120) / 2 + 10;
    const R = Math.min(W / 2 - 60, (H2 - bandH - 140) / 2);
    ctx.strokeStyle = SLATE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - R - 16, cy);
    ctx.lineTo(cx + R + 16, cy);
    ctx.moveTo(cx, cy - R - 16);
    ctx.lineTo(cx, cy + R + 16);
    ctx.stroke();
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.stroke();

    const px = cx + (S.cos[0] / S.cos[1]) * R;
    const py = cy - (S.sin[0] / S.sin[1]) * R;
    /* the legs */
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, cy);
    ctx.stroke();
    ctx.strokeStyle = CARMINE;
    ctx.beginPath();
    ctx.moveTo(px, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    /* the radius (the budget itself) */
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = CARMINE;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = px >= cx ? 'left' : 'right';
    ctx.textBaseline = py <= cy ? 'bottom' : 'top';
    ctx.fillText(`(${fracText(S.cos)}, ${fracText(S.sin)})`, px + (px >= cx ? 8 : -8), py + (py <= cy ? -8 : 8));

    /* THE BUDGET BAR */
    const barY = H2 - 74;
    const barX0 = 60;
    const barW = W - 120;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(barX0, barY, barW, 26);
    const cosFrac = (S.cos2[0] / S.cos2[1]) * barW;
    ctx.fillStyle = 'rgba(63,116,166,0.55)';
    ctx.fillRect(barX0, barY, cosFrac, 26);
    ctx.fillStyle = 'rgba(200,30,79,0.55)';
    ctx.fillRect(barX0 + cosFrac, barY, barW - cosFrac, 26);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = BLUE;
    ctx.textAlign = 'left';
    ctx.fillText(S.calib ? 'cos² ?' : `cos² = ${fracText(S.cos2)}`, barX0, barY + 32);
    ctx.fillStyle = CARMINE;
    ctx.textAlign = 'right';
    ctx.fillText(`sin² = ${fracText(S.sin2)}`, barX0 + barW, barY + 32);
    ctx.fillStyle = GOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      S.calib ? 'the budget: 1' : `${fracText(S.cos2)} + ${fracText(S.sin2)} = ${S.cos2[0] + S.sin2[0]}/${S.cos2[1]} = 1`,
      barX0 + barW / 2,
      barY - 6
    );

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
    setQuadDial(1);
    setSPick(null);
    setCPick(null);
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
    setQuadDial(1);
    setSPick(null);
    setCPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Budget ${sPick ?? 'unruled'}; cosine ${cPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `The corner at (${fracText(base.cos)}, ${fracText(base.sin)}), quadrant ${['I', 'II', 'III', 'IV'][base.quad - 1]}: cos² ${fracText(cos2)} plus sin² ${fracText(sin2)} equals ${fracText(total)}.`;

  return (
    <div className="pilab">
      <header className="head">
        <h1>The Pythagorean Identity: A Budget of 1</h1>
        <p className="lede">
          On the unit circle the hypotenuse IS the radius, so Pythagoras reads
          sin²θ + cos²θ = 1 — two squared shares spending one budget, exactly,
          at every corner. <em>The identity recovers a lost share’s size; only
          the quadrant can restore its sign</em>.
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

          {current.dial && !calib && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the quadrant</span>
                  <span className="dial-v mono">{['I', 'II', 'III', 'IV'][quadDial - 1]}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={quadDial}
                  onChange={(e) => setQuadDial(Number(e.target.value))}
                  aria-label={`Quadrant, ${quadDial}`}
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
                <span className="target-k">The posted share</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} cos², budgeted</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} cos θ, signed</li>
                </ol>
                <div className="declare" role="group" aria-label="Budget ruling">
                  {SQ_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (sPick === c2 ? ' active' : '')}
                      onClick={() => setSPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Cosine ruling">
                  {COS_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (cPick === c2 ? ' active' : '')}
                      onClick={() => setCPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the budget balances'
                    : checks[0]
                      ? 'budget spent — now read the quadrant’s sign'
                      : 'cos² = 1 − sin², in exact fractions'}
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
                  <span className="mono target-hint">the budget · then the sign</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setSPick(null);
                  setCPick(null);
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
                  setSPick(null);
                  setCPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">sin²θ + cos²θ = 1 · size from the budget, sign from the quadrant</span>{' '}
        &nbsp;·&nbsp; the oldest theorem in geometry, renamed on the radius triangle —
        and checkable by hand at every triple point.
      </footer>

      <style jsx>{`
        .pilab {
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
        :global(.pilab) :focus-visible {
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
