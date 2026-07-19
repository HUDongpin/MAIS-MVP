'use client';

/* ============================================================================
   ArcsinLab — an interactive "bench" for INVERSE SINE: one seat in the
   window.  "The angle whose sine is 1/2" is ill-posed — four angles in
   −360°..360° alone claim that sine, and infinitely many beyond.  Arcsin is
   the repair: restrict to the window [−90°, 90°], where every sine value
   seats EXACTLY one angle — a fact this bench proves, not decrees.
   (GRADES 9–12 · CCSS HSF-TF.B.6 — understand that restricting a
   trigonometric function to a domain on which it is always increasing or
   decreasing allows its inverse to be constructed; F-TF.B.7 — use inverse
   functions to solve trigonometric equations.)

   THE SIGNATURE CENTERPIECE — "THE ROSTER AND THE SPOKESPERSON."  A long
   seat line runs from −360° to 360°.  For a posted sine value, every angle
   claiming that value takes a blue seat — the laps (b + 360k) and the
   mirror seats (180° − b + 360k).  A gold window brackets [−90°, 90°], and
   exactly one seat falls inside it: the carmine SPOKESPERSON, the value
   arcsin returns.  No wave is drawn anywhere — the function benches own
   the wave; this bench owns the seating chart.

   THE MODEL — exact integer arithmetic throughout (degrees):
     · every posted value is carried by a base angle b (30, 45, 60, 90, 0,
       −30); its full roster in [−360, 360] is generated from the two laws
       b + 360k and (180 − b) + 360k — never stored.
     · spokesOf(b) intersects the roster with [−90, 90] and ASSERTS the
       intersection is a single seat — the theorem the window exists for.
       The audit re-proves uniqueness for every integer base in [−90, 90].
     · mirrors: spokesFor(θ) = θ if θ ∈ [−90, 90], else 180 − θ — the exact
       identity behind arcsin(sin θ) ≠ θ outside the window.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No wave, no graph of y = sin x, no crest or trough — the sine
       function bench owns that picture entirely.  The seat line is not a
       graph: its only axis is the angle.
     · No spinning point, no unwrapping — the circle bench owns the tour;
       it is cited once for WHY two seats per lap share a height.
     · No general undo-machine story — a later bench owns inverses at
       large; this bench earns exactly one inverse, by seating chart.
     · No sine values are ever computed — values ride as exact symbols
       (1/2, √2/2, √3/2, 1, 0) attached to their base angle; no float trig
       exists anywhere in the file.
   COLORS: one accent. CARMINE = the spokesperson (the object). GOLD = the
   window (the tool). BLUE = the quiet roster seats. GREEN only on correct
   answers and the CALIBRATED stamp.

   THE CALIBRATION — a sine value is posted.  Rule the roster count in
   [−360°, 360°] first (seat every claimant), then rule the spokesperson —
   the arcsin.  Truths are derived from the two laws at answer time; the
   meter is quantized to {0, 50, 100}; the spokesperson earns nothing until
   the roster stands.  The stamp provably cannot fire falsely.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================================================================
   MODEL — exact integer degrees; nothing a student sees is floated.
   ========================================================================== */
const CARMINE = '#c81e4f';
const BLUE = '#3f74a6';
const GOLD = '#b98718';
const INK_HEX = '#243342';
const SLATE = '#5b6b7b';
const CALIB_STEP = 5;
const MINUS = '−'; /* U+2212 */

const fmtInt = (n) => (n < 0 ? MINUS + String(-n) : String(n));
const fmtDeg = (n) => `${fmtInt(n)}°`;

/* the roster: every angle in [−360, 360] sharing the base angle's sine,
   generated from the two laws — the laps and the mirror seats */
const rosterOf = (b) => {
  const seats = new Set();
  for (let k = -2; k <= 2; k++) {
    const lap = b + 360 * k;
    const mirror = 180 - b + 360 * k;
    if (lap >= -360 && lap <= 360) seats.add(lap);
    if (mirror >= -360 && mirror <= 360) seats.add(mirror);
  }
  return [...seats].sort((x, y) => x - y);
};
/* the window's theorem: exactly one seat lies in [−90, 90] */
const spokesOf = (b) => {
  const inside = rosterOf(b).filter((a) => a >= -90 && a <= 90);
  if (inside.length !== 1) throw new Error('the window must seat exactly one — that is its theorem');
  return inside[0];
};
/* arcsin(sin θ) for any integer θ in [−90, 270]: the spokesperson of θ's value */
const spokesFor = (theta) => (theta >= -90 && theta <= 90 ? theta : 180 - theta);

/* the posted values: exact symbols riding their base angles */
const VALUES = {
  half: { sym: '1/2', b: 30 },
  neghalf: { sym: MINUS + '1/2', b: -30 },
  root3o2: { sym: '√3/2', b: 60 },
  root2o2: { sym: '√2/2', b: 45 },
  one: { sym: '1', b: 90 },
  zero: { sym: '0', b: 0 },
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted values; truths derived from the two laws.
   ------------------------------------------------------------------------- */
const CASES = ['half', 'neghalf', 'root3o2', 'one', 'zero', 'root2o2'];
const ROSTER_CHIPS = ['2', '4', '5'];
const SPOKES_CHIPS = [MINUS + '30°', '0°', '30°', '45°', '60°', '90°'];

const labelOf = (i) => `sin θ = ${VALUES[CASES[i]].sym}`;
const rosterTruth = (i) => String(rosterOf(VALUES[CASES[i]].b).length);
const spokesTruth = (i) => fmtDeg(spokesOf(VALUES[CASES[i]].b));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, rPick, sPick) => {
  if (i == null) return [false, false];
  const c1 = rPick === rosterTruth(i);
  const c2 = c1 && sPick === spokesTruth(i);
  return [c1, c2];
};
const closeness = (i, rPick, sPick) => {
  const [c1, c2] = calibChecks(i, rPick, sPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, rPick, sPick) => calibChecks(i, rPick, sPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The crowded claim',
    body:
      'Post the value 1/2 and summon every angle in −360° to 360° whose sine ' +
      'claims it. Four take seats: −330°, −210°, 30°, 150°.',
    value: 'half',
    q: 'So — "THE angle whose sine is 1/2." Well-posed?',
    choices: [
      'No — four candidates in this stretch alone, and every extra lap seats two more',
      'Yes — 30° is obviously the angle',
      'No, because 1/2 is not a possible sine',
    ],
    answer: 0,
    feedback:
      'The claim has no single owner: 30° works, but so do 150°, −210°, −330°, ' +
      'and beyond this stretch the seats go on forever, two per lap. Before ' +
      '"the angle whose sine is v" can name a function’s output, someone must ' +
      'break the tie — honestly.',
    note:
      'This is not a defect of sine; it is what sine is FOR. A rule that turns ' +
      'many angles into one height is doing its job. The trouble only starts ' +
      'when you ask the rule to run backward — and backward is exactly where ' +
      'this lesson is headed.',
  },
  {
    title: 'Two laws fill the roster',
    body:
      'Where do the four seats come from? Two laws: laps — add 360° and the ' +
      'sine repeats; and mirror seats — 180° − θ shares θ’s height.',
    value: 'half',
    q: 'Which law produces 150° from the base seat 30°?',
    choices: [
      'The mirror law: 150° = 180° − 30° — the circle bench’s two-spots-per-lap fact',
      'The lap law: 150° = 30° + 120°',
      'Neither; 150° is a rounding artifact',
    ],
    answer: 0,
    feedback:
      'The circle bench showed that each height is reached twice per lap — once ' +
      'rising, once falling — and those two spots are mirror partners: θ and ' +
      '180° − θ. So 150° = 180° − 30°. The lap law then copies BOTH seats every ' +
      '360°: −210° = 150° − 360°, −330° = 30° − 360°.',
    note:
      'Check the roster against the two laws by hand: from 30° the laps give ' +
      '{30, 390, −330, …} and the mirrors give {150, 510, −210, …}. Inside ' +
      '−360°..360° exactly four survive — the four on the line. Every roster on ' +
      'this bench is generated from those two laws and nothing else.',
  },
  {
    title: 'What a function may not do',
    body:
      'A function is a promise: one input, ONE output. "Reverse of sine" would ' +
      'take the input 1/2 and owe four answers at once.',
    value: 'half',
    q: 'What must happen before "arcsin" deserves the word function?',
    choices: [
      'The answer pool must be cut down until each value owns exactly one angle',
      'Allow functions to return several answers',
      'Nothing — computers handle it somehow',
    ],
    answer: 0,
    feedback:
      'The promise is non-negotiable — everything built on functions (solving, ' +
      'composing, graphing on other benches) leans on unique outputs. The only ' +
      'honest repair is to shrink the candidate pool: choose a stretch of ' +
      'angles in which every sine value appears exactly once, and let that ' +
      'stretch answer for everyone.',
    note:
      'Note what is NOT allowed: choosing per-question, sometimes 30°, ' +
      'sometimes 150°, as convenience dictates. A function must commit in ' +
      'advance — the same window for every value, forever. That standing ' +
      'commitment is what the next step selects.',
  },
  {
    title: 'The window that works',
    body:
      'Take [−90°, 90°]. Every roster — every value from −1 to 1 — lands ' +
      'exactly one seat inside it. Not roughly one: exactly one, provably.',
    value: 'root3o2',
    q: 'Why does [0°, 180°] fail where [−90°, 90°] succeeds?',
    choices: [
      'Because [0°, 180°] contains BOTH mirror partners — 30° and 150° — so value 1/2 seats twice there',
      'Because [0°, 180°] is too short',
      'It does not fail; either window works',
    ],
    answer: 0,
    feedback:
      'A working window must dodge every mirror pair. [0°, 180°] straddles the ' +
      'mirror line at 90°, so θ and 180° − θ both fit — two seats, promise ' +
      'broken. [−90°, 90°] keeps exactly one of each pair and still reaches ' +
      'every height from −1 (at −90°) to 1 (at 90°). Uniqueness AND coverage — ' +
      'that pair of demands is what picks the window.',
    note:
      'Inside [−90°, 90°], sine only climbs — no height is ever revisited. ' +
      'That one-pass behavior is exactly the standard’s phrase "always ' +
      'increasing," wearing its seating-chart clothes — a stretch with no ' +
      'repeats is precisely a stretch an inverse can live on.',
  },
  {
    title: 'The spokesperson, not your angle',
    body:
      'The dial holds an angle θ. Ask arcsin about sin θ and watch who ' +
      'answers: the WINDOW’s seat for that value — not necessarily θ.',
    value: 'half',
    dial: true,
    q: 'arcsin(sin 150°) = ?',
    choices: [
      '30° — arcsin returns the window’s spokesperson for the value, and 150° sits outside',
      '150° — arcsin undoes sine, always',
      '−150° — arcsin flips the sign',
    ],
    answer: 0,
    feedback:
      'sin 150° = 1/2, and the window’s seat for 1/2 is 30° — so arcsin(sin ' +
      '150°) = 30°. The round trip returns your angle only if you started ' +
      'inside the window: arcsin repays the mirror partner 180° − θ otherwise. ' +
      'The dial makes the rule visible seat by seat.',
    note:
      'This is the single most common arcsin error in calculators and ' +
      'classrooms alike: expecting the round trip to be free. It is free ' +
      'exactly on [−90°, 90°] — the receipt the window signed.',
  },
  {
    title: 'The teller’s stamp',
    body:
      'A sine value is posted. Seat its full roster in −360°..360° and rule ' +
      'the count; then rule the spokesperson — the arcsin, the one seat in ' +
      'the gold window. Both exact, or no stamp.',
    value: 'half',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ArcsinLab() {
  const [thetaDial, setThetaDial] = useState(150);
  const [rPick, setRPick] = useState(null);
  const [sPick, setSPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const valKey = calib && kase != null ? CASES[kase] : current.value;
  const val = VALUES[valKey];
  const dialMode = !!current.dial && !calib;
  /* in dial mode the roster follows the dial angle's own value */
  const baseB = dialMode ? spokesFor(thetaDial) : val.b;
  const roster = rosterOf(baseB);
  const spokes = spokesOf(baseB);

  const checks = calib ? calibChecks(kase, rPick, sPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, rPick, sPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, rPick, sPick) : false;

  const bandLabel = calib
    ? `posted: ${kase != null ? labelOf(kase) : ''}`
    : dialMode
      ? `θ = ${fmtDeg(thetaDial)} · who answers for sin θ?`
      : `sin θ = ${val.sym} — the seating`;
  sceneRef.current = { roster, spokes, dialMode, theta: thetaDial, calib, bandLabel, sym: val.sym };

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
    const yLine = bandH + (H2 - bandH) * 0.52;
    const padL = 44;
    const padR = 30;
    const xOf = (a) => padL + ((a + 360) / 720) * (W - padL - padR);

    /* THE WINDOW — gold bracket over [−90, 90] */
    ctx.fillStyle = 'rgba(185,135,24,0.12)';
    ctx.fillRect(xOf(-90), yLine - 46, xOf(90) - xOf(-90), 92);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(xOf(-90), yLine - 46, xOf(90) - xOf(-90), 92);
    ctx.fillStyle = GOLD;
    ctx.font = '600 10.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('the window [−90°, 90°]', (xOf(-90) + xOf(90)) / 2, yLine - 52);

    /* the seat line */
    ctx.strokeStyle = SLATE;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(xOf(-360), yLine);
    ctx.lineTo(xOf(360), yLine);
    ctx.stroke();
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    for (let a = -360; a <= 360; a += 90) {
      ctx.strokeStyle = SLATE;
      ctx.beginPath();
      ctx.moveTo(xOf(a), yLine - 4);
      ctx.lineTo(xOf(a), yLine + 4);
      ctx.stroke();
      ctx.fillStyle = SLATE;
      ctx.fillText(fmtInt(a), xOf(a), yLine + 8);
    }

    /* the roster seats */
    for (const a of S.roster) {
      const isSpokes = a === S.spokes;
      ctx.fillStyle = isSpokes ? CARMINE : BLUE;
      ctx.beginPath();
      ctx.arc(xOf(a), yLine, isSpokes ? 7 : 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = (isSpokes ? '700' : '600') + ' 10.5px ui-monospace, monospace';
      ctx.textBaseline = 'bottom';
      ctx.fillText(fmtDeg(a), xOf(a), yLine - 10);
    }
    /* the dial's angle, when asking the round-trip question */
    if (S.dialMode) {
      ctx.strokeStyle = INK_HEX;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xOf(S.theta), yLine - 30);
      ctx.lineTo(xOf(S.theta), yLine + 20);
      ctx.stroke();
      ctx.fillStyle = INK_HEX;
      ctx.font = '600 10.5px ui-monospace, monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(`θ = ${fmtDeg(S.theta)}`, xOf(S.theta), yLine + 24);
    }

    /* the readout card */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the seating chart', 22, bandH + 8);
    ctx.fillStyle = BLUE;
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillText(S.calib ? `roster in −360°..360°: ?` : `roster in −360°..360°: ${S.roster.length} seats`, 22, bandH + 26);
    ctx.fillStyle = CARMINE;
    ctx.fillText(S.calib ? 'the spokesperson: ?' : `the spokesperson: ${fmtDeg(S.spokes)}`, 22, bandH + 44);

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
    setThetaDial(150);
    setRPick(null);
    setSPick(null);
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
    setThetaDial(150);
    setRPick(null);
    setSPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Roster ${rPick ?? 'unruled'}; spokesperson ${sPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : dialMode
      ? `Theta ${fmtDeg(thetaDial)}: arcsin of its sine returns ${fmtDeg(spokes)}${spokes === thetaDial ? ' — the round trip is free inside the window' : ' — the spokesperson, not theta'}.`
      : `sin θ = ${val.sym}: ${roster.length} seats in the stretch — ${roster.map(fmtDeg).join(', ')}; the spokesperson is ${fmtDeg(spokes)}.`;

  return (
    <div className="aslab">
      <header className="head">
        <h1>Arcsin: One Seat in the Window</h1>
        <p className="lede">
          “The angle whose sine is 1/2” has four claimants in −360°..360° alone —
          laps and mirror seats fill a roster forever. Arcsin is the repair:
          <em> a window, [−90°, 90°], that provably seats exactly one angle for
          every value</em>, and always answers with that spokesperson.
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

          {dialMode && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the angle θ</span>
                  <span className="dial-v mono">{fmtDeg(thetaDial)}</span>
                </div>
                <input
                  type="range"
                  min={-90}
                  max={270}
                  step={30}
                  value={thetaDial}
                  onChange={(e) => setThetaDial(Number(e.target.value))}
                  aria-label={`Theta, ${thetaDial} degrees`}
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
                <span className="target-k">The posted value</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the roster, seated</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the spokesperson, named</li>
                </ol>
                <div className="declare" role="group" aria-label="Roster ruling">
                  {ROSTER_CHIPS.map((c2) => (
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
                <div className="declare" role="group" aria-label="Spokesperson ruling">
                  {SPOKES_CHIPS.map((c2) => (
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
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the chart is seated'
                    : checks[0]
                      ? 'roster seated — now the one inside the window'
                      : 'count the laps and the mirror seats'}
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
                  <span className="mono target-hint">the roster · then the spokesperson</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setRPick(null);
                  setSPick(null);
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
                  setRPick(null);
                  setSPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">laps and mirror seats fill the roster · the window seats one</span>{' '}
        &nbsp;·&nbsp; arcsin answers with the spokesperson from [−90°, 90°] — your
        angle only if you started inside.
      </footer>

      <style jsx>{`
        .aslab {
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
        :global(.aslab) :focus-visible {
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
