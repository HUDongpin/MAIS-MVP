'use client';

/* ============================================================================
   OptimizationLab — an interactive "bench" for OPTIMIZATION: the climb
   detector.  The derivative bench built an instrument that reads a curve's
   slope; this bench gives that instrument its first JOB: certify a best.
   Fence 20 meters into a rectangle — sides x and 10 − x, area A(x) =
   x(10 − x) — and the detector A′(x) = 10 − 2x reads CLIMBING for x < 5,
   LEVEL at x = 5, FALLING for x > 5.  A sign that changes + → 0 → − is a
   certificate no table of samples can issue: the peak at x = 5 beats every
   x, not just the ones you tried.  (GRADES 9–12 · AP Calculus — apply the
   derivative to optimization; depends on the derivative and integral
   benches.)

   THE SIGNATURE CENTERPIECE — "THE DETECTOR STRIP."  Above, the area
   curve A(x) with the carmine peak; below, the gold detector strip prints
   A′ at every integer station — +8, +6, +4, +2, 0, −2, … — with climb
   flags (↑, ·, ↓).  The sign changes exactly once, at x = 5, and that
   single crossing is the whole proof of bestness.

   THE MODEL — exact integer arithmetic throughout:
     · A(x) = x(P/2 − x) and A′(x) = P/2 − 2x for perimeter P (multiple
       of 4); both are integers at integer stations, and A′ is EXACT — the
       derivative bench certifies the formula; this bench applies it.
     · peakOf(P) = P/4 with bestOf(P) = P²/16, both asserted integers;
       the audit proves A(peak) ≥ A(x) for every x in range, strictness
       away from the peak, the sign law of A′, and the square identity
       (the best pen is the square) across all posted perimeters.
     · the constraint fold: two sides x and y with x + y = P/2 collapse
       to one variable — checked as an identity, not assumed.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No limits, no h-shrinking, no derivation of A′ — the derivative
       bench owns what A′ IS; it is imported here as certified freight,
       with credit, and put to work.
     · No area accumulation, no slats — the integral bench owns adding;
       this bench compares.
     · No gap gauge, no floor — the line-meets-parabola bench reads a
       minimum off a shifted square; this bench certifies a maximum by a
       SIGN CHANGE, a genuinely different instrument, and says why the
       sign method scales where completing squares does not.
     · One job, done fully: the fence.  No related rates, no ladders
       sliding down walls — one optimization, seen to the bottom.
   COLORS: one accent. CARMINE = the peak and its certificate (the
   object). GOLD = the detector strip (the tool). BLUE = the quiet area
   curve. GREEN only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a perimeter is posted.  Rule the peak station
   x = P/4 first (where the detector reads zero), then rule the best
   area P²/16, exactly.  Truths are derived from peakOf/bestOf at answer
   time; the meter is quantized to {0, 50, 100}; the area earns nothing
   until the station stands.  The stamp provably cannot fire falsely.
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

/* the fence: perimeter P (multiple of 4), sides x and P/2 − x */
const halfOf = (P) => {
  if (P % 4 !== 0) throw new Error('posted perimeters are multiples of 4 — the peak must land whole');
  return P / 2;
};
const areaAt = (P, x) => x * (halfOf(P) - x);
/* the detector — certified by the derivative bench, applied here */
const detectorAt = (P, x) => halfOf(P) - 2 * x;
const flagAt = (P, x) => {
  const d = detectorAt(P, x);
  return d > 0 ? 'climbing' : d < 0 ? 'falling' : 'level';
};
/* the peak and the best, derived */
const peakOf = (P) => {
  const p = P / 4;
  if (detectorAt(P, p) !== 0) throw new Error('the detector must read zero at the peak');
  return p;
};
const bestOf = (P) => {
  const b = (P * P) / 16;
  if (!Number.isInteger(b)) throw new Error('posted bests are integers');
  return b;
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted perimeters; truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [12, 16, 20, 24, 28];
const PEAK_CHIPS = ['3', '4', '5', '6', '7'];
const BEST_CHIPS = ['9', '16', '25', '36', '49'];

const labelOf = (i) => `a fence of ${CASES[i]} meters`;
const peakTruth = (i) => String(peakOf(CASES[i]));
const bestTruth = (i) => String(bestOf(CASES[i]));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, pPick, bPick) => {
  if (i == null) return [false, false];
  const c1 = pPick === peakTruth(i);
  const c2 = c1 && bPick === bestTruth(i);
  return [c1, c2];
};
const closeness = (i, pPick, bPick) => {
  const [c1, c2] = calibChecks(i, pPick, bPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, pPick, bPick) => calibChecks(i, pPick, bPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The job',
    body:
      'Twenty meters of fence, one rectangular pen: sides x and 10 − x. The ' +
      'area table at integer stations: 9, 16, 21, 24, 25, 24, 21, 16, 9.',
    P: 20,
    showDetector: false,
    q: 'The table’s largest entry is 25, at x = 5. Is 25 proven best?',
    choices: [
      'Best among the stations TRIED — but x can be any number, and a table cannot speak for the stations between',
      'Yes — 25 beats every entry',
      'No — bigger x always gives bigger area',
    ],
    answer: 0,
    feedback:
      'The table is honest about nine stations and silent about everything ' +
      'between: x = 4½, x = 5⅛, and infinitely many other in-between widths ' +
      'never testified. ' +
      'Optimization needs a claim about ALL x — and tables, however dense, ' +
      'sample. The instrument that speaks for every x at once arrives next.',
    note:
      'Notice the constraint fold that built A(x): two sides, x and y, with ' +
      'x + y = 10 — one equation ate one variable, and a two-variable problem ' +
      'became a curve. Folding before optimizing is the standard opening move ' +
      'of the whole subject, and it costs nothing here.',
  },
  {
    title: 'The detector',
    body:
      'The derivative bench certifies: for A(x) = x(10 − x), the slope reader ' +
      'is A′(x) = 10 − 2x. The gold strip prints it at every station.',
    P: 20,
    showDetector: true,
    q: 'A′(3) = 4. What does the flag ↑ assert?',
    choices: [
      'The area is CLIMBING at x = 3 — a slightly longer side buys more area there, so 3 cannot be the best',
      'The area at 3 is 4',
      'The pen at x = 3 has slope 4',
    ],
    answer: 0,
    feedback:
      'The detector reads direction of travel: positive means the curve still ' +
      'rises, so any station with a ↑ flag is beaten by its right neighbor — ' +
      'disqualified from bestness without computing a single area. The ' +
      'derivative bench built the instrument; this is the instrument doing a ' +
      'day’s work — reading direction so that areas need not be compared at all.',
    note:
      'Mind the classic misread: A′(3) = 4 is not an area and not the area’s ' +
      'value — it is the RATE the area grows per extra meter of side, exactly ' +
      '4 at that station.',
  },
  {
    title: 'The certificate',
    body:
      'Read the whole strip: +8, +6, +4, +2 at x = 1..4; exactly 0 at x = 5; ' +
      '−2, −4, −6, −8 after. One sign change, + → 0 → −.',
    P: 20,
    showDetector: true,
    q: 'Why does that sign pattern PROVE x = 5 is best for ALL x?',
    choices: [
      'Left of 5 the area only climbs, right of 5 it only falls — so every path from any x toward 5 gains area; nothing anywhere beats the turning station',
      'Because 0 is the smallest reading',
      'Because 25 appeared in the table',
    ],
    answer: 0,
    feedback:
      'The argument covers the continuum the table could not: climbing ' +
      'everywhere left of 5 means every x < 5 is beaten by stations to its ' +
      'right; falling everywhere after means every x > 5 is beaten from the ' +
      'left. The peak wins against ALL rivals, tried and untried — that is a ' +
      'certificate, not a sample — and it needed only the signs, never the ' +
      'areas themselves.',
    note:
      'The parabola bench reads a best off a completed square, and for THIS ' +
      'curve that works too. The sign method’s advantage is reach: it asks ' +
      'only for the detector’s sign, so it scales to curves no square-completion ' +
      'can touch.',
  },
  {
    title: 'The false summit',
    body:
      'The detector reads 0 at the peak. Careful: is "detector reads 0" the ' +
      'same as "this is the best"?',
    P: 20,
    showDetector: true,
    q: 'A′ = 0 at a station. What is certified so far?',
    choices: [
      'Only LEVEL ground — the sign pattern around the zero decides whether it is a peak, a valley, or a passing flat',
      'A maximum, always',
      'Nothing at all',
    ],
    answer: 0,
    feedback:
      'Zero is a candidate’s badge, not a crown: a valley also levels off, and ' +
      'some curves flatten mid-slope and keep going. The full certificate is ' +
      'zero PLUS the sign change + → − around it. Here the strip shows exactly ' +
      'that — but the habit of checking the flanks is what separates a proof ' +
      'from a lucky guess.',
    note:
      'This is why the bench prints the whole strip instead of solving ' +
      'A′ = 0 and stopping: the equation finds candidates; the SIGNS crown ' +
      'the winner, every time.',
  },
  {
    title: 'Every fence, one law',
    body:
      'The dial changes the fence: P = 12, 16, 20, 24, 28. Watch where the ' +
      'detector crosses zero and what the best pen looks like.',
    P: 20,
    showDetector: true,
    dial: true,
    q: 'The peak is always at x = P/4. What shape is the best pen?',
    choices: [
      'The square — x = P/4 makes both sides P/4; best area P²/16: 9, 16, 25, 36, 49 up the dial',
      'The longest thin rectangle',
      'It depends on the fence material',
    ],
    answer: 0,
    feedback:
      'At the peak, x = P/4 and the other side is P/2 − P/4 = P/4 — equal ' +
      'sides, a square, at every perimeter. One optimization run five times ' +
      'becomes one LAW: of all rectangles with a given perimeter, the square ' +
      'encloses the most. The ancients suspected it; the detector certifies it ' +
      'in one sign change.',
    note:
      'Check the fold at the peak once by hand for P = 20: sides 5 and 5, ' +
      'area 25, detector 0, flanks +2 and −2. Five exact integers, one ' +
      'theorem — the whole subject in miniature.',
  },
  {
    title: 'The surveyor’s stamp',
    body:
      'A fence is posted, its detector strip printed but its peak unmarked. ' +
      'Rule the peak station first — where the detector reads exactly zero, ' +
      'x = P/4 — then rule the best area, the square’s P²/16. Both exact, or ' +
      'no stamp; the meter reports only how much of the ruling stands.',
    P: 20,
    showDetector: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function OptimizationLab() {
  const [pDial, setPDial] = useState(20);
  const [pPick, setPPick] = useState(null);
  const [bPick, setBPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const P = calib && kase != null ? CASES[kase] : current.dial ? pDial : current.P;
  const half = halfOf(P);
  const peak = peakOf(P);
  const best = bestOf(P);

  const checks = calib ? calibChecks(kase, pPick, bPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, pPick, bPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, pPick, bPick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''}` : `the fence of ${P} meters · A(x) = x(${half} ${MINUS} x)`;
  sceneRef.current = { P, half, peak, best, showDetector: !!current.showDetector || calib, calib, bandLabel };

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
    const padL = 56;
    const padR = 30;
    const xOf = (x) => padL + (x / S.half) * (W - padL - padR);
    const yCurve = (a) => bandH + 40 + (1 - a / S.best) * (H2 - bandH - 40 - (S.showDetector ? 150 : 90));

    /* the area curve (pixels between exact stations) */
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let px = 0; px <= 100; px++) {
      const x = (px / 100) * S.half;
      const a = x * (S.half - x);
      if (px === 0) ctx.moveTo(xOf(x), yCurve(a));
      else ctx.lineTo(xOf(x), yCurve(a));
    }
    ctx.stroke();
    /* integer stations */
    for (let x = 0; x <= S.half; x++) {
      const a = areaAt(S.P, x);
      ctx.fillStyle = x === S.peak ? CARMINE : BLUE;
      ctx.beginPath();
      ctx.arc(xOf(x), yCurve(a), x === S.peak ? 5.5 : 3.2, 0, 2 * Math.PI);
      ctx.fill();
    }
    /* the peak label */
    ctx.fillStyle = CARMINE;
    ctx.font = '700 11.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      S.calib ? 'the peak: ?' : `the peak: x = ${S.peak}, area ${S.best}`,
      xOf(S.peak),
      yCurve(S.best) - 10
    );

    /* THE DETECTOR STRIP */
    if (S.showDetector) {
      const yStrip = H2 - 96;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.strokeRect(padL - 14, yStrip - 20, W - padL - padR + 28, 62);
      ctx.fillStyle = SLATE;
      ctx.font = 'italic 600 10.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('the detector A′(x)', padL - 8, yStrip - 26);
      for (let x = 1; x < S.half; x++) {
        const d = detectorAt(S.P, x);
        const hot = d === 0;
        ctx.fillStyle = hot ? CARMINE : INK_HEX;
        ctx.font = (hot ? '700' : '600') + ' 11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(S.calib && hot ? '?' : fmtInt(d), xOf(x), yStrip);
        ctx.fillText(hot ? '·' : d > 0 ? '↑' : '↓', xOf(x), yStrip + 22);
      }
    }

    /* axis labels */
    ctx.fillStyle = SLATE;
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = 0; x <= S.half; x += 1) {
      if (S.half > 10 && x % 2 === 1) continue;
      ctx.fillText(String(x), xOf(x), H2 - 26);
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
    setPDial(20);
    setPPick(null);
    setBPick(null);
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
    setPDial(20);
    setPPick(null);
    setBPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Peak ${pPick ?? 'unruled'}; best ${bPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `The fence of ${P}: the detector reads zero at x = ${peak}, flanked by ${fmtInt(detectorAt(P, peak - 1))} and ${fmtInt(detectorAt(P, peak + 1))}; the best pen is the ${peak}-by-${peak} square, area ${best}.`;

  return (
    <div className="oplab">
      <header className="head">
        <h1>Optimization: The Climb Detector</h1>
        <p className="lede">
          The derivative bench built the instrument; this bench gives it a job.
          A′(x) = 10 − 2x reads climbing, level, falling — and one sign change,
          + → 0 → −, certifies the peak against <em>all</em> x, tried and
          untried. Tables sample; the detector speaks for the continuum.
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
                  <span className="dial-k">the perimeter P</span>
                  <span className="dial-v mono">{pDial}</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={28}
                  step={4}
                  value={pDial}
                  onChange={(e) => setPDial(Number(e.target.value))}
                  aria-label={`Perimeter, ${pDial}`}
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
                <span className="target-k">The posted fence</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the peak station</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the best area</li>
                </ol>
                <div className="declare" role="group" aria-label="Peak ruling">
                  {PEAK_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (pPick === c2 ? ' active' : '')}
                      onClick={() => setPPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Best ruling">
                  {BEST_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (bPick === c2 ? ' active' : '')}
                      onClick={() => setBPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the pen is squared'
                    : checks[0]
                      ? 'station found — now the square’s area'
                      : 'where does the detector read zero? P ÷ 4'}
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
                  <span className="mono target-hint">the station · then the best</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setPPick(null);
                  setBPick(null);
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
                  setPPick(null);
                  setBPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">fold the constraint · read the signs · + → 0 → − crowns the peak</span>{' '}
        &nbsp;·&nbsp; tables sample, detectors certify — and the best pen is
        always the square.
      </footer>

      <style jsx>{`
        .oplab {
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
        :global(.oplab) :focus-visible {
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
