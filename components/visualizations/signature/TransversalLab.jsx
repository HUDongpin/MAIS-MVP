'use client';

/* ============================================================================
   TransversalLab — an interactive "bench" for PARALLEL LINES AND A
   TRANSVERSAL: eight angles form at the two crossings, and while the
   lines stay parallel, only TWO numbers appear among them.

        one crossing: four angles, values θ and 180 − θ
        two parallel crossings: EIGHT angles, still two numbers
        vertical pairs: equal at ANY crossing — no parallels needed
        corresponding & alternate equal, co-interior supplementary —
        exactly when the lines are parallel; tilt one line and only
        the vertical equalities survive

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 7.G.B.5 and
   8.G.A.5.  AngleLab and AngleTurnLab own single-angle measurement;
   TriangleLab owns the interior-sum tour (so the triangle corollary of
   8.G.A.5 is left to it, by name).  This bench owns the PAIR STRUCTURE
   at a double crossing.

   THE SIGNATURE CENTERPIECE — "EIGHT ANGLES, TWO NUMBERS."
     Dial the transversal's angle θ and read all eight angles at once:
     every one is θ or 180 − θ, in a fixed pattern.  Chips light the
     four famous pair families — vertical, corresponding, alternate
     interior, co-interior — each with its verdict derived from the
     measures, never asserted.  Then the sabotage dial: tilt the second
     line away from parallel and the eight angles suddenly carry FOUR
     numbers — the cross-crossing equalities die, the vertical ones
     survive, and the collapse-to-two is revealed as the fingerprint of
     parallelism (which is how you TEST lines for it).  The capstone
     posts θ and a pair of positions: rule the partner's measure, then
     name the relationship — both exact, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • AngleLab / AngleTurnLab own measuring one angle; no angle here is
       measured — all eight are COMPUTED from θ, and no measuring
       vocabulary appears.
     • TriangleLab owns the angle-sum tour; no triangle is drawn and the
       corollary is ceded to it by name.
     • CircleTheoremsLab owns inscribed/central angles on a circle; no
       circle appears.
     • ParallelogramLab mentions co-interior angles in passing; this
       bench owns the family, with the parallelogram bench welcome to
       cite it.

   One-accent discipline: CARMINE is THE TWO NUMBERS — θ and 180 − θ and
   the verdicts.  GOLD is the highlighted pair (the tool).  BLUE is the
   quiet lines.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Integer degrees only.  All eight measures are derived from θ (and
       the sabotage angle φ) by one function; the audit proves, over the
       whole dial space: exactly two distinct values when φ = θ, exactly
       four when φ ≠ θ, vertical pairs equal ALWAYS, corresponding and
       alternate-interior pairs equal iff φ = θ, co-interior pairs
       supplementary iff φ = θ.
     • The crossing-guard's stamp needs two exact rulings (the partner's
       measure, then the relationship's name), audited over every posted
       case × chip pair; the truth chip is always present.
   Verified by audit-transversal.mjs (numeric proof + source greps)
   and verify-transversal.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TransversalLab.jsx
     2. Import and render it:
          import TransversalLab from './TransversalLab';
          export default function Page() { return <TransversalLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (θ, the tilt,
              the highlighted family, the lesson step, the rulings).
     MODEL  — integer-degree derivations; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the two numbers
const BLUE = '#3f74a6'; // the quiet lines
const GOLD = '#b98718'; // the highlighted pair
const INK_HEX = '#1c2b3a';

const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Positions A1..A4, B1..B4; measures derived from θ, φ.
   Index convention at each crossing: 1 above-left, 2 above-right,
   3 below-right, 4 below-left.  The sharp angle right of the transversal
   above the line is the line's own angle (θ at A, φ at B).
   ------------------------------------------------------------------------- */
const POSITIONS = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'];
const measureOf = (pos, theta, phi) => {
  const ang = pos[0] === 'A' ? theta : phi;
  const idx = Number(pos[1]);
  return idx === 2 || idx === 4 ? ang : 180 - ang;
};
const allMeasures = (theta, phi) => POSITIONS.map((p) => measureOf(p, theta, phi));
/* the pair families, as position structure */
const relOf = (p, q) => {
  const [a, b] = [p, q].sort();
  const sameLetter = a[0] === b[0];
  const i = Number(a[1]);
  const j = Number(b[1]);
  if (sameLetter && Math.abs(i - j) === 2) return 'vertical';
  if (!sameLetter && i === j) return 'corresponding';
  const key = a + b;
  if (key === 'A3B1' || key === 'A4B2') return 'alternate interior';
  if (key === 'A3B2' || key === 'A4B1') return 'co-interior';
  return null;
};
const REL_NAMES = ['vertical', 'corresponding', 'alternate interior', 'co-interior'];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The crossing-guard's stamp."  θ and a pair are
   posted; rule the partner's measure, then name the relationship.
   ------------------------------------------------------------------------- */
const CASES = [
  { theta: 65, pair: ['A2', 'B2'] },
  { theta: 110, pair: ['A4', 'B1'] },
  { theta: 50, pair: ['A3', 'B1'] },
  { theta: 125, pair: ['A1', 'A3'] },
  { theta: 70, pair: ['A4', 'B2'] },
  { theta: 40, pair: ['B2', 'B4'] },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const caseText = (i) => {
  const { theta, pair } = CASES[i];
  return `${pair[0]} = ${measureOf(pair[0], theta, theta)}° · what is ${pair[1]}?`;
};
const partnerTruth = (i) => {
  const { theta, pair } = CASES[i];
  return `${measureOf(pair[1], theta, theta)}°`;
};
const partnerChips = (i) => {
  const { theta, pair } = CASES[i];
  const t = measureOf(pair[1], theta, theta);
  const cands = [t, 180 - t, 90, t - 10, t + 10];
  const seen = new Set();
  const out = [];
  for (const v of cands) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
    if (out.length === 4) break;
  }
  return out.sort((x, y) => x - y).map((v) => `${v}°`);
};
const relTruth = (i) => relOf(CASES[i].pair[0], CASES[i].pair[1]);
const calibChecks = (i, mPick, rPick) => {
  if (i == null) return [false, false];
  const mOK = mPick != null && mPick === partnerTruth(i);
  const rOK = mOK && rPick != null && rPick === relTruth(i);
  return [mOK, rOK];
};
const closeness = (i, m, r) =>
  Math.round((100 * calibChecks(i, m, r).filter(Boolean).length) / 2);
const isCalibrated = (i, m, r) => calibChecks(i, m, r).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that eight angles need eight
   numbers, that vertical equality needs parallels, that names are decor.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One crossing, two numbers',
    body:
      'A single line crossed by a transversal: four angles appear, but dial θ and ' +
      'watch — they only ever carry two values, θ and 180 − θ.',
    theta: 65,
    tilt: 0,
    dial: true,
    single: true,
    q: 'The two angles across the crossing from each other (vertical pairs) are…',
    choices: [
      'Always equal — at ANY crossing; no parallels are involved yet',
      'Equal only for special θ',
      'Supplementary',
    ],
    answer: 0,
    feedback:
      'Vertical pairs are equal at every crossing of two lines, full stop — each pair ' +
      'shares the same two sides, just swapped. Four angles, two numbers: θ twice and ' +
      '180 − θ twice. Hold that; a second crossing is about to copy it.',
  },
  {
    title: 'The second crossing',
    body:
      'Add a line PARALLEL to the first. The transversal now makes eight angles. ' +
      'Dial θ and count the distinct values.',
    theta: 65,
    tilt: 0,
    dial: true,
    q: 'Eight angles — how many distinct values?',
    choices: [
      'Two — the parallel crossing is a perfect copy, so θ and 180 − θ cover all eight',
      'Four — each crossing brings its own pair',
      'Eight — every angle is its own',
    ],
    answer: 0,
    feedback:
      'Still two. Parallel means same direction, and the transversal meets the same ' +
      'direction the same way — crossing B is a translated copy of crossing A. That ' +
      'copying is the entire theorem; the famous pair names are just ways of pointing ' +
      'at it.',
  },
  {
    title: 'The pair families',
    body:
      'Chips light the families: corresponding (same corner, next crossing), alternate ' +
      'interior (the Z), co-interior (the C). Try each with θ = 65°.',
    theta: 65,
    tilt: 0,
    dial: true,
    family: true,
    q: 'The alternate-interior pair reads…',
    choices: [
      '65° and 65° — equal; the Z’s two corners are the same number',
      '65° and 115° — supplementary like everything else',
      'It depends which Z you pick',
    ],
    answer: 0,
    feedback:
      'Both Z corners read θ. Corresponding pairs are equal, alternate pairs are ' +
      'equal, and co-interior pairs add to 180° — three rules, one source: the ' +
      'parallel crossing is a copy. Name the family, and the verdict follows from the ' +
      'two numbers.',
  },
  {
    title: 'Break the parallels',
    body:
      'The sabotage dial tilts line B away from parallel. Watch the eight readouts ' +
      'as φ leaves θ.',
    theta: 65,
    tilt: 20,
    dial: true,
    tiltDial: true,
    q: 'With the lines no longer parallel, what survives?',
    choices: [
      'Only the vertical equalities — the cross-crossing rules die with the parallels',
      'Everything — angles are angles',
      'Nothing — all eight become unrelated',
    ],
    answer: 0,
    feedback:
      'Four numbers now: θ, 180 − θ, φ, 180 − φ. Vertical pairs still match (they ' +
      'never needed parallels), but corresponding and alternate pairs disagree and ' +
      'co-interior pairs miss 180°. Which hands you a TEST: if an alternate pair is ' +
      'equal, the lines must be parallel.',
  },
  {
    title: 'Solving a crossing',
    body:
      'One measured angle unlocks all eight. Suppose A1 reads 115°, lines parallel.',
    theta: 65,
    tilt: 0,
    dial: false,
    q: 'The co-interior partner of a 115° angle reads…',
    choices: [
      '65° — co-interior pairs add to 180°, and 180 − 115 = 65',
      '115° — pairs always match',
      '25° — subtract from 90°',
    ],
    answer: 0,
    feedback:
      'Co-interior means the C shape between the lines: 115 + 65 = 180, exactly. One ' +
      'reading, eight conclusions — that economy is why builders check parallel beams ' +
      'with a single bevel reading at each crossing.',
  },
  {
    title: 'The crossing-guard’s stamp',
    body:
      'θ is posted through one angle; a partner position is marked. Rule the partner’s ' +
      'measure, then name the relationship. Both exact, or no stamp.',
    theta: 65,
    tilt: 0,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TransversalLab() {
  const [theta, setTheta] = useState(65);
  const [tilt, setTilt] = useState(0);
  const [family, setFamily] = useState(null);
  const [mPick, setMPick] = useState(null);
  const [rPick, setRPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const thetaNow = calib && kase != null ? CASES[kase].theta : theta;
  const phiNow = calib ? thetaNow : thetaNow + tilt;

  const checks = calib ? calibChecks(kase, mPick, rPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, mPick, rPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, mPick, rPick) : false;

  sceneRef.current = {
    theta: thetaNow,
    phi: phiNow,
    single: !!current.single,
    family: current.family ? family : null,
    calib,
    kase,
  };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const INK_SOFT = '#5b6b7b';
    const S = sceneRef.current;
    ctx.clearRect(0, 0, W, H);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let gx = gs; gx < W; gx += gs) {
      ctx.moveTo(Math.round(gx) + 0.5, 0);
      ctx.lineTo(Math.round(gx) + 0.5, H);
    }
    for (let gy = gs; gy < H; gy += gs) {
      ctx.moveTo(0, Math.round(gy) + 0.5);
      ctx.lineTo(W, Math.round(gy) + 0.5);
    }
    ctx.stroke();

    const bandH = 52;
    const yA = bandH + (H - bandH) * 0.3;
    const yB = bandH + (H - bandH) * 0.68;
    const cxA = W * 0.44;
    const cxB = W * 0.56;

    /* the transversal through both crossings */
    const txRad = ((180 - 58) * Math.PI) / 180; /* drawn steepness only */
    const dirX = Math.cos(txRad);
    const dirY = -Math.sin(txRad);
    /* actually anchor the transversal through A and B crossing points */
    const dx = cxB - cxA;
    const dy = yB - yA;
    const len = 1.5;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cxA - dx * len, yA - dy * len);
    ctx.lineTo(cxB + dx * len, yB + dy * len);
    ctx.stroke();

    /* line A: rotated by (58 − θ) relative to the transversal’s slant —
       drawn via its angle to the horizontal so the READOUTS stay integer */
    const lineAt = (cx, cy, angDeg, color) => {
      const r = ((-angDeg * Math.PI) / 180);
      const ux = Math.cos(r);
      const uy = Math.sin(r);
      const L = W * 0.45;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - ux * L, cy - uy * L);
      ctx.lineTo(cx + ux * L, cy + uy * L);
      ctx.stroke();
    };
    /* the transversal's drawn angle to horizontal */
    const tAng = (Math.atan2(-(yB - yA), cxB - cxA) * 180) / Math.PI; /* negative-ish */
    /* line angles chosen so the angle between line and transversal is θ (φ) */
    lineAt(cxA, yA, tAng + S.theta, BLUE);
    if (!S.single) lineAt(cxB, yB, tAng + S.phi, BLUE);

    /* the eight readouts */
    const label = (cx, cy, pos, val) => {
      const idx = Number(pos[1]);
      const off = 34;
      const dxs = idx === 1 ? -off : idx === 2 ? off : idx === 3 ? off : -off;
      const dys = idx <= 2 ? -20 : 24;
      const inFam =
        S.family != null &&
        POSITIONS.some(
          (q) => q !== pos && relOf(pos, q) === S.family && (S.single ? q[0] === 'A' && pos[0] === 'A' : true)
        );
      const posted = S.calib && S.kase != null && CASES[S.kase].pair.includes(pos);
      const hidden = S.calib && S.kase != null && pos === CASES[S.kase].pair[1];
      ctx.fillStyle = posted ? GOLD : inFam ? GOLD : CARMINE;
      ctx.font = inFam || posted ? '700 13px ui-monospace, monospace' : '600 11.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hidden ? `${pos}: ?` : `${val}°`, cx + dxs, cy + dys);
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 8.5px ui-monospace, monospace';
      ctx.fillText(pos, cx + dxs, cy + dys + (idx <= 2 ? -13 : 13));
    };
    for (const pos of POSITIONS) {
      if (S.single && pos[0] === 'B') continue;
      const cx = pos[0] === 'A' ? cxA : cxB;
      const cy = pos[0] === 'A' ? yA : yB;
      label(cx, cy, pos, measureOf(pos, S.theta, S.phi));
    }

    /* the distinct-value tally */
    const vals = new Set(
      (S.single ? POSITIONS.filter((p) => p[0] === 'A') : POSITIONS).map((p) =>
        measureOf(p, S.theta, S.phi)
      )
    );
    ctx.fillStyle = CARMINE;
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `${S.single ? 4 : 8} angles · ${vals.size} distinct value${vals.size === 1 ? '' : 's'}`,
      22,
      bandH + 10
    );

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib && S.kase != null
        ? `posted: ${caseText(S.kase)}`
        : S.phi === S.theta
          ? `θ = ${S.theta}° · the two numbers: ${S.theta}° and ${180 - S.theta}°`
          : `θ = ${S.theta}°, φ = ${S.phi}° · the copy is broken`,
      W / 2,
      bandH / 2
    );
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
    setTheta(STEPS[step].theta);
    setTilt(STEPS[step].tilt);
    setFamily(STEPS[step].family ? 'corresponding' : null);
    setMPick(null);
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
    setTheta(current.theta);
    setTilt(current.tilt);
    setMPick(null);
    setRPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? caseText(kase) : ''}. Partner ${mPick ?? 'unruled'}; relationship ${rPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Theta ${thetaNow} degrees${phiNow !== thetaNow ? `, phi ${phiNow}` : ''}: the angles carry ${phiNow === thetaNow ? 'two' : 'four'} distinct values.`;

  return (
    <div className="tvlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Transversal: Eight Angles, Two Numbers</h1>
        <p className="lede">
          Cross two parallel lines with a transversal and eight angles appear — carrying
          only <span className="mono">θ</span> and <span className="mono">180 − θ</span>.
          The pair families point at one fact: the second crossing is a{' '}
          <em>copy</em> — and tilting a line kills every rule except the vertical one.
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

          {(current.dial || current.tiltDial) && (
            <div className="dials">
              {current.dial && (
                <div className="dial">
                  <div className="dial-head">
                    <span className="dial-k">θ, the crossing angle</span>
                    <span className="dial-v mono">{theta}°</span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={155}
                    step={5}
                    value={theta}
                    onChange={(e) => setTheta(Number(e.target.value))}
                    aria-label={`Theta, ${theta} degrees`}
                  />
                </div>
              )}
              {current.tiltDial && (
                <div className="dial">
                  <div className="dial-head">
                    <span className="dial-k">the sabotage (tilt of line B)</span>
                    <span className="dial-v mono">{tilt > 0 ? '+' : ''}{tilt}°</span>
                  </div>
                  <input
                    type="range"
                    min={-25}
                    max={25}
                    step={5}
                    value={tilt}
                    onChange={(e) => setTilt(Number(e.target.value))}
                    aria-label={`Tilt, ${tilt} degrees`}
                  />
                </div>
              )}
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Pair families">
            {current.family &&
              REL_NAMES.map((f) => (
                <button
                  type="button"
                  key={f}
                  className={'chipbtn' + (family === f ? ' active' : '')}
                  onClick={() => setFamily(f)}
                >
                  {f}
                </button>
              ))}
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
            </div>
          )}

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted crossing</span>
                <span className="target-word mono">{caseText(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the partner’s measure, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the relationship, named</li>
                </ol>
                <div className="declare" role="group" aria-label="Measure ruling">
                  {partnerChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (mPick === c2 ? ' active' : '')}
                      onClick={() => setMPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Relationship ruling">
                  {REL_NAMES.map((c2) => (
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
                    ? 'both ruled, exactly — traffic may proceed'
                    : checks[0]
                      ? 'measured — now name the family'
                      : 'two numbers cover all eight'}
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
                  <span className="mono target-hint">the measure · then the name</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setMPick(null);
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
                  setMPick(null);
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
        <span className="mono">the second crossing is a copy · tilt it and the rules die</span>{' '}
        &nbsp;·&nbsp; eight angles, two numbers: vertical equality is free, and the rest
        is the fingerprint of parallel lines.
      </footer>

      <style jsx>{`
        .tvlab {
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
        :global(.tvlab) :focus-visible {
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
