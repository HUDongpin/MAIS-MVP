'use client';

/* ============================================================================
   TriangleSolveLab — an interactive "bench" for THE LAW OF COSINES:
   a Pythagorean audit.  Face any corner C and compare the two accounts:
   a² + b² against c².  The DEFICIT a² + b² − c² reads the corner — positive
   means sharper than right, zero means right, negative means blunter — and
   divided by the exchange rate 2ab it IS the cosine, exactly:
   cos C = (a² + b² − c²) / 2ab.  Integer-sided triangles make every audit a
   fraction you can check by hand: (5,6,7) → 12/60 = 1/5; (3,5,7) → −15/30 =
   −1/2, so C = 120°, exact.  (GRADES 9–12 · CCSS G-SRT.D.10–11 — prove and
   apply the Law of Cosines to solve triangles that right-triangle methods
   cannot reach.)

   THE SIGNATURE CENTERPIECE — "THE AUDIT CARDS AND THE DEFICIT GAUGE."
   The triangle stands on the paper; beside it, two blue account cards —
   a² + b², and c² — and between them a gold gauge showing the deficit with
   its sign.  Below, the carmine exchange line converts the deficit into the
   exact cosine of the faced corner.  Pythagoras is the audit's zero line:
   the law of cosines is his theorem plus a correction bill, and the bill
   is priced in cos C.

   THE MODEL — exact integer/rational arithmetic throughout:
     · triangles are integer triples; deficitOf(a,b,c) = a² + b² − c² and
       cosOf = that deficit over 2ab, reduced by gcd — no square root, no
       degree measure is ever computed in the model.
     · verdictOf reads the sign: acute / right / obtuse at the faced
       corner.  The audit verifies each verdict against float geometry
       (coordinates, in the AUDIT only) and against the converse of
       Pythagoras.
     · the special catch: cos C = −1/2 pins C = 120° exactly — one of the
       few corners the fraction world can name outright.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No swing, no counting of buildable triangles — the construction
       bench (7.G.A.2) owns how many triangles a kit allows; this bench
       receives one honest triangle and reads its corners.
     · No quotient towers, no opp/hyp — the triangle-trig bench NAMED the
       cosine; here that name is purchased and paid for with a citation,
       and the cosine arrives as a finished exact fraction.
     · No unit circle, no bar of squared shares — the identity bench owns
       sin² + cos² = 1; it is not re-run here.
     · Why a² + b² = c² at a right corner is the rearrangement bench's
       theorem; this bench uses its CONVERSE as the audit's zero line,
       with credit.
   COLORS: one accent. CARMINE = the faced corner and its exact cosine
   (the object). GOLD = the deficit gauge (the tool). BLUE = quiet sides
   and account cards. GREEN only on correct answers and CALIBRATED.

   THE CALIBRATION — a triple is posted, largest side faced.  Rule the
   deficit a² + b² − c² first (run the audit), then rule cos C as an exact
   reduced fraction (apply the exchange rate).  Truths are derived at
   answer time; the meter is quantized to {0, 50, 100}; the cosine earns
   nothing until the deficit stands.  The stamp provably cannot fire
   falsely.
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

/* the triangle inequality — every posted triple must be a real triangle */
const isTriangle = (a, b, c) => a + b > c && a + c > b && b + c > a;

/* the audit: face the corner opposite side c */
const deficitOf = (a, b, c) => {
  if (!isTriangle(a, b, c)) throw new Error('the bench only posts honest triangles');
  return a * a + b * b - c * c;
};
/* the exchange rate: cos C = deficit / 2ab, as a reduced exact fraction */
const cosOf = (a, b, c) => {
  const d = deficitOf(a, b, c);
  const g = gcdOf(d, 2 * a * b);
  return [d / g, (2 * a * b) / g];
};
const fracText = ([n, d]) => (n === 0 ? '0' : d === 1 ? fmtInt(n) : `${n < 0 ? MINUS : ''}${Math.abs(n)}/${d}`);
const verdictOf = (a, b, c) => {
  const d = deficitOf(a, b, c);
  return d > 0 ? 'acute' : d === 0 ? 'right' : 'obtuse';
};

/* the lesson's posted triangles (facing the last side) */
const SCENES = {
  right: [5, 12, 13],
  sharp: [5, 6, 7],
  blunt: [3, 5, 7],
  dialbase: [5, 6, 7],
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted triples; truths derived from the audit.
   ------------------------------------------------------------------------- */
const CASES = [
  [5, 6, 7],
  [3, 5, 7],
  [5, 12, 13],
  [2, 3, 4],
  [4, 5, 6],
  [7, 8, 9],
];
const DEF_CHIPS = [MINUS + '15', MINUS + '3', '0', '5', '12', '32'];
const COS_CHIPS = [MINUS + '1/2', MINUS + '1/4', '0', '1/8', '1/5', '2/7'];

const labelOf = (i) => `the triangle ${CASES[i].join(', ')} · facing ${CASES[i][2]}`;
const defTruth = (i) => fmtInt(deficitOf(...CASES[i]));
const cosTruth = (i) => fracText(cosOf(...CASES[i]));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, dPick, cPick) => {
  if (i == null) return [false, false];
  const c1 = dPick === defTruth(i);
  const c2 = c1 && cPick === cosTruth(i);
  return [c1, c2];
};
const closeness = (i, dPick, cPick) => {
  const [c1, c2] = calibChecks(i, dPick, cPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, dPick, cPick) => calibChecks(i, dPick, cPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The audit’s zero line',
    body:
      'Triangle 5, 12, 13, facing the corner opposite 13. Run the accounts: ' +
      'a² + b² = 25 + 144 = 169, and c² = 169. Deficit: 0.',
    scene: 'right',
    q: 'What does a deficit of exactly 0 certify?',
    choices: [
      'A right corner — the converse of the rearrangement bench’s theorem, read as an audit',
      'That the triangle is equilateral',
      'Nothing; 169 = 169 is a coincidence of this triple',
    ],
    answer: 0,
    feedback:
      'The rearrangement bench proved that a right corner forces a² + b² = c²; ' +
      'the converse holds too, so books that balance certify the corner. ' +
      'Deficit 0 is the audit’s zero line — Pythagoras is not being replaced ' +
      'today, he is being promoted — from special case to reference point.',
    note:
      'Audit language, fixed once: face a corner, call the two sides that hug ' +
      'it a and b, call the side opposite c. Every number this bench prints ' +
      'is about the FACED corner — one corner at a time. Re-aim the audit at a ' +
      'different corner and the roles a, b, c reshuffle with it.',
  },
  {
    title: 'The deficit reads the corner',
    body:
      'Face 7 in the triangle 5, 6, 7: accounts 61 against 49, deficit +12. ' +
      'Now face 7 in 3, 5, 7: accounts 34 against 49, deficit −15.',
    scene: 'sharp',
    q: 'What does the deficit’s SIGN say?',
    choices: [
      'Positive: the corner beats right (acute); negative: it is blunter (obtuse); zero: exactly right',
      'Positive means the triangle is large',
      'The sign is bookkeeping noise',
    ],
    answer: 0,
    feedback:
      'Push c out and the corner facing it opens: at c² = a² + b² it passes ' +
      'exactly through right, and beyond, the accounts go negative. The sign of ' +
      'a² + b² − c² is a three-way corner detector that costs three squarings ' +
      'and a subtraction — no angle measure needed to classify every corner. ' +
      'Three squarings, one subtraction, one glance at a sign: cheaper than ' +
      'any protractor and immune to drawing error.',
    note:
      'Try it on the third triple by hand: 3² + 5² = 34 falls 15 short of 49. ' +
      'The corner facing 7 is blunt, and the size of the shortfall is about to ' +
      'become the star of the show — a raw shortfall is information, but not ' +
      'yet a currency.',
  },
  {
    title: 'The exchange rate',
    body:
      'Deficits from different triangles are not comparable raw. Divide by ' +
      '2ab: for 5, 6, 7 that is 12/60 = 1/5 — and THIS number is cos C.',
    scene: 'sharp',
    q: 'Why divide by 2ab before comparing corners?',
    choices: [
      'Scale-independence — doubling the triangle multiplies deficit and 2ab by four alike, so the quotient depends only on the corner’s shape',
      'To make the arithmetic harder',
      'Because 2ab is the perimeter',
    ],
    answer: 0,
    feedback:
      'Double every side: the deficit multiplies by 4, and so does 2ab — the ' +
      'quotient never moves. A number blind to size and pinned by shape is ' +
      'exactly what the triangle-trig bench named cos C; rearranged, the audit ' +
      'is the Law of Cosines itself: c² = a² + b² − 2ab·cos C. Pythagoras plus ' +
      'a correction bill, priced in cosine.',
    note:
      'Sanity-check the price at the zero line: a right corner has deficit 0, ' +
      'so cos C = 0 — matching what the trig bench posts for 90°. The audit ' +
      'and the older instruments agree where they overlap. Agreement at the ' +
      'seams is how a library of benches earns trust.',
  },
  {
    title: 'An exact 120°',
    body:
      'The blunt triple 3, 5, 7: deficit −15, exchange 2·3·5 = 30, so cos C = ' +
      '−15/30 = −1/2. The fraction world can name this corner outright.',
    scene: 'blunt',
    q: 'cos C = −1/2 pins C at…',
    choices: [
      '120° exactly — one of the few corners with a rational cosine this clean',
      '150° — negative means past 135°',
      'It cannot be pinned without a calculator',
    ],
    answer: 0,
    feedback:
      'The special corners carry exact prices: cos 60° = 1/2, cos 90° = 0, ' +
      'cos 120° = −1/2. The audit of 3, 5, 7 lands on −1/2 with no rounding, ' +
      'so C = 120°, full stop. An integer triangle just handed you an exact ' +
      'angle — that is the quiet power of keeping the arithmetic rational.',
    note:
      'Most audits land between the named prices — 1/5 and 2/7 name corners no ' +
      'protractor word fits. That is fine: the exact fraction IS the answer; ' +
      'converting it to degrees is a calculator’s errand, not mathematics. Keep ' +
      'the fraction; it carries more truth than its decimal shadow.',
  },
  {
    title: 'Sliding through right',
    body:
      'Hold a = 5, b = 6 and put c on the dial, 2 through 10. The deficit is ' +
      '61 − c²; watch its sign as c grows.',
    scene: 'dialbase',
    dial: true,
    q: 'Between which stops does the corner pass through exactly right?',
    choices: [
      'Between c = 7 (deficit +12) and c = 8 (deficit −3) — and it never lands there, since 61 is not a perfect square',
      'At c = 8 exactly',
      'The corner never changes as c grows',
    ],
    answer: 0,
    feedback:
      'The deficit 61 − c² falls as c grows: +12 at c = 7, −3 at c = 8. ' +
      'Somewhere between, the corner is exactly right — but no INTEGER c ' +
      'lands it, because 61 is not a perfect square. The audit knows not just ' +
      'where the corner stands, but why the exact crossing is unreachable on ' +
      'this dial.',
    note:
      'Watch the ends too: at c = 10 the deficit reads −39 and the corner is ' +
      'deeply blunt; push past c = 11 and the triangle inequality forbids the ' +
      'triple entirely. The construction bench owns that boundary story.',
  },
  {
    title: 'The auditor’s stamp',
    body:
      'A triple is posted, its largest side faced. Run the whole audit ' +
      'yourself: square the two hugging sides, square the faced side, and ' +
      'rule the deficit a² + b² − c² first; then divide by 2ab, reduce, and ' +
      'rule cos C as an exact fraction. Both exact, or no stamp; the meter ' +
      'reports only how much of the ruling stands.',
    scene: 'sharp',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TriangleSolveLab() {
  const [cDial, setCDial] = useState(7);
  const [dPick, setDPick] = useState(null);
  const [cPick, setCPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const tri = calib && kase != null ? CASES[kase] : current.dial ? [5, 6, cDial] : SCENES[current.scene];
  const [a, b, c] = tri;
  const deficit = deficitOf(a, b, c);
  const cosFrac = cosOf(a, b, c);
  const verdict = verdictOf(a, b, c);

  const checks = calib ? calibChecks(kase, dPick, cPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, dPick, cPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, dPick, cPick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''}` : `the triangle ${a}, ${b}, ${c} · facing ${c}`;
  sceneRef.current = { a, b, c, deficit, cosFrac, verdict, calib, bandLabel };

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
    /* the triangle, corner C at the left (pixels only; one sqrt lives here) */
    const cosC = S.cosFrac[0] / S.cosFrac[1];
    const sinC = Math.sqrt(1 - cosC * cosC);
    const spanX = Math.max(S.a, S.b * cosC + 0.5, 1) + Math.max(0, -S.b * cosC);
    const scale = Math.min((W * 0.52) / spanX, (H2 - bandH - 140) / Math.max(S.b * sinC, 1));
    const Cx = 60 + Math.max(0, -S.b * cosC * scale);
    const Cy = H2 - 110;
    const Bx = Cx + S.a * scale;
    const By = Cy;
    const Ax = Cx + S.b * cosC * scale;
    const Ay = Cy - S.b * sinC * scale;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(Cx, Cy);
    ctx.lineTo(Bx, By);
    ctx.lineTo(Ax, Ay);
    ctx.closePath();
    ctx.stroke();
    /* the faced corner */
    ctx.fillStyle = CARMINE;
    ctx.beginPath();
    ctx.arc(Cx, Cy, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('C', Cx - 4, Cy + 10);
    /* side labels */
    ctx.fillStyle = SLATE;
    ctx.textAlign = 'center';
    ctx.fillText(`a = ${S.a}`, (Cx + Bx) / 2, Cy + 10);
    ctx.textBaseline = 'bottom';
    ctx.fillText(`b = ${S.b}`, (Cx + Ax) / 2 - 16, (Cy + Ay) / 2);
    ctx.fillStyle = CARMINE;
    ctx.fillText(`c = ${S.c}`, (Bx + Ax) / 2 + 22, (By + Ay) / 2);

    /* THE AUDIT CARDS */
    const cardX = W - 250;
    let y = bandH + 14;
    const card = (txt, color, bold = false) => {
      ctx.fillStyle = color;
      ctx.font = (bold ? '700' : '600') + ' 12px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(txt, cardX, y);
      y += 22;
    };
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the audit, facing C', cardX, y);
    y += 20;
    card(`a² + b² = ${S.a * S.a} + ${S.b * S.b} = ${S.a * S.a + S.b * S.b}`, BLUE);
    card(`c² = ${S.c * S.c}`, BLUE);
    card(S.calib ? 'deficit = ?' : `deficit = ${fmtInt(S.deficit)}`, GOLD, true);
    card(S.calib ? `÷ 2ab = ${2 * S.a * S.b} → cos C = ?` : `÷ 2ab = ${2 * S.a * S.b} → cos C = ${fracText(S.cosFrac)}`, CARMINE, true);
    if (!S.calib) card(`the corner: ${S.verdict}`, INK_HEX);

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
    setCDial(7);
    setDPick(null);
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
    setCDial(7);
    setDPick(null);
    setCPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Deficit ${dPick ?? 'unruled'}; cosine ${cPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Triangle ${a}, ${b}, ${c}, facing ${c}: deficit ${fmtInt(deficit)}, cos C = ${fracText(cosFrac)}, the corner is ${verdict}.`;

  return (
    <div className="tslab">
      <header className="head">
        <h1>The Law of Cosines: A Pythagorean Audit</h1>
        <p className="lede">
          Face a corner and compare accounts: a² + b² against c². The deficit’s
          sign classifies the corner; divided by 2ab it <em>is</em> the cosine,
          exactly — c² = a² + b² − 2ab·cos C is Pythagoras plus a correction
          bill, and integer triangles pay in exact fractions.
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
                  <span className="dial-k">the far side c</span>
                  <span className="dial-v mono">{cDial}</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={1}
                  value={cDial}
                  onChange={(e) => setCDial(Number(e.target.value))}
                  aria-label={`Far side, ${cDial}`}
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
                <span className="target-k">The posted triangle</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the deficit, audited</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} cos C, exchanged</li>
                </ol>
                <div className="declare" role="group" aria-label="Deficit ruling">
                  {DEF_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (dPick === c2 ? ' active' : '')}
                      onClick={() => setDPick(c2)}
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
                    ? 'both ruled, exactly — the books balance'
                    : checks[0]
                      ? 'deficit audited — now divide by 2ab and reduce'
                      : 'square the two huggers, square the faced side, subtract'}
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
                  <span className="mono target-hint">the deficit · then the cosine</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setDPick(null);
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
                  setDPick(null);
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
        <span className="mono">deficit = a² + b² − c² · cos C = deficit ÷ 2ab</span>{' '}
        &nbsp;·&nbsp; positive beats right, zero is right, negative is blunt — and
        the exact fraction is the answer, degrees or no degrees.
      </footer>

      <style jsx>{`
        .tslab {
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
        :global(.tslab) :focus-visible {
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
