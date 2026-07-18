'use client';

/* ============================================================================
   CompassLab — an interactive "bench" for COMPASS & STRAIGHTEDGE:
   two circles decide a point.  The construction game has exactly two powers —
   a circle from a known center through a known radius, a line through two
   known points — and new points are born ONLY at crossings.  Born on a
   circle means EXACTLY at its radius: membership is a birth certificate,
   not a measurement.  From two equal circles come Euclid's first triangle
   and the perpendicular bisector, both certified by arithmetic.  (GRADES
   9–12 · CCSS G-CO.D.12–13 — make formal geometric constructions; construct
   an equilateral triangle.)

   THE SIGNATURE CENTERPIECE — "THE TWIN CIRCLES AND THE INVARIANT LINE."
   A = (0,0) and B = (8,0).  Two equal circles, radius r, cross at
   X± = (4, ±√k) with k = r² − 16 — an INTEGER the bench posts exactly.
   Sweep r and the crossings ride up and down, but the line through them
   never moves: x = 4, the perpendicular bisector, the construction's
   invariant.  At r = 8 the top crossing closes Euclid I.1 (all sides² 64);
   at r = 5 it lands on the rational point (4, 3) — a 3-4-5 corner with no
   protractor in sight.

   THE MODEL — exact integer arithmetic throughout:
     · heightSqOf(r2) = r2 − 16, THROWING when the circles cannot reach
       (r ≤ 4): the crossing's height² is an integer, and every distance²
       the bench posts is computed from integers — dist²(X, A) = 16 + k,
       dist²(X±, X∓) = 4k, dist²(M, A) = 16 — no square root exists in
       the model.
     · equilateralAt(r2): the triangle A, B, X is equilateral exactly when
       16 + k = 64, i.e. r² = 64 — derived, not stored.
     · the equidistance test: a point is on the bisector of AB exactly
       when dist² to A equals dist² to B; the audit proves the crossings
       pass it for EVERY legal radius, and that midpoint M = (4, 0) does.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No slope turning, no run-rise machinery — the quarter-turn bench
       owns perpendicularity by slopes; here squareness comes free from
       symmetry (swap A and B; the picture fixes the line).
     · No inscribed angles, no central-angle bookkeeping — the circle-
       theorems bench owns angles in circles; these circles are compasses,
       not theorems.
     · No circle equations — the conics bench owns x² + y² = r² as a
       graph; this bench only ever asks "is dist² equal to r²?"
     · No measuring, ever: no ruler numbers, no protractor — lengths exist
       only as certified equalities, which is the entire aesthetic of the
       construction game.
   COLORS: one accent. CARMINE = the born crossings (the object). GOLD =
   the invariant bisector line (the tool). BLUE = the quiet twin circles.
   GREEN only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a radius is posted.  Rule the crossing height² first
   (k = r² − 16), then rule the triangle verdict: equilateral, or isosceles
   only.  Truths are derived from heightSqOf/equilateralAt at answer time;
   the meter is quantized to {0, 50, 100}; the verdict earns nothing until
   the height stands.  The stamp provably cannot fire falsely.
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

/* the fixed segment: A = (0,0), B = (8,0); AB² = 64, half-gap² = 16 */
const AB2 = 64;
const HALF2 = 16;

/* the crossings of the twin circles of radius² r2: X± = (4, ±√k), k = r2 − 16 */
const heightSqOf = (r2) => {
  if (r2 <= HALF2) throw new Error('the circles cannot reach each other — no crossing is born');
  return r2 - HALF2;
};
/* every posted distance², from integers alone */
const dist2XA = (r2) => HALF2 + heightSqOf(r2); /* = r2, by birth */
const dist2XX = (r2) => 4 * heightSqOf(r2);
const dist2MA = () => HALF2;
/* the triangle A, B, X: equilateral exactly when its equal sides reach AB² */
const equilateralAt = (r2) => dist2XA(r2) === AB2;
/* the equidistance test — the bisector's definition, run on exact integers */
const onBisector = (px, py2ToA, py2ToB) => py2ToA === py2ToB && Number.isInteger(px);

/* the dial's radii (r = 5..9) */
const R2_SET = [25, 36, 49, 64, 81];

/* ---------------------------------------------------------------------------
   CALIBRATION — posted radii; truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [25, 36, 49, 64, 81];
const K_CHIPS = ['9', '20', '33', '48', '65'];
const EQ_CHIPS = ['equilateral', 'isosceles only'];

const labelOf = (i) => `twin circles of radius² ${CASES[i]}`;
const kTruth = (i) => String(heightSqOf(CASES[i]));
const eqTruth = (i) => (equilateralAt(CASES[i]) ? EQ_CHIPS[0] : EQ_CHIPS[1]);

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, kPick, ePick) => {
  if (i == null) return [false, false];
  const c1 = kPick === kTruth(i);
  const c2 = c1 && ePick === eqTruth(i);
  return [c1, c2];
};
const closeness = (i, kPick, ePick) => {
  const [c1, c2] = calibChecks(i, kPick, ePick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, kPick, ePick) => calibChecks(i, kPick, ePick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two powers, one rulebook',
    body:
      'A and B sit 8 apart. The game allows exactly two moves: a circle from a ' +
      'known point, a line through two known points. Draw the twin circles of ' +
      'radius 8 — one from each end.',
    r2: 64,
    show: 'circles',
    q: 'Where may NEW points come from in this game?',
    choices: [
      'Only from crossings of things already drawn — the two carmine points just born',
      'Anywhere the pencil feels right',
      'From measuring 4 units with a ruler',
    ],
    answer: 0,
    feedback:
      'The rulebook is brutally short: two powers, and new points exist only ' +
      'where drawn objects cross. No ruler numbers, no protractor — the game ' +
      'trades measurement for certainty. The two crossings just born will turn ' +
      'out to carry more exact information than any measured point could.',
    note:
      'Notice what "born on a circle" purchases: the crossing is EXACTLY at ' +
      'radius 8 from that circle’s center — not approximately. Membership is a ' +
      'birth certificate, and every proof on this bench just reads certificates.',
  },
  {
    title: 'Euclid’s first triangle',
    body:
      'Join A and B to the top crossing X. Three sides: AB² = 64 by the setup, ' +
      'and AX² = BX² = 64 — because X was born on BOTH circles of radius 8.',
    r2: 64,
    show: 'triangle',
    q: 'Why is AX = 8 CERTAIN rather than measured?',
    choices: [
      'X lives on the circle centered at A with radius 8 — its birth certificate says so; no measuring happened',
      'Because the drawing looks about right',
      'Because all triangles between two circles are equilateral',
    ],
    answer: 0,
    feedback:
      'All three sides² read 64, so the triangle is equilateral by pure ' +
      'bookkeeping — this is Proposition 1 of Book I, the first construction ' +
      'in Euclid, and its proof is nothing but reading two birth certificates. ' +
      'The third choice is the classic overreach: change the radius and the ' +
      'triangle survives but its equal sides no longer match AB.',
    note:
      'The exactness is the point of the whole subject: a drawn triangle is ' +
      'ink, but the CLAIM "all sides equal" is arithmetic — 16 + 48 = 64, ' +
      'twice — and arithmetic does not smudge.',
  },
  {
    title: 'The second crossing, the hidden line',
    body:
      'The circles cross twice: X above, X′ below. Use the second power: the ' +
      'line through X and X′. It cuts AB at M = (4, 0).',
    r2: 64,
    show: 'bisector',
    q: 'What certifies that M is the MIDPOINT of AB?',
    choices: [
      'The equidistance test: dist²(M, A) = 16 = dist²(M, B) — equal by arithmetic, so M splits AB evenly',
      'M looks central in the picture',
      'Midpoints cannot be constructed, only estimated',
    ],
    answer: 0,
    feedback:
      'Run the test: M = (4, 0), so dist²(M, A) = 16 and dist²(M, B) = 16. ' +
      'Equal — exactly. The segment has been bisected without a single number ' +
      'being measured, and the vertical line through the crossings did it as a ' +
      'side effect of symmetry.',
    note:
      'The equidistance test is this bench’s only instrument: a point sits on ' +
      'the bisector of AB precisely when its distance² to A equals its ' +
      'distance² to B. One equality, checked in integers, again and again.',
  },
  {
    title: 'Why the crossings had no choice',
    body:
      'Both X and X′ passed the equidistance test before we even drew the ' +
      'line. Read their certificates again.',
    r2: 64,
    show: 'bisector',
    q: 'Why is EVERY crossing of the twin circles equidistant from A and B?',
    choices: [
      'Born on both circles: distance r from A AND distance r from B — equidistant by birth, whatever r is',
      'Because they happen to sit at x = 4',
      'They are not; only the top one is',
    ],
    answer: 0,
    feedback:
      'A crossing belongs to both circles, so it is r from A and r from B — ' +
      'the test passes by birth certificate alone, for every legal radius. Two ' +
      'such points fix the whole line of equidistant points, and swapping A ' +
      'with B leaves the picture unchanged — which is why that line meets AB ' +
      'squarely at its middle.',
    note:
      'Note the order of knowledge: the crossings were equidistant BEFORE the ' +
      'line existed. Constructions do not create truths; they make pre-existing ' +
      'equalities visible enough to draw through.',
  },
  {
    title: 'The invariant line',
    body:
      'Put the radius on the dial: r = 5, 6, 7, 8, 9. The crossings ride up ' +
      'and down — height² = r² − 16 — but watch the gold line.',
    r2: 64,
    show: 'bisector',
    dial: true,
    q: 'What changes with the radius, and what never does?',
    choices: [
      'The crossings’ heights change (9, 20, 33, 48, 65); the bisector line x = 4 never moves — it is the invariant',
      'Everything changes together',
      'Nothing changes; circles are circles',
    ],
    answer: 0,
    feedback:
      'Every legal radius births crossings at height² = r² − 16, all riding ' +
      'the SAME vertical line — the bisector belongs to the segment, not to ' +
      'any particular pair of circles. At r = 5 the height² is 9: the crossing ' +
      'lands on the rational point (4, 3), a 3-4-5 corner delivered by the ' +
      'compass with no protractor in sight.',
    note:
      'Below r = 5 the dial refuses: at r = 4 the circles barely kiss at M ' +
      'and beneath that they cannot reach each other — height² = r² − 16 goes ' +
      'negative, and the bench THROWS rather than pretend. Even failure here ' +
      'is exact.',
  },
  {
    title: 'The constructor’s stamp',
    body:
      'A radius is posted for the twin circles. Rule the crossing height² ' +
      'first — k = r² − 16 — then rule the triangle A, B, X: equilateral, or ' +
      'isosceles only. Both exact, or no stamp.',
    r2: 64,
    show: 'bisector',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CompassLab() {
  const [rIdx, setRIdx] = useState(3);
  const [kPick, setKPick] = useState(null);
  const [ePick, setEPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const r2 = calib && kase != null ? CASES[kase] : current.dial ? R2_SET[rIdx] : current.r2;
  const k = heightSqOf(r2);
  const equi = equilateralAt(r2);

  const checks = calib ? calibChecks(kase, kPick, ePick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, kPick, ePick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, kPick, ePick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''}` : `twin circles · radius² ${r2}`;
  sceneRef.current = { r2, k, equi, show: current.show, calib, bandLabel };

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
    /* world: x −2..10, y −7..7 (the one renderer sqrt lives below) */
    const u = Math.min((W - 80) / 12, (H2 - bandH - 100) / 14);
    const ox = (W - 12 * u) / 2 + 2 * u;
    const oy = bandH + 30 + 7 * u;
    const P = (x, y) => [ox + x * u, oy - y * u];
    const r = Math.sqrt(S.r2);
    const h = Math.sqrt(S.k);

    /* the twin circles */
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.6;
    for (const cx0 of [0, 8]) {
      ctx.beginPath();
      ctx.arc(...P(cx0, 0), r * u, 0, 2 * Math.PI);
      ctx.stroke();
    }
    /* the segment AB */
    ctx.strokeStyle = INK_HEX;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(...P(0, 0));
    ctx.lineTo(...P(8, 0));
    ctx.stroke();

    /* the invariant bisector */
    if (S.show === 'bisector') {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(...P(4, -6.6));
      ctx.lineTo(...P(4, 6.6));
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(...P(4, 0), 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = '600 10.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('M (4, 0)', P(4, 0)[0] + 8, P(4, 0)[1] + 6);
    }
    /* Euclid's triangle */
    if (S.show === 'triangle') {
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(...P(0, 0));
      ctx.lineTo(...P(4, h));
      ctx.lineTo(...P(8, 0));
      ctx.stroke();
    }
    /* the crossings */
    for (const s of [1, -1]) {
      if (S.show === 'circles' || S.show === 'bisector' || (S.show === 'triangle' && s === 1)) {
        ctx.fillStyle = CARMINE;
        ctx.beginPath();
        ctx.arc(...P(4, s * h), 5.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    /* A and B */
    for (const [x, lbl] of [[0, 'A'], [8, 'B']]) {
      ctx.fillStyle = INK_HEX;
      ctx.beginPath();
      ctx.arc(...P(x, 0), 4.2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(lbl, P(x, 0)[0], P(x, 0)[1] + 8);
    }

    /* the certificate card */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the certificates', 22, bandH + 8);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillStyle = CARMINE;
    ctx.fillText(S.calib ? 'height² = r² − 16 = ?' : `height² = ${S.r2} ${MINUS} 16 = ${S.k}`, 22, bandH + 26);
    ctx.fillStyle = BLUE;
    ctx.fillText(S.calib ? 'dist²(X, A) = dist²(X, B) = r²' : `dist²(X, A) = 16 + ${S.k} = ${16 + S.k} = r²`, 22, bandH + 44);
    if (!S.calib) {
      ctx.fillStyle = INK_HEX;
      ctx.fillText(`the triangle: ${S.equi ? 'equilateral (16 + k = 64)' : 'isosceles only (16 + k ≠ 64)'}`, 22, bandH + 62);
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
    setRIdx(3);
    setKPick(null);
    setEPick(null);
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
    setRIdx(3);
    setKPick(null);
    setEPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Height ${kPick ?? 'unruled'}; triangle ${ePick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Twin circles of radius squared ${r2}: crossings at height squared ${k}; the triangle is ${equi ? 'equilateral' : 'isosceles only'}.`;

  return (
    <div className="cplab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Compass &amp; Straightedge: Two Circles Decide a Point</h1>
        <p className="lede">
          Two powers only — a circle from a known point, a line through two known
          points — and new points are born at crossings, carrying exact birth
          certificates. From one pair of twin circles: Euclid’s first triangle,
          the midpoint, and <em>an invariant line no radius can move</em>.
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
                  <span className="dial-k">the radius r</span>
                  <span className="dial-v mono">{[5, 6, 7, 8, 9][rIdx]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={R2_SET.length - 1}
                  step={1}
                  value={rIdx}
                  onChange={(e) => setRIdx(Number(e.target.value))}
                  aria-label={`Radius, ${[5, 6, 7, 8, 9][rIdx]}`}
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
                <span className="target-k">The posted circles</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the height², certified</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the triangle, judged</li>
                </ol>
                <div className="declare" role="group" aria-label="Height ruling">
                  {K_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (kPick === c2 ? ' active' : '')}
                      onClick={() => setKPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Triangle ruling">
                  {EQ_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (ePick === c2 ? ' active' : '')}
                      onClick={() => setEPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — certificates in order'
                    : checks[0]
                      ? 'height certified — now check 16 + k against 64'
                      : 'k = r² − 16, in integers'}
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
                  <span className="mono target-hint">the height² · then the triangle</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setKPick(null);
                  setEPick(null);
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
                  setKPick(null);
                  setEPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">born at crossings · certified by dist² · x = 4 never moves</span>{' '}
        &nbsp;·&nbsp; the compass trades measurement for certainty — equalities by
        birth, a triangle by Euclid, a bisector by symmetry.
      </footer>

      <style jsx>{`
        .cplab {
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
        :global(.cplab) :focus-visible {
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
