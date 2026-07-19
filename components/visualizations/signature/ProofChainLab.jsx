'use client';

/* ============================================================================
   ProofChainLab — an interactive "bench" for GEOMETRIC PROOF: the chain of
   because.  The library's benches SHOW invariants — dials sweep, numbers
   hold.  This bench notarizes: it takes one theorem (vertical angles are
   equal) and upgrades "it held every time we looked" into "it cannot fail,"
   by a chain of three links, each fastened with a reason that was already
   on the table.  The dial still sweeps — but now the point is that the
   CHAIN's letters never move while the instance's numbers do.  (GRADES
   9–12 · CCSS G-CO.C.9 — prove theorems about lines and angles: vertical
   angles are congruent.  A deliberate, careful exception to the house's
   show-don't-prove stance, built to explain the difference.)

   THE SIGNATURE CENTERPIECE — "THE CHAIN."  Two crossing lines on the
   left, angle stations numbered ∠1..∠4 with live integer measures.  On
   the right, three statement cards linked by gold reason plaques:
     ∠1 + ∠2 = 180°   because straight-line pairs total 180°
     ∠3 + ∠2 = 180°   because straight-line pairs total 180°
     ∠1 = ∠3          because equals of the same thing are equal
   Sweep the dial and every NUMBER changes; no LETTER does.  A proof is a
   machine the dial cannot break.

   THE MODEL — exact integer arithmetic throughout (degrees):
     · anglesOf(θ) = [θ, 180 − θ, θ, 180 − θ] — the four stations; the
       audit verifies both linear-pair sums and the conclusion for every
       integer θ in (0, 180).
     · the chain is DATA: three links, each {claim, reason}; reasons come
       from a fixed law table, and the audit checks that no link cites
       the theorem being proved (no circularity) and that every cited law
       holds numerically at every dial position.
     · the capstone hides one link's reason; the circularity chip
       ("vertical angles are equal") is ALWAYS offered and NEVER a truth.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No transversal, no parallel lines, no angle families — the
       transversal bench owns that richer scene; two lines crossing at a
       single point is the smallest stage a proof can stand on.
     · No triangle interior tour — the triangle bench owns the angle sum.
     · No arcs, no inscribed machinery — the circle-theorems bench.
     · The house's other benches demonstrate; only this one notarizes —
       and it says so out loud, which is the meta-lesson.
   COLORS: one accent. CARMINE = the proven equality ∠1 = ∠3 (the
   object). GOLD = the reason plaques (the tool). BLUE = quiet angle
   stations. GREEN only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a chain is posted with one reason veiled and a dial
   angle fixed.  Rule the missing REASON first (fasten the link), then
   rule ∠3's measure at the posted θ (read the conclusion's instance).
   Truths are derived from the law table and anglesOf at answer time; the
   meter is quantized to {0, 50, 100}; the measure earns nothing until
   the reason stands.  The stamp provably cannot fire falsely.
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

const fmtDeg = (n) => `${n}°`;

/* the four stations around the crossing, counterclockwise from ∠1 */
const anglesOf = (theta) => {
  if (theta <= 0 || theta >= 180) throw new Error('the crossing needs a genuine angle');
  return [theta, 180 - theta, theta, 180 - theta];
};

/* the law table — what a link may cite */
const LAWS = {
  linePair: 'straight-line pairs total 180°',
  sameThing: 'equals of the same thing are equal',
};
/* the theorem itself — offered as a chip, NEVER a legal reason here */
const CIRCULAR = 'vertical angles are equal';

/* the chain, as data: claims and the law each cites */
const CHAIN = [
  { claim: '∠1 + ∠2 = 180°', law: 'linePair' },
  { claim: '∠3 + ∠2 = 180°', law: 'linePair' },
  { claim: '∠1 = ∠3', law: 'sameThing' },
];
/* every link's claim, verified numerically at a given θ */
const linkHolds = (idx, theta) => {
  const [a1, a2, a3] = anglesOf(theta);
  if (idx === 0) return a1 + a2 === 180;
  if (idx === 1) return a3 + a2 === 180;
  return a1 === a3;
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted (veiled link, θ); truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [
  { link: 0, theta: 40 },
  { link: 2, theta: 40 },
  { link: 1, theta: 65 },
  { link: 2, theta: 110 },
  { link: 0, theta: 110 },
  { link: 2, theta: 65 },
];
const REASON_CHIPS = [LAWS.linePair, LAWS.sameThing, CIRCULAR];
const VALUE_CHIPS = ['40°', '65°', '110°'];

const labelOf = (i) => `link ${CASES[i].link + 1} veiled · θ = ${CASES[i].theta}°`;
const reasonTruth = (i) => LAWS[CHAIN[CASES[i].link].law];
const valueTruth = (i) => fmtDeg(anglesOf(CASES[i].theta)[2]);

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, rPick, vPick) => {
  if (i == null) return [false, false];
  const c1 = rPick === reasonTruth(i);
  const c2 = c1 && vPick === valueTruth(i);
  return [c1, c2];
};
const closeness = (i, rPick, vPick) => {
  const [c1, c2] = calibChecks(i, rPick, vPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, rPick, vPick) => calibChecks(i, rPick, vPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A reading is not a proof',
    body:
      'Two lines cross at θ = 50°. Read the stations: ∠1 = 50°, ∠3 = 50°. ' +
      'Equal — this time.',
    theta: 50,
    showChain: false,
    q: 'Does the reading PROVE that vertical angles are always equal?',
    choices: [
      'No — it certifies one dial position; "always" is a claim about every position at once, and no pile of readings reaches it',
      'Yes — seeing is proving',
      'Yes, if we check ten more angles',
    ],
    answer: 0,
    feedback:
      'Ten readings, or ten thousand, still sample the dial — they never ' +
      'exhaust it. Every other bench in this library shows you invariants ' +
      'surviving sweeps, and that showing builds true conviction. But "cannot ' +
      'fail" needs a different instrument, and building that instrument is ' +
      'this bench’s whole job.',
    note:
      'Keep respect for the readings: they FOUND the theorem, and a claim ' +
      'that failed a single reading would be dead. Proof is not a replacement ' +
      'for looking; it is what looking earns — the promotion a well-tested ' +
      'claim applies for.',
  },
  {
    title: 'The first link',
    body:
      '∠1 and ∠2 sit shoulder to shoulder along one straight line, so ' +
      '∠1 + ∠2 = 180°. At the current dial: 50 + 130 = 180. ✓',
    theta: 50,
    showChain: true,
    upTo: 1,
    q: 'What fastens this link?',
    choices: [
      'A law already on the table — straight-line pairs total 180° — not the current numbers; 50 and 130 merely illustrate it',
      'The numbers 50 and 130',
      'The diagram’s accuracy',
    ],
    answer: 0,
    feedback:
      'The link cites a LAW, and the law speaks for every θ at once: whatever ' +
      '∠1 is, ∠2 is its straight-line partner. The instance 50 + 130 is the ' +
      'law wearing today’s numbers — pleasant to check, powerless to prove. ' +
      'Reasons are general; readings are particular.',
    note:
      'Notice the grammar of a link: CLAIM because LAW. Both halves matter — ' +
      'a claim with no law is an assertion, and a law with no claim fastens ' +
      'nothing. The plaque under each card is where the strength lives.',
  },
  {
    title: 'The second link, the splice',
    body:
      '∠3 and ∠2 also share a straight line — the OTHER line: ∠3 + ∠2 = 180°. ' +
      'Now both ∠1 and ∠3 equal 180° − ∠2.',
    theta: 50,
    showChain: true,
    upTo: 2,
    q: 'The splice: why does ∠1 = ∠3 follow?',
    choices: [
      'Both equal the same thing — 180° minus ∠2 — and equals of the same thing are equal to each other',
      'Because they look equal in the picture',
      'Because 50 = 50',
    ],
    answer: 0,
    feedback:
      'Two links dangle the same expression, 180° − ∠2, and the old common ' +
      'notion — equals of the same thing are equal — splices them. Note what ' +
      'the splice never mentions: the value of θ. The conclusion ∠1 = ∠3 is ' +
      'purchased entirely in letters, which is why no number can revoke it.',
    note:
      'Three links, two laws, no measurements: that is the entire proof of a ' +
      'theorem the readings could only befriend. Short chains are not lesser ' +
      'chains — most of Euclid is exactly this size.',
  },
  {
    title: 'The dial cannot break it',
    body:
      'Sweep θ. Every number on the left changes — 30, 45, …, 150. Watch the ' +
      'chain on the right.',
    theta: 50,
    showChain: true,
    upTo: 3,
    dial: true,
    q: 'What changes in the chain as the dial sweeps?',
    choices: [
      'Nothing — the claims and reasons are written in letters, so every dial position lands inside the same three links',
      'The reasons update to match each angle',
      'The chain breaks at θ = 90°',
    ],
    answer: 0,
    feedback:
      'The instance panel churns; the chain stands still. That stillness is ' +
      'the definition of proved: the argument quantifies over the whole dial ' +
      'at once, so no position — not even the right-angle crossing, where all ' +
      'four stations read 90° — falls outside it. A proof is a machine the ' +
      'dial cannot break.',
    note:
      'θ = 90° deserves a pause: there the theorem is true but BORING — all ' +
      'four angles agree. The chain covers boring and dramatic alike without ' +
      'noticing the difference; that indifference is its strength.',
  },
  {
    title: 'What a link may cite',
    body:
      'Rules of the game: a link may cite only laws already on the table — ' +
      'never the theorem it is building. One tempting chip is poison.',
    theta: 50,
    showChain: true,
    upTo: 3,
    q: 'Why can no link cite "vertical angles are equal"?',
    choices: [
      'That is the theorem under construction — citing it assumes what is being proved, and the chain becomes a circle holding itself up',
      'Because it is false until proven',
      'It could, to save time',
    ],
    answer: 0,
    feedback:
      'Circularity is the one unforgivable fastening: a chain that cites its ' +
      'own conclusion holds no weight at all, however long it is. The theorem ' +
      'is not FALSE before the proof — the readings vouch for it — but inside ' +
      'the chain it has no standing until the last link closes. Afterward, it ' +
      'joins the law table for every later chain to cite.',
    note:
      'That last sentence is how mathematics compounds: today’s conclusion is ' +
      'tomorrow’s reason. The library’s benches hand this bench its laws; this ' +
      'bench notarizes new ones and hands them back.',
  },
  {
    title: 'The notary’s stamp',
    body:
      'A chain is posted with one reason veiled and the dial pinned. Fasten ' +
      'the link: rule the missing REASON first — beware the poison chip — ' +
      'then rule ∠3’s measure at the posted θ. Both exact, or no stamp.',
    theta: 40,
    showChain: true,
    upTo: 3,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ProofChainLab() {
  const [thetaDial, setThetaDial] = useState(50);
  const [rPick, setRPick] = useState(null);
  const [vPick, setVPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const theta = calib && kase != null ? CASES[kase].theta : current.dial ? thetaDial : current.theta;
  const veiled = calib && kase != null ? CASES[kase].link : -1;
  const angles = anglesOf(theta);
  const upTo = current.upTo ?? 0;

  const checks = calib ? calibChecks(kase, rPick, vPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, rPick, vPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, rPick, vPick) : false;

  const bandLabel = calib
    ? `posted: ${kase != null ? labelOf(kase) : ''}`
    : `the crossing at θ = ${theta}°`;
  sceneRef.current = { theta, angles, upTo: calib ? 3 : upTo, veiled, showChain: !!current.showChain, calib, bandLabel };

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
    /* the crossing (left) — one horizontal line, one at θ (pixels only) */
    const cx = W * 0.24;
    const cy = bandH + (H2 - bandH) * 0.5;
    const L = Math.min(W * 0.2, 130);
    const rad = (S.theta * Math.PI) / 180;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - L, cy);
    ctx.lineTo(cx + L, cy);
    ctx.moveTo(cx - L * Math.cos(rad), cy + L * Math.sin(rad));
    ctx.lineTo(cx + L * Math.cos(rad), cy - L * Math.sin(rad));
    ctx.stroke();
    /* the four labels at mid-directions of their sectors */
    const dirs = [rad / 2, rad + (Math.PI - rad) / 2, Math.PI + rad / 2, Math.PI + rad + (Math.PI - rad) / 2];
    ['∠1', '∠2', '∠3', '∠4'].forEach((lbl, i) => {
      const d = dirs[i];
      const rr = 44;
      const x = cx + rr * Math.cos(d);
      const y = cy - rr * Math.sin(d);
      ctx.fillStyle = i % 2 === 0 ? CARMINE : SLATE;
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${lbl} ${S.angles[i]}°`, x, y);
    });

    /* the chain (right) */
    if (S.showChain) {
      const x0 = W * 0.44;
      let y = bandH + 34;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = SLATE;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.fillText('the chain', x0, y - 22);
      for (let i = 0; i < S.upTo; i++) {
        const last = i === 2;
        ctx.fillStyle = last ? CARMINE : INK_HEX;
        ctx.font = (last ? '700' : '600') + ' 13px ui-monospace, monospace';
        ctx.fillText(CHAIN[i].claim, x0, y);
        ctx.fillStyle = GOLD;
        ctx.font = '600 10.5px ui-monospace, monospace';
        ctx.fillText(
          S.veiled === i ? 'because  ?' : `because  ${LAWS[CHAIN[i].law]}`,
          x0 + 16,
          y + 20
        );
        y += 52;
      }
      /* the instance panel */
      if (S.upTo >= 1) {
        ctx.fillStyle = SLATE;
        ctx.font = 'italic 600 11.5px system-ui, sans-serif';
        ctx.fillText('today’s numbers', x0, y + 6);
        ctx.font = '600 11px ui-monospace, monospace';
        ctx.fillStyle = BLUE;
        ctx.fillText(
          `${S.angles[0]} + ${S.angles[1]} = 180 · ${S.angles[2]} + ${S.angles[1]} = 180${S.upTo >= 3 ? ` · ${S.angles[0]} = ${S.angles[2]}` : ''}`,
          x0,
          y + 26
        );
      }
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
    setThetaDial(50);
    setRPick(null);
    setVPick(null);
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
    setThetaDial(50);
    setRPick(null);
    setVPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Reason ${rPick ?? 'unruled'}; measure ${vPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `The crossing at theta ${theta} degrees: stations ${angles.join(', ')}${current.showChain ? `; the chain shows ${upTo} link${upTo === 1 ? '' : 's'}` : ''}.`;

  return (
    <div className="pflab">
      <header className="head">
        <h1>Geometric Proof: The Chain of Because</h1>
        <p className="lede">
          Every bench in this library shows invariants surviving sweeps; this
          one notarizes. Three links — claim because law — prove vertical angles
          equal for every crossing at once, and the dial makes the point:
          <em> the numbers churn, the chain never moves</em>.
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
                  <span className="dial-k">the crossing angle θ</span>
                  <span className="dial-v mono">{theta}°</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={150}
                  step={15}
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
                <span className="target-k">The posted chain</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the link, fastened</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the instance, read</li>
                </ol>
                <div className="declare" role="group" aria-label="Reason ruling">
                  {REASON_CHIPS.map((c2) => (
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
                <div className="declare" role="group" aria-label="Measure ruling">
                  {VALUE_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (vPick === c2 ? ' active' : '')}
                      onClick={() => setVPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the chain is notarized'
                    : checks[0]
                      ? 'link fastened — now read ∠3 at the posted θ'
                      : 'which LAW does this link cite? mind the poison chip'}
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
                  <span className="mono target-hint">the reason · then the measure</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setRPick(null);
                  setVPick(null);
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
                  setVPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">claim because law · three links, two laws, zero measurements</span>{' '}
        &nbsp;·&nbsp; readings find theorems, chains notarize them — and today’s
        conclusion is tomorrow’s reason.
      </footer>

      <style jsx>{`
        .pflab {
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
        :global(.pflab) :focus-visible {
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
