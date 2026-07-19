'use client';

/* ============================================================================
   SamplingDistributionLab — an interactive "bench" for SAMPLING
   DISTRIBUTIONS & MARGIN OF ERROR: the gallery of every draw.  A statistic
   varies from sample to sample — so study the STATISTIC ITSELF as a
   population: lay out every possible sample (here literally all of them,
   C(6,3) = 20), compute each one's total, and read the gallery.  Its center
   lands exactly on the truth (3 × the population mean), and "margin of
   error" becomes tile-counting: promise ±3 and you cover 12 of the 20
   possible draws — 3/5, exactly.  (GRADES 9–12 · CCSS S-IC.A–B — understand
   statistics as a process for making inferences; evaluate margins of error
   through the variability of a statistic across samples.  The capstone of
   the statistics strand.)

   THE SIGNATURE CENTERPIECE — "THE GALLERY."  Twenty tiles, one per
   possible 3-crate draw from the 6-crate warehouse (weights 2, 4, 6, 8,
   10, 12), each tile stamped with its sample TOTAL.  The gold center line
   marks 21 — the average of all twenty totals, provably 3 × the population
   mean 7.  A carmine promise band of radius m brackets the center; the
   tiles inside are counted, and the hit rate is an exact fraction.

   THE MODEL — exact integer arithmetic throughout:
     · POP = [2, 4, 6, 8, 10, 12]; samplesOf() enumerates all index triples
       i < j < k — twenty of them, never stored precomputed.
     · totals are integers; centerOf() sums all twenty totals, divides by
       20, and ASSERTS the result is exactly 21 = 3 · popMean.
     · withinOf(m) counts tiles with |total − 21| ≤ m; rateOf(m) reduces
       the fraction by gcd.  The audit re-proves every count against the
       full enumeration and the appearance argument (each crate sits in
       exactly C(5,2) = 10 samples).

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No pond, no dip, no who-got-measured — the sampling bench owns fair
       drawing; this bench ASSUMES fair draws and asks what the statistic
       does across all of them.  One citation marks the border.
     · No long-run chart, no repetition — the chance bench owns
       convergence; nothing here is repeated, because EVERYTHING here is
       enumerated.
     · Why twenty? — the arrangements bench counts unordered handfuls;
       its C(6,3) = 20 is imported with credit, not re-derived.
     · No normal curve, no bell overlay — the shape benches own smooth
       approximations; this gallery is small enough to be exact, which is
       the entire point of it.
   COLORS: one accent. CARMINE = the promise band and the hit rate (the
   object). GOLD = the center line (the tool). BLUE = quiet tiles. GREEN
   only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a promise radius m is posted.  Rule the count of
   tiles inside the band first, then rule the hit rate as an exact reduced
   fraction.  Truths are derived from withinOf/rateOf at answer time; the
   meter is quantized to {0, 50, 100}; the rate earns nothing until the
   count stands.  The stamp provably cannot fire falsely.
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

/* the warehouse: six crates with known weights */
const POP = [2, 4, 6, 8, 10, 12];
const popMean = () => {
  const s = POP.reduce((t, v) => t + v, 0);
  if (s % POP.length !== 0) throw new Error('the warehouse mean is engineered whole');
  return s / POP.length;
};

/* every possible 3-crate draw, enumerated live */
const samplesOf = () => {
  const out = [];
  for (let i = 0; i < POP.length; i++)
    for (let j = i + 1; j < POP.length; j++)
      for (let k = j + 1; k < POP.length; k++) out.push([POP[i], POP[j], POP[k]]);
  return out;
};
const totalOf = (sample) => sample.reduce((t, v) => t + v, 0);
const galleryTotals = () => samplesOf().map(totalOf).sort((a, b) => a - b);

/* the gallery's center — asserted to hit the truth exactly */
const centerOf = () => {
  const totals = galleryTotals();
  const s = totals.reduce((t, v) => t + v, 0);
  if (s % totals.length !== 0) throw new Error('the gallery center is engineered whole');
  const c = s / totals.length;
  if (c !== 3 * popMean()) throw new Error('the center must land on 3 × the population mean');
  return c;
};

/* the promise band: how many draws land within m of the center? */
const withinOf = (m) => galleryTotals().filter((t) => Math.abs(t - centerOf()) <= m).length;
const rateOf = (m) => {
  const w = withinOf(m);
  const n = galleryTotals().length;
  const g = gcdOf(w, n);
  return [w / g, n / g];
};
const fracText = ([n, d]) => (d === 1 ? String(n) : `${n}/${d}`);

/* ---------------------------------------------------------------------------
   CALIBRATION — posted radii; truths derived from the gallery.
   ------------------------------------------------------------------------- */
const CASES = [1, 3, 5, 7, 9];
const COUNT_CHIPS = ['6', '12', '16', '18', '20'];
const RATE_CHIPS = ['3/10', '3/5', '4/5', '9/10', '1'];

const labelOf = (i) => `the promise ±${CASES[i]} around 21`;
const countTruth = (i) => String(withinOf(CASES[i]));
const rateTruth = (i) => fracText(rateOf(CASES[i]));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, cPick, rPick) => {
  if (i == null) return [false, false];
  const c1 = cPick === countTruth(i);
  const c2 = c1 && rPick === rateTruth(i);
  return [c1, c2];
};
const closeness = (i, cPick, rPick) => {
  const [c1, c2] = calibChecks(i, cPick, rPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, cPick, rPick) => calibChecks(i, cPick, rPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One draw is one opinion',
    body:
      'Six crates in the warehouse — weights 2, 4, 6, 8, 10, 12, true mean 7. ' +
      'Draw three: say 2, 6, 10, total 18. Draw again: 4, 10, 12, total 26.',
    band: null,
    q: 'Two draws, two totals. Is the statistic broken?',
    choices: [
      'No — a statistic VARIES from draw to draw; the real question is how it varies, and that has an exact answer here',
      'Yes — a good statistic should give one number',
      'Yes, unless we weigh all six crates',
    ],
    answer: 0,
    feedback:
      'Variation is not failure; it is the object of study. Instead of arguing ' +
      'about single draws, statisticians study the statistic ITSELF as a ' +
      'population: every draw that could happen, each with its total. On this ' +
      'bench that population is small enough to see whole, tile by tile.',
    note:
      'The sampling bench next door asks whether a draw is FAIR — who gets ' +
      'measured. This bench assumes fair draws and asks the next question: ' +
      'what does the honest statistic do across all of them?',
  },
  {
    title: 'The gallery',
    body:
      'Lay out EVERY possible 3-crate draw. The arrangements bench counts them ' +
      'for us: C(6, 3) = 20 handfuls. Twenty tiles, each stamped with its ' +
      'total.',
    band: null,
    q: 'What is this wall of twenty tiles?',
    choices: [
      'The sampling distribution — the statistic’s own population, one tile per possible draw',
      'Twenty repetitions of the same experiment',
      'A record of twenty past drawings',
    ],
    answer: 0,
    feedback:
      'Nothing was repeated and nothing is history — the gallery is the ' +
      'complete space of possibility, enumerated. Totals run from 12 (the ' +
      'three lightest) to 30 (the three heaviest), and the middle values crowd: ' +
      'more triples total 18 than total 12. That crowding shape IS the ' +
      'distribution of the statistic.',
    note:
      'Real surveys cannot enumerate their gallery — billions of possible ' +
      'samples — which is why they lean on approximations. This bench is built ' +
      'tiny so the object itself is visible; the lesson scales, the counting ' +
      'does not have to.',
  },
  {
    title: 'The gallery aims at the truth',
    body:
      'Average all twenty totals: they sum to 420, and 420 ÷ 20 = 21. The ' +
      'warehouse mean is 7, and 3 × 7 = 21.',
    band: null,
    q: 'The gallery centers exactly on 3 × the true mean. Why is that exact?',
    choices: [
      'Every crate sits in exactly 10 of the 20 draws — the sum of all totals is 10 × 42 = 420, so the center must be 21',
      'Luck — with other weights it would drift',
      'Because 20 samples is a lot',
    ],
    answer: 0,
    feedback:
      'Symmetry does the proving: each of the six crates appears in exactly ' +
      'C(5,2) = 10 draws, so all totals together weigh every crate ten times — ' +
      '10 × 42 = 420, center 21, no luck involved. The statistic is UNBIASED: ' +
      'the crowd of all draws aims dead at the truth even though almost every ' +
      'single draw misses it.',
    note:
      'Read that last clause again — it is the strangest fact on this bench: ' +
      '18 of the 20 tiles are wrong about the truth individually, and their ' +
      'average is exactly right anyway.',
  },
  {
    title: 'The promise band',
    body:
      'Draw one sample and promise: "the total is within ±3 of 21." The ' +
      'carmine band brackets 18 to 24. Count the tiles inside.',
    band: 3,
    q: 'For how many of the 20 possible draws does that promise hold?',
    choices: [
      '12 of 20 — the totals 18, 20, 22, 24 hold 3 + 3 + 3 + 3 tiles; the promise is good 3/5 of the time',
      'All 20 — promises always hold',
      '4 of 20 — one per total value',
    ],
    answer: 0,
    feedback:
      'The band is a countable event: totals 18, 20, 22, 24 carry three tiles ' +
      'each, so 12 of the 20 equally likely draws keep the promise — an exact ' +
      '3/5. This is what a margin of error IS underneath the polish: a promise ' +
      'radius, and the fraction of possible samples for which the promise ' +
      'holds.',
    note:
      'No repetition was needed to say "3/5 of the time" — the gallery turned ' +
      'a probability statement into a tile count. Enumeration is the honest ' +
      'ancestor of every confidence claim, and the standard against which the ' +
      'approximations are judged.',
  },
  {
    title: 'Wider promise, safer promise',
    body:
      'The dial widens the promise: ±1, ±3, ±5, ±7, ±9. Watch the count climb: ' +
      '6, 12, 16, 18, 20 of twenty.',
    band: 3,
    dial: true,
    q: 'What does the climb trade away?',
    choices: [
      'Precision — ±9 covers every draw but says almost nothing; ±1 says a lot and holds only 3/10 of the time',
      'Nothing — wider is simply better',
      'Truth — wide promises are lies',
    ],
    answer: 0,
    feedback:
      'The whole bargain of interval estimates sits on this dial: reliability ' +
      'climbs — 3/10, 3/5, 4/5, 9/10, 1 — exactly as the claim weakens. A ' +
      'promise sure to hold (±9) brackets everything and informs no one. ' +
      'Choosing a margin of error is choosing where on this dial to stand.',
    note:
      'Every fraction on the dial is exact because every one is a count over ' +
      '20. When surveys report 95%, they are standing on the same trade — ' +
      'with a gallery too big to draw, approximated by the shape benches’ ' +
      'tools.',
  },
  {
    title: 'The gallerist’s stamp',
    body:
      'A promise radius is posted. Count the tiles inside the band first — ' +
      'of the twenty — then rule the hit rate as an exact reduced fraction. ' +
      'Both exact, or no stamp.',
    band: 3,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SamplingDistributionLab() {
  const [mDial, setMDial] = useState(3);
  const [cPick, setCPick] = useState(null);
  const [rPick, setRPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const m = calib && kase != null ? CASES[kase] : current.dial ? mDial : current.band;
  const totals = galleryTotals();
  const center = centerOf();
  const inBand = m == null ? 0 : withinOf(m);

  const checks = calib ? calibChecks(kase, cPick, rPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, cPick, rPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, cPick, rPick) : false;

  const bandLabel = calib
    ? `posted: ${kase != null ? labelOf(kase) : ''}`
    : m == null
      ? 'the gallery of every 3-crate draw'
      : `the promise ±${m} around ${center}`;
  sceneRef.current = { totals, center, m, inBand, calib, bandLabel };

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
    /* the gallery as stacked tiles over a total axis 12..30 */
    const padL = 60;
    const padR = 40;
    const xOf = (t) => padL + ((t - 12) / 18) * (W - padL - padR);
    const yBase = H2 - 90;
    const tile = 24;

    /* the promise band */
    if (S.m != null) {
      ctx.fillStyle = 'rgba(200,30,79,0.08)';
      const xL = xOf(S.center - S.m) - tile / 2 - 3;
      const xR = xOf(S.center + S.m) + tile / 2 + 3;
      ctx.fillRect(xL, bandH + 40, xR - xL, yBase - bandH - 20);
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(xL, bandH + 40, xR - xL, yBase - bandH - 20);
    }

    /* axis */
    ctx.strokeStyle = SLATE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xOf(12) - 20, yBase + 0.5);
    ctx.lineTo(xOf(30) + 20, yBase + 0.5);
    ctx.stroke();
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let t = 12; t <= 30; t += 2) {
      ctx.fillStyle = SLATE;
      ctx.fillText(String(t), xOf(t), yBase + 6);
    }

    /* the tiles, stacked by total */
    const counts = new Map();
    for (const t of S.totals) {
      const lvl = counts.get(t) ?? 0;
      const inside = S.m != null && Math.abs(t - S.center) <= S.m;
      ctx.fillStyle = inside ? 'rgba(200,30,79,0.75)' : 'rgba(63,116,166,0.7)';
      ctx.fillRect(xOf(t) - tile / 2, yBase - (lvl + 1) * (tile + 4), tile, tile);
      ctx.fillStyle = '#fbfbf8';
      ctx.font = '700 10.5px ui-monospace, monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(t), xOf(t), yBase - (lvl + 1) * (tile + 4) + tile / 2);
      counts.set(t, lvl + 1);
    }

    /* the gold center line */
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(xOf(S.center), bandH + 30);
    ctx.lineTo(xOf(S.center), yBase);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = GOLD;
    ctx.font = '600 10.5px ui-monospace, monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`center ${S.center} = 3 × 7`, xOf(S.center), bandH + 26);

    /* the readout card */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the gallery', 22, bandH + 8);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillStyle = BLUE;
    ctx.fillText(`${S.totals.length} possible draws`, 22, bandH + 26);
    if (S.m != null) {
      ctx.fillStyle = CARMINE;
      ctx.fillText(
        S.calib ? `inside ±${S.m}: ? of 20` : `inside ±${S.m}: ${S.inBand} of 20`,
        22,
        bandH + 44
      );
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
    setMDial(3);
    setCPick(null);
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
    setMDial(3);
    setCPick(null);
    setRPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Count ${cPick ?? 'unruled'}; rate ${rPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : m == null
      ? `The gallery: 20 possible draws, totals 12 to 30, centered exactly on ${center}.`
      : `The promise plus or minus ${m} around ${center}: ${inBand} of 20 draws inside — the rate is ${fracText(rateOf(m))}.`;

  return (
    <div className="galab">
      <header className="head">
        <h1>Sampling Distributions: The Gallery of Every Draw</h1>
        <p className="lede">
          A statistic varies — so study the statistic itself: all C(6,3) = 20
          possible draws, laid out as tiles with their totals. The gallery
          centers <em>exactly</em> on 3 × the true mean, and a margin of error
          becomes a tile count: promise ±3 and you cover 12 of 20, exactly 3/5.
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
                  <span className="dial-k">the promise radius m</span>
                  <span className="dial-v mono">±{mDial}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={9}
                  step={2}
                  value={mDial}
                  onChange={(e) => setMDial(Number(e.target.value))}
                  aria-label={`Radius, ${mDial}`}
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
                <span className="target-k">The posted promise</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the tiles, counted</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the rate, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Count ruling">
                  {COUNT_CHIPS.map((c2) => (
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
                <div className="declare" role="group" aria-label="Rate ruling">
                  {RATE_CHIPS.map((c2) => (
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
                    ? 'both ruled, exactly — the gallery agrees'
                    : checks[0]
                      ? 'tiles counted — now reduce the fraction'
                      : 'count the tiles the band brackets'}
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
                  <span className="mono target-hint">the count · then the rate</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setCPick(null);
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
                  setCPick(null);
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
        <span className="mono">every draw enumerated · center = 3 × truth · rate = tiles ÷ 20</span>{' '}
        &nbsp;·&nbsp; margin of error is a promise radius, and here every promise
        is graded by exact count.
      </footer>

      <style jsx>{`
        .galab {
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
        :global(.galab) :focus-visible {
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
