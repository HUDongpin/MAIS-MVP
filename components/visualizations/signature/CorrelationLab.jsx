'use client';

/* ============================================================================
   CorrelationLab — an interactive "bench" for THE CORRELATION COEFFICIENT:
   the sign tally and the share.  Split r into its two honest parts: the
   DIRECTION, read off a quadrant tally around the mean-cross (each point
   contributes the sign of dx·dy), and the STRENGTH, carried as r² — an
   exact rational on this bench, because every posted data set is engineered
   over x = 1..5.  And the punchline r's critics never let go of: a flawless
   parabola scores r² = 0, because r speaks only of LINES.  (GRADES 9–12 ·
   CCSS S-ID.C.8 — compute (using technology) and interpret the correlation
   coefficient of a linear fit.)

   THE SIGNATURE CENTERPIECE — "THE MEAN-CROSS AND THE TALLY."  A carmine
   cross pins (x̄, ȳ).  It cuts the paper into four rooms; points in the
   NE and SW rooms vote positive (dx·dy > 0), NW and SE vote negative, and
   points on the cross abstain.  The gold share line then prints the exact
   strength: r² = (Σdx·dy)² / (Σdx²·Σdy²), reduced — 1 for the perfect
   line, 121/125 for the tight cloud, 4/15 for the loose one, 0 for the
   parabola that never misses its own curve.

   THE MODEL — exact integer/rational arithmetic throughout:
     · every set rides x = 1..5 (mean exactly 3) with integer y summing to
       a multiple of 5, so both means are integers and every deviation is
       an integer.
     · tallyOf counts positive, negative, and abstaining products;
       sumOf(dx·dy), Σdx², Σdy² are integers; r2Of reduces the square by
       gcd — r itself is never floated, and its SIGN is the tally's sign.
     · the audit recomputes every posted r² against brute sums and proves
       sign(Σdxdy) = the tally's majority for every posted set, plus the
       two showpieces: r² = 1 twice (up and down), r² = 0 twice (the
       abstainers' set and the perfect parabola).

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No verdicts about WHY — the lurking-variable bench owns the gap
       between association and mechanism; this bench never says one thing
       drives another, only that dots follow a line loosely or tightly.
     · No spread-rulers, no gap-counting — the two-piles bench owns
       comparing groups; these dots are pairs, not piles.
     · No fitted line is drawn or solved — the line-fitting story belongs
       to its own bench; r here judges line-likeness without ever
       producing the line.
     · No slope reading: r is NOT a slope — the perfect lines y = 2x and
       y = x would both score r² = 1; steepness is the line bench's number.
   COLORS: one accent. CARMINE = the mean-cross and the sign (the object).
   GOLD = the share line r² (the tool). BLUE = the quiet dots. GREEN only
   on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a data set is posted on the cross.  Rule the direction
   first (the tally's sign), then rule the strength r² as an exact fraction.
   Truths are derived from tallyOf/r2Of at answer time; the meter is
   quantized to {0, 50, 100}; the strength earns nothing until the sign
   stands.  The stamp provably cannot fire falsely.
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
const MINUS = '−'; /* U+2212 */

const fmtInt = (n) => (n < 0 ? MINUS + String(-n) : String(n));
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

/* every set rides x = 1..5; y is engineered so ȳ is an integer */
const X = [1, 2, 3, 4, 5];
const SETS = {
  line: { label: 'the perfect line', y: [2, 4, 6, 8, 10] },
  down: { label: 'the perfect fall', y: [10, 8, 6, 4, 2] },
  tight: { label: 'the tight cloud', y: [2, 3, 6, 9, 10] },
  loose: { label: 'the loose cloud', y: [4, 7, 3, 9, 7] },
  scatter: { label: 'the no-story cloud', y: [6, 9, 3, 3, 9] },
  curve: { label: 'the perfect parabola', y: [4, 1, 0, 1, 4] },
};

const meanOf = (arr) => {
  const s = arr.reduce((t, v) => t + v, 0);
  if (s % arr.length !== 0) throw new Error('every posted mean is an integer');
  return s / arr.length;
};
const devsOf = (arr) => {
  const m = meanOf(arr);
  return arr.map((v) => v - m);
};
/* the tally: signs of dx·dy, room by room */
const tallyOf = (key) => {
  const dx = devsOf(X);
  const dy = devsOf(SETS[key].y);
  let plus = 0;
  let minus = 0;
  let abstain = 0;
  for (let i = 0; i < dx.length; i++) {
    const p = dx[i] * dy[i];
    if (p > 0) plus++;
    else if (p < 0) minus++;
    else abstain++;
  }
  return { plus, minus, abstain };
};
const sums = (key) => {
  const dx = devsOf(X);
  const dy = devsOf(SETS[key].y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < dx.length; i++) {
    sxy += dx[i] * dy[i];
    sxx += dx[i] * dx[i];
    syy += dy[i] * dy[i];
  }
  return { sxy, sxx, syy };
};
/* the direction: the sign of Σdx·dy */
const signOf = (key) => {
  const { sxy } = sums(key);
  return sxy > 0 ? 'positive' : sxy < 0 ? 'negative' : 'zero';
};
/* the strength: r² = (Σdxdy)² / (Σdx²·Σdy²), an exact reduced fraction */
const r2Of = (key) => {
  const { sxy, sxx, syy } = sums(key);
  if (syy === 0) throw new Error('a flat set has no y-spread to correlate');
  const n = sxy * sxy;
  const d = sxx * syy;
  const g = gcdOf(n, d);
  return [n / g, d / g];
};
const fracText = ([n, d]) => (d === 1 ? String(n) : `${n}/${d}`);

/* ---------------------------------------------------------------------------
   CALIBRATION — posted sets; truths derived from the tally and the share.
   ------------------------------------------------------------------------- */
const CASES = ['line', 'down', 'tight', 'loose', 'scatter', 'curve'];
const SIGN_CHIPS = ['positive', 'negative', 'zero'];
const R2_CHIPS = ['0', '4/15', '121/125', '1'];

const labelOf = (i) => SETS[CASES[i]].label;
const signTruth = (i) => signOf(CASES[i]);
const r2Truth = (i) => fracText(r2Of(CASES[i]));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, sPick, rPick) => {
  if (i == null) return [false, false];
  const c1 = sPick === signTruth(i);
  const c2 = c1 && rPick === r2Truth(i);
  return [c1, c2];
};
const closeness = (i, sPick, rPick) => {
  const [c1, c2] = calibChecks(i, sPick, rPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, sPick, rPick) => calibChecks(i, sPick, rPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The mean-cross',
    body:
      'Five paired measurements: x = 1..5 against y = 2, 3, 6, 9, 10. Pin the ' +
      'cross at the two means — (3, 6) — and the paper splits into four rooms.',
    set: 'tight',
    q: 'A point in the upper-right room says what, exactly?',
    choices: [
      'Above-average x AND above-average y together — its product dx·dy votes positive',
      'That the data is increasing at that point',
      'Nothing; rooms are decoration',
    ],
    answer: 0,
    feedback:
      'Each point is scored against the two averages at once: upper-right and ' +
      'lower-left mean the deviations AGREE in sign, so dx·dy > 0 — a vote that ' +
      'high goes with high and low with low. Upper-left and lower-right are ' +
      'disagreement votes. The tally here reads 4 positive, 0 negative, 1 ' +
      'abstaining on the cross.',
    note:
      'The cross is the whole trick: "high" and "low" mean nothing until an ' +
      'average anchors them. Every question this bench asks is asked relative ' +
      'to (x̄, ȳ), never to zero — move the cross and every vote could change.',
  },
  {
    title: 'The share',
    body:
      'Direction is a sign; strength needs a number. Take S = Σdx·dy = 22, and ' +
      'compare its square against the most it could ever be: Σdx²·Σdy² = 10·50.',
    set: 'tight',
    q: 'The strength r² = 22²/500 = 484/500 = 121/125. What does it measure?',
    choices: [
      'How close the cloud is to a straight line — 1 means exactly on a line, 0 means no line at all',
      'The slope of the data',
      'The number of points above average',
    ],
    answer: 0,
    feedback:
      'r² is a share of perfection: the agreement S, squared, against the ' +
      'largest value the spreads would ever allow it. 121/125 says this cloud ' +
      'is nearly a line — and says nothing about WHICH line. Steepness belongs ' +
      'to the line bench; r² is deliberately blind to it.',
    note:
      'The bench keeps r² instead of r for one reason: r² is an exact fraction ' +
      'here, while r would drag in a square root. The sign that r carries is ' +
      'reported separately, by the tally — nothing is lost.',
  },
  {
    title: 'Perfection, both ways',
    body:
      'Swap in y = 2x: the tally reads 4–0 and r² = 20²/(10·40) = 400/400 = 1. ' +
      'Then y falling 10 to 2: r² = 1 again, tally 0–4.',
    set: 'line',
    q: 'Two data sets, both r² = 1. What tells them apart?',
    choices: [
      'Only the sign — r² = 1 means "exactly on a line"; the tally says which way the line leans',
      'Nothing; they are the same data',
      'The steeper one has the bigger r²',
    ],
    answer: 0,
    feedback:
      'Strength and direction are separate instruments: both perfect sets max ' +
      'out the share at exactly 1, and only the tally distinguishes rise from ' +
      'fall. This is why r is quoted with a sign — it is the tally and the ' +
      'share fused into one symbol, at the price of a square root.',
    note:
      'And a steeper line does NOT score higher: y = 2x and y = x both sit ' +
      'exactly on their lines, both earn r² = 1. Strength is line-likeness, ' +
      'never line-steepness.',
  },
  {
    title: 'The parabola that scores zero',
    body:
      'Now the showpiece: y = (x − 3)², the flawless curve 4, 1, 0, 1, 4. Run ' +
      'the tally and the sums.',
    set: 'curve',
    q: 'A perfect pattern — what does r² report?',
    choices: [
      'Exactly 0 — the agreement S = Σdx·dy cancels to nothing; r sees no LINE, and lines are all it can see',
      'Exactly 1 — the pattern is perfect',
      'About 1/2 — half a pattern',
    ],
    answer: 0,
    feedback:
      'The left arm votes negative, the right arm votes positive, and the ' +
      'cancellation is exact: S = −4 + 1 + 0 − 1 + 4 = 0, so r² = 0 on a curve ' +
      'that never misses. Zero correlation does NOT mean no relationship — it ' +
      'means no LINEAR relationship. This single example retires half the ' +
      'misreadings of r in the wild.',
    note:
      'The other zero on this bench looks nothing like it: 6, 9, 3, 3, 9 is ' +
      'genuine hash. r² = 0 cannot tell flawless curvature from noise — which ' +
      'is exactly why you look at the picture before quoting the number.',
  },
  {
    title: 'Walking the clouds',
    body:
      'The dial walks all six posted sets. Watch the tally and the share move ' +
      'together — and apart.',
    set: 'tight',
    dial: true,
    q: 'Which pair of sets shares its r² but not its story?',
    choices: [
      'The no-story cloud and the perfect parabola — both r² = 0, one is noise, one is flawless curvature',
      'The two perfect lines — one rises, one falls',
      'The tight and loose clouds',
    ],
    answer: 0,
    feedback:
      'Both zeros, utterly different pictures: hash with no shape, and a ' +
      'parabola with perfect shape. (The two perfect lines share r² = 1 but ' +
      'their STORIES agree — both are lines.) The number compresses; the ' +
      'picture decompresses. Quote r² only after your eyes have seen what it ' +
      'is compressing. Two numbers agreeing is the start of the reading, never ' +
      'the end of it.',
    note:
      'What the number NEVER says: that x causes y. The lurking-variable ' +
      'bench owns that boundary and patrols it well — this bench measures ' +
      'line-likeness and stops talking.',
  },
  {
    title: 'The assayer’s stamp',
    body:
      'A data set is posted on the mean-cross. Rule the direction first — the ' +
      'tally’s sign — then rule the strength r² as an exact fraction. Both ' +
      'exact, or no stamp.',
    set: 'tight',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CorrelationLab() {
  const [setIdx, setSetIdx] = useState(2);
  const [sPick, setSPick] = useState(null);
  const [rPick, setRPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const setKey = calib && kase != null ? CASES[kase] : current.dial ? CASES[setIdx] : current.set;
  const tally = tallyOf(setKey);
  const sg = signOf(setKey);
  const r2 = r2Of(setKey);

  const checks = calib ? calibChecks(kase, sPick, rPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, sPick, rPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, sPick, rPick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''}` : SETS[setKey].label;
  sceneRef.current = { setKey, tally, sg, r2, calib, bandLabel };

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
    const ys = SETS[S.setKey].y;
    const mx = meanOf(X);
    const my = meanOf(ys);
    const padL = 56;
    const xOf = (x) => padL + ((x - 0) / 6) * (W - padL - 30);
    const yOf = (y) => bandH + 30 + ((11 - y) / 12) * (H2 - bandH - 30 - 96);

    /* THE MEAN-CROSS */
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(xOf(mx), yOf(11));
    ctx.lineTo(xOf(mx), yOf(-1));
    ctx.moveTo(xOf(0.2), yOf(my));
    ctx.lineTo(xOf(5.8), yOf(my));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = CARMINE;
    ctx.font = '600 10.5px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`the cross (${mx}, ${my})`, xOf(mx) + 8, yOf(11) + 14);

    /* the dots, voting */
    const dxs = devsOf(X);
    const dys = devsOf(ys);
    for (let i = 0; i < X.length; i++) {
      const p = dxs[i] * dys[i];
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.arc(xOf(X[i]), yOf(ys[i]), 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = SLATE;
      ctx.font = '700 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p > 0 ? '+' : p < 0 ? MINUS : '·', xOf(X[i]), yOf(ys[i]) - 9);
    }

    /* the readout card */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the tally and the share', 22, bandH + 8);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillStyle = CARMINE;
    ctx.fillText(
      S.calib
        ? `tally: ${S.tally.plus}+ / ${S.tally.minus}${MINUS} / ${S.tally.abstain}· → sign ?`
        : `tally: ${S.tally.plus}+ / ${S.tally.minus}${MINUS} / ${S.tally.abstain}· → ${S.sg}`,
      22,
      bandH + 26
    );
    ctx.fillStyle = GOLD;
    ctx.fillText(S.calib ? 'r² = ?' : `r² = ${fracText(S.r2)}`, 22, bandH + 44);

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
    setSetIdx(2);
    setSPick(null);
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
    setSetIdx(2);
    setSPick(null);
    setRPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Sign ${sPick ?? 'unruled'}; strength ${rPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${SETS[setKey].label}: tally ${tally.plus} positive, ${tally.minus} negative, ${tally.abstain} abstaining; sign ${sg}; r squared ${fracText(r2)}.`;

  return (
    <div className="crlab">
      <header className="head">
        <h1>Correlation: The Sign Tally and the Share</h1>
        <p className="lede">
          Split r into its honest parts: direction from the quadrant tally around
          the mean-cross, strength as r² — an exact fraction here, from 1 for a
          perfect line down to 0 for hash… <em>or for a flawless parabola</em>.
          r speaks only of lines, and this bench makes it say so.
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
                  <span className="dial-k">the posted set</span>
                  <span className="dial-v mono">{SETS[CASES[setIdx]].label}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={CASES.length - 1}
                  step={1}
                  value={setIdx}
                  onChange={(e) => setSetIdx(Number(e.target.value))}
                  aria-label={`Set index, ${setIdx}`}
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
                <span className="target-k">The posted set</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the sign, tallied</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the share, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Sign ruling">
                  {SIGN_CHIPS.map((c2) => (
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
                <div className="declare" role="group" aria-label="Strength ruling">
                  {R2_CHIPS.map((c2) => (
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
                    ? 'both ruled, exactly — the cloud is assayed'
                    : checks[0]
                      ? 'sign tallied — now the exact share'
                      : 'read the votes around the cross'}
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
                  <span className="mono target-hint">the sign · then the share</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setSPick(null);
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
                  setSPick(null);
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
        <span className="mono">direction = the tally’s sign · strength = r², an exact share</span>{' '}
        &nbsp;·&nbsp; r speaks only of lines — a flawless parabola scores zero, and
        the picture always gets the first word.
      </footer>

      <style jsx>{`
        .crlab {
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
        :global(.crlab) :focus-visible {
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
