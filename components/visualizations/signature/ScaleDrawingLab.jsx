'use client';

/* ============================================================================
   ScaleDrawingLab — an interactive "bench" for SCALE DRAWINGS: one room,
   two rulers, and the promise a scale makes about every length at once.

        the scale 1:k promises: every WORLD length = paper length × k
        angles pass through unchanged — the plan's corner IS the room's
        the drawing shrinks as k grows; the world never moves
        the AREA SURPRISE: areas scale by k², never by k

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 7.G.A.1.
   DilationsLab owns scaling as a geometric transformation from a center;
   UnitConversionLab owns rates between units.  This bench owns the
   DOCUMENT: a blueprint that stands for a room, read with two rulers.

   THE SIGNATURE CENTERPIECE — "THE BLUEPRINT AND THE TWO RULERS."
     A 6 m × 4 m room, drawn at 1:50, 1:100, or 1:200 by dial.  Every
     wall carries two labels: the gold paper ruler (centimeters on the
     page) and the carmine world ruler (meters in the room).  Turn the
     dial and the drawing shrinks while the world holds still — 12 cm
     becomes 6 cm becomes 3 cm, always the same 6 m.  Then the trap the
     standard warns about, sprung on purpose: at 1:100 the paper area is
     24 cm² and the room is 24 m² — same digits, and the factor between
     them is 100² × the unit change, never ×100.  The capstone posts a
     wall and a scale: rule the world length, then the area factor for
     that scale — both exact, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • DilationsLab owns rays from a center and before/after ledgers;
       nothing here dilates from a point, and the phrase "scale factor"
       never appears — the document has a SCALE, written 1:k.
     • UnitConversionLab owns conversion rates as its centerpiece; the
       cm↔m arithmetic here is spent silently inside the world ruler.
     • TrigRatioLab owns side quotients; no diagonal is ever computed.
     • AreaLab owns cut-and-slide; areas here are counted as width ×
       height and compared across rulers, never dissected.

   One-accent discipline: CARMINE is THE WORLD — the room's true lengths
   and the verdicts.  GOLD is the paper — the drawing and its ruler (the
   tool).  BLUE is quiet structure.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Integers only: the room is 6 m × 4 m, the scales are 1:50, 1:100,
       1:200, and every paper length (600/k, 400/k cm) is an integer for
       every dial stop — the audit checks this and the round trip
       paper × k = world for every wall × scale.
     • The area law is proved: paperArea × k² equals the world area in
       square centimeters, and the unit change 1 m² = 10⁴ cm² reconciles
       the two readings exactly.
     • The draftsman's stamp needs two exact rulings (the world length,
       then the area factor), audited over every posted case × chip
       pair; the truth chip is always present and never duplicated.
   Verified by audit-scaledrawing.mjs (numeric proof + source greps)
   and verify-scaledrawing.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ScaleDrawingLab.jsx
     2. Import and render it:
          import ScaleDrawingLab from './ScaleDrawingLab';
          export default function Page() { return <ScaleDrawingLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the scale, the
              lesson step, answers, the rulings).
     MODEL  — integer lengths and the two-ruler laws; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the world ruler
const BLUE = '#3f74a6'; // quiet structure
const GOLD = '#b98718'; // the paper ruler
const INK_HEX = '#1c2b3a';

const SCALES = [50, 100, 200];
const ROOM = { w: 6, h: 4 }; /* meters, fixed forever */
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  The two-ruler laws, in integers.
   ------------------------------------------------------------------------- */
const paperOf = (meters, k) => (meters * 100) / k; /* cm on the page */
const worldOf = (cm, k) => (cm * k) / 100; /* meters in the room */
const paperArea = (k) => paperOf(ROOM.w, k) * paperOf(ROOM.h, k); /* cm² */
const worldArea = () => ROOM.w * ROOM.h; /* m² */
/* the area law: paper cm² × k² = world area in cm² (1 m² = 10⁴ cm²) */
const areaFactor = (k) => k * k;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The draftsman's stamp."  A wall and a scale
   are posted; rule the world length, then the area factor.
   ------------------------------------------------------------------------- */
const CASES = [
  { cm: 6, k: 50 },
  { cm: 4, k: 100 },
  { cm: 3, k: 200 },
  { cm: 10, k: 50 },
  { cm: 7, k: 100 },
  { cm: 2, k: 200 },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const caseText = (i) => `${CASES[i].cm} cm on paper · scale 1:${CASES[i].k}`;
const worldTruth = (i) => `${worldOf(CASES[i].cm, CASES[i].k)} m`;
const worldChips = (i) => {
  const { cm, k } = CASES[i];
  const w = worldOf(cm, k);
  const cands = [`${w} m`, `${cm} m`, `${cm * k} m`, `${w * 10} m`, `${w + 1} m`];
  const seen = new Set();
  const out = [];
  for (const t of cands) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
    if (out.length === 4) break;
  }
  return out.sort((x, y) => parseInt(x) - parseInt(y));
};
const factorTruth = (i) => `× ${areaFactor(CASES[i].k)}`;
const factorChips = (i) => {
  const { k } = CASES[i];
  const cands = [`× ${k * k}`, `× ${k}`, `× ${2 * k}`, `× ${4 * k * k}`];
  return cands;
};
const calibChecks = (i, wPick, aPick) => {
  if (i == null) return [false, false];
  const wOK = wPick != null && wPick === worldTruth(i);
  const aOK = wOK && aPick != null && aPick === factorTruth(i);
  return [wOK, aOK];
};
const closeness = (i, w, a) =>
  Math.round((100 * calibChecks(i, w, a).filter(Boolean).length) / 2);
const isCalibrated = (i, w, a) => calibChecks(i, w, a).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that the scale only applies to
   labeled walls, that areas scale by k, that shrinking the drawing
   shrinks the room.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One drawing, two rulers',
    body:
      'A 6 m × 4 m room, drawn at 1:50. The gold ruler reads the paper: the long wall ' +
      'is 12 cm. The carmine ruler reads the world: that same wall is 6 m, because ' +
      '12 cm × 50 = 600 cm.',
    k: 50,
    dial: false,
    q: 'The short wall draws as 8 cm. In the world it is…',
    choices: [
      '4 m — 8 cm × 50 = 400 cm; the scale converts every paper length',
      '8 m — paper numbers are world numbers',
      '400 m — multiply and keep the units',
    ],
    answer: 0,
    feedback:
      'Two rulers, one wall: 8 cm on the page, 4 m in the room. The scale 1:50 is the ' +
      'exchange rate between them, and the UNITS do half the work — 8 × 50 is 400 ' +
      'centimeters, which the world ruler reads as 4 meters.',
  },
  {
    title: 'The promise covers everything',
    body:
      'The scale is not a note about two labeled walls — it is a promise about EVERY ' +
      'length on the page: walls, doorways, the sofa, the sweep of a door.',
    k: 50,
    dial: false,
    q: 'What exactly does 1:50 promise?',
    choices: [
      'Every world length is its paper length × 50 — and every angle passes through unchanged',
      'Only the labeled walls are ×50; other lengths vary',
      'Lengths ×50 and angles ×50',
    ],
    answer: 0,
    feedback:
      'All lengths, one multiplier — that is what makes the drawing TRUSTWORTHY: any ' +
      'measurement you take on paper converts the same way. And angles are untouched: ' +
      'the plan’s right-angled corner is the room’s right-angled corner. Shape ' +
      'survives; only size trades rulers.',
  },
  {
    title: 'Turn the dial',
    body:
      'Change the scale and watch which ruler moves. At 1:100 the long wall draws as ' +
      '6 cm; at 1:200, as 3 cm. The room never budges.',
    k: 100,
    dial: true,
    q: 'At 1:100, the 6 m wall draws as…',
    choices: [
      '6 cm — a bigger k shrinks the paper, not the world',
      '12 cm — the drawing is fixed',
      '3 cm — half of six',
    ],
    answer: 0,
    feedback:
      '600 cm ÷ 100 = 6 cm. The world is the constant; the drawing is the variable. ' +
      'Architects pick k for the paper they own — a site plan at 1:200, a detail at ' +
      '1:50 — and every choice keeps the same promise with a different exchange rate.',
  },
  {
    title: 'The area surprise',
    body:
      'At 1:100 the drawing is 6 cm × 4 cm — paper area 24 cm². The room is 6 m × 4 m ' +
      '— world area 24 m². Same digits. What factor connects them?',
    k: 100,
    dial: true,
    q: 'Paper area × what = world area (in cm²)?',
    choices: [
      '× 100² = 10000 — both directions stretch ×100, so area stretches twice over',
      '× 100 — same as the lengths',
      '× 24 — read it off the labels',
    ],
    answer: 0,
    feedback:
      'Area stretches in BOTH directions: 24 cm² × 10000 = 240000 cm², and 240000 cm² ' +
      'is exactly 24 m² because a square meter holds 10⁴ square centimeters. The same ' +
      'digits were a coincidence of 1:100; the k² law is not.',
  },
  {
    title: 'From the world to the page',
    body:
      'The promise runs both ways. A 5 m bookshelf must be drawn onto the 1:50 plan.',
    k: 50,
    dial: true,
    q: 'How long is the bookshelf on paper?',
    choices: [
      '10 cm — 500 cm ÷ 50; divide by k to enter the page',
      '250 cm — multiply as always',
      '5 cm — a meter is a centimeter on paper',
    ],
    answer: 0,
    feedback:
      'Entering the drawing divides; leaving it multiplies. 5 m is 500 cm, and 500 ÷ ' +
      '50 = 10 cm of shelf on the plan. One exchange rate, two directions — the same ' +
      'discipline as any pair of honest rulers.',
  },
  {
    title: 'The draftsman’s stamp',
    body:
      'A wall is posted with its paper length and scale. Rule its world length, then ' +
      'rule the area factor for that scale. Both exact, or no stamp.',
    k: 50,
    dial: false,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ScaleDrawingLab() {
  const [scaleIdx, setScaleIdx] = useState(0);
  const [wPick, setWPick] = useState(null);
  const [aPick, setAPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const k = calib && kase != null ? CASES[kase].k : current.dial ? SCALES[scaleIdx] : current.k;

  const checks = calib ? calibChecks(kase, wPick, aPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, wPick, aPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, wPick, aPick) : false;

  sceneRef.current = { k, calib, kase, showArea: step === 3 };

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
    const pw = paperOf(ROOM.w, S.k); /* cm on paper */
    const ph = paperOf(ROOM.h, S.k);
    /* draw the page at a fixed pixels-per-cm so the SHRINK is visible */
    const pxPerCm = Math.min(38, (W - 200) / 12, (H - bandH - 120) / 8);
    const rw = pw * pxPerCm;
    const rh = ph * pxPerCm;
    const x0 = (W - rw) / 2;
    const y0 = bandH + 40 + ((H - bandH - 120) - rh) / 2;

    /* the room on paper */
    ctx.fillStyle = 'rgba(185,135,24,0.12)';
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.4;
    ctx.fillRect(x0, y0, rw, rh);
    ctx.strokeRect(x0, y0, rw, rh);
    /* a door notch, to make it a plan */
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0 + rw * 0.15, y0 + rh);
    ctx.lineTo(x0 + rw * 0.3, y0 + rh);
    ctx.stroke();

    /* the two rulers on the long wall */
    ctx.font = '700 12.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = GOLD;
    ctx.fillText(`paper: ${pw} cm`, x0 + rw / 2, y0 - 22);
    ctx.fillStyle = CARMINE;
    ctx.fillText(S.calib ? 'world: ?' : `world: ${ROOM.w} m`, x0 + rw / 2, y0 - 6);
    /* and the short wall */
    ctx.save();
    ctx.translate(x0 - 10, y0 + rh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = GOLD;
    ctx.fillText(`${ph} cm`, 0, -4);
    ctx.fillStyle = CARMINE;
    ctx.fillText(S.calib ? '?' : `${ROOM.h} m`, 0, 14);
    ctx.restore();

    /* the area ledger, when summoned */
    if (S.showArea) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const tx = W - 190;
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.fillText('the two areas', tx, bandH + 12);
      ctx.font = '600 11.5px ui-monospace, monospace';
      ctx.fillStyle = GOLD;
      ctx.fillText(`paper: ${paperArea(S.k)} cm²`, tx, bandH + 34);
      ctx.fillStyle = CARMINE;
      ctx.fillText(`world: ${worldArea()} m²`, tx, bandH + 52);
      ctx.fillStyle = INK_HEX;
      ctx.fillText(`factor: × ${areaFactor(S.k)}`, tx, bandH + 76);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib && S.kase != null ? `posted: ${caseText(S.kase)}` : `scale 1:${S.k} · the room holds still`,
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
    setScaleIdx(SCALES.indexOf(STEPS[step].k));
    setWPick(null);
    setAPick(null);
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
    setScaleIdx(SCALES.indexOf(current.k));
    setWPick(null);
    setAPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? caseText(kase) : ''}. World ${wPick ?? 'unruled'}; factor ${aPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Scale one to ${k}: the ${ROOM.w} meter wall draws as ${paperOf(ROOM.w, k)} centimeters, the ${ROOM.h} meter wall as ${paperOf(ROOM.h, k)}.`;

  return (
    <div className="sdlab">
      <header className="head">
        <h1>Scale Drawings: The Blueprint’s Two Rulers</h1>
        <p className="lede">
          A scale of <span className="mono">1:k</span> is a promise about <em>every</em>{' '}
          length on the page: world = paper × k, angles untouched. Turn the dial and the
          drawing shrinks while the room holds still — and areas, stretching both ways,
          scale by k².
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

          {current.dial && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the scale</span>
                  <span className="dial-v mono">1:{SCALES[scaleIdx]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={SCALES.length - 1}
                  step={1}
                  value={scaleIdx}
                  onChange={(e) => setScaleIdx(Number(e.target.value))}
                  aria-label={`Scale, one to ${SCALES[scaleIdx]}`}
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
            </div>
          )}

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted wall</span>
                <span className="target-word mono">{caseText(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the world length, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the area factor, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="World length ruling">
                  {worldChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (wPick === c2 ? ' active' : '')}
                      onClick={() => setWPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Area factor ruling">
                  {factorChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (aPick === c2 ? ' active' : '')}
                      onClick={() => setAPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — approved for construction'
                    : checks[0]
                      ? 'measured — now the area factor'
                      : 'paper × k, and mind the units'}
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
                  <span className="mono target-hint">the length · then the factor</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setWPick(null);
                  setAPick(null);
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
                  setWPick(null);
                  setAPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">every length × k · every angle kept · every area × k²</span>{' '}
        &nbsp;·&nbsp; a blueprint is a promise read with two rulers, and the world holds
        still while the paper trades sizes.
      </footer>

      <style jsx>{`
        .sdlab {
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
        :global(.sdlab) :focus-visible {
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
